L'écart entre les deux derniers bilans, poste par poste — posé dans le suivi, sous « Par poste », dans un panneau `backgroundElement`.

```jsx
<EcartParPoste ecarts={[
  { poste: 'commute', precedentKg: 1480, courantKg: 1120, dominant: true },
  { poste: 'travel', precedentKg: 600, courantKg: 980, dominant: false },
  { poste: 'leisure', precedentKg: 310, courantKg: 290, dominant: false },
]} />
```

**Le total seul cachait l'essentiel** : un effort tenu tout l'hiver sur le trajet quotidien disparaît derrière un vol de l'été. D'où les postes, chacun avec « avant → maintenant » en chiffres tabulaires (en kilos sous la tonne), une barre en **contour** pour le bilan précédent et une barre **pleine** pour celui-ci.

Trois choses à ne pas défaire : **l'échelle est commune** à toutes les barres (une échelle par poste rendrait 40 kg aussi long que 2 t) ; **l'accent suit le poste du plan**, le dominant du bilan courant, pas forcément le plus lourd — les autres sont en `accentMuted` ; et **aucune hiérarchie morale** — ni flèche verte ou rouge, ni « bien » ou « à améliorer ». La légende dit ce que chaque forme veut dire et nomme le poste qui porte l'accent ; les barres sont masquées au lecteur d'écran.
