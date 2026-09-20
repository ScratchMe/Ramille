-- Tests pgTAP des trois surfaces d'écriture resserrées le 20/09/2026
-- (migration 20260920160000_trois_surfaces_plus_larges_que_leur_intention.sql).
--
-- Ce dépôt a une règle, appliquée avec rigueur à `plan_actions` et `engagement_checkins` :
-- **la RLS filtre des LIGNES, jamais des COLONNES**. Une relecture du schéma entier a trouvé
-- trois tables voisines où elle n'avait pas été appliquée. Ce fichier éprouve les trois
-- correctifs, et surtout leur **moitié positive** : un resserrement qui casserait le chemin
-- nominal serait pire que le trou qu'il ferme.
--
-- Les trois refus se manifestent de **trois façons différentes**, et c'est la chose à connaître
-- avant de lire les assertions :
--   * un privilège manquant lève `42501`, bruyamment, avant même d'atteindre la RLS ;
--   * un privilège de **colonne** manquant lève aussi `42501`, mais seulement si l'ordre nomme
--     la colonne — d'où des assertions qui écrivent une colonne à la fois ;
--   * une policy dont le `using` ne retient pas la ligne ne lève **rien** : l'ordre affecte zéro
--     ligne, en silence. C'est le cas le plus traître, donc il s'éprouve en relisant la donnée,
--     jamais en attendant une erreur.
--
-- **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1) — quatre mutations, appliquées à la
-- base puis retirées par l'opération inverse, et ce que chacune fait tomber :
--   - la policy DELETE de `feedback` et son privilège remis → la matrice du test `18` (qui porte
--     le schéma entier), plus les deux assertions de la section A ;
--   - `grant update on public.assessments` de nouveau au niveau **table** → la matrice, les deux
--     assertions de colonne ajoutées au test `18`, et les deux refus de la section B. Cinq
--     assertions pour une seule ligne : c'est la mesure de ce que la largeur ouvrait ;
--   - le prédicat `status = 'in_progress'` retiré de la policy → **une seule** assertion, celle
--     qui relit la donnée. Ni la matrice ni aucun `throws_ok` ne bouge, parce que ce refus-là est
--     muet. C'est la mutation qui justifie la forme de la section C.
--
--   - le prédicat écrit **à l'envers** (`status = 'completed'`) → trois assertions, et c'est la
--     mutation la plus instructive : elle rouvre le trou (9) **et** casse le produit (11 et 12,
--     la reprise du questionnaire refusée). Un resserrement se juge par ses deux moitiés.
--
-- **Et cette dernière a d'abord révélé un défaut de ce fichier.** Les assertions 8 et 10 écrivaient
-- toutes deux la valeur 200 : sous le prédicat inversé, l'écriture que la 9 doit voir refusée
-- passait, et la 11 relisait alors 200 sans que son propre ordre ait rien fait — elle passait pour
-- la mauvaise raison, donc elle ne gardait rien. Deux valeurs distinctes (200 tentée, 150 écrite)
-- les découplent, et la mutation en fait tomber trois au lieu de deux. Une assertion qui dépend de
-- l'écriture d'une autre n'éprouve pas ce qu'elle annonce.
--
-- Et un passage qui doit rester **vert** : la moitié positive de chaque section — dix retours
-- acceptés, `status` toujours écrivable, réponses réécrites tant que le bilan est en cours.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-surf-a@test.local', 'x', now(), now());

-- Un bilan **complété**, avec ses réponses : c'est l'état sur lequel les deux derniers
-- resserrements portent. Les réponses sont écrites ici en propriétaire, comme la soumission les
-- écrit alors que le bilan est encore `in_progress`.
insert into public.assessments (id, user_id, status) values
  ('30000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000001', 'in_progress');

insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
) values (
  '30000000-0000-0000-0000-0000000000a1', true, 5, 20, 'voiture', false, false, 'rarely'
);

update public.assessments set status = 'completed' where id = '30000000-0000-0000-0000-0000000000a1';

-- **Un second bilan, laissé `in_progress`** — c'est sur lui que la moitié positive de la section C
-- s'éprouve. Ce fichier repassait le premier en `in_progress` le moment venu ; depuis
-- `20260920190000`, cette transition arrière est **refusée pour tout le monde** (`RM005`), parce
-- qu'elle franchissait en trois ordres le bornage que la section C éprouve. La fixture suit donc
-- la règle que le dépôt s'est donnée ailleurs : un bilan qu'un re-bilan reprend est une
-- **nouvelle ligne**, jamais l'ancienne rouverte — et une fixture qui écrit un état que la
-- production ne peut pas produire éprouve une fiction.
insert into public.assessments (id, user_id, status) values
  ('30000000-0000-0000-0000-0000000000a2', '30000000-0000-0000-0000-000000000001', 'in_progress');

insert into public.assessment_answers (
  assessment_id, commute_has_regular_trip, commute_days_per_week, commute_distance_km, commute_mode,
  commute_is_carpool, commute_second_mode_used, leisure_frequency
) values (
  '30000000-0000-0000-0000-0000000000a2', true, 5, 20, 'voiture', false, false, 'rarely'
);

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', '30000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

-- ── Section A : `feedback` — le garde-fou de volume ne se remet plus à zéro ──────────────────
--
-- Il comptait les lignes **vivantes** des 24 dernières heures, et la policy DELETE laissait les
-- effacer : dix retours, on efface, on recommence. Le DELETE est parti plutôt qu'on ne compte
-- autre chose — aucun écran ne l'empruntait, il ne portait aucune justification dans sa
-- migration, et `/confidentialite` documente déjà la table comme « insert-only côté client ».

select lives_ok(
  $$ insert into public.feedback (user_id, kind, message)
     select '30000000-0000-0000-0000-000000000001', 'idee', 'Retour numero ' || g
       from generate_series(1, 10) g $$,
  'dix retours passent : le quota nominal n’a pas bougé'
);

select throws_ok(
  $$ insert into public.feedback (user_id, kind, message)
     values ('30000000-0000-0000-0000-000000000001', 'idee', 'Le onzieme') $$,
  'RM002',
  null,
  'le onzième est refusé : le garde-fou de volume tient'
);

-- Le cœur du chantier. Avant le 20/09/2026 cet ordre réussissait, et les dix suivants aussi.
select throws_ok(
  $$ delete from public.feedback where user_id = '30000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'effacer ses propres retours est refusé — le compteur ne peut plus être remis à zéro'
);

select is(
  (select count(*)::int from public.feedback where user_id = '30000000-0000-0000-0000-000000000001'),
  10,
  'et rien n’a été effacé : le refus est bien arrivé avant l’écriture'
);

-- ── Section B : `assessments` — le privilège par COLONNE ─────────────────────────────────────
--
-- `authenticated` portait `update` sur les cinq colonnes ; le client n'en écrit qu'une, `status`,
-- à la soumission. `submitted_at` est annoncée comme une date **serveur** par CLAUDE.md et par la
-- garde d'idempotence de `generate_plan_cycle_for_user`, qui dit comparer deux horodatages
-- serveur — ce qui était faux tant que le client pouvait l'écrire.

select lives_ok(
  $$ update public.assessments set status = 'completed'
      where id = '30000000-0000-0000-0000-0000000000a1' $$,
  'la soumission écrit toujours `status` : le questionnaire n’est pas cassé'
);

select throws_ok(
  $$ update public.assessments set submitted_at = now() + interval '1 year'
      where id = '30000000-0000-0000-0000-0000000000a1' $$,
  '42501',
  null,
  '`submitted_at` n’est plus écrivable par le client : la date vient vraiment du serveur'
);

select throws_ok(
  $$ update public.assessments set user_id = '30000000-0000-0000-0000-000000000001'
      where id = '30000000-0000-0000-0000-0000000000a1' $$,
  '42501',
  null,
  '`user_id` n’est plus écrivable non plus — le resserrement porte sur les quatre colonnes'
);

-- ── Section C : `assessment_answers` — le statut borne enfin l'UPDATE ────────────────────────
--
-- La policy autorisait à réécrire les réponses d'un bilan déjà `completed`, sans recalcul :
-- `assessment_results` restait figé sur l'ancien chiffre, puis le premier recalcul serveur
-- faisait bondir le total sans qu'aucune ligne ne soit ajoutée à `assessments`.
--
-- **Le refus est silencieux** — la clause `using` écarte la ligne, donc zéro ligne affectée et
-- aucune erreur. L'assertion relit donc la donnée, ce qui est la seule façon de le voir.

select lives_ok(
  $$ update public.assessment_answers set commute_distance_km = 200
      where assessment_id = '30000000-0000-0000-0000-0000000000a1' $$,
  'l’ordre ne lève pas : une policy qui n’attrape pas la ligne est muette, pas bruyante'
);

select is(
  (select commute_distance_km::int from public.assessment_answers
    where assessment_id = '30000000-0000-0000-0000-0000000000a1'),
  20,
  'mais rien n’a bougé : les réponses d’un bilan complété ne se réécrivent plus en direct'
);

-- **Et la moitié positive**, sans laquelle ce fichier éprouverait qu'on a cassé le produit : tant
-- que le bilan est en cours, la soumission réécrit ses réponses — c'est l'`upsert` de reprise que
-- `20260911120000_soumission_bilan.sql` a imposé contre le bilan fantôme.
-- **Une valeur différente de celle tentée plus haut, et ce n'est pas cosmétique** : écrites toutes
-- deux à 200, ces deux assertions se couplaient — un prédicat inversé laissait passer l'écriture
-- refusée de la section précédente, et celle-ci lisait alors 200 sans que son propre ordre ait rien
-- fait. Elle passait pour la mauvaise raison. Relevé en relisant ce fichier, mutation à l'appui.
select lives_ok(
  $$ update public.assessment_answers set commute_distance_km = 150
      where assessment_id = '30000000-0000-0000-0000-0000000000a2' $$,
  'sur un bilan `in_progress`, la reprise du questionnaire réécrit toujours ses réponses'
);

select is(
  (select commute_distance_km::int from public.assessment_answers
    where assessment_id = '30000000-0000-0000-0000-0000000000a2'),
  150,
  'et cette fois la valeur est bien passée : le resserrement borne le statut, pas le propriétaire'
);

-- **Et la forme réelle de la production est un `upsert`, pas un `update`.** La soumission écrit
-- `insert … on conflict (assessment_id) do update` — c'est la reprise imposée par
-- `20260911120000_soumission_bilan.sql`, dont la clé primaire est `assessment_id`. Postgres
-- évalue alors la policy **UPDATE** sur la branche de conflit, donc c'est bien elle que ce
-- resserrement pouvait casser. L'assertion du dessus l'éprouve par un `update` nu, ce qui n'est
-- pas tout à fait la même requête : relevé en relisant ce fichier, et comblé ici.
select lives_ok(
  $$ insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency)
     values ('30000000-0000-0000-0000-0000000000a2', true, 'rarely')
     on conflict (assessment_id) do update set commute_has_regular_trip = excluded.commute_has_regular_trip $$,
  'et l’`upsert` de reprise passe aussi : c’est la forme que la soumission emploie vraiment'
);

select set_config('request.jwt.claims', ''::text, true);
reset role;

select * from finish();
rollback;
