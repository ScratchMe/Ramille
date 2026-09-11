import React from 'react';
import { ChoixDeRappel } from 'ramille-design-system';

/**
 * Les identifiants de canal du kit sont `push`, `email` et **`aucun`** — pas `none`. Un
 * identifiant inconnu ne lève rien : aucune ligne ne s'affiche sélectionnée, et l'écran se lit
 * « pas encore choisi » alors que la préférence existe.
 */
const AVEC_COMPTE = [
  { canal: 'push', titre: 'Une notification', detail: 'Sur ce téléphone, le lundi matin.' },
  { canal: 'email', titre: 'Un email', detail: 'À l’adresse de ton compte.' },
  { canal: 'aucun', titre: 'Rien', detail: 'On se retrouve ici lundi.' },
];

/**
 * Le réglage du canal sur « Toi » — visible pour tout le monde, compte rattaché ou non : le
 * push n'a besoin que d'un jeton d'appareil. C'est pour cela que l'email, lui, est la seule
 * ligne que le défaut ferme tant qu'aucun compte n'est rattaché.
 */
export const Notification = () => <ChoixDeRappel canal="push" />;

/** Avec un compte rattaché, l'email devient choisissable. */
export const Email = () => <ChoixDeRappel canal="email" lignes={AVEC_COMPTE} />;

/** « Rien » est un choix qui se garde, pas une absence de réglage. */
export const Rien = () => <ChoixDeRappel canal="aucun" lignes={AVEC_COMPTE} />;

/**
 * Notifications fermées dans les réglages du téléphone. C'est la seule situation où on
 * l'affirme : une absence de jeton, à elle seule, n'accuse personne — elle recouvre aussi
 * « jamais demandée », « enregistrement échoué » et « simulateur ».
 */
export const NotificationsFermees = () => (
  <ChoixDeRappel
    canal="email"
    lignes={[
      { canal: 'push', titre: 'Une notification', detail: 'Les notifications sont coupées dans les réglages du téléphone.', choisissable: false },
      { canal: 'email', titre: 'Un email', detail: 'À l’adresse de ton compte.' },
      { canal: 'aucun', titre: 'Rien', detail: 'On se retrouve ici lundi.' },
    ]}
  />
);
