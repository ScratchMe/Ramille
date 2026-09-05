-- Retrait de l'événement `plan_action_open` du référentiel.
--
-- Il avait été déclaré en prévision de l'étape 6b (choisir une action et s'y engager), mais
-- l'écran du plan n'a aujourd'hui aucune interaction par action : rien ne l'émet. Un
-- événement déclaré et jamais émis ne se lit pas « pas encore instrumenté », il se lit
-- **zéro** — c'est-à-dire comme un fait sur les utilisateurs. La liste ne doit contenir que
-- ce que le produit émet vraiment ; 6b le réintroduira avec l'interaction qui le justifie.
delete from public.usage_event_types where name = 'plan_action_open';
