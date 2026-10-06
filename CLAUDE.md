# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mécaniques de travail, et ce qu'elles ont coûté avant d'être écrites

**Ce fichier n'est pas seulement la carte du produit : c'est aussi là que se consigne la façon de
travailler**, pour qu'une leçon payée une fois ne se repaie pas à la session suivante. Tout ce qui
suit cette section décrit Ramille ; celle-ci décrit comment on y touche. Une mécanique qui n'est
écrite nulle part est une mécanique qu'un prochain passage réinventera de travers — et il n'aura
aucun moyen de savoir qu'il la réinvente.

### Les fichiers d'outil — à ouvrir sur déclencheur, pas au démarrage

Les pièges et conventions propres à **un outil** vivent dans leur propre fichier à la racine, pour
deux raisons : garder celui-ci lisible, et pouvoir **retransmettre ces apprentissages à un autre
projet** qui utilise le même outil. Chacun est coupé en « ce qui vaut partout » (portable) et
« propre à Ramille » (les chiffres, les routes — ne voyage pas).

**Seul `CLAUDE.md` est chargé automatiquement.** Les autres ne le sont pas — d'où cette table, qui
ne contient pas les règles mais **le moment d'aller les lire**. Si un déclencheur est réuni, ouvrir
le fichier avant d'agir, pas après. La forme vient d'un autre projet, où une règle de cadence
écrite dans le fichier chargé n'a pas été suivie pour autant : sortir une règle sans dire *quand*
aller la chercher, c'est l'enterrer, et le déclencheur est la moitié utile.

**Les fichiers `TESTING-*` et `FRONT-*` sont des morceaux de `TESTING.md` et `FRONT.md`**, sortis le
01/10/2026 comme les fichiers de sujet ci-dessous, et pour la même raison : ils gardent les numéros de section d'origine, et la table en tête de
chaque fichier de base dit où vit chacun — un ancien renvoi « `FRONT.md` §2.12 » se retrouve ainsi.

**Les cinq dernières lignes sont des fichiers de sujet, pas d'outil** (01/10/2026) : ce que la
section Architecture disait de chaque brique du produit — le bilan, le plan, la boucle, le compte,
la mesure. `CLAUDE.md` pesait alors 177 Ko, dont 144 pour l'architecture, chargés à chaque session
pour des briques qu'on ne touche qu'une à la fois ; ils sont sortis pour la raison de `FRONT.md`, et
tout y est propre à Ramille, sans moitié portable. Ce qu'il faut en savoir **sans** les ouvrir est
résumé en fin de section Architecture, une ligne par règle. **Les renvois « (CLAUDE.md) » écrits
avant cette date** — commentaires du code, documents datés — visent souvent un paragraphe qui vit
désormais dans l'un d'eux : cette table dit lequel.

| Fichier | Déclencheur — ouvrir AVANT d'agir |
|---|---|
| **`VERCEL.md`** | Toute fusion sur `main` · toucher `vercel.json`, `api/`, `vercel-build` ou `scripts/vercel-ignorer-le-build.sh` · ajouter une route · affirmer quoi que ce soit sur un compteur ou une facture Vercel · mesurer le poids d'un déploiement |
| **`SUPABASE.md`** | Écrire, rejouer ou réécrire une migration · toucher à un privilège, une policy, un trigger ou un RPC · toucher à l'auth (session, lien de connexion, Redirect URLs) · un `401`, `403` ou `42501` inexpliqué · retoucher `database.types.ts` · rejouer un test pgTAP sur le distant |
| **`EXPO.md`** | Ajouter une route ou un fichier dans `public/` · toucher à `app.json`, `app.config.js`, `.env`, à l'export ou à un hook natif · **toucher à une mise en page — marge, hauteur, barre d'onglets** · **faire bouger quelque chose sur web** · un écran blanc sur web · une dépendance native, un build EAS, un `expo-doctor` rouge |
| **`TESTING.md`** | Écrire un test censé protéger une correction · **annoncer que quelque chose est vérifié** · une suite qui rougit ou verdit de façon inattendue · rejouer la CI en local |
| **`TESTING-PGTAP.md`** | Écrire, corriger ou rejouer un test pgTAP — en CI, en local ou sur le distant · toucher au référentiel des facteurs · une assertion chiffrée qui rougit |
| **`TESTING-GARDES.md`** | Toucher à une garde de la CI (`scripts/verifier-*.mjs`) ou en voir une rougir · jouer, étendre ou corriger le parcours réel · ajouter une constante qui recopie un `check` · les gabarits d'e-mail, le chemin du compte, ce que le lecteur d'écran reçoit dans l'export, la garde d'une animation |
| **`FRONT.md`** | Toucher un écran, un composant ou une dérivation lue par un écran · **écrire une phrase que quelqu'un lira** · afficher un chiffre, un repère, un poste, une saison · rendre quelque chose cliquable · toucher un état de chargement, un état vide ou un écran d'erreur · toucher au plan ou à un écran d'onglet |
| **`FRONT-MASCOTTE.md`** | Faire parler Ramille · toucher à la mascotte : son dessin, ses saisons, son visage, ses répliques · placer la mascotte sur un écran, surtout près d'un chiffre |
| **`FRONT-QUESTIONNAIRE.md`** | Toucher à un écran ou à une étape du questionnaire : ce qu'une réponse efface ou réclame, la saisie, le « Suivant » |
| **`FRONT-SESSION.md`** | Côté écran : la session, le jeton d'appareil, la feuille des rappels, le mot de la veille, la carte d'attente ou un texte qui promet un point, le champ de code, le démarrage, le brouillon, la reprise, une marque locale · le préremplissage du questionnaire et la voix de Ramille à l'entrée de ses sections · une durée promise à qui reste sans compte |
| **`FRONT-SUIVI.md`** | Toucher au suivi ou à la restitution d'un bilan |
| **`FRONT-MOUVEMENT.md`** | **Faire bouger quelque chose** — une transition, une animation, une hauteur qui change (avec le skill `/mouvement`) · « réduire les animations » · un focus près d'une entrée animée · une découpe permanente (`overflow: hidden`) |
| **`RECETTE.md`** | **Préparer une séance de recette, sur appareil ou au navigateur** · écrire ou retoucher un document de `docs/recette/` · fabriquer ou mettre à jour l'artefact web d'une recette · consigner ce qu'une séance a trouvé · prescrire un profil de test |
| **`BILAN.md`** | Toucher au questionnaire côté base (une réponse, une colonne d'`assessment_answers`, `normaliserReponses`) · toucher au calcul, à un mode de transport, un résolveur ou un facteur d'émission · la synchronisation ADEME · la soumission ou le retrait d'un bilan · affirmer d'où vient un chiffre du bilan |
| **`PLAN.md`** | Toucher aux actions du plan (gabarits, filtres de contexte, `estimate_action_savings`) · à l'engagement (`commit_plan_action`, archive, reconduction) · à la génération du plan, sa cadence ou `p_cause` · au contexte (`/contexte`) · à l'écran du plan : saison, cap, premier plan, barre d'onglets du premier parcours |
| **`BOUCLE.md`** | Toucher aux points de suivi (`engagement_checkins`, les générateurs, la question, la réponse, la carte du point) · à une paire SQL/TypeScript de la boucle · décider qui reçoit quelle boucle · toucher aux rappels : canal, `notification_outbox`, envoi, mot de la veille, espacement, désinscription, jeton d'appareil |
| **`COMPTE.md`** | Toucher à la connexion, au rattachement, au code reçu par e-mail ou à `/connexion/*` · à la session (`ensureSession`, PKCE, lien profond, jeton refusé) · ajouter une provenance vers `/connexion/retrouver` · toucher au démarrage hors ligne ou à une marque locale · à la suppression de compte ou à l'export |
| **`MESURE.md`** | Ajouter, émettre ou lire un événement d'usage ou une valeur de propriété · toucher à la purge des sessions anonymes, aux cohortes ou aux vues `analytics.*` · toucher au canal de retour (`feedback`) |

### Ce que la personne qui pilote a demandé

- **Ramille n'est pas encore lancé, et rien ne s'annonce dans l'app avant qu'il le soit** (redit le
  06/10/2026, pour la troisième fois : « faut que je te le dise combien de fois ? »). La promesse de la
  page de confidentialité — un élargissement de la collecte s'annonce avant de prendre effet — ne vaut
  qu'après le lancement ; d'ici là, la date de mise à jour de la page en tient lieu. **Conséquence :
  une phrase publique qui doit changer se change tout de suite**, dans la PR qui la rend nécessaire,
  et ne se pose pas comme une question : différer coûterait une annonce plus tard, la faire maintenant
  ne coûte rien. Le détail : `docs/exploitation/fiche-google-play.md` §1.7.
- **Elle est le Product Manager, et c'est ce qui départage les décisions** (17/09/2026). Ce qui
  touche au **produit** — ce qu'on montre, ce qu'on tait, ce qu'on demande à la personne, dans quel
  ordre on livre — lui revient, et se pose avant d'écrire. Ce qui est **technique** revient à
  l'agent : « je peux t'aider mais ça reste toi l'expert ». Le piège n'est pas de trancher soi-même
  une question technique, c'est de **présenter comme un arbitrage une question qui n'en est pas
  une** — ça fait payer un aller-retour pour rien. Et l'inverse coûte plus cher : un choix de
  produit pris seul sous prétexte qu'il a une forme technique. La bonne façon de poser une question
  de produit est celle qui a marché le 17/09/2026 sur le §7 de `v1-17` : le fait, ce qui est en jeu,
  la recommandation, et **ce qu'on casse si on se trompe** — les deux seules questions qui ont
  demandé une décision portaient chacune un piège que leur énoncé ne laissait pas voir. Cadrer,
  c'est déjà la moitié du travail.
- **La partie technique est la responsabilité de l'agent, et elle ne se demande pas** (20/09/2026 :
  « comporte-toi comme un vrai lead dev senior »). Une dette légère se corrige quand on la voit ;
  une doc qui manque s'écrit ; un test qui manque s'écrit — sans go, dans la PR en cours si c'est
  petit, dans la sienne sinon, et toujours éprouvé en le cassant. Ce qui reste à demander, c'est
  ce qui change le **produit** (ce qu'on montre, ce qu'on demande, dans quel ordre on livre) et ce
  qui pèse sur le **rythme** (un build EAS, un déploiement, une PR de plus à traiter chaque jour).
  Le relevé de dette (`v1-27`) reste le lieu où l'on note ce qu'on ne fait pas tout de suite.
- **Une tâche par chantier, tenue à jour pendant le travail** et pas après coup (14/09/2026 :
  « c'est pénible de ne pas savoir où tu en es »). C'est la seule fenêtre sur l'avancement.
- **Un numéro ne se cite jamais seul.** Un lot, une issue, un chantier : on écrit à chaque fois de
  quoi il s'agit. Personne ne garde en tête ce que désigne `C3.8`.
- **Au plus un build EAS tous les deux jours** (15/09/2026), et la raison est au registre
  d'exploitation §3.3 : le quota du plan gratuit ne se lit qu'en le heurtant.
- **Vercel : on fusionne quand on veut, mais on mesure chaque déploiement** (25/09/2026 : « Plus
  besoin de s'inquiéter pour Vercel, ça a été reset plus tôt que prévu, tu peux merger quand tu
  veux. Continue simplement de regarder combien ça doit déployer pour vérifier qu'il n'y ait pas
  une hausse soudaine, il faudrait alors l'expliquer »). Le budget des 150 Mo du 15 au 25/09/2026
  et le relevé à demander avant chaque fusion sont levés ; **la mesure hors ligne avant chaque
  fusion de code reste**, comparée au relevé précédent (4,18 Mio, soit 4 378 974 octets, le
  06/10/2026), et **un écart
  s'explique dans la PR avant de fusionner** — un saut veut dire qu'une dépendance est entrée dans
  `api/`. La méthode, et ce que la fenêtre des dix jours a appris : `VERCEL.md` §1.2 et §2.3.
- **L'agent relit et fusionne ses propres PR** (01/10/2026 : « C'est toi qui en charge de relire
  tes PR et de merger »). Une PR ne s'arrête pas sur « en attente de ta relecture » : contre-lue
  (plus bas), verte sur sa tête, sans fil ouvert et sans conflit, elle se marque prête et se
  fusionne en squash, comme ses devancières. Ce qui se pose à la personne qui pilote reste ce qui
  touche au produit, et ça se pose avant d'écrire, pas au moment de fusionner.

### La branche de travail

**Après une fusion, la branche se recrée en local et ne se repousse qu'au premier commit réel.**
GitHub la supprime à la fusion ; la repousser aussitôt ressuscite une branche **vide et identique à
`main`**, qui se lit « il y a du travail en cours » alors qu'il n'y en a pas. Fait trois fois le
15/09/2026 avant qu'on me le fasse remarquer : une branche ouverte doit vouloir dire quelque chose.

**Et ça ne se rattrape pas d'ici** : le proxy git de l'environnement distant refuse les suppressions
de référence — `HTTP 403` sur `git push --delete` comme sur la refspec vide. La suppression se fait
depuis GitHub. Ce n'est pas passager, donc une boucle de reprise n'y changera rien.

**Et le hook d'arrêt réclame alors un push, qu'il ne faut pas lui donner** (29/09/2026, trois tours
pour le comprendre). Recréée sur `main`, la branche porte le commit de fusion ; le hook le compte
« non poussé » tant qu'il compare à `origin/<branche>`, une référence locale **périmée** que la
suppression côté GitHub n'a pas effacée. Deux commandes, qui n'écrivent rien sur GitHub :
`git remote prune origin` (la référence périmée part) puis `git branch -u origin/main` (la
branche suit ce qu'elle contient). Le premier vrai commit se pousse ensuite par
`git push -u origin <branche>`, qui rétablit son amont.

**Un numéro de PR s'écrit dans un document une fois obtenu, jamais avant.** Le 15/09/2026, `#186`
puis `#187` ont été écrits dans `v1-13` §10 avant d'ouvrir les PR, en pariant sur la numérotation.
Les deux paris ont tenu ; une issue ouverte entre-temps par quiconque les aurait rendus faux, et le
lien aurait pointé ailleurs sans que rien ne le signale.

### Avant de lancer une vague

Trois choses à lire dans `docs/architecture/v1-13-audit-et-chantiers.md`, la feuille de route (son
état est décrit dans [`docs/architecture/produit.md`](docs/architecture/produit.md)) : la **§11**,
qui liste ce qui reste à vérifier sur appareil et que cocher une ligne de §10 ne dit pas — chaque
ligne dit si la recette du 14/09/2026 l'a jouée, et une ligne muette n'a pas été jouée, y compris
quand le bloc qui la portait est revenu conforme sur autre chose ; la **§12**, ce que cette recette
a trouvé ; et **le relevé de fichiers, à refaire à chaque fois** — la colonne « Parallèle ? » de
§2.3 est une intention, pas un relevé. Elle s'est trompée **quatre fois** : la vague 2, annoncée
disjointe, partageait six fichiers ; la vague 3, annoncée « enchaînée », avait deux chantiers
réellement parallélisables et trois fichiers revendiqués par plusieurs, dont un par trois. Le
relevé du 15/09/2026 l'a confirmée (`v1-16` §2) — seule la vague 5 l'avait déjà vue juste —, ce qui ne change rien à
la règle : il coûte dix minutes et évite qu'un chantier en écrase un autre en silence.

**Et un relevé est un instantané, donc un chantier qui CRÉE un fichier ou une fixture invalide le
sien** (17/09/2026, CI rouge de la vague 9). Le relevé disait vrai : `02_generate_plan_cycle_for_user`
ne contenait **aucune** occurrence de `teletravail`, donc C5.1 et C5.4 étaient disjoints. Puis C5.1 y
a ajouté une fixture portant `teletravail = 'oui'`, une heure avant que C5.4 n'interdise cette
valeur — et les deux chantiers se sont croisés dans un fichier qui ne les concernait ni l'un ni
l'autre au moment du relevé. La parade n'est pas de relever deux fois : c'est, **avant de pousser
une vague, de rebalayer les valeurs que la vague vient de changer sur tout le dépôt**, fixtures
comprises. Un `grep` sur le vocabulaire retiré aurait coûté dix secondes.

**Et une vague se contre-lit avant d'ouvrir sa PR** (17/09/2026). Le lot 5 est parti avec **huit
défauts**, et ils n'ont été trouvés que parce que la personne qui pilote a demandé une relecture le
soir même. Quatre d'entre eux n'étaient trouvables que comme ça : un appel fautif d'une fonction
pourtant testée, deux cartes qu'on croyait s'exclure, quatre écritures d'état après une garde
d'annulation, un commentaire orphelin décrivant un mécanisme supprimé. Ni la CI, ni le linter, ni
aucun test ne pouvait en voir un seul. **Depuis le 27/09/2026, elle a son sous-agent,
`contre-lecture`** (`.claude/agents/contre-lecture.md`), qui porte la grille : on le lance sur le
diff entier, en lui donnant la base, le commit et ce que la vague prétend faire. **Ses constats se
vérifient, et ses corrections se relisent contre les règles écrites avant d'être appliquées** : il
ne les connaît pas toutes. Le 29/09/2026, sa proposition de retarder un focus jusqu'à la fin d'une
entrée animée a été appliquée telle quelle, fusionnée, puis retirée le jour même — elle enfreignait
la règle du mouvement, « le focus part au geste, jamais à la fin d'une animation » (`FRONT-MOUVEMENT.md`
§2.12), que le skill `/mouvement` porte depuis la veille.

**Et une vague confiée à des sous-agents en worktrees coûte quatre préparations et une surprise**
(24/09/2026, trois chantiers de `v1-29` en parallèle). Les worktrees vivent sous `.claude/worktrees/`,
**dans** l'arbre du dépôt : git, Jest, TypeScript et ESLint les ignorent depuis ce jour-là — sans
quoi `npm test` à la racine exécutait 170 suites au lieu de 42, et un `git add -A` les embarquait
comme sous-modules. Un worktree n'a ni `node_modules` (un lien symbolique suffit) ni
`expo-env.d.ts` (à copier, sans quoi `tsc` échoue sur `@/global.css`) ; et deux exports en
parallèle partagent le cache de Metro (`EXPO.md` §1.1). **La surprise : le relevé de fichiers ne
voit pas les fichiers qui n'existent pas encore** — deux chantiers ont écrit `src/lib/focus.ts` en
même temps, au même corps près. La consigne de chaque sous-agent doit donc nommer les modules
partagés qu'il a le droit de **créer**, pas seulement ceux qu'il a le droit de toucher. Et chaque
rapport revient avec des corrections hors de sa liste : c'est du travail d'intégration, pas du bruit
— une vingtaine ce soir-là, dont une erreur d'hydratation et une phrase fausse du plan.
**Et ces copies partaient d'`origin/main`**, pas de la branche de travail — les six des 24 et
25/09/2026 : sans réglage, c'est la valeur par défaut, et un sous-agent a dû se recaler seul sur le
commit que sa consigne nommait. Depuis le 27/09/2026, `.claude/settings.json` fait partir une copie
du HEAD local et y lie `node_modules` (`worktree`), le skill `/preparer-un-worktree` dit ce qui reste
à faire à la main et donne le modèle de consigne, et `scripts/preparer-un-worktree.mjs`, que le
sous-agent lance en premier, vérifie le commit de départ — un réglage ne se voit pas — et crée
`expo-env.d.ts`. Pour un export fait en parallèle, `--clear` ne suffit pas : c'est le cache de Metro
qui est partagé, et le rejeu (`TESTING.md` §2.13) en donne un à chaque export.

La relecture se fait **sur le diff entier de la vague**, adversairement — « qu'est-ce qui, là-dedans,
est faux, périmé, ou marche par accident ? » — et elle cherche trois familles en particulier, parce
que ce sont celles qui sont sorties : **une dérivation appelée avec le mauvais argument** (le test
garde la fonction, jamais ses appels) ; **une exclusion affirmée mais vérifiée sur une paire de
moins** ; et **une phrase qui décrit ce que le code faisait avant**. Elle a coûté une demi-heure et
rendu huit choses au premier essai.

### Éprouver plutôt qu'affirmer

**Une garde neuve se vérifie en cassant ce qu'elle garde** : remettre l'ancien défaut, tronquer le
rang, fabriquer la policy fautive — puis constater que l'assertion tombe, et seulement celle-là.
Sans ce passage on a écrit une ligne qui *pourrait* garder quelque chose ; avec, on sait laquelle.
C'est déjà la règle en §E de `03_rls_policies.test.sql`, et elle vaut partout — le compte des
mutations s'écrit dans le fichier de test, daté (`TESTING.md` §1.1).

**Une hypothèse sur les données se mesure en base, jamais au raisonnement.** L'idiome, quand il faut
écrire pour mesurer sans rien laisser : un bloc `do $$ … raise exception 'RESULTAT …' $$` —
l'exception annule toute la transaction **et** ramène le chiffre dans son message. C'est ainsi qu'on
a su qu'un profil donné rend **onze** actions au plan (15/09/2026) plutôt que de l'espérer.

### Lire un échec avant d'y répondre

**Un tube masque le code de sortie.** Une boucle de reprise bâtie sur `commande | tail` ne reprend
**jamais** : elle lit le succès de `tail`. Relevé le 15/09/2026 — trois « tentatives » de
suppression de branche n'en étaient qu'une, et le `403` n'est apparu qu'en retirant le tube.

**`pgrep -f motif` se trouve lui-même quand le motif est dans sa propre ligne de commande.** Une
boucle `until [ "$(pgrep -f 'x.sh' | wc -l)" = 0 ]` écrite dans un shell dont la commande contient
`x.sh` n'en sort **jamais** : elle compte le shell qui l'exécute. Relevé le 20/09/2026 — deux
guetteurs et un pgTAP « en cours » pendant une heure, qui n'avait pas démarré. Filtrer par le nom
exact du processus (`pgrep -x`), ou exclure son propre PID (`pgrep -f motif | grep -v "^$$"`), ou
mieux : attendre le processus lui-même (`wait`), pas son nom. **Et `pkill -f` a le même défaut, en
pire** : relevé le 28/09/2026, `pkill -f "node ./.pilote.mjs"` a tué le shell qui le lançait
(code 144) avant les commandes suivantes de la même ligne. Arrêter un processus lancé en arrière-plan
se fait par son identifiant de tâche, ou par `kill` sur son PID (`$!` au lancement) — **jamais par
`pkill -x node`**, dont le « nom exact » est celui de tous les processus Node de la machine, Metro et
un parcours compris.

**Un marqueur accentué absent d'un bundle minifié ne prouve rien** : `é` y est échappé en
`\u00e9`. Cherché le 15/09/2026 pour vérifier qu'un déploiement était bien passé — il l'était, et
la conclusion inverse a failli être tirée. Chercher un marqueur **ASCII** (un nom de style, une clé
d'objet), ou la forme échappée.

### Ce qui se consigne ailleurs, et pourquoi

Les réglages des comptes tiers ne vivent pas ici mais dans `docs/exploitation/`, qui est le registre
qui les rend vérifiables — rien dans le code ni dans la CI ne les voit. Deux d'entre eux pèsent sur
le **rythme de travail** et méritent d'être connus avant de planifier quoi que ce soit : le quota de
builds EAS (§3.3) et les budgets d'API GitHub (§3.8 — GraphQL et REST sont deux compteurs
distincts, donc `issue_write` peut être refusé pendant que tout le reste passe). Le compteur
Functions Storage de Vercel (§3.2) en était un troisième jusqu'au 25/09/2026, date à laquelle son
budget a été levé : il ne reste qu'une mesure avant chaque fusion de code, et sa règle vit dans
`VERCEL.md` parce qu'elle est portable.

### Les plug-ins s'installent à la main, dans le dépôt

**claude.ai ne livre pas les plug-ins aux sessions cloud** (24/09/2026) : Product Management était
activé sur le compte, et la session ne le voyait pas — liste des plug-ins du compte vide, catalogue
« non activé », dossier de synchronisation vide. Le dépôt est la seule chose qu'une session cloud est
sûre d'emporter : un plug-in arrive donc en `.zip` et s'installe par
`node scripts/installer-un-plugin.mjs <archive>`, qui le met aussi à jour quand on le relance sur une
archive plus récente, et le retire par `--retirer <plug-in>` — exactement ce qu'il avait posé, jamais
tout ce qui porte son préfixe. Ce qui est installé, et ce qui ne l'est pas, se lit dans
l'`installation.json` de chaque plug-in, sous `.claude/plugins-importes/`, à côté de sa licence.
**Le dépôt est public, donc installer un plug-in, c'est le redistribuer** : sa licence voyage avec
la provenance, et quand l'archive n'en porte pas, `--licence <fichier>` la joint — c'est le cas de
Design, dont la licence (Apache 2.0) est à la racine du dépôt d'amont et non dans son dossier.
Trois règles, dont les deux premières sont détaillées en tête du script et gardées par son test :

- **tout nom est préfixé par celui du plug-in** — `/product-management-write-spec` et non
  `/write-spec`, renvois et liens des consignes compris. Marketing et Product Management portent tous
  deux `competitive-brief`, et Engineering apporte un `code-review`, le nom du `/code-review` intégré ;
- **hooks, connecteurs et agents ne s'installent jamais d'office** : un hook exécute du code à chaque
  événement, un connecteur ouvre un compte tiers. Le script les liste ; les brancher est une décision
  prise après lecture — et un hook qui relit chaque tour pèse aussi sur le rythme, donc elle se
  demande ;
- **les règles du dépôt passent devant les consignes d'un plug-in.** Ces consignes sont écrites en
  anglais pour un produit SaaS quelconque : le français, le format des `v1-NN` et la façon de poser
  une question de produit (plus haut) restent. Leur texte n'est pas traduit — une traduction rendrait
  chaque mise à jour impossible à rejouer —, et « tout est en français » vaut pour le produit et son
  code, pas pour des consignes tierces.

Ce que le script ne voit pas, c'est ce que les consignes **disent** : il imprime ce qui mérite un
regard (adresses, commandes shell, outils pré-autorisés, liens morts, fichiers qui ne sont pas des
consignes), et elles se relisent avant de commettre. Deux choses qu'on y trouve, et leur réponse :

- **une consigne qui se déclare incontournable s'installe en `--manuel`.** Chaque skill charge sa
  description dans le contexte de chaque session et peut se déclencher seul ; en `--manuel`, il sort
  de la liste présentée — mesuré le 24/09/2026 — et reste appelable par son nom. Modern Web Guidance
  y est : sa description exige de passer « en premier » sur tout HTML, CSS ou JavaScript, sur un
  produit en React Native ;
- **aucun contenu de Ramille ne relaie la publicité d'un plug-in.** SearchFit SEO demandait de
  proposer SearchFit.ai et signait ses gabarits « Powered by SearchFit.ai » ; il a été retiré le jour
  même, et la règle reste pour le suivant.

**Et chaque plug-in qui arrive se décide avec la personne qui pilote, un par un, avant de
s'installer** (24/09/2026 : « Pourquoi tu ne m'as pas posé tes questions pour chacun ? On aurait pu
discuter »). Ce n'est pas un détail d'implémentation : ce sont des consignes que l'agent suivra à
chaque session. Le premier lot a été tranché seul, en gardant deux questions pour la fin — un mode
manuel choisi sans le dire, une publicité installée avec une règle pour la taire —, et SearchFit SEO
est reparti dès qu'on en a parlé. La forme est celle d'une question de produit (plus haut) : ce qu'il
fait, ce qui est en jeu, la recommandation, ce qu'on casse si on se trompe — et rien ne s'installe
avant la réponse.

### Ce que Claude Code fait seul ici, et ce qui s'appelle par son nom

Quatre automatismes écrits pour Ramille le 27/09/2026, sur l'audit du plug-in claude-code-setup —
joué sans être installé, et chacun décidé avec la personne qui pilote, comme un plug-in :

- **`.claude/settings.json` est versionné ; `.claude/settings.local.json` est personnel, et ignoré
  par git.** Le second a porté jusqu'à ce jour, dans un dépôt public, les jokers `mcp__Supabase` et
  `mcp__Supabase__*` : tout outil du serveur passait sans confirmation sur la production,
  `pause_project` et `restore_project` compris. **Un outil accordé se nomme**, et un test refuse le
  joker. La liste nommée a gardé `apply_migration` et `execute_sql`, qui écrivent sur la production,
  sans confirmation du 27/09 au 05/10/2026 ; **la personne qui pilote les en a retirés le 05/10/2026**
  (passe avant le lancement, `v1-27` §12.38) : le dépôt public recevra des textes d'inconnus, qu'une
  session lit, et une écriture en production se confirme désormais d'un clic. Le retrait dans ce
  fichier lui revient — l'agent n'écrit pas ses propres permissions, et ça lui est refusé.
- **Un hook refuse de modifier une migration livrée** (`scripts/proteger-les-migrations-livrees.mjs`) :
  « livrée » veut dire présente dans `origin/main`, pas sur le disque, parce qu'une migration en
  cours s'écrit en plusieurs retouches. Il ne voit ni le shell ni une autre session — **la CI, si,
  depuis le 29/09/2026** (`scripts/verifier-migrations-livrees.mjs`), et une retouche voulue
  s'inscrit dans un journal avec l'empreinte de son contenu : `SUPABASE.md` §2.3.
- **Le sous-agent `contre-lecture`** porte la grille de la relecture adversariale (plus haut). Sa
  « lecture seule » est une consigne et non une garde : il a Bash, et la première contre-lecture a
  supprimé `/dev/null` du conteneur par une commande de vérification mal écrite.
- **Des skills ne se déclenchent jamais seuls** et s'appellent par leur nom : `/rejouer-la-ci`
  (`scripts/rejouer-la-ci.mjs`, `TESTING.md` §2.13), `/preparer-un-worktree` (plus haut) et, écrit
  le même soir, **`/mouvement`** (`.claude/skills/mouvement/SKILL.md`) :
  les jetons, la règle de « réduire les animations » et ce qui ne bouge jamais, **à appeler avant
  d'ajouter ou de retoucher une transition**. Il reprend dans nos mots les principes de
  transitions.dev, qui ne s'installe pas — sa licence interdit de republier sa collection
  (`docs/architecture/v1-30-les-transitions.md` §3.1). **« Par leur nom » veut dire par la
  personne qui pilote** : les trois portent `disable-model-invocation`, donc l'agent ne peut pas les
  lancer lui-même (relevé le 29/09/2026). Quand leur moment arrive, l'agent **lit** leur
  `SKILL.md` avant d'agir — et le relit avant toute retouche de ce qu'il couvre, correction
  d'une contre-lecture comprise (plus haut).

## Le produit, en trois règles et un renvoi

**Ramille** est une app de sensibilisation à l'empreinte carbone des transports, pour la France.
Ce qu'elle est, ses cinq briques, l'état de ce qui est livré et la feuille de route vivent dans
**[`docs/architecture/produit.md`](docs/architecture/produit.md)** — à lire avant de **décider**
quelque chose, pas nécessaire pour corriger une ligne.

Trois règles, en revanche, se cassent sans qu'on ait rien décidé, donc elles restent ici :

- **tout est en français** — public, interface, et tout code produit : messages d'erreur,
  commentaires métier, contenu ;
- **le produit s'appelle Ramille, et « TraceVerte » ne doit pas revenir.** Ce nom est porté depuis
  25 ans par une entreprise alsacienne de vélo et de mobilité douce — même mot, secteur voisin,
  même public. Il vit dans `src/constants/produit.ts` (`APP_NAME`) et nulle part en dur dans un
  écran ; `api/` et les SVG le répètent en littéral, faute de pouvoir importer `src/`. **Trois
  choses gardent volontairement l'ancien nom et ne se « corrigent » pas** : les clés AsyncStorage
  (`traceverte.*` — les renommer effacerait les brouillons), les migrations déjà appliquées, et le
  projet Supabase distant, que le dépôt appelle `TraceVerte-v1` et dont le **tableau de bord
  affiche `TraceVerte`** (réf. `nuugfepfsypqgvsvyzht`) — ce fichier a longtemps écrit l'inverse,
  relevé le 20/09/2026 en interrogeant l'API de management ; `docs/exploitation/README.md` §3.1
  portait le bon nom depuis le 10/09. Les documents `v1-01`
  à `v1-08` en parlent aussi : ce sont des décisions datées, on ne les réécrit pas. Détail en
  `v1-09-renommage-ramille.md` ;
- **V1 = Google Play uniquement** — pas d'App Store, pas de Sign in with Apple.

## Commandes

```bash
cp .env.example .env      # EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run web                # ou: npm run android / npm run ios
npx tsc --noEmit           # typecheck — à lancer après tout changement
npm run lint                # eslint (config Expo)
npm test                   # tests unitaires Jest (logique pure, cf. Tests ci-dessous)
expo export --platform web # build statique web (= script vercel-build), utile pour
                            # vérification visuelle via Playwright sans device
node scripts/rejouer-la-ci.mjs  # les travaux de la CI, en local — Docker pour `base` et
                                # `parcours` (TESTING.md §2.13)
```

### Tests

Trois suites : **Jest** (`npm test`, logique pure côté client, `src/**/*.test.ts` colocalisés,
`TZ=Europe/Paris` forcé et ce n'est pas cosmétique), **pgTAP** (`supabase/tests/database/*.sql`,
numérotés, un fichier par sujet, `supabase test db`) et, depuis le 20/09/2026, **le parcours réel**
(`scripts/verifier-parcours-reel.mjs` : le chemin nominal joué par Playwright contre la stack
Supabase locale, la base relue après chaque écriture — `TESTING-GARDES.md` §2.6, qui dit aussi ce qu'il
laisse volontairement aux deux autres). **Trois profils**, et aucun n'est un doublon : le
cycliste au **plan à zéro action** est le seul chemin où la carte « Ton premier plan » ne se rend
jamais, donc le seul où la barre d'onglets arrive autrement — et depuis C4.7 il finit par **retirer
ses deux bilans**, le seul chemin qui efface la marque locale de bilan sans quitter le compte ; le
troisième, depuis le 30/09/2026, n'a **aucune boucle**, et c'est le seul où ni le plan ni le suivi
ne peuvent promettre un point. **Docker tourne dans cet environnement** — `sudo dockerd &`,
mesuré le 20/09/2026 —, donc pgTAP et le parcours s'exécutent ici, et le `BEGIN`/`ROLLBACK` sur le
projet distant n'est plus la seule validation d'un fichier pgTAP. Les trois tournent en CI sur
chaque pull request. La
règle qui décide de ce qui se teste (**toute dérivation pure affichée à la personne ou décidant
d'une navigation**), où passe la ligne entre logique pure (`src/types`) et entrée-sortie
(`src/lib`), les tests de **jugement** à connaître avant de « corriger » ce qu'ils épinglent, et
les pièges de la suite Jest (doubles, fuseau, résolveurs, couverture, `describe` vide) : `TESTING.md` §2.1 —
et sa §1 pour ce qui vaut sur n'importe quel projet.

**Le job `db-tests` compare aussi `src/lib/database.types.ts` à la base qu'il vient de
construire** (C3.12 — les colonnes, et les signatures de fonctions depuis le 20/09/2026) — le
fichier est tenu à la main, et le typecheck ne peut pas voir cette
dérive : `SUPABASE.md` §2.1.

**Et depuis le 20/09/2026 il compare aussi les listes de valeurs**
(`scripts/verifier-miroirs-de-check.mjs`) : les constantes et unions de littéraux qui recopient un
`check` du schéma sont **déclarées une par une** dans son tableau `MIROIRS` et comparées à la base,
là où chacune était jusque-là épinglée par un test portant les **mêmes valeurs recopiées une
seconde fois** — une garde du code contre lui-même, aveugle à la seule chose qui compte, que la
base ait changé d'avis. **Toucher à un `check` impose donc de suivre côté TypeScript**, et le
contrôle dit lequel : `TESTING-GARDES.md` §2.7.

**Et écrire une constante qui recopie un `check` impose d'ajouter sa ligne à `MIROIRS`** : c'est une
liste déclarée, donc un miroir que personne n'y déclare lui reste invisible, et rien ne balaie le
dépôt pour le trouver — **une garde déclarative ne s'annonce jamais exhaustive**. Ce qu'elle a déjà
manqué, les deux formes qui lui échappent structurellement, et pourquoi une constante s'y déclare
une fois par colonne qu'elle sert : `TESTING-GARDES.md` §2.7.

**Toucher au référentiel des facteurs invalide TOUTES les valeurs attendues de la suite pgTAP,
y compris celles qui ne nomment pas le facteur touché — et « toucher » inclut en ajouter un.**
Trois CI rouges pour l'apprendre (PR #34, #41, #48) ; la méthode qui marche, recalculer chaque
assertion par une requête et jamais à la main : `TESTING-PGTAP.md` §2.2.

**Des assertions de la suite échouent sur le projet distant et passent en CI, parce qu'elles
supposent une base vierge** — et des fichiers y feraient partir de vrais messages, emails comme
notifications (`09`, et depuis C4.2 la section 8 de `35`) : `TESTING-PGTAP.md` §2.3, qui les nomme, à
lire avant de « corriger » un test qui n'a rien, et avant de rejouer un fichier sur le distant. (Ce paragraphe les comptait ;
le compte s'est périmé le 21/09/2026, quand l'une d'elles a été fermée.)

**Dans une transaction pgTAP, `created_at` ne désigne aucune ligne, et la place d'une assertion
fait partie de l'assertion** : `TESTING-PGTAP.md` §2.4.

## Architecture

**Stack** : Expo (React Native + Expo Router, un seul codebase mobile+web) · Supabase
(Postgres + Auth + RLS) · Vercel (déploiement web, build via `vercel-build` →
`expo export --platform web` → `dist/`) · EAS (build/publish Android uniquement).

**`vercel.json` porte `cleanUrls: true`, et ce n'est pas cosmétique** : sans lui, toute route sans
enfants (`/suivi`, `/rappels/stop`, la restitution) répond 404 en production pendant que l'export
local est parfait — `VERCEL.md` §1.5. **Il ne se déploie plus de prévisualisation** (`git.deploymentEnabled`,
trois pièges dont `"**"` et jamais `"*"` — §1.4), la vérification visuelle du web se fait localement
par `expo export --platform web` puis Playwright sur `dist/`. **Et chaque fusion sur `main` est un
déploiement qui coûte ≈ 1,8 Mo de Functions Storage pendant trente jours** — §1.1, §2.1 et la
convention de fusion en §2.3 ; les fusions qui ne touchent que la documentation sont sautées par
`scripts/vercel-ignorer-le-build.sh` (§1.3), dont la liste blanche dit ce que le build ne lit pas.

**`api/`** : Vercel Functions, détectées automatiquement par la plateforme (dossier `/api` à
la racine, indépendant de l'export statique Expo régi par `vercel.json`) — pas de route Expo
Router. Tsconfig dédié (`api/tsconfig.json`, exclu du tsconfig racine, `types: ["node"]`) : ce
contexte tourne en Web Fetch API (Request/Response), pas dans React Native. Utilisé pour
`api/partage.ts` (runtime Edge) et `api/share-card.ts` (runtime Node.js, rendu d'image via
`satori`/`@resvg/resvg-wasm`) — carte de bilan partageable, cf. « Partager mon bilan » dans
`src/app/(tabs)/suivi/bilan.tsx`. **Une Vercel Function en runtime Node.js a une checklist non
négociable, et son échec est muet** (`FUNCTION_INVOCATION_FAILED` générique, aucun détail côté
client) : `VERCEL.md` §1.6, et le détail de chaque point avec les vrais logs qui l'ont diagnostiqué
en `docs/architecture/v1-06-partage-social.md` §3. **Et depuis le 20/09/2026, les deux fonctions
sont rendues sous Node à chaque PR** (`scripts/verifier-api.mjs`, ses mutations datées en tête) :
la carte par son vrai chemin — et une seconde fois sur un chemin **relatif**, plus une troisième
sans paramètre pour prouver que la chaîne de requête atteint le rendu —, la page avec son chiffre.
La panne muette a donc une garde ; ce qu'elle ne voit pas est nommé en `VERCEL.md` §1.6, et c'est
**deux** points et non un : le traçage des assets et `maxDuration`, que rien ne chronomètre.

**Routing** : `src/app/` (Expo Router, file-based), organisé autour d'une **barre à deux
onglets** depuis `v1-11`. Le groupe `src/app/(tabs)/` porte les deux seuls lieux du produit, et
**tous deux sont des piles depuis C5.2** : `plan/`, dont `plan/index.tsx` est le présent (action
engagée, point de la période) et `plan/pistes.tsx` la liste exhaustive ; et `suivi/`, dont
`suivi/index.tsx` est l'historique et `suivi/bilan.tsx` la restitution d'un bilan
(`/suivi/bilan?id=`, `&nouveau=1` à la sortie du questionnaire). **La restitution n'est pas un
troisième lieu** : c'est la dernière page d'un flux, ou le détail d'une entrée du suivi — d'où
sa place dans cette pile, qui garde la barre visible.

Tout le reste vit hors du groupe et s'affiche en plein écran, sans barre : `/onboarding` et
`/bilan` sont des **flux**, `/compte/*`, `/connexion/*` et `/contexte` (les quatre réponses B4,
corrigeables seules depuis C6.4) des détours, `/confidentialite`,
`/conditions`, `/compte/suppression`, `/rappels/stop` et `/feedback` des surfaces publiques ou de
service. Les
deux règles qui vont avec ce découpage (ajouter une route dans `(tabs)/` lui donne un onglet ;
jamais de route dynamique `[id]`) sont rappelées en fin de fichier et détaillées dans
`FRONT.md`, pas ici.

Le parcours : `/` route sur `/plan` si un bilan complété existe, sinon `/onboarding` → `/bilan`
(la sortie de l'onboarding vide la pile avant d'y entrer, `dismissAll()`) →
`/suivi/bilan?id=…&nouveau=1`, d'où l'on rejoint le plan. `/connexion` s'atteint depuis la
restitution — transition imposée (`resultat_transition`) et bouton délibéré (`resultat_cta`),
deux provenances que la mesure distingue — et depuis `/compte` (`compte`).
`/connexion/retrouver`, seul chemin **délibéré** vers un compte existant — depuis le 21/09/2026,
un code demandé sur `/connexion/email` pour une adresse déjà prise rouvre aussi ce compte, sans que
l'écran dise quelle branche est partie —, s'atteint depuis les provenances
que `SOURCES_RETROUVER` (`src/types/analytics.ts`) énumère — la liste est la source, et
`COMPTE.md` §2 dit d'où vient chacune et pourquoi quatre d'entre elles ont longtemps été muettes. Le
compte s'ouvre par son icône (`CompteBouton`), pas par un onglet.

**`/bilan/resultat` existe toujours, et c'est exprès** : un `<Redirect>` de quinze lignes vers
`/suivi/bilan`, parce que l'adresse est citée dans `page-titles.ts`, dans l'en-tête
d'`api/partage.ts`, dans les liens déjà partagés et dans des favoris. Un lien mort silencieux
est le pire résultat d'un déplacement de fichier, et c'est la destination de la boucle de
partage — ne pas la supprimer au prochain nettoyage.

**Documentation de référence — à lire avant toute modification de schéma ou de flux** :
`docs/architecture/v1-0N-*.md`. **Et pour savoir où en est le produit** — les increments livrés, la
feuille de route, ce que la dernière recette a trouvé — :
[`docs/architecture/produit.md`](docs/architecture/produit.md), qui est un document **vivant** là
où les `v1-0N` sont datés. Ce sont des décisions actées, pas des brouillons ; chaque
fichier documente son propre statut (ex. `v1-01` a un bandeau indiquant que son §2-3 est
obsolète, remplacé par `v1-05-bilan-v2.md` — toujours vérifier qu'un document n'a pas été
supersédé par un increment plus récent avant de s'y fier). `docs/design/` contient le
handoff design/UX d'origine (spec fonctionnelle, maquettes) — figé tel quel, jamais réécrit ;
les fichiers `v1-0N` dans `docs/architecture/` documentent les écarts assumés et révisions
produit par rapport à ce handoff (les deux plus importants : §1 de
`v1-04-authentification.md`, voir plus bas, et `v1-06-partage-social.md` — décisions du
04/09/2026 sur les leviers de croissance/engagement, ce qui reste un non-goal ferme
(comparaison entre utilisateurs) vs. ce qui a été révisé, et le détail des Vercel Functions en
runtime Node.js §3).

**Un écran d'onglet ne charge ses données qu'une fois par lancement, et c'est ce qui a cassé la
boucle d'engagement au dernier mètre** (trouvé sur appareil le 09/09/2026, `v1-12` §8.1 — le canal
marchait parfaitement pendant que la boucle se cassait). Appuyer sur la notification ouvrait le plan
**sans la question** : react-navigation garde l'écran monté, et l'app survit à l'arrière-plan, qui
est exactement l'état d'où l'on revient quand une notification arrive. D'où `useRafraichirAuRetour`
(`src/hooks/use-rafraichir-au-retour.ts`) : **tout écran d'onglet dont le contenu peut changer côté
serveur doit l'utiliser**, et il écoute deux retours parce qu'il en faut deux — le focus de l'écran,
et le retour de l'app au premier plan que la navigation ne voit pas. Un `useEffect` de montage, là,
rend un écran plausible et périmé.

**Ce qui fait marcher Ramille sans vivre dans le dépôt a un registre : `docs/exploitation/`**
(lot 0 du plan v1-13, livré le 10/09/2026). Son `README.md` nomme les comptes tiers — Supabase,
Vercel, EAS/Expo, Google Play, Google Cloud et le projet Firebase d'où viennent
`google-services.json` et la clé FCM v1, Resend, Brevo, le registrar du domaine, GitHub — les réglages
qu'ils portent, ce qui tombe si l'un manque, la checklist à parcourir avant de publier sur Play,
et la question de continuité (tout tient à une seule personne, elle n'est pas tranchée). Son §8
est la porte d'entrée des journaux : `analytics.rappels_par_jour`, `analytics.rappels_bloques`,
`analytics.synchronisations_facteurs`, `public.reminder_send_runs`, `public.purge_runs`, chacun
avec sa requête et ce qui doit alerter — et, depuis le lot 6, `analytics.cohortes_purgees` et
`public.suppressions_de_compte_par_mois` (§8.5 bis), puis les quatre vues de l'administration
(§8.5 ter). À côté : `redirect-urls.md` (la liste réelle des URL de redirection Supabase, relevée entrée par entrée, avec ce qui doit en être retiré),
`sauvegarde.md` (le régime de sauvegarde et la procédure de restauration) et
`remontee-erreurs.md`. **Rien dans le code ni dans la CI ne voit ces réglages, et ces journaux
n'émettent qu'une alerte, désactivable** — un e-mail récapitulatif quand ils voient du neuf, depuis le
02/10/2026 (§8.11) : c'est ce dossier qui les rend vérifiables, et un journal qu'on ne sait pas où
lire se lit zéro. Aucune valeur secrète n'y descend — on nomme le réglage et
l'endroit où il vit.

Deux nuances du fichier des redirections qu'il ne faut pas réécrire à l'envers — le suffixe de
compte resserre un motif de preview sans le fermer, et `ramille.vercel.app` se retire le jour où
le projet Vercel est renommé : `SUPABASE.md` §2.5. Depuis le 02/10/2026, la liste n'a plus aucune
entrée `vercel.app` : elles valent pour qui voudrait en remettre une.

### Modèle d'authentification (à connaître avant de toucher à l'auth ou au bilan)

Choix architectural clé, différent de ce que suppose le handoff design : **chaque
visiteur reçoit une session Supabase Auth anonyme dès l'ouverture de l'app**
(`ensureSession()` dans `src/lib/supabase.ts`, appelée en fire-and-forget dans
`src/app/_layout.tsx`), pas un bilan stocké en local puis rattaché à la connexion. Le bilan
anonyme vit donc normalement dans `assessments`/`assessment_answers` etc., protégé par les
mêmes policies RLS owner-scoped que n'importe quel utilisateur (`user_id not null` jamais
assoupli).

La connexion (Google via `linkIdentity()`, email via `updateUser({ email })`) **convertit
la session anonyme en session permanente en conservant le même `user_id`** — jamais
`signInWithOAuth`/`signUp`, qui créeraient un utilisateur distinct et perdraient le
rattachement du bilan déjà stocké. Voir `src/lib/auth.ts`. Sur natif, le flux OAuth suit le
pattern Expo documenté par Supabase : `makeRedirectUri()` + `WebBrowser.openAuthSessionAsync`
(`skipBrowserRedirect`) + `createSessionFromUrl`, qui échange le `code` PKCE du retour par
`exchangeCodeForSession` — `COMPTE.md` §1 dit pourquoi la forme « jetons » est refusée.

Le reste — pas de mot de passe, le code à huit chiffres, PKCE, ce qu'on ne divulgue pas, les trois
sens de « pas de session », le lien du rappel — est dans `COMPTE.md`.

### Base de données

Migrations dans `supabase/migrations/`, appliquées sur le projet distant `TraceVerte-v1` (son
tableau de bord l'affiche `TraceVerte`) par
`mcp__Supabase__apply_migration` ; **après toute migration, `src/lib/database.types.ts` se
retouche à la main** — comment, et ce que la CI en vérifie : `SUPABASE.md` §2.1.

**Les privilèges de table sont écrits** (`20260910110000_grants_explicites.sql` ;
`supabase/config.toml` ne porte plus `auto_expose_new_tables`) : **ajouter une table impose un
`grant` ou un `revoke` explicite**, sinon elle est invisible pour l'app, en silence —
`SUPABASE.md` §2.2.

**Et cette phrase a été FAUSSE jusqu'au 20/09/2026, dans le sens le plus dangereux** : une table
neuve n'était pas invisible, elle était **grande ouverte**. `pg_default_acl` accordait `arwdDxtm`
— dont `select`, `update` et `delete` — à `anon` **et** à `authenticated` sur toute table créée
dans `public`, RLS inactive par défaut. Mesuré en transaction annulée, en local comme sur le
distant : une table neuve, une ligne dedans, `set local role anon` sans aucune session — `anon`
l'a lue, puis l'a supprimée. Aucune des vingt tables existantes n'était concernée ; le danger
était la **prochaine migration**, écrite par quelqu'un qui croit le paragraphe ci-dessus, donc qui
ne vérifie pas — et que ni la CI ni pgTAP n'auraient attrapée, le local se comportant comme le
distant. `20260920190000_trois_gardes_qui_manquaient_sous_les_gardes.sql` ferme la moitié qui nous
concerne (les objets créés par `postgres`, c'est-à-dire par les migrations) ; l'autre moitié
appartient à `supabase_admin`, **et le réglage du tableau de bord ne la ferme pas** (désactivé, mesuré le
02/10/2026) — sans conséquence tant que tout objet de `public` est créé par `postgres`, ce que
les privilèges relevés ce jour-là confirment : `SUPABASE.md` §2.2 et `docs/exploitation/README.md`
§3.1 et §5. Trois assertions de `31` épinglent la moitié `postgres` en CI, dont une sur le
catalogue.

**Une policy appelle `auth.uid()` dans un sous-select, et une clé étrangère neuve veut son
index** — aucun des deux ne se voit à la lecture : `SUPABASE.md` §2.2.

**Six règles de migration apprises sur le distant, et aucune ne se voit en CI** : une migration de
données ne désigne jamais une ligne par un identifiant généré (`action_text` est la clé naturelle
des gabarits) ; elle se rejoue telle quelle (`add constraint` n'est pas idempotent) ; une
substitution vérifiée reconnaît « déjà appliquée » par la présence du remplacement ; le distant
porte les corps de fonction sans les commentaires du dépôt, donc une ancre n'en contient jamais ;
rejouer un fichier ancien peut défaire une migration plus récente ; et réécrire une fonction part
de `pg_get_functiondef`, jamais du fichier qui l'a créée — `SUPABASE.md` §2.3.

**Et depuis le 20/09/2026, les chemins que les documents citent sont vérifiés à chaque PR** (`scripts/verifier-renvois-des-documents.mjs`, `TESTING-GARDES.md` §2.8) : un fichier renommé ou déplacé fait rougir la CI plutôt que d'attendre une relecture. Ce contrôle voit le **renommage**, pas le mensonge — un document peut nommer le bon fichier et raconter n'importe quoi de son contenu.

Trois pièges vérifiés en construisant `usage_events` (`MESURE.md`), tous silencieux — les deux premiers sont des
pièges Postgres, détaillés en `SUPABASE.md` §2.2 :
- **Un trigger qui compte des lignes que l'appelant n'a pas le droit de lire doit être
  `security definer`**, sinon le quota ne se déclenche jamais — `SUPABASE.md` §2.2.
- **`revoke execute ... from anon, authenticated` ne révoque rien** : il faut
  `from public, anon, authenticated` — `SUPABASE.md` §2.2.
- **Le contexte B4 vit dans `assessment_answers`, et nulle part ailleurs.** `profiles` portait
  des colonnes homonymes `zone_type`/`tc_access` héritées du schéma initial, avec un vocabulaire
  *différent* (`urbain`/`aucun` au lieu de `urbain_dense`/`periurbain`/`rural` et `inexistant`) :
  une vue d'analyse branchée dessus segmentait 136 utilisateurs sur `NULL` sans lever d'erreur.
  Elles ont été supprimées (`20260905180000`), avec `profiles.onboarding_completed_at` qu'aucun
  code n'écrivait. Vérifier qu'une colonne est *alimentée* avant de s'y fier — et se méfier des
  valeurs de statut écrites de mémoire (`assessments.status` vaut `completed`, jamais
  `submitted` ; c'est aussi ce que teste la racine de l'app pour router vers le plan — et, depuis
  C4.7, `withdrawn` pour un bilan retiré).
  **Une colonne vide n'est pas une colonne morte** : `emission_factor_sync_runs.detail`,
  `notification_outbox.last_error`, `commute_carpool_size` et `commute_distance_bracket` sont
  toutes nulles en base et parfaitement vivantes. Ce qui qualifie une colonne morte, c'est
  qu'aucun code ne l'écrit.

### Ce que les fichiers de sujet portent, en une ligne par règle

Ce qui suit n'est pas la règle mais **son renvoi** : de quoi savoir qu'elle existe, et où la lire
avant de toucher à ce qu'elle garde. Chacune a coûté quelque chose avant d'être écrite.

**`BILAN.md`** — le questionnaire, le calcul, les modes et les facteurs :
- tout facteur se lit par `public.emission_factor(mode_id, date)` et tout mode se résout par
  `public.resolve_mode(…)` — jamais un `select … limit 1` écrit à la main, jamais un résolveur
  spécialisé rappelé en direct ;
- les facteurs sont l'**ACV complète** (endpoint `ecv`), jamais la seule phase d'usage, et un mode
  ajouté au produit impose sa ligne dans `emission_factor_sources` ;
- `assessment_results` est figé côté serveur, jamais recalculé côté client ;
- ajouter un mode de la catégorie vélo-marche, ou une réponse de voyage, touche aussi la boucle —
  un complément de maintien, une ligne dans `a_des_voyages_declares` (`BOUCLE.md` §1) ; et la
  question du télétravail se gouverne par `teletravailSePose` (`PLAN.md` §1) ;
- la soumission écrit `in_progress` d'abord ; la personne **retire** un bilan (`withdrawn`, par
  `retirer_le_bilan`), elle ne le supprime pas — seules la suppression du compte et la purge l'effacent.

**`PLAN.md`** — les actions, l'engagement, la saison et le premier parcours :
- `plan_actions` ne s'écrit que par RPC (`commit_plan_action`…), jamais par une policy : **la RLS
  filtre des lignes, jamais des colonnes** — la même raison ferme `engagement_checkins` (`BOUCLE.md`) ;
- aucune action sous 5 kg/an, et une condition de contexte qu'on ne peut pas évaluer n'est pas
  remplie ; l'estimateur lit l'instantané figé du bilan, et on ne recalcule jamais les kilomètres
  ailleurs ;
- `plan_actions` a deux clés étrangères vers `plan_cycles` : une lecture imbriquée nomme la sienne ;
- aucun chemin ne détruit un engagement sans l'archiver (`archiver_engagement`) ;
- `cadence_type = 'rolling_quarter'` est dormant, pas mort.

**`BOUCLE.md`** — les points de suivi, leurs réponses et leurs rappels :
- le point interroge la période **écoulée**, et sa question est figée à la génération
  (`committed_question`) ;
- `response_kind` est la vérité d'une réponse : on filtre `status = 'answered'`, jamais
  `response is not null` ;
- les paires SQL/TypeScript (le mois, les jours, la période précédente, le canal de rappel…) se
  touchent ensemble, et leur nombre ne s'écrit nulle part ;
- un point, un message (`unique(checkin_id)`) ; ce qui s'espace est le message, jamais le point ;
- les deux boucles partent du dernier bilan valide, par `boucles_du_dernier_bilan`.

**`COMPTE.md`** — la connexion, la session, le hors-ligne et la suppression :
- pas de mot de passe : par e-mail, le rattachement et la reconnexion passent par un code à
  **huit** chiffres, dont le `type` (`email_change` / `email`) n'est pas interchangeable ; Google
  passe par `linkIdentity` ;
- aucun écran ne dit si une adresse a un compte ;
- aucun compte ne naît hors d'une session anonyme (hook `before_user_created`), et le code de
  rattachement coûte un captcha que la base vérifie elle-même — sa clé dans le Vault allume
  l'exigence, donc un build Android qui n'appelle pas l'autorisation ne rattache plus par e-mail ;
- le flux est en PKCE, et une erreur d'auth se reconnaît à son **code**, jamais à son message ;
- dès que le hook d'envoi est allumé, les deux codes partent de la base (`envoyer_l_e_mail_d_auth`) ;
  ses plafonds ne valent que pour le rattachement et sont **muets** — un refus dirait qui a un
  compte — ; un gabarit se change en trois copies dans le dépôt (document, `supabase/templates/`,
  migration), plus le tableau de bord, qui reprend l'envoi hook éteint ;
- hors ligne se reconnaît à `status === 0`, et la marque locale de bilan n'est lue qu'en repli ;
- la suppression efface une ligne d'`auth.users` et laisse la cascade faire le reste — jamais une
  table rattachée à `profiles` autrement qu'en `on delete cascade` ;
- sur Android, ce que l'app capture tient au `pathPrefix` `/plan` d'`app.json`, un préfixe de
  **chaîne** : une future route `/planning` ou `/plan-b` serait capturée sans que rien ne le dise.

**`MESURE.md`** — l'usage, les cohortes et le canal de retour :
- on n'instrumente jamais ce que le schéma enregistre déjà ;
- ajouter un événement impose une ligne par migration **et** une entrée dans
  `src/types/analytics.ts` ; une provenance se déclare dans sa liste `SOURCES_*` ;
- toute mesure de forme cohorte s'écrit **avant** la purge, sans identifiant ni segment, et un
  compteur qui échoue n'arrête jamais une suppression.

### Conventions front notables → `FRONT.md`

**Cette section vit désormais dans [`FRONT.md`](FRONT.md)**, sorti d'ici le 17/09/2026 où il pesait
545 lignes sur 1 911 — 29 % du seul fichier qu'une session charge à chaque fois. Même motif que les
autres fichiers d'outil : ce qui est propre à **un sujet** s'ouvre sur déclencheur, et la
table en tête de ce fichier dit lesquels.

Ce qui y est : les repères chiffrés et leurs trois formateurs, le palier, le vocabulaire des postes
et ses quatre registres, la saison côté client, l'accessibilité, les deux onglets et leurs états de
chargement, et ce que `api/` duplique de `src/`. **Et depuis le 01/10/2026, la famille `FRONT-*`**
porte le reste — la mascotte, le questionnaire, la session et le démarrage, le suivi, le mouvement —,
ouverte sur ses propres déclencheurs.

**Deux règles restent ici parce qu'elles se cassent sans qu'on ait ouvert un écran** :

- **ne jamais créer de route dynamique `[id]`** — l'export statique exige `generateStaticParams`,
  sans quoi la page n'est pas produite et Vercel répond 404 sans rien signaler, d'où `?id=`
  partout ;
- **ajouter une route dans `src/app/(tabs)/` lui donne un onglet**, et le produit n'en a que deux.
  C'est presque toujours une erreur : un flux, un détour ou une surface publique vit hors du
  groupe.
