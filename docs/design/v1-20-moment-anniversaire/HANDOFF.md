# Handoff : Ramille — v1-20, un an ensemble

## Overview
Ce dossier répond au brief `BRIEF.md` écrit le 19/09/2026 (`v1-19` postulat 5, questions ouvertes
§6.1 et §6.2, issue #233) : à quoi ressemble un moment qui fête un an sans rien imposer, comment le
rendre joyeux sans le rendre faux, et s'il existe une version saisonnière. Le `README.md` du
dossier dit ce qui a été retenu et pourquoi ; ce document dit **comment le construire**.

Cible : `ScratchMe/TraceVerte`, branche `main`, React Native / Expo Router. Ce canvas demande
**une route** (`(tabs)/suivi/annee.tsx`), **un module pur** (`src/types/annee.ts`), **une marque
locale**, **une réplique de Ramille**, et **aucune migration** : tout ce que la page lit, le suivi
le lit déjà.

## À propos des fichiers de design
Il n'y a pas de `Canvas.dc.html` : les planches sont décrites ici, avec les jetons nommés et les
tailles relevées dans le dépôt. **Rien n'est une valeur inventée** : chaque couleur est un jeton de
`Colors` (dans les deux thèmes), chaque taille un type de `ThemedText` ou une valeur déjà écrite
dans l'écran voisin — la seule valeur en dur reprise est le rayon 20 des panneaux du suivi, qui n'est
pas dans `Radius` (`README.md`, § Écarts). Un canvas HTML peut être tiré de ce document après
arbitrage.

## Fidélité
**Haute fidélité.** Copy, tailles, rayons, hauteurs et conditions sont définitifs. Les **valeurs
des planches** — 31 points, 18 changements, 3 changements tenus, 3,4 t puis 2,8 t, quatre
décisions — sont des valeurs de démonstration cohérentes avec les dérivations, relevées sur aucun
compte réel ; les tonnes sont celles du kit (« à confirmer côté produit »). Le profil des planches :
premier bilan le 12 mars 2026, anniversaire le 12 mars 2027, poste dominant domicile-travail.
Planches de 390 px ; les écrans qui défilent sont décrits en entier.

## Ce que le canvas tranche
1. **L'anniversaire s'annonce sur le plan et vit dans le suivi.** Une quatrième carte d'ouverture,
   même composant que les trois autres (`CarteDOuverture`), remplace la carte d'attente pendant
   vingt-huit jours à partir du jour où le premier bilan a un an, et mène à une page de la pile du
   suivi. La page reste, sans date limite, derrière un lien permanent du suivi.
2. **La page ne dit que ce que le produit sait** — réponses, décisions, deux bilans — en voix
   produit, dans les phrases que le suivi, la carte de saison et la restitution emploient déjà. Elle
   ne chiffre aucun gain, ne dit jamais zéro, et se termine sur un nouveau bilan quand le régime de
   C6.3 le propose. Ramille l'ouvre et ne compte rien.
3. **La version saisonnière est la carte d'ouverture de saison, inchangée.**
4. **Un an de quoi : du premier bilan.** Le jour local de `submitted_at` du premier bilan
   complété, plus un an (`setFullYear` : un 29 février tombe le 1er mars). L'année *n* est la
   fenêtre close [premier bilan + (n − 1) an, premier bilan + n ans[.

## Ce qui change (page Écarts, résumé)
Ce qui n'est pas listé est inchangé — en particulier la carte de saison, les cartes du suivi, la
restitution, le partage et les rappels.

1. **La carte « UN AN ENSEMBLE »** sur le plan — `CarteDOuverture`, à la place de la carte
   d'attente, jamais d'un point en attente ; vingt-huit jours ; « Voir mon année » (primaire) et
   « Plus tard » (lien) ; Ramille dessous.
2. **La page « Ton année »** — `(tabs)/suivi/annee.tsx`, `?n=1` ; barre visible ; retour par
   `router.replace('/suivi')`.
3. **Le lien « Voir mon année »** dans le suivi, sous l'intro, dès qu'un premier bilan a un an.
4. **Le module pur `src/types/annee.ts`** — fenêtre, invitation, lecture de l'année, changements
   tenus, phrases ; avec ses tests.
5. **`recapEnMots` sort de `saison.ts` avec le sujet en paramètre** : « Cet automne : … » et
   « Cette année : … » sont la même phrase.
6. **La liste des décisions devient un composant** (`src/components/suivi/decisions.tsx`), rendu
   par le suivi et par la page ; l'ordre est décidé par l'appelant.
7. **`loadDecisionsEngagees` ramène `period_end`** (`DecisionDeSaison.periodEnd`, nullable) — la
   page a besoin de savoir si un cycle chevauche l'année.
8. **Une lecture de plus dans le lot du plan** — le premier bilan complété (`order asc, limit 1`),
   dans le `Promise.all` existant, jamais en séquence (règle de C5.5).
9. **Une marque locale** `traceverte.anniversaire_vu.v1`, qui porte le numéro d'année vu.
10. **`RAMILLE.anniversaire`** : « Une année ensemble, à ton rythme. »
11. **`SortieDouverture.cle`** gagne `voir` et `plus_tard`.
12. **`page-titles.ts`** : `/suivi/annee` → « Ton année — Ramille » ; pas de description (écran
    d'application, `noindex`).
13. **L'entrée des blocs de la page, décalée de 80 ms** — optionnelle, tombe sans rien casser.
14. **Mesure `annee_view`** (`origine: 'plan' | 'suivi'`) — à trancher ; si oui, migration
    `usage_event_types` + `src/types/analytics.ts`, et jamais déclaré sans être émis.
15. **Thème sombre** — tout bascule, aucun jeton ajouté.

## Planche par planche

Communs à tous les écrans d'onglet et de pile : bande haute 52 px (nom 17/24/600 centré, icône
compte 22 dans une cible 44, hairline `border`) ; contenu `padding: 24`, `gap: 24`, largeur max 800
sur web ; barre d'onglets 60 px + encoche. **Carte d'ouverture** : bordure 1 px `border`, fond
`backgroundTinted`, rayon 18 (`Radius.card`), padding 20, gap 12 ; étiquette 13/18/700,
interlettrage +0,3, `accentText` ; titre `screenTitle` ; corps `body` `textSecondary` ; sorties gap 8,
marge haute 4 ; Ramille dessous en `RamilleDit` 44, tilt −5, padding horizontal 4, `themeColor:
text`. **Panneau du suivi** : `backgroundElement`, rayon 20, padding 20, gap 14. **Bouton** : 54,
rayon 27. **Lien** : `TextLink` small 600 `accentText`, cible 44.

### A1 — Le plan · le jour de l'anniversaire
Le profil des planches, le 12 mars 2027, rien d'engagé, aucun point en attente.
- **La carte**, en tête du contenu qui défile, au-dessus de « Ton plan », à l'endroit où la carte
  de saison se rend (après la ligne de relecture, l'annonce de rattachement et les deux encarts de
  C2.2, s'ils sont là) :
  - étiquette **« UN AN ENSEMBLE »** ;
  - titre `screenTitle` **« Ton premier bilan a un an. »** ;
  - corps `body` `textSecondary` **« Une page pour relire l'année, depuis ton premier bilan. »** ;
  - sorties : `Button` primaire **« Voir mon année »**, puis `TextLink` **« Plus tard »** small 600
    `accentText`.
- **Ramille dessous**, hors du cadre : `RamilleDit` `happy` 44, tilt −5, **« Une année ensemble,
  à ton rythme. »** (`RAMILLE.anniversaire`).
- **Entrée** : celle du composant — opacité 0 → 1 et translateY 16 → 0, 320 ms `Easing.out(cubic)`,
  `ReduceMotion.System`.
- **La carte d'attente ne se rend pas** tant que la carte est là : même règle que les trois autres
  (`checkins.length === 0 && attente && ouverture === null && cartePremierPlan === null &&
  !carteDesDeuxLieux && anniversaire === null`).
- Le reste de l'écran est inchangé : « Ton plan », l'intro, le cap avec son trait, les deux cartes,
  la porte des pistes, l'encart de contexte, la note, « Revoir mon bilan ». Sur un plan à zéro
  action, la carte se rend aussi — elle ne promet pas une action, elle promet une page.
- **« Voir mon année »** écrit la marque (`n`), referme la carte et pousse
  `{ pathname: '/suivi/annee', params: { n: '1' } }`. **« Plus tard »** écrit la marque et referme la
  carte ; la carte d'attente reprend sa place au rendu suivant.

### A2 — Le plan · le même jour, avec un point en attente
Le même écran, un point du lundi en attente.
- La carte reste **au-dessus du titre** ; le point reste **sous le titre**, en `CheckinCard`,
  inchangé. Rien ne prend la place d'un point en attente : le lien du rappel pointe `/plan`, et une
  notification ouverte sur un écran qui ne porte pas sa question est le défaut du 09/09/2026
  (`v1-12` §8.1).
- Répondre au point ne touche pas à la carte. La carte se referme sur ses deux sorties et sur rien
  d'autre.

### A3 — Le plan · saison et anniversaire le même jour
Le 1er mars 2027 pour quelqu'un dont le premier bilan est du 1er mars 2026.
- **La carte de saison passe devant** : elle est la nouvelle de la période, et sa fenêtre est de
  quatorze jours. La carte d'anniversaire ne se rend pas ce jour-là, et **sa marque n'est pas
  écrite** — elle se rend au passage suivant, tant qu'on est dans ses vingt-huit jours. C'est la
  raison de la fenêtre double : la saison peut occuper la première moitié.
- L'ordre de priorité des quatre cartes d'ouverture, tranché par l'écran :
  **saison > anniversaire > premier plan > deux lieux**. Le premier plan et l'anniversaire sont
  exclusifs en pratique (un an de plan, c'est au moins quatre cycles), la règle est écrite quand
  même. La carte des deux lieux cède à l'anniversaire comme elle cède déjà à la saison : sa marque
  ne bouge pas, elle attendra.

### B1 — « Ton année » · une année pleine
La page, ouverte depuis la carte le 12 mars 2027. Bande haute, contenu `padding: 24`, `gap: 24`,
barre d'onglets visible (onglet Suivi actif).
- **Ramille en tête**, avant tout le reste : `RamilleDit` `happy` 44, tilt −5, `themeColor: text`,
  padding horizontal 4, **« Une année ensemble, à ton rythme. »**. Aucun chiffre à moins d'un
  bloc entier d'elle.
- **En-tête** (`View`, gap 8) : étiquette **« UN AN ENSEMBLE »** 13/18/700 +0,3 `accentText` ;
  titre `screenTitle` **« Ton année »** (rôle en-tête, par le type) ; intro `body` `textSecondary`
  **« Du 12 mars 2026 au 11 mars 2027, depuis ton premier bilan. »** — les deux dates par
  `formatDate`, à partir de l'**instant** minuit local de chaque borne, jamais d'un jour nu
  `YYYY-MM-DD` (interprété en UTC, il rendrait la veille à l'ouest de Greenwich).
- **Bloc « Tes réponses »** (panneau) : en-tête small 600 **« Tes réponses »** (rôle en-tête) ;
  ligne `default` 600 (16/24) **« Cette année : 31 points répondus, 18 fois où tu as changé quelque
  chose. »** ; attribution small `textSecondary` **« Ces fois-là, c'est toi qui as choisi le
  trajet. »** ; puis small `textSecondary` **« 3 changements ont tenu deux fois de suite. »**.
  La ligne vient de `recapEnMots('Cette année', recap)` — sans changement, la seconde moitié
  tombe (« Cette année : 31 points répondus. ») et l'attribution avec elle ; un seul point :
  « Cette année : 1 point répondu. ». La ligne des changements tenus ne se rend qu'au-dessus de
  zéro ; à un : « 1 changement a tenu deux fois de suite. ».
- **Bloc « Ce que tu as décidé »** (panneau) : en-tête small 600 (rôle en-tête) ; le composant des
  décisions du suivi, **du plus ancien au plus récent** (une année se lit depuis son début ; le
  suivi, lui, lit depuis aujourd'hui) : par ligne, `periodLabel` small `textSecondary`,
  `actionText` small 600, `formatIntention` small `textTertiary` s'il y en a une ; lignes
  `paddingVertical: 8`, gap 2, filet 1 px `border` au-dessus de chaque ligne sauf la première.
  Sur le profil : « Printemps 2026 · Faire un trajet sur cinq à vélo · le mardi et le jeudi »,
  « Été 2026 · Partager un de tes longs trajets en voiture · à mon prochain projet de voyage »,
  « Automne 2026 · Travailler depuis chez toi un jour par semaine · le vendredi »,
  « Hiver 2026-2027 · Travailler depuis chez toi un jour par semaine · le vendredi ». **Jamais un
  statut tenu / pas tenu** ; la liste dit des décisions.
- **Bloc « Tes bilans »** (panneau) : en-tête small 600 **« Tes bilans »** (rôle en-tête) ; deux
  rangées, gap 16, chacune un `Pressable` (`accessibilityRole="button"`, libellé « Bilan du
  {date}, {total} », indice « Ouvre le détail de ce bilan ») qui pousse `/suivi/bilan?id=` :
  - la rangée : en-tête `space-between` avec `formatDate` à gauche et `formatTonnes` à droite ;
    rail 14 px, rayon 7, `border` ; remplissage à la part du plus grand des deux totaux
    (minimum 3 %) ; « Poste principal : {POSTE_LABEL} » small `textTertiary` ;
  - **le départ** (12 mars 2026 · 3,4 t CO₂e) en small 400 `textSecondary`, remplissage
    `accentMuted` ; **l'arrivée** (3 décembre 2026 · 2,8 t CO₂e) en small 600 `text`, remplissage
    `accent` — exactement l'historique du suivi, réduit à deux barres ;
  - la phrase, small `textSecondary` : `variationDepuisLeBilanPrecedent(depart, arrivee.totalKg)`
    → **« 600 kg de moins que ton bilan de mars. »** (stable : « Stable par rapport à ton bilan de
    mars. » ; hausse : « 600 kg de plus que ton bilan de mars. Une année n'est pas l'autre. ») ;
  - la note, `code` 12/18 `textTertiary` : **« Deux estimations, chacune aux facteurs de sa date.
    L'écart entre elles n'est pas une mesure. »**
- **Bloc de sortie** (panneau) — se rend quand `regimeDeRebilan(dernier bilan) !== 'aucun'`, le
  dernier bilan étant **le plus récent au moment de la lecture**, pas celui de la fenêtre : la
  sortie parle d'aujourd'hui, les blocs parlent de l'année. Sur le profil, le 12 mars 2027, le
  bilan du 3 décembre a une bascule de saison → `proposer` :
  - en-tête small 600 **« Ton dernier bilan a trois mois »** (`ancienneteEnMots(daysSince(…))`) ;
  - small `textSecondary` `phraseDuRegimeDeRebilan(regime)` — ici « Une saison a passé depuis. En
    faire un nouveau prend moins de temps que la première fois : tes réponses sont pré-remplies,
    tu ne modifies que ce qui a changé. » ;
  - small `textSecondary` **« Ce qui a changé cette année sans que tu l'aies dit ici s'y lira
    aussi. »** ;
  - `Button` primaire **« Faire un nouveau bilan »** → `/bilan`. Si un engagement est en cours dans
    la période courante, la feuille de C6.2 se présente à la soumission, inchangée.
- **Pied** : `TextLink` **« Revenir à mon suivi »** small 600 `accentText`, centré, cible 44,
  `router.replace('/suivi')` — une destination, pas un dépilement, comme la restitution.
- **Entrée** : Ramille, l'en-tête et chaque panneau arrivent avec la courbe de la carte
  d'ouverture (opacité, translateY 16 → 0, 320 ms), décalés de 80 ms l'un après l'autre, une fois,
  au premier rendu de l'état `ok` ; `ReduceMotion.System`. Optionnelle.

### B2 — « Ton année » · une année silencieuse
Un premier bilan le 12 mars 2026, aucun point répondu, aucune décision, aucun autre bilan. Lu le
12 mars 2027.
- Ramille en tête, l'en-tête, comme en B1 — rien ne dit ce qui manque.
- **Ni bloc des réponses ni bloc des décisions** : ils ne se rendent pas, comme le corps de la
  carte de saison tombe sans point répondu. Aucune phrase ne les remplace.
- **Bloc « Ton bilan »** (panneau) : en-tête small 600 **« Ton bilan »** ; une rangée (12 mars 2026
  · 3,4 t CO₂e, small 600 `text`, remplissage `accent` plein) ; small `textSecondary` **« Un seul
  bilan cette année : celui du départ. »** ; pas de note de méthode — il n'y a pas d'écart.
- **Bloc de sortie** : le dernier bilan a un an → `insister` : en-tête **« Ton dernier bilan a
  plus d'un an »** ; « Plusieurs saisons ont passé depuis. Les facteurs d'émission se mettent à
  jour chaque trimestre et ton bilan garde ceux de sa date : en refaire un le recalcule avec les
  valeurs d'aujourd'hui, même si tes trajets n'ont pas changé. » ; « Ce qui a changé cette année
  sans que tu l'aies dit ici s'y lira aussi. » ; **« Faire un nouveau bilan »**.
- Pied « Revenir à mon suivi ».
- Sur le plan, le même jour, la carte est la même qu'en A1 : son corps ne promet rien de précis.

### B3 — « Ton année » · la deuxième année, un bilan de cette saison
`n = 2`, lu le 15 mars 2028 : bilans le 12 mars 2026, le 3 décembre 2026 et le 5 mars 2028.
- Étiquette **« DEUX ANS ENSEMBLE »** ; titre « Ton année » ; intro **« Du 12 mars 2027 au
  11 mars 2028. »** (sans « depuis ton premier bilan », qui n'est vrai qu'à la première).
- Blocs des réponses et des décisions bornés à la fenêtre : les points dont `period_start` est
  dans l'année, les cycles qui la **chevauchent** (un cycle dont la saison commence avant le
  12 mars 2027 mais la contient compte ; `periodEnd` sert à ça).
- **Bloc « Tes bilans »** : le départ est **le dernier bilan au plus tard au premier jour de
  l'année** (3 décembre 2026 — il vient d'avant la fenêtre, et c'est voulu : « où tu en étais il y
  a un an »), l'arrivée **le dernier bilan de l'année** (5 mars 2028). Phrase : « … que ton bilan
  de décembre. »
- **Pas de bloc de sortie** : le dernier bilan est de la saison en cours (`aucun`). La page se
  termine sur le bloc des bilans et le pied. Un bilan par saison suffit (`v1-19` postulat 1), on
  ne propose pas ce qu'on vient de faire.
- **Variante** : aucun bilan dans l'année, le dernier antérieur → bloc « Ton bilan », une rangée,
  small `textSecondary` **« Ton dernier bilan date du 3 décembre 2026. »** — un fait, jamais
  « aucun ».
- Sur le plan, le 12 mars 2028 : « DEUX ANS ENSEMBLE », **« Ton premier bilan a deux ans. »**,
  **« Une page pour relire l'année écoulée. »**, mêmes sorties, même Ramille.

### B4 — « Ton année » · avant le premier anniversaire
Un favori, un lien collé, un `n` plus grand que les années écoulées.
- `n` est ramené dans [1, années écoulées]. **À zéro année écoulée**, l'écran est celui du plan en
  `pending` : centré, `default` `textSecondary` **« Ton année se lira au premier anniversaire de
  ton bilan. »**, puis `TextLink` **« Revenir à mon suivi »**. Sans bilan du tout, la même chose —
  il n'y a rien à annoncer et rien à proposer ici, le suivi porte déjà « Faire mon bilan ».
- **Chargement** : « Chargement de ton année… » centré, `textSecondary`. **Erreur** (rien n'a jamais
  pu être lu) : `MessageInline` **« Ton année n'a pas pu être relue. Vérifie ta connexion. »** +
  `Button` « Réessayer », qui repasse par le chargement dans son propre gestionnaire. **Lecture
  secondaire en échec** (les décisions) : le bloc ne se rend pas, et la ligne de relecture le dit
  au-dessus de la page, avec son « Réessayer » : « Ton année n'a pas pu être relue à l'instant : ce
  que tu vois peut avoir changé depuis. Vérifie ta connexion. »

### C — Le suivi · après
- Sous l'intro de « Ton suivi » (dans le `View` `intro`, gap 8, après « 3 bilans depuis le
  12 mars 2026. » ou « Ton point de départ. … ») : `TextLink` **« Voir mon année »** small 600
  `accentText`, `alignSelf: flex-start`, cible 44, rôle lien → `/suivi/annee?n={années écoulées}`.
- Condition : `anneesEcouleesDepuis(first.submittedAt) >= 1`, `first` étant le premier bilan de
  l'historique. Permanent : c'est ce qui rend « Plus tard » vrai.
- Rien d'autre ne change sur le suivi. La page d'année n'y ajoute pas de carte : elle est un détail
  d'entrée, pas une entrée.

### D — La saison · inchangée, et ce qui la distingue
La carte d'ouverture de saison (C2.8, `CarteDOuverture`, « NOUVELLE SAISON », « L'hiver commence. »,
« Cet automne : 11 points répondus, 8 fois où tu as changé quelque chose. », « Reprendre la même
action » / « Choisir une autre », Ramille « On repart pour une saison. ») **ne change pas d'un
mot**. Ce qui la distingue de l'année :

| | Saison | Année |
|---|---|---|
| Forme | Une carte, sur le plan | Une carte sur le plan, qui mène à une page du suivi |
| Regard | Devant : ce qui commence | Derrière : ce qui s'est passé |
| Matière | Une ligne de récapitulatif | Trois blocs |
| Vie | Deux semaines, puis rien | Quatre semaines pour la carte ; la page reste |
| Sortie | Reprendre ou choisir | Un nouveau bilan, si le régime le propose |
| Chiffres | Deux, dans la carte | Des comptes et deux totaux, dans la page ; aucun gain |

La phrase du récapitulatif est **la même fonction** (`recapEnMots`, sujet en paramètre) : les deux
ne peuvent pas diverger.

### E — Le parcours, moment par moment

| Le moment | Ce que la personne voit | Ce qui est nouveau | Ce qui l'explique |
|---|---|---|---|
| La veille | Le plan ordinaire | Rien | — |
| Le jour de l'anniversaire, sur le plan (A1, A2) | La carte « UN AN ENSEMBLE » à la place de la carte d'attente, Ramille dessous ; le point reste sous le titre | La quatrième carte d'ouverture | La carte |
| Le même jour, à la bascule (A3) | La carte de saison ; l'anniversaire au passage suivant | Rien | Une nouvelle à la fois |
| « Voir mon année » (B1–B3) | La page dans la pile du suivi | La page | Ce qu'elle contient |
| « Plus tard » | Le plan, carte d'attente revenue | Rien | Le lien du suivi |
| Le suivi (C) | « Voir mon année » sous l'intro, pour toujours | Une ligne | — |
| « Faire un nouveau bilan » | Le questionnaire prérempli ; la feuille de C6.2 s'il y a un engagement dans la période | Rien | Inchangé |
| Le deuxième anniversaire (B3) | « DEUX ANS ENSEMBLE », la page de la deuxième année | Le numéro | La marque porte l'année |

## Copy définitive

| Où | Texte |
|---|---|
| Plan, carte, étiquette | UN AN ENSEMBLE · DEUX ANS ENSEMBLE · … · DIX ANS ENSEMBLE · au-delà : UNE ANNÉE DE PLUS ENSEMBLE |
| Plan, carte, titre | Ton premier bilan a un an. · Ton premier bilan a deux ans. · … · au-delà de dix : Ton premier bilan a plus de dix ans. |
| Plan, carte, corps (n = 1) | Une page pour relire l'année, depuis ton premier bilan. |
| Plan, carte, corps (n ≥ 2) | Une page pour relire l'année écoulée. |
| Plan, carte, sortie primaire | Voir mon année |
| Plan, carte, sortie lien | Plus tard |
| Ramille, sous la carte et en tête de la page (`RAMILLE.anniversaire`) | Une année ensemble, à ton rythme. |
| Page, étiquette | la même que la carte |
| Page, titre | Ton année |
| Page, intro (n = 1) | Du {début} au {fin}, depuis ton premier bilan. |
| Page, intro (n ≥ 2) | Du {début} au {fin}. |
| Page, réponses, en-tête | Tes réponses |
| Page, réponses, ligne | Cette année : {n} points répondus, {m} fois où tu as changé quelque chose. · Cette année : {n} points répondus. · Cette année : 1 point répondu. |
| Page, réponses, attribution | Ces fois-là, c'est toi qui as choisi le trajet. |
| Page, réponses, tenu | {k} changements ont tenu deux fois de suite. · 1 changement a tenu deux fois de suite. |
| Page, décisions, en-tête | Ce que tu as décidé |
| Page, bilans, en-tête (deux) | Tes bilans |
| Page, bilans, en-tête (un) | Ton bilan |
| Page, bilans, phrase (deux) | `variationDepuisLeBilanPrecedent` — {écart} de moins que ton bilan de {mois}. · Stable par rapport à ton bilan de {mois}. · {écart} de plus que ton bilan de {mois}. Une année n'est pas l'autre. |
| Page, bilans, note (deux) | Deux estimations, chacune aux facteurs de sa date. L'écart entre elles n'est pas une mesure. |
| Page, bilans, un seul (n = 1) | Un seul bilan cette année : celui du départ. |
| Page, bilans, un seul (n ≥ 2) | Ton dernier bilan date du {date}. |
| Page, sortie, en-tête | Ton dernier bilan a {âge en mots} |
| Page, sortie, corps | `phraseDuRegimeDeRebilan(regime)` puis : Ce qui a changé cette année sans que tu l'aies dit ici s'y lira aussi. |
| Page, sortie, bouton | Faire un nouveau bilan |
| Page, pied | Revenir à mon suivi |
| Page, avant l'anniversaire | Ton année se lira au premier anniversaire de ton bilan. |
| Page, chargement | Chargement de ton année… |
| Page, erreur | Ton année n'a pas pu être relue. Vérifie ta connexion. |
| Page, relecture | Ton année n'a pas pu être relue à l'instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion. |
| Suivi, lien | Voir mon année |
| Web, titre d'onglet | Ton année — Ramille |

Les nombres sont en chiffres (voix produit), l'année en lettres dans l'étiquette et le titre de la
carte (`ANNEES_EN_MOTS` : un, deux, …, dix). La phrase de Ramille ne porte aucun chiffre, aucune
injonction, aucun participe accordé, moins de 120 caractères — le test de `mascotte.test.ts` la
prend telle quelle.

## Les dérivations — `src/types/annee.ts`
Module pur, sans `@/lib/supabase` ni React, testé (`annee.test.ts`). Il importe `CheckinRecord`,
`AssessmentSnapshot`, `DecisionDeSaison` de `@/types/suivi`, `periodePrecedente` de
`@/types/checkin`, `ContenuDOuverture` / `SortieDouverture` de `@/types/saison`.

- `JOURS_DINVITATION = 28`.
- `fenetreDeLAnnee(premierBilanIso, n)` → `{ n, debut, fin, anniversaire, debutInstant, finInstant }
  | null`. `debut` et `fin` (inclus, = anniversaire − 1 jour) sont des jours ISO **locaux** pour
  comparer, comme `recapDeLaPeriode` ; `debutInstant` / `finInstant` sont les instants minuit local
  correspondants, pour `formatDate`. Le premier bilan est ramené à son jour local par
  `jourLocalDe` — **aujourd'hui privée dans `src/types/suivi.ts`, à exporter** : c'est celle de
  `keepLatestPerDay`, et une seconde lecture du jour local divergerait d'elle sur un fuseau ;
  l'anniversaire s'obtient par `setFullYear`. `null` sur une date illisible.
- `anneesEcouleesDepuis(premierBilanIso, maintenant = new Date())` → le plus grand `n` tel que
  `anniversaire(n) ≤ aujourd'hui` (jour local), 0 sinon.
- `estDansLInvitation(anniversaireIso, maintenant)` → `0 ≤ écoulé < 28`, en jours locaux.
- `invitationDAnniversaire(n)` → `ContenuDOuverture` (étiquette, titre, corps de la table).
- `SORTIES_DE_LINVITATION: SortieDouverture[]` — `[{ cle: 'voir', label: 'Voir mon année', forme:
  'primaire' }, { cle: 'plus_tard', label: 'Plus tard', forme: 'lien' }]`.
- `lireLAnnee({ fenetre, bilans, points, decisions })` → `AnneeLue` :
  - `reponses: { repondus, changements, tenus } | null` — `recapDeLaPeriode(points, debut, fin)`
    (donc `status = 'answered'`, jamais les manqués) ; `null` si `repondus === 0` ;
  - `decisions: DecisionDeSaison[]` — les cycles qui **chevauchent** la fenêtre
    (`periodStart ≤ fin && (periodEnd ?? periodStart) ≥ debut`), du plus ancien au plus récent ;
  - `bilans: { genre: 'deux', depart, arrivee } | { genre: 'seul_depart', bilan } | { genre:
    'seul_anterieur', bilan }` — `depart` est le dernier bilan dont le jour local est `≤ debut`
    (à la première année, c'est le premier bilan lui-même, par égalité), `arrivee` le dernier
    dont le jour local est `≤ fin` ; s'ils sont le même bilan, `seul_depart` si `n === 1`, sinon
    `seul_anterieur`.
- `changementsQuiOntTenu(points, fenetre)` → le nombre de points `oui` de la fenêtre dont la
  période précédente (`periodePrecedente(loopType, periodStart)`) est un `oui` **et** celle d'avant
  n'en est pas un — mot pour mot la règle d'`estDeuxiemeFoisDeSuite`, appliquée à chaque point de
  la fenêtre (les périodes précédentes peuvent être hors fenêtre, et c'est voulu : un signal
  allumé le 3 janvier compte pour l'année qui commence le 1er). Un test épingle l'égalité, point
  par point, avec `estDeuxiemeFoisDeSuite`. Jamais au-delà de deux : une série de dix semaines
  compte une fois.
- Phrases : `introDeLAnnee(fenetre)`, `phraseDesReponses(reponses)` (par `recapEnMots('Cette
  année', …)`), `phraseDesChangementsTenus(k)` (`null` à zéro), `phraseDuBilanSeul(bilans)`,
  `NOTE_DES_DEUX_BILANS`, `LIGNE_DE_CE_QUI_A_CHANGE_AILLEURS`.

Dans `src/types/saison.ts` : `recapEnMots` devient exportée et prend le sujet (« Cet automne »,
« Ces trois mois », « Cette année ») ; `SortieDouverture.cle` gagne `'voir' | 'plus_tard'`.

## Les conditions d'affichage
- **La carte, sur le plan** : `state.status === 'ok'` **et** `anneesEcoulees ≥ 1` **et**
  `estDansLInvitation(anniversaire(n))` **et** la marque locale ne porte pas `n` **et** la carte de
  saison ne se rend pas ce jour-là. Elle ne dépend ni du nombre d'actions, ni d'un engagement, ni
  d'un point en attente. Deux conditions existantes gagnent `anniversaire === null` : celle de la
  carte d'attente, et celle de la carte des deux lieux (`ouverture === null && anniversaire === null
  && carteDesDeuxLieux`) — sans la seconde, deux cadres s'empileraient au-dessus du plan, ce que
  la contre-lecture du lot 5 a déjà refusé pour la saison.
- **La page** : atteignable dès qu'un premier bilan a un an, sans condition de fenêtre ni de
  marque. `n` ramené dans [1, années écoulées].
- **Le lien du suivi** : `anneesEcoulees ≥ 1`.
- **Les blocs de la page** : réponses si `repondus > 0` ; décisions si la liste n'est pas vide et a
  pu être lue ; bilans toujours (il y a toujours un départ) ; sortie si
  `regimeDeRebilan(dernierBilan.submittedAt) !== 'aucun'`, le dernier bilan étant le plus récent de
  l'historique au moment de la lecture.

## Les données, les routes, les marques
- **Route** : `src/app/(tabs)/suivi/annee.tsx`, paramètre `n` (chaîne). Ni onglet de plus, ni
  route dynamique ; `assetlinks.json`, `robots.txt` et `sitemap.xml` ne bougent pas (écran
  d'application, pas une surface publique). `page-titles.ts` : `'/suivi/annee'`.
- **Lectures de la page**, au montage, en `Promise.all` : `loadAssessmentHistory()`,
  `loadAnsweredCheckins()`, `loadDecisionsEngagees()` — les trois du suivi, sans requête nouvelle.
  `history[0]` est le premier bilan ; `history[history.length − 1]` le dernier. Les deux premières
  en échec → écran d'erreur ; la troisième en échec → `decisions: null`, bloc absent, ligne de
  relecture. Mêmes formes `{ ok, data } | { ok: false }`, jamais erreur → tableau vide.
- **`loadDecisionsEngagees`** sélectionne aussi `period_end` sur `plan_cycles` (les deux
  requêtes) ; `DecisionDeSaison.periodEnd: string | null`.
- **Lecture du plan** : dans le `Promise.all` existant, une entrée de plus —
  `assessments.select('submitted_at').eq('status', 'completed').order('submitted_at', { ascending:
  true }).limit(1).maybeSingle()`. Son échec laisse `anniversaire` à `null` : mieux vaut ne rien
  annoncer qu'une nouvelle inventée, et la lecture suivante rétablit la carte. La marque se lit
  dans le même `Promise.all` que les trois autres marques, sous la même garde d'annulation
  (contre-lecture du lot 5).
- **Marque locale** : `src/lib/anniversaire-prefs.ts`, clé `traceverte.anniversaire_vu.v1`, valeur
  `String(n)` ; `aVuLAnniversaire(n)`, `marquerLAnniversaireVu(n)`. Préfixe historique conservé :
  balayée à la suppression de compte et à la déconnexion par `src/lib/compte.ts`. Locale à
  l'appareil comme celle de la saison — un second appareil peut revoir la carte, sans conséquence.
- **État du plan** : `anniversaire: ContenuDOuverture | null`, à côté du `LoadState` et jamais dans
  sa variante `ok`, pour la même raison que `ouverture` et `orphelin`.
- **Composant** : `CarteDOuverture` tel quel — `ouverture={anniversaire}`,
  `sorties={SORTIES_DE_LINVITATION}`, `ligne={RAMILLE.anniversaire}`, `visage="happy"`,
  `onSortie` : `voir` → marque + fermeture + `router.push`, `plus_tard` → marque + fermeture.
- **Composant** : `src/components/suivi/decisions.tsx`, extrait du suivi (la liste, ses filets, ses
  trois textes) ; l'ordre est celui de la liste reçue.
- **Mesure** (si retenue) : `annee_view`, `props.origine: 'plan' | 'suivi'`, émis par `useTrackView`
  (écran de pile, monté à chaque visite) ; la provenance vient d'un paramètre `depuis` posé par
  l'appelant, jamais devinée.

## Interactions et états
- **Plan** : « Voir mon année » pousse la page (l'onglet Suivi devient actif, la barre reste) ;
  « Plus tard » referme. Écran d'onglet rafraîchi au retour (`useRafraichirAuRetour`) : la carte
  ne revient pas, la marque est écrite.
- **Page** : chargement au montage, comme la restitution ; les deux rangées de bilans ouvrent leur
  restitution ; « Faire un nouveau bilan » ouvre le questionnaire ; « Revenir à mon suivi »
  remplace par `/suivi`. Le retour de la plateforme (geste, bouton, navigateur) fait ce qu'il fait
  toujours.
- **Hors ligne** : la page ne s'atteint pas (écran d'erreur, « Réessayer ») ; sur le plan, la carte
  n'est annoncée que si la lecture du premier bilan a réussi.
- **Animation** : l'entrée de la carte (celle du composant) ; l'entrée décalée des blocs de la page,
  une fois. Aucune autre ; aucune célébration.

## Accessibilité
- Le titre de la page est annoncé en en-tête par son type (`screenTitle`) ; l'étiquette ne l'est
  pas (c'est une marque, pas une section) ; les en-têtes de bloc portent `accessibilityRole="header"`,
  comme les têtes de groupe des pistes.
- La mascotte est masquée (`Mascot` le fait) ; la réplique est lue.
- Les rails de barre sont masqués (`aria-hidden`, `accessibilityElementsHidden`) : la rangée porte
  déjà la date et le total, et son libellé recomposé « Bilan du {date}, {total} » est ce qu'un
  lecteur d'écran entend, avec l'indice « Ouvre le détail de ce bilan ».
- Les liens sont des `TextLink` (le libellé annoncé est le texte affiché), le bouton un `Button`.
- Tout suit l'agrandissement des polices : les rangées `flexWrap`, rien de tronqué.

## Jetons et motifs
**Aucun jeton ajouté** à `Colors`, `TypeScale`, `Radius`, `ControlHeight`. Motifs réemployés : la
carte d'ouverture (`CarteDOuverture`), le panneau du suivi (`backgroundElement`, rayon 20 en dur
comme dans `suivi/index.tsx`), la rangée de bilan du suivi (rail 14, `accent` / `accentMuted`),
l'étiquette 13/18/700, la note de méthode `code` 12/18, la ligne de relecture, l'écran centré
d'attente. Chaque couleur existe dans les deux thèmes.

## Règles non négociables (brief §3, §4, §6)
Ramille ne dit jamais un nombre et ne se tient jamais près d'un chiffre lourd : en tête de page,
un bloc au moins l'en sépare. Aucune comparaison entre personnes : la seule est la personne avec
elle-même, à un an d'écart. Aucune mécanique d'échec : rien ne dit zéro, rien ne nomme un manqué,
aucune série, le signal « deux fois de suite » ne compte jamais au-delà de deux. **Aucun gain de
`plan_actions` sur la page, et jamais le mot « évité »** : l'écart entre deux bilans est nommé
comme un écart entre deux estimations. Rien n'est imposé : la carte se referme, la page reste,
aucun rappel ne part. Deux onglets. Une Ramille par écran. Pas de rouge, pas d'icône d'alerte,
pas de confettis.

## Fichiers
- `README.md` — ce qui est proposé, pourquoi, ce qui a été écarté, les écarts assumés, les
  réponses au §8 du brief, ce qui reste à trancher.
- `HANDOFF.md` — ce document.
- `BRIEF.md` — le brief du 19/09/2026.
