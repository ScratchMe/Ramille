-- v1-13, chantier C2.4 — une réponse neutre : « pas de trajet cette période ».
-- Arbitrage D3. Constats A13-8, A4-12. Base prescrite par `v1-14` §4.1, copie §3.1 et §3.2.
--
-- ## Le défaut
--
-- Une semaine de congés, un mois sans voyage : la question du point n'a aucune réponse honnête.
-- « Non » déclenche la consolation d'échec et s'inscrit en « Non » dans le suivi ; ne rien
-- répondre laisse le point expirer, ce qui compte pour une occasion manquée et fait basculer le
-- régime de rappel. Pour un profil « deux vols par an », dix mois sur douze deviennent une suite
-- de « Non » — exactement l'expérience de série cassée que le produit refuse (spec §7, et l'écran
-- `/suivi` qui n'a aucune mécanique d'échec).
--
-- ## Le piège du schéma, et pourquoi ce n'est pas `response = null`
--
-- La tentation est de laisser `response` nulle sur un point pourtant répondu. Elle ne coûte rien
-- en base et casse la lecture : `loadAnsweredCheckins` écarte les lignes dont `response` est nulle
-- (relevé dans le code au 11/09/2026), donc la personne qui choisit la troisième réponse ne verrait
-- **rien** apparaître dans son suivi — une réponse donnée et perdue, sans message d'erreur.
--
-- D'où `response_kind`, qui est désormais **la vérité** : `oui` | `non` | `sans_objet`, nulle tant
-- que le point n'est pas répondu. `response boolean` reste, **dérivée** (`true` / `false` / `null`),
-- pour que les vues d'analyse et l'historique existants ne bougent pas. Une contrainte lie les deux
-- plutôt qu'un commentaire : une dérivation tenue par convention se défait au premier `update`
-- écrit ailleurs, et la divergence serait invisible — deux colonnes plausibles qui ne disent pas la
-- même chose.
--
-- Le filtre à changer n'était donc pas la valeur mais la **lecture** : tout ce qui compte « les
-- points répondus » filtre `status = 'answered'` et lit `response_kind`, jamais
-- `response is not null`. C'est déjà le cas de `recapDeSaison` (C2.14, qui l'a anticipé) et de
-- `regime_de_rappel` (C2.9) ; `loadAnsweredCheckins` est réparée côté client dans le même lot.

-- ── 1. La colonne, et la dérivation tenue par une contrainte ────────────────────────────────

alter table public.engagement_checkins
  add column if not exists response_kind text;

comment on column public.engagement_checkins.response_kind is
  'La réponse, depuis C2.4 : oui | non | sans_objet, nulle tant que le point n''est pas répondu. '
  'C''est la vérité ; engagement_checkins.response est la dérivée booléenne, tenue par la '
  'contrainte engagement_checkins_reponse_coherente. Tout ce qui compte les points répondus filtre '
  'sur status = ''answered'' et lit cette colonne, jamais response is not null.';

-- **Le backfill passe sous le trigger, pas à travers.** `prevent_answered_checkin_update` lève sur
-- toute mise à jour d'une ligne déjà répondue — c'est précisément son rôle (C1.12) — donc un
-- `update` de rattrapage sur les points historiques échouerait. Il est désactivé le temps de
-- l'écriture, et la contrainte n'est posée qu'après : l'ordre inverse ferait échouer l'`alter`
-- sur les lignes pas encore rattrapées.
alter table public.engagement_checkins disable trigger prevent_answered_checkin_update;

update public.engagement_checkins
set response_kind = case when response then 'oui' else 'non' end
where status = 'answered' and response is not null and response_kind is null;

alter table public.engagement_checkins enable trigger prevent_answered_checkin_update;

alter table public.engagement_checkins
  drop constraint if exists engagement_checkins_response_kind_check;
alter table public.engagement_checkins
  add constraint engagement_checkins_response_kind_check
  check (response_kind is null or response_kind in ('oui', 'non', 'sans_objet'));

-- **Deux invariants dans une seule contrainte**, parce qu'ils portent tous les deux sur la même
-- chose — ce qu'une réponse est — et qu'un seul message d'erreur vaut mieux que deux.
--
--   1. **Répondu ⟺ genre renseigné.** C'est la forme structurelle du défaut du chantier : une ligne
--      `answered` sans genre est une réponse que `loadAnsweredCheckins` écarte, donc une réponse
--      donnée et perdue. Aucun chemin de production ne peut la produire aujourd'hui (le RPC est le
--      seul écrivain et pose toujours le genre), et c'est justement pourquoi l'écrire coûte zéro et
--      garde le jour où un second chemin apparaîtra — C4.1 ajoutera une forme de réponse. Le sens
--      inverse compte autant : un genre posé sur un point `pending` serait une réponse qui ne
--      s'affiche pas.
--   2. **La dérivation, écrite une fois pour toutes.** Les trois réponses disent la même chose dans
--      les deux colonnes ; une quatrième combinaison n'existe pas.
alter table public.engagement_checkins
  drop constraint if exists engagement_checkins_reponse_coherente;
alter table public.engagement_checkins
  add constraint engagement_checkins_reponse_coherente
  check (
    (status = 'answered') = (response_kind is not null)
    and (
      response_kind is null
      or (response_kind = 'oui' and response is true)
      or (response_kind = 'non' and response is false)
      or (response_kind = 'sans_objet' and response is null)
    )
  );

-- ── 2. Le RPC prend les trois valeurs ──────────────────────────────────────────────────────
--
-- **La signature change, elle ne s'ajoute pas.** `p_reponse boolean` ne peut pas porter un
-- troisième état, et garder les deux versions côte à côte coûterait plus que la migration : deux
-- fonctions de même nom que PostgREST départage sur le type d'un champ JSON, et une surcharge
-- qu'aucun appel n'émet se lit « morte » et non « réservée » (la leçon de `p_replace` en C2.2).
-- L'app n'est pas encore publiée sur Play, donc aucun client installé n'appelle l'ancienne forme ;
-- le jour où il y en aura un, ce raisonnement ne tiendra plus et il faudra une seconde fonction
-- nommée.
drop function if exists public.repondre_au_checkin(uuid, boolean);

create or replace function public.repondre_au_checkin(p_checkin_id uuid, p_reponse text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lignes integer;
  v_statut text;
begin
  -- Le message nomme les trois valeurs : il remonte jusqu'au client par PostgREST, et un appel
  -- qui envoie encore un booléen (`'true'` après conversion JSON) doit lire pourquoi il est refusé
  -- plutôt qu'un « violates check constraint » sur un nom de contrainte.
  if p_reponse is null or p_reponse not in ('oui', 'non', 'sans_objet') then
    raise exception 'Réponse invalide : un point de suivi se répond par « oui », « non » ou « sans_objet ».'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.engagement_checkins
  set status = 'answered',
      response_kind = p_reponse,
      -- La dérivée, posée ici et nulle part ailleurs — la contrainte de cohérence la garde.
      response = case p_reponse when 'oui' then true when 'non' then false else null end,
      responded_at = now()
  where id = p_checkin_id
    and user_id = auth.uid()
    and status = 'pending';

  get diagnostics v_lignes = row_count;

  if v_lignes = 0 then
    -- Deux refus très différents, et le client doit pouvoir les distinguer : une session qui a
    -- changé (ou un identifiant qui n'est pas le sien) n'appelle pas le même message qu'un point
    -- que le cron a déjà clos pendant que la carte restait affichée. La lecture est bornée au
    -- propriétaire, pour ne rien apprendre sur le point d'un tiers.
    select status into v_statut
    from public.engagement_checkins
    where id = p_checkin_id and user_id = auth.uid();

    if v_statut is null then
      raise exception 'Point de suivi introuvable.' using errcode = 'no_data_found';
    end if;

    -- L'état est nommé en français : `answered` et `expired` sont des valeurs de colonne, et ce
    -- message remonte jusqu'au client par PostgREST.
    raise exception 'Ce point de suivi n''attend plus de réponse (%).',
      case v_statut
        when 'answered' then 'déjà répondu'
        when 'expired' then 'clos par la période suivante'
        else v_statut
      end
      using errcode = 'invalid_parameter_value';
  end if;

  return v_lignes;
end;
$function$;

-- Même régime de privilèges que la version booléenne : le client doit pouvoir l'appeler, c'est la
-- vérification de propriété à l'intérieur qui protège. `PUBLIC` est révoqué explicitement — le
-- `grant` implicite de la création est le piège de 20260905170700.
revoke execute on function public.repondre_au_checkin(uuid, text) from public, anon;
grant execute on function public.repondre_au_checkin(uuid, text) to authenticated;

-- ── 3. La mesure : un troisième compteur, sinon « non » gonfle en silence ───────────────────
--
-- `answered` compte les trois réponses, `answered_yes` les seuls « oui » : l'écart entre les deux
-- se lisait « non », et il vient d'accueillir les « sans objet » sans que rien ne le dise. C'est la
-- dérive que `usage_events` documente ailleurs — deux chiffres qui divergent le jour où l'un des
-- deux chemins change. La colonne est **ajoutée en fin de vue** pour que `create or replace`
-- suffise (PostgreSQL refuse de réordonner ou retyper les colonnes existantes d'une vue).
create or replace view analytics.engagement_by_segment as
select
  s.zone_type,
  s.tc_access,
  s.dominant_poste,
  c.loop_type,
  count(*) filter (where c.status = 'answered') as answered,
  count(*) filter (where c.status = 'expired') as expired,
  count(*) filter (where c.status = 'answered' and c.response) as answered_yes,
  count(*) filter (where c.response_kind = 'sans_objet') as answered_sans_objet
from public.engagement_checkins c
join analytics.user_segments s on s.user_id = c.user_id
group by 1, 2, 3, 4;

revoke all on analytics.engagement_by_segment from anon, authenticated;

-- ── 4. Contrôles ───────────────────────────────────────────────────────────────────────────

do $controle$
declare
  v_n integer;
begin
  -- Le backfill n'a laissé aucun point répondu sans genre : sans lui, le suivi d'un compte
  -- existant perdrait ses lignes le jour où la lecture passera sur `response_kind`.
  select count(*) into v_n
  from public.engagement_checkins
  where status = 'answered' and response_kind is null;
  if v_n > 0 then
    raise exception 'C2.4 : % point(s) répondu(s) sans response_kind après le backfill', v_n;
  end if;

  -- Et aucune ligne n'a pu conserver une dérivée incohérente (la contrainte vient d'être posée,
  -- donc ceci vérifie surtout que le backfill a écrit les bonnes valeurs).
  select count(*) into v_n
  from public.engagement_checkins
  where response_kind = 'oui' and response is not true;
  if v_n > 0 then
    raise exception 'C2.4 : % point(s) « oui » dont la dérivée n''est pas true', v_n;
  end if;

  -- L'ancienne signature est bien partie : la garder en vie ferait deux chemins d'écriture pour
  -- une même colonne, dont un qui ne connaît pas `response_kind`.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'repondre_au_checkin'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, boolean'
  ) then
    raise exception 'C2.4 : repondre_au_checkin(uuid, boolean) existe encore';
  end if;

  -- Le trigger est bien réarmé. Un backfill qui le laisserait désactivé rendrait réécrivable tout
  -- point déjà répondu, c'est-à-dire défairait C1.12 sans que rien ne tombe.
  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.engagement_checkins'::regclass
      and tgname = 'prevent_answered_checkin_update'
      and tgenabled = 'D'
  ) then
    raise exception 'C2.4 : le trigger prevent_answered_checkin_update est resté désactivé';
  end if;
end
$controle$;
