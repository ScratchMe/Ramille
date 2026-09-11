import React from 'react';
import { NumericField } from 'ramille-design-system';

/** Le champ de distance du questionnaire : 64 px, bordure accent, l'unité à droite. */
export const Rempli = () => (
  <NumericField value={12} unit="km" label="Distance d’un aller" />
);

/**
 * Vide : le libellé dit ce qu'on demande — « km » seul n'est pas un libellé, et un zéro
 * saisi n'est pas une distance (la colonne porte `check (commute_distance_km > 0)`).
 */
export const Vide = () => (
  <NumericField value={null} unit="km" label="Distance d’un aller" />
);

/** Une décimale : la virgule est un séparateur, jamais un caractère à jeter. */
export const AvecDecimale = () => (
  <NumericField value={3.5} unit="km" label="Distance d’un aller" />
);

/** Les trois postes, l'un sous l'autre. */
export const LesTroisPostes = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <NumericField value={12} unit="km" label="Distance d’un aller" />
    <NumericField value={40} unit="km" label="Distance d’une sortie du week-end" />
    <NumericField value={2} unit="voyages" label="Voyages de plus de 300 km par an" />
  </div>
);
