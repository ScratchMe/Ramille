-- Tests pgTAP de la décroissance des rappels — C2.9, migration
-- 20260912170000_rappels_qui_s_espacent.sql. Arbitrage D8, constats C-4, A9-7, A9-16, A9-21.
--
-- Ce que ce fichier défend, et qui ne se voit dans aucun chiffre : **un compte qui ne répond plus
-- cesse de recevoir, sans que son point cesse d'être généré.** Les deux moitiés comptent autant.
-- Supprimer la génération ferait disparaître la question pour qui revient après six mois, et le
-- « Ne pas faire » du chantier l'exclut : c'est pourquoi l'assertion « le point reste en attente »
-- est ici, au milieu des assertions d'envoi.
--
-- ## Quatre choses à savoir avant de « corriger » un test de ce fichier
--
-- **1. Les assertions sont toutes bornées à leur propre utilisateur**, jamais à la table entière —
-- contrairement au fichier 09, qui lit `notification_outbox` en entier et ne passe donc que sur une
-- stack neuve. C'est délibéré : c'est ce qui rend ce fichier rejouable sur le projet distant, seule
-- façon de valider du pgTAP sans Docker. Remplacer une borne par un `count(*)` global réintroduirait
-- cette dépendance à une base vierge.
--
-- **2. Les périodes successives d'un compte espacé sont mises en file par des appels successifs, et
-- ce n'est pas de la paresse.** Le plafond « au plus un message par mois » est un `not exists` sur
-- `notification_outbox` : deux points du même compte insérés par **une seule** exécution de
-- l'`insert` ne se verraient pas l'un l'autre, et passeraient tous les deux. Le cas n'existe pas en
-- production — le générateur clôt la période précédente *avant* d'insérer la nouvelle, donc un
-- compte n'a jamais deux points en attente pour la même boucle, et les deux boucles sont générées
-- par deux crons distincts (`generate_commute_checkins` et `generate_extras_checkins`), qui appellent
-- chacun la mise en file. Le test reproduit cette séquence au lieu de fabriquer un cas impossible.
-- Les §3, §4 et §8 mettent bien plusieurs points en file d'un seul appel — la mise en file ne
-- filtre pas la boucle —, mais de comptes différents ou d'un compte en régime normal, que le
-- plafond ne concerne pas.
--
-- **3. L'en-tête `List-Unsubscribe` est vérifié sur la source, et c'est tout ce qu'un test peut
-- faire ici.** La branche email de `send_pending_reminders` n'évalue son `jsonb_build_object` que
-- lorsque les secrets Vault existent : en CI ils n'existent pas (le passage sort en `skipped`), et sur
-- le projet distant ils existent, donc rejouer cette branche ferait **partir un vrai email**. Une
-- faute dans l'expression substituée ne tomberait donc dans aucune suite. Elle a été éprouvée
-- autrement, le 11/09/2026 : la même expression évaluée à la main sur une vraie ligne de la boîte
-- d'envoi, sur le distant, dans une transaction annulée — `rec.unsubscribe_token` se résout et
-- l'en-tête rend bien `<https://www.ramille.fr/rappels/stop?jeton=…>`. Les deux assertions de la
-- §6 gardent ce qui reste gardable : l'en-tête est là, et son pendant en POST n'y est pas.
--
-- **4. Ce fichier ne peut pas prouver que `regime_de_rappel` a besoin d'être `security definer`.**
-- pgTAP tourne sous le propriétaire, qui voit `usage_events` sans policy de lecture. Le piège est
-- réel (v1-08 §5.2 : un compteur qui ne compte rien ne déclenche jamais) mais il ne se reproduit que
-- depuis `authenticated`, et cette fonction n'y est pas accessible — d'où l'assertion sur le
-- privilège, qui est la seule garde que ce niveau permet.
begin;
create extension if not exists pgtap with schema extensions;

select plan(37);

-- ── 1. Les gardes de structure ──────────────────────────────────────────────────────────

select has_column('public', 'notification_outbox', 'unsubscribe_token',
  'la boîte d''envoi porte le jeton de désinscription de ce message');
select has_column('public', 'notification_outbox', 'unsubscribe_used_at',
  'et la marque d''usage, puisque le jeton ne sert qu''une fois');

-- L'unicité n'est pas décorative : le jeton *est* l'autorisation, et `desinscrire_des_rappels` le
-- cherche sans autre critère.
select ok(
  (select indisunique from pg_index
   where indexrelid = 'public.notification_outbox_unsubscribe_token'::regclass),
  'le jeton est unique — il porte à lui seul l''autorisation de couper les rappels'
);

-- ── 2. Les seuils de la décroissance ────────────────────────────────────────────────────
-- Deux comptes suffisent : l'un monte les trois régimes, l'autre éprouve la remise à zéro par une
-- réponse. Appeler `regime_de_rappel` directement est ce qui rend ces seuils testables — par la
-- mise en file, il faudrait fabriquer huit semaines de crons.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  ('c2900000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c29-seuils@test.local', 'x', now(), now(), now(), false),
  ('c2900000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c29-reponse@test.local', 'x', now(), now(), now(), false);

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select 'c2900000-0000-0000-0000-000000000001', 'commute', d::date, 'Semaine', 'Trajet domicile-travail', 'commute', 'expired'
from generate_series(current_date - 21, current_date - 7, interval '7 day') as d;

select is(
  public.regime_de_rappel('c2900000-0000-0000-0000-000000000001', 'commute'),
  'normal',
  'trois points clos sans réponse : on n''espace pas encore — se taire tôt coûte quelqu''un qui serait revenu'
);

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
values ('c2900000-0000-0000-0000-000000000001', 'commute', current_date - 28, 'Semaine', 'Trajet domicile-travail', 'commute', 'expired');

select is(
  public.regime_de_rappel('c2900000-0000-0000-0000-000000000001', 'commute'),
  'espace',
  'quatre points clos : le régime espacé commence'
);

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select 'c2900000-0000-0000-0000-000000000001', 'commute', d::date, 'Semaine', 'Trajet domicile-travail', 'commute', 'expired'
from generate_series(current_date - 56, current_date - 35, interval '7 day') as d;

select is(
  public.regime_de_rappel('c2900000-0000-0000-0000-000000000001', 'commute'),
  'silence',
  'huit points clos : plus rien ne part'
);

-- Le compteur est par boucle, et c'est ce qui évite qu'un silence hebdomadaire emporte la boucle
-- mensuelle, qui n'a rien à se reprocher.
select is(
  public.regime_de_rappel('c2900000-0000-0000-0000-000000000001', 'extras'),
  'normal',
  'le silence d''une boucle ne ferme pas l''autre'
);

-- **Une ouverture de l''app vaut pour les deux boucles** : quelqu'un qui revient et ne répond pas à
-- *cette* question-là n'est pas quelqu'un qui est parti. C'est ce qui rend `app_open` (C1.2) un
-- signal de vie et pas seulement une mesure.
insert into public.usage_events (user_id, name, platform)
values ('c2900000-0000-0000-0000-000000000001', 'app_open', 'web');

select is(
  public.regime_de_rappel('c2900000-0000-0000-0000-000000000001', 'commute'),
  'normal',
  'un app_open remet le compteur à zéro, même après huit points clos'
);

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select 'c2900000-0000-0000-0000-000000000002', 'commute', d::date, 'Semaine', 'Trajet domicile-travail', 'commute', 'expired'
from generate_series(current_date - 56, current_date - 35, interval '7 day') as d;

select is(
  public.regime_de_rappel('c2900000-0000-0000-0000-000000000002', 'commute'),
  'espace',
  'quatre points clos chez un second compte : même seuil'
);

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status, response_kind, response, responded_at)
values ('c2900000-0000-0000-0000-000000000002', 'commute', current_date - 28, 'Semaine', 'Trajet domicile-travail', 'commute', 'answered', 'non', false, now());

-- Un « Non » est une réponse : le produit ne compte jamais les échecs, et la décroissance non plus.
select is(
  public.regime_de_rappel('c2900000-0000-0000-0000-000000000002', 'commute'),
  'normal',
  'une réponse plus récente que les points clos remet le compteur à zéro — un « Non » compris'
);

-- ── 3. La mise en file applique le régime ───────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  ('c2900000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c29-silence@test.local', 'x', now(), now(), now(), false),
  ('c2900000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c29-espace@test.local', 'x', now(), now(), now(), false),
  ('c2900000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c29-normal@test.local', 'x', now(), now(), now(), false);

-- Le canal est posé explicitement : `reminder_channel_for` a sa propre table de vérité (fichier 17),
-- et ce fichier-ci n'éprouve que la décroissance.
update public.profiles set reminder_channel = 'email' where id::text like 'c2900000%';

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select 'c2900000-0000-0000-0000-000000000011', 'commute', d::date, 'Semaine', 'Trajet domicile-travail', 'commute', 'expired'
from generate_series(current_date - 63, current_date - 14, interval '7 day') as d;

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select 'c2900000-0000-0000-0000-000000000012', 'commute', d::date, 'Semaine', 'Trajet domicile-travail', 'commute', 'expired'
from generate_series(current_date - 35, current_date - 14, interval '7 day') as d;

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status) values
  ('c2900000-0000-0000-0000-000000000011', 'commute', current_date - 7, 'Semaine', 'Trajet domicile-travail', 'commute', 'pending'),
  ('c2900000-0000-0000-0000-000000000012', 'commute', current_date - 7, 'Semaine', 'Trajet domicile-travail', 'commute', 'pending'),
  ('c2900000-0000-0000-0000-000000000013', 'commute', current_date - 7, 'Semaine', 'Trajet domicile-travail', 'commute', 'pending');

select public.enqueue_checkin_reminders();

select is(
  (select count(*)::int from public.notification_outbox
   where user_id = 'c2900000-0000-0000-0000-000000000011'),
  0,
  'en silence, le point ne donne aucun message'
);

select is(
  (select count(*)::int from public.notification_outbox
   where user_id = 'c2900000-0000-0000-0000-000000000012'),
  1,
  'en régime espacé, le premier message du mois part'
);

select is(
  (select count(*)::int from public.notification_outbox
   where user_id = 'c2900000-0000-0000-0000-000000000013'),
  1,
  'en régime normal, chaque point donne son message'
);

-- **Le jeton du corps est celui de la ligne, et rien d'autre ne le garantit.** Laissé au `default` de
-- la colonne, il aurait tiré un second uuid : le lien aurait répondu « plus valable » du premier
-- clic, et aucune des deux moitiés n'aurait eu l'air fausse séparément.
select ok(
  (select position(o.unsubscribe_token::text in o.body) > 0
   from public.notification_outbox o where o.user_id = 'c2900000-0000-0000-0000-000000000013'),
  'le jeton écrit dans le corps du message est celui de la ligne'
);

-- La moitié du chantier qu'on oublie : ce qui s'espace est le **message**, jamais le point.
select is(
  (select count(*)::int from public.engagement_checkins
   where user_id = 'c2900000-0000-0000-0000-000000000011' and status = 'pending'),
  1,
  'le point reste en attente : l''app doit pouvoir montrer la question à qui revient'
);

-- La période suivante, dans le même mois calendaire.
update public.engagement_checkins set status = 'expired'
where user_id = 'c2900000-0000-0000-0000-000000000012' and status = 'pending';

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
values ('c2900000-0000-0000-0000-000000000012', 'commute', current_date, 'Semaine', 'Trajet domicile-travail', 'commute', 'pending');

select public.enqueue_checkin_reminders();

select is(
  (select count(*)::int from public.notification_outbox
   where user_id = 'c2900000-0000-0000-0000-000000000012'),
  1,
  'en régime espacé, la semaine suivante ne donne pas de second message dans le même mois'
);

select is(
  public.regime_de_rappel('c2900000-0000-0000-0000-000000000012', 'commute'),
  'espace',
  'cinq points clos : encore espacé, pas encore silencieux'
);

-- Le mois d'avant : le message repart. Le plafond est compté sur `created_at` et non sur `sent_at`,
-- pour que la décroissance s'applique même tant que l'expéditeur n'est pas configuré.
update public.notification_outbox
set created_at = date_trunc('month', now()) - interval '3 day'
where user_id = 'c2900000-0000-0000-0000-000000000012';

select public.enqueue_checkin_reminders();

select is(
  (select count(*)::int from public.notification_outbox
   where user_id = 'c2900000-0000-0000-0000-000000000012'),
  2,
  'le mois suivant, un message repart — « espace » n''est pas un état terminal'
);

-- ── 4. La sortie hors de l'app ──────────────────────────────────────────────────────────
-- Deux points en attente, une boucle chacune : c'est ce qui permet de vérifier que le clic annule
-- **tout** ce qui reste en file, et pas seulement le message cliqué.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  ('c2900000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c29-sortie@test.local', 'x', now(), now(), now(), false);

update public.profiles set reminder_channel = 'email'
where id = 'c2900000-0000-0000-0000-000000000021';

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status) values
  ('c2900000-0000-0000-0000-000000000021', 'commute', current_date - 7, 'Semaine', 'Trajet domicile-travail', 'commute', 'pending'),
  ('c2900000-0000-0000-0000-000000000021', 'extras', date_trunc('month', current_date - 20)::date, 'Mois', 'Loisirs du week-end', 'leisure', 'pending');

select public.enqueue_checkin_reminders();

-- **Le jeton est capturé une fois, et les trois assertions suivantes lisent la même valeur.**
-- `order by created_at limit 1` ne désigne rien de stable ici : `created_at` vaut `now()`, c'est-à-dire
-- l'horodatage de **début de transaction**, donc les deux lignes mises en file par le même appel le
-- portent à l'identique et l'ordre retombe sur celui du tas. Le « second clic » pouvait ainsi tirer
-- l'autre ligne — jeton jamais utilisé, donc un succès là où l'assertion attend un refus. Relevé en
-- rejouant le fichier sur le distant pendant C2.4 ; l'assertion était juste, c'est la désignation de
-- la ligne qui ne l'était pas.
select set_config('test.jeton_sortie',
  (select unsubscribe_token::text from public.notification_outbox
   where user_id = 'c2900000-0000-0000-0000-000000000021' order by created_at, id limit 1), true);

select ok(
  (select position('/rappels/stop?jeton=' || current_setting('test.jeton_sortie') in body) > 0
   from public.notification_outbox
   where unsubscribe_token = current_setting('test.jeton_sortie')::uuid),
  'le message porte SON lien de désinscription — l''ancienne phrase renvoyait à une app désinstallée'
);

select ok(
  public.desinscrire_des_rappels(current_setting('test.jeton_sortie')::uuid),
  'le premier clic aboutit, sans session'
);

select is(
  (select reminder_channel from public.profiles where id = 'c2900000-0000-0000-0000-000000000021'),
  'none',
  'la préférence passe à « aucun » — le lien fait vraiment ce qu''il annonce'
);

select is(
  (select count(*)::int from public.notification_outbox
   where user_id = 'c2900000-0000-0000-0000-000000000021' and status = 'cancelled'),
  2,
  'les deux messages encore en file sont annulés, pas seulement celui qui portait le lien'
);

-- **La réponse ne distingue pas les échecs**, même registre que `/connexion/retrouver` : trois
-- messages différents feraient de cette page un moyen de savoir qui reçoit des rappels.
select ok(
  not public.desinscrire_des_rappels(current_setting('test.jeton_sortie')::uuid),
  'un second clic sur le MÊME lien ne dit rien de plus : le jeton ne sert qu''une fois'
);

select ok(
  not public.desinscrire_des_rappels('00000000-0000-4000-8000-000000000000'),
  'un jeton inconnu répond exactement la même chose qu''un jeton déjà utilisé'
);

-- ── 5. Les privilèges ───────────────────────────────────────────────────────────────────

select ok(
  has_function_privilege('anon', 'public.desinscrire_des_rappels(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.desinscrire_des_rappels(uuid)', 'execute'),
  'la désinscription est appelable sans session : c''est tout l''intérêt du lien'
);

-- `revoke ... from public` est indispensable : PostgreSQL accorde EXECUTE à PUBLIC à la création, et
-- les deux rôles en héritent (v1-08 §5.2).
select ok(
  not has_function_privilege('anon', 'public.regime_de_rappel(uuid, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.regime_de_rappel(uuid, text)', 'execute'),
  'le régime de rappel reste serveur-only — il lit usage_events, que personne ne peut lire'
);

-- ── 6. Les en-têtes de l'envoi ──────────────────────────────────────────────────────────

select ok(
  position('List-Unsubscribe' in
    (select prosrc from pg_proc
     where pronamespace = 'public'::regnamespace and proname = 'send_pending_reminders')) > 0,
  'l''envoi pose l''en-tête que Gmail et Apple Mail affichent au-dessus du message'
);

-- Et l'inverse, qui est la vraie décision : annoncer le pendant « One-Click » obligerait la page à
-- répondre à un POST, ce qu'un export statique ne peut pas faire. L'annoncer sans le servir ferait
-- échouer le geste en silence, donc l'en-tête est délibérément absent.
select ok(
  position('List-Unsubscribe-Post' in
    (select prosrc from pg_proc
     where pronamespace = 'public'::regnamespace and proname = 'send_pending_reminders')) = 0,
  'le pendant en POST n''est pas annoncé : la page est un export statique'
);

-- ── 7. Les reprises de jeton d'appareil ─────────────────────────────────────────────────
-- La reprise reste inconditionnelle (v1-10 §3.4) : ce qui est nouveau, c'est qu'on puisse la
-- constater. Un jeton repris deux cents fois dirait un appareil partagé ou une boucle, et c'est la
-- seule question que ces trois colonnes servent à trancher.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous) values
  ('c2900000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c29-appareil-a@test.local', 'x', now(), now(), now(), false),
  ('c2900000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c29-appareil-b@test.local', 'x', now(), now(), now(), false);

select set_config('request.jwt.claims', '{"sub":"c2900000-0000-0000-0000-000000000031"}', true);
select public.register_push_token('ExponentPushToken[pgtap-c29-reprise]', 'android');

select is(
  (select reprises from public.push_tokens where token = 'ExponentPushToken[pgtap-c29-reprise]'),
  0,
  'un premier enregistrement n''est pas une reprise'
);

select set_config('request.jwt.claims', '{"sub":"c2900000-0000-0000-0000-000000000032"}', true);
select public.register_push_token('ExponentPushToken[pgtap-c29-reprise]', 'android');

select is(
  (select reprises from public.push_tokens where token = 'ExponentPushToken[pgtap-c29-reprise]'),
  1,
  'le même appareil réclamé par un autre compte compte une reprise'
);

-- `push_tokens.user_id` dans un `on conflict do update` désigne la ligne **existante**, `excluded` la
-- ligne proposée : s'y tromper ferait lire la nouvelle valeur, donc ne compterait jamais rien.
select is(
  (select proprietaire_precedent from public.push_tokens
   where token = 'ExponentPushToken[pgtap-c29-reprise]'),
  'c2900000-0000-0000-0000-000000000031'::uuid,
  'le propriétaire d''avant est nommé — c''est ce qui rend la reprise lisible après coup'
);

select ok(
  (select derniere_reprise_le is not null from public.push_tokens
   where token = 'ExponentPushToken[pgtap-c29-reprise]'),
  'la date de la dernière reprise est posée'
);

select public.register_push_token('ExponentPushToken[pgtap-c29-reprise]', 'android');

-- Le garde d'`_layout.tsx` réenregistre à chaque changement d'utilisateur, et
-- `onAuthStateChange` émet à chaque rafraîchissement de jeton, soit toutes les heures : sans cette
-- condition, le compteur dirait l'âge de la session plutôt qu'une reprise.
select is(
  (select reprises from public.push_tokens where token = 'ExponentPushToken[pgtap-c29-reprise]'),
  1,
  'un réenregistrement par le même compte ne compte pas pour une reprise'
);

-- ── 8. Plusieurs rappels dans la même exécution, sous le plan du distant ─────────────────
-- L'incident du 05/10/2026 (`v1-27` §12.37) : le jeton venait d'une
-- sous-requête qui ne nommait pas la ligne, et le distant l'a calculée une fois pour toute
-- l'instruction. Deux rappels, un seul jeton, l'index unique refuse, et le générateur de la semaine
-- échoue en entier. La §3 met déjà deux rappels en file dans le même appel — et elle passait, parce
-- que **le plan dépend des statistiques** : sur une table jamais analysée, Postgres réévalue la
-- sous-requête à chaque ligne ; dès que la table est analysée et porte quelques points en attente,
-- il la sort de la boucle, comme le distant ce matin-là.
--
-- D'où l'`analyze` ci-dessous : c'est lui qui met cette section sous le plan du distant, et sans
-- lui elle ne garde rien. **Le témoin qui le suit le vérifie à chaque passage** : la requête de
-- l'ancien corps, rejouée telle quelle, doit n'y tirer qu'un jeton pour toute l'instruction. Si une
-- montée de version ou un réglage de coût rendait l'ancien plan, le témoin tomberait seul — la
-- section ne garderait plus rien, et il le dit au lieu de rester vert.
--
-- **Ce que l'`analyze` laisse derrière lui**, transaction annulée : `pg_statistic` repart avec
-- elle, mais `reltuples` et `relpages` sont écrits en place et comptent toutes les lignes que le
-- fichier a insérées avant lui ; `last_analyze`, `analyze_count` et `n_live_tup` sont des compteurs
-- de statistiques, hors transaction, et `n_mod_since_analyze` repart de zéro. En CI, les fichiers
-- qui suivent le 22 dans le même passage voient donc ces lignes fantômes dans `reltuples` ; sur le
-- distant, l'autoanalyze suivant est repoussé, `pg_statistic` gardant ses anciennes valeurs —
-- `TESTING-PGTAP.md` §2.3.
--
-- Éprouvé en le cassant, le 05/10/2026 : l'ancien corps du distant (la sous-requête sans `c.id`,
-- et `c.id` dans la liste de l'insertion) fait tomber les trois assertions de la mise en file — la
-- première sur l'index unique, les deux autres faute de lignes ; l'`analyze` retiré, elles
-- repassent sur l'ancien corps, et le témoin tombe.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, email_confirmed_at, is_anonymous)
select ('c2900000-0000-0000-0000-00000000004' || i)::uuid, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'pgtap-c29-lot-' || i || '@test.local', 'x', now(), now(), now(), false
from generate_series(1, 5) as i;

update public.profiles set reminder_channel = 'email' where id::text like 'c2900000-0000-0000-0000-00000000004%';

insert into public.engagement_checkins (user_id, loop_type, period_start, period_label, trip_label, poste, status)
select ('c2900000-0000-0000-0000-00000000004' || i)::uuid, 'commute', current_date - 7, 'Semaine',
       'Trajet domicile-travail', 'commute', 'pending'
from generate_series(1, 5) as i;

analyze public.engagement_checkins;

-- Le témoin : la sélection de l'ancien corps, au jeton près — mêmes jointures, mêmes filtres —,
-- avec la sous-requête qui ne nomme pas la ligne.
select is(
  (select count(distinct o.unsubscribe_token)::int
   from public.engagement_checkins c
   join auth.users u on u.id = c.user_id
   cross join lateral (select public.reminder_channel_for(c.user_id) as canal) ch
   cross join lateral (select public.regime_de_rappel(c.user_id, c.loop_type) as regime) r
   cross join lateral (
     select coalesce(
       c.committed_question,
       public.checkin_question(c.loop_type, c.question_kind, c.poste, c.mode, c.period_start)
     ) as question
   ) q
   cross join lateral (select public.poste_inserable(c.poste, c.loop_type) as etiquette) e
   cross join lateral (select gen_random_uuid() as unsubscribe_token) o
   where c.status = 'pending'
     and ch.canal is not null
     and r.regime <> 'silence'
     and (
       r.regime = 'normal'
       or not exists (
         select 1 from public.notification_outbox o2
         where o2.user_id = c.user_id
           and o2.created_at >= date_trunc('month', now())
       )
     )),
  1,
  'témoin : sous ce plan, l''ancienne sous-requête ne tire qu''un jeton pour toute l''instruction — sinon cette section ne garde plus rien'
);

select lives_ok(
  $$select public.enqueue_checkin_reminders()$$,
  'cinq rappels mis en file par la même exécution, sous le plan qu''a choisi le distant le 05/10/2026'
);

select is(
  (select count(distinct unsubscribe_token)::int from public.notification_outbox
   where user_id::text like 'c2900000-0000-0000-0000-00000000004%'),
  5,
  'chaque rappel a son jeton — c''est lui, à lui seul, qui autorise à couper les rappels'
);

select is(
  (select count(*)::int from public.notification_outbox
   where user_id::text like 'c2900000-0000-0000-0000-00000000004%'
     and position(unsubscribe_token::text in body) > 0),
  5,
  'et chacun écrit le sien dans son corps : le lien du message est celui de sa ligne'
);

select * from finish();
rollback;
