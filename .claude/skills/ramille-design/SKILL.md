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
code, le code gagne.

**Le kit se synchronise depuis le 24/09/2026** (décision de la personne qui pilote,
`docs/architecture/v1-29-challenge-du-design-system.md` §5) : il était une photographie datée, il
devient un miroir tenu. Une PR qui change un jeton ou une règle du kit le met à jour elle-même ; ce
qui reste à rattraper — des composants absents, le catalogue des 38 écrans qui reprend le handoff V1
et ses écrans à mot de passe (v1-10 §2.D), l'exemple « Le mot de passe doit contenir au moins 8
caractères » du readme — est inventorié dans cette §5, avec la commande qui refait le relevé.

Les `.jsx` du kit sont des recréations web : on y lit des valeurs, on ne les importe jamais dans
`src/`. Jetons plutôt que valeurs en dur ; chaque couleur dans les deux thèmes ; aucun jugement,
aucune mécanique d'échec ; Ramille ne dit jamais un nombre et ne se tient jamais près d'un chiffre
lourd ; cinq expressions, pas une de plus ; deux onglets.
