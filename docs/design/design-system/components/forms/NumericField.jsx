import React from 'react';
// Source : src/components/bilan/numeric-field.tsx — 64 de haut, contour `fieldBorder` au repos et accent une
// fois un nombre saisi ou au focus (`Stroke.field`), chiffre 28/600 à chasse égale, unité 17/24. Au focus,
// l'anneau du navigateur suit le cadre, et plus l'`<input>` (`cadreDuChamp`, 01/10/2026). Vide, il ne montre rien
// dedans : l'intitulé et l'unité disent ce qu'on attend, le contour dit qu'il y a un champ (pas de « 0 » gris).

// **La virgule est un séparateur décimal, pas un caractère à jeter.** Filtrer tout ce qui
// n'est pas un chiffre ne donnait ni erreur ni refus pour « 3,5 » : ça donnait **35**. Le
// clavier numérique d'Android propose une virgule, et l'erreur porte sur le poste le plus
// lourd de la majorité des bilans, multiplié par deux fois le nombre de jours et par
// quarante-cinq semaines. Le dépôt le corrige dans `src/types/bilan.ts` ; en voici la forme
// minimale, pour que le kit ne montre pas le défaut d'avant.
const nettoyerSaisieNumerique = (texte) => {
  let vu = false;
  let nettoye = '';
  for (const c of String(texte)) {
    if (c >= '0' && c <= '9') nettoye += c;
    else if ((c === ',' || c === '.') && !vu) { vu = true; nettoye += ','; } // un second séparateur est ignoré
  }
  return nettoye;
};
const saisieVersNombre = (saisie) => {
  if (!/[0-9]/.test(saisie)) return null;
  const n = Number(saisie.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const afficherNombreSaisi = (valeur) => (valeur == null ? '' : String(valeur).replace('.', ','));
export function NumericField({ value, onChange, unit, label }) {
  // La saisie est gardée telle quelle pendant la frappe : la reformater depuis le nombre réécrirait
  // « 3, » en « 3 », et la décimale deviendrait impossible à taper.
  const [saisie, setSaisie] = React.useState(() => afficherNombreSaisi(value));
  const [valeurConnue, setValeurConnue] = React.useState(value);
  const [focus, setFocus] = React.useState(false);
  if (value !== valeurConnue) {
    setValeurConnue(value);
    setSaisie(afficherNombreSaisi(value));
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 64, borderRadius: 16, border: 'var(--stroke-field) solid ' + (saisie.length > 0 || focus ? 'var(--color-accent)' : 'var(--color-field-border)'), outline: focus ? 'auto' : 'none', background: 'var(--color-background-element)', padding: '0 20px' }}>
      <input inputMode="decimal" aria-label={label + ', en ' + unit} value={saisie} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onChange={(e) => {
          const nettoye = nettoyerSaisieNumerique(e.target.value);
          const valeur = saisieVersNombre(nettoye);
          setSaisie(nettoye);
          setValeurConnue(valeur);
          if (onChange) onChange(valeur);
        }}
        style={{ flex: 1, minWidth: 0, fontSize: 28, fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans)', color: 'var(--color-text)', background: 'transparent', border: 0, outline: 0, padding: 0 }} />
      <span style={{ fontSize: 17, lineHeight: '24px', fontWeight: 500, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>{unit}</span>
    </div>
  );
}
