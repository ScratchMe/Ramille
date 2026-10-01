import React from 'react';
import { FlightsStep } from 'ramille-design-system';

type Reponses = React.ComponentProps<typeof FlightsStep>['answers'];

// Le contenu défilant de `StepShell`, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
const Etape = ({ depart }: { depart: Reponses }) => {
  const [answers, setAnswers] = React.useState<Reponses>(depart);
  return (
    <div style={{ maxWidth: 342 }}>
      <FlightsStep answers={answers} update={(patch) => setAnswers((a) => ({ ...a, ...patch }))} />
    </div>
  );
};

/** À l'arrivée : la question seule, onze puces jusqu'à « 10+ » dont aucune n'est cochée, et les distances supposées en bas. */
export const SansReponse = () => <Etape depart={{ flights_total_per_year: null, flights_short_per_year: null }} />;

/** Aucun vol, répondu : « 0 » coché, rien ne s'ouvre dessous. */
export const AucunVol = () => <Etape depart={{ flights_total_per_year: 0, flights_short_per_year: 0 }} />;

/** Quatre vols, pas encore répartis : la seconde question s'ouvre sous un filet, de 0 au total. */
export const CourtsARepartir = () => <Etape depart={{ flights_total_per_year: 4, flights_short_per_year: null }} />;

/** Répartis : le produit dit ce qu'il comptera en long-courrier. */
export const UnLongCourrier = () => <Etape depart={{ flights_total_per_year: 4, flights_short_per_year: 3 }} />;

/** La même phrase au pluriel. */
export const PlusieursLongsCourriers = () => <Etape depart={{ flights_total_per_year: 6, flights_short_per_year: 2 }} />;

/** Tous les vols sont courts : la confirmation reste, et le zéro se dit en mots. */
export const AucunLongCourrier = () => <Etape depart={{ flights_total_per_year: 2, flights_short_per_year: 2 }} />;
