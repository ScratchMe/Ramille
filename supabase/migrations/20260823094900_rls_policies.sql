-- TraceVerte V1 — RLS : isolation stricte par utilisateur, pas de comparaison
-- inter-utilisateurs (cf. non-goal spec §2 — pas de mécanique sociale/comparative).

alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_trips enable row level security;
alter table public.assessment_trip_modes enable row level security;
alter table public.assessment_results enable row level security;

-- Référentiels : lecture publique pour tout utilisateur authentifié, pas d'écriture côté app.
alter table public.transport_modes enable row level security;
alter table public.emission_factors enable row level security;

create policy "transport_modes readable by authenticated users"
  on public.transport_modes for select
  to authenticated
  using (true);

create policy "emission_factors readable by authenticated users"
  on public.emission_factors for select
  to authenticated
  using (true);

-- profiles : chacun ne voit/modifie que sa propre ligne.
create policy "profiles select own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- assessments : appartenance directe via user_id.
create policy "assessments select own"
  on public.assessments for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "assessments insert own"
  on public.assessments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "assessments update own"
  on public.assessments for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- assessment_trips : appartenance via l'assessment parent.
create policy "assessment_trips select own"
  on public.assessment_trips for select
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_trips.assessment_id
        and a.user_id = (select auth.uid())
    )
  );

create policy "assessment_trips insert own"
  on public.assessment_trips for insert
  to authenticated
  with check (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_trips.assessment_id
        and a.user_id = (select auth.uid())
    )
  );

create policy "assessment_trips update own"
  on public.assessment_trips for update
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_trips.assessment_id
        and a.user_id = (select auth.uid())
    )
  );

-- assessment_trip_modes : appartenance via le trip -> assessment parent.
create policy "assessment_trip_modes select own"
  on public.assessment_trip_modes for select
  to authenticated
  using (
    exists (
      select 1 from public.assessment_trips t
      join public.assessments a on a.id = t.assessment_id
      where t.id = assessment_trip_modes.assessment_trip_id
        and a.user_id = (select auth.uid())
    )
  );

create policy "assessment_trip_modes insert own"
  on public.assessment_trip_modes for insert
  to authenticated
  with check (
    exists (
      select 1 from public.assessment_trips t
      join public.assessments a on a.id = t.assessment_id
      where t.id = assessment_trip_modes.assessment_trip_id
        and a.user_id = (select auth.uid())
    )
  );

-- assessment_results : lecture seule côté client, écriture réservée au calcul serveur
-- (Edge Function avec service role — pas de policy insert/update pour authenticated).
create policy "assessment_results select own"
  on public.assessment_results for select
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_results.assessment_id
        and a.user_id = (select auth.uid())
    )
  );
