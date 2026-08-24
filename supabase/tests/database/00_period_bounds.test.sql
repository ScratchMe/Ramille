-- Tests pgTAP de `season_bounds` et `rolling_quarter_bounds` (docs/architecture/v1-03-plan-reduction.md
-- §2) — fonctions pures, sans dépendance de schéma, donc le point de départ le moins coûteux
-- pour verrouiller la logique de cadence du plan de réduction.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- ── season_bounds : saisons météorologiques (blocs calendaires de 3 mois) ──────────────

select results_eq(
  $$ select period_start, period_end, label from public.season_bounds('2026-01-15'::date) $$,
  $$ values ('2025-12-01'::date, '2026-02-28'::date, 'Hiver 2025-2026') $$,
  'season_bounds: janvier retombe sur l''hiver commencé en décembre précédent'
);

select results_eq(
  $$ select period_start, period_end, label from public.season_bounds('2026-12-25'::date) $$,
  $$ values ('2026-12-01'::date, '2027-02-28'::date, 'Hiver 2026-2027') $$,
  'season_bounds: décembre démarre le nouvel hiver (pas l''hiver en cours depuis janvier)'
);

select results_eq(
  $$ select period_start, period_end, label from public.season_bounds('2026-07-04'::date) $$,
  $$ values ('2026-06-01'::date, '2026-08-31'::date, 'Été 2026') $$,
  'season_bounds: juillet -> été calendaire complet'
);

select results_eq(
  $$ select period_start, period_end, label from public.season_bounds('2026-03-01'::date) $$,
  $$ values ('2026-03-01'::date, '2026-05-31'::date, 'Printemps 2026') $$,
  'season_bounds: 1er mars -> premier jour du printemps, borne incluse'
);

select results_eq(
  $$ select period_start, period_end, label from public.season_bounds('2026-11-30'::date) $$,
  $$ values ('2026-09-01'::date, '2026-11-30'::date, 'Automne 2026') $$,
  'season_bounds: dernier jour de l''automne, borne incluse'
);

-- ── rolling_quarter_bounds : trimestre glissant ancré sur la date du bilan ─────────────

select results_eq(
  $$ select period_start, period_end, label from public.rolling_quarter_bounds('2026-01-10'::date, '2026-01-10'::date) $$,
  $$ values ('2026-01-10'::date, '2026-04-09'::date, 'Trimestre 1 (depuis le 10/01/2026)') $$,
  'rolling_quarter_bounds: le jour même du bilan est dans le trimestre 1'
);

select results_eq(
  $$ select period_start, period_end, label from public.rolling_quarter_bounds('2026-01-10'::date, '2026-04-15'::date) $$,
  $$ values ('2026-04-10'::date, '2026-07-09'::date, 'Trimestre 2 (depuis le 10/01/2026)') $$,
  'rolling_quarter_bounds: 3 mois après le bilan -> trimestre 2'
);

-- Cas de bord qui justifie le correctif `if d < s_start then n := n - 1` dans la fonction :
-- un ancrage en fin de mois (31 janvier) où l'arithmétique d'intervalle Postgres écrête le
-- mois cible à son dernier jour (avril n'a que 30 jours) et peut faire tomber le calcul
-- naïf de bornes *après* la date courante.
select results_eq(
  $$ select period_start, period_end, label from public.rolling_quarter_bounds('2026-01-31'::date, '2026-04-15'::date) $$,
  $$ values ('2026-01-31'::date, '2026-04-29'::date, 'Trimestre 1 (depuis le 31/01/2026)') $$,
  'rolling_quarter_bounds: ancrage fin de mois -> pas de trimestre "futur" avant la date courante'
);

select results_eq(
  $$ select period_start, period_end, label from public.rolling_quarter_bounds('2026-01-31'::date, '2026-05-01'::date) $$,
  $$ values ('2026-04-30'::date, '2026-07-29'::date, 'Trimestre 2 (depuis le 31/01/2026)') $$,
  'rolling_quarter_bounds: même ancrage fin de mois, une fois le trimestre 2 réellement entamé'
);

select * from finish();
rollback;
