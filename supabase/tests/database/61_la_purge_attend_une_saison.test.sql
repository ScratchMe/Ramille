-- Tests pgTAP : la purge des sessions anonymes attend 120 jours sans signe de vie, et non plus 90
-- (étape 4 de `docs/architecture/v1-35-l-audit-en-chantiers.md`, migration
-- `20261023090000_la_purge_attend_une_saison.sql`).
--
-- **Ce que ce fichier garde : la frontière elle-même.** `16`, `49` et `51` gardent ce que la purge
-- fait d'une session muette depuis cent cinquante jours, mais rien n'y distingue 90 de 120 : leurs
-- sessions partent dans les deux cas. Ici, trois sessions anonymes nées il y a deux cents jours, dont
-- seul le dernier signe de vie diffère :
--   - S1, une ouverture de l'app il y a cent jours — muette depuis plus de 90, moins de 120 : elle
--     partait avant le 23/10/2026, elle reste désormais. C'est le cas de qui revient à la saison
--     suivante ;
--   - S2, il y a cent dix-neuf jours : elle reste ;
--   - S3, il y a cent vingt et un jours : elle part.
-- Et un vrai compte (non anonyme), muet depuis deux cents jours, que la purge ne regarde jamais.
--
-- **Éprouvé en le cassant, le 23/10/2026** — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at, last_sign_in_at) values
  ('c6100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true,
   now() - interval '200 days', now(), now() - interval '200 days'),
  ('c6100000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true,
   now() - interval '200 days', now(), now() - interval '200 days'),
  ('c6100000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true,
   now() - interval '200 days', now(), now() - interval '200 days'),
  ('c6100000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', false,
   now() - interval '200 days', now(), now() - interval '200 days');

-- **L'âge d'un événement se pose après l'insertion** : un trigger ramène `occurred_at` à l'heure du
-- serveur à l'écriture (un client ne date pas ses propres événements). Inséré avec une date passée, il
-- arrive daté d'aujourd'hui — et la première écriture de ce fichier passait ses deux premières
-- assertions pour cette seule raison, S3 seule l'ayant fait voir. Même idiome que `36`.
insert into public.usage_events (user_id, name, platform)
select u, 'app_open', 'web'
from unnest(array['c6100000-0000-0000-0000-000000000001', 'c6100000-0000-0000-0000-000000000002',
                  'c6100000-0000-0000-0000-000000000003']::uuid[]) u;

update public.usage_events set occurred_at = now() - interval '100 days'
 where user_id = 'c6100000-0000-0000-0000-000000000001';
update public.usage_events set occurred_at = now() - interval '119 days'
 where user_id = 'c6100000-0000-0000-0000-000000000002';
update public.usage_events set occurred_at = now() - interval '121 days'
 where user_id = 'c6100000-0000-0000-0000-000000000003';

-- Prémisse : les âges ont tenu, sans quoi la suite ne prouve rien.
select results_eq(
  $$ select (now()::date - occurred_at::date) from public.usage_events
      where user_id::text like 'c6100000%' order by user_id $$,
  $$ values (100), (119), (121) $$,
  'prémisse : les trois signes de vie ont bien cent, cent dix-neuf et cent vingt et un jours'
);

select public.purge_stale_anonymous_accounts();

select isnt_empty(
  $$ select 1 from auth.users where id = 'c6100000-0000-0000-0000-000000000001' $$,
  'une session muette depuis cent jours reste : elle partait à 90, avant la saison suivante'
);

select isnt_empty(
  $$ select 1 from auth.users where id = 'c6100000-0000-0000-0000-000000000002' $$,
  'une session muette depuis cent dix-neuf jours reste'
);

select is_empty(
  $$ select 1 from auth.users where id = 'c6100000-0000-0000-0000-000000000003' $$,
  'une session muette depuis cent vingt et un jours part'
);

select isnt_empty(
  $$ select 1 from auth.users where id = 'c6100000-0000-0000-0000-000000000004' $$,
  'un vrai compte muet depuis deux cents jours n''est jamais purgé'
);

select ok(
  obj_description('public.purge_stale_anonymous_accounts()'::regprocedure, 'pg_proc') like '%120 jours%',
  'la description de la fonction dit la fenêtre qu''elle applique'
);

-- La même migration porte l'autre moitié de l'étape 4 : la provenance `rappels` de `connexion_view` couvre
-- aussi « Rattacher mon adresse » de la feuille du compte, sur le web.
select ok(
  (select description like '%feuille du compte%' from public.usage_event_types where name = 'connexion_view'),
  'la provenance « rappels » de connexion_view nomme aussi la feuille du compte'
);

select ok(
  not has_function_privilege('authenticated', 'public.purge_stale_anonymous_accounts()', 'execute')
    and not has_function_privilege('anon', 'public.purge_stale_anonymous_accounts()', 'execute'),
  'la purge reste fermée aux clients'
);

select * from finish();
rollback;

-- ── Relevé des mutations, 23/10/2026 ─────────────────────────────────────────────────────────
--
-- Jouées sur la stack locale, la migration appliquée : chaque mutation installée, **la suite pgTAP
-- entière** rejouée, puis la fonction et sa description restaurées. Les numéros sont ceux des
-- assertions de ce fichier, sauf mention.
--
--   - la fenêtre rendue à 90 jours → 2 et 3, et rien ailleurs : `16`, `49` et `51` vieillissent leurs
--     sessions de cent cinquante jours, qui partent dans les deux cas. C'est pour cette frontière que
--     ce fichier existe ;
--   - la fenêtre portée à 150 jours → 4, et `16` n° 2, 7, 10 à 12, `49` n° 3, 5 à 9, `51` n° 23 ;
--   - la description rendue à « 90 jours » → 6, seule ;
--   - la description de `connexion_view` rendue à son texte d'avant (ajoutée le même jour, sur un constat de
--     la contre-lecture) → 7, seule.
--
-- Et, avant toute mutation, la première écriture : les événements insérés avec une date passée
-- arrivaient datés d'aujourd'hui (le trigger de `usage_events`), et 2 et 3 passaient sans rien
-- prouver ; 4 seule tombait. D'où la prémisse 1.
--
-- `22` n° 34 (le témoin du plan de requête) a rougi par moments pendant ces passages, mutation ou
-- non : la base était réutilisée, et ce témoin dépend des statistiques que les fichiers laissent
-- (`TESTING-PGTAP.md` §2.3). Sur une stack neuve, la suite entière passe.
