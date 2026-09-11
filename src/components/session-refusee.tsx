import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Mascot } from '@/components/mascot';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/**
 * Le jeton stocké a été refusé — C2.11, point 3 (handoff §4.3).
 *
 * **Ce n'est pas une absence de bilan, et l'app le disait comme si c'en était une.** Sans cet
 * écran, `ensureSession()` ouvrait une session anonyme vide et le plan répondait « Ton bilan n'est
 * pas encore fait » à quelqu'un dont le bilan, le plan et les points sont intacts côté serveur,
 * avec pour seul bouton « Faire mon bilan » — soit l'invitation à recommencer de zéro ce qu'il a
 * déjà fait. La dérivation qui distingue ce cas d'une vraie première ouverture, et d'une panne de
 * transport qui ne doit rien reprocher à personne, vit dans `src/types/session.ts`.
 *
 * **Sans reproche, et c'est la consigne du chantier.** Un jeton expire tout seul ; personne n'a rien
 * fait de mal. Pas de « ta session a expiré » (qui se lit comme une négligence), pas d'icône
 * d'alerte, pas de couleur de danger — le produit n'en a pas. La mascotte peut occuper cet
 * écran : il ne porte aucun chiffre, donc elle ne commente rien (règle de `src/constants/mascotte.ts`).
 *
 * **Rien n'est écrit ici par Ramille** : les deux phrases sont de la voix produit, elles énoncent un
 * fait et une marche à suivre. Ramille accompagne, elle ne donne pas de consigne.
 *
 * **C'est une surcouche, pas un remplacement du `Stack`** — et ce n'est pas un choix de mise en
 * page. Rendu à la place du navigateur (comme `ConfigurationManquante`, qui lui n'a nulle part où
 * aller), il n'aurait aucune route vers laquelle partir : ses deux boutons seraient morts. Le
 * navigateur reste donc monté dessous, et les deux gestes sont confiés à l'appelant, qui lève le
 * drapeau avant de naviguer.
 */
export function SessionRefusee({
  onRetrouver,
  onCommencer,
}: {
  onRetrouver: () => void;
  onCommencer: () => void;
}) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.contenu}>
        <Mascot mood="calm" size={72} tilt={-6} />
        <ThemedText type="screenTitle">Reconnecte-toi pour retrouver ton bilan</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.corps}>
          Ton bilan, ton plan et tes points sont rattachés à ton compte, pas à cet appareil.
        </ThemedText>
        <Button title="J’ai déjà un compte" onPress={onRetrouver} style={styles.bouton} />
        {/* Le second chemin reste ouvert : quelqu'un peut préférer repartir d'un bilan neuf sur cet
            appareil plutôt que de retrouver un compte dont il n'a plus l'adresse. Un écran qui ne
            laisserait que la reconnexion serait une impasse. */}
        <TextLink label="Commencer un bilan sur cet appareil" onPress={onCommencer} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Positionnement absolu et non `flex: 1` : l'écran couvre le navigateur resté monté dessous.
  container: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  contenu: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  corps: { textAlign: 'center' },
  bouton: { alignSelf: 'stretch' },
});
