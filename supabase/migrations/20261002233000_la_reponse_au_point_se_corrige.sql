-- La réponse au point se corrige jusqu'au point suivant (`v1-33` §6, tranché le 01/10/2026, précisé
-- le 02/10/2026 avec la personne qui pilote).
--
-- **Le défaut.** « Non » et « Oui » sont à 8 px l'un de l'autre, et un toucher erroné était
-- définitif : `repondre_au_checkin` refusait un point déjà répondu (C1.12), et
-- `prevent_answered_checkin_update` levait sur toute mise à jour d'une ligne répondue. Corriger une
-- réponse n'avait jamais été posé comme question de produit.
--
-- **La règle.** La carte répondue offre « Modifier ma réponse », qui rouvre les trois réponses ; le
-- RPC accepte de réécrire un point répondu **tant qu'il est celui de la période interrogée** —
-- jusqu'à l'arrivée du point suivant, le temps qu'un point non répondu aurait pour l'être, et le
-- temps que la carte répondue reste affichée (`estDeLaPeriodeCourante`, `src/types/checkin.ts`).
-- `responded_at` repart à maintenant : c'est l'instant de la dernière réponse, que le pied de la carte
-- date (« Répondu mercredi. ») et que lisent la purge pour inactivité et l'administration — une
-- correction est une activité. Le statut reste `answered`, donc les rappels ne repartent pas.
--
-- **Ce qui ne change pas** : C1.12 tient pour tout ce qui n'est pas une correction. Le trigger lève
-- toujours sur une ligne répondue, sauf quand le RPC l'a annoncé (un réglage local à la transaction,
-- posé juste avant son `update` et retiré juste après), et alors **seules les trois colonnes d'une
-- réponse** peuvent changer — `response_kind`, `response`, `responded_at`. Les libellés figés,
-- `period_start`, la question figée et le statut restent hors d'atteinte, de la correction comme de
-- tout autre chemin. Aucun client n'écrit `engagement_checkins` (ni policy, ni privilège `update`) :
-- le trigger garde contre le code serveur, la RLS n'y étant pour rien.
--
-- **Réécrites depuis `pg_get_functiondef` du distant** (`SUPABASE.md` §2.3), relevées le 02/10/2026 :
-- `repondre_au_checkin` est le corps de `20260912200000`, et `prevent_answered_checkin_update` celui
-- de `20260904180000`.

-- ---------------------------------------------------------------------------------------------
-- 1. Le trigger : une ligne répondue ne change que par une correction, et que sa réponse
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_answered_checkin_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if old.status = 'answered' then
    -- La correction (`v1-33` §6, 02/10/2026) : annoncée par `repondre_au_checkin`, et limitée aux trois
    -- colonnes d'une réponse. Les autres se comparent en bloc, pour qu'une colonne ajoutée demain soit
    -- gardée sans retoucher ce trigger.
    if coalesce(current_setting('ramille.correction_du_point', true), '') = 'oui'
       and new.status = 'answered'
       and (to_jsonb(new) - array['response_kind', 'response', 'responded_at'])
           = (to_jsonb(old) - array['response_kind', 'response', 'responded_at']) then
      return new;
    end if;
    raise exception 'engagement_checkins: impossible de modifier un check-in déjà répondu (id=%)', old.id;
  end if;
  return new;
end;
$function$;

-- Les privilèges, rejoués comme ceux de `20260911100000` : une fonction de trigger ne s'appelle pas.
revoke execute on function public.prevent_answered_checkin_update() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. Le RPC : un point répondu se réécrit tant qu'il est celui de la période interrogée
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.repondre_au_checkin(p_checkin_id uuid, p_reponse text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- La correction (`v1-33` §6, 02/10/2026) : un point déjà répondu se réécrit tant qu'il est celui de la
  -- période interrogée — jusqu'au point suivant. Le début de cette période est celui des deux
  -- générateurs (`generate_commute_checkins`, `generate_extras_checkins`) et de
  -- `debutDePeriodeInterrogee` côté client, qui borne l'affichage de la carte répondue : les trois se
  -- touchent ensemble. Le trigger n'accepte la réécriture que sur ce réglage, posé le temps de
  -- l'`update` et retiré aussitôt.
  perform set_config('ramille.correction_du_point', 'oui', true);

  update public.engagement_checkins
  set status = 'answered',
      response_kind = p_reponse,
      -- La dérivée, posée ici et nulle part ailleurs — la contrainte de cohérence la garde.
      response = case p_reponse when 'oui' then true when 'non' then false else null end,
      responded_at = now()
  where id = p_checkin_id
    and user_id = auth.uid()
    and (status = 'pending'
         or (status = 'answered'
             and period_start >= case loop_type
                                   when 'commute' then date_trunc('week', now())::date - 7
                                   else (date_trunc('month', now()) - interval '1 month')::date
                                 end));

  get diagnostics v_lignes = row_count;
  perform set_config('ramille.correction_du_point', '', true);

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
    -- message remonte jusqu'au client par PostgREST. Un point répondu n'est refusé que hors de sa
    -- période : la correction y est close.
    raise exception 'Ce point de suivi n''attend plus de réponse (%).',
      case v_statut
        when 'answered' then 'déjà répondu, et le point suivant est arrivé'
        when 'expired' then 'clos par la période suivante'
        else v_statut
      end
      using errcode = 'invalid_parameter_value';
  end if;

  return v_lignes;
end;
$function$;

-- Les privilèges, rejoués comme ceux de `20260912200000` : le client l'appelle, la vérification de
-- propriété à l'intérieur protège, et `PUBLIC` est révoqué explicitement.
revoke execute on function public.repondre_au_checkin(uuid, text) from public, anon;
grant execute on function public.repondre_au_checkin(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Contrôle, lu sur les corps installés sans leurs commentaires (`SUPABASE.md` §1.5)
-- ---------------------------------------------------------------------------------------------

do $controle_de_la_correction$
declare
  v_rpc text := regexp_replace(
    pg_get_functiondef('public.repondre_au_checkin(uuid,text)'::regprocedure),
    '--[^' || chr(10) || ']*', '', 'g');
  v_garde text := regexp_replace(
    pg_get_functiondef('public.prevent_answered_checkin_update()'::regprocedure),
    '--[^' || chr(10) || ']*', '', 'g');
begin
  if v_rpc not like '%set_config(''ramille.correction_du_point'', ''oui'', true)%'
     or v_rpc not like '%set_config(''ramille.correction_du_point'', '''', true)%' then
    raise exception 'CONTROLE: repondre_au_checkin n''annonce plus la correction, ou ne la retire plus';
  end if;
  if v_rpc not like '%date_trunc(''week'', now())::date - 7%'
     or v_rpc not like '%date_trunc(''month'', now()) - interval ''1 month''%' then
    raise exception 'CONTROLE: la correction n''est plus bornée à la période interrogée';
  end if;
  if v_rpc not like '%user_id = auth.uid()%' then
    raise exception 'CONTROLE: la propriété du point n''est plus vérifiée';
  end if;
  if v_garde not like '%array[''response_kind'', ''response'', ''responded_at'']%' then
    raise exception 'CONTROLE: le trigger ne limite plus la correction aux colonnes d''une réponse';
  end if;
  if not exists (
    select 1 from pg_trigger
     where tgrelid = 'public.engagement_checkins'::regclass
       and tgname = 'prevent_answered_checkin_update' and tgenabled <> 'D'
  ) then
    raise exception 'CONTROLE: le trigger qui garde les points répondus est absent ou désactivé';
  end if;
  if has_function_privilege('anon', 'public.repondre_au_checkin(uuid,text)', 'execute') then
    raise exception 'CONTROLE: repondre_au_checkin est appelable sans session';
  end if;
end
$controle_de_la_correction$;
