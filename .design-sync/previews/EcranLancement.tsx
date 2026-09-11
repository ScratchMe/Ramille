import React from 'react';
import { EcranLancement } from 'ramille-design-system';

/** L'arrivée : la feuille se pose, expression calme. */
export const Arrivee = () => <EcranLancement mood="calm" />;

/** Puis elle sourit — l'expression change au sommet de l'à-coup, et rien d'autre ne bouge. */
export const PuisElleSourit = () => <EcranLancement mood="happy" />;
