// Refuse un déploiement de production dont le projet Supabase n'est pas celui que la CSP autorise.
//
// **Le trou que ce script bouche** (contre-lecture du 02/10/2026). La `Content-Security-Policy` de
// `vercel.json` est appliquée, et son `connect-src` nomme **un** projet Supabase, écrit en dur. L'app,
// elle, parle au projet que porte `EXPO_PUBLIC_SUPABASE_URL`, une variable du projet Vercel. Si les
// deux divergent — un changement de projet, un domaine personnalisé, une coquille —, chaque requête
// de l'app web est bloquée par le navigateur : l'app entière est morte, et **aucune garde de la CI ne
// le voit**, parce qu'elles servent la politique avec l'origine de leur propre export
// (`servir-export.mjs`), donc par construction jamais avec celle de la production.
//
// Le seul endroit où la vraie valeur existe est le build Vercel : ce script y tourne, juste après
// l'export (`vercel-build` dans `package.json`). Un build en échec laisse le déploiement précédent en
// ligne — c'est exactement ce qu'on veut, plutôt qu'un site mort.
//
// **Il ne bloque qu'un build de production** (`VERCEL_ENV=production`, posé par Vercel). Ailleurs —
// un export de CI, la mesure hors ligne de `VERCEL.md` §1.2 construite avec l'URL factice —, il dit
// l'écart et laisse passer : ces builds ne sont jamais servis.
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
const politique = (config.headers ?? [])
  .flatMap((regle) => regle.headers)
  .find(({ key }) => key.toLowerCase() === 'content-security-policy')?.value;

if (!politique) {
  console.log('vercel.json ne pose pas de CSP appliquée : rien à comparer.');
  process.exit(0);
}

const connectSrc =
  politique
    .split(';')
    .map((directive) => directive.trim().split(/\s+/))
    .find(([nom]) => nom === 'connect-src')
    ?.slice(1) ?? [];

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
let origine = null;
try {
  origine = url ? new URL(url).origin : null;
} catch {
  origine = null;
}

const production = process.env.VERCEL_ENV === 'production';

// Le mode est dit dans les deux sorties : c'est en lisant le journal d'un build de production qu'on
// sait si le contrôle y est armé — `VERCEL_ENV` n'y est posé que si le projet expose ses variables
// système, un réglage du tableau de bord que rien d'autre ne montre.
const mode = production ? 'build de production, contrôle bloquant' : `VERCEL_ENV=${process.env.VERCEL_ENV ?? '(absente)'}, contrôle non bloquant`;

if (origine && connectSrc.includes(origine)) {
  console.log(`CSP : connect-src autorise ${origine}, l'origine Supabase de ce build (${mode}).`);
  process.exit(0);
}

const message =
  `La CSP de vercel.json n'autorise pas ${origine ?? `« ${url ?? '(EXPO_PUBLIC_SUPABASE_URL absente)'} »`},` +
  ` l'origine Supabase de ce build (connect-src : ${connectSrc.join(' ') || '(vide)'}).` +
  ' Déployé, chaque requête de l’app web serait bloquée par le navigateur. Mettre connect-src et' +
  ' EXPO_PUBLIC_SUPABASE_URL d’accord (VERCEL.md §2.2).';

if (production) {
  console.error(message);
  process.exit(1);
}
console.warn(`Avertissement (${mode}) — ${message}`);
