import { router, type Href } from 'expo-router';

/**
 * Revenir d'où l'on vient — et, quand il n'y a rien derrière, aller quelque part.
 *
 * **Un `router.back()` nu ne fait rien du tout quand la pile est vide**, et sur le web elle l'est
 * souvent : chaque écran est une vraie adresse, atteignable par un favori, un lien collé, un
 * rechargement ou un démarrage à froid. La personne touche alors « Retour » et reste enfermée sur
 * l'écran, sans un mot. Relevé trois fois : sur `/connexion/retrouver` et `/connexion/email` quand
 * le layout racine les ouvre en `replace`, puis à la recette du 28/09/2026 sur `/plan/pistes`
 * rechargé — et le balayage qui a suivi en a trouvé sept autres (`/contexte`, `/feedback`, « Toi »,
 * les pages légales).
 *
 * Le repli est une **destination** et non un dépilement, et il se choisit à l'appel : chaque écran
 * sait où l'on prétend revenir (le plan pour les pistes, la racine pour ce qui n'a pas de parent).
 */
export function revenirOu(repli: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(repli);
}
