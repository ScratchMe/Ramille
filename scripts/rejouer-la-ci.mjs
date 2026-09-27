#!/usr/bin/env node
// Rejoue en local ce que la CI (`.github/workflows/ci.yml`) joue à chaque PR, pas à pas.
//
//   node scripts/rejouer-la-ci.mjs                     # les cinq étapes, dans l'ordre
//   node scripts/rejouer-la-ci.mjs verifications jest  # celles qu'on nomme
//   node scripts/rejouer-la-ci.mjs --a-blanc           # le plan en JSON, sans rien lancer
//
// Les cinq étapes suivent les cinq travaux de la CI : `verifications` (« Typecheck & lint »),
// `jest`, `export` (l'export à configuration factice et ses cinq contrôles), `base` (pgTAP et les
// deux comparaisons à la base) et `parcours` (les deux gardes de bout en bout contre la stack).
//
// **Pourquoi un script, et pas la liste de commandes.** La CI a été rejouée cinq fois à la main la
// semaine du 21 au 25/09/2026, et deux pièges s'y sont présentés chaque fois : `npx jest` sans le
// fuseau (quatre tests tombent — `npm test` force `TZ=Europe/Paris`), et un export sans `--clear`,
// qui rend le bundle d'un autre arbre. Une boucle écrite au shell avec un tube pour garder la
// sortie lisible lit en plus le code du tube, pas celui de la commande (CLAUDE.md, « Un tube masque
// le code de sortie ») : ici chaque commande écrit dans son propre journal, et son code se lit
// directement.
//
// **Ce qui diffère de la CI, et pourquoi** — le reste suit `ci.yml` à la lettre :
// - `npm ci` n'est pas rejoué : les dépendances sont celles de l'arbre. Un `package-lock.json`
//   changé sans `npm install` se voit donc en CI, pas ici.
// - Chromium n'est pas installé : `CHROMIUM_PATH` le désigne, et à défaut `/opt/pw-browsers/chromium`
//   quand il existe (l'environnement d'agent).
// - Chaque export porte `--clear` et `EXPO_NO_DOTENV=1`. Le cache de Metro est partagé entre copies
//   de travail et n'a pas les `EXPO_PUBLIC_*` dans sa clé (TESTING.md §2.6) ; un `.env` local porte
//   la configuration de production. La CI n'a ni l'un ni l'autre.
// - **La base est reconstruite** (`supabase db reset`) avant pgTAP et le parcours. La CI part d'une
//   base neuve, bâtie sur les migrations de la PR ; une stack locale déjà démarrée porte celles de
//   l'arbre qui l'a démarrée — un autre, ou le même avant une retouche. Ce n'est pas la parade que
//   TESTING.md §2.3 écarte (une base « sale » ne doit pas faire rougir pgTAP) : c'est que la base
//   vérifiée doit être celle des migrations de l'arbre.
// - **La stack est réservée** le temps des étapes `base` et `parcours`, par un verrou rangé dans le
//   répertoire git commun — donc partagé par toutes les copies de travail du dépôt. Deux agents qui
//   rejouent en même temps ne se reconstruisent pas la base l'un sous l'autre : le second est
//   refusé, et le premier est nommé (`scripts/verrou-de-la-stack.mjs`).
// - Dans une étape, un pas qui échoue n'arrête que ceux qui dépendent de lui, là où la CI s'arrête
//   au premier rouge de chaque travail : un passage local doit montrer tous ses rouges d'un coup.
//
// **La sortie est 0 si et seulement si chaque pas choisi a été joué ET a réussi.** Un pas « non
// joué » — Docker éteint, export raté, stack prise — n'a rien vérifié, donc il ne compte pas comme
// un succès.
//
// Le plan est comparé à `ci.yml` par `scripts/rejouer-la-ci.test.ts` : une étape ajoutée à la CI
// sans son pendant ici, ou sans raison écrite de ne pas la rejouer, fait tomber le test.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { prendreLeVerrou } from './verrou-de-la-stack.mjs';

const racine = path.resolve(import.meta.dirname, '..');

/** La version de `supabase/setup-cli` dans `ci.yml` : c'est le CLI qui apporte la stack entière. */
const VERSION_SUPABASE = '2.117.0';
const SUPABASE = ['npx', '--yes', `supabase@${VERSION_SUPABASE}`];
const FACTICE = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://exemple.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'cle-factice-pour-le-build',
};
const EXPORT = ['npx', 'expo', 'export', '--platform', 'web', '--clear'];
const SANS_DOTENV = { EXPO_NO_DOTENV: '1' };
/** Le plafond d'un pas. Le pire cas modélisé en tête de `ci.yml` est de quatorze minutes. */
const DELAI_MS = 20 * 60 * 1000;
const LIGNES_DE_JOURNAL = 40;

// Le bloc que le travail « Parcours réel » écrit pour passer les clés de la stack aux pas suivants.
const CI_ENVIRONNEMENT_DE_LA_STACK = `supabase status -o env > /tmp/stack.env
. /tmp/stack.env
{
  echo "EXPO_PUBLIC_SUPABASE_URL=$API_URL"
  echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
  echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
} >> "$GITHUB_ENV"`;

/** Ce que la CI joue et que ce script ne rejoue pas, avec la raison — le test les lit aussi. */
const NON_REJOUEES = [
  {
    ci: 'npm ci',
    raison: 'les dépendances sont celles de l’arbre : un package-lock.json changé sans `npm install` se voit en CI, pas ici',
  },
  {
    ci: 'npx playwright install --with-deps chromium',
    raison: 'Chromium est déjà là (CHROMIUM_PATH, ou /opt/pw-browsers/chromium dans l’environnement d’agent) ; l’installer télécharge, et --with-deps passe par apt',
  },
];

// ─── Les pas qui ne sont pas une commande ────────────────────────────────────────────────────

function creerExpoEnv(ctx, journal) {
  const fichier = path.join(racine, 'expo-env.d.ts');
  if (fs.existsSync(fichier)) {
    fs.writeFileSync(journal, 'expo-env.d.ts est déjà là.\n');
  } else {
    // Même contenu que le `postinstall` de package.json et que l'étape de la CI.
    fs.writeFileSync(fichier, '/// <reference types="expo/types" />\n');
    fs.writeFileSync(journal, 'expo-env.d.ts créé.\n');
  }
  return { code: 0 };
}

function reserverLaStack(ctx, journal) {
  const { pris, message } = prendreLeVerrou(ctx.verrou, racine);
  fs.writeFileSync(journal, `${message}\n`);
  return { code: pris ? 0 : 1 };
}

function demarrerLaStack(ctx, journal) {
  const etat = executer([...SUPABASE, 'status'], {}, journal);
  if (etat.code === 0) return etat;
  fs.appendFileSync(journal, '\n— la stack ne répond pas : supabase start —\n');
  return executer([...SUPABASE, 'start'], {}, journal, { ajout: true });
}

function lireLaStack(ctx, journal) {
  const sortie = path.join(ctx.journal, 'stack.env');
  const r = executer([...SUPABASE, 'status', '-o', 'env'], {}, journal, { sortie });
  if (r.code !== 0) return r;
  const valeurs = Object.fromEntries(
    fs
      .readFileSync(sortie, 'utf8')
      .split('\n')
      .map((ligne) => ligne.match(/^([A-Z_]+)="(.*)"$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  const manquantes = ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY'].filter((cle) => !valeurs[cle]);
  if (manquantes.length > 0) {
    fs.appendFileSync(journal, `supabase status -o env ne donne pas ${manquantes.join(', ')}.\n`);
    return { code: 1 };
  }
  ctx.stack = {
    EXPO_PUBLIC_SUPABASE_URL: valeurs.API_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: valeurs.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: valeurs.SERVICE_ROLE_KEY,
  };
  return { code: 0 };
}

// ─── Le plan ─────────────────────────────────────────────────────────────────────────────────

const DOCKER = {
  nom: 'Docker répond',
  cle: 'docker',
  ci: null,
  raison: 'la CI a Docker d’office ; ici le démon peut être éteint',
  commande: ['docker', 'info'],
  conseil: 'Docker ne répond pas. Dans l’environnement d’agent : `sudo dockerd > /tmp/dockerd.log 2>&1 &` (TESTING.md §2.6), puis relance.',
};
const VERROU = {
  nom: 'stack réservée',
  cle: 'verrou',
  ci: null,
  raison: 'une machine de CI n’a qu’un travail ; ici plusieurs copies de travail partagent une stack',
  lancer: reserverLaStack,
};
const stack = (ci) => ({
  nom: 'stack démarrée',
  cle: 'stack',
  ci,
  lancer: demarrerLaStack,
  dependDe: ['Docker répond', 'stack réservée'],
});
const RECONSTRUIRE = {
  nom: 'base reconstruite',
  cle: 'reconstruire',
  ci: null,
  raison: 'la CI part d’une base neuve ; une stack locale porte les migrations de l’arbre qui l’a démarrée',
  commande: [...SUPABASE, 'db', 'reset'],
  dependDe: ['stack démarrée'],
};

/** Les pas de chaque étape, dans l'ordre de `ci.yml`. `ctx` porte le journal et la stack lue. */
function plan(ctx) {
  const typesGeneres = path.join(ctx.journal, 'database.types.generated.ts');
  return [
    {
      nom: 'verifications',
      travail: 'checks',
      pas: [
        {
          nom: 'expo-env.d.ts',
          ci: `printf '/// <reference types="expo/types" />\\n' > expo-env.d.ts`,
          lancer: creerExpoEnv,
        },
        { nom: 'tsc', ci: 'npx tsc --noEmit', commande: ['npx', 'tsc', '--noEmit'] },
        { nom: 'typecheck:api', ci: 'npm run typecheck:api', commande: ['npm', 'run', 'typecheck:api'] },
        {
          nom: 'verifier-api',
          ci: 'node --disable-warning=ExperimentalWarning scripts/verifier-api.mjs',
          commande: ['node', '--disable-warning=ExperimentalWarning', 'scripts/verifier-api.mjs'],
        },
        { nom: 'lint', ci: 'npm run lint', commande: ['npm', 'run', 'lint'] },
        ...[
          'verifier-hypotheses-calcul',
          'verifier-renvois-des-documents',
          'verifier-miroir-du-kit',
          'verifier-gabarits-email',
        ].map((s) => ({ nom: s, ci: `node scripts/${s}.mjs`, commande: ['node', `scripts/${s}.mjs`] })),
        // `--yes` : sans terminal, npx refuserait d'installer la version épinglée.
        { nom: 'expo-doctor', ci: 'npx expo-doctor@1.20.4', commande: ['npx', '--yes', 'expo-doctor@1.20.4'] },
      ],
    },
    {
      nom: 'jest',
      travail: 'unit-tests',
      pas: [
        {
          nom: 'npm test',
          ci: 'npm test -- --ci --coverage --coverageReporters=text',
          commande: ['npm', 'test', '--', '--ci', '--coverage', '--coverageReporters=text'],
        },
      ],
    },
    {
      nom: 'export',
      travail: 'web-export',
      pas: [
        {
          nom: 'export factice',
          ci: 'npx expo export --platform web',
          commande: EXPORT,
          env: { ...FACTICE, ...SANS_DOTENV },
        },
        ...[
          ['verifier-titres-export', {}],
          ['verifier-configuration-export', FACTICE],
          ['verifier-rendu-export', {}],
          ['verifier-etats-export', {}],
          ['verifier-assetlinks-export', {}],
        ].map(([s, env]) => ({
          nom: s,
          ci: `node scripts/${s}.mjs`,
          commande: ['node', `scripts/${s}.mjs`],
          env,
          dependDe: ['export factice'],
        })),
      ],
    },
    {
      nom: 'base',
      travail: 'db-tests',
      pas: [
        DOCKER,
        VERROU,
        stack('supabase db start'),
        RECONSTRUIRE,
        {
          nom: 'pgTAP',
          ci: 'supabase test db',
          commande: [...SUPABASE, 'test', 'db'],
          dependDe: ['base reconstruite'],
        },
        {
          nom: 'types générés',
          ci: 'supabase gen types typescript --local > /tmp/database.types.generated.ts',
          commande: [...SUPABASE, 'gen', 'types', 'typescript', '--local'],
          sortie: typesGeneres,
          dependDe: ['base reconstruite'],
        },
        {
          nom: 'verifier-types-base',
          ci: 'node scripts/verifier-types-base.mjs /tmp/database.types.generated.ts',
          commande: ['node', 'scripts/verifier-types-base.mjs', typesGeneres],
          dependDe: ['types générés'],
        },
        {
          nom: 'verifier-miroirs-de-check',
          ci: 'node scripts/verifier-miroirs-de-check.mjs',
          commande: ['node', 'scripts/verifier-miroirs-de-check.mjs'],
          dependDe: ['base reconstruite'],
        },
      ],
    },
    {
      nom: 'parcours',
      travail: 'parcours-reel',
      pas: [
        DOCKER,
        VERROU,
        stack('supabase start'),
        RECONSTRUIRE,
        {
          nom: 'clés de la stack',
          ci: CI_ENVIRONNEMENT_DE_LA_STACK,
          lancer: lireLaStack,
          dependDe: ['base reconstruite'],
        },
        {
          nom: 'export branché sur la stack',
          ci: 'npx expo export --platform web --clear',
          commande: EXPORT,
          env: () => ({ ...ctx.stack, ...SANS_DOTENV }),
          dependDe: ['clés de la stack'],
        },
        ...['verifier-parcours-reel', 'verifier-code-de-connexion'].map((s) => ({
          nom: s,
          ci: `node scripts/${s}.mjs`,
          commande: ['node', `scripts/${s}.mjs`],
          env: () => ctx.stack,
          dependDe: ['export branché sur la stack'],
        })),
      ],
    },
  ];
}

// ─── L'exécution ─────────────────────────────────────────────────────────────────────────────

/**
 * Lance une commande sans shell ni tube : la sortie va dans le journal (ou, pour la sortie
 * standard, dans `sortie`), et le code se lit sur le processus lui-même.
 */
function executer(commande, env, journal, { sortie = null, ajout = false } = {}) {
  const fd = fs.openSync(journal, ajout ? 'a' : 'w');
  const fdSortie = sortie ? fs.openSync(sortie, 'w') : fd;
  const r = spawnSync(commande[0], commande.slice(1), {
    cwd: racine,
    env: { ...process.env, ...env },
    stdio: ['ignore', fdSortie, fd],
    timeout: DELAI_MS,
  });
  if (r.error) fs.writeSync(fd, `\n${commande.join(' ')} : ${r.error.message}\n`);
  if (sortie) fs.closeSync(fdSortie);
  fs.closeSync(fd);
  const expire = r.error?.code === 'ETIMEDOUT';
  return { code: r.status ?? 1, signal: expire ? null : r.signal, expire };
}

const duree = (ms) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
};

const finDuJournal = (fichier) =>
  fs
    .readFileSync(fichier, 'utf8')
    .trimEnd()
    .split('\n')
    .slice(-LIGNES_DE_JOURNAL)
    .map((ligne) => `      │ ${ligne}`)
    .join('\n');

function jouer(etapes, ctx) {
  const resultats = [];
  const parCle = new Map();
  let numero = 0;
  for (const etape of etapes) {
    console.log(`\n▶ ${etape.nom}`);
    const statuts = new Map();
    for (const pas of etape.pas) {
      const noter = (statut, detail = '') => {
        statuts.set(pas.nom, statut);
        resultats.push({ etape: etape.nom, pas: pas.nom, statut });
        const marque = { ok: '✓', echec: '✗', 'non joué': '–' }[statut];
        console.log(`  ${marque} ${pas.nom}${detail ? ` — ${detail}` : ''}`);
      };
      const manque = (pas.dependDe ?? []).find((d) => statuts.get(d) !== 'ok');
      if (manque) {
        noter('non joué', `« ${manque} » n’a pas réussi`);
        continue;
      }
      if (pas.cle && parCle.has(pas.cle)) {
        noter(parCle.get(pas.cle), 'déjà joué plus haut');
        continue;
      }
      const journal = path.join(ctx.journal, `${String(++numero).padStart(2, '0')}-${etape.nom}-${pas.nom.replace(/[^\w-]+/g, '-')}.log`);
      const debut = Date.now();
      const env = { ...ctx.env, ...(typeof pas.env === 'function' ? pas.env() : pas.env) };
      const r = pas.lancer ? pas.lancer(ctx, journal) : executer(pas.commande, env, journal, { sortie: pas.sortie });
      if (r.signal === 'SIGINT' || r.signal === 'SIGTERM') {
        console.log(`\nInterrompu pendant « ${pas.nom} ». Journaux : ${ctx.journal}`);
        process.exit(130);
      }
      const statut = r.code === 0 ? 'ok' : 'echec';
      if (pas.cle) parCle.set(pas.cle, statut);
      if (statut === 'ok') {
        noter('ok', duree(Date.now() - debut));
      } else {
        const pourquoi = r.expire ? `délai de ${DELAI_MS / 60000} min dépassé` : `sortie ${r.code}`;
        noter('echec', `${pourquoi}, ${duree(Date.now() - debut)} · ${journal}`);
        if (pas.conseil) console.log(`      ${pas.conseil}`);
        console.log(finDuJournal(journal));
      }
    }
  }
  return resultats;
}

// ─── L'entrée ────────────────────────────────────────────────────────────────────────────────

const USAGE = 'Usage : node scripts/rejouer-la-ci.mjs [verifications] [jest] [export] [base] [parcours] [--a-blanc]';

function repertoireDuVerrou() {
  const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: racine, encoding: 'utf8' });
  const commun = r.status === 0 ? path.resolve(racine, r.stdout.trim()) : os.tmpdir();
  return path.join(commun, 'ramille-stack.verrou');
}

function etatDeLArbre() {
  const git = (...args) => spawnSync('git', args, { cwd: racine, encoding: 'utf8' }).stdout?.trim() ?? '';
  const modifie = git('status', '--porcelain') !== '';
  return `${git('rev-parse', '--abbrev-ref', 'HEAD')} @ ${git('rev-parse', '--short', 'HEAD')}${modifie ? ', avec des modifications non commises — que la CI ne verra pas' : ''}`;
}

const args = process.argv.slice(2);
const aBlanc = args.includes('--a-blanc');
if (args.includes('--aide') || args.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}
const choisies = args.filter((a) => !a.startsWith('--'));

const ctx = {
  journal: aBlanc ? '<journal>' : fs.mkdtempSync(path.join(os.tmpdir(), 'rejouer-la-ci-')),
  verrou: repertoireDuVerrou(),
  stack: {},
  env: {
    ...(process.env.CHROMIUM_PATH || !fs.existsSync('/opt/pw-browsers/chromium')
      ? {}
      : { CHROMIUM_PATH: '/opt/pw-browsers/chromium' }),
  },
};
const toutes = plan(ctx);
const inconnues = choisies.filter((c) => !toutes.some((e) => e.nom === c));
if (inconnues.length > 0) {
  console.error(`Étape inconnue : ${inconnues.join(', ')}. Les étapes : ${toutes.map((e) => e.nom).join(', ')}.\n${USAGE}`);
  process.exit(64);
}
const etapes = choisies.length === 0 ? toutes : toutes.filter((e) => choisies.includes(e.nom));

if (aBlanc) {
  const decrire = (pas) => ({
    nom: pas.nom,
    ci: pas.ci,
    ...(pas.raison ? { raison: pas.raison } : {}),
    commande: pas.commande ? pas.commande.join(' ') : `(${pas.lancer.name})`,
    env: typeof pas.env === 'function' ? '(clés de la stack)' : (pas.env ?? {}),
    dependDe: pas.dependDe ?? [],
  });
  const description = {
    versionSupabase: VERSION_SUPABASE,
    nonRejouees: NON_REJOUEES,
    etapes: etapes.map((e) => ({ nom: e.nom, travail: e.travail, pas: e.pas.map(decrire) })),
  };
  console.log(JSON.stringify(description, null, 2));
  process.exit(0);
}

console.log(`rejouer-la-ci — ${etatDeLArbre()}`);
console.log(`Journaux : ${ctx.journal}`);
const resultats = jouer(etapes, ctx);

const compte = (s) => resultats.filter((r) => r.statut === s).length;
const [reussis, echoues, nonJoues] = [compte('ok'), compte('echec'), compte('non joué')];
console.log(`\nBilan : ${reussis} réussi(s), ${echoues} échoué(s), ${nonJoues} non joué(s), sur ${resultats.length} pas.`);
for (const r of resultats.filter((x) => x.statut !== 'ok')) console.log(`  ${r.statut} : ${r.etape} · ${r.pas}`);
if (resultats.some((r) => r.pas === 'export branché sur la stack' && r.statut === 'ok')) {
  console.log('dist/ porte désormais l’export branché sur la stack locale, pas l’export factice.');
}
console.log(`Journaux : ${ctx.journal}`);
process.exit(echoues === 0 && nonJoues === 0 ? 0 : 1);
