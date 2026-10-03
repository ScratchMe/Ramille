// Rend chaque `preview.html` converti par `vers-la-galerie.mjs` comme le cadre de la galerie le fait — la feuille
// des jetons, `bundle.css`, le React du système et le bundle chargés avant le premier octet de l'aperçu — et
// relève trois choses (NOTES.md, « Le système de design de la galerie ») :
//   - les jetons manquants, sans rien rendre : chaque `var(--…)` que lisent le bundle, sa feuille et les aperçus
//     doit être déclaré par la feuille des jetons, par `bundle.css` ou par le code qui le pose en ligne — un
//     `var()` sans valeur ne lève rien, n'affiche rien, et efface en silence un contour ou une teinte ;
//   - les erreurs et les cellules en avertissement (« ⚠ »), relevées 2 s après le chargement : la séquence
//     d'`EcranLancement` dure 1,45 s ;
//   - toute requête, absolue ou relative : l'aperçu est servi depuis une origine factice, d'où rien ne doit partir.
//
//   node .design-sync/verifier-la-galerie.cjs --projet <dossier>/project \
//     --react <react.production.min.js> --react-dom <react-dom.production.min.js> [--jetons-servis <tokens.css>]
//
// `--react` et `--react-dom` sont les fichiers que l'index du système désigne (`libraries`), relus en ligne : le
// React de `ds-bundle/_vendor/` est un React 19 de développement, la galerie charge un React 18.3.1 de production.
// Sans `--jetons-servis`, la feuille est compilée ici depuis `tokens.json`, à gros grain et en thème clair ; avec,
// c'est le `tokens.css` que la page sert, relu en ligne — celui que les aperçus reçoivent vraiment, qui ne se
// régénère qu'à la prochaine modification faite dans la page.
//
// Le premier passage, le 03/10/2026, a rendu 72 échecs sur 72 : l'injection passait par `String.replace` avec une
// chaîne de remplacement, et les `$&` du React de développement (`ds-bundle/_vendor/react.js`) y étaient
// interprétés. D'où la fonction de remplacement plus bas — un rendu qui échoue partout accuse d'abord le banc.
//
// **Éprouvé en le cassant, le 03/10/2026**, une mutation à la fois, chacune attrapée seule :
//   - un aperçu dont le module lève (`Chip`) ; une image distante glissée dans un autre (`Button`) ;
//   - une image et un `fetch` relatifs (`Chip`), qui partaient de `about:blank` sans être vus avant l'origine factice ;
//   - une erreur levée à 1 s (`TextLink`), perdue tant que le relevé se faisait à 400 ms ;
//   - la feuille servie du 16/09 sans le repli de `bundle.css` : les cinq jetons qui lui manquent, nommés.
const fs = require('fs');
const path = require('path');
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd()] }));

const arg = (nom) => {
  const i = process.argv.indexOf(`--${nom}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const RACINE = arg('projet');
const REACT = arg('react');
const REACT_DOM = arg('react-dom');
const SERVIS = arg('jetons-servis');
if (!RACINE || !REACT || !REACT_DOM) {
  console.error(
    'Usage : node .design-sync/verifier-la-galerie.cjs --projet <dossier>/project --react <fichier> --react-dom <fichier> [--jetons-servis <tokens.css>]'
  );
  process.exit(2);
}
const lis = (p) => fs.readFileSync(p, 'utf8');

function compilerLesJetons() {
  const jetons = JSON.parse(lis(path.join(RACINE, 'tokens.json')));
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
  return css + '}';
}
// Les `@font-face` de la feuille servie pointent vers `fonts/…`, relatif à la feuille : le cadre les résout, pas
// cette page. Ils partent, la police tombe sur sa pile de repli, et le relevé des requêtes reste juste.
const feuilleDesJetons = SERVIS ? lis(SERVIS).replace(/@font-face\s*\{[^}]*\}/g, '') : compilerLesJetons();
const feuilleDuBundle = lis(path.join(RACINE, 'components/bundle.css'));
const bundle = lis(path.join(RACINE, 'components/bundle.js'));
const composants = fs
  .readdirSync(path.join(RACINE, 'components'))
  .filter((d) => fs.existsSync(path.join(RACINE, 'components', d, 'preview.html')))
  .sort();
const apercus = Object.fromEntries(composants.map((n) => [n, lis(path.join(RACINE, 'components', n, 'preview.html'))]));

// 1. Les jetons : lus d'un côté, déclarés de l'autre.
const lus = (texte) => [...texte.matchAll(/var\(\s*--([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
const declares = (texte) => [...texte.matchAll(/(?:^|[;{\s])--([A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]);
const posesEnLigne = (texte) => [...texte.matchAll(/["']--([A-Za-z0-9_-]+)["']\s*[:,]/g)].map((m) => m[1]);
const connus = new Set([
  ...declares(feuilleDesJetons),
  ...declares(feuilleDuBundle),
  ...posesEnLigne(bundle),
  ...Object.values(apercus).flatMap(posesEnLigne),
]);
// Un nom qui finit par un tiret est un préfixe composé à l'exécution (`"var(--color-" + enKebab(type) + ")"` dans
// `ThemedView`) : il ne se vérifie pas ici, il se nomme.
const manquants = new Map();
const composes = new Set();
for (const [ou, texte] of [['components/bundle.js', bundle], ['components/bundle.css', feuilleDuBundle], ...Object.entries(apercus)]) {
  for (const nom of lus(texte)) {
    if (nom.endsWith('-')) composes.add(`--${nom}… (${ou})`);
    else if (!connus.has(nom)) manquants.set(nom, [...(manquants.get(nom) ?? []), ou]);
  }
}

const prealable =
  `<style>${feuilleDesJetons}${feuilleDuBundle}</style>` +
  [REACT, REACT_DOM].map((f) => `<script>${lis(f)}</script>`).join('') +
  `<script>${bundle}</script>`;

(async () => {
  const navigateur = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const fautifs = [];
  for (const nom of composants) {
    const brut = apercus[nom];
    const largeur = /width=(\d+)/.exec(brut.split('\n')[0]);
    const page = await navigateur.newPage({ viewport: { width: largeur ? Number(largeur[1]) : 900, height: 700 } });
    const adresse = `https://galerie.invalid/project/components/${nom}/preview.html`;
    const erreurs = [];
    await page.route('**/*', (route) => {
      if (route.request().url() === adresse) {
        return route.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: brut.replace('<meta charset="utf-8">', () => `<meta charset="utf-8">${prealable}`),
        });
      }
      erreurs.push(`requête ${route.request().url()}`);
      return route.abort();
    });
    page.on('pageerror', (e) => erreurs.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/net::ERR_FAILED/.test(m.text()) && erreurs.push(m.text()));
    await page.goto(adresse, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    const etat = await page.evaluate(() => ({
      avertissements: document.body.innerText.match(/⚠[^\n]*/g) ?? [],
      cellules: document.querySelectorAll('.ds-cell, .ds-single').length,
    }));
    if (erreurs.length || etat.avertissements.length || etat.cellules === 0) fautifs.push({ nom, ...etat, erreurs });
    await page.close();
  }
  await navigateur.close();
  console.log(`${composants.length} aperçus rendus, ${fautifs.length} en défaut ; ${manquants.size} jeton(s) lu(s) sans déclaration`);
  for (const f of fautifs) console.log(JSON.stringify(f));
  if (composes.size) console.log(`non vérifiés, composés à l'exécution : ${[...composes].join(' ; ')}`);
  for (const [jeton, ou] of manquants) console.log(`jeton manquant --${jeton} : lu par ${[...new Set(ou)].slice(0, 4).join(', ')}`);
  process.exit(fautifs.length || manquants.size ? 1 : 0);
})();
