import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { ModeListItem } from '../forms/ModeListItem.jsx';
import { PrecisionMode } from '../forms/PrecisionMode.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { ThemedView } from '../core/ThemedView.jsx';
import { MissingModeLink } from './MissingModeLink.jsx';
// Source : src/components/bilan/steps/commute-extra.tsx — B1.6 / B1.7 : le titre de l'étape, un exemple en
// tertiaire, le « Oui / Non » en deux puces équiréparties (contour, rayon 16), puis, sur « Oui », l'encart
// « Lequel ? » (fond élément, rayon 16, padding 16, gap 8) : les modes sans celui du trajet principal, en
// `ModeListItem` sur fond de page. Gap 32 entre le bloc et le lien du mode manquant, 16 dans le bloc.
//
// Sous le mode choisi, à 8 px et dans la liste : sa précision (motorisation, type de deux-roues, de train, de vélo)
// puis, pour tout mode, la part du trajet qu'il couvre — demandée, jamais supposée. Rien n'est coché d'avance :
// « Non » sous-estimerait un trajet intermodal. « Non » efface le second mode ; le reste est effacé par l'écran.

// Écrites une fois : le titre de l'étape et le nom du « Oui / Non » ; l'intitulé de la liste imbriquée et le nom
// de son groupe.
const QUESTION_SECOND_MODE = 'Utilises-tu un second mode en complément ?';
const QUESTION_LEQUEL = 'Lequel ?';

// `TRANSPORT_MODE_LABELS`, `CAR_ENGINE_OPTIONS`, `TWO_WHEELER_TYPE_OPTIONS`, `TRAIN_TYPE_OPTIONS` et
// `VELO_TYPE_OPTIONS` (src/constants/transport-modes.ts), recopiées.
const LIBELLES_DES_MODES = {
  voiture: 'Voiture',
  bus: 'Bus',
  train: 'Train',
  metro_tram: 'Métro ou tram',
  velo: 'Vélo',
  marche: 'Marche',
  deux_roues_motorise: 'Deux-roues motorisé',
  trottinette: 'Trottinette ou mobilité douce',
};
const MOTORISATIONS = [
  { value: 'thermique', label: 'Thermique' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
  { value: 'electrique', label: 'Électrique' },
];
const DEUX_ROUES = [
  { value: 'scooter_thermique', label: 'Scooter thermique' },
  { value: 'scooter_electrique', label: 'Scooter électrique' },
  { value: 'moto_petite', label: 'Moto, petite cylindrée' },
  { value: 'moto_grosse', label: 'Moto, grosse cylindrée' },
];
const TRAINS = [
  { value: 'ter', label: 'TER ou train régional' },
  { value: 'rer', label: 'RER ou Transilien' },
  { value: 'intercites', label: 'Intercités' },
];
const VELOS = [
  { value: 'mecanique', label: 'Mécanique' },
  { value: 'electrique', label: 'À assistance électrique' },
];

// `PARTS_DU_SECOND_MODE` (src/types/bilan.ts), recopiée : une fraction, parce que c'est ce que le calcul multiplie.
const PARTS_DU_SECOND_MODE = [
  { value: 0.25, label: 'Un quart environ' },
  { value: 0.5, label: 'La moitié environ' },
  { value: 0.75, label: 'Les trois quarts environ' },
];

const Precision = ({ children }) => <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>{children}</div>;

export function CommuteExtraStep({ answers, update }) {
  const modesDuSecond = Object.keys(LIBELLES_DES_MODES).filter((id) => id !== answers.commute_mode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ThemedText type="screenTitle">{QUESTION_SECOND_MODE}</ThemedText>
        <ThemedText type="small" themeColor="textTertiary">Par exemple vélo puis train.</ThemedText>
        <GroupeDeChoix question={QUESTION_SECOND_MODE} style={{ flexDirection: 'row', gap: 8 }}>
          <Chip
            label="Oui"
            role="radio"
            selected={answers.commute_second_mode_used === true}
            onPress={() => update({ commute_second_mode_used: true })}
            flex
            radius={16}
            selectedStyle="outline"
          />
          <Chip
            label="Non"
            role="radio"
            selected={answers.commute_second_mode_used === false}
            onPress={() => update({ commute_second_mode_used: false, commute_second_mode: null })}
            flex
            radius={16}
            selectedStyle="outline"
          />
        </GroupeDeChoix>

        {answers.commute_second_mode_used === true && (
          <ThemedView type="backgroundElement" style={{ borderRadius: 16, padding: 16, gap: 8 }}>
            <ThemedText type="small" themeColor="textTertiary">{QUESTION_LEQUEL}</ThemedText>
            <GroupeDeChoix question={QUESTION_LEQUEL} style={{ gap: 8 }}>
              {modesDuSecond.map((modeId) => {
                const choisi = answers.commute_second_mode === modeId;
                return (
                  <div key={modeId} style={{ display: 'flex', flexDirection: 'column' }}>
                    <ModeListItem
                      label={LIBELLES_DES_MODES[modeId]}
                      selected={choisi}
                      onPress={() => update({ commute_second_mode: modeId })}
                      nestedBackground
                    />
                    {choisi && modeId === 'voiture' && (
                      <Precision>
                        <PrecisionMode
                          question="Quelle motorisation ?"
                          options={MOTORISATIONS}
                          valeur={answers.commute_car_engine}
                          onChange={(valeur) => update({ commute_car_engine: valeur })}
                        />
                      </Precision>
                    )}
                    {choisi && modeId === 'deux_roues_motorise' && (
                      <Precision>
                        <PrecisionMode
                          question="Quel type de deux-roues ?"
                          options={DEUX_ROUES}
                          valeur={answers.commute_two_wheeler_type}
                          onChange={(valeur) => update({ commute_two_wheeler_type: valeur })}
                        />
                      </Precision>
                    )}
                    {choisi && modeId === 'train' && (
                      <Precision>
                        <PrecisionMode
                          question="Quel type de train ?"
                          options={TRAINS}
                          valeur={answers.commute_train_type}
                          onChange={(valeur) => update({ commute_train_type: valeur })}
                        />
                      </Precision>
                    )}
                    {choisi && modeId === 'velo' && (
                      <Precision>
                        <PrecisionMode
                          question="Quel type de vélo ?"
                          options={VELOS}
                          valeur={answers.commute_velo_type}
                          onChange={(valeur) => update({ commute_velo_type: valeur })}
                        />
                      </Precision>
                    )}
                    {choisi && (
                      <Precision>
                        <PrecisionMode
                          question="Quelle part du trajet fais-tu ainsi ?"
                          options={PARTS_DU_SECOND_MODE}
                          valeur={answers.commute_second_mode_share}
                          onChange={(valeur) => update({ commute_second_mode_share: valeur })}
                        />
                      </Precision>
                    )}
                  </div>
                );
              })}
            </GroupeDeChoix>
          </ThemedView>
        )}
      </div>
      <MissingModeLink context="B1.7 second mode domicile-travail" />
    </div>
  );
}
