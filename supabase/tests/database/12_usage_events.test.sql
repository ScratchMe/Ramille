-- Tests pgTAP de la mesure d'usage (issue #30, migrations 20260905170000 → 20260905170400).
--
-- Cette table est écrite par le client, et **chaque visiteur reçoit une session anonyme dès
-- l'ouverture de l'app** (v1-04 §1) : ouvrir l'INSERT à `authenticated`, c'est l'ouvrir à
-- quiconque sait appeler l'API. Ce qui la protège n'est donc pas une politique de collecte
-- mais des contraintes — et ce sont elles qui sont vérifiées ici.
--
-- La garantie la plus importante n'est pourtant pas défensive : c'est que la table ne peut
-- pas contenir de texte libre. Une mesure d'usage qui accepterait des chaînes arbitraires
-- deviendrait réidentifiante et sortirait du régime de la mesure d'audience que
-- /confidentialite annonce.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-ue-a@test.local', 'x', now(), now()),
  ('a1111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-ue-b@test.local', 'x', now(), now());

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', 'a1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- ── Chemin nominal ──────────────────────────────────────────────────────────────────────

insert into public.usage_events (user_id, name, props, platform)
values ('a1111111-1111-1111-1111-111111111111', 'bilan_step_view', '{"step":"commute_mode"}'::jsonb, 'web');

select set_config('role', 'postgres', true);

select is(
  (select count(*) from public.usage_events where user_id = 'a1111111-1111-1111-1111-111111111111')::int,
  1,
  'un événement de parcours s''enregistre'
);

-- ── Ce que la table ne doit PAS contenir ────────────────────────────────────────────────
-- Le référentiel est fermé par clé étrangère : ajouter un événement au produit impose une
-- ligne dans `usage_event_types`, sinon l'insert est rejeté plutôt que silencieusement perdu.

select set_config('role', 'authenticated', true);

select throws_ok(
  $stmt$ insert into public.usage_events (user_id, name, platform) values ('a1111111-1111-1111-1111-111111111111', 'evenement_invente', 'web') $stmt$,
  '23503',
  null,
  'un événement absent du référentiel est refusé, pas absorbé'
);

select throws_ok(
  $stmt$ insert into public.usage_events (user_id, name, props, platform) values ('a1111111-1111-1111-1111-111111111111', 'app_open', jsonb_build_object('note', repeat('a', 49)), 'web') $stmt$,
  '23514',
  null,
  'une valeur de propriété trop longue est refusée (pas de texte libre)'
);

select throws_ok(
  $stmt$ insert into public.usage_events (user_id, name, props, platform) values ('a1111111-1111-1111-1111-111111111111', 'app_open', '{"a":{"b":1}}'::jsonb, 'web') $stmt$,
  '23514',
  null,
  'un objet imbriqué dans les propriétés est refusé'
);

select throws_ok(
  $stmt$ insert into public.usage_events (user_id, name, props, platform) values ('a1111111-1111-1111-1111-111111111111', 'app_open', '{"a":1,"b":2,"c":3,"d":4,"e":5,"f":6,"g":7}'::jsonb, 'web') $stmt$,
  '23514',
  null,
  'au-delà de six propriétés, l''insert est refusé'
);

select throws_ok(
  $stmt$ insert into public.usage_events (user_id, name, platform) values ('a1111111-1111-1111-1111-111111111111', 'app_open', 'nintendo') $stmt$,
  '23514',
  null,
  'une plateforme hors énumération est refusée'
);

-- ── Isolation ───────────────────────────────────────────────────────────────────────────

select throws_ok(
  $stmt$ insert into public.usage_events (user_id, name, platform) values ('a1111111-1111-1111-1111-111111111112', 'app_open', 'web') $stmt$,
  '42501',
  'new row violates row-level security policy for table "usage_events"',
  'on ne peut pas écrire un événement au nom de quelqu''un d''autre'
);

-- Contrairement à `feedback`, il n'existe aucune policy de lecture : le propriétaire lui-même
-- ne relit pas ses événements depuis l'app. Rien dans le produit n'en a besoin, et une table
-- qu'on ne peut pas lire depuis une clé anonyme est une table qu'on ne peut pas aspirer.
select is(
  (select count(*) from public.usage_events)::int,
  0,
  'aucune lecture possible depuis une session client, même sur ses propres lignes'
);

-- ── Horodatage ──────────────────────────────────────────────────────────────────────────
-- Une horloge de client se règle : `occurred_at` est écrasé par le serveur, et pas seulement
-- rempli par défaut quand la colonne est omise.

insert into public.usage_events (user_id, name, platform, occurred_at)
values ('a1111111-1111-1111-1111-111111111111', 'app_open', 'web', '2001-01-01T00:00:00Z');

select set_config('role', 'postgres', true);

select ok(
  (select min(occurred_at) from public.usage_events) > now() - interval '5 minutes',
  'un horodatage antidaté fourni par le client est écrasé par celui du serveur'
);

-- ── Garde-fou de volume ─────────────────────────────────────────────────────────────────
-- Un parcours complet produit une vingtaine d'événements ; le plafond laisse la place à
-- plusieurs bilans dans la journée tout en bornant ce qu'un script peut écrire.
--
-- **Le remplissage doit se faire sous session CLIENTE.** La première version de ce test le
-- faisait sous `postgres` par commodité, et passait à côté du seul défaut qui comptait :
-- la fonction du trigger n'était pas `security definer`, elle s'exécutait donc sous le rôle
-- appelant, et comme cette table n'a aucune policy de lecture, son comptage ne voyait rien
-- depuis `authenticated`. Le quota était inopérant contre exactement ce qu'il devait arrêter.
-- Remplir sous `postgres`, c'est tester le quota dans le seul rôle où il ne sert à rien.
--
-- 498, pas 500 : deux événements existent déjà, et les lignes d'un même `insert ... select`
-- sont visibles à la requête du trigger `before insert` — un remplissage en masse déclenche
-- donc le quota en plein milieu, pas à l'insert suivant. On amène le compteur pile à 500.

select set_config('role', 'authenticated', true);

insert into public.usage_events (user_id, name, platform)
select 'a1111111-1111-1111-1111-111111111111', 'app_open', 'web'
from generate_series(1, 498);

select throws_ok(
  $stmt$ insert into public.usage_events (user_id, name, platform) values ('a1111111-1111-1111-1111-111111111111', 'app_open', 'web') $stmt$,
  '23514',
  null,
  'la 501ᵉ tentative en 24 h est refusée'
);

-- ── Référentiel ─────────────────────────────────────────────────────────────────────────
-- Le miroir côté client est `src/types/analytics.ts`. Aucun test ne peut relier les deux
-- automatiquement : ce qui les tient, c'est que modifier l'un fait échouer le test de
-- l'autre, et que chacun renvoie ici.

select set_config('role', 'postgres', true);

select bag_eq(
  $$ select name from public.usage_event_types $$,
  $$ values ('app_open'), ('onboarding_step_view'), ('onboarding_complete'), ('bilan_step_view'),
            ('resultat_view'), ('resultat_share'), ('connexion_view'), ('connexion_success'),
            ('connexion_dismiss'), ('plan_view'), ('suivi_view'), ('compte_view'),
            ('retrouver_view'), ('retrouver_send'), ('rappels_view') $$,
  'le référentiel contient exactement les quinze événements du produit'
);

-- On n'instrumente jamais ce que le schéma enregistre déjà : `assessments.submitted_at`,
-- `engagement_checkins.response` et la table `feedback` portent ces faits. Les compter une
-- seconde fois garantit deux chiffres divergents le jour où l'un des chemins échoue.
select is(
  (select count(*) from public.usage_event_types
    where name in ('bilan_submit', 'checkin_answer', 'feedback_submit'))::int,
  0,
  'aucun événement ne double un fait déjà enregistré par le schéma'
);

-- ── Rétention ───────────────────────────────────────────────────────────────────────────
-- Une durée de conservation n'est pas optionnelle (RGPD art. 5-1-e) et /confidentialite
-- annonce douze mois. Le trigger écrasant `occurred_at`, on antidate après coup.

update public.usage_events set occurred_at = now() - interval '13 months'
where id = (select min(id) from public.usage_events);

select public.purge_usage_events();

select is(
  (select count(*) from public.usage_events where occurred_at < now() - interval '12 months')::int,
  0,
  'la purge supprime les événements de plus de douze mois'
);

select * from finish();
rollback;
