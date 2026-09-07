-- « Retrouver mon compte » (`/connexion/retrouver`, PR #57) n'émettait aucun événement, et
-- c'est le seul écran du produit dont **rien** ne garde trace côté `public` : `signInWithOtp`
-- n'écrit que dans `auth`, donc ni le passage sur l'écran, ni la demande de lien ne laissent
-- de ligne. La règle « on n'instrumente jamais ce que le schéma enregistre déjà » (v1-08) ne
-- s'applique donc pas ici — c'est le cas inverse.
--
-- Sans ces deux événements, la question ouverte de v1-10 §2.D (« le changement d'appareil,
-- est-ce rare ? ») ne peut pas recevoir de réponse, et c'est elle qui décide si la collision
-- Google (#60) mérite un écran dédié.
--
-- Sans cette ligne en base, l'insert est rejeté par la clé étrangère et l'événement est perdu
-- en silence — même mécanique que `emission_factor_sources`. Le miroir client obligatoire est
-- `src/types/analytics.ts`.
insert into public.usage_event_types (name, description)
values
  (
    'retrouver_view',
    'Affichage de « Retrouver mon compte », avec sa provenance et le fait que cet appareil portait déjà un bilan.'
  ),
  (
    'retrouver_send',
    'Demande d''un lien de connexion. Ne distingue pas une adresse connue d''une inconnue — le produit ne le sait pas non plus, et c''est voulu.'
  )
on conflict (name) do nothing;
