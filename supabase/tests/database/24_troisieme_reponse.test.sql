-- Tests pgTAP de la troisième réponse d'un point de suivi — v1-13, chantier C2.4
-- (migration 20260912200000_troisieme_reponse_du_point.sql, base prescrite par `v1-14` §4.1).
--
-- Ce que ce fichier existe pour tenir, et qu'aucun autre ne tient :
--
--   1. **`response_kind` est la vérité, `response` la dérivée** — et la cohérence des deux est une
--      contrainte, pas une convention. Une dérivation tenue par habitude se défait au premier
--      `update` écrit ailleurs, et la divergence serait invisible : deux colonnes plausibles qui ne
--      disent pas la même chose.
--   2. **`sans_objet` est un point RÉPONDU** (`status = 'answered'`, `response` nulle). C'est tout
--      le chantier : le piège n'était pas la valeur nulle mais le **filtre** qui la lisait.
--   3. **L'ancienne signature booléenne est partie.** La garder en vie ferait deux chemins
--      d'écriture pour une même colonne, dont un qui ne connaît pas `response_kind`.
--   4. **Une réponse « sans objet » est un signe de vie** pour `regime_de_rappel` (C2.9). Sans cette
--      assertion, quelqu'un qui répond honnêtement « pas de voyage ce mois-ci » quatre fois verrait
--      ses rappels s'espacer comme s'il avait disparu — l'inverse exact de ce qu'il vient de faire.
--
-- Toutes les assertions sont bornées à leurs utilisateurs : le fichier est rejouable tel quel sur le
-- projet distant.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────
-- Les utilisateurs sont créés **avant la première assertion**, et ce n'est pas cosmétique : un
-- `throws_ok` sur une contrainte CHECK passerait aussi bien pour une clé étrangère manquante
-- (23503 au lieu de 23514), donc sans eux l'assertion serait verte sans rien éprouver.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  ('c2400000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c24-a@test.local', 'x', now(), now(), now(), false),
  ('c2400000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c24-b@test.local', 'x', now(), now(), now(), false);

select has_column('public', 'engagement_checkins', 'response_kind',
  'le point porte le genre de sa réponse');

-- ── 1. La contrainte de valeurs, et celle de cohérence ──────────────────────────────────

select throws_ok(
  $$ insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status, response_kind)
     values ('c2400000-0000-0000-0000-000000000011', 'commute', '2020-01-06', 'S', 'T', 'answered', 'peut-etre') $$,
  '23514',
  null,
  'Les trois valeurs sont fermées : rien d''autre n''entre dans response_kind'
);

-- **Les deux sens de la dérivation, et les deux comptent.** Un « oui » dont la dérivée est fausse
-- ferait mentir `analytics.engagement_by_segment` (qui compte `and c.response`) ; un « sans objet »
-- dont la dérivée est vraie le ferait compter comme un changement.
select throws_ok(
  $$ insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status, response_kind, response)
     values ('c2400000-0000-0000-0000-000000000011', 'commute', '2020-01-06', 'S', 'T', 'answered', 'oui', false) $$,
  '23514',
  null,
  'Un « oui » dont la dérivée booléenne est fausse est refusé'
);

select throws_ok(
  $$ insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status, response_kind, response)
     values ('c2400000-0000-0000-0000-000000000011', 'commute', '2020-01-06', 'S', 'T', 'answered', 'sans_objet', true) $$,
  '23514',
  null,
  'Un « sans objet » porteur d''une dérivée vraie est refusé — il serait compté comme un changement'
);

-- **L'autre moitié de la contrainte, et la forme structurelle du défaut du chantier.** Une ligne
-- `answered` sans genre est une réponse que `loadAnsweredCheckins` écarte : donnée, puis perdue,
-- sans message d'erreur. Aucun chemin de production ne peut la produire (le RPC est le seul
-- écrivain), et c'est exactement pourquoi l'invariant s'écrit — il garde le jour où un second
-- chemin apparaîtra, C4.1 par exemple.
select throws_ok(
  $$ insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status, responded_at)
     values ('c2400000-0000-0000-0000-000000000011', 'commute', '2020-01-13', 'S', 'T', 'answered', now()) $$,
  '23514',
  null,
  'Un point « répondu » sans genre de réponse est refusé — c''est une réponse perdue'
);

-- Et le sens inverse : un genre posé sur un point en attente serait une réponse qui ne s''affiche pas.
select throws_ok(
  $$ insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status, response_kind, response)
     values ('c2400000-0000-0000-0000-000000000011', 'commute', '2020-01-20', 'S', 'T', 'pending', 'oui', true) $$,
  '23514',
  null,
  'et un genre de réponse sur un point encore en attente l''est aussi'
);

select lives_ok(
  $$ insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status, response_kind, response, responded_at)
     values ('c2400000-0000-0000-0000-000000000011', 'commute', '2020-01-06', 'S', 'T', 'answered', 'sans_objet', null, now()) $$,
  'Un point répondu « sans objet » porte bien status = answered et response nulle'
);

-- ── 2. La signature, et les privilèges ──────────────────────────────────────────────────

select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'repondre_au_checkin'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, boolean'
  ),
  'La signature booléenne a disparu : un seul chemin d''écriture, celui qui connaît response_kind'
);

select ok(
  has_function_privilege('authenticated', 'public.repondre_au_checkin(uuid, text)', 'execute')
    and not has_function_privilege('anon', 'public.repondre_au_checkin(uuid, text)', 'execute'),
  'repondre_au_checkin : exécutable par authenticated seul, PUBLIC révoqué comme ailleurs'
);

-- ── 3. Le RPC, les trois réponses ───────────────────────────────────────────────────────
-- Trois points de trois périodes distinctes (la contrainte d'unicité porte sur
-- `(user_id, loop_type, period_start)`), un par réponse.

insert into public.engagement_checkins (id, user_id, loop_type, period_start, period_label, trip_label, poste)
values
  ('c2400000-0000-0000-0000-0000000000d1', 'c2400000-0000-0000-0000-000000000011', 'commute', '2026-09-07', 'Semaine du 07/09', 'Trajet domicile-travail', 'commute'),
  ('c2400000-0000-0000-0000-0000000000d2', 'c2400000-0000-0000-0000-000000000011', 'extras', '2026-09-01', 'septembre 2026', 'Voyages longue distance', 'travel'),
  ('c2400000-0000-0000-0000-0000000000d3', 'c2400000-0000-0000-0000-000000000012', 'commute', '2026-09-07', 'Semaine du 07/09', 'Trajet domicile-travail', 'commute');

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', 'c2400000-0000-0000-0000-000000000011', 'role', 'authenticated')::text, true);

select lives_ok(
  $stmt$ select public.repondre_au_checkin('c2400000-0000-0000-0000-0000000000d2'::uuid, 'sans_objet') $stmt$,
  'Répondre « pas de voyage ce mois-ci » aboutit'
);

select results_eq(
  $$ select status, response_kind, response from public.engagement_checkins
     where id = 'c2400000-0000-0000-0000-0000000000d2' $$,
  $$ select 'answered'::text, 'sans_objet'::text, null::boolean $$,
  'L''assertion du chantier : « sans objet » est un point RÉPONDU, dérivée nulle'
);

-- `now()` est l'horodatage de début de transaction : l'égalité ne tiendrait pas si la valeur venait
-- du client.
select is(
  (select responded_at from public.engagement_checkins where id = 'c2400000-0000-0000-0000-0000000000d2'),
  now(),
  'et son horodatage vient de l''horloge du serveur'
);

select lives_ok(
  $stmt$ select public.repondre_au_checkin('c2400000-0000-0000-0000-0000000000d1'::uuid, 'oui') $stmt$,
  'Répondre « oui » aboutit'
);

select results_eq(
  $$ select status, response_kind, response from public.engagement_checkins
     where id = 'c2400000-0000-0000-0000-0000000000d1' $$,
  $$ select 'answered'::text, 'oui'::text, true $$,
  'le « oui » pose la dérivée vraie — c''est elle que les vues d''analyse comptent'
);

select throws_ok(
  $stmt$ select public.repondre_au_checkin('c2400000-0000-0000-0000-0000000000d1'::uuid, 'non') $stmt$,
  '22023', null,
  'un point déjà répondu n''accepte pas une seconde réponse, « sans objet » compris'
);

-- **Le message nomme les trois valeurs**, il ne renvoie pas un nom de contrainte : un appel qui
-- envoie encore un booléen (`true` devenu la chaîne `'true'` à la conversion JSON) tombe ici.
select throws_ok(
  $stmt$ select public.repondre_au_checkin('c2400000-0000-0000-0000-0000000000d3'::uuid, 'true') $stmt$,
  '22023', null,
  'une valeur hors des trois est refusée avant toute écriture'
);

select throws_ok(
  $stmt$ select public.repondre_au_checkin('c2400000-0000-0000-0000-0000000000d3'::uuid, null) $stmt$,
  '22023', null,
  'et une réponse absente aussi'
);

-- Le point de B, sous la session de A : la vérification de propriété est à l'intérieur du RPC.
select throws_ok(
  $stmt$ select public.repondre_au_checkin('c2400000-0000-0000-0000-0000000000d3'::uuid, 'oui') $stmt$,
  'P0002', null,
  'un tiers ne répond pas à la place de quelqu''un d''autre, la troisième réponse ne change rien à ça'
);

-- L'écriture directe reste refusée par le privilège (42501) avant d'atteindre la RLS : `response_kind`
-- n'ouvre pas une porte que C1.12 avait fermée.
select throws_ok(
  $stmt$ update public.engagement_checkins set response_kind = 'oui'
         where id = 'c2400000-0000-0000-0000-0000000000d2' $stmt$,
  '42501',
  'permission denied for table engagement_checkins',
  'le genre de réponse ne s''écrit pas depuis le client, même par son propriétaire'
);

reset role;

-- ── 4. La mesure : le troisième compteur ────────────────────────────────────────────────
-- `answered` compte les trois réponses et `answered_yes` les seuls « oui » : l'écart entre les deux
-- se lisait « non ». Sans `answered_sans_objet`, il vient d'accueillir les « sans objet » sans que
-- rien ne le dise — la dérive silencieuse que `usage_events` documente ailleurs.

select results_eq(
  $$ select
       (select count(*) from public.engagement_checkins
        where user_id = 'c2400000-0000-0000-0000-000000000011' and status = 'answered')::int,
       (select count(*) from public.engagement_checkins
        where user_id = 'c2400000-0000-0000-0000-000000000011' and status = 'answered' and response)::int,
       (select count(*) from public.engagement_checkins
        where user_id = 'c2400000-0000-0000-0000-000000000011' and response_kind = 'sans_objet')::int $$,
  $$ select 3, 1, 2 $$,
  'Trois réponses comptées par « answered », un seul « oui » dans la dérivée, deux « sans objet »'
);

-- Les deux assertions qui suivent portent sur la vue **entière**, et c'est voulu : elle n'expose pas
-- `user_id` (elle agrège par segment), donc une assertion bornée à un utilisateur n'est pas
-- possible. Comparer deux agrégats du même jeu de lignes reste rejouable partout.
select is(
  (select coalesce(sum(answered_sans_objet), 0)::int from analytics.engagement_by_segment),
  (select count(*)::int from public.engagement_checkins where response_kind = 'sans_objet'),
  'La vue porte le troisième compteur, et il compte exactement les mêmes lignes que la table'
);

-- **L'assertion qui nomme la dérive.** Avant C2.4, `answered - answered_yes` se lisait « non ».
-- Depuis, cet écart vaut les « non » **plus** les « sans objet » : sans le troisième compteur, le
-- taux de réussite de la boucle aurait baissé à chaque fois que quelqu'un répond honnêtement.
select is(
  (select coalesce(sum(answered) - sum(answered_yes), 0)::int from analytics.engagement_by_segment),
  (select count(*)::int from public.engagement_checkins
   where status = 'answered' and response_kind in ('non', 'sans_objet')),
  'L''écart entre answered et answered_yes vaut les « non » ET les « sans objet » — d''où le troisième compteur'
);

-- ── 5. Un « sans objet » est un signe de vie ────────────────────────────────────────────
-- L'assertion la plus facile à casser sans le voir : `regime_de_rappel` compte les points clos
-- **depuis le dernier signe de vie** (C2.9). Si une réponse « sans objet » n'en était pas un,
-- quelqu'un qui répond honnêtement « pas de voyage ce mois-ci » quatre fois de suite verrait ses
-- rappels s'espacer comme s'il avait disparu — l'inverse exact de ce qu'il vient de faire. La paire
-- d'assertions le montre dans les deux sens : le régime bascule sans la réponse, et revient avec.

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, status)
select 'c2400000-0000-0000-0000-000000000012', 'extras',
       (date_trunc('month', now()) - (n || ' months')::interval)::date,
       'mois -' || n, 'Voyages longue distance', 'expired'
from generate_series(2, 6) n;

insert into public.engagement_checkins (id, user_id, loop_type, period_start, period_label, trip_label)
values ('c2400000-0000-0000-0000-0000000000d4', 'c2400000-0000-0000-0000-000000000012', 'extras',
        (date_trunc('month', now()) - interval '1 month')::date, 'mois écoulé', 'Voyages longue distance');

select is(
  public.regime_de_rappel('c2400000-0000-0000-0000-000000000012', 'extras'),
  'espace',
  'Cinq mois clos sans signe de vie : le régime s''espace, comme C2.9 le prévoit'
);

select set_config('request.jwt.claims', json_build_object('sub', 'c2400000-0000-0000-0000-000000000012', 'role', 'authenticated')::text, true);
select set_config('role', 'authenticated', true);
select public.repondre_au_checkin('c2400000-0000-0000-0000-0000000000d4'::uuid, 'sans_objet');
reset role;

select is(
  public.regime_de_rappel('c2400000-0000-0000-0000-000000000012', 'extras'),
  'normal',
  'Répondre « pas de voyage » est un signe de vie : le régime revient à la normale'
);

select * from finish();
rollback;
