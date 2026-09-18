import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { phraseDeLEngagementLibere, type EngagementLibere } from '@/types/rebilan';

/**
 * L'avertissement avant une soumission qui libère l'engagement en cours (C6.2, `v1-19` D4).
 *
 * **Il avertit, il ne refuse pas.** Le produit annonce déjà cet effet *après coup* — l'encart
 * orphelin du plan lit `plan_action_commitments_archive` filtrée sur `released_reason = 'rebilan'`
 * (C2.2). Ce qui manquait était de le dire **avant**, au moment où la personne peut encore décider.
 * Le chemin reste donc entier : le bouton plein soumet, la sortie referme, et rien n'est interdit.
 *
 * **Sans Ramille, et c'est délibéré.** Elle est la voix de l'encouragement, pas celle d'un
 * avertissement qui nomme une conséquence — lui faire dire « tu vas perdre » la mettrait dans un
 * rôle qu'elle n'a nulle part ailleurs dans le produit. Le texte est en voix produit, comme le
 * pied de la carte d'un point répondu.
 *
 * **Il ne se déclenche pas sur un nombre de jours** : `engagementLibereParUnNouveauBilan`
 * (`src/types/rebilan.ts`) borne la question à la période du cycle courant, qui est exactement la
 * condition sous laquelle la perte se produit.
 */
export function FeuilleNouveauBilan({
  engagement,
  onSoumettre,
  onFerme,
}: {
  engagement: EngagementLibere;
  /** Poursuivre la soumission, en sachant ce qu'elle coûte. */
  onSoumettre: () => void;
  /** Refermer sans rien soumettre : on reste sur la dernière étape du questionnaire. */
  onFerme: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      // Le geste de retour referme sans soumettre. C'est le même contrat que la feuille des
      // rappels : une feuille qu'on ne peut pas fermer n'est plus une proposition.
      onRequestClose={onFerme}
    >
      <View style={styles.fond}>
        <ThemedView style={[styles.feuille, { borderColor: theme.border }]}>
          <View style={[styles.poignee, { backgroundColor: theme.border }]} />

          <ThemedText type="cardTitle">Tu vas repartir sans action engagée</ThemedText>

          <ThemedText type="body" themeColor="textSecondary">
            {phraseDeLEngagementLibere(engagement)} Un nouveau bilan refait ton plan pour cette
            période ; tu pourras en choisir une autre juste après.
          </ThemedText>

          {/* Le cadrage du 18/09/2026, et il n'est pas décoratif : la raison principale de ne pas
              refaire un bilan à mi-saison est qu'une habitude n'a pas encore eu le temps de
              prendre, donc la mesurer ne dirait rien. On le dit sans l'imposer. */}
          <ThemedText type="small" themeColor="textTertiary">
            Rien ne presse : une habitude met du temps à prendre. Si tes trajets n’ont pas changé,
            ton bilan actuel est toujours juste.
          </ThemedText>

          <Button title="Soumettre mon bilan" onPress={onSoumettre} />

          <TextLink
            label="Pas maintenant"
            onPress={onFerme}
            type="small"
            weight={600}
            themeColor="accentText"
            style={styles.sortie}
          />
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19, 22, 18, 0.42)' },
  feuille: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  poignee: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.two },
  sortie: { textAlign: 'center' },
});
