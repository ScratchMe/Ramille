-- Tests pgTAP de C4.7 — retirer un bilan qui ne ressemble à personne.
-- Migration `20260928090000_retirer_un_bilan.sql`, décisions D1 à D4 de `v1-22` (27/09/2026).
--
-- Ce que ce fichier défend, dans l'ordre où ça se casse :
--
--   A. **le retrait passe par le RPC, et par lui seul** — refusé à un tiers, à un bilan en cours ou
--      déjà retiré, et à une écriture directe du client, qui garde pourtant l'`update` de `status` ;
--   B. **le plan suit** — reconstruit sur le bilan précédent quand le retiré le portait, intact
--      quand il ne le portait pas, laissé tel quel quand il n'y a plus rien sur quoi le reconstruire ;
--   C. **l'engagement ne se perd pas sans trace, et ne s'annonce pas** — reposé si son gabarit est
--      encore proposé, archivé en `retrait` sinon, et jamais sous une raison que l'encart du plan lit ;
--   D. **ce qui ne doit pas bouger ne bouge pas** — `submitted_at`, l'export, l'entonnoir.
--
-- ## Les pièges de ce fichier, tous deux payés ailleurs avant d'être évités ici
--
-- **`now()` est figé pour toute la transaction**, et la garde d'idempotence de
-- `generate_plan_cycle_for_user` compare `plan_cycles.created_at` à `submitted_at` : sans
-- précaution, un re-bilan ne reconstruit rien et un retrait non plus (`21_engagement_qui_survit`).
-- D'où, pour chaque compte à deux bilans : l'ancien **reculé de deux jours** avant son calcul, puis
-- le cycle **reculé d'une heure** avant le calcul du second — sans quoi le plan resterait celui du
-- premier et le retrait du second n'éprouverait rien. C'est aussi ce qui fait de la section R la
-- preuve que la cause `retrait` saute la garde : après le retrait, le cycle date de `now()` et le
-- bilan qui reste de deux jours plus tôt, donc une cause `bilan` sortirait sans reconstruire.
--
-- **Une lecture faite sous le mauvais rôle ne prouve rien** (`29_contexte_hors_bilan`) : sous la
-- session d'un compte, la RLS rend les lignes des autres invisibles. Chaque relevé se fait donc sous
-- `postgres`, et seuls les appels et les écritures refusées se font sous le rôle de la personne.
--
-- ## Éprouvé en le cassant, le 27/09/2026 (TESTING.md §1.1)
--
-- Les quinze premières, chacune jouée seule dans une transaction annulée — la migration puis ce
-- fichier, **les contrôles de fin de migration coupés**, sans quoi trois d'entre elles s'arrêtaient
-- avant le premier test (M1, M2 et M11 : c'est une garde de plus, pas un défaut). Les suivantes, à
-- l'intégration, par la méthode canonique : la migration mutée **sur le disque**, puis `rejouer-la-ci
-- base` sur toute la suite. Un témoin sans mutation passe les 44. Ce que chacune fait tomber, et rien
-- d'autre — **les numéros sont ceux du fichier** : les deux du rappel annulé (27 et 28), ajoutées à
-- l'intégration, ont décalé de deux tout ce qui les suit, et la table a été renumérotée avec elles ;
-- la section G (42 à 44) est en fin de fichier pour ne plus rien décaler :
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | M1 — la garde d'idempotence retenue pour `retrait` (`p_cause <> 'contexte'`) | 12, 13, 14, 18 |
--   | M2 — la raison d'archivage de `retrait` écrite `rebilan` | 9, 14 |
--   | M3 — le RPC ne régénère plus le plan | 12, 13, 14, 18 |
--   | M4 — le RPC régénère même quand le bilan retiré ne portait pas le plan | 21 |
--   | M5 — la garde de rôle du trigger retirée | 6, puis le fichier s'arrête sur 7 : l'`update` direct a déjà retiré le bilan, et le RPC lève `RM006` hors de tout `throws_ok` |
--   | M6 — la garde d'état du trigger retirée | 36 |
--   | M7 — un bilan retiré peut revenir | 23, puis 25, 26, 30 et 39 : le bilan d'U est redevenu complété. La 24 reste verte, et c'est juste — `completed` → `in_progress` est refusé par l'autre branche |
--   | M8 — un bilan peut naître retiré | 34 |
--   | M9 — le refus du RPC levé sous un autre code | 8, 33 |
--   | M10 — le RPC ne vérifie plus la propriété | 32, 35, et 40 : le tiers a retiré le bilan de V |
--   | M11 — la segmentation reprend `submitted_at is not null` | 38, 39 |
--   | M12 — la segmentation écrit `'complete'` de mémoire | 38, 40 |
--   | M13 — l'entonnoir ne compte que les comptes pourvus d'un bilan complété | 37 |
--   | M14 — l'export écarte les bilans retirés | 25 |
--   | M15 — les deux générateurs de points lisent `status <> 'in_progress'` | 30 |
--   | M16 — le RPC n'annule plus les rappels en attente quand il ne reste aucun bilan (27/09/2026, à l'intégration : la migration mutée sur le disque, puis `rejouer-la-ci base` sur les 35 fichiers) | 27, et rien d'autre dans la suite |
--   | M17 — le retrait du seul bilan n'archive plus l'action engagée (27/09/2026, section G, même méthode que M16) | 44, et rien d'autre dans la suite |
--   | M18 — les rappels annulés à **chaque** retrait, et non plus au seul dernier (idem) | 42, et rien d'autre dans la suite |
--
-- **M13 est d'abord passée**, et c'est elle qui a changé la fixture : la vue d'étape était celle de
-- R, qui garde un bilan valide après son retrait — un entonnoir borné aux comptes pourvus d'un bilan
-- complété le comptait encore. Elle est désormais celle d'U, qui n'en garde aucun. C'est la forme
-- « une exclusion vérifiée sur une paire de moins » que la contre-lecture cherche (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;

select plan(44);

-- ── Ce que le schéma garantit, avant toute fixture ──────────────────────────────────────

select ok(
  has_function_privilege('authenticated', 'public.retirer_le_bilan(uuid)', 'execute'),
  'retirer_le_bilan : appelable par une session'
);

select ok(
  not has_function_privilege('anon', 'public.retirer_le_bilan(uuid)', 'execute'),
  'retirer_le_bilan : révoquée de anon (PUBLIC hérite, piège de 20260905170700)'
);

-- Jamais de `delete` : retirer n'est pas supprimer (D1), et le seul chemin de destruction du produit
-- reste `delete_my_account`.
select ok(
  not has_table_privilege('authenticated', 'public.assessments', 'delete')
  and not exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'assessments' and cmd = 'DELETE'),
  'assessments : ni privilège ni policy DELETE — un bilan se retire, il ne s’efface pas'
);

-- ── Fixtures ────────────────────────────────────────────────────────────────────────────
--
-- Deux profils, repris de `29_contexte_hors_bilan` et mesurés sur la stack le 27/09/2026 :
--   - **sobre** : à pied un jour sur 2 km, sorties rares, aucun véhicule — un plan à **zéro**
--     action (le résiduel des sorties rares ne propose rien) ;
--   - **rouleur** : cinq jours de voiture thermique, urbain dense bien desservi — neuf actions,
--     dont la première est « Travailler depuis chez toi deux jours par semaine ».

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-retrait-' || right(u::text, 1) || '@test.local', 'x', now(), now()
from unnest(array[
  'c4700000-0000-0000-0000-000000000001'::uuid,  -- R : sobre puis rouleur ; retire le rouleur, l'engagement se perd
  'c4700000-0000-0000-0000-000000000002',        -- P : rouleur 20 km puis 25 km ; retire le second, l'engagement reste
  'c4700000-0000-0000-0000-000000000003',        -- O : rouleur 20 km puis 25 km ; retire l'ANCIEN, rien ne bouge
  'c4700000-0000-0000-0000-000000000004',        -- U : un seul bilan, retiré
  'c4700000-0000-0000-0000-000000000005',        -- V : le jumeau d'U, qui garde le sien
  'c4700000-0000-0000-0000-000000000006',        -- W : un bilan en cours
  'c4700000-0000-0000-0000-000000000007'         -- T : un tiers
]) u;

-- Les bilans « anciens » d'abord : ils sont reculés de deux jours avant leur calcul, pour que le
-- plan qu'on génère ensuite sur le second soit bien le sien (cf. en-tête).
insert into public.assessments (id, user_id, status) values
  ('c4710000-0000-0000-0000-0000000000a1', 'c4700000-0000-0000-0000-000000000001', 'completed'),
  ('c4710000-0000-0000-0000-0000000000b1', 'c4700000-0000-0000-0000-000000000002', 'completed'),
  ('c4710000-0000-0000-0000-0000000000c1', 'c4700000-0000-0000-0000-000000000003', 'completed'),
  ('c4710000-0000-0000-0000-0000000000d1', 'c4700000-0000-0000-0000-000000000004', 'completed'),
  ('c4710000-0000-0000-0000-0000000000e1', 'c4700000-0000-0000-0000-000000000005', 'completed'),
  ('c4710000-0000-0000-0000-0000000000f1', 'c4700000-0000-0000-0000-000000000006', 'in_progress');

-- Une fixture ne choisit pas `submitted_at` à l'insert : elle insère, puis recule la date — `old` et
-- `new` valant tous deux `completed`, le trigger d'estampille ne réécrit rien (CLAUDE.md, C2.2).
update public.assessments set submitted_at = now() - interval '2 days'
where id in ('c4710000-0000-0000-0000-0000000000a1', 'c4710000-0000-0000-0000-0000000000b1',
             'c4710000-0000-0000-0000-0000000000c1');

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, leisure_frequency, zone_type, tc_access, household_vehicles)
values ('c4710000-0000-0000-0000-0000000000a1', true, 1, 2, 'marche', 'rarely', 'urbain_dense', 'bon', '0');

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, leisure_mode,
  leisure_distance_bracket, leisure_car_engine, zone_type, tc_access, household_vehicles, teletravail)
select b, true, 5, 20, 'voiture', 'thermique', 'weekly', 'voiture', '15_30', 'thermique',
       'urbain_dense', 'bon', '1', 'deux_ou_plus'
from unnest(array[
  'c4710000-0000-0000-0000-0000000000b1'::uuid, 'c4710000-0000-0000-0000-0000000000c1',
  'c4710000-0000-0000-0000-0000000000d1', 'c4710000-0000-0000-0000-0000000000e1'
]) b;

select public.recompute_assessment_results(b)
from unnest(array[
  'c4710000-0000-0000-0000-0000000000a1'::uuid, 'c4710000-0000-0000-0000-0000000000b1',
  'c4710000-0000-0000-0000-0000000000c1', 'c4710000-0000-0000-0000-0000000000d1',
  'c4710000-0000-0000-0000-0000000000e1'
]) b;

-- Les seconds bilans de R, P et O : le rouleur pour R, le rouleur à 25 km pour P et O.
insert into public.assessments (id, user_id, status) values
  ('c4710000-0000-0000-0000-0000000000a2', 'c4700000-0000-0000-0000-000000000001', 'completed'),
  ('c4710000-0000-0000-0000-0000000000b2', 'c4700000-0000-0000-0000-000000000002', 'completed'),
  ('c4710000-0000-0000-0000-0000000000c2', 'c4700000-0000-0000-0000-000000000003', 'completed');

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, leisure_mode,
  leisure_distance_bracket, leisure_car_engine, zone_type, tc_access, household_vehicles, teletravail)
values
  ('c4710000-0000-0000-0000-0000000000a2', true, 5, 20, 'voiture', 'thermique', 'weekly', 'voiture',
   '15_30', 'thermique', 'urbain_dense', 'bon', '1', 'deux_ou_plus'),
  ('c4710000-0000-0000-0000-0000000000b2', true, 5, 25, 'voiture', 'thermique', 'weekly', 'voiture',
   '15_30', 'thermique', 'urbain_dense', 'bon', '1', 'deux_ou_plus'),
  ('c4710000-0000-0000-0000-0000000000c2', true, 5, 25, 'voiture', 'thermique', 'weekly', 'voiture',
   '15_30', 'thermique', 'urbain_dense', 'bon', '1', 'deux_ou_plus');

update public.plan_cycles set created_at = now() - interval '1 hour'
where user_id in ('c4700000-0000-0000-0000-000000000001', 'c4700000-0000-0000-0000-000000000002',
                  'c4700000-0000-0000-0000-000000000003');

select public.recompute_assessment_results(b)
from unnest(array[
  'c4710000-0000-0000-0000-0000000000a2'::uuid, 'c4710000-0000-0000-0000-0000000000b2',
  'c4710000-0000-0000-0000-0000000000c2'
]) b;

-- Une vue d'étape du questionnaire, avant tout retrait : l'entonnoir la compte (section D). **Celle
-- d'U, qui va retirer son seul bilan, et pas celle de R** : R garde un bilan valide, donc un
-- entonnoir qui ne compterait que les comptes pourvus d'un bilan complété le compterait encore, et
-- l'assertion passerait sans rien éprouver — c'est ce que la mutation M13 a montré au premier essai.
insert into public.usage_events (user_id, name, props, platform)
values ('c4700000-0000-0000-0000-000000000004', 'bilan_step_view', '{"step":"context"}'::jsonb, 'web');

-- ── Relevés « avant », sous postgres ────────────────────────────────────────────────────

-- L'action en tête du plan de R, bâti sur son second bilan : c'est celle qu'il va engager.
select set_config('test.action_r',
  (select pa.id::text from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'c4700000-0000-0000-0000-000000000001' and pa.rank = 1), true);
select set_config('test.gabarit_r',
  (select action_template_id::text from public.plan_actions where id = current_setting('test.action_r')::uuid), true);
select set_config('test.action_p',
  (select pa.id::text from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'c4700000-0000-0000-0000-000000000002' and pa.rank = 1), true);
select set_config('test.gabarit_p',
  (select action_template_id::text from public.plan_actions where id = current_setting('test.action_p')::uuid), true);
select set_config('test.gain_p',
  (select saving_kg_year::text from public.plan_actions where id = current_setting('test.action_p')::uuid), true);
select set_config('test.soumis_r2',
  (select submitted_at::text from public.assessments where id = 'c4710000-0000-0000-0000-0000000000a2'), true);
select set_config('test.soumis_r1',
  (select submitted_at::text from public.assessments where id = 'c4710000-0000-0000-0000-0000000000a1'), true);
select set_config('test.plan_o',
  (select string_agg(pa.id::text, ',' order by pa.rank) from public.plan_actions pa
   join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'c4700000-0000-0000-0000-000000000003'), true);
select set_config('test.entonnoir',
  (select users::text from analytics.bilan_funnel where step = 'context'), true);

-- Les prémisses : sans elles, la suite passerait sans rien éprouver.
select ok(
  current_setting('test.action_r', true) is not null
  and current_setting('test.action_p', true) is not null
  and (select count(*) from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
       where pc.user_id = 'c4700000-0000-0000-0000-000000000001') > 0,
  'prémisse : les plans de R et de P sont bâtis sur leur second bilan, et portent des actions'
);

-- ── R — le retrait du bilan qui porte le plan, l'engagement perdu ───────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4700000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ select public.commit_plan_action(current_setting('test.action_r')::uuid, array[2,4]::smallint[], null) $$,
  'R s’engage sur l’action en tête du plan de son second bilan'
);

-- **Une écriture directe est refusée, alors que le client a bien le droit d'écrire `status`**
-- (privilège de colonne, `20260920160000`). Placée avant le retrait par le RPC, et sous la session
-- du propriétaire : c'est le trigger qui refuse, pas la RLS.
select throws_ok(
  $$ update public.assessments set status = 'withdrawn' where id = 'c4710000-0000-0000-0000-0000000000a2' $$,
  'RM007', null,
  'le client ne retire pas un bilan par un update direct : le retrait passe par le RPC, qui reconstruit le plan'
);

select is(
  public.retirer_le_bilan('c4710000-0000-0000-0000-0000000000a2'),
  1,
  'retirer_le_bilan rend le nombre de bilans valides qui restent'
);

select throws_ok(
  $$ select public.retirer_le_bilan('c4710000-0000-0000-0000-0000000000a2') $$,
  'RM006', null,
  'un bilan déjà retiré ne se retire pas une seconde fois, et le refus se reconnaît à son code'
);

-- Ce que l'encart orphelin lit, sous la session de la personne : **rien**. La requête du plan
-- filtre sur `RAISONS_ANNONCABLES` (`rebilan`, `contexte`), et un retrait est un geste choisi (D2).
select is(
  (select count(*)::int from public.plan_action_commitments_archive
   where released_reason = any (array['rebilan', 'contexte'])),
  0,
  'l’encart orphelin n’a rien à lire après un retrait : aucune raison qu’il annonce'
);

select set_config('role', 'postgres', true);

select is(
  (select status from public.assessments where id = 'c4710000-0000-0000-0000-0000000000a2'),
  'withdrawn',
  'le bilan est retiré — la ligne reste (D1)'
);

select is(
  (select submitted_at::text from public.assessments where id = 'c4710000-0000-0000-0000-0000000000a2'),
  current_setting('test.soumis_r2'),
  'et sa date de soumission ne bouge pas : c’est l’âge du bilan, que l’export rend'
);

-- **La preuve que la cause `retrait` saute la garde d'idempotence** : le cycle date de `now()` et
-- le bilan qui reste de deux jours, donc une cause `bilan` serait sortie sans rien reconstruire, et
-- les neuf actions du rouleur seraient restées.
select is(
  (select count(*)::int from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'c4700000-0000-0000-0000-000000000001'),
  0,
  'le plan est reconstruit sur le bilan précédent — le sobre, à zéro action'
);

select results_eq(
  $$ select poste, count(*) over ()::int from public.plan_cycles
     where user_id = 'c4700000-0000-0000-0000-000000000001' $$,
  $$ values ('leisure'::text, 1) $$,
  'le même cycle, réécrit, porte le poste dominant du bilan précédent'
);

select results_eq(
  $$ select released_reason, action_template_id::text, intention_days::text
     from public.plan_action_commitments_archive
     where user_id = 'c4700000-0000-0000-0000-000000000001' $$,
  $$ values ('retrait'::text, current_setting('test.gabarit_r'), '{2,4}'::text) $$,
  'l’engagement que le plan reconstruit ne propose plus est archivé, en « retrait », jours compris'
);

-- ── P — le retrait du bilan qui porte le plan, l'engagement reposé ──────────────────────

-- **Un rappel en attente pour P aussi** (27/09/2026, contre-lecture) : P garde un bilan, donc le sien
-- doit rester en file — c'est ce qui garde la condition « plus aucun bilan valide » de l'annulation.
-- Sans lui, un RPC qui annulerait à chaque retrait couperait le rappel de la semaine à quelqu'un qui
-- garde un plan, et aucune assertion ne tomberait. Vérifié en fin de fichier, section G.
select set_config('role', 'postgres', true);
insert into public.engagement_checkins (id, user_id, loop_type, period_start, period_label, trip_label)
values ('c4720000-0000-0000-0000-0000000000b1', 'c4700000-0000-0000-0000-000000000002', 'commute',
        date '2026-01-05', 'Semaine du 05/01', 'Trajet domicile-travail');
insert into public.notification_outbox (user_id, checkin_id, subject, body)
values ('c4700000-0000-0000-0000-000000000002', 'c4720000-0000-0000-0000-0000000000b1', 'Rappel', 'Rappel');

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4700000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ select public.commit_plan_action(current_setting('test.action_p')::uuid, array[1,3]::smallint[], null) $$,
  'P s’engage sur l’action en tête du plan de son second bilan'
);

select is(
  public.retirer_le_bilan('c4710000-0000-0000-0000-0000000000b2'),
  1,
  'P retire son second bilan, et il lui en reste un'
);

select set_config('role', 'postgres', true);

select results_eq(
  $$ select pa.action_template_id::text, pa.intention_days::text, pa.committed_at is not null
     from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
     where pc.user_id = 'c4700000-0000-0000-0000-000000000002' and pa.committed_at is not null $$,
  $$ values (current_setting('test.gabarit_p'), '{1,3}'::text, true) $$,
  'le plan reconstruit propose encore l’action engagée : l’engagement y est reposé, jours compris (C2.2)'
);

-- Le gain est celui du bilan à 20 km, et plus celui à 25 : c'est ce qui distingue « reposé sur un
-- plan reconstruit » de « rien n'a bougé ».
select isnt(
  (select pa.saving_kg_year::text from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'c4700000-0000-0000-0000-000000000002'
     and pa.action_template_id = current_setting('test.gabarit_p')::uuid),
  current_setting('test.gain_p'),
  'et le gain annoncé est celui du bilan précédent : le plan a bien été reconstruit'
);

select is(
  (select count(*)::int from public.plan_action_commitments_archive
   where user_id = 'c4700000-0000-0000-0000-000000000002'),
  0,
  'un engagement reposé ne laisse aucune ligne d’archive'
);

-- ── O — le retrait d'un bilan qui ne porte pas le plan ──────────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4700000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);

select is(
  public.retirer_le_bilan('c4710000-0000-0000-0000-0000000000c1'),
  1,
  'O retire son bilan le plus ancien'
);

select set_config('role', 'postgres', true);

-- Les identifiants des lignes, et pas leur nombre : une reconstruction les tire à neuf
-- (`gen_random_uuid()`), un plan qu'on n'a pas touché les garde.
select is(
  (select string_agg(pa.id::text, ',' order by pa.rank) from public.plan_actions pa
   join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'c4700000-0000-0000-0000-000000000003'),
  current_setting('test.plan_o'),
  'le plan ne bouge pas : il repose sur un bilan plus récent, et le RPC ne le reconstruit pas'
);

-- ── U — le seul bilan, retiré ───────────────────────────────────────────────────────────

-- **Un rappel déjà en file pour U, et un pour son jumeau V** (27/09/2026, intégration). Retirer son
-- seul bilan envoie à l'onboarding ; un e-mail encore en attente — jusqu'à quatre jours d'étalement —
-- partirait pourtant vers `/plan?rappel=1`, qui sans bilan ni marque locale propose de retrouver un
-- compte. Le RPC annule donc les rappels en attente quand il ne reste aucun bilan valide, avec le
-- `cancelled` que `desinscrire_des_rappels` pose déjà. Les deux points sont retirés juste après les
-- assertions : les générateurs, plus bas, comptent les points d'U et de V.
select set_config('role', 'postgres', true);
insert into public.engagement_checkins (id, user_id, loop_type, period_start, period_label, trip_label)
values
  ('c4720000-0000-0000-0000-0000000000d1', 'c4700000-0000-0000-0000-000000000004', 'commute',
   date '2026-01-05', 'Semaine du 05/01', 'Trajet domicile-travail'),
  ('c4720000-0000-0000-0000-0000000000d2', 'c4700000-0000-0000-0000-000000000005', 'commute',
   date '2026-01-05', 'Semaine du 05/01', 'Trajet domicile-travail');
insert into public.notification_outbox (user_id, checkin_id, subject, body)
values
  ('c4700000-0000-0000-0000-000000000004', 'c4720000-0000-0000-0000-0000000000d1', 'Rappel', 'Rappel'),
  ('c4700000-0000-0000-0000-000000000005', 'c4720000-0000-0000-0000-0000000000d2', 'Rappel', 'Rappel');

-- **Et U s'engage avant de retirer** (décision du 27/09/2026, question 12a) : son seul bilan retiré,
-- l'action doit être archivée en `retrait` et désengagée, sans quoi elle reviendrait — reposée au
-- bilan suivant de la même saison, ou reconduite à la suivante. Vérifié en fin de fichier, section G.
select set_config('test.action_u',
  (select pa.id::text from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'c4700000-0000-0000-0000-000000000004' order by pa.rank limit 1), true);
select set_config('test.gabarit_u',
  (select action_template_id::text from public.plan_actions where id = current_setting('test.action_u')::uuid), true);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4700000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);

select public.commit_plan_action(current_setting('test.action_u')::uuid, array[2,4]::smallint[], null);

select is(
  public.retirer_le_bilan('c4710000-0000-0000-0000-0000000000d1'),
  0,
  'U retire son seul bilan : il n’en reste aucun, et le client le sait par ce zéro (D3)'
);

-- **Un bilan retiré ne revient pas** — le client porte `update (status)`, donc sans ce refus un
-- `completed` le remettrait en jeu, et le trigger d'estampille lui reposerait `submitted_at = now()`.
select throws_ok(
  $$ update public.assessments set status = 'completed' where id = 'c4710000-0000-0000-0000-0000000000d1' $$,
  'RM005', null,
  'un bilan retiré ne redevient pas complété par une écriture directe'
);

select throws_ok(
  $$ update public.assessments set status = 'in_progress' where id = 'c4710000-0000-0000-0000-0000000000d1' $$,
  'RM005', null,
  'ni ne se rouvre en questionnaire'
);

-- **L'export rend le bilan retiré, avec son statut** (`v1-22` §5) : c'est une donnée de la
-- personne, et le retrait est une décision de produit, pas un effacement.
select is(
  (select count(*)::int from jsonb_array_elements(public.export_my_data() -> 'bilans') e
   where e ->> 'statut' = 'withdrawn' and e ->> 'soumis_le' is not null),
  1,
  'l’export rend le bilan retiré, son statut et sa date'
);

select set_config('role', 'postgres', true);

select is(
  (select count(*)::int from public.assessments
   where user_id = 'c4700000-0000-0000-0000-000000000004' and status = 'completed'),
  0,
  'U n’a plus aucun bilan complété : la racine l’enverra à l’onboarding'
);

select is(
  (select status from public.notification_outbox where checkin_id = 'c4720000-0000-0000-0000-0000000000d1'),
  'cancelled',
  'le rappel en attente d’U est annulé : il ne partira pas vers un plan qui n’a plus de bilan'
);

select is(
  (select status from public.notification_outbox where checkin_id = 'c4720000-0000-0000-0000-0000000000d2'),
  'pending',
  'celui de V, qui garde son bilan, reste en attente — l’annulation ne vise que le compte qui retire'
);

delete from public.engagement_checkins
where id in ('c4720000-0000-0000-0000-0000000000d1', 'c4720000-0000-0000-0000-0000000000d2');

-- **Le cycle reste**, et c'est un choix écrit en tête de la migration : il n'y a rien sur quoi le
-- reconstruire, et le supprimer emporterait un éventuel engagement sans trace (C2.2).
select is(
  (select count(*)::int from public.plan_cycles where user_id = 'c4700000-0000-0000-0000-000000000004'),
  1,
  'le cycle du seul bilan retiré reste en place — inerte, rien ne le lit sans bilan complété'
);

-- Les deux générateurs de points ignorent U, et c'est son jumeau V qui prouve qu'ils ont tourné :
-- sans lui, « aucun point pour U » passerait aussi sur des générateurs qui ne génèrent rien.
select public.generate_commute_checkins();
select public.generate_extras_checkins();

select is(
  (select count(*)::int from public.engagement_checkins where user_id = 'c4700000-0000-0000-0000-000000000004'),
  0,
  'aucun point de suivi n’est généré sur un bilan retiré'
);

select is(
  (select count(*)::int from public.engagement_checkins where user_id = 'c4700000-0000-0000-0000-000000000005'),
  2,
  'alors que son jumeau, qui a gardé le sien, reçoit ses deux points — l’hebdomadaire et le mensuel'
);

-- ── Les refus qui restent ───────────────────────────────────────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4700000-0000-0000-0000-000000000007', 'role', 'authenticated')::text, true);

-- `no_data_found`, le même refus pour « pas le sien » et « n'existe pas » : rien n'est appris sur le
-- bilan d'un tiers (l'idiome de `repondre_au_checkin`).
select throws_ok(
  $$ select public.retirer_le_bilan('c4710000-0000-0000-0000-0000000000e1') $$,
  'P0002', null,
  'un tiers ne retire pas le bilan d’un autre'
);

select set_config('request.jwt.claims',
  json_build_object('sub', 'c4700000-0000-0000-0000-000000000006', 'role', 'authenticated')::text, true);

select throws_ok(
  $$ select public.retirer_le_bilan('c4710000-0000-0000-0000-0000000000f1') $$,
  'RM006', null,
  'un bilan en cours ne se retire pas : c’est déjà l’état que rien ne lit'
);

select set_config('request.jwt.claims',
  json_build_object('sub', 'c4700000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);

select throws_ok(
  $$ insert into public.assessments (user_id, status) values ('c4700000-0000-0000-0000-000000000005', 'withdrawn') $$,
  'RM007', null,
  'un bilan ne naît pas retiré'
);

select set_config('role', 'postgres', true);

select is(
  (select status from public.assessments where id = 'c4710000-0000-0000-0000-0000000000e1'),
  'completed',
  'le bilan que le tiers visait est intact'
);

-- **Sous `postgres`, la garde de rôle ne dit rien** : c'est celle de l'état qui parle. Les deux
-- conditions de `RM007` sont donc éprouvées séparément — le client (plus haut), l'état (ici).
select throws_ok(
  $$ update public.assessments set status = 'withdrawn' where id = 'c4710000-0000-0000-0000-0000000000f1' $$,
  'RM007', null,
  'un bilan en cours ne se retire pas, même par un rôle serveur'
);

-- ── L'entonnoir, la segmentation ────────────────────────────────────────────────────────

select is(
  (select users::text from analytics.bilan_funnel where step = 'context'),
  current_setting('test.entonnoir'),
  'l’entonnoir du questionnaire ne décrémente pas : ce qui a été soumis a été soumis'
);

-- La segmentation décrit la personne par le bilan qu'elle garde, jamais par celui qu'elle a retiré.
select results_eq(
  $$ select last_assessment_at::text, dominant_poste from analytics.user_segments
     where user_id = 'c4700000-0000-0000-0000-000000000001' $$,
  $$ values (current_setting('test.soumis_r1'), 'leisure'::text) $$,
  'user_segments lit le dernier bilan valide de R, pas celui qu’il a retiré'
);

select results_eq(
  $$ select last_assessment_at is null, dominant_poste is null from analytics.user_segments
     where user_id = 'c4700000-0000-0000-0000-000000000004' $$,
  $$ values (true, true) $$,
  'et sans bilan valide, U n’a plus de segment'
);

-- La moitié positive, qui garde aussi la faute de frappe que `20260905170100` redoutait : un
-- `'complete'` écrit de mémoire dans la vue rendrait ici un poste nul.
select is(
  (select dominant_poste from analytics.user_segments where user_id = 'c4700000-0000-0000-0000-000000000005'),
  'commute',
  'un bilan valide segmente toujours son compte'
);

-- ── La cinquième raison de libération ───────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.plan_action_commitments_archive
       (user_id, plan_cycle_id, action_template_id, action_text, released_reason, committed_at)
     values ('c4700000-0000-0000-0000-000000000005', null,
             (select id from public.action_templates order by action_text limit 1),
             'Contrôle du refus.', 'nimporte_quoi', now()) $$,
  '23514', null,
  'released_reason refuse toujours une raison inconnue — la contrainte a été étendue, pas desserrée'
);

-- ── G — ce que la contre-lecture du 27/09/2026 a demandé de garder ──────────────────────
-- En fin de fichier pour ne pas décaler les numéros que la table des mutations cite : 42 à 44.

select set_config('role', 'postgres', true);

select is(
  (select status from public.notification_outbox where checkin_id = 'c4720000-0000-0000-0000-0000000000b1'),
  'pending',
  'le rappel de P reste en attente : P garde un bilan, l’annulation ne vise que le compte qui n’en a plus'
);

select is(
  (select count(*)::int from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = 'c4700000-0000-0000-0000-000000000004' and pa.committed_at is not null),
  0,
  'U a retiré son seul bilan : plus aucune action engagée — rien ne reviendra au bilan suivant (12a)'
);

select results_eq(
  $$ select released_reason, action_template_id::text, intention_days::text
     from public.plan_action_commitments_archive
     where user_id = 'c4700000-0000-0000-0000-000000000004' $$,
  $$ values ('retrait'::text, current_setting('test.gabarit_u'), '{2,4}'::text) $$,
  'et son engagement est archivé en « retrait », jours compris : la trace de C2.2 demeure'
);

select * from finish();
rollback;

