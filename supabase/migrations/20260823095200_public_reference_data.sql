-- transport_modes / emission_factors sont des référentiels non sensibles (pas de donnée
-- utilisateur) : pas de raison de les cacher aux visiteurs non connectés, notamment pour
-- de futurs écrans d'onboarding pré-inscription.

drop policy "transport_modes readable by authenticated users" on public.transport_modes;
drop policy "emission_factors readable by authenticated users" on public.emission_factors;

create policy "transport_modes readable by anyone"
  on public.transport_modes for select
  to anon, authenticated
  using (true);

create policy "emission_factors readable by anyone"
  on public.emission_factors for select
  to anon, authenticated
  using (true);
