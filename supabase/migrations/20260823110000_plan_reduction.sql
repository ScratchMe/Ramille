-- TraceVerte V1 — increment 3 : plan de réduction (brique 3)
-- Réf. docs/architecture/v1-03-plan-reduction.md

-- ── Extension increment 1 ────────────────────────────────────────────────
alter table public.assessment_results
  add column dominant_trip_co2_kg_year numeric;

-- ── Référentiels ─────────────────────────────────────────────────────────

create table public.action_templates (
  id uuid primary key default gen_random_uuid(),
  transport_mode_category text not null check (
    transport_mode_category in ('voiture', 'deux_roues', 'transports_commun', 'train', 'avion', 'velo_marche')
  ),
  action_text text not null
);

-- ── Cycles de plan ───────────────────────────────────────────────────────

create table public.plan_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cadence_type text not null check (cadence_type in ('season', 'rolling_quarter')),
  period_label text not null,
  period_start date not null,
  period_end date not null,
  dominant_trip_id uuid not null references public.assessment_trips(id),
  trip_label text not null,
  baseline_co2_kg_year numeric,
  target_reduction_pct numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, period_start)
);

create table public.plan_actions (
  id uuid primary key default gen_random_uuid(),
  plan_cycle_id uuid not null references public.plan_cycles(id) on delete cascade,
  action_template_id uuid not null references public.action_templates(id),
  created_at timestamptz not null default now()
);

create index plan_cycles_user_id_idx on public.plan_cycles(user_id);
create index plan_cycles_dominant_trip_id_idx on public.plan_cycles(dominant_trip_id);
create index plan_actions_plan_cycle_id_idx on public.plan_actions(plan_cycle_id);
create index plan_actions_action_template_id_idx on public.plan_actions(action_template_id);

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.action_templates enable row level security;
alter table public.plan_cycles enable row level security;
alter table public.plan_actions enable row level security;

create policy "action_templates readable by anyone"
  on public.action_templates for select
  to anon, authenticated
  using (true);

create policy "plan_cycles select own"
  on public.plan_cycles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "plan_actions select own"
  on public.plan_actions for select
  to authenticated
  using (
    exists (
      select 1 from public.plan_cycles c
      where c.id = plan_actions.plan_cycle_id
        and c.user_id = (select auth.uid())
    )
  );

-- pas de policy insert pour authenticated : création réservée aux fonctions
-- serveur (security definer), même pattern que monthly_checkins.

-- ── Bornes de période ────────────────────────────────────────────────────

create function public.season_bounds(d date)
returns table(period_start date, period_end date, label text)
language plpgsql
immutable
set search_path = public
as $$
declare
  m int := extract(month from d);
  y int := extract(year from d);
  s_start date;
  s_label text;
begin
  if m = 12 then
    s_start := make_date(y, 12, 1);
    s_label := 'Hiver ' || y || '-' || (y + 1);
  elsif m in (1, 2) then
    s_start := make_date(y - 1, 12, 1);
    s_label := 'Hiver ' || (y - 1) || '-' || y;
  elsif m in (3, 4, 5) then
    s_start := make_date(y, 3, 1);
    s_label := 'Printemps ' || y;
  elsif m in (6, 7, 8) then
    s_start := make_date(y, 6, 1);
    s_label := 'Été ' || y;
  else
    s_start := make_date(y, 9, 1);
    s_label := 'Automne ' || y;
  end if;

  period_start := s_start;
  period_end := (s_start + interval '3 months' - interval '1 day')::date;
  label := s_label;
  return next;
end;
$$;

create function public.rolling_quarter_bounds(anchor date, d date)
returns table(period_start date, period_end date, label text)
language plpgsql
immutable
set search_path = public
as $$
declare
  months_elapsed int;
  n int;
  s_start date;
begin
  months_elapsed := (extract(year from d) - extract(year from anchor)) * 12
                     + (extract(month from d) - extract(month from anchor));
  n := floor(months_elapsed / 3.0);
  s_start := (anchor + (n * 3 || ' months')::interval)::date;

  if d < s_start then
    n := n - 1;
    s_start := (anchor + (n * 3 || ' months')::interval)::date;
  end if;

  period_start := s_start;
  period_end := (s_start + interval '3 months' - interval '1 day')::date;
  label := 'Trimestre ' || (n + 1) || ' (depuis le ' || to_char(anchor, 'DD/MM/YYYY') || ')';
  return next;
end;
$$;

-- ── Génération ───────────────────────────────────────────────────────────

create function public.generate_plan_cycles()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_reduction_pct constant numeric := 20; -- cf. doc §5
  rec record;
  bounds record;
  new_cycle_id uuid;
  primary_mode_category text;
begin
  for rec in
    select distinct on (a.user_id)
      a.user_id,
      p.cadence_type,
      ar.dominant_trip_id,
      t.label as trip_label,
      ar.dominant_trip_co2_kg_year,
      a.submitted_at::date as bilan_date
    from public.assessments a
    join public.profiles p on p.id = a.user_id
    join public.assessment_results ar on ar.assessment_id = a.id
    join public.assessment_trips t on t.id = ar.dominant_trip_id
    where a.status = 'completed'
    order by a.user_id, a.submitted_at desc
  loop
    if rec.cadence_type = 'rolling_quarter' then
      select * into bounds from public.rolling_quarter_bounds(rec.bilan_date, current_date);
    else
      select * into bounds from public.season_bounds(current_date);
    end if;

    insert into public.plan_cycles (
      user_id, cadence_type, period_label, period_start, period_end,
      dominant_trip_id, trip_label, baseline_co2_kg_year, target_reduction_pct
    )
    values (
      rec.user_id, rec.cadence_type, bounds.label, bounds.period_start, bounds.period_end,
      rec.dominant_trip_id, rec.trip_label, rec.dominant_trip_co2_kg_year, target_reduction_pct
    )
    on conflict (user_id, period_start) do nothing
    returning id into new_cycle_id;

    if new_cycle_id is not null then
      select tm.category into primary_mode_category
      from public.assessment_trip_modes atm
      join public.transport_modes tm on tm.id = atm.transport_mode_id
      where atm.assessment_trip_id = rec.dominant_trip_id
      order by atm.share_percent desc
      limit 1;

      insert into public.plan_actions (plan_cycle_id, action_template_id)
      select new_cycle_id, at.id
      from public.action_templates at
      where at.transport_mode_category = primary_mode_category
      limit 2;
    end if;

    new_cycle_id := null;
  end loop;
end;
$$;

revoke execute on function public.generate_plan_cycles() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'generate-plan-cycles',
  '0 5 * * *',
  $$select public.generate_plan_cycles()$$
);

-- ── Seed action_templates ────────────────────────────────────────────────
-- Copy volontairement minimale pour cette V1 (cf. doc §3). velo_marche exclu :
-- facteur d'émission nul, ne peut structurellement jamais être trajet dominant.

insert into public.action_templates (transport_mode_category, action_text) values
  ('voiture', 'Remplacer un trajet sur deux par un mode plus léger quand la distance le permet (vélo, marche, transports en commun).'),
  ('voiture', 'Tester le covoiturage sur ce trajet au moins une fois par semaine.'),
  ('deux_roues', 'Explorer une alternative en transports en commun sur ce trajet pour comparer le temps réel de porte-à-porte.'),
  ('deux_roues', 'Regrouper les trajets courts pour réduire le nombre de sorties.'),
  ('transports_commun', 'Identifier une portion du trajet faisable à vélo ou à pied.'),
  ('train', 'Regrouper plusieurs déplacements en un seul trajet plus long plutôt que plusieurs allers-retours.'),
  ('avion', 'Regrouper les déplacements pour réduire le nombre de vols dans l''année.'),
  ('avion', 'Pour les trajets nationaux, comparer le temps de porte-à-porte réel avec le train.');
