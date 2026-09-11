-- v1-13, chantier C2.10 — le signal « deux points consécutifs ».
-- Constats A11-3, A5-15. Spec §7 (signal d'engagement), §9 (indicateur de succès), `v1-02` §4,
-- `v1-14` §4.6. Planche A1 du canvas.
--
-- ## Le défaut
--
-- « Deux check-ins consécutifs complétés » est écrit dans la spec comme signal d'engagement, repris
-- en indicateur de succès, et `v1-02` §4 en donne même la requête. Il n'a jamais été calculé nulle
-- part — ni à l'écran, ni dans les vues d'analyse. La phrase du handoff (« Deuxième mois de suite
-- que tu changes quelque chose sur ce trajet. ») n'a jamais été affichée à personne.
--
-- ## Pourquoi les périodes et non les lignes
--
-- La requête de `v1-02` §4 prend les **deux dernières lignes** de la boucle et vérifie qu'elles sont
-- répondues. Elle était juste quand rien ne clôturait les périodes révolues ; depuis 20260904180000,
-- un point sans réponse passe en `expired` et reste en base. « Les deux dernières lignes » peut donc
-- recouvrir deux périodes qui ne se suivent pas — quelqu'un qui répond en janvier, laisse passer
-- février et mars, puis répond en avril, aurait une série de deux.
--
-- D'où `public.periode_precedente(loop_type, period_start)` : la période précédente se **calcule**,
-- elle ne se lit pas dans l'ordre des lignes. Un `lag()` sur les lignes répondues aurait le même
-- défaut que la requête d'origine, en moins visible — il sauterait silencieusement les périodes non
-- répondues et recollerait deux « oui » qui ne se suivent pas.
--
-- **La fonction est la jumelle SQL de `periodePrecedente` (`src/types/checkin.ts`), donc à toucher
-- avec elle**, même paire que `mois_francais` / `MOIS_FRANCAIS` et `jours_francais` /
-- `JOURS_FRANCAIS` : la vue compte côté serveur, la carte affiche côté client, et les deux doivent
-- désigner la même période.

-- ── 1. La période précédente, calculée ──────────────────────────────────────────────────────

create or replace function public.periode_precedente(p_loop_type text, p_period_start date)
returns date
language sql
immutable
set search_path to 'public'
as $$
  -- **Deux formes différentes, et c'est voulu.** `- 7` suffit pour la semaine : `period_start` est
  -- déjà un lundi, posé par `generate_commute_checkins`, et sept jours avant un lundi est un lundi.
  -- Le mois, lui, est **tronqué** plutôt que décalé : `(p - interval '1 month')` garderait le jour
  -- du mois, ce qui n'a pas de sens pour une période mensuelle et surtout diverge de la jumelle
  -- JavaScript sur les fins de mois — PostgreSQL ramène le 31 mars au 28 février, `Date.UTC` le
  -- pousse au 3 mars. `period_start` vaut toujours le 1er en pratique, donc la troncature ne change
  -- rien ; elle rend simplement les deux moitiés de la paire identiques par construction.
  select case p_loop_type
    when 'commute' then p_period_start - 7
    when 'extras' then date_trunc('month', p_period_start - interval '1 month')::date
  end;
$$;

comment on function public.periode_precedente(text, date) is
  'La période qui précède celle-ci pour la boucle donnée (C2.10). Jumelle de periodePrecedente '
  'dans src/types/checkin.ts — à toucher avec elle. Rend null sur une boucle inconnue plutôt que '
  'de supposer une cadence.';

-- Le client a sa propre moitié de la paire : il n'a aucune raison d'appeler celle-ci. `PUBLIC` est
-- révoqué explicitement, le `grant` implicite de la création étant le piège de 20260905170700.
revoke execute on function public.periode_precedente(text, date) from public, anon, authenticated;

-- ── 2. La vue d'analyse ─────────────────────────────────────────────────────────────────────
--
-- Deux compteurs par segment et par boucle : les « oui », et ceux dont la **période précédente**
-- porte aussi un « oui ». Leur rapport est l'indicateur de la spec §9, et c'est la seule forme sous
-- laquelle il se lit sans requête à écrire à la main.
--
-- `status = 'answered'` et `response_kind` depuis C2.4, jamais `response is not null` : un « pas de
-- trajet cette période » est une réponse, et elle ne doit ni compter comme un changement ni casser
-- la série — elle ne la prolonge pas non plus, ce qui est le comportement voulu (il n'y a rien à
-- renforcer).

create or replace view analytics.checkins_consecutifs as
with points as (
  select c.user_id, c.loop_type, c.period_start, c.response_kind,
         public.periode_precedente(c.loop_type, c.period_start) as periode_precedente
  from public.engagement_checkins c
  where c.status = 'answered'
)
select
  s.zone_type,
  s.tc_access,
  s.dominant_poste,
  p.loop_type,
  count(*) filter (where p.response_kind = 'oui') as oui,
  count(*) filter (where p.response_kind = 'oui' and precedent.response_kind = 'oui') as oui_consecutifs
from points p
join analytics.user_segments s on s.user_id = p.user_id
left join points precedent
  on precedent.user_id = p.user_id
 and precedent.loop_type = p.loop_type
 and precedent.period_start = p.periode_precedente
group by 1, 2, 3, 4;

revoke all on analytics.checkins_consecutifs from anon, authenticated;

-- ── 3. Contrôles ────────────────────────────────────────────────────────────────────────────

do $controle$
declare
  v_lundi date := date_trunc('week', now())::date;
begin
  if public.periode_precedente('commute', v_lundi) <> v_lundi - 7 then
    raise exception 'C2.10 : la semaine précédente n''est pas le lundi d''avant';
  end if;

  if public.periode_precedente('extras', date '2026-01-01') <> date '2025-12-01' then
    raise exception 'C2.10 : le mois précédent ne passe pas le changement d''année';
  end if;

  -- Une boucle inconnue rend `null`, et c'est voulu : supposer une cadence ferait apparier deux
  -- périodes au hasard le jour où une troisième boucle arrive.
  if public.periode_precedente('autre', date '2026-01-01') is not null then
    raise exception 'C2.10 : une boucle inconnue devrait rendre null';
  end if;

  if has_function_privilege('authenticated', 'public.periode_precedente(text, date)', 'execute') then
    raise exception 'C2.10 : periode_precedente reste appelable depuis le client';
  end if;
end
$controle$;
