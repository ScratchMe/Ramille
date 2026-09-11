import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
   *  l'engagement, où `radio` serait faux), `button` pour une vraie action. `radio` et
   *  `checkbox` sont les seuls rôles à annoncer « non sélectionné » et la place dans le
   *  groupe.
   *
   *  **Le défaut `button` est provisoire, et il laisse le défaut d'A2-8 en place partout où il
   *  s'applique encore** : un `button` qui porte `selected` est la combinaison qu'A2-8 désigne.
   *  Six appels n'ont pas été relus et le gardent — `steps/context.tsx`, `steps/flights.tsx`,
   *  `steps/commute-days-distance.tsx`, `steps/commute-extra.tsx`, `steps/leisure-detail.tsx`
   *  (tous des choix uniques, donc `radio` dans une `View accessibilityRole="radiogroup"`) et
   *  `plan/action-commitment.tsx` (jours cumulables, donc `checkbox` dans un groupe nommé).
   *  Rendre la prop obligatoire est ce qui les énumérera au typecheck, et c'est le geste à faire
   *  en même temps qu'eux — pas avant, un défaut ne se remplace pas par un build cassé. */
  role?: 'button' | 'radio' | 'checkbox';
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
  role = 'button',
}: ChipProps) {
  const theme = useTheme();

  const backgroundColor = selected
    ? selectedStyle === 'solid'
      ? theme.accent
      : theme.backgroundSelected
    : theme.backgroundElement;
  const borderColor = selected && selectedStyle === 'outline' ? theme.accent : 'transparent';
  const textColor = selected && selectedStyle === 'solid' ? '#FFFFFF' : theme.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      // Un rôle de choix porte **les deux** états, comme les quatre autres contrôles exclusifs
      // du produit (`mode-list-item`, `choice-row`, `choix-de-rappel`, `feuille-rappels`) :
      // `checked` est ce que TalkBack attend d'un `radio` ou d'une `checkbox`, et `selected` est
      // ce que VoiceOver sait rendre — iOS n'a pas de trait `radio` et ne lit `checked` que sur
      // un interrupteur ou une case, donc n'annoncerait aucun état sans lui. Un `button`, lui,
      // ne prend que `selected` : `aria-checked` sur `role="button"` n'existe pas.
      accessibilityState={role === 'button' ? { selected } : { selected, checked: selected }}
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
    borderWidth: 1.5,
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
