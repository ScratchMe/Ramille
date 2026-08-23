-- TraceVerte V1 — increment 2 : boucle d'engagement mensuelle (brique 4)
-- Réf. docs/architecture/v1-02-boucle-engagement.md

create table public.monthly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_month date not null,
  dominant_trip_id uuid not null references public.assessment_trips(id),
  trip_label text not null,
  status text not null default 'pending' check (status in ('pending', 'answered')),
  response boolean,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, period_month)
);

create index monthly_checkins_user_id_idx on public.monthly_checkins(user_id);
create index monthly_checkins_dominant_trip_id_idx on public.monthly_checkins(dominant_trip_id);

-- Immutabilité après réponse : le signal d'engagement (2 check-ins consécutifs) doit
-- reposer sur une donnée stable, pas réécrivable après coup.
create function public.prevent_answered_checkin_update()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'answered' then
    raise exception 'monthly_checkins: impossible de modifier un check-in déjà répondu (id=%)', old.id;
  end if;
  return new;
end;
$$;

create trigger prevent_answered_checkin_update
  before update on public.monthly_checkins
  for each row execute function public.prevent_answered_checkin_update();

-- RLS : lecture + réponse par le propriétaire uniquement. Pas de policy insert pour
-- authenticated — la création est réservée à generate_monthly_checkins() (security definer).
alter table public.monthly_checkins enable row level security;

create policy "monthly_checkins select own"
  on public.monthly_checkins for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "monthly_checkins answer own"
  on public.monthly_checkins for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert on public.monthly_checkins from authenticated, anon;

-- Génération mensuelle : un check-in par utilisateur ayant un bilan complété, ancré sur le
-- trajet dominant de son bilan complété le plus récent. Pure SQL (pas d'appel réseau) donc
-- pas besoin d'Edge Function ici, contrairement à la sync des facteurs d'émission.
create function public.generate_monthly_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.monthly_checkins (user_id, period_month, dominant_trip_id, trip_label)
  select distinct on (a.user_id)
    a.user_id,
    date_trunc('month', now())::date,
    ar.dominant_trip_id,
    t.label
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  join public.assessment_trips t on t.id = ar.dominant_trip_id
  where a.status = 'completed'
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, period_month) do nothing;
end;
$$;

revoke execute on function public.generate_monthly_checkins() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'generate-monthly-checkins',
  '0 6 1 * *',
  $$select public.generate_monthly_checkins()$$
);
