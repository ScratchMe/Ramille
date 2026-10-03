import { useRef } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { FeuilleDuBas, type PoigneeDeFeuille } from '@/components/feuille-du-bas';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { phraseDeLEngagementRecalcule, type EngagementEnCours } from '@/types/rebilan';

/**
 * Ce qu'un nouveau bilan fait à l'engagement en cours, dit **avant de commencer** (C6.2, `v1-19` D4 ;
 * déplacée le 01/10/2026, `v1-33` §6).
 *
 * **Elle annonçait une perte certaine, et c'était faux** (corrigé le 19/09/2026, après lecture de la
 * définition vivante de `generate_plan_cycle_for_user`). Le serveur **repose** l'engagement sur la
 * ligne du nouveau plan qui porte le même gabarit, et ne l'archive que si ce gabarit n'est plus
 * proposé. La feuille disait donc « tu vas repartir sans action engagée » à quelqu'un qui, dans le
 * cas courant, garde la sienne. Elle dit maintenant la règle, au conditionnel, qui est la seule
 * forme vraie dans les deux cas — cf. `src/types/rebilan.ts` pour le code SQL relu.
 *
 * **Elle s'ouvre à l'entrée du questionnaire, plus à la soumission** (tension tranchée le 01/10/2026,
 * `v1-33` §6, loi du pic et de la fin). Arrivée au terme de neuf étapes, elle disait « Si tes trajets
 * n'ont pas changé, ton bilan actuel est toujours juste » à quelqu'un qui venait d'y passer plusieurs
 * minutes : la fin colorait l'effort entier. Dite avant la première étape, la même phrase aide à
 * décider s'il vaut la peine de commencer. Son bouton plein dit donc **« Commencer »**, et commence ;
 * il disait « Soumettre mon bilan » au toucher de « Voir mon bilan » — deux verbes pour un seul geste.
 *
 * **Elle informe, elle ne refuse pas.** Le produit annonce déjà la perte *après coup* — l'encart
 * orphelin du plan lit `plan_action_commitments_archive` filtrée sur les raisons annonçables, dont
 * `rebilan` (C2.2, `RAISONS_ANNONCABLES`). Ce qui manquait était de le dire **avant**, au moment où la
 * personne peut encore décider. Le chemin reste donc entier : le bouton plein commence, la sortie
 * ressort vers l'écran d'où l'on vient, et rien n'est interdit.
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
 *
 * **Le focus** : sur web, il est sur « Commencer », le premier contrôle de la feuille, dès qu'elle
 * s'ouvre — relevé par le parcours réel le 01/10/2026, qui le garde. **C'est le `Modal` de
 * react-native-web qui l'y pose** (mesuré le même jour, CI de la PR #314) : actif, son piège essaie
 * `.focus()` sur chaque descendant dans l'ordre du DOM et garde le premier qui le prend, puis rend
 * l'ancien focus à la fermeture. Rien ici ne le pose, donc « Commencer » doit rester le premier
 * focalisable de la fenêtre : un lien placé avant lui le prend, et le voile l'a pris tant qu'il était
 * un `Pressable` (`FeuilleDuBas`). Ouverte à l'entrée d'un écran, la feuille n'a pas de geste à suivre ;
 * le focus part avec elle, pas à la fin de sa montée. Sur Android, TalkBack entre dans la boîte de
 * dialogue ; ce qu'il annonce à l'ouverture et à la fermeture se vérifie sur l'appareil.
 */
export function FeuilleNouveauBilan({
  engagement,
  onCommencer,
  onQuitter,
}: {
  engagement: EngagementEnCours;
  /** Commencer le questionnaire : la feuille redescend, l'étape d'entrée est dessous. */
  onCommencer: () => void;
  /** Ne pas commencer : ressortir du questionnaire vers l'écran d'où l'on vient. */
  onQuitter: () => void;
}) {
  const feuille = useRef<PoigneeDeFeuille>(null);

  return (
    // Le geste de retour referme sans commencer — le contrat du cadre (`FeuilleDuBas`), qui porte aussi
    // le titre : il nomme le dialogue, qui s'annonçait sans nom sur web. Refermer sans commencer, ici,
    // c'est ressortir : la feuille dit ce qu'un nouveau bilan ferait, et le geste de retour répond
    // « pas maintenant ». Elle redescend d'abord, puis l'écran s'en va.
    <FeuilleDuBas ref={feuille} titre="Ton plan va être recalculé" onFerme={onQuitter}>
      <ThemedText type="body" themeColor="textSecondary">
        {phraseDeLEngagementRecalcule(engagement)}
      </ThemedText>

      {/* Le cadrage du 18/09/2026, et il n'est pas décoratif : la raison principale de ne pas
          refaire un bilan à mi-saison est qu'une habitude n'a pas encore eu le temps de
          prendre, donc la mesurer ne dirait rien. On le dit sans l'imposer — et, depuis le
          01/10/2026, avant que la personne ait répondu à quoi que ce soit. */}
      <ThemedText type="small" themeColor="textTertiary">
        Rien ne presse : une habitude met du temps à prendre. Si tes trajets n’ont pas changé,
        ton bilan actuel est toujours juste.
      </ThemedText>

      {/* « Commencer » redescend, et le questionnaire est dessous : il ne navigue pas, donc il attend
          la sortie (`fermer(apres)`, `v1-30` §5.4). */}
      <Button
        title="Commencer"
        onPress={() => (feuille.current ? feuille.current.fermer(onCommencer) : onCommencer())}
      />

      {/* « Pas maintenant » **navigue** : il appelle son rappel tout de suite, sans attendre la sortie
          (`FeuilleDuBas`) — la redescente laisserait voir une première étape qu'on vient de refuser,
          et l'écran qui porte la feuille s'en va avec elle. */}
      <TextLink
        label="Pas maintenant"
        apparence="action"
        onPress={onQuitter}
        style={styles.sortie}
      />
    </FeuilleDuBas>
  );
}

const styles = StyleSheet.create({
  sortie: { textAlign: 'center' },
});
