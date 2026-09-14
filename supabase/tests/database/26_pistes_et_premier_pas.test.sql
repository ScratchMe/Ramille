-- Tests pgTAP des pistes et du premier pas — C4.6, migration
-- 20260913110000_pistes_et_premier_pas.sql. Constats A13-18, A13-19. Arbitrage D18 du 10/09/2026.
-- Schéma prescrit par `v1-14` §4.4.
--
-- Ce que ce fichier défend, en trois phrases.
--
-- **Le plan ne tronque plus.** `generate_plan_cycle_for_user` portait un `limit 2` — un choix
-- d'écran écrit dans le SQL — qui jetait les autres leviers avant même de les écrire, alors que
-- l'estimateur rend déjà toutes les actions dont le gain atteint 5 kg/an, triées, et que la colonne
-- `rank` existe depuis l'increment 6 précisément pour que l'écran décide de ce qu'il met en avant.
-- Ce point-là est épinglé dans les deux fichiers qui possèdent les fonctions concernées (`02` pour
-- la génération, `13` pour l'engagement) : ici on garde ce qui n'a pas de propriétaire ailleurs.
--
-- **Le premier pas ne chiffre rien.** Le gain est juste au-dessus sur la carte, et un second nombre
-- à cet endroit se lirait comme une consigne. La garde balaie la table entière plutôt que de citer
-- des gabarits, et sans compter combien il y en a : celui qu'on ajoutera demain la traverse sans
-- être nommé nulle part. Le compte qui figurait ici s'est périmé dès la vague suivante, où C3.8 en
-- a ajouté quatre.
--
-- **Remplacer un engagement se demande.** `commit_plan_action` libérait et archivait l'engagement
-- précédent sans condition : le geste le plus irréversible du produit — effacer le seul choix
-- personnel qu'il demande — partait en silence depuis n'importe quel appel.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

-- ── 1. Le premier pas, sur le référentiel ───────────────────────────────────────────────
-- Deux balayages, aucun gabarit nommé : c'est la seule forme qui attrape un gabarit **ajouté**, et
-- c'est ainsi que la CI est tombée trois fois sur le référentiel des facteurs (cf. CLAUDE.md).

select has_column('public', 'action_templates', 'first_step',
  'action_templates.first_step : la ligne qui abaisse le coût de la première fois');
select has_column('public', 'plan_actions', 'first_step',
  'plan_actions.first_step : figée à la génération, comme le gain');

select is(
  (select count(*)::int from public.action_templates where first_step is null),
  0,
  'tout gabarit porte un premier pas — un gabarit ajouté sans lui tomberait ici'
);

-- **Jamais un chiffre.** Même règle que la voix de Ramille, et pour la même raison : le nombre
-- appartient au produit, qui l'affiche déjà juste au-dessus. « Fais-en deux par semaine » serait une
-- consigne chiffrée non sourcée, posée sur la carte la plus engageante de l'app.
select is(
  (select count(*)::int from public.action_templates where first_step ~ '[0-9]'),
  0,
  'aucun premier pas ne contient de chiffre'
);

-- Une ligne, pas un vivier de conseils : la spec §6 demande « fonctionnel simple » pour la brique 3,
-- et `/conditions` affirme que le produit ne fournit pas de prestation de conseil en mobilité.
select is(
  (select count(*)::int from public.action_templates where first_step like '%' || chr(10) || '%'),
  0,
  'un premier pas tient sur une ligne'
);

-- ── 2. La signature de l'engagement ─────────────────────────────────────────────────────
-- **La forme booléenne s'ajoute en remplaçant l'ancienne, elle ne la double pas.** Deux surcharges
-- que PostgREST devrait départager sur un appel à trois arguments seraient ambiguës — même
-- raisonnement que `repondre_au_checkin` en C2.4, qui ne tient que parce que l'app n'est pas encore
-- publiée sur Play.

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'commit_plan_action'),
  1,
  'une seule forme de commit_plan_action : l''ancienne signature est supprimée'
);

select has_function('public', 'commit_plan_action',
  array['uuid', 'smallint[]', 'text', 'boolean'],
  'commit_plan_action prend p_replace');

-- ── 3. Qui peut engager ─────────────────────────────────────────────────────────────────
-- `revoke ... from public` ne suffit pas : Supabase pose des **privilèges par défaut** sur le schéma
-- `public` qui accordent `EXECUTE` directement à `anon` et à `authenticated`, donc retirer PUBLIC
-- laisse ces deux grants nominatifs intacts. `anon` est le rôle d'une requête **sans jeton** — une
-- session anonyme, elle, porte `authenticated` — donc ces deux fonctions ne lui servent à rien.

select ok(
  has_function_privilege('authenticated', 'public.commit_plan_action(uuid, smallint[], text, boolean)', 'execute')
    and has_function_privilege('authenticated', 'public.clear_plan_action_commitment(uuid)', 'execute'),
  'les deux RPC d''engagement restent appelables par authenticated'
);

select ok(
  not has_function_privilege('anon', 'public.commit_plan_action(uuid, smallint[], text, boolean)', 'execute')
    and not has_function_privilege('anon', 'public.clear_plan_action_commitment(uuid)', 'execute'),
  'et aucun des deux n''est appelable sans jeton (anon)'
);

-- ── 4. Un refus n'archive rien ──────────────────────────────────────────────────────────
-- C'est l'assertion propre à ce fichier : `13` vérifie que le refus a lieu et que l'engagement en
-- place ne bouge pas, mais pas qu'il ne laisse **aucune trace de libération**. Une archive écrite
-- par un remplacement refusé ferait apparaître dans le suivi une décision que la personne n'a jamais
-- prise — et l'écran du plan l'annoncerait comme une nouvelle (« Ton plan a changé… »).

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, is_anonymous)
values ('c4600000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'c46@test.local', '', now(), now(), now(), false);

insert into public.plan_cycles (id, user_id, cadence_type, period_start, period_end, period_label, trip_label, poste, target_reduction_pct)
values ('c4600000-0000-0000-0000-0000000000c1', 'c4600000-0000-0000-0000-000000000001', 'season',
        current_date - 10, current_date + 80, 'Automne 2026', 'Trajet domicile-travail', 'commute', 20);

-- Deux actions du poste domicile-travail : la bascule se ferait donc en jours de la semaine, comme
-- la forme d'intention l'exige depuis C1.12.
insert into public.plan_actions (id, plan_cycle_id, action_template_id, rank, first_step)
select 'c4600000-0000-0000-0000-0000000000a1', 'c4600000-0000-0000-0000-0000000000c1', id, 1, first_step
from public.action_templates where action_text = 'Faire un trajet sur cinq à vélo';
insert into public.plan_actions (id, plan_cycle_id, action_template_id, rank, first_step)
select 'c4600000-0000-0000-0000-0000000000a2', 'c4600000-0000-0000-0000-0000000000c1', id, 2, first_step
from public.action_templates where action_text = 'Faire un trajet sur cinq à pied';

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4600000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select lives_ok(
  $stmt$ select public.commit_plan_action('c4600000-0000-0000-0000-0000000000a1'::uuid, array[2,4]::smallint[], null) $stmt$,
  's''engager sur la première action, sans avoir à parler de remplacement'
);

select throws_ok(
  $stmt$ select public.commit_plan_action('c4600000-0000-0000-0000-0000000000a2'::uuid, array[1,3]::smallint[], null) $stmt$,
  'RM001',
  null,
  'la seconde est refusée : remplacer se demande'
);

-- **Et `p_replace = null` refuse aussi** (contre-lecture du 14/09/2026). `if not p_replace then`
-- était faux pour la valeur nulle — `not null` vaut `null`, donc la garde ne déclenchait pas et
-- l'engagement précédent partait. Le défaut d'argument protège l'appel qui **omet** le paramètre,
-- jamais celui qui passe un null explicite.
select throws_ok(
  $stmt$ select public.commit_plan_action('c4600000-0000-0000-0000-0000000000a2'::uuid, array[1,3]::smallint[], null, null::boolean) $stmt$,
  'RM001',
  null,
  'un p_replace nul refuse comme un p_replace faux'
);

-- **Le refus n'archive rien, et cette assertion ne peut pas se poser sur un comptage.** `throws_ok`
-- exécute l'ordre dans un bloc PL/pgSQL à gestionnaire d'exception, donc dans une sous-transaction :
-- tout ce que l'ordre a écrit avant de lever est annulé, et un `count(*) = 0` serait vrai même si la
-- fonction archivait avant de refuser. Ce qui est réellement éprouvable est l'**ordre du corps** —
-- le refus précède la libération — et il se lit sur la définition installée.
select cmp_ok(
  (select position('errcode = ''RM001''' in pg_get_functiondef('public.commit_plan_action(uuid,smallint[],text,boolean)'::regprocedure))),
  '<',
  (select position('archiver_engagement_de_laction' in pg_get_functiondef('public.commit_plan_action(uuid,smallint[],text,boolean)'::regprocedure))),
  'le refus est levé avant toute libération : rien ne peut être archivé puis annulé'
);

-- Avec `p_replace`, la libération a lieu **et** laisse sa trace : c'est le contrat de C2.2, que ce
-- drapeau rend explicite sans le changer.
select lives_ok(
  $stmt$ select public.commit_plan_action('c4600000-0000-0000-0000-0000000000a2'::uuid, array[1,3]::smallint[], null, true) $stmt$,
  'avec p_replace, la bascule a lieu'
);

select results_eq(
  $$ select count(*)::int, min(released_reason), min(array_to_string(intention_days, '-'))
     from public.plan_action_commitments_archive
     where user_id = 'c4600000-0000-0000-0000-000000000001' $$,
  $$ values (1, 'changement'::text, '2-4'::text) $$,
  'une seule ligne d''archive, en « changement », avec les jours que la personne avait choisis'
);

select * from finish();
rollback;
