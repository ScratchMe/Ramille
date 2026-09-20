// Une feuille de style n'est pas un module JavaScript.
//
// `src/constants/theme.ts` importe `@/global.css` pour NativeWind, et jest ne sait pas lire du
// CSS : sans cette doublure, **tout** test qui remonte jusqu'aux constantes de thème échoue au
// chargement — c'est-à-dire tout test d'écran, puisque le moindre composant en dépend. Relevé le
// 20/09/2026 en montant le premier (`v1-27` §12.11), et c'est le genre de frottement qui ne se
// voit pas tant qu'on ne teste que de la logique pure.
module.exports = {};
