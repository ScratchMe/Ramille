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
