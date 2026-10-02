-- `v1-27` §12.28, 02/10/2026 — la mesure de la connexion distingue un rattachement d'une reconnexion.
--
-- ## Le défaut
--
-- `connexion_demande` (l'intention) et `connexion_success` (le fait constaté) existaient pour une seule
-- comparaison : leur écart **était** le taux de codes de rattachement jamais saisis (C1.2, 11/09/2026).
-- Deux chemins l'ont défaite sans toucher à la mesure :
--
--   * depuis le 21/09/2026, une adresse déjà prise sur `/connexion/email` reçoit un code de **connexion**
--     au compte existant, et cette branche émettait `connexion_demande` sans rien qui la distingue ;
--   * une reconnexion par code — par cette branche ou par `/connexion/retrouver` — arrive sur le plan
--     avec un compte permanent et une annonce de rattachement jamais faite sur cet appareil, et le plan
--     émettait `connexion_success` comme pour un rattachement.
--
-- Les deux événements comptaient donc aussi des reconnexions, et leur écart pouvait devenir négatif.
--
-- ## Ce que fait cette migration
--
-- **Elle ne réécrit que deux descriptions du référentiel**, seul endroit où la base peut porter les
-- valeurs attendues d'une propriété : `check_usage_event_props` ne compte que des clés et des longueurs
-- (`MESURE.md` §1). Le correctif est côté client : `connexion_demande` porte `flux` (`rattachement` |
-- `connexion`, la source étant `ContexteDuCode` de `src/types/connexion.ts`), et le plan ne compte plus
-- un rattachement constaté après une reconnexion (`traceverte.session_retrouvee.v1`,
-- `src/lib/connexion-prefs.ts`).
--
-- **Les lignes d'avant ne se rattrapent pas** : un `connexion_demande` sans `flux` est d'avant le
-- 02/10/2026, et peut être l'un ou l'autre. Les requêtes du registre (`docs/exploitation/README.md`
-- §8.5 quater) le disent.
--
-- Idempotente : un `update` sur la clé naturelle, rejouable tel quel.

update public.usage_event_types
set description = 'Un code a été demandé depuis /connexion/email (props.flux). flux = rattachement : '
  || 'un code de rattachement pour une adresse libre — l''intention que connexion_success peut suivre. '
  || 'flux = connexion : l''adresse avait déjà un compte, le code y reconnecte — une reconnexion, qui ne se '
  || 'compare pas à connexion_success. Sans flux : d''avant le 02/10/2026, l''un ou l''autre.'
where name = 'connexion_demande';

update public.usage_event_types
set description = 'Rattachement effectif du compte (props.method : google, email). Jamais une reconnexion '
  || 'depuis le 02/10/2026 : avant, le plan comptait aussi le compte retrouvé par code.'
where name = 'connexion_success';

do $$
begin
  if (select count(*) from public.usage_event_types
      where name in ('connexion_demande', 'connexion_success') and description like '%02/10/2026%') <> 2 then
    raise exception 'Les deux descriptions de la connexion n''ont pas été réécrites';
  end if;
end $$;
