/**
 * Les jetons du produit : couleurs (clair et sombre), polices, espacements, échelle
 * typographique, rayons, hauteurs de contrôle et épaisseurs de trait. Le kit de
 * `docs/design/design-system/tokens/` les recopie — toucher une valeur ici impose de la
 * recopier là-bas (`v1-29` §5).
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
// Les quatre jetons de la mascotte (`v1-14` §6, chantier C2.13). Ils sont là plutôt qu'en dur
// dans `src/components/mascot.tsx` pour une raison précise : **le visage ne suit pas le thème,
// la feuille oui.** La feuille est peinte en `accent`, qui vaut #1F6F4A en clair et #3D9B6F en
// sombre ; l'encre des yeux et de la bouche, la nervure et les accessoires de saison gardent au
// contraire la même valeur dans les deux palettes — un visage qui s'éclaircirait avec le fond
// cesserait de se lire sur le vert. C'est pourquoi les trois premiers sont identiques ligne à
// ligne, et c'est volontaire : la valeur dupliquée dit « ce jeton ne bascule pas ».
//
// Aujourd'hui `mascot.tsx` lit `Colors.light` pour tout, comme avant ce chantier (le mode clair
// est forcé sur web, et `app.json` porte `userInterfaceStyle: light` sur natif). Les valeurs
// `dark` ne sont donc **pas encore lues** — même dormance assumée que `cadence_type =
// 'rolling_quarter'` côté serveur, et pour la même raison : le jour où un thème sombre est
// livré, c'est cette table qui dit ce qui bascule et ce qui ne bascule pas. **Et ce ne sera pas
// « une ligne du composant »**, contrairement à ce qui était écrit ici : C2.13 a ajouté un second
// gel de `Colors.light` au niveau module (le `COULEUR` de `mascot.tsx`), donc il y a deux endroits à
// reprendre — soit en faire une fonction de la palette courante, soit les corriger ensemble
// (relevé le 14/09/2026).
//
// Six jetons d'état (24/09/2026, `v1-29` §3), tous lus par les deux thèmes :
// - `onAccent` : texte et icône posés sur `accent` — bouton principal, puce pleine, onglet actif
//   (6,12:1 en clair). Le blanc était écrit en dur à trois endroits ;
// - `accentPressed`, `backgroundPressed`, `backgroundSelectedPressed` : la surface **sous le
//   doigt**, teinte immédiate et sans animation. Aucun contrôle ne répondait au toucher, ce qui se
//   lit « l'app n'a pas pris mon geste ». Blanc sur `accentPressed` : 8,67:1 ; `textTertiary` sur
//   `backgroundPressed` : 4,76:1 ; `accent` sur `backgroundSelectedPressed` : 4,76:1 ;
// - `fieldBorder` : le contour d'un champ **au repos**. Le fond `backgroundElement` d'un champ vide
//   ne tranche qu'à 1,14:1 sur le blanc, donc le champ ne se voyait pas (WCAG 1.4.11 demande 3:1) :
//   3,45:1 sur blanc, 3,04:1 sur `backgroundElement` ;
// - `scrim` : le voile sous une feuille du bas, écrit en dur à deux endroits.
// Les valeurs sombres sont provisoires, comme tout le thème sombre (`v1-29` §6.1) — et `onAccent`
// n'y tient que 3,43:1 sur l'accent sombre, ce que la liste de reprise du thème sombre nomme.
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
    onAccent: '#FFFFFF',
    accentPressed: '#14563A',
    backgroundPressed: '#E4E6DF',
    backgroundSelectedPressed: '#D6E7DC',
    fieldBorder: '#858C86',
    scrim: 'rgba(19, 22, 18, 0.42)',
    mascotInk: '#131612',
    mascotVein: '#E4EFE8',
    mascotAccessory: '#E4EFE8',
    mascotWarm: '#C99A6B',
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
    onAccent: '#FFFFFF',
    accentPressed: '#2F7F59',
    backgroundPressed: '#2A2C2F',
    backgroundSelectedPressed: '#24392B',
    fieldBorder: '#767D77',
    scrim: 'rgba(0, 0, 0, 0.6)',
    mascotInk: '#131612',
    mascotVein: '#E4EFE8',
    mascotAccessory: '#E4EFE8',
    mascotWarm: '#B98A5E',
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

/**
 * Police à chasse fixe du type `code` de `ThemedText` — **réservée aux sources et aux codes
 * techniques** (référence ADEME, identifiant), jamais à une phrase adressée à la personne
 * (`v1-29` §3, `FRONT.md` §1). Les trois autres familles du gabarit Expo (`sans`, `serif`,
 * `rounded`) n'étaient lues par aucun écran : Spline Sans passe par `FontFamily`.
 */
export const Fonts = Platform.select({
  ios: { mono: 'ui-monospace' },
  default: { mono: 'monospace' },
  web: { mono: 'var(--font-mono)' },
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

/**
 * Échelle typographique **réellement en vigueur dans les écrans**, relevée le 07/09/2026
 * (canvas `docs/design/v1-11-navigation/`, page Système ; plan `v1-11` lot 0).
 *
 * Ce n'est pas une proposition : c'est le constat que quatre tailles se répètent en dur d'un
 * écran à l'autre — 26/32 dix-huit fois, 15/22 treize fois — alors que `ThemedText` ne connaît
 * que `title` (48) et `subtitle` (32), tailles du handoff initial qu'**aucun écran n'affiche
 * sans les surcharger**. Le rôle d'en-tête accessible était donc porté par le `type`, et la
 * taille par l'écran : ces jetons referment cette dissociation.
 *
 * Les tailles uniques restent en dur là où elles vivent (34 de l'accroche d'onboarding) : les
 * nommer serait du bruit, pas du vocabulaire.
 *
 * **Cette phrase exemptait aussi « 48 du total de la restitution », et ce chiffre n'a jamais
 * existé** (A3-22, relevé le 11/09/2026). Le code disait 26 — exactement `screen`, le jeton des
 * titres d'écran, recopié à la main sur le chiffre le plus important du produit. L'exemption
 * avait été écrite de mémoire, et `v1-11` l.408 annonçait 44 pour la même ligne : deux valeurs
 * fausses et différentes pour un même endroit. Le total est passé sur `salient` ; il n'y a plus
 * de taille hors échelle sur la restitution. Ne pas rouvrir d'exemption sans relever la valeur
 * dans le code.
 *
 * **Ailleurs, la migration du lot 4 n'est pas finie** : quatre recopies de jeton subsistent au
 * 11/09/2026 — `salient` dans `connexion/index.tsx` et `onboarding/etape-contexte.tsx`, `card`
 * dans `bande-haute.tsx` et `bilan/numeric-field.tsx`. La commande de contrôle du lot 4 rend
 * donc sept lignes, pas zéro : le relevé complet, avec les trois tailles propres à un écran qui
 * restent à arbitrer, est dans `v1-11` §« Lot 4 ».
 */
export const TypeScale = {
  /** Titre d'écran. */
  screen: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  /**
   * Chiffre saillant d'une carte : total de la restitution, cap de la saison, écart entre deux
   * bilans. Il reste **sous** la décision dominante (32) : ce que le produit met en tête, c'est
   * le poste sur lequel agir, pas le total.
   */
  salient: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  /** Titre de carte : intitulé d'une action, d'un check-in. */
  card: { fontSize: 17, lineHeight: 24 },
  /** Corps d'écran, sous un titre. Plus resserré que le `default` de ThemedText (16/24). */
  body: { fontSize: 15, lineHeight: 22 },
  /**
   * Grand titre : la décision dominante de la restitution, et le titre d'une surface qui se lit
   * seule — page introuvable, suppression de compte, désinscription des rappels, étapes
   * d'accroche de l'onboarding. Six recopies à la main jusqu'au 24/09/2026 (`v1-29` §3).
   */
  display: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
} as const;

/**
 * Rayons. `field` vaut **16 et non 14** — la valeur du canvas était fausse, le relevé du code
 * la corrige : c'est le rayon le plus fréquent du produit (douze usages), partagé par les
 * champs de saisie et les blocs internes d'une carte.
 *
 * **`chip` a changé de sens le 24/09/2026** (`v1-29` §3) : il valait 8, pour la puce « Cadence »
 * du plan, disparue avec C2.8 — plus aucun écran ne le lisait. Il porte désormais le 14 des puces
 * de choix, écrit en dur douze fois.
 */
export const Radius = {
  /** Encadré d'information d'une étape du questionnaire. */
  notice: 12,
  /** Puce de choix (`Chip`) et ligne de mode (`ModeListItem`). */
  chip: 14,
  /** Champ de saisie, bloc interne d'une carte. */
  field: 16,
  /** Carte. */
  card: 18,
  /** Bouton pleine largeur. */
  button: 27,
} as const;

/**
 * Hauteurs de contrôle. **`target` vaut 48 depuis le 24/09/2026** (`v1-29` §3) : c'est la cible
 * tactile de Material (48 dp), que le produit, sur Android d'abord, se donne pour minimum. Ce
 * commentaire attribuait 44 à « WCAG 2.5.8 / Material », ce qui était faux deux fois : 2.5.8
 * (niveau AA) ne demande que 24 px, 44 est le seuil de 2.5.5 (AAA), et Material dit 48. Portée
 * par `TextLink` sans déplacer le texte, et par tout contrôle qui n'a pas de hauteur à lui.
 */
export const ControlHeight = {
  target: 48,
  /** Bande haute d'un écran (`BandeHaute`). */
  topBand: 52,
  button: 54,
  field: 56,
  /** Barre d'onglets, avant l'encoche basse du téléphone. */
  tabBar: 60,
  /** Champ numérique du questionnaire, chiffre en grand. */
  numeric: 64,
} as const;

/**
 * Épaisseurs de trait. `selected` est le contour d'une puce ou d'une ligne choisie, `engaged` celui
 * de la carte de l'action engagée ; `hairline` le contour neutre d'une carte ou d'un bouton
 * secondaire.
 */
export const Stroke = {
  hairline: 1,
  selected: 1.5,
  engaged: 2,
} as const;

export const MaxContentWidth = 800;
