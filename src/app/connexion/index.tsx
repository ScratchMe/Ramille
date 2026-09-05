import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/auth/google-button';
import { Mascot } from '@/components/mascot';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { markConnexionProposalSeen } from '@/lib/connexion-prefs';
import { useTrackView } from '@/hooks/use-track-view';
import { formatTonnes } from '@/lib/format';
import { track } from '@/lib/analytics';
import { linkGoogleIdentity } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Recap = { total_co2_kg_year: number; dominant_poste_label: string } | null;

// "Connexion — proposition après bilan" — plein écran, jamais une pop-up (cf. annotation
// design) : affichée une seule fois, juste après que l'utilisateur ait vu sa restitution
// (cf. bilan/resultat.tsx, qui route ici tant que la proposition n'a pas été vue/déclinée).
export default function ConnexionProposition() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();

  // `resultat_transition` par défaut : c'est le chemin historique, et un paramètre absent
  // (lien direct, retour arrière) vaut mieux compté là que perdu.
  useTrackView('connexion_view', {
    source: source === 'resultat_cta' || source === 'plan' || source === 'suivi'
      ? source
      : 'resultat_transition',
  });
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
    track('connexion_dismiss');
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
    track('connexion_success', { method: 'google' });
    await markConnexionProposalSeen();
    router.replace('/plan');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Marque visible avant le bouton Google : un utilisateur qui vient d'arriver sur
              son bilan doit reconnaître que c'est bien Ramille qui lui propose de se
              connecter, pas un tiers — le bouton Google lui-même reste non personnalisé
              (cf. spec-uiux §5, "respecter le branding standard Google"). Mascotte plutôt
              que le logo abstrait seul (cf. mascot.tsx) : même rôle de marque de confiance,
              plus chaleureux. */}
          <Mascot mood="calm" size={44} style={styles.logo} />
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
            <TextLink
              label="Utiliser un email à la place"
              onPress={() => router.push({ pathname: '/connexion/email', params: { id } })}
              role="link"
              type="linkPrimary"
              style={styles.emailLink}
            />
          </View>

          <View style={styles.skip}>
            <TextLink
              label="Continuer sans compte"
              hint="Ton résultat reste accessible sur cet appareil"
              onPress={dismiss}
              type="small"
              themeColor="textTertiary"
            />
            <ThemedText type="code" themeColor="textTertiary" style={styles.skipHint}>
              Ton résultat reste accessible sur cet appareil.
            </ThemedText>
          </View>

          {/* Les deux pages légales sont accessibles là où quelqu'un s'apprête à créer un
              compte — c'est le moment où elles l'engagent. Leurs URL publiques sont aussi
              exigées par l'écran de consentement Google OAuth et par la fiche Play Store. */}
          <View style={styles.legal}>
            <TextLink
              label="Confidentialité"
              onPress={() => router.push('/confidentialite')}
              role="link"
              type="code"
              themeColor="textTertiary"
            />
            <ThemedText type="code" themeColor="textTertiary">
              ·
            </ThemedText>
            <TextLink
              label="Conditions d’utilisation"
              onPress={() => router.push('/conditions')}
              role="link"
              type="code"
              themeColor="textTertiary"
            />
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
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.two },
});
