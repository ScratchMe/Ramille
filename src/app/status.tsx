import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { APP_NAME } from '@/constants/produit';

// Écran de diagnostic — ancien contenu de `/` (smoke test app -> Supabase -> RLS lecture
// publique du référentiel), déplacé ici une fois la vraie logique de routing de la racine
// posée (cf. src/app/index.tsx). Volontairement non lié depuis nulle part dans l'app —
// accessible en tapant l'URL directement, pour du diagnostic manuel après déploiement — c'est le
// bloc 00 de chaque recette (`RECETTE.md` §2.2).
//
// **L'erreur s'affiche par son code, jamais par son message** (06/10/2026, seconde passe de
// sécurité, `v1-27` §12.39) : la page est servie à quiconque tape l'adresse, et le message de
// PostgREST décrit le schéma (« permission denied for table … »). Le code (`42501`, `PGRST301`…)
// suffit au diagnostic, se cherche dans la documentation, et ne raconte rien à un inconnu. Une
// erreur sans code est une panne du transport, et le dit.
type ConnectionState = { status: 'loading' } | { status: 'ok'; count: number } | { status: 'error'; code: string };

export default function StatusScreen() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'loading' });

  useEffect(() => {
    supabase
      .from('transport_modes')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) {
          setConnection({ status: 'error', code: error.code || 'pas de réponse du serveur' });
          return;
        }
        setConnection({ status: 'ok', count: count ?? 0 });
      });
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {APP_NAME} — diagnostic
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
              Erreur : {connection.code}
            </ThemedText>
          )}
        </ThemedView>

        <TextLink label="Revenir à l’app →" apparence="action" onPress={() => router.push('/')} role="link" />
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
