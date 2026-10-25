La ligne de relecture du plan : ce qui est affiché reste vrai, mais date. Elle vaut au-dessus des trois écrans issus d'une lecture réussie — le plan, « en préparation » et « pas encore de bilan » —, jamais à la place de l'un d'eux.

```jsx
<BanniereDeRelecture relectureEnEchec="serveur" relectureDemandee={false} onRelire={() => {}} />
<BanniereDeRelecture refusDeRemplacement="Ton choix n’a pas été enregistré : ton plan a changé entre-temps. Il vient d’être relu." onRelire={() => {}} />
```

**Un échec de lecture n'efface rien** : la ligne s'ajoute au-dessus d'un écran déjà rempli, et l'écran d'erreur plein écran ne vaut que quand rien n'a jamais pu être lu. **La phrase suit le genre de l'échec** : « Vérifie ta connexion » seulement hors ligne — sur une réponse du serveur en échec, elle enverrait vérifier ce qui marche.

**« Réessayer » répond sous le doigt** : inactif et `aria-busy` tant que la lecture qu'il a demandée tourne, relâché à sa fin quelle qu'en soit l'issue. La teinte tertiaire est celle d'un lien qui n'agit pas.
