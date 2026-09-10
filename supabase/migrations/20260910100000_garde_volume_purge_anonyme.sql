-- Garde de volume sur la purge des sessions anonymes + journal des passages.
-- Chantier C0.2 du plan v1-13 (docs/architecture/v1-13-audit-et-chantiers.md §3), constat C-7.
--
-- LE DÉFAUT VISÉ. `purge_stale_anonymous_accounts()` fait un `delete from auth.users` dont le
-- prédicat repose sur un `greatest()` de six sous-requêtes portant sur cinq tables. Toute
-- colonne renommée, tout `user_id` qui cesse d'être alimenté, et chaque compte paraît inactif
-- depuis toujours : la purge emporte alors la totalité des sessions anonymes — bilans, plans et
-- check-ins compris, par cascade — sans qu'un seul écran ne le dise. Le projet est sur le plan
-- gratuit Supabase : il n'existe aucun point de restauration côté plateforme, seulement
-- l'export hebdomadaire de `.github/workflows/sauvegarde.yml` (docs/exploitation/sauvegarde.md).
--
-- CE QUE CETTE MIGRATION AJOUTE. Un plafond : si le passage du jour supprimerait plus que son
-- seuil, il ne supprime **rien** et laisse une ligne de journal. Une purge bloquée ne se rattrape
-- pas d'elle-même : le prédicat étant déterministe, chaque passage suivant rebloque sur le même
-- ensemble. Le blocage tient jusqu'à ce qu'on lise `purge_runs` — c'est le prix assumé, une purge
-- fautive ne se rattrapant pas du tout.
--
-- LE SEUIL, ET POURQUOI IL A UN PLANCHER. 20 % des comptes anonymes, mais jamais moins de 50
-- comptes en valeur absolue. Le pourcentage seul serait inexploitable sur une base petite :
-- au 09/09/2026 la base comptait quelques dizaines de sessions anonymes, et deux suppressions
-- parfaitement légitimes y franchissent 20 % sans rien signifier. Le plancher dit l'inverse du
-- pourcentage et c'est volontaire : en dessous de 50 comptes supprimés, on fait confiance au
-- prédicat, parce que le volume en jeu reste réparable à la main depuis un dump. Au-delà, c'est
-- le prédicat qu'on soupçonne, pas la base. 50 est aussi l'ordre de grandeur de 20 % des 266
-- sessions relevées avant la purge de septembre : les deux bornes se rejoignent là où la base
-- est dans son état connu.
--
-- Le comportement d'inactivité lui-même est inchangé, y compris le choix des signaux de vie :
-- voir l'en-tête de 20260907093000_purge_anonyme_sur_inactivite.sql, qui explique notamment
-- pourquoi `auth.users.last_sign_in_at` ne peut pas servir.

-- ── Journal des passages ───────────────────────────────────────────────────────────────
-- Même modèle que `emission_factor_sync_runs` : sans trace, un mécanisme qui ne tourne pas —
-- ou qui tourne et refuse de s'appliquer — est indétectable. C'est la seule façon de voir
-- qu'une garde a mordu, le cron n'ayant personne pour lire ses `raise warning`.

create table public.purge_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  -- `applied` : le passage a supprimé ce qu'il devait (y compris zéro compte).
  -- `blocked` : la garde de volume a tout retenu.
  status text not null check (status in ('applied', 'blocked')),
  candidates integer not null default 0,
  deleted integer not null default 0,
  detail text
);

comment on table public.purge_runs is
  'Journal des passages de purge_stale_anonymous_accounts(). status = blocked : la garde de volume a tout retenu, rien n''a été supprimé. Écrit par le serveur, jamais lu par un client.';

alter table public.purge_runs enable row level security;

-- Table serveur-only : RLS activée **sans aucune policy**, donc invisible même pour un
-- propriétaire — aucune ligne n'appartient à personne. Les revoke sont écrits explicitement et
-- ne comptent sur aucun drapeau de configuration : `auto_expose_new_tables` est retiré de
-- supabase/config.toml par le chantier C0.3, et une table qui dépendrait de lui perdrait son
-- garde-fou en silence le jour où la base est reconstruite depuis les migrations.
revoke all privileges on table public.purge_runs from anon, authenticated;

create index purge_runs_ran_at_idx on public.purge_runs(ran_at desc);

-- ── La purge, avec sa garde ────────────────────────────────────────────────────────────

create or replace function public.purge_stale_anonymous_accounts()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  -- Plancher absolu : en dessous, la garde ne se mêle de rien (justification en en-tête).
  c_plancher constant integer := 50;
  c_part_max constant numeric := 0.20;

  v_candidats uuid[];
  v_nb_candidats integer;
  v_total integer;
  v_seuil integer;
  v_supprimes integer := 0;
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

  -- Suppression par identifiants relevés juste au-dessus : la liste et le compte journalisé
  -- décrivent forcément les mêmes lignes, ce qu'un second passage du prédicat ne garantirait
  -- pas.
  delete from auth.users u
  where u.id = any(v_candidats);

  get diagnostics v_supprimes = row_count;

  insert into public.purge_runs (status, candidates, deleted)
  values ('applied', v_nb_candidats, v_supprimes);
end;
$function$;

comment on function public.purge_stale_anonymous_accounts() is
  'Supprime les sessions anonymes muettes depuis 90 jours, sauf si le passage dépasserait sa garde de volume (20 % des comptes anonymes, plancher 50) — auquel cas il ne supprime rien et journalise dans purge_runs. Inactivité, pas âge : voir l''en-tête de la migration 20260907093000 — se fier à last_sign_in_at reproduirait le bug, ce champ ne bougeant jamais pour une session anonyme.';

-- Révocation rejouée après la redéfinition, telle quelle : elle doit viser `public` et pas les
-- deux rôles seuls, dont elle ne retirerait rien — PostgreSQL accorde EXECUTE à PUBLIC à la
-- création et anon/authenticated en héritent (piège vérifié sur purge_usage_events, cf.
-- CLAUDE.md). Inutile de compter sur le fait qu'un `create or replace` préserve l'ACL existante :
-- une base reconstruite depuis les migrations crée la fonction ici même, et la ligne est alors
-- la seule qui la ferme.
revoke execute on function public.purge_stale_anonymous_accounts() from public, anon, authenticated;
