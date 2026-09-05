-- Décalage d'une unité dans le garde-fou de volume des événements d'usage.
--
-- `offset max_per_day limit 1` ne rend une ligne que s'il en existe **501** : le plafond
-- annoncé à 500 en laissait donc passer 501, et ne refusait qu'à la 502ᵉ. Sans conséquence
-- pratique, mais une constante qui ment sur ce qu'elle fait est une constante qu'on ajustera
-- un jour dans le mauvais sens. Le seuil dit maintenant ce qu'il fait : la 501ᵉ est refusée,
-- comme `enforce_feedback_rate_limit` refuse le 11ᵉ retour.
--
-- Au passage, un comportement de PostgreSQL que ce garde-fou rend visible et qu'il vaut mieux
-- connaître avant d'écrire un test : dans un `insert ... select` de plusieurs lignes, les
-- lignes déjà insérées par **la même commande** sont visibles à la requête du trigger
-- `before insert`. Un remplissage en masse déclenche donc le quota en plein milieu, et non à
-- l'insert suivant — c'est exactement ce qui a fait échouer la première version du test 12.

create or replace function public.enforce_usage_events_rate_limit()
returns trigger
language plpgsql
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
