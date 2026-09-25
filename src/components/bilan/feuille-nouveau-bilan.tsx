import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { FeuilleDuBas } from '@/components/feuille-du-bas';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { phraseDeLEngagementRecalcule, type EngagementEnCours } from '@/types/rebilan';

/**
 * Ce qu'une soumission fait à l'engagement en cours, dit avant (C6.2, `v1-19` D4).
 *
 * **Elle annonçait une perte certaine, et c'était faux** (corrigé le 19/09/2026, après lecture de la
 * définition vivante de `generate_plan_cycle_for_user`). Le serveur **repose** l'engagement sur la
 * ligne du nouveau plan qui porte le même gabarit, et ne l'archive que si ce gabarit n'est plus
 * proposé. La feuille disait donc « tu vas repartir sans action engagée » à quelqu'un qui, dans le
 * cas courant, garde la sienne. Elle dit maintenant la règle, au conditionnel, qui est la seule
 * forme vraie dans les deux cas — cf. `src/types/rebilan.ts` pour le code SQL relu.
 *
 * **Elle informe, elle ne refuse pas.** Le produit annonce déjà la perte *après coup* — l'encart
 * orphelin du plan lit `plan_action_commitments_archive` filtrée sur `released_reason = 'rebilan'`
 * (C2.2). Ce qui manquait était de le dire **avant**, au moment où la personne peut encore décider.
 * Le chemin reste donc entier : le bouton plein soumet, la sortie referme, et rien n'est interdit.
 *
 * **Sans Ramille, et c'est délibéré.** Elle est la voix de l'encouragement, pas celle d'un écran
 * qui explique une mécanique — lui faire dire ce qu'un recalcul fait à un engagement la mettrait
 * dans un rôle qu'elle n'a nulle part ailleurs. Le texte est en voix produit, comme le pied de la
 * carte d'un point répondu.
 *
 * **Elle ne se déclenche pas sur un nombre de jours** : `engagementDeLaPeriodeCourante`
 * (`src/types/rebilan.ts`) borne la question à la période du cycle courant. Hors de cette période
 * le cycle suivant est neuf, l'engagement est *reconduit* par un autre chemin, et il n'y a rien à
 * dire.
 */
export function FeuilleNouveauBilan({
  engagement,
  onSoumettre,
  onFerme,
}: {
  engagement: EngagementEnCours;
  /** Poursuivre la soumission, en sachant ce qu'elle coûte. */
  onSoumettre: () => void;
  /** Refermer sans rien soumettre : on reste sur la dernière étape du questionnaire. */
  onFerme: () => void;
}) {
  return (
    // Le geste de retour referme sans soumettre — le contrat du cadre (`FeuilleDuBas`), qui porte
    // aussi le titre : il nomme le dialogue, qui s'annonçait sans nom sur web.
    <FeuilleDuBas titre="Ton plan va être recalculé" onFerme={onFerme}>
      <ThemedText type="body" themeColor="textSecondary">
        {phraseDeLEngagementRecalcule(engagement)}
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
    </FeuilleDuBas>
  );
}

const styles = StyleSheet.create({
  sortie: { textAlign: 'center' },
});
