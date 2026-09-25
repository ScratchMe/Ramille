import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { decrireProbleme, type ProblemeConfiguration } from '@/types/configuration';

// Écran de configuration manquante — issue #65.
//
// Pas d'accents graves dans les textes : React Native n'interprète aucun markdown, ils
// s'afficheraient tels quels et donneraient l'impression d'un rendu raté.
//
// **Il ne s'adresse pas à un utilisateur, mais à la personne qui développe.** Ni la voix de
// Ramille, ni la mascotte, ni un ton rassurant : ce qu'il faut ici, c'est la variable en cause
// et l'endroit où la définir. Même registre que l'état d'échec de démarrage de `index.tsx`.
//
// Il n'apparaîtra jamais chez un utilisateur — sauf si un build part mal configuré, et c'est
// précisément le cas qu'il existe pour rendre visible : sans lui, l'app s'ouvre et se referme
// instantanément, et rien sur le téléphone ne distingue ça d'un plantage natif.
export function ConfigurationManquante({ problemes }: { problemes: ProblemeConfiguration[] }) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.contenu}>
          <ThemedText type="screenTitle">Configuration manquante</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            L’app ne peut pas démarrer sans sa connexion à Supabase.
          </ThemedText>

          {/* La chasse fixe reste (24/09/2026, `v1-29`, où elle est réservée aux sources et aux codes
              techniques) : chaque ligne nomme une variable d'environnement et, s'il y a lieu, sa
              valeur fautive — des clés à recopier au caractère près. */}
          <View style={[styles.bloc, { borderColor: theme.border }]}>
            {problemes.map((probleme, index) => (
              <ThemedText
                key={`${probleme.type}-${probleme.variable}-${index}`}
                type="code"
                themeColor="text"
                style={styles.ligne}
              >
                {decrireProbleme(probleme)}
              </ThemedText>
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText type="cardTitle" weight={600}>
              En développement
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Copie .env.example vers .env, renseigne les deux valeurs, puis relance le
              serveur — les variables sont lues au démarrage du bundler, pas à chaud.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="cardTitle" weight={600}>
              Sur un build EAS
            </ThemedText>
            {/* Le piège qui a coûté le premier build : le `.env` local n'est pas envoyé à
                EAS, et les variables sont figées dans le bundle au moment du build — les
                changer après coup n'a aucun effet sur un build déjà produit. */}
            <ThemedText type="body" themeColor="textSecondary">
              Les variables se déclarent sur expo.dev, dans l’environnement du profil de build
              (store → production, developmentClient → development, sinon preview). Le .env
              local n’est pas envoyé à EAS, et les valeurs sont figées dans le bundle au moment
              du build : il faut en relancer un.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  contenu: { padding: Spacing.four, gap: Spacing.four },
  bloc: { borderWidth: Stroke.hairline, borderRadius: Radius.field, padding: Spacing.three, gap: Spacing.two },
  ligne: { fontSize: 12, lineHeight: 18 },
  section: { gap: Spacing.two },
});
