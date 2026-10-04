-- Les colonnes que le client écrit, et le calcul qu'on ne refait pas (04/10/2026, revue finale
-- avant la production).
--
-- Trois surfaces plus larges que ce que l'app en fait, relevées à la revue et mesurées sur la
-- production avant d'écrire (`has_column_privilege` en lecture seule). La règle est celle de
-- `SUPABASE.md` §1.4 : la RLS filtre des lignes, jamais des colonnes — quand le client n'écrit que
-- quelques colonnes, c'est le privilège de colonne qui le dit, et la révocation de table le précède.
--
-- Rejouable telle quelle : `revoke`, `grant` et `create or replace` le sont tous.

-- ── 1. `assessments` : le client n'insère que `user_id` et `status` ────────────────────────────
--
-- L'`insert` était accordé sur toutes les colonnes (`20260910110000`), quand seul l'`update` avait
-- été resserré (`20260920160000`). Le client pouvait donc fixer lui-même `created_at` et
-- `submitted_at` — que le trigger d'estampille ne touche qu'à la finalisation —, et la purge des
-- sessions anonymes lit précisément ces deux dates (`purge_stale_anonymous_accounts`) : un bilan
-- daté de 2099 rendait un compte anonyme impossible à purger, et faussait les semaines tenues de sa
-- cohorte. La soumission n'écrit que ces deux colonnes (`src/app/bilan/index.tsx`) ; les autres
-- prennent leur défaut.
revoke insert on public.assessments from authenticated;
grant insert (user_id, status) on public.assessments to authenticated;

-- ── 2. `profiles` : le client ne met à jour que ses deux préférences de rappel ──────────────────
--
-- L'`update` de table ouvrait aussi `cadence_type`, qui fait suivre au plan un chemin dormant
-- (`rolling_quarter`), et `created_at`. L'app n'écrit que le canal de rappel et le mot de la veille
-- (`src/lib/notification-prefs.ts`).
revoke update on public.profiles from authenticated;
grant update (reminder_channel, mot_de_la_veille) on public.profiles to authenticated;

-- ── 3. `compute_assessment_results` : un bilan finalisé, calculé une fois ─────────────────────
--
-- La propriété était vérifiée, le statut non : un client pouvait faire recalculer un bilan complété
-- depuis longtemps — avec la formule du jour, alors que `assessment_results` est figé côté serveur —,
-- ou un bilan retiré, dont le recalcul regénère le plan. Deux gardes, en plus de la propriété :
--   * **un bilan qui n'est pas `completed` est refusé** (`RM008`). La soumission finalise avant de
--     calculer, et c'est le seul appelant ; un bilan en cours n'a pas de réponses définitives, un
--     bilan retiré n'a plus de plan à porter ;
--   * **un bilan déjà calculé ne se recalcule pas** : l'appel rend la main sans rien faire. C'est ce
--     qui rend sûr le nouvel essai d'une soumission dont la réponse s'est perdue en chemin
--     (`repriseDeLaSoumission`, `src/types/soumission.ts`) : le résultat existe déjà. Le plan, lui,
--     peut manquer — sa génération est enveloppée dans une sous-transaction qui n'emporte pas le
--     résultat (`BILAN.md` §3) —, mais ce cas ne faisait pas échouer l'appel, donc aucun nouvel essai
--     ne le rattrapait non plus : c'est le passage nocturne qui le fait (`generate_plan_cycles`, qui
--     reprend tout utilisateur au bilan complété).
-- Les recalculs voulus (une correction de facteur, de formule) passent par
-- `recompute_assessment_results`, côté serveur, que le client ne peut pas appeler.
--
-- Réécrite depuis `pg_get_functiondef` sur la production (`SUPABASE.md` §2.3), et `pg_temp` en
-- dernier dans `search_path`.
create or replace function public.compute_assessment_results(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_owner_id uuid;
  v_status text;
begin
  select user_id, status into v_owner_id, v_status from public.assessments where id = p_assessment_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'compute_assessment_results: bilan introuvable ou accès refusé';
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

-- Un `create or replace` garde l'ACL de la fonction, mais on ne la suppose pas (`SUPABASE.md` §1.4) :
-- `public` d'abord, sans quoi `anon` en hérite.
revoke execute on function public.compute_assessment_results(uuid) from public, anon;
grant execute on function public.compute_assessment_results(uuid) to authenticated;
