-- Ramille — privilèges de table explicites sur le schéma public (chantier C0.3, constats C-6
-- et A10-17 de l'audit du 09/09/2026).
--
-- ## Pourquoi ce fichier existe
--
-- Aucune migration n'accordait jusqu'ici le moindre privilège de table. Les rôles `anon` et
-- `authenticated` tenaient les leurs du comportement de plateforme qui accompagne la création
-- d'un projet Supabase (`alter default privileges ... grant all on tables`), et la stack locale
-- de `supabase test db` le rejouait grâce au drapeau `auto_expose_new_tables` de
-- `supabase/config.toml`. Deux conséquences, toutes deux muettes :
--
--   * une base reconstruite depuis `supabase/migrations/` — nouveau projet, restauration de
--     sauvegarde, branche de test — n'accorde rien à personne : l'app répond « permission denied
--     for table … » avant même d'atteindre la RLS, et rien dans le dépôt ne le disait ;
--   * ce drapeau est un drapeau de compatibilité, que le dépôt notait lui-même comme temporaire
--     (échéance 2026-10-30 — une note d'ici, pas une date vérifiée auprès de la plateforme). Le
--     jour où il disparaît du CLI, la CI tombe sur cette erreur sans qu'une ligne de code ait
--     changé ; et comme l'action `supabase/setup-cli@v1` était en `version: latest`, ce jour-là
--     n'était même pas choisi par nous (il l'est maintenant, cf. `.github/workflows/ci.yml`).
--
-- Le même chantier passe ce drapeau à `false` dans `supabase/config.toml` — l'y laisser absent ne
-- suffit pas : sa valeur par défaut n'est pas fiable, et le CLI du jour peut tout exposer sans
-- qu'on l'ait demandé (le détail est dans le commentaire là-bas).
-- **À partir d'ici, ce fichier est la seule source des privilèges de table du schéma public**, en
-- local comme en production : d'où la remise à zéro de la §2 avant les grants. Sans elle, la
-- migration n'aurait fait qu'ajouter à un état invisible, et les deux bases auraient continué à
-- diverger (le projet distant accorde aujourd'hui `all` à `anon` sur *toutes* les tables
-- applicatives — inerte grâce à la RLS, mais personne ne l'a écrit et personne ne le voit ; le
-- réglage « Default privileges for new entities » de son tableau de bord continuera d'ailleurs à
-- en accorder autant aux tables suivantes tant qu'il n'est pas désactivé là-bas).
--
-- ## Comment lire un privilège ici
--
-- Un privilège n'autorise rien à lui seul. La RLS est active sur toutes les tables de ce
-- schéma, et c'est une *policy* qui décide des lignes. Le privilège décide seulement de **la
-- façon dont ça refuse** : sans lui, PostgreSQL refuse avant la RLS (`42501 permission denied
-- for table …`) ; avec lui et sans policy, la requête rend zéro ligne, ou un refus de RLS
-- explicite (`42501 new row violates row-level security policy for table …`). Les deux sont des
-- refus — le second est celui que la suite pgTAP éprouve, parce que c'est le seul qui démontre
-- que la policy fait le travail. D'où une poignée de privilèges accordés là où aucune policy ne
-- leur correspond : ils sont regroupés et justifiés en §5, jamais dispersés.
--
-- Rien ici ne touche au schéma `analytics` (vues d'exploitation, `revoke all` posé par
-- 20260905170000 et 20260905170200) ni aux privilèges `execute` des fonctions, qui vivent dans
-- les migrations qui les créent.

-- ── 1. Le schéma ───────────────────────────────────────────────────────────────────────
-- Sans `usage`, aucun privilège de table ne sert à rien : le nom lui-même est inatteignable.
grant usage on schema public to anon, authenticated;

-- ── 2. Remise à zéro ───────────────────────────────────────────────────────────────────
-- Les dix-sept tables du schéma, dans l'ordre alphabétique. `all privileges` couvre aussi
-- `truncate`, `references`, `trigger` et `maintain`, que le produit n'utilise nulle part et que
-- les privilèges par défaut de la plateforme accordent pourtant aux deux rôles.
-- Les journaux de cron du même lot (`purge_runs`, `reminder_send_runs`) ne sont pas listés : leurs
-- migrations posent déjà leur propre `revoke all privileges` et ne leur accordent rien. Les nommer
-- ici créerait une dépendance d'ordre entre des fichiers écrits en parallèle, pour aucun gain.
revoke all privileges on table public.action_templates from anon, authenticated;
revoke all privileges on table public.assessment_answers from anon, authenticated;
revoke all privileges on table public.assessment_results from anon, authenticated;
revoke all privileges on table public.assessments from anon, authenticated;
revoke all privileges on table public.emission_factor_sources from anon, authenticated;
revoke all privileges on table public.emission_factor_sync_runs from anon, authenticated;
revoke all privileges on table public.emission_factors from anon, authenticated;
revoke all privileges on table public.engagement_checkins from anon, authenticated;
revoke all privileges on table public.feedback from anon, authenticated;
revoke all privileges on table public.notification_outbox from anon, authenticated;
revoke all privileges on table public.plan_actions from anon, authenticated;
revoke all privileges on table public.plan_cycles from anon, authenticated;
revoke all privileges on table public.profiles from anon, authenticated;
revoke all privileges on table public.push_tokens from anon, authenticated;
revoke all privileges on table public.transport_modes from anon, authenticated;
revoke all privileges on table public.usage_event_types from anon, authenticated;
revoke all privileges on table public.usage_events from anon, authenticated;

-- ── 3. Référentiels : lecture pour tout le monde ────────────────────────────────────────
-- Aucune donnée utilisateur, et une policy `readable by anyone` (`to anon, authenticated`) sur
-- chacune des quatre : le privilège ne fait que rendre cette policy atteignable. `anon` en a
-- besoin pour de vrai — l'écran de diagnostic `/status` interroge `transport_modes` avant
-- qu'une session existe.
grant select on table public.transport_modes to anon, authenticated;
grant select on table public.emission_factors to anon, authenticated;
grant select on table public.action_templates to anon, authenticated;
-- Écriture réservée au serveur (`revoke insert, update, delete` de 20260904160000) : la
-- synchronisation trimestrielle est `security definer`, elle ne passe pas par ces rôles.
grant select on table public.emission_factor_sources to anon, authenticated;

-- ── 4. Tables applicatives : `authenticated` seulement ─────────────────────────────────
-- Chaque ligne correspond aux policies de la table, et à rien d'autre — les cinq écarts assumés
-- sont rassemblés en §5. `anon` n'y figure jamais : la session anonyme du produit est une session
-- **Supabase Auth anonyme**, dont le rôle JWT est `authenticated` (v1-04 §1) ; le rôle `anon`,
-- lui, c'est une requête sans session, qui n'a aucune ligne à lire ni à écrire ici.

-- Lecture + mise à jour de sa propre ligne (`reminder_channel` depuis « Toi »). Pas d'insert :
-- la ligne est créée par le trigger `handle_new_user` à l'inscription. Pas de delete : la
-- suppression de compte passe par `delete_my_account()` et la cascade depuis `auth.users`.
grant select, update on table public.profiles to authenticated;

-- Le bilan lui-même : créé par le questionnaire, qui relit l'identifiant dans la même requête
-- (`insert ... returning id`), donc insert **et** select ; relu par l'accueil, le plan et le
-- suivi ; modifiable par son propriétaire (policy « assessments update own »).
grant select, insert, update on table public.assessments to authenticated;

-- Les réponses B1.1→B4.3, même cycle de vie que le bilan qui les porte.
grant select, insert, update on table public.assessment_answers to authenticated;

-- Résultat figé au moment du bilan : lecture seule côté client, le calcul est écrit par
-- `compute_assessment_results` (`security definer`). La §5 y ajoute un `insert` qui n'écrit
-- rien — aucune policy ne l'accompagne, la RLS refuse toutes les lignes.
grant select on table public.assessment_results to authenticated;

-- Les points d'engagement : lus par le plan, répondus par leur propriétaire. **Pas d'insert** —
-- la génération est serveur-only (`revoke insert` de 20260827090000, et un test pgTAP épingle
-- que le refus est bien « permission denied » ici, pas un refus de RLS).
grant select, update on table public.engagement_checkins to authenticated;

-- Le cycle de plan : lu par `/plan` et `/suivi/bilan`, généré par
-- `generate_plan_cycle_for_user` (`security definer`).
grant select on table public.plan_cycles to authenticated;

-- Les actions du cycle, avec leurs gains figés à la génération. Lecture, et rien d'autre qui
-- écrive : l'engagement passe par `commit_plan_action` / `clear_plan_action_commitment`. La §5 y
-- ajoute `insert` et `update`, tous deux sans policy, donc sans effet — et c'est justement ce
-- « sans effet » qu'un test épingle.
grant select on table public.plan_actions to authenticated;

-- Le canal de retour : écrire, relire et effacer ses propres retours (droit d'accès et droit à
-- l'effacement du RGPD, annoncés par /confidentialite). Pas d'update — un retour est un envoi.
grant select, insert, delete on table public.feedback to authenticated;

-- Les appareils qui reçoivent les rappels : l'app doit pouvoir dire « ce téléphone est-il
-- joignable ? » et la personne retirer un appareil. **Ni insert ni update** : l'enregistrement
-- passe par `register_push_token`, qui reprend le jeton à son propriétaire précédent — ce
-- qu'une policy owner-scoped ne peut pas faire (v1-10 §3.4).
grant select, delete on table public.push_tokens to authenticated;

-- La mesure d'usage : écriture seule sur ses propres lignes. Aucune policy de lecture, donc
-- aucune ligne ne sort d'ici côté client ; l'export RGPD la lit via `export_my_data`
-- (`security definer`).
grant insert on table public.usage_events to authenticated;

-- La séquence de `usage_events.id`. Une colonne `generated always as identity` n'en a pas
-- besoin — son défaut est évalué sans contrôle de privilège, contrairement à un `serial` — mais
-- le grant ne coûte rien et couvre le jour où la colonne serait convertie : ce jour-là, l'insert
-- échouerait sinon sur la séquence, et l'erreur ne parlerait pas de la table.
grant usage on sequence public.usage_events_id_seq to authenticated;

-- ── 5. Les privilèges inertes, et pourquoi ils sont là ─────────────────────────────────
-- Cinq privilèges, sur quatre tables, sans policy correspondante. Aucun n'ouvre quoi que ce
-- soit : la RLS est active et aucune policy ne les accompagne, donc zéro ligne lue, zéro ligne
-- écrite. Ce qu'ils changent, c'est **la nature du refus** — et trois fichiers de la suite pgTAP
-- reposent dessus, parce qu'un refus de RLS prouve la policy là où un refus de privilège la
-- masque.
--
--   * `insert` sur `assessment_results`, `plan_cycles` et `plan_actions` : 03_rls_policies
--     vérifie que `authenticated` reçoit « new row violates row-level security policy for
--     table … » sur ces trois tables, et « permission denied for table engagement_checkins »
--     sur la quatrième. C'est cette différence qui dit laquelle est verrouillée par un revoke
--     et lesquelles le sont par l'absence de policy.
--   * `update` sur `plan_actions` : 13_engagement_action exécute un `update ... set
--     saving_kg_year = 99999` nu et vérifie qu'il reste **sans effet**. Retirer le privilège
--     transformerait l'assertion en erreur de permission, et elle ne surveillerait plus ce
--     qu'elle surveille — l'apparition d'une policy UPDATE, qui ouvrirait toutes les colonnes
--     puisque la RLS filtre des lignes et jamais des colonnes. L'engagement passe par un RPC
--     (`commit_plan_action`) précisément pour cette raison.
--   * `select` sur `usage_events` : 12_usage_events vérifie qu'une session cliente lit zéro
--     ligne de ses **propres** événements. Sans le privilège, l'assertion lèverait au lieu de
--     compter.
grant insert on table public.assessment_results to authenticated;
grant insert on table public.plan_cycles to authenticated;
grant insert, update on table public.plan_actions to authenticated;
grant select on table public.usage_events to authenticated;

-- ── 6. Ce qui reste volontairement sans aucun privilège ────────────────────────────────
--
--   * `notification_outbox` — boîte d'envoi des rappels : adresse, sujet, corps. Donnée
--     d'exploitation, écrite et lue par le seul serveur.
--   * `emission_factor_sync_runs` — journal des synchronisations de facteurs, même régime.
--   * `purge_runs` — journal des passages de purge, même régime (revoke dans sa propre
--     migration, 20260910100000).
--   * `usage_event_types` — référentiel fermé des événements mesurables. Ni lu ni écrit par le
--     client : la vérification de clé étrangère depuis `usage_events` s'exécute sous le
--     propriétaire de la table et hors RLS, donc un événement inconnu est bien refusé en
--     `23503` sans que le référentiel soit lisible.
--   * le schéma `analytics` et ses vues — `revoke all` déjà posé, et il n'est pas exposé par
--     PostgREST (`supabase/config.toml`, `[api] schemas`).
--   * les tables supprimées (`assessment_trips`, `assessment_trip_modes`, `monthly_checkins`) :
--     elles n'existent plus, il n'y a rien à révoquer.
--
-- Une table ajoutée au schéma `public` passe donc désormais par l'un des deux chemins : une
-- ligne de `grant` ici si l'app y touche, ou un `revoke all privileges ... from anon,
-- authenticated` dans sa propre migration si elle est serveur-only — ce que font les journaux de
-- cron du même lot (`purge_runs`, `reminder_send_runs`). Ce qui ne marche plus, c'est de ne rien
-- écrire : sans grant la table est invisible pour l'app, et la matrice de
-- `supabase/tests/database/18_grants_explicites.test.sql` le dira en CI. C'est l'inverse exact du
-- drapeau désactivé, qui exposait tout sans que personne ne l'écrive.
