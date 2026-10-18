-- Les fonctions que `postgres` crée naissent sans EXECUTE pour PUBLIC, `anon` et `authenticated`.
--
-- PostgreSQL accorde EXECUTE à PUBLIC sur toute fonction qu'il crée, et `anon` comme `authenticated`
-- en héritent : une fonction `security definer` dont la migration oublie son `revoke` devient
-- appelable sans session sur `/rest/v1/rpc`, et rien ne le signale. Ce défaut-là est global : une
-- entrée `in schema` ne peut qu'ajouter des privilèges, jamais en retirer (`SUPABASE.md` §1.4). Seule
-- une entrée sans `in schema` le retire, et elle vaut pour tous les schémas où `postgres` crée,
-- `analytics` compris.
--
-- Rien de ce qui existe ne change : une fonction garde son ACL, y compris à travers un
-- `create or replace`. Seules les fonctions créées après celle-ci, ou recréées après un `drop`,
-- naissent fermées. Une fonction que le client appelle — un RPC, ou une fonction qu'une policy ou un
-- `check` évalue pendant une écriture du client — se donne donc par un `grant execute` écrit à côté
-- d'elle, et `54_les_fonctions_que_le_client_peut_appeler.test.sql` la porte sur sa liste.
--
-- L'entrée par schéma de `public` part en même temps : la stack locale y accordait encore EXECUTE à
-- `anon`, `authenticated` et `service_role`, la production n'y gardait que `postgres`, que l'entrée
-- globale couvre déjà. Les deux bases finissent avec la même ligne, globale.
--
-- Des `alter default privileges` seulement : rejouable telle quelle, après une restauration
-- comprise (`docs/exploitation/sauvegarde.md` §4).

alter default privileges for role postgres revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from postgres, anon, authenticated, service_role;
