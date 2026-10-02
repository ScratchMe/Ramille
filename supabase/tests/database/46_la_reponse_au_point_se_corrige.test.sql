-- Tests pgTAP : la réponse au point se corrige jusqu'au point suivant (`v1-33` §6, migration
-- `20261002233000_la_reponse_au_point_se_corrige.sql`).
--
-- « Non » et « Oui » sont à 8 px l'un de l'autre, et un toucher erroné était définitif. Ce fichier
-- garde ce que la correction permet, et surtout ce qu'elle ne permet pas :
--   - **P** répond « oui » à son point de la semaine interrogée, et le corrige en « non » : le genre, la
--     dérivée et l'horodatage suivent ; les libellés figés et la clé d'idempotence, non ;
--   - **P** corrige son point du mois interrogé en « sans objet » — la borne mensuelle n'est pas la
--     borne hebdomadaire ;
--   - **P** ne corrige pas un point dont la période est passée ;
--   - un tiers ne corrige pas le point de P ;
--   - **le trigger** refuse toute réécriture d'un point répondu hors de la correction, et dans la
--     correction toute colonne autre que les trois d'une réponse ; et le RPC retire son annonce.
--
-- **Éprouvé en le cassant, le 02/10/2026** (TESTING.md §1.1), six mutations, une à la fois sur la
-- stack locale, **la suite pgTAP entière** rejouée, la fonction restaurée en rejouant la migration :
--   - l'annonce du RPC oubliée → les trois corrections de ce fichier et leur relecture, et la correction
--     de `04` : le trigger lève ;
--   - l'annonce gardée après l'`update` → « le RPC retire l'annonce… », et « sans l'annonce du RPC… »,
--     qui réécrit alors un point répondu dans la même transaction ;
--   - la borne de période retirée → « un point dont la période est passée… » et sa relecture ici, la
--     seconde réponse de `24`, et le point clos de `04` ;
--   - la borne mensuelle remplacée par l'hebdomadaire → « P corrige son point du mois… » et sa relecture ;
--   - le trigger qui accepte toute colonne sous l'annonce → « même annoncée… », seul ;
--   - le trigger qui accepte la réponse sans l'annonce → « sans l'annonce du RPC… », seul.
-- **Un premier passage s'était empilé** : la fonction se restaurait depuis le mauvais fichier, et les
-- mutations se cumulaient. Ce compte est celui du second passage, chacune défaite avant la suivante et
-- un témoin vert à la fin.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('e8000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'pgtap-correction-p@test.local', 'x', now(), now()),
  ('e8000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'pgtap-correction-tiers@test.local', 'x', now(), now());

-- Trois points de P, déjà répondus — insérés tels quels, le trigger ne gardant que les mises à jour :
--   - S, la semaine interrogée en ce moment, « oui » il y a deux jours ;
--   - M, le mois interrogé en ce moment, « non » ;
--   - V, la semaine d'avant, « oui » — sa période est passée.
insert into public.engagement_checkins (id, user_id, loop_type, period_start, period_label, trip_label,
                                        status, response_kind, response, responded_at) values
  ('e8010000-0000-0000-0000-00000000000a', 'e8000000-0000-0000-0000-00000000000a', 'commute',
   date_trunc('week', now())::date - 7, 'Semaine figée', 'Trajet figé', 'answered', 'oui', true,
   now() - interval '2 days'),
  ('e8010000-0000-0000-0000-00000000000b', 'e8000000-0000-0000-0000-00000000000a', 'extras',
   (date_trunc('month', now()) - interval '1 month')::date, 'Mois figé', 'Sorties figées', 'answered',
   'non', false, now() - interval '2 days'),
  ('e8010000-0000-0000-0000-00000000000c', 'e8000000-0000-0000-0000-00000000000a', 'commute',
   date_trunc('week', now())::date - 14, 'Semaine passée', 'Trajet figé', 'answered', 'oui', true,
   now() - interval '9 days');

-- ── P corrige sa semaine ─────────────────────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'e8000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ select public.repondre_au_checkin('e8010000-0000-0000-0000-00000000000a', 'non') $$,
  'P corrige « oui » en « non » sur le point de la semaine interrogée'
);

-- Le réglage du RPC est local à la transaction : il doit être retiré dès l'`update` fait, sans quoi
-- tout ce qui suit dans la même transaction pourrait réécrire un point répondu.
select is(
  coalesce(current_setting('ramille.correction_du_point', true), ''),
  '',
  'le RPC retire l''annonce de la correction aussitôt l''écriture faite'
);

reset role;

select results_eq(
  $$ select status, response_kind, response, responded_at = now() from public.engagement_checkins
      where id = 'e8010000-0000-0000-0000-00000000000a' $$,
  $$ values ('answered'::text, 'non'::text, false, true) $$,
  'le genre, sa dérivée et l''horodatage suivent la correction ; le point reste répondu'
);

select results_eq(
  $$ select period_start, period_label, trip_label from public.engagement_checkins
      where id = 'e8010000-0000-0000-0000-00000000000a' $$,
  $$ values (date_trunc('week', now())::date - 7, 'Semaine figée'::text, 'Trajet figé'::text) $$,
  'les libellés figés et la clé d''idempotence ne bougent pas'
);

-- ── P corrige son mois, pas sa semaine passée ────────────────────────────────────────────

set local role authenticated;
select lives_ok(
  $$ select public.repondre_au_checkin('e8010000-0000-0000-0000-00000000000b', 'sans_objet') $$,
  'P corrige son point du mois interrogé — la borne mensuelle n''est pas l''hebdomadaire'
);

select throws_ok(
  $$ select public.repondre_au_checkin('e8010000-0000-0000-0000-00000000000c', 'non') $$,
  '22023',
  'Ce point de suivi n''attend plus de réponse (déjà répondu, et sa période est passée).',
  'un point dont la période est passée ne se corrige plus'
);

-- ── Un tiers ne corrige pas ──────────────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub', 'e8000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
select throws_ok(
  $$ select public.repondre_au_checkin('e8010000-0000-0000-0000-00000000000a', 'oui') $$,
  'P0002', null,
  'un tiers ne corrige pas le point de quelqu''un d''autre'
);
reset role;

select results_eq(
  $$ select response_kind from public.engagement_checkins
      where id in ('e8010000-0000-0000-0000-00000000000b', 'e8010000-0000-0000-0000-00000000000c')
      order by id $$,
  $$ values ('sans_objet'::text), ('oui'::text) $$,
  'le mois porte « sans objet », la semaine passée garde son « oui »'
);

-- ── Le trigger : hors de la correction, rien ; dans la correction, la réponse seule ──────

select throws_ok(
  $$ update public.engagement_checkins set response_kind = 'oui', response = true
      where id = 'e8010000-0000-0000-0000-00000000000c' $$,
  'P0001', null,
  'sans l''annonce du RPC, un point répondu ne se réécrit pas, même par le serveur (C1.12)'
);

select set_config('ramille.correction_du_point', 'oui', true);

select throws_ok(
  $$ update public.engagement_checkins set response_kind = 'oui', response = true, period_label = 'Réécrit'
      where id = 'e8010000-0000-0000-0000-00000000000a' $$,
  'P0001', null,
  'même annoncée, une correction ne touche que les trois colonnes d''une réponse'
);

select lives_ok(
  $$ update public.engagement_checkins set response_kind = 'oui', response = true
      where id = 'e8010000-0000-0000-0000-00000000000a' $$,
  'annoncée, la correction des trois colonnes passe le trigger'
);

select set_config('ramille.correction_du_point', '', true);

select * from finish();
rollback;
