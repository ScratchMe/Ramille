-- Un aller-retour en avion compte pour deux vols.
--
-- ## Pourquoi
--
-- « Remplacer un aller-retour en avion par le train » portait `trips = 1`, et l'estimateur crédite
-- `least(trips, vols courts déclarés)` vols : le gain affiché valait un aller simple, la moitié de ce
-- que le libellé annonce. Le questionnaire compte en trajets simples — « Un aller-retour compte pour
-- deux vols » — et `trips` est exprimé dans l'unité de ce compteur : le gabarit d'un aller-retour
-- vaut donc 2, pas 1. Le défaut ne se voyait nulle part, parce que le chiffre était juste pour un
-- vol et le libellé juste pour un aller-retour.
--
-- ## Ce que fait cette migration
--
-- 1. `trips = 2` sur ce gabarit. L'estimateur ne change pas : `least(trips, v_count)` borne déjà le
--    gain par ce que la personne a déclaré, donc qui déclare un seul vol n'est pas crédité de deux,
--    et qui en déclare quatre l'est de deux seulement.
-- 2. La question du point dit la même chose que le libellé : « as-tu remplacé un aller-retour en
--    avion par le train ? », et non « un vol ». Elle est lue à la génération du point seulement.
--
-- ## Ce qu'elle ne fait pas
--
-- - **Aucun plan déjà généré n'est rattrapé.** `plan_actions.saving_kg_year` est un chiffre annoncé,
--   sur lequel quelqu'un a pu décider : il se recalcule quand le plan est reconstruit (re-bilan,
--   changement de contexte, nouvelle saison), jamais en place (`SUPABASE.md` §2.3).
-- - **Aucun point déjà posé n'est réécrit.** `engagement_checkins.committed_question` est la question
--   telle qu'elle est partie, notification comprise : seuls les points générés après cette migration
--   portent la nouvelle phrase.
-- - **Les gabarits « Renoncer à un vol … » ne bougent pas** : un vol est un trajet simple, donc leur
--   libellé et leur quantité (1) s'accordent.
--
-- Rejouable telle quelle : chaque `update` apparie la clé naturelle (`action_text`) et ne touche que
-- ce qui diffère de la valeur voulue ; le contrôle final refuse un gabarit introuvable ou non conforme.

update public.action_templates
set trips = 2
where action_text = 'Remplacer un aller-retour en avion par le train'
  and trips is distinct from 2;

update public.action_templates
set question_template = 'En {mois}, as-tu remplacé un aller-retour en avion par le train ?'
where action_text = 'Remplacer un aller-retour en avion par le train'
  and question_template is distinct from 'En {mois}, as-tu remplacé un aller-retour en avion par le train ?';

comment on column public.action_templates.trips is
  'Quantité retirée ou remplacée, dans l''unité du compteur du bilan : des jours par semaine pour remove_day, des vols ou des trajets pour les voyages — des allers, jamais des allers-retours (un aller-retour en compte deux). L''estimateur la borne par ce que la personne a déclaré.';

-- Le contrôle est ce qui rend l'appariement par texte sûr : un libellé mal recopié n'apparierait rien,
-- et le gabarit garderait sa moitié de gain en silence.
do $controle$
declare
  v_conformes integer;
begin
  select count(*) into v_conformes
  from public.action_templates
  where action_text = 'Remplacer un aller-retour en avion par le train'
    and segment = 'flight_short'
    and trips = 2
    and question_template = 'En {mois}, as-tu remplacé un aller-retour en avion par le train ?';

  if v_conformes <> 1 then
    raise exception 'l''aller-retour vaut deux vols : % gabarit(s) conforme(s) au lieu d''un seul — le libellé a-t-il changé ?',
      v_conformes;
  end if;
end
$controle$;
