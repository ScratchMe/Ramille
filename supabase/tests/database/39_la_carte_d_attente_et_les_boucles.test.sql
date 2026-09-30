-- Tests pgTAP : la carte d'attente sait si une boucle tourne (30/09/2026, `v1-27` §12.22, migration
-- `20260930105923_la_carte_d_attente_sait_si_une_boucle_tourne.sql`) — et, depuis le même soir, les
-- deux autres textes du plan qui dépendent des boucles (`v1-27` §12.23, migration
-- `20260930140000_les_boucles_a_venir_une_par_une.sql`).
--
-- **Le défaut** : l'écran du plan décidait de la boucle à nommer sur le seul poste
-- domicile-travail, donc toute personne sans trajet lisait « Je te fais signe au début du mois
-- prochain » — y compris quand la boucle mensuelle ne tourne pas (le profil sédentaire de C2.5 :
-- aucun trajet, sorties rares, aucun voyage déclaré). Le signe promis n'arrivait jamais. Décision de
-- la personne qui pilote : dans ce cas, Ramille ne promet rien.
--
-- **Ce que ce fichier défend** : l'écran lit `mes_boucles_a_venir()` — les boucles une par une ;
-- elle a remplacé `ma_boucle_a_venir()`, qui les résumait en une valeur —, qui lit
-- `boucles_du_dernier_bilan`, que lisent aussi les deux générateurs. Une seule définition de « qui
-- reçoit quelle boucle » ; l'accord entre ce que l'écran annonce et ce que les générateurs
-- produisent est vérifié sur les mêmes profils, et la structure empêche qu'un générateur
-- réécrive le choix en ligne.
--
-- **Éprouvé en le cassant, le 30/09/2026** (TESTING.md §1.1), une mutation à la fois, retirée
-- ensuite. D'abord sur `ma_boucle_a_venir`, le matin :
--   - son repli remis sur `mensuel` (l'état d'avant, vu de l'écran) → K3, K5 et K6, les trois profils
--     sans boucle ;
--   - sa garde de session retirée → la session absente, seule ;
--   - le `revoke` de `boucles_du_dernier_bilan` sans `public` → les privilèges, seuls ;
--   - la base déclarée retirée de `boucles_du_dernier_bilan` (`a_des_voyages_declares` ôté du filtre)
--     → six sur la suite entière : K4, seul ici ; quatre assertions du fichier 20 (les profils G, H
--     et I) ; et l'assertion de structure du fichier 33, qui cherche l'appel. **L'accord avec les
--     générateurs ne tombe pas**, et c'est attendu : ils lisent la même fonction, donc ils se
--     trompent ensemble. Il garde contre une définition recopiée, pas contre une définition fausse ;
--   - `generate_commute_checkins` remise dans son corps de `20260930092838` → les deux assertions de
--     structure, et elles seules — aucun comportement ne change, c'est la définition d'une
--     extraction neutre.
--
-- **Puis sur `mes_boucles_a_venir`, le soir, qui l'a remplacée** — six mutations, chacune fait tomber
-- une assertion et une seule :
--   - sa garde de session retirée → « sans session », seule : l'appel à `null` rend les boucles de
--     tout le monde ;
--   - son `revoke` sans `public` → son assertion de privilège ;
--   - le résumé remis — la première boucle seule, `array[min(loop_type)] … having count(*) > 0`,
--     pour qu'un profil sans boucle rende encore `{}` et non `{NULL}` — → K1, le seul profil qui a
--     les deux boucles : c'est l'assertion qui garde la raison du remplacement. Sans le `having`,
--     K3, K5 et K6 tomberaient aussi, et la mutation ne dirait plus laquelle garde quoi ;
--   - `ma_boucle_a_venir` recréée → `hasnt_function` ;
--   - rejouées sur la nouvelle forme, la base déclarée retirée → K4, et le `revoke` de
--     `boucles_du_dernier_bilan` sans `public` → son assertion de privilège.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

-- ── Les privilèges ──────────────────────────────────────────────────────────────────────

select ok(
  not has_function_privilege('authenticated', 'public.boucles_du_dernier_bilan(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.boucles_du_dernier_bilan(uuid)', 'execute'),
  'boucles_du_dernier_bilan n''est appelable que côté serveur — avec un argument nul, elle répond pour tout le monde'
);

select ok(
  has_function_privilege('authenticated', 'public.mes_boucles_a_venir()', 'execute')
  and not has_function_privilege('anon', 'public.mes_boucles_a_venir()', 'execute'),
  'mes_boucles_a_venir est appelable par authenticated, et par lui seul'
);

-- Remplacée et non doublée : une fonction qu'aucun appel n'émet se lit « morte », pas « réservée ».
select hasnt_function('public', 'ma_boucle_a_venir', array[]::text[],
  'ma_boucle_a_venir ne survit pas à son remplacement par mes_boucles_a_venir');

-- ── Fixtures : six profils ──────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-attente-' || right(u::text, 1) || '@test.local', 'x', now(), false, now(), now()
from unnest(array[
  'e3900000-0000-0000-0000-000000000001'::uuid,  -- K1 : un trajet en voiture, des sorties
  'e3900000-0000-0000-0000-000000000002',        -- K2 : pas de trajet, des sorties en voiture
  'e3900000-0000-0000-0000-000000000003',        -- K3 : sédentaire — aucune boucle
  'e3900000-0000-0000-0000-000000000004',        -- K4 : sort rarement, un long trajet en train
  'e3900000-0000-0000-0000-000000000005',        -- K5 : avait un trajet, son nouveau bilan non
  'e3900000-0000-0000-0000-000000000006'         -- K6 : aucun bilan
]) u;

insert into public.assessments (id, user_id, status)
values
  ('e3910000-0000-0000-0000-000000000001', 'e3900000-0000-0000-0000-000000000001', 'completed'),
  ('e3910000-0000-0000-0000-000000000002', 'e3900000-0000-0000-0000-000000000002', 'completed'),
  ('e3910000-0000-0000-0000-000000000003', 'e3900000-0000-0000-0000-000000000003', 'completed'),
  ('e3910000-0000-0000-0000-000000000004', 'e3900000-0000-0000-0000-000000000004', 'completed'),
  ('e3910000-0000-0000-0000-0000000000a5', 'e3900000-0000-0000-0000-000000000005', 'completed'),
  ('e3910000-0000-0000-0000-000000000005', 'e3900000-0000-0000-0000-000000000005', 'completed');

-- L'ancien bilan de K5 est reculé après l'insertion : une fixture ne choisit pas `submitted_at` à
-- l'insert (CLAUDE.md, C2.2).
update public.assessments set submitted_at = now() - interval '30 days'
where id = 'e3910000-0000-0000-0000-0000000000a5';

-- K1, et l'ancien bilan de K5 : un trajet en voiture thermique, des sorties chaque semaine.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, leisure_mode,
  leisure_distance_bracket, leisure_car_engine, household_vehicles, zone_type, tc_access)
select id, true, 5, 20, 'voiture', 'thermique', 'weekly', 'voiture', '15_30', 'thermique', '1',
       'periurbain', 'bon'
from unnest(array['e3910000-0000-0000-0000-000000000001'::uuid,
                  'e3910000-0000-0000-0000-0000000000a5']) id;

-- K2 : aucun trajet, des sorties chaque semaine en voiture — la boucle mensuelle seule.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  leisure_mode, leisure_distance_bracket, leisure_car_engine, household_vehicles, zone_type, tc_access)
values ('e3910000-0000-0000-0000-000000000002', false, 'weekly', 'voiture', '15_30', 'thermique', '1',
        'periurbain', 'bon');

-- K3, et le nouveau bilan de K5 : aucun trajet, sorties rares, aucun voyage — aucune boucle.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  household_vehicles, zone_type, tc_access)
select id, false, 'rarely', '1', 'urbain_dense', 'bon'
from unnest(array['e3910000-0000-0000-0000-000000000003'::uuid,
                  'e3910000-0000-0000-0000-000000000005']) id;

-- K4 : sorties rares et un long trajet en train par an — la boucle mensuelle, sur ses voyages
-- (27/09/2026). C'est le profil que la règle recopiée en TypeScript aurait dû suivre compteur par
-- compteur.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  train_long_trips_per_year, household_vehicles, zone_type, tc_access)
values ('e3910000-0000-0000-0000-000000000004', false, 'rarely', 1, '1', 'urbain_dense', 'bon');

select public.recompute_assessment_results('e3910000-0000-0000-0000-0000000000a5');
select public.recompute_assessment_results('e3910000-0000-0000-0000-000000000001');
select public.recompute_assessment_results('e3910000-0000-0000-0000-000000000002');
select public.recompute_assessment_results('e3910000-0000-0000-0000-000000000003');
select public.recompute_assessment_results('e3910000-0000-0000-0000-000000000004');
select public.recompute_assessment_results('e3910000-0000-0000-0000-000000000005');

-- Les deux générateurs, pour l'assertion d'accord plus bas : sous `postgres`, avant de prendre les
-- sessions.
select public.generate_commute_checkins();
select public.generate_extras_checkins();

-- ── Ce que l'écran lit, session par session ─────────────────────────────────────────────

select set_config('role', 'authenticated', true);

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select is(public.mes_boucles_a_venir(), array['commute', 'extras'],
  'K1 : un trajet et des sorties — les deux boucles, chacune nommée');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select is(public.mes_boucles_a_venir(), array['extras'],
  'K2 : pas de trajet, des sorties — la boucle mensuelle seule');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
select is(public.mes_boucles_a_venir(), array[]::text[],
  'K3 : sédentaire — aucune boucle, et la carte ne promet rien');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
select is(public.mes_boucles_a_venir(), array['extras'],
  'K4 : sort rarement mais a déclaré un voyage — la boucle mensuelle tourne');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);
select is(public.mes_boucles_a_venir(), array[]::text[],
  'K5 : le dernier bilan décide — l''ancien trajet ne fait rien promettre');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000006', 'role', 'authenticated')::text, true);
select is(public.mes_boucles_a_venir(), array[]::text[],
  'K6 : aucun bilan — aucune boucle');

select set_config('request.jwt.claims', '', true);
select is(public.mes_boucles_a_venir(), array[]::text[],
  'sans session : aucune — jamais les boucles de quelqu''un d''autre');

select set_config('role', 'postgres', true);

-- ── Ce que l'écran annonce est ce que les générateurs produisent ─────────────────────────
--
-- Boucle par boucle, et plus seulement la première : la carte d'un point répondu lit la sienne.

select results_eq(
  $$ select u.id,
            coalesce(array_agg(distinct o.loop_type order by o.loop_type)
                       filter (where o.loop_type is not null), '{}')
     from auth.users u
     left join public.boucles_du_dernier_bilan(u.id) o on true
     where u.id::text like 'e3900000%'
     group by u.id order by u.id $$,
  $$ select u.id,
            coalesce(array_agg(distinct c.loop_type order by c.loop_type)
                       filter (where c.loop_type is not null), '{}')
     from auth.users u
     left join public.engagement_checkins c on c.user_id = u.id
     where u.id::text like 'e3900000%'
     group by u.id order by u.id $$,
  'pour chaque profil, les boucles annoncées sont celles dont un point vient d''être généré'
);

-- ── La structure : les générateurs lisent la définition, et personne ne la recopie ───────

select ok(
  regexp_replace(pg_get_functiondef('public.generate_commute_checkins()'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g') like '%public.boucles_du_dernier_bilan()%'
  and regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g') like '%public.boucles_du_dernier_bilan()%',
  'les deux générateurs lisent boucles_du_dernier_bilan'
);

-- **Ce que ce balayage couvre, et ce qu'il ne voit pas.** Il cherche le choix du dernier bilan écrit
-- par un `distinct on` — la forme que portaient les deux générateurs : le 30/09/2026, avant
-- l'extraction, il rendait exactement ces deux-là. Il ne voit pas le même choix écrit autrement :
-- `generate_plan_cycle_for_user` le porte par un `order by submitted_at desc nulls last limit 1`, et
-- c'est une copie connue, celle du plan, sur laquelle la définition partagée s'aligne.
select is_empty(
  $$ select n.nspname || '.' || p.proname
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'analytics') and p.prokind in ('f', 'p')
       and p.oid <> 'public.boucles_du_dernier_bilan(uuid)'::regprocedure
       and regexp_replace(pg_get_functiondef(p.oid), '--[^' || chr(10) || ']*', '', 'g')
           ~* 'distinct\s+on' $$,
  'aucune autre fonction ne recopie le choix du dernier bilan'
);

select * from finish();
rollback;
