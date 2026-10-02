import { StyleSheet, View } from 'react-native';

import { IntituleDuChamp, useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { REPONSES_TELETRAVAIL, teletravailSePose, type BilanAnswers, type ChampDuBilan } from '@/types/bilan';
import {
  CHOIX_DE_TC,
  CHOIX_DE_VEHICULES,
  CHOIX_DE_ZONE,
  type ChoixDeContexte,
} from '@/types/contexte';
import { optionCible } from '@/types/demande';

/**
 * Les trois questions qui se posent à tout le monde, écrites **une fois** pour leurs deux usages :
 * le texte au-dessus de la série et le nom de son `radiogroup` (`GroupeDeChoix`). Sans le nom, une
 * puce « 1 » s'annonçait seule, sans rien qui dise qu'elle compte des véhicules — et `/contexte`, qui
 * reprend ces séries, n'a pas l'étape du questionnaire autour pour le rappeler.
 *
 * **Des questions, plus des intitulés** (D4 de `v1-33`, décidé le 01/10/2026 ; audit Q-5). « Type de
 * zone », « Accès aux transports en commun », « Véhicules motorisés dans le foyer » demandaient de se
 * classer là où toutes les autres étapes posent une question — la spécification écrivait déjà « Dans
 * quel type de zone vis-tu ? ». Les valeurs et les libellés des puces ne bougent pas : ni migration ni
 * miroir. Le nom de chaque groupe suit, puisqu'il **est** la question.
 */
const QUESTION_ZONE = 'Dans quel type de zone vis-tu ?';
const QUESTION_TC = 'Comment sont les transports en commun près de chez toi ?';
const QUESTION_VEHICULES = 'Combien de véhicules motorisés dans ton foyer ?';

/**
 * **La ligne d'aide sous la zone** (D4) : « Périurbain » est un mot d'urbaniste, et cette réponse décide
 * des actions du plan — le métro et le tram ne sont proposés qu'en zone urbaine dense (`PLAN.md` §1) —
 * et, avec un accès limité aux transports, de la moyenne montrée à la restitution (`mobility_constrained`
 * en zone rurale). **Alignée sur ce que le plan fait de la réponse** (décidé le 02/10/2026, `v1-33` §9) :
 * le texte de l'audit laissait sans place la ville moyenne desservie par un tram, qui choisissait
 * « Périurbain » et perdait le métro et le tram, et faisait proposer un métro à une proche banlieue qui
 * n'en a pas. « Là où passent métro ou tram » le dit. Ce qu'on accepte : une banlieue sans métro ni tram
 * qui choisit « Périurbain » perd aussi « les transports en commun pour deux sorties sur cinq », que la
 * zone borne de même. La vraie correction serait une question à part sur le métro et le tram — une
 * migration, pas une phrase.
 */
const AIDE_ZONE =
  'Urbain dense : une grande ville et sa proche banlieue, là où passent métro ou tram. Périurbain : sa couronne, ou une ville moyenne ou petite. Rural : un bourg, un village, la campagne.';

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
        aide={AIDE_ZONE}
        options={CHOIX_DE_ZONE}
        valeur={choix.zone_type}
        onChange={(value) => update({ zone_type: value })}
      />
      <SerieDuContexte
        champ="tc_access"
        question={QUESTION_TC}
        options={CHOIX_DE_TC}
        valeur={choix.tc_access}
        onChange={(value) => update({ tc_access: value })}
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
 * pour les quatre, qui ne différaient que par leurs réponses. **Les deux écrans la lisent** : dans le
 * questionnaire par `StepShell`, et dans `/contexte` depuis le 01/10/2026 (audit P-13), qui fournit les
 * ancres lui-même — son « Enregistrer », en attente sur un contexte incomplet, mène à ce qui manque au
 * lieu de rester désactivé sans dire pourquoi.
 */
function SerieDuContexte<T extends string>({
  champ,
  question,
  aide,
  options,
  valeur,
  onChange,
}: {
  champ: ChampDuBilan;
  question: string;
  /**
   * Une ligne d'aide sous la question, au-dessus des puces — dans le registre des aides du
   * questionnaire (« Un aller-retour compte pour deux vols. »), mais un cran plus lisible que
   * l'intitulé, qui est lui-même en tertiaire : deux lignes du même gris se liraient comme un
   * intitulé sur deux lignes.
   */
  aide?: string;
  options: readonly { value: T; label: string; accessibilityLabel?: string }[];
  valeur: T | null;
  onChange: (valeur: T) => void;
}) {
  const { bloc, cible, marque } = useAncreDuChamp(champ);
  const iCible = optionCible(options.map((option) => valeur === option.value));
  return (
    <View ref={bloc} style={styles.field}>
      <IntituleDuChamp type="small" themeColor="textTertiary" marque={marque}>
        {question}
      </IntituleDuChamp>
      {aide && (
        <ThemedText type="small" themeColor="textSecondary">
          {aide}
        </ThemedText>
      )}
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

const styles = StyleSheet.create({
  field: { gap: Spacing.two + 2 },
  row: { flexDirection: 'row', gap: Spacing.two },
});
