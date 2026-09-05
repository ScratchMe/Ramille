import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/bilan/chip';
import { Mascot } from '@/components/mascot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  FEEDBACK_KINDS,
  FEEDBACK_MAX_LENGTH,
  sendFeedback,
  type FeedbackKind,
} from '@/lib/feedback';

// Écran de retour utilisateur (issue #29).
//
// Ce qui a fait entrer cette brique dans la V1 : le référentiel de modes de transport est
// forcément incomplet, et rien ne permettait de l'apprendre. Quelqu'un dont le mode principal
// manque n'avait que deux options, mentir ou partir — toutes deux silencieuses.
//
// L'écran ne promet pas de réponse, parce qu'il n'existe aucun canal pour en donner une. Il
// promet que le retour arrive quelque part, et c'est tout ce qu'il dit.
//
// L'état de succès est un état de composant, jamais une `Alert` : sur web `Alert.alert`
// retombe sur `window.alert()`, qui n'invoque pas fiablement `onPress` (cf. CLAUDE.md).
export default function Feedback() {
  const theme = useTheme();
  const { kind: kindParam, context } = useLocalSearchParams<{ kind?: string; context?: string }>();

  const initialKind = FEEDBACK_KINDS.some((k) => k.value === kindParam)
    ? (kindParam as FeedbackKind)
    : 'idee';

  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const trimmed = message.trim();
  const canSend = trimmed.length >= 3 && !sending;

  const onSend = async () => {
    setSending(true);
    setError(null);
    const result = await sendFeedback(kind, message, context);
    setSending(false);
    if (result.ok) {
      setSent(true);
      return;
    }
    setError(result.message);
  };

  if (sent) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.sentSafeArea}>
          <Mascot mood="happy" size={56} />
          <ThemedText type="title" weight={600} style={styles.sentTitle}>
            C’est envoyé, merci.
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.body}>
            Ton retour est lu à la main. Il n’y aura pas de réponse automatique — on préfère te
            le dire plutôt que de te laisser l’attendre.
          </ThemedText>
          <Button title="Revenir" onPress={() => router.back()} style={styles.sentButton} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <ThemedText type="title" weight={600} style={styles.title}>
              Un retour à nous faire ?
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              Un mode de transport qui manque, un chiffre qui te semble faux, une idée. Tout est
              utile — c’est le seul moyen qu’on a de le savoir.
            </ThemedText>
          </View>

          <View style={styles.kinds}>
            {FEEDBACK_KINDS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={kind === option.value}
                onPress={() => setKind(option.value)}
                radius={16}
                selectedStyle="outline"
              />
            ))}
          </View>

          <View style={styles.fieldBlock}>
            <ThemedText type="small" themeColor="textTertiary">
              Ton message
            </ThemedText>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={FEEDBACK_MAX_LENGTH}
              placeholder="Dis-nous en quelques mots…"
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.input,
                { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
              ]}
            />
            <ThemedText type="code" themeColor="textTertiary">
              {trimmed.length} / {FEEDBACK_MAX_LENGTH}
            </ThemedText>
          </View>

          {error && (
            <ThemedView type="backgroundElement" style={styles.errorCard}>
              <ThemedText type="small">{error}</ThemedText>
            </ThemedView>
          )}

          <Button title={sending ? 'Envoi…' : 'Envoyer'} onPress={onSend} disabled={!canSend} />

          {/* Ce qui part avec le message, dit avant l'envoi et non dans une politique que
              personne n'ouvre. Le contexte est le nom de l'écran d'origine, rien de plus. */}
          <ThemedText type="code" themeColor="textTertiary" style={styles.privacy}>
            On enregistre ton message, la catégorie choisie{context ? ' et l’écran d’où tu viens' : ''}, avec
            l’identifiant de ton compte pour pouvoir te répondre si tu nous laisses un moyen de le
            faire. Rien d’autre.
          </ThemedText>

          <Pressable onPress={() => router.back()}>
            <ThemedText type="small" themeColor="textTertiary" style={styles.cancel}>
              Annuler
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.three },
  intro: { gap: Spacing.two },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  body: { fontSize: 15, lineHeight: 22 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  fieldBlock: { gap: 8 },
  input: {
    minHeight: 140,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  errorCard: { borderRadius: 14, padding: 14 },
  privacy: { lineHeight: 18 },
  cancel: { textAlign: 'center' },
  sentSafeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  sentTitle: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26, textAlign: 'center' },
  sentButton: { marginTop: Spacing.two, alignSelf: 'stretch' },
});
