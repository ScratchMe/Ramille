# v1-17 — Le plan : ce qu'il montre, ce qu'il tait. Plan d'implémentation

**Écrit le 16/09/2026.** Document d'implémentation apparié au dossier design
[`docs/design/v1-17-densite-du-plan/`](../design/v1-17-densite-du-plan/), comme
[`v1-14-boucle-engagement.md`](v1-14-boucle-engagement.md) l'est au sien. Il traduit le canvas
livré ce jour-là en chantiers, **et il porte le plan entier** : ce que ce canvas demande, et tout
ce qui était déjà ouvert avant lui. Rien de la TODO existante n'en disparaît sans une ligne qui
dit pourquoi.

Il ne contient aucun code et aucune migration : c'est un plan. Les valeurs, la copy et la
géométrie sont dans le [`HANDOFF.md`](../design/v1-17-densite-du-plan/HANDOFF.md), qui en est la
**seule source** ; ce document ne les recopie pas, il dit qui les lit et quand.

## 1. Ce que ça change pour la personne, en trois phrases

Aujourd'hui, le plan de quelqu'un dont le meilleur levier n'est pas sur son poste dominant
**enterre ce levier** : une action à 461 kg/an se retrouve en ligne simple sous une action à
48 kg, alors qu'elle dépasse à elle seule le cap de la saison. Aujourd'hui aussi, une réponse du
questionnaire **écarte près de la moitié du référentiel d'actions** sans qu'aucun écran ne le
dise. Et aujourd'hui enfin, quelqu'un qui ouvre Ramille pour la première fois reçoit **deux
onglets avant d'avoir quoi que ce soit à suivre**.

Après : le meilleur levier du poste dominant est en tête, le reste suit par gain décroissant, et
toutes les pistes ont un écran à elles ; le plan dit sur quelles réponses il s'appuie et ouvre la
porte pour les corriger ; et les deux lieux du produit n'apparaissent qu'au moment où ils ont
chacun quelque chose à montrer.

## 2. Le relevé de fichiers — celui qui décide l'ordre

**Fait le 16/09/2026, pas supposé.** La colonne « Parallèle ? » de
[`v1-13`](v1-13-audit-et-chantiers.md) §2.3 s'est trompée quatre fois ; ce relevé coûte dix
minutes et évite qu'un chantier en écrase un autre en silence.

| Fichier | Chantiers qui le touchent |
|---|---|
| `src/app/(tabs)/plan.tsx` → `plan/index.tsx` | **C5.2**, **C5.3**, **C5.5**, **C5.6**, **C5.7** — cinq |
| `src/types/plan.ts` (+ son test) | **C5.2**, **C5.3**, **C5.5** |
| `src/app/(tabs)/_layout.tsx` | **C5.2** (le `tabPress` de Plan), **C5.7** (la barre masquée) |
| `src/app/bilan/index.tsx` | **C5.5** (le paramètre d'étape), **C5.7** (la marque de premier parcours) |
| `src/types/bilan.ts` (+ son test) | **C5.4** seul |
| `src/types/saison.ts` (+ son test) | **C5.6** seul |
| `src/lib/format.ts` + `api/` | **C5.8** seul |
| `supabase/migrations/` | **C5.1** (une fonction), **C5.4** (deux tables) — disjoints entre eux |

**Ce que le relevé dit.** Les chantiers du plan ne sont **pas** parallèles : cinq d'entre eux
écrivent dans le même écran, et l'un des cinq le déplace. Seuls **C5.1** (le classement, SQL pur)
et **C5.8** (l'espace fine, `format.ts` et `api/`) sont réellement disjoints de tout le reste.
**C5.4** est disjoint des écrans du plan mais précède **C5.5**, qui lit ce qu'il migre.

**Deux relevés de précision qui font gagner une heure au chantier concerné :**

- **L'écran du plan n'interroge pas `assessment_answers`** (relevé en base et en code le
  16/09/2026). L'encart de contexte de **C5.5** ajoute donc une lecture ; la faire dans le même
  `Promise.all` que les autres plutôt qu'en second aller-retour.
- **Sa lecture de `plan_action_commitments_archive` est filtrée sur
  `released_reason = 'rebilan'`** et bornée à une ligne : elle sert à dire l'engagement orphelin
  (C2.2), et elle **ne peut donc pas servir telle quelle** au signal du premier plan de **C5.6**,
  qui demande « aucune ligne dans l'archive, quelle qu'en soit la raison ».

## 3. Lot 5 — le plan, ce qu'il montre et ce qu'il tait

Huit chantiers. Les numéros d'écart renvoient à la page « Écarts » du HANDOFF (dix-neuf lignes) ;
les écarts **13, 14 et 16** ne sont dans aucun chantier et c'est voulu : « inchangé ».

### C5.1 — Le classement du plan

**Écart 1** (le classement) · **Effort** moyen · **Dépend de** rien · **Ferme la moitié
« classement » de** [#198](https://github.com/ScratchMe/TraceVerte/issues/198), constat 13.3.

**Pour la personne** : la meilleure piste de son poste dominant est en première carte, et tout le
reste suit du plus gros gain au plus petit. Le levier à 461 kg cesse d'être en ligne simple sous
un levier à 48 kg.

- **Où** : `generate_plan_cycle_for_user`, le `row_number()`. Une migration, aucun fichier de
  `src/`. `pistesDuPlan` ne change pas — elle lit `rank` —, `cadreDuPlan` reçoit les mêmes
  entrées.
- **Ce qu'il faut ouvrir avant** : `SUPABASE.md` §2.3. **Réécrire une fonction part de
  `pg_get_functiondef`, jamais du fichier qui l'a créée** — C2.2 a été perdu une fois exactement
  ainsi. Et vérifier qu'aucune migration postérieure ne réécrit cette fonction en entier.
- **Ce qui l'éprouve** : les valeurs attendues des tests pgTAP **02** (génération du cycle) et
  **10** (l'estimateur) sont invalidées. `TESTING.md` §2.2 : chaque assertion se **recalcule par
  une requête**, jamais à la main. Une assertion neuve sur le déterminisme du rang (`action_text`
  départage une égalité de gain), et une sur le cas « le poste dominant n'a aucune piste », où
  l'ordre redevient le gain seul.
- **À ne pas casser** : le cap reste calculé sur le poste dominant. Les rangs disent l'insistance,
  jamais la permission (`v1-13` §8, `v1-16` §5).

### C5.2 — La pile du plan et l'écran « Toutes les pistes »

**Écarts 2, 3, 4, 5** · **Effort** grand · **Dépend de** C5.1 (l'écran lit le nouveau rang) ·
**Ferme la moitié « densité » de** [#198](https://github.com/ScratchMe/TraceVerte/issues/198).

**Pour la personne** : deux cartes sur le plan et rien de plus ; toutes les pistes sur un écran à
elles, groupées par poste, en lignes qui s'ouvrent en carte et se referment. Plus de déplié qui
donne onze cartes pleines sous un « Replier » hors écran.

- **Où** : `(tabs)/plan.tsx` devient une pile — `plan/_layout.tsx` (un `Stack` sans en-tête, sur
  le modèle exact de `suivi/_layout.tsx`), `plan/index.tsx` (l'écran actuel), `plan/pistes.tsx`
  (l'écran neuf) ; `(tabs)/_layout.tsx` reçoit pour Plan le même `listeners` `tabPress` que Suivi,
  qui ramène à l'index ; `src/types/plan.ts` — `pistesDuPlan` perd son rang estompé — et son test.
- **Ce qu'il faut ouvrir avant** : `EXPO.md` §2.1. **Une route de plus veut son titre de page**
  (`src/constants/page-titles.ts`), et les gardes d'export la vérifient — `verifier-titres-export`
  exige un titre et un `noindex` pour un écran d'app. `public/sitemap.xml` ne liste que les cinq
  surfaces publiques et ne bouge pas. **`assetlinks.json` ne revendique que `/plan` et ne bouge
  pas non plus** : le périmètre étroit est voulu (`EXPO.md` §2.3).
- **Ce qui l'éprouve** : la garde de **partition** de `plan.test.ts` — un rang qui laisserait
  tomber une action recréerait en silence le `limit 2` que C4.6 a retiré du serveur ; les quatre
  gardes d'export ; et la vérification visuelle par `expo export --platform web` puis Playwright
  sur `dist/`, la seule façon de voir l'écran sans appareil.
- **Copy** : « Le classement, côté serveur » et « L'écran "Toutes les pistes" » du HANDOFF ;
  « Voir toutes les pistes · N » avec N = `actionsCount`.
- **Piège nommé par le canvas** : à `onEngage` depuis l'écran des pistes, retour au plan **et**
  ouverture de la feuille des rappels. Le canvas laisse le choix entre un drapeau local et
  `?engagee=1` ; recommandation en §7.

### C5.3 — L'intro dit le principe, la note du cap disparaît

**Écarts 6, 7** · **Effort** petit · **Dépend de** C5.2 (même fichier) · **Même PR que C5.2.**

**Pour la personne** : le plan dit pourquoi on ne prend qu'une action à la fois, au lieu de
décrire les deux cartes posées juste dessous en taisant les neuf autres.

- **Où** : `src/types/plan.ts` — `cadreDuPlan` perd `intro` **et** `noteDuCap`, son test avec ;
  `plan/index.tsx` rend une ligne fixe.
- **Pourquoi la note part, et ce n'est pas un allègement** : elle énonçait une règle que rien
  n'applique — le cap est une quantité à atteindre, et rien dans le produit ne vérifie d'où vient
  la réduction. Le nouveau classement de C5.1 l'aurait réveillée sur la plupart des plans.
  Relecture du 16/09/2026, README du dossier design.
- **`CLAUDE.md` change dans la même PR** : le paragraphe « `cadreDuPlan` décide de ce que l'écran
  annonce » décrit `intro` et la note, qui n'existeront plus.

### C5.4 — Le télétravail se demande en jours

**Écarts 11, 12** · **Effort** moyen · **Dépend de** rien · **Ferme la moitié « question » de**
[#197](https://github.com/ScratchMe/TraceVerte/issues/197), constat 13.1.

**Pour la personne** : la question demande un nombre de jours sur ses jours de trajet déclarés, et
non une possibilité. « Parfois » disparaît — c'était le mot dont le produit faisait un seuil sans
le dire.

- **Où** : une migration (le `check` d'`assessment_answers.teletravail`, les deux
  `action_templates.teletravail_admissible`, le commentaire de colonne, la **traduction des lignes
  existantes**), `src/types/bilan.ts` (`Teletravail`, `REPONSES_TELETRAVAIL`, et `manqueDeLEtape`
  qui ne réclame la réponse qu'à partir de deux jours de trajet), son test,
  `src/components/bilan/steps/context.tsx` (la question et l'intro d'étape),
  `src/lib/database.types.ts`.
- **Ce qu'il faut ouvrir avant** : `SUPABASE.md` §2.1 (le fichier de types se retouche à la main
  et la CI compare) et §2.3 (une migration de données désigne une ligne par sa **clé naturelle**,
  `action_text` ; `add constraint` n'est pas idempotent ; elle se rejoue telle quelle).
- **La traduction préserve le comportement, et la migration doit le prouver.** `non → aucun`,
  `parfois → un_jour`, `oui → deux_ou_plus` ; en face, `teletravail_admissible` passe de
  `{oui, parfois}` à `{un_jour, deux_ou_plus}` sur un jour et de `{oui}` à `{deux_ou_plus}` sur
  deux. Chaque réponse garde donc exactement les mêmes gabarits, et **aucun plan n'a besoin d'être
  régénéré**. Un contrôle dans la migration qui compte les lignes par valeur avant et après vaut
  mieux que cette phrase.
- **Ce qui l'éprouve** : les assertions pgTAP du filtre de C3.8 (le tableau vide `= any('{}')`
  interdit, les deux seuils) recalculées ; un test Jest sur `manqueDeLEtape` à un jour de trajet et
  à deux ; le job `db-tests`, seul garde de la dérive de `database.types.ts`.
- **À ne pas casser** : le **seuil** de C3.8 ne bouge pas ; « une condition qu'on ne peut pas
  évaluer n'est pas remplie » ; « ces réponses n'entrent pas dans le calcul de ton bilan » reste
  dans l'intro.

### C5.5 — L'encart de contexte et sa porte

**Écarts 9, 10** · **Effort** moyen · **Dépend de** C5.4 (il lit la valeur migrée) **et** C5.2
(même fichier) · **Ferme la moitié « plan » de**
[#197](https://github.com/ScratchMe/TraceVerte/issues/197).

**Pour la personne** : le plan dit sur quelles réponses il s'appuie, et donne la porte pour les
corriger. Sans jamais nommer l'action écartée ni son gain — ce serait marchander.

- **Où** : `plan/index.tsx` (l'encart, sous la porte des pistes et au-dessus de la note
  technique), la requête du plan (une lecture de plus, cf. §2), une dérivation pure dans
  `src/types/plan.ts` pour composer les quatre réponses en mots, `src/app/bilan/index.tsx` (un
  paramètre `etape` à côté de `reprise`).
- **Jamais quand `actionsCount === 0`** : un plan à zéro action n'a rien à expliquer, et écart 14
  dit qu'il ne change pas.
- **Ce que la porte ouvre** : `/bilan?etape=context`, questionnaire prérempli dans l'ordre habituel
  (brouillon > dernier bilan > vide). Soumettre est un **re-bilan ordinaire** : le plan est
  régénéré et un engagement en cours est archivé, ce que l'encart orphelin dit déjà (C2.2). Rien
  de neuf côté serveur.
- **Ce qui l'éprouve** : la dérivation des quatre phrases est pure, donc testée ; le reste est un
  écran, vérifiable sur `dist/`.

### C5.6 — Le premier plan

**Écart 8** · **Effort** moyen · **Dépend de** C5.2 (même fichier).

**Pour la personne** : à son tout premier plan, une carte dit la règle du jeu en deux phrases, et
le trait de temps attend qu'il y ait quelque chose à mesurer.

- **Où** : `src/types/saison.ts` (le signal, à côté d'`ouvertureDeSaison`) et son test ;
  `plan/index.tsx` ; une marque locale à préfixe `traceverte.` dans `src/lib/`.
- **Le signal** : une seule ligne dans `plan_cycles`, aucun `committed_at`, **aucune ligne dans
  l'archive quelle qu'en soit la raison** — et c'est le point de §2 : la requête actuelle filtre
  sur `rebilan`, elle ne répond pas à cette question.
- **Ce qu'il faut ne pas défaire** : la carte **ne prend jamais la place d'un point en attente**
  (C2.8) — elle remplace la carte d'attente, Ramille parlant dessous. Le lien du rappel pointe
  `/plan` ; masquer la question y ferait ouvrir une notification sur un écran qui ne la porte pas,
  défaut trouvé sur appareil le 09/09/2026.
- **Le trait** : `progression !== null && (engagement || !premierPlan)`.

### C5.7 — La barre d'onglets attend la fin du premier parcours

**Écarts 17, 18, 19** · **Effort** moyen · **Dépend de** C5.6 (la barre attend la fermeture de sa
carte).

**Pour la personne** : elle ne reçoit pas deux lieux avant d'avoir quelque chose à y mettre. La
barre arrive avec une carte qui nomme les deux endroits, une fois.

- **Où** : `(tabs)/_layout.tsx` (`tabBarStyle: { display: 'none' }` piloté par une marque),
  `src/app/bilan/index.tsx` (la marque posée à la soumission du premier questionnaire, à côté de
  celle de C4.5), `(tabs)/suivi/bilan.tsx` (la restitution en mode `nouveau`), `plan/index.tsx`
  (la carte « Plan et Suivi »), `src/lib/` pour les deux marques.
- **Deux marques, et la règle du préfixe** : elles portent `traceverte.` comme toutes les autres,
  donc `src/lib/compte.ts` les balaie par **préfixe** à la déconnexion et à la suppression. **Ne
  jamais dénombrer les clés `traceverte.*` dans un commentaire** — trois commentaires en portaient
  un, tous faux dès que le jeton d'appareil s'est ajouté.
- **Le cas qu'il ne faut pas rater** : sans marque — appareil neuf d'un compte existant, session
  retrouvée par lien — **la barre est là**. La marque autorise une absence, elle ne la présume pas.
- **Ce qui l'éprouve** : le parcours complet ne se prouve que sur appareil (§5) ; la dérivation
  « la barre doit-elle être là ? » est pure et se teste.

### C5.8 — L'espace fine des milliers

**Écart 15** · **Effort** petit · **Dépend de** rien · **Disjoint de tout.**

« − 1 601 kg CO₂e » et non « − 1601 kg ». Formateur à la main dans `src/lib/format.ts`, qui doit
**rester pur** (`src/types/resultat.ts` l'importe, et toute la suite Jest en dépend), et **son
jumeau dans `api/`** : les Vercel Functions ne peuvent pas importer `src/`, et le dépôt garde la
trace du jour où les deux moitiés d'un même partage se sont contredites. Les deux se touchent
ensemble ou pas du tout.

## 4. Les vagues, et pourquoi cet ordre

Trois vagues, trois PR. Le critère est celui de la passation : **ce qui est trompeur en production
passe avant ce qui manque, qui passe avant le confort** — puis les dépendances techniques.

### Vague 9 — ce qui est trompeur (C5.1 + C5.4)

Les deux seuls chantiers **réellement parallèles** du lot : l'un réécrit une fonction, l'autre
deux tables et le questionnaire. Aucun fichier partagé. Ce sont aussi les deux qui trompent
aujourd'hui — un levier enterré, une restriction muette — et les deux dont tout le reste dépend.

### Vague 10 — le plan se relit (C5.2 → C5.3 → C5.5, et C5.8)

Dans cet ordre et pas un autre : **C5.2 déplace le fichier**, donc il passe devant ; C5.3 et C5.5
écrivent ensuite dans l'écran déplacé. C5.8 est disjoint et voyage avec, puisqu'une PR par vague.

### Vague 11 — le premier parcours (C5.6 → C5.7)

En dernier parce que c'est ce qui **manque**, pas ce qui trompe — et parce que C5.7 attend la
carte de C5.6. C'est aussi la vague dont la vérification demande un appareil, donc celle qui gagne
le plus à être prête pour la première séance d'octobre (§5).

**Cadence.** Une PR par vague ; **deux fusions de code par jour au plus jusqu'au 25/09/2026**, et
seule une correction nécessaire déploie tant que le compte Vercel est à 98 % ; **avant la première
fusion de code d'une session, demander le relevé Functions Storage — le total du compte et la part
de Ramille** (`VERCEL.md` §2.3). Un déploiement coûte **1,76 Mo** mesuré, pas 1,6 (`VERCEL.md`
§2.1). Toute PR qui change un comportement décrit dans `CLAUDE.md` met `CLAUDE.md` à jour **dans
la même PR**.

## 5. Ce qui était déjà ouvert, et qui ne disparaît pas

### 5.1 Lot 4 — les increments à instruire

Inchangés, et **chacun commence par une page de décision `v1-1N`, pas par du code**. Ils ne
bloquent aucun chantier du lot 5 et n'en précèdent aucun. Ordre proposé, par valeur pour la
personne puis par coût :

| | Chantier | Issue | Pourquoi là |
|---|---|---|---|
| 1 | **C4.4** — vélo à assistance électrique, RER, autocar, occupation longue distance | [#146](https://github.com/ScratchMe/TraceVerte/issues/146) | Le seul qui corrige un **chiffre** : un cycliste à assistance est compté au tarif du vélo mécanique. Et les ajouts de mode se groupent en **une** migration, sans quoi chacun invalide toutes les assertions chiffrées du test 07 |
| 2 | **C4.7** — retirer un bilan erroné | [#149](https://github.com/ScratchMe/TraceVerte/issues/149) | Petit, et c'est la seule sortie d'un bilan faux ; `withdrawn` sur le `check`, jamais une policy DELETE |
| 3 | **C4.1** — le point quantitatif | [#143](https://github.com/ScratchMe/TraceVerte/issues/143) | Le plus gros apport sur la boucle, et le plus cher : il touche le schéma du point. « Soit instruire, soit fermer par écrit » — la page de décision peut conclure à fermer |
| 4 | **C4.3** — déplacements professionnels | [#145](https://github.com/ScratchMe/TraceVerte/issues/145) | Sa moitié gratuite (compléter l'aide de `commute-has-trip.tsx`) peut partir avec n'importe quelle PR du questionnaire ; l'increment attend l'arbitrage D7 |
| 5 | **C4.2** — le coup de pouce la veille | [#144](https://github.com/ScratchMe/TraceVerte/issues/144) | Rouvre « un mot par point », garantie structurelle de la spec §7 : la page de décision doit dire comment, ou fermer |
| 6 | **C4.8** — comparaison même saison, un an après | [#150](https://github.com/ScratchMe/TraceVerte/issues/150) | **Personne ne peut en bénéficier avant un an.** La donnée est prête (C2.8) ; le code peut attendre |

C4.5 est livré (`v1-15`), C4.6 a été avancé en vague 6, C4.9 est **fermé par son expérience**.

### 5.2 Ce que C4.5 a reporté

- **`v1-15` §7 — l'instantané local du plan.** Reporté parce qu'il serait un **troisième endroit
  où vivent les chiffres de la personne**, ce que ce dépôt refuse partout ailleurs. Condition de
  réouverture écrite en §7 ; ne pas le rouvrir « parce que ce serait mieux ».
- **`v1-15` §8 — le réessai au retour de connectivité.** Même régime.

### 5.3 Les vérifications sur appareil

**Aucun build EAS n'est possible avant le 1er octobre 2026** (quota du plan gratuit, registre
d'exploitation §3.3), et ensuite **au plus un tous les deux jours**. Tout ce qui suit se planifie
donc en **une seule liste** pour la première séance d'octobre, avec les lignes de `v1-13` §11 qui
n'ont pas « Fait » :

- **§11.2** — la soumission coupée **entre les deux écritures** (le 14/09 l'a approchée, pas
  faite) ;
- **§11.5** — réseau coupé, écran par écran : débloquée par C4.5, jamais jouée ;
- **§11.9** — la carte d'ouverture de saison, qui demande **un autre moment** (le 1er décembre) ;
- **§11.13 et §11.14** — l'onboarding et son étape 2 sur un petit Android ;
- **§11.16** — les trois décisions d'écran de `v1-16` ;
- **§11.4** — les séries de `Chip` restées en rôle `button` : ce n'est pas une vérification mais
  un **reste de code**, et le passage TalkBack (§11.1) ne sera utile qu'une fois ces séries
  reprises.

**Ce que le lot 5 ajoute à cette liste**, et qui ne se prouve nulle part ailleurs : le premier
parcours de bout en bout sur un appareil neuf (C5.6 + C5.7), l'arrivée de la barre et son
animation, et l'écran des pistes au doigt (C5.2) — l'ouverture d'une ligne, « Réduire »,
l'engagement depuis cet écran et le retour au plan.

### 5.4 L'exploitation — hors code, dans le plan

Un lot à part, **titulaire Antoine**, ordonné par les échéances de `docs/exploitation/README.md`
§5 :

- [#93](https://github.com/ScratchMe/TraceVerte/issues/93) — l'empreinte de signature de Play à
  **ajouter** dans `assetlinks.json` à la publication (elle s'ajoute, elle ne remplace pas) ;
- [#97](https://github.com/ScratchMe/TraceVerte/issues/97) — l'alias Vercel de l'ancien nom à
  retirer, et avec lui l'entrée `ramille.vercel.app` des Redirect URLs
  (`docs/exploitation/redirect-urls.md`, `SUPABASE.md` §2.5) ;
- `docs/exploitation/README.md` §4 — la checklist de publication sur Google Play ;
- §6 — la continuité, qui n'est pas tranchée ;
- `VERCEL.md` §2.4 — le point qui reste : **`VERCEL_GIT_PREVIOUS_SHA` est-il exposé ?** Il demande
  le journal de build, que l'agent ne peut pas lire.

### 5.5 Les restes assumés

Listés pour qu'ils ne se perdent pas, et non pour être faits maintenant :

- **13.7** — la pastille d'onglet à largeur de bureau
  ([#199](https://github.com/ScratchMe/TraceVerte/issues/199)) : corrigée le 16/09/2026 en
  épinglant la disposition du kit ; ce qui reste assumé est qu'on **n'englobe pas** icône et
  libellé. Rien à faire ;
- **La garde SQL qui manque à `MODE_IDS`** : le miroir de `public.transport_modes` tenu à la main
  dans `src/types/resultat.ts` n'a aucun garde côté base, et `CLAUDE.md` le dit depuis le
  11/09/2026. Un balayage pgTAP suffirait ;
- **`cadence_type = 'rolling_quarter'`** : mécanisme dormant, testé côté serveur, qu'aucun écran
  n'ouvre. L'ouvrir dans « Toi » serait une décision produit — le handoff design le prévoit.

## 6. Ce que ce plan reporte, et à quelle condition ça se rouvre

| Reporté | Pourquoi | Condition de réouverture |
|---|---|---|
| L'instantané local du plan (`v1-15` §7) | Un troisième endroit où vivent les chiffres de la personne | §7 de `v1-15`, inchangée |
| Le réessai au retour de connectivité (`v1-15` §8) | Même raison | §8 de `v1-15` |
| `List-Unsubscribe-Post` (C4.9) | L'expérience du 15/09/2026 a écarté l'hypothèse | Si le volume d'envoi devient réel |
| La planche « trois états du télétravail » (v1-18 §8.2) | La forme retenue ne réagit pas au choix : ses trois états **sont** trois puces | Si la forme change |
| C4.8 (même saison, un an après) | Personne ne peut en bénéficier avant un an | Le premier compte qui atteint un an |

## 7. Ce que je ne tranche pas, et ce que je recommande

1. **Les gains des lignes 7 à 11 du canvas sont des valeurs de démonstration** (README du dossier
   design, point 1). **Recommandation** : les relever en base au moment d'écrire C5.2, et si un
   gain réel dément la planche, le consigner dans « Ce que l'implémentation corrigera » plutôt que
   de réécrire le canvas.
2. **La question du télétravail quand il n'y a qu'un jour de trajet** (point 2). Le canvas la fait
   disparaître. **Recommandation : suivre le canvas.** Poser une question dont la réponse ne peut
   rien changer est exactement le défaut que v1-18 nomme, retourné — et `manqueDeLEtape` doit
   alors ne plus la réclamer sous deux jours, sans quoi l'étape devient invalidable.
3. **Le retour de l'écran des pistes après « C'est noté »** : drapeau local ou `?engagee=1` ?
   **Recommandation : un drapeau local.** Un paramètre d'URL est une surface publique de plus, et
   le dépôt garde la trace de ce que coûte une provenance non reconnue.
4. **La lecture des réponses B4 par l'écran du plan** (C5.5). **Recommandation** : étendre le
   `Promise.all` existant plutôt qu'ajouter un aller-retour — l'écran se recharge à **chaque**
   retour au premier plan (`useRafraichirAuRetour`), donc chaque requête s'y paie souvent.
5. **Faut-il une issue GitHub par chantier du lot 5 ?** Le budget d'API a deux compteurs distincts
   et `issue_write` peut être refusé seul (registre §3.8). **Recommandation** : en ouvrir huit si
   ça passe, et sinon s'en tenir à ce document et à
   [#154](https://github.com/ScratchMe/TraceVerte/issues/154) — ce document reste la référence
   quand les deux divergent.

## 8. Ce qu'il ne faut pas casser

En plus de `v1-13` §8, que ce lot ne touche pas ailleurs : le cap reste calculé sur le poste
dominant ; toute action affichée est engageable (`v1-16` §5) ; une seule action engagée par cycle ;
le premier pas ne s'affiche qu'une fois l'action engagée ; la carte d'ouverture ne prend jamais la
place d'un point en attente ; le seuil de télétravail de C3.8 ; « ces réponses n'entrent pas dans
le calcul de ton bilan » ; deux onglets et pas trois ; aucune route dynamique `[id]` ; Ramille ne
dit jamais un nombre et ne se tient jamais près d'un chiffre lourd.
