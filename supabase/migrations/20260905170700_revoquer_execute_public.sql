-- Révocation des droits d'exécution laissés à PUBLIC sur les fonctions de la mesure d'usage.
--
-- La migration initiale faisait `revoke execute on function public.purge_usage_events()
-- from anon, authenticated`. Insuffisant : PostgreSQL accorde `EXECUTE` à **PUBLIC** à la
-- création d'une fonction, et `anon` comme `authenticated` en héritent. Révoquer les rôles
-- nommés sans révoquer PUBLIC ne retire donc rien du tout — l'ACL gardait son entrée `=X/`,
-- et l'advisor de sécurité Supabase signalait les deux fonctions comme appelables depuis
-- `/rest/v1/rpc/…` sans être connecté.
--
-- Concrètement : n'importe quel visiteur pouvait déclencher la purge des douze mois
-- d'historique. Les deux fonctions de trigger sont ajoutées par principe — PostgREST n'expose
-- pas une fonction qui rend `trigger`, mais on ne laisse pas un droit dépendre de ce détail.

revoke execute on function public.purge_usage_events() from public, anon, authenticated;
revoke execute on function public.enforce_usage_events_rate_limit() from public, anon, authenticated;
revoke execute on function public.stamp_usage_event_time() from public, anon, authenticated;

-- `check_usage_event_props` reste exécutable : c'est une fonction pure, sans effet de bord et
-- sans `security definer`, appelée par une contrainte CHECK — la révoquer casserait l'insert.
