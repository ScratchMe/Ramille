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
// **Le bloc `Functions` est comparé de la même façon, sur les noms d'arguments et leur optionalité —
// jamais sur leur type** (20/09/2026, v1-27 §2). Ce bloc est tenu à la main lui aussi, et un nom
// d'argument faux s'y paie de la même façon qu'une colonne fantôme : `supabase.rpc()` part avec une
// clé que la fonction ne connaît pas, et PostgREST répond « function not found » à l'exécution. Le
// type, lui, est exclu de la comparaison pour une raison mesurée le jour où le contrôle a été écrit :
// le générateur rend `string` pour tout argument `text`, sans savoir si la fonction accepte
// `null` — `mettre_a_jour_le_contexte(p_teletravail)` l'accepte, et le fichier du dépôt dit donc
// `string | null`, ce qui est plus juste que la sortie du générateur. Comparer les types ferait
// choisir entre un contrôle rouge à demeure et un type faux dans le code.
//
// **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1), sur une copie du fichier du dépôt
// jouant le rôle du fichier généré — huit mutations, et ce que chacune fait tomber :
//   - un argument renommé (`p_cause` → `p_causee`)            → 2 écarts (manque + fantôme) ;
//   - un `?` retiré (`p_cause?` → `p_cause`)                  → 1 écart d'optionalité ;
//   - une fonction renommée (`season_bounds` → `_v2`)          → 2 écarts (absente + fantôme) ;
//   - un argument ajouté, forme développée (`archiver_engagement`) → 1 écart ;
//   - un argument ajouté, forme sur une ligne (`check_intention_days`) → 1 écart ;
//   - le bloc `Functions` retiré                              → « Aucune fonction lue », sortie 1 ;
//   - le seul type changé (`p_teletravail: string | null` → `string`) → 0 écart, **voulu** ;
//   - `Args: never` réécrit `Args: Record<PropertyKey, never>` → 0 écart, **voulu** (l'ancienne
//     écriture du CLI pour une fonction sans argument, qui doit lire pareil).
// Ce que l'analyseur ne voit pas, des deux côtés : une **surcharge** (deux signatures du même nom),
// que le générateur rend en union — le dépôt n'en a aucune, par décision (C2.4, C4.6).
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

/**
 * Les arguments de chaque fonction, avec leur optionalité (`?`) et sans leur type.
 *
 * Le générateur produit deux formes selon la longueur : une fonction courte tient sur une ligne
 * (`nom: { Args: { a: t; b?: t }; Returns: t }`, ou `Args: never` sans argument), une longue se
 * développe (`Args: {` puis un argument par ligne à dix espaces). Les deux sont lues, parce que le
 * fichier du dépôt et le fichier généré peuvent choisir différemment pour une même fonction — une
 * retouche à la main allonge une ligne sans la replier. Les blocs `Returns: {` et `SetofOptions`
 * portent la même indentation que les arguments et sont ignorés : seul ce qui suit `Args` compte.
 */
function argumentsParFonction(chemin) {
  const lignes = fs.readFileSync(chemin, 'utf8').split('\n');
  const fonctions = new Map();
  let dansLeBloc = false;
  let fonction = null;
  let dansLesArgs = false;

  for (const ligne of lignes) {
    if (!dansLeBloc) {
      if (/^ {4}Functions: \{$/.test(ligne)) dansLeBloc = true;
      continue;
    }
    if (/^ {4}\}$/.test(ligne)) break;

    const surUneLigne = ligne.match(/^ {6}(\w+): \{ Args: (?:never|Record<PropertyKey, never>|\{ (.*?) \}); Returns: .*\}$/);
    if (surUneLigne) {
      fonctions.set(surUneLigne[1], argumentsEnLigne(surUneLigne[2]));
      continue;
    }
    const debut = ligne.match(/^ {6}(\w+): \{$/);
    if (debut) {
      fonction = debut[1];
      fonctions.set(fonction, new Map());
      dansLesArgs = false;
      continue;
    }
    if (!fonction) continue;
    if (/^ {6}\}$/.test(ligne)) {
      fonction = null;
      continue;
    }
    const argsEnLigne = ligne.match(/^ {8}Args: (?:never|Record<PropertyKey, never>|\{ (.*?) \})$/);
    if (argsEnLigne) {
      fonctions.set(fonction, argumentsEnLigne(argsEnLigne[1]));
      continue;
    }
    if (/^ {8}Args: \{$/.test(ligne)) {
      dansLesArgs = true;
      continue;
    }
    if (dansLesArgs && /^ {8}\}$/.test(ligne)) {
      dansLesArgs = false;
      continue;
    }
    const argument = dansLesArgs ? ligne.match(/^ {10}(\w+)(\??): /) : null;
    if (argument) fonctions.get(fonction).set(argument[1], argument[2]);
  }
  return fonctions;
}

/** `a: t; b?: t` → { a → '', b → '?' } ; `undefined` (la forme `never`) → aucun argument. */
function argumentsEnLigne(texte) {
  const args = new Map();
  if (!texte) return args;
  for (const morceau of texte.split(';')) {
    const argument = morceau.trim().match(/^(\w+)(\??): /);
    if (argument) args.set(argument[1], argument[2]);
  }
  return args;
}

const fonctionsAttendues = argumentsParFonction(genere);
const fonctionsPresentes = argumentsParFonction(TENU_A_LA_MAIN);

const attendu = colonnesParTable(genere);
const present = colonnesParTable(TENU_A_LA_MAIN);

if (attendu.size === 0 || fonctionsAttendues.size === 0) {
  console.error(
    `Aucune ${attendu.size === 0 ? 'table' : 'fonction'} lue dans ${genere} : le générateur n'a rien ` +
      `produit, ou sa forme a changé.\nLe contrôle ne peut rien comparer, et passer serait pire que rougir.`
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

for (const [nom, args] of fonctionsAttendues) {
  const local = fonctionsPresentes.get(nom);
  if (!local) {
    ecarts.push(`Functions.${nom} : absente de src/lib/database.types.ts`);
    continue;
  }
  for (const [argument, optionnel] of args) {
    if (!local.has(argument))
      ecarts.push(`Functions.${nom}.${argument} : manque (la base le porte, le fichier non)`);
    else if (local.get(argument) !== optionnel)
      ecarts.push(
        `Functions.${nom}.${argument} : ${optionnel ? 'facultatif' : 'obligatoire'} en base, ` +
          `${local.get(argument) ? 'facultatif' : 'obligatoire'} dans le fichier`
      );
  }
  for (const argument of local.keys()) {
    if (!args.has(argument))
      ecarts.push(`Functions.${nom}.${argument} : fantôme (le fichier le porte, la base non)`);
  }
}

for (const nom of fonctionsPresentes.keys()) {
  if (!fonctionsAttendues.has(nom)) ecarts.push(`Functions.${nom} : dans le fichier, absente de la base`);
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

console.log(
  `${attendu.size} blocs de colonnes et ${fonctionsAttendues.size} fonctions comparés, aucun écart avec la base.`
);
