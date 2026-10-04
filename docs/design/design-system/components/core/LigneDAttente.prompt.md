La ligne qui dit qu’un écran se charge : « Chargement de ton plan… », « Chargement de ton suivi… », « Chargement de ton compte… ».

```jsx
<LigneDAttente>Chargement de ton plan…</LigneDAttente>
<LigneDAttente demandee>Chargement de tes pistes…</LigneDAttente>
<LigneDAttente immediate>Chargement de ton bilan…</LigneDAttente>
```

**Une forme et un délai, écrits une fois** (`v1-33` T-9, 03/10/2026). L’audit en comptait huit formes — trois corps, deux gris, et quatre lignes qui n’attendaient pas. Elle est en `body`, gris secondaire, et elle se tait pendant **300 ms** : en dessous, l’écran reste vide et le contenu arrive seul, au lieu d’une phrase qui clignote une image (`v1-30` §5.8).

**Deux exceptions, et seulement deux.** Après « Réessayer » (`demandee`), elle se dit tout de suite : hors ligne, l’échec revient sous le délai, et sans elle le bouton aurait l’air mort. Sur une page qu’on ouvre à froid par son adresse (`immediate`), le HTML statique la porte pendant que le JavaScript arrive — c’est la restitution, et elle seule.

Elle ne se pose que dans la branche de chargement d’un écran : un chargement qui recommence la remonte, donc repart de zéro. Les pages de service qui disent « Un instant, on … » n’en sont pas : sur `/compte/suppression`, la phrase est la première de la page, et le résultat la remplace au même corps ; sur `/rappels/stop`, depuis le 04/10/2026, elle ne vient qu’après le toucher de « Couper mes rappels », et le résultat la remplace de même.
