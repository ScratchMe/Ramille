-- Les deux boucles suivent le DERNIER bilan valide, jamais un plus ancien (30/09/2026).
--
-- `generate_commute_checkins` et `generate_extras_checkins` filtraient le bilan — « a-t-il un
-- trajet ? », « a-t-il une base déclarée ? » — **avant** le `distinct on` qui garde le plus récent.
-- Le filtre écartait donc le nouveau bilan, et le `distinct on` retombait sur l'ancien : quelqu'un qui
-- refaisait son bilan sans trajet domicile-travail recevait chaque lundi la question d'un trajet
-- qu'il venait de dire ne plus faire, sous un plan bâti sur le nouveau bilan, qui n'en portait plus
-- aucune action. Même chose chaque mois pour qui passait à « sorties rares, aucun voyage ».
--
-- Le correctif choisit d'abord le dernier bilan valide de chacun, **puis** filtre. « Dernier bilan
-- valide » veut dire ce que `generate_plan_cycle_for_user` lit : `completed` — un bilan retiré n'en
-- est pas un (C4.7) —, un résultat calculé, le plus récent par `submitted_at`. Les deux boucles et le
-- plan partent ainsi du même bilan : **deux conditions précèdent le tri, et ce sont celles du plan** —
-- le statut, et un résultat calculé. Un bilan passé en `completed` dont le calcul a échoué n'est donc
-- pas le dernier, pour les boucles comme pour le plan.
--
-- **Ne rejouer après elle aucune migration antérieure qui réécrit ces deux générateurs** — en
-- particulier `20260927191009`, `20260927210200` et `20260927210247`, que la consigne de la dernière
-- invite à rejouer ensemble : chacune réinstalle le filtre avant le choix, en silence. Les rejouer,
-- c'est rejouer ensuite celle-ci. (En-tête précisé après l'application au distant ; les corps des
-- deux fonctions, eux, sont ceux qui y sont installés.)
--
-- Réécrites depuis `pg_get_functiondef` sur le distant (SUPABASE.md §1.5), à ce seul changement près.
-- Garde : `supabase/tests/database/38_la_boucle_suit_le_dernier_bilan.test.sql`.

create or replace function public.generate_commute_checkins()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_period_start date := date_trunc('week', now())::date - 7;
  v_period_label text := 'Semaine du ' || to_char(v_period_start, 'DD/MM');
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'commute' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (
    user_id, loop_type, period_start, period_label, trip_label, poste, question_kind, mode,
    committed_action_text, committed_intention_days, committed_intention_timing, committed_question
  )
  select
    a.user_id, 'commute', v_period_start, v_period_label, ar.commute_poste_label, 'commute',
    g.genre, ar.commute_poste_mode,
    eng.action_text, eng.intention_days, eng.intention_timing,
    public.checkin_question('commute', g.genre, 'commute', ar.commute_poste_mode, v_period_start,
                            eng.question_template, eng.intention_days)
  from (
    -- Le dernier bilan valide de chacun, choisi AVANT le filtre du trajet : filtrer d'abord faisait
    -- reprendre la main à un ancien bilan quand le nouveau n'a plus de trajet (30/09/2026). Même
    -- choix que `generate_plan_cycle_for_user`.
    select distinct on (d.user_id) d.id
    from public.assessments d
    join public.assessment_results dr on dr.assessment_id = d.id
    where d.status = 'completed'
    order by d.user_id, d.submitted_at desc nulls last
  ) dernier
  join public.assessments a on a.id = dernier.id
  join public.assessment_results ar on ar.assessment_id = a.id
  left join public.transport_modes tm on tm.id = ar.commute_poste_mode
  -- L'action engagée sur le trajet, dans le cycle qui couvre la semaine interrogée (v1-27 §5).
  left join lateral public.action_engagee_de_la_periode(a.user_id, 'commute', v_period_start) eng
    on true
  cross join lateral (
    select case
      -- L'ordre est la priorité, et il est épinglé : le maintien gagne (cf. l'en-tête).
      when tm.category = 'velo_marche' then 'maintien'
      when eng.question_template is not null then 'engagement'
      else 'generique'
    end as genre
  ) g
  where ar.commute_poste_label is not null
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$function$;

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
    eng.action_text, eng.intention_days, eng.intention_timing,
    public.checkin_question('extras', g.genre, b.poste, null, v_period_start,
                            eng.question_template, eng.intention_days)
  from (
    -- Le dernier bilan valide de chacun, choisi AVANT le filtre de la base déclarée : filtrer
    -- d'abord faisait reprendre la main à un ancien bilan quand le nouveau ne déclare plus ni sortie
    -- ni voyage (30/09/2026). Même choix que `generate_plan_cycle_for_user`.
    select distinct on (d.user_id) d.id
    from public.assessments d
    join public.assessment_results dr on dr.assessment_id = d.id
    where d.status = 'completed'
    order by d.user_id, d.submitted_at desc nulls last
  ) dernier
  join public.assessments a on a.id = dernier.id
  join public.assessment_results ar on ar.assessment_id = a.id
  join public.assessment_answers ans on ans.assessment_id = a.id
  cross join lateral (
    -- Qui sort rarement n'a déclaré, hors de son trajet, que ses voyages : c'est sur eux que porte
    -- la boucle, même quand le résiduel des sorties pèse plus lourd. Le filtre du `where` garantit
    -- qu'il en a — sinon aucun point n'est généré.
    select
      case when ans.leisure_frequency = 'rarely' then 'travel' else ar.extras_poste end as poste,
      case
        when ans.leisure_frequency = 'rarely' and ar.extras_poste = 'leisure'
          then 'Voyages longue distance'
        else ar.extras_poste_label
      end as libelle
  ) b
  -- L'action engagée est cherchée sur le poste DE LA BOUCLE, celui que `b` vient de choisir — et
  -- non sur `extras_poste`, qui chercherait une action de loisirs chez qui sort rarement
  -- (`20260927191009`). La fonction reçoit ce poste, elle ne le choisit pas (v1-27 §5).
  left join lateral public.action_engagee_de_la_periode(a.user_id, b.poste, v_period_start) eng
    on true
  cross join lateral (
    -- Pas de `maintien` ici : la catégorie vélo/marche ne qualifie que le trajet quotidien.
    select case when eng.question_template is not null then 'occasion' else 'generique' end as genre
  ) g
  where ar.extras_poste_label is not null
    and (
      ans.leisure_frequency <> 'rarely'
      -- Les compteurs de voyages s'énumèrent dans `a_des_voyages_declares`, et seulement là
      -- (v1-27 §5). C4.4 avait livré l'autocar sans sa ligne ici : un profil dont les seuls longs
      -- trajets sont en car avait un poste réel, un plan avec une action écrite pour lui, et aucun
      -- point mensuel — donc jamais la question que cette action existe pour refermer.
      or public.a_des_voyages_declares(ans)
    )
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$function$;
