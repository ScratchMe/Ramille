-- C6.4 — Le contexte sort du questionnaire (#232, décision D5 de `v1-19-rythme-des-bilans.md`).
--
-- Les quatre réponses B4 — `zone_type`, `tc_access`, `household_vehicles`, `teletravail` — se
-- corrigeaient jusqu'ici en rouvrant le questionnaire à l'étape « Contexte », ce qui **resoumettait
-- un bilan entier** (constat 07.4 de la recette du 18/09/2026). Corriger une réponse de contexte
-- n'est pas refaire un bilan : ça ne change pas ce que la personne déclare de ses trajets.
--
-- ## Ce que cette migration pose
--
-- 1. `mettre_a_jour_le_contexte(...)` — le seul écrivain de ces quatre colonnes hors questionnaire.
-- 2. `generate_plan_cycle_for_user(p_user_id, p_cause)` — une régénération qui sait **pourquoi**
--    elle a lieu, parce que deux conséquences en découlent et qu'elles doivent rester d'accord.
-- 3. `plan_action_commitments_archive.released_reason` accepte `'contexte'`.
--
-- ## Pourquoi un RPC, alors que `authenticated` a déjà le droit d'écrire ces colonnes
--
-- La RLS d'`assessment_answers` porte bien une policy `UPDATE` owner-scoped, donc ce n'est **pas**
-- une question de permission — et le dire évite qu'un prochain passage retire le RPC en croyant
-- simplifier. Ce sont deux autres choses :
--
-- - **l'atomicité** : écrire les réponses, recalculer le bilan et régénérer le plan sont trois
--   gestes qui doivent réussir ensemble. Trois appels client laissent un état intermédiaire
--   lisible — des réponses neuves sous un plan périmé — dès que le réseau coupe entre deux ;
-- - **le bornage des colonnes** : la RLS filtre des lignes, jamais des colonnes (le raisonnement de
--   `plan_actions` et d'`engagement_checkins`). Un `update` client sur `assessment_answers` touche
--   **toutes** les réponses du bilan, donc les distances et les modes, donc le chiffre. Le RPC en
--   pose quatre.
--
-- ## Et pourquoi le recalcul est inconditionnel
--
-- L'issue #232 posait le choix sur `household_vehicles` seule, « la seule des quatre qui touche un
-- chiffre ». **Relevé dans la définition vivante de `recompute_assessment_results`, c'est faux :
-- elles sont trois.** `household_vehicles` décide du mode du résiduel des sorties rares (ligne
-- 134), et `tc_access` **et** `zone_type` décident ensemble de `mobility_constrained` (lignes
-- 208-210), qui est figé sur `assessment_results` et lu par la restitution — c'est lui qui montre
-- ou tait la barre de la moyenne française (C3.1).
--
-- Une condition étroite sur `household_vehicles` aurait donc laissé `mobility_constrained` périmé :
-- l'encart du plan aurait dit « rural, desserte limitée » pendant que la restitution continuait de
-- comparer la personne à une moyenne qu'on avait décidé de lui taire. Le recalcul porte donc sur
-- les quatre, et il est **sans risque parce qu'il est idempotent** : `recompute_assessment_results`
-- relit les mêmes réponses de trajet et borne les facteurs à la **date du bilan**, donc à réponses
-- de transport inchangées il réécrit les mêmes totaux.
--
-- **Recalculer n'est pas resoumettre**, et la distinction est tout l'objet du chantier : aucune
-- ligne n'est ajoutée à `assessments`, `submitted_at` ne bouge pas, le suivi garde une entrée à sa
-- date. C'est le résultat du bilan existant qui est remis d'accord avec ses réponses.

begin;

-- ---------------------------------------------------------------------------------------------
-- 1. Une quatrième raison de libération
-- ---------------------------------------------------------------------------------------------
--
-- Un changement de contexte peut retirer du plan le gabarit sur lequel la personne s'était engagée
-- — « deux trajets sur cinq en métro » quand on vient de répondre qu'il n'y a plus de desserte.
-- C'est un **effet de bord non choisi**, la même famille que `rebilan` et pas celle de
-- `changement`, où la personne décide. L'écran du plan l'annonce, et il lui faut la raison pour ne
-- pas dire « avec ton nouveau bilan » à quelqu'un qui n'en a pas fait.
--
-- `drop` puis `add` : `add constraint` n'est pas idempotent, et un `drop ... if exists` d'abord
-- rend le fichier rejouable tel quel.
alter table public.plan_action_commitments_archive
  drop constraint if exists plan_action_commitments_archive_released_reason_check;

alter table public.plan_action_commitments_archive
  add constraint plan_action_commitments_archive_released_reason_check
  check (released_reason = any (array['rebilan'::text, 'saison'::text, 'changement'::text, 'contexte'::text]));

-- ---------------------------------------------------------------------------------------------
-- 2. Une régénération qui sait pourquoi elle a lieu
-- ---------------------------------------------------------------------------------------------
--
-- **La signature change, elle ne s'ajoute pas** — la règle de `repondre_au_checkin` (C2.4) et de
-- `commit_plan_action` (C4.6). Une surcharge que PostgREST départagerait sur un défaut coûte plus
-- qu'une migration, et les deux appelants (`generate_plan_cycles()` le cron, et
-- `recompute_assessment_results`) émettent `f(uuid)`, qui résout sur le défaut sans rien changer.
--
-- **Un seul paramètre et non deux, parce qu'il porte un seul fait.** La première forme écrite
-- était `p_forcer boolean` ; elle obligeait à poser ailleurs la raison d'archivage, donc à tenir
-- d'accord deux paramètres qui disent la même chose — exactement la forme de défaut que
-- `reminder_channel_for` et ses jumelles existent pour éviter. `p_cause` dit **pourquoi on
-- régénère**, et les deux conséquences s'en dérivent : sauter la garde d'idempotence, et nommer la
-- raison de libération. Il n'y a pas de façon de forcer sans dire pourquoi.
drop function if exists public.generate_plan_cycle_for_user(uuid);

create function public.generate_plan_cycle_for_user(p_user_id uuid, p_cause text default 'bilan')
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_reduction_pct constant numeric := 20;
  rec record;
  bounds record;
  v_cycle_id uuid;
  v_existing_id uuid;
  v_existing_created_at timestamptz;
  v_eng record;
  v_raison text;
begin
  -- Une valeur inconnue n'est pas une valeur par défaut : la laisser passer ferait taire une faute
  -- de frappe, qui se lirait « la garde d'idempotence a tenu » — c'est-à-dire rien du tout.
  --
  -- **`RM004` et pas `RM003`, et ce n'est pas de la comptabilité.** La classe `RM` est réservée aux
  -- conditions que le produit reconnaît par leur code et jamais par leur message (`RM001` le refus
  -- de remplacement, `RM002` la limite du canal de retour). Ici la condition est un invariant de
  -- serveur qu'aucun client ne peut atteindre — cette fonction est révoquée des trois rôles — donc
  -- elle ne partage pas son code avec les préconditions de `mettre_a_jour_le_contexte`, qui, elles,
  -- remontent jusqu'à un écran. Un code par condition est aussi ce qui rend le contrôle (c)
  -- capable de distinguer son propre échec de celui qu'il éprouve.
  if p_cause is null or p_cause not in ('bilan', 'contexte') then
    raise exception 'generate_plan_cycle_for_user: cause inconnue (%)', p_cause
      using errcode = 'RM004';
  end if;

  select
    p.cadence_type,
    a.id as assessment_id,
    ar.dominant_poste,
    ar.dominant_poste_label,
    ar.dominant_poste_co2_kg_year,
    ar.total_co2_kg_year,
    a.submitted_at,
    a.submitted_at::date as bilan_date
  into rec
  from public.assessments a
  join public.profiles p on p.id = a.user_id
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.user_id = p_user_id and a.status = 'completed'
  order by a.submitted_at desc nulls last
  limit 1;

  if not found then
    return;
  end if;

  if rec.cadence_type = 'rolling_quarter' then
    select * into bounds from public.rolling_quarter_bounds(rec.bilan_date, current_date);
  else
    select * into bounds from public.season_bounds(current_date);
  end if;

  select id, created_at into v_existing_id, v_existing_created_at
  from public.plan_cycles
  where user_id = p_user_id and period_start = bounds.period_start;

  -- **La garde d'idempotence compare deux horodatages serveur** (C2.2) : elle empêche le cron
  -- nocturne de reconstruire chaque nuit un plan que rien n'a changé. Un changement de contexte ne
  -- déplace pas `submitted_at` — et il ne doit surtout pas le déplacer, cette date étant l'âge du
  -- bilan lu par le régime de re-bilan et par le suivi — donc il passerait ici sans rien faire.
  -- C'est le seul endroit où `p_cause` fait sauter quelque chose.
  if p_cause <> 'contexte'
     and v_existing_created_at is not null
     and v_existing_created_at >= rec.submitted_at then
    return;
  end if;

  if v_existing_id is not null then
    select pa.action_template_id, pa.committed_at, pa.intention_days, pa.intention_timing,
           pa.carried_over_from, pa.plan_cycle_id as cycle_pour_archive
      into v_eng
    from public.plan_actions pa
    where pa.plan_cycle_id = v_existing_id and pa.committed_at is not null;
    -- La raison dit ce qui a reconstruit le cycle, donc ce que l'écran a le droit d'annoncer.
    v_raison := case when p_cause = 'contexte' then 'contexte' else 'rebilan' end;
  else
    select pa.action_template_id, pa.committed_at, pa.intention_days, pa.intention_timing,
           pc.id as carried_over_from, pc.id as cycle_pour_archive
      into v_eng
    from public.plan_cycles pc
    join public.plan_actions pa on pa.plan_cycle_id = pc.id and pa.committed_at is not null
    where pc.user_id = p_user_id and pc.period_start < bounds.period_start
    order by pc.period_start desc
    limit 1;
    -- **Et `saison` ne se surcharge pas**, même sous une cause `contexte` : ici le cycle n'existe
    -- pas encore, donc ce qu'on tente est une **reconduction** d'une saison à l'autre, et c'est
    -- elle qui a échoué. La nommer « contexte » ferait annoncer à la personne la perte d'un
    -- engagement que la bascule de saison lui aurait de toute façon fait reprendre.
    v_raison := 'saison';
  end if;

  insert into public.plan_cycles (
    user_id, cadence_type, period_label, period_start, period_end,
    trip_label, poste, baseline_co2_kg_year, target_reduction_pct
  )
  values (
    p_user_id, rec.cadence_type, bounds.label, bounds.period_start, bounds.period_end,
    rec.dominant_poste_label, rec.dominant_poste, rec.dominant_poste_co2_kg_year, target_reduction_pct
  )
  on conflict (user_id, period_start) do update set
    cadence_type = excluded.cadence_type,
    period_label = excluded.period_label,
    period_end = excluded.period_end,
    trip_label = excluded.trip_label,
    poste = excluded.poste,
    baseline_co2_kg_year = excluded.baseline_co2_kg_year,
    target_reduction_pct = excluded.target_reduction_pct,
    created_at = now()
  returning id into v_cycle_id;

  delete from public.plan_actions where plan_cycle_id = v_cycle_id;

  with pistes as materialized (
    select * from public.estimate_action_savings(rec.assessment_id)
  ),
  tete_du_dominant as (
    select max(saving_kg_year) as gain from pistes where poste = rec.dominant_poste
  )
  insert into public.plan_actions (
    plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent, detail_text, rank, first_step
  )
  select
    v_cycle_id,
    e.action_template_id,
    e.saving_kg_year,
    case when rec.total_co2_kg_year > 0
      then round(e.saving_kg_year / rec.total_co2_kg_year * 100)
      else null
    end,
    e.detail_text,
    row_number() over (order by (e.poste = rec.dominant_poste and e.saving_kg_year = t.gain) desc,
                                e.saving_kg_year desc, e.action_text),
    tpl.first_step
  from pistes e
  cross join tete_du_dominant t
  join public.action_templates tpl on tpl.id = e.action_template_id
  order by (e.poste = rec.dominant_poste and e.saving_kg_year = t.gain) desc,
           e.saving_kg_year desc, e.action_text;

  if v_eng.action_template_id is null then
    return;
  end if;

  update public.plan_actions
  set committed_at = v_eng.committed_at,
      intention_days = v_eng.intention_days,
      intention_timing = v_eng.intention_timing,
      carried_over_from = v_eng.carried_over_from
  where plan_cycle_id = v_cycle_id and action_template_id = v_eng.action_template_id;

  if not found then
    perform public.archiver_engagement(
      p_user_id, v_eng.cycle_pour_archive, v_eng.action_template_id,
      v_eng.intention_days, v_eng.intention_timing, v_eng.committed_at, v_raison
    );
  end if;
end;
$function$;

-- Les trois rôles, et pas seulement `anon, authenticated` : Supabase accorde `EXECUTE` par défaut
-- à `PUBLIC` sur une fonction neuve, donc oublier `public` ne révoque rien (C4.6).
revoke execute on function public.generate_plan_cycle_for_user(uuid, text) from public, anon, authenticated;

comment on function public.generate_plan_cycle_for_user(uuid, text) is
  'Génère le plan de réduction de la période courante. p_cause dit pourquoi : ''bilan'' (défaut, le cron et le calcul du bilan) respecte la garde d''idempotence et archive un engagement perdu en ''rebilan'' ; ''contexte'' saute la garde — un changement de contexte ne déplace pas submitted_at — et archive en ''contexte''.';

-- ---------------------------------------------------------------------------------------------
-- 3. Le seul écrivain des quatre réponses de contexte hors questionnaire
-- ---------------------------------------------------------------------------------------------
create or replace function public.mettre_a_jour_le_contexte(
  p_zone_type text,
  p_tc_access text,
  p_household_vehicles text,
  p_teletravail text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_assessment_id uuid;
  v_avant record;
begin
  if v_uid is null then
    raise exception 'mettre_a_jour_le_contexte: aucune session' using errcode = 'RM003';
  end if;

  -- **Une réponse ne s'efface pas** (C3.8) : une condition qu'on ne peut pas évaluer n'est pas
  -- remplie, donc vider `zone_type`, `tc_access` ou `household_vehicles` **retire** des actions du
  -- plan, en silence. Les trois sont posées à tout le monde ; les refuser nulles rend la règle
  -- structurelle plutôt que conventionnelle. `p_teletravail` est la quatrième et la seule qui
  -- puisse légitimement être nulle : B4.4 ne se pose pas en dessous de deux jours de trajet
  -- (`teletravailSePose`, C5.4), et l'y forcer inventerait une réponse à une question absente.
  if p_zone_type is null or p_tc_access is null or p_household_vehicles is null then
    raise exception 'mettre_a_jour_le_contexte: les trois réponses de contexte sont obligatoires'
      using errcode = 'RM003';
  end if;

  select a.id into v_assessment_id
  from public.assessments a
  where a.user_id = v_uid and a.status = 'completed'
  order by a.submitted_at desc nulls last
  limit 1;

  if v_assessment_id is null then
    raise exception 'mettre_a_jour_le_contexte: aucun bilan complété' using errcode = 'RM003';
  end if;

  select zone_type, tc_access, household_vehicles, teletravail
    into v_avant
  from public.assessment_answers
  where assessment_id = v_assessment_id;

  -- **Rien n'a bougé : on ne touche à rien.** Ce n'est pas une optimisation — `recompute` réécrit
  -- `assessment_results` et la régénération forcée reconstruit `plan_actions`, donc un
  -- enregistrement à blanc ferait perdre les rangs d'affichage et rejouerait la reprise
  -- d'engagement pour rien. Le geste le plus fréquent sur cet écran est de l'ouvrir, de le lire et
  -- de le refermer.
  if v_avant.zone_type is not distinct from p_zone_type
     and v_avant.tc_access is not distinct from p_tc_access
     and v_avant.household_vehicles is not distinct from p_household_vehicles
     and v_avant.teletravail is not distinct from p_teletravail then
    return;
  end if;

  -- Les valeurs admissibles ne sont pas revalidées ici : les `check` de la table les portent déjà
  -- (`assessment_answers_zone_type_check` et ses trois sœurs), et les réécrire ferait un second
  -- endroit à tenir d'accord — le piège de `PARTS_DU_SECOND_MODE` par l'autre bout.
  update public.assessment_answers
  set zone_type = p_zone_type,
      tc_access = p_tc_access,
      household_vehicles = p_household_vehicles,
      teletravail = p_teletravail
  where assessment_id = v_assessment_id;

  -- L'ordre compte. `recompute_assessment_results` remet `assessment_results` d'accord avec les
  -- réponses — `mobility_constrained`, et le résiduel des sorties rares — et appelle lui-même
  -- `generate_plan_cycle_for_user(user)` en fin de course, qui **retourne sur la garde
  -- d'idempotence** puisque `submitted_at` n'a pas bougé. C'est le second appel, celui-ci nommé,
  -- qui reconstruit le plan. Ne pas « simplifier » en retirant l'un des deux : sans le premier le
  -- plan se reconstruirait sur un résultat périmé, sans le second il ne se reconstruirait pas.
  perform public.recompute_assessment_results(v_assessment_id);
  perform public.generate_plan_cycle_for_user(v_uid, 'contexte');
end;
$$;

revoke execute on function public.mettre_a_jour_le_contexte(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.mettre_a_jour_le_contexte(text, text, text, text) to authenticated;

comment on function public.mettre_a_jour_le_contexte(text, text, text, text) is
  'Met à jour les quatre réponses de contexte B4 du dernier bilan complété, puis recalcule le résultat et régénère le plan. Ne resoumet aucun bilan : submitted_at ne bouge pas. Les trois premières réponses sont obligatoires ; p_teletravail est nul quand B4.4 ne se pose pas.';

commit;

-- ---------------------------------------------------------------------------------------------
-- Contrôles — rejouables, et chacun casse ce qu'il garde
-- ---------------------------------------------------------------------------------------------
do $$
declare
  v_def text;
begin
  -- (a) La contrainte **installée** porte la quatrième raison, et n'a rien perdu au passage.
  --     Ce contrôle lit l'état vivant et non le fichier, mais il n'éprouve pas un refus : le
  --     `drop` + `add` d'une contrainte ne se prouve par un insert que sur une base peuplée, et
  --     ce fichier doit se rejouer sur une base vierge en CI. **La preuve par le comportement
  --     est dans `supabase/tests/database/27_contexte.test.sql`**, qui a des fixtures.
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.plan_action_commitments_archive'::regclass
    and conname = 'plan_action_commitments_archive_released_reason_check';

  if v_def is null then
    raise exception 'CONTROLE: la contrainte de raison a disparu au lieu d''être remplacée';
  end if;
  if position('''contexte''' in v_def) = 0 then
    raise exception 'CONTROLE: released_reason n''accepte pas ''contexte''';
  end if;
  if position('''rebilan''' in v_def) = 0
     or position('''saison''' in v_def) = 0
     or position('''changement''' in v_def) = 0 then
    raise exception 'CONTROLE: une raison existante a été perdue en ajoutant la quatrième (%)', v_def;
  end if;

  -- (b) L'ancienne signature à un seul argument n'existe plus, et la nouvelle porte son défaut.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'generate_plan_cycle_for_user'
      and p.pronargs = 1
  ) then
    raise exception 'CONTROLE: la signature à un argument survit, donc f(uuid) est ambigu';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'generate_plan_cycle_for_user'
      and p.pronargs = 2 and p.pronargdefaults = 1
  ) then
    raise exception 'CONTROLE: la nouvelle signature n''a pas son défaut, donc le cron casse';
  end if;

  -- (c) La garde de cause lève bien, et sur son code.
  begin
    perform public.generate_plan_cycle_for_user(gen_random_uuid(), 'nimporte_quoi');
    raise exception 'CONTROLE: une cause inconnue est acceptée';
  exception when sqlstate 'RM004' then null;
  end;

  -- (d) Le corps installé porte la dérivation de raison ET le saut de garde. Sans ancre sur les
  --     deux, une réécriture pourrait reposer l'un sans l'autre — ils ne valent qu'ensemble.
  select pg_get_functiondef('public.generate_plan_cycle_for_user(uuid, text)'::regprocedure) into v_def;
  if position('p_cause <> ''contexte''' in v_def) = 0 then
    raise exception 'CONTROLE: la garde d''idempotence ne lit plus p_cause';
  end if;
  if position('then ''contexte'' else ''rebilan''' in v_def) = 0 then
    raise exception 'CONTROLE: la raison d''archivage ne se dérive plus de p_cause';
  end if;

  -- (e) Le RPC de contexte est appelable par `authenticated` et par personne d'autre.
  if not has_function_privilege('authenticated',
       'public.mettre_a_jour_le_contexte(text, text, text, text)', 'execute') then
    raise exception 'CONTROLE: authenticated ne peut pas appeler mettre_a_jour_le_contexte';
  end if;
  if has_function_privilege('anon',
       'public.mettre_a_jour_le_contexte(text, text, text, text)', 'execute') then
    raise exception 'CONTROLE: anon peut appeler mettre_a_jour_le_contexte';
  end if;
  if has_function_privilege('authenticated',
       'public.generate_plan_cycle_for_user(uuid, text)', 'execute') then
    raise exception 'CONTROLE: la régénération est redevenue appelable depuis le client';
  end if;
end;
$$;
