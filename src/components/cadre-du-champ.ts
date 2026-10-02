// Le cadre d'un champ de saisie — sa bordure, et sur web son anneau de focus.
//
// **Hors de `auth/` depuis le 02/10/2026** (`v1-33` §9) : il vivait dans `auth/text-field.tsx`, et le
// champ de distance du questionnaire (`bilan/numeric-field.tsx`) l'importait de là — un composant du
// bilan qui dépendait d'un fichier de la connexion pour un style qui n'appartient à aucun des deux.
import { Platform, type TextStyle } from 'react-native';

/**
 * **Le cadre d'un champ de saisie, écrit une fois pour les quatre du produit** — `TextField`,
 * `ChampDeCode`, `NumericField` et le champ du retour (01/10/2026, audit Q-12) : sa bordure, et sur
 * web l'anneau de focus.
 *
 * **La bordure passe à l'accent au focus comme au remplissage**, à la même épaisseur (`Stroke.field`),
 * pour que rien ne bouge : c'est la règle du kit (« champ rempli ou focus = bordure accent »), que le
 * code ne suivait qu'à moitié — le focus laissait la bordure grise.
 *
 * **Mais elle ne suffit pas à dire le focus, et l'anneau du navigateur reste — il change de place.**
 * Gris au repos, vert au focus, le changement ne tient qu'à 1,78:1 (`fieldBorder` contre `accent`) :
 * sous les 3:1 qu'un état demande quand il passe par la couleur (`FRONT.md` §1.4), et nul sur un champ
 * déjà rempli, dont la bordure est déjà verte. L'anneau ne part donc pas : il quitte l'`<input>`, où il
 * dessinait un rectangle dans le champ arrondi, pour le cadre, qu'il suit — exactement ce que le champ
 * du retour, dont l'élément **est** le cadre, montrait déjà. Même anneau que tout autre contrôle du
 * produit sur web (`outline: auto`), rien ne bouge (un contour ne prend pas de place), et l'indicateur
 * reste une forme, au contraste du navigateur (WCAG 2.4.7) — mesuré sur l'export le 01/10/2026, dans
 * Chromium : un anneau noir à 21:1 sur la page et 18,5:1 sur le fond du champ (#101010 pour le champ
 * du retour, 19:1 et 16,8:1). Sur natif, rien de tout cela : le clavier ouvert et le curseur disent le
 * focus.
 */
export function cadreDuChamp(
  theme: { accent: string; fieldBorder: string },
  { rempli, focus }: { rempli: boolean; focus: boolean }
): { borderColor: string } {
  return {
    borderColor: rempli || focus ? theme.accent : theme.fieldBorder,
    ...(focus && Platform.OS === 'web' ? ANNEAU_DU_CADRE : null),
  };
}

// `auto`, que les types de React Native ne connaissent pas : react-native-web le passe tel quel au
// navigateur, qui y dessine son anneau de focus. Sur le web seulement.
// Typé vide : il se pose sur une vue comme sur un `TextInput` (le champ du retour porte lui-même son
// cadre), et aucun des deux types ne connaît `auto`.
const ANNEAU_DU_CADRE = { outlineStyle: 'auto', outlineOffset: 0 } as unknown as Record<never, never>;

/** Retire l'anneau que le navigateur pose sur l'`<input>` lui-même : le cadre porte le sien. */
export const SANS_ANNEAU_DE_L_INPUT: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};
