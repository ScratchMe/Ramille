-- v1-13, chantier C1.12 points 4 et 5 — les jetons d'appareil : policies réévaluées une fois,
-- format vérifié, nombre borné. Constat A11-11 pour la partie advisors, traitée dans `v1-07` §5.
--
-- ## Trois défauts distincts sur la même table, et aucun ne se voit à l'usage
--
-- 1. **`user_id = auth.uid()` sans `(select …)` fait rappeler la fonction par ligne.** C'est
--    l'avertissement `auth_rls_initplan` des advisors Supabase : `auth.uid()` étant `stable` et non
--    `immutable`, l'optimiseur ne la sort de la boucle que si elle est enveloppée dans un
--    sous-`select`, qui devient alors un `InitPlan` évalué une fois. Tout le reste du schéma
--    applique déjà cette forme — ces deux policies sont les dernières à ne pas le faire. Sans
--    conséquence sur une table de quelques lignes par personne, et c'est précisément pourquoi
--    personne ne le verrait : la dérive ne se mesure pas, elle se constate le jour où la table
--    grossit.
--
-- 2. **Rien ne vérifiait la forme du jeton.** `register_push_token` se contentait d'une borne de
--    longueur (10 à 255), si bien que n'importe quelle chaîne s'enregistrait comme un appareil.
--    Un jeton mal formé n'échoue pas à l'enregistrement : il échoue **à l'envoi**, chez Expo,
--    dans `send_pending_reminders()` — et la ligne de `notification_outbox` est marquée `sent`
--    avant l'appel HTTP (v1-07 §3.1), donc le rappel est perdu sans reprise. Le format est
--    `ExponentPushToken[…]` : c'est ce qu'`expo-notifications` rend, et la seule chose que
--    `exp.host` accepte.
--
-- 3. **Aucun plafond par personne.** Chaque appareil ajoute une ligne, et rien ne les retire :
--    un téléphone réinstallé, un émulateur, un navigateur de test en laissent chacun une, toutes
--    actives. `send_pending_reminders()` envoie à **tous** les jetons actifs, donc la même
--    question part autant de fois qu'il y a de lignes — et la garantie anti-relance de la spec
--    §7 (`unique(checkin_id)`) ne couvre pas ce cas : elle garantit un *message*, pas un seul
--    destinataire. Cinq jetons actifs, le plus ancien désactivé au-delà : assez pour un
--    téléphone, une tablette et des remplacements, trop peu pour qu'une fuite s'installe.
--
-- Les trois se réparent sans toucher au contrat : l'app appelle le même RPC, avec les mêmes
-- paramètres.

-- ── 1. Les deux policies, réécrites avec le sous-select ─────────────────────────────────
-- `drop` puis `create` plutôt qu'`alter policy … using` : la seconde forme existe, mais la
-- recréation laisse le texte complet de la policy dans cette migration, lisible sans aller
-- chercher l'original. Les droits ne changent pas d'un pouce — même commande, même rôle, même
-- prédicat sémantique.

drop policy "push_tokens select own" on public.push_tokens;
drop policy "push_tokens delete own" on public.push_tokens;

create policy "push_tokens select own" on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));

create policy "push_tokens delete own" on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

-- ── 2. Le format du jeton, en base et pas seulement dans le RPC ─────────────────────────
-- La contrainte double la vérification du RPC, et ce n'est pas redondant : le RPC est le seul
-- chemin **client**, mais `send_pending_reminders()` et une reprise manuelle écrivent aussi dans
-- cette table. Un `check` tient quel que soit le chemin, y compris celui qu'on écrira demain.
--
-- `ExponentPushToken[` … `]` est la forme rendue par `expo-notifications` sur Android comme sur
-- iOS (le jeton FCM brut n'apparaît jamais côté app : Expo l'encapsule). Les bornes de longueur
-- restent, elles bornent l'intérieur du crochet.
--
-- `not valid` volontairement **absent** : la table est vide sur le projet distant (relevée à zéro
-- ligne le 11/09/2026, avant d'écrire cette migration), donc la contrainte se valide à la pose.
-- Si elle échouait un jour sur une autre base, c'est qu'il existe un jeton qui ne peut de toute
-- façon pas recevoir de rappel, et il faut le voir plutôt que le différer.

alter table public.push_tokens
  add constraint push_tokens_token_format
  check (token like 'ExponentPushToken[%]' and length(token) between 20 and 255);

-- ── 3. Le plafond, dans le RPC ──────────────────────────────────────────────────────────
-- **Désactiver et non supprimer**, cohérent avec le reste de la table : `disabled_at` porte déjà
-- les refus d'Expo, et garder la ligne évite de réenregistrer en boucle un jeton écarté. Le motif
-- dit pourquoi, en français comme le reste de la colonne.
--
-- Le plafond s'applique **après** l'insertion, et sur le plus ancien `last_seen_at` plutôt que
-- `created_at` : ce qu'on veut écarter est l'appareil qu'on n'utilise plus, pas celui qu'on a
-- enregistré en premier — un téléphone gardé trois ans serait sinon le premier sacrifié.
-- L'appareil qui vient d'appeler ne peut pas se désactiver lui-même : il porte le `last_seen_at`
-- le plus récent par construction.

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
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
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, v_user_id, p_platform)
  on conflict (token) do update
    set user_id = v_user_id,
        platform = excluded.platform,
        last_seen_at = now(),
        disabled_at = null,
        disabled_reason = null;

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
$$;

-- Les droits de la fonction ne changent pas, mais `create or replace` les conserve : on les
-- réaffirme pour que ce fichier dise la vérité entière s'il est relu seul. `from public` d'abord,
-- sans quoi le `revoke` ne révoque rien — PostgreSQL accorde `EXECUTE` à PUBLIC à la création.
revoke execute on function public.register_push_token(text, text) from public, anon, authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;
