-- TraceVerte V1 — increment 12, correctif de l'étape 5 : le lien de l'email de rappel
-- pointait vers un domaine qui n'existe pas.
--
-- `enqueue_checkin_reminders()` composait le corps avec `https://traceverte.vercel.app/plan`,
-- inventé au moment d'écrire la migration. Le domaine réel de production est celui que porte
-- `src/lib/app-url.ts` : `https://traceverte-me-c4a3.vercel.app`. Un rappel dont le lien ne
-- mène nulle part est pire qu'un rappel absent — c'est le seul geste qu'on demande.
--
-- Corrigé, et rendu configurable pour ne pas rejouer le problème : l'URL est lue dans le
-- secret Vault `app_url` s'il existe, sinon elle retombe sur le domaine de production connu.
-- Le jour où un domaine personnalisé arrive, il suffit d'ajouter ce secret — pas de
-- migration, et rien à changer si personne ne le fait.

create or replace function public.enqueue_checkin_reminders()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_app_url text;
begin
  select coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'app_url'),
    'https://traceverte-me-c4a3.vercel.app'
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
      || 'Réponds en un geste dans TraceVerte : ' || v_app_url || '/plan' || E'\n\n'
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
$$;

revoke execute on function public.enqueue_checkin_reminders() from public, anon, authenticated;

-- Les rappels déjà en file portent le mauvais lien : ils n'ont pas encore été envoyés
-- (aucun fournisseur configuré à ce stade), donc on réécrit leur corps plutôt que de les
-- laisser partir cassés au premier envoi.
update public.notification_outbox
set body = replace(body, 'https://traceverte.vercel.app', coalesce(
  (select decrypted_secret from vault.decrypted_secrets where name = 'app_url'),
  'https://traceverte-me-c4a3.vercel.app'
))
where status = 'pending' and body like '%traceverte.vercel.app%';
