La carte qui ouvre le plan à un moment qui compte — **trois usages, un seul cadre** : une nouvelle saison, le tout premier plan, l'arrivée des deux lieux.

```jsx
<CarteDOuverture
  ouverture={{ etiquette: 'NOUVELLE SAISON', titre: 'L’automne commence.', corps: 'Cet été : 11 points répondus, 4 fois où tu as changé quelque chose.' }}
  sorties={[{ cle: 'reprendre', label: 'Reprendre la même action', forme: 'primaire' }, { cle: 'choisir_une_autre', label: 'Choisir une autre', forme: 'secondaire' }]}
  ligne="On repart pour une saison."
  visage="happy"
/>
<CarteDOuverture
  ouverture={{ etiquette: 'TON PREMIER PLAN', titre: 'Une action pour l’automne.', corps: 'Choisis-en une, et dis quand. Ensuite, un point régulier te demandera si tu l’as faite — rien d’autre à suivre.' }}
  sorties={[{ cle: 'compris', label: 'Compris', forme: 'lien' }]}
  ligne="Prends celle qui te ressemble."
  visage="happy"
/>
```

**Ramille est dessous, hors du cadre**, en 44 penchée de − 5 : la carte peut porter deux nombres, et Ramille ne se tient jamais près d'un chiffre qu'on commente. Sa ligne et son visage viennent de l'appelant, jamais d'un défaut — « On repart pour une saison. » n'est pas vraie au premier plan. `happy` pour ce qui commence (saison, premier plan), `calm` pour ce qui s'explique (les deux lieux : « Je note tes réponses dans ton suivi, au fil des saisons. », ou « Je garde tes bilans dans ton suivi, au fil des saisons. » quand aucune boucle ne tourne — la carte ne décrit que ce que le plan porte, 30/09/2026).

**Le récapitulatif ne dit jamais zéro et ne nomme aucun poste** : sans point répondu, pas de corps ; sans changement, la seconde moitié de la phrase tombe. **Les sorties dépendent du plan** : « Reprendre la même action » et « Choisir une autre » supposent un engagement reconduit ; rien d'engagé → « Choisir une action » ; plan sans action → « Compris ». Le premier plan et les deux lieux n'ont qu'à se refermer : « Compris », en lien. **« Choisir une action » referme la carte et amène la première piste du plan** dans la fenêtre, le focus sur son titre (01/10/2026, D16 de `v1-33`) : les deux cartes que le plan a choisies sont juste dessous, et la liste reste derrière « Voir toutes les pistes · N » ; « Choisir une autre » mène, lui, à la liste.

**Une seule à la fois, dans un ordre fixe** : la saison, puis le premier plan, puis les deux lieux ; celle qui attend se rend dès que la précédente est refermée — jamais deux cadres empilés. **Celle des deux lieux se voit une fois, puis part** (01/10/2026, `v1-33` §6) : elle reste le temps de la visite où elle se rend, et ne revient ni au retour sur le plan ni au lancement suivant, « Compris » touché ou non. **Elle ne prend jamais la place d'un point en attente** — seulement celle de la carte d'attente. Elle entre en glissant depuis le bas (320 ms), sauf si l'on a demandé moins d'animations.
