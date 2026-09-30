-- Tests pgTAP : les deux boucles suivent le DERNIER bilan valide, jamais un plus ancien (30/09/2026,
-- migration `20260930092838_la_boucle_suit_le_dernier_bilan.sql`).
--
-- **Le défaut** : `generate_commute_checkins` et `generate_extras_checkins` filtraient le bilan
-- (« a-t-il un trajet ? », « a-t-il une base déclarée ? ») **avant** le `distinct on` qui garde le
-- plus récent. Quelqu'un qui refaisait son bilan sans trajet domicile-travail — il a déménagé, il
-- travaille chez lui — voyait donc son ancien bilan reprendre la main : chaque lundi, la question
-- d'un trajet qu'il venait de dire ne plus faire, sous un plan bâti sur le nouveau bilan qui, lui,
-- n'en portait plus aucune action. Même chose chaque mois pour qui passait à « sorties rares, aucun
-- voyage ». Relevé le 29/09/2026 en écrivant les vues du lot 6, corrigé le lendemain.
--
-- **Le dernier bilan valide** est celui que `generate_plan_cycle_for_user` retient : `completed`,
-- résultat calculé, le plus récent par `submitted_at`. **Deux conditions précèdent le tri, et ce sont
-- celles du plan** : le statut — un bilan retiré (C4.7) n'est jamais le dernier, profil J3 — et un
-- résultat calculé — un bilan passé en `completed` dont le calcul a échoué non plus, profil J4.
--
-- **Éprouvé en le cassant, le 30/09/2026** (TESTING.md §1.1) : rejoué d'abord sur les générateurs
-- d'avant, il faisait tomber les deux assertions du profil J1, et elles seules. Puis cinq
-- mutations des générateurs corrigés, retirées ensuite :
--   - le filtre du trajet remonté dans le choix du dernier bilan (l'état d'avant, boucle
--     hebdomadaire seule) → « J1 : pas de question sur le trajet », seule ;
--   - le filtre de la base déclarée remonté de même (boucle mensuelle seule) → « J1 : pas de
--     question du mois », seule ;
--   - le statut retiré du choix du dernier bilan, puis filtré après lui → les deux assertions de J3,
--     dont le bilan retiré redevenait le dernier ;
--   - le tri inversé (`submitted_at asc`) → les deux assertions de J2 et les deux de J1 ;
--   - le résultat retiré du choix du dernier bilan (la jointure de `dernier`) → les deux assertions
--     de J4, et elles seules : son bilan sans résultat redevenait le dernier, puis tombait au filtre.
--
-- **Rejouées le même jour après l'extraction** (`20260930120000`, `v1-27` §12.22) : le choix du dernier
-- bilan ne vit plus dans chaque générateur mais dans `boucles_du_dernier_bilan`, que les deux lisent.
-- Les cinq mutations y ont été posées à nouveau. Trois tombent comme avant — le statut (J3), le tri
-- (J1 et J2), le résultat (J4). Les deux filtres remontés dans le choix font désormais tomber **les
-- deux** assertions de J1, et non plus chacun la sienne : le choix est partagé, donc un filtre qui y
-- remonte écarte le nouveau bilan pour les deux boucles à la fois.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- ── Fixtures ────────────────────────────────────────────────────────────────────────────
-- Quatre profils, deux bilans chacun. L'ancien est reculé de trente jours après l'insertion : une
-- fixture ne choisit pas `submitted_at` à l'insert (CLAUDE.md, C2.2).

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-dernier-bilan-' || right(u::text, 1) || '@test.local', 'x', now(), false, now(), now()
from unnest(array[
  'e3800000-0000-0000-0000-000000000001'::uuid,  -- J1 : ne fait plus de trajet, ne sort plus
  'e3800000-0000-0000-0000-000000000002',        -- J2 : témoin — le nouveau bilan a tout
  'e3800000-0000-0000-0000-000000000003',        -- J3 : le nouveau bilan est retiré
  'e3800000-0000-0000-0000-000000000004'         -- J4 : le calcul du nouveau bilan a échoué
]) u;

insert into public.assessments (id, user_id, status)
values
  ('e3810000-0000-0000-0000-0000000000a1', 'e3800000-0000-0000-0000-000000000001', 'completed'),
  ('e3810000-0000-0000-0000-0000000000a2', 'e3800000-0000-0000-0000-000000000001', 'completed'),
  ('e3810000-0000-0000-0000-0000000000b1', 'e3800000-0000-0000-0000-000000000002', 'completed'),
  ('e3810000-0000-0000-0000-0000000000b2', 'e3800000-0000-0000-0000-000000000002', 'completed'),
  ('e3810000-0000-0000-0000-0000000000c1', 'e3800000-0000-0000-0000-000000000003', 'completed'),
  ('e3810000-0000-0000-0000-0000000000c2', 'e3800000-0000-0000-0000-000000000003', 'completed'),
  ('e3810000-0000-0000-0000-0000000000d1', 'e3800000-0000-0000-0000-000000000004', 'completed'),
  ('e3810000-0000-0000-0000-0000000000d2', 'e3800000-0000-0000-0000-000000000004', 'completed');

update public.assessments set submitted_at = now() - interval '30 days'
where id in ('e3810000-0000-0000-0000-0000000000a1', 'e3810000-0000-0000-0000-0000000000b1',
             'e3810000-0000-0000-0000-0000000000c1', 'e3810000-0000-0000-0000-0000000000d1');

-- Le profil qui reçoit les deux boucles : un trajet en voiture thermique, des sorties chaque
-- semaine en voiture. C'est l'ancien bilan de J1, de J3 et de J4, et le nouveau de J2.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, leisure_mode,
  leisure_distance_bracket, leisure_car_engine, household_vehicles, zone_type, tc_access)
select id, true, 5, 20, 'voiture', 'thermique', 'weekly', 'voiture', '15_30', 'thermique', '1',
       'periurbain', 'bon'
from unnest(array['e3810000-0000-0000-0000-0000000000a1'::uuid, 'e3810000-0000-0000-0000-0000000000b2',
                  'e3810000-0000-0000-0000-0000000000c1', 'e3810000-0000-0000-0000-0000000000d1']) id;

-- Le profil qui n'en reçoit aucune : aucun trajet régulier, sorties rares, aucun voyage. C'est le
-- nouveau bilan de J1, de J3 et de J4, et l'ancien de J2.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  household_vehicles, zone_type, tc_access)
select id, false, 'rarely', '1', 'urbain_dense', 'bon'
from unnest(array['e3810000-0000-0000-0000-0000000000a2'::uuid, 'e3810000-0000-0000-0000-0000000000b1',
                  'e3810000-0000-0000-0000-0000000000c2', 'e3810000-0000-0000-0000-0000000000d2']) id;

-- Dans l'ordre des dates. Le plan de chacun reste bâti sur son **premier** recalcul — `now()` est
-- figé dans la transaction, donc la garde d'idempotence renvoie au second —, et ce n'est pas ce que
-- ce fichier éprouve : les générateurs ne lisent le plan qu'à travers une action engagée, et aucune
-- ne l'est ici.
select public.recompute_assessment_results('e3810000-0000-0000-0000-0000000000a1');
select public.recompute_assessment_results('e3810000-0000-0000-0000-0000000000b1');
select public.recompute_assessment_results('e3810000-0000-0000-0000-0000000000c1');
select public.recompute_assessment_results('e3810000-0000-0000-0000-0000000000d1');
select public.recompute_assessment_results('e3810000-0000-0000-0000-0000000000a2');
select public.recompute_assessment_results('e3810000-0000-0000-0000-0000000000b2');
select public.recompute_assessment_results('e3810000-0000-0000-0000-0000000000c2');
-- Le nouveau bilan de J4 n'est pas calculé : c'est l'état que laisse un calcul qui échoue après le
-- passage en `completed` (CLAUDE.md, « La soumission écrit `in_progress` d'abord »).

-- J3 retire son nouveau bilan, par le seul chemin du produit — sous sa propre session.
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'e3800000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
select public.retirer_le_bilan('e3810000-0000-0000-0000-0000000000c2');
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', '', true);

-- **Les prémisses** : sans elles, l'absence de point chez J1 pourrait venir d'un ancien bilan qui
-- ne qualifiait pas non plus, et celle de J3 d'un retrait qui n'aurait pas eu lieu.
select ok(
  (select ar.commute_poste_label is not null and ar.extras_poste_label is not null
   from public.assessment_results ar where ar.assessment_id = 'e3810000-0000-0000-0000-0000000000a1')
  and (select ar.commute_poste_label is null
       from public.assessment_results ar where ar.assessment_id = 'e3810000-0000-0000-0000-0000000000a2'),
  'prémisse : l''ancien bilan de J1 qualifiait pour les deux boucles, le nouveau pour aucune'
);

select is(
  (select status from public.assessments where id = 'e3810000-0000-0000-0000-0000000000c2'),
  'withdrawn',
  'prémisse : le nouveau bilan de J3 est retiré'
);

select ok(
  not exists (select 1 from public.assessment_results where assessment_id = 'e3810000-0000-0000-0000-0000000000d2'),
  'prémisse : le nouveau bilan de J4 est complété sans résultat'
);

select public.generate_commute_checkins();
select public.generate_extras_checkins();

-- ── J1 — le nouveau bilan dit « plus de trajet, plus de sorties », et la boucle l'écoute ─────

select is(
  (select count(*)::int from public.engagement_checkins
   where user_id = 'e3800000-0000-0000-0000-000000000001' and loop_type = 'commute'),
  0,
  'J1 : pas de question sur le trajet — l''ancien bilan ne reprend pas la main'
);

select is(
  (select count(*)::int from public.engagement_checkins
   where user_id = 'e3800000-0000-0000-0000-000000000001' and loop_type = 'extras'),
  0,
  'J1 : pas de question du mois — sorties rares, aucun voyage déclaré dans le dernier bilan'
);

-- ── J2 — le témoin : le dernier bilan a tout, les deux boucles viennent de lui ────────────
-- Sans lui, les deux zéros de J1 pourraient venir d'un générateur qui ne génère plus rien.

select results_eq(
  $$ select trip_label, question_kind, mode from public.engagement_checkins
     where user_id = 'e3800000-0000-0000-0000-000000000002' and loop_type = 'commute' $$,
  $$ select ar.commute_poste_label, 'generique'::text, ar.commute_poste_mode
     from public.assessment_results ar where ar.assessment_id = 'e3810000-0000-0000-0000-0000000000b2' $$,
  'J2 : la question du trajet vient du nouveau bilan'
);

select results_eq(
  $$ select trip_label, poste from public.engagement_checkins
     where user_id = 'e3800000-0000-0000-0000-000000000002' and loop_type = 'extras' $$,
  $$ select ar.extras_poste_label, ar.extras_poste
     from public.assessment_results ar where ar.assessment_id = 'e3810000-0000-0000-0000-0000000000b2' $$,
  'J2 : la question du mois vient du nouveau bilan'
);

-- ── J3 — un bilan retiré n'est pas le dernier : l'ancien, redevenu valide, porte les boucles ─

select results_eq(
  $$ select trip_label from public.engagement_checkins
     where user_id = 'e3800000-0000-0000-0000-000000000003' and loop_type = 'commute' $$,
  $$ select ar.commute_poste_label
     from public.assessment_results ar where ar.assessment_id = 'e3810000-0000-0000-0000-0000000000c1' $$,
  'J3 : le bilan retiré ne compte pas, la question du trajet vient du bilan valide qui reste'
);

select results_eq(
  $$ select trip_label from public.engagement_checkins
     where user_id = 'e3800000-0000-0000-0000-000000000003' and loop_type = 'extras' $$,
  $$ select ar.extras_poste_label
     from public.assessment_results ar where ar.assessment_id = 'e3810000-0000-0000-0000-0000000000c1' $$,
  'J3 : de même pour la question du mois'
);

-- ── J4 — un bilan sans résultat n'est pas le dernier : les boucles suivent le plan ────────
-- Le plan lit le dernier bilan **calculé** ; les boucles aussi, sans quoi elles se tairaient sur un
-- bilan que le plan ignore.

select results_eq(
  $$ select trip_label from public.engagement_checkins
     where user_id = 'e3800000-0000-0000-0000-000000000004' and loop_type = 'commute' $$,
  $$ select ar.commute_poste_label
     from public.assessment_results ar where ar.assessment_id = 'e3810000-0000-0000-0000-0000000000d1' $$,
  'J4 : le bilan sans résultat ne compte pas, la question du trajet vient du bilan calculé'
);

select results_eq(
  $$ select trip_label from public.engagement_checkins
     where user_id = 'e3800000-0000-0000-0000-000000000004' and loop_type = 'extras' $$,
  $$ select ar.extras_poste_label
     from public.assessment_results ar where ar.assessment_id = 'e3810000-0000-0000-0000-0000000000d1' $$,
  'J4 : de même pour la question du mois'
);

select * from finish();
rollback;
