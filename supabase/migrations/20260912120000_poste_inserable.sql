-- v1-13, chantier C2.6 — une forme insérable du poste, et les trois colonnes qui la rendent
-- possible. Constats A12-1, A4-10, A12-14, A12-21, A12-19, A12-11.
--
-- ## Le défaut
--
-- Le libellé **snapshoté** d'un poste — « Trajet domicile-travail (Voiture thermique) », mode
-- compris — était collé après une préposition dans la question du point, l'email, le push, le
-- sous-titre du plan et le cap :
--
--     « as-tu changé de mode de transport au moins une fois cette semaine pour Trajet
--       domicile-travail (Voiture thermique) ? »
--     « soit − 20 % de trajet domicile-travail (voiture seul) »
--
-- Les maquettes écrivent « pour ton trajet domicile-travail ». Le même poste portait trois noms
-- selon l'écran.
--
-- ## Pourquoi il faut trois colonnes et pas seulement une fonction
--
-- La forme insérable se dérive du **poste** (`commute` / `leisure` / `travel`), et c'est
-- précisément ce que le schéma ne gardait nulle part sur les lignes qui en ont besoin :
--
--   * `assessment_results` décide si le poste « extras » est les loisirs ou les voyages
--     (`v_extras_is_leisure`, un booléen local), puis **jette la décision** et ne garde que le
--     libellé qu'elle a servi à composer. Retrouver le poste demandait de reconnaître un préfixe
--     de chaîne — ce qui marche jusqu'au jour où le libellé change ;
--   * `engagement_checkins` porte `loop_type`, mais `extras` couvre indifféremment les loisirs et
--     les voyages : la boucle ne nomme pas le poste ;
--   * `plan_cycles` porte `trip_label` et rien d'autre.
--
-- Se contenter d'un repli sur `loop_type` aurait remplacé une vérité laide par une **fausseté
-- lisible** : une personne dont le poste extras est les voyages aurait lu « pour tes sorties du
-- week-end ». On garde donc la décision là où elle est prise.
--
-- ## La jumelle TypeScript
--
-- `src/constants/postes.ts` porte la même table (`FORME_INSERABLE`, `formeInserable`). Elle est
-- écrite deux fois parce qu'un rappel part sans que le client soit là — même motif que la table
-- de vérité des rappels (`reminder_channel_for` / `src/types/rappels.ts`), et même règle :
-- **toucher à l'une sans l'autre est le défaut que cette paire existe pour attraper.**

-- ── 1. La forme insérable, côté serveur ─────────────────────────────────────────────────
-- `immutable` : la table est en dur, la fonction ne lit rien. C'est ce qui permet de l'appeler
-- dans un `select` de masse sans que l'optimiseur la rappelle par ligne.
--
-- `p_loop_type` est un **repli**, pas un substitut : quand le poste est connu il gagne toujours.
-- Il ne sert qu'aux lignes générées avant cette migration, que le backfill ci-dessous ne peut pas
-- toujours trancher.

create or replace function public.poste_inserable(p_poste text, p_loop_type text default null)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case coalesce(
    p_poste,
    case when p_loop_type = 'commute' then 'commute' else 'leisure' end
  )
    when 'commute' then 'ton trajet domicile-travail'
    when 'leisure' then 'tes sorties du week-end'
    when 'travel' then 'tes voyages'
    -- Un poste inconnu ne doit pas produire une phrase vide : on retombe sur la forme la plus
    -- neutre plutôt que d'écrire « pour  ? ».
    else 'tes trajets'
  end;
$$;

comment on function public.poste_inserable(text, text) is
  'Forme courte du poste, à glisser après une préposition : « pour ton trajet domicile-travail ». '
  'Jumelle SQL de FORME_INSERABLE / formeInserable (src/constants/postes.ts) — les deux tables '
  'doivent être touchées ensemble. Distincte de la forme longue de la restitution '
  '(« tes voyages longue distance »), qui alourdit une question déjà longue.';

-- Aucun appel client : la fonction ne sert qu'aux générateurs et à l'envoi, tous `security
-- definer`. `from public` d'abord, sans quoi le `revoke` ne révoque rien.
revoke execute on function public.poste_inserable(text, text) from public, anon, authenticated;

-- ── 2. `assessment_results.extras_poste` — la décision, gardée ──────────────────────────

alter table public.assessment_results
  add column if not exists extras_poste text
  check (extras_poste is null or extras_poste in ('leisure', 'travel'));

comment on column public.assessment_results.extras_poste is
  'Lequel des deux postes « extras » a été retenu (loisirs ou voyages), même départage que la '
  'décision dominante. Existe parce que extras_poste_label seul obligeait à reconnaître un '
  'préfixe de chaîne pour retrouver une décision que le calcul avait déjà prise.';

-- Backfill : le préfixe du libellé est exact et le restera, `20260903120000_precise_poste_labels`
-- ayant normalisé les anciennes formes (« Trajets loisirs ( » / « Voyages ( ») vers celles-ci.
-- C'est le seul endroit du dépôt où l'on se fie à ce préfixe, et c'est justement pour ne plus
-- avoir à le faire.
update public.assessment_results
set extras_poste = case
  when extras_poste_label like 'Loisirs du week-end (%' then 'leisure'
  when extras_poste_label like 'Voyages longue distance (%' then 'travel'
end
where extras_poste is null and extras_poste_label is not null;

-- ── 3. `engagement_checkins.poste` — le poste du point ──────────────────────────────────

alter table public.engagement_checkins
  add column if not exists poste text
  check (poste is null or poste in ('commute', 'leisure', 'travel'));

comment on column public.engagement_checkins.poste is
  'Le poste interrogé, snapshoté à la génération comme trip_label. loop_type ne suffit pas : '
  '« extras » couvre indifféremment les loisirs et les voyages.';

update public.engagement_checkins
set poste = 'commute'
where poste is null and loop_type = 'commute';

-- Les points `extras` déjà générés : on remonte au bilan qui les a produits plutôt que de
-- deviner. `distinct on` reproduit le choix des générateurs (le bilan complété le plus récent
-- **à la date du point**), pour ne pas réécrire un point ancien avec un bilan postérieur.
-- Sous-requête corrélée et non `from lateral (...)` : dans un `UPDATE ... FROM`, la table mise
-- à jour n'appartient pas à la clause `FROM`, donc un `LATERAL` ne peut pas la référencer
-- (« invalid reference to FROM-clause entry »). Le `set` corrélé, lui, la voit.
update public.engagement_checkins c
set poste = (
  select ar.extras_poste
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.user_id = c.user_id
    and a.status = 'completed'
    and a.submitted_at <= c.created_at
  order by a.submitted_at desc
  limit 1
)
where c.poste is null and c.loop_type = 'extras';

-- ── 4. `plan_cycles.poste` — le poste du cycle ──────────────────────────────────────────

alter table public.plan_cycles
  add column if not exists poste text
  check (poste is null or poste in ('commute', 'leisure', 'travel'));

comment on column public.plan_cycles.poste is
  'Le poste dominant sur lequel le cycle a été construit, snapshoté comme trip_label. Sert la '
  'forme insérable du sous-titre du plan et du cap.';

update public.plan_cycles pc
set poste = (
  select ar.dominant_poste
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.user_id = pc.user_id
    and a.status = 'completed'
    and a.submitted_at <= pc.created_at
  order by a.submitted_at desc
  limit 1
)
where pc.poste is null;

-- ── 5. Les générateurs écrivent le poste ────────────────────────────────────────────────
-- Substitutions vérifiées plutôt que corps recopiés : `recompute_assessment_results` fait 10 Ko
-- et la modification porte sur trois lignes. Le retranscrire serait la meilleure façon d'y
-- introduire une faute étrangère au sujet, et une faute **silencieuse** — le calcul rendrait un
-- nombre dans tous les cas. Même idiome que 20260911120000_soumission_bilan.sql et
-- 20260905200000_cylindree_deux_roues.sql, et pour la même raison : si une ancre a changé de
-- forme, la migration échoue au lieu de ne rien faire.

do $garde$
declare
  src text;
  cible oid;
  -- Trois ancres, trois remplacements, chacun attendu exactement une fois.
  ancres text[] := array[
    '    commute_poste_label, extras_poste_co2_kg_year, extras_poste_label,',
    '    v_commute_label, v_extras_co2, v_extras_label,',
    '    extras_poste_label = excluded.extras_poste_label,'
  ];
  remplacements text[] := array[
    '    commute_poste_label, extras_poste_co2_kg_year, extras_poste_label, extras_poste,',
    '    v_commute_label, v_extras_co2, v_extras_label, case when v_extras_is_leisure then ''leisure'' else ''travel'' end,',
    '    extras_poste_label = excluded.extras_poste_label,' || E'\n' || '    extras_poste = excluded.extras_poste,'
  ];
  i int;
  occurrences int;
begin
  select p.oid into cible
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = 'recompute_assessment_results';

  if cible is null then
    raise exception 'recompute_assessment_results est introuvable : cette migration suppose 20260905130000 appliquée.';
  end if;

  src := pg_get_functiondef(cible);

  for i in 1 .. array_length(ancres, 1) loop
    occurrences := (length(src) - length(replace(src, ancres[i], ''))) / length(ancres[i]);
    if occurrences <> 1 then
      raise exception
        'Ancre % trouvée % fois (une seule attendue) dans recompute_assessment_results : la migration doit être reprise à la main. Ancre : %',
        i, occurrences, ancres[i];
    end if;
    src := replace(src, ancres[i], remplacements[i]);
  end loop;

  execute src;
end
$garde$;

-- Contrôle : le calcul écrit bien la colonne.
do $controle$
begin
  if position('extras_poste = excluded.extras_poste' in
      (select prosrc from pg_proc
       where pronamespace = 'public'::regnamespace and proname = 'recompute_assessment_results')) = 0 then
    raise exception 'recompute_assessment_results n''écrit pas extras_poste.';
  end if;
end
$controle$;

-- `generate_plan_cycle_for_user` : même substitution vérifiée, sur l'insert du cycle.
do $garde_cycle$
declare
  src text;
  cible oid;
  ancres text[] := array[
    '    user_id, cadence_type, period_label, period_start, period_end,' || E'\n' ||
    '    trip_label, baseline_co2_kg_year, target_reduction_pct',
    '    p_user_id, rec.cadence_type, bounds.label, bounds.period_start, bounds.period_end,' || E'\n' ||
    '    rec.dominant_poste_label, rec.dominant_poste_co2_kg_year, target_reduction_pct',
    '    trip_label = excluded.trip_label,'
  ];
  remplacements text[] := array[
    '    user_id, cadence_type, period_label, period_start, period_end,' || E'\n' ||
    '    trip_label, poste, baseline_co2_kg_year, target_reduction_pct',
    '    p_user_id, rec.cadence_type, bounds.label, bounds.period_start, bounds.period_end,' || E'\n' ||
    '    rec.dominant_poste_label, rec.dominant_poste, rec.dominant_poste_co2_kg_year, target_reduction_pct',
    '    trip_label = excluded.trip_label,' || E'\n' || '    poste = excluded.poste,'
  ];
  i int;
  occurrences int;
begin
  select p.oid into cible
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = 'generate_plan_cycle_for_user';

  if cible is null then
    raise exception 'generate_plan_cycle_for_user est introuvable.';
  end if;

  src := pg_get_functiondef(cible);

  for i in 1 .. array_length(ancres, 1) loop
    occurrences := (length(src) - length(replace(src, ancres[i], ''))) / length(ancres[i]);
    if occurrences <> 1 then
      raise exception
        'Ancre % trouvée % fois (une seule attendue) dans generate_plan_cycle_for_user.', i, occurrences;
    end if;
    src := replace(src, ancres[i], remplacements[i]);
  end loop;

  execute src;
end
$garde_cycle$;

-- ── 6. Les générateurs de points snapshotent le poste ───────────────────────────────────
-- Ces deux-là sont courts : on les récrit en entier, c'est plus lisible qu'une substitution.
-- Seule la colonne `poste` s'ajoute ; la cadence, les bornes et l'expiration ne bougent pas
-- (C2.3 s'occupe de la période interrogée).

create or replace function public.generate_commute_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := date_trunc('week', now())::date;
  v_period_label text := 'Semaine du ' || to_char(v_period_start, 'DD/MM');
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'commute' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste)
  select distinct on (a.user_id)
    a.user_id, 'commute', v_period_start, v_period_label, ar.commute_poste_label, 'commute'
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed' and ar.commute_poste_label is not null
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$$;

revoke execute on function public.generate_commute_checkins() from public, anon, authenticated;

create or replace function public.generate_extras_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', now())::date;
  v_month_names constant text[] := array['janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre'];
  v_period_label text := v_month_names[extract(month from v_period_start)::int]
    || ' ' || extract(year from v_period_start)::text;
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'extras' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste)
  select distinct on (a.user_id)
    a.user_id, 'extras', v_period_start, v_period_label, ar.extras_poste_label, ar.extras_poste
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  where a.status = 'completed' and ar.extras_poste_label is not null
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$$;

revoke execute on function public.generate_extras_checkins() from public, anon, authenticated;

-- ── 7. Le rappel utilise la forme insérable ─────────────────────────────────────────────
-- Seule la sous-requête `q` change : la question cesse de coller `trip_label` après « pour ».
-- Tout le reste (canal, repli, étalement du `send_after`, `on conflict (checkin_id)`) est repris
-- à l'identique de 20260907230000_rappels_canal.sql — la garantie anti-relance ne bouge pas.

create or replace function public.enqueue_checkin_reminders()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_app_url text;
begin
  select coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'app_url'),
    'https://www.ramille.fr'
  ) into v_app_url;

  insert into public.notification_outbox (
    user_id, checkin_id, channel, recipient_email, subject, body, push_body, send_after
  )
  select
    c.user_id,
    c.id,
    ch.canal,
    -- Renseignée dès qu'une adresse est utilisable, même sur une ligne push : c'est ce qui
    -- rend le repli possible sans relire `auth.users` au moment de l'envoi.
    case when u.is_anonymous = false and u.email_confirmed_at is not null then u.email end,
    case c.loop_type
      when 'commute' then 'Ton point de la semaine'
      else 'Ton point du mois'
    end,
    'Bonjour,' || E'\n\n'
      || 'Une seule question, comme d''habitude : ' || q.question || E'\n\n'
      || 'Réponds-moi en un geste : ' || v_app_url || '/plan' || E'\n\n'
      || 'Si tu n''as rien changé, ce n''est pas grave — on se repose la question au prochain point.' || E'\n\n'
      || '— Ramille' || E'\n\n'
      || 'Pour ne plus recevoir ces rappels, désactive-les depuis « Toi » dans l''app.',
    -- La question seule : le titre et son début doivent suffire, Android ne montre pas
    -- davantage sans déplier.
    upper(left(q.question, 1)) || substr(q.question, 2),
    case when ch.canal = 'push' then now()
         else now() + make_interval(days =>
           (('x' || substr(md5(c.user_id::text), 1, 7))::bit(28)::int % 5))
    end
  from public.engagement_checkins c
  join auth.users u on u.id = c.user_id
  cross join lateral (select public.reminder_channel_for(c.user_id) as canal) ch
  cross join lateral (
    select 'as-tu changé de mode de transport au moins une fois '
      || case c.loop_type when 'commute' then 'cette semaine' else 'ce mois-ci' end
      -- C2.6 : la forme insérable, et non plus le libellé snapshoté avec son mode entre
      -- parenthèses. `c.poste` est renseigné depuis cette migration ; le repli sur
      -- `c.loop_type` ne sert qu'aux points générés avant elle que le backfill n'a pas
      -- tranchés (aucun bilan complété antérieur au point).
      || ' pour ' || public.poste_inserable(c.poste, c.loop_type) || ' ?' as question
  ) q
  where c.status = 'pending'
    and ch.canal is not null
  on conflict (checkin_id) do nothing;
end;
$function$;

revoke execute on function public.enqueue_checkin_reminders() from public, anon, authenticated;
