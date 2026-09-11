import React from 'react';
// Source : src/components/bilan/numeric-field.tsx — 64 de haut, bordure accent permanente, 28/600.

// **La virgule est un séparateur décimal, pas un caractère à jeter.** Filtrer tout ce qui
// n'est pas un chiffre ne donnait ni erreur ni refus pour « 3,5 » : ça donnait **35**. Le
// clavier numérique d'Android propose une virgule, et l'erreur porte sur le poste le plus
// lourd de la majorité des bilans, multiplié par deux fois le nombre de jours et par
// quarante-cinq semaines. Le dépôt le corrige dans `saisieVersNombre` (`src/types/bilan.ts`) ;
// en voici la forme minimale, pour que le kit ne montre pas le défaut d'avant.
function saisieVersNombre(saisie) {
  let vu = false;
  const propre = String(saisie).replace(/[^0-9.,]/g, '').replace(/[.,]/g, (s) => {
    if (vu) return ''; // un second séparateur est ignoré, sans jeter ses chiffres
    vu = true;
    return '.';
  });
  if (propre === '' || propre === '.') return null;
  const n = Number(propre);
  return Number.isFinite(n) ? n : null;
}
export function NumericField({ value, onChange, unit, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 64, borderRadius: 16, border: '1.5px solid var(--color-accent)', background: 'var(--color-background-element)', padding: '0 20px', boxSizing: 'border-box' }}>
      <input inputMode="numeric" aria-label={label + ', en ' + unit} placeholder="0" value={value == null ? '' : value}
        onChange={(e) => onChange && onChange(saisieVersNombre(e.target.value))}
        style={{ flex: 1, minWidth: 0, fontSize: 28, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--color-text)', background: 'transparent', border: 0, outline: 0, padding: 0 }} />
      <span style={{ fontSize: 17, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>{unit}</span>
    </div>
  );
}
