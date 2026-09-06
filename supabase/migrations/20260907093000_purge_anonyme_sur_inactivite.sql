-- Purger les sessions anonymes sur l'inactivité, et non sur l'âge du compte.
-- Chantier B du plan v1-10 (docs/architecture/v1-10-connexion-et-rappels.md §2).
--
-- LE DÉFAUT : la fonction supprimait `where is_anonymous and created_at < now() - 90 jours`.
-- `v1-04` §3 décrit pourtant « 90 jours **d'inactivité** (pas de connexion, pas de nouvelle
-- activité) ». L'intention documentée et le code divergeaient : **un visiteur anonyme fidèle
-- depuis 90 jours était supprimé comme un abandon** — bilans, plan, check-ins compris, par
-- cascade. Silencieux par construction, puisque la personne perd tout sans qu'un écran ne le
-- dise.
--
-- Ça n'a jamais mordu : le compte le plus ancien avait 14 jours au moment d'écrire ceci, et
-- la base vient d'être purgée. Mais l'increment v1-10 a précisément pour but de rendre les
-- sessions anonymes actives (rappels par push, qui ne demandent pas de compte) : livrer ça
-- sans corriger reviendrait à fabriquer des utilisateurs engagés qu'un cron efface.
--
-- LE SIGNAL RETENU : `usage_events`, et surtout PAS `auth.users.last_sign_in_at`.
-- Ce dernier est le piège évident : il a l'air fait pour ça et il est inerte. Mesuré sur les
-- 266 sessions anonymes d'avant la purge, **aucune** n'avait un `last_sign_in_at` postérieur
-- à sa création — écart moyen 0,0 h, maximum 0 jour. `ensureSession()` ne rappelle
-- `signInAnonymously` que s'il n'y a pas de session, et le rafraîchissement de jeton ne
-- touche pas ce champ : c'est `created_at` sous un autre nom. S'en servir aurait reproduit
-- le bug en ayant l'air de le corriger.
--
-- `usage_events` convient parce que `app_open` est émis à chaque ouverture et que
-- `purge_usage_events()` garde **12 mois** — largement de quoi porter une fenêtre de 90
-- jours. Mais `track()` est fire-and-forget et renonce si la session n'est pas prête : on ne
-- s'appuie donc pas sur lui seul. Trois autres traces d'activité, plus rares mais
-- indiscutables, entrent dans le calcul — un bilan soumis, un check-in répondu, un retour
-- envoyé. **Le plus récent de tous gagne** : tout signe de vie compte, et il faut que les
-- quatre soient muets pendant 90 jours pour être supprimé.
--
-- `created_at` reste dans le calcul comme plancher : un compte créé hier sans aucun événement
-- ne doit pas être considéré comme inactif depuis toujours.

create or replace function public.purge_stale_anonymous_accounts()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  delete from auth.users u
  where u.is_anonymous = true
    and greatest(
      u.created_at,
      coalesce((select max(e.occurred_at) from public.usage_events e where e.user_id = u.id), u.created_at),
      coalesce((select max(a.submitted_at) from public.assessments a where a.user_id = u.id), u.created_at),
      coalesce((select max(a.created_at)   from public.assessments a where a.user_id = u.id), u.created_at),
      coalesce((select max(c.responded_at) from public.engagement_checkins c where c.user_id = u.id), u.created_at),
      coalesce((select max(f.created_at)   from public.feedback f where f.user_id = u.id), u.created_at)
    ) < now() - interval '90 days';
end;
$function$;

comment on function public.purge_stale_anonymous_accounts() is
  'Supprime les sessions anonymes muettes depuis 90 jours. Inactivité, pas âge : voir l''en-tête de la migration 20260907093000 — se fier à last_sign_in_at reproduirait le bug, ce champ ne bougeant jamais pour une session anonyme.';

-- Même garde-fou que partout ailleurs dans ce schéma : PostgreSQL accorde EXECUTE à PUBLIC à
-- la création, et anon/authenticated en héritent. Révoquer depuis `anon, authenticated` seuls
-- ne révoque rien (cf. CLAUDE.md, piège vérifié sur purge_usage_events).
revoke execute on function public.purge_stale_anonymous_accounts() from public, anon, authenticated;
