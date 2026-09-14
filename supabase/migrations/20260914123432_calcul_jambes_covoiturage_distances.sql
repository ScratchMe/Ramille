-- C3.4 + C3.5 + C3.6 — les trois chantiers de calcul, en une seule migration.
--
-- Ils sont regroupés parce qu'ils touchent les mêmes objets : `assessment_answers`,
-- `recompute_assessment_results`, et la même reprise de la suite pgTAP. Les livrer séparément
-- imposerait trois fois la relecture des assertions chiffrées, et deux occasions de plus de se
-- tromper dans le recalcul.
--
-- ## Le principe qui rend cette migration sûre : tout est optionnel, et le repli reproduit l'existant
--
-- Chaque colonne ajoutée ici est **nullable**, et chaque valeur de repli est celle que le calcul
-- utilise déjà en dur : la moitié du trajet pour le second mode, la borne haute de la tranche de
-- loisirs, une personne par voiture sur les longs trajets, pas de covoiturage de loisirs. Un bilan
-- déjà soumis, recalculé après cette migration, rend donc **exactement le même total**.
--
-- Ce n'est pas de la prudence décorative : c'est ce qui permet de ne pas réécrire les quinze
-- assertions chiffrées de la suite pgTAP, dont plusieurs dérivent d'un facteur sans le nommer et
-- que CLAUDE.md signale comme ayant déjà fait tomber la CI deux fois. Les assertions existantes
-- restent vraies ; celles qui s'ajoutent éprouvent les nouveaux chemins.
--
-- ══════════════════════════════════════════════════════════════════════════════════════════
-- C3.4 — le trajet intermodal
-- ══════════════════════════════════════════════════════════════════════════════════════════
--
-- **La moitié exacte était une hypothèse déguisée en fait.** Avec un second mode, le calcul
-- attribuait 50 % des kilomètres à chacun. Sur les deux combinaisons réelles les plus fréquentes,
-- l'erreur est à deux chiffres et dans les deux sens : vélo + train sous-estimé de 44 % (on fait
-- rarement la moitié du trajet à vélo), voiture + train en parc-relais surestimé de 51 % (on ne
-- conduit pas jusqu'à mi-chemin). Et c'est le poste qui décide du poste dominant, donc du plan.
--
-- **Le CO2 de la seconde jambe était calculé puis jeté.** `v_commute_second_leg_co2` existait déjà
-- dans le corps de la fonction, entrait dans le total, et n'était persisté nulle part. Conséquence
-- pour le plan, qui lit `assessment_results` : toutes les actions domicile-travail se calculent sur
-- `commute_main_leg_co2_kg_year`, c'est-à-dire sur **la moitié du trajet**. « Garder une journée de
-- télétravail » supprime les deux jambes et n'en comptait qu'une (153 kg réels, 128 annoncés), et
-- le seuil de 5 kg écartait des actions qui le franchissaient en comptant les deux.
--
-- ══════════════════════════════════════════════════════════════════════════════════════════
-- C3.5 — le covoiturage des loisirs, et l'occupation des longs trajets
-- ══════════════════════════════════════════════════════════════════════════════════════════
--
-- Le trajet domicile-travail demande depuis toujours « seul ou à plusieurs ? » et divise le poste
-- en conséquence (B1.5). Les loisirs, non : une sortie à quatre dans la même voiture comptait
-- quatre fois. Même chose pour les longs trajets en voiture (B3.4), où partir à trois est plus
-- courant encore qu'au quotidien.
--
-- ══════════════════════════════════════════════════════════════════════════════════════════
-- C3.6 — la tranche haute des loisirs
-- ══════════════════════════════════════════════════════════════════════════════════════════
--
-- « Plus de 30 km » valait 40 km, quelle que soit la réponse. Une sortie de 120 km comptait donc
-- pour 40 : un tiers de la réalité, sur un poste qui peut être dominant. La tranche ouverte est la
-- seule du questionnaire à n'avoir pas de borne haute, et c'est justement celle qui en avait le
-- plus besoin.

-- ── Schéma ────────────────────────────────────────────────────────────────────────────────

alter table public.assessment_answers
  -- Part du trajet domicile-travail faite avec le second mode. Trois valeurs à l'écran (un quart,
  -- la moitié, trois quarts) stockées en fraction plutôt qu'en énumération : le calcul multiplie,
  -- il n'a pas à traduire, et une quatrième nuance demain ne sera pas une migration de contrainte.
  -- Bornes strictes : à 0 le second mode n'existe pas (c'est `commute_second_mode_used`), à 1 c'est
  -- le mode principal qui n'existe plus.
  add column if not exists commute_second_mode_share numeric,
  add column if not exists leisure_is_carpool boolean not null default false,
  add column if not exists leisure_carpool_size smallint,
  -- Distance libre sous « Plus de 30 km ». Jumelle exacte de `commute_distance_km`, y compris sa
  -- borne : un « 0 » saisi n'est pas une distance.
  add column if not exists leisure_distance_km numeric,
  -- Occupation d'un long trajet en voiture (B3.4) : 1 = seul. Jusqu'à 5, comme le covoiturage du
  -- quotidien s'arrête à 6 — un long trajet se fait en voiture familiale, pas en minibus.
  add column if not exists car_long_trips_occupancy smallint;

-- `drop ... if exists` devant chaque `add constraint` : `add constraint` n'est pas idempotent, et
-- une migration doit se rejouer telle quelle après une restauration (CLAUDE.md).
alter table public.assessment_answers
  drop constraint if exists assessment_answers_commute_second_mode_share_check,
  drop constraint if exists assessment_answers_leisure_carpool_size_check,
  drop constraint if exists assessment_answers_leisure_distance_km_check,
  drop constraint if exists assessment_answers_car_long_trips_occupancy_check;

alter table public.assessment_answers
  add constraint assessment_answers_commute_second_mode_share_check
    check (commute_second_mode_share is null
           or (commute_second_mode_share > 0 and commute_second_mode_share < 1)),
  add constraint assessment_answers_leisure_carpool_size_check
    check (leisure_carpool_size is null or (leisure_carpool_size >= 2 and leisure_carpool_size <= 6)),
  add constraint assessment_answers_leisure_distance_km_check
    check (leisure_distance_km is null or leisure_distance_km > 0),
  add constraint assessment_answers_car_long_trips_occupancy_check
    check (car_long_trips_occupancy is null
           or (car_long_trips_occupancy >= 1 and car_long_trips_occupancy <= 5));

comment on column public.assessment_answers.commute_second_mode_share is
  'Part du trajet domicile-travail parcourue avec le second mode (0 < x < 1). Null = non renseigné, le calcul retombe sur 0,5 — la valeur qu''il utilisait en dur avant C3.4.';
comment on column public.assessment_answers.leisure_distance_km is
  'Distance d''une sortie quand la tranche ouverte « Plus de 30 km » est choisie. Null = la tranche seule, qui vaut 40 km.';
comment on column public.assessment_answers.car_long_trips_occupancy is
  'Nombre de personnes dans la voiture sur un long trajet. Null = 1, la valeur implicite d''avant C3.5.';

alter table public.assessment_results
  -- La seconde jambe cesse d'être calculée puis jetée. Le plan lit cette table : sans ces deux
  -- colonnes, `remove_day` et `remove_trip` ne peuvent pas porter sur le trajet entier.
  add column if not exists commute_second_leg_km_year numeric,
  add column if not exists commute_second_leg_co2_kg_year numeric;

comment on column public.assessment_results.commute_second_leg_co2_kg_year is
  'CO2 de la seconde jambe du trajet domicile-travail. Existait dans le calcul depuis l''increment 5 sans être persisté : toutes les actions du plan se calculaient donc sur la jambe principale seule.';

-- ── Le calcul ─────────────────────────────────────────────────────────────────────────────
--
-- Repris de `pg_get_functiondef` et non du fichier d'origine (CLAUDE.md) : cette fonction a été
-- réécrite six fois, et repartir de `20260824180200` supprimerait en silence tout ce que les cinq
-- migrations suivantes y ont ajouté.

create or replace function public.recompute_assessment_results(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  a public.assessment_answers%rowtype;
  v_owner_id uuid;
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
  -- C3.4 : la valeur que le calcul utilisait en dur. Elle devient un repli nommé, pour que la
  -- phrase affichée à l'écran et le calcul citent la même chose.
  second_leg_share_default constant numeric := 0.5;

  v_commute_distance numeric;
  v_commute_km_year numeric := 0;
  v_commute_co2 numeric := 0;
  v_commute_label text;
  v_commute_mode_resolved text;
  v_commute_second_mode_resolved text;
  v_commute_second_share numeric;
  v_commute_main_leg_km numeric := 0;
  v_commute_main_leg_co2 numeric := 0;
  v_commute_second_leg_km numeric := 0;
  v_commute_second_leg_co2 numeric := 0;

  v_leisure_distance numeric;
  v_leisure_km_year numeric := 0;
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

  v_mobility_constrained boolean;

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

    v_commute_mode_resolved := public.resolve_mode(a.commute_mode, a.commute_car_engine, a.commute_two_wheeler_type);
    v_commute_second_mode_resolved := public.resolve_mode(a.commute_second_mode, a.commute_car_engine, a.commute_two_wheeler_type);

    if a.commute_second_mode_used and a.commute_second_mode is not null then
      -- C3.4 : la part déclarée, ou la moitié faute de réponse — la valeur d'avant, pour qu'un
      -- bilan déjà soumis rende exactement le même total après cette migration.
      v_commute_second_share := coalesce(a.commute_second_mode_share, second_leg_share_default);
      v_commute_second_leg_km := v_commute_km_year * v_commute_second_share;
      v_commute_main_leg_km := v_commute_km_year - v_commute_second_leg_km;
      v_commute_second_leg_co2 := v_commute_second_leg_km
        * public.emission_factor(v_commute_second_mode_resolved, v_factor_date);
    else
      v_commute_main_leg_km := v_commute_km_year;
    end if;

    v_commute_main_leg_co2 := v_commute_main_leg_km * public.emission_factor(v_commute_mode_resolved, v_factor_date);

    -- La division par le covoiturage reste sur la **seule jambe principale** : c'est là qu'on
    -- partage une voiture, pas dans le train de la seconde jambe (correction T13, préservée).
    if a.commute_is_carpool and a.commute_carpool_size is not null then
      v_commute_main_leg_co2 := v_commute_main_leg_co2 / a.commute_carpool_size;
    end if;

    v_commute_co2 := v_commute_main_leg_co2 + v_commute_second_leg_co2;

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
    v_leisure_mode := case when a.household_vehicles = '0' then 'train' else leisure_default_mode end;
  else
    -- C3.6 : la distance déclarée l'emporte sur la tranche. Elle n'est proposée que sous la tranche
    -- ouverte, mais le calcul ne s'en préoccupe pas — si elle est là, elle est plus précise que
    -- n'importe quel milieu de tranche, y compris pour une tranche fermée.
    v_leisure_distance := coalesce(
      a.leisure_distance_km,
      case a.leisure_distance_bracket
        when 'lt_5' then 2.5
        when '5_15' then 10
        when '15_30' then 22.5
        when '30_plus' then 40
      end
    );
    v_leisure_mode := a.leisure_mode;
  end if;

  v_leisure_mode_resolved := public.resolve_mode(v_leisure_mode, a.leisure_car_engine, a.leisure_two_wheeler_type);

  v_leisure_km_year := v_leisure_distance * 2 * v_leisure_freq * weeks_per_year_standard;
  v_leisure_co2 := v_leisure_km_year * public.emission_factor(v_leisure_mode_resolved, v_factor_date);

  -- C3.5 : une sortie à quatre dans la même voiture comptait quatre fois. Même mécanique que le
  -- trajet domicile-travail, et même condition — la taille doit être renseignée, sinon on ne divise
  -- pas : un `leisure_is_carpool` seul ne dit pas par combien.
  if a.leisure_is_carpool and a.leisure_carpool_size is not null then
    v_leisure_co2 := v_leisure_co2 / a.leisure_carpool_size;
  end if;

  v_flights_short := coalesce(a.flights_short_per_year, 0);
  v_flights_long := greatest(a.flights_total_per_year - v_flights_short, 0);

  v_travel_avion_court := v_flights_short * dist_flight_short
    * public.emission_factor('avion_court_moyen_courrier', v_factor_date);
  v_travel_avion_long := v_flights_long * dist_flight_long
    * public.emission_factor('avion_long_courrier', v_factor_date);
  v_travel_train := a.train_long_trips_per_year * dist_train_long
    * public.emission_factor('train_longue_distance', v_factor_date);

  v_travel_voiture_mode := public.resolve_car_mode('voiture', a.car_long_trips_engine);
  v_travel_voiture := a.car_long_trips_per_year * dist_car_long
    * public.emission_factor(v_travel_voiture_mode, v_factor_date);
  -- C3.5 : partir à trois divise l'empreinte du trajet par trois. Repli à 1 — seul —, c'est-à-dire
  -- ce que le calcul supposait sans le dire.
  v_travel_voiture := v_travel_voiture / coalesce(a.car_long_trips_occupancy, 1);

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

  v_extras_is_leisure := v_leisure_co2 >= v_travel_co2 * (1 - tie_break_margin);
  if v_extras_is_leisure then
    v_extras_co2 := v_leisure_co2;
    v_extras_mode := v_leisure_mode_resolved;
  else
    v_extras_co2 := v_travel_co2;
    v_extras_mode := v_travel_mode;
  end if;
  select label into v_mode_label from public.transport_modes where id = v_extras_mode;
  v_extras_label := case
    when v_extras_is_leisure and a.leisure_frequency = 'rarely'
      then 'Loisirs du week-end (occasionnels)'
    when v_extras_is_leisure
      then 'Loisirs du week-end (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
    else 'Voyages longue distance (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
  end;

  v_mobility_constrained :=
    a.tc_access = 'inexistant'
    or (a.zone_type = 'rural' and a.tc_access = 'limite');

  v_total := v_commute_co2 + v_leisure_co2 + v_travel_co2;

  if v_total = 0 then
    v_dominant := case
      when a.commute_has_regular_trip then 'commute'
      when a.leisure_frequency <> 'rarely' then 'leisure'
      when coalesce(a.flights_total_per_year, 0) + coalesce(a.train_long_trips_per_year, 0)
           + coalesce(a.car_long_trips_per_year, 0) > 0 then 'travel'
      else 'commute'
    end;
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

  -- Le mode d'un loisir « rarement » est un résiduel de calcul, pas une déclaration
  -- (A13-4) : il ne doit ni composer la préposition de la restitution, ni nommer le poste.
  if v_dominant = 'leisure' and a.leisure_frequency = 'rarely' then
    v_dominant_mode := null;
  end if;

  select label into v_mode_label from public.transport_modes where id = v_dominant_mode;
  v_dominant_label := case v_dominant
    when 'commute' then 'Trajet domicile-travail'
    when 'leisure' then 'Loisirs du week-end'
    else 'Voyages longue distance'
  end
    -- Jamais « Trajet domicile-travail () » : quand aucun mode n'est résolu — bilan à zéro,
    -- poste sans réponse — le poste se nomme seul.
    || case
      when v_dominant = 'leisure' and a.leisure_frequency = 'rarely' then ' (occasionnels)'
      else coalesce(' (' || regexp_replace(v_mode_label, '[()]', '', 'g') || ')', '')
    end;

  insert into public.assessment_results (
    assessment_id, total_co2_kg_year, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year,
    dominant_poste, dominant_poste_co2_kg_year, dominant_poste_mode, dominant_poste_label,
    commute_poste_label, commute_poste_mode, extras_poste_co2_kg_year, extras_poste_label, extras_poste,
    commute_main_leg_km_year, commute_main_leg_co2_kg_year,
    commute_second_leg_km_year, commute_second_leg_co2_kg_year, leisure_km_year,
    commute_trip_distance_km, leisure_trip_distance_km,
    travel_flight_short_co2_kg_year, travel_flight_long_co2_kg_year,
    travel_train_co2_kg_year, travel_car_co2_kg_year, mobility_constrained,
    computed_at
  )
  values (
    p_assessment_id, v_total, v_commute_co2, v_leisure_co2, v_travel_co2,
    v_dominant, v_dominant_co2, v_dominant_mode, v_dominant_label,
    v_commute_label, v_commute_mode_resolved, v_extras_co2, v_extras_label, case when v_extras_is_leisure then 'leisure' else 'travel' end,
    v_commute_main_leg_km, v_commute_main_leg_co2,
    v_commute_second_leg_km, v_commute_second_leg_co2, v_leisure_km_year,
    v_commute_distance, v_leisure_distance,
    v_travel_avion_court, v_travel_avion_long, v_travel_train, v_travel_voiture,
    v_mobility_constrained,
    now()
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
    commute_poste_mode = excluded.commute_poste_mode,
    extras_poste_co2_kg_year = excluded.extras_poste_co2_kg_year,
    extras_poste_label = excluded.extras_poste_label,
    extras_poste = excluded.extras_poste,
    commute_main_leg_km_year = excluded.commute_main_leg_km_year,
    commute_main_leg_co2_kg_year = excluded.commute_main_leg_co2_kg_year,
    commute_second_leg_km_year = excluded.commute_second_leg_km_year,
    commute_second_leg_co2_kg_year = excluded.commute_second_leg_co2_kg_year,
    leisure_km_year = excluded.leisure_km_year,
    commute_trip_distance_km = excluded.commute_trip_distance_km,
    leisure_trip_distance_km = excluded.leisure_trip_distance_km,
    travel_flight_short_co2_kg_year = excluded.travel_flight_short_co2_kg_year,
    travel_flight_long_co2_kg_year = excluded.travel_flight_long_co2_kg_year,
    travel_train_co2_kg_year = excluded.travel_train_co2_kg_year,
    travel_car_co2_kg_year = excluded.travel_car_co2_kg_year,
    mobility_constrained = excluded.mobility_constrained,
    computed_at = excluded.computed_at;

  -- Le plan ne doit pas pouvoir emporter le bilan (C1.1, A8-3). Les deux fonctions partagent la
  -- transaction du RPC client : sans cette sous-transaction, une exception ici annulerait aussi
  -- l’écriture d’assessment_results que le calcul vient de réussir, et il suffit d’un mode sans
  -- facteur d’émission pour faire lever estimate_action_savings.
  --
  -- Le plan manquant est rattrapé par le cron nocturne generate_plan_cycles(), qui existe
  -- précisément pour cela. `raise warning` est le niveau que Supabase conserve dans les journaux
  -- Postgres : l’échec reste lisible après coup sans remonter au client, pour qui le bilan a
  -- bel et bien abouti.
  begin
    perform public.generate_plan_cycle_for_user(v_owner_id);
  exception when others then
    raise warning 'recompute_assessment_results: le plan de % n''a pas pu être généré (% %). Le bilan est enregistré, le cron nocturne réessaiera.',
      v_owner_id, sqlstate, sqlerrm;
  end;
end;
$function$;

-- ── Contrôles ─────────────────────────────────────────────────────────────────────────────
-- Rejouables : ils lisent le schéma et le corps installés, donc ils disent la même chose au
-- premier passage et au dixième.

do $$
declare
  v_corps text := pg_get_functiondef('public.recompute_assessment_results(uuid)'::regprocedure);
begin
  -- La garde qui compte : le repli reproduit l'existant. Sans `coalesce(..., 0.5)`, un bilan déjà
  -- soumis changerait de total au premier recalcul, et les assertions chiffrées de la suite pgTAP
  -- tomberaient toutes ensemble sans qu'on sache laquelle est la bonne.
  if position('coalesce(a.commute_second_mode_share, second_leg_share_default)' in v_corps) = 0 then
    raise exception 'La part du second mode ne retombe pas sur 0,5 : les bilans existants changeraient de total.';
  end if;
  if position('coalesce(a.car_long_trips_occupancy, 1)' in v_corps) = 0 then
    raise exception 'L''occupation des longs trajets ne retombe pas sur 1 : les bilans existants changeraient de total.';
  end if;
  if position('commute_second_leg_co2_kg_year = excluded.commute_second_leg_co2_kg_year' in v_corps) = 0 then
    raise exception 'La seconde jambe n''est toujours pas persistée au re-calcul.';
  end if;
  -- La division du covoiturage doit rester sur la jambe principale (correction T13).
  if position('v_commute_main_leg_co2 := v_commute_main_leg_co2 / a.commute_carpool_size' in v_corps) = 0 then
    raise exception 'Le covoiturage ne divise plus la seule jambe principale : T13 est défaite.';
  end if;
end;
$$;

-- ── Le plan compte enfin le trajet entier ──────────────────────────────────────────────────
--
-- C3.4, point 1. `estimate_action_savings` lit `assessment_results`, où la seconde jambe
-- n'existait pas : **toutes** les actions domicile-travail se calculaient donc sur la jambe
-- principale, c'est-à-dire sur la moitié du trajet pour qui en déclare deux.
--
-- La correction n'est pas uniforme, et c'est le fond du point :
--
--   - **`remove_day` et `remove_trip` portent sur les deux jambes.** Ne pas prendre son trajet un
--     jour donné, c'est ne prendre ni la voiture ni le train ce jour-là. C'est le cas le plus
--     coûteux : « garder une journée de télétravail » annonçait 128 kg là où le gain réel est 153.
--   - **Les substitutions restent sur la jambe principale**, parce que c'est elle qu'on remplace —
--     et le détail le **dit** maintenant (« Sur la partie en voiture de ton trajet »). Le laisser
--     implicite serait pire qu'avant : le gain serait juste, et la phrase laisserait croire qu'il
--     porte sur le trajet entier.
--   - **`share_vehicle` reste sur la jambe principale** pour la même raison : on partage la voiture,
--     pas le train.
--
-- Repris de `pg_get_functiondef`, comme la fonction précédente et pour la même raison.

create or replace function public.estimate_action_savings(p_assessment_id uuid)
returns setof action_saving
language plpgsql
stable security definer
set search_path = public
as $function$
declare
  min_saving_kg constant numeric := 5;

  a public.assessment_answers%rowtype;
  r public.assessment_results%rowtype;
  v_factor_date date;
  t record;

  v_base_co2 numeric;
  v_current_factor numeric;
  v_reduction_ratio numeric;
  v_saving numeric;
  v_trip_distance numeric;
  v_count integer;
  v_detail text;
  v_commute_category text;
  v_commute_mode_label text;
  -- Le trajet entier : les deux jambes. Nommé plutôt que recalculé à trois endroits, pour qu'on ne
  -- puisse pas en oublier un — c'est exactement ce qui s'est passé jusqu'ici.
  v_commute_total_co2 numeric;
  v_rows public.action_saving[] := '{}';
begin
  select coalesce(submitted_at::date, current_date) into v_factor_date
  from public.assessments where id = p_assessment_id;

  select * into a from public.assessment_answers where assessment_id = p_assessment_id;
  if not found then
    return;
  end if;

  select * into r from public.assessment_results where assessment_id = p_assessment_id;
  if not found then
    return;
  end if;

  select tm.category, tm.label into v_commute_category, v_commute_mode_label
  from public.transport_modes tm
  where tm.id = public.resolve_mode(a.commute_mode, a.commute_car_engine, a.commute_two_wheeler_type);

  v_commute_total_co2 := coalesce(r.commute_main_leg_co2_kg_year, 0)
    + coalesce(r.commute_second_leg_co2_kg_year, 0);

  for t in select * from public.action_templates loop
    v_base_co2 := null;
    v_current_factor := null;
    v_detail := null;

    if t.requires_tc and coalesce(a.tc_access, '') = 'inexistant' then
      continue;
    end if;
    if t.requires_car and coalesce(a.household_vehicles, '') = '0' then
      continue;
    end if;
    -- C2.5 : les sorties de ce profil sont un résiduel de calcul, pas une déclaration.
    if t.poste = 'leisure' and a.leisure_frequency = 'rarely' then
      continue;
    end if;

    if t.poste = 'commute' then
      if not coalesce(a.commute_has_regular_trip, false) then continue; end if;
      if coalesce(r.commute_main_leg_km_year, 0) <= 0 then continue; end if;
      if coalesce(a.commute_days_per_week, 0) < 1 then continue; end if;

      v_current_factor := r.commute_main_leg_co2_kg_year / r.commute_main_leg_km_year;
      v_trip_distance := r.commute_trip_distance_km;

      if t.max_distance_km is not null
         and coalesce(v_trip_distance, 1e9) > t.max_distance_km then
        continue;
      end if;

      if t.operation = 'share_vehicle' then
        if coalesce(v_commute_category, '') <> 'voiture' then continue; end if;
        if coalesce(a.commute_is_carpool, false) then continue; end if;
        -- On partage la voiture, pas le train de la seconde jambe.
        v_base_co2 := t.share * r.commute_main_leg_co2_kg_year;
      elsif t.operation = 'remove_day' then
        if a.commute_days_per_week < 2 then continue; end if;
        -- C3.4 : ne pas faire le trajet un jour donné, c'est ne faire aucune des deux jambes.
        v_base_co2 := (t.trips / a.commute_days_per_week) * v_commute_total_co2;
      elsif t.operation = 'remove_trip' then
        -- Même raison : un trajet supprimé l'est en entier.
        v_base_co2 := t.share * v_commute_total_co2;
      else
        -- `substitute` : on remplace le mode de la jambe principale, et elle seule.
        v_base_co2 := t.share * r.commute_main_leg_co2_kg_year;
      end if;

    elsif t.poste = 'leisure' then
      if coalesce(r.leisure_km_year, 0) <= 0 then continue; end if;
      v_current_factor := r.leisure_co2_kg_year / r.leisure_km_year;
      v_trip_distance := r.leisure_trip_distance_km;

      if t.max_distance_km is not null
         and coalesce(v_trip_distance, 1e9) > t.max_distance_km then
        continue;
      end if;

      v_base_co2 := t.share * r.leisure_co2_kg_year;

    elsif t.poste = 'travel' then
      if t.segment = 'flight_short' then
        v_count := coalesce(a.flights_short_per_year, 0);
        v_base_co2 := coalesce(r.travel_flight_short_co2_kg_year, 0);
        v_current_factor := public.emission_factor('avion_court_moyen_courrier', v_factor_date);
        v_detail := format('Sur %s vol%s court ou moyen-courrier déclaré%s.',
          v_count, case when v_count > 1 then 's' else '' end, case when v_count > 1 then 's' else '' end);
      elsif t.segment = 'flight_long' then
        v_count := greatest(coalesce(a.flights_total_per_year, 0) - coalesce(a.flights_short_per_year, 0), 0);
        v_base_co2 := coalesce(r.travel_flight_long_co2_kg_year, 0);
        v_current_factor := public.emission_factor('avion_long_courrier', v_factor_date);
        v_detail := format('Sur %s vol%s long-courrier déclaré%s.',
          v_count, case when v_count > 1 then 's' else '' end, case when v_count > 1 then 's' else '' end);
      elsif t.segment = 'car' then
        v_count := coalesce(a.car_long_trips_per_year, 0);
        v_base_co2 := coalesce(r.travel_car_co2_kg_year, 0);
        v_current_factor := public.emission_factor(
          public.resolve_car_mode('voiture', a.car_long_trips_engine), v_factor_date);
        v_detail := format('Sur %s long%s trajet%s en voiture déclaré%s.',
          v_count, case when v_count > 1 then 's' else '' end, case when v_count > 1 then 's' else '' end,
          case when v_count > 1 then 's' else '' end);
      else
        continue;
      end if;

      if v_count < 1 or v_base_co2 <= 0 then continue; end if;
      v_base_co2 := least(t.trips, v_count) * (v_base_co2 / v_count);
    else
      continue;
    end if;

    if v_current_factor is null or v_current_factor <= 0 then continue; end if;
    if v_base_co2 is null or v_base_co2 <= 0 then continue; end if;

    if t.operation = 'substitute' then
      v_reduction_ratio := 1 - (public.emission_factor(t.substitute_mode_id, v_factor_date) / v_current_factor);
    elsif t.operation = 'share_vehicle' then
      v_reduction_ratio := 0.5;
    else
      v_reduction_ratio := 1;
    end if;

    v_saving := v_base_co2 * v_reduction_ratio;

    if v_saving < min_saving_kg then continue; end if;

    if v_detail is null then
      v_detail := case t.detail_kind
        when 'commute_days' then format('Sur tes %s trajet%s par semaine.',
          a.commute_days_per_week, case when a.commute_days_per_week > 1 then 's' else '' end)
        when 'commute_distance' then format('Sur un trajet de %s km.', round(v_trip_distance))
        when 'leisure_frequency' then 'Sur tes déplacements de loisir.'
        else null
      end;
    end if;

    -- C3.4 : quand le trajet a deux jambes, une action qui n'en touche qu'une le dit. Sans cette
    -- phrase, le gain serait juste et le détail laisserait croire qu'il porte sur tout le trajet —
    -- une exactitude qui trompe est pire qu'une approximation annoncée.
    if t.poste = 'commute'
       and t.operation in ('substitute', 'share_vehicle')
       and coalesce(r.commute_second_leg_co2_kg_year, 0) > 0
       and v_commute_mode_label is not null then
      v_detail := coalesce(v_detail || ' ', '')
        || format('Sur la partie en %s de ton trajet.',
                  lower(regexp_replace(v_commute_mode_label, '[()]', '', 'g')));
    end if;

    v_rows := v_rows || row(t.id, t.poste, t.action_text, v_detail, round(v_saving))::public.action_saving;
  end loop;

  return query select * from unnest(v_rows) order by saving_kg_year desc;
end;
$function$;

do $$
declare
  v_corps text := pg_get_functiondef('public.estimate_action_savings(uuid)'::regprocedure);
begin
  if position('v_base_co2 := (t.trips / a.commute_days_per_week) * v_commute_total_co2' in v_corps) = 0 then
    raise exception 'remove_day ne porte pas sur les deux jambes : le gain du télétravail reste sous-estimé.';
  end if;
  if position('elsif t.operation = ''remove_trip'' then' in v_corps) = 0 then
    raise exception 'remove_trip n''a pas sa branche : il retombe sur celle de substitute, donc sur la seule jambe principale.';
  end if;
  -- Le garde inverse, qui est le vrai risque : une « simplification » qui ferait porter la
  -- substitution sur le trajet entier surestimerait tous les gains de mode.
  if position('v_base_co2 := t.share * r.commute_main_leg_co2_kg_year;' in v_corps) = 0 then
    raise exception 'La substitution ne porte plus sur la seule jambe principale : les gains de mode sont surestimés.';
  end if;
end;
$$;
