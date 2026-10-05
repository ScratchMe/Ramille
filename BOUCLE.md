# BOUCLE.md — les points de suivi, leurs réponses et leurs rappels

> **Quand ouvrir ce fichier.** Toucher aux points de suivi (`engagement_checkins`, les deux
> générateurs, la question, la réponse, la carte du point) · toucher à une moitié d'une paire
> SQL/TypeScript de la boucle (`mois_francais`, `jours_francais`, `periodePrecedente`,
> `reminder_channel_for`…) · décider qui reçoit quelle boucle · toucher aux rappels : le canal,
> `notification_outbox`, l'envoi, le mot de la veille, l'espacement, la désinscription, le jeton
> d'appareil.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier est l'un des cinq fichiers de sujet sortis de la section Architecture de `CLAUDE.md` le
01/10/2026 — `BILAN.md`, `PLAN.md`, `BOUCLE.md`, `COMPTE.md`, `MESURE.md`. `CLAUDE.md` pesait alors
177 Ko, dont 144 pour l'architecture, chargés à chaque session pour des briques qu'on ne touche
qu'une à la fois. Les paragraphes sont venus **tels quels**, à leurs renvois et à quelques faits périmés près, regroupés par thème ; quand
l'un d'eux dit « `CLAUDE.md` a écrit… », c'est là que l'erreur avait été écrite. Tout ici est
propre à Ramille : les leçons qui voyagent vivent dans les fichiers d'outil (`SUPABASE.md`,
`TESTING.md`, `EXPO.md`, `VERCEL.md`) et dans `FRONT.md` §1.

L'action qu'un point referme est dans `PLAN.md` ; ce que l'écran fait de la session, du jeton
d'appareil et de la feuille des rappels est dans `FRONT-SESSION.md` §2.7.

---

## 1. Les deux boucles, et qui reçoit laquelle

La boucle mensuelle (brique 4) est en réalité **deux boucles indépendantes**, toutes deux
proposées à tout utilisateur concerné (l'UI recommande de se concentrer sur le poste
dominant sans jamais fermer l'autre) : une hebdomadaire ancrée sur le trajet domicile-travail
(`loop_type = 'commute'`, générée par `generate_commute_checkins()`) et une mensuelle ancrée
sur le poste "extras" — loisirs ou voyages, quel que soit celui qui pèse le plus, même
départage que la décision dominante du bilan, **sauf pour qui sort rarement, interrogé sur ses
voyages** (27/09/2026, paragraphe de C2.5 juste en dessous), **et sauf quand une action est engagée sur
l'un des deux, qui décide alors** (30/09/2026, `v1-27` §12.25) (`loop_type = 'extras'`, générée par
`generate_extras_checkins()`). **Les deux partent du dernier bilan valide — celui du plan —, choisi
avant de filtrer sur le trajet ou la base déclarée** (30/09/2026, `v1-27` §12.21) : filtrer
d'abord faisait reprendre la main à un ancien bilan dès que le nouveau n'en avait plus. **Pour les
boucles, ce choix et les deux filtres vivent en un seul endroit, `boucles_du_dernier_bilan`**
(`v1-27` §12.22), que lit aussi l'écran du plan par `mes_boucles_a_venir` — les boucles une par
une : sans boucle, Ramille ne promet rien, ni la carte d'attente, ni la carte des deux lieux, ni la
carte d'un point répondu dont la boucle s'est arrêtée, ni la félicitation d'un plan sans action
(§12.25) — et le suivi, qui les lit aussi, ne parle pas de réponses (§12.23). Le plan, lui, porte le même choix écrit autrement
(`generate_plan_cycle_for_user`) — une copie connue, sur laquelle la fonction s'aligne. Les deux écrivent dans la
même table `engagement_checkins`
(contrainte `unique(user_id, loop_type, period_start)`), partent des libellés figés par le calcul
(`recompute_assessment_results`) sur `assessment_results.commute_poste_label` /
`.extras_poste_label` — que la boucle mensuelle remplace par le nom du poste, sans mode, quand elle
interroge un autre poste que le plus lourd (sorties rares, action engagée) ou le résiduel des
sorties rares —, et sont plannifiées par `pg_cron` séparément (lundi 6h pour la boucle
hebdo, 1er du mois 6h pour la boucle mensuelle). Voir
`docs/architecture/v1-02-boucle-engagement.md`.

**Le cycliste, le piéton et les loisirs rares ne reçoivent pas la même boucle** (C2.5, arbitrage D5,
`20260912140000_qui_recoit_quelle_boucle.sql`). Quatre choses à connaître avant d'y toucher :

- **C'est la catégorie du mode qui décide de la question de maintien, jamais le CO₂.** Le chantier
  proposait `commute_main_leg_co2_kg_year = 0` ; ce critère est faux depuis les facteurs ACV —
  `marche` vaut 0 mais `velo` 0,00017 et `trottinette` 0,0249 — donc il n'attraperait que les
  piétons et laisserait les cyclistes recevoir chaque lundi une question dont la seule réponse
  honnête est « Non ». `engagement_checkins.question_kind` (`changement` | `maintien`) et `.mode`
  sont **deux** colonnes parce que ce sont deux faits : le genre, que C2.1 fera grossir, et le mode
  qui remplit le texte. La catégorie `velo_marche` compte `velo`, `marche`, `trottinette` et,
  depuis C4.4, `velo_electrique` : en ajouter un impose un complément dans
  `public.complement_de_maintien` **et** dans sa jumelle `src/types/checkin.ts`, sinon il reçoit
  « autrement » en silence des deux côtés. Un test pgTAP épingle la liste, **et c'est lui qui a
  rattrapé C4.4** — le compte ne s'écrit plus ici, il se lit en base. La réplique du « Non » se
  choisit, elle, par `varianteDeMaintien` : le vélo à assistance partage l'identité du vélo
  (« Le vélo reste ton trajet »), là où la question garde son complément exact.
- **Le « Non » d'un maintien ne reçoit jamais `checkinNon`** : cette réplique console d'un échec, et
  répondre « non » à « ton trajet s'est-il fait à vélo ? » n'en est pas un. D'où `maintienNon`, en
  visage `calm`. Le choix vit dans `repliqueDuPoint`, avec son test — jamais en ternaire dans la
  carte.
- **Le mode par défaut des loisirs « rarement » est un résiduel de calcul, et il ne nomme plus
  rien.** Le calcul reste (D5, spec §5 : 15 km, 0,25 fois par semaine) mais ses conséquences
  partent : `extras_poste_label` **et** `dominant_poste_label` disent « Loisirs du week-end
  (occasionnels) », `dominant_poste_mode` est nul (sans quoi la restitution écrivait « Tes loisirs
  du week-end **en voiture** »), et `estimate_action_savings` refuse les gabarits `leisure` — une
  action « faire une sortie sur trois à vélo » sur des sorties jamais déclarées. Les deux libellés
  partagent le mot parce que leur condition est **le même test** (`v_leisure_co2 >= v_travel_co2 ×
  0,95`), donc ils ne peuvent pas se contredire. Conséquence à connaître : **tout cycliste et tout
  profil sédentaire a désormais un plan à zéro action** — l'écran le félicite, ce qui est juste,
  en nommant le poste **sauf** quand c'est ce résiduel, que la personne n'a pas déclaré et sur
  lequel aucune boucle ne porte (`felicitationDuPlanSansAction`, `v1-29`) ; la carte du cap
  s'affichait encore au-dessus, relevé pour C3.8. Et si `household_vehicles = '0'`, le résiduel passe en **train** et non en bus :
  à 0,1224 kg/km le bus ne vaut que 14 % de moins qu'une thermique en ACV, la correction aurait été
  un non-événement (A7-13).
- **La boucle mensuelle demande une base déclarée**, sinon elle n'est pas générée :
  `extras_poste_label` est calculé sans condition, donc sans ce filtre un profil qui a répondu sortir
  rarement et n'avoir pris ni vol ni long trajet recevait chaque mois une question sur des
  déplacements qui n'existent que dans le résiduel. `generate_extras_checkins` joint donc
  `assessment_answers` — en production un bilan `completed` les porte toujours
  (`recompute_assessment_results` lève sans elles), ce sont les **fixtures de test** qui s'en
  passaient. Et un bilan à zéro nomme le poste où quelque chose est déclaré : plus de
  « Trajet domicile-travail () ».
  **Ce filtre énumère les compteurs de voyages, et depuis le 27/09/2026 il ne les énumère plus
  qu'à un endroit : `public.a_des_voyages_declares(assessment_answers)`**, que lit aussi le cas
  du bilan à zéro de `recompute_assessment_results` (`v1-27` §5). Ajouter une réponse de voyage au
  questionnaire impose donc d'y ajouter sa ligne — pour la question « a-t-il déclaré un voyage ? »,
  et nulle part ailleurs pour celle-là ; son terme de CO₂, lui, reste à écrire dans le calcul, comme
  la colonne et l'écran. La liste avait déjà coûté
  un défaut — relevé en contre-lisant C4.4, qui avait livré l'autocar sans : un profil dont les
  seuls longs trajets sont en car avait un poste réel, un plan portant « Remplacer un de tes longs
  trajets en autocar par le train », et **aucun point mensuel**, donc jamais la question que cette
  action existe pour refermer. Ce qui l'a trouvé n'est pas une relecture du diff mais le fait de
  **jouer les deux crons de 6 h** sur un profil neuf. Ce qui garde un cinquième compteur oublié est
  le balayage de `33_deux_extractions_neutres.test.sql`, qui prend chaque colonne `_per_year` sans
  la nommer — un compteur nommé autrement lui échapperait ; l'assertion de `20` ne garde que le
  chemin de l'autocar. C'est la même forme que le
  défaut de la soumission du bilan trouvé le même jour : une liste de réponses écrite à la main, qui
  se périme en silence.
- **Et une fois ce filtre passé, qui sort rarement est interrogé sur ses VOYAGES, jamais sur le
  résiduel** (arbitrage du 27/09/2026, `20260927191009_la_boucle_mensuelle_de_qui_sort_rarement.sql`).
  Le filtre laissait passer dès qu'un voyage était déclaré, et le poste retenu était
  `extras_poste`, le plus lourd des deux : un long trajet en train par an (2,3 kg) contre un résiduel de
  55,5 kg, donc chaque mois « … pour tes sorties du week-end ? » à quelqu'un qui a dit ne presque
  jamais sortir, et jamais une question sur le voyage qu'il a déclaré. Le poste de la boucle vaut
  donc `travel` pour « rarement », et **trois choses le suivent ensemble** : la question, la
  colonne `poste` du point (d'où le troisième choix « Pas de voyage en … ») et l'action engagée
  qu'on cherche — une action de voyage engagée referme désormais sa question même quand le
  résiduel pèse plus. **Cette règle vaut pour la question générique** : une action engagée passe
  devant (30/09/2026, §2), et le libellé du résiduel n'est jamais repris sur un point. **La bascule vit dans la boucle et non dans `assessment_results`**, et c'est
  la moitié à ne pas « simplifier » : `extras_poste_label` reste le plus lourd des deux, parce que
  l'app y lit le marqueur « (occasionnels) » pour reconnaître le résiduel ; déplacer la règle dans
  le calcul ferait dire « tes loisirs du week-end » à l'étiquette de la restitution. Quatre
  mutations en tête de `20` disent laquelle de ces moitiés chaque assertion garde.

## 2. Le point : la période, la question, la réponse

**Le point interroge la période ÉCOULÉE, pas celle qui commence** (C2.3, 11/09/2026) :
`generate_commute_checkins()` pose `period_start` au lundi **précédent**, `generate_extras_checkins()`
au mois précédent, et la question s'ouvre sur la période — « La semaine dernière, as-tu changé de
mode de transport pour ton trajet domicile-travail ? », « En septembre, … » (le mois écoulé est
**nommé**, il ne se dit pas « le mois dernier »). **Le moment d'envoi, lui, n'a pas bougé** : cron
le lundi 6 h et le 1er à 6 h, étalement du `send_after` inchangé (v1-12 §2.8) — c'est la période
interrogée qui recule, et confondre les deux ferait « corriger » le générateur dans le mauvais
sens. Avant, le push partait quand la semaine avait quelques heures : la seule réponse honnête
était « Non », suivie de la consolation d'échec.
Le nom du mois vit dans `public.mois_francais(date)`, appelée par le libellé de période **et** par
la question — deux copies d'une liste de douze chaînes divergent par une faute de frappe que
personne ne relit. Sa jumelle client est `MOIS_FRANCAIS` (`src/types/checkin.ts`), épinglée par un
test : `toLocaleDateString('fr-FR', { month: 'long' })` aurait évité la copie, mais Hermes peut
être construit sans ICU complet et rend alors un mois en anglais — invisible en CI, visible sur
l'appareil, dans la seule phrase qui doit correspondre mot pour mot à la notification qu'on vient
d'ouvrir. Elle lit les **caractères** de `period_start` et jamais un `Date` : `new Date('2026-09-01')`
est minuit UTC, donc août à l'ouest de Greenwich.

**Tout ce que la carte d'un point affiche nomme la période INTERROGÉE, bouton compris** (contre-lecture
de la vague 5, 13/09/2026). C'est le corollaire de C2.3 qu'il est le plus facile de manquer, parce que
les textes ne sont pas écrits au même endroit : deux d'entre eux nommaient encore la semaine **qui
commence**, celle dont le point ne demande rien.
- **Le troisième choix disait « Pas de trajet cette semaine »** sous une question qui ouvre par « La
  semaine dernière ». C'est la copie du canvas, rédigée avant que la période interrogée ne recule — et
  sa moitié mensuelle nommait déjà le mois **écoulé** (« Pas de voyage en septembre »), donc les deux
  moitiés d'une même ligne ne désignaient pas la même chose. Écart consigné en `v1-14` §10.
- **Le repli de `{jours}`** (un gabarit d'engagement sans jours figés) disait « Cette semaine » dans
  `checkin_question` **et** dans `composerQuestionDuPoint`, à quatorze lignes de l'ouverture correcte
  que la même fonction venait de calculer. Le correctif n'écrit pas la bonne chaîne : il fait **lire
  la variable déjà calculée**, pour qu'il n'y ait plus deux littéraux à tenir d'accord. La branche est
  défensive aujourd'hui (`commit_plan_action` exige des jours sur le poste domicile-travail, et les
  gabarits mensuels ne portent pas `{jours}`), et c'est justement pour ça qu'elle valait d'être
  corrigée : une phrase fausse que rien n'exerce attend la troisième forme d'intention qui la rendra
  atteignable.
Les deux gardes qui restent sont écrites sur l'**invariant** et non sur la phrase — le repli et le
générique ouvrent sur la même période, et le bouton nomme la période de la question — donc elles
survivent à une reformulation.

**Le gabarit de question n'arrive jamais jusqu'à la carte, et c'est structurel** : `question_template`
vit sur `action_templates`, pas sur le point, donc aucune requête de l'app ne peut le remplir. La
branche à gabarit de `composerQuestionDuPoint` est inatteignable côté client et n'existe que pour
rendre la composition **éprouvable** face à sa jumelle SQL. Corollaire : le seul chemin client qui
compose est celui d'un point d'avant C2.1, qui retombe donc toujours sur la question générique — ce
qui est exactement le libellé sous lequel ce point-là est parti. `committed_intention_days` n'est pour
cette raison **pas** rapatrié par l'écran du plan : il ne remplirait que cette branche.

**La question du point a une seule source côté client, `src/types/checkin.ts`** (C2.5, 11/09/2026),
et c'est la moitié d'une paire avec `enqueue_checkin_reminders` — le rappel part sans le client, la
carte repose la question avec lui. `checkin-card.tsx` l'écrivait lui-même, au présent et avec le
libellé snapshoté : la notification disait « La semaine dernière, as-tu changé de mode de transport
pour ton trajet domicile-travail ? » et l'écran « As-tu changé de mode de transport au moins une
fois cette semaine pour Trajet domicile-travail (Voiture thermique) ? ». Sur un produit dont la
boucle consiste à appuyer sur la notification pour répondre, ce n'est pas une variante de
formulation : c'est la même question qui ne se reconnaît pas d'un écran à l'autre. C2.1 a étendu ces
deux endroits plutôt que d'en ouvrir un troisième, et C2.4 fera de même pour la troisième réponse.

**Quand une action est engagée, la question la nomme — et elle est figée à la génération** (C2.1,
`20260912190000_point_connait_laction.sql`). « As-tu changé de mode de transport ? » posée à
quelqu'un qui s'est engagé à « faire un trajet sur cinq à vélo le mardi et le jeudi » ne referme
pas le « si-alors » qu'il a écrit : elle lui demande un résumé de sa semaine. La phrase vient
désormais du gabarit, `action_templates.question_template` (« {jours}, as-tu fait ce trajet à
vélo ? », « En {mois}, … » pour la boucle mensuelle). Six points à connaître :

- **`engagement_checkins.committed_question` est la question elle-même, figée**, comme `trip_label`
  fige le libellé. Elle est posée une fois, au moment de la génération, et `enqueue_checkin_reminders`
  comme la carte la lisent telle quelle — c'est la seule façon qu'elles ne puissent pas différer
  d'un caractère. Corollaire voulu : **changer d'action après la génération ne réécrit pas la
  question déjà posée**, et la carte le dit (« Cette question porte sur l'action que tu suivais
  alors : … »), plutôt que d'afficher une phrase qui ne correspond plus à rien. Recomposer à
  l'affichage rendrait le point incohérent avec la notification qu'on vient d'ouvrir.
- **Les quatre genres sont `engagement` | `generique` | `maintien` | `occasion`** — l'ancien
  `changement` a été renommé `generique`, parce qu'il ne décrit plus le cas général mais le
  **repli** : un gabarit sans `question_template` y retombe, jamais sur une phrase à trous. Le
  genre et le mode restent deux colonnes pour la raison de C2.5, et **`maintien` gagne sur
  `engagement`** : en pratique un cycliste a un plan à zéro action (effet de bord de C2.5), mais la
  priorité est explicite et testée plutôt que dépendante de ce hasard.
- **L'action retenue est celle du cycle qui couvre la période interrogée, appariée par poste** —
  `'commute'` pour la boucle hebdomadaire, le poste de la boucle pour la mensuelle (`travel` pour qui
  sort rarement depuis le 27/09/2026, §1). Sans l'appariement, une action engagée sur les
  loisirs aurait nommé la question du trajet domicile-travail. **Et depuis le 30/09/2026, c'est la
  boucle mensuelle qui se règle sur l'action** : engagée sur les sorties ou les voyages, le point du
  mois porte sur ce poste-là, même quand l'autre pèse plus (`v1-27` §12.25, test `40`) — sans quoi
  la feuille promettait « je reviens te demander si tu l'as faite » à une action jamais interrogée. **La recherche vit en un seul endroit
  depuis le 27/09/2026**, `public.action_engagee_de_la_periode(user_id, poste, period_start)`, que
  les deux générateurs et, depuis C4.2, `engagement_de_la_veille` appellent : elle **reçoit** le
  poste, elle ne le choisit pas — c'est la boucle qui décide sur quoi elle interroge (`v1-27` §5,
  test `33`). Elle rend aussi `plan_action_id` depuis C4.2, en dernière colonne : le mot de la veille
  a besoin de la ligne retenue (son cycle, sa reconduction), et la première version qui recopiait la
  jointure pour l'obtenir est tombée au balayage de `33`.
- **`public.jours_francais(smallint[])` est la jumelle SQL de `JOURS_FRANCAIS` / `joursDeLaQuestion`**
  (`src/types/checkin.ts`), **donc à toucher ensemble**, exactement pour la raison de `mois_francais`
  en tête de cette section. Elle joint par « ou » et non par « et » (l'intention est un choix de
  jours, pas un cumul), ne capitalise que la première lettre — `initcap` sur la liste jointe
  donnerait « Mardi Ou Jeudi » — et rend « Tous les jours » à sept jours plutôt que de les énumérer.
- **La notification ne préfixe le poste que si la question ne le nomme pas déjà.** La question
  générique finit par « … pour ton trajet domicile-travail ? » : y coller l'étiquette répétait le
  poste dans la même notification. Le `push_body` teste donc `position(etiquette in question)`.
- **La composition n'est appelable que côté serveur** : `checkin_question` et `jours_francais` sont
  révoquées de `public, anon, authenticated`. Le client ne compose que pour les points générés
  **avant** C2.1, dont `committed_question` est nul — d'où `questionDuPoint`, qui préfère toujours la
  question figée.

**Une action choisie pour « Le mois prochain » n'est pas interrogée avant ce mois-là** (`v1-33` D14,
02/10/2026, `20261002210553_la_question_du_mois_attend_le_mois_choisi.sql`, test `43`). Choisie en
octobre, elle vise novembre : le point du 1er novembre, qui interroge octobre, lui demandait « En
octobre, as-tu fait… ? », dont la seule réponse honnête est « Non ». Tant que le mois interrogé n'est
pas **postérieur** au mois du choix, le point pose la question générique et ne retient pas l'action
(`committed_*` nuls) ; le poste, lui, suit toujours l'action. Trois bornes à ne pas défaire :
« postérieur » et non « différent », parce que `action_engagee_de_la_periode` ne borne pas
`committed_at` (une action choisie le 1er à 0 h 30, avant le passage de 6 h, est retrouvée par le
point qui interroge le mois d'avant) ; le mois du choix lu en **heure de Paris** ; et `committed_at`
recopié à la reconduction, qui garde la règle d'une saison à l'autre. **C'est une paire** : la
feuille ouverte après « C'est noté » nomme le mois du premier point qui interroge l'action (« Début
décembre, je reviens te demander si tu l'as faite », `ligneDAttenteDeLaFeuille`,
`src/types/rappels.ts`). Toucher à l'une sans l'autre refait une promesse fausse. **Et la règle lit
`committed_at` comme le jour où l'échéance a été choisie** — vrai tant que `commit_plan_action` le
remet à `now()` à chaque engagement **et à chaque modification**. D15 (« Modifier l'échéance » sans
libérer, livré le même jour) le garde vrai : une vraie modification remet `committed_at` à maintenant ;
une intention identique ne le touche pas, et une échéance relative n'est identique que redite le mois
où elle a été choisie — « Le mois prochain » redit le mois suivant vise un autre mois, et s'écrit
(`PLAN.md`).
Sinon « Ce mois-ci » choisi en septembre, changé en « Le mois prochain » en octobre, serait interrogé
le 1er novembre sur octobre. La carte engagée et le suivi lisent la même date pour dire le mois visé
(« en novembre », `formatIntention`).

**Quand deux points sont ouverts, l'accent de la carte va à celui qui porte la question de l'action
engagée** (tension tranchée le 01/10/2026, `v1-33` §6) — son genre, `engagement` ou `occasion`, figé à
la génération, **et l'action suivie aujourd'hui** (`committed_action_text`) : une question composée sur
une action qu'on a quittée depuis ne referme plus rien, et ne prend pas l'accent. Sans engagement, avec
un seul point ouvert, ou sans point qui porte l'action suivie, la règle du 27/08/2026 : le poste
dominant. Depuis le 30/09/2026 la question du mois suit l'action, et celle qui refermait
l'engagement pouvait être la grise. La dérivation est `accentDesPoints` (`src/types/checkin.ts`) ; la
carte ne décide rien.

**Un point se répond par « oui », « non » ou « sans objet », et `response_kind` est la vérité**
(C2.4, `20260912200000_troisieme_reponse_du_point.sql`). Une semaine de congés ou un mois sans voyage
n'ont pas de réponse honnête entre oui et non : « Non » déclenche la consolation d'échec et s'inscrit
en « Non » dans le suivi, ne rien répondre laisse le point expirer — ce qui compte pour une occasion
manquée **et** fait s'espacer les rappels (C2.9). Pour un profil « deux vols par an », dix mois sur
douze devenaient une suite de « Non ». Six points à connaître :

- **Le piège n'était pas la valeur nulle, c'était le filtre qui la lisait.** `response boolean`
  reste, **dérivée** (`true` / `false` / `null`), et `loadAnsweredCheckins` écartait les lignes dont
  elle est nulle : la troisième réponse aurait été donnée puis perdue, sans message d'erreur et sans
  rien afficher dans le suivi. Tout ce qui compte « les points répondus » filtre donc
  `status = 'answered'` et lit `response_kind` — **jamais `response is not null`**. C'était déjà le
  cas de `recapDeSaison` (C2.14, qui l'avait anticipé) et de `regime_de_rappel` (C2.9, où un
  « sans objet » est un **signe de vie** : l'assertion est dans `24`, et sans elle quelqu'un qui
  répond honnêtement quatre fois verrait ses rappels s'espacer comme s'il avait disparu).
- **La dérivation est une contrainte, pas une convention**
  (`engagement_checkins_reponse_coherente`), et elle porte **deux** invariants : répondu ⟺ genre
  renseigné, et la correspondance genre/booléen. Le premier est la forme structurelle du défaut :
  une ligne `answered` sans genre est une réponse que la lecture écarte. Aucun chemin de production
  ne peut la produire — le RPC est le seul écrivain — et c'est pourquoi l'écrire coûte zéro et garde
  le jour où une forme de réponse s'ajoutera (C4.1 l'aurait fait ; il est fermé pour la V1
  depuis le 27/09/2026). Corollaire pour les tests : **une fixture ne peut
  plus écrire `status = 'answered'` sans genre** (cinq fichiers corrigés), ce qui est une bonne
  chose — une fixture qui écrit un état que la production ne peut pas produire éprouve une fiction.
- **Le backfill passe sous le trigger, pas à travers.** `prevent_answered_checkin_update` lève sur
  toute mise à jour d'une ligne déjà répondue (C1.12) — sauf, depuis le 02/10/2026, la correction
  annoncée par le RPC, plus bas : le rattrapage des points historiques le
  désactive le temps de l'écriture et le réarme ensuite, et la contrainte n'est posée **qu'après** —
  l'ordre inverse ferait échouer l'`alter` sur les lignes pas encore rattrapées. Un contrôle de la
  migration vérifie que le trigger est bien réarmé : l'oublier défairait C1.12 en silence.
- **La signature du RPC change, elle ne s'ajoute pas** : `repondre_au_checkin(uuid, text)`, et la
  version booléenne est **supprimée**. Deux surcharges que PostgREST départage sur le type d'un
  champ JSON coûteraient plus que la migration, et une surcharge qu'aucun appel n'émet se lit
  « morte » et non « réservée » (la leçon de `p_replace` en C2.2). Ce raisonnement tient **parce que
  l'app n'est pas encore publiée sur Play** ; le jour où un client installé appelle l'ancienne forme,
  il faudra une seconde fonction nommée.
- **`analytics.engagement_by_segment` gagne `answered_sans_objet`**, et ce n'est pas du confort :
  `answered` compte les trois réponses et `answered_yes` les seuls « oui », donc l'écart entre les
  deux se lisait « non » et vient d'accueillir les « sans objet ». Sans le troisième compteur, le
  taux de réussite de la boucle baissait à chaque fois que quelqu'un répond honnêtement. Une
  assertion de `24` nomme l'égalité.
- **La carte répondue reste le temps de la période, et la borne se calcule en UTC.** Le
  renforcement vivait dans un `useState` : répondre, changer d'onglet, revenir, et il n'y avait plus
  rien — la requête du plan ne lisait que les points `pending`. Elle lit maintenant `pending` **et**
  `answered`, et `estDeLaPeriodeCourante` (`src/types/checkin.ts`) borne l'affichage, sans quoi un
  compte dont la boucle a cessé d'être générée garderait pour toujours un « Répondu lundi » et la
  promesse d'un point qui ne viendra pas. `debutDePeriodeInterrogee` est la **jumelle du `date_trunc`
  des deux générateurs**, donc elle lit l'UTC — à l'inverse de `saisonDe`, qui nomme une saison pour
  un humain et suit son calendrier local. Aligner l'une sur l'autre ferait disparaître la carte d'un
  point courant entre minuit et 6 h UTC le lundi. Le pied (« Répondu lundi. Prochain point : lundi
  21 septembre. ») est **du produit et non de Ramille** : il porte deux dates quand la boucle tourne — « Répondu
  lundi. » seul quand elle s'est arrêtée (`piedDuPointRepondu`, 30/09/2026) —, et elle ne dit jamais
  de nombre.

`RAMILLE.checkinSansObjet` a **quatre** variantes indexées sur le **poste** et non deux sur la
boucle, écart consigné en `v1-14` §10 : la boucle mensuelle couvre les voyages *et* les sorties
depuis C2.6, et répondre « Pas de voyage, pas de question. » à quelqu'un qui vient d'appuyer sur
« Pas de sortie en septembre » serait la fausseté lisible que ce chantier-là a retirée ailleurs.

**La réponse à un point de suivi passe par `repondre_au_checkin`, et `engagement_checkins` n'a
plus aucune écriture client** (11/09/2026, `20260911100000_reponse_checkin_rpc.sql`) : ni policy
d'écriture, ni privilège `update`. Le raisonnement est mot pour mot celui de `plan_actions`
(`PLAN.md` §2) — **la RLS filtre des lignes, jamais des colonnes** — et ce qu'une policy UPDATE
owner-scoped ouvrait ici n'était pas anodin : `trip_label` et `period_label`, les libellés
snapshotés qui existent précisément pour qu'un re-bilan ne réécrive pas un point déjà généré ;
`period_start`, la clé d'idempotence de la génération (`unique(user_id, loop_type, period_start)`
+ `on conflict do nothing`), dont la réécriture bloque ou duplique la période suivante ; `status`,
qui accepte `expired` — un point en attente pouvait disparaître de la carte du plan sans avoir été
répondu ; et `responded_at`, qui venait de l'horloge du téléphone. Le RPC pose les trois seules
colonnes d'une réponse, avec `now()` du serveur, et refuse un point clos — et un point déjà répondu
dont la période est passée (voir la correction, juste après). C'est
aussi le seul endroit où la forme d'une réponse change. **C'est arrivé dès le lendemain** : la
troisième réponse (« pas de trajet cette période ») est livrée depuis C2.4, et `p_reponse boolean`
ne pouvant pas porter un troisième état, ce fut bien une migration et non un paramètre de plus —
la signature est `repondre_au_checkin(uuid, text)`, la version booléenne **supprimée**, et le
raisonnement complet est au paragraphe de C2.4, plus haut.

**La réponse se corrige jusqu'au point suivant** (`v1-33` §6, décidé le 02/10/2026 avec la personne
qui pilote, `20261002234720_la_reponse_au_point_se_corrige.sql`, test `46`). « Non » et « Oui » sont à
8 px l'un de l'autre, et un toucher erroné était définitif. La carte répondue offre « Modifier ma
réponse », qui rouvre les trois réponses sous « Ta réponse : oui. » (`phraseDeLaReponseEnPlace`) ; la
réplique est celle de la nouvelle réponse, et « deux fois de suite » la suit, puisqu'il se dérive à la
lecture. Ce qu'il faut en savoir :

- **La borne est celle de l'affichage.** `repondre_au_checkin` réécrit un point répondu tant que son
  `period_start` est celui de la période interrogée — la formule des deux générateurs, et celle de
  `debutDePeriodeInterrogee` qui borne la carte répondue côté client : **les trois se touchent
  ensemble**. Elle tombe à minuit UTC le lundi (ou le 1er), et non à l'arrivée du point suivant, à
  6 h — qui n'arrive jamais quand la boucle s'est arrêtée. Au-delà, le refus est celui d'un point clos
  (`22023`, « déjà répondu, et sa période est passée »).
- **C1.12 tient pour tout le reste.** Le trigger n'accepte la réécriture d'une ligne répondue que sur
  une annonce du RPC — `ramille.correction_du_point`, un réglage local à la transaction, posé juste
  avant l'`update` et retiré aussitôt — et alors **seules les trois colonnes d'une réponse** changent
  (`response_kind`, `response`, `responded_at`), le reste comparé en bloc. Un backfill qui réécrit une
  ligne répondue passe toujours par le désarmement du trigger, pas par cette annonce.
- **`responded_at` repart à maintenant** : c'est l'heure de la dernière réponse, que le pied date
  (« Répondu mercredi. ») et que lisent la purge pour inactivité et l'administration — une correction
  est une activité. Elle **remplace** la première : un point du mois corrigé trois semaines plus tard
  change la semaine « a répondu » de `analytics.retention_par_cohorte`, celle d'une semaine révolue
  pouvant baisser après coup. Le statut reste `answered`, donc les rappels ne repartent pas.
- **Côté carte, la réponse donnée ici ne vaut que tant que la ligne n'a pas bougé** (`geste`,
  `checkin-card.tsx`) : une correction faite sur un autre appareil se relit sur une carte restée
  montée, et l'état local la masquait pour toujours.

**Le signal « deux fois de suite » se compte sur les PÉRIODES, et il ne se déclenche qu'une fois**
(C2.10, `20260912210000_second_renforcement.sql`). Il est dans la spec §7 comme signal d'engagement
et en §9 comme indicateur de succès, `v1-02` §4 en donnait même la requête, et il n'avait jamais été
calculé nulle part — la phrase du handoff n'a jamais été affichée à personne. Ce qu'il faut en
connaître :

- **La requête de `v1-02` §4 est périmée, et elle l'est devenue en silence.** Elle prend les **deux
  dernières lignes** de la boucle et vérifie qu'elles sont répondues ; c'était juste avant que
  `20260904180000` ne close les périodes révolues en `expired` **et les garde en base**. Depuis,
  « les deux dernières lignes » peut recouvrir deux périodes séparées de trois mois de silence. D'où
  `public.periode_precedente(loop_type, period_start)` : la période se **calcule**. Un `lag()` sur
  les lignes aurait le même défaut en moins visible — vérifié sur la fixture du test `25`, qui compte
  2 par `lag()` et 1 par période.
- **C'est une paire SQL/TypeScript de plus** (`periodePrecedente`, `src/types/checkin.ts`), à
  toucher avec sa jumelle comme `mois_francais`, `jours_francais`, `poste_inserable`,
  `reminder_channel_for` et — depuis C3.12 — `analytics.bilan_funnel` / `BILAN_STEP_ORDER`, dont
  les deux moitiés s'épinglent l'une l'autre et se nomment mutuellement en commentaire : la vue
  `analytics.checkins_consecutifs` compte côté serveur, la carte affiche côté client. Le nombre de
  ces paires ne s'écrit nulle part, et surtout pas ici — il deviendrait faux à la suivante, en
  silence. Les deux
  cadences n'ont pas la même forme et c'est voulu — sept jours avant un lundi est un lundi, tandis que
  le mois est **ramené au premier** plutôt que décalé, sans quoi les deux moitiés divergeraient sur les
  fins de mois (PostgreSQL ramène le 31 mars au 28 février, `Date.UTC` le pousse au 3 mars).
- **« Jamais au-delà de deux » veut dire que le signal ne se rallume pas.** `estDeuxiemeFoisDeSuite`
  exige que la période précédente soit un « oui » **et que celle d'avant n'en soit pas un** : la phrase
  dit « Deuxième semaine de suite », donc à la cinquième elle serait fausse, et la recevoir chaque
  semaine en ferait du papier peint. Le signal marque le passage d'un geste à une habitude, puis se
  tait. `v1-14` §4.6 décrit la dérivation à deux arguments ; il en faut un troisième état pour savoir
  qu'on est à deux et pas à cinq (écart consigné en `v1-14` §10). La phrase est **voix produit et non
  celle de Ramille** — elle constate un fait sur deux périodes, et Ramille ne compte jamais.
- **Et sur la boucle mensuelle, la série se compte sur un même poste** (décision du 30/09/2026,
  `v1-27` §12.25). Depuis que la question du mois suit l'action engagée, le point peut changer de
  poste d'un mois sur l'autre, et la phrase nomme celui du mois : deux « oui » sur deux postes
  affichaient « Deuxième mois de suite que tu sors autrement » après un mois de voyages. La vue
  `analytics.checkins_consecutifs` applique la même condition — c'est une moitié de la paire, et
  les deux se touchent ensemble.

Corollaire sur la lecture du plan : **la requête des points est bornée par une fenêtre**
(`fenetreDesPoints`, trois périodes mensuelles). Elle ne ramenait que les points `pending`, soit un ou
deux ; depuis qu'elle prend aussi les répondus (C2.4), sans borne elle ramènerait une ligne par semaine
indéfiniment. **Et depuis C2.8 elle prend aussi le début du cycle précédent, contre une coïncidence
qui aurait tenu longtemps** : le récapitulatif de la carte d'ouverture compte les points de la saison
écoulée, et trois périodes mensuelles en arrière depuis le 1er d'un mois est le 1er du mois trois mois
plus tôt — c'est-à-dire exactement le premier jour de la saison précédente. Les deux bornes tombaient
au même jour, donc l'oubli ne se serait pas vu jusqu'au jour où l'une des deux dérivations bouge (une
cadence `rolling_quarter`, elle, n'est pas alignée sur les mois et sortait déjà de la fenêtre). On
prend le minimum des deux.

## 3. Les rappels : le canal, la mise en file, l'espacement, la sortie

**Rappel par email** : `enqueue_checkin_reminders()` remplit `notification_outbox` à chaque
génération de check-in, `send_pending_reminders()` (cron quotidien 7h UTC) l'envoie via
l'extension `http`. **La garantie anti-relance de la spec §7 est structurelle** :
`unique(checkin_id)` sur la boîte d'envoi — un check-in, un message, jamais deux, quel que
soit le canal et le nombre de passages du cron ; le repli push → email est une **mise à jour de
la même ligne**, jamais une seconde. **Le mot de la veille (C4.2, `v1-25`) passe à côté** : une
ligne à `checkin_id` nul et `genre = 'veille'`, que `unique(checkin_id)` ne voit pas — sa garantie
est `notification_outbox_une_veille_par_jour`, un mot par personne et par jour visé. La branche push
vit dans `envoyer_les_notifications(genre)`, partagée par le passage de 7 h (les points) et celui du
soir (cron `mot-de-la-veille`, 16 h 30 **et** 17 h 30 UTC, pour que l'un des deux tombe à 18 h 30 à
Paris en toute saison) ; le journal porte le genre du passage. **Toute lecture de la boîte d'envoi
qui joint `engagement_checkins` perd le mot en silence** — trois le faisaient : `rappels_bloques`
et l'export sont passés en jointure externe, et la caducité, qui ne voyait que les points (à raison,
elle lit leur période), a gagné une instruction à part pour le mot. **Et le cron du soir ne met en
file qu'à partir de 18 h 30 à Paris** (`le_soir_du_mot_est_venu`) : la caducité du mot ne relit pas
l'engagement, donc un mot écrit une heure trop tôt partait sur une action abandonnée entre-temps. Le
canal effectif se résout en un seul endroit,
`reminder_channel_for()` (v1-12 §3), dont la table de vérité est **écrite deux fois** — SQL
pour ce qui part, `src/types/rappels.ts` pour ce que l'app affiche — et épinglée des deux côtés
(`17_rappels_canal.test.sql`, `rappels.test.ts`) : toucher à l'une sans l'autre est le défaut
que cette paire existe pour attraper. La préférence vit dans `profiles.reminder_channel`
(`push` / `email` / `none`, réglable depuis « Toi », **sessions anonymes comprises** — le push
n'a besoin que d'un jeton d'appareil), et elle **ne se dégrade jamais d'elle-même** : un `push`
sans jeton actif part par email sans que rien ne soit réécrit, pour que rouvrir les
notifications dans les réglages du téléphone suffise à le faire repartir. **L'envoi est inactif tant que
les secrets Vault `resend_api_key` et `reminder_from_address` n'existent pas** — la fonction
sort sans rien toucher, les rappels restent en attente, et depuis le 10/09/2026 elle le **dit** :
`public.reminder_send_runs` reçoit **une ligne par canal à chaque passage**, y compris une nuit où
rien n'attend et y compris quand un secret manque. Zéro ligne veut donc dire « le passage n'a pas
eu lieu » — cron désinscrit, job en erreur — et jamais « il n'y avait rien à envoyer » : remettre
l'un de ces `insert` sous une garde « seulement s'il y a du travail » détruirait la seule question
que ce journal existe pour trancher. Deux corollaires : le cron appelle désormais une **procédure**
qui committe entre les passes, à laquelle il ne faut ajouter ni `security definer` ni clause
`set search_path` — les deux rendent le contexte atomique et font échouer le `commit` ; et la ligne
est marquée `sent` **avant** l'appel HTTP, pour qu'un message remis au fournisseur ne reparte
jamais. Voir `v1-07` §3.1 pour la mise en
service.

**Un rappel par email ne part pas à l'instant où il est mis en file** : `send_after` porte un
décalage de 0 à 4 jours dérivé du hachage de l'identifiant (étalement du pic du lundi,
`v1-10` §2.B). Le push, lui, part à `now()`. Pour provoquer un rappel de test, passer par
`generate_commute_checkins()` puis `send_pending_reminders()` — le chemin du cron entier —
plutôt que d'insérer un point à la main.

**Les rappels s'espacent d'eux-mêmes, et ce qui s'espace est le message — jamais le point**
(C2.9, `20260912170000_rappels_qui_s_espacent.sql`). `public.regime_de_rappel(user_id, loop_type)`
rend `normal` / `espace` / `silence` en comptant les points clos `expired` **depuis le dernier signe
de vie** — le plus récent d'une réponse et d'un `app_open` —, et `enqueue_checkin_reminders()` s'en
sert dans sa clause `where`. Quatre points sans réponse font passer à **au plus un message par mois
calendaire**, tous canaux et toutes boucles confondus ; huit font taire. Ce qu'il ne faut pas
« corriger » :
- **le point continue d'être généré** — l'app doit pouvoir montrer la question à qui revient après
  six mois, et supprimer la génération effacerait l'historique de la boucle ;
- **deux seuils et non un** : sans le second, « espace » serait un **état terminal** pour la boucle
  mensuelle, qui est déjà à ce rythme ;
- le plafond du régime espacé compte sur `created_at` de la boîte d'envoi et non sur `sent_at`,
  sinon la décroissance ne s'appliquerait **pas du tout** tant que l'expéditeur n'est pas
  configuré ;
- **le plafond est une clause de la mise en file, pas de la table** : il ne s'applique qu'aux lignes
  qu'`enqueue_checkin_reminders` insère. Un message qui n'y passe pas doit appeler
  `regime_de_rappel` lui-même — le mot de la veille (C4.2) ne part qu'en régime `normal`, jamais en
  espacé (arbitrage du 27/09/2026 : le seul message du mois doit rester la question). Et l'inverse
  est automatique : le `not exists` du plafond ne filtre pas sur `checkin_id`, donc un mot parti
  compte dans le plafond des points. **Cas connu et laissé tel quel** (contre-lecture du 28/09/2026) :
  un mot parti en début de mois, puis une bascule en régime espacé dans le même mois, et la question
  de ce mois ne part pas — la même chose arrivait déjà avant C4.2 avec les rappels hebdomadaires du
  début de mois ;
- `regime_de_rappel` est `security definer` pour une raison non décorative : `usage_events` n'a
  aucune policy de lecture, donc le comptage des `app_open` ne verrait rien depuis `authenticated`
  — même piège que le garde-fou de volume de cette table, et un compteur qui ne compte rien ne
  déclenche jamais ;
- **quelqu'un qui ouvre l'app chaque semaine sans jamais répondre ne se fait jamais taire**, et
  c'est voulu : `app_open` est un signe de vie, et le chantier visait le compte **désinstallé**, pas
  le lecteur silencieux. Avec la période écoulée de C2.3, le point ouvert lundi porte un
  `period_start` d'une semaine plus tôt, donc une ouverture du lundi est toujours postérieure et le
  point ne compte pas. Corollaire rassurant : ouvrir le lien de l'email **sur un appareil où l'on
  n'est pas connecté** émet l'`app_open` de la session anonyme de cet appareil, jamais celui du
  compte — le compteur du compte n'est donc pas remis à zéro par quelqu'un qui n'y est pas entré ;
- et la mise en file est appelée **une fois par point** : le plafond mensuel est un `not exists`,
  donc deux points du même compte insérés par un seul `insert` ne se verraient pas l'un l'autre.
  Le cas n'existe pas en production (le générateur clôt la période précédente avant d'insérer, et
  les deux boucles sont mises en file par deux appels), et un test qui le fabriquerait
  n'éprouverait rien.

**La sortie ne passe pas par l'app, parce que celle-ci a justement pu être désinstallée**
(`desinscrire_des_rappels(uuid)`, page `/rappels/stop?jeton=…`). L'ancienne consigne de l'email
renvoyait à « Toi » : inutilisable sans l'app, et **pire** sur un appareil neuf, où elle réglait la
préférence de la session anonyme vide que l'ouverture venait de créer. Le jeton vit sur la ligne
d'outbox, ne sert qu'une fois, et ne peut rien d'autre que couper les rappels du compte qui a reçu
ce message-là. C'est **le seul RPC qui écrit et que `anon` peut appeler** — les autres fonctions
accessibles à ce rôle n'ont jamais été révoquées du `PUBLIC` de leur création, et sont toutes pures
(`emission_factor`, `resolve_*`, `season_bounds`, les deux `check_*`) ; ici le `grant` est explicite
et le jeton *est* l'autorisation. Trois pièges :
- **le jeton est écrit explicitement dans l'`insert`** de la mise en file. Laissé au `default` de la
  colonne, il aurait tiré un second uuid, différent de celui que le corps du message venait
  d'afficher : un lien mort au premier clic, sans qu'aucune des deux moitiés ait l'air fausse. Et la
  sous-requête qui le tire **nomme la ligne** : sans quoi le plan peut la calculer une fois pour toute
  l'exécution, et deux rappels du même passage portent le même jeton — l'index unique refuse, et le
  générateur de la semaine tombe en entier (incident du 05/10/2026, `SUPABASE.md` §1.5, `v1-27`
  §12.37) ;
- la réponse **ne distingue jamais** un jeton inconnu d'un jeton déjà utilisé (même non-divulgation
  que `/connexion/retrouver`), et la page vérifie la **forme uuid** avant d'appeler — sans quoi un
  lien tronqué par une messagerie recevrait un `22P02`, c'est-à-dire l'écran de panne et une
  invitation à réessayer un lien qui ne marchera jamais (`src/types/desinscription.ts`) ;
- **c'est une écriture sans session et sans limite de débit, et c'est le bon compromis.** Le
  `feedback` a son `enforce_feedback_rate_limit` parce qu'il stocke du texte libre ; ici il n'y a
  rien à stocker, rien à lire en retour, et la réponse ne distingue aucun échec — marteler l'endpoint
  avec des uuid au hasard ne rend qu'une recherche d'index et `false` (122 bits à deviner). Brider une
  désinscription coûterait plus que l'abus qu'on éviterait : quelqu'un qui veut arrêter de recevoir
  doit réussir du premier coup. Ne pas « corriger » cette asymétrie avec `feedback`.
- **la page demande le geste, elle ne le fait pas** (04/10/2026, décision de la personne qui pilote,
  `v1-27` §12.35). Elle appelait le RPC dès son ouverture : l'analyseur de liens d'une messagerie
  professionnelle, qui exécute parfois les pages qu'il inspecte, coupait les rappels sans que
  personne ait cliqué, consommait le jeton, et le vrai clic lisait ensuite « Ce lien n'est plus
  valable ». Le RPC ne part plus qu'au toucher de « Couper mes rappels » (`etatDeLaPage`,
  `src/types/desinscription.ts`), et `scripts/verifier-etats-export.mjs` garde les deux moitiés :
  aucun appel avant le geste, l'appel portant le jeton après. Supabase décrit le même piège pour ses
  propres liens de connexion. Ne pas « simplifier » en revenant à l'appel au montage.
- **le jeton quitte l'adresse dès qu'il est lu** (06/10/2026, seconde passe de sécurité, `v1-27`
  §12.39) : il restait dans l'historique, dans le `Referer` de nos requêtes et à portée des scripts de
  la page, celui du captcha compris. Il est gardé dans le `sessionStorage` de l'onglet, pour qu'un
  rechargement ne dise pas « plus valable » à qui n'a rien coupé, et en sort quand le serveur a
  répondu sur lui (`src/lib/jeton-de-desinscription.ts`). Le retrait passe par `router.setParams` et
  non par `history.replaceState`, que la navigation défait (`EXPO.md` §1.4).
- **`List-Unsubscribe-Post` n'est pas envoyé, et son absence est épinglée par un contrôle de la
  migration.** L'annoncer engage l'URL à accepter un POST sans confirmation ; `/rappels/stop` est
  une page de l'export statique, qui ne peut pas y répondre — l'ajouter par symétrie ferait échouer
  le geste **en silence**, là où l'en-tête seul fait ouvrir le lien dans un navigateur (RFC 8058).
  Corollaire : la branche email de `send_pending_reminders` n'évalue son corps que si les secrets
  Vault existent, donc **aucune suite ne l'exerce** — ni la CI, où ils manquent, ni le distant, où
  les rejouer ferait partir un vrai email. L'en-tête a été éprouvé en évaluant la même expression à
  la main sur une vraie ligne d'outbox.
  **Et cette décision est désormais éprouvée, pas seulement raisonnée** (15/09/2026, `v1-13` §7, C4.9).
  La recette avait constaté que Gmail n'affiche **aucun** bouton « Se désabonner » au-dessus du rappel ;
  l'expérience qui devait trancher a été faite — un message avec les **deux** en-têtes, même expéditeur
  de production, même boîte que le témoin de la veille, seule la paire d'en-têtes changeant — et il n'y
  a **toujours** pas de bouton. Donc l'en-tête manquant n'était pas la cause, et une fonction `api/`
  qui répondrait au POST n'aurait rien produit : le chantier s'est fermé sans une ligne de code. La
  cause la plus probable est la classification de Gmail en courrier de masse, qui dépend du volume — ce
  qui donne la **condition de réouverture** : si le domaine se met à envoyer pour de vrai, la paire
  d'en-têtes peut redevenir la contrainte restante, et le chantier se rouvre tel qu'il est écrit en §7.
  D'ici là, la sortie que le produit contrôle est le lien imprimé dans le corps, et elle marche —
  vérifiée sur appareil : navigateur, refus calme au second clic, préférence sur « Aucun ».

**Les reprises de jeton d'appareil laissent une trace** (`push_tokens.reprises`,
`derniere_reprise_le`, `proprietaire_precedent`). La reprise reste **inconditionnelle** — décision
de `v1-10` §3.4, inchangée : sans elle, les rappels partiraient au nom d'un utilisateur fantôme au
moment où une session anonyme devient un compte. Ce qui manquait était de pouvoir le *constater* :
un jeton repris deux cents fois dirait un appareil partagé ou une boucle, et c'est la seule question
que ces trois colonnes servent à trancher. Dans le `on conflict do update`, `push_tokens.user_id`
désigne la ligne **existante** et `excluded` la ligne proposée — s'y tromper lirait la nouvelle
valeur, donc ne compterait jamais rien. **Ces trois colonnes restent au serveur** depuis le
04/10/2026 (`20261004194921`) : le client lit `push_tokens` par colonnes, et
`proprietaire_precedent` — l'identifiant du compte qui avait l'appareil avant lui — n'en fait plus
partie. L'app ne lit que `token`.

**Dix jetons neufs par jour et par compte** (passe avant le lancement, 05/10/2026,
`20261005170000`) : chaque jeton inventé laissait une ligne, gardée 90 jours une fois désactivée.
Un appareil réel rappelle avec le même jeton, qui existe déjà et ne compte pas ; une reprise non plus.

**Un 400 d'Expo sur un lot de plusieurs comptes coupe le lot en deux** (même passe,
`envoyer_lot_push`). Expo refuse le lot **entier** quand il mêle des jetons de plusieurs projets
(`PUSH_TOO_MANY_EXPERIENCE_IDS`), et n'importe qui peut enregistrer sur son compte le jeton d'une app
Expo à lui : une ligne faisait tomber jusqu'à cent rappels, trois nuits de suite, sans repli. La coupe
se répète jusqu'à isoler la ligne fautive, qui échoue seule. **Elle suit les lignes, jamais les
jetons** : une ligne aux jetons répartis sur deux moitiés serait jugée « tous refusés » dans l'une
alors que l'autre est partie. L'appel lui-même vit dans `envoyer_a_expo`, pour que le test `51` le
remplace sans réseau.
