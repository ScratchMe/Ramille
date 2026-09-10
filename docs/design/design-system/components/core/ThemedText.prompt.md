Tout texte du produit passe par ThemedText : le `type` fixe taille/interligne/poids, `themeColor` la couleur (jamais un hexa).

```jsx
<ThemedText type="screenTitle">Ton plan</ThemedText>
<ThemedText type="body" themeColor="textSecondary">Deux actions liées à ton trajet domicile-travail.</ThemedText>
```

Types adossés à TypeScale : screenTitle 26/32, salient 30/36, cardTitle 17/24, body 15/22. `default` 16/24, `small` 14/20, `code` mono 12. `weight` surcharge le poids par défaut.
