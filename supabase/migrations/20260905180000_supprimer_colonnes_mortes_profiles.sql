-- Suppression de trois colonnes mortes de `public.profiles`.
--
-- Décision du 05/09/2026, suite au défaut décrit en `v1-08-mesure-usage.md` §5.3 : une vue
-- d'analyse s'était branchée sur `profiles.zone_type`, avait segmenté 136 utilisateurs sur
-- `NULL` et n'avait levé aucune erreur. Tant que ces colonnes existent, le piège se referme
-- sur la requête suivante.
--
-- ## Pourquoi elles sont mortes
--
-- `zone_type` / `tc_access` viennent du schéma initial (20260823094800). Le schéma bilan v2
-- (20260824180100) a déplacé le contexte B4 vers `assessment_answers` — où il est écrit par le
-- client et lu par `recompute_assessment_results` et `estimate_action_savings` — **sans les
-- retirer**. Elles portent d'ailleurs un vocabulaire différent de la version vivante
-- (`urbain` / `aucun` contre `urbain_dense` / `periurbain` / `rural` et `inexistant`) : les
-- confondre ne donnerait pas seulement un résultat vide, mais un résultat faux.
--
-- `onboarding_completed_at` n'a jamais été écrit par aucun code. La question produit qui s'en
-- rapprochait — « cette personne a-t-elle déjà fait un bilan ? » — est tranchée à la racine de
-- l'app par `assessments.status = 'completed'`, et la fin de l'onboarding se lit désormais dans
-- l'événement `onboarding_complete` de la mesure d'usage.
--
-- ## Vérifications faites avant le drop
--
--   - 0 valeur non nulle sur 136 profils pour chacune des trois : aucune donnée perdue ;
--   - aucune dépendance dans `pg_depend` (ni vue, ni contrainte, ni index) ;
--   - aucune occurrence dans le code client (toutes les occurrences de `zone_type` /
--     `tc_access` visent `assessment_answers` via `BilanAnswers`) ;
--   - `estimate_action_savings`, `recompute_assessment_results` et les vues `analytics.*`
--     lisent bien `assessment_answers`, jamais `profiles`.
--
-- Le balayage a aussi trouvé quatre autres colonnes entièrement nulles, **conservées** : elles
-- sont vivantes et simplement pas encore alimentées — `emission_factor_sync_runs.detail` et
-- `notification_outbox.last_error` ne s'écrivent qu'en cas d'échec, `commute_carpool_size` et
-- `commute_distance_bracket` sont câblées de bout en bout mais aucun des treize bilans de test
-- n'a utilisé le covoiturage ni la tranche « je ne sais pas ». Une colonne vide n'est pas une
-- colonne morte : ce qui la qualifie, c'est qu'aucun code ne l'écrit.

alter table public.profiles drop column zone_type;
alter table public.profiles drop column tc_access;
alter table public.profiles drop column onboarding_completed_at;
