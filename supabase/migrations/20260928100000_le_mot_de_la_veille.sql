-- Le mot de la veille — C4.2 (issue #144), décisions D1 à D5 du 27/09/2026 (`v1-25`, en-tête).
--
-- La veille au soir de chacun des jours qu'une personne s'est fixés pour son trajet
-- domicile-travail, une notification lui rappelle ce qu'elle a prévu, avec les mots de sa
-- question : « Demain, tu as prévu de faire ton trajet à vélo. » Le rappel du produit était
-- rétrospectif (il arrive après la période) ; celui-ci arrive au moment de la décision. Opt-in
-- distinct, notification seule, borné à dix semaines.
--
-- ## Ce que le chantier touche, relevé sur les corps installés le 27/09/2026
--
-- `v1-25` §3.2 posait que la ligne d'outbox sans point tomberait **automatiquement** sous quatre
-- mécanismes. Relu corps par corps (`pg_get_functiondef` sur le distant, identique au dépôt), c'est
-- vrai pour deux et demi, et faux là où ça coûte :
--
--   1. **Le plafond de C2.9 n'est pas un mécanisme de la table, c'est une clause du `where` de
--      `enqueue_checkin_reminders`.** Il ne s'applique donc qu'aux lignes que cette fonction
--      insère. Ce qui est automatique, c'est l'inverse : son `not exists` ne filtre pas sur
--      `checkin_id`, donc un mot de la veille compte dans le plafond des points. Le mot, lui, doit
--      consulter `regime_de_rappel` de lui-même — c'est écrit dans sa mise en file (§7), et il ne
--      part qu'en régime `normal` : en régime espacé, le seul message du mois doit être la question,
--      qui peut ramener quelqu'un dans la boucle ; un mot qui ne demande rien prendrait sa place, et
--      le prendrait presque toujours, puisqu'il part deux fois par semaine.
--   2. **La purge** (`purge_notification_outbox`) supprime sur `status` et `created_at`, sans
--      jointure : une ligne sans point y passe. Mais elle ne supprime jamais une ligne `pending`, et
--      le seul endroit qui rendait un rappel caduc joint `engagement_checkins` — une ligne sans
--      point serait restée en attente pour toujours. La caducité du mot est donc écrite (§8).
--   3. **Le journal** (`reminder_send_runs`) n'est écrit que par `send_pending_reminders`, et son
--      passage du matin **aurait envoyé le mot** : sa sélection push ne regarde que `status`,
--      `send_after` et `channel`. Un mot resté en attente la veille au soir partait donc le matin
--      même du jour visé — « Demain, tu as prévu… » lu le jour J. L'envoi push est extrait en une
--      fonction qui prend le genre (§8), le passage du matin ne voit que les points, et le passage
--      du soir écrit sa propre ligne de journal, genre `veille`.
--   4. **La désinscription** (`desinscrire_des_rappels`) cherche la ligne par son jeton, coupe
--      `reminder_channel` et annule les lignes en attente **de la personne** : une ligne sans point
--      y passe. Et `reminder_channel = 'none'` éteint le mot, puisque sa mise en file exige
--      `reminder_channel_for() = 'push'`.
--
-- Et trois lectures que `v1-25` ne listait pas **joignaient `engagement_checkins`**, donc auraient
-- perdu la ligne sans rien dire : `analytics.rappels_bloques` (un mot en échec y était invisible),
-- `export_my_data` (le mot manquait à l'export RGPD) et `send_pending_reminders` lui-même pour la
-- caducité. Toutes les trois sont reprises ici (§8, §10, §11). `analytics.rappels_par_jour` ne joignait
-- rien et comptait le mot parmi les rappels sans le distinguer : elle gagne le genre.
--
-- ## Trois choix techniques, et pourquoi
--
-- **Où vit le début des dix semaines (D4) : une colonne posée une fois, `plan_cycles.premier_engagement_le`.**
-- La dérivation sur `plan_actions` + `plan_action_commitments_archive` était possible — l'archive
-- de C2.2 garde tout engagement libéré —, mais elle aurait dû écarter à la main les dates
-- reconduites (`committed_at` d'une reconduction est celui de la saison d'avant) et fait dépendre la
-- borne de la complétude d'une archive qui n'a pas été écrite pour ça. La colonne est posée par
-- `commit_plan_action`, **seul chemin d'un engagement choisi**, seulement quand l'action choisie porte
-- sur le trajet domicile-travail, et seulement si elle est vide : un second choix de trajet dans la
-- saison (« Choisir une autre action », ou reprendre après « Changer d'avis ») ne rouvre rien. Une
-- reconduction passe par `generate_plan_cycle_for_user`, qui ne la touche pas : elle n'ouvre donc pas
-- de fenêtre — mais elle ne ferme pas celle qui court, qui se lit alors sur le cycle d'origine
-- (`carried_over_from`). Un re-bilan dans la même saison garde la ligne du cycle (l'`upsert` ne liste
-- pas cette colonne), donc la date aussi. Dix semaines font moins qu'une saison : la fenêtre ne
-- déborde jamais que sur le cycle suivant, un saut suffit.
--
-- **Le premier choix qui compte est le premier choix d'une action de TRAJET** (arbitrage du
-- 27/09/2026, qui précise D4). D4 disait « le premier engagement choisi de la saison », sans poste ;
-- lu ainsi, quelqu'un qui choisit d'abord une action de voyage puis, six semaines plus tard, une
-- action de trajet n'aurait eu que quatre semaines de mot — pour une fenêtre ouverte par une action
-- que le mot ne suit pas. La date ne se pose donc que sur une action du poste `commute`, le seul que
-- le mot accompagne ; un vol choisi d'abord la laisse vide, et c'est le trajet choisi ensuite qui
-- l'ouvre. Ce qui ne change pas : une fois posée, rien ne la déplace — ni un second trajet, ni un
-- aller-retour par un voyage.
--
-- **L'heure : 18 h 30, heure de Paris, toute l'année.** Assez tôt pour préparer demain (le vélo, le
-- sac, l'horaire du train) avant la soirée, assez tard pour que la journée de travail soit finie —
-- c'est le moment de la décision que la recherche sur les intentions d'implémentation désigne.
-- Le rappel du lundi tolère que son heure glisse d'une heure avec la saison (7 h UTC : 8 h ou 9 h)
-- ; ici on ne la laisse pas glisser, parce qu'une heure de décalage fait passer le mot de « après le
-- travail » à « pendant ». `pg_cron` ne connaît que l'UTC : le `send_after` porte l'heure de Paris,
-- et le cron passe **deux fois**, à 16 h 30 et 17 h 30 UTC — un seul des deux passages trouve le
-- mot dû, selon la saison. « Demain » est un jour de Paris, et ce qui le calcule lit
-- `now() at time zone 'Europe/Paris'`, comme la saison d'un humain (`saisonDe`) et non comme la
-- période des générateurs, qui reste en UTC.
--
-- **La clé d'idempotence : `(user_id, jour_vise)` pour les seules lignes `veille`**, index unique
-- partiel. Deux passages du même soir — il y en a deux par construction — ne font qu'un mot.
-- `UNIQUE (checkin_id)` ne bouge pas : il accepte plusieurs `NULL`, et continue de garantir aux
-- points « un point, un message ».
--
-- ## Ce qu'aucune suite n'exerce
--
-- L'appel HTTP à Expo. La CI n'a pas de jeton, et un jeton d'essai y ferait partir une vraie requête.
-- Ni ce que l'appareil fait du `channelId` (§8) : il ne se voit que sur un téléphone, avec le build
-- natif qui crée le second canal.
-- Le fichier pgTAP `35` éprouve la mise en file, la caducité, l'exclusion mutuelle des deux passages
-- et le repli sans appareil (qui n'appelle personne) ; le marquage `sent` avant l'appel est le code
-- du passage du matin déplacé tel quel, et se relit.

-- ---------------------------------------------------------------------------------------------
-- 1. L'opt-in, à trois états (D2)
-- ---------------------------------------------------------------------------------------------
-- Jamais un booléen : « n'a pas encore été proposé » et « a dit non » ne se confondent pas, sans
-- quoi on reproposerait à qui a refusé — la leçon de C5.7. Écrit par le client, comme
-- `reminder_channel` (privilège d'`update` au niveau de la table, policy owner-scoped).

alter table public.profiles
  add column if not exists mot_de_la_veille text not null default 'jamais_propose';

alter table public.profiles drop constraint if exists profiles_mot_de_la_veille_check;
alter table public.profiles
  add constraint profiles_mot_de_la_veille_check
  check (mot_de_la_veille in ('jamais_propose', 'oui', 'refuse'));

comment on column public.profiles.mot_de_la_veille is
  'Le mot de la veille (C4.2) : jamais_propose tant que la question n''a pas été posée, puis oui ou '
  'refuse, et jamais plus jamais_propose — c''est ce qui garantit qu''un refus n''est jamais '
  'reproposé. Distinct de reminder_channel, mais reminder_channel = none l''éteint aussi. Miroir : '
  'REPONSES_A_LA_VEILLE (src/types/rappels.ts).';

-- **« Jamais reproposé après un refus » est une propriété des données, pas une convention
-- d'écran.** La seule façon de reproposer serait de revenir à `jamais_propose` ; le trigger
-- l'interdit, quel que soit l'écrivain. `oui` et `refuse` restent libres entre eux : c'est le
-- réglage de « Toi », où l'on change d'avis dans les deux sens.
create or replace function public.garder_la_reponse_au_mot_de_la_veille()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if old.mot_de_la_veille <> 'jamais_propose' and new.mot_de_la_veille = 'jamais_propose' then
    raise exception 'Une réponse au mot de la veille ne se retire pas : elle passe de oui à refuse, ou l''inverse.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

revoke execute on function public.garder_la_reponse_au_mot_de_la_veille() from public, anon, authenticated;

drop trigger if exists garder_la_reponse_au_mot_de_la_veille on public.profiles;
create trigger garder_la_reponse_au_mot_de_la_veille
  before update of mot_de_la_veille on public.profiles
  for each row execute function public.garder_la_reponse_au_mot_de_la_veille();

-- ---------------------------------------------------------------------------------------------
-- 2. La phrase, une par gabarit de trajet (D5)
-- ---------------------------------------------------------------------------------------------
-- **Les mots de la question**, pas une ligne générique : une intention d'implémentation est
-- « quand X, je fais Y », et le signal utile rappelle le Y. « Demain, c'est un de tes jours. » a été
-- écarté comme trop vague. À côté de `question_template`, et comme `first_step` : aucune phrase
-- ne porte de chiffre, et un gabarit de trajet sans phrase tomberait au balayage de `35` — sans elle,
-- la mise en file l'écarterait en silence.
--
-- Appariement par `action_text`, la clé naturelle garantie par un index unique : `action_templates.id`
-- est un `gen_random_uuid()`, différent sur chaque base (`SUPABASE.md` §2.3).

alter table public.action_templates add column if not exists phrase_de_la_veille text;

comment on column public.action_templates.phrase_de_la_veille is
  'Le mot de la veille (C4.2) : ce que la personne a prévu, avec les mots de sa question. Une phrase '
  'par gabarit du poste domicile-travail, aucune ailleurs — seule l''intention de ce poste se donne '
  'en jours. Jamais de chiffre.';

update public.action_templates t
set phrase_de_la_veille = v.phrase
from (values
  ('Faire ce trajet à deux au moins un jour sur deux', 'Demain, tu as prévu de faire ton trajet à deux.'),
  ('Faire un trajet sur cinq à pied', 'Demain, tu as prévu de faire ton trajet à pied.'),
  ('Faire un trajet sur cinq à vélo', 'Demain, tu as prévu de faire ton trajet à vélo.'),
  ('Faire un trajet sur cinq à vélo à assistance électrique', 'Demain, tu as prévu de faire ton trajet à vélo électrique.'),
  ('Passer deux trajets sur cinq en métro ou en tram', 'Demain, tu as prévu de faire ton trajet en métro ou en tram.'),
  ('Passer deux trajets sur cinq en train', 'Demain, tu as prévu de faire ton trajet en train.'),
  ('Travailler depuis chez toi deux jours par semaine', 'Demain, tu as prévu de travailler depuis chez toi.'),
  ('Travailler depuis chez toi un jour par semaine', 'Demain, tu as prévu de travailler depuis chez toi.')
) as v(action_text, phrase)
where t.action_text = v.action_text
  and t.phrase_de_la_veille is distinct from v.phrase;

-- Le contrôle est ce qui rend l'appariement par texte sûr, pas la relecture : un libellé mal
-- recopié n'apparierait rien, et le gabarit resterait muet.
do $$
declare
  v_sans integer;
  v_hors integer;
begin
  select count(*) into v_sans from public.action_templates
  where poste = 'commute' and phrase_de_la_veille is null;
  select count(*) into v_hors from public.action_templates
  where poste is distinct from 'commute' and phrase_de_la_veille is not null;
  if v_sans > 0 or v_hors > 0 then
    raise exception 'phrase_de_la_veille : % gabarit(s) de trajet sans phrase, % hors du trajet avec une phrase', v_sans, v_hors;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. Le début des dix semaines (D4)
-- ---------------------------------------------------------------------------------------------

alter table public.plan_cycles add column if not exists premier_engagement_le timestamptz;

comment on column public.plan_cycles.premier_engagement_le is
  'Le premier engagement CHOISI de la saison sur une action de TRAJET (C4.2, D4 précisé le '
  '27/09/2026) : posé une fois par commit_plan_action, seulement pour une action du poste commute, '
  'jamais par une reconduction ni par un re-bilan. Le mot de la veille part pendant les dix semaines '
  'qui le suivent ; une reconduction ne rouvre rien, et la fenêtre qui court se lit alors sur le '
  'cycle d''origine (plan_actions.carried_over_from).';

-- Rattrapage des cycles existants, au mieux : le plus ancien engagement choisi **dans** la saison sur
-- une action de trajet, qu'il soit encore engagé ou archivé. Le filtre sur `period_start` écarte les
-- dates reconduites — une reconduction garde le `committed_at` de la saison d'avant —, celui sur le
-- poste les engagements que le mot ne suit pas. Idempotent : il ne touche que les cycles encore sans
-- date.
update public.plan_cycles pc
set premier_engagement_le = d.premier
from (
  select pc2.id, min(e.committed_at) as premier
  from public.plan_cycles pc2
  cross join lateral (
    select pa.committed_at from public.plan_actions pa
    join public.action_templates t on t.id = pa.action_template_id
    where pa.plan_cycle_id = pc2.id and pa.committed_at is not null and t.poste = 'commute'
    union all
    select ar.committed_at from public.plan_action_commitments_archive ar
    join public.action_templates t on t.id = ar.action_template_id
    where ar.plan_cycle_id = pc2.id and t.poste = 'commute'
  ) e
  where e.committed_at >= pc2.period_start::timestamptz
  group by pc2.id
) d
where d.id = pc.id and pc.premier_engagement_le is null;

-- ---------------------------------------------------------------------------------------------
-- 4. `commit_plan_action` pose la date, une fois
-- ---------------------------------------------------------------------------------------------
-- Réécrite depuis son corps installé (`pg_get_functiondef` du distant, 27/09/2026 — celui de
-- `20260914021646`), jamais depuis la migration qui l'a créée (`SUPABASE.md` §2.3). Seul ajout :
-- l'`update` de `plan_cycles`, **après** l'engagement, pour qu'un refus (`RM001`, intention mal
-- formée) ne pose rien. `13_engagement_action`, `21_engagement_qui_survit` et `26` possèdent le
-- reste de cette fonction et se rejouent avec elle.

CREATE OR REPLACE FUNCTION public.commit_plan_action(p_plan_action_id uuid, p_days smallint[] DEFAULT NULL::smallint[], p_timing text DEFAULT NULL::text, p_replace boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_cycle_id uuid;
  v_poste text;
  v_forme_attendue text;
  v_precedent uuid;
begin
  select pc.id, tpl.poste into v_cycle_id, v_poste
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join public.action_templates tpl on tpl.id = pa.action_template_id
  where pa.id = p_plan_action_id and pc.user_id = auth.uid();

  if v_cycle_id is null then
    raise exception 'Action introuvable.' using errcode = 'no_data_found';
  end if;

  v_forme_attendue := case when coalesce(v_poste, '') = 'commute' then 'des jours de la semaine' else 'une échéance' end;

  if (p_days is not null) = (p_timing is not null) then
    raise exception 'Une intention et une seule est attendue pour cette action : %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
  end if;

  if (coalesce(v_poste, '') = 'commute') <> (p_days is not null) then
    raise exception 'Cette action attend %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
  end if;

  select id into v_precedent
  from public.plan_actions
  where plan_cycle_id = v_cycle_id and committed_at is not null and id <> p_plan_action_id;

  if v_precedent is not null then
    -- **Le refus est le défaut, et c'est tout l'apport de C4.6 ici.** Libérer l'engagement
    -- précédent efface `committed_at`, les jours et l'échéance — le seul choix personnel que le
    -- produit demande — et l'archive de C2.2 en garde la trace mais ne le rend pas. Un appel qui
    -- ne dit pas qu'il remplace ne remplace donc pas : l'écran qui propose « Choisir celle-ci à la
    -- place » le dit, un appel écrit par inadvertance ne le dira pas.
    --
    -- Le SQLSTATE est réservé aux conditions définies par l'utilisateur (classe R) : le client
    -- l'utilise pour recharger le plan plutôt que pour parler de réseau — ce refus veut presque
    -- toujours dire que l'état a changé depuis l'affichage.
    if p_replace is not true then
      raise exception 'Une autre action est déjà engagée sur cette période.'
        using errcode = 'RM001';
    end if;

    perform public.archiver_engagement_de_laction(v_precedent, 'changement');

    update public.plan_actions
    set committed_at = null, intention_days = null, intention_timing = null, carried_over_from = null
    where id = v_precedent;
  end if;

  update public.plan_actions
  set committed_at = now(),
      intention_days = p_days,
      intention_timing = p_timing
  where id = p_plan_action_id;

  -- C4.2 (D4, précisé le 27/09/2026) : le premier engagement **choisi** de la saison sur une action
  -- de **trajet** ouvre les dix semaines du mot de la veille, et le seul. Une action d'un autre poste
  -- ne pose rien : le mot ne la suit pas, et ouvrir la fenêtre sur elle en retirerait des semaines à
  -- l'action de trajet choisie ensuite. Un second choix de trajet trouve la date posée et ne la
  -- déplace pas — sans quoi changer d'action toutes les huit semaines ferait un mot de la veille sans
  -- fin (`v1-25` §3.4).
  if coalesce(v_poste, '') = 'commute' then
    update public.plan_cycles
    set premier_engagement_le = now()
    where id = v_cycle_id and premier_engagement_le is null;
  end if;
end;
$function$;

-- Le rattrapage ci-dessus, vérifié dans les deux sens : un cycle qui porte un engagement de trajet
-- choisi dans sa saison a sa date, et aucun cycle n'a de date sans engagement de trajet pour la
-- justifier. Écrit après la réécriture, pour qu'une restauration rejouée d'un bloc retrouve le même
-- état.
do $$
declare
  v_sans integer;
  v_de_trop integer;
begin
  select count(*) into v_sans
  from public.plan_cycles pc
  join public.plan_actions pa on pa.plan_cycle_id = pc.id
  join public.action_templates t on t.id = pa.action_template_id
  where pa.committed_at is not null
    and pa.committed_at >= pc.period_start::timestamptz
    and t.poste = 'commute'
    and pc.premier_engagement_le is null;
  if v_sans > 0 then
    raise exception 'premier_engagement_le : % cycle(s) engagé(s) sur le trajet dans leur saison sans date', v_sans;
  end if;

  select count(*) into v_de_trop
  from public.plan_cycles pc
  where pc.premier_engagement_le is not null
    and not exists (
      select 1 from public.plan_actions pa
      join public.action_templates t on t.id = pa.action_template_id
      where pa.plan_cycle_id = pc.id and pa.committed_at is not null and t.poste = 'commute'
      union all
      select 1 from public.plan_action_commitments_archive ar
      join public.action_templates t on t.id = ar.action_template_id
      where ar.plan_cycle_id = pc.id and t.poste = 'commute'
    );
  if v_de_trop > 0 then
    raise exception 'premier_engagement_le : % cycle(s) datés sans engagement de trajet', v_de_trop;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 5. La boîte d'envoi accueille une ligne sans point (D1)
-- ---------------------------------------------------------------------------------------------
-- `UNIQUE (checkin_id)` ne bouge pas : c'est la garantie anti-relance de la spec §7, et PostgreSQL y
-- accepte plusieurs `NULL`. Ce qui bouge est le `not null` — et la contrainte de cohérence dit
-- exactement quand une ligne peut s'en passer : un point porte son point et jamais de jour visé ;
-- un mot de la veille porte un jour visé, jamais de point, **et ne peut être qu'une notification
-- sans adresse**. Cette dernière moitié est ce qui rend D3 structurel : `replier_rappel_sur_email`
-- ne bascule sur l'email qu'une ligne qui porte une adresse, donc un mot dont l'appareil ne répond
-- plus passe en `failed` — il cesse, sans repli — et une réécriture qui voudrait le faire partir
-- par email serait refusée ici.

alter table public.notification_outbox alter column checkin_id drop not null;

alter table public.notification_outbox add column if not exists genre text not null default 'point';
alter table public.notification_outbox add column if not exists jour_vise date;

alter table public.notification_outbox drop constraint if exists notification_outbox_genre_check;
alter table public.notification_outbox
  add constraint notification_outbox_genre_check check (genre in ('point', 'veille'));

alter table public.notification_outbox drop constraint if exists notification_outbox_genre_coherent;
alter table public.notification_outbox
  add constraint notification_outbox_genre_coherent check (
    (genre = 'point' and checkin_id is not null and jour_vise is null)
    or (genre = 'veille' and checkin_id is null and jour_vise is not null
        and channel = 'push' and recipient_email is null)
  );

-- La clé d'idempotence du mot : un par personne et par jour visé, quel que soit le nombre de
-- passages. Partielle, pour ne rien coûter aux points.
create unique index if not exists notification_outbox_une_veille_par_jour
  on public.notification_outbox (user_id, jour_vise)
  where genre = 'veille';

comment on column public.notification_outbox.genre is
  'point : le rappel d''un point de suivi (checkin_id renseigné, unique). veille : le mot de la '
  'veille (C4.2), sans point, notification seule, un par personne et par jour_vise.';
comment on column public.notification_outbox.jour_vise is
  'Le jour que le mot de la veille annonce (« demain »), en date de Paris. Nul pour un point.';

-- Le journal dit quel passage l'a écrit : le soir en porte au moins deux (16 h 30 et 17 h 30 UTC),
-- le matin au moins deux (un par canal). Sans cette colonne, « le passage du soir n'a pas eu lieu »
-- se lirait parmi les lignes du matin.
alter table public.reminder_send_runs add column if not exists genre text not null default 'point';
alter table public.reminder_send_runs drop constraint if exists reminder_send_runs_genre_check;
alter table public.reminder_send_runs
  add constraint reminder_send_runs_genre_check check (genre in ('point', 'veille'));

comment on column public.reminder_send_runs.genre is
  'Le passage qui a écrit la ligne : point (le passage du matin, deux canaux) ou veille (le passage '
  'du soir du mot de la veille, canal push seul).';

-- ---------------------------------------------------------------------------------------------
-- 6. Ce que la personne a prévu pour demain, en un seul endroit
-- ---------------------------------------------------------------------------------------------
-- **La recherche de l'engagement reste en un seul endroit** : `action_engagee_de_la_periode`
-- (`20260927210247`, `v1-27` §5), que le balayage de `33` garde contre toute copie. Le mot de la
-- veille a besoin de ce qu'elle trouve **et** de la ligne elle-même — son cycle (la date
-- d'ouverture) et son `carried_over_from` (une fenêtre qui court depuis la saison d'avant). Elle
-- rend donc désormais l'identifiant de l'action qu'elle a retenue, en dernière colonne. La première
-- version de cette migration recopiait la jointure, et c'est ce balayage qui l'a fait tomber.
--
-- `create or replace` ne change pas un type de retour : `drop` puis `create`, avec le même corps,
-- la même volatilité, le même `search_path` et la même révocation. Les deux générateurs ne sont pas
-- repris : ils l'appellent par son nom depuis un corps PL/pgSQL, qui ne crée pas de dépendance et se
-- résout à l'exécution, et ils ne lisent que des colonnes nommées — une colonne de plus ne leur
-- change rien, ce que `20`, `23` et `33` rejouent.

drop function if exists public.action_engagee_de_la_periode(uuid, text, date);

create function public.action_engagee_de_la_periode(
  p_user_id uuid,
  p_poste text,
  p_period_start date
)
returns table (
  intention_days smallint[],
  intention_timing text,
  action_text text,
  question_template text,
  plan_action_id uuid
)
language sql
stable
set search_path to 'public'
as $function$
  select pa.intention_days, pa.intention_timing, t.action_text, t.question_template, pa.id
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join public.action_templates t on t.id = pa.action_template_id
  where pc.user_id = p_user_id
    and pa.committed_at is not null
    -- L'appariement par poste (C2.1) : sans lui, une action engagée sur un autre poste nommerait
    -- la question de celui-ci.
    and t.poste = p_poste
    and p_period_start between pc.period_start and pc.period_end
  order by pa.committed_at desc
  limit 1;
$function$;

revoke execute on function public.action_engagee_de_la_periode(uuid, text, date)
  from public, anon, authenticated;

comment on function public.action_engagee_de_la_periode(uuid, text, date) is
  'L''action engagée (intention, libellé, gabarit de question, identifiant) du cycle qui couvre la '
  'période interrogée, sur le poste donné — le plus récent engagement si deux cycles se chevauchent. '
  'Le poste est choisi par l''appelant. Lue par generate_commute_checkins, generate_extras_checkins '
  '(v1-27 §5) et engagement_de_la_veille (C4.2).';

-- **Une seule fonction, lue par la mise en file ET par l'écran** (`fenetre_du_mot_de_la_veille`) :
-- la borne des dix semaines ne s'écrit qu'ici, et l'écran ne peut pas annoncer une date que l'envoi
-- ne tiendrait pas. Le jour qu'elle reçoit est celui du soir, en date de Paris : c'est l'action
-- engagée ce soir-là qui est prévue pour demain.
--
-- `dernier_soir` est le dernier soir où un mot peut partir : le jour d'ouverture compte pour le
-- premier des soixante-dix, donc le soir du jour 69 est le dernier, et le jour 70 — le premier de la
-- onzième semaine — n'en porte plus. Nul quand aucune fenêtre n'a été ouverte.
--
-- `stable`, en `security invoker` et révoquée, pour la raison de `action_engagee_de_la_periode` :
-- ses appelants sont `security definer`, et un `grant` futur tomberait sur la RLS.

create or replace function public.engagement_de_la_veille(p_user_id uuid, p_aujourdhui date)
returns table (phrase text, intention_days smallint[], dernier_soir date)
language sql
stable
set search_path to 'public'
as $function$
  select t.phrase_de_la_veille,
         pa.intention_days,
         (coalesce(
            pc.premier_engagement_le,
            -- Une reconduction n'ouvre pas de fenêtre, mais celle qui court se poursuit : elle se lit
            -- sur le cycle d'origine. Un saut suffit, dix semaines tenant dans une saison.
            case when pa.carried_over_from is not null then origine.premier_engagement_le end
          ) at time zone 'Europe/Paris')::date + 69
  -- Le seul poste dont l'intention se donne en jours (D5).
  from public.action_engagee_de_la_periode(p_user_id, 'commute', p_aujourdhui) e
  join public.plan_actions pa on pa.id = e.plan_action_id
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join public.action_templates t on t.id = pa.action_template_id
  left join public.plan_cycles origine on origine.id = pa.carried_over_from;
$function$;

revoke execute on function public.engagement_de_la_veille(uuid, date) from public, anon, authenticated;

comment on function public.engagement_de_la_veille(uuid, date) is
  'L''action de trajet engagée dans le cycle qui couvre le jour donné (date de Paris) : sa phrase de '
  'la veille, ses jours et le dernier soir de sa fenêtre de dix semaines (C4.2). Lue par '
  'mettre_en_file_les_mots_de_la_veille et fenetre_du_mot_de_la_veille.';

-- Ce que l'écran a besoin de savoir pour ne rien promettre de faux : y a-t-il une action de trajet
-- engagée, et jusqu'à quel soir le mot peut-il partir. Toujours une ligne. Sans session, rien.
create or replace function public.fenetre_du_mot_de_la_veille()
returns table (action_de_trajet boolean, dernier_soir date)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select e.phrase is not null,
         case when e.dernier_soir >= (now() at time zone 'Europe/Paris')::date then e.dernier_soir end
  from (select 1) as une_ligne
  left join lateral public.engagement_de_la_veille(
    auth.uid(), (now() at time zone 'Europe/Paris')::date
  ) e on true;
$function$;

revoke execute on function public.fenetre_du_mot_de_la_veille() from public, anon, authenticated;
grant execute on function public.fenetre_du_mot_de_la_veille() to authenticated;

comment on function public.fenetre_du_mot_de_la_veille() is
  'Pour l''écran (C4.2) : une action de trajet est-elle engagée, et le dernier soir où le mot de la '
  'veille peut partir (nul si la fenêtre est fermée ou n''a pas été ouverte). Lit auth.uid().';

-- ---------------------------------------------------------------------------------------------
-- 7. La mise en file du soir
-- ---------------------------------------------------------------------------------------------
-- Cinq conditions, et chacune est une décision :
--   * `mot_de_la_veille = 'oui'` — l'opt-in (D2) ;
--   * `reminder_channel_for() = 'push'` — la préférence est `push` **et** un appareil est joignable
--     (D3). `none` l'éteint (D2), `email` ne le reçoit jamais, et un jeton perdu le fait cesser sans
--     bruit : la table de vérité de `reminder_channel_for` reste la seule ;
--   * `regime_de_rappel(…, 'commute') = 'normal'` — voir l'en-tête, point 1 ;
--   * demain est un des jours choisis — `intention_days` numérote comme `isodow`, 1 lundi … 7
--     dimanche (`check_intention_days`, `jours_francais`) ;
--   * ce soir est dans la fenêtre (D4).
--
-- `p_aujourdhui` n'existe que pour les tests : le soir se lit en heure de Paris, et une transaction
-- pgTAP ne peut pas choisir son `now()`.

create or replace function public.mettre_en_file_les_mots_de_la_veille(p_aujourdhui date default null)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  c_heure constant time := time '18:30';
  v_aujourdhui date := coalesce(p_aujourdhui, (now() at time zone 'Europe/Paris')::date);
  v_demain date := coalesce(p_aujourdhui, (now() at time zone 'Europe/Paris')::date) + 1;
  v_inseres integer;
begin
  insert into public.notification_outbox (
    user_id, checkin_id, genre, jour_vise, channel, recipient_email, subject, body, push_body,
    send_after, unsubscribe_token
  )
  select
    p.id,
    null,
    'veille',
    v_demain,
    'push',
    -- Jamais d'adresse : c'est ce qui empêche le repli sur l'email (D3, cf. §5).
    null,
    'Pour demain',
    e.phrase,
    e.phrase,
    (v_aujourdhui + c_heure) at time zone 'Europe/Paris',
    -- Écrit explicitement, comme dans `enqueue_checkin_reminders` : aucun corps ne l'imprime ici,
    -- mais une ligne de la boîte d'envoi porte son jeton de la même façon quel que soit son genre.
    gen_random_uuid()
  from public.profiles p
  cross join lateral public.engagement_de_la_veille(p.id, v_aujourdhui) e
  where p.mot_de_la_veille = 'oui'
    and e.phrase is not null
    and extract(isodow from v_demain)::smallint = any(e.intention_days)
    and v_aujourdhui <= e.dernier_soir
    and public.reminder_channel_for(p.id) = 'push'
    and public.regime_de_rappel(p.id, 'commute') = 'normal'
  on conflict (user_id, jour_vise) where genre = 'veille' do nothing;

  get diagnostics v_inseres = row_count;
  return v_inseres;
end;
$function$;

revoke execute on function public.mettre_en_file_les_mots_de_la_veille(date) from public, anon, authenticated;

comment on function public.mettre_en_file_les_mots_de_la_veille(date) is
  'Le mot de la veille (C4.2) : une ligne push sans point par personne qui a dit oui, dont demain '
  'est un jour choisi, dans ses dix semaines, en régime normal et joignable par notification. '
  'Idempotente (notification_outbox_une_veille_par_jour).';

-- ---------------------------------------------------------------------------------------------
-- 8. L'envoi push, extrait et partagé par les deux passages
-- ---------------------------------------------------------------------------------------------
-- Le code est celui de la branche push de `send_pending_reminders`, **déplacé tel quel** depuis son
-- corps installé (27/09/2026) : le marquage `sent` avant l'appel et hors de tout bloc de
-- rattrapage, le filet autour du seul appel, les lots de cent, le repli. Ce qui change :
--   * la sélection lit le genre — le passage du matin ne voit plus les mots, le passage du soir ne
--     voit pas les points ;
--   * la ligne de journal porte le genre ;
--   * la caducité du mot, en tête : un mot en attente dont le jour est arrivé ne part plus (« demain »
--     serait faux), ni celui d'une personne qui a coupé l'opt-in ou quitté la notification entre la
--     mise en file et l'envoi. Elle tourne aux deux passages, donc au plus tard le matin du jour visé.
--
-- Une seule fonction pour deux passages plutôt qu'une copie : les deux garanties qui comptent — ne
-- jamais renvoyer ce qui est parti, toujours laisser sa ligne au journal — ne peuvent pas diverger.
--
-- **Deux canaux Android, un par genre** (arbitrage du 27/09/2026) : « Points de suivi » garde la
-- question du point, « Mot de la veille » porte le mot — chacun se coupe à part dans les réglages du
-- téléphone, et couper le mot ne coupe pas la question qui peut ramener quelqu'un dans la boucle.
-- Le champ du message Expo est `channelId` (Android seul). **C'est une paire SQL/TypeScript** : l'app
-- crée les canaux au lancement (`preparerLesCanauxAndroid`, `src/lib/rappels.ts`) sous les
-- identifiants de `CANAUX_ANDROID` (`src/types/rappels.ts`), et le serveur les nomme ici. Les deux
-- moitiés sont épinglées sur les mêmes valeurs (`35` et `rappels.test.ts`), parce qu'un identifiant
-- que l'appareil n'a pas créé ne fait pas échouer l'envoi : la documentation d'Expo dit que la
-- notification ne s'affiche pas, le code d'`expo-notifications` 57 qu'elle tombe dans un canal de
-- repli (« Miscellaneous ») — un écart silencieux dans les deux cas, que rien ne remonterait.

create or replace function public.canal_android(p_genre text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case p_genre when 'point' then 'rappels' when 'veille' then 'mot_de_la_veille' end;
$function$;

revoke execute on function public.canal_android(text) from public, anon, authenticated;

comment on function public.canal_android(text) is
  'Le canal Android (channelId du message Expo) d''un genre de notification : point → rappels '
  '(« Points de suivi »), veille → mot_de_la_veille (« Mot de la veille »). Jumelle de CANAUX_ANDROID '
  '(src/types/rappels.ts), qui crée les canaux sur l''appareil (C4.2).';

create or replace function public.envoyer_les_notifications(p_genre text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  c_budget_push constant integer := 500;
  c_lot_push constant integer := 100;
  c_duree_max constant interval := interval '60 seconds';

  v_debut timestamptz := clock_timestamp();
  v_expo_token text;
  rec record;

  v_jetons text[];
  v_lot_lignes uuid[] := '{}'::uuid[];
  v_lot_jetons text[] := '{}'::text[];
  v_lot_messages jsonb := '[]'::jsonb;
  v_resultat jsonb;

  v_candidats integer;
  v_traites integer := 0;
  v_envoyes integer := 0;
  v_echecs integer := 0;
  v_replis integer := 0;
  v_statut text := 'success';
  v_detail text := 'Rien en attente sur ce canal.';
begin
  if p_genre is null or p_genre not in ('point', 'veille') then
    raise exception 'envoyer_les_notifications : genre inconnu (%)', p_genre
      using errcode = 'invalid_parameter_value';
  end if;

  select decrypted_secret into v_expo_token
  from vault.decrypted_secrets where name = 'expo_access_token';

  -- La caducité du mot de la veille, à chaque passage (cf. en-tête de la section).
  update public.notification_outbox o
  set status = 'cancelled'
  where o.genre = 'veille'
    and o.status = 'pending'
    and (
      o.jour_vise <= (now() at time zone 'Europe/Paris')::date
      or not exists (
        select 1 from public.profiles p
        where p.id = o.user_id and p.mot_de_la_veille = 'oui' and p.reminder_channel = 'push'
      )
    );

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

  select count(*) into v_candidats
  from public.notification_outbox
  where status = 'pending' and attempts < 3 and send_after <= now() and channel = 'push'
    and genre = p_genre;

  if v_candidats > 0 then
    for rec in
      select * from public.notification_outbox
      where status = 'pending' and attempts < 3 and send_after <= now() and channel = 'push'
        and genre = p_genre
      order by send_after, created_at
      limit c_budget_push
    loop
      exit when clock_timestamp() - v_debut > c_duree_max;

      select array_agg(t.token order by t.created_at) into v_jetons
      from public.push_tokens t
      where t.user_id = rec.user_id and t.disabled_at is null;

      if v_jetons is null then
        -- Plus aucun appareil joignable : repli immédiat, sans consommer de tentative — aucun
        -- appel n'a eu lieu. Un mot de la veille n'a pas d'adresse : il passe en `failed`.
        perform public.replier_rappel_sur_email(rec.id, 'aucun jeton actif');
        v_replis := v_replis + 1;
        v_traites := v_traites + 1;
        continue;
      end if;

      -- Garde-fou pour un cas qui ne devrait jamais arriver : un compte portant plus de jetons
      -- actifs que le plafond d'un appel fabriquerait un lot irrecevable, qui échouerait en bloc
      -- et retiendrait la file. On pousse alors vers ses cent appareils les plus anciens.
      if array_length(v_jetons, 1) > c_lot_push then
        v_jetons := v_jetons[1:c_lot_push];
      end if;

      -- Le lot serait plein : on l'envoie avant d'y ajouter cette ligne.
      if coalesce(array_length(v_lot_jetons, 1), 0) + array_length(v_jetons, 1) > c_lot_push then
        -- **Le filet entoure l'appel, et rien d'autre.** `envoyer_lot_push` rattrape son propre
        -- appel HTTP ; ce qui lève ailleurs (statement_timeout, erreur de base) remontait jusqu'au
        -- cron et annulait la passe entière, branche email comprise — un `commit` de moins et une
        -- nuit sans rappel. Un bloc plus large serait pire que rien : un `begin ... exception`
        -- ouvre une sous-transaction, donc envelopper la boucle annulerait aussi les marquages
        -- `sent` des lots déjà partis, qui repartiraient la nuit suivante.
        begin
          v_resultat := public.envoyer_lot_push(v_lot_lignes, v_lot_jetons, v_lot_messages, v_expo_token);
          v_envoyes := v_envoyes + (v_resultat ->> 'envoyes')::integer;
          v_echecs := v_echecs + (v_resultat ->> 'echecs')::integer;
          v_replis := v_replis + (v_resultat ->> 'replis')::integer;
        exception when others then
          -- Le lot **reste `sent`** : son marquage a eu lieu hors de ce bloc, il survit donc à
          -- l'abandon de la sous-transaction, et l'erreur a pu tomber une fois les notifications
          -- déjà parties. Mieux vaut un rappel perdu qu'un rappel envoyé deux fois (A9-1), donc
          -- on ne remet rien en attente : on écrit la raison sur les lignes et on la compte comme
          -- un échec, pour que le journal le dise au lieu de rendre `success`.
          update public.notification_outbox
          set last_error = left(sqlerrm, 300)
          where id = any(v_lot_lignes);
          v_echecs := v_echecs + (select count(distinct l)::integer from unnest(v_lot_lignes) as l);
        end;

        v_lot_lignes := '{}'::uuid[];
        v_lot_jetons := '{}'::text[];
        v_lot_messages := '[]'::jsonb;
      end if;

      -- **Le marquage précède l'appel**, et se fait hors de tout bloc de rattrapage : une
      -- exception pendant l'envoi annule une sous-transaction, jamais ce marquage. Un message
      -- remis au fournisseur ne peut donc pas se retrouver « en attente », donc repartir
      -- (A9-1). Le prix de ce choix est assumé et c'est le bon sens : mieux vaut un rappel
      -- perdu qu'un rappel envoyé deux fois, pour un produit qui promet de ne jamais insister.
      update public.notification_outbox
      set status = 'sent', sent_at = now(), attempts = rec.attempts + 1, last_error = null
      where id = rec.id;

      for i in 1 .. array_length(v_jetons, 1) loop
        v_lot_lignes := v_lot_lignes || rec.id;
        v_lot_jetons := v_lot_jetons || v_jetons[i];
        v_lot_messages := v_lot_messages || jsonb_build_array(jsonb_build_object(
          'to', jsonb_build_array(v_jetons[i]),
          'title', rec.subject,
          'body', rec.push_body,
          -- Un canal Android par genre (arbitrage du 27/09/2026) : chacun se coupe à part dans les
          -- réglages du téléphone. Le canal vient de `canal_android`, jumelle de `CANAUX_ANDROID`.
          'channelId', public.canal_android(p_genre),
          -- Le même lien pour les deux genres : une notification ouvre le plan, sans chaîne de
          -- requête (le `?rappel=1` n'est porté que par l'email, pour l'appareil sans session).
          'data', jsonb_build_object('url', '/plan')
        ));
      end loop;

      v_traites := v_traites + 1;
    end loop;

    if array_length(v_lot_lignes, 1) is not null then
      -- Le dernier lot, avec le même filet et pour les mêmes raisons qu'au-dessus.
      begin
        v_resultat := public.envoyer_lot_push(v_lot_lignes, v_lot_jetons, v_lot_messages, v_expo_token);
        v_envoyes := v_envoyes + (v_resultat ->> 'envoyes')::integer;
        v_echecs := v_echecs + (v_resultat ->> 'echecs')::integer;
        v_replis := v_replis + (v_resultat ->> 'replis')::integer;
      exception when others then
        update public.notification_outbox
        set last_error = left(sqlerrm, 300)
        where id = any(v_lot_lignes);
        v_echecs := v_echecs + (select count(distinct l)::integer from unnest(v_lot_lignes) as l);
      end;
    end if;

    if v_echecs = 0 then
      v_statut := 'success';
    elsif v_envoyes > 0 then
      v_statut := 'partial';
    else
      v_statut := 'error';
    end if;

    -- Un mot de la veille sans appareil joignable n'est pas un échec du système : c'est D3, il
    -- cesse. Le détail le compte à part, sans en faire une erreur.
    v_detail := case p_genre
      when 'point' then format('%s notification(s) en attente au début de la passe, %s repli(s) sur l''email.',
                               v_candidats, v_replis)
      else format('%s mot(s) de la veille en attente au début de la passe, %s sans appareil joignable (sans repli).',
                  v_candidats, v_replis)
    end;
  end if;

  -- **L'insert est hors de la garde.** Un passage où rien n'attend laisse quand même sa ligne,
  -- compteurs à zéro : sans elle, un journal vide se lirait « rien à envoyer » alors qu'il peut
  -- dire « le job est resté désinscrit ».
  insert into public.reminder_send_runs (status, canal, genre, traites, envoyes, echecs, detail)
  values (v_statut, 'push', p_genre, v_traites, v_envoyes, v_echecs, v_detail);

  return v_traites;
end;
$function$;

revoke execute on function public.envoyer_les_notifications(text) from public, anon, authenticated;

comment on function public.envoyer_les_notifications(text) is
  'Une passe d''envoi push pour un genre (point : le passage du matin, depuis send_pending_reminders ; '
  'veille : le passage du soir, depuis envoyer_les_mots_de_la_veille). Rend les caducs du mot de la '
  'veille, marque sent avant l''appel, écrit toujours sa ligne de journal. Rend le nombre de lignes traitées.';

-- `send_pending_reminders`, réécrite depuis son corps installé : sa branche push devient un appel,
-- le reste est inchangé — la caducité des points, l'email, ses deux lignes de journal et l'en-tête
-- de désinscription dont `22` vérifie la source.

CREATE OR REPLACE FUNCTION public.send_pending_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c_plafond_email_jour constant integer := 100;
  c_lot_email constant integer := 25;
  c_duree_max constant interval := interval '60 seconds';
  -- Un échec repousse la ligne de deux heures : la procédure enchaîne les passes dans la même
  -- nuit, et sans ce délai un refus passager (un 429 de l'expéditeur) brûlerait les trois
  -- tentatives en quelques minutes au lieu de laisser sa chance au cron du lendemain. Même
  -- valeur dans `envoyer_lot_push`.
  c_delai_relance constant interval := interval '2 hours';

  v_debut timestamptz := clock_timestamp();
  v_api_key text;
  v_from text;
  v_response extensions.http_response;
  rec record;

  v_candidats integer;
  v_budget integer;
  v_traites integer;
  v_envoyes integer;
  v_echecs integer;
  v_statut text;
  v_detail text;
  v_total integer := 0;
begin
  select decrypted_secret into v_api_key
  from vault.decrypted_secrets where name = 'resend_api_key';

  select decrypted_secret into v_from
  from vault.decrypted_secrets where name = 'reminder_from_address';

  -- Avant tout test de configuration : qu'un rappel soit caduc est une vérité sur les
  -- données, pas une étape d'expédition (cf. 20260907090000). La caducité du mot de la veille,
  -- elle, vit dans `envoyer_les_notifications`, appelée juste en dessous : elle ne joint pas de
  -- point, et le passage du soir en a besoin aussi.
  update public.notification_outbox o
  set status = 'cancelled'
  from public.engagement_checkins c
  where c.id = o.checkin_id
    and o.status = 'pending'
    and c.status <> 'pending';

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

  -- ── Le push, par lots ────────────────────────────────────────────────────────────────
  -- **Avant l'email, et c'est tout le correctif du repli** (A9-12) : une ligne push qui ne
  -- trouve plus d'appareil joignable devient une ligne email due immédiatement, et la branche
  -- email ci-dessous la voit dans la même passe. Le code vit dans `envoyer_les_notifications`
  -- depuis C4.2, partagé avec le passage du soir ; ce passage-ci n'y voit que les points, et la
  -- ligne de journal du canal push y est écrite.
  v_total := v_total + public.envoyer_les_notifications('point');

  -- ── L'email ──────────────────────────────────────────────────────────────────────────
  v_traites := 0;
  v_envoyes := 0;
  v_echecs := 0;
  v_statut := 'success';
  v_detail := 'Rien en attente sur ce canal.';

  -- Les lignes repliées juste au-dessus sont **dans** ce compte : elles portent désormais
  -- `channel = 'email'`, `status = 'pending'` et `send_after = now()`. Un mot de la veille n'y
  -- entre jamais : il n'a pas d'adresse, donc pas de repli (contrainte de cohérence de la table).
  select count(*) into v_candidats
  from public.notification_outbox
  where status = 'pending' and attempts < 3 and send_after <= now() and channel = 'email';

  -- Les quatre branches ci-dessous (rien en attente / secret absent / plafond atteint / envoi)
  -- aboutissent à **un seul** insert, après le `end if` : le statut et le détail se préparent ici,
  -- la ligne s'écrit là-bas, toujours.
  if v_candidats > 0 then
    if v_api_key is null or v_from is null then
      -- Pas d'expéditeur configuré : on ne touche pas à la file — ni envoi, ni échec, ni
      -- tentative gâchée — mais on **laisse une trace**. C'est le `continue` muet d'avant, et
      -- le seul moyen de distinguer « personne n'attend de rappel » de « l'envoi est éteint ».
      v_statut := 'skipped';
      v_detail := format(
        'Envoi inactif, secret manquant dans le Vault : %s. %s rappel(s) en attente, rien n''est perdu.',
        case
          when v_api_key is null and v_from is null then 'resend_api_key, reminder_from_address'
          when v_api_key is null then 'resend_api_key'
          else 'reminder_from_address'
        end,
        v_candidats);
    else
      -- Ce qui est déjà parti aujourd'hui, tous passages confondus : le plafond de
      -- l'expéditeur est journalier, la borne doit l'être aussi.
      select greatest(0, c_plafond_email_jour - count(*))::integer into v_budget
      from public.notification_outbox
      where channel = 'email' and status = 'sent' and sent_at >= date_trunc('day', now());

      if v_budget = 0 then
        v_statut := 'skipped';
        v_detail := format(
          'Plafond journalier de l''expéditeur atteint (%s envois). %s rappel(s) repoussés au prochain passage.',
          c_plafond_email_jour, v_candidats);
      else
        for rec in
          select * from public.notification_outbox
          where status = 'pending' and attempts < 3 and send_after <= now() and channel = 'email'
          order by send_after, created_at
          limit least(c_lot_email, v_budget)
        loop
          exit when clock_timestamp() - v_debut > c_duree_max;

          -- Marquage avant l'appel, hors du bloc de rattrapage : même raison qu'au push.
          update public.notification_outbox
          set status = 'sent', sent_at = now(), attempts = rec.attempts + 1, last_error = null
          where id = rec.id;

          v_traites := v_traites + 1;

          begin
            select * into v_response from extensions.http((
              'POST',
              'https://api.resend.com/emails',
              array[extensions.http_header('Authorization', 'Bearer ' || v_api_key)],
              'application/json',
              jsonb_build_object(
                'from', v_from,
                'to', jsonb_build_array(rec.recipient_email),
                'subject', rec.subject,
                'text', rec.body,
                -- C2.9 : la sortie que la messagerie affiche au-dessus du message. Le pendant
                -- « One-Click », qui annonce un POST, est délibérément absent : la page est un
                -- export statique, elle ne répond pas au POST, et l'annoncer sans le servir
                -- ferait échouer le geste en silence. Le nom de cet en-tête ne s'écrit donc
                -- nulle part ici suivi de -Post, et le contrôle ci-dessous l'exige.
                -- Le secret est relu par message plutôt que gardé dans une variable : la
                -- déclaration est hors de cette substitution, et un lot vaut au plus
                -- vingt-cinq emails.
                'headers', jsonb_build_object(
                  'List-Unsubscribe',
                  '<' || coalesce(
                    (select decrypted_secret from vault.decrypted_secrets where name = 'app_url'),
                    'https://www.ramille.fr'
                  ) || '/rappels/stop?jeton=' || rec.unsubscribe_token::text || '>'
                )
              )::text
            )::extensions.http_request);

            if v_response.status between 200 and 299 then
              v_envoyes := v_envoyes + 1;
            else
              -- Trois tentatives puis abandon : un rappel n'a plus de sens une fois sa période
              -- passée, et insister sur une adresse qui refuse ne sert personne. La ligne est
              -- repoussée de deux heures : sans ce délai, les passes suivantes de la même nuit
              -- consommeraient les trois tentatives sur un refus passager.
              update public.notification_outbox
              set status = case when rec.attempts + 1 >= 3 then 'failed' else 'pending' end,
                  attempts = rec.attempts + 1,
                  sent_at = null,
                  send_after = now() + c_delai_relance,
                  last_error = 'HTTP ' || v_response.status || ' — ' || left(coalesce(v_response.content, ''), 300)
              where id = rec.id;
              v_echecs := v_echecs + 1;
            end if;

          exception when others then
            update public.notification_outbox
            set status = case when rec.attempts + 1 >= 3 then 'failed' else 'pending' end,
                attempts = rec.attempts + 1,
                sent_at = null,
                send_after = now() + c_delai_relance,
                last_error = left(sqlerrm, 300)
            where id = rec.id;
            v_echecs := v_echecs + 1;
          end;
        end loop;

        if v_echecs = 0 then
          v_statut := 'success';
        elsif v_envoyes > 0 then
          v_statut := 'partial';
        else
          v_statut := 'error';
        end if;

        -- Le solde est recalculé **après** la boucle : `v_budget` a été lu avant, et « encore
        -- disponibles » se lit comme « après cette passe ». Écrit avec la valeur d'avant, le
        -- détail annonçait cent envois disponibles la ligne même où quinze venaient de partir.
        v_detail := format('%s rappel(s) en attente au début de la passe, %s envoi(s) encore disponibles sur le plafond du jour.',
                           v_candidats, greatest(0, v_budget - v_envoyes));
      end if;
    end if;

    v_total := v_total + v_traites;
  end if;

  -- Une ligne pour ce canal aussi, quoi qu'il se soit passé — y compris « rien ».
  insert into public.reminder_send_runs (status, canal, genre, traites, envoyes, echecs, detail)
  values (v_statut, 'email', 'point', v_traites, v_envoyes, v_echecs, v_detail);

  return v_total;
end;
$function$;

revoke execute on function public.send_pending_reminders() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 9. Le passage du soir
-- ---------------------------------------------------------------------------------------------
-- Une **procédure**, comme `envoyer_rappels` et pour la même raison : ce qui est parti est acquis,
-- donc chaque passe committe. Ni `security definer` ni `set search_path` — les deux rendent le
-- contexte atomique et font échouer le `commit` (`SUPABASE.md` §1.6) ; tous les noms sont qualifiés.
-- La mise en file committe avant le premier envoi : une passe qui échoue ne défait pas la file.

create or replace procedure public.envoyer_les_mots_de_la_veille()
language plpgsql
as $procedure$
declare
  -- Même borne que le matin : un défaut ne doit pas pouvoir faire tourner le cron indéfiniment.
  c_passes_max constant integer := 20;
  v_traites integer;
  v_passes integer := 0;
begin
  perform public.mettre_en_file_les_mots_de_la_veille();
  commit;

  loop
    v_passes := v_passes + 1;
    v_traites := public.envoyer_les_notifications('veille');
    commit;
    exit when v_traites = 0 or v_passes >= c_passes_max;
  end loop;
end;
$procedure$;

revoke execute on procedure public.envoyer_les_mots_de_la_veille() from public, anon, authenticated;

comment on procedure public.envoyer_les_mots_de_la_veille() is
  'Point d''entrée du cron du mot de la veille (C4.2) : met en file, committe, puis enchaîne les passes '
  'd''envoi push du genre veille en committant entre chacune. S''appelle avec call, jamais select.';

-- Deux passages, 16 h 30 et 17 h 30 UTC : l'un des deux tombe à 18 h 30 à Paris, quelle que soit
-- la saison (cf. en-tête). Le retrait est enveloppé : `cron.unschedule` lève quand le job n'existe
-- pas, ce qui est le cas au premier passage de cette migration.
do $$
begin
  perform cron.unschedule('mot-de-la-veille');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'mot-de-la-veille',
  '30 16,17 * * *',
  $$call public.envoyer_les_mots_de_la_veille()$$
);

-- ---------------------------------------------------------------------------------------------
-- 10. Les deux vues d'exploitation
-- ---------------------------------------------------------------------------------------------
-- `rappels_bloques` **joignait `engagement_checkins`** : un mot de la veille en échec y était
-- invisible — le piège central de ce chantier, sur la vue même qui existe pour voir ce qui ne
-- part pas. Jointure externe, et le genre en dernière colonne (`create or replace view` n'ajoute
-- qu'en fin). `rappels_par_jour` comptait le mot parmi les rappels sans le dire : elle gagne le
-- genre, une ligne de plus par jour où les deux partent — la somme sur un jour reste la même.

create or replace view analytics.rappels_par_jour as
select
  -- Le jour où le message est parti, ou à défaut celui où il a été mis en file : une ligne
  -- en attente doit se voir quelque part, sinon une file qui ne s'écoule pas est invisible.
  date_trunc('day', coalesce(o.sent_at, o.created_at))::date as jour,
  o.channel as canal,
  o.status as statut,
  count(*) as nombre,
  o.genre
from public.notification_outbox o
group by 1, 2, 3, 5;

comment on view analytics.rappels_par_jour is
  'Volumétrie des rappels par jour, canal, statut et genre (point ou veille). C''est la vue qui répond à « les rappels partent-ils ? » — un jour sans ligne sent alors que des points sont ouverts est le signal d''un envoi cassé.';

create or replace view analytics.rappels_bloques as
select
  o.id,
  o.user_id,
  o.channel as canal,
  o.status as statut,
  o.send_after,
  o.attempts as tentatives,
  o.last_error as derniere_erreur,
  now() - o.created_at as age,
  c.loop_type as boucle,
  c.period_label as periode,
  o.genre
from public.notification_outbox o
left join public.engagement_checkins c on c.id = o.checkin_id
where (o.status = 'pending' and o.send_after < now() - interval '2 days')
   or o.status = 'failed';

comment on view analytics.rappels_bloques is
  'Les rappels qui ne partent pas : en attente depuis plus de deux jours, ou en échec définitif. La dernière erreur et l''âge sont là pour trancher entre « l''expéditeur refuse » et « la file n''avance plus ». Un mot de la veille en échec y figure (genre veille, sans boucle ni période) : c''est un appareil qui ne répond plus, et il a cessé sans repli (D3).';

revoke all privileges on table analytics.rappels_par_jour from anon, authenticated;
revoke all privileges on table analytics.rappels_bloques from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 11. L'export RGPD
-- ---------------------------------------------------------------------------------------------
-- `rappels_envoyes` **joignait `engagement_checkins`** : le mot de la veille manquait à l'export,
-- sans erreur. Jointure externe, et le genre et le jour visé à côté ; l'opt-in rejoint le compte,
-- et la date d'ouverture des dix semaines le plan. Réécrite depuis son corps installé.

CREATE OR REPLACE FUNCTION public.export_my_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_export jsonb;
begin
  if v_user_id is null then
    raise exception 'Aucune session.' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'export_genere_le', now(),
    'compte', (
      select jsonb_build_object(
        'identifiant', u.id,
        'email', u.email,
        'compte_anonyme', u.is_anonymous,
        'cree_le', u.created_at,
        'cadence_du_plan', p.cadence_type,
        'canal_de_rappel', p.reminder_channel,
        'mot_de_la_veille', p.mot_de_la_veille
      )
      from auth.users u join public.profiles p on p.id = u.id
      where u.id = v_user_id
    ),
    'appareils_pour_les_rappels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'plateforme', t.platform,
        'jeton_derniers_caracteres', right(t.token, 6),
        'enregistre_le', t.created_at,
        'vu_le', t.last_seen_at,
        'desactive_le', t.disabled_at
      ) order by t.created_at), '[]'::jsonb)
      from public.push_tokens t where t.user_id = v_user_id
    ),
    'bilans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'soumis_le', a.submitted_at,
        'statut', a.status,
        'reponses', to_jsonb(ans.*) - 'assessment_id',
        'resultats', to_jsonb(r.*) - 'assessment_id' - 'id'
      ) order by a.created_at), '[]'::jsonb)
      from public.assessments a
      left join public.assessment_answers ans on ans.assessment_id = a.id
      left join public.assessment_results r on r.assessment_id = a.id
      where a.user_id = v_user_id
    ),
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'periode', pc.period_label,
        'du', pc.period_start,
        'au', pc.period_end,
        'objectif_pct', pc.target_reduction_pct,
        'premier_engagement_le', pc.premier_engagement_le,
        'actions', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'action', t.action_text,
            'gain_kg_par_an', pa.saving_kg_year,
            'engagement_pris_le', pa.committed_at,
            'jours_choisis', pa.intention_days,
            'echeance_choisie', pa.intention_timing
          ) order by pa.rank), '[]'::jsonb)
          from public.plan_actions pa
          join public.action_templates t on t.id = pa.action_template_id
          where pa.plan_cycle_id = pc.id
        )
      ) order by pc.period_start), '[]'::jsonb)
      from public.plan_cycles pc where pc.user_id = v_user_id
    ),
    'points_de_suivi', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'periode', c.period_label,
        'trajet', c.trip_label,
        'statut', c.status,
        'reponse', c.response,
        'repondu_le', c.responded_at
      ) order by c.period_start), '[]'::jsonb)
      from public.engagement_checkins c where c.user_id = v_user_id
    ),
    'rappels_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'genre', o.genre,
        'periode', c.period_label,
        'jour_vise', o.jour_vise,
        'canal', o.channel,
        'statut', o.status,
        'envoye_le', o.sent_at
      ) order by o.created_at), '[]'::jsonb)
      from public.notification_outbox o
      left join public.engagement_checkins c on c.id = o.checkin_id
      where o.user_id = v_user_id
    ),
    'engagements_relaches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'action', ar2.action_text,
        'engagement_pris_le', ar2.committed_at,
        'jours_choisis', ar2.intention_days,
        'echeance_choisie', ar2.intention_timing,
        'relache_le', ar2.released_at,
        'raison', ar2.released_reason
      ) order by ar2.released_at), '[]'::jsonb)
      from public.plan_action_commitments_archive ar2 where ar2.user_id = v_user_id
    ),
    'retours_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'categorie', f.kind, 'message', f.message, 'ecran', f.context, 'envoye_le', f.created_at
      ) order by f.created_at), '[]'::jsonb)
      from public.feedback f where f.user_id = v_user_id
    ),
    'reperes_de_parcours', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'evenement', e.name, 'details', e.props, 'plateforme', e.platform, 'le', e.occurred_at
      ) order by e.occurred_at), '[]'::jsonb)
      from public.usage_events e where e.user_id = v_user_id
    )
  ) into v_export;

  return v_export;
end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- 12. Retirer son seul bilan referme aussi la fenêtre du mot de la veille
-- ---------------------------------------------------------------------------------------------
--
-- **Réécrite depuis son corps installé** (`20260927230411_retirer_un_bilan.sql`, dont l'empreinte
-- `md5(prosrc)` sur le distant est celle du fichier, relevé le 27/09/2026 à l'application). Une
-- seule instruction s'ajoute, dans le cas où il ne reste aucun bilan : la date des dix semaines
-- repart à vide, comme l'action engagée a été archivée juste au-dessus — le retrait du seul bilan est
-- un nouveau départ (décision du 27/09/2026), et le mot de la veille en fait partie. Le retrait d'un
-- bilan qui n'est pas le seul ne touche pas la fenêtre : le plan reconstruit continue la saison.
create or replace function public.retirer_le_bilan(p_assessment_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_statut text;
  v_dernier uuid;
  v_restants integer;
begin
  perform 1 from public.assessments
  where user_id = v_uid
  order by id
  for update;

  select status into v_statut
  from public.assessments
  where id = p_assessment_id and user_id = v_uid;

  if v_statut is null then
    raise exception 'Bilan introuvable.' using errcode = 'no_data_found';
  end if;

  -- L'état est nommé en français : `in_progress` et `withdrawn` sont des valeurs de colonne, et ce
  -- message remonte jusqu'au client par PostgREST.
  if v_statut <> 'completed' then
    raise exception 'Ce bilan ne se retire pas (%).',
      case v_statut
        when 'withdrawn' then 'déjà retiré'
        when 'in_progress' then 'pas encore soumis'
        else v_statut
      end
      using errcode = 'RM006';
  end if;

  -- Le bilan qui porte le plan aujourd'hui, lu **avant** le retrait : c'est lui qui dit si le plan
  -- doit bouger. Même choix que `generate_plan_cycle_for_user`, au tri près.
  select a.id into v_dernier
  from public.assessments a
  where a.user_id = v_uid and a.status = 'completed'
  order by a.submitted_at desc nulls last
  limit 1;

  update public.assessments set status = 'withdrawn' where id = p_assessment_id;

  select count(*)::integer into v_restants
  from public.assessments
  where user_id = v_uid and status = 'completed';

  if v_restants > 0 and v_dernier = p_assessment_id then
    perform public.generate_plan_cycle_for_user(v_uid, 'retrait');
  end if;

  -- **Plus aucun bilan valide : les rappels en attente n'ont plus rien à rappeler** (27/09/2026).
  -- La personne repart de l'onboarding, et un e-mail encore en file — l'étalement du lundi le retient
  -- jusqu'à quatre jours — partirait vers `/plan?rappel=1`, qui, sans bilan ni marque locale, propose
  -- de retrouver un compte. `cancelled` est l'état que `desinscrire_des_rappels` et
  -- `send_pending_reminders` posent déjà pour un rappel devenu caduc. Les points eux-mêmes restent :
  -- ils expireront au passage suivant du générateur, comme tout point sans réponse.
  if v_restants = 0 then
    update public.notification_outbox
    set status = 'cancelled'
    where user_id = v_uid and status = 'pending';

    -- **Et l'action engagée est archivée, puis désengagée** (décision du 27/09/2026, question 12a) :
    -- la confirmation promet « tu repartiras d'un nouveau bilan », donc rien de l'ancien plan ne doit
    -- revenir — ni reposé au bilan suivant de la même saison, ni reconduit à la suivante. Le cycle
    -- courant seulement : les saisons révolues gardent leur engagement, c'est leur historique, et la
    -- reconduction ne lit plus que le cycle qui précède (plus haut). L'archive garde la trace (C2.2),
    -- sous la raison `retrait`, que l'encart orphelin tait.
    perform public.archiver_engagement_de_laction(pa.id, 'retrait')
    from public.plan_actions pa
    where pa.committed_at is not null
      and pa.plan_cycle_id = (
        select pc.id from public.plan_cycles pc
        where pc.user_id = v_uid
        order by pc.period_start desc
        limit 1
      );

    update public.plan_actions pa
    set committed_at = null, intention_days = null, intention_timing = null, carried_over_from = null
    where pa.committed_at is not null
      and pa.plan_cycle_id = (
        select pc.id from public.plan_cycles pc
        where pc.user_id = v_uid
        order by pc.period_start desc
        limit 1
      );

    -- **Et la fenêtre du mot de la veille repart avec le bilan suivant** (C4.2) : la date des dix
    -- semaines vit sur le cycle, qui reste. Sans cette ligne, le premier trajet choisi après le
    -- nouveau bilan de la même saison ne la reposerait pas — `commit_plan_action` ne l'écrit que
    -- vide —, et le mot accompagnerait un nouveau départ sur une fenêtre à moitié consommée.
    update public.plan_cycles pc
    set premier_engagement_le = null
    where pc.id = (
      select c.id from public.plan_cycles c
      where c.user_id = v_uid
      order by c.period_start desc
      limit 1
    );
  end if;

  return v_restants;
end;
$function$;

revoke execute on function public.retirer_le_bilan(uuid) from public, anon, authenticated;
grant execute on function public.retirer_le_bilan(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 13. Le signe de vie des rappels, en un seul endroit
-- ---------------------------------------------------------------------------------------------
--
-- Le lot 6 (`20260927230611_les_cohortes_avant_la_purge.sql`) a extrait l'expression du signe de vie
-- dans `dernier_signe_de_vie`, sans rebrancher `regime_de_rappel` : ce chantier-ci devait peut-être
-- réécrire le régime, et deux réécritures concurrentes d'une même fonction font gagner la dernière
-- appliquée, en silence. Il ne l'a pas réécrit — le mot de la veille appelle le régime, il ne le
-- change pas —, donc la factorisation se fait ici. **Réécrite depuis son corps installé** : son
-- empreinte `md5(prosrc)` sur le distant est celle de `20260912170000`, relevée le 28/09/2026. Seule
-- la lecture du signe de vie change ; les seuils, le comptage et les trois valeurs rendues sont
-- repris tels quels. L'assertion 3 de `36` l'acceptait déjà sous cette forme, et elle cesse d'être
-- une inclusion : il n'y a plus deux textes.
create or replace function public.regime_de_rappel(p_user_id uuid, p_loop_type text)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  c_seuil_espace constant integer := 4;
  c_seuil_silence constant integer := 8;
  v_depuis timestamptz;
  v_muets integer;
begin
  -- **Le plus récent des deux signaux de vie.** Une réponse vaut pour sa boucle ; une ouverture de
  -- l'app vaut pour les deux — quelqu'un qui revient et ne répond pas à *cette* question-là n'est
  -- pas quelqu'un qui est parti. La définition vit en un seul endroit depuis le lot 6
  -- (`dernier_signe_de_vie`), que les cohortes de la purge lisent aussi.
  v_depuis := public.dernier_signe_de_vie(p_user_id, p_loop_type);

  select count(*) into v_muets
  from public.engagement_checkins c
  where c.user_id = p_user_id
    and c.loop_type = p_loop_type
    and c.status = 'expired'
    and (v_depuis is null or c.period_start::timestamptz > v_depuis);

  -- `security definer` est nécessaire et pas décoratif : `usage_events` n'a **aucune policy de
  -- lecture**, donc ce comptage ne verrait rien depuis `authenticated`. Même piège que le garde-fou
  -- de volume de cette table (v1-08 §5.2) — un compteur qui ne compte rien ne déclenche jamais.
  if v_muets >= c_seuil_silence then
    return 'silence';
  elsif v_muets >= c_seuil_espace then
    return 'espace';
  end if;

  return 'normal';
end;
$$;

revoke execute on function public.regime_de_rappel(uuid, text) from public, anon, authenticated;

comment on function public.dernier_signe_de_vie(uuid, text) is
  'Le dernier signe de vie d''un compte pour une boucle : le plus récent du début de période d''un '
  'point répondu de cette boucle et d''un app_open. Lu par regime_de_rappel (C2.9) et par les '
  'cohortes de la purge (lot 6) : une seule définition.';
