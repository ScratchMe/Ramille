-- Nouvelle table : une ligne par bilan, un champ par question B1.1→B4.3.
-- Remplace le modèle "liste de trajets" — chaque utilisateur a exactement 3 postes
-- fixes (domicile-travail / loisirs / voyages), jamais une liste ouverte.

create table public.assessment_answers (
  assessment_id uuid primary key references public.assessments(id) on delete cascade,

  -- Section 1 — domicile-travail (B1.1 → B1.7)
  commute_has_regular_trip boolean not null,
  commute_days_per_week smallint check (commute_days_per_week between 1 and 7),
  commute_distance_km numeric check (commute_distance_km > 0),
  commute_distance_bracket text check (commute_distance_bracket in ('lt_5', '5_15', '15_30', '30_50', '50_plus')),
  commute_mode text references public.transport_modes(id),
  commute_is_carpool boolean not null default false,
  commute_carpool_size smallint check (commute_carpool_size between 2 and 6),
  commute_second_mode_used boolean not null default false,
  commute_second_mode text references public.transport_modes(id),

  -- Section 2 — weekend / loisirs (B2.1 → B2.3)
  leisure_frequency text not null check (leisure_frequency in ('rarely', 'weekly', 'multiple_weekly')),
  leisure_mode text references public.transport_modes(id),
  leisure_distance_bracket text check (leisure_distance_bracket in ('lt_5', '5_15', '15_30', '30_plus')),

  -- Section 3 — voyages annuels (B3.1 → B3.4)
  flights_total_per_year smallint not null default 0 check (flights_total_per_year >= 0),
  flights_short_per_year smallint check (flights_short_per_year >= 0),
  train_long_trips_per_year smallint not null default 0 check (train_long_trips_per_year >= 0),
  car_long_trips_per_year smallint not null default 0 check (car_long_trips_per_year >= 0),

  -- Section 4 — contexte structurel (B4.1 → B4.3) — n'entre pas dans le calcul
  zone_type text check (zone_type in ('urbain_dense', 'periurbain', 'rural')),
  tc_access text check (tc_access in ('bon', 'limite', 'inexistant')),
  household_vehicles text check (household_vehicles in ('0', '1', '2_plus')),

  updated_at timestamptz not null default now()
);

alter table public.assessment_answers enable row level security;

create policy "assessment_answers select own"
  on public.assessment_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_answers.assessment_id
        and a.user_id = (select auth.uid())
    )
  );

create policy "assessment_answers insert own"
  on public.assessment_answers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_answers.assessment_id
        and a.user_id = (select auth.uid())
    )
  );

create policy "assessment_answers update own"
  on public.assessment_answers for update
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_answers.assessment_id
        and a.user_id = (select auth.uid())
    )
  );

-- ── assessment_results : restructuré autour des 3 postes fixes ────────────

alter table public.assessment_results
  add column commute_co2_kg_year numeric not null default 0,
  add column leisure_co2_kg_year numeric not null default 0,
  add column travel_co2_kg_year numeric not null default 0,
  add column dominant_poste text check (dominant_poste in ('commute', 'leisure', 'travel')),
  add column dominant_poste_co2_kg_year numeric,
  add column dominant_poste_mode text references public.transport_modes(id),
  add column dominant_poste_label text;

alter table public.assessment_results alter column dominant_poste set not null;
alter table public.assessment_results alter column dominant_poste_co2_kg_year set not null;
alter table public.assessment_results alter column dominant_poste_label set not null;
alter table public.assessment_results alter column commute_co2_kg_year drop default;
alter table public.assessment_results alter column leisure_co2_kg_year drop default;
alter table public.assessment_results alter column travel_co2_kg_year drop default;
