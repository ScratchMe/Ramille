Tout texte du produit passe par ThemedText : le `type` fixe taille/interligne/poids, `themeColor` la couleur (jamais un hexa).

```jsx
<ThemedText type="screenTitle">Ton plan</ThemedText>
<ThemedText type="body" themeColor="textSecondary">Une action par saison, une seule. C’est pas à pas qu’on tient un cap.</ThemedText>
<ThemedText type="small" weight={600} accessibilityRole="header">Mes données</ThemedText>
```

Types adossés à TypeScale : display 32/38, screenTitle 26/32, salient 30/36, cardTitle 17/24, body 15/22. `default` 16/24, `small` 14/20, `code` mono 12. `weight` surcharge le poids par défaut.

**Les titres s'annoncent en en-têtes par leur type, avec leur niveau** : `title`, `screenTitle` et `display` au niveau 1 (le titre de l'écran), `subtitle` et tout texte déclaré `accessibilityRole="header"` au niveau 2 (une section). `headingLevel` pour l'exception — le `subtitle` de `CalculEnCours`, seul titre de son écran, est au niveau 1. Le nom de la bande haute n'est pas un en-tête : il situe, il ne commence rien.

**`code`, la chasse fixe, est pour les sources et les codes techniques seulement** — une référence (« SDES, données 2017 · cible 2050 : ADEME »), un nom de variable d'environnement, la cause technique d'un échec à recopier. Jamais une phrase adressée à la personne : « Ton mode n’est pas dans la liste ? » est en Spline Sans.

**Les espaces insécables se posent au rendu** : avant `?`, `!`, `:`, `;` et dans les guillemets, U+00A0 (et non l'espace fine, trop étroite dans Spline Sans). Le texte s'écrit avec une espace ordinaire ; ce qui s'affiche hors de ThemedText ne les reçoit pas.
