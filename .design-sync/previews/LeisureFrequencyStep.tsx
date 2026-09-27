import React from 'react';
import { LeisureFrequencyStep } from 'ramille-design-system';

type Reponses = React.ComponentProps<typeof LeisureFrequencyStep>['answers'];

// Le contenu défilant de `StepShell`, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
const Etape = ({ depart, total }: { depart: Reponses; total: number }) => {
  const [answers, setAnswers] = React.useState<Reponses>(depart);
  return (
    <div style={{ maxWidth: 342 }}>
      <LeisureFrequencyStep answers={answers} update={(patch) => setAnswers((a) => ({ ...a, ...patch }))} total={total} />
    </div>
  );
};

/** Rien de choisi : la ligne d'exemples sous le titre, trois rangées dans un groupe nommé par la question. */
export const Vierge = () => <Etape depart={{ commute_has_regular_trip: true, leisure_frequency: null }} total={9} />;

/**
 * « Rarement » choisi : la ligne qui dit la petite base comptée par défaut s'ouvre sous cette
 * réponse, et seulement sous elle.
 */
export const Rarement = () => <Etape depart={{ commute_has_regular_trip: true, leisure_frequency: 'rarely' }} total={8} />;

/** Sans trajet domicile-travail : la ligne d'exemples cède la place au nombre d'étapes du questionnaire. */
export const SansTrajetDomicileTravail = () => (
  <Etape depart={{ commute_has_regular_trip: false, leisure_frequency: null }} total={6} />
);
