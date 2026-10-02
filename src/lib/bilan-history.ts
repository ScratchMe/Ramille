// Lecture de l'historique d'un utilisateur — bilans successifs et check-ins répondus.
// Réf. docs/architecture/v1-07-audit-facteurs-et-suivi.md §3.2.
//
// Tout est déjà en base : `assessments` supporte explicitement plusieurs bilans dans le
// temps (v1-05) et `engagement_checkins` conserve chaque réponse. Ce qui manquait, c'est
// de le *lire* — jusqu'ici on répondait à un check-in, la carte disparaissait, et il ne
// restait rien.
//
// Ces lectures sont strictement **soi vs son propre historique**. Aucune comparaison à
// d'autres utilisateurs n'est possible ici : les policies RLS sont owner-scoped, et le
// non-goal de la spec §2 sur ce point reste ferme.
//
// Les calculs purs qui exploitent ces données (écart entre deux bilans, dédoublonnage par
// jour, ancienneté) vivent dans `src/types/suivi.ts`, sans dépendance au client Supabase.
import { loisirsSontLeResiduel, type LoopType } from '@/constants/postes';
import { supabase } from '@/lib/supabase';
import { type BilanAnswers, STATUT_DE_BILAN } from '@/types/bilan';
import { genreDeReponse, STATUT_DU_POINT } from '@/types/checkin';
import { genreDeLEchec, type GenreDEchec } from '@/types/lecture-en-echec';
import { lireLesBouclesAVenir } from '@/types/rappels';
import {
  decisionsParSaison,
  keepLatestPerDay,
  type AssessmentSnapshot,
  type CheckinRecord,
  type DecisionBrute,
  type DecisionDeSaison,
} from '@/types/suivi';

/**
 * Une lecture qui peut échouer, et qui le dit.
 *
 * **`{ ok: false }` veut dire « je n'ai pas pu lire », jamais « il n'y a rien »** (A5-2). Les
 * deux lectures ci-dessous rendaient `[]` sur erreur, et l'écran de suivi traduisait ce tableau
 * vide en « Ton suivi commence au premier bilan » : hors ligne, quelqu'un qui a douze bilans
 * lisait que son historique n'existait pas. Un état vide est une affirmation sur les données de
 * la personne — c'est la pire chose à inventer, et ça se règle ici, à la source, parce que
 * l'appelant ne peut pas deviner ce que le tableau vide voulait dire.
 */
export type Lecture<T> = { ok: true; data: T } | { ok: false };

/**
 * Une lecture qui dit, en échec, **pourquoi** : hors ligne, ou le serveur en échec (D19 de `v1-33`,
 * 01/10/2026). Ce sont les deux lectures dont l'échec fait l'écran d'erreur du suivi, et la phrase de
 * cet écran ne parle de connexion qu'à qui n'en a pas (`phraseDeLaLectureEnEchec`). Le genre se
 * calcule **ici**, sur le statut HTTP que l'appelant ne voit plus, et une seule fois (`FRONT.md` §2.11).
 * Un succès rend exactement ce qu'il rendait ; l'échec reste un `Lecture<T>` pour qui ne lit pas le
 * genre.
 */
export type LectureQuiDitPourquoi<T> = { ok: true; data: T } | { ok: false; genre: GenreDEchec };

/**
 * Le genre d'une lecture qui n'a rien rendu : son statut quand elle a une erreur, `serveur` quand elle
 * n'a ni erreur ni données — une réponse, donc pas une coupure.
 */
function genreDeLaLecture(error: unknown, status: number): GenreDEchec {
  return error ? genreDeLEchec(status) : 'serveur';
}

/** Bilans complétés, du plus ancien au plus récent — l'ordre dans lequel on lit une évolution. */
export async function loadAssessmentHistory(): Promise<LectureQuiDitPourquoi<AssessmentSnapshot[]>> {
  const { data, error, status } = await supabase
    .from('assessments')
    // Les trois postes viennent avec le total depuis C2.7 : le suivi ne montrait que le total, où un
    // effort tenu sur le trajet quotidien disparaît derrière un vol. Non nullables en base.
    // La fréquence des loisirs depuis le 27/09/2026, pour nommer le résiduel des sorties rares : les
    // libellés figés ne le marquent pas quand les voyages pèsent plus (`loisirsSontLeResiduel`).
    .select(
      'id, submitted_at, assessment_results(total_co2_kg_year, dominant_poste, dominant_poste_label, extras_poste_label, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year), assessment_answers(leisure_frequency)'
    )
    .eq('status', STATUT_DE_BILAN.complete)
    .order('submitted_at', { ascending: true });

  if (error || !data) return { ok: false, genre: genreDeLaLecture(error, status) };

  const snapshots = data.flatMap((assessment) => {
    // `assessment_results` est en 1:1 avec `assessments`, mais un bilan complété dont le
    // calcul aurait échoué n'aurait pas de ligne : on l'écarte plutôt que d'afficher un
    // point vide dans la courbe.
    const results = Array.isArray(assessment.assessment_results)
      ? assessment.assessment_results[0]
      : assessment.assessment_results;
    if (!results || !assessment.submitted_at) return [];
    const reponses = Array.isArray(assessment.assessment_answers)
      ? assessment.assessment_answers[0]
      : assessment.assessment_answers;
    return [
      {
        assessmentId: assessment.id,
        submittedAt: assessment.submitted_at,
        totalKg: results.total_co2_kg_year,
        dominantPoste: results.dominant_poste,
        dominantLabel: results.dominant_poste_label,
        parPoste: {
          commute: results.commute_co2_kg_year,
          leisure: results.leisure_co2_kg_year,
          travel: results.travel_co2_kg_year,
        },
        loisirsOccasionnels: loisirsSontLeResiduel({
          ...results,
          leisure_frequency: reponses?.leisure_frequency ?? null,
        }),
      },
    ];
  });

  return { ok: true, data: keepLatestPerDay(snapshots) };
}

/**
 * Check-ins auxquels l'utilisateur a effectivement répondu, du plus récent au plus ancien.
 *
 * **Le filtre est `status = 'answered'`, et ce qui était lu ensuite était le défaut de C2.4.** La
 * fonction écartait les lignes dont `response` est nulle — ce qui était sans effet tant qu'il n'y
 * avait que oui et non, et devenait une réponse perdue le jour où « pas de trajet cette période »
 * arrive avec `response = null`. La personne aurait répondu, vu le mot de Ramille, puis n'aurait
 * **rien** trouvé dans son suivi, sans message d'erreur. C'est donc `response_kind` qu'on lit, et
 * l'horodatage qui borne : un point répondu sans horodatage ne sait pas se placer dans le temps.
 */
export async function loadAnsweredCheckins(): Promise<LectureQuiDitPourquoi<CheckinRecord[]>> {
  const { data, error, status } = await supabase
    .from('engagement_checkins')
    .select('id, loop_type, period_label, period_start, response_kind, responded_at')
    .eq('status', STATUT_DU_POINT.repondu)
    .order('period_start', { ascending: false });

  if (error || !data) return { ok: false, genre: genreDeLaLecture(error, status) };

  const points = data.flatMap((checkin) => {
    const reponse = genreDeReponse(checkin.response_kind);
    return reponse === null || checkin.responded_at === null
      ? []
      : [
          {
            id: checkin.id,
            loopType: checkin.loop_type as CheckinRecord['loopType'],
            periodLabel: checkin.period_label,
            periodStart: checkin.period_start,
            reponse,
            respondedAt: checkin.responded_at,
          },
        ];
  });

  return { ok: true, data: points };
}

/**
 * Les boucles de points qui tournent pour la personne (`mes_boucles_a_venir`, 30/09/2026) — ce que
 * le suivi lit pour savoir s'il peut parler de réponses (`carteDuSuiviSansPoint`). Une réponse
 * illisible est un échec de lecture, jamais une liste vide : une liste vide dit « aucune boucle »,
 * et ferait retirer à tort la phrase sur les réponses.
 */
export async function loadBouclesAVenir(): Promise<Lecture<LoopType[]>> {
  const { data, error } = await supabase.rpc('mes_boucles_a_venir');
  if (error) return { ok: false };
  const boucles = lireLesBouclesAVenir(data);
  return boucles === null ? { ok: false } : { ok: true, data: boucles };
}

/**
 * Ce que la personne a décidé, saison après saison (C2.7, point 4).
 *
 * Le suivi ne lisait **jamais** `plan_cycles` ni `plan_actions` : le seul choix personnel que le
 * produit demande — une action, des jours — ne laissait aucune trace passé la saison. Deux sources,
 * parce qu'un engagement peut avoir été relâché : la ligne vivante du cycle, et l'archive de C2.2.
 * `decisionsParSaison` en tire une ligne par cycle.
 *
 * **`plan_cycles!plan_actions_plan_cycle_id_fkey` est obligatoire** : `plan_actions` a deux clés
 * étrangères vers `plan_cycles` depuis C2.2 (`carried_over_from`), donc PostgREST refuse la requête
 * sans le nom de celle qu'on suit — le typecheck est le seul garde qui l'attrape.
 */
export async function loadDecisionsEngagees(): Promise<Lecture<DecisionDeSaison[]>> {
  const [vivantes, archivees] = await Promise.all([
    supabase
      .from('plan_actions')
      .select(
        'committed_at, intention_days, intention_timing, action_templates(action_text), plan_cycles!plan_actions_plan_cycle_id_fkey(id, period_label, period_start)'
      )
      .not('committed_at', 'is', null),
    supabase
      .from('plan_action_commitments_archive')
      .select('action_text, committed_at, intention_days, intention_timing, released_at, plan_cycles(id, period_label, period_start)')
      .order('released_at', { ascending: false }),
  ]);

  if (vivantes.error || archivees.error) return { ok: false };

  const brutes: DecisionBrute[] = [];

  for (const action of vivantes.data ?? []) {
    const cycle = unique(action.plan_cycles);
    const gabarit = unique(action.action_templates);
    // Sans cycle il n'y a pas de saison à mettre à gauche de la ligne ; sans gabarit, pas d'action à
    // nommer. Les deux sont garantis par le schéma — on les écarte plutôt que d'écrire « undefined ».
    if (!cycle || !gabarit) continue;
    brutes.push({
      cycleId: cycle.id,
      periodLabel: cycle.period_label,
      periodStart: cycle.period_start,
      actionText: gabarit.action_text,
      intentionDays: action.intention_days,
      intentionTiming: action.intention_timing,
      committedAt: action.committed_at,
      releasedAt: null,
    });
  }

  for (const ligne of archivees.data ?? []) {
    const cycle = unique(ligne.plan_cycles);
    // `plan_cycle_id` est nullable dans l'archive : un cycle supprimé laisse une décision qui ne
    // sait plus de quelle saison elle était, et c'est la saison qui ouvre la ligne.
    if (!cycle) continue;
    brutes.push({
      cycleId: cycle.id,
      periodLabel: cycle.period_label,
      periodStart: cycle.period_start,
      actionText: ligne.action_text,
      intentionDays: ligne.intention_days,
      intentionTiming: ligne.intention_timing,
      committedAt: ligne.committed_at,
      releasedAt: ligne.released_at,
    });
  }

  return { ok: true, data: decisionsParSaison(brutes) };
}

/** PostgREST rend parfois un objet, parfois un tableau d'un élément, selon la relation. */
function unique<T>(valeur: T | T[] | null): T | null {
  if (valeur === null) return null;
  return Array.isArray(valeur) ? (valeur[0] ?? null) : valeur;
}

// **La lecture du bilan précédent n'est plus ici** (01/10/2026, audit R-4). `loadBilanPrecedent`
// relisait, après l'affichage de la restitution, la liste que celle-ci venait déjà de lire pour la
// place du bilan — mêmes bilans complétés, même ordre. Une seule lecture sert désormais les deux,
// `lireLesBilansValides` (`src/lib/retrait-du-bilan.ts`), et le choix du précédent est une dérivation
// pure, `precedentDeLaRestitution` (`src/types/suivi.ts`), qui garde ses trois règles : un **autre
// jour** (arbitrage du 28/09/2026, la correction gagne), le bilan affiché en tête, et une recherche
// bornée aux dix plus récents.

/** Le cycle de plan qui couvrait un jour donné, avec le cap qu'il portait. */
export type CycleDeCePour = { cycleId: string; capKg: number | null };

/**
 * Le cap d'une ligne de `plan_cycles` : `target_reduction_pct` pour cent de la baseline du poste
 * dominant — le calcul que la restitution faisait sur le cycle courant et cette lecture sur le cycle
 * d'alors, écrit une fois pour les deux.
 */
function versCycle(
  ligne: { id: string; baseline_co2_kg_year: number | null; target_reduction_pct: number } | null
): CycleDeCePour | null {
  if (!ligne) return null;
  return {
    cycleId: ligne.id,
    capKg:
      ligne.baseline_co2_kg_year != null
        ? (ligne.baseline_co2_kg_year * ligne.target_reduction_pct) / 100
        : null,
  };
}

/**
 * Le cycle de plan courant, pour le palier de la restitution — le cap que `/plan` affiche déjà, figé
 * à la génération du cycle.
 *
 * **Tolérante, et c'est son contrat** : un échec rend `null` comme l'absence de cycle, et l'écran ne
 * propose alors pas de marche — il ne tombe pas pour elle. C'était une lecture écrite dans l'écran,
 * qui attendait le résultat du bilan pour partir ; elle part désormais avec lui (audit R-4).
 */
export async function loadCycleCourant(): Promise<CycleDeCePour | null> {
  const { data } = await supabase
    .from('plan_cycles')
    // `id` depuis C2.7 : il sert à savoir si le cycle qui couvrait le bilan précédent est **celui-ci**,
    // auquel cas son cap a été réécrit à la soumission et le palier alors visé n'est plus
    // connaissable (cf. `palierEstDerriere`).
    .select('id, baseline_co2_kg_year, target_reduction_pct')
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  return versCycle(data);
}

/**
 * Le cycle qui couvrait ce jour-là, pour savoir quel palier était visé alors (C2.7, point 2).
 *
 * Le cap affiché **à l'époque** n'est pas toujours retrouvable : `generate_plan_cycle_for_user`
 * réécrit le cycle courant à chaque re-bilan, donc quand les deux bilans tombent dans la même
 * période, la ligne porte désormais la baseline du nouveau. C'est l'appelant qui tranche, en
 * comparant l'identifiant rendu ici à celui du cycle courant — d'où `cycleId` dans le retour.
 */
export async function loadCycleCouvrant(jourIso: string): Promise<CycleDeCePour | null> {
  const { data } = await supabase
    .from('plan_cycles')
    .select('id, baseline_co2_kg_year, target_reduction_pct')
    .lte('period_start', jourIso)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  return versCycle(data);
}

/**
 * La fréquence des loisirs déclarée dans un bilan, pour nommer le résiduel des sorties rares
 * (arbitrage du 27/09/2026, `v1-29` §6.3) : les libellés figés ne le marquent que quand il domine ou
 * porte la boucle mensuelle, et la barre de répartition de la restitution le montre aussi quand les
 * voyages pèsent plus — « rarement » et un vol, le cas courant.
 *
 * **Tolérante** : `null` sur un échec comme sur une absence, et `loisirsSontLeResiduel` retombe alors
 * sur les libellés. Elle était un effet à part dans l'écran ; elle part désormais avec le résultat
 * (audit R-4), et le libellé des loisirs est juste dès le premier rendu.
 */
export async function loadFrequenceDesLoisirs(assessmentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('assessment_answers')
    .select('leisure_frequency')
    .eq('assessment_id', assessmentId)
    .maybeSingle();
  if (error) console.error('La fréquence des loisirs n’a pas pu être lue :', error);
  return data?.leisure_frequency ?? null;
}

/**
 * Réponses du dernier bilan complété, dans la forme du questionnaire.
 *
 * Sert au re-bilan : sans ça, « Modifier mes réponses » repartait d'un questionnaire vide,
 * et refaire son bilan six mois plus tard demandait de retaper les neuf étapes (v1-07 T7).
 * Le mapping est direct — `BilanAnswers` est un miroir des colonnes de la table (v1-05 §3).
 *
 * **Une `Lecture` depuis le 02/10/2026** (`v1-33` §9) : elle rendait `null` sur un échec comme sur une
 * absence, et l'écran ne pouvait donc pas savoir qu'il valait la peine de relire. `{ ok: true, data:
 * null }` veut dire « aucun bilan à préremplir », `{ ok: false }` « on ne sait pas » — que le
 * questionnaire reprend en arrière-plan (`relireEnArrierePlan`).
 */
export async function loadLastSubmittedAnswers(): Promise<Lecture<BilanAnswers | null>> {
  // **Sans session, on n'interroge pas la base** (29/09/2026, recette `v1-13` §17). `/bilan` ouvert
  // par son adresse dans un navigateur neuf arrive ici avant que la session anonyme n'existe : la
  // requête partait avec la seule clé `anon`, qui n'a aucun privilège sur `assessments`, et le
  // serveur répondait 42501. Sans effet à l'écran — une session qui n'existe pas encore n'a aucun
  // bilan à préremplir —, c'est la forme que la racine s'interdit déjà (C4.5, `CLAUDE.md`) : une
  // lecture sans session ne dit rien des données de la personne.
  const {
    data: { session },
    error: erreurDeSession,
  } = await supabase.auth.getSession();
  // **Une session illisible est un échec, pas une absence** (contre-lecture du 02/10/2026) : sur un
  // jeton expiré dont le renouvellement échoue — un raté réseau compris —, `auth-js` rend
  // `{ session: null, error }`, et « aucun bilan » aurait laissé le questionnaire vide sans reprise.
  if (erreurDeSession) return { ok: false };
  if (!session) return { ok: true, data: null };

  const { data: assessment, error: erreurDuBilan } = await supabase
    .from('assessments')
    .select('id')
    .eq('status', STATUT_DE_BILAN.complete)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erreurDuBilan) return { ok: false };
  if (!assessment) return { ok: true, data: null };

  const { data: answers, error: erreurDesReponses } = await supabase
    .from('assessment_answers')
    .select('*')
    .eq('assessment_id', assessment.id)
    .maybeSingle();

  if (erreurDesReponses) return { ok: false };
  if (!answers) return { ok: true, data: null };

  return {
    ok: true,
    data: {
      commute_has_regular_trip: answers.commute_has_regular_trip,
      commute_days_per_week: answers.commute_days_per_week,
      commute_distance_km: answers.commute_distance_km,
      commute_distance_bracket: answers.commute_distance_bracket as BilanAnswers['commute_distance_bracket'],
      commute_mode: answers.commute_mode as BilanAnswers['commute_mode'],
      commute_is_carpool: answers.commute_is_carpool,
      commute_carpool_size: answers.commute_carpool_size,
      commute_second_mode_used: answers.commute_second_mode_used,
      commute_second_mode: answers.commute_second_mode as BilanAnswers['commute_second_mode'],
      commute_second_mode_share: answers.commute_second_mode_share,
      commute_car_engine: answers.commute_car_engine as BilanAnswers['commute_car_engine'],
      commute_two_wheeler_type:
        answers.commute_two_wheeler_type as BilanAnswers['commute_two_wheeler_type'],
      commute_train_type: answers.commute_train_type as BilanAnswers['commute_train_type'],
      commute_velo_type: answers.commute_velo_type as BilanAnswers['commute_velo_type'],

      leisure_frequency: answers.leisure_frequency as BilanAnswers['leisure_frequency'],
      leisure_mode: answers.leisure_mode as BilanAnswers['leisure_mode'],
      leisure_distance_bracket: answers.leisure_distance_bracket as BilanAnswers['leisure_distance_bracket'],
      leisure_distance_km: answers.leisure_distance_km,
      leisure_is_carpool: answers.leisure_is_carpool,
      leisure_carpool_size: answers.leisure_carpool_size,
      leisure_car_engine: answers.leisure_car_engine as BilanAnswers['leisure_car_engine'],
      leisure_two_wheeler_type:
        answers.leisure_two_wheeler_type as BilanAnswers['leisure_two_wheeler_type'],
      leisure_train_type: answers.leisure_train_type as BilanAnswers['leisure_train_type'],
      leisure_velo_type: answers.leisure_velo_type as BilanAnswers['leisure_velo_type'],

      flights_total_per_year: answers.flights_total_per_year,
      flights_short_per_year: answers.flights_short_per_year,
      train_long_trips_per_year: answers.train_long_trips_per_year,
      car_long_trips_per_year: answers.car_long_trips_per_year,
      car_long_trips_engine: answers.car_long_trips_engine as BilanAnswers['car_long_trips_engine'],
      car_long_trips_occupancy: answers.car_long_trips_occupancy,
      coach_long_trips_per_year: answers.coach_long_trips_per_year,

      zone_type: answers.zone_type as BilanAnswers['zone_type'],
      tc_access: answers.tc_access as BilanAnswers['tc_access'],
      household_vehicles: answers.household_vehicles as BilanAnswers['household_vehicles'],
      teletravail: answers.teletravail as BilanAnswers['teletravail'],
    },
  };
}
