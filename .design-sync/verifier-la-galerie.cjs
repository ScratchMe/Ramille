// Rend chaque `preview.html` converti par `vers-la-galerie.mjs` comme le cadre de la galerie le fait — jetons,
// feuille, React et bundle chargés avant le premier octet de l'aperçu — et relève les erreurs, les cellules en
// avertissement (« ⚠ ») et toute requête sortante (NOTES.md, « Le système de design de la galerie »). Les jetons
// sont compilés ici à gros grain, thème clair seul : de quoi voir qu'un aperçu se monte, pas de quoi juger un rendu.
//
//   node .design-sync/verifier-la-galerie.cjs <dossier>/project ds-bundle/_vendor
//
// Le premier passage, le 03/10/2026, a rendu 72 échecs sur 72 : l'injection passait par `String.replace` avec une
// chaîne de remplacement, et les `$&` du bundle minifié y étaient interprétés. D'où la fonction de remplacement
// plus bas — un rendu qui échoue partout accuse d'abord le banc.
//
// **Éprouvé en le cassant, le 03/10/2026**, une mutation à la fois : un aperçu dont le module lève (`Chip`) → lui
// seul en défaut ; une image distante glissée dans un autre (`Button`) → lui seul, par sa requête.
const fs = require('fs');
const path = require('path');
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd()] }));

const [, , RACINE, VENDOR] = process.argv;
if (!RACINE || !VENDOR) {
  console.error('Usage : node .design-sync/verifier-la-galerie.cjs <dossier>/project ds-bundle/_vendor');
  process.exit(2);
}
const jetons = JSON.parse(fs.readFileSync(path.join(RACINE, 'tokens.json'), 'utf8'));
const clair = (v) => (typeof v === 'string' ? v : v.light);
const couleur = (v) => {
  const alias = /^\{(.+)\}$/.exec(clair(v));
  return alias ? `var(--${alias[1]})` : clair(v);
};
let css = ':root{' + jetons.color.tokens.map((t) => `--${t.name}:${couleur(t.value)};`).join('');
for (const famille of Object.keys(jetons)) {
  if (['color', 'shadow', 'type', 'meta'].includes(famille) || !jetons[famille]?.tokens) continue;
  css += jetons[famille].tokens.map((t) => `--${t.name}:${t.value};`).join('');
}
css += (jetons.shadow?.tokens ?? []).map((t) => `--${t.name}:${clair(t.value)};`).join('');
for (const [cle, pile] of Object.entries(jetons.type.families)) css += `--font-${cle}:${pile};`;
css += '}' + fs.readFileSync(path.join(RACINE, 'components/bundle.css'), 'utf8');
const prealable =
  `<style>${css}</style>` +
  ['react.js', 'react-dom.js'].map((f) => `<script>${fs.readFileSync(path.join(VENDOR, f), 'utf8')}</script>`).join('') +
  `<script>${fs.readFileSync(path.join(RACINE, 'components/bundle.js'), 'utf8')}</script>`;

(async () => {
  const navigateur = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const composants = fs
    .readdirSync(path.join(RACINE, 'components'))
    .filter((d) => fs.existsSync(path.join(RACINE, 'components', d, 'preview.html')))
    .sort();
  const fautifs = [];
  for (const nom of composants) {
    const brut = fs.readFileSync(path.join(RACINE, 'components', nom, 'preview.html'), 'utf8');
    const largeur = /width=(\d+)/.exec(brut.split('\n')[0]);
    const page = await navigateur.newPage({ viewport: { width: largeur ? Number(largeur[1]) : 900, height: 700 } });
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(e.message));
    page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
    page.on('request', (r) => !/^(data|about):/.test(r.url()) && erreurs.push(`requête ${r.url()}`));
    await page.setContent(brut.replace('<meta charset="utf-8">', () => `<meta charset="utf-8">${prealable}`), { waitUntil: 'load' });
    // `LigneDAttente` se tait ses 300 premières millisecondes, et c'est voulu.
    await page.waitForTimeout(400);
    const etat = await page.evaluate(() => ({
      avertissements: document.body.innerText.match(/⚠[^\n]*/g) ?? [],
      cellules: document.querySelectorAll('.ds-cell, .ds-single').length,
    }));
    if (erreurs.length || etat.avertissements.length || etat.cellules === 0) fautifs.push({ nom, ...etat, erreurs });
    await page.close();
  }
  await navigateur.close();
  console.log(`${composants.length} aperçus rendus, ${fautifs.length} en défaut`);
  for (const f of fautifs) console.log(JSON.stringify(f));
  process.exit(fautifs.length ? 1 : 0);
})();
