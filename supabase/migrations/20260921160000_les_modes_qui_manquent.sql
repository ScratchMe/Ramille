-- C4.4 — Les modes qui manquent, et celui qui est mal compté (#146)
--
-- Page de décision : `docs/architecture/v1-21-modes-manquants.md`, dont les quatre arbitrages
-- (D1 à D4) ont été tranchés le 21/09/2026 dans le sens recommandé.
--
-- Trois défauts, une seule migration — et c'est D4 : **toucher au référentiel des facteurs
-- invalide toutes les valeurs attendues de la suite pgTAP, y compris celles qui ne nomment pas le
-- facteur touché, et « toucher » inclut en ajouter un** (`TESTING.md` §2.2, leçon payée trois fois
-- en PR #34, #41 et #48). Trois migrations, ce serait trois fois ce recalcul.
--
-- ## Ce que chacun coûtait, mesuré le 19/09 et revérifié le 21/09 sur l'endpoint ACV
--
--   - **Le RER.** Le mode s'appelait « Train ou RER » et portait le facteur du **TER** (0,027690).
--     Le RER existe à **0,009780**, soit **2,83 fois moins**. Un usager du RER d'Île-de-France
--     voyait 249,2 kg/an là où 88,0 étaient justes — et le plan lui **sous-estimait** de 64,5 kg le
--     gain du report modal qu'on cherche précisément à lui proposer. Les deux erreurs vont en sens
--     inverse et ne se compensent pas.
--   - **Le vélo à assistance électrique.** Une seule case, « Vélo », à 0,000170 contre 0,010950 :
--     **64 fois moins**. L'écart absolu est petit et il faut le dire ainsi ; ce qui le rend gênant
--     est qu'il tombe sur le profil sobre, dont le total est de l'ordre de la dizaine de kilos, et
--     sur le mode qui remplace une voiture.
--   - **L'autocar.** Absent de B3.4, donc un Paris–Lyon en car était compté comme s'il n'avait pas
--     eu lieu. Et son chiffre surprend : **0,037560, soit plus qu'un TER** (0,027690) et douze fois
--     un TGV (0,002930). « Le car, c'est le mode sobre » est faux en ACV, exactement comme
--     `hybride > thermique` — d'où l'assertion pgTAP qui l'épingle, pour que personne ne le
--     « corrige » par réflexe.
--
-- ## La règle qui décide de ce qui reçoit un mode propre
--
-- Le mode générique est le **repli** des bilans soumis avant que la question n'existe. Une réponse
-- reçoit un mode à elle **quand elle change le facteur ou les mots** :
--
--   - `train_ter` : même facteur que le repli, **des mots différents** (« Train » ne peut pas être
--     le libellé d'une réponse qui dit TER) → créé, comme `voiture_thermique` l'est à côté de
--     `voiture` avec le même slug et la même valeur ;
--   - `velo_mecanique` : même facteur, **mêmes mots** (« Vélo » est déjà le libellé exact du vélo
--     mécanique, et « à vélo » son complément de maintien) → **pas créé**. `velo` recouvre donc à
--     la fois « mécanique » et « pas de réponse », ce qui ne coûte rien : le facteur est le même, et
--     c'est `assessment_answers.commute_velo_type` qui porte la réponse, pas le mode résolu.
--
-- ## Ce que cette migration ne fait pas, et pourquoi
--
-- **Elle ne propose pas le RER comme action.** `v1-21` §3.1 relève que le gain de « Passer deux
-- trajets sur cinq en train » est calculé au tarif du TER, donc sous-estimé pour quelqu'un dont
-- l'alternative réelle est le RER. Le corriger demanderait de savoir **où** la personne habite au
-- sens du réseau — proposer le RER en « urbain_dense » le proposerait à Toulouse, c'est-à-dire le
-- défaut exact que C3.8 a fermé (« le plan ne propose plus l'impossible »). Le gabarit perd donc
-- « ou en RER » de son libellé, faute de pouvoir le promettre, et la moitié coûteuse du défaut —
-- le bilan compté 2,83 fois trop haut — est bien fermée ici. Dette consignée en `v1-27`.

-- ---------------------------------------------------------------------------------------------
-- 1. Le référentiel : cinq modes, leurs sources et leurs facteurs de départ
-- ---------------------------------------------------------------------------------------------

insert into public.transport_modes (id, label, category) values
  ('train_ter',        'TER',                          'train'),
  ('train_rer',        'RER ou Transilien',            'train'),
  ('train_intercites', 'Intercités',                   'train'),
  ('velo_electrique',  'Vélo à assistance électrique', 'velo_marche'),
  ('autocar',          'Autocar',                      'transports_commun')
on conflict (id) do nothing;

-- Le libellé promettait ce que le facteur ne tenait pas. Il redevient générique : c'est le repli,
-- et les trois réponses ont désormais chacune le leur.
update public.transport_modes set label = 'Train' where id = 'train';

-- **Tout mode ajouté impose sa ligne ici**, sinon il reste figé à sa valeur de départ pendant que
-- tous les autres se resynchronisent chaque trimestre — en silence (un test pgTAP garde ce point).
insert into public.emission_factor_sources (transport_mode_id, impactco2_slugs, note) values
  ('train_ter', array['ter'],
   'TER. Même slug que le repli `train`, donc même valeur : c''est ce qui garantit qu''un bilan qui répond « TER » compte exactement ce que comptait un bilan d''avant la question.'),
  ('train_rer', array['rer'],
   'RER ou Transilien. 2,83 fois moins qu''un TER (0,009780 contre 0,027690) — c''est l''écart que le libellé « Train ou RER » faisait payer à tout usager du RER avant le 21/09/2026.'),
  ('train_intercites', array['intercites'],
   'Intercités. Entre le TGV et le RER (0,008980), et nettement sous le TER.'),
  ('velo_electrique', array['veloelectrique'],
   'Vélo à assistance électrique : 0,010950 contre 0,000170 pour le mécanique, soit 64 fois. Comme la trottinette, son ACV est presque entièrement de la fabrication — la batterie.'),
  ('autocar', array['autocar'],
   'Autocar thermique, longue distance (B3.4). À ne pas confondre avec `bus`, qui est le bus urbain (0,122420). Il émet PLUS qu''un TER et douze fois un TGV : l''intuition « le car est sobre » est fausse en ACV.')
on conflict (transport_mode_id) do nothing;

-- La note du repli disait « trajet quotidien B1.4 "Train ou RER" », ce qui a cessé d'être vrai
-- au-dessus.
update public.emission_factor_sources
   set note = 'TER — repli des bilans soumis avant que B1.4 ne demande le type de train (commute_train_type / leisure_train_type), et de ceux où la réponse reste vide. Le slug reste « ter » : un repli suit la valeur qu''il remplaçait.'
 where transport_mode_id = 'train';

-- Relevé le 21/09/2026 sur `/api/v1/thematiques/ecv/transport`, champ `ecv` — le seul endpoint
-- admissible (`v1-07` §1.5) : `/api/v1/transport` rend des chiffres corrects mais sans la
-- fabrication, ce qui afficherait le VAE et le vélo à des valeurs incomparables au reste.
insert into public.emission_factors (transport_mode_id, kg_co2_per_km, source, source_ref, valid_from) values
  ('train_ter',        0.027690, 'ADEME Base Empreinte — ACV complète (via API Impact CO2)', 'impactco2:ecv/transport ter (relevé du 21/09/2026)',            '2026-09-21'),
  ('train_rer',        0.009780, 'ADEME Base Empreinte — ACV complète (via API Impact CO2)', 'impactco2:ecv/transport rer (relevé du 21/09/2026)',            '2026-09-21'),
  ('train_intercites', 0.008980, 'ADEME Base Empreinte — ACV complète (via API Impact CO2)', 'impactco2:ecv/transport intercites (relevé du 21/09/2026)',     '2026-09-21'),
  ('velo_electrique',  0.010950, 'ADEME Base Empreinte — ACV complète (via API Impact CO2)', 'impactco2:ecv/transport veloelectrique (relevé du 21/09/2026)', '2026-09-21'),
  ('autocar',          0.037560, 'ADEME Base Empreinte — ACV complète (via API Impact CO2)', 'impactco2:ecv/transport autocar (relevé du 21/09/2026)',        '2026-09-21')
on conflict (transport_mode_id, valid_from) do nothing;

-- ---------------------------------------------------------------------------------------------
-- 2. La résolution : deux résolveurs de plus, un seul point d'entrée
-- ---------------------------------------------------------------------------------------------
--
-- `public.resolve_mode` est **le seul point de résolution** du calcul, et c'est ce qui rend un
-- oubli visible : ajouter un mode sans passer par lui rendrait un nombre — le mode générique
-- existe, son facteur existe — donc l'erreur serait silencieuse.

create or replace function public.resolve_train_mode(p_mode_id text, p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_mode_id <> 'train' then p_mode_id
    when p_type = 'ter' then 'train_ter'
    when p_type = 'rer' then 'train_rer'
    when p_type = 'intercites' then 'train_intercites'
    -- Sans réponse — bilan soumis avant B1.5 bis — le repli garde le facteur du TER, qui est
    -- exactement ce que ce bilan a compté le jour où il a été soumis.
    else p_mode_id
  end;
$function$;

comment on function public.resolve_train_mode(text, text) is
  'Le type de train déclaré (B1.5 bis / B2.2 bis) choisit le mode. Jumelle de resolve_car_mode et resolve_two_wheeler_mode ; composée par resolve_mode, jamais appelée seule depuis le calcul.';

create or replace function public.resolve_velo_mode(p_mode_id text, p_type text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_mode_id <> 'velo' then p_mode_id
    when p_type = 'electrique' then 'velo_electrique'
    -- Pas de `when p_type = 'mecanique' then 'velo_mecanique'` : ce mode n'existe pas, et c'est
    -- volontaire. `velo` a déjà le facteur du vélo mécanique (l'API le nomme « Vélo mécanique »),
    -- son libellé « Vélo » et son complément de maintien « à vélo » sont exacts pour lui — donc
    -- un mode de plus n'ajouterait ni un chiffre ni un mot. La réponse, elle, reste lisible dans
    -- `assessment_answers.commute_velo_type`.
    else p_mode_id
  end;
$function$;

comment on function public.resolve_velo_mode(text, text) is
  'Le vélo à assistance électrique (0,010950) contre le mécanique (0,000170). « mecanique » et « pas de réponse » rendent tous deux `velo` : même facteur, mêmes mots.';

-- La signature **remplace** l'ancienne au lieu de la doubler (précédent de `repondre_au_checkin`
-- et de `commit_plan_action`) : une surcharge qu'aucun appel n'émet se lit « morte » et non
-- « réservée ». L'ancienne est supprimée en §7, une fois ses deux appelants réécrits.
create or replace function public.resolve_mode(
  p_mode_id text,
  p_car_engine text,
  p_two_wheeler_type text,
  p_train_type text,
  p_velo_type text
)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select public.resolve_velo_mode(
           public.resolve_train_mode(
             public.resolve_two_wheeler_mode(
               public.resolve_car_mode(p_mode_id, p_car_engine),
               p_two_wheeler_type),
             p_train_type),
           p_velo_type);
$function$;

comment on function public.resolve_mode(text, text, text, text, text) is
  'Le seul point de résolution du calcul : composition des quatre résolveurs spécialisés. Ne jamais les rappeler en imbriqué ailleurs — un oubli rendrait le mode générique, donc un nombre, donc rien de visible.';

-- Mêmes privilèges que les résolveurs existants : fonctions pures, lisibles par tous les rôles.
grant execute on function public.resolve_train_mode(text, text) to anon, authenticated, service_role;
grant execute on function public.resolve_velo_mode(text, text) to anon, authenticated, service_role;
grant execute on function public.resolve_mode(text, text, text, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 3. Les colonnes : quatre réponses de plus au questionnaire, un compteur, deux champs de calcul
-- ---------------------------------------------------------------------------------------------
--
-- Le patron est celui de la motorisation et du deux-roues (D1, D2) : **jamais une entrée de plus
-- dans la liste des modes**, une révélation imbriquée qui ne coûte qu'à ceux qu'elle concerne. Et
-- comme pour eux, une seule colonne par poste sert les **deux** jambes du trajet — le second mode
-- lit déjà `commute_car_engine`.

alter table public.assessment_answers
  add column if not exists commute_train_type text
    check (commute_train_type = any (array['ter', 'rer', 'intercites'])),
  add column if not exists leisure_train_type text
    check (leisure_train_type = any (array['ter', 'rer', 'intercites'])),
  add column if not exists commute_velo_type text
    check (commute_velo_type = any (array['mecanique', 'electrique'])),
  add column if not exists leisure_velo_type text
    check (leisure_velo_type = any (array['mecanique', 'electrique'])),
  add column if not exists coach_long_trips_per_year smallint not null default 0
    check (coach_long_trips_per_year >= 0);

comment on column public.assessment_answers.commute_train_type is
  'B1.5 bis — TER / RER ou Transilien / Intercités, demandé dès que « Train » est choisi en mode principal OU en second mode, comme commute_car_engine. Nul = bilan d''avant la question : resolve_mode retombe sur `train`, au tarif du TER.';
comment on column public.assessment_answers.leisure_train_type is
  'B2.2 bis — la jumelle loisirs de commute_train_type.';
comment on column public.assessment_answers.commute_velo_type is
  'B1.4 bis — mécanique ou à assistance électrique. Deux réponses seulement : une question dont une seule réponse existe n''en est pas une, ce qui est aussi la raison pour laquelle la trottinette n''en reçoit pas (v1-21 D2).';
comment on column public.assessment_answers.leisure_velo_type is
  'B2.2 ter — la jumelle loisirs de commute_velo_type.';
comment on column public.assessment_answers.coach_long_trips_per_year is
  'B3.4 — troisième compteur des voyages longue distance, à côté du train et de la voiture. L''autocar émet plus qu''un TER : ce n''est pas une histoire flatteuse, et c''est précisément pour ça qu''il faut la poser — un Paris–Lyon en car était jusqu''ici compté comme s''il n''avait pas eu lieu.';

alter table public.assessment_results
  add column if not exists travel_coach_co2_kg_year numeric;

comment on column public.assessment_results.travel_coach_co2_kg_year is
  'Instantané par segment, comme travel_train_co2_kg_year : c''est lui que lit estimate_action_savings, qui ne recalcule jamais de kilomètres.';

alter table public.action_templates
  add column if not exists min_distance_km numeric;

comment on column public.action_templates.min_distance_km is
  'Borne basse, EXCLUE, là où max_distance_km est incluse — deux gabarits qui se partagent une borne (le vélo jusqu''à 10 km, le VAE au-delà) ne se proposent donc jamais tous les deux. Comme la borne haute, une distance inconnue ne remplit pas la condition : on ne propose pas (C3.8 §1).';

-- `coach` manquait au vocabulaire des segments — et un gabarit portant un segment inconnu serait
-- tombé dans le `else continue` d'`estimate_action_savings`, c'est-à-dire jeté en silence.
alter table public.action_templates drop constraint if exists action_templates_segment_check;
alter table public.action_templates add constraint action_templates_segment_check
  check (segment is null or segment = any (array['main_leg', 'flight_short', 'flight_long', 'train', 'car', 'coach']));

-- ---------------------------------------------------------------------------------------------
-- 4. Le complément de maintien, et sa jumelle TypeScript
-- ---------------------------------------------------------------------------------------------
--
-- La catégorie `velo_marche` passe de trois modes à quatre. **C'est la paire la plus facile à
-- oublier de ce chantier**, parce qu'elle n'a rien à voir avec un facteur : sans complément, un
-- cycliste à assistance recevrait chaque lundi « ton trajet s'est-il fait autrement ? », des deux
-- côtés, et aucun test ne tomberait. La jumelle est `complementDeMaintien` dans
-- `src/types/checkin.ts`, **à toucher avec celle-ci**.

create or replace function public.complement_de_maintien(p_mode text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case p_mode
    when 'velo' then 'à vélo'
    when 'velo_electrique' then 'à vélo électrique'
    when 'marche' then 'à pied'
    when 'trottinette' then 'en trottinette'
    -- Un mode hors de la catégorie velo_marche ne devrait jamais arriver ici ; s'il arrive, la
    -- phrase reste grammaticale plutôt que tronquée.
    else 'autrement'
  end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- 5. Le calcul du bilan
-- ---------------------------------------------------------------------------------------------
--
-- Quatre changements, et un seul est une nouveauté :
--   - les trois `resolve_mode` passent à cinq arguments ;
--   - **l'appel direct à `resolve_car_mode` rentre au point unique.** C'était l'une des deux
--     entorses relevées le 19/09/2026, dont `CLAUDE.md` dit que le bon moment pour les corriger
--     est cette migration-ci, qui réécrit déjà les deux fonctions. L'équivalence avait été
--     éprouvée sur les six valeurs de moteur, donc rien ne change ;
--   - l'autocar entre dans le total des voyages, dans l'instantané par segment et dans le
--     départage du mode dominant.

create or replace function public.recompute_assessment_results(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
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
           + coalesce(a.car_long_trips_per_year, 0) + coalesce(a.coach_long_trips_per_year, 0) > 0 then 'travel'
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
-- 6. L'estimation des gains du plan
-- ---------------------------------------------------------------------------------------------
--
-- Quatre changements, mêmes que ci-dessus pour les deux premiers :
--   - le `resolve_mode` passe à cinq arguments, et l'appel direct à `resolve_car_mode` rentre au
--     point unique ;
--   - la borne basse de distance, symétrique de la haute — c'est elle qui rend le gabarit VAE
--     possible sans doubler le gabarit vélo : à 8 km on propose le vélo, à 16 km le VAE, jamais
--     les deux ;
--   - le segment `coach`, sans lequel un gabarit d'autocar serait jeté en silence par le
--     `else continue`.

create or replace function public.estimate_action_savings(p_assessment_id uuid)
returns setof action_saving
language plpgsql
stable security definer
set search_path to 'public'
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
$function$;

-- ---------------------------------------------------------------------------------------------
-- 7. L'ancienne signature part
-- ---------------------------------------------------------------------------------------------
--
-- Après ses deux appelants, jamais avant. Le raisonnement est celui de `repondre_au_checkin` en
-- C2.4 : l'app n'est pas encore publiée sur Play, donc aucun client installé n'appelle l'ancienne
-- forme — et de toute façon celle-ci n'a jamais été appelée que depuis le serveur.

drop function if exists public.resolve_mode(text, text, text);

-- ---------------------------------------------------------------------------------------------
-- 8. Les gabarits d'action que les nouveaux modes rendent possibles
-- ---------------------------------------------------------------------------------------------
--
-- Un mode de plus ne sert le produit que s'il change ce qu'on propose. Quatre gabarits, et le
-- seuil des 5 kg/an les filtre comme les autres — c'est lui, et non une condition écrite à la
-- main, qui écarte « prends le car » de quelqu'un qui partage déjà sa voiture à quatre (à cette
-- occupation le car est **plus** émetteur, donc le gain devient négatif).

-- Le libellé promettait le RER ; le gain, lui, se calcule au tarif du TER, et il n'y a pas de
-- façon honnête de cibler le RER sans demander où la personne habite au sens du réseau (l'en-tête
-- de ce fichier dit pourquoi). On retire donc la promesse, on ne la déplace pas.
update public.action_templates
   set action_text = 'Passer deux trajets sur cinq en train',
       question_template = '{jours}, as-tu fait ce trajet en train ?'
 where action_text = 'Passer deux trajets sur cinq en train ou en RER';

insert into public.action_templates (
  action_text, poste, segment, operation, substitute_mode_id, share, trips,
  min_distance_km, max_distance_km, requires_tc, requires_car, detail_kind,
  question_template, first_step
) values
  -- Le VAE n'est pas un vélo qui gagne un peu moins : c'est le vélo des trajets que le mécanique
  -- ne tient pas. D'où la borne basse — au-dessous, c'est le gabarit vélo qui se propose, et les
  -- deux ne se montrent jamais ensemble.
  ('Faire un trajet sur cinq à vélo à assistance électrique', 'commute', 'main_leg', 'substitute',
   'velo_electrique', 0.20, null, 10, 20, false, false, 'commute_distance',
   '{jours}, as-tu fait ce trajet à vélo électrique ?',
   -- **Pas « beaucoup de villes en louent au mois »**, qui était la première rédaction : c'est une
   -- affirmation sur le monde, sans source, et la règle du dépôt l'interdit — c'est elle qui a
   -- fait écarter la norme dynamique de D16 (« de plus en plus de gens changent un trajet »). Un
   -- premier pas décrit un geste que la personne peut faire, jamais un état du monde.
   'Fais le trajet une fois avec un vélo à assistance, emprunté ou loué, avant de t''équiper.'),
  ('Faire une sortie sur trois à vélo à assistance électrique', 'leisure', 'main_leg', 'substitute',
   'velo_electrique', 0.33, null, 15, 30, false, false, 'leisure_frequency',
   'En {mois}, as-tu fait une sortie à vélo électrique ?',
   'Repère une sortie que tu fais déjà, et regarde le temps qu''elle prend à assistance.'),
  -- Depuis la voiture, l'autocar gagne les trois quarts. Il reste derrière le train dans le
  -- classement du plan — c'est juste, et ce n'est pas une raison de le taire : c'est l'option qui
  -- reste quand il n'y a pas de train.
  ('Faire un de tes longs trajets en autocar plutôt qu''en voiture', 'travel', 'car', 'substitute',
   'autocar', null, 1, null, null, false, false, null,
   'En {mois}, as-tu fait un long trajet en autocar plutôt qu''en voiture ?',
   'Regarde les départs en autocar sur un trajet que tu dois déjà faire.'),
  -- Et dans l'autre sens : le car émet douze fois le TGV, donc quelqu'un qui en déclare a un
  -- levier réel. C'est le gabarit qui rend la nouvelle question actionnable au lieu de
  -- simplement comptée.
  ('Remplacer un de tes longs trajets en autocar par le train', 'travel', 'coach', 'substitute',
   'train_longue_distance', null, 1, null, null, false, false, null,
   'En {mois}, as-tu remplacé un trajet en autocar par le train ?',
   'Compare les horaires en train sur ton prochain trajet en car.')
on conflict (action_text) do nothing;

-- ---------------------------------------------------------------------------------------------
-- 9. Les contrôles de la migration
-- ---------------------------------------------------------------------------------------------
--
-- Ce qu'aucune suite ne verrait autrement : une migration à moitié appliquée, un mode sans source
-- (donc figé pendant que les autres se resynchronisent), un appel direct resté hors du point
-- unique. Les recherches dans les corps de fonction **retirent d'abord les commentaires** — sans
-- quoi la phrase « l'appel direct à resolve_car_mode rentre au point unique », écrite douze lignes
-- plus haut, ferait échouer le contrôle qu'elle décrit.

do $$
declare
  v_manquant text;
  v_def text;
  v_facteur_autocar numeric;
  v_facteur_ter numeric;
begin
  -- Les cinq modes, avec leur source et leur facteur.
  select string_agg(m.id, ', ') into v_manquant
  from unnest(array['train_ter', 'train_rer', 'train_intercites', 'velo_electrique', 'autocar']) as m(id)
  where not exists (select 1 from public.transport_modes tm where tm.id = m.id)
     or not exists (select 1 from public.emission_factor_sources s where s.transport_mode_id = m.id)
     or not exists (select 1 from public.emission_factors f where f.transport_mode_id = m.id);
  if v_manquant is not null then
    raise exception 'C4.4 : mode, source ou facteur manquant pour : %', v_manquant;
  end if;

  if (select label from public.transport_modes where id = 'train') <> 'Train' then
    raise exception 'C4.4 : le repli `train` promet encore le RER dans son libellé';
  end if;

  -- La signature remplace, elle ne double pas.
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'resolve_mode' and p.pronargs = 5
  ) then
    raise exception 'C4.4 : resolve_mode à cinq arguments absent';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'resolve_mode' and p.pronargs = 3
  ) then
    raise exception 'C4.4 : l''ancien resolve_mode à trois arguments survit — une surcharge morte';
  end if;

  -- Le point unique est unique : plus un seul appel direct aux résolveurs spécialisés depuis le
  -- calcul. C'était l'entorse relevée le 19/09/2026, à deux endroits.
  for v_def in
    select regexp_replace(pg_get_functiondef(p.oid), '--[^' || chr(10) || ']*', '', 'g')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('recompute_assessment_results', 'estimate_action_savings')
  loop
    if v_def like '%resolve_car_mode(%' or v_def like '%resolve_two_wheeler_mode(%' then
      raise exception 'C4.4 : le calcul appelle encore un résolveur spécialisé en direct';
    end if;
    if v_def not like '%resolve_mode(%' then
      raise exception 'C4.4 : une fonction de calcul ne passe plus par resolve_mode';
    end if;
  end loop;

  -- La paire la plus facile à oublier.
  if public.complement_de_maintien('velo_electrique') <> 'à vélo électrique' then
    raise exception 'C4.4 : le vélo à assistance reçoit « autrement » dans la question de maintien';
  end if;

  -- Le fait contre-intuitif, épinglé ici ET dans la suite pgTAP : l'autocar émet PLUS qu'un TER.
  select public.emission_factor('autocar', current_date) into v_facteur_autocar;
  select public.emission_factor('train_ter', current_date) into v_facteur_ter;
  if v_facteur_autocar <= v_facteur_ter then
    raise exception 'C4.4 : l''autocar (%) ne dépasse plus le TER (%) — facteur repris au mauvais endpoint ?',
      v_facteur_autocar, v_facteur_ter;
  end if;

  -- Les quatre gabarits neufs, et les deux balayages du référentiel qu'ils doivent satisfaire.
  select string_agg(m.texte, ', ') into v_manquant
  from unnest(array[
    'Faire un trajet sur cinq à vélo à assistance électrique',
    'Faire une sortie sur trois à vélo à assistance électrique',
    'Faire un de tes longs trajets en autocar plutôt qu''en voiture',
    'Remplacer un de tes longs trajets en autocar par le train',
    'Passer deux trajets sur cinq en train'
  ]) as m(texte)
  where not exists (
    select 1 from public.action_templates t
    where t.action_text = m.texte and t.question_template is not null and t.first_step is not null
  );
  if v_manquant is not null then
    raise exception 'C4.4 : gabarit absent ou sans question/premier pas : %', v_manquant;
  end if;

  if exists (select 1 from public.action_templates where action_text = 'Passer deux trajets sur cinq en train ou en RER') then
    raise exception 'C4.4 : le gabarit promet encore le RER, que le gain ne chiffre pas';
  end if;
end;
$$;
