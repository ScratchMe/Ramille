-- Le plan anti-abus, deuxième brique (décision de la personne qui pilote, 04/10/2026, `v1-27`
-- §12.35 ; valeurs et phrases tranchées le 05/10/2026) : des plafonds sur les e-mails de connexion.
--
-- **Pourquoi.** Le captcha protège la création de session et la demande d'un code de reconnexion
-- (`signInWithOtp`), pas le code de rattachement : il part d'`updateUser({ email })`, sur une session
-- déjà ouverte. Une seule case cochée ouvrait donc une session capable d'envoyer un code par minute
-- vers n'importe quelle adresse — de quoi épuiser les 30 e-mails par heure de tout le projet (plus
-- personne ne reçoit son code), vider les 100 e-mails par jour du plan gratuit de Resend que les
-- rappels partagent, ou inonder la boîte d'une vraie personne.
--
-- **Comment.** Supabase confie chaque e-mail d'authentification à une fonction de la base (le « Send
-- Email Hook », `envoyer_l_e_mail_d_auth`), qui compte, puis envoie elle-même par l'API de Resend — en
-- attendant Brevo (plan anti-abus, chantier à part), qui ne changera que l'appel et le plafond du jour.
-- Le hook s'allume dans le tableau de bord (Authentication → Hooks), pas ici : cette migration ne
-- change rien tant qu'il est éteint, et l'éteindre rend l'envoi au SMTP et aux gabarits du tableau
-- de bord, qui restent en place pour ça (registre d'exploitation §3.1).
--
-- **Les plafonds** (fenêtres glissantes, seuls les envois partis comptent) :
--   - 5 codes par heure et par compte ;
--   - 5 codes par heure et par adresse ;
--   - 60 codes par jour pour tout le projet, ce qui laisse leur part aux rappels dans les 100 e-mails
--     par jour de Resend.
-- Le minimum d'une minute de Supabase entre deux codes d'un même compte reste devant. Son plafond
-- horaire (30), lui, n'est pas compté : sur la stack locale, 32 rattachements d'affilée sont tous partis
-- par le hook — une stack sans SMTP, donc la mesure ne tranche pas pour la production.
--
-- **Tous les plafonds sont muets** (décision de la personne qui pilote, 05/10/2026) : au-delà, rien ne
-- part, et l'écran dit « envoyé ». Un refus dirait qui a un compte, par deux chemins. Pour la
-- reconnexion, seules les adresses qui ont un compte arrivent jusqu'ici (une adresse inconnue rend
-- `422 otp_disabled` avant le hook), et le compte compté est celui de l'adresse visée. Et sur
-- `/connexion/email`, une adresse libre part en rattachement (compte du demandeur) quand une adresse
-- prise bascule en reconnexion (compte visé) : un refus du seul rattachement dirait laquelle des deux
-- branches est partie, sans même qu'un e-mail parte chez le titulaire — relevé par la contre-lecture.
-- **Ce que le silence coûte, et c'est su** : Supabase renouvelle quand même le code avant d'appeler le
-- hook, donc un plafond atteint tue le code déjà reçu sans en envoyer d'autre. Une personne qui
-- redemande un sixième code dans l'heure reste sans code valable jusqu'à ce que la fenêtre passe,
-- devant un écran qui dit « Un nouveau code vient de partir ». La minute imposée entre deux codes rend
-- ce cas rare, et c'est pourquoi le plafond de l'adresse est de cinq et non de trois.
--
-- **Le hook a deux secondes, pas une de plus** (mesuré le 05/10/2026 sur la stack locale : Supabase
-- pose `statement_timeout = 2s` sur son appel, et un `set statement_timeout` de fonction ne
-- l'allonge pas). L'envoi est synchrone, par l'extension `http` comme celui des rappels, borné à
-- 1,5 s : un aller-retour vers Resend depuis la production prend 110 à 220 ms (mesuré le même jour).
-- `pg_net`, asynchrone, a été écarté : un échec de Resend y aurait été muet (l'écran dit « envoyé »,
-- rien n'arrive), et la clé d'API aurait transité par une table que l'extension ouvre à tous les
-- rôles et que `postgres` ne peut pas refermer.

-- ── 1. Le journal des envois ─────────────────────────────────────────────────────────────────
--
-- Ce que les plafonds comptent. **Aucune adresse en clair** : son empreinte (SHA-256 de l'adresse en
-- minuscules) suffit à compter, et une adresse de rattachement peut être celle d'un tiers qui n'a
-- rien demandé. Purgé au plus tard au bout de deux jours (§4). Les échecs d'envoi (`500`) n'y laissent
-- pas de ligne : ils annulent la transaction de Supabase, la nôtre comprise — ils se lisent dans les
-- journaux d'Auth.
create table if not exists public.envois_d_e_mails_d_auth (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  -- Le demandeur pour un rattachement, le compte visé pour une reconnexion.
  user_id uuid references auth.users (id) on delete cascade,
  adresse_empreinte bytea not null,
  type text not null,
  issue text not null check (issue in ('envoye', 'plafond_compte', 'plafond_adresse', 'plafond_projet', 'type_ignore')),
  statut_http integer
);

comment on table public.envois_d_e_mails_d_auth is
  'Les e-mails d''authentification confiés au hook envoyer_l_e_mail_d_auth : ce que ses plafonds comptent. Empreinte de l''adresse, jamais l''adresse ; purgé au bout de deux jours.';

create index if not exists envois_d_e_mails_d_auth_user_id_idx on public.envois_d_e_mails_d_auth (user_id, cree_le);
create index if not exists envois_d_e_mails_d_auth_adresse_idx on public.envois_d_e_mails_d_auth (adresse_empreinte, cree_le);
create index if not exists envois_d_e_mails_d_auth_cree_le_idx on public.envois_d_e_mails_d_auth (cree_le);

alter table public.envois_d_e_mails_d_auth enable row level security;
-- Serveur seul : aucune policy, aucun privilège côté client. Le hook est `security definer`.
revoke all on table public.envois_d_e_mails_d_auth from public, anon, authenticated;

-- ── 2. Les gabarits ──────────────────────────────────────────────────────────────────────────
--
-- **Le texte exact de `supabase/templates/`**, aux espaces de fin de ligne près, et ce n'est pas une
-- copie qu'on relit : `scripts/verifier-gabarits-email.mjs` compare chaque bloc `$gabarit_…$` de la
-- dernière migration qui les porte au fichier du même nom. Les fichiers restent la référence parce que
-- le tableau de bord s'en sert quand le hook est éteint (en local, quand on l'éteint dans
-- `supabase/config.toml`). Les sujets sont ceux du tableau de bord (relus par l'API de management le
-- 05/10/2026), comparés au document de la même façon. `{{ .Token }}` et `{{ .NewEmail }}` gardent la
-- syntaxe de Supabase : c'est le hook qui les remplace, et la garde n'en admet pas d'autre.
create or replace function public.gabarit_d_e_mail_d_auth(p_type text, out sujet text, out html text)
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    case p_type
      when 'magiclink' then $sujet_lien_de_connexion$Ton code pour retrouver ton compte$sujet_lien_de_connexion$
      when 'email_change' then $sujet_rattachement_adresse$Cette adresse vient d'être saisie dans Ramille$sujet_rattachement_adresse$
    end,
    case p_type
      when 'magiclink' then $gabarit_lien_de_connexion$<p>Bonjour,</p>
<p>Voici ton code pour retrouver ton compte Ramille :</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:600">{{ .Token }}</p>
<p>Tape-le dans Ramille, sur l'écran qui l'attend. Il vaut une heure, une seule fois.</p>
<p>Si tu n'as rien demandé, tu peux ignorer ce message : sans ce code, personne n'entre.</p>
<p>— Ramille</p>
$gabarit_lien_de_connexion$
      when 'email_change' then $gabarit_rattachement_adresse$<p>Bonjour,</p>
<p>L'adresse {{ .NewEmail }} vient d'être saisie dans Ramille, pour qu'un bilan transport puisse être retrouvé depuis un autre appareil.</p>
<p>Si ce n'est pas toi, ne fais rien : sans ce code, cette adresse n'est rattachée à rien — et personne ne peut le taper à ta place.</p>
<p>Si c'est toi, voici le code à taper dans Ramille, sur l'écran qui l'attend :</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:600">{{ .Token }}</p>
<p>Il vaut une heure, une seule fois.</p>
<p>— Ramille</p>
$gabarit_rattachement_adresse$
    end;
$$;

comment on function public.gabarit_d_e_mail_d_auth(text) is
  'Sujet et corps des deux e-mails de connexion (magiclink, email_change), à l''identique de supabase/templates/ — comparés par scripts/verifier-gabarits-email.mjs.';

revoke execute on function public.gabarit_d_e_mail_d_auth(text) from public, anon, authenticated;

-- Le gabarit rempli : à part du hook pour que pgTAP voie le corps qui part, échappement compris, sans
-- rien envoyer. L'adresse entre dans du HTML : échappée comme le fait le moteur de gabarits de
-- Supabase. Le code n'est fait que de chiffres.
create or replace function public.rendre_l_e_mail_d_auth(p_type text, p_code text, p_adresse text, out sujet text, out html text)
language sql
immutable
set search_path = public, pg_temp
as $$
  select g.sujet,
         replace(
           replace(g.html, '{{ .Token }}', p_code),
           '{{ .NewEmail }}',
           replace(replace(replace(replace(replace(p_adresse, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&#34;'), '''', '&#39;')
         )
    from public.gabarit_d_e_mail_d_auth(p_type) g;
$$;

comment on function public.rendre_l_e_mail_d_auth(text, text, text) is
  'Sujet et corps d''un e-mail de connexion, code et adresse (échappée) remplacés. Appelée par envoyer_l_e_mail_d_auth.';

revoke execute on function public.rendre_l_e_mail_d_auth(text, text, text) from public, anon, authenticated;

-- ── 3. Le hook ───────────────────────────────────────────────────────────────────────────────
--
-- `security definer` contre l'avis de la documentation de Supabase, qui préfère accorder les tables
-- à `supabase_auth_admin` : le hook lit Vault et appelle `http`, ce que ce rôle n'a pas, et lui
-- ouvrir Vault serait plus large que de l'ouvrir à cette seule fonction. Seul `supabase_auth_admin`
-- l'exécute (§ fin).
--
-- **Deux types seulement partent** : `magiclink` (le code de reconnexion, vérifié en `email`) et
-- `email_change` (le code de rattachement). Les autres — inscription par mot de passe,
-- réinitialisation, invitation, notifications — ne sont pas des parcours du produit, qui n'a pas de
-- mot de passe : rien ne part, sans erreur. Une erreur dirait si l'adresse a un compte, puisque
-- Supabase ne fait partir ces e-mails-là que pour les adresses qu'il connaît.
create or replace function public.envoyer_l_e_mail_d_auth(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_par_compte_par_heure constant integer := 5;
  c_par_adresse_par_heure constant integer := 5;
  c_projet_par_jour constant integer := 60;
  v_type text := event -> 'email_data' ->> 'email_action_type';
  v_user uuid := nullif(event -> 'user' ->> 'id', '')::uuid;
  v_adresse text;
  v_code text;
  v_empreinte bytea;
  v_jour integer;
  v_compte integer;
  v_par_adresse integer;
  v_plafond text;
  v_cle text;
  v_boite text;
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
  -- Deux demandes simultanées vers la même adresse compteraient le même passé : une à la fois, pour
  -- cette adresse seulement. Le verrou tient jusqu'à la fin de la transaction d'Auth, envoi compris :
  -- un verrou commun à tout le projet ferait attendre chaque demande derrière l'envoi des autres, dans
  -- ses deux secondes. Entre adresses différentes, des demandes simultanées peuvent donc dépasser d'une
  -- ou deux unités les plafonds du compte et du projet ; c'est accepté.
  perform pg_advisory_xact_lock(hashtext('envois_d_e_mails_d_auth:' || encode(v_empreinte, 'hex')));
  select count(*),
         count(*) filter (where user_id = v_user and cree_le > now() - interval '1 hour'),
         count(*) filter (where adresse_empreinte = v_empreinte and cree_le > now() - interval '1 hour')
    into v_jour, v_compte, v_par_adresse
    from public.envois_d_e_mails_d_auth
   where issue = 'envoye'
     and cree_le > now() - interval '24 hours';

  v_plafond := case
    when v_jour >= c_projet_par_jour then 'plafond_projet'
    when v_compte >= c_par_compte_par_heure then 'plafond_compte'
    when v_par_adresse >= c_par_adresse_par_heure then 'plafond_adresse'
  end;

  if v_plafond is not null then
    -- Muet, quel que soit le plafond et quel que soit le type (en-tête de la migration).
    insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue)
    values (v_user, v_empreinte, v_type, v_plafond);
    return '{}'::jsonb;
  end if;

  -- La production envoie par Resend. La stack locale n'a pas de clé : elle porte à la place l'adresse
  -- de son collecteur d'e-mails (`supabase/config.toml`, `[db.vault]`), que la production n'a jamais.
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'resend_api_key_connexion';
  if v_cle is null then
    select decrypted_secret into v_boite from vault.decrypted_secrets where name = 'boite_d_essai_des_e_mails';
    if v_boite is null then
      return jsonb_build_object('error', jsonb_build_object(
        'http_code', 500, 'message', 'Aucun moyen d''envoi : il manque le secret Vault resend_api_key_connexion.'));
    end if;
  end if;

  select r.sujet, r.html into v_sujet, v_html from public.rendre_l_e_mail_d_auth(v_type, v_code, v_adresse) r;

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '1500');
    if v_cle is not null then
      select * into v_reponse from extensions.http((
        'POST',
        'https://api.resend.com/emails',
        array[extensions.http_header('Authorization', 'Bearer ' || v_cle)],
        'application/json',
        jsonb_build_object(
          'from', 'Ramille <connexion@ramille.fr>',
          'to', jsonb_build_array(v_adresse),
          'subject', v_sujet,
          'html', v_html
        )::text
      )::extensions.http_request);
    else
      select * into v_reponse from extensions.http((
        'POST',
        v_boite,
        null,
        'application/json',
        jsonb_build_object(
          'From', jsonb_build_object('Email', 'connexion@ramille.fr', 'Name', 'Ramille'),
          'To', jsonb_build_array(jsonb_build_object('Email', v_adresse)),
          'Subject', v_sujet,
          'HTML', v_html
        )::text
      )::extensions.http_request);
    end if;
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

  insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue, statut_http)
  values (v_user, v_empreinte, v_type, 'envoye', v_reponse.status);
  return '{}'::jsonb;
end;
$$;

comment on function public.envoyer_l_e_mail_d_auth(jsonb) is
  'Send Email Hook de Supabase : applique les plafonds d''e-mails de connexion (5 par heure et par compte, 5 par heure et par adresse, 60 par jour), muets, puis envoie par Resend. S''allume dans Authentication → Hooks.';

revoke execute on function public.envoyer_l_e_mail_d_auth(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.envoyer_l_e_mail_d_auth(jsonb) to supabase_auth_admin;

-- ── 4. La purge ──────────────────────────────────────────────────────────────────────────────
--
-- Les fenêtres les plus longues durent vingt-quatre heures : le passage quotidien efface ce qui a plus
-- d'un jour, donc une ligne vit au plus deux jours — la durée que promet la page de confidentialité.
-- Entre minuit et une heure (UTC), où le registre d'exploitation range les crons neufs (§3.1).
do $$
begin
  perform cron.unschedule('purge-envois-d-e-mails-d-auth');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'purge-envois-d-e-mails-d-auth',
  '40 0 * * *',
  $$delete from public.envois_d_e_mails_d_auth where cree_le < now() - interval '1 day'$$
);

-- ── 5. L'export ──────────────────────────────────────────────────────────────────────────────
--
-- La page de confidentialité promet que l'export rend « l'intégralité de ce que nous conservons sur
-- toi », et ce journal porte l'identifiant du compte : il y entre, sous `codes_de_connexion_envoyes`
-- (type, issue, date). **L'empreinte de l'adresse n'y part pas** : c'est une clé de comptage, pas un
-- fait sur la personne — et l'adresse elle-même est déjà dans `compte`.
--
-- **Réécrite depuis le corps installé** (`pg_get_functiondef`, empreinte
-- `5b18b3e88c3c40553373766b29abcd04`, relevée en local et sur le distant le 05/10/2026). Seul ajout :
-- la clé ci-dessus, avant `reperes_de_parcours`.
create or replace function public.export_my_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
declare
  v_user_id uuid := auth.uid();
  v_export jsonb;
begin
  if v_user_id is null then
    raise exception 'Aucune session.' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'export_genere_le', now(),
    'compte', (
      select jsonb_build_object(
        'identifiant', u.id,
        'email', u.email,
        'compte_anonyme', u.is_anonymous,
        'cree_le', u.created_at,
        'cadence_du_plan', p.cadence_type,
        'canal_de_rappel', p.reminder_channel,
        'mot_de_la_veille', p.mot_de_la_veille,
        'metadonnees', u.raw_user_meta_data,
        'adresse_en_attente_de_confirmation', nullif(u.email_change, '')
      )
      from auth.users u join public.profiles p on p.id = u.id
      where u.id = v_user_id
    ),
    'identites_de_connexion', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fournisseur', i.provider,
        'donnees_transmises', i.identity_data,
        'liee_le', i.created_at,
        'derniere_connexion_le', i.last_sign_in_at
      ) order by i.created_at), '[]'::jsonb)
      from auth.identities i where i.user_id = v_user_id
    ),
    'sessions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'ouverte_le', s.created_at,
        'mise_a_jour_le', s.updated_at,
        'adresse_ip', host(s.ip),
        'appareil', s.user_agent
      ) order by s.created_at), '[]'::jsonb)
      from auth.sessions s where s.user_id = v_user_id
    ),
    'appareils_pour_les_rappels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'plateforme', t.platform,
        'jeton_derniers_caracteres', right(t.token, 6),
        'enregistre_le', t.created_at,
        'vu_le', t.last_seen_at,
        'desactive_le', t.disabled_at
      ) order by t.created_at), '[]'::jsonb)
      from public.push_tokens t where t.user_id = v_user_id
    ),
    'bilans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'soumis_le', a.submitted_at,
        'statut', a.status,
        'reponses', to_jsonb(ans.*) - 'assessment_id',
        'resultats', to_jsonb(r.*) - 'assessment_id' - 'id'
      ) order by a.created_at), '[]'::jsonb)
      from public.assessments a
      left join public.assessment_answers ans on ans.assessment_id = a.id
      left join public.assessment_results r on r.assessment_id = a.id
      where a.user_id = v_user_id
    ),
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'periode', pc.period_label,
        'du', pc.period_start,
        'au', pc.period_end,
        'objectif_pct', pc.target_reduction_pct,
        'premier_engagement_le', pc.premier_engagement_le,
        'actions', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'action', t.action_text,
            'gain_kg_par_an', pa.saving_kg_year,
            'engagement_pris_le', pa.committed_at,
            'jours_choisis', pa.intention_days,
            'echeance_choisie', pa.intention_timing
          ) order by pa.rank), '[]'::jsonb)
          from public.plan_actions pa
          join public.action_templates t on t.id = pa.action_template_id
          where pa.plan_cycle_id = pc.id
        )
      ) order by pc.period_start), '[]'::jsonb)
      from public.plan_cycles pc where pc.user_id = v_user_id
    ),
    'points_de_suivi', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'periode', c.period_label,
        'trajet', c.trip_label,
        'statut', c.status,
        'reponse', c.response,
        'type_de_reponse', c.response_kind,
        'question', c.committed_question,
        'poste', c.poste,
        'mode', c.mode,
        'action_suivie', c.committed_action_text,
        'jours_choisis', c.committed_intention_days,
        'echeance_choisie', c.committed_intention_timing,
        'repondu_le', c.responded_at
      ) order by c.period_start), '[]'::jsonb)
      from public.engagement_checkins c where c.user_id = v_user_id
    ),
    'rappels_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'genre', o.genre,
        'periode', c.period_label,
        'jour_vise', o.jour_vise,
        'canal', o.channel,
        'destinataire', case when o.channel = 'email' then o.recipient_email end,
        'objet', case when o.channel = 'email' then o.subject end,
        'message', case when o.channel = 'email'
          then regexp_replace(o.body, 'jeton=[0-9A-Fa-f-]+', 'jeton=(retiré de l''export)', 'g') end,
        'notification', case when o.channel = 'push' then o.push_body end,
        'statut', o.status,
        'envoye_le', o.sent_at,
        'desinscription_utilisee_le', o.unsubscribe_used_at
      ) order by o.created_at), '[]'::jsonb)
      from public.notification_outbox o
      left join public.engagement_checkins c on c.id = o.checkin_id
      where o.user_id = v_user_id
    ),
    'engagements_relaches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'action', ar2.action_text,
        'engagement_pris_le', ar2.committed_at,
        'jours_choisis', ar2.intention_days,
        'echeance_choisie', ar2.intention_timing,
        'relache_le', ar2.released_at,
        'raison', ar2.released_reason
      ) order by ar2.released_at), '[]'::jsonb)
      from public.plan_action_commitments_archive ar2 where ar2.user_id = v_user_id
    ),
    'retours_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'categorie', f.kind, 'message', f.message, 'ecran', f.context, 'envoye_le', f.created_at
      ) order by f.created_at), '[]'::jsonb)
      from public.feedback f where f.user_id = v_user_id
    ),
    'codes_de_connexion_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type', ev.type, 'issue', ev.issue, 'le', ev.cree_le
      ) order by ev.cree_le), '[]'::jsonb)
      from public.envois_d_e_mails_d_auth ev where ev.user_id = v_user_id
    ),
    'reperes_de_parcours', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'evenement', e.name, 'details', e.props, 'plateforme', e.platform, 'le', e.occurred_at
      ) order by e.occurred_at), '[]'::jsonb)
      from public.usage_events e where e.user_id = v_user_id
    )
  ) into v_export;

  return v_export;
end;
$fn$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- Contrôle d'installation : il vérifie ce que ce fichier vient d'installer, pas un rejeu ultérieur.
do $$
declare
  v_corps text := (select prosrc from pg_proc where oid = 'public.export_my_data()'::regprocedure);
begin
  if position('codes_de_connexion_envoyes' in v_corps) = 0
     or position('retiré de l''''export' in v_corps) = 0
     or position('reperes_de_parcours' in v_corps) = 0 then
    raise exception 'export_my_data ne rend pas les codes de connexion envoyés, ou a perdu une clé';
  end if;
  if position('adresse_empreinte' in v_corps) > 0 then
    raise exception 'export_my_data rend l''empreinte de l''adresse';
  end if;
  if has_function_privilege('anon', 'public.export_my_data()', 'execute') then
    raise exception 'anon peut appeler export_my_data';
  end if;
end;
$$;
