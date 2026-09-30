import React from 'react';
import { Button } from 'ramille-design-system';

/** Le bouton principal d'un flux : pleine largeur, accent, pied collant. */
export const Principal = () => <Button title="Continuer" />;

/** Secondaire sur surface élément — un choix qui n'est pas celui qu'on attend. */
export const Secondaire = () => <Button title="Revoir mon plan" variant="secondary" />;

/**
 * En attente — le « Suivant » d'une étape incomplète : l'apparence du désactivé (fond élément, texte
 * tertiaire, jamais une opacité), mais un bouton ordinaire, ni `disabled` ni `aria-disabled`. Il agit :
 * au toucher, `StepShell` dit ce qui manque au-dessus de lui et y mène. Le libellé ne change jamais.
 */
export const EnAttente = () => <Button title="Suivant" enAttente />;

/**
 * Désactivé — ce qui n'agit vraiment pas : le « C’est noté » d'une feuille d'engagement tant que l'intention
 * n'est pas complète (aucun jour, ou aucune échéance). Même apparence qu'en attente, mais inerte, et annoncé
 * indisponible.
 */
export const Desactive = () => <Button title="C’est noté" disabled />;

/** La rangée du questionnaire : Retour garde sa largeur, Suivant prend le reste. */
export const RangeeRetourSuivant = () => (
  <div style={{ display: 'flex', gap: 16 }}>
    <Button title="Retour" variant="secondary" style={{ width: 'auto' }} />
    <Button title="Suivant" flex />
  </div>
);
