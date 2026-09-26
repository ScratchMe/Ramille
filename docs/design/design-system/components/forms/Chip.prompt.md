Puce de sélection du questionnaire et du choix de l'intention. `solid` pour un nombre, une tranche ou un jour, `outline` pour un choix binaire ou une échéance.

```jsx
<div role="radiogroup" aria-label="Combien de vols prends-tu dans une année type ?" style={{display:'flex',flexWrap:'wrap',gap:8}}>
  <Chip label="0" role="radio" selected={false} />
  <Chip label="1" role="radio" selected />
  <Chip label="10+" accessibilityLabel="10 vols ou plus" role="radio" selected={false} />
</div>
<Chip label="Oui" role="radio" selected selectedStyle="outline" flex radius={16} />
```

**Le rôle est obligatoire** : `radio` quand on n'en choisit qu'une, `checkbox` quand elles se cumulent (les jours de l'engagement). C'est le seul rôle qui annonce « sélectionné » et la place dans le groupe ; l'état passe par `aria-checked`. Une puce n'est jamais une action.

**Une série de puces vit dans un groupe nommé par sa question** — `radiogroup`, ou `group` pour des `checkbox` —, la question écrite une fois pour le texte affiché et pour le nom du groupe. C'est `GroupeDeChoix` : une puce « 1 » annoncée seule ne dit pas à quoi elle répond.

**48 × 48 au moins**, par la taille et jamais par une zone de toucher élargie, qui ferait se recouvrir deux puces voisines. Des minimums : le libellé grandit avec la taille de police du système.

**Les jours se rangent en grille, quatre colonnes au plus** — « 1 2 3 4 / 5 6 7 », « L M M J / V S D » —, et non sur une ligne, où sept jours ne laissaient que 27 à 42 px à chacun. Une cellule ne descend jamais sous 48 + 8 : quand quatre n'y tiennent plus (un petit téléphone, une taille d'affichage agrandie), la grille passe d'elle-même à trois colonnes égales. Les jours portent `radius={14}` (`Radius.chip`) ; ceux de l'engagement sont des `checkbox`, avec le jour entier en `accessibilityLabel` (« mardi ») et `nestedBackground`, puisque le sélecteur est un encart teinté. Voir `ActionCommitment`.

Rayons : la pilule (22, le défaut) pour le total des vols et les tranches des sorties ; `Radius.chip` (14) pour les autres séries de chiffres et les jours ; 16 pour les Oui/Non et les échéances, en `outline` — les échéances en colonne.

Sous le doigt, la puce prend sa teinte appuyée tout de suite : `accentPressed` sous une puce pleine, `backgroundSelectedPressed` sous une puce choisie en contour, `backgroundPressed` ailleurs.
