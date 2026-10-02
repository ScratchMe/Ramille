Le champ qu'ouvre « 10+ » : sous les puces des vols, et sous chacune des trois séries des longs trajets.

```jsx
<ChampDuPlafond valeur={null} unite="vols" label="Nombre de vols sur une année" />
<ChampDuPlafond valeur={250} unite="vols" label="Nombre de vols sur une année" />
```

**« 10+ » ne plafonne plus** (`v1-33` §6, décidé le 01/10/2026, précisé le 02/10/2026 avec la personne qui pilote). La puce enregistrait 10 : vingt vols comptaient pour dix, la moitié du poste le plus lourd, et précisément chez ceux qui émettent le plus. Elle ouvre désormais un champ, **réclamé** comme la distance sous « Plus de 30 km » — un nombre par défaut aurait été une réponse qu'on n'a pas donnée, le motif que D1 a retiré des vols.

**« Environ combien, sur une année ? »** : le tour de « Environ combien, pour un aller ? », et le « Environ » autorise l'estimation — personne ne compte ses vols à l'unité. Intitulé `small` tertiaire, qui passe en `accentText` 600 quand « Suivant » le réclame (« Il manque encore le nombre de vols. », « … le nombre de trajets en voiture. »).

**Un compte, pas une mesure** : le champ est entier (le clavier sans décimale ; « 12,5 » vaut 12, jamais 125), et son unité est le nom compté, « vols » ou « trajets ». Le lecteur d'écran n'entend que le libellé — « Nombre de vols sur une année » —, sans « en vols » derrière.

**Au-delà de cinquante, une ligne de relecture** : « C’est beaucoup pour une année : vérifie le chiffre. », en `small` `textSecondary`. Jamais un blocage, jamais une alerte : soixante vols par an existent ; ce qu'on attrape, c'est le 250 tapé au lieu de 25.

Une autre puce le referme et répond à sa place ; un nombre de dix ou plus relu d'un re-bilan coche « 10+ » et s'affiche dans le champ. Au-delà de dix vols, la part de vols courts devient elle aussi un champ, borné au total (`FlightsStep`).
