// Vercel Edge Function (détectée automatiquement par la plateforme via le dossier /api à la
// racine du repo, indépendamment de `vercel.json` (framework: null, outputDirectory: dist)
// qui ne régit que l'export statique Expo — les deux coexistent sans se gêner). Génère la
// carte-image du bilan carbone à la volée (Satori/@vercel/og), servie en <img>/og:image par
// api/partage.ts. Tsconfig dédié (api/tsconfig.json, exclu du tsconfig racine) : ce fichier
// tourne dans le runtime Edge (Web Fetch API), pas dans le contexte React Native de l'app.
//
// Écrit sans JSX (`React.createElement` via l'alias `h`) et en `.ts` plutôt que `.tsx` :
// contrairement à `api/partage.ts` (HTML brut), ce fichier construit un arbre d'éléments React
// consommé par `ImageResponse`. En zero-config (pas de framework Next.js pour fournir la
// transformation JSX au build des Edge Functions), une syntaxe JSX n'est pas garantie d'être
// transpilée par le bundler de Vercel — `createElement` est du JS pur, aucune transformation
// requise.
//
// Paramètres (query string) : `total` (tonnes CO2e/an, ex. "4.2"), `poste` (libellé du poste
// dominant, déjà en français depuis la restitution — cf. bilan/resultat.tsx). Les deux sont
// optionnels côté rendu (valeurs de repli) : ce endpoint ne doit jamais planter sur une URL
// mal formée, y compris construite par un tiers.
import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';

export const config = { runtime: 'edge' };

const ACCENT = '#1F6F4A';
const ACCENT_TEXT = '#14563A';
const BACKGROUND = '#E4EFE8';
const BLUSH = '#A9C8B6';
const INK = '#131612';
const TEXT_SECONDARY = '#39403B';

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

export default function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const total = formatTonnes(searchParams.get('total'));
  const poste = (searchParams.get('poste') ?? '').slice(0, 120);

  return new ImageResponse(
    h(
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
          fontFamily: 'sans-serif',
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
    ),
    { width: 1200, height: 630 }
  );
}
