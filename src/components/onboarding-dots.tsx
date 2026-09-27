import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type OnboardingDotsProps = {
  total: number;
  activeIndex: number;
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
//
// **Les inactifs au contour d'un champ, et l'actif allongé** (arbitrage du 27/09/2026, `v1-29`
// §6.3). En `border`, les inactifs ne ressortaient qu'à 1,33:1 sur blanc et 1,37:1 sur la page
// teintée (dans son neutre à elle, `paginationInactive`, retiré avec cette décision) : WCAG 1.4.11
// demande 3:1 d'un élément graphique nécessaire, et ces points sont la seule progression visible.
// `fieldBorder` les porte à 3,45:1 sur blanc et 3,21:1 sur la teinte (4,97 et 4,41 en sombre), un
// seul neutre pour les deux fonds. Mais l'actif ne s'en distinguait plus que par sa teinte — 1,78:1
// en clair, 1,23:1 en sombre —, d'où la **forme** : une pilule de 20 px, qu'on lit sans la couleur
// (WCAG 1.4.1). Même hauteur, donc rien ne bouge dans la page.
export function OnboardingDots({ total, activeIndex }: OnboardingDotsProps) {
  const theme = useTheme();
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
          style={[
            styles.dot,
            index === activeIndex
              ? [styles.actif, { backgroundColor: theme.accent }]
              : { backgroundColor: theme.fieldBorder },
          ]}
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
  actif: { width: 20 },
});
