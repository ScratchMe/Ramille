import { Platform } from 'react-native';

/**
 * Le jeton de `/rappels/stop`, retiré de l'adresse dès qu'il est lu (06/10/2026, seconde passe de
 * sécurité, `v1-27` §12.39).
 *
 * **Pourquoi l'enlever.** Le lien d'un rappel porte le jeton dans sa chaîne de requête, et la page
 * le laissait dans l'adresse toute sa vie : dans l'historique du navigateur, dans le `Referer` des
 * requêtes vers notre propre origine (donc dans les journaux de Vercel), et lisible par tout script
 * chargé dans la page — celui du captcha compris, que le layout racine charge quand il n'y a pas
 * de session, ce qui est le cas de presque tous ceux qui arrivent par ce lien. Qui obtient le jeton
 * ne peut que couper les rappels de la personne, une fois : la gravité est basse, et le remède ne
 * coûte rien.
 *
 * **Pourquoi le garder pour l'onglet.** Une adresse sans jeton, rechargée, dirait « Ce lien n'est
 * plus valable » à quelqu'un qui n'a encore rien coupé. Le jeton est donc posé dans le
 * `sessionStorage`, qui vit le temps de l'onglet et ne part dans aucune requête, et relu au
 * rechargement. Il en sort quand le serveur a répondu sur lui (`oublierLeJeton`) : il ne sert
 * qu'une fois.
 *
 * Web seulement : sur Android, `/rappels/stop` n'est pas capturé par l'app (le `pathPrefix` est
 * `/plan`), et il n'y a ni adresse ni `sessionStorage` à nettoyer. Chaque accès au stockage est
 * dans un `try` : une fenêtre privée ou un stockage bloqué le refusent, et la page doit marcher
 * quand même, comme avant.
 */
const CLE = 'ramille.jeton-de-desinscription';

function surLeWeb(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

export function garderLeJeton(jeton: string): void {
  if (!surLeWeb()) return;
  try {
    window.sessionStorage.setItem(CLE, jeton);
  } catch {
    // Stockage refusé : seul le rechargement y perd, comme avant ce module.
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
