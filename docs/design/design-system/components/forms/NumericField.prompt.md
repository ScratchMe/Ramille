Saisie d’un nombre avec unité (B1.3 distance aller).

```jsx
<NumericField value={12} unit="km" label="Distance d’un aller" />
```

**Le contour suit la règle des autres champs** (depuis le 24/09/2026) : `fieldBorder` au repos, qui ressort à 3,45:1 sur le blanc, et l'accent une fois un nombre saisi, à la même épaisseur (`Stroke.field`, 1,5). La bordure accent permanente de la maquette disait « rempli » d'un champ vide.

Le chiffre est en Spline Sans 28/600, à chiffres tabulaires : il ne se tasse ni ne s'élargit à chaque frappe. L'unité à droite, en 17/24 tertiaire.

**Vide, le champ ne montre rien dedans** (01/10/2026, `v1-33` D8) : il portait un « 0 » gris, à la taille et à la graisse d'un nombre saisi, et « 0 km » se lisait comme une valeur — la seule que le champ refuse, une distance de 0 n'étant pas une réponse. L'intitulé de la question et l'unité « km » disent ce qu'on attend ; le contour au repos (`fieldBorder`, 3,45:1) dit qu'il y a un champ ; le focus y met le curseur. Pas de placeholder, et ce n'est pas un oubli à réparer.

Sous le champ, un TextLink « Je ne sais pas » ouvre le repli par tranche.

La virgule est un séparateur décimal : « 3,5 » vaut 3,5 et jamais 35. Ne jamais filtrer la
saisie sur `[^0-9]` — c'est le défaut que le dépôt a corrigé (`nettoyerSaisieNumerique` et
`saisieVersNombre`, `src/types/bilan.ts`), et il porte sur le poste le plus lourd de la plupart
des bilans. Le clavier est décimal, pour que la virgule soit à portée — sauf sous `entier` (un compte,
`ChampDuPlafond`) : clavier sans décimale, partie entière de ce qui est tapé, et le libellé annoncé seul.

**Au focus, la bordure passe à l'accent — et l'anneau du navigateur suit le cadre** (01/10/2026, `cadreDuChamp`). Le kit écrivait « champ rempli ou focus = bordure accent » et le code ne le faisait qu'au remplissage. Mais l'accent seul ne dit pas le focus : gris contre vert, le changement ne tient qu'à 1,78:1 (`fieldBorder` contre `accent`), sous les 3:1 d'un état qui passe par la couleur, et nul sur un champ déjà rempli. L'anneau de focus ne part donc pas : il quitte l'`<input>`, où il dessinait un rectangle dans le champ arrondi, pour le cadre arrondi — comme le champ du retour le montrait déjà. Même anneau que tout contrôle du produit sur web (`outline: auto`), au contraste du navigateur ; rien ne bouge.
