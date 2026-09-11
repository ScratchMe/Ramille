import React from 'react';
import { RamilleDit } from 'ramille-design-system';

/**
 * Ce qu'elle dit vient de `src/constants/mascotte.ts` et de nulle part ailleurs. Trois règles
 * tenues par un test : première personne et tutoiement ; jamais un nombre dans sa bouche ;
 * jamais « tu devrais » ni « il faut ».
 */
export const ApresUnePeriodeTenue = () => (
  <RamilleDit mood="happy" ligne="Bien joué — chaque changement compte." />
);

/** Une période sans le trajet : un fait, pas une faute, et la question reviendra. */
export const ApresUnePeriodeSansLeTrajet = () => (
  <RamilleDit mood="encouraging" ligne="Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point." />
);

/**
 * L'attente entre deux points. Elle nomme le jour sans jamais compter — le rythme est fixe,
 * c'est ce qui le lui permet.
 */
export const EnAttente = () => (
  <RamilleDit mood="calm" size={44} themeColor="text" tilt={-6} ligne="Je te fais signe lundi." />
);

/** La période calme du suivi, sur le thème sombre. */
export const PeriodeCalme = () => (
  <div data-theme="dark" style={{ background: 'var(--color-background)', padding: 16, borderRadius: 18 }}>
    <RamilleDit mood="resting" ligne="Je note tes réponses ici, au fil des saisons." />
  </div>
);
