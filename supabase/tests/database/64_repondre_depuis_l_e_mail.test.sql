-- Tests pgTAP : répondre au point depuis l'e-mail (24/10/2026, étape 6b de `v1-35`, migration
-- `repondre_depuis_l_e_mail`).
--
-- Ce qui est gardé :
--   1. le message porte trois liens de réponse, chacun avec le jeton de SA ligne, distinct de celui de la
--      désinscription et de celui des autres messages, et la troisième réponse dans les mots de la carte ;
--   2. `libelle_sans_objet`, la jumelle SQL de `libelleSansObjet` — les mêmes chaînes que
--      `src/types/checkin.test.ts` ;
--   3. la lecture par le jeton, sans session : la question du message, l'état du point, la boucle qui tourne
--      ou non, et rien qui désigne un compte — puis, la période passée, la question seule ;
--   4. la réponse par le jeton, sans session : elle écrit le seul point du jeton, se corrige jusqu'à la fin de
--      la période, refuse un point clos, un point répondu dont la période est passée, un jeton inconnu, et
--      marque l'usage du lien ;
--   5. un seul écrivain : `repondre_au_checkin` répond toujours sous la session, et refuse le point d'un
--      autre ;
--   6. les privilèges, l'export, et la contrainte du mot de la veille.
--
-- Éprouvé en le cassant le 24/10/2026 — le relevé est au pied du fichier.
begin;
create extension if not exists pgtap with schema extensions;

select plan(29);

-- ── Fixtures ────────────────────────────────────────────────────────────────────────────
-- A a un bilan qui fait tourner les deux boucles (un trajet, des sorties chaque semaine) ; B n'en a pas.
-- Quatre points pour A : P1 et P2 en attente, P3 qui sera clos, P4 qui sera répondu sur une période passée.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
values
  ('f6400000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'pgtap-lien-a@test.local', 'x', now(), false, now(), now()),
  ('f6400000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'pgtap-lien-b@test.local', 'x', now(), false, now(), now());

insert into public.assessments (id, user_id, status)
values ('f6410000-0000-0000-0000-00000000000a', 'f6400000-0000-0000-0000-00000000000a', 'completed');
insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, leisure_mode,
  leisure_distance_bracket, leisure_car_engine, household_vehicles, zone_type, tc_access)
values ('f6410000-0000-0000-0000-00000000000a', true, 5, 20, 'voiture', 'thermique', 'weekly', 'voiture',
        '15_30', 'thermique', '1', 'periurbain', 'bon');
select public.recompute_assessment_results('f6410000-0000-0000-0000-00000000000a');

-- Les périodes : celle que les générateurs interrogent en ce moment, et deux semaines plus tôt.
insert into public.engagement_checkins (id, user_id, loop_type, period_start, period_label, trip_label, poste)
values
  ('f6420000-0000-0000-0000-0000000000a1', 'f6400000-0000-0000-0000-00000000000a', 'commute',
   date_trunc('week', now())::date - 7, 'Semaine dernière', 'Trajet domicile-travail', 'commute'),
  ('f6420000-0000-0000-0000-0000000000a2', 'f6400000-0000-0000-0000-00000000000a', 'extras',
   (date_trunc('month', now()) - interval '1 month')::date, 'Mois dernier', 'Sorties', 'leisure'),
  ('f6420000-0000-0000-0000-0000000000a3', 'f6400000-0000-0000-0000-00000000000a', 'commute',
   date_trunc('week', now())::date - 21, 'Il y a trois semaines', 'Trajet domicile-travail', 'commute'),
  ('f6420000-0000-0000-0000-0000000000a4', 'f6400000-0000-0000-0000-00000000000a', 'commute',
   date_trunc('week', now())::date - 14, 'Il y a deux semaines', 'Trajet domicile-travail', 'commute'),
  ('f6420000-0000-0000-0000-0000000000b1', 'f6400000-0000-0000-0000-00000000000b', 'commute',
   date_trunc('week', now())::date - 7, 'Semaine dernière', 'Trajet domicile-travail', 'commute');

select public.enqueue_checkin_reminders();

-- P3 est clos par le passage suivant, P4 a été répondu dans sa semaine : deux chemins de production, posés
-- ici sur des lignes encore en attente (le trigger ne garde que les lignes répondues).
update public.engagement_checkins set status = 'expired' where id = 'f6420000-0000-0000-0000-0000000000a3';
update public.engagement_checkins
set status = 'answered', response_kind = 'oui', response = true, responded_at = now() - interval '10 days'
where id = 'f6420000-0000-0000-0000-0000000000a4';

select set_config('test.p' || right(checkin_id::text, 2), jeton_de_reponse::text, true)
from public.notification_outbox
where user_id in ('f6400000-0000-0000-0000-00000000000a', 'f6400000-0000-0000-0000-00000000000b');

-- ── 1. Le message ───────────────────────────────────────────────────────────────────────

select is(
  (select count(*)::int from public.notification_outbox
   where user_id in ('f6400000-0000-0000-0000-00000000000a', 'f6400000-0000-0000-0000-00000000000b')
     and jeton_de_reponse is not null),
  5,
  'chaque rappel d''un point porte un jeton de réponse'
);

select ok(
  (select bool_and(
     (length(body) - length(replace(body, 'jeton=' || jeton_de_reponse::text, '')))
       / length('jeton=' || jeton_de_reponse::text) = 3)
   from public.notification_outbox
   where user_id in ('f6400000-0000-0000-0000-00000000000a', 'f6400000-0000-0000-0000-00000000000b')),
  'le message porte trois liens de réponse, et c''est le jeton de SA ligne qu''ils portent'
);

select ok(
  (select bool_and(
     body like '%Oui : %/point?jeton=' || jeton_de_reponse::text || '&reponse=oui' || E'\n%'
     and body like '%Non : %/point?jeton=' || jeton_de_reponse::text || '&reponse=non' || E'\n%')
   from public.notification_outbox
   where user_id in ('f6400000-0000-0000-0000-00000000000a', 'f6400000-0000-0000-0000-00000000000b')),
  'chaque lien dit la réponse qu''il porte, dans les mots des boutons de la carte'
);

select ok(
  (select bool_and(
     body like '%' || public.libelle_sans_objet(c.loop_type, c.poste, c.period_start)
       || ' : %/point?jeton=' || o.jeton_de_reponse::text || '&reponse=sans_objet' || E'\n%')
   from public.notification_outbox o join public.engagement_checkins c on c.id = o.checkin_id
   where o.user_id in ('f6400000-0000-0000-0000-00000000000a', 'f6400000-0000-0000-0000-00000000000b')),
  'la troisième réponse est nommée comme sous les boutons de la carte, période comprise'
);

select ok(
  (select count(distinct jeton_de_reponse) = count(*)
          and bool_and(jeton_de_reponse <> unsubscribe_token)
   from public.notification_outbox
   where user_id in ('f6400000-0000-0000-0000-00000000000a', 'f6400000-0000-0000-0000-00000000000b')),
  'un jeton par message, distinct de celui de la désinscription : l''un ne peut pas servir à l''autre'
);

-- ── 2. Les jumelles de `libelleSansObjet` et de `debutDePeriodeInterrogee` ───────────────────

select results_eq(
  $$ select public.libelle_sans_objet(l, p, '2026-09-01')
     from (values (1, 'commute', 'commute'), (2, 'extras', 'leisure'), (3, 'extras', 'travel'),
                  (4, 'extras', null)) v(n, l, p)
     order by n $$,
  $$ values ('Pas de trajet la semaine dernière'), ('Pas de sortie en septembre'),
            ('Pas de voyage en septembre'), ('Pas de déplacement en septembre') $$,
  'libelle_sans_objet rend les chaînes de libelleSansObjet, mot pour mot'
);

-- La borne que l'écrivain et la lecture partagent : la formule des deux générateurs, écrite une fois.
select results_eq(
  $$ select public.debut_de_la_periode_interrogee('commute'), public.debut_de_la_periode_interrogee('extras') $$,
  $$ select date_trunc('week', now())::date - 7, (date_trunc('month', now()) - interval '1 month')::date $$,
  'debut_de_la_periode_interrogee rend le lundi d''avant et le premier du mois d''avant, comme les générateurs'
);

-- ── 3. La lecture, sans session ─────────────────────────────────────────────────────────

-- La question attendue, lue avant de quitter `postgres` : `anon` ne lit pas la table, et c'est le propos.
select set_config('test.question_a1',
  (select coalesce(c.committed_question,
                   public.checkin_question(c.loop_type, c.question_kind, c.poste, c.mode, c.period_start))
   from public.engagement_checkins c where c.id = 'f6420000-0000-0000-0000-0000000000a1'), true);

set local role anon;

select results_eq(
  $$ select question, ouvert, status, response_kind, boucle_tourne
     from public.le_point_du_lien(current_setting('test.pa1')::uuid) $$,
  $$ values (current_setting('test.question_a1'), true, 'pending'::text, null::text, true) $$,
  'la lecture rend la question du message et l''état du point, et la boucle de A tourne'
);

select is(
  (select boucle_tourne from public.le_point_du_lien(current_setting('test.pb1')::uuid)),
  false,
  'sans bilan, la boucle ne tourne pas : la page ne donnera pas rendez-vous'
);

-- **Passé la période, le jeton ne rend plus que la question** : un e-mail gardé six mois, ou transféré, ne dit
-- ni la réponse, ni son heure, ni les kilos, ni qu'un bilan a été retiré. P4 a été répondu « oui » sur une
-- période passée, P3 a été clos sans réponse : les deux se lisent pareil.
select results_eq(
  $$ select checkin_id, l.question is not null, l.ouvert, l.status, l.response_kind, l.responded_at,
            l.committed_saving_kg_once, l.boucle_tourne
     from (values ('a3', current_setting('test.pa3')), ('a4', current_setting('test.pa4'))) v(checkin_id, jeton)
     cross join lateral public.le_point_du_lien(v.jeton::uuid) l
     order by checkin_id $$,
  $$ values ('a3'::text, true, false, null::text, null::text, null::timestamptz, null::numeric, false),
            ('a4'::text, true, false, null::text, null::text, null::timestamptz, null::numeric, false) $$,
  'passé la période, la lecture ne rend que la question : ni réponse, ni heure, ni kilos, ni boucle'
);

select is_empty(
  $$ select 1 from public.le_point_du_lien('00000000-0000-4000-8000-000000000000') $$,
  'un jeton inconnu ne lit rien'
);

select is_empty(
  $$ select 1 from public.le_point_du_lien(null) $$,
  'sans jeton, rien non plus'
);

reset role;

select ok(
  (select not (proargnames && array['id', 'user_id', 'checkin_id', 'email', 'recipient_email',
                                     'unsubscribe_token', 'jeton_de_reponse'])
   from pg_proc where oid = 'public.le_point_du_lien(uuid)'::regprocedure),
  'la lecture ne rend rien qui désigne le compte, le point ou un autre jeton'
);

-- ── 4. La réponse, sans session ─────────────────────────────────────────────────────────

set local role anon;
select set_config('test.lignes', public.repondre_par_le_lien(current_setting('test.pa1')::uuid, 'oui')::text, true);
reset role;

select is(current_setting('test.lignes'), '1', 'la réponse par le lien aboutit sans session');

select results_eq(
  $$ select status, response_kind, response, responded_at is not null
     from public.engagement_checkins where id = 'f6420000-0000-0000-0000-0000000000a1' $$,
  $$ values ('answered'::text, 'oui'::text, true, true) $$,
  'le point du jeton est répondu « oui », la dérivée posée par le même écrivain'
);

select is(
  (select status from public.engagement_checkins where id = 'f6420000-0000-0000-0000-0000000000a2'),
  'pending',
  'l''autre point de A n''a pas bougé : le jeton n''atteint que le sien'
);

select results_eq(
  $$ select checkin_id, lien_de_reponse_utilise_le is not null
     from public.notification_outbox
     where user_id = 'f6400000-0000-0000-0000-00000000000a' order by checkin_id $$,
  $$ values ('f6420000-0000-0000-0000-0000000000a1'::uuid, true),
            ('f6420000-0000-0000-0000-0000000000a2'::uuid, false),
            ('f6420000-0000-0000-0000-0000000000a3'::uuid, false),
            ('f6420000-0000-0000-0000-0000000000a4'::uuid, false) $$,
  'l''usage du lien est marqué sur son seul message'
);

set local role anon;
select set_config('test.lignes', public.repondre_par_le_lien(current_setting('test.pa1')::uuid, 'non')::text, true);
reset role;

select is(
  (select response_kind from public.engagement_checkins where id = 'f6420000-0000-0000-0000-0000000000a1'),
  'non',
  'le même lien corrige la réponse tant que la période court, comme « Modifier ma réponse »'
);

set local role anon;

select throws_ok(
  $$ select public.repondre_par_le_lien(current_setting('test.pa3')::uuid, 'oui') $$,
  '22023',
  'Ce point de suivi n''attend plus de réponse (clos par la période suivante).',
  'un point clos refuse la réponse, avec le refus de la carte'
);

select throws_ok(
  $$ select public.repondre_par_le_lien(current_setting('test.pa4')::uuid, 'non') $$,
  '22023',
  'Ce point de suivi n''attend plus de réponse (déjà répondu, et sa période est passée).',
  'un point répondu dont la période est passée ne se corrige plus par le lien'
);

select throws_ok(
  $$ select public.repondre_par_le_lien('00000000-0000-4000-8000-000000000000', 'oui') $$,
  '22023',
  'Ce lien de réponse n''est plus valable.',
  'un jeton inconnu est refusé comme un point clos : il n''y a rien à réessayer'
);

select throws_ok(
  $$ select public.repondre_par_le_lien(current_setting('test.pa2')::uuid, 'peut-être') $$,
  '22023',
  'Réponse invalide : un point de suivi se répond par « oui », « non » ou « sans_objet ».',
  'une réponse hors des trois est refusée par le même écrivain'
);

reset role;

select is(
  (select response_kind from public.engagement_checkins where id = 'f6420000-0000-0000-0000-0000000000a4'),
  'oui',
  'le refus n''a rien écrit sur le point passé'
);

-- ── 5. Un seul écrivain : la session répond toujours, et seulement pour elle ──────────────

select set_config('request.jwt.claims',
  json_build_object('sub', 'f6400000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  public.repondre_au_checkin('f6420000-0000-0000-0000-0000000000a2', 'sans_objet'),
  1,
  'repondre_au_checkin répond toujours sous la session du compte'
);

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', 'f6400000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok(
  $$ select public.repondre_au_checkin('f6420000-0000-0000-0000-0000000000a2', 'oui') $$,
  'P0002',
  'Point de suivi introuvable.',
  'et refuse le point d''un autre compte, sans rien en dire'
);

reset role;

-- ── 6. Les privilèges, l'export, le mot de la veille ────────────────────────────────────

select ok(
  has_function_privilege('anon', 'public.le_point_du_lien(uuid)', 'execute')
    and has_function_privilege('anon', 'public.repondre_par_le_lien(uuid, text)', 'execute')
    and has_function_privilege('authenticated', 'public.le_point_du_lien(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.repondre_par_le_lien(uuid, text)', 'execute'),
  'la lecture et la réponse par le lien sont appelables sans session : le jeton est l''autorisation'
);

select ok(
  not has_function_privilege('anon', 'public.ecrire_la_reponse_du_point(uuid, uuid, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.ecrire_la_reponse_du_point(uuid, uuid, text)', 'execute')
    and not has_function_privilege('anon', 'public.libelle_sans_objet(text, text, date)', 'execute')
    and not has_function_privilege('authenticated', 'public.libelle_sans_objet(text, text, date)', 'execute')
    and not has_function_privilege('anon', 'public.debut_de_la_periode_interrogee(text)', 'execute')
    and not has_function_privilege('authenticated', 'public.debut_de_la_periode_interrogee(text)', 'execute'),
  'l''écrivain, qui prend le compte en argument, est fermé à tout client — comme le libellé et la borne'
);

select set_config('request.jwt.claims',
  json_build_object('sub', 'f6400000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;

select ok(
  (select bool_or(r ->> 'lien_de_reponse_utilise_le' is not null)
          and bool_and(position(current_setting('test.pa1') in coalesce(r ->> 'message', '')) = 0)
   from jsonb_array_elements(public.export_my_data() -> 'rappels_envoyes') r),
  'l''export rend l''usage du lien, et jamais le jeton de réponse'
);

reset role;

select throws_ok(
  $$ insert into public.notification_outbox (user_id, channel, subject, body, genre, jour_vise,
                                             jeton_de_reponse)
     values ('f6400000-0000-0000-0000-00000000000a', 'push', 'Demain', 'Demain', 'veille', current_date,
             gen_random_uuid()) $$,
  '23514',
  null,
  'le mot de la veille ne porte pas de jeton de réponse : il n''a pas de question'
);

select * from finish();
rollback;

-- Relevé des mutations, le 24/10/2026, une à la fois (`scratchpad/muter-sql.sh`), puis rejouées après la
-- contre-lecture du même soir sur la lecture bornée, la borne partagée et les liens au jeton d'abord :
--   - la lecture sans le filtre du jeton (`where p_jeton is not null`) → « la lecture rend la question du
--     message », puis la suite s'arrête sur « plus d'un rang » ;
--   - la lecture qui rend la réponse d'un point passé (`c.response_kind` sans la borne) → « passé la période,
--     la lecture ne rend que la question », seule ; la boucle rendue sans la borne → la même, seule ;
--   - la réponse qui ne marque pas l'usage du lien → « l'usage du lien est marqué » et l'export ;
--   - le jeton de réponse égal à celui de la désinscription → « trois liens… le jeton de SA ligne » et « un
--     jeton par message, distinct » ;
--   - `libelle_sans_objet` qui dit « cette semaine » → « rend les chaînes de libelleSansObjet », seule : le
--     message et la jumelle se suivent, et c'est le test Jest de `libelleSansObjet` qui tient l'autre moitié ;
--   - l'écrivain sans la borne de la correction → « ne se corrige plus par le lien » et « le refus n'a rien
--     écrit » ;
--   - la borne partagée reculée d'une semaine → sa propre assertion, « passé la période… », et les deux du
--     point passé : l'écrivain et la lecture la lisent bien tous les deux ;
--   - la réponse par le lien écrite au nom d'un compte nul → la première réponse lève `P0002`, la suite
--     s'arrête ;
--   - la boucle dite toujours en train de tourner → « sans bilan, la boucle ne tourne pas », seule ;
--   - l'écrivain ouvert à `anon` → « l'écrivain… est fermé à tout client », seule ;
--   - la contrainte du mot de la veille retirée → « le mot de la veille ne porte pas de jeton », seule.
