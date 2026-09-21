-- C4.4 — Les modes qui manquent, et celui qui est mal compté (#146, `v1-21`)
--
-- Trois défauts de mesure, dont un qui **changeait le chiffre affiché à quelqu'un qui avait
-- répondu juste** : le mode s'appelait « Train ou RER » et portait le facteur du TER, soit 2,83
-- fois le RER. Ce fichier épingle les trois, et surtout **les deux choses qu'on serait tenté de
-- « corriger » par réflexe** :
--
--   1. **l'autocar émet PLUS qu'un TER** (0,037560 contre 0,027690) et douze fois un TGV.
--      L'intuition « le car, c'est le mode sobre » est fausse en ACV, exactement comme
--      `hybride > thermique` (test 05) — et pour la même raison : elle compare des usages là où
--      le facteur compte aussi la fabrication et le taux de remplissage ;
--   2. **le repli `train` garde le facteur du TER**, et ce n'est pas un oubli : c'est ce qui
--      garantit qu'un bilan soumis avant la question compte exactement ce qu'il comptait le jour
--      de sa soumission.
--
-- **Les valeurs attendues sont dérivées de `public.emission_factor(...)` et jamais écrites en
-- clair** (`TESTING.md` §2.2) : la synchronisation trimestrielle fait bouger le référentiel, donc
-- un nombre figé ici rougirait pour la mauvaise raison. Ce que les assertions tiennent est le
-- **rapport** entre deux profils jumeaux, ou l'égalité entre un total et le produit qui devrait le
-- rendre — ce qui reste vrai quelle que soit la valeur du jour.
--
-- **Éprouvé en le cassant le 21/09/2026** (`TESTING.md` §1.1) — onze mutations, et ce que chacune
-- fait réellement tomber (mesuré, pas prévu : deux de ces lignes disent l'inverse de ce que
-- j'attendais) :
--   - le slug de `train_rer` pointé sur `ter`                     → 1 (les slugs, et **eux seuls** :
--     le mapping ne sert qu'à la synchronisation trimestrielle, pas au calcul du jour) ;
--   - **le facteur du RER remplacé par celui du TER              → 1**, et c'est l'assertion que
--     cette mutation a fait écrire. Elle n'en cassait **aucune** au premier essai : les deux
--     produits de la §B dérivent du référentiel **des deux côtés**, donc ils épinglent la
--     résolution et jamais la valeur. L'ordre des quatre trains est la seule chose qui puisse
--     voir qu'un mode a reçu la valeur d'un autre — sans elle ce fichier avait un trou exactement
--     là où vit le défaut qu'il documente ;
--   - `resolve_train_mode` : `'rer'` → `'ter'`                    → 3 (le produit, le rapport, et
--     le libellé du poste, qui nommerait un train que la personne n'a pas pris) ;
--   - `resolve_velo_mode` : la branche `electrique` retirée       → 2 (le produit, le rapport) ;
--   - **le facteur de l'autocar ramené sous celui du TER         → 5**, et c'est l'autre surprise :
--     les deux comparaisons de la §A, mais aussi le poste nommé et **deux assertions du plan**. Un
--     car sobre cesse de dominer le poste voyages, et le levier « par le train » perd son gain. Ce
--     chiffre contre-intuitif n'est donc pas une curiosité : trois autres choses reposent dessus ;
--   - le repli `train` prend la valeur du RER                     → 2 (l'égalité des facteurs, et
--     celle des deux bilans — c'est-à-dire un chiffre déjà rendu qui bouge) ;
--   - le `min_distance_km` du gabarit VAE mis à `null`            → 2 (la partition, et l'exclusion
--     mutuelle : les deux gabarits vélo se proposent ensemble à 8 km) ;
--   - le `max_distance_km` du gabarit vélo porté à 20             → 2 (les deux mêmes, par l'autre
--     bout de la fenêtre) ;
--   - le `min_distance_km` du VAE porté à 30, au-delà de son max  → 2 (la partition, et la fenêtre
--     vide — un gabarit que personne ne peut recevoir, et que rien d'autre ne signalerait) ;
--   - l'appel direct `resolve_car_mode('voiture', …)` remis dans
--     `estimate_action_savings`                                    → 1 (le point unique) ;
--   - l'ancienne signature `resolve_mode(text, text, text)` recréée → 1 (la surcharge morte).

begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────
-- Des jumeaux partout : le même trajet, la même semaine, et **une seule réponse qui change**.
-- C'est la seule forme d'assertion qui survive à une resynchronisation des facteurs.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select ('c4400000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-c44-' || n || '@test.local', 'x', now(), now()
from generate_series(1, 12) as n;

insert into public.assessments (id, user_id, status)
select ('a4400000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       ('c4400000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'completed'
from generate_series(1, 12) as n;

-- 01 à 03 — le trajet en train, 20 km, cinq jours. Seule la réponse au type change : absente
-- (le bilan d'avant la question), « TER », « RER ».
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_train_type, leisure_frequency, zone_type, tc_access, household_vehicles, teletravail
) values
  ('a4400000-0000-0000-0000-000000000001', true, 5, 20, 'train', null,         'rarely', 'urbain_dense', 'bon', '1', 'aucun'),
  ('a4400000-0000-0000-0000-000000000002', true, 5, 20, 'train', 'ter',        'rarely', 'urbain_dense', 'bon', '1', 'aucun'),
  ('a4400000-0000-0000-0000-000000000003', true, 5, 20, 'train', 'rer',        'rarely', 'urbain_dense', 'bon', '1', 'aucun');

-- 04 et 05 — le même trajet à vélo, 5 km : mécanique (ou sans réponse) puis à assistance.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_velo_type, leisure_frequency, zone_type, tc_access, household_vehicles, teletravail
) values
  ('a4400000-0000-0000-0000-000000000004', true, 5, 5, 'velo', 'mecanique',  'rarely', 'urbain_dense', 'bon', '1', 'aucun'),
  ('a4400000-0000-0000-0000-000000000005', true, 5, 5, 'velo', 'electrique', 'rarely', 'urbain_dense', 'bon', '1', 'aucun');

-- 06 — deux longs trajets en autocar, et rien d'autre.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, flights_total_per_year,
  train_long_trips_per_year, car_long_trips_per_year, coach_long_trips_per_year,
  zone_type, tc_access, household_vehicles
) values
  ('a4400000-0000-0000-0000-000000000006', false, 'rarely', 0, 0, 0, 2, 'rural', 'limite', '0');

-- 07 à 10 — quatre distances autour des bornes des deux gabarits vélo : 8, 10, 11 et 25 km, en
-- voiture thermique pour que la substitution ait de quoi gagner.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_car_engine, leisure_frequency, zone_type, tc_access, household_vehicles, teletravail
) values
  ('a4400000-0000-0000-0000-000000000007', true, 5,  8, 'voiture', 'thermique', 'rarely', 'periurbain', 'limite', '1', 'aucun'),
  ('a4400000-0000-0000-0000-000000000008', true, 5, 10, 'voiture', 'thermique', 'rarely', 'periurbain', 'limite', '1', 'aucun'),
  ('a4400000-0000-0000-0000-000000000009', true, 5, 11, 'voiture', 'thermique', 'rarely', 'periurbain', 'limite', '1', 'aucun'),
  ('a4400000-0000-0000-0000-000000000010', true, 5, 25, 'voiture', 'thermique', 'rarely', 'periurbain', 'limite', '1', 'aucun');

-- 11 et 12 — quatre longs trajets en voiture, seul puis à quatre. Le second est ce qui doit faire
-- disparaître l'autocar du plan, sans qu'aucune condition ne soit écrite pour ça.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, leisure_frequency, flights_total_per_year,
  train_long_trips_per_year, car_long_trips_per_year, car_long_trips_engine, car_long_trips_occupancy,
  coach_long_trips_per_year, zone_type, tc_access, household_vehicles
) values
  ('a4400000-0000-0000-0000-000000000011', false, 'rarely', 0, 0, 4, 'thermique', 1, 0, 'rural', 'limite', '1'),
  ('a4400000-0000-0000-0000-000000000012', false, 'rarely', 0, 0, 4, 'thermique', 4, 0, 'rural', 'limite', '1');

select public.recompute_assessment_results(id) from public.assessments where id::text like 'a4400000%';

-- ── §A · Le référentiel ──────────────────────────────────────────────────────────────────

select results_eq(
  $$ select id, category from public.transport_modes
     where id in ('train_ter', 'train_rer', 'train_intercites', 'velo_electrique', 'autocar')
     order by id $$,
  $$ values ('autocar'::text,          'transports_commun'::text),
            ('train_intercites'::text, 'train'::text),
            ('train_rer'::text,        'train'::text),
            ('train_ter'::text,        'train'::text),
            ('velo_electrique'::text,  'velo_marche'::text) $$,
  'les cinq modes de C4.4 existent, dans la catégorie qui décide de leur boucle'
);

-- Le slug est ce que la synchronisation trimestrielle ira chercher. S'en tromper ne se verrait
-- nulle part : le mode aurait un facteur, plausible, et ce serait celui d'un autre transport.
select results_eq(
  $$ select transport_mode_id, impactco2_slugs from public.emission_factor_sources
     where transport_mode_id in ('train_ter', 'train_rer', 'train_intercites', 'velo_electrique', 'autocar')
     order by transport_mode_id $$,
  $$ values ('autocar'::text,          array['autocar']),
            ('train_intercites'::text, array['intercites']),
            ('train_rer'::text,        array['rer']),
            ('train_ter'::text,        array['ter']),
            ('velo_electrique'::text,  array['veloelectrique']) $$,
  'chacun pointe sur son slug Impact CO2 — un mode sans mapping juste reste figé en silence'
);

-- **L'assertion contre-intuitive, et la raison d'être de ce fichier.** Elle n'écrit aucune valeur :
-- elle compare deux facteurs entre eux, donc elle survit à toute resynchronisation — et elle
-- tombera le jour où quelqu'un « corrigera » l'autocar vers le bas par réflexe.
select ok(
  public.emission_factor('autocar', current_date) > public.emission_factor('train_ter', current_date),
  'l''autocar émet PLUS au kilomètre qu''un TER — l''intuition « le car est sobre » est fausse en ACV'
);

select ok(
  public.emission_factor('autocar', current_date) > 10 * public.emission_factor('train_longue_distance', current_date),
  'et plus de dix fois un TGV — c''est ce qui rend le gabarit « en train plutôt qu''en car » utile'
);

-- L'ordre des quatre trains, qui EST le fond du défaut : un RER n'est pas un TER, et l'Intercités
-- est encore en dessous. Relatif, donc vrai après n'importe quelle resynchronisation — et c'est la
-- seule assertion du fichier que « le RER a reçu la valeur d'un autre train » fasse tomber. Les
-- deux produits de la §B, eux, dérivent du référentiel des deux côtés : ils épinglent la
-- résolution, jamais la valeur. Mesuré le 21/09/2026 (mutation M2), et c'est pour ça que cette
-- ligne existe.
select ok(
  public.emission_factor('train_longue_distance', current_date) < public.emission_factor('train_intercites', current_date)
  and public.emission_factor('train_intercites', current_date) < public.emission_factor('train_rer', current_date)
  and public.emission_factor('train_rer', current_date) < public.emission_factor('train_ter', current_date),
  'les quatre trains se rangent TGV < Intercités < RER < TER'
);

-- Le repli garde le facteur du TER, et ce n'est pas un oubli : c'est ce qui garantit qu'un bilan
-- soumis avant la question compte exactement ce qu'il comptait ce jour-là.
select is(
  public.emission_factor('train', current_date),
  public.emission_factor('train_ter', current_date),
  'le repli `train` vaut le TER au centième près — sinon un bilan d''avant la question changerait de chiffre'
);

-- ── §B · Le train, de la réponse au chiffre ──────────────────────────────────────────────

-- 20 km × 2 × 5 jours × 45 semaines = 9 000 km, tout entiers sur la jambe principale.
select is(
  (select round(commute_co2_kg_year, 6) from public.assessment_results
    where assessment_id = 'a4400000-0000-0000-0000-000000000003'),
  round(9000 * public.emission_factor('train_rer', current_date), 6),
  'répondre « RER » fait compter le trajet au tarif du RER, et non à celui du TER'
);

-- Le chiffre du chantier : 2,83. Dérivé du référentiel, donc juste même après une
-- resynchronisation — ce qui est épinglé est que les deux bilans ne comptent plus la même chose.
select is(
  (select round(
     (select commute_co2_kg_year from public.assessment_results where assessment_id = 'a4400000-0000-0000-0000-000000000002')
     / (select commute_co2_kg_year from public.assessment_results where assessment_id = 'a4400000-0000-0000-0000-000000000003'), 6)),
  round(public.emission_factor('train_ter', current_date) / public.emission_factor('train_rer', current_date), 6),
  'le rapport entre le bilan « TER » et le bilan « RER » est exactement celui de leurs facteurs'
);

select is(
  (select commute_co2_kg_year from public.assessment_results where assessment_id = 'a4400000-0000-0000-0000-000000000001'),
  (select commute_co2_kg_year from public.assessment_results where assessment_id = 'a4400000-0000-0000-0000-000000000002'),
  'sans réponse, le bilan vaut celui d''un TER — le repli ne déplace aucun chiffre déjà rendu'
);

-- Et le libellé suit le mode résolu, sans quoi la restitution nommerait un train que la personne
-- n'a pas pris.
select results_eq(
  $$ select commute_poste_mode, commute_poste_label from public.assessment_results
     where assessment_id in ('a4400000-0000-0000-0000-000000000001', 'a4400000-0000-0000-0000-000000000003')
     order by commute_poste_mode $$,
  $$ values ('train'::text,     'Trajet domicile-travail (Train)'::text),
            ('train_rer'::text, 'Trajet domicile-travail (RER ou Transilien)'::text) $$,
  'le poste se nomme par le mode résolu — « Train » pour le repli, jamais « Train ou RER »'
);

-- ── §C · Le vélo à assistance ────────────────────────────────────────────────────────────

-- 5 km × 2 × 5 × 45 = 2 250 km.
select is(
  (select round(commute_co2_kg_year, 6) from public.assessment_results
    where assessment_id = 'a4400000-0000-0000-0000-000000000005'),
  round(2250 * public.emission_factor('velo_electrique', current_date), 6),
  'le vélo à assistance est compté à son facteur, et non à celui du mécanique'
);

select is(
  (select round(
     (select commute_co2_kg_year from public.assessment_results where assessment_id = 'a4400000-0000-0000-0000-000000000005')
     / (select commute_co2_kg_year from public.assessment_results where assessment_id = 'a4400000-0000-0000-0000-000000000004'), 3)),
  round(public.emission_factor('velo_electrique', current_date) / public.emission_factor('velo', current_date), 3),
  'l''écart entre les deux vélos est celui de leurs facteurs — soixante-quatre fois, au relevé du 21/09/2026'
);

select is(
  (select commute_poste_mode from public.assessment_results
    where assessment_id = 'a4400000-0000-0000-0000-000000000004'),
  'velo',
  'répondre « mécanique » rend le mode générique : même facteur, mêmes mots, donc pas de mode de plus'
);

-- ── §D · L'autocar dans le bilan ─────────────────────────────────────────────────────────

-- 2 trajets × 700 km. La distance de référence est celle de la voiture, et l'assertion la nomme
-- par le produit plutôt que par son total : déplacer `dist_coach_long` doit faire tomber ceci.
select is(
  (select round(travel_coach_co2_kg_year, 6) from public.assessment_results
    where assessment_id = 'a4400000-0000-0000-0000-000000000006'),
  round(2 * 700 * public.emission_factor('autocar', current_date), 6),
  'deux longs trajets en autocar comptent deux fois 700 km au facteur de l''autocar'
);

select is(
  (select round(travel_co2_kg_year, 6) from public.assessment_results
    where assessment_id = 'a4400000-0000-0000-0000-000000000006'),
  (select round(travel_coach_co2_kg_year, 6) from public.assessment_results
    where assessment_id = 'a4400000-0000-0000-0000-000000000006'),
  'et ils entrent dans le total des voyages — avant C4.4, un Paris-Lyon en car comptait pour rien'
);

select is(
  (select extras_poste_label from public.assessment_results
    where assessment_id = 'a4400000-0000-0000-0000-000000000006'),
  'Voyages longue distance (Autocar)',
  'l''autocar peut nommer le poste, donc il est dans le départage du mode dominant'
);

-- ── §E · Le plan ─────────────────────────────────────────────────────────────────────────

-- La partition des deux gabarits vélo, en une requête. La borne haute du mécanique est **incluse**
-- (10 km le reçoit), celle du VAE est **exclue** (11 km le reçoit, 10 non) : c'est ce qui fait
-- qu'ils ne se proposent jamais ensemble.
select results_eq(
  $$ select r.commute_trip_distance_km::int,
            coalesce((select string_agg(s.action_text, ' + ' order by s.action_text)
                        from public.estimate_action_savings(r.assessment_id) s
                       where s.poste = 'commute' and s.action_text ilike '%vélo%'), '(aucun)')
       from public.assessment_results r
      where r.assessment_id in ('a4400000-0000-0000-0000-000000000007',
                                'a4400000-0000-0000-0000-000000000008',
                                'a4400000-0000-0000-0000-000000000009',
                                'a4400000-0000-0000-0000-000000000010')
      order by 1 $$,
  $$ values (8::int,  'Faire un trajet sur cinq à vélo'::text),
            (10::int, 'Faire un trajet sur cinq à vélo'::text),
            (11::int, 'Faire un trajet sur cinq à vélo à assistance électrique'::text),
            (25::int, '(aucun)'::text) $$,
  'jusqu''à 10 km le vélo, au-delà le VAE, au-delà de 20 km ni l''un ni l''autre'
);

-- La même chose dite comme un invariant : **jamais les deux**. Une borne élargie d'un côté ferait
-- tomber celle-ci sans toucher à la précédente.
select is_empty(
  $$ select r.assessment_id from public.assessment_results r
      where r.assessment_id::text like 'a4400000%'
        and (select count(*) from public.estimate_action_savings(r.assessment_id) s
              where s.poste = 'commute' and s.action_text ilike '%vélo%') > 1 $$,
  'aucun plan ne propose les deux vélos à la fois — ce serait demander de choisir entre un geste et le même en moins bien'
);

select ok(
  exists (select 1 from public.estimate_action_savings('a4400000-0000-0000-0000-000000000011')
           where action_text ilike '%en autocar%'),
  'seul dans sa voiture sur de longs trajets, l''autocar est proposé : il gagne les trois quarts'
);

-- **Et rien n'est écrit pour l'en empêcher à quatre** : à cette occupation la voiture partagée
-- descend sous l'autocar, le gain devient négatif, et le seuil des 5 kg/an fait le travail.
select is_empty(
  $$ select action_text from public.estimate_action_savings('a4400000-0000-0000-0000-000000000012')
      where action_text ilike '%en autocar%' $$,
  'à quatre dans la voiture, l''autocar disparaît du plan — le seuil des 5 kg suffit, aucune condition à écrire'
);

select ok(
  exists (select 1 from public.estimate_action_savings('a4400000-0000-0000-0000-000000000006')
           where action_text ilike '%autocar par le train%'),
  'qui déclare des trajets en car reçoit le levier qui va avec — la question devient actionnable, pas seulement comptée'
);

-- ── §F · Les invariants de structure ─────────────────────────────────────────────────────

-- Une fenêtre vide ne se proposerait à personne, et rien ne le dirait.
select is_empty(
  $$ select action_text from public.action_templates
      where min_distance_km is not null and max_distance_km is not null
        and min_distance_km >= max_distance_km $$,
  'aucun gabarit n''a de fenêtre de distance vide'
);

select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'resolve_mode' and p.pronargs = 3
  ),
  'l''ancienne signature de resolve_mode ne survit pas — une surcharge qu''aucun appel n''émet se lit « morte »'
);

-- Le point unique est unique. Les commentaires sont retirés avant la recherche : sans ça, la
-- phrase qui explique la règle dans le corps de la fonction la ferait échouer.
select is_empty(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('recompute_assessment_results', 'estimate_action_savings')
        and regexp_replace(pg_get_functiondef(p.oid), '--[^' || chr(10) || ']*', '', 'g')
            similar to '%(resolve_car_mode\(|resolve_two_wheeler_mode\(|resolve_train_mode\(|resolve_velo_mode\()%' $$,
  'le calcul ne rappelle aucun résolveur spécialisé en direct — un oubli y serait silencieux'
);

select finish();
rollback;
