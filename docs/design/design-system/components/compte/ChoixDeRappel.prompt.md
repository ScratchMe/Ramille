Les indisponibilités disent pourquoi (dans le détail), et sur web la ligne notification n’existe pas plutôt que d’être grisée.

```jsx
<ChoixDeRappel canal="push" />
```

**La ligne est `LigneDeCanal`, plus une ChoiceRow avec un détail** (depuis le 24/09/2026) : une seule ligne dans le dépôt pour ses deux écrans, ce bloc et la feuille des rappels (`src/components/ligne-de-canal.tsx`). Elle est absente du kit ; ce composant et `FeuilleRappels` la rendent à l'identique en attendant. Un `radio`, annoncé avec son titre et son détail.

**Une ligne hors d'atteinte ne paraît jamais choisie** : « Par email » sans compte, grisé mais cerné d'accent, disait à la fois « indisponible » et « c'est ton réglage ». Ce qui paraît coché est ce qui partira vraiment ; si la préférence enregistrée ne peut rien envoyer, aucune ligne ne l'est.

Le `radiogroup` ne porte que les lignes, nommé par l'en-tête « Les rappels » ; le lien « Ouvrir les réglages du téléphone » se rend juste sous la ligne qui le porte, et seulement quand les notifications sont coupées côté système. Sur « Toi », la porte « Rattacher un compte » n'est pas rendue : le bouton du compte est juste au-dessus.

Une ligne hors d'atteinte garde son fond, passe son titre en texte tertiaire et laisse son détail — la phrase qui dit pourquoi — en texte secondaire : jamais une opacité, qui faisait tomber ce détail vers 3,2:1. Le dépôt portait une opacité de 0,6 jusqu'au 25/09/2026, contre la règle du readme ; c'est le code qui a suivi la règle (`v1-29` §5).
