-- Tests pgTAP de `generate_commute_checkins`/`generate_extras_checkins`
-- (docs/architecture/v1-02-boucle-engagement.md, increment 11 — deux boucles indépendantes
-- plutôt qu'une boucle mensuelle unique). Comme `generate_plan_cycle_for_user` (02), ces
-- fonctions ne lisent pas `auth.uid()` — pas besoin de simuler une requête authentifiée —
-- mais RESTENT volontairement inexécutables par un client (`revoke execute ...`), vérifié en
-- fin de fichier. L'isolation par utilisateur (lecture, pas d'insert client) est couverte par
-- 03_rls_policies.test.sql ; ce fichier se concentre sur la logique de génération elle-même —
-- éligibilité par boucle, cadence, libellés, idempotence — et sur ce qu'une réponse est autorisée
-- à changer de cette génération, depuis que la réponse passe par `repondre_au_checkin`
-- (20260911100000, chantier C1.12) : trois colonnes, et pas une de plus.
begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

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
   'Trajet domicile-travail (Voiture)', 100, 'Loisirs du week-end (Voiture)'),
  -- B : pas de trajet domicile-travail régulier -> commute_poste_label null.
  ('82222222-2222-2222-2222-222222222222', 300, 0, 0, 300, 'travel', 300, 'train', 'Voyages longue distance (Train)',
   null, 300, 'Voyages longue distance (Train)'),
  -- C : trajet domicile-travail régulier mais poste extras jamais calculé (cas défensif).
  ('83333333-3333-3333-3333-333333333333', 400, 400, 0, 0, 'commute', 400, 'bus', 'Trajet domicile-travail (Bus)',
   'Trajet domicile-travail (Bus)', null, null);

select public.generate_commute_checkins();
select public.generate_extras_checkins();

-- ── Boucle hebdomadaire (commute) ───────────────────────────────────────────────────────

select results_eq(
  $$ select loop_type, period_start, period_label, trip_label, status
     from public.engagement_checkins where user_id = '71111111-1111-1111-1111-111111111111' and loop_type = 'commute' $$,
  -- **La semaine ÉCOULÉE, pas celle qui commence** (C2.3) : le cron passe toujours le lundi 6 h,
  -- mais la question porte sur la semaine qui vient de finir. Générée pour la semaine en cours,
  -- elle arrivait quand aucun trajet n'avait encore eu lieu, et la seule réponse honnête était
  -- « Non » — suivie de la consolation.
  $$ select 'commute'::text, date_trunc('week', now())::date - 7, 'Semaine du ' || to_char(date_trunc('week', now())::date - 7, 'DD/MM'), 'Trajet domicile-travail (Voiture)'::text, 'pending'::text $$,
  'boucle commute : semaine ISO écoulée, libellé et trip_label repris de commute_poste_label'
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
  -- Le mois **écoulé**, même raison que pour la semaine. Le tableau des douze mois est recopié
  -- ici exprès : il épingle `public.mois_francais`, il ne l'appelle pas — un test qui appelle la
  -- fonction qu'il vérifie ne vérifie rien.
  $$ select 'extras'::text, (date_trunc('month', now()) - interval '1 month')::date,
     (array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'])[extract(month from (date_trunc('month', now()) - interval '1 month'))::int]
       || ' ' || extract(year from (date_trunc('month', now()) - interval '1 month'))::text,
     'Loisirs du week-end (Voiture)'::text, 'pending'::text $$,
  'boucle extras : mois calendaire écoulé, libellé français et trip_label repris de extras_poste_label'
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

-- ── La réponse : un RPC, et rien que trois colonnes (20260911100000) ────────────────────
-- Le point est généré côté serveur avec des libellés snapshotés et un `period_start` qui sert de
-- clé d'idempotence (les assertions plus haut). Répondre ne doit toucher que `status`, `response`
-- et `responded_at` : c'est pourquoi `engagement_checkins` n'a plus ni policy ni privilège UPDATE
-- et que la réponse passe par `repondre_au_checkin` — une policy UPDATE aurait ouvert **toutes**
-- les colonnes, la RLS raisonnant par ligne et jamais par colonne.
--
-- Le point de C est passé à `expired` comme le fait la génération de la période suivante
-- (20260904180000) : il sert de second refus, à côté du point déjà répondu de A.

update public.engagement_checkins
set status = 'expired'
where user_id = '71111111-1111-1111-1111-111111111113' and loop_type = 'commute';

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', '71111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- Capturé sous la session du propriétaire : plus bas, la même sous-requête exécutée sous celle du
-- tiers ne verrait rien et passerait NULL au RPC, qui échouerait sans avoir éprouvé la
-- vérification de propriété qu'on veut tester.
select set_config('test.checkin_commute_a',
  (select id::text from public.engagement_checkins
   where user_id = '71111111-1111-1111-1111-111111111111' and loop_type = 'commute'), true);

select lives_ok(
  $stmt$ select public.repondre_au_checkin(current_setting('test.checkin_commute_a')::uuid, true) $stmt$,
  'répondre à son point de suivi par le RPC'
);

select results_eq(
  $$ select status, response from public.engagement_checkins
     where id = current_setting('test.checkin_commute_a')::uuid $$,
  $$ select 'answered'::text, true $$,
  'la réponse pose le statut et la réponse elle-même'
);

-- `now()` est l'horodatage de début de transaction : si la valeur venait d'un paramètre du client
-- (ce qu'elle faisait jusqu'au 11/09/2026), elle n'aurait aucune raison de lui être égale.
select is(
  (select responded_at from public.engagement_checkins where id = current_setting('test.checkin_commute_a')::uuid),
  now(),
  'l''horodatage de la réponse vient de l''horloge du serveur, pas de celle du téléphone'
);

select results_eq(
  $$ select period_start, period_label, trip_label from public.engagement_checkins
     where id = current_setting('test.checkin_commute_a')::uuid $$,
  $$ select date_trunc('week', now())::date - 7,
            'Semaine du ' || to_char(date_trunc('week', now())::date - 7, 'DD/MM'),
            'Trajet domicile-travail (Voiture)'::text $$,
  'répondre ne touche ni les libellés snapshotés ni la clé d''idempotence de la génération'
);

select throws_ok(
  $stmt$ select public.repondre_au_checkin(current_setting('test.checkin_commute_a')::uuid, false) $stmt$,
  '22023', null,
  'un point déjà répondu n''accepte pas une seconde réponse'
);

-- Même sous la session du propriétaire, un ordre direct est refusé par le privilège (42501) avant
-- d'atteindre la RLS : c'est la garde qui met les libellés snapshotés hors d'atteinte.
select throws_ok(
  $stmt$ update public.engagement_checkins set trip_label = 'Trajet réécrit' where user_id = '71111111-1111-1111-1111-111111111111' $stmt$,
  '42501',
  'permission denied for table engagement_checkins',
  'aucun libellé snapshoté ne se réécrit depuis le client, même par son propriétaire'
);

select is(
  (select trip_label from public.engagement_checkins where id = current_setting('test.checkin_commute_a')::uuid),
  'Trajet domicile-travail (Voiture)',
  'et le libellé est intact après la tentative'
);

select set_config('request.jwt.claims', json_build_object('sub', '71111111-1111-1111-1111-111111111112', 'role', 'authenticated')::text, true);

select throws_ok(
  $stmt$ select public.repondre_au_checkin(current_setting('test.checkin_commute_a')::uuid, true) $stmt$,
  'P0002', null,
  'un tiers ne peut pas répondre à la place de quelqu''un d''autre'
);

select set_config('request.jwt.claims', json_build_object('sub', '71111111-1111-1111-1111-111111111113', 'role', 'authenticated')::text, true);

select throws_ok(
  $stmt$ select public.repondre_au_checkin(
    (select id from public.engagement_checkins where loop_type = 'commute'), true) $stmt$,
  '22023', null,
  'un point clos par la génération de la période suivante n''accepte plus de réponse'
);

reset role;

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

-- Le RPC de réponse est l'exception exactement inverse : il doit rester appelable par le client,
-- c'est la vérification de propriété à l'intérieur qui protège. `anon` n'en a pas besoin — la
-- session anonyme du produit porte le rôle `authenticated`, jamais celui-là — et PUBLIC encore
-- moins (l'héritage de PUBLIC est le piège de 20260905170700).
select ok(
  has_function_privilege('authenticated', 'public.repondre_au_checkin(uuid, boolean)', 'execute')
    and not has_function_privilege('anon', 'public.repondre_au_checkin(uuid, boolean)', 'execute'),
  'repondre_au_checkin : exécutable par authenticated seul'
);

-- Le trigger qui refuse de réécrire un point déjà répondu gardait, lui, l'ACL par défaut de
-- PostgreSQL — `EXECUTE` à PUBLIC, dont `anon` et `authenticated` héritent. 20260911100000 la
-- ferme, comme 20260905170700 l'avait fait pour les deux triggers de la mesure d'usage. Sans cette
-- assertion, un `create or replace` ultérieur rendrait le droit à PUBLIC sans que rien ne tombe.
select ok(
  not has_function_privilege('authenticated', 'public.prevent_answered_checkin_update()', 'execute')
    and not has_function_privilege('anon', 'public.prevent_answered_checkin_update()', 'execute'),
  'prevent_answered_checkin_update : execute révoqué de PUBLIC comme les deux triggers de la mesure d''usage'
);

select * from finish();
rollback;
