import React from 'react';
import { GroupeDeChoix, LigneDeCanal } from 'ramille-design-system';

const QUESTION = 'Comment tu préfères que je te fasse signe ?';

/**
 * Les trois lignes d'un appareil sans compte : l'email n'est pas choisissable, et le dit par son
 * détail — jamais par une opacité.
 */
export const SansCompte = () => (
  <GroupeDeChoix question={QUESTION} style={{ gap: 8 }}>
    <LigneDeCanal ligne={{ canal: 'push', titre: 'Par notification sur ce téléphone', detail: 'À activer en une fois.', choisi: true }} />
    <LigneDeCanal ligne={{ canal: 'email', titre: 'Par email', detail: 'Rattache un compte pour l’activer.', choisissable: false }} />
    <LigneDeCanal ligne={{ canal: 'none', titre: 'Sans rappel', detail: 'On se retrouve dans l’app, à chaque point.' }} />
  </GroupeDeChoix>
);

/**
 * La préférence enregistrée est l'email, mais sans compte il ne partira pas : la ligne ne paraît
 * pas choisie, parce que ce qui paraît coché est ce qui partira vraiment.
 */
export const PreferenceInjoignable = () => (
  <GroupeDeChoix question={QUESTION} style={{ gap: 8 }}>
    <LigneDeCanal ligne={{ canal: 'push', titre: 'Par notification sur ce téléphone', detail: 'À activer en une fois.' }} />
    <LigneDeCanal ligne={{ canal: 'email', titre: 'Par email', detail: 'Rattache un compte pour l’activer.', choisi: true, choisissable: false }} />
    <LigneDeCanal ligne={{ canal: 'none', titre: 'Sans rappel', detail: 'On se retrouve dans l’app, à chaque point.' }} />
  </GroupeDeChoix>
);

/** Avec un compte rattaché, l'email nomme l'adresse. */
export const AvecCompte = () => (
  <GroupeDeChoix question={QUESTION} style={{ gap: 8 }}>
    <LigneDeCanal ligne={{ canal: 'push', titre: 'Par notification sur ce téléphone', detail: 'Le matin où la question s’ouvre.' }} />
    <LigneDeCanal ligne={{ canal: 'email', titre: 'Par email', detail: 'À camille@exemple.fr.', choisi: true }} />
    <LigneDeCanal ligne={{ canal: 'none', titre: 'Sans rappel', detail: 'On se retrouve dans l’app, à chaque point.' }} />
  </GroupeDeChoix>
);
