-- TraceVerte V1 — étape 6a de l'audit v1-07 : chiffrer les actions du plan.
-- Réf. docs/architecture/v1-07-audit-facteurs-et-suivi.md §3.3 (T9, T10).
--
-- Le plan de réduction était décoratif. `action_templates` ne portait que du texte générique
-- par catégorie de mode (« Remplacer un trajet sur deux par un mode plus léger »), le cap
-- −20 % stocké dans `plan_cycles.target_reduction_pct` n'était lu par aucun écran (T10), et
-- les trois questions du contexte B4 (`zone_type`, `tc_access`, `household_vehicles`) étaient
-- collectées puis jamais utilisées (T9) — alors que la spec §5 les justifie explicitement par
-- « éviter de traiter un profil rural sans alternative comme un mauvais élève ».
--
-- ## Pourquoi chiffrer change la nature du conseil, et pas seulement sa présentation
--
-- Aux facteurs ADEME réels, **le bus thermique urbain (0,1135 kg/km par passager) émet un peu
-- plus que la voiture thermique conduite seul (0,1106)**. Conseiller « prends les transports en
-- commun » à un automobiliste, sans regarder lequel, peut donc ne rien gagner voire coûter. Alors
-- que le métro ou le tram (0,0040) divisent par 27. Un texte générique ne fait pas cette
-- différence ; une soustraction, si. C'est la raison de fond de cette migration, pas le confort
-- d'affichage : **aucune action dont le gain calculé n'est pas franchement positif n'est
-- proposée**, et aucun template ne propose le bus en substitution.
--
-- Relevé le 04/09/2026 sur `impactco2.fr/api/v1/transport?km=10&displayAll=1`. Au passage, la
-- même vérification confirme le modèle de covoiturage du bilan : l'API publie « Covoiturage
-- thermique (2 personnes) » à 0,0553, exactement la moitié de « Voiture thermique » (0,1106,
-- conducteur seul). La division par `commute_carpool_size` de `recompute_assessment_results`
-- reproduit donc les valeurs publiées, elle ne les approxime pas.
--
-- ## Architecture
--
-- 1. `assessment_results` gagne un instantané des kilomètres et des CO2 par segment. Le calcul
--    des km ne vit qu'à un seul endroit (`recompute_assessment_results`) ; l'estimateur les lit
--    plutôt que de les recalculer, sinon les deux dérivent à la première évolution du barème.
-- 2. `action_templates` cesse d'être une phrase et devient une **opération** : substituer un
--    mode sur une part du poste, partager le véhicule, supprimer un trajet, ou supprimer un
--    jour de déplacement. Le texte reste, mais il ne porte plus le calcul.
-- 3. `estimate_action_savings(assessment_id)` applique ces opérations à un bilan donné et rend
--    les gains en kg/an, contexte B4 compris.
-- 4. `generate_plan_cycle_for_user` fige les deux meilleurs gains sur `plan_actions`, comme
--    `assessment_results` fige le bilan : un chiffre affiché ne doit pas changer sous les yeux
--    de la personne au gré d'une mise à jour ADEME.

-- ── 1. Instantané des km et CO2 par segment ────────────────────────────────────────────
-- Sans ces colonnes, l'estimateur devrait refaire le calcul kilométrique du bilan — deux
-- implémentations du même barème, qui divergeraient au premier changement.

alter table public.assessment_results
  add column if not exists commute_main_leg_km_year numeric,
  add column if not exists commute_main_leg_co2_kg_year numeric,
  add column if not exists leisure_km_year numeric,
  add column if not exists travel_flight_short_co2_kg_year numeric,
  add column if not exists travel_flight_long_co2_kg_year numeric,
  add column if not exists travel_train_co2_kg_year numeric,
  add column if not exists travel_car_co2_kg_year numeric,
  -- Profil structurellement captif : pas d'alternative crédible à la voiture là où la personne
  -- habite. Sert à filtrer les actions (§3.3) *et* à retirer la comparaison à la moyenne
  -- française sur la restitution (§3.5) — on ne reproche pas à quelqu'un une contrainte
  -- géographique qu'il ne choisit pas.
  add column if not exists mobility_constrained boolean;

comment on column public.assessment_results.commute_main_leg_km_year is
  'Kilomètres annuels de la jambe principale du trajet domicile-travail. Avec commute_main_leg_co2_kg_year, donne le facteur effectif (covoiturage inclus) dont l''estimateur d''actions a besoin.';
comment on column public.assessment_results.mobility_constrained is
  'Vrai quand le contexte B4 ne laisse pas d''alternative crédible à la voiture (cf. §3.5 de v1-07). Ne jamais s''en servir pour restreindre ce que la personne voit : uniquement pour ne pas lui proposer l''impossible ni la comparer à une moyenne qui ne la concerne pas.';

-- ── 2. Les actions deviennent des opérations ───────────────────────────────────────────

alter table public.action_templates
  -- Poste et segment visés. `segment` vaut 'main_leg' pour les postes continus (domicile-travail,
  -- loisirs) et nomme la portion pour les voyages, dont le CO2 est un mélange de quatre origines.
  add column if not exists poste text,
  add column if not exists segment text,
  add column if not exists operation text,
  -- Mode de remplacement pour operation = 'substitute'.
  add column if not exists substitute_mode_id text references public.transport_modes(id),
  -- Part du poste concernée, pour les postes continus. Ex. 0.20 = « un trajet sur cinq ».
  add column if not exists share numeric,
  -- Nombre de trajets concernés, pour les voyages longue distance, qui se comptent en unités.
  add column if not exists trips numeric,
  -- Garde-fous de plausibilité : ne pas proposer le vélo sur 60 km, ni les transports en commun
  -- à quelqu'un qui a répondu qu'il n'y en a pas.
  add column if not exists max_distance_km numeric,
  add column if not exists requires_tc boolean not null default false,
  add column if not exists requires_car boolean not null default false,
  add column if not exists detail_kind text;

alter table public.action_templates
  drop constraint if exists action_templates_poste_check,
  drop constraint if exists action_templates_segment_check,
  drop constraint if exists action_templates_operation_check,
  drop constraint if exists action_templates_detail_kind_check;

alter table public.action_templates
  add constraint action_templates_poste_check
    check (poste is null or poste in ('commute', 'leisure', 'travel')),
  add constraint action_templates_segment_check
    check (segment is null or segment in ('main_leg', 'flight_short', 'flight_long', 'train', 'car')),
  add constraint action_templates_operation_check
    check (operation is null or operation in ('substitute', 'share_vehicle', 'remove_trip', 'remove_day')),
  add constraint action_templates_detail_kind_check
    check (detail_kind is null or detail_kind in ('commute_days', 'commute_distance', 'leisure_frequency', 'flights_short', 'flights_long', 'car_long_trips'));

-- `transport_mode_category` devient inutile : le ciblage passe désormais par poste + segment,
-- et la pertinence par le gain calculé. On la garde nullable le temps de la reprise de données
-- juste en dessous, puis on la supprime.

-- ── 3. Nouveau jeu d'actions ───────────────────────────────────────────────────────────
-- Les anciennes lignes n'ont pas d'équivalent structuré (elles ne disaient pas sur quelle part
-- de quel poste elles portaient) : on repart d'un jeu neuf. Les plan_actions existantes sont
-- reconstruites en fin de migration.

delete from public.plan_actions;
delete from public.action_templates;

alter table public.action_templates
  alter column transport_mode_category drop not null;

insert into public.action_templates
  (transport_mode_category, action_text, poste, segment, operation,
   substitute_mode_id, share, trips, max_distance_km, requires_tc, requires_car, detail_kind)
values
  -- ── Domicile-travail ────────────────────────────────────────────────────────────────
  (null, 'Faire un trajet sur cinq à vélo',
   'commute', 'main_leg', 'substitute', 'velo', 0.20, null, 10, false, false, 'commute_distance'),
  (null, 'Faire un trajet sur cinq à pied',
   'commute', 'main_leg', 'substitute', 'marche', 0.20, null, 3, false, false, 'commute_distance'),
  (null, 'Passer deux trajets sur cinq en métro ou en tram',
   'commute', 'main_leg', 'substitute', 'metro_tram', 0.40, null, null, true, false, 'commute_days'),
  (null, 'Passer deux trajets sur cinq en train ou en RER',
   'commute', 'main_leg', 'substitute', 'train', 0.40, null, null, true, false, 'commute_days'),
  (null, 'Faire ce trajet à deux au moins un jour sur deux',
   'commute', 'main_leg', 'share_vehicle', null, 0.50, null, null, false, true, 'commute_days'),
  (null, 'Garder une journée de télétravail par semaine',
   'commute', 'main_leg', 'remove_day', null, null, 1, null, false, false, 'commute_days'),

  -- ── Loisirs du week-end ─────────────────────────────────────────────────────────────
  (null, 'Faire une sortie sur trois à vélo',
   'leisure', 'main_leg', 'substitute', 'velo', 0.33, null, 15, false, false, 'leisure_frequency'),
  (null, 'Prendre les transports en commun pour deux sorties sur cinq',
   'leisure', 'main_leg', 'substitute', 'metro_tram', 0.40, null, null, true, false, 'leisure_frequency'),
  (null, 'Regrouper deux sorties en une seule, une fois sur cinq',
   'leisure', 'main_leg', 'remove_trip', null, 0.20, null, null, false, false, 'leisure_frequency'),

  -- ── Voyages longue distance ─────────────────────────────────────────────────────────
  -- Court/moyen-courrier : le train est une alternative réelle, on substitue.
  (null, 'Remplacer un aller-retour en avion par le train',
   'travel', 'flight_short', 'substitute', 'train_longue_distance', null, 1, null, false, false, 'flights_short'),
  -- Long-courrier : personne ne prend le train pour 9 000 km. La seule action honnête est de
  -- renoncer à un vol, et c'est de loin la plus lourde du produit — d'où sa formulation, qui
  -- décrit un choix et n'ordonne rien.
  (null, 'Renoncer à un vol long-courrier cette année',
   'travel', 'flight_long', 'remove_trip', null, null, 1, null, false, false, 'flights_long'),
  (null, 'Faire un de tes longs trajets en train plutôt qu''en voiture',
   'travel', 'car', 'substitute', 'train_longue_distance', null, 1, null, false, false, 'car_long_trips');

-- ── 4. Le plan porte le chiffre ────────────────────────────────────────────────────────
-- Figé à la génération, comme assessment_results fige le bilan : une action affichée à
-- « −180 kg » ne doit pas devenir « −165 kg » parce que la synchronisation ADEME est passée.

alter table public.plan_actions
  add column if not exists saving_kg_year numeric,
  add column if not exists saving_share_percent numeric,
  add column if not exists detail_text text,
  add column if not exists rank smallint;

comment on column public.plan_actions.saving_kg_year is
  'Gain estimé, figé à la génération du cycle. Estimation déclarative fondée sur des moyennes ADEME, jamais une mesure : c''est ce que la formulation à l''écran doit refléter.';

-- ── 5. Le calcul du bilan alimente l'instantané ────────────────────────────────────────
-- Corps identique à la version de la migration 20260904140000, à l'exception des variables
-- retenues pour l'instantané et du drapeau de contexte. Recréée en entier plutôt que patchée :
-- une fonction de calcul dont on ne lit qu'un diff partiel est une fonction qu'on relit mal.

create or replace function public.recompute_assessment_results(p_assessment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
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

  v_commute_distance numeric;
  v_commute_km_year numeric := 0;
  v_commute_co2 numeric := 0;
  v_commute_label text;
  v_commute_mode_resolved text;
  v_commute_second_mode_resolved text;
  v_commute_main_leg_km numeric := 0;
  v_commute_main_leg_co2 numeric := 0;
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

    v_commute_mode_resolved := public.resolve_car_mode(a.commute_mode, a.commute_car_engine);
    v_commute_second_mode_resolved := public.resolve_car_mode(a.commute_second_mode, a.commute_car_engine);

    if a.commute_second_mode_used and a.commute_second_mode is not null then
      v_commute_main_leg_km := v_commute_km_year / 2;
      v_commute_second_leg_co2 := (v_commute_km_year / 2) * public.emission_factor(v_commute_second_mode_resolved, v_factor_date);
    else
      v_commute_main_leg_km := v_commute_km_year;
    end if;

    v_commute_main_leg_co2 := v_commute_main_leg_km * public.emission_factor(v_commute_mode_resolved, v_factor_date);

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

  v_leisure_mode_resolved := public.resolve_car_mode(v_leisure_mode, a.leisure_car_engine);

  v_leisure_km_year := v_leisure_distance * 2 * v_leisure_freq * weeks_per_year_standard;
  v_leisure_co2 := v_leisure_km_year * public.emission_factor(v_leisure_mode_resolved, v_factor_date);

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
  v_extras_label := case when v_extras_is_leisure
    then 'Loisirs du week-end (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
    else 'Voyages longue distance (' || coalesce(regexp_replace(v_mode_label, '[()]', '', 'g'), '') || ')'
  end;

  -- Contexte B4 (T9). « Limité » ne suffit pas seul : en périurbain, une desserte limitée reste
  -- une desserte. C'est la conjonction rural + limité, ou l'absence pure et simple, qui décrit
  -- quelqu'un pour qui la voiture n'est pas un choix.
  v_mobility_constrained :=
    a.tc_access = 'inexistant'
    or (a.zone_type = 'rural' and a.tc_access = 'limite');

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
    commute_poste_label, extras_poste_co2_kg_year, extras_poste_label,
    commute_main_leg_km_year, commute_main_leg_co2_kg_year, leisure_km_year,
    travel_flight_short_co2_kg_year, travel_flight_long_co2_kg_year,
    travel_train_co2_kg_year, travel_car_co2_kg_year, mobility_constrained,
    computed_at
  )
  values (
    p_assessment_id, v_total, v_commute_co2, v_leisure_co2, v_travel_co2,
    v_dominant, v_dominant_co2, v_dominant_mode, v_dominant_label,
    v_commute_label, v_extras_co2, v_extras_label,
    v_commute_main_leg_km, v_commute_main_leg_co2, v_leisure_km_year,
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
    extras_poste_co2_kg_year = excluded.extras_poste_co2_kg_year,
    extras_poste_label = excluded.extras_poste_label,
    commute_main_leg_km_year = excluded.commute_main_leg_km_year,
    commute_main_leg_co2_kg_year = excluded.commute_main_leg_co2_kg_year,
    leisure_km_year = excluded.leisure_km_year,
    travel_flight_short_co2_kg_year = excluded.travel_flight_short_co2_kg_year,
    travel_flight_long_co2_kg_year = excluded.travel_flight_long_co2_kg_year,
    travel_train_co2_kg_year = excluded.travel_train_co2_kg_year,
    travel_car_co2_kg_year = excluded.travel_car_co2_kg_year,
    mobility_constrained = excluded.mobility_constrained,
    computed_at = excluded.computed_at;

  perform public.generate_plan_cycle_for_user(v_owner_id);
end;
$$;
