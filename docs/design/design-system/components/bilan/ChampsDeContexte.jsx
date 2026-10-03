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

// Des questions, plus des intitulés (01/10/2026, D4 de `v1-33`).
const QUESTION_ZONE = 'Dans quel type de zone vis-tu ?';
const QUESTION_TRANSPORTS = 'Près de chez toi, qu’est-ce que tu pourrais prendre ?';
const AIDE_TRANSPORTS = 'Coche tout ce qui passe assez souvent pour t’en servir.';
const QUESTION_VEHICULES = 'Combien de véhicules motorisés dans ton foyer ?';
// La définition de la zone, une ligne par zone (03/10/2026, canvas de l'étape du contexte) : les mêmes mots, le
// terme en 600 `textSecondary`, la définition en 400 tertiaire. Une définition depuis `v1-34` (D6).
const DEFINITIONS_DE_ZONE = [
  ['Urbain dense :', 'une grande ville et sa proche banlieue.'],
  ['Périurbain :', 'sa couronne, ou une ville moyenne ou petite.'],
  ['Rural :', 'un bourg, un village, la campagne.'],
];

// **La question d'abord** (03/10/2026, même canvas) : la question en `default` 600 à l'encre, l'aide dessous en
// `small` 400 tertiaire, plus claire qu'elle — elle était en `textSecondary` sous un intitulé tertiaire.
// `field` (gap 12), `enTete` (gap 4), `row` (gap 8) de la source.
const CHAMP = { display: 'flex', flexDirection: 'column', gap: 12 };
const EN_TETE = { display: 'flex', flexDirection: 'column', gap: 4 };
const RANGEE = { flexDirection: 'row', gap: 8 };
// `rangeeQuiPasseALaLigne` de la source : des pilules à largeur naturelle, qui passent à la ligne.
const RANGEE_QUI_PASSE_A_LA_LIGNE = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 };

// Une série : son intitulé, ses puces équiréparties au rayon `Radius.chip` (14), et son ancre. Un composant et non une
// fonction qui rend du JSX : l'ancre est un hook.
const SerieDuContexte = ({ champ, question, definitions, options, valeur, onChange }) => {
  const { bloc, marque } = useAncreDuChamp(champ);
  return (
    <div ref={bloc} style={CHAMP}>
      <div style={EN_TETE}>
        <IntituleDuChamp type="default" weight={600} themeColor="text" marque={marque}>{question}</IntituleDuChamp>
        {definitions && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {definitions.map(([terme, definition]) => (
              <ThemedText key={terme} type="small" weight={400} themeColor="textTertiary">
                {/* `display: inline` : le ThemedText du kit est un bloc, et un Text imbriqué reste dans la ligne
                    dans le dépôt — sans lui, le terme passait seul à la ligne (9ᵉ synchronisation, 03/10/2026). */}
                <ThemedText type="small" weight={600} themeColor="textSecondary" style={{ display: 'inline' }}>{terme}</ThemedText> {definition}
              </ThemedText>
            ))}
          </div>
        )}
      </div>
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
// « Rien de tout ça » a sa ligne (03/10/2026) : elle exclut les autres, et la placer à part le dit avant qu'on la
// touche. Les deux rangées restent dans le même groupe nommé. Chaque puce porte sa case (`Chip`).
const SerieCumulableDuContexte = ({ champ, question, aide, options, valeurs, onToggle }) => {
  const { bloc, marque } = useAncreDuChamp(champ);
  const puce = (option) => (
    <Chip key={option.value} label={option.label} role="checkbox"
      selected={(valeurs ?? []).includes(option.value)} onPress={() => onToggle(option.value)} radius={14} />
  );
  return (
    <div ref={bloc} style={CHAMP}>
      <div style={EN_TETE}>
        <IntituleDuChamp type="default" weight={600} themeColor="text" marque={marque}>{question}</IntituleDuChamp>
        <ThemedText type="small" weight={400} themeColor="textTertiary">{aide}</ThemedText>
      </div>
      <GroupeDeChoix question={question} cumulable style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', ...RANGEE_QUI_PASSE_A_LA_LIGNE }}>{options.filter((o) => o.value !== 'aucun').map(puce)}</div>
        <div style={{ display: 'flex', ...RANGEE_QUI_PASSE_A_LA_LIGNE }}>{options.filter((o) => o.value === 'aucun').map(puce)}</div>
      </GroupeDeChoix>
    </div>
  );
};

export function ChampsDeContexte({ choix, trajet, update }) {
  const questionTeletravail = 'Sur tes ' + trajet.commute_days_per_week + ' jours de trajet, combien pourrais-tu travailler depuis chez toi ?';
  const serie = (question, options, cle, definitions) => (
    <SerieDuContexte champ={cle} question={question} definitions={definitions} options={options} valeur={choix[cle]} onChange={(valeur) => update({ [cle]: valeur })} />
  );
  return (
    <>
      {serie(QUESTION_ZONE, CHOIX_DE_ZONE, 'zone_type', DEFINITIONS_DE_ZONE)}
      <SerieCumulableDuContexte champ="transports_proches" question={QUESTION_TRANSPORTS} aide={AIDE_TRANSPORTS}
        options={CHOIX_DE_TRANSPORTS} valeurs={choix.transports_proches}
        onToggle={(valeur) => update({ transports_proches: basculerTransport(choix.transports_proches, valeur) })} />
      {serie(QUESTION_VEHICULES, CHOIX_DE_VEHICULES, 'household_vehicles')}
      {teletravailSePose(trajet) && serie(questionTeletravail, REPONSES_TELETRAVAIL, 'teletravail')}
    </>
  );
}
