# Handoff : Ramille — v1-14, la boucle d'engagement d'une saison à l'autre

## Overview
Ce bundle porte deux choses : (1) le **design system Ramille**, formalisé depuis le dépôt (`theme.ts`, `src/components/**`), qui devient la référence pour tout écran ; (2) le **canvas v1-14** qui répond au brief `BRIEF.md` (lot 2 du plan v1-13, issues #119 à #130, chantier C2.13) : le point qui nomme l'action, la saison avec sa fin et son ouverture, la mascotte qui porte la saison, le suivi dans la durée, la restitution d'un re-bilan, les pistes dépliables et le premier pas, la reprise.

Cible : `ScratchMe/TraceVerte`, branche `main`, React Native / Expo Router. La partie serveur (migrations, RPC, générateurs de points) n'attend pas ce canvas.

## À propos des fichiers de design
Tous les fichiers `.dc.html` et `ui_kits/` sont des **références de design créées en HTML** — des prototypes qui montrent l'apparence et le comportement attendus, pas du code à copier. La tâche est de **recréer ces écrans dans l'environnement du dépôt** (composants de `src/components`, jetons de `theme.ts`, `ThemedText`, Reanimated) avec ses conventions. Les `.jsx` de `design-system/components/` sont des recréations web cosmétiques : lire leurs valeurs, ne pas les importer.

## Fidélité
**Haute fidélité.** Couleurs, tailles, rayons, hauteurs et copy sont définitifs et **relevés du dépôt** ; les seules nouveautés sont listées dans la page Écarts du canvas et reprises ci-dessous. Les chiffres d'exemple (3,4 t, 184 kg, 11 points…) sont des données de démonstration.

## Ce qui change (page Écarts, résumé)
Ce qui n'est pas listé est inchangé.

1. **Question du point** — nomme l'action et les jours, au passé : « Mardi ou jeudi, as-tu fait ce trajet à vélo ? ». Sans engagement : « La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ? » (forme insérable du poste). Déjà à vélo : **question de maintien** « La semaine dernière, ton trajet s'est-il fait à vélo ? », « Non » → phrase neutre. Voyages « un vol en moins » : « Ce mois-ci, as-tu eu un déplacement où tu as choisi autre chose que l'avion ? ». Notification, sujet en tête : « Ton trajet domicile-travail : mardi ou jeudi, l'as-tu fait à vélo ? ».
2. **Troisième réponse** — `TextLink` small tertiaire centré sous les deux boutons (« Pas de trajet cette semaine » / « Pas de voyage ce mois-ci »), cible 44. Réponse à trois valeurs en base (D3). Ramille répond une attente : « Pas de trajet, pas de question. On se retrouve lundi. »
3. **Retours variés** (D12) — trois ou quatre par issue dans `RAMILLE`, l'originale conservée ; test « aucun chiffre » inchangé. Textes exacts dans la planche A3.
4. **Carte répondue** — la `CheckinCard` reste jusqu'au prochain lundi avec le retour de Ramille + « Répondu lundi. Prochain point : lundi 21 sept. » (small tertiaire). Second renforcement après deux Oui : phrase de corps « Deuxième semaine de suite que tu fais ce trajet autrement. », jamais au-delà de deux.
5. **Cap avec sa fin** — carte du cap : « Automne 2026 » à gauche, « jusqu'au 30 novembre » à droite (small 600 accentText), puis barre 6 px rail `border` remplie en **`accentMuted`** (temps écoulé, jamais en accent), légende 12/16 tertiaire « La saison avance ; le trait mesure le temps, pas toi. »
6. **Carte d'ouverture de saison** — nouveau composant `CarteDeSaison` : bordure 1 px `border`, fond `backgroundTinted`, rayon 18, padding 20, gap 12. Étiquette « NOUVELLE SAISON » 13/18/700/+0,3 accentText ; titre `screenTitle` « L'hiver commence. » ; corps `body` textSecondary « Cet automne : N points répondus, M fois où tu as changé quelque chose sur ton trajet. » (voix produit, jamais les points manqués) ; `Button` primaire « Reprendre la même action », secondaire « Choisir une autre ». **Ramille sous la carte**, hors du cadre : `RamilleDit` 44 px happy, tilt −5, « On repart pour une saison. ». Visible deux premières semaines ; état « vue » persistant (écran d'onglet). Repli trimestre glissant : « NOUVELLE PÉRIODE » / « Une nouvelle période commence. » / « Ces trois mois : … ». Transition : la carte glisse depuis le bas (translateY 16 → 0, opacité, 320 ms ease-out).
7. **Action reconduite** — étiquette `ActionCard` « TON ENGAGEMENT · RECONDUIT », intention conservée. Après « Choisir une autre », l'ancienne action reste en bas, estompée (opacité 0,72), sur-titre « Cet automne », « Reste dans ton suivi, le mardi et le jeudi. »
8. **Étiquette dégenrée** — « TON ENGAGEMENT » remplace « TU T'Y ES ENGAGÉ » (lot 3).
9. **Bandeau saison périmée** — bandeau discret existant : « L'hiver a commencé pendant que tu étais là. » + action « Voir la saison ». **Engagement orphelin** après re-bilan, dit une fois : « Ton plan a changé avec ton nouveau bilan. L'action que tu suivais n'y est plus ; elle reste dans ton suivi. » + « Compris ».
10. **Suivi — écart par poste** — nouveau composant `EcartParPoste` : par poste, ligne libellé / « 2,1 t → 1,7 t » (small 600), puis deux barres 10 px rayon 5 : **contour** 1,5 px `accentMuted` (bilan précédent), **plein** (bilan actuel) en `accent` pour le poste dominant, `accentMuted` pour les autres. Légende 12/16. Au-dessus : « Bilan du 10 sept. 2026 » / « précédent : 12 mars », total en `salient`, phrase « 8 % de moins que ton bilan précédent. Ce que tu as changé se voit ici. »
11. **Suivi — décisions** — « Ce que tu as décidé, saison après saison » : une ligne par saison (période à gauche textSecondary, action · jours à droite), séparateur 1 px `border`, padding 10/0.
12. **Suivi — points par saison** — groupes « Automne 2026 · 11 points » + « Voir tout » (small 600 accentText) ; lignes date / libellé parmi « Changement fait » / « Pas cette fois » / « Pas de trajet », même style ; phrase « Ces fois-là, c'est toi qui as choisi le trajet. » ; `RamilleDit` **calm 36** en bas : « Je vois la différence. ». La mascotte happy au sommet de la colonne est retirée. Pas de troncature silencieuse : groupement + pagination.
13. **Restitution re-bilan** — barre-contour « Ton bilan précédent · mars » (14 px, contour 1,5 px accentMuted) au-dessus de « Toi, aujourd'hui » et « Moyenne en France » ; phrase sous les barres « 0,3 t de moins que ton bilan de mars. Le palier que tu visais est derrière toi. » Mobilité contrainte : pas de barre Moyenne ; « Là où tu vis, la voiture n'est pas un choix. Le plan regarde ce qui dépend de toi. »
14. **Pistes + premier pas** — deux actions en avant, lien « Voir d'autres pistes · N » (small 600 accentText centré, 44) qui déplie : deux cartes estompées avec « Choisir celle-ci à la place », puis lignes simples (libellé / « − 72 kg » tertiaire), « Replier ». Premier pas dans la carte engagée : bloc interne fond `background`, rayon 16, padding 12/16, sur-titre « Premier pas » 13/18/600 tertiaire, texte 14/20. « Travailler depuis chez toi un jour par semaine » remplace « Garder une journée de télétravail ».
15. **Reprise** — « On reprend où tu t'étais arrêté. » / « Quatre écrans déjà remplis. Il en reste cinq, en comptant celui-ci. » / « Continuer mon bilan » + « Repartir de mon dernier bilan ». Appareil neuf depuis un rappel : mascotte 72 calm tilt −6, « Ce rappel concerne un compte. Retrouve-le ici. », « J'ai déjà un compte », lien « Commencer un bilan sur cet appareil ».
16. **Mascotte — accessoires de saison** (C2.13, build natif) — voir ci-dessous.
17. **Thème sombre** — toutes les planches basculent ; aucune couleur ajoutée sans son pendant sombre.

## Mascotte — accessoires de saison
Dans `mascot.tsx` / `types/mascot.ts`, une prop `season?: 'hiver'|'printemps'|'ete'|'automne'`. Positions en unités de viewBox à la taille nominale (fixes), épaisseurs et rayons × `k` (`opticalScale`). Rendu **après** le groupe du visage, **jamais sous 28 px** (`visible === false` → rien). Aucun accessoire ne touche yeux ni bouche ; aucune expression ne change.
- **Hiver — bonnet** : calotte `M31,34 C37,24 44,18 50,15 C56,18 63,24 69,34 C62,29 56,27 50,27 C44,27 38,29 31,34 Z` fill `mascotWarm` ; revers path `M31,34 C38,29 44,27 50,27 C56,27 62,29 69,34` stroke `mascotAccessory` width 4,4·k round ; pompon cercle (50, 12) r 5,6·k `mascotAccessory` + cercle r 3,9·k `mascotWarm`.
- **Printemps — bourgeon** : cercles r 3·k `mascotAccessory` en (45,8 ; 18,5), (54,2 ; 18,5), (50 ; 14) ; cœur (50 ; 17,5) r 1,8·k `mascotWarm`.
- **Été — goutte** : path `M64,70 C64,66 67,62 67,62 C67,62 70,66 70,70 C70,71.8 68.6,73 67,73 C65.4,73 64,71.8 64,70 Z` fill #FFFFFF opacité 0,85 ; reflet (66 ; 68,5) r 0,9·k `mascotAccessory`.
- **Automne — joues** : rayon × 1,18, opacité + 0,25 (max 0,9), couleur `mascotWarm` à la place de `accentMuted`.
La carte de partage (`api/share-card.ts`) ne porte pas la saison.

## Jetons ajoutés (`Colors`, deux thèmes)
| Jeton | light | dark | Usage |
|---|---|---|---|
| `mascotInk` | `#131612` | `#131612` | yeux, bouche (aujourd'hui `Colors.light.text` en dur) |
| `mascotVein` | `#E4EFE8` | `#E4EFE8` | nervure (aujourd'hui `Colors.light.backgroundSelected`) |
| `mascotAccessory` | `#E4EFE8` | `#E4EFE8` | revers, pompon, pétales |
| `mascotWarm` | `#C99A6B` | `#B98A5E` | joues d'automne, calotte du bonnet — sable oklch(0.72 0.07 70), jamais un rouge |

Aucun ajout à `TypeScale`, `Radius`, `ControlHeight`. Motifs nouveaux sans jeton : barre-contour (1,5 px accentMuted, rail transparent), carte de saison (border + tinted), trait de temps (progression 6 px en accentMuted).

## Design tokens de référence (inchangés, `theme.ts`)
Couleurs light : text `#131612`, textSecondary `#39403B`, textTertiary `#5E655F`, background `#FFFFFF`, backgroundTinted `#F3F8F4`, backgroundElement `#F0F1EC`, backgroundElement2 `#F6F8F3`, backgroundSelected `#E4EFE8`, accent `#1F6F4A`, accentText `#14563A`, accentMuted `#A9C8B6`, border `#DDE0D9`, paginationInactive `#CDD7CF`. Dark : `#FFFFFF`, `#B0B4BA`, `#8A9088`, `#000000`, `#0F1410`, `#212225`, `#1A1C1A`, `#1C2E22`, `#3D9B6F`, `#8FCBA9`, `#3A5245`, `#2E3135`, `#3A3D3A`.
TypeScale : screen 26/32 −0,26 · salient 30/36 −0,6 · card 17/24 · body 15/22 · default 16/24 · small 14/20 · code 12. Spacing 2/4/8/16/24/32/64. Radius chip 8 · field 16 · card 18 · button 27 (+ 14 mode item, 22 pilule). ControlHeight target 44 · button 54 · field 56.

## Interactions et états
- **Point** : `answered: null | 'oui' | 'non' | 'aucun'` ; à la réponse, la question est remplacée par `RamilleDit` (mood happy / encouraging / calm) + pied ; la carte persiste jusqu'au prochain point. Écran d'onglet : rafraîchi au retour.
- **Saison** : `saison: 'ouverte' | 'reconduite' | 'choisir'` + flag `carteOuvertureVue` persistant ; fenêtre : deux premières semaines de la saison. « Reprendre » → RPC de reconduction, étiquette « · RECONDUIT ». « Choisir » → liste des pistes, ancienne action archivée dans le suivi.
- **Bascule pendant l'affichage** : si la saison change alors que le plan est monté, afficher le bandeau « L'hiver a commencé pendant que tu étais là. » plutôt que remplacer la carte sous les yeux.
- **Pistes** : `pistesDepliees: boolean`, local à l'écran.
- Animations : entrée des cartes translateY 16 → 0 + opacité, 260–320 ms ease-out (Reanimated). Rien d'autre.
- Accessibilité : réponses en boutons (`accessibilityHint` rappelant la question), troisième réponse en `TextLink`, groupes de choix en `radio`, cibles 44, mascotte `aria-hidden`.

## Règles non négociables (§5 du brief)
Aucun jugement, aucune couleur d'alerte, aucune mécanique d'échec (pas de streak, série, score, période manquée) ; aucune comparaison entre personnes ; Ramille : première personne, court, tutoiement, jamais un nombre, jamais « tu devrais », jamais un accord genré, jamais à côté d'un chiffre lourd ; cinq expressions, pas de sixième ; deux onglets ; « Repère », jamais « Objectif ».

## Assets
`design-system/assets/images/` : logo-mark.svg, mascot-mark.svg, favicon-mark.svg, icon.png, splash-icon.png, google-oauth-logo.png (copiés du dépôt). Aucune illustration nouvelle.

## Fichiers
- `v1-14 Boucle d'engagement.dc.html` — le canvas (A–G, Saisons, Écarts, Système). Prototype cliquable A et B, bascule thème. Ouvrir dans un navigateur ; nécessite `support.js` et `Mascotte.dc.html` à côté.
- `Mascotte.dc.html` — la mascotte avec accessoires de saison (props mood, size, tilt, season).
- `BRIEF.md` — le brief v1-14.
- `design-system/` — readme.md (fondations, contenu, iconographie), styles.css + tokens/, components/ (28 recréations web, .d.ts, .prompt.md), guidelines/ (cartes), ui_kits/ramille/ (kit cliquable + catalogue 38 écrans), SKILL.md.
- `captures/` — une PNG 2× par planche (A1…G, C Saisons, Écarts, Système), thème clair, état initial des prototypes.
- `support.js` — runtime des .dc.html.
