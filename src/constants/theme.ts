/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Tokens issus du handoff design (design_handoff_traceverte_v1, écrans V1).
// Le vert #1F6F4A remplace le bleu #208AEF du scaffold initial — décision produit
// prise le 23/08/2026, cohérente avec les 20 écrans déjà validés côté design.
//
// Le handoff ne définit que la palette light — pas de mode sombre spécifié.
// V1 fonctionne en light uniquement (app.json: userInterfaceStyle "light"), les
// valeurs dark ci-dessous sont des équivalents provisoires pour la sûreté de
// typage, pas un mode sombre livré ou validé.
export const Colors = {
  light: {
    text: '#131612',
    textSecondary: '#39403B',
    textTertiary: '#5E655F',
    background: '#FFFFFF',
    backgroundTinted: '#F3F8F4',
    backgroundElement: '#F0F1EC',
    backgroundElement2: '#F6F8F3',
    backgroundSelected: '#E4EFE8',
    accent: '#1F6F4A',
    accentText: '#14563A',
    accentMuted: '#A9C8B6',
    border: '#DDE0D9',
    paginationInactive: '#CDD7CF',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#B0B4BA',
    textTertiary: '#8A9088',
    background: '#000000',
    backgroundTinted: '#0F1410',
    backgroundElement: '#212225',
    backgroundElement2: '#1A1C1A',
    backgroundSelected: '#1C2E22',
    accent: '#3D9B6F',
    accentText: '#8FCBA9',
    accentMuted: '#3A5245',
    border: '#2E3135',
    paginationInactive: '#3A3D3A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Spline Sans (handoff design, poids 400/500/600/700) — chargée via
// @expo-google-fonts/spline-sans dans _layout.tsx. Une fontFamily explicite par poids
// est nécessaire (pas juste fontWeight) : sans police variable, Android ignore
// fontWeight sur une police custom chargée comme fichiers séparés par poids.
export const FontFamily = {
  regular: 'SplineSans_400Regular',
  medium: 'SplineSans_500Medium',
  semibold: 'SplineSans_600SemiBold',
  bold: 'SplineSans_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
