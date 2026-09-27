import React from 'react';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { ModeListItem } from '../forms/ModeListItem.jsx';
import { PrecisionMode } from '../forms/PrecisionMode.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { PrecisionChiffres } from './PrecisionChiffres.jsx';
import { MissingModeLink } from './MissingModeLink.jsx';
// Source : src/components/bilan/steps/commute-mode.tsx — B1.4 : le titre de l'étape, les neuf modes en
// `ModeListItem` dans un groupe nommé par la même question (gap 8), puis le lien du mode manquant (gap 24).
//
// Une précision — motorisation, type de deux-roues, de train, de vélo, taille du covoiturage — s'ouvre juste sous
// l'option choisie, à 8 px, DANS la liste et jamais après : chacune est son propre groupe, posé dans celui des
// modes. Jamais une entrée de plus dans la liste. Sous « Voiture (covoiturage) », la motorisation puis la taille :
// les deux décrivent la même voiture. L'étape n'écrit que le choix ; ce qu'il rend impossible est effacé par
// l'écran du questionnaire (`normaliserReponses`).

// Écrite une fois : le titre de l'étape et le nom de la liste des modes.
const QUESTION_MODE = 'Quel est ton mode de transport principal pour ce trajet ?';

// `COMMUTE_MODE_CHOICES`, `CAR_ENGINE_OPTIONS`, `TWO_WHEELER_TYPE_OPTIONS`, `TRAIN_TYPE_OPTIONS` et
// `VELO_TYPE_OPTIONS` (src/constants/transport-modes.ts), recopiées.
const CHOIX_DE_MODE = [
  { key: 'voiture_solo', modeId: 'voiture', carpool: false, label: 'Voiture (seul)' },
  { key: 'voiture_covoiturage', modeId: 'voiture', carpool: true, label: 'Voiture (covoiturage)' },
  { key: 'bus', modeId: 'bus', carpool: false, label: 'Bus' },
  { key: 'train', modeId: 'train', carpool: false, label: 'Train' },
  { key: 'metro_tram', modeId: 'metro_tram', carpool: false, label: 'Métro ou tram' },
  { key: 'velo', modeId: 'velo', carpool: false, label: 'Vélo' },
  { key: 'marche', modeId: 'marche', carpool: false, label: 'Marche' },
  { key: 'deux_roues_motorise', modeId: 'deux_roues_motorise', carpool: false, label: 'Deux-roues motorisé' },
  { key: 'trottinette', modeId: 'trottinette', carpool: false, label: 'Trottinette ou mobilité douce' },
];
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

// `TAILLES_DE_COVOITURAGE` (src/types/bilan.ts), recopiée : de 2 à 6, la dernière vaut « ce nombre ou plus », et
// chaque puce porte son libellé accessible.
const PLAFOND_COVOITURAGE = 6;
const TAILLES_DE_COVOITURAGE = [2, 3, 4, 5, PLAFOND_COVOITURAGE].map((n) => ({
  value: n,
  label: n === PLAFOND_COVOITURAGE ? n + '+' : String(n),
  accessibilityLabel: n === PLAFOND_COVOITURAGE ? n + ' personnes ou plus' : n + ' personnes',
}));

const Precision = ({ children }) => <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>{children}</div>;

export function CommuteModeStep({ answers, update }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ThemedText type="screenTitle">{QUESTION_MODE}</ThemedText>
      <GroupeDeChoix question={QUESTION_MODE} style={{ gap: 8 }}>
        {CHOIX_DE_MODE.map((choix) => {
          const selected = answers.commute_mode === choix.modeId && answers.commute_is_carpool === choix.carpool;
          return (
            <div key={choix.key} style={{ display: 'flex', flexDirection: 'column' }}>
              <ModeListItem
                label={choix.label}
                selected={selected}
                onPress={() => update({ commute_mode: choix.modeId, commute_is_carpool: choix.carpool })}
              />
              {selected && choix.modeId === 'voiture' && (
                <Precision>
                  <PrecisionMode
                    question="Quelle motorisation ?"
                    options={MOTORISATIONS}
                    valeur={answers.commute_car_engine}
                    onChange={(valeur) => update({ commute_car_engine: valeur })}
                  />
                </Precision>
              )}
              {selected && choix.modeId === 'deux_roues_motorise' && (
                <Precision>
                  <PrecisionMode
                    question="Quel type de deux-roues ?"
                    options={DEUX_ROUES}
                    valeur={answers.commute_two_wheeler_type}
                    onChange={(valeur) => update({ commute_two_wheeler_type: valeur })}
                  />
                </Precision>
              )}
              {selected && choix.modeId === 'train' && (
                <Precision>
                  <PrecisionMode
                    question="Quel type de train ?"
                    options={TRAINS}
                    valeur={answers.commute_train_type}
                    onChange={(valeur) => update({ commute_train_type: valeur })}
                  />
                </Precision>
              )}
              {selected && choix.modeId === 'velo' && (
                <Precision>
                  <PrecisionMode
                    question="Quel type de vélo ?"
                    options={VELOS}
                    valeur={answers.commute_velo_type}
                    onChange={(valeur) => update({ commute_velo_type: valeur })}
                  />
                </Precision>
              )}
              {selected && choix.carpool && (
                <Precision>
                  <PrecisionChiffres
                    question="Vous êtes combien à partager ce trajet ?"
                    options={TAILLES_DE_COVOITURAGE}
                    valeur={answers.commute_carpool_size}
                    onChange={(valeur) => update({ commute_carpool_size: valeur })}
                  />
                </Precision>
              )}
            </div>
          );
        })}
      </GroupeDeChoix>
      <MissingModeLink context="B1.4 mode domicile-travail" />
    </div>
  );
}
