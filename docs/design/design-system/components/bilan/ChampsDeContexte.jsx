import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { IntituleDuChamp, useAncreDuChamp } from '../forms/IntituleDuChamp.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/champs-de-contexte.tsx — les quatre questions du contexte de mobilité, écrites
// une fois pour deux écrans : la dernière étape du questionnaire (`ContextStep`) et l'écran autonome `/contexte`,
// qui les repose sans resoumettre de bilan. Seule l'introduction diffère, et elle reste chez chacun.
//
// Chaque question s'écrit une fois et sert deux fois : le texte au-dessus de la série et le nom de son groupe.
// La quatrième, le télétravail, ne se pose qu'avec un trajet régulier d'au moins deux jours et nomme ce nombre ;
// son prédicat n'est réécrit nulle part ailleurs. Un fragment : c'est l'écran hôte qui espace les questions.
//
// Chaque série est l'ancre où mène « Il manque encore … » dans le questionnaire : son intitulé passe en `accentText` 600,
// le focus va à sa puce cochée ou à la première. Dans `/contexte`, sans `StepShell` autour, l'ancre ne fait rien.

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

// Des questions, plus des intitulés (01/10/2026, D4 de `v1-33`) ; les puces ne bougent pas.
const QUESTION_ZONE = 'Dans quel type de zone vis-tu ?';
const QUESTION_TC = 'Comment sont les transports en commun près de chez toi ?';
const QUESTION_VEHICULES = 'Combien de véhicules motorisés dans ton foyer ?';
// La ligne d'aide sous la zone, en `small` `textSecondary` : un cran au-dessus de l'intitulé tertiaire.
const AIDE_ZONE =
  'Urbain dense : une grande ville et sa proche banlieue. Périurbain : sa couronne, ou une petite ville. Rural : un village, la campagne.';

// `field` (gap `Spacing.two + 2`) et `row` (rangée, gap `Spacing.two`) de la source.
const CHAMP = { display: 'flex', flexDirection: 'column', gap: 10 };
const RANGEE = { flexDirection: 'row', gap: 8 };

// Une série : son intitulé, ses puces équiréparties au rayon `Radius.chip` (14), et son ancre. Un composant et non une
// fonction qui rend du JSX : l'ancre est un hook.
const SerieDuContexte = ({ champ, question, aide, options, valeur, onChange }) => {
  const { bloc, marque } = useAncreDuChamp(champ);
  return (
    <div ref={bloc} style={CHAMP}>
      <IntituleDuChamp type="small" themeColor="textTertiary" marque={marque}>{question}</IntituleDuChamp>
      {aide && <ThemedText type="small" themeColor="textSecondary">{aide}</ThemedText>}
      <GroupeDeChoix question={question} style={RANGEE}>
        {options.map((option) => (
          <Chip key={option.value} label={option.label} accessibilityLabel={option.accessibilityLabel} role="radio"
            selected={valeur === option.value} onPress={() => onChange(option.value)} flex radius={14} />
        ))}
      </GroupeDeChoix>
    </div>
  );
};

export function ChampsDeContexte({ choix, trajet, update }) {
  const questionTeletravail = 'Sur tes ' + trajet.commute_days_per_week + ' jours de trajet, combien pourrais-tu travailler depuis chez toi ?';
  const serie = (question, options, cle, aide) => (
    <SerieDuContexte champ={cle} question={question} aide={aide} options={options} valeur={choix[cle]} onChange={(valeur) => update({ [cle]: valeur })} />
  );
  return (
    <>
      {serie(QUESTION_ZONE, CHOIX_DE_ZONE, 'zone_type', AIDE_ZONE)}
      {serie(QUESTION_TC, CHOIX_DE_TC, 'tc_access')}
      {serie(QUESTION_VEHICULES, CHOIX_DE_VEHICULES, 'household_vehicles')}
      {teletravailSePose(trajet) && serie(questionTeletravail, REPONSES_TELETRAVAIL, 'teletravail')}
    </>
  );
}
