/**
 * État du rattachement du compte, tel qu'il s'affiche — module **pur**, sans import de
 * `@/lib/supabase` (règle du CLAUDE.md).
 *
 * Distinct de `etatDuCompte` (`compte-suppression.ts`), et il faut que les deux le restent.
 * Celui-là répond « puis-je supprimer ce compte, et sous quelle forme ? », et il a raison de
 * confondre une adresse écrite non confirmée avec une session anonyme : dans les deux cas la
 * suppression est la même. Celui-ci répond « qu'est-ce que la personne doit lire à l'écran ? »,
 * et là cette confusion est précisément le défaut à corriger (issue #62) : entre
 * `updateUser({ email })` et la confirmation, l'écran « Toi » proposait de rattacher un compte,
 * comme si la demande n'avait jamais eu lieu. La boucle ouverte par l'écran des e-mails ne se
 * refermait nulle part. Depuis le 20/09/2026 la confirmation est un **code tapé** et non un lien
 * cliqué, et « Toi » porte la porte qui y ramène — sans quoi la phrase de l'écran de code, qui
 * promet de retrouver la saisie depuis là, serait fausse.
 */

import type { SessionCompte } from '@/types/compte-suppression';

export type EtatRattachement =
  /** Identité confirmée : le bilan suit la personne d'un appareil à l'autre. */
  | { kind: 'rattache'; email: string | null }
  /** Adresse écrite, confirmation pas encore cliquée. Un fait, jamais une relance. */
  | { kind: 'a_confirmer'; email: string }
  /** Aucune adresse : tout vit sur cet appareil. */
  | { kind: 'local' }
  /** La lecture n'a pas abouti : on ne sait pas, et on ne l'invente pas. */
  | { kind: 'indisponible' };

/**
 * **Le quatrième état existe parce que `local` est le plus affirmatif des trois autres**
 * (A6-8). `lireEtatDuRattachement` passe par `getUser()`, qui est un aller-retour réseau —
 * choix assumé, c'est le seul moyen de voir la bascule de `is_anonymous` après la
 * confirmation d'une adresse. Hors ligne, cet appel **ne lève pas** : il rend
 * `{ user: null, error }`, que l'ancienne signature ramenait à `null`, donc à « tout vit sur
 * cet appareil » plus un bouton « Rattacher un compte ». Quelqu'un qui a un compte depuis des
 * mois lisait qu'il n'en a pas, au seul écran du produit qui parle de son compte.
 *
 * D'où deux informations et non une : la session **et** le fait que la lecture ait abouti.
 * Sans session et sans échec, `local` reste juste (session anonyme sans adresse). Sans session
 * mais avec un échec, il n'y a rien à affirmer — et surtout rien à proposer.
 *
 * Le repli par `getSession()` (cache local) a été écarté : la session en cache peut encore
 * porter `is_anonymous: true` juste après la confirmation de l'adresse, donc elle peut servir à
 * affirmer `rattache`, jamais à affirmer `local`. Ne rien affirmer est plus simple et plus sûr.
 */
export function etatDuRattachement(lu: {
  /** `null` quand aucune session n'a pu être lue — ce qui ne dit pas encore pourquoi. */
  session: Pick<SessionCompte, 'isAnonymous' | 'email' | 'emailEnAttente'> | null;
  /** `true` quand l'appel a rendu une erreur : hors ligne, Supabase indisponible, jeton refusé. */
  lectureEnEchec: boolean;
}): EtatRattachement {
  const { session } = lu;

  // Une session lue prime sur l'échec : si les deux arrivent, c'est qu'on sait déjà.
  if (!session) return lu.lectureEnEchec ? { kind: 'indisponible' } : { kind: 'local' };

  // `is_anonymous` prime, même règle que pour la suppression : une adresse présente ne
  // signifie pas que le compte est rattaché.
  if (!session.isAnonymous) return { kind: 'rattache', email: session.email };

  // **L'adresse en attente vient de `emailEnAttente`, jamais d'`email`** — mesuré le 21/09/2026 :
  // sur une session anonyme, `updateUser({ email })` laisse `email` vide et ne remplit que
  // `new_email`. Cette ligne lisait `email`, donc `a_confirmer` n'était rendu pour **personne** :
  // l'écran « Toi » proposait de rattacher un compte à quelqu'un qui venait de taper son adresse,
  // c'est-à-dire exactement le défaut que cet état existe pour corriger (issue #62), et la porte
  // « Saisir le code » ajoutée le 20/09/2026 ne s'affichait jamais.
  //
  // `email` reste en repli, et il est sans risque : la branche `!isAnonymous` ci-dessus a déjà
  // attrapé tout compte confirmé, donc une adresse présente sur une session **anonyme** ne peut
  // vouloir dire qu'une chose — une confirmation en attente. Le repli couvre le jour où GoTrue
  // changerait d'avis sur le champ qu'il remplit, ce que rien ici ne pourrait voir autrement.
  const enAttente = session.emailEnAttente?.trim() || session.email?.trim();
  return enAttente ? { kind: 'a_confirmer', email: enAttente } : { kind: 'local' };
}

/**
 * **Ce qu'on perd sans compte, écrit une seule fois pour les deux écrans qui le disent.**
 *
 * Le fait vient de `purge_stale_anonymous_accounts` : les sessions anonymes sont fermées après
 * une fenêtre de 90 jours, comptée sur le **dernier signe de vie** et non sur la création. Deux
 * écrans doivent le dire, et ils ne le disaient pas tous les deux — arbitré le 21/09/2026
 * (`v1-28` §7.2) :
 *
 * - sous la sortie de `/connexion`, depuis C3.9 (constat A1-11), pour toutes les provenances ;
 * - sur « Toi » en état `local`, qui jusqu'ici disait l'**avantage** (« un compte le fait te
 *   suivre ailleurs ») et jamais l'**échéance**. Conséquence : la seule personne qui lisait le
 *   délai était celle qui envisageait déjà un compte. Celle que la purge efface pour de bon —
 *   qui n'a jamais ouvert `/connexion` — ne le lisait nulle part, et son bilan partait sans
 *   qu'un mot l'ait prévenue.
 *
 * **Le délai et les conditions vivent dans une constante, pas dans les deux phrases** — règle
 * §1.6 de `FRONT.md`, et la leçon de la puce « Cadence » en C2.8 : nommer un même fait à deux
 * endroits d'un produit est le plus sûr moyen de les voir un jour se contredire. Un test lit les
 * deux phrases et tombe si l'une cesse de porter la clause commune.
 *
 * Le texte de `/connexion` n'est **pas** retouché au passage : il a été arbitré, il est en
 * production, et la seule chose que ce chantier avait à faire était de le faire lire ailleurs.
 */
export const DELAI_SANS_COMPTE_EN_MOTS = 'trois mois';

/** Les deux façons de perdre un bilan sans compte. La clause partagée, mot pour mot. */
export const CONDITIONS_DE_PERTE_SANS_COMPTE = `si tu changes de téléphone ou si tu ne reviens pas pendant ${DELAI_SANS_COMPTE_EN_MOTS}`;

/** Sous la sortie de `/connexion` — texte inchangé depuis C3.9, la clause en moins. */
export const PHRASE_SANS_COMPTE_SOUS_LA_SORTIE = `Sur cet appareil seulement : ${CONDITIONS_DE_PERTE_SANS_COMPTE}, ton bilan ne te suivra pas.`;

/**
 * Sur « Toi » en état `local`. L'avantage d'abord, l'échéance ensuite : « il » reprend le bilan
 * nommé par la première phrase, ce qui évite de le répéter et garde la clause partagée
 * identique des deux côtés.
 */
export const PHRASE_SANS_COMPTE_SUR_TOI = `Ton bilan reste sur cet appareil. Un compte le fait te suivre ailleurs — ${CONDITIONS_DE_PERTE_SANS_COMPTE}, il ne te suivra pas.`;
