Deux icônes seulement : plan (coche + ligne) et suivi (courbe + point). Pas de bibliothèque d’icônes.

```jsx
<OngletIcone nom="plan" focused />
<OngletIcone nom="suivi" focused={false} color="var(--color-text-tertiary)" />
```

**L'onglet actif est une pastille 56×30 `accent` pleine, icône en `onAccent`** (depuis le 24/09/2026) : elle tranche à 6,12:1 sur la barre, et l'icône à 6,12:1 sur elle. La pastille `backgroundSelected` d'avant ne ressortait qu'à 1,18:1, et le vert de l'icône active et le gris de l'inactive ont la même luminance (1,02:1) : pour qui distingue mal les couleurs, les deux onglets étaient identiques (WCAG 1.4.1). L'actif se reconnaît à une forme que l'inactif n'a pas.
