-- Étape 6b — choisir une action du plan et s'y engager (v1-07 §3.3, point 2).
--
-- L'intention d'implémentation (« je le fais le mardi et le jeudi ») est le levier
-- comportemental le mieux établi de la littérature, et le plan était jusqu'ici en lecture
-- seule : on montrait deux actions chiffrées sans jamais permettre d'en retenir une.
--
-- ## Pourquoi un RPC et pas une policy UPDATE
--
-- `authenticated` possède déjà le privilège `UPDATE` au niveau table sur `plan_actions` — un
-- grant par défaut de Supabase. Il est aujourd'hui sans effet parce qu'aucune policy UPDATE
-- n'existe : la RLS filtre toutes les lignes. **Ajouter une policy UPDATE ouvrirait donc
-- l'écriture sur toutes les colonnes**, `saving_kg_year` et `saving_share_percent` compris —
-- des chiffres figés au moment de la génération, exactement comme `assessment_results` fige le
-- bilan. La RLS raisonne par ligne, jamais par colonne ; seul un `grant update (colonnes)`
-- restreint le périmètre, et il faudrait d'abord révoquer le grant large.
--
-- Un RPC `security definer` avec vérification de propriété est plus simple à relire et suit le
-- modèle déjà en place pour `compute_assessment_results` (v1-05 §4) : la table reste en
-- écriture serveur uniquement, et la seule mutation possible est celle que la fonction autorise.
--
-- ## Une seule action engagée à la fois
--
-- « Choisir une action » est le mécanisme, pas une limitation d'écran : s'engager sur les deux
-- revient à ne s'engager sur aucune. Garanti structurellement par un index unique partiel, et
-- le RPC libère l'action précédente dans la même transaction — pas de fenêtre où le cycle
-- porterait deux engagements, ni d'aller-retour côté client.

alter table public.plan_actions
  add column committed_at timestamptz,
  -- 1 = lundi … 7 = dimanche. Pour les actions du poste domicile-travail, dont le rythme est
  -- hebdomadaire.
  add column intention_days smallint[],
  -- Pour les autres postes : un trajet loisir ou un voyage ne se planifie pas par jour de la
  -- semaine. Énumération fermée, jamais du texte libre — `feedback` reste la seule table où un
  -- client écrit une phrase.
  add column intention_timing text
    check (intention_timing is null or intention_timing in ('ce_mois', 'le_mois_prochain', 'prochaine_occasion'));

-- Validation du tableau de jours : une contrainte CHECK ne peut pas porter de sous-requête,
-- d'où une fonction immuable (même approche que `check_usage_event_props`).
create or replace function public.check_intention_days(p_days smallint[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_days is null
     or (array_length(p_days, 1) between 1 and 7
         and not exists (select 1 from unnest(p_days) as d where d < 1 or d > 7)
         and (select count(distinct d) from unnest(p_days) as d) = array_length(p_days, 1));
$$;

alter table public.plan_actions
  add constraint plan_actions_intention_days_valides check (public.check_intention_days(intention_days));

-- Un engagement sans intention n'en est pas un : ce qui fait le levier, c'est le « quand ».
-- Et les deux formes d'intention s'excluent — l'une ou l'autre selon le poste, jamais les deux.
alter table public.plan_actions
  add constraint plan_actions_engagement_coherent check (
    (committed_at is null and intention_days is null and intention_timing is null)
    or (committed_at is not null and (intention_days is not null) <> (intention_timing is not null))
  );

create unique index plan_actions_un_engagement_par_cycle
  on public.plan_actions (plan_cycle_id)
  where committed_at is not null;

-- ── RPC ────────────────────────────────────────────────────────────────────────────────

create or replace function public.commit_plan_action(
  p_plan_action_id uuid,
  p_days smallint[] default null,
  p_timing text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_id uuid;
begin
  -- Vérification de propriété **dans** la fonction : c'est elle qui protège, pas un REVOKE,
  -- puisque ce RPC doit rester appelable par le client.
  select pc.id into v_cycle_id
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  where pa.id = p_plan_action_id and pc.user_id = auth.uid();

  if v_cycle_id is null then
    raise exception 'Action introuvable.' using errcode = 'no_data_found';
  end if;

  -- Libérer l'engagement précédent du même cycle avant de poser le nouveau, dans la même
  -- transaction : l'index unique partiel refuserait sinon la seconde ligne.
  update public.plan_actions
  set committed_at = null, intention_days = null, intention_timing = null
  where plan_cycle_id = v_cycle_id and committed_at is not null and id <> p_plan_action_id;

  update public.plan_actions
  set committed_at = now(),
      intention_days = p_days,
      intention_timing = p_timing
  where id = p_plan_action_id;
end;
$$;

create or replace function public.clear_plan_action_commitment(p_plan_action_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.plan_actions pa
  set committed_at = null, intention_days = null, intention_timing = null
  where pa.id = p_plan_action_id
    and exists (
      select 1 from public.plan_cycles pc
      where pc.id = pa.plan_cycle_id and pc.user_id = auth.uid()
    );
end;
$$;

-- Ces deux-là sont appelées par le client : elles restent ouvertes à `authenticated`, la
-- vérification de propriété étant faite à l'intérieur. `check_intention_days` est pure et
-- appelée par une contrainte CHECK — la révoquer casserait l'insert.
revoke execute on function public.commit_plan_action(uuid, smallint[], text) from public, anon;
revoke execute on function public.clear_plan_action_commitment(uuid) from public, anon;
grant execute on function public.commit_plan_action(uuid, smallint[], text) to authenticated;
grant execute on function public.clear_plan_action_commitment(uuid) to authenticated;
