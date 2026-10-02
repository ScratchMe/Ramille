-- Modifier l'intention sans libérer l'engagement (`v1-33` D15, recommandation suivie le 01/10/2026,
-- livrée le 02/10/2026).
--
-- **Le défaut.** La carte engagée n'offrait que « Changer d'avis », qui libère et archive : passer
-- de « le mardi et le jeudi » à « le mardi » coûtait quatre gestes — libérer, rouvrir, recocher,
-- confirmer — et une ligne d'archive « changement » pour une action qu'on n'avait pas quittée.
--
-- **La règle.** La carte engagée offre « Modifier les jours » (trajet) ou « Modifier l'échéance »
-- (sorties, voyages), qui rouvre le sélecteur prérempli ; « C'est noté » rappelle
-- `commit_plan_action` sur la **même** action. Le RPC le permettait déjà — l'action qu'on réengage
-- n'est pas « une autre action engagée », donc ni refus `RM001` ni libération —, mais il réécrivait
-- l'intention sans trace. Désormais :
--   * **l'intention remplacée s'archive**, raison `modification` : la règle « aucun chemin ne détruit
--     un engagement sans l'archiver » (`PLAN.md`) vaut pour l'intention, le seul choix personnel que
--     le produit demande ;
--   * **une intention identique ne réécrit rien** — ni archive, ni `committed_at`. Les jours se
--     comparent comme un ensemble : l'écran les envoie dans l'ordre où on les a cochés ;
--   * **une échéance relative n'est identique que le mois où elle a été choisie** : « Le mois
--     prochain » choisi en septembre vise octobre ; redit en octobre, il vise novembre, et c'est un
--     autre choix, qui s'écrit. Le mois se lit en heure de Paris, comme la question du mois ;
--   * **`committed_at` repart à maintenant** sur une vraie modification, comme avant : c'est le jour
--     où l'échéance a été choisie, et la question du mois le lit (D14, `BOUCLE.md` §2) — « Ce
--     mois-ci » choisi en septembre puis changé en « Le mois prochain » en octobre n'est pas
--     interrogé sur octobre ;
--   * **une modification n'ouvre pas le mot de la veille** : `premier_engagement_le` ne se pose qu'au
--     premier engagement choisi de la saison. Sur une action de trajet reconduite, le cycle neuf n'a
--     pas de date ; changer ses jours l'aurait posée, et dix semaines de mot de la veille repartaient.
--
-- **La statistique des engagements quittés ne compte pas les modifications** :
-- `analytics.engagement_action_by_segment` comptait toute ligne de l'archive dans
-- `relachees_tous_segments`, ce qui était juste tant que l'archive ne recevait que des départs. Une
-- intention modifiée n'est pas un gabarit quitté : la vue est recréée avec ce seul filtre.
--
-- **Ce qui ne change pas** : la reconduction (`carried_over_from` reste), la signature, les
-- privilèges.
-- La raison `modification` n'est pas annonçable : `RAISONS_ANNONCABLES` (`src/types/plan.ts`) ne
-- porte que `rebilan` et `contexte`, et le suivi garde l'engagement en place devant toute archive de
-- son cycle (`decisionsParSaison`).
--
-- **Réécrite depuis `pg_get_functiondef` du distant** (`SUPABASE.md` §2.3) : le corps de
-- `20260928075453`, dont l'empreinte normalisée a été comparée le 02/10/2026 à celle du distant —
-- identiques —, et trois ajouts : quatre variables, le bloc de la modification avant l'écriture,
-- et la condition qui empêche une modification d'ouvrir le mot de la veille.

-- ---------------------------------------------------------------------------------------------
-- 1. L'archive admet la modification
-- ---------------------------------------------------------------------------------------------

alter table public.plan_action_commitments_archive
  drop constraint if exists plan_action_commitments_archive_released_reason_check;
alter table public.plan_action_commitments_archive
  add constraint plan_action_commitments_archive_released_reason_check
  check (released_reason = any (array['rebilan'::text, 'saison'::text, 'changement'::text, 'contexte'::text,
                                      'retrait'::text, 'modification'::text]));

-- Les deux commentaires dataient de C2.2 : trois raisons, un seul auteur. `contexte` (20260919230000),
-- `retrait` (C4.7) et l'auteur `archiver_engagement_de_laction` y manquaient déjà.
comment on table public.plan_action_commitments_archive is
  'Les engagements relâchés, et les intentions modifiées, avec leur raison. Écrite uniquement par '
  'public.archiver_engagement et public.archiver_engagement_de_laction, jamais par le client — '
  'c''est ce qui garantit qu''aucun chemin ne détruit un engagement en silence (C2.2).';
comment on column public.plan_action_commitments_archive.released_reason is
  'rebilan : un nouveau bilan a retiré le gabarit du plan. saison : le cycle suivant ne propose '
  'plus ce gabarit. changement : la personne a changé d''avis ou choisi une autre action. '
  'contexte : une réponse corrigée sur /contexte a retiré le gabarit. retrait : le bilan a été '
  'retiré. modification : l''action reste engagée, seule son intention (jours ou échéance) a '
  'changé — ce n''est pas un départ (D15).';

-- ---------------------------------------------------------------------------------------------
-- 2. Le RPC : la modification s'archive, l'identique ne réécrit rien
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.commit_plan_action(p_plan_action_id uuid, p_days smallint[] DEFAULT NULL::smallint[], p_timing text DEFAULT NULL::text, p_replace boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  select pc.id, tpl.poste into v_cycle_id, v_poste
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join public.action_templates tpl on tpl.id = pa.action_template_id
  where pa.id = p_plan_action_id and pc.user_id = auth.uid();

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

-- Les privilèges, rejoués comme ceux de `20260928075453`.
revoke all on function public.commit_plan_action(uuid, smallint[], text, boolean)
  from public, anon, authenticated;
grant execute on function public.commit_plan_action(uuid, smallint[], text, boolean) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. La statistique des engagements quittés ne compte pas les modifications
-- ---------------------------------------------------------------------------------------------
-- Recréée depuis `pg_get_viewdef` du distant (02/10/2026), identique à `20260914132522` : seul le
-- filtre de `relachees` est neuf. Mêmes colonnes, même ordre, donc `create or replace` suffit.

create or replace view analytics.engagement_action_by_segment as
with proposees as (
  select
    pc.user_id,
    pa.action_template_id,
    pa.committed_at,
    pa.intention_days,
    pa.intention_timing
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
),
relachees as (
  -- Une intention modifiée (D15) laisse l'action engagée : ce n'est pas un gabarit quitté.
  select action_template_id, count(*) as n
  from public.plan_action_commitments_archive
  where released_reason <> 'modification'
  group by 1
)
select
  s.zone_type,
  s.tc_access,
  s.dominant_poste,
  t.poste as action_poste,
  t.action_text,
  count(*) as proposees,
  count(*) filter (where p.committed_at is not null) as engagees,
  count(*) filter (where p.intention_days is not null) as intentions_en_jours,
  count(*) filter (where p.intention_timing is not null) as intentions_en_echeance,
  -- Hors segment : l'archive ne porte pas de quoi retrouver le segment du moment, et le segment
  -- d'aujourd'hui n'est pas celui d'alors. Le chiffre est donc identique sur toutes les lignes d'un
  -- même gabarit, et c'est ce qu'il dit — combien de fois ce gabarit a été quitté, tous profils
  -- confondus.
  coalesce(max(r.n), 0) as relachees_tous_segments
from proposees p
join public.action_templates t on t.id = p.action_template_id
join analytics.user_segments s on s.user_id = p.user_id
left join relachees r on r.action_template_id = p.action_template_id
group by 1, 2, 3, 4, 5;

revoke all on analytics.engagement_action_by_segment from anon, authenticated;

comment on view analytics.engagement_action_by_segment is
  'C3.8 §6 — par segment et par gabarit : combien de fois proposé, combien de fois engagé, sous quelle forme d''intention. Les engagements relâchés sont comptés hors segment (l''archive ne porte pas celui du moment), sans les intentions modifiées (D15), qui ne quittent pas l''action.';

-- ---------------------------------------------------------------------------------------------
-- 4. Contrôle, lu sur le corps installé sans ses commentaires (`SUPABASE.md` §1.5)
-- ---------------------------------------------------------------------------------------------

do $controle_de_la_modification$
declare
  v_corps text := regexp_replace(
    pg_get_functiondef('public.commit_plan_action(uuid,smallint[],text,boolean)'::regprocedure),
    '--[^' || chr(10) || ']*', '', 'g');
  v_contrainte text;
begin
  if v_corps not like '%archiver_engagement_de_laction(p_plan_action_id, ''modification'')%' then
    raise exception 'CONTROLE: commit_plan_action n''archive pas l''intention qu''il remplace';
  end if;
  if v_corps not like '%date_trunc(''month'', v_engagee_le at time zone ''Europe/Paris'')%' then
    raise exception 'CONTROLE: une échéance relative redite un autre mois passerait pour identique';
  end if;
  if v_corps not like '%and not coalesce(v_deja_engagee, false)%' then
    raise exception 'CONTROLE: une modification ouvrirait le mot de la veille';
  end if;
  -- Les gardes des migrations précédentes, que la réécriture devait garder.
  if v_corps not like '%errcode = ''RM001''%' then
    raise exception 'CONTROLE: le refus de remplacement implicite a disparu (20260914021646)';
  end if;
  if v_corps not like '%premier_engagement_le is null%' then
    raise exception 'CONTROLE: la date du mot de la veille ne se pose plus une seule fois (20260928075453)';
  end if;
  if v_corps not like '%pc.user_id = auth.uid()%' then
    raise exception 'CONTROLE: la propriété de l''action n''est plus vérifiée';
  end if;

  select pg_get_constraintdef(oid) into v_contrainte
    from pg_constraint where conname = 'plan_action_commitments_archive_released_reason_check';
  if v_contrainte is null or position('''modification''' in v_contrainte) = 0
     or position('''retrait''' in v_contrainte) = 0 then
    raise exception 'CONTROLE: l''archive n''admet pas ses six raisons (%)', v_contrainte;
  end if;

  if has_function_privilege('anon', 'public.commit_plan_action(uuid,smallint[],text,boolean)', 'execute') then
    raise exception 'CONTROLE: commit_plan_action est appelable sans session';
  end if;

  if pg_get_viewdef('analytics.engagement_action_by_segment'::regclass) not like '%<> ''modification''%' then
    raise exception 'CONTROLE: la statistique des engagements quittés compte les modifications';
  end if;
  if has_table_privilege('anon', 'analytics.engagement_action_by_segment', 'select')
     or has_table_privilege('authenticated', 'analytics.engagement_action_by_segment', 'select') then
    raise exception 'CONTROLE: la vue d''analyse est lisible par un rôle client';
  end if;
end
$controle_de_la_modification$;
