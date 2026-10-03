// Joue « Le fil de Ramille » pour de vrai, en musique, et vérifie ce que la lecture image par image
// ne voit pas : le son qui saute, l'image qui ne le suit pas, la fluidité, le bouton du son et
// « réduire les animations ».
//
//   node docs/communication/le-fil-de-ramille/lecture.mjs
//
// `CHROMIUM=/chemin/vers/chrome` remplace le navigateur de Playwright, et `FILM=<copie>` joue une
// autre version du film (le MP3 du dossier l'accompagne), comme pour `verifier.mjs`.
//
// **Pourquoi une garde à part** : `verifier.mjs` et l'export choisissent un instant et rendent son
// image. Ici, c'est l'horloge qui tourne. Le 03/10/2026, la personne qui pilote entendait le son
// sauter à peu près chaque seconde. La page recalait le son dès qu'il s'écartait de 0,15 s de
// l'image. Or un vrai navigateur fait démarrer le son quelques centaines de millisecondes après
// `play()` : chaque recalage creusait l'écart suivant. Depuis, le son donne l'horloge et l'image le
// suit. Rien d'autre que cette lecture ne le vérifie.
//
// Ce qu'elle relève, en lecture réelle (lecture automatique autorisée) :
//   - **15 s depuis le début, deux fois** : telle quelle, puis avec un son qui démarre 400 ms après
//     `play()` et que chaque saut laisse muet 300 ms. Le son ne saute pas (aucun `seeking`), il
//     joue et avance, et l'image reste à moins de 0,3 s de lui ;
//   - **la fluidité**, sur 6 s du chapitre le plus chargé (le vol de la mascotte, le questionnaire,
//     les appuis), aux deux formats : 60 images par seconde en moyenne, et presque aucune image de
//     plus de 25 ms ;
//   - **le bouton du son** : coupé, la musique s'arrête et le bouton le dit ; remis, elle repart à
//     moins de 0,3 s de l'image ;
//   - **« réduire les animations »** : un chapitre s'ouvre posé et y reste ; sans la préférence, il
//     se joue.
// La machine compte : une machine très chargée peut faire tomber la fluidité sans que le film y soit
// pour rien. Relancer avant de conclure.
//
// Éprouvé le 03/10/2026, en cassant ce qu'il garde (`FILM=<copie faussée>`) — chaque mutation vue,
// le témoin à zéro :
//   - la boucle de 46b5993 remise (l'image sur l'horloge de la page, le son recalé au-delà de
//     0,15 s) → « le son saute », 47 sauts en 15 s avec la latence simulée — le défaut entendu ;
//     sans latence, aucun : c'est bien la latence d'un vrai navigateur qui le déclenchait ;
//   - le démarrage qui lit aussi `networkState` → « le son ne joue pas » et « le bouton du son est
//     désactivé » : il vaut « aucune source » le temps que le chargement démarre, et coupait le son à
//     chaque ouverture.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const FILM = process.env.FILM ?? path.join(ICI, 'film.html');
const POLICES = path.join(ICI, '../../design/design-system/assets/fonts');
const GRAISSES = { 400: 'SplineSans_400Regular.ttf', 500: 'SplineSans_500Medium.ttf', 600: 'SplineSans_600SemiBold.ttf', 700: 'SplineSans_700Bold.ttf' };
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'fil-lecture-'));
const enveloppe = path.join(dossier, 'film.html');
fs.writeFileSync(
  enveloppe,
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>${fs.readFileSync(FILM, 'utf8')}</body></html>`
);
fs.copyFileSync(path.join(ICI, 'musique.mp3'), path.join(dossier, 'musique.mp3'));
const faces = Object.entries(GRAISSES)
  .map(([g, f]) => `@font-face{font-family:"Spline Sans";font-weight:${g};src:url(https://fonts.gstatic.com/ramille/${f}) format("truetype")}`)
  .join('\n');

const navigateur = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const constats = [];
async function ouvrir(options = {}) {
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 }, ...options });
  page.on('pageerror', (e) => constats.push(`erreur de la page — ${e}`));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: faces }));
  await page.route('https://fonts.gstatic.com/ramille/**', (r) => {
    const f = path.join(POLICES, path.basename(new URL(r.request().url()).pathname));
    return fs.existsSync(f) ? r.fulfill({ contentType: 'font/ttf', body: fs.readFileSync(f) }) : r.abort();
  });
  await page.goto(`file://${enveloppe}`);
  await page.evaluate(() => window.__pret);
  return page;
}
const image = (page) => page.evaluate(() => parseFloat(document.getElementById('frise').value) / 10);

// 1. Le son ne saute pas, il joue, et l'image le suit — tel quel, puis avec la latence d'un vrai navigateur.
for (const latence of [false, true]) {
  const nom = latence ? 'avec latence' : 'sans latence';
  const page = await ouvrir();
  if (latence) {
    await page.evaluate(() => {
      const P = HTMLMediaElement.prototype, jouer = P.play, desc = Object.getOwnPropertyDescriptor(P, 'currentTime');
      P.play = function () { const el = this; return new Promise((ok) => setTimeout(() => ok(jouer.call(el)), 400)); };
      Object.defineProperty(P, 'currentTime', {
        get() { return desc.get.call(this); },
        set(v) { const el = this, joue = !el.paused; desc.set.call(el, v); if (joue) { P.pause.call(el); setTimeout(() => jouer.call(el), 300); } },
      });
    });
  }
  await page.evaluate(() => { const a = document.getElementById('musique'); window.__sauts = 0; a.addEventListener('seeking', () => window.__sauts++); });
  await page.click('#lecture');
  await page.waitForTimeout(15000);
  // Le son se juge à ce qu'il a avancé : un saut le laisse un instant à l'arrêt, sans qu'il soit muet.
  const r = await page.evaluate(() => ({ sauts: window.__sauts, son: document.getElementById('musique').currentTime }));
  const ecart = Math.abs(r.son - (await image(page)));
  if (r.sauts) constats.push(`le son saute, ${nom} — ${r.sauts} saut(s) en 15 s`);
  if (r.son < 13) constats.push(`le son ne joue pas, ${nom} — ${r.son.toFixed(2)} s au bout de 15 s`);
  else if (ecart > 0.3) constats.push(`l'image ne suit pas le son, ${nom} — ${ecart.toFixed(2)} s d'écart`);
  console.log(`lecture ${nom} : ${r.sauts} saut(s), son à ${r.son.toFixed(2)} s, écart ${ecart.toFixed(2)} s`);
  await page.close();
}

// 2. La fluidité, sur le chapitre le plus chargé ; 3. le bouton du son.
for (const format of ['paysage', 'portrait']) {
  const page = await ouvrir();
  await page.click(format === 'portrait' ? 'label:has(#f-portrait)' : 'label:has(#f-paysage)');
  await page.click('.chap >> nth=3');
  await page.evaluate(() => {
    window.__images = [];
    let d = performance.now();
    const f = (n) => { window.__images.push(n - d); d = n; if (window.__images.length < 400) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await page.waitForTimeout(6000);
  const im = (await page.evaluate(() => window.__images)).slice(5);
  const moyenne = im.reduce((s, x) => s + x, 0) / im.length, lentes = im.filter((x) => x > 25).length;
  if (moyenne > 17.5 || lentes > im.length * 0.02) constats.push(`lecture saccadée en ${format} — ${moyenne.toFixed(1)} ms par image, ${lentes} image(s) lente(s) sur ${im.length}`);
  console.log(`fluidité ${format} : ${moyenne.toFixed(1)} ms par image, ${lentes} lente(s) sur ${im.length}`);

  if (await page.isDisabled('#son')) {
    constats.push(`le bouton du son est désactivé en ${format} — « ${await page.textContent('#son-libelle')} »`);
  } else {
    await page.click('#son');
    const coupe = await page.evaluate(() => ({ arrete: document.getElementById('musique').paused, libelle: document.getElementById('son-libelle').textContent }));
    if (!coupe.arrete || coupe.libelle !== 'Son coupé') constats.push(`le bouton ne coupe pas le son en ${format} — ${JSON.stringify(coupe)}`);
    await page.click('#son');
    await page.waitForTimeout(600);
    const remis = await page.evaluate(() => ({ joue: !document.getElementById('musique').paused, son: document.getElementById('musique').currentTime }));
    const ecart = Math.abs(remis.son - (await image(page)));
    if (!remis.joue || ecart > 0.3) constats.push(`le son ne repart pas avec l'image en ${format} — ${remis.joue ? `${ecart.toFixed(2)} s d'écart` : 'arrêté'}`);
  }
  await page.close();
}

// 4. « Réduire les animations » : un chapitre s'ouvre posé et y reste ; sans la préférence, il se joue.
for (const reduit of [true, false]) {
  const page = await ouvrir({ reducedMotion: reduit ? 'reduce' : 'no-preference' });
  await page.click('.chap >> nth=4');
  const a = await image(page);
  await page.waitForTimeout(1200);
  const b = await image(page);
  if (reduit && b !== a) constats.push(`« réduire les animations » : le chapitre se joue (${a} → ${b} s)`);
  if (!reduit && b - a < 0.8) constats.push(`sans préférence, le chapitre ne se joue pas (${a} → ${b} s)`);
  await page.close();
}

await navigateur.close();
fs.rmSync(dossier, { recursive: true, force: true });
console.log(constats.length ? `${constats.length} constat(s) :\n  ${constats.join('\n  ')}` : '0 constat.');
process.exit(constats.length ? 1 : 0);
