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
import { keepLatestPerDay, type AssessmentSnapshot, type CheckinRecord } from '@/types/suivi';

/** Bilans complétés, du plus ancien au plus récent — l'ordre dans lequel on lit une évolution. */
export async function loadAssessmentHistory(): Promise<AssessmentSnapshot[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select('id, submitted_at, assessment_results(total_co2_kg_year, dominant_poste, dominant_poste_label)')
    .eq('status', 'completed')
    .order('submitted_at', { ascending: true });

  if (error || !data) return [];

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
      },
    ];
  });

  return keepLatestPerDay(snapshots);
}

/** Check-ins auxquels l'utilisateur a effectivement répondu, du plus récent au plus ancien. */
export async function loadAnsweredCheckins(): Promise<CheckinRecord[]> {
  const { data, error } = await supabase
    .from('engagement_checkins')
    .select('id, loop_type, period_label, period_start, response, responded_at')
    .eq('status', 'answered')
    .order('period_start', { ascending: false });

  if (error || !data) return [];

  return data.flatMap((checkin) =>
    checkin.response === null || checkin.responded_at === null
      ? []
      : [
          {
            id: checkin.id,
            loopType: checkin.loop_type as CheckinRecord['loopType'],
            periodLabel: checkin.period_label,
            periodStart: checkin.period_start,
            response: checkin.response,
            respondedAt: checkin.responded_at,
          },
        ]
  );
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
    commute_car_engine: answers.commute_car_engine as BilanAnswers['commute_car_engine'],
    commute_two_wheeler_type:
      answers.commute_two_wheeler_type as BilanAnswers['commute_two_wheeler_type'],

    leisure_frequency: answers.leisure_frequency as BilanAnswers['leisure_frequency'],
    leisure_mode: answers.leisure_mode as BilanAnswers['leisure_mode'],
    leisure_distance_bracket: answers.leisure_distance_bracket as BilanAnswers['leisure_distance_bracket'],
    leisure_car_engine: answers.leisure_car_engine as BilanAnswers['leisure_car_engine'],
    leisure_two_wheeler_type:
      answers.leisure_two_wheeler_type as BilanAnswers['leisure_two_wheeler_type'],

    flights_total_per_year: answers.flights_total_per_year,
    flights_short_per_year: answers.flights_short_per_year,
    train_long_trips_per_year: answers.train_long_trips_per_year,
    car_long_trips_per_year: answers.car_long_trips_per_year,
    car_long_trips_engine: answers.car_long_trips_engine as BilanAnswers['car_long_trips_engine'],

    zone_type: answers.zone_type as BilanAnswers['zone_type'],
    tc_access: answers.tc_access as BilanAnswers['tc_access'],
    household_vehicles: answers.household_vehicles as BilanAnswers['household_vehicles'],
  };
}
