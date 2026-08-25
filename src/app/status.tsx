import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Écran de diagnostic — ancien contenu de `/` (smoke test app -> Supabase -> RLS lecture
// publique du référentiel), déplacé ici une fois la vraie logique de routing de la racine
// posée (cf. src/app/index.tsx). Volontairement non lié depuis nulle part dans l'app —
// accessible en tapant l'URL directement, pour du diagnostic manuel après déploiement.
type ConnectionState = { status: 'loading' } | { status: 'ok'; count: number } | { status: 'error'; message: string };

export default function StatusScreen() {
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
          TraceVerte — diagnostic
        </ThemedText>

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

        <Pressable onPress={() => router.push('/')}>
          <ThemedText type="linkPrimary">Revenir à l&apos;app →</ThemedText>
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
