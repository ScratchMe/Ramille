# v1-32 — « Toutes les pistes » : on compare sur la liste, on touche pour choisir. Plan d'implémentation

**Écrit le 29/09/2026.** Document d'implémentation apparié au dossier de design
[`docs/design/v1-30-toutes-les-pistes/`](../design/v1-30-toutes-les-pistes/README.md), comme
[`v1-17-densite-du-plan.md`](v1-17-densite-du-plan.md) l'est au sien. **Le numéro diffère de celui du
dossier**, et c'est voulu : `v1-30` est déjà porté par [`v1-30-les-transitions.md`](v1-30-les-transitions.md),
et `v1-31` revient au canvas de l'écran du mode du questionnaire
([`docs/design/v1-31-l-ecran-du-mode/`](../design/v1-31-l-ecran-du-mode/README.md)), dont le document
d'implémentation reste à écrire.

C'est un plan : aucun code, aucune migration. **Les valeurs, la copy et la géométrie sont dans le
[`HANDOFF.md`](../design/v1-30-toutes-les-pistes/HANDOFF.md)**, qui en est la seule source ; ce
document ne les recopie pas, il dit qui les lit, où, et dans quel ordre. En cas d'écart entre les
deux, le HANDOFF gagne sur la copy et la géométrie, le code gagne sur tout le reste — et l'écart se
consigne au README du dossier (« Ce que l'implémentation corrigera »), jamais dans le canvas.

## 1. Ce que ça change pour la personne, en trois phrases

Aujourd'hui, l'écran des pistes rend son contenu dans la plus petite taille du système, avec un
« Choisir » que deux séances de recette ont trouvé muet ; pour comparer deux leviers, il faut les
ouvrir en cartes qui ne tiennent pas ensemble dans l'écran ; et s'engager prend quatre gestes, dont
un « Je m'y engage » qui redit ce que « Choisir » venait de dire.

Après : chaque ligne porte son titre à la taille du contenu et son gain aligné dessous, donc on
compare **sur la liste**, d'un coup d'œil ; « Choisir » est une pastille bordée qui ouvre la carte
**directement sur la question** (« Quand ? », « Quels jours ? »), une seule à la fois ; et la liste
garde son ordre toute la saison, l'action engagée marquée à sa place.

## 2. Les cinq décisions, et ce qu'elles remplacent

Prises une à une le 28/09/2026 avec la personne qui pilote ; le HANDOFF (§ « Les cinq décisions »)
dit pour chacune ce qu'on a accepté de casser.

| # | Décidé | Ce que ça remplace dans le dépôt |
|---|---|---|
| 1 | **Comparer sur la liste** ; « Choisir » ouvre la carte sur l'intention ; un seul choix en cours ; « Annuler » le referme | [`v1-16`](v1-16-trois-decisions-decran.md) §5, puce « plusieurs lignes peuvent être ouvertes à la fois » (son bandeau le dit depuis le 28/09/2026), et « Réduire », ajouté par [#238](https://github.com/ScratchMe/Ramille/pull/238) (la réparation de la planche A2) |
| 2 | **L'ordre de la liste ne bouge pas** : le rang toute la saison, la ligne engagée à sa place | La règle de C5.2 « la tête de cet écran est la première carte du plan » (`pistesParPoste` réutilise aujourd'hui l'ordre du plan, l'engagée d'abord). **Le plan, lui, garde l'engagée en tête** |
| 3 | **Groupées par poste** | Rien : c'est l'état actuel, confirmé |
| 4 | **L'écran dès trois pistes** | Rien : c'est l'état actuel, confirmé |
| 5 | **« Choisir à la place » sur la pastille** quand une action est engagée | Le bouton « Choisir celle-ci à la place » de la carte, qui n'est plus sur le chemin **de la liste** — il reste celui du plan |

Ce que le chantier **ne décide pas** : le contenu du sélecteur d'intention (échéances, jours,
« Annuler », « C'est noté ») et la feuille des rappels, inchangés (brief §5).

## 3. Le relevé de fichiers

**Fait le 29/09/2026 sur `main` à `2674c6d`, pas supposé.** Un seul chantier, donc une seule PR ;
le relevé sert ici à dire ce que le chantier partage avec ce qui tourne à côté.

| Fichier | Ce qui change |
|---|---|
| `src/app/(tabs)/plan/pistes.tsx` | La rangée à deux étages et sa pastille ; les têtes de groupe ; l'intro dérivée ; `ouvertes` → `enChoix` ; « Réduire » part ; le focus et le défilement ; les commentaires qui décrivent l'avant |
| `src/types/plan.ts` | `pistesParPoste` suit le rang seul ; trois dérivations affichées entrent (§4.1) ; deux blocs de documentation réécrits |
| `src/types/plan.test.ts` | Un test s'inverse, un test de divergence plan/liste entre, les trois dérivations sont testées |
| `src/components/plan/carte-de-piste.tsx` | Deux props transmises ; la règle d'estompage |
| `src/components/plan/action-commitment.tsx` | Deux props (ouvert d'emblée, « Annuler » rendu à l'appelant) ; le focus à l'ouverture |
| `docs/design/design-system/components/plan/CarteDePiste.*`, `ActionCommitment.*` | Les fiches du kit décrivent les props neuves (`scripts/verifier-miroir-du-kit.mjs`) |
| `docs/recette/premier-parcours-web.md` | Bloc 06, lignes 06.2 à 06.5 |
| `scripts/verifier-parcours-reel.mjs` | Une étape qui choisit depuis la liste (§4.8) |
| `docs/architecture/v1-13-audit-et-chantiers.md` | §11 : la ligne 11.18 se date, une ligne neuve pour le doigt |

**Ce que le chantier ne crée pas** : aucun fichier sous `src/`. La rangée **reste dans l'écran**,
comme `Lignes` aujourd'hui : un seul écran la rend, et un composant sous `src/components/plan/`
arriverait avec une fiche de kit (`verifier-miroir-du-kit.mjs` refuse un composant sans fiche) pour
zéro réutilisation. Si l'implémentation trouve une raison de l'en sortir, elle la consigne et écrit
la fiche.

**Ce qui tourne à côté** : le canvas de l'écran du mode (`v1-31`) touchera `src/lib/mouvement.tsx`
et `src/components/button.tsx`, que ce chantier **lit** (`HauteurSuivie`, `Apparition`, le bouton
« C'est noté ») sans les écrire. Les deux sont parallélisables ; avant de pousser, rebalayer ces deux
fichiers sur `main` (règle de CLAUDE.md, « Avant de lancer une vague ») — une signature de
`HauteurSuivie` qui bouge entre-temps casserait l'écran sans que rien dans ce chantier ne le dise.

## 4. Le chantier, dans l'ordre

L'ordre suit les dépendances : les dérivations d'abord (elles portent les tests), les composants
ensuite, l'écran en dernier.

### 4.1 `src/types/plan.ts` — l'ordre, et trois dérivations

- **`pistesParPoste` suit le rang, et le rang seul.** Aujourd'hui elle appelle `ordonnerLesPistes`,
  l'ordre du plan, qui fait passer l'engagée devant et entraîne son poste en tête. Elle trie
  désormais par `rank` (nul en dernier, comme aujourd'hui) ; `pistesDuPlan` garde
  `ordonnerLesPistes`. **Ne pas faire porter un drapeau à `ordonnerLesPistes`** (`engageeDabord:
  boolean`) : deux appelants, deux ordres, et un booléen qui dit lequel se lit mal à l'appel ; deux
  fonctions nommées se lisent seules. Le tri par rang s'écrit une fois et `ordonnerLesPistes` s'en
  sert pour départager, pour que les deux ne divergent pas sur les rangs nuls.
- **La documentation des deux fonctions se réécrit** : celle de `ordonnerLesPistes` (« L'ordre
  commun aux deux surfaces ») et celle de `pistesParPoste` (un autre ordre « rendrait la tête de
  liste différente de la première carte du plan »). Ce qui est vrai après : **le plan et la liste
  s'accordent sur le classement, pas sur leur tête** — le plan répond à « qu'est-ce que je fais en ce
  moment ? », la liste à « qu'est-ce qui existe, et combien ça pèse ? ». Le paragraphe « Ici il n'y a
  pas de rang » et la promesse de `v1-16` §5 (toute action affichée est engageable) restent.
- **Trois dérivations affichées sortent de l'écran** (`FRONT.md` §1.1), avec des noms proposés :
  - `etatDeLaPiste(action, engageeId)` → `'libre' | 'aLaPlace' | 'engagee'`. C'est la seule source
    des trois états du HANDOFF (§ « La ligne de piste ») ; les deux suivantes la lisent. `engagee` se
    décide sur `committed_at !== null` de la ligne elle-même, pas sur `engageeId` — la règle
    d'aujourd'hui, qui tient une ligne ouverte dont l'action serait devenue engagée entre-temps ;
  - `libelleDuChoix(etat)` → « Choisir » ou « Choisir à la place » (rien pour `engagee`) ;
  - `annonceDeLaPiste({ titre, gainKg, etat })` → le libellé accessible de la rangée, les trois
    formes du HANDOFF. Il est aujourd'hui composé dans l'écran, deux fois (ligne libre, ligne
    engagée), avec la règle du point final et du repli « Action à préciser. » ; il sort avec elles ;
  - et l'intro : `introDesPistes(uneActionEstEngagee)` → les deux phrases du HANDOFF (A1 et A2).
    La variante « Ton action en cours d'abord, puis… » disparaît avec l'ordre qu'elle décrivait.
- **Les tests** (`plan.test.ts`), chacun **éprouvé en le cassant** (`TESTING.md` §1.1), le compte
  des mutations écrit en tête du `describe`, daté :
  - « met l'action engagée en tête, et son poste avec elle » **s'inverse** : l'engagée reste à son
    rang, son poste à sa place. Le commentaire du test d'ordre des groupes (« la tête de cet écran
    doit être la première carte du plan ») se réécrit avec lui ;
  - **un test de divergence, qui est la garde de la décision n° 2** : une même entrée, une engagée
    au rang 5 ; `pistesDuPlan` la met en tête, `pistesParPoste` la laisse cinquième. Mutation : faire
    rappeler `ordonnerLesPistes` par `pistesParPoste` — ce test tombe, et lui seul avec le test
    inversé. Sans lui, le prochain passage qui « factorise » les deux ordres recrée l'ancien écran en
    silence ;
  - la garde de **partition** (« ne perd aucune action ») reste telle quelle : elle porte la promesse
    de `v1-16` §5 ;
  - les trois dérivations, table de vérité complète, et pour l'annonce les deux pièges connus : le
    point final du titre, et un gain nul (la partie « par an » disparaît, pas « null kg »).

### 4.2 `ActionCommitment` — s'ouvrir sur la question, rendre la main

- **`ouvertSurLeChoix?: boolean`** : initialise `picking` à vrai. Rien d'autre ne change dans le
  sélecteur — `days` et `timing` partent vides, « C'est noté » reste inactif tant que rien n'est
  choisi (`isIntentionComplete`), **aucune valeur par défaut**.
- **`onAnnuler?: () => void`** : « Annuler » l'appelle quand il est fourni, au lieu de revenir au
  bouton « Je m'y engage » (qui, sur la liste, n'existe plus). Sans lui, le comportement du plan est
  inchangé.
- **Le focus à l'ouverture** (`FRONT.md` §2.4, `donnerLeFocus` de `src/lib/focus.ts`) : quand le
  sélecteur apparaît à la suite d'un geste, le focus va à la question. La cible est un choix
  technique — le texte « Quand ? » / « Quels jours ? » rendu focalisable comme le fait
  `TitreDArrivee`, ou le groupe si `GroupeDeChoix` expose sa référence (elle est interne
  aujourd'hui) ; c'est la vérification au navigateur (`document.activeElement` après le geste) qui
  tranche. **Le même effet couvre le plan**, où « Je m'y engage » disparaît lui aussi sous le doigt :
  c'est le même trou, invisible, et le combler au passage est la règle du dépôt. C'est le seul
  changement que le plan voit ; il se consigne comme écart au canvas (le HANDOFF dit « rien n'y
  change », ce qui reste vrai de tout ce qui se voit).
- Le bouton du plan garde « Choisir celle-ci à la place » ; `p_replace` reste
  `otherActionCommitted`, sur les deux écrans.

### 4.3 `CarteDePiste` — transmettre, et ne pas estomper ce qu'on choisit

- Les deux props précédentes passent à `ActionCommitment` ; le plan ne les passe pas.
- **`estompee` devient `uneAutreEstEngagee && !ouverteSurLeChoix`** (HANDOFF, B3) : l'estompage est
  un fait du plan, la seconde carte qui recule derrière l'engagée ; sur la liste il ferait reculer la
  carte au moment où on la regarde.

### 4.4 `pistes.tsx` — l'écran

- **`ouvertes: ReadonlySet<string>` devient `enChoix: string | null`.** Toucher une rangée libre
  ouvre sa carte et referme celle qui était ouverte (sa sélection est perdue, c'est voulu) ;
  « Annuler » remet `null`. L'ensemble passé à `separationsDesLignes` et `filetsDesLignes` devient
  `enChoix` réduit à une ligne dont `committed_at === null` — les deux fonctions ne changent pas, leur
  contrat parle de lignes rendues en carte.
- **La rangée** : deux étages et la pastille, exactement la géométrie du HANDOFF (§ « La ligne de
  piste ») — titre `default` 16/24 500 `text`, ligne du gain `body` 600 tabulaire + « par an »
  `small` `textTertiary`, pastille bordée **décorative** (masquée aux lecteurs d'écran, la rangée
  l'annonce), `backgroundPressed` sous le doigt sans animation. La hauteur de la pastille, 32, est
  **la seule valeur en dur** : un commentaire dit pourquoi (aucune `ControlHeight` ne la nomme). La
  ligne engagée garde `PastilleEngagee` et « Engagée », non touchable, sur la ligne du gain.
- **Les têtes de groupe** : `TypeScale.label` 600 `textTertiary`, capitales, 24 au-dessus (le `gap`
  de 16 du défilement + 8), 4 dessous, `accessibilityRole="header"` gardé. Vérifier que le lecteur
  d'écran ne les épelle pas : `textTransform` est un style, le texte reste en casse normale — c'est
  pour ça qu'on ne l'écrit pas en capitales dans la chaîne.
- **« Réduire » disparaît**, avec son style et ses deux commentaires.
- **Le focus au retour** : sur « Annuler », la rangée réapparaît sous la même clé de `HauteurSuivie`
  et reprend le focus. Piège : c'est un **autre élément** que la carte, monté à neuf ; le focus se
  pose une fois la rangée montée (une référence par identifiant, et l'identifiant « à refocaliser »
  gardé le temps d'un rendu), pas dans le gestionnaire d'« Annuler », où la rangée n'existe pas
  encore.
- **Le défilement jusqu'à « C'est noté »** (HANDOFF, B2) : si le bouton sort de l'écran à
  l'ouverture, l'écran défile juste assez pour le montrer, sans faire passer le titre de la carte
  sous la bande. `scrollTo({ animated: !animationsReduites })`, comme la page suivante de
  l'onboarding (`src/app/onboarding/index.tsx`, `useReducedMotion`). **C'est un mouvement neuf sur
  cet écran : appeler `/mouvement` avant de l'écrire.** Deux pièges :
  - mesurer la **carte**, pas son `HauteurSuivie` — ce dernier anime sa hauteur, donc sa mesure à
    l'instant de l'ouverture vaut la hauteur de la rangée ;
  - le focus posé sur la question (§4.2) ne doit pas faire défiler à sa place : `donnerLeFocus` passe
    `preventScroll` sur web, et c'est ce qui laisse le défilement à qui l'a lancé.
- **Le refus `RM001`** : inchangé — la phrase au-dessus de la liste, la relecture, et `enChoix` qui
  ne bouge pas, donc la carte reste ouverte ; après la relecture, sa pastille voisine dit
  « Choisir à la place » et un nouvel essai part avec `p_replace`. Si l'action de `enChoix` a
  disparu de la liste relue (un re-bilan ailleurs), rien n'est ouvert : pas de garde à écrire.
- **Le retour après « C'est noté »** : inchangé — `passage.deposer({ poste })` **avant**
  `revenirOu('/plan')` (`v1-17` §7.3).
- **Les commentaires qui décrivent l'avant**, un par un (HANDOFF, « Ce qui se touche ») : l'en-tête
  du fichier (« la tête de cet écran est la première carte du plan »), celui de `ouvertes` (« Plusieurs
  à la fois, et c'est le point »), celui de l'intro, les deux de « Réduire », celui de l'affordance
  (« L'affordance est un mot »), et celui de `paddingVertical`, dont les chiffres (52) changent avec
  la rangée. **Une phrase qui décrit ce que le code faisait avant** est la famille de défaut que ce
  dépôt paie le plus souvent.

### 4.5 La copy

Toute la copy est dans le HANDOFF : l'intro (A1 et A2), les deux libellés de la pastille, les trois
annonces de la rangée. **Aucune réplique de Ramille** — l'écran porte un chiffre par ligne, il est en
voix produit, et Ramille en est absente comme aujourd'hui. Toute phrase neuve qui ne serait pas au
HANDOFF est une question de produit, et se pose avant d'écrire.

### 4.6 Le mouvement

Rien de neuf hors le défilement de §4.4 : la ligne qui devient carte reste le chemin de
`v1-30-les-transitions.md` (§5.7) — `HauteurSuivie` sous la même clé, 250 ms en grandissant, 200 en
rétrécissant, la carte en `Apparition`, `SansApparitionAuMontage` à l'arrivée sur l'écran, tout posé
d'emblée sous « réduire les animations ». « Annuler » prend le chemin de « Réduire », dans le même
sens.

### 4.7 Le kit

`CarteDePiste.prompt.md` et `ActionCommitment.prompt.md` (et leurs `.jsx` / `.d.ts`) décrivent les
deux props neuves et la règle d'estompage ; `PastilleEngagee.prompt.md` reste juste (« la ligne
engagée de « Toutes les pistes » »). `node scripts/verifier-miroir-du-kit.mjs` vert.

### 4.8 La recette et le parcours réel

- **`docs/recette/premier-parcours-web.md`, bloc 06** — ouvrir `RECETTE.md` avant d'y toucher. Quatre
  lignes décrivent l'avant : 06.2 (la parenthèse « Ton action en cours d'abord »), 06.3 (« la toute
  première piste de l'écran est la même action que la première carte du plan »), 06.4 (« son bouton
  pour s'engager ») et 06.5 (« En ouvrir plusieurs… ce n'est pas un accordéon »). Elles se
  réécrivent sur le nouvel écran : la pastille, la carte ouverte sur la question, une seule à la fois,
  « Annuler », « Choisir à la place » quand une action est engagée, et l'ordre qui ne bouge pas après
  un engagement. Un parcours changé sans sa fiche fait jouer à la séance suivante un écran qui
  n'existe plus.
- **`v1-13` §11** : la ligne 11.18 (C5.2) parle de deux lignes dépliées côte à côte et d'une cible de
  44 px ; elle se date (« remplacée le … par v1-32 »). Une ligne neuve pour ce que seul le doigt
  juge : la pastille se lit-elle comme un bouton, la carte ouverte sur la question à 360, le
  défilement jusqu'à « C'est noté », le focus au lecteur d'écran (TalkBack).
- **Le parcours réel** (`scripts/verifier-parcours-reel.mjs`) : l'engagement s'y joue sur le plan,
  et aucun chemin ne choisit depuis la liste contre une vraie stack — c'est pourtant le seul qui
  passe `p_replace` à vrai depuis cet écran. Une étape s'ajoute **après** les étapes qui dépendent de
  l'action engagée du plan (vers l'étape « Retour au plan sans pile ») : ouvrir `/plan/pistes`,
  toucher une pastille « Choisir à la place », vérifier que la carte s'ouvre sur la question et que
  « C'est noté » est inactif, choisir, valider, arriver sur `/plan` avec cette action en tête, puis
  **relire la base** : l'engagement a changé de ligne, et l'archive porte une ligne `changement`.
  Mutation à consigner en tête du script : passer `p_replace` à faux depuis la liste — l'étape tombe
  sur `RM001`. Si les étapes suivantes lisent l'action engagée, les recaler (`ATTENDU`) plutôt que de
  placer l'étape ailleurs sans le dire.

## 5. Ce qu'il ne faut pas casser

- **Le plan ne bouge pas** : l'engagée en tête (`pistesDuPlan`), la seconde carte estompée, « Choisir
  celle-ci à la place », « Je m'y engage », le lien « Voir toutes les pistes · N ». Le seul
  changement qu'il reçoit est le focus de §4.2.
- **La chaîne du `select`** de l'écran, avec `plan_actions!plan_actions_plan_cycle_id_fkey` : sans le
  nom de la clé, PostgREST refuse la requête et l'écran ne charge plus (C2.2).
- **`passage.deposer` avant `revenirOu('/plan')`**, jamais après ni sous condition (`v1-17` §7.3) : la
  feuille des rappels ne s'ouvre qu'une fois par appareil.
- **`useRafraichirAuRetour`**, l'état de chargement différé (`useChargementVisible`), l'écran d'échec
  qui ne dit jamais « tu n'as rien », et l'état vide « Ton plan ne porte aucune piste pour cette
  période. ».
- **La garde de partition** de `pistesParPoste`, `separationsDesLignes` et `filetsDesLignes`, et leurs
  tests.
- **Aucune route, aucun jeton, aucune migration, aucune icône.** La barre d'onglets reste visible
  (l'écran est dans la pile du plan) ; « Retour au plan » passe par `revenirOu`.
- **Les cibles de 48** : la rangée entière est la cible, par sa hauteur (92 px au moins) et non par
  `hitSlop` — les rangées se touchent. La pastille de 32 n'est pas une cible.

## 6. Vérifier avant d'ouvrir la PR

- `npx tsc --noEmit`, `npm run lint`, `npm test` ; chaque test neuf éprouvé en le cassant, les
  mutations comptées dans le fichier (`TESTING.md` §1.1).
- `expo export --platform web` puis Playwright sur `dist/`, à 390 et 360, clair et sombre (ouvrir
  `EXPO.md` avant : mise en page et mouvement sur web) : les planches A1, A2, B1, B2, B3 et C1 se
  retrouvent à l'écran ; « réduire les animations » émulé pose tout sans défilement animé ; le focus
  est sur la question après « Choisir » et sur la rangée après « Annuler » (`document.activeElement`).
- `node scripts/rejouer-la-ci.mjs` (Docker, `TESTING.md` §2.13) : le parcours réel, avec son étape
  neuve.
- `node scripts/verifier-renvois-des-documents.mjs` et `node scripts/verifier-miroir-du-kit.mjs`.
- **Rebalayer** le vocabulaire retiré sur tout le dépôt, fixtures, recette et kit compris :
  « Réduire », « Ton action en cours d'abord », « première carte du plan », `ouvertes`.
- **La contre-lecture** : le sous-agent `contre-lecture` sur le diff entier, avec la base, le commit
  et ce que le chantier prétend faire ; ses trois familles (une dérivation appelée avec le mauvais
  argument — ici `etatDeLaPiste` et l'`engageeId` ; une exclusion vérifiée sur une paire de moins ;
  une phrase qui décrit l'avant).
- **Vercel** : c'est une fusion de code, donc la mesure hors ligne de `VERCEL.md` §1.2 avant de
  fusionner, comparée au dernier relevé ; `api/` n'est pas touché, un écart s'explique dans la PR.

## 7. Écarts au canvas déjà connus

À reporter au README du dossier de design, section « Ce que l'implémentation corrigera », avec ceux
que le chantier trouvera :

- **le plan reçoit le focus à l'ouverture du sélecteur** (§4.2), là où le HANDOFF dit que rien n'y
  change — vrai de tout ce qui se voit ;
- **la rangée reste dans l'écran** au lieu de devenir un composant (§3) — le HANDOFF laissait la
  question ouverte.

## 8. Hors périmètre, et consigné

- **« C'est noté » inactif n'a pas de forme dans son encart** (HANDOFF, « Relevés hors mandat ») :
  `Button` désactivé prend `backgroundElement`, qui est aussi le fond du sélecteur. WCAG exempte un
  composant inactif, et le libellé se lit ; c'est le contenu du sélecteur, hors du mandat de ce
  chantier comme du canvas. À porter au relevé de dette (`v1-27`) s'il n'y est pas.
- **Sur web, la feuille des rappels ne s'ouvre pas** après un premier engagement en session anonyme
  (`doitProposerLaFeuille`) : voulu, et c'est ce que la recette verra en navigation privée.
