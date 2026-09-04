-- TraceVerte V1 — increment 12, étape 2 : synchronisation automatique des facteurs ADEME.
-- Réf. docs/architecture/v1-07-audit-facteurs-et-suivi.md §1.3, issue #27, et v1-01 §2 qui
-- décrivait déjà ce mécanisme sans qu'il soit jamais construit.
--
-- Constat de l'audit : les facteurs étaient figés depuis le seed initial, une seule version
-- par mode, et rien en base ne le signalait. Le schéma était pourtant prêt
-- (`unique(transport_mode_id, valid_from)`) — il n'était simplement jamais alimenté.
--
-- ── Pourquoi du SQL pur plutôt qu'une Edge Function ────────────────────────────────────
-- v1-01 §2 anticipait « Supabase Edge Function + pg_cron », par hypothèse qu'un appel HTTP
-- imposait de sortir de Postgres. L'extension `http` (synchrone) rend l'Edge Function
-- inutile ici : pas de secret à partager entre le cron et la fonction, pas de déploiement
-- séparé à maintenir, et le même modèle que tous les autres mécanismes serveur du produit
-- (v1-02 §3 : « aucun appel réseau, aucun secret à gérer — pure fonction SQL »). Trois
-- requêtes HTTP par trimestre vers une API publique ne justifient pas une brique de plus.

create extension if not exists http with schema extensions;

-- ── Mapping référentiel -> API Impact CO2 ──────────────────────────────────────────────
-- En table plutôt qu'en dur dans la fonction : ajouter un mode au produit ne doit pas
-- demander de réécrire la fonction de synchronisation.
--
-- `reference_km` porte la règle établie en §1.1 de l'audit : le mode avion est le SEUL dont
-- la valeur renvoyée par l'API dépend de la distance demandée (l'API applique elle-même le
-- segment court / moyen / long). Il doit donc être relevé aux distances que le calcul
-- utilise réellement — `dist_flight_short` = 1500 et `dist_flight_long` = 9000 dans
-- recompute_assessment_results. Pour tous les autres modes la valeur est proportionnelle à
-- la distance, et km=100 est un relevé arbitraire mais neutre.
--
-- `impactco2_ids` est un tableau parce qu'un mode du produit peut agréger plusieurs modes de
-- l'API : `metro_tram` est la moyenne de Métro et Tramway, que la spec fonctionnelle réunit
-- en une seule réponse (B1.4).

create table public.emission_factor_sources (
  transport_mode_id text primary key references public.transport_modes(id) on delete cascade,
  impactco2_ids smallint[] not null check (array_length(impactco2_ids, 1) >= 1),
  reference_km integer not null default 100 check (reference_km > 0),
  note text
);

alter table public.emission_factor_sources enable row level security;

create policy "emission_factor_sources readable by anyone"
  on public.emission_factor_sources for select
  to anon, authenticated
  using (true);

-- Écriture réservée au serveur, comme les autres référentiels.
revoke insert, update, delete on public.emission_factor_sources from anon, authenticated;

insert into public.emission_factor_sources (transport_mode_id, impactco2_ids, reference_km, note) values
  ('voiture',                    '{4}',     100,  'Voiture thermique — le parc français reste très majoritairement thermique, ce mode générique sert de repli quand le moteur n''est pas renseigné'),
  ('voiture_thermique',          '{4}',     100,  null),
  ('voiture_electrique',         '{5}',     100,  null),
  ('deux_roues_motorise',        '{12}',    100,  'Scooter thermique — la moto > 250 cm³ (0,14) est plus de deux fois plus émettrice, le scooter est le cas majoritaire du trajet domicile-travail'),
  ('bus',                        '{9}',     100,  'Bus thermique urbain, pas l''autocar (0,033) qui relève de la longue distance'),
  ('train',                      '{15}',    100,  'TER — trajet quotidien B1.4 "Train ou RER"'),
  ('train_longue_distance',      '{2}',     100,  'TGV — poste voyages B3.3 (> 300 km), cf. v1-07 §1.2'),
  ('metro_tram',                 '{10,11}', 100,  'Moyenne Tramway / Métro : la spec n''en fait qu''une seule réponse'),
  ('velo',                       '{7}',     100,  'Vélo mécanique — le vélo à assistance électrique (0,0022) n''est pas distingué par le questionnaire'),
  ('marche',                     '{30}',    100,  null),
  ('trottinette',                '{17}',    100,  null),
  ('avion_court_moyen_courrier', '{1}',     1500, 'Relevé à la distance de référence du poste (dist_flight_short) : la valeur du mode avion dépend du km demandé'),
  ('avion_long_courrier',        '{1}',     9000, 'Relevé à la distance de référence du poste (dist_flight_long) : idem');

-- ── Journal des synchronisations ───────────────────────────────────────────────────────
-- Sans trace, une synchronisation qui ne tourne pas — ou qui tourne et n'applique rien —
-- est indétectable. C'est exactement ce qui s'est passé avec le mécanisme prévu en
-- increment 1 : jamais construit, et rien en base ne le disait.

create table public.emission_factor_sync_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  status text not null check (status in ('success', 'partial', 'error')),
  modes_updated integer not null default 0,
  detail text
);

alter table public.emission_factor_sync_runs enable row level security;
revoke select, insert, update, delete on public.emission_factor_sync_runs from anon, authenticated;

create index emission_factor_sync_runs_ran_at_idx on public.emission_factor_sync_runs(ran_at desc);

-- ── La synchronisation ─────────────────────────────────────────────────────────────────

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

  v_km integer;
  v_payloads jsonb := '{}'::jsonb;
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

    -- Une requête par distance de référence distincte (aujourd'hui : 100, 1500, 9000).
    for v_km in select distinct reference_km from public.emission_factor_sources order by 1 loop
      select * into v_response
      from extensions.http_get('https://impactco2.fr/api/v1/transport?km=' || v_km || '&displayAll=1');

      if v_response.status <> 200 then
        raise exception 'API Impact CO2 : statut % pour km=%', v_response.status, v_km;
      end if;

      v_payloads := v_payloads || jsonb_build_object(v_km::text, (v_response.content::jsonb) -> 'data');
    end loop;

    for src in select * from public.emission_factor_sources order by transport_mode_id loop
      select sum((e ->> 'value')::numeric), count(*), string_agg(e ->> 'name', ' + ' order by e ->> 'name')
        into v_sum, v_found, v_names
      from jsonb_array_elements(v_payloads -> src.reference_km::text) e
      where (e ->> 'id')::int = any (src.impactco2_ids);

      -- Un id attendu qui disparaît de la réponse signale une renumérotation côté API :
      -- on ne devine pas, on signale et on garde la valeur en place.
      if coalesce(v_found, 0) <> array_length(src.impactco2_ids, 1) then
        v_flagged := v_flagged || format('%s : %s id(s) trouvé(s) sur %s attendu(s)',
          src.transport_mode_id, coalesce(v_found, 0), array_length(src.impactco2_ids, 1));
        continue;
      end if;

      -- La colonne est numeric(8,4) : on arrondit des deux côtés pour ne pas versionner une
      -- différence que la base ne stockerait même pas.
      v_new := round((v_sum / v_found) / src.reference_km, 4);
      v_current := round(public.emission_factor(src.transport_mode_id, current_date), 4);

      if v_new = v_current then
        continue; -- valeur inchangée : pas de version de bruit
      end if;

      -- Garde-fou. Un écart de plus de 50 % s'explique bien plus probablement par une
      -- rupture côté API (renumérotation, changement d'unité) que par une révision de la
      -- Base Empreinte, et appliquer une telle valeur fausserait le bilan de tout le monde
      -- sans que personne ne s'en aperçoive. On signale pour relecture humaine plutôt que
      -- d'appliquer aveuglément — c'est le seul chiffre sur lequel repose la crédibilité du
      -- produit.
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
        'ADEME Base Empreinte (via API Impact CO2)',
        format('impactco2:%s %s (relevé à km=%s)', array_to_string(src.impactco2_ids, '+'), v_names, src.reference_km),
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
    -- journal elle-même, et c'est précisément cette trace qui manquait jusqu'ici. Le sous-bloc
    -- annule au passage les éventuelles insertions partielles de ce run.
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

-- Trimestriel : les facteurs de la Base Empreinte ne bougent pas plus souvent (v1-01 §2).
-- 1er janvier / avril / juillet / octobre à 3h UTC, avant les autres crons de la journée.
select cron.schedule(
  'sync-emission-factors',
  '0 3 1 1,4,7,10 *',
  $$select public.sync_emission_factors()$$
);

-- ── Au passage : search_path de resolve_car_mode ────────────────────────────────────────
-- L'advisor sécurité Supabase (`function_search_path_mutable`) signale cette fonction depuis
-- la migration 20260904090000. Le risque est faible ici — fonction pure, aucun accès table —
-- mais le correctif tient en une ligne et ferme un WARN dans un module qu'on vient justement
-- de retoucher. Corps inchangé.

create or replace function public.resolve_car_mode(p_mode_id text, p_engine text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_mode_id = 'voiture' and p_engine = 'electrique' then 'voiture_electrique'
    when p_mode_id = 'voiture' and p_engine = 'thermique' then 'voiture_thermique'
    else p_mode_id
  end;
$$;
