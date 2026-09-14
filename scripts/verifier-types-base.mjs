// `src/lib/database.types.ts` dit-il encore ce que la base contient ? (C3.12 §3)
//
// Ce fichier est **tenu à la main** : après chaque migration on le régénère, ou — plus souvent —
// on y ajoute les colonnes à la main dans le style existant, parce que le dépôt n'a pas de
// formateur et que régénérer ferait un diff de mille lignes pour trois. Une main qui tient un
// miroir le laisse dériver, et cette dérive-là est particulièrement discrète : le typecheck reste
// vert, puisqu'il vérifie le code **contre ce fichier** et jamais le fichier contre la base. Une
// colonne oubliée dans le bloc `Insert` rend simplement impossible d'écrire une colonne qui
// existe ; une colonne fantôme laisse écrire une colonne qui n'existe plus, et l'échec arrive à
// l'exécution, en anglais, chez la personne.
//
// **La comparaison porte sur les colonnes, pas sur le texte.** Un `diff` de fichiers obligerait à
// reproduire au caractère près les guillemets, l'ordre et les retours à la ligne du générateur, et
// tomberait à la première version du CLI qui change une virgule — c'est-à-dire qu'il finirait
// désarmé. Ce qui compte est l'ensemble `(table, bloc, colonne) → type`, et il se lit des deux
// côtés avec le même analyseur : les deux fichiers ont la même forme, seule leur fraîcheur diffère.
//
// Usage : node scripts/verifier-types-base.mjs <fichier-genere.ts>
// En CI, le fichier généré vient de `supabase gen types typescript --local`, donc de la base que
// `supabase/migrations/` vient de construire — la même que celle des tests pgTAP.

import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.join(import.meta.dirname, '..');
const TENU_A_LA_MAIN = path.join(RACINE, 'src', 'lib', 'database.types.ts');

const genere = process.argv[2];
if (!genere) {
  console.error(
    'Usage : node scripts/verifier-types-base.mjs <fichier-genere.ts>\n' +
      'Le fichier généré vient de `supabase gen types typescript --local`.'
  );
  process.exit(2);
}

/**
 * Les colonnes de chaque table, par bloc (`Row`, `Insert`, `Update`).
 *
 * L'analyse s'appuie sur l'indentation du générateur, qui est stable : une table est introduite à
 * six espaces, un bloc à huit, une colonne à dix. Les vues et les fonctions vivent dans d'autres
 * sections du fichier et portent la même indentation ; c'est sans conséquence — ce qu'on compare
 * est un ensemble, et il est lu identiquement des deux côtés.
 */
function colonnesParTable(chemin) {
  const lignes = fs.readFileSync(chemin, 'utf8').split('\n');
  const tables = new Map();
  let table = null;
  let bloc = null;

  for (const ligne of lignes) {
    const debutTable = ligne.match(/^ {6}(\w+): \{$/);
    if (debutTable) {
      table = debutTable[1];
      bloc = null;
      continue;
    }
    const debutBloc = ligne.match(/^ {8}(Row|Insert|Update): \{$/);
    if (debutBloc && table) {
      bloc = debutBloc[1];
      continue;
    }
    if (/^ {8}\}$/.test(ligne)) {
      bloc = null;
      continue;
    }
    const colonne = ligne.match(/^ {10}(\w+)\??: (.+)$/);
    if (colonne && table && bloc) {
      const cle = `${table}.${bloc}`;
      if (!tables.has(cle)) tables.set(cle, new Map());
      // Le `?` de l'optionalité est retiré de la clé mais gardé dans la valeur : il fait partie du
      // contrat (une colonne obligatoire à l'insert n'est pas la même chose qu'une colonne
      // facultative), et c'est exactement le genre de détail qu'une retouche à la main inverse.
      const optionnel = /^ {10}\w+\?:/.test(ligne) ? '?' : '';
      tables.get(cle).set(colonne[1], `${optionnel}${colonne[2].replace(/,\s*$/, '').trim()}`);
    }
  }
  return tables;
}

const attendu = colonnesParTable(genere);
const present = colonnesParTable(TENU_A_LA_MAIN);

if (attendu.size === 0) {
  console.error(
    `Aucune table lue dans ${genere} : le générateur n'a rien produit, ou sa forme a changé.\n` +
      `Le contrôle ne peut rien comparer, et passer serait pire que rougir.`
  );
  process.exit(1);
}

const ecarts = [];

for (const [cle, colonnes] of attendu) {
  const local = present.get(cle);
  if (!local) {
    ecarts.push(`${cle} : absent de src/lib/database.types.ts`);
    continue;
  }
  for (const [nom, type] of colonnes) {
    if (!local.has(nom)) ecarts.push(`${cle}.${nom} : manque (la base la porte, le fichier non)`);
    else if (local.get(nom) !== type)
      ecarts.push(`${cle}.${nom} : « ${local.get(nom)} » dans le fichier, « ${type} » attendu`);
  }
  for (const nom of local.keys()) {
    if (!colonnes.has(nom)) ecarts.push(`${cle}.${nom} : fantôme (le fichier la porte, la base non)`);
  }
}

for (const cle of present.keys()) {
  if (!attendu.has(cle)) ecarts.push(`${cle} : dans le fichier, absent de la base`);
}

if (ecarts.length > 0) {
  console.error(
    `src/lib/database.types.ts ne décrit plus la base.\n` +
      `Référence : ${genere}\n\n` +
      ecarts.map((e) => `  - ${e}`).join('\n') +
      `\n\nRégénérer le fichier (mcp Supabase generate_typescript_types, ou ` +
      `\`supabase gen types typescript --local\`) et reprendre le style du dépôt : ` +
      `guillemets doubles, pas de formateur automatique ici.`
  );
  process.exit(1);
}

console.log(`${attendu.size} blocs de colonnes comparés, aucun écart avec la base.`);
