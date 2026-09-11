import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Palette de l'écran courant — un seul point de résolution pour tout le produit.
 *
 * **Le clair est forcé sur web, et ce n'est pas un oubli.** `userInterfaceStyle: light`
 * d'`app.json` ne s'applique qu'au natif : sur web, `useColorScheme` lit
 * `prefers-color-scheme` et rendait donc `Colors.dark` — la palette que `constants/theme.ts`
 * décrit lui-même comme des équivalents provisoires « pas un mode sombre livré ou validé ».
 * Un visiteur en sombre recevait une variante que personne n'a regardée, avec un bouton
 * principal à 3,4:1 (sous le 4,5:1 de WCAG AA) et une mascotte restée claire sur fond noir.
 * Tant que la palette sombre n'est pas validée et le contraste corrigé, le web reste clair —
 * décision inverse possible plus tard, et c'est ici qu'elle se prend, nulle part ailleurs.
 *
 * Le `ThemeProvider` de `src/app/_layout.tsx` porte la même décision pour les chromes de
 * navigation (`DefaultTheme` en dur) : les deux vont ensemble, corriger l'un sans l'autre
 * laisse la moitié de l'écran dans l'autre palette.
 *
 * **Liste blanche plutôt qu'exclusion d'`'unspecified'`** : la déclaration TypeScript de
 * React Native donne `'light' | 'dark' | 'unspecified'`, mais l'implémentation peut rendre
 * `null` quand le module natif d'apparence est absent — `Colors[null]` vaut alors `undefined`
 * et la première lecture de couleur lève, au rendu du premier écran. Tester `'dark'` couvre
 * `'unspecified'`, `null` et `undefined` d'un coup.
 */
export function useTheme() {
  const scheme = useColorScheme();
  const theme = Platform.OS !== 'web' && scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
