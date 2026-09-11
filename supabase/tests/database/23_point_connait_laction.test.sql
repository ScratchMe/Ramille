-- Tests pgTAP de la question qui connaît l'action engagée — C2.1, migration
-- 20260912190000_point_connait_laction.sql. Arbitrage D1, constats A8-10, A13-2, A4-3, A12-10.
--
-- Ce que ce fichier défend : **le « si-alors » de l'engagement se referme, et il reste fermé.** La
-- personne s'engage sur « Faire un trajet sur cinq à vélo, le mardi et le jeudi » ; la question du
-- lundi suivant doit nommer cette action et ces jours, et **ne plus bouger** — même si elle change
-- d'avis le mercredi. La seconde moitié est la plus facile à casser : une question recomposée à
-- l'affichage serait juste le lundi et fausse le jeudi, sans que rien ne le signale.
--
-- ## La paire, et ce que chaque moitié garde
--
-- `public.checkin_question` est écrite deux fois — ici, et `composerQuestionDuPoint` dans
-- `src/types/checkin.ts` — parce que le rappel part sans le client. Les deux moitiés sont épinglées
-- sur **la même table de cas** (§3 de ce fichier, `checkin.test.ts` là-bas), et les chaînes
-- attendues sont écrites à l'identique des deux côtés : c'est ce qui rend la dérive visible.
--
-- C'est aussi pourquoi la phrase de maintien porte une apostrophe **typographique** depuis C2.1 :
-- le SQL écrivait « s'est-il » et le client « s’est-il », invisible à l'œil mais suffisant pour
-- qu'aucune comparaison caractère par caractère ne soit possible. Les gabarits, eux, gardent
-- l'apostrophe droite du référentiel : ils sont lus de `action_templates` par les deux côtés, donc
-- aucune divergence n'y est possible.
--
-- **Les gabarits se désignent par `action_text`, jamais par leur identifiant.** `action_templates.id`
-- vaut `gen_random_uuid()` : il diffère sur chaque base construite depuis `supabase/migrations/`, donc
-- un uuid relevé sur le projet distant ne s'apparie à rien en CI — c'est ce qui a fait tomber la CI de
-- la vague 5, sur le contrôle de la migration. Les douze libellés du référentiel sont distincts et
-- insérés littéralement par `20260905130000` : ils en sont la clé naturelle.
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

-- Les deux comptes sont créés **avant la première assertion**, et pas seulement avant la §4 : le
-- `throws_ok` ci-dessous doit échouer sur la **contrainte de genre** et non sur une clé étrangère
-- vers un utilisateur inexistant. Les deux lèvent, mais pas le même SQLSTATE — et un test qui passe
-- pour la mauvaise raison ne garde rien.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  ('c2300000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c21-engage@test.local', 'x', now(), now(), now(), false),
  ('c2300000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c21-sans@test.local', 'x', now(), now(), now(), false);

update public.profiles set reminder_channel = 'email' where id::text like 'c2300000%';


-- ── 1. Les gardes de structure ──────────────────────────────────────────────────────────

select has_column('public', 'action_templates', 'question_template',
  'le référentiel d''actions porte le gabarit de question');
select has_column('public', 'engagement_checkins', 'committed_question',
  'le point porte la question figée');
select has_column('public', 'engagement_checkins', 'committed_action_text',
  'et le libellé de l''action engagée au moment de la génération');
select has_column('public', 'engagement_checkins', 'committed_intention_days',
  'et ses jours d''intention');

-- **Aucun gabarit sans question de question** : sans cette garde, un gabarit ajouté par C3.8
-- retomberait sur la question générique en silence, et le chantier entier serait annulé pour lui.
-- Même idiome que « tout mode a une source » (fichier 07) : un balayage de la table entière, qui
-- attrape une ligne que personne n'a pensé à nommer.
select is_empty(
  $$ select id from public.action_templates where question_template is null $$,
  'Aucun gabarit d''action n''est sans question_template — un gabarit muet retombe sur le générique'
);

-- `changement` n'existe plus : la migration l'a renommé `generique`, et la contrainte le refuse.
select is_empty(
  $$ select id from public.engagement_checkins where question_kind = 'changement' $$,
  'Plus aucun point ne porte l''ancien genre « changement »'
);

select throws_ok(
  $$ insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, question_kind)
     values ('c2300000-0000-0000-0000-000000000011', 'commute', current_date, 'S', 'T', 'changement') $$,
  '23514',
  null,
  'La contrainte refuse « changement » : les quatre genres sont fermés'
);

-- ── 2. Les jours nommés ─────────────────────────────────────────────────────────────────
-- Jumelle de `joursDeLaQuestion`. **« ou » et non « et »** : la question demande si le geste a eu
-- lieu *l'un* de ces jours. `formatIntentionDays`, côté client, dit « le mardi et le jeudi » parce
-- qu'elle rappelle un engagement — les deux formes coexistent et ne doivent pas être fusionnées.

select is(public.jours_francais(array[2, 4]::smallint[]), 'Mardi ou jeudi',
  'Deux jours se joignent par « ou », et seul le premier porte la majuscule');
select is(public.jours_francais(array[1]::smallint[]), 'Lundi',
  'Un seul jour');
select is(public.jours_francais(array[4, 2, 2]::smallint[]), 'Mardi ou jeudi',
  'Les jours sont triés et dédoublonnés');
select is(public.jours_francais(array[1,2,3,4,5,6,7]::smallint[]), 'Tous les jours',
  'Sept jours se disent « Tous les jours » — les énumérer tiendrait sur trois lignes');
select is(public.jours_francais(null), null,
  'Rien à nommer rend null, jamais une chaîne vide');

-- ── 3. La table de cas de la composition ────────────────────────────────────────────────
-- **Les sept mêmes cas que `checkin.test.ts`, aux mêmes chaînes.** Toucher l'une des deux moitiés
-- sans l'autre fait tomber ce bloc ou son jumeau.

select is(
  public.checkin_question('commute', 'engagement', 'commute', 'voiture_thermique', '2026-09-07',
                          '{jours}, as-tu fait ce trajet à vélo ?', array[2, 4]::smallint[]),
  'Mardi ou jeudi, as-tu fait ce trajet à vélo ?',
  'engagement : le gabarit, avec les jours nommés'
);

select is(
  public.checkin_question('extras', 'occasion', 'travel', null, '2026-09-01',
                          'En {mois}, as-tu eu un déplacement où tu as choisi autre chose que l''avion ?', null),
  'En septembre, as-tu eu un déplacement où tu as choisi autre chose que l''avion ?',
  'occasion : le gabarit, avec le mois écoulé'
);

-- **Le maintien gagne**, gabarit présent ou non. L'ordre du `case` est la priorité, et un ordre
-- implicite est ce qui devient faux sans qu'on le voie (C2.5 : poser « as-tu changé de mode ? » à
-- quelqu'un qui va déjà au travail à vélo n'a qu'une réponse honnête).
select is(
  public.checkin_question('commute', 'maintien', 'commute', 'velo', '2026-09-07',
                          '{jours}, as-tu fait ce trajet à vélo ?', array[2, 4]::smallint[]),
  'La semaine dernière, ton trajet s’est-il fait à vélo ?',
  'maintien gagne sur engagement, et porte l''apostrophe typographique du client'
);

select is(
  public.checkin_question('commute', 'engagement', 'commute', 'voiture_thermique', '2026-09-07', null, null),
  'La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ?',
  'un genre d''engagement sans gabarit retombe sur le générique, jamais sur une phrase à trous'
);

select is(
  public.checkin_question('commute', 'engagement', 'commute', 'voiture_thermique', '2026-09-07',
                          '{jours}, as-tu fait ce trajet à vélo ?', null),
  'Cette semaine, as-tu fait ce trajet à vélo ?',
  'un gabarit sans jours figés ne laisse pas la marque {jours} à l''écran'
);

select is(
  public.checkin_question('commute', 'generique', 'commute', 'voiture_thermique', '2026-09-07', null, null),
  'La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ?',
  'generique : le poste par sa forme insérable, jamais par le libellé snapshoté'
);

select is(
  public.checkin_question('extras', 'generique', 'leisure', null, '2026-09-01', null, null),
  'En septembre, as-tu changé de mode de transport pour tes sorties du week-end ?',
  'generique mensuel : le mois écoulé est nommé'
);

-- ── 4. De bout en bout : ce que le générateur fige ──────────────────────────────────────

insert into public.assessments (id, user_id, status) values
  ('c2300000-0000-0000-0000-0000000000a1', 'c2300000-0000-0000-0000-000000000011', 'completed'),
  ('c2300000-0000-0000-0000-0000000000a2', 'c2300000-0000-0000-0000-000000000012', 'completed');

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency, commute_mode, commute_distance_km, commute_days_per_week, commute_car_engine) values
  ('c2300000-0000-0000-0000-0000000000a1', true, 'weekly', 'voiture', 20, 5, 'thermique'),
  ('c2300000-0000-0000-0000-0000000000a2', true, 'weekly', 'voiture', 20, 5, 'thermique');

insert into public.assessment_results (assessment_id, commute_co2_kg_year, leisure_co2_kg_year, travel_co2_kg_year, total_co2_kg_year, dominant_poste, dominant_poste_co2_kg_year, dominant_poste_label, commute_poste_label, commute_poste_mode) values
  ('c2300000-0000-0000-0000-0000000000a1', 1400, 100, 0, 1500, 'commute', 1400, 'Trajet domicile-travail (Voiture thermique)', 'Trajet domicile-travail (Voiture thermique)', 'voiture_thermique'),
  ('c2300000-0000-0000-0000-0000000000a2', 1400, 100, 0, 1500, 'commute', 1400, 'Trajet domicile-travail (Voiture thermique)', 'Trajet domicile-travail (Voiture thermique)', 'voiture_thermique');

-- Un cycle qui **couvre la semaine interrogée**, et non le cycle courant : le point du lundi porte
-- sur la semaine écoulée, et au changement de saison cette semaine-là peut appartenir au cycle
-- précédent. Demander « as-tu tenu ton engagement » à propos d'une semaine où un autre engagement
-- courait serait une question fausse.
insert into public.plan_cycles (id, user_id, cadence_type, period_start, period_end, period_label, trip_label, target_reduction_pct)
values ('c2300000-0000-0000-0000-0000000000c1', 'c2300000-0000-0000-0000-000000000011', 'season',
        current_date - 40, current_date + 40, 'Automne 2026', 'Trajet domicile-travail', 10);

insert into public.plan_actions (id, plan_cycle_id, action_template_id, committed_at, intention_days, rank)
values ('c2300000-0000-0000-0000-0000000000d1', 'c2300000-0000-0000-0000-0000000000c1',
        (select id from public.action_templates where action_text = 'Faire un trajet sur cinq à vélo'),
        now(), array[2, 4]::smallint[], 1);

select public.generate_commute_checkins();

select is(
  (select question_kind from public.engagement_checkins
   where user_id = 'c2300000-0000-0000-0000-000000000011'),
  'engagement',
  'Une action engagée sur le poste interrogé donne le genre « engagement »'
);

select is(
  (select committed_question from public.engagement_checkins
   where user_id = 'c2300000-0000-0000-0000-000000000011'),
  'Mardi ou jeudi, as-tu fait ce trajet à vélo ?',
  'La question nomme l''action et les jours choisis — le « si-alors » refermé'
);

select is(
  (select committed_action_text from public.engagement_checkins
   where user_id = 'c2300000-0000-0000-0000-000000000011'),
  'Faire un trajet sur cinq à vélo',
  'Le libellé de l''action est figé, comme trip_label'
);

select is(
  (select question_kind from public.engagement_checkins
   where user_id = 'c2300000-0000-0000-0000-000000000012'),
  'generique',
  'Sans action engagée, le genre reste générique'
);

-- **Le sujet en tête de la notification** (A12-21) : Android ne montre que le titre et le début du
-- corps, et « La semaine dernière, as-tu changé… » ne dit pas de quoi on parle avant d'avoir
-- déplié. Écart assumé au canvas, qui pronominalise (« l'as-tu fait à vélo ? ») : une seconde
-- phrase écrite à la main par gabarit serait une seconde copie de la question, donc la divergence
-- que C2.5 a retirée. Le poste est posé en étiquette, la question suit mot pour mot.
select is(
  (select push_body from public.notification_outbox
   where user_id = 'c2300000-0000-0000-0000-000000000011'),
  'Ton trajet domicile-travail · Mardi ou jeudi, as-tu fait ce trajet à vélo ?',
  'La notification met le poste en étiquette, puis la question telle quelle'
);

-- ── 5. Ce qui porte le chantier : la question ne bouge plus ─────────────────────────────
-- On change d'action **après** la génération. C'est le geste le plus encouragé du produit après
-- l'engagement lui-même (« Choisir une autre action »), et il ne doit pas réécrire une question
-- déjà posée et déjà partie par email.

update public.plan_actions
set action_template_id = (select id from public.action_templates
                          where action_text = 'Faire un trajet sur cinq à pied'),
    intention_days = array[1]::smallint[]
where id = 'c2300000-0000-0000-0000-0000000000d1';

select public.generate_commute_checkins();

select is(
  (select committed_question from public.engagement_checkins
   where user_id = 'c2300000-0000-0000-0000-000000000011'),
  'Mardi ou jeudi, as-tu fait ce trajet à vélo ?',
  'Changer d''action après la génération ne réécrit pas la question déjà posée'
);

select is(
  (select committed_action_text from public.engagement_checkins
   where user_id = 'c2300000-0000-0000-0000-000000000011'),
  'Faire un trajet sur cinq à vélo',
  'Ni le libellé de l''action qu''elle nomme'
);

-- ── 6. Verrouillage ─────────────────────────────────────────────────────────────────────
-- La composition ne sert qu'aux générateurs et à l'envoi, tous `security definer` : aucun appel
-- client, donc aucun privilège. `from public` d'abord, sans quoi le `revoke` ne révoque rien.

select ok(
  not has_function_privilege('authenticated',
    'public.checkin_question(text, text, text, text, date, text, smallint[])', 'execute')
    and not has_function_privilege('anon',
      'public.checkin_question(text, text, text, text, date, text, smallint[])', 'execute')
    and not has_function_privilege('authenticated', 'public.jours_francais(smallint[])', 'execute'),
  'La composition de la question n''est pas appelable depuis le client'
);

select * from finish();
rollback;
