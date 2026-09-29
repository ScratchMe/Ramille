import React from 'react';
import { BoiteDePrecision, ModeListItem, PrecisionChiffres, PrecisionMode } from 'ramille-design-system';

// `CAR_ENGINE_OPTIONS` (src/constants/transport-modes.ts), recopiée.
const MOTORISATIONS = [
  { value: 'thermique', label: 'Thermique' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
  { value: 'electrique', label: 'Électrique' },
];

// `TAILLES_DE_COVOITURAGE` (src/types/bilan.ts), recopiée : de 2 à 6, la dernière vaut « ce nombre ou plus ».
const TAILLES_DE_COVOITURAGE = [2, 3, 4, 5, 6].map((n) => ({
  value: n,
  label: n === 6 ? '6+' : String(n),
  accessibilityLabel: n === 6 ? '6 personnes ou plus' : `${n} personnes`,
}));

// `PARTS_DU_SECOND_MODE` (src/types/bilan.ts), recopiée : une fraction, parce que c'est ce que le calcul multiplie.
const PARTS_DU_SECOND_MODE = [
  { value: 0.25, label: 'Un quart environ' },
  { value: 0.5, label: 'La moitié environ' },
  { value: 0.75, label: 'Les trois quarts environ' },
];

/** Une précision : « Train » choisi, la boîte s'ouvre sous lui avec le type de train — 8 sous le choix, retrait 16. */
export const UnePrecision = () => {
  const [type, setType] = React.useState<string | null>('rer');
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ModeListItem label="Train" selected />
      <BoiteDePrecision>
        <PrecisionMode
          champ="commute_train_type"
          question="Quel type de train ?"
          options={[
            { value: 'ter', label: 'TER ou train régional' },
            { value: 'rer', label: 'RER ou Transilien' },
            { value: 'intercites', label: 'Intercités' },
          ]}
          valeur={type}
          onChange={setType}
        />
      </BoiteDePrecision>
    </div>
  );
};

/**
 * Deux précisions d'une même voiture, dans une seule boîte : la motorisation, puis combien vous êtes — à 16 l'une
 * de l'autre, chacune son propre groupe nommé par sa question, jamais un groupe fusionné.
 */
export const DeuxPrecisions = () => {
  const [moteur, setMoteur] = React.useState<string | null>('hybride');
  const [taille, setTaille] = React.useState<number | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ModeListItem label="Voiture (covoiturage)" selected />
      <BoiteDePrecision>
        <PrecisionMode
          champ="commute_car_engine"
          question="Quelle motorisation ?"
          options={MOTORISATIONS}
          valeur={moteur}
          onChange={setMoteur}
        />
        <PrecisionChiffres
          champ="commute_carpool_size"
          question="Vous êtes combien à partager ce trajet ?"
          options={TAILLES_DE_COVOITURAGE}
          valeur={taille}
          onChange={setTaille}
        />
      </BoiteDePrecision>
    </div>
  );
};

/** Sous le second mode choisi dans « Lequel ? » : son type, puis la part du trajet qu'il couvre — demandée, jamais supposée. */
export const TypePuisPartDuTrajet = () => {
  const [type, setType] = React.useState<string | null>('electrique');
  const [part, setPart] = React.useState<number | null>(0.5);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ModeListItem label="Vélo" selected />
      <BoiteDePrecision>
        <PrecisionMode
          champ="commute_velo_type"
          question="Quel type de vélo ?"
          options={[
            { value: 'mecanique', label: 'Mécanique' },
            { value: 'electrique', label: 'À assistance électrique' },
          ]}
          valeur={type}
          onChange={setType}
        />
        <PrecisionMode
          champ="commute_second_mode_share"
          question="Quelle part du trajet fais-tu ainsi ?"
          options={PARTS_DU_SECOND_MODE}
          valeur={part}
          onChange={setPart}
        />
      </BoiteDePrecision>
    </div>
  );
};
