import { gardeDuJetonPourLOnglet } from '@/lib/jeton-de-l-onglet';

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
 * Le mécanisme vit dans `src/lib/jeton-de-l-onglet.ts` depuis le 24/10/2026, partagé avec `/point` (la
 * réponse au point depuis l'e-mail), chacune sous sa clé : web seulement, chaque accès au stockage dans
 * un `try`.
 */
const garde = gardeDuJetonPourLOnglet('ramille.jeton-de-desinscription');

/** `true` si le jeton est gardé pour l'onglet — et alors seulement, il peut quitter l'adresse. */
export const garderLeJeton = garde.garder;
export const relireLeJetonGarde = garde.relire;
export const oublierLeJeton = garde.oublier;
