import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { ensureSession, supabase } from '@/lib/supabase';

// Racine de l'app — jamais un écran visible en pratique (redirection immédiate dès que la
// session est prête) : remplace l'ancien smoke-test Supabase qui vivait ici (déplacé vers
// /status) et servait jusqu'ici de landing par défaut, y compris après un retour d'auth
// Google sur web (redirectTo non explicite -> Supabase revient sur le Site URL configuré,
// c'est-à-dire cette racine). Décide entre onboarding et plan selon qu'un bilan complété
// existe déjà pour la session courante (anonyme ou rattachée) : un utilisateur qui vient de
// se connecter ou qui revient sur l'app doit retomber sur son plan, pas repartir de zéro.
export default function Index() {
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await ensureSession();
      const { data } = await supabase
        .from('assessments')
        .select('id')
        .eq('status', 'completed')
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      router.replace(data ? '/plan' : '/onboarding');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator color={theme.textTertiary} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
