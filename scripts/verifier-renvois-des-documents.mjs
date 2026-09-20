// Les fichiers que les documents désignent existent-ils encore ?
//
// **La famille de défaut la plus fréquente de ce dépôt n'est pas dans le calcul : c'est une phrase
// qui décrit ce que le code faisait avant.** Quatre relectures du 20/09/2026 ont trouvé trente-cinq
// affirmations fausses et **aucune** erreur de calcul. Une bonne part d'entre elles étaient des
// renvois : un seuil annoncé dans un fichier où il ne vit pas, un test cité sous un nom qu'il n'a
// plus, un écran désigné par un chemin qu'un chantier a déplacé.
//
// Celui qui a motivé ce script : `CLAUDE.md` présentait le groupe d'onglets comme portant
// « `plan.tsx` … et la pile `suivi/` » — or C5.2 a fait du plan **une pile aussi**
// (`plan/index.tsx`, `plan/pistes.tsx`), donc le paragraphe d'orientation le plus lu du dépôt se
// trompait deux fois, et depuis des jours. Un `grep` l'aurait vu en une seconde ; personne ne le
// lance.
//
// **Ce que ce contrôle voit, et ce qu'il ne voit pas.** Il compare les chemins cités entre
// accents graves aux fichiers réellement présents. Il ne dit rien de la **justesse** de la phrase
// qui les entoure : un document peut nommer le bon fichier et raconter n'importe quoi de son
// contenu. C'est une garde contre le **renommage** et le **déplacement**, pas contre le mensonge —
// et c'est déjà la moitié de ce qui nous est arrivé.
//
// **Les documents datés sont hors périmètre**, et c'est volontaire : `docs/audit/` et les
// `v1-0N` sont des instantanés d'un jour, que le dépôt ne réécrit pas. Un renvoi périmé y est
// exact — il dit où la chose était à cette date-là.
//
// **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1) — deux mutations, une par branche :
//   - `plan/pistes.tsx` → `plan/pistess.tsx` dans CLAUDE.md → 1 écart, qui nomme le document, la
//     ligne et le chemin ;
//   - une tolérance ajoutée à `TOLERES` qu'aucun document n'emprunte → 1 écart de l'autre
//     espèce. Cette seconde branche existe parce qu'une exception qui ne couvre plus rien ne
//     disparaît pas : elle attend qu'un vrai écart porte le même nom pour le couvrir à son tour.
// Et un passage qui doit rester **vert** : les huit renvois tolérés ci-dessous, dont la moitié
// désigne des fichiers qui n'ont jamais eu à exister dans le dépôt.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const RACINE = path.join(import.meta.dirname, '..');

/**
 * Les documents **vivants** — ceux qu'un changement de code rend faux.
 *
 * `docs/architecture/v1-0N-*.md` n'y est pas : ce sont des décisions datées. `produit.md` et
 * `v1-27` y sont, parce que ce dépôt les tient à jour et s'y fie pour savoir où il en est.
 */
const DOCUMENTS = [
  'CLAUDE.md',
  'FRONT.md',
  'TESTING.md',
  'SUPABASE.md',
  'VERCEL.md',
  'EXPO.md',
  'RECETTE.md',
  'README.md',
  'docs/architecture/produit.md',
  'docs/architecture/v1-27-dette-technique.md',
];

/** Les dossiers qui portent des documents vivants et dont on prend tout le contenu. */
const DOSSIERS = ['docs/exploitation', 'docs/recette'];

/**
 * Ce qu'on ne cherche pas dans le dépôt, avec la raison — jamais « ça faisait du bruit ».
 *
 * La liste est courte et **chaque entrée dit pourquoi**, parce qu'une liste d'exceptions sans
 * raisons est exactement ce qui pourrit : le jour où l'une d'elles cesse d'être vraie, personne
 * ne peut le savoir. Elles sont imprimées à chaque passage, pour qu'on les voie vieillir.
 */
const TOLERES = new Map([
  ['google-services.json', 'absent du dépôt à dessein — secret Firebase, gitignoré (EXPO.md §1.4)'],
  ['public.sql', 'nom d’un fichier produit par la sauvegarde, pas un fichier du dépôt'],
  ['auth.sql', 'idem — la sauvegarde écrit deux dumps, `public.sql` et `auth.sql`'],
  ['x.sh', 'exemple d’illustration du piège `pgrep -f`, ne désigne aucun fichier'],
  ['lib/fetch.js', 'chemin interne de `@supabase/auth-js`, dans node_modules'],
  ['build/useScreens.js', 'chemin interne d’`expo-router`, lu dans une trace de pile'],
  ['getRouteInfoFromState.js', 'idem — trace de pile d’`expo-router`'],
  ['setup.js', 'fichier interne de `jest-expo`, cité pour expliquer son doublage'],
]);

/** Tous les fichiers du dépôt, chemins relatifs à la racine. La règle de comparaison est plus
 * bas, dans `estLeMeme` — elle a vécu ici un temps, et l'y laisser aurait été exactement le
 * défaut que ce script traque. */
function fichiersDuDepot() {
  const ignores = new Set(['node_modules', '.git', 'dist', '.expo', '.next', 'coverage']);
  const trouves = [];
  const parcourir = (dossier) => {
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      if (ignores.has(entree.name)) continue;
      const chemin = path.join(dossier, entree.name);
      if (entree.isDirectory()) parcourir(chemin);
      else trouves.push(path.relative(RACINE, chemin));
    }
  };
  parcourir(RACINE);
  return trouves;
}

function documentsALire() {
  const liste = DOCUMENTS.filter((d) => fs.existsSync(path.join(RACINE, d)));
  for (const dossier of DOSSIERS) {
    const complet = path.join(RACINE, dossier);
    if (!fs.existsSync(complet)) continue;
    for (const nom of fs.readdirSync(complet)) {
      if (nom.endsWith('.md')) liste.push(path.join(dossier, nom));
    }
  }
  return liste;
}

// Un chemin entre accents graves, reconnu à son extension. Les parenthèses sont exclues : elles
// signalent un appel de fonction (`resolve_mode()`), pas un fichier — et les groupes de route
// d'Expo (`(tabs)`) n'apparaissent pas dans les renvois courts que les documents écrivent.
const RENVOI = /`([A-Za-z0-9_/.-]+\.(?:ts|tsx|mjs|sql|js|json|yml|yaml|sh))`/g;

/**
 * Un renvoi désigne-t-il ce fichier ? Trois formes, et chacune a sa raison d'exister.
 *
 *   1. **Le suffixe de chemin.** `suivi/bilan.tsx` désigne `src/app/(tabs)/suivi/bilan.tsx` :
 *      demander le chemin entier rendrait la prose illisible. C'est bien un suffixe **de segment**
 *      et non de chaîne, sans quoi `plan.tsx` attraperait `mon-plan.tsx`.
 *   2. **Le chemin servi.** `/.well-known/assetlinks.json` est l'URL que le site expose ; le
 *      fichier vit sous `public/`. Un document qui parle d'une URL l'écrit avec sa barre
 *      oblique, et c'est la bonne façon de l'écrire.
 *   3. **Le nom lisible d'une migration.** Les fichiers de `supabase/migrations/` portent un
 *      horodatage généré ; les documents citent souvent la seule partie qui veut dire quelque
 *      chose (`car_engine.sql`). La règle est bornée à ce dossier, donc elle ne peut pas masquer
 *      un renvoi périmé ailleurs.
 */
function estLeMeme(fichier, renvoi) {
  const nu = renvoi.replace(/^\/+/, '');
  if (fichier === nu || fichier.endsWith(`/${nu}`)) return true;
  if (!fichier.startsWith('supabase/migrations/') || nu.includes('/')) return false;
  return path.basename(fichier).replace(/^\d+_/, '') === nu;
}

const fichiers = fichiersDuDepot();
const ecarts = [];
let comptes = 0;
const toleresVus = new Set();

for (const document of documentsALire()) {
  const lignes = fs.readFileSync(path.join(RACINE, document), 'utf8').split('\n');
  lignes.forEach((ligne, index) => {
    for (const trouve of ligne.matchAll(RENVOI)) {
      const renvoi = trouve[1];
      if (renvoi.startsWith('.')) continue;
      comptes += 1;
      if (TOLERES.has(renvoi)) {
        toleresVus.add(renvoi);
        continue;
      }
      const resolu = fichiers.some((fichier) => estLeMeme(fichier, renvoi));
      if (!resolu) {
        ecarts.push(`${document}:${index + 1} — « ${renvoi} » ne désigne aucun fichier du dépôt`);
      }
    }
  });
}

// Une tolérance qu'aucun document n'emprunte plus est une ligne morte : elle se lit « ce cas
// existe » alors qu'il a disparu, et elle couvrira demain un vrai écart portant le même nom.
const toleresMorts = [...TOLERES.keys()].filter((r) => !toleresVus.has(r));

if (ecarts.length > 0) {
  console.error('Des documents désignent des fichiers qui n’existent pas :\n');
  for (const ecart of ecarts) console.error(`  - ${ecart}`);
  console.error(
    '\nLe document se corrige, jamais le dépôt : c’est le chemin réel qui fait foi.\n' +
      'Si le fichier a bougé, le renvoi suit ; s’il n’a jamais existé ici (une dépendance, un\n' +
      'fichier produit, un exemple), sa place est dans `TOLERES`, **avec sa raison**.',
  );
  process.exit(1);
}

if (toleresMorts.length > 0) {
  console.error('Des tolérances ne servent plus — plus aucun document ne les emprunte :\n');
  for (const mort of toleresMorts) console.error(`  - « ${mort} » (${TOLERES.get(mort)})`);
  console.error('\nLes retirer de `TOLERES` : une exception qui ne couvre plus rien en couvrira une autre.');
  process.exit(1);
}

console.log(
  `${comptes} renvois de fichier vérifiés dans ${documentsALire().length} documents vivants, ` +
    `tous résolus (${toleresVus.size} tolérés, chacun avec sa raison en tête du script).`,
);
