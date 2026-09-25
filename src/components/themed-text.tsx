import { Children, type ReactNode } from 'react';
import { Platform, Text, type TextProps } from 'react-native';

import { Fonts, FontFamily, ThemeColor, TypeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { espacesInsecables } from '@/types/typographie';

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
  // Cinq types adossés à `TypeScale` (cf. theme.ts) : ils portent les tailles que les
  // écrans redéclaraient un par un. `title`/`subtitle` restent tels quels — les migrer est
  // le lot 4 de `v1-11`, pas celui-ci. `display` est arrivé le 24/09/2026 (`v1-29` §3).
  screenTitle: 600,
  salient: 600,
  cardTitle: 600,
  body: 500,
  display: 600,
} as const;

type TypeDeTexte = keyof typeof defaultWeightByType;

// Les types qui portent le titre d'un écran : ils sont annoncés en-têtes de niveau 1. Tout autre
// en-tête — `subtitle`, ou un texte qui déclare lui-même `accessibilityRole="header"` — est une
// section, donc de niveau 2 : sans niveau, react-native-web rend chaque en-tête en `<h1>`, et un
// lecteur d'écran qui parcourt la page par titres ne distingue plus l'écran de ses sections.
const TITRES_DECRAN: readonly TypeDeTexte[] = ['title', 'screenTitle', 'display'];

export type ThemedTextProps = TextProps & {
  type?: TypeDeTexte;
  themeColor?: ThemeColor;
  weight?: 400 | 500 | 600 | 700;
  /**
   * Niveau d'en-tête sur web (`aria-level`), quand le niveau déduit du type ne convient pas —
   * un `subtitle` qui est le seul titre de son écran, par exemple. Sans effet sur natif, où
   * TalkBack n'annonce pas de niveau.
   */
  headingLevel?: 1 | 2 | 3;
};

// Les chaînes d'un texte reçoivent leurs espaces insécables ici, au rendu, et nulle part ailleurs
// (`src/types/typographie.ts` dit pourquoi). Un enfant qui n'est pas une chaîne — un nombre, un
// `ThemedText` imbriqué, qui fera de même pour ses propres chaînes — passe tel quel.
function avecEspacesInsecables(enfants: ReactNode): ReactNode {
  if (typeof enfants === 'string') return espacesInsecables(enfants);
  if (!Array.isArray(enfants)) return enfants;
  return Children.map(enfants, (enfant) => (typeof enfant === 'string' ? espacesInsecables(enfant) : enfant));
}

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  weight,
  headingLevel,
  children,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const resolvedWeight = weight ?? defaultWeightByType[type];

  // `title` et `subtitle` sont les deux types qui portent un titre d'écran ou de section :
  // ils sont donc annoncés comme en-têtes, ce qui permet de naviguer de titre en titre au
  // lecteur d'écran plutôt que de tout parcourir. Le déduire du type plutôt que de l'écrire
  // sur chaque écran évite qu'un futur titre soit oublié — l'audit T11 avait relevé zéro
  // attribut d'accessibilité dans tout `src/`, précisément parce que rien ne les portait par
  // défaut. Reste surchargeable pour le cas où un `title` ne serait pas un titre.
  // `screenTitle` rejoint la liste : sans lui, migrer un écran vers ce type ferait perdre au
  // lecteur d'écran la navigation de titre en titre — ce que l'audit T11 avait mis du temps à
  // obtenir. Le rôle suit la taille, il ne se redéclare pas écran par écran.
  // `display` suit la même règle : c'est un titre d'écran à une autre taille.
  const roleParDefaut =
    type === 'title' || type === 'subtitle' || type === 'screenTitle' || type === 'display'
      ? ('header' as const)
      : undefined;
  const role = rest.accessibilityRole ?? roleParDefaut;
  const niveau = headingLevel ?? (TITRES_DECRAN.includes(type) ? 1 : 2);
  const niveauSurWeb = role === 'header' && Platform.OS === 'web' ? { 'aria-level': niveau } : null;

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
        type === 'screenTitle' && baseSizes.screenTitle,
        type === 'salient' && baseSizes.salient,
        type === 'cardTitle' && baseSizes.cardTitle,
        type === 'body' && baseSizes.body,
        type === 'display' && baseSizes.display,
        style,
      ]}
      accessibilityRole={role}
      {...niveauSurWeb}
      {...rest}>
      {avecEspacesInsecables(children)}
    </Text>
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
  screenTitle: TypeScale.screen,
  salient: TypeScale.salient,
  cardTitle: TypeScale.card,
  body: TypeScale.body,
  display: TypeScale.display,
} as const;
