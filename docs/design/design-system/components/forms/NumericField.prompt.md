Saisie d’un nombre avec unité (B1.3 distance aller).

```jsx
<NumericField value={12} unit="km" label="Distance d’un aller" />
```

**Le contour suit la règle des autres champs** (depuis le 24/09/2026) : `fieldBorder` au repos, qui ressort à 3,45:1 sur le blanc, et l'accent une fois un nombre saisi, à la même épaisseur (`Stroke.field`, 1,5). La bordure accent permanente de la maquette disait « rempli » d'un champ vide.

Le chiffre est en Spline Sans 28/600, à chiffres tabulaires : il ne se tasse ni ne s'élargit à chaque frappe. L'unité à droite, en 17/24 tertiaire.

Sous le champ, un TextLink « Je ne sais pas » ouvre le repli par tranche.

La virgule est un séparateur décimal : « 3,5 » vaut 3,5 et jamais 35. Ne jamais filtrer la
saisie sur `[^0-9]` — c'est le défaut que le dépôt a corrigé (`nettoyerSaisieNumerique` et
`saisieVersNombre`, `src/types/bilan.ts`), et il porte sur le poste le plus lourd de la plupart
des bilans. Le clavier est décimal, pour que la virgule soit à portée.
