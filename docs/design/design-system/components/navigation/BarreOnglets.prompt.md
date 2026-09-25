Deux onglets et rien d’autre n’est un lieu. Le compte est derrière l’icône de BandeHaute.

```jsx
<BarreOnglets actif="plan" onChange={setOnglet} />
```

**Chaque onglet est une cible de 48 au moins, et c'est la barre qui la lui donne** (depuis le 24/09/2026) : 60 de haut, filet compris, moins deux marges de 4 (`Spacing.one`) — 51 px. Les marges de 8 et 12 d'avant ne laissaient que 39 px. L'onglet empile la pastille et le libellé depuis son haut. L'actif : pastille `accent` pleine, icône `onAccent`, libellé accent en 600 (voir `OngletIcone`).

La barre garde cette disposition verticale à toutes les largeurs. Ajout intentionnel : le dépôt la compose dans `src/app/(tabs)/_layout.tsx` via expo-router, sans composant à ce nom ; ici elle est un composant pour les kits.
