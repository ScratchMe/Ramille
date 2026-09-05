import { Link, router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EDITOR_CV_URL, EDITOR_NAME } from '@/constants/editeur';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// Coquille commune aux pages légales (/confidentialite, /conditions). Ces pages ne sont pas
// des écrans du parcours : elles existent parce que l'écran de consentement Google OAuth et
// la fiche Google Play en exigent l'URL publique, et elles doivent donc rester lisibles
// hors app, sur le domaine, sans session.
//
// Le contenu est passé en données plutôt qu'en JSX : une page légale se relit et se modifie
// paragraphe par paragraphe, et il ne faut pas avoir à traverser du balisage pour le faire.

export type LegalBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'definitions'; items: { term: string; text: string }[] };

export type LegalSection = {
  heading: string;
  blocks: LegalBlock[];
};

export function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText type="small" themeColor="textTertiary">
                Dernière mise à jour : {updatedAt}
              </ThemedText>
              <ThemedText type="title" weight={600} style={styles.title}>
                {title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.intro}>
                {intro}
              </ThemedText>
            </View>

            {sections.map((section) => (
              <View key={section.heading} style={styles.section}>
                {/* Ces titres de section ne peuvent pas passer par `type="subtitle"`, qui
                    porterait le rôle d'en-tête mais aussi ses 32 px : ici la hiérarchie
                    visuelle tient en 18 px. Le rôle est donc écrit à la main — cas prévu par
                    la surcharge de `ThemedText`. Sans lui, ces deux pages, les plus longues
                    du produit, ne se parcourent qu'en lisant tout. */}
                <ThemedText weight={600} style={styles.heading} accessibilityRole="header">
                  {section.heading}
                </ThemedText>
                {section.blocks.map((block, index) => (
                  <LegalBlockView key={index} block={block} />
                ))}
              </View>
            ))}

            <TextLink
              label="Retour"
              onPress={() => router.back()}
              role="link"
              type="small"
              weight={600}
              themeColor="accentText"
              containerStyle={styles.backLink}
            />

            {/* Ces deux pages sont les seules surfaces publiques du produit : leurs URL sont
                données à Google Play et à l'écran de consentement Google, et elles se lisent
                hors app, sans session. C'est donc le seul endroit où un pied de page a du sens
                — les écrans du parcours n'en ont pas, et la racine n'est qu'une redirection.

                `Link` et pas `Pressable` : react-native-web rend un `onPress` en `<div>`, qui
                n'est pas un lien pour un crawler. Le nom en toute lettre sert d'ancre. */}
            <View style={styles.footer}>
              <ThemedText type="small" themeColor="textTertiary">
                Un projet personnel d’
                <Link href={EDITOR_CV_URL} target="_blank" rel="noopener" style={styles.cvLink}>
                  {EDITOR_NAME}
                </Link>
                .
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.kind === 'paragraph') {
    return (
      <ThemedText themeColor="textSecondary" style={styles.body}>
        {block.text}
      </ThemedText>
    );
  }

  if (block.kind === 'bullets') {
    return (
      <View style={styles.list}>
        {block.items.map((item) => (
          <View key={item} style={styles.listRow}>
            <ThemedText themeColor="textTertiary" style={styles.bullet}>
              —
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={[styles.body, styles.listText]}>
              {item}
            </ThemedText>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {block.items.map((item) => (
        <View key={item.term} style={styles.definition}>
          <ThemedText type="small" weight={600}>
            {item.term}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.body}>
            {item.text}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { marginTop: Spacing.five },
  cvLink: { textDecorationLine: 'underline' },
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.four, paddingBottom: Spacing.six },
  // Une page de texte long doit rester lisible sur un écran large : au-delà d'environ
  // 70 caractères par ligne, l'œil perd la ligne suivante.
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four },
  header: { gap: Spacing.two },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  intro: { fontSize: 16, lineHeight: 24 },
  section: { gap: Spacing.two },
  heading: { fontSize: 18, lineHeight: 26 },
  body: { fontSize: 15, lineHeight: 23 },
  list: { gap: Spacing.two },
  listRow: { flexDirection: 'row', gap: Spacing.two },
  bullet: { fontSize: 15, lineHeight: 23 },
  listText: { flex: 1 },
  definition: { gap: 2 },
  backLink: { paddingVertical: Spacing.two },
});
