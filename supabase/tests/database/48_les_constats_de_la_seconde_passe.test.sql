-- Tests pgTAP des constats de la couche base trouvés à la seconde passe de la revue finale
-- (migration `20261004200000_les_constats_de_la_seconde_passe.sql`, `v1-27` §12.36). Une section
-- par constat, dans l'ordre de la migration.
--
-- **Éprouvé en le cassant, le 04/10/2026** (TESTING.md §1.1) : chaque mutation appliquée à la base
-- locale dans une transaction annulée, ce fichier rejoué dedans, et ce qu'elle fait tomber :
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | la boucle de `generate_plan_cycles` sans sous-transaction | 1 à 4 |
--   | `plans_en_echec` retiré d'`alerte_a_dire` | 5 |
--   | sa ligne retirée de `texte_de_l_alerte` | 6 |
--   | le refus d'un bilan né finalisé retiré du trigger | 8 |
--   | `status = 'in_progress'` retiré de la policy d'insertion des réponses | 9 |
--   | le dernier cycle retiré de `commit_plan_action` | 11 |
--   | `grant select on public.push_tokens` de nouveau au niveau table | 13 et 14 |
--   | le `raise` d'« introuvable » sans code | 16 et 17 |
--
-- Les deux dernières font aussi tomber, ailleurs, ce qui épingle la même chose : `18` (la matrice
-- et les deux assertions de colonne de `push_tokens`) et `01` (les deux refus d'accès). Témoin sans
-- mutation : aucun écart.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('48000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-48-a@test.local', 'x', now(), now()),
  ('48000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-48-b@test.local', 'x', now(), now());

-- ── 1. Le passage nocturne des plans n'est plus arrêté par un compte ──────────────────────────
--
-- Deux comptes au bilan complété. La génération par compte est remplacée, le temps de la
-- transaction, par un double qui échoue pour B et note les autres : ce qu'on éprouve est la boucle,
-- pas la génération, que `02` et les suivants couvrent.
insert into public.assessments (id, user_id, status) values
  ('48000000-0000-0000-0000-0000000000a1', '48000000-0000-0000-0000-000000000001', 'in_progress'),
  ('48000000-0000-0000-0000-0000000000b1', '48000000-0000-0000-0000-000000000002', 'in_progress');
update public.assessments set status = 'completed'
 where id in ('48000000-0000-0000-0000-0000000000a1', '48000000-0000-0000-0000-0000000000b1');

create temp table appels_de_la_generation (uid uuid) on commit drop;

create or replace function public.generate_plan_cycle_for_user(p_user_id uuid, p_cause text default 'bilan')
returns void
language plpgsql
as $$
begin
  if p_user_id = '48000000-0000-0000-0000-000000000002' then
    raise exception 'pgtap-48 : échec voulu pour ce compte';
  end if;
  insert into appels_de_la_generation values (p_user_id);
end;
$$;

select lives_ok(
  $$ select public.generate_plan_cycles() $$,
  '1. un compte en échec n''arrête plus le passage nocturne'
);

select ok(
  exists (select 1 from appels_de_la_generation where uid = '48000000-0000-0000-0000-000000000001'),
  '2. et les autres comptes reçoivent leur plan dans le même passage'
);

select results_eq(
  $$ select echecs, detail like '%pgtap-48 : échec voulu%' from public.plan_cycle_runs
     order by ran_at desc limit 1 $$,
  $$ values (1, true) $$,
  '3. le passage laisse une ligne de journal : un échec, et le message du premier, sans identifiant'
);

select is(
  public.releve_des_alertes(now() - interval '1 minute') ->> 'plans_en_echec',
  '1',
  '4. le relevé de l''alerte compte les comptes restés sans plan'
);

select ok(
  public.alerte_a_dire(
    '{"pannes": 0, "soumissions_en_echec": 0, "taches_en_echec": [], "envois_en_echec": 0,
      "synchronisations_en_echec": 0, "purges_bloquees": 0, "plans_en_echec": 1, "rappels_bloques": 0}'::jsonb,
    0
  ),
  '5. et cet échec suffit à faire partir l''alerte : la tâche, elle, ne tombe plus'
);

select ok(
  public.texte_de_l_alerte(
    '{"pannes": 0, "soumissions_en_echec": 0, "taches_en_echec": [], "envois_en_echec": 0,
      "synchronisations_en_echec": 0, "purges_bloquees": 0, "plans_en_echec": 1, "rappels_bloques": 0}'::jsonb,
    now() - interval '1 hour', 0
  ) like '%plan n''a pas pu être préparé%',
  '6. l''e-mail dit lequel de ses signaux est parti'
);

select ok(
  not has_table_privilege('authenticated', 'public.plan_cycle_runs', 'select')
    and not has_table_privilege('anon', 'public.plan_cycle_runs', 'select')
    and not has_table_privilege('authenticated', 'public.plan_cycle_runs', 'insert'),
  '7. le journal n''est ni lisible ni écrivable par le client'
);

-- ── 2. Un bilan naît en cours, et ses réponses ne s'écrivent que tant qu'il l'est ──────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '48000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select throws_ok(
  $$ insert into public.assessments (user_id, status) values ('48000000-0000-0000-0000-000000000001', 'completed') $$,
  'RM007', null,
  '8. le client ne crée pas un bilan déjà finalisé, sans réponses ni résultat'
);

select throws_ok(
  $$ insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency)
     values ('48000000-0000-0000-0000-0000000000a1', false, 'rarely') $$,
  '42501', null,
  '9. ni n''écrit les réponses d''un bilan finalisé'
);

-- Créé en propriétaire : le client n'insère pas d'identifiant (20261004173905).
reset role;
insert into public.assessments (id, user_id, status) values
  ('48000000-0000-0000-0000-0000000000a2', '48000000-0000-0000-0000-000000000001', 'in_progress');
select set_config('role', 'authenticated', true);

select lives_ok(
  $$ insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency)
     values ('48000000-0000-0000-0000-0000000000a2', false, 'rarely') $$,
  '10. et la soumission écrit toujours celles d''un bilan en cours, qu''elle crée en cours'
);

-- ── 3. `commit_plan_action` n'engage que sur le dernier cycle du compte ───────────────────────
--
-- Deux cycles pour A, une action dans chacun, écrits en propriétaire. Le gabarit se désigne par
-- sa clé naturelle, jamais par un identifiant généré.
reset role;
insert into public.plan_cycles (id, user_id, cadence_type, period_label, period_start, period_end, trip_label, target_reduction_pct) values
  ('48000000-0000-0000-0000-0000000000c1', '48000000-0000-0000-0000-000000000001', 'season', 'Saison close', '2020-03-20', '2020-06-20', 'trajet', 10),
  ('48000000-0000-0000-0000-0000000000c2', '48000000-0000-0000-0000-000000000001', 'season', 'Saison en cours', '2020-06-21', '2020-09-21', 'trajet', 10);
insert into public.plan_actions (id, plan_cycle_id, action_template_id) values
  ('48000000-0000-0000-0000-0000000000d1', '48000000-0000-0000-0000-0000000000c1',
   (select id from public.action_templates where poste = 'leisure' order by action_text limit 1)),
  ('48000000-0000-0000-0000-0000000000d2', '48000000-0000-0000-0000-0000000000c2',
   (select id from public.action_templates where poste = 'leisure' order by action_text limit 1));
select set_config('role', 'authenticated', true);

select throws_ok(
  $$ select public.commit_plan_action('48000000-0000-0000-0000-0000000000d1', null, 'ce_mois') $$,
  'P0002', null,
  '11. une action d''une saison close ne s''engage pas, même par un appel direct'
);

select lives_ok(
  $$ select public.commit_plan_action('48000000-0000-0000-0000-0000000000d2', null, 'ce_mois') $$,
  '12. et celle du dernier cycle, que l''écran montre, s''engage toujours'
);

-- ── 4. `push_tokens` : le client ne lit plus qui avait ce téléphone avant lui ─────────────────

reset role;
insert into public.push_tokens (token, user_id, platform, proprietaire_precedent) values
  ('ExponentPushToken[pgtap-48]', '48000000-0000-0000-0000-000000000001', 'android', '48000000-0000-0000-0000-000000000002');
select set_config('role', 'authenticated', true);

select throws_ok(
  $$ select proprietaire_precedent from public.push_tokens where token = 'ExponentPushToken[pgtap-48]' $$,
  '42501', null,
  '13. le propriétaire d''un jeton ne lit plus l''identifiant du compte d''avant'
);

select throws_ok(
  $$ select reprises from public.push_tokens where token = 'ExponentPushToken[pgtap-48]' $$,
  '42501', null,
  '14. ni le compte des reprises'
);

select is(
  (select token from public.push_tokens where token = 'ExponentPushToken[pgtap-48]'),
  'ExponentPushToken[pgtap-48]',
  '15. et l''app lit toujours son jeton, la seule colonne qu''elle demande'
);

-- ── 5. `compute_assessment_results` dit « introuvable » avec le code qu'on attend ─────────────

select throws_ok(
  $$ select public.compute_assessment_results('48000000-0000-0000-0000-0000000000ff') $$,
  'P0002', null,
  '16. un bilan inconnu lève `no_data_found`, que la mesure range dans « introuvable »'
);

select throws_ok(
  $$ select public.compute_assessment_results('48000000-0000-0000-0000-0000000000b1') $$,
  'P0002', null,
  '17. le bilan d''un autre compte aussi : le même code, sans dire qu''il existe'
);

select set_config('request.jwt.claims', ''::text, true);
reset role;

select * from finish();
rollback;
