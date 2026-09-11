-- v1-13, chantier C2.1 — le point de suivi connaît l'action engagée.
-- Arbitrage D1. Constats A8-10, A13-2, A4-3, A12-10. Base prescrite par `v1-14` §4.2, copie §3.2.
--
-- ## Le défaut
--
-- La personne s'engage sur « Faire un trajet sur cinq à vélo, le mardi et le jeudi ». La question
-- du lundi suivant est « La semaine dernière, as-tu changé de mode de transport pour ton trajet
-- domicile-travail ? » — dans la carte, dans l'email et dans la notification. Le « si-alors » que
-- l'engagement pose n'est jamais refermé : rien ne relit `plan_actions.committed_at`,
-- `intention_days` ni `action_text` au moment de générer le point. Pour le poste voyages, c'est
-- pire qu'imprécis : « changer de mode » est hors sujet quand l'action est de renoncer à un vol.
--
-- ## Les quatre genres de question, et lequel gagne
--
-- `question_kind` passait de deux valeurs à quatre (`v1-14` §4.2). L'ordre de priorité est fixe et
-- épinglé par un test, parce qu'il ne se devine pas :
--
--   1. **`maintien`** — le mode principal est de catégorie `velo_marche` (C2.5). Il gagne sur tout
--      le reste : demander à quelqu'un qui va déjà au travail à vélo s'il a tenu son engagement de
--      faire un trajet à vélo serait poser deux fois la même question. En pratique la collision
--      n'arrive pas — un cycliste n'a aucune action de trajet à proposer, son plan est vide (effet
--      de bord de C2.5 relevé pour C3.8) — mais un ordre implicite dans un `case` est précisément
--      ce qui devient faux sans qu'on le voie.
--   2. **`engagement`** — une action est engagée sur le poste interrogé, et la boucle est
--      hebdomadaire : la question nomme les jours choisis. « Mardi ou jeudi, as-tu fait ce trajet
--      à vélo ? »
--   3. **`occasion`** — une action est engagée et la boucle est mensuelle : il n'y a pas de jour
--      de la semaine à nommer (l'intention est une échéance fermée, pas un rythme), donc la
--      question nomme le **mois écoulé** et demande si l'occasion s'est présentée. « En septembre,
--      as-tu eu un déplacement où tu as choisi autre chose que l'avion ? »
--   4. **`generique`** — aucune action engagée. C'est l'ancien `changement`, renommé : « générique »
--      dit ce qu'il est (le repli), « changement » décrivait le verbe de sa phrase.
--
-- ## Ce qui est figé, et pourquoi c'est tout l'intérêt
--
-- `committed_action_text`, `committed_intention_days`, `committed_intention_timing` et
-- `committed_question` sont posés **à la génération** et jamais relus à la volée. C'est la même
-- raison que `trip_label` et `period_label` (C1.12) : changer d'action le mercredi ne doit pas
-- réécrire une question posée le lundi et déjà partie par email. Un test pgTAP l'épingle en
-- changeant l'engagement après coup.
--
-- Et `committed_question` est figée **en plus** des trois autres, alors qu'elle pourrait se
-- recomposer : c'est la seule façon de garantir que la carte affiche mot pour mot ce que la
-- notification a envoyé, même si la composition change de version entre les deux. La fonction de
-- composition reste nécessaire pour les lignes d'avant cette migration, et comme jumelle testable.

-- ── 1. Les listes françaises que le serveur doit porter ─────────────────────────────────
-- Troisième liste de mots français en SQL après `mois_francais` et `complement_de_maintien`, et
-- pour la même raison qu'elles : **le rappel part sans le client**. Chacune a sa jumelle dans
-- `src/types/checkin.ts` et les deux sont épinglées. Ce n'est pas une duplication qu'on tolère,
-- c'est une paire qu'on tient — et la règle est écrite dans CLAUDE.md.

create or replace function public.jours_francais(p_days smallint[])
returns text
language sql
immutable
set search_path to 'public'
as $$
  -- **« ou » et non « et », et une seule majuscule** : la question demande si le geste a eu lieu
  -- *l'un* de ces jours, pas tous. `formatIntentionDays` (src/types/plan.ts) dit « le mardi et le
  -- jeudi » parce qu'elle rappelle un engagement ; ici on interroge. Les deux formes coexistent à
  -- dessein, et la majuscule ne porte que sur le premier mot — `initcap` sur la liste entière
  -- rendrait « Mardi Ou Jeudi ».
  select case
    when p_days is null or (select count(distinct d) from unnest(p_days) as d) = 0 then null
    when (select count(distinct d) from unnest(p_days) as d where d between 1 and 7) = 7
      then 'Tous les jours'
    else (
      select upper(left(liste, 1)) || substr(liste, 2)
      from (
        select string_agg(nom, ' ou ' order by rang) as liste
        from (
          select d as rang,
            (array['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])[d] as nom
          from (select distinct unnest(p_days) as d) as u
          where d between 1 and 7
        ) as j
      ) as s
    )
  end;
$$;

comment on function public.jours_francais(smallint[]) is
  'Les jours d''intention nommés pour une question : « Mardi ou jeudi » (C2.1). Jumelle de '
  'joursDeLaQuestion (src/types/checkin.ts) — à toucher ensemble. Distincte de '
  'formatIntentionDays, qui rappelle un engagement (« le mardi et le jeudi ») au lieu de '
  'l''interroger.';

revoke execute on function public.jours_francais(smallint[]) from public, anon, authenticated;

-- ── 2. Le gabarit de question, sur le référentiel d'actions ─────────────────────────────
-- Une ligne par gabarit, et **pas de contrainte `not null`** : C3.8 reprend ce référentiel, et une
-- contrainte obligerait à écrire la copie avant de l'avoir. C'est un test pgTAP qui garde le point
-- (`v1-14` §4.2), même idiome que « tout mode a une source » pour `emission_factor_sources`.

alter table public.action_templates add column if not exists question_template text;

comment on column public.action_templates.question_template is
  'La question du point quand cette action est engagée (C2.1). Deux marques : {jours} pour les '
  'jours d''intention (boucle hebdomadaire) et {mois} pour le mois écoulé (boucle mensuelle). '
  'Un gabarit sans question_template ferait retomber le point sur la question générique, en '
  'silence — un test pgTAP interdit le nul.';

-- **L'appariement se fait sur `action_text`, jamais sur l'identifiant.** `action_templates.id`
-- vaut `gen_random_uuid()` : les douze lignes portent des identifiants **différents** sur chaque base
-- construite depuis `supabase/migrations/`. Des uuid en dur ici s'apparient au projet distant, où ils
-- ont été relevés, et à **rien** en CI — ce qui a fait tomber la CI de la vague 5 sur le contrôle
-- ci-dessous (les douze `question_template` restaient nuls). C'est exactement l'avertissement de
-- l'outil de migration : aucune référence en dur à un identifiant généré.
--
-- `action_text` est la clé naturelle du référentiel : les douze libellés sont distincts, et
-- `20260905130000` les insère littéralement. Un libellé mal recopié n'apparierait rien — et c'est le
-- contrôle de la §7 qui l'attrape, puisqu'il refuse le moindre `question_template` nul. C3.8
-- reformulera plusieurs de ces libellés, sans conséquence : une migration se rejoue dans l'ordre,
-- donc celle-ci voit toujours le référentiel d'avant C3.8.
update public.action_templates set question_template = v.modele
from (values
  -- Trajet domicile-travail : la question nomme les jours choisis.
  ('Garder une journée de télétravail par semaine', '{jours}, as-tu travaillé depuis chez toi ?'),
  ('Faire ce trajet à deux au moins un jour sur deux', '{jours}, as-tu fait ce trajet à deux ?'),
  ('Faire un trajet sur cinq à pied', '{jours}, as-tu fait ce trajet à pied ?'),
  ('Faire un trajet sur cinq à vélo', '{jours}, as-tu fait ce trajet à vélo ?'),
  ('Passer deux trajets sur cinq en métro ou en tram', '{jours}, as-tu fait ce trajet en métro ou en tram ?'),
  ('Passer deux trajets sur cinq en train ou en RER', '{jours}, as-tu fait ce trajet en train ou en RER ?'),
  -- Loisirs et voyages : la boucle est mensuelle, il n'y a pas de jour à nommer — la question
  -- ouvre sur le mois écoulé et demande si l'occasion s'est présentée.
  ('Regrouper deux sorties en une seule, une fois sur cinq', 'En {mois}, as-tu regroupé deux sorties en une ?'),
  ('Faire une sortie sur trois à vélo', 'En {mois}, as-tu fait une sortie à vélo ?'),
  ('Prendre les transports en commun pour deux sorties sur cinq', 'En {mois}, as-tu pris les transports en commun pour une sortie ?'),
  ('Faire un de tes longs trajets en train plutôt qu''en voiture', 'En {mois}, as-tu fait un long trajet en train plutôt qu''en voiture ?'),
  ('Renoncer à un vol long-courrier cette année', 'En {mois}, as-tu eu un déplacement où tu as choisi autre chose que l''avion ?'),
  ('Remplacer un aller-retour en avion par le train', 'En {mois}, as-tu remplacé un vol par le train ?')
) as v(libelle, modele)
where public.action_templates.action_text = v.libelle;

-- ── 3. Les quatre genres, et les colonnes figées ────────────────────────────────────────

alter table public.engagement_checkins
  drop constraint if exists engagement_checkins_question_kind_check;

-- `changement` devient `generique` : même repli, nom plus juste. Fait **avant** de reposer la
-- contrainte, sinon les lignes existantes la violent.
update public.engagement_checkins set question_kind = 'generique' where question_kind = 'changement';

alter table public.engagement_checkins
  alter column question_kind set default 'generique',
  add constraint engagement_checkins_question_kind_check
    check (question_kind in ('engagement', 'generique', 'maintien', 'occasion'));

alter table public.engagement_checkins
  add column if not exists committed_action_text text,
  add column if not exists committed_intention_days smallint[],
  add column if not exists committed_intention_timing text,
  add column if not exists committed_question text;

-- `drop ... if exists` d'abord, comme les deux contraintes ci-dessus : une migration de ce dépôt doit
-- pouvoir être rejouée telle quelle après une restauration, et un `add constraint` nu lève un 42710
-- au second passage. Relevé en rejouant ce fichier sur le distant pour corriger l'appariement des
-- gabarits.
alter table public.engagement_checkins
  drop constraint if exists engagement_checkins_committed_days_valides;
alter table public.engagement_checkins
  add constraint engagement_checkins_committed_days_valides
    check (public.check_intention_days(committed_intention_days));

comment on column public.engagement_checkins.committed_question is
  'La question telle qu''elle a été posée, figée à la génération (C2.1). Recomposable par '
  'public.checkin_question, et figée quand même : c''est la seule garantie que la carte affiche '
  'mot pour mot ce que la notification a envoyé, y compris si la composition change de version.';

comment on column public.engagement_checkins.committed_action_text is
  'Le libellé de l''action engagée au moment de la génération (C2.1), figé comme trip_label : '
  'changer d''action le mercredi ne réécrit pas une question posée le lundi.';

-- ── 4. La composition, en un seul endroit ───────────────────────────────────────────────
-- Jumelle de `composerQuestionDuPoint` (`src/types/checkin.ts`), épinglée des deux côtés sur la
-- même table de cas — même mécanique que `reminder_channel_for` / `src/types/rappels.ts`.

create or replace function public.checkin_question(
  p_loop_type text,
  p_question_kind text,
  p_poste text,
  p_mode text,
  p_period_start date,
  p_question_template text default null,
  p_intention_days smallint[] default null
)
returns text
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  v_ouverture text;
  v_mois text;
  v_jours text;
begin
  -- L'ouverture interroge la période **écoulée** (C2.3), et le mois vient de `period_start` et
  -- jamais de l'horloge : un cron passé avec un jour de retard nommerait sinon le mois courant.
  v_mois := public.mois_francais(p_period_start);
  v_ouverture := case
    when p_loop_type = 'commute' then 'La semaine dernière'
    when v_mois is null then 'Le mois dernier'
    else 'En ' || v_mois
  end;

  -- 1. Le maintien gagne sur tout (cf. l'en-tête).
  --
  -- **L'apostrophe est typographique (’), et ce n'est pas de la coquetterie.** Depuis C2.5 le SQL
  -- écrivait « s'est-il » et le client « s’est-il » : invisible à l'œil, mais les deux moitiés de la
  -- paire ne pouvaient plus être comparées caractère par caractère, donc la garde qui existe pour
  -- attraper leur dérive ne pouvait pas porter sur la phrase entière. Toute la copie du produit
  -- utilise l'apostrophe typographique ; l'email s'y aligne.
  if p_question_kind = 'maintien' then
    return v_ouverture || ', ton trajet s’est-il fait '
      || public.complement_de_maintien(p_mode) || ' ?';
  end if;

  -- 2 et 3. Une action engagée, donc un gabarit. Sans gabarit on retombe sur le générique plutôt
  -- que de rendre une phrase à trous : un `{jours}` affiché tel quel serait pire que vague.
  if p_question_kind in ('engagement', 'occasion') and p_question_template is not null then
    v_jours := public.jours_francais(p_intention_days);
    return replace(
      replace(p_question_template, '{mois}', coalesce(v_mois, 'ce mois')),
      '{jours}',
      coalesce(v_jours, 'Cette semaine')
    );
  end if;

  -- 4. Le générique : le poste par sa **forme insérable**, jamais par `trip_label`, qui porte le
  -- mode entre parenthèses (C2.6).
  return v_ouverture || ', as-tu changé de mode de transport pour '
    || public.poste_inserable(p_poste, p_loop_type) || ' ?';
end;
$$;

comment on function public.checkin_question(text, text, text, text, date, text, smallint[]) is
  'La question d''un point, composée en un seul endroit (C2.1). Jumelle de '
  'composerQuestionDuPoint (src/types/checkin.ts) — à toucher ensemble, le rappel partant sans '
  'le client. L''ordre de priorité des genres est épinglé par un test : maintien, puis '
  'engagement/occasion, puis générique.';

revoke execute on function public.checkin_question(text, text, text, text, date, text, smallint[])
  from public, anon, authenticated;

-- ── 5. Les générateurs figent l'engagement ──────────────────────────────────────────────
-- Repris de leur **état installé** (`pg_get_functiondef`) et non du fichier qui les a créés : c'est
-- la leçon de C2.2, où repartir de la migration d'origine a supprimé en silence trois gardes
-- ajoutées depuis. Ici ce qui doit survivre est tout C2.3 (la période écoulée), tout C2.5 (le
-- maintien, la base déclarée des extras) et le `nulls last` de C2.2.
--
-- **L'action engagée est cherchée sur le cycle qui couvre la période interrogée**, et non sur le
-- cycle courant : le point du lundi porte sur la semaine écoulée, et au changement de saison cette
-- semaine-là peut appartenir au cycle précédent. Demander « as-tu tenu ton engagement » à propos
-- d'une semaine où un autre engagement courait serait une question fausse.
--
-- Et elle est appariée **par poste** et non par boucle : la boucle `extras` couvre indifféremment
-- les loisirs et les voyages, donc une action de loisirs ne doit pas nommer la question d'un point
-- de voyages. `at.poste = ar.extras_poste` ferme ce cas.

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
  select distinct on (a.user_id)
    a.user_id, 'commute', v_period_start, v_period_label, ar.commute_poste_label, 'commute',
    g.genre, ar.commute_poste_mode,
    eng.action_text, eng.intention_days, eng.intention_timing,
    public.checkin_question('commute', g.genre, 'commute', ar.commute_poste_mode, v_period_start,
                            eng.question_template, eng.intention_days)
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  left join public.transport_modes tm on tm.id = ar.commute_poste_mode
  left join lateral (
    select pa.intention_days, pa.intention_timing, t.action_text, t.question_template
    from public.plan_actions pa
    join public.plan_cycles pc on pc.id = pa.plan_cycle_id
    join public.action_templates t on t.id = pa.action_template_id
    where pc.user_id = a.user_id
      and pa.committed_at is not null
      and t.poste = 'commute'
      and v_period_start between pc.period_start and pc.period_end
    order by pa.committed_at desc
    limit 1
  ) eng on true
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
  select distinct on (a.user_id)
    a.user_id, 'extras', v_period_start, v_period_label, ar.extras_poste_label, ar.extras_poste,
    g.genre,
    eng.action_text, eng.intention_days, eng.intention_timing,
    public.checkin_question('extras', g.genre, ar.extras_poste, null, v_period_start,
                            eng.question_template, eng.intention_days)
  from public.assessments a
  join public.assessment_results ar on ar.assessment_id = a.id
  join public.assessment_answers ans on ans.assessment_id = a.id
  left join lateral (
    select pa.intention_days, pa.intention_timing, t.action_text, t.question_template
    from public.plan_actions pa
    join public.plan_cycles pc on pc.id = pa.plan_cycle_id
    join public.action_templates t on t.id = pa.action_template_id
    where pc.user_id = a.user_id
      and pa.committed_at is not null
      and t.poste = ar.extras_poste
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
    )
  order by a.user_id, a.submitted_at desc nulls last
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$function$;

revoke execute on function public.generate_extras_checkins() from public, anon, authenticated;

-- ── 6. La mise en file lit la question figée ────────────────────────────────────────────
-- Reprise de son état installé (C2.9 compris : la décroissance, le jeton de désinscription,
-- l'étalement). Deux changements seulement.
--
-- **Elle ne compose plus rien** : la question est figée sur la ligne, et c'est ce qui garantit que
-- l'email et la carte disent mot pour mot la même chose. Le `coalesce` ne sert qu'aux points
-- générés avant cette migration, et il repasse par la **même** fonction de composition.
--
-- **Le sujet passe en tête de la notification** (A12-21) : Android ne montre que le titre et le
-- début du corps, et « La semaine dernière, as-tu changé… » ne dit pas de quoi on parle avant
-- d'avoir déplié. Écart assumé au canvas, qui écrit « Ton trajet domicile-travail : mardi ou jeudi,
-- **l'**as-tu fait à vélo ? » : pronominaliser demande une seconde phrase écrite à la main par
-- gabarit, donc une seconde copie de la question qui peut diverger — exactement ce que C2.5 a
-- retiré. Le poste est donc posé en **étiquette**, séparé par un point médian, et la question suit
-- mot pour mot.

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
    user_id, checkin_id, channel, recipient_email, subject, body, push_body, send_after,
    unsubscribe_token
  )
  select
    c.user_id,
    c.id,
    ch.canal,
    case when u.is_anonymous = false and u.email_confirmed_at is not null then u.email end,
    case c.loop_type
      when 'commute' then 'Ton point de la semaine'
      else 'Ton point du mois'
    end,
    'Bonjour,' || E'\n\n'
      || 'Une seule question, comme d''habitude : ' || q.question || E'\n\n'
      || 'Réponds-moi en un geste : ' || v_app_url || '/plan?rappel=1' || E'\n\n'
      || 'Si tu n''as rien changé, ce n''est pas grave — on se repose la question au prochain point.' || E'\n\n'
      || '— Ramille' || E'\n\n'
      || 'Pour ne plus recevoir ces rappels : ' || v_app_url || '/rappels/stop?jeton='
      || o.unsubscribe_token::text || E'\n'
      || 'Tu peux aussi choisir ton canal depuis « Toi » dans l''app.',
    -- Le poste en étiquette, puis la question mot pour mot (cf. l'en-tête de cette section) —
    -- **mais seulement quand la question ne le nomme pas déjà.** La question générique finit par
    -- « … pour ton trajet domicile-travail ? » : la préfixer donnerait « Ton trajet domicile-travail ·
    -- La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ? ».
    -- Les questions d'engagement, d'occasion et de maintien, elles, ne nomment que l'action ou
    -- l'habitude — c'est là que l'étiquette porte l'information qui manque.
    case when position(e.etiquette in q.question) > 0
      then upper(left(q.question, 1)) || substr(q.question, 2)
      else upper(left(e.etiquette, 1)) || substr(e.etiquette, 2)
        || ' · ' || upper(left(q.question, 1)) || substr(q.question, 2)
    end,
    case when ch.canal = 'push' then now()
         else now() + make_interval(days =>
           (('x' || substr(md5(c.user_id::text), 1, 7))::bit(28)::int % 5))
    end,
    o.unsubscribe_token
  from public.engagement_checkins c
  join auth.users u on u.id = c.user_id
  cross join lateral (select public.reminder_channel_for(c.user_id) as canal) ch
  cross join lateral (select public.regime_de_rappel(c.user_id, c.loop_type) as regime) r
  cross join lateral (
    -- La question figée, ou recomposée pour une ligne d'avant C2.1 — par la **même** fonction.
    select coalesce(
      c.committed_question,
      public.checkin_question(c.loop_type, c.question_kind, c.poste, c.mode, c.period_start)
    ) as question
  ) q
  cross join lateral (select public.poste_inserable(c.poste, c.loop_type) as etiquette) e
  cross join lateral (select gen_random_uuid() as unsubscribe_token) o
  where c.status = 'pending'
    and ch.canal is not null
    and r.regime <> 'silence'
    and (
      r.regime = 'normal'
      or not exists (
        select 1 from public.notification_outbox o2
        where o2.user_id = c.user_id
          and o2.created_at >= date_trunc('month', now())
      )
    )
  on conflict (checkin_id) do nothing;
end;
$function$;

revoke execute on function public.enqueue_checkin_reminders() from public, anon, authenticated;

-- ── 7. Contrôles ────────────────────────────────────────────────────────────────────────

do $controle$
begin
  if exists (select 1 from public.action_templates where question_template is null) then
    raise exception 'Un gabarit d''action n''a pas de question_template.';
  end if;

  if exists (select 1 from public.engagement_checkins where question_kind = 'changement') then
    raise exception 'Des points portent encore le genre « changement ».';
  end if;

  -- La priorité des genres, sur le cas qui compte : un cycliste engagé sur une action de trajet
  -- reçoit la question de maintien, pas celle de l'engagement.
  if public.checkin_question('commute', 'maintien', 'commute', 'velo', current_date - 7,
                             '{jours}, as-tu fait ce trajet à vélo ?', array[2, 4]::smallint[])
     <> 'La semaine dernière, ton trajet s’est-il fait à vélo ?' then
    raise exception 'Le maintien ne gagne plus sur l''engagement.';
  end if;

  if public.checkin_question('commute', 'engagement', 'commute', 'voiture_thermique', current_date - 7,
                             '{jours}, as-tu fait ce trajet à vélo ?', array[2, 4]::smallint[])
     <> 'Mardi ou jeudi, as-tu fait ce trajet à vélo ?' then
    raise exception 'La question d''engagement ne nomme pas les jours comme attendu.';
  end if;

  if public.jours_francais(array[1,2,3,4,5,6,7]::smallint[]) <> 'Tous les jours' then
    raise exception 'Sept jours ne se disent pas « Tous les jours ».';
  end if;
end
$controle$;
