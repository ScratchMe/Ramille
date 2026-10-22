-- Tests pgTAP : les loisirs de toute la semaine, et la cinquième fréquence, « Presque tous les jours »
-- (étape 3 de `docs/architecture/v1-35-l-audit-en-chantiers.md`, migration
-- `20261022163000_les_loisirs_de_toute_la_semaine.sql`).
--
-- **Deux profils, aux réponses identiques sauf la fréquence** : P sort presque tous les jours, Q une
-- fois par semaine — en voiture thermique, 15 à 30 km, sans trajet domicile-travail ni voyage. Q est
-- le témoin : ce que P doit faire se lit **par rapport à lui**, jamais contre un chiffre recopié, donc
-- une retouche du référentiel des facteurs ne touche pas ce fichier (`TESTING-PGTAP.md` §2.2).
--
-- **Ce que chaque assertion garde** :
--   - la distance de P vaut 5 fois celle de Q — la valeur de la réponse ;
--   - P est une sortie **déclarée** : ses libellés sont ceux du témoin, son plan propose des actions
--     de loisirs, il reçoit la boucle mensuelle sans voyage, et son point du mois porte sur ses
--     sorties ;
--   - le poste s'appelle « Loisirs » dans les libellés que le calcul fige, et la question du mois
--     dit « tes sorties », sans « week-end » ;
--   - une valeur hors de la liste est refusée.
-- Que **chaque** fréquence admise ait sa branche dans le calcul, `41` le garde déjà, en lisant la
-- liste dans la contrainte : il en compte cinq depuis cette migration.
--
-- **Éprouvé en le cassant, le 22/10/2026** — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-toute-la-semaine-' || right(u::text, 1) || '@test.local', 'x', now(), false, now(), now()
from unnest(array[
  'e6000000-0000-0000-0000-00000000000a'::uuid,  -- P : presque tous les jours
  'e6000000-0000-0000-0000-00000000000b'         -- Q : une fois par semaine, le témoin
]) u;

insert into public.assessments (id, user_id, status, submitted_at)
select replace(u::text, 'e6000000', 'e6010000')::uuid, u, 'completed', now()
from unnest(array[
  'e6000000-0000-0000-0000-00000000000a'::uuid, 'e6000000-0000-0000-0000-00000000000b'
]) u;

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  leisure_mode, leisure_distance_bracket, leisure_car_engine, household_vehicles, zone_type, tc_access)
values
  ('e6010000-0000-0000-0000-00000000000a', false, 'almost_daily', 'voiture', '15_30', 'thermique',
   '1', 'periurbain', 'bon'),
  ('e6010000-0000-0000-0000-00000000000b', false, 'weekly', 'voiture', '15_30', 'thermique',
   '1', 'periurbain', 'bon');

select public.recompute_assessment_results(a)
from unnest(array[
  'e6010000-0000-0000-0000-00000000000a'::uuid, 'e6010000-0000-0000-0000-00000000000b'
]) a;

-- ── Ce que vaut la réponse ───────────────────────────────────────────────────────────────

select is(
  (select leisure_km_year from public.assessment_results
    where assessment_id = 'e6010000-0000-0000-0000-00000000000a'),
  (select leisure_km_year * 5 from public.assessment_results
    where assessment_id = 'e6010000-0000-0000-0000-00000000000b'),
  'presque tous les jours vaut 5 fois une sortie par semaine'
);

select ok(
  (select leisure_km_year > 0 from public.assessment_results
    where assessment_id = 'e6010000-0000-0000-0000-00000000000b'),
  'prémisse : le témoin a des loisirs, donc le rapport ci-dessus n''est pas 0 = 0'
);

-- ── Une sortie déclarée, nommée « Loisirs » ─────────────────────────────────────────────

select results_eq(
  $$ select dominant_poste, dominant_poste_mode, dominant_poste_label, extras_poste_label
       from public.assessment_results
      where assessment_id = 'e6010000-0000-0000-0000-00000000000a' $$,
  $$ select dominant_poste, dominant_poste_mode, dominant_poste_label, extras_poste_label
       from public.assessment_results
      where assessment_id = 'e6010000-0000-0000-0000-00000000000b' $$,
  'le poste, le mode et les deux libellés de P sont ceux du témoin : ses sorties sont déclarées, pas le résiduel'
);

select results_eq(
  $$ select dominant_poste_label, extras_poste_label from public.assessment_results
      where assessment_id = 'e6010000-0000-0000-0000-00000000000a' $$,
  $$ values ('Loisirs (Voiture thermique)'::text, 'Loisirs (Voiture thermique)'::text) $$,
  'les libellés figés disent « Loisirs », sans « du week-end » : la semaine compte aussi'
);

select ok(
  exists (
    select 1
      from public.plan_actions pa
      join public.plan_cycles pc on pc.id = pa.plan_cycle_id
      join public.action_templates t on t.id = pa.action_template_id
     where pc.user_id = 'e6000000-0000-0000-0000-00000000000a' and t.poste = 'leisure'
  ),
  'le plan de P propose des actions sur ses sorties, que l''estimateur refuse au résiduel'
);

select results_eq(
  $$ select loop_type from public.boucles_du_dernier_bilan('e6000000-0000-0000-0000-00000000000a') $$,
  $$ values ('extras'::text) $$,
  'P reçoit la boucle mensuelle sans avoir déclaré de voyage'
);

-- La question est générique : P n'a engagé aucune action, donc le poste vient du choix par défaut.
select public.generate_extras_checkins();

select results_eq(
  $$ select poste, question_kind from public.engagement_checkins
      where user_id = 'e6000000-0000-0000-0000-00000000000a' and loop_type = 'extras' $$,
  $$ values ('leisure'::text, 'generique'::text) $$,
  'le point du mois de P porte sur ses sorties'
);

select ok(
  (select committed_question like '%pour tes sorties ?' and position('week-end' in committed_question) = 0
     from public.engagement_checkins
    where user_id = 'e6000000-0000-0000-0000-00000000000a' and loop_type = 'extras'),
  'la question du mois dit « pour tes sorties ? », sans « du week-end »'
);

-- ── Une valeur hors de la liste est refusée ─────────────────────────────────────────────

select throws_ok(
  $$ update public.assessment_answers set leisure_frequency = 'daily'
      where assessment_id = 'e6010000-0000-0000-0000-00000000000a' $$,
  '23514',
  null,
  'une fréquence que la contrainte n''admet pas est refusée'
);

select * from finish();
rollback;

-- ── Relevé des mutations, 22/10/2026 ─────────────────────────────────────────────────────────
--
-- Jouées sur la stack locale, la migration appliquée : chaque mutation installée, **la suite pgTAP
-- entière** rejouée, puis les trois fonctions et la contrainte restaurées. Les numéros sont ceux des
-- assertions de ce fichier, sauf mention.
--
--   - « presque tous les jours » à 3 au lieu de 5 → 1, seule ;
--   - sa branche retirée du calcul → `41` n° 2 nomme la fréquence sans branche, et ce fichier tombe
--     entier au calcul de P (le total NULL est refusé) ;
--   - la réponse traitée comme « rarement » (distance et mode par défaut) → 1, seule ;
--   - « Loisirs du week-end (<mode>) » rendu au libellé des sorties → 4, `01` n° 12, `20` n° 25 ;
--   - « Loisirs du week-end » rendu au poste dominant → 4, `05` n° 4, `20` n° 26 et 34 ;
--   - « tes sorties du week-end » rendu à `poste_inserable` → 8, `19` n° 2 et 5, `23` n° 20 ;
--   - « Loisirs du week-end » rendu à la question du mois (`generate_extras_checkins`) → `40` n° 3 et
--     9 seulement : ce fichier ne passe pas par cette branche (P n'a engagé aucune action), et `40`
--     la garde ;
--   - la contrainte ramenée à quatre valeurs → `41` n° 1, et ce fichier tombe entier à l'insertion
--     de P.
--
-- `22` n° 34 (le témoin du plan de requête) a rougi par moments pendant ces passages, mutation ou
-- non : la base était réutilisée d'un passage à l'autre, et ce témoin dépend des statistiques que les
-- fichiers laissent (`TESTING-PGTAP.md` §2.3). Sur une stack neuve, la suite entière passe.
