-- Tests pgTAP du signal « deux points consécutifs » — v1-13, chantier C2.10
-- (migration 20260912210000_second_renforcement.sql, `v1-14` §4.6).
--
-- Ce fichier tient deux choses, et la seconde est la raison d'être du chantier :
--
--   1. **`public.periode_precedente` est la jumelle SQL de `periodePrecedente`**
--      (`src/types/checkin.ts`) — les deux listes de cas sont volontairement les mêmes des deux
--      côtés, y compris le passage d'année et le mois ramené au premier. La vue compte côté serveur,
--      la carte affiche côté client : elles doivent désigner la même période.
--   2. **La série se compte sur les PÉRIODES, jamais sur les dernières lignes répondues.** La requête
--      de `v1-02` §4 prenait les deux dernières lignes ; elle était juste avant que les périodes
--      révolues ne soient closes en `expired` et gardées en base (20260904180000). Depuis, deux
--      réponses séparées par trois mois de silence sont « les deux dernières lignes » — et feraient
--      une série. L'assertion du trou est celle qui tombe si quelqu'un remplace l'appariement par un
--      `lag()`.
--
-- Les assertions de la vue portent sur l'ensemble de la table : elle agrège par segment et n'expose
-- pas `user_id`, donc on compare deux agrégats du même jeu de lignes, ce qui reste rejouable sur le
-- projet distant.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

select has_function('public', 'periode_precedente', array['text', 'date'],
  'la période précédente se calcule par une fonction, elle ne se lit pas dans l''ordre des lignes');

select is(public.periode_precedente('commute', date '2026-09-14'), date '2026-09-07',
  'hebdomadaire : sept jours avant un lundi est un lundi');

select is(public.periode_precedente('commute', date '2026-01-05'), date '2025-12-29',
  'hebdomadaire : le passage d''année ne se fait pas par une arithmétique de numéro de jour');

select is(public.periode_precedente('extras', date '2026-09-01'), date '2026-08-01',
  'mensuelle : le premier du mois précédent');

select is(public.periode_precedente('extras', date '2026-01-01'), date '2025-12-01',
  'mensuelle : le passage d''année aussi');

-- **Le mois est ramené au premier, pas décalé du même nombre de jours**, et c'est ce qui rend les deux
-- moitiés de la paire identiques par construction : PostgreSQL ramènerait le 31 mars au 28 février,
-- `Date.UTC` le pousserait au 3 mars. `period_start` vaut toujours le 1er en pratique.
select is(public.periode_precedente('extras', date '2026-03-31'), date '2026-02-01',
  'mensuelle : un period_start inhabituel retombe sur le premier, comme la jumelle JavaScript');

select is(public.periode_precedente('autre', date '2026-09-01'), null,
  'une boucle inconnue rend null — supposer une cadence apparierait deux périodes au hasard');

select ok(
  not has_function_privilege('authenticated', 'public.periode_precedente(text, date)', 'execute')
    and not has_function_privilege('anon', 'public.periode_precedente(text, date)', 'execute'),
  'le client a sa propre moitié de la paire : celle-ci reste serveur-only'
);

-- ── La vue ───────────────────────────────────────────────────────────────────────────────
--
-- **Les assertions sont des écarts, pas des totaux.** La vue agrège par segment et n'expose pas
-- `user_id` : une assertion sur une valeur absolue supposerait une base vierge, ce qui est
-- exactement le piège consigné dans CLAUDE.md (trois assertions de la suite échouent sur le distant
-- pour cette raison). On mesure donc ce que la fixture ajoute.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  ('c2a00000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c210-a@test.local', 'x', now(), now(), now(), false),
  ('c2a00000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c210-b@test.local', 'x', now(), now(), now(), false);

select set_config('test.oui_0',
  (select coalesce(sum(oui), 0)::text from analytics.checkins_consecutifs), true);
select set_config('test.suite_0',
  (select coalesce(sum(oui_consecutifs), 0)::text from analytics.checkins_consecutifs), true);

-- A : septembre et août portent un « oui » et se suivent. Juin porte un « oui » isolé — juillet est
-- clos **sans réponse**, et mai est un « non ». Dans l'ordre des lignes **répondues**, août est
-- pourtant suivi de juin : c'est précisément ce qu'un `lag()` apparierait.
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status, response_kind, response, responded_at) values
  ('c2a00000-0000-0000-0000-000000000011', 'extras', '2026-09-01', 'septembre 2026', 'Voyages longue distance', 'travel', 'answered', 'oui', true, now()),
  ('c2a00000-0000-0000-0000-000000000011', 'extras', '2026-08-01', 'août 2026', 'Voyages longue distance', 'travel', 'answered', 'oui', true, now()),
  ('c2a00000-0000-0000-0000-000000000011', 'extras', '2026-06-01', 'juin 2026', 'Voyages longue distance', 'travel', 'answered', 'oui', true, now()),
  ('c2a00000-0000-0000-0000-000000000011', 'extras', '2026-05-01', 'mai 2026', 'Voyages longue distance', 'travel', 'answered', 'non', false, now());
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status) values
  ('c2a00000-0000-0000-0000-000000000011', 'extras', '2026-07-01', 'juillet 2026', 'Voyages longue distance', 'travel', 'expired');

select is(
  (select coalesce(sum(oui), 0)::int from analytics.checkins_consecutifs)
    - current_setting('test.oui_0')::int,
  3,
  'la vue compte les trois « oui » ajoutés, et pas le « non »'
);

-- **L'assertion qui tombe si l'appariement redevient un `lag()` sur les lignes répondues.** Une seule
-- paire de périodes réellement voisines : septembre derrière août. Le « oui » de juin n'est apparié à
-- rien — son mois précédent est un « non » — et celui d'août non plus, le sien étant clos sans
-- réponse. Sur les lignes, le compteur vaudrait deux.
select is(
  (select coalesce(sum(oui_consecutifs), 0)::int from analytics.checkins_consecutifs)
    - current_setting('test.suite_0')::int,
  1,
  'une seule paire de PÉRIODES qui se suivent — un trou dans la série ne se recolle pas'
);

select set_config('test.oui_1',
  (select coalesce(sum(oui), 0)::text from analytics.checkins_consecutifs), true);
select set_config('test.suite_1',
  (select coalesce(sum(oui_consecutifs), 0)::text from analytics.checkins_consecutifs), true);

-- B : un « oui » dont le mois précédent est un « pas de voyage ». Une réponse, donc — mais pas un
-- changement : il n'y a rien à renforcer, et rien à reprocher non plus (C2.4).
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status, response_kind, response, responded_at) values
  ('c2a00000-0000-0000-0000-000000000012', 'extras', '2026-09-01', 'septembre 2026', 'Voyages longue distance', 'travel', 'answered', 'oui', true, now()),
  ('c2a00000-0000-0000-0000-000000000012', 'extras', '2026-08-01', 'août 2026', 'Voyages longue distance', 'travel', 'answered', 'sans_objet', null, now());

select results_eq(
  $$ select (select coalesce(sum(oui), 0)::int from analytics.checkins_consecutifs)
              - current_setting('test.oui_1')::int,
            (select coalesce(sum(oui_consecutifs), 0)::int from analytics.checkins_consecutifs)
              - current_setting('test.suite_1')::int $$,
  $$ select 1, 0 $$,
  'un « pas de voyage » est une réponse, mais il ne prolonge aucune série'
);

select ok(
  not has_table_privilege('authenticated', 'analytics.checkins_consecutifs', 'select')
    and not has_table_privilege('anon', 'analytics.checkins_consecutifs', 'select'),
  'la vue reste serveur-only, comme les autres vues d''analyse'
);

select * from finish();
rollback;
