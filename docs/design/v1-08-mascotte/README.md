# Canvas — placement de la mascotte

Sources du canvas de design publié le 05/09/2026, à la demande produit d'aller plus loin que
les trois emplacements livrés le même jour.

Artifact : https://claude.ai/code/artifact/a9042ca8-6cb5-4fca-84ff-ea01d4b3d26e

## Ce que le canvas contient

Deux pages. **Parcours** : six écrans au format téléphone (390 × 844) — accueil, questionnaire,
calcul, restitution, plan et check-ins, périodes calmes du suivi. **Vocabulaire** : la planche
d'expressions et le composant `Mascot` isolé.

`Mascot.dc.html` est importé par tous les écrans (`<dc-import name="Mascot">`) : la géométrie
SVG y est reprise trait pour trait de `src/components/mascot.tsx`, pas redessinée. Si le
composant de l'app change, c'est ce fichier-là qu'il faut suivre.

Le reste des valeurs vient de `src/constants/theme.ts` et des écrans réels — Spline Sans,
accent `#1F6F4A`, cartes 24/20/18, bouton 54 / rayon 27, tranches de couleur exactes. Rien
n'est arrondi à une grille.

## Ce qui est proposé, et ce qui est déjà livré

Livré (PR #45) : en-tête du questionnaire, cartes de check-in, félicitation du profil vertueux
sur la restitution et sur `/plan`.

**Le reste a été validé et implémenté le 05/09/2026** : accueil de l'onboarding, écran de calcul,
périodes calmes de `/suivi`, les deux expressions `thinking` et `resting`, et l'inclinaison.

Trois écarts assumés entre l'artboard et l'implémentation, chacun parce que l'artboard était une
esquisse de placement et pas un brief complet :

- **L'accueil garde son illustration.** L'artboard remplaçait `OnboardingHeroIllustration` par la
  mascotte seule et changeait le titre en « Tes déplacements, en chiffres ». L'illustration porte
  « une personne et ses trajets du quotidien », spécifié par le handoff design §1.1, que la
  mascotte ne rend pas ; et le titre proposé ouvre sur les chiffres, ce que la même spec interdit.
  La mascotte est donc ajoutée au-dessus du titre existant, à 48 px et inclinée de −7°.
- **L'écran de calcul n'a pas de barre de progression.** L'artboard en montrait une à 62 %. On ne
  sait pas où en est le calcul : une barre qui avance sans rien mesurer est un mensonge
  d'interface. Le souffle de la mascotte suffit.
- **Aucun décompte dans les textes.** L'artboard annonçait « neuf réponses, treize facteurs
  d'émission » : le référentiel en comptait déjà quinze le lendemain (motorisations hybrides), et
  le nombre d'étapes visibles dépend des réponses. Même raison, l'artboard des périodes calmes
  annonçait « ton prochain point arrive lundi » — la cadence dépend de la boucle.

## La règle qui tient l'ensemble

**La mascotte apparaît là où le produit accompagne, félicite ou fait patienter — jamais là où
il annonce un chiffre lourd.** Elle n'est pas à côté du total, ni près d'une empreinte élevée :
y mettre un visage serait commenter, et le produit ne commente pas.

Corollaire : le vocabulaire ne comporte aucune expression négative, et ne doit pas en recevoir.
Ni sourcil froncé, ni bouche tombante — le registre triste n'existe pas ici par construction.

## Régénérer

Le fichier assemblé (~2,5 Mo, embarquant l'éditeur) n'est pas versionné, cf. `.gitignore`. Il se
reconstruit depuis ces sources via la commande de seed de la skill `design`, en passant les huit
artboards et `canvas.json`, puis se republie sur l'Artifact existant pour en conserver l'URL.
