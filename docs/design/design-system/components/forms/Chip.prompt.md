Puce de sélection du questionnaire et du choix de l'intention. `solid` pour un nombre, une tranche ou un jour, `outline` pour un choix binaire ou une échéance.

```jsx
<GroupeDeChoix question="Combien de vols prends-tu dans une année type ?" style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
  <Chip label="0" role="radio" selected={false} />
  <Chip label="1" role="radio" selected />
  <Chip label="10+" accessibilityLabel="10 vols ou plus" role="radio" selected={false} />
</GroupeDeChoix>
<Chip label="Oui" role="radio" selected selectedStyle="outline" flex radius={16} />
```

**Le rôle est obligatoire** : `radio` quand on n'en choisit qu'une, `checkbox` quand elles se cumulent (les jours de l'engagement). C'est le seul rôle qui annonce « sélectionné » et la place dans le groupe ; l'état passe par `aria-checked`. Une puce n'est jamais une action.

**Une série de puces vit dans un groupe nommé par sa question** — `radiogroup`, ou `group` pour des `checkbox` —, la question écrite une fois pour le texte affiché et pour le nom du groupe. C'est `GroupeDeChoix` : une puce « 1 » annoncée seule ne dit pas à quoi elle répond.

**48 × 48 au moins**, par la taille et jamais par une zone de toucher élargie, qui ferait se recouvrir deux puces voisines. Des minimums : le libellé grandit avec la taille de police du système.

**Les jours se rangent en grille, quatre colonnes au plus** — « 1 2 3 4 / 5 6 7 », « L M M J / V S D » —, et non sur une ligne, où sept jours ne laissaient que 27 à 42 px à chacun. Une cellule ne descend jamais sous 48 + 8 : quand quatre n'y tiennent plus (un petit téléphone, une taille d'affichage agrandie), la grille passe d'elle-même à trois colonnes égales. Les jours portent `radius={14}` (`Radius.chip`) ; ceux de l'engagement sont des `checkbox`, avec le jour entier en `accessibilityLabel` (« mardi ») et `nestedBackground`, puisque le sélecteur est un encart teinté. Voir `ActionCommitment`.

**Une forme par fonction** (01/10/2026, `v1-33`, Q-12 et T-20) : le rayon et le style de sélection se lisent ensemble, et deux séries qui répondent à la même question prennent la même forme. Tel que le dépôt les emploie :

| Ce qu'on choisit | Rayon | Sélection | Largeur |
|---|---|---|---|
| un nombre de vols — le total **et** les courts, sur le même écran —, les compteurs de longs trajets (0 à 10, les trois séries) et les tranches de distance des sorties | pilule, 22 (le défaut) | `solid` | naturelle |
| les jours (1 à 7 du trajet ; ceux de l'engagement, en `checkbox`), la taille du covoiturage, les quatre réponses du contexte | `Radius.chip`, 14 | `solid` | naturelle, ou `flex` pour une précision et le contexte |
| un Oui/Non, une échéance, un type de retour | `Radius.field`, 16 — le rayon des champs et des encarts | `outline` | `flex` côte à côte, ou en colonne |

Les trois couples se reconnaissent d'un coup d'œil : plein et rond pour compter, plein et carré arrondi pour un jour ou une précision, cerné pour décider. **16 n'est plus écrit en dur** : c'est `Radius.field`, que les Oui/Non, les échéances et les types de retour lisent par son nom. **L'écart des longs trajets est fermé** (01/10/2026, `v1-33` D1) : leurs compteurs étaient des nombres à `Radius.chip`, là où les nombres de vols sont en pilule — deux formes pour une fonction, d'un écran à l'autre. Ils sont en pilule, et leur question d'entrée, un Oui / Non cerné à `Radius.field`, ouvre les trois séries comme le « Oui » du second mode ouvre « Lequel ? ».

Sous le doigt, la puce prend sa teinte appuyée tout de suite : `accentPressed` sous une puce pleine, `backgroundSelectedPressed` sous une puce choisie en contour, `backgroundPressed` ailleurs.
