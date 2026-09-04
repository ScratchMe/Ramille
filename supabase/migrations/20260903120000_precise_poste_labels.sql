-- Précision des libellés loisirs/voyages (retour utilisateur du 03/09/2026) : "Trajets
-- loisirs" et "Voyages" ne disent pas ce qu'ils couvrent. Ce sont deux postes bien
-- distincts dans le bilan (cf. spec-fonctionnelle §2/§3, onboarding "2 — Week-ends et
-- loisirs" / "3 — Voyages sur l'année") — le libellé doit porter cette distinction, pas
-- seulement le mode de transport entre parenthèses :
--   - "Trajets loisirs" -> "Loisirs du week-end" (sport, sorties, famille — B2, cf.
--     leisure-frequency.tsx : "trajets loisirs le weekend").
--   - "Voyages" -> "Voyages longue distance" (vols, longs trajets train/voiture dans
--     l'année — B3).
--
-- Profite du passage pour corriger un second bug repéré sur les libellés réels en base :
-- les modes avion ont un libellé qui contient déjà des parenthèses (transport_modes.label
-- = "Avion (court/moyen-courrier)"/"Avion (long-courrier)"), donc la construction
-- "Voyages (" || v_mode_label || ")" produisait des parenthèses imbriquées — ex. "Voyages
-- (Avion (long-courrier))" au lieu de "Voyages longue distance (Avion long-courrier)".
-- Fix : v_mode_label est nettoyé de ses parenthèses avant d'être réinjecté dans le gabarit
-- (seuls les modes avion sont concernés en pratique, mais appliqué aux 3 constructions par
-- cohérence).
--
-- Seul le texte des libellés change (mêmes 3 colonnes, même calcul) — CREATE OR REPLACE
-- de compute_assessment_results, identique à la version de
-- 20260827090000_engagement_checkins.sql hormis les gabarits de libellé.

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
    v_commute_label := 'Trajet domicile-travail (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')';
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
    then 'Loisirs du week-end (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
    else 'Voyages longue distance (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
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
    when 'commute' then 'Trajet domicile-travail (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
    when 'leisure' then 'Loisirs du week-end (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
    else 'Voyages longue distance (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
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

-- Bilans déjà calculés : les 2 gabarits de libellé sont sans ambiguïté (préfixe fixe,
-- aucun mode de transport ne commence par "Trajets loisirs (" ou "Voyages (") — un
-- simple remplacement de texte régénère les libellés déjà stockés sans rejouer tout le
-- calcul (exécuté en tant que postgres, migration DDL, pas de garde auth.uid() à
-- respecter ici contrairement à un appel RPC). Le 3ème remplacement corrige les
-- parenthèses imbriquées déjà en base pour les modes avion (ex. "Voyages (Avion
-- (long-courrier))" -> "... (Avion long-courrier)"), même bug que celui fixé ci-dessus
-- dans la fonction.
update public.assessment_results
set
  extras_poste_label = regexp_replace(
    regexp_replace(
      regexp_replace(extras_poste_label, '^Trajets loisirs \(', 'Loisirs du week-end ('),
      '^Voyages \(', 'Voyages longue distance ('
    ),
    '\(Avion \(([^)]+)\)\)$', '(Avion \1)'
  ),
  dominant_poste_label = regexp_replace(
    regexp_replace(
      regexp_replace(dominant_poste_label, '^Trajets loisirs \(', 'Loisirs du week-end ('),
      '^Voyages \(', 'Voyages longue distance ('
    ),
    '\(Avion \(([^)]+)\)\)$', '(Avion \1)'
  )
where extras_poste_label ~ '^(Trajets loisirs|Voyages) \('
   or dominant_poste_label ~ '^(Trajets loisirs|Voyages) \('
   or extras_poste_label ~ '\(Avion \('
   or dominant_poste_label ~ '\(Avion \(';

-- Les mêmes libellés, une fois snapshotés sur engagement_checkins/plan_cycles, ne sont
-- volontairement jamais réécrits rétroactivement (cf. CLAUDE.md, "assessment_results
-- fige le résultat... même logique pour engagement_checkins.trip_label") : un check-in
-- ou un plan déjà généré garde son wording d'origine, seul le prochain cycle reprendra
-- le nouveau libellé.
