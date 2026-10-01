/// <reference types="node" />
/**
 * Le rejeu local de la CI (`scripts/rejouer-la-ci.mjs`) suit-il encore `ci.yml` ?
 *
 * Un script qui recopie la liste des étapes de la CI se périme en silence au premier ajout : le
 * 26/09/2026, `verifier-miroir-du-kit.mjs` est entré dans la CI, et une liste tenue à la main
 * l'aurait ignoré — le rejeu local serait resté vert sur un arbre que la CI refuse. La garde lit
 * donc `ci.yml` et le plan du script (`--a-blanc`, qui ne lance rien), et exige trois choses :
 * - chaque `run:` de la CI est rejoué par un pas **du même travail**, ou figure dans
 *   `nonRejouees` avec sa raison ; et aucun pas ne prétend rejouer une étape disparue ;
 * - la commande locale est celle de la CI, **à quatre transformations déclarées près** — `npx
 *   --yes`, le CLI Supabase épinglé, `--clear`, le fichier de sortie — et rien d'autre ;
 * - toute variable d'environnement que lit un script de `scripts/` est écartée par le rejeu ou
 *   déclarée inoffensive, avec sa raison : un `DATABASE_URL` hérité du shell ferait comparer les
 *   miroirs de `check` à une autre base que celle qu'on vient de construire.
 *
 * `ci.yml` se lit par **blocs d'étapes**, quelle que soit la clé qui ouvre l'étape : la première
 * version ne voyait que les étapes écrites `- run:`, et une étape ouverte par `name:` ou `if:` lui
 * aurait échappé dans les deux sens (contre-lecture du 27/09/2026). Une étape qui n'a ni `run:` ni
 * `uses:` est une étape que la lecture n'a pas comprise, et la garde tombe dessus.
 *
 * Ce que la garde ne voit pas : ce qu'une commande fait de son environnement au-delà des variables
 * qu'elle nomme, et ce qu'un pas qui n'est pas une commande (la stack, le verrou) fait de plus ou de
 * moins que son pendant. L'en-tête du script dit chaque écart.
 *
 * Éprouvé en le cassant, le 27/09/2026 (douze mutations, chacune remise en place avant la
 * suivante, 14 tests) :
 * - `verifier-miroir-du-kit` retiré du plan → 1 tombe, l'étape orpheline ;
 * - une étape ajoutée à `ci.yml`, écrite `- run:` → 1 tombe, la même ; **écrite `- name:` puis
 *   `run:` → la même**, ce que la première version ne voyait pas ;
 * - l'URL factice recopiée de travers dans le script → 1 tombe, la configuration ;
 * - le CLI Supabase à une autre version que la CI → 1 tombe ;
 * - la raison d'un pas local retirée → 1 tombe ;
 * - la commande `npx tsc` sans `--noEmit`, son libellé `ci` intact → 1 tombe, la comparaison des
 *   commandes. La première version consignait cette mutation en changeant le **libellé** ; la
 *   commande, elle, n'était comparée à rien (contre-lecture du 27/09/2026) ;
 * - `--clear` retiré des exports → 1 tombe ; le cache de Metro privé retiré → 1 tombe ;
 * - l'étape `jest` rattachée au mauvais travail → 4 tombent ;
 * - `DATABASE_URL` plus écartée → 1 tombe, le relevé des variables ;
 * - la lecture de `ci.yml` réduite aux étapes ouvertes par `run:` ou `uses:` → 2 tombent, les deux
 *   tests de lecture sur un texte fabriqué — ceux sur `ci.yml` restent verts, ses étapes étant
 *   toutes écrites ainsi aujourd'hui : c'est pourquoi le texte fabriqué existe.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const racine = path.resolve(__dirname, '..');
const script = path.join(racine, 'scripts', 'rejouer-la-ci.mjs');

type EtapeCI = { travail: string; run: string; env: Record<string, string> };
type Pas = {
  nom: string;
  ci: string | null;
  raison?: string;
  commande: string;
  sortie?: string;
  env: Record<string, string> | string;
};
type Plan = {
  versionSupabase: string;
  nonRejouees: { ci: string; raison: string }[];
  variables: { ecartees: { prefixes: string[]; noms: string[] }; inoffensives: Record<string, string> };
  etapes: { nom: string; travail: string; pas: Pas[] }[];
};

const indentation = (ligne: string) => ligne.length - ligne.trimStart().length;
const vide = (ligne: string) => ligne.trim() === '' || ligne.trim().startsWith('#');

/** Les clés d'une étape, lues au niveau `niveau` ; un bloc `|` ou un `env:` prend ce qui est plus profond. */
function lireUneEtape(bloc: string[], niveau: number) {
  const etape = { run: null as string | null, uses: null as string | null, env: {} as Record<string, string> };
  for (let j = 0; j < bloc.length; j++) {
    if (vide(bloc[j]) || indentation(bloc[j]) !== niveau) continue;
    const cle = bloc[j].trim().match(/^([\w-]+):\s*(.*)$/);
    if (!cle) continue;
    const [, nom, valeur] = cle;
    const suite: string[] = [];
    while (j + 1 < bloc.length && (bloc[j + 1].trim() === '' || indentation(bloc[j + 1]) > niveau)) suite.push(bloc[++j]);
    if (nom === 'run') etape.run = /^[|>]-?$/.test(valeur) ? suite.join('\n') : valeur;
    if (nom === 'uses') etape.uses = valeur;
    if (nom === 'env') {
      for (const ligne of suite) {
        const entree = ligne.trim().match(/^(\w+): (.*)$/);
        if (entree) etape.env[entree[1]] = entree[2];
      }
    }
  }
  return etape;
}

/**
 * Les étapes de `ci.yml`, avec leur travail. Une lecture ligne à ligne suffit — le fichier est à
 * nous, et une dépendance YAML pour un test serait une dépendance de plus —, mais elle lit chaque
 * élément d'une liste `steps:` comme un bloc.
 */
function lireLaCI(texte: string) {
  const lignes = texte.split('\n');
  const etapes: EtapeCI[] = [];
  const illisibles: string[] = [];
  // Une passe à part : `version:` vit dans le `with:` d'une étape, que la lecture des blocs consomme.
  const versionsSupabase = lignes.map((l) => l.match(/^\s+version: (\S+)\s*$/)?.[1]).filter((v): v is string => !!v);
  let travail = '';
  let dansLesTravaux = false;
  let niveauDesEtapes: number | null = null;
  let dansLesEtapes = false;
  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];
    if (/^jobs:\s*$/.test(ligne)) dansLesTravaux = true;
    const nomDuTravail = dansLesTravaux ? ligne.match(/^ {2}([\w-]+):\s*$/) : null;
    if (nomDuTravail) {
      travail = nomDuTravail[1];
      dansLesEtapes = false;
    }
    if (/^\s+steps:\s*$/.test(ligne)) {
      dansLesEtapes = true;
      niveauDesEtapes = null;
      continue;
    }
    if (!dansLesEtapes || vide(ligne)) continue;
    const element = ligne.match(/^(\s*)- (.*)$/);
    if (!element || (niveauDesEtapes !== null && element[1].length !== niveauDesEtapes)) continue;
    niveauDesEtapes = element[1].length;
    // Le bloc de l'étape : sa première ligne, réécrite au niveau de ses clés, puis tout ce qui est
    // plus profond que le tiret. Un commentaire au niveau du tiret sépare deux étapes.
    const bloc = [`${' '.repeat(niveauDesEtapes + 2)}${element[2]}`];
    while (i + 1 < lignes.length && (lignes[i + 1].trim() === '' || indentation(lignes[i + 1]) > niveauDesEtapes)) {
      bloc.push(lignes[++i]);
    }
    const etape = lireUneEtape(bloc, niveauDesEtapes + 2);
    if (etape.run !== null) etapes.push({ travail, run: etape.run, env: etape.env });
    else if (etape.uses === null) illisibles.push(`${travail} : ${element[2]}`);
  }
  return { etapes, illisibles, versionsSupabase };
}

/** Les blancs d'un bloc `run: |` ne comptent pas : seules les lignes, dans l'ordre. */
const normaliser = (commande: string) =>
  commande
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');

function aBlanc(...etapes: string[]): { code: number | null; plan: Plan | null; erreur: string } {
  const r = spawnSync('node', [script, '--a-blanc', ...etapes], { encoding: 'utf8' });
  return { code: r.status, plan: r.status === 0 ? JSON.parse(r.stdout) : null, erreur: r.stderr };
}

const ci = lireLaCI(fs.readFileSync(path.join(racine, '.github', 'workflows', 'ci.yml'), 'utf8'));
const plan = aBlanc().plan as Plan;
const pasDuTravail = (travail: string) => plan.etapes.find((e) => e.travail === travail)?.pas ?? [];

/**
 * Les quatre transformations qu'un pas a le droit d'appliquer à la commande de la CI, et aucune
 * autre. `--clear` est retiré des deux côtés : la CI le porte sur l'un de ses deux exports.
 */
function formeDeLaCI(pas: Pas): string {
  let commande = pas.commande.replace(`npx --yes supabase@${plan.versionSupabase} `, 'supabase ').replace(/^npx --yes /, 'npx ');
  if (pas.sortie) commande = `${commande} > /tmp/${path.basename(pas.sortie)}`;
  return commande.replace(/<journal>\//g, '/tmp/');
}
const sansClear = (commande: string) =>
  commande
    .split(' ')
    .filter((mot) => mot !== '--clear')
    .join(' ');

describe('la lecture de ci.yml', () => {
  test('voit une étape quelle que soit la clé qui l’ouvre, et son bloc run ou env', () => {
    const r = lireLaCI(
      [
        'jobs:',
        '  essai:',
        '    runs-on: ubuntu-24.04',
        '    steps:',
        '      - uses: actions/checkout@v7',
        '      - name: Un nom',
        '        run: echo un',
        '      - if: always()',
        '        env:',
        '          A: b',
        '        run: |',
        '          echo deux',
        '          echo trois',
        '      # un commentaire entre deux étapes',
        '      - run: echo quatre',
        '        env:',
        '          C: d',
        '  autre:',
        '    steps:',
        '      - run: echo cinq',
        '',
      ].join('\n'),
    );
    expect(r.etapes.map((e) => ({ ...e, run: normaliser(e.run) }))).toEqual([
      { travail: 'essai', run: 'echo un', env: {} },
      { travail: 'essai', run: 'echo deux\necho trois', env: { A: 'b' } },
      { travail: 'essai', run: 'echo quatre', env: { C: 'd' } },
      { travail: 'autre', run: 'echo cinq', env: {} },
    ]);
    expect(r.illisibles).toEqual([]);
  });

  test('signale une étape qu’elle ne comprend pas, au lieu de l’ignorer', () => {
    const r = lireLaCI(['jobs:', '  essai:', '    steps:', '      - name: Rien à lancer', '        shell: bash', ''].join('\n'));
    expect(r.illisibles).toEqual(['essai : name: Rien à lancer']);
  });

  test('trouve dans ci.yml ce qu’elle doit trouver', () => {
    // Sans ceci, un changement de mise en forme de ci.yml viderait la liste, et les tests suivants
    // passeraient sur rien.
    expect(new Set(ci.etapes.map((e) => e.travail)).size).toBeGreaterThanOrEqual(5);
    expect(ci.etapes.length).toBeGreaterThan(25);
    expect(ci.etapes.some((e) => e.run.includes('$GITHUB_ENV'))).toBe(true);
    expect(ci.illisibles).toEqual([]);
  });
});

describe('le rejeu local suit ci.yml', () => {
  test('les travaux de la CI ont chacun leur étape, dans le même ordre', () => {
    expect(plan.etapes.map((e) => e.travail)).toEqual([...new Set(ci.etapes.map((e) => e.travail))]);
  });

  test('chaque étape de la CI est rejouée par un pas du même travail, ou dit pourquoi elle ne l’est pas', () => {
    const orphelines = ci.etapes
      .filter((e) => !plan.nonRejouees.some((n) => n.ci === e.run))
      .filter((e) => !pasDuTravail(e.travail).some((p) => p.ci !== null && normaliser(p.ci) === normaliser(e.run)))
      .map((e) => `${e.travail} : ${e.run}`);
    expect(orphelines).toEqual([]);
  });

  test('chaque pas qui dit rejouer une étape de la CI la retrouve dans son travail', () => {
    const morts = plan.etapes.flatMap((e) =>
      e.pas
        .filter((p) => p.ci !== null)
        .filter((p) => !ci.etapes.some((c) => c.travail === e.travail && normaliser(c.run) === normaliser(p.ci as string)))
        .map((p) => `${e.nom} · ${p.nom}`),
    );
    const nonRejoueesMortes = plan.nonRejouees.filter((n) => !ci.etapes.some((c) => c.run === n.ci)).map((n) => n.ci);
    expect([...morts, ...nonRejoueesMortes]).toEqual([]);
  });

  test('chaque commande est celle de la CI, aux quatre transformations déclarées près', () => {
    const commandes = plan.etapes.flatMap((e) => e.pas).filter((p) => p.ci !== null && !p.commande.startsWith('('));
    expect(commandes.length).toBeGreaterThan(20);
    const ecarts = commandes
      .filter((p) => sansClear(formeDeLaCI(p)) !== sansClear(normaliser(p.ci as string)))
      .map((p) => `${p.nom} : « ${p.commande} » ne rejoue pas « ${p.ci} »`);
    expect(ecarts).toEqual([]);
  });

  test('un pas propre au local dit pourquoi la CI n’en a pas besoin', () => {
    const muets = plan.etapes.flatMap((e) => e.pas.filter((p) => p.ci === null && !p.raison).map((p) => p.nom));
    expect(muets).toEqual([]);
    expect(plan.nonRejouees.every((n) => n.raison.length > 0)).toBe(true);
  });

  test('le CLI Supabase est celui que la CI épingle, partout', () => {
    expect([...new Set(ci.versionsSupabase)]).toEqual([plan.versionSupabase]);
    const appels = plan.etapes.flatMap((e) => e.pas.map((p) => p.commande)).filter((c) => /\bsupabase@/.test(c));
    expect(appels.length).toBeGreaterThan(0);
    expect(appels.filter((c) => !c.includes(`supabase@${plan.versionSupabase} `))).toEqual([]);
  });

  test('un pas porte la configuration que la CI donne à son étape', () => {
    // La configuration factice est ce que `verifier-configuration-export.mjs` retrouve dans le
    // bundle : une valeur recopiée de travers ici rendrait le contrôle rouge pour rien, ou vert
    // sur un export qui n'est pas celui de la CI.
    const avecEnv = ci.etapes.filter((e) => Object.keys(e.env).length > 0);
    expect(avecEnv.length).toBeGreaterThan(0);
    for (const e of avecEnv) {
      const pas = pasDuTravail(e.travail).find((p) => p.ci !== null && normaliser(p.ci) === normaliser(e.run));
      expect(pas?.env).toEqual(expect.objectContaining(e.env));
    }
  });

  test('chaque export porte --clear et son propre cache de Metro', () => {
    // Le cache de Metro est rangé dans le répertoire temporaire du système, donc partagé entre copies
    // de travail, et n'a pas les `EXPO_PUBLIC_*` dans sa clé (EXPO.md §1.1, TESTING-GARDES.md §2.6).
    const exports = plan.etapes.flatMap((e) => e.pas).filter((p) => p.commande.includes('expo export'));
    expect(exports.map((p) => p.nom)).toEqual(['export factice', 'export branché sur la stack']);
    expect(exports.filter((p) => !p.commande.split(' ').includes('--clear'))).toEqual([]);
    const factice = exports[0].env as Record<string, string>;
    expect(factice.TMPDIR).toMatch(/^<journal>\//);
  });

  test('toute variable qu’un script lit est écartée par le rejeu, ou déclarée inoffensive', () => {
    const lues = new Set<string>();
    for (const fichier of fs.readdirSync(path.join(racine, 'scripts')).filter((f) => f.endsWith('.mjs'))) {
      if (fichier === 'rejouer-la-ci.mjs') continue;
      const source = fs.readFileSync(path.join(racine, 'scripts', fichier), 'utf8');
      for (const m of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) lues.add(m[1]);
    }
    // Sans ceci, une lecture qui ne trouverait rien laisserait le test passer sur rien.
    expect(lues.has('DATABASE_URL')).toBe(true);
    const { ecartees, inoffensives } = plan.variables;
    const libres = [...lues].filter(
      (nom) => !ecartees.noms.includes(nom) && !ecartees.prefixes.some((p) => nom.startsWith(p)) && !(nom in inoffensives),
    );
    expect(libres).toEqual([]);
  });
});

describe('le choix des étapes', () => {
  test('ne décrit que les étapes nommées', () => {
    expect(aBlanc('base', 'jest').plan?.etapes.map((e) => e.nom)).toEqual(['jest', 'base']);
  });

  test('refuse une étape inconnue, en nommant les étapes', () => {
    const r = aBlanc('verification');
    expect(r.code).toBe(64);
    expect(r.erreur).toContain('verifications, jest, export, base, parcours');
  });
});
