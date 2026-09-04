import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
                <ThemedText weight={600} style={styles.heading}>
                  {section.heading}
                </ThemedText>
                {section.blocks.map((block, index) => (
                  <LegalBlockView key={index} block={block} />
                ))}
              </View>
            ))}

            <Pressable onPress={() => router.back()} style={styles.backLink}>
              <ThemedText type="small" weight={600} themeColor="accentText">
                Retour
              </ThemedText>
            </Pressable>
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
