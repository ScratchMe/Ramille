Les quatre questions du contexte de mobilité — type de zone, accès aux transports en commun, véhicules du foyer, télétravail —, rendues une seule fois pour deux écrans : la dernière étape du questionnaire (`ContextStep`) et l'écran `/contexte`, qui les corrige sans refaire de bilan.

```jsx
<ChampsDeContexte
  choix={{ zone_type: 'periurbain', tc_access: 'limite', household_vehicles: '1', teletravail: null }}
  trajet={{ commute_has_regular_trip: true, commute_days_per_week: 5 }}
  update={(patch) => setChoix((c) => ({ ...c, ...patch }))}
/>
```

**Ce qui change d'un écran à l'autre est l'introduction, et elle seule.** Le questionnaire annonce une étape, l'écran autonome annonce une correction : chacun garde son titre et ses phrases au-dessus, et les questions ne s'écrivent pas deux fois — deux copies divergeraient par une faute de frappe que personne ne relit. Le composant rend un fragment : c'est l'écran hôte qui espace les questions (24 entre elles).

**Chaque question sert deux fois** : le texte au-dessus de la série, en `small` tertiaire, et le nom de son `GroupeDeChoix`. Une puce « 1 » annoncée seule ne dirait pas qu'elle compte des véhicules, et l'écran `/contexte` n'a pas l'étape autour pour le rappeler. **Ce sont des questions** (01/10/2026, D4 de `v1-33`) — « Dans quel type de zone vis-tu ? », « Comment sont les transports en commun près de chez toi ? », « Combien de véhicules motorisés dans ton foyer ? » — là où les trois premières étaient des intitulés à se classer ; les puces ne bougent pas. **Sous la zone, une ligne d'aide** en `small` `textSecondary`, un cran au-dessus de l'intitulé : « Urbain dense : une grande ville et sa proche banlieue. Périurbain : sa couronne, ou une petite ville. Rural : un village, la campagne. » — la réponse décide des actions du plan (le métro et le tram ne sont proposés qu'en zone urbaine dense). Les puces sont équiréparties, rayon 14, trois par rangée. Chaque série est une ancre de « Il manque encore … » : au toucher du « Suivant » en attente du questionnaire, ou d'« Enregistrer » en attente sur `/contexte`, son intitulé passe en `accentText` 600 (`IntituleDuChamp`) et le focus va à sa puce cochée, ou à la première.

**Le télétravail ne se pose qu'avec un trajet régulier d'au moins deux jours, et il demande un nombre de jours** : « Sur tes 5 jours de trajet, combien pourrais-tu travailler depuis chez toi ? ». À un seul jour, la réponse ne pourrait rien changer au plan ; sans trajet, la question n'a pas d'objet. Le prédicat qui décide de l'afficher décide aussi, dans le dépôt, de l'effacer et de la réclamer : il ne se réécrit pas dans un écran. Ses puces portent un libellé accessible complet (« Aucun jour », « Un jour par semaine »), parce que « Aucun » annoncé seul ne dit rien.
