import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/auth/text-field';
import { TextLink } from '@/components/text-link';
import { MessageInline } from '@/components/message-inline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { linkEmail } from '@/lib/auth';
import { markConnexionProposalSeen } from '@/lib/connexion-prefs';
import { adresseDejaRattachee, adresseSemblePlausible, estLimiteDEnvoi } from '@/types/connexion';

// "Connexion — email" — lie l'adresse à la session anonyme en cours (cf. src/lib/auth.ts) :
// toujours le cas "créer mon compte" ici, jamais une connexion à un compte existant, qui
// passe par /connexion/retrouver. Une adresse, rien d'autre : le mot de passe a disparu avec
// v1-10 §2.D — il n'a jamais servi, et la confirmation par email faisait déjà tout le travail.
export default function ConnexionEmail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // États inline plutôt qu'un Alert.alert avec callback sur le bouton : sur web,
  // react-native-web retombe sur window.alert(), qui n'invoque pas onPress.
  const [phase, setPhase] = useState<'saisie' | 'envoye' | 'deja-un-compte'>('saisie');

  const valid = adresseSemblePlausible(email);

  const onSubmit = async () => {
    if (!valid || submitting) return;
    setMessage(null);
    setSubmitting(true);
    const { error } = await linkEmail(email);
    setSubmitting(false);

    // L'adresse a déjà un compte : la personne est au mauvais écran, pas en erreur. On le
    // dit et on l'envoie vers « retrouver » avec l'adresse déjà saisie.
    if (adresseDejaRattachee(error)) {
      setPhase('deja-un-compte');
      return;
    }
    if (estLimiteDEnvoi(error)) {
      setMessage('Trop de demandes coup sur coup. Réessaie dans quelques minutes.');
      return;
    }
    if (error) {
      setMessage('L’envoi n’a pas abouti. Vérifie l’adresse et réessaie.');
      return;
    }

    // Le rattachement est effectif ici — `linkEmail` a réussi. La confirmation d'adresse
    // qui suit conditionne les rappels par email, pas le compte lui-même.
    track('connexion_success', { method: 'email' });
    await markConnexionProposalSeen();
    setPhase('envoye');
  };

  if (phase === 'envoye') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ThemedText type="screenTitle">
              Vérifie tes emails
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Un lien de confirmation vient d&apos;être envoyé à {email.trim()}. Ton bilan reste
              accessible en attendant.
            </ThemedText>
            <Button title="Continuer" onPress={() => router.replace('/plan')} style={styles.continueButton} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (phase === 'deja-un-compte') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ThemedText type="screenTitle">
              Cette adresse a déjà un compte
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Le bilan que tu viens de faire ne peut pas le rejoindre, mais tu peux retrouver ton
              compte : on t&apos;envoie un lien qui te reconnecte ici.
            </ThemedText>
            <Button
              title="Retrouver mon compte"
              onPress={() => router.replace({ pathname: '/connexion/retrouver', params: { email: email.trim(), source: 'email' } })}
              style={styles.continueButton}
            />
            <TextLink
              label="Garder ce bilan sans compte"
              onPress={() => router.replace('/plan')}
              type="small"
              themeColor="textTertiary"
              style={styles.backLink}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.textBlock}>
            <ThemedText type="screenTitle">
              Continuer avec un email
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Une adresse, rien de plus — pas de mot de passe. Ton bilan est rattaché
              automatiquement.
            </ThemedText>
          </View>

          <View style={styles.fields}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="camille@exemple.fr"
            />
            <MessageInline message={message} />
            <TextLink
              label="J’ai déjà un compte"
              onPress={() => router.push({ pathname: '/connexion/retrouver', params: { id, source: 'email' } })}
              role="link"
              type="linkPrimary"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title={submitting ? 'Envoi…' : 'Recevoir le lien'}
            onPress={onSubmit}
            disabled={!valid || submitting}
          />
          <TextLink
            label="Revenir aux autres options"
            onPress={() => router.back()}
            role="link"
            type="small"
            themeColor="textTertiary"
            style={styles.backLink}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'space-between' },
  content: { gap: Spacing.four, marginTop: Spacing.two },
  textBlock: { gap: 10 },
  fields: { gap: Spacing.four },
  footer: { gap: Spacing.four },
  backLink: { textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  continueButton: { marginTop: Spacing.two },
});
