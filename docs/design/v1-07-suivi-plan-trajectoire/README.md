# Canvas de design — suivi, plan refondu, trajectoire 2050

Sources d'un canvas Claude Design produit le 04/09/2026 pour trois écrans issus de l'audit
`docs/architecture/v1-07-audit-facteurs-et-suivi.md`. **Distinct du handoff d'origine**
(`docs/design/traceverte-ecrans-v1.dc.html`, figé et jamais réécrit) : ces trois écrans n'y
figurent pas.

| Fichier | Écran | Statut produit |
|---|---|---|
| `Main.dc.html` | `/suivi` | **construit** (étape 4) — ce canvas propose de remplacer l'empilement de barres par une courbe temporelle |
| `Plan.dc.html` | `/plan` refondu | **à construire** (étape 6) — actions chiffrées et sélectionnables, cap affiché |
| `Trajectoire.dc.html` | bloc 2050 de `/bilan/resultat` | **à construire** (étape 7, issue #28) — paliers annuels au lieu d'un écart frontal |

Le système de design est repris tel quel du handoff (`docs/design/README.md` §Design tokens) :
Spline Sans, accent `#1F6F4A`, padding écran 24, bouton 54 px / rayon 27, cartes 24 / 20 / 18,
chips 22. Règle du handoff tenue partout : **aucune sémantique vert = bon / rouge = mauvais**,
aucune icône d'alerte — l'accent marque ce qui est dominant ou actionnable, jamais un jugement.

## Réserve à lever avant production

**Partiellement levée le 04/09/2026.** Les deux repères portés par `Trajectoire.dc.html` étaient
les placeholders codés en dur de `bilan/resultat.tsx` ; ils sont désormais sourcés dans
`src/constants/carbon-reference.ts` et **leurs valeurs ont changé** :

| Maquette | Valeur sourcée | Source |
|---|---|---|
| 2,9 t (moyenne transport France) | **2,8 t** | SDES, décomposition par postes, données 2017 |
| 0,5 t (part compatible 2050) | **0,6 t** | dérivé de la cible ADEME de 2 t (cf. `v1-07` §3.4) |

Le libellé change aussi : « Repère transport 2050 » et non « part compatible », parce que la
valeur est une dérivation et non une cible officielle publiée. À reporter dans la maquette au
prochain passage — l'écart n'est pas visuellement structurant, mais un chiffre faux dans une
maquette finit toujours par être recopié dans du code.

**Reste ouvert** : les paliers intermédiaires (2,6 / 2,2 / 1,7 / 1,1) sont toujours une
**interpolation**, pas une trajectoire ADEME sourcée. C'est l'objet de l'étape 7 (issue #28) : à
sourcer ou à assumer explicitement comme une projection linéaire avant toute mise en production.
Sur un registre institutionnel, c'est le premier endroit où la crédibilité se casse.

## Régénérer le canvas

Le fichier assemblé (~2,5 Mo, embarquant l'éditeur) n'est pas versionné — cf. `.gitignore`. Il
se reconstruit depuis ces sources via la commande de seed de la skill `design`, en passant les
quatre fichiers de ce dossier, puis se republie sur l'Artifact existant pour en conserver l'URL.
