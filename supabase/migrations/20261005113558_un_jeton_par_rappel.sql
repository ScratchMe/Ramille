-- **Un jeton de désinscription par rappel, quel que soit le plan** (incident du 05/10/2026).
--
-- Le générateur des points de la semaine (`generate-commute-checkins`, lundi 06:00 UTC) a échoué
-- ce matin-là sur `notification_outbox_unsubscribe_token` : deux rappels mis en file par la même
-- exécution portaient le même jeton. L'échec annulant toute la transaction du générateur, aucun
-- point de la semaine n'a été créé, pour personne.
--
-- La cause est dans `enqueue_checkin_reminders`, depuis `20260912170000` : le jeton venait de
-- `cross join lateral (select gen_random_uuid() as unsubscribe_token) o`, une sous-requête qui ne
-- nomme **aucune** colonne de la ligne. Rien n'oblige alors Postgres à la réévaluer : il peut la
-- placer **à l'extérieur** de la boucle de jointure et la calculer une fois pour toute
-- l'instruction. C'est le plan que le distant a choisi ce matin (`Nested Loop -> Result -> Hash
-- Join`), et ce n'était pas celui de la CI, où le `Result` restait à l'intérieur, réévalué à chaque
-- ligne. Le choix tient aux statistiques : il bascule en local dès quelques points en attente sur
-- une table analysée. Tant qu'une exécution ne mettait en file qu'un rappel, un jeton unique pour
-- l'instruction ne se voyait pas : les passages des 21 et 28/09 et du 01/10 en ont mis un chacun
-- (relu dans `notification_outbox`), et ce lundi-là il en fallait plusieurs.
--
-- **La sous-requête nomme maintenant la ligne** (`c.id as checkin_id`), et l'insertion lit cette
-- colonne-là. Une sous-requête latérale qui dépend de la ligne se réévalue pour chaque ligne — le
-- plan n'a plus le choix —, et Postgres ne la fond jamais dans la requête englobante parce qu'elle
-- porte une fonction volatile : le jeton est donc tiré une fois par ligne, et le corps du message
-- et la colonne lisent la même valeur. Ce qui attache la sous-requête à la ligne est la référence
-- latérale, relevée avant que l'optimiseur n'élague les colonnes : une version où l'insertion lit
-- `c.id` se comporte pareil (mesuré en local le 05/10/2026, Postgres 17.6 comme le distant), et
-- `explain verbose` y montre `Output: NULL::uuid, gen_random_uuid()` — la colonne non lue est déjà
-- remplacée par un nul, et le `Result` reste dans la boucle. L'insertion lit tout de même
-- `o.checkin_id` : la référence à la ligne figure alors dans l'expression même que le `Result`
-- calcule, et ne tient plus à l'ordre de deux étapes de l'optimiseur.
--
-- Le reste du corps est celui du distant (`pg_get_functiondef`, 05/10/2026), à l'identique.
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
    o.checkin_id,
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
  -- Un jeton par ligne : la sous-requête nomme la ligne, donc elle se réévalue pour chacune
  -- (incident du 05/10/2026, `v1-27` §12.37).
  cross join lateral (select c.id as checkin_id, gen_random_uuid() as unsubscribe_token) o
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
