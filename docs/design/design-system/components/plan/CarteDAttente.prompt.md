Quatre cartes de l'écran du plan — `CarteDAttente`, `EncartDeContexte`, `CarteDeFelicitation`, `CarteDuRebilan`. L'écran décide si chacune se rend (`cartesDuPlan`) ; elles disent ce qu'elles ont à dire.

```jsx
<CarteDAttente ligne="On se retrouve ici lundi." detail={null} porte={{ libelle: 'Rattacher un compte', onPress: () => {} }} />
<EncartDeContexte mots={['zone urbaine dense', 'bon accès aux transports en commun', 'un véhicule dans le foyer']} onModifier={() => {}} />
<CarteDeFelicitation titre="Tu fais déjà l’essentiel sur tes sorties." promettreLePoint={false} />
<CarteDuRebilan titre="Une saison a passé depuis ton dernier bilan." onFaire={() => {}} />
```

**L'attente, pas le vide** : « Rien à rattraper. » se lisait comme une attente déçue. Ramille nomme le jour où elle revient, sans jamais compter ; le détail sous sa ligne est du produit. **Posée au-dessus du cap**, jamais à côté : un cap en kilos sous son visage se lirait comme son commentaire. Elle cède sa place à une carte d'ouverture, jamais à un point en attente.

**Le contexte informe sans marchander** : il ne nomme jamais l'action écartée ni son gain — ce serait la liste des portes fermées pour qui a répondu juste. Jamais sur un plan à zéro action, ni quand il n'y a rien à énumérer.

**Zéro action n'est pas un échec** : le titre nomme le poste, et le pire accueil serait une liste vide pour qui fait déjà le plus d'efforts. **Le re-bilan ferme l'écran** : au plus deux fois par an, jamais devant la question de la semaine ni devant l'action engagée ; « Faire un nouveau bilan », parce qu'un bilan s'ajoute et n'efface rien.
