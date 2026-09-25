La carte du point en tête du plan. Question fermée ancrée sur un fait, réponses en boutons, retour de Ramille à la place de la question une fois répondu.

```jsx
<CheckinCard periodLabel="Point de la semaine · 8 sept." question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?" />
<CheckinCard periodLabel="…" question="…" answered="oui" pied="Répondu lundi. Prochain point : lundi 21 septembre." />
```

**« Non » et « Oui » ont le même poids** (depuis le 24/09/2026) : deux secondaires, dans cet ordre, posés sur la carte par `onPanel` — fond de l'écran et filet, sans quoi gris sur gris leur forme disparaît. Un « Oui » vert plein désignait la bonne réponse avant qu'on la donne ; aucune des deux n'est un échec.

**Le troisième choix est un lien, pas un troisième bouton** : « Pas de trajet la semaine dernière », « Pas de voyage en septembre » — une sortie honnête, centrée sous les deux boutons, qui nomme la période interrogée comme la question.

L'accent (fond `backgroundSelected`, étiquette `accentText`) désigne le point du poste dominant, et tombe une fois répondu : une question refermée n'a plus rien à désigner.

Dans le texte, c'est **« le point »**, jamais « check-in » : `CheckinCard` est un nom de code. Pas de streak, pas de score. Un point sans réponse expire et n’est jamais relu.
