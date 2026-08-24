-- Calcul du bilan — traduction directe de la spec fonctionnelle (section "Logique de
-- calcul"). Tourne côté serveur (le client ne peut pas fabriquer un résultat) ;
-- appelée par l'app via RPC une fois le questionnaire soumis.

create function public.compute_assessment_results(p_assessment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  a public.assessment_answers%rowtype;

  -- constantes de calcul (cf. spec §"Logique de calcul" — configurables ici sans
  -- toucher au flow ni au schéma)
  weeks_per_year_commute constant numeric := 45;
  weeks_per_year_standard constant numeric := 52;
  leisure_freq_rarely constant numeric := 0.25;
  leisure_freq_weekly constant numeric := 1;
  leisure_freq_multiple constant numeric := 3;
  leisure_default_distance constant numeric := 15; -- si "rarement" : contribution résiduelle, pas zéro
  leisure_default_mode constant text := 'voiture';
  dist_flight_short constant numeric := 1500;
  dist_flight_long constant numeric := 9000;
  dist_train_long constant numeric := 800;
  dist_car_long constant numeric := 700;
  tie_break_margin constant numeric := 0.05; -- écart < 5 % => quasi-égalité

  v_commute_distance numeric;
  v_commute_km_year numeric := 0;
  v_commute_co2 numeric := 0;

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

  -- ── Poste 1 : domicile-travail ──────────────────────────────────────────
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
  end if;

  -- ── Poste 2 : loisirs ────────────────────────────────────────────────────
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

  -- ── Poste 3 : voyages annuels ────────────────────────────────────────────
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
    v_dominant_mode := (
      select mode from (values
        ('avion_court_moyen_courrier', v_travel_avion_court),
        ('avion_long_courrier', v_travel_avion_long),
        ('train', v_travel_train),
        ('voiture', v_travel_voiture)
      ) as t(mode, amount)
      order by amount desc limit 1
    );
  end if;

  select label into v_mode_label from public.transport_modes where id = v_dominant_mode;
  v_dominant_label := case v_dominant
    when 'commute' then 'Trajet domicile-travail (' || coalesce(v_mode_label, '') || ')'
    when 'leisure' then 'Trajets loisirs (' || coalesce(v_mode_label, '') || ')'
    else 'Voyages (' || coalesce(v_mode_label, '') || ')'
  end;

  insert into public.assessment_results (
    assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
    dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label, computed_at
  )
  values (
    p_assessment_id, v_total, v_commute_co2, v_leisure_co2, v_travel_co2,
    v_dominant, v_dominant_co2, v_dominant_mode, v_dominant_label, now()
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
    computed_at = excluded.computed_at;
end;
$$;

grant execute on function public.compute_assessment_results(uuid) to authenticated;
revoke execute on function public.compute_assessment_results(uuid) from anon, public;
