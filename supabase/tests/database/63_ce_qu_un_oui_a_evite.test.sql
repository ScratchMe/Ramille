-- Tests pgTAP : ce qu'un « oui » au point a évité, au moins (étape 6a de
-- `docs/architecture/v1-35-l-audit-en-chantiers.md`, migration `ce_qu_un_oui_a_evite`, 24/10/2026).
--
-- **Ce que ce fichier garde.** Un « oui » se compte **au moins une fois** — décision de la personne qui
-- pilote : un aller sur le trajet, une journée de télétravail, un aller pour une sortie faite autrement,
-- une sortie entière pour deux sorties regroupées, l'action entière pour un voyage. Trois choses :
--
--   1. **L'estimateur rend le gain d'une fois, et il s'accorde avec le gain annuel.** C'est l'assertion
--      centrale, et elle ne recopie pas la formule : le gain d'une fois, multiplié par le nombre de fois
--      que l'action compte dans l'année, doit rendre le gain annuel que le plan affiche — aux arrondis
--      près. Le nombre de fois se lit sur le gabarit et les deux hypothèses du calcul (45 semaines de
--      trajet domicile-travail, 52 de loisirs, `HYPOTHESES` dans `src/constants/methodologie.ts`) ;
--      aucun facteur n'y est relu. Une unité fausse (un aller-retour pour un aller, une jambe pour le
--      trajet entier) la fait tomber d'un facteur deux. Pour les voyages, le gain d'une fois **est** le
--      gain annuel.
--   2. **Le plan le fige** sur `plan_actions`, comme le gain annuel.
--   3. **Le point le fige** sur `engagement_checkins`, et seulement quand il porte l'action engagée :
--      ni le maintien d'un cycliste, ni la question générique, ni une action choisie pour « Le mois
--      prochain » que le point ne retient pas encore (`v1-33` D14).
--
-- **Six profils.** A — voiture, 20 km, cinq jours, deux vols courts, sorties chaque semaine en voiture
-- (10 km), le train et deux jours de télétravail possibles : toutes les opérations sauf les deux jambes ;
-- engagé sur le train. B — deux jambes, voiture puis train à moitié : le dénominateur du trajet entier.
-- C — à vélo : le maintien. D — les réponses de A, sans engagement : la question générique. E — les
-- réponses de A, une sortie regroupée choisie pour « Le mois prochain » ce mois-ci. F — les réponses de
-- A, la même sortie, à la prochaine occasion : le point du mois la retient.
--
-- **Éprouvé en le cassant, le 24/10/2026** — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
select ('f6300000-0000-0000-0000-00000000000' || p)::uuid, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'pgtap-oui-' || p || '@test.local', 'x', now(), false, now(), now()
from unnest(array['a', 'b', 'c', 'd', 'e', 'f']) p;

insert into public.assessments (id, user_id, status, submitted_at)
select ('f6310000-0000-0000-0000-00000000000' || p)::uuid, ('f6300000-0000-0000-0000-00000000000' || p)::uuid,
       'completed', now()
from unnest(array['a', 'b', 'c', 'd', 'e', 'f']) p;

-- A, D, E et F : les mêmes réponses.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, leisure_mode, leisure_distance_km, leisure_car_engine,
  flights_total_per_year, flights_short_per_year,
  household_vehicles, zone_type, transports_proches, teletravail
)
select ('f6310000-0000-0000-0000-00000000000' || p)::uuid, true, 5, 20, 'voiture',
       'thermique', false, false,
       'weekly', 'voiture', 10, 'thermique',
       2, 2,
       '1', 'periurbain', array['train'], 'deux_ou_plus'
from unnest(array['a', 'd', 'e', 'f']) p;

-- B : deux jambes, la seconde en train sur la moitié du trajet ; ses sorties sont le résiduel.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_car_engine, commute_is_carpool, commute_second_mode_used, commute_second_mode,
  commute_second_mode_share, leisure_frequency, household_vehicles, zone_type, transports_proches,
  teletravail
)
values ('f6310000-0000-0000-0000-00000000000b', true, 4, 30, 'voiture',
        'thermique', false, true, 'train',
        0.5, 'rarely', '1', 'periurbain', array['train'], 'un_jour');

-- C : à vélo, cinq jours : son point est un point de maintien.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_velo_type, commute_second_mode_used, leisure_frequency, household_vehicles, zone_type,
  transports_proches
)
values ('f6310000-0000-0000-0000-00000000000c', true, 5, 5, 'velo',
        'mecanique', false, 'rarely', '0', 'urbain_dense', array['metro_tram']);

select public.recompute_assessment_results(('f6310000-0000-0000-0000-00000000000' || p)::uuid)
from unnest(array['a', 'b', 'c', 'd', 'e', 'f']) p;

-- ── 1. L'estimateur ──────────────────────────────────────────────────────────────────────

-- Les opérations couvertes, sans quoi l'accord ci-dessous pourrait passer sur moins de cas qu'il n'en
-- dit : les cinq formes du trajet et des sorties, toutes rendues avec un gain d'une fois.
select results_eq(
  $$ select distinct t.poste, t.operation
     from unnest(array['f6310000-0000-0000-0000-00000000000a', 'f6310000-0000-0000-0000-00000000000b']::uuid[]) a
     cross join lateral public.estimate_action_savings(a) e
     join public.action_templates t on t.id = e.action_template_id
     where t.poste <> 'travel' and e.saving_kg_once is not null
     order by 1, 2 $$,
  $$ values ('commute'::text, 'remove_day'::text), ('commute', 'share_vehicle'), ('commute', 'substitute'),
            ('leisure', 'remove_trip'), ('leisure', 'substitute') $$,
  'prémisse : A et B couvrent les cinq opérations du trajet et des sorties, chacune avec un gain d''une fois'
);

-- L'accord avec le gain annuel. Le nombre de fois dans l'année : un aller pour une substitution ou un
-- partage (la part du gabarit, deux allers par jour, les jours déclarés, 45 semaines), une journée pour
-- le télétravail (les jours du gabarit, 45 semaines), un aller ou une sortie pour les loisirs (une sortie
-- par semaine chez A, 52 semaines). La tolérance couvre la troncature au centième du gain d'une fois et
-- l'arrondi au kilo du gain annuel.
select is_empty(
  $$ select a.id, e.action_text, e.saving_kg_once, e.saving_kg_year, f.fois
     from unnest(array['f6310000-0000-0000-0000-00000000000a', 'f6310000-0000-0000-0000-00000000000b']::uuid[]) a(id)
     join public.assessment_answers ans on ans.assessment_id = a.id
     cross join lateral public.estimate_action_savings(a.id) e
     join public.action_templates t on t.id = e.action_template_id
     cross join lateral (select case
         when t.poste = 'commute' and t.operation = 'remove_day' then t.trips * 45
         when t.poste = 'commute' then t.share * 2 * ans.commute_days_per_week * 45
         when t.poste = 'leisure' and t.operation = 'remove_trip' then t.share * 52
         when t.poste = 'leisure' then t.share * 2 * 52
       end as fois) f
     where t.poste <> 'travel'
       and (e.saving_kg_once is null
            or abs(e.saving_kg_once * f.fois - e.saving_kg_year) > 0.01 * f.fois + 0.5) $$,
  'le gain d''une fois, multiplié par le nombre de fois de l''année, rend le gain annuel — trajet à une ou deux jambes, sorties'
);

-- Les voyages : une fois est l'action entière, au kilo près comme la carte du plan.
select is_empty(
  $$ select e.action_text
     from public.estimate_action_savings('f6310000-0000-0000-0000-00000000000a') e
     where e.poste = 'travel' and e.saving_kg_once is distinct from e.saving_kg_year $$,
  'un voyage : le gain d''une fois est le gain annoncé, au même arrondi'
);

select is(
  (select count(*)::int from public.estimate_action_savings('f6310000-0000-0000-0000-00000000000a')
   where poste = 'travel'),
  2,
  'prémisse : A reçoit les deux actions des vols courts'
);

-- ── 2. Le plan le fige ───────────────────────────────────────────────────────────────────

select is_empty(
  $$ select pa.id
     from public.plan_actions pa
     join public.plan_cycles pc on pc.id = pa.plan_cycle_id
     join public.assessments a on a.user_id = pc.user_id
     left join lateral (
       select e.saving_kg_once from public.estimate_action_savings(a.id) e
       where e.action_template_id = pa.action_template_id
     ) e on true
     where pc.user_id::text like 'f6300000%'
       and pa.saving_kg_once is distinct from e.saving_kg_once $$,
  'chaque action du plan porte le gain d''une fois que l''estimateur rend pour son bilan'
);

select cmp_ok(
  (select count(*)::int from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id::text like 'f6300000%' and pa.saving_kg_once > 0),
  '>=', 10,
  'prémisse : les plans portent bien des gains d''une fois, et l''égalité ci-dessus ne compare pas des nuls'
);

-- ── 3. Le point le fige, quand il porte l'action ─────────────────────────────────────────

-- Les engagements, par la clé naturelle du gabarit. Les échéances sont celles que la feuille propose
-- (`intentionTimingsForPoste`) ; E choisit « Le mois prochain » aujourd'hui.
update public.plan_actions pa
   set committed_at = now(),
       intention_days = case when t.poste = 'commute' then array[2, 4]::smallint[] end,
       intention_timing = case
         when t.poste = 'commute' then null
         when pc.user_id = 'f6300000-0000-0000-0000-00000000000e' then 'le_mois_prochain'
         else 'prochaine_occasion'
       end
  from public.plan_cycles pc, public.action_templates t
 where pc.id = pa.plan_cycle_id and t.id = pa.action_template_id
   and (pc.user_id, t.action_text) in (
     ('f6300000-0000-0000-0000-00000000000a'::uuid, 'Passer deux trajets sur cinq en train'),
     ('f6300000-0000-0000-0000-00000000000e'::uuid, 'Regrouper deux sorties en une seule, une fois sur cinq'),
     ('f6300000-0000-0000-0000-00000000000f'::uuid, 'Regrouper deux sorties en une seule, une fois sur cinq')
   );

-- Les points interrogent la semaine et le mois **écoulés** : le cycle y est ramené, pour que les deux y
-- tombent quel que soit le jour où la suite tourne (fichiers 20 et 40).
update public.plan_cycles
   set period_start = least(date_trunc('week', now())::date - 7,
                            (date_trunc('month', now()) - interval '1 month')::date)
 where user_id::text like 'f6300000%';

select public.generate_commute_checkins();
select public.generate_extras_checkins();

-- Le gain attendu se relit sur l'action engagée du plan : c'est ce que le point doit avoir copié.
select results_eq(
  $$ select right(c.user_id::text, 1), c.loop_type, c.question_kind, c.committed_saving_kg_once
     from public.engagement_checkins c
     where c.user_id::text like 'f6300000%'
     order by 1, 2 $$,
  $$ select * from (values
       ('a', 'commute', 'engagement',
        (select pa.saving_kg_once from public.plan_actions pa
           join public.plan_cycles pc on pc.id = pa.plan_cycle_id
          where pc.user_id = 'f6300000-0000-0000-0000-00000000000a' and pa.committed_at is not null)),
       ('a', 'extras', 'generique', null::numeric),
       ('b', 'commute', 'generique', null),
       ('c', 'commute', 'maintien', null),
       ('d', 'commute', 'generique', null),
       ('d', 'extras', 'generique', null),
       ('e', 'commute', 'generique', null),
       ('e', 'extras', 'generique', null),
       ('f', 'commute', 'generique', null),
       ('f', 'extras', 'occasion',
        (select pa.saving_kg_once from public.plan_actions pa
           join public.plan_cycles pc on pc.id = pa.plan_cycle_id
          where pc.user_id = 'f6300000-0000-0000-0000-00000000000f' and pa.committed_at is not null))
     ) as v order by 1, 2 $$,
  'le point fige le gain d''une fois de l''action qu''il interroge — et aucun gain sans action : maintien, question générique, mois pas encore venu'
);

-- `results_eq` tient deux nuls pour égaux : les deux gains copiés se relisent non nuls.
select is(
  (select count(*)::int from public.engagement_checkins
   where user_id in ('f6300000-0000-0000-0000-00000000000a', 'f6300000-0000-0000-0000-00000000000f')
     and committed_saving_kg_once > 0),
  2,
  'prémisse : les deux points qui portent une action ont un gain non nul — l''égalité ci-dessus ne compare pas des nuls'
);

-- Le gain d'un aller en train, chez A, est bien plus petit que le gain annuel, et non nul : la colonne
-- dit une fois, pas l'année.
select ok(
  (select c.committed_saving_kg_once < pa.saving_kg_year / 50
     from public.engagement_checkins c, public.plan_actions pa
     join public.plan_cycles pc on pc.id = pa.plan_cycle_id
    where c.user_id = 'f6300000-0000-0000-0000-00000000000a' and c.loop_type = 'commute'
      and pc.user_id = c.user_id and pa.committed_at is not null),
  'chez A, le gain d''une fois est celui d''un aller, une petite part du gain de l''année'
);

-- ── 4. L'export le rend ──────────────────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub', 'f6300000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select (p ->> 'gain_d_une_fois_kg')::numeric
     from jsonb_array_elements(public.export_my_data() -> 'points_de_suivi') p
    where p ->> 'action_suivie' = 'Passer deux trajets sur cinq en train'),
  (select committed_saving_kg_once from public.engagement_checkins
    where user_id = 'f6300000-0000-0000-0000-00000000000a' and loop_type = 'commute'),
  'l''export rend le gain d''une fois du point'
);

select is(
  (select (act ->> 'gain_d_une_fois_kg')::numeric
     from jsonb_array_elements(public.export_my_data() -> 'plans') pl,
          jsonb_array_elements(pl -> 'actions') act
    where act ->> 'action' = 'Passer deux trajets sur cinq en train'),
  (select committed_saving_kg_once from public.engagement_checkins
    where user_id = 'f6300000-0000-0000-0000-00000000000a' and loop_type = 'commute'),
  'l''export rend le gain d''une fois de l''action du plan, le même que celui du point'
);

reset role;

select * from finish();
rollback;

-- Relevé des mutations, le 24/10/2026 : chacune posée sur la stack locale par une substitution dans le
-- corps installé, ce fichier rejoué, puis le corps restauré et son empreinte relue.
--   - M1, une journée de télétravail comptée comme un aller → 2, seule ;
--   - M2, le dénominateur du trajet sans la seconde jambe → 2, seule (les lignes de B) ;
--   - M3, une sortie regroupée comptée comme un aller → 2, seule ;
--   - M4, le gain d'un voyage tronqué au lieu d'arrondi → 3 ; et la contrainte de `plan_actions` refuse
--     alors le plan entier (le gain d'une fois y dépasse le gain annuel de quelques centièmes), d'où 6 à
--     9, qui lisent des plans vides ;
--   - M5, un aller compté comme un aller-retour → 2, seule ;
--   - M6, le plan qui ne fige pas → 5, 6, 8 et 9 ; 7 passe, nul contre nul, et c'est ce que 8 existe
--     pour dire ;
--   - M7, le point du mois qui copie le gain sans regarder le genre → 7, seule (E, le mois pas encore
--     venu) ;
--   - M8, le point de la semaine qui copie sans regarder le genre → **rien ne tombe**, et c'est attendu :
--     le genre n'y écarte que le maintien, et un cycliste n'a aucune action sur son trajet — l'estimateur
--     ne lui en propose aucune (un facteur nul ou un gain sous 5 kg). La condition est défensive ; une
--     fixture qui engagerait un cycliste écrirait un état que la production ne produit pas ;
--   - M9, le point du mois qui ne fige pas → 7 et 8 ;
--   - M10, l'export qui tait le gain du point → 10, seule.
