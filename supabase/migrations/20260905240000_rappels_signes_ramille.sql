-- Les rappels par email sont désormais un mot de Ramille, pas un message système : elle
-- tutoie, parle à la première personne et signe. C'est le levier le plus fort et le moins
-- coûteux de sa présence (docs/architecture/v1-09-renommage-ramille.md, « voix de Ramille »
-- dans CLAUDE.md). Trois règles tenues ici comme dans src/constants/mascotte.ts : première
-- personne, jamais un nombre, jamais d'injonction — la phrase de désinscription reste au
-- registre du produit, pas au sien.
--
-- Le lien vient toujours du secret Vault `app_url` (repli : domaine canonique). L'expéditeur
-- affiché (« Ramille <…> ») est `reminder_from_address`, dans le Vault, pas ici.

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

  insert into public.notification_outbox (user_id, checkin_id, recipient_email, subject, body)
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
      || 'Pour ne plus recevoir ces rappels, désactive-les depuis ton suivi dans l''app.'
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
