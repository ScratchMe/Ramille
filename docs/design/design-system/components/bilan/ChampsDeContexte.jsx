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

// `CHOIX_DE_ZONE`, `CHOIX_DE_TRANSPORTS` et `CHOIX_DE_VEHICULES` (src/types/contexte.ts), recopiées.
// Depuis `v1-34` (02/10/2026), la deuxième question n'est plus l'accès aux transports (Bon, Limité,
// Inexistant) mais ce qui passe près de chez soi, à cocher ; l'accès se déduit côté serveur.
const CHOIX_DE_ZONE = [
  { value: 'urbain_dense', label: 'Urbain dense' },
  { value: 'periurbain', label: 'Périurbain' },
  { value: 'rural', label: 'Rural' },
];
const CHOIX_DE_TRANSPORTS = [
  { value: 'metro_tram', label: 'Métro ou tram' },
  { value: 'rer', label: 'RER ou Transilien' },
  { value: 'train', label: 'Train (TER, Intercités)' },
  { value: 'bus', label: 'Bus' },
  { value: 'aucun', label: 'Rien de tout ça' },
];
const ORDRE_DES_TRANSPORTS = CHOIX_DE_TRANSPORTS.map((c) => c.value);

// `basculerTransport` (src/types/contexte.ts), recopié : « Rien de tout ça » exclut les autres dans les deux
// sens, et plus rien de coché rend `null` — la question est alors sans réponse.
const basculerTransport = (actuels, valeur) => {
  const deja = actuels ?? [];
  if (valeur === 'aucun') return deja.includes('aucun') ? null : ['aucun'];
  const sansAucun = deja.filter((v) => v !== 'aucun');
  const suivants = sansAucun.includes(valeur) ? sansAucun.filter((v) => v !== valeur) : [...sansAucun, valeur];
  return suivants.length === 0 ? null : ORDRE_DES_TRANSPORTS.filter((v) => suivants.includes(v));
};
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
const QUESTION_TRANSPORTS = 'Près de chez toi, qu’est-ce que tu pourrais prendre ?';
const AIDE_TRANSPORTS = 'Coche tout ce qui passe assez souvent pour t’en servir.';
const QUESTION_VEHICULES = 'Combien de véhicules motorisés dans ton foyer ?';
// La ligne d'aide sous la zone, en `small` `textSecondary` : un cran au-dessus de l'intitulé tertiaire. Une
// définition depuis `v1-34` (D6) : la zone ne décide plus du métro et du tram.
const AIDE_ZONE =
  'Urbain dense : une grande ville et sa proche banlieue. Périurbain : sa couronne, ou une ville moyenne ou petite. Rural : un bourg, un village, la campagne.';

// `field` (gap `Spacing.two + 2`) et `row` (rangée, gap `Spacing.two`) de la source.
const CHAMP = { display: 'flex', flexDirection: 'column', gap: 10 };
const RANGEE = { flexDirection: 'row', gap: 8 };
// `rangeeQuiPasseALaLigne` de la source : des pilules à largeur naturelle, qui passent à la ligne.
const RANGEE_QUI_PASSE_A_LA_LIGNE = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 };

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

// La série qui se coche (`v1-34`) : des `checkbox` dans un groupe nommé, des pilules à largeur naturelle.
const SerieCumulableDuContexte = ({ champ, question, aide, options, valeurs, onToggle }) => {
  const { bloc, marque } = useAncreDuChamp(champ);
  return (
    <div ref={bloc} style={CHAMP}>
      <IntituleDuChamp type="small" themeColor="textTertiary" marque={marque}>{question}</IntituleDuChamp>
      <ThemedText type="small" themeColor="textSecondary">{aide}</ThemedText>
      <GroupeDeChoix question={question} cumulable style={RANGEE_QUI_PASSE_A_LA_LIGNE}>
        {options.map((option) => (
          <Chip key={option.value} label={option.label} role="checkbox"
            selected={(valeurs ?? []).includes(option.value)} onPress={() => onToggle(option.value)} radius={14} />
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
      <SerieCumulableDuContexte champ="transports_proches" question={QUESTION_TRANSPORTS} aide={AIDE_TRANSPORTS}
        options={CHOIX_DE_TRANSPORTS} valeurs={choix.transports_proches}
        onToggle={(valeur) => update({ transports_proches: basculerTransport(choix.transports_proches, valeur) })} />
      {serie(QUESTION_VEHICULES, CHOIX_DE_VEHICULES, 'household_vehicles')}
      {teletravailSePose(trajet) && serie(questionTeletravail, REPONSES_TELETRAVAIL, 'teletravail')}
    </>
  );
}
