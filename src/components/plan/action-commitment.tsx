import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/bilan/chip';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { clearPlanActionCommitment, commitPlanAction } from '@/lib/plan-engagement';
import {
  INTENTION_DAYS,
  INTENTION_TIMINGS,
  intentionKindForPoste,
  isIntentionComplete,
  type IntentionDay,
  type IntentionTiming,
} from '@/types/plan';

// Étape 6b — choisir une action et y attacher une intention d'implémentation (v1-07 §3.3).
//
// Le levier n'est pas la case cochée, c'est le **quand** : « je le fais le mardi et le jeudi »
// tient bien mieux que « je vais essayer ». D'où une intention obligatoire pour s'engager, et
// une phrase relue en toutes lettres une fois l'engagement pris — pas une liste d'initiales.
//
// Deux choses que ce composant ne fait pas, et ne doit pas faire :
//   - il n'y a **aucune notion d'échec**. Pas de « tenu / pas tenu », pas de série, pas de
//     score. On peut changer d'action ou retirer son engagement sans que rien ne le compte
//     contre soi — même registre que l'écran /suivi.
//   - il ne passe pas par `Alert.alert` : sur web, l'alerte retombe sur `window.alert()`, qui
//     n'invoque pas fiablement `onPress` (cf. CLAUDE.md). L'erreur est un état du composant.
export function ActionCommitment({
  actionId,
  poste,
  committed,
  intentionDays,
  intentionTiming,
  otherActionCommitted,
  onChanged,
}: {
  actionId: string;
  poste: string | null;
  committed: boolean;
  intentionDays: number[] | null;
  intentionTiming: string | null;
  /** Une autre action du cycle porte déjà l'engagement : on propose de basculer, pas d'ajouter. */
  otherActionCommitted: boolean;
  onChanged: () => void;
}) {
  const kind = intentionKindForPoste(poste);

  const [picking, setPicking] = useState(false);
  const [days, setDays] = useState<IntentionDay[]>([]);
  const [timing, setTiming] = useState<IntentionTiming | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: IntentionDay) =>
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await commitPlanAction(
      actionId,
      kind === 'days' ? { days } : { timing: timing as IntentionTiming }
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPicking(false);
    setDays([]);
    setTiming(null);
    onChanged();
  };

  const release = async () => {
    setBusy(true);
    setError(null);
    const result = await clearPlanActionCommitment(actionId);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onChanged();
  };

  // L'engagement se lit désormais sur la carte elle-même — bordure, fond, étiquette et
  // intention (cf. `action-card.tsx`, v1-11 lot 1). Ce composant ne garde donc que ce qu'il
  // est seul à pouvoir faire ici : rendre la main.
  if (committed) {
    return (
      <View style={styles.footer}>
        <TextLink
          label="Changer d’avis"
          hint="Libère cette action ; tu pourras en choisir une autre"
          onPress={release}
          disabled={busy}
          type="small"
          themeColor="textTertiary"
          style={styles.link}
        />
        {error && (
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        )}
      </View>
    );
  }

  if (!picking) {
    return (
      <View style={styles.footer}>
        <Button
          title={otherActionCommitted ? 'Choisir celle-ci à la place' : 'Je m’y engage'}
          variant="secondary"
          onPress={() => setPicking(true)}
        />
      </View>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.picker}>
      <ThemedText type="small" themeColor="textTertiary">
        {kind === 'days' ? 'Quels jours ?' : 'Quand ?'}
      </ThemedText>

      {kind === 'days' ? (
        <View style={styles.dayRow}>
          {INTENTION_DAYS.map((day) => (
            <Chip
              // Deux jours portent l'initiale « M » : l'accessibilité passe par le libellé
              // long, pas par la puce.
              key={day.value}
              label={day.short}
              accessibilityLabel={day.long}
              selected={days.includes(day.value)}
              onPress={() => toggleDay(day.value)}
              flex
              radius={14}
            />
          ))}
        </View>
      ) : (
        <View style={styles.timingColumn}>
          {INTENTION_TIMINGS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={timing === option.value}
              onPress={() => setTiming(option.value)}
              radius={16}
              selectedStyle="outline"
            />
          ))}
        </View>
      )}

      {error && (
        <ThemedText type="small" themeColor="textSecondary">
          {error}
        </ThemedText>
      )}

      <View style={styles.pickerActions}>
        <TextLink
          label="Annuler"
          onPress={() => setPicking(false)}
          disabled={busy}
          type="small"
          themeColor="textTertiary"
          style={styles.link}
        />
        <Button
          title="C’est noté"
          onPress={submit}
          disabled={busy || !isIntentionComplete(kind, days, timing)}
          flex
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  footer: { marginTop: Spacing.three },
  picker: { marginTop: Spacing.three, borderRadius: 16, padding: Spacing.four, gap: Spacing.three },
  dayRow: { flexDirection: 'row', gap: 6 },
  timingColumn: { gap: Spacing.two },
  pickerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  link: { textDecorationLine: 'underline' },
});
