-- Tests pgTAP de la forme insérable du poste — C2.6, migration 20260912120000_poste_inserable.sql.
--
-- Ce fichier est **la moitié SQL d'une paire** : `src/constants/postes.test.ts` épingle la même
-- table côté client. La règle est écrite deux fois par nécessité — un rappel part sans que le
-- client soit là, et l'écran affiche la même phrase quand il est là — et c'est cette paire, pas
-- l'un des deux tests, qui empêche les deux implémentations de diverger. Même motif que
-- `reminder_channel_for` / `src/types/rappels.ts` (fichier 17).
--
-- Ce qui est épinglé ici et qu'un lecteur pourrait « corriger » de bonne foi :
--
--   * **la forme courte** — « tes voyages », pas « tes voyages longue distance ». La forme longue
--     est celle de la restitution ; après une préposition, dans une question de vingt mots, elle
--     alourdit. Les deux tables coexistent exprès ;
--   * **le poste l'emporte toujours sur la boucle** — l'inverse ferait lire « tes sorties du
--     week-end » à quelqu'un dont le poste extras est les voyages, c'est-à-dire remplacerait une
--     vérité laide par une fausseté lisible ;
--   * **jamais une chaîne vide**, y compris sur un poste inconnu : elle produirait « pour  ? »
--     dans un email déjà parti.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- ── La table des formes ─────────────────────────────────────────────────────────────────

select is(public.poste_inserable('commute'), 'ton trajet domicile-travail',
  'poste_inserable: commute');
select is(public.poste_inserable('leisure'), 'tes sorties du week-end',
  'poste_inserable: leisure — « sorties » et non « loisirs », copie du canvas v1-14');
select is(public.poste_inserable('travel'), 'tes voyages',
  'poste_inserable: travel — la forme courte, sans « longue distance »');

-- ── Le repli sur la boucle, et sa subordination au poste ────────────────────────────────

select is(public.poste_inserable(null, 'commute'), 'ton trajet domicile-travail',
  'poste_inserable: sans poste, la boucle commute donne le trajet');
select is(public.poste_inserable(null, 'extras'), 'tes sorties du week-end',
  'poste_inserable: sans poste, la boucle extras retombe sur les sorties');
select is(public.poste_inserable('travel', 'extras'), 'tes voyages',
  'poste_inserable: le poste l''emporte sur la boucle — jamais « sorties » pour un voyageur');
select is(public.poste_inserable('travel', 'commute'), 'tes voyages',
  'poste_inserable: le poste l''emporte même quand la boucle le contredit');

-- ── Jamais rien ─────────────────────────────────────────────────────────────────────────

select ok(length(public.poste_inserable(null, null)) > 0,
  'poste_inserable: rien du tout rend quand même une forme');
select ok(length(public.poste_inserable('inconnu')) > 0,
  'poste_inserable: un poste inconnu rend une forme neutre, pas une chaîne vide');

-- ── Les trois colonnes qui rendent la forme possible ────────────────────────────────────

select has_column('public', 'assessment_results', 'extras_poste',
  'assessment_results.extras_poste : la décision loisirs/voyages, gardée');
select has_column('public', 'engagement_checkins', 'poste',
  'engagement_checkins.poste : loop_type ne nomme pas le poste');
select has_column('public', 'plan_cycles', 'poste',
  'plan_cycles.poste : le cycle porte son poste, pas seulement son libellé');

-- ── La fonction reste serveur-only ──────────────────────────────────────────────────────
-- Aucun appel client : elle ne sert qu'aux générateurs et à l'envoi, tous `security definer`.
-- `revoke ... from public` d'abord, sans quoi le `revoke` ne révoque rien (PostgreSQL accorde
-- EXECUTE à PUBLIC à la création).

select ok(not has_function_privilege('authenticated', 'public.poste_inserable(text,text)', 'execute'),
  'poste_inserable: authenticated ne peut pas l''appeler');
select ok(not has_function_privilege('anon', 'public.poste_inserable(text,text)', 'execute'),
  'poste_inserable: anon ne peut pas l''appeler');

select * from finish();
rollback;
