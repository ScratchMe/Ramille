/**
 * La sortie des rappels par le lien d'un email — C2.9, dérivations pures.
 *
 * **Tout tient dans le jeton** : la personne qui clique n'a pas de session, et peut très bien
 * avoir désinstallé l'app. C'est pour elle que cette page existe — l'ancienne consigne
 * (« désactive-les depuis « Toi » dans l'app ») était inutilisable précisément dans le seul cas
 * où quelqu'un veut vraiment arrêter de recevoir.
 */

/** Les quatre états de la page. Aucun n'est un reproche : personne n'a rien fait de mal. */
export type EtatDesinscription = 'en-cours' | 'coupes' | 'lien-invalide' | 'panne';

/** Ce que rend l'appel au RPC, en séparant le refus du serveur d'une panne de transport. */
export type ReponseDesinscription = { ok: true; coupes: boolean } | { ok: false };

const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Le jeton de la chaîne de requête, ou `null` si l'URL n'en porte pas un utilisable.
 *
 * **La forme est vérifiée ici, et ce n'est pas de la coquetterie.** `desinscrire_des_rappels`
 * prend un `uuid` : un lien tronqué par une messagerie enverrait au serveur une chaîne qui n'en
 * est pas un, et PostgREST répondrait `22P02 invalid input syntax for type uuid` — c'est-à-dire
 * une **erreur**, que la page afficherait comme une panne et qui inviterait à réessayer un lien
 * qui ne marchera jamais. Vérifier la forme fait arriver un lien abîmé sur le même écran qu'un
 * jeton inconnu, qui est aussi ce que la non-divulgation exige : la page ne doit pas laisser
 * deviner si un jeton a existé.
 *
 * `useLocalSearchParams` rend un tableau quand le paramètre apparaît deux fois ; on prend alors
 * le premier plutôt que de refuser, un lien recopié à la main pouvant le dupliquer.
 */
export function jetonDuLien(valeur: string | string[] | undefined): string | null {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  if (!brut) return null;
  const jeton = brut.trim();
  return FORME_UUID.test(jeton) ? jeton : null;
}

/**
 * L'état après la réponse du serveur.
 *
 * **`false` ne se distingue jamais d'un autre `false`** : jeton inconnu, déjà utilisé, ou dont la
 * ligne a été purgée mènent au même écran, comme un envoi refusé et un envoi accepté mènent au
 * même écran dans `/connexion/retrouver`. Trois messages feraient de cette page un moyen de
 * savoir qui reçoit des rappels de Ramille.
 *
 * Une panne de transport, elle, **doit** se distinguer : annoncer « ce lien n'est plus valable » à
 * quelqu'un dont le réseau a coupé lui ferait croire que son geste est perdu, et il ne
 * réessaierait pas.
 */
export function etatApres(reponse: ReponseDesinscription): EtatDesinscription {
  if (!reponse.ok) return 'panne';
  return reponse.coupes ? 'coupes' : 'lien-invalide';
}
