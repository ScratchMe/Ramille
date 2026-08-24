import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type OnboardingDotsProps = {
  total: number;
  activeIndex: number;
  /** Fond teinté (onboarding 3) : les points inactifs utilisent une teinte plus douce. */
  onTint?: boolean;
};

// Progression par points, jamais un pourcentage (spec design onboarding).
export function OnboardingDots({ total, activeIndex, onTint }: OnboardingDotsProps) {
  const theme = useTheme();
  const inactiveColor = onTint ? theme.paginationInactive : theme.border;

  return (
    <View style={styles.row}>
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
