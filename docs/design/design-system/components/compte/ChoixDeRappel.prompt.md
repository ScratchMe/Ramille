Les indisponibilités disent pourquoi (dans le détail), et sur web la ligne notification n’existe pas plutôt que d’être grisée.

```jsx
<ChoixDeRappel canal="push" />
```

**La ligne est `LigneDeCanal`, plus une ChoiceRow avec un détail** (depuis le 24/09/2026) : une seule ligne dans le dépôt pour ses deux écrans, ce bloc et la feuille des rappels (`src/components/ligne-de-canal.tsx`). Elle est absente du kit ; ce composant et `FeuilleRappels` la rendent à l'identique en attendant. Un `radio`, annoncé avec son titre et son détail.

**Une ligne hors d'atteinte ne paraît jamais choisie** : « Par email » sans compte, grisé mais cerné d'accent, disait à la fois « indisponible » et « c'est ton réglage ». Ce qui paraît coché est ce qui partira vraiment ; si la préférence enregistrée ne peut rien envoyer, aucune ligne ne l'est.

Le `radiogroup` ne porte que les lignes, nommé par l'en-tête « Les rappels » ; le lien « Ouvrir les réglages du téléphone » se rend juste sous la ligne qui le porte, et seulement quand les notifications sont coupées côté système. Sur « Toi », la porte « Rattacher un compte » n'est pas rendue : le bouton du compte est juste au-dessus.

Une ligne hors d'atteinte est à l'opacité 0,6 dans le dépôt, ce que la règle du readme (« jamais une opacité ») interdit. La contradiction est ouverte (`v1-29` §5) : elle ne se tranche pas ici.
