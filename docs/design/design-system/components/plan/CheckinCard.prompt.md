La carte du point en tête du plan. Question fermée ancrée sur un fait, réponses en boutons, retour de Ramille à la place de la question une fois répondu.

```jsx
<CheckinCard periodLabel="Semaine du 14/09" question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?" />
<CheckinCard periodLabel="Semaine du 07/09" question="…" answered="oui" renforcement="Deuxième semaine de suite que tu fais ce trajet autrement." pied="Répondu lundi. Prochain point : lundi 21 septembre." />
```

**« Non » et « Oui » ont le même poids** (depuis le 24/09/2026) : deux secondaires, dans cet ordre, posés sur la carte par `onPanel` — fond de l'écran et filet, sans quoi gris sur gris leur forme disparaît. Un « Oui » vert plein désignait la bonne réponse avant qu'on la donne ; aucune des deux n'est un échec.

**Le troisième choix est un lien, pas un troisième bouton** : « Pas de trajet la semaine dernière », « Pas de voyage en septembre » — une sortie honnête, centrée sous les deux boutons, qui nomme la période interrogée comme la question. **Souligné au repos** (01/10/2026, audit P-7), comme « Annuler » et « Changer d’avis » : sans soulignement, il se lisait comme une légende sous « Non » et « Oui », et la réponse d’une semaine de congés passait pour du texte. Il reste tertiaire, petit, centré.

L'accent (fond `backgroundSelected`, étiquette `accentText`) désigne le point à regarder d'abord, et tombe une fois répondu : une question refermée n'a plus rien à désigner. **Quand deux points sont ouverts, c'est celui qui porte la question de l'action engagée** — depuis le 30/09/2026, la question du mois suit l'action, et celle qui referme l'engagement pouvait être la grise (tranché le 01/10/2026, `v1-33` §6) ; sinon, le point du poste dominant, la règle du 27/08/2026. L'écran le décide (`accentDesPoints`), pas la carte.

**Une fois répondu, et seulement la deuxième période de suite, une phrase du produit s'ajoute** (`renforcement`) : « Deuxième semaine de suite que tu fais ce trajet autrement. », « Deuxième mois de suite que tu voyages autrement. » Elle marque le passage d'un geste à une habitude, puis se tait — à la cinquième elle serait fausse, et chaque semaine elle deviendrait du papier peint. Elle se compte sur les périodes, pas sur les lignes, et ce n'est pas Ramille qui la dit : Ramille ne compte jamais.

**Une question figée peut nommer une action qu'on ne suit plus** : elle est composée à la génération du point, et changer d'avis ensuite ne la réécrit pas. `actionQuittee` ajoute sous elle « Cette question porte sur l’action que tu suivais alors : … ». Recomposer la question la ferait différer de la notification qu'on vient d'ouvrir.

**Une boucle arrêtée ne donne pas rendez-vous** (30/09/2026) : un nouveau bilan peut arrêter la boucle d'un point pendant que sa carte répondue reste affichée. Le `pied` dit alors « Répondu lundi. » seul, et le `retour` de Ramille est une réplique sans rendez-vous — l'originale pour le « Oui », « Une semaine sans, ce n'est pas un retour en arrière. » pour le « Non » (« Un mois sans… » sur la boucle mensuelle ; un point de maintien garde `maintienNon`, qui ne promet rien), « Pas de trajet, pas de question. » pour la troisième réponse (« Pas de sortie… », « Pas de voyage… » selon le poste). Le visage ne change pas.

**Le pied arrive avec la réponse** (01/10/2026, audit P-10) : daté de l’instant du geste tant que la ligne n’est pas relue — « Répondu jeudi. Prochain point : lundi 5 octobre. » —, puis de l’horodatage du serveur. Il n’apparaissait qu’au passage suivant sur le plan.

**Deux échecs, deux places** : un `refus` (le point est clos) remplace les boutons, qui ne pourraient plus aboutir ; une `erreur` (la réponse n'est pas partie) s'ajoute sous eux, qui restent. La réplique de Ramille prend le focus quand elle remplace les boutons — jamais au chargement.

Dans le texte, c'est **« le point »**, jamais « check-in » : `CheckinCard` est un nom de code. Pas de streak, pas de score. Un point sans réponse expire et n’est jamais relu.

**La réponse se corrige jusqu’au point suivant** (02/10/2026, `v1-33` §6, décidé avec la personne qui pilote) : « Non » et « Oui » sont à 8 px l’un de l’autre, et un toucher erroné était définitif. La carte répondue porte, sous le pied, le lien « Modifier ma réponse » — souligné, tertiaire, comme « Changer d’avis ». Il rouvre la question et les trois réponses sous « Ta réponse : oui. » (`small` tertiaire, dans les mots des boutons — ils n’ont pas d’état « choisi », et c’est voulu), avec « Annuler » dessous. La nouvelle réponse reçoit sa réplique, le pied dit le jour de la correction, et « deux fois de suite » la suit. La correction tient le temps que la carte est affichée, jusqu’au point suivant.

```jsx
<CheckinCard periodLabel="Semaine du 28/09" question="Mardi ou jeudi, as-tu fait ce trajet en train ?" answered="oui" correction reponseEnPlace="Ta réponse : oui." />
```
