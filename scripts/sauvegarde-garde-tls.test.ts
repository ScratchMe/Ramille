/// <reference types="node" />
/**
 * Garde du chiffrement de la sauvegarde (`.github/workflows/sauvegarde.yml`, première étape).
 *
 * Le workflow ne tourne pas en CI : une garde qu'on réécrirait de travers ne ferait rien tomber
 * avant la sauvegarde suivante, et le jour où elle laisserait passer un mode faible, rien ne le
 * dirait. Ce test lit donc **le texte même de l'étape** dans le workflow, sans le recopier, et le
 * joue sous `bash` avec de fausses chaînes de connexion. L'assertion porte sur le code de sortie
 * (0 seul laisse partir le dump) et sur le message, et chaque cas vérifie qu'aucun fragment du
 * mot de passe n'est imprimé : c'est ce qu'un `echo` de trop publierait dans un journal public
 * (le défaut du 17/09/2026, `docs/exploitation/sauvegarde.md` §3).
 *
 * Pourquoi une liste blanche, et pourquoi ces cas : libpq décode les `%` des noms et des valeurs
 * d'une URI, retient le dernier paramètre répété, et lit aussi les chaînes `clé=valeur` — relevé
 * le 02/10/2026 par la contre-lecture, `PQconninfoParse` de libpq 16 à l'appui. Une garde qui
 * cherchait `sslmode=prefer` laissait passer `sslmode=%70refer`, qui vaut `prefer`, et `prefer`
 * dans la chaîne l'emporte sur `PGSSLMODE=require` (mesuré le même jour sur un serveur sans TLS).
 *
 * Non-vacuité, mesurée le 02/10/2026 en cassant l'étape sept fois (chaque mutation remise en place
 * avant la suivante) : accepter `sslmode=prefer` fait tomber 2 tests ; accepter tout paramètre
 * inconnu, 5 ; retirer la vérification du schéma, 1 ; retirer le refus des espaces, 2 ; nommer le
 * paramètre inconnu dans le message, 1 ; couper la requête au dernier « ? » plutôt qu'au premier,
 * 1 ; retirer `PGSSLMODE` de l'environnement du job, 1. Aucune mutation ne passe.
 *
 * **Et ce que le dump doit porter** (fin de fichier) : les privilèges de `public` — sans eux, une
 * restauration rend les fonctions internes appelables par `anon` (`docs/exploitation/sauvegarde.md`
 * §5 ter) — et les compléments, que le contrôle exige. Le contrôle est joué sous `bash` sur un dump
 * fabriqué, abîmé d'une seule façon par cas. Mesuré le 18/10/2026 en mutant le workflow huit fois,
 * l'état d'avant réécrit après chacune : `--no-privileges` remis, 1 test ; `analytics` retiré du dump,
 * 1 ; le plancher des privilèges à 0, 2 ; le contrôle du trigger retiré, 1 ; celui des planifications,
 * 1 ; l'avertissement du concédant, 1 ; les compléments hors de l'archive, 1 ; hors de la relecture, 1.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const workflow = fs.readFileSync(
  path.resolve(__dirname, '..', '.github', 'workflows', 'sauvegarde.yml'),
  'utf8',
);

const NOM_DE_L_ETAPE = 'Vérifier les secrets et le chiffrement exigé';

/**
 * Le bloc `run: |` de l'étape, désindenté. Lu ligne à ligne plutôt que par un analyseur YAML :
 * aucun n'est une dépendance directe du dépôt, et la forme `- name:` puis `run: |` est celle de
 * toutes les étapes de ce fichier. Si elle change, l'extraction échoue bruyamment.
 */
function scriptDeLEtape(nom: string = NOM_DE_L_ETAPE): string {
  const lignes = workflow.split('\n');
  const i = lignes.findIndex((l) => l.trim() === `- name: ${nom}`);
  if (i < 0) throw new Error(`Étape « ${nom} » introuvable dans sauvegarde.yml`);
  const run = lignes[i + 1];
  if (run.trim() !== 'run: |') throw new Error(`L'étape « ${nom} » n'est pas suivie de « run: | »`);
  const retrait = run.length - run.trimStart().length;
  const bloc: string[] = [];
  for (const l of lignes.slice(i + 2)) {
    if (l.trim() !== '' && l.length - l.trimStart().length <= retrait) break;
    bloc.push(l);
  }
  const marge = Math.min(...bloc.filter((l) => l.trim() !== '').map((l) => l.length - l.trimStart().length));
  return bloc.map((l) => l.slice(marge)).join('\n');
}

const script = scriptDeLEtape();

/** Un fragment du mot de passe, qu'aucun message de l'étape ne contient. */
const MARQUEUR = 'ZQX7';
const BASE = `postgresql://postgres.ref:mot${MARQUEUR}%40passe@aws-1-eu-west-3.pooler.supabase.com:5432/postgres`;

function jouer(url: string | undefined): { code: number | null; sortie: string } {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SAUVEGARDE_PASSPHRASE: 'x',
    R2_ENDPOINT: 'x',
    R2_BUCKET: 'x',
    AWS_ACCESS_KEY_ID: 'x',
    AWS_SECRET_ACCESS_KEY: 'x',
  };
  // Une chaîne qui traînerait dans le shell de la personne fausserait le scénario en silence.
  delete env.SUPABASE_DB_URL;
  if (url !== undefined) env.SUPABASE_DB_URL = url;
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', env });
  return { code: r.status, sortie: `${r.stdout}${r.stderr}` };
}

describe('sauvegarde.yml — le job exige TLS', () => {
  test('PGSSLMODE vaut require dans l’environnement du job, donc pour les deux pg_dump', () => {
    // Six espaces : une clé de `jobs.dump.env`. Une clé d'étape serait à dix.
    expect(workflow).toMatch(/^ {6}PGSSLMODE: require$/m);
  });
});

describe('sauvegarde.yml — la chaîne de connexion ne défait pas PGSSLMODE', () => {
  test.each([
    ['sans requête', BASE],
    ['sslmode=require', `${BASE}?sslmode=require`],
    ['sslmode=verify-ca', `${BASE}?sslmode=verify-ca`],
    ['sslmode=verify-full', `${BASE}?sslmode=verify-full`],
    ['deux modes exigeants', `${BASE}?sslmode=require&sslmode=verify-full`],
    ['le schéma court postgres://', `postgres://${BASE.slice('postgresql://'.length)}?sslmode=require`],
  ])('%s : le dump peut partir', (_nom, url) => {
    const r = jouer(url);
    expect(r.sortie).toBe('');
    expect(r.code).toBe(0);
  });

  test.each([
    ['sslmode=prefer', `${BASE}?sslmode=prefer`],
    ['sslmode=allow', `${BASE}?sslmode=allow`],
    ['sslmode=disable', `${BASE}?sslmode=disable`],
    // libpq retient le dernier : cette chaîne vaut `prefer`.
    ['require puis prefer', `${BASE}?sslmode=require&sslmode=prefer`],
  ])('%s : refusé, et le mode est nommé', (_nom, url) => {
    const r = jouer(url);
    expect(r.code).toBe(1);
    expect(r.sortie).toMatch(/porte sslmode=(prefer|allow|disable), qui l'emporte sur PGSSLMODE=require/);
    expect(r.sortie).not.toContain(MARQUEUR);
  });

  test.each([
    // Les trois formes que la contre-lecture a fait passer sous l'ancienne garde.
    ['un mode encodé (%70refer vaut prefer)', `${BASE}?sslmode=%70refer`],
    ['un nom encodé (ssl%6dode)', `${BASE}?ssl%6dode=prefer`],
    ['require puis un disable encodé', `${BASE}?sslmode=require&sslmode=%64isable`],
    // Liste blanche : un paramètre inoffensif est refusé aussi, et c'est voulu.
    ['un autre paramètre', `${BASE}?connect_timeout=5&sslmode=require`],
    // Un « ? » non encodé dans le mot de passe : la requête commence au milieu du mot de passe.
    ['un « ? » non encodé dans le mot de passe', `postgresql://postgres.ref:mot?${MARQUEUR}@hote:5432/postgres?sslmode=require`],
  ])('%s : refusé sans rien nommer', (_nom, url) => {
    const r = jouer(url);
    expect(r.code).toBe(1);
    expect(r.sortie).toContain("un paramètre que cette étape n'accepte pas");
    expect(r.sortie).not.toContain(MARQUEUR);
  });

  test('une chaîne clé=valeur n’est pas une URI : refusée', () => {
    const r = jouer(`dbname=postgres${MARQUEUR}`);
    expect(r.code).toBe(1);
    expect(r.sortie).toContain("n'est pas une URI postgresql://");
    expect(r.sortie).not.toContain(MARQUEUR);
  });

  test.each([
    ['une chaîne clé=valeur à espaces', `host=hote password=${MARQUEUR} sslmode=prefer`],
    ['un retour à la ligne final', `${BASE}?sslmode=require\n`],
  ])('%s : refusé, une URI ne porte pas d’espace', (_nom, url) => {
    const r = jouer(url);
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('contient une espace ou un retour à la ligne');
    expect(r.sortie).not.toContain(MARQUEUR);
  });

  test('secret absent : refusé par la première vérification, avant toute lecture du mode', () => {
    const r = jouer(undefined);
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('Secrets de dépôt manquants : SUPABASE_DB_URL');
  });
});

// ── Les privilèges et les compléments ────────────────────────────────────────────────────────

const dump = scriptDeLEtape('Dumper la base');
const controle = scriptDeLEtape('Vérifier que le dump a du contenu');

/** La commande `pg_dump` ou `psql` qui écrit `fichier`, continuations comprises. */
function commandeQuiEcrit(fichier: string): string {
  const trouvee = dump
    .split(/\n(?=pg_dump |psql )/)
    .find((c) => c.includes(`--file=sauvegarde/${fichier}`) || c.includes(`--output=sauvegarde/${fichier}`));
  if (!trouvee) throw new Error(`Aucune commande n'écrit ${fichier} dans « Dumper la base »`);
  return trouvee;
}

describe('sauvegarde.yml — le dump porte les privilèges', () => {
  test('public.sql : sans --no-privileges, propriétaires écartés, analytics compris', () => {
    const commande = commandeQuiEcrit('public.sql');
    expect(commande).not.toContain('--no-privileges');
    expect(commande).toContain('--no-owner');
    expect(commande).toContain('--schema=analytics');
  });

  test('les compléments sont écrits, archivés et relus', () => {
    expect(commandeQuiEcrit('complements.sql')).toContain('cron.schedule');
    expect(workflow).toMatch(/tar -czf .* public\.sql auth\.sql complements\.sql$/m);
    expect(scriptDeLEtape("Vérifier que l'archive s'ouvre")).toContain(
      'for attendu in public.sql auth.sql complements.sql; do',
    );
  });
});

/** Un dump plausible, que chaque cas abîme d'une seule façon. */
function fichiersDuDump({ fermees = 25, trigger = true, planification = true, autreConcedant = false } = {}) {
  const remplissage = `-- ${'x'.repeat(1100)}\n`;
  const publicSql = [
    remplissage,
    ...['assessments', 'assessment_answers', 'plan_actions', 'engagement_checkins'].map(
      (t) => `CREATE TABLE "public"."${t}" (id uuid);`,
    ),
    'CREATE TABLE "supabase_migrations"."schema_migrations" (version text);',
    'COPY "public"."transport_modes" ("id") FROM stdin;',
    ...Array.from({ length: 12 }, (_, i) => `mode_${i}`),
    '\\.',
    ...Array.from({ length: fermees }, (_, i) => `REVOKE ALL ON FUNCTION "public"."f${i}"() FROM PUBLIC;`),
    ...(autreConcedant ? ['SET SESSION AUTHORIZATION "supabase_admin";'] : []),
  ].join('\n');
  const authSql = `${remplissage}COPY "auth"."users" ("id") FROM stdin;\n\\.\n`;
  const complements = [
    '-- Triggers sur auth.* et planifications pg_cron, exportés à la sauvegarde.',
    ...(trigger
      ? ['CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();']
      : []),
    ...(planification ? ["select cron.schedule('purge-usage-events', '30 3 * * *', 'select public.purge_usage_events();');"] : []),
  ].join('\n');
  return { 'public.sql': publicSql, 'auth.sql': authSql, 'complements.sql': complements };
}

function controler(fichiers: Record<string, string>): { code: number | null; sortie: string } {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'sauvegarde-controle-'));
  try {
    fs.mkdirSync(path.join(dossier, 'sauvegarde'));
    for (const [nom, contenu] of Object.entries(fichiers)) {
      fs.writeFileSync(path.join(dossier, 'sauvegarde', nom), contenu);
    }
    const r = spawnSync('bash', ['-c', controle], { encoding: 'utf8', cwd: dossier });
    return { code: r.status, sortie: `${r.stdout}${r.stderr}` };
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
}

describe('sauvegarde.yml — le contrôle refuse un dump sans privilèges ni compléments', () => {
  test('un dump complet passe', () => {
    const r = controler(fichiersDuDump());
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('fonctions fermées à PUBLIC : 25');
    expect(r.sortie).not.toContain('::warning::');
  });

  test.each([
    ['aucun REVOKE (un --no-privileges remis)', { fermees: 0 }, 'ne ferme que 0 fonctions à PUBLIC'],
    ['sous le plancher', { fermees: 19 }, 'ne ferme que 19 fonctions à PUBLIC'],
    ['le trigger des profils manquant', { trigger: false }, 'Le trigger on_auth_user_created manque aux compléments'],
    ['aucune planification', { planification: false }, 'Aucune planification pg_cron dans les compléments'],
  ])('%s : refusé', (_nom, abime, message) => {
    const r = controler(fichiersDuDump(abime));
    expect(r.code).toBe(1);
    expect(r.sortie).toContain(message);
  });

  test('un concédant autre que postgres avertit sans refuser : la sauvegarde reste bonne', () => {
    const r = controler(fichiersDuDump({ autreConcedant: true }));
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('::warning::Le dump porte un SET SESSION AUTHORIZATION');
  });
});
