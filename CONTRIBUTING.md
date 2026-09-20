# Lire ce dépôt

**Lecture bienvenue, pull requests non attendues.**

Le dépôt est public **pour être lu**. Le passage en public a été fait pour lever le plafond de
minutes de CI, pas pour ouvrir le développement — et il n'y a pas d'équipe derrière : une personne
et un agent. Une pull request qui arrive peut donc rester sans réponse, ou être refusée pour une
raison qui n'a rien à voir avec sa qualité. Le dire est plus utile que de laisser espérer.

**Ce que ça ne retire pas** : la licence, la **GNU Affero General Public License v3.0 ou
ultérieure** ([`LICENSE`](LICENSE)), donne le droit d'utiliser ce code, de le modifier et de le
redistribuer, sous la même licence et en conservant les mentions de paternité. **Forker est le
chemin normal**, et il ne demande la permission de personne. Ce qui n'est pas promis ici, c'est du
temps de relecture — pas un droit.

Deux nuances qui ne sont pas dans la licence et qui valent d'être sues : **le nom « Ramille » et la
mascotte ne sont pas couverts** par elle ([`NOTICE`](NOTICE)), et le référentiel de facteurs
d'émission vient de l'ADEME, avec ses propres conditions.

## Ce qui est utile, et qui ne demande rien

Un **rapport**. Le produit affiche des nombres qu'une personne va croire, et un écart entre ce
qu'un écran explique et ce que la base calcule est le défaut qui coûte le plus cher ici. Donc :
une incohérence, une phrase fausse à l'écran, un chiffre qui ne correspond pas au calcul —
une issue, et c'est précieux.

Pour une **faille de sécurité**, ne pas ouvrir d'issue : [`SECURITY.md`](SECURITY.md) dit où écrire.

## Ce qu'il faut savoir pour lire, et qui explique le reste

Ces conventions sont aussi la raison pour laquelle une contribution de passage serait coûteuse à
intégrer — elles ne se devinent pas :

- **tout est en français** — interface, messages d'erreur, commentaires, contenu ;
- **[`CLAUDE.md`](CLAUDE.md) est la carte du projet.** Les fichiers d'outil à la racine
  (`FRONT.md`, `SUPABASE.md`, `EXPO.md`, `TESTING.md`, `VERCEL.md`, `RECETTE.md`) portent les
  pièges de chaque sujet et s'ouvrent **sur déclencheur** : la table en tête de `CLAUDE.md` dit
  lequel. C'est par là qu'on commence, pas par le code ;
- **les décisions sont datées et ne se réécrivent pas** (`docs/architecture/v1-0N-*.md`). Plusieurs
  tests n'épinglent pas un comportement mais une décision, précisément pour qu'elle ne soit pas
  « corrigée » par réflexe — l'ordre ACV des motorisations en est l'exemple le plus
  contre-intuitif : hybride émet plus que thermique, et c'est juste ;
- **toute dérivation pure affichée à la personne ou décidant d'une navigation est testée**, dans un
  `*.test.ts` colocalisé. Les tests de base de données sont en pgTAP, un fichier par sujet ;
- **plusieurs règles vivent en deux moitiés** — une en SQL, sa jumelle en TypeScript — parce que la
  même phrase doit sortir pareil d'un email et d'un écran. Toucher l'une sans l'autre est le défaut
  que ces paires existent pour attraper.

## Faire tourner le projet chez soi

```bash
cp .env.example .env    # deux variables, l'URL Supabase et la clé publiable
npm install
npm run web             # ou: npm run android
```

Les vérifications, les mêmes que la CI :

```bash
npx tsc --noEmit    # typecheck
npm run lint
npm test            # Jest — logique pure
```

Les tests de base de données demandent Docker : `npx supabase@latest db start` puis
`npx supabase@latest test db`.

Le parcours réel — le chemin nominal joué par Playwright contre la stack locale complète, la base
relue après chaque écriture — demande `npx supabase@latest start` et un export branché dessus :
`TESTING.md` §2.6 donne les commandes exactes, et ce que ce garde-fou laisse aux deux autres suites.

## Si une pull request arrive quand même

Elle entre sous la licence du dépôt, l'AGPL-3.0-or-later : l'ouvrir vaut acceptation de ce cadre.
Et **une issue d'abord** — pas par formalisme, mais parce que c'est la seule façon de savoir avant
d'écrire du code si le changement a une chance d'être voulu.
