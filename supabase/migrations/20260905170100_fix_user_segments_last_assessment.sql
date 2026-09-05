-- Correctif de `analytics.user_segments` (migration 20260905170000).
--
-- La vue sélectionnait le dernier bilan avec `status = 'submitted'`. Cette valeur n'existe
-- pas : la contrainte de `public.assessments` n'autorise que `in_progress` et `completed`.
-- La jointure latérale ne rendait donc jamais rien, et **la vue s'exécutait sans la moindre
-- erreur** — elle affichait 136 utilisateurs dont zéro avec un poste dominant, ce qui est
-- exactement à quoi ressemblerait un produit que personne n'utilise. Une vue d'analyse ne
-- tombe pas quand elle se trompe : elle répond calmement à côté.
--
-- Le filtre porte maintenant sur `submitted_at is not null`, qui est un fait et non un mot :
-- il ne peut pas dériver si le vocabulaire des statuts change un jour.

create or replace view analytics.user_segments as
select
  p.id as user_id,
  p.created_at,
  p.zone_type,
  p.tc_access,
  p.cadence_type,
  p.onboarding_completed_at is not null as onboarding_done,
  u.is_anonymous,
  r.dominant_poste,
  r.total_co2_kg_year,
  r.mobility_constrained,
  a.submitted_at as last_assessment_at
from public.profiles p
join auth.users u on u.id = p.id
left join lateral (
  select a2.id, a2.submitted_at
  from public.assessments a2
  where a2.user_id = p.id and a2.submitted_at is not null
  order by a2.submitted_at desc
  limit 1
) a on true
left join public.assessment_results r on r.assessment_id = a.id;

revoke all on all tables in schema analytics from anon, authenticated;
