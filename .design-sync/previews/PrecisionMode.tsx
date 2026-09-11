import React from 'react';
import { ModeListItem, PrecisionMode } from 'ramille-design-system';

/**
 * La motorisation : quatre réponses au même niveau, jamais un second « rechargeable ou
 * non ? » — la profondeur coûte plus cher en abandon qu'une puce de plus.
 */
export const Motorisation = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <ModeListItem label="Voiture (seul)" selected />
    <PrecisionMode
      question="Quelle motorisation ?"
      valeur="thermique"
      options={[
        { value: 'thermique', label: 'Thermique' },
        { value: 'hybride', label: 'Hybride' },
        { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
        { value: 'electrique', label: 'Électrique' },
      ]}
    />
  </div>
);

/**
 * Le deux-roues, même mécanique et pour une raison plus forte : une grosse moto émet une
 * fois et demie une voiture thermique, 2,8 fois un scooter.
 */
export const TypeDeDeuxRoues = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <ModeListItem label="Deux-roues motorisé" selected />
    <PrecisionMode
      question="Lequel ?"
      valeur={null}
      options={[
        { value: 'scooter_thermique', label: 'Scooter thermique' },
        { value: 'scooter_electrique', label: 'Scooter électrique' },
        { value: 'moto_petite', label: 'Moto petite cylindrée' },
        { value: 'moto_grosse', label: 'Moto grosse cylindrée' },
      ]}
    />
  </div>
);
