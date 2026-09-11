import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { TextLink } from '@/components/text-link';

// Lien contextuel sous les listes de modes du questionnaire (issue #29).
//
// C'est le point d'entrée qui a justifié le canal de retour : le référentiel de modes est
// forcément incomplet — camping-car, van, vélo cargo existent dans la Base Empreinte et pas
// chez nous — et quelqu'un dont le mode principal manque n'avait que deux options, choisir
// une réponse fausse ou abandonner. Les deux sont silencieuses, donc invisibles pour nous.
//
// Volontairement discret : c'est une porte de sortie pour les rares cas non couverts, pas une
// invitation à quitter le questionnaire. D'où le `type="code"` et la couleur tertiaire.
//
// Il passe par `TextLink` et pas par un `Pressable` nu, pour les deux raisons qui ont fait
// exister ce composant : la cible tactile montait à 44 px (elle valait ici 18 px de hauteur de
// ligne, sans marge), et le libellé annoncé **est** le texte affiché — les deux formulations
// avaient déjà divergé (audit A2-20). `textAlign` reste sur le texte, le centrage sur le
// conteneur : sur web, l'un sans l'autre ne centre pas.
export function MissingModeLink({ context }: { context: string }) {
  return (
    <TextLink
      label="Ton mode n’est pas dans la liste ? Dis-le-nous."
      role="link"
      type="code"
      themeColor="textTertiary"
      onPress={() => router.push({ pathname: '/feedback', params: { kind: 'mode_manquant', context } })}
      containerStyle={styles.cible}
      style={styles.link}
    />
  );
}

const styles = StyleSheet.create({
  cible: { alignItems: 'center' },
  link: { textAlign: 'center', lineHeight: 18 },
});
