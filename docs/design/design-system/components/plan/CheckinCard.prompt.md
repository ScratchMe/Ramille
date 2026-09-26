La carte du point en tête du plan. Question fermée ancrée sur un fait, réponses en boutons, retour de Ramille à la place de la question une fois répondu.

```jsx
<CheckinCard periodLabel="Semaine du 14/09" question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?" />
<CheckinCard periodLabel="Semaine du 07/09" question="…" answered="oui" renforcement="Deuxième semaine de suite que tu fais ce trajet autrement." pied="Répondu lundi. Prochain point : lundi 21 septembre." />
```

**« Non » et « Oui » ont le même poids** (depuis le 24/09/2026) : deux secondaires, dans cet ordre, posés sur la carte par `onPanel` — fond de l'écran et filet, sans quoi gris sur gris leur forme disparaît. Un « Oui » vert plein désignait la bonne réponse avant qu'on la donne ; aucune des deux n'est un échec.

**Le troisième choix est un lien, pas un troisième bouton** : « Pas de trajet la semaine dernière », « Pas de voyage en septembre » — une sortie honnête, centrée sous les deux boutons, qui nomme la période interrogée comme la question.

L'accent (fond `backgroundSelected`, étiquette `accentText`) désigne le point du poste dominant, et tombe une fois répondu : une question refermée n'a plus rien à désigner.

**Une fois répondu, et seulement la deuxième période de suite, une phrase du produit s'ajoute** (`renforcement`) : « Deuxième semaine de suite que tu fais ce trajet autrement. », « Deuxième mois de suite que tu voyages autrement. » Elle marque le passage d'un geste à une habitude, puis se tait — à la cinquième elle serait fausse, et chaque semaine elle deviendrait du papier peint. Elle se compte sur les périodes, pas sur les lignes, et ce n'est pas Ramille qui la dit : Ramille ne compte jamais.

**Une question figée peut nommer une action qu'on ne suit plus** : elle est composée à la génération du point, et changer d'avis ensuite ne la réécrit pas. `actionQuittee` ajoute sous elle « Cette question porte sur l’action que tu suivais alors : … ». Recomposer la question la ferait différer de la notification qu'on vient d'ouvrir.

**Deux échecs, deux places** : un `refus` (le point est clos) remplace les boutons, qui ne pourraient plus aboutir ; une `erreur` (la réponse n'est pas partie) s'ajoute sous eux, qui restent. La réplique de Ramille prend le focus quand elle remplace les boutons — jamais au chargement.

Dans le texte, c'est **« le point »**, jamais « check-in » : `CheckinCard` est un nom de code. Pas de streak, pas de score. Un point sans réponse expire et n’est jamais relu.
