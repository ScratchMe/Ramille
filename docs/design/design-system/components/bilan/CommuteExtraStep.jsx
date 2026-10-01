import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { BoiteDePrecision } from '../forms/BoiteDePrecision.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { IntituleDuChamp, useAncreDuChamp } from '../forms/IntituleDuChamp.jsx';
import { ModeListItem } from '../forms/ModeListItem.jsx';
import { PrecisionMode } from '../forms/PrecisionMode.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { ThemedView } from '../core/ThemedView.jsx';
import { MissingModeLink } from './MissingModeLink.jsx';
// Source : src/components/bilan/steps/commute-extra.tsx — B1.6 / B1.7 : le titre de l'étape, le mode principal
// rappelé puis un exemple, en tertiaire (« En plus de : Voiture. Par exemple vélo puis train. »), le « Oui / Non » en deux puces équiréparties (contour, `Radius.field` = 16), puis, sur « Oui », l'encart
// « Lequel ? » (fond élément, `Radius.field`, padding 16, gap 8) : les modes sans celui du trajet principal, en
// `ModeListItem` sur fond de page, rangés par famille comme la liste du mode principal (4 dans une famille, 16 entre
// deux). **Le lien du mode manquant ne se rend que sur « Oui », sous l'encart, à 8** (01/10/2026, `v1-33`, Q-8) : il
// n'était plus au pied de l'écran en toutes circonstances, où il parlait d'une liste absente. 16 dans le bloc.
//
// Sous le mode choisi, dans la liste, une seule `BoiteDePrecision` : sa précision (motorisation, type de deux-roues,
// de train, de vélo) s'il en a une, puis, pour tout mode, la part du trajet qu'il couvre — demandée, jamais supposée.
// Rien n'est coché d'avance : « Non » sous-estimerait un trajet intermodal. « Non » efface le second mode ; le reste
// est effacé par l'écran.
//
// Ce qui manque : « une réponse sur le second mode » mène au « Oui / Non » (le titre ne se marque pas) ; « le second
// mode » à « Lequel ? », dont l'intitulé se marque ; le reste à la précision.

// Écrites une fois : le titre de l'étape et le nom du « Oui / Non » ; l'intitulé de la liste imbriquée et le nom
// de son groupe.
const QUESTION_SECOND_MODE = 'Utilises-tu un second mode en complément ?';
const QUESTION_LEQUEL = 'Lequel ?';

// `TRANSPORT_MODE_LABELS`, `MODES_PAR_FAMILLE`, `CAR_ENGINE_OPTIONS`, `TWO_WHEELER_TYPE_OPTIONS`, `TRAIN_TYPE_OPTIONS` et
// `VELO_TYPE_OPTIONS` (src/constants/transport-modes.ts), recopiées. « Lequel ? » itère `MODES_PAR_FAMILLE`, jamais
// l'ordre des clés d'un objet.
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
const MODES_PAR_FAMILLE = [
  { modeId: 'voiture', famille: 'motorise' },
  { modeId: 'deux_roues_motorise', famille: 'motorise' },
  { modeId: 'bus', famille: 'collectif' },
  { modeId: 'train', famille: 'collectif' },
  { modeId: 'metro_tram', famille: 'collectif' },
  { modeId: 'velo', famille: 'actif' },
  { modeId: 'marche', famille: 'actif' },
  { modeId: 'trottinette', famille: 'actif' },
];
const FAMILLE_DU_MODE = Object.fromEntries(MODES_PAR_FAMILLE.map(({ modeId, famille }) => [modeId, famille]));
// `enFamilles` (src/constants/transport-modes.ts), recopiée : un bloc par suite de modes de la même famille.
const enFamilles = (modes) => {
  const blocs = [];
  let precedente = null;
  for (const modeId of modes) {
    if (FAMILLE_DU_MODE[modeId] !== precedente) blocs.push([]);
    blocs[blocs.length - 1].push(modeId);
    precedente = FAMILLE_DU_MODE[modeId];
  }
  return blocs;
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

export function CommuteExtraStep({ answers, update }) {
  const modesDuSecond = MODES_PAR_FAMILLE.map(({ modeId }) => modeId).filter((id) => id !== answers.commute_mode);
  // Ce que le second mode ouvre, dans l'ordre de l'écran : son type quand il en a un, puis la part du trajet.
  const precisionsDuSecondMode = (modeId) =>
    [
      modeId === 'voiture' && (
        <PrecisionMode key="motorisation" champ="commute_car_engine" question="Quelle motorisation ?" options={MOTORISATIONS}
          valeur={answers.commute_car_engine} onChange={(valeur) => update({ commute_car_engine: valeur })} />
      ),
      modeId === 'deux_roues_motorise' && (
        <PrecisionMode key="deux-roues" champ="commute_two_wheeler_type" question="Quel type de deux-roues ?" options={DEUX_ROUES}
          valeur={answers.commute_two_wheeler_type} onChange={(valeur) => update({ commute_two_wheeler_type: valeur })} />
      ),
      modeId === 'train' && (
        <PrecisionMode key="train" champ="commute_train_type" question="Quel type de train ?" options={TRAINS}
          valeur={answers.commute_train_type} onChange={(valeur) => update({ commute_train_type: valeur })} />
      ),
      modeId === 'velo' && (
        <PrecisionMode key="velo" champ="commute_velo_type" question="Quel type de vélo ?" options={VELOS}
          valeur={answers.commute_velo_type} onChange={(valeur) => update({ commute_velo_type: valeur })} />
      ),
      <PrecisionMode key="part" champ="commute_second_mode_share" question="Quelle part du trajet fais-tu ainsi ?" options={PARTS_DU_SECOND_MODE}
        valeur={answers.commute_second_mode_share} onChange={(valeur) => update({ commute_second_mode_share: valeur })} />,
    ].filter(Boolean);
  // Où mène ce qui manque : la question du second mode (le titre ne se marque pas), puis « Lequel ? », qui se marque.
  const { bloc: blocDeLaQuestion } = useAncreDuChamp('commute_second_mode_used');
  const { bloc: blocDeLequel, marque: lequelMarque } = useAncreDuChamp('commute_second_mode');

  return (
    <div ref={blocDeLaQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ThemedText type="screenTitle">{QUESTION_SECOND_MODE}</ThemedText>
      {/* Le mode principal rappelé avant l'exemple (01/10/2026, `v1-33` D6) : le libellé de la table, sans accord. */}
      <ThemedText type="small" themeColor="textTertiary">
        {answers.commute_mode !== null ? 'En plus de : ' + LIBELLES_DES_MODES[answers.commute_mode] + '. ' : ''}Par exemple vélo puis train.
      </ThemedText>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div ref={blocDeLequel} style={{ display: 'flex', flexDirection: 'column' }}>
            <ThemedView type="backgroundElement" style={{ borderRadius: 16, padding: 16, gap: 8 }}>
              <IntituleDuChamp type="small" themeColor="textTertiary" marque={lequelMarque}>{QUESTION_LEQUEL}</IntituleDuChamp>
              <GroupeDeChoix question={QUESTION_LEQUEL} style={{ gap: 16 }}>
                {enFamilles(modesDuSecond).map((famille) => (
                  <div key={FAMILLE_DU_MODE[famille[0]]} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {famille.map((modeId) => (
                      <div key={modeId} style={{ display: 'flex', flexDirection: 'column' }}>
                        <ModeListItem
                          label={LIBELLES_DES_MODES[modeId]}
                          selected={answers.commute_second_mode === modeId}
                          onPress={() => update({ commute_second_mode: modeId })}
                          nestedBackground
                        />
                        {answers.commute_second_mode === modeId && (
                          <BoiteDePrecision>{precisionsDuSecondMode(modeId)}</BoiteDePrecision>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </GroupeDeChoix>
            </ThemedView>
          </div>
          <MissingModeLink context="B1.7 second mode domicile-travail" />
        </div>
      )}
    </div>
  );
}
