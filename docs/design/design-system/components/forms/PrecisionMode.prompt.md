Une question de précision, posée dans `BoiteDePrecision`, immédiatement sous le choix qui la déclenche — jamais après la liste.

```jsx
<BoiteDePrecision>
  <PrecisionMode champ="commute_car_engine" question="Quelle motorisation ?" options={[{value:'thermique',label:'Thermique'},{value:'hybride',label:'Hybride'}]} valeur="thermique" onChange={setMotorisation} />
</BoiteDePrecision>
```

**Elle ne dessine pas de boîte** (29/09/2026) : elle est un intitulé et son groupe. La boîte, son dépli et ses marges sont ceux de `BoiteDePrecision`, qui en porte une ou deux — sous « Voiture (covoiturage) », la motorisation puis combien vous êtes, dans la même boîte.

**L’intitulé** en small `textSecondary`, 8 au-dessus des réponses ; les réponses en `ModeListItem` sur le fond de la page (`nestedBackground`), 48 de haut, **à 4 l’une de l’autre**.

Rangées, pas des puces : les libellés inégaux (« Hybride rechargeable ») feraient un escalier. Les réponses sont un `radiogroup` nommé par la question : « Électrique » annoncé seul ne dit pas qu'il répond à « Quelle motorisation ? ».

**`champ` dit ce qu’elle renseigne** : au toucher du « Suivant » en attente, si c’est elle qui manque, l’écran y défile, le focus va à sa réponse cochée ou à la première, et l’intitulé passe en `accentText` 600 (`IntituleDuChamp`). Jamais avant le toucher.
