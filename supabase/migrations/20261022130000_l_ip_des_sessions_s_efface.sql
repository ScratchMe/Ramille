-- L'adresse IP et l'appareil d'une session s'effacent après 90 jours sans utilisation (22/10/2026).
--
-- ## Pourquoi
--
-- Supabase Auth note dans `auth.sessions` l'adresse IP et le navigateur ou l'appareil de la dernière
-- utilisation de chaque session, réécrits à chaque renouvellement. Le produit ne s'en sert pas, et la
-- page de confidentialité disait « sans limite de durée tant que ton compte existe ». Relevé en
-- lecture sur la production le 22/10/2026 : 139 sessions, toutes avec leur adresse, la plus ancienne
-- utilisée le 09/09/2026. **Décidé par la personne qui pilote le 22/10/2026** (`v1-35`, étape 2) :
-- les effacer d'une session restée **90 jours** sans utilisation — la durée de la purge des sessions
-- anonymes.
--
-- ## Ce que fait cette migration
--
-- `menage_des_jetons_d_auth()`, la tâche de chaque nuit (0 h 50 UTC, `20261006140000`), met à `null`
-- `ip` et `user_agent` des sessions dont la dernière utilisation date de plus de 90 jours, et rend leur
-- nombre (`sessions_effacees`).
--
-- - **La session reste.** La fermer déconnecterait la personne, et une session anonyme fermée, c'est un
--   bilan perdu. Une utilisation suivante réécrit l'adresse, ce qui est juste : le compteur repart.
-- - **La dernière utilisation** est le plus récent de `refreshed_at`, `updated_at` et `created_at`.
--   `refreshed_at` est sans fuseau chez GoTrue, qui l'écrit en UTC (d'où le `at time zone 'UTC'`).
-- - **Seules les lignes qui portent encore quelque chose** sont touchées : la nuit suivante, la même
--   session n'est pas recomptée.
-- - **On écrit dans une table de Supabase**, comme le ménage le fait déjà pour `auth.refresh_tokens`.
--   `postgres` a le droit de modifier `auth.sessions` (lu sur la production le 22/10/2026 :
--   `has_table_privilege('postgres', 'auth.sessions', 'UPDATE')` vaut `true`). Une mise à jour d'Auth
--   qui retirerait ce droit ou renommerait une colonne ferait échouer la tâche : l'alerte d'exploitation
--   la nomme alors parmi les tâches planifiées en échec, sans qu'aucune donnée soit perdue.
--
-- Par **substitution vérifiée** sur le corps installé (`SUPABASE.md` §2.3), sur deux ancres **sans fin
-- de ligne** : le corps de la production porte des fins de ligne `\r\n`, celui de la stack locale des
-- `\n` (relevé le 22/10/2026). Rejouable : le remplacement présent veut dire « déjà fait ».

do $l_ip_des_sessions$
declare
  src text;
  cible oid := 'public.menage_des_jetons_d_auth()'::regprocedure;
  ancre_declaration constant text := 'v_connexions integer;';
  remplacement_declaration constant text := E'v_connexions integer;\n  v_sessions integer;';
  ancre_retour constant text :=
    'return jsonb_build_object(''jetons_revoques'', v_jetons, ''connexions_abandonnees'', v_connexions);';
  remplacement_retour constant text :=
    E'update auth.sessions\n'
    || E'  set ip = null, user_agent = null\n'
    || E'  where (ip is not null or user_agent is not null)\n'
    || E'    and greatest(\n'
    || E'      created_at,\n'
    || E'      coalesce(updated_at, created_at),\n'
    || E'      coalesce(refreshed_at at time zone ''UTC'', created_at)\n'
    || E'    ) < now() - interval ''90 days'';\n'
    || E'  get diagnostics v_sessions = row_count;\n'
    || E'\n'
    || E'  return jsonb_build_object(''jetons_revoques'', v_jetons, ''connexions_abandonnees'', v_connexions, '
    || E'''sessions_effacees'', v_sessions);';
  n_declaration int;
  n_retour int;
begin
  src := pg_get_functiondef(cible);

  if position('''sessions_effacees''' in src) > 0 then
    return;
  end if;

  n_declaration := (length(src) - length(replace(src, ancre_declaration, ''))) / length(ancre_declaration);
  n_retour := (length(src) - length(replace(src, ancre_retour, ''))) / length(ancre_retour);
  if n_declaration <> 1 or n_retour <> 1 then
    raise exception 'menage_des_jetons_d_auth a été réécrite autrement : % déclaration(s), % retour(s) trouvés (un de chaque attendu).',
      n_declaration, n_retour;
  end if;

  src := replace(src, ancre_declaration, remplacement_declaration);
  src := replace(src, ancre_retour, remplacement_retour);
  execute src;
end
$l_ip_des_sessions$;

comment on function public.menage_des_jetons_d_auth() is
  'Le ménage que GoTrue ne fait pas sur la production : supprime les jetons de session révoqués depuis '
  'plus de deux jours et les connexions OAuth (flow_state) commencées il y a plus d''un jour, et efface '
  'l''adresse IP et l''appareil des sessions inutilisées depuis 90 jours, sans fermer la session '
  '(22/10/2026). Tâche planifiée menage-des-jetons-d-auth, chaque nuit.';

-- ── Le contrôle de fin ───────────────────────────────────────────────────────────────────────────
--
-- Sur le corps installé, sans commentaires : le rejeu d'une migration plus ancienne qui réinstallerait le
-- ménage sans l'effacement ferait tomber ce bloc au prochain rejeu de celle-ci.
do $controle$
declare
  v_corps text := regexp_replace(pg_get_functiondef('public.menage_des_jetons_d_auth()'::regprocedure),
                                 '--[^' || chr(10) || ']*', '', 'g');
begin
  if position('update auth.sessions' in v_corps) = 0
     or position('interval ''90 days''' in v_corps) = 0
     or position('''sessions_effacees''' in v_corps) = 0 then
    raise exception 'Le ménage d''Auth n''efface pas l''adresse IP des sessions inutilisées depuis 90 jours';
  end if;
  if position('delete from auth.sessions' in v_corps) > 0 then
    raise exception 'Le ménage d''Auth ne doit fermer aucune session';
  end if;
  if has_function_privilege('anon', 'public.menage_des_jetons_d_auth()', 'execute')
     or has_function_privilege('authenticated', 'public.menage_des_jetons_d_auth()', 'execute') then
    raise exception 'menage_des_jetons_d_auth est appelable par un client';
  end if;
end
$controle$;
