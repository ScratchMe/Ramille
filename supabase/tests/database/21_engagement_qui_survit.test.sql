-- Tests pgTAP de l'engagement qui survit — C2.2, migration 20260912150000_engagement_qui_survit.sql.
-- Constats A8-1, A13-5, A4-9, A8-2, A4-20. Schéma prescrit par `v1-14` §4.3.
--
-- Ce que ce fichier défend : **aucun chemin du produit ne détruit un engagement sans en laisser une
-- trace lisible.** Il y en a quatre, et ils se ressemblent assez pour qu'on en oublie un :
--
--   1. le re-bilan dans la même période (le plus fréquent — on corrige une réponse) ;
--   2. le changement de saison ;
--   3. « Changer d'avis » ;
--   4. « Choisir une autre action », dont la libération est une ligne **interne** de
--      `commit_plan_action` qui n'apparaît nulle part à l'écran.
--
-- ## Deux pièges de ce fichier, découverts en le construisant
--
-- **`now()` est figé pour toute la transaction de test**, et les deux gardes de la génération
-- comparent des horodatages. Sans précaution, les assertions passent **sans que le `delete` ait
-- lieu** — c'est-à-dire sans rien éprouver :
--
--   * `created_at >= submitted_at` renvoie avant toute reconstruction, puisque les deux valent
--     `now()`. D'où le `update plan_cycles set created_at = now() - interval …` avant chaque
--     re-bilan, même geste que le fichier 08 ;
--   * `order by submitted_at desc` ne sait pas trancher entre deux bilans soumis au même instant.
--     Le trigger de la section 7 posant `now()` à chaque passage en `completed`, **un re-bilan
--     rapproche les dates au lieu de les écarter** : il faut reculer explicitement l'ancien.
--
-- Et le corollaire qui vaut pour tous les fichiers : **une fixture ne peut plus choisir
-- `submitted_at` à l'insert.** Elle insère, puis met la date à jour — `old.status` et `new.status`
-- valant alors tous deux `completed`, le trigger ne réécrit rien.
begin;
create extension if not exists pgtap with schema extensions;

select plan(28);

-- ── Les gardes de la table, avant toute fixture ─────────────────────────────────────────

select has_table('public', 'plan_action_commitments_archive',
  'la table d''archive existe');
select has_column('public', 'plan_actions', 'carried_over_from',
  'plan_actions.carried_over_from : le cycle d''où vient une reconduction');

-- `plan_cycle_id` en `set null` et non en `cascade` : une archive qui disparaîtrait avec son cycle
-- ne serait qu'une copie de ce qui existe déjà.
select is(
  (select confdeltype::text from pg_constraint
   where conrelid = 'public.plan_action_commitments_archive'::regclass
     and confrelid = 'public.plan_cycles'::regclass),
  'n',
  'l''archive survit à la disparition d''un cycle (set null, pas cascade)'
);

-- Et la chaîne vers le compte cascade, elle : c'est la règle de la suppression de compte, que
-- 15_suppression_et_export vérifie niveau par niveau.
select is(
  (select confdeltype::text from pg_constraint
   where conrelid = 'public.plan_action_commitments_archive'::regclass
     and confrelid = 'public.profiles'::regclass),
  'c',
  'l''archive suit la suppression du compte (cascade depuis profiles)'
);

select ok(not has_function_privilege('authenticated',
    'public.archiver_engagement(uuid,uuid,uuid,smallint[],text,timestamptz,text)', 'execute'),
  'archiver_engagement : aucun client ne l''appelle — c''est une écriture serveur');
select ok(not has_function_privilege('anon',
    'public.archiver_engagement_de_laction(uuid,text)', 'execute'),
  'archiver_engagement_de_laction : révoquée de anon aussi (PUBLIC hérite, piège de 20260905170700)');

-- ── Fixtures ────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-engagement-' || right(u::text, 1) || '@test.local', 'x', now(), now()
from unnest(array[
  'c2200000-0000-0000-0000-000000000001'::uuid,  -- A : re-bilan, puis poste dominant qui change
  'c2200000-0000-0000-0000-000000000002',        -- B : changement de saison, gabarit reconduit
  'c2200000-0000-0000-0000-000000000003',        -- C : changement de saison, gabarit disparu
  'c2200000-0000-0000-0000-000000000004'         -- D : « changer d'avis » et « choisir une autre »
]) u;

-- Le même profil pour A, B, C, D : trajet domicile-travail de 20 km en voiture thermique, urbain
-- dense et bien desservi — le contexte B4 qui garantit au moins deux actions, sans quoi il n'y
-- aurait rien à engager.
insert into public.assessments (id, user_id, status)
select a, u, 'completed'
from unnest(
  array['c2210000-0000-0000-0000-000000000001'::uuid, 'c2210000-0000-0000-0000-000000000011',
        'c2210000-0000-0000-0000-000000000021', 'c2210000-0000-0000-0000-000000000031'],
  array['c2200000-0000-0000-0000-000000000001'::uuid, 'c2200000-0000-0000-0000-000000000002',
        'c2200000-0000-0000-0000-000000000003', 'c2200000-0000-0000-0000-000000000004']
) as t(a, u);

-- Le second bilan d'A, celui qui changera son poste dominant. Inséré en `in_progress` : il passera
-- en `completed` au moment du scénario, et c'est ce passage que le trigger horodate.
insert into public.assessments (id, user_id, status)
values ('c2210000-0000-0000-0000-000000000002', 'c2200000-0000-0000-0000-000000000001', 'in_progress');

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, leisure_mode,
  leisure_distance_bracket, leisure_car_engine, zone_type, tc_access, household_vehicles)
select a, true, 5, 20, 'voiture', 'thermique', 'weekly', 'voiture', '15_30', 'thermique',
       'urbain_dense', 'bon', '1'
from unnest(array['c2210000-0000-0000-0000-000000000001'::uuid, 'c2210000-0000-0000-0000-000000000011',
                  'c2210000-0000-0000-0000-000000000021', 'c2210000-0000-0000-0000-000000000031']) a;

-- Le second bilan d'A : plus aucun trajet régulier, donc plus aucun gabarit `commute` dans le plan.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip,
  leisure_frequency, leisure_mode, leisure_distance_bracket, zone_type, tc_access, household_vehicles)
values ('c2210000-0000-0000-0000-000000000002', false, 'weekly', 'bus', '15_30',
        'urbain_dense', 'bon', '1');

select public.recompute_assessment_results('c2210000-0000-0000-0000-000000000001');
select public.recompute_assessment_results('c2210000-0000-0000-0000-000000000011');
select public.recompute_assessment_results('c2210000-0000-0000-0000-000000000021');
select public.recompute_assessment_results('c2210000-0000-0000-0000-000000000031');

-- ── Le trigger : `submitted_at` vient du serveur ────────────────────────────────────────

select ok(
  (select submitted_at from public.assessments where id = 'c2210000-0000-0000-0000-000000000001')
    is not null,
  'submitted_at est posé par le serveur au passage en completed, sans que le client l''ait fourni'
);

select is(
  (select submitted_at from public.assessments where id = 'c2210000-0000-0000-0000-000000000002'),
  null,
  'un bilan encore in_progress n''a pas d''horodatage de soumission'
);

-- ── Scénario A1 : re-bilan dans la même période, gabarit conservé ───────────────────────

select set_config('test.cycle_a',
  (select id::text from public.plan_cycles where user_id = 'c2200000-0000-0000-0000-000000000001'), true);
select set_config('test.action_a',
  (select pa.id::text from public.plan_actions pa
   where pa.plan_cycle_id = current_setting('test.cycle_a')::uuid order by pa.rank limit 1), true);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c2200000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select lives_ok(
  $stmt$ select public.commit_plan_action(current_setting('test.action_a')::uuid, array[2,4]::smallint[], null) $stmt$,
  'A s''engage sur la première action de son plan, le mardi et le jeudi'
);
select set_config('role', 'postgres', true);

-- Sans ce recul, la garde d'idempotence renvoie et le `delete` n'a jamais lieu : l'assertion
-- suivante passerait sans rien éprouver.
update public.plan_cycles set created_at = now() - interval '1 hour'
where id = current_setting('test.cycle_a')::uuid;

select public.recompute_assessment_results('c2210000-0000-0000-0000-000000000001');

select results_eq(
  $$ select count(*)::int, max(intention_days::text), bool_and(carried_over_from is null)
     from public.plan_actions
     where plan_cycle_id = current_setting('test.cycle_a')::uuid and committed_at is not null $$,
  $$ values (1, '{2,4}'::text, true) $$,
  'A1 : le re-bilan reconstruit le plan et l''engagement y revient, jours compris — pas une reconduction'
);

-- Le `created_at` des lignes dit la reconstruction mieux que leur nombre, qui a cessé d'être deux
-- avec C4.6 (toutes les actions au gain suffisant sont désormais figées). Ce qu'on veut établir ici
-- est que les lignes sont **neuves** — sinon l'assertion précédente lirait l'engagement d'origine
-- resté en place, et ne prouverait rien.
select is(
  (select bool_and(pa.created_at >= pc.created_at) from public.plan_actions pa
   join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pa.plan_cycle_id = current_setting('test.cycle_a')::uuid),
  true,
  'A1 : et le plan a bien été reconstruit (des actions neuves), sinon l''assertion précédente ne prouverait rien'
);

select is(
  (select count(*)::int from public.plan_action_commitments_archive
   where user_id = 'c2200000-0000-0000-0000-000000000001'),
  0,
  'A1 : rien n''est archivé — l''engagement n''a pas été relâché, il a été repris'
);

-- ── Scénario A2 : re-bilan où le gabarit engagé disparaît ───────────────────────────────
-- Le re-bilan ci-dessus a réhorodaté le premier bilan à `now()` : sans reculer sa date, « le plus
-- récent » serait indéterminé entre les deux et le générateur pourrait reprendre l'ancien.

update public.assessments set submitted_at = now() - interval '2 hours'
where id = 'c2210000-0000-0000-0000-000000000001';

update public.plan_cycles set created_at = now() - interval '1 hour'
where id = current_setting('test.cycle_a')::uuid;

update public.assessments set status = 'completed'
where id = 'c2210000-0000-0000-0000-000000000002';
select public.recompute_assessment_results('c2210000-0000-0000-0000-000000000002');

select is(
  (select count(*)::int from public.plan_actions
   where plan_cycle_id = current_setting('test.cycle_a')::uuid and committed_at is not null),
  0,
  'A2 : le gabarit engagé n''est plus proposé — l''engagement ne survit pas, et c''est juste'
);

select results_eq(
  $$ select released_reason, intention_days::text, action_text is not null
     from public.plan_action_commitments_archive
     where user_id = 'c2200000-0000-0000-0000-000000000001' $$,
  $$ values ('rebilan'::text, '{2,4}'::text, true) $$,
  'A2 : il est archivé en « rebilan », avec son intention et le libellé figé de l''action'
);

-- Le libellé est **figé**, pas relu : c'est ce qui fait qu'une reformulation de gabarit (C3.8) ne
-- réécrit pas ce que la personne a lu au moment de choisir.
select is(
  (select count(*)::int from public.plan_action_commitments_archive a
   join public.action_templates t on t.id = a.action_template_id
   where a.user_id = 'c2200000-0000-0000-0000-000000000001' and a.action_text <> t.action_text),
  0,
  'A2 : le libellé archivé est celui du gabarit au moment de l''engagement'
);

-- ── Scénario B : changement de saison, gabarit reconduit ────────────────────────────────
-- Le cycle de B est reculé de cent jours, ce qui le place dans une saison révolue : le générateur
-- n'en trouve plus pour la période courante et en crée un neuf. Les réponses n'ayant pas changé,
-- le même gabarit y figure.

select set_config('test.cycle_b',
  (select id::text from public.plan_cycles where user_id = 'c2200000-0000-0000-0000-000000000002'), true);
select set_config('test.action_b',
  (select pa.id::text from public.plan_actions pa
   where pa.plan_cycle_id = current_setting('test.cycle_b')::uuid order by pa.rank limit 1), true);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c2200000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select public.commit_plan_action(current_setting('test.action_b')::uuid, array[1,3,5]::smallint[], null);
select set_config('role', 'postgres', true);

update public.plan_cycles
set period_start = period_start - 100, period_end = period_end - 100
where id = current_setting('test.cycle_b')::uuid;

select public.generate_plan_cycle_for_user('c2200000-0000-0000-0000-000000000002');

select is(
  (select count(*)::int from public.plan_cycles where user_id = 'c2200000-0000-0000-0000-000000000002'),
  2,
  'B : un cycle neuf est créé pour la période courante, l''ancien n''est pas touché'
);

select results_eq(
  $$ select pa.intention_days::text, pa.carried_over_from = current_setting('test.cycle_b')::uuid
     from public.plan_actions pa
     join public.plan_cycles pc on pc.id = pa.plan_cycle_id
     where pc.user_id = 'c2200000-0000-0000-0000-000000000002'
       and pc.id <> current_setting('test.cycle_b')::uuid
       and pa.committed_at is not null $$,
  $$ values ('{1,3,5}'::text, true) $$,
  'B : l''engagement est reconduit sur le cycle neuf, avec son intention et la marque de sa provenance'
);

-- L'ancien cycle garde le sien : c'est de l'historique, et l'index unique étant **par cycle**, les
-- deux coexistent sans conflit. L'effacer réécrirait ce qui a eu lieu cette saison-là.
select is(
  (select count(*)::int from public.plan_actions
   where plan_cycle_id = current_setting('test.cycle_b')::uuid and committed_at is not null),
  1,
  'B : la saison écoulée garde la trace de son propre engagement'
);

select is(
  (select count(*)::int from public.plan_action_commitments_archive
   where user_id = 'c2200000-0000-0000-0000-000000000002'),
  0,
  'B : une reconduction n''est pas une libération — rien n''est archivé'
);

-- ── Scénario C : changement de saison, gabarit absent du nouveau plan ──────────────────
-- Le cycle passé de C porte un engagement sur un gabarit de **voyages**, alors que son bilan est
-- entièrement domicile-travail : le plan de la saison courante ne le proposera pas. Le cycle et son
-- action sont posés à la main, comme le fait le fichier 13 — fabriquer ce cas par le calcul
-- demanderait deux bilans et ne prouverait rien de plus.

insert into public.plan_cycles (user_id, cadence_type, period_label, period_start, period_end,
  trip_label, poste, target_reduction_pct)
values ('c2200000-0000-0000-0000-000000000003', 'season', 'Saison révolue',
        current_date - 200, current_date - 110, 'Voyages longue distance (Avion)', 'travel', 20);

insert into public.plan_actions (plan_cycle_id, action_template_id, saving_kg_year, detail_text, rank,
  committed_at, intention_timing)
select pc.id, t.id, 900, 'Sur 1 vol long-courrier déclaré.', 1,
       now() - interval '150 days', 'prochaine_occasion'
from public.plan_cycles pc
cross join public.action_templates t
where pc.user_id = 'c2200000-0000-0000-0000-000000000003' and pc.period_label = 'Saison révolue'
  and t.poste = 'travel' and t.segment = 'flight_long';

-- Le cycle de la saison courante, construit par le bilan, est reculé lui aussi : sinon il existe
-- déjà et le générateur prend la branche du re-bilan, pas celle de la saison.
update public.plan_cycles
set period_start = period_start - 300, period_end = period_end - 300
where user_id = 'c2200000-0000-0000-0000-000000000003' and period_label <> 'Saison révolue';

select public.generate_plan_cycle_for_user('c2200000-0000-0000-0000-000000000003');

select results_eq(
  $$ select released_reason, intention_timing
     from public.plan_action_commitments_archive
     where user_id = 'c2200000-0000-0000-0000-000000000003' $$,
  $$ values ('saison'::text, 'prochaine_occasion'::text) $$,
  'C : un gabarit que le nouveau cycle ne propose plus est archivé en « saison », échéance comprise'
);

select is_empty(
  $$ select pa.id from public.plan_actions pa
     join public.plan_cycles pc on pc.id = pa.plan_cycle_id
     where pc.user_id = 'c2200000-0000-0000-0000-000000000003'
       and pc.period_label not in ('Saison révolue')
       and pa.carried_over_from is not null $$,
  'C : rien n''est marqué « reconduit » quand rien n''a pu l''être'
);

-- ── Scénario D : les deux chemins où la personne décide ─────────────────────────────────

select set_config('test.cycle_d',
  (select id::text from public.plan_cycles where user_id = 'c2200000-0000-0000-0000-000000000004'), true);
select set_config('test.action_d1',
  (select pa.id::text from public.plan_actions pa
   where pa.plan_cycle_id = current_setting('test.cycle_d')::uuid and pa.rank = 1), true);
select set_config('test.action_d2',
  (select pa.id::text from public.plan_actions pa
   where pa.plan_cycle_id = current_setting('test.cycle_d')::uuid and pa.rank = 2), true);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c2200000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);

select public.commit_plan_action(current_setting('test.action_d1')::uuid, array[2]::smallint[], null);

-- « Choisir une autre action » : la libération de la précédente est une ligne **interne** de
-- `commit_plan_action`, que rien n'affiche. C'était le plus discret des quatre chemins — et depuis
-- C4.6 il faut le **demander** (`p_replace`), ce qui ne le rend pas moins interne mais le rend
-- explicite au point d'appel.
select public.commit_plan_action(current_setting('test.action_d2')::uuid, array[3]::smallint[], null, true);

select is(
  (select count(*)::int from public.plan_action_commitments_archive
   where user_id = 'c2200000-0000-0000-0000-000000000004' and released_reason = 'changement'),
  1,
  'D : « choisir une autre action » archive la précédente en « changement »'
);

-- « Changer d'avis » : le second chemin, explicite celui-là.
select public.clear_plan_action_commitment(current_setting('test.action_d2')::uuid);

select is(
  (select count(*)::int from public.plan_action_commitments_archive
   where user_id = 'c2200000-0000-0000-0000-000000000004' and released_reason = 'changement'),
  2,
  'D : « changer d''avis » archive aussi — aucun chemin ne jette un engagement'
);

select is(
  (select count(*)::int from public.plan_actions
   where plan_cycle_id = current_setting('test.cycle_d')::uuid and committed_at is not null),
  0,
  'D : et le cycle n''a plus d''engagement vivant'
);

-- L'archive est en lecture propriétaire, et en écriture serveur seule : un `insert` direct est
-- refusé par le privilège (42501) avant même d'atteindre la RLS, comme pour `plan_actions`.
-- Quatre lignes existent dans la table à ce stade (une pour A, une pour C, deux pour D) : la
-- session de D n'en voit que les siennes. C'est la policy de lecture propriétaire, et c'est ce
-- compte-là qui la prouve — un `select *` sans filtre rendrait les quatre sans elle.
select is(
  (select count(*)::int from public.plan_action_commitments_archive),
  2,
  'D : sous sa session, la personne ne voit que ses propres engagements relâchés'
);

select throws_ok(
  $stmt$ insert into public.plan_action_commitments_archive
    (user_id, action_template_id, action_text, committed_at, released_reason)
    select 'c2200000-0000-0000-0000-000000000004', id, 'Action inventée', now(), 'changement'
    from public.action_templates limit 1 $stmt$,
  '42501',
  'permission denied for table plan_action_commitments_archive',
  'aucune écriture cliente sur l''archive — elle est un constat du serveur, pas une saisie'
);

select set_config('role', 'postgres', true);

-- ── La contrainte de cohérence de la reconduction ───────────────────────────────────────
-- Elle existe pour attraper un chemin de libération qui oublierait de remettre `carried_over_from`
-- à null — il est remis à null à trois endroits.

select throws_ok(
  $stmt$ update public.plan_actions
         set carried_over_from = plan_cycle_id
         where id = current_setting('test.action_d1')::uuid $stmt$,
  '23514',
  null,
  'une reconduction sans engagement est refusée par la base'
);

-- ── `nulls last` : un bilan sans horodatage ne décide de rien ───────────────────────────
-- Le trigger rend cet état **inatteignable** pour un bilan à venir ; c'est pour les lignes qui
-- existaient avant lui que l'ordre compte. Le trigger est donc désactivé le temps de la fixture —
-- la seule façon honnête d'éprouver ce que l'ordre protège.

alter table public.assessments disable trigger stamp_assessment_submitted_at;

insert into public.assessments (id, user_id, status, submitted_at)
values ('c2210000-0000-0000-0000-000000000099', 'c2200000-0000-0000-0000-000000000002', 'completed', null);
insert into public.assessment_answers (assessment_id, commute_has_regular_trip,
  leisure_frequency, leisure_mode, leisure_distance_bracket, zone_type, tc_access, household_vehicles)
values ('c2210000-0000-0000-0000-000000000099', false, 'weekly', 'bus', '15_30',
        'urbain_dense', 'bon', '1');

alter table public.assessments enable trigger stamp_assessment_submitted_at;

select public.recompute_assessment_results('c2210000-0000-0000-0000-000000000099');

select is(
  (select a.id from public.assessments a
   join public.assessment_results ar on ar.assessment_id = a.id
   where a.user_id = 'c2200000-0000-0000-0000-000000000002' and a.status = 'completed'
   order by a.submitted_at desc nulls last limit 1),
  'c2210000-0000-0000-0000-000000000011'::uuid,
  'nulls last : un bilan complété sans horodatage ne passe pas devant un bilan daté (A4-20)'
);

select * from finish();
rollback;
