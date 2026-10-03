// Vérifie « Le fil de Ramille » : rien ne déborde, tout se lit, et l'image ne dépend que du temps.
//
//   node docs/communication/le-fil-de-ramille/verifier.mjs
//
// `CHROMIUM=/chemin/vers/chrome` remplace le navigateur de Playwright, comme pour l'export.
//
// **Chaque quart de seconde, dans les deux formats, à la taille de l'export et à trois tailles de
// lecteur (cinq cas)**, sur les éléments entièrement visibles à cet instant :
//   - un texte qui sort de l'écran du téléphone, ou de la scène, à l'horizontale ;
//   - un texte qui sort de la scène par le haut ou le bas (hors du téléphone, que le 16:9 coupe
//     exprès par le bas) ;
//   - un texte plus large que sa boîte, ou coupé dans un bouton, une puce ou une étiquette ;
//   - deux blocs de la scène qui se chevauchent (hors du vol de la mascotte vers le téléphone),
//     étiquettes des arrêts et des saisons comprises, et une étiquette posée sur le trait,
//     épaisseur comprise ;
//   - ce que le téléphone doit montrer en entier et que le cadre coupe, avec la marge que le film
//     promet dessous : le bas de la restitution une fois défilée (12 dp), le choix des jours une
//     fois déplié (16 dp) ;
//   - un appui que le cadre coupe, ou un doigt qui tombe à côté de sa cible.
//
// **Aux deux formats de l'export, en plus** :
//   - **le temps de lire, par pas de 0,05 s** : chaque texte de la scène, chaque réplique de
//     Ramille et la notification restent entièrement visibles — opaques, dans le cadre, sous aucun
//     aplat — au moins 2,5 s, et un texte qui ne l'est jamais sort à 0,00 s. Un titre se lit quand
//     son dernier mot est posé : c'est le plus court de ses mots qui compte. Les autres textes de
//     l'écran du téléphone se montrent au rythme d'un geste, et ne sont pas mesurés ;
//   - **le doigt immobile**, à 60 images par seconde autour de chaque appui : tant qu'on le voit,
//     il ne bouge pas de plus de 2 px d'une image à l'autre sur l'écran du téléphone. Il suivait sa
//     cible quand elle s'envolait ;
//   - **la pureté** : l'image d'un instant ne dépend que de cet instant. Une passe dans l'ordre,
//     puis un aller-retour par l'autre format, puis une passe dans le désordre : chaque image doit
//     être identique à celle de la première passe. La version du 03/10/2026 mesurait le défilement
//     du plan au premier passage, et l'épaisseur du trait échappait au cache d'écriture : selon
//     l'ordre des sauts, le même instant rendait trois images différentes.
//
// **Pourquoi plusieurs tailles, alors que le film se compose à taille fixe** : c'est justement ce
// qu'il éprouve. Le 03/10/2026, le 16:9 débordait chez la personne qui pilote : composé en unités
// relatives, il se recomposait à chaque taille de lecteur, et à très petite taille sa mise en page
// ne suivait plus la proportion — les textes du téléphone sortaient de leurs boîtes (14 et 19
// constats à 760 et 390 px). Ce n'était pas la taille minimale des polices, comme on l'a d'abord
// écrit : Chromium y calcule les plus petits à 5,3 et 2,6 px, sans plancher. Depuis que le film se
// compose à 1600 × 900 px et se met à l'échelle d'un bloc, les sept cas rendent le même résultat.
//
// Éprouvé le 03/10/2026, en cassant ce qu'il garde (`FILM=<copie faussée>`) — chaque mutation vue,
// le témoin à zéro. Tous les contrôles, sauf le relais des erreurs de la page :
//   - les titres de droite déplacés sur le téléphone en 16:9 → 6 chevauchements ;
//   - les titres d'ouverture du 16:9 descendus à 45 % → « chevauchement » avec l'étiquette
//     « Au travail » ;
//   - « Vendredi » en toutes lettres dans une puce de jour → « texte plus large que sa boîte » ;
//   - un libellé de bouton final trop long → « déborde à l'horizontale » ;
//   - la source du 16:9 descendue à 99 % → « sort de la scène » (à 97 %, elle tient encore) ;
//   - « Non, pas cette semaine ni la précédente » dans le bouton du point → « texte coupé en
//     hauteur », aux sept cas ;
//   - le texte du manifeste qui sort à 67,6 s → « moins de 2,5 s pour lire » sur ses deux dernières
//     lignes, aux deux formats ;
//   - « Et les tiens, ils pèsent combien ? » réduit à 0,1 s → « moins de 2,5 s pour lire : 0,00 s » ;
//   - le téléphone du 16:9 gardé à sa taille pendant le questionnaire → « appui hors cadre » sur
//     « Suivant », aux quatre cas 16:9 ;
//   - le doigt décalé de 60 dp → « doigt à côté de sa cible », sur les douze cibles (à 40 dp, la
//     notification, haute de 100 dp, le gardait encore) ;
//   - l'appui de la notification, puis celui de « C'est noté », remis à 0,1 et 0,15 s de leur
//     coupe → « doigt qui bouge pendant son appui », à 53,07 s et à 44,87 s ;
//   - la restitution qui ne défile plus → « coupé par le cadre » sur son bas, en 16:9 ;
//   - le plan qui ne défile plus au choix des jours → « coupé par le cadre » sur le choix, aux quatre
//     cas 16:9 (sans la marge promise, il ne dépassait que de 0,67 px et passait) ;
//   - les saisons du 9:16 toutes nommées dessous → « étiquette sur le trait » sur « Printemps » ;
//   - `montrer()` qui n'écrit plus la transformation d'un élément caché → « dépend de l'ordre des
//     sauts » et « aller-retour de format » ;
//   - une écriture directe dans `preparer()`, hors du cache → « aller-retour de format ».
// L'épaisseur du trait écrite en direct, le défaut d'origine, ne se reproduit plus : les rendus de
// référence de `mesurer()` remettent le cache d'accord. C'est la dernière mutation qui garde la famille.
// Un libellé long dans un bouton à hauteur fixe qui passe sur deux lignes, lui, tient : ce n'est
// pas un débordement, et le contrôle ne le relève pas.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const FILM = process.env.FILM ?? path.join(ICI, 'film.html');
const POLICES = path.join(ICI, '../../design/design-system/assets/fonts');
const GRAISSES = { 400: 'SplineSans_400Regular.ttf', 500: 'SplineSans_500Medium.ttf', 600: 'SplineSans_600SemiBold.ttf', 700: 'SplineSans_700Bold.ttf' };
const LIRE = 2.5;
const enveloppe = path.join(os.tmpdir(), 'le-fil-de-ramille-verif.html');
fs.writeFileSync(
  enveloppe,
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>${fs.readFileSync(FILM, 'utf8')}</body></html>`
);
const faces = Object.entries(GRAISSES)
  .map(([g, f]) => `@font-face{font-family:"Spline Sans";font-weight:${g};src:url(https://fonts.gstatic.com/ramille/${f}) format("truetype")}`)
  .join('\n');

const CAS = [
  { nom: 'export 16:9', l: 1920, h: 1080, q: '?export=paysage', export: true },
  { nom: 'export 9:16', l: 1080, h: 1920, q: '?export=portrait', export: true },
  { nom: 'lecteur 1280, 16:9', l: 1280, h: 900, fmt: 'paysage' },
  { nom: 'lecteur 1280, 9:16', l: 1280, h: 900, fmt: 'portrait' },
  { nom: 'lecteur 760, 16:9', l: 760, h: 900, fmt: 'paysage' },
  { nom: 'téléphone 390, 16:9', l: 390, h: 844, fmt: 'paysage' },
  { nom: 'téléphone 390, 9:16', l: 390, h: 844, fmt: 'portrait' },
];

// Exécuté dans la page avant toute mesure : les aides que les trois contrôles partagent.
function installer() {
  const scene = document.getElementById('scene');
  window.__opacite = (el) => {
    let o = 1;
    for (let n = el; n && n !== scene.parentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
      o *= parseFloat(cs.opacity);
    }
    return o;
  };
  window.__nom = (el) => el.id || `${el.closest('[id]')?.id} ${el.className} «${el.textContent.trim().slice(0, 24)}»`;
  window.__textes = () => [...document.getElementById('plateau').querySelectorAll('*')].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
}

// Exécuté dans la page, à un instant donné : la liste des constats.
function constater(t) {
  window.__seek(t);
  const T = window.__T;
  const plateau = document.getElementById('plateau');
  const scene = document.getElementById('scene');
  const sr = scene.getBoundingClientRect();
  const opacite = window.__opacite, nom = window.__nom;
  const dedans = (r, c, marge = 1) => r.left >= c.left - marge && r.right <= c.right + marge && r.top >= c.top - marge && r.bottom <= c.bottom + marge;
  const sortie = [];
  for (const el of window.__textes()) {
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

  // Les blocs de la scène, étiquettes comprises : leur boîte est celle de leurs enfants visibles.
  const etiquettes = [...plateau.querySelectorAll('#arrets-etiq > .x, #saisons-etiq > .x')];
  const blocs = [...plateau.children, ...etiquettes].filter((el) => el.matches('.x, #tel, #m-scene') && opacite(el) >= 0.99 && !(el.id === 'm-scene' && t > T.vol[0] - 0.1 && t < T.vol[1] + 0.2));
  const boite = (el) => {
    if (el.id === 'tel' || el.id === 'm-scene') return el.getBoundingClientRect();
    const rs = [...el.querySelectorAll('*')].filter((e) => opacite(e) >= 0.99 && e.getBoundingClientRect().width).map((e) => e.getBoundingClientRect());
    if (!rs.length) return null;
    return { left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)), top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)) };
  };
  const rects = blocs.map(boite);
  const libelle = (el) => el.id || el.parentElement.id + ' «' + el.textContent.trim() + '»';
  for (let i = 0; i < blocs.length; i++) {
    for (let j = i + 1; j < blocs.length; j++) {
      const a = rects[i], b = rects[j];
      if (!a || !b) continue;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) {
        sortie.push(['chevauchement', `${libelle(blocs[i])} × ${libelle(blocs[j])}`]);
      }
    }
  }
  // Une étiquette se pose du côté où le trait ne passe pas.
  const fil = document.getElementById('fil');
  if (fil.getAttribute('d')) {
    const m = fil.getScreenCTM(), L = fil.getTotalLength(), pt = document.getElementById('fil-svg').createSVGPoint();
    const demi = (parseFloat(fil.getAttribute('stroke-width')) * m.a) / 2;
    const points = [];
    for (let l = 0; l <= L; l += 6) {
      const q = fil.getPointAtLength(l);
      pt.x = q.x; pt.y = q.y;
      points.push(pt.matrixTransform(m));
    }
    for (const el of etiquettes) {
      if (opacite(el) < 0.99) continue;
      const r = el.firstElementChild.getBoundingClientRect();
      if (points.some((q) => q.x > r.left - demi && q.x < r.right + demi && q.y > r.top - demi && q.y < r.bottom + demi)) sortie.push(['étiquette sur le trait', libelle(el)]);
    }
  }

  // Ce que le téléphone doit montrer en entier, une fois le geste fini, avec la marge que le film
  // promet sous chacun (en dp) : sans elle, « C'est noté » ne dépassait que de 0,67 px sans défilement.
  const dp = document.getElementById('tel-ecran').getBoundingClientRect().width / 360;
  const vus = [['bb3', T.defile[1], T.bilan[1], 12], ['c2-dep-dedans', T.depliage[1] + 0.15, T.repli[0], 16]];
  for (const [id, a, b, marge] of vus) {
    if (t < a || t >= b) continue;
    if (!dedans(document.getElementById(id).getBoundingClientRect(), sr, 1 - marge * dp)) sortie.push(['coupé par le cadre', id]);
  }
  // Un appui : sa cible dans le cadre, et le doigt dessus.
  const doigt = document.getElementById('doigt');
  const cible = doigt.getAttribute('data-cible');
  if (cible && opacite(doigt) > 0.5) {
    const rc = document.getElementById(cible).getBoundingClientRect(), rd = doigt.getBoundingClientRect();
    const ecr = document.getElementById('tel-ecran').getBoundingClientRect();
    if (!dedans(rc, sr) || !dedans(rc, ecr)) sortie.push(['appui hors cadre', cible]);
    const cx = rd.left + rd.width / 2, cy = rd.top + rd.height / 2;
    if (cx < rc.left - 2 || cx > rc.right + 2 || cy < rc.top - 2 || cy > rc.bottom + 2) sortie.push(['doigt à côté de sa cible', cible]);
  }
  return sortie;
}

// Exécuté dans la page : pour chaque texte qui se lit, le plus long temps où il reste entièrement
// visible, regroupé par bloc (l'identifiant le plus proche) en gardant le plus court de ses textes.
function lectures(pas) {
  const duree = window.__duree;
  const scene = document.getElementById('scene'), manif = document.getElementById('manif');
  const opacite = window.__opacite;
  const textes = window.__textes().filter((el) => !el.closest('#affiche') && (!el.closest('#tel') || el.closest('.rep .r, #notif')));
  const debut = new Map();
  // Chaque texte suivi part à zéro : un texte qui n'est jamais entièrement visible sort à 0,00 s.
  const plus = new Map(textes.map((el) => [el, 0]));
  const finir = (el, t) => {
    if (!debut.has(el)) return;
    plus.set(el, Math.max(plus.get(el) ?? 0, t - debut.get(el)));
    debut.delete(el);
  };
  for (let i = 0; i * pas <= duree + 1e-9; i++) {
    const t = Math.min(duree, i * pas);
    window.__seek(t);
    const sr = scene.getBoundingClientRect();
    const mr = opacite(manif) > 0 ? manif.getBoundingClientRect() : null;
    for (const el of textes) {
      let vu = opacite(el) >= 0.99;
      if (vu) {
        const r = el.getBoundingClientRect();
        vu = r.width > 0 && r.top >= sr.top - 1 && r.bottom <= sr.bottom + 1;
        if (vu && mr && !manif.contains(el)) vu = r.bottom <= mr.top || r.top >= mr.bottom;
      }
      if (vu && !debut.has(el)) debut.set(el, t);
      if (!vu) finir(el, t);
    }
  }
  // Ce qui est encore à l'écran à la fin y reste : la dernière image tient.
  for (const el of [...debut.keys()]) finir(el, Infinity);
  const blocs = new Map();
  for (const [el, d] of plus) {
    const id = el.closest('[id]').id;
    if (!blocs.has(id) || d < blocs.get(id).d) blocs.set(id, { d, texte: el.textContent.trim().slice(0, 32) });
  }
  return [...blocs].map(([id, x]) => [id, x.d, x.texte]);
}

// Exécuté dans la page : autour de chaque appui, à 60 images par seconde, le déplacement du doigt sur
// l'écran du téléphone (en px de l'écran, échelle du téléphone retirée) tant qu'on le voit. Il suivait
// sa cible quand elle s'envolait : la notification, la carte qui change de mise en page.
function doigtImmobile() {
  const doigt = document.getElementById('doigt'), ecr = document.getElementById('tel-ecran');
  const sortie = [];
  for (const a of window.__appuis) {
    let avant = null;
    for (let t = a - 0.3; t <= a + 0.3; t += 1 / 60) {
      window.__seek(t);
      const op = window.__opacite(doigt);
      if (op <= 0.05) { avant = null; continue; }
      const re = ecr.getBoundingClientRect(), rd = doigt.getBoundingClientRect(), k = ecr.offsetWidth / re.width;
      const ici = [(rd.left + rd.width / 2 - re.left) * k, (rd.top + rd.height / 2 - re.top) * k];
      if (avant && Math.hypot(ici[0] - avant[0], ici[1] - avant[1]) > 2) sortie.push([doigt.getAttribute('data-cible'), t]);
      avant = ici;
    }
  }
  return sortie;
}

// Exécuté dans la page : l'empreinte de l'image à chaque instant demandé, dans l'ordre donné.
function empreintes(temps) {
  const plateau = document.getElementById('plateau');
  return temps.map((t) => {
    window.__seek(t);
    const s = plateau.innerHTML;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  });
}
function changerDeFormat(fmt) {
  const r = document.getElementById(fmt === 'portrait' ? 'f-portrait' : 'f-paysage');
  r.checked = true;
  r.dispatchEvent(new Event('change'));
}

const navigateur = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let total = 0;
for (const c of CAS) {
  const page = await navigateur.newPage({ viewport: { width: c.l, height: c.h } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: faces }));
  await page.route('https://fonts.gstatic.com/ramille/**', (r) => {
    const f = path.join(POLICES, path.basename(new URL(r.request().url()).pathname));
    return fs.existsSync(f) ? r.fulfill({ contentType: 'font/ttf', body: fs.readFileSync(f) }) : r.abort();
  });
  await page.goto(`file://${enveloppe}${c.q ?? ''}`);
  await page.evaluate(() => window.__pret);
  if (c.fmt) await page.click(c.fmt === 'portrait' ? 'label:has(#f-portrait)' : 'label:has(#f-paysage)');
  await page.evaluate(installer);
  const duree = await page.evaluate(() => window.__duree);
  const constats = new Map();
  const noter = (cle, t) => {
    if (!constats.has(cle)) constats.set(cle, []);
    constats.get(cle).push(t);
  };
  for (let t = 0; t <= duree; t += 0.25) {
    for (const [type, qui] of await page.evaluate(constater, t)) noter(`${type} — ${qui}`, t);
  }
  if (c.export) {
    for (const [id, d, texte] of await page.evaluate(lectures, 0.05)) {
      if (d < LIRE) noter(`moins de ${LIRE} s pour lire — ${id} «${texte}» : ${d.toFixed(2)} s`, 0);
    }
    for (const [cible, t] of await page.evaluate(doigtImmobile)) noter(`doigt qui bouge pendant son appui — ${cible}`, t);
    const fmt = c.q.endsWith('portrait') ? 'portrait' : 'paysage';
    const temps = [];
    for (let t = 0; t <= duree; t += 0.5) temps.push(Math.round(t * 100) / 100);
    const reference = await page.evaluate(empreintes, temps);
    // L'aller-retour : un instant rendu dans un format, puis dans l'autre, puis de nouveau dans le premier.
    for (const t of [21.5, 45.0, 66.0]) {
      await page.evaluate(empreintes, [t]);
      await page.evaluate(changerDeFormat, fmt === 'portrait' ? 'paysage' : 'portrait');
      await page.evaluate(empreintes, [t]);
      await page.evaluate(changerDeFormat, fmt);
      const [e] = await page.evaluate(empreintes, [t]);
      if (e !== reference[temps.indexOf(t)]) noter('image changée par un aller-retour de format', t);
    }
    // Le désordre, tiré d'une graine fixe : le même à chaque passage.
    let graine = 342;
    const hasard = () => ((graine = Math.imul(graine ^ (graine >>> 15), 2246822507) + 0x6b43a9b5) >>> 0) / 4294967296;
    const ordre = temps.map((_, i) => i).sort(() => hasard() - 0.5);
    const desordre = await page.evaluate(empreintes, ordre.map((i) => temps[i]));
    ordre.forEach((i, k) => { if (desordre[k] !== reference[i]) noter('image qui dépend de l’ordre des sauts', temps[i]); });
  }
  for (const e of erreurs) noter(`erreur de la page — ${e}`, 0);
  console.log(`${c.nom} : ${constats.size} constat(s)`);
  for (const [cle, ts] of constats) console.log(`  ${cle}  [${ts[0].toFixed(2)} → ${ts[ts.length - 1].toFixed(2)} s]`);
  total += constats.size;
  await page.close();
}
await navigateur.close();
process.exit(total ? 1 : 0);
