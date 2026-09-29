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

/**
 * Au premier passage : neuf modes en trois familles — motorisés, collectifs, actifs, 16 px entre elles —, rien de
 * choisi, et le lien du mode manquant sous la liste.
 */
export const SansReponse = () => {
  const [answers, update] = useReponses(VIDE);
  return <CommuteModeStep answers={answers} update={update} />;
};

/**
 * « Voiture (covoiturage) » : sous l'option, une seule boîte, la motorisation puis combien vous êtes à partager
 * le trajet — deux précisions pour la même voiture, dans la liste et non après elle, chacune son propre groupe.
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

// `manqueDeLEtape` (src/types/bilan.ts) pour cette étape, recopiée : le champ, pour y mener, et sa phrase.
const manqueDuMode = (a: Reponses) =>
  a.commute_mode === null
    ? { champ: 'commute_mode', phrase: 'ton mode de transport' }
    : a.commute_mode === 'voiture' && a.commute_car_engine === null
      ? { champ: 'commute_car_engine', phrase: 'la motorisation' }
      : a.commute_mode === 'deux_roues_motorise' && a.commute_two_wheeler_type === null
        ? { champ: 'commute_two_wheeler_type', phrase: 'le type de deux-roues' }
        : a.commute_mode === 'train' && a.commute_train_type === null
          ? { champ: 'commute_train_type', phrase: 'le type de train' }
          : a.commute_mode === 'velo' && a.commute_velo_type === null
            ? { champ: 'commute_velo_type', phrase: 'le type de vélo' }
            : a.commute_is_carpool && a.commute_carpool_size === null
              ? { champ: 'commute_carpool_size', phrase: 'le nombre de personnes dans la voiture' }
              : null;

/**
 * Le toucher du « Suivant », rejoué une fois après le montage — une carte ne se touche pas, et c'est
 * au toucher, jamais d'office, que ce qui manque se dit (`v1-31`, décision 1).
 */
const ApresLeToucher = ({ children }: { children: React.ReactNode }) => {
  const cadre = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const suivant = cadre.current?.querySelector<HTMLButtonElement>('button[aria-label="Suivant"]');
    suivant?.click();
  }, []);
  return (
    <div ref={cadre} style={{ display: 'flex', flexDirection: 'column', height: 844 }}>
      {children}
    </div>
  );
};

/**
 * Dans le questionnaire : troisième étape. Tant qu'il manque quelque chose, « Suivant » est gris mais agit : au
 * toucher, « Il manque encore … » au-dessus de lui, et l'écran mène à la question.
 */
export const DansLeQuestionnaire = () => {
  const [answers, update, reponses] = useReponses(VIDE);
  return (
    <StepShell
      section="Domicile-travail"
      step={3}
      total={9}
      entree={{ cle: 'commute_mode', sens: null }}
      reponsesDonnees={reponses}
      onBack={() => {}}
      onNext={() => {}}
      manque={manqueDuMode(answers)}
    >
      <CommuteModeStep answers={answers} update={update} />
    </StepShell>
  );
};

/**
 * Le covoiturage, « Hybride » choisi, le nombre de personnes vide, « Suivant » touché : la ligne nomme ce qui
 * manque, la question des personnes passe en `accentText`, le focus est sur « 2 ». Le titre ne se recolore
 * jamais — il est la question de l'étape.
 */
export const CovoiturageSuivantTouche = () => {
  const [answers, update, reponses] = useReponses({
    ...VIDE,
    commute_mode: 'voiture',
    commute_is_carpool: true,
    commute_car_engine: 'hybride',
  });
  return (
    <ApresLeToucher>
      <StepShell
        section="Domicile-travail"
        step={3}
        total={9}
        entree={{ cle: 'commute_mode', sens: null }}
        reponsesDonnees={reponses}
        onBack={() => {}}
        onNext={() => {}}
        manque={manqueDuMode(answers)}
      >
        <CommuteModeStep answers={answers} update={update} />
      </StepShell>
    </ApresLeToucher>
  );
};
