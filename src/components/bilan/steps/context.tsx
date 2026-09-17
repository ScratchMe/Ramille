import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  REPONSES_TELETRAVAIL,
  teletravailSePose,
  type BilanAnswers,
  type HouseholdVehicles,
  type TcAccess,
  type ZoneType,
} from '@/types/bilan';

const ZONE_OPTIONS: { value: ZoneType; label: string }[] = [
  { value: 'urbain_dense', label: 'Urbain dense' },
  { value: 'periurbain', label: 'Périurbain' },
  { value: 'rural', label: 'Rural' },
];

const TC_OPTIONS: { value: TcAccess; label: string }[] = [
  { value: 'bon', label: 'Bon' },
  { value: 'limite', label: 'Limité' },
  { value: 'inexistant', label: 'Inexistant' },
];

const VEHICLE_OPTIONS: { value: HouseholdVehicles; label: string }[] = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2_plus', label: '2 ou plus' },
];

// B4 — n'entre pas dans le calcul (cf. v1-05 §3), sert au plan de réduction.
export function ContextStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <ThemedText type="screenTitle">
          Quel est ton contexte de mobilité ?
        </ThemedText>
        {/* Écart 12 (C5.4) — l'intro dit la **règle**, pas l'usage. « Ça nous sert à te proposer
            des actions réalistes » décrivait une intention ; « ne propose que ce qui tient »
            dit ce qui se passe, et c'est ce qui rend l'encart du plan lisible plus tard comme
            une prémisse et non comme une surprise. La seconde phrase ne bouge pas : c'est elle
            qui empêche de lire ces réponses comme un facteur du chiffre. */}
        <ThemedText type="small" themeColor="textTertiary">
          Ton plan ne propose que ce qui tient avec ces réponses. Elles n’entrent pas dans le
          calcul de ton bilan.
        </ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          Type de zone
        </ThemedText>
        <View style={styles.row}>
          {ZONE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={answers.zone_type === option.value}
              onPress={() => update({ zone_type: option.value })}
              flex
              radius={14}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          Accès aux transports en commun
        </ThemedText>
        <View style={styles.row}>
          {TC_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={answers.tc_access === option.value}
              onPress={() => update({ tc_access: option.value })}
              flex
              radius={14}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          Véhicules motorisés dans le foyer
        </ThemedText>
        <View style={styles.row}>
          {VEHICLE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={answers.household_vehicles === option.value}
              onPress={() => update({ household_vehicles: option.value })}
              flex
              radius={14}
            />
          ))}
        </View>
      </View>

      {/* B4.4 (C3.8, reformulée par C5.4) — la seule question de cette étape qui ne se pose pas à
          tout le monde. Ce qui décide vit dans `teletravailSePose` et **nulle part ici** : le même
          prédicat est lu par `manqueDeLEtape` et par `normaliserReponses`, sans quoi l'étape
          devient invalidable ou une réponse périmée part à la soumission (v1-17 §7.2).

          Elle existe parce que « Garder une journée de télétravail par semaine » était proposé —
          en tête — à une aide-soignante ou à un chauffeur, et formulé comme un manquement. Le
          libellé de l'action a changé aussi, mais le libellé seul ne suffisait pas : il faut la
          question, sinon l'action reste en tête chez les gros rouleurs sans alternative.

          **Et elle demande un nombre de jours depuis C5.4** : « Parfois » était une réponse sans
          unité que le produit lisait comme un seuil, donc elle coûtait une action sans le dire. Le
          nombre vient de B1.2, et « pourrais-tu » garde la possibilité — ce n'est pas ce qu'on fait
          déjà, qui est dans les jours de trajet déclarés. */}
      {teletravailSePose(answers) && (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textTertiary">
            Sur tes {answers.commute_days_per_week} jours de trajet, combien pourrais-tu travailler
            depuis chez toi ?
          </ThemedText>
          <View style={styles.row}>
            {REPONSES_TELETRAVAIL.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={answers.teletravail === option.value}
                onPress={() => update({ teletravail: option.value })}
                flex
                radius={14}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  intro: { gap: Spacing.two },
  field: { gap: Spacing.two + 2 },
  row: { flexDirection: 'row', gap: Spacing.two },
});
