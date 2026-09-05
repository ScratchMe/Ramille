-- Le garde-fou de volume des événements d'usage ne s'appliquait pas au rôle qu'il vise.
--
-- `enforce_usage_events_rate_limit()` n'était pas `security definer` : elle s'exécutait donc
-- sous le rôle appelant. Or `usage_events` a la RLS activée et **aucune policy de lecture**
-- (délibérément : rien dans le produit ne relit ces lignes). Le `select` de comptage à
-- l'intérieur du trigger ne voyait donc rien depuis une session `authenticated`, `found`
-- restait faux, et le quota ne se déclenchait jamais — sauf sous `postgres`, où il n'a aucune
-- utilité. Autrement dit : le seul garde-fou de la table était inopérant contre exactement ce
-- qu'il devait arrêter, et une table écrite par n'importe quel visiteur anonyme restait sans
-- plafond.
--
-- Ce piège est propre à cette table : `enforce_feedback_rate_limit` compte, elle, sur une
-- table qui a une policy « select own », donc son comptage fonctionne sous RLS. **Un trigger
-- qui compte des lignes que l'appelant n'a pas le droit de lire doit être `security definer`.**
--
-- Trouvé par le test pgTAP, pas par la relecture : le scénario écrivait le remplissage sous
-- `postgres` (par commodité) et ne tentait le dépassement que sous session cliente. C'est
-- précisément l'asymétrie qui a rendu le défaut visible.

create or replace function public.enforce_usage_events_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_per_day constant integer := 500;
begin
  -- `offset n - 1 limit 1` trouve une ligne si et seulement s'il en existe déjà au moins n :
  -- la n+1ᵉ est donc refusée. L'`offset` évite de compter toute la fenêtre — la requête
  -- s'arrête dès qu'elle a de quoi conclure.
  perform 1
  from public.usage_events
  where user_id = new.user_id and occurred_at > now() - interval '24 hours'
  offset max_per_day - 1 limit 1;

  if found then
    raise exception 'Trop d''événements d''usage pour cet utilisateur sur 24 h.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
