L'écran du plan quand il n'y a pas de plan à montrer. L'écran lit, décide de l'état, et rend celui-ci tant qu'il n'est pas « plan lu ».

```jsx
<PlanSansPlan etat={{ status: 'no_assessment' }} vientDUnRappel={false} />
<PlanSansPlan etat={{ status: 'no_assessment' }} vientDUnRappel />
<PlanSansPlan etat={{ status: 'erreur_reseau', genre: 'serveur' }} onReessayer={() => {}} />
<PlanSansPlan etat={{ status: 'pending', assessmentId: 'b1' }} relectureDemandee={false} onRelire={() => {}} />
```

**Un échec de lecture n'est ni « pas de bilan » ni « en préparation »** : les deux replis disaient à quelqu'un dans le métro que ses données n'existent pas. L'écran d'erreur ne vaut que quand rien n'a jamais pu être lu, et il ne parle de connexion qu'hors ligne ; « Réessayer » y repasse par « Chargement… », tout de suite, pour que le geste ait l'air pris.

**Venir d'un rappel sans bilan ici ne veut pas dire « pas de bilan »** : l'e-mail s'ouvre parfois sur un appareil neuf. L'écran le dit — « Ce rappel concerne un compte » —, et sa porte principale est « J’ai déjà un compte ». Sans rappel, « Faire mon bilan », et le même lien vers un compte existant.

**« En préparation » a deux sorties** : « Réessayer », inactif tant que la relecture tourne, et « Revoir mon bilan », qui marche dans tous les cas. Ce n'est plus un cul-de-sac.
