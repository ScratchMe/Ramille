-- TraceVerte V1 — increment 12, étape 1 : corriger les deux facteurs d'émission faux
-- identifiés par l'audit du 04/09/2026. Réf. docs/architecture/v1-07-audit-facteurs-et-suivi.md
-- §1.1 (avion), §1.2 (train longue distance), §1.4 (borne historique), T13 (covoiturage).
--
-- ── 1. Avion : l'API Impact CO2 distingue bien court / moyen / long-courrier ────────────
--
-- Le commentaire du seed initial (20260823130000) affirme que « l'API n'expose qu'UN seul
-- facteur avion ». C'est faux : le mode avion (id=1) est le SEUL de la liste dont la valeur
-- dépend du paramètre `km` de la requête — l'API applique elle-même le bon segment de vol.
-- Le seed ayant été relevé à km=100 uniquement, il n'a jamais vu que court, moyen et long
-- sont trois valeurs distinctes, et a recopié la valeur court-courrier sur long-courrier.
--
-- Relevé du 04/09/2026 sur GET impactco2.fr/api/v1/transport?km=<km>&displayAll=1 :
--   km=100  -> "Avion trajet court"  0,2242 kg/km
--   km=800  -> "Avion trajet court"  0,2242 kg/km
--   km=1500 -> "Avion trajet moyen"  0,1843 kg/km
--   km=9000 -> "Avion trajet long"   0,1776 kg/km
--
-- Règle retenue (vaut aussi pour le futur job de synchronisation) : relever le facteur avion
-- AUX DISTANCES DE RÉFÉRENCE QUE LE PRODUIT UTILISE RÉELLEMENT dans son calcul, pas à une
-- distance arbitraire — soit dist_flight_short = 1500 km et dist_flight_long = 9000 km.
--
-- Correction faite EN PLACE (update) plutôt que par une nouvelle version `valid_from` : ce
-- n'est pas une révision de l'ADEME, c'est une valeur qui n'a jamais été la bonne. Le
-- versionnement de `emission_factors` reste réservé aux vraies mises à jour de la Base
-- Empreinte (cf. étape 2), sinon un correctif de bug se lirait comme une évolution de la
-- science, et les bilans antérieurs resteraient calculés avec la valeur erronée.

update public.emission_factors
set kg_co2_per_km = 0.1843,
    source = 'ADEME Base Empreinte (via API Impact CO2)',
    source_ref = 'impactco2:1 Avion trajet moyen (relevé à km=1500, distance de référence du poste)'
where transport_mode_id = 'avion_court_moyen_courrier';

update public.emission_factors
set kg_co2_per_km = 0.1776,
    source = 'ADEME Base Empreinte (via API Impact CO2)',
    source_ref = 'impactco2:1 Avion trajet long (relevé à km=9000, distance de référence du poste)'
where transport_mode_id = 'avion_long_courrier';

-- ── 2. Train longue distance : le poste voyages était calculé au facteur TER ────────────
--
-- La question B3.3 vise explicitement les trajets « > 300 km » — c'est-à-dire du TGV
-- (0,0023) ou de l'Intercités (0,0058), pas du TER (0,0229, la valeur portée par le mode
-- générique `train`). Un aller-retour longue distance était donc compté 18,3 kg au lieu de
-- 1,8 kg : facteur 10, précisément là où le produit veut faire percevoir que le train est
-- sans commune mesure avec l'avion et la voiture.
--
-- TGV retenu comme référence (mode très majoritaire des trajets > 300 km en France, et
-- référence utilisée par Impact CO2 lui-même pour la longue distance). Le mode générique
-- `train` garde la valeur TER : il sert le trajet quotidien B1.4 « Train ou RER », où le TER
-- est le bon ordre de grandeur. Deux usages distincts, deux modes distincts.
--
-- `valid_from` aligné sur celui du référentiel initial et non sur current_date : ce facteur
-- aurait dû exister dès le seed, et le borner à aujourd'hui empêcherait le recalcul des
-- bilans déjà soumis (cf. §4 ci-dessous, qui les reprend).

insert into public.transport_modes (id, label, category) values
  ('train_longue_distance', 'TGV', 'train');

insert into public.emission_factors (transport_mode_id, kg_co2_per_km, source, source_ref, valid_from)
select
  'train_longue_distance', 0.0023,
  'ADEME Base Empreinte (via API Impact CO2)',
  'impactco2:2 TGV',
  min(valid_from)
from public.emission_factors;

-- ── 3. Lookup de facteur centralisé et borné à la date du bilan ─────────────────────────
--
-- Les huit sous-requêtes `order by valid_from desc limit 1` dispersées dans
-- compute_assessment_results prenaient TOUJOURS le facteur le plus récent, jamais « le
-- facteur en vigueur à la date du bilan » que v1-01 §3 promet. Invisible tant qu'il n'existe
-- qu'une version par mode ; dès la première synchronisation ADEME (étape 2), tout recalcul
-- d'un ancien bilan dériverait silencieusement. Corrigé ici plutôt qu'à l'étape 2 : la
-- fonction est de toute façon réécrite ci-dessous, et centraliser le lookup évite d'avoir à
-- reprendre les huit occurrences une deuxième fois.

create or replace function public.emission_factor(p_mode_id text, p_on_date date)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  v_factor numeric;
begin
  select kg_co2_per_km into v_factor
  from public.emission_factors
  where transport_mode_id = p_mode_id and valid_from <= p_on_date
  order by valid_from desc
  limit 1;

  if v_factor is null then
    -- Mode ajouté au référentiel après la date du bilan (cas du recalcul d'un bilan
    -- antérieur à l'ajout d'un mode) : on retombe sur la plus ancienne version connue.
    -- Renvoyer NULL contaminerait silencieusement tout le total, que la contrainte
    -- `total_co2_kg_year not null` ferait ensuite échouer avec un message incompréhensible.
    select kg_co2_per_km into v_factor
    from public.emission_factors
    where transport_mode_id = p_mode_id
    order by valid_from asc
    limit 1;
  end if;

  if v_factor is null then
    raise exception 'emission_factor: aucun facteur d''émission connu pour le mode %', p_mode_id;
  end if;

  return v_factor;
end;
$$;

grant execute on function public.emission_factor(text, date) to authenticated, anon;

-- ── 4. Calcul du bilan : partie métier séparée du contrôle d'accès ──────────────────────
--
-- `compute_assessment_results` vérifiait la propriété du bilan ET faisait le calcul, ce qui
-- rendait tout recalcul serveur impossible (auth.uid() est null hors session client). Le
-- calcul part dans `recompute_assessment_results`, interne et sans contrôle d'accès ; le RPC
-- client garde la vérification et délègue. Nécessaire pour reprendre les bilans déjà
-- calculés avec les facteurs faux (§5), et réutilisable par un futur job de recalcul.

create or replace function public.recompute_assessment_results(p_assessment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  a public.assessment_answers%rowtype;
  v_owner_id uuid;
  -- Date de référence des facteurs d'émission : celle du bilan, pas celle du calcul —
  -- un bilan recalculé plus tard doit retrouver ses chiffres d'origine (v1-01 §3).
  v_factor_date date;

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
  v_commute_main_leg_co2 numeric := 0;
  v_commute_second_leg_co2 numeric := 0;

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

  v_extras_is_leisure boolean;
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
  select user_id, coalesce(submitted_at::date, current_date)
    into v_owner_id, v_factor_date
  from public.assessments where id = p_assessment_id;

  if v_owner_id is null then
    raise exception 'recompute_assessment_results: bilan % introuvable', p_assessment_id;
  end if;

  select * into a from public.assessment_answers where assessment_id = p_assessment_id;
  if not found then
    raise exception 'recompute_assessment_results: aucune réponse enregistrée pour ce bilan';
  end if;

  -- ── Poste domicile-travail ───────────────────────────────────────────────
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
      v_commute_main_leg_co2 := (v_commute_km_year / 2) * public.emission_factor(v_commute_mode_resolved, v_factor_date);
      v_commute_second_leg_co2 := (v_commute_km_year / 2) * public.emission_factor(v_commute_second_mode_resolved, v_factor_date);
    else
      v_commute_main_leg_co2 := v_commute_km_year * public.emission_factor(v_commute_mode_resolved, v_factor_date);
    end if;

    -- Le covoiturage ne divise QUE la jambe concernée : B1.5 ("combien de personnes
    -- partagez-vous ce trajet ?") porte sur la voiture de B1.4, pas sur le train ou le vélo
    -- déclaré en second mode. Diviser le total revenait à compter la jambe intermodale
    -- comme covoiturée elle aussi.
    if a.commute_is_carpool and a.commute_carpool_size is not null then
      v_commute_main_leg_co2 := v_commute_main_leg_co2 / a.commute_carpool_size;
    end if;

    v_commute_co2 := v_commute_main_leg_co2 + v_commute_second_leg_co2;

    select label into v_mode_label from public.transport_modes where id = v_commute_mode_resolved;
    v_commute_label := 'Trajet domicile-travail (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')';
  end if;

  -- ── Poste loisirs ────────────────────────────────────────────────────────
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
    * public.emission_factor(v_leisure_mode_resolved, v_factor_date);

  -- ── Poste voyages ────────────────────────────────────────────────────────
  v_flights_short := coalesce(a.flights_short_per_year, 0);
  v_flights_long := greatest(a.flights_total_per_year - v_flights_short, 0);

  v_travel_avion_court := v_flights_short * dist_flight_short
    * public.emission_factor('avion_court_moyen_courrier', v_factor_date);
  v_travel_avion_long := v_flights_long * dist_flight_long
    * public.emission_factor('avion_long_courrier', v_factor_date);
  -- `train_longue_distance` (TGV) et non `train` (TER) : B3.3 porte sur des trajets > 300 km.
  v_travel_train := a.train_long_trips_per_year * dist_train_long
    * public.emission_factor('train_longue_distance', v_factor_date);

  v_travel_voiture_mode := public.resolve_car_mode('voiture', a.car_long_trips_engine);
  v_travel_voiture := a.car_long_trips_per_year * dist_car_long
    * public.emission_factor(v_travel_voiture_mode, v_factor_date);

  v_travel_co2 := v_travel_avion_court + v_travel_avion_long + v_travel_train + v_travel_voiture;
  v_travel_mode := (
    select mode from (values
      ('avion_court_moyen_courrier', v_travel_avion_court),
      ('avion_long_courrier', v_travel_avion_long),
      ('train_longue_distance', v_travel_train),
      (v_travel_voiture_mode, v_travel_voiture)
    ) as t(mode, amount)
    order by amount desc limit 1
  );

  -- ── Poste "extras" (loisirs ou voyages) : même départage que la décision dominante,
  -- mais uniquement entre ces deux postes — sert la boucle mensuelle indépendamment de
  -- ce qui est dominant au global (cf. v1-02 §3).
  v_extras_is_leisure := v_leisure_co2 >= v_travel_co2 * (1 - tie_break_margin);
  if v_extras_is_leisure then
    v_extras_co2 := v_leisure_co2;
    v_extras_mode := v_leisure_mode_resolved;
  else
    v_extras_co2 := v_travel_co2;
    v_extras_mode := v_travel_mode;
  end if;
  select label into v_mode_label from public.transport_modes where id = v_extras_mode;
  v_extras_label := case when v_extras_is_leisure
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

revoke execute on function public.recompute_assessment_results(uuid) from public, anon, authenticated;

-- RPC client : vérifie la propriété du bilan puis délègue le calcul. Reste `security
-- definer` + ouvert à `authenticated` (cf. v1-05 §4) — la protection est la vérification
-- de propriété ci-dessous, pas un REVOKE.
create or replace function public.compute_assessment_results(p_assessment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select user_id into v_owner_id from public.assessments where id = p_assessment_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'compute_assessment_results: bilan introuvable ou accès refusé';
  end if;

  perform public.recompute_assessment_results(p_assessment_id);
end;
$$;

grant execute on function public.compute_assessment_results(uuid) to authenticated;
revoke execute on function public.compute_assessment_results(uuid) from anon, public;

-- ── 5. Reprise des bilans déjà calculés avec les facteurs faux ──────────────────────────
--
-- `assessment_results` est un snapshot volontairement figé (v1-05), mais figer un chiffre
-- faux n'a pas de sens : ces résultats n'ont jamais été justes. Recalcul de tous les bilans
-- complétés avec les facteurs corrigés.

do $$
declare
  v_id uuid;
begin
  for v_id in
    select a.id from public.assessments a
    join public.assessment_results ar on ar.assessment_id = a.id
    where a.status = 'completed'
  loop
    perform public.recompute_assessment_results(v_id);
  end loop;
end;
$$;
