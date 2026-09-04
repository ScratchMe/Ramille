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

Les chiffres portés par `Trajectoire.dc.html` — 2,9 t (moyenne transport France) et 0,5 t (part
compatible 2050) — sont les **placeholders codés en dur** de `bilan/resultat.tsx`, marqués « à
confirmer » dans le code comme dans le handoff. Les paliers intermédiaires (2,6 / 2,2 / 1,7 /
1,1) sont une **interpolation**, pas une trajectoire ADEME sourcée. À remplacer par des valeurs
sourcées avant toute mise en production : sur un registre institutionnel, c'est le premier
endroit où la crédibilité se casse.

## Régénérer le canvas

Le fichier assemblé (~2,5 Mo, embarquant l'éditeur) n'est pas versionné — cf. `.gitignore`. Il
se reconstruit depuis ces sources via la commande de seed de la skill `design`, en passant les
quatre fichiers de ce dossier, puis se republie sur l'Artifact existant pour en conserver l'URL.
