import React from 'react';
import { FlightsStep } from 'ramille-design-system';

type Reponses = React.ComponentProps<typeof FlightsStep>['answers'];

// Le contenu défilant de `StepShell`, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
// « 10+ » touché : le dépôt tient ce drapeau hors des colonnes (`plafond`), puisque le champ peut rester vide.
const Etape = ({ depart, plafond: plafondAuDepart = false }: { depart: Reponses; plafond?: boolean }) => {
  const [answers, setAnswers] = React.useState<Reponses>(depart);
  const [plafond, setPlafond] = React.useState(plafondAuDepart);
  return (
    <div style={{ maxWidth: 342 }}>
      <FlightsStep
        answers={answers}
        update={(patch) => setAnswers((a) => ({ ...a, ...patch }))}
        plafond={plafond}
        choisirLePlafond={setPlafond}
      />
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

/**
 * « 10+ » vient d'être touché : « Environ combien, sur une année ? » s'ouvre sous les puces, vide et réclamé
 * — un nombre par défaut serait une réponse qu'on n'a pas donnée (`v1-33` §6).
 */
export const DixOuPlusAReclamer = () => <Etape depart={{ flights_total_per_year: null, flights_short_per_year: null }} plafond />;

/** Vingt-cinq vols dans le champ : la part des courts devient elle aussi un champ, borné au total. */
export const AuDelaDeDix = () => <Etape depart={{ flights_total_per_year: 25, flights_short_per_year: 20 }} />;
