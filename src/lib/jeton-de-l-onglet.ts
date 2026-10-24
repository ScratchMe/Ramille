import { Platform } from 'react-native';

/**
 * Un jeton lu dans l'adresse d'une page sans compte, gardé pour l'onglet le temps qu'il serve — le
 * mécanisme de `/rappels/stop` (`src/lib/jeton-de-desinscription.ts`, qui dit ce que le retrait de
 * l'adresse ferme et ce qu'il laisse), partagé depuis le 24/10/2026 avec `/point`, la réponse au point
 * depuis l'e-mail (étape 6b de `v1-35`). **Une clé par page** : un onglet qui ouvre le lien de réponse
 * puis celui de désinscription ne doit pas couper les rappels avec le jeton de la réponse.
 *
 * Web seulement : ni l'une ni l'autre page n'est capturée par l'app sur Android (le `pathPrefix` est
 * `/plan`), et il n'y a ni adresse ni `sessionStorage` à nettoyer. Chaque accès au stockage est dans un
 * `try` : une fenêtre privée ou un stockage bloqué le refusent, et la page doit marcher quand même.
 */
export type GardeDuJeton = {
  /** `true` si le jeton est gardé pour l'onglet — et alors seulement, il peut quitter l'adresse. */
  garder: (jeton: string) => boolean;
  relire: () => string | null;
  oublier: () => void;
};

function surLeWeb(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

export function gardeDuJetonPourLOnglet(cle: string): GardeDuJeton {
  return {
    garder(jeton) {
      if (!surLeWeb()) return false;
      try {
        window.sessionStorage.setItem(cle, jeton);
        return window.sessionStorage.getItem(cle) === jeton;
      } catch {
        // Stockage refusé : le jeton reste dans l'adresse, et un rechargement le retrouve là.
        return false;
      }
    },
    relire() {
      if (!surLeWeb()) return null;
      try {
        return window.sessionStorage.getItem(cle);
      } catch {
        return null;
      }
    },
    oublier() {
      if (!surLeWeb()) return;
      try {
        window.sessionStorage.removeItem(cle);
      } catch {
        // Rien à faire : l'onglet l'oubliera en se fermant.
      }
    },
  };
}
