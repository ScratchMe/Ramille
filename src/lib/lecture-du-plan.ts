import { loadReminderPrefs } from '@/lib/notification-prefs';
import { lirePermission } from '@/lib/rappels';
import { supabase } from '@/lib/supabase';
import { STATUT_DE_BILAN } from '@/types/bilan';
import { debutDePeriodeInterrogee, periodePrecedente, STATUT_DU_POINT } from '@/types/checkin';
import { genreDeLEchec } from '@/types/lecture-en-echec';
import { RAISONS_ANNONCABLES } from '@/types/plan';

/**
 * La lecture du plan, sortie de son écran (`v1-33` T-12, 03/10/2026) — pour que le lancement puisse la
 * commencer.
 *
 * **Le défaut.** La racine (`src/app/index.tsx`) lit la session et le dernier bilan, puis complète
 * jusqu'au plancher de l'écran de lancement (`DUREE_ANIMATION_LANCEMENT`, 1 450 ms) avant de router
 * vers le plan, qui ne commençait **qu'alors** sa lecture : trois lots de requêtes, dont le dernier en
 * enchaîne deux (`loadReminderPrefs` lit l'utilisateur avant le profil) — quatre allers-retours. Le
 * plancher se payait donc **avant** la lecture du plan au lieu de la couvrir : une session en cache
 * répond en ≈ 200 ms, et le temps restant jusqu'au plancher ne servait à rien.
 *
 * **Le remède** : la racine lance cette lecture dès qu'elle sait que le plan sera la destination
 * (`prechargerLePlan`, sur la décision de `prechargeLePlan`), et elle court pendant le plancher ; le
 * premier chargement de l'écran la reprend (`lectureDuPlan`) au lieu de la refaire. Rien d'autre ne
 * change : l'écran reçoit le même résultat qu'avant, et en dérive les mêmes états.
 *
 * **Ce qui se lit ici, et ce qui reste à l'écran.** Ici, tout ce qui précédait la première écriture
 * d'état : les requêtes, les préférences de rappel (le réseau, elles aussi) et la permission. L'écran
 * garde les dérivations et les marques « déjà vu », locales. **Une lecture que l'écran du plan ajoute se
 * place dans `lireLePlan`** : dans l'effet de l'écran, elle repartirait après le plancher.
 */
// **La borne basse de la lecture des points, et pourquoi elle existe** (C2.4 puis C2.10). La requête
// ramenait les seuls points `pending` — un ou deux. Depuis qu'elle lit aussi les points répondus, elle
// ramènerait tout l'historique d'un compte, soit une ligne par semaine qui s'accumule sans fin. Ce qui
// est réellement nécessaire est la période courante et les **deux** qui la précèdent (le second
// renforcement a besoin de savoir qu'on est à deux et pas à cinq) : la fenêtre est donc celle de la
// boucle mensuelle, trois mois, qui couvre largement l'hebdomadaire.
//
// **`debutDuCyclePrecedent` l'élargit, et ce n'est pas une précaution de confort** (C2.8). Le
// récapitulatif de la carte d'ouverture compte les points de la période écoulée : au premier jour
// d'une saison, ces points remontent à trois mois pleins. Les deux bornes tombent aujourd'hui
// **exactement** au même jour — trois périodes mensuelles en arrière depuis le 1er d'un mois est le
// 1er du mois trois mois plus tôt, qui est aussi le premier jour de la saison précédente — donc
// l'oubli ne se verrait pas, jusqu'au jour où l'une des deux dérivations bouge. Une cadence
// `rolling_quarter`, elle, n'est pas alignée sur les mois et sortirait déjà de la fenêtre. On prend
// le minimum des deux plutôt que de compter sur une coïncidence.
function fenetreDesPoints(
  maintenant: Date = new Date(),
  debutDuCyclePrecedent?: string | null
): string {
  const courante = debutDePeriodeInterrogee('extras', maintenant);
  const troisPeriodes = periodePrecedente('extras', periodePrecedente('extras', courante));
  if (!debutDuCyclePrecedent) return troisPeriodes;
  const debutDuCycle = debutDuCyclePrecedent.slice(0, 10);
  return debutDuCycle < troisPeriodes ? debutDuCycle : troisPeriodes;
}

/**
 * Ce que la lecture rend : un échec (et son genre, D19), l'absence de bilan, un plan pas encore généré,
 * ou tout ce dont l'écran a besoin.
 */
export async function lireLePlan(annulee: () => boolean = () => false) {
  // **Les deux premières lectures partent ensemble** (audit P-9, 01/10/2026). Elles partaient l'une
  // après l'autre sans raison : la seconde ne lit rien de la première — aucun filtre sur le bilan, la
  // RLS borne déjà à la personne —, et cet aller-retour de trop se payait à **chaque** retour au premier
  // plan, c'est-à-dire à chaque notification ouverte. Les décisions, elles, se prennent dans **l'ordre
  // d'avant**, un résultat après l'autre : l'échec du bilan, puis « pas de bilan » — qui gagne sur un
  // cycle illisible, sans quoi quelqu'un sans bilan lirait une panne —, puis l'échec du cycle, puis
  // « en préparation ».
  const [
    { data: assessment, error: erreurBilan, status: statutDuBilan },
    { data: cycles, error: cycleError, status: statutDuCycle },
  ] = await Promise.all([
    // Le lien "Revenir à mon bilan" pointe vers la restitution du dernier bilan
    // complété (elle-même donne accès à "Modifier mes réponses") — il faut donc son
    // id systématiquement, pas seulement dans le cas filet ci-dessous.
    supabase
      .from('assessments')
      .select('id, submitted_at')
      .eq('status', STATUT_DE_BILAN.complete)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // **Deux cycles et non un** (C2.8) : le second est la période écoulée, dont la carte
    // d'ouverture récapitule les points. Ses bornes sont **lues sur sa ligne** plutôt que
    // recalculées — une cadence `rolling_quarter` n'a pas de saison nommée, donc dériver les
    // bornes de la saison ferait compter trois mois calendaires qui ne sont pas les siens. Et
    // son existence est ce qui distingue une bascule d'un premier bilan : « On repart pour une
    // saison » ne vaut que si l'on a déjà roulé une saison.
    supabase
      .from('plan_cycles')
      .select(
        // Chaîne littérale d'un seul tenant, volontairement longue : supabase-js infère le
        // type du résultat en analysant ce littéral au niveau des types. Une concaténation
        // lui rend un `string` opaque et le typage du retour est perdu.
        //
        // **`plan_actions!plan_actions_plan_cycle_id_fkey` est obligatoire depuis C2.2**, et
        // ce n'est pas une précaution de typage : `carried_over_from` est une **seconde** clé
        // étrangère de `plan_actions` vers `plan_cycles`, donc PostgREST ne sait plus laquelle
        // suivre et refuse la requête (« more than one relationship was found »). Sans le
        // nom de la clé, l'écran du plan ne charge plus du tout. Le typecheck l'attrape —
        // c'est le seul garde qui le fait, la chaîne étant analysée au niveau des types.
        'id, period_label, period_start, period_end, cadence_type, trip_label, poste, baseline_co2_kg_year, target_reduction_pct, plan_actions!plan_actions_plan_cycle_id_fkey(id, action_template_id, saving_kg_year, saving_share_percent, detail_text, first_step, rank, committed_at, intention_days, intention_timing, carried_over_from, action_templates(action_text, poste))'
      )
      .order('period_start', { ascending: false })
      .limit(2),
  ]);

  // Une lecture que l'écran a remplacée s'arrête entre deux lots : la suivante relit tout.
  if (annulee()) return { genre: 'annulee' } as const;
  if (erreurBilan) return { genre: 'echec', echec: genreDeLEchec(statutDuBilan) } as const;
  if (!assessment) return { genre: 'sans_bilan' } as const;

  // **Le cycle manquant et le cycle illisible ne sont plus le même état.** Les deux
  // tombaient sur « Ton plan est en cours de préparation », qui est une affirmation :
  // elle dit qu'il n'y a rien à montrer *encore*, donc qu'il suffit d'attendre. Hors
  // ligne, il n'y a rien à attendre. `pending` reste le filet du cas légitime — un bilan
  // complété avant que le calcul ne génère le plan, que le cron rattrape.
  if (cycleError) return { genre: 'echec', echec: genreDeLEchec(statutDuCycle) } as const;

  const cycle = cycles?.[0] ?? null;
  const cyclePrecedent = cycles?.[1] ?? null;

  if (!cycle) return { genre: 'en_preparation', assessmentId: assessment.id } as const;

  // Check-ins en attente (boucle hebdo domicile-travail + boucle mensuelle extras,
  // cf. generate_commute_checkins/generate_extras_checkins). Les périodes révolues sont
  // clôturées côté serveur en `expired` (migration 20260904180000) : sans ça, un
  // utilisateur absent huit semaines retrouvait huit cartes identiques.
  //
  // Le `keepLatestPerLoop` de l'écran est une ceinture en plus de cette bretelle : si un
  // passage de cron était manqué, la table pourrait de nouveau porter deux périodes en
  // attente pour une même boucle. On n'affiche jamais qu'une question vivante par boucle,
  // la plus récente — une pile de rappels est le contraire de ce que cette boucle promet.
  //
  // Une erreur ici compte autant que les deux autres : sans les points, la carte d'attente
  // prend leur place et Ramille dit qu'il n'y a rien à rattraper le jour où la question
  // est justement ouverte.
  const { data: checkins, error: erreurCheckins, status: statutDesPoints } = await supabase
    .from('engagement_checkins')
    // `committed_question` d'abord : c'est la question **figée** à la génération, celle que
    // le rappel a envoyée (C2.1). La carte l'affiche telle quelle plutôt que de la
    // recomposer, pour qu'elle ne puisse pas différer d'un caractère de la notification
    // qu'on vient d'ouvrir. `committed_action_text` sert à dire, le cas échéant, que la
    // question porte sur une action quittée depuis.
    //
    // `committed_intention_days` n'est **pas** rapatrié, et c'est délibéré : il ne remplirait
    // que la branche à gabarit de `composerQuestionDuPoint`, qu'aucune requête de l'app ne
    // peut atteindre — le gabarit vit sur `action_templates`. La carte n'a besoin que de la
    // question figée.
    .select(
      'id, loop_type, period_label, trip_label, poste, period_start, question_kind, mode, committed_question, committed_action_text, status, response_kind, responded_at'
    )
    // **`answered` autant que `pending` depuis C2.4.** La carte répondue reste le temps de la
    // période : sans les lignes répondues, le renforcement vivait dans un `useState` et
    // disparaissait au premier changement d'onglet — la personne répondait, voyait le mot de
    // Ramille, revenait, et ne trouvait plus rien du tout. `expired` reste dehors : un point
    // que la période suivante a clos n'a rien à montrer.
    .in('status', [STATUT_DU_POINT.enAttente, STATUT_DU_POINT.repondu])
    // La fenêtre borne une lecture qui grossirait sans fin depuis qu'elle prend les points
    // répondus : trois périodes mensuelles couvrent ce dont le second renforcement a besoin.
    .gte('period_start', fenetreDesPoints(new Date(), cyclePrecedent?.period_start))
    .order('period_start', { ascending: false });

  if (annulee()) return { genre: 'annulee' } as const;
  if (erreurCheckins) return { genre: 'echec', echec: genreDeLEchec(statutDesPoints) } as const;

  // Quelle boucle concerne cette personne, donc quel jour Ramille peut nommer : le point
  // du lundi n'est généré que si un poste domicile-travail existe (v1-12 §3), celui du mois
  // que si une base est déclarée — et sinon aucun, et elle ne promet rien (`v1-27` §12.22).
  // C'est le prochain contact qui compte, pas l'action engagée.
  //
  // **L'engagement qu'un recalcul a emporté** se lit dans la même fournée (C2.2). Le filtre
  // porte sur la raison : `saison` et `changement` n'ont rien à annoncer — l'une est une
  // reconduction qui a échoué à la frontière d'une saison, l'autre est la décision de la
  // personne elle-même, qu'il serait absurde de lui apprendre. Restent les **deux effets de
  // bord non choisis**, `rebilan` et, depuis C6.4, `contexte` — la liste vit dans
  // `RAISONS_ANNONCABLES` et non ici, la requête et la phrase devant filtrer sur la même.
  //
  // **Et une seconde lecture de la même table, qui n'est pas un doublon** (C5.6) : celle du
  // dessus répond à « quel engagement le dernier re-bilan a-t-il emporté ? », celle du
  // dessous à « cette personne s'est-elle **déjà** engagée, de quelque façon que ce soit ? ».
  // Élargir le filtre de la première casserait l'encart orphelin — qui n'annonce que l'effet
  // de bord non choisi — et la borner à une ligne ne dirait rien de la seconde question. Un
  // `count` en `head` ne ramène aucune ligne : c'est une existence, pas une donnée.
  const [
    { data: resultat, error: erreurResultat, status: statutDuResultat },
    { data: bouclesAVenir, error: erreurBoucle, status: statutDesBoucles },
    { data: contexte },
    { data: orphelins },
    { count: engagementsArchives },
    prefs,
    etatPermission,
  ] = await Promise.all([
      supabase
        .from('assessment_results')
        .select('total_co2_kg_year')
        .eq('assessment_id', assessment.id)
        .maybeSingle(),
      // **Les boucles viennent du serveur** (30/09/2026, `v1-27` §12.22) : elles se déduisaient
      // ici du seul poste domicile-travail, donc la carte d'attente promettait « au début du
      // mois prochain » à qui n'a aucune boucle. Le serveur les tire de la même définition que
      // les générateurs de points, sans rien recopier de leur règle — **une par une** depuis le
      // soir même (§12.23) : la carte d'un point répondu doit savoir si la sienne tourne.
      supabase.rpc('mes_boucles_a_venir'),
      // **Dans le lot existant, jamais en plus** (C5.5, `v1-17` §7.4) : l'écran se recharge à
      // chaque retour au premier plan — le chemin nominal de la boucle d'engagement, celui
      // qu'on emprunte en appuyant sur une notification — donc une requête en séquence
      // additionnerait sa latence à chaque fois au lieu de se fondre dans le maximum.
      supabase
        .from('assessment_answers')
        .select('zone_type, tc_access, household_vehicles, teletravail')
        .eq('assessment_id', assessment.id)
        .maybeSingle(),
      supabase
        .from('plan_action_commitments_archive')
        .select('id, action_template_id, plan_cycle_id, action_text, released_reason')
        .in('released_reason', RAISONS_ANNONCABLES)
        .order('released_at', { ascending: false })
        .limit(1),
      supabase
        .from('plan_action_commitments_archive')
        .select('id', { count: 'exact', head: true }),
      loadReminderPrefs(),
      lirePermission(),
    ]);

  return {
    genre: 'lu',
    assessment,
    cycle,
    cyclePrecedent,
    checkins,
    resultat,
    erreurResultat,
    statutDuResultat,
    bouclesAVenir,
    erreurBoucle,
    statutDesBoucles,
    contexte,
    orphelins,
    engagementsArchives,
    prefs,
    etatPermission,
  } as const;
}

export type LectureDuPlan = Awaited<ReturnType<typeof lireLePlan>>;

/**
 * Une lecture lancée par la racine, que le premier chargement du plan reprend.
 *
 * **Elle ne sert qu'une fois, au premier chargement, pour la même session, et seulement fraîche.**
 * Demandée par un autre passage — un rafraîchissement, une relance, « Je m'y engage » —, elle est oubliée
 * et la base relue, comme avant. Lancée sous une autre session — une racine remplacée pendant son
 * plancher par un retour de connexion —, elle est jetée : elle dirait le plan de quelqu'un d'autre. Et
 * passé `FRAICHEUR_DU_PRECHARGEMENT`, elle est jetée aussi : le chemin du lancement la reprend une
 * seconde ou deux après l'avoir lancée, et une lecture plus vieille dirait un plan qui a pu changer.
 * `Date.now()` n'est pas monotone : une horloge resynchronisée au démarrage la ferait jeter, ce qui
 * coûte le gain et rien d'autre.
 */
let prechargement: {
  lanceeA: number;
  utilisateur: Promise<string | null>;
  lecture: Promise<LectureDuPlan>;
} | null = null;

export const FRAICHEUR_DU_PRECHARGEMENT = 5_000;

/** L'utilisateur de la session courante, lu localement — `null` sans session, ou si elle est illisible. */
function utilisateurDeLaSession(): Promise<string | null> {
  return supabase.auth
    .getSession()
    .then(({ data }) => data.session?.user.id ?? null)
    .catch(() => null);
}

/** Lancée par la racine quand le plan est la destination, avant d'attendre le plancher du lancement. */
export function prechargerLePlan(maintenant: number = Date.now()): void {
  const lecture = lireLePlan();
  // Une lecture qui lève sans que personne ne l'attende serait une promesse rejetée et orpheline : le
  // plan la reprendra, et c'est son `catch` qui dira l'échec.
  lecture.catch(() => {});
  prechargement = { lanceeA: maintenant, utilisateur: utilisateurDeLaSession(), lecture };
}

/**
 * La lecture du plan : la préchargée quand c'est le premier chargement de l'écran (`reprendre`), qu'elle
 * est fraîche et de la même session ; une lecture neuve sinon, que `annulee` arrête entre deux lots.
 */
export async function lectureDuPlan({
  reprendre = false,
  annulee = () => false,
  maintenant = Date.now(),
}: { reprendre?: boolean; annulee?: () => boolean; maintenant?: number } = {}): Promise<LectureDuPlan> {
  const enCours = prechargement;
  prechargement = null;
  if (reprendre && enCours !== null && maintenant - enCours.lanceeA < FRAICHEUR_DU_PRECHARGEMENT) {
    const [lanceePour, maintenantPour] = await Promise.all([enCours.utilisateur, utilisateurDeLaSession()]);
    if (lanceePour !== null && lanceePour === maintenantPour) return enCours.lecture;
  }
  return lireLePlan(annulee);
}
