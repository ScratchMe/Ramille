# Spécification fonctionnelle — App de sensibilisation à l'empreinte carbone transport (V1)

## 0. Contexte

Un Français émet en moyenne 10t de CO2/an ; la cible est ~2t/an d'ici 2050. Le transport est le premier poste d'émissions individuelles. Ce produit vise une **prise de conscience réelle et un déclic de changement de comportement**, sans obligation de prouver un impact causal mesurable. C'est un projet de conviction, pas un produit de rétention à optimiser pour la rentabilité.

Ce document est **fonctionnel** : il décrit le comportement attendu du produit, pas l'architecture technique, le stack, ou le modèle de données. Ces choix sont laissés à l'implémentation.

## 1. Objectifs (Goals)

- Provoquer une prise de conscience factuelle et non culpabilisante de l'empreinte carbone transport de l'utilisateur
- Identifier, pour chaque utilisateur, la décision de transport la plus significative dans son bilan (pour ancrer la suite)
- Proposer un cap de réduction réaliste, sans mécanique de plan complexe
- Maintenir un contact périodique léger qui favorise un réengagement volontaire, sans exiger de preuve d'impact

## 2. Non-goals (et pourquoi)

| Non-goal | Raison |
|---|---|
| Tracking GPS / automatique des trajets | Choix stratégique : le produit vise le changement de comportement via la conscience du choix, pas la précision de mesure. Le tracking passif retire l'utilisateur du moment de décision. |
| Mécaniques sociales / comparaison entre utilisateurs | Risque de honte comparative pour les profils captifs de la voiture (rural, pas d'alternative) — un segment que le produit veut inclure, pas décourager. |
| Streak quotidien, points, badges | Risque de sur-justification : dilue la motivation identitaire ("je deviens quelqu'un qui...") au profit d'une motivation extrinsèque fragile. Un streak raté sur un sujet chargé émotionnellement (climat, culpabilité) pousse à l'abandon plutôt qu'à la reprise. |
| Preuve causale d'impact (avant/après mesuré) | Hors scope pour cette V1 : le critère de succès est la qualité du moment de prise de conscience, pas une métrique d'impact prouvée. |
| Module de mobilisation citoyenne locale (pousser sa mairie, etc.) | Théorie du changement distincte (collectif vs individuel), à spécifier séparément si le principe de l'app se confirme. |

## 3. Périmètre V1 : niveau de soin par brique

| Brique | Niveau d'effort attendu |
|---|---|
| 1. Onboarding | **Soin maximal** — copy, framing, ton |
| 2. Bilan initial | **Soin maximal** — structure des questions, logique de restitution |
| 3. Plan de réduction | Fonctionnel simple, pas de sur-ingénierie |
| 4. Boucle d'engagement mensuelle | Fonctionnel simple, pas de sur-ingénierie |
| 5. Connexion / Authentification | Soin sur le **placement et le message**, composant standard pour l'interaction elle-même (bouton Google natif) |

C'est un choix délibéré : la valeur du produit se joue dans le moment de prise de conscience (briques 1 et 2), pas dans la mécanique de suivi.

## 4. Brique 1 — Onboarding

**Objectif** : contextualiser sans culpabiliser. Éviter une entrée par la peur pure (l'écart à 2050 est abstrait et lointain, et le registre anxiogène climatique tend à paralyser plutôt qu'à mobiliser).

**Contenu factuel obligatoire** (doit apparaître, peu importe l'ordre) :
- Moyenne actuelle d'un Français : ~10t CO2/an
- Cible : ~2t CO2/an d'ici 2050
- Le transport est le premier poste d'émissions individuelles

**Principe de framing** : ouvrir sur un bénéfice concret et proche pour l'utilisateur, pas sur l'écart à combler. Les chiffres factuels doivent être présents mais ne doivent pas être le premier message reçu par l'utilisateur.

**Flow suggéré** :
1. Écran d'accroche (bénéfice concret / promesse proche, pas les chiffres en premier)
2. Écran de contexte chiffré (10t → 2t, transport = 1er poste)
3. Écran de mise en confiance ("pas de jugement, un état des lieux honnête")
4. Transition vers le bilan

**Ton** : factuel, non moralisateur. Pas de mise en scène de l'urgence climatique, pas de vocabulaire catastrophiste.

## 5. Brique 2 — Bilan initial (assessment)

**Objectif** : obtenir une estimation déclarative complète, suffisamment précise pour servir de socle factuel à la prise de conscience. C'est le "moment de vérité" du produit — il peut se permettre plus de friction qu'ailleurs (interaction unique, pas répétée).

**Structure générale** : 4 sections séquentielles, chacune composée d'étapes atomiques (une question ou un petit groupe de champs liés par écran). Logique conditionnelle activée : une étape n'apparaît que si sa condition est remplie. Ordre des sections : Domicile-travail → Weekend/loisirs → Voyages annuels → Contexte structurel.

### Écran B0 — Transition

Contenu : rappel du temps estimé ("~5 min"), message de réassurance ("pas de jugement, réponses approximatives acceptées"). CTA : "Commencer mon bilan".

### Section 1 — Trajet domicile-travail / études

| Étape | Question | Type de champ | Options / validation | Condition d'affichage |
|---|---|---|---|---|
| B1.1 | As-tu un trajet régulier pour le travail ou les études ? | Choix unique | Oui / Non (télétravail total, sans emploi, retraité, autre) | Toujours |
| B1.2 | Combien de jours par semaine effectues-tu ce trajet en présentiel ? | Nombre (slider ou stepper) | 1 à 7, défaut 5 | Si B1.1 = Oui |
| B1.3 | Quelle est la distance aller de ce trajet ? | Nombre (km) avec option "Je ne sais pas" | Si "Je ne sais pas" → sélection par tranche : <5 km / 5-15 km / 15-30 km / 30-50 km / 50 km+ | Si B1.1 = Oui |
| B1.4 | Quel est ton mode de transport principal pour ce trajet ? | Choix unique | Voiture (seul) / Voiture (covoiturage) / Bus / Train ou RER / Métro ou tram / Vélo / Marche / Deux-roues motorisé / Trottinette ou mobilité douce | Si B1.1 = Oui |
| B1.5 | Combien de personnes partagez-vous en moyenne ce trajet ? | Nombre | 2 à 6+ | Si B1.4 = Voiture (covoiturage) |
| B1.6 | Utilises-tu un second mode de transport en complément (ex : vélo + train) ? | Choix unique | Oui / Non | Si B1.1 = Oui |
| B1.7 | Lequel ? | Choix unique | Même liste que B1.4 (sans l'option déjà choisie) | Si B1.6 = Oui |

Si B1.1 = Non : la section entière est ignorée, contribution domicile-travail = 0, passage direct à la Section 2.

### Section 2 — Trajets weekend / loisirs

| Étape | Question | Type de champ | Options / validation | Condition d'affichage |
|---|---|---|---|---|
| B2.1 | À quelle fréquence fais-tu des trajets loisirs le weekend (sport, sorties, famille) ? | Choix unique | Rarement (mensuel ou moins) / Une fois par semaine / Plusieurs fois par semaine | Toujours |
| B2.2 | Quel est le mode de transport principal pour ces trajets ? | Choix unique | Même liste que B1.4 | Si B2.1 ≠ Rarement |
| B2.3 | Quelle est la distance aller typique de ces trajets ? | Choix unique par tranche | <5 km / 5-15 km / 15-30 km / 30 km+ | Si B2.1 ≠ Rarement |

Si B2.1 = Rarement : contribution loisirs calculée sur une base résiduelle faible (voir calcul), pas de question de mode/distance.

### Section 3 — Voyages annuels (hors quotidien)

| Étape | Question | Type de champ | Options / validation | Condition d'affichage |
|---|---|---|---|---|
| B3.1 | Combien de fois prends-tu l'avion dans une année type ? | Nombre | 0 à 10+ | Toujours |
| B3.2 | Sur ces vols, combien sont courts (Europe, moins de 3h) ? | Nombre | 0 à B3.1, le reste étant classé long-courrier | Si B3.1 > 0 |
| B3.3 | Combien de fois par an fais-tu un trajet longue distance (>300 km) en train ? | Nombre | 0 à 10+ | Toujours |
| B3.4 | Combien de fois par an fais-tu un trajet longue distance (>300 km) en voiture ? | Nombre | 0 à 10+ | Toujours |

Les distances moyennes par trajet ne sont pas demandées individuellement (trop de friction) — des distances moyennes par défaut sont utilisées dans le calcul (voir plus bas), configurables sans changer le flow.

### Section 4 — Contexte structurel

| Étape | Question | Type de champ | Options / validation | Condition d'affichage |
|---|---|---|---|---|
| B4.1 | Dans quel type de zone vis-tu ? | Choix unique | Urbain dense / Périurbain / Rural | Toujours |
| B4.2 | Comment perçois-tu l'accès aux transports en commun près de chez toi ? | Choix unique | Bon / Limité / Inexistant | Toujours |
| B4.3 | Combien de véhicules motorisés possède ton foyer ? | Choix unique | 0 / 1 / 2 ou plus | Toujours |

Cette section n'entre pas dans le calcul d'émissions — elle sert uniquement à contextualiser la restitution et à éviter de traiter un profil rural sans alternative comme un "mauvais élève".

### Logique de calcul

Émissions annuelles = somme de trois postes, chacun en kgCO2e/an :

**Poste domicile-travail** (0 si B1.1 = Non) :
`distance_aller (km) × 2 × jours_semaine (B1.2) × 45 semaines/an × facteur_émission(mode B1.4) ÷ nb_personnes (si covoiturage, B1.5)`
— 45 semaines retient un an de travail typique hors congés/jours fériés, valeur par défaut ajustable.
Si second mode déclaré (B1.6/B1.7), répartir 50/50 la distance entre les deux modes, à ajuster si besoin.

**Poste loisirs** :
`distance_typique (km, milieu de tranche B2.3) × 2 × fréquence_hebdo_équivalente × 52 × facteur_émission(mode B2.2)`
— fréquence_hebdo_équivalente : Rarement = 0,25 ; Une fois/semaine = 1 ; Plusieurs fois/semaine = 3 (valeurs par défaut à valider, voir questions ouvertes).
Si B2.1 = Rarement, utiliser une distance et un mode par défaut (voiture, 15 km) pour une contribution résiduelle faible plutôt que zéro.

**Poste voyages annuels** :
`(nb_vols_courts × 1500 km × facteur_avion_court) + (nb_vols_longs × 9000 km × facteur_avion_long) + (nb_trajets_train × 800 km × facteur_train) + (nb_trajets_voiture_longue × 700 km × facteur_voiture)`
— distances moyennes par défaut (1500 / 9000 / 800 / 700 km) à valider, configurables sans changer le questionnaire.

### Table des facteurs d'émission (valeurs indicatives — à valider avant mise en production)

| Mode | Facteur (kgCO2e/km/passager) |
|---|---|
| Voiture (thermique moyenne) | ~0,20 |
| Bus | ~0,10 |
| Train / RER | ~0,02 |
| Métro / tram | ~0,005 |
| Vélo / marche / trottinette | ~0 |
| Deux-roues motorisé | ~0,10 |
| Avion court-courrier | ~0,20 |
| Avion long-courrier | ~0,15 |

⚠️ **Ces valeurs sont des ordres de grandeur pour permettre un premier développement fonctionnel, pas des données sourcées et validées.** Elles doivent être remplacées par les valeurs officielles de la Base Empreinte® ADEME avant toute mise en production — voir questions ouvertes.

### Sortie clé — Décision de transport dominante

Comparer les trois postes (domicile-travail, loisirs, voyages) : le poste le plus élevé devient la **décision de transport dominante**, formulée à partir du mode principal associé (ex. : "trajet domicile-travail en voiture solo").

**Règle de départage en cas d'égalité stricte (ou quasi-égalité, écart < 5%)** : priorité au poste le plus régulier — domicile-travail > loisirs > voyages — car c'est celui sur lequel la boucle mensuelle (Brique 4) aura le plus de prise actionable. *Ceci résout la question ouverte correspondante posée dans la spec UI/UX.*

**Restitution** : présenter le résultat sans classement ni comparaison à d'autres utilisateurs. Contextualiser par rapport à la moyenne nationale et à la cible 2050, sans ton culpabilisant.



## 6. Brique 3 — Plan de réduction (version simplifiée V1)

**Objectif fonctionnel minimal** : donner un cap de réduction réaliste, sans mécanique sophistiquée de sous-objectifs.

**Cadence** : doit être un paramètre configurable, pas figé en dur dans le produit — un objectif mensuel produirait des échecs artificiels vu la forte variance saisonnière des transports (vacances, météo).

Piste par défaut à implémenter : un découpage aligné sur les **saisons calendaires** (printemps / été / automne / hiver) plutôt qu'un trimestre glissant à date arbitraire à partir de l'inscription. L'intérêt : pouvoir comparer un même type de saison d'une année sur l'autre (mon été vs mon été précédent) plutôt qu'une fenêtre de 3 mois sans ancrage saisonnier réel. *Reste un paramètre ouvert, ajustable sans repenser le produit (voir questions ouvertes).*

**Contenu** : 1 à 2 actions suggérées, directement liées à la décision dominante identifiée au bilan. Pas de plan détaillé mois par mois pour cette V1.

## 7. Brique 4 — Boucle d'engagement mensuelle (version simplifiée V1)

**Objectif** : check-in léger et périodique — pas de log quotidien, pas de streak.

**Cadence** : mensuelle.

**Contenu du check-in** (version simplifiée de la logique retenue) :
- Une question fermée, ancrée sur la décision dominante identifiée au bilan (ex. : "As-tu changé de mode de transport au moins une fois ce mois-ci pour [trajet identifié] ?")
- Pas d'auto-évaluation globale floue ("je pense avoir progressé") en complément — le check-in reste ancré sur un fait précis
- Pas de personnalisation poussée du wording par profil pour cette V1 : une formulation générique paramétrée par le trajet identifié suffit

**Comportement adaptatif minimal** :
- Réponse positive → message de renforcement bref
- Réponse négative → relance factuelle, non culpabilisante (pas de notification insistante ni répétée)

**Signal d'engagement retenu** (indicatif, pas causal) : 2 check-ins mensuels consécutifs complétés.

## 8. Brique 5 — Connexion / Authentification

**Objectif** : minimiser la friction de création de compte tout en protégeant la métrique de succès n°1 (taux de complétion du bilan). Ne jamais faire porter le coût de l'authentification au moment où l'utilisateur n'a encore reçu aucune valeur.

**Placement retenu (validé)** : la demande de connexion intervient **après la restitution du bilan** (résultat + décision dominante affichés), avant l'accès au plan de réduction et à l'inscription à la boucle mensuelle. Le bilan lui-même reste **accessible sans compte** (session anonyme/locale) — ce choix protège directement la métrique de succès n°1 (taux de complétion du bilan).

**Cibles de déploiement V1** : Web et Android uniquement. Pas d'app iOS pour cette version.

**Méthodes de première connexion** :
- Sign in with Google (OAuth) — méthode mise en avant, friction minimale
- Connexion classique (email + mot de passe) — en complément, pour ne pas exclure les utilisateurs sans compte Google ou méfiants d'un rattachement à un compte tiers, notamment dans le segment rural/moins connecté que le produit veut inclure
- Le bilan complété avant connexion est conservé en session/stockage local ; si l'utilisateur quitte sans se connecter, son résultat reste accessible localement à son retour, mais rien n'est synchronisé côté serveur tant qu'aucun compte n'est créé
- Au moment de la connexion (quelle que soit la méthode), les données du bilan déjà complété sont automatiquement rattachées au compte nouvellement créé — pas de ressaisie
- La connexion classique implique un parcours de récupération de mot de passe (mot de passe oublié) — à prévoir dès cette V1 si cette méthode est proposée

**Retour futur (reconnexion)** :
- Session valide sur l'appareil → connexion silencieuse, aucun écran de login affiché, arrivée directe sur le check-in ou le tableau de bord
- Session expirée / déconnexion / nouvel appareil → écran de reconnexion minimal, choix entre Google et connexion classique
- Reconnexion sur un nouvel appareil avec le même compte → récupération à l'identique des données (bilan, décision dominante, historique de check-ins)

**États et cas limites** :
- Bilan complété sans connexion, app fermée puis rouverte : le résultat doit rester visible localement — ne jamais faire perdre la prise de conscience déjà obtenue faute de compte créé
- Connexion Google annulée ou en erreur : retour à l'écran de restitution sans blocage, possibilité de réessayer plus tard
- Mot de passe oublié (connexion classique) : parcours de réinitialisation standard, sans perte des données déjà rattachées au compte
- Tentative de créer un compte classique avec un email déjà utilisé via Google (ou l'inverse) : à définir, voir questions ouvertes
- Suppression de compte : hors scope de détail pour cette V1, à traiter si le produit dépasse le stade V1

## 9. Success metrics (redéfinies)

Le critère de succès de cette V1 **n'est pas** une preuve d'impact carbone mesurable.

Indicateurs qualitatifs à observer, sans objectif chiffré strict :
- Taux de complétion du bilan initial
- Taux d'utilisateurs atteignant 2 check-ins mensuels consécutifs
- Qualité perçue de la restitution du bilan (si un retour qualitatif est possible)

L'absence de preuve causale de changement de comportement n'invalide pas le projet.

## 10. Questions ouvertes

| Question | Qui tranche |
|---|---|
| Cadence par défaut à implémenter : saisons calendaires (piste privilégiée) ou trimestre glissant ? Le paramètre doit rester configurable dans tous les cas. | Produit |
| Quelle source de facteurs d'émission utiliser pour le calcul du bilan ? Les valeurs de ce document sont des ordres de grandeur indicatifs, **pas des données sourcées** — à remplacer par la Base Empreinte® ADEME (ou équivalent) avant mise en production | Data / implémentation |
| Les distances moyennes par défaut pour les voyages (1500 km vol court, 9000 km vol long, 800 km train longue distance, 700 km voiture longue distance) et les fréquences hebdomadaires équivalentes pour les loisirs (0,25 / 1 / 3) sont des hypothèses de travail — à valider ou ajuster | Produit / data |
| Faut-il un champ de retour qualitatif libre pour compenser l'absence de preuve causale ? | Produit |
| Le module de mobilisation citoyenne locale est explicitement hors scope V1 — à spécifier séparément si le principe de l'app se confirme | Produit |
| Faut-il une méthode de connexion alternative à Google, pour ne pas exclure les profils moins équipés ou méfiants d'un compte Google unique — précisément le segment rural/moins connecté que le produit veut inclure ? | ~~Produit~~ *Résolu : ajout d'une connexion classique email + mot de passe en complément.* |
| Le produit vise-t-il un déploiement sur l'App Store iOS ? Si oui, Apple impose la présence d'une option "Sign in with Apple" en parité de toute autre connexion tierce (Google incluse) — dépendance externe à vérifier avant implémentation | ~~Compliance~~ *Résolu pour la V1 : déploiement Web + Android uniquement, non concerné. À réévaluer si une version iOS est envisagée.* |
| Que devient un bilan anonyme jamais rattaché à un compte après un certain temps (purge, conservation locale indéfinie) ? | Produit / data |
| Comment gérer une tentative de connexion classique avec un email déjà utilisé via Google (ou l'inverse) ? | Produit / implémentation |

## 11. Notes pour l'implémentation

- Priorité suggérée : Brique 2 (bilan) > Brique 1 (onboarding) > Brique 5 (connexion) > Brique 4 (boucle) > Brique 3 (plan)
- Le copy des briques 1 et 2 mérite une relecture humaine avant mise en production, même si le reste est généré rapidement
- Aucun choix de stack, d'architecture ou de modèle de données n'est imposé par ce document
