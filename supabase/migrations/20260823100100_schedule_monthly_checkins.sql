create extension if not exists pg_cron;

select cron.schedule(
  'generate-monthly-checkins',
  '0 6 1 * *',
  $$select public.generate_monthly_checkins()$$
);
