// Refuse un export web dont le bundle ne porterait pas les valeurs des variables
// `EXPO_PUBLIC_*`.
//
// **Le piège, vérifié en A/B le 07/09/2026 sur ce dépôt** : `babel-preset-expo` remplace
// `process.env.EXPO_PUBLIC_X` par sa valeur littérale, mais **pas** quand l'accès est écrit
// directement comme valeur d'une propriété d'objet dont la clé porte ce même nom.
//
//   { EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL }
//     → dans le bundle : EXPO_PUBLIC_SUPABASE_URL:void 0
//
//   const url = process.env.EXPO_PUBLIC_SUPABASE_URL;   //  ← la forme qui marche
//   { EXPO_PUBLIC_SUPABASE_URL: url }
//     → dans le bundle : EXPO_PUBLIC_SUPABASE_URL:"https://…"
//
// Rien ne le signale : le typecheck passe, les tests passent, l'export réussit, et l'app
// démarre — sur une configuration vide. Autrement dit elle affiche « Configuration
// manquante » à tout le monde, y compris avec un `.env` parfaitement rempli. Même famille
// que `cleanUrls` et les titres de page : un défaut qui ne se voit que dans ce qui sort.
//
// Lancé en CI après `expo export`, cf. .github/workflows/ci.yml.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const VARIABLES = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

const dossierJs = join(DIST, '_expo/static/js/web');
let bundles;
try {
  bundles = readdirSync(dossierJs).filter((nom) => nom.endsWith('.js'));
} catch {
  console.error(`Aucun bundle dans ${dossierJs} — l'export a-t-il tourné ?`);
  process.exit(1);
}

if (bundles.length === 0) {
  console.error(`Aucun bundle dans ${dossierJs} — l'export a-t-il tourné ?`);
  process.exit(1);
}

const code = bundles.map((nom) => readFileSync(join(dossierJs, nom), 'utf8')).join('\n');

const absentes = VARIABLES.filter((variable) => {
  const valeur = process.env[variable];
  if (!valeur) {
    console.error(
      `${variable} n'est pas définie dans l'environnement de ce script : impossible de vérifier ` +
        `qu'elle a été inlinée. Renseigne-la comme pour l'export lui-même.`
    );
    process.exit(1);
  }
  // On cherche la valeur, pas le nom : c'est la valeur qui manque quand l'inlining échoue.
  return !code.includes(valeur);
});

if (absentes.length > 0) {
  console.error(
    `Ces variables ne sont pas inlinées dans le bundle exporté :\n` +
      absentes.map((v) => `  - ${v}`).join('\n') +
      `\n\nL'app démarrerait sur une configuration vide. Vérifie que chaque ` +
      `process.env.EXPO_PUBLIC_* est lu dans un \`const\` avant d'être utilisé, et jamais ` +
      `écrit directement comme valeur d'une propriété qui porte le même nom (cf. l'en-tête ` +
      `de ce script).`
  );
  process.exit(1);
}

console.log(`Variables inlinées dans le bundle : ${VARIABLES.join(', ')}.`);
