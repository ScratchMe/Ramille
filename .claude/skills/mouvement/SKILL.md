---
name: mouvement
description: Le mouvement dans Ramille — ce qui s'anime, comment, avec quels jetons, ce que devient chaque animation sous « réduire les animations », et ce qui ne bouge jamais. À appeler avant d'ajouter, de retoucher ou de juger une transition, sur Android comme sur web.
disable-model-invocation: true
---

# Le mouvement dans Ramille

Décidé le 27/09/2026 avec la personne qui pilote ; le chantier, ses raisons et son état vivent dans
`docs/architecture/v1-30-les-transitions.md`. Ce skill en garde ce qui sert **à chaque fois qu'on
touche une animation**. Les règles du dépôt passent devant celles d'un plug-in (`CLAUDE.md`), et
celles-ci en particulier devant `hzblj-skills` (voir la fin).

## Le principe

**Une animation dit ce qui se passe, ou elle n'est pas là.** Le kit l'écrit « rare et
signifiante » : un contenu qui arrive dit d'où il vient, une surface qui s'ouvre dit qu'elle est
par-dessus, ce qui disparaît laisse le reste se remettre en place sans sauter. Rien ne bouge pour
décorer.

Six règles, reprises en nos mots des principes de transitions.dev (§3.1 de `v1-30`) — **aucun de
ses extraits n'est dans ce dépôt, et aucun ne doit y entrer** : ses conditions interdisent de
republier sa collection, et ils ne valent que pour le web.

1. **Une sortie va plus vite qu'une entrée.** On ouvre pour montrer, on ferme pour s'effacer.
2. **Jamais de rebond ni de délai sur une sortie**, qui doit se sentir immédiate.
3. **Le dépassement est réservé aux entrées** — et chez Ramille, à l'écran de lancement seul.
4. **Les distances restent courtes** : 8 px pour un contenu qui glisse. Au-delà d'une quarantaine de
   pixels, tout ce qui n'est pas une surface entière (feuille, barre) paraît lent.
5. **Un enchaînement d'éléments tient sous 300 ms au total**, sinon le dernier arrive en retard.
6. **Si c'est lent, on raccourcit la durée**, on n'ajoute pas de délai.

## Les jetons

`Mouvement` dans `src/constants/theme.ts`, recopié dans le kit
(`docs/design/design-system/tokens/mouvement.css`) — un jeton qui change se change aux deux endroits.

| Jeton | Valeur | Pour |
|---|---|---|
| `entree` | 250 ms | un contenu qui arrive |
| `entreeDeFeuille` | 280 ms | une feuille qui monte |
| `entreeDeBarre` | 320 ms | la barre d'onglets qui arrive (canevas de C5.7) |
| `fondu` | 200 ms | ce qui apparaît en place |
| `sortie` | 200 ms | ce qui redescend ou se replie |
| `sortieBreve` | 150 ms | le fondu d'une sortie |
| `deplacement` | 8 px | ce qu'un contenu parcourt |
| `courbe` | `[0.22, 1, 0.36, 1]` | la « sortie douce », partout |

La courbe est quatre nombres : `Easing.bezier(...Mouvement.courbe)` pour reanimated comme pour
`Animated`, `cubicBezier(...)` pour une CSS transition de reanimated.

## « Réduire les animations » — la règle qui ne se négocie pas

Toute animation dit ce qu'elle devient sous la préférence, et **sous la préférence, tout se pose** :
l'état final, dès la première image. Trois cas, et seul le premier est gratuit :

1. **`withTiming` et les animations de disposition de reanimated** (`entering`, `exiting`,
   `LinearTransition`) la suivent d'eux-mêmes (`ReduceMotion.System`). On l'écrit quand même,
   `reduceMotion: ReduceMotion.System`, comme `src/components/mascot.tsx`.
2. **`Animated` de React Native, les CSS transitions de reanimated, le `Modal` de react-native-web**
   l'ignorent — vérifié dans leur source. Leur durée passe par `dureeSelonLaPreference`
   (`src/types/mouvement.ts`) avec `useReducedMotion()`.
3. **Un rappel de fin d'animation** (démonter après une sortie) doit partir aussi sous la
   préférence, immédiatement : ça se vérifie par une garde, pas au raisonnement.

`useReducedMotion()` n'est lu **qu'au démarrage** de l'app : pour éprouver la préférence, on relance
(sur l'appareil) ou on recharge après `page.emulateMedia({ reducedMotion: 'reduce' })` (Playwright).

## Ce qui ne bouge jamais

- **L'état pressé** : une teinte immédiate, sans animation, ni rétrécissement, ni ripple, ni vibration
  (décision n° 6 de `docs/architecture/v1-29-challenge-du-design-system.md`, `FRONT.md` §2.4). Sur
  Android, on ne savait pas si l'appui avait été pris ; une animation de 100 ms le remettrait en doute.
- **Les chiffres** : jamais un compteur qui défile. Il afficherait des valeurs fausses en chemin, et
  ce serait une célébration.
- **Aucune célébration, aucun confetti, aucun son.**
- **Les navigations de pile** : l'animation du système sur Android, rien sur web (« standard
  plateforme »).
- **Le focus** : il part au geste, jamais à la fin d'une animation. Une transition ne retarde ni
  n'empêche l'annonce d'une étape ou d'une réplique.

## Ce qu'on vérifie avant de dire qu'une transition marche

- La dérivation qui la décide est dans `src/types/mouvement.ts` (ou à côté), testée, et chaque garde
  éprouvée en la cassant (`TESTING.md` §1.1).
- **Elle est regardée image par image**, avec et sans la préférence : `v1-30` §10 dit comment filmer
  le parcours réel et le découper. Un test vert ne dit pas qu'une animation est belle, ni qu'elle
  n'en coupe pas une autre.
- Sur web, une garde la mesure : `scripts/verifier-etats-export.mjs` pour ce qui se voit sans réseau,
  `scripts/verifier-parcours-reel.mjs` pour le reste.
- **Sur Android, seul l'appareil le dit** : dans les deux états de « Supprimer les animations », app
  relancée à chaque fois (`RECETTE.md`).

## Ce que `hzblj-skills` dit autrement

Ce plug-in est installé en mode manuel (`v1-30` §5.2). Ses fiches reanimated sont une bonne lecture ;
trois de ses consignes contredisent Ramille et ne s'appliquent pas ici :

- `hzblj-skills-ui-interactions` et `hzblj-skills-native-feel` : rétrécissement à 0,96 sous le doigt,
  `android_ripple`, vibrations — contraires à l'état pressé ci-dessus ; cibles de 44 px, là où
  Ramille est à 48 ; thème sombre, reporté après le lancement ;
- son `/polish`, qui appliquait tout cela d'office, n'a pas été installé.
