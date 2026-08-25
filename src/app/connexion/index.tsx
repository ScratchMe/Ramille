import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/auth/google-button';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { markConnexionProposalSeen } from '@/lib/connexion-prefs';
import { formatTonnes } from '@/lib/format';
import { linkGoogleIdentity } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Recap = { total_co2_kg_year: number; dominant_poste_label: string } | null;

// "Connexion — proposition après bilan" — plein écran, jamais une pop-up (cf. annotation
// design) : affichée une seule fois, juste après que l'utilisateur ait vu sa restitution
// (cf. bilan/resultat.tsx, qui route ici tant que la proposition n'a pas été vue/déclinée).
export default function ConnexionProposition() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recap, setRecap] = useState<Recap>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('assessment_results')
      .select('total_co2_kg_year, dominant_poste_label')
      .eq('assessment_id', id)
      .single()
      .then(({ data }) => setRecap(data));
  }, [id]);

  const dismiss = async () => {
    await markConnexionProposalSeen();
    router.replace('/plan');
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await linkGoogleIdentity();
    setGoogleLoading(false);
    if (error) {
      Alert.alert('Connexion impossible', error.message);
      return;
    }
    await markConnexionProposalSeen();
    router.replace('/plan');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Marque visible avant le bouton Google : un utilisateur qui vient d'arriver sur
              son bilan doit reconnaître que c'est bien TraceVerte qui lui propose de se
              connecter, pas un tiers — le bouton Google lui-même reste non personnalisé
              (cf. spec-uiux §5, "respecter le branding standard Google"). */}
          <Logo size={44} style={styles.logo} />
          <View style={styles.textBlock}>
            <ThemedText type="title" weight={600} style={styles.title}>
              Garde ce résultat et suis ta progression
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              Ton bilan est calculé. Avec un compte, il te suit d&apos;un appareil à l&apos;autre et
              tu retrouves ton historique de points mensuels.
            </ThemedText>
          </View>

          {recap && (
            <ThemedView type="backgroundSelected" style={styles.recapCard}>
              <ThemedText weight={600} themeColor="accentText" type="small">
                Ce qui est déjà enregistré
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.recapBody}>
                {formatTonnes(recap.total_co2_kg_year)} par an · {recap.dominant_poste_label} identifié comme
                poste principal
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.options}>
            <GoogleButton onPress={onGoogle} loading={googleLoading} />
            <Pressable onPress={() => router.push({ pathname: '/connexion/email', params: { id } })}>
              <ThemedText type="linkPrimary" style={styles.emailLink}>
                Utiliser un email à la place
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.skip}>
            <Pressable onPress={dismiss}>
              <ThemedText type="small" themeColor="textTertiary">
                Continuer sans compte
              </ThemedText>
            </Pressable>
            <ThemedText type="code" themeColor="textTertiary" style={styles.skipHint}>
              Ton résultat reste accessible sur cet appareil.
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.four },
  logo: { marginBottom: Spacing.one },
  textBlock: { gap: Spacing.two },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  body: { fontSize: 16, lineHeight: 24 },
  recapCard: { borderRadius: 18, padding: 18, gap: 8 },
  recapBody: { fontSize: 15, lineHeight: 22 },
  options: { gap: Spacing.three },
  emailLink: { textAlign: 'center' },
  skip: { marginTop: Spacing.two, alignItems: 'center', gap: 10 },
  skipHint: { textAlign: 'center' },
});
