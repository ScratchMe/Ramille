-- La passe de sécurité avant le lancement public (05/10/2026, `v1-27` §12.38) : ce qu'un inconnu
-- malveillant pouvait faire avec une session anonyme, donc avec un captcha résolu.
--
-- **Personne ne lisait ni ne modifiait les données d'un autre**, et rien de ce qui suit ne touche aux
-- policies. Tout ce que la passe a trouvé tient au **volume** — remplir la base, faire partir des
-- e-mails, bloquer la purge ou l'alerte — et à deux impasses qu'un tiers pouvait fabriquer :
--
--   1. **Une session remplissait la base de 500 Mo**, et le plan gratuit la passe alors en lecture
--      seule pour tout le monde. Trois chemins, mesurés en local : un événement d'usage dont les
--      propriétés sont des nombres de 131 000 chiffres (400 Ko l'événement, 200 Mo par jour et par
--      compte sous le plafond de 500 lignes) ; des bilans sans plafond (20 000 en deux secondes) ; et
--      des réponses aux nombres sans borne (146 Ko la ligne). D'où les nombres bornés
--      dans `check_usage_event_props`, un bilan en cours à la fois et dix par jour, les distances
--      bornées à 10 000 km — ce qui écarte aussi `NaN` et `Infinity`, que `> 0` laissait passer et
--      qui empoisonnaient toutes les moyennes de l'analyse. (La liste des transports proches,
--      signalée aussi, ne grossit pas : `deduire_l_acces` la dédoublonne avant l'écriture.)
--      Les deux autres croissances d'une ligne par requête prennent leur plafond : dix jetons
--      d'appareil neufs par jour, trente engagements archivés par jour. Et la taille de la base entre
--      dans l'alerte d'exploitation, à partir de 300 Mo.
--   2. **La purge se bloquait exprès** : un bilan en cours suffisait à faire d'un compte un porteur, et
--      une vague de robots déclenchait la garde chaque nuit. Un bilan en cours ne porte plus rien.
--   3. **L'alerte se noyait** : une panne émise par heure consommait les six envois du jour. Les
--      signaux du serveur passent désormais le plafond.
--   4. **Un jeton Expo d'un autre projet faisait tomber le lot de rappels entier.** Un 400 sur un lot
--      de plusieurs comptes le coupe désormais en deux, jusqu'à isoler la ligne fautive.
--   5. **Le code de rattachement partait sans captcha** : 120 codes par jour vers l'adresse d'un
--      tiers depuis une seule session, et quarante sessions épuisaient les 200 envois du jour. Chaque
--      code coûte désormais un captcha, vérifié par la base auprès de Cloudflare
--      (`autoriser_le_rattachement`, secret Vault `turnstile_secret_rattachement`) ; le plafond de
--      l'adresse compte sur vingt-quatre heures au lieu d'une (cinq), et un plafond du jour s'ajoute à
--      celui de l'heure pour le compte (dix).
--   6. **Un tiers squattait une adresse** : un compte créé par `/auth/v1/signup` ou par `/otp`
--      (`create_user`) à l'adresse de quelqu'un, jamais confirmé ni purgé, et la personne ne recevait
--      plus jamais de code, sans un mot. Le hook `before_user_created` refuse désormais toute création
--      qui n'est pas une session anonyme : le produit n'en crée jamais d'autre, il convertit une
--      session anonyme (`updateUser`, `linkIdentity`), ce qui ne crée aucun compte. Mesuré en local
--      le 05/10/2026 : l'API d'administration ne passe pas par ce hook, donc les comptes que la CI
--      crée par elle ne sont pas touchés. La production n'avait aucun compte de ce genre.
--
-- **Les fonctions réécrites partent de leur corps en base** (`pg_get_functiondef`), et le hook d'envoi
-- de son fichier, qui est son corps du distant depuis le matin même ; seuls les fragments que cet
-- en-tête nomme changent.

-- ── 1. Les nombres des événements d'usage ────────────────────────────────────────────────────
--
-- Le `check` de la colonne ne relit pas les lignes déjà là : il ne vaut que pour les suivantes.

CREATE OR REPLACE FUNCTION public.check_usage_event_props(p_props jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_typeof(p_props) = 'object'
     and (select count(*) from jsonb_object_keys(p_props)) <= 6
     and not exists (
       select 1
       from jsonb_each(p_props) as entry(key, value)
       where jsonb_typeof(entry.value) not in ('string', 'number', 'boolean')
          or length(entry.key) > 32
          or (jsonb_typeof(entry.value) = 'string' and length(entry.value #>> '{}') > 48)
          -- Les nombres aussi (passe avant le lancement, 05/10/2026) : un nombre JSON de 131 000
          -- chiffres passait, et un événement pesait 400 Ko. 32 caractères écrivent tout `double`.
          or (jsonb_typeof(entry.value) = 'number' and length(entry.value::text) > 32)
     );
$function$;

-- ── 2. Les bilans : un en cours à la fois, dix par jour ─────────────────────────────────────
--
-- L'app ne crée jamais un second bilan en cours : elle reprend celui qui traîne
-- (`src/app/bilan/index.tsx`, « la reprise passe par le bilan `in_progress` »). L'index unique le
-- garantit aussi sous des insertions simultanées, et refuse une insertion de plusieurs lignes. Le
-- plafond du jour borne ce qu'un compte peut créer en finalisant à mesure.

create unique index if not exists assessments_un_seul_en_cours
  on public.assessments (user_id)
  where status = 'in_progress';

create or replace function public.plafonner_les_bilans()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_par_jour constant integer := 10;
begin
  -- `security definer` : le compte des lignes ne doit pas dépendre de ce que l'appelant voit.
  perform 1
  from public.assessments
  where user_id = new.user_id and created_at > now() - interval '24 hours'
  offset c_par_jour - 1 limit 1;

  if found then
    raise exception 'Tu as commencé beaucoup de bilans aujourd''hui. Reviens demain.'
      using errcode = 'RM002';
  end if;

  return new;
end;
$$;

revoke execute on function public.plafonner_les_bilans() from public, anon, authenticated;

drop trigger if exists plafonner_les_bilans on public.assessments;
create trigger plafonner_les_bilans
  before insert on public.assessments
  for each row execute function public.plafonner_les_bilans();

-- ── 3. Les réponses : des nombres bornés ────────────────────────────────────────────────────
--
-- 10 000 km n'arrête aucun trajet réel — `COMMUTE_DISTANCE_A_RELIRE_KM` (200) reste le seuil où
-- l'app fait relire, sans bloquer — et `NaN <= 10000` est faux, donc la borne écarte aussi `NaN` et
-- `Infinity`. L'échelle borne le nombre de décimales, que la valeur seule ne bornait pas (un 1,000…01
-- de 131 000 chiffres est sous la borne). `scale(NaN)` est nul, mais la borne a déjà répondu.

-- Une contrainte par colonne, et ce n'est pas du style : `scripts/verifier-miroirs-de-check.mjs`
-- évalue les `check` d'une colonne en y substituant des valeurs, et une contrainte qui en nomme
-- plusieurs le fait échouer.
alter table public.assessment_answers
  drop constraint if exists assessment_answers_commute_distance_km_bornee;
alter table public.assessment_answers
  add constraint assessment_answers_commute_distance_km_bornee
  check (commute_distance_km is null or (commute_distance_km <= 10000 and scale(commute_distance_km) <= 20));
alter table public.assessment_answers
  drop constraint if exists assessment_answers_leisure_distance_km_bornee;
alter table public.assessment_answers
  add constraint assessment_answers_leisure_distance_km_bornee
  check (leisure_distance_km is null or (leisure_distance_km <= 10000 and scale(leisure_distance_km) <= 20));
alter table public.assessment_answers
  drop constraint if exists assessment_answers_commute_second_mode_share_bornee;
alter table public.assessment_answers
  add constraint assessment_answers_commute_second_mode_share_bornee
  check (commute_second_mode_share is null or scale(commute_second_mode_share) <= 20);

-- ── 4. Les jetons d'appareil : dix neufs par jour ───────────────────────────────────────────

create index if not exists push_tokens_user_id_created_at_idx
  on public.push_tokens (user_id, created_at);

CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- **Dix jetons neufs par jour et par compte** (passe avant le lancement, 05/10/2026) : chaque jeton
  -- inventé ajoutait une ligne, gardée 90 jours une fois désactivée. Un appareil réel rappelle avec le
  -- même jeton, qui existe déjà et ne compte pas.
  if not exists (select 1 from public.push_tokens where token = p_token) then
    perform 1
    from public.push_tokens
    where user_id = v_user_id and created_at > now() - interval '24 hours'
    offset 9 limit 1;

    if found then
      raise exception 'Trop d''appareils enregistrés aujourd''hui pour ce compte.'
        using errcode = 'RM002';
    end if;
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

-- ── 5. Les engagements : trente archivés par jour ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.commit_plan_action(p_plan_action_id uuid, p_days smallint[] DEFAULT NULL::smallint[], p_timing text DEFAULT NULL::text, p_replace boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_cycle_id uuid;
  v_poste text;
  v_forme_attendue text;
  v_precedent uuid;
  v_deja_engagee boolean;
  v_engagee_le timestamptz;
  v_jours_avant smallint[];
  v_echeance_avant text;
begin
  -- **Le cycle de l'action est le dernier du compte** (seconde passe de la revue finale, 04/10/2026,
  -- `v1-27` §12.36) : l'écran n'engage que sur le cycle le plus récent (`lecture-du-plan.ts`, trié par
  -- `period_start`), et un appel direct à l'API pouvait engager une action d'une saison close — la
  -- question de la période se serait alors posée sur un engagement pris après coup. « Le dernier » et
  -- non « celui qui couvre aujourd'hui » : entre minuit et le passage nocturne d'un changement de
  -- saison, l'écran montre encore le cycle d'avant, et il doit rester engageable.
  select pc.id, tpl.poste into v_cycle_id, v_poste
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join public.action_templates tpl on tpl.id = pa.action_template_id
  where pa.id = p_plan_action_id and pc.user_id = auth.uid()
    and pc.period_start = (
      select max(dernier.period_start) from public.plan_cycles dernier where dernier.user_id = auth.uid()
    );

  if v_cycle_id is null then
    raise exception 'Action introuvable.' using errcode = 'no_data_found';
  end if;

  -- **Trente engagements archivés par jour et par compte** (passe avant le lancement, 05/10/2026) :
  -- chaque changement d'intention archive le précédent, et mille appels laissaient mille lignes.
  -- Personne ne change trente fois d'avis dans la journée.
  perform 1
  from public.plan_action_commitments_archive
  where user_id = auth.uid() and released_at > now() - interval '24 hours'
  offset 29 limit 1;

  if found then
    raise exception 'Tu as changé ton engagement de nombreuses fois aujourd''hui. Reviens demain.'
      using errcode = 'RM002';
  end if;

  v_forme_attendue := case when coalesce(v_poste, '') = 'commute' then 'des jours de la semaine' else 'une échéance' end;

  if (p_days is not null) = (p_timing is not null) then
    raise exception 'Une intention et une seule est attendue pour cette action : %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
  end if;

  if (coalesce(v_poste, '') = 'commute') <> (p_days is not null) then
    raise exception 'Cette action attend %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
  end if;

  select id into v_precedent
  from public.plan_actions
  where plan_cycle_id = v_cycle_id and committed_at is not null and id <> p_plan_action_id;

  if v_precedent is not null then
    -- **Le refus est le défaut, et c'est tout l'apport de C4.6 ici.** Libérer l'engagement
    -- précédent efface `committed_at`, les jours et l'échéance — le seul choix personnel que le
    -- produit demande — et l'archive de C2.2 en garde la trace mais ne le rend pas. Un appel qui
    -- ne dit pas qu'il remplace ne remplace donc pas : l'écran qui propose « Choisir celle-ci à la
    -- place » le dit, un appel écrit par inadvertance ne le dira pas.
    --
    -- Le SQLSTATE est réservé aux conditions définies par l'utilisateur (classe R) : le client
    -- l'utilise pour recharger le plan plutôt que pour parler de réseau — ce refus veut presque
    -- toujours dire que l'état a changé depuis l'affichage.
    if p_replace is not true then
      raise exception 'Une autre action est déjà engagée sur cette période.'
        using errcode = 'RM001';
    end if;

    perform public.archiver_engagement_de_laction(v_precedent, 'changement');

    update public.plan_actions
    set committed_at = null, intention_days = null, intention_timing = null, carried_over_from = null
    where id = v_precedent;
  end if;

  -- D15 (02/10/2026) : l'action est déjà engagée, et on en change l'intention — « Modifier les
  -- jours », « Modifier l'échéance », sans la libérer. L'intention remplacée s'archive, comme tout
  -- engagement qui part (« aucun chemin ne détruit un engagement sans l'archiver ») ; une intention
  -- identique ne réécrit rien, ni archive ni `committed_at` — les jours se comparent comme un
  -- ensemble, l'écran les envoyant dans l'ordre où on les a cochés. **Une échéance relative n'est
  -- identique que le mois où elle a été choisie** : « Le mois prochain » choisi en septembre vise
  -- octobre, et redit en octobre il vise novembre — c'est un autre choix, qui s'écrit (contre-lecture
  -- du 02/10/2026). Le mois se lit en heure de Paris, comme la question du mois. `committed_at` repart
  -- à maintenant sur une vraie modification : c'est le jour où l'échéance a été choisie, que la
  -- question du mois lit (D14, `generate_extras_checkins`).
  select pa.committed_at is not null, pa.committed_at, pa.intention_days, pa.intention_timing
    into v_deja_engagee, v_engagee_le, v_jours_avant, v_echeance_avant
  from public.plan_actions pa
  where pa.id = p_plan_action_id;

  if v_deja_engagee then
    if (select array_agg(j order by j) from unnest(v_jours_avant) j)
         is not distinct from (select array_agg(j order by j) from unnest(p_days) j)
       and v_echeance_avant is not distinct from p_timing
       and (p_timing is null or p_timing not in ('ce_mois', 'le_mois_prochain')
            or date_trunc('month', v_engagee_le at time zone 'Europe/Paris')
               = date_trunc('month', now() at time zone 'Europe/Paris')) then
      return;
    end if;
    perform public.archiver_engagement_de_laction(p_plan_action_id, 'modification');
  end if;

  update public.plan_actions
  set committed_at = now(),
      intention_days = p_days,
      intention_timing = p_timing
  where id = p_plan_action_id;

  -- C4.2 (D4, précisé le 27/09/2026) : le premier engagement **choisi** de la saison sur une action
  -- de **trajet** ouvre les dix semaines du mot de la veille, et le seul. Une action d'un autre poste
  -- ne pose rien : le mot ne la suit pas, et ouvrir la fenêtre sur elle en retirerait des semaines à
  -- l'action de trajet choisie ensuite. Un second choix de trajet trouve la date posée et ne la
  -- déplace pas — sans quoi changer d'action toutes les huit semaines ferait un mot de la veille sans
  -- fin (`v1-25` §3.4).
  -- Et une modification ne l'ouvre pas (D15) : elle n'est pas le premier engagement choisi de la
  -- saison. Sur une action de trajet reconduite, le cycle neuf n'a pas de date ; changer ses jours
  -- l'aurait posée, et dix semaines de mot de la veille repartaient à chaque saison.
  if coalesce(v_poste, '') = 'commute' and not coalesce(v_deja_engagee, false) then
    update public.plan_cycles
    set premier_engagement_le = now()
    where id = v_cycle_id and premier_engagement_le is null;
  end if;
end;
$function$;

-- ── 6. La purge : un bilan en cours ne porte rien ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purge_stale_anonymous_accounts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  -- Plancher absolu : en dessous, la garde ne se mêle de rien (justification en en-tête de
  -- `20260910100000_garde_volume_purge_anonyme.sql`).
  c_plancher constant integer := 50;
  c_part_max constant numeric := 0.20;

  v_candidats uuid[];
  v_vides uuid[];
  v_porteurs uuid[];
  v_a_supprimer uuid[];
  v_nb_candidats integer;
  v_nb_porteurs integer;
  v_total integer;
  v_seuil integer;
  v_bloque boolean;
  v_supprimes integer := 0;
  v_echec_du_compte text;
begin
  -- **La garde ne compte que les comptes qui portent quelque chose** (plan anti-abus, 04/10/2026) :
  -- un bilan, ou un retour. Des milliers de sessions de robots, vides, gonflaient le dénominateur
  -- — donc desserraient la garde pour les vrais comptes — puis, inactives ensemble, la faisaient
  -- tomber pour tout le monde. Un compte vide ne perd rien à partir à tort : il n'a ni bilan, ni
  -- plan, ni point, ni retour, et la session suivante en ouvre un autre.
  --
  -- **Un bilan en cours ne porte rien** (passe avant le lancement, 05/10/2026) : une seule requête en
  -- crée un, et des comptes de robots qui en portaient chacun un déclenchaient la garde exprès, nuit
  -- après nuit, et retenaient les vrais comptes au-delà des 90 jours promis. Un bilan qui n'a jamais
  -- été finalisé n'a ni résultat ni plan : le compte part comme un compte vide.
  select count(*) into v_total
  from auth.users u
  where u.is_anonymous = true
    and (exists (select 1 from public.assessments a where a.user_id = u.id and a.status <> 'in_progress')
      or exists (select 1 from public.feedback f where f.user_id = u.id));

  -- Le prédicat d'inactivité, identique à celui de 20260907093000 : le plus récent des signes
  -- de vie gagne, et il faut que tous soient muets depuis 90 jours pour qu'un compte parte.
  -- `created_at` reste le plancher, pour qu'un compte créé hier sans aucun événement ne passe
  -- pas pour inactif depuis toujours.
  select coalesce(array_agg(u.id), '{}'::uuid[]) into v_candidats
  from auth.users u
  where u.is_anonymous = true
    and greatest(
      u.created_at,
      coalesce((select max(e.occurred_at) from public.usage_events e where e.user_id = u.id), u.created_at),
      coalesce((select max(a.submitted_at) from public.assessments a where a.user_id = u.id), u.created_at),
      coalesce((select max(a.created_at)   from public.assessments a where a.user_id = u.id), u.created_at),
      coalesce((select max(c.responded_at) from public.engagement_checkins c where c.user_id = u.id), u.created_at),
      coalesce((select max(f.created_at)   from public.feedback f where f.user_id = u.id), u.created_at)
    ) < now() - interval '90 days';

  v_nb_candidats := coalesce(array_length(v_candidats, 1), 0);

  select coalesce(array_agg(c.id) filter (where not c.porte), '{}'::uuid[]),
         coalesce(array_agg(c.id) filter (where c.porte), '{}'::uuid[])
    into v_vides, v_porteurs
  from (
    select candidat.id,
           exists (select 1 from public.assessments a where a.user_id = candidat.id and a.status <> 'in_progress')
             or exists (select 1 from public.feedback f where f.user_id = candidat.id) as porte
    from unnest(v_candidats) as candidat(id)
  ) c;

  v_nb_porteurs := coalesce(array_length(v_porteurs, 1), 0);
  v_seuil := greatest(c_plancher, ceil(v_total * c_part_max)::integer);
  v_bloque := v_nb_porteurs > v_seuil;

  -- Au-delà du seuil, la garde retient **les comptes qui portent quelque chose**, et eux seuls : les
  -- vides partent quand même. Le journal dit `blocked`, puisque c'est ce qui doit alerter.
  v_a_supprimer := case when v_bloque then v_vides else v_candidats end;

  if v_bloque then
    raise warning 'purge_stale_anonymous_accounts : garde de volume déclenchée (% comptes porteurs candidats sur %, seuil %), seuls les % vides supprimés.',
      v_nb_porteurs, v_total, v_seuil, coalesce(array_length(v_vides, 1), 0);
  end if;

  -- Les cohortes, AVANT la suppression : après, la cascade a emporté tout ce qui les décrit.
  -- Même liste d'identifiants que le `delete` qui suit. **Dans une sous-transaction** : si ce
  -- compte échoue, lui seul est annulé, et la suppression promise a lieu quand même (en-tête).
  begin
    insert into public.purges_par_cohorte (semaine_d_arrivee, etape, semaines_tenues, rappels_au_depart, comptes)
    select c.semaine_d_arrivee, c.etape, c.semaines_tenues, c.rappels_au_depart, count(*)::integer
    from unnest(v_a_supprimer) as candidat(id)
    cross join lateral public.cohorte_de(candidat.id) c
    group by c.semaine_d_arrivee, c.etape, c.semaines_tenues, c.rappels_au_depart
    on conflict (semaine_d_arrivee, etape, semaines_tenues, rappels_au_depart)
    do update set comptes = public.purges_par_cohorte.comptes + excluded.comptes;
  exception when others then
    v_echec_du_compte := format('Compteur des cohortes en échec, suppression faite quand même : %s (%s)',
                                sqlerrm, sqlstate);
    raise warning 'purge_stale_anonymous_accounts : %', v_echec_du_compte;
  end;

  -- Suppression par identifiants relevés juste au-dessus : la liste et le compte journalisé
  -- décrivent forcément les mêmes lignes, ce qu'un second passage du prédicat ne garantirait
  -- pas.
  delete from auth.users u
  where u.id = any(v_a_supprimer);

  get diagnostics v_supprimes = row_count;

  if v_bloque then
    insert into public.purge_runs (status, candidates, deleted, detail)
    values (
      'blocked',
      v_nb_candidats,
      v_supprimes,
      concat_ws(' — ',
        format(
          'Garde de volume : %s comptes anonymes porteurs (un bilan finalisé ou un retour) candidats sur %s, au-delà du seuil de %s (20 %%, plancher %s). Eux sont retenus, seuls les %s comptes vides sont partis — vérifier le prédicat d''inactivité avant de relancer.',
          v_nb_porteurs, v_total, v_seuil, c_plancher, v_supprimes
        ),
        v_echec_du_compte
      )
    );
  else
    insert into public.purge_runs (status, candidates, deleted, detail)
    values ('applied', v_nb_candidats, v_supprimes, v_echec_du_compte);
  end if;
end;
$function$;

-- ── 7. L'alerte : la taille de la base, et les signaux du serveur passent le plafond ────────

CREATE OR REPLACE FUNCTION public.releve_des_alertes(p_depuis timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select jsonb_build_object(
    'pannes', (
      select count(*) from public.usage_events
      where name = 'app_error' and occurred_at > p_depuis
    ),
    'pannes_detail', (
      select coalesce(jsonb_agg(ligne order by (ligne ->> 'nombre')::int desc), '[]'::jsonb)
      from (
        select jsonb_build_object('route', route, 'categorie', categorie, 'nombre', count(*)) as ligne
        from (
          -- La forme, jamais le texte du client (voir l'en-tête).
          select
            case when props ->> 'route' ~ '^/[a-z/_-]{0,47}$' then props ->> 'route'
              else 'route hors forme' end as route,
            case when props ->> 'category' ~ '^[a-z]{1,16}$' then props ->> 'category'
              else 'hors forme' end as categorie
          from public.usage_events
          where name = 'app_error' and occurred_at > p_depuis
        ) e
        group by route, categorie
        order by count(*) desc
        limit 5
      ) t
    ),
    'soumissions_en_echec', (
      select count(*) from public.usage_events
      where name = 'bilan_submit_error' and occurred_at > p_depuis
    ),
    'taches_en_echec', (
      select coalesce(jsonb_agg(distinct j.jobname), '[]'::jsonb)
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      where d.status = 'failed' and d.end_time > p_depuis
    ),
    'envois_en_echec', (
      select count(*) from public.reminder_send_runs
      where status in ('error', 'partial', 'skipped') and ran_at > p_depuis
    ),
    'synchronisations_en_echec', (
      select count(*) from public.emission_factor_sync_runs
      where status in ('error', 'partial') and ran_at > p_depuis
    ),
    'purges_bloquees', (
      select count(*) from public.purge_runs
      where status = 'blocked' and ran_at > p_depuis
    ),
    'plans_en_echec', (
      select coalesce(sum(echecs), 0) from public.plan_cycle_runs
      where ran_at > p_depuis
    ),
    -- La taille de la base, en Mo : au-delà de 500, le plan gratuit la passe en lecture seule pour
    -- tout le monde (passe avant le lancement, 05/10/2026).
    'taille_de_la_base_mo', (
      select (pg_database_size(current_database()) / 1048576)::integer
    ),
    'rappels_bloques', (
      select count(*) from analytics.rappels_bloques
      where not (genre = 'veille' and statut = 'failed')
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.alerte_a_dire(p_releve jsonb, p_rappels_bloques_vus integer)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select (p_releve ->> 'pannes')::int > 0
      or (p_releve ->> 'soumissions_en_echec')::int > 0
      or jsonb_array_length(p_releve -> 'taches_en_echec') > 0
      or (p_releve ->> 'envois_en_echec')::int > 0
      or (p_releve ->> 'synchronisations_en_echec')::int > 0
      or (p_releve ->> 'purges_bloquees')::int > 0
      or coalesce((p_releve ->> 'plans_en_echec')::int, 0) > 0
      or (p_releve ->> 'rappels_bloques')::int > p_rappels_bloques_vus
      or coalesce((p_releve ->> 'taille_de_la_base_mo')::int, 0) >= 300;
$function$;

-- Ce que seul le serveur écrit : une tâche, un envoi, une synchronisation, une purge, un plan, un
-- rappel bloqué. Les pannes et les soumissions en échec viennent des clients, et la taille de la base
-- reste sous le plafond — elle ne baisse pas d'une heure à l'autre, et l'alerte la redirait à chaque
-- passage.
create or replace function public.alerte_du_serveur(p_releve jsonb, p_rappels_bloques_vus integer)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_array_length(p_releve -> 'taches_en_echec') > 0
      or (p_releve ->> 'envois_en_echec')::int > 0
      or (p_releve ->> 'synchronisations_en_echec')::int > 0
      or (p_releve ->> 'purges_bloquees')::int > 0
      or coalesce((p_releve ->> 'plans_en_echec')::int, 0) > 0
      or (p_releve ->> 'rappels_bloques')::int > p_rappels_bloques_vus;
$$;

revoke execute on function public.alerte_du_serveur(jsonb, integer) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.texte_de_l_alerte(p_releve jsonb, p_depuis timestamp with time zone, p_rappels_bloques_vus integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_lignes text[] := array[]::text[];
  v_detail text;
begin
  if (p_releve ->> 'pannes')::int > 0 then
    select string_agg(format('%s · %s (%s)', l ->> 'route', l ->> 'categorie', l ->> 'nombre'), ', ')
      into v_detail
    from jsonb_array_elements(p_releve -> 'pannes_detail') as l;
    v_lignes := v_lignes || format('- Pannes de l''app (app_error) : %s — %s', p_releve ->> 'pannes', v_detail);
  end if;
  if (p_releve ->> 'soumissions_en_echec')::int > 0 then
    v_lignes := v_lignes || format('- Soumissions de bilan en échec (bilan_submit_error) : %s', p_releve ->> 'soumissions_en_echec');
  end if;
  if jsonb_array_length(p_releve -> 'taches_en_echec') > 0 then
    select string_agg(t, ', ') into v_detail from jsonb_array_elements_text(p_releve -> 'taches_en_echec') as t;
    v_lignes := v_lignes || format('- Tâches planifiées en échec : %s', v_detail);
  end if;
  if (p_releve ->> 'envois_en_echec')::int > 0 then
    v_lignes := v_lignes || format('- Passages d''envoi des rappels en échec, partiels ou sautés : %s', p_releve ->> 'envois_en_echec');
  end if;
  if (p_releve ->> 'synchronisations_en_echec')::int > 0 then
    v_lignes := v_lignes || format('- Synchronisations des facteurs ADEME non réussies : %s', p_releve ->> 'synchronisations_en_echec');
  end if;
  if (p_releve ->> 'purges_bloquees')::int > 0 then
    v_lignes := v_lignes || format('- Purges des sessions anonymes bloquées : %s', p_releve ->> 'purges_bloquees');
  end if;
  if coalesce((p_releve ->> 'plans_en_echec')::int, 0) > 0 then
    v_lignes := v_lignes || format('- Échecs de la préparation nocturne des plans (generate_plan_cycles) : %s', p_releve ->> 'plans_en_echec');
  end if;
  if coalesce((p_releve ->> 'taille_de_la_base_mo')::int, 0) >= 300 then
    v_lignes := v_lignes || format('- Taille de la base : %s Mo, sur les 500 du plan gratuit — au-delà, elle passe en lecture seule pour tout le monde',
      p_releve ->> 'taille_de_la_base_mo');
  end if;
  if (p_releve ->> 'rappels_bloques')::int > p_rappels_bloques_vus then
    v_lignes := v_lignes || format('- Rappels bloqués : %s (%s de plus qu''au relevé précédent)',
      p_releve ->> 'rappels_bloques', (p_releve ->> 'rappels_bloques')::int - p_rappels_bloques_vus);
  end if;

  return format(
    E'Bonjour,\n\nDepuis le %s (heure de Paris), l''exploitation de Ramille a relevé :\n\n%s\n\n'
    'Les requêtes pour y voir clair : docs/exploitation/README.md §8, et docs/exploitation/remontee-erreurs.md §4 '
    'pour les pannes de l''app.\n\n'
    'Pour couper ces alertes : tableau de bord Supabase, Table Editor, table alertes_d_exploitation, décocher « actives ».',
    to_char(p_depuis at time zone 'Europe/Paris', 'DD/MM/YYYY à HH24"h"MI'),
    array_to_string(v_lignes, E'\n')
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.verifier_les_alertes()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r public.alertes_d_exploitation%rowtype;
  v_releve jsonb;
  v_bloques integer;
  v_envois integer;
  v_destinataire text;
  v_cle text;
  v_expediteur text;
  v_reponse extensions.http_response;
  v_resume text;
begin
  select * into r from public.alertes_d_exploitation where id for update;
  if not found then
    insert into public.alertes_d_exploitation (id) values (true) returning * into r;
  end if;

  v_releve := public.releve_des_alertes(r.derniere_verification);
  v_bloques := (v_releve ->> 'rappels_bloques')::int;
  v_envois := case when r.jour_des_envois = current_date then r.envois_du_jour else 0 end;

  -- Coupée : la fenêtre avance quand même, pour qu'une alerte rallumée ne rapporte pas l'historique.
  if not r.actives then
    v_resume := 'Coupée.';
    update public.alertes_d_exploitation
    set derniere_verification = now(), dernier_passage = now(), rappels_bloques_vus = v_bloques,
        dernier_resume = v_resume
    where id;
    return v_resume;
  end if;

  if not public.alerte_a_dire(v_releve, r.rappels_bloques_vus) then
    v_resume := 'Rien de neuf.';
    -- Des rappels bloqués qui retombent se retiennent aussi : s'ils remontent, ce sera du neuf.
    update public.alertes_d_exploitation
    set derniere_verification = now(), dernier_passage = now(), rappels_bloques_vus = v_bloques,
        dernier_resume = v_resume
    where id;
    return v_resume;
  end if;

  -- Plafond atteint, ou pas de destinataire : la fenêtre n'avance pas, rien ne se perd. **Le plafond ne
  -- retient que ce qu'un client peut écrire** (passe avant le lancement, 05/10/2026) : une panne par
  -- heure, émise par n'importe quelle session, consommait les envois du jour, et l'échec d'une tâche
  -- du soir n'était dit que le lendemain. Les signaux du serveur passent donc le plafond ; chacun ne
  -- se dit qu'une fois, puisque l'envoi fait avancer la fenêtre.
  if v_envois >= r.plafond_par_jour and not public.alerte_du_serveur(v_releve, r.rappels_bloques_vus) then
    v_resume := format('Plafond du jour atteint (%s) : le prochain envoi dira tout.', r.plafond_par_jour);
    update public.alertes_d_exploitation set dernier_passage = now(), dernier_resume = v_resume where id;
    return v_resume;
  end if;

  select decrypted_secret into v_destinataire from vault.decrypted_secrets where name = 'alerte_destinataire';
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'resend_api_key';
  select decrypted_secret into v_expediteur from vault.decrypted_secrets where name = 'reminder_from_address';
  if v_destinataire is null or v_cle is null or v_expediteur is null then
    v_resume := 'Rien n''est parti : il manque le secret Vault alerte_destinataire, resend_api_key ou reminder_from_address.';
    update public.alertes_d_exploitation set dernier_passage = now(), dernier_resume = v_resume where id;
    return v_resume;
  end if;

  begin
    -- Le délai des autres appels HTTP du dépôt. Celui de l'extension (5 s) laissait une réponse lente de
    -- Resend passer pour un échec : la fenêtre n'avançait pas, et le même e-mail, parti, repartait
    -- l'heure suivante sans que le plafond le compte.
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
    select * into v_reponse from extensions.http((
      'POST',
      'https://api.resend.com/emails',
      array[extensions.http_header('Authorization', 'Bearer ' || v_cle)],
      'application/json',
      jsonb_build_object(
        'from', v_expediteur,
        'to', jsonb_build_array(v_destinataire),
        'subject', format('Ramille — alerte d''exploitation du %s',
          to_char(now() at time zone 'Europe/Paris', 'DD/MM à HH24"h"MI')),
        'text', public.texte_de_l_alerte(v_releve, r.derniere_verification, r.rappels_bloques_vus)
      )::text
    )::extensions.http_request);
  exception when others then
    v_resume := 'L''envoi a échoué : ' || left(sqlerrm, 200);
    update public.alertes_d_exploitation set dernier_passage = now(), dernier_resume = v_resume where id;
    return v_resume;
  end;

  if v_reponse.status not between 200 and 299 then
    v_resume := format('L''envoi a été refusé : HTTP %s.', v_reponse.status);
    update public.alertes_d_exploitation set dernier_passage = now(), dernier_resume = v_resume where id;
    return v_resume;
  end if;

  v_resume := 'Envoyé.';
  update public.alertes_d_exploitation
  set derniere_verification = now(),
      dernier_passage = now(),
      dernier_envoi = now(),
      envois_du_jour = v_envois + 1,
      jour_des_envois = current_date,
      rappels_bloques_vus = v_bloques,
      dernier_resume = v_resume
  where id;
  return v_resume;
end;
$function$;

-- ── 8. Le lot de notifications : l'appel à part, et la coupe en deux ────────────────────────
--
-- Le jeton d'accès n'est joint que s'il existe dans Vault : sans la sécurité renforcée activée sur
-- expo.dev, l'envoi passe sans en-tête (v1-12 §7).
create or replace function public.envoyer_a_expo(p_messages jsonb, p_expo_token text)
returns extensions.http_response
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_headers extensions.http_header[];
  v_response extensions.http_response;
begin
  v_headers := array[extensions.http_header('accept', 'application/json')];
  if p_expo_token is not null then
    v_headers := v_headers || extensions.http_header('Authorization', 'Bearer ' || p_expo_token);
  end if;

  select * into v_response from extensions.http((
    'POST',
    'https://exp.host/--/api/v2/push/send',
    v_headers,
    'application/json',
    p_messages::text
  )::extensions.http_request);

  return v_response;
end;
$$;

revoke execute on function public.envoyer_a_expo(jsonb, text) from public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.envoyer_lot_push(p_lignes uuid[], p_jetons text[], p_messages jsonb, p_expo_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  -- Un échec repousse la ligne : la procédure enchaîne les passes dans la même nuit, et sans
  -- ce délai un refus passager brûlerait les trois tentatives en quelques minutes au lieu de
  -- laisser sa chance au cron du lendemain. Même valeur dans `send_pending_reminders`.
  c_delai_relance constant interval := interval '2 hours';

  v_response extensions.http_response;
  v_data jsonb;
  v_erreur text;
  v_lignes integer;
  v_envoyes integer := 0;
  v_replis integer := 0;
  v_ligne uuid;
  v_tickets jsonb;
  v_uniques uuid[];
  v_premiere uuid[];
  v_a jsonb;
  v_b jsonb;
begin
  if p_lignes is null or array_length(p_lignes, 1) is null then
    return jsonb_build_object('envoyes', 0, 'echecs', 0, 'replis', 0);
  end if;

  select count(distinct l)::integer into v_lignes from unnest(p_lignes) as l;

  begin
    -- L'appel lui-même vit dans `envoyer_a_expo`, pour qu'un test puisse le remplacer.
    select * into v_response from public.envoyer_a_expo(p_messages, p_expo_token);

    if v_response.status between 200 and 299 then
      v_data := (v_response.content::jsonb) -> 'data';
    else
      v_erreur := 'HTTP ' || v_response.status || ' — ' || left(coalesce(v_response.content, ''), 300);
    end if;
  exception when others then
    v_erreur := left(sqlerrm, 300);
  end;

  -- Les tickets se lisent **par position** : une réponse dont le nombre de tickets ne
  -- correspond pas au nombre de notifications envoyées ne s'interprète pas, et deviner
  -- désactiverait le mauvais jeton. Deux `if` imbriqués plutôt qu'un `or` : l'ordre
  -- d'évaluation d'un `or` n'est pas garanti, et `jsonb_array_length` lève sur un scalaire.
  if v_erreur is null then
    if v_data is null or jsonb_typeof(v_data) <> 'array' then
      v_erreur := format('réponse Expo inattendue : %s au lieu d''un tableau de tickets',
                         coalesce(jsonb_typeof(v_data), 'rien'));
    elsif jsonb_array_length(v_data) <> array_length(p_jetons, 1) then
      v_erreur := format('réponse Expo inattendue : %s ticket(s) pour %s notification(s)',
                         jsonb_array_length(v_data), array_length(p_jetons, 1));
    end if;
  end if;

  -- **Un 400 sur un lot de plusieurs comptes se coupe en deux** (passe avant le lancement, 05/10/2026) :
  -- Expo refuse le lot **entier** quand il mêle des jetons de plusieurs projets
  -- (`PUSH_TOO_MANY_EXPERIENCE_IDS`), et n'importe qui peut enregistrer le jeton d'une app Expo à
  -- lui. Une ligne faisait alors tomber jusqu'à cent rappels, trois nuits de suite. La coupe suit
  -- les lignes, jamais les jetons : une ligne aux jetons répartis sur deux moitiés serait jugée
  -- « tous refusés » dans l'une alors que l'autre est partie. Au bout, la ligne fautive échoue seule.
  if v_erreur is not null and v_response.status = 400 then
    select array_agg(l order by l) into v_uniques from (select distinct l from unnest(p_lignes) as l) d;
    if array_length(v_uniques, 1) > 1 then
      v_premiere := v_uniques[1:array_length(v_uniques, 1) / 2];
      select public.envoyer_lot_push(
               array_agg(p_lignes[i] order by i), array_agg(p_jetons[i] order by i),
               jsonb_agg(p_messages -> (i - 1) order by i), p_expo_token)
        into v_a
      from generate_subscripts(p_lignes, 1) as i
      where p_lignes[i] = any(v_premiere);
      select public.envoyer_lot_push(
               array_agg(p_lignes[i] order by i), array_agg(p_jetons[i] order by i),
               jsonb_agg(p_messages -> (i - 1) order by i), p_expo_token)
        into v_b
      from generate_subscripts(p_lignes, 1) as i
      where not (p_lignes[i] = any(v_premiere));
      return jsonb_build_object(
        'envoyes', (v_a ->> 'envoyes')::int + (v_b ->> 'envoyes')::int,
        'echecs', (v_a ->> 'echecs')::int + (v_b ->> 'echecs')::int,
        'replis', (v_a ->> 'replis')::int + (v_b ->> 'replis')::int);
    end if;
  end if;

  if v_erreur is not null then
    -- Rien n'est parti : le marquage `sent` posé avant l'appel est défait. `attempts` a déjà
    -- été incrémenté par ce marquage, d'où le test sur sa valeur courante.
    update public.notification_outbox
    set status = case when attempts >= 3 then 'failed' else 'pending' end,
        sent_at = null,
        send_after = now() + c_delai_relance,
        last_error = v_erreur
    where id = any(p_lignes);

    return jsonb_build_object('envoyes', 0, 'echecs', v_lignes, 'replis', 0);
  end if;

  -- Un jeton qu'Expo ne reconnaît plus : app désinstallée, ou permission retirée. On le
  -- désactive pour ne plus pousser dans le vide — pousser vers des jetons morts dégrade la
  -- réputation de l'app auprès de FCM.
  update public.push_tokens t
  set disabled_at = now(), disabled_reason = 'DeviceNotRegistered'
  from (
    select p_jetons[i] as token
    from generate_subscripts(p_jetons, 1) as i
    where (v_data -> (i - 1)) #>> '{details,error}' = 'DeviceNotRegistered'
  ) d
  where t.token = d.token and t.disabled_at is null;

  -- Une ligne d'outbox peut avoir plusieurs appareils : elle est partie dès qu'un ticket est
  -- accepté, et ne se replie sur l'email que si tous ont été refusés.
  for v_ligne, v_tickets in
    select d.ligne,
           jsonb_object_agg(d.ticket, d.token) filter (where d.accepte and d.ticket is not null)
    from (
      select p_lignes[i] as ligne,
             p_jetons[i] as token,
             (v_data -> (i - 1)) ->> 'id' as ticket,
             ((v_data -> (i - 1)) ->> 'status') = 'ok' as accepte
      from generate_subscripts(p_lignes, 1) as i
    ) d
    group by d.ligne
  loop
    if v_tickets is null then
      -- **Un repli ne coûte pas deux tentatives sur trois.** Le marquage avant appel en a
      -- consommé une pour le push, et la branche email en consommera une à son tour dès que
      -- l'expéditeur est configuré — dans la **même** passe, puisque c'est tout le correctif
      -- A9-12. Sans ce rendu, un compte dont le seul appareil est refusé serait classé `failed`
      -- après deux nuits au lieu de trois. L'autre repli, celui de `send_pending_reminders`
      -- (« aucun jeton actif »), n'a jamais incrémenté : aucun appel n'y a eu lieu.
      update public.notification_outbox
      set attempts = greatest(attempts - 1, 0)
      where id = v_ligne;

      perform public.replier_rappel_sur_email(v_ligne, 'tous les jetons refusés');
      v_replis := v_replis + 1;
    else
      -- La ligne est déjà `sent` (marquage avant appel) : il ne reste qu'à ranger les tickets,
      -- sans quoi les reçus ne sauraient pas quel jeton désactiver.
      update public.notification_outbox
      set provider_ticket = v_tickets
      where id = v_ligne;
      v_envoyes := v_envoyes + 1;
    end if;
  end loop;

  return jsonb_build_object('envoyes', v_envoyes, 'echecs', 0, 'replis', v_replis);
end;
$function$;

-- ── 9. Le rattachement : un captcha par code, et des plafonds du jour ───────────────────────
--
-- Une ligne par compte : l'autorisation en cours, et les essais de l'heure — chaque essai est un appel
-- à Cloudflare depuis la base, donc il se plafonne aussi. Ni l'app ni personne ne la lit ; la cascade
-- l'emporte avec le compte.

create table if not exists public.autorisations_de_rattachement (
  user_id uuid primary key references auth.users (id) on delete cascade,
  accordee_le timestamptz,
  essais integer not null default 0,
  essais_depuis timestamptz not null default now()
);

alter table public.autorisations_de_rattachement enable row level security;
revoke all on table public.autorisations_de_rattachement from public, anon, authenticated, service_role;

comment on table public.autorisations_de_rattachement is
  'Le captcha vérifié avant un code de rattachement : accordee_le vaut dix minutes et un seul code, que le hook d''envoi consomme. essais compte les vérifications de l''heure (passe avant le lancement, 05/10/2026).';

-- La vérification elle-même, à part pour qu'un test la remplace : la CI n'a pas de secret, et un vrai
-- appel à Cloudflare n'a rien à faire dans un test. Ne lève jamais : un Cloudflare injoignable vaut
-- un refus, que l'app dit comme une panne.
create or replace function public.verifier_le_jeton_du_captcha(p_secret text, p_jeton text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reponse extensions.http_response;
  v_contenu jsonb;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '3000');
  select * into v_reponse from extensions.http((
    'POST',
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    null,
    'application/x-www-form-urlencoded',
    'secret=' || extensions.urlencode(p_secret) || '&response=' || extensions.urlencode(p_jeton)
  )::extensions.http_request);

  if v_reponse.status not between 200 and 299 then
    return false;
  end if;
  v_contenu := v_reponse.content::jsonb;
  -- L'action est celle que l'app donne au widget (`UsageDuCaptcha`) : un jeton obtenu pour autre chose
  -- ne vaut pas ici. **Absente, elle ne refuse pas** : les clés d'essai de Cloudflare ne la rendent
  -- pas (mesuré le 05/10/2026), et un jeton est à usage unique — celui d'un autre usage a déjà été
  -- consommé par Supabase, et Cloudflare le refuserait de toute façon.
  return coalesce((v_contenu ->> 'success')::boolean, false)
     and coalesce(v_contenu ->> 'action', 'rattachement') = 'rattachement';
exception when others then
  return false;
end;
$$;

revoke execute on function public.verifier_le_jeton_du_captcha(text, text) from public, anon, authenticated, service_role;

create or replace function public.autoriser_le_rattachement(p_jeton text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_essais_par_heure constant integer := 10;
  v_user uuid := auth.uid();
  v_secret text;
  v_essais integer;
begin
  if v_user is null then
    raise exception 'Aucune session.' using errcode = 'insufficient_privilege';
  end if;

  -- Sans le secret, rien n'est exigé — et le hook n'exige rien non plus (même test, même secret).
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'turnstile_secret_rattachement';
  if coalesce(v_secret, '') = '' then
    return true;
  end if;

  if coalesce(p_jeton, '') = '' or length(p_jeton) > 2048 then
    return false;
  end if;

  -- L'essai se compte avant l'appel, et reste compté : la fonction rend `false`, elle ne lève pas.
  insert into public.autorisations_de_rattachement as a (user_id, essais, essais_depuis)
  values (v_user, 1, now())
  on conflict (user_id) do update
    set essais = case when a.essais_depuis > now() - interval '1 hour' then a.essais + 1 else 1 end,
        essais_depuis = case when a.essais_depuis > now() - interval '1 hour' then a.essais_depuis else now() end
  returning essais into v_essais;

  if v_essais > c_essais_par_heure or not public.verifier_le_jeton_du_captcha(v_secret, p_jeton) then
    return false;
  end if;

  update public.autorisations_de_rattachement set accordee_le = now() where user_id = v_user;
  return true;
end;
$$;

revoke execute on function public.autoriser_le_rattachement(text) from public, anon, authenticated;
grant execute on function public.autoriser_le_rattachement(text) to authenticated;

alter table public.envois_d_e_mails_d_auth
  drop constraint if exists envois_d_e_mails_d_auth_issue_check;
alter table public.envois_d_e_mails_d_auth
  add constraint envois_d_e_mails_d_auth_issue_check
  check (issue in ('envoye', 'plafond_compte', 'plafond_adresse', 'plafond_projet', 'type_ignore',
                   'plafond_compte_jour', 'sans_captcha'));

create or replace function public.envoyer_l_e_mail_d_auth(event jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  c_par_compte_par_heure constant integer := 5;
  c_par_compte_par_jour constant integer := 10;
  -- Le plafond de l'adresse compte sur vingt-quatre heures, et non plus sur une heure (passe avant le
  -- lancement, 05/10/2026) : à l'heure, une adresse recevait 120 codes par jour.
  c_par_adresse_par_jour constant integer := 5;
  c_projet_par_jour_brevo constant integer := 200;
  c_projet_par_jour_resend constant integer := 60;
  v_projet_par_jour integer;
  v_type text := event -> 'email_data' ->> 'email_action_type';
  v_user uuid := nullif(event -> 'user' ->> 'id', '')::uuid;
  v_adresse text;
  v_code text;
  v_empreinte bytea;
  v_jour integer;
  v_compte integer;
  v_par_adresse integer;
  v_compte_jour integer;
  v_autorise boolean;
  v_plafond text;
  v_fournisseur text;
  v_secret text;
  v_requete extensions.http_request;
  v_sujet text;
  v_html text;
  v_reponse extensions.http_response;
begin
  if v_type = 'email_change' then
    -- Avec « Secure email change » (allumé sur la production), un compte qui a déjà une adresse
    -- reçoit deux codes, un par adresse — un parcours que le produit n'offre pas : ne lui en envoyer
    -- qu'un le laisserait dans une impasse muette. Une session anonyme n'a pas d'adresse, et un seul
    -- code, dans `token` (mesuré le 05/10/2026).
    if coalesce(event -> 'user' ->> 'email', '') <> '' and coalesce(event -> 'email_data' ->> 'token_new', '') <> '' then
      return jsonb_build_object('error', jsonb_build_object(
        'http_code', 400, 'message', 'Changer l''adresse d''un compte n''est pas pris en charge.'));
    end if;
    v_adresse := event -> 'user' ->> 'new_email';
    -- `token_new` n'est rempli qu'avec deux codes, que la garde ci-dessus vient d'écarter ; le prendre
    -- d'abord suit la documentation de Supabase, qui l'apparie à la nouvelle adresse.
    v_code := coalesce(nullif(event -> 'email_data' ->> 'token_new', ''), event -> 'email_data' ->> 'token');
  elsif v_type = 'magiclink' then
    v_adresse := event -> 'user' ->> 'email';
    v_code := event -> 'email_data' ->> 'token';
  else
    insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue)
    values (v_user, sha256(convert_to(lower(btrim(coalesce(event -> 'user' ->> 'email', ''))), 'UTF8')),
            coalesce(v_type, ''), 'type_ignore');
    return '{}'::jsonb;
  end if;

  if coalesce(v_adresse, '') = '' or coalesce(v_code, '') = '' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 500, 'message', 'E-mail d''authentification sans adresse ou sans code.'));
  end if;

  v_empreinte := sha256(convert_to(lower(btrim(v_adresse)), 'UTF8'));

  -- Brevo si sa clé est posée, sinon Resend, sinon le collecteur de la stack locale (en-tête de la
  -- migration) : la bascule se fait en posant la clé, et se défait en la retirant. **Avant les
  -- plafonds**, parce que celui du jour dépend de qui envoie : 200 sur les 300 de Brevo, 60 sur les
  -- 100 de Resend, qui les partage avec les rappels.
  select f.fournisseur, f.secret into v_fournisseur, v_secret from public.fournisseur_d_e_mail_d_auth() f;
  v_projet_par_jour := case when v_fournisseur = 'brevo' then c_projet_par_jour_brevo else c_projet_par_jour_resend end;

  -- Les plafonds ne valent que pour le rattachement (en-tête de la migration) : une reconnexion coûte
  -- déjà une case cochée par code, et la plafonner laissait n'importe qui bloquer celle d'un autre.
  if v_type = 'email_change' then
    -- **Un code de rattachement coûte un captcha** (passe avant le lancement, 05/10/2026) : Supabase
    -- ne vérifie pas de jeton sur `updateUser`, et une seule session envoyait 120 codes par jour à
    -- l'adresse de quelqu'un d'autre. L'app obtient d'abord une autorisation par
    -- `autoriser_le_rattachement`, qui vérifie le jeton auprès de Cloudflare ; elle vaut dix minutes
    -- et un seul code. Sans le secret Vault, rien n'est exigé : la stack locale et la CI n'en ont pas.
    -- Muet comme les plafonds : l'app a déjà su, à l'autorisation, que le captcha était refusé.
    if exists (select 1 from vault.decrypted_secrets
                where name = 'turnstile_secret_rattachement' and coalesce(decrypted_secret, '') <> '') then
      update public.autorisations_de_rattachement
         set accordee_le = null
       where user_id = v_user and accordee_le > now() - interval '10 minutes'
      returning true into v_autorise;
      if not coalesce(v_autorise, false) then
        insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue)
        values (v_user, v_empreinte, v_type, 'sans_captcha');
        return '{}'::jsonb;
      end if;
    end if;

    -- Deux demandes simultanées vers la même adresse compteraient le même passé : une à la fois, pour
    -- cette adresse seulement. Le verrou tient jusqu'à la fin de la transaction d'Auth, envoi compris :
    -- un verrou commun à tout le projet ferait attendre chaque demande derrière l'envoi des autres,
    -- dans ses deux secondes. Entre adresses différentes, des demandes simultanées peuvent donc
    -- dépasser le plafond du projet, d'autant qu'elles sont nombreuses à la même seconde ; c'est accepté.
    perform pg_advisory_xact_lock(hashtext('envois_d_e_mails_d_auth:' || encode(v_empreinte, 'hex')));
    select count(*),
           count(*) filter (where user_id = v_user and cree_le > now() - interval '1 hour'),
           count(*) filter (where adresse_empreinte = v_empreinte),
           count(*) filter (where user_id = v_user)
      into v_jour, v_compte, v_par_adresse, v_compte_jour
      from public.envois_d_e_mails_d_auth
     where issue = 'envoye'
       and type = 'email_change'
       and cree_le > now() - interval '24 hours';

    v_plafond := case
      when v_jour >= v_projet_par_jour then 'plafond_projet'
      when v_compte >= c_par_compte_par_heure then 'plafond_compte'
      -- Cinq par adresse et par jour, tous comptes confondus : un code, deux renvois et deux essais
      -- ratés pour la personne, et plus 120 codes par jour pour un tiers qu'on vise.
      when v_par_adresse >= c_par_adresse_par_jour then 'plafond_adresse'
      -- Dix par compte et par jour, en plus des cinq de l'heure (passe avant le lancement, 05/10/2026).
      when v_compte_jour >= c_par_compte_par_jour then 'plafond_compte_jour'
    end;

    if v_plafond is not null then
      -- Muet, quel que soit le plafond (en-tête de la migration).
      insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue)
      values (v_user, v_empreinte, v_type, v_plafond);
      return '{}'::jsonb;
    end if;
  end if;

  -- Sans aucun fournisseur, l'erreur vient après les plafonds, comme avant : une demande tue reste muette.
  if v_fournisseur is null then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 500, 'message',
      'Aucun moyen d''envoi : il manque les secrets Vault brevo_api_key_connexion et resend_api_key_connexion.'));
  end if;

  select r.sujet, r.html into v_sujet, v_html from public.rendre_l_e_mail_d_auth(v_type, v_code, v_adresse) r;

  -- La requête se construit hors du bloc qui rattrape l'échec de l'envoi : seul l'appel réseau y est.
  v_requete := public.requete_d_e_mail_d_auth(v_fournisseur, v_secret, v_adresse, v_sujet, v_html);

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '1500');
    select * into v_reponse from extensions.http(v_requete);
  exception when others then
    -- Un 500 : l'app le lit comme une panne de transport (« Ta demande n'a pas abouti »), et c'en est
    -- une. Le dépassement des deux secondes, lui, n'arrive pas ici (`query_canceled` échappe à
    -- `others`) : Supabase rend son propre 500.
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 500, 'message', 'L''envoi de l''e-mail a échoué.'));
  end;

  if v_reponse.status not between 200 and 299 then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 500, 'message', format('L''envoi de l''e-mail a été refusé (HTTP %s).', v_reponse.status)));
  end if;

  insert into public.envois_d_e_mails_d_auth (user_id, adresse_empreinte, type, issue, statut_http, fournisseur)
  values (v_user, v_empreinte, v_type, 'envoye', v_reponse.status, v_fournisseur);
  return '{}'::jsonb;
end;
$function$;

revoke execute on function public.envoyer_l_e_mail_d_auth(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.envoyer_l_e_mail_d_auth(jsonb) to supabase_auth_admin;
-- Le hook lit et consomme l'autorisation : ses droits sont ceux de `postgres` (`security definer`),
-- rien à accorder à `supabase_auth_admin`.

-- ── 10. Aucun compte ne naît hors d'une session anonyme ─────────────────────────────────────
--
-- Le hook `before_user_created` d'Auth : allumé dans `supabase/config.toml` pour la stack locale, et
-- dans le tableau de bord (Authentication → Hooks) pour la production. Une erreur rendue ici fait
-- répondre 403 à `/signup` comme à `/otp`, et rien n'est créé.
create or replace function public.avant_la_creation_d_un_compte(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if coalesce((event -> 'user' ->> 'is_anonymous')::boolean, false) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Un compte Ramille naît d''une session anonyme : la création directe n''est pas ouverte.'));
end;
$$;

revoke execute on function public.avant_la_creation_d_un_compte(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.avant_la_creation_d_un_compte(jsonb) to supabase_auth_admin;
