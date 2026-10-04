-- Les constats de la couche base trouvés à la seconde passe de la revue finale (04/10/2026,
-- `docs/architecture/v1-27-dette-technique.md` §12.36). **Aucun ne permettait d'écrire chez un autre
-- compte** ; le quatrième laissait lire l'identifiant d'un autre. Les autres bornent ce qu'un appel
-- direct à l'API pouvait faire à son propre compte, ou rendent un passage nocturne robuste à un seul
-- compte. Cinq parties, une par constat, et la contre-lecture du même soir en a élargi deux.
--
-- Les fonctions réécrites partent de `pg_get_functiondef` du distant (SUPABASE.md §2.3), et gagnent
-- `pg_temp` en fin de `search_path` au passage (v1-27 §12.35). Le fichier se rejoue tel quel :
-- `if not exists` sur la table et l'index, `if exists` sur la policy.

-- ── 1. Le passage nocturne des plans n'est plus arrêté par un compte ──────────────────────────
--
-- `generate_plan_cycles()` bouclait sur les comptes dans une seule transaction : une exception pour
-- un seul compte annulait le passage de tout le monde, chaque nuit tant que ses données la
-- provoquaient — et au changement de saison, plus personne ne recevait son plan neuf. Chaque compte
-- passe désormais dans sa sous-transaction, comme les compteurs de la purge. L'échec d'un compte ne
-- doit pas pour autant devenir muet : la tâche ne tombe plus, donc `taches_en_echec` ne le verrait
-- plus. D'où un journal, sur le modèle de `purge_runs` et de `reminder_send_runs`, que l'alerte
-- d'exploitation lit (`plans_en_echec`, une somme). Le message du premier échec y est gardé, jamais
-- l'identifiant du compte : la table se relit depuis le registre d'exploitation, qui ne nomme
-- personne ; l'identifiant part dans le journal de Postgres (`raise warning`), lisible du seul
-- tableau de bord.
create table if not exists public.plan_cycle_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  comptes integer not null default 0,
  echecs integer not null default 0,
  detail text
);

comment on table public.plan_cycle_runs is
  'Journal des passages de generate_plan_cycles() : combien de comptes, combien en échec, et le message du premier échec. Écrit par le serveur, jamais lu par un client ; lu par l''alerte d''exploitation (plans_en_echec).';

alter table public.plan_cycle_runs enable row level security;
revoke all privileges on public.plan_cycle_runs from public, anon, authenticated;

create index if not exists plan_cycle_runs_ran_at_idx on public.plan_cycle_runs (ran_at desc);

create or replace function public.generate_plan_cycles()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  uid uuid;
  v_comptes integer := 0;
  v_echecs integer := 0;
  v_premier_echec text;
begin
  for uid in select distinct user_id from public.assessments where status = 'completed'
  loop
    v_comptes := v_comptes + 1;
    begin
      perform public.generate_plan_cycle_for_user(uid);
    exception when others then
      v_echecs := v_echecs + 1;
      if v_premier_echec is null then
        v_premier_echec := format('%s (%s)', sqlerrm, sqlstate);
      end if;
      raise warning 'generate_plan_cycles : le compte % n''a pas reçu son plan : % (%)', uid, sqlerrm, sqlstate;
    end;
  end loop;

  insert into public.plan_cycle_runs (comptes, echecs, detail)
  values (v_comptes, v_echecs, v_premier_echec);
end;
$function$;

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
    'rappels_bloques', (
      select count(*) from analytics.rappels_bloques
      where not (genre = 'veille' and statut = 'failed')
    )
  );
$function$;


create or replace function public.alerte_a_dire(p_releve jsonb, p_rappels_bloques_vus integer)
returns boolean
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
  select (p_releve ->> 'pannes')::int > 0
      or (p_releve ->> 'soumissions_en_echec')::int > 0
      or jsonb_array_length(p_releve -> 'taches_en_echec') > 0
      or (p_releve ->> 'envois_en_echec')::int > 0
      or (p_releve ->> 'synchronisations_en_echec')::int > 0
      or (p_releve ->> 'purges_bloquees')::int > 0
      or coalesce((p_releve ->> 'plans_en_echec')::int, 0) > 0
      or (p_releve ->> 'rappels_bloques')::int > p_rappels_bloques_vus;
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
    v_lignes := v_lignes || format('- Purges des sessions anonymes bloquées : %s', p_releve ->> 'purges_bloquees');
  end if;
  if coalesce((p_releve ->> 'plans_en_echec')::int, 0) > 0 then
    v_lignes := v_lignes || format('- Échecs de la préparation nocturne des plans (generate_plan_cycles) : %s', p_releve ->> 'plans_en_echec');
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

-- ── 2. Un bilan naît en cours, ne se finalise qu'avec ses réponses, et elles ne s'écrivent que tant qu'il est en cours
--
-- Le client insère `user_id` et `status` (20261004173905), et rien ne bornait `status` à
-- l'insertion, sinon `withdrawn` : un bilan pouvait naître `completed`, sans réponses ni résultat,
-- et devenir le « dernier bilan complété » que lisent `/contexte`, les cohortes et la racine de
-- l'app. Et la policy d'insertion des réponses n'avait pas le prédicat `status = 'in_progress'` que
-- celle de mise à jour a reçu (20260824180100) : les réponses d'un bilan finalisé pouvaient encore
-- s'écrire, par un `insert` qui ne heurtait rien. **Et le même bilan fantôme naissait en deux appels**
-- (contre-lecture du même soir) : créé `in_progress`, puis passé `completed` sans une réponse. Le
-- passage à `completed` exige donc ses réponses. Le refus vise les rôles du client seulement : les
-- fonctions du serveur et les fixtures pgTAP écrivent en propriétaire. L'app n'insère que
-- `in_progress` (`src/app/bilan/index.tsx`), et n'écrit ses réponses qu'avant la finalisation ;
-- `mettre_a_jour_le_contexte` écrit en `security definer`, donc hors de la policy.
create or replace function public.refuser_le_retour_en_arriere_du_bilan()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'INSERT' then
    if new.status = 'withdrawn' then
      raise exception 'Un bilan ne naît pas retiré : il se retire une fois complété, par retirer_le_bilan.'
        using errcode = 'RM007';
    end if;
    if current_user in ('anon', 'authenticated') and new.status <> 'in_progress' then
      raise exception 'Un bilan naît en cours : il se finalise une fois ses réponses écrites.'
        using errcode = 'RM007';
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'withdrawn' then
    raise exception 'Un bilan retiré ne revient pas : refaire un bilan crée une nouvelle ligne.'
      using errcode = 'RM005';
  end if;

  if new.status = 'withdrawn' then
    if old.status <> 'completed' then
      raise exception 'Seul un bilan complété se retire.'
        using errcode = 'RM007';
    end if;
    if current_user in ('anon', 'authenticated') then
      raise exception 'Un bilan se retire par retirer_le_bilan, jamais par une écriture directe.'
        using errcode = 'RM007';
    end if;
    return new;
  end if;

  if old.status = 'completed' then
    raise exception 'Un bilan complété ne se rouvre pas : refaire un bilan crée une nouvelle ligne.'
      using errcode = 'RM005';
  end if;

  if new.status = 'completed' and current_user in ('anon', 'authenticated')
     and not exists (select 1 from public.assessment_answers r where r.assessment_id = new.id) then
    raise exception 'Un bilan se finalise une fois ses réponses écrites.'
      using errcode = 'RM007';
  end if;

  return new;
end;
$function$;

drop policy if exists "assessment_answers insert own" on public.assessment_answers;
create policy "assessment_answers insert own" on public.assessment_answers
  for insert to authenticated
  with check (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_answers.assessment_id
        and a.user_id = (select auth.uid())
        and a.status = 'in_progress'
    )
  );

-- ── 3. `commit_plan_action` n'engage que sur le dernier cycle du compte ───────────────────────
CREATE OR REPLACE FUNCTION public.commit_plan_action(p_plan_action_id uuid, p_days smallint[] DEFAULT NULL::smallint[], p_timing text DEFAULT NULL::text, p_replace boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_cycle_id uuid;
  v_poste text;
  v_forme_attendue text;
  v_precedent uuid;
  v_deja_engagee boolean;
  v_engagee_le timestamptz;
  v_jours_avant smallint[];
  v_echeance_avant text;
begin
  -- **Le cycle de l'action est le dernier du compte** (seconde passe de la revue finale, 04/10/2026,
  -- `v1-27` §12.36) : l'écran n'engage que sur le cycle le plus récent (`lecture-du-plan.ts`, trié par
  -- `period_start`), et un appel direct à l'API pouvait engager une action d'une saison close — la
  -- question de la période se serait alors posée sur un engagement pris après coup. « Le dernier » et
  -- non « celui qui couvre aujourd'hui » : entre minuit et le passage nocturne d'un changement de
  -- saison, l'écran montre encore le cycle d'avant, et il doit rester engageable.
  select pc.id, tpl.poste into v_cycle_id, v_poste
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join public.action_templates tpl on tpl.id = pa.action_template_id
  where pa.id = p_plan_action_id and pc.user_id = auth.uid()
    and pc.period_start = (
      select max(dernier.period_start) from public.plan_cycles dernier where dernier.user_id = auth.uid()
    );

  if v_cycle_id is null then
    raise exception 'Action introuvable.' using errcode = 'no_data_found';
  end if;

  v_forme_attendue := case when coalesce(v_poste, '') = 'commute' then 'des jours de la semaine' else 'une échéance' end;

  if (p_days is not null) = (p_timing is not null) then
    raise exception 'Une intention et une seule est attendue pour cette action : %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
  end if;

  if (coalesce(v_poste, '') = 'commute') <> (p_days is not null) then
    raise exception 'Cette action attend %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
  end if;

  select id into v_precedent
  from public.plan_actions
  where plan_cycle_id = v_cycle_id and committed_at is not null and id <> p_plan_action_id;

  if v_precedent is not null then
    -- **Le refus est le défaut, et c'est tout l'apport de C4.6 ici.** Libérer l'engagement
    -- précédent efface `committed_at`, les jours et l'échéance — le seul choix personnel que le
    -- produit demande — et l'archive de C2.2 en garde la trace mais ne le rend pas. Un appel qui
    -- ne dit pas qu'il remplace ne remplace donc pas : l'écran qui propose « Choisir celle-ci à la
    -- place » le dit, un appel écrit par inadvertance ne le dira pas.
    --
    -- Le SQLSTATE est réservé aux conditions définies par l'utilisateur (classe R) : le client
    -- l'utilise pour recharger le plan plutôt que pour parler de réseau — ce refus veut presque
    -- toujours dire que l'état a changé depuis l'affichage.
    if p_replace is not true then
      raise exception 'Une autre action est déjà engagée sur cette période.'
        using errcode = 'RM001';
    end if;

    perform public.archiver_engagement_de_laction(v_precedent, 'changement');

    update public.plan_actions
    set committed_at = null, intention_days = null, intention_timing = null, carried_over_from = null
    where id = v_precedent;
  end if;

  -- D15 (02/10/2026) : l'action est déjà engagée, et on en change l'intention — « Modifier les
  -- jours », « Modifier l'échéance », sans la libérer. L'intention remplacée s'archive, comme tout
  -- engagement qui part (« aucun chemin ne détruit un engagement sans l'archiver ») ; une intention
  -- identique ne réécrit rien, ni archive ni `committed_at` — les jours se comparent comme un
  -- ensemble, l'écran les envoyant dans l'ordre où on les a cochés. **Une échéance relative n'est
  -- identique que le mois où elle a été choisie** : « Le mois prochain » choisi en septembre vise
  -- octobre, et redit en octobre il vise novembre — c'est un autre choix, qui s'écrit (contre-lecture
  -- du 02/10/2026). Le mois se lit en heure de Paris, comme la question du mois. `committed_at` repart
  -- à maintenant sur une vraie modification : c'est le jour où l'échéance a été choisie, que la
  -- question du mois lit (D14, `generate_extras_checkins`).
  select pa.committed_at is not null, pa.committed_at, pa.intention_days, pa.intention_timing
    into v_deja_engagee, v_engagee_le, v_jours_avant, v_echeance_avant
  from public.plan_actions pa
  where pa.id = p_plan_action_id;

  if v_deja_engagee then
    if (select array_agg(j order by j) from unnest(v_jours_avant) j)
         is not distinct from (select array_agg(j order by j) from unnest(p_days) j)
       and v_echeance_avant is not distinct from p_timing
       and (p_timing is null or p_timing not in ('ce_mois', 'le_mois_prochain')
            or date_trunc('month', v_engagee_le at time zone 'Europe/Paris')
               = date_trunc('month', now() at time zone 'Europe/Paris')) then
      return;
    end if;
    perform public.archiver_engagement_de_laction(p_plan_action_id, 'modification');
  end if;

  update public.plan_actions
  set committed_at = now(),
      intention_days = p_days,
      intention_timing = p_timing
  where id = p_plan_action_id;

  -- C4.2 (D4, précisé le 27/09/2026) : le premier engagement **choisi** de la saison sur une action
  -- de **trajet** ouvre les dix semaines du mot de la veille, et le seul. Une action d'un autre poste
  -- ne pose rien : le mot ne la suit pas, et ouvrir la fenêtre sur elle en retirerait des semaines à
  -- l'action de trajet choisie ensuite. Un second choix de trajet trouve la date posée et ne la
  -- déplace pas — sans quoi changer d'action toutes les huit semaines ferait un mot de la veille sans
  -- fin (`v1-25` §3.4).
  -- Et une modification ne l'ouvre pas (D15) : elle n'est pas le premier engagement choisi de la
  -- saison. Sur une action de trajet reconduite, le cycle neuf n'a pas de date ; changer ses jours
  -- l'aurait posée, et dix semaines de mot de la veille repartaient à chaque saison.
  if coalesce(v_poste, '') = 'commute' and not coalesce(v_deja_engagee, false) then
    update public.plan_cycles
    set premier_engagement_le = now()
    where id = v_cycle_id and premier_engagement_le is null;
  end if;
end;
$function$;

-- `clear_plan_action_commitment`, la fonction jumelle, reçoit la même borne (contre-lecture du même
-- soir) : par un appel direct, elle désengageait une action d'une saison close et l'archivait en
-- `changement`, un relâchement qui n'a pas eu lieu. Réécrite depuis le corps du distant.
create or replace function public.clear_plan_action_commitment(p_plan_action_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_lignes integer;
  v_eng record;
begin
  -- La capture est sous vérification de propriété : `archiver_engagement` est `security definer` et
  -- ne vérifie rien. Et, comme `commit_plan_action`, sur le dernier cycle du compte seulement.
  select pc.user_id, pc.id as cycle_id, pa.action_template_id, pa.intention_days,
         pa.intention_timing, pa.committed_at
    into v_eng
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  where pa.id = p_plan_action_id and pc.user_id = auth.uid()
    and pc.period_start = (
      select max(dernier.period_start) from public.plan_cycles dernier where dernier.user_id = auth.uid()
    );

  update public.plan_actions pa
  set committed_at = null, intention_days = null, intention_timing = null, carried_over_from = null
  where pa.id = p_plan_action_id
    and exists (
      select 1 from public.plan_cycles pc
      where pc.id = pa.plan_cycle_id and pc.user_id = auth.uid()
        and pc.period_start = (
          select max(dernier.period_start) from public.plan_cycles dernier where dernier.user_id = auth.uid()
        )
    );

  get diagnostics v_lignes = row_count;

  -- Un succès muet quand aucune ligne ne correspond ferait afficher « ok » sur un engagement
  -- toujours en place (C1.12).
  if v_lignes = 0 then
    raise exception 'Action introuvable.' using errcode = 'no_data_found';
  end if;

  perform public.archiver_engagement(
    v_eng.user_id, v_eng.cycle_id, v_eng.action_template_id,
    v_eng.intention_days, v_eng.intention_timing, v_eng.committed_at, 'changement'
  );
end;
$function$;

-- ── 4. `push_tokens` : le client ne lit plus qui avait ce téléphone avant lui ─────────────────
--
-- Le `select` était accordé sur toute la table (20260910110000) : le propriétaire d'un jeton
-- lisait aussi `proprietaire_precedent`, l'identifiant du compte qui avait l'appareil avant lui
-- (téléphone partagé, changement de compte) — une petite fuite entre comptes. Le client ne garde
-- que ce qu'un appel réel lit (SUPABASE.md §1.4) : `token` et `disabled_at`, que l'app sélectionne
-- et filtre (`src/lib/notification-prefs.ts`), et `user_id`, que la suppression et la policy
-- désignent. L'inscription, la désinscription et l'export passent par des fonctions `security
-- definer`. Même idiome que `20261004173905` : le privilège de table retiré d'abord, sans quoi le
-- privilège de colonne ne restreint rien.
revoke select on public.push_tokens from authenticated;
grant select (token, user_id, disabled_at) on public.push_tokens to authenticated;

-- ── 5. `compute_assessment_results` dit « introuvable » avec le code qu'on attend ─────────────
--
-- Le `raise` sans code partait en `P0001` : `src/types/soumission.ts` attend `P0002` pour ce cas,
-- qui tombait donc dans `autre` côté mesure. Seule cette ligne change (20261004173905).
create or replace function public.compute_assessment_results(p_assessment_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_owner_id uuid;
  v_status text;
begin
  select user_id, status into v_owner_id, v_status from public.assessments where id = p_assessment_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'compute_assessment_results: bilan introuvable ou accès refusé'
      using errcode = 'no_data_found';
  end if;

  if v_status <> 'completed' then
    raise exception 'compute_assessment_results: seul un bilan finalisé se calcule (statut %)', v_status
      using errcode = 'RM008';
  end if;

  if exists (select 1 from public.assessment_results where assessment_id = p_assessment_id) then
    return;
  end if;

  perform public.recompute_assessment_results(p_assessment_id);
end;
$function$;
