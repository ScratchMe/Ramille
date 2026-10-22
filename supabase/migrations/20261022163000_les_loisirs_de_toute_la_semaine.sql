-- Les loisirs de toute la semaine, et une cinquième fréquence : « Presque tous les jours » (étape 3 de
-- `docs/architecture/v1-35-l-audit-en-chantiers.md`, décidé le 22/10/2026 par la personne qui pilote).
--
-- **Le défaut.** La seconde partie du questionnaire devait couvrir les loisirs de la semaine et du
-- week-end, ensemble. Elle demandait « À quelle fréquence fais-tu des trajets loisirs le week-end ? »,
-- et le poste s'appelait « Loisirs du week-end » partout, jusque dans les libellés que le calcul fige.
-- Qui va au sport en semaine ne savait pas s'il devait le compter. Et l'échelle s'arrêtait à
-- « Plusieurs fois par semaine », comptée 3 : une sortie chaque soir était sous-comptée.
--
-- **La décision : une seule étape**, des libellés qui disent « en semaine comme le week-end », et
-- une cinquième réponse, `almost_daily`, **5 sorties par semaine** sur 52 semaines. Deux étapes
-- (semaine, week-end) auraient été plus précises, mais plus longues, et un trajet du vendredi soir ne
-- se range ni d'un côté ni de l'autre.
--
-- **Ce que cette migration change.**
--   1. La contrainte admet `almost_daily`.
--   2. Le calcul lui donne sa constante et sa branche, et nomme le poste « Loisirs » dans les trois
--      libellés qu'il fige : « Loisirs », « Loisirs (<mode>) », « Loisirs (occasionnels) ».
--   3. La question du mois (`generate_extras_checkins`) nomme le poste « Loisirs » quand elle porte
--      sur les sorties sans que ce soit le poste du bilan.
--   4. La forme insérable (`poste_inserable`, la jumelle de `FORME_INSERABLE` dans
--      `src/constants/postes.ts`) devient « tes sorties ».
--
-- **Ce qui ne change pas, et pourquoi.** Les lignes déjà en base gardent « Loisirs du week-end » :
-- `assessment_results` est figé, et la question d'un point l'est à sa génération (`BOUCLE.md`). Le
-- client lit le marqueur « (occasionnels) », qui reste dans les deux formes. Comme pour la quatrième
-- fréquence (`20261002201852`), tout le reste du schéma ne distingue que « rarement » du reste : la
-- nouvelle réponse se comporte en sortie déclarée (mode et distance demandés, boucle mensuelle,
-- actions de loisirs au plan). Aucune signature ne bouge : ni `database.types.ts` (la colonne y est un
-- `string`), ni les privilèges (`create or replace` les garde, et le contrôle final le vérifie).

-- ---------------------------------------------------------------------------------------------
-- 1. La réponse admise
-- ---------------------------------------------------------------------------------------------

alter table public.assessment_answers
  drop constraint if exists assessment_answers_leisure_frequency_check;
alter table public.assessment_answers
  add constraint assessment_answers_leisure_frequency_check
  check (leisure_frequency in ('rarely', 'multiple_monthly', 'weekly', 'multiple_weekly', 'almost_daily'));

-- ---------------------------------------------------------------------------------------------
-- 2. Le calcul : sa constante, sa branche, et le nom du poste
-- ---------------------------------------------------------------------------------------------
-- Réécrit en entier, et non par substitution : `scripts/verifier-hypotheses-calcul.mjs` lit les
-- constantes dans la **dernière migration qui le réécrit en entier**, et une constante ajoutée par
-- substitution lui resterait invisible. Le corps est `pg_get_functiondef` de la stack locale, dont
-- l'empreinte normalisée (commentaires retirés, blancs réduits) a été comparée le 22/10/2026 à celle
-- de la production : identiques, `bb71293bb08ca8d9eb356ce52885243f` (`SUPABASE.md` §2.3). Il porte
-- donc aussi les substitutions venues après `20261002201852`. Changent : la constante, la branche, et
-- trois libellés.
--
-- **Ne rejouer après elle aucune migration qui réécrit ce calcul** : la cinquième fréquence y
-- perdrait sa branche.

CREATE OR REPLACE FUNCTION public.recompute_assessment_results(p_assessment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  a public.assessment_answers%rowtype;
  v_owner_id uuid;
  v_factor_date date;

  weeks_per_year_commute constant numeric := 45;
  weeks_per_year_standard constant numeric := 52;
  leisure_freq_rarely constant numeric := 0.25;
  -- « Deux ou trois fois par mois » (`v1-33` D5) : 31 sorties par an sur 52 semaines, 2,6 par mois.
  leisure_freq_multiple_monthly constant numeric := 0.6;
  leisure_freq_weekly constant numeric := 1;
  leisure_freq_multiple constant numeric := 3;
  -- « Presque tous les jours » (22/10/2026, étape 3 de `v1-35`) : 5 sorties par semaine sur 52. Les
  -- loisirs comptent la semaine et le week-end ensemble, et « plusieurs fois par semaine » (3)
  -- sous-comptait qui sort chaque soir.
  leisure_freq_almost_daily constant numeric := 5;
  leisure_default_distance constant numeric := 15;
  leisure_default_mode constant text := 'voiture';
  dist_flight_short constant numeric := 1500;
  dist_flight_long constant numeric := 9000;
  dist_train_long constant numeric := 800;
  dist_car_long constant numeric := 700;
  -- C4.4 : la même que la voiture, et pour la raison qui décide des deux autres — aucune des
  -- trois n'est mesurée, ce sont des longueurs de référence. L'autocar est choisi contre la
  -- voiture, sur les mêmes corridors routiers ; lui donner celle du train ferait de la longueur
  -- du trajet une hypothèse de plus là où elle peut en être une de moins.
  dist_coach_long constant numeric := 700;
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
  v_travel_autocar numeric := 0;
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

    -- C4.4 : le type de train et le type de vélo suivent le poste, pas la jambe — une seule
    -- réponse pour les deux, exactement comme la motorisation depuis C3.4.
    v_commute_mode_resolved := public.resolve_mode(
      a.commute_mode, a.commute_car_engine, a.commute_two_wheeler_type,
      a.commute_train_type, a.commute_velo_type);
    v_commute_second_mode_resolved := public.resolve_mode(
      a.commute_second_mode, a.commute_car_engine, a.commute_two_wheeler_type,
      a.commute_train_type, a.commute_velo_type);

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
    when 'multiple_monthly' then leisure_freq_multiple_monthly
    when 'weekly' then leisure_freq_weekly
    when 'multiple_weekly' then leisure_freq_multiple
    when 'almost_daily' then leisure_freq_almost_daily
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

  -- C4.4 : le résiduel « rarement » vaut `train`, donc le type de train le trouverait s'il
  -- survivait. Il ne survit pas — `normaliserReponses` l'efface avec le mode, comme le
  -- covoiturage et à l'inverse de la motorisation : un type de train décrit un TRAJET qu'on ne
  -- déclare plus, là où une motorisation décrit le véhicule qu'on possède encore. C'est ce qui
  -- garantit qu'un bilan « rarement » resoumis à l'identique rend le même total qu'avant.
  v_leisure_mode_resolved := public.resolve_mode(
    v_leisure_mode, a.leisure_car_engine, a.leisure_two_wheeler_type,
    a.leisure_train_type, a.leisure_velo_type);

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

  -- C4.4 : l'appel direct à `resolve_car_mode` rentre au point unique. Les trois arguments nuls
  -- disent ce que B3.4 ne demande pas — ni deux-roues, ni type de train, ni type de vélo.
  v_travel_voiture_mode := public.resolve_mode('voiture', a.car_long_trips_engine, null, null, null);
  v_travel_voiture := a.car_long_trips_per_year * dist_car_long
    * public.emission_factor(v_travel_voiture_mode, v_factor_date);
  -- C3.5 : partir à trois divise l'empreinte du trajet par trois. Repli à 1 — seul —, c'est-à-dire
  -- ce que le calcul supposait sans le dire.
  v_travel_voiture := v_travel_voiture / coalesce(a.car_long_trips_occupancy, 1);

  -- C4.4 : pas de division par une occupation, à l'inverse de la voiture — la personne ne choisit pas le
  -- remplissage d'un autocar : ce n'est pas son véhicule, et l'occupation n'est pas une réponse
  -- qu'elle pourrait donner. C'est la seule raison, et elle suffit — ce commentaire a d'abord dit
  -- « son facteur ADEME est déjà par voyageur », ce qui est vrai de **tous** les facteurs du
  -- référentiel, voiture comprise, donc ne distinguait rien.
  v_travel_autocar := coalesce(a.coach_long_trips_per_year, 0) * dist_coach_long
    * public.emission_factor('autocar', v_factor_date);

  v_travel_co2 := v_travel_avion_court + v_travel_avion_long + v_travel_train + v_travel_voiture
    + v_travel_autocar;
  v_travel_mode := (
    select mode from (values
      ('avion_court_moyen_courrier', v_travel_avion_court),
      ('avion_long_courrier', v_travel_avion_long),
      ('train_longue_distance', v_travel_train),
      (v_travel_voiture_mode, v_travel_voiture),
      ('autocar', v_travel_autocar)
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
      then 'Loisirs (occasionnels)'
    when v_extras_is_leisure
      then 'Loisirs (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
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
      when public.a_des_voyages_declares(a) then 'travel'
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
    when 'leisure' then 'Loisirs'
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
    travel_train_co2_kg_year, travel_car_co2_kg_year, travel_coach_co2_kg_year, mobility_constrained,
    computed_at
  )
  values (
    p_assessment_id, v_total, v_commute_co2, v_leisure_co2, v_travel_co2,
    v_dominant, v_dominant_co2, v_dominant_mode, v_dominant_label,
    v_commute_label, v_commute_mode_resolved, v_extras_co2, v_extras_label, case when v_extras_is_leisure then 'leisure' else 'travel' end,
    v_commute_main_leg_km, v_commute_main_leg_co2,
    v_commute_second_leg_km, v_commute_second_leg_co2, v_leisure_km_year,
    v_commute_distance, v_leisure_distance,
    v_travel_avion_court, v_travel_avion_long, v_travel_train, v_travel_voiture, v_travel_autocar,
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
    travel_coach_co2_kg_year = excluded.travel_coach_co2_kg_year,
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

-- ---------------------------------------------------------------------------------------------
-- 3. La question du mois et la forme insérable : deux substitutions vérifiées
-- ---------------------------------------------------------------------------------------------
-- Chaque ancre tient sur une ligne : le corps installé en production est en fins de ligne CRLF
-- (relevé le 22/10/2026), et une ancre qui en traverse une n'y serait pas trouvée. Chaque
-- remplacement se reconnaît à sa présence, pour qu'un rejeu ne lève pas (`SUPABASE.md` §2.3). Les
-- empreintes des deux corps avant substitution étaient identiques en local et en production le
-- 22/10/2026 : `generate_extras_checkins` 39f785bd7f5b19169bd4bb83d9642216, `poste_inserable`
-- 9ee6be24c34510f31aace096aa5b5077.

do $la_question_du_mois$
declare
  src text := pg_get_functiondef('public.generate_extras_checkins()'::regprocedure);
  ancre constant text := 'when p.poste = ''leisure'' then ''Loisirs du week-end''';
  remplacement constant text := 'when p.poste = ''leisure'' then ''Loisirs''';
  n int;
begin
  if position(remplacement in src) > 0 then
    return;
  end if;
  n := (length(src) - length(replace(src, ancre, ''))) / length(ancre);
  if n <> 1 then
    raise exception 'generate_extras_checkins a été réécrite autrement : % ancre(s) trouvée(s), une attendue.', n;
  end if;
  execute replace(src, ancre, remplacement);
end
$la_question_du_mois$;

do $la_forme_inserable$
declare
  src text := pg_get_functiondef('public.poste_inserable(text, text)'::regprocedure);
  ancre constant text := 'when ''leisure'' then ''tes sorties du week-end''';
  remplacement constant text := 'when ''leisure'' then ''tes sorties''';
  n int;
begin
  if position(remplacement in src) > 0 then
    return;
  end if;
  n := (length(src) - length(replace(src, ancre, ''))) / length(ancre);
  if n <> 1 then
    raise exception 'poste_inserable a été réécrite autrement : % ancre(s) trouvée(s), une attendue.', n;
  end if;
  execute replace(src, ancre, remplacement);
end
$la_forme_inserable$;

-- ---------------------------------------------------------------------------------------------
-- 4. Contrôle
-- ---------------------------------------------------------------------------------------------
-- Lu sur les corps installés sans leurs commentaires : le distant peut les retirer, et un
-- commentaire citant une branche ou un libellé ferait sinon passer le contrôle.

do $controle$
declare
  v_contrainte text;
  v_calcul text := regexp_replace(
    pg_get_functiondef('public.recompute_assessment_results(uuid)'::regprocedure),
    '--[^' || chr(10) || ']*', '', 'g');
  v_valeur text;
  v_nombre int := 0;
  f text;
begin
  select pg_get_constraintdef(oid) into v_contrainte
    from pg_constraint
   where conrelid = 'public.assessment_answers'::regclass
     and conname = 'assessment_answers_leisure_frequency_check';
  if v_contrainte is null then
    raise exception 'CONTROLE: la contrainte des fréquences a disparu au lieu d''être remplacée';
  end if;

  -- Chaque fréquence admise a sa branche : le `case` du calcul n'a pas de `else`, et une valeur sans
  -- branche rendrait un total NULL que la colonne refuse.
  for v_valeur in select (regexp_matches(v_contrainte, '''([a-z_]+)''', 'g'))[1] loop
    v_nombre := v_nombre + 1;
    if position('when ''' || v_valeur || ''' then leisure_freq_' in v_calcul) = 0 then
      raise exception 'CONTROLE: la fréquence % est admise mais le calcul ne lui donne aucune branche', v_valeur;
    end if;
  end loop;
  if v_nombre <> 5 then
    raise exception 'CONTROLE: % fréquences lues dans la contrainte, cinq attendues (%)', v_nombre, v_contrainte;
  end if;
  if position('leisure_freq_almost_daily constant numeric := 5;' in v_calcul) = 0 then
    raise exception 'CONTROLE: « presque tous les jours » ne vaut pas 5 sorties par semaine';
  end if;

  -- Plus aucun « week-end » dans ce que ces trois fonctions écrivent.
  if position('week-end' in v_calcul) > 0
     or position('week-end' in regexp_replace(
          pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
          '--[^' || chr(10) || ']*', '', 'g')) > 0
     or position('week-end' in regexp_replace(
          pg_get_functiondef('public.poste_inserable(text, text)'::regprocedure),
          '--[^' || chr(10) || ']*', '', 'g')) > 0 then
    raise exception 'CONTROLE: un libellé dit encore « week-end »';
  end if;
  if public.poste_inserable('leisure', null) <> 'tes sorties' then
    raise exception 'CONTROLE: la forme insérable des loisirs n''est pas « tes sorties »';
  end if;

  -- Les trois restent fermées aux clients.
  foreach f in array array['public.recompute_assessment_results(uuid)', 'public.generate_extras_checkins()',
                           'public.poste_inserable(text, text)'] loop
    if has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute') then
      raise exception 'CONTROLE: % est appelable par un client', f;
    end if;
  end loop;
end
$controle$;
