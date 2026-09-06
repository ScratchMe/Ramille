-- Étaler l'envoi des rappels, et ne plus relancer sur un check-in périmé.
-- Chantier A du plan v1-10 (docs/architecture/v1-10-connexion-et-rappels.md §2).
--
-- CE QUI EST VRAI DU COMPORTEMENT ACTUEL, et qui corrige une analyse trop rapide :
-- `send_pending_reminders()` porte déjà `limit 100`, donc le plafond journalier de Resend
-- (100 emails/jour sur l'offre gratuite) n'est jamais dépassé. Le pic du lundi ne casse rien,
-- il **remplit une file** qui s'écoule à 100 par jour. Ce n'est pas un mur, c'est une latence.
--
-- Restent deux vrais défauts, que cette migration traite :
--
--   1. **Un rappel peut partir pour un check-in déjà périmé.** La file est servie en FIFO sur
--      `created_at` sans jamais relire l'état du check-in ; or `generate_commute_checkins()`
--      passe les check-ins de la semaine précédente en `expired`. Un rappel retenu quelques
--      jours par la file pose donc une question à laquelle on ne peut plus répondre — le pire
--      email possible pour un produit qui promet de ne jamais insister pour rien.
--
--   2. **La file ne se vide jamais vraiment si l'arrivée dépasse l'écoulement.** À 100/jour et
--      un pic hebdomadaire, la latence croît en silence : le dernier servi reçoit son rappel
--      de la semaine plusieurs jours après, sans que rien ne le signale.
--
-- Le correctif nivelle à la source plutôt que de compter sur le FIFO : chaque utilisateur a
-- un décalage stable de 0 à 4 jours, dérivé de son `user_id`. La cadence produit ne bouge pas
-- — le check-in reste généré le lundi et visible immédiatement dans l'app ; seul l'email
-- s'étale du lundi au vendredi. Cinq jours ouvrés donnent 500 envois par semaine sans jamais
-- toucher le plafond, et le rappel du vendredi laisse encore le week-end pour répondre.
--
-- Le décalage vient de `md5(user_id)` et non de `hashtext()` : `hashtext` est une fonction
-- interne dont la stabilité n'est pas garantie d'une version majeure de PostgreSQL à l'autre,
-- et un décalage qui changerait au fil des versions ferait sauter un rappel ou en doublerait
-- un. `bit(28)` plutôt que `bit(32)` parce que la conversion en `int` d'un bit(32) peut être
-- négative — 28 bits restent toujours positifs, donc `% 5` aussi.

alter table public.notification_outbox
  add column if not exists send_after timestamptz not null default now();

comment on column public.notification_outbox.send_after is
  'Date à partir de laquelle ce rappel peut partir. Décalage stable de 0 à 4 jours dérivé du user_id, pour niveler le pic hebdomadaire sous le plafond journalier de l''expéditeur.';

-- Le statut gagne `cancelled` : un rappel dont le check-in n'est plus en attente n'est ni
-- envoyé, ni en échec. Le distinguer de `failed` est ce qui permet de lire le journal — un
-- `failed` doit rester le signal d'un problème d'envoi, pas d'une question devenue caduque.
alter table public.notification_outbox
  drop constraint if exists notification_outbox_status_check;

alter table public.notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('pending', 'sent', 'failed', 'cancelled'));

-- Le cron balaie la file chaque jour : l'index évite de relire les lignes déjà traitées.
create index if not exists notification_outbox_a_envoyer_idx
  on public.notification_outbox (send_after)
  where status = 'pending';

create or replace function public.enqueue_checkin_reminders()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_app_url text;
begin
  select coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'app_url'),
    'https://www.ramille.fr'
  ) into v_app_url;

  insert into public.notification_outbox (user_id, checkin_id, recipient_email, subject, body, send_after)
  select
    c.user_id,
    c.id,
    u.email,
    case c.loop_type
      when 'commute' then 'Ton point de la semaine'
      else 'Ton point du mois'
    end,
    'Bonjour,' || E'\n\n'
      || 'Une seule question, comme d''habitude : as-tu changé de mode de transport au moins une fois '
      || case c.loop_type when 'commute' then 'cette semaine' else 'ce mois-ci' end
      || ' pour ' || c.trip_label || ' ?' || E'\n\n'
      || 'Réponds-moi en un geste : ' || v_app_url || '/plan' || E'\n\n'
      || 'Si tu n''as rien changé, ce n''est pas grave — on se repose la question au prochain point.' || E'\n\n'
      || '— Ramille' || E'\n\n'
      || 'Pour ne plus recevoir ces rappels, désactive-les depuis ton suivi dans l''app.',
    now() + make_interval(days =>
      (('x' || substr(md5(c.user_id::text), 1, 7))::bit(28)::int % 5))
  from public.engagement_checkins c
  join auth.users u on u.id = c.user_id
  join public.profiles p on p.id = c.user_id
  where c.status = 'pending'
    and u.is_anonymous = false
    and u.email is not null
    and u.email_confirmed_at is not null
    and p.email_reminders_enabled
  on conflict (checkin_id) do nothing;
end;
$function$;

create or replace function public.send_pending_reminders()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_api_key text;
  v_from text;
  v_response extensions.http_response;
  rec record;
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets where name = 'resend_api_key';

  select decrypted_secret into v_from
  from vault.decrypted_secrets where name = 'reminder_from_address';

  -- Une question à laquelle on ne peut plus répondre ne se pose pas. **Avant** le test des
  -- secrets, et non après : qu'un rappel soit caduc est une vérité sur les données, pas une
  -- étape d'expédition. Le placer après laisserait la file se remplir de rappels périmés
  -- pendant toute la période où l'envoi est inactif — exactement l'état du projet tant que
  -- la clé n'est pas déposée.
  update public.notification_outbox o
  set status = 'cancelled'
  from public.engagement_checkins c
  where c.id = o.checkin_id
    and o.status = 'pending'
    and c.status <> 'pending';

  if v_api_key is null or v_from is null then
    return;
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

  for rec in
    select * from public.notification_outbox
    where status = 'pending' and attempts < 3 and send_after <= now()
    order by send_after, created_at
    limit 100
  loop
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
        update public.notification_outbox
        set status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = null
        where id = rec.id;
      else
        update public.notification_outbox
        set status = case when attempts + 1 >= 3 then 'failed' else 'pending' end,
            attempts = attempts + 1,
            last_error = 'HTTP ' || v_response.status || ' — ' || left(coalesce(v_response.content, ''), 300)
        where id = rec.id;
      end if;

    exception when others then
      update public.notification_outbox
      set status = case when attempts + 1 >= 3 then 'failed' else 'pending' end,
          attempts = attempts + 1,
          last_error = left(sqlerrm, 300)
      where id = rec.id;
    end;
  end loop;
end;
$function$;
