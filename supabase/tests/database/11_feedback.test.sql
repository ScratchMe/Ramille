-- Tests pgTAP du canal de retour (issue #29, migration 20260905150000_feedback.sql).
--
-- Cette table est le seul endroit du produit où un client peut écrire librement du texte, et
-- **chaque visiteur reçoit une session anonyme dès l'ouverture de l'app** (v1-04 §1). Ouvrir
-- l'INSERT à `authenticated` revient donc à l'ouvrir à quiconque sait appeler l'API. Les
-- garanties vérifiées ici ne sont pas décoratives : sans elles, c'est un formulaire de spam
-- public adossé à notre base.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

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

select throws_ok(
  $stmt$ insert into public.feedback (user_id, kind, message) values ('f1111111-1111-1111-1111-111111111111', 'autre', '  a  ') $stmt$,
  '23514',
  'un message vide ou quasi vide est refusé par la contrainte de longueur'
);

-- ── Garde-fou de volume ─────────────────────────────────────────────────────────────────
-- Dix par 24 h. Assez large pour que personne de bonne foi ne le rencontre, assez bas pour
-- qu'un script n'en fasse rien.

select set_config('request.jwt.claims', json_build_object('sub', 'f1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

insert into public.feedback (user_id, kind, message)
select 'f1111111-1111-1111-1111-111111111111', 'idee', 'retour ' || g from generate_series(1, 9) g;

select is(
  (select count(*) from public.feedback where user_id = 'f1111111-1111-1111-1111-111111111111')::int,
  10,
  'dix retours en 24 h passent'
);

select throws_ok(
  $stmt$ insert into public.feedback (user_id, kind, message) values ('f1111111-1111-1111-1111-111111111111', 'idee', 'le onzieme') $stmt$,
  'Tu as déjà envoyé plusieurs retours aujourd''hui. Reviens demain, on les lit tous.',
  'le onzième est refusé, avec un message rédigé pour être montré tel quel'
);

select * from finish();
rollback;
