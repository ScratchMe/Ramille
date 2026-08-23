-- TraceVerte V1 — increment 4 : purge des comptes anonymes jamais rattachés (brique 5)
-- Réf. docs/architecture/v1-04-authentification.md §3

create function public.purge_stale_anonymous_accounts()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users
  where is_anonymous = true
    and created_at < now() - interval '90 days';
end;
$$;

revoke execute on function public.purge_stale_anonymous_accounts() from public, anon, authenticated;

select cron.schedule(
  'purge-stale-anonymous-accounts',
  '0 4 * * *',
  $$select public.purge_stale_anonymous_accounts()$$
);
