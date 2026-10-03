// La plus basse ligne peinte de chaque capture brute, pour régler `cfg.overrides.<Nom>.viewport` sur une mesure et
// non sur une estimation (NOTES.md, « Complétion du kit » et relevé du 03/10/2026). À lancer depuis la racine du
// dépôt, après un `package-build.mjs` complet aux cadres élargis (un changement de cadre ne passe pas par
// `preview-rebuild.mjs`, qui refuse en `[CONFIG_STALE]`) puis un `package-capture.mjs --components …` :
//
//   node .design-sync/mesurer-les-cadres.cjs ChampsDeContexte ContextStep
//
// Le cadre à écrire est la plus haute des mesures d'un composant, plus une marge d'une trentaine de pixels. Une
// mesure égale à la hauteur du cadre veut dire que le contenu touche le bord : élargir et remesurer.
const fs = require('fs');
const path = require('path');
const { PNG } = require(require.resolve('pngjs', { paths: [process.cwd()] }));

const noms = process.argv.slice(2);
if (noms.length === 0) {
  console.error('Usage : node .design-sync/mesurer-les-cadres.cjs <Composant> [<Composant>…]');
  process.exit(2);
}
const dossier = 'ds-bundle/_screenshots/review/raw';
for (const nom of noms) {
  const fichiers = fs.readdirSync(dossier).filter((f) => f.split('__')[1] === nom);
  if (fichiers.length === 0) {
    console.log(`${nom} : aucune capture brute — lancer package-capture.mjs --components ${nom}`);
    continue;
  }
  const lignes = fichiers.map((f) => {
    const png = PNG.sync.read(fs.readFileSync(path.join(dossier, f)));
    let bas = 0;
    for (let y = png.height - 1; y >= 0 && bas === 0; y--) {
      for (let x = 0; x < png.width; x++) {
        const i = (y * png.width + x) * 4;
        if (png.data[i] < 245 || png.data[i + 1] < 245 || png.data[i + 2] < 245) {
          bas = y + 1;
          break;
        }
      }
    }
    return { cellule: f.replace('.png', '').split('__')[2], bas, hauteur: png.height, largeur: png.width };
  });
  const max = Math.max(...lignes.map((l) => l.bas));
  console.log(`${nom} : contenu jusqu'à ${max} px (largeur ${lignes[0].largeur})`);
  for (const l of lignes) console.log(`  ${l.cellule} ${l.bas}/${l.hauteur}${l.bas >= l.hauteur ? '  ← touche le bord' : ''}`);
}
