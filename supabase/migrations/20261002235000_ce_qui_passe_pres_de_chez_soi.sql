-- Ce qui passe près de chez soi : la zone ne décide plus du métro et du tram, et le RER devient
-- proposable — `docs/architecture/v1-34-ce-qui-passe-pres-de-chez-soi.md`, décidé le 02/10/2026.
--
-- ## Pourquoi
--
-- Le plan décidait quels transports en commun étaient plausibles à partir d'un classement (la zone,
-- `urbain_dense` seule ouvrant le métro et le tram) et d'un jugement (l'accès « bon, limité,
-- inexistant »), jamais à partir de ce qui passe près de chez la personne. Une ville moyenne
-- desservie par un tram perdait le tram ; une banlieue sans métro se voyait proposer le métro ; et le
-- RER n'était jamais proposé, le train étant chiffré au tarif du TER (`v1-27` §12.16).
--
-- ## Ce que fait cette migration
--
-- 1. **`assessment_answers.transports_proches`**, la réponse à « Près de chez toi, qu'est-ce que tu
--    pourrais prendre ? » : `metro_tram`, `rer`, `train`, `bus`, ou `aucun` seul. Elle **remplace**
--    la question de l'accès dans le questionnaire (D1).
-- 2. **L'accès se déduit de la réponse** (D5), par un déclencheur, et n'est plus demandé : « rien »
--    → `inexistant` ; bus ou train sans métro, tram ni RER → `limite` ; métro, tram ou RER → `bon`.
--    La moyenne française (`mobility_constrained`), la phrase du plan et les cinq vues de la mesure
--    continuent de lire `tc_access` sans rien changer. Le même déclencheur range la réponse dans
--    l'ordre des puces et en retire les doublons : deux réponses égales s'écrivent pareil, ce que la
--    comparaison de `mettre_a_jour_le_contexte` exige.
-- 3. **Les gabarits disent ce qu'il leur faut** : `transports_requis` (au moins un de ceux-là est
--    coché) et `transports_exclus` (aucun de ceux-là ne l'est). Les trois actions de transport en
--    commun perdent leur condition de zone. Deux gabarits naissent, le RER pour le trajet et pour les
--    sorties ; le premier prend la place du train quand le RER est coché (D3).
-- 4. **`estimate_action_savings`** lit ces deux colonnes — réécrite depuis son corps installé
--    (`pg_get_functiondef`), dont l'empreinte normalisée a été comparée à celle du distant.
-- 5. **`mettre_a_jour_le_contexte`** prend la réponse au lieu de l'accès.
--
-- **Une condition qu'on ne peut pas évaluer n'est pas remplie** (`PLAN.md` §1) : un bilan sans la
-- réponse ne reçoit plus d'action de transport en commun. Décision D4 : les bilans d'avant la
-- question sont des bilans de test, donc pas de règle de transition.

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 1. La réponse
-- ─────────────────────────────────────────────────────────────────────────────────────────────

alter table public.assessment_answers add column if not exists transports_proches text[];

alter table public.assessment_answers drop constraint if exists assessment_answers_transports_proches_check;
alter table public.assessment_answers
  add constraint assessment_answers_transports_proches_check
  check (transports_proches <@ array['metro_tram', 'rer', 'train', 'bus', 'aucun']::text[]);

-- Au moins une réponse, et « rien de tout ça » seul : la puce exclut les autres à l'écran, la base
-- le refuse aussi.
alter table public.assessment_answers drop constraint if exists assessment_answers_transports_proches_coherent;
alter table public.assessment_answers
  add constraint assessment_answers_transports_proches_coherent
  check (
    cardinality(transports_proches) >= 1
    and (not ('aucun' = any (transports_proches)) or cardinality(transports_proches) = 1)
  );

comment on column public.assessment_answers.transports_proches is
  'Ce qui passe près de chez la personne, assez souvent pour s''en servir (v1-34) : metro_tram, rer, train, bus, ou aucun seul. Décide des actions de transport en commun du plan ; tc_access s''en déduit (déclencheur assessment_answers_deduit_l_acces). Nul sur un bilan d''avant la question.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 2. La forme rangée, et l'accès qui s'en déduit
-- ─────────────────────────────────────────────────────────────────────────────────────────────

-- L'ordre des puces, sans doublon. Jumelle de `transportsRanges` (`src/types/contexte.ts`).
create or replace function public.transports_ranges(p_transports text[])
returns text[]
language sql
immutable
set search_path = public
as $$
  select case when p_transports is null then null else array(
    select t
    from (select distinct unnest(p_transports) as t) d
    order by array_position(array['metro_tram', 'rer', 'train', 'bus', 'aucun']::text[], t)
  ) end;
$$;

revoke execute on function public.transports_ranges(text[]) from public, anon, authenticated;

-- L'accès d'avant la question, déduit de la réponse (D5). La règle de la moyenne française ne change
-- pas — inexistant, ou rural et limité : une personne en zone rurale qui n'a que le bus ou le train
-- reste comptée comme contrainte, comme avec « limité » avant.
create or replace function public.acces_deduit(p_transports text[])
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_transports is null then null
    when 'aucun' = any (p_transports) then 'inexistant'
    when p_transports && array['metro_tram', 'rer']::text[] then 'bon'
    else 'limite'
  end;
$$;

revoke execute on function public.acces_deduit(text[]) from public, anon, authenticated;

-- `security definer` : le déclencheur tourne sous le rôle qui écrit la ligne — `authenticated` à la
-- soumission —, qui n'a pas le droit d'exécuter les deux fonctions ci-dessus.
create or replace function public.deduire_l_acces()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.transports_proches is not null then
    new.transports_proches := public.transports_ranges(new.transports_proches);
    new.tc_access := public.acces_deduit(new.transports_proches);
  end if;
  return new;
end;
$$;

revoke execute on function public.deduire_l_acces() from public, anon, authenticated;

drop trigger if exists assessment_answers_deduit_l_acces on public.assessment_answers;
create trigger assessment_answers_deduit_l_acces
  before insert or update on public.assessment_answers
  for each row execute function public.deduire_l_acces();

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 3. Les gabarits
-- ─────────────────────────────────────────────────────────────────────────────────────────────

alter table public.action_templates add column if not exists transports_requis text[];
alter table public.action_templates add column if not exists transports_exclus text[];

-- Comme `zones_admissibles` : `null` vaut « pas de condition », et un tableau vide n'est pas un
-- tableau absent — `&& '{}'` est faux pour toute réponse, donc il écarterait tout le monde.
alter table public.action_templates drop constraint if exists action_templates_transports_requis_check;
alter table public.action_templates
  add constraint action_templates_transports_requis_check
  check (
    transports_requis <@ array['metro_tram', 'rer', 'train', 'bus']::text[]
    and cardinality(transports_requis) >= 1
  );
alter table public.action_templates drop constraint if exists action_templates_transports_exclus_check;
alter table public.action_templates
  add constraint action_templates_transports_exclus_check
  check (
    transports_exclus <@ array['metro_tram', 'rer', 'train', 'bus']::text[]
    and cardinality(transports_exclus) >= 1
  );

comment on column public.action_templates.transports_requis is
  'Ce qui doit passer près de chez la personne pour que l''action se propose : au moins un de ces transports coché (v1-34). Nul : pas de condition.';
comment on column public.action_templates.transports_exclus is
  'Ce qui écarte l''action quand c''est coché (v1-34) : le RER prend la place du train, le métro ou le tram celle des sorties en RER. Nul : pas d''exclusion.';

-- Désignés par leur libellé, la clé naturelle du référentiel (`SUPABASE.md` §2.3).
update public.action_templates
set zones_admissibles = null, transports_requis = array['metro_tram']
where action_text in (
  'Passer deux trajets sur cinq en métro ou en tram',
  'Prendre les transports en commun pour deux sorties sur cinq'
);

update public.action_templates
set transports_requis = array['train'], transports_exclus = array['rer']
where action_text = 'Passer deux trajets sur cinq en train';

-- Les deux gabarits du RER, calqués sur leurs jumeaux du train et des sorties. La question du point
-- et le mot de la veille sont figés à la génération : un Francilien qui s'engage à prendre le RER
-- s'entend demander s'il a pris le RER (D3).
insert into public.action_templates (
  action_text, poste, segment, operation, substitute_mode_id, share, requires_tc, requires_car,
  detail_kind, question_template, first_step, phrase_de_la_veille, transports_requis, transports_exclus
) values
  ('Passer deux trajets sur cinq en RER', 'commute', 'main_leg', 'substitute', 'train_rer', 0.40,
   true, false, 'commute_days',
   '{jours}, as-tu fait ce trajet en RER ?',
   'Vérifie l''horaire qui te convient, puis essaie-le une fois.',
   'Demain, tu as prévu de faire ton trajet en RER.',
   array['rer'], null),
  ('Prendre le RER pour deux sorties sur cinq', 'leisure', 'main_leg', 'substitute', 'train_rer', 0.40,
   true, false, 'leisure_frequency',
   'En {mois}, as-tu pris le RER pour une sortie ?',
   'Repère la ligne qui dessert ta sortie habituelle.',
   null,
   array['rer'], array['metro_tram'])
on conflict (action_text) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 4. L'estimateur
-- ─────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.estimate_action_savings(p_assessment_id uuid)
 RETURNS SETOF action_saving
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  where tm.id = public.resolve_mode(
    a.commute_mode, a.commute_car_engine, a.commute_two_wheeler_type,
    a.commute_train_type, a.commute_velo_type);

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
    -- C3.8 §1 : la zone décide, là où `requires_tc` ne voyait que « inexistant ». Une condition
    -- qu'on ne peut pas évaluer n'est pas remplie : sans réponse, on ne propose pas.
    if t.zones_admissibles is not null
       and not (coalesce(a.zone_type, '') = any(t.zones_admissibles)) then
      continue;
    end if;
    -- v1-34 : ce qui passe près de chez soi décide des transports en commun, plus la zone. Une
    -- condition qu'on ne peut pas évaluer n'est pas remplie : sans réponse, on ne propose pas
    -- (décision D4, les bilans d'avant la question sont des bilans de test).
    if t.transports_requis is not null
       and not coalesce(a.transports_proches && t.transports_requis, false) then
      continue;
    end if;
    -- Et l'exclusion : le RER coché prend la place du train (D3), et l'action des sorties en RER
    -- s'efface devant celle du métro ou du tram, qui la couvre.
    if t.transports_exclus is not null
       and coalesce(a.transports_proches && t.transports_exclus, false) then
      continue;
    end if;
    -- C3.8 §2 : le télétravail était présupposé. La liste plutôt qu'un booléen parce qu'il y a
    -- deux seuils : un jour se tient avec « parfois », deux jours demandent « oui ».
    if t.teletravail_admissible is not null
       and not (coalesce(a.teletravail, '') = any(t.teletravail_admissible)) then
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
      -- C4.4 : la borne basse est EXCLUE, la haute reste incluse — deux gabarits qui se partagent
      -- une borne ne se proposent donc jamais tous les deux. Et comme la haute, une distance
      -- inconnue ne remplit pas la condition.
      if t.min_distance_km is not null
         and coalesce(v_trip_distance, 0) <= t.min_distance_km then
        continue;
      end if;

      if t.operation = 'share_vehicle' then
        if coalesce(v_commute_category, '') <> 'voiture' then continue; end if;
        if coalesce(a.commute_is_carpool, false) then continue; end if;
        -- On partage la voiture, pas le train de la seconde jambe.
        v_base_co2 := t.share * r.commute_main_leg_co2_kg_year;
      elsif t.operation = 'remove_day' then
        -- C3.8 §2 : la garde se dérive du gabarit au lieu de porter un 2 écrit en dur. Retirer
        -- deux jours à quelqu'un qui en fait deux supprimerait 100 % de son trajet.
        if a.commute_days_per_week <= t.trips then continue; end if;
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
      if t.min_distance_km is not null
         and coalesce(v_trip_distance, 0) <= t.min_distance_km then
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
        -- C3.5 : une empreinte par personne veut un facteur par personne. C4.4 : et l'appel passe
        -- par le point unique, comme dans le calcul du bilan.
        v_current_factor := public.emission_factor(
          public.resolve_mode('voiture', a.car_long_trips_engine, null, null, null), v_factor_date)
          / coalesce(a.car_long_trips_occupancy, 1);
        v_detail := format('Sur %s long%s trajet%s en voiture déclaré%s.',
          v_count, case when v_count > 1 then 's' else '' end, case when v_count > 1 then 's' else '' end,
          case when v_count > 1 then 's' else '' end);
      elsif t.segment = 'coach' then
        -- C4.4 : pas de division par une occupation, à l'inverse de la voiture — la personne ne
        -- choisit pas le remplissage d'un autocar, ce n'est pas son véhicule. Cf. le même point
        -- dans `recompute_assessment_results`, qui dit pourquoi « le facteur est déjà par
        -- voyageur » ne distinguerait rien.
        v_count := coalesce(a.coach_long_trips_per_year, 0);
        v_base_co2 := coalesce(r.travel_coach_co2_kg_year, 0);
        v_current_factor := public.emission_factor('autocar', v_factor_date);
        v_detail := format('Sur %s long%s trajet%s en autocar déclaré%s.',
          v_count, case when v_count > 1 then 's' else '' end, case when v_count > 1 then 's' else '' end,
          case when v_count > 1 then 's' else '' end);
      else
        continue;
      end if;

      if v_count < 1 or v_base_co2 <= 0 then continue; end if;
      -- C3.8 §4 : on ne propose pas de partager une voiture déjà partagée. C'est la réponse que
      -- C3.5 vient de rendre disponible.
      --
      -- **Cette garde lit l'occupation de la VOITURE, quel que soit le segment**, et C4.4 en fait
      -- un piège dormant en ouvrant le segment `coach` : un gabarit `share_vehicle` posé un jour
      -- sur un autre segment serait écarté par une réponse qui ne le concerne pas, en silence.
      -- Elle n'est pas resserrée ici parce qu'aucun gabarit n'a ce besoin — resserrer un filtre
      -- pour un cas qui n'existe pas, c'est décider sans données. Le jour où ce gabarit s'écrit,
      -- c'est cette ligne qu'il faut relire d'abord.
      if t.operation = 'share_vehicle' and coalesce(a.car_long_trips_occupancy, 1) > 1 then
        continue;
      end if;
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

    -- C3.4 : quand le trajet a deux jambes, une action qui n'en touche qu'une le dit.
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
$function$
;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 5. L'écran « Contexte »
-- ─────────────────────────────────────────────────────────────────────────────────────────────

-- La signature change (la réponse à la place de l'accès) : l'ancienne part, sans quoi PostgREST
-- garderait deux fonctions de même nom à départager.
drop function if exists public.mettre_a_jour_le_contexte(text, text, text, text);

create or replace function public.mettre_a_jour_le_contexte(
  p_zone_type text,
  p_transports_proches text[],
  p_household_vehicles text,
  p_teletravail text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_assessment_id uuid;
  v_avant record;
  v_transports text[] := public.transports_ranges(p_transports_proches);
begin
  if v_uid is null then
    raise exception 'mettre_a_jour_le_contexte: aucune session' using errcode = 'RM003';
  end if;

  if p_zone_type is null or v_transports is null or p_household_vehicles is null then
    raise exception 'mettre_a_jour_le_contexte: les trois réponses de contexte sont obligatoires'
      using errcode = 'RM003';
  end if;

  select a.id into v_assessment_id
  from public.assessments a
  where a.user_id = v_uid and a.status = 'completed'
  order by a.submitted_at desc nulls last
  limit 1;

  if v_assessment_id is null then
    raise exception 'mettre_a_jour_le_contexte: aucun bilan complété' using errcode = 'RM003';
  end if;

  select zone_type, transports_proches, household_vehicles, teletravail
    into v_avant
  from public.assessment_answers
  where assessment_id = v_assessment_id;

  -- **Rien n'a bougé : on ne touche à rien.** `recompute` réécrit `assessment_results` et la
  -- régénération reconstruit `plan_actions` : un enregistrement à blanc ferait perdre les rangs
  -- d'affichage et rejouerait la reprise d'engagement pour rien. La réponse stockée est rangée par
  -- le déclencheur, et celle qu'on reçoit l'est juste au-dessus : deux réponses égales se comparent
  -- égales, dans quelque ordre qu'on ait touché les puces.
  if v_avant.zone_type is not distinct from p_zone_type
     and v_avant.transports_proches is not distinct from v_transports
     and v_avant.household_vehicles is not distinct from p_household_vehicles
     and v_avant.teletravail is not distinct from p_teletravail then
    return;
  end if;

  -- Les valeurs admissibles ne sont pas revalidées ici : les `check` de la table les portent. Et
  -- `tc_access` ne s'écrit pas : le déclencheur le déduit de la réponse.
  update public.assessment_answers
  set zone_type = p_zone_type,
      transports_proches = v_transports,
      household_vehicles = p_household_vehicles,
      teletravail = p_teletravail
  where assessment_id = v_assessment_id;

  -- L'ordre compte : `recompute` remet `assessment_results` d'accord avec les réponses
  -- (`mobility_constrained`, le résiduel des sorties rares), puis l'appel nommé reconstruit le plan.
  perform public.recompute_assessment_results(v_assessment_id);
  perform public.generate_plan_cycle_for_user(v_uid, 'contexte');
end;
$$;

revoke execute on function public.mettre_a_jour_le_contexte(text, text[], text, text)
  from public, anon, authenticated;
grant execute on function public.mettre_a_jour_le_contexte(text, text[], text, text) to authenticated;

comment on function public.mettre_a_jour_le_contexte(text, text[], text, text) is
  'Corrige les réponses de contexte du dernier bilan complété (C6.4) : zone, ce qui passe près de chez soi (v1-34), véhicules, télétravail. L''accès se déduit de la réponse. Recalcule le bilan et reconstruit le plan, sauf si rien n''a bougé.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 6. Le contrôle
-- ─────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_manquants text;
begin
  select string_agg(attendu, ', ') into v_manquants
  from (values
    ('Passer deux trajets sur cinq en métro ou en tram', '{metro_tram}', null),
    ('Prendre les transports en commun pour deux sorties sur cinq', '{metro_tram}', null),
    ('Passer deux trajets sur cinq en train', '{train}', '{rer}'),
    ('Passer deux trajets sur cinq en RER', '{rer}', null),
    ('Prendre le RER pour deux sorties sur cinq', '{rer}', '{metro_tram}')
  ) as v(attendu, requis, exclus)
  where not exists (
    select 1 from public.action_templates t
    where t.action_text = v.attendu
      and t.transports_requis = v.requis::text[]
      and t.transports_exclus is not distinct from v.exclus::text[]
      and t.zones_admissibles is null
      and t.question_template is not null
  );
  if v_manquants is not null then
    raise exception 'v1-34 : gabarits introuvables ou mal conditionnés : %', v_manquants;
  end if;

  if exists (select 1 from public.action_templates where zones_admissibles is not null) then
    raise exception 'v1-34 : un gabarit garde une condition de zone';
  end if;
end;
$$;
