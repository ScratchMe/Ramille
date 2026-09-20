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
