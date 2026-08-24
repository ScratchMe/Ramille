import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/auth/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { linkEmailPassword } from '@/lib/auth';
import { markConnexionProposalSeen } from '@/lib/connexion-prefs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// "Connexion — email et mot de passe" — lie l'email/mot de passe à la session anonyme en
// cours (cf. src/lib/auth.ts) : toujours le cas "créer mon compte" ici, jamais une
// connexion à un compte existant distinct (ce second cas — écran "session expirée" —
// suit avec la boucle mensuelle, qui est le premier endroit où une session peut
// réellement expirer sur cet appareil).
export default function ConnexionEmail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // État inline plutôt qu'un Alert.alert avec callback sur le bouton : sur web,
  // react-native-web retombe sur window.alert(), qui n'invoque pas onPress — même
  // parti pris que l'écran "mot de passe oublié".
  const [sent, setSent] = useState(false);

  const valid = EMAIL_RE.test(email) && password.length >= MIN_PASSWORD_LENGTH;

  const onSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const { error } = await linkEmailPassword(email, password);
    setSubmitting(false);

    if (error) {
      Alert.alert('Impossible de créer le compte', error.message);
      return;
    }

    await markConnexionProposalSeen();
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
              Un lien de confirmation vient d&apos;être envoyé à {email}. Ton bilan reste accessible en
              attendant.
            </ThemedText>
            <Button title="Continuer" onPress={() => router.replace('/plan')} style={styles.continueButton} />
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
              Continuer avec un email
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              Deux champs, rien de plus. Ton bilan est rattaché automatiquement.
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
            <TextField
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightActionLabel={showPassword ? 'Masquer' : 'Afficher'}
              onRightAction={() => setShowPassword((v) => !v)}
              helperText="Le mot de passe doit contenir au moins 8 caractères."
            />
            <Pressable onPress={() => router.push({ pathname: '/connexion/mot-de-passe-oublie', params: { id } })}>
              <ThemedText type="linkPrimary">Mot de passe oublié</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Button title="Créer mon compte" onPress={onSubmit} disabled={!valid || submitting} />
          <Pressable onPress={() => router.back()}>
            <ThemedText type="small" themeColor="textTertiary" style={styles.backLink}>
              Revenir aux autres options
            </ThemedText>
          </Pressable>
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
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  body: { fontSize: 15, lineHeight: 22 },
  fields: { gap: Spacing.four },
  footer: { gap: Spacing.four },
  backLink: { textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  continueButton: { marginTop: Spacing.two },
});
