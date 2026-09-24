import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  accessibilityLabel,
  role,
}: ChipProps) {
  const theme = useTheme();

  const backgroundColor = selected
    ? selectedStyle === 'solid'
      ? theme.accent
      : theme.backgroundSelected
    : theme.backgroundElement;
  const borderColor = selected && selectedStyle === 'outline' ? theme.accent : 'transparent';
  const textColor = selected && selectedStyle === 'solid' ? theme.onAccent : theme.text;

  return (
    <Pressable
      onPress={onPress}
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
      style={[
        styles.base,
        flex ? styles.baseFlex : styles.basePilule,
        { borderRadius: radius, backgroundColor, borderColor, flex: flex ? 1 : undefined },
      ]}
    >
      <ThemedText weight={selected ? 600 : 400} style={[styles.label, { color: textColor }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
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
  // Même famille que le `minWidth: 0` des champs de saisie (cf. CLAUDE.md) : un enfant flex
  // qui ne peut pas contenir son contenu ne le signale pas, il le tronque.
  baseFlex: { paddingHorizontal: 4 },
  label: { fontSize: 15, lineHeight: 20 },
});
