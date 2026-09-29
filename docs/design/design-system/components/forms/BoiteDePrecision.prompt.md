Ce qui s’ouvre sous un choix pour le préciser, écrit une fois : la boîte, son dépli et ses marges. `PrecisionMode` et `PrecisionChiffres` ne dessinent pas de boîte, ils se posent dedans — un seul, ou deux quand un choix ouvre deux précisions.

```jsx
<div>
  <ModeListItem label="Voiture (covoiturage)" selected onPress={choisir} />
  <BoiteDePrecision>
    <PrecisionMode champ="commute_car_engine" question="Quelle motorisation ?" options={MOTORISATIONS} valeur="hybride" onChange={setMotorisation} />
    <PrecisionChiffres champ="commute_carpool_size" question="Vous êtes combien à partager ce trajet ?" options={TAILLES_DE_COVOITURAGE} valeur={null} onChange={setTaille} />
  </BoiteDePrecision>
</div>
```

**Sous le choix, dans la liste, jamais après elle.** Le choix et sa boîte s’enveloppent ensemble (dans le dépôt, un `ChoixOuvrant`, qui ne dessine rien) : c’est le haut de cette enveloppe que l’écran ne fait jamais passer au-dessus du bord quand il remonte pour montrer la boîte.

**La géométrie** : 8 sous le choix, retrait de 16 à gauche, fond `backgroundElement`, rayon 16 (`Radius.field`), **12** de marge intérieure, 16 entre deux groupes, 8 sous la boîte — donc 12 jusqu’au choix suivant d’une famille. Les réponses d’une précision sont à 4 l’une de l’autre, sur le fond de la page (`nestedBackground`). Le 12 est hors de l’échelle, et c’est ce qui fait tenir cinq puces de 48 sur une rangée à 360 dp, à 0 px près ; une taille d’affichage agrandie fait encore passer la cinquième à la ligne.

**Une boîte pour deux précisions d’une même voiture** — sous « Voiture (covoiturage) » du trajet et des sorties, sous la voiture des longs trajets — et pour le type d’un second mode suivi de sa part du trajet. Deux boîtes se lisaient comme deux blocs de plus ; une boîte et deux questions se lisent comme une voiture et ce qu’on en dit. **Deux groupes, jamais un groupe fusionné** : chaque précision reste un `radiogroup` nommé par sa question, posé dans le groupe du choix qu’elle précise.

**Elle s’ouvre en dépliant sa hauteur** (250 ms, fondu 200 ms, posée sous « réduire les animations »), et si elle passerait sous le pied, l’écran remonte juste assez pour qu’elle finisse 16 au-dessus de lui — pendant qu’elle s’ouvre, sans jamais faire passer le choix au-dessus du bord (8), et seulement quand elle suit une réponse : une boîte déjà ouverte par un re-bilan prérempli ne fait rien défiler. Le focus reste sur le choix qu’on vient de toucher. Le kit la pose à sa hauteur finale.
