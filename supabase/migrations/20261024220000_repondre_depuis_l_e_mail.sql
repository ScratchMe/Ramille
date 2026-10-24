-- Répondre au point depuis l'e-mail (24/10/2026, étape 6b de
-- `docs/architecture/v1-35-l-audit-en-chantiers.md`).
--
-- ## Pourquoi
--
-- L'audit du 18/10/2026 : « on ne peut pas répondre depuis la notification ni depuis l'e-mail ». Le
-- rappel par e-mail ne portait qu'un lien vers le plan, et le plan demande la session du compte : sur un
-- autre appareil, un autre navigateur, ou un téléphone où l'app n'est pas installée, répondre voulait dire
-- retrouver son compte par un code reçu… par e-mail, puis chercher la carte. L'e-mail porte désormais les
-- trois réponses de la carte, chacune avec son lien, et une page sans compte les reçoit.
--
-- ## La page demande le geste, elle ne le fait pas
--
-- C'est la leçon de `/rappels/stop` (04/10/2026, `BOUCLE.md` §3) : l'analyseur de liens d'une messagerie
-- professionnelle ouvre les liens d'un e-mail pour les inspecter, et exécute parfois la page. Une réponse
-- écrite à l'ouverture serait donnée par un robot — et il ouvrirait les trois liens. La page `/point` lit
-- donc le point à l'ouverture (`le_point_du_lien`, une lecture, sans effet), affiche la question et la
-- réponse choisie dans l'e-mail, et n'écrit qu'au toucher d'« Envoyer ma réponse »
-- (`repondre_par_le_lien`).
--
-- ## Ce que fait cette migration
--
-- 1. `notification_outbox.jeton_de_reponse` : un jeton par rappel d'un point, tiré à la mise en file comme
--    le jeton de désinscription, et `lien_de_reponse_utilise_le`, l'heure de la dernière réponse donnée
--    par ce lien — la jumelle d'`unsubscribe_used_at`, et le seul endroit où se lit ce que l'e-mail apporte
--    à la boucle (`docs/exploitation/README.md` §8.1).
-- 2. `libelle_sans_objet(loop_type, poste, period_start)` : le libellé de la troisième réponse, **jumelle
--    SQL de `libelleSansObjet`** (`src/types/checkin.ts`), à toucher ensemble — l'e-mail et la carte
--    doivent nommer la même réponse dans les mêmes mots, comme ils posent la même question.
-- 3. `ecrire_la_reponse_du_point(user_id, checkin_id, réponse)` : le corps de `repondre_au_checkin`
--    (empreinte `caf3f81257bea9df065a8ed73c74875d`, la même en local et sur le distant le 24/10/2026), le
--    propriétaire passé en argument au lieu d'être lu dans la session, et sa borne lue dans
--    `debut_de_la_periode_interrogee(loop_type)` — la formule qu'il écrivait en ligne, que la lecture par le
--    lien lit aussi. `repondre_au_checkin` l'appelle avec `auth.uid()`, `repondre_par_le_lien` avec le
--    propriétaire du jeton : **un seul écrivain des réponses**, une seule borne de correction, une seule
--    annonce au trigger (`ramille.correction_du_point`). Fermée à tout client.
-- 4. `le_point_du_lien(jeton)` et `repondre_par_le_lien(jeton, réponse)`, ouvertes à `anon` : **le jeton
--    est l'autorisation**, comme celui de la désinscription, **et il ne vaut que le temps de la période**
--    (la borne de la correction). Pendant ce temps, il lit la question de ce point-là, sa réponse et ce
--    qu'elle a évité, et y répond — un second lien du même e-mail propose de corriger. Ensuite, la lecture ne
--    rend plus que la question, et la réponse est refusée. Jamais un autre point, jamais le compte, ni
--    identifiant ni adresse.
-- 5. `enqueue_checkin_reminders` : le jeton, et les trois liens dans le corps — quatre substitutions
--    vérifiées sur le corps installé (empreinte `64404495b2c940bfe29c71d888baa0ca`, la même des deux côtés).
--    Le lien vers le plan reste, en dernier : sur Android, c'est lui qu'ouvre l'app (`/plan?rappel=1`, le
--    seul chemin que l'app revendique), et le test `09` l'épingle.
-- 6. L'export rend `lien_de_reponse_utilise_le` (une substitution, empreinte
--    `fc1377a1a9b5005dae03ce071f6f4f6a`). Le jeton, lui, n'en sort pas : l'export remplace déjà tout
--    `jeton=<uuid>` du message (`20261002203559`), et les trois liens portent leur jeton sous ce nom-là
--    exprès.
--
-- Les rappels déjà en file gardent leur corps : un lien vers le plan, qui marche toujours. Aucun
-- rattrapage — réécrire un message pas encore parti serait possible, mais il partira dans quatre jours au
-- plus, et le suivant portera les réponses.
--
-- Rejouable : colonnes et contraintes en `if not exists` / `drop … if exists`, fonctions en
-- `create or replace`, substitutions reconnues faites à la présence de leur remplacement.

-- 1. Les deux colonnes.
alter table public.notification_outbox add column if not exists jeton_de_reponse uuid;
alter table public.notification_outbox add column if not exists lien_de_reponse_utilise_le timestamptz;

alter table public.notification_outbox drop constraint if exists notification_outbox_jeton_de_reponse_key;
alter table public.notification_outbox add constraint notification_outbox_jeton_de_reponse_key
  unique (jeton_de_reponse);

-- Le mot de la veille n'a pas de question, donc pas de réponse : seule une ligne de point porte le jeton.
alter table public.notification_outbox drop constraint if exists notification_outbox_jeton_de_reponse_d_un_point;
alter table public.notification_outbox add constraint notification_outbox_jeton_de_reponse_d_un_point
  check (jeton_de_reponse is null or genre = 'point');

comment on column public.notification_outbox.jeton_de_reponse is
  'Le jeton des trois liens de réponse du message (`/point?jeton=…&reponse=…`, étape 6b de v1-35). Il autorise, '
  'sans session et jusqu''à la fin de la période du point, à lire sa question et sa réponse et à y répondre ; '
  'ensuite, la question seule. Nul sur le mot de la veille et sur les rappels mis en file avant le 24/10/2026.';
comment on column public.notification_outbox.lien_de_reponse_utilise_le is
  'L''heure de la dernière réponse donnée par le lien de ce message (`repondre_par_le_lien`). Nulle tant que '
  'personne n''a répondu depuis l''e-mail.';

-- 2. Le libellé de la troisième réponse — jumelle de `libelleSansObjet` (`src/types/checkin.ts`).
create or replace function public.libelle_sans_objet(p_loop_type text, p_poste text, p_period_start date)
 returns text
 language sql
 immutable
 set search_path to 'public'
as $function$
  -- « la semaine dernière » et non « cette semaine » : le point interroge la période écoulée (C2.3), et la
  -- question juste au-dessus ouvre sur « La semaine dernière ». Le mois est celui de la période interrogée.
  select case
    when p_loop_type = 'commute' then 'Pas de trajet la semaine dernière'
    else case p_poste
           when 'leisure' then 'Pas de sortie '
           when 'travel' then 'Pas de voyage '
           else 'Pas de déplacement '
         end
         || coalesce('en ' || public.mois_francais(p_period_start), 'ce mois-ci')
  end;
$function$;

comment on function public.libelle_sans_objet(text, text, date) is
  'Jumelle de libelleSansObjet (src/types/checkin.ts) — à toucher ensemble : l''e-mail du point et la carte '
  'nomment la troisième réponse dans les mêmes mots (étape 6b de v1-35, test 64).';

revoke execute on function public.libelle_sans_objet(text, text, date) from public, anon, authenticated;

-- 2 bis. Le début de la période que les générateurs interrogent en ce moment — jumelle de
-- `debutDePeriodeInterrogee` (`src/types/checkin.ts`). L'écrivain y borne la correction, la lecture par le
-- lien ce qu'elle rend : une seule formule pour les deux, celle des deux générateurs, qui gardent la leur.
create or replace function public.debut_de_la_periode_interrogee(p_loop_type text)
 returns date
 language sql
 stable
 set search_path to 'public'
as $function$
  select case p_loop_type
    when 'commute' then date_trunc('week', now())::date - 7
    else (date_trunc('month', now()) - interval '1 month')::date
  end;
$function$;

comment on function public.debut_de_la_periode_interrogee(text) is
  'Jumelle de debutDePeriodeInterrogee (src/types/checkin.ts) et des formules de generate_commute_checkins et '
  'generate_extras_checkins — à toucher ensemble. Lue par ecrire_la_reponse_du_point et le_point_du_lien.';

revoke execute on function public.debut_de_la_periode_interrogee(text) from public, anon, authenticated;

-- 3. Le seul écrivain des réponses : le corps de `repondre_au_checkin`, le propriétaire en argument.
create or replace function public.ecrire_la_reponse_du_point(p_user_id uuid, p_checkin_id uuid, p_reponse text)
 returns integer
 language plpgsql
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

  -- La correction (`v1-33` §6, 02/10/2026) : un point déjà répondu se réécrit tant qu'il est celui de la
  -- période interrogée — jusqu'à la fin de sa période, minuit UTC. Le début de cette période est celui des deux
  -- générateurs (`generate_commute_checkins`, `generate_extras_checkins`) et de
  -- `debutDePeriodeInterrogee` côté client, qui borne l'affichage de la carte répondue : il se lit dans
  -- `debut_de_la_periode_interrogee`, que la lecture par le lien partage. Le trigger n'accepte la réécriture
  -- que sur ce réglage, posé le temps de l'`update` et retiré aussitôt.
  perform set_config('ramille.correction_du_point', 'oui', true);

  update public.engagement_checkins
  set status = 'answered',
      response_kind = p_reponse,
      -- La dérivée, posée ici et nulle part ailleurs — la contrainte de cohérence la garde.
      response = case p_reponse when 'oui' then true when 'non' then false else null end,
      responded_at = now()
  where id = p_checkin_id
    and user_id = p_user_id
    and (status = 'pending'
         or (status = 'answered' and period_start >= public.debut_de_la_periode_interrogee(loop_type)));

  get diagnostics v_lignes = row_count;
  perform set_config('ramille.correction_du_point', '', true);

  if v_lignes = 0 then
    -- Deux refus très différents, et le client doit pouvoir les distinguer : une session qui a
    -- changé (ou un identifiant qui n'est pas le sien) n'appelle pas le même message qu'un point
    -- que le cron a déjà clos pendant que la carte restait affichée. La lecture est bornée au
    -- propriétaire, pour ne rien apprendre sur le point d'un tiers.
    select status into v_statut
    from public.engagement_checkins
    where id = p_checkin_id and user_id = p_user_id;

    if v_statut is null then
      raise exception 'Point de suivi introuvable.' using errcode = 'no_data_found';
    end if;

    -- L'état est nommé en français : `answered` et `expired` sont des valeurs de colonne, et ce
    -- message remonte jusqu'au client par PostgREST. Un point répondu n'est refusé que hors de sa
    -- période : la correction y est close.
    raise exception 'Ce point de suivi n''attend plus de réponse (%).',
      case v_statut
        when 'answered' then 'déjà répondu, et sa période est passée'
        when 'expired' then 'clos par la période suivante'
        else v_statut
      end
      using errcode = 'invalid_parameter_value';
  end if;

  return v_lignes;
end;
$function$;

-- Sans `security definer` : elle s'exécute avec les droits de qui l'appelle, et ses deux appelants le sont.
-- Fermée à tout client — elle prend le propriétaire en argument, donc l'ouvrir laisserait répondre pour
-- n'importe qui.
revoke execute on function public.ecrire_la_reponse_du_point(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.repondre_au_checkin(p_checkin_id uuid, p_reponse text)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  -- Le corps vit dans `ecrire_la_reponse_du_point` depuis le 24/10/2026 (étape 6b de `v1-35`) : la réponse
  -- donnée depuis l'e-mail passe par le même écrivain, avec le propriétaire du jeton au lieu de la session.
  -- Sans session, c'est le privilège qui refuse (`42501`) ; un `auth.uid()` nul — celui de `service_role` —
  -- ne trouve aucune ligne, et le refus est `P0002`, comme avant.
  return public.ecrire_la_reponse_du_point(auth.uid(), p_checkin_id, p_reponse);
end;
$function$;

-- 4. La lecture et la réponse par le jeton, ouvertes sans session. La lecture est supprimée d'abord : son type
-- de retour a changé pendant l'écriture de cette migration (`ouvert`, des colonnes réordonnées), et
-- `create or replace` refuse de changer un type de retour (42P13) sur une base qui aurait reçu la version
-- d'avant. Les privilèges sont reposés plus bas.
drop function if exists public.le_point_du_lien(uuid);
create or replace function public.le_point_du_lien(p_jeton uuid)
 returns table (
   loop_type text,
   poste text,
   question_kind text,
   mode text,
   period_start date,
   period_label text,
   trip_label text,
   question text,
   ouvert boolean,
   status text,
   response_kind text,
   responded_at timestamptz,
   committed_saving_kg_once numeric,
   boucle_tourne boolean
 )
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  -- Ce que la page `/point` affiche, et rien d'autre : ni l'identifiant du point, ni celui du compte, ni
  -- l'adresse. La question est celle que le message a portée — figée, ou recomposée pour une ligne d'avant
  -- C2.1 par la même fonction que `enqueue_checkin_reminders`.
  --
  -- **Le reste ne se lit que tant que le point accepte une réponse** (`ouvert`, la borne de l'écrivain) :
  -- son état, sa réponse, son heure, ce qu'elle a évité, et si sa boucle tourne — pour que la réplique et le
  -- pied ne donnent pas rendez-vous à tort. Passé la période, le jeton ne rend plus que la question : un
  -- e-mail gardé six mois, ou transféré, ne dit pas ce qui a été répondu, ni qu'un bilan a été retiré
  -- (contre-lecture du 24/10/2026).
  select c.loop_type, c.poste, c.question_kind, c.mode, c.period_start, c.period_label, c.trip_label,
         coalesce(
           c.committed_question,
           public.checkin_question(c.loop_type, c.question_kind, c.poste, c.mode, c.period_start)
         ),
         a.ouvert,
         case when a.ouvert then c.status end,
         case when a.ouvert then c.response_kind end,
         case when a.ouvert then c.responded_at end,
         case when a.ouvert then c.committed_saving_kg_once end,
         a.ouvert and exists (
           select 1 from public.boucles_du_dernier_bilan(c.user_id) b where b.loop_type = c.loop_type
         )
  from public.notification_outbox o
  join public.engagement_checkins c on c.id = o.checkin_id
  cross join lateral (
    select c.status = 'pending'
           or (c.status = 'answered' and c.period_start >= public.debut_de_la_periode_interrogee(c.loop_type))
           as ouvert
  ) a
  where o.jeton_de_reponse = p_jeton;
$function$;

create or replace function public.repondre_par_le_lien(p_jeton uuid, p_reponse text)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_checkin_id uuid;
  v_lignes integer;
begin
  select o.user_id, o.checkin_id into v_user_id, v_checkin_id
  from public.notification_outbox o
  where o.jeton_de_reponse = p_jeton;

  -- Un jeton inconnu — purgé avec son message après six mois, abîmé, inventé — reçoit le refus d'un point
  -- clos : il n'y a rien à réessayer. La page ne l'atteint pas d'ordinaire, la lecture l'ayant déjà dit.
  if v_checkin_id is null then
    raise exception 'Ce lien de réponse n''est plus valable.' using errcode = 'invalid_parameter_value';
  end if;

  v_lignes := public.ecrire_la_reponse_du_point(v_user_id, v_checkin_id, p_reponse);

  update public.notification_outbox
  set lien_de_reponse_utilise_le = now()
  where jeton_de_reponse = p_jeton;

  return v_lignes;
end;
$function$;

revoke execute on function public.le_point_du_lien(uuid) from public, anon, authenticated;
revoke execute on function public.repondre_par_le_lien(uuid, text) from public, anon, authenticated;
grant execute on function public.le_point_du_lien(uuid) to anon, authenticated;
grant execute on function public.repondre_par_le_lien(uuid, text) to anon, authenticated;

-- 5 et 6. Les substitutions, dans l'ordre où elles s'appliquent. Chacune se reconnaît déjà faite à la
-- présence de son remplacement — vérifiée **avant** de compter l'ancre, parce que la plupart des
-- remplacements contiennent leur ancre (la règle de `20261024194430`).
do $les_substitutions$
declare
  s record;
  src text;
  occurrences int;
begin
  for s in
    select * from (values
      -- La mise en file : la colonne, le tirage, la valeur, puis les trois liens dans le corps.
      (1, 'public.enqueue_checkin_reminders()',
       $a$    unsubscribe_token$a$,
       $r$    unsubscribe_token, jeton_de_reponse$r$),
      -- Les deux jetons dans la même sous-requête, qui nomme la ligne : chacun est tiré une fois par ligne
      -- (incident du 05/10/2026, `20261005113558`), et le corps comme la colonne lisent la même valeur.
      (2, 'public.enqueue_checkin_reminders()',
       $a$cross join lateral (select c.id as checkin_id, gen_random_uuid() as unsubscribe_token) o$a$,
       $r$cross join lateral (
    select c.id as checkin_id, gen_random_uuid() as unsubscribe_token, gen_random_uuid() as jeton_de_reponse
  ) o$r$),
      (3, 'public.enqueue_checkin_reminders()',
       $a$    o.unsubscribe_token$a$,
       $r$    o.unsubscribe_token,
    o.jeton_de_reponse$r$),
      -- Les trois réponses de la carte, dans ses mots, puis le plan — que l'app ouvre sur Android. Le jeton
      -- d'abord : un lien coupé à l'esperluette perd la réponse, et la page propose alors les trois, au lieu de
      -- perdre le jeton et de dire que le lien n'est plus valable (contre-lecture du 24/10/2026). « Pour me
      -- répondre » et non « en un geste » : le lien, puis l'envoi, en font deux.
      (4, 'public.enqueue_checkin_reminders()',
       $a$      || 'Réponds-moi en un geste : ' || v_app_url || '/plan?rappel=1' || E'\n\n'$a$,
       $r$      || 'Pour me répondre :' || E'\n'
      || 'Oui : ' || v_app_url || '/point?jeton=' || o.jeton_de_reponse::text || '&reponse=oui' || E'\n'
      || 'Non : ' || v_app_url || '/point?jeton=' || o.jeton_de_reponse::text || '&reponse=non' || E'\n'
      || public.libelle_sans_objet(c.loop_type, c.poste, c.period_start) || ' : ' || v_app_url
      || '/point?jeton=' || o.jeton_de_reponse::text || '&reponse=sans_objet' || E'\n\n'
      || 'Ou ouvre ton plan : ' || v_app_url || '/plan?rappel=1' || E'\n\n'$r$),
      -- L'export rend l'usage du lien, à côté de celui de la désinscription.
      (5, 'public.export_my_data()',
       $a$        'desinscription_utilisee_le', o.unsubscribe_used_at$a$,
       $r$        'desinscription_utilisee_le', o.unsubscribe_used_at,
        'lien_de_reponse_utilise_le', o.lien_de_reponse_utilise_le$r$)
    ) as v(rang, cible, ancre, remplacement)
    order by rang
  loop
    src := pg_get_functiondef(s.cible::regprocedure);
    -- Sans les retours chariot : des corps de la production en portent (`20261022201848`), et un rejeu
    -- par un autre canal que la première application ne reconnaîtrait pas un remplacement à fins de
    -- ligne différentes — il retrouverait l'ancre, que la plupart des remplacements contiennent.
    if position(replace(s.remplacement, chr(13), '') in replace(src, chr(13), '')) > 0 then
      continue;
    end if;
    occurrences := (length(src) - length(replace(src, s.ancre, ''))) / length(s.ancre);
    if occurrences <> 1 then
      raise exception 'Substitution % : l''ancre « % » a été trouvée % fois dans % (une seule attendue), et son remplacement n''y est pas : le corps a été réécrit autrement.',
        s.rang, s.ancre, occurrences, s.cible;
    end if;
    execute replace(src, s.ancre, s.remplacement);
  end loop;
end
$les_substitutions$;

-- 7. Le contrôle, sur les corps installés sans leurs commentaires.
do $controle$
declare
  v_corps text;
begin
  v_corps := regexp_replace(pg_get_functiondef('public.enqueue_checkin_reminders()'::regprocedure), '--[^\n]*', '', 'g');
  if position('gen_random_uuid() as jeton_de_reponse' in v_corps) = 0
     or position('o.jeton_de_reponse' in v_corps) = 0
     or (length(v_corps) - length(replace(v_corps, '/point?jeton=', ''))) / length('/point?jeton=') <> 3
     or position('public.libelle_sans_objet(c.loop_type, c.poste, c.period_start)' in v_corps) = 0
     or position('/plan?rappel=1' in v_corps) = 0 then
    raise exception 'enqueue_checkin_reminders ne met pas les trois liens de réponse dans le message';
  end if;

  v_corps := regexp_replace(pg_get_functiondef('public.repondre_au_checkin(uuid,text)'::regprocedure), '--[^\n]*', '', 'g');
  if position('public.ecrire_la_reponse_du_point(auth.uid(), p_checkin_id, p_reponse)' in v_corps) = 0
     or position('update public.engagement_checkins' in v_corps) > 0 then
    raise exception 'repondre_au_checkin écrit encore lui-même : un second écrivain des réponses';
  end if;

  -- Les cinq valeurs d'un point ouvert, chacune sous la borne : en chercher une seule laisserait passer un
  -- corps qui rendrait les autres (seconde contre-lecture du 24/10/2026).
  v_corps := regexp_replace(pg_get_functiondef('public.le_point_du_lien(uuid)'::regprocedure), '--[^\n]*', '', 'g');
  if position('case when a.ouvert then c.status end' in v_corps) = 0
     or position('case when a.ouvert then c.response_kind end' in v_corps) = 0
     or position('case when a.ouvert then c.responded_at end' in v_corps) = 0
     or position('case when a.ouvert then c.committed_saving_kg_once end' in v_corps) = 0
     or position('a.ouvert and exists' in v_corps) = 0
     or position('public.debut_de_la_periode_interrogee(c.loop_type)' in v_corps) = 0 then
    raise exception 'le_point_du_lien rend ce qu''un point dont la période est passée doit taire';
  end if;

  v_corps := pg_get_functiondef('public.export_my_data()'::regprocedure);
  if position('''lien_de_reponse_utilise_le'', o.lien_de_reponse_utilise_le' in v_corps) = 0
     or position('jeton=[0-9A-Fa-f-]+' in v_corps) = 0 then
    raise exception 'export_my_data ne rend pas l''usage du lien de réponse, ou rend son jeton';
  end if;

  -- Les privilèges : le jeton est l'autorisation des deux fonctions ouvertes, et l'écrivain reste fermé.
  if not has_function_privilege('anon', 'public.le_point_du_lien(uuid)', 'execute')
     or not has_function_privilege('anon', 'public.repondre_par_le_lien(uuid, text)', 'execute') then
    raise exception 'la page sans compte ne peut ni lire ni répondre';
  end if;
  if has_function_privilege('anon', 'public.ecrire_la_reponse_du_point(uuid, uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.debut_de_la_periode_interrogee(text)', 'execute')
     or has_function_privilege('authenticated', 'public.ecrire_la_reponse_du_point(uuid, uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.repondre_au_checkin(uuid, text)', 'execute') then
    raise exception 'un client peut répondre pour un autre compte';
  end if;
end
$controle$;
