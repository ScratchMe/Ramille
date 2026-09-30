# v1-27 — Ce que six jours denses ont laissé derrière

> Relevé du 19/09/2026, demandé après la relecture des six jours (14 → 19/09). **Rien ici n'est un
> défaut visible par la personne qui utilise Ramille** : ce sont des endroits où le produit est plus
> difficile à changer qu'il ne devrait, ou des gardes qui n'en sont pas.
>
> Chaque ligne porte ce qui a été **mesuré**, pas ce qui est soupçonné. Ce qui n'a pas pu être
> mesuré est dit tel quel.

## 0. Ce que la relecture a vérifié et trouvé sain

Il faut le dire avant la liste, parce que c'est le résultat principal : **les disciplines que le
dépôt s'est données tiennent.** Vérifié contre la base vivante le 19/09/2026 :

| Ce qui a été comparé | Résultat |
|---|---|
| Les six paires SQL / TypeScript (`mois_francais`, `jours_francais`, `complement_de_maintien`, `poste_inserable`, `periode_precedente`, et leurs jumelles) | **identiques, valeur par valeur** — mois, jours seuls, « Mardi ou jeudi », « Tous les jours », les trois compléments, les trois postes, les trois cadences de période |
| Les miroirs TypeScript des `check` du schéma (`PARTS_DU_SECOND_MODE`, `TAILLES_DE_COVOITURAGE`, `OCCUPATIONS_LONG_TRAJET`, les deux listes de tranches de distance) | **conformes**, y compris le piège des deux tranches distinctes (`30_50`/`50_plus` pour le trajet, `30_plus` pour les sorties) |
| Le référentiel d'événements d'usage | **18 déclarés, 18 émis, 0 orphelin dans un sens ou dans l'autre** |
| Le nom « TraceVerte » dans le code | **aucune occurrence hors des exceptions documentées** (clés AsyncStorage, nom du projet Supabase, fichier du handoff design) |
| Les écritures d'état après une garde d'annulation (la famille de défauts du lot 5) | **aucune dans un corps d'effet** ; les occurrences relevées sont toutes dans des gestionnaires d'événement, où la garde ne s'applique pas |
| Les scripts de garde, et qui les appelle | **tous branchés** sauf un (ligne 3 ci-dessous) |

## 1. Deux entorses au point de résolution unique du calcul

> **Fermé le 21/09/2026 par C4.4**, exactement comme cette ligne le prescrivait : les deux appels
> directs sont rentrés au point unique dans la migration qui réécrivait déjà les deux fonctions.
> Et la garde qui manquait a été écrite du même geste — une assertion pgTAP interdit qu'un
> résolveur spécialisé soit rappelé en direct depuis le calcul, en **retirant les commentaires** du
> corps avant de chercher, sans quoi la phrase qui explique la règle ferait échouer le contrôle
> qu'elle décrit. Le reste de cette section est conservé tel quel : c'est le relevé du 19/09, et
> sa dernière phrase — « le jour où `resolve_mode` gagne une dimension, ces deux sites ne la
> recevront pas » — a eu raison deux jours plus tard.

**Mesuré.** `CLAUDE.md` pose que « le calcul n'a qu'un seul point de résolution,
`public.resolve_mode(mode_id, engine, type)` » et interdit d'appeler les fonctions spécialisées en
direct. Relevé dans les définitions vivantes : **deux sites le font**, tous deux pour la voiture des
voyages longue distance —

```
recompute_assessment_results, l. 173 : v_travel_voiture_mode := public.resolve_car_mode('voiture', a.car_long_trips_engine);
estimate_action_savings,       l. 138 : … public.resolve_car_mode('voiture', a.car_long_trips_engine), v_factor_date)
```

**Ce que ça coûte aujourd'hui : rien.** L'équivalence a été éprouvée sur les **six** valeurs de
moteur (`thermique`, `hybride`, `hybride_rechargeable`, `electrique`, `null`, une valeur inconnue) :
`resolve_car_mode('voiture', m)` et `resolve_mode('voiture', m, null)` rendent la même chose partout.
C'est structurel — `resolve_mode` vaut littéralement
`resolve_two_wheeler_mode(resolve_car_mode(mode, moteur), type)`, et le second passage est neutre sur
un mode voiture.

**Ce que ça coûtera.** Le jour où `resolve_mode` gagne une dimension — et C4.4 en ajoute une, le
type de train —, ces deux sites ne la recevront pas. L'oubli sera silencieux : le mode générique
existe, son facteur existe, le calcul rendra un nombre.

**Recommandation : ne pas faire de migration pour ça.** Les ramener au point unique coûte deux
lignes **dans une migration qui réécrit déjà ces deux fonctions**, et C4.4 en est une. Une migration
autonome sur les deux fonctions du calcul, pour un changement sans effet, serait le mauvais côté du
compromis — c'est exactement là que la régression de C2.2 s'était produite.

## 2. Les signatures de fonctions de `database.types.ts` ne sont comparées à rien

> **Traité le 20/09/2026** (§12.2) : le générateur a été appelé une fois, ses deux formes lues, et
> l'analyseur éprouvé par huit mutations. Le relevé ci-dessous est celui du 19/09, gardé tel quel.

**Mesuré.** `scripts/verifier-types-base.mjs` compare les **colonnes** du fichier tenu à la main à
celles de la base construite en CI. Il ne compare pas le bloc `Functions`. Or ce bloc est tenu à la
main lui aussi — deux entrées y ont été écrites à la main le 19/09/2026 (`mettre_a_jour_le_contexte`,
et le second argument de `generate_plan_cycle_for_user`) sans qu'aucun contrôle ne les regarde.

**Ce que ça coûte.** Un nom d'argument faux ne se voit ni au typecheck (il vérifie le code *contre*
ce fichier) ni en CI. Il se voit à l'exécution, en anglais, chez la personne — le raisonnement exact
qui a fait écrire le contrôle des colonnes.

**Ce que ça coûterait de le faire.** Le job `db-tests` produit déjà le fichier généré
(`supabase gen types typescript --local`) : il n'y a **aucune plomberie CI à ajouter**, seulement à
étendre le script — comparer, par fonction, l'ensemble des noms d'arguments et leur optionalité.

**Pourquoi ce n'est pas fait ce soir.** Le fichier du dépôt porte deux formes (une ligne, ou
développée sur plusieurs) et le générateur n'en produit qu'une. Un analyseur écrit sans avoir vu la
sortie du générateur risquerait de rougir pour une raison de forme — c'est-à-dire de faire
désarmer un contrôle qui marche. Le faire demande de générer une fois le fichier et de valider
l'analyseur contre les deux formes.

## 3. Un script de garde que rien n'appelle

**Mesuré.** Tous les scripts de `scripts/` sont appelés — par la CI, par `vercel.json`, par Jest ou
par un autre script — **sauf un** : `rendre-favicon.mjs` ne l'est par rien, ni CI, ni
`package.json`. Le compte exact ne s'écrit pas ici : il disait « onze scripts, dix appelés » et le
dossier en portait quinze deux jours plus tard, ce qui est précisément le défaut du §6 de ce même
document. La vérification se refait en une commande, et c'est elle qui compte :

```bash
for f in $(ls scripts/); do grep -rq "$f" .github/workflows/ package.json vercel.json scripts/ \
  --exclude="$f" || echo "orphelin : $f"; done
```

Son en-tête dit : « Sans ce script, le SVG serait "source de vérité" en commentaire seulement : le
PNG est ce qu'Expo lit, et rien ne garantirait qu'il descend encore du dessin d'à côté. » **C'est
exactement la situation actuelle** : le script existe, personne ne le lance, et rien ne garantit que
`favicon.png` descende encore de `favicon-mark.svg`.

**Deux issues, et elles ne se valent pas.**

1. **Un contrôle CI** qui re-rend le SVG et compare au PNG. Le rendu vient de `@resvg/resvg-wasm`,
   déjà une dépendance du produit — mais sa sortie peut changer d'une version à l'autre, et un
   contrôle qui rougit à la montée d'une dépendance finit désarmé.
2. **Retirer la promesse** de l'en-tête et assumer un générateur qu'on relance à la main.

**Recommandation : la 2**, et c'est une décision à prendre plutôt qu'un travail à faire. Un favicon
change une fois par an ; un contrôle fragile coûterait plus cher que ce qu'il garde.

**Fait le 27/09/2026, par la 2.** Mesuré avant d'écrire : le `favicon.png` versionné est
**identique octet pour octet** au rendu actuel de `favicon-mark.svg` (resvg 2.6.2), donc rien
n'avait dérivé. L'en-tête du script ne promet plus une filiation que rien n'exerçait : il dit que
le script se relance à la main dans la PR qui touche au SVG, que c'est la relecture qui le voit,
et comment revérifier.

## 4. L'écran du plan concentre une dizaine de cartes dont les exclusions ne sont vérifiées que par relecture

**Mesuré.** `src/app/(tabs)/plan/index.tsx` a gagné **544 lignes en six jours** et a été touché par
une dizaine de chantiers. Il porte, en rendu conditionnel : la carte d'ouverture de saison, celle du
premier plan, la carte d'attente, le point en attente, le point répondu, l'encart orphelin, l'encart
de rattachement, l'encart de contexte, la carte de re-bilan, le cap, le trait de temps, l'état vide.

**Ce que ça coûte.** Les règles qui les séparent sont écrites **en prose** dans les commentaires —
« les deux cartes ne peuvent pas coexister », « elle remplace la carte d'attente, jamais un point en
attente », « jamais sur un plan à zéro action ». Ce sont des affirmations, pas des assertions. Et
c'est précisément la deuxième des trois familles de défauts que le dépôt s'est appris à chercher :
*une exclusion affirmée mais vérifiée sur une paire de moins*. Elle est déjà sortie une fois (lot 5,
« deux cartes qu'on croyait s'exclure »).

**Le chantier.** Sortir la **décision** de ce qui s'affiche dans une dérivation pure —
`cartesDuPlan(état)` rendant une liste ordonnée — et laisser à l'écran le seul rendu. Les exclusions
deviennent alors des assertions : « pour tout état, jamais `ouverture` et `premierPlan` ensemble »,
« jamais une carte d'ouverture au-dessus d'un point en attente ». C'est la forme que `pistesDuPlan`
a déjà, avec sa garde de partition. *(27/09/2026 : la seconde assertion est fausse et ne s'écrit
pas — une carte d'ouverture se rend **au-dessus** du point par conception ; elle remplace la carte
d'attente, jamais le point, C2.8. Ce qui s'épingle est l'inverse : le point se rend toujours.)*

**Effort : moyen. Risque : réel** — c'est l'écran le plus lu du produit, et le refactor ne doit rien
changer à ce qui s'affiche. Il demande donc sa propre recette, et **il n'est pas à faire seul dans
un coin de vague.**

**Fait le 27/09/2026, sous une forme plus étroite que celle proposée ici.** Pas de liste ordonnée :
l'ordre de l'écran est fixe, sauf un couple (les pistes et le cap) qui était déjà dérivé. Ce qui
restait à sortir était la **décision**, donc `cartesDuPlan` (`src/types/plan.ts`) rend un objet —
la carte d'ouverture, la carte d'attente, l'ordre pistes/cap, l'encart de contexte, la félicitation,
l'estimation — et l'écran lit ces six décisions. **Il en garde d'autres**, qui n'excluent aucune
carte et ont chacune leur dérivation : le trait de temps, la carte de re-bilan, ce que le cap
chiffre et dit, le lien vers les pistes, et les trois encarts de faits (orphelin, période révolue,
rattachement) — le JSDoc de `cartesDuPlan` les nomme. Trois choses à savoir :

- **« Au plus une carte d'ouverture » est devenu un type, et l'écran une seule expression** :
  `carteDOuverture` est une valeur unique, et les trois cartes se rendent dans un seul ternaire dont
  chaque branche exclut les autres. L'empilement est inexprimable des deux côtés. La contre-lecture
  a relevé que la première version ne le rendait inexprimable que dans la dérivation : l'écran
  gardait trois blocs indépendants, et remettre l'ancienne condition d'un seul suffisait à
  rempiler.
- **Les exclusions sont épinglées sur toutes les combinaisons d'états** (dont un plan à une seule
  action : sans lui, une borne écrite `<= 1` passait, mesuré), et cinq mutations disent laquelle
  garde quoi. Le parcours réel garde **deux des huit arguments** de l'appel — `carteDuPremierPlan`
  et `carteDesDeuxLieux` — par une étape neuve du cycliste, éprouvée par deux mutations (en-tête de
  `verifier-parcours-reel.mjs`). Les six autres ne sont tenus que par les tests de la dérivation et
  la relecture de l'appel.
- **Et il a trouvé un défaut, le cas exact que ce paragraphe annonçait.** « Ton premier plan » et
  « Deux endroits, pas plus. » s'empilaient : la contre-lecture du lot 5 avait jugé la paire
  impossible, « parce que le premier plan exige qu'aucun cycle ne précède » — mais la seconde carte
  ne dépend d'aucun cycle. Un premier plan à zéro action, puis un nouveau bilan dans la même saison
  qui donne des actions, suffisaient. Tranché par la personne qui pilote : le premier plan passe
  devant, l'autre attend son « Compris ».

**La « recette dédiée » que ce paragraphe demandait n'a pas été faite à la main, et il faut le dire
ainsi.** Ce qui établit que rien d'autre n'a changé à l'écran est une **relecture condition par
condition** de l'ancien rendu contre le nouveau (la contre-lecture du 27/09/2026 : identique dans
tous les états atteignables, sauf la paire décidée), les tests de la dérivation, et le parcours
réel sur ses deux profils. Les contrôles de l'export ne voient pas ces cartes —
`verifier-etats-export.mjs` le dit en tête —, et le parcours ne visite ni la carte de saison ni la
carte d'attente. La ligne qui manque à la recette web du premier parcours (un premier plan à zéro
action, puis un nouveau bilan : « Ton premier plan » d'abord, « Deux endroits, pas plus. » après
« Compris ») est à ajouter à la prochaine feuille.

## 5. Les migrations recopient des fonctions entières

**Mesuré.** `generate_plan_cycle_for_user` fait environ 130 lignes, recopiées **en entier** à chaque
migration qui la touche — quatre fois depuis le 24/08. `recompute_assessment_results` en fait plus de
320.

**Ce que ça coûte, et c'est déjà arrivé.** En C2.2, les deux RPC d'engagement ont été repris depuis
leur migration d'origine plutôt que depuis leur état installé, ce qui a **supprimé en silence trois
gardes** ajoutées entre-temps par C1.12 ; seul un fichier de test les a rattrapées. La règle qui en
est sortie — partir de `pg_get_functiondef`, jamais du fichier qui l'a créée — traite le symptôme,
pas la cause.

**Le chantier.** Extraire les morceaux stables en fonctions nommées (les bornes de période, la
capture d'engagement, l'insertion des actions), pour qu'une migration touche vingt lignes et non
cent trente. **À instruire**, pas à improviser : chaque extraction est une migration sur le cœur du
calcul.

**Instruit le 27/09/2026, et la mesure déplace la cible.** Nombre de définitions de chaque fonction
dans `supabase/migrations/` (création comprise, relevé par `grep -ilE "create( or replace)? function"`), et longueur du corps installé (`pg_get_functiondef`, stack locale) :

| Fonction | Définitions | Lignes installées |
|---|---|---|
| `enqueue_checkin_reminders` | 11 | 79 |
| `generate_extras_checkins` | 10 | 76 |
| `generate_commute_checkins` | 8 | 55 |
| `generate_plan_cycle_for_user` | 5 | 165 |
| `recompute_assessment_results` | 4 | 359 |
| `estimate_action_savings` | 4 | 232 |

Ce ne sont donc pas les fonctions **longues** qui se recopient le plus, ce sont celles de la
**boucle d'engagement** — chaque chantier du lot 2 en a réécrit une. Et la relecture de leurs corps
installés trouve deux duplications réelles, qui sont les deux extractions à faire, dans cet ordre :

1. **L'énumération des voyages déclarés**, écrite deux fois : dans le filtre de base déclarée de
   `generate_extras_checkins`, et dans le cas du bilan à zéro de `recompute_assessment_results`
   (`coalesce(flights_total_per_year, 0) + … + coalesce(coach_long_trips_per_year, 0) > 0`). C'est
   **la liste qui a déjà coûté un défaut** : C4.4 a livré l'autocar sans sa ligne dans le filtre, et
   seul le fait de jouer les deux crons l'a trouvé. Une fonction `a_des_voyages_declares` (pure,
   révoquée du client) la tiendrait en un seul endroit, et l'assertion du test `20` qui tombera au
   cinquième compteur n'aurait plus qu'un endroit à désigner.
2. **La recherche de l'action engagée sur la période interrogée**, identique dans les deux
   générateurs à son poste près (jointure latérale sur `plan_actions`, `plan_cycles`,
   `action_templates`, bornée par la période, triée par `committed_at`). La correction du jour même
   (la boucle mensuelle de qui sort rarement, #281) a dû la retoucher dans l'un en sachant que
   l'autre la répète. Une fonction `action_engagee_de_la_periode(user_id, poste, period_start)`.

**Ce qui n'est pas recommandé à ce jour** : découper `recompute_assessment_results` et
`estimate_action_savings`. Ce sont les plus longues, mais les moins recopiées, et leur découpage
toucherait le chiffre de chaque bilan pour un gain que la règle « partir de `pg_get_functiondef` »
(`SUPABASE.md` §1.5) rend déjà. **Chaque extraction est une migration neutre** : réécrire ses
appelants depuis leur corps installé, et prouver la neutralité par la suite pgTAP entière — dont
les valeurs attendues ne doivent pas bouger d'une décimale — avant de l'appliquer au distant.

**Fait et appliqué au distant le 27/09/2026, et neutre** — deux migrations,
`20260927210200_les_voyages_declares_en_un_seul_endroit.sql` puis
`20260927210247_l_action_engagee_en_un_seul_endroit.sql`, avec leur fichier de test
`33_deux_extractions_neutres.test.sql`. La suite pgTAP entière passe sans qu'une valeur attendue
ait bougé (seul le **libellé** d'une assertion de `20` change, pour désigner la fonction), le
parcours réel aussi, et les corps installés des trois fonctions réécrites étaient identiques
octet pour octet entre la stack locale et le distant avant d'écrire. Chaque fonction a été cassée
d'une dizaine de façons, consignées en tête du `33` ; aucune mutation n'est restée debout. Ce que
l'exécution a appris, et que l'instruction ne savait pas :

- **l'appariement par poste n'était gardé par aucun test de comportement** : ignorer le poste dans
  la recherche de l'action ne faisait tomber aucune assertion de `20` ni de `23`, faute d'un profil
  engagé sur un poste et interrogé sur un autre. Le `33` le garde désormais ;
- **les vols et la voiture n'étaient gardés par aucun test du filtre de base déclarée** — seul
  l'autocar l'était, par le profil qui a trouvé son oubli. Le balayage du `33` prend chaque colonne
  `_per_year` sans la nommer, donc un cinquième compteur oublié le fera tomber s'il suit ce suffixe
  (un compteur nommé autrement lui échapperait) ; l'assertion de `20`
  qu'on croyait garder ce cinquième compteur ne garde que le chemin de l'autocar ;
- **la branche `'travel'` du bilan à zéro de `recompute_assessment_results` est inatteignable** —
  tous les facteurs de voyage sont positifs et le résiduel de « rarement » n'est jamais nul —, d'où
  une garde de structure et non de comportement ;
- **rejouer seule `20260927191009` ou `20260927210200` après la seconde défait l'extraction**,
  puisque chacune réécrit `generate_extras_checkins` en entier — et rejouer `20260927210200` seule
  passe même tous ses contrôles en silence. C'est la règle de `SUPABASE.md` §2.3 (« rejouer un
  fichier ancien peut défaire une migration plus récente »), écrite dans l'en-tête de la seconde.

Le tableau ci-dessus est un instantané d'avant. Remesuré par la même méthode après :
`generate_extras_checkins` 12 définitions et 66 lignes installées, `generate_commute_checkins` 9 et
46, `recompute_assessment_results` inchangé à 4 définitions (touché par substitution et non par
recopie) et 358 lignes. `generate_extras_checkins` a gagné deux définitions (une par migration)
et perdu dix lignes, `generate_commute_checkins` une définition et neuf lignes : la prochaine
migration de la boucle en recopiera moins, et ne pourra plus oublier un poste ni un compteur dans
l'une des deux copies.

## 6. Les comptes écrits dans les documents se périment, et deux l'avaient fait

**Mesuré, et corrigé le 19/09/2026.** `CLAUDE.md` affirmait que les fonctions de résolution sont
« appelées à six endroits » — il y en a **quatre** — et que « les 19 profils de la base valent tous
`season` » — il y en a **65**, tous en `season`.

Le second cas est instructif : **le fait est resté vrai, seul le nombre a vieilli.** C'est la forme
la plus discrète de la dérive, parce que rien ne semble faux.

Le dépôt s'était déjà donné la règle — « le compte qui figurait ici s'est périmé à la vague
suivante, c'est exactement la raison pour laquelle il ne s'écrit plus » — mais elle n'est appliquée
qu'aux endroits où elle a coûté quelque chose. **Les deux passages sont corrigés en retirant le
nombre**, pas en le mettant à jour.

**Chantier possible, et modeste** : un balayage périodique des affirmations chiffrées vérifiables
(« N endroits », « N profils », « N gabarits ») plutôt qu'un outil — le coût d'un outil dépasserait
celui de la relecture.

## 7. Seize dérivations exportées pour leur seul test

**Mesuré.** Sur 308 fonctions et constantes exportées de `src/`, **seize** n'ont aucun consommateur
hors de leur propre fichier : elles sont exportées pour que leur test puisse les appeler.

Ce n'est pas un défaut — c'est même ce qui rend la logique éprouvable. Mais ça **brouille le signal**
« qui utilise quoi » : c'est ce qui a rendu la recherche de code mort bruyante ce soir, et c'est ce
qui a permis à deux vraies dérivations mortes de s'y cacher (toutes deux traitées, cf. §9).

**Pas de chantier recommandé.** Le noter suffit : quand on cherche du code mort dans ce dépôt, il
faut distinguer « exporté et appelé nulle part » de « exporté, appelé dans son fichier ».

## 8. `normaliserReponses` porte seule la cohérence de quarante réponses

**Mesuré.** `BilanAnswers` est un miroir à plat des colonnes d'`assessment_answers` — c'est un choix
documenté (`v1-05`), et il permet un insert sans transformation. La contrepartie est que **toute** la
cohérence entre réponses vit dans une seule fonction, qui a grossi à chaque chantier du questionnaire
(C3.4, C3.5, C3.6, C5.4, C6.4).

**Ce que ça coûte.** Les règles y sont hétérogènes — certaines effacent, d'autres préfèrent, une
diverge volontairement de sa voisine (le covoiturage des loisirs part là où la motorisation reste) —
et rien ne les sépare. Une règle ajoutée au mauvais endroit changerait le total d'un bilan resoumis
à l'identique.

**Chantier possible** : découper en règles nommées, chacune avec son test, et faire de
`normaliserReponses` leur application en séquence. **Risque produit réel** — cette fonction décide de
ce qui part à la soumission — donc elle relève d'une page de décision, pas d'un nettoyage.

**Instruit le 27/09/2026, et la réponse n'est pas le découpage.** Relu règle par règle, le risque
nommé ici — une règle au mauvais endroit — tient à **l'ordre** : une règle qui en réveille une autre
déjà passée ne se voit qu'au second passage. Or la fonction affirmait dans son en-tête deux choses
qui y répondent, et **aucun test ne les éprouvait** : qu'elle est idempotente, et que rien n'y
invente une réponse. Ses quarante-quatre tests en éprouvaient une règle chacun.

Ce qui a été fait est donc de les **épingler**, sans rien changer à la fonction : trois propriétés
sur 6 000 jeux de réponses tirés d'un générateur à graine fixe, dans le domaine de chaque champ et
hors des combinaisons que l'écran produit — un second passage ne change plus rien, chaque champ
reste tel quel ou s'efface, et aucune déclaration de voyage ni de contexte hors télétravail n'est
touchée. Un premier test vérifie que le domaine couvre tous les champs de `BilanAnswers`, sans quoi
un champ ajouté resterait hors de portée. Trois mutations consignées dans `bilan.test.ts`, dont
celle qui remonte la motorisation avant les règles du second mode : **l'idempotence tombe**, ce
que les quarante-quatre tests laissaient passer.

**Le découpage en règles nommées n'est pas recommandé à ce jour.** Les règles sont déjà commentées
une par une, avec leur raison et leur chantier ; les séparer déplacerait cent cinquante lignes de
commentaires porteurs pour un gain que les propriétés rendent déjà — et il n'y a aucune décision de
produit à prendre, puisque rien ne change à ce qui part à la soumission. Il se rouvre le jour où
une règle devra s'appliquer **ailleurs** que dans la fonction entière (une règle réutilisée seule par
un écran, comme `teletravailSePose` l'est déjà).

## 9. Le dépôt et le distant ne s'apparient plus migration par migration

**Mesuré le 19/09/2026.** Le projet distant porte **91** enregistrements de migration, le dépôt
**84** fichiers. Dix noms du distant n'ont pas de fichier homonyme, trois fichiers n'ont pas
d'enregistrement homonyme, et **49 des 84** portent un horodatage différent de celui enregistré à
distance.

**Ce que ce n'est pas.** Ce n'est **pas** une divergence de schéma, et il faut le dire avant tout le
reste parce que la conclusion inverse est tentante. Les écarts relevés sont des **découpages** et
des **renommages** au moment d'appliquer : le distant a `actions_chiffrees_1_schema`,
`_2_recompute`, `_3_estimateur` là où le dépôt a un seul `actions_chiffrees.sql` ;
`horodatage_serveur_usage_events` là où le dépôt a `horodatage_serveur.sql`. Et le contenu des
enregistrements sans homonyme a été retrouvé dans le dépôt — le `set search_path` de
`resolve_car_mode` est bien en `car_engine.sql` l. 76, la bascule de résolution en
`cylindree_deux_roues.sql` l. 96 et 121.

La preuve de fond est ailleurs, et elle est plus forte que l'appariement des noms : **la CI
construit le schéma à partir des seuls fichiers du dépôt**, et 536 assertions pgTAP y passent —
dont celles qui éprouvent les privilèges, les `search_path` et les refus d'écriture.

**Ce que ça coûte quand même.** On ne peut pas, en partant d'un enregistrement distant, retrouver le
fichier qui l'a produit. C'est exactement ce qui fonde la règle la plus contre-intuitive de
`SUPABASE.md` — *réécrire une fonction part de `pg_get_functiondef`, jamais du fichier qui l'a
créée*. Cette règle est un contournement, pas une solution, et elle a déjà été oubliée une fois
(C2.2, trois gardes supprimées en silence).

**Ce qu'il ne faut pas faire** : réécrire l'historique des migrations pour le faire coïncider. Un
historique de migrations est un journal, pas un état ; le réécrire pour qu'il soit joli est le seul
geste qui puisse casser une base qui va bien.

**Ce qu'on peut faire, et c'est modeste** : appliquer désormais les migrations avec **le même nom
et le même horodatage que le fichier**, pour que la divergence cesse de croître. Les trois dernières
(`classement_du_plan`, `teletravail_en_jours`, `le_contexte_sort_du_questionnaire`) ont toutes
dérivé de quelques heures, sans raison autre que l'outil qui les a appliquées.

**Et c'est exactement ce qui s'est reproduit à la migration suivante** (21/09/2026, C4.4). Le
fichier portait l'horodatage `20260921160000`, l'enregistrement distant porte `20260921165612` :
même nom de migration, cinquante-six minutes d'écart, et pour la raison que le paragraphe
ci-dessus nommait sans en tirer la conséquence — **`apply_migration` pose son horodatage, et
l'appelant ne le choisit pas**. La consigne était donc inapplicable telle qu'écrite : elle
demandait de choisir quelque chose qui n'est pas offert.

**La réparation se fait après coup, et c'est la seule disponible** : relever l'horodatage
enregistré, puis renommer le fichier du dépôt dessus. Ce n'est pas « réécrire l'historique » au
sens interdit deux paragraphes plus haut — rien de ce qui a été appliqué ne change, aucun ordre ne
bouge, aucune base n'est touchée ; c'est donner au fichier le nom de son enregistrement.
`20260921165612_les_modes_qui_manquent.sql` est ainsi **la première migration du dépôt qui
s'apparie exactement à la sienne**.

**La règle devient donc** : appliquer, relever, renommer, pousser — et le relevé tient en une
requête sur `supabase_migrations.schema_migrations`. Elle est consignée en `SUPABASE.md` §1.5,
parce qu'elle ne doit rien à Ramille : elle vaut partout où un outil applique les migrations à la
place de la personne qui les a écrites.

## 10. Ce qui a été traité le soir même

- **`estRaisonAnnoncable`** (`src/types/plan.ts`), écrit le matin et appelé nulle part : supprimé,
  son assertion réécrite sur `RAISONS_ANNONCABLES`.
- **`pageEstIndexable`** (`src/constants/page-titles.ts`) : gardé — il nomme la règle pour les
  assertions — mais **son commentaire affirmait empêcher une dérive qu'il n'empêche pas**. Ce qui la
  garde réellement est `scripts/verifier-titres-export.mjs`, qui relit le HTML produit. Le
  commentaire le dit maintenant.
- **Les deux comptes périmés de `CLAUDE.md`** (§6).
- **La signature morte de `02_generate_plan_cycle_for_user`** — une garde de privilège que C6.4 avait
  fait disparaître en silence, rattrapée par la CI et corrigée.
- **Le lendemain, §2** — voir §12.2.

## 11. Dans quel ordre, si on en fait quelque chose

| | Chantier | Effort | Quand |
|---|---|---|---|
| 1 | §1 — les deux entorses au point de résolution | ~nul | **fait le 21/09/2026**, dans la migration de C4.4 |
| 2 | §2 — les signatures dans le contrôle de types | petit | **fait le 20/09/2026** (§12.2) |
| 3 | §3 — la promesse du favicon | une décision | **fait le 27/09/2026** : la promesse retirée, la filiation mesurée intacte |
| 4 | §4 — la décision d'affichage du plan | moyen, risque réel | **fait le 27/09/2026** : `cartesDuPlan` sur toutes les combinaisons d'états, et un empilement de cartes trouvé en chemin |
| 5 | §5 — le découpage des fonctions de calcul | grand | **instruit puis fait le 27/09/2026** : les deux extractions désignées (les voyages déclarés, l'action engagée), neutres ; le découpage du calcul lui-même déconseillé |
| 6 | §8 — `normaliserReponses` | moyen, risque produit | **instruit le 27/09/2026** : les deux affirmations de son en-tête épinglées sur 6 000 tirages ; le découpage n'est pas recommandé |
| 7 | §9 — renommer le fichier sous l'horodatage **enregistré**, une fois la migration appliquée | une habitude | **commencé le 21/09/2026** (C4.4) : une migration appariée, et la consigne d'avant était inapplicable |
| 8 | §12.5 — un comparateur mécanique des miroirs de `check` | petit | **fait le 20/09/2026** (§12.2) |
| 9 | §12.5 — l'artefact de la recette du premier parcours à régénérer depuis son `.md` | une manipulation | **fait le 20/09/2026** (§12.2) |

**Aucune de ces lignes ne bloque le lot 4**, et c'est volontaire : la dette relevée est de la dette
de *modification*, pas de fonctionnement. Le produit se comporte comme il doit ; il est seulement
plus coûteux à changer à certains endroits qu'à d'autres.

## 12. L'audit technique du 20/09/2026 — balayé, trouvé, et ce qui revient à la personne qui pilote

> Demandé le 20/09/2026 au matin : relire l'ensemble depuis le 23/08 et traiter seul ce qui est
> purement technique. Même règle qu'en §0 : chaque ligne est **mesurée**, sur la base vivante et sur
> l'arbre de travail, jamais déduite.

### 12.1 Ce qui a été balayé et trouvé sain

| Ce qui a été comparé | Résultat |
|---|---|
| Les 31 fonctions `security definer` de `public` et leur `search_path` | **toutes en `search_path=public`**, sauf la procédure `envoyer_rappels`, qui n'en porte pas **exprès** (`CLAUDE.md` : `set search_path` rend le contexte atomique et fait échouer son `commit`) — l'avis de sécurité Supabase la signalera à chaque passe, et il ne faut pas la « corriger » |
| Les 20 tables de `public` | **RLS active partout** ; cinq sans policy ni privilège client (`emission_factor_sync_runs`, `notification_outbox`, `purge_runs`, `reminder_send_runs`, `usage_event_types`), toutes serveur-only — l'avis `rls_enabled_no_policy` les nomme, et c'est l'état voulu |
| Les 23 policies | **toutes en `(select auth.uid())`**, aucune en appel direct |
| La matrice de privilèges | **identique à `20260910110000_grants_explicites.sql`**, ses trois privilèges inertes compris (la §5 de cette migration dit pourquoi ils existent) |
| Les fonctions que `anon` peut appeler | les pures (`emission_factor`, `resolve_*`, `season_bounds`, `rolling_quarter_bounds`, les deux `check_*`) et `desinscrire_des_rappels`, dont le jeton est l'autorisation — rien d'autre |
| Le schéma `analytics` | **inaccessible** à `anon` comme à `authenticated` : ni `usage` sur le schéma, ni privilège sur ses dix vues |
| Les 9 travaux `pg_cron` | **les sept qui avaient une échéance dans les 14 derniers jours sont tous verts** — les deux autres (facteurs, trimestriel ; boucle mensuelle, le 1er) n’en avaient pas —, aucune exécution en échec, chacun branché sur une fonction qui existe |
| Le jeu de fonctions du distant contre les migrations | **51 = 52 − 1** : la seule différence est `generate_monthly_checkins`, créée puis supprimée par le dépôt lui-même ; sept triggers, les mêmes des deux côtés |
| Le bloc `Functions` de `database.types.ts` contre le générateur | **identique**, à un caractère près qui est voulu (`p_teletravail: string | null`, §2) |
| Postgres et extensions | 17.6, canal `ga` ; `http` 1.6, `pg_cron` 1.6.4, `pgtap` 1.3.3 |
| TypeScript | `strict`, **zéro `any`** dans `src/` et `api/`, quatre `eslint-disable` tous argumentés sur place (des effets volontairement au montage seul) |
| Les modules de `src/types` | **chacun a son fichier de test** ; 810 tests, 39 suites |
| Les actions de la CI | `checkout` et `setup-node` en v7, `setup-cli` en v3, Node 22 partout, `expo-doctor` **21/21** (1.20.4 en CI, le même résultat en local le 20/09) |
| Les secrets | **aucun** motif de clé (JWT, Resend, AWS, clé privée) dans l'arbre de travail ; `.env` ignoré |
| Le dépôt public | `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md` présents ; en-têtes Vercel posés (`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, CSP en rapport seul — §12.3) |

### 12.2 Ce qui a été traité

- **§2, le contrôle des signatures** — fait : `scripts/verifier-types-base.mjs` compare le bloc
  `Functions` (noms, arguments, optionalité — pas les types, et le script dit pourquoi), dix
  mutations datées en tête, `SUPABASE.md` §2.1. Sa première CI a rougi sur une forme que le
  distant ne produit pas — le CLI émet `graphql_public` devant `public` — et c'est exactement ce
  que la PR devait éprouver ; les deux analyseurs sont bornés au schéma `public` depuis. Aucune plomberie CI ajoutée : le job produisait déjà
  le fichier.
- **L'alerte `fflate`** (`docs/exploitation/README.md` §8.8) — jugée inatteignable le 17/09, elle
  serait restée ouverte à chaque passe : `satori` épingle `0.7.3` au caractère près. Un `overrides`
  la porte à `0.7.5`, et la preuve que rien n'a bougé est **la carte rendue par le vrai `GET`
  d'`api/share-card.ts`, identique octet à octet avant et après** (32 693 octets, rendu déterministe
  vérifié sur deux passes). `npm audit` passe de 13 à 11 avis modérés ; les 11 restants sont la
  chaîne `uuid` ← `xcode@3.0.1` ← `@expo/config-plugins`, du code iOS que ce projet n'exécute jamais
  et qu'aucune montée d'amont ne ferme aujourd'hui.
- **Les sept clés étrangères sans index** que signale l'avis de performance — toutes vers
  `transport_modes` — restent sans index **par décision écrite** (`SUPABASE.md` §2.2), avec la
  condition qui la rouvre.
- **Le parcours réel en CI** (l'après-midi, sur le mandat « lead dev » du même jour). La question
  posée le matin — « y a-t-il quelque chose qui pourrait casser sans qu'on s'en rende compte ? » —
  avait une réponse mesurée : oui, 15 147 lignes d'écrans, de composants et de hooks, et 1 485
  lignes des fichiers de `src/lib` qui importent le client Supabase — que seule la recette gardait.
  (Les deux chiffres sont ceux du 20/09 au soir ; le second avait d'abord été écrit « 1 216 » sous
  la définition « `src/lib` », qui en compte 3 307 — c'est la définition qui se vérifie, pas le
  nombre.) `scripts/verifier-parcours-reel.mjs` joue le chemin nominal contre la stack
  Supabase locale à chaque PR, sur **deux profils** — celui de la recette et un cycliste au plan
  à zéro action —, la base relue après chaque écriture
  (`TESTING.md` §2.6). Deux constats de plus au passage : **Docker tourne dans l'environnement
  d'agent** (`sudo dockerd &`), donc pgTAP et ce parcours s'y exécutent — ce dépôt avait écrit le
  contraire ; et les `EXPO_PUBLIC_*` sont mises en cache par Metro hors de sa clé, donc un export qui
  change de configuration exige `--clear`.

- **Le comparateur des miroirs de `check`** (le soir même, §12.5 ligne 1 ci-dessous). Le relevé le
  donnait « petit, au troisième miroir ou à la première dérive » ; il y en avait **bien plus que
  trois**, et la dérive était déjà arrivée une fois en silence (`tc_access` a dit `aucun` avant de
  dire `inexistant`). Le compte exact ne s'écrit pas ici — le script l'imprime à chaque passage, et
  il grossit au prochain miroir déclaré. `scripts/verifier-miroirs-de-check.mjs` lit `pg_constraint` sur la base que les
  migrations viennent de construire, dans le travail `db-tests`, et compare — `TESTING.md` §2.7,
  douze mutations datées en tête du script. Trois choses valent d'être notées, parce qu'elles ont
  changé la forme prévue :
  - **le relevé se trompait de source.** Il proposait de relire le dernier `check (col in (…))` des
    fichiers de migration ; c'est faux dès qu'une contrainte est remplacée par un
    `drop` + `add` — il y en a — et dès qu'une colonne homonyme a vécu ailleurs avec un autre
    vocabulaire. `pg_constraint` sait ce que le texte ne sait plus ;
  - **la fragilité qu'il craignait a été contournée plutôt que réduite.** Un analyseur d'`as const`
    par expression régulière est ce qui inquiétait ; les constantes sont donc **importées** (Node
    retire les types, un crochet résout `@/`). Il ne reste d'analyse de texte que pour les unions de
    littéraux, qui n'existent pas à l'exécution — et c'est justement la famille que **rien** d'autre
    ne pouvait garder, un test Jest ne sachant pas énumérer un type ;
  - **les bornes numériques ne s'énumèrent pas**, donc elles s'évaluent : Postgres tranche
    lui-même l'expression de la contrainte pour chaque valeur proposée, et le plafond du covoiturage
    se prouve en constatant que `7` est refusé. Sans ça, une borne déplacée en base laisserait la
    puce « 6+ » mentir.

- **L'artefact de la recette du premier parcours, régénéré** — et la manipulation a trouvé plus que
  la note à reporter : l'artefact gardait son avancement dans le `localStorage`, c'est-à-dire
  précisément ce que `RECETTE.md` §1.7 interdit depuis le 17/09/2026, dans l'artefact qui avait servi
  à écrire la règle. Il porte maintenant la base partagée, et le repli local dit qu'il est un repli.
  La leçon est de forme : une règle écrite le jour même ne s'applique pas rétroactivement à ce qui
  l'a inspirée, et c'est en régénérant qu'on s'en aperçoit. `RECETTE.md` §2.5.

- **Le second profil du parcours réel** — le cycliste dont le plan ne porte aucune action. Ce
  n'est pas un cas de bord : depuis C2.5, tout cycliste et tout profil sédentaire y tombe, et c'est
  le seul chemin où la carte « Ton premier plan » ne se rend **jamais**, donc le seul où la barre
  d'onglets doit arriver autrement. Trois branches d'écran basculent d'un profil à l'autre, et
  aucune n'était jouée : la félicitation à la place des cartes, le cap qui ne chiffre pas, et
  l'absence de l'encart de contexte comme du lien vers les pistes. Le second profil tourne dans un
  contexte de navigateur **neuf**, parce que « premier » veut dire premier sur cet appareil.
  `TESTING.md` §2.6.

### 12.3 Ce qui revient à la personne qui pilote

Deux points, et aucun n'est un défaut. **Tous deux tranchés le 27/09/2026, selon la
recommandation** : Dependabot déclaré sur `github-actions` en passage mensuel
(`.github/dependabot.yml` — une PR par majeure et non une pour toutes, ce que la recommandation
ci-dessous ne disait pas et que `docs/exploitation/README.md` §8.9 impose : une action à la fois),
et la CSP laissée en rapport seul, sa réouverture inscrite comme une ligne de la checklist de
publication (§4 du même registre) plutôt que laissée dans ce paragraphe, où personne ne la relirait
le jour venu.

1. **Dependabot sur l'écosystème `github-actions`.** `docs/exploitation/README.md` §8.9 l'a déjà
   posé comme un arbitrage de rythme (« une PR de plus à traiter à chaque publication d'une
   action »), donc il n'a pas été fait ici. Recommandation : **oui, en regroupant par mois**
   (`groups` + `schedule: monthly`), parce que la dérive de trois majeures du 18/09 a coûté une
   session, qu'une PR de Dependabot ne déclenche **aucun déploiement** (`.github/` est dans la liste
   blanche de `vercel-ignorer-le-build.sh`) et que la CI est gratuite sur un dépôt public. Ce qu'on
   casse si on se trompe : rien — une PR qu'on ferme.
2. **La `Content-Security-Policy-Report-Only` ne rapporte à personne.** Elle n'a ni `report-to` ni
   `report-uri` : les violations vont dans la console du navigateur de chaque visiteur et nulle part
   ailleurs, donc elle ne prépare pas la bascule en mode bloquant qu'un « report-only » existe pour
   préparer. Trois options — la laisser (elle ne coûte rien), lui donner un collecteur (une fonction
   `api/` de plus, donc du Functions Storage), ou la passer en bloquant sans mesure (le risque exact
   que le mode rapport existe pour éviter). Recommandation : **la laisser tant qu'il n'y a pas de
   trafic**, et rouvrir la question à la mise sur Play. Ce qu'on casse si on se trompe dans le sens
   « bloquant » : l'app entière, sur web, pour tout le monde.

### 12.4 Examiné, et laissé tel quel

- **Le rafraîchissement de session sur natif** (`src/lib/supabase.ts`). Supabase recommande de
  brancher `startAutoRefresh` / `stopAutoRefresh` sur `AppState` en React Native ; ce n'est pas
  fait, et ce n'est pas un défaut de correction : `getSession()` rafraîchit à la demande un jeton
  expiré, et `useRafraichirAuRetour` relit déjà au premier plan. C'est de l'hygiène de batterie, sur
  du code d'auth — déclencheur `SUPABASE.md` — et ça se fera avec un chantier d'auth, pas en marge
  d'un audit.
- **Quatre index « inutilisés »** (`unused_index`) : le produit n'a pas de trafic, et deux d'entre eux
  ne servent que des suppressions (`SUPABASE.md` §2.2).
- **`minimum_password_length = 6`** dans `supabase/config.toml` : il n'y a pas de mot de passe dans le
  produit (`v1-10` §2.D), la valeur ne gouverne rien.
- **Les migrations sans horodatage apparié** (§9) : rien de neuf, la règle vaut à la prochaine
  migration.

### 12.5 Ce que la journée a ajouté au relevé

- **Les miroirs de `check` étaient épinglés par des tests à valeurs recopiées, pas comparés au
  schéma** — traité le soir même (§12.2), mais le relevé est gardé tel quel : c'est lui qui dit
  pourquoi la forme prévue a changé.

  `STATUT_DE_BILAN` et `STATUT_DU_POINT` (20/09) rejoignent `PARTS_DU_SECOND_MODE`,
  `TAILLES_DE_COVOITURAGE`, `OCCUPATIONS_LONG_TRAJET` et les deux listes de tranches : chacun a son
  test, chaque test porte les valeurs du `check` **recopiées à la main**, datées. C'est la convention
  du dépôt et elle tient ; ce qu'elle ne fait pas, c'est lire la migration. Un comparateur de la
  famille de `verifier-hypotheses-calcul.mjs` — lire le dernier `check (col in (…))` de chaque
  colonne dans `supabase/migrations/`, le comparer à la constante TypeScript — fermerait la dérive
  pour les six d'un coup. Pas fait le 20/09 : un analyseur de `as const` par expression régulière
  est exactement là où la fragilité vit, et il vaut mieux l'écrire une fois pour six que deux fois
  en passant.
- **L'artefact de la recette du premier parcours** (`RECETTE.md` §2.5) n'a pas été régénéré après
  la note ajoutée en tête de `docs/recette/premier-parcours-web.md` le 20/09 : la note est du
  contexte, pas une ligne à cocher, donc l'artefact n'est pas faux — mais §1.1 de `RECETTE.md` dit
  que le `.md` est la source et que l'artefact se régénère depuis lui, et cette règle ne souffre pas
  d'exception « pour une phrase ». À faire avant la prochaine séance.
- **Ce que le parcours réel ne garde pas**, pour que personne ne le lui prête : les exclusions de
  cartes (§4 — le chantier D, à instruire), les états d'erreur au-delà de ceux de
  `verifier-etats-export.mjs`, tout ce qui est natif (notifications, jeton d'appareil, retour au
  premier plan), et le second bilan — le re-bilan, la reconduction d'une saison, le contexte corrigé
  depuis `/contexte`.

  **Le second profil annoncé ici le jour même a été écrit le soir même** (§12.2) : le cycliste au
  plan à zéro action, bloc 09 de la recette. Il coûtait bien moins que le premier — la mécanique
  était là —, et il a rendu trois branches d'écran qu'aucun des deux filets ne touchait. Ce qui
  reste au-dessus est inchangé.

  *Note du 27/09/2026* : deux lignes de cette liste ont bougé. Les exclusions de cartes ne sont
  plus « à instruire » : `cartesDuPlan` les tient sur toutes les combinaisons d'états (§4), et le
  parcours n'en garde que deux arguments. Et le parcours joue désormais **un** second bilan — le
  cycliste refait le sien en voiture —, mais ni la reconduction d'une saison, ni l'encart orphelin
  (le cycliste n'a rien engagé), ni le contexte corrigé depuis `/contexte`.

### 12.6 La contre-lecture de la contre-lecture (20/09/2026, le soir)

La contre-lecture de la journée avait corrigé six affirmations fausses. **Relue à son tour, elle en
portait elle-même.** Le fait mérite d'être écrit tel quel : une contre-lecture n'est pas une
garantie, c'est un passage de plus, et rien ne dit qu'il faille s'arrêter au deuxième.

Ce que la relecture du diff a trouvé, et qui a été corrigé :

- **La garde d'`api/` affirmait un point qu'elle ne pouvait pas voir.** L'assertion neuve
  `carteRelative.status === 200` ne pouvait tomber sous **aucune** entrée — `GET` n'a que deux
  sorties, le rendu et le repli, et toutes deux rendent 200 —, et son message nommait pourtant la
  base factice disparue. Pire : la garde ne prouvait pas que la chaîne de requête **survive** à
  l'analyse. Mesuré en la cassant : `request.url` → `request.url.split('?')[0]` laisse la suite
  **entièrement verte** alors que la carte ne porte plus aucun chiffre, parce que la mutation
  dégrade les deux appels à l'identique et que le seuil de 10 000 octets tient encore à 21 ko. Un
  troisième rendu, **sans aucun paramètre**, est le témoin qui tranche.
- **Quatre miroirs de `check` n'étaient pas déclarés**, alors que `CLAUDE.md` promettait le jour
  même que **toute** recopie l'était : `CanalPrefere` (la préférence de canal de rappel),
  `IntentionTiming`, `LoopType` et `POSTES`. Déclarés et éprouvés — le comparateur passe de 17 à
  **21** miroirs. La promesse d'exhaustivité est remplacée par ce qui est vrai : une liste
  **déclarée**, plus les deux formes qui lui échappent structurellement (`TESTING.md` §2.7).
- **Le geste qui rendait `LoopType` utile manquait.** Le type était nommé depuis
  `src/constants/postes.ts`, mais six endroits réécrivaient `'commute' | 'extras'` à la main : le
  déclarer n'aurait donc gardé personne. Les six l'importent désormais.
- **Une garde neuve était partie sans sa mutation** — l'assertion des kilos du second profil, ce que
  `TESTING.md` §1.1 interdit explicitement. Faite depuis : le seuil de `valeurEtUnite` passé de
  `kilos < 1000` à `kilos < 10` fait tomber « 11 kg CO₂e » et **rien d'autre**, le premier profil
  restant en tonnes à 4 231 kg.
- **Cinq comptes ou pointeurs faux**, tous de la famille « une phrase qui décrit ce que le code
  faisait avant » : 15 143 lignes au lieu de 15 147 dans l'en-tête du parcours ; le seuil kg/t
  annoncé dans `src/types/resultat.ts` alors qu'il vit dans `src/lib/format.ts` ; deux lignes de
  dette traitées annoncées dans `produit.md` là où le tableau en marque trois ; le profil du
  parcours au singulier dans `v1-27` §12.2 et `TESTING.md` §2.6 après l'arrivée du second ; et
  « sept mutations » pour le comparateur, qui en documentait huit.
- **`VERCEL.md` comptait mal ce qu'il garde.** « Tout sauf le deuxième point s'éprouve » en oubliait
  un cinquième : `maxDuration` n'est chronométré par rien. Les points gardés sont nommés un par un,
  et les deux qui ne le sont pas aussi.

**Ce qu'il faut en retenir, et qui vaut plus que les corrections** : les défauts d'une contre-lecture
sont de la **même famille** que ceux qu'elle corrige — un compte qui se périme, une phrase restée sur
l'état d'avant, une garde affirmée plus large qu'elle n'est. Écrire « j'ai contre-lu » ne met à l'abri
de rien. La seule chose qui a réellement tranché, ici comme le matin, c'est **la mutation** : deux des
six défauts ne se voyaient qu'en cassant ce que la garde prétendait garder, et l'un d'eux a survécu à
une première correction avant de tomber sur la seconde.

### 12.7 La relecture du dépôt entier (20/09/2026, après la précédente)

Troisième passage de la journée, demandé après que le second eut trouvé seize défauts dans le
premier. **Il en a trouvé neuf de plus**, dont trois en base. Le fait à retenir n'est pas le
nombre : c'est qu'**aucun des trois passages n'a épuisé le sujet**, et que rien ne dit que le
quatrième le ferait.

**Traité tout de suite** (technique, sans conséquence sur le produit) :

- **`cadreDuPlan` portait une branche qui ne pouvait rien changer** — `postesEnAvant.length === 0`
  rendait le **littéral identique** au repli deux lignes plus bas, depuis que C5.3 avait retiré
  `intro` et `noteDuCap` sans reprendre la justification. Le test qui la « gardait » affirmait
  `.toBe(true)`, ce que le repli rendait déjà : il ne pouvait pas tomber.
- **Et la doc dictait une régression.** Ce fichier et `CLAUDE.md` annonçaient « deux causes qu'un
  `||` rendrait à moitié inéprouvables ». Appliquer cette phrase donne
  `nombreDActions === 0 || postesEnAvant.length === 0`, en croyant la fusion neutre — et **un plan à
  cinq actions dont aucune n'est en avant cesserait de chiffrer son cap**, exactement ce que le
  commentaire de la branche jurait empêcher. Le test compare désormais les deux formes à nombre
  d'actions égal ; la mutation le confirme, il tombe sur la fusion et sur elle seule.
- **`/plan/pistes` jetait le message d'un remplacement refusé.** Le contrat d'`ActionCommitment` est
  explicite — « C'est l'écran qui la porte » —, l'écran du plan le fait depuis le 14/09/2026, et
  l'écran que C5.2 a ajouté après ce correctif ignorait le paramètre et ne rendait rien : la liste
  se réordonnait sans qu'un mot dise pourquoi le choix n'avait pas été pris. Le message est rendu
  **juste au-dessus de la liste** et non en tête d'écran, pour rester dans le champ de vision.
- Deux comptes périmés dans des blocs de doc (« trois phrases en dépendent » pour un champ lu une
  fois ; « Trois choses à ne pas défaire » suivi de quatre puces, la quatrième — celle qui interdit
  une valeur par défaut sur la ligne de Ramille — tombant hors du compte annoncé).

**Traité le 20/09/2026 au soir, après accord** (migration
`20260920160000_trois_surfaces_plus_larges_que_leur_intention.sql`, assertions en
`30_surfaces_d_ecriture.test.sql`, trois mutations datées). Le relevé est gardé tel quel parce
qu'il dit pourquoi **deux des trois correctifs ne sont pas ceux qui étaient proposés ici** :

1. **Le garde-fou de volume du canal de retour ne tient pas.** `feedback` a une policy `DELETE`
   owner-scoped et le privilège qui va avec ; le trigger compte les lignes **vivantes** sur 24 h.
   Dix retours, on efface, on recommence. Le droit à l'effacement n'est pas en cause (RGPD, annoncé
   par `/confidentialite`) : le défaut est de compter ce que la personne peut effacer. Le correctif
   ne retire pas le `DELETE` — il compte autre chose.
2. **`assessment_answers` a une policy `UPDATE` sans prédicat de statut.** Un client peut réécrire
   les réponses d'un bilan **déjà `completed`** : `assessment_results` reste figé sur l'ancien
   chiffre, puis le prochain recalcul serveur fait bondir le total **sans qu'aucune ligne ne soit
   ajoutée à `assessments`**. C6.4 justifie pourtant son RPC par « le bornage des colonnes », et son
   commentaire dit : « Le dire évite qu'un prochain passage retire le RPC en simplifiant. » Le RPC
   ne borne rien tant que la policy est là. Correctif : `and a.status = 'in_progress'` dans
   `using`/`with check` — la soumission upserte avant la bascule, donc rien ne casse.
3. **`assessments.submitted_at` n'est pas une date serveur.** Le trigger ne la pose qu'à la
   **transition** ; ensuite la policy `UPDATE` owner-scoped laisse le client l'écrire. La garde
   d'idempotence du plan croit comparer deux horodatages serveur. **Latent** : l'app n'envoie jamais
   cette colonne, et l'engagement survit à la reconstruction (C2.2 fait son travail). Attention au
   correctif : figer la colonne hors transition entre en conflit avec les fixtures pgTAP, qui
   reculent la date par `update` — elles devraient désarmer le trigger comme le fait le backfill de
   C2.4.

**Ce que la mise en œuvre a changé au plan ci-dessus**, et qui vaut plus que les correctifs :

- **Pour `feedback`, le relevé recommandait de « ne pas retirer le DELETE (droit à l'effacement
  RGPD) » et de compter autre chose. C'était une prémisse non vérifiée, et elle était fausse** : la
  policy ne porte **aucune** justification dans sa migration, là où chaque autre décision du même
  fichier porte la sienne ; aucun écran ne l'emprunte (`src/lib/feedback.ts` ne fait qu'un
  `insert`) ; et `src/app/confidentialite.tsx` documente déjà la table comme « insert-only côté
  client ». Le schéma contredisait la page qui l'explique aux gens. Le DELETE est donc parti, ce
  qui ferme le trou sans table annexe, sans changement d'export et sans toucher aux types.
  L'effacement reste garanti là où il est promis : cascade à la suppression de compte, purge à
  90 jours.
- **Pour `submitted_at`, le correctif n'est pas un trigger mais un privilège de COLONNE.** Le
  relevé prévenait qu'un trigger entrerait en conflit avec les fixtures pgTAP qui reculent la
  date ; le privilège de colonne ne les touche pas (elles tournent en propriétaire), resserre les
  **quatre** colonnes du même geste plutôt que la seule qu'on avait remarquée — `authenticated`
  pouvait écrire `id` et `user_id` aussi —, et c'est l'outil que Postgres donne exactement là où
  la RLS s'arrête. Premier emploi dans ce dépôt ; `SUPABASE.md` §2.2 dit ses trois pièges, dont
  celui-ci : `role_table_grants` ne voit pas les privilèges de colonne, donc une matrice bâtie sur
  cette vue lit « plus aucun UPDATE » et ne dit rien de la colonne restée ouverte.
- **Et la matrice du test `18` a rougi d'elle-même**, ce qui est la garde faisant son travail :
  elle porte le schéma entier, donc toute migration qui change un privilège doit passer par elle.
  Deux assertions y ont été ajoutées pour la forme qu'elle ne peut pas voir.

**Traité aussi le 20/09/2026 au soir** (migration
`20260920170000_les_quatre_portes_que_la_mesure_ne_voyait_pas.sql`) : quatre navigations vers
`/connexion/retrouver` ne passaient pas de `source` — les deux états vides du plan, celui du suivi,
la session refusée — et étaient comptées comme venant de l'accueil de l'onboarding, sur leurs
**deux** dimensions. Le défaut exact que le commentaire de `SOURCES_RETROUVER` décrit pour `lien`,
vivant à quatre autres endroits pendant qu'il l'expliquait. La plus coûteuse est `rappel` :
quelqu'un qui ouvre le rappel e-mail sur un appareil sans session, c'est-à-dire le chiffre même
que C2.11 existe pour produire, rendu indiscernable d'une découverte.

**Et la cause tenait à un endroit, pas à quatre oublis.** Le garde qui ramène la provenance aux
valeurs déclarées — `sourceMesuree` — vivait **dans l'écran**, sous la forme d'une **seconde liste
écrite à la main** (`if (source === 'email') …` sur trois valeurs), alors que sa jumelle
`sourceConnexion` vit dans `src/types/analytics.ts` et se dérive de la sienne. Or les écrans ne sont
pas testés, par décision : **rien ne pouvait le dire**. C'est la règle du dépôt qui n'était pas
suivie — toute dérivation pure décidant d'une navigation vit dans `src/types`. Elle s'y trouve
désormais, sous le nom `sourceRetrouver`, dérivée et éprouvée : remettre la liste manuelle fait
tomber deux assertions, avec le message du défaut réel (`rappel` → `onboarding`).

Ce que la migration fait, elle, est mince et son en-tête le dit : elle réécrit la **description** du
référentiel, seul endroit où la base peut porter les valeurs attendues — `check_usage_event_props`
ne compte que des clés et des longueurs. **Aucun contrôle ne compare cette description à
`SOURCES_RETROUVER`** : c'est de la prose, et le comparateur de miroirs ne lit que des `check`. La
parade reste l'habitude, et c'est écrit plutôt que supposé.

### 12.8 La garde de l'écran blanc était aveugle à l'écran blanc (20/09/2026)

Le constat le plus grave de la journée, et il vient de la quatrième relecture — celle qui ne
cherchait qu'une chose : **quelle assertion ne peut pas tomber ?**

`scripts/verifier-rendu-export.mjs` existe pour attraper la page blanche du 08/09/2026. Il attendait
bien le signal qui distingue « servi » de « monté » — une propriété que React pose sur son conteneur
au montage —, **mais il avalait le résultat** (`.catch(() => {})`), sous un commentaire qui affirmait
« ce sont les contrôles ci-dessous qui disent ce qui a échoué ». C'était une erreur de raisonnement :
les contrôles ci-dessous lisent le corps de la page, or l'export d'Expo Router **pré-rend** ce corps —
le paragraphe juste au-dessus le disait lui-même. Ils restent donc verts sur une app qui ne monte
jamais.

**Mesuré en le cassant** : le bundle d'entrée retiré de `dist/`, l'app intégralement morte dans le
navigateur, le script sortait **0** en annonçant « 12 routes rendues, aucun écran de panne, aucune
exception bloquante ». `page.on('pageerror')` ne rattrape pas ce cas : il ne se déclenche que si le
bundle s'exécute **et** lève ; un bundle qui ne se charge pas du tout n'émet rien.

L'attente est désormais une assertion, **en tête de la cascade** — une app qui ne monte pas rend le
pré-rendu, donc dire « le marqueur est là » cacherait la cause derrière l'absence de symptôme. La
même mutation rend maintenant un écart par route, nommant la vraie cause.

**Trois autres assertions qui ne pouvaient pas tomber, corrigées dans la foulée** :

- `verifier-api.mjs` affirmait le **statut** et le **content-type** des deux fonctions, dans les
  blocs 1 et 2, pendant que son propre en-tête annonçait les avoir retirés du bloc 1 bis. Les deux
  fonctions enveloppent tout leur corps dans un `try/catch` et leurs deux sorties passent par le
  même constructeur de réponse : aucune panne du rendu ne pouvait les faire tomber — vérifié, une
  exception jetée en tête du rendu donne cinq écarts et pas un mot sur ces quatre-là. Retirées ; la
  suppression ne coûte rien, la même mutation rend toujours cinq écarts.
- `26_pistes_et_premier_pas.test.sql` comparait deux `position()` pour affirmer que le refus `RM001`
  précède la libération. **`position()` rend 0 quand le motif est absent** : sans la garde,
  l'expression devenait `0 < 2373`, vraie, sous un message affirmant l'inverse. Elle ne voyait
  qu'une réorganisation, jamais une suppression. Les deux motifs doivent désormais être présents.

**Trois autres signalées comme « tautologies sans conséquence » — et le relevé s'est trompé sur
deux d'entre elles.** Reprises le 20/09/2026, mutation à l'appui plutôt qu'à la lecture :

- **`carbon-reference.test.ts` n'était pas une tautologie.** Le relevé disait « compare deux alias à
  eux-mêmes » ; or remplacer `FRANCE_AVERAGE_TOTAL_T = CONSUMPTION_POSTES_TOTAL_T` par `9.3` — le
  défaut historique exact que l'en-tête du fichier raconte, un total repris d'une autre publication
  — **fait tomber l'assertion**. Elle garde bien ce qu'elle annonce. Ce qui lui échappait est
  ailleurs : `toBeCloseTo(…, 1)` tolère 0,05 sur une valeur de 0,6, donc l'arrondi du repère 2050
  entièrement retiré la laisse verte — et cet arrondi n'est pas de la mise en forme, c'est le
  **seuil** de `comparisonNote` (600 kg arrondi, 589 sans). Une assertion de propriété a été
  ajoutée ; l'ancienne reste.
- **`mascotte.test.ts` tombe sur une valeur différente et pas sur un littéral égal.** Deux
  mutations : `MASCOT_NAME = 'Rami'` la fait tomber, `MASCOT_NAME = 'Ramille'` la laisse verte.
  Aucune assertion de runtime ne distingue un alias d'un littéral égal, donc c'est le **titre** qui
  était faux (« à changer ici et nulle part ailleurs ») : il annonçait une propriété de la source.
  Le titre dit maintenant ce que l'assertion voit, et les deux mesures sont écrites au-dessus.
- **`analytics.test.ts` était bien vacante**, et son commentaire le disait (« purement statique »).
  Jest efface les types : l'assertion ne pouvait tomber pour aucune raison. Ce qu'elle annonçait
  garder — « le démarrage et le retour au premier plan n'écrivent pas des lignes indistinguables » —
  n'était éprouvé nulle part, et en cherchant où, on trouve le vrai trou : **la règle du retour au
  premier plan vivait en variable mutable dans le layout racine**, sans test. Elle porte un piège
  iOS (`inactive` traversé à l'aller *et* au retour) dont l'oubli ferait perdre **la totalité** du
  chemin du rappel, en silence — la série ne montrerait pas un trou, elle montrerait une plateforme
  qui ne revient jamais au premier plan. Extraite en `suivreLEtatDeLApp` (`src/types/analytics.ts`),
  quatre tests, trois mutations qui tombent chacune sur la sienne.

**La leçon de ce sous-lot** : un relevé de tautologies fait à la lecture se trompe dans les deux
sens. Deux des trois gardes accusées tenaient ; celle qui ne tenait pas cachait un défaut plus
grand qu'elle.

**La leçon, et c'est la quatrième fois dans la journée** : une garde s'écrit en se demandant ce qui
doit la faire tomber, jamais ce qu'elle doit confirmer. Les quatre défauts ci-dessus étaient verts,
documentés, et cités comme preuve dans trois fichiers.

### 12.9 Revue de sécurité avant ouverture au public (20/09/2026)

Quatre revues menées en parallèle sur des surfaces disjointes — authentification, contrôle d'accès
en base, surfaces publiques, client et vie privée —, **chaque constat re-vérifié à la main avant
d'être retenu**. C'est la discipline que la journée a imposée : un rapport n'est pas une preuve.
Deux constats sur les onze remontés ne se sont pas reproduits tels qu'annoncés, et un troisième
s'est reproduit pour une autre raison que celle donnée.

**Ce qui tient, et qui ne tenait pas d'évidence.** Les 24 policies sont bornées au propriétaire ;
rejouées depuis la session d'un tiers contre un compte complet, les lectures croisées rendent zéro
ligne sur les onze tables de données personnelles. Le schéma `analytics` n'est pas exposé. Le jeton
de désinscription est à usage unique, ne distingue pas l'inconnu de l'utilisé, et ne peut rien
d'autre que couper les rappels de son porteur. Zéro secret dans l'arbre **et dans les 340
révisions**. Les deux fonctions `api/` ont été bombardées d'entrées hostiles sous Node — 5 000
caractères, paires de substitution coupées, `U+202E`, NUL, `1e400` — sans une panne.

**Les trois failles de base, toutes de la même forme** : une garde existait, elle tenait sur le
chemin qu'on avait regardé, et un second chemin la contournait sans rien lever.
`20260920190000_trois_gardes_qui_manquaient_sous_les_gardes.sql` les ferme, `31` les épingle, et
les trois mutations tombent chacune sur ses propres assertions sans toucher aux moitiés positives.
Le détail est en tête de la migration ; ce qui mérite d'être retenu ici :

1. **Les privilèges par défaut rendaient FAUSSE la règle la plus citée du dépôt.** Détaillé en
   §12.8 ci-dessus pour la leçon, en `SUPABASE.md` §2.2 pour la mécanique. C'est le seul des trois
   qui **grandissait tout seul** : il ne coûtait rien aujourd'hui et aurait coûté une table entière
   ouverte à `anon` le jour où quelqu'un aurait fait confiance à `CLAUDE.md`.
2. **Le plafond de retours comptait une date que le client posait.** 500 lignes de 2 000 caractères
   acceptées d'affilée, mesurées, depuis une session anonyme obtenue à la simple ouverture de
   l'app. Et un retour daté dans le futur rendait le compte **immortel** face à la purge à 90 jours.
   Le correctif est un trigger d'estampille et non un privilège de colonne, parce que la date doit
   valoir `now()` pour tout le monde — c'est la forme qu'ont déjà ses deux jumelles, et
   `feedback.created_at` était la seule des trois à ne pas l'avoir.
3. **Le bornage écrit le matin même se franchissait en trois ordres.** `20260920160000` a borné
   l'UPDATE d'`assessment_answers` à `status = 'in_progress'` ; la borne tient en direct (`UPDATE
   0`, mesuré) et tombait en rouvrant le bilan, réécrivant, refermant. Le troisième ordre repose en
   plus `submitted_at` **par le trigger d'estampille** — donc libère l'action engagée que C2.2
   existe pour protéger, et ment sur l'âge du bilan. C'est le constat le plus instructif de la
   journée : *le correctif du matin était juste et incomplet, et rien dans sa propre suite de tests
   ne pouvait le dire — elle éprouvait le chemin qu'il avait fermé.*

**Corrigé dans le même lot, côté client et surfaces publiques** :

- **L'adresse e-mail sortait dans une URL.** `/connexion/email` renvoyait vers
  `/connexion/retrouver?email=…` sur une collision : donc dans la barre d'adresse, l'historique du
  navigateur et son autocomplétion, et dans les journaux d'accès. C'était la **seule** donnée
  personnelle du produit à voyager ainsi — tout le reste est un uuid ou un mot d'un vocabulaire
  fermé. Le mécanisme sans URL existait déjà à dix lignes de là (`memoriserAdresseDuLien`) ; c'est
  son garde qui l'écartait de ce chemin. Le paramètre `email` a été **retiré du type de l'écran**,
  pour qu'il se lise « retiré » et non « réservé ».
- **La page de partage recopiait sa chaîne de requête entière** dans l'`og:image`. Un paramètre
  inconnu ajouté par un tiers voyageait donc jusqu'à l'URL que chaque lecteur d'aperçu va chercher,
  et `share-card` posant un cache d'un an, chaque valeur inédite était une clé de cache neuve —
  donc un rendu satori + resvg complet, à volonté. La query est reconstruite à partir des trois
  valeurs lues ; `verifier-api.mjs` porte l'assertion inverse de celle qui existait (« ce
  paramètre-ci ne doit **pas** survivre »), et la mutation la fait tomber.
- **`url.origin` était la seule valeur injectée dans un attribut sans échappement**, sous un
  commentaire qui justifiait de ne pas réécrire les `&` — ce qui est juste, et ne disait rien de
  l'origine. Inatteignable derrière le routage de Vercel ; l'asymétrie se lisait comme un oubli.
- **`feedback.context` n'était pas écrêté** alors que la colonne porte `check (length <= 120)` : un
  lien `/feedback?context=<121 caractères>` faisait lever un `23514` que `sendFeedback` ne
  reconnaît pas, donc « Vérifie ta connexion » sur le **seul canal de retour du produit**,
  indéfiniment, alors que la connexion va bien.

**Et deux affirmations fausses dans les documents qui sont eux-mêmes la garde** : `CLAUDE.md`
attribuait le périmètre Android à `assetlinks.json`, qui délègue en réalité **tout** le domaine
(`handle_all_urls` est la seule relation qu'Android accepte) — ce qui tient le périmètre est le
`pathPrefix` d'`app.json`, et lui seul ; et `redirect-urls.md` §4 écrivait que la confirmation
d'adresse ne passe aucune redirection, faux depuis que `linkEmail` prend un `redirectTo`
obligatoire — un relecteur appliquant ce paragraphe aurait pu retirer l'entrée dont ce flux dépend.

**Ce qui reste ouvert, et pourquoi ça n'a pas été fait ici** : les quatre entrées `vercel.app` de
la liste des Redirect URLs (`docs/exploitation/redirect-urls.md` §3.1 bis — relevé en direct,
condition tombée, geste refusé par le garde-fou de permissions de l'environnement), l'entrée
`localhost:8081` (question ouverte depuis le 10/09, et c'est une décision qui se prend, pas une
règle qui s'applique), le passage en `flowType: 'pkce'` (qui change ce que la personne peut faire :
un lien ne s'ouvrirait plus que sur l'appareil qui l'a demandé), le pré-détournement d'adresse par
`/connexion/email`, et la CSP en `Report-Only` sans collecteur (§12.3, dont ce moment **est** la
condition de réouverture).

### 12.10 Le passage en PKCE, et trois gardes qui ne pouvaient pas tomber (20/09/2026)

Arbitré par la personne qui pilote le 20/09/2026 (« OK pour passer à PKCE »), après le relevé du
§12.9 : en `implicit`, la liste des Redirect URLs était le **seul** contrôle existant sur un
compte, et quatre entrées trop larges y avaient été trouvées le jour même. Le coût assumé est
produit : **un lien ne s'ouvre plus que là où il a été demandé.**

**Ce que le chantier a réellement fermé, mesuré des deux côtés.** Avec le flux implicite, une URL
portant les jetons d'un tiers fait basculer la session de la victime sur le compte de l'attaquant
(`05b1f277…` → `a7b84d72…`, joué dans un navigateur) ; en PKCE elle ne bouge pas. Le scheme
`ramille` étant BROWSABLE, n'importe quelle page web du téléphone pouvait déclencher ça.

**Le vrai enseignement n'est pas le chantier, ce sont les trois gardes qui sont passées pour une
mauvaise raison** — trois fois dans la même journée, sur le même chantier, et chacune trouvée par
le cran du dessus :

1. **Une restauration de mutation a interverti deux messages.** `str.replace(x, y, 1)` a remplacé
   la **première** occurrence de la chaîne, qui n'était pas celle qu'on venait de muter :
   `lien_expire` et `lien_ouvert_ailleurs` ont échangé leurs textes. Le typecheck, le linter et
   les tests sont restés verts — l'assertion existante vérifiait que les messages sont
   **différents**, pas qu'ils sont à la bonne place. Quelqu'un dont le lien est parfaitement
   valable aurait lu « il a expiré », en aurait redemandé un, et serait retombé sur le même mur.
   *Trouvé par le script de bout en bout, qui a lu l'écran.*
2. **L'assertion d'injection relisait « une » session au lieu d'attendre un changement**, donc
   ramenait l'ancienne avant que le SDK n'ait fini.
3. **Et surtout : elle injectait pendant que l'app se routait encore.** La racine redirige côté
   client, et cette redirection emporte la navigation lancée en même temps, fragment compris —
   l'attaque n'avait pas lieu, et le script concluait « refusée ». Flux implicite remis, il
   restait **vert sur la faille qu'il existe pour voir**. *Trouvé en exigeant qu'une mutation
   fasse tomber ce qu'elle est censée faire tomber, et en instrumentant quand ce n'est pas le
   cas.*

**La règle qui en sort, et elle est portable** (écrite en `TESTING.md` §1.1 et §2.9) : *une garde
dont le succès est une **absence** doit laisser à ce qu'elle interdit le temps **et** les
conditions de réussir.* Sinon elle mesure son propre empressement. Et corollaire de mécanique :
**une mutation se défait en réécrivant l'état d'avant, jamais par un second remplacement
textuel** — la chaîne qu'on remet existe souvent ailleurs dans le fichier.

**Ce que la couverture ne prend pas — écrit, pour que personne ne le déduise du silence** : le script est web, donc
`createSessionFromUrl` — la branche native — n'y est pas jouée. Le pas sur appareil reste à
`RECETTE.md`, et c'est le seul endroit où le retour Google natif et le lien ouvert depuis une
messagerie se vérifient.

### 12.11 Ce que coûte un test d'écran — mesuré sur `pistes.tsx` (20/09/2026)

La question posée le 20/09/2026 (« vu ton point 2, on ne devrait pas se mettre à tester les
écrans ? ») ne se tranche pas par argument : 15 000 lignes d'écrans ne sont gardées que par la
recette sur appareil, et c'est beaucoup — mais un test qui coûte cher et n'attrape rien est pire
que pas de test. Un test a donc été écrit pour **mesurer**, sur un écran représentatif
(453 lignes, quatre dépendances à doubler, deux états d'échec).

**Le prix, relevé et non estimé.**

| Ce qu'on paie | Mesure |
| --- | --- |
| Dépendances | 17 paquets, +9 Mo dans `node_modules` |
| Réglages | un `moduleNameMapper` pour le CSS + un fichier de doublure |
| Le fichier | 173 lignes pour **4 assertions utiles** |
| Doublage / assertions | 18 lignes de doublure contre 13 lignes d'assertion |
| Modules doublés | 4 (le transport, le contexte de pile, la navigation, la carte) |
| Temps de suite | 4,44 s → **5,39 s** (+21 %) |
| Temps CPU | 9,3 s → **15,2 s** (+64 %) — c'est le chiffre qui compte sur un runner |

**Trois frottements d'installation**, tous invisibles tant qu'on ne teste que de la logique pure :
une variable citée dans une fabrique `jest.mock()` doit être préfixée `mock` (jest hisse les
appels) ; `react-test-renderer` doit correspondre **exactement** à la version de React ; et
`src/constants/theme.ts` importe `@/global.css`, que jest ne sait pas lire — donc **tout** test
d'écran échouait au chargement avant qu'une doublure ne soit posée.

**Ce que ça attrape, et c'est la moitié qui décide.** Les quatre assertions portent sur des
**branches de rendu**, pas sur des dérivations : aucune n'est visible depuis `src/types` (qui ne
connaît pas l'écran) ni depuis le parcours réel (qui ne joue que le chemin heureux). Quatre
mutations, quatre chutes :

- l'échec de lecture qui reçoit le libellé de l'état vide — c'est la règle de C1.4, « on ne dit
  jamais *tu n'as rien* quand c'est la lecture qui a manqué », et elle n'était gardée nulle part ;
- la phrase d'intro figée sur sa branche « sans engagement » ;
- `onRefus` ramené à `rafraichir()` seul, c'est-à-dire **l'état d'avant le correctif du
  20/09/2026** : le défaut réel rejoué, et le test tombe ;
- l'état vide affiché **au-dessus** des pistes.

**Et la quatrième a d'abord révélé un trou dans le test lui-même** : il n'affirmait que des
présences, jamais une absence, donc la condition pouvait sauter entièrement sans qu'il bouge. Une
garde qui ne vérifie qu'une présence laisse toujours passer l'excès — corollaire direct de la
règle écrite en `TESTING.md` §1.1.

**Ce que ça ne vaut pas.** Le test du refus doit rejouer **deux gestes** (ouvrir la ligne, puis
agir sur la carte), donc il se couple à la conception d'interaction et non à un contrat : le jour
où les cartes s'ouvrent autrement, il casse sans qu'aucune promesse n'ait bougé. Et la carte est
doublée — ce qu'on monte est **l'écran moins ses cartes**, pas « la page telle qu'elle est ».

**Recommandation — oui, mais sur un critère, pas sur une surface.** Pas de campagne de couverture
d'écrans : le coût CPU est réel et la brittleness l'est aussi. On écrit un test d'écran quand, et
seulement quand, **on peut nommer la mutation qu'il fait tomber** et que cette mutation n'est
visible ni par `src/types` ni par le parcours réel. En pratique ça vise une famille étroite et
précieuse : les **branches d'état** (chargement / erreur / vide / plein, où vit la règle de C1.4)
et le **câblage d'un message** — c'est-à-dire exactement les deux endroits où les défauts de la
contre-lecture du 20/09 se trouvaient. Tout le reste — la mise en page, « est-ce que ça rend »,
l'apparence — reste à la recette sur appareil et à `verifier-etats-export.mjs`.

**Et un quatrième frottement, trouvé par la CI et pas en local** : un test d'écran **ne se
colocalise pas**. `src/app/` est le routeur, `expo-router` n'ignore que quatre préfixes, donc un
fichier de test posé à côté de `pistes.tsx` a produit une **route** « /plan/pistes.test »,
exportée et servie. `verifier-titres-export.mjs` l'a arrêtée — elle n'avait pas de ligne dans
`PAGE_TITLES` —, ce qui est exactement le travail de cette garde et la deuxième fois de la journée
qu'un contrôle d'export attrape ce qu'aucune suite locale ne voit. Les tests d'écran vivent
désormais dans `src/tests/ecrans/`.

**Le relevé de couverture qui reste à faire** : `collectCoverageFrom` ne prend que `src/types`,
`src/lib` et `src/constants`. Un test d'écran n'y entre pas, donc la couverture affichée ne
bougera pas d'un point — à corriger le jour où cette famille grandit, sans quoi le chiffre dira
l'inverse de ce qui se passe.

### 12.12 Ce que la session de design a laissé en dette (20/09/2026)

La session de design du **moment du compte** (`docs/design/v1-21-le-moment-du-compte/`) a produit
deux dettes, l'une assumée et l'autre à corriger dans le chantier qui suivra.

**Assumée — le code à usage unique ne referme pas §4.3 structurellement, et on ne bâtira pas le
mécanisme qui le ferait.** Mesuré le jour même : `POST /auth/v1/verify` avec `type: 'email_change'`
et le jeton, **sans aucune session**, confirme l'adresse et rend une session complète sur le compte
du demandeur. Le jeton est un porteur, pas un jumeau du vérifieur PKCE. Passer du lien au code
supprime donc le fait qu'un **clic** confirme — ce qui est le gros du danger, un réflexe contre une
démarche — mais un tiers qui recopierait le code confirmerait toujours l'adresse sur le compte d'un
autre, et sa propre app basculerait sur cette session. La seule forme qui refermerait la porte
serait un code engendré, envoyé et vérifié par le produit, la vérification exigeant la session
demanderesse — donc des écritures dans `auth.users` et `auth.identities` depuis une fonction à nous,
c'est-à-dire un second mécanisme d'authentification à tenir à côté de GoTrue. Le gain ne porte que
sur le tiers qui recopie un code qu'il n'a pas demandé ; le coût est un chemin d'authentification
maison. **On ne le fait pas**, et la parade reste le texte de l'e-mail, déjà en production depuis le
20/09/2026 : il dit que l'adresse vient d'être saisie et qu'il n'y a rien à faire. La condition de
réouverture est un incident réel, ou le jour où l'adresse d'un tiers vaut quelque chose à prendre.

**À corriger — le retour de lien ne balaie pas les marques locales de la session qu'on quitte.**
`effacerLesMarquesLocales` (`src/lib/compte.ts`) n'est appelée que par les deux sorties de cet
appareil, suppression de compte et déconnexion ; `createSessionFromUrl` puis `router.replace('/')`
dans `src/app/_layout.tsx` change d'utilisateur **sans rien balayer**. Après une collision
retrouvée, le compte retrouvé lit donc les marques de l'autre — dont l'annonce de rattachement et
l'étape du premier parcours, qui décide de la barre d'onglets. Le défaut est de la même famille que
la marque `a_un_bilan` de C4.5 : une marque locale qui survit à un changement d'utilisateur. La
réserve à tenir en le corrigeant est le **brouillon de bilan** : le balayer effacerait un
questionnaire en cours, ce que ni la déconnexion ni la suppression n'ont à ménager mais qu'un
changement de compte par lien, lui, doit peser.


### 12.13 Neuf textes JSX rendent une apostrophe droite (20/09/2026)

Trouvé en écrivant une assertion sur la bannière de la restitution : elle ne matchait pas, parce que
le texte visible portait `'` (U+0027) là où l'assertion cherchait `’` (U+2019). La cause est
`&apos;`, l'entité HTML qui rend l'apostrophe **droite** — celle d'un clavier de machine à écrire,
pas celle de la typographie française.

**Le dépôt fait les deux**, et la minorité est celle qui a tort : toutes les chaînes dérivées
(`src/types/*`, les répliques de Ramille, les messages) portent `’`, et neuf textes JSX portent
`&apos;`. L'écart est visible à l'écran, dans la même phrase parfois, et c'est un défaut de rendu
qu'aucune garde ne voit — le linter, lui, ne réclame l'échappement que de l'apostrophe ASCII, donc
écrire `’` directement en JSX passe très bien (`src/app/compte/index.tsx` le fait déjà).

**Ce qui a été corrigé le 20/09** : les textes écrits par le chantier du moment du compte, là où
il en écrivait. Le reste n'a pas été fait ce jour-là pour ne pas mélanger un balayage typographique
à un chantier de sécurité, et parce que rien n'aurait gardé le résultat.

**Soldé le 21/09/2026**, empilé sur la PR du chantier de l'oracle — cinq des occurrences vivaient
dans `src/app/connexion/retrouver.tsx`, que cette PR touchait déjà, donc les séparer aurait fait
deux PR sur le même fichier pour un remplacement mécanique. Ce qui a été fait est **la règle**, pas
le remplacement : `no-restricted-syntax` interdit désormais `&apos;` dans tout `src/**/*.tsx`, aux
deux places de la grammaire où il peut apparaître (le texte d'un élément, la chaîne d'un attribut).

Trois choses relevées en le faisant, et les trois sont des leçons plutôt que des lignes :

- **Le compte de ce paragraphe était faux, exactement du défaut que la §6 décrit.** « Neuf
  occurrences » comptait les **lignes** rendues par `grep -n` ; il y en avait **onze**, dont trois
  sur une même ligne d'`etape-contexte.tsx`. Un compte écrit dans un document se périme, et
  celui-ci n'était même pas juste le jour où il a été écrit.
- **La première version de la règle était inerte, et seule la mutation l'a dit.** Elle portait
  `JSXText[value=/&apos;/]`, et le lint est resté vert sur un `&apos;` fraîchement remis dans le
  texte. La cause, trouvée en dumpant l'AST plutôt qu'en raisonnant : le parseur **décode déjà**
  l'entité, donc `value` vaut `Tu n'as pas` là où la source dit `Tu n&apos;as pas`. Seul `raw`
  porte ce que le fichier contient. C'est le cas d'école de la règle du dépôt — sans le passage
  qui casse, on livrait une garde qui ne garde rien, en croyant le sujet fermé.
- **Et le commentaire de cette règle affirmait une différence qui n'existe pas** : que l'entité
  serait décodée dans le texte mais pas dans une chaîne d'attribut. Le même dump montre que
  l'attribut est décodé pareil. La phrase a été corrigée en même temps que le sélecteur.

Deux mutations datées gardent la règle (l'entité dans un texte, puis dans un attribut) ; ce qui lui
**échappe** est écrit dans son commentaire plutôt que tu : une chaîne de `.ts` hors JSX, et un
littéral construit par concaténation ou par gabarit.


### 12.14 Les deux contre-lectures du chantier du compte, faites APRÈS la fusion (21/09/2026)

Le chantier du moment du compte (`v1-28`) a été fusionné dans la nuit, puis relu deux fois. Les deux
passes ont trouvé de vrais défauts, et le fait que ce soit **après** la fusion est la première chose
à consigner : la règle du dépôt dit qu'une vague se contre-lit **avant** d'ouvrir sa PR, et elle
n'a pas été suivie ici — le GO de fusion avait été donné d'avance, sous condition de poids de
déploiement, et il a été pris pour un GO à ne pas relire.

#### Ce que la première passe a trouvé, par famille

Les trois familles que `CLAUDE.md` nomme ont toutes rendu quelque chose, et **trois défauts ont été
confirmés par la mesure** plutôt que par le raisonnement :

**Une dérivation qui lit le mauvais champ, donc un état inatteignable.** `etatDuRattachement`
cherchait l'adresse en attente dans `session.email`. Mesuré contre GoTrue : sur une session anonyme,
`updateUser({ email })` laisse `email` **vide** et n'écrit que `new_email`. L'état `a_confirmer`
n'était donc rendu pour **personne** — la porte « Saisir le code » ajoutée la nuit même sur « Toi »
était du code mort, et la phrase du pied de l'écran de code, qui promet de retrouver la saisie
là-bas, était fausse. Le test qui gardait cette dérivation passait sur une **forme d'entrée que la
production ne produit pas : c'est « le test garde la fonction, jamais ses appels » un cran plus
haut**, et c'est la leçon la plus transférable de la journée.

**Un oracle de non-divulgation, ouvert par le renvoi et pas par l'envoi.** « Renvoyer un code »
passait son erreur brute à `messageDeLaDemande` : une adresse **sans compte** (`422 otp_disabled`) y
recevait « L'envoi n'a pas abouti », là où une adresse connue lisait « un nouveau code vient d'y
partir ». Deux réponses différentes, donc de quoi savoir qui utilise Ramille — sur la page de
suppression que Google Play exige de garder publique. Le premier envoi ne l'avait pas, parce qu'il
passe par `suiteDeLaDemandeDeCode` ; la règle n'était écrite que pour lui. D'où `suiteDuRenvoi`, et
une garde de **partition** qui énumère ce que le flux de connexion a le droit de dire.

**Un collé qui perd des chiffres, là où la frappe passe.** Le champ portait un `maxLength`, qui
tronque la saisie **brute** avant que la dérivation n'ait retiré les espaces : « 847 924 69 » ne
laissait que six chiffres, bouton inerte et aucun message. Depuis une messagerie, « code :
84792469 » n'en gardait qu'un. La frappe marchait (chaque espace est rejeté avant d'atteindre la
limite), ce qui rendait le défaut invisible à qui tape — et la garde de bout en bout utilisait
`fill`, qui écrit la valeur du DOM et contourne tout. Elle utilise `keyboard.insertText` depuis.

**Deux gardes incapables de tomber.** Une assertion « aucun écran de compte ne s'interpose » testait
`page.url()` **après** un `waitForURL(/\/plan/)` — une tautologie, sous un commentaire qui la
disait « la plus importante des trois ». Et `attendreUnChangementDeSession(page, null)` était
**inerte** sur le rattachement, qui garde le même `user_id` : sa boucle rendait à la première
lecture, n'importe quel identifiant différant de `null`.

**Un cul-de-sac sur la page que Play exige.** Le repli de `/compte/suppression` après un code
accepté rendait `inconnu`, donc « Ce navigateur n'est rattaché à aucun compte » — sur un code qui
vient d'être **consommé**, avec pour seule sortie d'en demander un autre, que `smtp_max_frequency`
refuse pendant une minute.

**Un verrou relâché trop tôt, et une promesse qui peut lever.** Le verrou anti-double-appel était
rendu **avant** `await onOuverte()`, donc le bouton redevenait actif pendant la navigation : un
second toucher rejouait un code consommé et peignait « Ce code ne marche pas » par-dessus une
connexion réussie. Et `verifyOtp` peut **lever** au lieu de rendre son erreur — l'écran restait
alors sur « Vérification… », renvoi bloqué par le même verrou, sans un mot.

**Et cinq phrases qui décrivaient le mécanisme d'avant**, dont deux dans des documents et trois dans
le code : le repli de `sourceConnexion` annoncé comme `resultat_transition` alors que le corps rend
`inconnue`, la raison du port fixe de `servir-export.mjs` (tombée avec les liens), le paragraphe de
retour web du layout racine, un paramètre `id` qui voyageait `undefined`, et un aller-retour réseau
dont on jetait le résultat.

#### Ce que la SECONDE passe a trouvé, et pourquoi elle valait d'être faite

C'est le résultat le plus instructif : **une passe de relecture produit elle-même des défauts, et il
faut relire les correctifs.** Six trouvailles, dont deux qui sont mes propres corrections de la
veille :

1. **Le correctif de la tautologie l'avait rejouée sur l'autre profil.** Le premier profil arme son
   guetteur de navigations **avant** le toucher ; le second l'armait **après**, donc un interstitiel
   traversé pendant le clic n'entrait dans aucune liste et l'assertion redevenait incapable de
   tomber par l'autre bout. C'est exactement « une exclusion vérifiée sur une paire de moins ».
2. **Le rattrapage du rejet d'`onOuverte` empruntait le message d'un refus.** Il retombait sur
   « La vérification n'a pas abouti » alors que la vérification a abouti, que le code est consommé,
   et que le seul geste proposé ne peut plus rendre qu'un refus. D'où `MESSAGE_DE_LA_SUITE_MANQUEE`,
   et une garde écrite sur l'**invariant** — le message n'emprunte aucune des cinq issues — qui tombe
   sur la « simplification » dont il sort. Aucun des trois hôtes ne produit ce rejet aujourd'hui, et
   c'est précisément le raisonnement du repli de `{jours}` en C2.3 : une phrase fausse que rien
   n'exerce attend le quatrième hôte qui la rendra atteignable.
3. **`gabarits-email.md` promettait une garde qui n'existait pas** — « un contrôle relit l'égalité à
   chaque passage de `scripts/verifier-code-de-connexion.mjs` » —, alors que cette garde-là rend un
   e-mail contre la stack locale et ne compare **jamais** le document aux fichiers. C'est pire qu'un
   commentaire périmé : un prochain passage aurait cru la dérive attrapée. **La garde manquante a
   été écrite plutôt que la phrase affaiblie** (`scripts/verifier-gabarits-email.mjs`, trois
   mutations jouées) : elle compare les deux blocs du document aux deux fichiers caractère par
   caractère, vérifie que `supabase/config.toml` les déclare — sans quoi GoTrue retombe en silence
   sur son gabarit anglais — et qu'aucun ne porte de lien de confirmation, l'invariant du correctif
   de sécurité du 20/09, qui n'était jusque-là éprouvé que dans le seul travail exigeant Docker.
4. **L'ouverture du même document disait encore que ces textes vivent « hors du dépôt »**, ce qui
   n'est plus vrai de la moitié d'entre eux depuis que `supabase/templates/` existe.
5. **Le commentaire de la marque locale d'adresse décrivait encore les liens** (« elle existe pour
   un seul cas : un lien qui ne marche plus »), alors que son cas principal est devenu la reprise de
   la saisie du code.
6. **Deux expressions pour un seul fait, sous un commentaire qui en annonçait une** — trouvé en
   relisant les écrans de #252 que la première passe n'avait pas ouverts. Sur la ligne « Par email »
   de la feuille des rappels, le détail et la porte lisaient `emailPossible && email` quand
   `choisissable` lisait `emailPossible` seul, sous un commentaire disant que « deux tests séparés
   finiraient par se contredire ». Les trois s'accordent en production, mais **par une coïncidence
   chez leur unique producteur** — `loadReminderPrefs` exige `!!user.email` pour poser
   `emailPossible`. Un second producteur aurait rendu une ligne **cochable** dont le détail dit
   qu'elle ne marche pas, et rien n'aurait rougi : le test de partition balayait bien cette
   combinaison, mais ne regardait pas `choisissable`. Les trois sortent maintenant d'un seul local,
   le test compare les trois, et la mutation qui le fait tomber est le retour à l'ancienne forme.
   **La leçon est que « la même condition » se vérifie en lisant les expressions, pas le
   commentaire** — et qu'un test de partition ne garde que les champs qu'il nomme.

#### Ce qui n'a rien donné, et ce que ça vaut

**La revue de sécurité du diff n'a trouvé aucune faille nouvelle** — et c'est une information, pas
une absence : le repli de suppression qui affirme `rattache` n'accorde rien, `delete_my_account`
agissant sur `auth.uid()` ; le retrait du `maxLength` ne laisse rien passer, la troncature vivant
dans `chiffresDuCode` ; `new_email` est l'adresse de la personne elle-même ; les deux migrations ne
touchent que des descriptions ; et les trois écarts de `supabase/config.toml` sont locaux, donc sans
effet sur la production. La seule chose qui reste ouverte est la dette déjà écrite en §12.12 : le
code est un **porteur**.

#### La leçon de processus, qui est la vraie sortie de la journée

Trois choses à retenir, et la troisième est nouvelle :

- **Un GO de fusion conditionnel n'est pas un GO à ne pas contre-lire.** La condition portait sur le
  poids du déploiement, pas sur la qualité du diff.
- **Un test peut garder une forme d'entrée que la production ne produit pas**, et alors il ne garde
  rien. La parade n'est pas de relire le test, c'est de **mesurer la forme réelle** avant d'écrire
  la fixture — comme on mesure une hypothèse sur les données en base plutôt qu'au raisonnement.
- **Les correctifs d'une contre-lecture se contre-lisent.** Deux des cinq trouvailles de la seconde
  passe sont des défauts introduits par la première, et aucune des deux n'aurait été vue par une
  suite verte : l'une rend une assertion incapable de tomber, l'autre écrit une phrase fausse dans
  une branche que rien n'exerce. Ce sont les deux formes que la relecture adversariale existe pour
  attraper, et elles viennent d'être produites par la relecture elle-même.

### 12.15 Une assertion pgTAP qui rougissait sur une base vécue (21/09/2026)

Trouvée en jouant la suite complète après un passage de `verifier-parcours-reel.mjs` :
`12_usage_events.test.sql` échouait sur « un horodatage antidaté fourni par le client est écrasé
par celui du serveur ». L'échec existait aussi sur `main`, donc il n'appartenait pas au chantier en
cours — et il n'appartenait pas non plus à la CI, verte, parce qu'elle part d'une base neuve.

**La cause est dans l'assertion, pas dans l'environnement.** Elle lisait
`min(occurred_at) from public.usage_events` — **toute la table**. Sur une base vierge, la seule
ligne est celle qu'on vient d'insérer, donc l'assertion dit bien ce qu'elle veut dire. Sur une base
qui a vécu, elle attrape une ligne légitime plus vieille que cinq minutes et rougit pour une raison
étrangère à ce qu'elle garde. Elle est bornée au fixture, dont l'identifiant ne peut pas venir de
la production.

Ce n'est pas un faux positif inoffensif : une garde qui rougit pour la mauvaise raison finit
« corrigée » de travers ou ignorée, et c'est exactement le défaut contre lequel `TESTING.md` §2.3
met en garde. **Et elle n'était pas voisine de cette §2.3 : elle EN faisait partie** — c'est l'une
des trois assertions qu'elle listait comme supposant une base vierge, et la seule des trois qu'on
peut fermer sans rien perdre. Les deux autres (`17_rappels_canal` 15 et 16) n'échouent pas sur un
balayage trop large mais sur une **configuration** : sur le distant, les secrets Vault des rappels
existent, donc la fonction envoie vraiment là où la CI la voit sauter. Rien à borner là-dedans.

Vérifié en désarmant le trigger `usage_events_stamp_time` : la version bornée tombe toujours sur ce
qu'elle garde. Et mesuré plutôt que supposé pour le distant : zéro ligne portant l'uuid du fixture,
contre 254 lignes réelles.

`TESTING.md` §2.3 a été corrigée du même geste, et elle portait **deux** phrases devenues fausses :
la liste de trois, et surtout la parade qu'elle prescrivait — `supabase db reset` avant chaque suite
locale. Le réflexe de faire porter à l'appelant une manipulation que l'assertion aurait dû éviter
est le vrai enseignement de cette ligne.

### 12.16 Le RER n'est pas proposable comme action, faute de savoir où l'on habite (21/09/2026)

**Relevé en livrant C4.4, le 21/09/2026.** Le chantier ferme la moitié coûteuse du défaut du RER :
le bilan d'un usager du RER passe de 249,2 à 88,0 kg/an sur le profil de référence, soit le facteur
2,83 que `v1-21` §3.1 avait mesuré. **L'autre moitié reste ouverte**, et il vaut mieux l'écrire que
de laisser croire le sujet clos.

`v1-21` §3.1 relevait que le gain de « Passer deux trajets sur cinq en train » est chiffré au tarif
du TER, donc **sous-estimé de 64,5 kg/an** pour quelqu'un dont l'alternative réelle est le RER —
c'est-à-dire en Île-de-France, là où il y a le plus de monde à convaincre.

**Pourquoi ce n'est pas corrigé.** Proposer le RER demanderait de savoir où la personne habite *au
sens du réseau*, et le produit ne le demande pas. Le seul filtre disponible est `zone_type`, dont la
valeur `urbain_dense` recouvre Toulouse, Nantes et Rennes autant que la banlieue francilienne :
borner le gabarit à cette zone proposerait le RER là où il n'y en a pas, c'est-à-dire **le défaut
exact que C3.8 a fermé** (« le plan ne propose plus l'impossible »). Entre un gain sous-estimé et
une action impossible, le second coûte plus cher — on perd la confiance, pas 64 kg.

**Ce qui a été fait à la place** : le gabarit a perdu « ou en RER » de son libellé. Il promettait ce
que son gain ne chiffrait pas ; il ne promet plus que le train, qu'un TER dessert partout.

**Condition de réouverture** : une question de région, ou n'importe quelle réponse qui distingue
l'Île-de-France. Elle n'existe nulle part dans le questionnaire aujourd'hui, et l'ajouter pour un
seul gabarit serait cher — c'est une décision de produit, pas une correction. Le jour où le
questionnaire demande quelque chose de ce genre pour une autre raison, ce gabarit-là est le premier
à en profiter.

### 12.17 Une garde du chemin du compte a rougi sans cause trouvée (21/09/2026)

**Relevé en fusionnant C4.4, et corrigé une heure plus tard : ce n'est pas arrivé une fois mais
DEUX.** `scripts/verifier-code-de-connexion.mjs` a échoué sur son assertion 6 — celle qui vérifie
que les deux branches de `/connexion/email` sont indistinguables — avec « Aucun e-mail reçu pour
`code-g-…@test.local` après 30 s », c'est-à-dire sur la branche de l'adresse **libre**. Une première
fois sur `9e14e3a` (17 h 08), une seconde sur `38d8533` (17 h 31), à vingt-trois minutes d'écart.
**Les deux commits ne touchaient que de la documentation et un nom de fichier de migration**, et les
deux fois le travail est repassé vert au commit suivant, qui n'en différait que par quelques lignes
de `.md`. Rien dans aucun des deux diffs ne pouvait l'atteindre.

La première rédaction de cette section disait « une fois », parce que la seconde occurrence dormait
dans une notification non lue au moment de l'écrire. C'est le genre d'erreur que cette section
existe pour ne pas commettre : **sous-estimer une fréquence, c'est sous-estimer un défaut.**

**Deux causes ont été mesurées et écartées**, et c'est le seul contenu solide de cette section :

- **le plafond d'e-mails n'est pas en cause.** Le script déclenche **six** envois sur un run
  (`demanderUnCode` cinq fois, plus le clic de la branche `otp_disabled`) ; `supabase/config.toml`
  porte `email_sent = 30` par heure. On est à un cinquième du plafond ;
- **le plafond de sessions anonymes non plus.** Les deux scripts du même travail ouvrent **huit**
  contextes de navigateur au total — un pour le parcours réel, sept ici. Attention à ce que ce
  chiffre est : un contexte n'est pas une inscription. Le parcours réel en produit **au moins
  deux** dans son unique contexte, puisqu'il supprime le compte du premier profil avant de jouer le
  cycliste, et qu'`ensureSession()` en ouvre alors une neuve. L'ordre de grandeur reste la dizaine,
  pour un `anonymous_users = 30` par heure et par adresse IP — ce qui suffit à écarter
  l'hypothèse, mais **ce qui a été compté sont les contextes**, et l'écrire autrement serait
  donner à cette section la précision qu'elle reproche au mot « flake ».

**La cause reste donc inconnue, et il ne faut pas écrire le contraire.** « Flake » n'est pas une
cause : c'est le nom qu'on donne à une cause qu'on n'a pas cherchée.

**Mais la seconde occurrence apprend quelque chose que la première ne pouvait pas dire.** Les deux
échecs tombent sur la **même** assertion parmi six, sur la **même** branche de cette assertion
(l'adresse libre), et au **même** endroit : le second des deux envois consécutifs que l'assertion 6
enchaîne — `pageF` sur une adresse déjà prise, puis `pageG` sur une adresse libre, dos à dos. Et à
chaque fois `pageF` passe juste avant.

C'est un argument **contre** l'explication la plus tentante. Une lenteur SMTP générique, ou un
runner chargé, frapperait n'importe laquelle des six assertions et n'importe lequel des six envois ;
on les verrait se disperser. Leur concentration sur une seule étape désigne quelque chose de propre
à cette étape — **deux envois enchaînés sans délai** — et c'est là qu'il faudra chercher. Ce n'est
pas une cause établie, c'est la première piste que les faits désignent plutôt qu'une hypothèse qu'on
aurait aimé vérifier.

**Ce qui empêche de la trouver est une propriété du script, et c'est là qu'est le vrai sujet.**
`demanderUnCode` ignore délibérément la réponse de l'envoi — il le faut, puisque l'assertion existe
précisément pour vérifier que les deux branches ne se distinguent pas — puis attend l'e-mail. Un
envoi **refusé** par GoTrue et un SMTP **lent** produisent donc exactement le même symptôme et
exactement le même message. La garde sait dire qu'elle n'a rien reçu ; elle ne sait pas dire
pourquoi.

**La direction, si on y revient** : relever la réponse de l'appel réseau **à des fins de diagnostic
seulement**, hors de la comparaison des deux écrans — le message d'échec nommerait alors un refus et
son code, là où il ne nomme aujourd'hui qu'une attente. Ce n'est pas un correctif de la panne, c'est
ce qui permettrait de la diagnostiquer la prochaine fois, au lieu de remesurer deux plafonds.

**Ce qu'il ne faut pas faire** : allonger le délai de 30 s en espérant que ça passe. Ça ne
supprimerait pas la cause, ça la rendrait plus rare — donc plus chère à attraper.

### 12.18 Le hook des migrations livrées ne voit qu'Edit et Write (27/09/2026)

> **Fait le 29/09/2026**, dans la direction écrite ci-dessous : `scripts/verifier-migrations-livrees.mjs`
> en CI, travail `checks`, et le journal d'exceptions `supabase/retouches-de-migrations-livrees.json`.
> Deux choix que ce paragraphe ne faisait pas : la comparaison part de la **copie de travail** et
> non de `HEAD` — une retouche au shell pas encore commise se voit aussi en local ; la base de fusion
> avec `origin/main`, elle, était déjà dans la direction (`<base>...HEAD`) — ; et une exception porte
> l'**empreinte** du contenu accepté, donc elle décrit une retouche et jamais un fichier. Neuf mutations en tête de son test ;
> le chemin de l'exception est en `SUPABASE.md` §2.3.

**Relevé en l'écrivant.** `scripts/proteger-les-migrations-livrees.mjs` refuse à Edit et à Write une
migration présente dans `origin/main`. Une modification par le shell (`sed -i`, une redirection,
`git mv`), par un humain ou dans une session qui n'a pas chargé `.claude/settings.json` passe sans
rien déclencher. La CI ne regarde pas non plus : elle reconstruit la base depuis les fichiers, donc
un fichier livré réécrit y passe au vert (`SUPABASE.md` §2.3).

**La direction, si on y revient** : une étape de CI qui compare la PR à sa base
(`git diff --name-status --diff-filter=DMR <base>...HEAD -- supabase/migrations/`) et refuse toute
migration de la base modifiée, supprimée ou renommée. Elle verrait tous les chemins d'écriture à la
fois, là où le hook n'en voit que deux.

**Pourquoi ce n'est pas fait dans la PR qui a posé le hook** : elle s'en tenait aux quatre points
décidés, et cette garde-là demande d'abord une forme d'exception. Sans exception, elle aurait refusé
la seule retouche d'une migration livrée de l'histoire du dépôt
(`20260917094500_classement_du_plan.sql`, le 17/09/2026), qui était voulue — et une garde sans issue
pour la décision rare apprend à la contourner. La forme la plus simple est un fichier qui nomme les
retouches acceptées, chacune avec sa date et sa raison, sur le modèle des tolérances de
`scripts/verifier-renvois-des-documents.mjs`.

### 12.19 Le libellé d'une puce sur deux lignes est aligné à gauche (29/09/2026)

> **Fait le 30/09/2026, sur décision de la personne qui pilote**, prise sur une planche avant /
> après rendue par l'export web réel (les vrais composants, seule différence : `textAlign: 'center'`
> sur le libellé). Le relevé de la planche, qui répond à « toutes les puces du produit » : aux tailles
> de texte par défaut, **deux** puces seulement passent sur deux lignes — « À mon prochain projet de
> voyage » (l'échéance d'un voyage, à 360 comme à 390) et « Urbain dense » (le contexte, à 360) ; avec
> le texte du système agrandi à 130 %, « Deux ou plus » (télétravail) s'y ajoute. Les listes de la
> fréquence des sorties, de la part du trajet et des modes sont des rangées (`ChoiceRow`,
> `ModeListItem`), pas des puces : elles restent alignées à gauche, et c'est voulu. La fiche du kit
> (`docs/design/design-system/components/forms/Chip.jsx`) déclare le même alignement.

**Relevé en livrant « Toutes les pistes »** (`v1-32`, hors de son mandat). Le canvas `v1-30` dessine
le libellé d'une échéance qui passe sur deux lignes — « À mon prochain projet de voyage », à 390 —
**centré** dans sa puce (planche B1) ; le dépôt l'aligne **à gauche**. `Chip`
(`src/components/bilan/chip.tsx`) centre sa boîte (`alignItems`, `justifyContent`), pas son texte.

**Pourquoi ce n'est pas fait dans ce chantier** : `Chip` sert tout le questionnaire, et le brief de
`v1-30` laissait le contenu du sélecteur inchangé (§5). Centrer le texte changerait toutes les puces
du produit qui passent sur deux lignes, sur la foi d'une seule planche.

**La direction, si on y revient** : c'est une question d'apparence, donc elle se tranche sur un
canvas ou à la recette, pas ici — le prochain dessin qui montre une puce du questionnaire sur deux
lignes dira si le centre vaut pour toutes. Le correctif, lui, tient en une ligne : `textAlign:
'center'` sur le libellé.

### 12.20 L'étape des sorties ne relit pas un préremplissage arrivé après son montage (29/09/2026)

> **Fait le 29/09/2026, le même jour**, dans la direction écrite plus bas, et **rejoué d'abord** —
> mais par un test d'écran et non par le parcours réel (`src/tests/ecrans/etape-des-sorties.test.tsx`) :
> une réponse arrivée après le montage y est un changement de `answers` qui ne passe pas par
> `update`, ce que le parcours ne sait provoquer que sur une adresse tapée. Les deux tests du
> préremplissage tardif tombaient sur le code d'avant. La rangée cochée se lit désormais sur la
> réponse, mode et covoiturage, comme sur l'étape du trajet ; la seconde liste s'ouvre sur la
> réponse **ou** sur un geste, et un choix fait pendant qu'elle est ouverte l'y épingle — sans quoi
> choisir « Train » sous un « Bus » prérempli la refermerait sous le doigt. Quatre mutations en tête
> du test.

**Relevé par la seconde contre-lecture de l'écran du mode** (`v1-31`, hors de son diff) — **raisonné
sur le code, pas rejoué**. `src/components/bilan/steps/leisure-detail.tsx` tient deux états locaux,
initialisés au montage seulement : `showMore` (la seconde liste de modes ouverte) et `selectedKey` (la
rangée cochée, qui départage « Voiture (seul) » de « Voiture (covoiturage) », les deux valant
`voiture`). Un préremplissage qui arrive **après** le montage de l'étape ne les met pas à jour : sur
un re-bilan d'un profil qui sort en bus, aucun mode ne paraîtrait coché et « Bus » resterait caché
sous « Voir les autres modes », pendant que la réponse est bien dans l'état et que « Suivant »
avance.

**Pourquoi ce n'est pas fait dans ce chantier** : aucun chemin du produit n'y mène. Le préremplissage
arrive pendant qu'on traverse les étapes d'avant, et un brouillon rouvre l'étape **après** l'avoir lu,
donc elle monte avec ses réponses. Seule l'adresse `/bilan?etape=leisure_detail`, **tapée** — plus
aucun écran n'émet `?etape=` depuis C6.4 —, monte l'étape avant le préremplissage. C'est la famille
de l'écart 12 de `v1-31` (une donnée arrivée après le montage), sur un autre écran.

**La direction, si on y revient** : dériver l'affichage des réponses quand aucun geste n'a encore
choisi — `selectedKey ?? cleDesReponses(answers)`, et la seconde liste ouverte aussi quand le mode
répondu y vit —, plutôt que de recopier l'état. Le rejouer d'abord : le parcours réel sait ouvrir
`/bilan?etape=…` sur un profil qui a un bilan (son étape « un re-bilan ouvert sur l'étape du mode »).

### 12.21 Les deux boucles retombaient sur un ancien bilan (29/09/2026)

> **Fait le 30/09/2026**, par `20260930092838_la_boucle_suit_le_dernier_bilan.sql`, **rejoué
> d'abord** : `supabase/tests/database/38_la_boucle_suit_le_dernier_bilan.test.sql` faisait tomber
> ses deux assertions du profil J1 sur les générateurs d'avant, et elles seules. Cinq mutations en
> tête du test. **Aucun compte de production n'était concerné le jour du correctif** (mesuré : onze
> comptes avec un bilan, aucun dont la boucle venait d'un bilan plus ancien que le dernier), donc
> aucun point en attente à reprendre.

**Relevé en écrivant les vues du lot 6** (hors de leur diff). `generate_commute_checkins` et
`generate_extras_checkins` filtraient le bilan — « a-t-il un trajet ? » (`commute_poste_label is not
null`), « a-t-il une base déclarée ? » (`leisure_frequency <> 'rarely'` ou un voyage) — **avant** le
`distinct on` qui garde le plus récent. Le filtre écartait le nouveau bilan, et le `distinct on`
retombait sur l'ancien : quelqu'un qui refaisait son bilan sans trajet domicile-travail recevait
chaque lundi la question d'un trajet qu'il venait de dire ne plus faire, sous un plan bâti sur le
nouveau bilan qui n'en portait plus aucune action ; même chose chaque mois pour qui passait à
« sorties rares, aucun voyage ».

**Le correctif** choisit d'abord le dernier bilan valide de chacun, **puis** filtre. « Dernier bilan
valide » est ce que `generate_plan_cycle_for_user` lit — `completed`, un résultat calculé, le plus
récent par `submitted_at` —, donc le plan et les deux boucles partent du même bilan. **Deux
conditions précèdent le tri, et ce sont celles du plan** : le statut — un bilan retiré (C4.7) n'est
jamais le dernier — et un résultat calculé — un bilan passé en `completed` dont le calcul a échoué
non plus. Balayé le
même jour sur le distant : aucune autre fonction ni vue ne filtre avant de choisir le dernier bilan
(`mettre_a_jour_le_contexte`, `retirer_le_bilan` et `analytics.user_segments` ne trient que sur le
statut). **Ces trois-là, et l'écran du plan, ne désignent donc pas le même bilan que le plan et les
boucles dans un seul état** : un dernier bilan `completed` sans résultat, qu'ils prennent quand le
plan et les boucles le passent. L'état n'est pas nouveau — le plan le traitait déjà ainsi — et ce
correctif ne le crée ni ne le règle ; relevé par la contre-lecture du 30/09/2026, laissé tel quel.

### 12.22 La carte d'attente promet un signe à qui n'a aucune boucle (30/09/2026)

> **Fait le 30/09/2026, sur décision de la personne qui pilote** (« OK pour ta reco ») : quand aucune
> boucle ne tourne, Ramille ne promet rien — « Ton plan est là, reviens quand tu veux. », sans jour,
> sans canal et sans porte (`RAMILLE.attenteSansBoucle`, branche `aucune` de `carteAttente`). **Dans
> la direction écrite plus bas** : l'écran lit `ma_boucle_a_venir()`
> (`20260930105923_la_carte_d_attente_sait_si_une_boucle_tourne.sql` — remplacée le soir même par
> `mes_boucles_a_venir()`, §12.23), qui lit
> `boucles_du_dernier_bilan` — la seule définition de « qui reçoit quelle boucle », désormais lue aussi
> par les deux générateurs, qui ne portent plus leur propre choix du dernier bilan. Rien n'est recopié
> en TypeScript. Gardes : pgTAP `39` (six profils, l'accord avec les générateurs, cinq mutations), le
> test `38` rejoué sur la fonction partagée, `rappels.test.ts` (tous les états des rappels, deux
> mutations — dont celle du lecteur `lireLaBoucleAVenir`, remplacé le soir même avec ses tests) et
> le parcours réel, où le cycliste lit la ligne du lundi. Appliquée au distant le même
> jour : **un compte de production sur onze** était dans ce cas (`docs/exploitation/README.md` §7 bis).

**Relevé par la contre-lecture du correctif de §12.21**, raisonné sur le code, pas rejoué à l'écran.
L'écran du plan décide de la boucle à nommer sur le seul poste domicile-travail
(`src/app/(tabs)/plan/index.tsx` : `commute_poste_label ? 'hebdo' : 'mensuel'`), donc toute personne
sans trajet se voit promettre « Je te fais signe au début du mois prochain » (ou « On se retrouve ici
au début du mois prochain », sans rappel) — **y compris quand la boucle mensuelle ne tourne pas** :
aucun trajet, sorties rares, aucun voyage déclaré. C'est le profil sédentaire de C2.5, que `CLAUDE.md`
dit être le cas par défaut et pas un cas de bord. Le signe promis n'arrive jamais.

**Ce n'est pas le correctif de §12.21 qui l'a créé** : c'était déjà vrai pour un premier bilan de ce
profil. Il l'étend à qui refait son bilan dans ce sens — et, avant lui, la promesse ne tenait pour
ceux-là que parce que l'ancien bilan continuait de poser la question.

**Ce qui revient à la personne qui pilote** : ce que Ramille dit quand aucune boucle ne porte. La
félicitation d'un plan à zéro action sait déjà ne pas promettre (`felicitationDuPlanSansAction`,
`promettreLePoint: false`) ; la carte d'attente, non. **La direction technique, une fois le texte
décidé** : lire côté serveur si une boucle tourne pour cette personne — la condition de la boucle
mensuelle vit dans `a_des_voyages_declares` et le filtre de `generate_extras_checkins` —, plutôt que
de la recopier en TypeScript, ce qui ferait une paire de plus à tenir d'accord.

### 12.23 Deux autres phrases promettent une boucle qui ne tourne pas (30/09/2026)

> **Fait le 30/09/2026, sur décision de la personne qui pilote** — les deux recommandations
> retenues. **La carte des deux lieux dit ce qui y est** (`ouvertureDesDeuxLieux`,
> `src/types/premier-parcours.ts`) : son corps n'énumère que ce que le plan porte — l'action et le
> cap s'il a des actions, « ta saison » sinon (un plan sans action ne chiffre pas son cap : le
> premier texte validé disait « ton cap » partout, corrigé le soir même après la contre-lecture),
> le point régulier et les réponses si une boucle tourne — et Ramille dit
> « Je garde tes bilans dans ton suivi, au fil des saisons. » sans boucle
> (`RAMILLE.planEtSuiviSansPoint`). L'écart était plus large que relevé plus bas : le **cycliste**,
> dont le plan n'a aucune action, lisait « l'action en cours » juste au-dessus de « Aucun changement
> de mode ne te ferait gagner assez » — le parcours réel l'avait rendu à l'écran le matin même.
> **La carte d'un point répondu ne donne plus rendez-vous** quand sa boucle s'est arrêtée : le pied
> dit « Répondu lundi. » seul, et la **réplique de Ramille** — que ce relevé n'avait pas vue, et
> dont plusieurs variantes disent « À lundi. » ou « On se retrouve lundi. » — est choisie parmi
> celles qui ne promettent rien (`RAMILLE.checkinSansObjetSansSuite` pour « pas de trajet »).
> Techniquement, le serveur rend les boucles **une par une** (`mes_boucles_a_venir`, qui remplace
> `ma_boucle_a_venir` : « hebdo » ne disait pas si la mensuelle tournait aussi). En production, le
> jour de la décision : un compte sur onze sans boucle ni action, un avec boucle sans action, et
> **aucun point** dont la boucle s'était arrêtée. **Et une troisième phrase, trouvée en
> l'implémentant et décidée le même soir** : dans le suivi, la carte « aucun point répondu » disait à
> chaque visite « Je note tes réponses ici » et expliquait qu'une période sans réponse ne se voit pas
> — sans boucle, elle dit « Je garde tes bilans ici, au fil des saisons. » et perd sa note
> (`carteDuSuiviSansPoint`). **Le parcours réel a gagné un troisième profil, sans aucune boucle**
> (la contre-lecture avait relevé que les deux premiers en ont chacun une, donc que l'écran qui passe
> les boucles aux dérivations n'était gardé par rien) : il lit la carte des deux lieux, la carte
> d'attente et le suivi sans point répondu. **Ce qu'aucun profil ne joue** : la carte d'un point
> répondu dont la boucle s'est arrêtée — la dérivation et la carte sont gardées par Jest, l'appel de
> l'écran (`laBoucleDuPointTourne`) par rien.

**Relevé par la contre-lecture de §12.22**, lu dans le code, pas rejoué à l'écran. La décision du
30/09/2026 ne vaut que pour la carte d'attente ; deux autres textes supposent encore qu'une boucle
tourne :

- **la carte des deux lieux** (`OUVERTURE_DES_DEUX_LIEUX`, `src/types/premier-parcours.ts`) — au
  premier passage du profil sédentaire, un plan à zéro action fait arriver la barre, et c'est elle qui
  prend la place de la carte d'attente. Elle dit « Ici, ton plan : l'action en cours, le point
  régulier, ton cap. » et Ramille « Je note tes réponses dans ton suivi, au fil des saisons. »
  (`RAMILLE.planEtSuivi`) — à quelqu'un qui n'aura ni action, ni point, ni réponse ;
- **le pied d'un point répondu** (`piedDuPointRepondu`, `src/types/checkin.ts`) — « Prochain point :
  lundi … » reste affiché le temps de la période, y compris quand un nouveau bilan vient d'arrêter la
  boucle (§12.21).

**Ce qui revient à la personne qui pilote** : ce que ces deux textes disent quand aucune boucle ne
tourne. **Ce qui a changé techniquement** : l'écran du plan connaît désormais la boucle à venir
(`ma_boucle_a_venir`, §12.22), donc les deux pourraient se dériver du même fait sans nouvelle lecture.
*Ce dernier point s'est révélé faux à l'implémentation : un résumé en une valeur ne dit pas si la
boucle d'**un** point tourne. D'où `mes_boucles_a_venir`, qui l'a remplacé.*

### 12.24 `boucles_du_dernier_bilan` parcourt tous les bilans à chaque ouverture du plan (30/09/2026)

**Relevé par la contre-lecture de §12.22, raisonné, pas mesuré.** La fonction est `security definer`
avec un `set search_path`, donc Postgres ne l'intègre pas à la requête qui l'appelle ; et son filtre
`p_user_id is null or d.user_id = p_user_id` empêche alors l'usage de l'index : `ma_boucle_a_venir`
— `mes_boucles_a_venir` depuis le soir même (§12.23) —, appelée à chaque chargement du plan, lit tous les bilans complétés pour n'en garder que ceux d'une
personne. Le générateur hebdomadaire calcule aussi la branche mensuelle de tout le monde avant de la
jeter. **Négligeable aux volumes du 30/09/2026** (onze comptes avec un bilan).

**Pourquoi ce n'est pas fait** : la voie la plus simple — retirer `security definer` et le
`search_path`, que les deux appelants rendent inutiles puisqu'ils le sont déjà — permettrait
l'intégration, mais ajoute un avertissement aux advisors (`function_search_path_mutable`), dont
l'empreinte est tenue (`docs/exploitation/README.md` §8.7). **Condition de réouverture** : quand
`assessments` compte plusieurs milliers de lignes, mesurer le temps de `mes_boucles_a_venir` sur le
distant ; au-delà de quelques millisecondes, séparer l'appel d'une personne (un filtre sans `or`) de
celui de tout le monde.

### 12.25 Une action engagée sur l'autre poste mensuel n'est jamais interrogée (30/09/2026)

**Relevé par la contre-lecture de §12.23, raisonné sur le code, et mesuré** : aucun compte de
production n'est dans ce cas le 30/09/2026 (les trois actions engagées hors trajet sont des actions
de voyage, et leur boucle mensuelle porte sur les voyages). La boucle mensuelle interroge **un**
poste — le plus lourd des sorties et des voyages, les voyages pour qui sort rarement — et cherche
l'action engagée sur ce poste-là seulement (`action_engagee_de_la_periode`, §5). Quelqu'un
dont les sorties pèsent plus que les voyages et qui s'engage sur un voyage ne sera donc jamais
interrogé sur cette action — alors que la feuille ouverte après « C'est noté » lui promet
« Au début du mois prochain, je reviens te demander si tu l'as faite » (`boucleDeLAction`), et la
carte du premier plan « un point régulier te demandera si tu l'as faite ».

**Ce qui revient à la personne qui pilote** : faire suivre la boucle mensuelle à l'action engagée
(une question qui change de poste selon ce qu'on a choisi), ou taire la promesse quand l'action
n'est pas sur le poste de la boucle. **Condition de réouverture** : le premier compte dans ce cas,
que la requête de mesure du 30/09/2026 retrouve (actions engagées de la saison dont le poste n'est
ni `commute` ni celui de la boucle mensuelle).

**Et une dérivation voisine, de moindre portée** : la félicitation d'un plan sans action promet le
point (« Le point reste là… ») d'après le poste du **cycle** (`felicitationDuPlanSansAction`), là
où les autres textes lisent les boucles. Les deux s'accordent en régime normal ; elles divergent
seulement si le cycle est en retard sur le dernier bilan (génération du plan échouée, rattrapée par
le cron de la nuit).
