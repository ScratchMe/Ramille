# v1-33 — Les lois de l'UX : ce que Ramille tient, ce qui s'en écarte, ce qui se décide

**Écrit le 01/10/2026.** La demande, mot pour mot : *« Regarde les lois de l'UX ici
https://lawsofux.com/. Puis analyse si on est en adéquation avec ces règles avec notre design et notre
design system. Le cas échéant, propose les corrections nécessaires. »*

Ce document est la **mémoire** de cet audit. Les quatre rapports de travail, les 183 captures et les
scripts qui les ont produits vivaient dans le répertoire temporaire de la session et ne sont pas
versionnés : ce qui suit en garde la substance, constat par constat, avec ses preuves dans le code.
Il fait suite à [`v1-29`](v1-29-challenge-du-design-system.md), qui avait éprouvé le design system
contre WCAG et une base de référence : ici, la grille est celle des trente lois de
[lawsofux.com](https://lawsofux.com/), qui parlent moins de contraste que de **mémoire, d'attention et
de décision**.

## 1. La méthode

- **Les trente lois**, avec leurs « takeaways » recopiés du site (§3 en donne le verdict une par une).
- **Les captures du parcours réel** : 183 écrans à 390 × 844 (facteur 2), contre la stack Supabase
  locale, sur les trois profils de `scripts/verifier-parcours-reel.mjs` (voiture et vols ; cycliste à
  plan vide ; sans boucle), plus un profil à compte rattaché par e-mail, les états de chargement,
  de réseau coupé et d'erreur 500, et les surfaces publiques ouvertes dans un navigateur neuf.
- **Quatre audits en lecture seule, un par surface**, menés en parallèle et confrontés au code : le
  questionnaire et l'onboarding (écarts **Q-n**), la restitution et le suivi (**R-n**), le plan et ce
  qui s'y ouvre (**P-n**), le cadre transverse et le design system (**T-n**). Chacun a reçu les mêmes
  garde-fous : les règles non négociables du produit (aucune mécanique d'échec, pas de comparaison
  entre personnes, la voix de Ramille, deux onglets) et la liste des décisions déjà prises, à ne pas
  rouvrir comme un écart. Une loi qui pousse contre une décision prise est rangée en **tension**
  (§6), et seulement quand elle apporte un argument que la décision n'avait pas pesé.
- **Les constats lourds ont été revérifiés dans le code** avant d'entrer ici : le « 0 » pré-coché des
  vols (`EMPTY_BILAN_ANSWERS`, `src/types/bilan.ts`), la barre du repère 2050 en relecture
  (`montreBarreRepere2050`, `src/app/(tabs)/suivi/bilan.tsx`), les trois réessais de
  `@supabase/postgrest-js` 2.116 (`DEFAULT_MAX_RETRIES = 3`, délais de 1, 2 puis 4 s), le sélecteur
  d'engagement refermé avant la relecture (`action-commitment.tsx`), le canal de rappel posé par
  défaut sur une lecture en échec (`notification-prefs.ts`), les six `router.replace` des flux de
  compte.

**Le tri** suit `CLAUDE.md` : ce qui est **technique** se corrige sans demander (§4) ; ce qui touche
au **produit** — ce qu'on montre, ce qu'on tait, ce qu'on demande, l'ordre, et toute phrase que la
personne lit — se pose à la personne qui pilote, sous la forme habituelle (§5).

## 2. Ce qui tient, et qu'il ne faut pas « corriger »

L'audit confirme plus qu'il ne corrige. Ce qui suit est conforme aux lois **et** voulu, et c'est
exactement ce qu'une prochaine relecture serait tentée de défaire :

- **Le « Suivant » en attente qui mène à ce qui manque** (`v1-31`) : Flow et Fitts à la fois — le
  focus va à la question, l'écran y défile, sans alerte ni rouge.
- **Deux pistes sur le plan, l'exhaustivité sur sa propre page** (C5.2, `v1-32`) : Hick et Choice
  Overload, avec le compte dans le libellé du lien (« Voir toutes les pistes · 10 »), qui sert aussi
  Zeigarnik.
- **Les précisions dans une boîte, sous l'option qu'elles décrivent** : Common Region et Proximity.
- **« Voir les autres modes »** sur les loisirs (quatre à plat, cinq repliés) ; les neuf modes du trajet
  en trois familles de trois (Miller, Chunking).
- **Les réponses reportées dans la question qui en dépend** (« Sur tes 5 jours de trajet… », « Sur ces
  2, combien sont courts ? ») : Working Memory.
- **La saisie tolérante** : la virgule décimale, « 12 km », un second séparateur ignoré, la casse de
  l'adresse normalisée par le serveur, les espaces d'un code collé (Postel).
- **La reprise d'un brouillon** qui dit ce qui reste sans dire le délai (Zeigarnik).
- **Le pressé immédiat, et toutes les animations d'interface sous 400 ms** (150 à 320 ms, une seule
  courbe ; Doherty), « réduire les animations » tenu en ne lançant rien.
- **Un seul bouton principal par état d'écran**, à une exception près (§6) ; la carte engagée marquée
  trois fois — bordure, fond, étiquette —, jamais par la seule couleur (Von Restorff).
- **Aucune mécanique d'échec** : le Goal-Gradient est servi par « Étape N sur M » et par le trait de la
  saison, qui « mesure le temps, pas toi » ; Zeigarnik par un point qui reste là sans compter de
  manqués. Les lois qui suggéreraient séries, badges ou célébrations ont été écartées d'office.
- **Le palier au lieu du gouffre** à la sortie du questionnaire, et la moyenne française tue à qui n'a
  pas le choix : c'est la réponse du produit au biais d'ancrage, et l'audit la confirme — sauf en
  relecture (D10).

## 3. Les trente lois, une par une

« Tient » : rien à reprendre. « Écart » : au moins un écart, renvoyé. « Tension » : la loi pousse
contre une décision prise (§6).

| Loi | Verdict | Où |
|---|---|---|
| Aesthetic-Usability | tient | La sobriété (un accent, aucune ombre) ; elle masque aussi des défauts qu'aucune capture au repos ne montre (T-1, R-1) |
| Choice Overload | écart | 33 puces à plat sur les longs trajets, 42 cibles avec la voiture (D1) |
| Chunking | écart mineur | « Toi » : trois sections, trois façons de les titrer (T-15) |
| Cognitive Bias | écart | Le « 0 » pré-coché des vols (D1) ; l'ancrage « 4,2 t contre 0,6 t » en relecture (D10) |
| Cognitive Load | écart | Phrases en double (D7), bandeau répété (D3), intro du plan à zéro action (P-5) |
| Doherty Threshold | écart | ≈ 7 s hors ligne avant l'échec (R-5) ; lectures en cascade (R-4, P-9) ; l'engagement qui clignote (P-1) ; des relances muettes (P-8) |
| Fitts | écart | « C'est noté » sous la barre d'onglets (P-2) ; écrans pleins qui ne défilent pas (T-2) ; le clavier (T-3) |
| Flow | écart | Le geste d'engagement défait (P-1) ; le focus perdu à chaque phase des écrans de compte (T-4) |
| Goal-Gradient | tient | Sans mécanique sur la personne, par construction |
| Hick | tension | Les neuf modes à plat (décidé, `v1-31`) ; « Choisir une action » vers la liste complète (D16) |
| Jakob | écart | Le retour matériel (Q-4, T-8) ; l'historique des flux de compte (T-1) ; l'onglet actif (T-14) ; le voile de la feuille (T-7) ; Entrée (T-3) ; « 01 octobre » (R-11) |
| Common Region | tient | — |
| Proximity | écart | Le lien du mode manquant (Q-8) ; l'aide de B1.1 sous ses réponses (Q-10) ; les liens de contestation loin du total (D11) ; « Voir toutes les pistes » (P-15) |
| Prägnanz | écart | Un nombre séparé de son unité à la ligne : « 2 / tonnes » dans un titre (Q-7) |
| Similarity | écart | Rayons (Q-12, T-20) ; liens (T-5) ; message d'échec = aide (T-11) ; encarts (P-12) ; barre du palier (R-8) ; un lien qui ne se lit pas comme tel (P-7) |
| Uniform Connectedness | tient | — |
| Mental Model | écart | Aller ou aller-retour (D2) ; noms des sections (Q-15) ; « palier », « marche », « cap » (D12) ; « Refais » (R-7) ; l'échéance et la question du mois (D14) ; un canal affiché sans avoir été lu (T-6) ; la 404 (D17) |
| Miller | tient | Au plus neuf grandeurs, en quatre régions |
| Occam's Razor | écart mineur | La bande haute rendue quatorze fois (T-13) ; les doublons (D7) |
| Paradox of the Active User | tension | Cinq écrans avant la première question (décidé) ; le jargon du contexte (D4) ; la carte « Plan et Suivi » (§6) |
| Pareto | tension | Le plafond « 10+ » frappe les plus gros émetteurs (§6) |
| Parkinson | écart mineur | « Environ 5 minutes » plausible mais jamais mesuré ; l'échéance qui ne change rien au point (D14) |
| Peak-End | écart | Le total hors écran au pic (D9) ; la fin de la restitution en contestations (D11) ; l'engagement défait (P-1) ; la feuille du re-bilan à la fin (§6) |
| Postel | écart | 2 ou 3 sorties par mois sans réponse (D5) ; un code collé (T-16) ; changer ses jours (D15) |
| Selective Attention | écart | Le total (D9) ; un changement qui arrive en second (R-4, P-1) ; le message d'échec (T-11) |
| Serial Position | tension | Hors premier plan, l'action engagée vient en troisième ou quatrième bloc (§6) |
| Tesler | écart | Le système suppose « 0 » à la place de la personne (D1) |
| Von Restorff | écart | Le « 0 » vert plein (D1) ; « C'est noté » inactif sans forme (D13) ; la barre du palier plus foncée que « Toi » (R-8) |
| Working Memory | écart | Le second mode ne rappelle pas le premier (D6) ; un même chiffre sous trois noms (D12) |
| Zeigarnik | tient | — |

## 4. Les écarts techniques

### 4.1 Corrigés dans la vague du 01/10/2026

Quatre chantiers en parallèle, sur des fichiers disjoints, partis du commit qui pose
`useRetourVersLaPhasePrecedente` (le retour matériel d'Android, écrit une fois pour tous les écrans à
phases). L'état de chaque ligne est celui de la PR qui porte ce document.

| ID | Loi | Le constat | La correction |
|---|---|---|---|
| Q-4, T-8 | Jakob | Le retour matériel quitte le questionnaire (et l'app au premier parcours), quitte la phase du code, ferme « Toi » confirmation ouverte : un seul `BackHandler` dans `src/`, celui de l'onboarding | Le crochet partagé, branché avec l'action déjà à l'écran (« Retour », « Utiliser une autre adresse », « Annuler ») |
| Q-7 | Prägnanz | « 2 / tonnes » dans le titre de la page 2 de l'onboarding, « 300 / km », « 700 / km » : `espacesInsecables` ne lie pas un nombre à son unité | Une règle de plus, posée au rendu par `ThemedText` |
| R-5, P-3 | Doherty | Réseau coupé, « Chargement… » pendant ≈ 7 s sur cinq écrans avant l'échec : `postgrest-js` rejoue chaque GET trois fois, et rien dans le dépôt ne le disait | `db: { retry: false }` : l'échec se dit tout de suite, et chaque écran porte déjà son « Réessayer » |
| Q-8 | Proximity | « Ton mode n'est pas dans la liste ? » sous la distance, ou sous un Oui / Non sans liste | Sous la liste qu'il complète |
| Q-10 | Jakob, Proximity | L'aide de B1.1 (« réponds Non… ») rendue après les réponses | Entre la question et les réponses, comme partout ailleurs |
| Q-12, T-20 | Similarity | Deux rayons pour deux séries de nombres sur l'écran des vols ; `radius={16}` en dur quatre fois ; un sous-titre 22/28 recopié trois fois ; un rayon 20 hors échelle | Une forme par fonction, nommée (`Radius.field`, `TypeScale.question`) et écrite dans la fiche de `Chip` |
| T-11 | Selective Attention | Le message d'échec a la taille, la graisse et la couleur de l'aide posée au-dessus | Une autre encre, sans couleur de verdict |
| Q-15 | Mental Model | Les sections annoncées par l'onboarding ne portent pas les noms de l'en-tête du questionnaire, malgré le commentaire qui l'affirme | Une seule source, `BILAN_SECTION_LABEL` |
| T-1 | Jakob, Peak-End | Après un rattachement, le retour ramène à « Ton bilan, d'un appareil à l'autre », qui propose de rattacher le compte ; après « Me déconnecter », au plan quitté (`router.replace` ne remplace que le haut de la pile) | `terminerLeFlux` : vider la pile, puis remplacer — la règle de l'onboarding (`v1-11` §9.4) |
| T-2 | Postel, Fitts | Sept écrans pleins sans défilement : à 320 × 568 la mascotte de `/connexion` est à − 57 px ; à 360 × 640 « Utiliser une autre adresse » sort de 34 px | Un défilement qui ne change rien à 390 × 844 |
| T-3 | Jakob, Fitts | Entrée n'envoie rien (zéro `onSubmitEditing` dans `src/`) ; clavier ouvert, le premier toucher sur « Envoyer » ne fait que le fermer | La touche d'action du clavier, et `keyboardShouldPersistTaps` |
| T-4 | Flow | Aucun changement de phase des écrans de compte ne rend le focus (mesuré : `BODY`) | `TitreDArrivee` sur ce qui arrive, au geste seulement |
| T-6 | Mental Model | « Toi » affiche « Par email » comme réglage quand la lecture de `profiles` échoue | Un échec explicite, et l'état « indisponible » qui existe déjà |
| T-7 | Jakob | Toucher le voile d'une feuille ne fait rien | Le voile ferme, comme le retour |
| T-15 | Chunking | « Les rappels » n'est pas annoncé comme un titre ; trois styles de section ; 16 px entre sections comme dedans | Un rôle, un style, 32 entre sections |
| T-16 | Postel | Coller « Le 01/10, ton code : 84792469 » donne « 01108479 », refusé comme expiré | La suite de huit chiffres d'abord |
| T-17 | Mental Model | L'échec Google colle un message anglais dans une phrase française | Le détail à part, en chasse fixe |
| Q-12 (focus) | Prägnanz | Sur web, un contour rectangulaire dans le champ arrondi, dont la bordure reste grise | La bordure d'accent au focus, comme le kit l'écrit |
| P-1 | Flow, Peak-End, Doherty | Après « C'est noté », la carte réaffiche « Je m'y engage » le temps de la relecture, puis l'action engagée quitte l'écran (752 px sous une barre à 784) et le focus tombe sur le document | Le sélecteur tient jusqu'à la relecture ; la carte engagée revient dans la fenêtre, une fois |
| P-2 | Fitts | Sur le plan, « C'est noté » s'ouvre sous la barre d'onglets ; la liste, elle, défile | Le même défilement minimal que la liste |
| P-5 | Mental Model | Sur un plan à zéro action, « Une action par saison, une seule » au-dessus d'aucune action ; le trait de la saison n'y apparaît jamais | La planche C du HANDOFF de `v1-17`, enfin appliquée |
| P-7 | Similarity | « Pas de trajet la semaine dernière » se lit comme une légende | Souligné, comme ses deux voisins |
| P-8 | Doherty | Trois relances qui ne changent rien à l'écran pendant leur lecture | Le contrôle inactif jusqu'à la fin du chargement |
| P-9 | Doherty | Les deux premières lectures du plan en série sans raison | Ensemble |
| P-10 | Peak-End | Le pied daté du point répondu n'arrive qu'à la relecture suivante | Composé avec l'instant du geste |
| P-12 | Similarity | Deux « Compris » de styles différents ; un encart de fait teinté d'accent | Un gabarit |
| P-13 | Jakob, Doherty | `/contexte` : une roue immédiate sans texte ni sortie ; « Enregistrer » inactif sans dire pourquoi | Le chargement des onglets ; « Enregistrer » qui mène à ce qui manque |
| P-15 | Proximity | « Voir toutes les pistes · N » à égale distance des cartes et de l'encart | Dans le bloc des cartes |
| T-14 | Jakob | Toucher l'onglet où l'on est ne remonte pas en haut | `useScrollToTop`, la racine de la pile gardée |
| R-4 | Doherty, Selective Attention | La restitution attend deux allers-retours avant de s'afficher, quatre avant la comparaison, et la barre du bilan précédent s'insère après coup au-dessus de « Toi » | Les lectures ensemble, la comparaison dès le premier rendu |
| R-7 | Mental Model | « Refais ton bilan » sur le suivi, le mot que `v1-19` D1 a retiré | « Fais un nouveau bilan » |
| R-8 | Von Restorff | La barre du palier est le vert le plus foncé de la carte, devant « Toi » | Le remplissage des repères |
| R-9 | Similarity | Le chargement et l'erreur de la restitution sans la bande haute : saut de 52 px | Le cadre de l'état prêt |
| R-10 | Peak-End | La phrase de variation d'un re-bilan en `small`, sous cinq barres | En `body`, comme le canvas validé de `v1-14` |
| R-11 | Jakob | « 01 octobre 2026 » ici, « 1er » partout ailleurs | `jourDuMois` |

### 4.2 Reportés, et pourquoi

| ID | Le constat | Pourquoi pas maintenant |
|---|---|---|
| T-5 | Sept apparences de `TextLink` (le kit en documente quatre) ; « J'ai déjà un compte » en cinq ; des « Retour » gris collés à une phrase grise du même corps | Trente et un fichiers : il entrerait en conflit avec chaque chantier de la vague. À faire seul, juste après. **Fait le 03/10/2026**, plus bas |
| T-9 | Huit formes d'attente, dont quatre qui n'attendent pas les 300 ms | Un composant `LigneDAttente` partagé, même raison que T-5 ; les deux cas les plus visibles (`/contexte`, `/connexion/retrouver`) sont traités dans la vague. **Fait le 03/10/2026**, plus bas |
| T-10 | « Retour » : trois styles, trois places selon le détour | Une décision de dessin : déplacer « Plus tard » détacherait la phrase qui dit ce qu'on perd sans compte (`v1-28` §7.2) |
| T-12 | Le plancher de 1 450 ms du lancement passe **avant** la lecture du plan au lieu de la couvrir | Sortir la lecture du plan de son écran d'abord ; effort L, gain à mesurer sur appareil |
| T-13 | La bande haute rendue quatorze fois, état par état — R-9 en est la conséquence | Elle change l'origine des défilements que P-1 et P-2 mesurent : après eux. **Fait le 03/10/2026**, plus bas |
| T-3 (c) | Le pied collant face au clavier ; « Recevoir un code » à 468 px du champ | Ce que fait l'edge-to-edge du SDK 57 se mesure sur appareil avant d'ajouter un `KeyboardAvoidingView` |
| T-7 (glissé) | La poignée de la feuille promet un glissé qui n'existe pas | Un seuil de glissé se juge au doigt |

**T-5, fait le 03/10/2026.** `TextLink` prend une `apparence` obligatoire et ne prend plus ni `type`,
ni `themeColor`, ni `weight` ; de son `style`, il ne lit que l'alignement. Trois apparences, au corps
`small` : `action` (`accentText` 600), `discret` (`textTertiary`) et `souligne` (le même gris, souligné
au repos). La correspondance : l'accent 600 et `linkPrimary` deviennent `action`, comme les six liens
au corps par défaut (16 px, l'encre du texte) posés sous un bouton principal, qui se lisaient comme
du texte ; le gris devient `discret`, le gris souligné `souligne`, et les deux liens de transparence en
`textSecondary` ou tertiaire 600 (« Ce qu'on enregistre, et pourquoi », « Comment ce chiffre est
calculé ») deviennent `discret`. **Un lien discret qu'une phrase du même gris touche passe en
`souligne`** — c'était le troisième constat de T-5 : « Retour » sous « Reviens en arrière », « Plus
tard » sur `/connexion`, l'« Annuler » de `/feedback`, « Renvoyer un code » et « Utiliser une autre
adresse », les pages légales de « Toi », les deux liens de contestation sous la méthode dépliée de la
restitution — et tout « Annuler » posé à côté d'un bouton de confirmation (`/compte/suppression`
rejoint `MonCompte` et le retrait d'un bilan). « J'ai déjà un compte » garde **deux** formes de lien :
`action` sous le bouton principal d'un écran vide et sur `/connexion/email`, et `souligne` sur
l'accroche de l'onboarding, où v1-10 l'a voulu discret. Les types `link` et `linkPrimary` de
`ThemedText` sont partis, dans le dépôt comme dans le kit. La règle : `FRONT.md` §2.4. « Retour »
garde une forme par détour, et c'est T-10.

**T-9, fait le 03/10/2026.** `LigneDAttente` (`src/components/ligne-d-attente.tsx`) porte la forme — `body`,
`textSecondary` — et le délai de `v1-30` §5.8 ; les six lignes « Chargement de ton … » passent par elle :
le plan, le suivi, les pistes et `/contexte` (qui étaient en corps par défaut ou en `body`), « Toi » (en
`small` tertiaire), et la restitution, seule à rester immédiate (`immediate`), parce que son HTML
statique la porte et que la section D de `verifier-etats-export.mjs` la lit. Les quatre lignes qui
n'attendaient pas étaient la restitution, `/compte/suppression`, `/rappels/stop` et `/status` : les
trois dernières sont des pages qu'on ouvre à froid par leur adresse, dont la phrase est la première de
la page — « Un instant, on … » —, remplacée au même corps par le résultat. Elles restent telles
quelles, et `FRONT.md` §1.2 le dit. `/connexion/retrouver` reste muette pendant sa lecture, comme la
vague l'a laissée.

**T-13, fait le 03/10/2026.** La bande haute et la zone sûre du haut sont posées par chaque pile
d'onglet, autour de sa `Stack` (`CadreDOnglet`, `src/components/cadre-d-onglet.tsx`), et plus par
chaque écran : le relevé en comptait seize rendus pour quatre écrans (le plan six, le suivi et la
restitution quatre chacun, les pistes deux). Un état ne peut plus oublier la bande — c'était R-9 —,
et l'icône du compte n'est plus démontée quand l'écran change d'état. Ce qui bouge à l'œil : la bande
ne glisse plus avec un écran poussé dans la pile (les pistes, une restitution), elle reste au-dessus.
L'origine des défilements ne change pas — la bande occupe la même place —, et les gardes de P-1 et
P-2 du parcours réel passent telles quelles. La garde : `src/tests/ecrans/cadre-des-piles.test.tsx`.

R-12 (l'écran « Restitution » du kit, qui montrait encore la barre 2050 au-dessus de la moyenne et
« Modifier mes réponses ») figurait ici : il a été fait avec la vague produit, une fois D9 et D10
tranchées.

### 4.3 Trouvés en chemin, et corrigés dans la même PR

Aucun de ces défauts n'était dans l'audit. Chacun est sorti d'une mesure faite pour autre chose,
et chacun a sa garde.

| Le défaut | Depuis | Trouvé par | La correction |
|---|---|---|---|
| **Toucher un onglet empilait une seconde racine** : `navigate(onglet, { screen: 'index' })` empile sous React Navigation 7 au lieu de revenir. Le retour ramenait à un second plan, ou à une restitution restée montée sous le suivi | 07/09/2026 | T-14, en mesurant la remontée en haut | `pileALaRacine` : la pile remplacée par sa seule racine, qui garde sa clé (`FRONT.md` §2.11) |
| **La bannière de compte de la restitution arrivait une image après le résultat**, et poussait le total de 92 px vers le bas | `v1-28` | D9, en mesurant où tombe le total | Lue au montage, avec le résultat (`FRONT-SUIVI.md`) |
| **« Oui » à B1.6 ne faisait pas défiler la zone qui s'ouvre** : le contenu était trop court pour que `scrollTo` l'atteigne | `v1-31` | Le chantier A, sur une capture | Une réserve de hauteur sous l'étape (`StepShell`), gardée par la section K de `verifier-etats-export.mjs` |
| **Sur web, le voile d'une feuille prenait le focus d'ouverture** à la place de « Commencer » : le piège à focus du `Modal` de react-native-web pose le focus sur le premier descendant qui l'accepte, et un `Pressable` en porte toujours un `tabindex` | T-7, le soir même | La CI de la PR | Le voile devient une vue à répondeurs, sans `tabindex` (`FRONT-MOUVEMENT.md` §2.12, `EXPO.md` §1.5) |
| **Sur web, toucher le voile n'a jamais refermé une feuille** : la place au-dessus de la feuille était une vue animée, et reanimated pose ses styles en ligne, où `box-none` n'est pas du CSS | `feuille-du-bas.tsx` | Le diagnostic du défaut précédent | La place devient une vue ordinaire, seule la feuille s'anime ; une étape de plus au parcours réel |
| **Des rappels illisibles effaçaient la carte d'attente du plan** sans que la ligne de relecture s'allume — effet de bord de T-6, `loadReminderPrefs` rendant désormais `null` | T-6, dans cette PR | Le chantier B | La dernière lecture réussie est gardée, et l'échec compte dans la relecture (`FRONT.md` §1.2) |
| **La garde de la carte engagée du parcours réel tombait sans défaut** une fois sur deux sous « réduire les animations » : le défilement posé d'un coup tombe parfois dans l'image même de la relecture | `v1-33` P-1 | La CI de la PR, et le chantier G sur sa branche | Lue aussi à l'appel de défilement, et rapportée à la position d'avant (`TESTING-GARDES.md` §2.14, règle 10) |

**Et la contre-lecture du diff entier**, en trois relecteurs, a trouvé cinq défauts de plus, corrigés
avant la fusion, chacun avec son test et sa mutation :

| Le défaut | La correction |
|---|---|
| **Le retour matériel était pris par un écran couvert** : le questionnaire, caché sous `/feedback` (« Ton mode n'est pas dans la liste ? »), reculait d'une étape pendant que `/feedback` restait affiché — un retour qui paraît mort. Trois appelants portaient la garde du premier plan, le questionnaire et l'onboarding non | La garde vit dans `useRetourVersLaPhasePrecedente` (`EXPO.md` §1.7) |
| **L'accent du point allait à une question composée sur une action quittée**, quand un seul point était composé | Le point doit porter l'action suivie aujourd'hui (`accentDesPoints`, `BOUCLE.md` §2) |
| **« C'est noté » pouvait redevenir actif avant la relecture** : le nombre de lectures était lu au toucher, et une lecture terminée pendant l'aller-retour passait pour celle qui suit | Lu au retour du RPC |
| **Un « Oui » aux longs trajets relu des compteurs retombait sur « Non »** au toucher d'un « 0 », et les séries disparaissaient sous le doigt | Toucher une série pose le « Oui » |
| **Un code espacé suivi d'une date à tirets** rendait la date (T-16) | Les espaces seules avant les tirets |

## 5. Les questions de produit

Chacune sous la forme de `CLAUDE.md` : le fait, ce qui est en jeu, la recommandation, ce qu'on casse si
on se trompe. **Posées et tranchées le 01/10/2026**, une par une, avec la personne qui pilote :
**toutes les recommandations sont suivies, sauf D10.** La colonne « Où » dit où chacune se fait : la
**vague produit** touche les seuls écrans ; un **chantier à part**
touche au schéma (une migration, un RPC, la paire SQL / TypeScript de la boucle) et se livre seul (§8).

**Les deux vagues sont parties dans la même PR** (#314), la vague produit sur l'arbre intégré de la
technique : toutes les lignes « vague produit » de ce tableau, et les quatre tensions tranchées
« vague produit » de §6, y sont. Les textes qui restaient à valider ont été tranchés le 02/10/2026,
et ce que la vague a relevé en chemin est en §9.

| | Décidé le 01/10/2026 | Où |
|---|---|---|
| D1 | Recommandation : les vols réclamés sans réponse cochée ; les longs trajets ouverts par une question Oui / Non | vague produit |
| D2 | Recommandation : « Un aller-retour compte pour deux trajets. » | vague produit |
| D3 | Recommandation : le bandeau du re-bilan à la première étape seulement | vague produit |
| D4 | Recommandation : des questions, et une ligne d'aide sous la zone | vague produit |
| D5 | Recommandation : une quatrième réponse, « Deux ou trois fois par mois » | chantier à part (migration, pgTAP) |
| D6 | Recommandation : « En plus de : {mode principal}. » | vague produit |
| D7 | Recommandation : les deux redites retirées | vague produit |
| D8 | Recommandation : le « 0 » indicatif retiré | vague produit |
| D9 | Recommandation : le total juste sous la carte dominante | vague produit |
| D10 | **La barre du repère 2050 reste en relecture** : sans palier, le repère sert d'horizon. Ce n'est pas un défaut, et `FRONT-SUIVI.md` le dit désormais, pour qu'une prochaine relecture ne le « corrige » pas | documentation |
| D11 | Recommandation : « Un chiffre me semble faux » et le retrait sous « Comment ce chiffre est calculé » | vague produit |
| D12 | Recommandation : la phrase dit « Ton cap pour cette saison », la barre garde « Ton prochain palier » | vague produit |
| D13 | Recommandation : « C'est noté » en attente, qui dit ce qui manque | vague produit |
| D14 | Recommandation : le mois du choix, la question générique | chantier à part (paire SQL / TypeScript) |
| D15 | Recommandation : « Modifier les jours » / « Modifier l'échéance » sans libérer | chantier à part (RPC, archive) |
| D16 | Recommandation : « Choisir une action » amène la première piste du plan | vague produit |
| D17 | Recommandation : « Rien n'a changé de ton côté — je te ramène. » | vague produit |
| D18 | Recommandation : « Envoyer » en attente, avec la phrase existante | vague produit |
| D19 | Recommandation : une erreur du serveur ne parle pas de la connexion | vague produit |

### Le questionnaire

- **D1 — Les vols et les longs trajets arrivent répondus « 0 »** (Q-1). Quatre compteurs démarrent à 0
  (`EMPTY_BILAN_ANSWERS`) : la puce « 0 » est cochée en vert plein, « Suivant » est actif, et le profil
  minimal traverse les deux étapes du poste le plus lourd sans un toucher. C'est le motif que le dépôt
  s'interdit (« une question à laquelle personne n'a répondu ne vaut pas Non », `v1-16` §4), resté
  parce qu'il préexistait. **Recommandation** : les vols sans réponse cochée, réclamés comme toute
  question ; les longs trajets ouverts par une question « Hors avion, fais-tu des trajets de plus de
  300 km sur une année type ? » (Oui / Non) — « Non » vaut zéro partout, et pour la majorité l'étape
  passe de 33 cibles à 2. **Ce qu'on casse** : deux touchers de plus au profil minimal, et une
  question neuve.
- **D2 — Un « trajet » de plus de 300 km est-il un aller ?** (Q-2). Le calcul compte 800 km par trajet
  en train et 700 en voiture ou en autocar, donc un aller, comme les vols ; l'écran des vols le dit
  (« Un aller-retour compte pour deux vols »), celui des trajets non. **Recommandation** : « Un
  aller-retour compte pour deux trajets. », et la méthode le précise. **Ce qu'on casse** : rien, si
  800 km veut bien dire un aller (le code et la spécification le disent).
- **D3 — Le bandeau du re-bilan sur les neuf étapes** (Q-3). Il prend ≈ 76 px et fait passer la liste
  des modes sous le pied, sur un écran qui s'est battu pour la faire tenir. **Recommandation** : à la
  première étape seulement, et « préremplies » écrit d'une seule façon. **Ce qu'on casse** : qui
  reprend un re-bilan au milieu ne relit pas le bandeau — il voit ses réponses cochées.
- **D4 — Le contexte demande de se classer sans question ni repère** (Q-5). Trois intitulés
  (« Type de zone »…) là où toutes les autres étapes posent une question, et des catégories sans
  définition (« Périurbain », « Limité ») qui décident pourtant de la moyenne montrée et des actions
  proposées. **Recommandation** : des questions (« Dans quel type de zone vis-tu ? »…) et une ligne
  d'aide sous la zone ; les valeurs ne bougent pas, donc ni migration ni miroir. **Ce qu'on casse** :
  une définition de « périurbain » qui ne colle pas aux filtres des gabarits ferait mal classer — elle
  se relit avec `PLAN.md`.
- **D5 — Aucune réponse pour deux ou trois sorties par mois** (Q-6). Le calcul compte 0,25, 1 et 3
  sorties par semaine ; entre « Rarement » et « Une fois par semaine », chacun se trompe d'un facteur 2
  environ. **Recommandation** : une quatrième réponse, « Deux ou trois fois par mois » — c'est une
  migration, avec le recalcul de toute la suite pgTAP (`TESTING-PGTAP.md` §2.2), donc un chantier à
  part. **Ce qu'on casse** : toutes les valeurs attendues de pgTAP, à recalculer par requête.
  **Livré le 02/10/2026** (`BILAN.md` §1) : `multiple_monthly`, 0,6 sortie par semaine, et la phrase
  de méthode qui le dit — tous deux validés le 02/10/2026, avec la réplique de Ramille à l'entrée de
  l'étape, qui passe d'« une semaine ordinaire » à « Pense à un mois ordinaire, pas au meilleur ni
  au pire. » : la semaine poussait vers l'erreur que D5 corrige. **Ce qu'on
  cassait était surestimé** : ajouter une fréquence ne touche ni un facteur ni un bilan existant,
  donc aucune valeur attendue de la suite n'a bougé ; c'est le `case` du calcul, sans `else`, qui
  demandait de l'attention.
- **D6 — Le second mode ne rappelle pas le premier** (Q-11). « Utilises-tu un second mode en
  complément ? » ne dit pas de quoi, et « Lequel ? » retire le mode principal sans le dire.
  **Recommandation** : « En plus de : {mode principal}. Par exemple vélo puis train. » **Ce qu'on
  casse** : une ligne de plus sur une étape qui se traverse vite.
- **D7 — Ce qui se dit deux fois** (Q-13). Sur le contexte, Ramille dit « Ce qui est possible là où tu
  vis change ce que je te proposerai ensuite. » puis le produit « Ton plan ne propose que ce qui tient
  avec ces réponses. » ; sur les loisirs sans trajet, un encart « ton bilan compte N étapes » répète
  l'en-tête, change de chiffre sous le doigt, et **remplace** les exemples (« Sport, sorties, visites à
  la famille. ») pour le profil qui en a le plus besoin. **Recommandation** : retirer la phrase du
  produit sur l'étape (elle reste sur `/contexte`), et l'encart au profit des exemples pour tous.
  **Ce qu'on casse** : la règle du contexte doit rester dite une fois.
- **D8 — Le « 0 » gris du champ de distance** (Q-14) se lit comme une valeur, et c'est la seule que le
  champ refuse. **Recommandation** : le retirer ; l'intitulé et « km » suffisent. **Ce qu'on casse** :
  rien de mesurable ; le contour gris dit déjà qu'il y a un champ.

### La restitution et le suivi

- **D9 — Le total n'est pas à l'écran à la sortie du questionnaire** (R-1). À 390 × 844, « 4,2 t
  CO₂e » tombe ≈ 43 px sous le pied collant : la bannière de compte et la carte « Répartition par
  poste » passent devant, alors que le handoff donne le total juste après la carte dominante.
  Au-dessus du pli, cinq chiffres, aucun n'est le total. **Recommandation** : remonter le bloc du
  total juste sous la carte dominante, sans changer un mot. **Ce qu'on casse** : la lecture « les
  postes, puis leur somme », et la répartition passe à moitié sous le pli.
- **D10 — En relecture, la barre « Repère transport 2050 — 0,6 t » revient au-dessus de la moyenne**
  (R-2). Sans palier (toute relecture), `|| !palier` la montre quel que soit le total : « 4,2 t contre
  0,6 t », le rapport que la décision du palier a retiré, sur le chemin de chaque retour à un bilan.
  La règle écrite est inverse (le repère « n'apparaît que sous la moyenne »). **Recommandation** :
  appliquer la règle ; quand il ne reste que la barre « Toi », la ligne sans barre, comme le suivi.
  **Ce qu'on casse** : un bilan relu au-dessus de la moyenne ne nomme plus 2050 nulle part.
- **D11 — La fin de la restitution est une pile de contestations** (R-3). Les derniers éléments avant
  le bouton sont « Un chiffre me semble faux » et « Ce bilan ne me ressemble pas », ≈ 650 px sous le
  total qu'ils contestent. **Recommandation** : les poser sous « Comment ce chiffre est calculé » ; la
  fin devient la marche, le partage, le pas suivant. **Ce qu'on casse** : posée sous le chiffre, la
  contestation peut se lire comme une invitation à douter au moment même où il apparaît.
- **D12 — Un même chiffre sous trois noms** (R-6). 384 kg est « Ton prochain palier » (en barre, 3,8 t),
  « une marche » (en phrase), puis « Ton cap pour cette saison » sur le plan : le pont entre les deux
  écrans ne tient que par le nombre. **Recommandation** : la phrase dit « Ton cap pour cette saison :
  384 kg CO₂e de moins sur l'année… Le plan qui suit propose de quoi le franchir » ; la barre garde
  « Ton prochain palier ». **Ce qu'on casse** : « cap » peut se lire comme une exigence ; la branche
  « déjà sous le repère » ne change pas.

### Le plan

- **D13 — « C'est noté » inactif n'a pas de forme** (P-4). Un texte gris sur le gris du sélecteur, puis
  un bouton vert plein dès un choix ; toucher sans avoir choisi ne fait rien. Le questionnaire a résolu
  le même cas par l'attente qui demande (`v1-31`) ; `v1-32` §10 l'avait renvoyé à un brief.
  **Recommandation** : le même motif — « C'est noté » en attente, et au toucher « Choisis au moins un
  jour. » ou « Choisis une échéance. ». **Ce qu'on casse** : rien si `isIntentionComplete` garde
  toujours l'appel.
- **D14 — L'échéance choisie ne règle pas ce que le point demande** (P-6). « Le mois prochain » choisi
  en octobre, et le 1er novembre la question dit « En octobre, as-tu fait… ? » — dont la réponse
  honnête est « Non ». **Recommandation** : le mois du choix, le point pose la question générique
  plutôt que celle de l'engagement (paire SQL / TypeScript de la boucle, `BOUCLE.md`). L'autre voie,
  plus simple : retirer « Le mois prochain ». **Ce qu'on casse** : le point cesse de refermer
  l'engagement le mois même où l'action a lieu, si la règle est mal bornée.
  **Livré le 02/10/2026** (`BOUCLE.md` §2) : bornée sur « postérieur » au mois du choix, lu en heure
  de Paris — le mois où l'action a lieu reste interrogé, éprouvé par le test `43`. Et la feuille
  ouverte après « C'est noté » nomme le mois du premier point qui l'interroge, décidé le même jour
  avec la personne qui pilote : « Début décembre, je reviens te demander si tu l'as faite. » Avec
  deux suites tranchées ce soir-là : la carte d'attente garde « au début du mois prochain » — elle
  annonce le prochain contact, quel qu'en soit le sujet —, et la carte engagée comme le suivi relisent
  une échéance relative au mois qu'elle vise (« en novembre » et non « le mois prochain »,
  `formatIntention`).
- **D15 — Changer ses jours oblige à libérer l'engagement** (P-11). La carte engagée n'offre que
  « Changer d'avis », qui libère et archive sans confirmation ni retour ; passer de « mardi et jeudi »
  à « mardi » coûte quatre gestes et une ligne d'archive. **Recommandation** : « Modifier les jours » /
  « Modifier l'échéance » sur la carte engagée, qui rouvre le sélecteur prérempli sans libérer — un
  RPC à étendre, donc un chantier à part. **Ce qu'on casse** : la règle « aucun chemin ne détruit un
  engagement sans l'archiver », si la modification réécrit sans trace. **Et D14 depuis le
  02/10/2026** : sa règle et la relecture « en novembre » lisent `committed_at` comme le jour où
  l'échéance a été choisie. Modifier l'échéance en gardant `committed_at` les ferait mentir toutes les
  deux — « Ce mois-ci » choisi en septembre, changé en « Le mois prochain » en octobre, serait
  interrogé le 1er novembre sur octobre (`BOUCLE.md` §2).
  **Livré le 02/10/2026** (`PLAN.md`) : « Modifier les jours » ou « Modifier l'échéance » précède
  « Changer d'avis » sur la carte engagée et rouvre le sélecteur prérempli ; l'intention remplacée
  s'archive (raison `modification`), et `committed_at` repart à maintenant — la règle de D14 reste
  vraie. **La contre-lecture du même soir en a trouvé trois défauts côté base**, corrigés avant la
  fusion : « Le mois prochain » redit le mois suivant passait pour identique, alors qu'il vise un autre
  mois ; une modification posait la date du mot de la veille sur un cycle reconduit ; et la vue
  d'analyse la comptait comme un gabarit quitté. **Une décision de produit y a été prise, avec la
  personne qui pilote, le 02/10/2026** : le préremplissage redit le même mois — « Le mois prochain » choisi en septembre se rouvre en octobre sur
  « Ce mois-ci ».
- **D16 — « Choisir une action » de la carte de saison mène à la liste complète** (P-14), alors que les
  deux cartes choisies par le plan sont juste dessous. **Recommandation** : refermer la carte et
  amener la première piste dans la fenêtre ; la liste reste derrière « Voir toutes les pistes ».
  **Ce qu'on casse** : un geste de plus pour qui voulait tout voir.

### Les surfaces de service

- **D17 — La page introuvable promet un bilan à qui n'en a pas** (T-18) : « Ton bilan et ton plan, eux,
  sont toujours là — je te ramène. », avant de montrer l'onboarding à qui arrive par un lien tronqué.
  **Recommandation** : « Rien n'a changé de ton côté — je te ramène. » **Ce qu'on casse** : la phrase
  rassure moins qui a un bilan.
- **D18 — Un formulaire incomplet se dit de trois façons** (T-19) ; sur `/feedback`, « Envoyer » est
  désactivé à vide sans rien dire. **Recommandation** : le motif du questionnaire, avec la phrase qui
  existe déjà (« Trois caractères au moins pour pouvoir l'envoyer. »). **Ce qu'on casse** : un
  « Envoyer » qui paraît actif sur un champ vide.
- **D19 — Sur une erreur 500, le plan dit « Vérifie ta connexion. »** — la connexion de la personne n'y
  est pour rien. **Recommandation** : sur une erreur du serveur, la phrase ne parle pas de la
  connexion (texte à écrire). **Ce qu'on casse** : rien.

## 6. Les tensions avec une décision prise, quand la loi apporte un argument neuf

| La décision | La loi | L'argument neuf | Tranché le 01/10/2026 |
|---|---|---|---|
| « 10+ » enregistre 10 (`v1-05`, simplification assumée) | Pareto, Postel | Le plafond frappe précisément les plus gros émetteurs : 20 vols comptent pour 10, soit la moitié du poste le plus lourd. Le cas jumeau (« Plus de 30 km ») ouvre déjà un champ | **Un champ sous « 10+ »**, pour les vols et les trois séries des longs trajets — chantier à part, avec D1 côté écran. **Livré le 02/10/2026**, sans migration — la base admettait déjà tout compte positif, jusqu'à la borne d'un `smallint` (32 767), à laquelle le champ s'arrête. Précisé ce jour-là avec la personne qui pilote : le champ est **réclamé** ; au-delà de dix vols, la part de vols courts devient un champ, même question, borné au total ; au-delà de cinquante, une ligne de relecture, jamais un blocage — « C’est beaucoup pour une année : vérifie le chiffre. », la phrase de l'option retenue ; libellé « Environ combien, sur une année ? » (`FRONT-QUESTIONNAIRE.md` §2.6) |
| La feuille « Ton plan va être recalculé » à la soumission d'un re-bilan (`v1-19` D4) | Peak-End | Elle arrive au terme de neuf étapes et dit « ton bilan actuel est toujours juste » : la fin colore l'effort entier | **La dire avant de commencer**, au toucher de « Faire un nouveau bilan » — vague produit |
| « Faire un nouveau bilan » sur la restitution (`v1-19` D1) | Mental Model | Depuis l'arbitrage du 28/09/2026 (« la correction gagne »), un bilan refait le même jour **remplace** le précédent dans le suivi : le lien dit « nouveau » pour une correction | **Pas encore posée** : elle touche au rythme des bilans (`v1-19`) et se pose avec la prochaine décision sur ce sujet |
| L'accent de la carte du point suit le poste dominant (27/08/2026) | Selective Attention | Depuis le 30/09/2026, la question du mois suit l'action engagée : celle qui referme l'engagement peut être la grise | **L'accent sur la question de l'engagement** quand deux points sont ouverts — vague produit |
| La carte « Plan et Suivi » se ferme par son « Compris » (HANDOFF `v1-17`) | Paradox of the Active User | Tant qu'on ne touche pas « Compris », elle occupe ≈ 36 % de la fenêtre à chaque visite et repousse le point à 514 px — sur toutes les captures qui suivent | **Vue une fois, puis partie**, « Compris » touché ou non — vague produit |
| `repondre_au_checkin` refuse un point déjà répondu (C1.12, C2.4) | Postel, Fitts | « Non » et « Oui » sont à 8 px l'un de l'autre, et un toucher erroné est définitif ; corriger une réponse n'a jamais été posé comme question de produit | **Corrigeable tant que la période court** — chantier à part (RPC, suivi). **Livré le 02/10/2026**, précisé ce jour-là avec la personne qui pilote : un lien « Modifier ma réponse » sur la carte répondue rouvre les trois réponses sous « Ta réponse : oui. » ; la réplique est celle de la nouvelle réponse ; la correction tient jusqu'au point suivant — « la période » est celle de l'affichage de la carte, la période interrogée étant déjà passée quand on répond (`BOUCLE.md` §2) |
| La suppression du compte emploie le principal (kit) | Von Restorff | Sur « Toi » en confirmation, deux principaux verts : « Rattacher un compte » et « Supprimer définitivement » | **Le rattachement en secondaire** pendant la confirmation — vague produit |
| Au premier plan seulement, les pistes passent avant le cap (`v1-29` n° 3) | Serial Position | Hors premier plan, l'action engagée vient en troisième ou quatrième bloc, sous le pli avec un point ou une carte d'ouverture | Juger après P-1, à la recette |
| Le plancher de lancement de 1 450 ms (`v1-13`, décision D13) | Doherty | Il sérialise la lecture du plan derrière lui | Technique, sans rouvrir cette décision : T-12 |

Sans argument neuf, et donc rien à rouvrir : les neuf modes à plat (`v1-31`), « Retour » sans
« Passer » (`v1-29` §6.3), « Oui » et « Non » de même poids, le trait en `accentMuted`, la meilleure
piste du poste dominant en tête, « par an » sous le cap, le portrait, l'icône du compte plutôt qu'un
troisième onglet, `paraitChoisie`.

## 7. Ce qui se mesure, et ne l'a jamais été

- **« Environ 5 minutes »**, annoncé trois fois avant le questionnaire, vient du handoff et n'a jamais
  été mesuré. Par comptage (10 à 36 touchers, 5 à 9 écrans), il est plausible et plutôt prudent ; la
  durée réelle se lit sans rien coder dans `usage_events` (première vue d'étape contre
  `submitted_at`).
- **Les captures sont de Chromium de bureau** : ni tactile, ni zone sûre, ni clavier virtuel, ni
  police à 200 %. Le retour matériel, le clavier et les feuilles se vérifient sur appareil (`v1-13`
  §11).

## 8. Le plan de livraison

Trois temps, parce que les fichiers se recouvrent et que le schéma ne se touche pas comme un écran :

1. **La vague technique** (§4.1) et ce document, dans une PR. Quatre chantiers en parallèle sur des
   fichiers disjoints — le questionnaire et le socle ; le compte et la connexion ; le plan ; la
   restitution et le suivi —, intégrés, contre-lus sur le diff entier, la CI rejouée.
2. **La vague produit** : les décisions de §5 et §6 qui ne touchent qu'aux écrans (D1 côté écran, D2,
   D3, D4, D6 à D9, D11 à D13, D16 à D19, et les quatre tensions tranchées « vague produit »). Elle
   part de l'arbre intégré de la première, parce qu'elle touche les mêmes écrans. **Partie dans la
   même PR que la première** (#314) : trois chantiers — le questionnaire, la restitution et le
   suivi, le plan et le contexte —, puis les surfaces de service.
3. **Les chantiers à part**, un par un, chacun avec sa migration, ses tests pgTAP recalculés par
   requête et sa contre-lecture : la quatrième fréquence des loisirs (D5, livrée le 02/10/2026), la question générique le
   mois du choix (D14, livrée le 02/10/2026), « Modifier les jours » (D15, livré le 02/10/2026), le champ sous « 10+ » (livré le 02/10/2026), et la réponse au point
   corrigeable dans sa période (livrée le 02/10/2026).

Puis les reports techniques de §4.2, en commençant par T-5 (les liens), qui touche trente et un
fichiers et doit passer seul — fait le 03/10/2026.

## 9. Ce qui reste ouvert après la PR #314

**Tranché le 02/10/2026** avec la personne qui pilote, toutes les recommandations suivies :

- **les textes écrits pendant la vague sont validés tels quels** — les deux questions de D4, les phrases
  du serveur de D19, les trois phrases où « refaire » a été retiré ;
- **l'aide sous la zone est alignée sur le plan** : « Urbain dense : une grande ville et sa proche
  banlieue, là où passent métro ou tram. Périurbain : sa couronne, ou une ville moyenne ou petite.
  Rural : un bourg, un village, la campagne. » Ce qu'on accepte : une banlieue sans métro ni tram qui
  choisit « Périurbain » perd aussi l'action « transports en commun pour deux sorties sur cinq » ;
- **la ligne de relecture du suivi a sa phrase du serveur** : « Ton suivi n’a pas pu être relu à
  l’instant : ce que tu vois peut avoir changé depuis. » ;
- **le voile ferme toutes les feuilles**, celle des rappels comprise : le retour d'Android fait déjà la
  même chose, et le réglage reste dans « Toi » ;
- **l'ordre de la suite** : la session refusée d'abord (PR #315), puis ces textes, puis les chantiers à
  part, un par un. (Ce paragraphe a écrit « un par jour » jusqu'au 02/10/2026. Le rythme venait du
  texte de l'option proposée, pas d'une raison : la personne qui pilote l'a relevé le jour même —
  « comment ça un par jour ? pourquoi faire ? » —, et rien ne l'impose. Ce qui tient, c'est « un par
  un » — §8 —, parce que chacun touche le schéma.)

Et **la phrase de `/feedback` passe à l'encre de ce qui manque au toucher d'« Envoyer »** (`accentText`,
600), calme pendant la frappe comme avant : c'est la fin de D18, dont la recommandation était déjà « le
motif du questionnaire ».

**Des textes rendus sans décision qui les nomme mot pour mot** — la contre-lecture les a relevés : la
décision fixait l'intention, la phrase a été écrite pendant la vague. **Validés le 02/10/2026.**

- **D4** : « Comment sont les transports en commun près de chez toi ? » et « Combien de véhicules
  motorisés dans ton foyer ? » — seule la question de la zone était donnée.
- **D19**, les quatre phrases du serveur : « Ton plan n’a pas pu être relu. Réessaie dans un
  instant. », « Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé
  depuis. », « Ton suivi n’a pas pu être relu. Réessaie dans un instant. », « Tes réponses n’ont pas
  pu être lues. Réessaie dans un instant. »
- **« refaire » retiré de trois phrases** (application de `v1-19` D1, comme R-7) : « Tu pourras donner
  un chiffre plus précis dans un nouveau bilan : tes réponses seront préremplies. » (la distance du
  trajet) ; la phrase du régime de re-bilan du suivi ; et « On pourra en faire un nouveau après,
  ensemble : ça va vite. » sur l'écran de collision, où « ensemble » collé à « un nouveau » se lisait
  « un nouvel ensemble ».
- **D3** est rendu à l'**étape d'entrée** de la visite — la première d'ordinaire, celle d'un brouillon
  repris ou de `?etape=` sinon — et non à la seule première étape ; la feuille du re-bilan se referme
  par « Commencer », un libellé que la décision ne nommait pas.

**Deux textes rendus tels que décidés, et à revoir** — **tous deux tranchés le 02/10/2026**, plus haut :

- **La ligne d'aide sous la zone (D4) peut faire mal classer.** Rendue mot pour mot : « Urbain dense :
  une grande ville et sa proche banlieue. Périurbain : sa couronne, ou une petite ville. Rural : un
  village, la campagne. » Or le métro et le tram ne sont proposés qu'en `urbain_dense` (`PLAN.md` §1) :
  une ville moyenne qui a un tram n'est ni « une grande ville » ni « une petite ville » dans cette
  phrase, et qui y vit et choisit « Périurbain » perd les deux actions bornées à la zone dense. La
  correction de fond — filtrer le métro et le tram sur une réponse à part — demande une migration.
- **La ligne de relecture du suivi dit encore « Vérifie ta connexion. »** sur une erreur du serveur
  (D19) : sa phrase n'était pas dans la décision.

**Des questions de produit que la vague a fait naître** :

- **Toucher le voile consomme la feuille des rappels**, qui ne se montre qu'une fois par appareil
  (T-7) : un toucher distrait à côté de la feuille la fait partir pour toujours. Restreindre le voile
  à la feuille du re-bilan ? **Non, tranché le 02/10/2026** : le voile ferme toutes les feuilles.
- **« Réessayer » en secondaire pendant la confirmation de suppression** : la décision visait
  « Rattacher un compte » ; le chantier l'a étendue au « Réessayer » d'un échec, pour qu'il n'y ait
  qu'un principal. **Validé le 03/10/2026.**
- **« Faire un nouveau bilan » le jour même** reste la tension de §6, non posée.
- **Toucher le voile de la feuille du re-bilan sort du questionnaire**, comme « Pas maintenant » :
  même question que pour la feuille des rappels, sur une feuille qui s'ouvre sans geste — même
  réponse le 02/10/2026.
- **La carte de saison et la carte des deux lieux dues le même jour** (un premier bilan fin novembre,
  le plan ouvert en décembre) : « Choisir une action » referme la saison, la carte des deux lieux se
  rend en tête et se note vue pendant que l'écran défile vers la première piste — elle peut partir
  sans être entrée dans la fenêtre. Conforme à la règle écrite (« rendue, l'écran au premier plan »).
- **D18 ne réduit les façons de dire un formulaire incomplet que de trois à deux** : la phrase de
  `/feedback` reste en `small` tertiaire, là où le questionnaire, `/contexte` et D13 la disent en
  `accentText` 600. **Fait le 02/10/2026.**

**Des constats techniques, chacun pour une PR à part** :

- **L'écran « session refusée » ne s'atteint probablement jamais au démarrage** — **corrigé le
  02/10/2026**, en premier après cette PR, sur décision de la personne qui pilote (mesuré sur l'export
  par le chantier du compte) : sur un jeton d'accès expiré dont le rafraîchissement est refusé
  (`400 refresh_token_not_found`), `auth-js` 2.116 supprime la session pendant son initialisation ;
  `getSession` voit alors « pas de session, pas d'erreur », et l'app crée une session anonyme — le
  défaut que C2.11 devait fermer (`v1-27` §12.27).
- **`commitPlanAction` dit « Vérifie ta connexion et réessaie. » à toute erreur d'écriture** : D19 ne
  couvre que les lectures. **Corrigé le 02/10/2026** (`v1-27` §12.29), pour toutes les écritures du
  produit ; les phrases du serveur sont **validées le 03/10/2026**.
- **Deux lectures de l'entrée d'un re-bilan n'ont ni relecture ni « Réessayer »** : le préremplissage
  et l'engagement en cours. Depuis que les lectures ne sont plus rejouées (R-5), un raté réseau d'une
  seconde y donne un questionnaire vide, sans bandeau ni feuille — rien de faux n'est dit, mais neuf
  étapes sont à refaire (`src/lib/supabase.ts`). **Corrigé le 02/10/2026** (`v1-27` §12.29) : reprises
  en arrière-plan, sans phrase de plus.
- **`MARGE_DE_DEFILEMENT` et la mesure du défilement vivent deux fois**, dans le plan et dans la liste
  des pistes ; le commentaire exige qu'elles restent égales, et rien ne les lie. **Corrigé le
  02/10/2026** : `src/lib/defilement.ts`.
- **Sur web, le retour suit l'historique du navigateur** : depuis un plan atteint en naviguant, il
  revient à l'entrée d'avant, pas forcément hors de l'app. Le pendant d'Android, la pile, est vide.
  **Examiné le 02/10/2026, et laissé** (`v1-27` §12.29) : le retour d'un navigateur lui appartient.
- **`cadreDuChamp` vit dans `auth/text-field.tsx`**, et le champ de distance l'importe de là. **Corrigé
  le 02/10/2026** : `src/components/cadre-du-champ.ts`.
- **Les questions du contexte restent en `small` tertiaire** (D4), là où les autres étapes posent les
  leurs en grand : à juger en dessin — toujours ouvert, et pas technique.

**Ce qui ne se vérifie que sur appareil** est consigné en `v1-13` §11.26.
