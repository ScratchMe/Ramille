import { Text, type TextProps } from 'react-native';

import { Fonts, FontFamily, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const weightToFamily: Record<400 | 500 | 600 | 700, string> = {
  400: FontFamily.regular,
  500: FontFamily.medium,
  600: FontFamily.semibold,
  700: FontFamily.bold,
};

// Poids par défaut de chaque `type` — permet de garder `type="title"` sans avoir à
// répéter `weight` partout, tout en autorisant `weight` explicite pour les écrans
// avec des tailles ad hoc (la maquette a beaucoup plus de variantes de titre que ce
// composant n'en préconfigure).
const defaultWeightByType = {
  default: 500,
  title: 600,
  small: 500,
  smallBold: 700,
  subtitle: 600,
  link: 500,
  linkPrimary: 600,
  code: 500,
} as const;

export type ThemedTextProps = TextProps & {
  type?: keyof typeof defaultWeightByType;
  themeColor?: ThemeColor;
  weight?: 400 | 500 | 600 | 700;
};

export function ThemedText({ style, type = 'default', themeColor, weight, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const resolvedWeight = weight ?? defaultWeightByType[type];

  // `title` et `subtitle` sont les deux types qui portent un titre d'écran ou de section :
  // ils sont donc annoncés comme en-têtes, ce qui permet de naviguer de titre en titre au
  // lecteur d'écran plutôt que de tout parcourir. Le déduire du type plutôt que de l'écrire
  // sur chaque écran évite qu'un futur titre soit oublié — l'audit T11 avait relevé zéro
  // attribut d'accessibilité dans tout `src/`, précisément parce que rien ne les portait par
  // défaut. Reste surchargeable pour le cas où un `title` ne serait pas un titre.
  const roleParDefaut = type === 'title' || type === 'subtitle' ? ('header' as const) : undefined;

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'], fontFamily: weightToFamily[resolvedWeight] },
        type === 'default' && baseSizes.default,
        type === 'title' && baseSizes.title,
        type === 'small' && baseSizes.small,
        type === 'smallBold' && baseSizes.smallBold,
        type === 'subtitle' && baseSizes.subtitle,
        type === 'link' && baseSizes.link,
        type === 'linkPrimary' && [baseSizes.linkPrimary, { color: theme.accentText }],
        type === 'code' && [baseSizes.code, { fontFamily: Fonts.mono }],
        style,
      ]}
      accessibilityRole={rest.accessibilityRole ?? roleParDefaut}
      {...rest}
    />
  );
}

const baseSizes = {
  small: { fontSize: 14, lineHeight: 20 },
  smallBold: { fontSize: 14, lineHeight: 20 },
  default: { fontSize: 16, lineHeight: 24 },
  title: { fontSize: 48, lineHeight: 52 },
  subtitle: { fontSize: 32, lineHeight: 44 },
  link: { lineHeight: 30, fontSize: 14 },
  linkPrimary: { lineHeight: 30, fontSize: 14 },
  code: { fontSize: 12 },
} as const;
