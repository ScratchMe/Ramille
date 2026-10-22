-- L'adresse IP et l'appareil d'une session s'effacent après 90 jours sans utilisation
-- (migration `20261022123448_l_ip_des_sessions_s_efface.sql`, décision du 22/10/2026).
--
-- Ce que ce fichier garde :
--   * qu'une session **inutilisée depuis plus de 90 jours** perd son adresse IP et son appareil, et
--     **reste** — la fermer déconnecterait la personne, et une session anonyme fermée est un bilan perdu ;
--   * que la dernière utilisation est le **plus récent** de `refreshed_at`, `updated_at` et `created_at` :
--     une session renouvelée hier, même créée il y a cent jours, garde tout ;
--   * que le ménage rend ce qu'il a effacé, et ne recompte pas une session déjà effacée.
--
-- **Une base vécue ne fausse rien** : tout se juge sur les sessions du fichier, et le compte rendu en
-- différence entre deux passages.
--
-- Éprouvé en le cassant le 22/10/2026 (`TESTING.md` §1.1) — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('a5900000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pgtap-ip-des-sessions@test.local', '', now() - interval '200 days', now());

-- Quatre sessions d'un même compte, toutes avec une adresse et un appareil :
--   s1 : renouvelée il y a cent jours, rien depuis → effacée ;
--   s2 : renouvelée il y a dix jours → gardée ;
--   s3 : jamais renouvelée, mise à jour il y a cent jours → effacée ;
--   s4 : créée il y a cent jours, mais renouvelée hier → gardée (le plus récent l'emporte) ;
--   s5 : créée il y a cent cinquante jours, jamais renouvelée, mais mise à jour il y a dix jours → gardée
--        (`updated_at` compte aussi : la contre-lecture du 22/10/2026 l'a vu sans garde).
insert into auth.sessions (id, user_id, created_at, updated_at, refreshed_at, ip, user_agent) values
  ('a5900000-0000-0000-0000-0000000000a1', 'a5900000-0000-0000-0000-000000000001',
   now() - interval '150 days', now() - interval '100 days', (now() - interval '100 days') at time zone 'UTC',
   '203.0.113.1', 'pgtap-appareil-1'),
  ('a5900000-0000-0000-0000-0000000000a2', 'a5900000-0000-0000-0000-000000000001',
   now() - interval '150 days', now() - interval '10 days', (now() - interval '10 days') at time zone 'UTC',
   '203.0.113.2', 'pgtap-appareil-2'),
  ('a5900000-0000-0000-0000-0000000000a3', 'a5900000-0000-0000-0000-000000000001',
   now() - interval '150 days', now() - interval '100 days', null,
   '203.0.113.3', 'pgtap-appareil-3'),
  ('a5900000-0000-0000-0000-0000000000a4', 'a5900000-0000-0000-0000-000000000001',
   now() - interval '100 days', now() - interval '100 days', (now() - interval '1 day') at time zone 'UTC',
   '203.0.113.4', 'pgtap-appareil-4'),
  ('a5900000-0000-0000-0000-0000000000a5', 'a5900000-0000-0000-0000-000000000001',
   now() - interval '150 days', now() - interval '10 days', null,
   '203.0.113.5', 'pgtap-appareil-5');

create temporary table premier on commit drop as select public.menage_des_jetons_d_auth() as r;

select results_eq(
  $$ select id::text, ip is null, user_agent is null from auth.sessions
     where user_id = 'a5900000-0000-0000-0000-000000000001' order by id $$,
  $$ values
       ('a5900000-0000-0000-0000-0000000000a1', true, true),
       ('a5900000-0000-0000-0000-0000000000a2', false, false),
       ('a5900000-0000-0000-0000-0000000000a3', true, true),
       ('a5900000-0000-0000-0000-0000000000a4', false, false),
       ('a5900000-0000-0000-0000-0000000000a5', false, false) $$,
  'les sessions inutilisées depuis 90 jours perdent adresse et appareil, les autres les gardent'
);

select is(
  (select count(*)::int from auth.sessions where user_id = 'a5900000-0000-0000-0000-000000000001'),
  5,
  'aucune session n''est fermée'
);

select is(
  (select ip::text from auth.sessions where id = 'a5900000-0000-0000-0000-0000000000a4'),
  '203.0.113.4/32',
  'une session renouvelée hier garde son adresse, même créée il y a cent jours'
);

select ok(
  (select (r ->> 'sessions_effacees')::int >= 2 from premier),
  'le ménage rend le nombre de sessions effacées'
);

select ok(
  (select r ? 'jetons_revoques' and r ? 'connexions_abandonnees' from premier),
  'le ménage rend toujours ce qu''il rendait'
);

create temporary table deuxieme on commit drop as select public.menage_des_jetons_d_auth() as r;

select ok(
  (select (s.r ->> 'sessions_effacees')::int < (p.r ->> 'sessions_effacees')::int from premier p, deuxieme s),
  'une session déjà effacée n''est pas recomptée la nuit suivante'
);

-- La personne revient : GoTrue réécrit l'adresse au renouvellement, et le compteur repart.
update auth.sessions
set ip = '203.0.113.9', user_agent = 'pgtap-appareil-revenu', refreshed_at = now() at time zone 'UTC'
where id = 'a5900000-0000-0000-0000-0000000000a1';

create temporary table troisieme on commit drop as select public.menage_des_jetons_d_auth() as r;

select is(
  (select ip::text from auth.sessions where id = 'a5900000-0000-0000-0000-0000000000a1'),
  '203.0.113.9/32',
  'une session revenue garde sa nouvelle adresse'
);

select is(
  (select ip::text from auth.sessions where id = 'a5900000-0000-0000-0000-0000000000a5'),
  '203.0.113.5/32',
  'une session jamais renouvelée mais mise à jour il y a dix jours garde son adresse'
);

select ok(
  not has_function_privilege('authenticated', 'public.menage_des_jetons_d_auth()', 'execute'),
  'le ménage reste fermé aux clients'
);

select * from finish();
rollback;

-- ── Relevé des mutations, 22/10/2026 ─────────────────────────────────────────────────────────
--
-- Jouées sur la stack locale, la migration appliquée : la mutation puis ce fichier dans une même
-- transaction, annulée par son `rollback`. Les numéros sont ceux des assertions.
--
--   - jamais d'effacement (9 000 jours au lieu de 90) → 1, 4 et 6 ;
--   - la seule date de création → 1, 3 et 7 : une session renouvelée hier, ou revenue, perd son adresse ;
--   - `refreshed_at` ignoré (la seule `updated_at`) → 1, 3 et 7, pour la même raison ;
--   - les sessions fermées (`delete`) au lieu d'effacées → 1, 2 et 7 ;
--   - les lignes déjà vides recomptées (le filtre `ip is not null or user_agent is not null` retiré) → 6,
--     seule ;
--   - l'adresse effacée sans l'appareil → 1 et 6 ;
--   - `updated_at` retiré de la dernière utilisation (ajoutée après la contre-lecture du même jour, qui
--     l'a vue passer) → 1 et 8.
--
-- La 5 (les clés d'avant toujours rendues) et la 9 (le ménage fermé aux clients) gardent ce que la
-- substitution aurait pu défaire : un retour réécrit sans `jetons_revoques`, un `create or replace` qui
-- rouvrirait la fonction. Aucune des six mutations ne les vise.
