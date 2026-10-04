-- Le plan anti-abus, troisième brique (décision de la personne qui pilote, 04/10/2026, `v1-27`
-- §12.35) : des plafonds pour tout le projet, et une purge des sessions anonymes qui tient quand
-- des milliers d'entre elles arrivent d'un coup. Côté serveur, sans build. Le captcha, les
-- plafonds d'e-mail et la carte de partage suivent dans leurs propres chantiers.
--
-- Les fonctions réécrites partent de `pg_get_functiondef` du distant (SUPABASE.md §2.3), et gagnent
-- `pg_temp` en fin de `search_path` au passage (v1-27 §12.35).

-- ── 1. Des plafonds pour tout le projet, en plus de ceux de chaque compte ────────────────────
--
-- Chaque compte a ses plafonds (500 événements d'usage et 10 retours par jour), mais une session
-- anonyme s'ouvre sans limite autre que celle de l'adresse IP (30 par heure) : chaque session neuve
-- repartait à zéro. Ces plafonds-ci bornent ce que la base reçoit en tout, quel que soit le nombre
-- de comptes qui écrivent. Dimensionnés sur la production du 04/10/2026 — 109 événements dans
-- l'heure la plus chargée, aucun retour encore — avec la marge d'un vrai pic d'ouverture :
--   - 6 000 événements d'usage par heure, toutes sortes confondues : au-delà, 144 000 lignes par
--     jour, de quoi remplir la base gratuite en quelques semaines ;
--   - 300 pannes (`app_error`) par heure, une part de ce total : au-delà, elles ne disent plus rien
--     de neuf, et l'alerte d'exploitation en compte déjà ;
--   - 60 retours par heure : c'est le seul canal où quelqu'un écrit un texte libre.
-- Au-delà, l'écriture est refusée comme celle d'un compte au-delà de son plafond : `check_violation`
-- pour un événement (le client l'abandonne, et ne garde pas la panne pour la renvoyer), `RM002`
-- pour un retour, dont le message s'affiche tel quel (phrase choisie par la personne qui pilote,
-- le 04/10/2026 : sans « on les lit tous », une promesse qu'un flot de robots noierait).
--
-- **Le refus ne vise que les comptes nés depuis moins de vingt-quatre heures** (contre-lecture du
-- même soir). Ce que le plafond compte, c'est tout le projet ; mais un `app_open` refusé est un signe
-- de vie perdu (`dernier_signe_de_vie`), que lisent le régime des rappels et la purge — un flot tenu
-- des jours, sans captcha, aurait fait glisser les vrais comptes vers « espace » puis « silence ». Le
-- vecteur, ce sont des sessions neuves en masse : elles seules se heurtent au plafond, et les comptes
-- plus anciens écrivent comme avant, bornés par leur propre plafond.
create index if not exists usage_events_occurred_at_idx on public.usage_events (occurred_at desc);

create or replace function public.enforce_usage_events_rate_limit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  max_per_day constant integer := 500;
  max_par_heure_pour_tous constant integer := 6000;
  max_pannes_par_heure_pour_tous constant integer := 300;
begin
  -- `offset n - 1 limit 1` trouve une ligne si et seulement s'il en existe déjà au moins n : la
  -- n+1ᵉ est donc refusée, sans compter toute la fenêtre.
  perform 1
  from public.usage_events
  where user_id = new.user_id and occurred_at > now() - interval '24 hours'
  offset max_per_day - 1 limit 1;

  if found then
    raise exception 'Trop d''événements d''usage pour cet utilisateur sur 24 h.'
      using errcode = 'check_violation';
  end if;

  -- Le plafond de tout le projet ne s'applique qu'aux comptes nés depuis moins de vingt-quatre heures
  -- (en-tête) : un compte plus ancien n'est pas le vecteur, et son ouverture est un signe de vie.
  if not exists (
    select 1 from auth.users u where u.id = new.user_id and u.created_at > now() - interval '24 hours'
  ) then
    return new;
  end if;

  perform 1
  from public.usage_events
  where occurred_at > now() - interval '1 hour'
  offset max_par_heure_pour_tous - 1 limit 1;

  if found then
    raise exception 'Trop d''événements d''usage pour tout le projet sur une heure.'
      using errcode = 'check_violation';
  end if;

  if new.name = 'app_error' then
    perform 1
    from public.usage_events
    where name = 'app_error' and occurred_at > now() - interval '1 hour'
    offset max_pannes_par_heure_pour_tous - 1 limit 1;

    if found then
      raise exception 'Trop de pannes remontées pour tout le projet sur une heure.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$function$;

-- `security definer` désormais, et ce n'est pas un détail : le plafond de tout le projet compte des
-- retours que l'appelant n'a pas le droit de lire — la policy ne lui montre que les siens, et le
-- compte rendrait toujours ce qu'il a lui-même écrit (SUPABASE.md §2.2, le piège déjà payé par
-- `usage_events`).
create or replace function public.enforce_feedback_rate_limit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  max_per_day constant integer := 10;
  max_par_heure_pour_tous constant integer := 60;
  v_recent integer;
begin
  select count(*) into v_recent
  from public.feedback
  where user_id = new.user_id and created_at > now() - interval '24 hours';

  -- `RM002` : classe réservée aux conditions applicatives, reconnue par le client. Le message
  -- reste celui qui s'affiche — il s'adresse à la personne, pas au développeur.
  if v_recent >= max_per_day then
    raise exception 'Tu as déjà envoyé plusieurs retours aujourd''hui. Reviens demain, on les lit tous.'
      using errcode = 'RM002';
  end if;

  -- Comme les événements : le plafond de tout le projet ne refuse que les comptes nés depuis moins
  -- de vingt-quatre heures.
  if exists (
    select 1 from auth.users u where u.id = new.user_id and u.created_at > now() - interval '24 hours'
  ) then
    perform 1
    from public.feedback
    where created_at > now() - interval '1 hour'
    offset max_par_heure_pour_tous - 1 limit 1;

    if found then
      raise exception 'Beaucoup de retours arrivent en ce moment. Réessaie un peu plus tard.'
        using errcode = 'RM002';
    end if;
  end if;

  return new;
end;
$function$;

revoke execute on function public.enforce_feedback_rate_limit() from public, anon, authenticated;

-- ── 2. La purge des sessions anonymes ne se laisse plus geler par des comptes vides ───────────
--
-- La garde de volume (20 % des comptes anonymes, plancher 50, `20260910100000`) retient tout un
-- passage dont les candidats sont trop nombreux : c'est elle qui protège d'un prédicat d'inactivité
-- faux. Mais des sessions de robots — vides, créées en masse, muettes ensemble quatre-vingt-dix jours
-- plus tard — la faisaient tomber pour tout le monde, chaque nuit : la purge ne purgeait plus rien.
-- Elle ne compte désormais que les comptes qui portent quelque chose (un bilan, un retour), au
-- dénominateur comme au numérateur ; les comptes vides partent à chaque passage, garde ou pas. Un
-- passage retenu dit toujours `blocked`, avec ce qu'il a quand même supprimé.
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
  select count(*) into v_total
  from auth.users u
  where u.is_anonymous = true
    and (exists (select 1 from public.assessments a where a.user_id = u.id)
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
           exists (select 1 from public.assessments a where a.user_id = candidat.id)
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
          'Garde de volume : %s comptes anonymes porteurs (un bilan ou un retour) candidats sur %s, au-delà du seuil de %s (20 %%, plancher %s). Eux sont retenus, seuls les %s comptes vides sont partis — vérifier le prédicat d''inactivité avant de relancer.',
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

comment on table public.purge_runs is
  'Journal des passages de purge_stale_anonymous_accounts(). status = blocked : la garde de volume a retenu les comptes qui portent un bilan ou un retour ; deleted dit les comptes vides partis quand même (depuis le 04/10/2026). Écrit par le serveur, jamais lu par un client.';

comment on function public.purge_stale_anonymous_accounts() is
  'Supprime les sessions anonymes muettes depuis 90 jours. La garde de volume (20 %, plancher 50) ne compte que les comptes qui portent un bilan ou un retour : au-delà, elle les retient, et les comptes vides partent quand même (depuis le 04/10/2026). Compte les cohortes avant de supprimer, et journalise chaque passage dans purge_runs.';

-- ── 3. La vue des départs compte les comptes vides partis sous un passage retenu ───────────────
--
-- `analytics.departs_par_mois` additionnait `deleted` des seuls passages `applied` : un passage retenu
-- supprime désormais les comptes vides, et `purges_par_cohorte` les compte — la vue les aurait
-- perdus, et le rapprochement du registre d'exploitation (§8.5 bis) aurait montré un écart qui n'en
-- est pas un. Réécrite depuis le corps du distant, seul le filtre de `sum(r.deleted)` part.
create or replace view analytics.departs_par_mois as
 WITH partis AS (
         SELECT date_trunc('month'::text, (COALESCE(dernier_signe_de_vie(u.id, b.boucle), u.created_at) AT TIME ZONE 'UTC'::text))::date AS mois,
            count(*)::integer AS n
           FROM auth.users u
             CROSS JOIN LATERAL ( SELECT boucle_de_la_personne(u.id) AS boucle) b
          WHERE b.boucle IS NOT NULL AND regime_de_rappel(u.id, b.boucle) = 'silence'::text
          GROUP BY (date_trunc('month'::text, (COALESCE(dernier_signe_de_vie(u.id, b.boucle), u.created_at) AT TIME ZONE 'UTC'::text))::date)
        ), purges AS (
         SELECT date_trunc('month'::text, (r.ran_at AT TIME ZONE 'UTC'::text))::date AS mois,
            COALESCE(sum(r.deleted), 0::bigint)::integer AS n,
            count(*) FILTER (WHERE r.status = 'applied'::text)::integer AS appliques,
            count(*) FILTER (WHERE r.status = 'blocked'::text)::integer AS bloques
           FROM purge_runs r
          GROUP BY (date_trunc('month'::text, (r.ran_at AT TIME ZONE 'UTC'::text))::date)
        ), suppressions AS (
         SELECT s.mois,
            s.suppressions AS n
           FROM suppressions_de_compte_par_mois s
        ), mois AS (
         SELECT partis.mois
           FROM partis
        UNION
         SELECT purges.mois
           FROM purges
        UNION
         SELECT suppressions.mois
           FROM suppressions
        )
 SELECT m.mois,
    COALESCE(pa.n, 0) AS partis_en_silence,
    COALESCE(pu.n, 0) AS sessions_purgees,
    COALESCE(pu.appliques, 0) AS passages_de_purge,
    COALESCE(pu.bloques, 0) AS passages_bloques,
    COALESCE(su.n, 0) AS comptes_supprimes
   FROM mois m
     LEFT JOIN partis pa ON pa.mois = m.mois
     LEFT JOIN purges pu ON pu.mois = m.mois
     LEFT JOIN suppressions su ON su.mois = m.mois;

comment on view analytics.departs_par_mois is
  'Par mois (UTC) : les comptes partis en silence (régime de rappel, au mois de leur dernier signe de vie), les sessions purgées (au mois de la purge, passages appliqués et retenus confondus — un passage retenu supprime les comptes vides depuis le 04/10/2026 —, avec le nombre de chacun) et les comptes supprimés. Un compte n''est jamais dans deux colonnes ; des départs qui durent encore, pas un taux.';

-- ── 4. Le contrôle de fin : ce que les migrations suivantes ne doivent pas défaire ───────────────
--
-- Sur les corps installés, sans commentaires : le rejeu d'une migration ancienne qui réinstallerait
-- une purge sans cette garde, ou des plafonds sans leur borne d'âge, ferait tomber ce bloc au
-- prochain rejeu de celle-ci.
do $controle$
declare
  v_purge text := pg_get_functiondef('public.purge_stale_anonymous_accounts()'::regprocedure);
  v_evenements text := pg_get_functiondef('public.enforce_usage_events_rate_limit()'::regprocedure);
  v_retours text := pg_get_functiondef('public.enforce_feedback_rate_limit()'::regprocedure);
begin
  if position('v_nb_porteurs > v_seuil' in v_purge) = 0 then
    raise exception 'La garde de volume compte de nouveau les comptes vides';
  end if;
  if position('cohorte_de' in v_purge) = 0
     or position('cohorte_de' in v_purge) > position('delete from auth.users' in v_purge) then
    raise exception 'La purge ne compte plus ses cohortes avant de supprimer';
  end if;
  if position('exception when others' in v_purge) = 0 then
    raise exception 'Un compteur peut de nouveau empêcher la purge : sa sous-transaction a disparu';
  end if;
  if position('interval ''24 hours''' in v_evenements) = 0 or position('max_par_heure_pour_tous' in v_evenements) = 0 then
    raise exception 'Le plafond des événements a perdu sa borne de tout le projet ou son âge de compte';
  end if;
  if not (select prosecdef from pg_proc where oid = 'public.enforce_feedback_rate_limit()'::regprocedure)
     or position('max_par_heure_pour_tous' in v_retours) = 0 then
    raise exception 'Le plafond des retours ne compte plus ceux des autres';
  end if;
end;
$controle$;
