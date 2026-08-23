-- TraceVerte V1 — increment 1 : socle Onboarding + Bilan
-- Réf. docs/architecture/v1-01-onboarding-bilan.md

-- ── Référentiels ─────────────────────────────────────────────────────────

create table public.transport_modes (
  id text primary key,
  label text not null,
  category text not null check (
    category in ('voiture', 'deux_roues', 'transports_commun', 'train', 'avion', 'velo_marche')
  )
);

create table public.emission_factors (
  id uuid primary key default gen_random_uuid(),
  transport_mode_id text not null references public.transport_modes(id),
  kg_co2_per_km numeric(8, 4) not null,
  source text not null default 'ADEME Base Empreinte (via API Impact CO2)',
  source_ref text,
  valid_from date not null,
  unique (transport_mode_id, valid_from)
);

-- ── Profil utilisateur ───────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  zone_type text check (zone_type in ('rural', 'urbain')),
  tc_access text check (tc_access in ('bon', 'limite', 'aucun')),
  cadence_type text not null default 'season' check (cadence_type in ('season', 'rolling_quarter')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-création du profil à l'inscription (auth.users -> public.profiles)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Bilan (assessment) ───────────────────────────────────────────────────

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.assessment_trips (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  trip_type text not null check (trip_type in ('commute', 'weekend', 'annual')),
  label text,
  distance_km numeric not null check (distance_km >= 0),
  frequency_unit text not null check (frequency_unit in ('per_week', 'per_month', 'per_year')),
  frequency_value numeric not null check (frequency_value >= 0),
  trip_scope text check (trip_scope in ('national', 'international'))
);

create table public.assessment_trip_modes (
  id uuid primary key default gen_random_uuid(),
  assessment_trip_id uuid not null references public.assessment_trips(id) on delete cascade,
  transport_mode_id text not null references public.transport_modes(id),
  share_percent numeric not null default 100 check (share_percent > 0 and share_percent <= 100)
);

create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments(id) on delete cascade,
  total_co2_kg_year numeric not null,
  dominant_trip_id uuid not null references public.assessment_trips(id),
  computed_at timestamptz not null default now()
);

-- ── Index d'accès ────────────────────────────────────────────────────────

create index assessments_user_id_idx on public.assessments(user_id);
create index assessment_trips_assessment_id_idx on public.assessment_trips(assessment_id);
create index assessment_trip_modes_trip_id_idx on public.assessment_trip_modes(assessment_trip_id);
create index emission_factors_mode_valid_from_idx on public.emission_factors(transport_mode_id, valid_from desc);
