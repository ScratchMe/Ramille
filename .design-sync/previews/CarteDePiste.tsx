import React from 'react';
import { CarteDePiste } from 'ramille-design-system';

const velo = {
  id: 'a1',
  saving_kg_year: 184,
  saving_share_percent: 7,
  detail_text: 'Sur tes 4 trajets par semaine.',
  first_step: 'Repère un itinéraire cyclable avant ton premier jour.',
  committed_at: null,
  intention_days: null,
  intention_timing: null,
  carried_over_from: null,
  action_templates: { action_text: 'Faire un trajet sur cinq à vélo', poste: 'commute' as const },
};

const avion = {
  id: 'a2',
  saving_kg_year: 412,
  saving_share_percent: 16,
  detail_text: 'Sur 2 vols court ou moyen-courrier déclarés.',
  first_step: 'Compare les horaires en train sur le voyage que tu prévois.',
  committed_at: null,
  intention_days: null,
  intention_timing: null,
  carried_over_from: null,
  action_templates: { action_text: 'Remplacer un aller-retour en avion par le train', poste: 'travel' as const },
};

/** Proposée : rien d'engagé encore, le bouton pour s'engager. */
export const Proposee = () => <CarteDePiste action={velo} />;

/** Le choix de l'intention ouvert — des jours, parce que c'est le trajet domicile-travail. */
export const ChoixDesJours = () => <CarteDePiste action={velo} choixOuvert joursChoisis={[2, 4]} />;

/** Engagée : l'intention et le premier pas viennent de la ligne. */
export const Engagee = () => (
  <CarteDePiste
    action={{ ...velo, committed_at: '2026-09-15T08:00:00Z', intention_days: [2, 4] }}
    committedActionId="a1"
  />
);

/** Reconduite d'une saison à l'autre : l'étiquette le dit, et le premier pas n'a plus lieu d'être. */
export const Reconduite = () => (
  <CarteDePiste
    action={{ ...velo, committed_at: '2026-09-01T06:00:00Z', intention_days: [2, 4], carried_over_from: 'c0' }}
    committedActionId="a1"
  />
);

/** Une autre action est engagée : celle-ci recule par son cadre, et reste choisissable. */
export const UneAutreEstEngagee = () => <CarteDePiste action={avion} committedActionId="a1" />;

/** Les voyages ont leurs échéances, fermées : jamais « ce mois-ci » pour un vol. */
export const ChoixDeLEcheance = () => (
  <CarteDePiste action={avion} choixOuvert echeanceChoisie="au_prochain_voyage" />
);
