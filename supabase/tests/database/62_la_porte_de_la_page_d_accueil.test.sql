-- Tests pgTAP : le référentiel des événements dit la neuvième porte de `/connexion/retrouver`,
-- « J'ai déjà un compte » de la page d'accueil du web (étape 5 de
-- `docs/architecture/v1-35-l-audit-en-chantiers.md`, migration
-- `20261023220000_la_porte_de_la_page_d_accueil.sql`).
--
-- **Ce que ce fichier garde.** `retrouver_view` porte `props.source`, que la base ne valide pas : la
-- description du référentiel est le seul endroit où ses valeurs sont dites, et rien ne la compare à
-- `SOURCES_RETROUVER` (`src/types/analytics.ts`). Le contrôle de la migration la vérifie une fois, à
-- l'application ; ce fichier la vérifie à chaque PR, contre une migration plus récente qui la réécrirait
-- sans la porte `accueil`.
--
-- **Éprouvé en le cassant, le 23/10/2026** — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

select ok(
  (select description like '%« accueil » (le même lien sur la page d''accueil du web%'
     from public.usage_event_types where name = 'retrouver_view'),
  'la description de retrouver_view dit la porte « accueil », la page d''accueil du web'
);

select ok(
  (select description like '%neuf portes%' and description not like '%huit portes%'
     from public.usage_event_types where name = 'retrouver_view'),
  'la description de retrouver_view compte neuf portes'
);

-- `onboarding` désignait « l'accueil » de l'onboarding ; le mot nomme désormais la page d'accueil du web.
select ok(
  (select description like '%« onboarding » (« J''ai déjà un compte » sur la première page de l''onboarding)%'
     from public.usage_event_types where name = 'retrouver_view'),
  'la porte « onboarding » se dit la première page de l''onboarding, et non plus l''accueil'
);

select * from finish();
rollback;

-- Relevé des mutations, le 23/10/2026, chacune posée sur la stack locale puis ce fichier rejoué, la
-- description restaurée ensuite (par la migration, puis comparée à l'identique) :
--   - la description rendue à son texte d'avant (`20260920170000`) → 1, 2 et 3 ;
--   - la seule porte « accueil » retirée du texte → 1, seule.
