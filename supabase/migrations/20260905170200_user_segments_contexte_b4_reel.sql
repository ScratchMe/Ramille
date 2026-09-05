-- `analytics.user_segments` lisait des colonnes mortes.
--
-- Les axes de segmentation demandés par l'issue #30 — zone d'habitation et accès aux
-- transports en commun — existent à **deux** endroits du schéma, et la vue s'était branchée
-- sur le mauvais :
--
--   - `profiles.zone_type` / `profiles.tc_access` : créées par le schéma initial
--     (20260823094800), **plus jamais écrites depuis**. Le schéma bilan v2 (20260824180100) a
--     déplacé le contexte B4 vers `assessment_answers` sans les retirer. Zéro ligne
--     renseignée sur 136 profils.
--   - `assessment_answers.zone_type` / `.tc_access` / `.household_vehicles` : la vraie source,
--     renseignée pour la totalité des bilans, et celle que lit `estimate_action_savings` pour
--     filtrer les actions impossibles.
--
-- La vue segmentait donc l'ensemble des utilisateurs sur `NULL` — sans erreur, sans indice,
-- et avec un résultat qu'on aurait pu prendre pour un défaut de collecte plutôt que pour une
-- jointure fausse. Deux colonnes homonymes dont une morte, c'est un piège qui se referme sur
-- quiconque écrit une requête d'analyse sans vérifier laquelle est alimentée.
--
-- Le contexte est lu sur le **dernier bilan soumis**, pas sur le profil : il peut changer
-- entre deux bilans (déménagement), et c'est la valeur du bilan courant qui décrit la
-- personne aujourd'hui.
--
-- `onboarding_done` disparaît pour la même raison : `profiles.onboarding_completed_at` n'est
-- écrit par aucun code du produit. La fin de l'onboarding se lit désormais dans l'événement
-- `onboarding_complete` — c'est exactement le rôle de la mesure d'usage, enregistrer ce que
-- le schéma ne garde pas.

-- `create or replace view` refuse de réordonner les colonnes : il faut recréer, et donc
-- recréer aussi les deux vues qui en dépendent.
drop view if exists analytics.bilan_funnel_by_segment;
drop view if exists analytics.engagement_by_segment;
drop view if exists analytics.user_segments;

create view analytics.user_segments as
select
  p.id as user_id,
  p.created_at,
  p.cadence_type,
  u.is_anonymous,
  ans.zone_type,
  ans.tc_access,
  ans.household_vehicles,
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
left join public.assessment_results r on r.assessment_id = a.id
left join public.assessment_answers ans on ans.assessment_id = a.id;

create view analytics.bilan_funnel_by_segment as
select
  s.zone_type,
  s.tc_access,
  s.dominant_poste,
  e.props ->> 'step' as step,
  count(distinct e.user_id) as users
from public.usage_events e
join analytics.user_segments s on s.user_id = e.user_id
where e.name = 'bilan_step_view'
group by 1, 2, 3, 4;

create view analytics.engagement_by_segment as
select
  s.zone_type,
  s.tc_access,
  s.dominant_poste,
  c.loop_type,
  count(*) filter (where c.status = 'answered') as answered,
  count(*) filter (where c.status = 'expired') as expired,
  count(*) filter (where c.status = 'answered' and c.response) as answered_yes
from public.engagement_checkins c
join analytics.user_segments s on s.user_id = c.user_id
group by 1, 2, 3, 4;

revoke all on all tables in schema analytics from anon, authenticated;
