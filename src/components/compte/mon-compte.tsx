import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { deleteMyAccount, exportMyData } from '@/lib/compte';
import { APP_NAME } from '@/constants/produit';

// Section « Mes données » de /suivi — droit d'accès, de portabilité et à l'effacement
// (RGPD art. 15, 20, 17), et **bloqueur Google Play** pour la suppression (T12).
//
// Deux partis pris de forme :
//
//   - **la confirmation est un état de composant, jamais un `Alert`.** Sur web, `Alert.alert`
//     retombe sur `window.alert()`, qui n'invoque pas fiablement `onPress` : la suppression ne
//     partirait jamais. Même piège que sur les écrans de connexion (cf. CLAUDE.md).
//   - **aucune tentative de retenir la personne.** Pas de « es-tu sûr de perdre tes 3 bilans ? »,
//     pas de bouton « Rester » mis en avant. On dit ce qui sera supprimé parce que c'est une
//     information utile, et on s'arrête là. Un produit qui rend le départ pénible ne mérite pas
//     la confiance qu'il demande par ailleurs.
export function MonCompte() {
  const [confirmation, setConfirmation] = useState(false);
  const [busy, setBusy] = useState<'export' | 'suppression' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exporter = async () => {
    setBusy('export');
    setMessage(null);
    const result = await exportMyData();
    setBusy(null);
    setMessage(result.ok ? 'Export généré.' : result.message);
  };

  const supprimer = async () => {
    setBusy('suppression');
    setMessage(null);
    const result = await deleteMyAccount();
    if (!result.ok) {
      setBusy(null);
      setMessage(result.message);
      return;
    }
    // La racine recrée une session anonyme et renvoie vers l'onboarding : on repart de zéro,
    // sans écran intermédiaire qui annoncerait une suppression déjà faite.
    router.replace('/');
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText weight={600} type="small">
        Mes données
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        Tu peux récupérer l’intégralité de ce que {APP_NAME} sait de toi, dans un fichier JSON, ou
        tout supprimer définitivement.
      </ThemedText>

      <View style={styles.actions}>
        <Button
          title={busy === 'export' ? 'Génération…' : 'Télécharger mes données'}
          variant="secondary"
          onPress={exporter}
          disabled={busy !== null}
        />

        {!confirmation ? (
          <TextLink
            label="Supprimer mon compte"
            hint="Demande une confirmation avant de supprimer quoi que ce soit"
            onPress={() => setConfirmation(true)}
            disabled={busy !== null}
            type="small"
            themeColor="textTertiary"
            style={styles.link}
          />
        ) : (
          <View style={styles.confirmation}>
            <ThemedText type="small" themeColor="textSecondary">
              Tes bilans, ton plan, tes points de suivi et tes retours seront supprimés
              définitivement. Cette action est irréversible.
            </ThemedText>
            <View style={styles.confirmationActions}>
              <TextLink
                label="Annuler"
                onPress={() => setConfirmation(false)}
                disabled={busy !== null}
                type="small"
                themeColor="textTertiary"
                style={styles.link}
              />
              <Button
                title={busy === 'suppression' ? 'Suppression…' : 'Supprimer définitivement'}
                onPress={supprimer}
                disabled={busy !== null}
                flex
              />
            </View>
          </View>
        )}
      </View>

      {message && (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two },
  actions: { gap: Spacing.three, marginTop: Spacing.two },
  confirmation: { gap: Spacing.three },
  confirmationActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  link: { textDecorationLine: 'underline' },
});
