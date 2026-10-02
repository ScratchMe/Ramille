-- La question du mois attend le mois choisi (`v1-33` D14, recommandation suivie le 01/10/2026,
-- livrée le 02/10/2026).
--
-- **Le défaut.** Une action de sorties choisie en octobre avec l'échéance « Le mois prochain » est
-- prévue pour novembre. Le 1er novembre, le point du mois demandait pourtant « En octobre, as-tu
-- fait… ? » — dont la seule réponse honnête est « Non », suivie de la consolation d'échec et d'un
-- « Non » inscrit au suivi pour une action que la personne n'avait pas encore à faire. L'échéance
-- choisie ne réglait rien de ce que le point demandait.
--
-- **La règle.** Tant que le mois interrogé n'est pas postérieur au mois où l'action a été choisie
-- avec « Le mois prochain », le point pose la question générique du poste et ne retient pas
-- l'action : `committed_action_text`, ses jours, son échéance et son gabarit restent nuls, comme
-- pour un point sans engagement. Le mois suivant, l'action est interrogée comme avant. Choisie en
-- octobre : le 1er novembre, question générique sur octobre ; le 1er décembre, « En novembre, as-tu
-- fait… ? ». C'est ce que la feuille ouverte après « C'est noté » promet désormais, en nommant le
-- mois (« Début décembre, je reviens te demander si tu l'as faite », `ligneDAttenteDeLaFeuille`).
--
-- **Trois bornes, et ce qu'elles évitent** :
--   * « postérieur » et non « différent » : `action_engagee_de_la_periode` ne borne pas
--     `committed_at`, donc une action choisie le 1er novembre à 0 h 30 — avant le passage de 6 h —
--     est retrouvée par le point qui interroge octobre ;
--   * le mois du choix se lit en **heure de Paris** : choisie le 1er octobre à 0 h 30, l'action l'est
--     en octobre pour la personne, et en septembre pour UTC ;
--   * `committed_at` survit à la reconduction (`generate_plan_cycle_for_user` le recopie), donc un
--     changement de saison ne remet pas le compteur à zéro.
--
-- **Ce qui ne change pas** : le poste du point suit toujours l'action engagée (`v1-27` §12.25), y
-- compris le mois où elle n'est pas encore interrogée — la question générique porte sur ses
-- sorties, pas sur le poste le plus lourd. Les deux autres échéances des sorties et celles des
-- voyages ne bougent pas, ni la boucle hebdomadaire, ni aucune signature.
--
-- **Réécrite depuis `pg_get_functiondef` du distant** (`SUPABASE.md` §2.3) : le corps de
-- `20260930151846`, dont l'empreinte normalisée a été comparée le 02/10/2026 à celle du distant —
-- identiques —, et trois changements : la jointure qui lit `committed_at`, la décision
-- (`pas_encore`) et les colonnes du point qui en dépendent.
--
-- **Ne rejouer après elle aucune migration qui réécrit ce générateur** (`grep -il 'function
-- public.generate_extras_checkins'` sur `supabase/migrations/`) : la question de l'action
-- reviendrait le mois du choix, sans que rien ne le signale.

create or replace function public.generate_extras_checkins()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_period_start date := (date_trunc('month', now()) - interval '1 month')::date;
  v_period_label text := public.mois_francais(v_period_start)
    || ' ' || extract(year from v_period_start)::text;
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'extras' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (
    user_id, loop_type, period_start, period_label, trip_label, poste, question_kind,
    committed_action_text, committed_intention_days, committed_intention_timing, committed_question
  )
  select
    a.user_id, 'extras', v_period_start, v_period_label, b.libelle, b.poste,
    g.genre,
    s.action_text, s.intention_days, s.intention_timing,
    public.checkin_question('extras', g.genre, b.poste, null, v_period_start,
                            s.question_template, s.intention_days)
  -- Qui reçoit la boucle, et depuis quel bilan : décidé en un seul endroit, que l'écran du plan lit
  -- aussi — la base déclarée (`a_des_voyages_declares`) comprise (30/09/2026).
  from public.boucles_du_dernier_bilan() o
  join public.assessments a on a.id = o.assessment_id
  join public.assessment_results ar on ar.assessment_id = a.id
  join public.assessment_answers ans on ans.assessment_id = a.id
  cross join lateral (
    -- L'action engagée décide d'abord (v1-27 §12.25). Si les deux postes en rendent une — deux
    -- cycles qui se chevauchent —, la plus récente gagne, comme la fonction le fait pour un poste.
    select (
      select v.poste
        from (values ('leisure'::text), ('travel'::text)) as v(poste)
        cross join lateral public.action_engagee_de_la_periode(a.user_id, v.poste, v_period_start) e
        join public.plan_actions pa on pa.id = e.plan_action_id
       order by pa.committed_at desc
       limit 1
    ) as poste_de_l_action
  ) act
  cross join lateral (
    -- Sans action : qui sort rarement n'a déclaré, hors de son trajet, que ses voyages — c'est sur
    -- eux que porte la boucle, même quand le résiduel des sorties pèse plus lourd ;
    -- `boucles_du_dernier_bilan` garantit qu'il en a. Les autres : le poste le plus lourd.
    select coalesce(
      act.poste_de_l_action,
      case when ans.leisure_frequency = 'rarely' then 'travel' else ar.extras_poste end
    ) as poste
  ) p
  cross join lateral (
    -- Le mode ne se dit que sur le poste le plus lourd, seul que le bilan fige — et jamais sur le
    -- résiduel des sorties rares. Un résultat sans `extras_poste` (la colonne l'admet, aucune ligne
    -- de production ne l'a) garde son libellé, comme avant — sauf si une action décide du poste :
    -- le libellé nomme alors ce poste, comme la question. Branche défensive, qu'aucun test n'exerce.
    select
      p.poste,
      case
        when ar.extras_poste is null and act.poste_de_l_action is null then ar.extras_poste_label
        when p.poste = ar.extras_poste and not (ans.leisure_frequency = 'rarely' and p.poste = 'leisure')
          then ar.extras_poste_label
        when p.poste = 'leisure' then 'Loisirs du week-end'
        else 'Voyages longue distance'
      end as libelle
  ) b
  -- L'action engagée est cherchée sur le poste DE LA BOUCLE, celui que `b` vient de choisir. La
  -- fonction reçoit ce poste, elle ne le choisit pas (v1-27 §5).
  left join lateral public.action_engagee_de_la_periode(a.user_id, b.poste, v_period_start) eng
    on true
  -- D14 (02/10/2026) : une action choisie pour « Le mois prochain » ne s'interroge pas avant ce
  -- mois-là. Choisie en octobre, elle est prévue pour novembre : demander « En octobre, as-tu
  -- fait… ? » n'a qu'une réponse honnête, « Non ». Tant que le mois interrogé n'est pas postérieur au
  -- mois du choix, le point pose donc la question générique et ne retient pas l'action — rien ne s'y
  -- referme, et la carte ne la nomme pas. « Postérieur » et non « différent » : la recherche de
  -- l'action ne borne pas `committed_at`, donc une action choisie le 1er novembre à 0 h 30 est
  -- retrouvée par le point du 1er novembre, qui interroge octobre.
  -- Le mois du choix se lit en heure de Paris, celle de qui a choisi « Le mois prochain » ; et
  -- `committed_at` survit à la reconduction (`generate_plan_cycle_for_user`), donc la règle aussi.
  left join public.plan_actions pae on pae.id = eng.plan_action_id
  cross join lateral (
    select coalesce(
      eng.intention_timing = 'le_mois_prochain'
        and date_trunc('month', pae.committed_at at time zone 'Europe/Paris')::date >= v_period_start,
      false
    ) as pas_encore
  ) d
  cross join lateral (
    select
      case when d.pas_encore then null else eng.action_text end as action_text,
      case when d.pas_encore then null else eng.intention_days end as intention_days,
      case when d.pas_encore then null else eng.intention_timing end as intention_timing,
      case when d.pas_encore then null else eng.question_template end as question_template
  ) s
  cross join lateral (
    -- Pas de `maintien` ici : la catégorie vélo/marche ne qualifie que le trajet quotidien.
    select case when s.question_template is not null then 'occasion' else 'generique' end as genre
  ) g
  where o.loop_type = 'extras'
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$function$;

revoke execute on function public.generate_extras_checkins() from public, anon, authenticated;

-- Contrôle, lu sur le corps installé sans ses commentaires (`SUPABASE.md` §1.5).
do $controle_du_mois_choisi$
declare
  v_corps text := regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                                 '--[^' || chr(10) || ']*', '', 'g');
begin
  if v_corps not like '%eng.intention_timing = ''le_mois_prochain''%'
     or v_corps not like '%pae.committed_at at time zone ''Europe/Paris''%'
     or v_corps not like '%>= v_period_start%' then
    raise exception 'CONTROLE: generate_extras_checkins n''attend pas le mois choisi : le corps installé n''est pas celui de cette migration';
  end if;
  -- Les règles des migrations précédentes, que la réécriture devait garder.
  if v_corps not like '%action_engagee_de_la_periode(a.user_id, v.poste, v_period_start)%' then
    raise exception 'CONTROLE: la question du mois ne suit plus l''action engagée (20260930151846)';
  end if;
  if v_corps not like '%when ans.leisure_frequency = ''rarely'' then ''travel''%' then
    raise exception 'CONTROLE: la boucle de qui sort rarement ne porte plus sur ses voyages (20260927191009)';
  end if;
  if v_corps not like '%public.boucles_du_dernier_bilan()%' then
    raise exception 'CONTROLE: la boucle mensuelle ne part plus du dernier bilan (20260930092838)';
  end if;
  if has_function_privilege('anon', 'public.generate_extras_checkins()', 'execute')
     or has_function_privilege('authenticated', 'public.generate_extras_checkins()', 'execute') then
    raise exception 'CONTROLE: generate_extras_checkins est appelable par un client';
  end if;
end
$controle_du_mois_choisi$;
