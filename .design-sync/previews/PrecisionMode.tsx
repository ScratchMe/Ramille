import React from 'react';
import { BoiteDePrecision, ModeListItem, PrecisionMode } from 'ramille-design-system';

/**
 * La motorisation : quatre réponses au même niveau, jamais un second « rechargeable ou
 * non ? » — la profondeur coûte plus cher en abandon qu'une puce de plus. La précision ne dessine
 * pas de boîte : c'est `BoiteDePrecision`, sous le mode, qui la porte.
 */
export const Motorisation = () => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <ModeListItem label="Voiture (seul)" selected />
    <BoiteDePrecision>
      <PrecisionMode
        champ="commute_car_engine"
        question="Quelle motorisation ?"
        valeur="thermique"
        options={[
          { value: 'thermique', label: 'Thermique' },
          { value: 'hybride', label: 'Hybride' },
          { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
          { value: 'electrique', label: 'Électrique' },
        ]}
      />
    </BoiteDePrecision>
  </div>
);

/**
 * Le deux-roues, même mécanique et pour une raison plus forte : une grosse moto émet une
 * fois et demie une voiture thermique, 2,8 fois un scooter.
 */
export const TypeDeDeuxRoues = () => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <ModeListItem label="Deux-roues motorisé" selected />
    <BoiteDePrecision>
      <PrecisionMode
        champ="commute_two_wheeler_type"
        question="Quel type de deux-roues ?"
        valeur={null}
        options={[
          { value: 'scooter_thermique', label: 'Scooter thermique' },
          { value: 'scooter_electrique', label: 'Scooter électrique' },
          { value: 'moto_petite', label: 'Moto, petite cylindrée' },
          { value: 'moto_grosse', label: 'Moto, grosse cylindrée' },
        ]}
      />
    </BoiteDePrecision>
  </div>
);
