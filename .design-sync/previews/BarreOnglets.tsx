import React from 'react';
import { BarreOnglets } from 'ramille-design-system';

const Cadre = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>{children}</div>
);

/**
 * Deux destinations, et le reste n'est pas un lieu : le questionnaire et l'onboarding sont
 * des flux, le compte un détour. Ajouter une route au groupe d'onglets lui donnerait un
 * troisième onglet, ce qui est presque toujours une erreur.
 */
export const PlanActif = () => <Cadre><BarreOnglets actif="plan" /></Cadre>;

export const SuiviActif = () => <Cadre><BarreOnglets actif="suivi" /></Cadre>;

/** Avec l'encoche basse de l'appareil, ajoutée à la hauteur de 60. */
export const AvecEncoche = () => <Cadre><BarreOnglets actif="plan" insetBottom={24} /></Cadre>;
