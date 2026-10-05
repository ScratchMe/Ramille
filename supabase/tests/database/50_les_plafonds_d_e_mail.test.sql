-- Tests pgTAP des plafonds d'e-mails de connexion (migration `20261005103733_les_plafonds_d_e_mail.sql`,
-- plan anti-abus, `v1-27` §12.35) : le hook `envoyer_l_e_mail_d_auth`, ce qu'il compte, ce qu'il tait
-- — ses plafonds ne valent que pour le rattachement, et tous sont muets —, et le corps qui part.
-- Depuis `20261005121351_les_codes_par_brevo.sql` : le plafond du jour à 200, et le fournisseur
-- (Brevo, Resend ou le collecteur local) — son choix et sa requête, lus sans rien envoyer (§10).
--
-- **Ce que ce fichier ne voit pas : un envoi réussi.** La CI de pgTAP n'a que la base, sans collecteur
-- d'e-mails, ni Resend, ni Brevo ; chaque cas qui passe les plafonds y bute donc sur le transport
-- (`pg_temp.jusqu_au_transport`), et c'est ce butoir qui prouve qu'aucun plafond ne l'a arrêté.
-- L'envoi lui-même — Supabase qui appelle le hook, le code reçu, puis vérifié — est joué de bout en
-- bout par `scripts/verifier-code-de-connexion.mjs` contre la stack locale, où le hook est allumé
-- (`supabase/config.toml`). **Ni, hors d'Auth, le prix du silence** : un plafond muet laisse Supabase
-- renouveler le code, donc l'ancien meurt — c'est su et écrit (en-tête de la migration), pas épinglé.
--
-- **Chaque plafond est épinglé des deux côtés** — au seuil, il se tait ; une unité en dessous, ou une
-- fenêtre plus tard, la demande passe. **L'ordre des plafonds n'est pas gardé, et c'est voulu** : tous
-- se taisent, l'ordre ne décide que de l'issue consignée quand deux sont atteints à la fois.
--
-- **Éprouvé en le cassant, le 05/10/2026** (TESTING.md §1.1) : chaque mutation appliquée à la base
-- locale dans une transaction annulée, ce fichier rejoué dedans, et ce qu'elle fait tomber :
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | le plafond du projet retiré | 4 et 5 |
--   | le plafond du projet ramené à 199 (05/10/2026, à 200) | 7 |
--   | le plafond du compte retiré | 10 et 11 |
--   | le plafond du compte ramené à 4 | 12 |
--   | le plafond de l'adresse retiré | 15 et 16 |
--   | le plafond de l'adresse ramené à 4 | 17 |
--   | la reconnexion plafonnée comme le rattachement | 6 |
--   | les reconnexions comptées dans les plafonds | 8 |
--   | toutes les issues comptées, pas seulement les envois partis | 19, 20 et 25 |
--   | un plafond qui refuse en 429 au lieu de se taire | 4, 5, 10, 11, 15 et 16 |
--   | l'empreinte sans minuscules ni espaces retirés | 15 et 16 |
--   | la fenêtre du jour portée à 48 heures | 9 |
--   | la fenêtre de l'heure du compte portée à deux heures | 13 |
--   | la fenêtre de l'heure de l'adresse portée à deux heures | 18 |
--   | un envoi qui échoue consigné comme parti | 21 et 25 |
--   | un type inconnu refusé en erreur au lieu d'être ignoré | 1 |
--   | la garde des deux codes retirée | 3 |
--   | l'adresse non échappée dans le corps | 22 |
--   | une variable de gabarit inconnue (`{{ .Email }}`) dans la reconnexion | 23 |
--   | le hook exécutable par `authenticated` | 24 |
--   | l'export qui rend l'empreinte de l'adresse | 25 |
--   | un secret vide pris pour une clé | 26 |
--   | Brevo choisi après Resend (l'ordre inversé) | 27 |
--   | la clé Brevo dans `Authorization` au lieu d'`api-key` | 29 |
--   | l'expéditeur ou le destinataire de Brevo sous les noms de Resend (`from`, `to` en chaîne) | 30 |
--   | les deux fonctions exécutables par `authenticated` | 32 |
--
-- (Les numéros sont ceux des libellés ; les cinq dernières lignes datent du 05/10/2026, migration des
-- codes par Brevo.) Témoin sans mutation : aucun écart.
begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

-- Trois comptes : A demande des rattachements, B est visé par des reconnexions, C a déjà une adresse.
insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at) values
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true, now(), now()),
  ('50000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@exemple.fr', false, now(), now()),
  ('50000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@exemple.fr', false, now(), now());

-- Aucun transport : ni clé Brevo, ni clé Resend, ni collecteur. Un cas qui passe les plafonds rend
-- donc ce refus-là.
delete from vault.secrets
 where name in ('brevo_api_key_connexion', 'resend_api_key_connexion', 'boite_d_essai_des_e_mails');

-- Les événements tels que Supabase les forme (relevés sur la stack locale le 05/10/2026).
create function pg_temp.rattachement(p_user uuid, p_adresse text) returns jsonb language sql as $$
  select jsonb_build_object(
    'user', jsonb_build_object('id', p_user, 'email', '', 'new_email', p_adresse, 'is_anonymous', true),
    'email_data', jsonb_build_object('email_action_type', 'email_change', 'token', '12345678', 'token_new', '',
                                     'token_hash', 'abc', 'token_hash_new', ''));
$$;
create function pg_temp.reconnexion(p_user uuid, p_adresse text) returns jsonb language sql as $$
  select jsonb_build_object(
    'user', jsonb_build_object('id', p_user, 'email', p_adresse, 'is_anonymous', false),
    'email_data', jsonb_build_object('email_action_type', 'magiclink', 'token', '87654321', 'token_new', '',
                                     'token_hash', 'def', 'token_hash_new', ''));
$$;
create function pg_temp.empreinte(p_adresse text) returns bytea language sql as $$
  select sha256(convert_to(lower(btrim(p_adresse)), 'UTF8'));
$$;
create function pg_temp.envoye(p_user uuid, p_adresse text, p_quand timestamptz, p_type text default 'email_change')
returns void language sql as $$
  insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue, statut_http, cree_le)
  values (p_user, pg_temp.empreinte(p_adresse), p_type, 'envoye', 200, p_quand);
$$;
-- Le butoir : un cas qui passe les plafonds bute sur le transport absent, avec ce message-là.
create function pg_temp.jusqu_au_transport(p_event jsonb) returns boolean language sql as $$
  select public.envoyer_l_e_mail_d_auth(p_event) -> 'error' ->> 'message'
         = 'Aucun moyen d''envoi : il manque les secrets Vault brevo_api_key_connexion et resend_api_key_connexion.';
$$;

-- ── 1. Ce qui ne part jamais ──────────────────────────────────────────────────────────────────

select is(
  public.envoyer_l_e_mail_d_auth(jsonb_build_object(
    'user', jsonb_build_object('id', '50000000-0000-0000-0000-00000000000c', 'email', 'c@exemple.fr'),
    'email_data', jsonb_build_object('email_action_type', 'recovery', 'token', '11112222'))),
  '{}'::jsonb,
  '1. un type que le produit n''emprunte pas (réinitialisation) : aucune erreur, qui dirait que l''adresse a un compte'
);

select is(
  (select issue from public.envois_d_e_mails_d_auth where type = 'recovery'),
  'type_ignore',
  '2. et il est consigné comme ignoré, sans compter parmi les envois'
);

select is(
  public.envoyer_l_e_mail_d_auth(jsonb_build_object(
    'user', jsonb_build_object('id', '50000000-0000-0000-0000-00000000000c', 'email', 'c@exemple.fr', 'new_email', 'c2@exemple.fr'),
    'email_data', jsonb_build_object('email_action_type', 'email_change', 'token', '11112222', 'token_new', '33334444'))) -> 'error' ->> 'http_code',
  '400',
  '3. un changement d''adresse à deux codes (un compte qui a déjà une adresse) est refusé, pas envoyé à moitié'
);

delete from public.envois_d_e_mails_d_auth;

-- ── 2. Le plafond du projet : 200 rattachements sur vingt-quatre heures ───────────────────────

select pg_temp.envoye(null, 'filler' || g || '@exemple.fr', now() - interval '23 hours') from generate_series(1, 200) as g;

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'neuve@exemple.fr')),
  '{}'::jsonb,
  '4. au-delà de 200 rattachements en vingt-quatre heures, le suivant se tait — un refus dirait que l''adresse est libre'
);

select is(
  (select issue from public.envois_d_e_mails_d_auth where issue <> 'envoye'),
  'plafond_projet',
  '5. consigné sous le plafond du projet'
);

select ok(
  pg_temp.jusqu_au_transport(pg_temp.reconnexion('50000000-0000-0000-0000-00000000000b', 'b@exemple.fr')),
  '6. au même moment, une reconnexion passe : elle n''est pas plafonnée par le hook'
);

delete from public.envois_d_e_mails_d_auth where id = (select max(id) from public.envois_d_e_mails_d_auth where issue = 'envoye');
delete from public.envois_d_e_mails_d_auth where issue <> 'envoye';

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'neuve@exemple.fr')),
  '7. à 199 rattachements, le deux-centième passe'
);

delete from public.envois_d_e_mails_d_auth;
select pg_temp.envoye(null, 'filler' || g || '@exemple.fr', now() - interval '23 hours', 'magiclink') from generate_series(1, 200) as g;

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'neuve@exemple.fr')),
  '8. deux cents reconnexions ne remplissent pas le plafond des rattachements'
);

update public.envois_d_e_mails_d_auth set type = 'email_change', cree_le = now() - interval '25 hours';

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'neuve@exemple.fr')),
  '9. des rattachements vieux de plus de vingt-quatre heures ne comptent plus'
);

delete from public.envois_d_e_mails_d_auth;

-- ── 3. Le plafond du compte qui demande : 5 par heure ────────────────────────────────────────

select pg_temp.envoye('50000000-0000-0000-0000-00000000000a', 'cible' || g || '@exemple.fr', now() - interval '50 minutes')
from generate_series(1, 5) as g;

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible6@exemple.fr')),
  '{}'::jsonb,
  '10. au-delà de 5 rattachements dans l''heure, le compte qui demande se heurte à un plafond muet'
);

select is(
  (select issue from public.envois_d_e_mails_d_auth where issue <> 'envoye'),
  'plafond_compte',
  '11. consigné sous le plafond du compte'
);

delete from public.envois_d_e_mails_d_auth where issue <> 'envoye';
delete from public.envois_d_e_mails_d_auth where id = (select max(id) from public.envois_d_e_mails_d_auth);

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible6@exemple.fr')),
  '12. à 4 rattachements dans l''heure, le cinquième passe'
);

select pg_temp.envoye('50000000-0000-0000-0000-00000000000a', 'cible5@exemple.fr', now() - interval '50 minutes');
update public.envois_d_e_mails_d_auth set cree_le = now() - interval '61 minutes';

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible6@exemple.fr')),
  '13. une heure plus tard, le même compte passe de nouveau'
);

delete from public.envois_d_e_mails_d_auth;

-- ── 4. La reconnexion n'est jamais plafonnée ──────────────────────────────────────────────────
--
-- Dix codes partis vers la même adresse et le même compte dans les dix dernières minutes : un plafond
-- par adresse ou par compte laisserait n'importe qui bloquer la reconnexion de son titulaire.

select pg_temp.envoye('50000000-0000-0000-0000-00000000000b', 'b@exemple.fr', now() - interval '10 minutes', 'magiclink')
from generate_series(1, 10);

select ok(
  pg_temp.jusqu_au_transport(pg_temp.reconnexion('50000000-0000-0000-0000-00000000000b', 'b@exemple.fr')),
  '14. dix reconnexions dans l''heure vers la même adresse n''empêchent pas la onzième'
);

delete from public.envois_d_e_mails_d_auth;

-- ── 5. Le plafond de l'adresse : 5 par heure, de qui que ce soit ──────────────────────────────

select pg_temp.envoye(null, 'cible@exemple.fr', now() - interval '30 minutes') from generate_series(1, 5);

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', '  Cible@Exemple.FR ')),
  '{}'::jsonb,
  '15. au-delà de 5 rattachements dans l''heure vers une adresse — casse et espaces mis à part —, le suivant se tait'
);

select is(
  (select issue from public.envois_d_e_mails_d_auth where user_id = '50000000-0000-0000-0000-00000000000a'),
  'plafond_adresse',
  '16. consigné sous le plafond de l''adresse, empreinte comprise, jamais l''adresse'
);

delete from public.envois_d_e_mails_d_auth where issue <> 'envoye';
delete from public.envois_d_e_mails_d_auth where id = (select max(id) from public.envois_d_e_mails_d_auth);

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible@exemple.fr')),
  '17. à 4 rattachements vers l''adresse, le cinquième passe'
);

select pg_temp.envoye(null, 'cible@exemple.fr', now() - interval '30 minutes');
update public.envois_d_e_mails_d_auth set cree_le = now() - interval '61 minutes';

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible@exemple.fr')),
  '18. une heure plus tard, l''adresse se rattache de nouveau'
);

delete from public.envois_d_e_mails_d_auth;

-- ── 6. Seuls les envois partis comptent ───────────────────────────────────────────────────────

insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue)
select null, pg_temp.empreinte('cible@exemple.fr'), 'email_change', 'plafond_adresse' from generate_series(1, 10);

select ok(
  pg_temp.jusqu_au_transport(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible@exemple.fr')),
  '19. dix demandes tues ne remplissent aucun plafond : la onzième va jusqu''au transport'
);

-- Un transport qui échoue : rien n'est consigné comme parti, donc rien n'est compté.
select vault.create_secret('http://127.0.0.1:9/', 'boite_d_essai_des_e_mails');

select is(
  public.envoyer_l_e_mail_d_auth(pg_temp.rattachement('50000000-0000-0000-0000-00000000000a', 'cible@exemple.fr')) -> 'error',
  jsonb_build_object('http_code', 500, 'message', 'L''envoi de l''e-mail a échoué.'),
  '20. un envoi qui échoue rend un 500 — l''app y lit une panne de transport, et c''en est une'
);

select is(
  (select count(*)::int from public.envois_d_e_mails_d_auth where issue = 'envoye'),
  0,
  '21. et il ne compte pas parmi les envois'
);

-- ── 7. Le corps qui part ──────────────────────────────────────────────────────────────────────

select ok(
  (select position('a&amp;b&lt;c@exemple.fr' in html) > 0 and position('12345678' in html) > 0
          and position('{{' in html) = 0 and sujet = 'Cette adresse vient d''être saisie dans Ramille'
     from public.rendre_l_e_mail_d_auth('email_change', '12345678', 'a&b<c@exemple.fr')),
  '22. rattachement : le code et l''adresse remplacés, l''adresse échappée, aucune balise de gabarit restante'
);

select ok(
  (select r.html = replace(g.html, '{{ .Token }}', '87654321') and position('{{' in r.html) = 0
          and r.sujet = 'Ton code pour retrouver ton compte'
     from public.rendre_l_e_mail_d_auth('magiclink', '87654321', 'b@exemple.fr') r,
          public.gabarit_d_e_mail_d_auth('magiclink') g),
  '23. reconnexion : le gabarit tel quel, code compris, aucune balise de gabarit restante'
);

-- ── 8. Qui peut appeler, qui peut lire ────────────────────────────────────────────────────────

select ok(
  has_function_privilege('supabase_auth_admin', 'public.envoyer_l_e_mail_d_auth(jsonb)', 'execute')
    and not has_function_privilege('anon', 'public.envoyer_l_e_mail_d_auth(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.envoyer_l_e_mail_d_auth(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.rendre_l_e_mail_d_auth(text, text, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.gabarit_d_e_mail_d_auth(text)', 'execute')
    and not has_table_privilege('authenticated', 'public.envois_d_e_mails_d_auth', 'select')
    and not has_table_privilege('anon', 'public.envois_d_e_mails_d_auth', 'select'),
  '24. le hook n''est appelable que par Supabase Auth, et le journal n''est lisible par aucun client'
);

-- ── 9. L'export ───────────────────────────────────────────────────────────────────────────────

select pg_temp.envoye('50000000-0000-0000-0000-00000000000a', 'cible@exemple.fr', now());
select set_config('request.jwt.claims',
  json_build_object('sub', '50000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
select set_config('role', 'authenticated', true);

select ok(
  (select jsonb_array_length(e -> 'codes_de_connexion_envoyes') = 1
          and (e -> 'codes_de_connexion_envoyes' -> 0) ? 'issue'
          and not (e -> 'codes_de_connexion_envoyes' -> 0) ? 'adresse_empreinte'
     from (select public.export_my_data() as e) x),
  '25. l''export rend les demandes du compte — type, issue, date —, sans l''empreinte de l''adresse'
);

reset role;

-- ── 10. Le fournisseur : son choix et sa requête ──────────────────────────────────────────────
--
-- Lus sans rien envoyer : la CI n'a aucune clé, et une clé factice passée au hook ferait partir un
-- vrai appel vers Brevo. Cette section vient en dernier pour la même raison — après elle, le Vault
-- de la transaction porte une clé Brevo factice, et plus rien n'appelle le hook.

select vault.create_secret('http://127.0.0.1:9/', 'boite_d_essai_des_e_mails')
 where not exists (select 1 from vault.secrets where name = 'boite_d_essai_des_e_mails');
select vault.create_secret('cle-resend-factice', 'resend_api_key_connexion');
select vault.create_secret('', 'brevo_api_key_connexion');

select is(
  (select fournisseur from public.fournisseur_d_e_mail_d_auth()),
  'resend',
  '26. une clé Brevo vide ne compte pas : Resend envoie, comme avant que la clé soit posée'
);

select vault.update_secret(id, 'cle-brevo-factice') from vault.secrets where name = 'brevo_api_key_connexion';

select is(
  (select row(fournisseur, secret)::text from public.fournisseur_d_e_mail_d_auth()),
  row('brevo', 'cle-brevo-factice')::text,
  '27. la clé Brevo posée, Brevo passe devant Resend — la bascule tient à cette clé'
);

select is(
  (select r.method::text || ' ' || r.uri
     from public.requete_d_e_mail_d_auth('brevo', 'cle-brevo-factice', 'a@exemple.fr', 'Sujet', '<p>x</p>') r),
  'POST https://api.brevo.com/v3/smtp/email',
  '28. Brevo : la requête part vers son API d''envoi transactionnel'
);

select ok(
  (select row('api-key', 'cle-brevo-factice')::extensions.http_header = any (r.headers)
          and not exists (select 1 from unnest(r.headers) h where h.field ilike 'authorization')
     from public.requete_d_e_mail_d_auth('brevo', 'cle-brevo-factice', 'a@exemple.fr', 'Sujet', '<p>x</p>') r),
  '29. Brevo : la clé dans l''en-tête api-key, et nulle part ailleurs'
);

select is(
  (select r.content::jsonb
     from public.requete_d_e_mail_d_auth('brevo', 'cle-brevo-factice', 'a@exemple.fr', 'Sujet', '<p>x</p>') r),
  jsonb_build_object(
    'sender', jsonb_build_object('name', 'Ramille', 'email', 'connexion@ramille.fr'),
    'to', jsonb_build_array(jsonb_build_object('email', 'a@exemple.fr')),
    'subject', 'Sujet',
    'htmlContent', '<p>x</p>'),
  '30. Brevo : l''expéditeur de Ramille, le destinataire, le sujet et le corps, sous les noms de son API'
);

select ok(
  (select r.uri = 'https://api.resend.com/emails'
          and row('Authorization', 'Bearer cle-resend-factice')::extensions.http_header = any (r.headers)
          and r.content::jsonb = jsonb_build_object('from', 'Ramille <connexion@ramille.fr>',
                                                     'to', jsonb_build_array('a@exemple.fr'),
                                                     'subject', 'Sujet', 'html', '<p>x</p>')
     from public.requete_d_e_mail_d_auth('resend', 'cle-resend-factice', 'a@exemple.fr', 'Sujet', '<p>x</p>') r)
  and (select r.uri = 'http://boite.local/api/v1/send' and r.headers is null
     from public.requete_d_e_mail_d_auth('boite', 'http://boite.local/api/v1/send', 'a@exemple.fr', 'Sujet', '<p>x</p>') r),
  '31. Resend et le collecteur local gardent la requête qu''ils avaient'
);

select ok(
  not has_function_privilege('authenticated', 'public.fournisseur_d_e_mail_d_auth()', 'execute')
    and not has_function_privilege('anon', 'public.fournisseur_d_e_mail_d_auth()', 'execute')
    and not has_function_privilege('authenticated', 'public.requete_d_e_mail_d_auth(text, text, text, text, text)', 'execute')
    and not has_function_privilege('anon', 'public.requete_d_e_mail_d_auth(text, text, text, text, text)', 'execute'),
  '32. ni le choix ni la requête ne sont appelables par un client : l''un rend la clé, l''autre la porte'
);

select * from finish();
rollback;
