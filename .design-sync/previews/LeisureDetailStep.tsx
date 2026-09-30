import React from 'react';
import { LeisureDetailStep } from 'ramille-design-system';

type Reponses = React.ComponentProps<typeof LeisureDetailStep>['answers'];

const VIERGE: Reponses = {
  leisure_mode: null,
  leisure_is_carpool: false,
  leisure_carpool_size: null,
  leisure_car_engine: null,
  leisure_two_wheeler_type: null,
  leisure_train_type: null,
  leisure_velo_type: null,
  leisure_distance_bracket: null,
  leisure_distance_km: null,
};

// `normaliserReponses` (src/types/bilan.ts), la part que cette étape déclenche, recopiée — celle des
// sorties déclarées, l'étape n'existant pas sous « Rarement ». L'écran du questionnaire l'applique après
// chaque `update` : c'est elle, et non l'étape, qui efface une précision devenue sans objet.
const normaliser = (r: Reponses): Reponses => {
  const a = { ...r };
  if (a.leisure_mode !== 'voiture') a.leisure_car_engine = null;
  if (a.leisure_mode !== 'deux_roues_motorise') a.leisure_two_wheeler_type = null;
  if (a.leisure_mode !== 'train') a.leisure_train_type = null;
  if (a.leisure_mode !== 'velo') a.leisure_velo_type = null;
  if (a.leisure_mode !== 'voiture') a.leisure_is_carpool = false;
  if (a.leisure_distance_bracket !== '30_plus') a.leisure_distance_km = null;
  if (!a.leisure_is_carpool) a.leisure_carpool_size = null;
  return a;
};

// Le contenu défilant de `StepShell`, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
const Etape = ({ depart }: { depart: Partial<Reponses> }) => {
  const [answers, setAnswers] = React.useState<Reponses>({ ...VIERGE, ...depart });
  return (
    <div style={{ maxWidth: 342 }}>
      <LeisureDetailStep answers={answers} update={(patch) => setAnswers((a) => normaliser({ ...a, ...patch }))} />
    </div>
  );
};

/**
 * Rien de choisi : quatre modes en avant, par famille — Voiture (seul), Voiture (covoiturage) · Train · Vélo —,
 * « Voir les autres modes » sous le groupe : l'activer révèle les cinq autres en un bloc, par famille, et envoie
 * le focus au premier d'entre eux.
 */
export const ListeCourte = () => <Etape depart={{}} />;

/**
 * Le covoiturage : la motorisation, puis le nombre de personnes, s'ouvrent sous la rangée choisie, dans une
 * seule boîte — les deux décrivent la même voiture.
 */
export const VoitureEnCovoiturage = () => (
  <Etape
    depart={{ leisure_mode: 'voiture', leisure_is_carpool: true, leisure_car_engine: 'hybride', leisure_carpool_size: 3, leisure_distance_bracket: '15_30' }}
  />
);

/** Le train : trois réponses, parce que le TER et le RER ne comptent pas la même chose. */
export const TypeDeTrain = () => <Etape depart={{ leisure_mode: 'train', leisure_distance_bracket: '5_15' }} />;

/**
 * Une réponse déjà donnée dans la seconde liste — un re-bilan pré-rempli en bus : la liste s'ouvre
 * d'emblée, sinon la question paraîtrait vide alors qu'elle est remplie.
 */
export const ModeDeLaSecondeListe = () => <Etape depart={{ leisure_mode: 'bus', leisure_distance_bracket: 'lt_5' }} />;

/** « Plus de 30 km », la seule tranche sans borne haute : elle demande la distance d'un aller, après les puces. */
export const PlusDe30Km = () => (
  <Etape depart={{ leisure_mode: 'velo', leisure_velo_type: 'electrique', leisure_distance_bracket: '30_plus', leisure_distance_km: 45 }} />
);
