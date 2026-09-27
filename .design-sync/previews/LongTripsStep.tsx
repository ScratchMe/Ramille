import React from 'react';
import { LongTripsStep } from 'ramille-design-system';

type Reponses = React.ComponentProps<typeof LongTripsStep>['answers'];

const VIERGE: Reponses = {
  train_long_trips_per_year: 0,
  coach_long_trips_per_year: 0,
  car_long_trips_per_year: 0,
  car_long_trips_engine: null,
  car_long_trips_occupancy: null,
};

// Le contenu défilant de `StepShell`, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
const Etape = ({ depart }: { depart: Partial<Reponses> }) => {
  const [answers, setAnswers] = React.useState<Reponses>({ ...VIERGE, ...depart });
  return (
    <div style={{ maxWidth: 342 }}>
      <LongTripsStep answers={answers} update={(patch) => setAnswers((a) => ({ ...a, ...patch }))} />
    </div>
  );
};

/** Aucun trajet : trois séries identiques, chacune dans un groupe qui porte son nom complet. */
export const AucunTrajet = () => <Etape depart={{}} />;

/** Du train et un peu d'autocar : l'autocar n'ouvre rien, ce n'est pas le véhicule de la personne. */
export const TrainEtAutocar = () => <Etape depart={{ train_long_trips_per_year: 4, coach_long_trips_per_year: 1 }} />;

/**
 * Des trajets en voiture : la motorisation puis le nombre de personnes s'ouvrent sous les puces,
 * hors du groupe — ils dépendent d'un compte, pas d'une option.
 */
export const EnVoiture = () => (
  <Etape depart={{ car_long_trips_per_year: 2, car_long_trips_engine: 'electrique', car_long_trips_occupancy: 3 }} />
);
