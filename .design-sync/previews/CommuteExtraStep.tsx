import React from 'react';
import { CommuteExtraStep, StepShell } from 'ramille-design-system';

type Mode = 'voiture' | 'bus' | 'train' | 'metro_tram' | 'velo' | 'marche' | 'deux_roues_motorise' | 'trottinette';
type Reponses = {
  commute_mode: Mode | null;
  commute_second_mode_used: boolean | null;
  commute_second_mode: Mode | null;
  commute_second_mode_share: number | null;
  commute_car_engine: 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique' | null;
  commute_two_wheeler_type: 'scooter_thermique' | 'scooter_electrique' | 'moto_petite' | 'moto_grosse' | null;
  commute_train_type: 'ter' | 'rer' | 'intercites' | null;
  commute_velo_type: 'mecanique' | 'electrique' | null;
};

// Le trajet principal se fait en train (TER, répondu à l'étape précédente) : « Train » sort donc de la liste
// du second mode.
const EN_TRAIN: Reponses = {
  commute_mode: 'train',
  commute_second_mode_used: null,
  commute_second_mode: null,
  commute_second_mode_share: null,
  commute_car_engine: null,
  commute_two_wheeler_type: null,
  commute_train_type: 'ter',
  commute_velo_type: null,
};

// `normaliserReponses` (src/types/bilan.ts), la part que cette étape déclenche, recopiée : l'écran du
// questionnaire l'applique après chaque `update`, et c'est elle qui efface ce qu'un choix rend orphelin.
const normaliser = (a: Reponses): Reponses => {
  const r = { ...a };
  if (!r.commute_second_mode_used) r.commute_second_mode = null;
  if (r.commute_second_mode === null) r.commute_second_mode_share = null;
  if (r.commute_mode !== 'voiture' && r.commute_second_mode !== 'voiture') r.commute_car_engine = null;
  if (r.commute_mode !== 'deux_roues_motorise' && r.commute_second_mode !== 'deux_roues_motorise') r.commute_two_wheeler_type = null;
  if (r.commute_mode !== 'train' && r.commute_second_mode !== 'train') r.commute_train_type = null;
  if (r.commute_mode !== 'velo' && r.commute_second_mode !== 'velo') r.commute_velo_type = null;
  return r;
};

// Chaque `update` compte une réponse donnée (`reponsesDonnees` de `StepShell`) : une précision qui s'ouvre ne fait
// défiler l'écran que si elle en suit une, jamais au préremplissage.
const useReponses = (depart: Reponses) => {
  const [answers, setAnswers] = React.useState<Reponses>(depart);
  const [reponses, setReponses] = React.useState(0);
  const update = (patch: Partial<Reponses>) => {
    setReponses((n) => n + 1);
    setAnswers((a) => normaliser({ ...a, ...patch }));
  };
  return [answers, update, reponses] as const;
};

/** Au premier passage : ni « Oui » ni « Non » cochés d'avance — un « Non » par défaut sous-estimerait le trajet. */
export const SansReponse = () => {
  const [answers, update] = useReponses(EN_TRAIN);
  return <CommuteExtraStep answers={answers} update={update} />;
};

/**
 * Vélo puis train : sous « Vélo », le type de vélo puis la part du trajet — demandée, jamais
 * supposée. La liste ne propose pas le train, déjà mode principal.
 */
export const VeloPuisTrain = () => {
  const [answers, update] = useReponses({
    ...EN_TRAIN,
    commute_second_mode_used: true,
    commute_second_mode: 'velo',
    commute_velo_type: 'mecanique',
    commute_second_mode_share: 0.25,
  });
  return <CommuteExtraStep answers={answers} update={update} />;
};

/** La voiture jusqu'à la gare vient d'être choisie : la motorisation et la part s'ouvrent, encore sans réponse. */
export const VoitureJusquALaGare = () => {
  const [answers, update] = useReponses({ ...EN_TRAIN, commute_second_mode_used: true, commute_second_mode: 'voiture' });
  return <CommuteExtraStep answers={answers} update={update} />;
};

/** « Non » : pas d'encart, l'étape est complète. */
export const Non = () => {
  const [answers, update] = useReponses({ ...EN_TRAIN, commute_second_mode_used: false });
  return <CommuteExtraStep answers={answers} update={update} />;
};

/**
 * Dans le questionnaire : quatrième étape. Ce qui manque se nomme dans l'ordre où on le rencontre, au toucher du
 * « Suivant » en attente — jamais d'office.
 */
export const DansLeQuestionnaire = () => {
  const [answers, update, reponses] = useReponses(EN_TRAIN);
  // `manqueDeLEtape` (src/types/bilan.ts) pour cette étape, recopiée : le champ, pour y mener, et sa phrase.
  const second = answers.commute_second_mode;
  const manque =
    answers.commute_second_mode_used === null
      ? { champ: 'commute_second_mode_used', phrase: 'une réponse sur le second mode' }
      : answers.commute_second_mode_used && second === null
        ? { champ: 'commute_second_mode', phrase: 'le second mode' }
        : second === 'voiture' && answers.commute_car_engine === null
          ? { champ: 'commute_car_engine', phrase: 'la motorisation' }
          : second === 'deux_roues_motorise' && answers.commute_two_wheeler_type === null
            ? { champ: 'commute_two_wheeler_type', phrase: 'le type de deux-roues' }
            : second === 'train' && answers.commute_train_type === null
              ? { champ: 'commute_train_type', phrase: 'le type de train' }
              : second === 'velo' && answers.commute_velo_type === null
                ? { champ: 'commute_velo_type', phrase: 'le type de vélo' }
                : second !== null && answers.commute_second_mode_share === null
                  ? { champ: 'commute_second_mode_share', phrase: 'la part de ce second mode' }
                  : null;
  return (
    <StepShell
      section="Domicile-travail"
      step={4}
      total={9}
      entree={{ cle: 'commute_extra', sens: null }}
      reponsesDonnees={reponses}
      onBack={() => {}}
      onNext={() => {}}
      manque={manque}
    >
      <CommuteExtraStep answers={answers} update={update} />
    </StepShell>
  );
};
