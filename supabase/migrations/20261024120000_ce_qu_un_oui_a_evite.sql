-- Ce qu'un « oui » au point a évité, au moins (24/10/2026, étape 6a de
-- `docs/architecture/v1-35-l-audit-en-chantiers.md`).
--
-- ## Pourquoi
--
-- L'audit du 18/10/2026 : « la boucle ne rend aucun progrès visible ». Répondre « oui » au point ne
-- changeait aucun chiffre. **Décidé par la personne qui pilote le 24/10/2026** : le progrès se dit en
-- kilos de CO₂e évités, une ligne après chaque « oui » et un total pour la saison, séparés du bilan —
-- et un « oui » se compte **au moins une fois** : la plus petite chose qu'il veut dire. Le chiffre est
-- donc toujours vrai, et le prochain bilan ne le dément jamais. `v1-23` §3.2 refusait une « empreinte
-- vivante » qui concurrencerait le bilan : ce chiffre-ci ne se retranche de rien, il dit un minimum.
--
-- ## Ce que vaut « une fois »
--
-- L'unité de l'action, réduite à ce qu'un « oui » affirme à coup sûr :
--
--   - **un aller** sur le trajet domicile-travail, pour une substitution ou un partage : « Mardi ou jeudi,
--     as-tu fait ce trajet à vélo ? » reste vrai d'un seul aller à vélo, ou d'un seul aller à deux ;
--   - **une journée** pour le télétravail : « as-tu travaillé depuis chez toi ? » dit un jour sans aucun
--     des deux trajets, ni aucune des deux jambes ;
--   - **un aller** pour une sortie faite autrement, et **une sortie entière** pour deux sorties regroupées
--     en une — c'est une sortie qui n'a pas lieu ;
--   - **l'action entière** pour un voyage, quand sa question la nomme : « as-tu fait un long trajet en
--     train plutôt qu'en voiture ? », « as-tu remplacé un aller-retour en avion par le train ? » ;
--   - **et rien** quand elle ne la nomme pas. « As-tu eu un déplacement où tu as choisi autre chose que
--     l'avion ? », la question des deux « Renoncer à un vol … cette année », ne dit ni quel vol ni même
--     qu'il y en avait un — et posée chaque mois, un « oui » y aurait compté le vol entier à chaque fois,
--     au-delà de ce que le bilan déclare (contre-lecture du 24/10/2026). « As-tu remplacé un trajet en
--     autocar par le train ? » ne dit pas qu'il était long. `action_templates.oui_se_compte` le dit gabarit
--     par gabarit, **sans valeur par défaut** : un gabarit ajouté demain choisit, et ce choix se relit sur
--     sa question.
--
-- La part d'un aller se lit sur l'instantané figé du bilan (`commute_trip_distance_km` sur les kilomètres
-- annuels des deux jambes, `leisure_trip_distance_km` sur ceux des loisirs) : elle vaut 1 / (2 × jours ×
-- semaines) sans recopier ni les 45 semaines ni les fréquences du calcul (`PLAN.md` §1 : ne jamais
-- recalculer les kilomètres ailleurs). Le facteur de réduction est celui du gain annuel, donc les deux ne
-- peuvent pas diverger. Le gain d'une fois est **tronqué** au centième, jamais arrondi vers le haut :
-- « au moins » doit rester vrai jusqu'au dernier chiffre. Et il ne dépasse jamais le gain annuel arrondi
-- (`least(…, round(v_saving))`) — pour un voyage, les deux sont presque égaux, et la contrainte de
-- `plan_actions` refuserait sinon le plan entier, en silence, à chaque génération.
--
-- ## Ce que fait cette migration
--
-- 1. `action_templates.oui_se_compte` (plus haut), puis `estimate_action_savings` rend une colonne de plus,
--    `saving_kg_once` — un attribut ajouté au type composite `action_saving`, et six substitutions
--    vérifiées sur le corps installé (`SUPABASE.md` §2.3).
-- 2. `plan_actions.saving_kg_once` le fige à la génération, comme `saving_kg_year` : deux substitutions
--    dans `generate_plan_cycle_for_user`. Une contrainte le garde positif et jamais au-dessus du gain
--    annuel.
-- 3. `engagement_checkins.committed_saving_kg_once` le fige sur le point, à côté de `committed_question` :
--    deux substitutions dans chacun des deux générateurs, et seulement quand le point porte l'action
--    engagée (`engagement`, `occasion`). Le figer sur le point et non le relire sur le plan, c'est la
--    raison de `committed_question` : le plan se reconstruit (`delete` puis `insert` de ses actions), un
--    point déjà posé ne se réécrit pas.
-- 4. L'export rend les deux colonnes (`gain_d_une_fois_kg`), à côté du gain annuel qu'il rendait déjà.
-- 5. Un rattrapage, à la valeur et sans rien écraser : les actions de plan déjà générées, quand
--    l'estimateur rend pour le dernier bilan le gain annuel qu'elles portent (sinon elles viennent d'un
--    autre bilan, ou d'un gabarit qui a changé depuis, et on ne devine pas) ; puis les points **en attente** qui portent une action
--    engagée retrouvée sous le même libellé. Les points déjà répondus ne se rattrapent pas : le trigger
--    `prevent_answered_checkin_update` les ferme, et le chiffre manquant n'est qu'un minimum plus bas.
--
-- Le client additionne les gains figés des « oui » ; il ne calcule rien (`src/types/kilos-evites.ts`).
--
-- Rejouable : l'attribut et les colonnes se testent avant d'être ajoutés, chaque substitution se
-- reconnaît déjà faite à la présence de son remplacement, et les rattrapages ne visent que des valeurs
-- nulles.

-- 0. Ce qu'un « oui » à la question d'un gabarit permet de compter. La colonne naît vraie, les trois
-- gabarits dont la question ne nomme pas le trajet passent à faux par leur clé naturelle, puis la valeur
-- par défaut tombe : un `insert` qui ne la dit pas échoue.
alter table public.action_templates add column if not exists oui_se_compte boolean default true;
update public.action_templates
   set oui_se_compte = false
 where action_text in (
   'Renoncer à un vol long-courrier cette année',
   'Renoncer à un vol court ou moyen-courrier cette année',
   'Remplacer un de tes longs trajets en autocar par le train'
 )
   and oui_se_compte;
alter table public.action_templates alter column oui_se_compte set not null;
alter table public.action_templates alter column oui_se_compte drop default;
comment on column public.action_templates.oui_se_compte is
  'Un « oui » à la question de ce gabarit nomme-t-il ce qu''il compte ? Faux quand la question ne dit pas '
  'quel trajet (« as-tu eu un déplacement où tu as choisi autre chose que l''avion ? ») : le gain d''une '
  'fois y est nul, et le « oui » ne dit aucun kilo. Sans valeur par défaut, pour qu''un gabarit ajouté '
  'choisisse. Étape 6a de v1-35, 24/10/2026.';

-- 1. L'attribut du type, puis l'estimateur.
do $l_attribut$
begin
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.action_saving'::regclass and attname = 'saving_kg_once' and not attisdropped
  ) then
    alter type public.action_saving add attribute saving_kg_once numeric;
  end if;
end
$l_attribut$;

alter table public.plan_actions add column if not exists saving_kg_once numeric;
alter table public.plan_actions drop constraint if exists plan_actions_saving_kg_once_borne;
alter table public.plan_actions add constraint plan_actions_saving_kg_once_borne
  check (saving_kg_once is null or (saving_kg_once > 0 and saving_kg_once <= saving_kg_year));
comment on column public.plan_actions.saving_kg_once is
  'Le gain d''une seule fois de l''action, en kg CO₂e : ce qu''un « oui » au point veut dire au minimum '
  '(un aller, une journée de télétravail, une sortie regroupée, un voyage). Figé à la génération comme '
  'saving_kg_year, par estimate_action_savings ; nul quand l''instantané du bilan ne permet pas de le '
  'dire. Étape 6a de v1-35, 24/10/2026.';

alter table public.engagement_checkins add column if not exists committed_saving_kg_once numeric;
alter table public.engagement_checkins drop constraint if exists engagement_checkins_gain_d_une_fois_positif;
alter table public.engagement_checkins add constraint engagement_checkins_gain_d_une_fois_positif
  check (committed_saving_kg_once is null or committed_saving_kg_once > 0);
comment on column public.engagement_checkins.committed_saving_kg_once is
  'Le gain d''une fois de l''action engagée, figé à la génération du point comme committed_question '
  '(copié de plan_actions.saving_kg_once). Nul quand le point ne porte pas d''action (generique, '
  'maintien). Un « oui » vaut au moins ce chiffre ; le client additionne ceux d''une saison. Étape 6a '
  'de v1-35, 24/10/2026.';

-- 2. Les substitutions, dans l'ordre où elles s'appliquent. Chacune se reconnaît déjà faite à la présence
-- de son remplacement — vérifiée **avant** de compter l'ancre, parce que la plupart des remplacements
-- contiennent leur ancre : compter d'abord la trouverait encore, et substituerait une seconde fois.
do $les_substitutions$
declare
  s record;
  src text;
  occurrences int;
begin
  for s in
    select * from (values
      -- L'estimateur : les variables, leur remise à zéro, les trois branches, le calcul, la ligne rendue.
      (1, 'public.estimate_action_savings(uuid)',
       $a$  v_rows public.action_saving[] := '{}';$a$,
       $r$  v_un_aller numeric;
  v_once_base numeric;
  v_once numeric;
  v_rows public.action_saving[] := '{}';$r$),
      (2, 'public.estimate_action_savings(uuid)',
       $a$    v_detail := null;$a$,
       $r$    v_detail := null;
    v_once_base := null;
    v_once := null;$r$),
      (3, 'public.estimate_action_savings(uuid)',
       $a$    elsif t.poste = 'leisure' then$a$,
       $r$      if coalesce(r.commute_trip_distance_km, 0) > 0
         and coalesce(r.commute_main_leg_km_year, 0) + coalesce(r.commute_second_leg_km_year, 0) > 0 then
        v_un_aller := r.commute_trip_distance_km
          / (coalesce(r.commute_main_leg_km_year, 0) + coalesce(r.commute_second_leg_km_year, 0));
        v_once_base := case t.operation
          when 'remove_day' then 2 * v_un_aller * v_commute_total_co2
          when 'remove_trip' then v_un_aller * v_commute_total_co2
          else v_un_aller * r.commute_main_leg_co2_kg_year
        end;
      end if;

    elsif t.poste = 'leisure' then$r$),
      (4, 'public.estimate_action_savings(uuid)',
       $a$      v_base_co2 := t.share * r.leisure_co2_kg_year;$a$,
       $r$      v_base_co2 := t.share * r.leisure_co2_kg_year;
      if coalesce(r.leisure_trip_distance_km, 0) > 0 then
        v_un_aller := r.leisure_trip_distance_km / r.leisure_km_year;
        v_once_base := case t.operation
          when 'remove_trip' then 2 * v_un_aller * r.leisure_co2_kg_year
          else v_un_aller * r.leisure_co2_kg_year
        end;
      end if;$r$),
      (5, 'public.estimate_action_savings(uuid)',
       $a$    v_saving := v_base_co2 * v_reduction_ratio;$a$,
       $r$    v_saving := v_base_co2 * v_reduction_ratio;
    v_once := case
      when not t.oui_se_compte then null
      when t.poste = 'travel' then least(trunc(v_saving, 2), round(v_saving))
      when v_once_base > 0 then least(trunc(v_once_base * v_reduction_ratio, 2), round(v_saving))
    end;
    if v_once <= 0 then
      v_once := null;
    end if;$r$),
      (6, 'public.estimate_action_savings(uuid)',
       $a$    v_rows := v_rows || row(t.id, t.poste, t.action_text, v_detail, round(v_saving))::public.action_saving;$a$,
       $r$    v_rows := v_rows || row(t.id, t.poste, t.action_text, v_detail, round(v_saving), v_once)::public.action_saving;$r$),
      -- Le plan le fige, comme le gain annuel.
      (7, 'public.generate_plan_cycle_for_user(uuid,text)',
       $a$    plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent, detail_text, rank, first_step$a$,
       $r$    plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent, detail_text, rank, first_step,
    saving_kg_once$r$),
      (8, 'public.generate_plan_cycle_for_user(uuid,text)',
       $a$    tpl.first_step$a$,
       $r$    tpl.first_step,
    e.saving_kg_once$r$),
      -- Le point le fige, quand il porte l'action engagée.
      (9, 'public.generate_commute_checkins()',
       $a$    committed_action_text, committed_intention_days, committed_intention_timing, committed_question$a$,
       $r$    committed_action_text, committed_intention_days, committed_intention_timing, committed_question,
    committed_saving_kg_once$r$),
      (10, 'public.generate_commute_checkins()',
       $a$eng.question_template, eng.intention_days)$a$,
       $r$eng.question_template, eng.intention_days),
    case when g.genre = 'engagement'
      then (select pa.saving_kg_once from public.plan_actions pa where pa.id = eng.plan_action_id)
    end$r$),
      (11, 'public.generate_extras_checkins()',
       $a$    committed_action_text, committed_intention_days, committed_intention_timing, committed_question$a$,
       $r$    committed_action_text, committed_intention_days, committed_intention_timing, committed_question,
    committed_saving_kg_once$r$),
      (12, 'public.generate_extras_checkins()',
       $a$s.question_template, s.intention_days)$a$,
       $r$s.question_template, s.intention_days),
    case when g.genre = 'occasion' then pae.saving_kg_once end$r$),
      -- L'export rend ce que l'écran affiche.
      (13, 'public.export_my_data()',
       $a$'gain_kg_par_an', pa.saving_kg_year,$a$,
       $r$'gain_kg_par_an', pa.saving_kg_year,
            'gain_d_une_fois_kg', pa.saving_kg_once,$r$),
      (14, 'public.export_my_data()',
       $a$'action_suivie', c.committed_action_text,$a$,
       $r$'action_suivie', c.committed_action_text,
        'gain_d_une_fois_kg', c.committed_saving_kg_once,$r$)
    ) as v(rang, cible, ancre, remplacement)
    order by rang
  loop
    src := pg_get_functiondef(s.cible::regprocedure);
    -- Sans les retours chariot : des corps de la production en portent (`20261022201848`), et un rejeu
    -- par un autre canal que la première application ne reconnaîtrait pas un remplacement à fins de
    -- ligne différentes — il retrouverait l'ancre, que la plupart des remplacements contiennent.
    if position(replace(s.remplacement, chr(13), '') in replace(src, chr(13), '')) > 0 then
      continue;
    end if;
    occurrences := (length(src) - length(replace(src, s.ancre, ''))) / length(s.ancre);
    if occurrences <> 1 then
      raise exception 'Substitution % : l''ancre « % » a été trouvée % fois dans % (une seule attendue), et son remplacement n''y est pas : le corps a été réécrit autrement.',
        s.rang, s.ancre, occurrences, s.cible;
    end if;
    execute replace(src, s.ancre, s.remplacement);
  end loop;
end
$les_substitutions$;

-- 3. Le rattrapage des actions de plan : à la valeur, depuis le dernier bilan — celui que
-- `generate_plan_cycle_for_user` lit —, et seulement quand l'estimateur y rend le gain annuel que l'action
-- porte déjà. Une action d'un autre bilan, ou d'un gabarit qui a changé depuis (l'aller-retour, deux vols
-- depuis le 18/10/2026, sur une action générée quand il en comptait un), n'a pas le même gain annuel, et
-- reste sans gain d'une fois.
with dernier_bilan as (
  select distinct on (a.user_id) a.user_id, a.id as assessment_id
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed'
  order by a.user_id, a.submitted_at desc nulls last
),
gains as (
  select pa.id as plan_action_id, e.saving_kg_once as gain
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join dernier_bilan d on d.user_id = pc.user_id
  cross join lateral public.estimate_action_savings(d.assessment_id) e
  where pa.saving_kg_once is null
    and e.action_template_id = pa.action_template_id
    and e.saving_kg_year = pa.saving_kg_year
    and e.saving_kg_once is not null
)
update public.plan_actions pa
set saving_kg_once = g.gain
from gains g
where pa.id = g.plan_action_id;

-- 4. Le rattrapage des points en attente qui portent une action : l'action engagée de leur période,
-- retrouvée par la recherche des générateurs, et sous le libellé que le point a figé — sans quoi le
-- gain serait celui d'une autre action que celle de la question.
update public.engagement_checkins c
set committed_saving_kg_once = pa.saving_kg_once
from public.engagement_checkins c2
cross join lateral public.action_engagee_de_la_periode(c2.user_id, c2.poste, c2.period_start) e
join public.plan_actions pa on pa.id = e.plan_action_id
where c.id = c2.id
  and c.status = 'pending'
  and c.question_kind in ('engagement', 'occasion')
  and c.committed_saving_kg_once is null
  and e.action_text = c.committed_action_text
  and pa.saving_kg_once is not null;

-- 5. Le contrôle, sur les corps installés sans leurs commentaires et sur les données.
do $controle$
declare
  v_corps text;
  v_n int;
begin
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.action_saving'::regclass and attname = 'saving_kg_once' and not attisdropped
  ) then
    raise exception 'action_saving n''a pas d''attribut saving_kg_once';
  end if;

  -- Trois gabarits seulement ne comptent pas le « oui », et ce sont ceux dont la question ne nomme pas le
  -- trajet.
  select count(*) into v_n from public.action_templates
  where not oui_se_compte
    and action_text not in (
      'Renoncer à un vol long-courrier cette année',
      'Renoncer à un vol court ou moyen-courrier cette année',
      'Remplacer un de tes longs trajets en autocar par le train'
    );
  if v_n > 0 then
    raise exception '% gabarit(s) inattendu(s) ne comptent pas le « oui »', v_n;
  end if;
  select count(*) into v_n from public.action_templates where not oui_se_compte;
  if v_n <> 3 then
    raise exception 'Trois gabarits ne doivent pas compter le « oui », % le font', v_n;
  end if;

  v_corps := regexp_replace(pg_get_functiondef('public.estimate_action_savings(uuid)'::regprocedure), '--[^\n]*', '', 'g');
  if position('round(v_saving), v_once)::public.action_saving' in v_corps) = 0
     or position('2 * v_un_aller * v_commute_total_co2' in v_corps) = 0
     or position('2 * v_un_aller * r.leisure_co2_kg_year' in v_corps) = 0
     or position('when not t.oui_se_compte then null' in v_corps) = 0
     or position('least(trunc(v_once_base * v_reduction_ratio, 2), round(v_saving))' in v_corps) = 0 then
    raise exception 'estimate_action_savings ne calcule pas le gain d''une fois';
  end if;

  v_corps := regexp_replace(pg_get_functiondef('public.generate_plan_cycle_for_user(uuid,text)'::regprocedure), '--[^\n]*', '', 'g');
  if position('e.saving_kg_once' in v_corps) = 0 then
    raise exception 'generate_plan_cycle_for_user ne fige pas le gain d''une fois';
  end if;

  v_corps := regexp_replace(pg_get_functiondef('public.generate_commute_checkins()'::regprocedure), '--[^\n]*', '', 'g');
  if position('committed_saving_kg_once' in v_corps) = 0 or position('pa.saving_kg_once' in v_corps) = 0 then
    raise exception 'generate_commute_checkins ne fige pas le gain d''une fois';
  end if;

  v_corps := regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure), '--[^\n]*', '', 'g');
  if position('committed_saving_kg_once' in v_corps) = 0 or position('pae.saving_kg_once' in v_corps) = 0 then
    raise exception 'generate_extras_checkins ne fige pas le gain d''une fois';
  end if;

  v_corps := pg_get_functiondef('public.export_my_data()'::regprocedure);
  if (length(v_corps) - length(replace(v_corps, '''gain_d_une_fois_kg''', ''))) / length('''gain_d_une_fois_kg''') <> 2 then
    raise exception 'export_my_data ne rend pas le gain d''une fois deux fois (actions et points)';
  end if;

  -- Un point sans action ne porte pas de gain : la règle des générateurs, vérifiée sur les données.
  select count(*) into v_n from public.engagement_checkins
  where committed_saving_kg_once is not null
    and coalesce(question_kind, '') not in ('engagement', 'occasion');
  if v_n > 0 then
    raise exception '% point(s) portent un gain d''une fois sans action engagée', v_n;
  end if;

  -- Les privilèges n'ont pas bougé : l'estimateur reste fermé à qui n'a pas de session.
  if has_function_privilege('anon', 'public.estimate_action_savings(uuid)', 'execute') then
    raise exception 'estimate_action_savings est appelable sans session';
  end if;
end
$controle$;
