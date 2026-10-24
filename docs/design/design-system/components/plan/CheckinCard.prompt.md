La carte du point en tête du plan. Question fermée ancrée sur un fait, réponses en boutons, retour de Ramille à la place de la question une fois répondu.

```jsx
<CheckinCard periodLabel="Semaine du 14/09" question="Mardi ou jeudi, as-tu fait ce trajet à vélo ?" />
<CheckinCard periodLabel="Semaine du 07/09" question="…" answered="oui" renforcement="Deuxième semaine de suite que tu fais ce trajet autrement." pied="Répondu lundi. Prochain point : lundi 21 septembre." />
```

**« Non » et « Oui » ont le même poids** (depuis le 24/09/2026) : deux secondaires, dans cet ordre, posés sur la carte par `onPanel` — fond de l'écran et filet, sans quoi gris sur gris leur forme disparaît. Un « Oui » vert plein désignait la bonne réponse avant qu'on la donne ; aucune des deux n'est un échec.

**Le troisième choix est un lien, pas un troisième bouton** : « Pas de trajet la semaine dernière », « Pas de voyage en septembre » — une sortie honnête, centrée sous les deux boutons, qui nomme la période interrogée comme la question. **Souligné au repos** (01/10/2026, audit P-7), comme « Annuler » et « Changer d’avis » : sans soulignement, il se lisait comme une légende sous « Non » et « Oui », et la réponse d’une semaine de congés passait pour du texte. Il reste tertiaire, petit, centré.

L'accent (fond `backgroundSelected`, étiquette `accentText`) désigne le point à regarder d'abord, et tombe une fois répondu : une question refermée n'a plus rien à désigner. **Quand deux points sont ouverts, c'est celui qui porte la question de l'action engagée** — depuis le 30/09/2026, la question du mois suit l'action, et celle qui referme l'engagement pouvait être la grise (tranché le 01/10/2026, `v1-33` §6) ; sinon, le point du poste dominant, la règle du 27/08/2026. L'écran le décide (`accentDesPoints`), pas la carte.

**Une fois répondu, et seulement la deuxième période de suite, une phrase du produit s'ajoute** (`renforcement`) : « Deuxième semaine de suite que tu fais ce trajet autrement. », « Deuxième mois de suite que tu voyages autrement. » Elle marque le passage d'un geste à une habitude, puis se tait — à la cinquième elle serait fausse, et chaque semaine elle deviendrait du papier peint. Elle se compte sur les périodes, pas sur les lignes, et ce n'est pas Ramille qui la dit : Ramille ne compte jamais.

**Après un « oui », ce qu'il a évité, au moins** (`kilos`, 24/10/2026, `v1-35` étape 6a, décidé avec la personne qui pilote) : « Au moins 2,2 kg CO₂e évités. », en `body` secondaire sous le renforcement. Un « oui » se compte **une fois** — un aller, une journée de télétravail, un aller pour une sortie, un voyage que la question nomme : la plus petite chose qu'il veut dire —, donc le chiffre est toujours vrai et le prochain bilan ne le dément jamais. Il ne se dit qu'après un « oui » sur un point qui porte une action — et jamais sur les deux « Renoncer à un vol… » ni sur l'autocar remplacé par le train, dont la question ne dit pas quel trajet —, arrondi vers le bas, et jamais dans la bulle de Ramille, qui ne dit pas de nombre. Le plan en fait le total de la saison, sous son titre ; le suivi le garde, saison par saison.

```jsx
<CheckinCard periodLabel="Semaine du 13/10" question="Mardi ou jeudi, as-tu fait ce trajet en train ?" answered="oui" kilos="Au moins 2,2 kg CO₂e évités." pied="Répondu lundi. Prochain point : lundi 27 octobre." />
```

**Une question figée peut nommer une action qu'on ne suit plus** : elle est composée à la génération du point, et changer d'avis ensuite ne la réécrit pas. `actionQuittee` ajoute sous elle « Cette question porte sur l’action que tu suivais alors : … ». Recomposer la question la ferait différer de la notification qu'on vient d'ouvrir.

**Une boucle arrêtée ne donne pas rendez-vous** (30/09/2026) : un nouveau bilan peut arrêter la boucle d'un point pendant que sa carte répondue reste affichée. Le `pied` dit alors « Répondu lundi. » seul, et le `retour` de Ramille est une réplique sans rendez-vous — l'originale pour le « Oui », « Une semaine sans, ce n'est pas un retour en arrière. » pour le « Non » (« Un mois sans… » sur la boucle mensuelle ; un point de maintien garde `maintienNon`, qui ne promet rien), « Pas de trajet, pas de question. » pour la troisième réponse (« Pas de sortie… », « Pas de voyage… » selon le poste). Le visage ne change pas.

**Le pied arrive avec la réponse** (01/10/2026, audit P-10) : daté de l’instant du geste tant que la ligne n’est pas relue — « Répondu jeudi. Prochain point : lundi 5 octobre. » —, puis de l’horodatage du serveur. Il n’apparaissait qu’au passage suivant sur le plan.

**Deux échecs, deux places** : un `refus` (le point est clos) remplace les boutons, qui ne pourraient plus aboutir ; une `erreur` (la réponse n'est pas partie) s'ajoute sous eux, qui restent. La réplique de Ramille prend le focus quand elle remplace les boutons — jamais au chargement.

Dans le texte, c'est **« le point »**, jamais « check-in » : `CheckinCard` est un nom de code. Pas de streak, pas de score — les kilos évités ne sont ni l'un ni l'autre : le minimum de ce qui a été fait, sans classement ni comparaison, et jamais de manque. Un point sans réponse expire et n’est jamais relu.

**La réponse se corrige jusqu’au point suivant** (02/10/2026, `v1-33` §6, décidé avec la personne qui pilote) : « Non » et « Oui » sont à 8 px l’un de l’autre, et un toucher erroné était définitif. La carte répondue porte, sous le pied, le lien « Modifier ma réponse » — souligné, tertiaire, comme « Changer d’avis ». Il rouvre la question et les trois réponses sous « Ta réponse : oui. » (`small` tertiaire, dans les mots des boutons — ils n’ont pas d’état « choisi », et c’est voulu), avec « Annuler » dessous. La nouvelle réponse reçoit sa réplique, le pied dit le jour de la correction, et « deux fois de suite » la suit. La correction tient le temps que la carte est affichée, jusqu’au point suivant.

```jsx
<CheckinCard periodLabel="Semaine du 28/09" question="Mardi ou jeudi, as-tu fait ce trajet en train ?" answered="oui" correction reponseEnPlace="Ta réponse : oui." />
```

**Depuis l'e-mail, la carte demande de confirmer** (24/10/2026, `v1-35` étape 6b) : l'e-mail du point porte ses trois réponses, chacune vers la page `/point`, qui ne demande pas de compte. La carte y dit la réponse choisie — « Tu as choisi : oui. », `small` tertiaire, dans les mots des boutons —, puis **« Envoyer ma réponse »**, un bouton plein : il ne désigne pas une bonne réponse, il confirme celle que la personne vient de choisir. « Choisir une autre réponse », souligné et centré comme le troisième choix, rouvre les trois réponses. **Rien ne part sans ce toucher** : une messagerie ouvre les trois liens de l'e-mail pour les inspecter. Ensuite, c'est la carte de toujours : la réplique, les kilos, le pied, « Modifier ma réponse ».

```jsx
<CheckinCard periodLabel="Semaine du 13/10" question="Mardi ou jeudi, as-tu fait ce trajet en train ?" emphasize={false} reponseChoisie="Tu as choisi : oui." />
```
