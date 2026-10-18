-- Tests pgTAP de l'origine et de la version des pannes (migration
-- `20261018120000_l_origine_et_la_version_des_pannes.sql`, `docs/exploitation/remontee-erreurs.md` §3 ter).
--
-- **Ce qui se garde ici est une égalité entre deux côtés** : la panne la plus large que l'app envoie —
-- catégorie, route, origine, version, `differee`, `retard_h` — doit passer `check_usage_event_props`, et
-- rien de plus large. Côté app, `src/types/erreurs-en-attente.test.ts` garde qu'elle n'a pas plus de six
-- clés ; ici, que la base les accepte. Une borne resserrée en base, ou une clé de plus côté app, ferait
-- refuser chaque panne différée — et la file les vide sur un refus : perdues sans bruit.
--
-- **Et la route que l'app écrit pour la page introuvable**, `/+not-found` (`routeDeLaPanne`), doit se
-- lire dans l'alerte (`releve_des_alertes`, réécrite par `20261018110000`) : la forme des routes y
-- refusait le `+`, et toute panne de cette page arrivait « route hors forme ».
--
-- **Éprouvé en le cassant** : relevé en pied de fichier.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) values
  ('56000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '3 days', now());

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', '56000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('56000000-0000-0000-0000-00000000000a', 'app_error',
             '{"category":"reference","route":"/connexion/retrouver","origine":"promesse","version":"1.0.0+2147483647","differee":true,"retard_h":719}',
             'android') $$,
  '1. la panne différée la plus large que l''app envoie passe la borne des propriétés'
);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('56000000-0000-0000-0000-00000000000a', 'app_open', '{"origine":"retour","version":"1.0.0+14"}', 'android') $$,
  '2. une ouverture porte sa version'
);

select throws_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('56000000-0000-0000-0000-00000000000a', 'app_error',
             '{"category":"type","route":"/plan","origine":"fatale","version":"1.0.0","build":"14","differee":true,"retard_h":1}',
             'android') $$,
  '23514', null,
  '3. et pas une clé de plus : la version porte le build, faute de place pour une septième'
);

-- La page introuvable : `routeDeLaPanne` écrit `/+not-found` pour toute adresse hors du produit, et
-- l'alerte doit la nommer — seule route du produit qui porte un `+`, sans que le `+` s'ouvre aux autres.
insert into public.usage_events (user_id, name, props, platform)
select '56000000-0000-0000-0000-00000000000a', 'app_error', v.props::jsonb, 'web'
from (values
  ('{"category":"type","route":"/+not-found","origine":"globale"}'),
  ('{"category":"type","route":"/+not-found","origine":"rendu"}'),
  ('{"category":"syntax","route":"/+autre"}'),
  ('{"category":"syntax","route":"/plan+bis"}')
) as v(props);

select set_config('role', 'postgres', true);

select ok(
  (select description like '%origine : rendu%globale%fatale%promesse%' and description like '%props.version%'
   from public.usage_event_types where name = 'app_error'),
  '4. le référentiel nomme les quatre origines d''une panne, et sa version'
);

select ok(
  (select description like '%props.version%' from public.usage_event_types where name = 'app_open'),
  '5. et la version d''une ouverture'
);

select ok(
  (select r -> 'pannes_detail' @> '[{"route":"/+not-found","categorie":"type"}]'::jsonb
      and r -> 'pannes_detail' @> '[{"route":"route hors forme","categorie":"syntax"}]'::jsonb
      and (r -> 'pannes_detail')::text not like '%+autre%'
      and (r -> 'pannes_detail')::text not like '%plan+bis%'
   from (select public.releve_des_alertes(now() - interval '1 minute') as r) x),
  '6. l''alerte nomme la page introuvable, et elle seule parmi les routes qui portent un « + »'
);

select * from finish();
rollback;

-- Éprouvé en le cassant le 18/10/2026 (`TESTING.md` §1.1) : une migration temporaire qui réécrit la
-- borne (`create or replace`, ses privilèges gardés), jouée par `node scripts/rejouer-la-ci.mjs base`
-- sur une stack neuve, puis retirée :
--
--   | Ce qu'on casse | Ce qui tombe dans la suite entière |
--   |---|---|
--   | la borne des clés de `check_usage_event_props` ramenée à 5 | 1, seul |
--   | la borne des clés portée à 7 | 3, et la 5 de `12_usage_events` (« au-delà de six propriétés »), qui garde la même borne par l'autre bout |
--
-- La 4 et la 5 n'ont pas été cassées : elles lisent une description que cette migration écrit, et rien
-- d'autre ne l'écrit.
--
-- La 6, le même jour et de la même façon — une migration temporaire qui réécrit `releve_des_alertes`
-- depuis `pg_get_functiondef` :
--
--   | Ce qu'on casse | Ce qui tombe dans la suite entière |
--   |---|---|
--   | `/+not-found` plus admise (la forme d'avant) | 6, seule |
--   | le `+` admis dans toute route, au lieu de la seule page introuvable | 6, seule |
