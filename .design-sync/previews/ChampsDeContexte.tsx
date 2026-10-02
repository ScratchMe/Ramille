import React from 'react';
import { ChampsDeContexte } from 'ramille-design-system';

type Choix = React.ComponentProps<typeof ChampsDeContexte>['choix'];
type Trajet = React.ComponentProps<typeof ChampsDeContexte>['trajet'];

const VIERGE: Choix = { zone_type: null, transports_proches: null, household_vehicles: null, teletravail: null };

// L'écran hôte espace les questions de 24 : le composant rend un fragment.
const Hote = ({ depart, trajet }: { depart: Choix; trajet: Trajet }) => {
  const [choix, setChoix] = React.useState<Choix>(depart);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 342 }}>
      <ChampsDeContexte choix={choix} trajet={trajet} update={(patch) => setChoix((c) => ({ ...c, ...patch }))} />
    </div>
  );
};

/**
 * Les quatre questions, rien de répondu : cinq jours de trajet, donc la question du télétravail se
 * pose et nomme ce nombre.
 */
export const QuatreQuestions = () => (
  <Hote depart={VIERGE} trajet={{ commute_has_regular_trip: true, commute_days_per_week: 5 }} />
);

/** Ouvert pour corriger, comme sur l'écran `/contexte` : les réponses déjà données sont cochées. */
export const Prerempli = () => (
  <Hote
    depart={{ zone_type: 'periurbain', transports_proches: ['train', 'bus'], household_vehicles: '1', teletravail: 'un_jour' }}
    trajet={{ commute_has_regular_trip: true, commute_days_per_week: 4 }}
  />
);

/** Sans trajet régulier, la question du télétravail n'a pas d'objet : trois questions seulement. */
export const SansTeletravail = () => (
  <Hote depart={VIERGE} trajet={{ commute_has_regular_trip: false, commute_days_per_week: null }} />
);
