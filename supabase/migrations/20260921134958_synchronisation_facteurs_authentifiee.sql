-- La synchronisation des facteurs s'authentifie auprès de l'API Impact CO2.
--
-- **Ce n'est pas un correctif, c'est une assurance — et le mesurer avant d'écrire a changé
-- l'urgence du sujet.** Relevé le 21/09/2026 en appelant l'endpoint avec et sans la clé
-- fournie par l'ADEME : 47 entrées des deux côtés, mêmes slugs, **identiques champ pour
-- champ**. La seule différence est un champ `warning` qui disparaît quand on s'authentifie :
--
--   « La requête n'est pas authentifiée. Nous nous réservons le droit de couper cette API aux
--     utilisateurs anonymes, veuillez nous contacter à impactco2@ademe.fr pour obtenir une clé
--     d'API gratuite. »
--
-- Donc aucun chiffre ne bouge aujourd'hui. Ce qui bouge est le jour où l'ADEME exerce ce
-- droit : la fonction lèverait sur un statut non-200, l'échec serait consigné dans
-- `emission_factor_sync_runs` — et **ce journal n'émet aucune alerte**. La synchronisation
-- étant trimestrielle, le silence pourrait durer un trimestre avant que quelqu'un lise la
-- table.
--
-- **La clé vit au Vault, jamais dans une migration ni dans un fichier du dépôt**
-- (`impactco2_api_key`, même modèle que `resend_api_key`). Ce fichier ne porte que son nom.
--
-- **Le secret absent retombe sur l'appel anonyme plutôt que d'échouer**, et c'est délibéré :
-- la CI et la stack locale n'ont pas de Vault garni, l'API répond encore très bien sans clé,
-- et échouer dur ferait rougir la synchronisation partout où le secret n'existe pas — pour
-- un chemin qui marche. Le prix de ce repli est qu'il est **silencieux par nature** : d'où la
-- colonne `authentifie`, qui dit lequel des deux chemins a servi. Sans elle, le jour où le
-- secret disparaît du Vault, la synchronisation continuerait en anonyme sans que rien ne le
-- dise — et on retomberait exactement dans le risque que cette migration ferme.

alter table public.emission_factor_sync_runs
  add column if not exists authentifie boolean not null default false;

comment on column public.emission_factor_sync_runs.authentifie is
  'Vrai quand le passage a porté la clé Impact CO2 du Vault. Faux = repli anonyme, qui marche encore mais que l''ADEME se réserve le droit de couper.';

create or replace function public.sync_emission_factors()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_status text := 'success';
  v_detail text;
  v_updated integer := 0;
  v_flagged text[] := '{}';

  v_payload jsonb;
  v_response extensions.http_response;
  v_key text;
  v_authentifie boolean := false;

  src record;
  v_sum numeric;
  v_found integer;
  v_names text;
  v_new numeric;
  v_current numeric;
begin
  -- La lecture du secret est HORS du bloc qui attrape, pour que `v_authentifie` soit juste
  -- même si l'appel échoue ensuite : le journal doit dire quel chemin a été tenté, pas
  -- seulement lequel a abouti.
  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'impactco2_api_key';

  v_authentifie := coalesce(btrim(v_key), '') <> '';

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

    if v_authentifie then
      select * into v_response
      from extensions.http((
        'GET',
        'https://impactco2.fr/api/v1/thematiques/ecv/transport',
        array[extensions.http_header('Authorization', 'Bearer ' || btrim(v_key))],
        null,
        null
      )::extensions.http_request);
    else
      select * into v_response
      from extensions.http_get('https://impactco2.fr/api/v1/thematiques/ecv/transport');
    end if;

    if v_response.status <> 200 then
      raise exception 'API Impact CO2 (ecv/transport) : statut %', v_response.status;
    end if;

    v_payload := (v_response.content::jsonb) -> 'data';

    if v_payload is null or jsonb_array_length(v_payload) = 0 then
      raise exception 'API Impact CO2 (ecv/transport) : réponse vide';
    end if;

    for src in select * from public.emission_factor_sources order by transport_mode_id loop
      select sum((e ->> 'ecv')::numeric), count(*), string_agg(e ->> 'name', ' + ' order by e ->> 'name')
        into v_sum, v_found, v_names
      from jsonb_array_elements(v_payload) e
      where e ->> 'slug' = any (src.impactco2_slugs);

      if coalesce(v_found, 0) <> array_length(src.impactco2_slugs, 1) then
        v_flagged := v_flagged || format('%s : %s slug(s) trouvé(s) sur %s attendu(s)',
          src.transport_mode_id, coalesce(v_found, 0), array_length(src.impactco2_slugs, 1));
        continue;
      end if;

      v_new := round(v_sum / v_found, 6);
      v_current := round(public.emission_factor(src.transport_mode_id, current_date), 6);

      if v_new = v_current then
        continue;
      end if;

      if (v_current > 0 and (v_new > v_current * 1.5 or v_new < v_current * 0.5))
         or (v_current = 0 and v_new <> 0) then
        v_flagged := v_flagged || format('%s : %s -> %s, écart trop important pour être appliqué sans relecture',
          src.transport_mode_id, v_current, v_new);
        continue;
      end if;

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
    v_status := 'error';
    v_detail := sqlerrm;
    v_updated := 0;
  end;

  insert into public.emission_factor_sync_runs (status, modes_updated, detail, authentifie)
  values (v_status, v_updated, v_detail, v_authentifie);

  if v_status = 'error' then
    raise warning 'sync_emission_factors a échoué : %', v_detail;
  end if;
end;
$function$;

-- Contrôle de la migration : la fonction doit porter les deux chemins, et la colonne doit
-- exister. Rejouable tel quel — `add column if not exists` et `create or replace`.
do $$
declare
  v_corps text := pg_get_functiondef('public.sync_emission_factors()'::regprocedure);
begin
  if position('impactco2_api_key' in v_corps) = 0 then
    raise exception 'sync_emission_factors ne lit pas le secret du Vault';
  end if;
  if position('http_get(' in v_corps) = 0 then
    raise exception 'sync_emission_factors a perdu son repli anonyme';
  end if;
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'emission_factor_sync_runs'
       and column_name = 'authentifie'
  ) then
    raise exception 'la colonne authentifie manque au journal';
  end if;
end $$;
