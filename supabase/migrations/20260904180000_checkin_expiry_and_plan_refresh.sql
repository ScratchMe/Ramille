-- TraceVerte V1 — increment 12, étape 3 : réparer la boucle d'engagement.
-- Réf. docs/architecture/v1-07-audit-facteurs-et-suivi.md T5 (check-ins périmés), T6 (plan
-- figé), et le trigger d'immutabilité dont le message référençait une table supprimée.
--
-- ── 1. Les check-ins en attente s'accumulaient sans fin ────────────────────────────────
--
-- `generate_commute_checkins()` crée une ligne par semaine, indéfiniment, pour tout
-- utilisateur ayant un bilan complété — et rien ne fermait jamais les semaines passées.
-- Un utilisateur absent huit semaines retrouvait donc **huit cartes identiques** posant la
-- même question, l'écran /plan lisant tous les `status = 'pending'` sans filtre de période.
--
-- C'est un mur de devoirs non faits : très exactement le registre que la spec §2 et §7
-- excluent (« relance factuelle, non culpabilisante », « pas de notification insistante ni
-- répétée »). Une semaine passée sans réponse n'est pas une question encore en attente,
-- c'est une occasion passée.
--
-- Nouveau statut `expired`, posé par la génération de la période suivante. Il n'est **jamais
-- montré comme un échec** — il n'est pas affiché du tout. Il existe pour deux raisons :
-- garder au plus une question vivante par boucle à l'écran, et rendre calculable le signal
-- d'engagement de la spec §7 (2 check-ins consécutifs complétés), qui ne peut pas distinguer
-- « pas encore répondu » de « jamais répondu » tant que tout reste `pending`.

alter table public.engagement_checkins drop constraint engagement_checkins_status_check;
alter table public.engagement_checkins add constraint engagement_checkins_status_check
  check (status in ('pending', 'answered', 'expired'));

-- Index de travail des deux fonctions de génération et de l'écran /plan.
create index engagement_checkins_pending_idx
  on public.engagement_checkins(user_id, loop_type, period_start desc)
  where status = 'pending';

create or replace function public.generate_commute_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := date_trunc('week', now())::date;
  v_period_label text := 'Semaine du ' || to_char(v_period_start, 'DD/MM');
begin
  -- Les semaines passées restées sans réponse se ferment ici : une seule question vivante
  -- à la fois par boucle, jamais une pile.
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'commute' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
  select distinct on (a.user_id)
    a.user_id, 'commute', v_period_start, v_period_label, ar.commute_poste_label
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed' and ar.commute_poste_label is not null
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, loop_type, period_start) do nothing;
end;
$$;

revoke execute on function public.generate_commute_checkins() from public, anon, authenticated;

create or replace function public.generate_extras_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', now())::date;
  v_month_names constant text[] := array['janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre'];
  v_period_label text := v_month_names[extract(month from v_period_start)::int]
    || ' ' || extract(year from v_period_start)::text;
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'extras' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label)
  select distinct on (a.user_id)
    a.user_id, 'extras', v_period_start, v_period_label, ar.extras_poste_label
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed' and ar.extras_poste_label is not null
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, loop_type, period_start) do nothing;
end;
$$;

revoke execute on function public.generate_extras_checkins() from public, anon, authenticated;

-- Rattrapage de l'existant : tout ce qui traîne en `pending` sur une période révolue.
update public.engagement_checkins
set status = 'expired'
where status = 'pending'
  and ((loop_type = 'commute' and period_start < date_trunc('week', now())::date)
    or (loop_type = 'extras' and period_start < date_trunc('month', now())::date));

-- ── 2. Refaire son bilan ne rafraîchissait pas le plan ─────────────────────────────────
--
-- `generate_plan_cycle_for_user` insérait en `on conflict (user_id, period_start) do
-- nothing`. Correct pour le cron quotidien — il ne doit surtout pas réécrire un cycle
-- existant — mais faux après un nouveau bilan : quelqu'un qui change de mode de transport
-- et refait son bilan gardait un plan ancré sur l'ancien poste dominant et l'ancienne
-- baseline **jusqu'à trois mois**, la durée de la saison. C'est le changement — la raison
-- d'être du produit — qui n'était pas reflété.
--
-- Plutôt qu'un drapeau « rafraîchis » que chaque appelant devrait penser à passer (et dont
-- l'ajout rendrait ambigus les appels existants à un seul argument), la fonction tranche
-- elle-même sur un fait qu'elle a déjà sous la main : **le cycle est-il antérieur au dernier
-- bilan complété ?** Si oui il décrit un état dépassé et se reconstruit, si non on ne touche
-- à rien. Le cron reste donc idempotent dans le cas nominal — condition non négociable,
-- l'étape 6 attachera au cycle les actions que l'utilisateur choisit, qu'un passage nocturne
-- ne doit jamais écraser — tout en rattrapant lui aussi un bilan soumis entre-temps.

create or replace function public.generate_plan_cycle_for_user(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_reduction_pct constant numeric := 20;
  rec record;
  bounds record;
  mode_category text;
  v_cycle_id uuid;
  v_existing_created_at timestamptz;
begin
  select
    p.cadence_type,
    ar.dominant_poste_label,
    ar.dominant_poste_co2_kg_year,
    ar.dominant_poste_mode,
    a.submitted_at,
    a.submitted_at::date as bilan_date
  into rec
  from public.assessments a
  join public.profiles p on p.id = a.user_id
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.user_id = p_user_id and a.status = 'completed'
  order by a.submitted_at desc
  limit 1;

  if not found then
    return; -- pas de bilan complété pour cet utilisateur, rien à générer
  end if;

  if rec.cadence_type = 'rolling_quarter' then
    select * into bounds from public.rolling_quarter_bounds(rec.bilan_date, current_date);
  else
    select * into bounds from public.season_bounds(current_date);
  end if;

  select created_at into v_existing_created_at
  from public.plan_cycles
  where user_id = p_user_id and period_start = bounds.period_start;

  -- Cycle déjà construit APRÈS le dernier bilan : il est à jour, on n'y touche pas. C'est le
  -- cas nominal du cron quotidien, et c'est ce qui garantit son idempotence.
  if v_existing_created_at is not null and v_existing_created_at >= rec.submitted_at then
    return;
  end if;

  insert into public.plan_cycles (
    user_id, cadence_type, period_label, period_start, period_end,
    trip_label, baseline_co2_kg_year, target_reduction_pct
  )
  values (
    p_user_id, rec.cadence_type, bounds.label, bounds.period_start, bounds.period_end,
    rec.dominant_poste_label, rec.dominant_poste_co2_kg_year, target_reduction_pct
  )
  on conflict (user_id, period_start) do update set
    cadence_type = excluded.cadence_type,
    period_label = excluded.period_label,
    period_end = excluded.period_end,
    trip_label = excluded.trip_label,
    baseline_co2_kg_year = excluded.baseline_co2_kg_year,
    target_reduction_pct = excluded.target_reduction_pct,
    created_at = now()
  returning id into v_cycle_id;

  select category into mode_category from public.transport_modes where id = rec.dominant_poste_mode;

  -- Sur reconstruction, les actions de l'ancien poste dominant n'ont plus de sens : le bilan
  -- qui vient d'être soumis peut désigner un tout autre mode. Sur une insertion neuve, ce
  -- delete ne trouve rien.
  delete from public.plan_actions where plan_cycle_id = v_cycle_id;

  insert into public.plan_actions (plan_cycle_id, action_template_id)
  select v_cycle_id, at.id
  from public.action_templates at
  where at.transport_mode_category = mode_category
  limit 2;
end;
$$;

revoke execute on function public.generate_plan_cycle_for_user(uuid) from public, anon, authenticated;

-- ── 3. Message du trigger d'immutabilité ───────────────────────────────────────────────
-- Il nommait `monthly_checkins`, table supprimée par la migration 20260827090000. Un
-- message d'erreur qui désigne une table inexistante fait perdre du temps au premier qui le
-- rencontre. Corps inchangé par ailleurs.

create or replace function public.prevent_answered_checkin_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'answered' then
    raise exception 'engagement_checkins: impossible de modifier un check-in déjà répondu (id=%)', old.id;
  end if;
  return new;
end;
$$;
