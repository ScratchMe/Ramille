-- La carte d'attente sait si une boucle tourne (30/09/2026, `v1-27` §12.22).
--
-- L'écran du plan décidait de la boucle à nommer sur le seul poste domicile-travail : sans trajet,
-- la carte d'attente promettait « Je te fais signe au début du mois prochain » — y compris quand la
-- boucle mensuelle ne tourne pas (aucun trajet, sorties rares, aucun voyage déclaré : le profil
-- sédentaire de C2.5). Le signe promis n'arrivait jamais. Décision de la personne qui pilote, le
-- 30/09/2026 : dans ce cas, Ramille ne promet rien.
--
-- L'écran ne pouvait pas le savoir seul sans recopier la règle de la boucle mensuelle en TypeScript
-- — `a_des_voyages_declares` et son filtre —, c'est-à-dire une paire de plus à tenir d'accord. La
-- règle est donc **extraite en un seul endroit**, que lisent les deux générateurs **et** l'écran :
--
--   * `public.boucles_du_dernier_bilan(p_user_id)` — pour chaque personne (ou pour une seule), le
--     dernier bilan valide et les boucles qu'il ouvre. C'est le choix que les deux générateurs
--     portaient chacun dans leur corps (`20260930092838`) : `completed`, un résultat calculé, le
--     plus récent par `submitted_at` — celui du plan —, puis le filtre de chaque boucle. **Un
--     `p_user_id` nul veut dire tout le monde** : c'est l'appel des générateurs, et c'est pourquoi
--     la fonction n'est appelable que côté serveur ;
--   * `public.ma_boucle_a_venir()` — ce que l'écran lit : `hebdo` si la boucle hebdomadaire
--     tourne, `mensuel` si seule la mensuelle tourne, `aucune` sinon. Seul `authenticated`
--     l'appelle, et une session absente rend `aucune` sans jamais interroger tout le monde. **Ses
--     trois valeurs ont une jumelle côté client, `lireLaBoucleAVenir` (`src/types/rappels.ts`)**,
--     qui rend `null` sur toute autre : en renommer une ici sans là-bas ferait disparaître la carte
--     d'attente en silence.
--
-- Les deux générateurs sont réécrits depuis leur corps installé (`pg_get_functiondef`, identique à
-- `20260930092838`) pour lire la fonction à la place de leur sous-requête : **aucun point ne
-- change**, et le test 38 le garde. **Ne rejouer après elle aucune migration antérieure qui réécrit
-- ces deux générateurs** — dont `20260927191009`, `20260927210200`, `20260927210247` et
-- `20260930092838` : chacune réinstallerait un choix recopié dans leur corps.
--
-- Gardes : `supabase/tests/database/39_la_carte_d_attente_et_les_boucles.test.sql`, et le test 38.

-- ── 1. La règle, en un seul endroit ──────────────────────────────────────────────────────

create or replace function public.boucles_du_dernier_bilan(p_user_id uuid default null)
returns table (user_id uuid, assessment_id uuid, loop_type text)
language sql
stable
security definer
set search_path = public
as $$
  with dernier as (
    -- Le dernier bilan valide, choisi AVANT les filtres des boucles : filtrer d'abord faisait
    -- reprendre la main à un ancien bilan quand le nouveau n'ouvre plus la boucle (`v1-27` §12.21).
    -- Même choix que `generate_plan_cycle_for_user` : statut et résultat, puis la date.
    select distinct on (d.user_id) d.user_id, d.id
    from public.assessments d
    join public.assessment_results dr on dr.assessment_id = d.id
    where d.status = 'completed'
      and (p_user_id is null or d.user_id = p_user_id)
    order by d.user_id, d.submitted_at desc nulls last
  )
  -- La boucle hebdomadaire : un poste domicile-travail existe.
  select dernier.user_id, dernier.id, 'commute'::text
  from dernier
  join public.assessment_results ar on ar.assessment_id = dernier.id
  where ar.commute_poste_label is not null
  union all
  -- La boucle mensuelle : une base déclarée — des sorties, ou pour qui sort rarement un voyage.
  -- Les compteurs de voyages s'énumèrent dans `a_des_voyages_declares`, et seulement là (v1-27 §5).
  select dernier.user_id, dernier.id, 'extras'::text
  from dernier
  join public.assessment_results ar on ar.assessment_id = dernier.id
  join public.assessment_answers ans on ans.assessment_id = dernier.id
  where ar.extras_poste_label is not null
    and (ans.leisure_frequency <> 'rarely' or public.a_des_voyages_declares(ans));
$$;

comment on function public.boucles_du_dernier_bilan(uuid) is
  'Pour chaque personne (p_user_id nul) ou pour une seule, le dernier bilan valide et les boucles de '
  'points qu''il ouvre (commute, extras). Seule définition de « qui reçoit quelle boucle » : les deux '
  'générateurs et ma_boucle_a_venir la lisent (30/09/2026, v1-27 §12.22).';

revoke execute on function public.boucles_du_dernier_bilan(uuid) from public, anon, authenticated;

-- ── 2. Les générateurs la lisent ─────────────────────────────────────────────────────────

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
  -- Qui reçoit la boucle, et depuis quel bilan : décidé en un seul endroit, que l'écran du plan lit
  -- aussi (30/09/2026).
  from public.boucles_du_dernier_bilan() o
  join public.assessments a on a.id = o.assessment_id
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
  where o.loop_type = 'commute'
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
  -- Qui reçoit la boucle, et depuis quel bilan : décidé en un seul endroit, que l'écran du plan lit
  -- aussi — la base déclarée (`a_des_voyages_declares`) comprise (30/09/2026).
  from public.boucles_du_dernier_bilan() o
  join public.assessments a on a.id = o.assessment_id
  join public.assessment_results ar on ar.assessment_id = a.id
  join public.assessment_answers ans on ans.assessment_id = a.id
  cross join lateral (
    -- Qui sort rarement n'a déclaré, hors de son trajet, que ses voyages : c'est sur eux que porte
    -- la boucle, même quand le résiduel des sorties pèse plus lourd. `boucles_du_dernier_bilan`
    -- garantit qu'il en a — sinon aucun point n'est généré.
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
  where o.loop_type = 'extras'
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$function$;

-- ── 3. Ce que l'écran lit ────────────────────────────────────────────────────────────────

create or replace function public.ma_boucle_a_venir()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Sans session, rien à dire — et surtout pas l'appel à `null`, qui interrogerait tout le monde.
  if v_uid is null then
    return 'aucune';
  end if;

  -- La boucle hebdomadaire passe devant : c'est le prochain contact, le lundi (`carteAttente`).
  return (
    select case
      when bool_or(o.loop_type = 'commute') then 'hebdo'
      when bool_or(o.loop_type = 'extras') then 'mensuel'
      else 'aucune'
    end
    from public.boucles_du_dernier_bilan(v_uid) o
  );
end;
$$;

comment on function public.ma_boucle_a_venir() is
  'La boucle de points qui tourne pour la personne connectée, d''après son dernier bilan valide : '
  'hebdo, mensuel ou aucune. Lue par la carte d''attente du plan, qui ne promet rien quand elle '
  'vaut aucune (30/09/2026, v1-27 §12.22). Jumelle client des trois valeurs : lireLaBoucleAVenir '
  '(src/types/rappels.ts).';

revoke execute on function public.ma_boucle_a_venir() from public, anon;
grant execute on function public.ma_boucle_a_venir() to authenticated;

-- ── 4. Contrôle ──────────────────────────────────────────────────────────────────────────

do $$
begin
  if has_function_privilege('authenticated', 'public.boucles_du_dernier_bilan(uuid)', 'execute')
     or has_function_privilege('anon', 'public.boucles_du_dernier_bilan(uuid)', 'execute') then
    raise exception 'boucles_du_dernier_bilan ne doit pas être appelable par le client';
  end if;
  if not has_function_privilege('authenticated', 'public.ma_boucle_a_venir()', 'execute')
     or has_function_privilege('anon', 'public.ma_boucle_a_venir()', 'execute') then
    raise exception 'ma_boucle_a_venir doit être appelable par authenticated, et par lui seul';
  end if;
end;
$$;
