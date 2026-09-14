import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/bilan/chip';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
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
  onEngage,
  onRefus,
}: {
  actionId: string;
  poste: string | null;
  committed: boolean;
  intentionDays: number[] | null;
  intentionTiming: string | null;
  /** Une autre action du cycle porte déjà l'engagement : on propose de basculer, pas d'ajouter. */
  otherActionCommitted: boolean;
  onChanged: () => void;
  /**
   * Appelé **seulement** quand un engagement vient d'être pris — pas quand on en change ni
   * quand on le libère. C'est ce qui déclenche la feuille des rappels (v1-12 §6.1), et elle
   * n'a de sens qu'à cet instant précis : la personne vient de dire quand elle va agir.
   */
  onEngage?: () => void;
  /**
   * Appelé quand le serveur **refuse** le remplacement (`RM001`), avec la phrase à afficher.
   *
   * Le message ne peut pas vivre dans cet état local : le même chemin appelle `onChanged()`, donc le
   * plan est relu et ce composant remonté — la phrase disparaissait au rendu suivant, et personne ne
   * lisait jamais pourquoi son choix n'avait pas été pris (relevé le 14/09/2026). C'est l'écran qui
   * la porte, au-dessus du plan, là où la ligne de relecture se dit déjà.
   */
  onRefus?: (message: string | null) => void;
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
    // Le refus précédent appartenait à la tentative précédente : il s'efface ici et nulle part
    // ailleurs. La relecture qui suit un refus est déclenchée par le même `onChanged` que le succès,
    // donc l'effacer là ferait disparaître le message avant qu'il ne soit lu.
    onRefus?.(null);
    const result = await commitPlanAction(
      actionId,
      kind === 'days' ? { days } : { timing: timing as IntentionTiming },
      // **Remplacer se dit, il ne se déduit pas** (C4.6). Le bouton affiche « Choisir celle-ci à la
      // place » quand une autre action est engagée : c'est exactement ce qu'on transmet, et le RPC
      // refuse un remplacement qu'on ne lui a pas demandé plutôt que d'effacer en silence les jours
      // et l'intention que la personne avait choisis.
      otherActionCommitted
    );
    setBusy(false);
    if (!result.ok) {
      // L'écran ne savait pas qu'une autre action était engagée : on relit plutôt que de laisser un
      // plan qui ne dit pas la vérité, et le message explique ce que la relecture va montrer — mais
      // il se dit **à l'écran**, parce que la relecture remonte cette carte et emporterait un état
      // local avec elle.
      if (result.rechargerLePlan) {
        onRefus?.(result.message);
        onChanged();
        return;
      }
      setError(result.message);
      return;
    }
    setPicking(false);
    setDays([]);
    setTiming(null);
    onChanged();
    onEngage?.();
  };

  const release = async () => {
    setBusy(true);
    setError(null);
    onRefus?.(null);
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
  picker: { marginTop: Spacing.three, borderRadius: Radius.field, padding: Spacing.four, gap: Spacing.three },
  dayRow: { flexDirection: 'row', gap: 6 },
  timingColumn: { gap: Spacing.two },
  pickerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  link: { textDecorationLine: 'underline' },
});
