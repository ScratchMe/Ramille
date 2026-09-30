-- Tests pgTAP : la question du mois suit l'action engagée (30/09/2026, `v1-27` §12.25, migration
-- `20260930150000_la_question_du_mois_suit_l_action.sql`).
--
-- **Le défaut** : la boucle mensuelle interrogeait le poste le plus lourd des sorties et des
-- voyages — les voyages pour qui sort rarement — et ne cherchait l'action engagée que sur ce
-- poste-là. Une action choisie sur l'autre poste n'était jamais interrogée, alors que la feuille
-- ouverte après « C'est noté » promet « Au début du mois prochain, je reviens te demander si tu l'as
-- faite ». Décision de la personne qui pilote : la question du mois suit l'action engagée.
--
-- **Cinq profils, et ce que chacun garde** :
--   - **J** — voyages plus lourds (un vol long-courrier), action engagée sur ses **sorties** : le
--     point porte sur les sorties, nommées sans mode, et referme l'action ;
--   - **K** — sorties plus lourdes, action engagée sur ses **voyages** (deux longs trajets en
--     voiture) : l'autre sens ;
--   - **M** — les réponses de J, action engagée sur les **voyages**, le poste le plus lourd : rien ne
--     bascule, et le libellé garde son mode — le seul libellé que le bilan fige ;
--   - **L** — les réponses de J, **aucune action** : le témoin, question générique sur le poste le
--     plus lourd. Sans lui, la bascule de J pourrait venir d'une règle qui ne regarde plus le poids ;
--   - **N** — une action de sorties engagée, puis un bilan « rarement » : l'état qu'atteint, au
--     changement de saison, quelqu'un qui s'est engagé en novembre et refait son bilan le 1er
--     décembre avant 6 h. La fixture y arrive par un raccourci (les réponses réécrites, le plan gardé
--     par sa garde d'idempotence), mais l'état est de ceux que la production peut produire. La
--     question porte sur l'action de novembre, et **jamais sous le libellé du résiduel** (« Loisirs
--     du week-end (occasionnels) »), qui décrit des sorties que la personne dit ne presque pas faire.
--
-- **Éprouvé en le cassant, le 30/09/2026** (TESTING.md §1.1), six mutations du générateur, une à la
-- fois sur la stack locale, la migration réappliquée après chacune. Les quatre dernières ont été
-- rejouées sur la suite entière, les deux premières sur ce fichier et les fichiers 20, 33, 38 et 39 :
--   - la règle d'avant (le poste le plus lourd, sans regarder l'action) → ici J (poste, action,
--     question), K, N et la structure ; rien ailleurs ;
--   - l'action cherchée sur `extras_poste` au lieu du poste de la boucle → J (action et question) et
--     K ici, le profil I du fichier 20 et la structure du fichier 33 ;
--   - le libellé toujours repris du bilan → J, K et N ici, et le profil H du fichier 20, dont les
--     sorties rares nomment leurs voyages sans mode ;
--   - le libellé du résiduel repris quand l'action porte sur les sorties d'un profil « rarement » →
--     N, seul. C'est la mutation qui justifie ce profil ;
--   - le libellé jamais repris du bilan → M et L ici, le profil G du fichier 20, trois questions du
--     mois du fichier 38 et le profil A du fichier 04 : c'est le cas courant, et il garde son mode ;
--   - l'égalité stricte au lieu de `is not distinct from` → le profil A du fichier 04, seul, dont le
--     résultat écrit à la main n'a pas d'`extras_poste` : c'est lui qui a imposé la comparaison.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-suit-' || right(u::text, 1) || '@test.local', 'x', now(), false, now(), now()
from unnest(array[
  'e4000000-0000-0000-0000-00000000000a'::uuid,  -- J
  'e4000000-0000-0000-0000-00000000000b',        -- K
  'e4000000-0000-0000-0000-00000000000c',        -- L
  'e4000000-0000-0000-0000-00000000000d',        -- M
  'e4000000-0000-0000-0000-00000000000e'         -- N
]) u;

insert into public.assessments (id, user_id, status, submitted_at)
select replace(u::text, 'e4000000', 'e4010000')::uuid, u, 'completed', now()
from unnest(array[
  'e4000000-0000-0000-0000-00000000000a'::uuid, 'e4000000-0000-0000-0000-00000000000b',
  'e4000000-0000-0000-0000-00000000000c', 'e4000000-0000-0000-0000-00000000000d',
  'e4000000-0000-0000-0000-00000000000e'
]) u;

-- J, L et M : sorties chaque semaine en voiture (333 kg), un vol long-courrier par an (1 601 kg).
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  leisure_mode, leisure_distance_bracket, leisure_car_engine, flights_total_per_year,
  flights_short_per_year, household_vehicles, zone_type, tc_access)
select a, false, 'weekly', 'voiture', '15_30', 'thermique', 1, 0, '1', 'periurbain', 'bon'
from unnest(array[
  'e4010000-0000-0000-0000-00000000000a'::uuid, 'e4010000-0000-0000-0000-00000000000c',
  'e4010000-0000-0000-0000-00000000000d'
]) a;

-- K : sorties plus longues (592 kg), deux longs trajets en voiture par an (199 kg).
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  leisure_mode, leisure_distance_bracket, leisure_car_engine, car_long_trips_per_year,
  car_long_trips_engine, household_vehicles, zone_type, tc_access)
values ('e4010000-0000-0000-0000-00000000000b', false, 'weekly', 'voiture', '30_plus', 'thermique',
        2, 'thermique', '1', 'periurbain', 'bon');

-- N : les sorties de J et un long trajet en train, avant qu'il ne réponde « rarement ».
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  leisure_mode, leisure_distance_bracket, leisure_car_engine, train_long_trips_per_year,
  household_vehicles, zone_type, tc_access)
values ('e4010000-0000-0000-0000-00000000000e', false, 'weekly', 'voiture', '15_30', 'thermique', 1,
        '1', 'periurbain', 'bon');

select public.recompute_assessment_results(replace(u::text, 'e4000000', 'e4010000')::uuid)
from unnest(array[
  'e4000000-0000-0000-0000-00000000000a'::uuid, 'e4000000-0000-0000-0000-00000000000b',
  'e4000000-0000-0000-0000-00000000000c', 'e4000000-0000-0000-0000-00000000000d',
  'e4000000-0000-0000-0000-00000000000e'
]) u;

-- Les engagements, par la clé naturelle du gabarit. Les échéances sont celles que la feuille
-- propose au poste (`intentionTimingsForPoste`).
update public.plan_actions pa
   set committed_at = now(),
       intention_timing = case t.poste when 'travel' then 'au_prochain_voyage' else 'prochaine_occasion' end
  from public.plan_cycles pc, public.action_templates t
 where pc.id = pa.plan_cycle_id and t.id = pa.action_template_id
   and (pc.user_id, t.action_text) in (
     ('e4000000-0000-0000-0000-00000000000a'::uuid, 'Faire une sortie sur trois à vélo à assistance électrique'),
     ('e4000000-0000-0000-0000-00000000000b'::uuid, 'Faire un de tes longs trajets en train plutôt qu''en voiture'),
     ('e4000000-0000-0000-0000-00000000000d'::uuid, 'Renoncer à un vol long-courrier cette année'),
     ('e4000000-0000-0000-0000-00000000000e'::uuid, 'Faire une sortie sur trois à vélo à assistance électrique')
   );

-- La boucle cherche l'action du cycle qui couvre le mois **écoulé** : le cycle y est ramené, comme
-- au fichier 20, pour que le mois dernier y tombe quel que soit le jour où la suite tourne.
update public.plan_cycles
   set period_start = (date_trunc('month', now()) - interval '1 month')::date
 where user_id::text like 'e4000000%';

-- N répond désormais « rarement ». Le plan n'est pas reconstruit : dans la transaction, `now()` est
-- figé et la garde d'idempotence voit un cycle aussi récent que le bilan — c'est le raccourci dit
-- en tête du fichier.
update public.assessment_answers
   set leisure_frequency = 'rarely', leisure_mode = null, leisure_distance_bracket = null,
       leisure_car_engine = null
 where assessment_id = 'e4010000-0000-0000-0000-00000000000e';
select public.recompute_assessment_results('e4010000-0000-0000-0000-00000000000e');

-- Les prémisses se relisent : sans elles, une assertion pourrait passer sur un profil qui n'est pas
-- celui qu'elle décrit.
select results_eq(
  $$ select a.user_id::text, ar.extras_poste,
            (select count(*)::int from public.plan_actions pa
               join public.plan_cycles pc on pc.id = pa.plan_cycle_id
              where pc.user_id = a.user_id and pa.committed_at is not null)
     from public.assessment_results ar join public.assessments a on a.id = ar.assessment_id
     where a.user_id::text like 'e4000000%' order by a.user_id $$,
  $$ values ('e4000000-0000-0000-0000-00000000000a', 'travel'::text, 1),
            ('e4000000-0000-0000-0000-00000000000b', 'leisure', 1),
            ('e4000000-0000-0000-0000-00000000000c', 'travel', 0),
            ('e4000000-0000-0000-0000-00000000000d', 'travel', 1),
            ('e4000000-0000-0000-0000-00000000000e', 'leisure', 1) $$,
  'prémisses : le poste le plus lourd de chaque profil, et une action engagée sauf chez le témoin'
);

select public.generate_extras_checkins();

-- ── J : voyages plus lourds, action engagée sur les sorties ──────────────────────────────

select results_eq(
  $$ select poste, trip_label from public.engagement_checkins
     where user_id = 'e4000000-0000-0000-0000-00000000000a' and loop_type = 'extras' $$,
  $$ values ('leisure'::text, 'Loisirs du week-end'::text) $$,
  'J : le point du mois porte sur les sorties, où l''action est engagée — nommées sans mode'
);

select results_eq(
  $$ select question_kind, committed_action_text from public.engagement_checkins
     where user_id = 'e4000000-0000-0000-0000-00000000000a' and loop_type = 'extras' $$,
  $$ values ('occasion'::text, 'Faire une sortie sur trois à vélo à assistance électrique'::text) $$,
  'J : et la question referme l''action choisie, la promesse de la feuille tenue'
);

select is(
  (select c.committed_question from public.engagement_checkins c
   where c.user_id = 'e4000000-0000-0000-0000-00000000000a' and c.loop_type = 'extras'),
  (select public.checkin_question('extras', 'occasion', 'leisure', null, c.period_start,
                                  t.question_template, null)
   from public.engagement_checkins c, public.action_templates t
   where c.user_id = 'e4000000-0000-0000-0000-00000000000a' and c.loop_type = 'extras'
     and t.action_text = 'Faire une sortie sur trois à vélo à assistance électrique'),
  'J : la question figée est celle du gabarit de l''action, composée sur les sorties'
);

-- **La bascule vit dans la boucle, jamais dans le bilan**, comme pour les sorties rares : l'app lit
-- `extras_poste` et son libellé ailleurs (la restitution, le plan).
select is(
  (select extras_poste from public.assessment_results
   where assessment_id = 'e4010000-0000-0000-0000-00000000000a'),
  'travel',
  'J : le résultat du bilan garde les voyages comme poste le plus lourd — seule la boucle suit l''action'
);

-- ── K : sorties plus lourdes, action engagée sur les voyages ─────────────────────────────

select results_eq(
  $$ select poste, trip_label, question_kind, committed_action_text from public.engagement_checkins
     where user_id = 'e4000000-0000-0000-0000-00000000000b' and loop_type = 'extras' $$,
  $$ values ('travel'::text, 'Voyages longue distance'::text, 'occasion'::text,
             'Faire un de tes longs trajets en train plutôt qu''en voiture'::text) $$,
  'K : l''autre sens — le point porte sur les voyages, où l''action est engagée'
);

-- ── M : action engagée sur le poste le plus lourd ────────────────────────────────────────

select results_eq(
  $$ select poste, trip_label, question_kind from public.engagement_checkins
     where user_id = 'e4000000-0000-0000-0000-00000000000d' and loop_type = 'extras' $$,
  $$ values ('travel'::text, 'Voyages longue distance (Avion long-courrier)'::text, 'occasion'::text) $$,
  'M : action sur le poste le plus lourd — rien ne bascule, et le libellé garde son mode'
);

-- ── L : le témoin, sans action ───────────────────────────────────────────────────────────

select results_eq(
  $$ select poste, trip_label, question_kind, committed_action_text from public.engagement_checkins
     where user_id = 'e4000000-0000-0000-0000-00000000000c' and loop_type = 'extras' $$,
  $$ values ('travel'::text, 'Voyages longue distance (Avion long-courrier)'::text,
             'generique'::text, null::text) $$,
  'L : sans action, la question générique porte toujours sur le poste le plus lourd'
);

-- ── N : une action de sorties, puis « rarement » ─────────────────────────────────────────

select results_eq(
  $$ select poste, trip_label, question_kind, committed_action_text from public.engagement_checkins
     where user_id = 'e4000000-0000-0000-0000-00000000000e' and loop_type = 'extras' $$,
  $$ values ('leisure'::text, 'Loisirs du week-end'::text, 'occasion'::text,
             'Faire une sortie sur trois à vélo à assistance électrique'::text) $$,
  'N : l''action engagée est interrogée, et jamais sous le libellé du résiduel des sorties rares'
);

-- ── La structure : le poste suivi se demande à la fonction, par poste ────────────────────
-- Les commentaires sont retirés avant la recherche, comme au fichier 33.

select ok(
  regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g')
    like '%public.action_engagee_de_la_periode(a.user_id, ''leisure'', v_period_start)%'
  and regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g')
    like '%public.action_engagee_de_la_periode(a.user_id, ''travel'', v_period_start)%',
  'la boucle mensuelle demande l''action engagée à action_engagee_de_la_periode, sur chacun des deux postes'
);

select * from finish();
rollback;
