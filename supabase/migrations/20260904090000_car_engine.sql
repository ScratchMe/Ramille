-- Retour utilisateur : "voiture (seul)"/"voiture (covoiturage)" ne précisent jamais si le
-- véhicule est thermique ou électrique, alors que ça change fortement le calcul. Risque
-- identifié : ne pas faire exploser les listes de mode (B1.4/B1.7/B2.2), qui doivent
-- rester "Voiture (seul)"/"Voiture (covoiturage)" — pas de doublement en 4 entrées.
--
-- Solution : une question de suivi ("Thermique ou électrique ?", 2 chips), affichée
-- uniquement quand "voiture" est choisi, sur le même écran (nested reveal, même pattern
-- que le "Lequel ?" déjà utilisé pour le second mode intermodal) — jamais un pas de plus
-- dans le wizard. 3 réponses indépendantes, une par contexte où "voiture" peut apparaître :
-- domicile-travail (B1.4/B1.7, une seule jambe peut valoir "voiture" à la fois puisque
-- B1.7 exclut le mode déjà choisi en B1.4 — un seul champ suffit), loisirs (B2.2), voyages
-- longue distance (B3.4, pas de picker de mode existant, la question apparaît dès qu'au
-- moins un trajet est déclaré).
--
-- Réintroduit `voiture_thermique`/`voiture_electrique` dans transport_modes/
-- emission_factors — présents dans le seed initial de l'increment 1
-- (20260823095000_seed_transport_modes.sql / 20260823130000_seed_emission_factors.sql,
-- valeurs ADEME réelles via l'API Impact CO2), puis supprimés par l'increment 6
-- (20260824180000_bilan_v2_schema.sql) qui avait aligné le référentiel sur la spec
-- fonctionnelle v2 — spec qui ne modélisait délibérément pas cette distinction (B1.4 ne
-- liste que "Voiture (seul)"/"Voiture (covoiturage)", et sa table de facteurs indicatifs
-- ne donne qu'une seule ligne "Voiture (thermique moyenne)"). Décision produit du
-- 04/09/2026 qui revient sur ce choix : le poids carbone diffère trop entre les deux pour
-- laisser un bilan aussi imprécis sur ce poste. Les valeurs ADEME de l'increment 1 restent
-- correctes (aucune raison de penser que le facteur électrique français ait significativement
-- changé) — reprises telles quelles plutôt que ré-inventées, mais à rafraîchir via l'API
-- Impact CO2 le jour où le job de sync automatisé existera (cf. commentaire de l'increment 1).
--
-- Le générique 'voiture' (0.1106, quasi identique à 'voiture_thermique' — le parc
-- français reste très majoritairement thermique) reste en place : c'est le mode
-- effectivement stocké dans assessment_answers.commute_mode/leisure_mode (jamais les
-- variantes thermique/électrique, qui n'existent que comme cible de résolution du calcul
-- et de dominant_poste_mode) — sert de repli pour les bilans déjà soumis avant cette
-- migration (moteur non renseigné = null = pas de résolution possible = 'voiture'
-- générique, comportement inchangé pour les données existantes).

insert into public.transport_modes (id, label, category) values
  ('voiture_thermique', 'Voiture thermique', 'voiture'),
  ('voiture_electrique', 'Voiture électrique', 'voiture');

-- kg_co2_per_km est numeric(8,4) : les valeurs sources (0.11056 / 0.01209) sont arrondies
-- à 4 décimales par la colonne elle-même (0.1106 / 0.0121) — indiquées ici déjà arrondies
-- pour ne pas laisser croire à une précision que la colonne ne stocke pas.
insert into public.emission_factors (transport_mode_id, kg_co2_per_km, source, source_ref, valid_from) values
  ('voiture_thermique', 0.1106, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:4 Voiture thermique', current_date),
  ('voiture_electrique', 0.0121, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:5 Voiture électrique', current_date);

alter table public.assessment_answers
  add column commute_car_engine text check (commute_car_engine in ('thermique', 'electrique')),
  add column leisure_car_engine text check (leisure_car_engine in ('thermique', 'electrique')),
  add column car_long_trips_engine text check (car_long_trips_engine in ('thermique', 'electrique'));

-- ── Résolution mode générique + moteur -> mode spécifique ───────────────────────────────
-- Fonction pure (pas de security definer nécessaire, aucun accès table) réutilisée aux 4
-- endroits où "voiture" peut être résolu dans compute_assessment_results ci-dessous.
create or replace function public.resolve_car_mode(p_mode_id text, p_engine text)
returns text
language sql
immutable
as $$
  select case
    when p_mode_id = 'voiture' and p_engine = 'electrique' then 'voiture_electrique'
    when p_mode_id = 'voiture' and p_engine = 'thermique' then 'voiture_thermique'
    else p_mode_id
  end;
$$;

grant execute on function public.resolve_car_mode(text, text) to authenticated, anon;

-- ── compute_assessment_results : résolution du mode voiture avant tout lookup de
-- facteur/libellé (commute principal + second mode, loisirs, voyages longue distance) ──

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
  v_commute_mode_resolved text;
  v_commute_second_mode_resolved text;

  v_leisure_distance numeric;
  v_leisure_mode text;
  v_leisure_mode_resolved text;
  v_leisure_freq numeric;
  v_leisure_co2 numeric := 0;

  v_flights_short integer;
  v_flights_long integer;
  v_travel_co2 numeric := 0;
  v_travel_avion_court numeric := 0;
  v_travel_avion_long numeric := 0;
  v_travel_train numeric := 0;
  v_travel_voiture numeric := 0;
  v_travel_voiture_mode text;
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

    -- Une seule des deux jambes peut valoir "voiture" à la fois (B1.7 exclut le mode déjà
    -- choisi en B1.4), donc commute_car_engine s'applique sans ambiguïté à celle des deux
    -- qui est concernée.
    v_commute_mode_resolved := public.resolve_car_mode(a.commute_mode, a.commute_car_engine);
    v_commute_second_mode_resolved := public.resolve_car_mode(a.commute_second_mode, a.commute_car_engine);

    if a.commute_second_mode_used and a.commute_second_mode is not null then
      v_commute_co2 :=
        (v_commute_km_year / 2) * (select kg_co2_per_km from public.emission_factors where transport_mode_id = v_commute_mode_resolved order by valid_from desc limit 1)
        + (v_commute_km_year / 2) * (select kg_co2_per_km from public.emission_factors where transport_mode_id = v_commute_second_mode_resolved order by valid_from desc limit 1);
    else
      v_commute_co2 := v_commute_km_year * (select kg_co2_per_km from public.emission_factors where transport_mode_id = v_commute_mode_resolved order by valid_from desc limit 1);
    end if;

    if a.commute_is_carpool and a.commute_carpool_size is not null then
      v_commute_co2 := v_commute_co2 / a.commute_carpool_size;
    end if;

    select label into v_mode_label from public.transport_modes where id = v_commute_mode_resolved;
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

  -- Loisirs "rarement" (mode par défaut, jamais posé à l'utilisateur) : pas de moteur
  -- déclaré, resolve_car_mode retombe sur 'voiture' générique — cohérent avec le reste de
  -- cette contribution résiduelle déjà approximée par défaut.
  v_leisure_mode_resolved := public.resolve_car_mode(v_leisure_mode, a.leisure_car_engine);

  v_leisure_co2 := v_leisure_distance * 2 * v_leisure_freq * weeks_per_year_standard
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = v_leisure_mode_resolved order by valid_from desc limit 1);

  v_flights_short := coalesce(a.flights_short_per_year, 0);
  v_flights_long := greatest(a.flights_total_per_year - v_flights_short, 0);

  v_travel_avion_court := v_flights_short * dist_flight_short
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'avion_court_moyen_courrier' order by valid_from desc limit 1);
  v_travel_avion_long := v_flights_long * dist_flight_long
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'avion_long_courrier' order by valid_from desc limit 1);
  v_travel_train := a.train_long_trips_per_year * dist_train_long
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = 'train' order by valid_from desc limit 1);

  v_travel_voiture_mode := public.resolve_car_mode('voiture', a.car_long_trips_engine);
  v_travel_voiture := a.car_long_trips_per_year * dist_car_long
    * (select kg_co2_per_km from public.emission_factors where transport_mode_id = v_travel_voiture_mode order by valid_from desc limit 1);

  v_travel_co2 := v_travel_avion_court + v_travel_avion_long + v_travel_train + v_travel_voiture;
  v_travel_mode := (
    select mode from (values
      ('avion_court_moyen_courrier', v_travel_avion_court),
      ('avion_long_courrier', v_travel_avion_long),
      ('train', v_travel_train),
      (v_travel_voiture_mode, v_travel_voiture)
    ) as t(mode, amount)
    order by amount desc limit 1
  );

  -- ── Poste "extras" (loisirs ou voyages) : même départage que la décision dominante,
  -- mais uniquement entre ces deux postes — sert la boucle mensuelle indépendamment de
  -- ce qui est dominant au global (cf. commentaire d'en-tête).
  if v_leisure_co2 >= v_travel_co2 * (1 - tie_break_margin) then
    v_extras_co2 := v_leisure_co2;
    v_extras_mode := v_leisure_mode_resolved;
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
    v_dominant_mode := v_commute_mode_resolved;
  elsif v_dominant = 'leisure' then
    v_dominant_co2 := v_leisure_co2;
    v_dominant_mode := v_leisure_mode_resolved;
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
