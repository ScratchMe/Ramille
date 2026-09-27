import React from 'react';
import { CommuteModeStep, StepShell } from 'ramille-design-system';

type Mode = 'voiture' | 'bus' | 'train' | 'metro_tram' | 'velo' | 'marche' | 'deux_roues_motorise' | 'trottinette';
type Reponses = {
  commute_mode: Mode | null;
  commute_is_carpool: boolean;
  commute_carpool_size: number | null;
  commute_car_engine: 'thermique' | 'hybride' | 'hybride_rechargeable' | 'electrique' | null;
  commute_two_wheeler_type: 'scooter_thermique' | 'scooter_electrique' | 'moto_petite' | 'moto_grosse' | null;
  commute_train_type: 'ter' | 'rer' | 'intercites' | null;
  commute_velo_type: 'mecanique' | 'electrique' | null;
};

const VIDE: Reponses = {
  commute_mode: null,
  commute_is_carpool: false,
  commute_carpool_size: null,
  commute_car_engine: null,
  commute_two_wheeler_type: null,
  commute_train_type: null,
  commute_velo_type: null,
};

// `normaliserReponses` (src/types/bilan.ts), la part que cette étape déclenche, recopiée et réduite au mode
// principal — l'aperçu n'a pas de second mode. L'écran du questionnaire l'applique après chaque `update` : c'est
// elle, et non l'étape, qui efface ce qu'un choix rend impossible.
const normaliser = (a: Reponses): Reponses => {
  const r = { ...a };
  if (r.commute_mode !== 'voiture') r.commute_is_carpool = false;
  if (!r.commute_is_carpool) r.commute_carpool_size = null;
  if (r.commute_mode !== 'voiture') r.commute_car_engine = null;
  if (r.commute_mode !== 'deux_roues_motorise') r.commute_two_wheeler_type = null;
  if (r.commute_mode !== 'train') r.commute_train_type = null;
  if (r.commute_mode !== 'velo') r.commute_velo_type = null;
  return r;
};

const useReponses = (depart: Reponses) => {
  const [answers, setAnswers] = React.useState<Reponses>(depart);
  const update = (patch: Partial<Reponses>) => setAnswers((a) => normaliser({ ...a, ...patch }));
  return [answers, update] as const;
};

/** Au premier passage : neuf modes, rien de choisi, et le lien du mode manquant sous la liste. */
export const SansReponse = () => {
  const [answers, update] = useReponses(VIDE);
  return <CommuteModeStep answers={answers} update={update} />;
};

/**
 * « Voiture (covoiturage) » : sous l'option, la motorisation puis combien vous êtes à partager le
 * trajet — deux précisions pour la même voiture, dans la liste et non après elle.
 */
export const VoitureEnCovoiturage = () => {
  const [answers, update] = useReponses({
    ...VIDE,
    commute_mode: 'voiture',
    commute_is_carpool: true,
    commute_car_engine: 'thermique',
    commute_carpool_size: 3,
  });
  return <CommuteModeStep answers={answers} update={update} />;
};

/** « Train » vient d'être choisi : le type de train s'ouvre juste sous lui, encore sans réponse. */
export const Train = () => {
  const [answers, update] = useReponses({ ...VIDE, commute_mode: 'train' });
  return <CommuteModeStep answers={answers} update={update} />;
};

/** Le deux-roues : quatre réponses au même niveau, dont la grosse cylindrée. */
export const DeuxRouesMotorise = () => {
  const [answers, update] = useReponses({ ...VIDE, commute_mode: 'deux_roues_motorise', commute_two_wheeler_type: 'moto_grosse' });
  return <CommuteModeStep answers={answers} update={update} />;
};

/** Dans le questionnaire : troisième étape ; tant qu'une précision ouverte attend, « Il manque encore » la nomme. */
export const DansLeQuestionnaire = () => {
  const [answers, update] = useReponses(VIDE);
  // `manqueDeLEtape` (src/types/bilan.ts) pour cette étape, recopiée.
  const manque =
    answers.commute_mode === null
      ? 'ton mode de transport'
      : answers.commute_mode === 'voiture' && answers.commute_car_engine === null
        ? 'la motorisation'
        : answers.commute_mode === 'deux_roues_motorise' && answers.commute_two_wheeler_type === null
          ? 'le type de deux-roues'
          : answers.commute_mode === 'train' && answers.commute_train_type === null
            ? 'le type de train'
            : answers.commute_mode === 'velo' && answers.commute_velo_type === null
              ? 'le type de vélo'
              : answers.commute_is_carpool && answers.commute_carpool_size === null
                ? 'le nombre de personnes dans la voiture'
                : null;
  return (
    <StepShell
      section="Domicile-travail"
      step={3}
      total={9}
      onBack={() => {}}
      onNext={() => {}}
      nextDisabled={manque !== null}
      manque={manque}
    >
      <CommuteModeStep answers={answers} update={update} />
    </StepShell>
  );
};
