/**
 * Répondre au point depuis l'e-mail — étape 6b de `docs/architecture/v1-35-l-audit-en-chantiers.md`
 * (24/10/2026), dérivations pures. Testé : `src/types/reponse-par-le-lien.test.ts`.
 *
 * **Tout tient dans le jeton**, comme pour `/rappels/stop` (`src/types/desinscription.ts`) : la personne
 * qui clique dans l'e-mail n'a peut-être pas de session sur cet appareil, ni l'app. Le jeton du message
 * autorise à lire la question de ce point, sa réponse, et à y répondre, tant que sa période court ; ensuite,
 * la question seule. Rien d'autre.
 *
 * **La page demande le geste.** L'e-mail porte trois liens (« Oui », « Non », la troisième réponse), et
 * l'analyseur de liens d'une messagerie les ouvre tous pour les inspecter : une réponse écrite à
 * l'ouverture serait celle d'un robot, et la dernière ouverte l'emporterait. La page lit le point —
 * une lecture, sans effet —, montre la réponse choisie, et n'écrit qu'au toucher d'« Envoyer ma réponse ».
 */

import type { LoopType } from '@/constants/postes';
import { genreDeReponse, type ReponseDuPoint } from '@/types/checkin';
import { jetonDuLien } from '@/types/desinscription';
import type { GenreDEchec } from '@/types/lecture-en-echec';

/**
 * Le point tel que `le_point_du_lien` le rend : ce que le message a posé, et son état. Rien n'y désigne
 * le compte, ni le point lui-même — la page n'en a pas besoin, elle répond par le jeton.
 *
 * **`ouvert` vient du serveur, et lui seul décide** : le point accepte-t-il encore une réponse — en attente,
 * ou répondu tant que sa période est celle qu'on interroge (`debut_de_la_periode_interrogee`, la borne de
 * l'écrivain). Fermé, la lecture ne rend plus que la question : l'état, la réponse, son heure, ses kilos et
 * la boucle arrivent nuls (contre-lecture du 24/10/2026 : un e-mail gardé six mois, ou transféré, ne doit
 * pas dire ce qui a été répondu). La page n'a donc pas de borne à elle — elle ne pouvait que diverger de
 * celle du serveur, sur une horloge de téléphone décalée.
 */
export type PointDuLien = {
  loop_type: LoopType;
  poste: string | null;
  question_kind: string | null;
  mode: string | null;
  period_start: string;
  period_label: string;
  trip_label: string;
  /** La question du message, figée à la génération (ou recomposée par le serveur pour un point d'avant C2.1). */
  question: string;
  ouvert: boolean;
  /** Les cinq suivants ne viennent que d'un point `ouvert`, et sont nuls sinon. */
  status: string | null;
  response_kind: string | null;
  responded_at: string | null;
  committed_saving_kg_once: number | null;
  /** La boucle de ce point tourne-t-elle encore ? Sinon, ni la réplique ni le pied ne donnent rendez-vous. */
  boucle_tourne: boolean;
};

/**
 * La lecture, en séparant « aucun point pour ce jeton » d'une panne. Un jeton inconnu est une réponse du
 * serveur (`point: null`) ; une panne n'en est pas une, et ne doit jamais se dire « lien plus valable » —
 * la personne croirait son lien perdu et ne réessaierait pas (`FRONT.md` §1.2).
 */
export type LectureDuPoint = { ok: true; point: PointDuLien | null } | { ok: false; genre: GenreDEchec };

/** Les cinq états de la page. */
export type EtatDeLaPageDuPoint = 'chargement' | 'lien-invalide' | 'panne' | 'clos' | 'ouvert';

/**
 * La réponse choisie dans l'e-mail (`?reponse=oui`), ou `null` si le lien n'en porte pas une des trois —
 * la page propose alors les trois réponses, comme la carte. Un paramètre doublé prend le premier, la règle
 * de `jetonDuLien`.
 */
export function reponseDuLien(valeur: string | string[] | undefined): ReponseDuPoint | null {
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;
  return genreDeReponse(brut?.trim());
}

/**
 * L'état affiché, de l'ouverture à la lecture.
 *
 * **Avant d'être prête, la page charge** — hydratée et le jeton cherché, la règle de `/rappels/stop`
 * (`etatDeLaPage`) : l'export statique ne connaît pas la chaîne de requête, et un état déduit du jeton au
 * premier rendu dirait « plus valable » à tout le monde le temps que l'app démarre. Prête et sans jeton,
 * le lien n'est plus valable ; avec, on attend la lecture.
 */
export function etatDeLaPageDuPoint(entree: {
  pret: boolean;
  jeton: string | null;
  lecture: LectureDuPoint | null;
}): EtatDeLaPageDuPoint {
  if (!entree.pret) return 'chargement';
  if (entree.jeton === null) return 'lien-invalide';
  if (entree.lecture === null) return 'chargement';
  if (!entree.lecture.ok) return 'panne';
  if (entree.lecture.point === null) return 'lien-invalide';
  return entree.lecture.point.ouvert ? 'ouvert' : 'clos';
}

/**
 * Le jeton que la page retient : celui du lien ; **sans paramètre `jeton` dans l'adresse**, celui que
 * l'onglet a gardé — un rechargement, une fois le jeton retiré de l'adresse.
 *
 * **Plus étroit que `jetonARetenir` de `/rappels/stop`**, qui retombe sur le jeton gardé aussi quand celui
 * du lien est abîmé : là, tous les jetons coupent les mêmes rappels ; ici, chacun désigne une question.
 * Un lien abîmé ouvert dans un onglet qui garde le jeton d'un autre e-mail lirait l'autre point, et lui
 * appliquerait la réponse du lien touché (contre-lecture du 24/10/2026). Abîmé, il dit donc « plus valable ».
 */
export function jetonDuPoint(
  parametre: string | string[] | undefined,
  duLien: string | null,
  garde: string | null
): string | null {
  if (parametre !== undefined) return duLien;
  return jetonDuLien(garde ?? undefined);
}

/**
 * La phrase d'une lecture en échec. La connexion n'est nommée que hors ligne (02/10/2026,
 * `src/types/ecriture-en-echec.ts`) : sur une erreur du serveur, « vérifie ta connexion » enverrait vers un
 * geste qui ne peut rien changer.
 */
export function phraseDeLaLectureDuPoint(genre: GenreDEchec): string {
  return genre === 'horsLigne'
    ? 'Ta question n’a pas pu s’afficher. Vérifie ta connexion et réessaie.'
    : 'Ta question n’a pas pu s’afficher. Réessaie dans un instant.';
}
