-- Tests pgTAP des colonnes que le client écrit, et du calcul qu'on ne refait pas
-- (migration 20261004173905_les_colonnes_que_le_client_ecrit.sql, revue finale avant la production).
--
-- Le test `18` épingle les privilèges eux-mêmes ; celui-ci éprouve ce qu'ils font, sous la session
-- du propriétaire, et surtout leur **moitié positive** : la soumission insère toujours un bilan, et
-- l'app règle toujours ses rappels. Un privilège de colonne refuse bruyamment (`42501`), mais
-- seulement quand l'ordre **nomme** la colonne interdite — d'où une colonne par assertion.
--
-- **Éprouvé en le cassant, le 04/10/2026** (TESTING.md §1.1), chaque mutation appliquée à la base
-- locale puis retirée, et ce qu'elle fait tomber dans ce fichier :
--   - `grant insert on public.assessments to authenticated` de nouveau au niveau table → 1 et 2 ;
--   - `grant update on public.profiles to authenticated` de nouveau au niveau table → 4 et 5 ;
--   - la garde de statut retirée de `compute_assessment_results` → 7, seule : le calcul d'un bilan
--     finalisé (8) passe avec ou sans elle, et c'est voulu — il garde la moitié positive ;
--   - la garde « déjà calculé » retirée → 10.
-- Les deux premières font aussi tomber, dans le test `18`, la matrice (1) et les deux assertions de
-- colonne de la table touchée (18 et 19, ou 20 et 21). Témoin sans mutation : aucun écart.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('47000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-colonnes@test.local', 'x', now(), now());

-- Un bilan finalisé avec ses réponses, écrit en propriétaire comme la soumission l'écrit : réponses
-- tant qu'il est en cours, puis la finalisation. Un second, laissé en cours, pour le refus du calcul.
insert into public.assessments (id, user_id, status) values
  ('47000000-0000-0000-0000-0000000000a1', '47000000-0000-0000-0000-000000000001', 'in_progress'),
  ('47000000-0000-0000-0000-0000000000a2', '47000000-0000-0000-0000-000000000001', 'in_progress');

insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
) values
  ('47000000-0000-0000-0000-0000000000a1', true, 5, 20, 'voiture', false, false, 'rarely'),
  ('47000000-0000-0000-0000-0000000000a2', true, 5, 20, 'voiture', false, false, 'rarely');

update public.assessments set status = 'completed' where id = '47000000-0000-0000-0000-0000000000a1';

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '47000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

-- ── A. `assessments` : le client n'insère que `user_id` et `status` ───────────────────────────

select throws_ok(
  $$ insert into public.assessments (user_id, status, created_at)
     values ('47000000-0000-0000-0000-000000000001', 'in_progress', '2099-01-01') $$,
  '42501', null,
  '1. le client ne date pas lui-même un bilan : un `created_at` lointain le rendait impossible à purger'
);

select throws_ok(
  $$ insert into public.assessments (user_id, status, submitted_at)
     values ('47000000-0000-0000-0000-000000000001', 'in_progress', '2099-01-01') $$,
  '42501', null,
  '2. ni sa date de soumission, que la purge lit aussi'
);

select lives_ok(
  $$ insert into public.assessments (user_id, status)
     values ('47000000-0000-0000-0000-000000000001', 'in_progress') $$,
  '3. et la soumission insère toujours son bilan, sur les deux colonnes qu’elle écrit'
);

-- ── B. `profiles` : le client ne règle que ses rappels ─────────────────────────────────────────

select throws_ok(
  $$ update public.profiles set cadence_type = 'rolling_quarter' where id = '47000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  '4. le client ne choisit pas la cadence de son plan'
);

select throws_ok(
  $$ update public.profiles set created_at = '2020-01-01' where id = '47000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  '5. ni la date de création de son profil'
);

-- La moitié positive se relit, elle ne s'attend pas : un ordre que la RLS filtrerait passerait sans
-- erreur et sans rien écrire.
update public.profiles set reminder_channel = 'none', mot_de_la_veille = 'refuse'
 where id = '47000000-0000-0000-0000-000000000001';

select is(
  (select reminder_channel || '/' || mot_de_la_veille from public.profiles
    where id = '47000000-0000-0000-0000-000000000001'),
  'none/refuse',
  '6. et l’app règle toujours le canal de ses rappels et le mot de la veille'
);

-- ── C. `compute_assessment_results` : un bilan finalisé, calculé une fois ──────────────────────

select throws_ok(
  $$ select public.compute_assessment_results('47000000-0000-0000-0000-0000000000a2') $$,
  'RM008', null,
  '7. un bilan encore en cours ne se calcule pas : ses réponses ne sont pas définitives'
);

select lives_ok(
  $$ select public.compute_assessment_results('47000000-0000-0000-0000-0000000000a1') $$,
  '8. un bilan finalisé se calcule'
);

select ok(
  exists (select 1 from public.assessment_results where assessment_id = '47000000-0000-0000-0000-0000000000a1'),
  '9. et son résultat existe'
);

-- Les réponses changées sous un rôle serveur, puis un second appel du client : le résultat figé ne
-- bouge pas. C'est ce qui rend sûr le nouvel essai d'une soumission dont la réponse s'est perdue.
reset role;
select set_config('test.total_avant',
  (select total_co2_kg_year::text from public.assessment_results
    where assessment_id = '47000000-0000-0000-0000-0000000000a1'), true);
update public.assessment_answers set commute_distance_km = 200
 where assessment_id = '47000000-0000-0000-0000-0000000000a1';
select set_config('role', 'authenticated', true);
select public.compute_assessment_results('47000000-0000-0000-0000-0000000000a1');

select is(
  (select total_co2_kg_year::text from public.assessment_results
    where assessment_id = '47000000-0000-0000-0000-0000000000a1'),
  current_setting('test.total_avant'),
  '10. un bilan déjà calculé ne se recalcule pas depuis le client : `assessment_results` est figé'
);

select set_config('request.jwt.claims', ''::text, true);
reset role;

select * from finish();
rollback;
