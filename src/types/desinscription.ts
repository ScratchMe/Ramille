/**
 * La sortie des rappels par le lien d'un email — C2.9, dérivations pures.
 *
 * **Tout tient dans le jeton** : la personne qui clique n'a pas de session, et peut très bien
 * avoir désinstallé l'app. C'est pour elle que cette page existe — l'ancienne consigne
 * (« désactive-les depuis « Toi » dans l'app ») était inutilisable précisément dans le seul cas
 * où quelqu'un veut vraiment arrêter de recevoir.
 */

import type { GenreDEchec } from '@/types/lecture-en-echec';

/**
 * Les cinq états de la page. Aucun n'est un reproche : personne n'a rien fait de mal.
 *
 * `a-confirmer` est l'état d'arrivée depuis le 04/10/2026 : la page demande le geste au lieu de le
 * faire (`etatDeLaPage`).
 */
export type EtatDesinscription = 'a-confirmer' | 'en-cours' | 'coupes' | 'lien-invalide' | 'panne';

/**
 * Ce que rend l'appel au RPC, en séparant le refus du serveur d'une panne. La panne porte son genre
 * depuis le 02/10/2026 (`src/types/ecriture-en-echec.ts`) : la page disait « Vérifie ta connexion » à
 * toute erreur, y compris une réponse du serveur.
 */
export type ReponseDesinscription = { ok: true; coupes: boolean } | { ok: false; genre: GenreDEchec };

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

/**
 * La phrase de la panne, selon son genre — la règle de D19 appliquée aux écritures (`v1-33` §9,
 * 02/10/2026). La fin ne change pas : elle dit ce qui n'a **pas** été fait, et c'est ce qui fait
 * réessayer.
 */
export function phraseDeLaPanne(genre: GenreDEchec): string {
  return genre === 'horsLigne'
    ? 'Ta demande n’a pas abouti. Vérifie ta connexion et réessaie : tes rappels ne sont pas encore coupés.'
    : 'Ta demande n’a pas abouti. Réessaie dans un instant : tes rappels ne sont pas encore coupés.';
}

/**
 * L'état affiché, de l'arrivée sur la page à la réponse du serveur.
 *
 * **La page coupait les rappels dès son ouverture, et ce n'était pas un geste** (04/10/2026, revue
 * finale avant la production ; décision de la personne qui pilote, un bouton « Couper mes
 * rappels »). L'analyseur de liens d'une messagerie professionnelle, qui ouvre les liens d'un
 * e-mail pour les inspecter, exécute parfois la page : il coupait les rappels sans que personne
 * ait cliqué, consommait le jeton, et le vrai clic, plus tard, lisait « Ce lien n'est plus
 * valable ». Supabase décrit le même piège pour ses propres liens de connexion. Le RPC ne part
 * donc plus qu'au toucher du bouton.
 *
 * Tant que la page n'est pas `pret`e, elle demande le geste : c'est ce que dit le HTML statique à
 * tout le monde, et c'est vrai pour qui arrive par le lien — presque tout le monde. `pret` réunit
 * deux conditions depuis le 06/10/2026 : l'hydratation faite (`EXPO.md` §2.2,
 * `useApresHydratation`), **et** le jeton cherché, dans le lien puis dans l'onglet
 * (`jetonARetenir`) — sans la seconde, la page dirait un instant « plus valable » à qui recharge.
 * Prête et sans jeton, elle dit que le lien n'est plus valable.
 */
export function etatDeLaPage(entree: {
  pret: boolean;
  jeton: string | null;
  demandee: boolean;
  reponse: EtatDesinscription | null;
}): EtatDesinscription {
  if (!entree.pret) return 'a-confirmer';
  if (entree.jeton === null) return 'lien-invalide';
  if (!entree.demandee) return 'a-confirmer';
  return entree.reponse ?? 'en-cours';
}

/**
 * Le jeton sur lequel la page agit : celui du lien, sinon celui que l'onglet a gardé (06/10/2026,
 * seconde passe de sécurité, `src/lib/jeton-de-desinscription.ts`).
 *
 * **Le lien passe d'abord** : un second lien ouvert dans le même onglet vise le message qu'on vient
 * de lire, pas celui d'avant. **Et un lien abîmé n'efface pas le jeton gardé** : `duLien` vaut alors
 * `null` (`jetonDuLien` refuse la forme), et la page agit sur le jeton du lien valable ouvert plus
 * tôt dans cet onglet — elle ne peut couper que les rappels de qui l'a reçu, et c'est le seul jeton
 * qu'elle ait. Le jeton gardé passe par la même vérification de forme que celui du lien : le
 * stockage de l'onglet n'est pas plus sûr qu'une adresse.
 */
export function jetonARetenir(duLien: string | null, garde: string | null): string | null {
  return duLien ?? jetonDuLien(garde ?? undefined);
}

/**
 * Le jeton gardé s'oublie-t-il après cette réponse ? Oui quand le serveur a répondu sur lui — coupé,
 * ou refusé : il ne servira plus. Non sur une panne, où rien n'a été fait : « Réessayer » et un
 * rechargement en ont encore besoin.
 */
export function leJetonSOublieApres(etat: EtatDesinscription): boolean {
  return etat === 'coupes' || etat === 'lien-invalide';
}
