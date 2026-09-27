import React from 'react';
import { CommuteHasTripStep, StepShell } from 'ramille-design-system';

type Reponses = { commute_has_regular_trip: boolean | null };

// L'écran du questionnaire tient les réponses et fusionne chaque fragment que l'étape écrit.
const useReponses = (depart: Reponses) => {
  const [answers, setAnswers] = React.useState<Reponses>(depart);
  const update = (patch: Partial<Reponses>) => setAnswers((a) => ({ ...a, ...patch }));
  return [answers, update] as const;
};

/** Au premier passage : rien n'est coché d'avance, la question attend une réponse. */
export const SansReponse = () => {
  const [answers, update] = useReponses({ commute_has_regular_trip: null });
  return <CommuteHasTripStep answers={answers} update={update} />;
};

/**
 * « Non » choisi : télétravail total, sans emploi, retraité — la ligne d'aide le dit, et dit aussi
 * ce que le bilan ne compte pas.
 */
export const Non = () => {
  const [answers, update] = useReponses({ commute_has_regular_trip: false });
  return <CommuteHasTripStep answers={answers} update={update} />;
};

/**
 * Dans le questionnaire : première étape, pas de Retour, le mot de Ramille à l'entrée de la section.
 * « Non » retire les trois étapes du trajet, et l'en-tête passe de neuf étapes à six.
 */
export const DansLeQuestionnaire = () => {
  const [answers, update] = useReponses({ commute_has_regular_trip: null });
  // `manqueDeLEtape` (src/types/bilan.ts) pour cette étape, et le compte de `visibleSteps`, recopiés.
  const manque = answers.commute_has_regular_trip === null ? 'une réponse' : null;
  const total = answers.commute_has_regular_trip === false ? 6 : 9;
  return (
    <StepShell
      section="Domicile-travail"
      step={1}
      total={total}
      motDeRamille="À peu près, c’est déjà bien. Je ne vérifie rien, et personne ne relit."
      onNext={() => {}}
      nextDisabled={manque !== null}
      manque={manque}
    >
      <CommuteHasTripStep answers={answers} update={update} />
    </StepShell>
  );
};
