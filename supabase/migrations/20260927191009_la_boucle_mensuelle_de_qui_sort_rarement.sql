-- La boucle mensuelle de qui sort « rarement » porte sur ses voyages, jamais sur le résiduel
--
-- Arbitrage du 27/09/2026 (relevé non tranché de `v1-29` §6.3, mesuré le même jour).
--
-- ## Le défaut, mesuré avant d'être écrit
--
-- Qui répond sortir « rarement » garde un **résiduel de calcul** pour ses loisirs (D5, spec §5 :
-- 15 km, 0,25 fois par semaine) — 55,5 kg/an avec une voiture au foyer, 10,8 kg en train sans.
-- C2.5 en a retiré toutes les conséquences visibles, et a posé que la boucle mensuelle demande une
-- **base déclarée** : sans vol ni long trajet, pas de point mensuel.
--
-- Le trou est entre les deux. Dès qu'un voyage est déclaré, le filtre laisse passer — et le poste
-- de la boucle est `extras_poste`, c'est-à-dire **le plus lourd** des loisirs et des voyages. Un
-- trajet en train de plus de 300 km pèse 2,3 kg ; le résiduel en pèse 55,5. Le cron mensuel joué
-- sur la stack locale, sur quatre profils fabriqués :
--
--   - un cycliste, sorties rares, un long trajet en train par an → chaque mois « En août, as-tu
--     changé de mode de transport pour tes sorties du week-end ? » ;
--   - le même sans voiture au foyer (résiduel à 10,8 kg) → la même question ;
--   - sans trajet régulier, deux longs trajets en train → la même question, et c'est **sa seule
--     boucle** ;
--   - le témoin, un vol par an → « … pour tes voyages ? », juste.
--
-- La question portait donc sur des sorties que la personne a dit ne presque jamais faire, et son
-- voyage — la seule chose qu'elle ait déclarée hors de son trajet — n'était jamais interrogé. En
-- production, aucun compte n'était dans ce cas le 27/09/2026 (huit bilans courants, deux « rarement »,
-- zéro point généré sur le résiduel) : le défaut était latent.
--
-- ## Ce qui change, et ce qui ne change pas
--
-- **Pour qui sort rarement, le poste de la boucle mensuelle est `travel`.** Le filtre de base
-- déclarée garantit déjà qu'il en a un — sinon il n'y a pas de point du tout, comme avant. Trois
-- choses suivent ce poste, et c'est pourquoi il est calculé une fois, dans une jointure latérale, et
-- non recopié trois fois :
--
--   - la colonne `poste` du point, qui décide côté client du troisième choix (« Pas de voyage en
--     août ») et de la réplique de Ramille (`RAMILLE.checkinSansObjet`, indexée sur le poste) ;
--   - la question, par `poste_inserable` — « … pour tes voyages ? » ;
--   - **l'action engagée qu'on cherche** : `t.poste = ar.extras_poste` aurait cherché une action de
--     loisirs, qu'`estimate_action_savings` refuse de proposer à ce profil. Une action de voyage
--     engagée (« Remplacer un de tes longs trajets en autocar par le train ») n'aurait donc jamais
--     nommé la question qui la referme.
--
-- **`assessment_results` ne bouge pas.** `extras_poste` et `extras_poste_label` restent « le plus
-- lourd des deux », et c'est voulu : le client lit le marqueur « (occasionnels) » de
-- `extras_poste_label` pour reconnaître le résiduel (`etiquetteDuPosteDominant`,
-- `loisirsSontLeResiduel`), et le changer là aurait fait dire « tes loisirs du week-end » à
-- l'étiquette de la restitution. La règle vit donc dans le seul endroit qui décide de la boucle.
--
-- **Le libellé figé du point dit « Voyages longue distance », sans mode entre parenthèses.** Le
-- mode dominant des voyages est calculé par `recompute_assessment_results` et n'est pas persisté
-- quand les voyages ne sont pas le poste `extras` ; le recalculer ici depuis les colonnes par
-- segment ferait un second endroit où se décide ce mode, ce que ce dépôt refuse partout. La forme
-- courte est celle que le libellé dominant prend déjà quand aucun mode n'est résolu, et
-- `trip_label` n'est rendu par aucun écran ni aucun rappel — la carte lit la question figée,
-- l'e-mail aussi, et la notification la préfixe de l'étiquette de `poste_inserable` (vérifié dans
-- `enqueue_checkin_reminders` le 27/09/2026). Il sort dans l'export des données
-- (`export_my_data`), où « Voyages longue distance » est vrai, et il sert à comparer un point au
-- poste du plan.
--
-- ## Réécrite depuis `pg_get_functiondef`
--
-- Et non depuis la migration qui l'a créée (`SUPABASE.md` §2.3). Le corps installé en production
-- et celui de la stack locale ont la même empreinte normalisée le 27/09/2026
-- (`5fc8c1c4df3677d5aa1c54c6e6deb1bd`) : le filtre de l'autocar de C4.4, la période écoulée de
-- C2.3, la base déclarée de C2.5 et le `nulls last` de C2.2 sont tous repris.

CREATE OR REPLACE FUNCTION public.generate_extras_checkins()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  select distinct on (a.user_id)
    a.user_id, 'extras', v_period_start, v_period_label, b.libelle, b.poste,
    g.genre,
    eng.action_text, eng.intention_days, eng.intention_timing,
    public.checkin_question('extras', g.genre, b.poste, null, v_period_start,
                            eng.question_template, eng.intention_days)
  from public.assessments a
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
  left join lateral (
    select pa.intention_days, pa.intention_timing, t.action_text, t.question_template
    from public.plan_actions pa
    join public.plan_cycles pc on pc.id = pa.plan_cycle_id
    join public.action_templates t on t.id = pa.action_template_id
    where pc.user_id = a.user_id
      and pa.committed_at is not null
      and t.poste = b.poste
      and v_period_start between pc.period_start and pc.period_end
    order by pa.committed_at desc
    limit 1
  ) eng on true
  cross join lateral (
    -- Pas de `maintien` ici : la catégorie vélo/marche ne qualifie que le trajet quotidien.
    select case when eng.question_template is not null then 'occasion' else 'generique' end as genre
  ) g
  where a.status = 'completed'
    and ar.extras_poste_label is not null
    and (
      ans.leisure_frequency <> 'rarely'
      or coalesce(ans.flights_total_per_year, 0) > 0
      or coalesce(ans.train_long_trips_per_year, 0) > 0
      or coalesce(ans.car_long_trips_per_year, 0) > 0
      -- C4.4 : l'autocar est une base déclarée comme les trois autres, et l'oublier ici coûtait
      -- la boucle entière. Un profil dont les seuls longs trajets sont en car a un poste réel
      -- (105 kg pour quatre trajets), un plan avec une action écrite pour lui — et ne recevait
      -- aucun point mensuel, donc jamais la question que cette action existe pour refermer.
      or coalesce(ans.coach_long_trips_per_year, 0) > 0
    )
  order by a.user_id, a.submitted_at desc nulls last
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$function$;

-- Contrôle : la réécriture a gardé les gardes des chantiers précédents, et porte la nouvelle.
-- Lu sur le corps installé sans ses commentaires, puisque le distant peut les retirer
-- (`SUPABASE.md` §1.5) et qu'une ancre ne doit jamais en contenir.
do $$
declare
  v_def text;
begin
  select regexp_replace(pg_get_functiondef(p.oid), '--[^' || chr(10) || ']*', '', 'g')
    into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'generate_extras_checkins';

  if v_def not like '%coach_long_trips_per_year%' then
    raise exception 'La boucle mensuelle a perdu le filtre de l''autocar (C4.4)';
  end if;
  if v_def not like '%nulls last%' then
    raise exception 'La boucle mensuelle a perdu le « nulls last » du bilan le plus récent (C2.2)';
  end if;
  if v_def not like '%t.poste = b.poste%' then
    raise exception 'L''action engagée est encore cherchée sur extras_poste et non sur le poste de la boucle';
  end if;
  if v_def not like '%when ans.leisure_frequency = ''rarely'' then ''travel''%' then
    raise exception 'La boucle mensuelle de qui sort rarement ne porte pas sur ses voyages';
  end if;
end;
$$;
