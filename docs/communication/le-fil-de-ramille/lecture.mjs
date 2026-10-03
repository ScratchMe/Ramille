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
// suit.
//
// Ce qu'elle relève, en lecture réelle (lecture automatique autorisée), 15 s depuis le début :
//   - **telle quelle, puis avec une latence simulée** — un son qui démarre 400 ms après `play()`
//     et que chaque saut laisse muet 300 ms : le son ne saute pas (aucun `seeking`), il avance, et
//     l'image reste à moins de 0,3 s de lui ;
//   - **avec un son 3 % plus rapide** : l'image doit le suivre. Sans cet écart, l'horloge de la page
//     et celle du son partent ensemble et ne se séparent pas en 15 s — le contrôle ne pouvait pas
//     tomber (contre-lecture du 03/10/2026) ;
// et aussi :
//   - **la fluidité**, sur 6 s du chapitre le plus chargé (le vol de la mascotte, le questionnaire,
//     les appuis), aux trois formats : 60 images par seconde en moyenne, et presque aucune image de
//     plus de 25 ms ;
//   - **le bouton du son** : coupé, la musique s'arrête et le bouton le dit ; remis, elle repart à
//     moins de 0,3 s de l'image ;
//   - **« réduire les animations »** : un chapitre s'ouvre posé et y reste ; sans la préférence, il
//     se joue — jugé sur 2 s, parce que l'image attend que le son ait démarré.
// La machine compte : une machine très chargée peut faire tomber la fluidité, ou retarder le son au
// point de faire tomber le dernier contrôle, sans que le film y soit pour rien. Relancer avant de
// conclure. Et la fluidité mesurée ici est celle de cette machine : elle voit une image lourde, pas
// l'absence d'une optimisation qu'une machine rapide absorbe.
//
// Éprouvé le 03/10/2026, en cassant ce qu'il garde (`FILM=<copie faussée>`) — neuf mutations, une
// par contrôle, chacune vue, le témoin à zéro et aucun dossier temporaire laissé :
//   - la boucle de 46b5993 remise (l'image sur l'horloge de la page, le son recalé au-delà de
//     0,15 s) → « le son saute », 47 sauts en 15 s avec la latence simulée — le défaut entendu ;
//     sans latence, aucun : c'est bien le retard d'un vrai son qui le déclenchait ;
//   - le démarrage qui lit aussi `networkState` → « le son ne joue pas » aux trois passages et
//     « le bouton du son est désactivé » : il vaut « aucune source » le temps que le chargement
//     démarre, et coupait le son à chaque ouverture ;
//   - l'image qui ne passe jamais sur l'horloge du son → « l'image ne suit pas le son », 0,37 s
//     d'écart avec le son plus rapide ;
//   - une image qui coûte 30 ms → « lecture saccadée » aux deux formats d'alors (31,6 ms par image). Retirer
//     le cache d'écriture, lui, ne la fait pas tomber sur cette machine : la garde voit une image
//     lourde, pas une optimisation qu'une machine rapide absorbe ;
//   - le bouton qui ne met plus le son en pause → « le bouton ne coupe pas le son » ;
//   - le bouton qui ne relance plus le son → « le son ne repart pas avec l'image » ;
//   - un chapitre qui se joue sous « réduire les animations » → « le chapitre se joue » ;
//   - un chapitre qui ne se lance plus sans la préférence → « le chapitre ne se joue pas » (et le
//     bouton du son, qui suppose une lecture en cours, le dit aussi) ;
//   - une exception lancée par la page → « erreur de la page », à chaque ouverture.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const FILM = process.env.FILM ?? path.join(ICI, 'film.html');
const POLICES = path.join(ICI, '../../design/design-system/assets/fonts');
const GRAISSES = { 400: 'SplineSans_400Regular.ttf', 500: 'SplineSans_500Medium.ttf', 600: 'SplineSans_600SemiBold.ttf', 700: 'SplineSans_700Bold.ttf' };
const faces = Object.entries(GRAISSES)
  .map(([g, f]) => `@font-face{font-family:"Spline Sans";font-weight:${g};src:url(https://fonts.gstatic.com/ramille/${f}) format("truetype")}`)
  .join('\n');

// Le son et l'image, lus dans le même aller-retour : deux lectures séparées ajoutaient leur délai à l'écart.
const sonEtImage = (page) => page.evaluate(() => ({
  sauts: window.__sauts ?? 0,
  son: document.getElementById('musique').currentTime,
  joue: !document.getElementById('musique').paused,
  image: parseFloat(document.getElementById('frise').value) / 10,
}));

const constats = [];
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'fil-lecture-'));
let navigateur;
try {
  const enveloppe = path.join(dossier, 'film.html');
  fs.writeFileSync(
    enveloppe,
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>${fs.readFileSync(FILM, 'utf8')}</body></html>`
  );
  fs.copyFileSync(path.join(ICI, 'musique.mp3'), path.join(dossier, 'musique.mp3'));
  navigateur = await chromium.launch({
    ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const ouvrir = async (options = {}) => {
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
  };

  // 1. Le son ne saute pas, il avance, et l'image le suit — tel quel, avec une latence simulée, et
  //    avec un son plus rapide que l'horloge de la page.
  for (const cas of ['sans latence', 'avec latence simulée', 'son 3 % plus rapide']) {
    const page = await ouvrir();
    if (cas === 'avec latence simulée') {
      await page.evaluate(() => {
        const P = HTMLMediaElement.prototype, jouer = P.play, desc = Object.getOwnPropertyDescriptor(P, 'currentTime');
        P.play = function () { const el = this; return new Promise((ok) => setTimeout(() => ok(jouer.call(el)), 400)); };
        Object.defineProperty(P, 'currentTime', {
          get() { return desc.get.call(this); },
          set(v) { const el = this, joue = !el.paused; desc.set.call(el, v); if (joue) { P.pause.call(el); setTimeout(() => jouer.call(el), 300); } },
        });
      });
    }
    if (cas === 'son 3 % plus rapide') await page.evaluate(() => { document.getElementById('musique').playbackRate = 1.03; });
    await page.evaluate(() => { const a = document.getElementById('musique'); window.__sauts = 0; a.addEventListener('seeking', () => window.__sauts++); });
    await page.click('#lecture');
    await page.waitForTimeout(15000);
    const r = await sonEtImage(page);
    const ecart = Math.abs(r.son - r.image);
    // Le son se juge à ce qu'il a avancé : un saut le laisse un instant à l'arrêt, sans qu'il soit muet.
    if (r.sauts) constats.push(`le son saute, ${cas} — ${r.sauts} saut(s) en 15 s`);
    if (r.son < 13) constats.push(`le son ne joue pas, ${cas} — ${r.son.toFixed(2)} s au bout de 15 s`);
    else if (ecart > 0.3) constats.push(`l'image ne suit pas le son, ${cas} — ${ecart.toFixed(2)} s d'écart`);
    console.log(`lecture ${cas} : ${r.sauts} saut(s), son à ${r.son.toFixed(2)} s, écart ${ecart.toFixed(2)} s`);
    await page.close();
  }

  // 2. La fluidité, sur le chapitre le plus chargé ; 3. le bouton du son.
  for (const format of ['paysage', 'portrait', 'quatre-cinq']) {
    const page = await ouvrir();
    await page.click(`label:has(#f-${format})`);
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
      const remis = await sonEtImage(page);
      const ecart = Math.abs(remis.son - remis.image);
      if (!remis.joue || ecart > 0.3) constats.push(`le son ne repart pas avec l'image en ${format} — ${remis.joue ? `${ecart.toFixed(2)} s d'écart` : 'arrêté'}`);
    }
    await page.close();
  }

  // 4. « Réduire les animations » : un chapitre s'ouvre posé et y reste ; sans la préférence, il se joue.
  for (const reduit of [true, false]) {
    const page = await ouvrir({ reducedMotion: reduit ? 'reduce' : 'no-preference' });
    await page.click('.chap >> nth=4');
    const a = (await sonEtImage(page)).image;
    await page.waitForTimeout(2000);
    const b = (await sonEtImage(page)).image;
    if (reduit && b !== a) constats.push(`« réduire les animations » : le chapitre se joue (${a} → ${b} s)`);
    if (!reduit && b - a < 0.8) constats.push(`sans préférence, le chapitre ne se joue pas (${a} → ${b} s)`);
    await page.close();
  }
} finally {
  // Même quand une étape échoue en route : le navigateur se ferme, et le MP3 copié ne reste pas.
  await navigateur?.close();
  fs.rmSync(dossier, { recursive: true, force: true });
}
console.log(constats.length ? `${constats.length} constat(s) :\n  ${constats.join('\n  ')}` : '0 constat.');
process.exit(constats.length ? 1 : 0);
