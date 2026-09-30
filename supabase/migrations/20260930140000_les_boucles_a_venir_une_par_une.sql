-- Les boucles à venir, une par une (30/09/2026, `v1-27` §12.23).
--
-- `ma_boucle_a_venir()` (`20260930105923`) résumait les boucles d'une personne en une seule valeur —
-- `hebdo` si la boucle hebdomadaire tourne, `mensuel` si seule la mensuelle tourne, `aucune` sinon —
-- parce que la carte d'attente n'annonce que le prochain contact. Deux autres textes du plan ont
-- besoin de savoir **quelle** boucle tourne, décision de la personne qui pilote le même jour :
--
--   * la carte des deux lieux ne nomme « le point régulier » que si une boucle tourne ;
--   * la carte d'un point répondu ne promet plus de prochain point quand **sa** boucle ne tourne
--     plus — et `hebdo` ne dit pas si la mensuelle tourne aussi.
--
-- D'où `public.mes_boucles_a_venir()`, qui rend les boucles elles-mêmes, dans le vocabulaire de
-- `engagement_checkins.loop_type` (`commute`, `extras`) — aucune valeur nouvelle, donc aucune
-- jumelle de plus côté client : `LoopType` est déjà un miroir déclaré. Le résumé de la carte
-- d'attente (la boucle hebdomadaire passe devant) se dérive côté client, dans `boucleAVenir`
-- (`src/types/rappels.ts`), avec ses tests.
--
-- **`ma_boucle_a_venir()` est supprimée, pas doublée** : plus aucun appel ne l'émet, et une fonction
-- qu'aucun appel n'émet se lit « morte » et non « réservée » (la leçon de `p_replace`, C2.2). Aucun
-- build natif ne l'a appelée : elle a vécu une journée, sans build entre-temps (au plus un tous les
-- deux jours). Le web la quitte au déploiement qui suit cette migration, appliquée juste avant la
-- fusion ; jusque-là, et **dans tout onglet resté ouvert sur l'ancien bundle jusqu'à son
-- rechargement**, l'écran retombe sur son repli — pas de carte d'attente, la ligne de relecture.
-- Rien de faux ne s'affiche, et c'est ce qui a fait préférer la suppression dans la même migration
-- à une seconde migration plus tard.
--
-- La règle de « qui reçoit quelle boucle » ne bouge pas : `boucles_du_dernier_bilan`, que lisent
-- aussi les deux générateurs, reste la seule définition. **Ne pas rejouer `20260930105923` après
-- celle-ci** : elle recréerait `ma_boucle_a_venir()`, qu'aucun appel n'émet.
--
-- Gardes : `supabase/tests/database/39_la_carte_d_attente_et_les_boucles.test.sql`.

create or replace function public.mes_boucles_a_venir()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Sans session, aucune — et surtout pas l'appel à `null`, qui interrogerait tout le monde.
  if v_uid is null then
    return '{}'::text[];
  end if;

  -- Triées, pour qu'une même personne rende toujours la même liste.
  return coalesce(
    (select array_agg(o.loop_type order by o.loop_type)
     from public.boucles_du_dernier_bilan(v_uid) o),
    '{}'::text[]
  );
end;
$$;

comment on function public.mes_boucles_a_venir() is
  'Les boucles de points qui tournent pour la personne connectée, d''après son dernier bilan valide '
  '(commute, extras ; vide si aucune). Lue par l''écran du plan — la carte d''attente, la carte des '
  'deux lieux, la carte d''un point répondu — et par le suivi (30/09/2026, v1-27 §12.22 et §12.23).';

revoke execute on function public.mes_boucles_a_venir() from public, anon;
grant execute on function public.mes_boucles_a_venir() to authenticated;

drop function if exists public.ma_boucle_a_venir();

-- Le commentaire de la définition partagée nommait la fonction supprimée : il se réécrit avec elle,
-- sans quoi le catalogue décrirait l'état d'avant.
comment on function public.boucles_du_dernier_bilan(uuid) is
  'Pour chaque personne (p_user_id nul) ou pour une seule, le dernier bilan valide et les boucles de '
  'points qu''il ouvre (commute, extras). Seule définition de « qui reçoit quelle boucle » : les deux '
  'générateurs et mes_boucles_a_venir la lisent (30/09/2026, v1-27 §12.22 et §12.23).';

-- ── Contrôle ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not has_function_privilege('authenticated', 'public.mes_boucles_a_venir()', 'execute')
     or has_function_privilege('anon', 'public.mes_boucles_a_venir()', 'execute') then
    raise exception 'mes_boucles_a_venir doit être appelable par authenticated, et par lui seul';
  end if;
  if to_regprocedure('public.ma_boucle_a_venir()') is not null then
    raise exception 'ma_boucle_a_venir ne doit pas survivre à son remplacement';
  end if;
end;
$$;
