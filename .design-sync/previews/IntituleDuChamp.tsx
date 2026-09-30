import React from 'react';
import { IntituleDuChamp } from 'ramille-design-system';

/**
 * Les intitulés de tous les jours : une précision en `textSecondary`, « Lequel ? » en `textTertiary`, un sous-titre
 * d'étape en `text`. Rien ne change pendant qu'on répond.
 */
export const TousLesJours = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <IntituleDuChamp marque={false} type="small" themeColor="textSecondary">
      Vous êtes combien à partager ce trajet ?
    </IntituleDuChamp>
    <IntituleDuChamp marque={false} type="small" themeColor="textTertiary">
      Lequel ?
    </IntituleDuChamp>
    <IntituleDuChamp marque={false} type="subtitle" style={{ fontSize: 22, lineHeight: '28px' }}>
      Sur ces 2, combien sont courts ?
    </IntituleDuChamp>
  </div>
);

/**
 * Les mêmes, marqués : au toucher du « Suivant » en attente, l'intitulé de ce qui manque passe en `accentText` 600,
 * quelle que soit sa couleur de tous les jours. Jamais le titre de l'étape — il est la question.
 */
export const Marques = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <IntituleDuChamp marque type="small" themeColor="textSecondary">
      Vous êtes combien à partager ce trajet ?
    </IntituleDuChamp>
    <IntituleDuChamp marque type="small" themeColor="textTertiary">
      Lequel ?
    </IntituleDuChamp>
    <IntituleDuChamp marque type="subtitle" style={{ fontSize: 22, lineHeight: '28px' }}>
      Sur ces 2, combien sont courts ?
    </IntituleDuChamp>
  </div>
);
