-- Tests pgTAP de la passe de sécurité avant le lancement public (migration
-- `20261005170000_la_passe_avant_le_lancement.sql`, `v1-27` §12.38) : ce qu'un inconnu pouvait faire
-- avec une session anonyme, et ce qui l'en empêche désormais. Les plafonds se lisent des deux côtés —
-- au seuil, refusé ; une unité ou une fenêtre en dessous, accepté. Les tests qui touchent à d'autres
-- fichiers sont ailleurs : l'alerte en `42`, le plafond de l'adresse en `50`, la garde de la purge en
-- `16`, `36` et `49`.
--
-- **Ni Cloudflare ni Expo ne sont appelés** : la CI n'a pas de réseau vers eux, et un vrai appel n'a
-- rien à faire dans un test. Les deux appels vivent chacun dans une fonction à part
-- (`verifier_le_jeton_du_captcha`, `envoyer_a_expo`), remplacée ici dans la transaction.
--
-- **Éprouvé en le cassant** : relevé en pied de fichier.
begin;
create extension if not exists pgtap with schema extensions;

select plan(43);

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) values
  ('51000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '3 days', now()),
  ('51000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '3 days', now()),
  ('51000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now() - interval '3 days', now());

create function pg_temp.en_tant_que(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- ── 1. Les événements d'usage : des nombres bornés ──────────────────────────────────────────

select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');

select throws_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('51000000-0000-0000-0000-00000000000a', 'app_open',
             jsonb_build_object('n', ('1' || repeat('0', 40))::numeric), 'web') $$,
  '23514', null,
  '1. un nombre de 41 chiffres dans les propriétés d''un événement est refusé : 400 Ko l''événement, avant'
);

select lives_ok(
  $$ insert into public.usage_events (user_id, name, props, platform)
     values ('51000000-0000-0000-0000-00000000000a', 'app_open', '{"n": 0.30000000000000004}', 'web') $$,
  '2. et un nombre qu''un client écrit vraiment passe, décimales d''un `double` comprises'
);

-- ── 2. Les bilans : un en cours à la fois, dix par jour ─────────────────────────────────────

select lives_ok(
  $$ insert into public.assessments (user_id, status) values ('51000000-0000-0000-0000-00000000000a', 'in_progress') $$,
  '3. un compte crée son bilan en cours'
);

select throws_ok(
  $$ insert into public.assessments (user_id, status) values ('51000000-0000-0000-0000-00000000000a', 'in_progress') $$,
  '23505', null,
  '4. pas un second tant que le premier est en cours : l''app reprend celui qui traîne'
);

select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000b');

select throws_ok(
  $$ insert into public.assessments (user_id, status) values
       ('51000000-0000-0000-0000-00000000000b', 'in_progress'),
       ('51000000-0000-0000-0000-00000000000b', 'in_progress') $$,
  '23505', null,
  '5. et une insertion de plusieurs lignes est refusée en bloc'
);

-- Neuf bilans finalisés dans les vingt-quatre heures, écrits en propriétaire.
reset role;
insert into public.assessments (user_id, status, created_at)
select '51000000-0000-0000-0000-00000000000b', 'completed', now() - interval '1 hour' from generate_series(1, 9);
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000b');

select lives_ok(
  $$ insert into public.assessments (user_id, status) values ('51000000-0000-0000-0000-00000000000b', 'in_progress') $$,
  '6. le dixième bilan du jour se crée'
);

reset role;
update public.assessments set status = 'completed'
 where user_id = '51000000-0000-0000-0000-00000000000b' and status = 'in_progress';
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000b');

select throws_ok(
  $$ insert into public.assessments (user_id, status) values ('51000000-0000-0000-0000-00000000000b', 'in_progress') $$,
  'RM002', null,
  '7. le onzième non : vingt mille bilans s''inséraient en deux secondes'
);

reset role;
update public.assessments set created_at = now() - interval '25 hours'
 where user_id = '51000000-0000-0000-0000-00000000000b';
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000b');

select lives_ok(
  $$ insert into public.assessments (user_id, status) values ('51000000-0000-0000-0000-00000000000b', 'in_progress') $$,
  '8. vingt-quatre heures plus tard, un bilan se crée de nouveau'
);

-- ── 3. Les réponses : des distances et une part bornées ────────────────────────────────────
--
-- Sur le bilan en cours de A, des réponses écrites par le client, puis changées une à une — la policy
-- de mise à jour le permet tant que le bilan est en cours. Un refus n'écrit rien.

select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');

insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
)
select a.id, true, 5, 20, 'voiture', false, false, 'rarely' from public.assessments a
 where a.user_id = '51000000-0000-0000-0000-00000000000a' and a.status = 'in_progress';

create function pg_temp.repondre(p_colonne text, p_valeur text) returns void language plpgsql as $$
begin
  execute format(
    'update public.assessment_answers set %I = %s where assessment_id = '
    '(select id from public.assessments where user_id = ''51000000-0000-0000-0000-00000000000a'' and status = ''in_progress'')',
    p_colonne, p_valeur);
end;
$$;

select throws_ok($$ select pg_temp.repondre('commute_distance_km', '''NaN''::numeric') $$, '23514', null,
  '9. une distance `NaN` est refusée : `> 0` la laissait passer, et elle empoisonnait toutes les moyennes');
select throws_ok($$ select pg_temp.repondre('commute_distance_km', '''Infinity''::numeric') $$, '23514', null,
  '10. `Infinity` aussi');
select throws_ok($$ select pg_temp.repondre('leisure_distance_km', '10000.01') $$, '23514', null,
  '11. une sortie au-delà de 10 000 km aussi');
select throws_ok($$ select pg_temp.repondre('commute_distance_km', ('1.' || repeat('0', 20) || '1')) $$, '23514', null,
  '12. et une distance de 21 décimales, sous la borne mais longue comme on veut');
select lives_ok($$ select pg_temp.repondre('commute_distance_km', '10000') $$,
  '13. 10 000 km passent : la borne n''arrête aucun trajet réel');
select throws_ok($$ select pg_temp.repondre('commute_second_mode_share', ('0.' || repeat('3', 21))) $$, '23514', null,
  '14. une part de 21 décimales est refusée');
-- La liste des transports proches, signalée aussi, ne grossit pas : le trigger la range et la
-- dédoublonne avant l'écriture. Épinglé ici, parce que c'est lui qui la borne.
select lives_ok($$ select pg_temp.repondre('transports_proches', 'array[''bus'',''bus'',''bus'',''bus'',''bus'',''rer'']') $$,
  '15. une liste de transports proches pleine de doublons s''écrit');
select is(
  (select transports_proches from public.assessment_answers aa join public.assessments a on a.id = aa.assessment_id
    where a.user_id = '51000000-0000-0000-0000-00000000000a' and a.status = 'in_progress'),
  array['rer', 'bus'],
  '16. rangée et dédoublonnée : elle ne compte jamais plus de cinq valeurs');

-- ── 4. Les jetons d'appareil : dix neufs par jour ───────────────────────────────────────────

reset role;
insert into public.push_tokens (token, user_id, platform)
select 'ExponentPushToken[pgtap-51-' || g || ']', '51000000-0000-0000-0000-00000000000a', 'android'
from generate_series(1, 9) as g;
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');

select lives_ok($$ select public.register_push_token('ExponentPushToken[pgtap-51-10]', 'android') $$,
  '17. le dixième jeton neuf du jour s''enregistre');
select throws_ok($$ select public.register_push_token('ExponentPushToken[pgtap-51-11]', 'android') $$, 'RM002', null,
  '18. le onzième non : chaque jeton inventé laissait une ligne pour 90 jours');
select lives_ok($$ select public.register_push_token('ExponentPushToken[pgtap-51-3]', 'android') $$,
  '19. un appareil qui rappelle avec son jeton passe toujours : il existe déjà');

-- ── 5. Les engagements : trente archivés par jour ───────────────────────────────────────────

reset role;
insert into public.plan_cycles (id, user_id, cadence_type, period_label, period_start, period_end, trip_label, target_reduction_pct) values
  ('51000000-0000-0000-0000-0000000000c1', '51000000-0000-0000-0000-00000000000a', 'season', 'Saison en cours', '2020-06-21', '2020-09-21', 'trajet', 10);
insert into public.plan_actions (id, plan_cycle_id, action_template_id) values
  ('51000000-0000-0000-0000-0000000000d1', '51000000-0000-0000-0000-0000000000c1',
   (select id from public.action_templates where poste = 'leisure' order by action_text limit 1));
insert into public.plan_action_commitments_archive (user_id, plan_cycle_id, action_template_id, action_text, committed_at, released_reason)
select '51000000-0000-0000-0000-00000000000a', '51000000-0000-0000-0000-0000000000c1', t.id, t.action_text, now() - interval '1 hour', 'modification'
from public.action_templates t, generate_series(1, 29)
where t.id = (select id from public.action_templates where poste = 'leisure' order by action_text limit 1);
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');

select lives_ok($$ select public.commit_plan_action('51000000-0000-0000-0000-0000000000d1', null, 'ce_mois') $$,
  '20. à 29 engagements archivés dans la journée, on s''engage encore');

reset role;
insert into public.plan_action_commitments_archive (user_id, plan_cycle_id, action_template_id, action_text, committed_at, released_reason)
select '51000000-0000-0000-0000-00000000000a', '51000000-0000-0000-0000-0000000000c1', t.id, t.action_text, now() - interval '1 hour', 'modification'
from public.action_templates t
where t.id = (select id from public.action_templates where poste = 'leisure' order by action_text limit 1);
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');

select throws_ok($$ select public.commit_plan_action('51000000-0000-0000-0000-0000000000d1', null, 'le_mois_prochain') $$, 'RM002', null,
  '21. à trente, non : mille changements laissaient mille lignes');

reset role;
update public.plan_action_commitments_archive set released_at = now() - interval '25 hours'
 where user_id = '51000000-0000-0000-0000-00000000000a';
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');

select lives_ok($$ select public.commit_plan_action('51000000-0000-0000-0000-0000000000d1', null, 'le_mois_prochain') $$,
  '22. et vingt-quatre heures plus tard, de nouveau');

reset role;
select set_config('request.jwt.claims', ''::text, true);

-- ── 6. La purge : un bilan en cours ne porte rien ───────────────────────────────────────────
--
-- Soixante comptes muets depuis cent jours, un bilan en cours chacun : au-delà du plancher de la garde
-- (50) s'ils étaient porteurs. Ils ne le sont pas, donc la garde ne se déclenche pas, et ils partent.
delete from public.purge_runs;
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
select ('51111111-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true,
       now() - interval '100 days', now()
from generate_series(1, 60) as g(i);
insert into public.assessments (user_id, status, created_at)
select ('51111111-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid, 'in_progress', now() - interval '100 days'
from generate_series(1, 60) as g(i);

select public.purge_stale_anonymous_accounts();

select is(
  (select count(*)::int from auth.users where id::text like '51111111-%'),
  0,
  '23. soixante comptes de robots au bilan en cours partent : ils déclenchaient la garde exprès, nuit après nuit'
);
select is(
  (select status from public.purge_runs order by ran_at desc limit 1),
  'applied',
  '24. et le passage est appliqué, pas bloqué'
);

-- ── 7. Le lot de notifications : un 400 se coupe en deux ────────────────────────────────────
--
-- Expo simulé : un lot qui contient le jeton étranger et plus d'un message est refusé en bloc (400),
-- comme `PUSH_TOO_MANY_EXPERIENCE_IDS` ; seul, ce jeton est refusé aussi ; tout le reste est accepté,
-- un ticket par message. Chaque appel se compte.
create temporary table appels_expo (messages integer) on commit drop;
create or replace function public.envoyer_a_expo(p_messages jsonb, p_expo_token text)
returns extensions.http_response language plpgsql as $$
begin
  insert into appels_expo values (jsonb_array_length(p_messages));
  if p_messages::text like '%ExponentPushToken[mal-forme]%' then
    return (400, 'application/json', null, '{"errors":[{"code":"VALIDATION_ERROR"}]}')::extensions.http_response;
  end if;
  if p_messages::text like '%ExponentPushToken[etranger]%' then
    return (400, 'application/json', null,
            '{"errors":[{"code":"PUSH_TOO_MANY_EXPERIENCE_IDS"}]}')::extensions.http_response;
  end if;
  return (200, 'application/json', null,
          jsonb_build_object('data', (select jsonb_agg(jsonb_build_object('status', 'ok', 'id', 'ticket-' || i))
                                        from generate_series(1, jsonb_array_length(p_messages)) as i))::text
         )::extensions.http_response;
end;
$$;

-- Trois lignes, marquées `sent` comme la procédure les marque avant l'appel ; C porte le jeton étranger.
insert into public.notification_outbox (id, user_id, genre, jour_vise, channel, subject, body, status, attempts, sent_at) values
  ('51000000-0000-0000-0000-0000000000e1', '51000000-0000-0000-0000-00000000000a', 'veille', current_date, 'push', 'x', 'x', 'sent', 1, now()),
  ('51000000-0000-0000-0000-0000000000e2', '51000000-0000-0000-0000-00000000000b', 'veille', current_date, 'push', 'x', 'x', 'sent', 1, now()),
  ('51000000-0000-0000-0000-0000000000e3', '51000000-0000-0000-0000-00000000000c', 'veille', current_date, 'push', 'x', 'x', 'sent', 1, now());

select is(
  public.envoyer_lot_push(
    array['51000000-0000-0000-0000-0000000000e1', '51000000-0000-0000-0000-0000000000e2', '51000000-0000-0000-0000-0000000000e3']::uuid[],
    array['ExponentPushToken[a]', 'ExponentPushToken[b]', 'ExponentPushToken[etranger]'],
    '[{"to":"ExponentPushToken[a]"},{"to":"ExponentPushToken[b]"},{"to":"ExponentPushToken[etranger]"}]'::jsonb,
    null),
  '{"envoyes": 2, "echecs": 1, "replis": 0}'::jsonb,
  '25. un jeton d''un autre projet Expo ne fait plus tomber le lot : deux rappels partent, le sien seul échoue'
);

select ok(
  (select bool_and(status = 'sent' and provider_ticket is not null) from public.notification_outbox
    where id in ('51000000-0000-0000-0000-0000000000e1', '51000000-0000-0000-0000-0000000000e2'))
  and (select status = 'pending' and sent_at is null and last_error like 'HTTP 400%' from public.notification_outbox
        where id = '51000000-0000-0000-0000-0000000000e3'),
  '26. les deux lignes parties gardent leur ticket, la fautive repasse en attente avec son erreur'
);

select is(
  (select array_agg(messages order by messages desc) from appels_expo),
  array[3, 2, 1, 1, 1],
  '27. le lot entier, refusé, puis ses moitiés jusqu''à isoler la ligne fautive — une ligne à part (A), puis B et C ensemble, refusées, puis chacune'
);

-- Un autre 400 ne se coupe pas : une charge refusée pour tout le monde l'est en un appel, pas en 2N − 1.
delete from appels_expo;
update public.notification_outbox set status = 'sent', sent_at = now(), attempts = 1, last_error = null
 where id in ('51000000-0000-0000-0000-0000000000e1', '51000000-0000-0000-0000-0000000000e2');
select public.envoyer_lot_push(
  array['51000000-0000-0000-0000-0000000000e1', '51000000-0000-0000-0000-0000000000e2']::uuid[],
  array['ExponentPushToken[a]', 'ExponentPushToken[mal-forme]'],
  '[{"to":"ExponentPushToken[a]"},{"to":"ExponentPushToken[mal-forme]"}]'::jsonb,
  null);
select is(
  (select array_agg(messages) from appels_expo),
  array[2],
  '27 bis. un 400 qui n''est pas le mélange de projets ne coupe pas le lot : un seul appel'
);

-- ── 8. Le rattachement : un captcha par code, et le plafond du jour du compte ───────────────

create function pg_temp.rattachement(p_user uuid, p_adresse text) returns jsonb language sql as $$
  select jsonb_build_object(
    'user', jsonb_build_object('id', p_user, 'email', '', 'new_email', p_adresse, 'is_anonymous', true),
    'email_data', jsonb_build_object('email_action_type', 'email_change', 'token', '12345678', 'token_new', '',
                                     'token_hash', 'abc', 'token_hash_new', ''));
$$;
create function pg_temp.jusqu_au_transport(p_event jsonb) returns boolean language sql as $$
  select public.envoyer_l_e_mail_d_auth(p_event) -> 'error' ->> 'message'
         = 'Aucun moyen d''envoi : il manque les secrets Vault brevo_api_key_connexion et resend_api_key_connexion.';
$$;
delete from vault.secrets
 where name in ('brevo_api_key_connexion', 'resend_api_key_connexion', 'boite_d_essai_des_e_mails',
                'turnstile_secret_rattachement');
delete from public.envois_d_e_mails_d_auth;

-- Cloudflare simulé : le jeton `bon` est valable, tout autre non. Chaque appel se compte.
create temporary table appels_cloudflare (jeton text) on commit drop;
grant insert, select on appels_cloudflare to authenticated;
create or replace function public.verifier_le_jeton_du_captcha(p_secret text, p_jeton text)
returns boolean language plpgsql security definer as $$
begin
  insert into appels_cloudflare values (p_jeton);
  return p_jeton = 'bon';
end;
$$;

select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');
select ok(public.autoriser_le_rattachement(null),
  '28. sans le secret, rien n''est exigé : la stack locale et la CI n''en ont pas');
reset role;

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('51000000-0000-0000-0000-00000000000a', 'a@exemple.fr')),
  '29. et le hook laisse passer le code sans autorisation'
);
delete from public.envois_d_e_mails_d_auth;

select vault.create_secret('secret-factice', 'turnstile_secret_rattachement');

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('51000000-0000-0000-0000-00000000000a', 'a@exemple.fr')),
  '{}'::jsonb,
  '30. avec le secret, un code sans captcha se tait : 120 codes par jour partaient vers un tiers'
);
select is(
  (select issue from public.envois_d_e_mails_d_auth order by id desc limit 1),
  'sans_captcha',
  '31. et il est consigné comme tel'
);

delete from appels_cloudflare;
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');
create temporary table refus on commit drop as
  select public.autoriser_le_rattachement('mauvais') as mauvais, public.autoriser_le_rattachement('') as vide;
grant select on refus to authenticated;
select ok(
  (select not mauvais and not vide from refus)
  and (select array_agg(jeton) from appels_cloudflare) = array['mauvais'],
  '32. un jeton refusé par Cloudflare, ou vide, n''autorise rien — et un jeton vide ne l''appelle même pas'
);
select ok(public.autoriser_le_rattachement('bon'), '33. un jeton valable autorise');
reset role;

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('51000000-0000-0000-0000-00000000000a', 'a@exemple.fr')),
  '34. et le code suivant va jusqu''au transport'
);
select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('51000000-0000-0000-0000-00000000000a', 'a@exemple.fr')),
  '{}'::jsonb,
  '35. une autorisation, un code : le suivant se tait'
);

update public.autorisations_de_rattachement set accordee_le = now() - interval '11 minutes'
 where user_id = '51000000-0000-0000-0000-00000000000a';
select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('51000000-0000-0000-0000-00000000000a', 'a@exemple.fr')),
  '{}'::jsonb,
  '36. et une autorisation de plus de dix minutes ne vaut plus'
);

-- Dix essais dans l'heure, puis le onzième, avec un jeton valable : refusé sans appeler Cloudflare.
update public.autorisations_de_rattachement set essais = 10, essais_depuis = now() - interval '30 minutes'
 where user_id = '51000000-0000-0000-0000-00000000000a';
delete from appels_cloudflare;
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');
select ok(
  not public.autoriser_le_rattachement('bon') and not exists (select 1 from appels_cloudflare),
  '37. au-delà de dix essais dans l''heure, refusé sans appeler Cloudflare : chaque essai est une requête sortante'
);
reset role;

-- Le plafond du jour du compte : dix codes partis il y a plus d'une heure, vers dix adresses.
delete from vault.secrets where name = 'turnstile_secret_rattachement';
delete from public.envois_d_e_mails_d_auth;
insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue, statut_http, cree_le)
select '51000000-0000-0000-0000-00000000000b', sha256(convert_to('x' || g || '@exemple.fr', 'UTF8')),
       'email_change', 'envoye', 200, now() - interval '2 hours'
from generate_series(1, 9) as g;

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('51000000-0000-0000-0000-00000000000b', 'neuve@exemple.fr')),
  '38. à neuf codes dans la journée, le dixième passe'
);

insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue, statut_http, cree_le)
values ('51000000-0000-0000-0000-00000000000b', sha256(convert_to('x10@exemple.fr', 'UTF8')),
        'email_change', 'envoye', 200, now() - interval '2 hours');
-- L'appel et la lecture du journal en deux instructions : dans une seule, la lecture se ferait avec
-- l'instantané d'avant l'appel.
create temporary table au_plafond_du_jour on commit drop as
  select public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('51000000-0000-0000-0000-00000000000b', 'neuve@exemple.fr')) as r;
select ok(
  (select r = '{}'::jsonb from au_plafond_du_jour)
  and (select issue from public.envois_d_e_mails_d_auth order by id desc limit 1) = 'plafond_compte_jour',
  '39. à dix, le suivant se tait, sous le plafond du jour du compte — celui de l''heure ne voyait rien'
);

-- L'export rend la ligne d'autorisation, et une purge nocturne l'efface au bout d'un jour.
select pg_temp.en_tant_que('51000000-0000-0000-0000-00000000000a');
select ok(
  (select jsonb_array_length(public.export_my_data() -> 'verifications_du_captcha') = 1
      and (public.export_my_data() #>> '{verifications_du_captcha,0,essais_dans_l_heure}') is not null),
  '39 bis. l''export rend la vérification du captcha du compte : une table qui porte un `user_id` y entre'
);
reset role;
select set_config('request.jwt.claims', ''::text, true);

update public.autorisations_de_rattachement set essais_depuis = now() - interval '25 hours', accordee_le = null
 where user_id = '51000000-0000-0000-0000-00000000000a';
insert into public.autorisations_de_rattachement (user_id, essais, essais_depuis)
values ('51000000-0000-0000-0000-00000000000c', 1, now());
do $$ begin execute (select command from cron.job where jobname = 'purge-autorisations-de-rattachement'); end $$;
select is(
  (select array_agg(user_id::text order by user_id) from public.autorisations_de_rattachement
    where user_id::text like '51000000-%'),
  array['51000000-0000-0000-0000-00000000000c'],
  '39 ter. la purge de la nuit efface la ligne de plus d''un jour, et garde celle de l''heure'
);

-- ── 9. Aucun compte ne naît hors d'une session anonyme ──────────────────────────────────────

select ok(
  public.avant_la_creation_d_un_compte('{"user":{"is_anonymous":true,"email":""}}') = '{}'::jsonb
  and public.avant_la_creation_d_un_compte('{"user":{"is_anonymous":false,"email":"victime@exemple.fr"}}')
        -> 'error' ->> 'http_code' = '403'
  and has_function_privilege('supabase_auth_admin', 'public.avant_la_creation_d_un_compte(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.avant_la_creation_d_un_compte(jsonb)', 'execute')
  and not has_table_privilege('authenticated', 'public.autorisations_de_rattachement', 'select')
  and has_function_privilege('authenticated', 'public.autoriser_le_rattachement(text)', 'execute')
  and not has_function_privilege('anon', 'public.autoriser_le_rattachement(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.verifier_le_jeton_du_captcha(text, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.envoyer_a_expo(jsonb, text)', 'execute'),
  '40. une session anonyme naît, une inscription directe est refusée — le squat d''une adresse — ; et chacun n''appelle que ce qui lui revient'
);

select * from finish();
rollback;

-- Le relevé des mutations (05/10/2026), chacune appliquée à la base locale dans une transaction
-- annulée, ce fichier rejoué dedans. Témoin sans mutation : aucun écart.
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | la borne des nombres retirée de `check_usage_event_props` | 1 |
--   | l'index d'un seul bilan en cours retiré | 4 et 5, puis le fichier s'arrête : le plafond du jour refuse alors la préparation suivante |
--   | le trigger du plafond des bilans retiré | 7, et 8, qui bute alors sur le bilan en cours que 7 a laissé |
--   | le plafond des bilans porté à 11 | 7 et 8, de même |
--   | la fenêtre des bilans portée à 48 heures | 8 |
--   | les trois contraintes des réponses retirées | 9 à 12, et 14 |
--   | l'échelle retirée, la borne gardée | 12 et 14 |
--   | le plafond des jetons porté à 100 | 18 |
--   | le plafond des engagements archivés porté à 100 | 21 |
--   | un bilan en cours de nouveau porteur, dans les deux prédicats de la purge | 23 et 24 |
--   | la coupe du lot retirée | 25, 26 et 27 |
--   | la coupe sur tout 400, sans lire le code d'Expo | 27 bis |
--   | le captcha du hook retiré | 30, 31, 35 et 36 |
--   | l'autorisation qui ne se consomme pas | 35 |
--   | l'autorisation valable vingt minutes | 36 |
--   | le plafond des essais retiré | 37 |
--   | le plafond du jour du compte retiré | 39 |
--   | le plafond du jour du compte ramené à 9 | 38 |
--   | le hook `before_user_created` qui laisse tout passer | 40 |
--   | l'autorisation accordée sans demander à Cloudflare | 32 |
--   | le refus d'un jeton vide retiré (Cloudflare serait appelé pour rien) | 32 |
--   | `autoriser_le_rattachement` exécutable par `anon` | 40 |
--   | sans le secret, l'autorisation refusée au lieu d'accordée | 28 |
--   | la clé `verifications_du_captcha` retirée de l'export | 39 bis |
--   | la purge qui efface tout, ou qui attend deux jours | 39 ter |
--
-- Ce que ce fichier ne garde pas : que la coupe suive les lignes plutôt que les jetons. Ici, chaque
-- ligne n'a qu'un jeton ; le motif est écrit dans la migration.

