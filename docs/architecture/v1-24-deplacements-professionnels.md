# v1-24 — Les déplacements professionnels, et la limite qu'on n'a jamais dite

> **Page de décision du chantier C4.3** ([#145](https://github.com/ScratchMe/Ramille/issues/145)),
> quatrième des six du lot 4. Écrite le 19/09/2026. Elle porte l'arbitrage **D7**.

## 1. D'où ça vient

Constat A2-13 : le produit demande « fais-tu un trajet domicile-travail régulier ? » et ne demande
**jamais** ce qu'on fait *pendant* le travail. Un commercial, une infirmière en visites, un
livreur, un artisan : pour eux, les kilomètres professionnels peuvent écraser tout le reste, et le
produit leur répond que leur empreinte est celle de leur trajet du matin.

L'arbitrage **D7** a été rendu le 10/09/2026, en deux parts :

> Ajoute-t-on un poste « déplacements professionnels » ? — **Pas maintenant.** Nommer la limite sur
> l'étape 1 (une ligne, sans arbitrage). Le poste lui-même est un increment à part. **Décidé le
> 10/09 : nommer la limite maintenant, le poste reste en lot 4.**

## 2. L'état des lieux, relevé le 19/09/2026

**La moitié décidée le 10/09 n'a pas été livrée.** Le texte d'aide de
`src/components/bilan/steps/commute-has-trip.tsx` dit aujourd'hui, en entier :

> Télétravail total, sans emploi, retraité ou autre situation : réponds Non, on passe directement à
> la suite.

La limite n'y est nulle part. Neuf jours se sont écoulés, quatre vagues de chantiers sont passées
dans ce fichier, et la décision la plus simple du lot — **une phrase, explicitement sans
arbitrage** — est la seule à n'avoir pas été faite. Elle n'était rattachée à aucun chantier lancé :
elle vivait dans une case de tableau d'arbitrages, et une case de tableau n'est pas une tâche.

Et le modèle, lui, est bien à trois postes : `v1-05` §1, `docs/design/README.md` (« Émissions
annuelles = somme de trois postes »), `assessment_results` avec ses colonnes par poste,
`dominant_poste` qui compare les trois, et **deux** boucles d'engagement (`commute` et `extras`,
ce dernier étant déjà une union de deux postes).

## 3. Ce que le quatrième poste coûterait vraiment

Ce n'est pas une question de plus, c'est un axe de plus, et il traverse tout :

| Ce qui change | Pourquoi |
|---|---|
| `v1-05` §1 | Le modèle à trois postes est un choix documenté, pas un accident |
| `recompute_assessment_results` | Un quatrième terme dans le total, et une quatrième branche de départage du poste dominant |
| `assessment_results` | De nouvelles colonnes figées, donc une migration de reprise pour les bilans existants |
| La restitution | Six barres à échelle commune deviennent sept ou huit |
| Les deux boucles | `extras` est déjà l'union de deux postes ; une troisième boucle, ou une union de trois ? |
| `poste_inserable` et sa jumelle | Une forme insérable de plus, dans les deux langages |
| `action_templates` | Un `poste` de plus, et des gabarits à écrire |

**Et un piège qui n'est pas technique : proposer l'impossible, à l'échelle d'un poste entier.**
C3.8 a corrigé le fait que le plan proposait « deux trajets sur cinq en métro » à un profil rural.
Un poste professionnel est ce défaut porté au maximum : **ces kilomètres ne sont presque jamais le
choix de la personne**. Proposer « faire une tournée sur cinq à vélo » à une infirmière, c'est lui
demander de changer ce que son employeur décide — et le produit a déjà écrit, dans `/conditions`,
qu'il ne fournit pas de prestation de conseil en mobilité.

## 4. La question qu'il faut résoudre avant, et qui n'est pas une question de produit

**Une empreinte carbone individuelle inclut-elle les déplacements professionnels ?** C'est une
question de **méthode**, pas de goût : ces kilomètres sont aussi comptés dans le bilan de
l'employeur, et le produit compare son total à un repère national (`carbon-reference.ts`) qui a sa
propre convention de périmètre.

Le produit n'a pas le droit de trancher ça à l'intuition : c'est exactement la famille de faute qui
a coûté 457 % sur la voiture électrique (`v1-07` §1.5), où le chiffre était juste et le périmètre
faux. **La réponse se lit dans la source du repère avant d'écrire une ligne** — et si elle n'est
pas explicite, le produit doit dire son périmètre plutôt que de le supposer.

## 5. Les décisions à prendre

### D1 — La phrase, maintenant

**Recommandation : la livrer tout de suite, et hors de ce chantier.** La décision date du
10/09/2026 et n'a pas à être reprise ; ce qui a manqué est un endroit où la faire atterrir. Forme
proposée, à relire avec `FRONT.md` (§ « écrire une phrase que quelqu'un lira ») :

> Télétravail total, sans emploi, retraité ou autre situation : réponds Non, on passe directement à
> la suite. **On ne compte pas ici les déplacements faits pendant ton travail.**

Elle tient en une phrase parce qu'elle **dit une limite** et n'ouvre rien : ni question, ni
promesse, ni « bientôt ».

### D2 — Le poste lui-même : lot 4, ou increment à part

**Recommandation : increment à part, hors du lot 4.** La fiche C4.3 le disait déjà (« l'increment :
une question de section 1, un segment, des actions ; rouvre `v1-05` §1 ») et le §3 ci-dessus montre
que « rouvre `v1-05` §1 » est un euphémisme : c'est le modèle de calcul, la restitution, les deux
boucles et le référentiel d'actions. Le lot 4 est une série de chantiers instruits en une page
chacun ; celui-ci demande sa propre page de spécification, pas une section de celle-ci.

**Ce qu'on casse si on se trompe** : en le gardant dans le lot 4, on le fera petit — une question
en plus, un terme en plus — et on obtiendra un poste qui entre dans le total sans action à
proposer, donc un chiffre qu'on ne peut que subir. C'est le défaut que C2.5 a retiré des loisirs
rares, réintroduit à plus grande échelle.

### D3 — Si l'increment est lancé : ce que le poste fait au total

Deux formes, et il faut choisir **avant** d'écrire la question :

1. **Il entre dans le total**, et le produit assume un périmètre plus large que le repère national ;
2. **Il est déclaré et affiché à part**, sous le total, comme un « ce que tu fais aussi, qui ne
   t'appartient pas ».

**Recommandation : la 2**, sous réserve du §4. Elle répond au constat — la personne n'est plus
invisible — sans casser la comparabilité du total, sans inventer des actions qu'on ne peut pas
tenir, et sans exiger que la question de méthode soit tranchée pour livrer quelque chose.

## 6. Ce qu'il ne faut pas casser

- **`normaliserReponses` efface toute la section 1** quand `commute_has_regular_trip` passe à
  `false`, et cette liste vit **à un seul endroit** — celle qui était écrite dans l'écran en
  oubliait un champ, le symptôme même du constat A2-17. Un poste professionnel ajouté à la
  section 1 devra y entrer, ou être une section à lui.
- **Le total est comparé à un repère national ACV**, et le périmètre est ce qui rend la
  comparaison honnête (§4).
- **Aucune action au gain inférieur à 5 kg/an n'est proposée**, et le contexte B4 filtre
  l'impossible. Un poste sans gabarit admissible n'aurait rien à proposer — ce qui est peut-être la
  bonne réponse, mais doit alors être **dit**, comme le plan à zéro action le dit déjà.
- **`dominant_poste` décide du cap et de la boucle hebdomadaire.** Un quatrième poste qui pourrait
  devenir dominant ferait porter le cap de la saison sur des kilomètres que la personne ne décide
  pas.

## 7. Ce que cette page demande

Une décision sur D1 (livrer la phrase — la recommandation est oui, et elle est déjà décidée depuis
le 10/09), une sur D2 (sortir le poste du lot 4 — recommandé), et **la lecture de la source du
repère national** avant toute autre chose si D2 va vers un increment.
