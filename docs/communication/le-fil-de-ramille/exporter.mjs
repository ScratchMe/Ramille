// Exporte « Le fil de Ramille » en vidéo, image par image.
//
//   node docs/communication/le-fil-de-ramille/exporter.mjs paysage      # 16:9, 1920 × 1080
//   node docs/communication/le-fil-de-ramille/exporter.mjs portrait     # 9:16, 1080 × 1920
//   node docs/communication/le-fil-de-ramille/exporter.mjs quatre-cinq  # 4:5, 1080 × 1350
//
// Il faut `ffmpeg` dans le PATH. `CHROMIUM=/chemin/vers/chrome` remplace le navigateur de Playwright.
//
// **Spline Sans vient du dépôt, pas du réseau.** La page publiée la charge depuis Google Fonts ;
// ici, ces requêtes sont servies par les fichiers du kit (`docs/design/design-system/assets/fonts/`).
// Sans cela, un export hors ligne tombait en silence sur la police du système — vu le 03/10/2026
// dans un conteneur sans accès à Google Fonts. L'export refuse donc de partir si l'une des quatre
// graisses n'est pas chargée. La chasse fixe (Spline Sans Mono) n'est pas dans le dépôt : à l'export,
// les trois lignes qui l'emploient — les deux sources et la légende du téléphone — prennent celle du
// système, réseau ou pas.
// Éprouvé le 03/10/2026 : le dossier des polices faussé → refus, code 1, aucune vidéo écrite ; remis
// en place → l'image à 17,6 s est identique à celle de la page.
//
// Le film est une fonction pure du temps : `?export=<format>` affiche la scène seule, plein cadre,
// et `window.__seek(t)` en rend l'image à l'instant t. Rien ne dépend de l'horloge, donc une image
// exportée est celle que la page montre au même instant, à la chasse fixe près.
//
// La vidéo s'écrit dans le dossier temporaire du système, jamais dans le dépôt : elle se régénère.
// La musique (`musique.mp3`, rendue par `musique.py`) y est mêlée telle quelle, depuis l'instant 0.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const POLICES = path.join(ICI, '../../design/design-system/assets/fonts');
const GRAISSES = { 400: 'SplineSans_400Regular.ttf', 500: 'SplineSans_500Medium.ttf', 600: 'SplineSans_600SemiBold.ttf', 700: 'SplineSans_700Bold.ttf' };
const FORMATS = {
  paysage: { taille: [1920, 1080], nom: '16x9' },
  portrait: { taille: [1080, 1920], nom: '9x16' },
  'quatre-cinq': { taille: [1080, 1350], nom: '4x5' },
};
const format = FORMATS[process.argv[2]] ? process.argv[2] : 'paysage';
const fps = Number(process.argv[3] ?? 30);
const [largeur, hauteur] = FORMATS[format].taille;
const sortie = path.join(os.tmpdir(), `le-fil-de-ramille-${FORMATS[format].nom}.mp4`);

// La page publiée est un fragment : le service d'artefacts l'enveloppe. On fait de même ici.
const fragment = fs.readFileSync(path.join(ICI, 'film.html'), 'utf8');
const enveloppe = path.join(os.tmpdir(), 'le-fil-de-ramille.html');
fs.writeFileSync(
  enveloppe,
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>${fragment}</body></html>`
);

const navigateur = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1 });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(String(e)));
const faces = Object.entries(GRAISSES)
  .map(([graisse, f]) => `@font-face{font-family:"Spline Sans";font-weight:${graisse};src:url(https://fonts.gstatic.com/ramille/${f}) format("truetype")}`)
  .join('\n');
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: faces }));
await page.route('https://fonts.gstatic.com/ramille/**', (r) => {
  const f = path.join(POLICES, path.basename(new URL(r.request().url()).pathname));
  return fs.existsSync(f) ? r.fulfill({ contentType: 'font/ttf', body: fs.readFileSync(f) }) : r.abort();
});
await page.goto(`file://${enveloppe}?export=${format}`);
await page.evaluate(() => window.__pret);
// `document.fonts.check` répond « oui » quand aucune face ne correspond : on demande chaque graisse,
// puis on compte celles qui sont réellement chargées.
const chargees = await page.evaluate(async (graisses) => {
  await Promise.all(graisses.map((g) => document.fonts.load(`${g} 16px "Spline Sans"`)));
  return new Set([...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'Spline Sans' && f.status === 'loaded').map((f) => f.weight)).size;
}, Object.keys(GRAISSES));
if (chargees < Object.keys(GRAISSES).length) {
  console.error(`Spline Sans : ${chargees} graisse(s) chargée(s) sur ${Object.keys(GRAISSES).length}. L’export serait en partie dans la police du système.`);
  await navigateur.close();
  process.exit(1);
}

const duree = await page.evaluate(() => window.__duree);
const total = Math.round(duree * fps) + fps; // une seconde de tenue sur la dernière image
const musique = path.join(ICI, 'musique.mp3');
if (!fs.existsSync(musique)) {
  console.error('musique.mp3 manque : la rendre d’abord avec musique.py.');
  await navigateur.close();
  process.exit(1);
}
const ffmpeg = spawn(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', musique,
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart', sortie],
  { stdio: ['pipe', 'inherit', 'inherit'] }
);
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.__seek(t), Math.min(duree, i / fps));
  const image = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ffmpeg.stdin.write(image)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
}
ffmpeg.stdin.end();
const code = await new Promise((r) => ffmpeg.on('close', r));
await navigateur.close();

if (erreurs.length || code !== 0) {
  console.error(`Échec de l'export (ffmpeg : ${code}).\n${erreurs.join('\n')}`);
  process.exit(1);
}
console.log(`${sortie} — ${total} images à ${fps} i/s.`);
