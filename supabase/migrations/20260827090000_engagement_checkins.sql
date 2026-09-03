-- TraceVerte V1 — increment 11 : boucle d'engagement, brique 4 revue en 2 cadences
-- Réf. docs/architecture/v1-02-boucle-engagement.md (à mettre à jour), décision produit du
-- 27/08/2026 : un check-in hebdomadaire ancré sur le trajet domicile-travail (rythme naturel
-- du quotidien) et un check-in mensuel ancré sur le poste "extras" — loisirs ou voyages,
-- quel que soit celui qui pèse le plus pour l'utilisateur (même départage que la décision
-- dominante du bilan) — plutôt qu'un unique check-in mensuel toutes cadences confondues.
-- Les deux boucles sont proposées à tout utilisateur concerné (a un trajet domicile-travail
-- régulier -> boucle hebdo ; a toujours un poste extras, même résiduel -> boucle mensuelle),
-- l'UI recommandant de se concentrer sur le poste dominant sans fermer l'autre boucle.
--
-- Remplace entièrement `monthly_checkins`/`generate_monthly_checkins()` : table encore sans
-- aucune UI construite dessus (increment jamais livré), donc pas de migration de données —
-- seulement 2 lignes de test générées par le cron, sans conséquence.

-- ── assessment_results : un label par poste, pas seulement pour le poste dominant ──────
-- compute_assessment_results calcule déjà tous les postes ; ne persistait jusqu'ici que le
-- libellé du poste dominant. Les deux boucles ont besoin du libellé de LEUR poste (commute /
-- extras) indépendamment de la décision dominante globale.

alter table public.assessment_results
  add column commute_poste_label text,
  add column extras_poste_co2_kg_year numeric,
  add column extras_poste_label text;

create or replace function public.compute_assessment_results(p_assessment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  a public.assessment_answers%rowtype;

  weeks_per_year_commute constant numeric := 45;
  weeks_per_year_standard constant numeric := 52;
  leisure_freq_rarely constant numeric := 0.25;
  leisure_freq_weekly constant numeric := 1;
  leisure_freq_multiple constant numeric := 3;
  leisure_default_distance constant numeric := 15;
  leisure_default_mode constant text := 'voiture';
  dist_flight_short constant numeric := 1500;
  dist_flight_long constant numeric := 9000;
  dist_train_long constant numeric := 800;
  dist_car_long constant numeric := 700;
  tie_break_margin constant numeric := 0.05;

  v_commute_distance numeric;
  v_commute_km_year numeric := 0;
  v_commute_co2 numeric := 0;
  v_commute_label text;

  v_leisure_distance numeric;
  v_leisure_mode text;
  v_leisure_freq numeric;
  v_leisure_co2 numeric := 0;

  v_flights_short integer;
  v_flights_long integer;
  v_travel_co2 numeric := 0;
  v_travel_avion_court numeric := 0;
  v_travel_avion_long numeric := 0;
  v_travel_train numeric := 0;
  v_travel_voiture numeric := 0;
  v_travel_mode text;

  v_extras_co2 numeric;
  v_extras_mode text;
  v_extras_label text;

  v_total numeric;
  v_dominant text;
  v_dominant_co2 numeric;
  v_dominant_mode text;
  v_dominant_label text;
  v_mode_label text;
begin
  select user_id into v_owner_id from public.assessments where id = p_assessment_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'compute_assessment_results: bilan introuvable ou accès refusé';
  end if;

  select * into a from public.assessment_answers where assessment_id = p_assessment_id;
  if not found then
    raise exception 'compute_assessment_results: aucune réponse enregistrée pour ce bilan';
  end if;

  if a.commute_has_regular_trip then
    v_commute_distance := coalesce(
      a.commute_distance_km,
      case a.commute_distance_bracket
        when 'lt_5' then 2.5
        when '5_15' then 10
        when '15_30' then 22.5
        when '30_50' then 40
        when '50_plus' then 60
      end
    );
    v_commute_km_year := v_commute_distance * 2 * a.commute_days_per_week * weeks_per_year_commute;

    if a.commute_second_mode_used and a.commute_second_mode is not null then
      v_commute_co2 :=
        (v_commute_km_year / 2) * (select kg_co2_per_km from public.emission_factors where transport_mode_id = a.commute_mode order by valid_from desc limit 1)
        + (v_commute_km_year / 2) * (select kg_co2_per_km from public.emission_factors where transport_mode_id = a.commute_second_mode order by valid_from desc limit 1);
    else
      v_commute_co2 := v_commute_km_year * (select kg_co2_per_km from public.emission_factors where transport_mode_id = a.commute_mode order by valid_from desc limit 1);
    end if;

    if a.commute_is_carpool and a.commute_carpool_size is not null then
      v_commute_co2 := v_commute_co2 / a.commute_carpool_size;
    end if;

    select label into v_mode_label from public.transport_modes where id = a.commute_mode;
    v_commute_label := 'Trajet domicile-travail (' || coalesce(v_mode_label, '') || ')';
  end if;

  v_leisure_freq := case a.leisure_frequency
    when 'rarely' then leisure_freq_rarely
    when 'weekly' then leisure_freq_weekly
    when 'multiple_weekly' then leisure_freq_multiple
  end;

  if a.leisure_frequency = 'rarely' then
    v_leisure_distance := leisure_default_distance;
    v_leisure_mode := leisure_default_mode;
  else
    v_leisure_distance := case a.leisure_distance_bracket
      when 'lt_5' then 2.5
      when '5_15' then 10
      when '15_30' then 22.5
      when '30_plus' then 40
    end;
    v_leisure_mode := a.leisure_mode;
  end if;

  v_leisure_co2 := v_leisure_distance * 2 * v_leisure_freq * weeks_per_year_standard
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = v_leisure_mode order by valid_from desc limit 1);

  v_flights_short := coalesce(a.flights_short_per_year, 0);
  v_flights_long := greatest(a.flights_total_per_year - v_flights_short, 0);

  v_travel_avion_court := v_flights_short * dist_flight_short
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'avion_court_moyen_courrier' order by valid_from desc limit 1);
  v_travel_avion_long := v_flights_long * dist_flight_long
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'avion_long_courrier' order by valid_from desc limit 1);
  v_travel_train := a.train_long_trips_per_year * dist_train_long
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'train' order by valid_from desc limit 1);
  v_travel_voiture := a.car_long_trips_per_year * dist_car_long
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'voiture' order by valid_from desc limit 1);

  v_travel_co2 := v_travel_avion_court + v_travel_avion_long + v_travel_train + v_travel_voiture;
  v_travel_mode := (
    select mode from (values
      ('avion_court_moyen_courrier', v_travel_avion_court),
      ('avion_long_courrier', v_travel_avion_long),
      ('train', v_travel_train),
      ('voiture', v_travel_voiture)
    ) as t(mode, amount)
    order by amount desc limit 1
  );

  -- ── Poste "extras" (loisirs ou voyages) : même départage que la décision dominante,
  -- mais uniquement entre ces deux postes — sert la boucle mensuelle indépendamment de
  -- ce qui est dominant au global (cf. commentaire d'en-tête).
  if v_leisure_co2 >= v_travel_co2 * (1 - tie_break_margin) then
    v_extras_co2 := v_leisure_co2;
    v_extras_mode := v_leisure_mode;
  else
    v_extras_co2 := v_travel_co2;
    v_extras_mode := v_travel_mode;
  end if;
  select label into v_mode_label from public.transport_modes where id = v_extras_mode;
  v_extras_label := case when v_extras_co2 = v_leisure_co2
    then 'Trajets loisirs (' || coalesce(v_mode_label, '') || ')'
    else 'Voyages (' || coalesce(v_mode_label, '') || ')'
  end;

  -- ── Décision dominante ───────────────────────────────────────────────────
  -- Départage : écart < 5 % du maximum => quasi-égalité => priorité au poste le plus
  -- régulier (domicile-travail > loisirs > voyages), cf. spec.
  v_total := v_commute_co2 + v_leisure_co2 + v_travel_co2;

  if v_total = 0 then
    v_dominant := 'commute';
  elsif v_commute_co2 >= greatest(v_leisure_co2, v_travel_co2) * (1 - tie_break_margin) then
    v_dominant := 'commute';
  elsif v_leisure_co2 >= v_travel_co2 * (1 - tie_break_margin) then
    v_dominant := 'leisure';
  else
    v_dominant := 'travel';
  end if;

  if v_dominant = 'commute' then
    v_dominant_co2 := v_commute_co2;
    v_dominant_mode := a.commute_mode;
  elsif v_dominant = 'leisure' then
    v_dominant_co2 := v_leisure_co2;
    v_dominant_mode := v_leisure_mode;
  else
    v_dominant_co2 := v_travel_co2;
    v_dominant_mode := v_travel_mode;
  end if;

  select label into v_mode_label from public.transport_modes where id = v_dominant_mode;
  v_dominant_label := case v_dominant
    when 'commute' then 'Trajet domicile-travail (' || coalesce(v_mode_label, '') || ')'
    when 'leisure' then 'Trajets loisirs (' || coalesce(v_mode_label, '') || ')'
    else 'Voyages (' || coalesce(v_mode_label, '') || ')'
  end;

  insert into public.assessment_results (
    assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
    dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label,
    commute_poste_label, extras_poste_co2_kg_year, extras_poste_label, computed_at
  )
  values (
    p_assessment_id, v_total, v_commute_co2, v_leisure_co2, v_travel_co2,
    v_dominant, v_dominant_co2, v_dominant_mode, v_dominant_label,
    v_commute_label, v_extras_co2, v_extras_label, now()
  )
  on conflict (assessment_id) do update set
    total_co2_kg_year = excluded.total_co2_kg_year,
    commute_co2_kg_year = excluded.commute_co2_kg_year,
    leisure_co2_kg_year = excluded.leisure_co2_kg_year,
    travel_co2_kg_year = excluded.travel_co2_kg_year,
    dominant_poste = excluded.dominant_poste,
    dominant_poste_co2_kg_year = excluded.dominant_poste_co2_kg_year,
    dominant_poste_mode = excluded.dominant_poste_mode,
    dominant_poste_label = excluded.dominant_poste_label,
    commute_poste_label = excluded.commute_poste_label,
    extras_poste_co2_kg_year = excluded.extras_poste_co2_kg_year,
    extras_poste_label = excluded.extras_poste_label,
    computed_at = excluded.computed_at;

  perform public.generate_plan_cycle_for_user(v_owner_id);
end;
$$;

grant execute on function public.compute_assessment_results(uuid) to authenticated;
revoke execute on function public.compute_assessment_results(uuid) from anon, public;

-- ── Suppression de l'ancienne table/fonction/cron mono-cadence ─────────────────────────

select cron.unschedule('generate-monthly-checkins');
drop function public.generate_monthly_checkins();
drop table public.monthly_checkins;

-- ── Nouvelle table, générique aux deux cadences ─────────────────────────────────────────

create table public.engagement_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  loop_type text not null check (loop_type in ('commute', 'extras')),
  period_start date not null,
  period_label text not null,
  trip_label text not null,
  status text not null default 'pending' check (status in ('pending', 'answered')),
  response boolean,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, loop_type, period_start)
);

create index engagement_checkins_user_id_idx on public.engagement_checkins(user_id);

-- Immutabilité après réponse (fonction déjà générique, cf. migration d'origine) : le signal
-- d'engagement doit reposer sur une donnée stable, pas réécrivable après coup.
create trigger prevent_answered_checkin_update
  before update on public.engagement_checkins
  for each row execute function public.prevent_answered_checkin_update();

-- RLS : lecture + réponse par le propriétaire uniquement. Pas de policy insert pour
-- authenticated — la création est réservée aux fonctions de génération (security definer).
alter table public.engagement_checkins enable row level security;

create policy "engagement_checkins select own"
  on public.engagement_checkins for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "engagement_checkins answer own"
  on public.engagement_checkins for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert on public.engagement_checkins from authenticated, anon;

-- ── Génération : boucle hebdomadaire (domicile-travail) ─────────────────────────────────
-- Un check-in par utilisateur ayant un trajet domicile-travail régulier au dernier bilan
-- complété, quel que soit son poste dominant global (cf. commentaire d'en-tête) — semaine
-- ISO (lundi), cohérent avec date_trunc('week', ...) en Postgres.

create function public.generate_commute_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := date_trunc('week', now())::date;
  v_period_label text := 'Semaine du ' || to_char(v_period_start, 'DD/MM');
begin
  insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
  select distinct on (a.user_id)
    a.user_id, 'commute', v_period_start, v_period_label, ar.commute_poste_label
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed' and ar.commute_poste_label is not null
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, loop_type, period_start) do nothing;
end;
$$;

revoke execute on function public.generate_commute_checkins() from public, anon, authenticated;

-- ── Génération : boucle mensuelle (extras — loisirs ou voyages) ─────────────────────────

create function public.generate_extras_checkins()
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
  insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
  select distinct on (a.user_id)
    a.user_id, 'extras', v_period_start, v_period_label, ar.extras_poste_label
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed' and ar.extras_poste_label is not null
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, loop_type, period_start) do nothing;
end;
$$;

revoke execute on function public.generate_extras_checkins() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'generate-commute-checkins',
  '0 6 * * 1',
  $$select public.generate_commute_checkins()$$
);

select cron.schedule(
  'generate-extras-checkins',
  '0 6 1 * *',
  $$select public.generate_extras_checkins()$$
);
