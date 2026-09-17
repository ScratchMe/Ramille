# v1-13 — Audit du 09/09/2026 et chantiers ordonnés

> **Statut** : document de travail, feuille de route courante du produit à partir du 10/09/2026.
> Il remplace le renvoi vers `v1-07` §4 (plan entièrement livré) comme point d'entrée de ce
> qui reste à faire. Chaque chantier est écrit pour être confié tel quel à une personne ou à un
> agent, sans relire l'audit. Les dix-huit décisions marquées **[ARBITRAGE]** ont été rendues par le
> titulaire du produit le 10/09/2026 (§1) : plus aucun chantier n'est bloqué par une décision.
>
> **Annexe** : `docs/audit/2026-09-09-inventaire.md` porte les 279 constats retenus, avec pour
> chacun fichier et ligne, description, recommandation, et le complément du contre-vérificateur.
> Les identifiants cités ici (`A8-10`, `C-4`…) s'y résolvent. Les 4 constats réfutés y figurent
> en fin de document, pour qu'on ne les rouvre pas.

## 0. Comment lire ce document

> **10/09/2026, soir — le canvas Claude Design du lot 2 est livré** (`docs/design/v1-14-boucle-engagement/`)
> et son document d'implémentation est `v1-14-boucle-engagement.md`. Les chantiers du lot 2 portent
> désormais un paragraphe **Design (canvas v1-14)** qui renvoie à la planche et à la section de v1-14
> qui les concernent ; C4.6 est relevé en P2 ; C2.14 (le socle « saison » côté client) est ajouté. L'ordre
> de livraison définitif est en §2.3.

### 0.1 D'où il vient

Treize lecteurs ont audité le dépôt par zone (racine et onboarding, questionnaire, restitution,
plan et rappels, suivi, compte et connexion, trois zones SQL, infrastructure, cohérence
documentation ↔ code, ton de chaque texte, parcours entier à la lumière des sciences du
changement de comportement). Chaque constat a été contre-vérifié par un agent chargé de le
**réfuter** : preuve à la ligne, recherche d'un traitement ailleurs, confrontation aux décisions
documentées (CLAUDE.md, `docs/architecture/v1-*`, `docs/design/spec-*`), sévérité corrigée. Un
critique de complétude a ensuite cherché ce que le découpage ratait (jonctions entre zones,
durée, exploitation). Deux affirmations fortes ont été revérifiées à la main en base le 10/09 :
six des treize comptes anonymes ont été créés moins de trois secondes après le précédent
(C1.2), et l'événement `app_open` porte une ligne pour six vues d'étape d'onboarding (C1.2).

| Constats lus | Confirmés | Rouvrent une décision documentée | Réfutés | Déjà faits |
|---|---|---|---|---|
| 283 | 260 | 18 | 4 | 1 |

### 0.2 Le verdict en trois phrases

Le produit est exemplaire jusqu'au premier engagement : onboarding sans peur, restitution sans
gouffre, intention d'implémentation obligatoire, aucune mécanique d'échec, voix de Ramille tenue.
**La durée, qui est l'objectif central, n'a pas encore de mécanique** : le check-in ne connaît
pas l'engagement, l'engagement ne survit ni au re-bilan ni au changement de saison, la saison n'a
ni ouverture ni clôture, et le renforcement manque au moment où il compte. Côté technique, la
base est solide (RLS, RPC, facteurs bornés à la date, gardes d'export) et les défauts sont
presque tous des **chemins silencieux** : hors ligne, réseau coupé, lien expiré, annulation.

### 0.3 Priorités, efforts, dépendances

- **P0** — sécurité et exploitation : à faire avant tout, y compris avant de publier sur Play.
- **P1** — bugs silencieux et textes faux : petits correctifs, à grouper par écran ; avant Play.
- **P2** — la boucle d'engagement : le cœur du produit, ce qui fait que la durée existe.
- **P3** — prise de conscience et justesse du chiffre.
- **P4** — increments à instruire (une décision produit précède le code).

Effort : **petit** (moins d'une demi-journée pour quelqu'un qui connaît le dépôt), **moyen**
(une à deux journées), **grand** (plus, ou une migration qui touche le référentiel).

Un chantier « dépend de » un autre quand il **ne peut pas** être fait proprement avant. Les
autres liens sont des suggestions d'ordre, pas des blocages.

### 0.4 Format d'un chantier

Chaque chantier porte : **Pourquoi** (le fait et ce qu'il coûte au produit), **Fichiers** (où
aller, lignes de l'audit du 09/09 — elles bougent, chercher le motif si besoin), **À faire**
(étapes), **Ne pas faire** (ce que l'audit a vérifié comme décision délibérée, ou les pièges
connus), **Tests** (ce qui doit exister à la fin), **Fait quand** (critère de fin), et les
**Constats** de l'inventaire qu'il ferme.

### 0.5 Consignes communes à tous les chantiers

1. **Une branche, une pull request par chantier**, titrée par son identifiant (`C1.3 —
   Questionnaire : les bords qui cassent le chiffre`). La description cite les constats fermés.
2. **Avant de pousser** : `npx tsc --noEmit` (créer `expo-env.d.ts` comme la CI si absent),
   `npm run lint`, `npm test -- --ci`. Pour tout chantier qui touche `supabase/migrations/`,
   rejouer mentalement les **trois pièges** de CLAUDE.md § Tests : toucher au référentiel des
   facteurs invalide toutes les assertions chiffrées de la suite pgTAP ; les valeurs attendues se
   recalculent **par requête sur la base**, jamais à la main ; un scénario de test se valide en
   rejouant la séquence entière du fichier, bascules de `request.jwt.claims` comprises.
3. **Après toute migration**, régénérer `src/lib/database.types.ts` et respecter son style
   (guillemets doubles), cf. CLAUDE.md § Base de données.
4. **Ce qui ne se fait jamais**, quel que soit le chantier : réintroduire `Alert.alert` (règle
   ESLint), un `Pressable` autour d'un `ThemedText` à la place de `TextLink`, une phrase de
   Ramille écrite dans un écran (tout vit dans `src/constants/mascotte.ts`, jamais un nombre dans
   sa bouche, jamais « tu devrais »), une mascotte à côté d'un chiffre lourd, un `useEffect` de
   montage pour charger un écran d'onglet (`useRafraichirAuRetour`), un repère chiffré en dur
   (`carbon-reference.ts`), une policy UPDATE là où un RPC est attendu, une route `[id]`
   dynamique, un joker sur un domaine qu'on ne possède pas.
5. **Un chantier qui rouvre une décision documentée** ne se code pas avant l'arbitrage (§1).
   S'il est retenu, la décision se consigne dans ce document (§10) et le document d'origine reçoit
   un bandeau daté, comme `v1-01` ; on ne réécrit jamais une décision datée.
6. **Le ton** : chaque texte ajouté suit la règle-mère de l'onboarding (« ce sont des contraintes,
   pas des fautes »), tutoie, n'accorde jamais un participe au genre de la personne (C3.10), et
   distingue la voix du produit (peut porter un chiffre) de celle de Ramille (jamais).
7. **En fin de chantier**, cocher la ligne correspondante en §10 et, si le chantier a changé un
   comportement décrit dans CLAUDE.md, mettre CLAUDE.md à jour dans la même PR.

## 1. Décisions à arbitrer avant de lancer certains chantiers

Dix-huit constats rouvrent une décision écrite. Les voici regroupées, avec la recommandation de
l'audit et, en gras, **la décision rendue le 10/09/2026**. Une seule va contre la recommandation (D12).
Chaque décision qui rouvre un document daté se consigne dans ce document-ci ; le document d'origine
reçoit un bandeau daté au moment où le chantier correspondant est livré, jamais avant.

| # | Question | Décision documentée | Recommandation | Bloque |
|---|---|---|---|---|
| D1 | La question du check-in nomme-t-elle l'action engagée et les jours choisis ? | Spec fonctionnelle §7 : « pas de personnalisation du wording par profil pour cette V1 ». | **Oui.** L'étape 6b (engagement avec intention) est postérieure à cette ligne et la rend caduque : sans cela, le levier « le mieux établi » (v1-07 §3.3) est décoratif. Repli générique quand rien n'est engagé. **Décidé le 10/09 : oui, l'action et les jours.** | C2.1 |
| D2 | Le check-in interroge-t-il la semaine écoulée plutôt que « cette semaine » ? | v1-02 §3 (« semaine courante »), v1-12 §4.4 (corps du push avec « cette semaine »). | **Oui.** Le moment d'envoi (lundi matin, v1-12 §2.8) reste ; seul le temps du verbe et la période interrogée changent. **Décidé le 10/09 : oui, la période écoulée.** | C2.3 |
| D3 | Ajoute-t-on une troisième réponse « pas de trajet cette semaine » ? | Spec §7 : « une question fermée ». | **Oui**, comme troisième état explicite, jamais comme un « Non ». Une question fermée à trois réponses reste fermée. **Décidé le 10/09 : oui, troisième état explicite.** | C2.4 |
| D4 | Le covoiturage des loisirs divise-t-il enfin le poste ? | v1-05 §2 : pas de `leisure_carpool_size`. | **Oui**, ajouter le champ. Ne pas retirer la ligne « Voiture (covoiturage) » : laisser une réponse sans effet est la seule option indéfendable. **Décidé le 10/09 : oui, ajouter la taille du covoiturage.** | C3.5 |
| D5 | Les loisirs « rarement » : garde-t-on 15 km en voiture ? | Spec §5 et v1-05 §4 : « voiture, 15 km ». | **Garder le calcul**, mais retirer ce mode inventé du libellé de la question mensuelle et de la base des actions du plan (C2.5), et dire la règle à l'écran (C3.7). **Décidé le 10/09 : garder le calcul, retirer l'invention du libellé, du plan et de la boucle, le dire à l'écran.** | C2.5, C3.7 |
| D6 | Demande-t-on la part du trajet couverte par le second mode ? | Spec §5 et v1-05 §4 : « 50/50, à ajuster si besoin » ; règle « la profondeur coûte plus qu'une puce ». | **Oui**, une puce au même niveau (pas un second niveau), repli 0,5 pour l'existant. **Décidé le 10/09 : oui, une puce au même niveau.** | C3.4 |
| D7 | Ajoute-t-on un poste « déplacements professionnels » ? | v1-05 §1 : trois postes fixes. | **Pas maintenant.** Nommer la limite sur l'étape 1 (une ligne, sans arbitrage). Le poste lui-même est un increment à part. **Décidé le 10/09 : nommer la limite maintenant, le poste reste en lot 4.** | C4.3 |
| D8 | Une désinscription des rappels par lien dans l'email, hors de l'app ? | v1-12 §3 : le réglage vit dans « Toi ». | **Oui.** `List-Unsubscribe` est exigé par les grands fournisseurs de messagerie pour un envoi régulier ; sans lui, la seule sortie est « signaler comme spam ». Le réglage reste dans « Toi », le lien en est une seconde porte. **Décidé le 10/09 : oui, lien de sortie et en-têtes List-Unsubscribe.** | C2.9 |
| D9 | La réponse au check-in passe-t-elle par un RPC ? | Aucune décision écrite ; la doctrine `plan_actions` va dans ce sens. | **Oui.** **Décidé le 10/09 : oui, RPC.** | C1.12 |
| D10 | Un coup de pouce prospectif la veille des jours choisis ? | Spec §7 « jamais insistante ni répétée » ; v1-12 §2.1 « un mot par point, jamais plus ». | **Increment à instruire**, opt-in, borné dans le temps. Pas avant C2.1 et C2.2. **Décidé le 10/09 : à instruire en lot 4, opt-in, après C2.1 et C2.2.** | C4.2 |
| D11 | Le premier point de suivi est-il généré à la soumission du bilan ? | v1-12 §2.3 et §6.2 : attente conçue, la carte nomme le jour. | **Non**, garder l'attente : générer à la soumission enverrait un push dans les minutes suivant la feuille des rappels. **Décidé le 10/09 : non, l'attente reste.** | — |
| D12 | Des variantes aux deux répliques de check-in ? | `mascotte.ts` : « les répliques des maquettes validées ne se réécrivent pas ». | **Non** : l'usure n'est pas mesurable (`checkin_answer` est interdit comme événement), on ne réécrit pas sans signal. **Décidé le 10/09, contre la recommandation : oui, trois ou quatre variantes par issue, choisies de façon déterministe par période, sans chiffre, gardées par le même test, les répliques d'origine conservées. Chantier C2.12.** | — |
| D13 | Le plancher d'animation de lancement (1450 ms) est-il réduit ? | v1-11 §9.5 et `ecran-lancement.tsx` : plancher assumé. | **Non**, sauf sous « réduire les animations » (C1.9), qui ne rouvre rien. **Décidé le 10/09 : non, le plancher reste ; seule la réduction d'animations (C1.9) s'applique.** | — |
| D14 | `eas.json` épingle-t-il une image de build ? | v1-10 §10.7 : `latest` exigé par le build depuis GitHub. | **Non** : EAS retire ses images après un an, une image épinglée casserait le build au moment décrit. **Décidé le 10/09 : garder latest, tracer le dernier build réussi dans le registre.** | — |
| D15 | Un accusé de réception après suppression de compte depuis l'app ? | Commentaire de `mon-compte.tsx` (choix de code, pas une décision documentée). | **Oui**, un « C'est fait. » plus la ligne de Ramille, sans rétention. **Décidé le 10/09 : oui, « C'est fait. » et la ligne de Ramille.** | C3.10 |
| D16 | Une norme dynamique (« de plus en plus de gens… ») dans l'onboarding ? | `carbon-reference.ts` : toute valeur sourcée ou dérivation signalée. | **Seulement en mots, dans la voix de Ramille**, sans chiffre ; jamais un nouveau repère non sourcé. **Décidé le 10/09 : oui, en mots dans la voix de Ramille, jamais un chiffre.** | C4.7 |
| D17 | Une déconnexion sur « Toi » pour un compte rattaché ? | Handoff §4.3 : la copie de l'écran de reconnexion ne « mentionne » pas la déconnexion. | **Oui**, un lien discret, réservé aux comptes rattachés ; la consigne du handoff porte sur un autre écran. **Décidé le 10/09 : oui, un lien discret réservé aux comptes rattachés.** | C3.9 |
| D18 | Figer toutes les actions ≥ 5 kg et offrir « Voir d'autres pistes » ? | Spec §6 : « 1 à 2 actions suggérées ». | **Oui**, deux en avant, les suivantes dépliables. **Décidé le 10/09 : oui, deux en avant, les suivantes dépliables.** | C4.6 |

## 2. Vue d'ensemble

### 2.1 Les chantiers

| Id | Chantier | Prio | Effort | Dépend de | Arbitrage (rendu le 10/09) |
|---|---|---|---|---|---|
| C0.1 | Redirect URLs : référence versionnée et correction de v1-10 §8.4 | P0 | petit | — | — |
| C0.2 | Sauvegarde de la base | P0 | moyen | — | — |
| C0.3 | GRANTs explicites et version du CLI en CI | P0 | moyen | — | — |
| C0.4 | Filet d'erreur : ErrorBoundary et remontée minimale | P0 | petit | — | — |
| C0.5 | Observabilité et robustesse de l'envoi des rappels | P0 | moyen | — | — |
| C0.6 | Rétention : boîte d'envoi et jetons désactivés | P0 | petit | — | — |
| C0.7 | Registre d'exploitation et point d'entrée de la documentation | P0 | petit | — | — |
| C1.1 | Soumission du bilan : plus de bilan fantôme | P1 | petit | — | — |
| C1.2 | Session unique et mesure d'ouverture juste | P1 | petit | — | — |
| C1.3 | Questionnaire : les bords qui cassent le chiffre | P1 | moyen | — | — |
| C1.4 | Réseau coupé : dire vrai sur chaque écran | P1 | moyen | — | — |
| C1.5 | Connexion : annulation, lien expiré, retour de messagerie, suppression | P1 | moyen | — | — |
| C1.6 | Feuille des rappels : ne jamais se fermer sur rien | P1 | petit | — | — |
| C1.7 | Le suivi se rafraîchit au retour | P1 | petit | — | — |
| C1.8 | Le chiffre affiché : kilos sous une tonne, modes manquants, relecture | P1 | petit | — | — |
| C1.9 | Accessibilité : les cinq régressions vérifiées | P1 | moyen | — | — |
| C1.10 | Textes légaux et pages publiques exigées par Play | P1 | petit | — | — |
| C1.11 | Web : mode sombre, `api/` en CI, indexation, partage | P1 | petit | — | — |
| C1.12 | La réponse au check-in passe par un RPC | P1 | petit | — | D9 |
| C1.13 | CLAUDE.md et documents : la carte redevient juste | P1 | petit | C0.7 | — |
| C2.1 | Le check-in connaît l'action engagée | P2 | moyen | C1.12, C2.6 | D1 |
| C2.2 | L'engagement survit au re-bilan et au changement de saison | P2 | moyen | — | — |
| C2.3 | Le check-in interroge la période écoulée | P2 | moyen | — | D2 |
| C2.4 | Une réponse neutre : « pas de trajet cette période » | P2 | moyen | C1.12 | D3 |
| C2.5 | Qui reçoit quelle boucle : vélo, piétons, loisirs rares | P2 | moyen | — | D5 |
| C2.6 | Une forme insérable du poste dans toutes les phrases | P2 | petit | — | — |
| C2.7 | Le renforcement : baisse, bilan précédent, postes, engagements passés | P2 | moyen | C1.7, C2.2 | — |
| C2.8 | La saison a une fin et un début | P2 | moyen | C2.2 | — |
| C2.9 | Rappels qui s'espacent, et une sortie hors de l'app | P2 | moyen | C0.5 | D8 |
| C2.10 | Le signal « deux points consécutifs » | P2 | petit | C2.3 | — |
| C2.11 | Le lien du rappel ouvert sur un autre appareil | P2 | petit | — | D17 |
| C2.12 | Variantes des répliques de check-in | P2 | petit | C2.4 | D12 |
| C2.13 | La mascotte porte la saison | P2 | moyen | C2.14, C2.8 | décision du 10/09 (hors audit) |
| C2.14 | Le socle « saison » côté client (`src/types/saison.ts`) | P2 | petit | — | — |
| C3.1 | La mobilité contrainte est lue par la restitution | P3 | petit | — | — |
| C3.2 | D'où vient le chiffre : source, périmètre, une équivalence | P3 | moyen | — | — |
| C3.3 | Vols : aller-retour, hypothèses affichées | P3 | petit | — | — |
| C3.4 | Trajet intermodal : seconde jambe persistée, part du second mode | P3 | grand | — | D6 |
| C3.5 | Covoiturage des loisirs | P3 | moyen | — | D4 |
| C3.6 | Loisirs : ouvrir la tranche haute | P3 | moyen | — | — |
| C3.7 | Loisirs rares : dire la règle à l'écran | P3 | petit | — | D5 |
| C3.8 | Plan : filtres de plausibilité, libellés, référentiel d'actions, tests | P3 | grand | — | — |
| C3.9 | Onboarding et compte : ce que le produit promet et ne dit pas | P3 | moyen | — | D17 |
| C3.10 | Ton : accords, carte de partage, textes machine | P3 | petit | C2.6 | D15 |
| C3.11 | Le palier et son cap : une seule définition | P3 | petit | — | — |
| C3.12 | Tests : `src/lib`, l'estimateur, le calcul complet | P3 | moyen | — | — |
| C4.1 | Check-in quantitatif | P4 | grand | C1.12, C2.1, C2.3, C2.4 | — |
| C4.2 | Coup de pouce prospectif la veille des jours choisis | P4 | grand | C2.1, C2.2 | D10 |
| C4.3 | Déplacements professionnels | P4 | grand | — | D7 |
| C4.4 | Vélo à assistance électrique, RER, autocar, occupation longue distance | P4 | grand | — | — |
| C4.5 | Hors-ligne : ouvrir sur le dernier plan connu ; session expirée — **requalifié le 14/09/2026** (un démarrage impossible, pas un confort), **livré le 15/09/2026** | P4 | grand | C1.4 | — |
| C4.6 | Voir d'autres pistes, premier pas, cadrage identitaire | **P2** (relevé le 10/09, dessiné en v1-14) | moyen | C2.8, C2.7 | D18, D16 |
| C4.7 | Retirer un bilan erroné | P4 | moyen | — | — |
| C4.8 | Comparaison même saison, un an après | P4 | moyen | C2.8 | — |
| C4.9 | La sortie que la messagerie affiche (`List-Unsubscribe`) — **fermé le 15/09/2026 par l'expérience**, voir §7 | — | — | C2.9 | — |
| C5.1 | Le classement du plan : le meilleur levier du poste dominant en tête | P1 | moyen | — | canvas v1-17 |
| C5.2 | La pile du plan et l'écran « Toutes les pistes » | P2 | grand | C5.1 | canvas v1-17 |
| C5.3 | L'intro dit le principe, la note du cap disparaît | P2 | petit | C5.2 | canvas v1-17 |
| C5.4 | Le télétravail se demande en jours | P1 | moyen | — | canvas v1-18 |
| C5.5 | L'encart de contexte et sa porte | P2 | moyen | C5.4, C5.2 | canvas v1-18 |
| C5.6 | Le premier plan | P3 | moyen | C5.2 | canvas v1-17 |
| C5.7 | La barre d'onglets attend la fin du premier parcours | P3 | moyen | C5.6 | canvas v1-17 |
| C5.8 | L'espace fine des milliers | P3 | petit | — | canvas v1-17 |

### 2.2 Fichiers chauds et parallélisation

Plusieurs chantiers touchent les mêmes fichiers. Pour confier des chantiers en parallèle sans
conflit, éviter de lancer ensemble ceux qui partagent une ligne ci-dessous, ou les faire
rebaser dans l'ordre indiqué.

| Fichier | Chantiers |
|---|---|
| `src/app/(tabs)/plan.tsx` | C1.4, C1.6, C1.8, C2.2, C2.6, C2.7, C2.8, C2.11, C3.8, C4.6 |
| `src/app/(tabs)/suivi/bilan.tsx` | C1.8, C2.7, C3.1, C3.2, C3.10, C3.11 |
| `src/app/(tabs)/suivi/index.tsx` | C1.4, C1.7, C1.8, C2.7, C2.8 |
| `src/components/checkin-card.tsx` | C1.4, C1.12, C2.1, C2.4, C2.6 |
| `src/constants/mascotte.ts` | C2.4, C2.7, C2.12, C3.9, C3.10 |
| `src/types/mascot.ts`, `src/components/mascot.tsx` | C2.13 |
| `src/types/saison.ts` | C2.14 (le crée), puis C2.7, C2.8, C2.13 le consomment |
| `src/components/checkin-card.tsx` (suite) | C2.1 → C2.4 → C2.10 → C2.12, dans cet ordre |
| `src/app/bilan/index.tsx`, `src/types/bilan.ts` | C1.1, C1.3, C3.3, C3.4 |
| `src/lib/format.ts` | C1.8 |
| Fonctions SQL de génération de check-ins (`generate_*_checkins`, `enqueue_checkin_reminders`) | C2.1, C2.3, C2.5, C2.9 |
| `generate_plan_cycle_for_user`, `estimate_action_savings` | C1.1, C2.2, C3.4, C3.8 |
| `recompute_assessment_results` | C2.5, C3.3, C3.4, C3.5, C3.6 |
| `src/app/confidentialite.tsx`, `conditions.tsx`, `compte/suppression.tsx` | C0.6, C1.10, C2.9 |
| `CLAUDE.md` | C0.7, C1.13, et tout chantier qui change un comportement décrit |

### 2.3 Plan de livraison — arrêté le 10/09/2026, canvas v1-14 en main

Huit vagues. Une vague est parallélisable en interne sauf mention ; on ne commence une vague
qu'après la précédente, parce que chacune touche des fichiers que la suivante relit. Une issue
par chantier, une PR par issue (`Closes #n`), la ligne de §10 cochée à la fin ; l'issue de suivi
[#154](https://github.com/ScratchMe/TraceVerte/issues/154) est la vue cochable de ce tableau. Effort : petit
≈ une demi-journée, moyen ≈ une à deux journées, grand au-delà.

| Vague | Chantiers | Parallèle ? | Ce qu'elle livre | Effort |
|---|---|---|---|---|
| **1 — Sécurité et exploitation** | C0.1, C0.2, C0.3, C0.4, C0.6, C0.7 ; puis C0.5 | oui, C0.5 après | Le bloqueur (Redirect URLs), la sauvegarde, les droits, un filet d'erreur, la rétention, le registre. **Avant toute publication sur Play.** | 4 petits, 3 moyens |
| **2 — Bugs silencieux** | 2a : C1.12, C1.10, C1.11 · 2b : C1.3, C1.9 · puis C1.2 → C1.5 → C1.1 | **en partie** — voir ci-dessous | Plus de bilan fantôme ni de double session, le questionnaire aux bords, la connexion qui dit vrai, l'accessibilité, Play, le web, la réponse au point par RPC (socle de C2.4). | 4 petits, 4 moyens |
| **3 — Bugs silencieux, écrans d'onglets** | C1.4, C1.6, C1.7, C1.8, C1.13 | **non** — enchaînés, mêmes fichiers | Réseau coupé dit vrai, la feuille des rappels ne se ferme plus sur rien, le suivi se rafraîchit, le chiffre affiché juste, la documentation à jour. **Jalon : publiable sur Play.** | 4 petits, 1 moyen |
| **4 — Lot 2, socle et serveur** | C2.14, C2.6 d'abord (une heure chacun) ; puis C2.3 → C2.5 (générateurs, enchaînés) ; C2.2 ; C2.11 ; C2.9 après C0.5 | en partie | La saison côté client, la forme insérable, la période écoulée, les bonnes personnes dans chaque boucle, l'engagement qui survit et se reconduit, le rappel ouvert ailleurs, les rappels qui s'espacent. Rien de tout cela n'attendait le canvas. | 3 petits, 4 moyens |
| **5 — Lot 2, le point** | C2.1 → C2.4 → C2.10 → C2.12 | **non** — même fichier, cet ordre | Le point qui nomme l'action, trois réponses, la carte qui reste, le second renforcement, les variantes. Planches A1 à A3. **Livrée le 11/09/2026** ([#166](https://github.com/ScratchMe/TraceVerte/pull/166)) — et c'est la première vague dont la colonne « Parallèle ? » ne s'est pas trompée : les quatre chantiers se partagent bien `checkin-card.tsx` **et** `src/types/checkin.ts`, que C2.1 a transformé en source unique de la question et C2.12 en source unique du tirage. | 2 moyens, 2 petits |
| **6 — Lot 2, la saison et le suivi** | C2.8 → C2.7 → C3.1 → C4.6 → C2.13 → C3.9 | **non** — un seul chantier disjoint, voir le relevé du 13/09/2026 ci-dessous | La fin et l'ouverture de saison, les pistes et le premier pas, le suivi dans la durée, la restitution d'un re-bilan, la mascotte saisonnière, la reprise de bilan. Planches B à G et Saisons. **Jalon : la boucle existe d'une saison à l'autre.** | 5 moyens, 1 petit |
| **7 — Lot 3 restant** | C3.2 → C3.11 · C3.3 · C3.7 · C3.10 ; puis C3.4 + C3.5 + C3.6 **en une seule migration** ; puis C3.8 ; puis C3.12 | oui, puis non | La source du chiffre, les hypothèses affichées, le ton, les tests ; l'intermodal, le covoiturage des loisirs, la tranche haute ; le plan plausible. **Livrée le 14/09/2026** ([#175](https://github.com/ScratchMe/TraceVerte/pull/175)), et avec elle **les lots 0 à 3 en entier** : l'audit n'a plus de chantier ouvert hors du lot 4. C3.12 est passé en dernier et non dans le premier groupe — il fallait que les tests portent sur le code livré. | 4 petits, 3 moyens, 2 grands |
| **8 — Lot 4, et ce que la recette a trouvé** | C4.1, C4.2, C4.3, C4.4, C4.7, C4.8 (**C4.9 fermé le 15/09/2026 par son expérience, sans une ligne de code** ; **C4.5 livré le 15/09/2026**) ; et les trois constats de recette [#177](https://github.com/ScratchMe/TraceVerte/issues/177), [#178](https://github.com/ScratchMe/TraceVerte/issues/178), [#179](https://github.com/ScratchMe/TraceVerte/issues/179) | chantier par chantier | Chacun précédé d'une page de décision. C4.6 a été avancé dans la vague 6. **La recette sur appareil du 14/09/2026 (§12) verse cinq constats dans cette vague** : trois y entrent tels quels, [#181](https://github.com/ScratchMe/TraceVerte/issues/181) devient **C4.9**, et [#180](https://github.com/ScratchMe/TraceVerte/issues/180) rejoint **C4.5** en le requalifiant — ce qui y était écrit comme un confort est un démarrage impossible. Le sixième a été corrigé le jour même. | 5 grands, 3 moyens, 3 petits |
| **9 — Le classement et la restriction** | C5.1 · C5.4 | **oui** — les deux seuls du lot 5 qui le soient, voir le relevé ci-dessous | Le meilleur levier du poste dominant en tête ; le télétravail se demande en jours et « Parfois » disparaît. **Ce qui trompe aujourd'hui.** Ferme la moitié de [#198](https://github.com/ScratchMe/TraceVerte/issues/198) et de [#197](https://github.com/ScratchMe/TraceVerte/issues/197) | 2 moyens |
| **10 — Le plan se relit** | C5.2 → C5.3 → C5.5 ; C5.8 voyage avec | **non** — quatre chantiers dans le même écran, et C5.2 le déplace | Deux cartes sur le plan, toutes les pistes sur un écran à elles, l'intro qui dit le principe, l'encart de contexte et sa porte. Ferme l'autre moitié des deux issues | 1 grand, 2 moyens, 2 petits |
| **11 — Le premier parcours** | C5.6 → C5.7 | **non** — même écran, et la barre attend la carte | La carte « Ton premier plan », puis la barre d'onglets qui arrive quand les deux lieux ont quelque chose à montrer. **Ce qui manque.** Sa vérification demande un appareil : première séance d'octobre | 2 moyens |

**Relevé du 11/09/2026 — la vague 4 est enchaînée, pas « en partie » parallèle.** Le relevé de
fichiers (refait avant distribution, comme la règle l'impose) montre six chantiers sur sept qui se
croisent : **`src/app/(tabs)/plan.tsx` est revendiqué par trois** (C2.6, C2.2, C2.11),
`src/app/(tabs)/suivi/index.tsx` par deux (C2.3, C2.11), et la fonction
`enqueue_checkin_reminders` par trois (C2.6, C2.3, C2.9) — plus les deux générateurs de points,
partagés par C2.3 et C2.5. Un seul couple est réellement parallélisable, et seulement parce que
C2.14 ne crée que deux fichiers neufs :

    C2.14 ∥ C2.6  →  C2.3  →  C2.5  →  C2.2  →  C2.11  →  C2.9

C'est l'ordre annoncé en §2.3, mais pas pour la raison annoncée. Troisième fois que la colonne
« Parallèle ? » se trompe.

**Relevé du 13/09/2026 — la vague 6 n'a pas trois files parallèles, elle en a une.** Quatrième fois
que la colonne se trompe, et cette fois le chantier rangé dans la troisième file est celui qui touche
les deux fichiers les plus disputés : **`src/constants/mascotte.ts` est revendiqué par trois** (C2.7
pour « Je vois la différence. », C2.8 pour « On repart pour une saison. », C3.9 pour quatre répliques
de section et le 404), **`src/app/(tabs)/suivi/bilan.tsx` par trois** (C2.7 barre-contour et phrase de
variation, C3.1 mobilité contrainte, C3.9 le lien « Un chiffre me semble faux »), `plan.tsx` par deux
(C2.8, C4.6) et `src/types/suivi.ts` par deux (C2.7, C2.8). **Seul C2.13 est réellement disjoint** — et
son texte appelle `src/types/saison.ts` « nouveau » alors que C2.14 l'a livré : c'est le piège de C2.1
en plus petit, un fichier à **étendre** et non à créer. Ordre retenu :

    C2.8  →  C2.7  →  C3.1  →  C4.6  →  C2.13  →  C3.9

C3.9 passe en dernier parce qu'il touche les deux fichiers les plus disputés ; C2.13 juste avant, pour
que la mascotte saisonnière et la carte d'ouverture se regardent dans la même séance sur appareil
(§11.9).

**Relevé du 13/09/2026 — la vague 7 a un ordre à corriger, pas seulement une colonne.** Cinquième
relevé, et le premier qui trouve un défaut d'**ordre** et non de parallélisme. Huit des dix chantiers
n'ayant pas de section « Fichiers », il a fallu lire les « À faire » un par un.

- **C3.12 est placé avant C3.4 + C3.5 + C3.6, et il teste ce qu'ils changent.** Le chantier écrit les
  tests de `src/lib`, de l'estimateur et du calcul complet ; les trois suivants ajoutent une seconde
  jambe persistée, le covoiturage des loisirs et une tranche de distance ouverte — c'est-à-dire le
  calcul lui-même. Et C3.8, annoncé en dernier, reformule les gabarits d'action et retouche les
  tests 02 et 10. Écrire les assertions avant ces trois-là, c'est les écrire deux fois. **C3.12 passe
  tout à la fin.**
- **La première moitié n'est pas parallèle non plus** : C3.2 (le bloc « d'où vient ce chiffre » sous
  le total) et C3.11 (la définition unique du palier) partagent `src/app/(tabs)/suivi/bilan.tsx` —
  le fichier que trois chantiers se disputaient déjà à la vague 6. Ils s'enchaînent.
- Le reste tient : C3.3 vit dans `steps/flights.tsx`, C3.7 dans `steps/leisure-frequency.tsx`,
  C3.10 dans `mascotte.ts`, `api/share-card.ts` et `compte/suppression.tsx` — trois files réellement
  disjointes. Et le regroupement des trois chantiers de calcul en **une seule migration** est juste :
  ils partagent `src/types/bilan.ts` tous les trois, et `steps/leisure-detail.tsx` pour deux d'entre
  eux, en plus de la reprise pgTAP.

Ordre retenu :

    C3.2 → C3.11  ·  C3.3  ·  C3.7  ·  C3.10  ·  C3.4 + C3.5 + C3.6  ·  C3.8  ·  C3.12

**Correction du 10/09/2026 au soir — la vague 2 n'est pas « à fichiers disjoints ».** En relevant
les fichiers de ses huit chantiers avant de les distribuer, six fichiers se sont révélés partagés :
`src/app/_layout.tsx` (C1.2, C1.5, C1.11), `src/app/(tabs)/suivi/bilan.tsx` (C1.1, C1.2, C1.5),
`src/app/(tabs)/plan.tsx` (C1.1, C1.5), `src/app/bilan/index.tsx` (C1.1, C1.3),
`src/app/connexion/index.tsx` (C1.2, C1.5) et `src/lib/compte.ts` (C1.5, C1.10). Les lancer
ensemble ferait s'écraser des chantiers en silence. La vague se découpe donc en cinq étapes :
**2a** C1.12, C1.10, C1.11 (vraiment disjoints) ; **2b** C1.3 et C1.9 — les deux touchent
`src/components/bilan/`, mais jamais les mêmes fichiers (C1.9 : `chip.tsx` et
`steps/long-trips.tsx` ; C1.3 : `numeric-field.tsx` et les autres `steps/`), donc parallèles à
condition de lister les fichiers un par un ; puis **C1.2**, **C1.5** et **C1.1** seuls et dans cet
ordre, chacun repartant de ce que le précédent a écrit. La même vérification reste à faire pour
les vagues suivantes : la colonne « Parallèle ? » de ce tableau est une intention, pas un relevé.

**Relevé du 14/09/2026 — ce que la recette verse dans la vague 8, et où le retrouver.** Ce n'est pas
un relevé de fichiers (la vague 8 est « chantier par chantier », donc la question ne se pose pas) mais
un relevé d'**entrées** : cinq constats venus d'un appareil, qui ne se rattachaient à aucun chantier
au moment où ils ont été vus. Écrits en §12 ils seraient restés un compte rendu de séance ; ils sont
donc aussi ici, dans le seul tableau qu'on relit avant de lancer une vague.

| Constat (§12) | Où il vit dans la vague 8 | Issue |
|---|---|---|
| 12.2 — la taille du covoiturage sur l'écran suivant | chantier à part entière, petit — **livré le 15/09/2026** | [#177](https://github.com/ScratchMe/TraceVerte/issues/177) |
| 12.3 — le binaire du second mode sans état « pas répondu » | chantier à part entière, petit — **livré le 15/09/2026**, sans migration | [#178](https://github.com/ScratchMe/TraceVerte/issues/178) |
| 12.4 — le plan affiche des actions qu'on ne peut pas choisir | chantier à part entière, moyen ; rouvrait C4.6 — **livré le 15/09/2026** | [#179](https://github.com/ScratchMe/TraceVerte/issues/179) |
| 12.5 — hors ligne et à froid, la racine est un mur | **C4.5**, requalifié (plus un confort, un démarrage impossible) puis **livré le 15/09/2026** | [#180](https://github.com/ScratchMe/TraceVerte/issues/180) |
| 12.6 — le bouton « Se désabonner » n'apparaît pas | **C4.9**, ouvert puis **fermé le 15/09/2026** : l'expérience à un message a écarté l'hypothèse de l'en-tête | [#181](https://github.com/ScratchMe/TraceVerte/issues/181) |

Deux d'entre eux ne sont pas des idées d'increment mais des **défauts en production**, et c'est ce qui
les distingue du reste du lot 4 : 12.5 rend l'app inutilisable au démarrage sans réseau pour quiconque
a déjà soumis un bilan, et 12.6 fait manquer à un email de rappel la sortie que la RFC 8058 existe pour
offrir. Ils commencent quand même par une page de décision — c'est la règle du lot — mais une page
courte : ce qui est à trancher est le **moyen**, pas l'opportunité.

**Relevé du 16/09/2026 (soir) — le lot 5 n'a que deux chantiers parallèles, et ce n'est pas une
surprise cette fois.** Sixième relevé, et le premier qui part d'un canvas plutôt que d'un audit :
huit chantiers issus de [`v1-17`](v1-17-densite-du-plan.md), dont **cinq écrivent dans le même
écran** (`(tabs)/plan.tsx`, que C5.2 transforme en pile) et trois dans `src/types/plan.ts`. Seuls
**C5.1** (le classement, une fonction SQL) et **C5.8** (l'espace fine des milliers, `format.ts` et
son jumeau `api/`) sont disjoints de tout. Le tableau complet et les deux relevés de précision qui
en découlent — l'écran du plan n'interroge pas `assessment_answers`, et sa lecture de
`plan_action_commitments_archive` est filtrée sur `released_reason = 'rebilan'`, donc inutilisable
telle quelle pour le signal du premier plan — sont en [`v1-17`](v1-17-densite-du-plan.md) §2.

**Relevé du 16/09/2026 — ce que la recette web verse dans la vague 8.** Même régime que le relevé
ci-dessus, pour une séance d'une autre nature : un navigateur, une fenêtre privée, et le blocage de
requêtes de DevTools pour couper l'API sans couper le site. Sept entrées, dont deux qui ne sont pas
des correctifs mais des arbitrages, et une qui part en brief Claude Design.

| Constat (§13) | Où il vit dans la vague 8 | Issue |
|---|---|---|
| 13.1 — « Parfois » au télétravail coûte une action, et rien ne le dit | décision produit : une phrase d'aide, ou une reformulation en fréquence (plus chère, elle migre le `check`) | [#197](https://github.com/ScratchMe/TraceVerte/issues/197) |
| 13.2 — une coupure réseau répond par une trace de pile | chantier à part entière, petit ; une ligne dans le `catch` de la soumission | [#193](https://github.com/ScratchMe/TraceVerte/issues/193) |
| 13.3 — le plan enfouit son meilleur levier, et le déplié franchit sa limite de densité | **arbitrage**, le plus lourd de la séance : le classement SQL **et** la densité, indissociables. La moitié densité part en **brief Claude Design**, écrit le 16/09/2026 : [`v1-17`](../design/v1-17-densite-du-plan/BRIEF.md) | [#198](https://github.com/ScratchMe/TraceVerte/issues/198) |
| 13.4 — « Rattache un compte » sur le plan est un mur | chantier à part entière, petit ; `carteAttente` rend une action, le plan pose un `TextLink` | [#194](https://github.com/ScratchMe/TraceVerte/issues/194) |
| 13.5 — une ligne dépliée en carte se colle à sa voisine | chantier à part entière, minime ; un `gap` dans `plan.tsx` | [#195](https://github.com/ScratchMe/TraceVerte/issues/195) |
| 13.6 — le premier pas du vol long-courrier ne décrit pas un essai | chantier à part entière, minime ; une migration de données | [#196](https://github.com/ScratchMe/TraceVerte/issues/196) |
| 13.7 — la pastille d'onglet n'englobe que l'icône (web) | **basse priorité**, web seulement ; à ne pas « corriger » en englobant partout | [#199](https://github.com/ScratchMe/TraceVerte/issues/199) |

**Aucun de ces sept n'est un défaut en production au sens de 12.5**, et c'est la différence avec le
relevé précédent : rien ici ne rend l'app inutilisable. Quatre sont des correctifs francs
(13.2, 13.4, 13.5, 13.6) qui tiennent dans une seule PR ; deux sont des arbitrages (13.1, 13.3) ;
un est un reste assumé (13.7).

Trois règles pour distribuer :

- **Un agent par chantier, jamais deux chantiers d'une même file en même temps** (§2.2 dit
  quelles files existent). Deux chantiers de files différentes peuvent partir le même jour.
- **Un chantier du lot 2 lit `v1-14` avant `v1-13`** pour sa partie écran : la copie (§3), la base
  (§4), les composants et leur propriétaire (§5), les jetons (§6). Il ne crée pas un composant dont
  il n'est pas propriétaire ; il attend la PR du propriétaire.
- **Une PR qui touche un point de §8 le dit dans sa description**, et toute PR qui change un
  comportement décrit dans CLAUDE.md met CLAUDE.md à jour dans la même PR.

## 3. Lot 0 — Sécurité, exploitation, durée du projet

### C0.1 — Redirect URLs : référence versionnée et correction de v1-10 §8.4

**Priorité** P0 · **Effort** petit · **Constats** A10-10 (bloquant).

**Pourquoi.** La liste des Redirect URLs Supabase décide à quelles adresses un lien de connexion
remet une session ; CLAUDE.md la décrit comme une frontière de sécurité et documente le
nettoyage du 09/09/2026 de `https://*.vercel.app/**`. Or `docs/architecture/v1-10-connexion-et-rappels.md:342`
prescrit encore cette entrée, et aucun fichier du dépôt ne décrit l'état attendu de la liste :
une régression n'est visible que par quelqu'un qui pense à ouvrir le tableau de bord.

**Fichiers.** `docs/architecture/v1-10-connexion-et-rappels.md:341-342` ; `supabase/config.toml:174`
(placeholder local, ne s'applique qu'à la stack Docker) ; nouveau `docs/exploitation/redirect-urls.md`.

**À faire.**
1. Créer `docs/exploitation/redirect-urls.md` : la liste **exacte** des entrées autorisées sur le
   projet distant (les lire dans le tableau de bord, pas de mémoire), avec pour chacune sa raison,
   sa date d'ajout, et la règle « jamais de joker sur un domaine qu'on ne possède pas ; une entrée
   morte se retire ». Pas de valeur secrète dans ce fichier.
2. Dans `v1-10` §8.4, poser un encadré daté qui dit que la ligne « `https://*.vercel.app/**` pour
   les previews » est **fausse et dangereuse** depuis le 09/09/2026, et renvoie au fichier ci-dessus.
   Ne pas réécrire le paragraphe d'origine.
3. Ajouter à CLAUDE.md, dans le paragraphe qui décrit cette frontière, le renvoi vers le fichier.
4. Dans la checklist de publication (C0.7), une ligne « relire les Redirect URLs contre le fichier ».

**Ne pas faire.** Aucun changement de code. Ne pas tenter d'automatiser la comparaison via l'API
de management dans cette PR — c'est un chantier séparé si on le veut.

**Fait quand.** Le fichier existe, `v1-10` porte son encadré, CLAUDE.md pointe dessus, et une
relecture du tableau de bord confirme que la liste distante est identique au fichier.

### C0.2 — Sauvegarde de la base

**Priorité** P0 · **Effort** moyen · **Constats** C-7.

**Pourquoi.** Aucune occurrence de « sauvegarde », « backup », « PITR » ou `pg_dump` dans le dépôt.
Le projet est sur le plan gratuit Supabase (vérifié le 09/09 : `plan: "free"`), sans sauvegarde
quotidienne incluse. Les migrations reconstruisent le schéma et les référentiels, jamais un bilan,
un engagement ni une réponse. Deux chemins de destruction tournent chaque nuit sans filet :
`purge_stale_anonymous_accounts()` (un `delete from auth.users` sur un `greatest()` de six
sous-requêtes — une colonne renommée un jour, et tout compte paraît inactif) et
`purge_usage_events()`.

**À faire.**
1. Décider du régime : passage au plan payant avec sauvegardes, **ou** un export `pg_dump`
   hebdomadaire par GitHub Action vers un stockage chiffré (le secret de connexion en secret
   GitHub, jamais dans le dépôt), **ou** un script local documenté. Consigner la décision dans
   `docs/exploitation/` (C0.7).
2. Tester **une fois** la restauration sur un projet Supabase vide : c'est ce qui révélera C0.3.
3. Écrire la règle dans CLAUDE.md § Base de données : *toute reprise de calcul en masse
   (`recompute_assessment_results` en boucle, purge modifiée) se fait après un instantané.*
4. Ajouter dans `purge_stale_anonymous_accounts()` une garde de volume : si la purge du jour
   dépasserait, par exemple, 20 % des comptes anonymes, ne rien supprimer et écrire une ligne dans
   un journal (même modèle qu'`emission_factor_sync_runs`). Test pgTAP pour la garde.

**Fait quand.** Une sauvegarde existe, a été restaurée une fois, la règle est écrite, la garde de
volume est testée.

### C0.3 — GRANTs explicites et version du CLI en CI

**Priorité** P0 · **Effort** moyen · **Constats** C-6, A10-17.

**Pourquoi.** Aucune migration ne porte de `grant` (hors `execute`) : les tables ne sont exposées
à `authenticated` que par le drapeau `auto_expose_new_tables = true` de `supabase/config.toml:33`,
dont le commentaire annonce une suppression au 30/10/2026 (note du dépôt, pas une échéance
vérifiée de la plateforme), et l'action `supabase/setup-cli@v1` est en `version: latest`. Une base
reconstruite depuis les migrations n'accorde aucun privilège aux rôles applicatifs. Par ailleurs
`enable_anonymous_sign_ins = false` (`config.toml:189`) rend la stack locale différente de la
production sur le point central du modèle d'auth.

**À faire.**
1. Écrire une migration `grants_explicites` : `grant usage on schema public to anon, authenticated` ;
   `select`/`insert`/`update`/`delete` sur les tables applicatives à `authenticated` **en cohérence
   avec les révocations existantes** (relire chaque `revoke` des migrations : `engagement_checkins`
   révoque `insert`, `notification_outbox` et `push_tokens` sont serveur-only, `plan_actions` n'a
   pas de policy UPDATE et ne doit pas en gagner par un grant) ; `select` sur les référentiels à
   `anon` et `authenticated`.
2. Retirer `auto_expose_new_tables` de `config.toml` et relancer `supabase test db` localement :
   la suite doit passer sur les seuls grants écrits.
3. Passer `enable_anonymous_sign_ins = true` dans `config.toml`.
4. Épingler la version du CLI dans `.github/workflows/ci.yml` (une version connue qui passe).
5. Test pgTAP : `has_table_privilege` sur trois tables représentatives (une applicative, un
   référentiel, une serveur-only).

**Ne pas faire.** Ne pas accorder `update` sur `plan_actions` par facilité ; la doctrine de
CLAUDE.md sur l'engagement en dépend.

**Fait quand.** CI verte sans le drapeau, le CLI épinglé, les trois assertions de privilège
présentes.

### C0.4 — Filet d'erreur : ErrorBoundary et remontée minimale

**Priorité** P0 · **Effort** petit · **Constats** C-1.

**Pourquoi.** Aucune route n'exporte d'`ErrorBoundary` ; une exception de rendu affiche l'écran
anglais d'Expo Router (« Something went wrong ») et personne ne l'apprend : aucune remontée
d'erreur client n'existe. La page blanche du 08/09/2026 est de cette famille ; la garde
`verifier-rendu-export.mjs` ne voit qu'un échec au chargement, pas après interaction.

**Fichiers.** `src/app/_layout.tsx:111` ; `src/app/index.tsx:77-100` (le registre à copier :
phrase humaine, bloc technique recopiable, bouton « Réessayer ») ; `scripts/verifier-rendu-export.mjs`.

**À faire.**
1. Exporter un `ErrorBoundary` depuis `src/app/_layout.tsx` qui rend un écran en français dans le
   registre de `index.tsx`, sans mascotte (elle ne commente pas une panne), avec « Réessayer ».
2. Remontée minimale : décider entre un service dédié (Sentry ou équivalent, avec une ligne dans
   la politique de confidentialité, C1.10) et un événement d'usage `app_error` **sans texte
   libre** (une catégorie et la route, migration `usage_event_types` + entrée dans
   `src/types/analytics.ts`, sinon l'insert est rejeté en silence). Le second est fragile
   (`track()` renonce sans session) ; le dire dans la décision.
3. Étendre `verifier-rendu-export.mjs` : échouer si une page rendue contient « Something went wrong ».

**Fait quand.** Une exception provoquée volontairement dans un écran affiche l'écran français, et
la remontée choisie reçoit l'événement.

### C0.5 — Observabilité et robustesse de l'envoi des rappels

**Priorité** P0 · **Effort** moyen · **Constats** A9-1, A9-4, A9-12, A9-13, A9-14, A7-8.

**Pourquoi.** `send_pending_reminders()` est la seule boucle de réengagement du produit. Elle
tourne dans une transaction unique de cent lignes (un abandon renvoie ce qui est déjà parti),
sort par un `continue` muet si un secret Vault manque, fait une requête HTTP Expo **par ligne**
(cent lignes lentes = plus de trente minutes dans un cron), partage un plafond de cent entre push
et email alors que seul l'email est étalé, et un repli push → email perd une journée. Aucune vue
ne dit si les rappels partent. Même famille : la synchronisation trimestrielle des facteurs ne
signale un statut `partial` (slug renommé) à personne.

**Fichiers.** `supabase/migrations/20260907230000_rappels_canal.sql` (`send_pending_reminders`
l. ~300-410, `replier_rappel_sur_email` l. 245-259, `collect_push_receipts` l. ~450-490) ;
`20260905100000_facteurs_acv_complete.sql:234-273` (sync) ; tests 09 et 17.

**À faire.**
1. Deux vues d'exploitation, schéma `analytics` (non exposé par PostgREST, comme les autres) :
   `rappels_par_jour` (jour, canal, statut, nombre) et `rappels_bloques` (lignes `pending` dont
   `send_after` a plus de deux jours, plus les lignes `failed`). Une troisième,
   `synchronisations_facteurs`, sur `emission_factor_sync_runs` avec les statuts non `success`.
2. Quand la fonction sort faute de secret, écrire une ligne de journal (table `reminder_send_runs`
   sur le modèle d'`emission_factor_sync_runs`, ou une ligne `failed` avec `last_error` explicite).
3. Marquer la ligne `sent` **avant** l'appel HTTP et la remettre en `pending` en cas d'échec
   (ou committer par lot via une `procedure`) : un message parti ne doit jamais repartir.
4. Regrouper les pushs par lots de destinataires dans un seul appel Expo (l'API l'accepte), et
   séparer les budgets : `limit 100` sur les seules lignes `email`, boucle distincte pour le push.
5. Traiter le repli push → email dans la même passe (recharger la ligne repliée et enchaîner).
6. `collect_push_receipts` : poser `receipts_checked_at` au-delà de 48 h même en échec, pour que
   la file avance.
7. Faire écrire à `sync_emission_factors` une ligne dans le journal quand le statut vaut
   `partial` ou `error`, lisible par la vue ci-dessus.

**Tests.** Test 09 : une ligne `sent` n'est jamais reprise ; sortie sans secret laisse une trace.
Test 17 : le repli est traité dans la même passe.

**Fait quand.** Les vues existent, un passage sans secret laisse une trace lisible, et un
scénario « cent lignes dont dix en échec » ne renvoie aucun message deux fois.

### C0.6 — Rétention : boîte d'envoi et jetons désactivés

**Priorité** P0 · **Effort** petit · **Constats** A9-2, C-11, A9-5.

**Pourquoi.** `notification_outbox` conserve indéfiniment adresse, sujet et corps ;
`unregister_push_token` marque `disabled_at` et rien ne supprime jamais un jeton — alors que
`confidentialite.tsx:200-204` affirme qu'il « disparaît si tu désinstalles l'application, si tu
coupes les notifications ». L'export omet `notification_outbox`, seule table rattachée à
`profiles` absente de son énumération.

**À faire.**
1. `purge_notification_outbox()` : supprimer les lignes `sent`/`cancelled`/`failed` de plus de six
   mois, branchée sur le cron nocturne (respecter l'ordre des crons existants, cf. inventaire C).
2. Dans la même purge : `delete from public.push_tokens where disabled_at < now() - interval '90 days'`.
3. `export_my_data()` : ajouter `rappels_envoyes` (période, canal, statut, date d'envoi) ; assertion
   au test 15 comme pour `appareils_pour_les_rappels`.
4. Reprendre la phrase du jeton dans `/confidentialite` (C1.10 fait la passe complète ; ici,
   fournir la formulation vraie : « désactivé dès que les notifications sont coupées, supprimé
   90 jours plus tard ou avec le compte »).

**Tests.** pgTAP : la purge ne touche jamais une ligne `pending` ; un jeton désactivé depuis 91
jours disparaît, un jeton actif reste ; l'export porte la nouvelle clé.

### C0.7 — Registre d'exploitation et point d'entrée de la documentation

**Priorité** P0 · **Effort** petit · **Constats** C-10, A11-10, A11-9 (pour la partie pointeur).

**Pourquoi.** Tous les comptes externes tiennent à une seule personne (EAS `owner:
antoineberthaud`, Supabase, Vercel, Resend, Google Cloud, Play, domaine), et aucun fichier ne
liste ce qui y est réglé. CLAUDE.md désigne comme « feuille de route courante » un plan
entièrement fait, et `v1-10` §9 / `v1-11` §5 listent comme ouverts six chantiers livrés (#59,
#60, #61, #62, #65, #68).

**À faire.**
1. Créer `docs/exploitation/README.md` : un tableau par service (compte porteur, ce qui y est
   configuré hors dépôt, dernière relecture), en rassemblant ce qui existe déjà dans `v1-10` §8,
   `v1-12` §5.2 et §7, CLAUDE.md (assetlinks, empreintes). **Aucune valeur secrète.** Une
   checklist de publication Play (empreinte de signature #93, formulaire Sécurité des données,
   relecture des Redirect URLs, sauvegarde faite).
2. Décider et noter la continuité : organisation plutôt que compte personnel, second propriétaire.
3. Fermer sur GitHub les issues livrées (#59, #60, #61, #62, #65, #68) avec le commit qui les ferme.
4. Dans CLAUDE.md, remplacer le renvoi « feuille de route courante → v1-07 §4 » par ce document
   (§ Feuille de route), en gardant `v1-07` §4 cité comme historique.

**Fait quand.** Le registre existe, les issues sont fermées, CLAUDE.md pointe ici.

## 4. Lot 1 — Bugs silencieux et textes faux

### C1.1 — Soumission du bilan : plus de bilan fantôme

**Priorité** P1 · **Effort** petit · **Constats** A2-2, A8-3, A2-19, A2-15, A12-17, A3-5.

**Pourquoi.** `submit()` insère `assessments` en `completed` avec `submitted_at`, **puis** les
réponses, **puis** appelle `compute_assessment_results`. Une coupure réseau, une contrainte
violée (distance 0, C1.3) ou une erreur dans `generate_plan_cycle_for_user` (appelée sans bloc
`exception` à la fin de `recompute_assessment_results`, un mode sans facteur suffit) laisse un
bilan complété sans réponses ni résultat : la racine route vers `/plan`, qui affiche « Ton plan
est en cours de préparation » sans bouton, et le préremplissage du re-bilan meurt. Un double
clic crée deux bilans. L'entonnoir lit un « bilan soumis » là où il y a eu une panne.

**Fichiers.** `src/app/bilan/index.tsx:119-193` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:443`
(fin de `recompute_assessment_results`) et `:612` (`emission_factor` dans l'estimateur) ;
`src/app/(tabs)/plan.tsx:312-323` (état `pending`) ; `src/app/(tabs)/suivi/bilan.tsx:265-273`
(état d'erreur).

**À faire.**
1. Séquence sûre côté client : insert `assessments` en `in_progress` → insert des réponses →
   `update` en `completed` + `submitted_at` → RPC. Le passage à `completed` doit précéder le RPC :
   `generate_plan_cycle_for_user` sélectionne `status = 'completed'`.
2. En cas d'échec après le premier insert, supprimer la ligne créée (policy DELETE owner-scoped à
   ajouter sur `assessments` **limitée à `status = 'in_progress'`**, ou un RPC dédié) ; à défaut,
   rendre la soumission ré-entrante en réutilisant le bilan `in_progress` existant.
3. Verrou de soumission dans une `useRef` testée en tête de `submit()`, en plus de l'état d'affichage.
4. Côté SQL : envelopper l'appel au plan dans `begin … exception when others then raise warning …
   end;` — le bilan doit être rendu même si le plan échoue (le cron quotidien rattrape).
5. État `pending` du plan : un bouton « Réessayer » (incrémente `refreshKey`) et un lien « Revoir
   mon bilan ». État d'erreur de `/suivi/bilan` : phrase française fixe, « Réessayer », lien vers
   le suivi, jamais `error.message` (peut contenir des valeurs saisies).
6. Événement `bilan_submit_error` avec une **catégorie** venue du code (jamais le message brut) :
   migration + `src/types/analytics.ts`.

**Tests.** Jest sur la dérivation de catégorie d'erreur (module pur). pgTAP : un `estimate_action_savings`
qui lève ne fait pas échouer `recompute_assessment_results`.

**Fait quand.** Couper le réseau entre les deux inserts ne laisse aucune ligne `completed` sans
réponses ; un double clic ne crée qu'un bilan.

### C1.2 — Session unique et mesure d'ouverture juste

**Priorité** P1 · **Effort** petit · **Constats** A1-2, A1-3, A1-4, A3-21, A3-4, A6-11, A6-10, A5-17.

**Pourquoi.** `ensureSession()` est appelée dans le même rendu par `src/app/index.tsx:40` et
`src/app/_layout.tsx:60` sans mémoïsation : deux comptes anonymes sont créés au premier
lancement (vérifié en base le 10/09 : six comptes sur treize créés moins de trois secondes après
le précédent). `app_open` part au montage, avant la session au premier lancement, et jamais au
retour d'arrière-plan — le chemin du rappel. La migration de purge fonde sa fenêtre sur
« `app_open` est émis à chaque ouverture », ce qui est faux. `resultat_share` est compté avant le
partage, `resultat_view` ne distingue pas nouveau et relecture, `connexion_success` par email
part à l'envoi du lien, et la provenance `compte` de `connexion_view` est recomptée en
`resultat_transition`.

**Fichiers.** `src/lib/supabase.ts:77-85` ; `src/app/_layout.tsx:60, 88-91` ; `src/lib/analytics.ts:47` ;
`src/app/(tabs)/suivi/bilan.tsx:157, 242-253, 432-435` ; `src/app/connexion/index.tsx:31-35` ;
`src/app/connexion/email.tsx:55` ; `src/types/analytics.ts`.

**À faire.**
1. `ensureSession` : mémoïser la promesse en vol dans le module (`let enCours: Promise<…> | null`),
   la rendre à tout appelant concurrent, la relâcher en cas d'échec. Contrat inchangé.
2. Émettre `app_open` après la résolution d'`ensureSession()` (dans le `.then` du layout, avant
   `enregistrerLeJeton`), et ajouter une écoute `AppState` qui réémet `app_open` au passage à
   `active` après plus de quelques minutes en arrière-plan (ou un événement `app_resume` distinct,
   déclaré des deux côtés). Corriger le commentaire de `_layout.tsx:88-90` et celui de la migration
   `20260907093000` qui décrit `app_open`.
3. `resultat_view` : ajouter `mode: 'nouveau' | 'relecture'` aux props (déjà connu par `modeResultat`).
4. `shareResult` : asynchrone, repli presse-papier avec état inline « Lien copié » quand Web Share
   est absent, `resultat_share` émis **après** une issue réussie (`sharedAction` sur natif).
5. Email : émettre un `connexion_demande` (nouveau type) à l'envoi, et `connexion_success` au
   constat de la bascule d'`is_anonymous` — l'annonce de rattachement du plan la voit déjà.
6. `connexion/index.tsx` : dériver le garde des provenances du type ; ajouter `compte`, retirer
   `plan` et `suivi` du type tant qu'aucun écran ne les émet.

**Tests.** Jest : `ensureSession` n'est testable que sortie de `@/lib/supabase` — extraire la
mémoïsation dans une fonction pure `uneSeuleFois(fabrique)` testée. Vérification en base après
déploiement : plus de paires de comptes à moins de trois secondes.

### C1.3 — Questionnaire : les bords qui cassent le chiffre

**Priorité** P1 · **Effort** moyen · **Constats** A2-1, A2-3, A2-4, A2-5, A2-6, A2-7, A2-16, A2-17,
A2-18, A2-21, A2-10 (partie alignement), A2-20, A2-22.

**Pourquoi.** Une distance « 0 » passe toutes les validations et échoue neuf étapes plus loin en
anglais ; « 3,5 » devient 35 sur le poste le plus lourd du bilan ; changer le mode principal
après avoir choisi un second mode laisse voiture sur les deux jambes, facturée sans covoiturage ;
sur l'étape loisirs, un mode déjà répondu peut être invisible et se faire écraser ; le brouillon
est écrit dès l'ouverture, prend le pas sur le préremplissage et fait disparaître le bandeau ;
il est relu sans validation ni version, et un brouillon antérieur aux migrations de motorisation
fait sauter la question ; le message d'échec concatène `error.message` ; « Je ne sais pas » est
sans retour ; le bouton Retour du premier pas est inerte au premier lancement.

**Fichiers.** `src/types/bilan.ts:180-206, 237` ; `src/components/bilan/numeric-field.tsx:29-32` ;
`src/components/bilan/steps/commute-mode.tsx:40-53` ; `commute-extra.tsx:36-38` ;
`leisure-detail.tsx:40-49` ; `commute-days-distance.tsx:38, 68, 95` ; `src/lib/bilan-draft.ts:16-24` ;
`src/app/bilan/index.tsx:60-87, 110, 186-191, 216` ; `src/components/bilan/step-shell.tsx:13` ;
`missing-mode-link.tsx:15-27` ; `long-trips.tsx:10`.

**À faire.**
1. `manqueDeLEtape` : `commute_distance_km === null || commute_distance_km <= 0`. Borne haute
   plausible (au-delà de ~200 km aller, confirmation, pas blocage). Cas dans `bilan.test.ts`.
2. `NumericField` : accepter `,` et `.`, un seul séparateur, garder la chaîne saisie en état local
   pendant la frappe (sinon « 3, » est réécrit « 3 »).
3. `normaliserReponses(answers)` dans `src/types/bilan.ts`, appliquée après chaque `update`, qui
   porte **toutes** les remises à zéro aujourd'hui dispersées à trois endroits : second mode
   effacé s'il devient égal au principal (et `commute_second_mode_used` remis à `false`), moteur
   et type de deux-roues rattachés à une jambe qui n'existe plus, `commute_two_wheeler_type` sur
   « Non » à B1.1. Tests sur chaque cas.
4. `leisure-detail.tsx` : `showMore` initialisé à `LEISURE_MODE_CHOICES_MORE.some(c => c.modeId === answers.leisure_mode)`.
5. `loadBilanDraft` : `{ ...EMPTY_BILAN_ANSWERS, ...draft.answers }`, rejet si `step` n'est pas dans
   `BILAN_STEP_ORDER`, horodatage du brouillon. La clé AsyncStorage reste `v1`.
6. Sauvegarde du brouillon armée au **premier changement** de réponse, pas à l'ouverture ; le
   bandeau de préremplissage s'affiche aussi quand le brouillon **est** le dernier bilan. Un
   brouillon de plus de quelques semaines est proposé à la suppression (« Continuer / Repartir de
   mon dernier bilan ») — c'est l'écran « Reprise de bilan » du handoff §5.2, voir aussi C3.9.
7. Message d'échec : une phrase fixe (« Tes réponses sont conservées, réessaie dans un instant. »,
   qui est vraie) et le détail technique dans un second texte `type="code"`, comme `index.tsx`.
8. Lien symétrique « Je connais la distance exacte » qui repasse `unknown` à faux et efface la tranche.
9. `onBack` du premier pas seulement si `previousStep(...) !== null || router.canGoBack()`.
10. Aligner la plage des trajets longue distance sur `10+` comme les vols (écart à la spec §5).
11. `MissingModeLink` en `TextLink` (`role="link"`, `type="code"`, `containerStyle` centré).
12. `distanceBracketMidpointKm` : soit la supprimer avec son test, soit l'utiliser pour afficher
    « on comptera environ 10 km » sous la tranche choisie (préférable : la règle devient visible).

**Ne pas faire.** Ne pas remplacer la puce « N+ » par une saisie libre (simplification assumée en
commentaire). Ne pas dériver `selectedKey` de `answers` sur l'étape loisirs sans traiter la
distinction seul/covoiturage (C3.5).

**Tests.** `bilan.test.ts` : distance 0, normalisation des dépendances (trois scénarios), brouillon
d'une version antérieure, `step` inconnu. Nouveau `bilan-draft.test.ts` (AsyncStorage mocké) :
sérialisation, normalisation, horodatage.

### C1.4 — Réseau coupé : dire vrai sur chaque écran

**Priorité** P1 · **Effort** moyen · **Constats** A4-1, A4-2, A12-6, A5-2, A6-8, A6-12, A5-16, A1-5 (partie message).

**Pourquoi.** Hors ligne : le plan annonce « Ton bilan n'est pas encore fait » et propose de le
refaire ; le suivi annonce « Ton suivi commence au premier bilan » ; « Toi » dit à une personne
rattachée qu'elle n'a pas de compte et propose d'en créer un ; répondre à un point ne fait rien
du tout ; choisir un canal revient silencieusement en arrière ; l'envoi d'un lien affiche
« Regarde tes emails » ; « Mes données » n'annonce ni échec ni succès aux lecteurs d'écran. Le
message de la racine est bien humain (« Vérifie ta connexion et réessaie »), c'est le repli local
qui manque (C4.5).

**Fichiers.** `src/app/(tabs)/plan.tsx:163-175, 187, 206-211` ; `src/components/checkin-card.tsx:36-45` ;
`src/app/compte/index.tsx:35-40, 48-54` ; `src/lib/bilan-history.ts:27, 59` ;
`src/app/(tabs)/suivi/index.tsx:60-63, 84` ; `src/lib/compte.ts:62-77` ; `src/types/compte.ts:28` ;
`src/app/connexion/retrouver.tsx:96-106` ; `src/app/compte/suppression.tsx:80-92` ;
`src/types/connexion.ts` ; `src/components/compte/mon-compte.tsx:107-111`.

**À faire.**
1. Plan : récupérer `error` sur `assessments` et `engagement_checkins` ; état `erreur_reseau` avec
   « Je n'ai pas réussi à relire ton plan. Vérifie ta connexion. » et « Réessayer » → `rafraichir()`.
   Le repli `cycleError → pending` est le même mensonge : le router vers le même état.
2. Suivi : `loadAssessmentHistory`/`loadAnsweredCheckins` rendent `{ ok: true, data } | { ok: false }` ;
   état `error` avec `MessageInline` et « Réessayer ». Jamais erreur → état vide.
3. Check-in : état `erreur` inline (« Ta réponse n'est pas partie. Vérifie ta connexion et
   réessaie. »), boutons actifs ; demander le compte de lignes de l'`update` et traiter 0 ligne
   comme un échec (session expirée, point déjà clos) — sinon la carte félicite pour rien.
   Avec C1.12, cette logique passe dans le RPC.
4. « Toi » : `getUser()` ne lève pas, il rend `{ user: null, error }` ; `lireEtatDuRattachement`
   doit distinguer ce cas et rendre un quatrième état `indisponible` (« On n'a pas pu vérifier ton
   compte à l'instant. »), sans bouton de rattachement. Le choix de canal affiche « Ton choix n'a
   pas été enregistré. Vérifie ta connexion et réessaie. » en cas d'échec.
5. `retrouver` et `suppression` : prédicat `estPanneDeTransport(error)` dans `src/types/connexion.ts`,
   **liste blanche** d'échecs retryables du SDK (`AuthRetryableFetchError`, absence de statut),
   jamais un fourre-tout — le 422 `otp_disabled` doit continuer de mener à l'écran d'attente
   (non-divulgation). `MessageInline` neutre sur panne.
6. `mon-compte.tsx` : `MessageInline` pour échec et succès (commentaire disant pourquoi un succès
   y passe).

**Tests.** `connexion.test.ts` : `estPanneDeTransport` sur un `otp_disabled`, un 500, une erreur
réseau, une limite d'envoi. `compte.test.ts` : l'état `indisponible`.

**Fait quand.** En mode avion, aucun écran n'affirme un fait faux sur les données de la personne.

### C1.5 — Connexion : annulation, lien expiré, retour de messagerie, suppression

**Priorité** P1 · **Effort** moyen · **Constats** A6-1, A6-20, A1-6, A6-6, A6-5, A6-7, A6-21, A6-22, A3-20, A4-7.

**Pourquoi.** Annuler la connexion Google est compté comme un succès (événement, marque locale,
arrivée sur le plan) ; sur web, tout cela s'exécute pendant que le navigateur quitte la page. Un
lien expiré ne produit rien sur natif : le layout ne traite que les URL contenant `access_token=`,
et le cas `error_code=otp_expired` est filtré avant `createSessionFromUrl`, qui sait pourtant le
lire. La confirmation « Ton compte est rattaché » ne rejoue pas au retour de la messagerie (effet
à dépendances vides). Après suppression de compte, les marques locales survivent, dont le
brouillon, qui repréremplit le questionnaire suivant. Depuis « Toi », l'écran de connexion n'a
pas de retour.

**Fichiers.** `src/lib/auth.ts:45-49, 57-60, 83-86` ; `src/app/connexion/index.tsx:50-81, 130-137` ;
`src/app/_layout.tsx:78-83` ; `src/app/(tabs)/plan.tsx:140-155` ; `src/lib/compte.ts:94-107` ;
`src/lib/connexion-prefs.ts`, `notification-prefs.ts`, `bilan-draft.ts` ;
`src/app/connexion/retrouver.tsx:53` ; `src/app/(tabs)/suivi/bilan.tsx:164-233`.

**À faire.**
1. `linkGoogleIdentity` rend trois issues : succès, erreur, annulation. Sur annulation, l'écran
   reste, ne marque rien, n'émet rien (au plus « Tu peux réessayer quand tu veux. »).
   `connexion_success` et `markConnexionProposalSeen` seulement après vérification d'une session
   liée (`getUser()` avec `is_anonymous === false`). Sur web, poser la marque **avant** la
   redirection et émettre au retour (voir C1.2 point 5).
2. `_layout.tsx` : traiter aussi les URL portant `error=`/`error_code=` ; sur échec (expiré, refusé,
   `createSessionFromUrl` en erreur), rendre l'échec visible par un état partagé lu par
   `/connexion/retrouver` (paramètre `motif=lien_expire`, adresse préremplie si connue) plutôt
   qu'un `router.replace` depuis l'effet du layout pendant le montage.
3. Effet d'annonce du rattachement dépendant de `refreshKey` (ou son propre `useRafraichirAuRetour`).
   Vérifier aussi que `linkEmail` porte un `emailRedirectTo` vers le scheme natif, sinon le lien
   de confirmation s'ouvre dans le navigateur et le retour est manuel.
4. `deleteMyAccount` : effacer toutes les clés `traceverte.*` après succès du RPC (une fonction
   `effacerLesMarquesLocales()`), brouillon compris.
5. Depuis « Toi » (`source === 'compte'`), afficher un retour qui fait `router.back()` sans
   marquer la proposition vue ; retirer le `hint` redondant sous « Continuer sans compte ».
6. `suivi/bilan.tsx` : trois états pour la proposition (`inconnu` / `anonyme-jamais-proposé` /
   `autre`) au lieu d'un booléen optimiste ; `getSession()` suffit (cache local).
7. `enregistrerLeJeton()` appelé après chaque `setSession` réussi et sur `onAuthStateChange`.

**Tests.** `connexion.test.ts` : dérivation des trois issues ; un test sur la lecture des fragments
d'erreur (fonction pure extraite de `createSessionFromUrl`).

### C1.6 — Feuille des rappels : ne jamais se fermer sur rien

**Priorité** P1 · **Effort** petit · **Constats** A4-4, A4-5, A4-8, A4-15, A4-6, A9-19.

**Pourquoi.** Sur natif sans compte — le cas majoritaire —, la ligne « Par email » est
présélectionnée alors qu'elle est non choisissable ; le bouton dit « C'est bon » ; valider écrit
`email` → canal effectif `aucun` ; la clé AsyncStorage empêche de revoir la feuille. La carte
d'attente ne dit rien de ce cas : la sixième ligne de la table de vérité de `v1-12` §3 manque dans
`carteAttente` **et** dans `rappels.test.ts`, qui prétend couvrir les six. `jetonActif` est posé
vrai dès que la permission est accordée, sans vérifier l'enregistrement ; « coupées dans les
réglages » s'affiche aussi à qui n'a jamais rien refusé ; la requête « jeton de cet appareil » ne
filtre pas l'appareil.

**Fichiers.** `src/components/plan/feuille-rappels.tsx:51-53, 79` ; `src/types/rappels.ts:86-107, 188, 206-211` ;
`src/types/rappels.test.ts:149-207` ; `src/lib/rappels.ts:84-120` ; `src/lib/notification-prefs.ts:31-38` ;
`src/components/compte/choix-de-rappel.tsx:32`.

**À faire.**
1. Présélection dérivée dans `src/types/rappels.ts` (module pur) : jamais une ligne non
   choisissable ; sur natif sans compte, `push`.
2. `carteAttente` : branche `prefere === 'email' && !emailPossible` → détail « Rattache un compte pour
   recevoir le mot par email. » ; sixième assertion dans le test.
3. `enregistrerLeJeton()` rend un booléen ; `jetonActif` ne prend que cette valeur.
4. `lignesDeReglage` reçoit la `Permission` et distingue trois détails (`accordee` / `demandable` /
   `fermee`) ; le lien « Ouvrir les réglages du téléphone » du canvas n'existe que dans `fermee`.
5. Mémoriser le jeton émis par **cet** appareil en AsyncStorage à l'enregistrement et ne
   désactiver que celui-là ; `jetonActif` de `loadReminderPrefs` filtré de même.

**Tests.** `rappels.test.ts` : présélection (natif/web × compte/anonyme), sixième ligne, trois
détails de permission.

### C1.7 — Le suivi se rafraîchit au retour

**Priorité** P1 · **Effort** petit · **Constats** A5-1, A11-1, A13-12, A9-18.

**Pourquoi.** CLAUDE.md pose la règle après le test d'appareil du 09/09 ; seul `/plan`
l'applique. `/suivi` charge dans un `useEffect(..., [])` : le « Oui » donné sur le plan et le
nouveau bilan n'y apparaissent pas tant que l'app n'est pas relancée — le moment de renforcement
le plus fort du produit tombe dans ce trou.

**Fichiers.** `src/app/(tabs)/suivi/index.tsx:74-90` ; modèle : `src/app/(tabs)/plan.tsx:114-124`.

**À faire.** Extraire le chargement dans un `useCallback` stable, garder le garde `cancelled`,
brancher `useRafraichirAuRetour`. Ne pas toucher `/suivi/bilan` (écran empilé, dépend de `[id]`),
ni remplacer son `useTrackView` par `useTrackFocus`.

**Fait quand.** Répondre au point depuis Plan puis ouvrir Suivi montre la réponse ; refaire un
bilan puis toucher l'onglet Suivi montre la nouvelle barre.

### C1.8 — Le chiffre affiché : kilos sous une tonne, modes manquants, relecture

**Priorité** P1 · **Effort** petit · **Constats** A3-1, A10-3, A5-3, A1-12, A3-6, A3-14, A3-13, A3-3, A13-14, A3-9, A3-15, A3-16, A3-10, A3-12, A3-22, A5-21.

**Pourquoi.** `formatTonnes` n'a qu'une forme : sous 50 kg tout s'affiche « 0,0 t CO₂e », y compris
la phrase « Le repère 2050 est à ta portée : 0,0 t CO₂e de moins sur l'année » et les postes
secondaires de n'importe quel bilan ; sur le suivi, deux bilans à « 1,2 t » se lisent identiques
sous une note « 5 % de moins ». Les quatre deux-roues motorisés manquent à `MODE_PREPOSITION` :
le motard qui découvre son bilan ne voit pas son mode. En relecture d'un ancien bilan, le palier
est calculé sur le cap du cycle **courant** et la phrase promet « le plan qui suit ». Le profil
nul reste coiffé de « Le déplacement qui pèse le plus » et sa félicitation est écrite dans
l'écran, à la deuxième personne. « celui du haut » ne désigne rien. Un bilan relu n'a pas de date.

**Fichiers.** `src/lib/format.ts:3-6` ; `src/constants/carbon-reference.ts:103` ;
`src/app/(tabs)/suivi/bilan.tsx:36-56, 100-141, 190-201, 242-253, 259, 329-350, 372-378, 537` ;
`src/types/resultat.ts` ; `src/constants/mascotte.ts` ; `src/app/(tabs)/suivi/index.tsx:57, 192, 320`.

**À faire.**
1. `formatTonnes` : kilos arrondis sous 1 t (« 12 kg CO₂e »), dixième de tonne au-dessus ; créer
   `src/lib/format.test.ts` (0, 12, 40, 49, 50, 940, 1000, 1330, 15820). Vérifier les trois
   surfaces (restitution, suivi, proposition de compte) et `formatTonnesShort`. Passer le titre de
   l'étape de contexte par un formateur commun (« 2 tonnes »).
2. Déplacer `MODE_PREPOSITION`, `POSTE_SUBJECT`, `dominantHeadline`, `dominantShareLabel`,
   `comparisonNote`, `palierNote` dans `src/types/resultat.ts` ; ajouter les quatre deux-roues
   (« en scooter thermique », « en scooter électrique », « en moto de petite cylindrée », « en
   moto de grosse cylindrée ») ; test qui parcourt la liste typée des identifiants de mode et
   échoue sur tout mode sans préposition. `dominantShareLabel` construit à partir de
   `dominantPercent` (sûr), plus `urlDePartage(results, appUrl)` testée.
3. En `relecture` : **pas de palier** (le cap n'est pas celui du bilan), et la phrase ne promet pas
   de plan ; afficher la date du bilan (`submittedAt`, la même que `/suivi`, `formatDate` sorti
   dans `src/types/suivi.ts`).
4. Profil nul : intitulé neutre (« Ton bilan »), réplique de Ramille dans `RAMILLE.bilanQuasiNul`
   rendue par `RamilleDit` (première personne : « Je ne vois presque rien à compter chez toi —
   c'est rare. »), pas de gras sur la ligne dominante.
5. `comparisonNote` : nommer le poste au lieu de « celui du haut ».
6. « Chargement de ton bilan… » au lieu de « Calcul de ton bilan… ».
7. Total : `type="salient"` ou taille assumée en commentaire ; corriger `v1-11` l.408 et l'en-tête
   de `TypeScale` qui citent 44 et 48 px pour un chiffre à 26.
8. `MaxContentWidth` sur le suivi, le plan et la restitution.

**Tests.** `format.test.ts`, `resultat.test.ts` (total nul, avion, deux-roues, mode inconnu,
relecture vs nouveau).

### C1.9 — Accessibilité : les cinq régressions vérifiées

**Priorité** P1 · **Effort** moyen · **Constats** A4-11, A1-7, A1-15, A10-8, A2-9, A2-23, A6-13, A2-8 (partie Chip), A10-21.

**Pourquoi.** `accessible` sur la racine d'`ActionCard` regroupe son sous-arbre, `children`
compris : le bouton « Je m'y engage » peut devenir non actionnable (garanti sur iOS, à vérifier
TalkBack et web). Les quatre étapes de l'onboarding sont montées et lues d'un bloc, trois
« Continuer » identiques, un lien tabulable depuis n'importe quelle page, aucune progression
annoncée. Aucune prise en compte de « réduire les animations » : la mascotte respire en boucle
sur douze écrans. Le champ de retour n'a pas de nom accessible. Les contrôles ont des hauteurs
fixes.

**Fichiers.** `src/components/plan/action-card.tsx:52-62, 105` ; `src/app/onboarding/index.tsx:126-150` ;
`src/components/onboarding-dots.tsx` ; `src/components/mascot.tsx:79-92` ; `src/components/ecran-lancement.tsx:70, 104` ;
`src/components/bilan/chip.tsx:46-49` ; `src/components/bilan/steps/long-trips.tsx:33-50` ;
`src/app/feedback.tsx:110-127` ; `src/components/button.tsx:58` ; `src/components/auth/google-button.tsx:43`.

**À faire.**
1. `ActionCard` : porter `accessible`/`accessibilityLabel` sur un sous-groupe non interactif
   (en-tête + titre + gain), `children` hors du groupe. Vérifier TalkBack et web.
2. Pager : `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"` /
   `aria-hidden` sur les pages `index !== i` ; `OnboardingDots` en `progressbar` avec « Étape 2
   sur 4 ».
3. Hook `useAnimationsReduites()` — ou, plus simple avec reanimated 4.5, `reduceMotion:
   ReduceMotion.System` dans la configuration des animations — lu par `Mascot` (respiration
   coupée) et `EcranLancement` (pose finale directe, plancher inchangé : D13).
4. Lancement : `accessibilityRole="progressbar"` / libellé « Chargement ».
5. `Chip` : prop `role?: 'button' | 'radio'` (l'état `selected` est déjà posé, ligne 49 ; c'est le
   rôle qui manque pour les groupes exclusifs) ; libellé composé sur les puces numériques des
   longs trajets (« 3 trajets en train »).
6. Changement d'étape du questionnaire : déplacer le focus sur le titre (`setAccessibilityFocus`
   sur natif, `focus()` sur web).
7. `feedback.tsx` : `accessibilityLabel="Ton message"`, `MessageInline` pour l'échec, chips en
   `radio` dans un `radiogroup`.
8. `height` → `minHeight` + padding sur `Button` et `GoogleButton` (`ControlHeight.button`, A10-22).

**Fait quand.** Un passage TalkBack sur onboarding, questionnaire, plan (engagement) et retour
est consigné en §8 de ce document.

### C1.10 — Textes légaux et pages publiques exigées par Play

**Priorité** P1 · **Effort** petit · **Constats** A6-2, A12-8, A6-3, A12-9, A9-6, A6-4, A11-12, A12-16, A5-18, A6-18, A9-22, A12-4 (partie suppression.tsx).

**Pourquoi.** La page publique de suppression (exigée par Play) et la politique de
confidentialité renvoient vers « Mon suivi › Mes données », écran qui n'existe plus depuis
v1-11 (quatre occurrences). La durée de conservation dit « 90 jours après sa création » alors que
la purge porte sur l'inactivité. Le jeton est dit disparaître à la désinstallation (faux). La
date de mise à jour n'a pas bougé après l'ajout de deux sous-traitants. Les garanties de transfert
d'Expo sont affirmées sans trace de vérification (`v1-12` §6.5 le demandait). Sur Android,
l'export part en **texte de message** et « Export généré » s'affiche même sur annulation.

**Fichiers.** `src/app/compte/suppression.tsx:147-148, 168` ; `src/app/confidentialite.tsx:14, 24,
88, 140-142, 165, 196, 200-204, 237, 257, 285` ; `src/app/conditions.tsx:79` ;
`src/components/compte/mon-compte.tsx:13, 35, 57-60` ; `src/lib/compte.ts:28-30, 43-49`.

**À faire.**
1. Les quatre renvois : « touche l'icône de compte en haut à droite, écran « Toi », section « Mes
   données » ». Corriger le commentaire d'en-tête de `mon-compte.tsx`.
2. Conservation : « supprimée automatiquement après 90 jours sans utilisation de l'application.
   Tant que tu reviens, rien n'est effacé. » aux trois emplacements ; commentaire d'en-tête l.14.
3. Jeton : la formulation vraie (C0.6). Sous-traitants : `UPDATED_AT` au 9 septembre 2026 sur
   `/confidentialite` seulement (`/conditions` n'a pas bougé).
4. Transfert Expo : vérifier le DPA, consigner version et date dans `v1-12` §6.5 ; sinon s'en tenir
   au fait (« serveurs situés aux États-Unis »). Même passe sur Google, Resend, Vercel.
5. Canal de retour : aligner la finalité sur l'écran de succès (« pour rapprocher ton retour de
   ce que tu vois »), y compris `confidentialite.tsx:88`.
6. Export natif : écrire le JSON dans un fichier et le partager en `url` (`expo-file-system` +
   `expo-sharing` — dépendance native, donc build EAS, décision à noter ; rouvre le commentaire
   de `compte.ts:28-30`) ; sur Android `Share.share` rend toujours `sharedAction`, donc le message
   de succès doit devenir neutre (« La feuille de partage s'est ouverte ») ou disparaître.
7. `suppression.tsx:168` : « Tu es connecté à ton compte. » → forme sans accord (« Ce navigateur est
   connecté à ton compte. »).

**Fait quand.** Un examinateur Play qui suit les instructions de la page publique trouve le
chemin ; chaque affirmation de `/confidentialite` correspond à une colonne, une fonction ou un
document daté.

### C1.11 — Web : mode sombre, `api/` en CI, indexation, partage

**Priorité** P1 · **Effort** petit · **Constats** A10-1, A10-20, A3-11, A10-2, A10-16, A1-14, A10-18, A3-8, A3-18, A10-4, C-12, A10-14, A10-15, A10-11, A10-23, A10-6, A10-13, A10-12.

**Pourquoi.** `userInterfaceStyle: light` ne s'applique qu'au natif : sur web, un visiteur en
sombre reçoit `Colors.dark`, palette « provisoire, non validée », bouton principal à 3,4:1, flash
clair → sombre à l'hydratation. `api/*.ts` n'est typechecké nulle part. Aucun `robots.txt`,
aucune description, aucun Open Graph sur les 20 pages ; `/api/partage` est indexable et `total`
n'est pas borné (une carte à « −5,0 t » sous la marque). Aucun en-tête de sécurité HTTP. Sur un
clone neuf, `npx tsc --noEmit` échoue sans `expo-env.d.ts`. Cinq dépendances déclarées et jamais
importées, dont des modules natifs. `npm run reset-project` efface `src/` et `scripts/`.

**Fichiers.** `src/hooks/use-theme.ts:11` ; `src/hooks/use-color-scheme.web.ts:18-24` ; `src/app/_layout.tsx:100` ;
`.github/workflows/ci.yml` ; `package.json` ; `api/partage.ts:36-59, 112` ; `api/share-card.ts:103, 154` ;
`vercel.json` ; `public/` ; `src/components/titre-de-page.tsx:30` ; `src/constants/page-titles.ts` ;
`scripts/verifier-titres-export.mjs:41` ; `scripts/verifier-rendu-export.mjs:11-44`.

**À faire.**
1. `useTheme` : liste blanche `scheme === 'dark' ? 'dark' : 'light'` **et** clair forcé sur web tant
   que la palette sombre n'est pas validée (`Platform.OS === 'web'` → `light`), en cohérence avec
   le `DarkTheme` de react-navigation dans `_layout.tsx:100` et `color-scheme: light` dans
   `global.css`. Décision inverse possible plus tard : valider la palette et corriger le contraste.
2. CI : `npx tsc -p api/tsconfig.json` (script `typecheck:api`) ; s'attendre à un échec initial sur
   `api/share-card.ts` (JSX pour satori sans React typé côté `api/`) et le corriger.
   `postinstall` idempotent qui crée `expo-env.d.ts` s'il manque. `npx expo-doctor` en CI.
   `engines` et `.nvmrc` sur Node 22, `@types/node` sur la ligne 22.
3. `public/robots.txt` : interdire `/_sitemap`, `/status`, `/(tabs)/`, `/api/` ; `sitemap.xml`
   minimal (`/`, `/onboarding`, `/confidentialite`, `/conditions`, `/compte/suppression`).
   `<meta name="robots" content="noindex">` + `X-Robots-Tag` sur `/api/partage`. Garde d'export
   sur la présence de `robots.txt`.
4. `PAGE_TITLES` → `{ titre, description }`, `TitreDePage` pose `description` et Open Graph par
   défaut ; `verifier-titres-export.mjs` exige une description **et** refuse un titre égal au nom
   du produit hors racine.
5. Borner `total` (0 à ~200 t) dans les deux endpoints, repli statique, `try/catch` autour de `GET`.
6. `vercel.json` : section `headers` (`X-Content-Type-Options: nosniff`, `Referrer-Policy`,
   `X-Frame-Options: DENY`, `Permissions-Policy`), CSP en `report-only` d'abord (scripts inline
   d'Expo, polices Google). Vérifier après export que `cleanUrls` et les Functions tiennent.
7. Retirer `@expo/ui`, `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-status-bar` puis un
   build EAS de vérification. Supprimer `scripts/reset-project.js` et sa ligne.
8. `verifier-rendu-export.mjs` : ajouter `/plan`, `/suivi`, `/suivi/bilan`, `/bilan`, `/compte`,
   `/feedback` avec attente conditionnelle plutôt que 6 s fixes.

### C1.12 — La réponse au check-in passe par un RPC

**Priorité** P1 · **Effort** petit · **Arbitrage** D9 · **Constats** A8-7, A4-13, A4-14, A8-20, A9-15, A9-23, A9-3.

**Pourquoi.** `engagement_checkins answer own` est une policy UPDATE sans restriction de colonne
et `responded_at` vient de l'horloge du téléphone : le raisonnement qui a fait choisir un RPC pour
`plan_actions` (« la RLS filtre des lignes, jamais des colonnes ») et un trigger pour
`usage_events.occurred_at` n'a pas été appliqué ici. Une ligne `pending` peut voir `trip_label`
(snapshot), `period_start` (clé d'idempotence de la génération) ou `status` réécrits.

**Fichiers.** `supabase/migrations/20260827090000_engagement_checkins.sql:280-284` ;
`src/components/checkin-card.tsx:36-45` ; `20260905190000_engagement_action.sql:58, 115` ; test 03, 13.

**À faire.**
1. RPC `answer_checkin(p_checkin_id uuid, p_response boolean)` en `security definer`, `search_path`
   fixé, propriété vérifiée, pose `status`, `response`, `responded_at := now()`, rend le nombre de
   lignes touchées et lève sur zéro. `revoke execute … from public, anon, authenticated` puis
   `grant … to authenticated`. Retirer la policy UPDATE.
2. `commit_plan_action` vérifie que la forme d'intention correspond au `poste` du template ;
   `clear_plan_action_commitment` lève sur zéro ligne.
3. Révoquer `execute` de `public` sur `enforce_feedback_rate_limit` **et**
   `prevent_answered_checkin_update` (même ACL ouverte).
4. `push_tokens` : policies avec `(select auth.uid())` ; borner les jetons actifs par utilisateur
   (cinq, désactiver le plus ancien) et vérifier le format `ExponentPushToken[...]`.
5. Ajouter la ligne au tableau des advisors de `v1-07` §5 (A11-11) et corriger la mention du
   mot de passe qui n'existe plus.

**Tests.** Test 03 : un `update` direct sur `trip_label` reste sans effet ; test 13 : intention
incohérente refusée ; test 17 : quota de jetons.

### C1.13 — CLAUDE.md et documents : la carte redevient juste

**Priorité** P1 · **Effort** petit · **Dépend de** C0.7 · **Constats** A11-9, A11-8, A11-13, A11-14, A11-15, A11-16, A11-18, A11-19, A7-15, A8-16, A8-18.

**À faire.**
1. CLAUDE.md § Routing réécrit autour de la barre à deux onglets ; les cinq renvois à
   `bilan/resultat.tsx` (dont l.105) pointent `src/app/(tabs)/suivi/bilan.tsx`, avec la mention de
   la redirection conservée pour les liens partagés. Garder intacts les faits datés (l.95, l.137).
2. Justification de la séparation `src/types` / `src/lib` : le mandataire lève à l'usage ; la vraie
   raison est l'import de React Native et AsyncStorage dans une suite de logique pure.
3. « Trois points à vérifier sur appareil » : ne garder que TalkBack et le placement de la carte
   d'attente ; distinguer lien de **rappel** (vérifié) et lien de **connexion** (jamais exercé).
4. Inventaire des tests : remplacer l'énumération par la règle et le renvoi au répertoire, dans
   CLAUDE.md et le README ; ordre des cinq briques de la spec §11.
5. Bandeau de supersession en tête de `v1-03` (§3, §5-6 remplacés par `v1-07` §3.3 et les migrations
   `20260905130000` / `20260905190000` ; §2 reste). Étendre le bandeau de `v1-01` au §5. Note en
   tête de `v1-08` §3 renvoyant `src/types/analytics.ts` ; corriger le commentaire de
   `etape-transition.tsx:58`.
6. Une migration d'une ligne : `update emission_factor_sources set note = …` sur `deux_roues_motorise`
   (repli des bilans antérieurs au 05/09, pas un choix de représentativité) et sur le VAE (0,010950,
   plus 0,0022).
7. Consigner la dormance de `cadence_type = 'rolling_quarter'` (ou l'ouvrir dans « Toi ») ; retirer
   de la contrainte `detail_kind` les trois valeurs inatteignables ou les faire passer par le `case`.

## 5. Lot 2 — La boucle d'engagement

C'est le lot qui fait exister la durée. Les cinq coupures identifiées (§0.2) se traitent dans
l'ordre : d'abord ce que le check-in **dit** et **mesure** (C2.1, C2.3, C2.4, C2.5, C2.6), ensuite
ce qui **survit** (C2.2), puis ce qui **se voit** (C2.7, C2.8), enfin ce qui **part** (C2.9, C2.10, C2.11), ce qui **répond** (C2.12), ce qui **se voit sans
un chiffre** (C2.13), et le socle que trois d'entre eux partagent (C2.14). **Le canvas v1-14 est
livré** : chaque chantier ci-dessous porte un paragraphe *Design (canvas v1-14)* qui dit la
planche, la section de `v1-14-boucle-engagement.md` et ce que le canvas a fixé. L'ordre est en §2.3.

### C2.1 — Le check-in connaît l'action engagée

**Priorité** P2 · **Effort** moyen · **Dépend de** C1.12, C2.6 · **Arbitrage** D1 · **Constats** A8-10, A13-2, A4-3, A12-10.

**Pourquoi.** La personne s'engage sur « Faire un trajet sur cinq à vélo, le mardi et le
jeudi ». La question du lundi est « As-tu changé de mode de transport au moins une fois cette
semaine pour Trajet domicile-travail (Voiture thermique) ? » — dans la carte, l'email et la
notification. `generate_commute_checkins` ne lit que `commute_poste_label` ; `intention_days`,
`action_text` ne sont lus côté serveur que par l'export. Le « si-alors » est posé, jamais refermé.
Pour le poste voyages, « changer de mode » est hors sujet quand l'action est de renoncer à un vol.

**Fichiers.** `supabase/migrations/20260904200000_checkin_email_reminders.sql:111-160`
(dernières définitions des deux générateurs) ; `20260907230000_rappels_canal.sql:186-238`
(`enqueue_checkin_reminders`, la question à la ligne ~229) ; `src/components/checkin-card.tsx:53-57, 68, 75` ;
`src/types/plan.ts` (`formatIntention`).

**À faire.**
1. Migration : colonnes `committed_action_text text`, `committed_intention_days smallint[]`,
   `committed_intention_timing text` sur `engagement_checkins`, **figées à la génération**
   (jointure sur le `plan_actions` engagé du cycle courant de la personne, même `loop_type`
   pertinent : `commute` pour le poste domicile-travail, `extras` pour loisirs/voyages), jamais
   relues à la volée — un changement d'engagement en cours de semaine ne réécrit pas une question
   déjà posée (c'est la raison d'être de `trip_label`).
2. Une **source unique** de formulation de la question, écrite deux fois et épinglée des deux
   côtés comme `reminder_channel_for` : une fonction SQL `checkin_question(loop_type, trip_label,
   committed_*)` utilisée par `enqueue_checkin_reminders`, et son jumeau pur dans
   `src/types/checkin.ts` (nouveau module, sans import de `@/lib/supabase` ni de
   `checkin-card.tsx`) utilisé par la carte, testés sur les mêmes cas.
3. Formulations, avec engagement : « Mardi ou jeudi, as-tu fait ce trajet à vélo ? » (jours +
   action, forme insérable de C2.6) ; sans engagement : la question générique actuelle sur la
   forme insérable. Pour une action `remove_trip` voyages : une question d'occasion (« Ce mois-ci,
   as-tu eu un déplacement où tu as choisi autre chose que l'avion ? ») — à valider avec le
   titulaire, c'est de la copie de brique 4.
4. La réponse reste binaire (C2.4 ajoute l'état neutre), aucun décompte, aucun « tenu / pas tenu ».
5. Notification : le sujet en tête du corps (A12-21) : « Ton trajet domicile-travail : mardi ou
   jeudi, l'as-tu fait à vélo ? ».

**Design (canvas v1-14).** Planches A1, A2a, A2b, A3 (`captures/A1-point-avec-engagement.png`
et suivantes) ; `v1-14` §3.2 pour la copie exacte, §4.2 pour la base, §5 pour `CheckinCard`. Ce que
le canvas fixe : un `question_kind` figé à la génération (`engagement` / `generique` / `maintien` /
`occasion`), un `question_template` par gabarit d'action (« {jours}, as-tu fait ce trajet à
vélo ? ») composé par `checkin_question` en SQL et son jumeau `src/types/checkin.ts` ; en-tête
« Point de la semaine · lundi 14 sept. » ; la question d'occasion des voyages nomme le mois écoulé
(« En septembre, … ») ; la notification met le sujet en tête. C2.1 pose la structure de la carte
(question, `question_kind`, deux boutons avec `accessibilityHint`) ; C2.4, C2.10 et C2.12 la
complètent **dans cet ordre**, même fichier.

**Ne pas faire.** Indexer la **génération** de la boucle sur l'engagement (la boucle existe avec ou
sans engagement, `v1-12` §3). Nommer les jours de façon qui se lise « tu devais ».

**Tests.** pgTAP : snapshot pris à la génération ; changer l'engagement après ne change pas la
question ; test 17 mis à jour (assertion l.99). Jest : `checkin.test.ts` sur la table de cas
partagée avec le SQL.

**Fait quand.** Un engagement pris le mardi produit, le lundi suivant, une question qui le nomme
dans la carte, l'email et le push ; sans engagement, la question générique.

### C2.2 — L'engagement survit au re-bilan et au changement de saison

**Priorité** P2 · **Effort** moyen · **Constats** A8-1, A13-5, A4-9, A8-2, A4-20, A8-9 (partie données).

**Pourquoi.** `generate_plan_cycle_for_user` reconstruit le cycle dès qu'un bilan plus récent
existe et fait `delete from plan_actions where plan_cycle_id = …` : `committed_at`,
`intention_days`, `intention_timing` — le seul choix personnel posé dans le produit — sont
détruits, sans archive, sans un mot. Refaire son bilan est encouragé à trois endroits, y compris
pour corriger une réponse. Au changement de saison, un cycle neuf remplace l'ancien à l'écran ;
personne ne relit jamais un cycle passé. La garde d'idempotence compare un horodatage serveur à un
`submitted_at` fourni par le client.

**Fichiers.** `supabase/migrations/20260905130000_actions_chiffrees.sql:650-735` ; `src/app/(tabs)/plan.tsx:178-188` ;
`src/app/bilan/index.tsx:138`.

**À faire.**
1. Avant le `delete`, mémoriser l'engagement (`action_template_id`, `committed_at`, intention) ;
   après réinsertion, le reposer sur la ligne portant le même `action_template_id` si elle existe
   encore. Sinon, l'archiver : table `plan_action_commitments_archive` (cycle, template, texte
   figé, intention, `committed_at`, `released_at`, `released_reason` ∈ {`rebilan`, `saison`,
   `changement`}) ou colonnes équivalentes conservées. Le RPC `clear_plan_action_commitment`
   archive aussi (`changement`).
2. Au changement de saison (nouveau cycle) : reporter l'engagement du cycle précédent sur le
   nouveau si le même template y figure, en le marquant `reconduit` (la personne le voit et peut
   « Changer d'avis » comme d'habitude, C2.8 en fait un moment).
3. Une fois, sur le plan, quand un engagement n'a pas pu être reporté après re-bilan : « Ton
   nouveau bilan a changé ton plan ; ton engagement précédent est gardé dans ton suivi. »
4. Trigger `before insert or update` sur `assessments` : `submitted_at := now()` quand `status`
   passe à `completed` (même motif que `stamp_usage_event_time`) ; `nulls last` sur les
   `order by submitted_at desc` des générateurs.
5. Plan : sélectionner `period_end` et, si le cycle affiché est périmé, le dire en bandeau sans
   masquer l'action engagée (ne pas retomber sur `pending`).

**Design (canvas v1-14).** Planches B2 et B3 ; `v1-14` §4.3 pour l'archive et la reconduction,
§5 pour `ActionCard`. Ce que le canvas fixe : l'étiquette devient « TON ENGAGEMENT » (C3.10 ne le
refait pas) et porte le suffixe « · RECONDUIT » quand `plan_actions.carried_over_from` est posé ;
après « Choisir une autre », l'ancienne action reste en bas du plan, estompée (opacité 0,72),
sur-titre « Cet automne », « Reste dans ton suivi, le mardi et le jeudi. » ; l'engagement orphelin
après re-bilan se dit une fois, dans un encart discret : « Ton plan a changé avec ton nouveau
bilan. L'action que tu suivais n'y est plus ; elle reste dans ton suivi. » + « Compris ».
`commit_plan_action` gagne `p_replace` (C4.6 s'en sert).

**Tests.** pgTAP : s'engager, resoumettre un bilan le même jour, l'engagement est conservé ;
changer de saison, l'engagement est reconduit ; template disparu → archive.

**Fait quand.** Aucun chemin du produit ne détruit un engagement sans en laisser une trace lisible.

### C2.3 — Le check-in interroge la période écoulée

**Priorité** P2 · **Effort** moyen · **Arbitrage** D2 · **Constats** A13-1, A5-11, A8-17.

**Pourquoi.** La boucle hebdo est générée le lundi 6 h UTC pour la semaine qui commence, le push
part à `now()`, et la question dit « cette semaine » : au moment du rappel, aucun trajet n'a eu
lieu. Idem « ce mois-ci » le 1er. Le libellé hebdomadaire n'a pas d'année.

**Fichiers.** `supabase/migrations/20260904200000_checkin_email_reminders.sql:117, 139-146` ;
`20260907230000_rappels_canal.sql:223-233` ; `src/app/(tabs)/suivi/index.tsx:266` ; tests 04, 08, 09, 17.

**À faire.**
1. `period_start` = lundi précédent (resp. mois précédent) ; libellé « Semaine du 31/08 » ; question
   « la semaine dernière » / « le mois dernier » (dans la source unique de C2.1). Le cron et le
   `send_after` ne bougent pas.
2. Sur l'écran, ajouter l'année aux libellés hebdomadaires des années passées à partir de
   `periodStart` (ne pas réécrire les libellés snapshotés).
3. Mettre à jour les assertions des tests qui épinglent « cette semaine » et « Semaine du ».

**Design (canvas v1-14).** Planches A2a et A2b. Le passé : « La semaine dernière, as-tu changé
de mode de transport pour ton trajet domicile-travail ? » ; la boucle mensuelle **nomme le mois
écoulé** (« En septembre, … », troisième réponse « Pas de voyage en septembre »), correction du
canvas qui écrivait « Ce mois-ci » (`v1-14` §10). Le libellé de période à l'écran : « Point de la
semaine · lundi 14 sept. » / « Point du mois · septembre ».

**Ne pas faire.** Déplacer l'envoi (v1-12 §2.8 reste).

### C2.4 — Une réponse neutre : « pas de trajet cette période »

**Priorité** P2 · **Effort** moyen · **Dépend de** C1.12 · **Arbitrage** D3 · **Constats** A13-8, A4-12.

**Pourquoi.** Une semaine de congés ou un mois sans voyage n'ont pas de réponse honnête :
« Non » déclenche la consolation et s'inscrit en « Non » ; ne rien répondre laisse expirer. Pour
un profil « deux vols par an », dix mois sur douze deviennent une suite de « Non » — l'expérience
de série cassée que le produit refuse.

**À faire.**
1. Un troisième état **explicite** : `response_kind text check in ('oui', 'non', 'sans_objet')`
   (ou `status = 'not_applicable'`), `response` maintenue en dérivée pour l'historique et les vues.
   Ne pas utiliser `response = null` : `loadAnsweredCheckins` l'écarte et la personne ne verrait
   rien apparaître.
2. Le RPC de C1.12 accepte les trois valeurs. La carte offre le troisième choix, discret (« Pas de
   trajet cette semaine » / « Pas de voyage ce mois-ci »).
3. Ramille répond une phrase d'attente, pas une relance : nouvelle entrée `RAMILLE.checkinSansObjet`
   (« D'accord, on verra au prochain point. »), testée par le garde de `mascotte.test.ts`.
4. Le suivi compte cette réponse dans « N points de suivi » et l'affiche comme « Pas de trajet »
   (C2.7 revoit la colonne).
5. Le renforcement après réponse persiste le temps de la période : relire aussi les points
   `answered` de la période courante et rendre une carte « répondue » (ligne de Ramille + période)
   à la place de la question, sans compteur.

**Design (canvas v1-14).** Planches A1, A3 ; `v1-14` §4.1 et §5. La troisième réponse est un
`TextLink` `small` `textTertiaire` centré sous les deux boutons, cible 44 : « Pas de trajet cette
semaine » / « Pas de voyage en septembre ». Ramille répond une attente (`checkinSansObjet`, deux
variantes par boucle, `v1-14` §3.1), visage `calm`. **Précision sur le schéma** : `response_kind`
est la vérité, `response` est dérivée (`true` / `false` / `null` pour sans objet), et tout ce qui
lit les points répondus filtre sur `status = 'answered'` — c'est le filtre qu'il faut changer, pas
la valeur. La carte répondue **reste jusqu'au prochain point** avec le retour de Ramille et le pied
« Répondu lundi. Prochain point : lundi 21 sept. » (small tertiaire) ; fond `backgroundElement`
une fois répondue.

**Tests.** pgTAP : les trois valeurs ; `analytics.engagement_by_segment` inchangée pour `oui`/`non`.
Jest : `suivi.test.ts` sur le comptage.

### C2.5 — Qui reçoit quelle boucle : vélo, piétons, loisirs rares

**Priorité** P2 · **Effort** moyen · **Arbitrage** D5 · **Constats** A13-3, A13-4, A8-12, A7-13, A7-3.

**Pourquoi.** La boucle hebdo interroge chaque lundi les personnes qui vont déjà au travail à
vélo ou à pied : la seule réponse honnête est « Non », suivie d'une consolation d'échec, 52 fois
par an, juste sous « Tu fais déjà l'essentiel ». Les loisirs « rarement » reçoivent un mode
« Voiture » inventé qui devient le libellé de la question mensuelle (« pour Loisirs du week-end
(Voiture) ») et alimente des actions du plan (« Faire une sortie sur trois à vélo » sur des sorties
hypothétiques) ; comme `extras_poste_label` est calculé sans condition, la boucle mensuelle est
générée pour **tout** bilan, profil sédentaire compris. Un bilan à zéro produit « Trajet
domicile-travail () ».

**Fichiers.** `supabase/migrations/20260905130000_actions_chiffrees.sql:203, 295-296, 305-309, 344-359, 365-371, 393-397, 519-529, 562-572` ;
`20260904200000_checkin_email_reminders.sql:128, 157` ; `src/constants/mascotte.ts:44`.

**À faire.**
1. Boucle hebdo : quand le mode principal est de catégorie vélo/marche (ou
   `commute_main_leg_co2_kg_year = 0`), soit ne pas générer, soit poser une question de maintien
   affirmative (« Es-tu allé au travail à vélo cette semaine ? ») dont le « Oui » renforce et dont
   le « Non » reçoit une phrase neutre, jamais `checkinNon`. Recommandation : la question de
   maintien, qui renforce l'identité ; à valider avec le titulaire.
2. Loisirs rares : libellé « Loisirs du week-end (occasionnels) » sans mode ; `continue` sur les
   templates `leisure` dans `estimate_action_savings` quand `leisure_frequency = 'rarely'` ; ne
   générer la boucle `extras` que si le poste extras a une base déclarée (vols ou longs trajets
   > 0, ou loisirs non rares). Le calcul résiduel (15 km voiture) reste (D5) ; si
   `household_vehicles = '0'`, retomber sur les transports en commun pour le résiduel (A7-13).
3. Bilan à zéro : poste dominant = celui où quelque chose est déclaré, jamais de parenthèse vide.

**Design (canvas v1-14).** Planche A2a. **La question de maintien est retenue** (le canvas a
tranché la question ouverte du brief) : « La semaine dernière, ton trajet s'est-il fait à vélo ? »
(« … à pied ? » pour la marche), `question_kind = 'maintien'`. Son « Oui » reçoit `checkinOui` ; son
« Non » reçoit `maintienNon.velo` / `maintienNon.marche` — « Noté. Le vélo reste ton trajet ; une
semaine autrement n'y change rien. » — visage `calm`, jamais `checkinNon`. L'alternative « pas de
point » est écartée (page Écarts).

**Tests.** pgTAP : cycliste → pas de point hebdo (ou point de maintien) ; sédentaire → pas de
point mensuel ; loisirs rares → aucune action `leisure` ; scénario total nul. Recalculer par
requête toutes les assertions chiffrées touchées.

### C2.6 — Une forme insérable du poste dans toutes les phrases

**Priorité** P2 · **Effort** petit · **Constats** A12-1, A4-10, A12-14, A12-21, A12-19, A12-11.

**Pourquoi.** « Trajet domicile-travail (Voiture thermique) » est collé après une préposition
dans la question du check-in, l'email, le push, le sous-titre du plan (« Une action liée à … »,
« Rien à alléger sur … ») et le cap (« soit − 20 % de trajet domicile-travail (voiture seul) »).
Les maquettes écrivent « pour tes trajets domicile-travail ». Le même poste porte trois noms selon
l'écran ; le détail des actions compte des jours et les appelle des trajets.

**À faire.**
1. Dérivation pure `formeInserable(poste, loopType)` dans `src/types/plan.ts` : « ton trajet
   domicile-travail », « tes sorties du week-end », « tes voyages » ; côté SQL, la même table dans
   une fonction `poste_insérable(poste)` utilisée par `enqueue_checkin_reminders` et par C2.1.
   Le libellé long reste en titre de carte.
2. Plan : « Une action pour ton trajet domicile-travail. » ; quand `actionsCount === 0`, **ne rien
   afficher** à cet endroit (la carte de félicitation dit tout). Cap : « soit − 20 % sur ton trajet
   domicile-travail ».
3. `accessibilityHint` de la carte de check-in sur la forme insérable.
4. Un libellé unique par poste (« Loisirs du week-end », « Trajet domicile-travail », « Voyages
   longue distance ») dans une constante partagée, descendu dans l'onboarding et l'en-tête du
   questionnaire ; consigner l'écart au handoff (« Weekend et loisirs »).
5. Détail des actions : « Sur tes 5 jours de trajet par semaine. » ; relire les libellés « un trajet
   sur cinq » qui désignent en réalité un jour sur cinq.

**Design (canvas v1-14).** Toutes les planches utilisent la forme insérable (« ton trajet
domicile-travail », « tes sorties du week-end », « tes voyages ») et l'intro du plan « Deux actions,
sur d'autres postes que ton trajet domicile-travail. » (F2). L'en-tête du questionnaire dit
« Loisirs du week-end », pas « Weekend et loisirs » (planche G, corrigée — `v1-14` §10). Petit et
partagé : **à livrer en premier dans la vague 4**, avec C2.14.

**Tests.** `plan.test.ts` : la table des formes.

### C2.7 — Le renforcement : baisse, bilan précédent, postes, engagements passés

**Priorité** P2 · **Effort** moyen · **Dépend de** C1.7, C2.2 · **Constats** A12-2, A12-3, A13-10, A5-4, A5-19, A8-9, A5-7, A5-9, A12-13, A5-8, A12-12, A13-16, A5-10, A5-14, A5-12, A5-20.

**Pourquoi.** Une hausse reçoit « Une année n'est pas l'autre », une baisse un pourcentage sec. La
restitution d'un re-bilan est identique à celle du premier et ne montre pas le bilan précédent :
le seul écran atteint en sortant du questionnaire ne répond pas à « est-ce que ça a bougé ? ».
Le suivi ne montre que le total (un effort sur le trajet quotidien disparaît derrière un vol), ne
lit jamais `plan_cycles`/`plan_actions` (aucune trace des engagements), tronque la liste à huit
en silence sous un compteur global, affirme « Tu réponds régulièrement » dès le premier point,
et pose une mascotte souriante — absente du canvas — au-dessus d'une colonne de « Non ».

**Fichiers.** `src/types/suivi.ts:31-68` ; `src/app/(tabs)/suivi/index.tsx:126-290` ; `src/lib/bilan-history.ts:20-57` ;
`src/app/(tabs)/suivi/bilan.tsx:380-425` ; `src/constants/mascotte.ts`.

**À faire.**
1. `variationNote` : branche de baisse avec reconnaissance (« X % de moins que ton bilan
   précédent. Ce que tu as changé se voit ici. ») ; une ligne de Ramille dédiée, **sans accord de
   participe et sans chiffre** (« Je vois la différence. »), rendue par `RamilleDit` à côté de la
   carte d'historique mais jamais collée au total.
2. Restitution en mode `nouveau` avec un prédécesseur (choisi par `submitted_at` strictement
   antérieur, pas après `keepLatestPerDay`) : une barre « Ton bilan précédent » au-dessus de
   « Moyenne en France » (vérifier `barPercent` et l'échelle), et la phrase de variation sous les
   barres. Dire aussi si le palier visé au cycle précédent est derrière (« Le palier que tu visais
   est derrière toi. ») sans jamais compter les paliers restants.
3. Suivi : charger `commute_co2_kg_year`, `leisure_co2_kg_year`, `travel_co2_kg_year` (non
   nullables) dans `AssessmentSnapshot` ; afficher l'écart par poste, factuel, sans hiérarchie
   morale ; attention, le poste dominant peut changer (c'est une réussite), comparer poste à poste.
4. Suivi : une lecture des cycles passés portant un engagement (`plan_cycles` + `plan_actions`
   + archive de C2.2) : une ligne par saison — période, action, `formatIntention` — « ce que tu as
   décidé, saison après saison », **jamais** un statut tenu / pas tenu ni un chiffre présenté comme
   résultat obtenu.
5. Liste des points : bornée et paginée (« Voir tout »), ou regroupée par saison ; l'en-tête et la
   liste doivent compter la même chose. Libellés « Changement fait » / « Pas cette fois » /
   « Pas de trajet » au même niveau typographique ; retirer la mascotte de cette carte (retour au
   canvas) ou la passer en `calm`. Phrases : distinguer un point de plusieurs, sans « régulièrement »
   ni « c'est déjà ça ».
6. Une phrase d'attribution, voix produit, sous le compteur : « Ces fois-là, c'est toi qui as choisi
   le trajet. »
7. `keepLatestPerDay` en date locale ; `doitProposerUnRebilan(submittedAt | null)` exposé et testé
   aux bornes, utilisé par les deux écrans ; une phrase d'horizon 2050 en mots quand
   `showsTarget2050`.

**Design (canvas v1-14).** Planches D1, D2, E ; `v1-14` §3.2 (copie), §4.5 (lectures), §5
(`EcartParPoste`, `BarreContour`). Ce que le canvas fixe : en tête du suivi, « Bilan du 10 sept.
2026 » / « précédent : 12 mars », le total en `salient`, la baisse reconnue en voix produit ;
`EcartParPoste` (par poste, « 2,1 t → 1,7 t », barre-contour du bilan précédent, barre pleine du
bilan courant en `accent` pour le poste dominant, `accentMuted` sinon, légende) ; « Ce que tu as
décidé, saison après saison » (une ligne par saison, période à gauche, action · jours à droite,
séparateur `border`) ; « Tes points » groupés par saison avec « Voir tout », trois libellés au même
niveau (« Changement fait » / « Pas cette fois » / « Pas de trajet »), « Ces fois-là, c'est toi qui
as choisi le trajet. », `RamilleDit` **`calm` 36 en bas** (« Je vois la différence. ») et la mascotte
`happy` **retirée** du sommet ; sur la restitution, `BarreContour` « Ton bilan précédent · mars »
au-dessus des deux barres, variation sous les barres, « Le palier que tu visais est derrière toi. »
quand c'est vrai. C2.7 est propriétaire de `EcartParPoste` et `BarreContour` ; C3.1 (mobilité
contrainte) passe après lui dans `suivi/bilan.tsx`.

**Tests.** `suivi.test.ts` : variation en baisse, écart par poste, date locale,
seuil de re-bilan. `mascotte.test.ts` absorbe la nouvelle réplique.

### C2.8 — La saison a une fin et un début

**Priorité** P2 · **Effort** moyen · **Dépend de** C2.2 · **Constats** A8-8, A13-6, A4-17, A5-13, A11-17, A13-13, A8-6 (contexte).

**Pourquoi.** `period_end` est écrit à chaque génération et lu par aucun écran ni aucune décision
produit. Le cap est annoncé puis abandonné ; à la bascule, le cycle suivant se crée dans la nuit ;
la carte « Une nouvelle saison a commencé » se déclenche sur 182 jours d'ancienneté du bilan et
peut coexister avec « Cadence : Été 2026 ». L'effet « nouveau départ » est perdu quatre fois par an.

**À faire.**
1. Plan : afficher la fin de période sur la carte du cap (« jusqu'au 30 novembre »).
2. Pendant les deux premières semaines d'un cycle (dérivé de `period_start`), une carte
   d'ouverture, voix produit : « L'automne commence. Cet été : N points répondus, M fois où tu as
   changé quelque chose. » (jamais les points manqués), puis « Reprendre la même action » (déjà
   reconduite par C2.2) ou « Choisir une autre ». Ramille : « On repart pour une saison. » (sans
   chiffre, nouvelle entrée testée).
3. La carte de re-bilan : titre sur le fait (« Ton bilan a six mois ») et « Ton bilan date de
   {n} mois » comme `v1-11` §3.4 le prescrivait ; réserver la formulation saisonnière à la carte
   d'ouverture. Dérivation dans `src/types/suivi.ts`.
4. Consigner dans ce document l'écart au libellé de `v1-11` §3.4.

**Design (canvas v1-14).** Planches B1, B2, B3 ; `v1-14` §3.2 (copie), §4.5 (état local,
récapitulatif), §5 (`CarteDeSaison`, `TraitDeTemps`). Ce que le canvas fixe : la carte du cap dit
« Ton cap pour cette saison », « Automne 2026 » à gauche, « jusqu'au 30 novembre » à droite (small
600 `accentText`), un trait de temps 6 px en `accentMuted` — **jamais en accent, il mesure la
saison, pas la personne** — et la légende « La saison avance ; le trait mesure le temps, pas toi. » ;
`CarteDeSaison` (bordure `border`, fond `backgroundTinted`, étiquette « NOUVELLE SAISON », titre
« L'hiver commence. », corps « Cet automne : 11 points répondus, 8 fois où tu as changé quelque
chose sur ton trajet. », « Reprendre la même action » / « Choisir une autre ») à la place du point
pendant les deux premières semaines, marque « vue » locale à l'appareil par cycle, entrée
`translateY` 16 → 0 en 320 ms ; **Ramille dessous, hors du cadre**, 44 px `happy` tilt −5,
« On repart pour une saison. » ; en cadence de repli « NOUVELLE PÉRIODE » / « Une nouvelle période
commence. » / « Ces trois mois : … » ; si la saison bascule pendant que le plan est ouvert, le
bandeau « L'hiver a commencé pendant que tu étais là. » + « Voir la saison », jamais une carte
remplacée sous les yeux ; la carte de re-bilan « Ton bilan a six mois. Le refaire prend quelques
minutes ; ton plan s'ajuste. ». « Reprendre » pose la marque « vue » (l'action est déjà reconduite
par C2.2) ; « Choisir une autre » déplie les pistes (C4.6) et garde l'ancienne action en mémoire.
Consomme `saisonDe` et `recapDeSaison` (C2.14).

**L'écart au libellé de `v1-11` §3.4, consigné (point 4).** Ce paragraphe-là prescrivait, pour la
carte de re-bilan du plan, « Une nouvelle saison a commencé. Ton bilan date de {n} mois. » sur un
fond `backgroundSelected`. Livré en `v1-11`, il l'a été à moitié : la phrase saisonnière est restée,
le nombre de mois a disparu (« Ton bilan date d'un moment »). Les deux moitiés étaient fautives, et
pour deux raisons différentes.

La formulation saisonnière, d'abord, **n'était pas vraie au moment où elle s'affichait** : la carte
se déclenche sur 182 jours d'ancienneté du bilan, pas sur une bascule de saison. Un bilan du 10 mars
la fait apparaître le 8 septembre, une semaine après le début de l'automne mais aussi bien le
15 juillet pour un bilan du 14 janvier — en plein été. Elle pouvait de surcroît coexister avec la
puce « Cadence : Été 2026 » posée quelques lignes plus haut, ce qui est le constat A13-13. Cette
formulation appartient donc à la carte d'**ouverture**, qui se déclenche sur `period_start` et ne
peut pas se tromper.

Le nombre de mois, ensuite, n'a pas été perdu par oubli : « Ton bilan date de 6 mois » est un
chiffre, et un chiffre invite à le vérifier. C'est un ordre de grandeur, donc il s'écrit en mots —
`ancienneteEnMots` (`src/types/suivi.ts`), partagée avec la carte du suivi, qui l'écrivait en
chiffres et le calculait sur place. Les deux cartes disent maintenant l'âge, par la même dérivation :
deux écrans qui comptent chacun de leur côté finissent par annoncer six mois d'un côté et cinq de
l'autre. Le fond passe à `backgroundElement` (canvas B1) — une proposition, pas une mise en avant.

### C2.9 — Rappels qui s'espacent, et une sortie hors de l'app

**Priorité** P2 · **Effort** moyen · **Dépend de** C0.5 · **Arbitrage** D8 · **Constats** C-4, A9-7, A9-16, A9-21.

**Pourquoi.** Un point est créé chaque semaine pour tout compte ayant un bilan, un message est
mis en file pour chaque point, sans regarder si les dix précédents sont restés sans réponse ; la
purge ne touche que les anonymes : un compte rattaché qui a désinstallé reçoit 52 emails par an,
indéfiniment, sur un quota Resend de 100 par jour consommé d'abord par les muets. La seule sortie
exige de rouvrir l'app.

**À faire.**
1. Dans `enqueue_checkin_reminders()` : ne mettre en file que si le nombre de points consécutifs
   `expired` de la boucle depuis la dernière réponse est sous un seuil (4), puis passer à un rythme
   mensuel, puis se taire — le point reste généré (l'app le montre), seul le message s'espace. Une
   réponse ou un `app_open` remet le compteur à zéro (avec C1.2, `app_open` redevient fiable).
   Test pgTAP de la décroissance.
2. Lien de désinscription : route web `/rappels/stop?jeton=…` (jeton à usage unique, stocké sur la
   ligne d'outbox, expirant) qui passe `reminder_channel` à `none` sans connexion ; en-têtes
   `List-Unsubscribe` et `List-Unsubscribe-Post` dans l'appel Resend. Route sans enfants : vérifier
   `cleanUrls` et le titre dans l'export.
3. Dire la décroissance et la sortie dans `/confidentialite`.
4. `register_push_token` : tracer les reprises (colonne ou journal) ; garder la reprise
   inconditionnelle (décision documentée).

**Ne pas faire.** Ajouter un second message par point ; réécrire les phrases du rappel (D12).

### C2.10 — Le signal « deux points consécutifs »

**Priorité** P2 · **Effort** petit · **Dépend de** C2.3 · **Constats** A11-3, A5-15.

**Pourquoi.** Signal d'engagement de la spec §7, indicateur de succès §9, requête écrite dans
`v1-02` §4, phrase du handoff (« Deuxième mois de suite que tu changes quelque chose sur ce
trajet. ») : toujours calculé nulle part.

**À faire.**
1. Côté analyse : une vue `analytics.checkins_consecutifs` par boucle, sur les **périodes**
   successives (`period_start`), pas sur les deux dernières lignes répondues (les `expired`
   cassent la série).
2. Côté écran : un second renforcement **textuel** après un « Oui » qui suit un « Oui » à la
   période précédente : la phrase du handoff, en voix produit, sous la réplique de Ramille. Jamais
   un badge, jamais un compteur, jamais au-delà de deux.

**Design (canvas v1-14).** Planche A1. La phrase de renforcement est une ligne de corps sous
le retour de Ramille, voix produit : « Deuxième semaine de suite que tu fais ce trajet autrement. »
/ « Deuxième mois de suite que tu voyages autrement. » Jamais un badge, jamais au-delà de deux ;
dérivation pure `estDeuxiemeFoisDeSuite` (`v1-14` §4.6). Après C2.4 dans `checkin-card.tsx`.

### C2.11 — Le lien du rappel ouvert sur un autre appareil

**Priorité** P2 · **Effort** petit · **Constats** C-2, A6-15 (partie repli), A6-16.

**Pourquoi.** L'email ne porte que `https://www.ramille.fr/plan`. Sur un ordinateur ou un
téléphone neuf, `ensureSession()` crée une session anonyme vide et le plan affiche « Ton bilan
n'est pas encore fait » avec pour seul bouton « Faire mon bilan ». La consigne de désinscription
(« depuis Toi ») règle alors la préférence d'une session vide.

**À faire.**
1. Sur l'état `no_assessment` du plan et du suivi : un lien secondaire « J'ai déjà un compte » vers
   `/connexion/retrouver`, comme sur l'accueil de l'onboarding.
2. Le lien du rappel porte un paramètre (`?rappel=1`) qui fait dire à l'écran, sans bilan local :
   « Ce rappel concerne un compte. Retrouve-le ici. » Attention au périmètre d'`assetlinks.json`
   (`/plan` seulement, le paramètre ne change pas le chemin).
3. `ensureSession` distingue « aucune session » de « session refusée » (erreur de rafraîchissement) ;
   dans le second cas, un écran minimal « Reconnecte-toi pour retrouver ton bilan » (handoff §4.3)
   avec Google et `/connexion/retrouver`, sans reproche.
4. « Toi », compte rattaché seulement : « Me déconnecter de cet appareil » (`signOut`, marques
   locales effacées, retour à la racine), avec « Tes données restent sur ton compte » (D17).

**Design (canvas v1-14).** Planche G, seconde moitié : plan ouvert depuis un rappel sur un
appareil neuf, sans bilan local — mascotte 72 px `calm` tilt −6 (aucun chiffre sur l'écran, elle
peut l'occuper), « Ce rappel concerne un compte. Retrouve-le ici. », « Ton bilan, ton plan et tes
points sont rattachés à ce compte, pas à cet appareil. », bouton « J'ai déjà un compte », lien
« Commencer un bilan sur cet appareil ».

### C2.12 — Variantes des répliques de check-in

**Priorité** P2 · **Effort** petit · **Dépend de** C2.4 · **Arbitrage** D12 (rendu le 10/09/2026, contre la recommandation : oui, trois ou quatre variantes par issue, choisies par période) · **Constats** A13-17, A9-21 (partie).

**Pourquoi.** Avec les deux boucles, une personne reçoit environ soixante-quatre questions par an et
n'entend que deux phrases en retour : « Bien joué — chaque changement compte. » et « Pas cette
fois-ci. Rien d'obligatoire, on se repose la question au prochain point. » La répétition stricte
de la **question** est utile (contexte stable) ; celle de la **réponse** s'use. Le titulaire a
décidé d'ajouter des variantes en sachant que l'usure n'est pas mesurable (`checkin_answer` est
interdit comme événement d'usage) : c'est un choix de ton, pas une optimisation.

**Fichiers.** `src/constants/mascotte.ts:40-44` ; `src/constants/mascotte.test.ts` ;
`src/components/checkin-card.tsx:79-83` ; CLAUDE.md (§ mascotte, règle « ne se réécrivent pas »).

**À faire.**
1. Dans `RAMILLE`, chaque issue devient un tableau : `checkinOui: [original, v2, v3, v4]`,
   `checkinNon: [...]`, et `checkinSansObjet: [...]` (C2.4). **La réplique d'origine reste en
   première position** et n'est pas modifiée.
2. Une dérivation pure `repliqueDeCheckin(issue, periodStart)` dans `src/types/checkin.ts` (module
   de C2.1) choisit la variante par un hachage déterministe de `period_start` — la même période
   rend la même phrase sur tous les appareils et à chaque rendu, jamais de tirage aléatoire.
3. Les variantes respectent les règles de la voix : première personne, tutoiement, jamais un
   nombre, jamais « tu devrais » ni « il faut », jamais un accord qui genre la personne (C3.10),
   et pour le « Non » jamais une déception. `mascotte.test.ts` parcourt désormais les tableaux.
4. Réécrire l'en-tête de `mascotte.ts` et la phrase de CLAUDE.md : « les répliques d'origine
   viennent des maquettes validées et restent ; des variantes s'y ajoutent, décision D12 du
   10/09/2026, choisies par période ».

**Design (canvas v1-14).** Planche A3 ; `v1-14` §3.1 donne les tableaux complets, par issue et
**par boucle** (la mensuelle ne revient pas lundi). Quatre « Oui », trois « Non », deux « Pas de
trajet », l'originale en tête. La variante « Tu as choisi le vélo. Je vois la différence. » du
canvas devient « Tu as fait autrement. Je vois la différence. » pour valoir avec toute action.
Dernier de la chaîne `checkin-card.tsx`.

**Ne pas faire.** Toucher à la question elle-même. Étendre au texte de l'email dans ce chantier :
il vit uniquement en SQL (`enqueue_checkin_reminders`), et des variantes y demanderaient une table
lue par la mise en file — à instruire séparément si on le souhaite (A9-21).

**Tests.** `mascotte.test.ts` sur chaque variante ; `checkin.test.ts` : même période → même
variante, deux périodes voisines → pas toujours la même.

### C2.13 — La mascotte porte la saison

**Priorité** P2 · **Effort** moyen · **Dépend de** C2.8, canvas v1-14 · **Arbitrage** décision du 10/09/2026 (idée du titulaire, hors audit : « un petit détail, bonnet en hiver, joues rouges en automne ») · **Constats** aucun.

**Pourquoi.** La saison est l'unité de temps du produit — le cap, le cycle, et avec C2.8 une
ouverture et une clôture — et rien ne la rend visible sans un chiffre ni une date. Une mascotte
qui change avec la saison dit « le temps passe et je suis toujours là » sans compter, ce qui est
exactement le registre de Ramille (« Je serai là à chaque saison, à ton rythme. »). C'est aussi
le seul signal de nouveauté périodique que le produit puisse offrir sans mécanique d'échec.

**Fichiers.** `src/types/mascot.ts` (géométrie calculée, `MASCOT_MIN_FACE_SIZE`) ;
`src/components/mascot.tsx` ; `src/types/mascot.test.ts` ; `src/types/saison.ts` (nouveau) ;
`supabase/migrations/20260823110000_plan_reduction.sql:79` (`season_bounds`, la référence) ;
`api/share-card.ts` (exclu) ; `docs/design/v1-14-boucle-engagement/` (le canvas, page Saisons).

**À faire.**
1. Une dérivation pure `saisonDe(date)` dans `src/types/saison.ts` : hiver = décembre à février,
   printemps = mars à mai, été = juin à août, automne = septembre à novembre — la table de
   `season_bounds`, **écrite deux fois et épinglée des deux côtés** comme `reminder_channel_for`
   (Jest sur les douze mois et les bornes ; le test pgTAP existant de `season_bounds` cité en
   miroir). C2.8 s'en sert pour la carte d'ouverture.
2. Une couche d'accessoire dans la géométrie (`mascotSeasonGeometry(saison, mood, size)` à côté
   de `mascotFaceGeometry`) : positions et épaisseurs en unités de `viewBox` à la taille nominale,
   compensation optique comme les traits, symétrie par l'écart et non par la coordonnée, découpée
   par le même `clipPath` quand elle touche la silhouette. **Rien sous `MASCOT_MIN_FACE_SIZE`** :
   la feuille seule reste la feuille seule.
3. Le composant prend `saison` en prop, valeur par défaut `saisonDe(new Date())` — on peut donc
   figer une saison dans un test, un canvas ou une capture. Les cinq expressions et `tilt` sont
   inchangés ; l'accessoire doit rester lisible avec chacune des cinq.
4. Les accessoires viennent du canvas v1-14 (page Saisons) ; leurs couleurs entrent dans `Colors`
   avec les **deux thèmes** ; jamais de rouge (les joues d'automne sont un ton chaud de la
   palette). Test de conformité aux chemins du canvas, comme pour le visage.
5. Exclusions : la carte de partage (`api/share-card.ts`, dont C3.10 retire le visage), le
   favicon, les icônes d'app (`mascot-mark.svg` reste la version `calm` sans saison).

**Design (canvas v1-14).** Page Saisons (`captures/C-saisons-accessoires.png`),
`Mascotte.dc.html`, géométrie exacte dans `HANDOFF.md` et `v1-14` §7. Ce que le canvas fixe :
quatre accessoires — hiver un bonnet (calotte `mascotWarm`, revers et pompon `mascotAccessory`),
printemps un bourgeon (trois pétales, cœur `mascotWarm`), été une goutte de rosée hors du visage,
automne des joues plus marquées (rayon × 1,18, opacité + 0,25, `mascotWarm`) — positions fixes en
unités de `viewBox`, épaisseurs × `k`, rendus après le visage, jamais sous 28 px ; quatre jetons
dans les deux thèmes (`v1-14` §6, `mascotWarm` et non `mascotBlushAutumn`) ; les cinq expressions
vérifiées avec le bonnet ; thème sombre : feuille `#3D9B6F`, encre fixe. Deux saisons marquées,
deux discrètes : printemps et été peuvent rester nus si quatre sont trop. `saisonDe` vient de C2.14.
**Un build** avant la vérification sur appareil.

**Ne pas faire.** Une sixième expression. Une saison qui change l'humeur (l'hiver n'est pas
triste). Un accessoire près d'un chiffre lourd (la règle ne change pas). Dériver la saison de
`plan_cycles` ou de la cadence : `rolling_quarter` n'a pas de saison nommée, la mascotte suit le
calendrier dans les deux cas. Un chemin SVG figé dans le composant.

**Tests.** `saison.test.ts` (douze mois, bornes, miroir de `season_bounds`) ; `mascot.test.ts` :
aucun trait sous ~1,3 px à `size >= 28`, accessoire dans la silhouette ou découpé, symétrie,
rendu strictement identique quand aucune saison n'est passée aux tests existants.

**Fait quand.** Le 1er décembre, sans mise à jour de l'app, Ramille porte son bonnet sur le
plan, le suivi et l'onboarding, en thème clair et sombre, et la carte de partage ne change pas.

### C2.14 — Le socle « saison » côté client

**Priorité** P2 · **Effort** petit · **Constats** aucun (ajouté le 10/09/2026 avec le canvas v1-14).

**Pourquoi.** Trois chantiers du lot 2 ont besoin de savoir, côté client, dans quelle saison
tombe une date et comment elle s'appelle : la carte d'ouverture et le cap (C2.8), le groupement
des points par saison (C2.7), l'accessoire de la mascotte (C2.13). Aujourd'hui la saison n'existe
qu'en SQL (`season_bounds`). Trois implémentations divergeraient ; une seule, écrite avant les
trois, ne peut pas.

**Fichiers.** `src/types/saison.ts` (nouveau), `src/types/saison.test.ts` ;
`supabase/migrations/20260823110000_plan_reduction.sql:79` (`season_bounds`, la référence) ;
`supabase/tests/database/` (le test existant de `season_bounds`, cité en miroir).

**À faire.**
1. `saisonDe(date: Date): { saison: 'hiver' | 'printemps' | 'ete' | 'automne'; debut: Date; fin:
   Date; libelle: string }` — hiver = décembre à février (libellé « Hiver 2026-2027 », le
   décembre appartient à l'hiver qui commence), printemps = mars à mai, été = juin à août, automne
   = septembre à novembre. Miroir exact de `season_bounds`, en date locale.
2. `recapDeSaison(checkins, bornes)` → `{ repondus, changements }` : le nombre de points répondus
   (`status = 'answered'`, toutes valeurs de `response_kind`) et le nombre de `oui` dans la
   période. Jamais les points manqués.
3. Un module pur, sans import de `@/lib/supabase` ni de React.

**Ne pas faire.** Dériver la saison de `plan_cycles` ou de la cadence : `rolling_quarter` n'a pas
de saison nommée, et la mascotte suit le calendrier dans les deux cas. Réimplémenter la logique
dans un écran.

**Tests.** Les douze mois, les quatre bornes (1er déc., 1er mars, 1er juin, 1er sept.) et les
veilles, le libellé d'hiver à cheval sur deux années ; en commentaire, la référence au test pgTAP de
`season_bounds` qui épingle les mêmes bornes.

**Fait quand.** C2.7, C2.8 et C2.13 importent `saisonDe` et aucun d'eux ne calcule une saison.

## 6. Lot 3 — Prise de conscience et justesse du chiffre

### C3.1 — La mobilité contrainte est lue par la restitution

**Priorité** P3 · **Effort** petit · **Constats** A3-7, A13-9, A11-2.

**Pourquoi.** `assessment_results.mobility_constrained` est calculé et stocké, commenté « pour la
restitution » (`v1-07` §3.3 et §3.5), et lu par aucun `.tsx`. La barre « Moyenne en France » est
affichée à qui vient de déclarer n'avoir aucun transport en commun.

**Fichiers.** `src/app/(tabs)/suivi/bilan.tsx:100-108, 293, 402-407` ; `src/types/resultat.ts`.

**À faire.** `montreMoyenneFrancaise(results)` dans `src/types/resultat.ts`, testée : quand
`mobility_constrained`, retirer la barre et la branche de `comparisonNote` qui cite la moyenne,
ajuster `domain`, ajouter une phrase factuelle : « Là où tu vis, la voiture n'est pas un choix.
Le plan regarde ce qui dépend de toi. » Ne rien masquer d'autre. Le champ **ne** pilote **pas**
l'estimateur (C3.8 traite le plan par ses propres critères).

**Design (canvas v1-14).** Planche E, variante « mobilité contrainte » : pas de barre « Moyenne
en France », la barre-contour du bilan précédent (C2.7) et « Toi, aujourd'hui » restent, phrase
« Là où tu vis, la voiture n'est pas un choix. Le plan regarde ce qui dépend de toi. » Après C2.7
dans `suivi/bilan.tsx`.

### C3.2 — D'où vient le chiffre : source, périmètre, une équivalence

**Priorité** P3 · **Effort** moyen · **Constats** C-3, A3-19, A11-6, A11-7.

**Pourquoi.** Aucune ligne sous le total ne dit la source ni que le chiffre inclut la
fabrication : c'est ce qui le rend incomparable à Nos Gestes Climat ou à un simulateur d'usage
(écart de 30 % à 450 % sur une électrique) sans qu'aucun écran l'explique. `v1-07` §3.5 marquait
« fait » un point à moitié traité : les équivalences n'ont jamais été construites.

**À faire.**
1. Sous le total, un bloc dépliable « Comment ce chiffre est calculé » : source (ADEME Base
   Empreinte via Impact CO2), périmètre (usage + fabrication, ce qui explique un vélo non nul et
   une électrique plus lourde qu'ailleurs), hypothèses (1500/9000 km par vol, 800/700 km, moitié
   du trajet pour le second mode, 45 semaines), date de version des facteurs (déjà figée par
   bilan). Texte dans une constante à côté de `carbon-reference.ts`, jamais dans l'écran.
2. Une équivalence unique, figée et sourcée dans `carbon-reference.ts` (pas d'appel réseau),
   non culpabilisante et non alimentaire — accrochée à la **marche** (« ta marche de 300 kg, c'est
   un aller-retour Paris–Marseille en avion ») plutôt qu'au total, comme le canvas de `v1-07` le
   formulait. Rouvrir la demi-ligne « §3.5 fait » dans `v1-07` §4 par un encadré daté.
3. Sourcer ou assumer par écrit les sept constantes du calcul (distances 1500/9000/800/700,
   fréquences 0,25/1/3), dans le même bloc.

### C3.3 — Vols : aller-retour, hypothèses affichées

**Priorité** P3 · **Effort** petit · **Constats** A7-7.

**Pourquoi.** « Combien de fois prends-tu l'avion » : un aller-retour compte-t-il un ou deux ? Un
facteur 2 sur le poste le plus lourd, et les distances 1500/9000 km ne sont affichées nulle part
alors que l'écran des longs trajets affiche les siennes.

**À faire.** Lever l'ambiguïté par la copie (« Combien de vols, aller et retour comptés
séparément ? ») — pas en doublant les distances, qui invalide la quinzaine d'assertions pgTAP et
impose de re-relever les facteurs avion dépendants du `km` demandé — et afficher la ligne
d'hypothèses sur `flights.tsx` comme sur `long-trips.tsx`.

### C3.4 — Trajet intermodal : seconde jambe persistée, part du second mode

**Priorité** P3 · **Effort** grand · **Arbitrage** D6 · **Constats** A7-1, A7-2, A8-11, A2-14.

**Pourquoi.** Avec un second mode, la moitié exacte des kilomètres est attribuée à chaque
mode : vélo + train sous-estimé de 44 %, voiture + train en parc-relais surestimé de 51 %, sur
le poste qui décide du poste dominant. Le CO2 de la seconde jambe est calculé puis perdu : toutes
les actions domicile-travail se calculent sur la moitié du trajet ; « Garder une journée de
télétravail » supprime les deux jambes et n'en compte qu'une (153 kg réels, 128 annoncés) ; le
seuil de 5 kg peut écarter une action qui passerait en comptant les deux.

**Fichiers.** `supabase/migrations/20260905130000_actions_chiffrees.sql:279-293, 398-413, 471-560` ;
`src/components/bilan/steps/commute-extra.tsx:68-71` ; `src/types/bilan.ts`.

**À faire.**
1. Persister `commute_second_leg_km_year` / `commute_second_leg_co2_kg_year` sur
   `assessment_results` ; `remove_day` et `remove_trip` portent sur la somme des deux jambes ;
   les substitutions restent sur la jambe principale avec un libellé honnête (« sur la partie en
   voiture de ton trajet »).
2. Une puce **au même niveau** sur l'écran du second mode : « sur quelle part du trajet ? moins
   d'un quart / environ la moitié / plus des trois quarts », stockée dans
   `commute_second_mode_share numeric` (repli 0,5). Le calcul devient `part × facteur(second) +
   (1 − part) × facteur(principal)`, la division covoiturage restant sur la seule jambe principale
   (correction T13 préservée).
3. Afficher la règle à l'écran (« on comptera environ la moitié du trajet avec ce mode ») tant que
   la puce n'est pas choisie.
4. Recalculer **par requête** toutes les assertions chiffrées touchées (fichiers 01, 05, 06, 08,
   10) ; ajouter un profil voiture + train au test 10.

### C3.5 — Covoiturage des loisirs

**Priorité** P3 · **Effort** moyen · **Arbitrage** D4 · **Constats** A7-5, A2-12, A7-12 (partie occupation).

**À faire.** `leisure_is_carpool boolean`, `leisure_carpool_size smallint` (mêmes valeurs qu'en
B1.5), division du poste loisirs comme pour le domicile-travail ; l'étape loisirs pose la taille
en révélation imbriquée sous « Voiture (covoiturage) » ; `selectedKey` dérivé de `answers`.
Prévoir, dans la même migration si possible, l'occupation des longs trajets en voiture (B3.4 :
« seul / à deux / à trois ou plus »). Consigner l'écart à `v1-05` §2 par un bandeau. Recalcul
pgTAP par requête.

### C3.6 — Loisirs : ouvrir la tranche haute

**Priorité** P3 · **Effort** moyen · **Constats** A7-6.

**À faire.** Sous « Plus de 30 km », une révélation imbriquée avec un champ kilométrique libre
(le schéma porte déjà `leisure_trip_distance_km` sur `assessment_results`), ou une cinquième
tranche ; vérifier `action_templates.max_distance_km` pour que le plan suive. Recalcul pgTAP.

### C3.7 — Loisirs rares : dire la règle à l'écran

**Priorité** P3 · **Effort** petit · **Arbitrage** D5 · **Constats** A2-11, A12-22.

**À faire.** Sur l'étape de fréquence, sous « Rarement », une ligne `type="code"` comme sur les
longs trajets : « on comptera une petite base par défaut ». Reformuler « On ajustera la précision
plus tard » en « tu pourras donner un chiffre plus précis en refaisant ton bilan, tes réponses
seront préremplies ».

### C3.8 — Plan : filtres de plausibilité, libellés, référentiel d'actions, tests

**Priorité** P3 · **Effort** grand · **Constats** A8-5, A12-5, A8-4, A8-15, A8-14, A4-16, A13-18 (partie données), A8-13.

**Pourquoi.** Le filtre B4 ne lit que `tc_access = 'inexistant'` : « Passer deux trajets sur cinq
en métro ou en tram » arrive en tête du plan d'un profil rural à desserte limitée. « Garder une
journée de télétravail par semaine » présuppose un télétravail que rien ne vérifie, proposé à une
aide-soignante ou un chauffeur, formulé comme un manquement. Quand le poste dominant n'a rien à
proposer, le plan est complété par d'autres postes mais l'écran écrit « Deux actions liées à
Trajet domicile-travail (Vélo) » et un cap qui ne les mesure pas. Douze templates, avec des manques
calculables sans nouveau facteur. Le test 10 ne vérifie ni la branche voyages, ni le seuil de 5 kg,
ni l'absence du bus.

**Fichiers.** `supabase/migrations/20260905130000_actions_chiffrees.sql:131-167, 519-560, 613-627, 732` ;
`src/app/(tabs)/plan.tsx:380-389, 439-452` ; `src/types/plan.ts:26-27` ; tests 02, 10.

**À faire.**
1. `action_templates.zones_admissibles text[]` (ou `requires_dense_urban`), lu par le filtre :
   métro/tram hors `urbain_dense` jamais proposé. Vérifier en base, comme le tableau de `v1-07`
   §3.3, que le plan rural reste alimenté (covoiturage, télétravail, regroupement).
2. Télétravail : libellé « Travailler depuis chez toi un jour par semaine » ; drapeau
   `requires_teletravail` et une question B4 (« Peux-tu travailler depuis chez toi ? Oui / Parfois /
   Non ») — la question est nécessaire, le libellé seul laisse l'action en tête chez les gros
   rouleurs sans alternative. Garde par template pour un second jour (`trips = 2` ne doit pas
   supprimer 100 % du trajet de qui fait deux jours).
3. Intro du plan quand les actions débordent du poste dominant : « Deux actions, sur d'autres
   postes que ton trajet domicile-travail. » (le `poste` de chaque action est déjà sélectionné) ;
   cap : soit sur le total quand les actions viennent de plusieurs postes, soit formulé comme un
   repère du poste dominant sans inviter à y cumuler des gains d'ailleurs.
   **Relevé en livrant C2.5 (11/09/2026) : le cas à traiter en premier est celui de zéro action,
   pas celui des actions d'un autre poste.** La carte du cap ne dépend que de `capKg !== null`
   (`plan.tsx`), donc elle s'affiche au-dessus de « Tu fais déjà l'essentiel sur ce poste » —
   « − 11 kg, soit − 20 % sur tes sorties du week-end » juste avant « aucun changement de mode ne
   te ferait gagner assez pour valoir la peine d'être proposé ». Le commentaire du cap dit lui-même
   qu'il existe pour qu'on voie « qu'en cumulant deux actions elle l'atteint » : sans action, il
   n'a plus d'objet. Ce n'était un cas de bord qu'avant C2.5 ; depuis que les templates `leisure`
   sont refusés aux loisirs rares, **tout cycliste et tout profil sédentaire** y tombe — vérifié
   sur le distant, plan à zéro action pour les deux. Et le chiffre du cap y est dérivé du résiduel
   de 15 km, c'est-à-dire d'une hypothèse : raison de plus de ne pas le poser en grand.
4. Templates à ajouter (une ligne de seed chacun) : covoiturer un long trajet, marche pour les
   sorties courtes, un vol court en moins quand le train n'est pas une option, second jour de
   télétravail avec garde. Échéances des actions voyages dépendantes du `segment` (« avant mon
   prochain bilan », « au prochain projet de voyage »), contrainte `intention_timing` étendue.
5. Test 10 : profil voyages avec valeurs recalculées par requête ; assertions « aucun gain < 5 »,
   « aucun template `bus` », valeurs exactes pour `remove_day` et `share_vehicle`.
6. Vue `analytics.engagement_action_by_segment` (cycles, engagements, template, forme d'intention).

**Design (canvas v1-14).** Planches F1 et F2 pour deux points de ce chantier : le libellé
« Travailler depuis chez toi un jour par semaine » et l'intro « Deux actions, sur d'autres postes
que ton trajet domicile-travail. » quand les actions débordent du poste dominant. Le reste du
chantier (filtres, question B4, gabarits, tests) n'a pas d'écran.

### C3.9 — Onboarding et compte : ce que le produit promet et ne dit pas

**Priorité** P3 · **Effort** moyen · **Arbitrage** D17 · **Constats** A1-8, A1-9, A1-10, A6-17, A1-11, A12-15, A13-15, A2-24, A1-13, A6-9, A6-14.

**Pourquoi.** Aucune étape n'écrit « pas besoin de compte » ; le seul mot « compte » est « J'ai
déjà un compte », qui se lit à l'envers. Rien ne mène à `/confidentialite` avant la première
écriture serveur. Quelqu'un qui a un brouillon rejoue les quatre écrans et « Commencer mon
bilan » — l'écran « Reprise de bilan » du handoff §5.2 est spécifié et non livré. Ce qu'on perd
sans compte n'est dit que dans les pages légales. La proposition de compte promet « un historique
de points mensuels » (texte du handoff, antérieur à la boucle hebdo).

**À faire.**
1. Accroche ou transition : « Pas de compte à créer pour commencer. » avant le lien « J'ai déjà un
   compte », sans déplacer ce lien.
2. Un `TextLink` vers `/confidentialite` sous « Tes réponses restent privées » et au pied de la
   transition ou du questionnaire.
3. Racine : lire `loadBilanDraft()` ; brouillon présent → `/bilan` directement, avec l'écran de
   reprise du handoff (« On reprend où tu t'étais arrêté », « Continuer mon bilan » / « Repartir de
   mon dernier bilan »), sans mention du délai écoulé.
4. Transition : une ligne sur la suite (« après le bilan, une action à ton rythme, et un point de
   temps en temps »), sans cinquième écran.
5. Sous « Continuer sans compte » : « Sur cet appareil seulement : si tu changes de téléphone ou si
   tu ne reviens pas pendant trois mois, ton bilan ne te suivra pas. » Proposition de compte :
   « Avec un compte, il te suit d'un appareil à l'autre, saison après saison : tes bilans, tes
   réponses, ton plan. » Consigner l'écart au handoff.
6. Une réplique de Ramille à l'entrée de chaque **section** du questionnaire (quatre, pas neuf)
   qui redit l'approximation acceptée, sans toucher l'en-tête statique.
7. 404 : Ramille ne porte que la sortie (« Ton bilan et ton plan, eux, sont toujours là — je te
   ramène. »). Bouton Google : le « G » officiel en SVG inline, libellé annoncé = texte affiché.
   Lien « Un chiffre me semble faux » au pied de la restitution (`kind: 'chiffre'`, catégorie
   modifiable).

**Design (canvas v1-14).** Planche G, première moitié : l'écran de reprise — en-tête du
questionnaire (« Loisirs du week-end · Étape 5 sur 9 » et sa barre), « On reprend là où tu en
étais. » (le canvas écrit « où tu t'étais arrêté », accord qui genre — corrigé, `v1-14` §10),
« Quatre écrans déjà remplis. Il en reste cinq, en comptant celui-ci. » dérivé de `isStepVisible`,
« Continuer mon bilan » primaire, « Repartir de mon dernier bilan » secondaire. Aucune mention du
délai écoulé.

### C3.10 — Ton : accords, carte de partage, textes machine

**Priorité** P3 · **Effort** petit · **Dépend de** C2.6 · **Arbitrage** D15 · **Constats** A12-4, A12-7, A12-20, A6-19, A9-8, A12-16.

**À faire.**
1. Les quatre accords : « TU T'Y ES ENGAGÉ » → « TON ENGAGEMENT » ; `auRevoir` → « Merci du temps
   passé ici. Si tu reviens, on repart de zéro, tranquillement. » ; « Tu t'es connecté avec Google ? »
   → « Ton compte est un compte Google ? » ; `suppression.tsx:168` (C1.10). Ajouter la quatrième
   règle à l'en-tête de `mascotte.ts` (jamais d'accord qui genre la personne) et un test sur les
   participes fréquents (en excluant « Action engagée », correct).
2. Carte de partage : retirer le visage (silhouette + nervure seules, le repli du composant sous
   `MASCOT_MIN_FACE_SIZE`), ce qui règle aussi la dérive de géométrie.
3. Suppression depuis l'app : état « C'est fait. » + ligne de Ramille + « Revenir au début ».
4. `enforce_feedback_rate_limit` : un `errcode` distinct et stable, reconnu par code côté client ;
   le texte reste ce qui s'affiche ; test 11 sur le code.

**Design (canvas v1-14).** L'étiquette « TON ENGAGEMENT » est livrée par C2.2 (vague 4) : ce
chantier ne la refait pas et garde les trois autres accords, la carte de partage, l'état de
suppression et le code d'erreur.

### C3.11 — Le palier et son cap : une seule définition

**Priorité** P3 · **Effort** petit · **Constats** A3-2.

**Pourquoi.** `palier.ts` et `v1-07` §3.4 justifient le palier comme « le même effort relatif pour
tout le monde », mais `baseline_co2_kg_year` est le **poste dominant** (décision `v1-07` §3.3 pour
le plan) et l'écran retranche 20 % de ce poste du **total** : − 18 % du total pour qui a un poste à
90 %, − 6,8 % pour qui est à 34 % — la propriété pour laquelle la trajectoire linéaire avait été
écartée, pénalisant les profils diversifiés. Le test fabrique un cap égal à 20 % du total.

**À faire.** Trancher et écrire : soit le palier reste adossé au cap du poste dominant (corriger le
commentaire de `palier.ts`, `v1-07` §3.4 par encadré, et le test qui alimente `nextPalier` avec
un cap réaliste), soit normaliser sur le total. Recommandation : garder le cap du poste (c'est ce
que les actions savent atteindre) et dire la marche comme « sur ton trajet domicile-travail ».

### C3.12 — Tests : `src/lib`, l'estimateur, le calcul complet

**Priorité** P3 · **Effort** moyen · **Constats** A10-7, A8-14, A7-9, A10-5, A9-17, A7-16.

**À faire.**
1. Reformuler la règle : « un module testé n'importe pas `@/lib/supabase` », et l'appliquer :
   `format.test.ts` (C1.8), `bilan-draft.test.ts`, `app-url.test.ts`, `connexion-prefs` /
   `notification-prefs` avec AsyncStorage mocké. `--coverage` en CI sans seuil, pour voir la carte.
   Retirer l'assertion tautologique de `page-titles.test.ts:27`.
2. Test 14 : deux scénarios de bout en bout (`moto_grosse` domicile-travail, `scooter_electrique`
   loisirs) via `recompute_assessment_results`, comparés à `public.emission_factor(...)`.
3. CI `db-tests` : `supabase gen types typescript --local` comparé à `src/lib/database.types.ts`
   après normalisation de style ; régénérer le fichier (le bloc `Insert` d'`assessment_results` a
   perdu trois colonnes).
4. Test 12 : assertion sur le contenu ordonné de `analytics.bilan_funnel` contre `BILAN_STEP_ORDER`.

## 7. Lot 4 — Increments à instruire

Chacun commence par une page de décision (un `v1-1N`), pas par du code.

### C4.1 — Check-in quantitatif

**Dépend de** C1.12, C2.1, C2.3, C2.4 · **Constats** A4-21, A8-19, A11-5.

Piste retenue par `v1-07` §3.6 et jamais instruite : « Combien de fois ? » (0 / 1-2 / 3+) au même
coût de geste, pour recalculer une empreinte vivante entre deux bilans. Ce qui manque au schéma :
snapshoter sur le point la base de comparaison (trajets de la période), `response_count` avec
`response` maintenue en dérivée, réponse par RPC, question dans une source unique (C2.1). Registre :
un « 0 » est un fait, jamais une série ; Ramille ne porte pas le chiffre. Soit instruire, soit
fermer par écrit.

### C4.2 — Coup de pouce prospectif la veille des jours choisis

**Dépend de** C2.1, C2.2 · **Arbitrage** D10 · **Constats** A13-11.

Le rappel est rétrospectif ; la recherche sur les intentions d'implémentation place le signal au
moment de la décision (la veille au soir). Proposition : opt-in distinct (« Un mot la veille de mes
jours ? »), une ligne de Ramille sans chiffre, uniquement pendant les ~10 premières semaines d'un
engagement (`committed_at`, que C2.2 rend stable), jamais après un refus, table à part ou ligne
d'outbox sans `checkin_id` (l'`unique(checkin_id)` actuel l'interdit). Rouvre « un mot par point ».

### C4.3 — Déplacements professionnels

**Arbitrage** D7 · **Constats** A2-13.

À court terme (sans arbitrage) : compléter l'aide de `commute-has-trip.tsx:46-49` : « on ne compte
pas ici les déplacements faits pendant ton travail ». L'increment : une question de section 1
(« conduis-tu dans le cadre de ton travail ? km/semaine »), un segment, des actions ; rouvre
`v1-05` §1.

### C4.4 — Vélo à assistance électrique, RER, autocar, occupation longue distance

**Constats** A7-11, A7-10, A7-12, A8-15 (partie VAE).

Un mode `velo_electrique` (facteur ACV 0,010950, ligne dans `emission_factor_sources`, entrée dans
`resolve_*`), révélation imbriquée « Mécanique ou à assistance ? » sur le patron du deux-roues ;
vérifier sur l'endpoint ACV un slug RER/Transilien distinct du TER ; un troisième compteur
« En autocar » sur B3.4. Chaque ajout de mode traverse les trois gardes du test 07 et invalide les
assertions chiffrées : les grouper en **une** migration.

### C4.5 — Hors-ligne : ouvrir sur le dernier plan connu ; session expirée

**Dépend de** C1.4 · **Constats** A1-5, A10-9, A6-15 · **Recette** §12.5, [#180](https://github.com/ScratchMe/TraceVerte/issues/180) · **Page de décision : [`v1-15-hors-ligne.md`](v1-15-hors-ligne.md)** · **Livré le 15/09/2026.**

**Ce qui suit est le chantier tel qu'il était écrit ; ce qui a été fait est dans `v1-15`, et trois choses y ont changé.** La moitié « session expirée » de ce titre était **déjà livrée** par C2.11 (`src/types/session.ts` et l'écran `SessionRefusee`), donc le chantier n'a porté que l'hors-ligne. **L'instantané du plan est sorti du périmètre** : il crée un troisième endroit où vivent les chiffres de la personne, ce que tout ce dépôt refuse, et la contre-vérification d'A1-5 le disait déjà hors de l'effort annoncé (`v1-15` §7 dit à quelles conditions le rouvrir ; le réessai au retour de connectivité est reporté de même en §8). Ce qui a refermé le défaut est une **marque locale** (« cet appareil a vu un bilan complété »), plus `/onboarding` comme repli quand elle est absente — ce qui rend le questionnaire atteignable hors ligne sans toucher à l'écran d'erreur que C1.4 a délibérément dépouillé.

**Et deux écarts à la page de décision elle-même, l'un à connaître absolument.** Le critère de reconnaissance de la coupure n'est **pas** l'absence de `code` que l'audit proposait, mais `status === 0` : trois chemins de `@supabase/postgrest-js` rendent une erreur sans `code` en portant un statut réel, et les classer « pas de connexion » ferait taire un serveur qui a répondu (`v1-15` §4). Et **le bandeau doux n'a pas été écrit** : l'écran `erreur_reseau` de `/plan`, livré par C1.4, dit déjà la chose avec un « Réessayer » (§6).

Persister en AsyncStorage le fait « cette session a un bilan complété » et un instantané du
dernier plan ; hors réseau, la racine route vers `/plan` en lecture avec un bandeau doux. Distinguer
la panne réseau du reste sur le type d'erreur (pas sur le message).

**Requalifié le 14/09/2026 par la recette sur appareil.** Ce chantier était écrit comme un confort —
« ouvrir sur le dernier plan connu ». Ce qu'il répare est un **démarrage impossible** : mode avion,
app complètement fermée puis rouverte, on obtient « Le démarrage a échoué » et le `Unable to resolve
host …` d'Android, et rien de l'app n'est atteignable. Le brouillon étant effacé à la soumission, cela
vaut pour **toute personne ayant déjà soumis un bilan** — c'est-à-dire pour tous les comptes que le
produit veut garder. Quatre précisions relevées en écrivant le constat, qui font gagner la première
heure du chantier :

- **la branche qui lève est `if (error && !brouillon) throw error` dans `src/app/index.tsx`**, pas
  `ensureSession()` : un jeton stocké dont le rafraîchissement n'aboutit pas rend `indisponible`
  (C2.11) et la fonction sort sans rien créer. Sur une **installation neuve** hors ligne, c'est
  `signInAnonymously()` qui lève — même écran, autre cause, et le correctif doit couvrir les deux ;
- **le raisonnement écrit dans ce fichier reste juste et ne se défait pas** : sans le brouillon, la
  racine ne peut pas distinguer un visiteur neuf d'un compte existant dont la lecture a échoué, et
  l'envoyer à `/onboarding` lui dirait « tu n'as rien ». C'est la marque locale qui manque, pas
  l'honnêteté de l'écran ;
- **la racine interroge la base même quand la session est `indisponible`.** Si le réseau revenait
  entre les deux appels, la requête partirait sans session — mais `anon` n'a **aucun** privilège sur
  `assessments` (relevé le 14/09/2026), donc elle rend `42501` et non zéro ligne. Le chemin « zéro
  ligne → `/onboarding` » n'existe pas, et c'est le `grant` explicite qui le ferme, pas la racine :
  ne pas accorder `select` à `anon` sur cette table en croyant réparer autre chose ;
- **le coût du miroir local est le vrai point à trancher** : `allowBackup` est absent d'`app.json`,
  donc vrai par défaut, donc la marque revient sur un appareil restauré depuis une sauvegarde — où
  elle peut être fausse. Une marque fausse route vers `/plan` quelqu'un qui n'a pas de bilan, ce qui
  est l'erreur symétrique et bien moins grave (un écran de plan vide, pas un mur), mais elle se
  décide plutôt qu'elle ne se subit.

Et un effet de bord qui se retourne : **§11.5 était bloqué par ce mur, et ne l'est plus.** Le parcours
hors ligne écran par écran vivait derrière lui ; il est à jouer à la prochaine recette, et c'est
d'ailleurs la seule façon de vérifier ce chantier-ci sur appareil.

### C4.6 — Voir d'autres pistes, premier pas, cadrage identitaire

**Priorité** P2 (relevé le 10/09/2026) · **Effort** moyen · **Dépend de** C2.8, C2.7 · **Arbitrage** D18, D16 · **Constats** A13-18, A13-19, A13-16, A13-20, A13-17.

Figer toutes les actions ≥ 5 kg avec leur `rank`, deux en avant, « Voir d'autres pistes » ;
attention à `actionsCount` qui pilote le disclaimer et l'état vide. Une colonne `first_step` sur
`action_templates`, affichée une fois l'action engagée. Une norme dynamique en mots dans la voix
de Ramille, jamais un chiffre non sourcé.

**Design (canvas v1-14).** Planches F1 et F2 ; `v1-14` §4.4 (base), §5 (les pistes). Ce que le
canvas fixe : deux `ActionCard` en avant ; lien « Voir d'autres pistes · 4 » (`TextLink` small 600
`accentText` centré, cible 44) ; dépliées, deux cartes estompées (opacité 0,72, cliquables) avec
« Choisir celle-ci à la place » (`commit_plan_action` avec `p_replace`), puis des lignes simples
libellé / « − 72 kg » tertiaire, puis « Replier » ; état `pistesDepliees` local ; le bloc « Premier
pas » dans la carte engagée (fond `background`, rayon 16, padding 12/16, sur-titre 13/18/600
tertiaire, texte 14/20 — « Bloque le prochain vendredi dans ton agenda, aujourd'hui. »),
`first_step` sur le gabarit et recopié sur `plan_actions`. `actionsCount` continue de piloter le
disclaimer et l'état vide. **Relevé en P2 le 10/09** : tout est dessiné et décidé (D18, D16), et le
plan reste tronqué à deux sans lui. Après C2.8 dans `plan.tsx`.

### C4.7 — Retirer un bilan erroné

**Constats** C-8.

Depuis la relecture, « Ce bilan ne me ressemble pas » : RPC `security definer` qui marque
`withdrawn` (extension du CHECK de `assessments.status`, relecture des trois lectures de
`completed` dans `bilan-history.ts` et de la racine), jamais une policy DELETE ; le graphe et la
génération du plan l'ignorent.

### C4.8 — Comparaison même saison, un an après

**Dépend de** C2.8 · **Constats** A11-4, A13-7, A5-6.

Dérivation pure dans `src/types/suivi.ts` : appariement d'un bilan avec celui de la même saison
de l'année précédente (`season_bounds`), affiché en priorité sur l'écart au bilan précédent quand
il existe, et une proposition de re-bilan à l'anniversaire saisonnier. Aucun utilisateur ne peut en
bénéficier avant un an : c'est pourquoi il est en lot 4, mais la donnée doit être prête (C2.8).


### C4.9 — La sortie que la messagerie affiche · **fermé le 15/09/2026**

**Dépend de** C2.9 · **Recette** §12.6, [#181](https://github.com/ScratchMe/TraceVerte/issues/181).

**Fermé par son expérience, sans une ligne de code — et c'est le meilleur résultat possible.** Le
chantier devait commencer par une expérience à un message ; elle a été faite le 15/09/2026 et elle a
écarté l'hypothèse qui justifiait tout le reste.

**Le protocole.** Un rappel envoyé par Resend avec les **deux** en-têtes —
`List-Unsubscribe` et `List-Unsubscribe-Post: List-Unsubscribe=One-Click` — depuis l'expéditeur de
production `Ramille <rappels@ramille.fr>`, vers la boîte Gmail qui portait déjà le témoin de la
veille : même sujet, même corps, même forme de lien, jeton mort exprès. **La seule variable était la
paire d'en-têtes.** Sans toucher à `send_pending_reminders` ni à son contrôle de migration, donc sans
rien risquer en production.

**Le résultat : toujours aucun bouton.** L'en-tête manquant n'était donc pas la cause, et la fonction
`api/` qui aurait répondu au POST — le vrai coût du chantier — n'aurait produit **rien du tout**. Une
demi-journée de travail évitée par un message.

**Ce qui reste vrai, et qui suffit.** La sortie que le produit contrôle est le lien imprimé dans le
corps, et elle marche : vérifiée sur appareil le 14/09/2026, elle s'ouvre dans le navigateur, le
second clic refuse calmement, et la préférence repasse sur « Aucun ». C'est celle qu'il faut garder
bonne.

**Et la décision de C2.9 en sort renforcée, pas seulement intacte.** Ne pas envoyer
`List-Unsubscribe-Post` reposait sur un argument — la page est un export statique, elle ne peut pas
répondre au POST, et l'annoncer ferait échouer le geste en silence. Cet argument tenait ; on sait
maintenant qu'il n'y avait de toute façon rien à gagner de l'autre côté. Le contrôle de la migration
qui épingle l'**absence** de cet en-tête reste en place et se justifie deux fois.

**Condition de réouverture, parce que l'expérience a une limite qu'il faut écrire.** Elle a été faite
à un volume de **un message**. La façon la plus probable dont Gmail décide d'afficher ce bouton est
une classification en courrier de masse, qui dépend du volume et de la réputation de l'expéditeur —
or le domaine n'envoie aujourd'hui presque rien. **Si le volume d'envoi devient réel un jour, la paire
d'en-têtes peut redevenir la contrainte qui reste**, et ce chantier se rouvre alors tel qu'il était
écrit : une fonction `api/` qui répond au GET par une redirection vers `/rappels/stop?jeton=…` et au
POST en appelant `desinscrire_des_rappels`, avec les quatre garde-fous listés dans
[#181](https://github.com/ScratchMe/TraceVerte/issues/181). Ce n'est pas « faux », c'est **prématuré**.

## 8. Ce qu'il ne faut pas casser

Relevé par les lecteurs et confirmé ; toute PR qui touche un de ces points le dit dans sa description.

- `src/types/palier.ts` : la logique et ce qu'elle refuse (trajectoire linéaire, marches absolues),
  le drapeau `beyondTarget2050`, « jamais le nombre de paliers restants ».
- `src/constants/carbon-reference.ts` : une source, un total défini comme somme des postes, la
  dérivation 2050 signalée comme telle.
- `public.emission_factor(mode_id, date)` : un seul lookup, borné à la date, exception sur mode
  inconnu ; les tests qui épinglent la **source** ACV et le vélo non nul ; l'ordre hybride >
  thermique > rechargeable > électrique ; grosse moto > voiture.
- `resolve_mode` comme point unique de résolution ; `emission_factor_sources` et
  `usage_event_types` comme registres à double inscription.
- L'engagement par RPC ; une seule action engagée par cycle ; intention obligatoire, jamais libre.
- `unique(checkin_id)` sur la boîte d'envoi ; le repli push → email comme mise à jour de la même
  ligne ; `reminder_channel_for` et sa jumelle TS épinglées des deux côtés.
- La suppression par cascade depuis `auth.users` ; l'export en `security definer` ; la
  non-divulgation de l'existence d'un compte, expliquée à la personne.
- `useRafraichirAuRetour` ; `useTrackFocus` sur les onglets ; le pager d'onboarding
  (`useSyncExternalStore`, émission sur la page affichée) ; `dismissAll` à la sortie de l'onboarding.
- Les quatre gardes d'export ; la règle ESLint sur `Alert` ; `TextLink` ; `MessageInline` ;
  `mascotFaceGeometry` et son test de conformité.
- La voix de Ramille et ses règles testées ; « Pas cette fois-ci. Rien d'obligatoire… » ; « ce sont
  des contraintes, pas des fautes » ; les deux états « rien à proposer » écrits comme des
  félicitations ; le départ sans écran de rétention.

## 9. Constats écartés par la contre-vérification

- **A9-10** — le quota de 500 événements par 24 h ne s'atteint pas en usage normal.
- **A12-18** — le texte de repli « Action à préciser. » ne peut pas s'afficher sur une carte réelle.
- **C-5** — la limite de sign-ins anonymes par IP n'est pas ce que le constat décrivait.
- **C-9** — les gabarits d'email d'authentification : le constat reposait sur une prémisse fausse.
- **A10-19** (déjà fait) — l'installabilité web n'est pas un objectif de la V1, documenté.

## 10. Suivi

Cocher ici, avec la PR et la date. Une décision d'arbitrage prise se note en §1, dans la colonne
« Recommandation », par un « **Décidé le JJ/MM : …** ».

**Chaque chantier a son issue GitHub** (#99 à #151 et #153, ouvertes le 10/09/2026 ; la vue cochable des huit vagues est l'issue de suivi #154, étiquettes
`audit-2026-09` et `lot-0` à `lot-4`, type Task / Bug / Feature selon le lot). L'issue reprend le
corps du chantier et pointe vers ce document et l'inventaire ; c'est elle qu'on donne à un agent ou
qu'on s'assigne, et la PR la ferme (`Closes #n`). Le document reste la référence quand les deux
divergent : une issue ne se réécrit pas, elle renvoie ici.

| Chantier | Issue | PR | Date | Note |
|---|---|---|---|---|
| C0.1 | [#99](https://github.com/ScratchMe/TraceVerte/issues/99) | [#156](https://github.com/ScratchMe/TraceVerte/pull/156) | 10/09/2026 | livré |
| C0.2 | [#100](https://github.com/ScratchMe/TraceVerte/issues/100) | [#156](https://github.com/ScratchMe/TraceVerte/pull/156) | 10/09/2026 | livré |
| C0.3 | [#101](https://github.com/ScratchMe/TraceVerte/issues/101) | [#156](https://github.com/ScratchMe/TraceVerte/pull/156) | 10/09/2026 | livré |
| C0.4 | [#102](https://github.com/ScratchMe/TraceVerte/issues/102) | [#156](https://github.com/ScratchMe/TraceVerte/pull/156) | 10/09/2026 | livré |
| C0.5 | [#103](https://github.com/ScratchMe/TraceVerte/issues/103) | [#156](https://github.com/ScratchMe/TraceVerte/pull/156) | 10/09/2026 | livré |
| C0.6 | [#104](https://github.com/ScratchMe/TraceVerte/issues/104) | [#156](https://github.com/ScratchMe/TraceVerte/pull/156) | 10/09/2026 | livré |
| C0.7 | [#105](https://github.com/ScratchMe/TraceVerte/issues/105) | [#156](https://github.com/ScratchMe/TraceVerte/pull/156) | 10/09/2026 | livré |
| C1.1 | [#106](https://github.com/ScratchMe/TraceVerte/issues/106) | [#157](https://github.com/ScratchMe/TraceVerte/pull/157) | 11/09/2026 | livré |
| C1.2 | [#107](https://github.com/ScratchMe/TraceVerte/issues/107) | [#157](https://github.com/ScratchMe/TraceVerte/pull/157) | 11/09/2026 | livré |
| C1.3 | [#108](https://github.com/ScratchMe/TraceVerte/issues/108) | [#157](https://github.com/ScratchMe/TraceVerte/pull/157) | 11/09/2026 | livré |
| C1.4 | [#109](https://github.com/ScratchMe/TraceVerte/issues/109) | [#158](https://github.com/ScratchMe/TraceVerte/pull/158) | 11/09/2026 | livré, sauf §11.5 (parcours en mode avion) — **tenté le 14/09/2026 et impossible** : la racine levait avant de router hors ligne à froid, donc aucun de ces écrans n'était atteint (§12.5). **Débloqué depuis C4.5, livré le 15/09/2026** : la ligne est à jouer à la prochaine recette |
| C1.5 | [#110](https://github.com/ScratchMe/TraceVerte/issues/110) | [#157](https://github.com/ScratchMe/TraceVerte/pull/157) | 11/09/2026 | livré |
| C1.6 | [#111](https://github.com/ScratchMe/TraceVerte/issues/111) | [#158](https://github.com/ScratchMe/TraceVerte/pull/158) | 11/09/2026 | livré |
| C1.7 | [#112](https://github.com/ScratchMe/TraceVerte/issues/112) | [#158](https://github.com/ScratchMe/TraceVerte/pull/158) | 11/09/2026 | livré ; **§11.6 faite le 14/09/2026**, les deux moitiés — le point était là en ouvrant la notification (retour au premier plan) et la nouvelle barre sur Suivi après le re-bilan |
| C1.8 | [#113](https://github.com/ScratchMe/TraceVerte/issues/113) | [#158](https://github.com/ScratchMe/TraceVerte/pull/158) | 11/09/2026 | livré — quatre surfaces et non trois, la carte de partage comprise |
| C1.9 | [#114](https://github.com/ScratchMe/TraceVerte/issues/114) | [#157](https://github.com/ScratchMe/TraceVerte/pull/157) | 11/09/2026 | livré ; **§11.1 faite le 14/09/2026** sans constat, mais en sachant quelles séries de §11.4 sont encore en `button` — donc elle se refera après. §11.4 (les appels de `Chip` restants) n'a pas bougé |
| C1.10 | [#115](https://github.com/ScratchMe/TraceVerte/issues/115) | [#157](https://github.com/ScratchMe/TraceVerte/pull/157) | 11/09/2026 | livré ; **§11.3 faite le 14/09/2026** — le chemin a été suivi depuis un navigateur et le compte réellement supprimé, cascade comprise. À refaire à la publication, c'est là que la page est lue |
| C1.11 | [#116](https://github.com/ScratchMe/TraceVerte/issues/116) | [#157](https://github.com/ScratchMe/TraceVerte/pull/157) | 11/09/2026 | livré |
| C1.12 | [#117](https://github.com/ScratchMe/TraceVerte/issues/117) | [#157](https://github.com/ScratchMe/TraceVerte/pull/157) | 11/09/2026 | livré, cinq points sur cinq |
| C1.13 | [#118](https://github.com/ScratchMe/TraceVerte/issues/118) | [#158](https://github.com/ScratchMe/TraceVerte/pull/158) | 11/09/2026 | livré |
| C2.1 | [#119](https://github.com/ScratchMe/TraceVerte/issues/119) | [#166](https://github.com/ScratchMe/TraceVerte/pull/166) | 11/09/2026 | livré ; la question vient du gabarit (`action_templates.question_template`) et est **figée** à la génération — `committed_question`, lue telle quelle par le rappel et par la carte, donc elles ne peuvent plus différer d'un caractère. Quatre relevés que le chantier ne nommait pas : **`maintien` gagne sur `engagement`** (la collision n'arrive pas — un cycliste a un plan à zéro action, effet de bord de C2.5 — mais un ordre implicite dans un `case` est ce qui devient faux sans qu'on le voie) ; l'action est appariée **par poste** et doit couvrir la période interrogée, sans quoi une action de loisirs nommait la question du trajet ; `jours_francais` est une **troisième** paire SQL/TypeScript, qui joint par « ou » et non « et » (un choix de jours, pas un cumul) et dit « Tous les jours » à sept ; et le `push_body` ne préfixe le poste que si la question ne le nomme pas déjà — la question générique finit par « … pour ton trajet domicile-travail ? », l'étiquette le répétait. L'ancien genre `changement` est renommé `generique` : il ne décrit plus le cas général mais le repli. Vérification : 27 assertions du nouveau fichier `23`, plus `04`, `08` et `20` en entier (les trois qui possèdent les générateurs) |
| C2.2 | [#120](https://github.com/ScratchMe/TraceVerte/issues/120) | [#163](https://github.com/ScratchMe/TraceVerte/pull/163) | 11/09/2026 | livré ; **quatre** chemins détruisaient un engagement et non trois — le chantier ne nommait pas la libération interne de `commit_plan_action` (« choisir une autre action »), la plus discrète des quatre. `archiver_engagement` prend des **valeurs** et non un `plan_action_id` : au re-bilan la ligne est déjà supprimée quand on sait que son gabarit n'a pas survécu, donc une fonction qui la relirait n'archiverait rien, en silence, dans le cas principal. `carried_over_from` pointe le **cycle** d'origine et non la ligne précédente, qui disparaît à chaque reconstruction. Deux conséquences relevées en route : `plan_actions` a désormais deux clés étrangères vers `plan_cycles`, donc la lecture imbriquée du plan doit nommer la sienne sous peine de ne plus charger du tout ; et le trigger sur `submitted_at` interdit aux fixtures de choisir leur date à l'insert (02, 08 réparés en deux temps). **Une régression attrapée par la CI, et la règle qui en sort** : les deux RPC d'engagement ont d'abord été repris depuis leur migration d'origine et non depuis leur état installé, ce qui a supprimé en silence les trois gardes ajoutées par C1.12 — `13_engagement_action` les a rattrapées. Réécrire une fonction existante part de `pg_get_functiondef`, et impose de rejouer le fichier de test qui la possède. `p_replace` laissé à C4.6 — un paramètre qu'aucun appel n'émet se lit « mort », pas « réservé » |
| C2.3 | [#121](https://github.com/ScratchMe/TraceVerte/issues/121) | [#161](https://github.com/ScratchMe/TraceVerte/pull/161) | 11/09/2026 | livré ; transition documentée (une cohorte ne reçoit pas de message le lundi du basculement, et sa question de la semaine précédente devient correcte au lieu d'être prématurée) |
| C2.4 | [#122](https://github.com/ScratchMe/TraceVerte/issues/122) | [#166](https://github.com/ScratchMe/TraceVerte/pull/166) | 11/09/2026 | livré ; **le piège n'était pas la valeur nulle mais le filtre qui la lisait** — `loadAnsweredCheckins` écartait les lignes dont `response` est nulle, donc la troisième réponse aurait été donnée puis perdue, sans message d'erreur et sans rien afficher dans le suivi. Quatre écarts au chantier : la dérivation `response_kind` → `response` est une **contrainte** et non une convention, et elle porte **deux** invariants (répondu ⟺ genre renseigné, et la correspondance genre/booléen) — le premier est la forme structurelle du défaut, et il a imposé de corriger cinq fixtures qui écrivaient un état que la production ne peut pas produire ; le **backfill passe sous le trigger** `prevent_answered_checkin_update`, vérifié à la main sur le distant dans les deux sens, avec un contrôle de migration sur le réarmement ; la vue d'analyse gagne `answered_sans_objet`, parce que l'écart `answered − answered_yes` se lisait « non » et vient d'accueillir les « sans objet » ; et la **signature booléenne du RPC est supprimée** plutôt que doublée, ce qui ne tient que parce que l'app n'est pas encore publiée sur Play. Le point 5 (la carte répondue persiste) a imposé une borne en **UTC** — `debutDePeriodeInterrogee` est la jumelle du `date_trunc` des générateurs, à l'inverse de `saisonDe`. Vérification : 24 assertions du nouveau fichier `24`, plus `04`, `08`, `15`, `16`, `22` en entier et `09` avec l'expéditeur neutralisé |
| C2.5 | [#123](https://github.com/ScratchMe/TraceVerte/issues/123) | [#162](https://github.com/ScratchMe/TraceVerte/pull/162) | 11/09/2026 | livré ; quatre écarts au chantier, tous vérifiés en base — **la catégorie du mode décide, pas `commute_main_leg_co2_kg_year = 0`** (faux depuis les facteurs ACV : `velo` vaut 0,00017, le critère n'attraperait que les piétons) ; la catégorie `velo_marche` compte **trois** modes, donc la trottinette a sa question et sa réplique ; le résiduel d'un foyer sans véhicule passe en **train** et non en bus (à 0,1224 le bus ne vaut que 14 % de moins qu'une thermique, la correction aurait été un non-événement) ; et le mode inventé nommait aussi le **poste dominant**, moitié d'A13-4 que la recommandation ne couvrait pas. A imposé la paire `complement_de_maintien` / `src/types/checkin.ts`, qui porte désormais **la question du point côté client** — la carte l'écrivait elle-même, au présent et avec le libellé snapshoté, donc la notification et l'écran ne posaient pas la même question |
| C2.6 | [#124](https://github.com/ScratchMe/TraceVerte/issues/124) | [#160](https://github.com/ScratchMe/TraceVerte/pull/160) | 11/09/2026 | livré ; a imposé trois colonnes (`assessment_results.extras_poste`, `engagement_checkins.poste`, `plan_cycles.poste`) que le chantier n'avait pas anticipées — la forme insérable se dérive du poste, que le schéma ne gardait nulle part |
| C2.7 | [#125](https://github.com/ScratchMe/TraceVerte/issues/125) | [#169](https://github.com/ScratchMe/TraceVerte/pull/169) | 13/09/2026 | livré, les sept points ; **sans SQL** lui aussi — les trois colonnes par poste, `plan_cycles` et l'archive existaient et n'étaient pas lues. Quatre relevés que le chantier ne nommait pas. **Le nom du gaz est du bruit sur une ligne qui porte deux nombres** : « 2,1 t CO₂e → 1,7 t CO₂e », et « 600 kg CO₂e de moins que ton bilan de mars » où le gaz s'intercale entre le nombre et ce qu'il qualifie — d'où `formatTonnesNu`, qui partage la bascule de `formatTonnes` par une fonction interne commune et ne peut donc pas en diverger. C'est aussi ce qui **referme A5-3** : l'écart se dit en kilos, et le remède était bien une décision d'écran. **« Le palier que tu visais est derrière toi » n'est pas toujours prouvable** : le cap d'alors est perdu quand les deux bilans tombent dans la même période, `generate_plan_cycle_for_user` réécrivant le cycle courant à chaque soumission — avec le cap d'aujourd'hui, plus petit, la phrase s'afficherait plus souvent qu'elle ne le devrait, donc elle ne se dit que quand le cycle d'alors est un autre. **Une décision n'a pas de statut** : `decisionsParSaison` fait gagner l'engagement vivant sur l'archive du même cycle puis la dernière libérée, et `releasedAt` ne ressort pas — personne ne doit pouvoir en déduire un « tenu / pas tenu ». Et **la suite Jest tourne désormais en `TZ=Europe/Paris`** : en UTC, toutes les distinctions UTC/local que ce dépôt documente sont indistinguables, donc leurs tests passeraient aussi bien avec l'erreur — le test du jour local de `keepLatestPerDay` est celui qui l'a rendu visible (il échoue sur l'ancienne implémentation à Paris, et échoue en UTC avec l'une comme avec l'autre — mesuré le 14/09/2026, il garde donc aussi le réglage du fuseau). **§11.10 faite le 14/09/2026** : les six barres à échelle commune et la barre-contour regardées sur deux bilans à sept mois d'écart, sans constat |
| C2.8 | [#126](https://github.com/ScratchMe/TraceVerte/issues/126) | [#168](https://github.com/ScratchMe/TraceVerte/pull/168) | 13/09/2026 | livré, **sans une ligne de SQL** — `period_end` et `cadence_type` existaient déjà et n'étaient lus par aucun écran, ce qui est tout le constat A8-8. Sept écarts au canvas, dont deux qui touchent au fond. **La carte d'ouverture ne prend pas la place d'un point en attente** : le lien du rappel pointe `/plan`, donc masquer la question y ferait ouvrir une notification sur un écran qui ne la porte pas — le défaut exact trouvé sur appareil le 09/09/2026 (`v1-12` §8.1), et deux semaines de points perdus pour qui ne touche pas les boutons. Elle remplace la **carte d'attente**, Ramille parlant déjà sous elle. Et **le récapitulatif ne nomme aucun poste** : le décompte porte sur les deux boucles, donc « … sur ton trajet » serait faux pour quelqu'un dont les changements sont des voyages (même fausseté lisible que C2.6). Il ne dit jamais zéro non plus — sans point répondu la phrase disparaît, sans changement sa seconde moitié tombe. Trois relevés que le chantier ne nommait pas : la carte a besoin du **cycle précédent** (`limit(2)`), dont l'existence est ce qui distingue une bascule d'un premier bilan — « On repart pour une saison » ne vaut que si l'on a déjà roulé — et dont les bornes sont lues sur sa ligne plutôt que recalculées, une cadence `rolling_quarter` n'ayant pas de saison ; le canvas ne dessine pas les deux cas où il n'y a pas d'action à reprendre, dont le plan à zéro action de tout cycliste depuis C2.5, d'où `sortiesDeLouverture` ; et la fenêtre de lecture des points **tombait par coïncidence** au même jour que le début de la saison précédente (trois périodes mensuelles en arrière depuis le 1er d'un mois est le 1er du mois trois mois plus tôt), donc l'oubli ne se serait pas vu — elle prend maintenant le minimum des deux. Le trait de temps n'est pas plein le dernier jour de la saison, et c'est le rôle du « + 1 » de la durée. La puce « Cadence : Automne 2026 » disparaît : la période se nomme dans la carte du cap, à côté de sa fin. Reste §11.9 (le rendu sur appareil) — l'état a été fabriqué le 14/09/2026 et le bloc joué, mais la carte n'a pas reçu de constat en propre ; la prochaine saison s'ouvre le 1er décembre et n'aura plus rien à fabriquer |
| C2.9 | [#127](https://github.com/ScratchMe/TraceVerte/issues/127) | [#164](https://github.com/ScratchMe/TraceVerte/pull/164) | 11/09/2026 | livré, avec **un écart assumé au point 2 : `List-Unsubscribe-Post` n'est pas envoyé.** Annoncer `One-Click` engage l'URL à accepter un POST sans confirmation ; `/rappels/stop` est une page de l'export statique, qui ne peut pas y répondre — l'annoncer ferait échouer le geste **en silence**, là où l'en-tête seul fait ouvrir le lien dans un navigateur (comportement prévu par la RFC 8058). Le contrôle de la migration épingle donc son **absence**, pour que personne ne l'ajoute par symétrie. **Vérifié sur appareil le 14/09/2026, et l'écart coûte quelque chose** : Gmail n'affiche aucun bouton « Se désabonner » au-dessus du message (§12.6, [#181](https://github.com/ScratchMe/TraceVerte/issues/181), devenu `C4.9`) — le reste du point 2 tient, lien et second clic compris. La prémisse « la page ne peut pas répondre à un POST » reste vraie de la page et fausse du dépôt, qui sert déjà des Vercel Functions depuis `api/`. Deux seuils plutôt qu'un (4 puis 8) : sans le second, « espace » serait un état terminal pour la boucle mensuelle, qui est déjà à ce rythme. Le plafond du régime espacé compte sur `created_at` et non `sent_at`, sinon la décroissance ne s'appliquerait pas du tout tant que l'expéditeur n'est pas configuré. Et le jeton est écrit **explicitement** dans l'`insert` : laissé au `default` de la colonne, il aurait tiré un second uuid, différent de celui que le corps du message venait d'afficher — un lien mort au premier clic, sans qu'aucune des deux moitiés ait l'air fausse. Vérification : 33 assertions pgTAP rejouées sur le distant, plus le fichier `17` en entier (3 échecs attendus, ceux qui exigent l'appel d'envoi qu'on ne déclenche pas là-bas) |
| C2.10 | [#128](https://github.com/ScratchMe/TraceVerte/issues/128) | [#166](https://github.com/ScratchMe/TraceVerte/pull/166) | 11/09/2026 | livré ; **la requête de `v1-02` §4 est périmée et l'est devenue en silence** — elle prend les deux dernières *lignes*, ce qui était juste avant que 20260904180000 ne close les périodes révolues en `expired` **et les garde en base**. D'où `public.periode_precedente`, quatrième paire SQL/TypeScript : la période se calcule. Non-vacuité vérifiée sur la fixture du test `25`, qui compte 2 par `lag()` et 1 par période. Deux écarts : le signal **ne se rallume pas** (`estDeuxiemeFoisDeSuite` exige que la période d'avant ne soit pas un « oui » — la phrase dit « Deuxième semaine de suite », à la cinquième elle serait fausse, et la recevoir chaque semaine en ferait du papier peint), ce qui demande un troisième état là où `v1-14` §4.6 décrit deux arguments ; et la phrase existe en quatre formes, la boucle mensuelle couvrant deux postes. Les assertions de la vue sont écrites en **écarts** et non en totaux : elle agrège par segment et n'expose pas `user_id`, donc un total supposerait une base vierge. Corollaire de C2.4 refermé : la requête des points du plan est bornée par une fenêtre de trois périodes mensuelles |
| C2.11 | [#129](https://github.com/ScratchMe/TraceVerte/issues/129) | [#164](https://github.com/ScratchMe/TraceVerte/pull/164) | 11/09/2026 | livré ; le point 3 a demandé une dérivation pure (`src/types/session.ts`) parce que « pas de session » recouvre **trois** états et non deux — un jeton refusé, une panne de transport et une vraie première ouverture, qui n'appellent pas la même réponse. Vérifié dans `auth-js` que `getSession()` remonte bien l'erreur de rafraîchissement, sans quoi l'état `refusee` aurait été déclaré et inatteignable. Deux relevés : l'écran de reconnexion doit être une **surcouche** du `Stack` (rendu à sa place, ses deux boutons n'ont aucune route où aller), et la marque `?rappel=1` n'était épinglée nulle part — deux assertions ajoutées à `09`, dont celle qui tombe si quelqu'un range le paramètre dans un segment de chemin et fait repartir le lien dans le navigateur |
| C2.12 | [#130](https://github.com/ScratchMe/TraceVerte/issues/130) | [#166](https://github.com/ScratchMe/TraceVerte/pull/166) | 11/09/2026 | livré ; quatre « Oui », trois « Non », deux « Pas de trajet », l'originale en tête et inchangée, tableaux doublés par boucle et `checkinSansObjet` indexé par **poste** (l'écart de C2.4, même raison). Deux détails du hachage ne sont pas cosmétiques : le `>>> 0` à chaque tour, sans quoi la multiplication sort de l'entier exact des `number` et Hermes et V8 ne rendraient pas la même phrase pour la même semaine ; et FNV-1a plutôt qu'une somme de codes de caractères, deux périodes voisines ne différant que de sept jours ou d'un mois. La dérivation se nomme `variantePourLaPeriode(variantes, periodStart)` et non `repliqueDeCheckin(issue, periodStart)` : les tableaux vivent sous une clé de boucle ou de poste, donc `repliqueDuPoint` choisit la clé et délègue le tirage. Deux gardes ajoutés, un par façon d'abîmer le chantier en silence — l'originale en tête, et aucun doublon |
| C2.13 | [#151](https://github.com/ScratchMe/TraceVerte/issues/151) | [#172](https://github.com/ScratchMe/TraceVerte/pull/172) | 13/09/2026 | livré, les quatre saisons ; **sans SQL et sans toucher un seul écran** — la saison par défaut est celle du jour, donc tous les appels de `Mascot` la portent sans être modifiés, ce qui est aussi ce que dit le « Fait quand » du chantier (le 1er décembre, sans mise à jour de l'app). Le point 1 était déjà fait : `src/types/saison.ts` est livré depuis C2.14, et le chantier le dit « nouveau » — même piège que les uuid de C2.1, un texte de chantier écrit avant la vague qui le précède. **Trois écarts au canvas, tous mesurés, aucun visible à la lecture d'un chemin.** L'accessoire n'est **pas découpé** par le `clipPath` (seul l'automne l'est, parce que seul l'automne est dans le visage) : découper rognerait le pompon en lentille et couperait la goutte en deux — le clip existe parce que des joues hors du vert se lisent comme un bug, pas pour empêcher un chapeau de se porter sur la tête. La **goutte de rosée est remontée** de (−6, −37) : à sa place d'origine elle chevauche le bord de la silhouette, où elle se lit comme une éraflure du contour, et son coin arrivait à **0,08 px** du coin de la bouche de `happy` à 28 px — la taille et l'expression exactes de l'en-tête du questionnaire à la dernière étape. Et le **reflet de la goutte n'est pas repris** : 0,76 px de diamètre et sept niveaux de contraste au-dessus de la goutte, donc invisible et non discret. **Ce qui a rendu les trois visibles n'est pas une relecture mais un rendu** : la géométrie compilée, les cinq expressions × cinq tailles × cinq saisons dessinées dans un navigateur et capturées. Les deux assertions qui en sortent valent mieux que la capture — la distance **réelle** entre l'accessoire et le visage (échantillonnée, parce que les boîtes englobantes ne se croisaient pas : ce sont les formes qui se touchaient, et l'écart minimal est la marge dont on dispose, 3,5 unités, pas un seuil choisi d'avance) et la lisibilité de chaque élément, qui est ce qui a refusé le reflet. Non-vacuité vérifiée : la goutte remise à sa place du canvas fait tomber les deux. Deux relevés que le chantier ne nommait pas : `mascotSeasonGeometry` prend la **taille et non l'humeur** (aucune position ne dépend de l'expression), l'automne étant traité dans `mascotFaceGeometry` — deux couches de joues, l'une découpée et l'autre non, se verraient au bord ; et les valeurs `dark` des quatre jetons sont **dormantes**, le composant lisant `Colors.light` comme avant, ce qui est consigné sur place plutôt que laissé à deviner. **§11.11 faite le 14/09/2026** sur un build natif : les quatre saisons regardées en changeant la date du téléphone, pompon compris, sans constat |
| C2.14 | [#153](https://github.com/ScratchMe/TraceVerte/issues/153) | [#160](https://github.com/ScratchMe/TraceVerte/pull/160) | 11/09/2026 | livré |
| C3.1 | [#131](https://github.com/ScratchMe/TraceVerte/issues/131) | [#170](https://github.com/ScratchMe/TraceVerte/pull/170) | 13/09/2026 | livré ; `mobility_constrained` était calculée depuis l'increment 6, commentée « pour la restitution », et lue par **aucun** `.tsx`. Deux relevés que le chantier ne nommait pas. **`null` doit montrer la barre** : les bilans calculés avant la colonne la portent, et ne pas savoir n'est pas une contrainte — traiter `null` comme vrai retirerait la comparaison à tout l'historique d'avant l'increment 6, d'où `!== true` et non `=== false`. Et **la phrase se rend à part, pas seulement dans `comparisonNote`** : celle-ci ne parle qu'en **relecture** — en mode `nouveau` c'est `palierNote` qui la remplace — donc la loger là seul aurait fait qu'un profil en mobilité contrainte ne la voie jamais à la sortie du questionnaire, c'est-à-dire à l'endroit précis où la barre vient d'être retirée. Les deux chemins sont gardés l'un par l'autre (`palier !== null`) pour que la relecture ne la dise pas deux fois. L'échelle des barres exclut la moyenne quand sa barre ne se rend pas, sinon toutes les autres seraient raccourcies par un repère absent de l'écran |
| C3.2 | [#132](https://github.com/ScratchMe/TraceVerte/issues/132) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré ; **l'écart de périmètre est la raison d'être du bloc, pas un détail de transparence** — tous les facteurs portent l'ACV complète là où la plupart des simulateurs grand public ne comptent que l'usage, soit ×1,29 sur une thermique et ×5,57 sur une électrique, et un vélo non nul ; sans cette ligne, comparer deux résultats fait conclure que l'un des deux se trompe. Le texte **dérive** des constantes au lieu d'être écrit à côté d'elles, et `scripts/verifier-hypotheses-calcul.mjs` les compare en CI à `recompute_assessment_results` — cinquième garde de la famille « ce qui se lit n'est pas ce qui s'exécute », logée dans `scripts/` parce que le contrôle demande de lire les migrations, donc `fs`, que le tsconfig racine tient hors de `src/`. L'équivalence de `v1-07` §3.5 n'avait jamais été construite alors que la ligne d'exécution la donne pour faite : livrée accrochée à la **marche** et non au total (« ton empreinte, c'est N vols » posé en grand est un verdict), en vols et jamais en équivalent alimentaire, muette sous un vol entier. Corrigé en clôturant la vague : la phrase des hypothèses ne dit plus que la moitié du second mode est supposée pour tout le monde, puisque C3.4 la demande — elle est présentée comme ce qui s'applique à un bilan qui n'a pas répondu, et la paire est entrée dans le script de CI |
| C3.3 | [#133](https://github.com/ScratchMe/TraceVerte/issues/133) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré ; l'ambiguïté est levée **par la copie** (« Combien de vols… · un aller-retour compte pour deux ») et non en doublant les distances, qui invaliderait la quinzaine d'assertions chiffrées de pgTAP et imposerait de relever à nouveau les facteurs avion, dont la valeur dépend du km demandé |
| C3.4 | [#134](https://github.com/ScratchMe/TraceVerte/issues/134) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré en deux temps (schéma et calcul, puis les questions à l'écran), avec C3.5 et C3.6 dans la même migration. **La moitié exacte était une hypothèse déguisée en fait** : vélo + train sous-estimé de 44 %, parc-relais surestimé de 51 %, sur le poste qui décide du poste dominant donc du plan. Deux relevés que le chantier ne nommait pas. **Le CO₂ de la seconde jambe était calculé puis jeté** — il entrait dans le total mais n'était persisté nulle part, donc toutes les actions du plan se chiffraient sur la moitié du trajet : « Travailler depuis chez toi un jour » valait 128 kg au lieu de 205, et le seuil de 5 kg écartait des actions qui le franchissaient. Et **le détail doit le dire** quand une action ne porte que sur une jambe (« Sur la partie en voiture thermique de ton trajet ») : laisser la mention implicite serait pire qu'avant, le gain étant juste et la phrase laissant croire qu'il porte sur tout le trajet. La part est stockée en **fraction** et non en énumération — c'est ce que le SQL multiplie. Vérification : 21 assertions du nouveau fichier `27`, rejouées sur le distant, dont deux corrigées de ce qu'elles ont trouvé (`estimate_action_savings` arrondit son gain à l'unité ; le gabarit vélo est écarté d'un trajet de 20 km par son `max_distance_km`, donc un test qui le nommait comparait `NULL`) |
| C3.5 | [#135](https://github.com/ScratchMe/TraceVerte/issues/135) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré avec C3.4 et C3.6. Une sortie à quatre dans la même voiture comptait quatre fois, un long trajet de 700 km comptait toujours pour une personne seule. **Un écart au chantier, sur `normaliserReponses` et il ne faut pas l'uniformiser** : sur des loisirs « rarement », le covoiturage part là où la motorisation reste — le calcul lit encore les deux, mais la motorisation décrit le **véhicule** de la personne et rend le résiduel plus juste, tandis que le covoiturage décrit un **trajet** qui n'est plus déclaré, et le garder diviserait ce résiduel, donc changerait le total d'un bilan déjà soumis. Les deux assertions de division sont écrites en **rapport** et non en valeur, avec un jumeau identique à un champ près : cette forme survit à une mise à jour du référentiel ADEME. A rendu possible une garde de C3.8 — on ne propose pas de partager une voiture déjà partagée |
| C3.6 | [#136](https://github.com/ScratchMe/TraceVerte/issues/136) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré avec C3.4 et C3.5. La seule tranche sans borne haute était aussi la seule qui demandait quelque chose de plus. **Le champ est obligatoire sous la tranche ouverte**, écart assumé : facultatif, il garderait le défaut pour tous ceux qui passent sans répondre, c'est-à-dire pour à peu près tout le monde. Il se rend **après** la rangée de puces et non sous celle qui l'ouvre, à l'inverse des précisions de mode — les tranches sont un groupe qui revient à la ligne, pas une liste d'éléments. `distanceSortieKm` est la jumelle de `distanceDomicileTravailKm`, et la distance ne survit qu'à la tranche ouverte parce que le calcul la préfère à **toute** tranche |
| C3.7 | [#137](https://github.com/ScratchMe/TraceVerte/issues/137) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré ; « Rarement » saute l'étape du détail et laisse pourtant une base résiduelle dans le total — la ligne le dit maintenant, **sous la réponse qui la provoque** |
| C3.8 | [#138](https://github.com/ScratchMe/TraceVerte/issues/138) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré, les six points. **La règle que le chantier pose vaut pour les filtres à venir** : une condition qu'on ne peut pas évaluer n'est pas remplie — sans réponse, on ne propose pas. C'est l'inverse du choix de C3.1 (`mobility_constrained` nul **montre** la barre), et l'asymétrie est le raisonnement : là-bas ne pas savoir faisait cacher un repère, ici cela ferait proposer une action implausible. Coût mesuré : la base ne porte aujourd'hui aucun bilan, donc aucun plan existant ne perd d'action. Cinq relevés que le chantier ne nommait pas. **Le métro est borné à `urbain_dense`, le train et le RER ne le sont pas** — un TER dessert des communes rurales, et lui coller la même zone retirerait à ce profil la seule alternative qui lui reste. **Un tableau vide n'est pas un tableau absent** : `= any('{}')` est faux pour toute valeur, donc il écarte tout le monde là où `null` n'écarte personne ; un test l'interdit. **Les échéances dépendent du poste** — « Ce mois-ci » n'est pas une échéance pour un vol, et sur les trois proposées une seule tenait ; écart assumé au chantier, qui les voulait dépendantes du **segment**, mais un vol et un long trajet en voiture se décident au même moment. **`transport_mode_category` n'existe plus** sur `action_templates`, donc un insert recopié depuis la migration d'origine échoue ; et **l'insert n'était pas rejouable**, faute d'une contrainte disant que `action_text` est la clé naturelle du référentiel — tout le dépôt apparie par elle, rien ne le garantissait. Le point 3 a été traité en commençant par le cas de zéro action, comme le relevé de C2.5 le demandait. Vérification : le fichier `10` porté de 6 à 17 assertions (dont la branche voyages, qui n'était éprouvée nulle part), le nouveau fichier `28`, et les 25 rejouées sur le distant |
| C3.9 | [#139](https://github.com/ScratchMe/TraceVerte/issues/139) | [#174](https://github.com/ScratchMe/TraceVerte/pull/174) | 13/09/2026 | livré, les sept points ; **sans SQL**. Le point 3 était à moitié fait sans que le chantier le sache : un écran de reprise existe depuis C1.3, mais réservé aux brouillons de plus de trois semaines **et** conditionné à l'existence d'un bilan précédent — donc jamais vu par qui interrompt son premier questionnaire, c'est-à-dire par le cas que le chantier décrit. Les deux déclencheurs coexistent désormais (ils ne couvrent pas les mêmes arrivées), et « il y a un repli » cesse d'être confondu avec « l'écran s'affiche ». L'en-tête et le décompte sont neufs : « Quatre écrans déjà remplis. Il en reste cinq, en comptant celui-ci. » se **dérive** de `visibleSteps`, la même fonction que « Étape N sur M » et que la navigation — écrire « sur 9 » serait faux pour tout brouillon qui a sauté une étape, ce qui est le cas de tout profil sans trajet régulier. **Deux défauts que seul le rendu a montrés**, et qui ne se voient pas à la lecture : l'écran de reprise centrait tout son contenu, donc la barre de progression flottait au milieu de la page, où elle ne se lit plus comme une position dans un parcours ; et la phrase « Sur cet appareil seulement… » héritait d'un `type="code"` qui passait sur une ligne courte et se lisait comme une sortie technique sur trois. Trois relevés que le chantier ne nommait pas : le bouton Google portait encore la **pastille grise de la maquette** en production, et son libellé annoncé (« Continuer avec Google ») différait du texte affiché (« Se connecter avec Google ») — les deux moitiés du point 7 se tenaient ; la promesse « un historique de points mensuels » est fausse **par vieillissement** (texte du handoff, antérieur à la boucle hebdomadaire) ; et le mot de Ramille à l'entrée d'une section ne passe pas par `RamilleDit`, son visage étant déjà dans l'en-tête. Écarts consignés en `v1-14` §10 (36 à 38). **§11.12 faite le 14/09/2026**, et c'est la première chose qu'a montrée la séance : l'app tuée puis rouverte tombe bien sur « On reprend là où tu en étais » |
| C3.10 | [#140](https://github.com/ScratchMe/TraceVerte/issues/140) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré, les quatre points ; le garde-fou de volume du feedback levait `check_violation`, c'est-à-dire le **même 23514** que la contrainte de longueur, donc le client ne pouvait les distinguer qu'en cherchant « plusieurs retours » dans le texte — d'où `RM002`, reconnu au code, le message restant ce qui s'affiche. Le test 11 l'éprouvait par le message seul : il serait resté vert le jour où une reformulation aurait fait lire « Vérifie ta connexion » à quelqu'un dont le retour est simplement le onzième. La règle de voix ajoutée (jamais d'accord qui genre la personne) est gardée par une expression régulière dont le `\b` final ne se déclenchait **jamais** après un « é » — « é » n'est pas un caractère de mot en JavaScript, donc la garde ne gardait rien tant qu'on ne l'a pas éprouvée sur la phrase qu'elle interdit |
| C3.11 | [#141](https://github.com/ScratchMe/TraceVerte/issues/141) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré ; `palier.ts` affirmait que le cap demande « le même effort relatif à tout le monde », et c'est faux — il vaut 20 % du **poste dominant** et la restitution le retranche du **total**, soit −18 % pour un profil concentré à 90 % et −6,8 % à 34 %. C'est exactement la propriété qui avait fait écarter la trajectoire linéaire, et dans le même sens. **Le test qui « prouvait » l'égalité fabriquait un cap égal à 20 % du total**, une valeur que la production ne produit jamais : il éprouvait la phrase, pas la fonction. Arbitrage : on garde le cap du poste — c'est ce que les actions savent atteindre — et on le dit, `palierNote` nommant le poste sauf sur la branche où la marche s'arrête au repère 2050, où la réduction est une distance sur le total |
| C3.12 | [#142](https://github.com/ScratchMe/TraceVerte/issues/142) | [#175](https://github.com/ScratchMe/TraceVerte/pull/175) | 14/09/2026 | livré, les quatre points. **La règle a été reformulée avant d'être appliquée** : « un module testé n'importe pas `@/lib/supabase` » protégeait une chose qui n'existe plus — le client levait au chargement — et interdisait des tests utiles ; la ligne passe par ce qu'un test doit **dresser** avant de pouvoir affirmer. Quatre suites neuves (`connexion-prefs`, `saison-prefs`, la moitié locale de `notification-prefs`, `app-url`). Le chemin complet du calcul n'était éprouvé nulle part — les facteurs sont épinglés un par un, `resolve_mode` seule, mais qu'un bilan qui *répond* « grosse moto » finisse *facturé* à ce tarif, personne ne le vérifiait, et l'oubli serait silencieux ; les deux scénarios du fichier `14` dérivent leurs valeurs de `public.emission_factor(...)` plutôt que de les écrire, parce que ce qui manque est le chemin et non la valeur. Le contrôle de dérive de `database.types.ts` compare les **colonnes** et non le texte, comme la contre-vérification de l'audit l'avait demandé, et il a été éprouvé sur trois mutations fabriquées exprès. Deux relevés : les trois colonnes que le chantier dit manquantes dans l'`Insert` d'`assessment_results` **ne le sont plus** (une régénération d'une vague précédente les a rendues), et doubler `react-native` en entier passe au vert en salissant la sortie — le `setup.js` de jest-expo est privé de ce qu'il installe, et l'étaler avec `requireActual` **lit** chaque propriété du module, donc déclenche ses avertissements de dépréciation. La couverture est relevée **sans seuil** : un seuil transforme une carte en obstacle et se contourne en écrivant des tests qui touchent du code sans rien affirmer. 79 % des lignes au départ |
| C4.1 | [#143](https://github.com/ScratchMe/TraceVerte/issues/143) | | | |
| C4.2 | [#144](https://github.com/ScratchMe/TraceVerte/issues/144) | | | |
| C4.3 | [#145](https://github.com/ScratchMe/TraceVerte/issues/145) | | | |
| C4.4 | [#146](https://github.com/ScratchMe/TraceVerte/issues/146) | | | |
| C4.5 | [#147](https://github.com/ScratchMe/TraceVerte/issues/147) | [#186](https://github.com/ScratchMe/TraceVerte/pull/186) | 15/09/2026 | **requalifié** par la recette du 14/09/2026 (§12.5, [#180](https://github.com/ScratchMe/TraceVerte/issues/180)) : un démarrage impossible, pas un confort. **Livré** : page de décision [`v1-15`](v1-15-hors-ligne.md) puis marque locale, racine qui route au lieu de lever. Instantané du plan reporté (`v1-15` §7), réessai au retour de connectivité reporté (§8). **Débloque §11.5** |
| C4.6 | [#148](https://github.com/ScratchMe/TraceVerte/issues/148) | [#171](https://github.com/ScratchMe/TraceVerte/pull/171) | 13/09/2026 | livré pour A13-18 (toutes les pistes), A13-19 (le premier pas) et `p_replace` ; **A13-16 était déjà livré par C2.7** (« Ces fois-là, c'est toi qui as choisi le trajet. » et « Ce que tu as changé se voit ici. » attribuent le résultat à la personne, ce que la recommandation demandait) ; **A13-20 / D16 est reporté, avec sa raison** — une norme dynamique est une affirmation sur un comportement collectif, et la règle du dépôt est qu'une affirmation sur le monde est sourcée ou signalée comme dérivation ; la mettre dans la voix de Ramille en retire le **nombre**, pas l'affirmation, donc « de plus en plus de gens changent un trajet » sans source serait la première assertion non sourcée du produit. Le tableau des arbitrages de la §1 rattache d'ailleurs D16 à C4.7, pas ici. Trois relevés que le chantier ne nommait pas. **`p_replace` ne sert à rien s'il ne refuse pas** : `commit_plan_action` libérait et archivait déjà l'engagement précédent sans condition, donc à `true` le drapeau ne fait rien de neuf — c'est son défaut `false`, qui lève `RM001`, qui apporte quelque chose. **`revoke ... from public` ne suffit pas sur une fonction** : Supabase pose des privilèges par défaut accordant `EXECUTE` directement à `anon` et `authenticated`, donc il faut nommer les trois — c'est un contrôle de la migration qui l'a montré, pas la relecture. Et **la troncature vivait dans le SQL** : `limit 2` dans `generate_plan_cycle_for_user`, ce qui a fait changer une assertion de `02` et une de `21` (elles comptaient exactement deux actions) — la seconde compare désormais les `created_at`, qui disent la reconstruction mieux que le nombre. Un défaut du **distant** a été trouvé au passage et réparé : voir la note sur le rejeu d'un fichier ancien dans CLAUDE.md |
| C4.7 | [#149](https://github.com/ScratchMe/TraceVerte/issues/149) | | | |
| C4.8 | [#150](https://github.com/ScratchMe/TraceVerte/issues/150) | | | |
| C4.9 | [#181](https://github.com/ScratchMe/TraceVerte/issues/181) | — | 15/09/2026 | **fermé par l'expérience, sans une ligne de code.** Un rappel envoyé avec les **deux** en-têtes, même expéditeur et même boîte que le témoin de la veille : Gmail n'affiche toujours aucun bouton. L'en-tête manquant n'était donc pas la cause, et la fonction `api/` qui répondrait au POST n'aurait rien produit. Condition de réouverture écrite en §7 |
| Recette 12.2 | [#177](https://github.com/ScratchMe/TraceVerte/issues/177) | [#187](https://github.com/ScratchMe/TraceVerte/pull/187) | 15/09/2026 | livré : la taille du covoiturage se demande sous « Voiture (covoiturage) » de B1.4, par `PrecisionChiffres`, comme ses deux jumelles de C3.5 ; la condition a suivi dans `manqueDeLEtape`. **Effet de bord refermé au passage** : `commute_extra` portait son `screenTitle` sur un bloc **conditionnel**, donc qui ne covoiturait pas y arrivait sur un écran sans titre. Décision en [`v1-16`](v1-16-trois-decisions-decran.md) §3 |
| Recette 12.3 | [#178](https://github.com/ScratchMe/TraceVerte/issues/178) | [#187](https://github.com/ScratchMe/TraceVerte/pull/187) | 15/09/2026 | livré **sans migration**, ce que l'issue n'anticipait pas : `null` décrit un questionnaire en cours, jamais un bilan soumis — l'étape est visible exactement quand la question s'applique. Et rendre la colonne nullable réimporterait l'ambiguïté en base, la branche du calcul étant `if a.commute_second_mode_used and …`, où `null` se comporte comme `false`. Le repli `?? false` de l'insert est inatteignable et écrit quand même. [`v1-16`](v1-16-trois-decisions-decran.md) §4 |
| Recette 12.4 | [#179](https://github.com/ScratchMe/TraceVerte/issues/179) | [#187](https://github.com/ScratchMe/TraceVerte/pull/187) | 15/09/2026 | livré : les trois rangs de `pistesDuPlan` ne bougent pas — ils disent l'**insistance** — et la ligne simple s'ouvre en carte au toucher, donc toute action affichée est engageable. La porte de sortie du rendu (« la faire remonter ») est retirée. Une garde de **partition** s'ajoute à `plan.test.ts` : un rang qui laisserait tomber une action recréerait ici, en silence, le `limit 2` que C4.6 a retiré du serveur. [`v1-16`](v1-16-trois-decisions-decran.md) §5 |
| Recette 13.1 | [#197](https://github.com/ScratchMe/TraceVerte/issues/197) | | | « Parfois » au télétravail retire l'action à deux jours du plan, et rien à l'écran ne le dit. **Part en brief Claude Design** le 16/09/2026 ([`v1-18`](../design/v1-18-question-qui-restreint/BRIEF.md)) plutôt qu'en arbitrage direct : le remède évident — une phrase d'aide — traite le symptôme le plus visible d'un défaut qui en a sept, **7 des 16 gabarits** portant une condition de contexte qu'aucune des quatre questions de l'étape ne dit. Le seuil lui-même (C3.8) ne bouge pas |
| Recette 13.2 | [#193](https://github.com/ScratchMe/TraceVerte/issues/193) | [#201](https://github.com/ScratchMe/TraceVerte/pull/201) | 16/09/2026 | une coupure réseau à la soumission affiche la trace de pile, alors que `genreErreurSoumission(error)` a déjà rendu `'reseau'` trois lignes plus haut pour la mesure. Ne pas toucher à `decrireErreur`, qui garde les quatre autres genres |
| Recette 13.3 | [#198](https://github.com/ScratchMe/TraceVerte/issues/198) | | | **le plus lourd de la séance, et un arbitrage.** Le `row_number()` de C4.6 classe par poste dominant puis par gain : une action à 48 kg a une carte, une à 461 kg une ligne — et 461 kg dépasse le cap de la saison. Corollaire : ce tri rend presque mortes les deux branches de débordement de `cadreDuPlan`. La moitié **densité** part en brief Claude Design, écrit le 16/09/2026 : [`v1-17`](../design/v1-17-densite-du-plan/BRIEF.md) |
| Recette 13.4 | [#194](https://github.com/ScratchMe/TraceVerte/issues/194) | [#201](https://github.com/ScratchMe/TraceVerte/pull/201) | 16/09/2026 | la carte d'attente du plan dit « Rattache un compte » sans offrir de chemin ; le commentaire de `lignesDeReglage` écrit pourtant « une porte, pas un mur ». Destination « Toi » et non `/connexion`, pour ne pas ajouter de provenance à `SOURCES_CONNEXION` |
| Recette 13.5 | [#195](https://github.com/ScratchMe/TraceVerte/issues/195) | [#201](https://github.com/ScratchMe/TraceVerte/pull/201) | 16/09/2026 | `lignesPistes: { gap: 0 }` était juste pour des lignes, faux depuis qu'elles s'ouvrent en cartes (`v1-16` §5). Deux pièges : les marges ne fusionnent pas en Yoga, et les lignes fermées gardent 44 px de cible |
| Recette 13.6 | [#196](https://github.com/ScratchMe/TraceVerte/issues/196) | [#201](https://github.com/ScratchMe/TraceVerte/pull/201) | 16/09/2026 | « Note les dates que tu gardes libres, avant de réserver » ne dit ni pour quoi ni quoi réserver, là où son jumeau `remove_trip` dit un essai. **livré** : deux migrations, le référentiel puis le rattrapage de `plan_actions.first_step` — figé à la génération, donc sans lui la phrase fautive survivait jusqu'à la prochaine soumission |
| Recette 13.7 | [#199](https://github.com/ScratchMe/TraceVerte/issues/199) | [#201](https://github.com/ScratchMe/TraceVerte/pull/201) | 16/09/2026 | **basse priorité, web seulement** : la pastille d'onglet n'englobe que l'icône en disposition horizontale. Juste sur mobile — ne pas englober les deux partout |
| C5.1 | [#205](https://github.com/ScratchMe/TraceVerte/issues/205) | [#215](https://github.com/ScratchMe/TraceVerte/pull/215) | 17/09/2026 | le classement du plan : la meilleure piste du poste dominant en tête, puis gain décroissant. **livré** — et trois corrections au passage : l'écriture du canvas est refusée par Postgres (`42P20`, fenêtrage imbriqué), les tests invalidés sont **02 et 26** et non 02 et 10 (le 10 n'exerce ni le rang ni le générateur), et le scénario A n'éprouvait rien du classement faute d'avoir deux postes. Rattrapage des rangs figés, `rank` étant un ordre dérivé et non un instantané lu par la personne. Ferme la moitié « classement » de [#198](https://github.com/ScratchMe/TraceVerte/issues/198) |
| C5.2 | [#207](https://github.com/ScratchMe/TraceVerte/issues/207) | [#216](https://github.com/ScratchMe/TraceVerte/pull/216) | 17/09/2026 | la pile du plan (`plan/_layout`, `index`, `pistes`) et l'écran « Toutes les pistes ». Une route de plus : titre de page et gardes d'export (`EXPO.md` §2.1). Ferme la moitié « densité » de [#198](https://github.com/ScratchMe/TraceVerte/issues/198) **livré** — la fabrique de cartes devient un **composant partagé** (`CarteDePiste`) : la recopier aurait garanti que les deux écrans divergent sur `ActionCommitment`, le geste le plus irréversible du produit. La garde de **partition** de `v1-16` §5 déménage sur `pistesParPoste` — même objet, autre forme. Le retour après « C'est noté » est un drapeau local (`v1-17` §7.3) |
| C5.3 | [#208](https://github.com/ScratchMe/TraceVerte/issues/208) | [#216](https://github.com/ScratchMe/TraceVerte/pull/216) | 17/09/2026 | `cadreDuPlan` perd `intro` et `noteDuCap` ; l'intro dit le principe du plan. `CLAUDE.md` change dans la même PR **livré** — l'intro décrivait les deux cartes posées dessous en taisant les neuf autres ; elle dit désormais le principe. Et la note sous le cap énonçait une **règle que rien n'applique** : le classement de C5.1 l'aurait réveillée sur la plupart des plans |
| C5.4 | [#206](https://github.com/ScratchMe/TraceVerte/issues/206) | [#215](https://github.com/ScratchMe/TraceVerte/pull/215) | 17/09/2026 | le télétravail en jours (`aucun` / `un_jour` / `deux_ou_plus`), « Parfois » disparaît. **livré** — la préservation du comportement est prouvée deux fois : une table de vérité case par case dans la migration, et le seul bilan de la base qui rend les mêmes onze actions aux mêmes gains. `database.types.ts` **ne bouge pas** (pas d'`enum`, la colonne reste `text`), contrairement à ce qu'annonçait le plan. Le prédicat `teletravailSePose` est lu par les **trois** endroits, quatre mutations consignées. Ferme la moitié « question » de [#197](https://github.com/ScratchMe/TraceVerte/issues/197) |
| C5.5 | [#209](https://github.com/ScratchMe/TraceVerte/issues/209) | [#216](https://github.com/ScratchMe/TraceVerte/pull/216) | 17/09/2026 | l'encart de contexte du plan et sa porte vers `/bilan?etape=context`. L'écran n'interroge pas encore `assessment_answers`. Ferme la moitié « plan » de [#197](https://github.com/ScratchMe/TraceVerte/issues/197) **livré** — l'encart ne nomme jamais l'action écartée ni son gain ; la table des douze phrases est parcourue par son test, qui vérifie qu'aucune ne porte de chiffre. La lecture entre dans le `Promise.all` existant |
| C5.6 | [#210](https://github.com/ScratchMe/TraceVerte/issues/210) | PR_A_REMPLIR | 17/09/2026 | la carte « Ton premier plan ». Le signal demande l'archive **sans filtre de raison**, alors que la requête actuelle filtre sur `rebilan` **livré** — le relevé de précision de `v1-17` §2 était juste, et la lecture existante ne pouvait pas servir : l'élargir aurait cassé l'encart orphelin, d'où un `count` en `head` dans le **même** `Promise.all`. Un `count` nul se lit « s'est déjà engagée », parce que des deux erreurs possibles, celle qui **retire** le trait de temps au milieu d'une saison coûte plus cher. Le trait s'écrit `!premierPlan` seul, la moitié `engagement ||` du canvas étant impliquée par le signal (écart 1 de `v1-17` §9) |
| C5.7 | [#211](https://github.com/ScratchMe/TraceVerte/issues/211) | PR_A_REMPLIR | 17/09/2026 | la barre d'onglets masquée pendant le premier parcours, puis la carte « Plan et Suivi ». Sans marque, la barre est là **livré** — mais **une valeur à trois états** et non les deux marques booléennes du canvas : effacée, la première ne distingue plus « le parcours vient de finir ici » de « il n'y en a jamais eu ici », donc la carte des deux lieux se serait rendue à toute installation existante (écart 2 de `v1-17` §9). L'entrée glissée de 320 ms n'est pas rendue, faute de pouvoir envelopper `BottomTabBar` sans ajouter une dépendance (écart 3). `(tabs)/suivi/bilan.tsx` n'est finalement pas touché (écart 4). Et `display: 'none'` ne laisse **pas** de bande vide : mesuré, `[784, 60]` contre `[844, 0]` (`EXPO.md` §1.7) |
| C5.8 | [#212](https://github.com/ScratchMe/TraceVerte/issues/212) | [#216](https://github.com/ScratchMe/TraceVerte/pull/216) | 17/09/2026 | l'espace fine des milliers, `src/lib/format.ts` **et** son jumeau `api/` — les deux ensemble ou pas du tout **livré** — et le plan avait tort dans les deux sens : ce n'est ni un jumeau `api/` ni deux, c'est **zéro**. Leur branche en kilos est gardée par `kilos < 1000`, donc elle ne peut pas porter de millier ; les seuls kilos à quatre chiffres sont les gains et le cap, qui ne sortent pas de `src/` |

## 11. Vérifications sur appareil en attente

Une partie des « Fait quand » de ce document ne se prouvent pas au clavier, et deux lignes sont des
restes assumés plutôt que des vérifications. **Leur nombre ne s'écrit pas ici** : il deviendrait faux
à la ligne suivante, en silence, et c'est exactement ce qui est arrivé — le tableau *est* la liste.
Ils sont consignés ici plutôt que cochés en §10 : une ligne cochée dit « livré », et le code l'est —
ce qui manque est la preuve en conditions réelles. Même régime que `v1-11` §8 et `v1-12` §8, dont
les points restants ne sont pas repris ici.

**La première séance a eu lieu le 14/09/2026**, et chaque ligne qu'elle touche le dit en tête de sa
case. **La seconde, le 16/09/2026, n'a touché aucune ligne de cette section et ne pouvait pas** :
elle s'est tenue dans un navigateur, faute de build disponible avant le 1er octobre, et tout ce qui
est listé ici demande un appareil. Ce qu'elle a trouvé est en §13 ; qu'elle ait eu lieu ne réduit
donc **rien** de ce tableau — une ligne muette reste muette. Deux façons de la lire sans se tromper : une ligne qui commence par « Fait le 14/09/2026 » a
été regardée et n'a rien donné, ce qui n'est pas la même chose que « couverte par une suite » ; et
une ligne qui ne dit rien n'a pas été jouée, y compris quand le bloc qui la portait est revenu `ok`
sur autre chose. Ce que la séance a **trouvé** ne vit pas ici mais en §12 — elle a servi à voir, pas
à établir.

| # | Chantier | Ce qu'il faut faire, et ce qu'on cherche |
|---|---|---|
| 11.1 | C1.9 (accessibilité) | **Passage fait le 14/09/2026** (bloc 10 de la recette), sans constat : ce qui devait s'annoncer s'annonçait. Il a été fait en **sachant** quelles séries de 11.4 sont encore en `button`, donc il ne les a pas éprouvées — un second passage, après 11.4, reste utile et ne relèvera pas deux fois la même chose. Ce que la ligne demandait : un passage **TalkBack** sur onboarding, questionnaire, plan (prise d'engagement) et retour. On cherche : l'ordre de lecture du pager (les pages hors écran doivent être muettes), l'annonce « sélectionné » sur les puces et les lignes de choix, l'annonce d'en-tête sur les titres, le silence de la mascotte et des illustrations, le déplacement du focus au changement d'étape, et que les cibles tactiles atteignent 44 px sans que le texte bouge. |
| 11.2 | C1.1 (soumission) | **Approché le 14/09/2026 sans être fait** (bloc 06) : le réseau a été coupé **avant** la soumission et non entre les deux écritures. Ce qui en ressort — l'échec se dit au lieu de prétendre avoir réussi, et le second essai ne repart pas du début — vaut, mais ce n'est pas ce que cette ligne demande. Et le compte de la séance a été supprimé à la fin, donc l'absence de bilan orphelin ne peut plus s'y relire. Ce qu'il faut faire : **couper le réseau entre les deux premières écritures.** Aucune ligne `completed` sans réponses ne doit rester, et la tentative suivante doit reprendre le bilan `in_progress` au lieu d'en créer un second. Le double appui, lui, se vérifie au navigateur (le verrou est dans une `useRef`, lue dans le même tour de boucle que l'appel). |
| 11.3 | C1.10 (textes légaux) | **Fait le 14/09/2026** (bloc 00) : le chemin a été trouvé depuis un navigateur, et le compte réellement supprimé — ce qui a parcouru la cascade en vrai (§12). **À refaire quand même** juste avant la publication, pour la raison déjà écrite ici. **Un examinateur Play qui suit les instructions de `/compte/suppression` doit trouver le chemin**, sans l'app installée, depuis un navigateur neuf. À refaire juste avant la publication, puisque c'est à ce moment-là que la page est lue — et c'est aussi le moment où l'empreinte de signature de Play doit être ajoutée à `assetlinks.json` (cf. CLAUDE.md). |
| 11.4 | C1.9 (reste assumé) | **Des séries de `Chip` gardent le rôle `button` par défaut**, et elles se nomment une par une plutôt que par fichier — `commute-extra.tsx` porte désormais les deux, sa taille de covoiturage ayant été relue en contre-lisant la vague 7 et son « Oui / Non » non. Restent : les quatre séries de `steps/context.tsx`, les deux de `steps/flights.tsx`, les jours de `steps/commute-days-distance.tsx`, le « Oui / Non » de `steps/commute-extra.tsx` et les tranches de distance de `steps/leisure-detail.tsx` (choix uniques, donc `radio` dans une `View accessibilityRole="radiogroup"`), plus les deux de `plan/action-commitment.tsx` (les jours sont cumulables, donc `checkbox` dans un groupe nommé ; l'échéance est un choix unique). Un `button` qui porte `selected` est exactement la combinaison que le constat A2-8 désigne. Le geste qui les ferme est de rendre la prop **obligatoire**, ce qui les énumère au typecheck — à faire en même temps qu'elles, pas avant. |
| 11.5 | C1.4 (réseau coupé) | **Tenté le 14/09/2026, et impossible** (bloc 08) : la racine levait avant de router (§12.5), donc aucun des écrans de ce parcours n'a pu être atteint à froid. Ce qui a été vu hors ligne l'a été en cours de session, l'app déjà ouverte — la soumission d'un bilan, qui échoue bien en le disant. **Le mur est tombé le 15/09/2026 (C4.5)** : la ligne n'est plus bloquée, elle est à jouer — et elle est du même coup la seule façon de vérifier C4.5 sur appareil, par trois départs à froid en mode avion : avec un bilan soumis (attendu : le plan et son « Réessayer »), avec un brouillon seul (la reprise du questionnaire), et sur une installation neuve (l'onboarding). Ce qu'il reste à faire ensuite : **parcourir l'app en mode avion**, écran par écran : le plan, le suivi, « Toi », la réponse à un point, le choix de canal, l'envoi d'un lien, « Mes données ». Aucun ne doit affirmer un fait sur les données de la personne — ni « ton bilan n'est pas encore fait », ni « ton suivi commence au premier bilan », ni « tu n'as pas de compte ». C'est le « Fait quand » du chantier, et il ne se prouve qu'en coupant vraiment le réseau : un test ne peut pas distinguer une lecture vide d'une lecture qui n'a pas eu lieu, c'est précisément le défaut corrigé. |
| 11.6 | C1.7 (le suivi au retour) | **Fait le 14/09/2026** (blocs 05 et 06), les deux moitiés : le point était bien là en ouvrant la notification — c'est le retour de l'app au premier plan, celui qu'aucun test ne fait et qui avait cassé le 09/09/2026 — et la nouvelle barre était sur Suivi après le re-bilan. Ce que la ligne demandait : **répondre au point depuis Plan, puis toucher l'onglet Suivi** : la réponse doit y être. Puis refaire un bilan et toucher Suivi : la nouvelle barre doit y être. Le hook écoute deux retours — le focus de l'écran et le retour de l'app au premier plan — et seul le second se vérifie en mettant vraiment l'app en arrière-plan, ce qu'aucun test ne fait. Même famille que la leçon du 09/09/2026 sur le plan. |
| 11.7 | C2.9 (la sortie des rappels) | **Fait le 14/09/2026** (bloc 07), deux points sur trois : `/rappels/stop` s'ouvre bien dans le **navigateur** et pas dans l'app, et le second clic sur le même lien dit calmement que le lien n'est plus valable — puis la préférence est bien repassée sur « Aucun ». **Le bouton de la messagerie, lui, n'est pas apparu** : c'est §12.6, et c'est tout ce qui reste de cette ligne. Ce qu'elle demandait : **recevoir un vrai rappel par email, puis cliquer son lien de désinscription**, depuis une messagerie et dans un navigateur où l'app n'est pas installée. Trois choses à regarder, et **aucune n'est couverte par une suite** : que le bouton « Se désabonner » de la messagerie apparaisse au-dessus du message (c'est l'en-tête `List-Unsubscribe`, que la branche email de `send_pending_reminders` n'évalue qu'une fois les secrets Vault en place — donc jamais en CI) ; que `/rappels/stop` s'ouvre bien dans le **navigateur** et pas dans l'app (la revendication `assetlinks.json` ne couvre que `/plan`, mais c'est le genre de périmètre qui se vérifie en le faisant) ; et que le second clic sur le même lien dise « ce lien n'est plus valable » au lieu d'une panne. Le chemin passe par `generate_commute_checkins()` puis `send_pending_reminders()` — le cron entier — et non par un point inséré à la main, sinon l'étalement du `send_after` n'est pas exercé. |
| 11.8 | C2.11 (le lien de connexion) | **Fait le 14/09/2026, deux fois** (blocs 02 et 09) : depuis la session anonyme qui portait déjà un bilan, puis sur un téléphone remis à neuf (données effacées), où **tout est revenu** — les deux bilans, le plan, l'engagement, la réponse au point — sans qu'aucun écran ne dise, même une seconde, que le compte était vide. Ce chemin n'avait jamais été exercé. Ce que la ligne demandait : **ouvrir un lien de connexion `ramille://` depuis une messagerie sur un téléphone neuf**, et vérifier qu'il aboutit sur le plan, barre d'onglets comprise. Ce chemin n'a jamais été exercé sur appareil (`v1-11` §8) alors que c'est le seul accès à un compte existant, et C2.11 en dépend : l'écran de reconnexion qu'il ajoute n'a de sens que si ce lien arrive. Ne pas le confondre avec le lien du **rappel**, vérifié le 09/09/2026, qui est en `https://` et passe par `assetlinks.json`. |
| 11.9 | C2.8 (la saison qui s'ouvre) | **L'état a été fabriqué le 14/09/2026 et le bloc joué, mais la carte n'a pas reçu de constat en propre** : le seul constat du bloc 04 porte sur les pistes du plan (§12.4), et rien ne dit ce que la carte et le trait de temps ont donné. La ligne reste donc ouverte — sans plus rien à fabriquer : la saison suivante s'ouvre le **1er décembre**, et la carte se rend alors d'elle-même pendant quatorze jours. Ce qu'on cherche : **voir la carte d'ouverture et le trait de temps rendus pour de vrai**, sur un compte qui a deux cycles et dans les deux thèmes. Trois choses qu'aucune suite ne regarde : l'entrée Reanimated (la carte démarre à `opacity: 0` — si l'animation ne part pas, elle reste invisible, et c'est la famille de défaut du 08/09/2026) ; le trait de 6 px en `accentMuted` sur fond `border`, qui doit se lire comme une mesure du temps et non comme une jauge de progression ; et **Ramille sous la carte, hors du cadre**, à 44 px et penchée de −5°, qui ne doit pas avoir l'air de commenter les deux nombres juste au-dessus. Le distant ne porte aujourd'hui aucun bilan (relevé le 13/09/2026 : 21 comptes anonymes, zéro `assessments`), donc la séance demande de soumettre un bilan puis d'antidater un cycle. À faire une fois C2.13 livré si possible — la mascotte saisonnière se regarde au même endroit, et la séance coûte le même bilan à saisir. |
| 11.10 | C2.7 (l'écart par poste et le contour) | **Fait le 14/09/2026** (bloc 06) : les six barres à échelle commune et la barre-contour ont été regardées sur deux bilans à sept mois d'écart — 1 405 kg puis 784 kg, un poste dominant qui change — sans constat. Ce qui n'a pas été rapporté en propre : « Voir tout » sur un téléphone étroit. Ce que la ligne demandait : **regarder les deux cartes neuves rendues** (en clair : aucun build du produit n'affiche le thème sombre, cf. C1.11) : l'écart par poste sur le suivi (six barres à **échelle commune** — une échelle par poste rendrait un poste de 40 kg aussi long qu'un poste de 2 t, et c'est le genre d'erreur qui ne se voit qu'à l'œil), et la barre-contour sur la restitution d'un re-bilan (1,5 px en `accentMuted` : à 1 px elle disparaît à l'antialiasing, à 2 px elle pèse autant qu'une barre pleine). Demande deux bilans à quelques mois d'écart sur le même compte, donc la même séance que 11.9 — et, tant qu'on y est, la vérification que la liste des points groupée par saison tient sur un téléphone étroit avec « Voir tout ». |
| 11.11 | C2.13 (la mascotte saisonnière) | **Fait le 14/09/2026** (bloc 11) : les quatre saisons regardées sur un build natif en changeant la date du téléphone, pompon compris, sans constat — le rayon ouvert de 5,6 à 7,1 tient donc à l'œil comme il tenait au relevé de pixels. Reste la question esthétique laissée ouverte par le canvas (printemps et été peuvent rester nus), qui ne bloque plus rien. Ce que la ligne demandait : **regarder les quatre accessoires sur un vrai écran**, sur le plan, le suivi et l'onboarding — et il faut un **build natif**, la géométrie et les jetons touchant le composant. **Le point du cerne du pompon est tranché depuis le 14/09/2026 et sort de cette ligne** : le rayon extérieur est ouvert de 5,6 à 7,1 (écart 39 de `v1-14` §10). Ce qui l'a tranché n'est pas un écran de téléphone mais un rendu rastérisé à la vraie taille puis agrandi sans lissage, un carré par pixel — à 28, 36 et 48 px le cerne ne se lit **pas du tout**, et le pompon devient un point chaud sur une calotte chaude, fondu dans le bonnet. La formulation d'avant (« il fait 0,71 px, donc il se lit comme un halo ») était une déduction, pas un relevé ; c'est le genre de phrase que ce document existe pour ne plus écrire. Le remède était pré-tranché ici même — le rayon **extérieur**, jamais le cœur — et il l'est resté. Restent à regarder sur appareil : que le bonnet reste un bonnet à 28 px dans l'en-tête du questionnaire (le pompon vaut désormais 56 % de la calotte à `k` maximal, contre 44 % avant, ce qui est le principe de la compensation optique mais se regarde) ; que la calotte recouvrant le haut de la nervure ne laisse pas un moignon sous le revers ; et que les joues d'automne, découpées par la silhouette, ne se lisent pas comme une tache aplatie au bord. C'est aussi le moment de la décision laissée ouverte par le canvas : **printemps et été peuvent rester nus si quatre accessoires sont trop**. Même séance que 11.9 et 11.10. |
| 11.12 | C3.9 (la reprise) | **Fait le 14/09/2026** (bloc 01), et c'est la toute première chose qu'a montrée la séance : l'app tuée puis rouverte tombe bien sur « On reprend là où tu en étais » et non sur les quatre écrans d'onboarding. Ce que la ligne demandait : **interrompre un questionnaire, tuer l'app, la rouvrir** — et vérifier qu'on tombe sur l'écran de reprise et non sur les quatre écrans d'onboarding. C'est le « Fait quand » du point 3, et il ne se prouve qu'en tuant vraiment l'app : au navigateur, la racine est rechargée à chaque fois, donc le chemin est exercé sans l'être vraiment (l'état en mémoire n'a jamais survécu). Trois choses à regarder pendant qu'on y est : que le décompte dérivé dise la vérité pour un profil **sans trajet régulier** (le total n'est pas 9) ; que le bouton Google affiche bien le « G » officiel sur un appareil réel, où la densité d'écran diffère ; et que le mot de Ramille à l'entrée d'une section ne se lise pas comme une seconde mascotte à côté de celle de l'en-tête. |
| 11.13 | Onboarding (relevé en contre-lisant la vague 6) | **Tranché le 14/09/2026 — cette ligne ne reste que pour ce qu'un écran de téléphone dira de plus.** Le relevé initial était juste sur le chiffre (890 px de contenu à 360 de large, 896 à 390) et faux sur la cause : « l'illustration est le seul bloc compressible, et il faudrait la ramener à ~115 px » supposait qu'elle se comprimait. Elle ne le faisait plus. Depuis que la page est un `ScrollView` à `minHeight`, sa hauteur n'est plus *définie*, donc le `flex: 1` de l'illustration retombe sur sa taille **max-content** — et le `viewBox` du SVG étant carré, elle réclamait (largeur − 48) px sur **tous** les téléphones, d'où un contenu constant à ~890 px et « Découvrir mon impact » 91 px sous le pli à 360 × 640. Correctif : un plafond à **30 % de la hauteur de page** (`PART_ILLUSTRATION`, `etape-accroche.tsx`), une part et non un nombre de pixels — à nombre fixe, un grand téléphone garderait une bande vide. Mesuré après : le bouton passe au-dessus du pli dès 360 × 640 (illustration 192 px, bouton fini à 626 sur 640) et la page entière tient sans défiler à partir de 390 × 844, « J'ai déjà un compte » compris. À 320 × 568 le bouton reste 76 px sous le pli — aucune option ne sauve ce format, et la V1 est Play seulement. Reste à regarder sur appareil : que l'illustration recadrée en bandeau ~16/9 ne perde aucun de ses éléments (le `slice` et sa marge de ~50 px par bord sont faits pour ça, vérifié au rendu web mais pas sur un écran). |
| 11.14 | Onboarding, étape 2 (relevé le 14/09/2026) | **Regarder l'étape 2 sur un petit Android.** Elle est la seule des quatre construite avec un corps qui défile sous un pied épinglé, et le `ScrollView` de page ajouté pour l'étape 1 l'avait neutralisée : sous `minHeight`, son défileur interne s'étirait à ses 745 px de contenu et c'était la page entière — pied compris — qui défilait, donc « Continuer » finissait 184 px sous le pli à 360 × 640. Sa page reçoit maintenant une hauteur **définie** (`contenuDePageFixe`), et neuf gouttières de l'écran ont été resserrées. Mesuré après : à 360 × 640 on voit les deux barres de comparaison, la phrase, Transport et Logement entiers, Alimentation à 45 %, et « Continuer » ; à partir de 390 × 844 l'écran entier tient sans défiler, source comprise. Ce qu'un écran de téléphone dira de plus : si la demi-barre qui affleure sous le bouton se lit bien comme « il y a une suite » plutôt que comme un défaut de rendu — c'est le seul indice de défilement, l'indicateur ne se montrant qu'au contact. Et à 320 × 568 il reste 305 px à faire défiler dans le corps : à regarder si ce format revient dans la cible. |
| 11.15 | C3.4 · C3.5 · C3.6 · C3.8 (les questions neuves, et ce que le plan annonce) | **Fait le 14/09/2026** (blocs 01 et 06) : les quatre questions se rendent et se remplissent sur un vrai écran, et côté plan l'intro et la note sous le cap ne se sont pas lues comme deux fois la même phrase. **Deux constats en sont sortis, tous deux sur la première question** — le placement de la taille du covoiturage (§12.2) et le binaire du second mode (§12.3). Ce que la ligne demandait : **regarder les quatre questions ajoutées au questionnaire et les deux lignes ajoutées au plan sur un vrai écran.** Ce qui a été mesuré au navigateur le 14/09/2026, sur l'export statique piloté en Playwright à 360 × 640 et 390 × 844 : les quatre blocs se rendent là où ils doivent (la part du second mode sous le mode choisi, la taille du covoiturage sous « Voiture (covoiturage) », la distance libre sous « Plus de 30 km », l'occupation sous la motorisation des longs trajets) ; « Suivant » reste épinglé et finit à 601 px sur chacune des étapes, donc au-dessus du pli même à 640 ; le corps garde 37 à 795 px à faire défiler selon l'étape ; aucune erreur JavaScript n'est levée. Ce qu'un téléphone dira de plus, et qu'un navigateur ne peut pas dire : qu'un encart de précision qui s'ouvre **sous** la puce qu'on vient de toucher ne la pousse pas hors de l'écran au moment où le doigt masque déjà le tiers bas ; que les cinq puces d'occupation restent lisibles en `flex` sur 360 dp, où celles de « jours par semaine » avaient déjà été rognées ; et, côté plan, que l'intro et la note sous le cap ne se lisent pas comme deux fois la même phrase. Le reste relève du passage TalkBack de 11.1, où les trois `radiogroup` nommés neufs sont à écouter comme les autres. |
| 11.16 | §12.2 · §12.3 · §12.4 (les trois décisions d'écran, [`v1-16`](v1-16-trois-decisions-decran.md)) | **Ouverte le 15/09/2026, le jour où les trois ont été livrées.** Aucune ne se prouve par une suite : ce sont des changements de placement, de défaut et d'affordance. Trois choses à regarder. **§12.2** : que la taille du covoiturage, remontée sous « Voiture (covoiturage) » de B1.4, se lise comme une précision de l'option et non comme une question de plus — et que l'écran suivant, réduit à sa seule question, ne paraisse pas vide. **§12.3** : qu'un questionnaire **vierge** arrive sur B1.6 sans rien de coché et que « Suivant » reste inactif ; le constat d'origine avait failli partir à l'envers, ce qui avait été vu à l'écran (« Oui » coché) étant le préremplissage d'un re-bilan et non le défaut — donc la séance doit partir d'un compte **sans bilan précédent**. **§12.4** : qu'une ligne dépliée en carte reste lisible au milieu des autres, que « Choisir » se voie comme une permission et pas comme une étiquette, et que s'engager depuis là fasse bien remonter l'action en tête au rafraîchissement. Demande un plan à **cinq actions au moins**, sans quoi le troisième rang n'existe pas. |

**Ce que la séance du 14/09/2026 laisse.** 11.6, 11.8, 11.10, 11.11 et 11.12 ont été regardées sans
rien donner ; 11.1 et 11.3 aussi, mais pour une raison qui les rouvre (les séries de 11.4 étaient
connues et non éprouvées ; la page de suppression se relit à la publication) ; 11.7 est faite aux
deux tiers, son dernier tiers étant devenu un chantier (§12.6) ; 11.15 est faite et a produit deux
constats. Restent trois lignes, et chacune attend une chose différente : **11.2** un autre état (le
réseau coupé *entre* les deux écritures), **11.9** un autre moment (le 1er décembre, où la carte
d'ouverture se rend d'elle-même), **11.5** un chantier d'abord — elle était derrière le mur de §12.5,
tombé le 15/09/2026, et elle est donc à jouer à la prochaine recette. 11.4, qui n'a jamais été une vérification sur appareil mais un reste
de code, ne bouge pas.

**Et la séance en a ouvert une de plus qu'elle ne pouvait pas jouer** : **11.16**, les trois
décisions d'écran qu'elle a fait naître et qui ont été livrées le lendemain. La prochaine recette
porte donc quatre lignes — 11.2, 11.5, 11.9 et 11.16 — et trois d'entre elles se jouent sur le même
compte : 11.5 demande un départ à froid hors ligne, 11.16 un questionnaire vierge puis un plan à
cinq actions, 11.9 le 1er décembre et rien d'autre.

Le seul groupement qui tienne encore est celui de 11.1, 11.4 et 11.15 : le passage TalkBack sera plus
utile une fois les séries restantes reprises, sinon il relèvera chaque fois le même défaut déjà
connu — celui du 14/09 l'a d'ailleurs entendu en le sachant, ce qui est exactement le temps perdu que
cette phrase annonçait. 11.9 et 11.10 n'attendent plus C2.13, livré et regardé.

## 12. Ce que la recette sur appareil du 14/09/2026 a trouvé

Première séance sur l'APK `preview` du build `0e0d9a89` (commit `58ffda2`), sur un compte réel avec
sa saison passée fabriquée côté serveur. Le protocole suivi est l'artefact « Recette Ramille sur
appareil » — douze blocs, **tous joués, tous avec un verdict**. **Six constats, un corrigé dans la
foulée et cinq à trancher** ; ils sont ici et non en §11 parce qu'ils ne demandent pas un appareil
pour être compris : l'appareil a servi à les voir, pas à les établir. Une issue par constat
ouvert — [#177](https://github.com/ScratchMe/TraceVerte/issues/177), [#178](https://github.com/ScratchMe/TraceVerte/issues/178), [#179](https://github.com/ScratchMe/TraceVerte/issues/179), [#180](https://github.com/ScratchMe/TraceVerte/issues/180), [#181](https://github.com/ScratchMe/TraceVerte/issues/181) — et **les
cinq sont accrochés à la vague 8 en §2.3**. C'est là qu'un futur passage les retrouvera : cette
section dit ce qui a été vu, §2.3 dit quand on s'en occupe.

**Les cinq sont clos le 15/09/2026, au lendemain de la séance.** [#181](https://github.com/ScratchMe/TraceVerte/issues/181)
sans une ligne de code (l'expérience de C4.9 a écarté l'hypothèse qui justifiait le chantier),
[#180](https://github.com/ScratchMe/TraceVerte/issues/180) par C4.5 ([`v1-15`](v1-15-hors-ligne.md)),
et les trois décisions d'écran par [`v1-16`](v1-16-trois-decisions-decran.md). Ce qui reste de la
séance n'est donc pas un constat mais une **vérification** : les trois changements d'écran ne se
prouvent que sur appareil, et ils rejoignent §11 — où §11.5, que C4.5 vient de débloquer, les
attend déjà.

**Quatre choses ont été vérifiées en production que rien n'avait jamais montrées**, et aucune n'était
au programme. La **reconduction d'un engagement** au changement de saison (C2.2) : le cycle sur lequel
la personne s'était engagée a été reculé d'une saison, et son engagement a bien été recopié dans le
cycle neuf avec l'étiquette « · RECONDUIT ». Puis, au re-bilan, le gabarit engagé a disparu du plan
(les vols passés à zéro) et l'engagement a été **archivé** au lieu d'être perdu — l'autre moitié de la
même promesse. « Le palier que tu visais est derrière toi. » s'est affichée, ce qui demandait deux
bilans dans deux périodes distinctes. Et la séance s'est refermée sur une **vraie suppression de
compte** depuis `/compte/suppression` : les neuf tables relevées ensuite pour cet identifiant rendent
zéro ligne, `auth.users` comprise. La chaîne `on delete cascade` qu'un test pgTAP vérifie niveau par
niveau a donc été parcourue une fois pour de bon — et c'est aussi pourquoi plus rien de ce compte
n'est interrogeable aujourd'hui, ce qu'il faut savoir avant de vouloir y relire quoi que ce soit.

| # | Constat | Statut |
|---|---|---|
| 12.1 | **La feuille des rappels promettait le mauvais jour.** Après « C'est noté » sur une action de **voyages**, elle disait « Lundi, je reviens te demander si tu l'as faite ». Le point du lundi s'apparie sur le poste `commute` (C2.1) : il ne demande jamais rien sur un vol — constaté en base le même jour, le point hebdomadaire étant sorti en question générique. La variante se dérivait de la personne (« a-t-elle un poste domicile-travail »), avec le raisonnement « c'est le prochain contact qui compte, pas l'action engagée » — vrai pour la **carte d'attente**, faux pour une phrase qui dit « si tu **l'**as faite ». | **Corrigé** le 14/09/2026 : `boucleDeLAction` (`src/types/rappels.ts`), le poste voyage avec `onEngage`, et la feuille ne dépend plus de `boucle`. |
| 12.2 | **La taille du covoiturage du trajet quotidien est sur l'écran suivant**, alors que les deux questions identiques ajoutées par C3.5 (sorties, longs trajets) s'ouvrent **sous l'option choisie**. Trois fois « vous êtes combien », deux motifs. Reste d'avant C3.5, qui a introduit le motif imbriqué sans reprendre l'ancienne ; la contre-lecture du 14/09 a aligné leurs **rôles d'accessibilité** sans voir que le **placement** divergeait. | **Tranché et livré le 15/09/2026** — [#177](https://github.com/ScratchMe/TraceVerte/issues/177) ; la taille se demande sous l'option de B1.4, comme ses deux jumelles. Décision en [`v1-16`](v1-16-trois-decisions-decran.md) §3 |
| 12.3 | **Le binaire du second mode n'a pas d'état « pas encore répondu ».** `commute_second_mode_used` est un `boolean` dont le défaut est `false`, donc « Non » est pré-coché sur un questionnaire vierge et `manqueDeLEtape` ne bloque pas : on traverse la question sans jamais décider. C'est le motif que C3.4, C3.5 et C3.6 ont corrigé ailleurs — « laisser le choix facultatif revient à garder le défaut pour tous ceux qui passent sans répondre ». | **Tranché et livré le 15/09/2026** — [#178](https://github.com/ScratchMe/TraceVerte/issues/178) ; troisième état côté client, **sans migration** : `null` décrit un questionnaire, pas un bilan. [`v1-16`](v1-16-trois-decisions-decran.md) §4 |
| 12.4 | **Le plan affiche des actions qu'on ne peut pas choisir.** Au-delà du quatrième rang, les pistes sont des lignes sans bouton (C4.6, trois rangs). La hiérarchie se défend — « une liste de six cartes pleines ne présente plus un choix, elle présente un catalogue » — mais la porte de sortie écrite dans le code (« s'engager sur l'une d'elles demande d'abord de la faire remonter, ce que le prochain re-bilan fait si le poste bouge ») demande à la personne de changer pour que l'app la réordonne. C4.6 existait précisément parce que « l'autonomie de la personne s'exerçait sur deux leviers » : elle s'exerce maintenant sur quatre, pas sur toutes celles qu'on lui montre. | **Tranché et livré le 15/09/2026** — [#179](https://github.com/ScratchMe/TraceVerte/issues/179) ; les trois rangs restent, la ligne s'ouvre en carte au toucher. [`v1-16`](v1-16-trois-decisions-decran.md) §5 |
| 12.5 | **Hors ligne et à froid, la racine est un mur.** Mode avion, app complètement fermée puis rouverte : « Le démarrage a échoué », suivi du `Unable to resolve host …` d'Android. `src/app/index.tsx` lève quand la lecture d'`assessments` échoue **et** qu'il n'y a pas de brouillon — or le brouillon est effacé à la soumission, donc **toute personne qui a déjà soumis un bilan a une app inutilisable au démarrage sans réseau**. Le questionnaire compris, que le dépôt décrit pourtant comme se remplissant très bien hors ligne : sa seule entrée est l'état vide d'un onglet, derrière la racine. Tout le soin de C1.4 vit derrière ce mur et n'est jamais atteint à froid. | **Tranché et livré le 15/09/2026** — [#180](https://github.com/ScratchMe/TraceVerte/issues/180), c'est **C4.5**, qu'il requalifie ; décision en [`v1-15`](v1-15-hors-ligne.md) |
| 12.6 | **Le bouton « Se désabonner » de la messagerie n'apparaît pas.** Le message portait bien `List-Unsubscribe` (corps installé de `send_pending_reminders` relu le même jour) et pas de `List-Unsubscribe-Post` ; Resend le donne `delivered` ; Gmail n'a rien affiché au-dessus. Deux causes possibles que ce constat ne sépare pas — Gmail veut les deux en-têtes (RFC 8058), ou Gmail ne rend ce bouton qu'aux expéditeurs qu'il classe en courrier de masse — et une expérience à un message les sépare. Ce qui a changé, c'est la prémisse de la décision : « la page est un export statique, elle ne peut pas répondre à un POST » reste vrai de la **page**, mais le dépôt sert déjà des Vercel Functions depuis `api/`. | **Tranché le 15/09/2026** : l'expérience à un message a écarté l'hypothèse de l'en-tête (voir §7, C4.9). Rien à construire — [#181](https://github.com/ScratchMe/TraceVerte/issues/181) |

**Un piège de méthode, à ne pas répéter.** Le protocole annonçait un pourcentage sur la note de
variation de la **restitution**. Il n'y en a pas, et c'est voulu : `variationDepuisLeBilanPrecedent`
donne l'écart absolu seul (« les barres sont en tonnes, "8 % de moins" ne se rattache à rien de ce
qu'on y voit »), tandis que `variationNote` — les kilos **puis** le pourcentage — est celle de
l'onglet Suivi. L'attendu avait été écrit pour l'une et posé sur l'autre, et a fait perdre du temps
à chercher un défaut qui n'existait pas. **Un attendu de recette nomme l'écran d'où il vient.**

**Et un second, symétrique : ce qu'on voit sur un appareil n'est pas toujours ce qu'on croit
relever.** Le constat 12.3 a été signalé comme « l'option sélectionnée par défaut est Oui ». Elle
l'était — mais parce que c'était un **re-bilan**, et que le questionnaire se préremplit depuis le
dernier bilan complété, où le second mode était le train. Ce comportement-là est exactement le bon.
Le défaut est en dessous, et il ne se voit qu'en lisant : le type ne porte pas d'état « pas encore
répondu », donc un questionnaire **vierge** arrive avec « Non » pré-coché. Écrire le constat tel
qu'il a été vu l'aurait rendu faux et probablement classé sans suite. **Un constat de recette se
relit dans le code avant d'être consigné**, et ce qui s'y écrit est ce que le code fait — pas ce que
l'écran a montré ce jour-là, sur cet état-là.

## 13. Ce que la recette web du 16/09/2026 a trouvé

Deuxième séance, d'une autre nature que celle du 14/09 : **un navigateur**, faute de build EAS
disponible avant le 1er octobre (quota du plan gratuit, registre d'exploitation §3.3). Fenêtre de
navigation privée sur `www.ramille.fr`, commit `b033b37`, et le **blocage de requêtes de DevTools**
comme instrument — `https://nuugfepfsypqgvsvyzht.supabase.co/*` pour couper toute l'API,
`…/rest/v1/assessment_answers*` seul pour n'arrêter que l'écriture des réponses. C'est ce qui rend
la séance possible sans appareil : le site est servi par Vercel, seul le dialogue avec la base
tombe, et une requête coupée se comporte comme une vraie coupure (`status: 0`).

Dix blocs, tous joués. **Sept constats**, aucun bloquant, et une série de vérifications qui
n'avaient jamais été faites en conditions réelles. Une issue par constat sauf 13.3, qui en réunit
deux — les arbitrer séparément reviendrait à arbitrer deux fois. Les sept sont accrochés à la vague
8 en §2.3.

### Ce qui est vert, et qui ne l'avait jamais été autrement que par un test

- **Le bilan fantôme est fermé.** Soumission coupée entre les deux écritures : la base garde un
  bilan `in_progress`, `submitted_at` nul, **0 réponse, 0 résultat, 0 cycle de plan**. La racine
  routant sur `completed`, cette ligne est invisible pour tout le produit — c'est exactement ce que
  `20260911120000_soumission_bilan.sql` promet.
- **La reprise réutilise la ligne.** Blocage retiré, soumission rejouée : **même `id`, même
  `created_at`**, passage en `completed`, `submitted_at` posé par le trigger serveur. Pas de
  doublon, pas d'orphelin.
- **Les chiffres du plan tiennent.** Cap − 451 kg = 20 % × 2 254,6 ; parts d'empreinte 43 % et 7 %
  contre un total de 3 740 kg ; « Voir d'autres pistes · 9 » = 11 − 2 ; le trait de saison à ~17 %
  le 16ᵉ jour sur 91, avec sa légende ; la période nommée dans la carte du cap et la puce
  « Cadence » bien absente (C2.8).
- **Les échéances suivent le poste** : une action de voyages propose les échéances de voyages, pas
  « Ce mois-ci » (C3.8).
- **L'appariement par poste de C2.1, vu pour la première fois en vrai.** Le point hebdomadaire
  généré porte sur une semaine **dans** le cycle, l'appariement a donc cherché une action engagée
  sur le poste `commute`, n'en a pas trouvé (l'engagement porte sur les voyages) et a produit la
  question générique. C'est mot pour mot ce que le chantier promettait d'empêcher : « sans
  l'appariement, une action engagée sur les loisirs aurait nommé la question du trajet
  domicile-travail ».

### Les sept constats

| | Constat | Suite |
|---|---|---|
| 13.1 | **« Parfois » au télétravail coûte une action, et rien ne le dit.** `teletravail_admissible` vaut `array['oui','parfois']` sur « un jour » et `array['oui']` sur « deux jours » : répondre « Parfois » retire du plan l'action la plus rentable du poste domicile-travail (461 kg/an contre 230). Or la question porte sur la **possibilité**, et rien à l'écran ne dit que la réponse décide de quelque chose — le motif de C3.4 / C3.5 / C3.6 et du second mode, une quatrième fois. | [#197](https://github.com/ScratchMe/TraceVerte/issues/197) — part en **brief Claude Design** : [`v1-18`](../design/v1-18-question-qui-restreint/BRIEF.md) |
| 13.2 | **Une coupure réseau répond par une trace de pile.** Sous la phrase française correcte, la soumission affiche le retour brut de `decrireErreur` — cinq lignes de bundle minifié, en anglais. `decrireErreur` n'est pas en cause (il évite le « [object Object] » corrigé le 14/09) : le défaut est que **le même `catch` a déjà classé l'erreur** en `'reseau'` trois lignes plus haut, pour la mesure, et que `setDetail` ne regarde pas ce genre. Le cas d'échec le plus probable en production est le seul où le détail ne dit rien. | [#193](https://github.com/ScratchMe/TraceVerte/issues/193) |
| 13.3 | **Le plan enfouit son meilleur levier, et le déplié franchit sa propre limite de densité.** Le `row_number()` de C4.6 classe par poste dominant **puis** par gain : sur ce profil, une action à 48 kg a une carte et une action à **461 kg** une ligne simple — alors que 461 kg dépasse à elle seule le cap de la saison (451 kg). Corollaire non prévu : ce tri rend **presque mortes** les deux branches de `cadreDuPlan` écrites pour annoncer le débordement, qui ne lisent que les deux cartes pleines. Et « déplier + ouvrir les lignes » mène à onze cartes pleines, quand C4.6 pose quatre comme limite (« au-delà, c'est un catalogue ») ; « Replier », rendu avant le bloc déplié, est alors hors écran. | [#198](https://github.com/ScratchMe/TraceVerte/issues/198) — la moitié densité part en **brief Claude Design** : [`v1-17`](../design/v1-17-densite-du-plan/BRIEF.md) |
| 13.4 | **« Rattache un compte » sur le plan est un mur.** La carte d'attente est un `ThemedView` nu : la phrase dit quoi faire, et rien ne permet de le faire. Le commentaire de la fonction sœur `lignesDeReglage` écrit pourtant la doctrine — « une porte, pas un mur ». Le remède a son motif dans le dépôt (le lien « Ouvrir les réglages du téléphone », qui n'existe que dans l'état qui le réclame et se rend sous la ligne qui le porte) ; la destination est « Toi » et non `/connexion`, ce qui évite d'ajouter une provenance à `SOURCES_CONNEXION`. | [#194](https://github.com/ScratchMe/TraceVerte/issues/194) |
| 13.5 | **Une ligne dépliée en carte se colle à sa voisine.** `lignesPistes` porte `gap: 0` — juste pour des lignes, faux pour des cartes, `ActionCard` n'ayant aucune marge extérieure. Né avec `v1-16` §5, qui a rendu les lignes dépliables sans que le conteneur ne le sache. Deux pièges à l'implémentation : en Yoga **les marges ne fusionnent pas**, et les lignes fermées doivent garder 44 px de cible tactile. | [#195](https://github.com/ScratchMe/TraceVerte/issues/195) |
| 13.6 | **Le premier pas du vol long-courrier ne décrit pas un essai.** « Note les dates que tu gardes libres, avant de réserver » laisse deux trous — libres pour quoi, réserver quoi — et « avant de réserver » contredit l'action qu'il amorce. Ce n'est pas un mauvais appariement : c'est que **le jumeau du même geste** (`remove_trip` court-courrier) dit « Regarde lequel de tes déplacements prévus tient sans avion », qui est un essai. | [#196](https://github.com/ScratchMe/TraceVerte/issues/196) |
| 13.7 | **La pastille d'onglet actif n'englobe que l'icône.** Sur mobile, le libellé est sous l'icône et la pastille se lit comme appartenant au couple (Material 3, canvas `v1-11`). Sur le web à largeur de bureau, la barre bascule en disposition horizontale et la pastille se retrouve à côté du libellé. **Basse priorité** — V1 est Google Play, et il ne faut surtout pas englober les deux partout. | [#199](https://github.com/ScratchMe/TraceVerte/issues/199) |

### Cinq des sept sont corrigés le jour même

Cinq constats se corrigent sans rien arbitrer : ils ont un remède que le dépôt écrit déjà
ailleurs. **Les deux autres partent en brief Claude Design**, et ce n'est pas un oubli : la moitié
densité de **13.3** ([`v1-17`](../design/v1-17-densite-du-plan/BRIEF.md)), et **13.1** — « Parfois »
au télétravail — le même jour ([`v1-18`](../design/v1-18-question-qui-restreint/BRIEF.md)). Le second
était d'abord noté « arbitrage produit » ; ce qui l'a fait basculer est le relevé en base fait pour
écrire le brief — **7 des 16 gabarits d'action** portent une condition de contexte, donc le
télétravail n'est pas un cas isolé à trancher mais le plus net d'une étape entière qui restreint
sans le dire. Les deux briefs se nomment mutuellement : l'un porte sur ce que le plan montre,
l'autre sur ce qu'il tait.

Le **relevé de fichiers** avant d'écrire, comme la règle l'impose : un seul fichier est partagé,
`src/app/(tabs)/plan.tsx`, entre 13.4 et 13.5 — faites en séquence. Les trois autres sont
disjoints.

| | Ce qui change | Ce qui l'éprouve |
|---|---|---|
| **13.2** | Le genre de l'erreur est calculé **une fois** dans le `catch` et sert deux fois : la mesure, et le détail. Sur `reseau`, pas de détail du tout — `decrireErreur` ne bouge pas, les quatre autres genres le gardent | La composition tient par ses deux bouts déjà testés (`genreErreurSoumission` d'un côté, le `{detail && …}` de `StepShell` de l'autre) ; ce n'est pas une vérification de bout en bout et ça ne se prétend pas |
| **13.4** | `carteAttente` rend une `action` à côté de son `detail` ; le plan pose un `TextLink` **sous** le détail, vers « Toi ». L'invariant est écrit sur le sens : la porte se rend là où le canal est `aucun` **et** où la carte dit quelque chose | Une assertion exhaustive sur les 144 combinaisons, avec sa garde de non-vacuité. Trois mutations, trois échecs : porte partout (6 rouges), porte sur le seul canal (4), porte retirée de l'état par défaut d'une session anonyme (2) |
| **13.5** | La règle d'écart sort de l'écran (`separationsDesLignes`, `src/types/plan.ts`) : **un écart par frontière dont un voisin au moins est une carte**, porté par le second des deux — Yoga ne fusionne pas les marges | Six assertions, dont celle qui compte une seule séparation entre deux cartes voisines. Trois mutations, deux rouges à chaque fois, jamais les mêmes deux |
| **13.6** | Le premier pas devient « Regarde lequel de tes projets de voyage peut attendre, ou se passer plus près. » — même verbe que son jumeau, et un essai. Deux migrations : le référentiel, puis le **rattrapage** de `plan_actions.first_step`, figé à la génération | Les trois chemins du contrôle joués sur le distant en `BEGIN`/`ROLLBACK` : appliquer, rejouer (sans effet, sans lever), et premier pas réécrit entre-temps (lève). Puis appliqué, et la ligne engagée relue |
| **13.7** | `tabBarLabelPosition: 'below-icon'` : la barre garde à toute largeur la disposition du kit, qui est en `flexDirection: 'column'` sans condition. On n'englobe **pas** l'icône et le libellé | Mesuré sur l'export servi en local, lu par Playwright, **avec et sans la ligne** : sans elle, à 1280 px, le libellé passe à 27 px à droite de l'icône (même `y`) ; avec, il reste 25 px dessous, à 1280 comme à 390 |

**Deux choses valaient d'être sorties du fichier d'écran pour devenir éprouvables** : la règle
d'écart de 13.5 et l'invariant de porte de 13.4. Le constat 13.5 le disait lui-même — « aucune
assertion ne porte sur l'espacement, ce qui est justement pourquoi la CI ne l'a pas vu ».

**Et un rattrapage de colonne figée a été fait, ce qui n'est pas anodin** : `plan_actions.first_step`
porte une copie de la phrase, et sans le rattrapage la personne qui a une action de voyages engagée
aujourd'hui aurait continué de lire la phrase fautive jusqu'à sa prochaine soumission — c'est-à-dire
sur la carte même où le défaut a été trouvé. La frontière entre ce qui se rattrape et ce qui ne se
rattrape **jamais** (une question déjà posée, un libellé snapshoté, un chiffre annoncé) est écrite en
`SUPABASE.md` §2.3.

### Ce que le web ne prouve pas, et pourquoi

- **La boucle de rappel, en entier.** Aucun canal n'existe pour une session anonyme sur le web : pas
  de jeton d'appareil, pas d'adresse. `enqueue_checkin_reminders` n'a donc **rien mis en file**, ce
  qui est correct — et confirme au passage le libellé de la carte d'attente de 13.4. Sans ligne
  d'outbox, pas de jeton, donc `/rappels/stop` n'est jouable qu'aux deux tiers : le refus
  non-divulgant d'un uuid inconnu et le garde de forme sur un jeton tronqué, oui ; le chemin
  nominal, non.
- **« La question du point nomme l'action engagée » sur la boucle mensuelle.** Voir la leçon de
  méthode ci-dessous : ce n'est pas un défaut du produit, c'est une limite de la manipulation.
- **Tout ce qui demande un appareil** reste en §11 : le push, TalkBack, le lien `ramille://`, les
  App Links. La séance n'y touche pas.

### Deux leçons de méthode

**Forcer un générateur hors de sa date de cron produit une question sur une période antérieure au
cycle de plan.** L'appariement de C2.1 est
`v_period_start between pc.period_start and pc.period_end` : lancé un **16** du mois,
`generate_extras_checkins()` pose `period_start` au 1er août, or le cycle commence le 1er septembre.
Aucune action ne peut alors être appariée, et la question retombe sur le générique — ce qui **a
l'air** d'un défaut de C2.1 et n'en est pas un. En production le cron passe le 1er, la période
interrogée est dans le cycle, et l'action est nommée. Deux contournements, aucun gratuit : attendre
un vrai 1er du mois, ou engager une action du poste domicile-travail, dont le point hebdomadaire
tombe bien dans le cycle — au prix de l'archivage de l'engagement en cours (C2.2).

**Un faux positif se consigne aussi.** Le bloc « Estimations sur la base des facteurs ADEME… » du
plan s'affiche en chasse fixe, ce qui se lit comme une police qui n'a pas chargé. C'est `type="code"`
(`Fonts.mono`, 12 px, tertiaire), le registre des notes techniques du produit, employé à dix-neuf
endroits. Vérifié avant d'être signalé — et écrit ici pour que la prochaine recette ne le resignale
pas.
