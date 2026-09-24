import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { REPONSES_TELETRAVAIL, teletravailSePose, type BilanAnswers } from '@/types/bilan';
import {
  CHOIX_DE_TC,
  CHOIX_DE_VEHICULES,
  CHOIX_DE_ZONE,
  type ChoixDeContexte,
} from '@/types/contexte';

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
  return (
    <>
      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          Type de zone
        </ThemedText>
        <View style={styles.row}>
          {CHOIX_DE_ZONE.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={choix.zone_type === option.value}
              onPress={() => update({ zone_type: option.value })}
              flex
              radius={Radius.chip}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          Accès aux transports en commun
        </ThemedText>
        <View style={styles.row}>
          {CHOIX_DE_TC.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={choix.tc_access === option.value}
              onPress={() => update({ tc_access: option.value })}
              flex
              radius={Radius.chip}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          Véhicules motorisés dans le foyer
        </ThemedText>
        <View style={styles.row}>
          {CHOIX_DE_VEHICULES.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={choix.household_vehicles === option.value}
              onPress={() => update({ household_vehicles: option.value })}
              flex
              radius={Radius.chip}
            />
          ))}
        </View>
      </View>

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
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textTertiary">
            Sur tes {trajet.commute_days_per_week} jours de trajet, combien pourrais-tu travailler
            depuis chez toi ?
          </ThemedText>
          <View style={styles.row}>
            {REPONSES_TELETRAVAIL.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                accessibilityLabel={option.accessibilityLabel}
                selected={choix.teletravail === option.value}
                onPress={() => update({ teletravail: option.value })}
                flex
                radius={Radius.chip}
              />
            ))}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two + 2 },
  row: { flexDirection: 'row', gap: Spacing.two },
});
