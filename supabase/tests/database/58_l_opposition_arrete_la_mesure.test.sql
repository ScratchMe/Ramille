-- Une opposition à la mesure arrête l'enregistrement, sauf la date de dernière ouverture
-- (migration `20261019150000_l_opposition_arrete_la_mesure.sql`, décision du 19/10/2026).
--
-- Ce que ce fichier garde : après `refuser_la_mesure`, un compte n'a plus qu'**une** ligne d'usage —
-- son `app_open` le plus récent, sans propriétés —, et ce que l'app envoie ensuite n'en ajoute
-- aucune : les autres événements sont écartés sans erreur, une ouverture remplace la précédente. Le
-- signe de vie que lisent les rappels et la purge survit ; un compte qui ne s'est pas opposé ne voit
-- rien changer. Et le geste reste serveur seulement.
--
-- Trois comptes : O s'oppose après avoir enregistré un historique, T est le témoin, et un identifiant
-- inconnu fait lever la fonction.
--
-- Éprouvé en le cassant (`TESTING.md` §1.1) — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
from (values
  ('58000000-0000-0000-0000-00000000000a'), -- O : s'oppose
  ('58000000-0000-0000-0000-00000000000b')  -- T : le témoin
) as v(id);

-- Un historique ordinaire, envoyé comme l'app l'envoie : par le compte lui-même, sous sa session.
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '58000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
insert into public.usage_events (user_id, name, props, platform) values
  ('58000000-0000-0000-0000-00000000000a', 'app_open', '{"origine":"demarrage","version":"1.0.0+14"}', 'android'),
  ('58000000-0000-0000-0000-00000000000a', 'plan_view', '{}', 'android'),
  ('58000000-0000-0000-0000-00000000000a', 'app_error', '{"category":"type","route":"/plan"}', 'android');
select set_config('request.jwt.claims',
  json_build_object('sub', '58000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
insert into public.usage_events (user_id, name, props, platform) values
  ('58000000-0000-0000-0000-00000000000b', 'app_open', '{"origine":"demarrage"}', 'web'),
  ('58000000-0000-0000-0000-00000000000b', 'plan_view', '{}', 'web');
reset role;

select is(
  (select count(*)::int from public.usage_events where user_id = '58000000-0000-0000-0000-00000000000a'),
  3,
  'fixtures : O a enregistré trois repères avant de s''opposer'
);

-- ── 1. Le geste de l'opposition ──────────────────────────────────────────────────────────────

select set_config('ramille.opposition', public.refuser_la_mesure('58000000-0000-0000-0000-00000000000a')::text, true);

select is(
  (current_setting('ramille.opposition')::jsonb ->> 'reperes_effaces')::int,
  2,
  '1. refuser_la_mesure efface les repères déjà enregistrés, sauf la dernière ouverture'
);

select results_eq(
  $$ select name, props from public.usage_events where user_id = '58000000-0000-0000-0000-00000000000a' $$,
  $$ values ('app_open'::text, '{}'::jsonb) $$,
  '1. il ne reste qu''une ligne : la dernière ouverture, vidée de ses propriétés'
);

select isnt(
  (select mesure_refusee_le from public.profiles where id = '58000000-0000-0000-0000-00000000000a'),
  null,
  '1. l''opposition est datée sur le profil'
);

select set_config('ramille.ouverture_d_avant',
  (select id::text from public.usage_events where user_id = '58000000-0000-0000-0000-00000000000a'), true);

-- ── 2. Ce que l'app envoie ensuite ──────────────────────────────────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '58000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform) values
       ('58000000-0000-0000-0000-00000000000a', 'plan_view', '{}', 'android'),
       ('58000000-0000-0000-0000-00000000000a', 'app_error', '{"category":"type","route":"/suivi"}', 'android') $$,
  '2. un repère d''un compte opposé part sans erreur : l''app ne voit qu''un envoi réussi'
);

insert into public.usage_events (user_id, name, props, platform)
values ('58000000-0000-0000-0000-00000000000a', 'app_open', '{"origine":"retour","version":"1.0.0+14"}', 'android');
reset role;

select results_eq(
  $$ select name, props from public.usage_events where user_id = '58000000-0000-0000-0000-00000000000a' $$,
  $$ values ('app_open'::text, '{}'::jsonb) $$,
  '2. rien ne s''ajoute : les autres repères sont écartés, et l''ouverture part sans propriétés'
);

-- `min` et non la ligne seule : si une mutation laisse plusieurs lignes, l'assertion échoue au lieu de
-- faire lever la sous-requête et d'interrompre le fichier.
select ok(
  (select min(id) from public.usage_events where user_id = '58000000-0000-0000-0000-00000000000a')
    > current_setting('ramille.ouverture_d_avant')::bigint,
  '2. la nouvelle ouverture remplace la précédente : la ligne qui reste est la plus récente'
);

-- Le signe de vie que lisent le régime des rappels et la purge (le plus récent des événements).
select isnt(
  public.dernier_signe_de_vie('58000000-0000-0000-0000-00000000000a', 'commute'),
  null,
  '2. le signe de vie survit à l''opposition'
);

-- ── 3. Rejouable, et sans effet sur un autre compte ─────────────────────────────────────────

select is(
  (public.refuser_la_mesure('58000000-0000-0000-0000-00000000000a') ->> 'reperes_effaces')::int,
  0,
  '3. une seconde opposition n''efface rien de plus'
);

select results_eq(
  $$ select name, props from public.usage_events where user_id = '58000000-0000-0000-0000-00000000000b' order by id $$,
  $$ values ('app_open'::text, '{"origine":"demarrage"}'::jsonb), ('plan_view'::text, '{}'::jsonb) $$,
  '3. le témoin garde ses repères, propriétés comprises'
);

select throws_ok(
  $$ select public.refuser_la_mesure('58000000-0000-0000-0000-0000000000ff') $$,
  null,
  '3. un identifiant inconnu fait lever la fonction, au lieu de ne rien faire en silence'
);

-- ── 4. L'export, et qui peut faire le geste ─────────────────────────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '58000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
select isnt(
  public.export_my_data() -> 'compte' ->> 'mesure_refusee_le',
  null,
  '4. l''export rend la date de l''opposition'
);
reset role;

select ok(
  not has_function_privilege('anon', 'public.refuser_la_mesure(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.refuser_la_mesure(uuid)', 'execute')
  and not has_column_privilege('authenticated', 'public.profiles', 'mesure_refusee_le', 'update'),
  '4. ni anon ni authenticated ne peuvent poser, ni lever, une opposition'
);

select * from finish();
rollback;

-- ── Relevé des mutations, 19/10/2026 ─────────────────────────────────────────────────────────
--
-- Jouées sur la stack locale, la migration appliquée : la mutation puis ce fichier dans une même
-- transaction, annulée par son `rollback`. Les numéros sont ceux des assertions.
--
--   - l'opposition retirée du déclencheur (sa condition à `false`) → 6, 7 et 9 : tout s'enregistre de
--     nouveau, et la seconde opposition a de quoi effacer ;
--   - l'ouverture d'avant gardée (le `delete` du déclencheur retiré) → 6 et 7 ;
--   - les propriétés de l'ouverture gardées → 6, seule ;
--   - `refuser_la_mesure` qui efface aussi la dernière ouverture → 2, 3 et 9 ;
--   - le geste ouvert à `authenticated` → 13, seule ;
--   - l'export sans la date de l'opposition → 12, seule ;
--   - un identifiant inconnu qui rend `null` au lieu de lever → 11, seule.
--
--   - un déclencheur qui écarte aussi l'ouverture (`if true then` au lieu de `if new.name <> 'app_open'`)
--     → 7, seule : la ligne qui reste est l'ouverture d'avant l'opposition, et c'est le `min(id)` qui le
--     voit.
--
-- La 8 (le signe de vie) ne tombe sous aucune : sous chacune, une ouverture reste, celle d'avant ou
-- celle d'après. Elle ne tomberait que si plus aucune ouverture ne restait — `refuser_la_mesure` et le
-- déclencheur fautifs ensemble —, et c'est ce qu'elle garde.
