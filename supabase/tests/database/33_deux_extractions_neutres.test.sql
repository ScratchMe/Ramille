-- Tests pgTAP des deux extractions de la boucle d'engagement — dette `v1-27` §5, migrations
-- `20260927210200_les_voyages_declares_en_un_seul_endroit.sql` et
-- `20260927210247_l_action_engagee_en_un_seul_endroit.sql` (27/09/2026).
--
-- Ce que ce fichier défend : **deux morceaux de logique écrits en deux exemplaires n'en ont plus
-- qu'un, et le comportement n'a pas bougé d'un point.** Il le défend de trois façons, parce
-- qu'aucune ne suffit seule :
--
--   1. **l'équivalence** — la fonction extraite est comparée, case par case, aux expressions
--      qu'elle remplace, recopiées ici telles que les corps installés les portaient le 27/09/2026.
--      C'est la preuve directe de la neutralité ; la suite entière, dont aucune valeur attendue n'a
--      bougé, en est la preuve indirecte ;
--   2. **le balayage** — ce qui doit être énuméré l'est, sans nommer les éléments un par un :
--      un compteur de voyages ajouté demain traverserait une liste écrite ici ;
--   3. **la structure** — chaque appelant passe par la fonction, et aucune autre fonction ne
--      réécrit la logique en ligne. C'est la seule garde possible pour le bilan à zéro de
--      `recompute_assessment_results`, dont la branche des voyages est **inatteignable** : aucun
--      comportement ne pourrait la voir tomber (l'en-tête de la migration dit pourquoi).
--
-- Les deux fonctions ne sont appelables que côté serveur, comme les autres pièces pures du calcul
-- (`complement_de_maintien`, `jours_francais`) : leurs privilèges sont épinglés ici, et la moitié
-- `from public` du `revoke` est ce qu'une assertion sur `anon` voit tomber (`SUPABASE.md` §2.2).
--
-- **Éprouvé en le cassant, le 27/09/2026** (`TESTING.md` §1.1). Chaque mutation a été posée juste
-- après le `begin` de **chaque** fichier de la suite — donc annulée avec lui, la stack n'en gardant
-- rien —, et le compte dit ce qu'elle a fait tomber sur la suite entière, pas seulement ici.
--
-- `a_des_voyages_declares` :
--   - l'autocar retiré de la fonction                → 5 : ici l'équivalence et le balayage ; dans
--     `20`, les deux assertions du profil G (son point mensuel, son libellé) et celle du profil I
--     (l'action de voyage engagée), qui n'ont plus de point du tout ;
--   - les vols retirés de la fonction                → 2, ici seulement (l'équivalence, le
--     balayage). **Aucun test de comportement ne tombe** : aucun profil de la suite ne sort
--     rarement avec des vols pour seuls voyages. C'est la mutation qui justifie le balayage — sans
--     lui, les vols et la voiture ne seraient gardés par rien d'autre que leur ligne dans la
--     fonction ;
--   - les vols courts ajoutés à l'énumération        → 1 (les vols courts seuls) ;
--   - le `revoke` sans `public`                       → 1 (les privilèges) ;
--   - les `coalesce` retirés                          → 2 (l'équivalence, sur ses cas nuls, et la
--     ligne absente, qui rend alors nul) ;
--   - `generate_extras_checkins` remise dans son corps d'avant l'extraction (celui de
--     `20260927191009`) → 5, rejoué le 27/09/2026 sur le fichier final : l'appel, le balayage des
--     copies et les compteurs nommés, plus les deux assertions de la section 9 (l'appel de
--     `action_engagee_de_la_periode`, le balayage de ses copies), ce corps portant aussi la
--     recherche en ligne — et **aucun** test de comportement, dans aucun fichier : c'est la
--     définition même d'une extraction neutre ;
--   - `recompute_assessment_results` remise dans son corps d'avant → 2 (l'appel du bilan à zéro, le
--     balayage des copies). Aucun comportement ne tombe, et aucun ne le pourrait : la branche est
--     inatteignable.
--
-- `action_engagee_de_la_periode` (une réécriture neutre de la fonction, jouée d'abord comme témoin,
-- ne fait rien tomber) :
--   - **le poste ignoré**                             → 4, **ici seulement** (l'appariement, le
--     cycle de septembre, les bornes, l'équivalence). Aucune assertion de `20` ni de `23` ne tombe :
--     l'appariement par poste, que C2.1 pose comme la condition pour qu'une action de loisirs ne
--     nomme pas la question du trajet, **n'était gardé par aucun test de comportement** avant
--     l'extraction — aucun profil de la suite n'est engagé sur un poste et interrogé sur un autre.
--     C'est la fonction extraite qui le garde désormais, ici ;
--   - le poste inversé (`<>`)                         → 12 : ici 5 ; dans `20`, le profil I ; dans
--     `23`, six assertions de l'engagement nommé et figé ;
--   - le tri par `committed_at` rendu croissant       → 2, ici seulement (le chevauchement,
--     l'équivalence) — il ne départage que des cycles qui se chevauchent, que seule la cadence
--     dormante produit ;
--   - les bornes du cycle exclues                     → 3 : ici 2, et le profil I de `20`, dont le
--     cycle commence le premier jour du mois interrogé ;
--   - le filtre `committed_at is not null` retiré     → 7 : ici 5, et dans `20` l'automobiliste C,
--     à qui une action seulement proposée donnait le genre « engagement » ;
--   - le filtre par compte retiré                     → 8 : ici 6, un dans `20` (le profil H reçoit
--     la question d'une action engagée par un autre) et un dans `23` ;
--   - le `revoke` sans `public`                       → 1 ; `security definer`       → 1 ;
--   - la boucle mensuelle qui repasse `ar.extras_poste` au lieu de `b.poste` → 2 : l'appel ici, et
--     le profil I de `20` — la régression exacte que `20260927191009` a fermée ;
--   - la boucle hebdomadaire qui passe `leisure` au lieu de `commute` → 7 : l'appel ici, et six de
--     `23` ;
--   - les deux générateurs remis dans leurs corps d'avant → 3 (les deux appels, le balayage), et
--     aucun test de comportement.
begin;
create extension if not exists pgtap with schema extensions;

select plan(26);

-- ── 1. `a_des_voyages_declares` : la fonction elle-même ─────────────────────────────────

select ok(
  to_regprocedure('public.a_des_voyages_declares(public.assessment_answers)') is not null,
  'a_des_voyages_declares prend la ligne de réponses entière — un compteur ajouté ne change pas la signature'
);

-- Lu en une chaîne : `proconfig` porte la collation « C » du catalogue, et `results_eq` refuse de
-- comparer un tableau de cette collation à un littéral.
select is(
  (select p.provolatile::text || ' ' || p.prosecdef::text || ' ' || array_to_string(p.proconfig, ',')
   from pg_proc p
   where p.oid = 'public.a_des_voyages_declares(public.assessment_answers)'::regprocedure),
  'i false search_path=public',
  'a_des_voyages_declares : immutable, security invoker, search_path explicite'
);

select ok(
  not has_function_privilege('anon', 'public.a_des_voyages_declares(public.assessment_answers)', 'execute')
  and not has_function_privilege('authenticated', 'public.a_des_voyages_declares(public.assessment_answers)', 'execute'),
  'a_des_voyages_declares : ni anon ni authenticated ne peuvent l''appeler (révoquée de PUBLIC aussi)'
);

-- ── 2. L'équivalence avec les deux copies qu'elle remplace ──────────────────────────────
-- Les deux formes d'origine, recopiées des corps installés le 27/09/2026 : le « or » du filtre de
-- la boucle mensuelle, et la somme du bilan à zéro. Quatre valeurs par compteur, `null` compris —
-- les colonnes sont `not null`, mais une variable `%rowtype` qu'on n'a pas remplie ne l'est pas
-- forcément, et les deux copies avaient leur `coalesce`. 256 cas, et chacun doit donner la même réponse trois
-- fois.

select is_empty(
  $$ with v(x) as (values (null::int), (0), (1), (2)),
     cas as (
       select f.x as f, t.x as t, c.x as c, co.x as co,
              jsonb_populate_record(null::public.assessment_answers, jsonb_build_object(
                'flights_total_per_year', f.x, 'train_long_trips_per_year', t.x,
                'car_long_trips_per_year', c.x, 'coach_long_trips_per_year', co.x)) as ligne
       from v f, v t, v c, v co
     )
     select f, t, c, co from cas
     where public.a_des_voyages_declares(ligne) is distinct from (
             coalesce(f, 0) > 0 or coalesce(t, 0) > 0 or coalesce(c, 0) > 0 or coalesce(co, 0) > 0)
        or public.a_des_voyages_declares(ligne) is distinct from (
             coalesce(f, 0) + coalesce(t, 0) + coalesce(c, 0) + coalesce(co, 0) > 0) $$,
  'a_des_voyages_declares rend exactement ce que rendaient le filtre de la boucle ET le bilan à zéro, sur 256 cas'
);

-- **Le « or » et la somme ne s'accordent que parce qu'un compteur ne peut pas être négatif.** La
-- fonction a pris la forme « or », qui n'en dépend pas ; mais la neutralité vis-à-vis de la somme
-- du bilan à zéro, elle, en dépend — et la contrainte se lit en base plutôt que de se supposer.
select is_empty(
  $$ select c.column_name::text
     from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'assessment_answers'
       and c.column_name in ('flights_total_per_year', 'train_long_trips_per_year',
                             'car_long_trips_per_year', 'coach_long_trips_per_year')
       and not exists (
         select 1 from pg_constraint k
         where k.conrelid = 'public.assessment_answers'::regclass and k.contype = 'c'
           and pg_get_constraintdef(k.oid) = format('CHECK ((%s >= 0))', c.column_name)
       ) $$,
  'chaque compteur de voyages porte check (>= 0) — ce qui rend la somme d''origine et le « or » équivalents'
);

-- ── 3. Le balayage : tout compteur de voyages compte, sans le nommer ────────────────────
-- Tout compteur annuel d'`assessment_answers` (suffixe `_per_year`), pris SEUL, suffit à déclarer
-- un voyage. Un cinquième compteur ajouté au questionnaire sans sa ligne dans la fonction tombe
-- ici, sans que personne ait pensé à l'écrire dans ce fichier.
--
-- **Une exception, et elle est la seule** : `flights_short_per_year` est un sous-ensemble de
-- `flights_total_per_year` (le calcul en déduit les long-courriers par différence), jamais un
-- compte à part — aucune des deux copies d'origine ne le lisait.
select is_empty(
  $$ select c.column_name::text
     from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'assessment_answers'
       and c.column_name like '%\_per\_year'
       and c.column_name <> 'flights_short_per_year'
       and not public.a_des_voyages_declares(
             jsonb_populate_record(null::public.assessment_answers,
                                   jsonb_build_object(c.column_name::text, 1))) $$,
  'tout compteur annuel de voyages, seul, compte comme un voyage déclaré'
);

-- Le balayage ne passe pas à vide : son domaine contient au moins les quatre compteurs connus. Le
-- compte n'est pas écrit — il deviendrait faux au cinquième.
select set_has(
  $$ select column_name::text from information_schema.columns
     where table_schema = 'public' and table_name = 'assessment_answers'
       and column_name like '%\_per\_year' and column_name <> 'flights_short_per_year' $$,
  $$ values ('flights_total_per_year'::text), ('train_long_trips_per_year'), ('car_long_trips_per_year'),
            ('coach_long_trips_per_year') $$,
  'le balayage porte bien sur les compteurs de voyages — il n''est pas vide'
);

select ok(
  not public.a_des_voyages_declares(
    jsonb_populate_record(null::public.assessment_answers,
                          jsonb_build_object('flights_short_per_year', 3)))
  and not public.a_des_voyages_declares(null::public.assessment_answers),
  'les vols courts seuls ne comptent pas (sous-ensemble du total), et une ligne absente rend faux, jamais nul'
);

-- ── 4. La structure : chaque appelant passe par la fonction, et personne d'autre n'énumère ─
-- Les commentaires sont retirés avant la recherche : sans ça, la phrase qui explique la règle dans
-- le corps d'un appelant ferait passer — ou échouer — le contrôle qu'elle décrit.

select ok(
  regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g')
    like '%public.a_des_voyages_declares(ans)%',
  'la boucle mensuelle demande sa base déclarée à a_des_voyages_declares'
);

select ok(
  regexp_replace(pg_get_functiondef('public.recompute_assessment_results(uuid)'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g')
    like '%when public.a_des_voyages_declares(a) then ''travel''%',
  'le bilan à zéro demande ses voyages à a_des_voyages_declares — branche inatteignable, gardée par sa structure'
);

-- **Aucune autre fonction n'énumère les compteurs de voyages**, ni en « or » (`… , 0) > 0`) ni en
-- somme (`… , 0) +`). Le 27/09/2026, avant l'extraction, ce balayage rendait exactement les deux
-- copies — `generate_extras_checkins` et `recompute_assessment_results` — et rien d'autre :
-- `estimate_action_savings` lit les compteurs un par un pour chiffrer (`- …`, `* …`), et le calcul
-- les multiplie par leurs distances. Une troisième copie écrite demain tombe ici.
select is_empty(
  $$ select n.nspname || '.' || p.proname
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'analytics') and p.prokind in ('f', 'p')
       and p.oid <> 'public.a_des_voyages_declares(public.assessment_answers)'::regprocedure
       and regexp_replace(pg_get_functiondef(p.oid), '--[^' || chr(10) || ']*', '', 'g')
           ~ '_per_year, 0\)\s*(>\s*0|\+)' $$,
  'aucune autre fonction n''énumère les compteurs de voyages — ni en « or », ni en somme'
);

-- Et la boucle mensuelle ne lit plus aucun compteur elle-même : sa seule lecture était le filtre.
select ok(
  regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g')
    !~ '(flights_total|long_trips)_per_year',
  'la boucle mensuelle ne nomme plus aucun compteur de voyages'
);

-- ════════════════════════════════════════════════════════════════════════════════════════

-- ── 5. `action_engagee_de_la_periode` : la fonction elle-même ───────────────────────────

select ok(
  to_regprocedure('public.action_engagee_de_la_periode(uuid, text, date)') is not null,
  'action_engagee_de_la_periode reçoit le compte, le poste déjà choisi et la période interrogée'
);

select is(
  (select p.provolatile::text || ' ' || p.prosecdef::text || ' ' || array_to_string(p.proconfig, ',')
   from pg_proc p
   where p.oid = 'public.action_engagee_de_la_periode(uuid, text, date)'::regprocedure),
  's false search_path=public',
  'action_engagee_de_la_periode : stable (elle lit des tables), security invoker, search_path explicite'
);

select ok(
  not has_function_privilege('anon', 'public.action_engagee_de_la_periode(uuid, text, date)', 'execute')
  and not has_function_privilege('authenticated', 'public.action_engagee_de_la_periode(uuid, text, date)', 'execute'),
  'action_engagee_de_la_periode : ni anon ni authenticated ne peuvent l''appeler (révoquée de PUBLIC aussi)'
);

-- ── 6. Fixtures : trois comptes, quatre cycles ──────────────────────────────────────────
-- Les cycles et les engagements sont écrits directement, et non générés : ce qui est éprouvé ici est
-- la recherche, pas la génération du plan, et il faut des situations que la génération ne fabrique
-- pas d'elle-même — deux cycles qui se chevauchent surtout.
--
--   U1 : l'été (vélo engagé, deux autres actions non engagées dont un voyage), puis l'automne (un
--        voyage engagé, le vélo proposé mais pas engagé). Sert à l'appariement par poste et à la
--        période qui choisit le cycle.
--   U2 : un été en saison et un trimestre glissant qui le chevauche — la cadence `rolling_quarter`,
--        dormante, est le seul chemin de production vers ce chevauchement —, un engagement sur le
--        trajet dans chacun. Sert au tri par `committed_at`.
--   U3 : aucun cycle. Sert à vérifier qu'on ne reçoit l'action de personne.
-- Les gabarits se désignent par `action_text`, jamais par leur identifiant (`SUPABASE.md` §2.3).

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-extraction-' || right(u::text, 1) || '@test.local', 'x', now(), false, now(), now()
from unnest(array[
  'e3300000-0000-0000-0000-000000000001'::uuid,
  'e3300000-0000-0000-0000-000000000002',
  'e3300000-0000-0000-0000-000000000003'
]) u;

insert into public.plan_cycles (id, user_id, cadence_type, period_label, period_start, period_end,
                                trip_label, target_reduction_pct)
values
  ('e3310000-0000-0000-0000-000000000011', 'e3300000-0000-0000-0000-000000000001', 'season',
   'Été 2026', '2026-06-01', '2026-08-31', 'Trajet domicile-travail', 10),
  ('e3310000-0000-0000-0000-000000000012', 'e3300000-0000-0000-0000-000000000001', 'season',
   'Automne 2026', '2026-09-01', '2026-11-30', 'Trajet domicile-travail', 10),
  ('e3310000-0000-0000-0000-000000000021', 'e3300000-0000-0000-0000-000000000002', 'season',
   'Été 2026', '2026-06-01', '2026-08-31', 'Trajet domicile-travail', 10),
  ('e3310000-0000-0000-0000-000000000022', 'e3300000-0000-0000-0000-000000000002', 'rolling_quarter',
   'Trimestre glissant', '2026-07-15', '2026-10-14', 'Trajet domicile-travail', 10);

insert into public.plan_actions (plan_cycle_id, action_template_id, rank, committed_at,
                                 intention_days, intention_timing)
select v.cycle, t.id, v.rang, v.engagee_le, v.jours, v.echeance
from (values
  ('e3310000-0000-0000-0000-000000000011'::uuid, 'Faire un trajet sur cinq à vélo', 1,
   '2026-06-10 08:00+00'::timestamptz, '{2,4}'::smallint[], null::text),
  ('e3310000-0000-0000-0000-000000000011', 'Travailler depuis chez toi un jour par semaine', 2,
   null, null, null),
  ('e3310000-0000-0000-0000-000000000011', 'Remplacer un aller-retour en avion par le train', 3,
   null, null, null),
  ('e3310000-0000-0000-0000-000000000012', 'Remplacer un aller-retour en avion par le train', 1,
   '2026-09-05 08:00+00', null, 'au_prochain_voyage'),
  ('e3310000-0000-0000-0000-000000000012', 'Faire un trajet sur cinq à vélo', 2,
   null, null, null),
  ('e3310000-0000-0000-0000-000000000021', 'Faire un trajet sur cinq à pied', 1,
   '2026-06-02 08:00+00', '{1}', null),
  ('e3310000-0000-0000-0000-000000000022', 'Passer deux trajets sur cinq en train', 1,
   '2026-07-20 08:00+00', '{3,5}', null)
) as v(cycle, texte, rang, engagee_le, jours, echeance)
join public.action_templates t on t.action_text = v.texte;

-- Le décor est complet : sept lignes, sans quoi un libellé mal recopié n'aurait rien apparié et les
-- assertions d'absence ci-dessous passeraient pour la mauvaise raison.
select is(
  (select count(*)::int from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
   where pc.user_id::text like 'e3300000%'),
  7,
  'fixtures : les sept actions sont posées — aucun libellé de gabarit mal recopié'
);

-- ── 7. Ce que la fonction rend ──────────────────────────────────────────────────────────

-- L'action engagée, avec son intention et son gabarit — et pas l'action non engagée du même poste
-- dans le même cycle. Sans le filtre `committed_at is not null`, le tri décroissant placerait les
-- lignes non engagées en tête (les nuls passent devant en `desc`), et c'est elles qu'on rendrait.
select results_eq(
  $$ select action_text, intention_days, intention_timing, question_template
     from public.action_engagee_de_la_periode('e3300000-0000-0000-0000-000000000001', 'commute', '2026-08-03') $$,
  $$ select action_text, '{2,4}'::smallint[], null::text, question_template
     from public.action_templates where action_text = 'Faire un trajet sur cinq à vélo' $$,
  'l''action engagée sur le poste, avec ses jours et son gabarit — jamais une action seulement proposée'
);

-- **L'appariement par poste** (C2.1) : en août, U1 est engagée sur son trajet ; la question de ses
-- voyages ne doit pas la nommer, et l'action de voyage proposée dans le même cycle n'est pas engagée.
select is_empty(
  $$ select 1 from public.action_engagee_de_la_periode('e3300000-0000-0000-0000-000000000001', 'travel', '2026-08-03')
     union all
     select 1 from public.action_engagee_de_la_periode('e3300000-0000-0000-0000-000000000001', 'leisure', '2026-08-03') $$,
  'appariement par poste : l''engagement sur le trajet ne répond ni pour les voyages ni pour les sorties'
);

-- **La période interrogée choisit le cycle** : en septembre, c'est la saison d'automne qui couvre la
-- période — son voyage engagé répond, et le vélo de l'été ne répond plus, même s'il est proposé de
-- nouveau (non engagé) dans le nouveau cycle.
select results_eq(
  $$ select action_text, intention_timing
     from public.action_engagee_de_la_periode('e3300000-0000-0000-0000-000000000001', 'travel', '2026-09-07')
     union all
     select action_text, intention_timing
     from public.action_engagee_de_la_periode('e3300000-0000-0000-0000-000000000001', 'commute', '2026-09-07') $$,
  $$ values ('Remplacer un aller-retour en avion par le train'::text, 'au_prochain_voyage'::text) $$,
  'la période interrogée choisit le cycle : en septembre, l''engagement de l''automne, plus celui de l''été'
);

-- Les bornes du cycle sont comprises des deux côtés (`between`) : la période interrogée qui commence
-- le premier jour d'une saison, ou le dernier, lui appartient.
select results_eq(
  $$ select d, (select count(*) from public.action_engagee_de_la_periode(
                  'e3300000-0000-0000-0000-000000000001', 'commute', d))::int
     from unnest(array['2026-05-31', '2026-06-01', '2026-08-31', '2026-09-01']::date[]) d $$,
  $$ values ('2026-05-31'::date, 0), ('2026-06-01', 1), ('2026-08-31', 1), ('2026-09-01', 0) $$,
  'les bornes du cycle sont comprises — la veille et le lendemain n''en sont pas'
);

-- **Le tri** : deux cycles de U2 se chevauchent du 15/07 au 31/08, chacun avec son engagement sur le
-- trajet. Avant le chevauchement, seul l'été répond ; pendant, l'engagement le plus récent ; après,
-- seul le trimestre glissant. La première et la dernière ligne prouvent que le décor chevauche bien.
select results_eq(
  $$ select d, (select action_text from public.action_engagee_de_la_periode(
                  'e3300000-0000-0000-0000-000000000002', 'commute', d))
     from unnest(array['2026-07-01', '2026-08-03', '2026-09-15']::date[]) d $$,
  $$ values ('2026-07-01'::date, 'Faire un trajet sur cinq à pied'::text),
            ('2026-08-03', 'Passer deux trajets sur cinq en train'),
            ('2026-09-15', 'Passer deux trajets sur cinq en train') $$,
  'deux cycles qui se chevauchent : l''engagement le plus récent gagne (tri par committed_at)'
);

select is_empty(
  $$ select 1 from unnest(array['commute', 'leisure', 'travel']) p,
                  public.action_engagee_de_la_periode('e3300000-0000-0000-0000-000000000003', p, '2026-08-03') $$,
  'un compte sans cycle ne reçoit l''engagement de personne'
);

-- ── 8. L'équivalence avec la requête qu'elle remplace ───────────────────────────────────
-- La jointure latérale des deux générateurs, recopiée telle que les corps installés la portaient le
-- 27/09/2026 (identique dans les deux à son poste près), comparée à la fonction sur toute la grille
-- comptes × postes × dates — le poste nul compris, que `b.poste` ne vaut jamais mais qui ne doit
-- rien apparier. La grille contient les cas non vides des assertions précédentes (08-03, 09-07…),
-- donc elle ne passe pas à vide.
select is_empty(
  $$ with cas as (
       select u, p, d
       from unnest(array['e3300000-0000-0000-0000-000000000001',
                         'e3300000-0000-0000-0000-000000000002',
                         'e3300000-0000-0000-0000-000000000003']::uuid[]) u,
            unnest(array['commute', 'leisure', 'travel', null]::text[]) p,
            unnest(array['2026-05-31', '2026-06-01', '2026-07-01', '2026-07-15', '2026-08-03',
                         '2026-08-31', '2026-09-01', '2026-09-07', '2026-10-14', '2026-10-15',
                         '2026-11-30', '2026-12-01']::date[]) d
     )
     select u, p, d from cas
     where (select row(e.*)::text from public.action_engagee_de_la_periode(u, p, d) e)
           is distinct from
           (select row(o.*)::text from (
              -- `pa.id` depuis C4.2 (20260928100000) : la fonction rend l'action qu'elle a retenue,
              -- pour que le mot de la veille lise son cycle sans recopier la recherche.
              select pa.intention_days, pa.intention_timing, t.action_text, t.question_template, pa.id
              from public.plan_actions pa
              join public.plan_cycles pc on pc.id = pa.plan_cycle_id
              join public.action_templates t on t.id = pa.action_template_id
              where pc.user_id = u
                and pa.committed_at is not null
                and t.poste = p
                and d between pc.period_start and pc.period_end
              order by pa.committed_at desc
              limit 1
            ) o) $$,
  'action_engagee_de_la_periode rend exactement ce que rendait la jointure latérale des deux générateurs, sur 144 cas'
);

-- ── 9. La structure : chaque générateur passe par la fonction, avec SON poste ──────────
-- Le poste est choisi par l'appelant (`v1-27` §5) : `commute` pour la boucle hebdomadaire, et pour la
-- mensuelle `b.poste` — `travel` chez qui sort rarement, `extras_poste` sinon (`20260927191009`).
-- Repasser `ar.extras_poste` à la fonction referait chercher une action de loisirs à ce profil.

select ok(
  regexp_replace(pg_get_functiondef('public.generate_commute_checkins()'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g')
    like '%public.action_engagee_de_la_periode(a.user_id, ''commute'', v_period_start)%',
  'la boucle hebdomadaire cherche l''action engagée par la fonction, sur le trajet'
);

select ok(
  regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                 '--[^' || chr(10) || ']*', '', 'g')
    like '%public.action_engagee_de_la_periode(a.user_id, b.poste, v_period_start)%',
  'la boucle mensuelle cherche l''action engagée par la fonction, sur le poste qu''elle a choisi'
);

-- **Aucune autre fonction ne cherche l'engagement d'une période en ligne.** Le 27/09/2026, avant
-- l'extraction, ce balayage rendait exactement les deux générateurs, et rien d'autre.
select is_empty(
  $$ select n.nspname || '.' || p.proname
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'analytics') and p.prokind in ('f', 'p')
       and p.oid <> 'public.action_engagee_de_la_periode(uuid, text, date)'::regprocedure
       and regexp_replace(pg_get_functiondef(p.oid), '--[^' || chr(10) || ']*', '', 'g')
           ~ 'plan_actions'
       and regexp_replace(pg_get_functiondef(p.oid), '--[^' || chr(10) || ']*', '', 'g')
           ~ 'between\s+\w+\.period_start\s+and\s+\w+\.period_end' $$,
  'aucune autre fonction ne recopie la recherche de l''action engagée sur une période'
);

select * from finish();
rollback;
