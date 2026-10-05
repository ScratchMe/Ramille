-- Tests pgTAP du durcissement d'après la seconde passe de sécurité (migration
-- `20261006120000_le_durcissement_avant_le_lancement.sql`, `v1-27` §12.39).
--
-- Quatre gardes, éprouvées des deux côtés quand c'est possible (au seuil refusé, en dessous accepté) :
--   1. `auth.users` : métadonnées bornées à 8 Ko, mot de passe refusé sur un `UPDATE`.
--   2. `feedback.message` : une borne sur le brut, en plus du `btrim`.
--   3. `verifier_le_jeton_du_captcha` : le délai HTTP est 1,5 s (lu dans le corps de la fonction, le
--      vrai appel n'ayant rien à faire en CI).
--   4. `check_intention_days` : une seule dimension.
--
-- Le trigger d'`auth.users` se déclenche pour **tous** les rôles, `postgres` compris : ce fichier
-- l'éprouve donc directement en `UPDATE`, sans avoir à devenir `supabase_auth_admin` (ce que la stack
-- locale refuse à `postgres`). La preuve que GoTrue, qui écrit sous ce rôle, est bien pris est jouée
-- de bout en bout par `verifier-code-de-connexion.mjs` et `verifier-parcours-reel.mjs` (HTTP réel).
--
-- **Éprouvé en le cassant** : relevé en pied de fichier.

begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, is_anonymous, created_at, updated_at) values
  ('52000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '', true, now(), now()),
  ('52000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'durcissement@test.local', '', false, now(), now());

-- ── 1. auth.users : les métadonnées sont bornées ───────────────────────────────────────────

select throws_ok(
  $stmt$ update auth.users
         set raw_user_meta_data = jsonb_build_object('x', repeat('a', 20000))
         where id = '52000000-0000-0000-0000-00000000000a' $stmt$,
  '23514',
  'Métadonnées de compte trop volumineuses.',
  'un PUT /user qui fusionnerait 20 Ko de métadonnées est refusé (le chemin du constat CRITIQUE)'
);

select lives_ok(
  $stmt$ update auth.users
         set raw_user_meta_data = jsonb_build_object('theme', 'clair')
         where id = '52000000-0000-0000-0000-00000000000a' $stmt$,
  'une petite métadonnée légitime passe (8 Ko laisse tout usage réel : 27 o au plus en production)'
);

-- ── 2. auth.users : un UPDATE ne pose pas de mot de passe ───────────────────────────────────

select throws_ok(
  $stmt$ update auth.users
         set encrypted_password = 'un-hash-quelconque'
         where id = '52000000-0000-0000-0000-00000000000b' $stmt$,
  '23514',
  'La connexion par mot de passe n''est pas prise en charge.',
  'poser un mot de passe par UPDATE est refusé (la porte dérobée qui survivait au logout global)'
);

select lives_ok(
  $stmt$ update auth.users
         set updated_at = now()
         where id = '52000000-0000-0000-0000-00000000000b' $stmt$,
  'un UPDATE qui ne touche pas le mot de passe passe (le rattachement et la reconnexion en vivent)'
);

-- ── 3. feedback.message : une borne sur le brut, pas seulement sur le btrim ─────────────────
-- Le rembourrage d'espaces laisse `length(btrim)` à 3 mais fait exploser le brut : c'est le trou que
-- la passe du 05/10 avait laissé. L'assertion se joue sous la session du PROPRIÉTAIRE, et avant toute
-- saturation du garde-fou de volume (lui aussi lève un `23514`) — sinon elle passerait sans éprouver
-- la contrainte, exactement comme le note `11_feedback`.

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '52000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);

select throws_ok(
  $stmt$ insert into public.feedback (user_id, kind, message)
         values ('52000000-0000-0000-0000-00000000000b', 'autre',
                 repeat(' ', 5000) || 'abc' || repeat(' ', 5000)) $stmt$,
  '23514',
  'new row for relation "feedback" violates check constraint "feedback_message_check"',
  'un retour rembourré d''espaces (btrim = 3, brut > 4000) est refusé'
);

select lives_ok(
  $stmt$ insert into public.feedback (user_id, kind, message)
         values ('52000000-0000-0000-0000-00000000000b', 'autre', repeat('a', 2000)) $stmt$,
  'un retour de 2000 caractères utiles reste accepté'
);

select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', '', true);

-- ── 4. verifier_le_jeton_du_captcha : le délai HTTP est 1,5 s ───────────────────────────────

select ok(
  pg_get_functiondef('public.verifier_le_jeton_du_captcha(text, text)'::regprocedure) like '%''CURLOPT_TIMEOUT_MS'', ''1500''%',
  'le délai de l''appel à Cloudflare est posé à 1 500 ms'
);

select ok(
  pg_get_functiondef('public.verifier_le_jeton_du_captcha(text, text)'::regprocedure) not like '%''CURLOPT_TIMEOUT_MS'', ''3000''%',
  'l''ancien délai de 3 000 ms a disparu'
);

-- ── 5. check_intention_days : une seule dimension ──────────────────────────────────────────

select is(
  public.check_intention_days('{{1},{2}}'::smallint[]),
  false,
  'un tableau de jours à deux dimensions est refusé (le questionnaire n''en produit jamais)'
);

select is(
  public.check_intention_days('{1,2,3}'::smallint[]),
  true,
  'un tableau de jours normal, à une dimension, reste accepté'
);

select * from finish();
rollback;

-- ── Éprouvé en le cassant (05/10/2026) ──────────────────────────────────────────────────────
-- Chaque mutation remise dans la fonction ou la contrainte, puis ce fichier rejoué dans la même
-- transaction annulée ; le témoin sans mutation passe ses dix assertions.
--
--   | mutation                                                            | ce qui tombe         |
--   |---------------------------------------------------------------------|----------------------|
--   | la borne des métadonnées retirée du trigger                         | 1                    |
--   | le refus du mot de passe retiré                                     | 3                    |
--   | le refus du mot de passe sur tout UPDATE (ses deux conditions ôtées) | 2 et 4               |
--   | le refus du mot de passe étendu à l'INSERT                          | rien ici (fixtures à |
--   |                                                                     | `''`) ; `03`, dont   |
--   |                                                                     | les fixtures posent  |
--   |                                                                     | `'x'`, échoue dès    |
--   |                                                                     | elles                |
--   | `length(message) <= 4000` retiré de `feedback_message_check`        | 5                    |
--   | le délai laissé à 3 000 ms                                          | 7 et 8               |
--   | `array_ndims(p_days) = 1` retiré de `check_intention_days`          | 9                    |
--
-- Mesuré aussi, et sans effet : borner par `pg_column_size` au lieu d'`octet_length`. Dans un trigger
-- `before`, la valeur n'est pas encore compressée, donc les deux mesurent la même taille brute et
-- gardent pareil. La première version de ce tableau affirmait l'inverse sans l'avoir joué.
