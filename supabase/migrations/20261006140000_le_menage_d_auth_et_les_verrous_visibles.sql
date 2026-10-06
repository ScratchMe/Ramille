-- Le ménage d'Auth, et les verrous e-mail rendus visibles (06/10/2026, suite de la seconde passe de
-- sécurité, `v1-27` §12.39 et §12.40).
--
-- ── 1. Le ménage que Supabase ne fait pas ─────────────────────────────────────────────────────────
--
-- Le ménage de GoTrue est éteint sur la production, et il ne se règle pas au tableau de bord : les
-- jetons de session révoqués et les connexions OAuth commencées puis abandonnées (`auth.flow_state`)
-- y restent pour toujours. Relevé en lecture le 05/10/2026 : 25 jetons révoqués de plus de deux jours,
-- des `flow_state` de sept jours. Deux raisons de les effacer :
--   * **le volume** : chaque rafraîchissement de session écrit un jeton et révoque le précédent, et
--     Supabase en accepte jusqu'à 150 par cinq minutes et par adresse IP — une session qui boucle sur
--     le rafraîchissement remplit la base de 500 Mo sans qu'aucun plafond de `public.*` ne le voie ;
--   * **la vie privée** : une ligne de `flow_state` garde les jetons du fournisseur
--     (`provider_access_token`, `provider_refresh_token`), ceux de Google compris, longtemps après
--     que la connexion a abouti ou échoué.
--
-- Les critères sont prudents, et ceux du ménage de GoTrue lui-même :
--   * un jeton **révoqué** depuis plus de **deux jours**. Le jeton en cours d'une session ne l'est
--     jamais, donc aucune session ne tombe ; GoTrue ne relit un jeton révoqué que pour détecter sa
--     réutilisation, dans les dix secondes qui suivent sa révocation ;
--   * une connexion commencée il y a plus d'**un jour** : un échange PKCE se conclut en minutes.
-- **Les sessions elles-mêmes ne sont pas touchées** : en fermer une après une longue inactivité
-- déconnecterait quelqu'un, et c'est une décision de produit (`v1-27` §12.40). Les sessions anonymes
-- partent déjà avec la purge des quatre-vingt-dix jours.
--
-- **On écrit ici dans des tables qui appartiennent à Supabase.** `postgres` y a le droit de supprimer
-- (lu sur la production le 06/10/2026 : `has_table_privilege('postgres', 'auth.refresh_tokens',
-- 'delete')` vaut `true`). Une mise à jour d'Auth qui renommerait une colonne ferait échouer la tâche :
-- l'alerte d'exploitation la nomme alors parmi les « tâches planifiées en échec », sans qu'aucune
-- donnée ne soit perdue.
--
-- ── 2. Les deux verrous e-mail, rendus visibles ──────────────────────────────────────────────────
--
-- Deux verrous de la passe se fermaient en silence, et l'alerte d'exploitation ne les voyait pas :
--   * **le verrou muet de `/recover`** : le produit n'envoie jamais d'e-mail de récupération, mais
--     Supabase l'expose, et une demande sur une adresse arme le minuteur d'une minute que la
--     reconnexion par code partage — la reconnexion légitime reçoit 429. Mesuré en local le
--     06/10/2026 : le journal d'Auth (`auth.audit_log_entries`) écrit la même action
--     (`user_recovery_requested`) pour une récupération et pour une reconnexion, donc ne les distingue
--     pas ; **le hook d'envoi, si** — il est appelé pour la récupération et l'inscrit déjà dans
--     `envois_d_e_mails_d_auth` (issue `type_ignore`), sans rien envoyer. Toute ligne de ce genre est
--     donc une demande que Ramille ne fait jamais : l'alerte la dit, avec le nombre d'adresses. Le
--     journal ne garde qu'un jour, ce que l'alerte, horaire, couvre. Le hook n'est appelé que pour une
--     adresse qui a un compte, mais l'alerte n'en dit rien à personne d'autre que l'exploitation ;
--   * **le plafond horaire global de Supabase** (30 par heure), vérifié **avant** le hook : il ne
--     laisse aucune ligne en base. Seule l'app le voit — `over_email_send_rate_limit` —, et elle le
--     signale désormais par un événement d'usage, `connexion_limite`. Le même code sert à la minute
--     d'une adresse : un événement isolé est souvent quelqu'un qui redemande trop vite, d'où le seuil
--     de trois dans l'alerte.
-- Et un troisième, le nôtre : **le plafond quotidien du projet** dans le hook (200 rattachements par
-- jour avec Brevo). Atteint, plus aucun compte ne peut se rattacher par e-mail avant que la fenêtre de
-- vingt-quatre heures passe — la reconnexion, elle, n'est jamais plafonnée par le hook —, et le hook se
-- tait par non-divulgation. L'alerte le dit. **Il reste sous le plafond des envois de l'alerte**, comme
-- tout ce qu'un client provoque : ce sont des demandes de clients, chacune au prix d'un captcha, qui le
-- font atteindre, et un signal du serveur passerait ce plafond — une attaque continue ferait partir un
-- e-mail d'alerte par heure, sur le quota de Resend que les rappels partagent.
--
-- Trois fonctions de l'alerte sont réécrites depuis `pg_get_functiondef` de leur corps installé
-- (`20261006130000` pour le texte, `20261005170000` pour le relevé et `alerte_a_dire`) : seules les
-- lignes nommées changent. `alerte_du_serveur` ne l'est pas : aucun des trois signaux n'en est.

-- ── 1. Le ménage ─────────────────────────────────────────────────────────────────────────────────

create or replace function public.menage_des_jetons_d_auth()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_jetons integer;
  v_connexions integer;
begin
  delete from auth.refresh_tokens
  where revoked and updated_at < now() - interval '2 days';
  get diagnostics v_jetons = row_count;

  delete from auth.flow_state
  where coalesce(updated_at, created_at) < now() - interval '1 day';
  get diagnostics v_connexions = row_count;

  return jsonb_build_object('jetons_revoques', v_jetons, 'connexions_abandonnees', v_connexions);
end;
$$;

comment on function public.menage_des_jetons_d_auth() is
  'Le ménage que GoTrue ne fait pas sur la production : supprime les jetons de session révoqués depuis '
  'plus de deux jours et les connexions OAuth (flow_state) commencées il y a plus d''un jour. Ne touche '
  'à aucune session. Tâche planifiée menage-des-jetons-d-auth, chaque nuit.';

revoke execute on function public.menage_des_jetons_d_auth() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('menage-des-jetons-d-auth');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'menage-des-jetons-d-auth',
  '50 0 * * *',
  $$select public.menage_des_jetons_d_auth()$$
);

-- ── 2. L'événement de la limite d'envoi ──────────────────────────────────────────────────────────
--
-- Le pendant côté client est `src/types/analytics.ts` (`USAGE_EVENT_NAMES`, `UsageEventPropsByName`),
-- dans la même PR ; la troisième copie de la liste vit dans `12_usage_events.test.sql` (`bag_eq`).

insert into public.usage_event_types (name, description) values
  (
    'connexion_limite',
    'Supabase a refusé d''envoyer un code de connexion (over_email_send_rate_limit, avant le hook d''envoi) : le plafond horaire du projet, ou la minute d''une adresse. props.ecran : « email » (rattachement, ou reconnexion d''une adresse déjà prise), « retrouver », « suppression », « renvoi » (le renvoi depuis la saisie du code). Aucune adresse. Lu par l''alerte d''exploitation, à partir de trois.'
  )
on conflict (name) do nothing;

-- ── 3. L'alerte ──────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.releve_des_alertes(p_depuis timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select jsonb_build_object(
    'pannes', (
      select count(*) from public.usage_events
      where name = 'app_error' and occurred_at > p_depuis
    ),
    'pannes_detail', (
      select coalesce(jsonb_agg(ligne order by (ligne ->> 'nombre')::int desc), '[]'::jsonb)
      from (
        select jsonb_build_object('route', route, 'categorie', categorie, 'nombre', count(*)) as ligne
        from (
          -- La forme, jamais le texte du client (voir l'en-tête).
          select
            case when props ->> 'route' ~ '^/[a-z/_-]{0,47}$' then props ->> 'route'
              else 'route hors forme' end as route,
            case when props ->> 'category' ~ '^[a-z]{1,16}$' then props ->> 'category'
              else 'hors forme' end as categorie
          from public.usage_events
          where name = 'app_error' and occurred_at > p_depuis
        ) e
        group by route, categorie
        order by count(*) desc
        limit 5
      ) t
    ),
    'soumissions_en_echec', (
      select count(*) from public.usage_events
      where name = 'bilan_submit_error' and occurred_at > p_depuis
    ),
    'taches_en_echec', (
      select coalesce(jsonb_agg(distinct j.jobname), '[]'::jsonb)
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      where d.status = 'failed' and d.end_time > p_depuis
    ),
    'envois_en_echec', (
      select count(*) from public.reminder_send_runs
      where status in ('error', 'partial', 'skipped') and ran_at > p_depuis
    ),
    'synchronisations_en_echec', (
      select count(*) from public.emission_factor_sync_runs
      where status in ('error', 'partial') and ran_at > p_depuis
    ),
    'purges_bloquees', (
      select count(*) from public.purge_runs
      where status = 'blocked' and ran_at > p_depuis
    ),
    'plans_en_echec', (
      select coalesce(sum(echecs), 0) from public.plan_cycle_runs
      where ran_at > p_depuis
    ),
    -- La taille de la base, en Mo : au-delà de 500, le plan gratuit la passe en lecture seule pour
    -- tout le monde (passe avant le lancement, 05/10/2026).
    'taille_de_la_base_mo', (
      select (pg_database_size(current_database()) / 1048576)::integer
    ),
    'rappels_bloques', (
      select count(*) from analytics.rappels_bloques
      where not (genre = 'veille' and statut = 'failed')
    ),
    -- Les demandes d'un e-mail d'Auth que le produit n'envoie jamais (`recovery` surtout) : le hook les
    -- journalise sans rien envoyer. Chacune arme le minuteur d'une minute de l'adresse, partagé avec la
    -- reconnexion par code (06/10/2026, voir l'en-tête de 20261006140000).
    'demandes_ignorees', (
      select count(*) from public.envois_d_e_mails_d_auth
      where issue = 'type_ignore' and cree_le > p_depuis
    ),
    'demandes_ignorees_adresses', (
      select count(distinct adresse_empreinte) from public.envois_d_e_mails_d_auth
      where issue = 'type_ignore' and cree_le > p_depuis
    ),
    -- Le plafond quotidien des rattachements atteint : le hook ne fait plus partir aucun code de
    -- rattachement avant vingt-quatre heures — et il se tait, par non-divulgation.
    'plafond_du_projet_atteint', (
      select count(*) from public.envois_d_e_mails_d_auth
      where issue = 'plafond_projet' and cree_le > p_depuis
    ),
    -- Les codes que Supabase a refusés avant même le hook (le plafond horaire du projet, ou la minute
    -- d'une adresse) : seule l'app les voit, et les signale (`connexion_limite`).
    'codes_refuses_par_la_limite', (
      select count(*) from public.usage_events
      where name = 'connexion_limite' and occurred_at > p_depuis
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.texte_de_l_alerte(p_releve jsonb, p_depuis timestamp with time zone, p_rappels_bloques_vus integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_lignes text[] := array[]::text[];
  v_detail text;
begin
  if (p_releve ->> 'pannes')::int > 0 then
    select string_agg(format('%s · %s (%s)', l ->> 'route', l ->> 'categorie', l ->> 'nombre'), ', ')
      into v_detail
    from jsonb_array_elements(p_releve -> 'pannes_detail') as l;
    v_lignes := v_lignes || format('- Pannes de l''app (app_error) : %s — %s', p_releve ->> 'pannes', v_detail);
  end if;
  if (p_releve ->> 'soumissions_en_echec')::int > 0 then
    v_lignes := v_lignes || format('- Soumissions de bilan en échec (bilan_submit_error) : %s', p_releve ->> 'soumissions_en_echec');
  end if;
  if jsonb_array_length(p_releve -> 'taches_en_echec') > 0 then
    select string_agg(t, ', ') into v_detail from jsonb_array_elements_text(p_releve -> 'taches_en_echec') as t;
    v_lignes := v_lignes || format('- Tâches planifiées en échec : %s', v_detail);
  end if;
  if (p_releve ->> 'envois_en_echec')::int > 0 then
    v_lignes := v_lignes || format('- Passages d''envoi des rappels en échec, partiels ou sautés : %s', p_releve ->> 'envois_en_echec');
  end if;
  if (p_releve ->> 'synchronisations_en_echec')::int > 0 then
    v_lignes := v_lignes || format('- Synchronisations des facteurs ADEME non réussies : %s', p_releve ->> 'synchronisations_en_echec');
  end if;
  if (p_releve ->> 'purges_bloquees')::int > 0 then
    v_lignes := v_lignes || format('- Purges des sessions anonymes ralenties par la garde de volume (des comptes qui portent un bilan sont partis, d''autres attendent) : %s', p_releve ->> 'purges_bloquees');
  end if;
  if coalesce((p_releve ->> 'plans_en_echec')::int, 0) > 0 then
    v_lignes := v_lignes || format('- Échecs de la préparation nocturne des plans (generate_plan_cycles) : %s', p_releve ->> 'plans_en_echec');
  end if;
  if coalesce((p_releve ->> 'taille_de_la_base_mo')::int, 0) >= 300 then
    v_lignes := v_lignes || format('- Taille de la base : %s Mo, sur les 500 du plan gratuit — au-delà, elle passe en lecture seule pour tout le monde',
      p_releve ->> 'taille_de_la_base_mo');
  end if;
  if coalesce((p_releve ->> 'plafond_du_projet_atteint')::int, 0) > 0 then
    v_lignes := v_lignes || format('- Plafond quotidien des rattachements par e-mail atteint (%s demandes retenues) : plus aucun compte ne se rattache par e-mail avant vingt-quatre heures ; la reconnexion passe',
      p_releve ->> 'plafond_du_projet_atteint');
  end if;
  if coalesce((p_releve ->> 'demandes_ignorees')::int, 0) > 0 then
    v_lignes := v_lignes || format('- Demandes d''un e-mail que Ramille n''envoie jamais (récupération de mot de passe…) : %s, sur %s adresse(s) — chacune bloque une minute la reconnexion par code de son adresse',
      p_releve ->> 'demandes_ignorees', p_releve ->> 'demandes_ignorees_adresses');
  end if;
  if coalesce((p_releve ->> 'codes_refuses_par_la_limite')::int, 0) >= 3 then
    v_lignes := v_lignes || format('- Codes de connexion refusés par la limite d''envoi de Supabase (connexion_limite) : %s — le plafond horaire du projet est peut-être épuisé ; les Logs Auth du tableau de bord disent lequel',
      p_releve ->> 'codes_refuses_par_la_limite');
  end if;
  if (p_releve ->> 'rappels_bloques')::int > p_rappels_bloques_vus then
    v_lignes := v_lignes || format('- Rappels bloqués : %s (%s de plus qu''au relevé précédent)',
      p_releve ->> 'rappels_bloques', (p_releve ->> 'rappels_bloques')::int - p_rappels_bloques_vus);
  end if;

  return format(
    E'Bonjour,\n\nDepuis le %s (heure de Paris), l''exploitation de Ramille a relevé :\n\n%s\n\n'
    'Les requêtes pour y voir clair : docs/exploitation/README.md §8, et docs/exploitation/remontee-erreurs.md §4 '
    'pour les pannes de l''app.\n\n'
    'Pour couper ces alertes : tableau de bord Supabase, Table Editor, table alertes_d_exploitation, décocher « actives ».',
    to_char(p_depuis at time zone 'Europe/Paris', 'DD/MM/YYYY à HH24"h"MI'),
    array_to_string(v_lignes, E'\n')
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.alerte_a_dire(p_releve jsonb, p_rappels_bloques_vus integer)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select (p_releve ->> 'pannes')::int > 0
      or (p_releve ->> 'soumissions_en_echec')::int > 0
      or jsonb_array_length(p_releve -> 'taches_en_echec') > 0
      or (p_releve ->> 'envois_en_echec')::int > 0
      or (p_releve ->> 'synchronisations_en_echec')::int > 0
      or (p_releve ->> 'purges_bloquees')::int > 0
      or coalesce((p_releve ->> 'plans_en_echec')::int, 0) > 0
      or (p_releve ->> 'rappels_bloques')::int > p_rappels_bloques_vus
      or coalesce((p_releve ->> 'taille_de_la_base_mo')::int, 0) >= 300
      or coalesce((p_releve ->> 'plafond_du_projet_atteint')::int, 0) > 0
      or coalesce((p_releve ->> 'demandes_ignorees')::int, 0) > 0
      or coalesce((p_releve ->> 'codes_refuses_par_la_limite')::int, 0) >= 3;
$function$;

comment on function public.releve_des_alertes(timestamp with time zone) is
  'Ce que l''exploitation a vu depuis un instant : des comptes, jamais une personne. Lu par verifier_les_alertes. '
  'Depuis 20261006140000, aussi les demandes d''un e-mail que le produit n''envoie jamais, le plafond quotidien '
  'des codes atteint, et les codes refusés par la limite de Supabase (connexion_limite).';
