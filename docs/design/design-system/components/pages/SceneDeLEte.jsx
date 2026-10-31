import React from 'react';
// Source : src/components/accueil/scene-de-l-ete.web.tsx — la scène de l'été, en tête de la page d'accueil du web
// (31/10/2026, `v1-36` §3 et §4). Une femme et un homme qui ont trop chaud, un soleil qui chauffe, une terre sèche :
// se souvenir de ce qu'on a vécu avant tout chiffre. Un dessin SVG du navigateur ; sur natif, le composant ne rend
// rien — la page n'existe que sur le web.
//
// Le mouvement se joue **une fois**, quand la scène paraît, et s'arrête de lui-même en un peu plus de trois secondes
// (sous les cinq de WCAG 2.2.2) : le soleil grandit, l'air tremble, elle s'évente, il s'éponge, la sueur perle, une
// goutte tombe. Chaque animation finit sur l'image posée. `etat` : `posee` sous « réduire les animations » — rien ne se
// lance —, `depart` tant que la scène n'a pas paru, `animee` une fois parue. Les couleurs sont celles du kit : l'encre,
// le papier, les deux verts doux et le seul ton chaud, `--color-mascot-warm` — ni rouge, ni orange.
const CSS = `
.se-halo, .se-rayons, .se-eventail, .se-vague, .se-goutte, .se-mouchoir { transform-box: fill-box; }
.se-halo, .se-rayons { transform-origin: 50% 50%; }
.se-eventail { transform-origin: 52% 100%; }
.se-goutte-tombe { opacity: 0; }
.scene-depart .se-halo { transform: scale(0.5); opacity: 0; }
.scene-depart .se-rayons { transform: rotate(-30deg) scale(0.7); opacity: 0; }
.scene-depart .se-vague, .scene-depart .se-goutte { opacity: 0; }
.scene-anime .se-halo { animation: se-halo 1400ms cubic-bezier(0.22, 1, 0.36, 1) 0ms 1 both; }
.scene-anime .se-rayons { animation: se-rayons 1400ms cubic-bezier(0.22, 1, 0.36, 1) 0ms 1 both; }
.scene-anime .se-vague-1 { animation: se-vague 1200ms cubic-bezier(0.22, 1, 0.36, 1) 500ms 1 both; }
.scene-anime .se-vague-2 { animation: se-vague 1200ms cubic-bezier(0.22, 1, 0.36, 1) 800ms 1 both; }
.scene-anime .se-vague-3 { animation: se-vague 1200ms cubic-bezier(0.22, 1, 0.36, 1) 1100ms 1 both; }
.scene-anime .se-eventail { animation: se-eventail 550ms ease-in-out 600ms 4 both; }
.scene-anime .se-mouchoir { animation: se-mouchoir 500ms ease-in-out 1000ms 3 both; }
.scene-anime .se-goutte-1 { animation: se-goutte 500ms cubic-bezier(0.22, 1, 0.36, 1) 1300ms 1 both; }
.scene-anime .se-goutte-2 { animation: se-goutte 500ms cubic-bezier(0.22, 1, 0.36, 1) 1700ms 1 both; }
.scene-anime .se-goutte-tombe { animation: se-tombe 1000ms ease-in 2100ms 1 both; }
@keyframes se-halo { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes se-rayons { from { transform: rotate(-30deg) scale(0.7); opacity: 0; } to { transform: rotate(0) scale(1); opacity: 1; } }
@keyframes se-vague { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes se-eventail { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-18deg); } 70% { transform: rotate(8deg); } }
@keyframes se-mouchoir { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-4px); } }
@keyframes se-goutte { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes se-tombe { 0% { transform: translateY(-4px); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(16px); opacity: 0; } }
`;
const CLASSES = { posee: '', depart: ' scene-depart', animee: ' scene-anime' };
const trait = { stroke: 'var(--color-text)', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const visage = { fill: 'none', stroke: 'var(--color-text)', strokeWidth: 1.8, strokeLinecap: 'round' };
const goutte = 'q3.5 5 0 7 q-3.5 -2 0 -7 Z';
export function SceneDeLEte({ etat = 'animee' }) {
  return (
    <div style={{ borderRadius: 18, background: 'var(--color-background-element-2)' }}>
  <svg
    className={`scene-de-l-ete${CLASSES[etat]}`}
    viewBox="0 0 360 200"
    role="img"
    aria-label="Une femme et un homme accablés par la chaleur, sous un soleil qui chauffe, sur une terre sèche."
    style={{ display: 'block', width: '100%', height: 'auto' }}
  >
    <style>{CSS}</style>

    {/* Le soleil */}
    <circle className="se-halo" cx="298" cy="50" r="40" fill="var(--color-mascot-warm)" fillOpacity={0.16} />
    <g className="se-rayons" stroke="var(--color-mascot-warm)" strokeWidth={3} strokeLinecap="round">
      <line x1="298" y1="20" x2="298" y2="13" />
      <line x1="298" y1="80" x2="298" y2="87" />
      <line x1="268" y1="50" x2="261" y2="50" />
      <line x1="328" y1="50" x2="335" y2="50" />
      <line x1="277" y1="29" x2="272" y2="24" />
      <line x1="319" y1="71" x2="324" y2="76" />
      <line x1="319" y1="29" x2="324" y2="24" />
      <line x1="277" y1="71" x2="272" y2="76" />
    </g>
    <circle cx="298" cy="50" r="21" fill="var(--color-mascot-warm)" />

    {/* La terre sèche, et l'herbe grillée */}
    <g {...trait} fill="none">
      <line x1="24" y1="184" x2="336" y2="184" />
      <polyline points="52,184 58,190 55,195" strokeWidth={1.5} />
      <polyline points="152,184 148,191 152,196" strokeWidth={1.5} />
      <polyline points="262,184 268,189 276,190" strokeWidth={1.5} />
      <polyline points="318,184 314,190" strokeWidth={1.5} />
    </g>
    <g stroke="var(--color-mascot-warm)" strokeWidth={2} strokeLinecap="round" fill="none">
      <path d="M300 184 l-4 -11 M304 184 l1 -13 M308 184 l5 -10" />
      <path d="M40 184 l-3 -8 M43 184 l1 -10 M46 184 l4 -7" />
    </g>

    {/* L'air qui tremble */}
    <g stroke="var(--color-mascot-warm)" strokeWidth={2} strokeLinecap="round" fill="none">
      <path className="se-vague se-vague-1" d="M162 168 q5 -6 0 -12 q-5 -6 0 -12 q5 -6 0 -12" />
      <path className="se-vague se-vague-2" d="M262 162 q5 -6 0 -12 q-5 -6 0 -12 q5 -6 0 -12" />
      <path className="se-vague se-vague-3" d="M64 160 q5 -6 0 -12 q-5 -6 0 -12 q5 -6 0 -12" />
    </g>

    {/* Elle */}
    <g {...trait}>
      <line x1="103" y1="158" x2="102" y2="183" fill="none" />
      <line x1="117" y1="158" x2="118" y2="183" fill="none" />
      <path d="M99 183 h5 M116 183 h5" fill="none" />
      <path d="M98 96 Q110 92 122 96 L131 158 L89 158 Z" fill="var(--color-accent-muted)" />
      <path d="M98 98 Q87 116 89 134" fill="none" />
      <line x1="110" y1="90" x2="110" y2="95" fill="none" />
      <circle cx="119" cy="59" r="5.5" fill="var(--color-text)" />
      <path
        d="M95 86 C91 66 103 60 111 60 C121 60 128 67 126 86 C123 89 121 87 121 82 L99 82 C99 87 97 89 95 86 Z"
        fill="var(--color-text)"
      />
      <circle cx="110" cy="77" r="12.5" fill="var(--color-background)" />
      <path d="M97.6 75 C99 64 119 62 122.6 74 C116 69 105 68 97.6 75 Z" fill="var(--color-text)" />
    </g>
    <g {...visage}>
      <path d="M103.8 79.5 h4.4" />
      <path d="M111.8 79.5 h4.4" />
      <path d="M103.5 76 l4.5 -1.4" />
      <path d="M116.5 76 l-4.5 -1.4" />
    </g>
    <ellipse cx="110" cy="86" rx="1.8" ry="2.4" fill="var(--color-text)" />
    <circle cx="102" cy="84" r="2.6" fill="var(--color-mascot-warm)" fillOpacity={0.55} />
    <circle cx="118" cy="84" r="2.6" fill="var(--color-mascot-warm)" fillOpacity={0.55} />
    <path d="M121 99 Q136 104 134 90" fill="none" stroke="var(--color-text)" strokeWidth={2} strokeLinecap="round" />
    <g className="se-eventail" {...trait} strokeWidth={1.6}>
      <path d="M134 90 L121 72 A22 22 0 0 1 146 69 Z" fill="var(--color-background)" />
      <path d="M134 90 L127 69.5 M134 90 L134 68 M134 90 L140 68.3" fill="none" />
    </g>

    {/* Lui */}
    <g {...trait}>
      <line x1="208" y1="156" x2="207" y2="183" fill="none" />
      <line x1="222" y1="156" x2="223" y2="183" fill="none" />
      <path d="M203 183 h5 M222 183 h6" fill="none" />
      <path
        d="M200 140 L230 140 L231 158 L217 158 L215 149 L213 158 L199 158 Z"
        fill="var(--color-accent-muted)"
      />
      <path d="M201 98 Q193 114 194 128" fill="none" />
      <path d="M191.5 121 h4 v4 q4 2 4 6 v14 q0 2 -2 2 h-8 q-2 0 -2 -2 v-14 q0 -4 4 -6 Z" fill="var(--color-background)" />
      <path
        d="M200 93 L230 93 L237 106 L230 109 L229 141 L201 141 L200 109 L193 106 Z"
        fill="var(--color-background-selected)"
      />
      <path d="M209 93 q6 5 12 0" fill="none" />
      <line x1="215" y1="86" x2="215" y2="92" fill="none" />
      <circle cx="215" cy="72" r="14" fill="var(--color-background)" />
      <path
        d="M201 70 C200 55 229 54 229 69 C226 62 219 61 214 62 C208 62 203 65 201 70 Z"
        fill="var(--color-text)"
      />
    </g>
    <g {...visage}>
      <path d="M207.6 74 h4.6" />
      <path d="M217.8 74 h4.6" />
      <path d="M207.2 70.2 l4.6 -1.5" />
      <path d="M222.8 70.2 l-4.6 -1.5" />
    </g>
    <path d="M211 80.5 q4 -2 8 0 q-0.6 5.5 -4 5.5 q-3.4 0 -4 -5.5 Z" fill="var(--color-text)" />
    <ellipse cx="215" cy="84.6" rx="2" ry="1.3" fill="var(--color-mascot-warm)" />
    <circle cx="207" cy="79" r="2.6" fill="var(--color-mascot-warm)" fillOpacity={0.55} />
    <circle cx="223" cy="79" r="2.6" fill="var(--color-mascot-warm)" fillOpacity={0.55} />
    <g className="se-mouchoir">
      <path d="M230 97 L244 83 L233 64" fill="none" {...trait} />
      <path d="M226 57 l11 -3 l3 11 l-11 3 Z" fill="var(--color-background)" {...trait} strokeWidth={1.6} />
    </g>

    {/* La sueur */}
    <g fill="var(--color-background)" stroke="var(--color-text)" strokeWidth={1.4} strokeLinejoin="round">
      <path className="se-goutte se-goutte-1" d={`M199 62 ${goutte}`} />
      <path className="se-goutte se-goutte-2" d={`M95 66 ${goutte}`} />
      <path className="se-goutte se-goutte-tombe" d={`M203 80 ${goutte}`} />
    </g>
  </svg>
    </div>
  );
}
