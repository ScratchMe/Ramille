# Handoff : TraceVerte — Écrans V1 (sensibilisation carbone transport)

## Overview
Vingt-huit écrans mobiles haute fidélité couvrant la V1 de l'app : onboarding (4), bilan initial (11 écrans de questionnaire couvrant les 4 sections et la logique conditionnelle, + la restitution), plan de réduction, boucle d'engagement mensuelle (check-in + feedbacks oui/non), connexion / authentification (5 écrans), et trois états limites (bilan non fait, reprise de bilan, check-in manqué).

Cible d'implémentation : le dépôt `ScratchMe/TraceVerte` (React Native / Expo, branche `main`).

## À propos des fichiers de design
`traceverte-ecrans-v1.dc.html` est une **référence de design créée en HTML** : un prototype qui montre l'apparence et le comportement attendus, pas du code de production à copier. La tâche est de **recréer ces écrans dans l'environnement existant du dépôt** (React Native + Expo Router, `src/constants/theme.ts`, `themed-text.tsx`), avec ses conventions et ses composants.

Le fichier s'ouvre directement dans un navigateur (il charge `support.js`, inclus). Tous les styles sont inline sur les éléments — les valeurs se lisent donc directement dans le markup.

Chaque cadre porte un attribut `data-screen-label` qui donne son nom. Sous chaque cadre, une note de conception explique l'intention (désactivable via le prop `showAnnotations`).

## Fidélité
**Haute fidélité.** Couleurs, typographie, espacements et copy sont définitifs (le copy des briques 1 et 2 mérite une relecture humaine avant prod, comme demandé par la spec fonctionnelle). Reproduire au pixel avec les composants du dépôt.

Deux réserves explicites :
- **Palette** : les écrans utilisent un accent **vert forêt `#1F6F4A`**, alors que `src/constants/theme.ts` porte aujourd'hui un bleu `#208AEF`. Divergence assumée et validée côté design. Décision produit à prendre : porter le vert dans le thème du dépôt, ou revenir au bleu (la substitution est mécanique, un seul accent).
- **Chiffres** : les valeurs de restitution (2,9 t moyenne transport France, 0,5 t part transport compatible 2050, répartition des postes 2,9 / 2,4 / 2,2 / 2,5 t) sont des **placeholders à confirmer** sur la Base Carbone ADEME. Les 10 t / 2 t de l'onboarding viennent de la spec.

## Design tokens

### Couleurs
| Rôle | Valeur |
|---|---|
| Accent (primaire, poste dominant, barres actives) | `#1F6F4A` |
| Accent — texte sur fond teinté | `#14563A` |
| Teinte accent (carte de la décision dominante, illustrations) | `#E4EFE8` |
| Accent atténué (postes non dominants, barres de contexte) | `#A9C8B6` |
| Fond écran | `#FFFFFF` |
| Fond écran teinté (onboarding 3) | `#F3F8F4` |
| Bouton tiers (Google) — fond / bordure | `#FFFFFF` / `1px #DDE0D9`, ombre `0 1px 2px rgba(19,22,18,0.06)` |
| Surface neutre (panneaux, chips, boutons secondaires) | `#F0F1EC` |
| Surface neutre 2 (rayures placeholder) | `#F6F8F3` |
| Bordure / rail de barre | `#DDE0D9` |
| Points de pagination inactifs sur fond teinté | `#CDD7CF` |
| Texte principal | `#131612` |
| Texte secondaire | `#39403B` |
| Texte tertiaire / labels | `#5E655F` |
| Fond du canvas de présentation (hors app) | `#EAECE6` |

Aucune sémantique vert = bon / rouge = mauvais : l'accent marque ce qui est **dominant ou actionnable**, jamais un jugement. Pas de rouge, pas d'orange, pas d'icône d'alerte.

### Typographie
Famille unique : **Spline Sans** (Google Fonts, poids 400/500/600/700). Monospace système (`ui-monospace, SFMono-Regular, Menlo`) uniquement pour les légendes de placeholder et les mentions de source.

| Usage | Taille / interligne / poids |
|---|---|
| Titre d'écran XL (accroche onboarding) | 34 / 40 / 600, `letter-spacing:-0.02em` |
| Titre d'écran L | 30–32 / 36–38 / 600, `-0.02em` |
| Titre d'écran M (questions, états) | 26 / 32–34 / 600, `-0.01em` |
| Chiffre clé (total annuel) | 26 / 32 / 600 |
| Valeur de slider (jours) | 34 / 40 / 600 |
| Valeur saisie (champ km) | 28 / 600 |
| Corps | 16 / 24 / 400 |
| Corps confort (onboarding 3) | 17 / 26 / 400 |
| Corps dense (cartes de plan) | 15 / 22 / 400 |
| Label / secondaire | 14 / 20 |
| Légende source (mono) | 11–12 / 16–18 |
| Libellé de bouton | 16 / 600 |

### Espacements et formes
- Padding d'écran : `24px` horizontal. Gap vertical courant : `20–28px`.
- Rayons : bouton pleine largeur `27px` (hauteur `54px`), carte principale `24px`, panneau `20px`, carte bordée `18px`, option de liste `16px`, chip `22px`, champ `16px`, petit label `8px`.
- Bouton primaire : hauteur `54px`, fond `#1F6F4A`, texte `#FFFFFF` 16/600, pleine largeur.
- Bouton secondaire : même hauteur, fond `#F0F1EC`, texte `#131612`.
- Action tertiaire : texte seul `14px` `#5E655F`, centré.
- Lien d'action secondaire : texte `15px/600` `#1F6F4A` (« Utiliser un email à la place », « Mot de passe oublié »).
- Champ de saisie : hauteur `56px`, rayon `16px`, fond `#F0F1EC`, padding horizontal `18px`, texte `16px` ; état focus/erreur = bordure `1.5px solid #1F6F4A`.
- Bouton primaire désactivé : fond `#F0F1EC`, texte `#5E655F`.
- Bandeau discret : padding `14px 16px`, rayon `16px`, fond `#F0F1EC`, texte `14/20` `#39403B` + action `14/600` `#1F6F4A`.
- Option sélectionnée : fond `#E4EFE8` + bordure `1.5px solid #1F6F4A`, texte 600. Non sélectionnée : fond `#F0F1EC`, texte 400.
- Barre de progression : hauteur `6px`, rayon `3px`, rail `#DDE0D9`, remplissage `#1F6F4A`.
- Barres de comparaison : hauteur `12–22px` selon l'écran, rayon = moitié de la hauteur.
- Cadre de téléphone (présentation uniquement) : `375×812`, rayon `44px`, ombre `0 24px 60px rgba(19,22,18,0.10)`. À ignorer dans l'implémentation.
- Cibles tactiles : jamais sous `44px` de hauteur.

## Écrans

### 1. Onboarding (soin maximal — 4 écrans)
Progression indiquée par **4 points de 8px**, jamais un pourcentage. Un bouton primaire par écran.

**1.1 Accroche** — placeholder d'illustration en haut (rayures `135deg` `#E4EFE8`/`#F3F8F4`, rayon 24px, légende mono « illustration — une personne et ses trajets du quotidien »), puis titre 34px « Comprendre tes trajets, sans te juger. », corps, CTA « Découvrir mon impact ». Aucun chiffre : la spec impose d'ouvrir sur un bénéfice concret.

**1.2 Contexte chiffré** — titre « 10 tonnes aujourd'hui, 2 tonnes visées en 2050 », puis deux barres de 22px (Aujourd'hui ≈ 10 t à 100 % ; Cible 2050 = 2 t à 20 %). Séparateur 1px. Ensuite la répartition par poste en quatre barres de 12px : Transport 2,9 t (100 %, accent `#1F6F4A`), Logement 2,4 t (83 %), Alimentation 2,2 t (76 %), Biens et services 2,5 t (86 %) — ces trois-là en `#A9C8B6`. Mention mono « source ADEME · valeurs à confirmer ». CTA « Continuer ».

**1.3 Réassurance** — seul écran à fond teinté `#F3F8F4`, corps en 17/26. Placeholder d'illustration 180px. Deux paragraphes : contraintes ≠ fautes ; réponses privées, aucun classement. CTA « Continuer ».

**1.4 Transition bilan** — titre « On passe à ton bilan », bloc `#F0F1EC` avec la durée (« environ 5 minutes », 24/600), puis le sommaire des 4 sections en 15/22. CTA « Commencer mon bilan ». La friction est annoncée, pas dissimulée.

### 2. Bilan initial (soin maximal — 11 écrans + restitution)
Le questionnaire est **entièrement spécifié champ par champ dans la spec fonctionnelle, Brique 2** (tableaux B1.1 → B4.3). Les maquettes couvrent chaque étape ou groupe d'étapes ; en cas d'écart, la spec fonctionnelle fait foi sur les libellés d'options et les conditions d'affichage.

**Structure** : 4 sections séquentielles — Domicile-travail → Weekend/loisirs → Voyages annuels → Contexte structurel — en étapes atomiques (une question, ou un petit groupe de champs liés, par écran). La section 4 est en dernier pour ne pas se lire comme une justification a posteriori.

**En-tête de questionnaire** (sur toutes les étapes) : nom de section à gauche, « Étape N sur M » à droite (14px `#5E655F`), puis barre de progression 6px.

**Unité de comptage — à respecter strictement** : N et M comptent des **écrans affichés**, pas des étapes de la spec. Plusieurs champs liés partagent un écran (donc un seul numéro), et une variante de saisie (ex. le repli par tranche de B1.3) garde le numéro de l'écran qu'elle remplace. La numérotation est **continue, sans trou** : le parcours complet fait **9 écrans**.

| Écran | Étapes spec couvertes | Progression |
|---|---|---|
| 1 | B1.1 | 11 % |
| 2 | B1.2 + B1.3 (et sa variante par tranche) | 22 % |
| 3 | B1.4 | 33 % |
| 4 | B1.5 + B1.6 + B1.7 | 44 % |
| 5 | B2.1 | 56 % |
| 6 | B2.2 + B2.3 | 67 % |
| 7 | B3.1 + B3.2 | 78 % |
| 8 | B3.3 + B3.4 | 89 % |
| 9 | B4.1 + B4.2 + B4.3 | 100 % |

Les branchements retirent des écrans entiers et M est recalculé : B1.1 = Non retire les écrans 2, 3 et 4 → parcours de **6 écrans**, renumérotés 1 à 6 sans trou (B2.1 devient « Étape 2 sur 6 »). B2.1 = Rarement retire l'écran 6 → un écran de moins.

**Barre de progression — règle critique** : M est le nombre d'écrans **réellement affichés à cet utilisateur**, recalculé à chaque branchement, jamais le total théorique. Une section sautée ne doit ni figer la barre ni la faire sauter, et ne doit jamais produire de numéro manquant. Les maquettes montrent les deux cas : « Étape 1 sur 9 » (parcours complet) et « Étape 2 sur 6 » (B1.1 = Non).

**Champs conditionnels** : n'apparaissent qu'après la réponse qui les déclenche — **jamais affichés grisés ou désactivés à l'avance**.

| Écran maquette | Étapes spec | Contenu |
|---|---|---|
| B1.1 — Trajet régulier ? | B1.1 | Choix unique Oui / Non. Branchement principal : Non → section 1 ignorée, contribution domicile-travail = 0, passage direct à la section 2. Une ligne précise les situations couvertes par « Non » (télétravail total, sans emploi, retraité, autre) pour éviter de le faire lire comme un aveu. |
| B1.2 / B1.3 — Fréquence et distance | B1.2, B1.3 | Slider 1–7 jours (défaut **5**) + champ distance aller en km. Lien « Je ne sais pas » visible sous le champ. Remplissage du slider = `(valeur − 1) / (7 − 1)` — la valeur 5 remplit donc 67 %, pas 71 % : le rail représente la plage 1→7, pas 0→7. |
| B1.3 — Distance par tranche | B1.3 (repli) | Écran de repli après « Je ne sais pas » : < 5 km / 5–15 / 15–30 / 30–50 / 50 km+. Réassurance explicite (« une estimation suffit »), la spec acceptant des réponses approximatives. |
| B1.4 — Mode principal | B1.4 | Choix unique sur les **9 modes** du référentiel : Voiture (seul) / Voiture (covoiturage) / Bus / Train ou RER / Métro ou tram / Vélo / Marche / Deux-roues motorisé / Trottinette ou mobilité douce. Liste entièrement visible, pas de regroupement « autre ». |
| B1.5 / B1.6 / B1.7 — Conditionnelles | B1.5, B1.6, B1.7 | Nombre de personnes en covoiturage (2 à 6+, si B1.4 = covoiturage) ; second mode Oui/Non ; si Oui, sous-champ « Lequel ? » déplié dans un bloc encastré, listant les modes **hors celui déjà choisi**. Les trois tiennent sur l'écran 4 : ce sont des champs courts et dépendants entre eux. Si l'implémentation préfère les éclater en trois écrans, M passe de 9 à 11 et la numérotation reste continue. |
| B2.1 — Fréquence loisirs | B2.1 | Rarement (mensuel ou moins) / Une fois par semaine / Plusieurs fois par semaine. Second branchement : « Rarement » saute B2.2 et B2.3. |
| B2.2 / B2.3 — Mode et distance loisirs | B2.2, B2.3 | Mode principal (liste raccourcie aux plus probables + lien « Voir les autres modes » vers les 9) et distance aller par tranche : < 5 / 5–15 / 15–30 / 30 km+. |
| B3.1 / B3.2 — Avion | B3.1, B3.2 | Nombre de vols par an (0 à 10+), puis, si > 0, combien sont courts (Europe, < 3 h). Le second champ est **borné par le premier**, son libellé reprend la valeur saisie, et la déduction long-courrier est affichée en clair (« 1 vol long-courrier sera compté »). |
| B3.3 / B3.4 — Train et voiture longue distance | B3.3, B3.4 | Deux compteurs 0 à 10+ pour les trajets > 300 km. Mention monospace des distances moyennes appliquées (800 km train, 700 km voiture) : le résultat ne doit jamais être une boîte noire. |
| B4 — Contexte de mobilité | B4.1, B4.2, B4.3 | Zone (Urbain dense / Périurbain / Rural), accès perçu aux transports (Bon / Limité / Inexistant), véhicules du foyer (0 / 1 / 2 ou plus). Titre neutre « Quel est ton contexte de mobilité ? ». Sous-ligne obligatoire : ces réponses **n'entrent pas dans le calcul**, elles servent à proposer des actions réalistes. CTA « Voir mon bilan ». |
| Progression adaptative | — | Même écran B2.1 pour un utilisateur ayant répondu Non en B1.1 : « Étape 2 sur 6 » et une ligne factuelle expliquant le nouveau total. Démontre la règle de numérotation ci-dessus. |

#### Logique de calcul (spec fonctionnelle §5)
Émissions annuelles = somme de trois postes en kgCO2e/an.
- **Domicile-travail** (0 si B1.1 = Non) : `distance_aller × 2 × jours_semaine × 45 semaines × facteur(mode) ÷ nb_personnes (si covoiturage)`. Second mode déclaré → distance répartie 50/50.
- **Loisirs** : `distance_typique (milieu de tranche) × 2 × fréquence_hebdo_équivalente × 52 × facteur(mode)`. Fréquences équivalentes : Rarement = 0,25 ; Une fois/semaine = 1 ; Plusieurs fois/semaine = 3. Si « Rarement », appliquer un défaut (voiture, 15 km) pour une contribution résiduelle, **pas zéro**.
- **Voyages** : `(vols_courts × 1500 × f_avion_court) + (vols_longs × 9000 × f_avion_long) + (train × 800 × f_train) + (voiture × 700 × f_voiture)`.

Les 45 semaines, les distances moyennes et les fréquences équivalentes doivent être **configurables sans toucher au flow**.

#### Facteurs d'émission (kgCO2e/km/passager)
| Mode | Facteur |
|---|---|
| Voiture (thermique moyenne) | ~0,20 |
| Bus | ~0,10 |
| Train / RER | ~0,02 |
| Métro / tram | ~0,005 |
| Vélo / marche / trottinette | ~0 |
| Deux-roues motorisé | ~0,10 |
| Avion court-courrier | ~0,20 |
| Avion long-courrier | ~0,15 |

⚠️ **Ordres de grandeur, pas des données sourcées.** À remplacer par la Base Empreinte® ADEME avant toute mise en production. Ces facteurs viennent d'un référentiel serveur, jamais codés en dur dans l'UI.

#### Décision de transport dominante
Le poste le plus élevé des trois devient la décision dominante, formulée à partir du mode principal associé (ex. « trajet domicile-travail en voiture solo »). Elle ancre le plan de réduction et tous les check-ins.

**Départage en cas d'égalité stricte ou quasi-égalité (écart < 5 %)** : priorité au poste le plus régulier — **domicile-travail > loisirs > voyages** — car c'est celui sur lequel la boucle mensuelle a le plus de prise. Ce départage est **entièrement fonctionnel** : aucun écran ni traitement visuel d'ex-aequo n'est nécessaire, et l'écran correspondant a été retiré des maquettes.

#### Restitution — écran le plus important du produit
Ordre imposé, de haut en bas :
1. Sur-titre « Ton bilan transport » (14px `#5E655F`).
2. **Carte de la décision dominante**, seul élément teinté de l'écran (fond `#E4EFE8`, rayon 24, padding 24) : label accent « Le déplacement qui pèse le plus », titre 32/38, puis la valeur et sa part de l'empreinte transport. **Mise en avant visuellement plus forte que le chiffre total** — c'est l'info reprise dans la boucle mensuelle, elle doit être l'élément le plus mémorable.
3. Total annuel **après** la carte, en corps : label + « 3,4 t CO₂e » (26/600), sans code couleur alarmant.
4. Panneau « Où tu te situes » (`#F0F1EC`) : trois barres de 14px — Toi (accent), Moyenne en France (atténué), Part transport compatible 2050 (atténué) — puis une phrase **chiffrée** de positionnement.
5. CTA « Voir ce que je peux faire » + lien « Modifier mes réponses ».

Le positionnement est **chiffré, jamais qualifié** : pas de « au-dessus de la moyenne » sans valeur, pas de code couleur bon/mauvais, aucune comparaison à d'autres utilisateurs.

### 3. Plan de réduction (fonctionnel simple — 1 écran)
Visuellement **en dessous** de la restitution : cartes bordées `1px #DDE0D9` sur fond blanc, aucune teinte, aucune icône.
- Titre « Ton plan » + « Deux actions liées à ton trajet domicile-travail. Rien d'autre à suivre. »
- Chip de cadence : petit label `#F0F1EC` « Cadence : saison — été » (ou « trimestre glissant » — voir prop `cadenceMode`). La cadence est un paramètre, pas une UI de calendrier.
- 1 à 2 cartes d'action, chacune = titre 17/600 + justification chiffrée (« … retire environ 240 kg CO₂e sur l'année »), dérivées de la décision dominante.
- Bloc `#F0F1EC` « Prochain point » : « Une question, une fois par mois. Tu peux la passer. »
- Lien « Revenir à mon bilan ».
Pas de timeline, pas de calendrier, pas de sous-objectifs.

### 4. Boucle mensuelle (fonctionnel simple — 3 écrans)
**4.1 Notification + check-in** — la notification est rendue en haut de l'écran comme référence de copy : « Une question sur ton trajet domicile-travail, si tu as trente secondes. » Puis sur-titre « Point du mois · août », la question fermée (26/34) paramétrée par le trajet identifié, deux options pleine largeur « Oui » / « Non » (18px de padding, 17/600), et « Répondre plus tard » en texte tertiaire — visible, sans conséquence.

**4.2 Réponse positive** — renforcement bref : « C'est noté. Un trajet remplacé, c'est déjà une habitude qui bouge. » + « Deuxième mois de suite que tu changes quelque chose sur ce trajet. » Le signal « 2 check-ins consécutifs » reste une **phrase de corps de texte** : pas de compteur, pas de conteneur dédié, rien qui puisse se lire comme un badge ou un streak. Aucune animation de célébration. Bouton secondaire « Revoir mon plan ».

**4.3 Réponse négative** — **même mise en page** que la positive : ni icône, ni fond différent, ni relance insistante. « Merci pour ta réponse. » + rappel factuel du poste dominant + bloc `#F0F1EC` « Si l'action proposée ne colle pas → Tu peux en choisir une autre dans ton plan. » Bouton secondaire « Voir mon plan ».

### 4. Connexion / Authentification (5 écrans)
Brique 5 de la spec. Soin porté sur le **placement et le message** ; l'interaction elle-même reste un composant standard.

**Placement (validé, non négociable)** : la demande de connexion intervient **après la restitution du bilan** — résultat et décision dominante déjà affichés — et avant l'accès au plan de réduction. Jamais avant ni pendant le questionnaire : le taux de complétion du bilan est la métrique n° 1 et ne doit pas porter le coût de l'authentification.

**Cibles V1** : Web et Android uniquement, pas d'iOS (donc pas de « Sign in with Apple » à ce stade — voir décisions ouvertes).

**4.1 Proposition de connexion** — écran plein, jamais une pop-up.
- Titre 30/36 « Garde ce résultat et suis ta progression » (capitalise sur ce qui vient d'être vu ; ne jamais écrire un générique « Créer un compte »).
- Corps : « Ton bilan est calculé. Avec un compte, il te suit d'un appareil à l'autre et tu retrouves ton historique de points mensuels. »
- Bloc teinté `#E4EFE8` « Ce qui est déjà enregistré » rappelant le résultat obtenu (« 3,4 t CO₂e par an · trajet domicile-travail identifié comme poste principal ») — le rappel du chiffre remplace l'argumentaire.
- **CTA principal : bouton Google natif.** Dans la maquette il est représenté par un bouton blanc bordé de 54px avec une pastille neutre de 20px en placeholder du logo. **À l'implémentation : utiliser le composant officiel Google Sign-In sans le personnaliser** (ni couleur, ni typo, ni logo redessiné). C'est l'un des rares endroits où un standard externe prime sur l'identité du produit.
- Option secondaire, visible mais moins proéminente : lien « Utiliser un email à la place » (15/600, accent) — pas un formulaire déplié par défaut.
- CTA tertiaire toujours visible, jamais caché ni culpabilisant : « Continuer sans compte », suivi de « Ton résultat reste accessible sur cet appareil. »

**4.2 Email + mot de passe (état d'erreur de validation)** — deux champs, rien d'autre : pas de prénom, pas de confirmation de mot de passe en V1.
- Titre 26/32 « Continuer avec un email » + « Deux champs, rien de plus. Ton bilan est rattaché automatiquement. »
- Champ Email rempli ; champ Mot de passe en état focus/erreur (bordure accent) avec un bouton texte « Afficher ».
- **Message de validation en ligne, ton neutre** : « Le mot de passe doit contenir au moins 8 caractères. » Le message dit ce qui est attendu, jamais ce qui est faux. Aucune couleur d'alerte, aucune icône d'erreur — la bordure d'accent et le texte suffisent (contrainte d'accessibilité : jamais la couleur seule).
- « Mot de passe oublié » visible immédiatement, pas enfoui.
- CTA « Créer mon compte » **désactivé** tant que la saisie est invalide + lien « Revenir aux autres options ».

**4.3 Session expirée (reconnexion)** — écran minimal centré : titre « Reconnecte-toi pour retrouver ton bilan », bouton Google, lien email. Aucun texte de friction ni de reproche, aucune mention de la déconnexion.
Comportement associé : **session valide sur l'appareil → cet écran ne s'affiche pas**, connexion silencieuse et arrivée directe sur le check-in.

**4.4 Mot de passe oublié** — titre « Réinitialiser ton mot de passe », rassurance (« Tes données restent rattachées à ton compte »), un champ email, CTA primaire « Envoyer le lien », retour. Parcours en 2 écrans (celui-ci + un accusé d'envoi), 3 maximum.

**4.5 Bilan anonyme — relance douce** — réouverture de l'app sans compte créé : la restitution est **intégralement accessible**, aucun blocage, aucun contenu masqué ou flouté. La relance est un **bandeau neutre** en haut d'écran : « Ce bilan n'est enregistré que sur cet appareil. » + action « Le garder ». Jamais une notification insistante, jamais un interstitiel.

**Rattachement des données**
- Bilan complété avant connexion : conservé en stockage local / session. L'app fermée puis rouverte doit toujours afficher le résultat.
- À la connexion (Google **ou** email), le bilan déjà complété est **automatiquement rattaché** au compte créé — aucune ressaisie.
- Connexion Google annulée ou en erreur réseau : message neutre, retour à l'écran de restitution, **sans blocage**, réessai possible plus tard.
- Plusieurs comptes Google sur l'appareil : laisser le picker natif gérer la sélection, aucun redesign custom.
- Reconnexion sur un nouvel appareil : récupération à l'identique du bilan, de la décision dominante et de l'historique de check-ins.

### 5. États limites (3 écrans)
**5.1 Bilan non fait** — placeholder d'illustration neutre (rayures `#F0F1EC`/`#F6F8F3`), « Ton bilan n'est pas encore fait », justification factuelle + durée, CTA « Faire mon bilan ». Informatif, sans relance émotionnelle.

**5.2 Reprise de bilan** — « On reprend où tu t'étais arrêté », en-tête de section + barre de progression à l'écran exact, avec le même pourcentage que l'écran correspondant du questionnaire (ici 5/9, 56 %). Le décompte de reprise doit être **non ambigu** : « Quatre écrans déjà remplis. Il en reste cinq, en comptant celui-ci. » — jamais un « il reste N étapes » qui laisse le dev deviner si l'écran courant est inclus. « Tes quatre premières réponses sont conservées. Il reste quatre étapes. », CTA « Continuer mon bilan » + lien « Revoir les étapes précédentes ». Jamais de redémarrage, aucune mention du délai écoulé.

**5.3 Check-in manqué** — pas d'écran dédié ni d'alerte : la **même question** revient (« Point du mois · septembre »), avec une seule ligne factuelle en bas : « Le point du mois dernier n'a pas été rempli. Il n'y a rien à rattraper. »

## Interactions et comportement
- **Connexion** : déclenchée une seule fois, à la sortie de la restitution, avant le plan. Trois issues — Google, email, « Continuer sans compte » — les trois mènent au plan ; seules les deux premières activent la synchronisation.
- **Onboarding** : 4 écrans linéaires, un CTA par écran, pas de skip prévu en V1. Progression par points.
- **Questionnaire** : 4 sections en étapes atomiques, « Retour » toujours disponible. Deux branchements majeurs (B1.1 = Non → section 1 ignorée ; B2.1 = Rarement → B2.2/B2.3 ignorées) et quatre étapes conditionnelles (B1.5, B1.6, B1.7, B3.2). Le nombre total d'étapes est recalculé à chaque branchement. Réponses persistées à chaque étape (reprise possible à tout moment, écran 5.2). Validation : distance > 0 ou tranche sélectionnée, un mode obligatoire, B3.2 borné par B3.1.
- **Décision dominante** : calculée à la fin du bilan, stockée, et utilisée comme ancre pour le plan et tous les check-ins. En cas d'ex-aequo, le choix de l'utilisateur (écran 2.4) écrase le départage automatique et reste modifiable.
- **Check-in** : déclenché une fois par mois par notification. Une seule relance, non insistante. « Répondre plus tard » sans pénalité ; un mois manqué ne génère aucun rattrapage ni alerte.
- **Transitions** : navigations standard de la plateforme. Aucune animation de célébration, aucun confetti, aucun son. Pas de gamification (ni points, ni badges, ni streak) — c'est un non-goal explicite de la spec.
- **États de chargement** : le calcul du bilan peut prendre un instant ; utiliser un état de chargement sobre, sans « suspense » mis en scène.

## State management
- `profile` : zone (rurale/urbaine), accès perçu aux transports, `cadence_type` (saison calendaire par défaut, paramétrable).
- `assessment` : réponses par étape (B1.1 → B4.3) + `current_step` (pour la reprise) + la liste des étapes réellement applicables (pour la barre de progression), statut (en cours / terminé).
- `footprint` : émissions annuelles totales, ventilation par type de déplacement, moyenne nationale et cible 2050 de référence.
- `dominant_decision` : poste retenu + mode principal associé, issu de la comparaison des trois postes et de la règle de départage (poste le plus régulier si écart < 5 %).
- `plan` : 1 à 2 actions dérivées de la décision dominante, avec gain estimé en kg CO₂e/an.
- `checkins` : un enregistrement par mois (répondu oui / non / passé), d'où se déduit le signal « 2 consécutifs ».
- `session` : statut d'authentification (anonyme / Google / email), validité de la session, et un flag `assessment_linked` indiquant si le bilan local a été rattaché au compte. En anonyme, `assessment` + `footprint` + `dominant_decision` doivent être persistés localement et survivre à la fermeture de l'app.
Les facteurs d'émission viennent d'un référentiel serveur (voir `transport_modes` dans les migrations Supabase du dépôt), jamais codés en dur dans l'UI.

## Assets
Aucun asset final. Trois emplacements d'illustration sont matérialisés par des **placeholders rayés** avec une légende monospace décrivant ce qui doit y aller :
- Onboarding 1 : « une personne et ses trajets du quotidien »
- Onboarding 3 : « scène calme, paysage / matin »
- État vide : « illustration — état vide »
Ces visuels restent à produire. Icônes : aucune n'est utilisée dans les écrans — c'est intentionnel.

## Fichiers de ce bundle
- `traceverte-ecrans-v1.dc.html` — les 15 écrans (ouvrir dans un navigateur ; styles inline, valeurs lisibles dans le markup)
- `support.js` — runtime nécessaire à l'ouverture du fichier ci-dessus
- `spec-fonctionnelle-app-carbone-transport-v1.md` — spec fonctionnelle source (objectifs, non-goals, périmètre, questions ouvertes)
- `spec-uiux-app-carbone-transport-v1.md` — spec UI/UX source (ton, principes, hiérarchie de soin)

## Décisions ouvertes à porter au produit
1. Palette : porter le vert `#1F6F4A` dans `theme.ts`, ou revenir au bleu existant.
2. Source et valeurs exactes des facteurs d'émission (ADEME) — remplacer les placeholders de la restitution.
3. Distances moyennes par défaut des voyages (1500 / 9000 / 800 / 700 km) et fréquences hebdomadaires équivalentes des loisirs (0,25 / 1 / 3) — hypothèses de travail à valider.
4. Cadence par défaut du plan : saisons calendaires (piste privilégiée par la spec) ou trimestre glissant.
5. Email déjà utilisé via Google (ou l'inverse) : comportement à définir (fusion de comptes, message d'orientation).
6. Déploiement iOS : si l'App Store entre au périmètre, Apple impose « Sign in with Apple » en parité de Google — un troisième bouton sur l'écran 4.1.
7. Devenir d'un bilan anonyme jamais rattaché : purge après délai ou conservation locale indéfinie.
9. Champ de retour qualitatif libre pour compenser l'absence de preuve causale : à trancher côté produit.
8. « Continuer sans compte » : visible d'emblée (choix retenu dans la maquette) ou après un court délai.
