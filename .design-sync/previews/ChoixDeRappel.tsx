import React from 'react';
import { ChoixDeRappel } from 'ramille-design-system';

/**
 * Les lignes d'un compte rattaché, telles que `lignesDeReglage` (src/types/rappels.ts) les écrit :
 * mêmes titres que la feuille des rappels, et l'email nomme l'adresse. Les identifiants de canal
 * sont `push`, `email` et `none` — `aucun`, que cet aperçu employait jusqu'au 26/09/2026, n'existe
 * plus : un identifiant inconnu ne lève rien, aucune ligne ne s'affiche choisie, et l'écran se lit
 * « pas encore choisi » alors que la préférence existe.
 */
const AVEC_COMPTE = [
  { canal: 'push', titre: 'Par notification sur ce téléphone', detail: 'Le matin où la question s’ouvre.' },
  { canal: 'email', titre: 'Par email', detail: 'À camille@exemple.fr.' },
  { canal: 'none', titre: 'Sans rappel', detail: 'On se retrouve dans l’app, à chaque point.' },
] as const;

/**
 * Le réglage du canal sur « Toi » — visible pour tout le monde, compte rattaché ou non : le
 * push n'a besoin que d'un jeton d'appareil. C'est pour cela que l'email, lui, est la seule
 * ligne que le défaut ferme tant qu'aucun compte n'est rattaché.
 */
export const Notification = () => <ChoixDeRappel canal="push" />;

/** Avec un compte rattaché, l'email devient choisissable, et il nomme l'adresse. */
export const Email = () => <ChoixDeRappel canal="email" lignes={[...AVEC_COMPTE]} />;

/** « Sans rappel » est un choix qui se garde, pas une absence de réglage. */
export const SansRappel = () => <ChoixDeRappel canal="none" lignes={[...AVEC_COMPTE]} />;

/**
 * Notifications fermées dans les réglages du téléphone. C'est la seule situation où on
 * l'affirme : une absence de jeton, à elle seule, n'accuse personne — elle recouvre aussi
 * « jamais demandée », « enregistrement échoué » et « simulateur ». Sans compte, la ligne porte le
 * lien vers les réglages et c'est « Sans rappel » qui reste.
 */
export const NotificationsFermees = () => <ChoixDeRappel canal="none" permission="fermee" />;
