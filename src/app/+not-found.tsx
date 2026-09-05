import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { RamilleDit } from '@/components/ramille-dit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TitreDePage } from '@/components/titre-de-page';
import { RAMILLE } from '@/constants/mascotte';
import { NOT_FOUND_PAGE_TITLE } from '@/constants/page-titles';
import { Spacing } from '@/constants/theme';

// Page 404. Sans ce fichier, Expo Router en sert une par défaut : en anglais, non stylée, et
// hors du layout racine — donc sans titre d'onglet ni session anonyme. Une URL fautive
// n'est pas rare (lien tronqué dans un email de rappel, favori d'une route renommée), et
// c'est la seule page du produit qu'on atteint sans l'avoir voulu : elle doit rendre la main
// plutôt que constater.
//
// `router.replace` et pas `push` : l'URL fautive ne doit pas rester dans l'historique, sans
// quoi le retour arrière y ramène.
export default function NotFound() {
  return (
    <ThemedView style={styles.container}>
      <TitreDePage titre={NOT_FOUND_PAGE_TITLE} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="title" weight={600} style={styles.title}>
            Cette page n’existe pas
          </ThemedText>
          <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
            Le lien est peut-être incomplet, ou la page a changé d’adresse.
          </ThemedText>
          <RamilleDit ligne={RAMILLE.introuvable} mood="calm" size={44} tilt={-7} />
        </View>
        <View style={styles.footer}>
          <Button title="Revenir à l’accueil" onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  body: { fontSize: 16, lineHeight: 24 },
  footer: { gap: Spacing.five },
});
