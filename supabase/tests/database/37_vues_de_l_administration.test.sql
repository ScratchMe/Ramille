-- Tests pgTAP des vues de l'administration — lot 6, migration
-- `20260929200000_les_vues_de_l_administration.sql` (décisions du 27/09/2026).
--
-- Ce que ce fichier défend : **chaque vue compte ce qu'elle dit compter, avec la définition que le
-- produit s'est déjà donnée** — l'étape et les semaines tenues de `cohorte_de`, le signe de vie de
-- `dernier_signe_de_vie`, le régime de `regime_de_rappel` sur la boucle hebdomadaire quand elle
-- existe. Une vue d'analyse fausse ne lève rien : elle fait tirer des conclusions sur le churn à
-- partir d'un chiffre que personne ne recompte.
--
-- ## Trois choses à savoir avant de « corriger » un test de ce fichier
--
-- **1. Deux bornes, parce qu'il y a deux sortes de vues.** L'entonnoir et la rétention se lisent par
-- semaine d'arrivée : les comptes fabriqués naissent dans la semaine d'il y a **300 jours**, et les
-- assertions n'en lisent que cette semaine-là (et la suivante, qui n'a que des purgés). Assez récent
-- pour que la purge des `app_open` à douze mois n'y touche pas — sans quoi `borne_basse` vaudrait
-- toujours vrai et ne s'éprouverait pas —, et antérieur au premier compte de la production (le
-- 09/09/2026) **jusqu'en juillet 2027** : rejoué sur le distant après cette date, ce fichier y
-- croiserait de vrais comptes (`TESTING.md` §2.3). En CI, la base est vierge. Les états des rappels
-- et les départs, eux, sont des totaux : ils se lisent **en écart** à un relevé fait avant les
-- fixtures, et tiennent donc sur n'importe quelle base.
--
-- **2. `occurred_at` et `submitted_at` sont posés par le serveur** : une fixture insère, puis recule
-- la date (même règle que `36`).
--
-- **3. Le signe de vie d'une réponse est le DÉBUT de la période interrogée**, pas `responded_at` —
-- la définition de `dernier_signe_de_vie`, que la rétention lit semaine par semaine. `responded_at`
-- ne sert qu'à « a répondu cette semaine-là ». D'où des fixtures où les deux tombent dans des
-- semaines différentes : c'est ce qui les distingue.
--
-- **Éprouvé en le cassant, le 29/09/2026** (TESTING.md §1.1), la migration mutée et rejouée sur la
-- base locale, le fichier rejoué ensuite — chaque mutation remise en place avant la suivante. Les
-- numéros sont ceux des assertions de ce fichier :
--
--   - l'entonnoir sans les purgés                               → 1 : la 5 ;
--   - la part « a soumis un bilan » non cumulée (sa seule étape) → 1 : la 5 ;
--   - la rétention sur les seuls vivants                        → 2 : la 7 (dénominateur à 6) et la 8
--     (la cohorte toute purgée disparaît) ;
--   - la rétention sur les seuls `app_open`                     → 1 : la 7, A3 n'étant actif que par
--     ses périodes répondues ;
--   - la semaine en cours incluse                               → 1 : la 6 ;
--   - la borne basse sans son « + 1 »                           → 1 : la 7, à la semaine 4 ;
--   - la borne basse sans la purge des événements à douze mois  → 1 : la 9 ;
--   - « a répondu » lu sur le début de période                  → 1 : la 7 ;
--   - la boucle mensuelle avant l'hebdomadaire                  → 3 : la 4, la 10 et la 12 — A6 part ;
--   - `espace` compté parmi les partis                          → 2 : la 10 et la 11 ;
--   - les départs datés par l'arrivée                           → 1 : la 12 ;
--   - les purges comptées par leurs candidates                  → 1 : la 13 ;
--   - les suppressions oubliées                                 → 1 : la 14 ;
--   - `select` accordé à `authenticated` sur une vue            → 1 : la 1.
--
-- Deux des quatorze passaient sur la première version des fixtures, et c'est pourquoi A3 tient six
-- semaines et A7 existe : le dernier signe de vie d'A3 tombait dans son mois d'arrivée, et aucune
-- cohorte n'avait plus de douze mois.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- ── 1. Rien de lisible depuis le client, rien qui désigne quelqu'un ─────────────────────────────

select ok(
  not exists (
    select 1
    from (values ('analytics.entonnoir_par_cohorte'), ('analytics.retention_par_cohorte'),
                 ('analytics.regimes_de_rappel'), ('analytics.departs_par_mois')) as t(nom)
    cross join (values ('anon'), ('authenticated')) as r(role)
    cross join (values ('select'), ('insert'), ('update'), ('delete'), ('truncate'),
                       ('references'), ('trigger')) as p(privilege)
    where has_table_privilege(r.role, t.nom, p.privilege)
  )
  and not has_function_privilege('anon', 'public.boucle_de_la_personne(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.boucle_de_la_personne(uuid)', 'execute'),
  'ni anon ni authenticated ne lisent les vues de l''administration, ni n''appellent boucle_de_la_personne'
);

-- Des semaines, des mois, des compteurs, des parts et des drapeaux — et le nom d'une boucle. Aucun
-- identifiant ni horodatage : ces vues se collent dans un tableur.
select is_empty(
  $$ select table_name, column_name, data_type from information_schema.columns
     where table_schema = 'analytics'
       and table_name in ('entonnoir_par_cohorte', 'retention_par_cohorte', 'regimes_de_rappel', 'departs_par_mois')
       and not (data_type in ('date', 'integer', 'numeric', 'boolean')
                or (table_name = 'regimes_de_rappel' and column_name = 'boucle' and data_type = 'text')) $$,
  'les vues ne rendent ni identifiant, ni horodatage, ni texte libre'
);

-- Les états des rappels nomment trois régimes en colonnes : une quatrième valeur rendue par
-- `regime_de_rappel` sortirait de toutes, et les colonnes ne sommeraient plus à `comptes` — en
-- silence. `36` compare ces valeurs au `check` des compteurs de la purge ; celle-ci, aux colonnes
-- des vues.
select bag_eq(
  $$ select distinct (regexp_matches(regexp_replace(prosrc, '--[^' || chr(10) || ']*', '', 'g'),
                                     'return\s+''([a-z_]+)''', 'g'))[1]
     from pg_proc where oid = 'public.regime_de_rappel(uuid, text)'::regprocedure $$,
  $$ values ('normal'), ('espace'), ('silence') $$,
  'regime_de_rappel ne rend que les trois régimes que les vues nomment en colonnes'
);

-- ── 2. Les relevés d'avant, pour les vues qui totalisent ────────────────────────────────────────

create temp table regimes_avant on commit drop as select * from analytics.regimes_de_rappel;
create temp table departs_avant on commit drop as select * from analytics.departs_par_mois;

-- ── 3. Six comptes vivants et trois purgés, arrivés la même semaine W ───────────────────────────
--
-- W est le lundi (UTC) d'il y a 300 jours ; chacun arrive le mardi à 10 h. « s. n » est la semaine
-- d'âge n, « W+k » le jour k après le lundi W.
--
--   A1  n'a rien fait                                        → a_ouvert, pas de boucle
--   A2  bilan ; ouvre l'app à W+1 (s. 0) et W+15 (s. 2)       → a_soumis_un_bilan, pas de boucle
--   A3  bilan ; engagé (archive) ; points hebdomadaires répondus pour les périodes W+35 et W+42
--       (répondus à W+43 et W+50) ; puis huit points clos      → a_repondu, commute, silence
--   A4  bilan ; point hebdomadaire répondu pour W+7 (à W+10) ; ouvre l'app à W+8 ; quatre points
--       clos ensuite                                           → a_repondu, commute, espace
--   A5  bilan ; engagé (archive) ; un point MENSUEL clos       → s_est_engagee, extras, normal
--   A6  rattaché ; bilan ; point hebdomadaire répondu pour W+21 (à W+24) ; ouvre l'app à W+36 ;
--       huit points MENSUELS clos après                        → a_repondu, commute, normal
--   +   trois comptes purgés de la semaine W : deux à « a ouvert » (0 semaine), un à « a soumis
--       un bilan » (2-3 semaines)
--   +   un compte purgé de la semaine W+14, seul de sa cohorte (13+ semaines)
--   A7  arrivé il y a 420 jours, n'a rien fait : une cohorte dont les premières semaines ont plus de
--       douze mois, donc des `app_open` déjà purgés
--
-- A3 tient six semaines : son dernier signe de vie (W+42) tombe forcément dans un autre mois que
-- son arrivée, et c'est ce qui distingue un départ daté par la fin de l'usage d'un départ daté par
-- l'arrivée.
--
-- A6 éprouve la règle du churn : sa boucle mensuelle est en silence, mais il a une boucle
-- hebdomadaire, et il y répond — il est actif. `cohortes_purgees` l'aurait compté en silence s'il
-- avait été purgé ; c'est la différence voulue, écrite en tête de la migration.

select set_config('c37.w', date_trunc('week', (now() - interval '300 days') at time zone 'UTC')::date::text, true);

create temp table jour on commit drop as
select k, ((current_setting('c37.w')::date + k)::timestamp + interval '12 hours') at time zone 'UTC' as midi
from generate_series(0, 400) as g(k);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, is_anonymous, created_at, updated_at)
select ('c3700000-0000-0000-0000-00000000000' || i)::uuid, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated',
       case when i = 6 then 'pgtap-c37-rattache@test.local' end,
       case when i = 6 then 'x' end,
       i <> 6,
       case when i = 7 then now() - interval '420 days'
            else (current_setting('c37.w')::date + interval '1 day 10 hours') at time zone 'UTC' end,
       now()
from generate_series(1, 7) as g(i);

insert into public.assessments (user_id, status, created_at)
select ('c3700000-0000-0000-0000-00000000000' || i)::uuid, 'completed',
       (current_setting('c37.w')::date + interval '1 day 11 hours') at time zone 'UTC'
from generate_series(2, 6) as g(i);

update public.assessments set submitted_at = created_at
where user_id::text like 'c3700000-0000-0000-0000-00000000000%';

insert into public.usage_events (user_id, name, platform) values
  ('c3700000-0000-0000-0000-000000000002', 'app_open', 'android'),
  ('c3700000-0000-0000-0000-000000000002', 'app_open', 'android'),
  ('c3700000-0000-0000-0000-000000000004', 'app_open', 'android'),
  ('c3700000-0000-0000-0000-000000000006', 'app_open', 'android');

-- Reculées une à une : les deux ouvertures d'A2 tombent dans deux semaines différentes.
update public.usage_events e set occurred_at = j.midi
from (select id, row_number() over (order by id) as rang from public.usage_events
      where user_id = 'c3700000-0000-0000-0000-000000000002') a
join jour j on j.k = case a.rang when 1 then 1 else 15 end
where e.id = a.id;
update public.usage_events set occurred_at = (select midi from jour where k = 8)
where user_id = 'c3700000-0000-0000-0000-000000000004';
update public.usage_events set occurred_at = (select midi from jour where k = 36)
where user_id = 'c3700000-0000-0000-0000-000000000006';

insert into public.plan_action_commitments_archive (user_id, action_template_id, action_text, committed_at, released_reason)
select u.id, t.id, t.action_text, (select midi from jour where k = 2), 'changement'
from (values ('c3700000-0000-0000-0000-000000000003'::uuid), ('c3700000-0000-0000-0000-000000000005'::uuid)) as u(id)
cross join lateral (select id, action_text from public.action_templates order by action_text limit 1) t;

-- Les points répondus : (compte, début de période, jour de la réponse).
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste,
                                        status, response_kind, response, responded_at)
select r.u::uuid, 'commute', current_setting('c37.w')::date + r.periode, 'Semaine', 'Trajet domicile-travail',
       'commute', 'answered', 'oui', true, (select midi from jour where k = r.reponse)
from (values ('c3700000-0000-0000-0000-000000000003', 35, 43),
             ('c3700000-0000-0000-0000-000000000003', 42, 50),
             ('c3700000-0000-0000-0000-000000000004', 7, 10),
             ('c3700000-0000-0000-0000-000000000006', 21, 24)) as r(u, periode, reponse);

-- Les points clos : huit hebdomadaires pour A3, quatre pour A4, un mensuel pour A5, huit mensuels
-- pour A6 — tous après le dernier signe de vie de leur compte.
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select c.u::uuid, c.boucle, current_setting('c37.w')::date + d.k, 'Période', 'Trajet', c.poste, 'expired'
from (values ('c3700000-0000-0000-0000-000000000003', 'commute', 'commute', 49, 98, 7),
             ('c3700000-0000-0000-0000-000000000004', 'commute', 'commute', 14, 35, 7),
             ('c3700000-0000-0000-0000-000000000005', 'extras', 'travel', 30, 30, 30),
             ('c3700000-0000-0000-0000-000000000006', 'extras', 'travel', 40, 250, 30)) as c(u, boucle, poste, de, a, pas)
cross join lateral generate_series(c.de, c.a, c.pas) as d(k);

insert into public.purges_par_cohorte (semaine_d_arrivee, etape, semaines_tenues, rappels_au_depart, comptes) values
  (current_setting('c37.w')::date, 'a_ouvert', '0', 'normal', 2),
  (current_setting('c37.w')::date, 'a_soumis_un_bilan', '2-3', 'normal', 1),
  (current_setting('c37.w')::date + 14, 'a_repondu', '13+', 'silence', 1);

-- Les départs datés par un journal : une purge appliquée — quatre candidates, trois supprimées (un
-- compte a pu partir entre-temps par `delete_my_account`) —, et deux suppressions de compte.
insert into public.purge_runs (ran_at, status, candidates, deleted)
values ((select midi from jour where k = 60), 'applied', 4, 3);
insert into public.suppressions_de_compte_par_mois (mois, suppressions)
values (date_trunc('month', current_setting('c37.w')::date + 100)::date, 2)
on conflict (mois) do update set suppressions = public.suppressions_de_compte_par_mois.suppressions + 2;

-- ── 4. La boucle du churn ───────────────────────────────────────────────────────────────────────

select results_eq(
  $$ select public.boucle_de_la_personne(('c3700000-0000-0000-0000-00000000000' || i)::uuid)
     from generate_series(1, 6) as g(i) order by i $$,
  $$ values (null::text), (null), ('commute'), ('commute'), ('extras'), ('commute') $$,
  'la boucle hebdomadaire quand elle existe, sinon la mensuelle, sinon aucune — A6 a les deux, et c''est l''hebdomadaire'
);

-- ── 5. L'entonnoir ──────────────────────────────────────────────────────────────────────────────

select results_eq(
  $$ select semaine_d_arrivee - current_setting('c37.w')::date, arrivees, dont_purgees,
            etape_a_ouvert, etape_a_soumis_un_bilan, etape_s_est_engagee, etape_a_repondu,
            part_bilan_soumis, part_a_repondu
     from analytics.entonnoir_par_cohorte
     where semaine_d_arrivee in (current_setting('c37.w')::date, current_setting('c37.w')::date + 14)
     order by 1 $$,
  $$ values (0, 9, 3, 3, 2, 1, 3, 66.7, 33.3),
            (14, 1, 1, 0, 0, 0, 1, 100.0, 100.0) $$,
  'l''entonnoir additionne vivants et purgés d''une même semaine, rangés à l''étape la plus loin, et ses parts divisent par toute la cohorte'
);

-- ── 6. La rétention ─────────────────────────────────────────────────────────────────────────────

-- Toutes les semaines d'âge révolues, et aucune autre : la semaine en cours n'y est pas.
select is(
  (select array[min(semaine_d_age), max(semaine_d_age), count(*)::integer]
   from analytics.retention_par_cohorte where semaine_d_arrivee = current_setting('c37.w')::date),
  array[0, (date_trunc('week', now() at time zone 'UTC')::date - current_setting('c37.w')::date) / 7 - 1,
        (date_trunc('week', now() at time zone 'UTC')::date - current_setting('c37.w')::date) / 7],
  'une ligne par semaine d''âge révolue, de 0 à la dernière semaine complète'
);

-- La courbe des huit premières semaines. Actifs : A2 (s. 0 et 2), A4 (s. 1, deux signes la même
-- semaine), A6 (s. 3 par sa période, s. 5 par son ouverture), A3 (s. 5 et 6, par le début de ses
-- périodes). Ont répondu, par `responded_at` : A4 (s. 1), A6 (s. 3), A3 (s. 6 et 7) — une semaine
-- après le début de leur période. Borne basse jusqu'à la semaine 4 : la plus haute tranche des
-- purgés est « 2-3 ».
select results_eq(
  $$ select semaine_d_age, arrivees, actifs, part_actifs, ont_repondu, borne_basse
     from analytics.retention_par_cohorte
     where semaine_d_arrivee = current_setting('c37.w')::date and semaine_d_age <= 7
     order by semaine_d_age $$,
  $$ values (0, 9, 1, 11.1, 0, true),
            (1, 9, 1, 11.1, 1, true),
            (2, 9, 1, 11.1, 0, true),
            (3, 9, 1, 11.1, 1, true),
            (4, 9, 0, 0.0, 0, true),
            (5, 9, 2, 22.2, 0, false),
            (6, 9, 1, 11.1, 1, false),
            (7, 9, 0, 0.0, 1, false) $$,
  'la rétention compte les signes de vie semaine par semaine, sur toute la cohorte, et dit où les purgés la rendent incertaine'
);

select ok(
  (select count(*) > 0 and bool_and(arrivees = 1 and actifs = 0 and borne_basse)
   from analytics.retention_par_cohorte where semaine_d_arrivee = current_setting('c37.w')::date + 14),
  'une cohorte dont tous les comptes sont purgés a ses lignes, sans actif, et toutes en borne basse (13+ semaines)'
);

-- La cohorte d'A7 : ses semaines qui commencent il y a plus de douze mois ont perdu leurs `app_open`
-- (`purge_usage_events`), et elles seules sont en borne basse — il n'y a aucun purgé.
select ok(
  (select bool_and(borne_basse = (semaine_d_arrivee + 7 * semaine_d_age < (now() at time zone 'UTC' - interval '12 months')::date))
          and bool_or(borne_basse) and bool_or(not borne_basse)
   from analytics.retention_par_cohorte
   where semaine_d_arrivee = date_trunc('week', (now() - interval '420 days') at time zone 'UTC')::date),
  'une semaine commencée il y a plus de douze mois est en borne basse, et une plus récente ne l''est pas'
);

-- ── 7. Les états des rappels, en écart au relevé d'avant ────────────────────────────────────────

select results_eq(
  $$ select a.boucle,
            a.comptes - coalesce(b.comptes, 0), a.actifs - coalesce(b.actifs, 0),
            a.en_decrochage - coalesce(b.en_decrochage, 0), a.partis - coalesce(b.partis, 0)
     from analytics.regimes_de_rappel a
     left join regimes_avant b on b.boucle = a.boucle
     order by a.boucle $$,
  $$ values ('commute'::text, 3, 1, 1, 1), ('extras', 1, 1, 0, 0) $$,
  'A3 part, A4 décroche, A6 reste actif malgré sa boucle mensuelle muette, A5 est lu sur sa seule boucle'
);

select ok(
  (select bool_and(comptes = actifs + en_decrochage + partis) from analytics.regimes_de_rappel),
  'les trois états somment aux comptes de chaque boucle'
);

-- ── 8. Les départs, en écart au relevé d'avant ──────────────────────────────────────────────────

create temp table departs_ecart on commit drop as
select a.mois,
       a.partis_en_silence - coalesce(b.partis_en_silence, 0) as partis,
       a.sessions_purgees - coalesce(b.sessions_purgees, 0) as purgees,
       a.comptes_supprimes - coalesce(b.comptes_supprimes, 0) as supprimes
from analytics.departs_par_mois a
left join departs_avant b on b.mois = a.mois;

select results_eq(
  $$ select mois, partis from departs_ecart where partis <> 0 $$,
  $$ values (date_trunc('month', current_setting('c37.w')::date + 42)::date, 1) $$,
  'un seul parti de plus, A3, rangé au mois de son dernier signe de vie — le début de sa dernière période répondue'
);

select results_eq(
  $$ select mois, purgees from departs_ecart where purgees <> 0 $$,
  $$ values (date_trunc('month', current_setting('c37.w')::date + 60)::date, 3) $$,
  'les sessions purgées au mois de la purge, comptées par ce qu''elle a supprimé et non par ses candidates'
);

select results_eq(
  $$ select mois, supprimes from departs_ecart where supprimes <> 0 $$,
  $$ values (date_trunc('month', current_setting('c37.w')::date + 100)::date, 2) $$,
  'les comptes supprimés au mois de leur suppression'
);

select * from finish();
rollback;
