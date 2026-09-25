import { Children, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ControlHeight, Spacing } from '@/constants/theme';
import { brancherLeClavierDuGroupe } from '@/lib/groupe-au-clavier';

/**
 * Le conteneur d'une série de choix — puces, rangées, items de mode, lignes de canal : un
 * `radiogroup` quand on n'en choisit qu'un, un `group` quand ils se cumulent — **toujours nommé par
 * la question à laquelle il répond** (24/09/2026, `v1-29`, audit d'accessibilité 4.1.2).
 *
 * Onze séries du questionnaire et du plan s'annonçaient encore en `button` (A2-8, `v1-13` §11.4) :
 * rien ne disait « sélectionné », ni la place dans le groupe, ni surtout **à quelle question** la
 * puce répond. La question est un frère dans l'arbre, pas un libellé rattaché : en lecture
 * séquentielle elle précède bien la série, mais en navigation de contrôle en contrôle — ou en
 * explorant l'écran au doigt — une puce « 1 » arrive seule, et il y a trois séries de chiffres sur
 * l'étape du contexte. Nommer le groupe le dit une fois ; le répéter sur chaque puce le dirait
 * autant de fois qu'il y a de puces (A2-9, même raisonnement que `PrecisionChiffres`).
 *
 * **La question se passe en chaîne, et l'appelant l'écrit une fois** pour ses deux usages — le texte
 * affiché et le nom du groupe. Deux copies d'un même libellé finissent par ne plus se
 * correspondre ; c'est la dérive que `TextLink` existe pour empêcher ailleurs.
 *
 * **C'est le seul endroit du dépôt qui écrive un de ces deux rôles** (25/09/2026). Trois listes de
 * modes du questionnaire n'avaient pas de groupe du tout — « Voiture (seul) » ne disait pas à quelle
 * question il répond —, et trois fichiers posaient le rôle eux-mêmes (`PrecisionChiffres`, les trois
 * séries des longs trajets, la catégorie du retour) : ce qu'on ajoutera un jour à un groupe, comme
 * les flèches pour passer d'une option à l'autre que `v1-29` §6.4 nomme, ne les aurait pas
 * atteints. Le parcours réel vérifie, étape par étape, que toute case d'option a un `radiogroup`
 * nommé et toute case à cocher un `group` nommé — et qu'aucun `radiogroup` n'en coche deux, seule
 * règle qui voie une précision privée de son propre groupe (le paragraphe suivant dit pourquoi).
 *
 * **Une précision qui s'ouvre sous l'option choisie est son propre groupe, posé DANS celui de la
 * question qui l'ouvre** — « Quelle motorisation ? » sous « Voiture (seul) », dans le groupe du
 * mode. C'est la forme des révélations conditionnelles de GOV.UK (un `fieldset` dans un `fieldset`),
 * et c'est la seule qui garde ce que `precision-mode.tsx` a gagné : la précision juste sous l'option
 * qu'elle décrit, dans l'ordre de lecture comme à l'œil. Chaque case d'option y répond au groupe
 * **le plus proche**, donc à sa propre question — « Hybride » à « Quelle motorisation ? », jamais au
 * mode. La sortir du groupe du mode l'aurait détachée de l'option qu'elle précise, ou coupé la liste
 * des modes en deux groupes homonymes. Relevé dans l'arbre d'accessibilité de Chromium le 25/09/2026 ;
 * ce que TalkBack en annonce reste à écouter sur appareil (`v1-29` §6.5). **Le revers de cette
 * forme** : une précision qui perdrait son groupe tomberait dans celui du mode sans que rien ne le
 * dise — il est nommé, il est le plus proche —, et le mode et la motorisation y seraient cochés
 * ensemble. C'est à cela, et à cela seulement, que le parcours réel la reconnaît.
 *
 * `role` et `aria-label` plutôt que `accessibilityRole` : le rôle d'un groupe de cases, `group`,
 * n'existe que dans le vocabulaire ARIA que React Native accepte depuis la 0.71.
 *
 * **Au clavier, sur web, un `radiogroup` se comporte comme des cases d'option natives** (25/09/2026,
 * `v1-29` §6.4) : un seul arrêt de tabulation — l'option cochée, ou la première —, et les flèches
 * qui passent d'une option à l'autre en la cochant. C'est ce que ce composant a gagné à être le seul
 * à poser le rôle : le branchement (`brancherLeClavierDuGroupe`, `src/lib/groupe-au-clavier.ts`)
 * atteint d'un coup toutes les séries du produit, précisions imbriquées comprises. Un `group` de
 * cases à cocher n'y passe pas : chacune reste un arrêt, et les flèches n'y font rien.
 *
 * **`colonnes` range la série en grille, pour les jours** (décision n° 7 du 24/09/2026 : une cible
 * de 48 × 48). Sur une ligne, les sept jours ne laissaient que 38 à 42 px à chacun dans le
 * questionnaire, et 27 à 31 dans la carte d'une action, sur un téléphone de 360 à 390 dp ; ils n'y
 * tiennent à 48 qu'au-delà de 432 dp. La grille garde des colonnes égales d'une ligne à l'autre —
 * « 1 2 3 4 / 5 6 7 », « L M M J / V S D » — là où un simple retour à la ligne laissait un jour seul
 * sur la seconde, ou l'étirait sur toute la largeur. L'écart vient d'une marge intérieure de chaque
 * cellule et non d'un `gap`, qui s'ajoute aux largeurs en pourcentage au lieu de s'en retrancher ;
 * les cellules ne portent aucun rôle, donc le lecteur d'écran ne les voit pas.
 *
 * **`colonnes` est un maximum, pas une promesse** : une cellule ne descend jamais sous une cible
 * plus son écart. Dans la carte d'une action, à 320 dp — un petit téléphone, ou un téléphone courant
 * dont on a agrandi la taille d'affichage d'Android, c'est-à-dire souvent l'écran de qui voit mal —,
 * quatre colonnes ne laissaient que 47,5 px par cellule : les puces, tenues à 48 par leur
 * `minWidth`, débordaient et se touchaient (mesuré le 24/09/2026). Avec ce minimum, la rangée passe
 * d'elle-même à trois colonnes égales, sans mesure ni second rendu.
 */
export function GroupeDeChoix({
  question,
  cumulable = false,
  colonnes,
  style,
  children,
}: {
  /**
   * Le nom du groupe : la question **telle qu'elle est affichée** au-dessus de la série. Deux
   * exceptions, chacune dite chez son appelant, et le nom y reste une chaîne écrite une fois :
   * un intitulé qui ne se comprend qu'avec le titre de l'écran reçoit sa forme complète, qui le
   * contient (« En train » → « Trajets longue distance en train », `long-trips.tsx`) ; une série
   * sans question affichée reçoit le nom de ce qu'elle choisit (« Catégorie », `feedback.tsx`).
   */
  question: string;
  /** Vrai quand les puces se cumulent (des `checkbox`) : le groupe n'est alors pas un `radiogroup`. */
  cumulable?: boolean;
  /**
   * Nombre de colonnes d'une grille — au plus : moins quand une cible de 48 n'y tiendrait plus.
   * Sans lui, les puces suivent la mise en page de `style`.
   */
  colonnes?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const role = cumulable ? 'group' : 'radiogroup';
  const groupe = useRef<View>(null);
  // Les deux rendus ci-dessous posent la référence : c'est un autre nœud quand `colonnes` bascule,
  // d'où sa présence dans les dépendances.
  const enGrille = colonnes !== undefined;
  useEffect(() => {
    if (cumulable) return;
    return brancherLeClavierDuGroupe(groupe.current);
  }, [cumulable, enGrille]);

  if (colonnes === undefined) {
    return (
      <View ref={groupe} role={role} aria-label={question} style={style}>
        {children}
      </View>
    );
  }

  const largeur = `${100 / colonnes}%` as const;
  return (
    <View ref={groupe} role={role} aria-label={question} style={[styles.grille, style]}>
      {Children.map(children, (puce) => (
        <View style={[styles.cellule, { width: largeur }]}>{puce}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.two,
    marginHorizontal: -Spacing.two / 2,
  },
  cellule: { paddingHorizontal: Spacing.two / 2, minWidth: ControlHeight.target + Spacing.two },
});
