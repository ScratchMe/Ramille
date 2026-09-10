-- Tests pgTAP des privilèges de table (chantier C0.3, migration
-- 20260910110000_grants_explicites.sql).
--
-- Les autres fichiers de cette suite éprouvent la RLS : qui voit quelles lignes. Celui-ci
-- éprouve l'étage d'en dessous, celui dont l'absence ne se voyait nulle part — **le privilège
-- de table**. Jusqu'au 10/09/2026 aucune migration n'en accordait : les rôles `anon` et
-- `authenticated` tenaient les leurs du comportement de plateforme d'un projet Supabase neuf, et
-- la stack locale le rejouait par le drapeau `auto_expose_new_tables`. Une base reconstruite
-- depuis les migrations n'accordait donc rien, et rien ne le disait.
--
-- Ce que ce fichier verrouille, et que ni le typecheck ni la RLS ne peuvent voir :
--
--   * un privilège **manquant** — l'app répond « permission denied for table … » avant
--     d'atteindre la RLS, sur un chemin qui marchait la veille en production ;
--   * un privilège **en trop** — une table ajoutée sans ligne dans la migration, ou un `grant`
--     large posé par commodité. Il n'ouvre rien tant qu'aucune policy ne l'accompagne, mais il
--     rend le jour suivant dangereux : ajouter une policy devient alors un geste anodin.
--
-- La première assertion porte la matrice **entière** du schéma, pas trois tables témoins : c'est
-- le seul moyen qu'une table ajoutée plus tard soit obligée de passer par la migration. Si elle
-- tombe avec une ligne en plus, c'est qu'un `grant` vit ailleurs que dans
-- 20260910110000_grants_explicites.sql — l'ajouter au tableau attendu ne suffit pas, il faut
-- l'écrire dans la migration et savoir pourquoi.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- ── 1. La matrice entière ───────────────────────────────────────────────────────────────
-- Les sept privilèges de table qui touchent aux données ou au schéma, pour les deux rôles
-- applicatifs, sur toutes les tables du schéma public. `MAINTAIN` (PostgreSQL 17) est hors liste :
-- il n'ouvre aucune donnée, seulement `vacuum`/`analyze`/`reindex`, et le `revoke all privileges`
-- de la migration le retire de toute façon.
-- Les tables absentes du tableau attendu sont celles qui n'accordent
-- rien à personne : `notification_outbox`, `emission_factor_sync_runs`, `usage_event_types`, et
-- les journaux de cron qui posent leur propre `revoke` (`purge_runs`, `reminder_send_runs`) —
-- une table serveur-only ne figure pas dans ce tableau, elle y figure par son absence.
select bag_eq(
  $$ select r.role::text, c.relname::text, p.privilege::text
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       cross join (values ('anon'::name), ('authenticated'::name)) as r(role)
       cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
                          ('REFERENCES'), ('TRIGGER')) as p(privilege)
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and has_table_privilege(r.role, c.oid, p.privilege) $$,
  $$ values
       -- Référentiels : lecture pour tout le monde, écriture pour personne.
       ('anon', 'transport_modes', 'SELECT'),
       ('anon', 'emission_factors', 'SELECT'),
       ('anon', 'action_templates', 'SELECT'),
       ('anon', 'emission_factor_sources', 'SELECT'),
       ('authenticated', 'transport_modes', 'SELECT'),
       ('authenticated', 'emission_factors', 'SELECT'),
       ('authenticated', 'action_templates', 'SELECT'),
       ('authenticated', 'emission_factor_sources', 'SELECT'),
       -- Tables applicatives : `authenticated` seulement, au plus près des policies.
       ('authenticated', 'profiles', 'SELECT'),
       ('authenticated', 'profiles', 'UPDATE'),
       ('authenticated', 'assessments', 'SELECT'),
       ('authenticated', 'assessments', 'INSERT'),
       ('authenticated', 'assessments', 'UPDATE'),
       ('authenticated', 'assessment_answers', 'SELECT'),
       ('authenticated', 'assessment_answers', 'INSERT'),
       ('authenticated', 'assessment_answers', 'UPDATE'),
       ('authenticated', 'assessment_results', 'SELECT'),
       ('authenticated', 'engagement_checkins', 'SELECT'),
       ('authenticated', 'engagement_checkins', 'UPDATE'),
       ('authenticated', 'plan_cycles', 'SELECT'),
       ('authenticated', 'plan_actions', 'SELECT'),
       ('authenticated', 'feedback', 'SELECT'),
       ('authenticated', 'feedback', 'INSERT'),
       ('authenticated', 'feedback', 'DELETE'),
       ('authenticated', 'push_tokens', 'SELECT'),
       ('authenticated', 'push_tokens', 'DELETE'),
       ('authenticated', 'usage_events', 'INSERT'),
       -- Les cinq privilèges inertes de la §5 de la migration, sur quatre tables : aucune policy
       -- ne les accompagne, ils ne servent qu'à ce que le refus vienne de la RLS, pas du droit.
       -- Ce sont 03_rls_policies, 12_usage_events et 13_engagement_action qui en dépendent.
       ('authenticated', 'assessment_results', 'INSERT'),
       ('authenticated', 'plan_cycles', 'INSERT'),
       ('authenticated', 'plan_actions', 'INSERT'),
       ('authenticated', 'plan_actions', 'UPDATE'),
       ('authenticated', 'usage_events', 'SELECT') $$,
  'les privilèges de table du schéma public sont exactement ceux que la migration écrit'
);

-- ── 2. Une table applicative ────────────────────────────────────────────────────────────
select ok(
  has_table_privilege('authenticated', 'public.assessment_answers', 'select')
    and has_table_privilege('authenticated', 'public.assessment_answers', 'insert'),
  'assessment_answers : lecture et écriture pour authenticated (le questionnaire les insère, le re-bilan les relit)'
);

select ok(
  not has_table_privilege('anon', 'public.assessment_answers', 'select')
    and not has_table_privilege('anon', 'public.assessment_answers', 'insert'),
  'assessment_answers : rien pour anon — la session anonyme du produit porte le rôle authenticated, pas celui-là'
);

-- ── 3. Un référentiel ───────────────────────────────────────────────────────────────────
-- `anon` en a besoin pour de vrai : /status interroge `transport_modes` sans session.
select ok(
  has_table_privilege('anon', 'public.transport_modes', 'select')
    and has_table_privilege('anon', 'public.emission_factors', 'select')
    and has_table_privilege('anon', 'public.action_templates', 'select'),
  'référentiels : lisibles sans session (transport_modes, emission_factors, action_templates)'
);

select ok(
  not has_table_privilege('anon', 'public.transport_modes', 'insert')
    and not has_table_privilege('authenticated', 'public.transport_modes', 'insert')
    and not has_table_privilege('authenticated', 'public.emission_factors', 'insert'),
  'référentiels : personne ne les écrit depuis le client — la synchronisation ADEME est security definer'
);

-- ── 4. Une table serveur-only ───────────────────────────────────────────────────────────
-- La boîte d'envoi porte adresse, sujet et corps des rappels : aucun privilège, pas même la
-- lecture, et le `revoke` de 20260904200000 doit survivre à la migration de grants.
select ok(
  not has_table_privilege('authenticated', 'public.notification_outbox', 'select')
    and not has_table_privilege('authenticated', 'public.notification_outbox', 'insert')
    and not has_table_privilege('authenticated', 'public.notification_outbox', 'update')
    and not has_table_privilege('authenticated', 'public.notification_outbox', 'delete'),
  'notification_outbox : aucun privilège pour authenticated (donnée d''exploitation, serveur seul)'
);

select ok(
  not has_table_privilege('authenticated', 'public.emission_factor_sync_runs', 'select')
    and not has_table_privilege('authenticated', 'public.usage_event_types', 'select'),
  'emission_factor_sync_runs et usage_event_types : illisibles côté client (la clé étrangère de usage_events s''en passe, cf. 12)'
);

-- ── 5. Les révocations que la migration ne doit pas défaire ─────────────────────────────
-- Un `grant` est un accordéon : écrit large, il rouvre ce qu'un `revoke` d'une migration
-- antérieure avait fermé, et rien ne le signale. Les deux cas du schéma, épinglés nommément.
select ok(
  not has_table_privilege('authenticated', 'public.engagement_checkins', 'insert')
    and not has_table_privilege('anon', 'public.engagement_checkins', 'insert'),
  'engagement_checkins : insert toujours révoqué — la génération des points est serveur-only'
);

select ok(
  not has_table_privilege('authenticated', 'public.emission_factor_sources', 'insert')
    and not has_table_privilege('authenticated', 'public.emission_factor_sources', 'update')
    and not has_table_privilege('authenticated', 'public.emission_factor_sources', 'delete'),
  'emission_factor_sources : lecture seule — le mapping vers les slugs Impact CO2 n''est pas écrit par le client'
);

-- ── 6. plan_actions : l'invariant est l'absence de policy, pas l'absence de privilège ───
-- Le privilège UPDATE existe (matrice ci-dessus) et il est inerte : 13_engagement_action
-- vérifie qu'un `update` direct sur `saving_kg_year` reste sans effet, ce qui n'a de sens que
-- si le refus vient de la RLS. Ce qui protège vraiment les chiffres figés, c'est qu'aucune
-- policy d'écriture n'existe : la RLS filtre des lignes, jamais des colonnes, donc une policy
-- UPDATE ouvrirait toutes les colonnes d'un coup. L'engagement passe par `commit_plan_action`.
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public' and tablename = 'plan_actions' and cmd <> 'SELECT'),
  0,
  'plan_actions : aucune policy d''écriture (ni UPDATE, ni INSERT, ni DELETE) — l''engagement passe par un RPC'
);

-- ── 7. Les schémas et la séquence ───────────────────────────────────────────────────────
select ok(
  has_schema_privilege('anon', 'public', 'usage')
    and has_schema_privilege('authenticated', 'public', 'usage')
    and has_sequence_privilege('authenticated', 'public.usage_events_id_seq', 'usage'),
  'schéma public utilisable par les deux rôles, et la séquence de usage_events accessible à authenticated'
);

-- Le schéma analytics porte les vues d'exploitation (segments, entonnoirs) : il n'est pas exposé
-- par PostgREST et ne doit rien accorder. Une vue oubliée là est une vue d'analyse lisible par
-- n'importe quelle clé publiable.
select is(
  (select count(*)::int
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'analytics'
      and c.relkind in ('r', 'p', 'v', 'm')
      and (has_table_privilege('anon', c.oid, 'select')
        or has_table_privilege('authenticated', c.oid, 'select'))),
  0,
  'schéma analytics : aucune table ni vue lisible depuis anon ou authenticated'
);

select * from finish();
rollback;
