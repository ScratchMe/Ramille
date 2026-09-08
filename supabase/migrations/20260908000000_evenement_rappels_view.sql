-- v1-12, PR 2 — un événement d'usage, et un seul, pour la feuille des rappels.
-- Réf. docs/architecture/v1-12-rappels.md §4.6.
--
-- **Ce qu'on n'instrumente pas, et pourquoi.** Le canal choisi vit dans
-- `profiles.reminder_channel`, la permission accordée dans `push_tokens` : les compter en
-- plus serait le doublon que v1-08 interdit — deux chiffres qui divergent le jour où l'un
-- des chemins échoue. La mesure du chantier est le rapport entre les feuilles vues et les
-- préférences `push` portant un jeton, et il se calcule entièrement avec ce qui est déjà en
-- base.
--
-- Un événement déclaré qu'aucun code n'émet se lit **zéro**, pas « pas encore instrumenté » :
-- l'entrée correspondante dans `src/types/analytics.ts` fait partie de la même livraison.
insert into public.usage_event_types (name, description) values
  ('rappels_view', 'La feuille de proposition des rappels s''est affichée, après un engagement sur une action.')
on conflict (name) do nothing;
