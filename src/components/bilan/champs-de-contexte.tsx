import { StyleSheet, View } from 'react-native';

import { IntituleDuChamp, useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  REPONSES_TELETRAVAIL,
  teletravailSePose,
  type BilanAnswers,
  type ChampDuBilan,
  type TransportProche,
} from '@/types/bilan';
import {
  AUCUN_TRANSPORT,
  basculerTransport,
  CHOIX_DE_TRANSPORTS,
  CHOIX_DE_VEHICULES,
  CHOIX_DE_ZONE,
  type ChoixDeContexte,
} from '@/types/contexte';
import { optionCible } from '@/types/demande';

/**
 * Les trois questions qui se posent à tout le monde, écrites **une fois** pour leurs deux usages :
 * le texte au-dessus de la série et le nom de son groupe (`GroupeDeChoix` : un `radiogroup`, ou un
 * `group` pour la série à cocher depuis `v1-34`). Sans le nom, une
 * puce « 1 » s'annonçait seule, sans rien qui dise qu'elle compte des véhicules — et `/contexte`, qui
 * reprend ces séries, n'a pas l'étape du questionnaire autour pour le rappeler.
 *
 * **Des questions, plus des intitulés** (D4 de `v1-33`, décidé le 01/10/2026 ; audit Q-5). « Type de
 * zone », « Accès aux transports en commun », « Véhicules motorisés dans le foyer » demandaient de se
 * classer là où toutes les autres étapes posent une question — la spécification écrivait déjà « Dans
 * quel type de zone vis-tu ? ». Les valeurs et les libellés des puces ne bougent pas : ni migration ni
 * miroir. Le nom de chaque groupe suit, puisqu'il **est** la question.
 *
 * **La deuxième n'est plus un jugement mais un fait** (`v1-34`, décidé le 02/10/2026). « Comment sont
 * les transports en commun près de chez toi ? — Bon, Limité, Inexistant » ne disait pas quel
 * transport passe : le plan décidait du métro et du tram sur la zone, et ne proposait jamais le RER.
 * La question qui la remplace se répond en cochant, et l'accès s'en déduit côté serveur.
 */
const QUESTION_ZONE = 'Dans quel type de zone vis-tu ?';
const QUESTION_TRANSPORTS = 'Près de chez toi, qu’est-ce que tu pourrais prendre ?';
const QUESTION_VEHICULES = 'Combien de véhicules motorisés dans ton foyer ?';

/**
 * **La fréquence se dit dans l'aide** (D2 de `v1-34`) : un village desservi par deux TER par jour a
 * une gare, et ne peut pas faire deux trajets sur cinq en train. Le produit ne mesure pas la desserte ;
 * c'est la personne qui juge, comme elle jugeait entre « bon » et « limité ».
 */
const AIDE_TRANSPORTS = 'Coche tout ce qui passe assez souvent pour t’en servir.';

/**
 * **La ligne d'aide sous la zone** (D4 de `v1-33`) : « Périurbain » est un mot d'urbaniste. Elle a porté
 * le 02/10/2026 « là où passent métro ou tram », parce que la zone décidait alors du métro et du tram
 * (`v1-33` §9). **Elle redevient une définition le même soir** (D6 de `v1-34`) : ce qui passe près de
 * chez soi a sa propre question, la zone ne décide plus d'aucune action, et garder la clause demanderait
 * de se classer selon le métro alors que le métro ne se décide plus là. La zone garde sa part dans la
 * moyenne montrée à la restitution (`mobility_constrained` en zone rurale).
 */
const DEFINITIONS_DE_ZONE = [
  { terme: 'Urbain dense :', definition: 'une grande ville et sa proche banlieue.' },
  { terme: 'Périurbain :', definition: 'sa couronne, ou une ville moyenne ou petite.' },
  { terme: 'Rural :', definition: 'un bourg, un village, la campagne.' },
] as const;
// **Une ligne par zone** (03/10/2026, canvas de l'étape du contexte) : les mêmes mots, mis en liste — la
// phrase d'un seul tenant se lisait comme un bloc sombre, plus foncé que la question qu'il explique. Le
// terme se lit d'abord, la définition à côté, plus claire.

/**
 * Les quatre questions B4, rendues **une seule fois pour deux écrans** (C6.4, `v1-19` D5).
 *
 * Elles étaient écrites dans `ContextStep`, la dernière étape du questionnaire. Depuis que le
 * contexte se corrige aussi seul — sans resoumettre un bilan —, il y a deux surfaces qui posent les
 * mêmes questions, et deux copies auraient divergé : c'est exactement ce que `CarteDOuverture`
 * (C5.6) et `CarteDePiste` (C5.2) ont déjà coûté. Ce qui change entre les deux écrans est
 * l'**introduction** — le questionnaire annonce une étape, l'écran autonome annonce une
 * correction — donc c'est elle qui reste chez chacun, et elle seule.
 *
 * **Le prédicat du télétravail n'est pas réécrit ici non plus** : `teletravailSePose` est appelé
 * une fois, à cet endroit, sur les deux colonnes de trajet que les deux appelants savent fournir.
 * Trois endroits décident ensemble de l'affichage, de l'effacement et de la réclamation de B4.4
 * (`v1-17` §7.2) ; en ajouter un quatrième serait la façon la plus sûre de les désaccorder.
 */
export function ChampsDeContexte({
  choix,
  trajet,
  update,
}: {
  choix: ChoixDeContexte;
  /** Ce dont dépend la question du télétravail, et rien de plus. */
  trajet: Pick<BilanAnswers, 'commute_has_regular_trip' | 'commute_days_per_week'>;
  update: (patch: Partial<ChoixDeContexte>) => void;
}) {
  // La question du télétravail nomme le nombre de jours déclaré : elle se compose ici, une fois, pour
  // le texte affiché comme pour le nom du groupe.
  const questionTeletravail = `Sur tes ${trajet.commute_days_per_week} jours de trajet, combien pourrais-tu travailler depuis chez toi ?`;

  return (
    <>
      <SerieDuContexte
        champ="zone_type"
        question={QUESTION_ZONE}
        definitions={DEFINITIONS_DE_ZONE}
        options={CHOIX_DE_ZONE}
        valeur={choix.zone_type}
        onChange={(value) => update({ zone_type: value })}
      />
      <SerieCumulableDuContexte
        champ="transports_proches"
        question={QUESTION_TRANSPORTS}
        aide={AIDE_TRANSPORTS}
        options={CHOIX_DE_TRANSPORTS}
        valeurs={choix.transports_proches}
        onToggle={(value) => update({ transports_proches: basculerTransport(choix.transports_proches, value) })}
      />
      <SerieDuContexte
        champ="household_vehicles"
        question={QUESTION_VEHICULES}
        options={CHOIX_DE_VEHICULES}
        valeur={choix.household_vehicles}
        onChange={(value) => update({ household_vehicles: value })}
      />

      {/* B4.4 (C3.8, reformulée par C5.4) — la seule question de cette étape qui ne se pose pas à
          tout le monde.

          Elle existe parce que « Garder une journée de télétravail par semaine » était proposé —
          en tête — à une aide-soignante ou à un chauffeur, et formulé comme un manquement. Le
          libellé de l'action a changé aussi, mais le libellé seul ne suffisait pas : il faut la
          question, sinon l'action reste en tête chez les gros rouleurs sans alternative.

          **Et elle demande un nombre de jours depuis C5.4** : « Parfois » était une réponse sans
          unité que le produit lisait comme un seuil, donc elle coûtait une action sans le dire. Le
          nombre vient de B1.2, et « pourrais-tu » garde la possibilité — ce n'est pas ce qu'on fait
          déjà, qui est dans les jours de trajet déclarés. */}
      {teletravailSePose(trajet) && (
        <SerieDuContexte
          champ="teletravail"
          question={questionTeletravail}
          options={REPONSES_TELETRAVAIL}
          valeur={choix.teletravail}
          onChange={(value) => update({ teletravail: value })}
        />
      )}
    </>
  );
}

/**
 * Une série du contexte : son intitulé, ses puces, et l'ancre où mène « Il manque encore … »
 * (`v1-31` §2.5) — l'intitulé se marque, le focus va à la puce cochée ou à la première. Écrite une fois
 * pour les séries à choix unique, qui ne diffèrent que par leurs réponses — trois depuis `v1-34`, la série
 * à cocher ayant la sienne (`SerieCumulableDuContexte`). **Les deux écrans la lisent** : dans le
 * questionnaire par `StepShell`, et dans `/contexte` depuis le 01/10/2026 (audit P-13), qui fournit les
 * ancres lui-même — son « Enregistrer », en attente sur un contexte incomplet, mène à ce qui manque au
 * lieu de rester désactivé sans dire pourquoi.
 */
function SerieDuContexte<T extends string>({
  champ,
  question,
  definitions,
  options,
  valeur,
  onChange,
}: {
  champ: ChampDuBilan;
  question: string;
  /**
   * Des définitions sous la question, au-dessus des puces — une par réponse. **Plus claires que la
   * question qu'elles expliquent** depuis le 03/10/2026 : l'aide était en `textSecondary` sous un
   * intitulé tertiaire, « un cran au-dessus » (D4 de `v1-33`) ; avec deux aides, l'étape se lisait en
   * deux blocs sombres et les questions passaient au second plan. La question est désormais en encre
   * et en 600, l'aide en tertiaire et en 400.
   */
  definitions?: readonly { terme: string; definition: string }[];
  options: readonly { value: T; label: string; accessibilityLabel?: string }[];
  valeur: T | null;
  onChange: (valeur: T) => void;
}) {
  const { bloc, cible, marque } = useAncreDuChamp(champ);
  const iCible = optionCible(options.map((option) => valeur === option.value));
  return (
    <View ref={bloc} style={styles.field}>
      <View style={styles.enTete}>
        <IntituleDuChamp type="default" weight={600} themeColor="text" marque={marque}>
          {question}
        </IntituleDuChamp>
        {definitions && (
          <View style={styles.definitions}>
            {definitions.map(({ terme, definition }) => (
              <ThemedText key={terme} type="small" weight={400} themeColor="textTertiary">
                <ThemedText type="small" weight={600} themeColor="textSecondary">
                  {terme}
                </ThemedText>{' '}
                {definition}
              </ThemedText>
            ))}
          </View>
        )}
      </View>
      <GroupeDeChoix question={question} style={styles.row}>
        {options.map((option, i) => (
          <Chip
            key={option.value}
            ref={i === iCible ? cible : undefined}
            label={option.label}
            accessibilityLabel={option.accessibilityLabel}
            role="radio"
            selected={valeur === option.value}
            onPress={() => onChange(option.value)}
            flex
            radius={Radius.chip}
          />
        ))}
      </GroupeDeChoix>
    </View>
  );
}

/**
 * La série qui se coche (`v1-34`) : des `checkbox` dans un groupe nommé, jamais des `radio` — qui
 * annonceraient qu'en cocher une décoche les autres —, comme les jours d'une intention. **Le premier
 * choix multiple du questionnaire**, et le premier avec une réponse qui exclut les autres : la règle
 * vit dans `basculerTransport`, pas ici. Les puces gardent leur largeur naturelle et passent à la
 * ligne, comme celles des sorties et des voyages : « Train (TER, Intercités) » ne tient pas dans un
 * cinquième de rangée.
 */
function SerieCumulableDuContexte({
  champ,
  question,
  aide,
  options,
  valeurs,
  onToggle,
}: {
  champ: ChampDuBilan;
  question: string;
  aide: string;
  options: readonly { value: TransportProche; label: string }[];
  valeurs: readonly TransportProche[] | null;
  onToggle: (valeur: TransportProche) => void;
}) {
  const { bloc, cible, marque } = useAncreDuChamp(champ);
  const cochees = options.map((option) => valeurs?.includes(option.value) ?? false);
  const iCible = optionCible(cochees);
  const puce = (option: (typeof options)[number], i: number) => (
    <Chip
      key={option.value}
      ref={i === iCible ? cible : undefined}
      label={option.label}
      role="checkbox"
      selected={cochees[i]}
      onPress={() => onToggle(option.value)}
      radius={Radius.chip}
    />
  );
  const rangs = options.map((option, i) => ({ option, i }));
  return (
    <View ref={bloc} style={styles.field}>
      <View style={styles.enTete}>
        <IntituleDuChamp type="default" weight={600} themeColor="text" marque={marque}>
          {question}
        </IntituleDuChamp>
        <ThemedText type="small" weight={400} themeColor="textTertiary">
          {aide}
        </ThemedText>
      </View>
      {/* **« Rien de tout ça » a sa ligne** (03/10/2026, canvas de l'étape du contexte) : elle exclut les
          autres, et la placer à part le dit avant qu'on la touche. Les deux rangées restent dans le même
          groupe nommé, qui n'est pas un `radiogroup`. */}
      <GroupeDeChoix question={question} cumulable style={styles.rangees}>
        <View style={styles.rangeeQuiPasseALaLigne}>
          {rangs.filter(({ option }) => option.value !== AUCUN_TRANSPORT).map(({ option, i }) => puce(option, i))}
        </View>
        <View style={styles.rangeeQuiPasseALaLigne}>
          {rangs.filter(({ option }) => option.value === AUCUN_TRANSPORT).map(({ option, i }) => puce(option, i))}
        </View>
      </GroupeDeChoix>
    </View>
  );
}

const styles = StyleSheet.create({
  // La question et son aide, serrées ; les puces, à 12 dessous.
  field: { gap: Spacing.two + Spacing.one },
  enTete: { gap: Spacing.one },
  definitions: { gap: Spacing.half },
  row: { flexDirection: 'row', gap: Spacing.two },
  rangees: { gap: Spacing.two },
  rangeeQuiPasseALaLigne: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
