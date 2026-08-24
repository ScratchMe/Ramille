import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Écran placeholder — le contenu réel de l'onboarding (copy, framing) est hors scope
// de cet increment, cf. docs/architecture/v1-01-onboarding-bilan.md §4. Ce screen sert
// de smoke test bout-en-bout : app -> Supabase -> RLS (lecture publique du référentiel).
type ConnectionState = { status: 'loading' } | { status: 'ok'; count: number } | { status: 'error'; message: string };

export default function HomeScreen() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'loading' });

  useEffect(() => {
    supabase
      .from('transport_modes')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) {
          setConnection({ status: 'error', message: error.message });
          return;
        }
        setConnection({ status: 'ok', count: count ?? 0 });
      });
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          TraceVerte
        </ThemedText>
        <ThemedText type="default">Bilan carbone transport — V1 en construction.</ThemedText>

        <ThemedView type="backgroundElement" style={styles.status}>
          <ThemedText type="smallBold">Connexion Supabase</ThemedText>
          {connection.status === 'loading' && <ThemedText type="small">Vérification…</ThemedText>}
          {connection.status === 'ok' && (
            <ThemedText type="small">
              OK — {connection.count} modes de transport en base
            </ThemedText>
          )}
          {connection.status === 'error' && (
            <ThemedText type="small" themeColor="text">
              Erreur : {connection.message}
            </ThemedText>
          )}
        </ThemedView>

        {/* Navigation temporaire pour la revue — pas la logique de routing finale
            (qui dépendra de l'état auth/onboarding une fois construit). */}
        <Pressable onPress={() => router.push('/onboarding')}>
          <ThemedText type="linkPrimary">Voir l&apos;onboarding →</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  status: {
    gap: Spacing.one,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
});
