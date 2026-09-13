-- Tests pgTAP de l'engagement sur une action du plan (étape 6b, migration 20260905190000).
--
-- Ce que ce fichier défend en priorité n'est pas l'engagement lui-même mais **ce qu'il ne doit
-- pas ouvrir** : `plan_actions` porte des chiffres figés à la génération (`saving_kg_year`,
-- `saving_share_percent`), au même titre que `assessment_results` fige le bilan. C'est pourquoi
-- l'engagement passe par un RPC `security definer` et non par une policy : une policy UPDATE
-- aurait ouvert **toutes** les colonnes, la RLS raisonnant par ligne et jamais par colonne.
-- Depuis le 10/09/2026 (chantier C0.3) `authenticated` n'a même plus le privilège UPDATE au
-- niveau table : deux gardes indépendantes protègent donc les chiffres, et les deux sont
-- éprouvées plus bas.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('71111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-eng-a@test.local', 'x', now(), now()),
  ('71111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-eng-b@test.local', 'x', now(), now());

insert into public.assessments (id, user_id, status, submitted_at) values
  ('72222222-2222-2222-2222-222222222222', '71111111-1111-1111-1111-111111111111', 'completed', now());

-- Contexte urbain dense avec bonne desserte : garantit que `estimate_action_savings` rend au
-- moins deux actions, sans quoi le test de bascule n'aurait rien à basculer.
insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency, zone_type, tc_access, household_vehicles
) values ('72222222-2222-2222-2222-222222222222', true, 5, 20, 'voiture', false, false, 'rarely', 'urbain_dense', 'bon', '1');

insert into public.assessment_results (
  assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
  dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label,
  commute_main_leg_km_year, commute_main_leg_co2_kg_year, commute_trip_distance_km,
  leisure_km_year, mobility_constrained
)
select '72222222-2222-2222-2222-222222222222', f.co2, f.co2, 0, 0,
       'commute', f.co2, 'voiture', 'Trajet domicile-travail (Voiture)',
       9000, f.co2, 20, 0, false
from (select 9000 * public.emission_factor('voiture', current_date) as co2) f;

select public.generate_plan_cycle_for_user('71111111-1111-1111-1111-111111111111');

-- Un cycle de voyages pour B, posé à la main : le bilan de A est entièrement domicile-travail,
-- donc ses deux actions portent le même poste et ne peuvent pas éprouver la forme d'intention
-- inverse (une échéance fermée). Lui donner aussi des voyages déplacerait le classement des deux
-- actions retenues et l'assertion juste au-dessus avec — deux fixtures disjointes coûtent moins
-- qu'une fixture qui sert deux raisonnements.
insert into public.plan_cycles (user_id, cadence_type, period_label, period_start, period_end, trip_label, target_reduction_pct)
values ('71111111-1111-1111-1111-111111111112', 'season', 'Saison de test', current_date, current_date + 89, 'Voyages longue distance (Avion)', 20);

insert into public.plan_actions (plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent, detail_text, rank)
select pc.id, tpl.id, 900, 30, 'Sur 1 vol long-courrier déclaré.', 1
from public.plan_cycles pc
cross join public.action_templates tpl
where pc.user_id = '71111111-1111-1111-1111-111111111112'
  and tpl.poste = 'travel' and tpl.segment = 'flight_long';

select set_config('test.action_voyage',
  (select pa.id::text
     from public.plan_actions pa
     join public.plan_cycles pc on pc.id = pa.plan_cycle_id
    where pc.user_id = '71111111-1111-1111-1111-111111111112'), true);

-- Portée explicite au cycle de l'utilisateur A : cette assertion s'exécute encore sous
-- `postgres`, donc hors RLS, et un `count(*)` nu compterait les actions de toute la base. Elle
-- passerait en CI (base vierge) tout en ne vérifiant rien — c'est une assertion qui ne tombe
-- que sur un environnement peuplé, donc jamais là où on la lit.
-- **Plus de deux actions depuis C4.6, et c'est le point** : `generate_plan_cycle_for_user` fige
-- désormais **toutes** les actions dont le gain atteint 5 kg/an, avec leur `rank`. Le `limit 2` qu'il
-- portait était un choix d'écran écrit dans le SQL, et il jetait les autres leviers avant même de les
-- écrire (constat A13-18). L'assertion attendait exactement 2 ; elle vérifie maintenant qu'il y en a
-- **au moins** deux — ce dont la bascule d'engagement plus bas a besoin — et que rien n'est tronqué.
select cmp_ok(
  (select count(*) from public.plan_actions pa
   join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = '71111111-1111-1111-1111-111111111111')::int,
  '>=',
  2,
  'le cycle porte au moins deux actions à départager'
);

-- Et le plan n'en jette aucune : autant de lignes que l'estimateur en propose. C'est l'assertion qui
-- tomberait si un `limit` revenait « pour ne pas charger l'écran » — la troncature est une décision
-- d'affichage, elle ne se reprend pas dans le SQL.
select is(
  (select count(*) from public.plan_actions pa
   join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = '71111111-1111-1111-1111-111111111111')::int,
  (select count(*) from public.estimate_action_savings(
     (select id from public.assessments where user_id = '71111111-1111-1111-1111-111111111111'
      and status = 'completed' order by submitted_at desc limit 1)))::int,
  'toutes les actions proposées par l''estimateur sont figées, aucune n''est tronquée'
);

-- Le `rank` les numérote sans trou, à partir de 1 : c'est lui que l'écran suit pour décider ce qu'il
-- met en avant et ce qu'il garde derrière « Voir d'autres pistes ».
select is(
  (select array_agg(pa.rank order by pa.rank) from public.plan_actions pa
   join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id = '71111111-1111-1111-1111-111111111111'),
  (select array_agg(n::smallint order by n) from generate_series(1,
     (select count(*)::int from public.plan_actions pa
      join public.plan_cycles pc on pc.id = pa.plan_cycle_id
      where pc.user_id = '71111111-1111-1111-1111-111111111111')) n),
  'les rangs vont de 1 à N, sans trou'
);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', '71111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- ── Le chemin nominal ───────────────────────────────────────────────────────────────────

select lives_ok(
  $stmt$ select public.commit_plan_action((select id from public.plan_actions order by rank limit 1), array[2,4]::smallint[], null) $stmt$,
  's''engager sur une action avec des jours de la semaine'
);

select is(
  (select array_to_string(intention_days, '-') from public.plan_actions where committed_at is not null),
  '2-4',
  'l''intention d''implémentation est conservée telle quelle'
);

-- ── Une seule action engagée à la fois, et le remplacement se demande ───────────────────
-- « Choisir une action » est le mécanisme, pas une contrainte d'écran : s'engager sur les deux
-- revient à ne s'engager sur aucune. Le RPC libère la précédente dans la même transaction —
-- l'index unique partiel refuserait sinon la seconde ligne.
--
-- **Depuis C4.6, il faut le demander** (`p_replace`). Libérer l'engagement précédent efface
-- `committed_at`, les jours et l'échéance — le seul choix personnel que le produit demande — et
-- l'archive de C2.2 en garde la trace sans le rendre. Un appel qui ne dit pas qu'il remplace ne
-- remplace donc pas : c'est l'écran qui propose « Choisir celle-ci à la place » qui le dit.
select throws_ok(
  $stmt$ select public.commit_plan_action((select id from public.plan_actions order by rank desc limit 1), array[1,3]::smallint[], null) $stmt$,
  'RM001',
  null,
  'sans p_replace, s''engager sur une seconde action est refusé'
);

select is(
  (select count(*) from public.plan_actions where committed_at is not null)::int,
  1,
  'le refus ne touche à rien : l''engagement d''origine tient toujours'
);

-- Les deux actions de A portent le poste domicile-travail : la bascule se fait donc elle aussi en
-- jours de la semaine. Une échéance fermée y est refusée depuis le 11/09/2026 (cf. plus bas).
select lives_ok(
  $stmt$ select public.commit_plan_action((select id from public.plan_actions order by rank desc limit 1), array[1,3]::smallint[], null, true) $stmt$,
  'basculer l''engagement sur l''autre action, p_replace à l''appui'
);

select is(
  (select count(*) from public.plan_actions where committed_at is not null)::int,
  1,
  'une seule action reste engagée après la bascule'
);

-- ── Ce qu'une intention ne peut pas être ────────────────────────────────────────────────
-- Un engagement sans « quand » n'est pas un engagement : c'est le moment choisi qui fait le
-- levier, pas la case cochée.
--
-- Les deux premiers refus venaient de la contrainte `plan_actions_engagement_coherent`, avec un
-- 23514 que rien ne permet de lire côté client. Le RPC les rend explicites depuis le 11/09/2026
-- (22023, `invalid_parameter_value`) et nomme la forme attendue dans son message ; la contrainte
-- reste, comme seconde garde. Le troisième refus, lui, reste bien celui d'une contrainte CHECK :
-- `check_intention_days` est pure et s'applique à toute écriture, d'où le 23514 conservé.

select throws_ok(
  $stmt$ select public.commit_plan_action((select id from public.plan_actions order by rank limit 1), array[2]::smallint[], 'ce_mois') $stmt$,
  '22023', null, 'jours ET échéance ensemble : refusé (les deux formes s''excluent)'
);

select throws_ok(
  $stmt$ select public.commit_plan_action((select id from public.plan_actions order by rank limit 1), null, null) $stmt$,
  '22023', null, 'un engagement sans intention est refusé'
);

-- `p_replace` à `true` ici, et ce n'est pas du remplissage : sans lui, le refus arriverait du
-- garde de C4.6 (RM001) **avant** d'atteindre la contrainte, et l'assertion mesurerait autre chose
-- que ce qu'elle annonce. C'est aussi ce qui rend l'assertion suivante plus forte — un remplacement
-- demandé mais refusé pour une autre raison ne libère rien non plus.
select throws_ok(
  $stmt$ select public.commit_plan_action((select id from public.plan_actions order by rank limit 1), array[2,2]::smallint[], null, true) $stmt$,
  '23514', null, 'un jour en double dans l''intention est refusé'
);

-- ── La forme de l'intention suit le poste (A8-20) ───────────────────────────────────────
-- « Demander un jour de la semaine pour un voyage produirait une intention que personne ne peut
-- tenir » (v1-07 §3.3) ne tenait que par `intentionKindForPoste` côté écran : la base acceptait
-- les deux formes sur n'importe quel poste. La règle est maintenant écrite des deux côtés, et ces
-- deux assertions sont là pour qu'elle ne redevienne pas un usage.

select throws_ok(
  $stmt$ select public.commit_plan_action((select id from public.plan_actions order by rank limit 1), null, 'ce_mois') $stmt$,
  '22023', null, 'une échéance fermée sur une action domicile-travail est refusée'
);

select is(
  (select array_to_string(intention_days, '-') from public.plan_actions where committed_at is not null),
  '1-3',
  'et l''engagement en place n''a pas bougé : un refus ne libère rien, p_replace ou non'
);

-- ── Ce que l'engagement ne doit surtout pas ouvrir ──────────────────────────────────────
-- Le gain est figé à la génération, et **deux** gardes indépendantes le protègent. La première
-- est le privilège : `authenticated` n'a plus d'UPDATE sur `plan_actions` depuis le 10/09/2026
-- (20260910110000_grants_explicites.sql, §4), donc PostgreSQL refuse avant d'atteindre la RLS —
-- « permission denied for table plan_actions », SQLSTATE 42501. La seconde est l'absence de
-- policy d'écriture : même si le privilège revenait, aucune ligne ne serait réécrite — c'est
-- `18_grants_explicites.test.sql` §6 qui épingle nommément cette absence de policy, et la seconde
-- assertion ici n'en constate que le résultat. Le jour où un `grant update` reviendrait « par
-- facilité », c'est la première qui le dirait.
-- Le RPC `commit_plan_action` est `security definer` : il écrit sous le propriétaire de la
-- fonction, pas sous l'appelant, donc il n'a jamais eu besoin de ce privilège (les engagements
-- plus haut dans ce fichier le démontrent).

-- Sous la session de A, c'est-à-dire le propriétaire lui-même.
select throws_ok(
  $stmt$ update public.plan_actions set saving_kg_year = 99999 $stmt$,
  '42501', null, 'un UPDATE direct sur le gain figé est refusé, même pour le propriétaire'
);

select is(
  (select count(*) from public.plan_actions where saving_kg_year = 99999)::int,
  0,
  'et aucune ligne ne porte la valeur refusée — le gain figé est intact'
);

-- ── Isolation ───────────────────────────────────────────────────────────────────────────
-- L'identifiant est capturé **avant** de basculer sur le tiers. Sans ça, la sous-requête
-- s'exécuterait sous la RLS de B, ne verrait rien, passerait NULL au RPC — qui échouerait sans
-- avoir jamais éprouvé la vérification de propriété qu'on veut tester ici.

select set_config('test.action_id', (select id::text from public.plan_actions order by rank limit 1), true);

select set_config('request.jwt.claims', json_build_object('sub', '71111111-1111-1111-1111-111111111112', 'role', 'authenticated')::text, true);

select throws_ok(
  $stmt$ select public.commit_plan_action(current_setting('test.action_id')::uuid, array[1]::smallint[], null) $stmt$,
  'P0002', null, 'un tiers ne peut pas s''engager sur l''action de quelqu''un d''autre'
);

-- ── La forme inverse, sur le cycle de voyages de B ───────────────────────────────────────
-- Toujours sous la session de B, qui est ici chez lui : son unique action porte le poste
-- voyages. C'est l'autre moitié de la règle — sans elle, une vérification qui refuserait tout
-- passerait le test précédent sans rien garantir.

select throws_ok(
  $stmt$ select public.commit_plan_action(current_setting('test.action_voyage')::uuid, array[2,4]::smallint[], null) $stmt$,
  '22023', null, 'des jours de la semaine sur une action de voyage sont refusés'
);

select lives_ok(
  $stmt$ select public.commit_plan_action(current_setting('test.action_voyage')::uuid, null, 'prochaine_occasion') $stmt$,
  's''engager sur une action de voyage avec une échéance fermée'
);

select is(
  (select intention_timing from public.plan_actions where id = current_setting('test.action_voyage')::uuid),
  'prochaine_occasion',
  'l''échéance est conservée telle quelle'
);

-- ── Libérer un engagement : plus de succès muet ──────────────────────────────────────────
-- `clear_plan_action_commitment` rendait un succès quand aucune ligne ne correspondait — action
-- d'un tiers, identifiant faux — là où sa jumelle lève depuis toujours. Le client affichait « ok »
-- sur un engagement toujours en place.

select throws_ok(
  $stmt$ select public.clear_plan_action_commitment(current_setting('test.action_id')::uuid) $stmt$,
  'P0002', null, 'libérer l''engagement d''un tiers lève, au lieu de rendre un succès muet'
);

select lives_ok(
  $stmt$ select public.clear_plan_action_commitment(current_setting('test.action_voyage')::uuid) $stmt$,
  'libérer son propre engagement'
);

select is(
  (select count(*)::int from public.plan_actions where committed_at is not null),
  0,
  'et l''action de B ne porte plus d''engagement (sa seule action visible)'
);

select * from finish();
rollback;
