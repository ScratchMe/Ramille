-- TraceVerte V1 — étape 0 de la reprise du 05/09/2026 : passer tous les facteurs d'émission
-- de la phase d'usage seule à l'analyse de cycle de vie complète.
-- Réf. docs/architecture/v1-07-audit-facteurs-et-suivi.md §1.5.
--
-- ── Le défaut ──────────────────────────────────────────────────────────────────────────
--
-- `sync_emission_factors()` et le seed initial interrogeaient `/api/v1/transport` de l'API
-- Impact CO2. Cet endpoint ne renvoie **que la phase d'usage** — la combustion ou
-- l'électricité consommée en roulant. La fabrication du véhicule et des infrastructures en
-- est absente.
--
-- La preuve est arithmétique. L'endpoint `/api/v1/thematiques/ecv/transport` décompose chaque
-- mode en composantes (`footprintDetail`) : id5 = fabrication, id6 = usage, id7 = forçage
-- radiatif pour l'avion. Or nos valeurs stockées correspondaient **exactement à id6**, jamais
-- au total :
--
--   voiturethermique   ACV 0,142253 = fabrication 0,031696 + usage 0,110558   (nous : 0,1106)
--   voitureelectrique  ACV 0,067365 = fabrication 0,055277 + usage 0,012088   (nous : 0,0121)
--   tgv                ACV 0,002930 = fabrication 0,000630 + usage 0,002300   (nous : 0,0023)
--   velo               ACV 0,000170 = fabrication 0,000170 + usage 0          (nous : 0,0000)
--
-- ── Pourquoi c'est grave, et pas seulement imprécis ────────────────────────────────────
--
-- 1. **On comparait des choux et des carottes.** Le repère de 2,8 t affiché sur la
--    restitution (SDES, cf. `src/constants/carbon-reference.ts`) est une empreinte carbone
--    ACV complète. On y confrontait un total calculé en usage seul : le produit flattait
--    systématiquement l'utilisateur, sur l'écran même dont dépend sa prise de conscience.
--
-- 2. **Deux conclusions s'inversaient.** En usage seul le bus thermique (0,1135) émettait
--    plus que la voiture thermique (0,1106) ; en ACV c'est l'inverse (0,1224 contre 0,1423),
--    le bus gagne 14 %. Et surtout l'écart électrique / thermique passe de **×9 à ×2,1** :
--    on effaçait la fabrication de la batterie, qui est précisément l'objection que tout le
--    monde oppose à la voiture électrique.
--
-- 3. **Le conseil devenait faux.** Recommander le vélo ou la trottinette comme « zéro
--    émission » alors que leur impact est presque entièrement en fabrication (0,000170 et
--    0,022900, soit 100 % et 92 % du total) est le genre de raccourci qui décrédibilise le
--    reste du produit.
--
-- ── Correction en place, et non nouvelle version ───────────────────────────────────────
--
-- `emission_factors` est versionné par date et `emission_factor(mode, date)` borne chaque
-- bilan à la sienne, pour qu'une révision ADEME ne réécrive jamais un résultat déjà montré
-- (v1-01 §3). Ce mécanisme ne doit **pas** s'appliquer ici : il ne s'agit pas d'une révision
-- de la Base Empreinte mais d'une erreur de source de notre côté. Versionner ferait
-- apparaître, entre un bilan d'avant et un bilan d'après, un bond de +29 % qui ne
-- correspondrait à aucun changement d'habitude — exactement ce que l'écran /suivi promet de
-- ne jamais faire. Même raisonnement, et même traitement, que la correction de facteurs de
-- la migration 20260904140000 : on corrige les lignes existantes et on recalcule tout.

-- ── 1. Précision ───────────────────────────────────────────────────────────────────────
-- numeric(8,4) suffisait pour des facteurs d'usage. Il ne suffit plus pour des modes dont
-- l'impact est presque entièrement en fabrication : le vélo (0,000170) s'arrondirait à
-- 0,0002, le TGV (0,002930) à 0,0029.

alter table public.emission_factors
  alter column kg_co2_per_km type numeric(10, 6);

-- ── 2. Le mapping se clé désormais sur des slugs ───────────────────────────────────────
-- L'endpoint ACV n'expose pas les identifiants numériques de `/transport` — il se clé sur
-- des slugs. Bonne nouvelle au passage : il publie les segments aériens comme des entrées
-- distinctes (`avion-courtcourrier`, `avion-moyencourrier`, `avion-longcourrier`), ce qui
-- rend `reference_km` inutile. Ce paramètre n'existait que pour contourner le fait que
-- `/transport` faisait dépendre la valeur de l'avion du km demandé.
--
-- ATTENTION en cas de reprise : le choix du slug aérien doit rester cohérent avec les
-- distances de référence codées dans `recompute_assessment_results` (dist_flight_short =
-- 1500 km, dist_flight_long = 9000 km). 1500 km est un moyen-courrier, d'où
-- `avion-moyencourrier` malgré le nom de notre mode.

alter table public.emission_factor_sources
  add column if not exists impactco2_slugs text[];

update public.emission_factor_sources set impactco2_slugs = case transport_mode_id
  when 'voiture'                    then array['voiturethermique']
  when 'voiture_thermique'          then array['voiturethermique']
  when 'voiture_electrique'         then array['voitureelectrique']
  when 'deux_roues_motorise'        then array['scooter']
  when 'bus'                        then array['busthermique']
  when 'train'                      then array['ter']
  when 'train_longue_distance'      then array['tgv']
  when 'metro_tram'                 then array['metro', 'tramway']
  when 'velo'                       then array['velo']
  when 'marche'                     then array['marche']
  when 'trottinette'                then array['trottinette']
  when 'avion_court_moyen_courrier' then array['avion-moyencourrier']
  when 'avion_long_courrier'        then array['avion-longcourrier']
end;

-- Un mode sans slug resterait figé en silence à sa valeur de seed — c'est le défaut T3 que
-- l'étape 2 avait justement fermé. La contrainte le rend impossible.
alter table public.emission_factor_sources
  alter column impactco2_slugs set not null,
  add constraint emission_factor_sources_slugs_non_vide
    check (array_length(impactco2_slugs, 1) >= 1);

alter table public.emission_factor_sources
  drop column impactco2_ids,
  drop column reference_km;

update public.emission_factor_sources set note = 'Vélo mécanique. Son ACV est intégralement de la fabrication (usage nul) — d''où une valeur non nulle là où /transport renvoyait 0. Le vélo à assistance électrique (0,010950) n''est pas distingué par le questionnaire.'
  where transport_mode_id = 'velo';
update public.emission_factor_sources set note = 'Relevé sur le segment moyen-courrier : dist_flight_short vaut 1500 km dans recompute_assessment_results, ce qui est un moyen-courrier au sens de l''ADEME.'
  where transport_mode_id = 'avion_court_moyen_courrier';
update public.emission_factor_sources set note = 'Segment long-courrier, cohérent avec dist_flight_long = 9000 km.'
  where transport_mode_id = 'avion_long_courrier';
update public.emission_factor_sources set note = 'Trottinette à assistance électrique : 92 % de son ACV est la fabrication (0,022900 sur 0,024900). En usage seul elle paraissait douze fois moins émettrice qu''elle ne l''est.'
  where transport_mode_id = 'trottinette';

-- ── 3. Les valeurs ─────────────────────────────────────────────────────────────────────
-- Relevées le 05/09/2026 sur https://impactco2.fr/api/v1/thematiques/ecv/transport?detail=1
-- Le commentaire de chaque ligne porte l'ancienne valeur (usage seul) et le rapport, pour
-- que l'ampleur de la correction reste lisible sans rejouer l'analyse.

update public.emission_factors as f set
  kg_co2_per_km = v.acv,
  source = 'ADEME Base Empreinte — ACV complète (via API Impact CO2)',
  source_ref = format('impactco2:ecv/transport %s (relevé du 05/09/2026)', v.slugs)
from (values
  ('voiture',                    0.142253, 'voiturethermique'),    -- 0,1106  ->  x1,29  (fabrication 0,031696)
  ('voiture_thermique',          0.142253, 'voiturethermique'),    -- 0,1106  ->  x1,29
  ('voiture_electrique',         0.067365, 'voitureelectrique'),   -- 0,0121  ->  x5,57  (fabrication 0,055277 : la batterie)
  ('deux_roues_motorise',        0.076300, 'scooter'),             -- 0,0604  ->  x1,26
  ('bus',                        0.122420, 'busthermique'),        -- 0,1135  ->  x1,08
  ('train',                      0.027690, 'ter'),                 -- 0,0229  ->  x1,21
  ('train_longue_distance',      0.002930, 'tgv'),                 -- 0,0023  ->  x1,27
  ('metro_tram',                 0.004360, 'metro+tramway'),       -- 0,0040  ->  x1,09
  ('velo',                       0.000170, 'velo'),                -- 0,0000  ->  fabrication seule
  ('marche',                     0.000000, 'marche'),              -- 0,0000  ->  inchangé, seul mode réellement nul
  ('trottinette',                0.024900, 'trottinette'),         -- 0,0020  ->  x12,45 (fabrication 0,022900)
  ('avion_court_moyen_courrier', 0.184661, 'avion-moyencourrier'), -- 0,1843  ->  x1,00  (fabrication négligeable)
  ('avion_long_courrier',        0.177894, 'avion-longcourrier')   -- 0,1776  ->  x1,00
) as v(mode_id, acv, slugs)
where f.transport_mode_id = v.mode_id;

-- Un mode du référentiel sans facteur ACV contaminerait tout total où il apparaît.
do $$
declare v_manquants text;
begin
  select string_agg(m.id, ', ') into v_manquants
  from public.transport_modes m
  where not exists (
    select 1 from public.emission_factors f
    where f.transport_mode_id = m.id
      and f.source like '%ACV complète%'
  );
  if v_manquants is not null then
    raise exception 'Facteurs ACV manquants pour : %', v_manquants;
  end if;
end;
$$;

-- ── 4. La synchronisation interroge désormais l'endpoint ACV ───────────────────────────
-- Corriger les valeurs sans corriger la synchronisation ne servirait à rien : le prochain
-- passage trimestriel les ramènerait à la phase d'usage. C'est le vrai correctif, le reste
-- n'est que la reprise de l'historique.
--
-- Trois simplifications au passage : plus de boucle sur les distances de référence (l'ACV
-- publie les segments aériens séparément), donc **un seul appel HTTP** au lieu de trois, et
-- plus de division par `reference_km` puisque les valeurs sont déjà par kilomètre.

create or replace function public.sync_emission_factors()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_status text := 'success';
  v_detail text;
  v_updated integer := 0;
  v_flagged text[] := '{}';

  v_payload jsonb;
  v_response extensions.http_response;

  src record;
  v_sum numeric;
  v_found integer;
  v_names text;
  v_new numeric;
  v_current numeric;
begin
  begin
    -- Un cron ne doit jamais rester suspendu sur une API tierce.
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

    select * into v_response
    from extensions.http_get('https://impactco2.fr/api/v1/thematiques/ecv/transport');

    if v_response.status <> 200 then
      raise exception 'API Impact CO2 (ecv/transport) : statut %', v_response.status;
    end if;

    v_payload := (v_response.content::jsonb) -> 'data';

    if v_payload is null or jsonb_array_length(v_payload) = 0 then
      raise exception 'API Impact CO2 (ecv/transport) : réponse vide';
    end if;

    for src in select * from public.emission_factor_sources order by transport_mode_id loop
      -- `ecv` est l'empreinte de cycle de vie complète : usage + fabrication (+ forçage
      -- radiatif pour l'avion). C'est le champ à lire, et le seul comparable au repère
      -- national auquel la restitution confronte le bilan.
      select sum((e ->> 'ecv')::numeric), count(*), string_agg(e ->> 'name', ' + ' order by e ->> 'name')
        into v_sum, v_found, v_names
      from jsonb_array_elements(v_payload) e
      where e ->> 'slug' = any (src.impactco2_slugs);

      -- Un slug attendu qui disparaît signale un renommage côté API : on ne devine pas, on
      -- signale et on garde la valeur en place.
      if coalesce(v_found, 0) <> array_length(src.impactco2_slugs, 1) then
        v_flagged := v_flagged || format('%s : %s slug(s) trouvé(s) sur %s attendu(s)',
          src.transport_mode_id, coalesce(v_found, 0), array_length(src.impactco2_slugs, 1));
        continue;
      end if;

      -- La colonne est numeric(10,6) : on arrondit des deux côtés pour ne pas versionner une
      -- différence que la base ne stockerait même pas.
      v_new := round(v_sum / v_found, 6);
      v_current := round(public.emission_factor(src.transport_mode_id, current_date), 6);

      if v_new = v_current then
        continue; -- valeur inchangée : pas de version de bruit
      end if;

      -- Garde-fou inchangé sur le principe. Il prend une importance nouvelle depuis cette
      -- migration : c'est lui qui aurait signalé le passage usage -> ACV si le changement
      -- était venu de l'API plutôt que de nous (x5,57 sur la voiture électrique, x12,45 sur
      -- la trottinette sont très au-delà des 50 %). Il ne pouvait rien voir ici parce que
      -- l'erreur portait sur l'endpoint interrogé, pas sur la valeur renvoyée — d'où la
      -- vérification ajoutée juste en dessous.
      if (v_current > 0 and (v_new > v_current * 1.5 or v_new < v_current * 0.5))
         or (v_current = 0 and v_new <> 0) then
        v_flagged := v_flagged || format('%s : %s -> %s, écart trop important pour être appliqué sans relecture',
          src.transport_mode_id, v_current, v_new);
        continue;
      end if;

      -- Nouvelle VERSION, jamais un écrasement : un bilan déjà soumis garde les facteurs de
      -- sa date (v1-01 §3, garanti par emission_factor(mode, date)).
      insert into public.emission_factors (transport_mode_id, kg_co2_per_km, source, source_ref, valid_from)
      values (
        src.transport_mode_id, v_new,
        'ADEME Base Empreinte — ACV complète (via API Impact CO2)',
        format('impactco2:ecv/transport %s (%s)', array_to_string(src.impactco2_slugs, '+'), v_names),
        current_date
      )
      on conflict (transport_mode_id, valid_from) do update set
        kg_co2_per_km = excluded.kg_co2_per_km,
        source = excluded.source,
        source_ref = excluded.source_ref;

      v_updated := v_updated + 1;
    end loop;

    if array_length(v_flagged, 1) > 0 then
      v_status := 'partial';
      v_detail := array_to_string(v_flagged, ' | ');
    end if;

  exception when others then
    -- L'échec est enregistré plutôt que propagé : une exception ferait perdre la ligne de
    -- journal elle-même, et c'est précisément cette trace qui manquait jusqu'ici.
    v_status := 'error';
    v_detail := sqlerrm;
    v_updated := 0;
  end;

  insert into public.emission_factor_sync_runs (status, modes_updated, detail)
  values (v_status, v_updated, v_detail);

  if v_status = 'error' then
    raise warning 'sync_emission_factors a échoué : %', v_detail;
  end if;
end;
$$;

revoke execute on function public.sync_emission_factors() from public, anon, authenticated;

-- ── 5. Recalcul de tous les bilans ─────────────────────────────────────────────────────
-- Sans ce passage, les résultats figés dans `assessment_results` resteraient calculés en
-- usage seul et l'écran /suivi montrerait un bond artificiel au prochain bilan.
-- `recompute_assessment_results` régénère au passage le plan de chaque utilisateur.

do $$
declare
  rec record;
  v_count integer := 0;
begin
  for rec in
    select id from public.assessments where status = 'completed' order by submitted_at
  loop
    perform public.recompute_assessment_results(rec.id);
    v_count := v_count + 1;
  end loop;
  raise notice 'Bilans recalculés en ACV complète : %', v_count;
end;
$$;
