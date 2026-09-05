-- TraceVerte V1 — l'hybride manquait au choix de motorisation.
-- Réf. décision produit du 05/09/2026, à partir de la page ADEME « Calculer les émissions
-- carbone de vos trajets », qui distingue thermique / hybride / hybride rechargeable /
-- électrique là où le questionnaire n'offrait que deux réponses.
--
-- ## Ce n'est pas un raffinement, c'est un trou
--
-- Le questionnaire **obligeait** un propriétaire d'hybride à cocher « thermique » : on lui
-- faisait déclarer quelque chose de faux, et on lui rendait un chiffre calculé sur un véhicule
-- qui n'est pas le sien. C'est la différence avec les autres granularités possibles (taille du
-- véhicule, carburant essence/diesel), qui sont des précisions optionnelles sur une réponse
-- déjà juste — et qui restent volontairement hors du questionnaire, cf. §3.6 de v1-07.
--
-- ## Le chiffre est contre-intuitif, et c'est précisément pourquoi il faut le poser
--
-- Aux facteurs ACV relevés sur `impactco2.fr/api/v1/thematiques/ecv/transport` :
--
--   voiture thermique              0,142253   (fabrication 0,03170 + usage 0,11056)
--   voiture hybride                0,146579   (fabrication 0,03316 + usage 0,11342)
--   voiture hybride rechargeable   0,133900   (fabrication 0,04073 + usage 0,09317)
--   voiture électrique             0,067365   (fabrication 0,05528 + usage 0,01209)
--
-- **L'hybride non rechargeable émet plus que la thermique de référence** (+3 %). Ce n'est pas
-- une anomalie : la thermique générique de l'ADEME est une compacte diesel, sobre à l'usage, et
-- l'hybride ajoute une batterie à fabriquer sans jamais la recharger sur le réseau. Le
-- rechargeable, lui, gagne 6 %. Un produit qui range « hybride » du côté de l'électrique par
-- réflexe se tromperait donc de 10 % et dans le mauvais sens.
--
-- ## Quatre réponses au même niveau, pas une imbrication de plus
--
-- La question de motorisation est déjà une révélation imbriquée sur « voiture » (cf.
-- 20260904090000). On y ajoute deux puces sœurs plutôt qu'un second niveau « rechargeable ou
-- non ? » : la profondeur coûte bien plus cher en abandon qu'une puce supplémentaire, et les
-- deux hybrides sont assez éloignées (9,5 %) pour mériter d'être distinguées.
--
-- La règle de `CLAUDE.md` tient : ces modes n'apparaissent JAMAIS dans les listes de sélection
-- du questionnaire (`src/constants/transport-modes.ts`), seulement dans `MODE_PREPOSITION` de
-- la restitution, puisqu'ils peuvent être le `dominant_poste_mode`.

-- ── 1. Deux modes résolus de plus ──────────────────────────────────────────────────────

insert into public.transport_modes (id, label, category) values
  ('voiture_hybride', 'Voiture hybride', 'voiture'),
  ('voiture_hybride_rechargeable', 'Voiture hybride rechargeable', 'voiture')
on conflict (id) do nothing;

-- ── 2. Leurs facteurs, et la source pour la synchronisation trimestrielle ──────────────
-- Sans la ligne dans `emission_factor_sources`, le mode resterait figé à sa valeur de seed en
-- silence — c'est le défaut T3 de l'audit, et un test pgTAP garde ce point.
--
-- Note sur les slugs : les identifiants « génériques » de l'API (`voiturethermique`,
-- `voiturehybride`) sont en réalité les variantes **compactes** — `voiturethermique` vaut
-- exactement `voiture-compact-diesel`. Il n'existe pas de générique pour l'hybride
-- rechargeable, on prend donc `voiture-compact-hybriderechargeable` : c'est le même segment de
-- véhicule que les trois autres, la comparaison reste homogène.

insert into public.emission_factors (transport_mode_id, kg_co2_per_km, source, source_ref, valid_from) values
  ('voiture_hybride', 0.146579,
   'ADEME Base Empreinte — ACV complète (via API Impact CO2)',
   'impactco2:ecv/transport voiturehybride (relevé du 05/09/2026)', '2026-08-24'),
  ('voiture_hybride_rechargeable', 0.133900,
   'ADEME Base Empreinte — ACV complète (via API Impact CO2)',
   'impactco2:ecv/transport voiture-compact-hybriderechargeable (relevé du 05/09/2026)', '2026-08-24')
on conflict (transport_mode_id, valid_from) do nothing;

insert into public.emission_factor_sources (transport_mode_id, impactco2_slugs, note) values
  ('voiture_hybride', array['voiturehybride'],
   'Hybride non rechargeable. Émet plus que la thermique de référence (0,146579 contre 0,142253) : batterie à fabriquer, jamais rechargée sur le réseau.'),
  ('voiture_hybride_rechargeable', array['voiture-compact-hybriderechargeable'],
   'Pas de slug générique côté API pour ce cas ; la variante compacte est le même segment que les trois autres motorisations, dont les slugs « génériques » sont eux aussi les compactes.')
on conflict (transport_mode_id) do nothing;

-- ── 3. Le questionnaire accepte les deux nouvelles réponses ────────────────────────────

alter table public.assessment_answers
  drop constraint if exists assessment_answers_commute_car_engine_check,
  drop constraint if exists assessment_answers_leisure_car_engine_check,
  drop constraint if exists assessment_answers_car_long_trips_engine_check;

alter table public.assessment_answers
  add constraint assessment_answers_commute_car_engine_check
    check (commute_car_engine in ('thermique', 'hybride', 'hybride_rechargeable', 'electrique')),
  add constraint assessment_answers_leisure_car_engine_check
    check (leisure_car_engine in ('thermique', 'hybride', 'hybride_rechargeable', 'electrique')),
  add constraint assessment_answers_car_long_trips_engine_check
    check (car_long_trips_engine in ('thermique', 'hybride', 'hybride_rechargeable', 'electrique'));

-- ── 4. La résolution du mode ───────────────────────────────────────────────────────────
-- Corps étendu, contrat inchangé : un moteur non renseigné retombe toujours sur le générique
-- `voiture`, et un mode qui n'est pas une voiture n'est jamais affecté.

create or replace function public.resolve_car_mode(p_mode_id text, p_engine text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_mode_id <> 'voiture' then p_mode_id
    when p_engine = 'electrique' then 'voiture_electrique'
    when p_engine = 'hybride' then 'voiture_hybride'
    when p_engine = 'hybride_rechargeable' then 'voiture_hybride_rechargeable'
    when p_engine = 'thermique' then 'voiture_thermique'
    else p_mode_id
  end;
$$;

grant execute on function public.resolve_car_mode(text, text) to authenticated, anon;
