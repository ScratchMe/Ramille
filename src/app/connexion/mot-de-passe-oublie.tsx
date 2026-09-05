import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/auth/text-field';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { requestPasswordReset } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Connexion — mot de passe oublié" — l'annotation design prévoit "deux écrans : celui-ci
// puis un accusé d'envoi" ; implémenté ici comme deux états du même écran plutôt qu'une
// route séparée (pas de contenu propre au second état qui justifie sa propre URL).
export default function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    if (!EMAIL_RE.test(email) || submitting) return;
    setSubmitting(true);
    await requestPasswordReset(email);
    setSubmitting(false);
    // Le message reste le même en cas d'erreur : ne pas révéler si l'email existe en
    // base (énumération de comptes), cf. comportement standard de Supabase Auth.
    setSent(true);
  };

  if (sent) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ThemedText type="title" weight={600} style={styles.title}>
              Vérifie tes emails
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              Si un compte existe pour {email}, un lien de réinitialisation vient d&apos;être envoyé.
            </ThemedText>
            <TextLink
              label="Revenir à la connexion"
              onPress={() => router.push('/connexion')}
              role="link"
              type="linkPrimary"
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
            <ThemedText type="title" weight={600} style={styles.title}>
              Réinitialiser ton mot de passe
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              On t&apos;envoie un lien de réinitialisation. Tes données restent rattachées à ton
              compte.
            </ThemedText>
          </View>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="camille@exemple.fr"
          />
          <Button title="Envoyer le lien" onPress={onSubmit} disabled={!EMAIL_RE.test(email) || submitting} />
          <TextLink
            label="Revenir à la connexion"
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
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center' },
  content: { gap: Spacing.four },
  textBlock: { gap: 10 },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  body: { fontSize: 16, lineHeight: 24 },
  backLink: { textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', gap: Spacing.three, alignItems: 'center', padding: Spacing.four },
});
