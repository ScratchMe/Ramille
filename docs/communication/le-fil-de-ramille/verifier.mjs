// Vérifie que rien ne déborde dans « Le fil de Ramille » : chaque quart de seconde, dans les deux
// formats, à la taille de l'export et à trois tailles de lecteur.
//
//   node docs/communication/le-fil-de-ramille/verifier.mjs
//
// Ce qu'il relève, sur les éléments entièrement visibles à cet instant :
//   - un texte qui sort de l'écran du téléphone, ou de la scène, à l'horizontale ;
//   - un texte qui sort de la scène par le haut ou le bas (hors du téléphone, que le 16:9 coupe
//     exprès par le bas) ;
//   - un texte plus large que sa boîte, ou coupé dans un bouton, une puce ou une étiquette ;
//   - deux blocs de la scène qui se chevauchent (hors du vol de la mascotte vers le téléphone).
//
// **Pourquoi plusieurs tailles, alors que le film se compose à taille fixe** : c'est justement ce
// qu'il éprouve. Le 03/10/2026, le 16:9 « débordait » chez la personne qui pilote : composé en
// unités relatives, ses petits textes passaient sous la taille minimale des polices du navigateur à
// la taille d'un lecteur, et grossissaient hors de leurs boîtes. Depuis que le film se compose à
// 1600 × 900 px et se met à l'échelle d'un bloc, les sept cas rendent le même résultat.
//
// Éprouvé le 03/10/2026, en cassant ce qu'il garde — trois mutations, chacune vue, le témoin à zéro :
//   - les titres de droite déplacés sur le téléphone en 16:9 → 6 chevauchements ;
//   - « Vendredi » en toutes lettres dans une puce de jour → « texte plus large que sa boîte » ;
//   - un libellé de bouton final trop long → « déborde à l'horizontale ».
// Un libellé long dans un bouton à hauteur fixe qui passe sur deux lignes, lui, tient : ce n'est
// pas un débordement, et le contrôle ne le relève pas.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const POLICES = path.join(ICI, '../../design/design-system/assets/fonts');
const GRAISSES = { 400: 'SplineSans_400Regular.ttf', 500: 'SplineSans_500Medium.ttf', 600: 'SplineSans_600SemiBold.ttf', 700: 'SplineSans_700Bold.ttf' };
const enveloppe = path.join(os.tmpdir(), 'le-fil-de-ramille-verif.html');
fs.writeFileSync(
  enveloppe,
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>${fs.readFileSync(path.join(ICI, 'film.html'), 'utf8')}</body></html>`
);
const faces = Object.entries(GRAISSES)
  .map(([g, f]) => `@font-face{font-family:"Spline Sans";font-weight:${g};src:url(https://fonts.gstatic.com/ramille/${f}) format("truetype")}`)
  .join('\n');

const CAS = [
  { nom: 'export 16:9', l: 1920, h: 1080, q: '?export=paysage' },
  { nom: 'export 9:16', l: 1080, h: 1920, q: '?export=portrait' },
  { nom: 'lecteur 1280, 16:9', l: 1280, h: 900, fmt: 'paysage' },
  { nom: 'lecteur 1280, 9:16', l: 1280, h: 900, fmt: 'portrait' },
  { nom: 'lecteur 760, 16:9', l: 760, h: 900, fmt: 'paysage' },
  { nom: 'téléphone 390, 16:9', l: 390, h: 844, fmt: 'paysage' },
  { nom: 'téléphone 390, 9:16', l: 390, h: 844, fmt: 'portrait' },
];

// Exécuté dans la page, à un instant donné : la liste des constats.
function constater(t) {
  window.__seek(t);
  const plateau = document.getElementById('plateau');
  const scene = document.getElementById('scene');
  const sr = scene.getBoundingClientRect();
  const opacite = (el) => {
    let o = 1;
    for (let n = el; n && n !== scene.parentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
      o *= parseFloat(cs.opacity);
    }
    return o;
  };
  const nom = (el) => el.id || `${el.closest('[id]')?.id} ${el.className} «${el.textContent.trim().slice(0, 24)}»`;
  const sortie = [];
  const textes = [...plateau.querySelectorAll('*')].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  for (const el of textes) {
    if (opacite(el) < 0.99) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    const ecran = el.closest('.tel-ecran');
    const cadre = (ecran || scene).getBoundingClientRect();
    if (r.left < cadre.left - 1 || r.right > cadre.right + 1) sortie.push(['déborde à l’horizontale', nom(el)]);
    if (!ecran && (r.top < sr.top - 1 || r.bottom > sr.bottom + 1)) sortie.push(['sort de la scène', nom(el)]);
    if (getComputedStyle(el).display !== 'inline' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) sortie.push(['texte plus large que sa boîte', nom(el)]);
    if (el.matches('.choix, .bouton, .puce, .pastille-bord, .cta, .etiq, .saison-etiq') && el.scrollHeight > el.clientHeight + 1) sortie.push(['texte coupé en hauteur', nom(el)]);
  }
  const blocs = [...plateau.children].filter((el) => el.matches('.x, #tel, #m-scene') && opacite(el) >= 0.99 && !(el.id === 'm-scene' && t > 28.4 && t < 30));
  const rects = blocs.map((el) => {
    if (el.id === 'tel' || el.id === 'm-scene') return el.getBoundingClientRect();
    const rs = [...el.querySelectorAll('*')].filter((e) => opacite(e) >= 0.99 && e.getBoundingClientRect().width).map((e) => e.getBoundingClientRect());
    if (!rs.length) return null;
    return { left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)), top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)) };
  });
  for (let i = 0; i < blocs.length; i++) {
    for (let j = i + 1; j < blocs.length; j++) {
      const a = rects[i], b = rects[j];
      if (!a || !b) continue;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) {
        sortie.push(['chevauchement', `${blocs[i].id || blocs[i].className} × ${blocs[j].id || blocs[j].className}`]);
      }
    }
  }
  return sortie;
}

const navigateur = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let total = 0;
for (const c of CAS) {
  const page = await navigateur.newPage({ viewport: { width: c.l, height: c.h } });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: faces }));
  await page.route('https://fonts.gstatic.com/ramille/**', (r) => {
    const f = path.join(POLICES, path.basename(new URL(r.request().url()).pathname));
    return fs.existsSync(f) ? r.fulfill({ contentType: 'font/ttf', body: fs.readFileSync(f) }) : r.abort();
  });
  await page.goto(`file://${enveloppe}${c.q ?? ''}`);
  await page.evaluate(() => window.__pret);
  if (c.fmt) await page.click(c.fmt === 'portrait' ? 'label:has(#f-portrait)' : 'label:has(#f-paysage)');
  const duree = await page.evaluate(() => window.__duree);
  const constats = new Map();
  for (let t = 0; t <= duree; t += 0.25) {
    for (const [type, qui] of await page.evaluate(constater, t)) {
      const cle = `${type} — ${qui}`;
      if (!constats.has(cle)) constats.set(cle, []);
      constats.get(cle).push(t);
    }
  }
  console.log(`${c.nom} : ${constats.size} constat(s)`);
  for (const [cle, ts] of constats) console.log(`  ${cle}  [${ts[0].toFixed(2)} → ${ts[ts.length - 1].toFixed(2)} s]`);
  total += constats.size;
  await page.close();
}
await navigateur.close();
process.exit(total ? 1 : 0);
