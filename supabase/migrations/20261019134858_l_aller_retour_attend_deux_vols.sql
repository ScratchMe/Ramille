-- Un aller-retour en avion ne se propose qu'à qui a déclaré deux vols (19/10/2026).
--
-- ## Pourquoi
--
-- Depuis `20261018130000`, « Remplacer un aller-retour en avion par le train » compte deux vols
-- (`trips = 2`), et l'estimateur borne le gain par ce que la personne a déclaré (`least`). Qui n'a
-- déclaré qu'un vol court voyait donc encore l'action, avec le gain d'un seul vol sous un libellé qui
-- promet un aller-retour. **Décidé par la personne qui pilote le 19/10/2026** : le plan ne promet pas
-- plus de trajets que la personne n'en a déclaré. Il lui reste « Renoncer à un vol court ou
-- moyen-courrier cette année », dont le libellé et le gain s'accordent.
--
-- ## Ce que fait cette migration
--
-- Une ligne de `estimate_action_savings`, dans la branche des voyages : la garde « au moins un trajet
-- déclaré » devient « au moins autant de trajets que le gabarit en remplace ». La règle est générale,
-- et elle ne touche aujourd'hui qu'un gabarit : c'est le seul des voyages dont `trips` dépasse 1
-- (relevé en production le 19/10/2026). `greatest(t.trips, 1)` garde l'ancienne borne quand `trips` est
-- nul. Le `least(t.trips, v_count)` qui suit reste juste, et ne borne plus rien que la garde n'ait déjà
-- écarté.
--
-- Une substitution vérifiée sur le corps installé (`SUPABASE.md` §2.3), et non une réécriture : le corps
-- complet de la fonction ne se recopie pas pour une ligne. Rejouable : l'ancre absente et le
-- remplacement présent, c'est déjà fait.
--
-- ## Ce qu'elle ne fait pas
--
-- Aucun plan déjà généré n'est rattrapé : l'action disparaît au prochain plan reconstruit (re-bilan,
-- changement de contexte, nouvelle saison), comme le gain de `20261018130000`.

do $l_aller_retour_attend_deux_vols$
declare
  src text;
  cible oid := 'public.estimate_action_savings(uuid)'::regprocedure;
  ancre constant text := 'if v_count < 1 or v_base_co2 <= 0 then continue; end if;';
  remplacement constant text := 'if v_count < greatest(t.trips, 1) or v_base_co2 <= 0 then continue; end if;';
  occurrences int;
begin
  src := pg_get_functiondef(cible);
  occurrences := (length(src) - length(replace(src, ancre, ''))) / length(ancre);

  -- Zéro occurrence de l'ancre veut dire soit « déjà substitué », soit « corps réécrit autrement », où
  -- l'on ne devine pas : les deux se séparent par la présence du remplacement.
  if occurrences = 0 then
    if position(remplacement in src) > 0 then
      return;
    end if;
    raise exception 'estimate_action_savings ne porte ni la garde d''un trajet déclaré, ni celle qui la remplace : le corps a été réécrit autrement.';
  elsif occurrences > 1 then
    raise exception 'La garde d''un trajet déclaré a été trouvée % fois dans estimate_action_savings (une seule attendue).', occurrences;
  end if;

  execute replace(src, ancre, remplacement);
end
$l_aller_retour_attend_deux_vols$;

-- Le contrôle, sur le corps installé sans ses commentaires : la garde est en place, une seule fois, et
-- la borne de l'estimateur n'a pas bougé.
do $controle$
declare
  v_corps text := regexp_replace(pg_get_functiondef('public.estimate_action_savings(uuid)'::regprocedure),
                                 '--[^' || chr(10) || ']*', '', 'g');
begin
  if (length(v_corps) - length(replace(v_corps, 'v_count < greatest(t.trips, 1)', '')))
       / length('v_count < greatest(t.trips, 1)') <> 1 then
    raise exception 'L''estimateur ne porte pas, une seule fois, la garde d''autant de trajets déclarés que le gabarit en remplace';
  end if;
  if position('least(t.trips, v_count)' in v_corps) = 0 then
    raise exception 'L''estimateur a perdu la borne de la déclaration (least)';
  end if;
  if has_function_privilege('anon', 'public.estimate_action_savings(uuid)', 'execute') then
    raise exception 'estimate_action_savings est appelable sans session';
  end if;
end
$controle$;
