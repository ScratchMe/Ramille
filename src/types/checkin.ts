// Logique pure du point de suivi : la question qu'il pose, et la réplique que sa réponse reçoit.
//
// Séparée des requêtes comme `src/types/bilan.ts`, `src/types/suivi.ts` et `src/types/saison.ts` :
// ce module est importé par un test, il ne doit tirer ni `react-native` ni `@/lib/supabase`.
//
// ## Pourquoi ce module existe, et ce qu'il rassemble
//
// La question d'un point est **écrite deux fois**, par nécessité : le rappel part sans que le
// client soit là (`enqueue_checkin_reminders`, en SQL), et la carte du plan la repose quand il est
// là. Jusqu'ici les deux phrases divergeaient — la notification disait « La semaine dernière, as-tu
// changé de mode de transport pour ton trajet domicile-travail ? » et la carte, au présent, « As-tu
// changé de mode de transport au moins une fois cette semaine pour Trajet domicile-travail (Voiture
// thermique) ? ». Sur un produit dont la boucle entière consiste à appuyer sur une notification
// pour répondre à une question, ce n'est pas un détail de formulation : c'est la même question qui
// ne se reconnaît pas d'un écran à l'autre.
//
// Ce module est donc le côté client de la paire, au même titre que `src/types/rappels.ts` l'est de
// `reminder_channel_for` et `src/constants/postes.ts` de `poste_inserable` : **les deux moitiés se
// touchent ensemble**, et deux fichiers de tests jumeaux (`checkin.test.ts` ici,
// `20_qui_recoit_quelle_boucle.test.sql` là-bas) existent pour que la divergence tombe.
//
// **Ce module ne porte pas encore la structure complète de la question** (l'action engagée et ses
// jours, la troisième réponse, le pied de carte) : c'est le chantier C2.1, qui étendra ces deux
// fonctions plutôt que d'en ouvrir un troisième endroit.

import { RAMILLE } from '@/constants/mascotte';
import { formeInserable } from '@/constants/postes';

/** Le genre de question posée, miroir de `engagement_checkins.question_kind`. */
export type GenreDeQuestion = 'changement' | 'maintien';

/** Ce qu'il faut d'un point pour en composer la question. Un sous-ensemble de la ligne en base. */
export type PointInterrogeable = {
  loop_type: 'commute' | 'extras';
  /** `commute` | `leisure` | `travel`, snapshoté à la génération (C2.6). */
  poste: string | null;
  /** `changement` par défaut en base : une ligne générée avant C2.5 n'en porte pas d'autre. */
  question_kind: string | null;
  /** Le mode snapshoté du poste interrogé. Ne remplit que la question de maintien. */
  mode: string | null;
  /** Date ISO (`YYYY-MM-DD`) du début de la période **écoulée** qu'on interroge (C2.3). */
  period_start: string;
};

/**
 * Les douze mois en français — **jumelle de `public.mois_francais(date)`**, à toucher avec elle.
 *
 * Deux fois la même liste, et c'est assumé pour la même raison que le reste de ce module : le
 * rappel nomme le mois sans le client, la carte le nomme avec. Les deux copies sont épinglées
 * chacune de son côté.
 *
 * **`toLocaleDateString('fr-FR', { month: 'long' })` a été écarté** malgré l'absence de liste
 * qu'il aurait permise : Hermes peut être construit sans données ICU complètes, et il rend alors
 * un mois en anglais ou un numéro. Le défaut serait invisible en CI (Node porte l'ICU complet) et
 * visible seulement sur l'appareil, dans la seule phrase qui doit correspondre mot pour mot à la
 * notification que la personne vient d'ouvrir. `formatDate` du suivi prend ce risque pour une
 * date d'affichage ; la question du point ne le prend pas.
 */
export const MOIS_FRANCAIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/**
 * Le nom du mois d'une date ISO, lu sur ses caractères et non sur un `Date`.
 *
 * `new Date('2026-09-01')` est minuit **UTC** : à l'ouest de Greenwich, son mois local est août.
 * Le point du 1er septembre parlerait alors d'août à une partie des lecteurs, ce qu'aucun test
 * tournant en UTC ne verrait. `period_start` arrive de Postgres en `YYYY-MM-DD` : on lit les
 * deux chiffres du mois, sans jamais construire de date.
 */
export function moisFrancais(periodStartIso: string): string | null {
  const mois = Number(periodStartIso.slice(5, 7));
  return MOIS_FRANCAIS[mois - 1] ?? null;
}

/**
 * Le complément de la question de maintien — **jumelle de `public.complement_de_maintien(text)`**.
 *
 * Trois modes et non deux : la catégorie `velo_marche` compte `velo`, `marche` et `trottinette`
 * en base (relevé le 11/09/2026). Un repli sur le vélo demanderait « ton trajet s'est-il fait à
 * vélo ? » à quelqu'un qui n'en a pas.
 *
 * `autrement` ferme la liste plutôt que de laisser la phrase tronquée : un mode hors catégorie ne
 * devrait jamais arriver ici — le générateur ne pose `question_kind = 'maintien'` que sur cette
 * catégorie — mais une phrase sans complément serait pire qu'une phrase vague.
 */
export const COMPLEMENT_DE_MAINTIEN: Record<string, string> = {
  velo: 'à vélo',
  marche: 'à pied',
  trottinette: 'en trottinette',
};

export function complementDeMaintien(mode: string | null | undefined): string {
  if (!mode) return 'autrement';
  return COMPLEMENT_DE_MAINTIEN[mode] ?? 'autrement';
}

/**
 * L'ouverture de la question : la **période écoulée**, jamais celle qui commence (C2.3).
 *
 * Le mois est nommé à partir de `period_start`, donc du mois réellement interrogé — jamais de
 * l'horloge, qui dirait le mois courant sur un point ouvert avec un jour de retard. Un
 * `period_start` illisible retombe sur « le mois dernier » : moins précis, jamais faux.
 */
function ouvertureDeLaPeriode(point: PointInterrogeable): string {
  if (point.loop_type === 'commute') return 'La semaine dernière';
  const mois = moisFrancais(point.period_start);
  return mois === null ? 'Le mois dernier' : `En ${mois}`;
}

/**
 * La question du point, telle que la carte l'affiche — **et telle que le rappel l'a envoyée**.
 *
 * Deux formes, décidées par `question_kind` :
 *
 *   * `changement` — « La semaine dernière, as-tu changé de mode de transport pour ton trajet
 *     domicile-travail ? ». Le poste est nommé par sa **forme insérable** et non par `trip_label`,
 *     qui porte le mode entre parenthèses : « … pour Trajet domicile-travail (Voiture thermique) ? »
 *     est une phrase que personne n'a écrite (C2.6).
 *   * `maintien` — « La semaine dernière, ton trajet s'est-il fait à vélo ? ». Affirmative : elle
 *     demande si l'habitude a tenu, pas si quelque chose a changé. La poser sous l'autre forme à
 *     quelqu'un qui va déjà au travail à vélo n'a qu'une réponse honnête (C2.5).
 *
 * « au moins une fois » a disparu de la première forme : la question porte déjà sur une période
 * fermée, et la précision alourdissait une phrase que la notification doit tenir en deux lignes.
 */
export function questionDuPoint(point: PointInterrogeable): string {
  const ouverture = ouvertureDeLaPeriode(point);

  if (point.question_kind === 'maintien') {
    return `${ouverture}, ton trajet s’est-il fait ${complementDeMaintien(point.mode)} ?`;
  }

  return `${ouverture}, as-tu changé de mode de transport pour ${formeInserable(
    point.poste,
    point.loop_type
  )} ?`;
}

/**
 * Ce que Ramille répond, et avec quel visage.
 *
 * **La seule règle non négociable : un point de maintien ne reçoit jamais `checkinNon`.** Cette
 * réplique console d'un échec ; sur un trajet déjà fait à vélo il n'y a pas d'échec à consoler, et
 * la recevoir chaque semaine est le défaut que C2.5 retire. D'où `maintienNon`, en visage `calm` —
 * ni félicitation, ni encouragement : un accusé de réception.
 *
 * Le « Oui » est le même des deux côtés : avoir tenu son habitude et avoir changé de mode valent
 * tous les deux `checkinOui`.
 */
export function repliqueDuPoint(
  point: Pick<PointInterrogeable, 'question_kind' | 'mode'>,
  reponse: boolean
): { ligne: string; mood: 'happy' | 'encouraging' | 'calm' } {
  if (reponse) return { ligne: RAMILLE.checkinOui, mood: 'happy' };

  if (point.question_kind === 'maintien') {
    const variante = point.mode ?? '';
    const ligne =
      variante === 'velo' || variante === 'marche' || variante === 'trottinette'
        ? RAMILLE.maintienNon[variante]
        : RAMILLE.maintienNon.autre;
    return { ligne, mood: 'calm' };
  }

  return { ligne: RAMILLE.checkinNon, mood: 'encouraging' };
}
