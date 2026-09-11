-- Chantier C1.12 (v1-13 §4) — répondre à un point de suivi passe par un RPC, plus par un
-- `update` PostgREST. Arbitrage D9 du 10/09/2026.
--
-- ## Pourquoi
--
-- `engagement_checkins` portait une policy UPDATE owner-scoped (`engagement_checkins answer
-- own`, 20260827090000) et le privilège `update` au niveau table (20260910110000). Le
-- raisonnement déjà écrit pour `plan_actions` s'applique mot pour mot ici : **la RLS filtre des
-- lignes, jamais des colonnes**. Un client pouvait donc réécrire, sur sa propre ligne :
--
--   * `trip_label` et `period_label` — des libellés snapshotés par `compute_assessment_results`
--     précisément pour qu'un re-bilan ne change pas rétroactivement le texte d'un point déjà
--     généré ;
--   * `period_start` — la clé d'idempotence de `generate_commute_checkins()` /
--     `generate_extras_checkins()` (`unique(user_id, loop_type, period_start)` +
--     `on conflict do nothing`) : la réécrire peut soit bloquer la génération de la période
--     suivante, soit en dupliquer une ;
--   * `status` — qui accepte `expired` depuis 20260904180000 : un point en attente pouvait
--     disparaître de la carte du plan sans jamais avoir été répondu ;
--   * `responded_at` — qui venait de l'horloge du téléphone, défaut déjà corrigé une fois pour
--     `usage_events.occurred_at` (20260905170400).
--
-- Le RPC pose les trois seules colonnes d'une réponse et rien d'autre, avec `now()` du serveur.
-- C'est le seul point d'écriture client de la table, donc le seul endroit où la forme de la
-- réponse changera quand C2.4 ajoutera « pas de trajet cette période » — mais `p_reponse boolean`
-- ne peut pas porter un troisième état : ce sera une migration (colonne `response` et les vues qui
-- la filtrent), pas un paramètre de plus.
--
-- ## Ce qui remplace la policy
--
-- La policy UPDATE est supprimée et le privilège `update` révoqué : comme pour `plan_actions`
-- depuis le 10/09/2026, un ordre direct est désormais refusé par le privilège (42501) avant même
-- d'atteindre la RLS. Les deux gardes sont indépendantes et il faut les deux — le privilège
-- tombe si un `grant` large revient, la policy si quelqu'un en réécrit une.

-- ── 1. Le RPC de réponse ───────────────────────────────────────────────────────────────
-- `security definer` : c'est la vérification de propriété **à l'intérieur** qui protège, pas un
-- revoke, puisque la fonction doit rester appelable par le client. Le filtre `status = 'pending'`
-- est dans le `where` et non dans un test préalable : la mise à jour est ainsi atomique, et deux
-- appels concurrents (double appui, retour de notification) ne peuvent pas tous les deux réussir.

create or replace function public.repondre_au_checkin(
  p_checkin_id uuid,
  p_reponse boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lignes integer;
  v_statut text;
begin
  if p_reponse is null then
    raise exception 'Réponse manquante : un point de suivi se répond par oui ou par non.'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.engagement_checkins
  set status = 'answered',
      response = p_reponse,
      responded_at = now()
  where id = p_checkin_id
    and user_id = auth.uid()
    and status = 'pending';

  get diagnostics v_lignes = row_count;

  if v_lignes = 0 then
    -- Deux refus très différents, et le client doit pouvoir les distinguer : une session qui a
    -- changé (ou un identifiant qui n'est pas le sien) n'appelle pas le même message qu'un point
    -- que le cron a déjà clos pendant que la carte restait affichée. La lecture est bornée au
    -- propriétaire, pour ne rien apprendre sur le point d'un tiers.
    select status into v_statut
    from public.engagement_checkins
    where id = p_checkin_id and user_id = auth.uid();

    if v_statut is null then
      raise exception 'Point de suivi introuvable.' using errcode = 'no_data_found';
    end if;

    -- L'état est nommé en français : `answered` et `expired` sont des valeurs de colonne, et ce
    -- message remonte jusqu'au client par PostgREST.
    raise exception 'Ce point de suivi n''attend plus de réponse (%).',
      case v_statut
        when 'answered' then 'déjà répondu'
        when 'expired' then 'clos par la période suivante'
        else v_statut
      end
      using errcode = 'invalid_parameter_value';
  end if;

  return v_lignes;
end;
$$;

comment on function public.repondre_au_checkin(uuid, boolean) is
  'Seul chemin d''écriture client sur engagement_checkins : pose status, response et responded_at (horloge serveur), et rien d''autre. Les libellés snapshotés et period_start restent hors d''atteinte.';

revoke execute on function public.repondre_au_checkin(uuid, boolean) from public, anon, authenticated;
grant execute on function public.repondre_au_checkin(uuid, boolean) to authenticated;

-- ── 2. La policy et le privilège s'en vont ──────────────────────────────────────────────
-- La ligne `grant select, update on table public.engagement_checkins to authenticated` de
-- 20260910110000_grants_explicites.sql a été ramenée à `grant select` dans le même mouvement : le
-- `revoke` ci-dessous suffit sur une base déjà migrée, mais ce fichier-là est la carte des
-- privilèges du schéma, et une carte qui dit le contraire de la réalité est le mode d'échec qu'il a
-- été écrit pour fermer. La matrice de 18_grants_explicites.test.sql épingle les deux.

drop policy "engagement_checkins answer own" on public.engagement_checkins;

revoke update on public.engagement_checkins from anon, authenticated;

-- ── 3. Deux gardes de l'engagement qui ne tenaient que côté écran (A8-20) ───────────────
-- `plan_actions_engagement_coherent` impose exactement une des deux formes d'intention, mais
-- rien en base ne les rattachait au poste : `commit_plan_action` acceptait des jours de la
-- semaine sur une action de voyage, et une échéance fermée sur une action domicile-travail.
-- « Demander un jour de la semaine pour un voyage produirait une intention que personne ne peut
-- tenir » (v1-07 §3.3) n'était tenu que par `intentionKindForPoste` côté écran — la même
-- situation que la table de vérité du canal de rappel avant qu'elle ne soit épinglée des deux
-- côtés. L'information est à une jointure : `action_templates.poste`.
--
-- Le passage sert aussi à lever explicitement quand les deux formes, ou aucune, sont fournies :
-- c'était la contrainte CHECK qui rattrapait, avec un 23514 que le client ne peut pas lire.
-- Corps par ailleurs identique à 20260905190000.

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
  v_poste text;
  v_forme_attendue text;
begin
  -- Vérification de propriété **dans** la fonction : c'est elle qui protège, pas un REVOKE,
  -- puisque ce RPC doit rester appelable par le client. La jointure sur le template rapporte au
  -- passage le poste visé.
  select pc.id, tpl.poste into v_cycle_id, v_poste
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join public.action_templates tpl on tpl.id = pa.action_template_id
  where pa.id = p_plan_action_id and pc.user_id = auth.uid();

  if v_cycle_id is null then
    raise exception 'Action introuvable.' using errcode = 'no_data_found';
  end if;

  -- Une intention et une seule. Le message nomme la forme attendue : c'est ce qui manquait au
  -- 23514 de la contrainte.
  v_forme_attendue := case when coalesce(v_poste, '') = 'commute' then 'des jours de la semaine' else 'une échéance' end;

  if (p_days is not null) = (p_timing is not null) then
    raise exception 'Une intention et une seule est attendue pour cette action : %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
  end if;

  -- Le rythme de l'intention suit le poste : hebdomadaire pour le domicile-travail, une échéance
  -- fermée partout ailleurs — un trajet de loisir ou un voyage ne se planifie pas par jour de la
  -- semaine.
  if (coalesce(v_poste, '') = 'commute') <> (p_days is not null) then
    raise exception 'Cette action attend %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
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

-- Sa jumelle rendait un succès muet quand aucune ligne ne correspondait (action d'un tiers,
-- identifiant faux) : le client affichait « ok » sur un engagement toujours en place.

create or replace function public.clear_plan_action_commitment(p_plan_action_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lignes integer;
begin
  update public.plan_actions pa
  set committed_at = null, intention_days = null, intention_timing = null
  where pa.id = p_plan_action_id
    and exists (
      select 1 from public.plan_cycles pc
      where pc.id = pa.plan_cycle_id and pc.user_id = auth.uid()
    );

  get diagnostics v_lignes = row_count;

  if v_lignes = 0 then
    raise exception 'Action introuvable.' using errcode = 'no_data_found';
  end if;
end;
$$;

-- ── 4. Deux fonctions de trigger dont l'EXECUTE restait accordé à PUBLIC (A9-15) ────────
-- 20260905170700 a révoqué `execute ... from public, anon, authenticated` sur les deux fonctions
-- de trigger de la mesure d'usage, « par principe — PostgREST n'expose pas une fonction qui rend
-- trigger, mais on ne laisse pas un droit dépendre de ce détail ». `handle_new_user` l'avait reçu
-- dès 20260823095100. Ces deux-là, créées entre les deux, gardaient leur ACL par défaut : ce sont
-- les deux dernières exceptions à une règle que le reste du schéma applique partout.
--
-- Sans effet sur les triggers : PostgreSQL vérifie l'EXECUTE au moment du `create trigger`, pas à
-- chaque déclenchement — c'est ce que 20260905170700 a déjà démontré en pratique.

revoke execute on function public.enforce_feedback_rate_limit() from public, anon, authenticated;
revoke execute on function public.prevent_answered_checkin_update() from public, anon, authenticated;
