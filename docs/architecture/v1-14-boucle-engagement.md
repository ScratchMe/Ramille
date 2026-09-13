# v1-14 — La boucle d'engagement, d'une saison à l'autre

**Statut : document d'implémentation, écrit le 10/09/2026** à partir du canvas Claude Design livré
le même jour (`docs/design/v1-14-boucle-engagement/`, brief `BRIEF.md`, livrable `HANDOFF.md`,
captures). Il couvre le lot 2 du plan `v1-13-audit-et-chantiers.md` (chantiers C2.1 à C2.14) et
les quatre chantiers d'autres lots que le canvas a dessinés en passant (C3.1, C3.9, C3.10 pour
l'étiquette, C4.6 relevé en P2). Chaque chantier garde son issue GitHub (#119 à #131, #138 à #140,
#148, #151, #153) ; ce document est ce qu'elles lisent pour leur partie écran. L'ordre de
livraison est en `v1-13` §2.3.

Ce que ce document **n'est pas** : une nouvelle décision sur ce que la boucle mesure. Les dix-huit
arbitrages du 10/09 (`v1-13` §1) restent la référence ; le canvas les a dessinés, il ne les a pas
rouverts.

## 1. Ce qu'on livre, en une phrase

Le point du lundi nomme l'action et les jours que la personne a choisis, accepte trois réponses,
et reste affiché avec le mot de Ramille ; la saison a une fin écrite sur le cap et une ouverture
qui récapitule et propose de reprendre ; l'engagement survit au re-bilan et au changement de
saison ; le suivi montre l'écart par poste, ce qui a été décidé saison après saison, et les points
groupés ; la restitution d'un second bilan montre le premier ; deux actions sont en avant et les
autres derrière un lien ; et Ramille porte la saison sans dire un chiffre.

## 2. Ce qui est tranché — les dix-sept écarts du canvas, et qui les livre

La page Écarts du canvas (`captures/Ecarts.png`) liste chaque changement au design existant.
Les voici, rattachés au chantier qui les livre. Ce qui n'y figure pas est inchangé.

| # | Écart | Chantier | Planche |
|---|---|---|---|
| 1 | La question du point nomme l'action et les jours, au passé ; générique sur la forme insérable ; question de maintien pour qui va déjà à vélo ; question d'occasion pour les voyages ; notification avec le sujet en tête | C2.1 (structure, question, notification), C2.5 (maintien), C2.3 (passé) | A1, A2a, A2b, A3 |
| 2 | Troisième réponse en `TextLink` tertiaire centré sous les deux boutons, cible 44 ; trois valeurs en base | C2.4 | A1, A2 |
| 3 | Retours de Ramille variés, trois ou quatre par issue, l'originale conservée | C2.12 | A3 |
| 4 | Carte répondue : la carte reste jusqu'au prochain point avec le retour de Ramille et « Répondu lundi. Prochain point : lundi 21 sept. » ; second renforcement après deux Oui | C2.4 (persistance), C2.10 (renforcement) | A1 |
| 5 | Cap avec sa fin : « Automne 2026 » / « jusqu'au 30 novembre », trait de temps 6 px en `accentMuted`, légende | C2.8 | B1 |
| 6 | Carte d'ouverture de saison, composant `CarteDeSaison`, Ramille dessous, deux premières semaines, repli « période » | C2.8 | B2, B3 |
| 7 | Action reconduite : étiquette « TON ENGAGEMENT · RECONDUIT », ancienne action estompée en mémoire de saison après « Choisir une autre » | C2.2 (reconduction), C2.8 (affichage) | B2 |
| 8 | Étiquette dégenrée « TON ENGAGEMENT » | C2.2 (livre le libellé ; C3.10 ne le refait pas) | partout |
| 9 | Bandeau « L'hiver a commencé pendant que tu étais là. » ; engagement orphelin dit une fois | C2.8 (bandeau), C2.2 (orphelin) | B3 |
| 10 | Suivi : écart par poste, composant `EcartParPoste`, barre-contour | C2.7 | D1 |
| 11 | Suivi : « Ce que tu as décidé, saison après saison » | C2.7 | D1 |
| 12 | Suivi : points groupés par saison, « Voir tout », trois libellés, attribution, Ramille `calm` en bas, mascotte `happy` retirée | C2.7 | D2 |
| 13 | Restitution d'un re-bilan : barre-contour « Ton bilan précédent », variation, palier derrière soi ; variante mobilité contrainte | C2.7 (bilan précédent), C3.1 (mobilité contrainte) | E |
| 14 | Deux actions en avant, « Voir d'autres pistes · N », premier pas dans la carte engagée, libellé télétravail | C4.6 (pistes, premier pas), C3.8 (libellé, phrase d'intro) | F1, F2 |
| 15 | Reprise : questionnaire à moitié rempli ; plan ouvert depuis un rappel sur un appareil neuf | C3.9 (reprise), C2.11 (appareil neuf) | G |
| 16 | Mascotte : accessoires de saison | C2.13 | Saisons |
| 17 | Thème sombre : toutes les planches basculent, aucune couleur sans son pendant sombre | chaque chantier, pour ce qu'il ajoute | toutes |

Ce que le canvas a tranché parmi les questions ouvertes du brief : la personne déjà à vélo reçoit
une **question de maintien** (pas l'absence de point) ; la question des voyages porte sur
**l'occasion** ; Ramille se tient **sous** la carte d'ouverture ; **quatre accessoires**, deux
marqués et deux discrets ; quand la saison change pendant que le plan est ouvert, **un bandeau**,
jamais une carte remplacée sous les yeux.

## 3. La copie — source unique

Tout ce que dit Ramille entre dans `src/constants/mascotte.ts`, sous ses règles testées (première
personne, court, tutoiement, jamais un nombre, jamais « tu devrais », jamais un accord qui genre).
Le reste est en voix produit et vit dans le composant ou l'écran qui l'affiche, ou dans une
constante partagée quand deux écrans le disent.

### 3.1 Ramille

Les répliques de check-in deviennent des **tableaux par issue et par boucle** : la boucle
hebdomadaire nomme « lundi » et « la semaine », la mensuelle « le début du mois prochain » et « le
mois ». La première entrée de chaque tableau est l'originale des maquettes validées, inchangée.
Une variante est choisie par période (`repliqueDeCheckin`, C2.12), jamais au hasard.

| Clé | Boucle hebdomadaire | Boucle mensuelle |
|---|---|---|
| `checkinOui[0]` | Bien joué — chaque changement compte. | idem |
| `checkinOui[1]` | Un trajet autrement. Je le note ici. | Un voyage autrement. Je le note ici. |
| `checkinOui[2]` | C'est fait, et ça compte. À lundi. | C'est fait, et ça compte. Au début du mois prochain. |
| `checkinOui[3]` | Tu as fait autrement. Je vois la différence. | idem |
| `checkinNon[0]` | Pas cette fois-ci. Rien d'obligatoire, on se repose la question au prochain point. | idem |
| `checkinNon[1]` | Ça arrive. Lundi, je te repose la question, tranquillement. | Ça arrive. Au début du mois prochain, je te repose la question, tranquillement. |
| `checkinNon[2]` | Une semaine sans, ce n'est pas un retour en arrière. | Un mois sans, ce n'est pas un retour en arrière. |
| `checkinSansObjet[0]` | Pas de trajet, pas de question. On se retrouve lundi. | Pas de voyage, pas de question. On se retrouve au début du mois prochain. |
| `checkinSansObjet[1]` | Semaine sans trajet. Je reviens lundi, comme d'habitude. | Mois sans voyage. Je reviens au début du mois prochain, comme d'habitude. |
| `maintienNon.velo` | Noté. Le vélo reste ton trajet ; une semaine autrement n'y change rien. | — |
| `maintienNon.marche` | Noté. La marche reste ton trajet ; une semaine autrement n'y change rien. | — |
| `ouvertureSaison` | On repart pour une saison. | idem (aussi en cadence de repli) |
| `suiviDifference` | Je vois la différence. | — |

Deux corrections au canvas, consignées dans le README du dossier : la variante « Tu as choisi le
vélo. Je vois la différence. » nommait une action, elle devient « Tu as fait autrement. Je vois la
différence. » pour valoir avec toute action ; et les variantes qui nomment un jour existent en deux
versions, parce que la boucle mensuelle ne revient pas lundi.

Les répliques existantes ne bougent pas : `attenteSigneHebdo` (« Je te fais signe lundi. »),
`suiviSansPoint` (« Je note tes réponses ici, au fil des saisons. »), la feuille des rappels.

### 3.2 Voix produit

**Le point** (A1, A2a, A2b, A3) :

- En-tête : « Point de la semaine · lundi 14 sept. » / « Point du mois · septembre ».
- Question avec engagement : « Mardi ou jeudi, as-tu fait ce trajet à vélo ? » — composée à partir
  du gabarit de l'action (§4.2) et des jours d'intention, au passé.
- Question générique, sans engagement : « La semaine dernière, as-tu changé de mode de transport
  pour ton trajet domicile-travail ? » (forme insérable de C2.6).
- Question de maintien, mode principal vélo ou marche : « La semaine dernière, ton trajet s'est-il
  fait à vélo ? » / « … à pied ? ».
- Question d'occasion, action voyages de type « un vol en moins » : « En septembre, as-tu eu un
  déplacement où tu as choisi autre chose que l'avion ? » — le mois est nommé, parce que le point
  du 1er interroge le mois écoulé (D2 ; le canvas écrivait « Ce mois-ci », corrigé).
- Troisième réponse : « Pas de trajet cette semaine » / « Pas de voyage en septembre ».
- Pied de la carte répondue : « Répondu lundi. Prochain point : lundi 21 sept. » / « Répondu le
  1er. Prochain point : 1er novembre. »
- Second renforcement (après deux « Oui » consécutifs, jamais au-delà) : « Deuxième semaine de suite
  que tu fais ce trajet autrement. » / « Deuxième mois de suite que tu voyages autrement. »
- Notification, sujet en tête : « Ton trajet domicile-travail : mardi ou jeudi, l'as-tu fait à
  vélo ? » / « Tes voyages : en septembre, as-tu choisi autre chose que l'avion ? ».
- Ligne sous une question figée qui nomme une action quittée depuis : « Question posée lundi, sur
  l'action de la semaine dernière. »

**La saison** (B1, B2, B3) :

- Carte du cap : « Ton cap pour cette saison » (« pour cette période » en cadence de repli),
  « − 184 kg », « Automne 2026 » à gauche, « jusqu'au 30 novembre » à droite, légende « La saison
  avance ; le trait mesure le temps, pas toi. »
- Carte de re-bilan : « Ton bilan a six mois. Le refaire prend quelques minutes ; ton plan
  s'ajuste. » + « Refaire mon bilan ». (Le canvas dit « cinq minutes » ; tranché le 13/09/2026 pour
  « quelques minutes » — le produit promet bien « environ 5 minutes », mais pour le **premier**
  bilan, et un re-bilan prérempli est plus rapide. Écart 8.) L'âge vient d'`ancienneteEnMots`
  (`src/types/suivi.ts`), partagée avec la carte du suivi : deux écrans qui comptent chacun de leur
  côté finissent par annoncer six mois d'un côté et cinq de l'autre.
- Carte d'ouverture : étiquette « NOUVELLE SAISON », titre « L'hiver commence. », corps « Cet
  automne : 11 points répondus, 8 fois où tu as changé quelque chose sur ton trajet. », boutons
  « Reprendre la même action » / « Choisir une autre ». Cadence de repli : « NOUVELLE PÉRIODE »,
  « Une nouvelle période commence. », « Ces trois mois : … ». Jamais les points manqués.
- Étiquette de l'action reconduite : « TON ENGAGEMENT · RECONDUIT ». Mémoire de saison après
  « Choisir une autre » : sur-titre « Cet automne », titre de l'action, « Reste dans ton suivi, le
  mardi et le jeudi. »
- Bandeau de bascule : « L'hiver a commencé pendant que tu étais là. » + « Voir la saison ».
- Engagement orphelin, une fois : « Ton plan a changé avec ton nouveau bilan. L'action que tu
  suivais n'y est plus ; elle reste dans ton suivi. » + « Compris ».

**Le suivi** (D1, D2) :

- « Ton suivi » ; « Bilan du 10 sept. 2026 » / « précédent : 12 mars » ; total en `salient` ;
  « 8 % de moins que ton bilan précédent. Ce que tu as changé se voit ici. » (baisse) — la hausse
  garde la phrase factuelle existante.
- « Par poste », lignes « Trajet domicile-travail · 2,1 t → 1,7 t », légende « Contour : bilan
  précédent · plein : ce bilan · accent : le poste qui pèse le plus ».
- « Ce que tu as décidé, saison après saison » ; lignes « Automne 2026 — Ce trajet à vélo · mardi,
  jeudi ».
- « Tes points » ; groupes « Automne 2026 · 11 points » + « Voir tout » ; libellés « Changement
  fait » / « Pas cette fois » / « Pas de trajet » ; « Ces fois-là, c'est toi qui as choisi le
  trajet. »

**La restitution d'un re-bilan** (E) : « Ton bilan précédent · mars » (barre-contour) au-dessus de
« Toi, aujourd'hui » et « Moyenne en France » ; sous les barres « 0,3 t de moins que ton bilan de
mars. Le palier que tu visais est derrière toi. » (la seconde phrase seulement quand c'est vrai).
Mobilité contrainte : pas de barre « Moyenne en France », phrase « Là où tu vis, la voiture n'est
pas un choix. Le plan regarde ce qui dépend de toi. »

**Le plan** (F1, F2) : carte d'attente titrée « Prochain point » ; bloc « Premier pas » dans la carte
engagée (« Repère un itinéraire cyclable pour mardi. », « Bloque le prochain vendredi dans ton
agenda, aujourd'hui. » — un par gabarit, §4.2) ; lien « Voir d'autres pistes · 4 » ; titre
« D'autres pistes », intro « Deux actions, sur d'autres postes que ton trajet domicile-travail. »
quand les actions débordent du poste dominant ; « Choisir celle-ci à la place » ; « Replier » ;
« Travailler depuis chez toi un jour par semaine ».

**La reprise** (G) : « On reprend là où tu en étais. » (le canvas écrit « où tu t'étais arrêté »,
accord qui genre — corrigé), « Quatre écrans déjà remplis. Il en reste cinq, en comptant
celui-ci. » (dérivé de `isStepVisible`), « Continuer mon bilan » / « Repartir de mon dernier
bilan ». Appareil neuf depuis un rappel : « Ce rappel concerne un compte. Retrouve-le ici. »,
« Ton bilan, ton plan et tes points sont rattachés à ce compte, pas à cet appareil. », « J'ai déjà
un compte », lien « Commencer un bilan sur cet appareil ».

## 4. La base

Tout ce qui suit passe par une migration et une régénération de `src/lib/database.types.ts`.
Aucune policy UPDATE : les écritures client passent par RPC (`v1-13` §8).

### 4.1 Le point à trois réponses — C2.4

`engagement_checkins.response_kind text check (response_kind in ('oui', 'non', 'sans_objet'))`,
nul tant que le point n'est pas répondu. `response boolean` reste, **dérivée** : `true` pour
`oui`, `false` pour `non`, `null` pour `sans_objet`. Tout ce qui lit « les points répondus »
filtre sur `status = 'answered'` et lit `response_kind` — `loadAnsweredCheckins`, les vues
`analytics.*`, le suivi — et plus jamais sur `response is not null`. (Ceci précise C2.4 : le
piège n'était pas la valeur nulle, c'était le filtre.) Le RPC de C1.12 prend `response_kind`.

### 4.2 La question figée et le gabarit d'action — C2.1, C4.6

Sur `action_templates` : `question_template text` (« {jours}, as-tu fait ce trajet à vélo ? »,
« {jours}, as-tu travaillé depuis chez toi ? », pour les voyages « En {mois}, as-tu eu un
déplacement où tu as choisi autre chose que l'avion ? ») et `first_step text` (« Repère un
itinéraire cyclable pour {premier jour}. »). Une ligne de seed par gabarit ; un test pgTAP vérifie
qu'aucun gabarit n'a de `question_template` nul.

Sur `engagement_checkins`, figés à la génération, jamais relus à la volée : `question_kind text
check in ('engagement', 'generique', 'maintien', 'occasion')`, `committed_action_text`,
`committed_intention_days smallint[]`, `committed_intention_timing text`, `committed_question
text` (la question composée, telle qu'envoyée). La composition vit dans une fonction SQL
`checkin_question(...)` et son jumeau pur `src/types/checkin.ts`, épinglés des deux côtés sur la
même table de cas (même mécanique que `reminder_channel_for`). `question_kind` dit à la carte
quelle troisième réponse afficher et quel tableau de Ramille lire (`maintien` a son « Non » à lui).

### 4.3 L'engagement qui survit — C2.2

Table `plan_action_commitments_archive` (`user_id`, `plan_cycle_id`, `action_template_id`,
`action_text`, `intention_days`, `intention_timing`, `committed_at`, `released_at`,
`released_reason check in ('rebilan', 'saison', 'changement')`), RLS lecture propriétaire, écriture
serveur seule. `generate_plan_cycle_for_user` archive avant le `delete`, repose l'engagement sur
la ligne du même gabarit quand elle existe, et pose `plan_actions.carried_over_from uuid` quand la
reconduction vient d'un changement de saison — c'est ce champ que l'étiquette « · RECONDUIT »
lit. `clear_plan_action_commitment` archive en `changement`. Le trigger sur `submitted_at` et
le `nulls last` sont ceux de C2.2.

### 4.4 Toutes les pistes, une seule engagée — C4.6

`generate_plan_cycle_for_user` fige **toutes** les actions au gain ≥ 5 kg avec leur `rank` (deux
en avant à l'écran, les autres derrière le lien) et `plan_actions.first_step` recopié du gabarit.
`commit_plan_action` gagne `p_replace boolean default false` : à `true`, l'engagement courant est
archivé en `changement` dans la même transaction — c'est « Choisir celle-ci à la place ». L'index
unique partiel (une seule action engagée par cycle) ne bouge pas.

### 4.5 Ce que la saison lit — C2.8, C2.7, C2.14

`plan_cycles.period_end` existe déjà ; le plan le sélectionne. Le récapitulatif de la carte
d'ouverture se calcule **côté client** à partir des points de la période précédente
(`recapDeSaison(checkins, bornes)` dans `src/types/saison.ts`, C2.14) — pas de vue, pas de RPC.
L'état « carte d'ouverture vue » est **local à l'appareil** (AsyncStorage), comme la feuille des
rappels : la carte ne vit que deux semaines, un second appareil peut la revoir. **Une clé unique qui
porte l'identifiant du cycle** (`traceverte.saison_ouverture_vue.v1`) et non une clé par cycle
(écart 19) — un seul cycle est en ouverture à la fois, et le motif est celui de la marque de
l'engagement orphelin. Le cycle **précédent** est lu dans la même requête que le courant
(`limit(2)`) : ses bornes servent au récapitulatif, et son existence est ce qui distingue une
bascule d'un premier bilan. Le suivi lit `plan_cycles` +
`plan_actions` engagées + l'archive pour « ce que tu as décidé », et les colonnes par poste
d'`assessment_results` (`commute_co2_kg_year`, `leisure_co2_kg_year`, `travel_co2_kg_year`) pour
l'écart par poste.

### 4.6 Le second renforcement — C2.10

Vue `analytics.checkins_consecutifs` (par boucle, sur les périodes successives). Côté client, le
plan charge la réponse de la période précédente de la même boucle et une dérivation pure
`estDeuxiemeFoisDeSuite(precedent, courant)` rend vrai quand les deux sont `oui`. Jamais au-delà
de deux : pas de compteur.

## 5. Les composants

Un composant nouveau a **un** chantier propriétaire ; les autres le consomment après sa PR. Les
valeurs viennent de `theme.ts` ; aucune taille, aucun rayon, aucune hauteur nouvelle (§6).

| Composant | Propriétaire | Consommateurs | Planche |
|---|---|---|---|
| `CheckinCard` — question, trois réponses, état répondu persistant, ligne de renforcement | C2.1 (question, `question_kind`), puis C2.4 (troisième réponse, persistance), C2.10 (renforcement), C2.12 (variantes) — **dans cet ordre, même fichier** | plan | A1, A2 |
| `CarteDeSaison` — nouveau | C2.8 | plan | B2, B3 |
| `TraitDeTemps` — barre 6 px rail `border`, remplissage `accentMuted` | C2.8 | carte du cap | B1 |
| `BarreContour` — barre à contour 1,5 px `accentMuted`, rail transparent | C2.7 | `EcartParPoste`, restitution | D1, E |
| `EcartParPoste` — nouveau | C2.7 | suivi | D1 |
| `ActionCard` — étiquette « TON ENGAGEMENT » et suffixe « · RECONDUIT » | C2.2 | plan | B2 |
| `ActionCard` — bloc « Premier pas », état estompé « Choisir celle-ci à la place » | C4.6 | plan | F1, F2 |
| `Mascot` — prop `season`, accessoires | C2.13 | partout | Saisons |
| Bandeau discret (une phrase + une action) | C2.8, sur le motif existant du plan | plan | B3 |

**`CheckinCard`.** Fond `backgroundSelected` quand le point concerne le poste dominant, `backgroundElement`
sinon ; en-tête 14/20/600 `accentText` ; question en `cardTitle` ; deux `Button` (« Non » secondaire,
« Oui » primaire) ; troisième réponse en `TextLink` `small` `textTertiary` centré, cible 44,
`accessibilityHint` qui rappelle la question. Répondue : la question laisse place à `RamilleDit`
(`happy` pour oui, `encouraging` pour non, `calm` pour sans objet ou maintien-non), puis la ligne
de renforcement en `body` s'il y a lieu, puis le pied en `small` `textTertiary`. La carte persiste
jusqu'au prochain point ; écran d'onglet, rafraîchi au retour (`useRafraichirAuRetour`).

**`CarteDeSaison`.** Bordure 1 px `border`, fond `backgroundTinted`, rayon `Radius.card` (18),
padding 20, gap 12. Étiquette 13/18/700, interlettrage +0,3, `accentText`, majuscules ; titre
`screenTitle` ; corps `body` `textSecondary` ; `Button` primaire puis secondaire. Elle se tient en
tête du plan, au-dessus de son titre, pendant les deux premières semaines de la période, tant que
la marque locale « vue » n'est pas posée. **Elle ne prend pas la place d'un point en attente** —
elle remplace la carte d'attente (écart 16) : le lien du rappel pointe `/plan`, donc masquer la
question y ouvrirait une notification sur un écran qui ne la porte pas. Ses boutons sortent de
`sortiesDeLouverture`, parce que deux cas de production n'ont pas d'action à reprendre (écart 18). **Ramille est dessous, hors du cadre** : `RamilleDit`
44 px, `happy`, `tilt` −5, `ouvertureSaison`. Entrée : `translateY` 16 → 0 et opacité, 320 ms
ease-out (Reanimated). Rien d'autre ne bouge.

**`EcartParPoste`.** Par poste : ligne libellé à gauche, « 2,1 t → 1,7 t » à droite en `small`
600 ; puis deux barres de 10 px, rayon 5 : la première en contour (`BarreContour`, bilan
précédent), la seconde pleine (bilan courant), en `accent` pour le poste dominant du bilan courant,
`accentMuted` pour les autres. Échelle commune aux six barres. Légende 12/16 `textTertiary`.

**Les pistes (F1, F2).** Deux `ActionCard` en avant ; lien « Voir d'autres pistes · N » (`TextLink`
`small` 600 `accentText`, centré, cible 44) ; dépliées : deux cartes estompées (opacité 0,72,
toujours cliquables) avec « Choisir celle-ci à la place » en `Button` secondaire, puis des lignes
simples libellé / « − 72 kg » `textTertiary`, puis « Replier ». État `pistesDepliees` local à
l'écran. Le bloc « Premier pas » dans la carte engagée : fond `background`, rayon `Radius.field`
(16), padding 12/16, sur-titre 13/18/600 `textTertiary`, texte 14/20.

**La restitution (E).** `BarreContour` « Ton bilan précédent · mars » 14 px au-dessus des deux
barres existantes ; même échelle ; la phrase de variation sous les barres en `body`.

## 6. Les jetons

Quatre couleurs entrent dans `Colors`, **dans les deux thèmes**, et remplacent les trois lectures
en dur de `Colors.light` dans `mascot.tsx` :

| Jeton | light | dark | Usage |
|---|---|---|---|
| `mascotInk` | `#131612` | `#131612` | yeux, bouche — fixes, la mascotte est identique dans les deux thèmes, feuille exceptée |
| `mascotVein` | `#E4EFE8` | `#E4EFE8` | nervure |
| `mascotAccessory` | `#E4EFE8` | `#E4EFE8` | revers du bonnet, pompon, pétales, reflet de la goutte |
| `mascotWarm` | `#C99A6B` | `#B98A5E` | joues d'automne, calotte du bonnet, cœur du bourgeon — un sable, oklch(0.72 0.07 70), jamais un rouge |

La page Système du canvas nomme le dernier `mascotBlushAutumn` ; `HANDOFF.md` et
`tokens/colors.css` disent `mascotWarm`, et c'est ce nom qui est retenu (il sert aussi au bonnet).
Aucun ajout à `TypeScale`, `Radius`, `ControlHeight`. Les cinq motifs nouveaux (barre-contour,
carte de saison, réponse tertiaire, étiquette composée, trait de temps) s'écrivent avec l'existant.

## 7. La mascotte porte la saison — C2.13

`Mascot` prend `season?: 'hiver' | 'printemps' | 'ete' | 'automne'`, valeur par défaut
`saisonDe(new Date()).saison` — donc figeable dans un test, un canvas ou une capture. L'accessoire
est rendu **après** le groupe du visage, découpé par le même `clipPath` quand il touche la
silhouette, **jamais sous `MASCOT_MIN_FACE_SIZE`** (28 px : la feuille seule reste la feuille
seule). Aucun accessoire ne touche les yeux ni la bouche ; aucune expression ne change ; l'hiver
n'est pas triste. Positions en unités de `viewBox` à la taille nominale (fixes), épaisseurs et
rayons multipliés par `k = opticalScale(size)`, dans `mascotSeasonGeometry(saison, size)` à côté
de `mascotFaceGeometry` — même compensation, même arrondi sur l'écart, même test de conformité
aux chemins du canvas (`Mascotte.dc.html`, géométrie exacte dans `HANDOFF.md`) :

- **Hiver — bonnet** : calotte `M31,34 C37,24 44,18 50,15 C56,18 63,24 69,34 C62,29 56,27 50,27
  C44,27 38,29 31,34 Z` en `mascotWarm` ; revers `M31,34 C38,29 44,27 50,27 C56,27 62,29 69,34`
  trait `mascotAccessory`, épaisseur 4,4·k, bouts ronds ; pompon cercle (50, 12) rayon 5,6·k
  `mascotAccessory` puis cercle rayon 3,9·k `mascotWarm`.
- **Printemps — bourgeon** : trois cercles rayon 3·k `mascotAccessory` en (45,8 ; 18,5),
  (54,2 ; 18,5), (50 ; 14) ; cœur (50 ; 17,5) rayon 1,8·k `mascotWarm`. Le plus discret.
- **Été — goutte de rosée** : `M64,70 C64,66 67,62 67,62 C67,62 70,66 70,70 C70,71.8 68.6,73
  67,73 C65.4,73 64,71.8 64,70 Z` blanc à 0,85 d'opacité ; reflet (66 ; 68,5) rayon 0,9·k
  `mascotAccessory`. Hors du visage.
- **Automne — joues** : rayon × 1,18, opacité + 0,25 (plafond 0,9), `mascotWarm` à la place
  d'`accentMuted`.

Si quatre sont trop, printemps et été peuvent rester nus — décision du titulaire à la relecture
sur appareil. **Exclus** : la carte de partage (`api/share-card.ts`, C3.10 lui retire le visage),
le favicon, les icônes d'app (`mascot-mark.svg` reste `calm` sans saison). Une dépendance native
n'est pas ajoutée, mais la géométrie et les jetons touchent le composant natif : **un build**
avant de vérifier sur appareil.

`src/types/saison.ts` (C2.14) porte `saisonDe(date)` → `{ saison, debut, fin, libelle }`, miroir
exact de `season_bounds` (hiver = décembre à février, libellé « Hiver 2026-2027 » ; printemps
mars-mai ; été juin-août ; automne septembre-novembre), testé sur les douze mois et les bornes,
avec le test pgTAP de `season_bounds` cité en miroir. La mascotte suit ce calendrier même en
cadence de repli.

## 8. Les écrans, planche par planche

- **A (le point)** — C2.1 pose `question_kind`, la question composée et la notification ; C2.4 la
  troisième réponse et la carte répondue persistante ; C2.10 la ligne de renforcement ; C2.12 les
  variantes ; C2.5 la question de maintien côté générateur ; C2.3 le passé et le mois nommé.
- **B (la saison)** — C2.8 : fin sur le cap, trait de temps, `CarteDeSaison`, bandeau de bascule,
  repli « période », carte de re-bilan sur le fait ; C2.2 : reconduction, étiquette, mémoire de
  saison, engagement orphelin.
- **Saisons** — C2.13, après C2.14 et C2.8.
- **D (le suivi)** — C2.7 en entier : en-tête avec bilan précédent, `EcartParPoste`, décisions,
  points groupés, attribution, Ramille `calm` 36 en bas, mascotte `happy` retirée.
- **E (la restitution)** — C2.7 pour la barre-contour et la variation ; C3.1 pour la variante
  mobilité contrainte.
- **F (les pistes)** — C4.6, relevé en P2, après C2.8 (même fichier `plan.tsx`) ; C3.8 pour le
  libellé télétravail et la phrase d'intro quand les actions débordent du poste dominant.
- **G (la reprise)** — C3.9 pour le questionnaire à moitié rempli (racine + écran) ; C2.11 pour le
  plan ouvert depuis un rappel sur un appareil neuf.

## 9. Ce que la technique impose

- **La question est figée à la génération.** Changer d'engagement le mercredi ne réécrit pas la
  question du lundi ; la carte le dit en une ligne quand l'action nommée n'est plus l'engagement
  courant (B3).
- **Le point arrive le lundi, le rappel aussi** ; le push part le matin même, l'email est étalé.
  Ramille peut dire « lundi » ; la boucle mensuelle dit « au début du mois prochain ».
- **Une seule action engagée par saison**, intention obligatoire, jamais libre. « Choisir celle-ci
  à la place » bascule, n'ajoute pas.
- **La saison est météorologique ; la cadence de repli est un trimestre glissant sans nom.** La
  carte d'ouverture, le cap et le suivi ont une forme pour chacune ; la mascotte suit le calendrier.
- **Le plan et le suivi sont des écrans d'onglet** : montés en permanence, rafraîchis au retour ;
  la carte d'ouverture a un état persistant pour réapparaître à froid ; si la saison bascule
  pendant que le plan est monté, le bandeau, pas un remplacement de carte.
- **La liste des points s'allonge** : groupée par saison (ou par période de cycle en repli),
  paginée par « Voir tout », jamais tronquée en silence.
- **Le suivi ne lit jamais les points laissés passer**, ni rien d'autrui.
- **Animations** : entrée des cartes `translateY` 16 → 0 + opacité, 260–320 ms ease-out. Rien
  d'autre ; aucune célébration.
- **Accessibilité** : réponses en boutons avec `accessibilityHint`, troisième réponse en
  `TextLink`, groupes de choix en `radio`, cibles 44, mascotte masquée.
- **Thème sombre** : chaque couleur ajoutée existe dans `Colors.dark` ; `userInterfaceStyle` reste
  tel quel tant que C1.11 ne l'ouvre pas.

## 10. Écarts d'implémentation par rapport au canvas

Consignés aussi dans `docs/design/v1-14-boucle-engagement/README.md`, pour que personne ne
« corrige » le code vers le canvas :

1. `mascotWarm`, pas `mascotBlushAutumn` (§6).
2. La question mensuelle nomme le mois écoulé, « En septembre, … » (§3.2), et la troisième réponse
   « Pas de voyage en septembre ».
3. « Loisirs du week-end », pas « Weekend et loisirs », dans l'en-tête du questionnaire (C2.6).
4. `response_kind` en base, pas le `answered` du kit (§4.1).
5. « On reprend là où tu en étais. », pas « où tu t'étais arrêté » (accord qui genre).
6. « Tu as fait autrement. Je vois la différence. », pas « Tu as choisi le vélo. » ; les variantes
   qui nomment un jour ont une version par boucle (§3.1).
7. Le compte des écrans de la reprise se dérive de `isStepVisible`.
8. « quelques minutes » plutôt que « cinq minutes » sur la carte de re-bilan (tranché le
   13/09/2026, C2.8) : le produit promet « environ 5 minutes » pour le **premier** bilan — transition
   de l'onboarding, états vides du plan et du suivi — et un re-bilan est plus rapide, ses réponses
   étant préremplies. Reprendre la même durée la surestimerait.
9. **`maintienNon` a quatre variantes et non deux** (C2.5, 11/09/2026). Le canvas écrit
   `maintienNon.velo` et `maintienNon.marche` ; la catégorie `velo_marche` compte **trois** modes en
   base (`velo`, `marche`, `trottinette` — relevé le 11/09/2026, et un test pgTAP épingle la liste).
   Un repli de la trottinette sur le vélo dirait « ton trajet s'est-il fait à vélo ? » à quelqu'un
   qui n'en a pas, donc elle a sa question et sa réplique. `maintienNon.autre` ferme la liste : un
   mode inattendu doit recevoir une phrase neutre, jamais `checkinNon`, qui consolerait d'un échec
   qui n'en est pas un — c'est la seule règle non négociable de cette branche.
10. **Le mode inventé des loisirs rares ne nomme pas non plus le poste dominant** (C2.5). Le canvas
    et le constat A13-4 ne parlent que du libellé extras ; corriger le seul extras laissait
    `dominant_poste_label` dire « Loisirs du week-end (Voiture) » pendant qu'`extras_poste_label`
    disait « (occasionnels) » — deux libellés du même poste qui se contredisent sur des écrans
    voisins (`/connexion`, la liste du suivi), et `dominant_poste_mode` qui faisait écrire « Tes
    loisirs du week-end **en voiture** » à la restitution. Les deux libellés partagent désormais le
    mot, et la condition est le même test des deux côtés.
11. **`checkinSansObjet` a quatre variantes indexées sur le poste, et non deux sur la boucle**
    (C2.4, 11/09/2026). Le canvas oppose « Pas de trajet … » (hebdomadaire) et « Pas de voyage … »
    (mensuelle) ; depuis C2.6 la boucle mensuelle couvre **deux** postes, les voyages et les sorties
    du week-end. Répondre « Pas de voyage, pas de question. » à quelqu'un qui vient d'appuyer sur
    « Pas de sortie en septembre » serait exactement la fausseté lisible que C2.6 a retirée ailleurs.
    Les variantes suivent donc le poste, comme le libellé du bouton, et `checkinSansObjet.autre`
    ferme la liste pour un point généré avant C2.6, qui n'en porte pas.
12. **Le pied de la carte répondue écrit le mois en entier** : « Prochain point : lundi
    21 septembre. » et non « 21 sept. » (§3.2). Les abréviations demanderaient une quatrième liste de
    mots français tenue à la main, pour gagner quatre caractères sur une ligne en petit tertiaire.
    Le reste de la phrase est celui du canvas. Et ce pied est **du produit, pas de Ramille** : il
    porte deux dates, et elle ne dit jamais de nombre — d'où son rendu sous sa phrase, et non dedans.
13. **`estDeuxiemeFoisDeSuite` prend un troisième état, et le signal ne se rallume pas** (C2.10,
    11/09/2026). §4.6 décrit la dérivation comme `(precedent, courant)` ; avec deux arguments on ne
    peut pas distinguer « deuxième » de « cinquième », et la phrase validée dit « Deuxième semaine de
    suite ». Elle exige donc que la période précédente soit un « oui » **et que celle d'avant n'en
    soit pas un** : le signal marque le passage d'un geste à une habitude, puis se tait — ce que
    « jamais au-delà de deux » veut dire. La phrase existe aussi en quatre formes et non deux, même
    raison que les deux écarts précédents (la boucle mensuelle couvre deux postes).
14. **`checkinOui.mensuel[1]` dit « Une fois autrement » et non « Un voyage autrement »** (C2.12,
    11/09/2026). Même raison que les écarts 11 et 13 : la boucle mensuelle couvre les voyages **et**
    les sorties du week-end depuis C2.6. Les deux autres variantes mensuelles ne nomment aucun poste,
    donc seul ce mot change ; `checkinSansObjet`, lui, les nomme tous et reste indexé par poste.
    La dérivation se nomme `variantePourLaPeriode(variantes, periodStart)` et non
    `repliqueDeCheckin(issue, periodStart)` : les tableaux vivent sous une clé de boucle ou de poste,
    donc c'est `repliqueDuPoint` qui choisit la clé et délègue le tirage.
15. **La troisième réponse hebdomadaire dit « Pas de trajet la semaine dernière »**, pas « cette
    semaine » (contre-lecture de la vague 5, 13/09/2026). §3.2 écrit « Pas de trajet cette semaine » —
    rédigé avant que C2.3 ne fasse reculer la période interrogée d'une semaine. La question posée
    juste au-dessus du bouton ouvre par « La semaine dernière », et la moitié mensuelle de la même
    ligne du canvas nomme déjà le mois **écoulé** (« Pas de voyage en septembre ») : les deux moitiés
    ne désignaient pas la même période. Un test épingle l'invariant — le bouton et la question parlent
    de la même période — plutôt que la phrase, pour qu'il survive à une reformulation.
16. **La carte d'ouverture ne prend pas la place d'un point en attente** (C2.8, 13/09/2026). §5 dit
    « elle se tient à la place du point » ; le lien du rappel pointe `/plan`, donc masquer la question
    revient à faire ouvrir une notification sur un écran qui ne la porte pas — le défaut exact que le
    test sur appareil du 09/09/2026 a trouvé (`v1-12` §8.1), et la promesse rompue à l'endroit même où
    elle se tient. Deux semaines de points perdus pour qui ne touche pas les boutons de la carte. Elle
    se pose donc **au-dessus** du titre du plan et remplace la **carte d'attente** : Ramille parle
    déjà sous la carte d'ouverture, et deux fois dans le même écran ferait du bruit.
17. **Le récapitulatif ne nomme aucun poste** (C2.8). Le canvas écrit « … changé quelque chose **sur
    ton trajet** » ; `recapDeLaPeriode` ne filtre pas sur `loop_type` et compte donc les deux boucles,
    ce qui rendrait la phrase fausse pour quelqu'un dont les changements sont des voyages — même
    fausseté lisible que celle retirée par C2.6. Le chantier v1-13 écrivait déjà la version courte
    (« M fois où tu as changé quelque chose »), c'est elle qui est retenue.
18. **Deux cas que le canvas ne dessine pas, et une dérivation pour les porter** (C2.8). Les boutons
    « Reprendre la même action » / « Choisir une autre » supposent une action engagée et reconduite.
    Rien d'engagé (personne ne s'était engagé la saison passée, ou la reconduction n'a pas trouvé son
    gabarit) : « Reprendre la même action » ne nomme rien, et la carte propose « Choisir une action ».
    Plan sans action — **tout cycliste et tout profil sédentaire depuis C2.5** : proposer d'en choisir
    une serait promettre une liste vide, et la carte n'offre que « Compris ». Une action et une seule :
    « Choisir une autre » ne mènerait nulle part, elle disparaît. D'où `sortiesDeLouverture`, testée
    par cas, plutôt qu'un ternaire dans le composant.
19. **La marque « vue » est une clé unique qui porte l'identifiant du cycle** (C2.8). §4.5 décrit
    `traceverte.saison-ouverture-vue:<plan_cycle_id>`, donc une entrée par saison, gardée à jamais et
    jamais relue — quatre par an sur un stockage dont rien ne fait le ménage. Un seul cycle peut être
    en ouverture à un instant donné, donc « la carte du cycle X a été vue » se dit exactement par « la
    dernière ouverture vue est X ». C'est le motif de la marque de l'engagement orphelin (C2.2), pour
    la même raison.
20. **La carte du cap se rend même sans cap, et la puce « Cadence » disparaît** (C2.8). Le canvas met
    « Automne 2026 » dans la carte du cap sur un écran qui ne porte pas la puce ; les garder tous les
    deux nommerait la période à deux endroits de l'écran, ce qui est le plus sûr moyen de les voir un
    jour se contredire — et « Cadence : … » disait la chose dans un vocabulaire de réglage. La carte
    devient donc l'endroit où la période se nomme, et se rend même quand `capKg` est nul
    (`baseline_co2_kg_year` peut valoir zéro : un profil sans émission sur son poste dominant).
21. **Le bandeau de bascule garde la seconde phrase de C2.2** (C2.8). Le canvas dit « L'hiver a
    commencé pendant que tu étais là. » + « Voir la saison » ; entre minuit et le passage du cron
    nocturne, le cycle suivant n'existe pas encore, donc relire ne trouve rien de plus et le lien
    aurait l'air mort. « Ton prochain plan arrive ; en attendant, voici où tu en étais. » reste, et
    c'est elle qui le rend honnête. La saison nommée est celle **du jour** et non celle du cycle
    suivant, pour la même raison.
22. **Le trait de temps n'est pas plein le dernier jour de la saison** (C2.8). `period_end` est le
    dernier jour **inclus**, donc la saison dure 91 jours et non 90 : au matin du 30 novembre, 90 sont
    derrière et il en reste un. Le trait n'atteint 1 qu'une fois la période révolue — c'est-à-dire au
    moment où le bandeau de bascule prend le relais. Remplacer ce « + 1 » par un calcul d'écart entre
    bornes ferait afficher « plein » un jour trop tôt.
23. **Le nom du gaz quitte la ligne qui porte deux nombres** (C2.7, 13/09/2026). §3.2 écrit
    « 2,1 t → 1,7 t » et « 0,3 t de moins que ton bilan de mars » ; `formatTonnes` ajoute « CO₂e »,
    ce qui donnait « 2,1 t CO₂e → 1,7 t CO₂e » sur une ligne et faisait s'intercaler le gaz entre le
    nombre et ce qu'il qualifie dans la phrase. D'où `formatTonnesNu` (`src/lib/format.ts`), même
    bascule par la même fonction interne — ce n'est pas une troisième règle d'unité. Le nom du gaz
    reste au chiffre qui se tient seul : un total, un gain, un cap.
24. **« Le palier que tu visais est derrière toi. » ne s'affiche que quand il est prouvable** (C2.7).
    Le palier visé se recalcule depuis le cap **d'alors**, et ce cap est perdu quand les deux bilans
    tombent dans la même période : `generate_plan_cycle_for_user` réécrit le cycle courant à chaque
    soumission, et l'ancienne baseline n'est nulle part. Avec le cap d'aujourd'hui — plus petit, la
    baseline du poste dominant ayant baissé — le palier recalculé serait plus proche du total
    précédent et la phrase s'afficherait plus souvent qu'elle ne le devrait.
25. **« Ton bilan précédent » se met au-dessus de « Toi, aujourd'hui », et l'échelle l'inclut**
    (C2.7). §3.2 place la barre-contour « au-dessus de "Toi, aujourd'hui" et "Moyenne en France" » ;
    le domaine des barres était `max(toi, moyenne)`, donc la barre du bilan précédent dépassait la
    carte exactement dans le cas d'un re-bilan réussi — le précédent est plus lourd, et c'est ce
    qu'on vient montrer. Le libellé « Toi » devient « Toi, aujourd'hui » **seulement** quand la barre
    d'avant est là : sinon les deux se disputeraient le même sujet.
26. **« Je vois la différence. » ne se dit que sur une baisse réelle** (C2.7). §3.1 la donne sans
    condition ; au-dessus d'une hausse, ou d'un écart qui tient dans l'imprécision des facteurs et
    des réponses, elle serait une fausseté lisible — et c'est celle qui se remarque le plus, puisque
    la personne connaît son propre chiffre. Le seuil est `estStable`, partagé avec les deux phrases
    de variation.
27. **La liste des points est groupée par saison avec un total par groupe** (C2.7). §3.2 donne
    « Automne 2026 · 11 points » + « Voir tout » ; l'écran tronquait à huit **en silence** sous un
    compteur global qui en annonçait davantage. Chaque groupe porte son vrai total, ce qui est la
    seule façon que l'en-tête et la liste comptent la même chose même tronquées. Et les trois
    libellés passent au même niveau typographique : « Changement fait » en accent au-dessus d'un
    « Pas cette fois » en tertiaire classait des réponses dont aucune n'est un échec.
28. **La phrase de mobilité contrainte se rend en plus de la comparaison, pas à sa place** (C3.1,
    13/09/2026). §3.2 la donne comme la phrase de la variante « mobilité contrainte » de la planche E ;
    `comparisonNote` ne parle qu'en **relecture** — en mode `nouveau`, `palierNote` occupe cette ligne
    —, donc la loger là seul aurait fait qu'un profil concerné ne la voie jamais à la sortie du
    questionnaire, c'est-à-dire à l'endroit précis où la barre vient d'être retirée. Les deux chemins
    sont gardés l'un par l'autre pour qu'elle ne soit jamais dite deux fois. Et `mobility_constrained`
    à `null` — tout l'historique d'avant l'increment 6 — **montre** la barre : ne pas savoir n'est pas
    une contrainte.

## 11. Tests

- Jest : `checkin.test.ts` (table de cas partagée avec le SQL : quatre `question_kind`, deux
  boucles, jours nommés ; `repliqueDeCheckin` déterministe ; `estDeuxiemeFoisDeSuite`) ;
  `saison.test.ts` (douze mois, bornes, libellés, `recapDeSaison` ; puis, depuis C2.8, la fin de
  période — le « 1er », les caractères de la date et non un `Date` —, la progression bornée à [0, 1]
  qui traverse un changement d'heure sans dériver et n'est pleine qu'une fois la période révolue, la
  fenêtre d'ouverture au jour près, les quatre sujets de récapitulatif et les trois façons de ne pas
  dire zéro, les quatre cas de `sortiesDeLouverture`) ; `mascotte.test.ts` sur chaque
  variante et chaque clé nouvelle ; `mascot.test.ts` (accessoires : lisibilité ≥ 28 px, rien sous
  28, dans la silhouette ou découpé, conformité aux chemins, rendu identique sans saison) ;
  `suivi.test.ts` (écart par poste, groupement par saison, prédécesseur strict, jour **local** de
  `keepLatestPerDay` — qui n'éprouve quelque chose que hors d'UTC, d'où la suite en
  `TZ=Europe/Paris`) ; `palier.test.ts` (`palierEstDerriere`, dont le cas « cap d'alors inconnu ») ;
  `format.test.ts` (`formatTonnesNu` dit exactement ce que `formatTonnes` dit, sans le gaz) ; `plan.test.ts`
  (forme insérable, deux en avant / le reste, `reconduit`).
- pgTAP : question figée (changer l'engagement après ne change pas `committed_question`) ; les
  trois `response_kind` et les vues qui les lisent ; archive et reconduction ; `p_replace` ;
  gabarits sans `question_template` nul ; `season_bounds` cité par le test Jest ; `checkins_consecutifs`.
- Appareil : un point répondu qui reste jusqu'au lundi suivant ; une ouverture de saison rejouée
  en changeant la date de l'appareil ; le bonnet sur le plan, le suivi et l'onboarding, en clair
  et en sombre ; la carte de partage sans saison.

## 12. Ordre de livraison

Voir `v1-13` §2.3. En bref : le socle (C2.14, C2.6), le serveur (C2.3, C2.5, C2.2, C2.11, C2.9),
puis la chaîne du point dans `checkin-card.tsx` (C2.1 → C2.4 → C2.10 → C2.12), puis la saison et
le suivi — annoncés en parallèle, enchaînés en pratique : le relevé de fichiers du 13/09/2026 (v1-13
§2.3) ne trouve qu'un chantier disjoint, C2.13, et l'ordre retenu est **C2.8 → C2.7 → C3.1 → C4.6 →
C2.13 → C3.9**.

## 13. Ce que CLAUDE.md devra dire ensuite

Quand le lot 2 sera livré : que le point connaît l'action et accepte trois réponses lues par
`response_kind` ; que la question est figée à la génération et composée d'un seul endroit écrit
deux fois ; que l'engagement s'archive et se reconduit, jamais ne se détruit ; que la saison a une
ouverture locale à l'appareil et une fin sur le cap ; que `src/types/saison.ts` est le miroir de
`season_bounds` ; que la mascotte porte un accessoire par saison, calculé, jamais sous 28 px,
jamais sur la carte de partage ; et que le design system vit dans `docs/design/design-system/`
avec le skill `ramille-design`, le code restant la vérité.
