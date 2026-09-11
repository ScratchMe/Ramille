-- Corrections relevées en contre-lisant la vague 4 (v1-13, lot 2 socle et serveur), 11/09/2026.
-- Rien ici ne change un comportement : c'est la mise en conformité de trois objets que la vague a
-- ajoutés, aux idiomes que le reste du schéma tient déjà.
--
-- ## 1. La policy de l'archive réévaluait `auth.uid()` par ligne
--
-- `archive_engagement_lecture_proprietaire` était **la seule policy du schéma** écrite
-- `user_id = auth.uid()` et non `user_id = (select auth.uid())`. La différence n'est pas
-- cosmétique : sans le `select`, l'appel est une fonction volatile évaluée **pour chaque ligne
-- examinée** au lieu d'être calculée une fois en initplan. C'est le lint `auth_rls_initplan` de
-- Supabase, et l'archive était le seul objet de la base à le déclencher — toutes les policies
-- écrites depuis `20260823094900` portent la forme cachée.
--
-- Le coût est invisible aujourd'hui (quelques lignes par personne) et le resterait longtemps ;
-- ce qui le rend digne d'une migration, c'est qu'une exception dans une table de dix-huit
-- policies identiques est ce qui se recopie ensuite. La garde est posée côté test (fichier 03) :
-- **aucune policy ne doit appeler `auth.uid()` hors d'un sous-select**, balayage du schéma
-- entier, pour que la prochaine se fasse prendre au lieu d'attendre un audit.
--
-- ## 2. Quatre clés étrangères ajoutées par la vague n'avaient pas d'index
--
-- Postgres n'indexe jamais le **côté enfant** d'une clé étrangère. Tant que personne ne supprime
-- de parent, l'absence ne se voit pas ; mais trois de ces quatre clés ont un parent qui est
-- supprimé en routine :
--
--   * `plan_actions.carried_over_from` → `plan_cycles(id)` en `on delete set null`. Or
--     `generate_plan_cycle_for_user` **supprime et reconstruit** des cycles à chaque re-bilan et à
--     chaque changement de saison : chacune de ces suppressions balaie désormais `plan_actions` en
--     entier pour y chercher les lignes à dénuller. C'est le cas le plus concret des quatre.
--   * `plan_action_commitments_archive.plan_cycle_id` → même mécanique, `on delete set null`.
--   * `plan_action_commitments_archive.action_template_id` → `action_templates(id)`, supprimé
--     seulement par une reprise du référentiel (C3.8 en prévoit une).
--   * `push_tokens.proprietaire_precedent` → `profiles(id)` en `on delete set null` :
--     `delete_my_account` en fait son chemin normal, et c'est une cascade qui traverse déjà
--     toute la base.
--
-- Aucun de ces index ne sert une lecture du produit : ils servent les suppressions, et c'est la
-- raison pour laquelle le lint `unused_index` les signalera un jour sans qu'il faille les retirer.

-- ── 1. La policy de l'archive, à l'idiome du schéma ─────────────────────────────────────

drop policy if exists "archive_engagement_lecture_proprietaire" on public.plan_action_commitments_archive;
create policy "archive_engagement_lecture_proprietaire"
  on public.plan_action_commitments_archive for select
  using (user_id = (select auth.uid()));

-- ── 2. Les index des clés étrangères de la vague ────────────────────────────────────────

create index if not exists plan_actions_carried_over_from_idx
  on public.plan_actions (carried_over_from)
  where carried_over_from is not null;

create index if not exists archive_engagement_plan_cycle_id_idx
  on public.plan_action_commitments_archive (plan_cycle_id);

create index if not exists archive_engagement_action_template_id_idx
  on public.plan_action_commitments_archive (action_template_id);

create index if not exists push_tokens_proprietaire_precedent_idx
  on public.push_tokens (proprietaire_precedent)
  where proprietaire_precedent is not null;

-- Les deux index partiels le sont parce que la colonne est nulle dans l'immense majorité des
-- lignes : une reconduction et une reprise de jeton sont des exceptions, pas la règle. Un index
-- partiel ne couvre pas moins bien la vérification de clé étrangère — Postgres ne cherche que les
-- lignes où la colonne **vaut** la clé supprimée, donc jamais les nulles.

-- ── 3. Contrôle ─────────────────────────────────────────────────────────────────────────

do $controle$
declare
  v_restant text;
begin
  -- La policy ne doit plus contenir d'appel nu. Même expression que la garde du fichier de test,
  -- ici pour que la migration échoue sur place si la réécriture n'a pas pris.
  select regexp_replace(qual, '\( SELECT auth\.uid\(\) AS uid\)', '', 'g') into v_restant
  from pg_policies
  where schemaname = 'public' and policyname = 'archive_engagement_lecture_proprietaire';

  if v_restant is null then
    raise exception 'La policy de l''archive est introuvable.';
  end if;
  if position('auth.uid()' in v_restant) > 0 then
    raise exception 'La policy de l''archive appelle encore auth.uid() hors d''un sous-select.';
  end if;

  if (select count(*) from pg_indexes
      where schemaname = 'public'
        and indexname in ('plan_actions_carried_over_from_idx',
                          'archive_engagement_plan_cycle_id_idx',
                          'archive_engagement_action_template_id_idx',
                          'push_tokens_proprietaire_precedent_idx')) <> 4 then
    raise exception 'Les quatre index de clé étrangère ne sont pas tous posés.';
  end if;
end
$controle$;
