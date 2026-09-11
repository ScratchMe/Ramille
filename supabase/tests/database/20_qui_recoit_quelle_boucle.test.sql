-- Tests pgTAP de « qui reçoit quelle boucle » — C2.5, migration
-- 20260912140000_qui_recoit_quelle_boucle.sql. Arbitrage D5, constats A13-3, A13-4, A8-12,
-- A7-13, A7-3.
--
-- Quatre situations, et ce que le produit leur envoyait :
--
--   1. **Le cycliste et le piéton** recevaient chaque lundi « as-tu changé de mode de transport ? ».
--      La seule réponse honnête est « Non », suivie de la consolation d'échec, cinquante-deux fois
--      par an, juste sous un écran qui leur dit qu'ils font déjà l'essentiel.
--   2. **Les loisirs « rarement »** recevaient un mode « Voiture » que personne n'avait déclaré,
--      qui nommait la question mensuelle et alimentait des actions du plan sur des sorties
--      hypothétiques.
--   3. **Le profil sédentaire** recevait la boucle mensuelle quoi qu'il arrive, `extras_poste_label`
--      étant calculé sans condition.
--   4. **Le bilan à zéro** produisait « Trajet domicile-travail () », parenthèse vide comprise.
--
-- Ce fichier est **la moitié SQL d'une paire** : `src/types/checkin.test.ts` épingle côté client la
-- même question et le même complément de maintien. Un rappel part sans que le client soit là, la
-- carte repose la question avec lui, et c'est la même question — même motif que
-- `reminder_channel_for` / `src/types/rappels.ts` (17) et `poste_inserable` /
-- `src/constants/postes.ts` (19).
--
-- ## Ce qui est épinglé ici et qu'un lecteur pourrait « corriger » de bonne foi
--
--   * **la catégorie du mode décide, jamais le CO₂.** Le chantier proposait aussi
--     `commute_main_leg_co2_kg_year = 0` ; ce critère est faux depuis les facteurs ACV — `marche`
--     vaut 0 mais `velo` 0,00017 et `trottinette` 0,0249. Il n'attraperait que les piétons, et les
--     cyclistes — la population que ce chantier existe pour soulager — continueraient de recevoir
--     la question ;
--   * **la catégorie compte trois modes, pas deux.** Une assertion le vérifie en base : ajouter un
--     quatrième mode vélo/marche obligerait à lui donner son complément des deux côtés de la paire ;
--   * **le « Non » d'un maintien n'est pas un échec** — la réplique est côté client, mais c'est
--     `question_kind` qui la décide, et il est posé ici ;
--   * **le résiduel de 15 km reste** (D5, spec §5) : seules ses *conséquences* sont retirées. Les
--     totaux ne bougent pas, et l'assertion du résiduel en train le vérifie par le facteur plutôt
--     que par une valeur figée.
begin;
create extension if not exists pgtap with schema extensions;

select plan(28);

-- ── La forme de la question de maintien ─────────────────────────────────────────────────

select is(public.complement_de_maintien('velo'), 'à vélo',
  'complement_de_maintien: velo');
select is(public.complement_de_maintien('marche'), 'à pied',
  'complement_de_maintien: marche');
select is(public.complement_de_maintien('trottinette'), 'en trottinette',
  'complement_de_maintien: trottinette — sa propre phrase, pas un repli sur le vélo');
select is(public.complement_de_maintien('voiture_thermique'), 'autrement',
  'complement_de_maintien: un mode hors catégorie garde une phrase grammaticale');
select ok(length(public.complement_de_maintien(null)) > 0,
  'complement_de_maintien: jamais une chaîne vide, qui tronquerait la question');

-- **La liste de modes sur laquelle tout le chantier repose.** Le générateur pose la question de
-- maintien pour toute la catégorie `velo_marche` ; `complement_de_maintien` et sa jumelle
-- TypeScript en nomment trois. Un quatrième mode ajouté à cette catégorie recevrait « autrement »
-- en silence, des deux côtés.
select results_eq(
  $$ select id from public.transport_modes where category = 'velo_marche' order by id $$,
  $$ values ('marche'::text), ('trottinette'::text), ('velo'::text) $$,
  'la catégorie velo_marche compte exactement trois modes — en ajouter un impose un complément'
);

select ok(not has_function_privilege('authenticated', 'public.complement_de_maintien(text)', 'execute'),
  'complement_de_maintien: authenticated ne peut pas l''appeler');
select ok(not has_function_privilege('anon', 'public.complement_de_maintien(text)', 'execute'),
  'complement_de_maintien: anon ne peut pas l''appeler');

-- ── Fixtures : cinq profils, un par situation ───────────────────────────────────────────
-- Les adresses sont confirmées et le canal forcé sur `email` : c'est ce qui fait écrire la
-- question dans `notification_outbox`, donc ce qui rend le texte vérifiable ici. La branche push
-- est couverte par le fichier 17.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-boucle-' || right(u::text, 1) || '@test.local', 'x', now(), false, now(), now()
from unnest(array[
  'e2500000-0000-0000-0000-000000000001'::uuid,  -- A : cycliste
  'e2500000-0000-0000-0000-000000000002',        -- B : sédentaire
  'e2500000-0000-0000-0000-000000000003',        -- C : loisirs rares, voiture au foyer
  'e2500000-0000-0000-0000-000000000004',        -- D : bilan à zéro, sans trajet régulier
  'e2500000-0000-0000-0000-000000000005',        -- E : loisirs rares, aucun véhicule au foyer
  'e2500000-0000-0000-0000-000000000006'         -- F : témoin, loisirs déclarés
]) u;

update public.profiles set reminder_channel = 'email' where id::text like 'e2500000%';

insert into public.assessments (id, user_id, status, submitted_at)
select a, u, 'completed', now()
from unnest(
  array['e2510000-0000-0000-0000-000000000001'::uuid, 'e2510000-0000-0000-0000-000000000002',
        'e2510000-0000-0000-0000-000000000003', 'e2510000-0000-0000-0000-000000000004',
        'e2510000-0000-0000-0000-000000000005', 'e2510000-0000-0000-0000-000000000006'],
  array['e2500000-0000-0000-0000-000000000001'::uuid, 'e2500000-0000-0000-0000-000000000002',
        'e2500000-0000-0000-0000-000000000003', 'e2500000-0000-0000-0000-000000000004',
        'e2500000-0000-0000-0000-000000000005', 'e2500000-0000-0000-0000-000000000006']
) as t(a, u);

-- A : va au travail à vélo, sort rarement, aucun voyage. Le profil du constat A13-3.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, leisure_frequency, household_vehicles, zone_type, tc_access)
values ('e2510000-0000-0000-0000-000000000001', true, 5, 8, 'velo', 'rarely', '1', 'urbain_dense', 'bon');

-- B : aucun trajet régulier, sorties rares, ni vol ni long trajet. Le profil sédentaire de la
-- contre-vérification d'A13-4 — et le cas **par défaut**, pas un cas de bord.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip,
  leisure_frequency, household_vehicles, zone_type, tc_access)
values ('e2510000-0000-0000-0000-000000000002', false, 'rarely', '1', 'urbain_dense', 'bon');

-- C : trajet en voiture thermique dominant, sorties rares. Sert à vérifier à la fois la question
-- de changement et l'absence d'action de loisir.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, household_vehicles,
  zone_type, tc_access)
values ('e2510000-0000-0000-0000-000000000003', true, 5, 20, 'voiture', 'thermique', 'rarely', '1',
        'periurbain', 'bon');

-- D : bilan à zéro **sans trajet régulier** — sorties hebdomadaires à pied, rien d'autre. C'est la
-- seule façon d'atteindre un total nul depuis les facteurs ACV (`marche` est le seul mode à zéro)
-- et c'est le profil qui produisait « Trajet domicile-travail () ».
insert into public.assessment_answers (assessment_id, commute_has_regular_trip,
  leisure_frequency, leisure_mode, leisure_distance_bracket, household_vehicles, zone_type, tc_access)
values ('e2510000-0000-0000-0000-000000000004', false, 'weekly', 'marche', '5_15', '0',
        'urbain_dense', 'bon');

-- E : sorties rares et **aucun véhicule au foyer** (A7-13). Le résiduel en voiture décrivait un
-- trajet que la personne venait de déclarer ne pas pouvoir faire.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip,
  leisure_frequency, household_vehicles, zone_type, tc_access)
values ('e2510000-0000-0000-0000-000000000005', false, 'rarely', '0', 'urbain_dense', 'bon');

-- F : témoin de C, à une réponse près — des sorties **déclarées**. Sans lui, l'absence d'action de
-- loisir chez C ne prouverait pas que la garde est ciblée : elle pourrait venir d'un plan vide.
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, leisure_mode,
  leisure_distance_bracket, leisure_car_engine, household_vehicles, zone_type, tc_access)
values ('e2510000-0000-0000-0000-000000000006', true, 5, 20, 'voiture', 'thermique', 'weekly',
        'voiture', '15_30', 'thermique', '1', 'periurbain', 'bon');

select public.recompute_assessment_results('e2510000-0000-0000-0000-000000000001');
select public.recompute_assessment_results('e2510000-0000-0000-0000-000000000002');
select public.recompute_assessment_results('e2510000-0000-0000-0000-000000000003');
select public.recompute_assessment_results('e2510000-0000-0000-0000-000000000004');
select public.recompute_assessment_results('e2510000-0000-0000-0000-000000000005');
select public.recompute_assessment_results('e2510000-0000-0000-0000-000000000006');

-- ── 1. Le cycliste reçoit une question de maintien ──────────────────────────────────────

select public.generate_commute_checkins();

select results_eq(
  $$ select question_kind, mode from public.engagement_checkins
     where user_id = 'e2500000-0000-0000-0000-000000000001' and loop_type = 'commute' $$,
  $$ values ('maintien'::text, 'velo'::text) $$,
  'cycliste : question de maintien, mode snapshoté — la catégorie décide, pas le CO₂'
);

select is(
  (select push_body from public.notification_outbox o
   where o.user_id = 'e2500000-0000-0000-0000-000000000001'),
  'La semaine dernière, ton trajet s''est-il fait à vélo ?',
  'cycliste : la question est affirmative et ne demande pas ce qui a changé'
);

select results_eq(
  $$ select question_kind, mode from public.engagement_checkins
     where user_id = 'e2500000-0000-0000-0000-000000000003' and loop_type = 'commute' $$,
  $$ values ('changement'::text, 'voiture_thermique'::text) $$,
  'automobiliste : question de changement — le maintien ne s''étend pas à tout le monde'
);

select is(
  (select push_body from public.notification_outbox o
   where o.user_id = 'e2500000-0000-0000-0000-000000000003'),
  'La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ?',
  'automobiliste : la question de changement garde la forme de C2.3 et C2.6'
);

-- Le mode est gardé en base pour que la catégorie soit lisible sans reconnaître un préfixe de
-- libellé — la colonne existe pour ça, et c'est elle que snapshote le point.
select is(
  (select commute_poste_mode from public.assessment_results
   where assessment_id = 'e2510000-0000-0000-0000-000000000001'),
  'velo',
  'assessment_results.commute_poste_mode : le mode résolu du trajet est gardé, pas seulement son libellé'
);

-- ── 2. La boucle mensuelle demande une base déclarée ────────────────────────────────────

select public.generate_extras_checkins();

select is(
  (select count(*)::int from public.engagement_checkins
   where user_id = 'e2500000-0000-0000-0000-000000000002' and loop_type = 'extras'),
  0,
  'sédentaire : aucun point mensuel — ni sortie, ni vol, ni long trajet déclarés'
);

select is(
  (select count(*)::int from public.engagement_checkins
   where user_id = 'e2500000-0000-0000-0000-000000000006' and loop_type = 'extras'),
  1,
  'témoin : des sorties déclarées donnent bien un point mensuel — le filtre ne ferme pas la boucle'
);

-- La question de maintien n'existe **que** sur la boucle hebdomadaire : aller au travail à vélo
-- est une habitude qu'on maintient, une sortie ou un voyage a lieu ou non.
select results_eq(
  $$ select question_kind, mode from public.engagement_checkins
     where user_id = 'e2500000-0000-0000-0000-000000000006' and loop_type = 'extras' $$,
  $$ values ('changement'::text, null::text) $$,
  'boucle mensuelle : jamais de question de maintien, et pas de mode snapshoté'
);

-- ── 3. Les loisirs « rarement » ne portent pas de mode inventé ──────────────────────────

select is(
  (select extras_poste_label from public.assessment_results
   where assessment_id = 'e2510000-0000-0000-0000-000000000003'),
  'Loisirs du week-end (occasionnels)',
  'loisirs rares : le libellé ne nomme aucun mode — personne n''en a déclaré'
);

select is(
  (select extras_poste_label from public.assessment_results
   where assessment_id = 'e2510000-0000-0000-0000-000000000006'),
  'Loisirs du week-end (Voiture thermique)',
  'témoin : des sorties déclarées gardent leur mode dans le libellé'
);

-- **Le libellé dominant suit le même sort, et la condition est la même** : `v_dominant = leisure`
-- est décidé par le test qui définit `v_extras_is_leisure`. Les deux libellés d'un même poste ne
-- peuvent donc pas se contredire — ils le faisaient avant la section 3 bis de la migration, l'un
-- disant « (occasionnels) » et l'autre « (Voiture) » sur deux écrans voisins.
select results_eq(
  $$ select dominant_poste, dominant_poste_mode, dominant_poste_label
     from public.assessment_results where assessment_id = 'e2510000-0000-0000-0000-000000000001' $$,
  $$ values ('leisure'::text, null::text, 'Loisirs du week-end (occasionnels)'::text) $$,
  'cycliste : son poste dominant est le résiduel, mais il ne se présente pas comme une réponse donnée'
);

-- ── 4. Aucune action du plan sur des sorties hypothétiques ──────────────────────────────

select is_empty(
  $$ select action_text from public.estimate_action_savings('e2510000-0000-0000-0000-000000000003')
     where poste = 'leisure' $$,
  'loisirs rares : aucune action de loisir — « faire une sortie sur trois à vélo » sur des sorties jamais déclarées'
);

select ok(
  exists (
    select 1 from public.estimate_action_savings('e2510000-0000-0000-0000-000000000006')
    where poste = 'leisure'
  ),
  'témoin : des sorties déclarées reçoivent bien des actions de loisir — la garde est ciblée'
);

-- Le plan de C n'est pas vide pour autant : son trajet domicile-travail reste un levier. C'est la
-- contre-vérification d'A13-4 (« elle peut vider entièrement le plan ») vérifiée en base.
select ok(
  (select count(*) from public.estimate_action_savings('e2510000-0000-0000-0000-000000000003')) > 0,
  'loisirs rares : le plan reste alimenté par le poste domicile-travail'
);

-- ── 5. Le résiduel d'un foyer sans véhicule ─────────────────────────────────────────────
-- La valeur est **dérivée du facteur**, jamais figée : 15 km × 2 × 0,25 × 52 = 390 km/an. Écrire
-- 10,803 ferait tomber ce test à la prochaine synchronisation ADEME sans rien apprendre à personne.

select is(
  (select round(leisure_co2_kg_year::numeric, 4) from public.assessment_results
   where assessment_id = 'e2510000-0000-0000-0000-000000000005'),
  round((390 * public.emission_factor('train', current_date))::numeric, 4),
  'aucun véhicule au foyer : le résiduel passe en train, pas en voiture (A7-13)'
);

-- Et il reste **un** résiduel : l'arbitrage D5 garde le calcul, il n'en retire que les
-- conséquences. Un test qui vérifierait zéro ici épinglerait l'inverse de la décision.
select ok(
  (select leisure_co2_kg_year from public.assessment_results
   where assessment_id = 'e2510000-0000-0000-0000-000000000005') > 0,
  'aucun véhicule au foyer : le résiduel est modulé, jamais supprimé (D5)'
);

-- `train` et non `bus` : à 0,1224 kg/km le bus ne vaut que 14 % de moins qu'une thermique en ACV,
-- donc la correction aurait été presque un non-événement. C'est le piège que CLAUDE.md signale
-- pour toute substitution par le bus.
select ok(
  (select leisure_co2_kg_year from public.assessment_results
   where assessment_id = 'e2510000-0000-0000-0000-000000000005')
  < (select leisure_co2_kg_year from public.assessment_results
     where assessment_id = 'e2510000-0000-0000-0000-000000000003') / 2,
  'le mode de repli divise le résiduel par plus de deux — un bus ne l''aurait pas fait'
);

-- ── 6. Le bilan à zéro, sans parenthèse vide ────────────────────────────────────────────

select is(
  (select total_co2_kg_year from public.assessment_results
   where assessment_id = 'e2510000-0000-0000-0000-000000000004'),
  0::numeric,
  'le profil marche intégrale atteint bien un total nul — sans quoi la suite ne prouverait rien'
);

select results_eq(
  $$ select dominant_poste, dominant_poste_label from public.assessment_results
     where assessment_id = 'e2510000-0000-0000-0000-000000000004' $$,
  $$ values ('leisure'::text, 'Loisirs du week-end (Marche)'::text) $$,
  'bilan à zéro : le poste dominant est celui où quelque chose est déclaré, pas commute par défaut'
);

select is_empty(
  $$ select dominant_poste_label from public.assessment_results
     where assessment_id = 'e2510000-0000-0000-0000-000000000004'
       and dominant_poste_label like '%()%' $$,
  'bilan à zéro : plus jamais « Trajet domicile-travail () », parenthèse vide comprise'
);

select * from finish();
rollback;
