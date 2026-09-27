-- C4.7 — Retirer un bilan qui ne ressemble à personne (#149, `docs/architecture/v1-22-retirer-un-bilan.md`).
--
-- Les quatre décisions du 27/09/2026, toutes sur la recommandation de `v1-22` :
--   D1 — **retirer, pas supprimer** : une troisième valeur de statut, `withdrawn`, et la ligne reste ;
--   D2 — le plan est reconstruit sur le bilan valide précédent, **sans rien annoncer** ;
--   D3 — on peut retirer son seul bilan (le client efface alors sa marque locale et rejoint la racine) ;
--   D4 — le geste vit sur la restitution du bilan concerné (côté client, pas ici).
--
-- ## Ce que cette migration pose
--
-- 1. `assessments.status` accepte `withdrawn`.
-- 2. La garde des transitions de statut s'étend : un bilan retiré ne revient pas, et un bilan ne se
--    retire que depuis `completed`, **par le RPC et jamais par une écriture directe du client**.
-- 3. `plan_action_commitments_archive.released_reason` accepte `retrait`.
-- 4. `generate_plan_cycle_for_user` accepte la cause `retrait`.
-- 5. `retirer_le_bilan(p_assessment_id)`, le seul chemin du retrait.
-- 6. `analytics.user_segments` segmente sur le dernier bilan **valide**.
--
-- ## Pourquoi le statut, et pas une colonne `withdrawn_at`
--
-- Parce que les lectures de `completed` deviennent justes **sans qu'on touche à une seule d'entre
-- elles** : le cron du plan, les deux générateurs de points, le RPC de contexte, la racine, le plan,
-- le suivi, le préremplissage du questionnaire. Relevé le 27/09/2026 sur le distant, par
-- `pg_proc.prosrc like '%''completed''%'` : **sept** fonctions et non six comme `v1-22` §2 les
-- comptait — `refuser_le_retour_en_arriere_du_bilan` (20/09/2026) s'est ajoutée depuis, et c'est
-- justement celle qu'il faut étendre (§2 ci-dessous). Une colonne à part aurait obligé à écrire
-- `and withdrawn_at is null` partout, donc à l'oublier quelque part, en silence. C'est le même
-- raisonnement que `in_progress` : l'état que rien ne lit est celui qui protège.
--
-- **Deux lectures ne passent pas par le mot `completed`, et ce sont elles que ce relevé a trouvées** :
--   - la restitution par identifiant (`src/app/(tabs)/suivi/bilan.tsx`), sans filtre de statut —
--     c'est l'adresse qui circule ; elle se corrige côté client ;
--   - `analytics.user_segments`, qui prenait le dernier bilan par `submitted_at is not null` — « un
--     fait et non un mot », disait `20260905170100`, pour ne pas dériver si le vocabulaire des
--     statuts changeait. Il vient de changer, et le fait ne suffit plus : un bilan retiré garde sa
--     date de soumission (§6).
--
-- ## Ce que le retrait ne touche pas, et pourquoi
--
-- - **`submitted_at` ne bouge pas.** Le trigger `stamp_assessment_submitted_at` ne réécrit la date
--   qu'au passage en `completed` ; un retrait n'y passe pas. La date reste celle où le bilan a été
--   fait, et l'export la rend.
-- - **Ce que le bilan a engendré reste** : ses résultats (`assessment_results`), ses points de suivi
--   (un point répondu est un fait, `v1-22` §3), et son cycle de plan quand il n'y a pas de bilan
--   valide sur lequel le reconstruire (§5, cas « seul »).
-- - **`analytics.bilan_funnel` ne décrémente pas** : il compte des vues d'étape (`usage_events`), pas
--   des bilans. Ce qui est soumis a été soumis ; un retrait qui ferait baisser le taux de complétion
--   du questionnaire lui ferait mesurer la satisfaction.
-- - **`export_my_data` rend le bilan retiré, avec `statut = 'withdrawn'`** : il énumère tous les
--   bilans de la personne sans filtre de statut. Rien à changer, et le fichier 34 l'épingle.
-- - **Aucune policy `DELETE`, aucun privilège neuf sur `assessments`.** Le client garde `update` sur
--   la seule colonne `status` (`20260920160000`) — c'est précisément pourquoi la garde du §2 existe.

begin;

-- ---------------------------------------------------------------------------------------------
-- 1. La troisième valeur de statut
-- ---------------------------------------------------------------------------------------------
--
-- `drop` puis `add` : une contrainte ne se modifie pas, et `add constraint` n'est pas idempotent —
-- le `if exists` rend le fichier rejouable tel quel après une restauration (`SUPABASE.md` §1.5).
alter table public.assessments drop constraint if exists assessments_status_check;
alter table public.assessments
  add constraint assessments_status_check
  check (status = any (array['in_progress'::text, 'completed'::text, 'withdrawn'::text]));

comment on column public.assessments.status is
  'in_progress : questionnaire en cours, que rien ne lit. completed : bilan soumis, le seul état que lisent le plan, les points de suivi et le suivi. withdrawn : bilan retiré par la personne (retirer_le_bilan) — la ligne reste, l''export la rend, plus rien ne la lit. Transitions gardées par refuser_le_retour_en_arriere_du_bilan.';

-- ---------------------------------------------------------------------------------------------
-- 2. Les transitions de statut, gardées pour tout le monde
-- ---------------------------------------------------------------------------------------------
--
-- **Réécrite depuis `pg_get_functiondef`** (relevé le 27/09/2026 sur le distant, identique à
-- `20260920190000`), jamais depuis un fichier plus ancien (`SUPABASE.md` §2.3).
--
-- Elle ne connaissait qu'un refus — `completed` ne revient pas en `in_progress` (`RM005`) — et
-- **elle aurait refusé le retrait lui-même** : sa condition était `old.status = 'completed' and
-- new.status <> 'completed'`, qui vaut aussi pour `withdrawn`. Le RPC du §5 aurait donc levé `RM005`
-- à son premier appel. Trois transitions s'ajoutent, et chacune a sa raison :
--
--   - **`withdrawn` → autre chose : `RM005`**, le même refus que « un bilan complété ne se rouvre
--     pas », parce que c'est le même geste — rouvrir un bilan clos. Le privilège de colonne laisse
--     au client l'`update` de `status` (la soumission en a besoin), donc sans ce refus un
--     `update … set status = 'completed'` remettait en jeu un bilan retiré, **et** le trigger
--     d'estampille lui reposait `submitted_at = now()` — un bilan d'il y a six mois devenu le plus
--     récent, donc la base du plan.
--   - **`completed` → `withdrawn` depuis `anon` ou `authenticated` : `RM007`.** Le retrait doit
--     passer par `retirer_le_bilan`, qui reconstruit le plan dans la même transaction ; un `update`
--     direct laisserait le cycle bâti sur un bilan que plus rien ne lit, et la garde d'idempotence
--     du cron (`created_at >= submitted_at` du dernier bilan valide) ne le reconstruirait jamais.
--     **La garde lit `current_user`**, et c'est ce qui la rend simple : dans une fonction
--     `security definer` détenue par `postgres`, `current_user` vaut `postgres`, y compris dans les
--     triggers que ses ordres déclenchent ; depuis PostgREST, il vaut le rôle de la requête. Les
--     rôles serveur (`postgres`, `service_role`, les fixtures pgTAP) restent libres — c'est le client
--     qu'on borne, comme partout ailleurs dans ce schéma.
--   - **`in_progress` → `withdrawn`, et un bilan inséré déjà `withdrawn` : `RM007`**, pour tout le
--     monde. Un bilan en cours est « l'état que rien ne lit » : lui ouvrir un retrait serait une
--     troisième façon de dire la même chose (`v1-22` §5). Et une ligne née retirée n'aurait jamais
--     été un bilan.
--
-- **`RM007` et non `RM006`**, qui est le refus du RPC (§5) : celui-là remonte jusqu'à un écran, qui
-- le reconnaît à son code pour relire la restitution ; celui-ci n'est atteignable par aucun chemin du
-- produit. Un code par condition, comme `RM003` et `RM004` (C6.4).
--
-- Les branches sont séparées, et l'insertion vient d'abord : en PL/pgSQL la condition d'un `if` ne
-- garantit aucun court-circuit, et `old` n'est pas assigné sur un `INSERT` (piège écrit dans
-- `20260912150000`).
create or replace function public.refuser_le_retour_en_arriere_du_bilan()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    if new.status = 'withdrawn' then
      raise exception 'Un bilan ne naît pas retiré : il se retire une fois complété, par retirer_le_bilan.'
        using errcode = 'RM007';
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'withdrawn' then
    raise exception 'Un bilan retiré ne revient pas : refaire un bilan crée une nouvelle ligne.'
      using errcode = 'RM005';
  end if;

  if new.status = 'withdrawn' then
    if old.status <> 'completed' then
      raise exception 'Seul un bilan complété se retire.'
        using errcode = 'RM007';
    end if;
    if current_user in ('anon', 'authenticated') then
      raise exception 'Un bilan se retire par retirer_le_bilan, jamais par une écriture directe.'
        using errcode = 'RM007';
    end if;
    return new;
  end if;

  if old.status = 'completed' then
    raise exception 'Un bilan complété ne se rouvre pas : refaire un bilan crée une nouvelle ligne.'
      using errcode = 'RM005';
  end if;

  return new;
end;
$function$;

revoke execute on function public.refuser_le_retour_en_arriere_du_bilan() from public, anon, authenticated;

-- L'insertion s'ajoute aux événements du trigger. `update of status` reste : un `update` qui ne
-- nomme pas la colonne ne peut pas changer de statut, et le trigger n'a rien à y voir.
drop trigger if exists refuser_le_retour_en_arriere_du_bilan on public.assessments;
create trigger refuser_le_retour_en_arriere_du_bilan
  before insert or update of status on public.assessments
  for each row execute function public.refuser_le_retour_en_arriere_du_bilan();

-- ---------------------------------------------------------------------------------------------
-- 3. Une cinquième raison de libération : `retrait`
-- ---------------------------------------------------------------------------------------------
--
-- **Une raison neuve plutôt que `rebilan`, et c'est la décision D2 qui la dicte.** L'encart orphelin
-- du plan annonce les deux libérations que la personne n'a **pas** choisies — `rebilan` et
-- `contexte` (`RAISONS_ANNONCABLES`, `src/types/plan.ts`) — et la requête du plan filtre sur elles.
-- Retirer un bilan est un geste **choisi**, du côté de `changement`, qu'on ne raconte pas :
-- réutiliser `rebilan` aurait fait dire « Ton plan a changé avec ton nouveau bilan » à quelqu'un qui
-- vient d'en retirer un, c'est-à-dire l'inverse de ce qui s'est passé. Une valeur à elle est tue par
-- construction, sans une ligne de code côté écran.
--
-- Elle garde tout ce que les autres valent ailleurs : l'archive est la trace qui empêche qu'un
-- engagement se perde sans laisser de ligne (C2.2), le suivi la lit parmi les décisions de la
-- saison, et le signal du premier plan (C5.6) compte l'archive « quelle qu'en soit la raison ».
alter table public.plan_action_commitments_archive
  drop constraint if exists plan_action_commitments_archive_released_reason_check;
alter table public.plan_action_commitments_archive
  add constraint plan_action_commitments_archive_released_reason_check
  check (released_reason = any (array['rebilan'::text, 'saison'::text, 'changement'::text, 'contexte'::text, 'retrait'::text]));

-- ---------------------------------------------------------------------------------------------
-- 4. La régénération sait qu'un bilan a été retiré
-- ---------------------------------------------------------------------------------------------
--
-- **Réécrite depuis `pg_get_functiondef`** : l'empreinte normalisée du corps installé sur le distant
-- (commentaires retirés, blancs réduits) est celle de `20260919230000`, relevé le 27/09/2026. Trois
-- lignes changent, et seulement elles :
--
--   - la cause `retrait` est admise ;
--   - **la garde d'idempotence ne tient plus que pour `bilan`.** Elle compare `created_at` du cycle
--     à `submitted_at` du dernier bilan valide ; après un retrait, ce dernier est le bilan
--     **précédent**, plus ancien que le cycle, donc la garde renverrait sans rien reconstruire — et
--     le plan resterait bâti sur un bilan que plus rien ne lit. C'est la même raison que `contexte` ;
--   - la raison d'archivage se dérive de la cause, `retrait` pour `retrait` (§3).
--
-- La branche « cycle neuf » garde `saison`, sous toutes les causes, pour la raison écrite dans le
-- corps : ce qui échoue là est une reconduction d'une saison à l'autre.
create or replace function public.generate_plan_cycle_for_user(p_user_id uuid, p_cause text default 'bilan')
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_reduction_pct constant numeric := 20;
  rec record;
  bounds record;
  v_cycle_id uuid;
  v_existing_id uuid;
  v_existing_created_at timestamptz;
  v_eng record;
  v_raison text;
begin
  -- Une valeur inconnue n'est pas une valeur par défaut : la laisser passer ferait taire une faute
  -- de frappe. `RM004`, un invariant de serveur qu'aucun client n'atteint (C6.4).
  if p_cause is null or p_cause not in ('bilan', 'contexte', 'retrait') then
    raise exception 'generate_plan_cycle_for_user: cause inconnue (%)', p_cause
      using errcode = 'RM004';
  end if;

  select
    p.cadence_type,
    a.id as assessment_id,
    ar.dominant_poste,
    ar.dominant_poste_label,
    ar.dominant_poste_co2_kg_year,
    ar.total_co2_kg_year,
    a.submitted_at,
    a.submitted_at::date as bilan_date
  into rec
  from public.assessments a
  join public.profiles p on p.id = a.user_id
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.user_id = p_user_id and a.status = 'completed'
  order by a.submitted_at desc nulls last
  limit 1;

  if not found then
    return;
  end if;

  if rec.cadence_type = 'rolling_quarter' then
    select * into bounds from public.rolling_quarter_bounds(rec.bilan_date, current_date);
  else
    select * into bounds from public.season_bounds(current_date);
  end if;

  select id, created_at into v_existing_id, v_existing_created_at
  from public.plan_cycles
  where user_id = p_user_id and period_start = bounds.period_start;

  -- **La garde d'idempotence ne vaut que pour la cause `bilan`** (le cron nocturne et le calcul du
  -- bilan) : elle empêche de reconstruire chaque nuit un plan que rien n'a changé. Les deux autres
  -- causes ne déplacent pas `submitted_at` — un changement de contexte ne resoumet rien (C6.4), un
  -- retrait rend le bilan précédent, plus ancien que le cycle (C4.7) — donc elles passeraient ici
  -- sans rien faire.
  if p_cause = 'bilan'
     and v_existing_created_at is not null
     and v_existing_created_at >= rec.submitted_at then
    return;
  end if;

  if v_existing_id is not null then
    select pa.action_template_id, pa.committed_at, pa.intention_days, pa.intention_timing,
           pa.carried_over_from, pa.plan_cycle_id as cycle_pour_archive
      into v_eng
    from public.plan_actions pa
    where pa.plan_cycle_id = v_existing_id and pa.committed_at is not null;
    -- La raison dit ce qui a reconstruit le cycle, donc ce que l'écran a le droit d'annoncer :
    -- `rebilan` et `contexte` le sont, `retrait` ne l'est pas (geste choisi, D2 de `v1-22`).
    v_raison := case p_cause
      when 'contexte' then 'contexte'
      when 'retrait' then 'retrait'
      else 'rebilan'
    end;
  else
    select pa.action_template_id, pa.committed_at, pa.intention_days, pa.intention_timing,
           pc.id as carried_over_from, pc.id as cycle_pour_archive
      into v_eng
    from public.plan_cycles pc
    join public.plan_actions pa on pa.plan_cycle_id = pc.id and pa.committed_at is not null
    where pc.user_id = p_user_id and pc.period_start < bounds.period_start
    order by pc.period_start desc
    limit 1;
    -- **Et `saison` ne se surcharge pas**, sous aucune cause : ici le cycle n'existe pas encore,
    -- donc ce qu'on tente est une **reconduction** d'une saison à l'autre, et c'est elle qui a
    -- échoué.
    v_raison := 'saison';
  end if;

  insert into public.plan_cycles (
    user_id, cadence_type, period_label, period_start, period_end,
    trip_label, poste, baseline_co2_kg_year, target_reduction_pct
  )
  values (
    p_user_id, rec.cadence_type, bounds.label, bounds.period_start, bounds.period_end,
    rec.dominant_poste_label, rec.dominant_poste, rec.dominant_poste_co2_kg_year, target_reduction_pct
  )
  on conflict (user_id, period_start) do update set
    cadence_type = excluded.cadence_type,
    period_label = excluded.period_label,
    period_end = excluded.period_end,
    trip_label = excluded.trip_label,
    poste = excluded.poste,
    baseline_co2_kg_year = excluded.baseline_co2_kg_year,
    target_reduction_pct = excluded.target_reduction_pct,
    created_at = now()
  returning id into v_cycle_id;

  delete from public.plan_actions where plan_cycle_id = v_cycle_id;

  with pistes as materialized (
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
           e.saving_kg_year desc, e.action_text;

  if v_eng.action_template_id is null then
    return;
  end if;

  update public.plan_actions
  set committed_at = v_eng.committed_at,
      intention_days = v_eng.intention_days,
      intention_timing = v_eng.intention_timing,
      carried_over_from = v_eng.carried_over_from
  where plan_cycle_id = v_cycle_id and action_template_id = v_eng.action_template_id;

  if not found then
    perform public.archiver_engagement(
      p_user_id, v_eng.cycle_pour_archive, v_eng.action_template_id,
      v_eng.intention_days, v_eng.intention_timing, v_eng.committed_at, v_raison
    );
  end if;
end;
$function$;

-- `create or replace` garde l'ACL de la fonction, mais la révocation est réécrite quand même : elle
-- ne coûte rien, et c'est elle qui fait foi à la relecture (`SUPABASE.md` §2.2).
revoke execute on function public.generate_plan_cycle_for_user(uuid, text) from public, anon, authenticated;

comment on function public.generate_plan_cycle_for_user(uuid, text) is
  'Génère le plan de réduction de la période courante sur le dernier bilan valide (completed). p_cause dit pourquoi : ''bilan'' (défaut, le cron et le calcul du bilan) respecte la garde d''idempotence et archive un engagement perdu en ''rebilan'' ; ''contexte'' et ''retrait'' sautent la garde — ni l''un ni l''autre ne déplace submitted_at — et archivent sous leur propre nom.';

-- ---------------------------------------------------------------------------------------------
-- 5. Le seul chemin du retrait
-- ---------------------------------------------------------------------------------------------
--
-- **Un RPC et pas une écriture directe**, pour la raison de `mettre_a_jour_le_contexte` : le retrait
-- et la reconstruction du plan doivent réussir **ensemble**. Le client a bien le droit d'écrire
-- `status` (la soumission en a besoin) ; c'est le trigger du §2 qui lui interdit `withdrawn`.
--
-- **Ce qu'il rend : le nombre de bilans valides qui restent.** C'est la seule chose dont l'écran a
-- besoin après coup — zéro veut dire « plus de bilan » (D3 : effacer la marque locale et rejoindre
-- la racine), un ou plus veut dire « rester sur la restitution, qui dit que ce bilan est retiré ».
-- Un nombre et non un vocabulaire : il n'y a pas de liste de valeurs à tenir d'accord avec
-- TypeScript.
--
-- **Trois situations, et une seule reconstruit le plan** :
--   - **le bilan retiré était le dernier valide, et il en reste d'autres** : le plan est reconstruit
--     sur le précédent, cause `retrait`. L'engagement suit la règle de C2.2 — reposé si son gabarit
--     est encore proposé, archivé en `retrait` sinon, et l'encart du plan n'en dit rien (§3) ;
--   - **il n'était pas le dernier** : le plan repose sur un bilan plus récent, il ne bouge pas, et on
--     ne l'appelle pas — une régénération forcée referait les rangs et rejouerait la reprise
--     d'engagement pour rien ;
--   - **il était le seul** : il n'y a rien sur quoi reconstruire, `generate_plan_cycle_for_user`
--     sortirait sur « aucun bilan valide ». **Le cycle reste tel quel**, et c'est un choix : le
--     supprimer effacerait l'historique de la saison et emporterait l'action engagée sans trace, ce
--     que C2.2 interdit à tous les chemins du produit. Il est inerte — le plan lit d'abord le
--     dernier bilan `completed` et rend l'état « pas de bilan » sans le regarder, les deux
--     générateurs de points et le cron du plan ne sélectionnent que des bilans `completed` — et il
--     se reprend au prochain bilan de la même saison comme un re-bilan : l'engagement y est reposé
--     s'il est encore proposé, archivé en `rebilan` sinon.
--
-- **Les bilans de la personne sont verrouillés d'abord, tous**, et pas seulement celui qu'on retire :
-- deux retraits lancés ensemble depuis deux onglets liraient chacun « il en reste un » avant que
-- l'autre n'ait écrit, et la personne se retrouverait sans bilan valide avec un plan reconstruit sur
-- l'un des deux — et une marque locale laissée à tort. Verrouillés, le second attend le premier et
-- relit l'état qu'il a laissé. `order by id` fixe l'ordre des verrous.
--
-- Refus :
--   - **un bilan qui n'est pas le sien, ou qui n'existe pas : `no_data_found`**, le même pour les deux
--     — rien n'est appris sur le bilan d'un tiers (l'idiome de `repondre_au_checkin`) ;
--   - **un bilan en cours ou déjà retiré : `RM006`**, reconnu au code par l'écran, qui relit alors
--     la restitution plutôt que de parler de réseau : ce refus veut presque toujours dire que l'état
--     a changé depuis l'affichage (un second appareil, un double appui).
create or replace function public.retirer_le_bilan(p_assessment_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_statut text;
  v_dernier uuid;
  v_restants integer;
begin
  perform 1 from public.assessments
  where user_id = v_uid
  order by id
  for update;

  select status into v_statut
  from public.assessments
  where id = p_assessment_id and user_id = v_uid;

  if v_statut is null then
    raise exception 'Bilan introuvable.' using errcode = 'no_data_found';
  end if;

  -- L'état est nommé en français : `in_progress` et `withdrawn` sont des valeurs de colonne, et ce
  -- message remonte jusqu'au client par PostgREST.
  if v_statut <> 'completed' then
    raise exception 'Ce bilan ne se retire pas (%).',
      case v_statut
        when 'withdrawn' then 'déjà retiré'
        when 'in_progress' then 'pas encore soumis'
        else v_statut
      end
      using errcode = 'RM006';
  end if;

  -- Le bilan qui porte le plan aujourd'hui, lu **avant** le retrait : c'est lui qui dit si le plan
  -- doit bouger. Même choix que `generate_plan_cycle_for_user`, au tri près.
  select a.id into v_dernier
  from public.assessments a
  where a.user_id = v_uid and a.status = 'completed'
  order by a.submitted_at desc nulls last
  limit 1;

  update public.assessments set status = 'withdrawn' where id = p_assessment_id;

  select count(*)::integer into v_restants
  from public.assessments
  where user_id = v_uid and status = 'completed';

  if v_restants > 0 and v_dernier = p_assessment_id then
    perform public.generate_plan_cycle_for_user(v_uid, 'retrait');
  end if;

  return v_restants;
end;
$function$;

-- Les trois rôles nommés au `revoke` : Supabase accorde `EXECUTE` à `PUBLIC` sur une fonction neuve,
-- donc oublier `public` ne révoque rien (`SUPABASE.md` §2.2). Puis le seul rôle qui en a besoin.
revoke execute on function public.retirer_le_bilan(uuid) from public, anon, authenticated;
grant execute on function public.retirer_le_bilan(uuid) to authenticated;

comment on function public.retirer_le_bilan(uuid) is
  'Retire un bilan complété de la personne (status = withdrawn, la ligne reste) et, s''il portait le plan et qu''il en reste un autre, reconstruit le plan sur le précédent (cause retrait, engagement perdu archivé en retrait, non annoncé). Rend le nombre de bilans valides restants. Refus : no_data_found (pas le sien, ou inconnu), RM006 (en cours ou déjà retiré).';

-- ---------------------------------------------------------------------------------------------
-- 6. La segmentation lit le dernier bilan valide
-- ---------------------------------------------------------------------------------------------
--
-- `20260905170100` avait remplacé `status = 'submitted'` — une valeur qui n'a jamais existé — par
-- `submitted_at is not null`, « un fait et non un mot », pour que le filtre ne puisse pas dériver si
-- le vocabulaire des statuts changeait. **C'est ce changement-là qui arrive**, et le fait ne dit plus
-- ce que la vue veut dire : un bilan retiré garde sa date de soumission, donc la personne aurait été
-- segmentée — zone, desserte, poste dominant — sur le bilan qu'elle vient de déclarer ne pas lui
-- ressembler. Le filtre porte donc sur le statut, et la faute de frappe qui avait motivé l'ancien
-- choix est gardée autrement : le fichier 34 exige un poste dominant non nul sur un bilan valide,
-- donc un `'complete'` écrit de mémoire y tomberait.
--
-- `create or replace` et non `drop` + `create` : les colonnes et leur ordre ne changent pas, donc les
-- vues qui en dépendent (`bilan_funnel_by_segment`, `engagement_by_segment`, …) restent en place.
create or replace view analytics.user_segments as
select
  p.id as user_id,
  p.created_at,
  p.cadence_type,
  u.is_anonymous,
  ans.zone_type,
  ans.tc_access,
  ans.household_vehicles,
  r.dominant_poste,
  r.total_co2_kg_year,
  r.mobility_constrained,
  a.submitted_at as last_assessment_at
from public.profiles p
join auth.users u on u.id = p.id
left join lateral (
  select a2.id, a2.submitted_at
  from public.assessments a2
  where a2.user_id = p.id and a2.status = 'completed'
  order by a2.submitted_at desc nulls last
  limit 1
) a on true
left join public.assessment_results r on r.assessment_id = a.id
left join public.assessment_answers ans on ans.assessment_id = a.id;

revoke all on analytics.user_segments from anon, authenticated;

commit;

-- ---------------------------------------------------------------------------------------------
-- Contrôles — rejouables, et chacun lit l'état installé plutôt que ce fichier
-- ---------------------------------------------------------------------------------------------
--
-- Ils ne remplacent pas `34_retirer_un_bilan.test.sql`, qui éprouve chaque refus sous une vraie
-- session et chaque reconstruction sur des fixtures : ils garantissent que **ce fichier-ci** a
-- produit l'état qu'il décrit, y compris rejoué sur une base qui l'a déjà reçu.
do $$
declare
  v_def text;
begin
  -- (a) Le statut accepte la troisième valeur, et n'a perdu aucune des deux autres.
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.assessments'::regclass and conname = 'assessments_status_check';
  if v_def is null then
    raise exception 'CONTROLE: la contrainte de statut a disparu au lieu d''être remplacée';
  end if;
  if position('''withdrawn''' in v_def) = 0
     or position('''completed''' in v_def) = 0
     or position('''in_progress''' in v_def) = 0 then
    raise exception 'CONTROLE: assessments.status ne porte pas ses trois valeurs (%)', v_def;
  end if;

  -- (b) La raison `retrait`, sans perdre les quatre autres.
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.plan_action_commitments_archive'::regclass
    and conname = 'plan_action_commitments_archive_released_reason_check';
  if v_def is null
     or position('''retrait''' in v_def) = 0
     or position('''rebilan''' in v_def) = 0
     or position('''saison''' in v_def) = 0
     or position('''changement''' in v_def) = 0
     or position('''contexte''' in v_def) = 0 then
    raise exception 'CONTROLE: released_reason ne porte pas ses cinq valeurs (%)', v_def;
  end if;

  -- (c) Le trigger des transitions veille aussi sur l'insertion.
  select pg_get_triggerdef(oid) into v_def
  from pg_trigger
  where tgrelid = 'public.assessments'::regclass
    and tgname = 'refuser_le_retour_en_arriere_du_bilan' and not tgisinternal;
  if v_def is null or position('INSERT' in v_def) = 0 or position('UPDATE OF status' in v_def) = 0 then
    raise exception 'CONTROLE: le trigger des transitions ne couvre pas l''insertion et la mise à jour du statut (%)', v_def;
  end if;

  -- (d) La régénération admet `retrait`, saute la garde pour elle, et archive sous son nom. Sans
  --     ancre sur les trois, une réécriture pourrait reposer l'une sans les autres.
  select pg_get_functiondef('public.generate_plan_cycle_for_user(uuid, text)'::regprocedure) into v_def;
  if position('''bilan'', ''contexte'', ''retrait''' in v_def) = 0 then
    raise exception 'CONTROLE: la cause retrait n''est pas admise';
  end if;
  if position('if p_cause = ''bilan''' in v_def) = 0 then
    raise exception 'CONTROLE: la garde d''idempotence ne se borne pas à la cause bilan';
  end if;
  if position('when ''retrait'' then ''retrait''' in v_def) = 0 then
    raise exception 'CONTROLE: la raison d''archivage ne se dérive pas de la cause retrait';
  end if;

  -- (e) Le RPC est appelable par une session, et par personne d'autre.
  if not has_function_privilege('authenticated', 'public.retirer_le_bilan(uuid)', 'execute') then
    raise exception 'CONTROLE: authenticated ne peut pas appeler retirer_le_bilan';
  end if;
  if has_function_privilege('anon', 'public.retirer_le_bilan(uuid)', 'execute') then
    raise exception 'CONTROLE: anon peut appeler retirer_le_bilan';
  end if;

  -- (f) La segmentation filtre sur le statut, lu sur la vue installée.
  if position('''completed''' in pg_get_viewdef('analytics.user_segments'::regclass)) = 0 then
    raise exception 'CONTROLE: analytics.user_segments ne filtre pas sur le dernier bilan valide';
  end if;
end;
$$;
