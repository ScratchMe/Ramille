-- v1-13, chantier C0.4 (constat C-1) — un événement d'usage pour les pannes de rendu.
-- Réf. docs/exploitation/remontee-erreurs.md.
--
-- ## Pourquoi un événement d'usage et pas un service tiers
--
-- L'arbitrage était entre Sentry (ou équivalent) et la table dont ce référentiel tient la
-- liste. Le second l'emporte pour trois raisons qui se cumulent : aucune dépendance nouvelle
-- dans un projet où chaque module natif ajouté impose un build, aucun compte de plus dans un
-- projet dont tous les accès tiennent à une personne, et **aucune donnée qui sorte du périmètre
-- déjà déclaré dans /confidentialite** — un collecteur d'erreurs reçoit par construction une
-- pile d'appels, une URL complète et souvent une adresse IP, c'est-à-dire un sous-traitant à
-- déclarer et une information à borner.
--
-- Son défaut, écrit noir sur blanc : `track()` renonce quand il n'y a pas de session, et une
-- panne au démarrage est justement le moment où la session peut manquer. La remontée est un
-- filet partiel, pas une garantie. Ce que ça change en pratique, et ce qu'il faudrait pour
-- aller plus loin : docs/exploitation/remontee-erreurs.md §3.
--
-- ## Ce que l'événement porte, et ce qu'il ne portera jamais
--
-- **Deux propriétés : `category` et `route`.** Rien d'autre, et surtout jamais le message de
-- l'exception ni la pile d'appels. Un message d'erreur est du texte libre — il peut contenir une
-- URL avec ses paramètres, une valeur saisie, un identifiant — et du texte libre dans
-- `usage_events` rendrait la table réidentifiante, ce que l'en-tête de
-- 20260905170000_usage_events.sql interdit explicitement. `category` est une liste fermée
-- dérivée du *type* de l'exception (`type`, `reference`, `range`, `syntax`, `uri`, `autre`),
-- c'est-à-dire d'un nom de classe du langage et non d'une donnée ; `route` est un chemin de la
-- table de routage, pas une URL complète.
--
-- Le pendant côté client est `src/types/analytics.ts` (liste `USAGE_EVENT_NAMES` et
-- `appErrorCategory`), livré dans le même lot : sans lui, rien n'émet l'événement et la ligne
-- ci-dessous se lirait **zéro** plutôt que « pas encore instrumenté ».

insert into public.usage_event_types (name, description) values
  (
    'app_error',
    'Une exception de rendu a remonté jusqu''à l''ErrorBoundary du layout racine. props.category (type de l''exception, liste fermée) et props.route. Jamais de message ni de pile.'
  )
on conflict (name) do nothing;
