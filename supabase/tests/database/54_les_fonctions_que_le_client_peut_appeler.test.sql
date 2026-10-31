-- Les fonctions que le client peut appeler (migration 20261019085520_les_fonctions_naissent_fermees.sql).
--
-- `18_grants_explicites` épingle la matrice entière des tables ; ce fichier fait de même pour les
-- fonctions des schémas que PostgREST expose (`public`, `graphql_public` : `supabase/config.toml`,
-- `[api] schemas`). Une fonction absente de la liste blanche et exécutable par `anon` ou
-- `authenticated` est un `/rest/v1/rpc` ouvert : une fonction `security definer` interne y lit ou
-- y écrit tout, sans session pour `anon`. Les assertions par fonction des autres fichiers ne voient
-- que les fonctions qu'elles nomment ; celle-ci voit aussi celle qu'on n'a pas encore écrite.
--
-- Deux gardes indépendantes, et le fichier les tient séparément :
--   * la liste blanche (§1) : ce qui est exécutable aujourd'hui, et rien de plus ;
--   * le privilège par défaut (§2) : une fonction neuve naît fermée, donc un `revoke` oublié ne
--     l'ouvre plus. La §1 reste la garde de ce que le défaut ne couvre pas — un `grant` écrit de
--     trop, une fonction créée par un autre rôle, une base où le défaut manque (une restauration
--     qui sauterait l'étape qui le repose).
--
-- Ajouter une fonction que le client appelle : son `grant execute` dans sa migration, et sa ligne
-- ici, avec ce qui l'appelle. Les fonctions de trigger sont hors liste : PostgreSQL refuse de les
-- exécuter hors d'un trigger, et leur EXECUTE n'est vérifié qu'à la création du trigger.
--
-- Éprouvé en le cassant le 18/10/2026 (`TESTING.md` §1.1) : chaque mutation insérée dans une copie
-- du fichier juste avant la §1, le fichier entier rejoué sur la stack migrée. Témoin : 5 sur 5.
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | M1 — une fonction `security definer` neuve, sans `revoke` | rien : elle naît fermée, c'est le défaut qui la garde (et la 5 le dit) |
--   | M2 — la même, ouverte par un `grant` à anon et authenticated | 1, 2 |
--   | M3 — la même, ouverte à authenticated seul | 2 |
--   | M4 — le défaut global rendu à PUBLIC (l'état d'avant la migration), puis M1 | 1, 2, 3, 5 |
--   | M5 — le défaut global rendu à PUBLIC, sans fonction neuve | 3, 5 |
--   | M6 — une entrée par schéma qui rend EXECUTE à anon dans `public` | 4, 5 |
--   | M7 — une ligne retirée de la liste blanche | 1, 2 |
--   | M8 — une ligne morte ajoutée à la liste blanche | 1, 2 |
--
-- Une fonction neuve sans `revoke` ne fait tomber la liste blanche que là où le défaut manque (M4) :
-- c'est la garde qui reste quand l'autre est partie. Joué aussi sur la restauration à blanc
-- (`docs/exploitation/sauvegarde.md` §5 ter) : 5 sur 5 ; restauré sans neutraliser les privilèges
-- par défaut de la cible, 1, 2 et 4 tombent.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

-- La liste blanche, écrite une seule fois. `sans_session` : `anon` l'exécute aussi.
create temporary table liste_blanche (fonction text primary key, sans_session boolean not null);
insert into liste_blanche values
  -- Les RPC de l'app (`.rpc(…)` dans `src/`).
  ('public.autoriser_le_rattachement(text)', false),
  ('public.clear_plan_action_commitment(uuid)', false),
  ('public.commit_plan_action(uuid, smallint[], text, boolean)', false),
  ('public.compute_assessment_results(uuid)', false),
  ('public.delete_my_account()', false),
  ('public.export_my_data()', false),
  ('public.fenetre_du_mot_de_la_veille()', false),
  ('public.mes_boucles_a_venir()', false),
  ('public.mettre_a_jour_le_contexte(text, text[], text, text)', false),
  ('public.register_push_token(text, text)', false),
  ('public.repondre_au_checkin(uuid, text)', false),
  ('public.retirer_le_bilan(uuid)', false),
  ('public.unregister_push_token(text)', false),
  -- Le lien de désinscription d'un e-mail de rappel, ouvert sans session (`/rappels/stop`).
  ('public.desinscrire_des_rappels(uuid)', true),
  -- Les liens de réponse du même e-mail, ouverts sans session (`/point`, étape 6b de `v1-35`) : le jeton
  -- est l'autorisation (test `64`).
  ('public.le_point_du_lien(uuid)', true),
  ('public.repondre_par_le_lien(uuid, text)', true),
  -- La page d'accueil du web, qui se compte sans session et sans identifiant (`v1-36` §5, test `65`).
  ('public.compter_sur_l_accueil(text)', true),
  -- Évaluées par un `check` pendant une écriture du client (`usage_events`, les jours d'intention).
  ('public.check_usage_event_props(jsonb)', true),
  ('public.check_intention_days(smallint[])', true),
  -- Le référentiel du calcul, ouvert en lecture comme les tables qu'il lit (`BILAN.md`).
  ('public.emission_factor(text, date)', true),
  ('public.resolve_mode(text, text, text, text, text)', true),
  ('public.resolve_car_mode(text, text)', true),
  ('public.resolve_two_wheeler_mode(text, text)', true),
  ('public.resolve_train_mode(text, text)', true),
  ('public.resolve_velo_mode(text, text)', true),
  -- Des bornes de calendrier, sans `security definer` : rien qu'un appelant ne calcule lui-même.
  ('public.season_bounds(date)', true),
  ('public.rolling_quarter_bounds(date, date)', true),
  -- Posée par la plateforme (`supabase_admin`), qui expose `graphql_public` ; pg_graphql n'est pas
  -- installé, elle ne rend qu'une erreur.
  ('graphql_public.graphql(text, text, jsonb, jsonb)', true);

-- ── 1. Ce qui est exécutable, et rien de plus ───────────────────────────────────────────────────

select bag_eq(
  $$ select n.nspname || '.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'graphql_public')
        and p.prorettype <> 'trigger'::regtype
        and has_function_privilege('anon', p.oid, 'execute') $$,
  $$ select fonction from liste_blanche where sans_session $$,
  'anon n''exécute que les fonctions de la liste blanche'
);

select bag_eq(
  $$ select n.nspname || '.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'graphql_public')
        and p.prorettype <> 'trigger'::regtype
        and has_function_privilege('authenticated', p.oid, 'execute') $$,
  $$ select fonction from liste_blanche $$,
  'authenticated n''exécute que les fonctions de la liste blanche'
);

-- ── 2. Le privilège par défaut : une fonction neuve naît fermée ────────────────────────────────

-- Le défaut global de `postgres` ne garde que le propriétaire : PUBLIC n'y est plus.
select is(
  (select defaclacl::text from pg_default_acl
    where defaclrole = 'postgres'::regrole and defaclnamespace = 0 and defaclobjtype = 'f'),
  '{postgres=X/postgres}',
  'le défaut global des fonctions de postgres retire EXECUTE à PUBLIC'
);

-- Et aucune entrée de `postgres`, globale ou dans un schéma où le dépôt crée ou que l'API expose,
-- ne rend quoi que ce soit à PUBLIC, `anon` ou `authenticated`. Une entrée par schéma s'ajoute au
-- défaut global, elle le rouvrirait.
select is_empty(
  $$ select d.defaclnamespace::regnamespace::text, d.defaclobjtype::text, a.grantee::regrole::text
       from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
      where d.defaclrole = 'postgres'::regrole
        and (d.defaclnamespace = 0
             or d.defaclnamespace::regnamespace::text in ('public', 'graphql_public', 'analytics'))
        and a.grantee in (0, 'anon'::regrole, 'authenticated'::regrole) $$,
  'aucun privilège par défaut de postgres ne nomme PUBLIC, anon ni authenticated'
);

-- L'effet, et non seulement le catalogue : la fonction qu'une migration de demain écrirait sans
-- son `revoke`.
create function public.fonction_de_demain() returns int
  language sql security definer set search_path = '' as 'select 1';

select ok(
  not has_function_privilege('anon', 'public.fonction_de_demain()', 'execute')
    and not has_function_privilege('authenticated', 'public.fonction_de_demain()', 'execute'),
  'une fonction security definer neuve, sans revoke, n''est exécutable ni par anon ni par authenticated'
);

select * from finish();
rollback;
