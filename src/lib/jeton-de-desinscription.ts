import { Platform } from 'react-native';

/**
 * Le jeton de `/rappels/stop`, retiré de l'adresse dès qu'il est lu (06/10/2026, seconde passe de
 * sécurité, `v1-27` §12.39).
 *
 * **Ce que le retrait ferme, et ce qu'il laisse.** Le lien d'un rappel porte le jeton dans sa chaîne
 * de requête, et la page le laissait dans l'adresse toute sa vie. Retiré une fois l'écran monté, il
 * ne part plus dans le `Referer` des requêtes qui suivent (polices, appels de l'app), et l'entrée
 * de l'historique **de l'onglet** ne le porte plus. Restent, et c'est assumé : la requête du
 * document et celles qui partent avant que le JavaScript tourne (le bundle) portent le jeton,
 * donc les journaux de Vercel le voient ; l'historique **global** du navigateur garde l'adresse
 * visitée ; et un script chargé dans la page — celui du captcha compris — lit le `sessionStorage`
 * aussi bien que l'adresse. Qui obtient le jeton ne peut que couper les rappels de la personne, une
 * fois : la gravité est basse, et le remède ne coûte presque rien.
 *
 * **Pourquoi le garder pour l'onglet.** Une adresse sans jeton, rechargée, dirait « Ce lien n'est
 * plus valable » à quelqu'un qui n'a encore rien coupé. Le jeton est donc posé dans le
 * `sessionStorage`, qui vit le temps de l'onglet et ne part dans aucune requête, et relu au
 * rechargement. Il en sort quand le serveur a répondu sur lui (`oublierLeJeton`,
 * `leJetonSOublieApres`) : il ne sert qu'une fois. **Et un jeton qu'on n'a pas pu garder reste dans
 * l'adresse** (`garderLeJeton` le dit) : un stockage refusé laisse la page exactement comme avant
 * ce module, plutôt qu'un rechargement qui dirait « plus valable ».
 *
 * Web seulement : sur Android, `/rappels/stop` n'est pas capturé par l'app (le `pathPrefix` est
 * `/plan`), et il n'y a ni adresse ni `sessionStorage` à nettoyer. Chaque accès au stockage est
 * dans un `try` : une fenêtre privée ou un stockage bloqué le refusent, et la page doit marcher
 * quand même.
 */
const CLE = 'ramille.jeton-de-desinscription';

function surLeWeb(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

/** `true` si le jeton est gardé pour l'onglet — et alors seulement, il peut quitter l'adresse. */
export function garderLeJeton(jeton: string): boolean {
  if (!surLeWeb()) return false;
  try {
    window.sessionStorage.setItem(CLE, jeton);
    return window.sessionStorage.getItem(CLE) === jeton;
  } catch {
    // Stockage refusé : le jeton reste dans l'adresse, et un rechargement le retrouve là.
    return false;
  }
}

export function relireLeJetonGarde(): string | null {
  if (!surLeWeb()) return null;
  try {
    return window.sessionStorage.getItem(CLE);
  } catch {
    return null;
  }
}

export function oublierLeJeton(): void {
  if (!surLeWeb()) return;
  try {
    window.sessionStorage.removeItem(CLE);
  } catch {
    // Rien à faire : l'onglet l'oubliera en se fermant.
  }
}
