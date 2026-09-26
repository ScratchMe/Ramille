Enveloppe le titre d'un écran qui **en remplace un autre sous le doigt**, et y porte le focus en arrivant : « C’est envoyé, merci. » après « Envoyer », le calcul du bilan après « Voir mon bilan ».

```jsx
<TitreDArrivee>
  <ThemedText type="screenTitle">C’est envoyé, merci.</ThemedText>
</TitreDArrivee>
```

Le bouton pressé disparaît avec l'écran qui le portait, et le focus avec lui : sans ce composant, il retombe sur le document, la tabulation repart du haut et le lecteur d'écran n'annonce rien de ce qui vient d'arriver.

**Seulement sur un écran qui n'existe qu'après un geste.** Jamais sur une route qu'on charge ni sur un onglet qu'on retrouve : un focus qui se déplace sans geste arrache le lecteur d'écran à ce qu'il lisait. L'enveloppe n'est pas un second en-tête — le titre à l'intérieur garde son propre rôle.
