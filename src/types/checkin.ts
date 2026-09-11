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
// **Depuis C2.1, la question connaît l'action engagée**, et la composition est écrite deux fois de
// plus : `composerQuestionDuPoint` ici, `public.checkin_question` là-bas. Mais la carte ne compose
// presque jamais — elle lit `engagement_checkins.committed_question`, **figée à la génération**.
// C'est ce qui garantit qu'elle affiche mot pour mot ce que la notification a envoyé, même si la
// composition change de version entre les deux. La fonction de composition reste nécessaire pour
// deux raisons : les points générés avant C2.1 n'ont pas de question figée, et c'est elle qui rend
// la paire SQL/TypeScript **testable** — sans jumelle, la composition SQL pourrait dériver sans que
// rien ne tombe.

import { RAMILLE } from '@/constants/mascotte';
import { formeInserable } from '@/constants/postes';

/**
 * Le genre de question posée, miroir de `engagement_checkins.question_kind` (C2.1).
 *
 * Quatre valeurs, et un ordre de priorité que le générateur applique et qu'un test épingle des
 * deux côtés : **`maintien` gagne sur tout**, puis `engagement` / `occasion` quand une action est
 * engagée sur le poste interrogé, puis `generique` en repli. `generique` est l'ancien
 * `changement`, renommé par la migration : « générique » dit ce qu'il est, « changement »
 * décrivait le verbe de sa phrase.
 */
export type GenreDeQuestion = 'engagement' | 'generique' | 'maintien' | 'occasion';

/** Ce qu'il faut d'un point pour en composer la question. Un sous-ensemble de la ligne en base. */
export type PointInterrogeable = {
  loop_type: 'commute' | 'extras';
  /** `commute` | `leisure` | `travel`, snapshoté à la génération (C2.6). */
  poste: string | null;
  /** `generique` par défaut en base ; une ligne d'avant C2.5 n'en porte pas d'autre. */
  question_kind: string | null;
  /** Le mode snapshoté du poste interrogé. Ne remplit que la question de maintien. */
  mode: string | null;
  /** Date ISO (`YYYY-MM-DD`) du début de la période **écoulée** qu'on interroge (C2.3). */
  period_start: string;
  /**
   * La question **figée** à la génération (C2.1), telle que le rappel l'a envoyée. Nulle sur les
   * points générés avant cette migration, où la composition reprend le relais.
   */
  committed_question?: string | null;
  /** Le gabarit de l'action engagée, pour composer. La carte ne le lit pas : elle a la question. */
  question_template?: string | null;
  /** Les jours d'intention figés, qui remplissent `{jours}`. */
  committed_intention_days?: number[] | null;
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
 * Les sept jours — **jumelle de la liste de `public.jours_francais(smallint[])`**.
 *
 * Troisième liste de mots français écrite deux fois, après les mois et le complément de maintien,
 * et pour la même raison : le rappel nomme les jours sans le client.
 */
export const JOURS_FRANCAIS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;

/**
 * Les jours d'intention nommés **pour une question** — jumelle de `public.jours_francais`.
 *
 * **« ou » et non « et », et une seule majuscule.** La question demande si le geste a eu lieu *l'un*
 * de ces jours ; `formatIntentionDays` (`src/types/plan.ts`) dit « le mardi et le jeudi » parce
 * qu'elle rappelle un engagement. Les deux formes coexistent à dessein et ne doivent pas être
 * fusionnées : « Le mardi et le jeudi, as-tu fait ce trajet à vélo ? » demande si les deux ont eu
 * lieu, ce qui n'est pas la question.
 *
 * Sept jours se disent « Tous les jours » plutôt que de les énumérer : la phrase tiendrait sur
 * trois lignes dans une notification.
 */
export function joursDeLaQuestion(jours: number[] | null | undefined): string | null {
  if (!jours) return null;

  const distincts = [...new Set(jours)].filter((j) => j >= 1 && j <= 7).sort((a, b) => a - b);
  if (distincts.length === 0) return null;
  if (distincts.length === 7) return 'Tous les jours';

  const liste = distincts.map((j) => JOURS_FRANCAIS[j - 1]).join(' ou ');
  return liste.charAt(0).toUpperCase() + liste.slice(1);
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
 * La composition de la question — **jumelle de `public.checkin_question(...)`**, à toucher avec
 * elle, et épinglée des deux côtés sur la même table de cas.
 *
 * Quatre formes, dans cet ordre de priorité :
 *
 *   1. `maintien` — « La semaine dernière, ton trajet s’est-il fait à vélo ? ». Affirmative : elle
 *      demande si l'habitude a tenu, pas si quelque chose a changé. **Elle gagne sur l'engagement**,
 *      parce que demander à quelqu'un qui va déjà au travail à vélo s'il a tenu son engagement de
 *      faire un trajet à vélo serait poser deux fois la même question (C2.5).
 *   2. `engagement` — le gabarit de l'action, les jours nommés : « Mardi ou jeudi, as-tu fait ce
 *      trajet à vélo ? ». C'est le « si-alors » de l'engagement, enfin refermé (C2.1).
 *   3. `occasion` — le gabarit aussi, mais la boucle est mensuelle : il n'y a pas de jour de la
 *      semaine à nommer, l'intention étant une échéance fermée. « En septembre, as-tu eu un
 *      déplacement où tu as choisi autre chose que l'avion ? »
 *   4. `generique` — aucune action engagée. Le poste par sa **forme insérable** et non par
 *      `trip_label`, qui porte le mode entre parenthèses (C2.6).
 *
 * Un genre `engagement` ou `occasion` **sans gabarit** retombe sur le générique : une phrase qui
 * afficherait `{jours}` tel quel serait pire que vague. Le cas ne devrait pas arriver — un test
 * pgTAP interdit un gabarit sans `question_template` — mais il ne doit pas s'afficher.
 */
export function composerQuestionDuPoint(point: PointInterrogeable): string {
  const ouverture = ouvertureDeLaPeriode(point);

  if (point.question_kind === 'maintien') {
    return `${ouverture}, ton trajet s’est-il fait ${complementDeMaintien(point.mode)} ?`;
  }

  const gabarit = point.question_template;
  if ((point.question_kind === 'engagement' || point.question_kind === 'occasion') && gabarit) {
    const mois = moisFrancais(point.period_start) ?? 'ce mois';
    const jours = joursDeLaQuestion(point.committed_intention_days) ?? 'Cette semaine';
    return gabarit.replace('{mois}', mois).replace('{jours}', jours);
  }

  return `${ouverture}, as-tu changé de mode de transport pour ${formeInserable(
    point.poste,
    point.loop_type
  )} ?`;
}

/**
 * La question du point, telle que la carte l'affiche — **et telle que le rappel l'a envoyée**.
 *
 * **La question figée gagne toujours.** `committed_question` est posée à la génération, dans la même
 * transaction que le point et que la ligne d'envoi : l'afficher plutôt que de la recomposer est la
 * seule façon de garantir que la carte dit mot pour mot ce que la notification a dit, y compris si
 * la composition change de version entre les deux — et c'est le cas que C2.1 a justement créé en
 * figeant l'action engagée. La recomposition ne sert qu'aux points générés avant cette migration.
 *
 * `trim()` et non une simple vérité : une chaîne vide en base doit se comporter comme une absence,
 * pas comme une question vide affichée à la place de la vraie.
 */
export function questionDuPoint(point: PointInterrogeable): string {
  const figee = point.committed_question?.trim();
  return figee ? figee : composerQuestionDuPoint(point);
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
