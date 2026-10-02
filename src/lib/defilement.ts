// Amener une carte dans la fenêtre de défilement : la mesure commune au plan et à la liste des pistes.
//
// **Elle vivait deux fois** (`v1-33` §9, relevé par la contre-lecture de la PR #314) : la marge et la
// mesure étaient recopiées dans `src/app/(tabs)/plan/index.tsx` et `src/app/(tabs)/plan/pistes.tsx`,
// sous un commentaire qui exigeait qu'elles restent égales — et rien ne les liait. Écrites ici une fois
// le 02/10/2026 ; ce que chaque écran fait de la mesure (`defilementPourMontrer`, `defilementVersLaCarte`)
// reste à lui.
import { Spacing } from '@/constants/theme';

/**
 * Ce qu'on garde des deux côtés d'une carte qu'on amène dans la fenêtre — pour que les deux écrans
 * s'arrêtent au même endroit sous la bande et au-dessus de la barre.
 */
export const MARGE_DE_DEFILEMENT = Spacing.three;

/** Ce que la mesure rend : des positions lues depuis le haut de la fenêtre de défilement, en pixels. */
export type MesureDansLaFenetre = { haut: number; bas: number; hauteurFenetre: number; marge: number };

type Mesurable = {
  measureInWindow: (rappel: (x: number, y: number, largeur: number, hauteur: number) => void) => void;
};

/**
 * Mesure `carte` dans `ecran` — le nœud qui défile, et non l'instance du composant, qui ne se mesure pas
 * (sur web, react-native-web rend le nœud du DOM). **Dans la fenêtre, pas dans la page** : l'ancrage du
 * défilement de Chrome compense ce qui change de taille au-dessus, et une position dans la page bougerait
 * sans que rien ne bouge à l'œil (`TESTING-GARDES.md` §2.14).
 */
export function mesurerDansLaFenetre(
  ecran: Mesurable,
  carte: Mesurable,
  quand: (mesure: MesureDansLaFenetre) => void
): void {
  ecran.measureInWindow((_x, hautDeLaFenetre, _largeur, hauteurFenetre) => {
    carte.measureInWindow((_cx, hautDeLaCarte, _cLargeur, hauteurDeLaCarte) => {
      const haut = hautDeLaCarte - hautDeLaFenetre;
      quand({ haut, bas: haut + hauteurDeLaCarte, hauteurFenetre, marge: MARGE_DE_DEFILEMENT });
    });
  });
}
