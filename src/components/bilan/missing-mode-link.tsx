import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Lien contextuel sous les listes de modes du questionnaire (issue #29).
//
// C'est le point d'entrée qui a justifié le canal de retour : le référentiel de modes est
// forcément incomplet — camping-car, van, vélo cargo existent dans la Base Empreinte et pas
// chez nous — et quelqu'un dont le mode principal manque n'avait que deux options, choisir
// une réponse fausse ou abandonner. Les deux sont silencieuses, donc invisibles pour nous.
//
// Volontairement discret : c'est une porte de sortie pour les rares cas non couverts, pas une
// invitation à quitter le questionnaire. D'où le `type="code"` et la couleur tertiaire.
export function MissingModeLink({ context }: { context: string }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/feedback', params: { kind: 'mode_manquant', context } })}
    >
      <ThemedText type="code" themeColor="textTertiary" style={styles.link}>
        Ton mode n’est pas dans la liste ? Dis-le-nous.
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { textAlign: 'center', lineHeight: 18 },
});
