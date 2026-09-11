-- v1-13, chantier C1.13 — trois valeurs que rien n'atteint, et une branche dormante qu'on nomme.
-- Constats A8-18 (`detail_kind`) et A8-16 (`cadence_type`).
--
-- ── 1. `action_templates.detail_kind` : trois valeurs inatteignables, et masquantes ──────────
--
-- La contrainte énumérait six valeurs. Les trois qui concernent les voyages — `flights_short`,
-- `flights_long`, `car_long_trips` — ne peuvent pas être atteintes : dans
-- `estimate_action_savings`, la branche `travel` construit `v_detail` elle-même avec
-- `format(...)` (« Sur 3 vols court ou moyen-courrier déclarés. »), et le `case t.detail_kind`
-- qui vient ensuite est gardé par `if v_detail is null`. Les trois templates de voyages
-- portaient pourtant ces valeurs en base.
--
-- Ce n'est pas cosmétique. Une valeur déclarée que rien n'atteint ne se lit pas « prévue », elle
-- se lit comme un chemin existant — même mécanique que `plan_action_open`, retiré du référentiel
-- d'événements pour cette raison exacte (v1-08 §2). Ici elle fait pire : elle **masque**. Un
-- futur template de voyages portant un `detail_kind` neuf recevrait quand même le détail
-- générique du segment, donc le champ promet un point de personnalisation qui n'existe pas.
--
-- **Des deux issues possibles, on retire plutôt qu'on branche.** Faire passer les détails de
-- voyages par le `case` l'obligerait à lire `v_count`, une variable locale calculée dans la
-- branche : le `case` deviendrait un troisième endroit où se lit la logique de segment, soit
-- l'inverse du bénéfice cherché. Le poste voyages construit son propre détail, et c'est
-- désormais écrit sur la colonne plutôt que suggéré par une valeur morte.
--
-- L'ordre compte : les lignes d'abord, la contrainte ensuite. L'inverse échouerait sur les
-- trois lignes existantes.

update public.action_templates
set detail_kind = null
where detail_kind in ('flights_short', 'flights_long', 'car_long_trips');

alter table public.action_templates
  drop constraint if exists action_templates_detail_kind_check;

alter table public.action_templates
  add constraint action_templates_detail_kind_check
    check (detail_kind is null or detail_kind in ('commute_days', 'commute_distance', 'leisure_frequency'));

comment on column public.action_templates.detail_kind is
  'Gabarit de la phrase de détail, pour les postes qui en délèguent la construction au case final d''estimate_action_savings. Le poste voyages n''en est pas : sa branche construit son propre détail (« Sur 3 vols long-courrier déclarés. ») avant d''atteindre ce case, qui est gardé par « if v_detail is null ». Un template de voyages laisse donc ce champ à null — lui donner une valeur ne changerait rien, en silence. Les trois valeurs de voyages ont été retirées de la contrainte par la migration qui pose ce commentaire, pour cette raison (A8-18).';

-- ── 2. `profiles.cadence_type` = « rolling_quarter » : une branche entretenue, jamais empruntée ─
--
-- La colonne décide entre saisons météorologiques (v1-03 §2) et trimestre glissant ancré sur la
-- date du bilan. Toute la chaîne serveur existe et est testée — `rolling_quarter_bounds`, le
-- branchement de `generate_plan_cycle_for_user`, le snapshot `plan_cycles.cadence_type`, quatre
-- assertions du test 00 et le scénario B du test 02 — mais **aucun écran ne l'écrit ni ne la
-- lit** : les 19 profils de la base valent tous `season`, la valeur par défaut (relevé le
-- 11/09/2026).
--
-- `v1-01` la qualifiait de « paramètre réservé pour la brique 3, stocké dès maintenant pour ne
-- pas migrer le profil plus tard ». La brique 3 est livrée depuis `v1-03`, et rien ne disait
-- pourquoi le réglage n'a jamais été ouvert : c'est cette phrase-là qui manquait, ici et dans
-- CLAUDE.md. Le handoff design le prévoit (`docs/design/README.md`, puce « Cadence : saison —
-- été »), donc l'ouvrir dans « Toi » serait une décision produit et non une invention.
--
-- Tant qu'elle n'est pas prise, la dormance se **consigne**, elle ne se supprime pas : une
-- branche dormante qu'on décrit ne se lit plus comme un oubli, et ne se retire pas par réflexe
-- au prochain balayage de code mort.

comment on column public.profiles.cadence_type is
  'Cadence du plan de réduction : « season » (blocs de 3 mois calendaires, v1-03 §2) ou « rolling_quarter » (trimestre glissant ancré sur la date du bilan). MÉCANISME DORMANT : la chaîne serveur est complète et testée, mais aucun écran n''écrit ni ne lit cette colonne, et tous les profils valent « season » (relevé le 11/09/2026). Ouvrir le réglage dans « Toi » reste une décision produit ouverte (v1-13, C1.13) — ne pas retirer la branche en la prenant pour du code mort.';
