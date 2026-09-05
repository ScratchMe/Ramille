# v1-09 — Renommage TraceVerte → Ramille

**Date** : 05/09/2026. **Statut** : décision actée. Ce document est le seul endroit qui
explique pourquoi le produit ne s'appelle plus TraceVerte ; les documents `v1-01` à `v1-08`
gardent l'ancien nom parce qu'ils datent d'avant, et on ne réécrit pas une décision datée.

## 1. Pourquoi

`traceverte.com` est une entreprise alsacienne (Mutzig, Strasbourg) de vente, location et
réparation de vélos, randonnées et événementiel, **active depuis 25 ans**, label commerçant
d'Alsace 2024. Aucune marque déposée visible — et ça ne change rien : en droit français,
l'antériorité d'usage dans un secteur voisin fonde une action en concurrence déloyale dès
qu'il y a risque de confusion. Ici tout se cumulait : même mot, « mobilité douce » à côté de
« empreinte carbone des transports », même public national. Et la confusion jouait contre
nous — notre app aurait eu l'air d'être la leur.

## 2. Pourquoi Ramille

Le nom est **aussi celui de la mascotte** : une feuille à visage qui accompagne dans la
durée, et qu'on peut nommer à l'onboarding, faire signer les rappels, faire parler aux
paliers. Un seul nom à retenir, le produit *est* le personnage (même logique que les marques
au prénom — Alan, Lydia — avec un visage dessus). *Ramille* : petite branche, terme
botanique rare ; sonne comme un prénom ; sept lettres ; aucune connotation à défaire.

### Ce qui a été vérifié

| Vérification | Résultat |
| --- | --- |
| Registre Sirene, « Ramille » exact | deux sociétés : une **holding** à Paris (2024, activités des sièges sociaux) et une supérette à Marseille (2001) **cessée**. Plus trois « Les Ramilles » (location de logements, entretien de bâtiments). Aucune activité grand public, logicielle, de transport ou d'environnement. |
| `ramille.fr` | libre au 05/09 — réservé par l'éditeur le jour même |
| `ramille.app` | libre |
| `ramille.com` | pris, derrière un Cloudflare (contenu non vérifiable d'ici) |
| Base des marques INPI, classes 9 / 42 / 39 | **à faire par l'éditeur** — non interrogeable depuis l'environnement de développement |

Trois règles de droit qui ont guidé le choix, à retenir pour la prochaine fois :

1. **Un nom commun peut être une marque** : ce qui compte est la distinctivité par rapport au
   produit, pas la présence du mot au dictionnaire. « Ramille » ne décrit pas une app.
2. **Principe de spécialité** : une marque ne protège que ses classes et les produits
   similaires. La question n'est jamais « une entreprise porte-t-elle ce nom ? » mais « en
   porte-t-elle un dans nos classes, ou avec une notoriété qui déborde ? »
3. **Les droits non déposés** (dénomination sociale, nom commercial, domaine) n'opposent
   qu'en cas de **risque de confusion**, donc de proximité d'activité. C'est ce cumul-là qui
   condamnait TraceVerte, et qui est absent pour Ramille.

Corollaire : plus un mot est utilisé par des acteurs différents, plus il est banalisé et
moins chacun peut en revendiquer l'exclusivité (« Mélisse », 1 652 sociétés, était sûr par
dilution mais impossible à posséder). Un mot rare détenu par personne dans nos classes est
le meilleur cas : **à déposer nous-mêmes** en 9 et 42.

### Écartés

- Toute construction « X vert(e) » : le patron exact du nom qu'on quitte — *Sillage vert*
  serait lu comme une reformulation de *Trace verte*, en synonyme.
- *Nervure* (le seul mot qui nomme le dessin) : `nervure.fr` détenu par un atelier depuis
  2004, renouvelé jusqu'en 2030. *Foliole* : `.fr` pris en 2024 par une entité du même nom.
- Les feuilles à infuser (*Mélisse*, *Menthe*, *Verveine*) : forme et douceur parfaites,
  tous les `.fr` pris, signes banalisés.

## 3. Ce qui change, ce qui ne change pas

Le nom vit dans `src/constants/produit.ts` (`APP_NAME`) et nulle part en dur dans un écran —
les titres d'onglet, les pages légales, la carte de partage, le message de partage et le nom
du fichier d'export en dérivent. Deux endroits le répètent en littéral, faute de pouvoir
importer `src/` : `api/` (Vercel Functions, tsconfig séparé — un import échouerait en
silence, cf. CLAUDE.md) et les commentaires des SVG d'assets.

Ce qui garde l'ancien nom, **à dessein** :

- **Les clés AsyncStorage** `traceverte.bilan_draft.v1` et
  `traceverte.connexion_proposal_seen.v1`. Invisibles, et les renommer effacerait le
  brouillon de bilan de quiconque en a un. Commentées dans le code pour que personne ne les
  « corrige ».
- **Les migrations SQL appliquées** — vingt en-têtes citent TraceVerte. On ne réécrit pas
  l'historique ; le nom y est daté.
- **Le projet Supabase distant**, toujours `TraceVerte-v1` dans son tableau de bord. Ce nom
  n'apparaît nulle part côté utilisateur (l'écran de consentement Google porte le nom de
  l'app, pas celui du projet) ; le renommer n'apporte rien et l'URL du projet ne changerait
  pas de toute façon.
- **Le nom du dépôt GitHub** `ScratchMe/TraceVerte` — GitHub redirige l'ancien nom, mais
  chaque remote local, chaque lien dans les PR et les issues, et l'intégration Vercel y sont
  attachés. À renommer un jour calme, pas pendant la bascule.

## 4. Séquencement

Le renommage se fait en **deux PR**, parce que deux choses ne peuvent pas partir avant que
le domaine soit servi :

- **PR A — le nom** (cette PR). Tout ce qui précède, plus `app.json` : `name`, `slug`,
  `scheme` (deep link natif) et surtout **`package` → `fr.ramille.app`**, l'identité de l'app
  sur Google Play, inchangeable après la première publication. La V1 n'y est pas encore :
  c'est exactement le moment. L'URL canonique `src/lib/app-url.ts` bascule aussi ici : elle
  ne sert que sur Android, où aucun build n'existe.
- **PR B — le domaine**, quand `www.ramille.fr` répond sur Vercel et que la boîte
  `contact@ramille.fr` existe : `CONTACT_EMAIL` (contact RGPD des pages légales — un
  courriel qui rebondit est pire qu'un ancien nom), et une migration pour le lien des
  rappels par email, composé côté SQL — un rappel qui pointe vers un domaine mort casserait
  la seule boucle de réengagement du produit.

Les étapes manuelles de l'éditeur, dans l'ordre où elles se débloquent, sont tenues dans le
document de coordination remis le 05/09 (Vercel, Resend, OAuth, Supabase, INPI, Play).
Deux d'entre elles ont un délai qui ne dépend pas de nous : la **re-vérification Google de
l'écran de consentement OAuth** (tout changement de nom, domaine ou logo la déclenche) et la
**fenêtre d'opposition INPI** de deux mois après publication du dépôt.
