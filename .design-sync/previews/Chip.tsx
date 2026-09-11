import React from 'react';
import { Chip } from 'ramille-design-system';

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Les jours de la semaine : équirépartis, rayon 14, deux jours retenus. */
export const JoursDeLaSemaine = () => (
  <div style={{ display: 'flex', gap: 6 }}>
    {JOURS.map((d, i) => <Chip key={i} label={d} selected={i === 1 || i === 3} flex radius={14} />)}
  </div>
);

/** Oui / Non : `outline` — teinte plus bordure accent, pour un choix qui n'est pas un nombre. */
export const OuiNon = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    <Chip label="Oui" selected selectedStyle="outline" flex />
    <Chip label="Non" selected={false} flex />
  </div>
);

/** Les tranches de distance : `solid` — accent plein et blanc, c'est la forme des nombres. */
export const Tranches = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <Chip label="< 5 km" selected={false} />
    <Chip label="5–15" selected />
    <Chip label="15–30" selected={false} />
    <Chip label="30–60" selected={false} />
    <Chip label="> 60" selected={false} />
  </div>
);

/** Un picker de nombre de jours, rien de retenu encore. */
export const NombreDeJours = () => (
  <div style={{ display: 'flex', gap: 6 }}>
    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
      <Chip key={n} label={String(n)} selected={n === 4} flex ariaLabel={`${n} jours par semaine`} />
    ))}
  </div>
);
