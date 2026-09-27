import { STATUT_DE_BILAN } from '@/types/bilan';
import { phraseDeLEngagementRecalcule, type EngagementEnCours } from '@/types/rebilan';

/**
 * Retirer un bilan qui ne ressemble à personne (C4.7, `docs/architecture/v1-22-retirer-un-bilan.md`).
 *
 * Tout ce que la restitution **dit** et **décide** autour du geste vit ici, hors de l'écran, pour
 * la raison de `FRONT.md` §1.1 : une phrase qui dépend d'un cas est une phrase qui peut être fausse
 * dans un autre, et elle ne s'éprouve que si elle a un nom. Trois situations, et la confirmation
 * n'a pas le droit de dire la même chose aux trois — ce que le retrait fait au plan dépend de la
 * place du bilan parmi ceux qui restent valides (`retirer_le_bilan`, migration `20260928090000`) :
 *
 *   - **`seul`** : c'est le seul bilan valide. Rien ne reste sur quoi bâtir un plan, et la personne
 *     repart d'un nouveau bilan (D3) — la confirmation ne parle donc **pas** de plan ;
 *   - **`dernier`** : c'est le plus récent, et il en reste d'autres. Le plan est reconstruit sur le
 *     précédent (D2) ;
 *   - **`ancien`** : un plus récent existe, et c'est lui qui porte le plan — qui ne bouge pas. Dire
 *     « ton plan va changer » serait faux.
 */
export type PlaceDuBilan = 'seul' | 'dernier' | 'ancien';

/**
 * La place d'un bilan parmi les bilans valides, **du plus récent au plus ancien**.
 *
 * `null` quand le bilan n'y figure pas — en cours, retiré, ou pas encore lu : la restitution ne rend
 * alors pas le lien, plutôt que de proposer une confirmation dont elle ne sait pas quelle phrase est
 * vraie (`FRONT.md` §1.2, « ce qu'on ne sait pas vaut `null`, et l'élément ne s'affiche pas »). Le
 * RPC refuserait de toute façon un bilan qui n'est pas complété.
 *
 * **Le paramètre est une liste d'identifiants ordonnée, et c'est son nom qui porte le contrat**
 * (`FRONT.md` §1.1) : l'ordre est celui de `generate_plan_cycle_for_user`, qui bâtit le plan sur le
 * dernier bilan valide par `submitted_at`. Une liste dans l'autre ordre ferait passer le plus ancien
 * pour celui qui porte le plan.
 */
export function placeDuBilan(
  id: string,
  bilansValidesDuPlusRecent: readonly string[]
): PlaceDuBilan | null {
  if (!bilansValidesDuPlusRecent.includes(id)) return null;
  if (bilansValidesDuPlusRecent.length === 1) return 'seul';
  return bilansValidesDuPlusRecent[0] === id ? 'dernier' : 'ancien';
}

/** Le lien, sur la restitution — le libellé décidé par D4 : ce que la personne pense, pas une destruction. */
export const LIEN_DU_RETRAIT = 'Ce bilan ne me ressemble pas';

/**
 * Ce que le lecteur d'écran ajoute au lien, sur natif (`accessibilityHint` n'existe pas sur web).
 * La forme de « Supprimer mon compte » : dire qu'une confirmation vient, avant que rien ne parte.
 */
export const INDICE_DU_RETRAIT = 'Demande une confirmation avant de retirer ce bilan';

export type ConfirmationDuRetrait = {
  titre: string;
  corps: string;
  confirmer: string;
  /**
   * Ce que le retrait fait à l'action engagée, ou `null` quand il n'y a rien à en dire — voir
   * `confirmationDuRetrait`.
   */
  engagement: string | null;
  /** Le libellé du bouton pendant l'appel — la forme de « Suppression… ». */
  enCours: string;
  annuler: string;
};

/**
 * La confirmation, selon la place du bilan.
 *
 * **Chaque corps est vrai dans tous les cas où il s'affiche, et seulement là** :
 *   - le suivi : `loadAssessmentHistory` ne lit que les bilans complétés, donc un bilan retiré n'y
 *     apparaît plus — vrai des trois côtés, d'où la phrase commune ;
 *   - le plan : reconstruit pour `dernier`, intact pour `ancien`, absent pour `seul` — trois phrases,
 *     et la troisième ne le nomme pas ;
 *   - la suite pour `seul` : la racine route vers l'onboarding, ou vers la reprise d'un questionnaire
 *     commencé — « tu repartiras d'un nouveau bilan » est vrai des deux, là où « tu reviendras à
 *     l'accueil » serait faux du second.
 *
 * **Et, dans le cas `dernier` seulement, le sort de l'action engagée** (décidé le 27/09/2026 par la
 * personne qui pilote) : le serveur la repose si le plan reconstruit la propose encore et l'archive
 * sinon. La phrase est **celle du re-bilan**, au conditionnel (`phraseDeLEngagementRecalcule`,
 * `src/types/rebilan.ts`), parce que c'est la même mécanique — `generate_plan_cycle_for_user` — et
 * la seule forme vraie des deux côtés. Ce n'est pas l'annonce écartée par D2, qui venait *après* le
 * geste : c'est dire *avant* un geste irréversible ce qu'il emporte. Rien pour `ancien`, dont le plan
 * ne bouge pas. Rien non plus pour `seul`, **et ce n'est plus parce que le retrait n'en décide
 * rien** : depuis la décision du 27/09/2026 (question 12a), retirer son seul bilan archive l'action
 * engagée (raison `retrait`). Le corps le dit sans la nommer — « tu repartiras d'un nouveau bilan » —
 * et la nommer en plus est une question de produit ouverte, pas un oubli. `engagement` est requis et
 * sans valeur par défaut : un appelant qui l'oublierait taierait la phrase en silence.
 *
 * Voix produit, jamais celle de Ramille : c'est la mécanique d'un geste qu'on explique, comme la
 * feuille du nouveau bilan (`FeuilleNouveauBilan`).
 */
export function confirmationDuRetrait(
  place: PlaceDuBilan,
  engagement: EngagementEnCours | null
): ConfirmationDuRetrait {
  const corps =
    place === 'seul'
      ? 'C’est ton seul bilan : il n’apparaîtra plus dans ton suivi, et tu repartiras d’un nouveau bilan.'
      : place === 'dernier'
        ? 'Il n’apparaîtra plus dans ton suivi, et ton plan repartira de ton bilan précédent.'
        : 'Il n’apparaîtra plus dans ton suivi. Ton plan ne change pas : il repose sur ton bilan le plus récent.';

  return {
    titre: 'Retirer ce bilan ?',
    corps,
    engagement: place === 'dernier' && engagement !== null ? phraseDeLEngagementRecalcule(engagement) : null,
    confirmer: 'Retirer ce bilan',
    enCours: 'Retrait…',
    annuler: 'Annuler',
  };
}

/**
 * Ce que la restitution fait du statut qu'elle lit avec le résultat.
 *
 * **La restitution est la seule lecture d'affichage qui ne filtre pas sur le statut** : elle lit un
 * bilan par son identifiant, c'est-à-dire par l'adresse qui circule — favori, lien du suivi, redirection
 * de `/bilan/resultat`. Les autres lectures d'affichage lisent `completed` et deviennent justes sans
 * qu'on y touche ; celle-ci doit reconnaître un bilan retiré et **ne pas afficher son chiffre** (D4).
 *
 * **« D'affichage », et le mot porte une exception à ne pas « corriger »** : `lireEtatDuCompte`
 * (`src/lib/compte.ts`) lit elle aussi les bilans sans filtre, et elle le doit — un bilan retiré reste
 * une donnée à supprimer, comme la page de confidentialité le promet. La filtrer ferait dire « rien à
 * supprimer » à une session anonyme qui ne porte qu'un bilan retiré.
 *
 * `illisible` pour tout le reste, statut absent compris : un bilan en cours n'a pas de résultat, donc
 * la branche n'est pas atteignable aujourd'hui, et une quatrième valeur de statut ne doit pas
 * s'afficher par défaut — un chiffre qu'on ne sait pas qualifier ne se montre pas.
 */
export type LectureDuStatut = 'afficher' | 'retire' | 'illisible';

export function lectureDuStatut(statut: string | null | undefined): LectureDuStatut {
  if (statut === STATUT_DE_BILAN.complete) return 'afficher';
  if (statut === STATUT_DE_BILAN.retire) return 'retire';
  return 'illisible';
}

/**
 * L'adresse d'un bilan retiré dit qu'il a été retiré (D4) — sans son chiffre, avec une sortie.
 *
 * Deux arrivées, un seul état : juste après le geste (la phrase confirme qu'il a eu lieu), et plus
 * tard, par un favori ou un lien. Le titre est au passif parce qu'il est vrai dans les deux ; le
 * corps dit ce qui a changé et pourquoi l'écran est vide. La sortie est celle de la restitution en
 * relecture, au même libellé.
 */
export const BILAN_RETIRE = {
  titre: 'Ce bilan a été retiré.',
  corps: 'Il n’apparaît plus dans ton suivi, et son chiffre ne s’affiche plus ici.',
  sortie: 'Revenir à mon suivi',
} as const;

/** Le retrait n'a pas abouti — la forme des autres échecs de cet écran (« La copie n'a pas abouti. »). */
export const RETRAIT_ECHOUE = 'Le retrait n’a pas abouti. Réessaie dans un instant.';

/**
 * **Le SQLSTATE que `retirer_le_bilan` lève sur un bilan en cours ou déjà retiré.** Reconnu au code et
 * jamais au message, comme `RM001` et `RM002` : le message est une phrase qu'une migration peut
 * reformuler.
 */
export const CODE_BILAN_NON_RETIRABLE = 'RM006';

/**
 * Ce que l'appel au RPC a donné.
 *
 *   - `retire` : c'est fait, et `restants` dit combien de bilans valides restent — `null` si la
 *     réponse n'est pas un entier positif ou nul, ce que le RPC ne rend jamais ;
 *   - `etat_change` : le serveur a refusé parce que le bilan n'est plus complété — un second appareil,
 *     un double appui. L'écran relit plutôt que de parler de réseau ;
 *   - `echec` : tout le reste — transport, session, bilan introuvable.
 */
export type IssueDuRetrait =
  | { genre: 'retire'; restants: number | null }
  | { genre: 'etat_change' }
  | { genre: 'echec' };

export function issueDuRetrait(reponse: {
  erreur: { code?: string | null } | null;
  donnees: unknown;
}): IssueDuRetrait {
  if (reponse.erreur?.code === CODE_BILAN_NON_RETIRABLE) return { genre: 'etat_change' };
  if (reponse.erreur) return { genre: 'echec' };
  const restants =
    typeof reponse.donnees === 'number' && Number.isInteger(reponse.donnees) && reponse.donnees >= 0
      ? reponse.donnees
      : null;
  return { genre: 'retire', restants };
}

/**
 * Où va l'écran une fois le bilan retiré.
 *
 *   - **`racine`** quand il ne reste aucun bilan valide (D3) : la racine ne trouve plus de bilan
 *     complété et route vers l'onboarding — ou vers la reprise d'un questionnaire commencé. C'est
 *     aussi là que l'appelant **efface la marque locale** `traceverte.a_un_bilan.v1` : sans ça, une
 *     réouverture hors ligne enverrait au plan (C4.5) ;
 *   - **`sur_place`** sinon : la restitution rend l'état « retiré », qui confirme le geste et mène au
 *     suivi.
 *
 * **Un nombre inconnu part à la racine**, et c'est le moins coûteux des deux paris : la racine relit
 * le serveur et route juste dans les deux cas, et la marque effacée à tort ne coûte qu'un onboarding
 * hors ligne — là où une marque laissée à tort promettrait un plan qui n'existe plus.
 */
export type ApresLeRetrait = 'racine' | 'sur_place';

export function apresLeRetrait(restants: number | null): ApresLeRetrait {
  return restants === null || restants === 0 ? 'racine' : 'sur_place';
}
