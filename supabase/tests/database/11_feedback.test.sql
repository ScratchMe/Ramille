-- Tests pgTAP du canal de retour (issue #29, migration 20260905150000_feedback.sql).
--
-- Cette table est le seul endroit du produit où un client peut écrire librement du texte, et
-- **chaque visiteur reçoit une session anonyme dès l'ouverture de l'app** (v1-04 §1). Ouvrir
-- l'INSERT à `authenticated` revient donc à l'ouvrir à quiconque sait appeler l'API. Les
-- garanties vérifiées ici ne sont pas décoratives : sans elles, c'est un formulaire de spam
-- public adossé à notre base.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('f1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-fb-a@test.local', 'x', now(), now()),
  ('f1111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-fb-b@test.local', 'x', now(), now());

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', 'f1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- ── Le chemin nominal ───────────────────────────────────────────────────────────────────

insert into public.feedback (user_id, kind, message, context)
values ('f1111111-1111-1111-1111-111111111111', 'mode_manquant', 'Il manque le camping-car', 'B3.4');

select is(
  (select count(*) from public.feedback where user_id = 'f1111111-1111-1111-1111-111111111111')::int,
  1,
  'un utilisateur peut envoyer un retour et le relire (droit d''accès du RGPD)'
);

-- ── Isolation ───────────────────────────────────────────────────────────────────────────

select throws_ok(
  $stmt$ insert into public.feedback (user_id, kind, message) values ('f1111111-1111-1111-1111-111111111112', 'bug', 'usurpation') $stmt$,
  '42501',
  'new row violates row-level security policy for table "feedback"',
  'on ne peut pas écrire un retour au nom de quelqu''un d''autre'
);

select set_config('request.jwt.claims', json_build_object('sub', 'f1111111-1111-1111-1111-111111111112', 'role', 'authenticated')::text, true);

select is(
  (select count(*) from public.feedback where user_id = 'f1111111-1111-1111-1111-111111111111')::int,
  0,
  'un tiers ne voit pas les retours du propriétaire'
);

-- ── Bornes du message ───────────────────────────────────────────────────────────────────
-- Un message d'un caractère n'apprend rien ; la borne haute évite qu'un « retour » soit une
-- charge utile.
--
-- **Cette assertion doit rester AVANT la saturation du garde-fou de volume.** Le trigger
-- `before insert` se déclenche avant l'évaluation des contraintes CHECK, et il lève lui aussi
-- un `23514` : une fois le quota atteint, ce test passerait sans jamais éprouver la contrainte
-- de longueur. Vérifié en base — c'est exactement ce qui se produisait dans la première
-- version de ce fichier.
--
-- Et elle doit repasser sous la session du PROPRIÉTAIRE : le scénario précédent bascule sur
-- un tiers, et depuis cette session-là c'est la RLS (42501) qui refuse en premier — la
-- contrainte de longueur ne serait jamais atteinte. Deuxième façon, pour la même assertion,
-- de passer sans rien éprouver.
select set_config('request.jwt.claims', json_build_object('sub', 'f1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

-- Forme à QUATRE arguments (sql, errcode, errmsg, description). À trois, pgTAP résout vers
-- (sql, errcode, errmsg) et prend le libellé du test pour le message attendu — le test échoue
-- alors en annonçant qu'il voulait sa propre description.
select throws_ok(
  $stmt$ insert into public.feedback (user_id, kind, message) values ('f1111111-1111-1111-1111-111111111111', 'autre', '  a  ') $stmt$,
  '23514',
  'new row for relation "feedback" violates check constraint "feedback_message_check"',
  'un message vide ou quasi vide est refusé par la contrainte de longueur'
);

-- ── Garde-fou de volume ─────────────────────────────────────────────────────────────────
-- Dix par 24 h. Assez large pour que personne de bonne foi ne le rencontre, assez bas pour
-- qu'un script n'en fasse rien.

insert into public.feedback (user_id, kind, message)
select 'f1111111-1111-1111-1111-111111111111', 'idee', 'retour ' || g from generate_series(1, 9) g;

select is(
  (select count(*) from public.feedback where user_id = 'f1111111-1111-1111-1111-111111111111')::int,
  10,
  'dix retours en 24 h passent'
);

-- **Le code d'abord, le message ensuite** (C3.10, point 4, migration `20260914120453`). Le refus
-- levait avec `check_violation`, c'est-à-dire le **même 23514** que la contrainte de longueur
-- épinglée trente lignes plus haut : le client ne pouvait les distinguer qu'en cherchant
-- « plusieurs retours » dans le texte, et ce test-là n'éprouvait que le message — donc il serait
-- resté vert le jour où une reformulation aurait fait lire « Vérifie ta connexion » à quelqu'un
-- dont le retour est simplement le onzième.
--
-- Forme à quatre arguments : code **et** message. Le message reste éprouvé parce qu'il s'affiche
-- tel quel ; ce qui s'ajoute est ce qui le sélectionne.
select throws_ok(
  $stmt$ insert into public.feedback (user_id, kind, message) values ('f1111111-1111-1111-1111-111111111111', 'idee', 'le onzieme') $stmt$,
  'RM002',
  'Tu as déjà envoyé plusieurs retours aujourd''hui. Reviens demain, on les lit tous.',
  'le onzième est refusé sous son propre code, avec un message rédigé pour être montré tel quel'
);

-- ── Le trigger n'est pas appelable par un client ─────────────────────────────────────────
-- PostgreSQL accorde `EXECUTE` à **PUBLIC** à la création, et `anon`/`authenticated` en héritent :
-- une fonction de trigger reste donc invocable par l'API tant qu'on ne l'a pas révoquée de
-- `public` nommément (20260911100000, qui a fermé les deux dernières exceptions du schéma).
-- PostgREST n'expose pas une fonction qui rend `trigger`, mais on ne laisse pas un droit dépendre
-- de ce détail — et sans cette assertion, un `create or replace` ultérieur rendrait le droit à
-- PUBLIC sans que rien ne tombe. Sa jumelle `prevent_answered_checkin_update` est épinglée dans
-- le test 04.

select set_config('role', 'postgres', true);

select ok(
  not has_function_privilege('authenticated', 'public.enforce_feedback_rate_limit()', 'execute')
    and not has_function_privilege('anon', 'public.enforce_feedback_rate_limit()', 'execute'),
  'enforce_feedback_rate_limit : execute révoqué de PUBLIC, donc des deux rôles client'
);

-- L'invariant que les deux `throws_ok` portent ensemble, énoncé pour lui-même : les deux refus de
-- cette table ne se reconnaissent pas au même SQLSTATE. Sans cette assertion, un futur
-- `using errcode = 'check_violation'` réintroduirait la confusion en laissant les deux `throws_ok`
-- verts chacun de son côté — chacun ne regarde que son propre cas, et celui du quota n'a pas de
-- raison de s'apercevoir qu'il vient d'emprunter le code de l'autre.
--
-- Écrite sur le **corps installé** et non en comparant deux littéraux : `isnt('RM002', '23514')`
-- serait vrai par construction, c'est-à-dire le genre d'assertion tautologique que C3.12 va
-- justement retirer de `page-titles.test.ts`.
select ok(
  position('check_violation' in pg_get_functiondef('public.enforce_feedback_rate_limit()'::regprocedure)) = 0,
  'le garde-fou de volume n''emprunte pas le SQLSTATE des contraintes de longueur'
);

select * from finish();
rollback;
