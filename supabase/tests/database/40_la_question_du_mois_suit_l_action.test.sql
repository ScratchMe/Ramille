-- Tests pgTAP : la question du mois suit l'action engagée (30/09/2026, `v1-27` §12.25, migration
-- `20260930151846_la_question_du_mois_suit_l_action.sql`).
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
--     décembre avant 6 h — la reconduction ne garde pas une action de loisirs, et le cycle d'automne
--     garde son engagement. La fixture y arrive par un raccourci : les réponses réécrites et le bilan
--     recalculé **avant** que le cycle ne soit ramené sur le mois écoulé, pour que la génération du
--     plan retrouve le cycle de la saison et que sa garde d'idempotence le laisse tel quel (un seul
--     cycle, relu en prémisse). La question porte sur l'action de novembre, et **jamais sous le
--     libellé du résiduel** (« Loisirs du week-end (occasionnels) »), qui décrit des sorties que la
--     personne dit ne presque pas faire ;
--   - **O** — les réponses de K, et **deux cycles qui couvrent le mois**, écrits à la main comme au
--     fichier 33 (la cadence `rolling_quarter`, dormante, est le seul chemin de production vers ce
--     chevauchement) : les sorties engagées dans l'un, puis les voyages, plus récemment, dans l'autre.
--     Le point porte sur les voyages : l'engagement le plus récent gagne d'un poste à l'autre comme
--     `action_engagee_de_la_periode` le fait pour un poste. Un ordre fixe entre les deux postes
--     prendrait les sorties — et le poste le plus lourd aussi, ce qui rend le profil concluant.
--
-- **Éprouvé en le cassant, le 30/09/2026** (TESTING.md §1.1), huit mutations du générateur, une à la
-- fois sur la stack locale, la migration réappliquée après chacune, **la suite pgTAP entière**
-- rejouée à chaque fois :
--   - la règle d'avant (le poste le plus lourd, sans regarder l'action) → ici J (poste, action,
--     question), K, N et O ; rien ailleurs ;
--   - un ordre fixe entre les deux postes (les sorties d'abord) → O et la structure, seuls. C'est la
--     première écriture de cette migration, et la contre-lecture du soir l'a trouvée ;
--   - l'engagement le plus ancien au lieu du plus récent → O, seul ;
--   - l'action cherchée sur `extras_poste` au lieu du poste de la boucle → J (action et question),
--     K et O ici, le profil I du fichier 20 et la structure du fichier 33 ;
--   - le libellé toujours repris du bilan → J, K, N et O ici, et le profil H du fichier 20, dont les
--     sorties rares nomment leurs voyages sans mode ;
--   - le libellé du résiduel repris quand l'action porte sur les sorties d'un profil « rarement » →
--     N, seul. C'est la mutation qui justifie ce profil ;
--   - le libellé jamais repris du bilan → M et L ici, le profil G du fichier 20 et trois questions du
--     mois du fichier 38 : c'est le cas courant, et il garde son mode ;
--   - le cas sans `extras_poste` retiré → les profils A et B du fichier 04, seuls, dont les résultats
--     écrits à la main n'en ont pas. B y a été épinglé le même soir : sans lui, les sorties rares
--     sans `extras_poste` changeaient de libellé sans que rien ne le voie. **Ce que rien n'éprouve** :
--     que ce cas cède à une action engagée (le libellé suit alors la question). Aucune ligne de
--     production n'a d'`extras_poste` nul, et une fixture qui l'écrirait avec une action éprouverait
--     un état que la production ne produit pas.
-- **Et la fixture de N remise dans son ordre d'avant** (le cycle ramené sur le mois écoulé **avant**
-- le nouveau bilan) fait tomber sa prémisse le 30/09/2026 : la génération ne retrouve plus le cycle
-- de la saison et en crée un second. Les assertions de N passaient alors quand même, pour une autre
-- raison que celle écrite — c'est ce que la prémisse existe pour dire. **Ce résultat dépend du mois
-- où la suite tourne** : la prémisse tombe quand c'est le premier ou le troisième mois d'une saison
-- (septembre en est un premier) ; au deuxième — octobre, janvier, avril, juillet —, le mois écoulé
-- ouvre la saison, le recul ne déplace rien, et la prémisse passe dans les deux ordres.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

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
  'e4000000-0000-0000-0000-00000000000e',        -- N
  'e4000000-0000-0000-0000-00000000000f'         -- O
]) u;

insert into public.assessments (id, user_id, status, submitted_at)
select replace(u::text, 'e4000000', 'e4010000')::uuid, u, 'completed', now()
from unnest(array[
  'e4000000-0000-0000-0000-00000000000a'::uuid, 'e4000000-0000-0000-0000-00000000000b',
  'e4000000-0000-0000-0000-00000000000c', 'e4000000-0000-0000-0000-00000000000d',
  'e4000000-0000-0000-0000-00000000000e', 'e4000000-0000-0000-0000-00000000000f'
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

-- K et O : sorties plus longues (592 kg), deux longs trajets en voiture par an (199 kg).
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  leisure_mode, leisure_distance_bracket, leisure_car_engine, car_long_trips_per_year,
  car_long_trips_engine, household_vehicles, zone_type, tc_access)
select a, false, 'weekly', 'voiture', '30_plus', 'thermique', 2, 'thermique', '1', 'periurbain', 'bon'
from unnest(array[
  'e4010000-0000-0000-0000-00000000000b'::uuid, 'e4010000-0000-0000-0000-00000000000f'
]) a;

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
  'e4000000-0000-0000-0000-00000000000e', 'e4000000-0000-0000-0000-00000000000f'
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

-- N répond désormais « rarement ». Le plan n'est pas reconstruit : le cycle est encore sur la
-- saison, que la génération retrouve, et dans la transaction `now()` est figé — sa garde
-- d'idempotence voit un cycle aussi récent que le bilan. C'est le raccourci dit en tête du fichier,
-- et il doit précéder la ligne suivante : un cycle déjà ramené sur le mois écoulé ne serait plus
-- retrouvé, et la génération en créerait un second (constat de la contre-lecture du 30/09/2026).
update public.assessment_answers
   set leisure_frequency = 'rarely', leisure_mode = null, leisure_distance_bracket = null,
       leisure_car_engine = null
 where assessment_id = 'e4010000-0000-0000-0000-00000000000e';
select public.recompute_assessment_results('e4010000-0000-0000-0000-00000000000e');

-- La boucle cherche l'action du cycle qui couvre le mois **écoulé** : le cycle y est ramené, comme
-- au fichier 20, pour que le mois dernier y tombe quel que soit le jour où la suite tourne. O a ses
-- propres cycles, plus bas.
update public.plan_cycles
   set period_start = (date_trunc('month', now()) - interval '1 month')::date
 where user_id::text like 'e4000000%' and user_id <> 'e4000000-0000-0000-0000-00000000000f';

-- O : deux cycles qui couvrent le mois écoulé. Leurs débuts ne tombent jamais un 1er, donc jamais
-- sur celui du cycle de saison que son bilan vient de générer (unicité par compte et par début).
insert into public.plan_cycles (id, user_id, cadence_type, period_label, period_start, period_end,
                                trip_label, target_reduction_pct)
values
  ('e4020000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-00000000000f', 'season',
   'Saison', (date_trunc('month', now()) - interval '2 months' + interval '1 day')::date,
   (date_trunc('month', now()) - interval '1 day')::date, 'Loisirs du week-end', 10),
  ('e4020000-0000-0000-0000-000000000002', 'e4000000-0000-0000-0000-00000000000f', 'rolling_quarter',
   'Trimestre glissant', (date_trunc('month', now()) - interval '1 month' - interval '14 days')::date,
   (date_trunc('month', now()) + interval '1 month')::date, 'Loisirs du week-end', 10);

insert into public.plan_actions (plan_cycle_id, action_template_id, rank, committed_at, intention_timing)
select v.cycle, t.id, 1, v.engagee_le, v.echeance
from (values
  ('e4020000-0000-0000-0000-000000000001'::uuid, 'Regrouper deux sorties en une seule, une fois sur cinq',
   now() - interval '2 days', 'prochaine_occasion'),
  ('e4020000-0000-0000-0000-000000000002'::uuid, 'Faire un de tes longs trajets en train plutôt qu''en voiture',
   now() - interval '1 day', 'au_prochain_voyage')
) as v(cycle, action_text, engagee_le, echeance)
join public.action_templates t on t.action_text = v.action_text;

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
            ('e4000000-0000-0000-0000-00000000000e', 'leisure', 1),
            ('e4000000-0000-0000-0000-00000000000f', 'leisure', 2) $$,
  'prémisses : le poste le plus lourd de chaque profil, et une action engagée sauf chez le témoin — deux chez O'
);

select is(
  (select count(*)::int from public.plan_cycles where user_id = 'e4000000-0000-0000-0000-00000000000e'),
  1,
  'prémisse de N : son nouveau bilan n''a pas créé de second cycle — seul le cycle engagé couvre le mois'
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
  'J : la question figée est celle du gabarit de l''action engagée'
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

-- ── O : deux cycles, deux engagements ────────────────────────────────────────────────────

select results_eq(
  $$ select poste, trip_label, question_kind, committed_action_text from public.engagement_checkins
     where user_id = 'e4000000-0000-0000-0000-00000000000f' and loop_type = 'extras' $$,
  $$ values ('travel'::text, 'Voyages longue distance'::text, 'occasion'::text,
             'Faire un de tes longs trajets en train plutôt qu''en voiture'::text) $$,
  'O : deux cycles couvrent le mois — l''engagement le plus récent décide du poste, d''un poste à l''autre'
);

-- ── La structure : le poste suivi se demande à la fonction, par poste ────────────────────
-- Les commentaires sont retirés avant la recherche, comme au fichier 33.

select ok(
  regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g')
    like '%(values (''leisure''::text), (''travel''::text))%public.action_engagee_de_la_periode(a.user_id, v.poste, v_period_start)%',
  'la boucle mensuelle demande l''action engagée à action_engagee_de_la_periode, sur chacun des deux postes'
);

select * from finish();
rollback;
