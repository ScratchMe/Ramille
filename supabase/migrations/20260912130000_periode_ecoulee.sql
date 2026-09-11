-- v1-13, chantier C2.3 — le point interroge la période **écoulée**, pas celle qui commence.
-- Arbitrage D2 (rendu le 10/09/2026). Constats A13-1, A5-11, A8-17.
--
-- ## Le défaut
--
-- La boucle hebdo est générée le lundi 6 h UTC **pour la semaine qui commence**, le push part à
-- `now()`, et la question demande « as-tu changé de mode de transport au moins une fois cette
-- semaine ». Au moment où le téléphone sonne, la semaine a quelques heures et aucun trajet n'a
-- eu lieu. La seule réponse honnête est « Non », et elle déclenche la consolation.
--
-- Idem pour la boucle mensuelle, générée le 1er à 6 h pour « ce mois-ci ».
--
-- ## Ce qui change, et ce qui ne change pas
--
-- Change : `period_start` recule d'une période, les libellés suivent, et la question passe au
-- passé — « La semaine dernière, … » / « En septembre, … », le mois écoulé étant **nommé**
-- (correction du canvas, qui écrivait « Ce mois-ci » — `v1-14` §10).
--
-- **Ne change pas : le moment d'envoi.** Le cron reste lundi 6 h et le 1er à 6 h, l'étalement du
-- `send_after` reste (v1-12 §2.8, rappelé par le « Ne pas faire » du chantier). C'est la période
-- interrogée qui recule, pas l'heure du réveil.
--
-- ## La transition, et pourquoi elle est propre
--
-- Le lundi qui suit cette migration, `v_period_start` vaut le lundi **précédent** — c'est-à-dire
-- exactement la clé du point que l'ancien schéma avait créé sept jours plus tôt. Trois
-- conséquences, toutes voulues :
--
--   1. `on conflict (user_id, loop_type, period_start) do nothing` ne crée pas de doublon ;
--   2. l'expiration (`period_start < v_period_start`) ne le touche pas : il reste `pending`, donc
--      visible sur le plan — et il se trouve qu'il porte désormais la bonne période, puisque la
--      semaine qu'il nommait vient de s'écouler ;
--   3. `unique(checkin_id)` sur la boîte d'envoi empêche un second message pour ce point.
--
-- Autrement dit : une cohorte ne reçoit **pas** de message ce lundi-là, et sa question de la
-- semaine précédente devient correcte au lieu d'être prématurée. Aucun point perdu, aucun
-- doublon, aucun message au mauvais temps. La semaine suivante, le régime est nominal.

-- ── 1. Le mois en français, écrit une fois ──────────────────────────────────────────────
-- Le tableau des douze mois vivait en `constant text[]` dans `generate_extras_checkins`, et la
-- question du rappel doit maintenant le nommer aussi. Deux copies d'une liste de douze chaînes
-- divergent par une faute de frappe que personne ne relit — d'où la fonction.

create or replace function public.mois_francais(d date)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select (array['janvier','février','mars','avril','mai','juin',
                'juillet','août','septembre','octobre','novembre','décembre'])
         [extract(month from d)::int];
$$;

comment on function public.mois_francais(date) is
  'Le nom du mois en français. Écrit une fois : le libellé de période de la boucle mensuelle et '
  'la question du rappel le nomment tous les deux depuis C2.3.';

revoke execute on function public.mois_francais(date) from public, anon, authenticated;

-- ── 2. La boucle hebdomadaire interroge la semaine écoulée ──────────────────────────────

create or replace function public.generate_commute_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  -- **Le lundi précédent**, et non celui qui commence : c'est la semaine sur laquelle la
  -- personne peut répondre quelque chose. Le cron, lui, ne bouge pas (v1-12 §2.8).
  v_period_start date := date_trunc('week', now())::date - 7;
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

-- ── 3. La boucle mensuelle interroge le mois écoulé ─────────────────────────────────────

create or replace function public.generate_extras_checkins()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  -- Le mois **précédent**. `date_trunc` puis soustraction d'un mois : gère décembre → janvier et
  -- les longueurs de mois, ce qu'une soustraction en jours ne ferait pas.
  v_period_start date := (date_trunc('month', now()) - interval '1 month')::date;
  v_period_label text := public.mois_francais(v_period_start)
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

-- ── 4. La question, au passé ────────────────────────────────────────────────────────────
-- Forme retenue par le canvas (`v1-14` §3.2, planches A2a et A2b) : la période **ouvre** la
-- phrase, au lieu d'être glissée au milieu.
--
--     « La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ? »
--     « En septembre, as-tu changé de mode de transport pour tes voyages ? »
--
-- Deux points sur le libellé de la période :
--
--   * la boucle mensuelle **nomme le mois écoulé** plutôt que de dire « le mois dernier » : le
--     point du 1er novembre parle d'octobre, et le dire lève l'ambiguïté du message reçu avec un
--     jour de retard ;
--   * « au moins une fois » disparaît. La question porte déjà sur une période fermée ; la
--     précision alourdissait une phrase que la notification doit tenir en deux lignes.
--
-- Le reste de la fonction (canal, repli, adresse, étalement du `send_after`, `on conflict
-- (checkin_id)`) est repris à l'identique de C2.6 — la garantie anti-relance ne bouge pas.

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
      || ', as-tu changé de mode de transport pour '
      || public.poste_inserable(c.poste, c.loop_type) || ' ?' as question
  ) q
  where c.status = 'pending'
    and ch.canal is not null
  on conflict (checkin_id) do nothing;
end;
$function$;

revoke execute on function public.enqueue_checkin_reminders() from public, anon, authenticated;
