-- Adaptation de generate_monthly_checkins() et generate_plan_cycles() au nouveau
-- schéma assessment_results (dominant_poste_label / dominant_poste_mode directement,
-- plus de jointure vers assessment_trips qui n'existe plus).

drop function public.generate_monthly_checkins();

create function public.generate_monthly_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.monthly_checkins (user_id, period_month, trip_label)
  select distinct on (a.user_id)
    a.user_id,
    date_trunc('month', now())::date,
    ar.dominant_poste_label
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed'
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, period_month) do nothing;
end;
$$;

revoke execute on function public.generate_monthly_checkins() from public, anon, authenticated;

drop function public.generate_plan_cycles();

create function public.generate_plan_cycles()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_reduction_pct constant numeric := 20;
  rec record;
  bounds record;
  mode_category text;
begin
  for rec in
    select distinct on (a.user_id)
      a.user_id,
      p.cadence_type,
      ar.dominant_poste_label,
      ar.dominant_poste_co2_kg_year,
      ar.dominant_poste_mode,
      a.submitted_at::date as bilan_date
    from public.assessments a
    join public.profiles p on p.id = a.user_id
    join public.assessment_results ar on ar.assessment_id = a.id
    where a.status = 'completed'
    order by a.user_id, a.submitted_at desc
  loop
    if rec.cadence_type = 'rolling_quarter' then
      select * into bounds from public.rolling_quarter_bounds(rec.bilan_date, current_date);
    else
      select * into bounds from public.season_bounds(current_date);
    end if;

    select category into mode_category from public.transport_modes where id = rec.dominant_poste_mode;

    insert into public.plan_cycles (
      user_id, cadence_type, period_label, period_start, period_end,
      trip_label, baseline_co2_kg_year, target_reduction_pct
    )
    values (
      rec.user_id, rec.cadence_type, bounds.label, bounds.period_start, bounds.period_end,
      rec.dominant_poste_label, rec.dominant_poste_co2_kg_year, target_reduction_pct
    )
    on conflict (user_id, period_start) do nothing;

    insert into public.plan_actions (plan_cycle_id, action_template_id)
    select c.id, at.id
    from public.plan_cycles c
    join public.action_templates at on at.transport_mode_category = mode_category
    where c.user_id = rec.user_id and c.period_start = bounds.period_start
      and not exists (select 1 from public.plan_actions pa where pa.plan_cycle_id = c.id)
    limit 2;
  end loop;
end;
$$;

revoke execute on function public.generate_plan_cycles() from public, anon, authenticated;
