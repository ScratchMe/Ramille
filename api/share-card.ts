// Vercel Function (détectée automatiquement par la plateforme via le dossier /api à la
// racine du repo, indépendamment de `vercel.json` (framework: null, outputDirectory: dist)
// qui ne régit que l'export statique Expo — les deux coexistent sans se gêner). Génère la
// carte-image du bilan carbone à la volée, servie en <img>/og:image par api/partage.ts.
// Tsconfig dédié (api/tsconfig.json, exclu du tsconfig racine) : ce fichier tourne dans un
// runtime Web Fetch API (Request/Response) + Node.js (fs, process.cwd()), pas dans le
// contexte React Native de l'app.
//
// Satori (mise en page + rendu SVG) + @resvg/resvg-wasm (rasterisation SVG → PNG) en direct,
// plutôt que le paquet @vercel/og qui les enveloppe habituellement — celui-ci s'est révélé
// inutilisable ici après une longue séance de diagnostic sur de vrais déploiements preview :
//   - runtime Edge : le bundle de @vercel/og (Satori + resvg.wasm + yoga.wasm + police par
//     défaut, ~2,4 Mo non compressés) dépasse la limite de taille des Edge Functions du plan
//     Hobby de ce projet (confirmé par bisection : sans @vercel/og, le déploiement passe).
//   - runtime Node.js : @vercel/og 1.0.2 plante au premier appel (FUNCTION_INVOCATION_FAILED
//     réel sur Vercel ; reproduit en local — "Dynamic require of \"fs\" is not supported" dans
//     le loader WASM de harfbuzzjs). La version 0.8.6 (antérieure à cette dépendance) fonctionne
//     en local mais plante malgré tout sur le vrai déploiement Vercel (FUNCTION_INVOCATION_FAILED
//     confirmé sur un déploiement frais, cache MISS) — cause la plus probable : le tracing de
//     fichiers de la Function Node.js (@vercel/nft) ne détecte pas les assets WASM/police que
//     @vercel/og charge en interne via un mécanisme non statiquement analysable.
//
// Ici, la police et le binaire WASM de resvg sont chargés nous-mêmes via `fs.readFileSync` sur
// un chemin littéral (`path.join(process.cwd(), ...)`) — le pattern documenté par Vercel pour
// garantir qu'un asset est bien tracé et inclus dans le bundle d'une Function Node.js (cf.
// "Load Local Image with Node.js fs.readFile" / exemple WASM, vercel.com/docs/og-image-generation
// et vercel.com/docs/functions/runtimes/wasm). Police : Spline Sans (SemiBold/Bold), déjà celle
// de l'app (`@expo-google-fonts/spline-sans`) — copiée dans api/fonts/ plutôt qu'importée depuis
// node_modules, pour ne pas dépendre de la structure interne du paquet.
//
// Paramètres (query string) : `total` (tonnes CO2e/an, ex. "4.2"), `poste` (libellé du poste
// dominant, déjà en français depuis la restitution — cf. bilan/resultat.tsx). Les deux sont
// optionnels côté rendu (valeurs de repli) : ce endpoint ne doit jamais planter sur une URL
// mal formée, y compris construite par un tiers.
import fs from 'node:fs';
import path from 'node:path';
import { createElement as h } from 'react';
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

const ACCENT = '#1F6F4A';
const ACCENT_TEXT = '#14563A';
const BACKGROUND = '#E4EFE8';
const BLUSH = '#A9C8B6';
const INK = '#131612';
const TEXT_SECONDARY = '#39403B';

const fontSemiBold = fs.readFileSync(path.join(process.cwd(), 'api/fonts/SplineSans-SemiBold.ttf'));
const fontBold = fs.readFileSync(path.join(process.cwd(), 'api/fonts/SplineSans-Bold.ttf'));

// initWasm plante si appelée deux fois sur le même processus (cold start réutilisé entre
// invocations) — mémoïsée pour n'initialiser qu'une fois par instance de la Function.
let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    const wasmBinary = fs.readFileSync(path.join(process.cwd(), 'node_modules/@resvg/resvg-wasm/index_bg.wasm'));
    wasmReady = initWasm(wasmBinary);
  }
  return wasmReady;
}

// Feuille + nervure + visage "calm" — reprend exactement assets/images/mascot-mark.svg
// (cf. src/components/mascot.tsx). Dupliqué ici plutôt qu'importé : ce fichier tourne hors
// du bundle Expo, aucun accès à assets/ à la construction.
function mascot() {
  return h(
    'svg',
    { width: '140', height: '140', viewBox: '0 0 100 100' },
    h('path', { d: 'M50,8 C78,26 84,56 50,92 C16,56 22,26 50,8 Z', fill: ACCENT }),
    h('path', {
      d: 'M50,18 C46,26 46,32 50,38',
      stroke: BACKGROUND,
      strokeWidth: 4,
      strokeLinecap: 'round',
      fill: 'none',
      opacity: 0.55,
    }),
    h('circle', { cx: 33, cy: 60, r: 5, fill: BLUSH, opacity: 0.55 }),
    h('circle', { cx: 67, cy: 60, r: 5, fill: BLUSH, opacity: 0.55 }),
    h('circle', { cx: 39, cy: 50, r: 4.2, fill: INK }),
    h('circle', { cx: 61, cy: 50, r: 4.2, fill: INK }),
    h('path', { d: 'M42,62 Q50,68 58,62', stroke: INK, strokeWidth: 3.2, strokeLinecap: 'round', fill: 'none' })
  );
}

function formatTonnes(raw: string | null): string {
  const n = raw ? Number.parseFloat(raw) : NaN;
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(1).replace('.', ',');
}

export default async function handler(request: Request): Promise<Response> {
  await ensureWasm();

  const { searchParams } = new URL(request.url);
  const total = formatTonnes(searchParams.get('total'));
  const poste = (searchParams.get('poste') ?? '').slice(0, 120);

  const element = h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BACKGROUND,
        fontFamily: 'Spline Sans',
      },
    },
    mascot(),
    h(
      'div',
      { style: { display: 'flex', fontSize: 30, fontWeight: 600, color: ACCENT_TEXT, marginTop: 28 } },
      'Mon empreinte transport'
    ),
    h(
      'div',
      { style: { display: 'flex', fontSize: 104, fontWeight: 700, color: INK, marginTop: 12 } },
      `${total} t CO₂e / an`
    ),
    poste
      ? h('div', { style: { display: 'flex', fontSize: 34, color: TEXT_SECONDARY, marginTop: 20 } }, poste)
      : null,
    h(
      'div',
      { style: { display: 'flex', fontSize: 26, color: TEXT_SECONDARY, marginTop: 56 } },
      'TraceVerte · fais ton bilan en 5 minutes'
    )
  );

  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Spline Sans', data: fontSemiBold, weight: 600, style: 'normal' },
      { name: 'Spline Sans', data: fontBold, weight: 700, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const png = resvg.render().asPng();

  // Buffer.from(png) plutôt que le Uint8Array renvoyé tel quel : les libs DOM + Node chargées
  // ensemble (cf. api/tsconfig.json) font diverger le type générique de Uint8Array de celui
  // attendu par `BodyInit` — Buffer (sous-classe concrète) satisfait les deux.
  return new Response(Buffer.from(png), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, immutable, no-transform, max-age=31536000',
    },
  });
}
