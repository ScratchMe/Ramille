-- L'origine et la version des pannes, et la version des ouvertures (18/10/2026).
--
-- **Ce qui change côté app** (`src/lib/remontee-des-pannes.ts`) : `app_error` ne venait que du rendu — de
-- l'`ErrorBoundary` du layout racine. Il vient aussi, désormais, du gestionnaire global de React Native,
-- du suivi des rejets de Hermes et des événements `error` / `unhandledrejection` du navigateur. Une panne
-- fatale, qui ferme l'app avant tout envoi, est gardée sur l'appareil et part au lancement suivant
-- (`props.differee`). Deux propriétés s'ajoutent :
--
--   * `app_error.props.origine` : `rendu`, `globale`, `fatale` ou `promesse` (`ORIGINES_DES_PANNES`,
--     `src/types/analytics.ts`) ;
--   * `app_error.props.version` et `app_open.props.version` : la version de l'app, suivie de son numéro
--     de build sur natif (`1.0.0+14`) ; la version seule sur le web.
--
-- **`check_usage_event_props` ne change pas, et c'est mesuré** : la panne la plus large — catégorie, route,
-- origine, version, `differee`, `retard_h` — tient dans ses six clés, et une version tient dans ses
-- 48 caractères. La version et le build tiennent dans une seule valeur pour cette raison : une septième
-- clé aurait demandé d'élargir la borne de tous les événements, et l'écrêtage côté app
-- (`sanitizeEventProps`) aurait fait tomber `retard_h` sans bruit. Un test Jest le garde côté app
-- (`src/types/erreurs-en-attente.test.ts`), le pgTAP `56` côté base.
--
-- **Ce que cette migration fait** : la base ne valide pas les valeurs de `props`, donc les valeurs
-- attendues s'écrivent là où elle peut les porter — la description du référentiel (`MESURE.md` §1).
-- Repartie des dernières descriptions (`20261002203259` pour `app_error`, `20260911110000` pour
-- `app_open`). Idempotente : deux `update` sur la clé naturelle.

update public.usage_event_types
set description = 'Une panne de l''app. props.category (type de l''exception, liste fermée) et props.route '
  || '(un chemin du produit, /+not-found pour une adresse inconnue). Jamais de message ni de pile. '
  || 'Depuis le 18/10/2026, props.origine : rendu (ErrorBoundary du layout racine), globale (exception que '
  || 'personne n''a rattrapée, l''app restée ouverte), fatale (la même, qui ferme l''app : elle part au '
  || 'lancement suivant), promesse (rejet que personne n''attend) — sans origine, une ligne d''avant, venue '
  || 'du rendu ; et props.version, la version de l''app au moment de la panne (1.0.0+14 sur natif, '
  || 'version+build ; la version seule sur le web). Depuis le 02/10/2026, props.differee = true et '
  || 'props.retard_h (heures) quand la panne a attendu sur l''appareil — pas de session, pas de réseau, ou '
  || 'une panne fatale — avant de partir : occurred_at est alors l''heure de l''envoi.'
where name = 'app_error';

update public.usage_event_types
set description = 'Ouverture de l''app — dénominateur de tous les entonnoirs. props.origine : « demarrage » '
  || 'après la résolution d''ensureSession() (jamais au montage), « retour » au passage au premier plan après '
  || 'plus de cinq minutes en arrière-plan (natif seulement). Depuis le 18/10/2026, props.version : la version '
  || 'de l''app (1.0.0+14 sur natif, version+build ; la version seule sur le web). Une surface sans compte '
  || '(/confidentialite, /conditions, /compte/suppression, /rappels/stop, /status) ouverte sans session n''en '
  || 'crée pas, donc ne compte pas d''ouverture tant qu''on n''en sort pas pour l''app.'
where name = 'app_open';

do $$
begin
  if (select count(*) from public.usage_event_types
      where name in ('app_error', 'app_open') and description like '%18/10/2026, props.%') <> 2 then
    raise exception 'Les descriptions d''app_error et d''app_open ne portent pas leurs propriétés du 18/10/2026.';
  end if;
end;
$$;
