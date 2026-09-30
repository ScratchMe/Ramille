-- Tests pgTAP : la carte d'attente sait si une boucle tourne (30/09/2026, `v1-27` §12.22, migration
-- `20260930120000_la_carte_d_attente_sait_si_une_boucle_tourne.sql`).
--
-- **Le défaut** : l'écran du plan décidait de la boucle à nommer sur le seul poste
-- domicile-travail, donc toute personne sans trajet lisait « Je te fais signe au début du mois
-- prochain » — y compris quand la boucle mensuelle ne tourne pas (le profil sédentaire de C2.5 :
-- aucun trajet, sorties rares, aucun voyage déclaré). Le signe promis n'arrivait jamais. Décision de
-- la personne qui pilote : dans ce cas, Ramille ne promet rien.
--
-- **Ce que ce fichier défend** : l'écran lit `ma_boucle_a_venir()`, qui lit
-- `boucles_du_dernier_bilan`, que lisent aussi les deux générateurs. Une seule définition de « qui
-- reçoit quelle boucle » ; l'accord entre ce que l'écran annonce et ce que les générateurs
-- produisent est vérifié sur les mêmes profils, et la structure empêche qu'un générateur
-- réécrive le choix en ligne.
--
-- **Éprouvé en le cassant, le 30/09/2026** (TESTING.md §1.1), une mutation à la fois, retirée
-- ensuite :
--   - le repli de `ma_boucle_a_venir` remis sur `mensuel` (l'état d'avant, vu de l'écran) → K3, K5
--     et K6, les trois profils sans boucle. La session absente ne tombe pas : elle sort par la
--     garde, avant le repli ;
--   - la garde de session retirée de `ma_boucle_a_venir` → la session absente, seule : l'appel à
--     `null` interroge tout le monde, et rend la boucle de quelqu'un d'autre ;
--   - le `revoke` de `boucles_du_dernier_bilan` sans `public` → les privilèges, seuls ;
--   - la base déclarée retirée de `boucles_du_dernier_bilan` (`a_des_voyages_declares` ôté du filtre)
--     → six sur la suite entière : K4, seul ici ; quatre assertions du fichier 20 (les profils G, H
--     et I) ; et l'assertion de structure du fichier 33, qui cherche l'appel. **L'accord avec les
--     générateurs ne tombe pas**, et c'est attendu : ils lisent la même fonction, donc ils se
--     trompent ensemble. Il garde contre une définition recopiée, pas contre une définition fausse ;
--   - `generate_commute_checkins` remise dans son corps de `20260930092838` → les deux assertions de
--     structure, et elles seules — aucun comportement ne change, c'est la définition d'une
--     extraction neutre.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- ── Les privilèges ──────────────────────────────────────────────────────────────────────

select ok(
  not has_function_privilege('authenticated', 'public.boucles_du_dernier_bilan(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.boucles_du_dernier_bilan(uuid)', 'execute'),
  'boucles_du_dernier_bilan n''est appelable que côté serveur — avec un argument nul, elle répond pour tout le monde'
);

select ok(
  has_function_privilege('authenticated', 'public.ma_boucle_a_venir()', 'execute')
  and not has_function_privilege('anon', 'public.ma_boucle_a_venir()', 'execute'),
  'ma_boucle_a_venir est appelable par authenticated, et par lui seul'
);

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
select is(public.ma_boucle_a_venir(), 'hebdo',
  'K1 : un trajet — la boucle hebdomadaire passe devant, c''est le prochain contact');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select is(public.ma_boucle_a_venir(), 'mensuel',
  'K2 : pas de trajet, des sorties — la boucle mensuelle');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
select is(public.ma_boucle_a_venir(), 'aucune',
  'K3 : sédentaire — aucune boucle, et la carte ne promet rien');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
select is(public.ma_boucle_a_venir(), 'mensuel',
  'K4 : sort rarement mais a déclaré un voyage — la boucle mensuelle tourne');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);
select is(public.ma_boucle_a_venir(), 'aucune',
  'K5 : le dernier bilan décide — l''ancien trajet ne fait rien promettre');

select set_config('request.jwt.claims',
  json_build_object('sub', 'e3900000-0000-0000-0000-000000000006', 'role', 'authenticated')::text, true);
select is(public.ma_boucle_a_venir(), 'aucune',
  'K6 : aucun bilan — aucune boucle');

select set_config('request.jwt.claims', '', true);
select is(public.ma_boucle_a_venir(), 'aucune',
  'sans session : aucune — jamais la boucle de quelqu''un d''autre');

select set_config('role', 'postgres', true);

-- ── Ce que l'écran annonce est ce que les générateurs produisent ─────────────────────────

select results_eq(
  $$ select u.id,
            case when bool_or(o.loop_type = 'commute') then 'hebdo'
                 when bool_or(o.loop_type = 'extras') then 'mensuel'
                 else 'aucune' end
     from auth.users u
     left join public.boucles_du_dernier_bilan(u.id) o on true
     where u.id::text like 'e3900000%'
     group by u.id order by u.id $$,
  $$ select u.id,
            case when bool_or(c.loop_type = 'commute') then 'hebdo'
                 when bool_or(c.loop_type = 'extras') then 'mensuel'
                 else 'aucune' end
     from auth.users u
     left join public.engagement_checkins c on c.user_id = u.id
     where u.id::text like 'e3900000%'
     group by u.id order by u.id $$,
  'pour chaque profil, la boucle annoncée est celle dont un point vient d''être généré'
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
