Le conteneur de toute série de choix — puces, rangées, items de mode, lignes de canal. Un `radiogroup` quand on n'en choisit qu'un, un `group` (`cumulable`) quand ils se cumulent, **toujours nommé par la question à laquelle il répond**.

```jsx
<ThemedText type="small" themeColor="textSecondary">{question}</ThemedText>
<GroupeDeChoix question="Ce trajet, tu le fais combien de jours par semaine ?" colonnes={4}>
  {[1, 2, 3, 4, 5, 6, 7].map((n) => <Chip key={n} label={String(n)} role="radio" selected={n === 4} flex radius={14} />)}
</GroupeDeChoix>
```

**La question s'écrit une fois et sert deux fois** : le texte affiché au-dessus de la série, et le nom du groupe. Une puce « 1 » annoncée seule ne dit pas à quoi elle répond, et il y a trois séries de chiffres sur l'étape du contexte. Deux exceptions : un intitulé qui ne se comprend qu'avec le titre de l'écran reçoit sa forme complète, qui le contient (« En train » → « Trajets longue distance en train ») ; une série sans question affichée reçoit le nom de ce qu'elle choisit (« Catégorie »).

**C'est le seul composant qui pose ces deux rôles.** Une précision qui s'ouvre sous une option est son propre groupe, posé **dans** celui de l'option (`PrecisionMode`) : chaque option répond au groupe le plus proche, donc « Hybride » à « Quelle motorisation ? », jamais au mode.

**Au clavier, un `radiogroup` se comporte comme des cases d'option natives** : un seul arrêt de tabulation — l'option cochée, sinon la première —, et les flèches passent à la voisine en la cochant. Rien à écrire dans les options : c'est le groupe qui le fait. Un `group` de cases à cocher n'y passe pas.

**`colonnes` range la série en grille, pour les jours** — quatre colonnes au plus (« L M M J / V S D », « 1 2 3 4 / 5 6 7 »), trois quand une cible de 48 n'y tiendrait plus. Sans `colonnes`, les choix suivent la mise en page de `style` (une colonne par défaut, comme un `View`).
