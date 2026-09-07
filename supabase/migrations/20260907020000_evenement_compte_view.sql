-- L'écran « Toi » (`/compte`) sort du suivi et devient une destination à part entière
-- (v1-11 lot 2). Sans cette ligne, l'insert est rejeté par la clé étrangère et l'événement
-- serait perdu en silence — même mécanique que `emission_factor_sources`.
--
-- Il mesure un fait qu'aucune table n'enregistre : l'ouverture d'un écran. Les faits que le
-- schéma porte déjà (un bilan soumis, un check-in répondu, un retour envoyé) n'ont jamais
-- d'événement.
insert into public.usage_event_types (name, description)
values ('compte_view', 'Ouverture de l''écran « Toi » depuis l''icône de compte.')
on conflict (name) do nothing;
