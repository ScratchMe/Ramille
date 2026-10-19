-- Un aller-retour en avion compte pour deux vols (migration `l_aller_retour_vaut_deux_vols`).
--
-- Ce que ce fichier garde : « Remplacer un aller-retour en avion par le train » rapporte le gain de
-- **deux** vols, parce que le questionnaire compte en trajets simples (« Un aller-retour compte pour
-- deux vols ») et que `action_templates.trips` se compte dans la même unité. Il portait 1 : le gain
-- affiché était celui d'un aller simple, la moitié de ce que le libellé annonce.
--
-- Trois profils, qui ne diffèrent que par le nombre de vols courts déclarés — un, deux, quatre —,
-- parce que c'est la borne qui distingue les deux défauts possibles : la quantité du gabarit (deux, et
-- non un) et le `least` de l'estimateur (la déclaration plafonne, et le gabarit aussi). Quatre vols
-- déclarés ne sont crédités que de deux. **Et depuis le 19/10/2026, un seul vol déclaré ne se voit plus
-- proposer l'aller-retour** (`20261019140000`, décision de la personne qui pilote) : le plan ne promet
-- pas plus de trajets que la personne n'en a déclaré, et il lui reste « Renoncer à un vol … ».
--
-- Les valeurs attendues se **dérivent** du facteur et de l'instantané du bilan au lieu de se figer :
-- une resynchronisation ADEME ne périme donc pas ce fichier, et aucun « 1 500 km » n'y est recopié.
-- La valeur chiffrée du profil à deux vols est épinglée à part, au fichier `10`.
--
-- Éprouvé en le cassant le 18/10/2026 (`TESTING.md` §1.1) — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select ('a5700000-0000-0000-0000-00000000000' || n)::uuid, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'pgtap-aller-retour-' || n || '@test.local', 'x', now(), now()
from generate_series(1, 3) n;

insert into public.assessments (id, user_id, status, submitted_at)
select ('b5700000-0000-0000-0000-00000000000' || n)::uuid, ('a5700000-0000-0000-0000-00000000000' || n)::uuid,
       'completed', now()
from generate_series(1, 3) n;

-- Aucun trajet régulier ni long trajet : les vols courts sont la seule chose déclarée, donc le seul
-- poste du bilan.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency,
  flights_total_per_year, flights_short_per_year,
  zone_type, tc_access, transports_proches, household_vehicles
)
select ('b5700000-0000-0000-0000-00000000000' || p.n)::uuid, false, 'rarely',
       p.vols, p.vols,
       'periurbain', 'limite', array['bus', 'train'], '1'
from (values (1, 1), (2, 2), (3, 4)) as p(n, vols);

select public.recompute_assessment_results(('b5700000-0000-0000-0000-00000000000' || n)::uuid)
from generate_series(1, 3) n;

-- La part du vol que le train ne consomme pas : le rapport même de l'estimateur, relu des facteurs à
-- la date du bilan (celle de `submitted_at`, posée à maintenant).
select set_config(
  'ramille.part_evitee',
  (1 - public.emission_factor('train_longue_distance', current_date)
       / public.emission_factor('avion_court_moyen_courrier', current_date))::text,
  true
);

-- Le décor est complet : sans les trois instantanés, les valeurs dérivées ci-dessous seraient nulles
-- et `is(null, null)` passerait pour la mauvaise raison.
select is(
  (select count(*)::int from public.assessment_results ar
   where ar.assessment_id::text like 'b5700000%' and ar.travel_flight_short_co2_kg_year > 0),
  3,
  'fixtures : les trois bilans portent un CO2 de vols courts'
);

-- ── 1. La quantité du gabarit, et ce que l'estimateur en fait ───────────────────────────────

select is(
  (select trips from public.action_templates where action_text = 'Remplacer un aller-retour en avion par le train'),
  2::numeric,
  'le gabarit d''un aller-retour compte deux vols — l''unité du questionnaire, où un aller-retour en compte deux'
);

-- Deux vols déclarés, donc l'aller-retour entier : tout le CO2 des vols courts, moins ce que le train
-- consomme. C'est ce que l'ancien gabarit ne rendait qu'à moitié.
select is(
  (select saving_kg_year from public.estimate_action_savings('b5700000-0000-0000-0000-000000000002')
   where action_text = 'Remplacer un aller-retour en avion par le train'),
  (select round(ar.travel_flight_short_co2_kg_year * current_setting('ramille.part_evitee')::numeric)
   from public.assessment_results ar where ar.assessment_id = 'b5700000-0000-0000-0000-000000000002'),
  'deux vols déclarés : l''aller-retour rapporte les deux, soit tout le CO2 des vols courts moins celui du train'
);

-- Un seul vol déclaré : l'aller-retour n'est pas proposé (19/10/2026). Il était proposé avec le gain
-- d'un vol sous un libellé qui en promet deux.
select is_empty(
  $$ select action_text from public.estimate_action_savings('b5700000-0000-0000-0000-000000000001')
     where action_text = 'Remplacer un aller-retour en avion par le train' $$,
  'un seul vol déclaré : l''aller-retour n''est pas proposé, le plan ne promet pas deux vols'
);

-- Et le gabarit plafonne aussi : quatre vols déclarés, deux remplacés — la moitié de leur CO2.
select is(
  (select saving_kg_year from public.estimate_action_savings('b5700000-0000-0000-0000-000000000003')
   where action_text = 'Remplacer un aller-retour en avion par le train'),
  (select round(ar.travel_flight_short_co2_kg_year / 2 * current_setting('ramille.part_evitee')::numeric)
   from public.assessment_results ar where ar.assessment_id = 'b5700000-0000-0000-0000-000000000003'),
  'quatre vols déclarés : l''aller-retour en remplace deux, pas un ni quatre'
);

-- Et ce qui lui reste : renoncer à son vol, dont le libellé et le gain s'accordent. Sans ce témoin, la
-- garde pourrait écarter tous les voyages de qui n'a qu'un vol, et l'assertion d'au-dessus passerait.
select is(
  (select saving_kg_year from public.estimate_action_savings('b5700000-0000-0000-0000-000000000001')
   where action_text = 'Renoncer à un vol court ou moyen-courrier cette année'),
  (select round(ar.travel_flight_short_co2_kg_year)
   from public.assessment_results ar where ar.assessment_id = 'b5700000-0000-0000-0000-000000000001'),
  'un seul vol déclaré : « Renoncer à un vol … » reste proposé, avec tout le CO2 de ce vol'
);

-- La règle est générale, et ce balayage la lit sur les vols courts, seuls déclarés ici : aucun gabarit
-- n'est proposé à qui a déclaré moins de vols qu'il n'en remplace — celui qu'on ajoutera demain compris.
select is_empty(
  $$ select p.n, t.action_text
     from (values (1, 1), (2, 2), (3, 4)) as p(n, vols)
     cross join lateral public.estimate_action_savings(('b5700000-0000-0000-0000-00000000000' || p.n)::uuid) e
     join public.action_templates t on t.action_text = e.action_text
     where t.poste = 'travel' and t.segment = 'flight_short' and t.trips > p.vols $$,
  'aucun gabarit des vols courts n''est proposé à qui en a déclaré moins qu''il n''en remplace'
);

-- ── 2. Le libellé, la quantité et la question disent la même chose ─────────────────────────

-- Sans ce témoin, le balayage qui suit passerait sur un référentiel qui n'a plus aucun aller-retour
-- (libellé renommé) et ne garderait rien.
select ok(
  exists (select 1 from public.action_templates where action_text ilike '%aller-retour%'),
  'au moins un gabarit parle d''aller-retour — sans quoi le balayage suivant ne garde rien'
);

-- Un balayage plutôt qu'un nom : le gabarit qu'on ajoutera demain, « … un aller-retour en voiture … »,
-- traverserait une liste de noms. Un libellé qui dit « aller-retour » compte deux allers, et sa
-- question du point le redit — elle disait « un vol » sous un libellé « aller-retour ».
select is_empty(
  $$ select action_text from public.action_templates
     where action_text ilike '%aller-retour%'
       and (trips is distinct from 2 or coalesce(question_template, '') not ilike '%aller-retour%') $$,
  'un libellé qui dit « aller-retour » compte deux allers et le redit dans sa question du point'
);

-- La phrase que la personne lit, composée comme le fait le générateur du point mensuel.
select is(
  public.checkin_question(
    'extras', 'occasion', 'travel', null, '2026-09-01',
    (select question_template from public.action_templates
     where action_text = 'Remplacer un aller-retour en avion par le train'),
    null),
  'En septembre, as-tu remplacé un aller-retour en avion par le train ?',
  'la question du point nomme l''aller-retour, comme le libellé de l''action'
);

-- ── 3. Ce qui ne bouge pas ──────────────────────────────────────────────────────────────────

-- Un vol est un trajet simple : « Renoncer à un vol … » compte un vol, libellé et quantité s'accordent.
-- Les passer à deux par symétrie avec l'aller-retour doublerait un gain que son libellé ne promet pas.
select is(
  (select array_agg(trips order by action_text) from public.action_templates
   where action_text like 'Renoncer à un vol%'),
  array[1, 1]::numeric[],
  'les deux gabarits « Renoncer à un vol … » comptent un vol, un trajet simple'
);

select * from finish();
rollback;

-- ── Relevé des mutations, 19/10/2026 ─────────────────────────────────────────────────────────
--
-- Jouées sur la stack locale, `20261019140000` appliquée : la mutation (une substitution sur le corps de
-- l'estimateur) puis ce fichier dans une même transaction, annulée par son `rollback`.
--
--   - la garde d'avant, « au moins un trajet déclaré » (`v_count < 1`) → 4 et 7 : l'aller-retour revient
--     au profil à un seul vol, et le balayage le voit ;
--   - une garde trop stricte (`v_count <= greatest(t.trips, 1)`) → 3 et 6 : l'aller-retour quitte le
--     profil à deux vols, et « Renoncer à un vol … » celui à un seul — le témoin 6 est là pour ça ;
--   - le `least(t.trips, v_count)` remplacé par `t.trips` → passe, et c'est juste : la garde écarte
--     déjà tout gabarit qui remplace plus de trajets qu'il n'en est déclaré, donc le `least` ne borne plus
--     rien. La mutation du 18/10 qui le visait (plus bas) ne tombe plus.
--
-- ── Relevé des mutations, 18/10/2026 (sur le fichier d'avant la garde du 19/10 : ses numéros sont ceux
-- de ce fichier-là, dont la 4 et la 6 ont changé de sens) ────────────────────────────────────────
--
-- Jouées sur la base locale, la migration appliquée : la mutation puis ce fichier dans une même
-- transaction, annulée par le `rollback` du fichier. Les numéros sont ceux des assertions.
--
--   - `trips` remis à 1 sur le gabarit de l'aller-retour (le défaut d'origine) → 2, 3, 5, 6 et 8 ;
--     la 4 reste verte, et c'est juste : un seul vol déclaré est crédité d'un vol, quelle que soit la
--     quantité du gabarit. Le fichier `10` tombe aussi, sur sa seule assertion de l'aller-retour
--     (« have 277, want 545 ») ;
--   - le `least(t.trips, v_count)` de l'estimateur remplacé par `t.trips` (la déclaration ne plafonne
--     plus) → 4 et 6 : un seul vol déclaré serait crédité de deux ;
--   - la question du point remise à « … remplacé un vol par le train ? » → 8 et 9 ;
--   - les deux gabarits « Renoncer à un vol … » passés à 2 par symétrie → 10, seule ;
--   - le libellé renommé sans « aller-retour » → 2 à 7 et 9, dont le témoin (7) : sans lui, le balayage
--     (8) passerait à vide sur un référentiel qui n'a plus d'aller-retour ;
--   - un gabarit « Faire un aller-retour … » ajouté et compté pour un seul trajet → 8, seule.
