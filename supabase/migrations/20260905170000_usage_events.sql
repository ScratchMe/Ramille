-- TraceVerte V1 — mesure d'usage (issue #30).
--
-- ## Pourquoi une table plutôt qu'un outil
--
-- L'issue demandait de trancher entre PostHog, Plausible et un système maison. Le constat qui
-- décide : **tous les axes de segmentation demandés sont déjà en base** — `profiles.zone_type`,
-- `profiles.tc_access`, `profiles.cadence_type`, `assessment_results.dominant_poste`, et les
-- réponses aux boucles dans `engagement_checkins`. Un outil tiers les recevrait en copie pour
-- les recroiser ailleurs, au prix d'un sous-traitant de plus à déclarer dans /confidentialite
-- et, selon sa configuration, d'un bandeau de consentement. Ce qui manquait réellement tient
-- en une douzaine d'événements de parcours : là où les gens décrochent, ce qu'aucune table ne
-- garde puisque, par définition, ils n'ont rien enregistré.
--
-- Conséquence directe, et c'est la règle à tenir : **on n'instrumente jamais ce que le schéma
-- enregistre déjà.** Pas d'événement `bilan_submit` (c'est `assessments.submitted_at`), pas de
-- `checkin_answer` (c'est `engagement_checkins.response`), pas de `feedback_submit` (c'est la
-- table `feedback`). Dupliquer un fait, c'est se garantir deux chiffres divergents le jour où
-- l'un des deux chemins échoue.
--
-- ## Ce qu'on ne collecte pas
--
-- Aucune adresse IP, aucun user-agent, aucun identifiant publicitaire, aucun suivi inter-sites.
-- L'horodatage est posé par le serveur (`now()`) et non par le client : une horloge de client
-- se règle. Les propriétés sont bornées à des valeurs d'énumération courtes (cf.
-- `check_usage_event_props`) — jamais de texte libre, qui rendrait la table réidentifiante et
-- la ferait sortir du régime de la mesure d'audience.

-- ── Référentiel des événements ─────────────────────────────────────────────────────────
-- Même parti pris que `emission_factor_sources` : la liste vit dans une table, pas dans un
-- CHECK ni en dur dans le client. **Ajouter un événement au produit impose d'y ajouter une
-- ligne**, sinon l'insert est rejeté par la clé étrangère et l'événement est perdu en
-- silence. Le pendant côté client est `src/types/analytics.ts`, tenu synchronisé à la main et
-- gardé par un test.

create table public.usage_event_types (
  name text primary key,
  description text not null
);

comment on table public.usage_event_types is
  'Liste fermée des événements de parcours mesurables. Miroir de src/types/analytics.ts.';

insert into public.usage_event_types (name, description) values
  ('app_open',              'Ouverture de l''app — dénominateur de tous les entonnoirs.'),
  ('onboarding_step_view',  'Affichage d''un écran d''onboarding (props.step).'),
  ('onboarding_complete',   'Fin de l''onboarding, avant le questionnaire.'),
  ('bilan_step_view',       'Affichage d''une étape du questionnaire (props.step).'),
  ('resultat_view',         'Affichage de la restitution du bilan.'),
  ('resultat_share',        'Clic sur « Partager mon bilan ».'),
  ('connexion_view',        'Affichage de la proposition de connexion (props.source).'),
  ('connexion_success',     'Rattachement effectif du compte (props.method).'),
  ('connexion_dismiss',     'Proposition de connexion écartée.'),
  ('plan_view',             'Affichage du plan de réduction.'),
  ('suivi_view',            'Affichage de l''écran « Mon suivi ».');

alter table public.usage_event_types enable row level security;
-- Aucune policy : référentiel interne, ni lu ni écrit par le client. La vérification de clé
-- étrangère, elle, s'exécute hors RLS — l'insert d'un événement fonctionne donc sans que la
-- table soit lisible.

-- ── Validation des propriétés ──────────────────────────────────────────────────────────
-- `props` est le seul endroit où un client choisit ce qu'il écrit. Sans bornes, c'est une
-- table de texte libre publique (chaque visiteur a une session anonyme, cf. v1-04 §1) — donc
-- à la fois un vecteur de spam et un risque de réidentification si quoi que ce soit de
-- personnel y atterrissait un jour par erreur de code.

create or replace function public.check_usage_event_props(p_props jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p_props) = 'object'
     and (select count(*) from jsonb_object_keys(p_props)) <= 6
     and not exists (
       select 1
       from jsonb_each(p_props) as entry(key, value)
       where jsonb_typeof(entry.value) not in ('string', 'number', 'boolean')
          or length(entry.key) > 32
          or (jsonb_typeof(entry.value) = 'string' and length(entry.value #>> '{}') > 48)
     );
$$;

-- ── La table ───────────────────────────────────────────────────────────────────────────

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null references public.usage_event_types(name),
  props jsonb not null default '{}'::jsonb check (public.check_usage_event_props(props)),
  platform text not null check (platform in ('web', 'ios', 'android')),
  -- Horodatage serveur — le `default` ci-dessous ne couvre que le chemin nominal ; c'est le
  -- trigger de 20260905170400 qui interdit réellement au client de le fournir.
  occurred_at timestamptz not null default now()
);

create index usage_events_user_time_idx on public.usage_events(user_id, occurred_at desc);
create index usage_events_name_time_idx on public.usage_events(name, occurred_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────────────────────
-- Écriture seule, sur ses propres lignes. **Pas de policy de lecture** : contrairement à
-- `feedback`, personne n'a besoin de relire ces lignes depuis l'app, et le droit d'accès du
-- RGPD se traite hors bande. Pas de policy de suppression non plus : l'effacement passe par
-- la cascade sur `profiles` à la suppression du compte, ce qui le rend structurel plutôt que
-- dépendant d'un appel client.

alter table public.usage_events enable row level security;

create policy "usage_events insert own"
  on public.usage_events for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- ── Garde-fou de volume ────────────────────────────────────────────────────────────────
-- Un parcours complet (onboarding + neuf étapes + restitution + plan) produit une vingtaine
-- d'événements. Cinq cents par 24 h laissent donc largement la place à quelqu'un qui refait
-- son bilan plusieurs fois dans la journée, tout en plafonnant ce qu'un script peut écrire.
-- L'`offset` évite de compter toute la fenêtre : la requête s'arrête dès la 501ᵉ ligne.

create or replace function public.enforce_usage_events_rate_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  max_per_day constant integer := 500;
begin
  perform 1
  from public.usage_events
  where user_id = new.user_id and occurred_at > now() - interval '24 hours'
  offset max_per_day limit 1;

  if found then
    raise exception 'Trop d''événements d''usage pour cet utilisateur sur 24 h.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger usage_events_rate_limit
  before insert on public.usage_events
  for each row execute function public.enforce_usage_events_rate_limit();

-- ── Rétention ──────────────────────────────────────────────────────────────────────────
-- Douze mois glissants. Une durée de conservation n'est pas optionnelle (RGPD art. 5-1-e) et
-- doit correspondre à l'usage réel : au-delà d'un an, un entonnoir d'onboarding ne dit plus
-- rien du produit tel qu'il est. /confidentialite annonce cette durée.

create or replace function public.purge_usage_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.usage_events where occurred_at < now() - interval '12 months';
$$;

revoke execute on function public.purge_usage_events() from anon, authenticated;

select cron.schedule(
  'purge-usage-events',
  '30 3 * * *',
  $$select public.purge_usage_events();$$
);

-- ── Lecture et agrégation ──────────────────────────────────────────────────────────────
-- Dans un schéma non exposé par PostgREST : ces vues croisent les parcours de tous les
-- utilisateurs, elles n'ont rien à faire derrière une clé anonyme. Elles se lisent depuis le
-- SQL editor ou le MCP, avec les droits du projet.

create schema if not exists analytics;
revoke all on schema analytics from anon, authenticated;

-- Une ligne par utilisateur, portant tous les axes de segmentation demandés par l'issue.
-- Aucun de ces champs n'est collecté par la mesure d'usage : ils viennent du bilan et du
-- profil, c'est tout l'argument du choix maison.
create or replace view analytics.user_segments as
select
  p.id as user_id,
  p.created_at,
  p.zone_type,
  p.tc_access,
  p.cadence_type,
  p.onboarding_completed_at is not null as onboarding_done,
  u.is_anonymous,
  r.dominant_poste,
  r.total_co2_kg_year,
  r.mobility_constrained,
  a.submitted_at as last_assessment_at
from public.profiles p
join auth.users u on u.id = p.id
left join lateral (
  select a2.id, a2.submitted_at
  from public.assessments a2
  where a2.user_id = p.id and a2.status = 'submitted'  -- corrigé par 20260905170100
  order by a2.submitted_at desc
  limit 1
) a on true
left join public.assessment_results r on r.assessment_id = a.id;

-- Entonnoir du questionnaire : combien d'utilisateurs distincts atteignent chaque étape.
-- L'aboutissement se lit dans `assessments`, pas dans un événement — cf. la règle en tête de
-- fichier.
create or replace view analytics.bilan_funnel as
with reached as (
  select e.props ->> 'step' as step, count(distinct e.user_id) as users
  from public.usage_events e
  where e.name = 'bilan_step_view'
  group by 1
)
select
  ordered.step,
  ordered.position,
  coalesce(reached.users, 0) as users
from unnest(array[
  'commute_has_trip', 'commute_days_distance', 'commute_mode', 'commute_extra',
  'leisure_frequency', 'leisure_detail', 'flights', 'long_trips', 'context'
]) with ordinality as ordered(step, position)
left join reached on reached.step = ordered.step
order by ordered.position;

-- Le même entonnoir, ventilé par segment : c'est la vue qui répond à « quels groupes traiter
-- en premier ».
create or replace view analytics.bilan_funnel_by_segment as
select
  s.zone_type,
  s.tc_access,
  s.dominant_poste,
  e.props ->> 'step' as step,
  count(distinct e.user_id) as users
from public.usage_events e
join analytics.user_segments s on s.user_id = e.user_id
where e.name = 'bilan_step_view'
group by 1, 2, 3, 4;

-- Volumétrie brute, pour vérifier d'un coup d'œil que la mesure tourne vraiment — même rôle
-- que `emission_factor_sync_runs` pour la synchronisation des facteurs.
create or replace view analytics.daily_events as
select
  date_trunc('day', occurred_at)::date as day,
  name,
  platform,
  count(*) as events,
  count(distinct user_id) as users
from public.usage_events
group by 1, 2, 3
order by 1 desc, 4 desc;

-- Réponses aux boucles d'engagement par segment. Aucune donnée d'usage n'intervient ici :
-- la table `engagement_checkins` suffit, et c'est justement la démonstration qu'un outil
-- tiers n'aurait rien apporté sur cet axe.
create or replace view analytics.engagement_by_segment as
select
  s.zone_type,
  s.tc_access,
  s.dominant_poste,
  c.loop_type,
  count(*) filter (where c.status = 'answered') as answered,
  count(*) filter (where c.status = 'expired') as expired,
  count(*) filter (where c.status = 'answered' and c.response) as answered_yes
from public.engagement_checkins c
join analytics.user_segments s on s.user_id = c.user_id
group by 1, 2, 3, 4;

revoke all on all tables in schema analytics from anon, authenticated;
