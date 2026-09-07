// Génère les artboards du canvas « Rappels et notifications » (v1-12, chantier E).
//
// Cinq planches répètent l'écran du plan : un script est le seul moyen qu'elles restent
// cohérentes entre elles — même parti que le canvas v1-11. Les valeurs viennent du code réel
// (`src/constants/theme.ts`, `button.tsx`, `mode-list-item.tsx`, `plan/action-card.tsx`,
// `checkin-card.tsx`, `bande-haute.tsx`, `mascotte.ts`), rien n'est arrondi à une grille.
import { writeFileSync } from 'node:fs';

const C = {
  accent: '#1F6F4A', accentText: '#14563A', accentMuted: '#A9C8B6',
  selected: '#E4EFE8', tinted: '#F3F8F4', element: '#F0F1EC',
  text: '#131612', text2: '#39403B', text3: '#5E655F',
  border: '#DDE0D9', pagIn: '#CDD7CF', bg: '#FFFFFF', canvas: '#FAFAF8',
};

const HEAD = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spline+Sans:wght@400;500;600;700&display=swap">
  <style>
    body { margin: 0; font-family: 'Spline Sans', system-ui, sans-serif; }
    a { color: #14563A; } a:hover { color: #1F6F4A; }
  </style>
</helmet>
`;
const tail = (script = '') => `</x-dc>\n${script}</body>\n</html>\n`;

// ── Mascotte — géométrie reprise trait pour trait de src/components/mascot.tsx ────────────
const FACES = {
  calm:        { eyes: 'dots',   mouth: 'M42,62 Q50,68 58,62', blushO: 0.55, blushR: 5,   blushCy: 60 },
  happy:       { eyes: 'happy',  mouth: 'M40,60 Q50,72 60,60', blushO: 0.6,  blushR: 5.4, blushCy: 59 },
  encouraging: { eyes: 'soft',   mouth: 'M43,63 Q50,66 57,63', blushO: 0.55, blushR: 5,   blushCy: 60 },
  resting:     { eyes: 'closed', mouth: 'M44,63 Q50,66 56,63', blushO: 0.5,  blushR: 5,   blushCy: 60 },
};
const EYES = {
  dots: `<circle cx="39" cy="50" r="4.2" fill="${C.text}"></circle><circle cx="61" cy="50" r="4.2" fill="${C.text}"></circle>`,
  happy: `<path d="M34,49 Q39,44 44,49" stroke="${C.text}" stroke-width="3.4" stroke-linecap="round" fill="none"></path><path d="M56,49 Q61,44 66,49" stroke="${C.text}" stroke-width="3.4" stroke-linecap="round" fill="none"></path>`,
  soft: `<path d="M35,51 Q39,54 43,51" stroke="${C.text}" stroke-width="3.4" stroke-linecap="round" fill="none"></path><path d="M57,51 Q61,54 65,51" stroke="${C.text}" stroke-width="3.4" stroke-linecap="round" fill="none"></path>`,
  closed: `<path d="M34,50 Q39,55 44,50" stroke="${C.text}" stroke-width="3.4" stroke-linecap="round" fill="none"></path><path d="M56,50 Q61,55 66,50" stroke="${C.text}" stroke-width="3.4" stroke-linecap="round" fill="none"></path>`,
};
function mascot(mood, size, tilt = 0) {
  const f = FACES[mood];
  return `<div style="display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; flex-shrink: 0; transform: rotate(${tilt}deg)"><svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><defs><clipPath id="feuille-${mood}-${size}"><path d="M50,8 C78,26 84,56 50,92 C16,56 22,26 50,8 Z"></path></clipPath></defs><path d="M50,8 C78,26 84,56 50,92 C16,56 22,26 50,8 Z" fill="${C.accent}"></path><path d="M50,18 C46,26 46,32 50,38" stroke="${C.selected}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.55"></path><g clip-path="url(#feuille-${mood}-${size})"><circle cx="33" cy="${f.blushCy}" r="${f.blushR}" fill="${C.accentMuted}" opacity="${f.blushO}"></circle><circle cx="67" cy="${f.blushCy}" r="${f.blushR}" fill="${C.accentMuted}" opacity="${f.blushO}"></circle>${EYES[f.eyes]}<path d="${f.mouth}" stroke="${C.text}" stroke-width="3.2" stroke-linecap="round" fill="none"></path></g></svg></div>`;
}

// ── Icônes — tracé, grille 24, jamais un emoji ────────────────────────────────────────────
const ICON = {
  compte: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.6" stroke="${C.text3}" stroke-width="1.9"></circle><path d="M4.8 19.5c1.4-3.3 4-4.9 7.2-4.9s5.8 1.6 7.2 4.9" stroke="${C.text3}" stroke-width="1.9" stroke-linecap="round"></path></svg>`,
  coche: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
  plan: (c) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l4.5 4.5L19 7" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4 20h16" stroke="${c}" stroke-width="2.2" stroke-linecap="round"></path></svg>`,
  suivi: (c) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 15.5l5-5 3.5 3.5L20 7" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="20" cy="7" r="1.8" fill="${c}"></circle></svg>`,
  cloche: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"></path><path d="M10 20a2 2 0 0 0 4 0" stroke="${c}" stroke-width="1.9" stroke-linecap="round"></path></svg>`,
  mail: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="${c}" stroke-width="1.9"></rect><path d="M4.5 7l7.5 6 7.5-6" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
  rien: (c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="${c}" stroke-width="1.9"></circle><path d="M8 12h8" stroke="${c}" stroke-width="1.9" stroke-linecap="round"></path></svg>`,
  fleche: `<svg width="36" height="20" viewBox="0 0 36 20" fill="none"><path d="M2 10h28M24 4l7 6-7 6" stroke="${C.accentMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
  rejouer: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 0 2.3-5.6" stroke="${C.text3}" stroke-width="2" stroke-linecap="round"></path><path d="M4 4v5h5" stroke="${C.text3}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
  chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="${C.text3}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
};

// ── Briques d'écran, à l'échelle réelle (390 × 844) ───────────────────────────────────────
const bande = () => `<div style="height: 52px; box-sizing: border-box; padding: 0 13px; display: flex; align-items: center; border-bottom: 1px solid ${C.border}; flex-shrink: 0"><div style="width: 44px"></div><div style="flex-grow: 1; text-align: center; font-size: 17px; line-height: 24px; font-weight: 600; letter-spacing: -0.1px; color: ${C.text}">Ramille</div><div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center">${ICON.compte}</div></div>`;

function tabs(actif) {
  const onglet = (nom, libelle, icone) => {
    const est = actif === nom;
    const c = est ? C.accent : C.text3;
    return `<div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px"><div style="width: 56px; height: 30px; border-radius: 15px; background: ${est ? C.selected : 'transparent'}; display: flex; align-items: center; justify-content: center">${icone(c)}</div><div style="font-size: 12px; line-height: 16px; font-weight: ${est ? 600 : 500}; color: ${c}">${libelle}</div></div>`;
  };
  return `<div style="height: 84px; box-sizing: border-box; border-top: 1px solid ${C.border}; padding: 8px 24px 20px; display: flex; background: ${C.bg}; flex-shrink: 0">${onglet('plan', 'Plan', ICON.plan)}${onglet('suivi', 'Suivi', ICON.suivi)}</div>`;
}

// Le cadre : pas de barre d'état dessinée — l'espace en haut est laissé au téléphone.
function phone(contenu, { actif = 'plan', extra = '' } = {}) {
  return `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; overflow: hidden; display: flex; flex-direction: column"><div style="height: 44px; flex-shrink: 0"></div>${bande()}<div style="flex-grow: 1; overflow: hidden; padding: 24px; display: flex; flex-direction: column; gap: 24px">${contenu}</div>${tabs(actif)}${extra}</div>`;
}

const intro = (sousTitre) => `<div style="display: flex; flex-direction: column; gap: 8px"><div style="font-size: 26px; line-height: 32px; font-weight: 600; letter-spacing: -0.26px; color: ${C.text}">Ton plan</div><div style="font-size: 15px; line-height: 22px; font-weight: 500; color: ${C.text2}">${sousTitre}</div><div style="align-self: flex-start; border-radius: 8px; background: ${C.element}; padding: 6px 12px; margin-top: 4px; font-size: 14px; line-height: 20px; font-weight: 600; color: ${C.text}">Cadence : automne 2026</div></div>`;

const cap = () => `<div style="border-radius: 18px; background: ${C.selected}; padding: 20px; display: flex; flex-direction: column; gap: 6px"><div style="font-size: 14px; line-height: 20px; font-weight: 600; color: ${C.accentText}">Ton cap pour cette période</div><div style="font-size: 30px; line-height: 36px; font-weight: 600; letter-spacing: -0.6px; color: ${C.text}">− 280 kg CO₂e</div><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text2}">Sur la saison, par rapport à ton bilan.</div></div>`;

const carteEngagee = (dessous = '') => `<div style="border-radius: 18px; border: 2px solid ${C.accent}; background: ${C.tinted}; padding: 20px; display: flex; flex-direction: column; gap: 8px"><div style="display: flex; align-items: center; gap: 8px"><div style="width: 20px; height: 20px; border-radius: 10px; background: ${C.accent}; display: flex; align-items: center; justify-content: center">${ICON.coche}</div><div style="font-size: 13px; line-height: 18px; font-weight: 700; letter-spacing: 0.3px; color: ${C.accentText}">TU T’Y ES ENGAGÉ</div></div><div style="font-size: 17px; line-height: 24px; font-weight: 600; color: ${C.text}">Faire deux trajets par semaine à vélo plutôt qu’en voiture.</div><div style="display: flex; flex-direction: column; gap: 2px"><div style="font-size: 20px; line-height: 26px; font-weight: 600; color: ${C.accentText}">− 184 kg CO₂e</div><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text2}">Le mardi et le jeudi · par an · 7 % de ton empreinte</div></div>${dessous}<div style="margin-top: 8px; font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text3}; text-decoration: underline">Changer d’avis</div></div>`;

const carteAutre = () => `<div style="border-radius: 18px; border: 1px solid ${C.border}; padding: 20px; display: flex; flex-direction: column; gap: 8px; opacity: 0.72"><div style="font-size: 17px; line-height: 24px; font-weight: 600; color: ${C.text}">Prendre le train pour tes trajets de plus de 300 km.</div><div style="display: flex; flex-direction: column; gap: 2px"><div style="font-size: 20px; line-height: 26px; font-weight: 600; color: ${C.accentText}">− 96 kg CO₂e</div><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text2}">par an · 4 % de ton empreinte</div></div><div style="margin-top: 8px; height: 54px; border-radius: 27px; background: ${C.element}; display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 20px; font-weight: 600; color: ${C.text}">Choisir celle-ci à la place</div></div>`;

// L'action au moment du choix des jours — l'instant qui précède « C'est noté ».
function carteEnCours(onNoter) {
  const jour = (l, sel) => `<div style="flex-grow: 1; height: 44px; border-radius: 14px; background: ${sel ? C.accent : C.element}; display: flex; align-items: center; justify-content: center; font-size: 15px; line-height: 20px; font-weight: ${sel ? 600 : 400}; color: ${sel ? '#FFFFFF' : C.text}">${l}</div>`;
  return `<div style="border-radius: 18px; border: 1px solid ${C.border}; padding: 20px; display: flex; flex-direction: column; gap: 8px"><div style="font-size: 17px; line-height: 24px; font-weight: 600; color: ${C.text}">Faire deux trajets par semaine à vélo plutôt qu’en voiture.</div><div style="display: flex; flex-direction: column; gap: 2px"><div style="font-size: 20px; line-height: 26px; font-weight: 600; color: ${C.accentText}">− 184 kg CO₂e</div><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text2}">par an · 7 % de ton empreinte</div></div><div style="margin-top: 16px; border-radius: 16px; background: ${C.element}; padding: 24px; display: flex; flex-direction: column; gap: 16px"><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text3}">Quels jours ?</div><div style="display: flex; gap: 6px">${jour('L', false)}${jour('M', true)}${jour('M', false)}${jour('J', true)}${jour('V', false)}${jour('S', false)}${jour('D', false)}</div><div style="display: flex; align-items: center; gap: 24px"><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text3}; text-decoration: underline">Annuler</div><div ${onNoter} style="flex-grow: 1; height: 54px; border-radius: 27px; background: ${C.accent}; display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 20px; font-weight: 600; color: #FFFFFF; cursor: pointer">C’est noté</div></div></div></div>`;
}

// La carte d'attente — ce qui remplace « Rien à rattraper ».
function carteAttente(ligne, detail) {
  return `<div style="border-radius: 18px; background: ${C.element}; padding: 20px; display: flex; align-items: center; gap: 16px">${mascot('resting', 40)}<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><div style="font-size: 15px; line-height: 22px; font-weight: 600; color: ${C.text}">${ligne}</div><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text2}">${detail}</div></div></div>`;
}

// Une rangée de choix — `ModeListItem` : rayon 14, padding 14/16, sélection = fond teinté + bordure accent.
function rangee({ icone, libelle, sous, bg, border, weight, opacite = 1, onClick = '' }) {
  return `<div ${onClick} style="border-radius: 14px; border: 1.5px solid ${border}; background: ${bg}; padding: 14px 16px; display: flex; align-items: center; gap: 12px; opacity: ${opacite}; cursor: pointer"><div style="flex-shrink: 0">${icone}</div><div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><div style="font-size: 16px; line-height: 22px; font-weight: ${weight}; color: ${C.text}">${libelle}</div>${sous ? `<div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text3}">${sous}</div>` : ''}</div></div>`;
}

const boutonPrimaire = (libelle, onClick = '') => `<div ${onClick} style="height: 54px; border-radius: 27px; background: ${C.accent}; display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 20px; font-weight: 600; color: #FFFFFF; cursor: pointer">${libelle}</div>`;

// Le dialogue système n'est pas dessiné : un cadre en pointillé le note comme une étape,
// comme les cadres « hors de l'app » du canvas navigation.
function dialogueSysteme(onRefuser, onAutoriser) {
  return `<div style="position: absolute; inset: 0; background: rgba(19, 22, 18, 0.42); display: flex; align-items: center; justify-content: center; padding: 32px"><div style="width: 100%; border-radius: 22px; border: 1px dashed ${C.pagIn}; background: ${C.element}; padding: 20px; display: flex; flex-direction: column; gap: 14px"><div style="font-size: 12px; line-height: 16px; font-family: ui-monospace, monospace; color: ${C.text3}">→ dialogue système Android</div><div style="font-size: 16px; line-height: 22px; font-weight: 600; color: ${C.text}">Autoriser Ramille à t’envoyer des notifications ?</div><div style="font-size: 13px; line-height: 18px; color: ${C.text3}">Le texte et l’apparence sont ceux du téléphone, pas les nôtres. Après deux refus ici, il ne s’affiche plus jamais.</div><div style="display: flex; justify-content: flex-end; gap: 24px; margin-top: 4px"><div ${onRefuser} style="font-size: 15px; line-height: 20px; font-weight: 600; color: ${C.text3}; cursor: pointer; padding: 8px 0">Ne pas autoriser</div><div ${onAutoriser} style="font-size: 15px; line-height: 20px; font-weight: 600; color: ${C.accentText}; cursor: pointer; padding: 8px 0">Autoriser</div></div></div></div>`;
}

// ── Main — direction B, la feuille. Cliquable de « C'est noté » jusqu'à la carte d'attente. ─
function main() {
  const ecranEngagement = phone(`${intro('Une action liée à tes trajets domicile-travail.')}${carteEnCours('onClick="{{ noter }}"')}${carteAutre()}`);

  const feuille = `<div style="position: absolute; inset: 0; background: rgba(19, 22, 18, 0.42); display: flex; flex-direction: column; justify-content: flex-end"><div style="background: ${C.bg}; border-radius: 24px 24px 0 0; padding: 12px 24px 32px; display: flex; flex-direction: column; gap: 20px"><div style="align-self: center; width: 36px; height: 4px; border-radius: 2px; background: ${C.border}"></div><div style="display: flex; align-items: center; gap: 12px">${mascot('calm', 48, -6)}<div style="flex-grow: 1; min-width: 0; font-size: 17px; line-height: 24px; font-weight: 600; color: ${C.text}"><sc-if value="{{ hebdo }}" hint-placeholder-val="{{ true }}">Je te laisse mener ton action. Lundi, je reviens te demander si tu l’as faite.</sc-if><sc-if value="{{ mensuel }}" hint-placeholder-val="{{ false }}">Je te laisse mener ton action. Au début du mois prochain, je reviens te demander si tu l’as faite.</sc-if></div></div><div style="font-size: 15px; line-height: 22px; font-weight: 500; color: ${C.text2}">Comment tu préfères que je te fasse signe ?</div><div style="display: flex; flex-direction: column; gap: 8px">${rangee({ icone: ICON.cloche(C.text), libelle: 'Par notification sur ce téléphone', sous: 'Le matin où la question s’ouvre.', bg: '{{ r.notification.bg }}', border: '{{ r.notification.border }}', weight: '{{ r.notification.weight }}', onClick: 'onClick="{{ choisirNotification }}"' })}<sc-if value="{{ compte }}" hint-placeholder-val="{{ true }}">${rangee({ icone: ICON.mail(C.text), libelle: 'Par email', sous: 'À camille@exemple.fr.', bg: '{{ r.email.bg }}', border: '{{ r.email.border }}', weight: '{{ r.email.weight }}', onClick: 'onClick="{{ choisirEmail }}"' })}</sc-if><sc-if value="{{ sansCompte }}" hint-placeholder-val="{{ false }}">${rangee({ icone: ICON.mail(C.text3), libelle: 'Par email', sous: 'Rattache un compte pour l’activer.', bg: C.element, border: 'transparent', weight: 400, opacite: 0.55 })}</sc-if>${rangee({ icone: ICON.rien(C.text), libelle: 'Sans rappel', sous: '{{ sousSansRappel }}', bg: '{{ r.aucun.bg }}', border: '{{ r.aucun.border }}', weight: '{{ r.aucun.weight }}', onClick: 'onClick="{{ choisirAucun }}"' })}</div>${boutonPrimaire('{{ libelleBouton }}', 'onClick="{{ valider }}"')}<div style="text-align: center; font-size: 13px; line-height: 18px; font-weight: 500; color: ${C.text3}">Tu pourras changer d’avis dans « Toi ».</div></div></div>`;

  const derriere = phone(`${intro('Une action liée à tes trajets domicile-travail.')}${carteEngagee()}${carteAutre()}`, { extra: '<sc-if value="{{ estSheet }}" hint-placeholder-val="{{ false }}">' + feuille + '</sc-if><sc-if value="{{ estSysteme }}" hint-placeholder-val="{{ false }}">' + dialogueSysteme('onClick="{{ refuser }}"', 'onClick="{{ autoriser }}"') + '</sc-if>' });

  const variantes = [
    ['vNotification', 'Je te fais signe lundi.', 'Je te fais signe au début du mois prochain.', 'Par notification sur ce téléphone.'],
    ['vEmail', 'Je te fais signe lundi.', 'Je te fais signe au début du mois prochain.', 'Par email, à camille@exemple.fr.'],
    ['vAucun', 'On se retrouve ici lundi.', 'On se retrouve ici au début du mois prochain.', 'Sans rappel — ça se change à tout moment dans « Toi ».'],
    ['vRefusCompte', 'Je te fais signe lundi.', 'Je te fais signe au début du mois prochain.', 'Par email, à camille@exemple.fr — les notifications sont coupées sur ce téléphone.'],
    ['vRefusAnonyme', 'On se retrouve ici lundi.', 'On se retrouve ici au début du mois prochain.', 'Les notifications sont coupées sur ce téléphone. Tu peux les rouvrir dans ses réglages, ou rattacher un compte pour l’email.'],
  ].map(([v, hebdo, mensuel, detail]) => `<sc-if value="{{ ${v} }}" hint-placeholder-val="{{ false }}">${carteAttente(`<sc-if value="{{ hebdo }}" hint-placeholder-val="{{ true }}">${hebdo}</sc-if><sc-if value="{{ mensuel }}" hint-placeholder-val="{{ false }}">${mensuel}</sc-if>`, detail)}</sc-if>`).join('');

  const rejouer = `<div onClick="{{ rejouer }}" style="align-self: flex-start; display: flex; align-items: center; gap: 6px; border-radius: 8px; border: 1px dashed ${C.pagIn}; padding: 6px 10px; cursor: pointer">${ICON.rejouer}<div style="font-size: 12px; line-height: 16px; font-family: ui-monospace, monospace; color: ${C.text3}">rejouer la séquence</div></div>`;
  const ecranAttente = phone(`${intro('Une action liée à tes trajets domicile-travail.')}${variantes}${cap()}${carteEngagee()}${rejouer}`);

  const html = `${HEAD}<sc-if value="{{ estEngagement }}" hint-placeholder-val="{{ true }}">${ecranEngagement}</sc-if><sc-if value="{{ estDerriere }}" hint-placeholder-val="{{ false }}">${derriere}</sc-if><sc-if value="{{ estAttente }}" hint-placeholder-val="{{ false }}">${ecranAttente}</sc-if>\n`;

  const script = `<script data-dc-script data-props='{"boucle":{"editor":"enum","options":["hebdo","mensuel"],"default":"hebdo","section":"Situation"},"compte":{"editor":"boolean","default":true,"section":"Situation"},"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {
  state = { etape: 'engagement', canal: 'notification', permission: null };
  renderVals() {
    var compte = this.props.compte !== false;
    var mensuel = this.props.boucle === 'mensuel';
    var s = this.state;
    var etape = s.etape;
    var canal = compte || s.canal !== 'email' ? s.canal : 'notification';
    var set = (patch) => this.setState(patch);
    var ligne = (actif) => ({ bg: actif ? '${C.selected}' : '${C.element}', border: actif ? '${C.accent}' : 'transparent', weight: actif ? 600 : 400 });
    var libelles = { notification: 'Autoriser les notifications', email: 'C’est bon', aucun: 'Continuer sans rappel' };
    var refus = s.permission === 'refus';
    return {
      hebdo: !mensuel, mensuel: mensuel, compte: compte, sansCompte: !compte,
      estEngagement: etape === 'engagement',
      estDerriere: etape === 'sheet' || etape === 'systeme',
      estSheet: etape === 'sheet', estSysteme: etape === 'systeme',
      estAttente: etape === 'attente',
      r: { notification: ligne(canal === 'notification'), email: ligne(canal === 'email'), aucun: ligne(canal === 'aucun') },
      sousSansRappel: mensuel ? 'On se retrouve ici au début du mois prochain.' : 'On se retrouve ici lundi.',
      libelleBouton: libelles[canal],
      vNotification: etape === 'attente' && canal === 'notification' && s.permission === 'ok',
      vEmail: etape === 'attente' && canal === 'email',
      vAucun: etape === 'attente' && canal === 'aucun',
      vRefusCompte: etape === 'attente' && canal === 'notification' && refus && compte,
      vRefusAnonyme: etape === 'attente' && canal === 'notification' && refus && !compte,
      noter: () => set({ etape: 'sheet' }),
      choisirNotification: () => set({ canal: 'notification' }),
      choisirEmail: () => { if (compte) set({ canal: 'email' }); },
      choisirAucun: () => set({ canal: 'aucun' }),
      valider: () => set(canal === 'notification' ? { etape: 'systeme' } : { etape: 'attente' }),
      autoriser: () => set({ etape: 'attente', permission: 'ok' }),
      refuser: () => set({ etape: 'attente', permission: 'refus' }),
      rejouer: () => set({ etape: 'engagement', canal: 'notification', permission: null })
    };
  }
}
</script>
`;
  return html + tail(script);
}

// ── Direction A — en place, sous la carte qu'on vient d'engager. Pas de visage : des kilos partout. ─
function momentEnPlace() {
  const puce = (l, sel) => `<div style="height: 44px; border-radius: 22px; padding: 0 18px; background: ${sel ? C.accent : C.element}; display: flex; align-items: center; justify-content: center; font-size: 15px; line-height: 20px; font-weight: ${sel ? 600 : 400}; color: ${sel ? '#FFFFFF' : C.text}">${l}</div>`;
  const bloc = `<div style="margin-top: 8px; border-top: 1px solid ${C.border}; padding-top: 14px; display: flex; flex-direction: column; gap: 12px"><div style="font-size: 15px; line-height: 22px; font-weight: 600; color: ${C.text}">Lundi, je reviens te demander si tu l’as faite. Comment te faire signe ?</div><div style="display: flex; flex-wrap: wrap; gap: 8px">${puce('Notification', true)}${puce('Email', false)}${puce('Sans rappel', false)}</div>${boutonPrimaire('Autoriser les notifications')}</div>`;
  return `${HEAD}${phone(`${intro('Une action liée à tes trajets domicile-travail.')}${carteEngagee(bloc)}${carteAutre()}`)}\n${tail()}`;
}

// ── Direction C — fondue dans la carte d'attente : une ligne, une action, le reste en liens. ─
function momentFondu() {
  const carte = `<div style="border-radius: 18px; background: ${C.element}; padding: 20px; display: flex; flex-direction: column; gap: 14px"><div style="display: flex; align-items: center; gap: 16px">${mascot('resting', 40)}<div style="flex-grow: 1; min-width: 0; font-size: 15px; line-height: 22px; font-weight: 600; color: ${C.text}">Je te laisse faire. Je te fais signe lundi ?</div></div>${boutonPrimaire('Autoriser les notifications')}<div style="display: flex; justify-content: center; gap: 24px; font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text3}"><div style="text-decoration: underline">Plutôt par email</div><div style="text-decoration: underline">Sans rappel</div></div></div>`;
  return `${HEAD}${phone(`${intro('Une action liée à tes trajets domicile-travail.')}${carte}${cap()}${carteEngagee()}${carteAutre()}`)}\n${tail()}`;
}

// ── La carte d'attente seule, en quatre états, par réglages ───────────────────────────────
function attente() {
  const variantes = [
    ['vNotification', 'Je te fais signe lundi.', 'Je te fais signe au début du mois prochain.', 'Par notification sur ce téléphone.'],
    ['vEmail', 'Je te fais signe lundi.', 'Je te fais signe au début du mois prochain.', 'Par email, à camille@exemple.fr.'],
    ['vAucun', 'On se retrouve ici lundi.', 'On se retrouve ici au début du mois prochain.', 'Sans rappel — ça se change à tout moment dans « Toi ».'],
    ['vRefus', 'On se retrouve ici lundi.', 'On se retrouve ici au début du mois prochain.', 'Les notifications sont coupées sur ce téléphone. Tu peux les rouvrir dans ses réglages, ou rattacher un compte pour l’email.'],
  ].map(([v, hebdo, mensuel, detail]) => `<sc-if value="{{ ${v} }}" hint-placeholder-val="{{ ${v === 'vNotification'} }}">${carteAttente(`<sc-if value="{{ hebdo }}" hint-placeholder-val="{{ true }}">${hebdo}</sc-if><sc-if value="{{ mensuel }}" hint-placeholder-val="{{ false }}">${mensuel}</sc-if>`, detail)}</sc-if>`).join('');
  const html = `${HEAD}${phone(`${intro('Une action liée à tes trajets domicile-travail.')}${variantes}${cap()}${carteEngagee()}${carteAutre()}`)}\n`;
  const script = `<script data-dc-script data-props='{"canal":{"editor":"enum","options":["notification","email","aucun","refus"],"default":"notification","section":"État"},"boucle":{"editor":"enum","options":["hebdo","mensuel"],"default":"hebdo","section":"État"},"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {
  renderVals() {
    var canal = this.props.canal || 'notification';
    var mensuel = this.props.boucle === 'mensuel';
    return { hebdo: !mensuel, mensuel: mensuel, vNotification: canal === 'notification', vEmail: canal === 'email', vAucun: canal === 'aucun', vRefus: canal === 'refus' };
  }
}
</script>
`;
  return html + tail(script);
}

// ── Le rappel — contenu seulement, sous forme schématique ─────────────────────────────────
function rappel() {
  const tuile = (titre, corps, meta) => `<div style="border-radius: 12px; background: ${C.bg}; border: 1px solid ${C.border}; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px"><div style="display: flex; align-items: center; gap: 8px">${mascot('calm', 18)}<div style="font-size: 12px; line-height: 16px; font-weight: 500; color: ${C.text3}">${meta}</div></div><div style="font-size: 15px; line-height: 20px; font-weight: 600; color: ${C.text}">${titre}</div><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text2}; text-wrap: pretty">${corps}</div></div>`;
  const sec = (t, c = C.text3) => `<div style="font-size: 13px; line-height: 18px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: ${c}">${t}</div>`;
  const note = (t) => `<div style="font-size: 13px; line-height: 19px; color: ${C.text3}; text-wrap: pretty">${t}</div>`;
  return `${HEAD}<div style="width: 900px; height: 600px; box-sizing: border-box; background: ${C.canvas}; padding: 28px; display: flex; flex-direction: column; gap: 24px"><div style="display: flex; gap: 40px"><div style="width: 396px; display: flex; flex-direction: column; gap: 12px">${sec('Notification', C.accentText)}${note('Ce que le téléphone affiche. Android replie le corps à deux lignes : le titre et le début de la question doivent suffire. Jamais un chiffre, jamais un second envoi.')}<div style="border-radius: 22px; border: 1px dashed ${C.pagIn}; background: ${C.element}; padding: 14px; display: flex; flex-direction: column; gap: 10px">${tuile('Ton point de la semaine', 'As-tu changé de mode de transport au moins une fois cette semaine pour tes trajets domicile-travail ?', 'Ramille · maintenant')}${tuile('Ton point du mois', 'As-tu changé de mode de transport au moins une fois ce mois-ci pour tes trajets loisirs ?', 'Ramille · maintenant')}</div>${note('Envoyée le matin où la question s’ouvre — le lundi, le 1er — à une heure raisonnable en France. Un jeton d’appareil suffit : pas besoin de compte.')}</div><div style="width: 396px; display: flex; flex-direction: column; gap: 12px">${sec('Email — inchangé')}${note('Le texte en vigueur, signé. Il reste le repli quand la notification n’est pas possible, et il survit à une désinstallation.')}<div style="border-radius: 22px; border: 1px dashed ${C.pagIn}; background: ${C.element}; padding: 14px"><div style="border-radius: 12px; background: ${C.bg}; border: 1px solid ${C.border}; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px"><div style="font-size: 12px; line-height: 16px; font-weight: 500; color: ${C.text3}">Ramille · Ton point de la semaine</div><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text2}; white-space: pre-line; text-wrap: pretty">Bonjour,

Une seule question, comme d’habitude : as-tu changé de mode de transport au moins une fois cette semaine pour tes trajets domicile-travail ?

Réponds-moi en un geste : ramille.fr/plan

Si tu n’as rien changé, ce n’est pas grave — on se repose la question au prochain point.

— Ramille</div></div></div></div></div><div style="display: flex; align-items: center; gap: 16px; border-top: 1px solid ${C.border}; padding-top: 18px">${sec('Le retour')}${ICON.fleche}${note('Appuyer sur la notification ouvre le plan, point en tête, deux boutons. C’est le flux 4 du canvas navigation, inchangé : on ne le redessine pas.')}</div></div>\n${tail()}`;
}

// ── « Toi » — le réglage à trois, avec ses indisponibilités et leurs raisons ──────────────
function toi() {
  const retour = `<div style="align-self: flex-start; font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text3}; text-decoration: underline">Retour</div>`;
  const titre = `<div style="font-size: 26px; line-height: 32px; font-weight: 600; letter-spacing: -0.26px; color: ${C.text}">Toi</div>`;
  const compte = `<sc-if value="{{ rattache }}" hint-placeholder-val="{{ true }}"><div style="font-size: 15px; line-height: 22px; font-weight: 500; color: ${C.text2}">Ton compte est rattaché à camille@exemple.fr. Ton bilan te suit d’un appareil à l’autre.</div></sc-if><sc-if value="{{ anonyme }}" hint-placeholder-val="{{ false }}"><div style="font-size: 15px; line-height: 22px; font-weight: 500; color: ${C.text2}">Ton bilan reste sur cet appareil. Un compte le fait te suivre ailleurs.</div><div style="height: 54px; border-radius: 27px; background: ${C.accent}; display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 20px; font-weight: 600; color: #FFFFFF; margin-top: 4px">Rattacher un compte</div></sc-if>`;
  const rappels = `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px"><div style="display: flex; flex-direction: column; gap: 2px"><div style="font-size: 17px; line-height: 24px; font-weight: 600; color: ${C.text}">Rappels</div><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text2}">Un mot à chaque point de suivi, jamais plus.</div></div><div style="display: flex; flex-direction: column; gap: 8px"><sc-if value="{{ notifPossible }}" hint-placeholder-val="{{ true }}">${rangee({ icone: ICON.cloche(C.text), libelle: 'Par notification sur ce téléphone', sous: 'Le matin où la question s’ouvre.', bg: '{{ r.notification.bg }}', border: '{{ r.notification.border }}', weight: '{{ r.notification.weight }}', onClick: 'onClick="{{ choisirNotification }}"' })}</sc-if><sc-if value="{{ notifCoupee }}" hint-placeholder-val="{{ false }}">${rangee({ icone: ICON.cloche(C.text3), libelle: 'Par notification sur ce téléphone', sous: 'Coupées dans les réglages du téléphone — c’est là que ça se rouvre.', bg: C.element, border: 'transparent', weight: 400, opacite: 0.55 })}<div style="align-self: flex-start; margin-left: 16px; font-size: 14px; line-height: 20px; font-weight: 600; color: ${C.accentText}; text-decoration: underline">Ouvrir les réglages du téléphone</div></sc-if><sc-if value="{{ emailPossible }}" hint-placeholder-val="{{ true }}">${rangee({ icone: ICON.mail(C.text), libelle: 'Par email', sous: 'À camille@exemple.fr.', bg: '{{ r.email.bg }}', border: '{{ r.email.border }}', weight: '{{ r.email.weight }}', onClick: 'onClick="{{ choisirEmail }}"' })}</sc-if><sc-if value="{{ emailImpossible }}" hint-placeholder-val="{{ false }}">${rangee({ icone: ICON.mail(C.text3), libelle: 'Par email', sous: 'Rattache un compte pour l’activer.', bg: C.element, border: 'transparent', weight: 400, opacite: 0.55 })}</sc-if>${rangee({ icone: ICON.rien(C.text), libelle: 'Aucun', sous: 'On se retrouve dans l’app, à chaque point.', bg: '{{ r.aucun.bg }}', border: '{{ r.aucun.border }}', weight: '{{ r.aucun.weight }}', onClick: 'onClick="{{ choisirAucun }}"' })}</div></div>`;
  const donnees = `<div style="border-radius: 18px; background: ${C.element}; padding: 24px; display: flex; flex-direction: column; gap: 8px; margin-top: 8px"><div style="font-size: 14px; line-height: 20px; font-weight: 600; color: ${C.text}">Mes données</div><div style="font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.text2}">Tu peux récupérer l’intégralité de ce que Ramille sait de toi, ou tout supprimer définitivement.</div></div>`;
  const ecran = `<div style="position: relative; width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; overflow: hidden; display: flex; flex-direction: column"><div style="height: 44px; flex-shrink: 0"></div><div style="flex-grow: 1; overflow: hidden; padding: 24px; display: flex; flex-direction: column; gap: 16px">${retour}${titre}${compte}${rappels}${donnees}</div></div>`;
  const script = `<script data-dc-script data-props='{"situation":{"editor":"enum","options":["compte","anonyme","refus","web"],"default":"compte","section":"Situation"},"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {
  state = { choix: null };
  renderVals() {
    var sit = this.props.situation || 'compte';
    var rattache = sit !== 'anonyme';
    var notifPossible = sit === 'compte' || sit === 'anonyme';
    var notifCoupee = sit === 'refus';
    var defaut = notifPossible ? 'notification' : (rattache ? 'email' : 'aucun');
    var choix = this.state.choix || defaut;
    if (choix === 'notification' && !notifPossible) choix = defaut;
    if (choix === 'email' && !rattache) choix = defaut;
    var ligne = (actif) => ({ bg: actif ? '${C.selected}' : '${C.element}', border: actif ? '${C.accent}' : 'transparent', weight: actif ? 600 : 400 });
    var set = (patch) => this.setState(patch);
    return {
      rattache: rattache, anonyme: !rattache,
      notifPossible: notifPossible, notifCoupee: notifCoupee,
      emailPossible: rattache, emailImpossible: !rattache,
      r: { notification: ligne(choix === 'notification'), email: ligne(choix === 'email'), aucun: ligne(choix === 'aucun') },
      choisirNotification: () => { if (notifPossible) set({ choix: 'notification' }); },
      choisirEmail: () => { if (rattache) set({ choix: 'email' }); },
      choisirAucun: () => set({ choix: 'aucun' })
    };
  }
}
</script>
`;
  return `${HEAD}${ecran}\n${tail(script)}`;
}

// ── Le refus — l'écran qu'on oublie, en trois temps, à l'échelle réelle ───────────────────
function refus() {
  const legende = (t) => `<div style="width: 390px; font-size: 13px; line-height: 19px; color: ${C.text2}; text-wrap: pretty">${t}</div>`;
  const cadre = (inner) => `<div style="width: 390px; height: 844px; box-sizing: border-box; border-radius: 22px; border: 1px solid ${C.border}; overflow: hidden; flex-shrink: 0">${inner}</div>`;
  const feuilleStatique = `<div style="position: absolute; inset: 0; background: rgba(19, 22, 18, 0.42); display: flex; flex-direction: column; justify-content: flex-end"><div style="background: ${C.bg}; border-radius: 24px 24px 0 0; padding: 12px 24px 32px; display: flex; flex-direction: column; gap: 20px"><div style="align-self: center; width: 36px; height: 4px; border-radius: 2px; background: ${C.border}"></div><div style="display: flex; align-items: center; gap: 12px">${mascot('calm', 48, -6)}<div style="flex-grow: 1; min-width: 0; font-size: 17px; line-height: 24px; font-weight: 600; color: ${C.text}">Je te laisse mener ton action. Lundi, je reviens te demander si tu l’as faite.</div></div><div style="font-size: 15px; line-height: 22px; font-weight: 500; color: ${C.text2}">Comment tu préfères que je te fasse signe ?</div><div style="display: flex; flex-direction: column; gap: 8px">${rangee({ icone: ICON.cloche(C.text), libelle: 'Par notification sur ce téléphone', sous: 'Le matin où la question s’ouvre.', bg: C.selected, border: C.accent, weight: 600 })}${rangee({ icone: ICON.mail(C.text3), libelle: 'Par email', sous: 'Rattache un compte pour l’activer.', bg: C.element, border: 'transparent', weight: 400, opacite: 0.55 })}${rangee({ icone: ICON.rien(C.text), libelle: 'Sans rappel', sous: 'On se retrouve ici lundi.', bg: C.element, border: 'transparent', weight: 400 })}</div>${boutonPrimaire('Autoriser les notifications')}<div style="text-align: center; font-size: 13px; line-height: 18px; font-weight: 500; color: ${C.text3}">Tu pourras changer d’avis dans « Toi ».</div></div></div>`;
  const fond = `${intro('Une action liée à tes trajets domicile-travail.')}${carteEngagee()}${carteAutre()}`;
  const un = cadre(phone(fond, { extra: feuilleStatique }));
  const deux = cadre(phone(fond, { extra: dialogueSysteme('', '') }));
  const trois = cadre(phone(`${intro('Une action liée à tes trajets domicile-travail.')}${carteAttente('On se retrouve ici lundi.', 'Les notifications sont coupées sur ce téléphone. Tu peux les rouvrir dans ses réglages, ou rattacher un compte pour l’email.')}${cap()}${carteEngagee()}`));
  const colonne = (ecran, texte) => `<div style="display: flex; flex-direction: column; gap: 12px; flex-shrink: 0">${ecran}${legende(texte)}</div>`;
  const fleche = `<div style="height: 844px; display: flex; align-items: center; flex-shrink: 0">${ICON.fleche}</div>`;
  return `${HEAD}<div style="width: 1370px; height: 1060px; box-sizing: border-box; background: ${C.canvas}; padding: 28px; display: flex; flex-direction: column; gap: 18px"><div style="display: flex; flex-direction: column; gap: 4px"><div style="font-size: 18px; line-height: 24px; font-weight: 700; color: ${C.text}">Le refus — sans compte rattaché</div><div style="font-size: 13px; line-height: 19px; color: ${C.text2}; max-width: 900px; text-wrap: pretty">La personne dit oui chez nous, puis non au téléphone. Sur Android, un second non serait définitif : on ne redemande jamais au prochain engagement. La carte d’attente le dit sans reproche, et la porte reste ouverte depuis « Toi ». Avec un compte rattaché, l’email prend le relais de lui-même.</div></div><div style="display: flex; align-items: flex-start; gap: 24px">${colonne(un, 'La feuille, notification choisie. Le bouton annonce le dialogue système : la personne sait ce qui va s’ouvrir.')}${fleche}${colonne(deux, 'Le dialogue du téléphone — noté, pas dessiné. Ici, « Ne pas autoriser ».')}${fleche}${colonne(trois, 'Le plan. Ramille revient quand même, dans l’app. Le chemin vers les réglages et vers l’email est dit une fois, sans insister.')}</div></div>\n${tail()}`;
}

// ── Écriture ──────────────────────────────────────────────────────────────────────────────
const fichiers = {
  'Main.dc.html': main(),
  'MomentEnPlace.dc.html': momentEnPlace(),
  'MomentFondu.dc.html': momentFondu(),
  'Attente.dc.html': attente(),
  'Rappel.dc.html': rappel(),
  'Toi.dc.html': toi(),
  'Refus.dc.html': refus(),
};
for (const [nom, contenu] of Object.entries(fichiers)) writeFileSync(nom, contenu);

const canvas = {
  pages: [
    { id: 'page-1', name: 'Le moment' },
    { id: 'page-2', name: 'Attente' },
    { id: 'page-3', name: 'Rappel' },
    { id: 'page-4', name: 'Réglage' },
    { id: 'page-5', name: 'Refus' },
  ],
  artboards: [
    { file: 'Main.dc.html', x: 0, y: 0, w: 390, h: 844, page: 'page-1', title: 'B — La feuille (cliquable)', is_interactive: true },
    { file: 'MomentEnPlace.dc.html', x: 500, y: 0, w: 390, h: 844, page: 'page-1', title: 'A — En place, sous la carte' },
    { file: 'MomentFondu.dc.html', x: 1000, y: 0, w: 390, h: 844, page: 'page-1', title: 'C — Fondu dans la carte d’attente' },
    { file: 'Attente.dc.html', x: 0, y: 0, w: 390, h: 844, page: 'page-2', title: 'La carte d’attente — quatre états', is_interactive: true },
    { file: 'Rappel.dc.html', x: 0, y: 0, w: 900, h: 600, page: 'page-3', title: 'Le rappel — notification et email' },
    { file: 'Toi.dc.html', x: 0, y: 0, w: 390, h: 844, page: 'page-4', title: '« Toi » — le réglage à trois', is_interactive: true },
    { file: 'Refus.dc.html', x: 0, y: 0, w: 1370, h: 1060, page: 'page-5', title: 'Le refus, en trois temps' },
  ],
  annotations: [
    { id: 'moment-intro', x: 0, y: -230, w: 640, page: 'page-1', text: 'Le moment : juste après « C’est noté ». Trois directions, même contenu — ce qui va se passer, le choix du canal, le dialogue système seulement si la personne a dit oui.\n\nB, la feuille, est la candidate : un espace à elle, sans aucun chiffre, donc le visage est possible ; une cérémonie assumée pour la première fois. Cliquable de bout en bout : « C’est noté », le choix, « Autoriser » ou « Ne pas autoriser », puis la carte d’attente. Les deux réglages en tête changent la boucle (lundi / début du mois) et la présence d’un compte.' },
    { id: 'moment-prix', x: 500, y: -230, w: 890, page: 'page-1', text: 'A — en place : dans le contexte, mais au milieu des kilos, donc sans visage, et la carte devient très haute. C — fondu : le plus discret, mais l’explication est mince et le choix se cache derrière deux liens. Dans les deux, la permission est demandée sans qu’on ait vraiment dit ce qui va se passer.' },
    { id: 'attente-note', x: 480, y: 0, w: 460, page: 'page-2', text: 'Ce qui remplace « Rien à rattraper ». Ramille dit l’attente, pas le vide : « Je te fais signe lundi » quand un rappel partira, « On se retrouve ici lundi » sinon — elle revient dans l’app de toute façon.\n\nJamais un nombre dans sa bouche : le rythme est fixe, elle nomme le jour. Le réglage « canal » montre les quatre états ; « boucle » bascule sur le point mensuel.\n\nPosée au-dessus du cap, comme aujourd’hui : la règle « jamais près d’un chiffre lourd » vise l’empreinte, mais c’est à vérifier sur appareil (v1-11 §8).' },
    { id: 'rappel-note', x: 0, y: -130, w: 620, page: 'page-3', text: 'Contenu seulement. Un point, un message, jamais deux : la boîte d’envoi garantit déjà l’unicité par point, le canal en devient une colonne.' },
    { id: 'toi-note', x: 480, y: 0, w: 460, page: 'page-4', text: 'Le réglage à trois. Notification par défaut si elle est possible, email sinon, aucun toujours possible.\n\nLes indisponibilités disent pourquoi : « Rattache un compte » pour l’email, « Coupées dans les réglages du téléphone » pour la notification après un refus. Le réglage « situation » passe en revue les quatre cas — sur web, la notification n’existe pas et rien ne l’explique.\n\nCe bloc s’ouvre à tout le monde, sessions anonymes comprises : le push n’a pas besoin de compte.' },
    { id: 'refus-note', x: 0, y: -130, w: 620, page: 'page-5', text: 'Le cas qu’on oublie. Avec un compte rattaché, l’email prend le relais tout seul et la carte le dit. Sans compte, la carte nomme les deux portes — les réglages du téléphone, ou un compte — une fois, sans insister.' },
  ],
  launch: { view: 'canvas', page: 'page-1' },
};
writeFileSync('canvas.json', JSON.stringify(canvas, null, 2) + '\n');
console.log('artboards :', Object.keys(fichiers).join(', '));
