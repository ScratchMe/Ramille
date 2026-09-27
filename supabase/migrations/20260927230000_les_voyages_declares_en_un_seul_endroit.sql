-- Les voyages déclarés, en un seul endroit : `public.a_des_voyages_declares`
--
-- Dette `v1-27` §5, première des deux extractions qu'elle désigne (27/09/2026). **Migration
-- neutre** : aucun total, aucun poste, aucun point, aucune question ne change. La suite pgTAP
-- entière passe sans qu'une seule valeur attendue ait bougé, et `33_deux_extractions_neutres.test.sql`
-- compare la fonction aux deux expressions qu'elle remplace, case par case.
--
-- ## Ce qu'elle extrait, et d'où
--
-- « La personne a-t-elle déclaré au moins un voyage ? » s'écrivait deux fois, relevé le 27/09/2026
-- sur les corps installés (`pg_get_functiondef`, stack locale et distant) :
--
--   - dans le filtre de base déclarée de `generate_extras_checkins` (C2.5), sous la forme de quatre
--     `coalesce(ans.X, 0) > 0` reliés par `or` ;
--   - dans le cas du bilan à zéro de `recompute_assessment_results`, sous la forme d'une **somme**
--     `coalesce(a.X, 0) + … > 0`.
--
-- Nulle part ailleurs : un balayage des fonctions et des vues de `public` et d'`analytics` ne
-- trouve les compteurs que dans ces deux-là et dans `estimate_action_savings`, qui les lit **un par
-- un** pour chiffrer une action — ce n'est pas la même question, et elle ne se factorise pas ici.
-- Le client n'en porte aucune énumération.
--
-- ## Pourquoi
--
-- C'est la liste qui a déjà coûté un défaut : C4.4 a livré l'autocar sans sa ligne dans le filtre,
-- et un profil dont les seuls longs trajets sont en car avait un poste, un plan, une action écrite
-- pour lui — et aucun point mensuel. Seul le fait de jouer les deux crons l'a trouvé. Le jour où un
-- cinquième compteur s'ajoute, il n'y a plus qu'un endroit où l'écrire.
--
-- ## La signature : la ligne de réponses, et non les compteurs
--
-- Quatre arguments `smallint` obligeraient, au cinquième compteur, à changer la signature **et**
-- chaque appel — c'est-à-dire à retoucher les deux endroits dont on veut se passer, plus un
-- troisième. La ligne entière d'`assessment_answers` fait qu'un compteur ajouté ne touche que le
-- corps ci-dessous. Les deux appelants l'ont déjà en main : l'alias `ans` dans la requête du
-- générateur, la variable `a` (`assessment_answers%rowtype`) dans le calcul. Et elle reste **pure** :
-- elle ne lit que son argument, donc `immutable` est vrai — ce qu'une signature par
-- `assessment_id`, qui relirait la table, n'aurait pas été.
--
-- Corollaire à connaître : pour PostgREST, une fonction dont l'unique argument est une ligne de
-- table est un « champ calculé » de cette table. Révoquée du client, elle ne l'est pour personne ;
-- l'accorder un jour la rendrait sélectionnable sur `assessment_answers`.
--
-- ## `or` plutôt que la somme, et pourquoi c'est neutre
--
-- Les deux formes rendent la même réponse parce que les quatre colonnes portent
-- `not null default 0` et `check (… >= 0)` (relevé dans `pg_constraint` le 27/09/2026) : une somme
-- de termes positifs ou nuls est strictement positive si et seulement si l'un d'eux l'est. La forme
-- `or` est retenue parce qu'elle ne dépend pas de ces contraintes — une somme laisserait un compteur
-- négatif en annuler un autre. Les `coalesce` restent : ils ne coûtent rien et gardent la réponse
-- booléenne sur une ligne incomplète, plutôt que nulle.
--
-- **`flights_short_per_year` n'y est pas, et ce n'est pas un oubli** : c'est un sous-ensemble de
-- `flights_total_per_year` (le calcul en déduit les long-courriers par différence), jamais un compte
-- à part. Aucune des deux copies ne le lisait.
--
-- ## Les appelants, réécrits depuis leur corps installé
--
-- Et jamais depuis la migration qui les a créés (`SUPABASE.md` §2.3). Le 27/09/2026, les corps
-- installés de la stack locale et du distant sont **identiques octet pour octet**
-- (`md5(pg_get_functiondef(…))`) : `generate_extras_checkins` 5d40ff96e4840188f6e093d4a9af9ab9,
-- `recompute_assessment_results` 061e3e1bd3d1786c154eabec29f10846.
--
--   - `generate_extras_checkins` est reprise **en entier** : soixante-seize lignes, et le filtre à
--     remplacer porte en son milieu le commentaire de C4.4 — une substitution ne peut pas l'ancrer
--     (une ancre ne contient jamais de commentaire, `SUPABASE.md` §1.5) sans laisser ce commentaire
--     orphelin dans le corps. Tout le reste est le corps installé, au caractère près : la période
--     écoulée de C2.3, le poste de la boucle de qui sort rarement (`20260927191009`), l'action
--     cherchée sur ce poste et le `nulls last` de C2.2.
--   - `recompute_assessment_results` est **substituée**, pas recopiée : trois cent cinquante-neuf
--     lignes pour en changer deux, la recopie serait le meilleur moyen d'y glisser une faute. L'idiome
--     est celui de C2.9 et de `20260914141729` : l'ancre ne contient que du code, elle est trouvée
--     exactement une fois (vérifié sur le distant le 27/09/2026), et un rejeu reconnaît « déjà
--     appliquée » par la **présence de l'appel**, jamais par la seule absence de l'ancre.
--
-- **Le cas qu'elle remplace dans le calcul est inatteignable aujourd'hui**, et ça ne change rien à
-- l'extraction : un total nul exige des loisirs qui ne sont pas « rarement » (le résiduel vaut
-- toujours plus que zéro, en voiture ou en train) et aucun voyage (tous les facteurs de voyage sont
-- positifs, relevé le 27/09/2026), donc la branche `'travel'` du bilan à zéro n'est jamais prise.
-- Elle reste défensive, et c'est pourquoi l'appel y est gardé par une assertion de **structure**
-- (fichier 33) : aucun comportement ne pourrait la voir tomber.

create or replace function public.a_des_voyages_declares(p_reponses public.assessment_answers)
returns boolean
language sql
immutable
set search_path to 'public'
as $function$
  -- Un compteur de voyages ajouté au questionnaire (B3.x) s'ajoute ICI, et seulement ici. Le
  -- balayage du fichier 33 le rappellera s'il porte le suffixe `_per_year` des quatre autres.
  select coalesce(p_reponses.flights_total_per_year, 0) > 0
      or coalesce(p_reponses.train_long_trips_per_year, 0) > 0
      or coalesce(p_reponses.car_long_trips_per_year, 0) > 0
      or coalesce(p_reponses.coach_long_trips_per_year, 0) > 0;
$function$;

-- `from public` d'abord : PostgreSQL accorde EXECUTE à PUBLIC à la création, et `anon` comme
-- `authenticated` en héritent (`SUPABASE.md` §2.2).
revoke execute on function public.a_des_voyages_declares(public.assessment_answers)
  from public, anon, authenticated;

comment on function public.a_des_voyages_declares(public.assessment_answers) is
  'Vrai si le bilan déclare au moins un voyage (vol, long trajet en train, en voiture ou en autocar). '
  'Seul endroit où s''énumèrent les compteurs de voyages : lu par le filtre de base déclarée de '
  'generate_extras_checkins et par le bilan à zéro de recompute_assessment_results (v1-27 §5).';

-- ---------------------------------------------------------------------------------------------
-- 1. La boucle mensuelle : le filtre de base déclarée
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
-- 2. Le calcul du bilan : le cas du bilan à zéro, par substitution vérifiée
-- ---------------------------------------------------------------------------------------------

do $voyages_du_bilan_a_zero$
declare
  src text;
  cible oid := 'public.recompute_assessment_results(uuid)'::regprocedure;
  ancre constant text := E'      when coalesce(a.flights_total_per_year, 0) + coalesce(a.train_long_trips_per_year, 0)\n           + coalesce(a.car_long_trips_per_year, 0) + coalesce(a.coach_long_trips_per_year, 0) > 0 then ''travel''';
  remplacement constant text := E'      when public.a_des_voyages_declares(a) then ''travel''';
  occurrences int;
begin
  src := pg_get_functiondef(cible);
  occurrences := (length(src) - length(replace(src, ancre, ''))) / length(ancre);

  -- Zéro occurrence de l'ancre veut dire soit « déjà substitué » — un rejeu après restauration,
  -- donc un non-événement —, soit « corps réécrit autrement », où l'on ne devine pas. Les deux se
  -- séparent par la présence de l'appel posé, jamais par la seule absence de l'ancre
  -- (`SUPABASE.md` §2.3).
  if occurrences = 0 then
    if position('a_des_voyages_declares(a)' in src) > 0 then
      return;
    end if;
    raise exception 'recompute_assessment_results ne porte ni l''énumération des voyages du bilan à zéro, ni l''appel à a_des_voyages_declares : le corps a été réécrit autrement.';
  elsif occurrences > 1 then
    raise exception 'L''énumération des voyages a été trouvée % fois dans recompute_assessment_results (une seule attendue).', occurrences;
  end if;

  execute replace(src, ancre, remplacement);
end
$voyages_du_bilan_a_zero$;

-- ---------------------------------------------------------------------------------------------
-- 3. Contrôle : chaque appelant passe par la fonction, et la réécriture n'a rien perdu
-- ---------------------------------------------------------------------------------------------
-- Lu sur les corps installés sans leurs commentaires : le distant peut les retirer
-- (`SUPABASE.md` §1.5), et la phrase qui explique la règle ferait sinon passer le contrôle.

do $controle_voyages_declares$
declare
  v_boucle text;
  v_calcul text;
begin
  select regexp_replace(pg_get_functiondef('public.generate_extras_checkins()'::regprocedure),
                        '--[^' || chr(10) || ']*', '', 'g')
    into v_boucle;
  select regexp_replace(pg_get_functiondef('public.recompute_assessment_results(uuid)'::regprocedure),
                        '--[^' || chr(10) || ']*', '', 'g')
    into v_calcul;

  if v_boucle not like '%public.a_des_voyages_declares(ans)%' then
    raise exception 'La boucle mensuelle ne passe pas par a_des_voyages_declares';
  end if;
  if v_boucle ~ '(flights_total|long_trips)_per_year' then
    raise exception 'La boucle mensuelle énumère encore des compteurs de voyages elle-même';
  end if;
  if v_calcul not like '%when public.a_des_voyages_declares(a) then ''travel''%' then
    raise exception 'Le bilan à zéro ne passe pas par a_des_voyages_declares';
  end if;

  -- Les gardes de `20260927191009` et de ses prédécesseurs, que la reprise devait garder.
  if v_boucle not like '%nulls last%' then
    raise exception 'La boucle mensuelle a perdu le « nulls last » du bilan le plus récent (C2.2)';
  end if;
  if v_boucle not like '%t.poste = b.poste%' then
    raise exception 'L''action engagée n''est plus cherchée sur le poste de la boucle';
  end if;
  if v_boucle not like '%when ans.leisure_frequency = ''rarely'' then ''travel''%' then
    raise exception 'La boucle mensuelle de qui sort rarement ne porte plus sur ses voyages';
  end if;

  if has_function_privilege('anon', 'public.a_des_voyages_declares(public.assessment_answers)', 'execute')
     or has_function_privilege('authenticated', 'public.a_des_voyages_declares(public.assessment_answers)', 'execute') then
    raise exception 'a_des_voyages_declares est appelable depuis le client';
  end if;
end;
$controle_voyages_declares$;
