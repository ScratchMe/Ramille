/**
 * Nom du produit, en un seul endroit.
 *
 * L'app s'est appelée TraceVerte jusqu'au 05/09/2026. Le nom était déjà porté par une
 * entreprise alsacienne de vélo et de mobilité douce, active depuis 25 ans sur
 * traceverte.com — même mot, secteur voisin, même public national : le cumul qui fonde une
 * action en concurrence déloyale, marque déposée ou non. Ramille (petite branche, terme
 * botanique) est aussi le nom de la mascotte : le produit et le personnage ne font qu'un,
 * décision du même jour. Détail et vérifications en docs/architecture/v1-09.
 *
 * Trois choses ne suivent PAS ce renommage, à dessein :
 *   - les clés AsyncStorage (`traceverte.bilan_draft.v1`…) — invisibles, et les renommer
 *     effacerait le brouillon de quiconque en a un ;
 *   - les migrations SQL déjà appliquées — on ne réécrit pas l'historique ;
 *   - le projet Supabase distant, toujours nommé `TraceVerte-v1` dans son tableau de bord.
 *
 * `api/` (Vercel Functions, tsconfig séparé) et les SVG d'assets répètent le nom en
 * littéral plutôt que d'importer d'ici : un import de `src/` depuis une Function échoue en
 * silence (cf. CLAUDE.md, checklist des Functions) — c'est le seul endroit où ce nom est
 * dupliqué, et il faut le changer à la main si celui-ci change.
 */
export const APP_NAME = 'Ramille';

/**
 * Origine canonique du site, en dur et en un seul endroit.
 *
 * `www` et non l'apex : c'est le domaine canonique côté Vercel, l'apex redirige en 308 vers
 * lui. En dur parce que c'est un **fait statique** — le domaine ne dépend ni de la plateforme,
 * ni de l'origine réelle de la page — et c'est exactement ce qui rend possible un `og:url`
 * identique au rendu serveur et au rendu client (cf. `src/components/titre-de-page.tsx` : une
 * valeur dérivée de `window.location.origin` aurait introduit un écart d'hydratation sur
 * toutes les pages).
 *
 * Elle était écrite quatre fois — `src/lib/app-url.ts`, `public/robots.txt`,
 * `public/sitemap.xml`, et son seul hôte dans `app.json` pour les liens d'application — sans
 * constante commune : un changement de domaine aurait laissé un sitemap et un robots.txt
 * désignant l'ancien, en silence. Les deux fichiers de `public/` sont statiques et ne peuvent pas
 * importer d'ici (même raison qu'`api/`), mais `scripts/verifier-titres-export.mjs` lit cette
 * constante par motif et refuse un export où l'un des deux — ou l'`og:url` d'une page publique —
 * désigne une autre origine.
 */
export const ORIGINE_CANONIQUE = 'https://www.ramille.fr';
