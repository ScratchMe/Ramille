# v1-29 — Le design system mis à l'épreuve : ce qui tient, ce qui change, ce qui attend

> **Décidé et livré le 24/09/2026.** Une séance de challenge du design system, demandée pour qu'il
> puisse aussi **éclairer les choix d'UX à venir**, a rendu onze arbitrages de produit, onze petites
> corrections acceptées sans veto et une liste de corrections techniques. Ce document dit ce qui a
> été décidé, ce qui a été fait, ce que la mesure a corrigé en chemin, et ce qui reste ouvert —
> en particulier trois chantiers qui ne sont **pas** dans cette livraison : le thème sombre (§6.1),
> le déverrouillage du portrait (§6.2) et la synchronisation complète du kit (§5).

## 1. D'où ça vient

La demande, mot pour mot : *« un rechallenge sincère de notre design system, et qu'il puisse
éventuellement nous aider dans nos choix d'UX à venir »*. La séance a suivi l'installation des
plug-ins Design et Marketing (ScratchMe/Ramille#261), et elle a utilisé les méthodes du premier —
grille de critique d'écran, audit de design system, revue WCAG — plus une base de référence externe,
UI UX Pro Max, lue depuis son archive sans être installée.

Quatre relevés, tous en lecture seule, puis une critique d'écrans :

- **les jetons et leur dérive** : chaque valeur de style du dépôt relevée et comptée, comparée à
  `src/constants/theme.ts` et au kit `docs/design/design-system/` ;
- **l'accessibilité**, WCAG 2.1 AA plus 2.5.8 et 3.3.8 de la 2.2 : contrastes calculés par la formule
  de luminance, sémantique relevée dans le code **et dans l'export web**, où react-native-web décide
  de ce qu'un lecteur d'écran entend ;
- **la base de référence** : ce qu'elle confirme, ce qu'elle contredit, et ce qu'elle apporte ;
- **76 captures** du parcours réel (fenêtre 390 × 844, stack Supabase locale, profil de la recette),
  regardées écran par écran.

**Ce qui tient, et qu'il ne faut pas « corriger »** : en thème clair, tous les textes passent les
seuils de contraste, le plus faible à 5,08:1 ; l'accent unique, le ton calme et l'absence de
gamification sont confirmés par la base de référence — qui recommandait par ailleurs des badges, des
séries et un rouge d'alerte, que le produit refuse pour de bonnes raisons (`FRONT.md` §2.3) ; la
mascotte et les illustrations sont masquées aux lecteurs d'écran ; la préférence « réduire les
animations » est respectée là où ça compte ; le questionnaire suit les bonnes pratiques (étapes,
retour, brouillon, préremplissage).

## 2. Les arbitrages de la personne qui pilote

Posés un par un, sous la forme de `CLAUDE.md` — le fait, la recommandation, ce qu'on casse si on se
trompe —, et rendus le 24/09/2026 : **toutes les recommandations sont suivies, sauf la n° 11**.

| N° | Le fait | Décision |
|---|---|---|
| 1 | « Le déplacement qui pèse le plus » coiffe le domicile-travail (1,9 t) au-dessus de barres où les voyages pèsent 2,0 t : c'est le départage à 5 % de `v1-05`, qui donne la place au poste le plus régulier | **Garder la règle, changer l'étiquette quand elle joue** : « Le plus régulier, presque à égalité avec tes voyages » |
| 2 | Sur la carte du point, « Oui » est un bouton vert plein et « Non » un bouton gris : le classement que le suivi a retiré en C2.7 | **Même poids visuel** pour « Oui » et « Non » ; le troisième choix reste un lien |
| 3 | Au tout premier plan, le premier écran montre la carte « Ton premier plan », la mascotte, le titre et le cap ; la première action arrive coupée en bas | **Au premier plan, les cartes d'action passent avant le cap** |
| 4 | « Ton cap pour cette saison − 384 kg » est un chiffre **annuel**, et les pistes juste dessous annoncent « − 619 kg par an » : rien ne dit comment les deux se rapportent | **« par an »** sous le chiffre, et, quand elle est vraie, **une phrase qui dit le lien** (« Chacune des deux pistes proposées suffit à le franchir. ») |
| 5 | L'onglet actif et l'inactif ont la même luminance (1,02:1), la pastille active ne ressort qu'à 1,18:1 : pour qui distingue mal les couleurs, les deux onglets sont identiques (WCAG 1.4.1) | **Une pastille verte pleine, icône blanche** (6,12:1) |
| 6 | Aucun élément touchable ne change d'aspect sous le doigt : sur Android, on ne sait pas si l'appui a été pris | **Une teinte instantanée, sans animation** |
| 7 | `theme.ts` attribuait 44 px à « WCAG 2.5.8 / Material » ; Material dit 48 dp, 2.5.8 dit 24, et 44 est le seuil de 2.5.5 (AAA). Trois cibles étaient sous 44 | **48**, et les trois cibles corrigées |
| 8 | Le thème sombre est défini mais jamais rendu ; l'activer demande un contraste à corriger, sept endroits du code, les variantes du splash et de l'icône, et un build EAS | **Après le lancement** — la liste de reprise est en §6.1 |
| 9 | L'écran est verrouillé en portrait par le défaut du gabarit Expo, que rien n'a décidé, et c'est un écart WCAG (1.3.4) | **Portrait gardé pour la V1**, écart connu consigné en §6.2 |
| 10 | La chasse fixe, que le kit réserve aux sources, porte aussi des phrases adressées à la personne — dont « Ton mode n’est pas dans la liste ? Dis-le-nous. », en 12 px gris, qui se lit comme une ligne de débogage | **Spline Sans pour toute phrase adressée à la personne**, la chasse fixe pour les sources et les codes techniques seulement |
| 11 | Le kit a décroché du code : composants absents, anciens noms, fichiers inexistants, et une contradiction sur l'état désactivé. Recommandation : le réduire à ce qui ne dérive pas | **Refusé : le kit se synchronise** — *« je tâcherai de m'en souvenir »*. Ce document s'en souvient à sa place : §5 |

**Les petites corrections, acceptées sans veto** : un contour gris au repos sur les champs vides
(1,14:1 sans lui) ; la carte estompée par son cadre et non par l'opacité de son texte (3,25:1) ;
l'espace insécable avant « ? », « ! » et « : » ; « Le check-in reste là » devenu « Le point reste
là » ; la félicitation du plan à zéro action qui nomme le poste ; « par an » ramené à côté du
chiffre sur la carte engagée ; « Télécharger mes données » reconnaissable comme un bouton ; « Par
email » désactivé qui avait l'air choisi ; la barre pleine du suivi à un seul bilan ; la page de
confidentialité qui ne connaissait que « oui » et « non » ; et « Recevoir un code » inactif sans dire
pourquoi.

**Ce qui était technique, donc pris sans le demander** (`CLAUDE.md`, « La partie technique est la
responsabilité de l'agent ») : l'état des choix sur web, seul défaut **critique** de l'audit (§3.2) ;
onze séries de puces annoncées comme des boutons ; les erreurs d'engagement et trois écrans
remplacés sans annonce ; les valeurs répétées sans jeton ; cinq endroits où la documentation
contredisait le code ; deux composants en double ; une erreur d'hydratation au chargement direct de
`/connexion` ; la largeur de lecture des pages légales sur ordinateur.

## 3. Ce qui a été fait

### 3.1 Le socle : les jetons et `ThemedText`

`src/constants/theme.ts` porte désormais ce que les écrans recopiaient, **sous les noms que le kit
leur donnait déjà** quand il en avait un :

- **six jetons de couleur d'état**, dans les deux palettes, contrastes mesurés en commentaire :
  `onAccent` (le blanc posé sur l'accent, écrit en dur trois fois), `accentPressed`,
  `backgroundPressed` et `backgroundSelectedPressed` (la surface sous le doigt), `fieldBorder` (le
  contour d'un champ au repos : 3,45:1 sur blanc, 3,04:1 sur le fond du champ) et `scrim` (le voile
  d'une feuille, écrit en dur deux fois) ;
- **`TypeScale.display`** (32/38/−0,64, six recopies) et **`TypeScale.label`** (13/18/0,3, l'étiquette
  en capitales, trois recopies) ;
- **`Radius.notice`** (12) et **`Radius.chip`** (14, douze recopies). `Radius.chip` **a changé de
  sens** : il valait 8 pour la puce « Cadence » du plan, disparue avec C2.8, et plus rien ne le lisait ;
- **`ControlHeight.target` à 48**, et `topBand` (52), `tabBar` (60), `numeric` (64) ;
- **`Rail`** (6 px, rayon 3) et **`Stroke`** (`hairline` 1, `selected` 1,5, `engaged` 2, et `field` 1,5
  — le contour d'un champ, au repos comme au focus : quatre champs lisaient `selected`, le contour
  d'une puce choisie, relevé par la contre-lecture du 25/09/2026).

Et ce qui n'était lu nulle part est parti : `Fonts.sans`, `Fonts.serif` et `Fonts.rounded` — Spline
Sans passe par `FontFamily` —, avec les trois variables CSS qui les portaient.

`ThemedText` gagne trois choses, parce que ce sont trois choses qu'aucun écran ne doit avoir à faire
lui-même :

- le type **`display`**, en-tête de niveau 1 comme `title` et `screenTitle` ;
- un **niveau d'en-tête sur web** : react-native-web rendait chaque en-tête en `<h1>`, donc un
  lecteur d'écran qui parcourt une page par titres ne distinguait plus l'écran de ses sections. Le
  niveau se déduit du type (1 pour un titre d'écran, 2 pour tout autre en-tête) et se surcharge par
  `headingLevel` ;
- **les espaces insécables de la typographie française, posées au rendu** (`src/types/typographie.ts`,
  avec ses tests) : avant `?`, `!`, `:` et `;`, et à l'intérieur des guillemets. C'est U+00A0 et non
  l'espace fine U+202F, pour la raison que `FRONT.md` §1 a déjà mesurée : 71 unités sur 1 000 dans
  Spline Sans, le signe paraît collé. Les dérivations de `src/types/` rendent toujours des espaces
  ordinaires, et leurs tests les comparent telles quelles.

Les deux attentes de texte des contrôles d'export (`verifier-etats-export.mjs`,
`verifier-rendu-export.mjs`) normalisent désormais les blancs, comme leur comparaison finale le
faisait déjà : `innerText` garde l'insécable, et un `includes('… ?')` l'aurait attendue en vain.

### 3.2 Les contrôles, les formulaires et les feuilles

- **L'état des choix atteint le web.** `aria-checked`, `aria-expanded` et `aria-busy` remplacent
  `accessibilityState` dans `Chip`, `ChoiceRow`, `ModeListItem`, la ligne de canal, `TextLink` et
  `GoogleButton` ; il n'en reste plus un seul dans `src/`. La garde est dans
  `scripts/verifier-rendu-export.mjs` (`TESTING.md` §2.12).
- **Les onze séries de puces sont des choix** : `GroupeDeChoix` (`src/components/bilan/groupe-de-choix.tsx`)
  pose le rôle et **nomme le groupe par sa question**, écrite une fois ; les jours d'une intention
  sont des `checkbox`, puisqu'ils se cumulent. `Chip.role` est devenu obligatoire.
- **Chaque contrôle répond au toucher**, teinte immédiate et sans animation ; un lien texte se
  souligne — et un lien **déjà souligné au repos** (« Supprimer mon compte », « Changer d'avis » et
  leurs « Annuler ») prend la teinte appuyée à la place, puisque le soulignement n'y changeait rien
  (contre-lecture du 25/09/2026).
- **Cibles de 48** : la puce fait 48 × 48 au moins ; les jours se rangent en grille, sur quatre
  colonnes, et sur trois sous 320 dp, où ils se chevauchaient d'un demi-pixel.
- **Les champs se voient au repos** (`fieldBorder`), et le texte qu'on y tape est en Spline Sans — il
  était dans la police du système, Arial sur web. `NumericField` ne porte plus sa bordure d'accent
  qu'une fois un nombre saisi.
- **Un champ d'adresse annonce qu'il attend une adresse** : `autoComplete` se déduit du clavier.
- **Les échecs de l'engagement passent par `MessageInline`**, qui s'annonce désormais sur natif
  (`announceForAccessibility`) : une région vivante n'annonce pas son apparition sur Android. Aucun
  de ses dix-sept appelants n'a été touché.
- **Les écrans remplacés portent le focus** sur ce qui arrive (`TitreDArrivee`, `src/lib/focus.ts`) :
  « C'est envoyé, merci. » et le calcul du bilan. Et une étape du questionnaire s'ouvre désormais par
  le haut : elle gardait le défilement de la précédente, titre caché (221 px mesurés à 360 × 440).
- **« Recevoir un code » dit pourquoi il attend** — la même phrase qu'à `/connexion/retrouver`,
  « Cette adresse semble incomplète. », et le bouton agit toujours ; le retour annonce son minimum,
  « Trois caractères au moins pour pouvoir l’envoyer. », dès la première frappe.
- **« Par email » désactivé ne paraît plus choisi** : ce qui paraît coché est le canal **effectif** de
  la table de vérité des rappels (`paraitChoisie`, `src/types/ligne-de-canal.ts`), et une préférence
  `email` sans adresse n'en a aucun.
- **Un seul cadre de feuille** (`FeuilleDuBas`) et **une seule ligne de canal** (`LigneDeCanal`) ; les
  deux feuilles sont des dialogues **nommés par leur titre**. La feuille des rappels avait aussi reçu
  un en-tête **visible**, « Les rappels », que ni son canvas ni aucune décision ne portaient : il est
  retiré (`enTete={false}`), le titre ne sert plus qu'à nommer le dialogue — ce qu'une feuille montre
  est une question de produit (§6.3).
- **La chasse fixe ne sert plus qu'aux sources** : « Ton mode n’est pas dans la liste ? », les lignes
  d'hypothèse des vols et des longs trajets, le compteur du retour passent en Spline Sans ; le
  détail technique d'un échec, sous le message du questionnaire, reste en chasse fixe : c'est une
  cause à recopier, pas une phrase.

### 3.3 Le plan, le suivi et la restitution

- **L'étiquette du poste dominant dit le départage quand il joue** (`etiquetteDuPosteDominant`,
  `src/types/resultat.ts`) : « Le plus régulier, presque à égalité avec tes voyages » quand un poste
  moins régulier pèse strictement plus, « Le déplacement qui pèse le plus » sinon. Le profil de la
  recette est exactement ce cas, et le parcours réel l'attend.
- **« Oui » et « Non » ont le même poids** : deux secondaires, posés sur la carte par `onPanel` — gris
  sur la carte grise, leur forme disparaissait (§4). La réplique prend le focus après une réponse
  donnée **sur la carte**, jamais au montage d'une carte déjà répondue.
- **Au premier plan, le choix passe avant le cap** ; hors premier plan, l'ordre n'a pas bougé. La
  carte d'ouverture qui le coiffe est une **section** (en-tête de niveau 2, sous « Ton plan » de
  niveau 1), et ses boutons secondaires passent par `onPanel` : « Choisir une autre » se fondait dans
  la carte teintée à 1,06:1 — le défaut du point, sur une autre carte.
- **Le cap dit « par an »** — « par an, soit − 20 % sur ton trajet domicile-travail (1,9 t CO₂e
  aujourd’hui) » — et, tant que rien n'est engagé, la phrase qui le relie aux pistes
  (`phraseDesPistesSuffisantes`, `src/types/plan.ts`) : « Chacune des deux pistes proposées suffit à
  le franchir. », « L’une des deux… », « La piste proposée… », ou rien. Elle compare au kilo arrondi,
  comme l'affichage.
- **La félicitation du plan à zéro action nomme le poste** (`felicitationDuPlanSansAction`) — **sauf
  le résiduel des sorties rares**, pour la raison de §4 — et dit « le point » au lieu du
  « check-in ».
- **La carte engagée dit « par an » sous le chiffre** : « par an · le mardi et le jeudi · 15 % de ton
  empreinte » (`ligneDuGain`). Lu comme « la ligne juste sous le gain » ; si la décision voulait
  « − 619 kg CO₂e par an » sur la même ligne, c'est une ligne à changer.
- **La carte estompée l'est par son cadre** (filet `backgroundElement`) et non par l'opacité de son
  texte ; la branche morte `estompeeParLeRang` est partie.
- **Le suivi ne dessine plus de barre pour un seul bilan** (`barresDeLHistorique`) ; « Voir tout »
  annonce qu'il déplie.
- **Les liens qui naviguent s'annoncent en liens** — « Voir toutes les pistes », « Modifier ces
  réponses », et tous ceux des écrans du plan et du suivi.
- **La légende de l'écart par poste dit en mots ce que l'accent désignait seul** (`legendeDeLEcart`) :
  « … accent : {poste}, le poste sur lequel ton plan travaille ».
- **Chiffres tabulaires** sur le total, le cap, les gains, le suivi et les écarts.
- **Jetons** : `TypeScale.display` pour la décision dominante (en-tête de niveau 1 de l'écran),
  `TypeScale.label`, `Rail`, `Stroke`.

### 3.4 La navigation, les pages et le compte

- **L'onglet actif est une pastille `accent` pleine, icône blanche** (6,12:1 contre 1,18:1), et
  **chaque onglet fait 51 px de haut** contre 39 : la barre vaut `ControlHeight.tabBar` plus
  l'encoche, marges `Spacing.one`.
- **Les pages légales se lisent sur une colonne de 480 px** : 64 à 72 caractères par ligne en
  moyenne à 1 280 px de large, contre 111 à 120. Rien ne bouge sur téléphone.
- **La page de confidentialité connaît la troisième réponse** : « Ta réponse à la question périodique
  (oui, non, ou pas concerné cette fois-là), et sa date. » Sa date de mise à jour a suivi (§6.3).
- **L'erreur d'hydratation de `/connexion?source=compte` est fermée, et elle n'était pas seule** :
  `/rappels/stop?jeton=…` servait « Ce lien n'est plus valable » à tous ceux qui ouvrent le lien d'un
  rappel, le temps que l'app démarre, et `/suivi/bilan?id=` l'écran d'erreur à quiconque ouvre un
  bilan par un lien. La cause est commune : l'export rend chaque page sans chaîne de requête
  (`EXPO.md` §1.4). `useApresHydratation` fait rendre au premier passage ce que dit le HTML
  statique, qui n'affirme plus rien.
- **Le focus de l'onboarding suit la page**, et le défilement suit « réduire les animations ».
- **« Télécharger mes données » se voit** : la carte « Mes données » passe au registre blanc cerné du
  kit, sur lequel le bouton secondaire est dessiné partout ailleurs.
- **Le grand titre passe par `type="display"`** sur cinq écrans ; les trois titres à 30 px restent en
  dur, et `FRONT.md` dit enfin pourquoi sans se contredire avec `theme.ts`.
- **La chasse fixe** : les liens légaux de `/connexion` et la ligne de contact de « Toi » passent en
  Spline Sans ; la source du repère et les noms de variables d'environnement restent en chasse fixe.
- **`ThemedView` n'accepte plus `lightColor`/`darkColor`**, qu'il ignorait et qu'aucun appelant ne
  passait.
- **Le nom « Ramille » de la bande haute n'est plus un titre** : il passait avant celui de chaque
  écran — un `<h2>` devant le `<h1>` sur web, la première étape de la navigation par titres sur
  Android.

## 4. Ce que la mesure a corrigé en chemin

- **« Oui » et « Non » au même poids les rendait invisibles.** Deux secondaires gris sur la carte
  grise du point : la décision n° 2 appliquée à la lettre faisait disparaître la forme des deux
  boutons. D'où `onPanel` sur `Button` — fond de l'écran et filet quand le bouton est posé sur une
  surface teintée. Les trois sous-agents l'ont relevé chacun de leur côté.
- **Nommer le poste de la félicitation la rendait fausse pour le profil le plus courant qui la
  reçoit.** Tout cycliste qui sort « rarement » a un plan à zéro action, et le poste de son cycle est
  le **résiduel** que le calcul suppose, pas un comportement déclaré : « Tu fais déjà l’essentiel sur
  tes sorties du week-end » le félicitait sur des sorties qu'il a dit ne presque pas faire, et « Le
  point reste là » lui promettait une boucle mensuelle qui n'est pas générée sans base déclarée. Ce
  cas n'est plus ni nommé ni promis — « Tu fais déjà l’essentiel. » —, le serveur le marquant dans le
  libellé qu'il fige sur le cycle. C'est une réduction prudente et non une décision : §6.3.
- **L'erreur d'hydratation n'était pas propre à `/connexion`** : trois routes à paramètre, dont deux
  qui servaient une phrase fausse avant le démarrage de l'app (§3.4).
- **« Recevoir un code » pouvait annoncer un envoi qui n'avait pas eu lieu** — défaut antérieur à
  cette livraison, trouvé en rejouant `scripts/verifier-code-de-connexion.mjs` sur une stack qui
  venait de démarrer (deux échecs sur cinq). La session anonyme s'ouvre en parallèle du premier
  affichage ; touché avant qu'elle existe, le bouton faisait répondre `updateUser` par
  `AuthSessionMissingError` sans aucune requête, et la règle de non-divulgation, qui mène tout
  échec non reconnu à l'écran du code, le transformait en « Un code à 8 chiffres vient de partir ».
  `demanderLeRattachement` attend désormais la session, et une session qui ne s'ouvre pas se dit
  comme une panne (`src/lib/auth.test.ts`). Reproduit à coup sûr en retardant la création de
  session de deux secondes, avant comme après : avant, rien ne partait ; après, la demande attend.
- **`/connexion/retrouver` n'écrivait jamais « Cette adresse semble incomplète. »** : le bouton y
  était inactif, donc la branche était inatteignable. La phrase qu'on voulait recopier n'existait
  qu'en code.
- **Un `aria-disabled` posé à la main sur un `Pressable` est écrasé par `disabled`**, sur web comme
  sur natif (`EXPO.md` §1.5).
- **La cible des onglets faisait 39 px, pas 40**, et l'icône du compte tombait à 26 px du bord au lieu
  de 24.
- **Deux sous-agents ont écrit `src/lib/focus.ts` en même temps**, au même corps près : le relevé de
  fichiers disjoints ne voit pas les fichiers qui n'existent pas encore (`CLAUDE.md`, « Avant de
  lancer une vague »).
- **Metro partage son cache entre worktrees** : un tableau de mutations entier a d'abord été faux,
  mesuré sur des bundles qui n'étaient pas ceux de l'arbre (`EXPO.md` §1.1).

## 5. Le kit : synchronisé, et ce que ça engage

**La décision n° 11 change le statut du kit.** Il était une photographie datée du 10/09/2026, dont
les écarts se consignaient dans le README du canvas concerné (`.claude/skills/ramille-design/SKILL.md`) ;
il devient un **miroir tenu**, et un miroir tenu n'a de valeur que si quelque chose le tient. Deux
règles, à partir du 24/09/2026 :

- **ce qui change un jeton ou une règle du kit le met à jour dans la même PR.** C'est écrit en tête de
  `theme.ts`, et c'est ce que cette livraison fait pour ses propres jetons : `tokens/*.css` recopie
  les six couleurs d'état, `display`, `label`, les rayons, les hauteurs et les traits ;
- **les phrases du `readme.md` du kit que cette livraison rend fausses sont corrigées ici** — l'état
  pressé, la cible de 44, le total en 48/52 (il est en `salient` 30/36 depuis A3-22, le 11/09/2026),
  le dépôt et le produit sous leur ancien nom (`CLAUDE.md`, « le produit s'appelle Ramille »), comme
  le renvoi de `SKILL.md` à un `README.md` qui s'appelle `readme.md`.

**Ce qui reste est un chantier, pas une correction**, et il demande une session de design : c'est
elle qui sait redessiner un composant dans le kit. Son inventaire, relevé le 24/09/2026 :

- **les composants absents** : un fichier de `src/components/` (hors tests) est compté représenté si
  l'une de ses fonctions exportées porte le nom d'un composant du kit. À cette définition, **36
  fichiers sur 63** n'y étaient pas avant cette livraison, et **40 sur 67** après — elle en ajoute
  quatre : `GroupeDeChoix`, `FeuilleDuBas`, `LigneDeCanal` et `TitreDArrivee`. La séance en comptait
  31 sur une autre définition, et c'est la définition qui se vérifie, pas le nombre. Tout le
  questionnaire étape par étape, les quatre étapes de l'onboarding, la saisie du code, les cartes de
  piste et d'ouverture, le trait de temps, les trois composants du suivi, les pages légales et les
  écrans d'erreur. Le relevé se refait par la commande de §7 ;
- **les fiches des composants que cette livraison a changés** (`components/**/*.prompt.md` et leurs
  `.d.ts`) : `Chip` (rôle obligatoire, `nestedBackground`, jours en grille, `Radius.chip`),
  `TextField` et `NumericField` (contour au repos, Spline Sans dans le champ), `Button` (`onPanel`,
  état appuyé), `ChoiceRow` et `ChoixDeRappel` (la ligne de canal est `LigneDeCanal`), `OngletIcone`
  et `BarreOnglets` (pastille pleine, onglets de 48), `BandeHaute` (cible de 48, nom qui n'est plus
  un titre), `MonCompte` (registre blanc cerné), `CheckinCard` (« Oui » et « Non » au même poids),
  `ActionCard` (estompée par le cadre, « par an » sous le gain) ;
- **`BarreOnglets`** existe dans le kit et pas comme composant du code : la barre est le layout
  `src/app/(tabs)/_layout.tsx` ;
- **le catalogue des 38 écrans** (`ui_kits/ramille/`) reprend le handoff V1, dont des écrans à mot de
  passe qui n'existent plus depuis `v1-10` §2.D, et cite l'ancien nom du produit ;
- **l'état désactivé** : le kit écrit « jamais une opacité », et la ligne de canal de rappel en porte
  une (0,6), désormais en un seul endroit (`LigneDeCanal`). Un composant inactif est exempté de
  contraste (WCAG 1.4.3), donc rien n'est faux pour la personne ; c'est la règle et le code qui se
  contredisent, et la synchronisation tranchera lequel des deux suit l'autre.

**Quand le faire** : avant la prochaine session de design, parce que c'est d'elle que ces sessions
partent — un kit faux y fabrique des maquettes fausses, qui fabriquent des écarts à consigner.

## 6. Ce qui reste ouvert

### 6.1 Le thème sombre, après le lancement

Tout est défini, rien n'est rendu : le clair est forcé sur web (`src/hooks/use-theme.ts`) et
`app.json` porte `userInterfaceStyle: light` sur natif. **La liste de reprise**, pour que le jour venu
ne commence pas par un relevé :

1. `app.json` : `userInterfaceStyle: automatic`, les variantes sombres du splash et de l'icône
   adaptative — donc **un build EAS** (au plus un tous les deux jours, `CLAUDE.md`) ;
2. `src/hooks/use-theme.ts` : lever le forçage du clair sur web, **en réglant d'abord le flash** :
   l'export statique ne connaît pas `prefers-color-scheme`, donc le premier rendu est clair chez tout
   le monde (`EXPO.md` §2.2 — la règle d'hydratation) ; il faudra des variables CSS sous
   `@media (prefers-color-scheme: dark)` plutôt qu'une lecture JavaScript ;
3. `src/app/_layout.tsx` : `DefaultTheme` en dur autour de la navigation, à passer sur la palette
   courante ;
4. **la mascotte et les illustrations lisent `Colors.light` directement** : deux gels dans
   `src/components/mascot.tsx` (le `COULEUR` au niveau du module et le corps du composant), et les
   trois illustrations de `src/components/illustrations/`. La table de `theme.ts` dit déjà ce qui
   bascule et ce qui ne bascule pas ;
5. **trois contrastes sombres sous le seuil** : le blanc sur l'accent sombre `#3D9B6F` (3,43:1 —
   `onAccent` ou l'accent sombre est à changer ; `#0B1F15` sur `#3D9B6F` tient 5,01:1),
   `textTertiary` et `accent` sur `backgroundSelected` sombre (4,39 et 4,18). Et `border` (1,10 à 1,61)
   comme `accentMuted` (1,69 à 2,47) sont à revoir partout où ils portent une information ;
6. les valeurs sombres des six jetons d'état de §3.1 sont **provisoires** et n'ont été regardées sur
   aucun écran ;
7. une recette complète en sombre, sur appareil.

### 6.2 Le portrait, écart connu de la V1

`app.json` porte `"orientation": "portrait"` : c'est le défaut du gabarit Expo, et **rien ne l'avait
décidé** avant le 24/09/2026. C'est un écart WCAG 1.3.4 (orientation), assumé pour la V1. Le lever
coûte un build EAS et **une recette en paysage de chaque écran** — le pager de l'onboarding, les deux
feuilles du bas, la barre d'onglets et le questionnaire sont les plus exposés.

### 6.3 Ce qui n'a pas été arbitré, et ne se fait donc pas

- **Un « Précédent » (ou un « Passer ») dans l'onboarding** : l'audit relève qu'aucun contrôle ne
  permet d'y revenir en arrière, sinon le balayage ou le retour Android. C'est une question de
  produit — ce qu'on demande à la personne, et dans quel ordre —, pas une correction ;
- **l'avertissement de la vérification automatique** : le code part seul au huitième chiffre
  (`FRONT.md` §2.7 bis) sans que l'écran le dise (WCAG 3.2.2). La décision est documentée ; seule la
  phrase manque, et c'est une phrase à arbitrer ;
- **les points de pagination de l'onboarding** ne ressortent qu'à 1,37:1 sur leur fond (WCAG 1.4.11) ;
- ce que la base de référence apportait et que le produit n'a pas retenu : des graphiques à quatre
  points au moins, un réglage de la recette à 200 % de taille de police et en mouvement réduit —
  ce dernier est repris en §6.5 ;
- **le titre de la félicitation, pour le résiduel des sorties rares** (§4) : « Tu fais déjà
  l’essentiel. », sans poste et sans promesse de point, est la réduction la plus prudente, pas une
  phrase décidée. Et **la même fausseté vit ailleurs pour ce profil** : le palier de la restitution
  lui propose « 2 kg CO₂e de moins sur l’année sur tes sorties du week-end », des sorties qu'il a dit
  ne presque pas faire. Relevé en jouant le parcours réel, hors du périmètre de ce chantier ;
- **la date de mise à jour de la page de confidentialité** vaut le 24/09/2026 ; la page dit que sa
  date est celle où le texte arrive devant les lecteurs, donc elle suit la date de fusion ;
- **les deux variantes de la phrase du cap, et son silence** : la décision n° 4 dit « quand elle est
  vraie » et en donne une forme, « Chacune des deux… ». « L'une des deux pistes proposées… » et « La
  piste proposée suffit à le franchir. » en sont les deux autres formes vraies, et rien n'est dit
  quand aucune piste n'atteint le cap ou quand l'écran en montrerait plus de deux. Elles se
  dérivent de la règle décidée ; elles n'ont pas été relues une à une ;
- **« Le plus régulier » au-dessus de « Loisirs du week-end (occasionnels) »** : c'est ce que
  l'étiquette de la décision n° 1 écrirait si le résiduel des sorties « rarement » gagnait le
  départage face à des voyages plus lourds de moins de 5 % — deux mots qui se contredisent. Le cas
  est rare (le résiduel pèse une trentaine de kilos) et n'a été vu nulle part ; la forme la plus
  sûre serait « Presque à égalité avec tes voyages », sans le superlatif. Relevé par la
  contre-lecture du 25/09/2026, à arbitrer ;
- **le contour de « Oui » et « Non »** : posés sur la carte par `onPanel`, ils se détachent à
  1,14:1 (carte grise) et 1,18:1 (carte teintée), filet compris entre 1,13 et 1,18:1 — exactement le
  contraste de **tout** bouton secondaire du produit sur le fond de l'écran (1,14:1). WCAG 1.4.11
  n'exige pas 3:1 du contour d'un bouton que son libellé identifie, et c'est ce registre-là que la
  décision n° 2 a appliqué. Sous le doigt, sur la carte teintée, le bouton appuyé ne se distingue de
  la carte qu'à 1,07:1 ; ce qui se voit est le **changement** (du blanc au gris, 1,26:1). Porter les
  secondaires à 3:1 serait une décision de design sur tout le registre, pas une correction de ces
  deux-là ;
- **un en-tête visible sur la feuille des rappels** : retiré le 25/09/2026 parce qu'il n'avait pas
  été décidé (§3.2). Le remettre est une ligne (`enTete`), si la personne qui pilote le veut.

### 6.4 Les limites du web, qu'aucun code du dépôt ne lève

- **`accessibilityHint` n'existe pas sur web** : react-native-web l'ignore. Le rappel de la question
  sur « Oui » et « Non » du point, et la longueur maximale du retour, n'y sont pas annoncés ;
- **la barre d'espace n'active pas un `radio`** : react-native-web ne la gère que sur un `button`.
  Ce n'est pas impossible — `Pressable` transmet `onKeyDown` —, c'est non fait ; et un groupe de
  choix ne se parcourt pas aux flèches, chaque option est un arrêt de tabulation ;
- **un même message remis deux fois n'est pas réannoncé** : React ne rend pas de nouveau pour un état
  identique, donc un second échec identique se tait ;
- **après un échec, le focus n'est rendu nulle part** : pendant l'envoi, le bouton désactivé le perd,
  et quand l'écran revient avec son message, rien ne le repose ;
- la préférence « réduire les animations » n'est lue qu'au démarrage (reanimated le documente).

### 6.5 Ce que la prochaine recette sur appareil doit regarder

Rien de ce qui suit ne se voit en CI :

- **TalkBack** : chaque série de puces annoncée « case d'option, n sur m » avec sa question, les jours
  de l'engagement en cases à cocher, l'onglet actif, les feuilles nommées par leur titre, les erreurs
  d'engagement et les trois écrans remplacés (point répondu, retour envoyé, calcul du bilan) ;
- **la teinte sous le doigt**, sur chaque contrôle, et qu'elle ne reste pas collée après un geste de
  défilement ;
- **les cibles de 48** : onglets, jours de l'engagement (qui peuvent passer sur deux lignes), jours du
  questionnaire ;
- **la taille de police à 200 %** : la barre d'onglets, les champs (56) et le champ numérique (64) ont
  des hauteurs fixes ;
- **le mouvement réduit** : le défilement du pager de l'onboarding et l'arrivée des feuilles ;
- **le focus de `StepShell`** vise un conteneur que React Native peut aplatir hors de l'arbre natif
  (`src/lib/focus.ts` dit pourquoi) : le passage TalkBack du 14/09/2026 n'a rien relevé, sans qu'on
  sache si c'est le focus qui y réussit ou le changement d'écran qui se fait entendre ;
- **l'étape du questionnaire qui s'ouvre par le haut**, et les jours de l'engagement sur trois
  colonnes aux petites largeurs ; « C’est noté » passe sur deux lignes à 320 dp, ce qui était déjà
  le cas avant.

## 7. Refaire les relevés

Les deux commandes qui ont produit les nombres de ce document, pour qu'ils se vérifient :

```bash
# Les valeurs de style répétées sans jeton (ici les rayons ; même forme pour borderWidth, fontSize…)
grep -rhoE "borderRadius: *[0-9.]+" src | sort | uniq -c | sort -rn

# Les fichiers de composants absents du kit (définition de §5)
python3 - <<'EOF'
import pathlib, re
kit = {p.stem for p in pathlib.Path('docs/design/design-system/components').rglob('*.jsx')}
fichiers = sorted(f for f in pathlib.Path('src/components').rglob('*.tsx') if not f.name.endswith('.test.tsx'))
absents = [f for f in fichiers
           if not set(re.findall(r'^export (?:default )?function (\w+)', f.read_text(), re.M)) & kit]
print(len(absents), 'sur', len(fichiers))
EOF
```
