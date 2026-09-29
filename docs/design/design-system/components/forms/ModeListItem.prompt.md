Liste des modes (B1.4, B2.2), « Lequel ? » et les réponses d’une précision, dans un `radiogroup` nommé par sa question.

```jsx
<ModeListItem label="Voiture (seul)" selected />
<ModeListItem label="Hybride" selected={false} nestedBackground />
```

**48 de haut, la cible, et un minimum** (`ControlHeight.target`, 29/09/2026) : rembourrage 4/16, libellé 16/22 centré dans la hauteur. Neuf rangées de 53 débordaient sous le pied dès qu’une précision s’ouvrait ; à 48, neuf modes tiennent sous la question à 390 × 844 comme à 360 × 800. Un libellé agrandi par la taille de police du système fait grandir la rangée au lieu de déborder.

**Les écarts sont ceux de la liste, pas de l’item** : 4 entre deux modes d’une même famille, 16 entre deux familles, 4 entre deux réponses d’une précision.

Le rayon 14 est `Radius.chip`, partagé avec les puces depuis le 24/09/2026 — ne pas l’aligner sur 16. Choisi : `backgroundSelected`, trait 1,5 `accent`, libellé 600. Sous le doigt : `backgroundPressed`, ou `backgroundSelectedPressed` si l'item est choisi, qu'il soit posé sur blanc ou sur gris.
