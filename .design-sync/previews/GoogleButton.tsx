import React from 'react';
import { GoogleButton, TextLink } from 'ramille-design-system';

/**
 * Le bouton Google : le « G » officiel, jamais redessiné, sans ombre. Son libellé est fixe,
 * « Se connecter avec Google » — il n'a pas de prop `label`.
 */
export const Defaut = () => <GoogleButton />;

/** En cours : la fenêtre Google s'ouvre ; un indicateur remplace logo et libellé, rien à recommencer. */
export const EnCours = () => <GoogleButton loading />;

/** Dans l'écran de connexion, avec l'autre chemin juste en dessous. */
export const DansLEcranDeConnexion = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <GoogleButton />
    <TextLink label="Utiliser un email à la place" type="linkPrimary" style={{ textAlign: 'center' }} />
  </div>
);
