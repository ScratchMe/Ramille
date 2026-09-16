-- Le plan déjà généré porte encore l'ancien premier pas : on le rattrape.
--
-- Suite immédiate de la migration précédente. `plan_actions.first_step` est **figé à la
-- génération**, comme le gain : l'estimateur écrit la valeur du gabarit dans la ligne, et le plan
-- n'est reconstruit qu'au re-bilan ou au changement de saison. Sans ce rattrapage, la personne qui
-- a une action de voyages engagée aujourd'hui continuerait de lire la phrase fautive jusqu'à sa
-- prochaine soumission — c'est-à-dire précisément la carte où le défaut a été trouvé.
--
-- **Pourquoi un instantané a le droit d'être corrigé ici, et pas ailleurs.** Le gel existe pour
-- qu'un changement postérieur ne rende pas le produit incohérent avec ce que la personne a lu ou
-- ce qu'on lui a demandé. Or ici c'est l'instantané lui-même qui est incohérent : la phrase
-- contredit l'action qu'elle amorce. La corriger restaure ce que le gel protège, elle ne le défait
-- pas. Trois colonnes voisines, elles, ne se rattrapent **jamais** de cette façon, et la
-- distinction n'est pas de degré :
--
--   - `engagement_checkins.committed_question` — une question **déjà posée**, et posée par une
--     notification qu'on vient d'ouvrir. La réécrire ferait diverger l'écran du message (C2.1) ;
--   - `engagement_checkins.trip_label` et `.period_label` — les libellés snapshotés qui existent
--     pour qu'un re-bilan ne réécrive pas un point déjà généré ;
--   - `plan_actions.saving_kg_year` et `.saving_share_percent` — un chiffre annoncé, sur lequel
--     quelqu'un a décidé.
--
-- `first_step` n'est dans aucun de ces cas : ce n'est ni une question posée, ni un chiffre sur
-- lequel on s'est engagé, c'est une consigne pratique affichée **après** l'engagement.
--
-- **Appariement par la valeur, jamais par l'identifiant**, et rejouable telle quelle : le `where`
-- porte sur l'ancienne phrase, donc un second passage ne trouve rien et ne fait rien. Le contrôle
-- ne lève pas sur zéro ligne — contrairement à une substitution de corps de fonction, « aucune
-- ligne à rattraper » est ici un état parfaitement normal (une base neuve en CI n'a aucun plan).

do $$
declare
  v_ancien  constant text := 'Note les dates que tu gardes libres, avant de réserver.';
  v_nouveau constant text := 'Regarde lequel de tes projets de voyage peut attendre, ou se passer plus près.';
  v_lignes  integer;
begin
  update public.plan_actions set first_step = v_nouveau where first_step = v_ancien;
  get diagnostics v_lignes = row_count;
  raise notice 'plan_actions : % ligne(s) rattrapée(s).', v_lignes;

  -- La garde qui compte : le rattrapage ne doit rien laisser derrière lui. Si une ligne portait
  -- encore l'ancienne phrase après l'`update`, c'est que quelque chose la réécrit — et il vaut
  -- mieux le savoir ici que le lire sur un écran.
  if exists (select 1 from public.plan_actions where first_step = v_ancien) then
    raise exception 'plan_actions : l''ancien premier pas survit au rattrapage.';
  end if;
end
$$;
