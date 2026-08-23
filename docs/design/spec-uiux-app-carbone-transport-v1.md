# Spécification UI/UX — App de sensibilisation carbone transport (V1)

> Complète la spec fonctionnelle V1. Décrit l'intention d'écrans, les patterns d'interaction et les principes visuels — pas un design system complet, pas de maquettes pixel-perfect.

## 0. Principes de design transverses

- **Cohérence ton visuel / ton rédactionnel** : factuel, non-alarmiste, non-culpabilisant. Le visuel ne doit jamais réintroduire par les couleurs ou les icônes ce qu'on a écarté au niveau du contenu.
- **Aucun langage visuel de gamification** : pas de flamme de streak, pas de trophée/badge, pas de classement, pas de confettis exagérés.
- **Palette** : éviter le rouge alerte/urgence en dominante. Privilégier des tons neutres et apaisants. Le rouge peut ponctuer un chiffre factuel mais ne doit pas être l'identité visuelle du produit.
- **Hiérarchie de soin** (reprend l'asymétrie de la spec fonctionnelle) : Onboarding + Bilan = polish maximal (illustration, transitions soignées). Plan + Boucle mensuelle = UI fonctionnelle sobre, composants standards, pas d'illustration custom. Connexion = composant standard (bouton Google natif, non personnalisé), mais placement et message autour du bouton soignés.
- **Mobile-first** : la décision de transport se prend le plus souvent hors bureau, en mobilité.
- **Accessibilité** : contrastes suffisants, jamais la couleur seule pour transmettre une info binaire (pas de "rouge = mauvais / vert = bon" sans texte associé), tailles de police lisibles.

## 1. Onboarding — soin maximal

**Écrans** (séquentiels, style swipe/next, pas de formulaire) :
1. Accroche — bénéfice concret en premier, pas de chiffre. CTA type "Découvrir mon impact".
2. Contexte chiffré — 10t → 2t, transport = 1er poste. Une visualisation simple (jauge ou barre) plutôt qu'un texte brut, sans surcharge graphique.
3. Réassurance — ton chaleureux, visuellement calme, message "pas de jugement, un état des lieux honnête".
4. Transition vers le bilan — CTA clair, avec le temps annoncé ("~5 min") pour poser l'attente de friction avant d'y entrer.

**Progress indicator** : points simples, pas de barre de pourcentage — l'onboarding ne doit pas donner un sentiment d'examen.

## 2. Bilan initial — soin maximal

**Format** : questionnaire séquentiel (une question ou un petit groupe à la fois), pas un long formulaire scrollable d'un coup. Réduit la charge perçue malgré la friction acceptée sur cette brique.

**Barre de progression visible** — contrairement à l'onboarding, c'est ici un vrai parcours à compléter ; l'utilisateur doit savoir combien d'étapes restent.

**Ordre des sections** : domicile-travail → weekend/loisirs → voyages annuels → contexte structurel (en dernier, pour ne pas donner l'impression que c'est une justification a posteriori).

**Champ contexte structurel** (rural/urbain, accès perçu aux transports en commun) : formulation neutre — "Quel est ton contexte de mobilité ?" plutôt qu'une question qui sonne comme une demande d'excuse.

**Écran de restitution** :
- Chiffre principal (estimation annuelle) affiché clairement, sans code couleur alarmant
- Comparaison factuelle à la moyenne nationale et à la cible 2050, présentée en position ("tu es à X% de..."), jamais en jugement
- **La décision de transport dominante mise en avant visuellement plus que le chiffre total** — c'est l'info qui sera reprise dans la boucle mensuelle, elle doit être l'élément le plus mémorable de l'écran
- CTA vers le plan de réduction

## 3. Plan de réduction — fonctionnel simple

- 1 à 2 actions suggérées, affichées en liste ou cartes basiques, liées à la décision dominante
- Cadence affichée en simple label texte (saison ou trimestre selon paramétrage) — pas de calendrier visuel élaboré
- Pas de timeline graphique pour cette V1
- CTA de retour vers le bilan si besoin

## 4. Boucle d'engagement mensuelle — fonctionnel simple

- **Déclenchement** : notification simple, ton neutre, jamais insistante ni répétée
- **Écran de check-in** : une question fermée, présentation minimaliste, sans décor
- **Feedback immédiat** :
  - Réponse positive → message de renforcement court, chaleureux mais sobre (pas de confettis ni de mise en scène excessive)
  - Réponse négative → relance factuelle, jamais culpabilisante (pas d'icône triste, pas de mise en scène de déception)
- **Aucun indicateur de streak visuel**
- Le signal "2 check-ins consécutifs" reste une **mention textuelle discrète**, jamais un badge ou une icône de récompense — point de vigilance explicite, voir questions ouvertes

## 5. Connexion / Authentification — soin sur le message, composant standard

**Écran de proposition de connexion** (déclenché après la restitution du bilan, pas en pop-up intrusif) :
- Message qui capitalise sur ce qui vient d'être vu — ex. "Garde ce résultat et suis ta progression" plutôt qu'un générique "Créer un compte"
- CTA principal proéminent : bouton "Se connecter avec Google" (respecter le branding standard Google, ne pas le personnaliser — un des rares endroits où suivre un standard externe prime sur l'identité visuelle du produit, pour la confiance et la reconnaissance immédiate de l'utilisateur)
- Option secondaire, visible mais moins proéminente que Google : connexion classique (email + mot de passe), sous forme de lien ou petit bouton ("Utiliser un email à la place") plutôt qu'un formulaire ouvert par défaut — pour ne pas diluer visuellement la simplicité du chemin Google
- CTA tertiaire discret mais visible, jamais caché ni culpabilisant : "Continuer sans compte" / "Plus tard" — cohérent avec le principe de non-culpabilisation transverse

**Formulaire de connexion classique** (si l'utilisateur choisit cette option) :
- Deux champs seulement : email, mot de passe — pas de champs additionnels à la création (prénom, etc.) pour cette V1
- Lien "Mot de passe oublié" visible immédiatement, pas enfoui
- Erreurs de validation en ligne, ton neutre (jamais "mot de passe incorrect" sec sans reformulation posée)

**Écran de retour (reconnexion)** :
- Session valide → aucun écran, redirection directe vers le check-in ou le tableau de bord
- Session expirée → écran minimal avec les deux options (bouton Google + lien connexion classique), sans texte de friction ni de reproche

**Relance douce si bilan anonyme non rattaché à un compte** :
- Bandeau discret ou message doux à la réouverture de l'app, jamais une notification insistante, jamais un blocage d'accès au résultat déjà obtenu

**États & cas limites spécifiques** :
- Connexion Google annulée ou erreur réseau : message d'erreur neutre, pas de blocage, retour possible à l'écran précédent
- Plusieurs comptes Google sur l'appareil : laisser le picker natif Google gérer la sélection, pas de redesign custom
- Mot de passe oublié : parcours de réinitialisation en 2-3 écrans maximum, pas plus lourd que le reste du produit

## 6. États & cas limites

- État vide (avant complétion du bilan)
- Abandon en cours de bilan → reprise possible là où l'utilisateur s'est arrêté, pas de redémarrage forcé
- Décision dominante ambiguë (ex-aequo entre deux postes d'émission) → comportement à définir, voir questions ouvertes
- Check-in manqué ou en retard → aucune pénalité visuelle, simple reprise possible au prochain point de contact

## 7. Composants à prévoir (liste, pas de design system complet)

- Carte de restitution du bilan
- Composant question fermée (check-in)
- Jauge/visualisation simple du chiffre carbone
- Liste d'actions suggérées (plan)
- Formulaire de connexion classique (email + mot de passe, avec état d'erreur)

## 8. Questions ouvertes

| Question | Qui tranche |
|---|---|
| Que faire visuellement en cas d'ex-aequo entre deux décisions de transport dominantes au bilan ? | Produit / design |
| Illustration originale pour l'onboarding et le bilan, ou visuels génériques suffisants pour cette V1 ? | Design |
| La mention "2 check-ins consécutifs" peut-elle rester purement textuelle sans risquer de recréer, même involontairement, la logique badge/trophée écartée au niveau du contenu ? | Produit |
| Le CTA "Continuer sans compte" doit-il rester visible en permanence, ou apparaître après un court délai pour ne pas donner l'impression que le compte est négligeable ? | Design |

## 9. Notes pour l'implémentation

- Priorité de polish UI : Bilan (restitution surtout) > Onboarding > Connexion (message/placement) > Boucle mensuelle > Plan
- Aucune dépendance à un design system tiers imposée ici — latitude laissée à l'implémentation
- Point de vigilance transverse : vérifier à chaque écran que le visuel (couleurs, icônes, animations) ne réintroduit pas ce qui a été explicitement écarté au niveau du contenu — urgence climatique dramatisée, gamification, comparaison sociale
