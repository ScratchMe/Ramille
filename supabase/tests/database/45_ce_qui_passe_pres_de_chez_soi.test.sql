-- Ce qui passe près de chez soi (migration `ce_qui_passe_pres_de_chez_soi`, `v1-34`, 02/10/2026).
--
-- Ce que ce fichier garde : que la réponse « Près de chez toi, qu'est-ce que tu pourrais prendre ? »
-- se range et refuse l'incohérent ; que l'accès s'en **déduit** (D5) sans que personne ne l'écrive ;
-- que le plan décide des transports en commun sur elle et **plus sur la zone** — le tram d'une ville
-- moyenne s'ouvre, le métro d'une banlieue qui n'en a pas se ferme, le RER prend la place du train
-- (D3) ; qu'un bilan sans la réponse ne reçoit plus aucune action de transport en commun (D4) ; et que
-- l'écran « Contexte » reconnaît une réponse inchangée dans quelque ordre qu'on ait touché les puces.
--
-- Les assertions de chiffrage générales restent au fichier `10`, dont les fixtures portent désormais
-- la réponse ; ici, chaque profil ne diffère de ses voisins que par elle et par la zone — le même
-- trajet de 10 km en voiture thermique, cinq jours, les mêmes sorties hebdomadaires. La zone varie
-- exprès, à rebours de ce qu'elle décidait avant (un tram « Périurbain », une banlieue sans métro
-- « Urbain dense ») : c'est ce qui montre qu'elle ne décide plus.
--
-- Éprouvé en le cassant le 03/10/2026 (`TESTING.md` §1.1) — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select ('a4440000-0000-0000-0000-00000000000' || n)::uuid, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'pgtap-v134-' || n || '@test.local', 'x', now(), now()
from generate_series(1, 8) n;

insert into public.assessments (id, user_id, status, submitted_at)
select ('b4440000-0000-0000-0000-00000000000' || n)::uuid, ('a4440000-0000-0000-0000-00000000000' || n)::uuid,
       'completed', now()
from generate_series(1, 8) n;

-- Les sept profils : seuls la zone et la réponse changent. Le septième n'a pas répondu (un bilan
-- d'avant la question), et son accès écrit à la main est celui qui ouvrait tout.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km,
  commute_mode, commute_car_engine, commute_is_carpool, commute_second_mode_used,
  leisure_frequency, leisure_mode, leisure_distance_bracket, leisure_car_engine,
  zone_type, tc_access, transports_proches, household_vehicles, teletravail
)
select ('b4440000-0000-0000-0000-00000000000' || p.n)::uuid, true, 5, 10,
       'voiture', 'thermique', false, false,
       'weekly', 'voiture', '15_30', 'thermique',
       p.zone, p.acces, p.transports, '1', 'deux_ou_plus'
from (values
  -- 1 : une ville moyenne desservie par un tram, rangée en « Périurbain » par l'aide de la zone.
  (1, 'periurbain', null, array['metro_tram', 'bus']),
  -- 2 : une proche banlieue sans métro ni tram, rangée en « Urbain dense ».
  (2, 'urbain_dense', null, array['bus']),
  -- 3 : le RER seul (une couronne francilienne).
  (3, 'periurbain', null, array['rer', 'bus']),
  -- 4 : le train seul (une commune desservie par un TER).
  (4, 'rural', null, array['train']),
  -- 5 : le RER et le train : le RER prend la place du train (D3).
  (5, 'periurbain', null, array['rer', 'train']),
  -- 6 : le métro et le RER : l'action des sorties en métro couvre celle en RER.
  (6, 'urbain_dense', null, array['metro_tram', 'rer']),
  -- 7 : pas de réponse.
  (7, 'urbain_dense', 'bon', null)
) as p(n, zone, acces, transports);

select public.recompute_assessment_results(('b4440000-0000-0000-0000-00000000000' || n)::uuid)
from generate_series(1, 7) n;

-- ── 1. La réponse, rangée et cohérente ; l'accès qui s'en déduit ────────────────────────────

select throws_ok(
  $$ insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency, transports_proches)
     values ('b4440000-0000-0000-0000-000000000008', false, 'rarely', array['tgv']) $$,
  '23514', null,
  'une réponse inconnue est refusée'
);

select throws_ok(
  $$ insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency, transports_proches)
     values ('b4440000-0000-0000-0000-000000000008', false, 'rarely', array['aucun', 'bus']) $$,
  '23514', null,
  '« rien de tout ça » ne se combine avec rien'
);

select throws_ok(
  $$ insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency, transports_proches)
     values ('b4440000-0000-0000-0000-000000000008', false, 'rarely', array[]::text[]) $$,
  '23514', null,
  'une réponse vide n''est pas une réponse : elle est refusée'
);

-- Le huitième profil sert aux écritures : ni plan ni recalcul ne le lisent.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency, tc_access, transports_proches)
values ('b4440000-0000-0000-0000-000000000008', false, 'rarely', 'bon', array['bus', 'metro_tram', 'bus']);

select is(
  (select transports_proches from public.assessment_answers where assessment_id = 'b4440000-0000-0000-0000-000000000008'),
  array['metro_tram', 'bus'],
  'la réponse se range dans l''ordre des puces, sans doublon'
);

select is(
  (select array_agg(public.acces_deduit(t.r) order by t.i)
   from (values (1, array['aucun']), (2, array['bus']), (3, array['train']), (4, array['bus', 'train']),
                (5, array['rer']), (6, array['metro_tram']), (7, array['metro_tram', 'train']),
                (8, null::text[])) as t(i, r)),
  array['inexistant', 'limite', 'limite', 'limite', 'bon', 'bon', 'bon', null],
  'l''accès se déduit : rien → inexistant ; bus ou train seuls → limité ; métro, tram ou RER → bon (D5)'
);

update public.assessment_answers set transports_proches = array['aucun'], tc_access = 'bon'
where assessment_id = 'b4440000-0000-0000-0000-000000000008';

select is(
  (select tc_access from public.assessment_answers where assessment_id = 'b4440000-0000-0000-0000-000000000008'),
  'inexistant',
  'l''accès suit la réponse à chaque écriture, même quand on l''écrit à la main à côté'
);

select is(
  (select tc_access from public.assessment_answers where assessment_id = 'b4440000-0000-0000-0000-000000000003'),
  'bon',
  'le RER seul vaut un bon accès : la personne n''est pas comptée comme contrainte'
);

select is(
  (select tc_access from public.assessment_answers where assessment_id = 'b4440000-0000-0000-0000-000000000007'),
  'bon',
  'un bilan sans la réponse garde l''accès qu''il portait'
);

-- ── 2. Le plan décide sur ce qui passe, plus sur la zone ────────────────────────────────────

select ok(
  exists (select 1 from public.estimate_action_savings('b4440000-0000-0000-0000-000000000001')
          where action_text = 'Passer deux trajets sur cinq en métro ou en tram'),
  'le tram d''une ville moyenne s''ouvre, rangée en « Périurbain » ou non'
);

select is_empty(
  $$ select action_text from public.estimate_action_savings('b4440000-0000-0000-0000-000000000002')
     where action_text in ('Passer deux trajets sur cinq en métro ou en tram',
                           'Prendre les transports en commun pour deux sorties sur cinq') $$,
  'une banlieue sans métro ni tram ne se voit plus proposer le métro, rangée en « Urbain dense » ou non'
);

select is(
  (select array_agg(action_text order by action_text)
   from public.estimate_action_savings('b4440000-0000-0000-0000-000000000003')
   where action_text in ('Passer deux trajets sur cinq en RER', 'Passer deux trajets sur cinq en train')),
  array['Passer deux trajets sur cinq en RER'],
  'le RER coché ouvre l''action du RER, et pas celle du train'
);

select is(
  (select array_agg(action_text order by action_text)
   from public.estimate_action_savings('b4440000-0000-0000-0000-000000000003')
   where poste = 'leisure' and action_text in ('Prendre le RER pour deux sorties sur cinq',
                                              'Prendre les transports en commun pour deux sorties sur cinq')),
  array['Prendre le RER pour deux sorties sur cinq'],
  'sans métro ni tram, les sorties se proposent en RER'
);

select is(
  (select array_agg(action_text order by action_text)
   from public.estimate_action_savings('b4440000-0000-0000-0000-000000000004')
   where action_text in ('Passer deux trajets sur cinq en RER', 'Passer deux trajets sur cinq en train')),
  array['Passer deux trajets sur cinq en train'],
  'le train coché ouvre l''action du train, et pas celle du RER'
);

select is(
  (select array_agg(action_text order by action_text)
   from public.estimate_action_savings('b4440000-0000-0000-0000-000000000005')
   where action_text in ('Passer deux trajets sur cinq en RER', 'Passer deux trajets sur cinq en train')),
  array['Passer deux trajets sur cinq en RER'],
  'le RER et le train cochés : le RER prend la place du train, il ne s''y ajoute pas (D3)'
);

select is(
  (select array_agg(action_text order by action_text)
   from public.estimate_action_savings('b4440000-0000-0000-0000-000000000006')
   where poste = 'leisure' and action_text in ('Prendre le RER pour deux sorties sur cinq',
                                              'Prendre les transports en commun pour deux sorties sur cinq')),
  array['Prendre les transports en commun pour deux sorties sur cinq'],
  'avec le métro et le RER, les sorties se proposent en transports en commun, une seule fois'
);

select is_empty(
  $$ select s.action_text from public.estimate_action_savings('b4440000-0000-0000-0000-000000000007') s
     join public.action_templates t on t.action_text = s.action_text
     where t.transports_requis is not null $$,
  'sans réponse, aucune action de transport en commun, même avec un accès « bon » écrit (D4)'
);

select ok(
  (select saving_kg_year from public.estimate_action_savings('b4440000-0000-0000-0000-000000000003')
   where action_text = 'Passer deux trajets sur cinq en RER')
  > (select saving_kg_year from public.estimate_action_savings('b4440000-0000-0000-0000-000000000004')
     where action_text = 'Passer deux trajets sur cinq en train'),
  'sur le même trajet, le RER est chiffré à son facteur et gagne plus que le TER (v1-27 §12.16)'
);

-- ── 3. L'écran « Contexte » ─────────────────────────────────────────────────────────────────

select set_config('test.actions_avant',
  (select string_agg(pa.id::text, ',' order by pa.id::text)
   from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'a4440000-0000-0000-0000-000000000001'), true);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'a4440000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

-- La même réponse, les puces touchées dans l'autre ordre : rien ne doit bouger.
select public.mettre_a_jour_le_contexte('periurbain', array['bus', 'metro_tram'], '1', 'deux_ou_plus');

select set_config('role', 'postgres', true);

select is(
  (select string_agg(pa.id::text, ',' order by pa.id::text)
   from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'a4440000-0000-0000-0000-000000000001'),
  current_setting('test.actions_avant'),
  'une réponse inchangée, dans un autre ordre, ne reconstruit pas le plan'
);

select set_config('role', 'authenticated', true);
select public.mettre_a_jour_le_contexte('periurbain', array['rer', 'bus', 'rer'], '1', 'deux_ou_plus');
select set_config('role', 'postgres', true);

select is(
  (select transports_proches::text || ' ' || tc_access from public.assessment_answers
   where assessment_id = 'b4440000-0000-0000-0000-000000000001'),
  '{rer,bus} bon',
  'la réponse corrigée s''enregistre rangée, et l''accès s''en déduit'
);

select set_config('role', 'authenticated', true);
select throws_ok(
  $$ select public.mettre_a_jour_le_contexte('periurbain', array[]::text[], '1', 'deux_ou_plus') $$,
  'RM003', null,
  'une réponse vide est refusée par le RPC, en français, avant le `check` de la table'
);
select set_config('role', 'postgres', true);

select ok(
  to_regprocedure('public.mettre_a_jour_le_contexte(text, text, text, text)') is null,
  'l''ancienne signature, qui prenait l''accès, n''existe plus'
);

select * from finish();
rollback;

-- ── Relevé des mutations, 03/10/2026 ─────────────────────────────────────────────────────────
--
-- Jouées sur la base locale : la migration mutée puis ce fichier, dans une transaction annulée. Les
-- numéros sont ceux des assertions.
--
--   - le filtre `transports_requis` retiré d'`estimate_action_savings` → 10, 12, 13 et 16 ;
--   - le filtre `transports_exclus` retiré → 14 et 15 ;
--   - le déclencheur qui range sans déduire l'accès → 6, 7 et 19 ;
--   - `acces_deduit` qui compte le RER comme un accès limité → 5, 7 et 19 ;
--   - `mettre_a_jour_le_contexte` qui compare la réponse reçue sans la ranger → 18, seule ;
--   - `transports_ranges` sans `distinct` → 4 et 19 ;
--   - la contrainte de cohérence sans sa moitié « rien de tout ça seul » → 2, puis le fichier entier :
--     l'insertion qui aurait dû échouer a écrit la ligne, et la suivante bute sur la clé ;
--   - la même sans son minimum d'une réponse → 3, puis le fichier entier, de même ;
--   - le RPC qui ne refuse que la réponse nulle, pas le tableau vide → 20, seule (ajoutée par la
--     contre-lecture du même soir : sans elle, le tableau vide butait sur le `check`, en anglais) ;
--   - l'ancienne signature du RPC laissée en place (recréée : la base locale l'avait déjà perdue)
--     → 21, seule ;
--   - l'action du RER chiffrée au TER (`substitute_mode_id = 'train_ter'`) → 17, seule.
--
-- **La 11 ne tombe sous aucune mutation seule, et c'est su** : pour le profil 3, qui a le RER sans le
-- train, l'action du train est fermée deux fois — par son `transports_requis` (`train` absent) et par
-- son `transports_exclus` (`rer` coché). Elle ne tomberait qu'en retirant les deux filtres ; chacun
-- est gardé seul ailleurs, le premier par la 13, le second par la 14.
