-- Les cohortes gardées avant la purge, et le compte des suppressions de compte par mois
--
-- Lot 6, première brique (décision du 27/09/2026, `docs/architecture/produit.md` §3 : « on garde
-- le chemin, sans segment ni identifiant »).
--
-- ## Le défaut
--
-- `purge_stale_anonymous_accounts()` supprime une ligne d'`auth.users`, et la cascade emporte tout
-- ce que la personne avait fait — ouvertures, bilan, engagement, points. Elle est pourtant le seul
-- événement du produit qui soit un départ **certain**. Ce qui en survivait était un compte
-- (`purge_runs.candidates`, `.deleted`) : combien partent, jamais après quoi. Toute mesure de forme
-- cohorte devait donc être agrégée **avant** la cascade. Même chose pour `delete_my_account`, qui
-- efface les deux côtés de son propre entonnoir : le compte des suppressions faites ne peut vivre
-- que dans une table hors de la cascade.
--
-- ## Ce que cette migration ajoute
--
-- Deux tables de compteurs, **sans aucune clé étrangère** vers `auth.users` ni `profiles` — c'est
-- ce qui les fait survivre à la cascade —, et **sans identifiant** : ni `user_id`, ni adresse, ni
-- horodatage à la seconde. Des lundis, des premiers du mois, des valeurs énumérées et des compteurs.
-- `36_cohortes_avant_la_purge.test.sql` n'y admet que trois types — `date`, `integer`, et `text`
-- fermé par un `check` qui l'énumère —, pour qu'une colonne ajoutée plus tard ait à passer par le
-- test avant de pouvoir porter quelqu'un.
--
-- **Aucun segment** (zone, poste dominant, cadence), et c'est une décision, pas un oubli : à nos
-- volumes, une ligne découpée aussi finement décrirait une personne, c'est-à-dire garderait la
-- trace de quelqu'un que la page de confidentialité promet d'effacer.
--
-- Chaque compteur de purge porte quatre dimensions, dérivées en un seul endroit
-- (`public.cohorte_de`) :
--
--   * **la semaine d'arrivée** — le lundi de `auth.users.created_at`. Pas `profiles.created_at` :
--     c'est une copie posée par trigger (écart maximal relevé sur le distant le 27/09/2026 :
--     24 ms, aucun compte sans profil), et `auth.users.created_at` est déjà le plancher du prédicat
--     d'inactivité de la purge — une seule horloge pour les deux. **En UTC, écrit explicitement** :
--     c'est le calendrier des générateurs de points (`date_trunc('week', now())` sous le fuseau
--     `UTC` du serveur), et l'écrire évite qu'une session réglée autrement déplace les lundis ;
--   * **l'étape la plus loin atteinte, dans cet ordre** : `a_ouvert` < `a_soumis_un_bilan` <
--     `s_est_engagee` < `a_repondu`. Les étapes ne sont pas emboîtées — depuis C2.1, un point
--     générique est posé à qui a un bilan, engagé ou non, donc on peut répondre sans s'être engagé.
--     **On retient la plus loin dans l'ordre, pas le plus long préfixe** : répondre à un point est
--     le geste que la boucle existe pour obtenir, et le ranger sous « a soumis un bilan » parce
--     que l'engagement manque effacerait le seul signe de rétention qu'on ait. Corollaire à
--     connaître en lisant la vue : `a_repondu` compte aussi des gens qui ne se sont jamais
--     engagés, et les étapes s'y lisent exclusives, jamais cumulées ;
--   * **les semaines tenues, par tranches** — de la création au dernier signe de vie, défini par
--     `public.dernier_signe_de_vie` (plus bas). Six tranches, dont les bornes reprennent des seuils
--     que le produit s'est déjà donnés — `0`, `1`, `2-3`, `4-7` (quatre points sans réponse font
--     s'espacer les rappels), `8-12` (huit les font taire), `13+` (treize semaines font une saison
--     de 91 jours) —, mais comptées en **semaines d'activité**, pas en points sans réponse ;
--   * **l'état des rappels au départ** — `public.regime_de_rappel` sur chacune des deux boucles, et
--     **le plus avancé des deux** (`silence` > `espace` > `normal`) : c'est ce que le produit
--     faisait déjà à cette personne — s'être tu sur une boucle suffit à le dire.
--
-- ## Le signe de vie, en un seul endroit — et la moitié qui reste à faire
--
-- `regime_de_rappel` définit le signe de vie en ligne : le plus récent du début de période d'un
-- point répondu **de la boucle** et d'un `app_open`. `public.dernier_signe_de_vie(user, boucle)`
-- en est l'**extraction verbatim**, relue sur le corps installé du distant le 27/09/2026 (identique
-- au dépôt). **`regime_de_rappel` n'est pas réécrit ici pour l'appeler** : un chantier mené en
-- parallèle (C4.2, le mot de la veille) passe sous le plafond de ce régime et peut le réécrire, et
-- deux réécritures concurrentes de la même fonction font gagner la dernière appliquée, en silence
-- (`SUPABASE.md` §2.3). La factorisation se fait à l'intégration, une fois C4.2 fusionné — une
-- ligne, déjà jouée comme témoin des mutations de `36` : elle ne fait rien tomber. D'ici là, une
-- assertion de `36` exige que le corps installé de `regime_de_rappel`, commentaires et blancs
-- retirés, **contienne** l'expression de `dernier_signe_de_vie`, ou l'appelle. Une inclusion et
-- non une identité : les deux textes ne peuvent pas diverger sans bruit **sauf par ajout** — une
-- ligne ajoutée au régime après sa lecture du signe de vie passerait (contre-lecture du 27/09/2026).
--
-- Une conséquence de cette définition, à connaître avant de lire une tranche : une **réponse**
-- compte pour le début de la période qu'elle interroge, pas pour sa date — donc une semaine plus
-- tôt au moins. En pratique répondre se fait dans l'app, qui émet un `app_open` au même moment.
--
-- ## Dans la même transaction que la suppression, jamais à côté
--
-- Le compteur est écrit par la purge elle-même, juste avant son `delete` et sur la même liste
-- d'identifiants. Un cron séparé ne ferait mieux sur rien et pourrait manquer un passage — un
-- passage manqué est une cohorte perdue pour de bon. Et un passage bloqué par la garde de volume ne
-- compte rien, puisqu'il ne supprime rien.
--
-- **Mais un compteur qui échoue n'arrête jamais la suppression** (contre-lecture du 27/09/2026).
-- La première version écrivait l'inverse — « si le compteur échoue, la purge n'a pas lieu » — et
-- c'était suspendre une suppression que la page de confidentialité promet : les candidats ne
-- changeant pas d'une nuit à l'autre, un compteur en échec échouait à chaque passage, pour toujours
-- et sans alerte. Le déclencheur le plus probable était à portée : une valeur nouvelle de
-- `regime_de_rappel` hors du `check` de `rappels_au_depart`. Le compte vit donc dans une
-- sous-transaction : en temps normal il est écrit dans la même transaction que la suppression, et
-- s'il échoue, seul lui est annulé — le `delete` passe, et `purge_runs.detail` dit l'échec et son
-- message. Une cohorte perdue se lit alors à l'écart du rapprochement (§8.5 bis) ; une suppression
-- promise et suspendue ne se lisait nulle part. Même règle pour `delete_my_account`, où l'enjeu est
-- plus net encore : un compte qu'on ne peut plus supprimer depuis l'app est un bloqueur Play.
--
-- `delete_my_account` compte **après** son `delete`, dans la même transaction, et seulement si une
-- ligne est partie : l'ordre ne change rien à l'atomicité, et c'est le seul qui ne compte pas deux
-- fois une réponse perdue suivie d'un nouvel essai — le jeton reste valable une heure après la
-- suppression, et le second appel ne supprime rien.
--
-- ## Les deux fonctions réécrites, depuis leur corps installé
--
-- `purge_stale_anonymous_accounts` et `delete_my_account` partent de `pg_get_functiondef` sur le
-- distant, le 27/09/2026 — identiques au dépôt (`20260910100000`, `20260905210000`). Seul
-- l'ajout du compteur change ; le prédicat d'inactivité, la garde de volume et le journal sont
-- repris tels quels.

-- ── 1. Les tables ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.purges_par_cohorte (
  semaine_d_arrivee date not null
    constraint purges_par_cohorte_semaine_est_un_lundi check (extract(isodow from semaine_d_arrivee) = 1),
  etape text not null
    constraint purges_par_cohorte_etape_check
    check (etape in ('a_ouvert', 'a_soumis_un_bilan', 's_est_engagee', 'a_repondu')),
  semaines_tenues text not null
    constraint purges_par_cohorte_semaines_tenues_check
    check (semaines_tenues in ('0', '1', '2-3', '4-7', '8-12', '13+')),
  rappels_au_depart text not null
    constraint purges_par_cohorte_rappels_au_depart_check
    check (rappels_au_depart in ('normal', 'espace', 'silence')),
  comptes integer not null
    constraint purges_par_cohorte_comptes_positif check (comptes > 0),
  constraint purges_par_cohorte_pkey
    primary key (semaine_d_arrivee, etape, semaines_tenues, rappels_au_depart)
);

comment on table public.purges_par_cohorte is
  'Comptes agrégés des sessions anonymes supprimées par purge_stale_anonymous_accounts, écrits '
  'dans la même transaction, juste avant la suppression. Aucune clé étrangère (la table survit à '
  'la cascade), aucun identifiant, aucun segment. À nos volumes, une ligne peut ne compter qu''une '
  'personne : elle ne porte rien qui la désigne. Serveur seulement ; se lit par '
  'analytics.cohortes_purgees.';
comment on column public.purges_par_cohorte.semaine_d_arrivee is
  'Le lundi (UTC) de la semaine de création de la session — auth.users.created_at.';
comment on column public.purges_par_cohorte.etape is
  'L''étape la plus loin atteinte DANS CET ORDRE : a_ouvert < a_soumis_un_bilan < s_est_engagee '
  '< a_repondu. Non emboîtées : un point générique se répond sans engagement, et compte alors '
  'en a_repondu.';
comment on column public.purges_par_cohorte.semaines_tenues is
  'Semaines entières de la création au dernier signe de vie (public.dernier_signe_de_vie, sur '
  'les deux boucles), par tranches : 0, 1, 2-3, 4-7, 8-12, 13+.';
comment on column public.purges_par_cohorte.rappels_au_depart is
  'Le plus avancé des deux régimes de rappel (public.regime_de_rappel) au moment de la purge.';

create table if not exists public.suppressions_de_compte_par_mois (
  mois date not null
    constraint suppressions_de_compte_par_mois_pkey primary key
    constraint suppressions_de_compte_par_mois_premier_du_mois check (extract(day from mois) = 1),
  suppressions integer not null
    constraint suppressions_de_compte_par_mois_positif check (suppressions > 0)
);

comment on table public.suppressions_de_compte_par_mois is
  'Nombre de comptes supprimés par delete_my_account, par mois (UTC), écrit dans la même '
  'transaction que la suppression. Aucune clé étrangère, aucun identifiant : combien, jamais qui. '
  'Serveur seulement.';

-- **Serveur seulement, et écrit explicitement** (`SUPABASE.md` §2.2) : `from public` en plus des
-- deux rôles, et la RLS activée sans aucune policy, comme `purge_runs`. Les privilèges par défaut
-- de `postgres` sont fermés depuis `20260920190000`, mais une table qui compterait sur eux
-- perdrait son garde-fou le jour où ils reviennent.
alter table public.purges_par_cohorte enable row level security;
alter table public.suppressions_de_compte_par_mois enable row level security;
revoke all privileges on table public.purges_par_cohorte from public, anon, authenticated;
revoke all privileges on table public.suppressions_de_compte_par_mois from public, anon, authenticated;

-- ── 2. Le signe de vie, et les dimensions d'une cohorte ─────────────────────────────────────────
--
-- Trois fonctions `security invoker`, révoquées du client : leur seul appelant est la purge, qui
-- est `security definer` — elles s'exécutent donc avec les droits de son propriétaire, qui lit
-- `auth.users` et `usage_events`. Un `grant` futur tomberait sur l'absence de privilège sur le
-- schéma `auth` et sur la RLS, au lieu d'ouvrir le parcours de n'importe quel compte désigné par
-- son identifiant. Même raisonnement que `action_engagee_de_la_periode` (`20260927210247`).

-- L'expression est celle de `regime_de_rappel`, recopiée du corps installé et tenue à l'identique
-- par l'assertion de `36` décrite en en-tête. Ne pas la « corriger » ici seule.
create or replace function public.dernier_signe_de_vie(p_user_id uuid, p_loop_type text)
returns timestamptz
language sql
stable
set search_path to 'public'
as $function$
  select greatest(
    (select max(c.period_start)::timestamptz
       from public.engagement_checkins c
      where c.user_id = p_user_id and c.loop_type = p_loop_type and c.status = 'answered'),
    (select max(e.occurred_at)
       from public.usage_events e
      where e.user_id = p_user_id and e.name = 'app_open')
  );
$function$;

revoke execute on function public.dernier_signe_de_vie(uuid, text) from public, anon, authenticated;

comment on function public.dernier_signe_de_vie(uuid, text) is
  'Le dernier signe de vie d''un compte pour une boucle : le plus récent du début de période d''un '
  'point répondu de cette boucle et d''un app_open. Extraction de regime_de_rappel (C2.9), qui '
  'doit l''appeler à l''intégration du lot 6 ; d''ici là, 36_cohortes_avant_la_purge exige que '
  'le corps du régime contienne cette expression.';

-- `strict` : une durée nulle n'a pas de tranche, et la colonne `not null` fera échouer le compte
-- — jamais la suppression, §3 — plutôt que de ranger quelqu'un dans « 0 » faute de savoir.
create or replace function public.tranche_de_semaines_tenues(p_semaines integer)
returns text
language sql
immutable
strict
set search_path to 'public'
as $function$
  select case
    when p_semaines < 1 then '0'
    when p_semaines < 2 then '1'
    when p_semaines < 4 then '2-3'
    when p_semaines < 8 then '4-7'
    when p_semaines < 13 then '8-12'
    else '13+'
  end;
$function$;

revoke execute on function public.tranche_de_semaines_tenues(integer) from public, anon, authenticated;

comment on function public.tranche_de_semaines_tenues(integer) is
  'Les tranches de semaines tenues des cohortes purgées : 0, 1, 2-3, 4-7, 8-12, 13+. Les bornes 4, '
  '8 et 13 reprennent les seuils des rappels (quatre et huit points) et la saison, mais elles '
  'comptent des semaines d''activité, pas des points sans réponse.';

-- Les deux boucles sont nommées, `commute` et `extras` : ce sont les deux seules valeurs du
-- `check` de `engagement_checkins.loop_type`, et une assertion de `36` épingle ce `check` pour
-- qu'une troisième boucle fasse tomber le test ici plutôt que d'être ignorée en silence.
--
-- L'état des rappels se trie par `array_position` avec `nulls first` : une valeur que
-- `regime_de_rappel` rendrait demain sans qu'on l'ait prévue passe DEVANT, et le `check` de la
-- table la refuse — le compte échoue et le dit (`purge_runs.detail`), au lieu de ranger quelqu'un
-- dans le mauvais régime, et la suppression a lieu quand même (§3). L'assertion 21 de `36` garde
-- que cela n'arrive pas en silence : les valeurs du régime y sont comparées au `check`.
create or replace function public.cohorte_de(p_user_id uuid)
returns table (
  semaine_d_arrivee date,
  etape text,
  semaines_tenues text,
  rappels_au_depart text
)
language sql
stable
set search_path to 'public'
as $function$
  select
    date_trunc('week', u.created_at at time zone 'UTC')::date,
    case
      when exists (
        select 1 from public.engagement_checkins c
        where c.user_id = u.id and c.status = 'answered'
      ) then 'a_repondu'
      when exists (
        select 1 from public.plan_actions pa
        join public.plan_cycles pc on pc.id = pa.plan_cycle_id
        where pc.user_id = u.id and pa.committed_at is not null
      ) or exists (
        select 1 from public.plan_action_commitments_archive ar
        where ar.user_id = u.id
      ) then 's_est_engagee'
      -- `<> 'in_progress'` et non `= 'completed'` : l'étape dit ce que la personne a fait, pas
      -- l'état actuel de son bilan. Un bilan retiré (C4.7, `withdrawn`) a été soumis.
      -- `submitted_at is not null` ne convient pas : le client écrit toutes les colonnes à
      -- l'insert, donc un brouillon peut porter une date.
      when exists (
        select 1 from public.assessments a
        where a.user_id = u.id and a.status <> 'in_progress'
      ) then 'a_soumis_un_bilan'
      else 'a_ouvert'
    end,
    public.tranche_de_semaines_tenues(
      floor(extract(epoch from (greatest(u.created_at, s.signe) - u.created_at)) / 604800)::integer
    ),
    (
      select r.regime
      from unnest(array['commute', 'extras']) as b(loop_type)
      cross join lateral (select public.regime_de_rappel(u.id, b.loop_type) as regime) r
      order by array_position(array['normal', 'espace', 'silence'], r.regime) desc nulls first
      limit 1
    )
  from auth.users u
  cross join lateral (
    select greatest(
      public.dernier_signe_de_vie(u.id, 'commute'),
      public.dernier_signe_de_vie(u.id, 'extras')
    ) as signe
  ) s
  where u.id = p_user_id;
$function$;

revoke execute on function public.cohorte_de(uuid) from public, anon, authenticated;

comment on function public.cohorte_de(uuid) is
  'Les quatre dimensions sous lesquelles la purge compte un compte avant de le supprimer : '
  'semaine d''arrivée, étape la plus loin, tranche de semaines tenues, état des rappels. Ne rend '
  'aucun identifiant.';

-- ── 3. La purge compte, puis supprime ───────────────────────────────────────────────────────────

create or replace function public.purge_stale_anonymous_accounts()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  -- Plancher absolu : en dessous, la garde ne se mêle de rien (justification en en-tête de
  -- `20260910100000_garde_volume_purge_anonyme.sql`).
  c_plancher constant integer := 50;
  c_part_max constant numeric := 0.20;

  v_candidats uuid[];
  v_nb_candidats integer;
  v_total integer;
  v_seuil integer;
  v_supprimes integer := 0;
  v_echec_du_compte text;
begin
  select count(*) into v_total
  from auth.users u
  where u.is_anonymous = true;

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
  v_seuil := greatest(c_plancher, ceil(v_total * c_part_max)::integer);

  if v_nb_candidats > v_seuil then
    insert into public.purge_runs (status, candidates, deleted, detail)
    values (
      'blocked',
      v_nb_candidats,
      0,
      format(
        'Garde de volume : %s comptes anonymes candidats sur %s, au-delà du seuil de %s (20 %%, plancher %s). Rien supprimé — vérifier le prédicat d''inactivité avant de relancer.',
        v_nb_candidats, v_total, v_seuil, c_plancher
      )
    );
    raise warning 'purge_stale_anonymous_accounts : garde de volume déclenchée (% candidats sur %, seuil %), rien supprimé.',
      v_nb_candidats, v_total, v_seuil;
    return;
  end if;

  -- Les cohortes, AVANT la suppression : après, la cascade a emporté tout ce qui les décrit.
  -- Même liste d'identifiants que le `delete` qui suit. **Dans une sous-transaction** : si ce
  -- compte échoue, lui seul est annulé, et la suppression promise a lieu quand même (en-tête).
  begin
    insert into public.purges_par_cohorte (semaine_d_arrivee, etape, semaines_tenues, rappels_au_depart, comptes)
    select c.semaine_d_arrivee, c.etape, c.semaines_tenues, c.rappels_au_depart, count(*)::integer
    from unnest(v_candidats) as candidat(id)
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
  where u.id = any(v_candidats);

  get diagnostics v_supprimes = row_count;

  insert into public.purge_runs (status, candidates, deleted, detail)
  values ('applied', v_nb_candidats, v_supprimes, v_echec_du_compte);
end;
$function$;

revoke execute on function public.purge_stale_anonymous_accounts() from public, anon, authenticated;

-- ── 4. La suppression de compte compte son mois ─────────────────────────────────────────────────

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_supprimes integer := 0;
begin
  if v_user_id is null then
    raise exception 'Aucune session.' using errcode = 'insufficient_privilege';
  end if;

  -- Une seule ligne à supprimer : tout le reste suit par cascade.
  delete from auth.users where id = v_user_id;

  get diagnostics v_supprimes = row_count;

  -- Le compte du mois, hors de la cascade et sans identifiant (lot 6, 27/09/2026). Après le
  -- `delete` et seulement s'il a supprimé quelque chose : un second appel avec un jeton encore
  -- valable ne supprime rien, et ne doit rien compter. **Dans une sous-transaction** : son échec
  -- ne doit jamais annuler la suppression (en-tête) — il part en avertissement, dans les journaux
  -- de la base.
  if v_supprimes > 0 then
    begin
      insert into public.suppressions_de_compte_par_mois (mois, suppressions)
      values (date_trunc('month', now() at time zone 'UTC')::date, v_supprimes)
      on conflict (mois)
      do update set suppressions = public.suppressions_de_compte_par_mois.suppressions + excluded.suppressions;
    exception when others then
      raise warning 'delete_my_account : compteur du mois en échec, suppression faite quand même : % (%)',
        sqlerrm, sqlstate;
    end;
  end if;
end;
$function$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ── 5. La lecture ───────────────────────────────────────────────────────────────────────────────
--
-- Une ligne par semaine d'arrivée, chaque dimension dépliée en colonnes : c'est la forme qui se
-- colle dans un tableur. Les étapes sont **exclusives** (chaque départ compte une fois, à l'étape
-- la plus loin atteinte), les tranches aussi : chaque famille de colonnes somme à `comptes_purges`.
--
-- Sans `security_invoker`, comme les autres vues d'`analytics` : la table est en RLS sans policy,
-- une vue invoker ne serait lisible par personne. Et son propre `revoke`, le `revoke all on all
-- tables in schema analytics` des migrations passées ne couvrant que ce qui existait à leur date.

create or replace view analytics.cohortes_purgees as
select
  p.semaine_d_arrivee,
  sum(p.comptes)::integer as comptes_purges,
  coalesce(sum(p.comptes) filter (where p.etape = 'a_ouvert'), 0)::integer as etape_a_ouvert,
  coalesce(sum(p.comptes) filter (where p.etape = 'a_soumis_un_bilan'), 0)::integer as etape_a_soumis_un_bilan,
  coalesce(sum(p.comptes) filter (where p.etape = 's_est_engagee'), 0)::integer as etape_s_est_engagee,
  coalesce(sum(p.comptes) filter (where p.etape = 'a_repondu'), 0)::integer as etape_a_repondu,
  coalesce(sum(p.comptes) filter (where p.semaines_tenues = '0'), 0)::integer as tenu_0_semaine,
  coalesce(sum(p.comptes) filter (where p.semaines_tenues = '1'), 0)::integer as tenu_1_semaine,
  coalesce(sum(p.comptes) filter (where p.semaines_tenues = '2-3'), 0)::integer as tenu_2_a_3_semaines,
  coalesce(sum(p.comptes) filter (where p.semaines_tenues = '4-7'), 0)::integer as tenu_4_a_7_semaines,
  coalesce(sum(p.comptes) filter (where p.semaines_tenues = '8-12'), 0)::integer as tenu_8_a_12_semaines,
  coalesce(sum(p.comptes) filter (where p.semaines_tenues = '13+'), 0)::integer as tenu_13_semaines_et_plus,
  coalesce(sum(p.comptes) filter (where p.rappels_au_depart = 'normal'), 0)::integer as rappels_normal,
  coalesce(sum(p.comptes) filter (where p.rappels_au_depart = 'espace'), 0)::integer as rappels_espace,
  coalesce(sum(p.comptes) filter (where p.rappels_au_depart = 'silence'), 0)::integer as rappels_silence
from public.purges_par_cohorte p
group by p.semaine_d_arrivee;

comment on view analytics.cohortes_purgees is
  'Les sessions anonymes purgées, par semaine d''arrivée : combien, à quelle étape elles se sont '
  'arrêtées, combien de semaines elles ont tenu, et où en étaient leurs rappels. Chaque famille de '
  'colonnes somme à comptes_purges. Ne dit rien de ceux qui sont restés.';

revoke all privileges on table analytics.cohortes_purgees from public, anon, authenticated;

-- ── 6. Contrôles de la migration ────────────────────────────────────────────────────────────────
--
-- Ils ne remplacent pas `36_cohortes_avant_la_purge.test.sql`, qui éprouve les compteurs sur des
-- sessions fabriquées : ils garantissent que ce fichier-ci a produit l'état qu'il décrit, y compris
-- rejoué sur une base qui l'a déjà reçu. Lus sur les corps installés sans leurs commentaires
-- (`SUPABASE.md` §1.5).

do $controle_cohortes$
declare
  v_purge text;
  v_suppression text;
begin
  select regexp_replace(pg_get_functiondef('public.purge_stale_anonymous_accounts()'::regprocedure),
                        '--[^' || chr(10) || ']*', '', 'g')
    into v_purge;
  select regexp_replace(pg_get_functiondef('public.delete_my_account()'::regprocedure),
                        '--[^' || chr(10) || ']*', '', 'g')
    into v_suppression;

  if position('public.cohorte_de(candidat.id)' in v_purge) = 0
     or position('public.cohorte_de(candidat.id)' in v_purge) > position('delete from auth.users' in v_purge) then
    raise exception 'La purge ne compte pas ses cohortes avant de supprimer';
  end if;
  if position('v_nb_candidats > v_seuil' in v_purge) = 0 or position('purge_runs' in v_purge) = 0 then
    raise exception 'La purge a perdu sa garde de volume ou son journal';
  end if;
  if position('suppressions_de_compte_par_mois' in v_suppression) = 0 then
    raise exception 'La suppression de compte ne compte pas son mois';
  end if;
  if position('exception when others' in v_purge) = 0 or position('exception when others' in v_suppression) = 0 then
    raise exception 'Un compteur peut de nouveau empêcher une suppression : sa sous-transaction a disparu';
  end if;

  if exists (
    select 1 from pg_constraint
    where contype = 'f'
      and conrelid in ('public.purges_par_cohorte'::regclass, 'public.suppressions_de_compte_par_mois'::regclass)
  ) then
    raise exception 'Une table de compteurs porte une clé étrangère : elle suivrait la cascade';
  end if;

  if exists (
    select 1
    from (values ('public.purges_par_cohorte'), ('public.suppressions_de_compte_par_mois'),
                 ('analytics.cohortes_purgees')) as t(nom)
    cross join (values ('anon'), ('authenticated')) as r(role)
    where has_table_privilege(r.role, t.nom, 'select')
       or has_table_privilege(r.role, t.nom, 'insert')
       or has_table_privilege(r.role, t.nom, 'update')
       or has_table_privilege(r.role, t.nom, 'delete')
  ) then
    raise exception 'Une table ou la vue des cohortes est accessible depuis le client';
  end if;

  if has_function_privilege('anon', 'public.cohorte_de(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.cohorte_de(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.dernier_signe_de_vie(uuid, text)', 'execute')
     or has_function_privilege('authenticated', 'public.purge_stale_anonymous_accounts()', 'execute') then
    raise exception 'Une fonction des cohortes est appelable depuis le client';
  end if;
  if not has_function_privilege('authenticated', 'public.delete_my_account()', 'execute') then
    raise exception 'delete_my_account n''est plus appelable : la suppression dans l''app est cassée';
  end if;
end;
$controle_cohortes$;
