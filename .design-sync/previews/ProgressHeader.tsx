import React from 'react';
import { ProgressHeader } from 'ramille-design-system';

/**
 * L'en-tête du questionnaire. `total` est le nombre d'écrans réellement affichés à cette
 * personne, recalculé à chaque branchement — pas le nombre d'étapes de la spec.
 */
export const Debut = () => <ProgressHeader section="Domicile-travail" step={3} total={9} />;

export const AuMilieu = () => <ProgressHeader section="Weekend et loisirs" step={2} total={6} />;

/** Le dernier écran : la barre est pleine, il n'y a pas de célébration. */
export const DernierEcran = () => <ProgressHeader section="Contexte" step={9} total={9} />;
