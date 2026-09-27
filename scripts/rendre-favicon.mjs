// Régénère assets/images/favicon.png depuis assets/images/favicon-mark.svg.
//
//   node scripts/rendre-favicon.mjs
//
// **Un générateur qu'on relance à la main, et rien ne vérifie qu'on l'a fait** — décision du
// 27/09/2026 (`docs/architecture/v1-27-dette-technique.md` §3). Cet en-tête promettait que le
// script garantissait la filiation du PNG ; aucune CI ne le lançait, donc la promesse ne tenait à
// rien. Un contrôle qui re-rendrait le SVG à chaque PR rougirait à la première montée de
// `@resvg/resvg-wasm` (sa sortie n'est pas garantie stable d'une version à l'autre) pour un
// dessin qui change une fois par an : il coûterait plus que ce qu'il garde.
//
// Donc : **qui touche au SVG relance ce script dans la même PR**, et c'est la relecture qui le
// voit. Le PNG versionné était identique octet pour octet au rendu du SVG le 27/09/2026 (resvg
// 2.6.2). Pour le revérifier : relancer ce script, puis `git status` — un PNG qui descend encore
// du SVG ne laisse aucune modification derrière lui.
//
// Expo tire ensuite favicon.ico (16, 32 et 48 px) de ce PNG au moment de `expo export` —
// c'est ce .ico qu'il faut regarder pour juger, pas le SVG rendu directement : le
// rééchantillonnage d'Expo depuis 512 px est meilleur qu'un rendu natif à 16 px.
//
// resvg est déjà une dépendance du produit (rendu de la carte de partage, api/share-card.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const SOURCE = new URL('../assets/images/favicon-mark.svg', import.meta.url);
const SORTIE = new URL('../assets/images/favicon.png', import.meta.url);
const TAILLE = 512;

await initWasm(readFileSync(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url)));

const resvg = new Resvg(readFileSync(SOURCE, 'utf8'), {
  fitTo: { mode: 'width', value: TAILLE },
});
writeFileSync(SORTIE, resvg.render().asPng());

console.log(`favicon.png régénéré en ${TAILLE}×${TAILLE} depuis favicon-mark.svg.`);
