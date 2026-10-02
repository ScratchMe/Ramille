import React from 'react';
import { ContextStep } from 'ramille-design-system';

type Reponses = React.ComponentProps<typeof ContextStep>['answers'];

const VIERGE: Reponses = {
  commute_has_regular_trip: true,
  commute_days_per_week: 5,
  leisure_frequency: 'weekly',
  zone_type: null,
  transports_proches: null,
  household_vehicles: null,
  teletravail: null,
};

// Le contenu défilant de `StepShell`, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
const Etape = ({ depart }: { depart: Partial<Reponses> }) => {
  const [answers, setAnswers] = React.useState<Reponses>({ ...VIERGE, ...depart });
  return (
    <div style={{ maxWidth: 342 }}>
      <ContextStep answers={answers} update={(patch) => setAnswers((a) => ({ ...a, ...patch }))} />
    </div>
  );
};

/** Des sorties chaque semaine : aucune de ces réponses n'entre dans le calcul, et l'introduction le dit. */
export const SortiesRegulieres = () => <Etape depart={{}} />;

/**
 * Des sorties rares : le nombre de véhicules du foyer décide du mode des sorties occasionnelles,
 * donc la seconde phrase change.
 */
export const SortiesRares = () => <Etape depart={{ leisure_frequency: 'rarely', zone_type: 'rural' }} />;

/** Sans trajet régulier : trois questions, pas de télétravail. */
export const SansTrajetRegulier = () => (
  <Etape depart={{ commute_has_regular_trip: false, commute_days_per_week: null }} />
);
