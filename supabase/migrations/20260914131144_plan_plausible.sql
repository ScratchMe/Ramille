-- C3.8 — le plan plausible : zones admissibles, télétravail demandé, quatre leviers de plus.
--
-- ## Ce qui n'allait pas
--
-- **Le filtre de contexte ne lisait qu'une valeur sur trois.** `requires_tc` écartait les actions
-- de transport en commun quand la personne avait répondu `tc_access = 'inexistant'`, et rien
-- d'autre : « Passer deux trajets sur cinq en métro ou en tram » arrivait donc **en tête** du plan
-- d'un profil rural à desserte limitée. Ce n'est pas une approximation de calcul — le gain est
-- juste —, c'est une action impossible proposée en premier, c'est-à-dire la façon la plus rapide
-- de perdre la confiance qu'un plan de réduction demande.
--
-- **Le télétravail était présupposé.** « Garder une journée de télétravail par semaine » ne
-- vérifiait rien : ni que le métier s'y prête, ni que la personne en a déjà. Proposé à une
-- aide-soignante ou à un chauffeur, et formulé comme un manquement — « garder » suppose qu'on en
-- avait. Le libellé seul ne suffisait pas : il faut la question.
--
-- **Douze gabarits, avec des manques calculables sans nouveau facteur.** Partager un long trajet,
-- marcher pour une sortie courte, renoncer à un vol court quand le train n'est pas une option, un
-- second jour de télétravail. Quatre lignes de seed, et une garde chacune.
--
-- ## Deux règles que ce fichier pose, et qu'il ne faut pas uniformiser
--
-- **Une condition qu'on ne peut pas évaluer n'est pas remplie.** Sans réponse, on ne propose pas.
-- C'est l'inverse du choix de C3.1, où `mobility_constrained` nul **montre** la barre de la moyenne
-- française, et l'asymétrie est le raisonnement et non un oubli : ne pas savoir y faisait cacher un
-- repère, ici cela ferait proposer une action implausible. Coût de la règle, mesuré : la base ne
-- porte aujourd'hui **aucun** bilan (la purge des sessions anonymes les a emportés, relevé le
-- 14/09/2026), donc aucun plan existant ne perd d'action.
--
-- **Une liste de valeurs admissibles plutôt qu'un booléen.** `zones_admissibles` et
-- `teletravail_admissible` ont la même forme et se lisent de la même façon — `null` veut dire
-- « pas de condition ». Pour le télétravail ce n'est pas du style : il y a deux seuils, un jour se
-- tenant avec « parfois » et deux jours demandant « oui ». Un `requires_teletravail boolean`
-- aurait imposé une seconde colonne au premier gabarit qui distingue.

-- ── Schéma ────────────────────────────────────────────────────────────────────────────────

alter table public.action_templates
  -- Les valeurs de `assessment_answers.zone_type` sous lesquelles ce gabarit est proposé.
  -- `null` = aucune condition de zone.
  add column if not exists zones_admissibles text[],
  -- Les réponses à B4.4 sous lesquelles ce gabarit est proposé. `null` = aucune condition.
  add column if not exists teletravail_admissible text[];

alter table public.assessment_answers
  add column if not exists teletravail text;

-- `drop ... if exists` devant chaque `add constraint` : une migration doit se rejouer telle quelle
-- après une restauration.
alter table public.assessment_answers
  drop constraint if exists assessment_answers_teletravail_check;

alter table public.assessment_answers
  add constraint assessment_answers_teletravail_check
    check (teletravail is null or teletravail in ('oui', 'parfois', 'non'));

comment on column public.assessment_answers.teletravail is
  'B4.4 — « Peux-tu travailler depuis chez toi ? » oui / parfois / non. Null = bilan antérieur à la question : les gabarits qui la lisent ne sont alors pas proposés.';
comment on column public.action_templates.zones_admissibles is
  'Valeurs de zone_type sous lesquelles ce gabarit est proposé. Null = aucune condition de zone.';
comment on column public.action_templates.teletravail_admissible is
  'Réponses à B4.4 sous lesquelles ce gabarit est proposé. Null = aucune condition.';

-- ── Les échéances des voyages ────────────────────────────────────────────────────────────
--
-- « Ce mois-ci » n'est pas une échéance pour un vol : on ne décide pas d'un voyage au calendrier
-- du mois, on le décide quand le projet se présente — ou avant le prochain bilan, qui est le seul
-- rendez-vous que le produit donne. Les trois valeurs existantes restent, elles sont celles des
-- loisirs ; les deux nouvelles s'ajoutent, et c'est l'écran qui décide lesquelles proposer selon
-- le poste (`src/types/plan.ts`).

alter table public.plan_actions
  drop constraint if exists plan_actions_intention_timing_check;

alter table public.plan_actions
  add constraint plan_actions_intention_timing_check
    check (intention_timing is null or intention_timing in (
      'ce_mois', 'le_mois_prochain', 'prochaine_occasion',
      'au_prochain_voyage', 'avant_le_prochain_bilan'));

-- ── Le référentiel d'actions ─────────────────────────────────────────────────────────────
--
-- **Les gabarits se désignent par `action_text` et jamais par leur identifiant** :
-- `action_templates.id` vaut `gen_random_uuid()`, donc les douze lignes portent des identifiants
-- différents sur chaque base construite depuis `supabase/migrations/`. Un uuid littéral ici
-- apparierait le distant et rien en CI, en silence — c'est ainsi que la migration de C2.1 est
-- passée là-bas sans rien faire ici.

-- Le métro et le tram ne desservent que la ville dense. Le train et le RER, eux, gardent leur seul
-- `requires_tc` : un TER dessert des communes rurales, et l'écarter retirerait à un profil rural
-- la seule alternative qui lui reste.
update public.action_templates
  set zones_admissibles = array['urbain_dense']
  where action_text in (
    'Passer deux trajets sur cinq en métro ou en tram',
    'Prendre les transports en commun pour deux sorties sur cinq'
  );

-- « Garder » suppose qu'on en avait déjà : le libellé lisait le télétravail comme un acquis qu'on
-- laisse filer. Le nouveau décrit ce qu'on fait, pas ce qu'on aurait dû garder. La question du
-- point (`question_template`) et le premier pas ne changent pas : ils étaient déjà justes.
update public.action_templates
  set action_text = 'Travailler depuis chez toi un jour par semaine',
      teletravail_admissible = array['oui', 'parfois']
  where action_text = 'Garder une journée de télétravail par semaine';

-- **L'insert doit se rejouer sans rien dupliquer**, et rien ne l'en empêchait : `action_text` est
-- la clé naturelle du référentiel — les libellés sont distincts et c'est par eux qu'on apparie —
-- mais aucune contrainte ne le disait. L'index la rend vraie, et `on conflict` rend ce fichier
-- rejouable après une restauration, comme le reste du dépôt l'exige.
create unique index if not exists action_templates_action_text_key
  on public.action_templates (action_text);

-- `transport_mode_category` n'existe plus : elle a été supprimée par `20260905130000` une fois la
-- reprise de données faite, le ciblage passant par poste + segment. Un insert recopié depuis ce
-- fichier-là la nomme encore, et échoue.
insert into public.action_templates
  (action_text, poste, segment, operation,
   substitute_mode_id, share, trips, max_distance_km, requires_tc, requires_car, detail_kind,
   zones_admissibles, teletravail_admissible, question_template, first_step)
values
  -- Deux jours demandent un « oui » franc, et la garde du `remove_day` empêche de retirer deux
  -- jours à qui n'en fait que deux — son gain serait celui de ne plus travailler.
  ('Travailler depuis chez toi deux jours par semaine',
   'commute', 'main_leg', 'remove_day', null, null, 2, null, false, false, 'commute_days',
   null, array['oui'],
   '{jours}, as-tu travaillé depuis chez toi ?',
   'Choisis les deux jours et bloque-les dans ton agenda, dès maintenant.'),

  -- La marche pour les sorties courtes : la même borne que côté domicile-travail, où « à pied »
  -- s'arrête à trois kilomètres.
  ('Faire une sortie sur trois à pied',
   'leisure', 'main_leg', 'substitute', 'marche', 0.33, null, 3, false, false, 'leisure_frequency',
   null, null,
   'En {mois}, as-tu fait une sortie à pied ?',
   'Repère une sortie que tu fais déjà et regarde le temps qu''elle prend à pied.'),

  -- **Ce gabarit coexiste avec « Remplacer un aller-retour en avion par le train », et il le
  -- devance toujours** : renoncer retire 100 % du vol, substituer en retire la part que le train
  -- ne consomme pas. Ce n'est pas un doublon — ce sont deux engagements différents, et le second
  -- suppose une ligne de train qu'aucune réponse ne nous dit exister. Depuis C4.6 le plan montre
  -- toutes les pistes et non plus les deux premières : la personne choisit celle qui la concerne.
  ('Renoncer à un vol court ou moyen-courrier cette année',
   'travel', 'flight_short', 'remove_trip', null, null, 1, null, false, false, null,
   null, null,
   'En {mois}, as-tu eu un déplacement où tu as choisi autre chose que l''avion ?',
   'Regarde lequel de tes déplacements prévus tient sans avion.'),

  -- Partager un long trajet : la réponse de C3.5 rend la garde possible, et sans elle ce gabarit
  -- serait proposé à qui part déjà à quatre.
  ('Partager un de tes longs trajets en voiture',
   'travel', 'car', 'share_vehicle', null, null, 1, null, false, true, null,
   null, null,
   'En {mois}, as-tu partagé un long trajet en voiture ?',
   'Demande autour de toi qui fait la même route, avant de fixer la date.')
on conflict (action_text) do nothing;

-- ── L'estimateur ─────────────────────────────────────────────────────────────────────────
--
-- Repris du corps **installé** et non du fichier qui l'a créée : c'est la règle du dépôt, et elle
-- a déjà coûté trois gardes silencieusement supprimées (C2.2). Ici les deux coïncident, et ça se
-- vérifie plutôt que se suppose — `prosrc` du distant et le corps de `20260914123432`, commentaires
-- retirés et blancs réduits, rendent la même empreinte (125c559f…, 5 753 caractères). La
-- comparaison se fait sur la forme **normalisée** parce que le distant porte les corps sans les
-- commentaires du dépôt : plusieurs fonctions y ont perdu leurs lignes `--` en chemin.

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
    -- C3.8 §1 : la zone décide, là où `requires_tc` ne voyait que « inexistant ». Un métro ou un
    -- tram est une infrastructure de ville dense ; le proposer en tête du plan d'un profil rural
    -- à desserte limitée n'était pas une approximation, c'était une action impossible.
    --
    -- **Une condition qu'on ne peut pas évaluer n'est pas remplie**, et c'est la règle des deux
    -- filtres de ce chantier : sans réponse, on ne propose pas. C'est l'inverse du choix de C3.1
    -- (`mobility_constrained` nul montre la barre), et l'asymétrie est voulue — là-bas ne pas
    -- savoir faisait **cacher** un repère, ici cela ferait **proposer** une action implausible,
    -- ce que ce chantier existe pour arrêter.
    if t.zones_admissibles is not null
       and not (coalesce(a.zone_type, '') = any(t.zones_admissibles)) then
      continue;
    end if;
    -- C3.8 §2 : « Garder une journée de télétravail » présupposait un télétravail que rien ne
    -- vérifiait — proposé, en tête, à une aide-soignante ou à un chauffeur, et formulé comme un
    -- manquement. La liste plutôt qu'un booléen parce qu'il y a deux seuils : un jour se tient
    -- avec « parfois », deux jours demandent « oui ».
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

      if t.operation = 'share_vehicle' then
        if coalesce(v_commute_category, '') <> 'voiture' then continue; end if;
        if coalesce(a.commute_is_carpool, false) then continue; end if;
        -- On partage la voiture, pas le train de la seconde jambe.
        v_base_co2 := t.share * r.commute_main_leg_co2_kg_year;
      elsif t.operation = 'remove_day' then
        -- C3.8 §2 : la garde se dérive du gabarit au lieu de porter un 2 écrit en dur, qui était
        -- celui d'un unique gabarit à `trips = 1`. Retirer deux jours à quelqu'un qui en fait deux
        -- supprimerait 100 % de son trajet, et le gain annoncé serait celui de ne plus travailler.
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
      -- C3.8 §4 : on ne propose pas de partager une voiture déjà partagée. C'est la réponse que
      -- C3.5 vient de rendre disponible — avant elle, l'occupation n'était pas demandée, donc ce
      -- gabarit aurait été proposé à qui part déjà à quatre, et son gain calculé sur une empreinte
      -- déjà divisée par quatre.
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

-- ── Contrôles ────────────────────────────────────────────────────────────────────────────
-- Écrits parce que tout ce qui précède est silencieux quand il rate : un `update` qui n'apparie
-- rien, un gabarit sans premier pas, un filtre qui ne s'applique jamais.

do $$
declare
  v_corps text := pg_get_functiondef('public.estimate_action_savings(uuid)'::regprocedure);
  v_n integer;
begin
  if position('t.zones_admissibles is not null' in v_corps) = 0 then
    raise exception 'Le filtre de zone n''est pas dans le corps installé : le métro reste proposé en rase campagne.';
  end if;
  if position('t.teletravail_admissible is not null' in v_corps) = 0 then
    raise exception 'Le filtre de télétravail n''est pas dans le corps installé : l''action reste présupposée.';
  end if;
  -- Le garde inverse, qui est le vrai risque : une « simplification » qui remettrait le 2 en dur
  -- laisserait le gabarit à deux jours retirer 100 % du trajet de qui en fait deux.
  if position('a.commute_days_per_week <= t.trips' in v_corps) = 0 then
    raise exception 'La garde du remove_day ne se dérive plus du gabarit : deux jours retirés à qui en fait deux.';
  end if;

  select count(*) into v_n from public.action_templates
   where action_text = 'Travailler depuis chez toi un jour par semaine';
  if v_n <> 1 then
    raise exception 'Le gabarit de télétravail n''a pas été renommé (% ligne(s) appariée(s)). L''appariement se fait par action_text, donc un libellé mal recopié n''apparie rien.', v_n;
  end if;

  select count(*) into v_n from public.action_templates where zones_admissibles is not null;
  if v_n <> 2 then
    raise exception 'Le filtre de zone ne porte pas sur deux gabarits mais sur % : l''update n''a pas apparié ce qu''il visait.', v_n;
  end if;

  select count(*) into v_n from public.action_templates where teletravail_admissible is not null;
  if v_n <> 2 then
    raise exception 'Les deux gabarits de télétravail ne portent pas tous les deux leur condition (% trouvé(s)).', v_n;
  end if;

  -- Les deux balayages de C4.6 et de C2.1, rejoués ici : quatre gabarits ajoutés les traversent
  -- sans être nommés nulle part, et c'est exactement la façon dont la CI est tombée sur le
  -- référentiel des facteurs.
  select count(*) into v_n from public.action_templates where first_step is null or question_template is null;
  if v_n <> 0 then
    raise exception '% gabarit(s) sans premier pas ou sans question : la carte en afficherait une vide et le point retomberait sur la question générique.', v_n;
  end if;
  select count(*) into v_n from public.action_templates where first_step ~ '[0-9]';
  if v_n <> 0 then
    raise exception 'Un premier pas porte un chiffre : le gain est juste au-dessus, et /conditions dit que le produit ne fournit pas de conseil en mobilité.';
  end if;

  select count(*) into v_n from public.action_templates;
  if v_n <> 16 then
    raise exception 'Le référentiel compte % gabarits au lieu de 16 : un insert a été rejoué ou en a perdu un.', v_n;
  end if;
end;
$$;
