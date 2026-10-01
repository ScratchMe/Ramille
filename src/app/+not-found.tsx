import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
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
        {/* **L'écran défile quand il déborde** (01/10/2026, audit T-2) : à petite taille ou à grande
            police, le titre en `display` et la réplique poussaient « Revenir à l'accueil » hors de
            l'écran — la seule sortie d'une page qu'on atteint sans l'avoir voulu. `flexGrow` et non
            `flex` : à la taille courante, tout est en place comme avant (`EXPO.md` §1.6). */}
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.content}>
            <ThemedText type="display">Cette page n’existe pas</ThemedText>
            <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
              Le lien est peut-être incomplet, ou la page a changé d’adresse.
            </ThemedText>
            <RamilleDit ligne={RAMILLE.introuvable} mood="calm" size={44} tilt={-7} />
          </View>
          <View style={styles.footer}>
            <Button title="Revenir à l’accueil" onPress={() => router.replace('/')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  page: { flexGrow: 1, padding: Spacing.four, justifyContent: 'space-between' },
  content: { flexGrow: 1, justifyContent: 'center', gap: Spacing.three },
  body: { fontSize: 16, lineHeight: 24 },
  footer: { gap: Spacing.five },
});
