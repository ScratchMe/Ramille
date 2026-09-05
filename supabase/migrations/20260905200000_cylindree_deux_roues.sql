-- Cylindrée du deux-roues motorisé — le plus gros écart qui restait dans le référentiel.
--
-- ## Le constat
--
-- `deux_roues_motorise` valait 0,076300 pour tout le monde, c'est-à-dire le facteur du
-- **scooter thermique**. Or l'endpoint ACV de l'API Impact CO2 distingue quatre véhicules
-- derrière ce seul mode, et l'écart n'a rien de marginal :
--
--   | slug ADEME          | libellé renvoyé   | kg CO2e/km |
--   |---------------------|-------------------|------------|
--   | `scooterelectrique` | Scooter électrique| 0,059300   |
--   | `scooter`           | Scooter thermique | 0,076300   |
--   | `moto-petite`       | Moto thermique    | 0,087200   |
--   | `moto`              | Moto thermique    | 0,214700   |
--
-- Une grosse moto émet **1,5 fois plus qu'une voiture thermique** (0,142253) et 2,8 fois plus
-- qu'un scooter. Quelqu'un qui fait 30 km par jour en grosse cylindrée voyait son poste
-- domicile-travail sous-estimé de 64 %. Et l'erreur va dans le sens le plus coûteux pour le
-- produit : elle fait passer le deux-roues pour vertueux alors qu'il peut être pire que la
-- voiture — exactement le genre de contresens que ce produit existe pour lever.
--
-- **Piège de relevé** : l'API nomme `moto-petite` et `moto` toutes les deux « Moto thermique ».
-- Le libellé ne les distingue pas, seul le slug le fait. Un contrôle « le nom correspond bien
-- au mode » aurait laissé passer une inversion.
--
-- ## Le modèle
--
-- Même mécanique que la motorisation voiture (20260904090000 puis 20260905140000) : le mode
-- « Deux-roues motorisé » reste seul dans les listes de sélection, et une question de suivi
-- s'affiche en nested reveal dès qu'il est choisi. **Quatre réponses au même niveau**, jamais
-- un second niveau « thermique ou électrique ? » puis « quelle cylindrée ? » — la profondeur
-- coûte plus cher en abandon qu'une puce de plus.
--
-- Les libellés ne montrent pas la cylindrée brute : « 250 cm³ » ne parle pas à tout le monde,
-- alors que la distinction permis A1 / grosse cylindrée est celle que les gens ont en tête.
-- La correspondance exacte reste dans les commentaires et dans le référentiel des sources.

-- ── 1. Les modes ───────────────────────────────────────────────────────────────────────
-- Le générique `deux_roues_motorise` est conservé : c'est le repli des bilans soumis avant
-- cette migration, exactement comme `voiture` reste le repli d'un moteur non renseigné.

insert into public.transport_modes (id, label, category) values
  ('deux_roues_scooter_thermique',  'Scooter thermique',        'deux_roues'),
  ('deux_roues_scooter_electrique', 'Scooter électrique',       'deux_roues'),
  ('deux_roues_moto_petite',        'Moto de petite cylindrée', 'deux_roues'),
  ('deux_roues_moto_grosse',        'Moto de grosse cylindrée', 'deux_roues')
on conflict (id) do nothing;

-- ── 2. Les facteurs ────────────────────────────────────────────────────────────────────
-- Relevés le 05/09/2026 sur https://impactco2.fr/api/v1/thematiques/ecv/transport, champ
-- `ecv` — l'ACV complète, usage + fabrication. **Jamais `/api/v1/transport`**, qui ne rend que
-- la phase d'usage (cf. v1-07 §1.5).

insert into public.emission_factors (transport_mode_id, kg_co2_per_km, source, source_ref, valid_from) values
  ('deux_roues_scooter_thermique',  0.076300, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:scooter (ecv)',            current_date),
  ('deux_roues_scooter_electrique', 0.059300, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:scooterelectrique (ecv)',  current_date),
  ('deux_roues_moto_petite',        0.087200, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:moto-petite (ecv)',        current_date),
  ('deux_roues_moto_grosse',        0.214700, 'ADEME Base Empreinte (via API Impact CO2)', 'impactco2:moto (ecv)',               current_date);

-- ── 3. Les sources de synchronisation ──────────────────────────────────────────────────
-- **Sans ces lignes, les quatre modes resteraient figés à leur valeur de seed en silence** :
-- `sync_emission_factors` ne met à jour que ce qui est déclaré ici (cf. CLAUDE.md, un test
-- pgTAP garde ce point).

insert into public.emission_factor_sources (transport_mode_id, impactco2_slugs, note) values
  ('deux_roues_scooter_thermique',  array['scooter'],            'Scooter thermique.'),
  ('deux_roues_scooter_electrique', array['scooterelectrique'],  'Scooter électrique.'),
  ('deux_roues_moto_petite',        array['moto-petite'],        'Moto thermique jusqu''à 250 cm³. L''API la nomme « Moto thermique », comme la grosse : seul le slug distingue les deux.'),
  ('deux_roues_moto_grosse',        array['moto'],               'Moto thermique au-delà de 250 cm³. Même libellé que moto-petite côté API.')
on conflict (transport_mode_id) do update
  set impactco2_slugs = excluded.impactco2_slugs, note = excluded.note;

-- ── 4. Les réponses ────────────────────────────────────────────────────────────────────
-- Deux champs indépendants, comme pour la motorisation voiture : le deux-roues du trajet
-- domicile-travail et celui des loisirs ne sont pas forcément le même. Pas de champ pour les
-- trajets longue distance : B3.4 ne propose que la voiture.

alter table public.assessment_answers
  add column commute_two_wheeler_type text,
  add column leisure_two_wheeler_type text;

alter table public.assessment_answers
  add constraint assessment_answers_commute_two_wheeler_type_check
    check (commute_two_wheeler_type in ('scooter_thermique', 'scooter_electrique', 'moto_petite', 'moto_grosse')),
  add constraint assessment_answers_leisure_two_wheeler_type_check
    check (leisure_two_wheeler_type in ('scooter_thermique', 'scooter_electrique', 'moto_petite', 'moto_grosse'));

-- ── 5. La résolution ───────────────────────────────────────────────────────────────────
-- Même contrat que `resolve_car_mode` : un type non renseigné retombe sur le générique, et un
-- mode qui n'est pas un deux-roues n'est jamais affecté.

create or replace function public.resolve_two_wheeler_mode(p_mode_id text, p_type text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_mode_id <> 'deux_roues_motorise' then p_mode_id
    when p_type = 'scooter_thermique' then 'deux_roues_scooter_thermique'
    when p_type = 'scooter_electrique' then 'deux_roues_scooter_electrique'
    when p_type = 'moto_petite' then 'deux_roues_moto_petite'
    when p_type = 'moto_grosse' then 'deux_roues_moto_grosse'
    else p_mode_id
  end;
$$;

grant execute on function public.resolve_two_wheeler_mode(text, text) to authenticated, anon;

-- ── 6. Un seul point de résolution ─────────────────────────────────────────────────────
-- `recompute_assessment_results` et `estimate_action_savings` appelaient `resolve_car_mode`
-- à six endroits. Ajouter un second appel imbriqué partout multiplierait les occasions d'en
-- oublier un — et un oubli est silencieux : le mode générique existe, son facteur existe, le
-- calcul rend un nombre. `resolve_mode` compose les deux résolutions en une, et c'est elle
-- qu'on appelle désormais ; les deux fonctions spécialisées restent pour leurs tests.

create or replace function public.resolve_mode(p_mode_id text, p_car_engine text, p_two_wheeler_type text)
returns text
language sql
immutable
set search_path = public
as $$
  select public.resolve_two_wheeler_mode(public.resolve_car_mode(p_mode_id, p_car_engine), p_two_wheeler_type);
$$;

grant execute on function public.resolve_mode(text, text, text) to authenticated, anon;

-- ── 7. Bascule des points d'appel ──────────────────────────────────────────────────────
-- `recompute_assessment_results` et `estimate_action_savings` font ensemble six appels à
-- `resolve_car_mode`. Quatre portent un mode que l'utilisateur a choisi et qui peut donc être
-- un deux-roues ; les deux autres ciblent `'voiture'` en dur (trajets longue distance, B3.4 ne
-- propose que la voiture) et restent inchangés.
--
-- Les deux corps font 16 Ko à eux deux. Les retranscrire ici pour changer quatre lignes serait
-- la meilleure façon d'y introduire une faute étrangère au sujet — et une faute silencieuse,
-- puisque le mode générique existe toujours et que le calcul rendrait un nombre dans tous les
-- cas. On part donc du corps réellement installé, et **chaque substitution est vérifiée** :
-- si un appel a changé de forme entre-temps, la migration échoue au lieu de ne rien faire.
--
-- Rejouable à froid : sur une base neuve, les migrations précédentes ont posé exactement ces
-- corps-là, donc les mêmes substitutions s'appliquent.

do $bascule$
declare
  cible record;
  src text;
  avant text;
  substitutions text[][] := array[
    array[
      'public.resolve_car_mode(a.commute_mode, a.commute_car_engine)',
      'public.resolve_mode(a.commute_mode, a.commute_car_engine, a.commute_two_wheeler_type)'
    ],
    array[
      -- Le second mode partage le champ de motorisation du premier (un seul deux-roues au
      -- foyer, cf. types/bilan.ts) ; le type de deux-roues suit la même règle.
      'public.resolve_car_mode(a.commute_second_mode, a.commute_car_engine)',
      'public.resolve_mode(a.commute_second_mode, a.commute_car_engine, a.commute_two_wheeler_type)'
    ],
    array[
      'public.resolve_car_mode(v_leisure_mode, a.leisure_car_engine)',
      'public.resolve_mode(v_leisure_mode, a.leisure_car_engine, a.leisure_two_wheeler_type)'
    ]
  ];
  i int;
  applique int;
begin
  for cible in
    select oid, proname from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('recompute_assessment_results', 'estimate_action_savings')
  loop
    src := pg_get_functiondef(cible.oid);
    applique := 0;

    for i in 1 .. array_length(substitutions, 1) loop
      avant := src;
      src := replace(src, substitutions[i][1], substitutions[i][2]);
      if src <> avant then
        applique := applique + 1;
      end if;
    end loop;

    if applique = 0 then
      raise exception
        'Aucun appel à resolve_car_mode substitué dans %. Les appels ont changé de forme : la bascule vers resolve_mode doit être refaite à la main.',
        cible.proname;
    end if;

    execute src;
  end loop;
end
$bascule$;

-- Contrôle final : plus aucun appel à `resolve_car_mode` sur un mode choisi par l'utilisateur.
-- Les deux appels restants portent le littéral `'voiture'`.
do $controle$
declare
  restants int;
begin
  select count(*) into restants
  from pg_proc p,
       lateral unnest(string_to_array(pg_get_functiondef(p.oid), E'\n')) as l(ligne)
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('recompute_assessment_results', 'estimate_action_savings')
    and l.ligne like '%resolve_car_mode%'
    and l.ligne not like '%''voiture''%';

  if restants > 0 then
    raise exception 'Il reste % appel(s) à resolve_car_mode sur un mode choisi par l''utilisateur.', restants;
  end if;
end
$controle$;
