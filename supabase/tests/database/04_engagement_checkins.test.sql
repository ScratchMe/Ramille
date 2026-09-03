-- Tests pgTAP de `generate_commute_checkins`/`generate_extras_checkins`
-- (docs/architecture/v1-02-boucle-engagement.md, increment 11 — deux boucles indépendantes
-- plutôt qu'une boucle mensuelle unique). Comme `generate_plan_cycle_for_user` (02), ces
-- fonctions ne lisent pas `auth.uid()` — pas besoin de simuler une requête authentifiée —
-- mais RESTENT volontairement inexécutables par un client (`revoke execute ...`), vérifié en
-- fin de fichier. Les policies RLS d'`engagement_checkins` (lecture/réponse par le
-- propriétaire, pas d'insert client) sont couvertes par 03_rls_policies.test.sql ; ce fichier
-- se concentre sur la logique de génération elle-même : éligibilité par boucle, cadence,
-- libellés, idempotence.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

-- ── Fixtures : 3 utilisateurs, résultats insérés directement (comme 02) ─────────────────
-- A : éligible aux deux boucles. B : pas de trajet domicile-travail régulier (commute_poste_
-- label null) -> jamais de check-in commute. C : cas symétrique côté extras.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('71111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-checkin-a@test.local', 'x', now(), now()),
  ('71111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-checkin-b@test.local', 'x', now(), now()),
  ('71111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-checkin-c@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('81111111-1111-1111-1111-111111111111', '71111111-1111-1111-1111-111111111111', 'completed', now()),
  ('82222222-2222-2222-2222-222222222222', '71111111-1111-1111-1111-111111111112', 'completed', now()),
  ('83333333-3333-3333-3333-333333333333', '71111111-1111-1111-1111-111111111113', 'completed', now());

insert into public.assessment_results (
  assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
  dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label,
  commute_poste_label, extras_poste_co2_kg_year, extras_poste_label
) values
  -- A : trajet domicile-travail régulier + poste extras identifié -> les deux boucles.
  ('81111111-1111-1111-1111-111111111111', 600, 500, 100, 0, 'commute', 500, 'voiture', 'Trajet domicile-travail (Voiture)',
   'Trajet domicile-travail (Voiture)', 100, 'Trajets loisirs (Voiture)'),
  -- B : pas de trajet domicile-travail régulier -> commute_poste_label null.
  ('82222222-2222-2222-2222-222222222222', 300, 0, 0, 300, 'travel', 300, 'train', 'Voyages (Train)',
   null, 300, 'Voyages (Train)'),
  -- C : trajet domicile-travail régulier mais poste extras jamais calculé (cas défensif).
  ('83333333-3333-3333-3333-333333333333', 400, 400, 0, 0, 'commute', 400, 'bus', 'Trajet domicile-travail (Bus)',
   'Trajet domicile-travail (Bus)', null, null);

select public.generate_commute_checkins();
select public.generate_extras_checkins();

-- ── Boucle hebdomadaire (commute) ───────────────────────────────────────────────────────

select results_eq(
  $$ select loop_type, period_start, period_label, trip_label, status
     from public.engagement_checkins where user_id = '71111111-1111-1111-1111-111111111111' and loop_type = 'commute' $$,
  $$ select 'commute'::text, date_trunc('week', now())::date, 'Semaine du ' || to_char(date_trunc('week', now())::date, 'DD/MM'), 'Trajet domicile-travail (Voiture)'::text, 'pending'::text $$,
  'boucle commute : semaine ISO courante, libellé et trip_label repris de commute_poste_label'
);

select is(
  (select count(*) from public.engagement_checkins where user_id = '71111111-1111-1111-1111-111111111112' and loop_type = 'commute')::int,
  0,
  'boucle commute : aucun check-in pour un utilisateur sans trajet domicile-travail régulier (commute_poste_label null)'
);

select public.generate_commute_checkins();

select is(
  (select count(*) from public.engagement_checkins where user_id = '71111111-1111-1111-1111-111111111111' and loop_type = 'commute')::int,
  1,
  'idempotence : un second appel dans la même semaine ne duplique pas le check-in commute'
);

-- ── Boucle mensuelle (extras) ────────────────────────────────────────────────────────────

select results_eq(
  $$ select loop_type, period_start, period_label, trip_label, status
     from public.engagement_checkins where user_id = '71111111-1111-1111-1111-111111111111' and loop_type = 'extras' $$,
  $$ select 'extras'::text, date_trunc('month', now())::date,
     (array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'])[extract(month from date_trunc('month', now()))::int]
       || ' ' || extract(year from date_trunc('month', now()))::text,
     'Trajets loisirs (Voiture)'::text, 'pending'::text $$,
  'boucle extras : mois calendaire courant, libellé français et trip_label repris de extras_poste_label'
);

select is(
  (select count(*) from public.engagement_checkins where user_id = '71111111-1111-1111-1111-111111111113' and loop_type = 'extras')::int,
  0,
  'boucle extras : aucun check-in pour un utilisateur sans poste extras identifié (extras_poste_label null)'
);

select public.generate_extras_checkins();

select is(
  (select count(*) from public.engagement_checkins where user_id = '71111111-1111-1111-1111-111111111111' and loop_type = 'extras')::int,
  1,
  'idempotence : un second appel dans le même mois ne duplique pas le check-in extras'
);

-- ── Garde de privilège ───────────────────────────────────────────────────────────────────
-- Régression sur l'intention documentée dans la migration : la génération reste réservée au
-- cron (security definer), jamais appelable directement par un client.

select ok(
  not has_function_privilege('authenticated', 'public.generate_commute_checkins()', 'execute'),
  'authenticated ne doit jamais pouvoir exécuter generate_commute_checkins directement'
);

select ok(
  not has_function_privilege('authenticated', 'public.generate_extras_checkins()', 'execute'),
  'authenticated ne doit jamais pouvoir exécuter generate_extras_checkins directement'
);

select * from finish();
rollback;
