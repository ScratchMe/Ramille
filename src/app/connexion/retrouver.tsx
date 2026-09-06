import { makeRedirectUri } from 'expo-auth-session';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/auth/text-field';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_NAME } from '@/constants/produit';
import { Spacing } from '@/constants/theme';
import { APP_URL } from '@/lib/app-url';
import { sendAccountAccessLink } from '@/lib/auth';
import { lireEtatDuCompte } from '@/lib/compte';
import { adresseSemblePlausible, estLimiteDEnvoi } from '@/types/connexion';

// "Retrouver mon compte" — l'écran qui manquait (docs/design/v1-10-retrouver-son-compte) :
// jusqu'à v1-10, le produit n'avait aucun chemin vers un compte *existant*. Sur un nouvel
// appareil, la personne reçoit une session anonyme vide qui n'est pas son compte, et tout
// `src/lib/auth.ts` rattache une identité à cette session-là. D'où un lien à usage unique
// envoyé à l'adresse du compte (`sendAccountAccessLink`, `shouldCreateUser: false`) — le même
// geste qu'un compte Google, qui porte lui aussi une adresse.
//
// Cet écran a remplacé « Mot de passe oublié », qui faisait déjà ce travail par effet de bord
// (un lien de réinitialisation reconnecte) sous un mauvais nom. Le mot de passe a disparu
// avec lui (v1-10 §2.D).
//
// Quatre états, jamais un Alert (window.alert() n'invoque pas onPress sur web) :
//   - `collision` : cet appareil porte déjà un bilan anonyme. Supabase ne fusionne pas deux
//     utilisateurs ; on le dit et on laisse choisir (canvas, « ce qui a été écarté ») ;
//   - `saisie` : l'adresse ;
//   - `envoye` : l'attente — même message que l'adresse ait un compte ou non ;
//   - `chargement` : le temps de savoir s'il y a collision.
type Phase = 'chargement' | 'collision' | 'saisie' | 'envoye';

export default function RetrouverMonCompte() {
  // `email` prérempli quand on arrive de /connexion/email après un `email_exists`.
  const params = useLocalSearchParams<{ email?: string }>();
  const [phase, setPhase] = useState<Phase>('chargement');
  const [email, setEmail] = useState(params.email ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    lireEtatDuCompte()
      .then((etat) => {
        if (!annule) setPhase(etat.kind === 'anonyme-avec-donnees' ? 'collision' : 'saisie');
      })
      .catch(() => {
        if (!annule) setPhase('saisie');
      });
    return () => {
      annule = true;
    };
  }, []);

  const envoyerLeLien = async () => {
    setMessage(null);
    if (!adresseSemblePlausible(email)) {
      setMessage('Cette adresse semble incomplète.');
      return;
    }
    setBusy(true);
    // Le lien ramène à la racine, qui route vers le plan si le compte retrouvé porte un bilan
    // complété, vers l'onboarding sinon (cf. src/app/index.tsx). Sur natif, le lien s'ouvre
    // depuis la messagerie et revient par le scheme `ramille://`, traité dans _layout.tsx —
    // ce scheme doit figurer dans les Redirect URLs du tableau de bord Supabase.
    const redirectTo = Platform.OS === 'web' ? `${APP_URL}/` : makeRedirectUri();
    const { error } = await sendAccountAccessLink(email, redirectTo);
    setBusy(false);

    if (estLimiteDEnvoi(error)) {
      setMessage('Trop de demandes coup sur coup. Réessaie dans quelques minutes.');
      return;
    }
    // Tout le reste mène au même écran, y compris une adresse sans compte (422
    // `otp_disabled`) : répondre autrement dirait à n'importe qui si telle adresse utilise
    // Ramille.
    setPhase('envoye');
  };

  if (phase === 'chargement') {
    return <ThemedView style={styles.container} />;
  }

  if (phase === 'collision') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.textBlock}>
              <ThemedText type="title" weight={600} style={styles.title}>
                Cet appareil porte déjà un bilan
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.body}>
                Tu as répondu au questionnaire ici, sans compte. En retrouvant le tien, c&apos;est
                son historique qui s&apos;ouvre — ce bilan-ci ne le rejoindra pas.
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.body}>
                On peut le refaire ensemble après, ça va vite.
              </ThemedText>
            </View>
          </View>
          <View style={styles.footer}>
            <Button title="Retrouver mon compte" onPress={() => setPhase('saisie')} />
            <Button title="Garder ce bilan sur cet appareil" variant="secondary" onPress={() => router.back()} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Garder ce bilan te laisse sans compte : il restera sur cet appareil, et là seulement.
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (phase === 'envoye') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.textBlock}>
              <ThemedText type="title" weight={600} style={styles.title}>
                Regarde tes emails
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.body}>
                Si un compte {APP_NAME} existe avec cette adresse, un lien vient d&apos;y être envoyé.
                Ouvre-le depuis cet appareil : c&apos;est lui qui te reconnecte.
              </ThemedText>
            </View>
            <ThemedView type="backgroundSelected" style={styles.card}>
              <ThemedText type="small" weight={600}>
                Le lien ne crée jamais de compte
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                S&apos;il n&apos;y en a pas à cette adresse, rien ne part et rien n&apos;est créé. On ne dit
                pas non plus si l&apos;adresse en a un — ce serait dire qui utilise {APP_NAME}.
              </ThemedText>
            </ThemedView>
            <TextLink
              label="Utiliser une autre adresse"
              onPress={() => setPhase('saisie')}
              type="linkPrimary"
              style={styles.hint}
            />
          </View>
          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textTertiary" style={styles.hint}>
              Le lien expire au bout d&apos;un moment. S&apos;il ne marche plus, redemandes-en un.
            </ThemedText>
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
              Retrouver mon compte
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              Indique l&apos;adresse de ton compte. On t&apos;envoie un lien qui te reconnecte ici, sur
              cet appareil, avec tes bilans et ton plan.
            </ThemedText>
          </View>
          <View style={styles.fields}>
            <TextField
              label="Adresse email du compte"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="toi@exemple.fr"
            />
            {message && (
              <ThemedText type="small" themeColor="textSecondary">
                {message}
              </ThemedText>
            )}
            <Button
              title={busy ? 'Envoi…' : 'Recevoir le lien'}
              onPress={envoyerLeLien}
              disabled={busy || !adresseSemblePlausible(email)}
            />
          </View>
          {/* Pas décorative : le mécanisme marche pour un compte Google, mais quelqu'un qui
              n'a jamais tapé de mot de passe ne pensera pas à chercher une « adresse email ».
              Sans cette carte, la moitié des gens concernés se croient exclus. */}
          <ThemedView type="backgroundSelected" style={styles.card}>
            <ThemedText type="small" weight={600}>
              Tu t&apos;es connecté avec Google ?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              C&apos;est la même adresse — celle de ton compte Google. Pas besoin de mot de passe :
              le lien suffit.
            </ThemedText>
          </ThemedView>
        </View>
        <View style={styles.footer}>
          <ThemedText type="small" themeColor="textTertiary" style={styles.hint}>
            Tu n&apos;as jamais créé de compte ? Reviens en arrière : tout est accessible sans.
          </ThemedText>
          <TextLink
            label="Retour"
            onPress={() => router.back()}
            role="link"
            type="small"
            themeColor="textTertiary"
            style={styles.hint}
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
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  body: { fontSize: 15, lineHeight: 22 },
  fields: { gap: Spacing.three },
  card: { borderRadius: 18, padding: 20, gap: 8 },
  footer: { gap: Spacing.three },
  hint: { textAlign: 'center' },
});
