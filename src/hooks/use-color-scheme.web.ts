import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};

/**
 * Schéma de couleurs du système, côté web.
 *
 * Le rendu statique se fait sans navigateur : la valeur doit donc être recalculée après
 * hydratation, et `useSyncExternalStore` avec un instantané serveur distinct est la seule
 * façon de faire voir ce passage à React — un état initialisé depuis le navigateur dès le
 * premier rendu client laisserait le DOM garder pour toujours les attributs du HTML statique
 * (cf. CLAUDE.md, le pager d'onboarding).
 *
 * **Cette valeur ne choisit plus la palette du produit** : `useTheme` force le clair sur web
 * tant que la palette sombre n'est pas validée. Elle reste lue là pour que la décision tienne
 * en un seul endroit — ne pas « simplifier » la mécanique d'hydratation ci-dessous en un
 * `return 'light'`, ce serait effacer le seul endroit qui sait faire la bascule le jour où le
 * sombre est livré.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
