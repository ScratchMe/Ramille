import React from 'react';
import { GoogleButton, TextLink } from 'ramille-design-system';

/**
 * Le bouton Google, seule ombre du produit (0 1px 2px). Le bouton officiel n'est jamais
 * redessiné : ce composant est un substitut neutre pour les maquettes.
 */
export const Defaut = () => <GoogleButton />;

/** En cours : l'appel OAuth est parti, on ne propose pas de recommencer. */
export const EnCours = () => <GoogleButton loading />;

/** Dans l'écran de connexion, avec l'autre chemin juste en dessous. */
export const DansLEcranDeConnexion = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <GoogleButton label="Continuer avec Google" />
    <TextLink label="Utiliser un email à la place" type="linkPrimary" align="center" />
  </div>
);
