-- Renommage TraceVerte → Ramille : le corps des rappels par email nommait encore l'ancien
-- produit (« Réponds en un geste dans TraceVerte »). C'était la seule fonction SQL à porter
-- le nom (vérifié : `select proname from pg_proc where prosrc ilike '%traceverte%'` n'en
-- rend qu'une). Contexte et décision : docs/architecture/v1-09-renommage-ramille.md.
--
-- Le lien, lui, vient du secret Vault `app_url` (présent en production) — cette migration ne
-- change que le repli utilisé en son absence, vers le domaine de production canonique. La
-- bascule effective du lien se fait donc en mettant à jour `app_url` dans le Vault quand
-- www.ramille.fr répond, pas ici : un rappel qui pointe vers un domaine pas encore servi
-- casserait la seule boucle de réengagement du produit.
--
-- Aucune ligne `pending` dans notification_outbox au moment de la migration (0 sur 0) :
-- rien à réécrire, contrairement à 20260904220000.

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
      || 'Réponds en un geste dans Ramille : ' || v_app_url || '/plan' || E'\n\n'
      || 'Si tu n''as rien changé, ce n''est pas grave — on se repose la question au prochain point.' || E'\n\n'
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
