-- Les visites de la page d'accueil du web, comptées sans rien qui désigne personne
-- (`docs/architecture/v1-36-la-page-d-accueil.md` §5, 31/10/2026).
--
-- **Le trou qu'elle comble.** Depuis le 23/10/2026, lire la page d'accueil n'ouvre pas de session, et
-- `usage_events` n'accepte que des sessions : une visite qui s'arrête à la page ne se mesurait pas, et
-- l'entonnoir du web commençait à « Découvrir mon impact » (`MESURE.md` §2). Refaire la page pour
-- convertir sans savoir combien la lisent, ni jusqu'où, ni quel bouton sert, c'était la refaire à
-- l'aveugle.
--
-- **Un compteur, pas un journal.** Une ligne par jour et par événement, et un nombre : ni identifiant,
-- ni adresse IP, ni appareil, ni cookie, ni heure — rien qui permette de suivre une visite d'un
-- événement à l'autre, ni de la relier à un compte. Ce n'est pas une donnée personnelle, et ce n'est pas
-- un outil tiers : la base est la nôtre, dans l'Union européenne (le registre, fiche 5).
--
-- **Ce qu'on accepte en échange.** Quiconque a la clé publishable — elle est dans le bundle — peut
-- gonfler un compteur. La table reste bornée (douze événements par jour au plus), donc rien ne la remplit ;
-- un compteur gonflé fausse une mesure et rien d'autre. Un plafond demanderait de reconnaître l'appelant,
-- c'est-à-dire ce que la table refuse de garder.
--
-- **La liste des événements vit dans le `check`**, et nulle part ailleurs en base : la fonction ne la
-- recopie pas, un événement inconnu tombe sur la contrainte. Côté client, `EVENEMENTS_DE_L_ACCUEIL`
-- (`src/types/analytics.ts`) la recopie, déclaré à `scripts/verifier-miroirs-de-check.mjs`.

create table if not exists public.visites_de_l_accueil (
  jour date not null,
  evenement text not null,
  nombre integer not null default 0,
  primary key (jour, evenement),
  constraint visites_de_l_accueil_nombre_check check (nombre >= 0),
  constraint visites_de_l_accueil_evenement_check check (evenement in (
    'vue',
    'lu_ete', 'lu_echelle', 'lu_trajets', 'lu_agir', 'lu_comment', 'lu_fin',
    'clic_haut', 'clic_agir', 'clic_fin', 'clic_collant',
    'film_lance'
  ))
);

-- Le client ne lit ni n'écrit la table directement : la fonction écrit, l'analyse lit en `postgres`. Le
-- rôle de service la lit — le parcours réel y vérifie que la page s'est comptée (`TESTING-GARDES.md` §2.6) —,
-- et n'y écrit pas.
alter table public.visites_de_l_accueil enable row level security;
revoke all on table public.visites_de_l_accueil from public, anon, authenticated, service_role;
grant select on table public.visites_de_l_accueil to service_role;

comment on table public.visites_de_l_accueil is
  'La page d''accueil du web, comptée sans rien qui désigne personne : une ligne par jour (heure de Paris) et par événement, et un nombre. vue = la page s''est affichée ; lu_* = une section a paru à l''écran (ete, echelle, trajets, agir, comment, fin), une fois par affichage ; clic_* = un bouton vers l''onboarding a été touché (haut, agir, fin, collant = la barre du bas) ; film_lance = le film a démarré. Écrite par compter_sur_l_accueil, lue par analytics.accueil_par_jour.';

create or replace function public.compter_sur_l_accueil(p_evenement text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.visites_de_l_accueil (jour, evenement, nombre)
  values ((now() at time zone 'Europe/Paris')::date, p_evenement, 1)
  on conflict (jour, evenement) do update set nombre = public.visites_de_l_accueil.nombre + 1;
end;
$$;

-- Appelée sans session (`anon`) : la page d'accueil n'en ouvre pas. **Et par une session** (`authenticated`) :
-- la racine du web restaure une session existante sans en ouvrir (`laSessionSOuvreSur`), et qui revient avec
-- une session mais sans bilan ni questionnaire en cours voit la page d'accueil avec elle.
revoke execute on function public.compter_sur_l_accueil(text) from public, anon, authenticated;
grant execute on function public.compter_sur_l_accueil(text) to anon, authenticated;

comment on function public.compter_sur_l_accueil(text) is
  'Ajoute un au compteur du jour pour un événement de la page d''accueil du web. Sans session, sans identifiant : voir la table visites_de_l_accueil.';

-- L'entonnoir du haut, jour par jour : ce qu'on lit dans le registre d'exploitation (§8.5 quinquies).
create or replace view analytics.accueil_par_jour as
select
  jour,
  coalesce(sum(nombre) filter (where evenement = 'vue'), 0)::integer as vues,
  coalesce(sum(nombre) filter (where evenement = 'lu_ete'), 0)::integer as lu_ete,
  coalesce(sum(nombre) filter (where evenement = 'lu_echelle'), 0)::integer as lu_echelle,
  coalesce(sum(nombre) filter (where evenement = 'lu_trajets'), 0)::integer as lu_trajets,
  coalesce(sum(nombre) filter (where evenement = 'lu_agir'), 0)::integer as lu_agir,
  coalesce(sum(nombre) filter (where evenement = 'lu_comment'), 0)::integer as lu_comment,
  coalesce(sum(nombre) filter (where evenement = 'lu_fin'), 0)::integer as lu_fin,
  coalesce(sum(nombre) filter (where evenement like 'clic\_%'), 0)::integer as clics,
  coalesce(sum(nombre) filter (where evenement = 'clic_haut'), 0)::integer as clic_haut,
  coalesce(sum(nombre) filter (where evenement = 'clic_agir'), 0)::integer as clic_agir,
  coalesce(sum(nombre) filter (where evenement = 'clic_fin'), 0)::integer as clic_fin,
  coalesce(sum(nombre) filter (where evenement = 'clic_collant'), 0)::integer as clic_collant,
  coalesce(sum(nombre) filter (where evenement = 'film_lance'), 0)::integer as film_lance
from public.visites_de_l_accueil
group by jour;

revoke all on analytics.accueil_par_jour from public, anon, authenticated;

comment on view analytics.accueil_par_jour is
  'La page d''accueil du web, par jour (heure de Paris) : les affichages, les sections parues à l''écran, les touchers des boutons vers l''onboarding (en tout, puis par emplacement) et les lancements du film. Des totaux, jamais des visites suivies : une visite qui touche deux boutons compte deux clics. Le taux de clic se lit clics / vues ; la suite de l''entonnoir est dans usage_events (onboarding_step_view, à partir de contexte).';
