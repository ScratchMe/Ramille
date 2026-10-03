import React from 'react';
import { LeisureFrequencyStep } from 'ramille-design-system';

type Reponses = React.ComponentProps<typeof LeisureFrequencyStep>['answers'];

// Le contenu défilant de `StepShell`, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
const Etape = ({ depart }: { depart: Reponses }) => {
  const [answers, setAnswers] = React.useState<Reponses>(depart);
  return (
    <div style={{ maxWidth: 342 }}>
      <LeisureFrequencyStep answers={answers} update={(patch) => setAnswers((a) => ({ ...a, ...patch }))} />
    </div>
  );
};

/**
 * Rien de choisi : la ligne d'exemples sous le titre — pour tous, avec ou sans trajet domicile-travail
 * (01/10/2026, `v1-33` D7) —, quatre rangées dans un groupe nommé par la question.
 */
export const Vierge = () => <Etape depart={{ leisure_frequency: null }} />;

/**
 * « Rarement » choisi : la ligne qui dit la petite base comptée par défaut s'ouvre sous cette
 * réponse, et seulement sous elle.
 */
export const Rarement = () => <Etape depart={{ leisure_frequency: 'rarely' }} />;

/**
 * « Deux ou trois fois par mois », la quatrième fréquence (02/10/2026, `v1-33` D5) : aucune ligne ne
 * s'ouvre — la base par défaut ne vaut que pour « Rarement ».
 */
export const DeuxOuTroisFoisParMois = () => <Etape depart={{ leisure_frequency: 'multiple_monthly' }} />;
