import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type OnboardingDotsProps = {
  total: number;
  activeIndex: number;
  /** Fond teinté (onboarding 3) : les points inactifs utilisent une teinte plus douce. */
  onTint?: boolean;
};

// Progression par points, jamais un pourcentage (spec design onboarding).
//
// **C'est la seule information de progression de l'onboarding, et elle n'était annoncée nulle
// part** (A1-7) : quatre `View` de 8 px sans rôle ni libellé. Le conteneur porte donc le rôle
// `progressbar` et dit la position en mots, les points restant décoratifs — `accessible`
// regroupe le tout, donc un lecteur d'écran entend « Étape 2 sur 4 » et non quatre éléments
// muets. La position part de 1 : « étape 0 sur 4 » ne veut rien dire pour qui l'entend.
//
// **Et elle reste en mots : pas d'`accessibilityValue` numérique.** Une plage
// (`{ min, max, now }`) fait poser à React Native un `RangeInfo` sur le nœud Android, que
// TalkBack énonce **en plus** du libellé — « Étape 2 sur 4, 2 », la même information deux fois —
// et c'est l'API par laquelle un lecteur d'écran choisit de rendre une progression en
// proportion. La ligne au-dessus dit pourquoi ce serait faux ici.
export function OnboardingDots({ total, activeIndex, onTint }: OnboardingDotsProps) {
  const theme = useTheme();
  const inactiveColor = onTint ? theme.paginationInactive : theme.border;
  const etape = Math.min(total, activeIndex + 1);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Étape ${etape} sur ${total}`}
      style={styles.row}
    >
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[styles.dot, { backgroundColor: index === activeIndex ? theme.accent : inactiveColor }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
