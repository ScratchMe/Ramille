import { useSyncExternalStore } from 'react';

const sansAbonnement = () => () => {};
const surLeClient = () => true;
const auRenduStatique = () => false;

/**
 * `false` tant que l'écran rend ce que contient le HTML statique, `true` ensuite (24/09/2026,
 * `v1-29`).
 *
 * **Pourquoi un écran en a besoin.** L'export statique rend chaque page sans chaîne de requête :
 * il ne connaît que le chemin. Un texte qui dépend de `?source=` ou de `?jeton=` diffère donc
 * entre le HTML servi et le premier rendu du navigateur, qui, lui, lit l'URL — React le constate à
 * l'hydratation (erreur n° 418), jette le HTML et refait toute la page côté client. Relevé sur
 * l'export le 24/09/2026 : `/connexion?source=compte` servait « Plus tard » là où le navigateur
 * rendait « Retour », et `/rappels/stop?jeton=…` servait « Ce lien n'est plus valable » à tous ceux
 * qui ouvrent le lien d'un rappel — le temps que l'app démarre, c'est ce qu'ils lisaient.
 *
 * La règle est celle d'`EXPO.md` §2.2 : l'état de départ est celui du rendu statique, et il change
 * **après** l'hydratation. `useSyncExternalStore` fait voir ce passage à React : l'instantané
 * serveur sert au rendu statique et au rendu d'hydratation, puis React relit l'instantané client
 * et rend à nouveau. Là où il n'y a pas d'hydratation — sur natif, ou en naviguant dans l'app —
 * l'instantané client est lu d'emblée : la valeur vaut `true` dès le premier rendu, sans rendu de
 * transition.
 *
 * C'est la mécanique de `use-color-scheme.web.ts`, qui la porte encore pour son propre compte.
 */
export function useApresHydratation(): boolean {
  return useSyncExternalStore(sansAbonnement, surLeClient, auRenduStatique);
}
