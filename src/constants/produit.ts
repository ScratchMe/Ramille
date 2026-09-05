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
