-- Tests pgTAP de C6.4 — le contexte se corrige sans resoumettre de bilan.
-- Migration `20260919230000_le_contexte_sort_du_questionnaire.sql`, décision D5 de `v1-19`.
--
-- Ce que ce fichier défend, et qui n'est pas ce que l'issue #232 annonçait. Elle posait le choix
-- sur `household_vehicles` seule, « la seule des quatre réponses de contexte qui touche un
-- chiffre ». **Relevé dans la définition vivante de `recompute_assessment_results` le 19/09/2026,
-- elles sont trois** : `household_vehicles` décide du mode du résiduel des sorties rares, et
-- `tc_access` **et** `zone_type` décident ensemble de `mobility_constrained`, figé sur
-- `assessment_results` et lu par la restitution (C3.1). Un recalcul conditionné à la seule
-- première aurait donc laissé le second périmé — l'encart du plan disant « rural, desserte
-- limitée » pendant que la restitution continue de comparer la personne à une moyenne qu'on avait
-- décidé de lui taire.
--
-- D'où les deux scénarios : un profil **sobre** (sorties rares) pour la moitié « chiffre », un
-- profil **contraint** pour la moitié « repère ». Et dans les deux, l'assertion qui compte autant
-- que les autres : `submitted_at` ne bouge pas. Recalculer n'est pas resoumettre.
--
-- **Deux pièges de ce fichier, tous deux payés en l'écrivant.**
--
-- `now()` est figé pour toute la transaction, donc la garde d'idempotence de
-- `generate_plan_cycle_for_user` (`created_at >= submitted_at`) renvoie systématiquement. C'est
-- exactement ce que `p_cause = 'contexte'` fait sauter — et c'est donc **ici** que la garde neuve
-- se prouve : sans le saut, le plan ne serait pas reconstruit et l'assertion sur le nombre
-- d'actions passerait sans rien éprouver.
--
-- Et **une lecture faite sous le mauvais rôle ne prouve rien** : tant que `role` vaut
-- `authenticated` avec le jeton de S, la RLS owner-scoped rend les lignes de C invisibles, donc un
-- relevé « avant » y vaudrait zéro et toute comparaison « après » serait vraie par accident. Chaque
-- relevé se fait donc sous `postgres`, et seul l'appel du RPC se fait sous le rôle de la personne.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- ── Ce que le schéma garantit, avant toute fixture ──────────────────────────────────────

select ok(
  has_function_privilege('authenticated',
    'public.mettre_a_jour_le_contexte(text,text,text,text)', 'execute'),
  'mettre_a_jour_le_contexte : appelable par une session'
);

-- `anon` n'a aucun bilan à corriger — et le RPC lève de toute façon sans `auth.uid()`. Le grant
-- explicite est ce qui rend la chose vraie sans dépendre de ce raisonnement.
select ok(
  not has_function_privilege('anon',
    'public.mettre_a_jour_le_contexte(text,text,text,text)', 'execute'),
  'mettre_a_jour_le_contexte : révoquée de anon'
);

-- La régénération reste une écriture serveur, et les trois rôles sont nommés : Supabase accorde
-- `EXECUTE` à `PUBLIC` sur une fonction neuve, donc oublier `public` ne révoque rien (C4.6).
select ok(
  not has_function_privilege('authenticated', 'public.generate_plan_cycle_for_user(uuid,text)', 'execute')
  and not has_function_privilege('anon', 'public.generate_plan_cycle_for_user(uuid,text)', 'execute'),
  'generate_plan_cycle_for_user : aucun client ne la régénère lui-même'
);

-- L'ancienne signature ne survit pas à côté de la nouvelle : `f(uuid)` serait ambigu, et les deux
-- appelants (le cron, le calcul du bilan) l'émettent sous cette forme.
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'generate_plan_cycle_for_user'),
  1,
  'une seule signature de generate_plan_cycle_for_user : la précédente est remplacée, pas doublée'
);

-- ── Fixtures ────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-contexte-' || right(u::text, 1) || '@test.local', 'x', now(), now()
from unnest(array[
  'c6400000-0000-0000-0000-000000000001'::uuid,  -- S : sobre, sorties rares, aucun véhicule
  'c6400000-0000-0000-0000-000000000002'         -- C : gros rouleur, urbain dense bien desservi
]) u;

insert into public.assessments (id, user_id, status)
values ('c6410000-0000-0000-0000-000000000001', 'c6400000-0000-0000-0000-000000000001', 'completed'),
       ('c6410000-0000-0000-0000-000000000002', 'c6400000-0000-0000-0000-000000000002', 'completed');

-- S — le profil du constat : à pied, **un seul jour** de trajet, sorties rares, aucun véhicule. Le
-- jour unique n'est pas décoratif : c'est ce qui fait que B4.4 ne se pose pas (`teletravailSePose`
-- exige deux jours, C5.4), donc que le quatrième argument du RPC vaut légitimement `null`. Son
-- total tient presque entièrement au résiduel de sorties, dont le mode se choisit sur
-- `household_vehicles`.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, leisure_frequency, zone_type, tc_access, household_vehicles)
values ('c6410000-0000-0000-0000-000000000001', true, 1, 2, 'marche', 'rarely',
        'urbain_dense', 'bon', '0');

-- C — cinq jours de voiture thermique, urbain dense et bien desservi : le contexte qui ouvre le
-- plus d'actions, donc celui où en fermer se mesure.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, leisure_mode,
  leisure_distance_bracket, leisure_car_engine, zone_type, tc_access, household_vehicles, teletravail)
values ('c6410000-0000-0000-0000-000000000002', true, 5, 20, 'voiture', 'thermique', 'weekly',
        'voiture', '15_30', 'thermique', 'urbain_dense', 'bon', '1', 'deux_ou_plus');

select public.recompute_assessment_results('c6410000-0000-0000-0000-000000000001');
select public.recompute_assessment_results('c6410000-0000-0000-0000-000000000002');

-- ── Relevés « avant », sous postgres — cf. le second piège en tête de fichier ───────────

select set_config('test.total_s',
  (select total_co2_kg_year::text from public.assessment_results
   where assessment_id = 'c6410000-0000-0000-0000-000000000001'), true);
select set_config('test.soumis_s',
  (select submitted_at::text from public.assessments
   where id = 'c6410000-0000-0000-0000-000000000001'), true);
select set_config('test.cycle_c',
  (select id::text from public.plan_cycles
   where user_id = 'c6400000-0000-0000-0000-000000000002'), true);
select set_config('test.actions_c',
  (select count(*)::text from public.plan_actions
   where plan_cycle_id = current_setting('test.cycle_c')::uuid), true);

select cmp_ok(current_setting('test.actions_c')::int, '>', 0,
  'le profil C part avec un plan non vide — sans quoi la suite ne prouverait rien');

select is(
  (select mobility_constrained from public.assessment_results
   where assessment_id = 'c6410000-0000-0000-0000-000000000002'),
  false,
  'urbain dense et bien desservi : la mobilité n’est pas contrainte'
);

-- ── Scénario S : le foyer gagne un véhicule, et le chiffre bouge ────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c6400000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ select public.mettre_a_jour_le_contexte('urbain_dense', 'bon', '1', null) $$,
  'un profil dont B4.4 ne se pose pas enregistre bien un quatrième argument nul'
);

select set_config('role', 'postgres', true);

select ok(
  (select total_co2_kg_year from public.assessment_results
   where assessment_id = 'c6410000-0000-0000-0000-000000000001')
  > current_setting('test.total_s')::numeric,
  'sorties rares : household_vehicles entre dans le total — le résiduel passe du train à la voiture'
);

-- **L'assertion qui définit le chantier.** Tout le reste peut bouger ; cette date, non — c'est
-- elle qui distingue « recalculer » de « resoumettre », et c'est elle que lisent l'âge du bilan,
-- le régime de re-bilan et l'entrée du suivi.
select is(
  (select submitted_at::text from public.assessments where id = 'c6410000-0000-0000-0000-000000000001'),
  current_setting('test.soumis_s'),
  'corriger son contexte ne resoumet pas le bilan : submitted_at ne bouge pas'
);

select is(
  (select count(*)::int from public.assessments where user_id = 'c6400000-0000-0000-0000-000000000001'),
  1,
  'et aucun second bilan n’apparaît dans le suivi'
);

-- ── Scénario C : la desserte disparaît, le plan se referme ──────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c6400000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ select public.mettre_a_jour_le_contexte('rural', 'inexistant', '1', 'deux_ou_plus') $$,
  'le contexte se durcit sans erreur'
);

-- ── Les refus, tant que la session est celle de C ──────────────────────────────────────
-- **Une réponse ne s'efface pas** (C3.8) : une condition qu'on ne peut pas évaluer n'est pas
-- remplie, donc vider une réponse retire des actions — en silence, et dans le sens qui appauvrit.

select throws_ok(
  $$ select public.mettre_a_jour_le_contexte(null, 'bon', '1', null) $$,
  'RM003', null,
  'une zone vidée est refusée, et reconnue à son code'
);

select throws_ok(
  $$ select public.mettre_a_jour_le_contexte('rural', null, '1', null) $$,
  'RM003', null,
  'un accès aux transports vidé est refusé'
);

select throws_ok(
  $$ select public.mettre_a_jour_le_contexte('rural', 'bon', null, null) $$,
  'RM003', null,
  'un nombre de véhicules vidé est refusé'
);

select set_config('role', 'postgres', true);

-- La moitié « repère » : `tc_access` et `zone_type` ne changent aucun total, mais décident de ce
-- que la restitution montre. Sans recalcul, cette valeur serait restée fausse en silence.
select is(
  (select mobility_constrained from public.assessment_results
   where assessment_id = 'c6410000-0000-0000-0000-000000000002'),
  true,
  'mobility_constrained suit le contexte : la restitution ne compare plus à la moyenne française'
);

-- Et la moitié « plan » : le filtre de plausibilité de C3.8 referme les gabarits qui supposaient
-- un métro. C'est **aussi** la preuve que la garde d'idempotence a été sautée — `now()` étant figé,
-- une régénération de cause `bilan` serait repartie sans rien reconstruire.
select cmp_ok(
  (select count(*)::int from public.plan_actions
   where plan_cycle_id = current_setting('test.cycle_c')::uuid),
  '<',
  current_setting('test.actions_c')::int,
  'le plan est reconstruit et perd les actions que le nouveau contexte rend impossibles'
);

-- ── La quatrième raison de libération ───────────────────────────────────────────────────
-- La preuve par le comportement, que le contrôle de la migration ne peut pas faire : celui-ci doit
-- se rejouer sur une base vierge, où il n'y a ni compte ni gabarit à quoi rattacher une ligne.

select lives_ok(
  $$ insert into public.plan_action_commitments_archive
       (user_id, plan_cycle_id, action_template_id, action_text, released_reason, committed_at)
     values ('c6400000-0000-0000-0000-000000000002', null,
             (select id from public.action_templates order by action_text limit 1),
             'Contrôle de la quatrième raison.', 'contexte', now()) $$,
  'released_reason accepte « contexte » : un changement de contexte peut libérer un engagement'
);

select throws_ok(
  $$ insert into public.plan_action_commitments_archive
       (user_id, plan_cycle_id, action_template_id, action_text, released_reason, committed_at)
     values ('c6400000-0000-0000-0000-000000000002', null,
             (select id from public.action_templates order by action_text limit 1),
             'Contrôle du refus.', 'nimporte_quoi', now()) $$,
  '23514', null,
  'et refuse toujours une raison inconnue — la contrainte n’a pas été desserrée, elle a été étendue'
);

select * from finish();
rollback;
