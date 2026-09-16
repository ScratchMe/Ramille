-- Le premier pas du vol long-courrier décrit un essai, comme celui de son jumeau.
--
-- **13.6 de la recette web du 16/09/2026.** Sous l'action « Renoncer à un vol long-courrier cette
-- année », une fois engagée, le premier pas affiché était : « Note les dates que tu gardes libres,
-- avant de réserver. » Il laisse deux trous — libres pour quoi, réserver quoi — et sa fin
-- **contredit l'action qu'il amorce** : on vient de s'engager à ne pas prendre ce vol, et la
-- consigne parle de ce qu'on fait avant de le réserver.
--
-- Ce n'est pas un mauvais appariement de gabarit : c'est que **le jumeau du même geste** — le
-- `remove_trip` court-courrier, « Renoncer à un vol court ou moyen-courrier cette année » — dit
-- « Regarde lequel de tes déplacements prévus tient sans avion. », qui est un essai : un geste
-- petit, immédiat, sans engagement, qui abaisse le coût de la première fois. C'est exactement ce
-- que `first_step` existe pour porter (C4.6) ; la ligne long-courrier était la seule des cinq
-- actions de voyages à ne pas le faire.
--
-- La nouvelle phrase nomme les deux façons honnêtes de renoncer à un long-courrier sans voler
-- moins loin la même année : décaler, ou aller moins loin. Elle commence par le même verbe que
-- son jumeau, elle ne porte aucun chiffre — `/conditions` affirme que le produit ne fournit pas
-- de prestation de conseil en mobilité, et le gain est déjà affiché juste au-dessus — et les deux
-- balayages pgTAP de C4.6 (aucun gabarit sans premier pas, aucun chiffre dedans) la couvrent sans
-- avoir à la nommer.
--
-- **Le gabarit est désigné par `action_text`**, la clé naturelle du référentiel : `id` vaut
-- `gen_random_uuid()`, donc les identifiants diffèrent d'une base à l'autre et une migration de
-- données qui en citerait un n'apparierait rien en CI (SUPABASE.md §2.3). Un index unique garantit
-- l'unicité du libellé depuis C3.8.
--
-- **Rejouable telle quelle**, et le contrôle sépare les deux causes possibles de « je ne trouve
-- pas l'ancienne phrase » : la migration a déjà été appliquée — on sort sans rien faire — ou le
-- premier pas a été réécrit autrement, et on lève plutôt que de deviner. Reconnaître un rejeu à
-- la seule absence de l'ancienne phrase couvrirait aussi le second cas, et la migration passerait
-- en silence sans avoir rien fait.

do $$
declare
  v_cle      constant text := 'Renoncer à un vol long-courrier cette année';
  v_ancien   constant text := 'Note les dates que tu gardes libres, avant de réserver.';
  v_nouveau  constant text := 'Regarde lequel de tes projets de voyage peut attendre, ou se passer plus près.';
  v_actuel   text;
begin
  select first_step into v_actuel from public.action_templates where action_text = v_cle;

  if not found then
    raise exception 'action_templates : aucun gabarit nommé « % » — le libellé a changé, ou le référentiel n''a pas été semé.', v_cle;
  end if;

  if v_actuel is not distinct from v_nouveau then
    -- Déjà appliquée : rejeu après une restauration, rien à faire.
    return;
  end if;

  if v_actuel is distinct from v_ancien then
    raise exception 'action_templates : le premier pas de « % » n''est ni l''ancien ni le nouveau (%) — réécrit entre-temps, on ne devine pas.', v_cle, coalesce(v_actuel, '<nul>');
  end if;

  update public.action_templates set first_step = v_nouveau where action_text = v_cle;
end
$$;
