-- Tests pgTAP des deux extractions de la boucle d'engagement — dette `v1-27` §5, migrations
-- `20260927230000_les_voyages_declares_en_un_seul_endroit.sql` et
-- `20260927231000_l_action_engagee_en_un_seul_endroit.sql` (27/09/2026).
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
--   - `generate_extras_checkins` remise dans son corps d'avant l'extraction → 3 (l'appel, le
--     balayage des copies, les compteurs nommés), et **aucun** test de comportement — c'est la
--     définition même d'une extraction neutre ;
--   - `recompute_assessment_results` remise dans son corps d'avant → 2 (l'appel du bilan à zéro, le
--     balayage des copies). Aucun comportement ne tombe, et aucun ne le pourrait : la branche est
--     inatteignable.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

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
-- les colonnes sont `not null`, mais la ligne passée par une variable `%rowtype` ne l'est pas, et
-- les deux copies avaient leur `coalesce`. 256 cas, et chacun doit donner la même réponse trois
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

select * from finish();
rollback;
