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

/**
 * Les trois réponses possibles à un point — miroir de `engagement_checkins.response_kind` (C2.4).
 *
 * `sans_objet` n'est pas un « non » déguisé : une semaine de congés ou un mois sans voyage n'ont
 * pas de réponse honnête entre oui et non, et pour un profil « deux vols par an » dix mois sur
 * douze deviendraient une suite de « Non ». La colonne booléenne `response` reste en base, dérivée
 * de celle-ci (`true` / `false` / `null`), mais c'est ce genre qui est la vérité — et le filtre
 * d'une lecture est toujours `status = 'answered'`, jamais `response is not null`.
 */
export type ReponseDuPoint = 'oui' | 'non' | 'sans_objet';

/**
 * La réponse lue en base, ou `null` si la colonne ne porte rien d'exploitable.
 *
 * `response_kind` arrive typée `string | null` des types générés : la restreindre ici évite que
 * chaque écran refasse le même `as`. Une valeur inattendue rend `null` plutôt que de traverser —
 * la carte affichera la question, ce qui est le comportement d'un point non répondu.
 */
export function genreDeReponse(valeur: string | null | undefined): ReponseDuPoint | null {
  return valeur === 'oui' || valeur === 'non' || valeur === 'sans_objet' ? valeur : null;
}

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
  /**
   * **Ces deux champs n'arrivent jamais d'une ligne lue par la carte, et c'est structurel** : le
   * gabarit vit sur `action_templates` et non sur le point, donc aucune requête de l'app ne peut le
   * remplir. Ils existent pour que `composerQuestionDuPoint` soit la jumelle **éprouvable** de
   * `public.checkin_question` — sans eux, la composition SQL pourrait dériver sans que rien ne
   * tombe. Le seul chemin client qui compose est celui d'un point généré **avant** C2.1, qui ne
   * porte ni gabarit ni jours : il retombe donc toujours sur la question générique, ce qui est
   * précisément le libellé sous lequel ce point-là a été envoyé.
   */
  question_template?: string | null;
  committed_intention_days?: number[] | null;
};

/**
 * Les trois statuts d'un point, **miroir du `check` de `engagement_checkins.status`**
 * (`20260904180000_checkin_expiry_and_plan_refresh.sql` : `in ('pending', 'answered', 'expired')`).
 *
 * Même raison que `STATUT_DE_BILAN` : la colonne est un `text`, le typecheck ne distingue pas
 * `'answered'` d'`'answerd'`, et un filtre faux ne se voit qu'à la recette. `repondu` est le seul
 * filtre honnête d'une lecture de réponses (C2.4 : jamais `response is not null`), `clos` est ce
 * que les générateurs posent sur une période révolue, et le client n'écrit aucun des trois —
 * `repondre_au_checkin` est le seul écrivain.
 */
export const STATUT_DU_POINT = { enAttente: 'pending', repondu: 'answered', clos: 'expired' } as const;
export type StatutDuPoint = (typeof STATUT_DU_POINT)[keyof typeof STATUT_DU_POINT];

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
    // **Le repli lit `ouverture`, et non un second littéral.** Il disait « Cette semaine », donc la
    // semaine qui commence — celle dont le point ne demande rien (C2.3) — pendant que la branche
    // générique de la même fonction disait « La semaine dernière ». Deux littéraux à tenir d'accord
    // en étaient un de trop ; la valeur est maintenant celle que la fonction vient de calculer, et
    // les deux branches ne peuvent plus divergent. Corrigé des deux côtés de la paire le 13/09/2026
    // (`20260913100000_corrections_vague_5.sql`).
    const jours = joursDeLaQuestion(point.committed_intention_days) ?? ouverture;
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
  point: Pick<PointInterrogeable, 'question_kind' | 'mode' | 'poste' | 'loop_type' | 'period_start'>,
  reponse: ReponseDuPoint
): { ligne: string; mood: 'happy' | 'encouraging' | 'calm' } {
  const cadence = point.loop_type === 'commute' ? 'hebdo' : 'mensuel';

  if (reponse === 'oui') {
    return {
      ligne: variantePourLaPeriode(RAMILLE.checkinOui[cadence], point.period_start),
      mood: 'happy',
    };
  }

  // **`sans_objet` passe avant le maintien, et ce n'est pas un détail d'ordre** : « pas de trajet
  // cette semaine » n'est pas un manquement à l'habitude, c'est l'absence de l'occasion de
  // l'exercer. `maintienNon` (« Le vélo reste ton trajet ») commenterait une habitude dont la
  // personne vient justement de dire qu'elle n'a pas eu lieu.
  if (reponse === 'sans_objet') {
    return {
      ligne: variantePourLaPeriode(
        RAMILLE.checkinSansObjet[cleDuSansObjet(point)],
        point.period_start
      ),
      mood: 'calm',
    };
  }

  if (point.question_kind === 'maintien') {
    const variante = point.mode ?? '';
    const ligne =
      variante === 'velo' || variante === 'marche' || variante === 'trottinette'
        ? RAMILLE.maintienNon[variante]
        : RAMILLE.maintienNon.autre;
    return { ligne, mood: 'calm' };
  }

  return {
    ligne: variantePourLaPeriode(RAMILLE.checkinNon[cadence], point.period_start),
    mood: 'encouraging',
  };
}

/**
 * **La variante d'une réplique pour une période donnée** (C2.12, décision D12 du 10/09/2026).
 *
 * Déterministe, dérivée de `period_start` : la même période rend la même phrase à chaque rendu, sur
 * tous les appareils, et après un rechargement. Un tirage aléatoire ferait changer la réplique sous
 * les yeux de la personne — `useRafraichirAuRetour` relit l'écran à chaque retour au premier plan,
 * donc plusieurs fois par période.
 *
 * Le hachage est un FNV-1a 32 bits, choisi pour une raison précise : deux périodes voisines ne
 * diffèrent que de sept jours ou d'un mois, donc une somme de codes de caractères donnerait des
 * indices corrélés — la même variante plusieurs semaines d'affilée, ou un cycle régulier qu'on
 * remarque. FNV disperse des entrées proches.
 *
 * `>>> 0` après chaque tour : sans lui, la multiplication sort de l'entier exact des `number`
 * JavaScript et le résultat cesse d'être reproductible d'un moteur à l'autre — Hermes et V8 ne
 * donneraient pas la même phrase pour la même semaine.
 */
export function variantePourLaPeriode(variantes: readonly string[], periodStart: string): string {
  if (variantes.length === 0) {
    throw new Error('variantePourLaPeriode : aucune variante à choisir.');
  }

  let h = 0x811c9dc5;
  for (let i = 0; i < periodStart.length; i += 1) {
    h ^= periodStart.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }

  return variantes[h % variantes.length] as string;
}

/**
 * Laquelle des quatre répliques de « pas de trajet » — indexée sur le **poste**, pas sur la boucle.
 *
 * La boucle mensuelle couvre deux postes depuis C2.6 (les voyages et les sorties du week-end) :
 * répondre « Pas de voyage, pas de question. » à quelqu'un qui vient d'appuyer sur « Pas de sortie
 * en septembre » serait la fausseté lisible que ce chantier-là a retirée ailleurs. `autre` ferme la
 * liste pour un point généré avant C2.6, qui ne porte pas de poste.
 */
function cleDuSansObjet(
  point: Pick<PointInterrogeable, 'poste' | 'loop_type'>
): keyof typeof RAMILLE.checkinSansObjet {
  if (point.loop_type === 'commute') return 'commute';
  if (point.poste === 'leisure') return 'leisure';
  if (point.poste === 'travel') return 'travel';
  return 'autre';
}

/**
 * Le libellé du troisième choix, sous les deux boutons : « Pas de trajet cette semaine » / « Pas de
 * voyage en septembre » (v1-14 §3.2).
 *
 * Le mois est celui de la période **interrogée** et vient de `period_start`, comme la question
 * elle-même (C2.3) : lu sur l'horloge, il dirait le mois courant sur un point ouvert avec un jour
 * de retard, donc un mois différent de celui de la question juste au-dessus.
 */
export function libelleSansObjet(point: Pick<PointInterrogeable, 'loop_type' | 'poste' | 'period_start'>): string {
  // **« la semaine dernière » et non « cette semaine »**, écart au canvas consigné en `v1-14` §10 :
  // le point interroge la période **écoulée** (C2.3), et la question juste au-dessus du bouton ouvre
  // sur « La semaine dernière ». Le canvas écrit « Pas de trajet cette semaine » — il a été rédigé
  // avant que la période interrogée ne recule d'une semaine, et sa moitié mensuelle nomme déjà le
  // mois **écoulé** (« Pas de voyage en septembre »). Les deux moitiés d'une même ligne ne
  // désignaient donc pas la même chose.
  if (point.loop_type === 'commute') return 'Pas de trajet la semaine dernière';

  const mois = moisFrancais(point.period_start);
  const quand = mois === null ? 'ce mois-ci' : `en ${mois}`;
  if (point.poste === 'leisure') return `Pas de sortie ${quand}`;
  if (point.poste === 'travel') return `Pas de voyage ${quand}`;
  return `Pas de déplacement ${quand}`;
}

/**
 * Le début de la période que le serveur interroge **en ce moment** — jumelle de
 * `date_trunc('week', now())::date - 7` et de `(date_trunc('month', now()) - interval '1 month')`.
 *
 * **Elle se calcule en UTC, et c'est la différence avec `saisonDe`.** Les deux générateurs
 * (`generate_commute_checkins`, `generate_extras_checkins`) posent `period_start` depuis `now()`
 * dans le fuseau du serveur, qui est UTC (relevé le 11/09/2026). Une borne calculée en heure locale
 * divergerait d'une période entre minuit et 6 h UTC le lundi : la carte d'un point bel et bien
 * courant serait jugée périmée et disparaîtrait de l'écran, juste avant que le cron ne produise la
 * suivante. `saisonDe` fait l'inverse — elle nomme une saison pour un humain et suit donc son
 * calendrier local — et les deux ne doivent pas être alignées l'une sur l'autre.
 *
 * Sert à borner l'affichage de la carte répondue (C2.4) : elle reste le temps de la période, et pas
 * au-delà — sinon un compte dont la boucle a cessé d'être générée garderait à l'écran, pour
 * toujours, un « Répondu lundi » et la promesse d'un point qui ne viendra pas.
 */
export function debutDePeriodeInterrogee(
  loopType: 'commute' | 'extras',
  maintenant: Date = new Date()
): string {
  if (loopType === 'commute') {
    // `getUTCDay()` rend 0 pour dimanche : le décalage ramène lundi à 0, comme l'ISO.
    const reculJusquAuLundi = (maintenant.getUTCDay() + 6) % 7;
    return isoUtc(
      new Date(
        Date.UTC(
          maintenant.getUTCFullYear(),
          maintenant.getUTCMonth(),
          maintenant.getUTCDate() - reculJusquAuLundi - 7
        )
      )
    );
  }

  return isoUtc(new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 1, 1)));
}

/**
 * Ce point porte-t-il encore la période courante ? `>=` et non `=` : un point en avance (horloge
 * serveur décalée, génération manuelle) reste affiché plutôt que de disparaître sans raison.
 */
export function estDeLaPeriodeCourante(
  point: Pick<PointInterrogeable, 'loop_type' | 'period_start'>,
  maintenant: Date = new Date()
): boolean {
  return point.period_start.slice(0, 10) >= debutDePeriodeInterrogee(point.loop_type, maintenant);
}

/**
 * La période qui précède celle-ci pour la boucle donnée — **jumelle de
 * `public.periode_precedente(text, date)`**, à toucher avec elle.
 *
 * **La période se calcule, elle ne se lit pas dans l'ordre des lignes.** C'est tout le sujet de
 * C2.10 : la requête d'origine (`v1-02` §4) prenait les deux dernières lignes de la boucle, ce qui
 * était juste avant que les périodes révolues ne soient closes en `expired` et gardées en base.
 * Depuis, « les deux dernières lignes » peut recouvrir deux périodes qui ne se suivent pas —
 * quelqu'un qui répond en janvier, laisse passer février et mars, puis répond en avril aurait une
 * série de deux.
 *
 * Les deux cadences n'ont pas la même forme, et c'est voulu : sept jours avant un lundi est un
 * lundi, tandis que le mois est **ramené au premier** plutôt que décalé — garder le jour du mois
 * n'aurait pas de sens pour une période mensuelle, et divergerait de la jumelle SQL sur les fins de
 * mois (PostgreSQL ramène le 31 mars au 28 février, `Date.UTC` le pousse au 3 mars).
 *
 * Comme `debutDePeriodeInterrogee`, elle lit l'**UTC** : c'est la même arithmétique que celle du
 * serveur, pas une date affichée à quelqu'un.
 */
export function periodePrecedente(loopType: 'commute' | 'extras', periodStartIso: string): string {
  const an = Number(periodStartIso.slice(0, 4));
  const mois = Number(periodStartIso.slice(5, 7));
  const jour = Number(periodStartIso.slice(8, 10));

  if (loopType === 'commute') {
    return isoUtc(new Date(Date.UTC(an, mois - 1, jour - 7)));
  }
  return isoUtc(new Date(Date.UTC(an, mois - 2, 1)));
}

/** `YYYY-MM-DD` d'une date, lue en UTC — l'envers d'`isoJour` de `src/types/saison.ts`, qui lit local. */
function isoUtc(d: Date): string {
  const mois = String(d.getUTCMonth() + 1).padStart(2, '0');
  const jour = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mois}-${jour}`;
}

/**
 * Le pied de la carte répondue : « Répondu lundi. Prochain point : lundi 21 septembre. » (v1-14 §3.2).
 *
 * **Ce n'est pas la voix de Ramille** — il porte des dates, et elle ne dit jamais de nombre. D'où
 * sa place ici et son rendu en petit tertiaire, sous sa phrase à elle.
 *
 * Les dates sont **locales**, à la différence de `debutDePeriodeInterrogee` : celle-là est la
 * jumelle d'un calcul serveur, celles-ci sont lues par une personne dans son fuseau. Le mois est
 * écrit en entier (« 21 septembre ») là où le canvas abrège (« 21 sept. ») : une quatrième liste de
 * mots français, abréviations comprises, coûterait plus que la place qu'elle économise — écart
 * consigné en `v1-14` §10.
 *
 * `null` quand l'horodatage manque : une carte répondue sans date vaut mieux qu'une date inventée.
 */
export function piedDuPointRepondu(
  point: { loop_type: 'commute' | 'extras'; responded_at: string | null | undefined },
  maintenant: Date = new Date()
): string | null {
  if (!point.responded_at) return null;
  const repondu = new Date(point.responded_at);
  if (Number.isNaN(repondu.getTime())) return null;

  if (point.loop_type === 'commute') {
    const jour = JOURS_FRANCAIS[(repondu.getDay() + 6) % 7];
    // Lundi prochain : jamais aujourd'hui, même un lundi — le point du jour est celui qu'on vient
    // de répondre, le suivant est dans sept jours.
    const prochain = new Date(maintenant);
    prochain.setDate(prochain.getDate() + (7 - ((maintenant.getDay() + 6) % 7)));
    return `Répondu ${jour}. Prochain point : lundi ${prochain.getDate()} ${MOIS_FRANCAIS[prochain.getMonth()]}.`;
  }

  const premier = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);
  return `Répondu le ${jourDuMois(repondu.getDate())}. Prochain point : ${jourDuMois(1)} ${
    MOIS_FRANCAIS[premier.getMonth()]
  }.`;
}

/**
 * « 1er » et non « 1 » — la seule irrégularité des jours du mois en français.
 *
 * Exportée depuis C2.8 : `src/types/saison.ts` en a besoin pour « jusqu'au 1er mars », et deux
 * copies de cette irrégularité divergeraient par le même oubli que deux copies des douze mois.
 */
export function jourDuMois(jour: number): string {
  return jour === 1 ? '1er' : String(jour);
}

/** Ce qu'il faut d'un point déjà répondu pour reconstituer une série : sa période et sa réponse. */
export type PointRepondu = { period_start: string; reponse: ReponseDuPoint };

/**
 * **Le second renforcement, et pourquoi il ne se déclenche qu'une fois** (C2.10, `v1-14` §4.6).
 *
 * Vrai quand ce point est un « oui », que la période **immédiatement précédente** en porte un aussi,
 * et que celle d'avant **n'en porte pas**. Les trois conditions comptent :
 *
 *   - les périodes sont calculées (`periodePrecedente`) et non lues dans l'ordre des lignes, sinon
 *     deux « oui » séparés par trois mois de silence feraient une série ;
 *   - la troisième condition est ce que « jamais au-delà de deux » veut dire. La phrase dit
 *     « Deuxième semaine de suite » : à la cinquième elle serait fausse, et la recevoir chaque
 *     semaine en ferait du papier peint — le contraire de ce qu'un renforcement est censé faire.
 *     Le signal marque le passage d'un geste à une habitude, puis se tait.
 *
 * `v1-14` §4.6 décrit la dérivation comme `estDeuxiemeFoisDeSuite(precedent, courant)`, à deux
 * arguments : il en faut un troisième état pour savoir qu'on est à **deux** et pas à cinq (écart
 * consigné en `v1-14` §10).
 *
 * Un « pas de trajet cette période » ne prolonge pas la série et ne la casse pas non plus : il n'est
 * simplement pas un « oui », donc il n'y a rien à renforcer — et rien à reprocher.
 */
export function estDeuxiemeFoisDeSuite(
  courant: Pick<PointInterrogeable, 'loop_type' | 'period_start'> & { reponse: ReponseDuPoint },
  historique: PointRepondu[]
): boolean {
  if (courant.reponse !== 'oui') return false;

  const precedente = periodePrecedente(courant.loop_type, courant.period_start);
  const avant = periodePrecedente(courant.loop_type, precedente);
  const reponseDe = (iso: string) =>
    historique.find((point) => point.period_start.slice(0, 10) === iso)?.reponse ?? null;

  return reponseDe(precedente) === 'oui' && reponseDe(avant) !== 'oui';
}

/**
 * La phrase du second renforcement — **voix produit, pas celle de Ramille** (`v1-14` §3.2).
 *
 * Elle constate un fait sur deux périodes ; Ramille, elle, ne compte jamais. D'où son rendu en corps
 * **sous** sa réplique, et sa place ici plutôt que dans `RAMILLE`.
 *
 * Quatre formes et non deux : le canvas écrit celle du trajet et celle des voyages, mais la boucle
 * mensuelle couvre aussi les sorties du week-end depuis C2.6 — même raison que pour le libellé du
 * troisième choix et la réplique qui lui répond.
 */
export function phraseDeSecondRenforcement(
  point: Pick<PointInterrogeable, 'loop_type' | 'poste'>
): string {
  if (point.loop_type === 'commute') {
    return 'Deuxième semaine de suite que tu fais ce trajet autrement.';
  }
  if (point.poste === 'travel') return 'Deuxième mois de suite que tu voyages autrement.';
  if (point.poste === 'leisure') return 'Deuxième mois de suite que tu sors autrement.';
  return 'Deuxième mois de suite que tu te déplaces autrement.';
}
