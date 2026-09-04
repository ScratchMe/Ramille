-- Tests pgTAP de la réparation de la boucle d'engagement
-- (docs/architecture/v1-07-audit-facteurs-et-suivi.md T5 et T6, migration
-- 20260904180000_checkin_expiry_and_plan_refresh.sql).
--
-- Les deux défauts couverts ici sont ceux qui cassaient l'accompagnement dans la durée :
-- une pile de questions identiques à chaque retour, et un plan qui ne suivait pas un
-- nouveau bilan.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('c8111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-loop-a@test.local', 'x', now(), now()),
  ('c8111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-loop-b@test.local', 'x', now(), now());

-- ── A : huit semaines d'absence ────────────────────────────────────────────────────────

insert into public.assessments (id, user_id, status, submitted_at) values
  ('d8111111-1111-1111-1111-111111111111', 'c8111111-1111-1111-1111-111111111111', 'completed', now());
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
) values (
  'd8111111-1111-1111-1111-111111111111', true, 5, 20, 'voiture', false, false, 'rarely'
);
select public.recompute_assessment_results('d8111111-1111-1111-1111-111111111111');

-- Huit semaines de check-ins jamais répondus, comme en produirait le cron hebdomadaire
-- pendant une absence.
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
select 'c8111111-1111-1111-1111-111111111111', 'commute',
       (date_trunc('week', now()) - (n || ' weeks')::interval)::date,
       'Semaine du ' || to_char(date_trunc('week', now()) - (n || ' weeks')::interval, 'DD/MM'),
       'Trajet domicile-travail (Voiture)'
from generate_series(1, 8) n;

select is(
  (select count(*)::int from public.engagement_checkins
   where user_id = 'c8111111-1111-1111-1111-111111111111' and status = 'pending'),
  8,
  'A : huit semaines sans réponse laissaient bien huit questions en attente — le mur que l''écran /plan affichait'
);

select public.generate_commute_checkins();

select is(
  (select count(*)::int from public.engagement_checkins
   where user_id = 'c8111111-1111-1111-1111-111111111111' and status = 'pending'),
  1,
  'A : après le passage du cron, une seule question vivante'
);

select is(
  (select period_start from public.engagement_checkins
   where user_id = 'c8111111-1111-1111-1111-111111111111' and status = 'pending'),
  date_trunc('week', now())::date,
  'A : et c''est celle de la semaine courante, pas la plus ancienne de la pile'
);

select is(
  (select count(*)::int from public.engagement_checkins
   where user_id = 'c8111111-1111-1111-1111-111111111111' and status = 'expired'),
  8,
  'A : les semaines révolues sont closes, pas supprimées — le signal d''engagement (spec §7) doit pouvoir les distinguer d''un "pas encore répondu"'
);

-- Une réponse déjà donnée n'est jamais requalifiée en occasion manquée.
update public.engagement_checkins
set status = 'answered', response = true, responded_at = now()
where user_id = 'c8111111-1111-1111-1111-111111111111' and status = 'pending';

select public.generate_commute_checkins();

select is(
  (select count(*)::int from public.engagement_checkins
   where user_id = 'c8111111-1111-1111-1111-111111111111' and status = 'answered'),
  1,
  'A : un check-in répondu reste répondu quand le cron repasse'
);

-- ── B : le plan suit un nouveau bilan ──────────────────────────────────────────────────

insert into public.assessments (id, user_id, status, submitted_at) values
  ('d8111111-1111-1111-1111-111111111121', 'c8111111-1111-1111-1111-111111111112', 'completed', now() - interval '2 days');
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
) values (
  'd8111111-1111-1111-1111-111111111121', true, 5, 30, 'voiture', false, false, 'rarely'
);
select public.recompute_assessment_results('d8111111-1111-1111-1111-111111111121');

-- `now()` est figé pour toute la transaction de test : on date le cycle du moment où il a
-- réellement été construit, c'est-à-dire celui du premier bilan.
update public.plan_cycles set created_at = now() - interval '2 days'
where user_id = 'c8111111-1111-1111-1111-111111111112';

select is(
  (select trip_label from public.plan_cycles where user_id = 'c8111111-1111-1111-1111-111111111112'),
  'Trajet domicile-travail (Voiture)',
  'B : le plan du premier bilan cible le trajet domicile-travail en voiture'
);

-- Le cron quotidien repasse : il ne doit rien réécrire. Non négociable — l'étape 6
-- attachera au cycle les actions choisies par l'utilisateur.
select public.generate_plan_cycle_for_user('c8111111-1111-1111-1111-111111111112');

select is(
  (select created_at from public.plan_cycles where user_id = 'c8111111-1111-1111-1111-111111111112'),
  now() - interval '2 days',
  'B : le cron est idempotent — il ne reconstruit pas un cycle déjà à jour'
);

-- Nouveau bilan : la personne est passée au vélo, ses deux vols long-courriers deviennent
-- le poste dominant.
insert into public.assessments (id, user_id, status, submitted_at) values
  ('d8111111-1111-1111-1111-111111111122', 'c8111111-1111-1111-1111-111111111112', 'completed', now());
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency, flights_total_per_year, flights_short_per_year
) values (
  'd8111111-1111-1111-1111-111111111122', true, 5, 30, 'velo', false, false, 'rarely', 2, 0
);
select public.recompute_assessment_results('d8111111-1111-1111-1111-111111111122');

select is(
  (select trip_label from public.plan_cycles where user_id = 'c8111111-1111-1111-1111-111111111112'),
  'Voyages longue distance (Avion long-courrier)',
  'B : le plan suit le nouveau bilan au lieu de rester figé jusqu''à la fin de la saison'
);

select is(
  (select round(baseline_co2_kg_year::numeric, 1) from public.plan_cycles where user_id = 'c8111111-1111-1111-1111-111111111112'),
  3196.8::numeric,
  'B : la baseline est celle du nouveau poste dominant (2 × 9000 km × 0,1776), pas l''ancienne'
);

select is(
  (select count(*)::int from public.plan_cycles where user_id = 'c8111111-1111-1111-1111-111111111112'),
  1,
  'B : un seul cycle pour la période — le plan est reconstruit, pas dupliqué'
);

select * from finish();
rollback;
