Saisie d’un nombre avec unité (B1.3 distance aller). Bordure accent permanente, pas seulement au focus.

```jsx
<NumericField value={12} unit="km" label="Distance d’un aller" />
```

Sous le champ, un TextLink « Je ne sais pas » ouvre le repli par tranche.

La virgule est un séparateur décimal : « 3,5 » vaut 3,5 et jamais 35. Ne jamais filtrer la
saisie sur `[^0-9]` — c'est le défaut que le dépôt a corrigé (`saisieVersNombre`,
`src/types/bilan.ts`), et il porte sur le poste le plus lourd de la plupart des bilans.
