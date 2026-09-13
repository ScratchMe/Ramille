-- Contre-lecture de la vague 5 (C2.1, C2.4, C2.10, C2.12) — un défaut de texte, dans la moitié SQL
-- d'une paire.
--
-- ## Le défaut : deux branches de la même fonction ne parlent pas de la même semaine
--
-- `checkin_question` calcule `v_ouverture` = « La semaine dernière » pour la boucle hebdomadaire
-- (C2.3 : le point interroge la période **écoulée**), puis, quatorze lignes plus bas, remplit la
-- marque `{jours}` d'un gabarit par `coalesce(v_jours, 'Cette semaine')`. Un point d'engagement sans
-- jours figés produisait donc « **Cette semaine**, as-tu fait ce trajet à vélo ? » — la semaine qui
-- commence, celle dont on ne demande rien — pendant que la question générique de la même fonction
-- disait « La semaine dernière ». Vérifié sur la base avant correction :
--
--   checkin_question('commute','engagement',…,'{jours}, as-tu fait ce trajet à vélo ?', null)
--     -> « Cette semaine, as-tu fait ce trajet à vélo ? »
--   checkin_question('commute','generique',…, null, null)
--     -> « La semaine dernière, as-tu changé de mode de transport pour … ? »
--
-- La branche est **défensive** : `commit_plan_action` exige des jours de la semaine pour le poste
-- domicile-travail, donc une action engagée sur ce poste en porte toujours, et les gabarits de la
-- boucle mensuelle ne contiennent pas `{jours}`. Elle ne s'affiche donc pas aujourd'hui — et c'est
-- exactement pour ça qu'elle valait d'être corrigée maintenant : une phrase fausse dans une branche
-- que rien n'exerce attend le jour où une troisième forme d'intention la rendra atteignable.
--
-- ## Le correctif, et pourquoi il n'écrit pas la bonne chaîne
--
-- Remplacer « Cette semaine » par « La semaine dernière » aurait laissé **deux littéraux** à tenir
-- d'accord. Le repli lit désormais `v_ouverture`, la valeur que la fonction vient de calculer : les
-- deux branches ne peuvent plus divergent, elles lisent la même variable. Même raisonnement que
-- `poste_inserable` ou `mois_francais` — un fait, un endroit.
--
-- La jumelle TypeScript (`composerQuestionDuPoint`, `src/types/checkin.ts`) porte le même défaut et
-- le même correctif, dans le même commit : c'est la règle de la paire.
--
-- ## Ce qui n'est pas corrigé, et pourquoi
--
-- Le repli voisin `coalesce(v_mois, 'ce mois')` produirait « En ce mois, … », qui n'est pas du
-- français — mais il est **inatteignable par construction** et non par hasard : `p_period_start` est
-- une `date` non nulle, et `mois_francais` rend un nom de mois pour les douze valeurs possibles de
-- son mois. Lui inventer un repli grammatical demanderait de brancher vers la question générique,
-- c'est-à-dire une branche de plus dans une fonction dont la brièveté est la qualité principale.

do $corrections$
declare
  v_def text;
  v_ancre text := 'coalesce(v_jours, ''Cette semaine'')';
  v_neuf text := 'coalesce(v_jours, v_ouverture)';
  v_occurrences integer;
begin
  -- **Substitution vérifiée, et l'ancre part de l'état installé** — jamais du fichier qui a créé la
  -- fonction (la leçon de C2.2). L'ancre ne contient aucune ligne de commentaire : le distant porte
  -- les corps sans les commentaires du dépôt, donc une ancre qui en contiendrait serait trouvée en
  -- CI et introuvable là-bas.
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'checkin_question';

  if v_def is null then
    raise exception 'Corrections vague 5 : checkin_question est introuvable.';
  end if;

  v_occurrences := (length(v_def) - length(replace(v_def, v_ancre, ''))) / length(v_ancre);

  -- **Une substitution vérifiée est à un coup par nature, et ce bloc la rend rejouable quand même.**
  -- Zéro occurrence de l'ancre a deux causes qu'il faut distinguer : la correction est déjà passée
  -- (rejeu après une restauration — un non-événement), ou le corps a été réécrit autrement (on ne
  -- devine pas). On les sépare par la **présence du remplacement**, jamais par la seule absence de
  -- l'ancre. Sans ce cas explicite, la migration lèverait au second passage — exactement le défaut
  -- relevé sur la vague 5 et consigné dans CLAUDE.md le 12/09/2026.
  if v_occurrences = 0 then
    if position(v_neuf in v_def) > 0 then
      return;
    end if;
    raise exception 'Corrections vague 5 : ni l''ancre ni le remplacement ne sont dans checkin_question.';
  elsif v_occurrences > 1 then
    raise exception 'Corrections vague 5 : % occurrences du repli de {jours} au lieu d''une seule.',
      v_occurrences;
  end if;

  execute replace(v_def, v_ancre, v_neuf);
end
$corrections$;

do $controle$
declare
  v_hebdo text;
  v_generique text;
begin
  v_hebdo := public.checkin_question('commute', 'engagement', 'commute', 'voiture_thermique',
    date '2026-09-07', '{jours}, as-tu fait ce trajet à vélo ?', null);
  v_generique := public.checkin_question('commute', 'generique', 'commute', 'voiture_thermique',
    date '2026-09-07', null, null);

  if v_hebdo <> 'La semaine dernière, as-tu fait ce trajet à vélo ?' then
    raise exception 'Corrections vague 5 : le repli de {jours} rend « % »', v_hebdo;
  end if;

  -- Les deux branches ouvrent sur la même période : c'est l'invariant que le défaut violait, et le
  -- seul qui vaille d'être épinglé ici — il tient même si la phrase change un jour.
  if split_part(v_hebdo, ',', 1) <> split_part(v_generique, ',', 1) then
    raise exception 'Corrections vague 5 : les deux branches n''ouvrent pas sur la même période (% / %)',
      split_part(v_hebdo, ',', 1), split_part(v_generique, ',', 1);
  end if;

  -- Et les jours nommés continuent de gagner sur le repli.
  if public.checkin_question('commute', 'engagement', 'commute', 'voiture_thermique',
       date '2026-09-07', '{jours}, as-tu fait ce trajet à vélo ?', array[2, 4]::smallint[])
     <> 'Mardi ou jeudi, as-tu fait ce trajet à vélo ?' then
    raise exception 'Corrections vague 5 : les jours figés ne remplissent plus la marque.';
  end if;
end
$controle$;
