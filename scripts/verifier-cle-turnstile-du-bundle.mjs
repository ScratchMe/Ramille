// Refuse un déploiement de production dont le bundle web ne porte pas la clé de site Turnstile.
//
// **Le trou que ce script bouche** (contre-lecture du captcha, 04/10/2026). Le captcha ne protège rien
// tant qu'il n'est pas activé dans Supabase ; une fois activé, Supabase exige un jeton pour chaque
// session anonyme neuve. Le web n'en demande un que si `EXPO_PUBLIC_TURNSTILE_SITE_KEY` est dans son
// bundle (`src/lib/captcha.ts`) : une variable retirée du projet Vercel, ou lue d'une façon qu'Expo ne
// remplace pas (le piège décrit en tête de `verifier-configuration-export.mjs`), et chaque nouveau
// visiteur web serait refusé — **sans bruit**, aucune garde de la CI ne le voyant : la CI n'a pas de
// clé de site, exprès.
//
// Le seul endroit où la vraie valeur existe est le build Vercel : ce script y tourne, après l'export
// (`vercel-build` dans `package.json`). Un build en échec laisse le déploiement précédent en ligne.
//
// **Il ne bloque qu'un build de production** (`VERCEL_ENV=production`), comme
// `verifier-origine-supabase-de-la-csp.mjs`, et pour la même raison : ailleurs — un export de CI, la
// mesure hors ligne de `VERCEL.md` §1.2 —, il dit ce qu'il voit et laisse passer.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const cle = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY?.trim();
const production = process.env.VERCEL_ENV === 'production';
const mode = production
  ? 'build de production, contrôle bloquant'
  : `VERCEL_ENV=${process.env.VERCEL_ENV ?? '(absente)'}, contrôle non bloquant`;

function bundlePorteLaCle(cleDeSite) {
  const dossier = join(dist, '_expo', 'static', 'js', 'web');
  let fichiers;
  try {
    fichiers = readdirSync(dossier).filter((nom) => nom.endsWith('.js'));
  } catch {
    return false;
  }
  return fichiers.some((nom) => readFileSync(join(dossier, nom), 'utf8').includes(cleDeSite));
}

let probleme = null;
if (!cle) {
  probleme =
    'EXPO_PUBLIC_TURNSTILE_SITE_KEY est absente de ce build : le web ne demanderait aucun jeton au captcha,' +
    ' et une fois le captcha activé dans Supabase, chaque nouveau visiteur serait refusé.';
} else if (!bundlePorteLaCle(cle)) {
  probleme =
    `La clé de site Turnstile est posée, mais le bundle web de « ${dist} » ne la porte pas : elle n'a pas été` +
    ' remplacée dans le code (`process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY` doit être lu dans un `const`).';
}

if (!probleme) {
  console.log(`Captcha : le bundle web porte la clé de site Turnstile (${mode}).`);
  process.exit(0);
}

const suite = ' Registre d’exploitation §3.11.';
if (production) {
  console.error(`${probleme}${suite} (${mode})`);
  process.exit(1);
}
console.warn(`${probleme}${suite} (${mode} — ce build n'est jamais servi.)`);
