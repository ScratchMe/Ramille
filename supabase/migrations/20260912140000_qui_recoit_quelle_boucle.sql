-- v1-13, chantier C2.5 — qui reçoit quelle boucle : vélo, piétons, loisirs rares.
-- Arbitrage D5. Constats A13-3, A13-4, A8-12, A7-13, A7-3.
--
-- ## Les quatre situations, et ce qu'elles produisaient
--
-- 1. **Le cycliste et le piéton.** La boucle hebdo interroge chaque lundi les personnes qui vont
--    déjà au travail à vélo ou à pied : « as-tu changé de mode de transport … ? ». La seule
--    réponse honnête est « Non », suivie de la consolation d'échec, cinquante-deux fois par an,
--    juste sous un écran qui leur dit qu'elles font déjà l'essentiel.
-- 2. **Les loisirs « rarement ».** Le calcul leur attribue un mode par défaut — « Voiture » — que
--    la personne n'a jamais déclaré. Ce mode inventé devient le libellé de la question mensuelle
--    (« pour Loisirs du week-end (Voiture) ») et alimente des actions du plan (« Faire une sortie
--    sur trois à vélo ») sur des sorties hypothétiques.
-- 3. **Le profil sédentaire.** `extras_poste_label` est calculé sans condition, donc la boucle
--    mensuelle est générée pour **tout** bilan — y compris celui de quelqu'un qui ne déclare ni
--    sortie, ni vol, ni long trajet.
-- 4. **Le bilan à zéro.** Le poste dominant retombe sur `commute` même sans trajet déclaré, et le
--    libellé se compose alors sur un mode `NULL` : « Trajet domicile-travail () ».
--
-- ## Le critère qui reconnaît le vélo et la marche, et celui qu'il ne faut pas prendre
--
-- Le chantier propose deux critères : la **catégorie** du mode, ou `commute_main_leg_co2_kg_year
-- = 0`. **Le second est faux depuis le passage aux facteurs ACV** (20260905100000) : relevé en
-- base, `marche` vaut 0, mais `velo` vaut 0,00017 kg/km et `trottinette` 0,0249. Le critère « CO₂
-- nul » n'attraperait donc que les piétons, et les cyclistes — la population que ce chantier
-- existe pour soulager — continueraient de recevoir la question. C'est la catégorie qui décide.
--
-- Corollaire que le chantier n'avait pas vu : la catégorie `velo_marche` compte **trois** modes,
-- pas deux. La trottinette a sa question et sa réplique, plutôt qu'un repli sur le vélo qui
-- dirait à quelqu'un « ton trajet s'est-il fait à vélo ? » alors qu'il n'en a pas.
--
-- ## Ce que la question de maintien change
--
-- Le canvas a tranché la question ouverte du brief : **question de maintien**, pas « pas de
-- point » (`v1-14`, page Écarts). « La semaine dernière, ton trajet s'est-il fait à vélo ? » —
-- son « Oui » renforce l'identité, son « Non » reçoit une phrase neutre et **jamais**
-- `checkinNon`, qui consolerait d'un échec qui n'en est pas un.

-- ── 1. Le mode du trajet domicile-travail, gardé ────────────────────────────────────────
-- Même raison que `extras_poste` au chantier précédent : le calcul **résout** le mode du trajet
-- (`v_commute_mode_resolved`) puis n'en garde que le libellé. Sans la colonne, le générateur ne
-- peut pas connaître la catégorie du mode, et devrait reconnaître un préfixe de libellé.
-- Miroir exact de `dominant_poste_mode`, clé étrangère comprise.

alter table public.assessment_results
  add column if not exists commute_poste_mode text references public.transport_modes(id);

comment on column public.assessment_results.commute_poste_mode is
  'Le mode résolu du trajet domicile-travail. Existe pour que la génération du point puisse lire '
  'sa catégorie (velo_marche → question de maintien) sans reconnaître un préfixe de libellé.';

-- Backfill : le libellé porte le label du mode entre parenthèses, et `transport_modes.label` est
-- unique en pratique. C'est le seul endroit du dépôt qui s'y fie, et c'est pour ne plus avoir à
-- le faire. Les lignes qu'on ne sait pas trancher restent nulles — le générateur les traite
-- alors comme une question de changement, c'est-à-dire comme avant.
update public.assessment_results ar
set commute_poste_mode = (
  select m.id from public.transport_modes m
  where ar.commute_poste_label = 'Trajet domicile-travail (' || m.label || ')'
  limit 1
)
where ar.commute_poste_mode is null and ar.commute_poste_label is not null;

-- ── 2. Le point sait quelle question il pose ────────────────────────────────────────────
-- `question_kind` et `mode` sont deux colonnes et non une, parce que ce sont deux faits : le
-- **genre** de question (que C2.1 fera grossir avec « engagement » et « occasion ») et le
-- **mode** qui en remplit le texte. Les fusionner en `maintien_velo` / `maintien_marche`
-- ferait exploser la liste des genres au chantier suivant.

alter table public.engagement_checkins
  add column if not exists question_kind text not null default 'changement'
  check (question_kind in ('changement', 'maintien'));

alter table public.engagement_checkins
  add column if not exists mode text references public.transport_modes(id);

comment on column public.engagement_checkins.question_kind is
  'Le genre de question posée. « maintien » pour un trajet déjà fait à vélo, à pied ou en '
  'trottinette : son « Non » ne reçoit jamais la consolation d''échec.';
comment on column public.engagement_checkins.mode is
  'Le mode snapshoté du poste interrogé, comme trip_label. Remplit le texte de la question de '
  'maintien (« … s''est-il fait à vélo ? ») et choisit la réplique de Ramille.';

-- ── 3. Le calcul : mode gardé, loisirs rares honnêtes, bilan à zéro sans parenthèse vide ─
-- Six substitutions vérifiées dans `recompute_assessment_results` (10 Ko), plus une réécriture
-- du libellé dominant contrôlée après coup. Le recopier serait la
-- meilleure façon d'y introduire une faute étrangère au sujet, et une faute **silencieuse** —
-- le calcul rendrait un nombre dans tous les cas. Même idiome que les migrations précédentes :
-- chaque ancre est comptée avant substitution, et la migration échoue si l'une a changé de forme.

do $garde$
declare
  src text;
  cible oid;
  ancres text[] := array[
    -- (1) la colonne, (2) la valeur, (3) le on-conflict
    '    commute_poste_label, extras_poste_co2_kg_year, extras_poste_label, extras_poste,',
    '    v_commute_label, v_extras_co2, v_extras_label, case when v_extras_is_leisure then ''leisure'' else ''travel'' end,',
    '    commute_poste_label = excluded.commute_poste_label,',
    -- (4) le résiduel des loisirs rares
    E'  if a.leisure_frequency = ''rarely'' then\n    v_leisure_distance := leisure_default_distance;\n    v_leisure_mode := leisure_default_mode;',
    -- (5) le libellé du poste extras
    E'  v_extras_label := case when v_extras_is_leisure\n    then ''Loisirs du week-end ('' || coalesce(regexp_replace(v_mode_label, ''[()]'', '''', ''g''), '''') || '')''\n    else ''Voyages longue distance ('' || coalesce(regexp_replace(v_mode_label, ''[()]'', '''', ''g''), '''') || '')''\n  end;',
    -- (6) le poste dominant d'un bilan à zéro
    E'  if v_total = 0 then\n    v_dominant := ''commute'';'
  ];
  remplacements text[] := array[
    '    commute_poste_label, commute_poste_mode, extras_poste_co2_kg_year, extras_poste_label, extras_poste,',
    '    v_commute_label, v_commute_mode_resolved, v_extras_co2, v_extras_label, case when v_extras_is_leisure then ''leisure'' else ''travel'' end,',
    E'    commute_poste_label = excluded.commute_poste_label,\n    commute_poste_mode = excluded.commute_poste_mode,',
    -- (4) Sans véhicule au foyer, le résiduel en voiture décrit un trajet que la personne ne peut
    -- pas faire (A7-13). `train` et non `bus` : à 0,1224 kg/km le bus ne vaut que 14 % de moins
    -- qu'une thermique en ACV, donc la correction serait presque un non-événement — c'est le
    -- piège que CLAUDE.md signale pour toute substitution par le bus. Le train/RER (0,0277) est
    -- le mode générique plausible d'une sortie de 15 km sans voiture.
    E'  if a.leisure_frequency = ''rarely'' then\n    v_leisure_distance := leisure_default_distance;\n    v_leisure_mode := case when a.household_vehicles = ''0'' then ''train'' else leisure_default_mode end;',
    -- (5) Les loisirs « rarement » n'ont pas de mode déclaré : le nommer inventerait une réponse.
    E'  v_extras_label := case\n    when v_extras_is_leisure and a.leisure_frequency = ''rarely''\n      then ''Loisirs du week-end (occasionnels)''\n    when v_extras_is_leisure\n      then ''Loisirs du week-end ('' || coalesce(regexp_replace(v_mode_label, ''[()]'', '''', ''g''), '''') || '')''\n    else ''Voyages longue distance ('' || coalesce(regexp_replace(v_mode_label, ''[()]'', '''', ''g''), '''') || '')''\n  end;',
    -- (6) Un bilan à zéro nomme le poste où quelque chose est **déclaré**, et non `commute` par
    -- défaut — sans quoi le libellé se compose sur un mode nul et rend « Trajet domicile-travail () ».
    E'  if v_total = 0 then\n    v_dominant := case\n      when a.commute_has_regular_trip then ''commute''\n      when a.leisure_frequency <> ''rarely'' then ''leisure''\n      when coalesce(a.flights_total_per_year, 0) + coalesce(a.train_long_trips_per_year, 0)\n           + coalesce(a.car_long_trips_per_year, 0) > 0 then ''travel''\n      else ''commute''\n    end;'
  ];
  i int;
  occurrences int;
begin
  select p.oid into cible from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = 'recompute_assessment_results';

  if cible is null then
    raise exception 'recompute_assessment_results est introuvable.';
  end if;

  src := pg_get_functiondef(cible);

  for i in 1 .. array_length(ancres, 1) loop
    occurrences := (length(src) - length(replace(src, ancres[i], ''))) / length(ancres[i]);
    if occurrences <> 1 then
      raise exception 'Ancre % trouvée % fois (une seule attendue) dans recompute_assessment_results.', i, occurrences;
    end if;
    src := replace(src, ancres[i], remplacements[i]);
  end loop;

  -- Le libellé dominant, lui, se réécrit en entier : les trois branches doivent toutes perdre la
  -- parenthèse vide, et une substitution par branche multiplierait les ancres sans rien gagner.
  src := replace(src,
    E'  v_dominant_label := case v_dominant\n    when ''commute'' then ''Trajet domicile-travail ('' || coalesce(regexp_replace(v_mode_label, ''[()]'', '''', ''g''), '''') || '')''\n    when ''leisure'' then ''Loisirs du week-end ('' || coalesce(regexp_replace(v_mode_label, ''[()]'', '''', ''g''), '''') || '')''\n    else ''Voyages longue distance ('' || coalesce(regexp_replace(v_mode_label, ''[()]'', '''', ''g''), '''') || '')''\n  end;',
    E'  v_dominant_label := case v_dominant\n    when ''commute'' then ''Trajet domicile-travail''\n    when ''leisure'' then ''Loisirs du week-end''\n    else ''Voyages longue distance''\n  end\n    -- Jamais « Trajet domicile-travail () » : quand aucun mode n''est résolu — bilan à zéro,\n    -- poste sans réponse — le poste se nomme seul.\n    || coalesce('' ('' || regexp_replace(v_mode_label, ''[()]'', '''', ''g'') || '')'', '''');');

  if position('v_dominant_label := case v_dominant' in src) = 0
     or position(E'|| coalesce('' ('' || regexp_replace(v_mode_label' in src) = 0 then
    raise exception 'La réécriture du libellé dominant n''a pas pris : la migration doit être reprise à la main.';
  end if;

  execute src;
end
$garde$;

-- Contrôles : les trois changements se lisent dans le corps installé.
do $controle$
declare src text;
begin
  select prosrc into src from pg_proc
  where pronamespace = 'public'::regnamespace and proname = 'recompute_assessment_results';

  if position('commute_poste_mode = excluded.commute_poste_mode' in src) = 0 then
    raise exception 'recompute_assessment_results n''écrit pas commute_poste_mode.';
  end if;
  if position('Loisirs du week-end (occasionnels)' in src) = 0 then
    raise exception 'Le libellé des loisirs occasionnels n''a pas été posé.';
  end if;
  if position('when a.commute_has_regular_trip then' in src) = 0 then
    raise exception 'Le poste dominant d''un bilan à zéro n''a pas été corrigé.';
  end if;
  -- Pas de contrôle « plus aucune parenthèse ouvrante » : `v_commute_label` en garde une,
  -- légitimement — il n'est composé que lorsqu'un trajet est déclaré, donc avec un mode résolu.
  -- Le libellé dominant, lui, est vérifié dans le bloc précédent par la présence de sa nouvelle
  -- queue `|| coalesce(...)`, qui est le seul signal fiable de la réécriture.
end
$controle$;


-- ── 4. L'estimateur ne propose plus d'action sur des sorties hypothétiques ──────────────
-- Un profil « rarement » n'a déclaré ni mode ni distance de loisir : le calcul lui prête une
-- sortie de 15 km pour ne pas rendre zéro (D5, conservé). En faire la base d'une action —
-- « Faire une sortie sur trois à vélo » — transforme une hypothèse de calcul en conseil
-- personnel, sur des sorties que la personne n'a jamais dit faire.
--
-- La garde se pose au même endroit que celles du contexte B4, qui refusent déjà l'impossible
-- (pas de transports en commun là où il n'y en a pas, pas de voiture là où il n'y en a pas) :
-- c'est le même geste, et le lire au même endroit évite d'en chercher un second ailleurs.

do $garde_estim$
declare
  src text;
  cible oid;
  ancre constant text := E'    if t.requires_car and coalesce(a.household_vehicles, '''') = ''0'' then\n      continue;\n    end if;';
  remplacement constant text := E'    if t.requires_car and coalesce(a.household_vehicles, '''') = ''0'' then\n      continue;\n    end if;\n    -- C2.5 : les sorties de ce profil sont un résiduel de calcul, pas une déclaration.\n    if t.poste = ''leisure'' and a.leisure_frequency = ''rarely'' then\n      continue;\n    end if;';
  occurrences int;
begin
  select p.oid into cible from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = 'estimate_action_savings';

  if cible is null then
    raise exception 'estimate_action_savings est introuvable.';
  end if;

  src := pg_get_functiondef(cible);
  occurrences := (length(src) - length(replace(src, ancre, ''))) / length(ancre);

  if occurrences <> 1 then
    raise exception 'La garde « requires_car » a été trouvée % fois (une seule attendue) dans estimate_action_savings.', occurrences;
  end if;

  execute replace(src, ancre, remplacement);
end
$garde_estim$;

do $controle_estim$
begin
  if position('t.poste = ''leisure'' and a.leisure_frequency = ''rarely''' in
      (select prosrc from pg_proc
       where pronamespace = 'public'::regnamespace and proname = 'estimate_action_savings')) = 0 then
    raise exception 'La garde des loisirs rares n''a pas été posée dans estimate_action_savings.';
  end if;
end
$controle_estim$;

-- ── 5. La forme de la question de maintien, côté serveur ────────────────────────────────
-- Trois modes, trois compléments. La jumelle TypeScript vit dans `src/types/checkin.ts` — écrite
-- deux fois pour la même raison que la forme insérable : le rappel part sans que le client soit
-- là, l'écran affiche la même question quand il est là.

create or replace function public.complement_de_maintien(p_mode text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case p_mode
    when 'velo' then 'à vélo'
    when 'marche' then 'à pied'
    when 'trottinette' then 'en trottinette'
    -- Un mode hors de la catégorie velo_marche ne devrait jamais arriver ici ; s'il arrive, la
    -- phrase reste grammaticale plutôt que tronquée.
    else 'autrement'
  end;
$$;

comment on function public.complement_de_maintien(text) is
  'Le complément de la question de maintien : « … ton trajet s''est-il fait à vélo ? ». Jumelle '
  'SQL de src/types/checkin.ts — les deux tables doivent être touchées ensemble.';

revoke execute on function public.complement_de_maintien(text) from public, anon, authenticated;

-- ── 6. La génération : maintien pour le vélo et la marche, extras seulement si déclaré ──

create or replace function public.generate_commute_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period_start date := date_trunc('week', now())::date - 7;
  v_period_label text := 'Semaine du ' || to_char(v_period_start, 'DD/MM');
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'commute' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (
    user_id, loop_type, period_start, period_label, trip_label, poste, question_kind, mode
  )
  select distinct on (a.user_id)
    a.user_id, 'commute', v_period_start, v_period_label, ar.commute_poste_label, 'commute',
    -- **La catégorie, et non le CO₂.** Le vélo n'est plus à zéro depuis les facteurs ACV : un
    -- critère « CO₂ nul » n'attraperait que les piétons et laisserait les cyclistes recevoir
    -- chaque lundi une question dont la seule réponse honnête est « Non ».
    case when tm.category = 'velo_marche' then 'maintien' else 'changement' end,
    ar.commute_poste_mode
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  left join public.transport_modes tm on tm.id = ar.commute_poste_mode
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
  v_period_start date := (date_trunc('month', now()) - interval '1 month')::date;
  v_period_label text := public.mois_francais(v_period_start)
    || ' ' || extract(year from v_period_start)::text;
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'extras' and status = 'pending' and period_start < v_period_start;

  -- Ni `question_kind` ni `mode` ici : **la question de maintien n'existe que sur la boucle
  -- hebdomadaire.** Aller au travail à vélo est une habitude qu'on peut maintenir semaine après
  -- semaine ; un voyage ou une sortie ne se « maintiennent » pas, ils ont lieu ou non. Les deux
  -- colonnes gardent donc leur défaut (« changement », et pas de mode).
  insert into public.engagement_checkins (
    user_id, loop_type, period_start, period_label, trip_label, poste
  )
  select distinct on (a.user_id)
    a.user_id, 'extras', v_period_start, v_period_label, ar.extras_poste_label, ar.extras_poste
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  join public.assessment_answers ans on ans.assessment_id = a.id
  where a.status = 'completed'
    and ar.extras_poste_label is not null
    -- **Une base déclarée, sinon pas de boucle.** `extras_poste_label` est calculé sans
    -- condition : sans ce filtre, la boucle mensuelle est générée pour un profil qui n'a
    -- déclaré ni sortie, ni vol, ni long trajet — et lui pose chaque mois une question sur des
    -- déplacements qui n'existent que dans le résiduel du calcul.
    and (
      ans.leisure_frequency <> 'rarely'
      or coalesce(ans.flights_total_per_year, 0) > 0
      or coalesce(ans.train_long_trips_per_year, 0) > 0
      or coalesce(ans.car_long_trips_per_year, 0) > 0
    )
  order by a.user_id, a.submitted_at desc
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$$;

revoke execute on function public.generate_extras_checkins() from public, anon, authenticated;

-- ── 7. Le rappel pose la question de maintien quand c'en est une ────────────────────────
-- Deux formes, une seule fonction. La question de changement garde la forme de C2.3 ; celle de
-- maintien est **affirmative** — elle demande si l'habitude a tenu, pas si quelque chose a changé.
--
--     « La semaine dernière, ton trajet s'est-il fait à vélo ? »
--
-- Le reste (canal, repli, adresse, étalement du `send_after`, `on conflict (checkin_id)`) est
-- repris à l'identique : la garantie anti-relance ne bouge pas.

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
    select case c.loop_type
        when 'commute' then 'la semaine dernière'
        -- Le mois est nommé à partir de `period_start`, donc du mois réellement interrogé —
        -- jamais de `now()`, qui dirait le mois courant si le cron passait avec du retard.
        else 'en ' || public.mois_francais(c.period_start)
      end
      || case c.question_kind
        -- **La question de maintien ne demande pas ce qui a changé.** Poser « as-tu changé de
        -- mode ? » à quelqu'un qui va déjà au travail à vélo n'a qu'une réponse honnête, et
        -- elle déclenche une consolation d'échec qui n'a pas lieu d'être (C2.5).
        when 'maintien' then ', ton trajet s''est-il fait '
          || public.complement_de_maintien(c.mode) || ' ?'
        else ', as-tu changé de mode de transport pour '
          || public.poste_inserable(c.poste, c.loop_type) || ' ?'
      end as question
  ) q
  where c.status = 'pending'
    and ch.canal is not null
  on conflict (checkin_id) do nothing;
end;
$function$;

revoke execute on function public.enqueue_checkin_reminders() from public, anon, authenticated;
