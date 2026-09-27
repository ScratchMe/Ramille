import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/champs-de-contexte.tsx — les quatre questions du contexte de mobilité, écrites
// une fois pour deux écrans : la dernière étape du questionnaire (`ContextStep`) et l'écran autonome `/contexte`,
// qui les repose sans resoumettre de bilan. Seule l'introduction diffère, et elle reste chez chacun.
//
// Chaque question s'écrit une fois et sert deux fois : le texte au-dessus de la série et le nom de son groupe.
// La quatrième, le télétravail, ne se pose qu'avec un trajet régulier d'au moins deux jours et nomme ce nombre ;
// son prédicat n'est réécrit nulle part ailleurs. Un fragment : c'est l'écran hôte qui espace les questions.

// `CHOIX_DE_ZONE`, `CHOIX_DE_TC` et `CHOIX_DE_VEHICULES` (src/types/contexte.ts), recopiées.
const CHOIX_DE_ZONE = [
  { value: 'urbain_dense', label: 'Urbain dense' },
  { value: 'periurbain', label: 'Périurbain' },
  { value: 'rural', label: 'Rural' },
];
const CHOIX_DE_TC = [
  { value: 'bon', label: 'Bon' },
  { value: 'limite', label: 'Limité' },
  { value: 'inexistant', label: 'Inexistant' },
];
const CHOIX_DE_VEHICULES = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2_plus', label: '2 ou plus' },
];

// `REPONSES_TELETRAVAIL` et `teletravailSePose` (src/types/bilan.ts), recopiés. La puce est annoncée seule,
// détachée de sa question : « Aucun » n'y dirait rien, d'où le libellé accessible.
const REPONSES_TELETRAVAIL = [
  { value: 'aucun', label: 'Aucun', accessibilityLabel: 'Aucun jour' },
  { value: 'un_jour', label: 'Un jour', accessibilityLabel: 'Un jour par semaine' },
  { value: 'deux_ou_plus', label: 'Deux ou plus', accessibilityLabel: 'Deux jours par semaine ou plus' },
];
const teletravailSePose = (trajet) =>
  trajet.commute_has_regular_trip !== false && trajet.commute_days_per_week !== null && trajet.commute_days_per_week >= 2;

const QUESTION_ZONE = 'Type de zone';
const QUESTION_TC = 'Accès aux transports en commun';
const QUESTION_VEHICULES = 'Véhicules motorisés dans le foyer';

// `field` (gap `Spacing.two + 2`) et `row` (rangée, gap `Spacing.two`) de la source.
const CHAMP = { display: 'flex', flexDirection: 'column', gap: 10 };
const RANGEE = { flexDirection: 'row', gap: 8 };

export function ChampsDeContexte({ choix, trajet, update }) {
  const questionTeletravail = 'Sur tes ' + trajet.commute_days_per_week + ' jours de trajet, combien pourrais-tu travailler depuis chez toi ?';
  // Une série de puces équiréparties, rayon `Radius.chip` (14), sous sa question.
  const serie = (question, options, cle) => (
    <div style={CHAMP}>
      <ThemedText type="small" themeColor="textTertiary">{question}</ThemedText>
      <GroupeDeChoix question={question} style={RANGEE}>
        {options.map((option) => (
          <Chip key={option.value} label={option.label} accessibilityLabel={option.accessibilityLabel} role="radio"
            selected={choix[cle] === option.value} onPress={() => update({ [cle]: option.value })} flex radius={14} />
        ))}
      </GroupeDeChoix>
    </div>
  );
  return (
    <>
      {serie(QUESTION_ZONE, CHOIX_DE_ZONE, 'zone_type')}
      {serie(QUESTION_TC, CHOIX_DE_TC, 'tc_access')}
      {serie(QUESTION_VEHICULES, CHOIX_DE_VEHICULES, 'household_vehicles')}
      {teletravailSePose(trajet) && serie(questionTeletravail, REPONSES_TELETRAVAIL, 'teletravail')}
    </>
  );
}
