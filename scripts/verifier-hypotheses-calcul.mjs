// Les hypothèses affichées à l'utilisateur disent-elles les mêmes nombres que le calcul ? (C3.2)
//
// `src/constants/methodologie.ts` écrit sous le total de la restitution ce que le bilan suppose :
// 45 semaines travaillées, 1 500 km pour un vol court, 0,25 sortie par semaine pour « rarement »…
// Ces valeurs sont un **miroir tenu à la main** des constantes de `recompute_assessment_results`,
// et un miroir tenu à la main dérive. Le défaut serait de la pire espèce : un bloc intitulé
// « Comment ce chiffre est calculé » qui décrit un calcul que la base ne fait plus.
//
// **Pourquoi un script et pas un test Jest.** Le contrôle demande de lire les migrations, donc
// `fs` — et le `tsconfig.json` racine porte `"types": ["jest"]`, volontairement, pour que le code
// de l'app ne puisse pas atteindre les API de Node. Ajouter `"node"` pour un seul test ouvrirait
// `fs` à tout `src/`. C'est la même raison qui a fait des quatre gardes d'export des `.mjs` :
// ce qui compare deux artefacts vit à côté du code, pas dedans.
//
// **Pourquoi la dernière migration et pas la première.** `recompute_assessment_results` a été
// réécrite six fois ; la base porte la version de la dernière migration qui la redéfinit, dans
// l'ordre des versions. Lire `20260824180200` donnerait les valeurs d'origine, dont plusieurs ont
// changé depuis (les facteurs avion, le train longue distance).

import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.join(import.meta.dirname, '..');
const MIGRATIONS = path.join(RACINE, 'supabase', 'migrations');
const MODULE = path.join(RACINE, 'src', 'constants', 'methodologie.ts');

// Chaque hypothèse affichée, et la constante SQL dont elle doit être la copie.
const PAIRES = [
  ['semainesDomicileTravail', 'weeks_per_year_commute'],
  ['semainesLoisirs', 'weeks_per_year_standard'],
  ['rarement', 'leisure_freq_rarely'],
  ['hebdomadaire', 'leisure_freq_weekly'],
  ['plusieurs', 'leisure_freq_multiple'],
  ['distanceSortieParDefautKm', 'leisure_default_distance'],
  ['volCourtKm', 'dist_flight_short'],
  ['volLongKm', 'dist_flight_long'],
  ['trainLongKm', 'dist_train_long'],
  ['voitureLongKm', 'dist_car_long'],
  // Ajoutée par C3.4, qui a fait de la moitié du trajet une constante nommée
  // (`second_leg_share_default`) au lieu d'un `/ 2` écrit en clair dans les deux branches du
  // trajet domicile-travail. Elle n'est plus l'hypothèse de tout le monde — la question est
  // posée à l'écran — mais elle reste ce que le calcul applique à un bilan qui n'y a pas
  // répondu, donc le bloc de méthode la cite et ce contrôle la compare.
  ['partDuSecondMode', 'second_leg_share_default'],
];

function derniereDefinitionSql() {
  const fichiers = fs
    .readdirSync(MIGRATIONS)
    .filter((nom) => nom.endsWith('.sql'))
    .sort()
    .filter((nom) =>
      fs.readFileSync(path.join(MIGRATIONS, nom), 'utf8').includes('weeks_per_year_commute constant')
    );
  if (fichiers.length === 0) {
    throw new Error(
      'Aucune migration ne définit les constantes du calcul : le contrôle ne peut rien comparer.'
    );
  }
  const nom = fichiers[fichiers.length - 1];
  const corps = fs.readFileSync(path.join(MIGRATIONS, nom), 'utf8');
  const valeurs = new Map();
  for (const [, cle, valeur] of corps.matchAll(/^\s*(\w+)\s+constant numeric\s*:=\s*([\d.]+);/gm)) {
    valeurs.set(cle, Number(valeur));
  }
  return { nom, valeurs };
}

function hypothesesAffichees() {
  const corps = fs.readFileSync(MODULE, 'utf8');
  const bloc = corps.match(/export const HYPOTHESES = \{([\s\S]*?)\n\} as const;/);
  if (!bloc) throw new Error('Bloc HYPOTHESES introuvable dans src/constants/methodologie.ts.');
  const valeurs = new Map();
  for (const [, cle, valeur] of bloc[1].matchAll(/(\w+):\s*([\d.]+)\s*[,}]/g)) {
    valeurs.set(cle, Number(valeur));
  }
  return valeurs;
}

const sql = derniereDefinitionSql();
const affichees = hypothesesAffichees();
const ecarts = [];

for (const [cleTs, cleSql] of PAIRES) {
  const attendue = sql.valeurs.get(cleSql);
  const affichee = affichees.get(cleTs);
  if (attendue === undefined) {
    ecarts.push(`${cleSql} n'existe plus dans ${sql.nom} : la paire est à reprendre.`);
  } else if (affichee === undefined) {
    ecarts.push(`${cleTs} a disparu de HYPOTHESES : le bloc n'affiche plus cette hypothèse.`);
  } else if (affichee !== attendue) {
    ecarts.push(`${cleTs} affiche ${affichee}, le calcul utilise ${attendue} (${cleSql}).`);
  }
}

if (ecarts.length > 0) {
  console.error(
    `Le bloc « Comment ce chiffre est calculé » ne dit pas ce que le calcul fait.\n` +
      `Référence : supabase/migrations/${sql.nom}\n\n` +
      ecarts.map((e) => `  - ${e}`).join('\n') +
      `\n\nCorriger src/constants/methodologie.ts, ou la paire de ce script si une constante a été renommée.`
  );
  process.exit(1);
}

console.log(
  `${PAIRES.length} hypothèses affichées, toutes égales aux constantes de ${sql.nom}.`
);
