// Régénère assets/images/favicon.png depuis assets/images/favicon-mark.svg.
//
// Sans ce script, le SVG serait « source de vérité » en commentaire seulement : le PNG est
// ce qu'Expo lit, et rien ne garantirait qu'il descend encore du dessin d'à côté.
//
//   node scripts/rendre-favicon.mjs
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
