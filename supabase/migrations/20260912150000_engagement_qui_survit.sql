-- v1-13, chantier C2.2 — l'engagement survit au re-bilan et au changement de saison.
-- Constats A8-1, A13-5, A4-9, A8-2, A4-20, A8-9 (partie données). Schéma prescrit par `v1-14` §4.3.
--
-- ## Le défaut
--
-- `generate_plan_cycle_for_user` reconstruit le cycle dès qu'un bilan plus récent existe, et fait
-- `delete from public.plan_actions where plan_cycle_id = v_cycle_id`. Partent avec les lignes :
-- `committed_at`, `intention_days`, `intention_timing` — **le seul choix personnel que le produit
-- demande**, et le levier comportemental sur lequel la brique 3 repose. Sans archive, sans un mot,
-- et sans que rien ne le signale à l'écran.
--
-- Ce n'est pas un cas de bord : le re-bilan est encouragé à trois endroits (le suivi, le plan, la
-- restitution), **y compris pour corriger une réponse juste après l'avoir soumise**. Le geste le
-- plus engageant du produit est donc annulable par le second geste le plus encouragé.
--
-- Trois autres chemins partagent la cause :
--
--   * `commit_plan_action` libère l'engagement précédent du même cycle pour poser le nouveau
--     (l'index unique partiel l'impose). « Choisir une autre action » effaçait donc aussi le
--     précédent sans trace — le canvas veut au contraire que l'ancienne reste visible, estompée,
--     « Reste dans ton suivi » (`v1-14` §5) ;
--   * `clear_plan_action_commitment` (« Changer d'avis ») efface de même ;
--   * au **changement de saison**, un cycle neuf remplace l'ancien à l'écran et personne ne relit
--     jamais un cycle passé : l'engagement disparaît de la vue sans avoir été ni tenu ni abandonné.
--
-- ## Ce que cette migration pose
--
-- Une table d'archive, une colonne de reconduction, **un seul endroit qui écrit l'archive**, et les
-- quatre chemins qui l'appellent. La règle visée par le chantier — « aucun chemin du produit ne
-- détruit un engagement sans en laisser une trace lisible » — ne tient que si elle n'a qu'un seul
-- endroit où s'écrire : quatre `insert` recopiés divergeraient au premier ajout de colonne.

-- ── 1. L'archive ────────────────────────────────────────────────────────────────────────
-- Le texte de l'action est **figé** dans l'archive, comme `assessment_results` fige le bilan et
-- `engagement_checkins.trip_label` fige le libellé du point : un gabarit dont le libellé change
-- (C3.8 en reformule plusieurs) ne doit pas réécrire ce que la personne a lu au moment où elle
-- s'est engagée.

create table if not exists public.plan_action_commitments_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- `set null` et non `cascade` : l'archive doit survivre à la disparition d'un cycle, sinon elle
  -- ne serait qu'une copie de ce qui existe déjà. La chaîne vers `profiles`, elle, cascade — c'est
  -- la règle de la suppression de compte, et `15_suppression_et_export` la vérifie niveau par
  -- niveau précisément pour le jour où une table s'ajoute.
  plan_cycle_id uuid references public.plan_cycles(id) on delete set null,
  action_template_id uuid not null references public.action_templates(id),
  action_text text not null,
  -- Mêmes types que `plan_actions` : `smallint[]` et non `int[]`, sans quoi la copie d'un
  -- engagement vers l'archive passerait par une conversion que rien n'affiche.
  intention_days smallint[],
  intention_timing text,
  committed_at timestamptz not null,
  released_at timestamptz not null default now(),
  released_reason text not null check (released_reason in ('rebilan', 'saison', 'changement'))
);

comment on table public.plan_action_commitments_archive is
  'Les engagements relâchés, avec leur raison. Écrite uniquement par public.archiver_engagement, '
  'jamais par le client — c''est ce qui garantit qu''aucun chemin ne détruit un engagement en '
  'silence (C2.2).';
comment on column public.plan_action_commitments_archive.released_reason is
  'rebilan : un nouveau bilan a retiré le gabarit du plan. saison : le cycle suivant ne propose '
  'plus ce gabarit. changement : la personne a changé d''avis ou choisi une autre action.';
comment on column public.plan_action_commitments_archive.action_text is
  'Le libellé figé au moment de l''engagement. C3.8 reformule plusieurs gabarits : relire le '
  'libellé courant réécrirait ce que la personne a lu quand elle a choisi.';

create index if not exists plan_action_commitments_archive_user_released
  on public.plan_action_commitments_archive (user_id, released_at desc);

alter table public.plan_action_commitments_archive enable row level security;

-- Lecture propriétaire seule, écriture serveur seule — même régime que `plan_actions`, et pour la
-- même raison : ces lignes sont un constat, pas une saisie. L'écran du plan les lit pour dire une
-- fois qu'un engagement n'a pas pu être reporté, et `/suivi` les lira (C2.7).
drop policy if exists "archive_engagement_lecture_proprietaire" on public.plan_action_commitments_archive;
create policy "archive_engagement_lecture_proprietaire"
  on public.plan_action_commitments_archive for select
  using (user_id = auth.uid());

-- Le privilège est explicite depuis 20260910110000 : sans ce `grant`, l'app répond « permission
-- denied for table … » **avant** d'atteindre la policy, et rien dans le dépôt ne le dirait.
revoke all privileges on table public.plan_action_commitments_archive from anon, authenticated;
grant select on table public.plan_action_commitments_archive to authenticated;

-- ── 2. La reconduction ──────────────────────────────────────────────────────────────────
-- Pointe le **cycle d'où vient l'engagement**, et non la ligne `plan_actions` précédente : cette
-- ligne-là est supprimée à chaque reconstruction du plan, donc une clé étrangère vers elle
-- s'effacerait d'elle-même (`on delete set null`) et l'étiquette « · RECONDUIT » disparaîtrait sans
-- que rien ne l'explique. Les cycles, eux, ne sont jamais supprimés — le générateur les met à jour.

alter table public.plan_actions
  add column if not exists carried_over_from uuid references public.plan_cycles(id) on delete set null;

comment on column public.plan_actions.carried_over_from is
  'Le cycle d''où cet engagement a été reconduit (changement de saison). C''est ce champ que lit '
  'le suffixe « · RECONDUIT » de l''étiquette d''engagement (v1-14 §5).';

-- Une reconduction sans engagement n'a pas de sens, et c'est la garde qui attrape un chemin de
-- libération qui oublierait de remettre ce champ à null — il est remis à null à trois endroits.
alter table public.plan_actions
  drop constraint if exists plan_actions_reconduction_engagee;
alter table public.plan_actions
  add constraint plan_actions_reconduction_engagee
  check (carried_over_from is null or committed_at is not null);

-- ── 3. Le seul endroit qui écrit l'archive ──────────────────────────────────────────────
-- **Elle prend des valeurs, pas un identifiant de ligne**, et c'est la correction d'un défaut
-- relevé en relisant cette migration : dans le cas du re-bilan, la ligne `plan_actions` est déjà
-- supprimée au moment où l'on sait que son gabarit n'a pas survécu. Une fonction qui relirait la
-- ligne n'archiverait donc **rien**, silencieusement, dans le cas principal du chantier.
--
-- `action_text` est le seul champ encore lu en base : le gabarit, lui, ne disparaît pas.

create or replace function public.archiver_engagement(
  p_user_id uuid,
  p_plan_cycle_id uuid,
  p_action_template_id uuid,
  p_intention_days smallint[],
  p_intention_timing text,
  p_committed_at timestamptz,
  p_raison text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Un appel sur une action non engagée ne fait rien : aucun appelant n'a donc à tester avant, et
  -- aucun ne peut oublier de le faire.
  if p_committed_at is null or p_action_template_id is null then
    return;
  end if;

  insert into public.plan_action_commitments_archive (
    user_id, plan_cycle_id, action_template_id, action_text,
    intention_days, intention_timing, committed_at, released_reason
  )
  select p_user_id, p_plan_cycle_id, p_action_template_id, t.action_text,
         p_intention_days, p_intention_timing, p_committed_at, p_raison
  from public.action_templates t
  where t.id = p_action_template_id;
end;
$$;

comment on function public.archiver_engagement(uuid, uuid, uuid, smallint[], text, timestamptz, text) is
  'Seule écriture de plan_action_commitments_archive. Prend des valeurs et non un plan_action_id : '
  'au re-bilan la ligne est déjà supprimée quand on sait que son gabarit n''a pas survécu (C2.2).';

revoke execute on function public.archiver_engagement(uuid, uuid, uuid, smallint[], text, timestamptz, text)
  from public, anon, authenticated;

-- Le raccourci des deux chemins clients, où la ligne existe encore. Il délègue : l'`insert` reste
-- à un seul endroit.
create or replace function public.archiver_engagement_de_laction(p_plan_action_id uuid, p_raison text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.archiver_engagement(
    pc.user_id, pc.id, pa.action_template_id,
    pa.intention_days, pa.intention_timing, pa.committed_at, p_raison
  )
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  where pa.id = p_plan_action_id and pa.committed_at is not null;
end;
$$;

revoke execute on function public.archiver_engagement_de_laction(uuid, text)
  from public, anon, authenticated;

-- ── 4. « Changer d'avis » laisse une trace ──────────────────────────────────────────────
-- L'archivage précède la remise à null, sinon il n'y a plus rien à archiver. La vérification de
-- propriété reste **dans** la fonction : c'est elle qui protège, `plan_actions` n'ayant ni policy
-- d'écriture ni privilège d'écriture.

create or replace function public.clear_plan_action_commitment(p_plan_action_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_autorise boolean;
begin
  select exists (
    select 1
    from public.plan_actions pa
    join public.plan_cycles pc on pc.id = pa.plan_cycle_id
    where pa.id = p_plan_action_id and pc.user_id = auth.uid()
  ) into v_autorise;

  if not v_autorise then
    return;
  end if;

  perform public.archiver_engagement_de_laction(p_plan_action_id, 'changement');

  update public.plan_actions
  set committed_at = null, intention_days = null, intention_timing = null, carried_over_from = null
  where id = p_plan_action_id;
end;
$$;

-- ── 5. « Choisir une autre action » aussi ───────────────────────────────────────────────
-- Ce chemin-là était le plus discret des quatre : la libération de l'engagement précédent est une
-- ligne interne de `commit_plan_action`, imposée par l'index unique partiel, et elle n'apparaît
-- nulle part à l'écran. Le canvas veut pourtant que l'ancienne action reste lisible (`v1-14` §5,
-- « Reste dans ton suivi »), ce qui n'est possible que si elle est archivée.
--
-- `p_replace` n'est **pas** ajouté ici : `v1-14` §4.3 le mentionne pour C4.6, et un paramètre
-- qu'aucun appel n'émet ne se lit pas « réservé », il se lit « mort » — même règle que pour un
-- événement d'usage déclaré et jamais émis.

create or replace function public.commit_plan_action(
  p_plan_action_id uuid,
  p_days smallint[] default null,
  p_timing text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cycle_id uuid;
  v_precedent uuid;
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
  -- transaction : l'index unique partiel refuserait sinon la seconde ligne. Il est archivé
  -- d'abord — c'est un engagement qui a existé, et le produit ne le jette pas.
  select id into v_precedent
  from public.plan_actions
  where plan_cycle_id = v_cycle_id and committed_at is not null and id <> p_plan_action_id;

  if v_precedent is not null then
    perform public.archiver_engagement_de_laction(v_precedent, 'changement');

    update public.plan_actions
    set committed_at = null, intention_days = null, intention_timing = null, carried_over_from = null
    where id = v_precedent;
  end if;

  update public.plan_actions
  set committed_at = now(),
      intention_days = p_days,
      intention_timing = p_timing
  where id = p_plan_action_id;
end;
$$;

-- ── 6. Le plan reconstruit garde l'engagement, le cycle neuf le reconduit ───────────────
-- Deux situations, et elles s'excluent :
--
--   * **le cycle existe déjà** (re-bilan dans la même période) — l'engagement est repris tel quel
--     sur la ligne du même gabarit. Son `committed_at` d'origine est conservé : c'est le même
--     engagement, pas un nouveau. Si le gabarit ne figure plus dans le plan recalculé, il est
--     archivé en `rebilan`, et c'est cette ligne-là que l'écran lit pour le dire une fois ;
--   * **le cycle est neuf** (changement de saison) — l'engagement du cycle précédent est reconduit
--     si le même gabarit y figure, avec `carried_over_from` posé sur ce cycle précédent. La ligne
--     de l'ancien cycle garde la sienne : c'est de l'historique, et l'index unique étant **par
--     cycle**, les deux coexistent sans conflit. Si le gabarit n'y figure plus, archive en `saison`.
--
-- Le reste de la fonction est repris de son état installé (`pg_get_functiondef`), à trois
-- différences près : la capture avant le `delete`, la reprise après l'insert, et le `nulls last`.

create or replace function public.generate_plan_cycle_for_user(p_user_id uuid)
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
  -- L'engagement à reprendre, quelle que soit sa provenance : le cycle lui-même (re-bilan) ou le
  -- cycle précédent (changement de saison). Une seule variable, donc un seul chemin de reprise.
  v_eng record;
  v_raison text;
begin
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
  -- **`nulls last`, et ce n'est pas décoratif** (A4-20) : `desc` place les NULL en **tête** en
  -- PostgreSQL, donc un bilan complété sans `submitted_at` l'emportait sur tous les autres et le
  -- plan se construisait sur lui. Le trigger de la section 7 rend ce cas impossible pour les
  -- bilans à venir ; cet ordre protège ceux qui existent déjà.
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

  -- Cycle déjà construit APRÈS le dernier bilan : à jour, on n'y touche pas. Cas nominal du cron
  -- quotidien, et garantie de son idempotence — donc aussi la garantie qu'il n'archive rien à
  -- chacun de ses passages.
  if v_existing_created_at is not null and v_existing_created_at >= rec.submitted_at then
    return;
  end if;

  -- **La capture précède tout le reste**, y compris l'upsert : le `delete` plus bas est
  -- irréversible, et c'est lui que ce chantier existe pour rattraper.
  if v_existing_id is not null then
    select pa.action_template_id, pa.committed_at, pa.intention_days, pa.intention_timing,
           pa.carried_over_from, pa.plan_cycle_id as cycle_pour_archive
      into v_eng
    from public.plan_actions pa
    where pa.plan_cycle_id = v_existing_id and pa.committed_at is not null;
    v_raison := 'rebilan';
  else
    -- Cycle neuf : l'engagement à reconduire est celui du cycle précédent, et `carried_over_from`
    -- pointera ce cycle-là — qui est aussi le cycle sous lequel il s'archiverait.
    select pa.action_template_id, pa.committed_at, pa.intention_days, pa.intention_timing,
           pc.id as carried_over_from, pc.id as cycle_pour_archive
      into v_eng
    from public.plan_cycles pc
    join public.plan_actions pa on pa.plan_cycle_id = pc.id and pa.committed_at is not null
    where pc.user_id = p_user_id and pc.period_start < bounds.period_start
    order by pc.period_start desc
    limit 1;
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

  insert into public.plan_actions (
    plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent, detail_text, rank
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
    row_number() over (order by (e.poste = rec.dominant_poste) desc, e.saving_kg_year desc)
  from public.estimate_action_savings(rec.assessment_id) e
  order by (e.poste = rec.dominant_poste) desc, e.saving_kg_year desc
  limit 2;

  if v_eng.action_template_id is null then
    return;
  end if;

  update public.plan_actions
  set committed_at = v_eng.committed_at,
      intention_days = v_eng.intention_days,
      intention_timing = v_eng.intention_timing,
      carried_over_from = v_eng.carried_over_from
  where plan_cycle_id = v_cycle_id and action_template_id = v_eng.action_template_id;

  -- `found` porte sur l'`update` juste au-dessus. Zéro ligne = le gabarit n'est plus proposé :
  -- l'engagement s'arrête là, et il laisse sa trace. L'écran du plan lit cette ligne pour le dire
  -- **une fois** (« Ton plan a changé avec ton nouveau bilan… »), ce qu'il ne pouvait pas faire
  -- quand la ligne disparaissait sans rien laisser.
  if not found then
    perform public.archiver_engagement(
      p_user_id, v_eng.cycle_pour_archive, v_eng.action_template_id,
      v_eng.intention_days, v_eng.intention_timing, v_eng.committed_at, v_raison
    );
  end if;
end;
$function$;

revoke execute on function public.generate_plan_cycle_for_user(uuid) from public, anon, authenticated;

-- ── 7. `submitted_at` vient du serveur ──────────────────────────────────────────────────
-- La garde d'idempotence ci-dessus compare `plan_cycles.created_at`, posé par le serveur, à
-- `assessments.submitted_at`, que le client écrivait avec **l'horloge du téléphone** (A4-20). Un
-- téléphone en avance faisait reconstruire le plan à chaque passage du cron — donc, jusqu'à cette
-- migration, détruire l'engagement chaque nuit ; un téléphone en retard le figeait. Même motif que
-- `stamp_usage_event_time` et que `responded_at`, passé au serveur par `repondre_au_checkin`.
--
-- L'horodatage n'est posé **qu'au passage** en `completed` : un `update` ultérieur sur un bilan
-- déjà complété ne le réécrit pas, sinon la moindre touche à la ligne ferait avancer l'historique.
--
-- Les branches sont écrites séparément, et pas en un seul `or` : en PL/pgSQL la condition d'un `if`
-- est évaluée comme une expression SQL, qui ne garantit **aucun court-circuit** — un `tg_op =
-- 'INSERT' or old.status …` pouvait donc lire `old` sur un INSERT, où il n'est pas assigné.
--
-- Ni `security definer` ni rien à lire : la fonction n'écrit que `new`. Le `revoke` reste
-- nécessaire — PostgreSQL accorde `EXECUTE` à PUBLIC à la création (piège de 20260905170700).

create or replace function public.stamp_assessment_submitted_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.status <> 'completed' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.submitted_at := now();
    return new;
  end if;

  if old.status is distinct from 'completed' or new.submitted_at is null then
    new.submitted_at := now();
  end if;

  return new;
end;
$$;

revoke execute on function public.stamp_assessment_submitted_at() from public, anon, authenticated;

drop trigger if exists stamp_assessment_submitted_at on public.assessments;
create trigger stamp_assessment_submitted_at
  before insert or update on public.assessments
  for each row execute function public.stamp_assessment_submitted_at();

-- ── 8. Le même `nulls last` dans les deux générateurs de points ─────────────────────────
-- `distinct on (a.user_id)` retient la **première** ligne de chaque groupe : avec les NULL en tête,
-- un bilan complété sans `submitted_at` décidait du libellé du point. Les deux fonctions sont
-- reprises de leur état installé (C2.5), à cette clause près.

create or replace function public.generate_commute_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := date_trunc('week', now())::date - 7;
  v_period_label text := 'Semaine du ' || to_char(v_period_start, 'DD/MM');
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'commute' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (
    user_id, loop_type, period_start, period_label, trip_label, poste, question_kind, mode
  )
  select distinct on (a.user_id)
    a.user_id, 'commute', v_period_start, v_period_label, ar.commute_poste_label, 'commute',
    case when tm.category = 'velo_marche' then 'maintien' else 'changement' end,
    ar.commute_poste_mode
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  left join public.transport_modes tm on tm.id = ar.commute_poste_mode
  where a.status = 'completed' and ar.commute_poste_label is not null
  order by a.user_id, a.submitted_at desc nulls last
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$$;

revoke execute on function public.generate_commute_checkins() from public, anon, authenticated;

create or replace function public.generate_extras_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := (date_trunc('month', now()) - interval '1 month')::date;
  v_period_label text := public.mois_francais(v_period_start)
    || ' ' || extract(year from v_period_start)::text;
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'extras' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (
    user_id, loop_type, period_start, period_label, trip_label, poste
  )
  select distinct on (a.user_id)
    a.user_id, 'extras', v_period_start, v_period_label, ar.extras_poste_label, ar.extras_poste
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  join public.assessment_answers ans on ans.assessment_id = a.id
  where a.status = 'completed'
    and ar.extras_poste_label is not null
    and (
      ans.leisure_frequency <> 'rarely'
      or coalesce(ans.flights_total_per_year, 0) > 0
      or coalesce(ans.train_long_trips_per_year, 0) > 0
      or coalesce(ans.car_long_trips_per_year, 0) > 0
    )
  order by a.user_id, a.submitted_at desc nulls last
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$$;

revoke execute on function public.generate_extras_checkins() from public, anon, authenticated;

-- ── 9. L'export emporte l'archive ───────────────────────────────────────────────────────
-- Une table de plus rattachée au compte est une clé de plus dans l'export (même geste que C0.6
-- pour la boîte d'envoi). Ce sont les choix de la personne : les garder hors de l'export rendrait
-- `export_my_data` silencieusement incomplet, exactement le défaut que son `security definer`
-- existe pour éviter sur `usage_events`.
--
-- Substitution **vérifiée** plutôt que retranscription : la fonction fait cent lignes de
-- `jsonb_build_object` imbriqués, et une faute y serait invisible — l'export rendrait un objet
-- parfaitement valide avec une clé en moins.

do $garde_export$
declare
  src text;
  cible oid;
  ancre constant text := E'    ''retours_envoyes'', (';
  remplacement constant text := E'    ''engagements_relaches'', (\n      select coalesce(jsonb_agg(jsonb_build_object(\n        ''action'', ar2.action_text,\n        ''engagement_pris_le'', ar2.committed_at,\n        ''jours_choisis'', ar2.intention_days,\n        ''echeance_choisie'', ar2.intention_timing,\n        ''relache_le'', ar2.released_at,\n        ''raison'', ar2.released_reason\n      ) order by ar2.released_at), ''[]''::jsonb)\n      from public.plan_action_commitments_archive ar2 where ar2.user_id = v_user_id\n    ),\n    ''retours_envoyes'', (';
  occurrences int;
begin
  select p.oid into cible from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = 'export_my_data';

  if cible is null then
    raise exception 'export_my_data est introuvable.';
  end if;

  src := pg_get_functiondef(cible);
  occurrences := (length(src) - length(replace(src, ancre, ''))) / length(ancre);

  if occurrences <> 1 then
    raise exception 'Ancre « retours_envoyes » trouvée % fois (une seule attendue) dans export_my_data.', occurrences;
  end if;

  execute replace(src, ancre, remplacement);
end
$garde_export$;

do $controle_export$
begin
  if position('engagements_relaches' in
      (select prosrc from pg_proc
       where pronamespace = 'public'::regnamespace and proname = 'export_my_data')) = 0 then
    raise exception 'export_my_data n''emporte pas l''archive des engagements.';
  end if;
end
$controle_export$;
