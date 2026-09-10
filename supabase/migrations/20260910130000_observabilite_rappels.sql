-- Observabilité et robustesse de l'envoi des rappels.
-- Chantier C0.5 du plan v1-13 (docs/architecture/v1-13-audit-et-chantiers.md §3),
-- constats A9-1, A9-4, A9-12, A9-13, A9-14, A7-8.
--
-- CE QUI EST EN JEU. `send_pending_reminders()` est la seule boucle de réengagement du
-- produit, et c'est aussi le seul mécanisme dont personne ne peut dire s'il tourne : la table
-- d'envoi est en RLS sans policy, aucune vue ne la lit, et deux chemins faisaient sortir la
-- fonction sans laisser la moindre trace. Si la clé de l'expéditeur expire, les rappels
-- s'arrêtent et le seul symptôme est une baisse des réponses aux points de suivi —
-- indiscernable d'un désintérêt.
--
-- LES SIX DÉFAUTS TRAITÉS ICI.
--   1. Aucune vue d'exploitation : on ajoute `analytics.rappels_par_jour`,
--      `analytics.rappels_bloques` et `analytics.synchronisations_facteurs` (A9-4, A7-8).
--   2. Sortie muette faute de secret Vault : `public.reminder_send_runs` journalise chaque
--      passage, canal par canal, **y compris celui qui ne fait rien** (A9-4).
--   3. Un message parti pouvait repartir : la ligne est marquée `sent` **avant** l'appel, et
--      remise en attente si l'appel échoue ; une procédure committe entre les passes (A9-1).
--   4. Une requête HTTP par notification : les pushs partent par lots de cent (A9-13).
--   5. Un plafond de cent partagé entre push et email alors que seul l'email est plafonné
--      par l'expéditeur : un budget par canal (A9-13).
--   6. Le repli push -> email perdait une journée : la branche email tourne après la branche
--      push, dans la même passe (A9-12). Et `collect_push_receipts` fait avancer sa file au
--      lieu de retenter indéfiniment (A9-14).
--
-- CE QUI NE CHANGE PAS, ET QU'IL NE FAUT PAS « AMÉLIORER ». La garantie anti-relance de la
-- spec §7 reste structurelle : `unique(checkin_id)` sur la boîte d'envoi, un point = un
-- message, jamais deux. Le repli est une **mise à jour de la même ligne**, jamais une
-- seconde. Et l'envoi reste inactif tant que les secrets Vault ne sont pas déposés : les
-- rappels attendent, rien n'est perdu — la seule différence est qu'on le voit maintenant.

-- ── 1. Le journal des passages ─────────────────────────────────────────────────────────
-- Même modèle que `emission_factor_sync_runs` et `purge_runs` : sans trace, un mécanisme qui
-- ne tourne pas — ou qui tourne et refuse de s'appliquer — est indétectable, le cron n'ayant
-- personne pour lire ses `raise warning`.
--
-- Une ligne **par canal et par passage**, et seulement quand ce canal avait quelque chose à
-- faire : un journal qui écrirait deux lignes vides chaque nuit ne se lirait plus.

create table public.reminder_send_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  -- `success` : rien n'a échoué (y compris « rien à envoyer sur ce canal »).
  -- `partial` : une partie est partie, une autre a échoué.
  -- `error`   : il y avait des messages et aucun n'est parti.
  -- `skipped` : rien n'a été tenté — secret Vault absent, ou plafond journalier atteint.
  status text not null check (status in ('success', 'partial', 'error', 'skipped')),
  canal text not null check (canal in ('email', 'push')),
  traites integer not null default 0,
  envoyes integer not null default 0,
  echecs integer not null default 0,
  detail text
);

comment on table public.reminder_send_runs is
  'Journal des passages de send_pending_reminders(), une ligne par canal. status = skipped : rien n''a été tenté (secret Vault absent ou plafond journalier atteint), les rappels restent en attente. Écrit par le serveur, jamais lu par un client — se lit depuis le SQL editor, à côté de analytics.rappels_par_jour qui dit ce qui est parti.';

alter table public.reminder_send_runs enable row level security;

-- Table serveur-only : RLS activée **sans aucune policy**, donc invisible même pour un
-- propriétaire — aucune ligne n'appartient à personne. Les revoke sont écrits explicitement et
-- ne comptent sur aucun drapeau de configuration : `auto_expose_new_tables` est retiré de
-- supabase/config.toml par le chantier C0.3, et une table qui dépendrait de lui perdrait son
-- garde-fou en silence le jour où la base est reconstruite depuis les migrations.
revoke all privileges on table public.reminder_send_runs from anon, authenticated;

create index reminder_send_runs_ran_at_idx on public.reminder_send_runs(ran_at desc);

-- ── 2. Les vues d'exploitation ─────────────────────────────────────────────────────────
-- Dans le schéma `analytics`, non exposé par PostgREST : ces vues croisent les envois de tous
-- les utilisateurs, elles n'ont rien à faire derrière une clé anonyme. Elles se lisent depuis
-- le SQL editor ou le MCP, avec les droits du projet.
--
-- **Sans `security_invoker`**, comme les cinq vues déjà en place (20260905170000,
-- 20260905170200) : les tables sous-jacentes sont en RLS sans policy et leur SELECT est
-- révoqué, donc une vue en `security_invoker` ne serait lisible par personne — elle
-- n'ajouterait pas une barrière, elle supprimerait la vue.
--
-- **Chaque vue porte son propre revoke** : le `revoke all on all tables in schema analytics`
-- des migrations passées ne couvre que ce qui existait à leur date.

create or replace view analytics.rappels_par_jour as
select
  -- Le jour où le message est parti, ou à défaut celui où il a été mis en file : une ligne
  -- en attente doit se voir quelque part, sinon une file qui ne s'écoule pas est invisible.
  date_trunc('day', coalesce(o.sent_at, o.created_at))::date as jour,
  o.channel as canal,
  o.status as statut,
  count(*) as nombre
from public.notification_outbox o
group by 1, 2, 3;

comment on view analytics.rappels_par_jour is
  'Volumétrie des rappels par jour, canal et statut. C''est la vue qui répond à « les rappels partent-ils ? » — un jour sans ligne sent alors que des points sont ouverts est le signal d''un envoi cassé.';

revoke all privileges on table analytics.rappels_par_jour from anon, authenticated;

-- Ce qui ne part pas : les lignes en attente depuis plus de deux jours (l'étalement de
-- l'email ne dépasse jamais quatre jours, mais une ligne due depuis deux jours n'a plus
-- d'excuse) et les lignes en échec définitif. Sans l'adresse : le `user_id` suffit à
-- retrouver la personne, et une vue d'exploitation n'a pas besoin de recopier un email.
create or replace view analytics.rappels_bloques as
select
  o.id,
  o.user_id,
  o.channel as canal,
  o.status as statut,
  o.send_after,
  o.attempts as tentatives,
  o.last_error as derniere_erreur,
  now() - o.created_at as age,
  c.loop_type as boucle,
  c.period_label as periode
from public.notification_outbox o
join public.engagement_checkins c on c.id = o.checkin_id
where (o.status = 'pending' and o.send_after < now() - interval '2 days')
   or o.status = 'failed';

comment on view analytics.rappels_bloques is
  'Les rappels qui ne partent pas : en attente depuis plus de deux jours, ou en échec définitif. La dernière erreur et l''âge sont là pour trancher entre « l''expéditeur refuse » et « la file n''avance plus ».';

revoke all privileges on table analytics.rappels_bloques from anon, authenticated;

-- La synchronisation trimestrielle des facteurs journalise déjà chaque passage
-- (20260905100000:269, statut `success` / `partial` / `error`) : ce qui manquait n'était pas
-- la trace mais sa lecture — constat A7-8. Un slug renommé côté API, ou un écart de plus de
-- 50 % retenu pour relecture, laisse un `partial` que plus rien ne cachait… sauf que personne
-- ne le lisait, et que le cron ne repasse que tous les trois mois : un mode peut rester figé
-- un an. D'où `dernier_succes`, qui dit en une colonne depuis quand le référentiel ne bouge
-- plus.
create or replace view analytics.synchronisations_facteurs as
select
  r.ran_at,
  r.status as statut,
  r.modes_updated as modes_mis_a_jour,
  r.detail,
  date_trunc('day', now()) - date_trunc('day', r.ran_at) as age,
  (select max(s.ran_at) from public.emission_factor_sync_runs s where s.status = 'success') as dernier_succes
from public.emission_factor_sync_runs r
where r.status <> 'success';

comment on view analytics.synchronisations_facteurs is
  'Les synchronisations de facteurs qui n''ont pas abouti (partial = slug renommé ou écart retenu pour relecture, error = appel en échec). dernier_succes dit depuis quand le référentiel ne bouge plus.';

revoke all privileges on table analytics.synchronisations_facteurs from anon, authenticated;

-- ── 3. Le repli, complété ──────────────────────────────────────────────────────────────
-- Inchangé sur le fond — **on met à jour la ligne, on n'en crée jamais une seconde** — avec un
-- ajout rendu nécessaire par le marquage avant appel : la ligne repliée a pu être marquée
-- `sent` une seconde plus tôt, et garderait sinon un `sent_at` qui n'a jamais eu lieu.
create or replace function public.replier_rappel_sur_email(p_outbox_id uuid, p_raison text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.notification_outbox
  set channel = case when recipient_email is not null then 'email' else channel end,
      status = case when recipient_email is not null then 'pending' else 'failed' end,
      sent_at = null,
      send_after = now(),
      last_error = 'push : ' || p_raison
        || case when recipient_email is not null then ' — repli sur l''email' else ' — aucun repli possible' end
  where id = p_outbox_id;
end;
$function$;

revoke execute on function public.replier_rappel_sur_email(uuid, text) from public, anon, authenticated;

-- ── 4. Un lot de notifications, un seul appel ───────────────────────────────────────────
-- L'API Expo accepte un tableau de messages par requête, cent notifications au plus. Cent
-- lignes faisaient cent appels HTTP : à vingt secondes de délai d'attente chacun, un cron
-- pouvait dépasser la demi-heure.
--
-- **Un message par destinataire, jamais un message à plusieurs destinataires.** Expo rend un
-- ticket par notification, dans l'ordre de la requête, et c'est le seul lien entre un refus et
-- le jeton qui l'a causé. Avec un `to` à plusieurs jetons, ce lien dépend de la façon dont
-- Expo développe la liste ; avec un message par jeton, la correspondance est positionnelle par
-- construction. Le corps répété coûte quelques octets, se tromper de jeton coûterait de
-- désactiver l'appareil de quelqu'un d'autre.
--
-- Les trois tableaux d'entrée sont alignés : `p_lignes[i]`, `p_jetons[i]` et le i-ème message
-- de `p_messages` décrivent la même notification.
create or replace function public.envoyer_lot_push(
  p_lignes uuid[],
  p_jetons text[],
  p_messages jsonb,
  p_expo_token text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  -- Un échec repousse la ligne : la procédure enchaîne les passes dans la même nuit, et sans
  -- ce délai un refus passager brûlerait les trois tentatives en quelques minutes au lieu de
  -- laisser sa chance au cron du lendemain. Même valeur dans `send_pending_reminders`.
  c_delai_relance constant interval := interval '2 hours';

  v_headers extensions.http_header[];
  v_response extensions.http_response;
  v_data jsonb;
  v_erreur text;
  v_lignes integer;
  v_envoyes integer := 0;
  v_replis integer := 0;
  v_ligne uuid;
  v_tickets jsonb;
begin
  if p_lignes is null or array_length(p_lignes, 1) is null then
    return jsonb_build_object('envoyes', 0, 'echecs', 0, 'replis', 0);
  end if;

  select count(distinct l)::integer into v_lignes from unnest(p_lignes) as l;

  -- Le jeton d'accès n'est joint que s'il existe dans Vault : sans la sécurité renforcée
  -- activée sur expo.dev, l'envoi passe sans en-tête (v1-12 §7).
  v_headers := array[extensions.http_header('accept', 'application/json')];
  if p_expo_token is not null then
    v_headers := v_headers || extensions.http_header('Authorization', 'Bearer ' || p_expo_token);
  end if;

  begin
    select * into v_response from extensions.http((
      'POST',
      'https://exp.host/--/api/v2/push/send',
      v_headers,
      'application/json',
      p_messages::text
    )::extensions.http_request);

    if v_response.status between 200 and 299 then
      v_data := (v_response.content::jsonb) -> 'data';
    else
      v_erreur := 'HTTP ' || v_response.status || ' — ' || left(coalesce(v_response.content, ''), 300);
    end if;
  exception when others then
    v_erreur := left(sqlerrm, 300);
  end;

  -- Les tickets se lisent **par position** : une réponse dont le nombre de tickets ne
  -- correspond pas au nombre de notifications envoyées ne s'interprète pas, et deviner
  -- désactiverait le mauvais jeton. Deux `if` imbriqués plutôt qu'un `or` : l'ordre
  -- d'évaluation d'un `or` n'est pas garanti, et `jsonb_array_length` lève sur un scalaire.
  if v_erreur is null then
    if v_data is null or jsonb_typeof(v_data) <> 'array' then
      v_erreur := format('réponse Expo inattendue : %s au lieu d''un tableau de tickets',
                         coalesce(jsonb_typeof(v_data), 'rien'));
    elsif jsonb_array_length(v_data) <> array_length(p_jetons, 1) then
      v_erreur := format('réponse Expo inattendue : %s ticket(s) pour %s notification(s)',
                         jsonb_array_length(v_data), array_length(p_jetons, 1));
    end if;
  end if;

  if v_erreur is not null then
    -- Rien n'est parti : le marquage `sent` posé avant l'appel est défait. `attempts` a déjà
    -- été incrémenté par ce marquage, d'où le test sur sa valeur courante.
    update public.notification_outbox
    set status = case when attempts >= 3 then 'failed' else 'pending' end,
        sent_at = null,
        send_after = now() + c_delai_relance,
        last_error = v_erreur
    where id = any(p_lignes);

    return jsonb_build_object('envoyes', 0, 'echecs', v_lignes, 'replis', 0);
  end if;

  -- Un jeton qu'Expo ne reconnaît plus : app désinstallée, ou permission retirée. On le
  -- désactive pour ne plus pousser dans le vide — pousser vers des jetons morts dégrade la
  -- réputation de l'app auprès de FCM.
  update public.push_tokens t
  set disabled_at = now(), disabled_reason = 'DeviceNotRegistered'
  from (
    select p_jetons[i] as token
    from generate_subscripts(p_jetons, 1) as i
    where (v_data -> (i - 1)) #>> '{details,error}' = 'DeviceNotRegistered'
  ) d
  where t.token = d.token and t.disabled_at is null;

  -- Une ligne d'outbox peut avoir plusieurs appareils : elle est partie dès qu'un ticket est
  -- accepté, et ne se replie sur l'email que si tous ont été refusés.
  for v_ligne, v_tickets in
    select d.ligne,
           jsonb_object_agg(d.ticket, d.token) filter (where d.accepte and d.ticket is not null)
    from (
      select p_lignes[i] as ligne,
             p_jetons[i] as token,
             (v_data -> (i - 1)) ->> 'id' as ticket,
             ((v_data -> (i - 1)) ->> 'status') = 'ok' as accepte
      from generate_subscripts(p_lignes, 1) as i
    ) d
    group by d.ligne
  loop
    if v_tickets is null then
      perform public.replier_rappel_sur_email(v_ligne, 'tous les jetons refusés');
      v_replis := v_replis + 1;
    else
      -- La ligne est déjà `sent` (marquage avant appel) : il ne reste qu'à ranger les tickets,
      -- sans quoi les reçus ne sauraient pas quel jeton désactiver.
      update public.notification_outbox
      set provider_ticket = v_tickets
      where id = v_ligne;
      v_envoyes := v_envoyes + 1;
    end if;
  end loop;

  return jsonb_build_object('envoyes', v_envoyes, 'echecs', 0, 'replis', v_replis);
end;
$function$;

revoke execute on function public.envoyer_lot_push(uuid[], text[], jsonb, text) from public, anon, authenticated;

-- ── 5. Une passe d'envoi ───────────────────────────────────────────────────────────────
-- La fonction rend le **nombre de messages traités** : c'est ce qui permet à la procédure
-- ci-dessous de savoir s'il reste du travail, et à une relance manuelle de le dire.
-- Le type de retour change, d'où le `drop` : `create or replace` ne peut pas le changer, et
-- ajouter des paramètres créerait une seconde fonction homonyme.
--
-- TROIS BORNES, ET POURQUOI ELLES NE SONT PAS À LA MÊME ÉCHELLE.
--   * Le plafond email est **journalier** (cent, offre gratuite de l'expéditeur) et compté sur
--     ce qui est déjà parti aujourd'hui : mis « par passe », la boucle de la procédure le
--     multiplierait par le nombre de passes et l'expéditeur refuserait au 101e.
--   * Le lot email est de vingt-cinq par passe : c'est ce qu'un abandon de transaction peut
--     faire repartir, et ce qui garde chaque appel loin de tout `statement_timeout`.
--   * Le push n'est plafonné par personne : cinq cents par passe, par lots de cent
--     notifications dans un seul appel (le plafond d'Expo).
-- Plus une borne de durée : une passe s'arrête au bout d'une minute et laisse la suite au
-- passage suivant. Sans elle, cent délais d'attente de vingt secondes font une demi-heure dans
-- une seule transaction — et tout ce qui y est parti redeviendrait « à envoyer » si elle
-- tombait.

drop function if exists public.send_pending_reminders();

create function public.send_pending_reminders()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  c_plafond_email_jour constant integer := 100;
  c_lot_email constant integer := 25;
  c_budget_push constant integer := 500;
  c_lot_push constant integer := 100;
  c_duree_max constant interval := interval '60 seconds';
  -- Un échec repousse la ligne de deux heures : la procédure enchaîne les passes dans la même
  -- nuit, et sans ce délai un refus passager (un 429 de l'expéditeur) brûlerait les trois
  -- tentatives en quelques minutes au lieu de laisser sa chance au cron du lendemain. Même
  -- valeur dans `envoyer_lot_push`.
  c_delai_relance constant interval := interval '2 hours';

  v_debut timestamptz := clock_timestamp();
  v_api_key text;
  v_from text;
  v_expo_token text;
  v_response extensions.http_response;
  rec record;

  v_jetons text[];
  v_lot_lignes uuid[] := '{}'::uuid[];
  v_lot_jetons text[] := '{}'::text[];
  v_lot_messages jsonb := '[]'::jsonb;
  v_resultat jsonb;

  v_candidats integer;
  v_budget integer;
  v_traites integer;
  v_envoyes integer;
  v_echecs integer;
  v_replis integer;
  v_statut text;
  v_total integer := 0;
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets where name = 'resend_api_key';

  select decrypted_secret into v_from
  from vault.decrypted_secrets where name = 'reminder_from_address';

  select decrypted_secret into v_expo_token
  from vault.decrypted_secrets where name = 'expo_access_token';

  -- Avant tout test de configuration : qu'un rappel soit caduc est une vérité sur les
  -- données, pas une étape d'expédition (cf. 20260907090000).
  update public.notification_outbox o
  set status = 'cancelled'
  from public.engagement_checkins c
  where c.id = o.checkin_id
    and o.status = 'pending'
    and c.status <> 'pending';

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

  -- ── Le push, par lots ────────────────────────────────────────────────────────────────
  -- **Avant l'email, et c'est tout le correctif du repli** (A9-12) : une ligne push qui ne
  -- trouve plus d'appareil joignable devient une ligne email due immédiatement, et la branche
  -- email ci-dessous la voit dans la même passe. Auparavant elle attendait le lendemain 7h —
  -- un septième de la fenêtre perdu pour un point hebdomadaire, et précisément pour la
  -- personne à qui l'app promet que « l'email prend le relais tout seul ».
  v_traites := 0;
  v_envoyes := 0;
  v_echecs := 0;
  v_replis := 0;

  select count(*) into v_candidats
  from public.notification_outbox
  where status = 'pending' and attempts < 3 and send_after <= now() and channel = 'push';

  if v_candidats > 0 then
    for rec in
      select * from public.notification_outbox
      where status = 'pending' and attempts < 3 and send_after <= now() and channel = 'push'
      order by send_after, created_at
      limit c_budget_push
    loop
      exit when clock_timestamp() - v_debut > c_duree_max;

      select array_agg(t.token order by t.created_at) into v_jetons
      from public.push_tokens t
      where t.user_id = rec.user_id and t.disabled_at is null;

      if v_jetons is null then
        -- Plus aucun appareil joignable : repli immédiat, sans consommer de tentative — aucun
        -- appel n'a eu lieu.
        perform public.replier_rappel_sur_email(rec.id, 'aucun jeton actif');
        v_replis := v_replis + 1;
        v_traites := v_traites + 1;
        continue;
      end if;

      -- Garde-fou pour un cas qui ne devrait jamais arriver : un compte portant plus de jetons
      -- actifs que le plafond d'un appel fabriquerait un lot irrecevable, qui échouerait en bloc
      -- et retiendrait la file. On pousse alors vers ses cent appareils les plus anciens.
      if array_length(v_jetons, 1) > c_lot_push then
        v_jetons := v_jetons[1:c_lot_push];
      end if;

      -- Le lot serait plein : on l'envoie avant d'y ajouter cette ligne.
      if coalesce(array_length(v_lot_jetons, 1), 0) + array_length(v_jetons, 1) > c_lot_push then
        v_resultat := public.envoyer_lot_push(v_lot_lignes, v_lot_jetons, v_lot_messages, v_expo_token);
        v_envoyes := v_envoyes + (v_resultat ->> 'envoyes')::integer;
        v_echecs := v_echecs + (v_resultat ->> 'echecs')::integer;
        v_replis := v_replis + (v_resultat ->> 'replis')::integer;
        v_lot_lignes := '{}'::uuid[];
        v_lot_jetons := '{}'::text[];
        v_lot_messages := '[]'::jsonb;
      end if;

      -- **Le marquage précède l'appel**, et se fait hors de tout bloc de rattrapage : une
      -- exception pendant l'envoi annule une sous-transaction, jamais ce marquage. Un message
      -- remis au fournisseur ne peut donc pas se retrouver « en attente », donc repartir
      -- (A9-1). Le prix de ce choix est assumé et c'est le bon sens : mieux vaut un rappel
      -- perdu qu'un rappel envoyé deux fois, pour un produit qui promet de ne jamais insister.
      update public.notification_outbox
      set status = 'sent', sent_at = now(), attempts = rec.attempts + 1, last_error = null
      where id = rec.id;

      for i in 1 .. array_length(v_jetons, 1) loop
        v_lot_lignes := v_lot_lignes || rec.id;
        v_lot_jetons := v_lot_jetons || v_jetons[i];
        v_lot_messages := v_lot_messages || jsonb_build_array(jsonb_build_object(
          'to', jsonb_build_array(v_jetons[i]),
          'title', rec.subject,
          'body', rec.push_body,
          'channelId', 'rappels',
          'data', jsonb_build_object('url', '/plan')
        ));
      end loop;

      v_traites := v_traites + 1;
    end loop;

    if array_length(v_lot_lignes, 1) is not null then
      v_resultat := public.envoyer_lot_push(v_lot_lignes, v_lot_jetons, v_lot_messages, v_expo_token);
      v_envoyes := v_envoyes + (v_resultat ->> 'envoyes')::integer;
      v_echecs := v_echecs + (v_resultat ->> 'echecs')::integer;
      v_replis := v_replis + (v_resultat ->> 'replis')::integer;
    end if;

    if v_echecs = 0 then
      v_statut := 'success';
    elsif v_envoyes > 0 then
      v_statut := 'partial';
    else
      v_statut := 'error';
    end if;

    insert into public.reminder_send_runs (status, canal, traites, envoyes, echecs, detail)
    values (v_statut, 'push', v_traites, v_envoyes, v_echecs,
      format('%s notification(s) en attente au début de la passe, %s repli(s) sur l''email.',
             v_candidats, v_replis));

    v_total := v_total + v_traites;
  end if;

  -- ── L'email ──────────────────────────────────────────────────────────────────────────
  v_traites := 0;
  v_envoyes := 0;
  v_echecs := 0;

  -- Les lignes repliées juste au-dessus sont **dans** ce compte : elles portent désormais
  -- `channel = 'email'`, `status = 'pending'` et `send_after = now()`.
  select count(*) into v_candidats
  from public.notification_outbox
  where status = 'pending' and attempts < 3 and send_after <= now() and channel = 'email';

  if v_candidats > 0 then
    if v_api_key is null or v_from is null then
      -- Pas d'expéditeur configuré : on ne touche pas à la file — ni envoi, ni échec, ni
      -- tentative gâchée — mais on **laisse une trace**. C'est le `continue` muet d'avant, et
      -- le seul moyen de distinguer « personne n'attend de rappel » de « l'envoi est éteint ».
      insert into public.reminder_send_runs (status, canal, traites, envoyes, echecs, detail)
      values ('skipped', 'email', 0, 0, 0, format(
        'Envoi inactif, secret manquant dans le Vault : %s. %s rappel(s) en attente, rien n''est perdu.',
        case
          when v_api_key is null and v_from is null then 'resend_api_key, reminder_from_address'
          when v_api_key is null then 'resend_api_key'
          else 'reminder_from_address'
        end,
        v_candidats));
    else
      -- Ce qui est déjà parti aujourd'hui, tous passages confondus : le plafond de
      -- l'expéditeur est journalier, la borne doit l'être aussi.
      select greatest(0, c_plafond_email_jour - count(*))::integer into v_budget
      from public.notification_outbox
      where channel = 'email' and status = 'sent' and sent_at >= date_trunc('day', now());

      if v_budget = 0 then
        insert into public.reminder_send_runs (status, canal, traites, envoyes, echecs, detail)
        values ('skipped', 'email', 0, 0, 0, format(
          'Plafond journalier de l''expéditeur atteint (%s envois). %s rappel(s) repoussés au prochain passage.',
          c_plafond_email_jour, v_candidats));
      else
        for rec in
          select * from public.notification_outbox
          where status = 'pending' and attempts < 3 and send_after <= now() and channel = 'email'
          order by send_after, created_at
          limit least(c_lot_email, v_budget)
        loop
          exit when clock_timestamp() - v_debut > c_duree_max;

          -- Marquage avant l'appel, hors du bloc de rattrapage : même raison qu'au push.
          update public.notification_outbox
          set status = 'sent', sent_at = now(), attempts = rec.attempts + 1, last_error = null
          where id = rec.id;

          v_traites := v_traites + 1;

          begin
            select * into v_response from extensions.http((
              'POST',
              'https://api.resend.com/emails',
              array[extensions.http_header('Authorization', 'Bearer ' || v_api_key)],
              'application/json',
              jsonb_build_object(
                'from', v_from,
                'to', jsonb_build_array(rec.recipient_email),
                'subject', rec.subject,
                'text', rec.body
              )::text
            )::extensions.http_request);

            if v_response.status between 200 and 299 then
              v_envoyes := v_envoyes + 1;
            else
              -- Trois tentatives puis abandon : un rappel n'a plus de sens une fois sa période
              -- passée, et insister sur une adresse qui refuse ne sert personne. La ligne est
              -- repoussée de deux heures : sans ce délai, les passes suivantes de la même nuit
              -- consommeraient les trois tentatives sur un refus passager.
              update public.notification_outbox
              set status = case when rec.attempts + 1 >= 3 then 'failed' else 'pending' end,
                  attempts = rec.attempts + 1,
                  sent_at = null,
                  send_after = now() + c_delai_relance,
                  last_error = 'HTTP ' || v_response.status || ' — ' || left(coalesce(v_response.content, ''), 300)
              where id = rec.id;
              v_echecs := v_echecs + 1;
            end if;

          exception when others then
            update public.notification_outbox
            set status = case when rec.attempts + 1 >= 3 then 'failed' else 'pending' end,
                attempts = rec.attempts + 1,
                sent_at = null,
                send_after = now() + c_delai_relance,
                last_error = left(sqlerrm, 300)
            where id = rec.id;
            v_echecs := v_echecs + 1;
          end;
        end loop;

        if v_echecs = 0 then
          v_statut := 'success';
        elsif v_envoyes > 0 then
          v_statut := 'partial';
        else
          v_statut := 'error';
        end if;

        insert into public.reminder_send_runs (status, canal, traites, envoyes, echecs, detail)
        values (v_statut, 'email', v_traites, v_envoyes, v_echecs,
          format('%s rappel(s) en attente au début de la passe, %s envoi(s) encore disponibles sur le plafond du jour.',
                 v_candidats, v_budget));
      end if;
    end if;

    v_total := v_total + v_traites;
  end if;

  return v_total;
end;
$function$;

revoke execute on function public.send_pending_reminders() from public, anon, authenticated;

comment on function public.send_pending_reminders() is
  'Une passe d''envoi des rappels en attente, push puis email (le push d''abord, pour que son repli sur l''email soit traité dans la même passe). Rend le nombre de messages traités. Le cron passe par la procédure envoyer_rappels(), qui committe entre les passes.';

-- ── 6. Le point d'entrée du cron : une procédure, pour committer entre les passes ───────
-- **Pourquoi une procédure et pas la fonction directement.** Une fonction plpgsql est un seul
-- bloc transactionnel : ses appels HTTP et ses changements de statut valident ou annulent
-- ensemble. Si la transaction tombe après le vingtième envoi (statement_timeout, redémarrage,
-- coupure), les vingt messages sont bel et bien partis chez le fournisseur mais aucun
-- `status = 'sent'` n'est conservé, et le passage du lendemain les renvoie. `unique(checkin_id)`
-- n'y peut rien : elle interdit une seconde **ligne**, pas un second **envoi** de la même ligne.
-- Seul un `commit` ferme cette fenêtre, et seule une procédure appelée par `call` peut le faire.
--
-- pg_cron exécute la commande telle quelle sur sa propre connexion, hors bloc transactionnel
-- explicite : `call` y est donc permis, et le `commit` interne aussi — c'est le même mécanisme
-- qui lui permet de lancer un `vacuum`. **La commande du job doit rester `call`, jamais
-- `select`** : un `select public.envoyer_rappels()` ne trouverait aucune fonction de ce nom.
--
-- **Ni `security definer`, ni clause `set search_path` — et ce n'est pas un oubli.** Les deux
-- rendent le contexte d'exécution *atomique* et font échouer le `commit` par
-- `invalid transaction termination` (vérifié sur PostgreSQL 16 : une procédure nue committe,
-- les trois autres formes lèvent). La sécurité est ailleurs : le cron tourne sous le rôle qui
-- l'a planifié — `postgres`, propriétaire des fonctions appelées — l'`execute` est révoqué
-- juste en dessous, et **le corps ne contient aucun nom non qualifié**, donc aucun search_path
-- à détourner. Ajouter l'un ou l'autre « par cohérence » casserait l'envoi des rappels toutes
-- les nuits, en silence : c'est le journal du §1 qui le dirait.
create or replace procedure public.envoyer_rappels()
language plpgsql
as $procedure$
declare
  -- Vingt passes au plus : la borne existe pour qu'un défaut de la fonction ne puisse pas
  -- faire tourner le cron indéfiniment. Une nuit normale en fait une.
  c_passes_max constant integer := 20;
  v_traites integer;
  v_passes integer := 0;
begin
  loop
    v_passes := v_passes + 1;
    v_traites := public.send_pending_reminders();
    -- Ce qui est parti est acquis.
    commit;
    exit when v_traites = 0 or v_passes >= c_passes_max;
  end loop;
end;
$procedure$;

revoke execute on procedure public.envoyer_rappels() from public, anon, authenticated;

comment on procedure public.envoyer_rappels() is
  'Point d''entrée du cron des rappels : enchaîne les passes de send_pending_reminders() en committant entre chacune, pour qu''un abandon ne puisse pas renvoyer ce qui est déjà parti. S''appelle avec call, jamais select.';

-- Le job garde son nom et son heure (quotidien 7h UTC, après la génération hebdomadaire du
-- lundi 6h et mensuelle du 1er 6h) : seule sa commande change. Le retrait est enveloppé parce
-- que `cron.unschedule` lève quand le job n'existe pas — ce qui est le cas d'une base
-- reconstruite depuis les migrations si celle qui l'a créé n'est pas encore passée.
do $$
begin
  perform cron.unschedule('send-pending-reminders');
exception when others then
  -- Avalé, mais pas en silence : si le retrait échoue pour une autre raison qu'un job absent,
  -- la planification juste en dessous le dira en levant à son tour.
  raise warning 'send-pending-reminders n''a pas pu être retiré (%) — il est replanifié juste après.', sqlerrm;
end;
$$;

select cron.schedule(
  'send-pending-reminders',
  '0 7 * * *',
  $$call public.envoyer_rappels()$$
);

-- ── 7. Les reçus : une file qui avance ─────────────────────────────────────────────────
-- Deux correctifs (A9-14), tous deux silencieux jusqu'ici :
--   * l'appel envoyait **tous** les identifiants de cent lignes d'outbox, sans borne, alors
--     qu'une ligne porte un ticket par appareil et que `getReceipts` n'en accepte que mille :
--     au-delà, l'appel échouait en bloc ;
--   * `receipts_checked_at` n'était posé que dans la branche 2xx, donc un échec faisait
--     resélectionner les mêmes lignes chaque jour, indéfiniment, et le lot en tête de file
--     bloquait tous les suivants — alors qu'Expo ne conserve les reçus que vingt-quatre heures
--     et qu'une relance n'apprend plus rien passé ce délai.
create or replace function public.collect_push_receipts()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  c_max_ids constant integer := 1000;
  v_expo_token text;
  v_response extensions.http_response;
  v_headers extensions.http_header[];
  v_map jsonb := '{}'::jsonb;
  v_lignes uuid[] := '{}'::uuid[];
  v_ids text[];
  v_nb integer := 0;
  v_tickets integer;
  v_data jsonb;
  v_erreur text;
  rec record;
begin
  select decrypted_secret into v_expo_token
  from vault.decrypted_secrets where name = 'expo_access_token';

  -- Un quart d'heure de décalage : avant, le reçu n'existe pas encore.
  for rec in
    select id, provider_ticket from public.notification_outbox
    where channel = 'push' and status = 'sent'
      and provider_ticket is not null and receipts_checked_at is null
      and sent_at < now() - interval '15 minutes'
    order by sent_at
    limit 100
  loop
    select count(*)::integer into v_tickets from jsonb_object_keys(rec.provider_ticket) as k;

    -- Borne en **identifiants**, pas en lignes : c'est ce que compte la limite d'Expo.
    exit when v_nb + v_tickets > c_max_ids;

    v_map := v_map || rec.provider_ticket;
    v_lignes := v_lignes || rec.id;
    v_nb := v_nb + v_tickets;
  end loop;

  if v_map = '{}'::jsonb then
    return;
  end if;

  select array_agg(k) into v_ids from jsonb_object_keys(v_map) as k;

  v_headers := array[extensions.http_header('accept', 'application/json')];
  if v_expo_token is not null then
    v_headers := v_headers || extensions.http_header('Authorization', 'Bearer ' || v_expo_token);
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

  begin
    select * into v_response from extensions.http((
      'POST',
      'https://exp.host/--/api/v2/push/getReceipts',
      v_headers,
      'application/json',
      jsonb_build_object('ids', to_jsonb(v_ids))::text
    )::extensions.http_request);

    if not (v_response.status between 200 and 299) then
      v_erreur := 'HTTP ' || v_response.status || ' — ' || left(coalesce(v_response.content, ''), 300);
    end if;
  exception when others then
    v_erreur := left(sqlerrm, 300);
  end;

  if v_erreur is null then
    v_data := (v_response.content::jsonb) -> 'data';

    update public.push_tokens t
    set disabled_at = now(), disabled_reason = 'DeviceNotRegistered (reçu)'
    from (
      select v_map ->> r.key as token
      from jsonb_each(coalesce(v_data, '{}'::jsonb)) as r(key, value)
      where r.value #>> '{details,error}' = 'DeviceNotRegistered'
    ) d
    where t.token = d.token and t.disabled_at is null;

    -- Seulement les lignes dont les tickets viennent d'être demandés : la boucle est bornée,
    -- marquer plus large classerait « vérifiées » des lignes jamais interrogées.
    update public.notification_outbox
    set receipts_checked_at = now()
    where id = any(v_lignes);
  else
    -- Passé quarante-huit heures, la relance n'apprendra plus rien : on marque la ligne
    -- vérifiée pour que la file avance, plutôt que de la retenter chaque nuit à jamais.
    update public.notification_outbox
    set receipts_checked_at = now()
    where id = any(v_lignes)
      and sent_at < now() - interval '48 hours';

    raise warning 'collect_push_receipts : %', v_erreur;
  end if;
end;
$function$;

revoke execute on function public.collect_push_receipts() from public, anon, authenticated;

-- ── 8. La synchronisation des facteurs ─────────────────────────────────────────────────
-- Rien à changer dans `sync_emission_factors()` : elle écrit **déjà** une ligne de journal à
-- chaque passage, statut compris (20260905100000:269), et un slug renommé y ressort en
-- `partial` avec le détail mode par mode. Le constat A7-8 ne portait pas sur l'écriture mais
-- sur la lecture — la table est en RLS sans policy et aucune surface ne l'interrogeait. C'est
-- `analytics.synchronisations_facteurs` (§2) qui la ferme, et la redéfinir pour recopier cent
-- lignes de calcul de facteurs n'aurait ajouté qu'un risque de transcription là où tout le
-- référentiel chiffré des tests pgTAP est en jeu.
