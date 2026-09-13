-- v1-13, chantier C2.9 — des rappels qui s'espacent, et une sortie hors de l'app.
-- Arbitrage D8. Constats C-4, A9-7, A9-16, A9-21. Dépend de C0.5 (le journal d'envoi), livré.
--
-- ## Le défaut
--
-- Un point est créé chaque semaine pour tout compte ayant un bilan, et un message est mis en file
-- pour chaque point — **sans jamais regarder si les dix précédents sont restés sans réponse**. La
-- purge ne touche que les sessions anonymes : un compte rattaché qui a désinstallé l'app reçoit donc
-- 52 emails par an, indéfiniment. Sur un plafond Resend de 100 par jour, ce sont les muets qui le
-- consomment d'abord — c'est-à-dire qu'ils retardent les rappels de ceux qui répondent. Et la seule
-- sortie exigeait de rouvrir l'app, que la personne a justement désinstallée.
--
-- ## Ce que la décroissance touche, et ce qu'elle ne touche pas
--
-- **Le point continue d'être généré ; seul le message s'espace.** C'est la distinction qui porte tout
-- le chantier : l'app doit pouvoir montrer la question à qui revient, même après six mois de
-- silence. Supprimer la génération ferait disparaître l'historique de la boucle, et le « Ne pas
-- faire » du chantier l'exclut.
--
-- Trois régimes, et deux seuils (`regime_de_rappel`) :
--
--   * **normal** — moins de quatre points clos sans réponse : chaque point donne un message ;
--   * **espace** — à partir de quatre : **au plus un message par mois calendaire**, tous canaux et
--     toutes boucles confondus. Pour la boucle hebdomadaire, c'est un message sur quatre ; pour la
--     boucle mensuelle, qui est déjà à ce rythme, c'est sans effet — d'où le second seuil, sans quoi
--     « espace » serait un état terminal pour elle ;
--   * **silence** — à partir de huit : plus rien ne part. La boucle hebdomadaire y arrive en deux
--     mois environ (quatre semaines, puis quatre points clos pendant le régime espacé), la boucle
--     mensuelle en huit mois. Les deux sont volontairement lents : se taire trop tôt coûte une
--     personne qui serait revenue.
--
-- **Ce qui remet le compteur à zéro** : une réponse, ou un `app_open`. Le second est fiable depuis
-- C1.2 — l'événement part après la résolution de la session et sur le retour au premier plan, donc
-- il compte vraiment les ouvertures. Et `purge_usage_events` garde douze mois, très au-delà de
-- l'horizon de la décroissance : le signal de réveil ne peut pas être purgé avant d'avoir servi.

-- ── 1. Le jeton de désinscription ───────────────────────────────────────────────────────
-- **Une sortie qui ne demande pas d'ouvrir l'app**, donc pas de session : le jeton *est*
-- l'autorisation. Ce qu'il permet est volontairement minuscule — couper ses propres rappels, rien
-- d'autre — et il est à usage unique. Il ne révèle rien : ni adresse, ni existence de compte (la
-- page répond la même chose pour un jeton inconnu et pour un jeton déjà utilisé), dans le même
-- esprit que la non-divulgation de `/connexion/retrouver`.
--
-- Porté par la ligne d'outbox et non par le profil : un jeton par message, donc un lien qui cesse de
-- marcher sans toucher aux autres, et aucune table de plus.

alter table public.notification_outbox
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribe_used_at timestamptz;

comment on column public.notification_outbox.unsubscribe_token is
  'Le jeton du lien « me désinscrire » de cet email (C2.9). À usage unique, et il expire avec la '
  'rétention de la boîte d''envoi — aucune session n''est demandée, puisque la personne a pu '
  'désinstaller l''app.';

create unique index if not exists notification_outbox_unsubscribe_token
  on public.notification_outbox (unsubscribe_token);

-- ── 2. Le régime de rappel ──────────────────────────────────────────────────────────────
-- Fonction à part plutôt qu'une sous-requête dans la mise en file : c'est la règle de la
-- décroissance, elle se lit seule, et le test pgTAP l'appelle directement — sinon il faudrait
-- fabriquer huit semaines de points pour éprouver un seuil.

create or replace function public.regime_de_rappel(p_user_id uuid, p_loop_type text)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  c_seuil_espace constant integer := 4;
  c_seuil_silence constant integer := 8;
  v_depuis timestamptz;
  v_muets integer;
begin
  -- **Le plus récent des deux signaux de vie.** Une réponse vaut pour sa boucle ; une ouverture de
  -- l'app vaut pour les deux — quelqu'un qui revient et ne répond pas à *cette* question-là n'est
  -- pas quelqu'un qui est parti.
  select greatest(
    (select max(c.period_start)::timestamptz
       from public.engagement_checkins c
      where c.user_id = p_user_id and c.loop_type = p_loop_type and c.status = 'answered'),
    (select max(e.occurred_at)
       from public.usage_events e
      where e.user_id = p_user_id and e.name = 'app_open')
  ) into v_depuis;

  select count(*) into v_muets
  from public.engagement_checkins c
  where c.user_id = p_user_id
    and c.loop_type = p_loop_type
    and c.status = 'expired'
    and (v_depuis is null or c.period_start::timestamptz > v_depuis);

  -- `security definer` est nécessaire et pas décoratif : `usage_events` n'a **aucune policy de
  -- lecture**, donc ce comptage ne verrait rien depuis `authenticated`. Même piège que le garde-fou
  -- de volume de cette table (v1-08 §5.2) — un compteur qui ne compte rien ne déclenche jamais.
  if v_muets >= c_seuil_silence then
    return 'silence';
  elsif v_muets >= c_seuil_espace then
    return 'espace';
  end if;

  return 'normal';
end;
$$;

comment on function public.regime_de_rappel(uuid, text) is
  'La décroissance des rappels (C2.9) : normal, espace (au plus un par mois), silence. Compte les '
  'points clos sans réponse depuis le dernier signe de vie — une réponse ou un app_open.';

revoke execute on function public.regime_de_rappel(uuid, text) from public, anon, authenticated;

-- ── 3. La mise en file applique le régime ───────────────────────────────────────────────
-- Le reste de la fonction est repris de son **état installé** (`pg_get_functiondef`, C2.11 inclus) :
-- la question de maintien, la forme insérable, le canal, le repli, l'étalement du `send_after` et la
-- marque `?rappel=1` sont là parce qu'ils y étaient. C'est la leçon de C2.2 — partir du fichier
-- d'origine supprime en silence ce qui a été ajouté depuis.
--
-- Deux ajouts seulement : la jointure sur le régime, et le lien de désinscription dans le corps.

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
    -- **Le jeton est écrit explicitement, et c'est la seule façon que le lien marche.** Laissé au
    -- `default` de la colonne, il aurait tiré un second uuid, différent de celui que le corps du
    -- message venait d'afficher : un lien de désinscription qui ne correspond à aucune ligne, donc
    -- une sortie qui répond « ce lien n'est plus valable » du premier clic.
    unsubscribe_token
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
      || 'Réponds-moi en un geste : ' || v_app_url || '/plan?rappel=1' || E'\n\n'
      || 'Si tu n''as rien changé, ce n''est pas grave — on se repose la question au prochain point.' || E'\n\n'
      || '— Ramille' || E'\n\n'
      -- **Une sortie qui ne passe pas par l'app** (C2.9). L'ancienne phrase renvoyait à « Toi »
      -- dans l'app : inutilisable pour quelqu'un qui l'a désinstallée, et pire encore sur un
      -- appareil neuf, où elle réglait la préférence d'une session anonyme vide. Le lien reste
      -- proposé **après** l'app, qui garde les trois canaux : on n'invite pas à partir, on rend le
      -- départ possible.
      || 'Pour ne plus recevoir ces rappels : ' || v_app_url || '/rappels/stop?jeton='
      || o.unsubscribe_token::text || E'\n'
      || 'Tu peux aussi choisir ton canal depuis « Toi » dans l''app.',
    -- La question seule : le titre et son début doivent suffire, Android ne montre pas
    -- davantage sans déplier.
    upper(left(q.question, 1)) || substr(q.question, 2),
    case when ch.canal = 'push' then now()
         else now() + make_interval(days =>
           (('x' || substr(md5(c.user_id::text), 1, 7))::bit(28)::int % 5))
    end,
    o.unsubscribe_token
  from public.engagement_checkins c
  join auth.users u on u.id = c.user_id
  cross join lateral (select public.reminder_channel_for(c.user_id) as canal) ch
  -- **Le régime décide si ce point donne un message**, et c'est la seule nouveauté de la clause
  -- `where` : le point, lui, reste généré par les crons — l'app doit pouvoir montrer la question à
  -- qui revient après six mois.
  cross join lateral (select public.regime_de_rappel(c.user_id, c.loop_type) as regime) r
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
  -- Le jeton est tiré ici pour pouvoir entrer dans le corps du message : `gen_random_uuid()` dans
  -- le `default` de la colonne ne serait pas lisible depuis ce `select`.
  cross join lateral (select gen_random_uuid() as unsubscribe_token) o
  where c.status = 'pending'
    and ch.canal is not null
    and r.regime <> 'silence'
    -- **Au plus un message par mois en régime espacé**, tous canaux et toutes boucles confondus :
    -- la personne reçoit des messages, pas des messages par boucle. Compté sur `created_at` de la
    -- boîte d'envoi et non sur `sent_at` : une ligne mise en file compte, même si l'envoi attend
    -- son `send_after` ou un secret absent — sinon la décroissance ne s'appliquerait pas du tout
    -- tant que l'expéditeur n'est pas configuré.
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

-- ── 4. La désinscription par le lien ────────────────────────────────────────────────────
-- Appelable par `anon` : c'est tout l'intérêt — la personne n'a pas de session, elle a un lien.
-- Le jeton porte l'autorisation, et il ne peut rien d'autre que poser `reminder_channel = 'none'`
-- sur le compte qui a reçu ce message-là.
--
-- **La réponse ne distingue pas les échecs**, même registre que `/connexion/retrouver` : un jeton
-- inconnu, déjà utilisé ou trop vieux rend tous `false`. Renvoyer trois messages différents ferait
-- de cette page un moyen de savoir si une adresse a reçu un rappel.

create or replace function public.desinscrire_des_rappels(p_jeton uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
begin
  -- Usage unique, et la marque se pose dans le même ordre qu'un `sent` : d'abord on consomme, puis
  -- on agit. Un second clic ne retrouve plus la ligne.
  update public.notification_outbox
  set unsubscribe_used_at = now()
  where unsubscribe_token = p_jeton and unsubscribe_used_at is null
  returning user_id into v_user_id;

  if v_user_id is null then
    return false;
  end if;

  update public.profiles set reminder_channel = 'none' where id = v_user_id;

  -- Les rappels déjà en file pour cette personne n'ont plus de destinataire voulu : les annuler
  -- tout de suite évite qu'un message parte après le clic. `cancelled` est l'état que
  -- `send_pending_reminders` pose déjà pour un point devenu caduc.
  update public.notification_outbox
  set status = 'cancelled'
  where user_id = v_user_id and status = 'pending';

  return true;
end;
$$;

comment on function public.desinscrire_des_rappels(uuid) is
  'Coupe les rappels depuis le lien d''un email, sans session (C2.9). Usage unique, et la réponse '
  'ne distingue pas un jeton inconnu d''un jeton déjà utilisé — sinon la page dirait qui reçoit '
  'des rappels.';

revoke execute on function public.desinscrire_des_rappels(uuid) from public, anon, authenticated;
grant execute on function public.desinscrire_des_rappels(uuid) to anon, authenticated;

-- ── 5. Les en-têtes que les messageries lisent ──────────────────────────────────────────
-- `List-Unsubscribe` et `List-Unsubscribe-Post` font apparaître le bouton « Se désabonner » de
-- Gmail et d'Apple Mail **au-dessus** du message : c'est la sortie que la personne trouvera en
-- premier, et celle qui évite qu'elle clique « Spam » à la place — un signalement coûte la
-- délivrabilité de tout le domaine, pas seulement de ce message.
--
-- `One-Click` exige que l'URL accepte un POST sans confirmation. La route `/rappels/stop` est une
-- page de l'app exportée en statique : elle ne peut pas répondre à un POST. L'en-tête pointe donc
-- l'URL en `https://`, que les messageries ouvrent alors dans un navigateur — comportement prévu
-- par la RFC 8058 quand le POST n'est pas annoncé, et c'est pourquoi `List-Unsubscribe-Post` n'est
-- **pas** envoyé : l'annoncer sans le servir ferait échouer le geste en silence.
--
-- Substitution vérifiée dans `send_pending_reminders` : cette procédure fait trois cents lignes,
-- dont les deux filets de rattrapage et le journal par canal, et la retranscrire pour deux en-têtes
-- serait le meilleur moyen d'y glisser une faute.

do $garde_entetes$
declare
  src text;
  cible oid;
  ancre constant text := E'              jsonb_build_object(\n                ''from'', v_from,\n                ''to'', jsonb_build_array(rec.recipient_email),\n                ''subject'', rec.subject,\n                ''text'', rec.body\n              )::text';
  remplacement constant text := E'              jsonb_build_object(\n                ''from'', v_from,\n                ''to'', jsonb_build_array(rec.recipient_email),\n                ''subject'', rec.subject,\n                ''text'', rec.body,\n                -- C2.9 : la sortie que la messagerie affiche au-dessus du message. Le pendant\n                -- « One-Click », qui annonce un POST, est délibérément absent : la page est un\n                -- export statique, elle ne répond pas au POST, et l''annoncer sans le servir\n                -- ferait échouer le geste en silence. Le nom de cet en-tête ne s''écrit donc\n                -- nulle part ici suivi de -Post, et le contrôle ci-dessous l''exige.\n                -- Le secret est relu par message plutôt que gardé dans une variable : la\n                -- déclaration est hors de cette substitution, et un lot vaut au plus\n                -- vingt-cinq emails.\n                ''headers'', jsonb_build_object(\n                  ''List-Unsubscribe'',\n                  ''<'' || coalesce(\n                    (select decrypted_secret from vault.decrypted_secrets where name = ''app_url''),\n                    ''https://www.ramille.fr''\n                  ) || ''/rappels/stop?jeton='' || rec.unsubscribe_token::text || ''>''\n                )\n              )::text';
  occurrences int;
begin
  select p.oid into cible from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = 'send_pending_reminders';

  if cible is null then
    raise exception 'send_pending_reminders est introuvable.';
  end if;

  src := pg_get_functiondef(cible);
  occurrences := (length(src) - length(replace(src, ancre, ''))) / length(ancre);

  -- **Rejouable, alors qu'une substitution vérifiée est à un coup par nature** (corrigé le
  -- 13/09/2026 en contre-lisant la vague 5, qui portait le même défaut). Zéro occurrence de l'ancre
  -- veut dire soit « déjà substitué » — un rejeu après restauration, donc un non-événement — soit
  -- « corps réécrit autrement », où l'on ne devine pas. Les deux se séparent par la **présence de
  -- l'en-tête posé**, jamais par la seule absence de l'ancre. Sans ce cas, le fichier levait au
  -- second passage, c'est-à-dire précisément le jour d'une restauration.
  if occurrences = 0 then
    if position('List-Unsubscribe' in src) > 0 then
      return;
    end if;
    raise exception 'Ni le corps de l''appel Resend ni l''en-tête de désinscription ne sont présents.';
  elsif occurrences > 1 then
    raise exception 'Le corps de l''appel Resend a été trouvé % fois (une seule attendue).', occurrences;
  end if;

  execute replace(src, ancre, remplacement);
end
$garde_entetes$;

do $controle_entetes$
begin
  if position('List-Unsubscribe' in
      (select prosrc from pg_proc
       where pronamespace = 'public'::regnamespace and proname = 'send_pending_reminders')) = 0 then
    raise exception 'L''en-tête de désinscription n''a pas été posé.';
  end if;
  -- Et le contraire : `List-Unsubscribe-Post` ne doit **pas** y être, pour la raison ci-dessus.
  if position('List-Unsubscribe-Post' in
      (select prosrc from pg_proc
       where pronamespace = 'public'::regnamespace and proname = 'send_pending_reminders')) > 0 then
    raise exception 'List-Unsubscribe-Post est annoncé alors que la page ne répond pas au POST.';
  end if;
end
$controle_entetes$;

-- ── 6. Les reprises de jeton d'appareil laissent une trace ──────────────────────────────
-- `register_push_token` **reprend** le jeton à son propriétaire précédent, et c'est voulu : sur un
-- appareil neuf, la session anonyme enregistre le jeton puis le lien de connexion la remplace par
-- le compte. Sans la reprise, les rappels partiraient au nom d'un utilisateur fantôme.
--
-- Ce qui manquait, c'est de pouvoir le **constater**. La reprise reste inconditionnelle (décision de
-- v1-10 §3.4, inchangée) ; on en garde seulement le compte, la date et le propriétaire d'avant. Trois
-- colonnes plutôt qu'une table : un jeton repris deux cents fois dirait un appareil partagé ou une
-- boucle, et c'est la seule question que ce journal sert à trancher.

alter table public.push_tokens
  add column if not exists reprises integer not null default 0,
  add column if not exists derniere_reprise_le timestamptz,
  add column if not exists proprietaire_precedent uuid references public.profiles(id) on delete set null;

comment on column public.push_tokens.reprises is
  'Combien de fois ce jeton a changé de propriétaire (C2.9). La reprise est voulue (v1-10 §3.4) ; '
  'ce compteur la rend constatable — un nombre élevé dit un appareil partagé ou une boucle.';

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Aucune session.' using errcode = 'insufficient_privilege';
  end if;

  -- Le format, et plus seulement la longueur : un jeton mal formé s'enregistrait sans bruit et
  -- n'échouait qu'à l'envoi, chez Expo, sur une ligne déjà marquée `sent`.
  if p_token is null or p_token not like 'ExponentPushToken[%]' or length(p_token) < 20 or length(p_token) > 255 then
    raise exception 'Jeton d''appareil invalide : la forme attendue est ExponentPushToken[...].'
      using errcode = 'check_violation';
  end if;

  -- **La reprise du jeton, et pourquoi ce RPC existe** (v1-10 §3.4) : sur un nouvel appareil, la
  -- session anonyme A enregistre le jeton, puis le lien de connexion la remplace par le compte B.
  -- Une policy owner-scoped interdirait à B de toucher la ligne de A, et les rappels partiraient
  -- au nom d'un utilisateur fantôme — sans erreur.
  --
  -- Les trois colonnes de trace (C2.9) ne changent rien à la reprise : elles la comptent. Le test
  -- `push_tokens.user_id <> v_user_id` lit bien l'**ancienne** valeur — dans un `on conflict do
  -- update`, la table nommée désigne la ligne existante, `excluded` la ligne proposée.
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, v_user_id, p_platform)
  on conflict (token) do update
    set user_id = v_user_id,
        platform = excluded.platform,
        last_seen_at = now(),
        disabled_at = null,
        disabled_reason = null,
        reprises = push_tokens.reprises
          + case when push_tokens.user_id <> v_user_id then 1 else 0 end,
        derniere_reprise_le = case
          when push_tokens.user_id <> v_user_id then now()
          else push_tokens.derniere_reprise_le
        end,
        proprietaire_precedent = case
          when push_tokens.user_id <> v_user_id then push_tokens.user_id
          else push_tokens.proprietaire_precedent
        end;

  -- Au-delà de cinq appareils actifs, le moins récemment vu s'en va. `send_pending_reminders()`
  -- envoie à tous les jetons actifs : sans ce plafond, la même question part autant de fois qu'il
  -- reste de lignes, et `unique(checkin_id)` n'y peut rien — elle garantit un message, pas un
  -- destinataire unique.
  update public.push_tokens
  set disabled_at = now(),
      disabled_reason = 'Remplacé : plus de cinq appareils actifs pour ce compte.'
  where token in (
    select token
    from public.push_tokens
    where user_id = v_user_id and disabled_at is null
    -- `token` départage, et ce n'est pas décoratif : `now()` est **constant** dans une
    -- transaction, donc deux enregistrements qui y tomberaient ensemble porteraient le même
    -- `last_seen_at` et `offset` choisirait au hasard. Le cas ne se produit pas en
    -- production — un appareil appelle une fois par session — mais un ordre non déterministe
    -- rend le comportement intestable, et un test qui passe une fois sur deux ne garde rien.
    order by last_seen_at desc, token desc
    offset 5
  );
end;
$function$;

revoke execute on function public.register_push_token(text, text) from public, anon, authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;
