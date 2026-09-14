-- Contre-lecture de la vague 6 (14/09/2026) — `p_replace = NULL` contournait la garde RM001.
--
-- `if not p_replace then raise` est faux pour la valeur nulle : `not null` vaut `null`, donc le test
-- ne déclenche pas, l'appel poursuit, et il libère puis archive l'engagement précédent — exactement
-- ce que C4.6 avait posé cette garde pour interdire. Le défaut d'argument (`false`) rend l'appel sûr
-- quand le paramètre est **omis**, mais un `null` explicite traverse : une variable non renseignée
-- côté client, un `p_replace: null` dans le corps JSON d'un appel PostgREST. C'est le geste le plus
-- irréversible du produit — `committed_at`, les jours et l'échéance sont le seul choix personnel
-- qu'on demande, et l'archive de C2.2 en garde la trace mais ne le rend pas.
--
-- La réécriture part du corps **installé** (`pg_get_functiondef`) et jamais du fichier qui a créé la
-- fonction : `commit_plan_action` porte les trois gardes de C1.12 et la capture d'engagement de
-- C2.2, et repartir d'un fichier d'origine les supprimerait en silence — c'est arrivé une fois.
do $substitution$
declare
  v_def text;
  v_ancre text := 'if not p_replace then';
  v_neuf text := 'if p_replace is not true then';
  v_occurrences int;
begin
  v_def := pg_get_functiondef('public.commit_plan_action(uuid,smallint[],text,boolean)'::regprocedure);

  v_occurrences := (length(v_def) - length(replace(v_def, v_ancre, ''))) / length(v_ancre);

  -- Une substitution vérifiée est à un coup par nature, donc elle doit reconnaître « déjà
  -- appliquée » — et les deux causes de zéro occurrence se distinguent par la **présence du
  -- remplacement**, jamais par la seule absence de l'ancre : ce test-là couvrirait aussi le corps
  -- réécrit autrement, et la migration passerait en silence sans avoir rien fait.
  if v_occurrences = 0 then
    if position(v_neuf in v_def) > 0 then
      return;
    end if;
    raise exception 'Contre-lecture vague 6 : ni l''ancre ni le remplacement ne sont dans commit_plan_action.';
  elsif v_occurrences > 1 then
    raise exception 'Contre-lecture vague 6 : % occurrences de l''ancre au lieu d''une seule.', v_occurrences;
  end if;

  execute replace(v_def, v_ancre, v_neuf);
end
$substitution$;

-- Contrôle : la garde stricte est installée, et l'ancienne forme a bien disparu.
do $controle$
declare
  v_def text := pg_get_functiondef('public.commit_plan_action(uuid,smallint[],text,boolean)'::regprocedure);
begin
  if position('if p_replace is not true then' in v_def) = 0 then
    raise exception 'Contre-lecture vague 6 : la garde stricte de p_replace n''est pas posée.';
  end if;
  if position('if not p_replace then' in v_def) > 0 then
    raise exception 'Contre-lecture vague 6 : l''ancienne garde de p_replace subsiste.';
  end if;
end
$controle$;

comment on function public.commit_plan_action(uuid, smallint[], text, boolean) is
  'Engage une action du cycle. p_replace doit valoir explicitement true pour remplacer un engagement existant : à false ET à null, la fonction refuse (SQLSTATE RM001) plutôt que d''effacer en silence le seul choix personnel que le produit demande.';
