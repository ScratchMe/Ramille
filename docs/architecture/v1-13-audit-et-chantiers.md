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
| C2.13 | La mascotte porte la saison | P2 | moyen | C2.8, canvas v1-14 | décision du 10/09 (hors audit) |
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
| C4.5 | Hors-ligne : ouvrir sur le dernier plan connu ; session expirée | P4 | grand | C1.4 | — |
| C4.6 | Voir d'autres pistes, premier pas, cadrage identitaire | P4 | moyen | C2.7 | D18, D16 |
| C4.7 | Retirer un bilan erroné | P4 | moyen | — | — |
| C4.8 | Comparaison même saison, un an après | P4 | moyen | C2.8 | — |

### 2.2 Fichiers chauds et parallélisation

Plusieurs chantiers touchent les mêmes fichiers. Pour confier des chantiers en parallèle sans
conflit, éviter de lancer ensemble ceux qui partagent une ligne ci-dessous, ou les faire
rebaser dans l'ordre indiqué.

| Fichier | Chantiers |
|---|---|
| `src/app/(tabs)/plan.tsx` | C1.4, C1.6, C1.8, C2.2, C2.6, C2.7, C2.8, C2.11, C3.8 |
| `src/app/(tabs)/suivi/bilan.tsx` | C1.8, C2.7, C3.1, C3.2, C3.10, C3.11 |
| `src/app/(tabs)/suivi/index.tsx` | C1.4, C1.7, C1.8, C2.7, C2.8 |
| `src/components/checkin-card.tsx` | C1.4, C1.12, C2.1, C2.4, C2.6 |
| `src/constants/mascotte.ts` | C2.4, C2.7, C2.12, C3.9, C3.10 |
| `src/types/mascot.ts`, `src/components/mascot.tsx` | C2.13 |
| `src/app/bilan/index.tsx`, `src/types/bilan.ts` | C1.1, C1.3, C3.3, C3.4 |
| `src/lib/format.ts` | C1.8 |
| Fonctions SQL de génération de check-ins (`generate_*_checkins`, `enqueue_checkin_reminders`) | C2.1, C2.3, C2.5, C2.9 |
| `generate_plan_cycle_for_user`, `estimate_action_savings` | C1.1, C2.2, C3.4, C3.8 |
| `recompute_assessment_results` | C2.5, C3.3, C3.4, C3.5, C3.6 |
| `src/app/confidentialite.tsx`, `conditions.tsx`, `compte/suppression.tsx` | C0.6, C1.10, C2.9 |
| `CLAUDE.md` | C0.7, C1.13, et tout chantier qui change un comportement décrit |

**Vagues suggérées** (chaque vague est parallélisable en interne) :

1. **Vague 1** — C0.1, C0.2, C0.3, C0.4, C0.6, C0.7 ; puis C0.5.
2. **Vague 2** — C1.1, C1.2, C1.3, C1.5, C1.9, C1.10, C1.11, C1.12 (fichiers disjoints).
3. **Vague 3** — C1.4, C1.6, C1.7, C1.8, C1.13 (tous touchent les écrans d'onglets : les enchaîner).
4. **Vague 4** — C2.2, C2.3, C2.5, C2.6, C2.11 (après arbitrages D2 et D5).
5. **Vague 5** — C2.1, C2.4, C2.7, C2.8, C2.9, C2.10, C2.12, C2.13 (après la vague 4 ; C2.12 après
   C2.4 ; C2.13 après C2.8 et le canvas v1-14).
6. **Vague 6** — le lot 3 : C3.1, C3.2, C3.3, C3.7, C3.10, C3.11, C3.12 sans arbitrage ; C3.4,
   C3.5, C3.6, C3.8, C3.9 ensuite (C3.4 à C3.6 touchent `recompute_assessment_results` et se
   font **en une seule migration** si possible, pour ne recalculer la suite pgTAP qu'une fois).
7. **Vague 7** — le lot 4, chantier par chantier, chacun précédé d'une décision écrite.

**Le lot 2 passe d'abord par un canvas Claude Design** (décision du 10/09/2026 ; brief :
`docs/design/v1-14-boucle-engagement/BRIEF.md`, qui donne aussi au canvas mandat de proposer des
évolutions du design existant, dans les limites de §8). La partie **écran** de C2.1, C2.4, C2.7,
C2.8, C2.10, C2.12 et C2.13 attend sa direction ; leur partie **serveur** — migrations, RPC,
générateurs de points — peut partir avant, comme les vagues 1 à 3.

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
ce qui **survit** (C2.2), puis ce qui **se voit** (C2.7, C2.8), enfin ce qui **part** (C2.9, C2.10, C2.11), ce qui **répond** (C2.12), et ce qui **se voit sans
un chiffre** (C2.13). Les moments d'écran de ce lot se dessinent d'abord (canvas v1-14, §2.2).

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

**Tests.** `suivi.test.ts` : variation en baisse, prédécesseur strict, écart par poste, date locale,
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

### C2.12 — Variantes des répliques de check-in

**Priorité** P2 · **Effort** petit · **Dépend de** C2.4 · **Arbitrage** D12 (rendu contre la recommandation) · **Constats** A13-17, A9-21 (partie).

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

**Ne pas faire.** Une sixième expression. Une saison qui change l'humeur (l'hiver n'est pas
triste). Un accessoire près d'un chiffre lourd (la règle ne change pas). Dériver la saison de
`plan_cycles` ou de la cadence : `rolling_quarter` n'a pas de saison nommée, la mascotte suit le
calendrier dans les deux cas. Un chemin SVG figé dans le composant.

**Tests.** `saison.test.ts` (douze mois, bornes, miroir de `season_bounds`) ; `mascot.test.ts` :
aucun trait sous ~1,3 px à `size >= 28`, accessoire dans la silhouette ou découpé, symétrie,
rendu strictement identique quand aucune saison n'est passée aux tests existants.

**Fait quand.** Le 1er décembre, sans mise à jour de l'app, Ramille porte son bonnet sur le
plan, le suivi et l'onboarding, en thème clair et sombre, et la carte de partage ne change pas.

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
4. Templates à ajouter (une ligne de seed chacun) : covoiturer un long trajet, marche pour les
   sorties courtes, un vol court en moins quand le train n'est pas une option, second jour de
   télétravail avec garde. Échéances des actions voyages dépendantes du `segment` (« avant mon
   prochain bilan », « au prochain projet de voyage »), contrainte `intention_timing` étendue.
5. Test 10 : profil voyages avec valeurs recalculées par requête ; assertions « aucun gain < 5 »,
   « aucun template `bus` », valeurs exactes pour `remove_day` et `share_vehicle`.
6. Vue `analytics.engagement_action_by_segment` (cycles, engagements, template, forme d'intention).

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

**Dépend de** C1.4 · **Constats** A1-5, A10-9, A6-15.

Persister en AsyncStorage le fait « cette session a un bilan complété » et un instantané du
dernier plan ; hors réseau, la racine route vers `/plan` en lecture avec un bandeau doux. Distinguer
la panne réseau du reste sur le type d'erreur (pas sur le message).

### C4.6 — Voir d'autres pistes, premier pas, cadrage identitaire

**Dépend de** C2.7 · **Arbitrage** D18, D16 · **Constats** A13-18, A13-19, A13-16, A13-20, A13-17.

Figer toutes les actions ≥ 5 kg avec leur `rank`, deux en avant, « Voir d'autres pistes » ;
attention à `actionsCount` qui pilote le disclaimer et l'état vide. Une colonne `first_step` sur
`action_templates`, affichée une fois l'action engagée. Une norme dynamique en mots dans la voix
de Ramille, jamais un chiffre non sourcé.

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

**Chaque chantier a son issue GitHub** (#99 à #151, ouvertes le 10/09/2026, étiquettes
`audit-2026-09` et `lot-0` à `lot-4`, type Task / Bug / Feature selon le lot). L'issue reprend le
corps du chantier et pointe vers ce document et l'inventaire ; c'est elle qu'on donne à un agent ou
qu'on s'assigne, et la PR la ferme (`Closes #n`). Le document reste la référence quand les deux
divergent : une issue ne se réécrit pas, elle renvoie ici.

| Chantier | Issue | PR | Date | Note |
|---|---|---|---|---|
| C0.1 | [#99](https://github.com/ScratchMe/TraceVerte/issues/99) | | | |
| C0.2 | [#100](https://github.com/ScratchMe/TraceVerte/issues/100) | | | |
| C0.3 | [#101](https://github.com/ScratchMe/TraceVerte/issues/101) | | | |
| C0.4 | [#102](https://github.com/ScratchMe/TraceVerte/issues/102) | | | |
| C0.5 | [#103](https://github.com/ScratchMe/TraceVerte/issues/103) | | | |
| C0.6 | [#104](https://github.com/ScratchMe/TraceVerte/issues/104) | | | |
| C0.7 | [#105](https://github.com/ScratchMe/TraceVerte/issues/105) | | | |
| C1.1 | [#106](https://github.com/ScratchMe/TraceVerte/issues/106) | | | |
| C1.2 | [#107](https://github.com/ScratchMe/TraceVerte/issues/107) | | | |
| C1.3 | [#108](https://github.com/ScratchMe/TraceVerte/issues/108) | | | |
| C1.4 | [#109](https://github.com/ScratchMe/TraceVerte/issues/109) | | | |
| C1.5 | [#110](https://github.com/ScratchMe/TraceVerte/issues/110) | | | |
| C1.6 | [#111](https://github.com/ScratchMe/TraceVerte/issues/111) | | | |
| C1.7 | [#112](https://github.com/ScratchMe/TraceVerte/issues/112) | | | |
| C1.8 | [#113](https://github.com/ScratchMe/TraceVerte/issues/113) | | | |
| C1.9 | [#114](https://github.com/ScratchMe/TraceVerte/issues/114) | | | |
| C1.10 | [#115](https://github.com/ScratchMe/TraceVerte/issues/115) | | | |
| C1.11 | [#116](https://github.com/ScratchMe/TraceVerte/issues/116) | | | |
| C1.12 | [#117](https://github.com/ScratchMe/TraceVerte/issues/117) | | | |
| C1.13 | [#118](https://github.com/ScratchMe/TraceVerte/issues/118) | | | |
| C2.1 | [#119](https://github.com/ScratchMe/TraceVerte/issues/119) | | | |
| C2.2 | [#120](https://github.com/ScratchMe/TraceVerte/issues/120) | | | |
| C2.3 | [#121](https://github.com/ScratchMe/TraceVerte/issues/121) | | | |
| C2.4 | [#122](https://github.com/ScratchMe/TraceVerte/issues/122) | | | |
| C2.5 | [#123](https://github.com/ScratchMe/TraceVerte/issues/123) | | | |
| C2.6 | [#124](https://github.com/ScratchMe/TraceVerte/issues/124) | | | |
| C2.7 | [#125](https://github.com/ScratchMe/TraceVerte/issues/125) | | | |
| C2.8 | [#126](https://github.com/ScratchMe/TraceVerte/issues/126) | | | |
| C2.9 | [#127](https://github.com/ScratchMe/TraceVerte/issues/127) | | | |
| C2.10 | [#128](https://github.com/ScratchMe/TraceVerte/issues/128) | | | |
| C2.11 | [#129](https://github.com/ScratchMe/TraceVerte/issues/129) | | | |
| C2.12 | [#130](https://github.com/ScratchMe/TraceVerte/issues/130) | | | |
| C2.13 | [#151](https://github.com/ScratchMe/TraceVerte/issues/151) | | | |
| C3.1 | [#131](https://github.com/ScratchMe/TraceVerte/issues/131) | | | |
| C3.2 | [#132](https://github.com/ScratchMe/TraceVerte/issues/132) | | | |
| C3.3 | [#133](https://github.com/ScratchMe/TraceVerte/issues/133) | | | |
| C3.4 | [#134](https://github.com/ScratchMe/TraceVerte/issues/134) | | | |
| C3.5 | [#135](https://github.com/ScratchMe/TraceVerte/issues/135) | | | |
| C3.6 | [#136](https://github.com/ScratchMe/TraceVerte/issues/136) | | | |
| C3.7 | [#137](https://github.com/ScratchMe/TraceVerte/issues/137) | | | |
| C3.8 | [#138](https://github.com/ScratchMe/TraceVerte/issues/138) | | | |
| C3.9 | [#139](https://github.com/ScratchMe/TraceVerte/issues/139) | | | |
| C3.10 | [#140](https://github.com/ScratchMe/TraceVerte/issues/140) | | | |
| C3.11 | [#141](https://github.com/ScratchMe/TraceVerte/issues/141) | | | |
| C3.12 | [#142](https://github.com/ScratchMe/TraceVerte/issues/142) | | | |
| C4.1 | [#143](https://github.com/ScratchMe/TraceVerte/issues/143) | | | |
| C4.2 | [#144](https://github.com/ScratchMe/TraceVerte/issues/144) | | | |
| C4.3 | [#145](https://github.com/ScratchMe/TraceVerte/issues/145) | | | |
| C4.4 | [#146](https://github.com/ScratchMe/TraceVerte/issues/146) | | | |
| C4.5 | [#147](https://github.com/ScratchMe/TraceVerte/issues/147) | | | |
| C4.6 | [#148](https://github.com/ScratchMe/TraceVerte/issues/148) | | | |
| C4.7 | [#149](https://github.com/ScratchMe/TraceVerte/issues/149) | | | |
| C4.8 | [#150](https://github.com/ScratchMe/TraceVerte/issues/150) | | | |
