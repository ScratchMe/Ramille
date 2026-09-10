---
name: ramille-design
description: Design system de Ramille — jetons, composants, voix de la mascotte, règles non négociables — à lire avant de créer ou modifier un écran, un composant, une maquette ou un visuel du produit.
---

Lire `docs/design/design-system/readme.md`, puis ce qu'il indexe : `tokens/` (couleurs dans les
deux thèmes, typographie, espacements), `guidelines/` (quatorze cartes de fondations),
`components/<groupe>/*.prompt.md` (l'usage attendu de chaque composant du dépôt). Le canvas le
plus récent est `docs/design/v1-14-boucle-engagement/` (README, HANDOFF, captures).

**La vérité du code reste le dépôt** : `src/constants/theme.ts`, `src/components/**`,
`src/constants/mascotte.ts`, `src/types/mascot.ts` et CLAUDE.md. En cas d'écart entre le kit et le
code, le code gagne, et l'écart se consigne dans le README du canvas concerné. Deux points du kit
sont périmés dès sa livraison (10/09/2026) : le catalogue des 38 écrans reprend le handoff V1, dont
des écrans à mot de passe qui n'existent plus (v1-10 §2.D), et l'exemple « Le mot de passe doit
contenir au moins 8 caractères » du readme n'a pas d'équivalent dans le produit.

Les `.jsx` du kit sont des recréations web : on y lit des valeurs, on ne les importe jamais dans
`src/`. Jetons plutôt que valeurs en dur ; chaque couleur dans les deux thèmes ; aucun jugement,
aucune mécanique d'échec ; Ramille ne dit jamais un nombre et ne se tient jamais près d'un chiffre
lourd ; cinq expressions, pas une de plus ; deux onglets.
