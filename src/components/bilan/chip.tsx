import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { activableALaBarreDEspace } from '@/lib/barre-d-espace';
import { fondDuChoix } from '@/types/fond-du-choix';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Largeur naturelle (pilule, ex. tranches/nombres) vs équirépartie dans sa rangée
   *  (ex. Oui/Non, taille de covoiturage). */
  flex?: boolean;
  /** 'solid' = fond accent plein + texte blanc (nombres, tranches) ; 'outline' = fond
   *  teinté + bordure accent (Oui/Non, mode sélectionné dans une liste). */
  selectedStyle?: 'solid' | 'outline';
  radius?: number;
  /**
   * La puce est posée dans un encart déjà teinté (`backgroundElement`) : son fond non choisi
   * reprend celui de la page (`background` — blanc en clair, noir en sombre), sinon il se confond
   * avec l'encart et la puce se lit comme du texte. C'est la réponse que `ModeListItem` apporte au
   * même problème, sous le même nom.
   */
  nestedBackground?: boolean;
  /** Quand le libellé visible est une abréviation ambiguë — deux jours de la semaine portent
   *  l'initiale « M » — le lecteur d'écran doit entendre le mot entier. */
  accessibilityLabel?: string;
  /** Rôle annoncé (A2-8) : `radio` pour une puce d'un groupe à choix unique — la majorité du
   *  questionnaire —, `checkbox` pour une puce qui se cumule avec ses voisines (les jours de
   *  l'engagement, où `radio` serait faux). Ce sont les seuls rôles à annoncer « non
   *  sélectionné » et la place dans le groupe, et la puce se range toujours dans un
   *  `GroupeDeChoix` nommé par sa question.
   *
   *  **La prop est obligatoire, et `button` n'en est plus une valeur** (24/09/2026, `v1-29`).
   *  Le défaut `button` était provisoire : il laissait le défaut d'A2-8 en place dans onze
   *  séries — les quatre du contexte, les deux des vols, les jours du trajet, le « Oui / Non »
   *  du second mode, les tranches des sorties, les jours et l'échéance de l'engagement —, et
   *  ce commentaire prévoyait qu'on la rende obligatoire « en même temps qu'eux ». C'est fait :
   *  une puce qui s'ajouterait sans rôle ne compile pas. Une puce n'est jamais une action — une
   *  action est un `Button` ou un `TextLink`. */
  role: 'radio' | 'checkbox';
};

// Chip générique — couvre les pickers numériques/tranches (B1.3, B2.2, B3.*) et les
// choix binaires équirépartis (B1.5/B1.6) de la maquette, qui ne partagent que la forme
// pilule/carré-arrondi, pas le même traitement de sélection.
export function Chip({
  label,
  selected,
  onPress,
  flex,
  selectedStyle = 'solid',
  radius = 22,
  nestedBackground,
  accessibilityLabel,
  role,
}: ChipProps) {
  const theme = useTheme();

  // Le fond, au repos et sous le doigt, sort de `fondDuChoix` — la même dérivation que les rangées,
  // les items de mode et la ligne de canal (25/09/2026). Deux cas y passent qui sont nés ici :
  // posée dans un encart teinté, la puce non choisie prend le fond de la page (`nestedBackground`),
  // sans quoi elle n'a plus de bord visible — la grille des jours de l'engagement l'a montré le
  // 24/09/2026, sept lettres flottant dans des cellules de 48 ; et sous le doigt, chaque surface a sa
  // teinte, pour que le texte garde son contraste (décision n° 6).
  const borderColor = selected && selectedStyle === 'outline' ? theme.accent : 'transparent';
  const textColor = selected && selectedStyle === 'solid' ? theme.onAccent : theme.text;

  return (
    <Pressable
      onPress={onPress}
      // Espace coche la puce sur web, ce que react-native-web ne fait que pour un bouton
      // (`src/lib/barre-d-espace.ts`) ; Entrée reste la sienne.
      {...activableALaBarreDEspace(onPress)}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      // **L'état passe par `aria-checked`, jamais par l'objet `accessibilityState`** (24/09/2026,
      // audit d'accessibilité 4.1.2). Ce commentaire répartissait `checked` et `selected` entre
      // TalkBack et VoiceOver, sans voir que le web ne recevait **ni l'un ni l'autre** :
      // react-native-web 0.21 ignore cet objet et ne traduit que les props `aria-*`. Dans
      // l'export, « Une idée », visiblement choisie, sortait en `role="radio"` sans `aria-checked`
      // — donc « non coché » pour tout lecteur d'écran web, réponse préremplie d'un re-bilan
      // comprise. `aria-checked` est lu par les deux moteurs : react-native-web l'écrit dans le
      // DOM, React Native le range dans l'état natif que TalkBack annonce.
      //
      // `selected` n'est plus posé : `aria-selected` est invalide sur un `radio`, et la raison qui
      // le justifiait — VoiceOver, faute de trait `radio` sur iOS — ne vaut pas pour une V1 publiée
      // sur Google Play seulement. `scripts/verifier-rendu-export.mjs` garde la règle : tout
      // `radio`, `checkbox` ou `switch` rendu doit porter `aria-checked`.
      aria-checked={selected}
      style={({ pressed }) => [
        styles.base,
        flex ? styles.baseFlex : styles.basePilule,
        {
          borderRadius: radius,
          backgroundColor:
            theme[
              fondDuChoix({
                choisi: selected,
                appuye: pressed,
                plein: selectedStyle === 'solid',
                imbrique: nestedBackground,
              })
            ],
          borderColor,
          flex: flex ? 1 : undefined,
        },
      ]}
    >
      <ThemedText weight={selected ? 600 : 400} style={[styles.label, { color: textColor }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // **48 au moins, en hauteur comme en largeur** (24/09/2026, décision n° 7) : la puce mesurait 47
  // de haut (12 + 20 + 12, plus ses deux traits), et une puce « 1 » à largeur naturelle tombait sous
  // 48 de large. Des minimums, pas des mesures : le libellé grandit avec la taille de police du
  // système, la puce doit suivre (A10-21, la même règle que `Button`). Par la taille et jamais par
  // `hitSlop`, qui ferait se recouvrir les cibles de deux puces voisines.
  base: {
    minHeight: ControlHeight.target,
    minWidth: ControlHeight.target,
    paddingVertical: 12,
    borderWidth: Stroke.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Une puce à largeur naturelle tire sa forme de pilule de son padding : c'est lui qui fait
  // la largeur.
  basePilule: { paddingHorizontal: 18 },
  // Une puce équirépartie tire sa largeur du `flex`, et le padding ne fait que **retirer**
  // de la place au texte. À 18 de chaque côté, les sept puces de « jours par semaine » ne
  // laissaient que 3 dp au chiffre sur un écran de 390 dp, pour ~9 nécessaires : Android
  // rognait le glyphe au lieu de le laisser déborder, et les chiffres apparaissaient coupés.
  // (Ces sept-là ne sont plus équiréparties depuis le 24/09/2026 : elles se rangent en grille,
  // `GroupeDeChoix`, sur quatre colonnes **au plus** — trois quand une cible de 48 n'y tiendrait
  // plus, `colonnes` étant un maximum depuis le même soir. La règle vaut pour toutes celles qui
  // restent équiréparties.)
  // Même famille que le `minWidth: 0` des champs de saisie (cf. CLAUDE.md) : un enfant flex
  // qui ne peut pas contenir son contenu ne le signale pas, il le tronque.
  baseFlex: { paddingHorizontal: 4 },
  label: { fontSize: 15, lineHeight: 20 },
});
