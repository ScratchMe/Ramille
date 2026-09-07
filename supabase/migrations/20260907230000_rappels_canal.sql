-- v1-12, PR 1 — le rappel devient un canal : notification, email, ou rien.
-- Réf. docs/architecture/v1-12-rappels.md §3 et §4.
--
-- ── Ce que cette migration change, et ce qu'elle ne change pas ─────────────────────────
-- Elle ne touche **pas** à la garantie anti-relance de la spec §7 : `unique(checkin_id)`
-- reste la contrainte, un point ne peut donner lieu qu'à un seul message. Le canal en
-- devient une colonne, et le repli push → email est une **mise à jour de la même ligne**,
-- jamais une seconde. C'est le point le plus facile à casser en croyant bien faire.
--
-- Elle ne rend rien envoyable non plus : sans identifiants FCM sur expo.dev, les jetons
-- s'enregistrent et Expo refuse l'envoi. Cette PR pose la base et le réglage ; le natif
-- (expo-notifications, la feuille, la carte d'attente) vient dans la suivante.

-- ── 1. La préférence : trois états, plus un booléen ────────────────────────────────────
-- `email_reminders_enabled` ne peut plus dire ce qu'il faut dire : avec deux canaux, le
-- « non » de l'email n'est pas le « non » du rappel. Une colonne à trois valeurs plutôt que
-- deux booléens — deux booléens autorisent « push et email », qui n'existe pas (un point,
-- un message).
--
-- Le défaut est `'email'` et non `'push'` : sans jeton, `'push'` retombe de toute façon sur
-- l'email (§3), mais il ferait afficher « les notifications sont coupées sur ce téléphone »
-- à quelqu'un à qui on n'a jamais rien demandé.
alter table public.profiles
  add column reminder_channel text not null default 'email'
  check (reminder_channel in ('push', 'email', 'none'));

update public.profiles
set reminder_channel = case when email_reminders_enabled then 'email' else 'none' end;

comment on column public.profiles.reminder_channel is
  'Canal de rappel choisi : push (notification sur l''appareil), email, ou none. La résolution du canal *effectif* est dans reminder_channel_for() — une préférence push sans jeton actif retombe sur l''email.';

-- Supprimée dans la même migration : aucune app n'est sur Play, les seuls builds natifs
-- sont des APK de test, et faire coexister deux colonnes dont une n'est plus lue, c'est
-- exactement la colonne morte de `profiles` déjà supprimée une fois (20260905180000).
alter table public.profiles drop column email_reminders_enabled;

-- ── 2. Les jetons d'appareil ───────────────────────────────────────────────────────────
-- Le renversement de ce chantier : **le push n'a pas besoin de compte.** Un jeton suffit,
-- donc une session anonyme peut recevoir un rappel là où l'email en était incapable.
create table public.push_tokens (
  -- Le jeton est la clé : il identifie un appareil, et un appareil appartient à qui est
  -- connecté dessus — pas l'inverse. Unicité sur le jeton, jamais sur l'utilisateur, qui
  -- peut en avoir plusieurs (v1-10 §3.4).
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Désactivé plutôt que supprimé : `DeviceNotRegistered` renvoyé par Expo, ou permission
  -- retirée dans les réglages du téléphone. Garder la ligne évite de réenregistrer en
  -- boucle un jeton que le service a déjà refusé.
  disabled_at timestamptz,
  disabled_reason text
);

create index push_tokens_actifs_idx on public.push_tokens (user_id) where disabled_at is null;

alter table public.push_tokens enable row level security;

-- Lecture et suppression pour le propriétaire : l'app doit pouvoir dire « ce téléphone
-- est-il joignable ? » et la personne doit pouvoir retirer un appareil. Aucune policy
-- INSERT ni UPDATE — l'enregistrement passe par le RPC ci-dessous, pour la raison dite là.
create policy "push_tokens select own" on public.push_tokens
  for select to authenticated using (user_id = auth.uid());

create policy "push_tokens delete own" on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

-- **Pourquoi un RPC et pas une policy INSERT.** Sur un nouvel appareil, la session anonyme A
-- enregistre le jeton, puis le lien de connexion la remplace par le compte B. Le jeton
-- appartient alors à B, mais une policy owner-scoped interdirait à B de toucher la ligne de
-- A : le jeton resterait au nom d'un utilisateur fantôme et les rappels partiraient dans le
-- vide, sans erreur. La reprise du jeton est donc faite ici, propriété vérifiée à
-- l'intérieur (v1-10 §3.4).
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'Aucune session.' using errcode = 'insufficient_privilege';
  end if;

  if p_token is null or length(p_token) < 10 or length(p_token) > 255 then
    raise exception 'Jeton invalide.' using errcode = 'check_violation';
  end if;

  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
    set user_id = auth.uid(),
        platform = excluded.platform,
        last_seen_at = now(),
        disabled_at = null,
        disabled_reason = null;
end;
$$;

-- Le pendant : la permission a été retirée depuis les réglages du téléphone. On désactive
-- plutôt que de supprimer, pour que le serveur retombe sur l'email au prochain point au
-- lieu d'envoyer dans le vide.
create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.push_tokens
  set disabled_at = now(), disabled_reason = 'permission retirée'
  where token = p_token and user_id = auth.uid() and disabled_at is null;
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ── 3. La boîte d'envoi gagne un canal ─────────────────────────────────────────────────
alter table public.notification_outbox
  add column channel text not null default 'email' check (channel in ('email', 'push')),
  -- Le corps de la notification : le titre plus la question, rien d'autre. Android replie à
  -- deux lignes. Rangé à part de `body` (l'email complet, signé) plutôt que de choisir l'un
  -- ou l'autre à la mise en file : le repli push → email doit pouvoir se faire sans
  -- reconstruire un texte, sinon il faudrait resnapshotter au moment de l'envoi et le
  -- message ne serait plus celui figé à la génération.
  add column push_body text,
  -- Les tickets rendus par Expo, en table de correspondance {id du ticket: jeton}. C'est ce
  -- qui permet aux reçus (§5) de désactiver le **bon** jeton : la réponse des reçus ne
  -- porte que des identifiants de ticket.
  add column provider_ticket jsonb,
  add column receipts_checked_at timestamptz;

-- Null pour un rappel push vers une session anonyme, qui n'a aucune adresse.
alter table public.notification_outbox alter column recipient_email drop not null;

comment on column public.notification_outbox.channel is
  'Canal effectif de ce message. Le repli push -> email met à jour cette colonne sur la même ligne : un point, un message, jamais deux (unique(checkin_id)).';

-- ── 4. La résolution du canal ──────────────────────────────────────────────────────────
-- **La seule logique de ce chantier**, et elle est écrite deux fois : ici pour ce qui part
-- vraiment, et dans `src/types/rappels.ts` pour ce que la carte d'attente et « Toi »
-- affichent. Un test de chaque côté épingle exactement les mêmes lignes — même risque que
-- `estimate_action_savings` / `assessment_results`, deux implémentations d'une même règle
-- divergent le jour où l'une bouge seule.
--
-- Le serveur ne connaît pas la permission Android : il connaît l'existence d'un **jeton
-- actif**, qui en est la trace. Une préférence `push` sans jeton ne se dégrade jamais
-- d'elle-même en base — c'est ce qui fait que rouvrir les notifications dans les réglages du
-- téléphone suffit à faire repartir le push, sans que la personne ait à retoucher quoi que
-- ce soit.
create or replace function public.reminder_channel_for(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when p.reminder_channel = 'none' then null
    when p.reminder_channel = 'push' and exists (
      select 1 from public.push_tokens t
      where t.user_id = p.id and t.disabled_at is null
    ) then 'push'
    when u.is_anonymous = false
      and u.email is not null
      and u.email_confirmed_at is not null then 'email'
    else null
  end
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user_id;
$$;

revoke execute on function public.reminder_channel_for(uuid) from public, anon, authenticated;

-- ── 5. La mise en file ─────────────────────────────────────────────────────────────────
-- Une ligne par point, quel que soit le canal. L'étalement sur cinq jours ne concerne que
-- l'email : il existe pour ménager le plafond journalier de l'expéditeur, pas par choix
-- produit. Le push part le matin même où la question s'ouvre — c'est ce qui autorise Ramille
-- à dire « lundi » et à tenir parole.
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
      || ' pour ' || c.trip_label || ' ?' as question
  ) q
  where c.status = 'pending'
    and ch.canal is not null
  on conflict (checkin_id) do nothing;
end;
$function$;

-- Le repli, extrait pour être appelé aux deux endroits où le push échoue — et pour que la
-- règle tienne en un seul endroit : **on met à jour la ligne, on n'en crée jamais une
-- seconde.** `unique(checkin_id)` l'interdirait de toute façon ; l'écrire ainsi fait que la
-- contrainte n'a jamais à se déclencher.
create or replace function public.replier_rappel_sur_email(p_outbox_id uuid, p_raison text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.notification_outbox
  set channel = case when recipient_email is not null then 'email' else channel end,
      status = case when recipient_email is not null then 'pending' else 'failed' end,
      send_after = now(),
      last_error = 'push : ' || p_raison
        || case when recipient_email is not null then ' — repli sur l''email' else ' — aucun repli possible' end
  where id = p_outbox_id;
end;
$$;

revoke execute on function public.replier_rappel_sur_email(uuid, text) from public, anon, authenticated;

-- ── 6. L'envoi ─────────────────────────────────────────────────────────────────────────
-- Deux transports, une seule file. Le corps de requête suit l'API Expo Push
-- (`POST /--/api/v2/push/send`), choix isolé dans cette seule fonction comme l'est Resend.
--
-- Le jeton d'accès Expo n'est joint que s'il existe dans Vault : sans la sécurité renforcée
-- activée sur expo.dev, l'envoi passe sans en-tête. Avec elle, un envoi sans jeton est
-- refusé — les deux vont donc ensemble, et c'est dit dans v1-12 §7.
create or replace function public.send_pending_reminders()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_api_key text;
  v_from text;
  v_expo_token text;
  v_response extensions.http_response;
  v_headers extensions.http_header[];
  v_tokens text[];
  v_data jsonb;
  v_tickets jsonb;
  rec record;
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets where name = 'resend_api_key';

  select decrypted_secret into v_from
  from vault.decrypted_secrets where name = 'reminder_from_address';

  select decrypted_secret into v_expo_token
  from vault.decrypted_secrets where name = 'expo_access_token';

  -- Avant tout test de configuration : qu'un rappel soit caduc est une vérité sur les
  -- données, pas une étape d'expédition (cf. 20260907090000).
  update public.notification_outbox o
  set status = 'cancelled'
  from public.engagement_checkins c
  where c.id = o.checkin_id
    and o.status = 'pending'
    and c.status <> 'pending';

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

  for rec in
    select * from public.notification_outbox
    where status = 'pending' and attempts < 3 and send_after <= now()
    order by send_after, created_at
    limit 100
  loop
    begin
      if rec.channel = 'push' then
        select array_agg(t.token) into v_tokens
        from public.push_tokens t
        where t.user_id = rec.user_id and t.disabled_at is null;

        if v_tokens is null then
          -- Plus aucun appareil joignable : repli immédiat, sans consommer de tentative.
          perform public.replier_rappel_sur_email(rec.id, 'aucun jeton actif');
          continue;
        end if;

        v_headers := array[extensions.http_header('accept', 'application/json')];
        if v_expo_token is not null then
          v_headers := v_headers || extensions.http_header('Authorization', 'Bearer ' || v_expo_token);
        end if;

        select * into v_response from extensions.http((
          'POST',
          'https://exp.host/--/api/v2/push/send',
          v_headers,
          'application/json',
          jsonb_build_object(
            'to', to_jsonb(v_tokens),
            'title', rec.subject,
            'body', rec.push_body,
            'channelId', 'rappels',
            'data', jsonb_build_object('url', '/plan')
          )::text
        )::extensions.http_request);

        if v_response.status between 200 and 299 then
          v_data := (v_response.content::jsonb) -> 'data';

          -- Expo rend un ticket par destinataire, **dans l'ordre de la requête** : c'est le
          -- seul lien entre un refus et le jeton qui l'a causé.
          update public.push_tokens t
          set disabled_at = now(), disabled_reason = 'DeviceNotRegistered'
          from (
            select v_tokens[i] as token, (v_data -> (i - 1)) #>> '{details,error}' as erreur
            from generate_subscripts(v_tokens, 1) as i
          ) d
          where t.token = d.token and d.erreur = 'DeviceNotRegistered';

          select jsonb_object_agg(x.ticket, x.token) into v_tickets
          from (
            select (v_data -> (i - 1)) ->> 'id' as ticket, v_tokens[i] as token
            from generate_subscripts(v_tokens, 1) as i
            where (v_data -> (i - 1)) ->> 'status' = 'ok'
          ) x;

          if v_tickets is not null then
            update public.notification_outbox
            set status = 'sent', sent_at = now(), attempts = attempts + 1,
                last_error = null, provider_ticket = v_tickets
            where id = rec.id;
          else
            -- Tous les appareils ont refusé : l'email prend le relais s'il est possible.
            perform public.replier_rappel_sur_email(rec.id, 'tous les jetons refusés');
          end if;
        else
          update public.notification_outbox
          set status = case when attempts + 1 >= 3 then 'failed' else 'pending' end,
              attempts = attempts + 1,
              last_error = 'HTTP ' || v_response.status || ' — ' || left(coalesce(v_response.content, ''), 300)
          where id = rec.id;
        end if;

      else
        -- Canal email, inchangé — y compris le fait de ne rien tenter sans fournisseur
        -- configuré : les messages restent en attente, rien n'est perdu.
        if v_api_key is null or v_from is null then
          continue;
        end if;

        select * into v_response from extensions.http((
          'POST',
          'https://api.resend.com/emails',
          array[extensions.http_header('Authorization', 'Bearer ' || v_api_key)],
          'application/json',
          jsonb_build_object(
            'from', v_from,
            'to', jsonb_build_array(rec.recipient_email),
            'subject', rec.subject,
            'text', rec.body
          )::text
        )::extensions.http_request);

        if v_response.status between 200 and 299 then
          update public.notification_outbox
          set status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = null
          where id = rec.id;
        else
          update public.notification_outbox
          set status = case when attempts + 1 >= 3 then 'failed' else 'pending' end,
              attempts = attempts + 1,
              last_error = 'HTTP ' || v_response.status || ' — ' || left(coalesce(v_response.content, ''), 300)
          where id = rec.id;
        end if;
      end if;

    exception when others then
      update public.notification_outbox
      set status = case when attempts + 1 >= 3 then 'failed' else 'pending' end,
          attempts = attempts + 1,
          last_error = left(sqlerrm, 300)
      where id = rec.id;
    end;
  end loop;
end;
$function$;

-- ── 7. Les reçus ───────────────────────────────────────────────────────────────────────
-- Expo répond « ticket accepté », pas « notification remise ». Un jeton d'app désinstallée
-- n'est souvent signalé que dans le **reçu**, un quart d'heure plus tard ; continuer à
-- pousser vers des jetons morts dégrade la réputation de l'app auprès de FCM. Petit, mais
-- pas optionnel.
create or replace function public.collect_push_receipts()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_expo_token text;
  v_response extensions.http_response;
  v_headers extensions.http_header[];
  v_map jsonb := '{}'::jsonb;
  v_lignes uuid[] := '{}';
  v_ids text[];
  v_data jsonb;
  rec record;
begin
  select decrypted_secret into v_expo_token
  from vault.decrypted_secrets where name = 'expo_access_token';

  -- Un quart d'heure de décalage : avant, le reçu n'existe pas encore.
  for rec in
    select id, provider_ticket from public.notification_outbox
    where channel = 'push' and status = 'sent'
      and provider_ticket is not null and receipts_checked_at is null
      and sent_at < now() - interval '15 minutes'
    order by sent_at
    limit 100
  loop
    v_map := v_map || rec.provider_ticket;
    v_lignes := v_lignes || rec.id;
  end loop;

  if v_map = '{}'::jsonb then
    return;
  end if;

  select array_agg(k) into v_ids from jsonb_object_keys(v_map) as k;

  v_headers := array[extensions.http_header('accept', 'application/json')];
  if v_expo_token is not null then
    v_headers := v_headers || extensions.http_header('Authorization', 'Bearer ' || v_expo_token);
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

  select * into v_response from extensions.http((
    'POST',
    'https://exp.host/--/api/v2/push/getReceipts',
    v_headers,
    'application/json',
    jsonb_build_object('ids', to_jsonb(v_ids))::text
  )::extensions.http_request);

  if v_response.status between 200 and 299 then
    v_data := (v_response.content::jsonb) -> 'data';

    update public.push_tokens t
    set disabled_at = now(), disabled_reason = 'DeviceNotRegistered (reçu)'
    from (
      select v_map ->> r.key as token
      from jsonb_each(coalesce(v_data, '{}'::jsonb)) as r(key, value)
      where r.value #>> '{details,error}' = 'DeviceNotRegistered'
    ) d
    where t.token = d.token and t.disabled_at is null;

    -- Seulement les lignes dont les tickets viennent d'être demandés : la boucle est bornée
    -- à cent, marquer plus large classerait « vérifiées » des lignes jamais interrogées.
    update public.notification_outbox
    set receipts_checked_at = now()
    where id = any(v_lignes);
  end if;
end;
$function$;

revoke execute on function public.collect_push_receipts() from public, anon, authenticated;

-- Une heure après l'envoi (7h UTC), largement au-delà du quart d'heure d'attente du reçu.
select cron.schedule(
  'collect-push-receipts',
  '0 8 * * *',
  $$select public.collect_push_receipts()$$
);

-- ── 8. L'export ────────────────────────────────────────────────────────────────────────
-- `export_my_data` **énumère** ses tables : une nouvelle table qui n'y est pas ajoutée
-- rend un export silencieusement incomplet.
--
-- Le jeton lui-même n'y figure pas, et c'est délibéré : ce n'est pas une donnée *sur* la
-- personne mais **l'adresse de son téléphone** — quiconque l'a peut lui envoyer une
-- notification. Le mettre dans un fichier qu'elle télécharge crée une exposition sans
-- contrepartie : il ne se réimporte nulle part et meurt à la désinstallation. On rend donc
-- de quoi reconnaître l'appareil (plateforme, dates, six derniers caractères), et la
-- finalité reste dite en clair dans la politique de confidentialité.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_export jsonb;
begin
  if v_user_id is null then
    raise exception 'Aucune session.' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'export_genere_le', now(),
    'compte', (
      select jsonb_build_object(
        'identifiant', u.id,
        'email', u.email,
        'compte_anonyme', u.is_anonymous,
        'cree_le', u.created_at,
        'cadence_du_plan', p.cadence_type,
        'canal_de_rappel', p.reminder_channel
      )
      from auth.users u join public.profiles p on p.id = u.id
      where u.id = v_user_id
    ),
    'appareils_pour_les_rappels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'plateforme', t.platform,
        'jeton_derniers_caracteres', right(t.token, 6),
        'enregistre_le', t.created_at,
        'vu_le', t.last_seen_at,
        'desactive_le', t.disabled_at
      ) order by t.created_at), '[]'::jsonb)
      from public.push_tokens t where t.user_id = v_user_id
    ),
    'bilans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'soumis_le', a.submitted_at,
        'statut', a.status,
        'reponses', to_jsonb(ans.*) - 'assessment_id',
        'resultats', to_jsonb(r.*) - 'assessment_id' - 'id'
      ) order by a.created_at), '[]'::jsonb)
      from public.assessments a
      left join public.assessment_answers ans on ans.assessment_id = a.id
      left join public.assessment_results r on r.assessment_id = a.id
      where a.user_id = v_user_id
    ),
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'periode', pc.period_label,
        'du', pc.period_start,
        'au', pc.period_end,
        'objectif_pct', pc.target_reduction_pct,
        'actions', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'action', t.action_text,
            'gain_kg_par_an', pa.saving_kg_year,
            'engagement_pris_le', pa.committed_at,
            'jours_choisis', pa.intention_days,
            'echeance_choisie', pa.intention_timing
          ) order by pa.rank), '[]'::jsonb)
          from public.plan_actions pa
          join public.action_templates t on t.id = pa.action_template_id
          where pa.plan_cycle_id = pc.id
        )
      ) order by pc.period_start), '[]'::jsonb)
      from public.plan_cycles pc where pc.user_id = v_user_id
    ),
    'points_de_suivi', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'periode', c.period_label,
        'trajet', c.trip_label,
        'statut', c.status,
        'reponse', c.response,
        'repondu_le', c.responded_at
      ) order by c.period_start), '[]'::jsonb)
      from public.engagement_checkins c where c.user_id = v_user_id
    ),
    'retours_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'categorie', f.kind, 'message', f.message, 'ecran', f.context, 'envoye_le', f.created_at
      ) order by f.created_at), '[]'::jsonb)
      from public.feedback f where f.user_id = v_user_id
    ),
    'reperes_de_parcours', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'evenement', e.name, 'details', e.props, 'plateforme', e.platform, 'le', e.occurred_at
      ) order by e.occurred_at), '[]'::jsonb)
      from public.usage_events e where e.user_id = v_user_id
    )
  ) into v_export;

  return v_export;
end;
$function$;
