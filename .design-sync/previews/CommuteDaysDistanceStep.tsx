import React from 'react';
import { CommuteDaysDistanceStep, StepShell } from 'ramille-design-system';

type Tranche = 'lt_5' | '5_15' | '15_30' | '30_50' | '50_plus';
type Reponses = {
  commute_days_per_week: number | null;
  commute_distance_km: number | null;
  commute_distance_bracket: Tranche | null;
};

const VIDE: Reponses = { commute_days_per_week: null, commute_distance_km: null, commute_distance_bracket: null };

// L'écran du questionnaire tient les réponses et fusionne chaque fragment que l'étape écrit.
const useReponses = (depart: Reponses) => {
  const [answers, setAnswers] = React.useState<Reponses>(depart);
  const update = (patch: Partial<Reponses>) => setAnswers((a) => ({ ...a, ...patch }));
  return [answers, update] as const;
};

/** Au premier passage : les jours en grille de quatre colonnes, le champ de distance vide et « Je ne sais pas ». */
export const Vide = () => {
  const [answers, update] = useReponses(VIDE);
  return <CommuteDaysDistanceStep answers={answers} update={update} />;
};

/** Quatre jours, un aller de 12 km : le champ passe à l'accent une fois un nombre saisi. */
export const DistanceSaisie = () => {
  const [answers, update] = useReponses({ ...VIDE, commute_days_per_week: 4, commute_distance_km: 12 });
  return <CommuteDaysDistanceStep answers={answers} update={update} />;
};

/**
 * Au-delà de 200 km pour un aller, la relecture se propose, en texte secondaire — jamais un
 * blocage : elle attrape le 1200 tapé au lieu de 120.
 */
export const DistanceARelire = () => {
  const [answers, update] = useReponses({ ...VIDE, commute_days_per_week: 5, commute_distance_km: 1200 });
  return <CommuteDaysDistanceStep answers={answers} update={update} />;
};

/**
 * Après « Je ne sais pas » : les tranches, et sous la tranche choisie la distance que le calcul
 * retiendra. « Je connais la distance exacte » en revient.
 */
export const ParTranche = () => {
  const [answers, update] = useReponses({ ...VIDE, commute_days_per_week: 3, commute_distance_bracket: '5_15' });
  return <CommuteDaysDistanceStep answers={answers} update={update} />;
};

/** Dans le questionnaire : deuxième étape, et ce qui manque encore se dit à côté du bouton. */
export const DansLeQuestionnaire = () => {
  const [answers, update] = useReponses(VIDE);
  // `manqueDeLEtape` (src/types/bilan.ts) pour cette étape, recopiée : un zéro n'est pas une distance.
  const manque =
    answers.commute_days_per_week === null
      ? 'le nombre de jours par semaine'
      : !(answers.commute_distance_km !== null && answers.commute_distance_km > 0) && answers.commute_distance_bracket === null
        ? 'la distance'
        : null;
  return (
    <StepShell
      section="Domicile-travail"
      step={2}
      total={9}
      onBack={() => {}}
      onNext={() => {}}
      nextDisabled={manque !== null}
      manque={manque}
    >
      <CommuteDaysDistanceStep answers={answers} update={update} />
    </StepShell>
  );
};
