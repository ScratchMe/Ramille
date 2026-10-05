# BILAN.md — le questionnaire, le calcul, les modes et les facteurs

> **Quand ouvrir ce fichier.** Toucher au questionnaire côté base (une réponse, une colonne
> d'`assessment_answers`, `normaliserReponses`) · toucher au calcul (`recompute_assessment_results`,
> la part bilan d'`estimate_action_savings`) · ajouter ou changer un mode de transport, un résolveur
> ou un facteur d'émission · toucher à la synchronisation des facteurs ADEME · toucher à la
> soumission ou au retrait d'un bilan · affirmer d'où vient un chiffre du bilan.
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

Ce que l'écran du questionnaire fait de ces réponses — ce qu'une réponse efface, comment on saisit —
est dans `FRONT-QUESTIONNAIRE.md` §2.6 ; ce qu'un bilan devient dans le plan est dans `PLAN.md`.

---

## 1. Le modèle et le questionnaire

Le bilan (`assessment_answers`) est modélisé à plat, un champ par question B1.1→B4.3 — pas
une liste ouverte de trajets. Chaque utilisateur a exactement 0 ou 1 valeur par poste
(domicile-travail, loisirs, voyages), jamais plusieurs trajets du même type. Le mapping
`BilanAnswers` (`src/types/bilan.ts`) est un miroir direct des colonnes de la table, pour un
insert sans transformation.

**La fréquence des loisirs a quatre réponses depuis le 02/10/2026** (`v1-33` D5,
`20261002201852_la_quatrieme_frequence_des_loisirs.sql`) : « Rarement — une fois par mois ou
moins » (`rarely`, 0,25 sortie par semaine), « Deux ou trois fois par mois » (`multiple_monthly`,
0,6), « Une fois par semaine » (`weekly`, 1) et « Plusieurs fois par semaine » (`multiple_weekly`,
3), toutes sur 52 semaines. Trois choses à savoir avant d'en ajouter une cinquième :

- **seule « Rarement » est à part** : elle saute le détail des sorties et passe sur le résiduel
  (`BOUCLE.md` §1). Tout le schéma et tout l'écran testent `= 'rarely'` ou `<> 'rarely'`, donc une
  réponse nouvelle se comporte d'office comme une sortie déclarée — mode et distance demandés,
  boucle mensuelle sur les sorties, actions de loisirs au plan ;
- **le seul endroit qui énumère les fréquences est le `case` du calcul, et il n'a pas de `else`** :
  une valeur admise par le `check` sans sa branche rend un total NULL, que la colonne refuse, donc
  chaque bilan portant cette réponse échoue à la soumission. Le contrôle de la migration et le
  fichier pgTAP `41` vérifient **chaque** valeur admise, lue dans la contrainte ;
- **la valeur affichée et la valeur calculée sont gardées à part** : `HYPOTHESES.sortiesParSemaine`
  par `scripts/verifier-hypotheses-calcul.mjs`, qui lit la **dernière migration réécrivant le
  calcul en entier** — d'où la réécriture complète du 02/10/2026, une substitution lui aurait caché
  la constante —, et la liste des réponses (`REPONSES_FREQUENCE_DES_LOISIRS`, `LeisureFrequency`)
  par `scripts/verifier-miroirs-de-check.mjs`, où elle manquait depuis le premier jour.

Et ce qu'aucune garde ne suit, à reprendre à la main : le **nombre** de fréquences écrit dans le
contrôle de la migration et dans la prémisse du fichier `41` (quatre), et les recopies du kit —
`docs/design/design-system/components/bilan/LeisureFrequencyStep.*`, l'union de `ContextStep.d.ts`,
la phrase de `suivi/BlocMethode.jsx` — avec la hauteur de son aperçu (`.design-sync/config.json`).
Les domaines des tests Jest, eux, se dérivent de la liste.

**Le questionnaire demande désormais ce que le calcul supposait** (C3.4 + C3.5 + C3.6,
`20260914123432`). Quatre réponses s'ajoutent, toutes **obligatoires dès que leur déclencheur est
là** — laisser le choix facultatif reviendrait à garder le défaut pour tous ceux qui passent sans
répondre, ce que chacun des trois chantiers corrige. Cinq points à connaître :

- **Un trajet de plus de 300 km est un aller, comme un vol** : le calcul multiplie leur nombre par
  800 et 700 km, sans × 2 ; l'écran le dit (« Un aller-retour compte pour deux trajets. ») et la
  méthode aussi (`v1-33` D2). Les quatre compteurs de voyage sont `null` côté client tant qu'on n'a
  pas répondu ; les colonnes restent `not null default 0` (`?? 0` à l'insert, `v1-33` D1).
- **`commute_second_mode_share` est une fraction, pas une énumération** : c'est ce que le SQL
  multiplie, et traduire trois libellés en trois nombres quelque part entre l'écran et le calcul
  serait un troisième endroit où se tromper. Le calcul attribuait exactement la moitié des
  kilomètres à chaque jambe — vélo + train sous-estimé de 44 %, parc-relais surestimé de 51 %, sur
  le poste qui décide du poste dominant donc du plan. La moitié reste le **repli** d'un bilan qui
  n'a pas répondu (`second_leg_share_default`), et c'est à ce titre que le bloc « Comment ce chiffre
  est calculé » la cite encore.
- **Le CO₂ de la seconde jambe est persisté** (`commute_second_leg_co2_kg_year`). Il était calculé,
  entrait dans le total, et n'était écrit nulle part : tout ce qui lit `assessment_results` — le
  plan en premier — ne voyait que la jambe principale, donc « Travailler depuis chez toi un jour »
  valait 128 kg au lieu de 205 sur un trajet à deux modes.
- **`normaliserReponses` porte une règle qui diverge de celle du dessus, et il ne faut pas
  l'uniformiser** : sur des loisirs « rarement », le covoiturage part là où la motorisation reste.
  Le calcul lit encore les deux, mais la motorisation décrit le **véhicule** de la personne et rend
  le résiduel plus juste, tandis que le covoiturage décrit un **trajet** qui n'est plus déclaré — et
  le garder diviserait ce résiduel, donc changerait le total d'un bilan resoumis à l'identique.
  Ce que cette règle ne garde **pas**, c'est la promesse que les bilans déjà en base rendent le même
  total : celle-là tient au défaut de la colonne (`leisure_is_carpool` n'existait pas), et
  `normaliserReponses` ne touche jamais une ligne déjà écrite.
- **Une empreinte par personne veut un facteur par personne, et la branche voyages ne l'avait pas**
  (relevé en contre-lisant la vague 7, `20260914141729`). `estimate_action_savings` chiffre une
  substitution comme `base × (1 − facteur_substitut / facteur_courant)` : pour le trajet
  domicile-travail et pour les sorties, le facteur courant est **dérivé de la paire persistée**
  (`co2 / km`), donc il hérite de la division par le covoiturage sans qu'on ait rien à écrire. Les
  voyages n'ont pas de paire à diviser — il n'existe pas de `travel_car_km_year` — donc cette
  branche lisait le référentiel, c'est-à-dire le facteur du **véhicule**, sous une base devenue
  celle d'**une personne** depuis C3.5 : « Faire un de tes longs trajets en train » annonçait 4,4 %
  de trop à trois. Le test 10 l'épingle par un **rapport** entre deux profils jumeaux et non par une
  valeur — partager divise la base par trois dans les deux cas, et ce qui sépare le juste du faux
  est que partager rend aussi le train moins intéressant.
- **`PARTS_DU_SECOND_MODE`, `TAILLES_DE_COVOITURAGE` et `OCCUPATIONS_LONG_TRAJET`
  (`src/types/bilan.ts`) sont des miroirs des `check` du schéma** : rien ne peut lire ces bornes
  depuis TypeScript, et une valeur hors bornes ne serait refusée qu'à la soumission, en anglais,
  neuf étapes trop tard. Depuis le 20/09/2026 elles ne sont plus épinglées par des valeurs
  recopiées mais **comparées à la base en CI**, bornes comprises — le plafond `6` du covoiturage
  est vérifié en constatant que `7` est refusé (`TESTING-GARDES.md` §2.7).
- **`distanceSortieKm` est la jumelle de `distanceDomicileTravailKm`**, et pour le même piège : la
  colonne porte `check (leisure_distance_km > 0)`, donc un « 0 » saisi n'est pas une distance.
  `leisure_distance_km` ne survit qu'à la tranche ouverte, parce que le calcul la préfère à
  **toute** tranche (`coalesce`) : sans cette règle, quelqu'un qui saisit 120 km puis redescend sur
  « 5 à 15 km » repartirait avec 120, et la tranche affichée ne dirait plus ce que le calcul fait.

Le mode "voiture" ne distingue jamais la motorisation dans les listes de sélection
(B1.4/B1.7/B2.2 restent "Voiture (seul)"/"Voiture (covoiturage)", jamais une entrée par
motorisation) — une question de suivi ("Quelle motorisation ?") s'affiche en nested reveal dès
que "voiture" est choisi, dans 3 champs indépendants (`commute_car_engine`,
`leisure_car_engine`, `car_long_trips_engine`). **Quatre réponses au même niveau** — thermique,
hybride, hybride rechargeable, électrique — et surtout pas un second niveau « rechargeable ou
non ? » : la profondeur coûte plus cher en abandon qu'une puce de plus.
**Le deux-roues motorisé suit exactement la même mécanique** (`commute_two_wheeler_type`,
`leisure_two_wheeler_type`, quatre réponses au même niveau : scooter thermique, scooter
électrique, moto petite cylindrée, moto grosse cylindrée), et pour une raison plus forte encore :
**une grosse moto émet 0,2147 kg/km, soit une fois et demie une voiture thermique** et 2,8 fois
un scooter. Les quatre étaient comptés au tarif du scooter, ce qui sous-estimait de 64 %
l'empreinte d'un motard — dans le sens qui fait passer le deux-roues pour vertueux. Un test
pgTAP épingle ce classement pour qu'il ne soit pas « corrigé » par réflexe. Piège de relevé :
l'API nomme `moto-petite` et `moto` **toutes les deux** « Moto thermique », seul le slug les
distingue. Pas de champ pour les trajets longue distance, B3.4 ne proposant pas de deux-roues.

**Et depuis C4.4 le train et le vélo ont la leur** (`commute_train_type` / `leisure_train_type` :
TER, RER ou Transilien, Intercités ; `commute_velo_type` / `leisure_velo_type` : mécanique ou à
assistance). Deux champs par poste et non par jambe, comme la motorisation — B1.7 exclut le mode
déjà choisi en B1.4, donc au plus une jambe porte le train à un instant donné. Trois choses à ne
pas défaire :

- **la trottinette ne reçoit pas de question** : elle est déjà à 0,0249 et n'a pas de variante
  mécanique crédible — une question dont une seule réponse existe n'est pas une question ;
- **`normaliserReponses` efface ces deux réponses sur des loisirs « rarement », là où la
  motorisation reste** — l'asymétrie est celle du covoiturage, et elle a une conséquence
  mesurable : le résiduel de « rarement » vaut `train` quand le foyer n'a pas de voiture, donc un
  type survivant y serait lu et un bilan resoumis à l'identique changerait de total ;
- **B3.4 gagne un troisième compteur, l'autocar** (`coach_long_trips_per_year`), et il n'a **pas**
  de question de suivi : la personne ne choisit ni la motorisation ni le remplissage d'un
  autocar — ce n'est pas son véhicule, donc il n'y a rien à lui demander de plus. Son chiffre
  surprend et c'est le sujet — 0,03756, soit **plus qu'un TER** et douze fois un TGV.

**Ce qui passe près de chez soi remplace l'accès aux transports depuis le 02/10/2026** (`v1-34`,
`ce_qui_passe_pres_de_chez_soi`). `assessment_answers.transports_proches` est un `text[]` —
`metro_tram`, `rer`, `train`, `bus`, ou `aucun` seul —, et c'est le **premier choix multiple** du
questionnaire. Quatre choses à savoir avant d'y toucher :

- **`tc_access` reste une colonne, mais plus personne ne l'écrit** : le déclencheur
  `assessment_answers_deduit_l_acces` le déduit de la réponse à chaque écriture, et range la réponse
  dans l'ordre des puces, sans doublon (`transports_ranges`, jumelle de `transportsRanges` dans
  `src/types/contexte.ts`). Le questionnaire l'envoie nul, le préremplissage d'un nouveau bilan ne le
  recopie pas, et la moyenne française comme la phrase du plan le lisent comme avant ;
- **la règle de « Rien de tout ça » vit à un seul endroit côté écran** (`basculerTransport`) : elle
  exclut les autres dans les deux sens, et plus rien de coché rend `null` — la base refuse le tableau
  vide comme « aucun » combiné ;
- **c'est le premier miroir d'une colonne tableau que la CI sait lire** : `CHOIX_DE_TRANSPORTS` et
  `TransportProche` sont comparés au `check` `transports_proches <@ ARRAY[…]`
  (`scripts/verifier-miroirs-de-check.mjs`, `TESTING-GARDES.md` §2.7) ;
- **les recopies du kit suivent à la main** : `docs/design/design-system/components/bilan/ChampsDeContexte.*`,
  `ContextStep.d.ts`, `bilan.card.js` et `forms/IntituleDuChamp.d.ts`, ainsi que les deux aperçus de
  `.design-sync/previews/`. **Leurs hauteurs (`.design-sync/config.json`) ont été remesurées** à la
  synchronisation du 03/10/2026 (470 → 710 et 650 → 870) : la série qui se coche passe sur deux rangées et
  porte une ligne d'aide, et une hauteur ne se devine pas — à remesurer à chaque retouche de l'étape
  (`.design-sync/mesurer-les-cadres.cjs`, `.design-sync/NOTES.md`).

**Deux réponses de ce questionnaire sont gouvernées ailleurs** : ajouter une réponse de voyage
impose sa ligne dans `public.a_des_voyages_declares`, sans quoi le voyage ne déclenche jamais la
boucle mensuelle (`BOUCLE.md` §1 — c'est le défaut de l'autocar, en C4.4). Le balayage de
`33_deux_extractions_neutres.test.sql` attrape un compteur `_per_year` oublié ; un compteur nommé
autrement lui échapperait, en silence ; et la question du télétravail (B4.4) s'affiche, se réclame et s'efface par une seule
dérivation, `teletravailSePose`, dont la règle est en `PLAN.md` §1 (paragraphe de C3.8).

## 2. Les modes et les facteurs d'émission

**Ajouter un mode touche aussi la boucle, et ce fichier ne le dit pas ailleurs** : un mode de la
catégorie `velo_marche` impose son complément dans `public.complement_de_maintien` **et** dans sa
jumelle de `src/types/checkin.ts`, sans quoi il reçoit « autrement » des deux côtés (`BOUCLE.md`
§1, paragraphe de C2.5). Un test pgTAP épingle la liste de la catégorie — c'est lui qui a rattrapé
C4.4 — ; la jumelle TypeScript, elle, n'est épinglée que par un test Jest qui recopie ses quatre
modes (`checkin.test.ts`), jamais comparée à la base : c'est la paire qu'il faut toucher ensemble.

**Le calcul n'a qu'un seul point de résolution : `public.resolve_mode(mode_id, engine,
two_wheeler, train, velo)`**, qui compose **quatre** résolveurs spécialisés depuis C4.4
(`resolve_car_mode`, `resolve_two_wheeler_mode`, `resolve_train_mode`, `resolve_velo_mode`). Ne
jamais les rappeler en imbriqué dans `recompute_assessment_results` ou
`estimate_action_savings` : un oubli serait silencieux — le mode générique existe, son facteur
existe, le calcul rendrait un nombre. Une réponse non renseignée **ou inconnue** retombe sur le
générique, jamais sur `null`, qui ferait lever `emission_factor` et emporterait le bilan entier.
La signature a **remplacé** l'ancienne à trois arguments au lieu de la doubler, et un test pgTAP
épingle que l'ancienne ne survit pas.

**La règle qui décide de ce qui reçoit un mode propre est écrite en tête de la migration de C4.4** :
le générique est le repli des bilans d'avant la question, et une réponse reçoit un mode à elle
quand elle change le facteur **ou les mots**. `train_ter` existe pour la seconde raison — « Train »
ne peut pas être le libellé d'une réponse qui dit TER, exactement comme `voiture_thermique` vit à
côté de `voiture` avec le même slug et la même valeur ; `velo_mecanique` n'existe pas, parce que
« Vélo » et « à vélo » sont déjà les mots exacts du vélo mécanique.

**Le compte d'appels qui figurait dans `CLAUDE.md` (« six endroits ») était faux, et il n'est pas remplacé** :
relevé le 19/09/2026, il y en a quatre. C'est la règle que `CLAUDE.md` s'est déjà donnée ailleurs —
un compte écrit dans un document se périme en silence à la vague suivante, donc on écrit
l'invariant et pas le nombre. **Le relevé avait trouvé deux entorses** — `recompute_assessment_results` et
`estimate_action_savings` appelaient chacune `resolve_car_mode('voiture', car_long_trips_engine)`
en direct pour les voyages longue distance —, et **elles sont fermées depuis C4.4**, qui réécrivait
déjà ces deux fonctions : c'était le moment que `CLAUDE.md` avait prévu. Une assertion pgTAP interdit
désormais qu'un résolveur spécialisé soit rappelé en direct depuis le calcul, en **retirant les
commentaires** du corps avant de chercher — sans quoi la phrase qui explique la règle ferait échouer
le contrôle qu'elle décrit. Voir
`supabase/migrations/20260904090000_car_engine.sql`, `20260905140000_motorisation_hybride.sql`
puis `20260905200000_cylindree_deux_roues.sql`.

**L'ordre des motorisations en ACV n'est pas celui qu'on attend, et un test pgTAP l'épingle
pour qu'on ne le « corrige » pas** : hybride (0,146579) > thermique (0,142253) > hybride
rechargeable (0,133900) > électrique (0,067365). La thermique de référence de l'ADEME est une
compacte diesel, sobre à l'usage, tandis que l'hybride non rechargeable ajoute une batterie à
fabriquer sans jamais la recharger sur le réseau. Ranger « hybride » du côté de l'électrique
par réflexe se trompe de 10 %, et dans le mauvais sens.

**Tout lookup de facteur d'émission passe par `public.emission_factor(mode_id, date)`** —
jamais un `select ... order by valid_from desc limit 1` écrit à la main. La fonction borne le
facteur à la **date du bilan** (un bilan reste reproductible après une mise à jour ADEME, cf.
`v1-01` §3), retombe sur la version la plus ancienne si le mode a été ajouté au référentiel
après le bilan, et lève une erreur explicite si le mode n'a aucun facteur — un `NULL` ici
contaminerait tout le total. Voir
`supabase/migrations/20260904140000_fix_flight_and_long_distance_train_factors.sql`.

Cette migration porte aussi deux corrections de chiffre à connaître : le facteur **avion**
dépend du segment (court / moyen / long-courrier), relevé aux distances de référence du calcul
— `dist_flight_short` = 1500 km, donc un *moyen*-courrier au sens ADEME, et `dist_flight_long`
= 9000 km ; et le poste **voyages en train** (B3.3, « > 300 km ») utilise
`train_longue_distance` (TGV) et non le mode générique `train`, qui est depuis C4.4 le **repli**
du trajet quotidien B1.4 — les trois réponses réelles (`train_ter`, `train_rer`,
`train_intercites`) ont chacune leur mode, et le RER vaut 2,83 fois moins qu'un TER. `train_longue_distance` n'est jamais sélectionnable dans le
questionnaire — il n'apparaît donc pas dans `src/constants/transport-modes.ts`, mais bien dans
`MODE_PREPOSITION` (`src/types/resultat.ts`) puisqu'il peut être le `dominant_poste_mode`.

**Tous les facteurs portent l'ACV complète — usage + fabrication — jamais la seule phase
d'usage.** C'est la distinction la plus coûteuse du produit et elle n'est pas visible dans les
valeurs elles-mêmes : l'endpoint `/api/v1/transport` de l'API Impact CO2 renvoie des chiffres
parfaitement corrects, mais qui n'incluent pas la fabrication. Le seul endpoint à utiliser est
`/api/v1/thematiques/ecv/transport`, champ `ecv`. Un facteur d'usage seul sous-estime de 29 %
une voiture thermique, de **457 % une voiture électrique** (la batterie), et affiche le vélo à
zéro ; et il rend incomparable le total au repère national de `carbon-reference.ts`, qui est
une empreinte ACV. Deux tests pgTAP épinglent la **source** de chaque facteur et le fait que
le vélo soit non nul — le garde-fou des ±50 % ne peut rien voir ici, puisque l'erreur porte sur
l'endpoint interrogé et non sur la valeur renvoyée. Historique complet en `v1-07` §1.5.

**Les facteurs se resynchronisent seuls** : `sync_emission_factors()` (SQL pur via l'extension
`http`, pas d'Edge Function — même modèle que les autres crons)
interroge cet endpoint chaque trimestre et **insère une nouvelle version** dans
`emission_factors`, sans jamais écraser.

**Et elle s'authentifie depuis le 21/09/2026, ce qui ne change aucun chiffre** — ce paragraphe a
écrit « pas de secret à gérer » jusqu'à cette date, et c'est devenu faux. La clé de l'ADEME vit au
Vault (`impactco2_api_key`, même modèle que `resend_api_key`), et **mesurer avant d'écrire a changé
l'urgence du sujet** : la réponse authentifiée est identique champ pour champ sur les 47 entrées,
seul un `warning` disparaît — celui qui annonce que l'ADEME se réserve le droit de couper l'accès
anonyme. Ce n'est donc pas un correctif mais une assurance. Trois points à connaître :

- **Le secret absent retombe sur l'appel anonyme plutôt que d'échouer** : la CI et la stack locale
  n'ont pas de Vault garni, et échouer dur ferait rougir la synchronisation partout où le secret
  n'existe pas, pour un chemin qui marche encore. Un secret **blanc** ne compte pas comme une clé
  (`btrim`), sans quoi on enverrait un porteur vide en annonçant le contraire.
- **Ce repli est silencieux par nature, d'où `emission_factor_sync_runs.authentifie`** : sans cette
  colonne, un secret qui disparaît du Vault ferait basculer la synchronisation en anonyme sans que
  rien ne le dise — c'est-à-dire le risque même que ce chantier ferme.
- **Ce qu'aucune suite ne peut voir**, et qu'il ne faut pas prétendre gardé : que l'en-tête parte
  vraiment et que l'ADEME l'accepte. La CI n'a pas de secret, et rejouer sur le distant consomme un
  appel réel. Mesuré à la main le 21/09/2026 des deux côtés, et vérifié sur le distant après la
  migration : `authentifie = true`, `status = success`, zéro mode mis à jour — les valeurs n'ayant
  pas bougé, aucune version de bruit n'est écrite.

Le mapping vers les **slugs** Impact CO2 vit dans
`emission_factor_sources`, pas en dur dans la fonction : **ajouter un mode au produit impose
d'y ajouter une ligne**, sinon il reste figé à sa valeur de seed en silence (un test pgTAP
garde ce point). Pour l'avion, le slug retenu doit rester cohérent avec les distances codées
dans `recompute_assessment_results` (`avion-moyencourrier` pour 1500 km,
`avion-longcourrier` pour 9000). Un écart de plus de
50 % n'est jamais appliqué automatiquement — il est signalé dans `emission_factor_sync_runs`
pour relecture. Ce journal est la seule façon de voir que la synchronisation tourne
vraiment : le mécanisme prévu dès `v1-01` §2 n'avait jamais été construit et rien ne le disait.

## 3. Le calcul, la soumission et le retrait

Le calcul du bilan est séparé en deux fonctions : `recompute_assessment_results(assessment_id)`
porte le calcul (interne, revoked de anon/authenticated, appelable côté serveur), et
`compute_assessment_results(assessment_id)` est le RPC client qui vérifie la propriété du bilan
puis délègue. Toute reprise de calcul en masse (correction de facteur, migration) passe par la
première — la seconde exige un `auth.uid()` et ne peut pas tourner hors session client.

`assessment_results` fige le résultat calculé au moment du bilan (jamais recalculé à la
volée côté client) — même logique pour `engagement_checkins.trip_label`, snapshotté pour ne
pas changer rétroactivement le wording d'un check-in déjà généré si l'utilisateur refait un
bilan plus tard.

**La soumission écrit `in_progress` d'abord, et c'est ce qui empêche le bilan fantôme**
(11/09/2026, `20260911120000_soumission_bilan.sql`). L'ancienne séquence insérait `assessments` en
`completed` avec son `submitted_at`, **puis** les réponses, **puis** appelait le calcul : ce qui
s'arrêtait entre les deux premières laissait un bilan complété sans réponses ni résultat, et cet
état n'est pas inerte — la racine route sur `status = 'completed'`, donc elle envoyait au plan, qui
affichait « Ton plan est en cours de préparation » sans bouton et pour toujours (le cron nocturne
boucle lui aussi sur les `completed`, mais il a besoin des réponses), le préremplissage du
re-bilan ne trouvait rien, et l'entonnoir comptait un bilan soumis là où il y avait eu une panne.
`in_progress` est l'état que rien ne lit. Trois règles qui en découlent : **le passage en
`completed` précède le RPC** (`generate_plan_cycle_for_user` sélectionne les `completed`) ; la
reprise **réutilise** le bilan `in_progress` qui traîne au lieu de le supprimer — ce qui couvre
aussi l'app tuée entre deux écritures, où aucun nettoyage ne tournerait, et n'oblige pas à
accorder un `delete` sur `assessments` ; et les réponses passent donc par un `upsert`, leur clé
primaire étant `assessment_id`. Le verrou anti-double-soumission vit dans une `useRef`, pas dans
l'état d'affichage, qui ne vaut `true` qu'au rendu suivant. Côté SQL, la génération du plan est
enveloppée dans un `begin … exception … end` : les deux fonctions partagent la transaction du RPC,
donc sans cette sous-transaction un plan qui échoue emportait le résultat que le calcul venait
d'écrire.

**Et la base le tient depuis le 04/10/2026, plus seulement l'app** (`20261004194921`, seconde passe
de la revue finale) : un bilan **naît** `in_progress` — le trigger `refuser_le_retour_en_arriere_du_bilan`
refuse à un rôle du client toute autre valeur à l'insertion (`RM007`) —, **ne passe `completed` que
s'il a des réponses** (même trigger, même code), et ses réponses ne s'insèrent que tant qu'il est en
cours, comme elles ne se mettaient déjà à jour que dans cet état. Un appel direct à l'API pouvait
créer le bilan fantôme que la séquence évite, en un appel comme en deux. `mettre_a_jour_le_contexte`,
qui corrige les réponses d'un bilan complété, écrit en `security definer` et n'est pas concerné.

**Et un compte n'a qu'un bilan en cours à la fois, dix créations par jour** (passe avant le
lancement, 05/10/2026, `20261005170000`) : sans plafond, une session anonyme insérait vingt mille
bilans en deux secondes et pouvait remplir la base de 500 Mo, que le plan gratuit passe alors en
lecture seule pour tout le monde. L'index unique partiel `assessments_un_seul_en_cours` épouse la
reprise de l'écran (il reprend le bilan qui traîne, jamais n'en crée un second) et refuse une
insertion de plusieurs lignes ; le trigger `plafonner_les_bilans` compte les créations du jour
(`RM002`). **Les distances sont bornées à 10 000 km, vingt décimales au plus**, et la part du second
mode à vingt décimales (une contrainte par colonne, `…_bornee` : la garde des miroirs ne sait pas évaluer une contrainte qui en nomme plusieurs) : `> 0` laissait passer `NaN` et
`Infinity`, qui empoisonnaient toutes les moyennes de l'analyse, et un nombre de 131 000 chiffres.
La borne n'arrête aucun trajet réel ; le seuil où l'app fait relire reste `COMMUTE_DISTANCE_A_RELIRE_KM`.

**Le nouvel essai d'une soumission interrompue ne rejoue que ce qui reste, et le calcul ne se refait
pas** (04/10/2026, revue finale avant la production, `20261004173905`). Une coupure entre la
finalisation et le calcul — ou la réponse d'une écriture perdue en chemin — laissait un bilan
`completed` que l'écran tenait encore pour en cours : le nouvel essai réécrivait ses réponses, et la
policy qui les fige faisait lever l'`upsert`, à chaque essai. L'écran relit donc le statut d'un bilan
qu'un essai précédent a créé (`repriseDeLaSoumission`, `src/types/soumission.ts`) et ne rejoue que
le calcul d'un bilan finalisé. Côté serveur, `compute_assessment_results` refuse un bilan qui n'est
pas `completed` (`RM008`) et rend la main sans rien faire sur un bilan déjà calculé : le résultat
figé ne se recalcule plus depuis le client, et un recalcul voulu passe par
`recompute_assessment_results` côté serveur.

**Un bilan se retire, et ne se supprime pas** (C4.7, `v1-22`,
`20260927230411_retirer_un_bilan.sql`). Une distance saisie en mètres ou un questionnaire rempli
« pour voir » restaient pour toujours dans le suivi et devenaient la base de comparaison du suivant.
Six points à connaître :

- **`status = 'withdrawn'`, et la ligne reste.** Toutes les lectures de `completed` deviennent justes
  sans qu'on y touche — c'est ce qui a écarté une colonne `withdrawn_at`, qui aurait demandé un
  `and withdrawn_at is null` partout, donc un oubli silencieux quelque part. **Deux lectures ne le
  devenaient pas seules** : la restitution, qui lit un bilan **par son identifiant** — l'adresse qui
  circule — et embarque désormais le statut pour ne jamais montrer le chiffre d'un bilan retiré ; et
  `analytics.user_segments`, qui prenait le dernier bilan par `submitted_at is not null` (un bilan
  retiré garde sa date) et filtre maintenant sur le statut.
- **`retirer_le_bilan(uuid)` est le seul chemin**, et jamais une policy `DELETE` : il vérifie la
  propriété, refuse un bilan en cours ou déjà retiré (`RM006`, que l'écran reconnaît au code), et
  rend le nombre de bilans valides restants. **Un client qui écrirait `withdrawn` par un `update`
  direct est refusé par un trigger (`RM007`)**, parce que le privilège de colonne sur `status` doit
  rester à la soumission : le trigger distingue le RPC du client par `current_user` (`SUPABASE.md`
  §1.4), et un bilan retiré ne revient jamais (`RM005` étendu). **« Seul chemin » vaut pour le
  client** : sous `postgres` — `execute_sql` sur la production — un `update` traverse le trigger sans
  rien reconstruire. Côté serveur, on appelle donc le RPC sous le rôle de la personne (`SUPABASE.md`
  §1.4), jamais une recopie de son corps.
- **Le plan n'est reconstruit que si le bilan retiré le portait**, sur le bilan valide précédent,
  cause `retrait` (qui saute la garde d'idempotence — sans quoi le cron ne rebâtirait jamais) ;
  l'engagement est reposé si le nouveau plan le propose encore, archivé en `retrait` sinon, **et rien
  ne l'annonce après coup** (D2). C'est la confirmation qui le dit **avant**, au conditionnel, avec la
  phrase du re-bilan (`phraseDeLEngagementRecalcule`, lue par `lireLEngagementEnCours`) — et, pour le
  seul bilan, sans conditionnel, puisque l'action y est archivée à coup sûr (`phraseDeLActionQuiPart`).
- **La confirmation dépend de la place du bilan** (`placeDuBilan` : `seul`, `dernier`, `ancien`,
  `src/types/retrait-du-bilan.ts`) : « ton plan repartira de ton bilan précédent » serait faux d'un
  bilan qui ne porte pas le plan. Quand la place n'a pas pu être lue, le lien ne se rend pas.
- **Retirer son seul bilan laisse le cycle en place comme historique, mais pas son engagement**
  (décision du 27/09/2026) : l'action engagée est archivée en `retrait` et désengagée. Le cycle n'est
  pas inerte — `lireLEngagementEnCours` et la reconduction de saison le lisent sans regarder s'il
  reste un bilan —, et c'est pourquoi l'action devait partir : sinon la feuille « Nouveau bilan » la
  nommait, et la saison suivante la reconduisait devant quelqu'un qui repartait de zéro. Le retrait
  **annule aussi les rappels en attente** (sans quoi un e-mail étalé partirait vers `/plan?rappel=1`,
  qui proposerait de retrouver un compte) et efface la marque locale ; la racine route alors vers
  l'onboarding. **Le premier parcours, lui, ne recommence pas** (`ouvreUnPremierParcours`, même
  décision) : la personne connaît déjà les deux lieux.
- **L'export rend le bilan retiré avec son statut, et l'entonnoir ne décrémente pas** : ce qui est
  soumis a été soumis. La page de confidentialité dit qu'un bilan retiré reste conservé, pour que
  « retirer » ne se lise pas « effacer ».
