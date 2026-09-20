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

**Mesuré.** Des onze scripts de `scripts/`, dix sont appelés par la CI, par `vercel.json` ou par un
autre script. `rendre-favicon.mjs` ne l'est **par rien** — ni CI, ni `package.json`.

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
a déjà, avec sa garde de partition.

**Effort : moyen. Risque : réel** — c'est l'écran le plus lu du produit, et le refactor ne doit rien
changer à ce qui s'affiche. Il demande donc sa propre recette, et **il n'est pas à faire seul dans
un coin de vague.**

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
| 1 | §1 — les deux entorses au point de résolution | ~nul | **dans la migration de C4.4**, pas avant |
| 2 | §2 — les signatures dans le contrôle de types | petit | **fait le 20/09/2026** (§12.2) |
| 3 | §3 — la promesse du favicon | une décision | quand on y touche |
| 4 | §4 — la décision d'affichage du plan | moyen, risque réel | page de décision d'abord, recette dédiée ensuite |
| 5 | §5 — le découpage des fonctions de calcul | grand | à instruire, jamais en marge d'une vague |
| 6 | §8 — `normaliserReponses` | moyen, risque produit | page de décision |
| 7 | §9 — appliquer les migrations sous le nom et l'horodatage du fichier | une habitude | à la prochaine migration |
| 8 | §12.5 — un comparateur mécanique des miroirs de `check` | petit | au troisième miroir, ou à la première dérive |
| 9 | §12.5 — l'artefact de la recette du premier parcours à régénérer depuis son `.md` | une manipulation | avant la prochaine séance |

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
  avait une réponse mesurée : oui, 15 143 lignes d'écrans et 1 216 lignes de requêtes que seule la
  recette gardait. `scripts/verifier-parcours-reel.mjs` joue le chemin nominal contre la stack
  Supabase locale à chaque PR, sur le profil de la recette, la base relue après chaque écriture
  (`TESTING.md` §2.6). Deux constats de plus au passage : **Docker tourne dans l'environnement
  d'agent** (`sudo dockerd &`), donc pgTAP et ce parcours s'y exécutent — ce dépôt avait écrit le
  contraire ; et les `EXPO_PUBLIC_*` sont mises en cache par Metro hors de sa clé, donc un export qui
  change de configuration exige `--clear`.

### 12.3 Ce qui revient à la personne qui pilote

Deux points, et aucun n'est un défaut :

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

- **Les miroirs de `check` sont épinglés par des tests à valeurs recopiées, pas comparés au
  schéma.** `STATUT_DE_BILAN` et `STATUT_DU_POINT` (20/09) rejoignent `PARTS_DU_SECOND_MODE`,
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
  depuis `/contexte`. Un second profil (le cycliste au plan à zéro action, bloc 09 de la recette)
  serait le prochain parcours à écrire, et il coûte moins que le premier : la mécanique est là.
