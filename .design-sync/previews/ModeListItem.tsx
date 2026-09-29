import React from 'react';
import { BoiteDePrecision, ModeListItem } from 'ramille-design-system';

// Les libellés de `COMMUTE_MODE_CHOICES` (src/constants/transport-modes.ts), recopiés, dans les trois familles de
// `MODES_PAR_FAMILLE` : motorisés, collectifs, actifs.
const FAMILLES = [
  ['Voiture (seul)', 'Voiture (covoiturage)', 'Deux-roues motorisé'],
  ['Bus', 'Train', 'Métro ou tram'],
  ['Vélo', 'Marche', 'Trottinette ou mobilité douce'],
];

/**
 * La liste des modes du trajet domicile-travail : des rangées de 48, 4 px dans une famille, 16 entre deux, sans
 * intertitre. « Voiture (seul) » ne dit jamais la motorisation : la question de suivi s'ouvre juste en dessous
 * (voir `BoiteDePrecision`).
 */
export const ListeDesModes = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {FAMILLES.map((famille) => (
      <div key={famille[0]} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {famille.map((libelle) => (
          <ModeListItem key={libelle} label={libelle} selected={libelle === 'Voiture (seul)'} />
        ))}
      </div>
    ))}
  </div>
);

/** Dans une boîte de précision, déjà teintée, les réponses prennent le fond de la page pour rester lisibles. */
export const DansUneBoite = () => (
  <BoiteDePrecision>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <ModeListItem label="TER ou train régional" selected={false} nestedBackground />
      <ModeListItem label="RER ou Transilien" selected nestedBackground />
      <ModeListItem label="Intercités" selected={false} nestedBackground />
    </div>
  </BoiteDePrecision>
);
