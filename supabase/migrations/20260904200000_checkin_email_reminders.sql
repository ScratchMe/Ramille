-- TraceVerte V1 — increment 12, étape 5 : canal de rappel par email.
-- Réf. docs/architecture/v1-07-audit-facteurs-et-suivi.md §3.1.
--
-- ── Le constat ─────────────────────────────────────────────────────────────────────────
-- `pg_cron` génère fidèlement un check-in chaque lundi et chaque 1er du mois… que personne
-- ne verra tant que l'utilisateur n'ouvre pas l'app de lui-même. `v1-02` §5 assumait ce
-- choix (« visible in-app à la prochaine ouverture, point »), défendable pour poser le
-- socle. Mais avec un horizon 2050 et un objectif d'accompagnement dans la durée, une
-- boucle d'engagement sans mécanisme de rappel est une boucle théorique.
--
-- Le non-goal de la spec §7 vise la **relance insistante et répétée après une réponse
-- négative** — pas l'existence d'un rappel périodique. La garantie structurelle est ici la
-- contrainte `unique(checkin_id)` sur la boîte d'envoi : **un check-in ne peut donner lieu
-- qu'à un seul email, jamais deux**, quoi qu'il arrive et quel que soit le nombre de
-- passages du cron.
--
-- ── Ce que cette migration ne fait pas ─────────────────────────────────────────────────
-- Elle ne peut pas envoyer d'email sans fournisseur : `send_pending_reminders()` lit sa clé
-- API dans Vault et **ne fait rien tant qu'elle est absente** (les messages restent en
-- attente, rien n'est perdu ni marqué en échec). Créer le compte fournisseur, vérifier un
-- domaine d'envoi et déposer la clé sont des actions de compte, pas des migrations. Détail
-- de la mise en service dans v1-07 §3.1.

-- ── 1. Préférence utilisateur ──────────────────────────────────────────────────────────
-- Opt-out plutôt qu'opt-in : le rappel n'est pas une promotion, c'est le mécanisme même de
-- la brique 4, et quelqu'un qui rattache son compte demande précisément à ce que son suivi
-- lui survive. Il reste désactivable en un geste depuis l'écran de suivi.

alter table public.profiles
  add column email_reminders_enabled boolean not null default true;

-- ── 2. Boîte d'envoi ───────────────────────────────────────────────────────────────────
-- Une table plutôt qu'un envoi direct depuis la génération : sépare « qui doit être
-- prévenu » (décision produit, testable) de « l'email est parti » (appel réseau, faillible).
-- Un fournisseur indisponible ne fait alors perdre aucun rappel.

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- LA garantie anti-relance : un check-in, un email, jamais deux.
  checkin_id uuid not null unique references public.engagement_checkins(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts smallint not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index notification_outbox_pending_idx
  on public.notification_outbox(created_at)
  where status = 'pending';

-- Donnée d'exploitation, pas de donnée produit : RLS active sans policy, rien n'est lisible
-- côté client (même traitement que `emission_factor_sync_runs`).
alter table public.notification_outbox enable row level security;
revoke select, insert, update, delete on public.notification_outbox from anon, authenticated;

-- ── 3. Qui doit être prévenu ───────────────────────────────────────────────────────────
-- Quatre conditions, toutes nécessaires :
--   * le compte est rattaché (`is_anonymous = false`) — une session anonyme n'a pas d'email ;
--   * l'email est **confirmé** — on n'écrit jamais à une adresse simplement déclarée ;
--   * la personne n'a pas désactivé les rappels ;
--   * le check-in est encore en attente (répondu ou périmé entre-temps : plus rien à dire).

create or replace function public.enqueue_checkin_reminders()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notification_outbox (user_id, checkin_id, recipient_email, subject, body)
  select
    c.user_id,
    c.id,
    u.email,
    case c.loop_type
      when 'commute' then 'Ton point de la semaine'
      else 'Ton point du mois'
    end,
    -- Copy volontairement brève et sans injonction : une question, un lien, une porte de
    -- sortie. Le ton reste celui du check-in in-app (spec §7 : renforcement bref côté
    -- positif, relance factuelle et non culpabilisante côté négatif).
    'Bonjour,' || E'\n\n'
      || 'Une seule question, comme d''habitude : as-tu changé de mode de transport au moins une fois '
      || case c.loop_type when 'commute' then 'cette semaine' else 'ce mois-ci' end
      || ' pour ' || c.trip_label || ' ?' || E'\n\n'
      || 'Réponds en un geste dans TraceVerte : https://traceverte.vercel.app/plan' || E'\n\n'
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

-- ── 4. Les deux générations alimentent la boîte d'envoi ────────────────────────────────
-- Corps inchangés par ailleurs (cf. migration 20260904180000) : seul l'appel final est
-- ajouté, pour que le rappel suive la génération dans la même transaction.

create or replace function public.generate_commute_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := date_trunc('week', now())::date;
  v_period_label text := 'Semaine du ' || to_char(v_period_start, 'DD/MM');
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'commute' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
  select distinct on (a.user_id)
    a.user_id, 'commute', v_period_start, v_period_label, ar.commute_poste_label
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed' and ar.commute_poste_label is not null
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$$;

revoke execute on function public.generate_commute_checkins() from public, anon, authenticated;

create or replace function public.generate_extras_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', now())::date;
  v_month_names constant text[] := array['janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre'];
  v_period_label text := v_month_names[extract(month from v_period_start)::int]
    || ' ' || extract(year from v_period_start)::text;
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'extras' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
  select distinct on (a.user_id)
    a.user_id, 'extras', v_period_start, v_period_label, ar.extras_poste_label
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed' and ar.extras_poste_label is not null
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$$;

revoke execute on function public.generate_extras_checkins() from public, anon, authenticated;

-- ── 5. L'envoi ─────────────────────────────────────────────────────────────────────────
-- Même modèle que la synchronisation ADEME : SQL pur via l'extension `http`, pas d'Edge
-- Function. La seule différence est qu'il y a ici un secret — la clé API du fournisseur —
-- donc Vault plutôt qu'un appel anonyme.
--
-- Sans clé configurée, la fonction **ne fait rien** et laisse les messages en attente : ni
-- échec, ni perte, ni tentative répétée qui gonflerait `attempts`. C'est l'état du projet
-- tant que le fournisseur n'est pas choisi (cf. en-tête).
--
-- Le corps de requête suit l'API Resend (`POST /emails`), choix provisoire isolé dans cette
-- seule fonction : en changer ne touche à rien d'autre du pipeline.

create or replace function public.send_pending_reminders()
returns void
language plpgsql
security definer set search_path = public
as $$
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

  -- Pas de fournisseur configuré : on sort sans toucher à la file.
  if v_api_key is null or v_from is null then
    return;
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

  for rec in
    select * from public.notification_outbox
    where status = 'pending' and attempts < 3
    order by created_at
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
        -- Trois tentatives puis abandon : un rappel n'a plus de sens une fois sa période
        -- passée, et insister sur une adresse qui refuse ne sert personne.
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
$$;

revoke execute on function public.send_pending_reminders() from public, anon, authenticated;

-- Quotidien à 7h UTC : après la génération hebdomadaire (lundi 6h) et mensuelle (1er, 6h),
-- ce qui couvre les deux boucles avec un seul job et rattrape les échecs du jour précédent.
select cron.schedule(
  'send-pending-reminders',
  '0 7 * * *',
  $$select public.send_pending_reminders()$$
);
