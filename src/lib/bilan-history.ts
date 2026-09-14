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
import { supabase } from '@/lib/supabase';
import type { BilanAnswers } from '@/types/bilan';
import { genreDeReponse } from '@/types/checkin';
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

/** Bilans complétés, du plus ancien au plus récent — l'ordre dans lequel on lit une évolution. */
export async function loadAssessmentHistory(): Promise<Lecture<AssessmentSnapshot[]>> {
  const { data, error } = await supabase
    .from('assessments')
    // Les trois postes viennent avec le total depuis C2.7 : le suivi ne montrait que le total, où un
    // effort tenu sur le trajet quotidien disparaît derrière un vol. Non nullables en base.
    .select(
      'id, submitted_at, assessment_results(total_co2_kg_year, dominant_poste, dominant_poste_label, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year)'
    )
    .eq('status', 'completed')
    .order('submitted_at', { ascending: true });

  if (error || !data) return { ok: false };

  const snapshots = data.flatMap((assessment) => {
    // `assessment_results` est en 1:1 avec `assessments`, mais un bilan complété dont le
    // calcul aurait échoué n'aurait pas de ligne : on l'écarte plutôt que d'afficher un
    // point vide dans la courbe.
    const results = Array.isArray(assessment.assessment_results)
      ? assessment.assessment_results[0]
      : assessment.assessment_results;
    if (!results || !assessment.submitted_at) return [];
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
export async function loadAnsweredCheckins(): Promise<Lecture<CheckinRecord[]>> {
  const { data, error } = await supabase
    .from('engagement_checkins')
    .select('id, loop_type, period_label, period_start, response_kind, responded_at')
    .eq('status', 'answered')
    .order('period_start', { ascending: false });

  if (error || !data) return { ok: false };

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
        'intention_days, intention_timing, action_templates(action_text), plan_cycles!plan_actions_plan_cycle_id_fkey(id, period_label, period_start)'
      )
      .not('committed_at', 'is', null),
    supabase
      .from('plan_action_commitments_archive')
      .select('action_text, intention_days, intention_timing, released_at, plan_cycles(id, period_label, period_start)')
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

/** Le bilan qui précède, tel que la restitution d'un re-bilan le compare. */
export type BilanPrecedent = { submittedAt: string; totalKg: number };

/**
 * Le bilan **strictement antérieur** à celui-ci (C2.7, point 2).
 *
 * **Choisi sur `submitted_at`, jamais dans l'historique dédoublonné.** `keepLatestPerDay` ne garde
 * que le dernier bilan de chaque jour — c'est ce qu'il faut pour une courbe, pas pour désigner un
 * prédécesseur : réutiliser cette liste ferait dépendre la comparaison d'un regroupement qui existe
 * pour une tout autre raison.
 *
 * Deux lignes lues et non une : la seule façon de vérifier que le bilan courant est bien le plus
 * récent. S'il ne l'est pas — une horloge serveur qui recule, une ouverture en mode `nouveau` sur un
 * bilan qui ne l'est pas — on ne compare rien plutôt que de comparer à un bilan postérieur.
 */
export async function loadBilanPrecedent(
  assessmentId: string
): Promise<Lecture<BilanPrecedent | null>> {
  const { data, error } = await supabase
    .from('assessments')
    .select('id, submitted_at, assessment_results(total_co2_kg_year)')
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(2);

  if (error || !data) return { ok: false };
  if (data[0]?.id !== assessmentId) return { ok: true, data: null };

  const precedent = data[1];
  const results = precedent ? unique(precedent.assessment_results) : null;
  if (!precedent?.submitted_at || !results) return { ok: true, data: null };

  return {
    ok: true,
    data: { submittedAt: precedent.submitted_at, totalKg: results.total_co2_kg_year },
  };
}

/** Le cycle de plan qui couvrait un jour donné, avec le cap qu'il portait. */
export type CycleDeCePour = { cycleId: string; capKg: number | null };

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

  if (!data) return null;
  return {
    cycleId: data.id,
    capKg:
      data.baseline_co2_kg_year != null
        ? (data.baseline_co2_kg_year * data.target_reduction_pct) / 100
        : null,
  };
}

/**
 * Réponses du dernier bilan complété, dans la forme du questionnaire.
 *
 * Sert au re-bilan : sans ça, « Modifier mes réponses » repartait d'un questionnaire vide,
 * et refaire son bilan six mois plus tard demandait de retaper les neuf étapes (v1-07 T7).
 * Le mapping est direct — `BilanAnswers` est un miroir des colonnes de la table (v1-05 §3).
 */
export async function loadLastSubmittedAnswers(): Promise<BilanAnswers | null> {
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id')
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assessment) return null;

  const { data: answers } = await supabase
    .from('assessment_answers')
    .select('*')
    .eq('assessment_id', assessment.id)
    .maybeSingle();

  if (!answers) return null;

  return {
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

    leisure_frequency: answers.leisure_frequency as BilanAnswers['leisure_frequency'],
    leisure_mode: answers.leisure_mode as BilanAnswers['leisure_mode'],
    leisure_distance_bracket: answers.leisure_distance_bracket as BilanAnswers['leisure_distance_bracket'],
    leisure_distance_km: answers.leisure_distance_km,
    leisure_is_carpool: answers.leisure_is_carpool,
    leisure_carpool_size: answers.leisure_carpool_size,
    leisure_car_engine: answers.leisure_car_engine as BilanAnswers['leisure_car_engine'],
    leisure_two_wheeler_type:
      answers.leisure_two_wheeler_type as BilanAnswers['leisure_two_wheeler_type'],

    flights_total_per_year: answers.flights_total_per_year,
    flights_short_per_year: answers.flights_short_per_year,
    train_long_trips_per_year: answers.train_long_trips_per_year,
    car_long_trips_per_year: answers.car_long_trips_per_year,
    car_long_trips_engine: answers.car_long_trips_engine as BilanAnswers['car_long_trips_engine'],
    car_long_trips_occupancy: answers.car_long_trips_occupancy,

    zone_type: answers.zone_type as BilanAnswers['zone_type'],
    tc_access: answers.tc_access as BilanAnswers['tc_access'],
    household_vehicles: answers.household_vehicles as BilanAnswers['household_vehicles'],
  };
}
