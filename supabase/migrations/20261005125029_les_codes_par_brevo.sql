-- Le plan anti-abus, cinquième brique : **les codes de connexion partent par Brevo** (décisions de la
-- personne qui pilote, 05/10/2026, `v1-27` §12.35).
--
-- **Pourquoi.** Le plan gratuit de Resend envoie 100 e-mails par jour, et les codes de connexion les
-- partageaient avec les rappels et l'alerte d'exploitation : un afflux de codes pouvait faire taire
-- les rappels, et l'inverse. Brevo envoie 300 e-mails par jour sur son plan gratuit. **Seuls les
-- codes y passent** ; les rappels et l'alerte restent chez Resend. Deux quotas séparés, et les liens
-- des rappels — `/plan?rappel=1`, le lien de désinscription — ne transitent jamais par Brevo, qui
-- réécrit les liens des e-mails transactionnels pour compter les clics. Les codes n'en portent aucun.
--
-- **La mesure de Brevo.** Brevo compte aussi les ouvertures, par un pixel, et ne laisse pas couper
-- cette mesure soi-même : elle est **anonymisée** dans les réglages du compte (fait le 05/10/2026,
-- registre d'exploitation §3.12), et la personne qui pilote demande au support de la couper. La page
-- de confidentialité le dit, dans la même livraison que ce hook.
--
-- **La bascule tient à une clé.** Le hook envoie par Brevo si le secret Vault `brevo_api_key_connexion`
-- existe, sinon par Resend (`resend_api_key_connexion`), sinon au collecteur de la stack locale
-- (`boite_d_essai_des_e_mails`, `supabase/config.toml`). Poser la clé bascule, la retirer revient en
-- arrière, sans migration. Le choix et la requête vivent dans deux fonctions à part, pour qu'un test
-- puisse les lire sans rien envoyer : la CI n'a aucune clé, et une clé factice ferait partir un vrai
-- appel.
--
-- **Le plafond du jour des rattachements passe de 60 à 200 quand les codes partent par Brevo** (même
-- décision) : sur ses 300 e-mails, 200 laisse 100 codes de reconnexion, que le hook ne plafonne pas.
-- **Il reste à 60 quand ils partent par Resend** — avant la pose de la clé, ou si on la retire : 60
-- laisse leur part aux rappels dans les 100 de Resend, et c'est tout le risque que ce passage existe
-- pour lever. Le fournisseur se choisit donc avant les plafonds (relevé par la contre-lecture : un 200
-- fixe aurait valu dès l'application, codes encore chez Resend). Les deux autres plafonds ne bougent
-- pas (5 par heure et par compte, 5 par heure et par adresse), et tous restent muets.
--
-- **Le journal dit qui a envoyé** (`fournisseur`), pour que la bascule se lise en base et non à la
-- couleur d'un statut HTTP (Brevo répond 201, Resend 200).
--
-- **Deux secondes, toujours** : un aller-retour vers l'API de Brevo depuis la production prend 43 à
-- 120 ms (mesuré le 05/10/2026 avec une clé factice, donc sans rien envoyer) — dans le 1,5 s de
-- l'appel, comme Resend.
--
-- Le hook est réécrit depuis son corps du distant (`pg_get_functiondef`, 05/10/2026) ; seuls le
-- plafond du jour, le choix du fournisseur, la requête et la colonne du journal changent.

-- ── 1. Le fournisseur dans le journal ────────────────────────────────────────────────────────

alter table public.envois_d_e_mails_d_auth
  add column if not exists fournisseur text;

alter table public.envois_d_e_mails_d_auth
  drop constraint if exists envois_d_e_mails_d_auth_fournisseur_check;
alter table public.envois_d_e_mails_d_auth
  add constraint envois_d_e_mails_d_auth_fournisseur_check
  check (fournisseur in ('brevo', 'resend', 'boite'));

comment on column public.envois_d_e_mails_d_auth.fournisseur is
  'Qui a envoyé ce code : brevo, resend ou boite (le collecteur de la stack locale). Nul pour une demande tue ou ignorée, et pour les envois d''avant la colonne (20261005125029).';

-- ── 2. Le choix du fournisseur ───────────────────────────────────────────────────────────────
--
-- Brevo, puis Resend, puis le collecteur : le premier dont le secret existe. Un secret vide compte
-- pour absent. Rien ne s'y décide d'autre : le reste du hook ne connaît que le nom rendu.
create or replace function public.fournisseur_d_e_mail_d_auth(out fournisseur text, out secret text)
 language plpgsql
 stable
 set search_path to 'public', 'pg_temp'
as $function$
begin
  select nullif(decrypted_secret, '') into secret from vault.decrypted_secrets where name = 'brevo_api_key_connexion';
  if secret is not null then
    fournisseur := 'brevo';
    return;
  end if;
  select nullif(decrypted_secret, '') into secret from vault.decrypted_secrets where name = 'resend_api_key_connexion';
  if secret is not null then
    fournisseur := 'resend';
    return;
  end if;
  select nullif(decrypted_secret, '') into secret from vault.decrypted_secrets where name = 'boite_d_essai_des_e_mails';
  if secret is not null then
    fournisseur := 'boite';
  end if;
end;
$function$;

-- `service_role` aussi : c'est la première fonction de `public` qui **rend** un secret du Vault, et
-- l'API REST l'exposerait à qui porte la clé de service. Le hook l'appelle en `postgres`.
revoke execute on function public.fournisseur_d_e_mail_d_auth() from public, anon, authenticated, service_role;

-- ── 3. La requête de chaque fournisseur ──────────────────────────────────────────────────────
--
-- Le même expéditeur partout (« Ramille », `connexion@ramille.fr`) : chez Brevo, il doit être un
-- expéditeur déclaré du compte, sur le domaine authentifié.
create or replace function public.requete_d_e_mail_d_auth(
  p_fournisseur text, p_secret text, p_adresse text, p_sujet text, p_html text)
 returns extensions.http_request
 language sql
 stable
 set search_path to 'public', 'pg_temp'
as $function$
  select case p_fournisseur
    when 'brevo' then (
      'POST',
      'https://api.brevo.com/v3/smtp/email',
      array[extensions.http_header('api-key', p_secret), extensions.http_header('accept', 'application/json')],
      'application/json',
      jsonb_build_object(
        'sender', jsonb_build_object('name', 'Ramille', 'email', 'connexion@ramille.fr'),
        'to', jsonb_build_array(jsonb_build_object('email', p_adresse)),
        'subject', p_sujet,
        'htmlContent', p_html
      )::text
    )::extensions.http_request
    when 'resend' then (
      'POST',
      'https://api.resend.com/emails',
      array[extensions.http_header('Authorization', 'Bearer ' || p_secret)],
      'application/json',
      jsonb_build_object(
        'from', 'Ramille <connexion@ramille.fr>',
        'to', jsonb_build_array(p_adresse),
        'subject', p_sujet,
        'html', p_html
      )::text
    )::extensions.http_request
    when 'boite' then (
      'POST',
      p_secret,
      null,
      'application/json',
      jsonb_build_object(
        'From', jsonb_build_object('Email', 'connexion@ramille.fr', 'Name', 'Ramille'),
        'To', jsonb_build_array(jsonb_build_object('Email', p_adresse)),
        'Subject', p_sujet,
        'HTML', p_html
      )::text
    )::extensions.http_request
  end;
$function$;

revoke execute on function public.requete_d_e_mail_d_auth(text, text, text, text, text) from public, anon, authenticated, service_role;

-- ── 4. Le hook ───────────────────────────────────────────────────────────────────────────────
create or replace function public.envoyer_l_e_mail_d_auth(event jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  c_par_compte_par_heure constant integer := 5;
  c_par_adresse_par_heure constant integer := 5;
  c_projet_par_jour_brevo constant integer := 200;
  c_projet_par_jour_resend constant integer := 60;
  v_projet_par_jour integer;
  v_type text := event -> 'email_data' ->> 'email_action_type';
  v_user uuid := nullif(event -> 'user' ->> 'id', '')::uuid;
  v_adresse text;
  v_code text;
  v_empreinte bytea;
  v_jour integer;
  v_compte integer;
  v_par_adresse integer;
  v_plafond text;
  v_fournisseur text;
  v_secret text;
  v_requete extensions.http_request;
  v_sujet text;
  v_html text;
  v_reponse extensions.http_response;
begin
  if v_type = 'email_change' then
    -- Avec « Secure email change » (allumé sur la production), un compte qui a déjà une adresse
    -- reçoit deux codes, un par adresse — un parcours que le produit n'offre pas : ne lui en envoyer
    -- qu'un le laisserait dans une impasse muette. Une session anonyme n'a pas d'adresse, et un seul
    -- code, dans `token` (mesuré le 05/10/2026).
    if coalesce(event -> 'user' ->> 'email', '') <> '' and coalesce(event -> 'email_data' ->> 'token_new', '') <> '' then
      return jsonb_build_object('error', jsonb_build_object(
        'http_code', 400, 'message', 'Changer l''adresse d''un compte n''est pas pris en charge.'));
    end if;
    v_adresse := event -> 'user' ->> 'new_email';
    -- `token_new` n'est rempli qu'avec deux codes, que la garde ci-dessus vient d'écarter ; le prendre
    -- d'abord suit la documentation de Supabase, qui l'apparie à la nouvelle adresse.
    v_code := coalesce(nullif(event -> 'email_data' ->> 'token_new', ''), event -> 'email_data' ->> 'token');
  elsif v_type = 'magiclink' then
    v_adresse := event -> 'user' ->> 'email';
    v_code := event -> 'email_data' ->> 'token';
  else
    insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue)
    values (v_user, sha256(convert_to(lower(btrim(coalesce(event -> 'user' ->> 'email', ''))), 'UTF8')),
            coalesce(v_type, ''), 'type_ignore');
    return '{}'::jsonb;
  end if;

  if coalesce(v_adresse, '') = '' or coalesce(v_code, '') = '' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 500, 'message', 'E-mail d''authentification sans adresse ou sans code.'));
  end if;

  v_empreinte := sha256(convert_to(lower(btrim(v_adresse)), 'UTF8'));

  -- Brevo si sa clé est posée, sinon Resend, sinon le collecteur de la stack locale (en-tête de la
  -- migration) : la bascule se fait en posant la clé, et se défait en la retirant. **Avant les
  -- plafonds**, parce que celui du jour dépend de qui envoie : 200 sur les 300 de Brevo, 60 sur les
  -- 100 de Resend, qui les partage avec les rappels.
  select f.fournisseur, f.secret into v_fournisseur, v_secret from public.fournisseur_d_e_mail_d_auth() f;
  v_projet_par_jour := case when v_fournisseur = 'brevo' then c_projet_par_jour_brevo else c_projet_par_jour_resend end;

  -- Les plafonds ne valent que pour le rattachement (en-tête de la migration) : une reconnexion coûte
  -- déjà une case cochée par code, et la plafonner laissait n'importe qui bloquer celle d'un autre.
  if v_type = 'email_change' then
    -- Deux demandes simultanées vers la même adresse compteraient le même passé : une à la fois, pour
    -- cette adresse seulement. Le verrou tient jusqu'à la fin de la transaction d'Auth, envoi compris :
    -- un verrou commun à tout le projet ferait attendre chaque demande derrière l'envoi des autres,
    -- dans ses deux secondes. Entre adresses différentes, des demandes simultanées peuvent donc
    -- dépasser le plafond du projet, d'autant qu'elles sont nombreuses à la même seconde ; c'est accepté.
    perform pg_advisory_xact_lock(hashtext('envois_d_e_mails_d_auth:' || encode(v_empreinte, 'hex')));
    select count(*),
           count(*) filter (where user_id = v_user and cree_le > now() - interval '1 hour'),
           count(*) filter (where adresse_empreinte = v_empreinte and cree_le > now() - interval '1 hour')
      into v_jour, v_compte, v_par_adresse
      from public.envois_d_e_mails_d_auth
     where issue = 'envoye'
       and type = 'email_change'
       and cree_le > now() - interval '24 hours';

    v_plafond := case
      when v_jour >= v_projet_par_jour then 'plafond_projet'
      when v_compte >= c_par_compte_par_heure then 'plafond_compte'
      when v_par_adresse >= c_par_adresse_par_heure then 'plafond_adresse'
    end;

    if v_plafond is not null then
      -- Muet, quel que soit le plafond (en-tête de la migration).
      insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue)
      values (v_user, v_empreinte, v_type, v_plafond);
      return '{}'::jsonb;
    end if;
  end if;

  -- Sans aucun fournisseur, l'erreur vient après les plafonds, comme avant : une demande tue reste muette.
  if v_fournisseur is null then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 500, 'message',
      'Aucun moyen d''envoi : il manque les secrets Vault brevo_api_key_connexion et resend_api_key_connexion.'));
  end if;

  select r.sujet, r.html into v_sujet, v_html from public.rendre_l_e_mail_d_auth(v_type, v_code, v_adresse) r;

  -- La requête se construit hors du bloc qui rattrape l'échec de l'envoi : seul l'appel réseau y est.
  v_requete := public.requete_d_e_mail_d_auth(v_fournisseur, v_secret, v_adresse, v_sujet, v_html);

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '1500');
    select * into v_reponse from extensions.http(v_requete);
  exception when others then
    -- Un 500 : l'app le lit comme une panne de transport (« Ta demande n'a pas abouti »), et c'en est
    -- une. Le dépassement des deux secondes, lui, n'arrive pas ici (`query_canceled` échappe à
    -- `others`) : Supabase rend son propre 500.
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 500, 'message', 'L''envoi de l''e-mail a échoué.'));
  end;

  if v_reponse.status not between 200 and 299 then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 500, 'message', format('L''envoi de l''e-mail a été refusé (HTTP %s).', v_reponse.status)));
  end if;

  insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue, statut_http, fournisseur)
  values (v_user, v_empreinte, v_type, 'envoye', v_reponse.status, v_fournisseur);
  return '{}'::jsonb;
end;
$function$;

revoke execute on function public.envoyer_l_e_mail_d_auth(jsonb) from public, anon, authenticated;
grant execute on function public.envoyer_l_e_mail_d_auth(jsonb) to supabase_auth_admin;
