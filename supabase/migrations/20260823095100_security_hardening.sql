-- Corrections suite aux advisors Supabase (sécurité + perf) sur la migration initiale.

-- handle_new_user() est un trigger function : elle échouerait de toute façon si appelée
-- hors contexte trigger, mais le linter signale qu'elle reste exécutable en RPC direct
-- (/rest/v1/rpc/handle_new_user) par anon/authenticated. On ferme explicitement l'accès.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Index manquants sur les FK signalées par l'advisor perf.
create index assessment_results_dominant_trip_id_idx
  on public.assessment_results(dominant_trip_id);

create index assessment_trip_modes_transport_mode_id_idx
  on public.assessment_trip_modes(transport_mode_id);
