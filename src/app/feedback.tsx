import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/bilan/chip';
import { Mascot } from '@/components/mascot';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TitreDArrivee } from '@/components/titre-d-arrivee';
import { Radius, Spacing, Stroke } from '@/constants/theme';
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

/**
 * L'intitulé du champ, **écrit une fois** : il est à la fois le texte visible au-dessus de la
 * zone de saisie et son nom accessible (A6-13). Les deux recopiés côte à côte finissent
 * toujours par ne plus correspondre — c'est la dérive que `TextField` et `TextLink`
 * documentent déjà.
 */
const LIBELLE_MESSAGE = 'Ton message';

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
          {/* **Le focus vient ici** (24/09/2026, audit d'accessibilité 4.1.3) : cet écran remplace
              le formulaire sous le doigt, et « Envoyer » disparaît avec lui. Sans ce déplacement,
              un lecteur d'écran ne disait rien de l'envoi réussi. */}
          <TitreDArrivee>
            <ThemedText type="screenTitle" style={styles.sentTitle}>
              C’est envoyé, merci.
            </ThemedText>
          </TitreDArrivee>
          <ThemedText type="body" themeColor="textSecondary">
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
            <ThemedText type="screenTitle">
              Un retour à nous faire ?
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Un mode de transport qui manque, un chiffre qui te semble faux, une idée. Tout est
              utile — c’est le seul moyen qu’on a de le savoir.
            </ThemedText>
          </View>

          {/* Une catégorie et une seule : `radiogroup` + `radio`, comme `ChoixDeRappel`. En
              `button`, le rôle n'annonçait pas « non sélectionné » — sur cinq puces, c'est
              l'information qui manque le plus. */}
          <View style={styles.kinds} accessibilityRole="radiogroup" accessibilityLabel="Catégorie">
            {FEEDBACK_KINDS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                role="radio"
                selected={kind === option.value}
                onPress={() => setKind(option.value)}
                radius={16}
                selectedStyle="outline"
              />
            ))}
          </View>

          <View style={styles.fieldBlock}>
            <ThemedText type="small" themeColor="textTertiary">
              {LIBELLE_MESSAGE}
            </ThemedText>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={FEEDBACK_MAX_LENGTH}
              placeholder="Dis-nous en quelques mots…"
              placeholderTextColor={theme.textTertiary}
              // L'intitulé est un frère dans l'arbre, pas un `label for` : sans ces deux lignes,
              // le seul champ de texte libre du produit s'annonce sans nom, et le compteur de
              // caractères affiché dessous n'est rattaché à rien.
              accessibilityLabel={LIBELLE_MESSAGE}
              accessibilityHint={`${FEEDBACK_MAX_LENGTH} caractères au maximum.`}
              // Le contour au repos est `fieldBorder` (24/09/2026, `v1-29`) : `border` n'y tenait que
              // 1,33:1, on ne voyait pas le seul champ de texte libre du produit. L'accent une fois
              // qu'il y a un texte, comme `TextField`.
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: message.length > 0 ? theme.accent : theme.fieldBorder,
                },
              ]}
            />
            <ThemedText type="code" themeColor="textTertiary">
              {trimmed.length} / {FEEDBACK_MAX_LENGTH}
            </ThemedText>
          </View>

          {/* L'échec passe par `MessageInline` comme partout ailleurs : une carte maison dit la
              même chose à l'œil, mais sans région vivante elle n'est annoncée à personne. */}
          <MessageInline message={error} />

          <Button title={sending ? 'Envoi…' : 'Envoyer'} onPress={onSend} disabled={!canSend} />

          {/* Ce qui part avec le message, dit avant l'envoi et non dans une politique que
              personne n'ouvre. Le contexte est le nom de l'écran d'origine, rien de plus. */}
          <ThemedText type="code" themeColor="textTertiary" style={styles.privacy}>
            On enregistre ton message, la catégorie choisie{context ? ' et l’écran d’où tu viens' : ''}, avec
            l’identifiant de ton compte pour rapprocher ton retour de ce que tu vois. Rien d’autre,
            et aucune réponse : il n’existe pas de canal pour t’en adresser une.
          </ThemedText>

          <TextLink
            label="Annuler"
            onPress={() => router.back()}
            type="small"
            themeColor="textTertiary"
            style={styles.cancel}
          />
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
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  fieldBlock: { gap: Spacing.two },
  input: {
    minHeight: 140,
    borderRadius: Radius.field,
    borderWidth: Stroke.selected,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  privacy: { lineHeight: 18 },
  cancel: { textAlign: 'center' },
  sentSafeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  sentTitle: { textAlign: 'center' },
  sentButton: { marginTop: Spacing.two, alignSelf: 'stretch' },
});
