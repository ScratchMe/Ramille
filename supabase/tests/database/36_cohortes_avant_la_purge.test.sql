-- Tests pgTAP des cohortes gardées avant la purge, et du compte des suppressions de compte —
-- lot 6, migration `20260927230611_les_cohortes_avant_la_purge.sql` (décision du 27/09/2026).
--
-- Ce que ce fichier défend : **la purge laisse derrière elle des compteurs justes, et rien qui
-- puisse désigner quelqu'un.** Les deux moitiés comptent autant. Des compteurs faux feraient
-- tirer au lot 6 des conclusions sur le churn à partir de rien ; une colonne qui porterait un
-- identifiant garderait la trace de personnes que la page de confidentialité promet d'effacer.
--
-- ## Quatre choses à savoir avant de « corriger » un test de ce fichier
--
-- **1. Les assertions de compteurs sont bornées à UNE semaine d'arrivée, et c'est la seule borne
-- possible.** Une table d'agrégats n'a pas d'identifiant à filtrer (c'est tout son objet) : les
-- sessions fabriquées ici naissent il y a 3 000 jours, une semaine où aucune session réelle ne peut
-- exister, ni sur la stack locale ni sur le distant. Rapprocher cette date ferait mêler les
-- compteurs du fichier à ceux de vraies purges.
--
-- **2. `occurred_at` et `submitted_at` sont posés par le serveur** (`stamp_usage_event_time`,
-- `stamp_assessment_submitted_at`) : une fixture ne peut pas les choisir à l'insert. Elle insère,
-- puis recule la date par un `update` — ce qu'aucun trigger n'interdit au propriétaire (TESTING.md
-- §1.7, « une fixture ne peut pas écrire un état que la production ne peut pas produire » : une
-- session muette depuis huit ans en est un que la production produit, par le simple passage du
-- temps).
--
-- **3. Le signe de vie d'une réponse est le DÉBUT de la période interrogée**, pas `responded_at` :
-- c'est la définition de `regime_de_rappel`, reprise telle quelle. Les points répondus sont donc
-- datés par leur `period_start`, qui tombe à minuit UTC — d'où des écarts choisis à un jour près
-- (36 et 100 jours), pour que la fraction de journée de `created_at` ne fasse pas changer de
-- tranche.
--
-- **4. La section 1 est une garde de structure, pas de comportement.** `dernier_signe_de_vie` est
-- l'extraction de l'expression que `regime_de_rappel` écrivait en ligne. Le régime ne l'appelait pas
-- à la livraison du lot 6 (un chantier parallèle touchait au plafond des rappels) ; **il l'appelle
-- depuis C4.2** (`20260928075453_le_mot_de_la_veille.sql`, section 13). L'assertion acceptait les
-- deux formes tant que la factorisation n'était pas faite ; elle n'accepte plus que l'appel, et elle
-- exige que `v_depuis` ne soit écrit qu'**une** fois, par cet appel (contre-lecture de C4.2,
-- 28/09/2026). Sans cette seconde condition, elle ne gardait qu'une inclusion : une ligne ajoutée
-- après l'appel, qui retoucherait la date, serait passée sans bruit — et c'est ce que ce paragraphe
-- affirmait fermé alors que ça ne l'était pas. Ce qu'elle ne voit toujours pas : un régime qui
-- ignorerait `v_depuis` et compterait autrement.
--
-- **Éprouvé en le cassant, le 27/09/2026** (TESTING.md §1.1). Chaque mutation a été posée juste
-- après le `begin` de **chaque** fichier de la suite — donc annulée avec lui, la stack n'en gardant
-- rien —, et le compte dit ce qu'elle a fait tomber sur la suite entière. Les numéros sont ceux
-- des assertions de ce fichier.
--
--   - **témoin : `regime_de_rappel` factorisé** pour appeler `dernier_signe_de_vie` → 0, dans
--     aucun fichier. La factorisation laissée à l'intégration est neutre, et l'assertion 3
--     l'accepte déjà ;
--   - `regime_de_rappel` réécrit seul, sans `app_open`        → 2 : ici la 3 (la structure), dans
--     `22` celle de l'`app_open` qui remet le compteur à zéro. **Seule la 3 garde que les deux
--     textes ne divergent pas** : aucune assertion de comportement de ce fichier ne tombe ;
--   - `dernier_signe_de_vie` sans `app_open`                   → 4 : la 3, et les trois lectures des
--     compteurs (15, 16, 17), U2, U3 et U4 retombant à « 0 » ;
--   - la borne 8 des tranches déplacée à 9                     → 4 : la 1 et les trois lectures
--     (U4 tient exactement huit semaines) ;
--   - l'engagement testé avant la réponse (U6)                 → 3 : 15, 16, 17 ;
--   - le plus long préfixe au lieu de la plus loin (U5, U8)    → 3 : 15, 16, 17 ;
--   - l'archive oubliée (U3) / `plan_actions` oubliée (U4)     → 3 chacune : 15, 16, 17 ;
--   - un brouillon compté comme bilan (U7)                     → 2 : 16, 17 — la 15 est lue avant
--     que U7 n'existe ;
--   - le moins avancé des deux régimes (U4, U5, U6)            → 3 : 15, 16, 17 ;
--   - le régime de la seule boucle hebdomadaire (U4)           → 3 : 15, 16, 17 ;
--   - le signe de vie de la seule boucle hebdomadaire (U8)     → 3 : 15, 16, 17 ;
--   - la purge qui compte APRÈS son `delete`                   → 4 : 15, 16, 17 et 18 — rien n'est
--     compté, la cascade ayant tout emporté ;
--   - la purge qui compte AVANT sa garde de volume             → 1 : la 18 ;
--   - le prédicat de la purge sans `is_anonymous`              → 5 : 14 à 18 — le compte rattaché
--     part, et il est compté ;
--   - `delete_my_account` qui compte sans condition            → 1 : la 20 ;
--   - `delete_my_account` qui ne compte plus                   → 2 : 19 et 20 ;
--   - une colonne `uuid` ajoutée                               → 1 : la 6 ;
--   - une colonne texte libre ajoutée                          → 1 : la 7 ;
--   - une clé étrangère vers `profiles`                        → 3 : 5 et 6, et dans `15` la garde
--     des index de clés en cascade ;
--   - `select` accordé à `authenticated` sur les compteurs     → 2 : la 11, et la matrice de `18` ;
--   - `select` accordé à `anon` sur la vue                     → 2 : la 11, et la garde du schéma
--     `analytics` de `18` ;
--   - `cohorte_de` rendue exécutable à `public`                → 1 : la 12 ;
--   - la RLS retirée                                           → 1 : la 4 ;
--   - le `check` du lundi retiré                               → 1 : la 9 ;
--   - la semaine d'arrivée devenue un jour                     → 4 : 15 à 18. Le `check` du lundi
--     refuse le compteur ; la purge **levait** alors et emportait la transaction, dans `16` comme
--     ici. **Rejouée le soir même, après la sous-transaction de la section 8** : le compte échoue
--     seul, les sessions partent quand même, `16` reste vert, et ce sont les quatre lectures de
--     compteurs qui tombent — le prix d'une cohorte perdue, là où l'ancien comportement suspendait
--     une suppression promise ;
--   - une troisième boucle ajoutée au `check`                  → 1 : la 2.
--
-- **Et deux le 28/09/2026, pour l'assertion 3 resserrée** (contre-lecture de C4.2), par la méthode
-- canonique — la section 13 de `20260928075453` mutée sur le disque, puis `rejouer-la-ci base` :
--
--   - `v_depuis` retouché après l'appel                        → 1 : la 3, seule sur les 766 de la suite ;
--   - le régime revenu à l'expression recopiée en ligne        → 1 : la 3, seule — la copie en ligne n'est plus acceptée.
--
-- **Et trois de plus le même soir, pour la section 8** — plus celle de la semaine d'arrivée, rejouée
-- et réécrite ci-dessus —, par la méthode canonique cette fois : la migration mutée sur le disque,
-- puis `rejouer-la-ci base` sur toute la suite :
--
--   - la purge qui relève l'échec de son compteur (`raise;`)   → 2 : 22 et 23 ;
--   - `delete_my_account` qui relève l'échec du sien           → 2 : 24 et 25 ;
--   - `silence` retiré du `check` de `rappels_au_depart`       → 5 : la 21, et les quatre lectures
--     de compteurs (15 à 18) — U6 part en `silence`, son compte échoue, et depuis la sous-transaction
--     c'est **toute** la cohorte du passage qui manque, pas la suppression ;
begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

-- ── 1. Les pièces : tranches, boucles, signe de vie ─────────────────────────────────────────────

-- Les bornes sont les seuils que le produit s'est déjà donnés : 4 points font s'espacer les
-- rappels, 8 les font taire, 13 semaines font une saison.
select is(
  (select array_agg(public.tranche_de_semaines_tenues(n) order by n) from generate_series(0, 14) as g(n)),
  array['0', '1', '2-3', '2-3', '4-7', '4-7', '4-7', '4-7', '8-12', '8-12', '8-12', '8-12', '8-12', '13+', '13+'],
  'les semaines tenues se rangent en six tranches bornées sur les seuils du produit : 1, 2, 4, 8 et 13'
);

-- `cohorte_de` nomme les deux boucles une à une. Une troisième boucle ferait tomber cette
-- assertion — c'est-à-dire qu'elle viendrait ici avant d'être ignorée en silence par le signe de
-- vie et par l'état des rappels.
select is(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'engagement_checkins_loop_type_check'),
  'CHECK ((loop_type = ANY (ARRAY[''commute''::text, ''extras''::text])))',
  'il n''existe que deux boucles, celles que cohorte_de interroge'
);

select ok(
  (
    with corps as (
      select
        regexp_replace(regexp_replace(r.prosrc, '--[^' || chr(10) || ']*', '', 'g'), '\s', '', 'g') as regime,
        rtrim(regexp_replace(regexp_replace(d.prosrc, '--[^' || chr(10) || ']*', '', 'g'), '\s', '', 'g'), ';') as signe
      from pg_proc r, pg_proc d
      where r.oid = 'public.regime_de_rappel(uuid, text)'::regprocedure
        and d.oid = 'public.dernier_signe_de_vie(uuid, text)'::regprocedure
    )
    select position('v_depuis:=public.dernier_signe_de_vie(p_user_id,p_loop_type);' in regime) > 0
       and (length(regime) - length(replace(regime, 'v_depuis:=', ''))) = length('v_depuis:=')
       and position('intov_depuis' in regime) = 0
       and length(signe) > 100 and position(signe in regime) = 0
    from corps
  ),
  'un seul signe de vie : regime_de_rappel le lit de dernier_signe_de_vie, n''écrit v_depuis nulle part ailleurs, et n''en porte plus de copie'
);

-- ── 2. Rien qui désigne quelqu'un ───────────────────────────────────────────────────────────────

select ok(
  (select bool_and(c.relrowsecurity) from pg_class c
    where c.oid in ('public.purges_par_cohorte'::regclass, 'public.suppressions_de_compte_par_mois'::regclass))
  and not exists (select 1 from pg_policies
                   where schemaname = 'public'
                     and tablename in ('purges_par_cohorte', 'suppressions_de_compte_par_mois')),
  'les deux tables de compteurs portent la RLS, et aucune policy : aucune ligne n''appartient à personne'
);

-- La condition pour survivre à la cascade, et la preuve qu'aucune ligne ne peut être rattachée à
-- un compte : aucune clé étrangère, vers quoi que ce soit.
select is_empty(
  $$ select conname from pg_constraint
     where contype = 'f'
       and conrelid in ('public.purges_par_cohorte'::regclass, 'public.suppressions_de_compte_par_mois'::regclass) $$,
  'aucune clé étrangère : les compteurs ne suivent pas la cascade, et ne désignent aucun compte'
);

-- **Une liste de types admis, pas une liste de types interdits** : `uuid` et `timestamptz` sont les
-- deux évidents, mais un `text` libre porterait une adresse, un `jsonb` n'importe quoi, un
-- `timestamp` sans fuseau la seconde près. Des dates, des compteurs, des valeurs énumérées.
select is_empty(
  $$ select table_name, column_name, data_type from information_schema.columns
     where table_schema = 'public'
       and table_name in ('purges_par_cohorte', 'suppressions_de_compte_par_mois')
       and data_type not in ('date', 'integer', 'text') $$,
  'aucune colonne uuid, horodatage, json ni adresse : des dates, des compteurs et des valeurs énumérées'
);

select is_empty(
  $$ select c.table_name, c.column_name from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name in ('purges_par_cohorte', 'suppressions_de_compte_par_mois')
       and c.data_type = 'text'
       and not exists (
         select 1 from pg_constraint k
         join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any(k.conkey)
         where k.conrelid = ('public.' || c.table_name)::regclass
           and k.contype = 'c'
           and a.attname = c.column_name
           and pg_get_constraintdef(k.oid) like '%= ANY (ARRAY[%'
       ) $$,
  'toute colonne texte est une liste fermée de valeurs : aucun texte libre où glisser une adresse'
);

select is_empty(
  $$ select column_name, data_type from information_schema.columns
     where table_schema = 'analytics' and table_name = 'cohortes_purgees'
       and data_type not in ('date', 'integer') $$,
  'la vue ne rend que des semaines et des compteurs'
);

-- Les dates sont des lundis et des premiers du mois : jamais un jour qui, croisé avec une
-- sauvegarde, désignerait la personne arrivée ou partie ce jour-là.
select throws_ok(
  $$ insert into public.purges_par_cohorte (semaine_d_arrivee, etape, semaines_tenues, rappels_au_depart, comptes)
     values ('2026-09-01', 'a_ouvert', '0', 'normal', 1) $$,
  '23514',
  'new row for relation "purges_par_cohorte" violates check constraint "purges_par_cohorte_semaine_est_un_lundi"',
  'une semaine d''arrivée est un lundi, jamais un jour'
);

select throws_ok(
  $$ insert into public.suppressions_de_compte_par_mois (mois, suppressions) values ('2026-09-15', 1) $$,
  '23514',
  'new row for relation "suppressions_de_compte_par_mois" violates check constraint "suppressions_de_compte_par_mois_premier_du_mois"',
  'un mois de suppression est un premier du mois, jamais un jour'
);

select ok(
  not exists (
    select 1
    from (values ('public.purges_par_cohorte'), ('public.suppressions_de_compte_par_mois'),
                 ('analytics.cohortes_purgees')) as t(nom)
    cross join (values ('anon'), ('authenticated')) as r(role)
    cross join (values ('select'), ('insert'), ('update'), ('delete'), ('truncate'),
                       ('references'), ('trigger')) as p(privilege)
    where has_table_privilege(r.role, t.nom, p.privilege)
  ),
  'ni anon ni authenticated ne lisent ni n''écrivent les compteurs, ni la vue'
);

select ok(
  not exists (
    select 1
    from (values ('public.cohorte_de(uuid)'), ('public.dernier_signe_de_vie(uuid, text)'),
                 ('public.tranche_de_semaines_tenues(integer)')) as f(signature)
    cross join (values ('anon'), ('authenticated')) as r(role)
    where has_function_privilege(r.role, f.signature, 'execute')
  ),
  'les fonctions des cohortes ne sont appelables que par le serveur — cohorte_de lit auth.users'
);

-- ── 3. Sept sessions anonymes à six stades, et un compte rattaché ───────────────────────────────
--
-- Toutes nées il y a 3 000 jours (T0), dans la même semaine W. Tout ce qu'elles ont fait date
-- d'au plus T0 + 160 jours : elles sont toutes muettes depuis plus de 90 jours.
--
--   U1  n'a rien fait                                       → a_ouvert,          0,    normal
--   U2  bilan soumis ; ouverte à T0 + 10 j                  → a_soumis_un_bilan, 1,    normal
--   U3  bilan ; engagement archivé ; ouverte à T0 + 20 j    → s_est_engagee,     2-3,  normal
--   U4  bilan ; action engagée ; ouverte à T0 + 60 j ;
--       4 points mensuels clos ensuite                      → s_est_engagee,     8-12, espace
--   U5  bilan ; un point répondu SANS engagement (période
--       T0 + 36 j) ; 4 points hebdomadaires clos ensuite    → a_repondu,         4-7,  espace
--   U6  bilan ; engagement archivé ET un point répondu
--       (période T0 + 100 j) ; 8 points clos ensuite        → a_repondu,         13+,  silence
--   U8  bilan ; un point MENSUEL répondu « sans objet »
--       (période T0 + 29 j), jamais ouverte depuis          → a_repondu,         4-7,  normal
--   R   rattaché (non anonyme), n'a rien fait               → jamais purgé, jamais compté
--
-- U5 est ce qui éprouve l'ordre : les étapes ne sont pas emboîtées, et la plus loin gagne. U4
-- éprouve la réduction des deux boucles au plus avancé : son silence relatif est sur la boucle
-- mensuelle, la boucle hebdomadaire n'ayant aucun point. U8 éprouve que le signe de vie se lit sur
-- les DEUX boucles : son seul signe est une réponse mensuelle, qu'une lecture de la seule boucle
-- hebdomadaire rangerait en « 0 semaine ». Et sa réponse est « sans objet » : c'est une réponse, donc
-- une étape atteinte (`status = 'answered'`, jamais `response is not null`).

select set_config('c36.w', date_trunc('week', (now() - interval '3000 days') at time zone 'UTC')::date::text, true);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, is_anonymous, created_at, updated_at) values
  ('c3600000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, null, true, now() - interval '3000 days', now()),
  ('c3600000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, null, true, now() - interval '3000 days', now()),
  ('c3600000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, null, true, now() - interval '3000 days', now()),
  ('c3600000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, null, true, now() - interval '3000 days', now()),
  ('c3600000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, null, true, now() - interval '3000 days', now()),
  ('c3600000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, null, true, now() - interval '3000 days', now()),
  ('c3600000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, null, true, now() - interval '3000 days', now()),
  ('c3600000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c36-rattache@test.local', 'x', false, now() - interval '3000 days', now());

-- Un bilan soumis pour U2 à U6 et U8, deux jours après l'arrivée. `submitted_at` est posé par le
-- serveur à l'insert, puis reculé : la purge le lit comme un signe d'activité.
insert into public.assessments (user_id, status, created_at)
select ('c3600000-0000-0000-0000-00000000000' || i)::uuid, 'completed', now() - interval '2998 days'
from generate_series(2, 8) as g(i)
where i <> 7;

update public.assessments
set submitted_at = created_at
where user_id::text like 'c3600000-0000-0000-0000-00000000000%';

-- Les ouvertures de U2, U3 et U4 : insérées, puis reculées.
insert into public.usage_events (user_id, name, platform) values
  ('c3600000-0000-0000-0000-000000000002', 'app_open', 'android'),
  ('c3600000-0000-0000-0000-000000000003', 'app_open', 'android'),
  ('c3600000-0000-0000-0000-000000000004', 'app_open', 'android');

update public.usage_events set occurred_at = now() - interval '2990 days'
where user_id = 'c3600000-0000-0000-0000-000000000002';
update public.usage_events set occurred_at = now() - interval '2980 days'
where user_id = 'c3600000-0000-0000-0000-000000000003';
update public.usage_events set occurred_at = now() - interval '2940 days'
where user_id = 'c3600000-0000-0000-0000-000000000004';

-- U3 et U6 : un engagement relâché, donc seulement dans l'archive.
insert into public.plan_action_commitments_archive (user_id, action_template_id, action_text, committed_at, released_reason)
select u.id, t.id, t.action_text, now() - interval '2995 days', 'changement'
from (values ('c3600000-0000-0000-0000-000000000003'::uuid), ('c3600000-0000-0000-0000-000000000006'::uuid)) as u(id)
cross join lateral (select id, action_text from public.action_templates order by action_text limit 1) t;

-- U4 : une action engagée, sur son plan — l'autre moitié de « s'est engagée ».
insert into public.plan_cycles (user_id, cadence_type, period_label, period_start, period_end, trip_label, target_reduction_pct)
values ('c3600000-0000-0000-0000-000000000004', 'season', 'Saison de test',
        (now() - interval '2997 days')::date, (now() - interval '2907 days')::date,
        'Voyages longue distance (Avion)', 20);

insert into public.plan_actions (plan_cycle_id, action_template_id, saving_kg_year, rank, committed_at, intention_timing)
select pc.id, t.id, 900, 1, now() - interval '2996 days', 'prochaine_occasion'
from public.plan_cycles pc
cross join lateral (select id from public.action_templates where poste = 'travel' order by action_text limit 1) t
where pc.user_id = 'c3600000-0000-0000-0000-000000000004';

-- U4 : quatre points mensuels clos après sa dernière ouverture — la boucle mensuelle s'espace.
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select 'c3600000-0000-0000-0000-000000000004', 'extras', (now() - interval '3000 days')::date + k,
       'Mois', 'Voyages longue distance', 'travel', 'expired'
from generate_series(70, 160, 30) as g(k);

-- U5 : un point hebdomadaire répondu sans s'être jamais engagé (le point générique, C2.1), puis
-- quatre points clos — la boucle hebdomadaire s'espace.
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste,
                                        status, response_kind, response, responded_at)
values ('c3600000-0000-0000-0000-000000000005', 'commute', (now() - interval '3000 days')::date + 36,
        'Semaine', 'Trajet domicile-travail', 'commute', 'answered', 'non', false, now() - interval '2963 days');

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select 'c3600000-0000-0000-0000-000000000005', 'commute', (now() - interval '3000 days')::date + k,
       'Semaine', 'Trajet domicile-travail', 'commute', 'expired'
from generate_series(43, 64, 7) as g(k);

-- U6 : un point répondu à T0 + 100 jours, puis huit points clos — la boucle hebdomadaire se tait.
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste,
                                        status, response_kind, response, responded_at)
values ('c3600000-0000-0000-0000-000000000006', 'commute', (now() - interval '3000 days')::date + 100,
        'Semaine', 'Trajet domicile-travail', 'commute', 'answered', 'oui', true, now() - interval '2899 days');

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select 'c3600000-0000-0000-0000-000000000006', 'commute', (now() - interval '3000 days')::date + k,
       'Semaine', 'Trajet domicile-travail', 'commute', 'expired'
from generate_series(107, 156, 7) as g(k);

-- U8 : une réponse « sans objet » sur la boucle mensuelle, et rien d'autre.
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste,
                                        status, response_kind, response, responded_at)
values ('c3600000-0000-0000-0000-000000000008', 'extras', (now() - interval '3000 days')::date + 29,
        'Mois', 'Voyages longue distance', 'travel', 'answered', 'sans_objet', null, now() - interval '2970 days');

select public.purge_stale_anonymous_accounts();

-- ── 4. Ce que le premier passage laisse ─────────────────────────────────────────────────────────

select is_empty(
  $$ select id from auth.users where id::text like 'c3600000-0000-0000-0000-00000000000%'
     union all
     select id from public.profiles where id::text like 'c3600000-0000-0000-0000-00000000000%' $$,
  'les sept sessions anonymes muettes sont supprimées, profils compris'
);

select isnt_empty(
  $$ select 1 from auth.users where id = 'c3600000-0000-0000-0000-0000000000a1' $$,
  'le compte rattaché, aussi muet qu''elles, n''est pas purgé'
);

-- Les compteurs exacts, lus APRÈS la cascade : c'est ce qui prouve qu'ils y survivent. Le compte
-- rattaché, s'il était compté, doublerait la première ligne — c'est la même combinaison que U1.
select bag_eq(
  $$ select etape, semaines_tenues, rappels_au_depart, comptes
     from public.purges_par_cohorte
     where semaine_d_arrivee = current_setting('c36.w')::date $$,
  $$ values ('a_ouvert',          '0',    'normal',  1),
            ('a_soumis_un_bilan', '1',    'normal',  1),
            ('s_est_engagee',     '2-3',  'normal',  1),
            ('s_est_engagee',     '8-12', 'espace',  1),
            ('a_repondu',         '4-7',  'espace',  1),
            ('a_repondu',         '13+',  'silence', 1),
            ('a_repondu',         '4-7',  'normal',  1) $$,
  'chaque session purgée est comptée une fois, sous sa semaine d''arrivée, son étape, ses semaines tenues et ses rappels — et le compte rattaché ne l''est pas'
);

-- ── 5. Un second passage s'ajoute au premier ────────────────────────────────────────────────────
--
-- U7 a le profil de U1 à un détail près : un questionnaire commencé, jamais soumis. Il reste donc
-- à l'étape « a ouvert » — un brouillon n'est pas un bilan —, et son compteur s'ajoute à celui de
-- U1 au lieu d'en ouvrir un second.

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) values
  ('c3600000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '3000 days', now());

insert into public.assessments (user_id, status, created_at)
values ('c3600000-0000-0000-0000-000000000007', 'in_progress', now() - interval '2999 days');

select public.purge_stale_anonymous_accounts();

select bag_eq(
  $$ select etape, semaines_tenues, rappels_au_depart, comptes
     from public.purges_par_cohorte
     where semaine_d_arrivee = current_setting('c36.w')::date $$,
  $$ values ('a_ouvert',          '0',    'normal',  2),
            ('a_soumis_un_bilan', '1',    'normal',  1),
            ('s_est_engagee',     '2-3',  'normal',  1),
            ('s_est_engagee',     '8-12', 'espace',  1),
            ('a_repondu',         '4-7',  'espace',  1),
            ('a_repondu',         '13+',  'silence', 1),
            ('a_repondu',         '4-7',  'normal',  1) $$,
  'deux passages s''additionnent, et un questionnaire jamais soumis reste à l''étape « a ouvert »'
);

-- La vue déplie chaque dimension en colonnes ; chaque famille somme à comptes_purges (8).
select results_eq(
  $$ select comptes_purges,
            etape_a_ouvert, etape_a_soumis_un_bilan, etape_s_est_engagee, etape_a_repondu,
            tenu_0_semaine, tenu_1_semaine, tenu_2_a_3_semaines, tenu_4_a_7_semaines,
            tenu_8_a_12_semaines, tenu_13_semaines_et_plus,
            rappels_normal, rappels_espace, rappels_silence
     from analytics.cohortes_purgees
     where semaine_d_arrivee = current_setting('c36.w')::date $$,
  $$ values (8, 2, 1, 2, 3, 2, 1, 1, 2, 1, 1, 5, 2, 1) $$,
  'la vue rend, pour la semaine d''arrivée, la répartition des étapes, des semaines tenues et des rappels'
);

-- ── 6. Un passage bloqué ne compte rien ─────────────────────────────────────────────────────────
--
-- Soixante sessions de plus, nées la même semaine et muettes : au-delà du seuil de la garde de
-- volume (plancher 50). Le passage ne supprime rien — il ne doit donc rien compter, sans quoi
-- chaque nuit de blocage recompterait les mêmes personnes.

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select ('c3600000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true,
       now() - interval '3000 days', now()
from generate_series(1, 60) as g(i);

select public.purge_stale_anonymous_accounts();

select ok(
  (select sum(comptes) from public.purges_par_cohorte where semaine_d_arrivee = current_setting('c36.w')::date) = 8
  and (select count(*) from auth.users where id::text like 'c3600000-0000-0000-0001-%') = 60,
  'un passage retenu par la garde de volume ne supprime rien et ne compte rien'
);

-- ── 7. La suppression de compte compte son mois ─────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, is_anonymous, created_at, updated_at) values
  ('c3600000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c36-suppression@test.local', 'x', false, now(), now());

select set_config('c36.avant', coalesce(
  (select suppressions from public.suppressions_de_compte_par_mois
    where mois = date_trunc('month', now() at time zone 'UTC')::date), 0)::text, true);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', 'c3600000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select public.delete_my_account();
select set_config('role', 'postgres', true);

select is(
  (select suppressions from public.suppressions_de_compte_par_mois
    where mois = date_trunc('month', now() at time zone 'UTC')::date),
  current_setting('c36.avant')::integer + 1,
  'une suppression de compte ajoute un au compteur de son mois, et le compteur survit à la cascade'
);

-- Le jeton reste valable une heure après la suppression : un second appel (une réponse perdue,
-- un nouvel essai) ne supprime rien, et ne doit rien compter.
select set_config('role', 'authenticated', true);
select public.delete_my_account();
select set_config('role', 'postgres', true);

select is(
  (select suppressions from public.suppressions_de_compte_par_mois
    where mois = date_trunc('month', now() at time zone 'UTC')::date),
  current_setting('c36.avant')::integer + 1,
  'un second appel qui ne supprime rien ne compte rien'
);

-- ── 8. Un compteur qui échoue n'empêche jamais une suppression (contre-lecture du 27/09/2026) ──
--
-- En fin de fichier pour ne pas décaler les numéros que la table des mutations cite : 21 à 25.
--
-- La première version annulait la purge entière quand le compte échouait, et la même liste de
-- candidats le refaisait échouer chaque nuit : une suppression promise, suspendue pour toujours et
-- sans alerte. Le déclencheur le plus probable est ce que la 21 garde — une valeur de
-- `regime_de_rappel` que le `check` de `rappels_au_depart` ignorerait. Les 22 à 25 fabriquent
-- l'échec (une contrainte `not valid` qui refuse toute nouvelle valeur, posée dans la transaction
-- du test, donc annulée avec lui) et regardent la suppression passer quand même.

select set_config('role', 'postgres', true);

-- Les littéraux que `regime_de_rappel` peut rendre, lus dans son corps installé, contre ceux du
-- `check`. Une inclusion et non une égalité : le `check` peut en admettre plus que le régime n'en
-- rend aujourd'hui, jamais moins.
select ok(
  (
    with rendus as (
      select (regexp_matches(regexp_replace(prosrc, '--[^' || chr(10) || ']*', '', 'g'),
                             'return\s+''([a-z_]+)''', 'g'))[1] as valeur
      from pg_proc where oid = 'public.regime_de_rappel(uuid, text)'::regprocedure
    ),
    admis as (
      select (regexp_matches(pg_get_constraintdef(oid), '''([a-z_]+)''', 'g'))[1] as valeur
      from pg_constraint where conname = 'purges_par_cohorte_rappels_au_depart_check'
    )
    select (select count(*) from rendus) >= 3
       and not exists (select valeur from rendus except select valeur from admis)
  ),
  'toute valeur que rend regime_de_rappel est admise par le check de rappels_au_depart'
);

-- La garde de volume a retenu les soixante de la section 6 : on les retire, pour que le passage
-- suivant ait un seul candidat.
delete from auth.users where id::text like 'c3600000-0000-0000-0001-%';

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) values
  ('c3600000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '3000 days', now());

alter table public.purges_par_cohorte
  add constraint c36_compteur_en_echec check (comptes < 0) not valid;

select lives_ok(
  $$ select public.purge_stale_anonymous_accounts() $$,
  'la purge ne lève pas quand son compteur échoue'
);

select ok(
  not exists (select 1 from auth.users where id = 'c3600000-0000-0000-0000-000000000009')
  and exists (select 1 from public.purge_runs
              where status = 'applied'
                and detail like 'Compteur des cohortes en échec, suppression faite quand même :%'),
  'la session est supprimée malgré le compteur en échec, et le journal de la purge le dit'
);

alter table public.suppressions_de_compte_par_mois
  add constraint c36_compteur_en_echec check (suppressions < 0) not valid;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, is_anonymous, created_at, updated_at) values
  ('c3600000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c36-suppression-2@test.local', 'x', false, now(), now());

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', 'c3600000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select lives_ok(
  $$ select public.delete_my_account() $$,
  'la suppression de compte ne lève pas quand son compteur du mois échoue'
);
select set_config('role', 'postgres', true);

select ok(
  not exists (select 1 from auth.users where id = 'c3600000-0000-0000-0000-0000000000d2'),
  'le compte est supprimé malgré le compteur du mois en échec : le chemin que Play exige ne dépend pas d''une mesure'
);

select * from finish();
rollback;
