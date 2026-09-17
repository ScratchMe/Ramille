# Contribuer

Le dépôt est public **pour être lu** — le passage en public a été fait pour lever le plafond de
minutes de CI, pas pour ouvrir le développement. Les contributions ne sont pas fermées pour autant ;
elles demandent seulement de savoir à quoi elles s'exposent.

## Avant une pull request, une issue

Ce dépôt a des conventions qui rendent une contribution de passage coûteuse à intégrer, et qui ne
se devinent pas :

- **tout est en français** — interface, messages d'erreur, commentaires, contenu ;
- **`CLAUDE.md` est la carte du projet**, et les fichiers d'outil à la racine (`FRONT.md`,
  `SUPABASE.md`, `EXPO.md`, `TESTING.md`, `VERCEL.md`, `RECETTE.md`) portent les pièges de chaque
  sujet. Ils s'ouvrent **sur déclencheur** : la table en tête de `CLAUDE.md` dit lequel ;
- **les décisions sont datées et ne se réécrivent pas** (`docs/architecture/v1-0N-*.md`). Plusieurs
  tests n'épinglent pas un comportement mais une décision, précisément pour qu'elle ne soit pas
  « corrigée » par réflexe — l'ordre ACV des motorisations en est l'exemple le plus contre-intuitif ;
- **toute dérivation pure affichée à la personne ou décidant d'une navigation est testée**, dans un
  `*.test.ts` colocalisé. Les tests de base de données sont en pgTAP, un fichier par sujet.

Donc : **ouvrir une issue avant d'écrire du code.** Une PR qui arrive sans discussion préalable
peut être refusée pour une raison qui n'a rien à voir avec sa qualité.

## Ce qui est toujours utile, sans rien demander

Un **rapport** : une incohérence, une phrase fausse à l'écran, un chiffre qui ne correspond pas à
ce que le calcul fait. Le produit affiche des nombres qu'une personne va croire — un écart entre ce
qu'un écran explique et ce que la base calcule est le défaut qui coûte le plus cher ici.

Pour une **faille de sécurité**, ne pas ouvrir d'issue : voir [`SECURITY.md`](SECURITY.md).

## Les vérifications, en local

```bash
npm install
npx tsc --noEmit    # typecheck
npm run lint
npm test            # Jest — logique pure
```

Les tests pgTAP demandent Docker : `npx supabase@latest db start` puis
`npx supabase@latest test db`.

## Licence

Toute contribution est versée sous la licence du dépôt, la **GNU Affero General Public License
v3.0 ou ultérieure** (`LICENSE`). C'est un copyleft : le code dérivé reste sous la même licence,
et les mentions de paternité se conservent. Ouvrir une pull request vaut acceptation de ce cadre.
