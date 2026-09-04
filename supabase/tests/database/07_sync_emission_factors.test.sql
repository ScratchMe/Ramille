-- Tests pgTAP de la synchronisation automatique des facteurs ADEME
-- (docs/architecture/v1-07-audit-facteurs-et-suivi.md §1.3, issue #27, migration
-- 20260904160000_sync_emission_factors.sql).
--
-- Ce que ces tests couvrent : le contrat *local* de la synchronisation — complétude du
-- mapping, verrouillage des accès, présence de la planification.
--
-- Ce qu'ils ne couvrent PAS, délibérément : l'appel réseau à impactco2.fr. Faire dépendre
-- la CI d'une API tierce la rendrait rouge pour des raisons étrangères au code, et un test
-- qui échoue pour de mauvaises raisons finit par être ignoré. Le comportement réseau a été
-- validé en exécution réelle contre l'API sur le projet distant, sur les quatre chemins :
--   success  — 13 modes relevés, 0 écart avec les valeurs en place (auto-vérification du
--              mapping et de la règle des distances de référence)
--   partial  — un facteur dans la bande tolérée est versionné, un facteur hors bande est
--              signalé et NON appliqué
--   error    — une exception en cours d'écriture est enregistrée dans le journal, sans
--              écriture partielle laissée derrière elle
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- ── Complétude du mapping ───────────────────────────────────────────────────────────────
-- Le vrai risque de régression : ajouter un mode au produit sans lui donner de source, ce
-- qui le laisserait silencieusement figé à sa valeur de seed pendant que tous les autres
-- se mettent à jour. Exactement le défaut que cet increment corrige, en plus discret.

select is_empty(
  $$ select id from public.transport_modes
     where id not in (select transport_mode_id from public.emission_factor_sources) $$,
  'Tout mode du référentiel a une source de synchronisation — un mode ajouté sans mapping resterait figé sans que rien ne le signale'
);

select is_empty(
  $$ select transport_mode_id from public.emission_factor_sources
     where transport_mode_id not in (select id from public.transport_modes) $$,
  'Aucune source orpheline'
);

select is_empty(
  $$ select transport_mode_id from public.emission_factor_sources s
     where not exists (select 1 from public.emission_factors f where f.transport_mode_id = s.transport_mode_id) $$,
  'Tout mode mappé a au moins une valeur en base — la synchronisation compare toujours à un existant'
);

-- ── La règle des distances de référence (v1-07 §1.1) ───────────────────────────────────
-- Le mode avion est le seul dont la valeur renvoyée par l'API dépend du km demandé. Le
-- relevé doit se faire aux distances que le calcul utilise réellement, sinon on réintroduit
-- exactement le bug corrigé à l'étape 1.

select results_eq(
  $$ select transport_mode_id, reference_km from public.emission_factor_sources
     where reference_km <> 100 order by transport_mode_id $$,
  $$ values ('avion_court_moyen_courrier'::text, 1500), ('avion_long_courrier'::text, 9000) $$,
  'Seuls les deux modes avion sont relevés à une distance particulière, et ce sont celles du calcul (1500 / 9000 km)'
);

select is(
  (select reference_km from public.emission_factor_sources where transport_mode_id = 'train_longue_distance'),
  100,
  'Le TGV est un facteur proportionnel ordinaire : relevé à la distance neutre'
);

-- ── Verrouillage des accès ──────────────────────────────────────────────────────────────

select ok(
  not has_function_privilege('authenticated', 'public.sync_emission_factors()', 'execute'),
  'sync_emission_factors n''est pas exécutable par un utilisateur connecté'
);

select ok(
  not has_function_privilege('anon', 'public.sync_emission_factors()', 'execute'),
  'sync_emission_factors n''est pas exécutable par un visiteur anonyme'
);

-- Le journal est purement interne : RLS activée sans aucune policy, donc rien n'est lisible
-- côté client même si le SELECT était accordé.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.emission_factor_sync_runs'::regclass)
    and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'emission_factor_sync_runs'),
  'Le journal de synchronisation est verrouillé (RLS active, aucune policy) — donnée d''exploitation, pas de donnée produit'
);

-- ── Planification ───────────────────────────────────────────────────────────────────────
-- La synchronisation prévue dès l'increment 1 n'avait jamais été planifiée, et rien ne le
-- disait. Ce test est le garde-fou contre une deuxième disparition silencieuse.

select is(
  (select schedule from cron.job where jobname = 'sync-emission-factors'),
  '0 3 1 1,4,7,10 *',
  'La synchronisation est planifiée trimestriellement'
);

select * from finish();
rollback;
