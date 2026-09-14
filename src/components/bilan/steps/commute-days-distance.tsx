import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChoiceRow } from '@/components/bilan/choice-row';
import { Chip } from '@/components/bilan/chip';
import { NumericField } from '@/components/bilan/numeric-field';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  afficherNombreSaisi,
  distanceBracketMidpointKm,
  distanceDomicileTravailARelire,
  type BilanAnswers,
  type DistanceBracket,
} from '@/types/bilan';

const DAYS = [1, 2, 3, 4, 5, 6, 7];

const BRACKETS: { value: DistanceBracket; label: string }[] = [
  { value: 'lt_5', label: 'Moins de 5 km' },
  { value: '5_15', label: '5 à 15 km' },
  { value: '15_30', label: '15 à 30 km' },
  { value: '30_50', label: '30 à 50 km' },
  { value: '50_plus', label: 'Plus de 50 km' },
];

// B1.2 / B1.3 — jours par semaine + distance (exacte ou par tranche si "Je ne sais
// pas"). Le sélecteur de jours est un choix de puces plutôt que le slider de la
// maquette : pas de composant slider dans les dépendances du projet, et sur une plage
// 1-7 les puces offrent la même précision sans ajouter de dépendance native.
export function CommuteDaysDistanceStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  const theme = useTheme();
  // Mode d'affichage local (pas dans `answers`) : "Je ne sais pas" doit basculer vers la
  // liste de tranches avant même qu'une tranche soit choisie, donc ne peut pas se
  // déduire seulement de `commute_distance_bracket !== null`.
  const [unknown, setUnknown] = useState(answers.commute_distance_bracket !== null);

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <ThemedText type="screenTitle">
          Ce trajet, tu le fais combien de jours par semaine ?
        </ThemedText>
        <View style={styles.daysRow}>
          {DAYS.map((day) => (
            <Chip
              key={day}
              label={String(day)}
              selected={answers.commute_days_per_week === day}
              onPress={() => update({ commute_days_per_week: day })}
              flex
              radius={14}
            />
          ))}
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      {unknown ? (
        <View style={styles.block}>
          <ThemedText type="subtitle" weight={600} style={styles.subtitle}>
            Environ, ça représente quelle distance ?
          </ThemedText>
          {/* **« On ajustera la précision plus tard » promettait un mécanisme qui n'existe pas**
              (C3.7, constat A12-22). Rien dans le produit ne revient demander une distance, et la
              phrase laissait attendre une relance. Ce qui existe vraiment, c'est le re-bilan — et
              il est préremplissable, donc peu coûteux : c'est ce qu'on dit à la place. */}
          <ThemedText type="small" themeColor="textTertiary">
            Une estimation suffit. Tu pourras donner un chiffre plus précis en refaisant ton
            bilan : tes réponses seront préremplies.
          </ThemedText>
          <View style={styles.bracketList}>
            {BRACKETS.map((bracket) => (
              <ChoiceRow
                key={bracket.value}
                label={bracket.label}
                selected={answers.commute_distance_bracket === bracket.value}
                onPress={() => update({ commute_distance_bracket: bracket.value })}
              />
            ))}
          </View>
          {/* La règle du calcul, dite à l'écran : une tranche est comptée par son milieu, et
              ce milieu était écrit en deux endroits sans être montré nulle part (audit
              A2-22). Ramille ne porte jamais de chiffre : ce texte n'est donc pas dans sa
              voix, c'est celle du produit.

              La phrase n'est vraie que parce qu'une tranche et un kilométrage ne coexistent
              pas — `normaliserReponses` efface la tranche dès qu'un kilométrage existe, le
              calcul faisant `coalesce(km, milieu)`. Sans cette exclusivité, l'écran
              annoncerait une distance que le calcul n'utiliserait pas. */}
          {answers.commute_distance_bracket !== null && (
            <ThemedText type="small" themeColor="textSecondary">
              On comptera environ{' '}
              {afficherNombreSaisi(distanceBracketMidpointKm(answers.commute_distance_bracket))} km
              pour un aller.
            </ThemedText>
          )}
          {/* Symétrique de « Je ne sais pas » : sans lui, le passage aux tranches était sans
              retour — `unknown` repart de la présence d'une tranche à chaque visite de
              l'étape, donc restait vrai, et la tranche se transmettait de re-bilan en
              re-bilan. L'écran promettait pourtant juste au-dessus qu'on ajusterait la
              précision plus tard (audit A2-18). */}
          <TextLink
            label="Je connais la distance exacte"
            hint="Revient à la saisie en kilomètres"
            onPress={() => {
              setUnknown(false);
              update({ commute_distance_bracket: null });
            }}
            type="linkPrimary"
          />
        </View>
      ) : (
        <View style={styles.block}>
          <ThemedText type="subtitle" weight={600} style={styles.subtitle}>
            Quelle distance pour un aller ?
          </ThemedText>
          <NumericField
            value={answers.commute_distance_km}
            onChange={(value) => update({ commute_distance_km: value })}
            unit="km"
            label="Distance pour un aller"
          />
          {/* Relecture proposée, jamais un blocage : un aller de 250 km existe. Ce qu'on
              attrape, c'est le 1200 saisi au lieu de 120 — cent fois trop lourd sur le poste
              le plus lourd du bilan, et rien ne le signalait (audit A2-1). Pas de
              `role="alert"` : ce n'est pas un échec. */}
          {distanceDomicileTravailARelire(answers) && (
            <ThemedText type="small" themeColor="textSecondary">
              C’est une longue distance pour un aller. Vérifie qu’il s’agit bien d’un seul
              trajet : le retour est déjà compté.
            </ThemedText>
          )}
          <TextLink
            label="Je ne sais pas"
            hint="Propose des tranches de distance à la place"
            onPress={() => {
              setUnknown(true);
              update({ commute_distance_km: null });
            }}
            type="linkPrimary"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  subtitle: { fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  daysRow: { flexDirection: 'row', gap: Spacing.two },
  separator: { height: 1 },
  bracketList: { gap: Spacing.two + 2 },
});
