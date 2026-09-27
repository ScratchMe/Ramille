-- L'action engagée sur la période interrogée, en un seul endroit : `public.action_engagee_de_la_periode`
--
-- Dette `v1-27` §5, seconde des deux extractions qu'elle désigne (27/09/2026), après
-- `20260927230000_les_voyages_declares_en_un_seul_endroit.sql`. **Migration neutre** : chaque
-- point généré porte la même action, les mêmes jours, la même échéance et la même question
-- qu'avant. La suite pgTAP entière passe sans qu'une valeur attendue ait bougé, et
-- `33_deux_extractions_neutres.test.sql` compare la fonction à la requête qu'elle remplace sur une
-- grille de comptes, de postes et de dates.
--
-- ## Ce qu'elle extrait, et d'où
--
-- La recherche de l'action engagée qui couvre la période interrogée — une jointure latérale sur
-- `plan_actions`, `plan_cycles` et `action_templates`, bornée par la période, triée par
-- `committed_at` — était écrite dans les deux générateurs de points. Relevé sur les corps installés
-- le 27/09/2026 : les deux copies sont **identiques au caractère près, à leur poste près** —
-- `t.poste = 'commute'` dans `generate_commute_checkins`, `t.poste = b.poste` dans
-- `generate_extras_checkins`. Mêmes colonnes rendues, même filtre `committed_at is not null`, même
-- borne `between pc.period_start and pc.period_end` (bornes comprises), même tri, même `limit 1`.
-- Aucune autre fonction ni vue de `public` ou d'`analytics` ne porte cette recherche (balayage du
-- même jour ; `analytics.engagement_action_by_segment` joint les mêmes tables pour compter, sans
-- période).
--
-- ## Pourquoi
--
-- Ces deux générateurs sont, derrière `enqueue_checkin_reminders`, les fonctions les plus recopiées
-- du dépôt (`v1-27` §5 : dix et huit définitions), parce que chaque chantier de la boucle
-- d'engagement en réécrit une. La correction de
-- la boucle mensuelle de qui sort rarement (`20260927191009`) a dû retoucher la recherche dans l'un
-- en sachant que l'autre la répète.
--
-- ## Ce que la fonction garde, et ce qu'elle ne décide pas
--
-- - **Elle reçoit le poste déjà choisi, elle ne le choisit pas.** L'appariement par poste est ce qui
--   empêche une action engagée sur les loisirs de nommer la question du trajet (C2.1) ; mais **quel**
--   poste interroger est une décision de la boucle — `commute` pour l'hebdomadaire, et pour la
--   mensuelle `travel` chez qui sort rarement, `extras_poste` sinon (`20260927191009`). Si la
--   fonction lisait `assessment_results`, cette règle vivrait à deux endroits.
-- - **Elle rend l'action du cycle qui couvre la période INTERROGÉE**, pas celle du cycle courant :
--   la période écoulée (C2.3) peut tomber dans la saison précédente, et c'est l'action suivie alors
--   que la question figée doit nommer (C2.1).
-- - **Le tri par `committed_at` ne départage que des cycles qui se chevauchent** : un cycle ne porte
--   qu'un engagement (`plan_actions_un_engagement_par_cycle`), et `plan_cycles` n'interdit que deux
--   cycles au même `period_start`. Des saisons ne se chevauchent pas ; seul un trimestre glissant
--   (`rolling_quarter`, cadence dormante) peut en chevaucher une. Relevé sur le distant le
--   27/09/2026 : huit cycles, tous en saison, aucune paire qui se chevauche. Le tri est donc
--   défensif, et le fichier 33 l'épingle sur deux cycles fabriqués plutôt que de le laisser se
--   perdre à la prochaine réécriture.
--
-- ## `stable`, `security invoker`, et révoquée du client
--
-- `stable` parce qu'elle lit des tables. **Pas `security definer`** : ses deux seuls appelants le
-- sont déjà, donc elle s'exécute avec les droits de leur propriétaire, qui lit ces tables. La
-- déclarer `security definer` n'ajouterait rien, et ferait d'un `grant` futur une porte ouverte sur
-- l'engagement de n'importe quel compte désigné par son identifiant ; en `invoker`, un tel `grant`
-- tomberait sur la RLS owner-scoped de ces tables. Révoquée `from public, anon, authenticated`
-- (`SUPABASE.md` §2.2).
--
-- Deux conséquences de forme à connaître :
--   - la clause `set search_path` empêche le planificateur d'**incorporer** la fonction à la requête
--     appelante : elle est exécutée une fois par bilan complété, là où la sous-requête latérale était
--     planifiée avec elle. Ce coût n'a pas été mesuré, et il est accepté comme le prix de la règle
--     du dépôt sur le `search_path` : deux crons, une fois par semaine et une fois par mois, une
--     recherche indexée par bilan ;
--   - elle rend une **table** : ajouter une colonne au retour (par exemple `committed_at`) impose un
--     `drop function` avant de la recréer, `create or replace` refusant de changer le type de retour
--     — et donc de reprendre les deux générateurs dans la même migration.
--
-- ## Les appelants, réécrits depuis leur corps installé
--
-- Et jamais depuis la migration qui les a créés (`SUPABASE.md` §2.3). `generate_commute_checkins`
-- part du corps installé — identique octet pour octet sur la stack locale et le distant le
-- 27/09/2026 (`md5(pg_get_functiondef(…))` 1588f64c95d9d2dc92a8bccabbfbf3a4) ;
-- `generate_extras_checkins` part du corps que la migration précédente vient d'installer. Les deux
-- sont reprises en entier : cinquante-cinq et soixante-treize lignes, dont seule la jointure latérale
-- change. La priorité du genre (le maintien gagne, C2.5), la période écoulée (C2.3), le poste de la
-- boucle de qui sort rarement, la base déclarée et le `nulls last` de C2.2 sont repris tels quels.
--
-- **Ne pas rejouer seule la migration précédente après celle-ci** : elle réécrit
-- `generate_extras_checkins` en entier, avec la recherche encore en ligne. Le comportement resterait
-- juste, mais l'extraction serait défaite en silence (`SUPABASE.md` §2.3, « rejouer un fichier
-- ancien ») — rejouer alors aussi celle-ci.

create or replace function public.action_engagee_de_la_periode(
  p_user_id uuid,
  p_poste text,
  p_period_start date
)
returns table (
  intention_days smallint[],
  intention_timing text,
  action_text text,
  question_template text
)
language sql
stable
set search_path to 'public'
as $function$
  select pa.intention_days, pa.intention_timing, t.action_text, t.question_template
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join public.action_templates t on t.id = pa.action_template_id
  where pc.user_id = p_user_id
    and pa.committed_at is not null
    -- L'appariement par poste (C2.1) : sans lui, une action engagée sur un autre poste nommerait
    -- la question de celui-ci.
    and t.poste = p_poste
    and p_period_start between pc.period_start and pc.period_end
  order by pa.committed_at desc
  limit 1;
$function$;

revoke execute on function public.action_engagee_de_la_periode(uuid, text, date)
  from public, anon, authenticated;

comment on function public.action_engagee_de_la_periode(uuid, text, date) is
  'L''action engagée (intention, libellé, gabarit de question) du cycle qui couvre la période '
  'interrogée, sur le poste donné — le plus récent engagement si deux cycles se chevauchent. '
  'Le poste est choisi par l''appelant. Lue par generate_commute_checkins et '
  'generate_extras_checkins (v1-27 §5).';

-- ---------------------------------------------------------------------------------------------
-- 1. La boucle hebdomadaire
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_commute_checkins()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  select distinct on (a.user_id)
    a.user_id, 'commute', v_period_start, v_period_label, ar.commute_poste_label, 'commute',
    g.genre, ar.commute_poste_mode,
    eng.action_text, eng.intention_days, eng.intention_timing,
    public.checkin_question('commute', g.genre, 'commute', ar.commute_poste_mode, v_period_start,
                            eng.question_template, eng.intention_days)
  from public.assessments a
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
  where a.status = 'completed' and ar.commute_poste_label is not null
  order by a.user_id, a.submitted_at desc nulls last
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$function$;

revoke execute on function public.generate_commute_checkins() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. La boucle mensuelle
-- ---------------------------------------------------------------------------------------------

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
  -- L'action engagée est cherchée sur le poste DE LA BOUCLE, celui que `b` vient de choisir — et
  -- non sur `extras_poste`, qui chercherait une action de loisirs chez qui sort rarement
  -- (`20260927191009`). La fonction reçoit ce poste, elle ne le choisit pas (v1-27 §5).
  left join lateral public.action_engagee_de_la_periode(a.user_id, b.poste, v_period_start) eng
    on true
  cross join lateral (
    -- Pas de `maintien` ici : la catégorie vélo/marche ne qualifie que le trajet quotidien.
    select case when eng.question_template is not null then 'occasion' else 'generique' end as genre
  ) g
  where a.status = 'completed'
    and ar.extras_poste_label is not null
    and (
      ans.leisure_frequency <> 'rarely'
      -- Les compteurs de voyages s'énumèrent dans `a_des_voyages_declares`, et seulement là
      -- (v1-27 §5). C4.4 avait livré l'autocar sans sa ligne ici : un profil dont les seuls longs
      -- trajets sont en car avait un poste réel, un plan avec une action écrite pour lui, et aucun
      -- point mensuel — donc jamais la question que cette action existe pour refermer.
      or public.a_des_voyages_declares(ans)
    )
  order by a.user_id, a.submitted_at desc nulls last
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$function$;

revoke execute on function public.generate_extras_checkins() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Contrôle : chaque générateur passe par la fonction, avec son poste, et n'a rien perdu
-- ---------------------------------------------------------------------------------------------
-- Lu sur les corps installés sans leurs commentaires (`SUPABASE.md` §1.5).

do $controle_action_engagee$
declare
  v_hebdo text;
  v_mensuel text;
begin
  select regexp_replace(pg_get_functiondef('public.generate_commute_checkins()'::regprocedure),
                        '--[^' || chr(10) || ']*', '', 'g')
    into v_hebdo;
  select regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                        '--[^' || chr(10) || ']*', '', 'g')
    into v_mensuel;

  if v_hebdo not like '%public.action_engagee_de_la_periode(a.user_id, ''commute'', v_period_start)%' then
    raise exception 'La boucle hebdomadaire ne cherche pas l''action engagée sur le trajet par la fonction';
  end if;
  if v_mensuel not like '%public.action_engagee_de_la_periode(a.user_id, b.poste, v_period_start)%' then
    raise exception 'La boucle mensuelle ne cherche pas l''action engagée sur le poste de la boucle par la fonction';
  end if;
  if v_hebdo like '%plan_actions%' or v_mensuel like '%plan_actions%' then
    raise exception 'Un générateur cherche encore l''action engagée lui-même';
  end if;

  -- Ce que les chantiers précédents ont posé dans ces corps, et que la reprise devait garder.
  if v_hebdo not like '%when tm.category = ''velo_marche'' then ''maintien''%' then
    raise exception 'La boucle hebdomadaire a perdu la question de maintien (C2.5)';
  end if;
  if v_hebdo not like '%date_trunc(''week'', now())::date - 7%'
     or v_mensuel not like '%date_trunc(''month'', now()) - interval ''1 month''%' then
    raise exception 'Un générateur n''interroge plus la période écoulée (C2.3)';
  end if;
  if v_hebdo not like '%nulls last%' or v_mensuel not like '%nulls last%' then
    raise exception 'Un générateur a perdu le « nulls last » du bilan le plus récent (C2.2)';
  end if;
  if v_mensuel not like '%public.a_des_voyages_declares(ans)%' then
    raise exception 'La boucle mensuelle ne passe plus par a_des_voyages_declares';
  end if;
  if v_mensuel not like '%when ans.leisure_frequency = ''rarely'' then ''travel''%' then
    raise exception 'La boucle mensuelle de qui sort rarement ne porte plus sur ses voyages';
  end if;

  if has_function_privilege('anon', 'public.action_engagee_de_la_periode(uuid, text, date)', 'execute')
     or has_function_privilege('authenticated', 'public.action_engagee_de_la_periode(uuid, text, date)', 'execute') then
    raise exception 'action_engagee_de_la_periode est appelable depuis le client';
  end if;
end;
$controle_action_engagee$;
