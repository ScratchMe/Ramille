-- Le gain d'une substitution sur un long trajet se calcule par personne, comme sa base.
--
-- **Défaut introduit par C3.5 et relevé en contre-lisant la vague 7.** Depuis que l'occupation
-- est demandée, `assessment_results.travel_car_co2_kg_year` est une empreinte **par personne** :
-- partir à trois la divise par trois. Mais dans `estimate_action_savings`, la branche voyages
-- continuait de prendre pour `v_current_factor` le facteur **par véhicule** du référentiel. Base
-- et facteur ne parlaient donc plus de la même chose, et « Faire un de tes longs trajets en train
-- plutôt qu'en voiture » surestimait son gain de **4,4 %** à trois personnes (mesuré sur la base :
-- 32,51 kg annoncés contre 31,14 réels, 700 km en thermique).
--
-- **Ce n'est pas une imprécision d'arrondi, c'est une incohérence de base de calcul**, et elle
-- grandit avec l'occupation : le rapport vaut `1 − f_train / f_voiture` là où il devrait valoir
-- `1 − f_train / (f_voiture / occupation)`. Le sens est celui qui flatte — on annonce plus que ce
-- que l'action rapporte, sur le poste qui porte les plus gros gains du produit.
--
-- **Les deux autres postes étaient déjà justes**, et c'est ce qui rend le défaut lisible une fois
-- nommé : pour le trajet domicile-travail et pour les sorties, le facteur courant est **dérivé de
-- la paire persistée** (`co2 / km`), donc il hérite automatiquement de la division par le
-- covoiturage. La branche voyages n'a pas de paire km/co2 à diviser — il n'existe pas de
-- `travel_car_km_year` — donc elle lisait le référentiel, et personne n'a vu que ce chemin-là
-- n'avait pas suivi.
--
-- **Substitution vérifiée plutôt que réécriture complète** : un seul membre change. Elle suit
-- l'idiome du dépôt, celui de C2.9 — on remplace dans `pg_get_functiondef`, qui rend la
-- définition entière, signature et attributs compris, plutôt que de les réécrire à la main. Deux
-- points qui ne sont pas du style : l'ancre ne contient **aucune ligne de commentaire**, parce que
-- le distant porte les corps sans ceux du dépôt ; et le rejeu se reconnaît à la **présence du
-- remplacement** et jamais à la seule absence de l'ancre, ce second test couvrant aussi un corps
-- réécrit autrement — la migration passerait alors en silence sans rien faire, le jour d'une
-- restauration.

do $substitution$
declare
  src text;
  cible oid;
  ancre constant text := E'        v_current_factor := public.emission_factor(\n          public.resolve_car_mode(''voiture'', a.car_long_trips_engine), v_factor_date);';
  remplacement constant text := E'        v_current_factor := public.emission_factor(\n          public.resolve_car_mode(''voiture'', a.car_long_trips_engine), v_factor_date)\n          / coalesce(a.car_long_trips_occupancy, 1);';
  occurrences int;
begin
  select p.oid into cible from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = 'estimate_action_savings';

  if cible is null then
    raise exception 'estimate_action_savings est introuvable.';
  end if;

  src := pg_get_functiondef(cible);
  occurrences := (length(src) - length(replace(src, ancre, ''))) / length(ancre);

  if occurrences = 0 then
    -- Déjà substitué : un rejeu après restauration, donc un non-événement. La marque est la
    -- division elle-même, et elle est cherchée **collée au facteur** — `coalesce(a.car_long_trips_occupancy, 1)`
    -- apparaît déjà seul dans ce corps, dans la garde qui refuse de proposer de partager une
    -- voiture déjà partagée, donc le chercher nu reconnaîtrait « déjà appliqué » sur un corps qui
    -- ne l'est pas.
    if position(E'v_factor_date)\n          / coalesce(a.car_long_trips_occupancy, 1);' in src) > 0 then
      return;
    end if;
    raise exception 'Ni le facteur des voyages ni sa division par l''occupation ne sont présents : le corps a été réécrit autrement.';
  elsif occurrences > 1 then
    raise exception 'Le facteur des voyages a été trouvé % fois (une seule attendue).', occurrences;
  end if;

  execute replace(src, ancre, remplacement);
end
$substitution$;

do $controle$
declare
  v_corps text := pg_get_functiondef('public.estimate_action_savings(uuid)'::regprocedure);
begin
  if position(E'v_factor_date)\n          / coalesce(a.car_long_trips_occupancy, 1);' in v_corps) = 0 then
    raise exception 'Le facteur des voyages n''est pas ramené à la personne : le gain du train reste surestimé de ce que vaut l''occupation.';
  end if;
  -- Le garde inverse, qui est le vrai risque : une « simplification » qui retirerait la division
  -- de la **base** ferait revenir un chiffre par véhicule dans un résultat par personne, et les
  -- deux membres cesseraient de nouveau de parler de la même chose — dans l'autre sens.
  if position('v_base_co2 := least(t.trips, v_count) * (v_base_co2 / v_count);' in v_corps) = 0 then
    raise exception 'La base des voyages ne se ramène plus à un trajet : base et facteur ne parlent plus de la même chose.';
  end if;
end
$controle$;
