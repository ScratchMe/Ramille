-- Tests pgTAP des budgets du jour (migration `20261018110000_les_budgets_du_jour.sql`) : les
-- événements d'usage par compte et pour tout le projet, le pic d'un lancement, et la correction du
-- contexte. Le plafond des autres événements par compte (200) est épinglé par `12` ; les retours et
-- la purge, par `49`.
--
-- **Le compteur part vide** : chaque section pose elle-même les tranches qu'elle lit, après avoir
-- effacé celles des vingt-cinq dernières heures — sur une stack qui a servi, il porte ce qu'un parcours
-- a émis, et une assertion ne doit pas rougir pour ça (TESTING-PGTAP.md §2.3). Une tranche posée à la
-- main est un état que la production produit : un compteur à 25 000, c'est une journée chargée.
--
-- **Éprouvé en le cassant, le 18/10/2026** (TESTING.md §1.1) : chaque mutation appliquée à la base
-- locale dans une transaction annulée, et chacun des fichiers de la suite rejoué dedans ; ce que
-- chacune fait tomber dans toute la suite (les numéros sont ceux des libellés de ce fichier) :
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | le compteur n'est plus incrémenté | 1 |
--   | le plafond des pannes par compte retiré | 2 |
--   | les autres événements d'un compte comptent ses pannes | 3 |
--   | le plafond des pannes d'un compte compte tous ses événements | 4 |
--   | les comptes de plus de vingt-quatre heures dispensés des budgets du projet (l'état d'avant) | 5 |
--   | la première ouverture du jour ne passe plus | 8 |
--   | toute ouverture passe, pas seulement la première | 9 |
--   | les comptes neufs comptés dans le budget des autres | 1, 6, 7 et 9 — un seul budget pour tous |
--   | le budget des comptes neufs retiré | 7 et 9 — la seconde ouverture n'est refusée que par lui |
--   | les comptes de deux jours comptés dans le budget des comptes neufs | 1 et 7 bis — le compteur le dit aussi |
--   | la fenêtre de vingt-quatre heures retirée | 10 |
--   | le plafond de 6 000 par heure remis pour les comptes neufs | 11 |
--   | le budget des pannes retiré | 12 |
--   | les autres événements comptés aussi au budget des pannes | 13 |
--   | les pannes comptées aussi au budget des comptes | 14 |
--   | le plafond des corrections du contexte retiré | 16 |
--   | la correction comptée avant la comparaison « rien n'a bougé » | 17 |
--   | la fenêtre des corrections qui ne se rouvre jamais | 18 |
--   | l'export sans les deux colonnes | 19 |
--   | le verrou retiré, d'une clé commune à tous, ou pris après la comparaison | 20, chacune |
--   | le seuil de l'alerte à 100 % | 21 |
--   | `alerte_a_dire` sans les budgets | 22 |
--   | le texte de l'alerte sans leur ligne | 23 |
--   | le plafond des autres événements par compte remis à 500 | « la 201ᵉ tentative » de `12`, seule |
--
-- Témoin sans mutation : aucun écart dans ce fichier. Sur une base qui a déjà servi, le témoin du plan
-- de `22` (son assertion 34) tombe par intermittence — cinq passages sur vingt-six, témoin compris —,
-- mutation ou pas : son plan dépend de `reltuples`, que ses passages précédents ont gonflé
-- (TESTING-PGTAP.md §2.3). Sur une stack neuve, il passe.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, v.cree_le, now()
from (values
  ('55000000-0000-0000-0000-000000000001', now()),                     -- N1 : un compte neuf
  ('55000000-0000-0000-0000-000000000002', now() - interval '2 days'), -- A1 : un compte de deux jours
  ('55000000-0000-0000-0000-000000000004', now()),                     -- N2 : les pannes du projet
  ('55000000-0000-0000-0000-000000000005', now()),                     -- N3 : cinquante pannes
  ('55000000-0000-0000-0000-000000000006', now()),                     -- N4 : deux cents événements
  ('55000000-0000-0000-0000-000000000009', now())                      -- N5 : la première ouverture
) as v(id, cree_le);

delete from public.evenements_d_usage_par_heure where heure > now() - interval '25 hours';

-- ── 1. Le compteur ───────────────────────────────────────────────────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
insert into public.usage_events (user_id, name, props, platform)
values ('55000000-0000-0000-0000-000000000001', 'bilan_step_view', '{"step":"flights"}', 'web');
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
insert into public.usage_events (user_id, name, props, platform)
values ('55000000-0000-0000-0000-000000000002', 'plan_view', '{}', 'web');
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
insert into public.usage_events (user_id, name, props, platform)
values ('55000000-0000-0000-0000-000000000004', 'app_error', '{"category":"type","route":"/plan"}', 'web');

reset role;
select results_eq(
  $$ select comptes_neufs, autres_comptes, pannes from public.evenements_d_usage_par_heure
      where heure = date_trunc('hour', now()) $$,
  $$ values (1, 1, 1) $$,
  '1. un événement d''un compte neuf, un d''un compte de deux jours et une panne s''inscrivent chacun à leur budget, dans la tranche de l''heure'
);

-- ── 2. Par compte : les pannes à part ────────────────────────────────────────────────────────
--
-- Cinquante pannes sur vingt-quatre heures, puis la suivante est refusée — et ses autres événements
-- passent, les deux cents. Dans l'autre sens, deux cents événements laissent passer la panne.

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);
insert into public.usage_events (user_id, name, props, platform)
select '55000000-0000-0000-0000-000000000005', 'app_error', '{"category":"type","route":"/suivi"}', 'android'
from generate_series(1, 50);

select throws_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000005', 'app_error', '{"category":"type","route":"/suivi"}', 'android') $$,
  '23514', 'Trop de pannes remontées pour cet utilisateur sur 24 h.',
  '2. au-delà de cinquante pannes en vingt-quatre heures, la suivante d''un compte est refusée'
);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     select '55000000-0000-0000-0000-000000000005', 'bilan_step_view', '{"step":"context"}', 'android'
     from generate_series(1, 200) $$,
  '3. et ses deux cents autres événements passent : les pannes ne prennent rien à son budget'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000006', 'role', 'authenticated')::text, true);
insert into public.usage_events (user_id, name, props, platform)
select '55000000-0000-0000-0000-000000000006', 'plan_view', '{}', 'web'
from generate_series(1, 200);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000006', 'app_error', '{"category":"autre","route":"/plan"}', 'web') $$,
  '4. un compte à deux cents événements remonte encore sa panne'
);

-- ── 3. Tout le projet, sur vingt-quatre heures, quel que soit l'âge du compte ───────────────────

reset role;
delete from public.evenements_d_usage_par_heure where heure > now() - interval '25 hours';
insert into public.evenements_d_usage_par_heure (heure, autres_comptes)
values (date_trunc('hour', now()) - interval '3 hours', 25000);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);

select throws_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000002', 'bilan_step_view', '{"step":"flights"}', 'web') $$,
  '23514', 'Budget du jour des événements d''usage atteint pour tout le projet : autres_comptes.',
  '5. un compte de deux jours, sous son propre plafond, est refusé au-delà du budget du jour des autres comptes'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000001', 'bilan_step_view', '{"step":"flights"}', 'web') $$,
  '6. et un compte neuf passe : un flot de comptes vieillis ne prend rien à l''entonnoir d''un lancement'
);

reset role;
update public.evenements_d_usage_par_heure
set autres_comptes = 0, comptes_neufs = 50000
where heure = date_trunc('hour', now()) - interval '3 hours';

select set_config('role', 'authenticated', true);

select throws_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000001', 'bilan_step_view', '{"step":"flights"}', 'web') $$,
  '23514', 'Budget du jour des événements d''usage atteint pour tout le projet : comptes_neufs.',
  '7. au-delà du budget du jour des comptes neufs, un compte neuf est refusé'
);

select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000002', 'suivi_view', '{}', 'web') $$,
  '7 bis. et un compte de deux jours passe : un flot de sessions neuves ne prend rien aux comptes qui reviennent'
);

-- Le premier `app_open` du compte en vingt-quatre heures passe un budget atteint : son signe de vie,
-- et l'ouverture que compte l'entonnoir. Un compte neuf ici, pour que ces deux-là ne dépendent que du
-- budget des comptes neufs.
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000009', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000009', 'app_open', '{"origine":"demarrage"}', 'android') $$,
  '8. mais la première ouverture du jour d''un compte passe : un signe de vie ne se perd pas'
);

select throws_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000009', 'app_open', '{"origine":"retour"}', 'android') $$,
  '23514', 'Budget du jour des événements d''usage atteint pour tout le projet : comptes_neufs.',
  '9. et la seconde, non : une ligne par compte et par jour, pas davantage'
);

reset role;
delete from public.evenements_d_usage_par_heure where heure > now() - interval '25 hours';
insert into public.evenements_d_usage_par_heure (heure, comptes_neufs, autres_comptes, pannes)
values (date_trunc('hour', now()) - interval '25 hours', 1000000, 1000000, 1000000);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000002', 'bilan_step_view', '{"step":"flights"}', 'web') $$,
  '10. une tranche de plus de vingt-quatre heures ne compte plus'
);

-- ── 4. Le pic d'un lancement ─────────────────────────────────────────────────────────────────
--
-- Un millier d'arrivées à quarante événements dans la même heure : 40 000, que l'ancien plafond de
-- 6 000 par heure coupait dès la cent-cinquantième. Elles passent, et c'est le budget du jour qui borne.

reset role;
delete from public.evenements_d_usage_par_heure where heure > now() - interval '26 hours';
insert into public.evenements_d_usage_par_heure (heure, comptes_neufs)
values (date_trunc('hour', now()), 40000);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000001', 'bilan_step_view', '{"step":"flights"}', 'web') $$,
  '11. un millier d''arrivées à quarante événements dans la même heure passent : le plafond n''est plus horaire'
);

-- ── 5. Les pannes de tout le projet, à part ──────────────────────────────────────────────────

reset role;
delete from public.evenements_d_usage_par_heure where heure > now() - interval '25 hours';
insert into public.evenements_d_usage_par_heure (heure, pannes)
values (date_trunc('hour', now()) - interval '3 hours', 2500);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);

select throws_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000004', 'app_error', '{"category":"type","route":"/plan"}', 'web') $$,
  '23514', 'Budget du jour des événements d''usage atteint pour tout le projet : pannes.',
  '12. au-delà du budget du jour des pannes, la suivante est refusée'
);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000004', 'bilan_step_view', '{"step":"flights"}', 'web') $$,
  '13. et un autre événement du même compte passe : le budget des pannes n''arrête que les pannes'
);

reset role;
update public.evenements_d_usage_par_heure
set pannes = 0, comptes_neufs = 50000, autres_comptes = 25000
where heure = date_trunc('hour', now()) - interval '3 hours';

select set_config('role', 'authenticated', true);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('55000000-0000-0000-0000-000000000004', 'app_error', '{"category":"type","route":"/plan"}', 'web') $$,
  '14. et l''inverse : les deux autres budgets atteints, une panne passe encore'
);

-- ── 6. Le contexte : vingt corrections par jour, un appel à la fois ───────────────────────────
--
-- Le profil S du fichier `29` : à pied, un jour de trajet, sorties rares — B4.4 ne se pose pas, le
-- quatrième argument est nul. C2 ne corrige rien : il ne sert qu'au verrou.

reset role;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('55000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'pgtap-budgets-s@test.local', 'x', now(), now()),
  ('55000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'pgtap-budgets-c@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status)
values ('55100000-0000-0000-0000-000000000007', '55000000-0000-0000-0000-000000000007', 'completed'),
       ('55100000-0000-0000-0000-000000000008', '55000000-0000-0000-0000-000000000008', 'completed');

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, leisure_frequency, zone_type, transports_proches, household_vehicles)
values ('55100000-0000-0000-0000-000000000007', true, 1, 2, 'marche', 'rarely', 'urbain_dense', array['metro_tram', 'bus'], '0'),
       ('55100000-0000-0000-0000-000000000008', true, 1, 2, 'marche', 'rarely', 'urbain_dense', array['metro_tram', 'bus'], '0');

select public.recompute_assessment_results('55100000-0000-0000-0000-000000000007');
select public.recompute_assessment_results('55100000-0000-0000-0000-000000000008');

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000007', 'role', 'authenticated')::text, true);

-- Vingt corrections qui changent chacune quelque chose : le foyer gagne puis perd un véhicule.
select lives_ok(
  $$ select public.mettre_a_jour_le_contexte('urbain_dense', array['metro_tram', 'bus'],
            case when g.i % 2 = 1 then '1' else '0' end, null)
     from generate_series(1, 20) as g(i) $$,
  '15. vingt corrections du contexte passent dans la journée'
);

select throws_ok(
  $$ select public.mettre_a_jour_le_contexte('urbain_dense', array['metro_tram', 'bus'], '1', null) $$,
  'RM002', 'Tu as corrigé ton contexte de nombreuses fois aujourd''hui. Reviens demain.',
  '16. la vingt-et-unième est refusée, en RM002, avec une phrase pour la personne'
);

select lives_ok(
  $$ select public.mettre_a_jour_le_contexte('urbain_dense', array['bus', 'metro_tram'], '0', null) $$,
  '17. une correction qui ne change rien passe encore : elle ne compte pas'
);

reset role;
update public.profiles set corrections_du_contexte_depuis = now() - interval '25 hours'
where id = '55000000-0000-0000-0000-000000000007';
select set_config('role', 'authenticated', true);

select lives_ok(
  $$ select public.mettre_a_jour_le_contexte('urbain_dense', array['metro_tram', 'bus'], '1', null) $$,
  '18. vingt-quatre heures après la première, la fenêtre se rouvre'
);

-- L'export rend ce que la base garde, quel qu'en soit le chiffre.
select ok(
  (public.export_my_data() -> 'compte') ? 'corrections_du_contexte_depuis'
  and ((public.export_my_data() -> 'compte' ->> 'corrections_du_contexte')::int
       = (select corrections_du_contexte from public.profiles where id = '55000000-0000-0000-0000-000000000007')),
  '19. l''export rend le compte des corrections du contexte, et sa fenêtre'
);

-- Le verrou : C2 n'appelle qu'une fois, sans rien changer — le verrou de son compte doit être pris
-- quand même, donc avant la comparaison. Un verrou de transaction dure jusqu'au `rollback`, d'où un
-- appel hors de `lives_ok` et la lecture de `pg_locks` juste après.
select set_config('request.jwt.claims',
  json_build_object('sub', '55000000-0000-0000-0000-000000000008', 'role', 'authenticated')::text, true);
select public.mettre_a_jour_le_contexte('urbain_dense', array['metro_tram', 'bus'], '0', null);

reset role;
select ok(
  exists (
    select 1
    from pg_locks l
    cross join (select hashtext('mettre_a_jour_le_contexte:55000000-0000-0000-0000-000000000008')::bigint as cle) k
    where l.locktype = 'advisory' and l.pid = pg_backend_pid() and l.granted and l.objsubid = 1
      and l.classid::text::bigint = (k.cle >> 32) & 4294967295
      and l.objid::text::bigint = k.cle & 4294967295
  ),
  '20. un appel prend le verrou de son compte avant de comparer : deux appels du même compte s''attendent, deux comptes jamais'
);

-- ── 7. L'alerte dit un budget entamé à 80 % ──────────────────────────────────────────────────

delete from public.evenements_d_usage_par_heure where heure > now() - interval '25 hours';
insert into public.evenements_d_usage_par_heure (heure, comptes_neufs) values (date_trunc('hour', now()), 39999);
select set_config('test.sous_le_seuil',
  (public.releve_des_alertes(now() - interval '1 hour') -> 'budgets_des_evenements_entames')::text, true);
update public.evenements_d_usage_par_heure set comptes_neufs = 40000 where heure = date_trunc('hour', now());

select ok(
  current_setting('test.sous_le_seuil')::jsonb = '[]'::jsonb
  and public.releve_des_alertes(now() - interval '1 hour') -> 'budgets_des_evenements_entames'
      = '[{"budget": "comptes_neufs", "recus": 40000, "plafond": 50000}]'::jsonb,
  '21. le relevé nomme un budget entamé à 80 %, et pas en dessous'
);

create temporary table calme on commit drop as
  select jsonb_build_object(
    'pannes', 0, 'pannes_detail', '[]'::jsonb, 'soumissions_en_echec', 0, 'taches_en_echec', '[]'::jsonb,
    'envois_en_echec', 0, 'synchronisations_en_echec', 0, 'purges_bloquees', 0, 'plans_en_echec', 0,
    'taille_de_la_base_mo', 10, 'rappels_bloques', 0, 'demandes_ignorees', 0,
    'demandes_ignorees_adresses', 0, 'plafond_du_projet_atteint', 0, 'codes_refuses_par_la_limite', 0,
    'budgets_des_evenements_entames', '[]'::jsonb
  ) as r;

select ok(
  (select not public.alerte_a_dire(r, 0)
      and public.alerte_a_dire(
        r || '{"budgets_des_evenements_entames": [{"budget": "pannes", "recus": 2000, "plafond": 2500}]}', 0)
      and not public.alerte_du_serveur(
        r || '{"budgets_des_evenements_entames": [{"budget": "pannes", "recus": 2000, "plafond": 2500}]}', 0)
   from calme),
  '22. l''alerte le dit, sous son plafond du jour : ce sont des clients qui remplissent un budget'
);

select ok(
  (select t like '%Budgets du jour des événements d''usage entamés à 80 % ou plus (table evenements_d_usage_par_heure) : pannes 2000 sur 2500%'
   from (select public.texte_de_l_alerte(
           r || '{"budgets_des_evenements_entames": [{"budget": "pannes", "recus": 2000, "plafond": 2500}]}',
           now(), 0) as t from calme) x),
  '23. et son texte nomme le budget, ce qui en est reçu et le plafond'
);

select * from finish();
rollback;
