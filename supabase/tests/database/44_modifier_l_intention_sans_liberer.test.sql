-- Tests pgTAP : modifier l'intention sans libérer l'engagement (`v1-33` D15, migration
-- `20261002220000_modifier_l_intention_sans_liberer.sql`).
--
-- « Modifier les jours » et « Modifier l'échéance » rappellent `commit_plan_action` sur l'action déjà
-- engagée. Ce fichier garde ce que ce second appel fait, et ce qu'il ne fait pas :
--   - **T** (trajet, « le mardi et le jeudi », choisi il y a vingt jours) : les mêmes jours dans un
--     autre ordre ne réécrivent rien — ni archive, ni date ; « le mardi » seul réécrit l'intention,
--     remet la date à maintenant, et archive l'intention remplacée, raison `modification` ;
--   - **S** (sorties, « Ce mois-ci », choisi il y a vingt jours) : « Le mois prochain » s'écrit, la
--     date repart — c'est elle que lit la question du mois (D14) —, et « Ce mois-ci » s'archive ; la
--     même échéance redite ne réécrit rien.
-- Les deux restent engagés tout du long : rien n'est libéré.
--
-- **Éprouvé en le cassant, le 02/10/2026** (TESTING.md §1.1), trois mutations du RPC, une à la fois
-- sur la stack locale, **la suite pgTAP entière** rejouée, la fonction restaurée après — chacune ne
-- fait tomber que ce fichier :
--   - l'archive retirée → les deux archives de T et de S, et le compte de S ;
--   - l'intention identique qui réécrit quand même (le `return` retiré) → T dans un autre ordre,
--     l'archive de T (une ligne de trop) et le compte de S ;
--   - les jours comparés dans l'ordre et non comme un ensemble → T dans un autre ordre, et l'archive
--     de T.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('e7000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'pgtap-modifier-t@test.local', 'x', now(), now()),
  ('e7000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'pgtap-modifier-s@test.local', 'x', now(), now());

insert into public.plan_cycles (id, user_id, cadence_type, period_label, period_start, period_end,
                                trip_label, target_reduction_pct)
values
  ('e7010000-0000-0000-0000-00000000000a', 'e7000000-0000-0000-0000-00000000000a', 'season',
   'Saison de test', current_date - 30, current_date + 60, 'Trajet domicile-travail', 20),
  ('e7010000-0000-0000-0000-00000000000b', 'e7000000-0000-0000-0000-00000000000b', 'season',
   'Saison de test', current_date - 30, current_date + 60, 'Loisirs du week-end', 20);

-- Une action par personne, engagée il y a vingt jours ; le gabarit est le premier de son poste, par
-- sa clé naturelle.
insert into public.plan_actions (id, plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent,
                                 rank, committed_at, intention_days, intention_timing)
select 'e7020000-0000-0000-0000-00000000000a', 'e7010000-0000-0000-0000-00000000000a', t.id, 300, 10, 1,
       now() - interval '20 days', array[2, 4]::smallint[], null
  from public.action_templates t where t.poste = 'commute' order by t.action_text limit 1;
insert into public.plan_actions (id, plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent,
                                 rank, committed_at, intention_days, intention_timing)
select 'e7020000-0000-0000-0000-00000000000b', 'e7010000-0000-0000-0000-00000000000b', t.id, 300, 10, 1,
       now() - interval '20 days', null, 'ce_mois'
  from public.action_templates t where t.poste = 'leisure' order by t.action_text limit 1;

-- ── T : les mêmes jours, dans un autre ordre ─────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'e7000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
select public.commit_plan_action('e7020000-0000-0000-0000-00000000000a', array[4, 2]::smallint[], null);
reset role;

select results_eq(
  $$ select committed_at < now() - interval '19 days', intention_days,
            (select count(*)::int from public.plan_action_commitments_archive
              where user_id = 'e7000000-0000-0000-0000-00000000000a')
       from public.plan_actions where id = 'e7020000-0000-0000-0000-00000000000a' $$,
  $$ values (true, array[2, 4]::smallint[], 0) $$,
  'T : les mêmes jours dans un autre ordre ne réécrivent rien — ni date, ni archive'
);

-- ── T : un jour de moins ─────────────────────────────────────────────────────────────────

set local role authenticated;
select public.commit_plan_action('e7020000-0000-0000-0000-00000000000a', array[2]::smallint[], null);
reset role;

select results_eq(
  $$ select committed_at = now(), intention_days from public.plan_actions
      where id = 'e7020000-0000-0000-0000-00000000000a' $$,
  $$ values (true, array[2]::smallint[]) $$,
  'T : « le mardi » s''écrit, l''action reste engagée, et la date repart à maintenant'
);

select results_eq(
  $$ select released_reason, intention_days, committed_at < now() - interval '19 days'
       from public.plan_action_commitments_archive
      where user_id = 'e7000000-0000-0000-0000-00000000000a' $$,
  $$ values ('modification'::text, array[2, 4]::smallint[], true) $$,
  'T : l''intention remplacée s''archive — ses jours et sa date d''alors, raison « modification »'
);

-- ── S : une autre échéance ───────────────────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'e7000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
select public.commit_plan_action('e7020000-0000-0000-0000-00000000000b', null, 'le_mois_prochain');
reset role;

select results_eq(
  $$ select committed_at = now(), intention_timing from public.plan_actions
      where id = 'e7020000-0000-0000-0000-00000000000b' $$,
  $$ values (true, 'le_mois_prochain'::text) $$,
  'S : « Le mois prochain » s''écrit, et la date repart — c''est elle que lit la question du mois (D14)'
);

select results_eq(
  $$ select released_reason, intention_timing from public.plan_action_commitments_archive
      where user_id = 'e7000000-0000-0000-0000-00000000000b' $$,
  $$ values ('modification'::text, 'ce_mois'::text) $$,
  'S : « Ce mois-ci » s''archive, raison « modification »'
);

-- ── S : la même échéance redite ──────────────────────────────────────────────────────────

set local role authenticated;
select public.commit_plan_action('e7020000-0000-0000-0000-00000000000b', null, 'le_mois_prochain');
reset role;

select is(
  (select count(*)::int from public.plan_action_commitments_archive
    where user_id = 'e7000000-0000-0000-0000-00000000000b'),
  1,
  'S : la même échéance redite n''archive rien de plus'
);

-- ── Rien n'a été libéré ──────────────────────────────────────────────────────────────────

select is(
  (select count(*)::int from public.plan_actions
    where id in ('e7020000-0000-0000-0000-00000000000a', 'e7020000-0000-0000-0000-00000000000b')
      and committed_at is not null),
  2,
  'les deux actions restent engagées : une modification ne libère pas'
);

select is(
  (select count(*)::int from public.plan_action_commitments_archive
    where user_id::text like 'e7000000%' and released_reason <> 'modification'),
  0,
  'aucune archive « changement » : la modification n''est pas une libération'
);

select * from finish();
rollback;
