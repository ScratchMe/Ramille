-- Tests pgTAP du mot de la veille — C4.2 (issue #144), migration 20260928075453_le_mot_de_la_veille.sql.
-- Décisions D1 à D5 du 27/09/2026 (`v1-25`, en-tête).
--
-- Ce que ce fichier défend : **un message de plus, qui ne passe à côté d'aucune des protections du
-- premier.** Le mot de la veille n'est pas attaché à un point, donc tout ce qui, dans la boucle de
-- rappels, trouvait son chemin par `checkin_id` pouvait le laisser filer sans rien dire — le
-- plafond, la caducité, le passage du matin, la vue des rappels bloqués, l'export. Chaque section
-- ci-dessous en garde une.
--
-- ## Trois choses à savoir avant de « corriger » un test de ce fichier
--
-- **1. « Aujourd'hui » est passé explicitement à la mise en file** (`current_date`), et ce n'est pas
-- de la commodité. Le soir se lit en heure de Paris ; entre 22 h et minuit UTC, le jour de Paris a
-- déjà changé. Une transaction pgTAP ne choisit pas son `now()`, donc laisser la fonction lire
-- l'heure ferait tomber ce fichier deux heures par nuit. La caducité, elle, lit bien l'heure de
-- Paris : ses fixtures sont posées sur ce jour-là (`test.paris`).
--
-- **2. Aucun appel HTTP n'est fait**, et c'est ce qui borne ce que le fichier prouve. Avant chaque
-- passe d'envoi, les jetons des fixtures sont désactivés : une ligne que la passe prend passe alors
-- par le repli, sans appeler Expo, et c'est ce repli qui se voit. Le marquage `sent` avant l'appel
-- n'est pas éprouvé ici — c'est le code du passage du matin déplacé tel quel.
--
-- **3. La section 8 ne se rejoue pas sur le distant** : une passe d'envoi y prendrait les vrais
-- mots et les vrais points en attente, et `send_pending_reminders` y enverrait de vrais emails
-- (`TESTING.md` §2.3). Le reste est borné à ses propres comptes ; la seule assertion qui compte sur
-- toute la base (17 : la seconde mise en file rend zéro) y reste vraie, la première ayant tout pris.
--
-- ## Éprouvé en le cassant (TESTING.md §1.1), le 27/09/2026 puis le 28/09/2026
--
-- Vingt-deux mutations de la migration `20260928075453`, une à la fois, chacune rejouée par
-- `node scripts/rejouer-la-ci.mjs base` (stack reconstruite, suite pgTAP entière) puis le fichier
-- remis à l'identique — par git pour les dix-neuf premières, par une copie comparée octet à octet
-- pour les trois dernières, jouées sur la branche d'intégration avec C4.7. Aucune n'a fait tomber un
-- autre fichier que celui-ci.
-- Les seize premières ont été jouées le 27, puis **toutes rejouées le 28** après les arbitrages du
-- 27/09/2026 (fenêtre ouverte par un trajet, deux canaux Android), qui ont ajouté quatre assertions et
-- décalé les numéros : les numéros ci-dessous sont ceux du second passage, relevés et non recalculés.
--
--   | Ce qu'on casse                                                       | Ce qui tombe ici                        |
--   |----------------------------------------------------------------------|-----------------------------------------|
--   | mise en file sans `reminder_channel_for() = 'push'`                  | 20, 21, 22 (« aucun », email, sans jeton) |
--   | mise en file sans `regime_de_rappel() = 'normal'`                    | 23 (régime espacé)                      |
--   | mise en file sans `mot_de_la_veille = 'oui'`                         | 18, 19 (jamais proposé, refusé)         |
--   | `dernier_soir` à `+ 70` au lieu de `+ 69`                             | 26 (onzième semaine), 31 (l'écran)      |
--   | `v_aujourdhui < dernier_soir` au lieu de `<=`                         | 27 (dernier soir de la dixième)         |
--   | `commit_plan_action` repose la date à chaque engagement de trajet    | 11, 12 (autre action, changer d'avis), 31 |
--   | `commit_plan_action` pose la date quel que soit le poste (28/09)     | 13, 14 (le vol n'ouvre rien, le trajet ensuite ouvre) |
--   | la fenêtre ne se lit plus sur le cycle d'origine d'une reconduction  | 29 (la fenêtre qui court)               |
--   | l'envoi push sans le filtre `genre = p_genre`                        | 35 (le matin prend le mot), 41 (le soir prend un point) |
--   | la caducité du mot désarmée                                          | 36, 40, 42                              |
--   | `rappels_bloques` en jointure interne                                | 44                                      |
--   | l'export en jointure interne                                         | 32                                      |
--   | le trigger `garder_la_reponse_au_mot_de_la_veille` retiré            | 53                                      |
--   | l'index de la clé d'idempotence rendu non unique                     | 17, 32, 49                              |
--   | la contrainte de cohérence sans `recipient_email is null`            | 47                                      |
--   | une phrase de gabarit retirée (contrôle de migration désarmé)        | 5 (le balayage)                         |
--   | le `grant` du RPC de la fenêtre retiré                               | le fichier s'arrête à la section 7 (`permission denied`), 30 tests sur 64 |
--   | le message nomme `'rappels'` en dur au lieu de `canal_android` (28/09) | 64                                    |
--   | `canal_android('veille')` rend `rappels` (28/09)                     | 63                                      |
--   | `retirer_le_bilan` sans la remise à vide de `premier_engagement_le`  | 65 (seule, sur les 762 de la suite)     |
--   |   (28/09, intégration avec C4.7)                                     |                                         |
--   | la mise en file du cron sans l'attente de 18 h 30 (28/09)            | 68 (seule)                              |
--   | `le_soir_du_mot_est_venu` à 17 h 30 au lieu de 18 h 30 (28/09)        | 66, 67                                  |
--
-- Ce qui n'est pas éprouvé par mutation : que `generate_plan_cycle_for_user` ne pose pas la date
-- (assertion 15) — la fonction n'appartient pas à ce chantier, et la muter aurait demandé de la
-- réécrire ; l'assertion garde le jour où quelqu'un ajoutera la colonne à son `upsert`. Ni le
-- contrôle du rattrapage dans la migration (dates posées sur le seul trajet, dans les deux sens) : la
-- stack de test part d'une base vide, il n'y a rien à rattraper.
begin;
create extension if not exists pgtap with schema extensions;

select plan(69);

-- ── 1. La structure ─────────────────────────────────────────────────────────────────────

select has_column('public', 'profiles', 'mot_de_la_veille',
  'profiles.mot_de_la_veille : l''opt-in, distinct du canal (D2)');
select has_column('public', 'plan_cycles', 'premier_engagement_le',
  'plan_cycles.premier_engagement_le : le début des dix semaines (D4)');
select has_column('public', 'notification_outbox', 'jour_vise',
  'notification_outbox.jour_vise : le jour que le mot annonce');

-- `UNIQUE (checkin_id)` est la garantie anti-relance de la spec §7 : le chantier passe à côté par un
-- `NULL`, il ne la touche pas.
select ok(
  (select indisunique from pg_index
   where indexrelid = 'public.notification_outbox_checkin_id_key'::regclass),
  'un point, un message : l''unicité sur checkin_id est toujours là'
);

-- ── 2. Les phrases (D5) : deux balayages, aucun gabarit nommé ────────────────────────────
-- Comme ceux de `first_step` (26) : c'est la seule forme qui attrape un gabarit **ajouté**. Un
-- gabarit de trajet sans phrase ne serait jamais mis en file, et rien ne le dirait.

select is(
  (select count(*)::int from public.action_templates
   where poste = 'commute' and phrase_de_la_veille is null),
  0,
  'tout gabarit de trajet porte sa phrase de la veille — un gabarit ajouté sans elle tomberait ici'
);

select is(
  (select count(*)::int from public.action_templates where phrase_de_la_veille ~ '[0-9]'),
  0,
  'aucune phrase de la veille ne porte de chiffre'
);

select is(
  (select count(*)::int from public.action_templates
   where poste is distinct from 'commute' and phrase_de_la_veille is not null),
  0,
  'aucune phrase hors du trajet domicile-travail : seule son intention se donne en jours'
);

-- La forme décidée (D5) : ce que la personne a prévu, dit comme un fait — jamais une consigne.
select is(
  (select count(*)::int from public.action_templates
   where phrase_de_la_veille is not null
     and (phrase_de_la_veille not like 'Demain, tu as prévu de %.'
          or phrase_de_la_veille ~* '(tu devrais|il faut)'
          or phrase_de_la_veille like '%' || chr(10) || '%')),
  0,
  'chaque phrase dit « Demain, tu as prévu de … », sur une ligne, sans injonction'
);

-- ── 3. Les fixtures des cas simples ─────────────────────────────────────────────────────
-- Chaque compte a le même état nominal — un cycle qui couvre aujourd'hui, « Faire un trajet sur cinq
-- à vélo » engagée tous les jours, un jeton actif, `push` et `oui` —, et **un seul écart**, écrit
-- juste en dessous. Un compte par cas : une mutation fait tomber un cas, et un seul.

select set_config('test.paris', ((now() at time zone 'Europe/Paris')::date)::text, true);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-veille-' || right(u::text, 2) || '@test.local', 'x', now(), now(), now(), false
from unnest(array[
  'c4200000-0000-0000-0000-000000000001'::uuid,  -- A : le chemin nominal, et D4 par commit_plan_action
  'c4200000-0000-0000-0000-000000000003',        -- jamais proposé
  'c4200000-0000-0000-0000-000000000004',        -- refusé
  'c4200000-0000-0000-0000-000000000005',        -- canal « aucun »
  'c4200000-0000-0000-0000-000000000006',        -- canal email
  'c4200000-0000-0000-0000-000000000007',        -- plus de jeton actif
  'c4200000-0000-0000-0000-000000000008',        -- régime espacé
  'c4200000-0000-0000-0000-000000000009',        -- demain n'est pas un jour choisi
  'c4200000-0000-0000-0000-000000000010',        -- action engagée sur les voyages
  'c4200000-0000-0000-0000-000000000011',        -- le jour de la onzième semaine
  'c4200000-0000-0000-0000-000000000012',        -- le dernier soir de la dixième
  'c4200000-0000-0000-0000-000000000013'         -- une reconduction dont la fenêtre est close
]) u;

insert into public.plan_cycles (user_id, cadence_type, period_label, period_start, period_end, trip_label, poste, target_reduction_pct)
select u, 'season', 'Saison de test', current_date - 30, current_date + 60, 'Trajet domicile-travail (Voiture)', 'commute', 20
from unnest(array[
  'c4200000-0000-0000-0000-000000000001'::uuid, 'c4200000-0000-0000-0000-000000000003',
  'c4200000-0000-0000-0000-000000000004', 'c4200000-0000-0000-0000-000000000005',
  'c4200000-0000-0000-0000-000000000006', 'c4200000-0000-0000-0000-000000000007',
  'c4200000-0000-0000-0000-000000000008', 'c4200000-0000-0000-0000-000000000009',
  'c4200000-0000-0000-0000-000000000010', 'c4200000-0000-0000-0000-000000000011',
  'c4200000-0000-0000-0000-000000000012', 'c4200000-0000-0000-0000-000000000013'
]) u;

-- Deux actions de trajet pour A, **non engagées** : A s'engage par le RPC, section 4.
insert into public.plan_actions (plan_cycle_id, action_template_id, rank, first_step)
select pc.id, t.id, r.rang, t.first_step
from public.plan_cycles pc
cross join (values ('Faire un trajet sur cinq à vélo', 1), ('Passer deux trajets sur cinq en métro ou en tram', 2)) as r(texte, rang)
join public.action_templates t on t.action_text = r.texte
where pc.user_id = 'c4200000-0000-0000-0000-000000000001';

-- Les autres : la même action, engagée tous les jours depuis dix jours, posée à la main.
insert into public.plan_actions (plan_cycle_id, action_template_id, rank, first_step, committed_at, intention_days)
select pc.id, t.id, 1, t.first_step, now() - interval '10 days', array[1,2,3,4,5,6,7]::smallint[]
from public.plan_cycles pc
join public.action_templates t on t.action_text = 'Faire un trajet sur cinq à vélo'
where pc.user_id <> 'c4200000-0000-0000-0000-000000000001'
  and pc.user_id::text like 'c4200000-0000-0000-0000-0000000000%'
  and pc.user_id not in ('c4200000-0000-0000-0000-000000000010', 'c4200000-0000-0000-0000-000000000013');

-- La date des dix semaines, posée comme `commit_plan_action` l'aurait posée — donc **pas** pour le
-- compte engagé sur un vol (10) : seule une action de trajet ouvre la fenêtre (arbitrage du
-- 27/09/2026). Une fixture qui l'écrirait éprouverait un état que la production ne produit plus.
update public.plan_cycles set premier_engagement_le = now() - interval '10 days'
where user_id::text like 'c4200000-0000-0000-0000-0000000000%'
  and user_id not in ('c4200000-0000-0000-0000-000000000001', 'c4200000-0000-0000-0000-000000000010');

insert into public.push_tokens (token, user_id, platform)
select 'ExponentPushToken[pgtap-veille-' || right(id::text, 2) || ']', id, 'android'
from auth.users
where id::text like 'c4200000-0000-0000-0000-0000000000%';

-- Avant tout réglage : une personne à qui l'on n'a rien demandé n'a rien répondu.
select is(
  (select mot_de_la_veille from public.profiles where id = 'c4200000-0000-0000-0000-000000000003'),
  'jamais_propose',
  'D2 : personne n''a répondu tant qu''on ne lui a rien demandé'
);

update public.profiles set reminder_channel = 'push', mot_de_la_veille = 'oui'
where id::text like 'c4200000-0000-0000-0000-0000000000%'
  and id <> 'c4200000-0000-0000-0000-000000000003';
update public.profiles set reminder_channel = 'push'
where id = 'c4200000-0000-0000-0000-000000000003';

-- Les écarts, un par compte.
update public.profiles set mot_de_la_veille = 'refuse' where id = 'c4200000-0000-0000-0000-000000000004';
update public.profiles set reminder_channel = 'none' where id = 'c4200000-0000-0000-0000-000000000005';
update public.profiles set reminder_channel = 'email' where id = 'c4200000-0000-0000-0000-000000000006';
update public.push_tokens set disabled_at = now(), disabled_reason = 'permission retirée'
where user_id = 'c4200000-0000-0000-0000-000000000007';

-- Quatre points clos sans réponse, aucun signe de vie : le régime espacé (C2.9).
insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select 'c4200000-0000-0000-0000-000000000008', 'commute', d::date, 'Semaine', 'Trajet domicile-travail', 'commute', 'expired'
from generate_series(current_date - 35, current_date - 14, interval '7 day') as d;

update public.plan_actions pa set intention_days = (
  select array_agg(d::smallint order by d) from generate_series(1, 7) d
  where d <> extract(isodow from current_date + 1)
)
from public.plan_cycles pc
where pc.id = pa.plan_cycle_id and pc.user_id = 'c4200000-0000-0000-0000-000000000009';

insert into public.plan_actions (plan_cycle_id, action_template_id, rank, first_step, committed_at, intention_timing)
select pc.id, t.id, 1, t.first_step, now() - interval '10 days', 'prochaine_occasion'
from public.plan_cycles pc
join public.action_templates t on t.poste = 'travel' and t.segment = 'flight_long'
where pc.user_id = 'c4200000-0000-0000-0000-000000000010';

-- Midi à Paris, soixante-dix jours avant : le soir d'aujourd'hui est le premier de la onzième semaine.
update public.plan_cycles
set premier_engagement_le = ((current_date - 70) + time '12:00') at time zone 'Europe/Paris'
where user_id = 'c4200000-0000-0000-0000-000000000011';
update public.plan_cycles
set premier_engagement_le = ((current_date - 69) + time '12:00') at time zone 'Europe/Paris'
where user_id = 'c4200000-0000-0000-0000-000000000012';

-- Une reconduction dont la fenêtre est close : le cycle d'origine a ouvert la sienne il y a
-- quatre-vingts jours, le cycle courant n'en a pas ouvert (rien n'y a été choisi), et l'action y est
-- marquée reconduite — exactement ce qu'écrit `generate_plan_cycle_for_user` (21, scénario B).
insert into public.plan_cycles (user_id, cadence_type, period_label, period_start, period_end, trip_label, poste, target_reduction_pct, premier_engagement_le)
values ('c4200000-0000-0000-0000-000000000013', 'season', 'Saison révolue', current_date - 130, current_date - 31,
        'Trajet domicile-travail (Voiture)', 'commute', 20, now() - interval '80 days');
update public.plan_cycles set premier_engagement_le = null
where user_id = 'c4200000-0000-0000-0000-000000000013' and period_label = 'Saison de test';
insert into public.plan_actions (plan_cycle_id, action_template_id, rank, first_step, committed_at, intention_days, carried_over_from)
select pc.id, t.id, 1, t.first_step, now() - interval '80 days', array[1,2,3,4,5,6,7]::smallint[],
       (select id from public.plan_cycles where user_id = 'c4200000-0000-0000-0000-000000000013' and period_label = 'Saison révolue')
from public.plan_cycles pc
join public.action_templates t on t.action_text = 'Faire un trajet sur cinq à vélo'
where pc.user_id = 'c4200000-0000-0000-0000-000000000013' and pc.period_label = 'Saison de test';

-- ── 4. Les dix semaines comptent depuis le premier engagement CHOISI sur un TRAJET (D4) ────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4200000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select public.commit_plan_action(
  (select pa.id from public.plan_actions pa join public.action_templates t on t.id = pa.action_template_id
   where t.action_text = 'Faire un trajet sur cinq à vélo'),
  array[1,2,3,4,5,6,7]::smallint[], null);

select set_config('role', 'postgres', true);

select is(
  (select premier_engagement_le from public.plan_cycles where user_id = 'c4200000-0000-0000-0000-000000000001'),
  now(),
  'D4 : le premier engagement choisi de la saison sur une action de trajet ouvre les dix semaines'
);

-- La date est reculée à la main : sans ça, un second choix dans la même transaction reposerait
-- `now()` — la même valeur —, et l'assertion passerait sans rien éprouver.
update public.plan_cycles set premier_engagement_le = now() - interval '20 days'
where user_id = 'c4200000-0000-0000-0000-000000000001';

select set_config('role', 'authenticated', true);
select public.commit_plan_action(
  (select pa.id from public.plan_actions pa join public.action_templates t on t.id = pa.action_template_id
   where t.action_text = 'Passer deux trajets sur cinq en métro ou en tram'),
  array[1,2,3,4,5,6,7]::smallint[], null, true);
select set_config('role', 'postgres', true);

select is(
  (select premier_engagement_le from public.plan_cycles where user_id = 'c4200000-0000-0000-0000-000000000001'),
  now() - interval '20 days',
  'D4 : « Choisir une autre action » en cours de saison ne rouvre rien'
);

select set_config('role', 'authenticated', true);
select public.clear_plan_action_commitment(
  (select pa.id from public.plan_actions pa where pa.committed_at is not null));
select public.commit_plan_action(
  (select pa.id from public.plan_actions pa join public.action_templates t on t.id = pa.action_template_id
   where t.action_text = 'Faire un trajet sur cinq à vélo'),
  array[1,2,3,4,5,6,7]::smallint[], null);
select set_config('role', 'postgres', true);

select is(
  (select premier_engagement_le from public.plan_cycles where user_id = 'c4200000-0000-0000-0000-000000000001'),
  now() - interval '20 days',
  'D4 : « Changer d''avis » puis choisir à nouveau ne rouvre rien non plus'
);

-- Un vol choisi d'abord, un trajet ensuite (arbitrage du 27/09/2026) : le vol n'ouvre rien, et c'est
-- le trajet qui ouvre la fenêtre. Sans cette règle, le vol aurait entamé les dix semaines d'un mot
-- qui ne le suit pas, et le trajet choisi six semaines plus tard n'en aurait eu que quatre.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous)
values ('c4200000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'pgtap-veille-14@test.local', 'x', now(), now(), now(), false);

insert into public.plan_cycles (user_id, cadence_type, period_label, period_start, period_end, trip_label, poste, target_reduction_pct)
values ('c4200000-0000-0000-0000-000000000014', 'season', 'Saison de test', current_date - 30, current_date + 60,
        'Trajet domicile-travail (Voiture)', 'commute', 20);

insert into public.plan_actions (plan_cycle_id, action_template_id, rank, first_step)
select pc.id, t.id, t.rang, t.first_step
from public.plan_cycles pc
cross join (
  (select id, first_step, 1 as rang from public.action_templates
   where poste = 'travel' and segment = 'flight_long' order by action_text limit 1)
  union all
  (select id, first_step, 2 from public.action_templates where action_text = 'Faire un trajet sur cinq à vélo')
) t
where pc.user_id = 'c4200000-0000-0000-0000-000000000014';

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4200000-0000-0000-0000-000000000014', 'role', 'authenticated')::text, true);
select public.commit_plan_action(
  (select pa.id from public.plan_actions pa join public.action_templates t on t.id = pa.action_template_id
   where t.poste = 'travel'),
  null, 'prochaine_occasion');
select set_config('role', 'postgres', true);

select is(
  (select premier_engagement_le from public.plan_cycles where user_id = 'c4200000-0000-0000-0000-000000000014'),
  null,
  'D4 : une action de voyage choisie d''abord n''ouvre pas la fenêtre du mot de la veille'
);

-- Si une date avait été posée, elle recule : sans ça, le trajet choisi dans la même transaction
-- trouverait `now()` — la même valeur — et l'assertion suivante passerait sans rien éprouver.
update public.plan_cycles set premier_engagement_le = premier_engagement_le - interval '42 days'
where user_id = 'c4200000-0000-0000-0000-000000000014';

select set_config('role', 'authenticated', true);
select public.commit_plan_action(
  (select pa.id from public.plan_actions pa join public.action_templates t on t.id = pa.action_template_id
   where t.action_text = 'Faire un trajet sur cinq à vélo'),
  array[2,4]::smallint[], null, true);
select set_config('role', 'postgres', true);

select is(
  (select premier_engagement_le from public.plan_cycles where user_id = 'c4200000-0000-0000-0000-000000000014'),
  now(),
  'D4 : c''est le trajet choisi ensuite, à la place du vol, qui ouvre les dix semaines'
);

-- ── 5. La reconduction, par le vrai générateur ──────────────────────────────────────────
-- Le scénario B de `21` : un bilan, un plan, un engagement, puis le cycle reculé d'une saison — le
-- générateur crée le cycle courant et y reconduit l'engagement. Huit kilomètres et non vingt : le
-- gabarit du vélo s'arrête à dix (`max_distance_km`), et c'est lui qu'on engage.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous)
values ('c4200000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'pgtap-veille-02@test.local', 'x', now(), now(), now(), false);

insert into public.assessments (id, user_id, status)
values ('c4210000-0000-0000-0000-000000000002', 'c4200000-0000-0000-0000-000000000002', 'completed');

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, commute_days_per_week,
  commute_distance_km, commute_mode, commute_car_engine, leisure_frequency, leisure_mode,
  leisure_distance_bracket, leisure_car_engine, zone_type, tc_access, household_vehicles)
values ('c4210000-0000-0000-0000-000000000002', true, 5, 8, 'voiture', 'thermique', 'weekly', 'voiture', '15_30', 'thermique',
        'urbain_dense', 'bon', '1');

select public.recompute_assessment_results('c4210000-0000-0000-0000-000000000002');

select set_config('test.cycle_b',
  (select id::text from public.plan_cycles where user_id = 'c4200000-0000-0000-0000-000000000002'), true);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4200000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select public.commit_plan_action(
  (select pa.id from public.plan_actions pa join public.action_templates t on t.id = pa.action_template_id
   where pa.plan_cycle_id = current_setting('test.cycle_b')::uuid and t.action_text = 'Faire un trajet sur cinq à vélo'),
  array[1,2,3,4,5,6,7]::smallint[], null);
select set_config('role', 'postgres', true);

update public.plan_cycles
set period_start = period_start - 100, period_end = period_end - 100
where id = current_setting('test.cycle_b')::uuid;

select public.generate_plan_cycle_for_user('c4200000-0000-0000-0000-000000000002');

select set_config('test.cycle_b2',
  (select id::text from public.plan_cycles
   where user_id = 'c4200000-0000-0000-0000-000000000002' and id <> current_setting('test.cycle_b')::uuid), true);

select results_eq(
  $$ select pc.premier_engagement_le is null, pa.carried_over_from = current_setting('test.cycle_b')::uuid
     from public.plan_cycles pc
     join public.plan_actions pa on pa.plan_cycle_id = pc.id and pa.committed_at is not null
     where pc.id = current_setting('test.cycle_b2')::uuid $$,
  $$ values (true, true) $$,
  'D4 : une reconduction au changement de saison n''ouvre pas de fenêtre'
);

insert into public.push_tokens (token, user_id, platform)
values ('ExponentPushToken[pgtap-veille-02]', 'c4200000-0000-0000-0000-000000000002', 'android');
update public.profiles set reminder_channel = 'push', mot_de_la_veille = 'oui'
where id = 'c4200000-0000-0000-0000-000000000002';

-- ── 6. La mise en file du soir ──────────────────────────────────────────────────────────

select public.mettre_en_file_les_mots_de_la_veille(current_date);

select results_eq(
  $$ select genre, checkin_id is null, channel, recipient_email is null, jour_vise - current_date,
            subject, push_body, send_after = ((current_date + time '18:30') at time zone 'Europe/Paris')
     from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000001' $$,
  $$ values ('veille'::text, true, 'push'::text, true, 1, 'Pour demain'::text,
             'Demain, tu as prévu de faire ton trajet à vélo.'::text, true) $$,
  'le mot part la veille à 18 h 30 à Paris, par notification, sans point ni adresse, avec les mots de l''action'
);

select is(
  public.mettre_en_file_les_mots_de_la_veille(current_date),
  0,
  'deux passages le même soir ne font qu''un mot — la clé d''idempotence tient'
);

select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000003' $$,
  'D2 : jamais proposé, jamais envoyé'
);
select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000004' $$,
  'D2 : un refus n''envoie rien'
);
select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000005' $$,
  'D2 : « Sans rappel » éteint aussi le mot de la veille'
);
select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000006' $$,
  'D3 : le mot n''existe qu''en notification — qui a choisi l''email ne le reçoit pas'
);
select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000007' $$,
  'D3 : sans appareil joignable, le mot cesse sans bruit — ni notification, ni email'
);
select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000008' $$,
  'D1 : en régime espacé, le seul message du mois reste la question — pas de mot la veille'
);
select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000009' $$,
  'le mot ne part que la veille des jours choisis'
);
select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000010' $$,
  'D5 : une action de voyage n''a pas de jours, donc pas de veille'
);
select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000011' $$,
  'D4 : le jour de la onzième semaine, plus rien ne part'
);
select isnt_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000012' $$,
  'D4 : le dernier soir de la dixième semaine, le mot part encore'
);
select is_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000013' $$,
  'D4 : une reconduction ne rouvre pas une fenêtre close'
);
select isnt_empty(
  $$ select id from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000002' $$,
  'D4 : mais la fenêtre qui court se poursuit dans la saison suivante — elle se lit sur le cycle d''origine'
);

-- Une action **nouvelle** choisie dans la saison nouvelle ouvre une fenêtre, elle.
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4200000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select public.commit_plan_action(
  (select pa.id from public.plan_actions pa join public.action_templates t on t.id = pa.action_template_id
   where pa.plan_cycle_id = current_setting('test.cycle_b2')::uuid and t.poste = 'commute'
     and t.action_text <> 'Faire un trajet sur cinq à vélo'
   order by pa.rank limit 1),
  array[1,2,3,4,5,6,7]::smallint[], null, true);
select set_config('role', 'postgres', true);

select is(
  (select premier_engagement_le from public.plan_cycles where id = current_setting('test.cycle_b2')::uuid),
  now(),
  'D4 : une action nouvelle choisie dans une saison nouvelle ouvre une fenêtre'
);

-- ── 7. Ce que l'écran lit, et l'export ──────────────────────────────────────────────────

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4200000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select results_eq(
  $$ select action_de_trajet, dernier_soir from public.fenetre_du_mot_de_la_veille() $$,
  $$ values (true, ((now() - interval '20 days') at time zone 'Europe/Paris')::date + 69) $$,
  'l''écran lit la même fenêtre que l''envoi : une action de trajet, et son dernier soir'
);

select is(
  (select count(*)::int from jsonb_array_elements(public.export_my_data() -> 'rappels_envoyes') e
   where e ->> 'genre' = 'veille' and (e ->> 'jour_vise')::date = current_date + 1),
  1,
  'l''export RGPD porte le mot de la veille — il joignait les points et le perdait'
);

select is(
  public.export_my_data() #>> '{compte,mot_de_la_veille}',
  'oui',
  'l''export porte la réponse à l''opt-in'
);

select set_config('request.jwt.claims',
  json_build_object('sub', 'c4200000-0000-0000-0000-000000000010', 'role', 'authenticated')::text, true);

select results_eq(
  $$ select action_de_trajet, dernier_soir from public.fenetre_du_mot_de_la_veille() $$,
  $$ values (false, null::date) $$,
  'sans action de trajet engagée, l''écran n''a rien à proposer'
);

select set_config('role', 'postgres', true);

-- ── 8. Les deux passages d'envoi ne se croisent pas ─────────────────────────────────────
-- Les jetons sont coupés d'abord : une ligne que la passe prend passe par le repli, sans appel
-- réseau, et c'est ce repli qui se lit. Les mots mis en file ci-dessus sont reportés d'un jour :
-- selon l'heure du test, ils seraient dus, et compteraient.

update public.push_tokens set disabled_at = now(), disabled_reason = 'pgtap'
where user_id::text like 'c4200000-0000-0000-0000-0000000000%' and disabled_at is null;
update public.notification_outbox set send_after = now() + interval '1 day'
where genre = 'veille' and user_id::text like 'c4200000-0000-0000-0000-0000000000%';

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-veille-' || right(u::text, 2) || '@test.local', 'x', now(), now(), now(), false
from unnest(array[
  'c4200000-0000-0000-0000-000000000020'::uuid,  -- un mot dû
  'c4200000-0000-0000-0000-000000000021',        -- un mot dont le jour est arrivé
  'c4200000-0000-0000-0000-000000000022',        -- un mot dont la personne a coupé l'opt-in
  'c4200000-0000-0000-0000-000000000023',        -- un point dû, pour le passage du matin
  'c4200000-0000-0000-0000-000000000024'         -- un point dû, que le passage du soir doit ignorer
]) u;
update public.profiles set reminder_channel = 'push', mot_de_la_veille = 'oui'
where id::text like 'c4200000-0000-0000-0000-00000000002%';

insert into public.notification_outbox (user_id, genre, jour_vise, channel, subject, body, push_body, send_after)
values
  ('c4200000-0000-0000-0000-000000000020', 'veille', current_setting('test.paris')::date + 1, 'push', 'Pour demain',
   'Demain, tu as prévu de faire ton trajet à vélo.', 'Demain, tu as prévu de faire ton trajet à vélo.', now() - interval '1 minute'),
  ('c4200000-0000-0000-0000-000000000021', 'veille', current_setting('test.paris')::date, 'push', 'Pour demain',
   'Demain, tu as prévu de faire ton trajet à vélo.', 'Demain, tu as prévu de faire ton trajet à vélo.', now() - interval '1 day');

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select u, 'commute', current_date - 7, 'Semaine', 'Trajet domicile-travail', 'commute', 'pending'
from unnest(array['c4200000-0000-0000-0000-000000000023'::uuid, 'c4200000-0000-0000-0000-000000000024']) u;

insert into public.notification_outbox (user_id, checkin_id, channel, subject, body, push_body, send_after)
select c.user_id, c.id, 'push', 'Ton point de la semaine', 'Bonjour.', 'La semaine dernière, as-tu changé ?', now() - interval '1 minute'
from public.engagement_checkins c where c.user_id = 'c4200000-0000-0000-0000-000000000023';

-- Le passage du matin.
select public.send_pending_reminders();

select results_eq(
  $$ select status, attempts::int from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000020' $$,
  $$ values ('pending'::text, 0) $$,
  'le passage du matin ne prend pas le mot de la veille : « Demain, … » lu le jour même serait faux'
);
select is(
  (select status from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000021'),
  'cancelled',
  'un mot dont le jour est arrivé devient caduc — sans quoi il resterait en attente pour toujours, la purge ne prenant jamais une ligne en attente'
);
select isnt(
  (select status from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000023'),
  'pending',
  'le passage du matin traite bien les points (témoin : l''extraction n''a rien perdu)'
);
select results_eq(
  $$ select canal, genre from public.reminder_send_runs where ran_at = now() order by canal $$,
  $$ values ('email'::text, 'point'::text), ('push'::text, 'point'::text) $$,
  'le passage du matin laisse ses deux lignes de journal, genre point'
);

-- Le passage du soir. Un point dû de plus, et un opt-in coupé après la mise en file.
insert into public.notification_outbox (user_id, genre, jour_vise, channel, subject, body, push_body, send_after)
values ('c4200000-0000-0000-0000-000000000022', 'veille', current_setting('test.paris')::date + 1, 'push', 'Pour demain',
        'Demain, tu as prévu de faire ton trajet à vélo.', 'Demain, tu as prévu de faire ton trajet à vélo.', now() - interval '1 minute');
update public.profiles set mot_de_la_veille = 'refuse' where id = 'c4200000-0000-0000-0000-000000000022';

insert into public.notification_outbox (user_id, checkin_id, channel, subject, body, push_body, send_after)
select c.user_id, c.id, 'push', 'Ton point de la semaine', 'Bonjour.', 'La semaine dernière, as-tu changé ?', now() - interval '1 minute'
from public.engagement_checkins c where c.user_id = 'c4200000-0000-0000-0000-000000000024';

select set_config('test.mot_du',
  (select id::text from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000020'), true);

select public.envoyer_les_notifications('veille');

select results_eq(
  $$ select status, channel, recipient_email is null, last_error like '%aucun repli possible%'
     from public.notification_outbox where id = current_setting('test.mot_du')::uuid $$,
  $$ values ('failed'::text, 'push'::text, true, true) $$,
  'D3 : un mot sans appareil joignable cesse — il ne se replie jamais sur l''email'
);
select is(
  (select status from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000022'),
  'cancelled',
  'un opt-in coupé entre la mise en file et l''envoi annule le mot en attente'
);
select results_eq(
  $$ select status, channel from public.notification_outbox where user_id = 'c4200000-0000-0000-0000-000000000024' $$,
  $$ values ('pending'::text, 'push'::text) $$,
  'le passage du soir ne prend pas les points'
);
select results_eq(
  $$ select canal, status, traites from public.reminder_send_runs where ran_at = now() and genre = 'veille' $$,
  $$ values ('push'::text, 'success'::text, 1) $$,
  'le passage du soir écrit sa propre ligne de journal, genre veille'
);

-- Un passage où rien n'attend écrit quand même sa ligne : zéro ligne veut dire « pas de passage ».
select public.envoyer_les_notifications('veille');
select is(
  (select count(*)::int from public.reminder_send_runs where ran_at = now() and genre = 'veille'),
  2,
  'un passage du soir sans rien à envoyer laisse sa ligne'
);

-- La vue des rappels bloqués joignait les points : un mot en échec y était invisible.
select is(
  (select genre from analytics.rappels_bloques where id = current_setting('test.mot_du')::uuid),
  'veille',
  'analytics.rappels_bloques montre le mot de la veille en échec'
);

select is(
  (select sum(nombre)::int from analytics.rappels_par_jour where genre = 'veille'
   and jour = (select date_trunc('day', coalesce(sent_at, created_at))::date
               from public.notification_outbox where id = current_setting('test.mot_du')::uuid)),
  (select count(*)::int from public.notification_outbox o where o.genre = 'veille'
   and date_trunc('day', coalesce(o.sent_at, o.created_at))::date
       = (select date_trunc('day', coalesce(sent_at, created_at))::date
          from public.notification_outbox where id = current_setting('test.mot_du')::uuid)),
  'analytics.rappels_par_jour distingue le mot de la veille des points'
);

-- ── 9. Les gardes de la table ───────────────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.notification_outbox (user_id, genre, jour_vise, channel, recipient_email, subject, body)
     values ('c4200000-0000-0000-0000-000000000020', 'veille', current_date + 9, 'email', 'x@test.local', 'Pour demain', 'x') $$,
  '23514', null,
  'D3 : un mot de la veille ne peut pas être un email'
);
select throws_ok(
  $$ insert into public.notification_outbox (user_id, genre, jour_vise, channel, recipient_email, subject, body)
     values ('c4200000-0000-0000-0000-000000000020', 'veille', current_date + 9, 'push', 'x@test.local', 'Pour demain', 'x') $$,
  '23514', null,
  'D3 : ni porter une adresse — c''est ce qui interdit le repli sur l''email'
);
select throws_ok(
  $$ insert into public.notification_outbox (user_id, channel, subject, body)
     values ('c4200000-0000-0000-0000-000000000020', 'push', 'Ton point', 'x') $$,
  '23514', null,
  'un rappel de point sans point reste impossible : le NULL est réservé au mot de la veille'
);
select throws_ok(
  $$ insert into public.notification_outbox (user_id, genre, jour_vise, channel, subject, body)
     values ('c4200000-0000-0000-0000-000000000001', 'veille', current_date + 1, 'push', 'Pour demain', 'x') $$,
  '23505', null,
  'la clé d''idempotence : un mot par personne et par jour visé'
);

select throws_ok(
  $$ update public.profiles set mot_de_la_veille = 'peut_etre' where id = 'c4200000-0000-0000-0000-000000000020' $$,
  '23514', null,
  'D2 : trois états, pas un de plus'
);

-- ── 10. L'opt-in se règle depuis l'app, et un refus ne se défait pas en « jamais proposé » ─

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4200000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);

select lives_ok(
  $$ update public.profiles set mot_de_la_veille = 'refuse' where id = 'c4200000-0000-0000-0000-000000000003' $$,
  'la personne répond depuis l''app, comme pour son canal'
);
select lives_ok(
  $$ update public.profiles set mot_de_la_veille = 'oui' where id = 'c4200000-0000-0000-0000-000000000003' $$,
  'et change d''avis dans « Toi », dans les deux sens'
);
select throws_ok(
  $$ update public.profiles set mot_de_la_veille = 'jamais_propose' where id = 'c4200000-0000-0000-0000-000000000003' $$,
  '23514',
  'Une réponse au mot de la veille ne se retire pas : elle passe de oui à refuse, ou l''inverse.',
  'D2 : une réponse ne redevient jamais « jamais proposé » — c''est ce qui garantit qu''un refus n''est pas reproposé'
);

-- La RLS de `profiles` borne l'écriture à la personne : l'opt-in d'un autre ne bouge pas.
update public.profiles set mot_de_la_veille = 'refuse' where id = 'c4200000-0000-0000-0000-000000000012';

select set_config('role', 'postgres', true);

select is(
  (select mot_de_la_veille from public.profiles where id = 'c4200000-0000-0000-0000-000000000012'),
  'oui',
  'l''opt-in d''un tiers ne s''écrit pas'
);

-- ── 11. Les privilèges, la procédure et le cron ─────────────────────────────────────────

select ok(
  has_function_privilege('authenticated', 'public.fenetre_du_mot_de_la_veille()', 'execute')
    and not has_function_privilege('anon', 'public.fenetre_du_mot_de_la_veille()', 'execute'),
  'l''écran lit sa fenêtre, une session anonyme comprise ; anon non'
);
select ok(
  not has_function_privilege('authenticated', 'public.engagement_de_la_veille(uuid, date)', 'execute')
    and not has_function_privilege('anon', 'public.engagement_de_la_veille(uuid, date)', 'execute'),
  'engagement_de_la_veille reste serveur : elle lit l''engagement de n''importe quel compte'
);
select ok(
  not has_function_privilege('authenticated', 'public.mettre_en_file_les_mots_de_la_veille(date)', 'execute')
    and not has_function_privilege('anon', 'public.mettre_en_file_les_mots_de_la_veille(date)', 'execute'),
  'la mise en file du soir reste serveur'
);
select ok(
  not has_function_privilege('authenticated', 'public.envoyer_les_notifications(text)', 'execute')
    and not has_function_privilege('anon', 'public.envoyer_les_notifications(text)', 'execute'),
  'l''envoi push reste serveur'
);
select ok(
  not has_function_privilege('authenticated', 'public.garder_la_reponse_au_mot_de_la_veille()', 'execute'),
  'la fonction du trigger n''est pas appelable'
);

-- Ni `security definer` ni `set search_path` : les deux rendent le contexte atomique et font échouer
-- le `commit` entre les passes (`SUPABASE.md` §1.6).
select results_eq(
  $$ select p.prosecdef, p.proconfig is null, has_function_privilege('authenticated', p.oid, 'execute')
     from pg_proc p where p.oid = 'public.envoyer_les_mots_de_la_veille'::regproc $$,
  $$ values (false, true, false) $$,
  'la procédure du soir committe entre ses passes, et personne ne l''appelle'
);

select results_eq(
  $$ select schedule, command from cron.job where jobname = 'mot-de-la-veille' $$,
  $$ values ('30 16,17 * * *'::text, 'call public.envoyer_les_mots_de_la_veille()'::text) $$,
  'deux passages du soir, 16 h 30 et 17 h 30 UTC : l''un tombe à 18 h 30 à Paris en toute saison'
);

select ok(
  (select to_regprocedure('public.envoyer_les_notifications(text)') is not null)
    and position('envoyer_les_notifications(''point'')' in
      (select prosrc from pg_proc where oid = 'public.send_pending_reminders()'::regprocedure)) > 0,
  'le passage du matin envoie ses notifications par la fonction partagée, genre point'
);

-- Deux canaux Android (arbitrage du 27/09/2026). La jumelle est `CANAUX_ANDROID`
-- (`src/types/rappels.ts`), épinglée sur les mêmes valeurs par `rappels.test.ts` : un identifiant
-- que l'app n'a pas créé ne fait pas échouer l'envoi, il fait tomber la notification ailleurs.
select results_eq(
  $$ select public.canal_android('point'), public.canal_android('veille') $$,
  $$ values ('rappels'::text, 'mot_de_la_veille'::text) $$,
  'un canal Android par genre : « Points de suivi » pour la question, « Mot de la veille » pour le mot'
);

-- Aucun envoi n'est joué ici (aucun appel HTTP), donc le message se lit dans le corps installé.
select ok(
  position('canal_android(p_genre)' in
    (select prosrc from pg_proc where oid = 'public.envoyer_les_notifications(text)'::regprocedure)) > 0
  and position('''channelId'', ''rappels''' in
    (select prosrc from pg_proc where oid = 'public.envoyer_les_notifications(text)'::regprocedure)) = 0,
  'le message nomme le canal de son genre, jamais celui des points écrit en dur'
);


-- ── 12. Retirer son seul bilan referme la fenêtre (intégration avec C4.7, 28/09/2026) ─────
-- Le cycle reste après le retrait du seul bilan, et la date des dix semaines vit sur lui. Sans la
-- remise à vide, le premier trajet choisi après le bilan suivant de la même saison ne la reposerait
-- pas (`commit_plan_action` ne l'écrit que vide), et le mot accompagnerait un nouveau départ sur une
-- fenêtre à moitié consommée. Éprouvé le 28/09/2026 : sans l'instruction ajoutée à
-- `retirer_le_bilan`, cette assertion tombe, et elle seule sur toute la suite (tableau d'en-tête).

select set_config('role', 'postgres', true);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous)
values ('c4200000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'pgtap-veille-15@test.local', 'x', now(), now(), now(), false);

insert into public.assessments (id, user_id, status)
values ('c4200000-0000-0000-0000-0000000001a5', 'c4200000-0000-0000-0000-000000000015', 'completed');

insert into public.plan_cycles (user_id, cadence_type, period_label, period_start, period_end, trip_label, poste, target_reduction_pct, premier_engagement_le)
values ('c4200000-0000-0000-0000-000000000015', 'season', 'Saison de test', current_date - 30, current_date + 60,
        'Trajet domicile-travail (Voiture)', 'commute', 20, now() - interval '5 days');

insert into public.plan_actions (plan_cycle_id, action_template_id, rank, first_step, committed_at, intention_days)
select pc.id, t.id, 1, t.first_step, now() - interval '5 days', array[2,4]::smallint[]
from public.plan_cycles pc
join public.action_templates t on t.action_text = 'Faire un trajet sur cinq à vélo'
where pc.user_id = 'c4200000-0000-0000-0000-000000000015';

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', 'c4200000-0000-0000-0000-000000000015', 'role', 'authenticated')::text, true);
select public.retirer_le_bilan('c4200000-0000-0000-0000-0000000001a5');
select set_config('role', 'postgres', true);

select ok(
  (select premier_engagement_le is null from public.plan_cycles where user_id = 'c4200000-0000-0000-0000-000000000015'),
  'retirer son seul bilan remet la fenêtre à vide : le bilan suivant repart avec la sienne'
);

-- ── 13. Le cron attend l'heure du mot (contre-lecture du 28/09/2026) ─────────────────────
-- L'hiver, le premier passage (16 h 30 UTC) tombe à 17 h 30 à Paris : ce qu'il mettait en file
-- attendait une heure, et partait sur un engagement abandonné entre-temps. Une transaction pgTAP ne
-- choisit pas son heure : c'est la fonction extraite qu'on éprouve, sur des instants fixés, et
-- l'appel que la mise en file en fait.

select results_eq(
  $$ select public.le_soir_du_mot_est_venu(((current_date + time '18:29') at time zone 'Europe/Paris')),
            public.le_soir_du_mot_est_venu(((current_date + time '18:30') at time zone 'Europe/Paris')) $$,
  $$ values (false, true) $$,
  'le soir du mot commence à 18 h 30 à Paris, l''heure même du send_after (assertion 16)'
);
select results_eq(
  $$ select public.le_soir_du_mot_est_venu('2026-12-15 16:30:00+00'),
            public.le_soir_du_mot_est_venu('2026-12-15 17:30:00+00'),
            public.le_soir_du_mot_est_venu('2026-07-15 16:30:00+00') $$,
  $$ values (false, true, true) $$,
  'des deux passages du cron, l''hiver ne met en file qu''au second, l''été dès le premier'
);
select ok(
  position('le_soir_du_mot_est_venu(now())' in
    (select prosrc from pg_proc where oid = 'public.mettre_en_file_les_mots_de_la_veille(date)'::regprocedure)) > 0,
  'sans jour imposé, la mise en file attend l''heure du mot : il part dans la seconde où il est écrit'
);
-- Sa valeur dépend de l'heure du test : ce qu'on garde ici, c'est que la branche du cron s'exécute.
select lives_ok(
  $$ select public.mettre_en_file_les_mots_de_la_veille() $$,
  'appelée comme le cron, sans jour imposé, la mise en file s''exécute'
);

select * from finish();
rollback;
