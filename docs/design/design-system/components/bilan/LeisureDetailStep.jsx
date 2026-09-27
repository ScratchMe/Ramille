import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { ModeListItem } from '../forms/ModeListItem.jsx';
import { NumericField } from '../forms/NumericField.jsx';
import { PrecisionMode } from '../forms/PrecisionMode.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { MissingModeLink } from './MissingModeLink.jsx';
import { PrecisionChiffres } from './PrecisionChiffres.jsx';
// Source : src/components/bilan/steps/leisure-detail.tsx — le mode et la distance des sorties du week-end, deux
// questions sur une étape. Quatre modes en avant, les cinq autres derrière « Voir les autres modes » — ouverts
// d'emblée si la réponse déjà donnée y vit, sinon la question paraîtrait vide alors qu'elle est remplie. Quand on
// les ouvre, le focus va au premier mode révélé : le lien disparaît sous le geste, et le focus partait avec lui.
// Les deux voitures écrivent le même mode : c'est la clé choisie qui dit sous laquelle la précision s'ouvre. Chaque
// précision s'ouvre sous le mode qui la déclenche, dans le groupe ; « Plus de 30 km » ouvre un champ après les puces.

// `LEISURE_MODE_CHOICES_PRIMARY` et `LEISURE_MODE_CHOICES_MORE` (src/constants/transport-modes.ts), recopiées.
const LEISURE_MODE_CHOICES_PRIMARY = [
  { key: 'voiture_solo', modeId: 'voiture', carpool: false, label: 'Voiture (seul)' },
  { key: 'voiture_covoiturage', modeId: 'voiture', carpool: true, label: 'Voiture (covoiturage)' },
  { key: 'train', modeId: 'train', carpool: false, label: 'Train' },
  { key: 'velo', modeId: 'velo', carpool: false, label: 'Vélo' },
];
const LEISURE_MODE_CHOICES_MORE = [
  { key: 'bus', modeId: 'bus', carpool: false, label: 'Bus' },
  { key: 'metro_tram', modeId: 'metro_tram', carpool: false, label: 'Métro ou tram' },
  { key: 'marche', modeId: 'marche', carpool: false, label: 'Marche' },
  { key: 'deux_roues_motorise', modeId: 'deux_roues_motorise', carpool: false, label: 'Deux-roues motorisé' },
  { key: 'trottinette', modeId: 'trottinette', carpool: false, label: 'Trottinette ou mobilité douce' },
];
// `CAR_ENGINE_OPTIONS`, `TWO_WHEELER_TYPE_OPTIONS`, `TRAIN_TYPE_OPTIONS` et `VELO_TYPE_OPTIONS`
// (src/constants/transport-modes.ts), recopiées.
const CAR_ENGINE_OPTIONS = [
  { value: 'thermique', label: 'Thermique' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
  { value: 'electrique', label: 'Électrique' },
];
const TWO_WHEELER_TYPE_OPTIONS = [
  { value: 'scooter_thermique', label: 'Scooter thermique' },
  { value: 'scooter_electrique', label: 'Scooter électrique' },
  { value: 'moto_petite', label: 'Moto, petite cylindrée' },
  { value: 'moto_grosse', label: 'Moto, grosse cylindrée' },
];
const TRAIN_TYPE_OPTIONS = [
  { value: 'ter', label: 'TER ou train régional' },
  { value: 'rer', label: 'RER ou Transilien' },
  { value: 'intercites', label: 'Intercités' },
];
const VELO_TYPE_OPTIONS = [
  { value: 'mecanique', label: 'Mécanique' },
  { value: 'electrique', label: 'À assistance électrique' },
];
// `TAILLES_DE_COVOITURAGE` (src/types/bilan.ts), recopiée : la dernière puce vaut « ce nombre ou plus », et ses
// deux libellés descendent du même plafond.
const PLAFOND_COVOITURAGE = 6;
const TAILLES_DE_COVOITURAGE = [2, 3, 4, 5, PLAFOND_COVOITURAGE].map((n) => ({
  value: n,
  label: n === PLAFOND_COVOITURAGE ? n + '+' : String(n),
  accessibilityLabel: n === PLAFOND_COVOITURAGE ? n + ' personnes ou plus' : n + ' personnes',
}));
// `BRACKETS` de la source, recopiées.
const BRACKETS = [
  { value: 'lt_5', label: 'Moins de 5 km' },
  { value: '5_15', label: '5 à 15 km' },
  { value: '15_30', label: '15 à 30 km' },
  { value: '30_plus', label: 'Plus de 30 km' },
];
const QUESTION_MODE = 'Avec quel mode, principalement ?';
const QUESTION_DISTANCE = 'Quelle distance aller, en général ?';

const COLONNE = { display: 'flex', flexDirection: 'column' };

export function LeisureDetailStep({ answers, update }) {
  const [showMore, setShowMore] = React.useState(() =>
    LEISURE_MODE_CHOICES_MORE.some((choice) => choice.modeId === answers.leisure_mode)
  );
  // Le focus au premier mode révélé, seulement après le geste — jamais au montage d'une liste déjà ouverte.
  const premierDesAutres = React.useRef(null);
  const vientDeDeplier = React.useRef(false);
  React.useEffect(() => {
    if (!showMore || !vientDeDeplier.current) return;
    vientDeDeplier.current = false;
    const cible = premierDesAutres.current && premierDesAutres.current.querySelector('[role="radio"]');
    if (cible) cible.focus({ preventScroll: true });
  }, [showMore]);
  const [selectedKey, setSelectedKey] = React.useState(
    answers.leisure_mode === 'voiture'
      ? answers.leisure_is_carpool ? 'voiture_covoiturage' : 'voiture_solo'
      : answers.leisure_mode === null || answers.leisure_mode === undefined ? null : answers.leisure_mode
  );
  const modeChoices = showMore ? [...LEISURE_MODE_CHOICES_PRIMARY, ...LEISURE_MODE_CHOICES_MORE] : LEISURE_MODE_CHOICES_PRIMARY;
  // Une précision, sous le mode qu'elle décrit.
  const precision = (contenu) => <div style={{ marginTop: 8 }}>{contenu}</div>;

  return (
    <div style={{ ...COLONNE, gap: 32 }}>
      <div style={{ ...COLONNE, gap: 16 }}>
        <ThemedText type="screenTitle">{QUESTION_MODE}</ThemedText>
        {/* Le groupe ne porte que les modes et leurs précisions ; « Voir les autres modes » le suit sans y entrer :
            c'est une commande, pas une option. */}
        <div style={{ ...COLONNE, gap: 8 }}>
          <GroupeDeChoix question={QUESTION_MODE} style={{ gap: 8 }}>
            {modeChoices.map((choice) => {
              const selected = selectedKey === choice.key;
              return (
                <div key={choice.key} ref={choice.key === LEISURE_MODE_CHOICES_MORE[0].key ? premierDesAutres : undefined}>
                  <ModeListItem label={choice.label} selected={selected}
                    onPress={() => {
                      setSelectedKey(choice.key);
                      update({ leisure_mode: choice.modeId, leisure_is_carpool: choice.carpool });
                    }} />
                  {selected && choice.modeId === 'voiture' && precision(
                    <PrecisionMode question="Quelle motorisation ?" options={CAR_ENGINE_OPTIONS} valeur={answers.leisure_car_engine}
                      onChange={(value) => update({ leisure_car_engine: value })} />
                  )}
                  {selected && choice.modeId === 'deux_roues_motorise' && precision(
                    <PrecisionMode question="Quel type de deux-roues ?" options={TWO_WHEELER_TYPE_OPTIONS} valeur={answers.leisure_two_wheeler_type}
                      onChange={(value) => update({ leisure_two_wheeler_type: value })} />
                  )}
                  {selected && choice.modeId === 'train' && precision(
                    <PrecisionMode question="Quel type de train ?" options={TRAIN_TYPE_OPTIONS} valeur={answers.leisure_train_type}
                      onChange={(value) => update({ leisure_train_type: value })} />
                  )}
                  {selected && choice.modeId === 'velo' && precision(
                    <PrecisionMode question="Quel type de vélo ?" options={VELO_TYPE_OPTIONS} valeur={answers.leisure_velo_type}
                      onChange={(value) => update({ leisure_velo_type: value })} />
                  )}
                  {/* Après la motorisation, sous la même option : les deux précisions décrivent la même voiture. */}
                  {selected && choice.carpool && precision(
                    <PrecisionChiffres question="Vous êtes combien dans la voiture ?" options={TAILLES_DE_COVOITURAGE} valeur={answers.leisure_carpool_size}
                      onChange={(value) => update({ leisure_carpool_size: value })} />
                  )}
                </div>
              );
            })}
          </GroupeDeChoix>
          {!showMore && (
            <TextLink label="Voir les autres modes" type="linkPrimary"
              onPress={() => {
                vientDeDeplier.current = true;
                setShowMore(true);
              }} />
          )}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--color-border)' }} />

      <div style={{ ...COLONNE, gap: 16 }}>
        <ThemedText type="subtitle" weight={600} style={{ fontSize: 22, lineHeight: '28px', letterSpacing: '-0.22px' }}>{QUESTION_DISTANCE}</ThemedText>
        <GroupeDeChoix question={QUESTION_DISTANCE} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BRACKETS.map((bracket) => (
            <Chip key={bracket.value} label={bracket.label} role="radio" selected={answers.leisure_distance_bracket === bracket.value}
              onPress={() => update({ leisure_distance_bracket: bracket.value })} />
          ))}
        </GroupeDeChoix>
        {/* La seule tranche sans borne haute demande la distance, après les puces : elles reviennent à la ligne,
            il n'y a pas d'élément sous lequel se glisser. */}
        {answers.leisure_distance_bracket === '30_plus' && (
          <div style={{ ...COLONNE, gap: 8 }}>
            <ThemedText type="small" themeColor="textTertiary">Environ combien, pour un aller ?</ThemedText>
            <NumericField value={answers.leisure_distance_km} onChange={(value) => update({ leisure_distance_km: value })} unit="km" label="Distance d’un aller" />
          </div>
        )}
      </div>
      <MissingModeLink context="B2.2 mode loisirs" />
    </div>
  );
}
