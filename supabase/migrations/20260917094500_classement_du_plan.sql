-- C5.1 — Le classement du plan : le meilleur levier du poste dominant en tête.
--
-- Le `row_number()` de `generate_plan_cycle_for_user` triait par `(e.poste = rec.dominant_poste)
-- desc` **en clé primaire**, donc **toute** action du poste dominant passait devant **toute** autre,
-- quel que soit le gain. Relevé sur le seul bilan de la base le 17/09/2026, et c'est le défaut en
-- entier :
--
--   rang 4 (carte estompée)  « Faire un de tes longs trajets en train »            48 kg   dominant
--   rang 5 (ligne simple)    « Travailler depuis chez toi deux jours par semaine » 461 kg  —
--
-- Un levier à 461 kg en ligne simple sous un levier à 48 kg présenté en carte. Le nouveau
-- classement est celui du canvas v1-17 : **la piste du poste dominant au gain le plus élevé en 1,
-- puis `saving_kg_year desc`**, `action_text` départageant une égalité exacte pour que le rang soit
-- déterministe (c'est la clé naturelle du référentiel, et elle porte un index unique depuis C3.8).
-- Après correction, le 461 kg passe en 2 et le 48 kg tombe en 11.
--
-- **L'écriture proposée par le canvas est refusée par Postgres**, et il faut le savoir avant de la
-- recopier : elle met `max(...) filter (...) over ()` dans l'`order by` d'un `row_number()`, ce qui
-- est une fonction de fenêtrage imbriquée dans une autre — `42P20`, « window function calls cannot
-- be nested », éprouvé sur le distant le 17/09/2026. Le maximum du poste dominant sort donc dans une
-- CTE. Elle est `materialized` explicitement : `pistes` est référencée deux fois, donc Postgres ne
-- l'inlinerait pas aujourd'hui, mais un futur remaniement qui la ramènerait à une seule référence
-- ferait réévaluer `estimate_action_savings` — une fonction qui recalcule tout un bilan.
--
-- **Substitution vérifiée** : on lit le corps **installé** (`pg_get_functiondef`) et jamais le
-- fichier qui a créé la fonction. Elle a été patchée par C4.6 sans être redéfinie, et C2.2 a déjà
-- coûté trois gardes supprimées en silence pour avoir repris une migration d'origine. L'ancre ne
-- contient aucune ligne de commentaire : le distant porte les corps sans ceux du dépôt.

do $substitution$
declare
  v_def text;
  v_ancre text;
  v_neuf text;
  v_occurrences integer;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'generate_plan_cycle_for_user';

  if v_def is null then
    raise exception 'C5.1 : generate_plan_cycle_for_user est introuvable.';
  end if;

  v_ancre := '  insert into public.plan_actions (
    plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent, detail_text, rank, first_step
  )
  select
    v_cycle_id,
    e.action_template_id,
    e.saving_kg_year,
    case when rec.total_co2_kg_year > 0
      then round(e.saving_kg_year / rec.total_co2_kg_year * 100)
      else null
    end,
    e.detail_text,
    row_number() over (order by (e.poste = rec.dominant_poste) desc, e.saving_kg_year desc),
    tpl.first_step
  from public.estimate_action_savings(rec.assessment_id) e
  join public.action_templates tpl on tpl.id = e.action_template_id
  order by (e.poste = rec.dominant_poste) desc, e.saving_kg_year desc;';

  v_neuf := '  with pistes as materialized (
    select * from public.estimate_action_savings(rec.assessment_id)
  ),
  tete_du_dominant as (
    select max(saving_kg_year) as gain from pistes where poste = rec.dominant_poste
  )
  insert into public.plan_actions (
    plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent, detail_text, rank, first_step
  )
  select
    v_cycle_id,
    e.action_template_id,
    e.saving_kg_year,
    case when rec.total_co2_kg_year > 0
      then round(e.saving_kg_year / rec.total_co2_kg_year * 100)
      else null
    end,
    e.detail_text,
    row_number() over (order by (e.poste = rec.dominant_poste and e.saving_kg_year = t.gain) desc,
                                e.saving_kg_year desc, e.action_text),
    tpl.first_step
  from pistes e
  cross join tete_du_dominant t
  join public.action_templates tpl on tpl.id = e.action_template_id
  order by (e.poste = rec.dominant_poste and e.saving_kg_year = t.gain) desc,
           e.saving_kg_year desc, e.action_text;';

  v_occurrences := (length(v_def) - length(replace(v_def, v_ancre, ''))) / length(v_ancre);

  -- Une substitution vérifiée est à un coup, donc elle reconnaît « déjà appliquée » par la
  -- **présence du remplacement** et jamais par la seule absence de l'ancre : une migration doit se
  -- rejouer telle quelle après une restauration.
  if v_occurrences = 0 then
    if position('tete_du_dominant' in v_def) > 0 then
      return;
    end if;
    raise exception 'C5.1 : ni l''ancre ni le remplacement ne sont dans generate_plan_cycle_for_user.';
  elsif v_occurrences > 1 then
    raise exception 'C5.1 : % occurrences de l''ancre au lieu d''une seule.', v_occurrences;
  end if;

  execute replace(v_def, v_ancre, v_neuf);
end
$substitution$;

-- ── Le rattrapage des plans déjà figés ─────────────────────────────────────────────────────────
--
-- `rank` est un **ordre d'affichage dérivé**, pas un instantané de ce que la personne a lu en
-- choisissant : c'est ce qui le distingue de `saving_kg_year`, `action_text` et `first_step`, qu'on
-- ne réécrit jamais (`SUPABASE.md` §2.3). Le corriger ne change donc aucune promesse — et ne pas le
-- corriger laisserait le défaut visible sur tout plan déjà généré, puisque
-- `generate_plan_cycle_for_user` porte une garde d'idempotence et ne reconstruit pas un cycle dont
-- le bilan n'a pas bougé.
--
-- L'engagement ne bouge pas : il vit sur `committed_at` / `intention_days` / `intention_timing`,
-- appariés par `action_template_id`, et le rang leur est étranger. Un contrôle le vérifie plutôt
-- que de l'affirmer.

do $rattrapage$
declare
  v_engagements_avant integer;
  v_engagements_apres integer;
  v_cycles integer := 0;
  rec record;
begin
  select count(*) into v_engagements_avant
  from public.plan_actions where committed_at is not null;

  -- **Un cycle, un bilan, et c'est `distinct on` qui le garantit** (ajouté par la contre-lecture du
  -- lot 5, 17/09/2026). La jointure rend une ligne par bilan complété de la personne : quelqu'un qui
  -- en a deux voyait son cycle reclassé deux fois, et si les deux bilans n'ont pas le même poste
  -- dominant — ce qui est le cas le plus intéressant du produit, celui où un changement a porté —
  -- le classement retenu était celui du dernier rendu par le planificateur, c'est-à-dire au hasard.
  -- Zéro ligne concernée au moment d'écrire (relevé sur le distant : un seul cycle porte des
  -- actions, et un seul bilan lui répond), mais une migration doit rejouer **juste** sur une base
  -- restaurée, pas seulement sur celle du jour.
  for rec in
    select distinct on (pc.id) pc.id as cycle_id, ar.dominant_poste
    from public.plan_cycles pc
    join public.assessments a
      on a.user_id = pc.user_id and a.status = 'completed'
    join public.assessment_results ar on ar.assessment_id = a.id
    where exists (select 1 from public.plan_actions pa where pa.plan_cycle_id = pc.id)
    order by pc.id, a.submitted_at desc nulls last
  loop
    with tete as (
      select max(pa.saving_kg_year) as gain
      from public.plan_actions pa
      join public.action_templates tpl on tpl.id = pa.action_template_id
      where pa.plan_cycle_id = rec.cycle_id and tpl.poste = rec.dominant_poste
    ),
    neuf as (
      select pa.id,
        row_number() over (
          order by (tpl.poste = rec.dominant_poste and pa.saving_kg_year = t.gain) desc,
                   pa.saving_kg_year desc, tpl.action_text) as rang
      from public.plan_actions pa
      join public.action_templates tpl on tpl.id = pa.action_template_id
      cross join tete t
      where pa.plan_cycle_id = rec.cycle_id
    )
    update public.plan_actions pa
    set rank = neuf.rang
    from neuf
    where pa.id = neuf.id and pa.rank is distinct from neuf.rang;

    v_cycles := v_cycles + 1;
  end loop;

  select count(*) into v_engagements_apres
  from public.plan_actions where committed_at is not null;

  if v_engagements_avant <> v_engagements_apres then
    raise exception 'C5.1 : le rattrapage a touché un engagement (% avant, % après).',
      v_engagements_avant, v_engagements_apres;
  end if;

  raise notice 'C5.1 : % cycle(s) reclassé(s), % engagement(s) intact(s).',
    v_cycles, v_engagements_apres;
end
$rattrapage$;

-- ── Contrôle ───────────────────────────────────────────────────────────────────────────────────
--
-- Le rang reste une permutation de 1..n par cycle : un rattrapage qui laisserait un trou ou un
-- doublon recréerait en silence le `limit 2` que C4.6 a retiré du serveur, côté données cette fois.

do $controle$
declare
  v_casses integer;
begin
  if position('tete_du_dominant' in (
    select pg_get_functiondef(p.oid)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'generate_plan_cycle_for_user'
  )) = 0 then
    raise exception 'C5.1 : le nouveau classement n''est pas installé.';
  end if;

  select count(*) into v_casses
  from (
    select plan_cycle_id
    from public.plan_actions
    group by plan_cycle_id
    having count(distinct rank) <> count(*)
        or min(rank) <> 1
        or max(rank) <> count(*)
  ) x;

  if v_casses > 0 then
    raise exception 'C5.1 : % cycle(s) dont les rangs ne sont pas une permutation de 1..n.', v_casses;
  end if;
end
$controle$;
