import React from 'react';
import { ModeListItem } from 'ramille-design-system';

/**
 * La liste des modes du trajet domicile-travail. « Voiture (seul) » ne dit jamais la
 * motorisation : la question de suivi s'ouvre juste en dessous (voir PrecisionMode).
 */
export const ListeDesModes = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <ModeListItem label="Voiture (seul)" selected />
    <ModeListItem label="Voiture (covoiturage)" selected={false} />
    <ModeListItem label="Deux-roues motorisé" selected={false} />
    <ModeListItem label="Train" selected={false} />
    <ModeListItem label="Bus" selected={false} />
    <ModeListItem label="Vélo" selected={false} />
    <ModeListItem label="À pied" selected={false} />
  </div>
);

/** Dans un encart déjà teinté, le non-sélectionné passe au blanc pour rester lisible. */
export const DansUnEncartTeinte = () => (
  <div style={{ background: 'var(--color-background-selected)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <ModeListItem label="Train" selected nestedBackground />
    <ModeListItem label="Bus" selected={false} nestedBackground />
  </div>
);
