import React from 'react';
import { Chip } from 'ramille-design-system';

/**
 * Chaque puce annonce son rôle, et la prop est obligatoire : `radio` dans une série à choix
 * unique, `checkbox` quand les puces se cumulent (les jours de l'engagement). Jamais `button`.
 */
const JOURS = [
  ['L', 'lundi'],
  ['M', 'mardi'],
  ['M', 'mercredi'],
  ['J', 'jeudi'],
  ['V', 'vendredi'],
  ['S', 'samedi'],
  ['D', 'dimanche'],
] as const;

/**
 * Les jours de l'engagement : des cases à cocher, deux jours retenus, rayon 14. Deux jours portent
 * l'initiale « M » : le lecteur d'écran entend le mot entier (`accessibilityLabel`).
 */
export const JoursDeLaSemaine = () => (
  <div style={{ display: 'flex', gap: 6 }}>
    {JOURS.map(([initiale, jour], i) => (
      <Chip key={jour} label={initiale} accessibilityLabel={jour} role="checkbox" selected={i === 1 || i === 3} flex radius={14} />
    ))}
  </div>
);

/** Oui / Non : `outline` — teinte plus bordure accent, pour un choix qui n'est pas un nombre. */
export const OuiNon = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    <Chip label="Oui" role="radio" selected selectedStyle="outline" radius={16} flex />
    <Chip label="Non" role="radio" selected={false} radius={16} flex />
  </div>
);

/** Les tranches de distance des sorties : `solid`, en pilule — libellés du questionnaire. */
export const Tranches = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <Chip label="Moins de 5 km" role="radio" selected={false} />
    <Chip label="5 à 15 km" role="radio" selected />
    <Chip label="15 à 30 km" role="radio" selected={false} />
    <Chip label="Plus de 30 km" role="radio" selected={false} />
  </div>
);

/** Le nombre de jours de trajet par semaine : une série de chiffres, rayon 14. */
export const NombreDeJours = () => (
  <div style={{ display: 'flex', gap: 6 }}>
    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
      <Chip key={n} label={String(n)} role="radio" selected={n === 4} flex radius={14} accessibilityLabel={`${n} jours par semaine`} />
    ))}
  </div>
);
