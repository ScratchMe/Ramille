import { router, type Href } from 'expo-router';

/**
 * Revenir d'où l'on vient — et, quand il n'y a rien derrière, aller quelque part.
 *
 * **Un `router.back()` nu ne fait rien du tout quand la pile est vide**, et sur le web elle l'est
 * souvent : chaque écran est une vraie adresse, atteignable par un favori, un lien collé, un
 * rechargement ou un démarrage à froid. La personne touche alors « Retour » et reste enfermée sur
 * l'écran, sans un mot. Relevé trois fois : sur `/connexion/retrouver` et `/connexion/email` quand
 * le layout racine les ouvre en `replace`, puis à la recette du 28/09/2026 sur `/plan/pistes`
 * rechargé — et le balayage qui a suivi a trouvé le même défaut sur `/contexte`, `/feedback`,
 * « Toi » et les pages légales. Tous passent désormais par ici ; le nombre ne s'écrit pas, il se
 * relirait faux au prochain écran.
 *
 * Le repli est une **destination** et non un dépilement, et il se choisit à l'appel : chaque écran
 * sait où l'on prétend revenir (le plan pour les pistes, la racine pour ce qui n'a pas de parent).
 */
export function revenirOu(repli: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(repli);
}

/**
 * Sortir d'un flux **terminé** sans laisser son historique derrière soi : vider la pile, puis
 * remplacer ce qui reste par la destination (01/10/2026, audit T-1, `v1-11` §9.4).
 *
 * **`router.replace` seul ne remplace que le sommet de la pile** — le `REPLACE` du `StackRouter`
 * d'expo-router remplace la route à `state.index`, et tout ce qui est dessous reste. Mesuré sur
 * l'export : après un rattachement par code (plan → « Toi » → « Rattacher un compte » → e-mail →
 * code), le retour ramenait à « Ton bilan, d'un appareil à l'autre » — la proposition de rattacher
 * le compte qu'on venait de rattacher —, puis à « Toi », puis à un **second** plan ; après « Me
 * déconnecter », au plan de la session qu'on venait de quitter. C'est la règle de l'onboarding
 * (`etape-transition.tsx`) : une étape finie ne se rejoue pas par le retour, et ça ne se tient pas
 * en interceptant le bouton, mais en n'accumulant rien derrière un flux terminé.
 *
 * **`canDismiss()` d'abord** : une pile d'une seule route — un écran ouvert par son adresse, ou par
 * le layout racine en `replace` — n'a rien à vider, et le `POP_TO_TOP` n'y serait traité par aucun
 * navigateur. Le `replace` qui suit vise alors ce qui reste : pour `/plan`, l'intérieur du groupe
 * d'onglets déjà monté, et plus jamais un second groupe empilé sur le premier ; pour `/`, la racine
 * reconstruit tout à neuf, ce qu'il faut après un changement d'utilisateur.
 *
 * **Pour une sortie de flux, pas pour un « Retour »** : un « Retour » remonte d'où l'on vient
 * (`revenirOu`), une sortie de flux va là où le flux mène, et rien de ce qu'on a traversé pour y
 * arriver ne doit pouvoir se rejouer.
 */
export function terminerLeFlux(destination: Href): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace(destination);
}
