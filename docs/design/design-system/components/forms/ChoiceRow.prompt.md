Liste de choix exclusifs en rangées : rôle radio, sélection = teinte + bordure accent 1,5 px + poids 600. La série vit dans un `radiogroup` nommé par sa question.

```jsx
<ChoiceRow label="Oui" selected />
<ChoiceRow label="Non" selected={false} />
```

Un libellé, rien d'autre. Sous le doigt, la rangée prend sa teinte appuyée tout de suite : `backgroundPressed`, ou `backgroundSelectedPressed` si elle est choisie.

**La ligne du canal de rappel n'est pas une ChoiceRow** (depuis le 24/09/2026) : titre, détail et état inactif, c'est `LigneDeCanal`, une seule ligne pour ses deux écrans (`ChoixDeRappel` et `FeuilleRappels`).
