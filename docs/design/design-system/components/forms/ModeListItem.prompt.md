Liste des modes (B1.4, B2.2) et sous-listes imbriquées. Plus compact que ChoiceRow (14/16), dans un `radiogroup` nommé par sa question.

```jsx
<ModeListItem label="Voiture (seul)" selected />
<ModeListItem label="Hybride" selected={false} nestedBackground />
```

Le rayon 14 est `Radius.chip`, partagé avec les puces depuis le 24/09/2026 — ne pas l’aligner sur 16. Sous le doigt : `backgroundPressed`, ou `backgroundSelectedPressed` si l'item est choisi, qu'il soit posé sur blanc ou sur gris.
