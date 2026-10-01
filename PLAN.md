# PLAN.md — les actions, l'engagement, la saison et le premier parcours

> **Quand ouvrir ce fichier.** Toucher aux actions du plan (un gabarit d'`action_templates`, un
> filtre de contexte, `estimate_action_savings`) · toucher à l'engagement (`commit_plan_action`,
> l'archive, la reconduction) · toucher à la génération du plan, à sa cadence ou à `p_cause` ·
> toucher au contexte (`/contexte`, `mettre_a_jour_le_contexte`) · toucher à l'écran du plan : la
> saison, le cap, le premier plan, la barre d'onglets du premier parcours.
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

Le point de suivi qui referme une action engagée est dans `BOUCLE.md` ; ce que les écrans d'onglet
font de leurs états et de leur mise en page est dans `FRONT.md` §2.11, et la carte d'attente en `FRONT-SESSION.md` §2.7.

---

## 1. Les actions : des opérations, filtrées et figées

**Les actions du plan sont des opérations, pas des phrases.** `action_templates` porte un
`poste`, un `segment`, une `operation` (`substitute` / `share_vehicle` / `remove_trip` /
`remove_day`) et sa quantité ; `estimate_action_savings(assessment_id)` les applique à un bilan
et rend les gains en kg/an, triés. Deux règles non négociables : **aucune action au gain
inférieur à 5 kg/an n'est proposée** (aux facteurs ACV, substituer une voiture par un bus urbain
ne gagne que 14 %, contre 33× pour le métro — c'est invisible sans le calcul, d'où l'absence de
tout template proposant le bus), et le **contexte B4** (`zone_type`, `tc_access`,
`household_vehicles`) filtre l'impossible : pas de transports en commun là où la personne a
répondu qu'il n'y en a pas. L'estimateur lit l'instantané par segment figé sur
`assessment_results` (`commute_main_leg_km_year`, `travel_flight_long_co2_kg_year`…) — **ne
jamais recalculer les km ailleurs**, les deux implémentations divergeraient. Les gains sont
ensuite figés sur `plan_actions`, comme `assessment_results` fige le bilan.

**Le plan fige TOUTES les actions au gain suffisant, et c'est l'écran qui en montre deux** (C4.6,
`20260913110000_pistes_et_premier_pas.sql`). `generate_plan_cycle_for_user` portait un `limit 2` — un
choix d'écran écrit dans le SQL — qui jetait les autres leviers avant même de les écrire, alors que
`estimate_action_savings` rend déjà toutes les actions dont le gain atteint 5 kg/an, triées, et que la
colonne `rank` existe depuis l'increment 6 précisément pour que l'affichage décide. Quatre points :

- **Deux cartes sur le plan, tout sur sa liste** (C5.2, `pistesDuPlan` et `pistesParPoste`,
  `src/types/plan.ts`). Le plan rend les deux premières pistes en cartes pleines — l'action engagée
  devant —, puis le lien « Voir toutes les pistes · N » vers `plan/pistes`, qui les présente
  **toutes**, groupées par poste, dans l'ordre du rang et sans rang affiché ; le lien ne se rend que
  s'il y a plus que les deux cartes à voir. Le compte est **dans** le libellé, et c'est le total : un
  lien qui ne dit pas combien il mène à voir n'aide pas à décider de l'ouvrir. Ce texte a décrit
  jusqu'au 01/10/2026 les « trois rangs » d'avant C5.2 — deux cartes pleines, deux estompées derrière
  « Voir d'autres pistes · N », puis des lignes simples. **Ce qui en reste est la promesse, pas la
  forme** (recette du 14/09/2026, §12.4, `v1-16` §5) : **toute piste affichée se choisit**. Les
  lignes simples d'alors n'avaient pas de bouton, donc le plan affichait des leviers chiffrés et
  inatteignables ; sur la liste, chaque rangée est désormais la cible qui ouvre la carte sur le choix
  (`v1-32`). Une garde de **partition** dans `plan.test.ts` épingle ce dont la promesse dépend : un
  groupement qui laisserait tomber une action recréerait ici, en silence, le `limit 2` que ce
  chantier a retiré du serveur.
- **`actionsCount` décide de ce qu'un plan à zéro action tait**, et en un seul endroit,
  `cartesDuPlan` : la félicitation à la place des cartes, ni encart de contexte ni note technique —
  et, depuis le 01/10/2026, ni l'intro (audit P-5, HANDOFF `v1-17` planche C). **L'intro ne compte plus rien** : elle comptait `enAvant.length` jusqu'à C5.3, qui l'a
  remplacée par une ligne fixe qui dit le principe — « Une action par saison, une seule. C'est pas à
  pas qu'on tient un cap. » —, et ce principe n'a pas de sens au-dessus d'aucune action.
- **`first_step` est une ligne sans chiffre qui décrit un essai**, figée sur `plan_actions` comme le
  gain, et affichée **seulement une fois l'action engagée** : avant le choix, une consigne pratique se
  lit comme une charge de plus. Elle ne chiffre rien — le gain est juste au-dessus, et
  `/conditions` affirme que le produit ne fournit pas de prestation de conseil en mobilité. Deux
  balayages de la table l'épinglent (aucun gabarit sans premier pas, aucun chiffre dedans) plutôt que
  de nommer les gabarits un par un : celui qu'on ajoutera demain traverserait une liste. Le compte
  qui figurait dans `CLAUDE.md` s'est périmé à la vague suivante, où C3.8 en a ajouté quatre — c'est exactement
  la raison pour laquelle il ne s'écrit plus.
- **`commit_plan_action` prend `p_replace`, et son défaut refuse.** La fonction libérait et archivait
  l'engagement précédent **sans condition** (C2.2) : le geste le plus irréversible du produit partait
  en silence depuis n'importe quel appel. `p_replace = false` lève `RM001` — un SQLSTATE de la classe
  réservée aux conditions utilisateur, que le client reconnaît par son **code** et jamais par le
  message —, et l'écran relit alors le plan plutôt que de parler de réseau : ce refus veut presque
  toujours dire que l'état a changé depuis l'affichage. La signature **remplace** l'ancienne au lieu
  de la doubler, comme `repondre_au_checkin` en C2.4.

**Le plan ne propose plus l'impossible, et la règle qui l'en empêche vaut pour les filtres à
venir** (C3.8, `20260914131144`). Le filtre de contexte ne lisait qu'une valeur sur trois —
`requires_tc` n'écartait les transports en commun que sur `tc_access = 'inexistant'` —, donc
« Passer deux trajets sur cinq en métro ou en tram » arrivait **en tête** du plan d'un profil rural
à desserte limitée : le gain était juste, l'action impossible. Six points :

- **Une condition qu'on ne peut pas évaluer n'est pas remplie** : sans réponse, on ne propose pas.
  C'est l'inverse du choix de C3.1 (`mobility_constrained` nul **montre** la barre de la moyenne
  française), et l'asymétrie est le raisonnement — là-bas ne pas savoir faisait **cacher** un
  repère, ici cela ferait **proposer** une action implausible.
- **`action_templates.zones_admissibles` et `.teletravail_admissible` sont des listes de valeurs
  admissibles**, `null` valant « pas de condition ». Pour le télétravail ce n'est pas du style : il
  y a **deux seuils**, un jour se tenant avec « un jour » et deux jours demandant « deux ou plus ».
  Un tableau **vide** n'est pas un tableau absent — `= any('{}')` est faux pour toute valeur, donc il
  écarte tout le monde là où `null` n'écarte personne ; un test l'interdit.
- **Le métro et le tram sont bornés à `urbain_dense`, le train et le RER ne le sont pas**, et c'est
  la moitié qu'il ne faut pas « uniformiser » : un TER dessert des communes rurales, et lui coller
  la même zone retirerait à ce profil la seule alternative qui lui reste.
- **Le télétravail se demande** (B4.4, `assessment_answers.teletravail`), et l'action s'appelle
  « Travailler depuis chez toi un jour par semaine » — « garder » supposait qu'on en avait. Le
  libellé seul ne suffisait pas : sans la question, l'action reste en tête chez les gros rouleurs
  sans alternative. La garde du `remove_day` se dérive du gabarit (`commute_days_per_week <=
  t.trips`) au lieu d'un 2 écrit en dur : retirer deux jours à qui en fait deux supprimerait 100 %
  du trajet, et le gain annoncé serait celui de ne plus travailler.
- **La question demande un nombre de jours, et « Parfois » n'existe plus** (C5.4,
  `20260917103000_teletravail_en_jours.sql`). « Peux-tu travailler depuis chez toi ? oui / parfois /
  non » posait une **possibilité** là où le produit lisait un **nombre de jours** : « Parfois » était
  un seuil déguisé en hésitation, et y répondre coûtait l'action à deux jours sans que rien ne le
  dise. Les valeurs sont `aucun` / `un_jour` / `deux_ou_plus`, la question nomme le nombre de jours
  déclaré (« Sur tes 5 jours de trajet, combien pourrais-tu travailler depuis chez toi ? »), et sa
  traduction préserve le comportement — la migration le **prouve** par une table de vérité case par
  case, et `src/lib/database.types.ts` ne bouge pas (la colonne reste `text`, la base n'a aucun
  `enum`). Deux points à ne pas défaire :
  - **la question disparaît en dessous de deux jours de trajet**, parce qu'à un seul jour l'action
    supprimerait 100 % du trajet et que la garde du `remove_day` l'écarte déjà — la réponse ne
    pourrait rien changer ;
  - et **ce qui décide de l'afficher décide aussi de l'effacer et de la réclamer** :
    `teletravailSePose` (`src/types/bilan.ts`) est lue par l'écran, par `manqueDeLEtape` et par
    `normaliserReponses`, parce que B4.4 n'est pas une étape mais un **champ** de l'étape
    « Contexte », donc `isStepVisible` ne la gouverne pas. En oublier un ne coûte pas la même chose
    (`v1-17` §7.2) : ne toucher que l'écran laisse l'étape incomplète **pour toujours** — depuis
    `v1-31`, le « Suivant » en attente y mène à une question absente, sous une ligne qui la nomme,
    et le focus retombe sur l'étape (`FRONT-QUESTIONNAIRE.md` §2.6) ; oublier `normaliserReponses` laisse partir à la
    soumission une réponse que la personne ne voit plus et ne peut plus corriger — le défaut de
    `v1-16` §4 par une autre porte.
- **Les échéances dépendent du poste** (`intentionTimingsForPoste`, `src/types/plan.ts`) : « Ce
  mois-ci » n'est pas une échéance pour un vol. Les voyages ont les leurs, les trois anciennes
  restent et sont celles des sorties. Le repli d'un poste inconnu est la liste des sorties, sans
  quoi la feuille s'ouvrirait sur rien et « C'est noté » resterait inactif sans dire pourquoi.
- **`cadreDuPlan` décide de ce que le cap a le droit de chiffrer, et de rien d'autre depuis C5.3.**
  Un plan à **zéro action** ne chiffre pas son cap — ce n'était un cas de bord qu'avant C2.5, et
  depuis, tout cycliste et tout profil sédentaire y tombe ; la carte se rend quand même, elle est
  depuis C2.8 l'endroit où la période se nomme. Le cap reste celui du poste dominant : le
  recalculer sur le total côté client ferait deux définitions d'un même chiffre.
  **Deux champs en sont partis, et ce n'est pas un allègement** : `intro` décrivait les deux cartes
  posées dessous (« Deux actions pour ton trajet domicile-travail ») en taisant les neuf autres,
  remplacée par une ligne fixe qui dit le **principe** — une action à la fois, la seule question
  qu'on se pose devant deux cartes. Et `noteDuCap` énonçait une **règle que rien n'applique** : le
  cap est une quantité à atteindre, aucun endroit du produit ne vérifie d'où vient la réduction.
  Elle était rare tant que le poste dominant remplissait les deux premières cartes ; **le
  classement de C5.1 l'aurait réveillée sur la plupart des plans**, les meilleurs leviers venant
  souvent d'ailleurs. La dérivation reste malgré son unique booléen parce que l'écran
  ne doit pas trancher ça en ternaire — et **non** parce qu'elle porterait deux causes. `CLAUDE.md`
  l'a écrit jusqu'au 20/09/2026 (« deux causes qu'un `||` rendrait à moitié inéprouvables ») : c'était
  l'état d'avant C5.3, et la phrase **dictait une régression** — appliquer ce `||` ôterait son cap à
  un plan à cinq actions dont aucune n'est en avant. Une seule cause vaut : zéro action. Un test
  compare désormais les deux formes à nombre d'actions égal, et il tombe sur cette fusion.

**`action_text` est la clé naturelle du référentiel d'actions, et elle porte enfin un index
unique.** Tout le dépôt apparie les gabarits par elle — `action_templates.id` vaut
`gen_random_uuid()`, donc les identifiants diffèrent d'une base à l'autre — et rien ne le
garantissait ; c'est aussi ce qui rend l'insert de C3.8 rejouable (`on conflict do nothing`). Deux
pièges de la même famille : **`transport_mode_category` n'existe plus** sur cette table (supprimée
par `20260905130000` une fois la reprise de données faite), donc un insert recopié depuis ce
fichier-là échoue ; et un gabarit ajouté doit porter `question_template` **et** `first_step`, que
deux balayages épinglent sans nommer personne.

## 2. L'engagement

**L'engagement sur une action passe par un RPC, jamais par une policy UPDATE.**
`plan_actions` porte des chiffres figés à la génération, et **deux gardes indépendantes les
protègent depuis le 10/09/2026** : aucune policy d'écriture — en ajouter une ouvrirait toutes les
colonnes, la RLS filtrant des lignes et jamais des colonnes — et aucun privilège d'écriture au
niveau table, `grant select` seul (`20260910110000_grants_explicites.sql`). Un ordre direct est
donc refusé par le privilège (42501) avant même d'atteindre la RLS ; jusqu'à cette date le
privilège `UPDATE` était accordé par défaut et seule l'absence de policy le rendait inoffensif.
D'où `commit_plan_action` / `clear_plan_action_commitment` (`security definer`, propriété
vérifiée à l'intérieur), et deux tests pgTAP qui épinglent le refus. Une seule action engagée par cycle
(index unique partiel), intention obligatoire, en jours de la semaine pour le poste
domicile-travail et en échéance fermée pour les autres — jamais de saisie libre.

**Aucun chemin du produit ne détruit un engagement sans en laisser une trace** (C2.2, 11/09/2026,
`20260912150000_engagement_qui_survit.sql`). Il y en avait quatre, et ils se ressemblent assez pour
qu'on en oublie un : le re-bilan dans la même période (le plus fréquent — on corrige une réponse
juste après l'avoir soumise), le changement de saison, « Changer d'avis », et **« Choisir une autre
action », dont la libération est une ligne interne de `commit_plan_action`** que rien n'affiche. Ce
qui partait : `committed_at`, `intention_days`, `intention_timing` — le seul choix personnel que le
produit demande, annulé par le second geste le plus encouragé. Quatre points à connaître :

- **`plan_action_commitments_archive` n'a qu'une seule écriture, `public.archiver_engagement`**, et
  elle prend des **valeurs** et non un `plan_action_id`. Ce n'est pas du confort : au re-bilan la
  ligne est déjà supprimée au moment où l'on sait que son gabarit n'a pas survécu, donc une fonction
  qui relirait la ligne n'archiverait **rien**, en silence, dans le cas principal du chantier. Les
  deux chemins clients passent par `archiver_engagement_de_laction`, qui délègue. `action_text` y est
  **figé** : C3.8 reformule plusieurs gabarits, et relire le libellé courant réécrirait ce que la
  personne a lu en choisissant.
- **Le re-bilan reprend l'engagement, le changement de saison le reconduit.** Les deux situations
  s'excluent dans `generate_plan_cycle_for_user` (le cycle existe déjà / il est neuf), et la capture
  précède l'upsert parce que le `delete` est irréversible. Une reconduction pose
  `plan_actions.carried_over_from` sur le cycle d'**origine** — jamais sur la ligne `plan_actions`
  précédente, qui est supprimée à chaque reconstruction et emporterait l'étiquette
  « · RECONDUIT » avec elle. La ligne de l'ancien cycle garde son propre engagement : c'est de
  l'historique, et l'index unique est **par cycle**. **Seul le cycle immédiatement précédent se
  reconduit** (corrigé le 27/09/2026, trouvé en écrivant C4.7) : la requête prenait la dernière
  action engagée de **n'importe quel** cycle antérieur, donc une saison passée sans engagement —
  « Changer d'avis », un retrait — faisait revenir l'action d'il y a deux saisons. Le scénario E de
  `21_engagement_qui_survit.test.sql` l'épingle.
- **`plan_actions` a désormais deux clés étrangères vers `plan_cycles`**, donc toute lecture
  imbriquée doit nommer la sienne : `plan_actions!plan_actions_plan_cycle_id_fkey(…)`. Sans le nom,
  PostgREST refuse la requête (« more than one relationship was found ») et l'écran du plan ne
  charge plus **du tout**. Le typecheck l'attrape — la chaîne du `select` est analysée au niveau
  des types —, et depuis le 20/09/2026 le parcours réel aussi, qui charge cet écran contre une
  vraie stack et s'arrêterait à l'étape « plan ».
- **`assessments.submitted_at` vient du serveur** (trigger `stamp_assessment_submitted_at`, posé au
  seul passage en `completed`, **et privilège de colonne depuis le 20/09/2026**). Le trigger seul ne
  suffisait pas, et cette phrase a été fausse un temps : il ne pose la date qu'à la **transition**,
  donc un `update` ne touchant que cette colonne sur un bilan déjà complet passait au travers, et la
  policy owner-scoped l'autorisait — la garde d'idempotence du plan croyait comparer deux
  horodatages serveur. `authenticated` ne porte plus l'`update` que sur `status`, la seule colonne
  que la soumission écrit. Il venait du téléphone, et la garde d'idempotence du plan le
  comparait à un horodatage serveur : un téléphone en avance faisait reconstruire le plan à chaque
  passage du cron — donc, avant cette migration, effacer l'engagement chaque nuit. Corollaire pour
  les tests : **une fixture ne peut plus choisir `submitted_at` à l'insert**, elle insère puis met la
  date à jour (`old.status` et `new.status` valant tous deux `completed`, le trigger ne réécrit
  rien) ; et dans une transaction pgTAP où `now()` est figé, un re-bilan **rapproche** les dates au
  lieu de les écarter, donc il faut reculer explicitement l'ancien bilan **et** le `created_at` du
  cycle, sans quoi les deux gardes renvoient et les assertions passent sans rien éprouver.

## 3. La génération du plan, sa cadence, et le contexte qui la relance

Deux mécanismes de génération server-side qu'il faut garder synchronisés si on les touche :
- `generate_plan_cycle_for_user(p_user_id, p_cause)` (security definer, revoked de
  public/anon/authenticated) génère le plan de réduction d'un utilisateur. Appelée à la fois par le
  cron nightly `generate_plan_cycles()` (boucle sur tous les utilisateurs) et **à la fin de
  `recompute_assessment_results()`** — et non de `compute_assessment_results()`, que `CLAUDE.md`
  nommait à tort : relevé dans `pg_get_functiondef` le 19/09/2026, la ligne est dans la fonction
  interne, donc toute reprise de calcul en masse régénère aussi les plans. L'appel y est enveloppé
  dans un `begin … exception` : le bilan aboutit même si le plan échoue, et le cron rattrape.
- Cadence du plan de réduction : saisons **météorologiques** (blocs calendaires de 3 mois,
  pas astronomiques) par défaut, ou trimestre glissant ancré sur la date du bilan si
  `profiles.cadence_type = 'rolling_quarter'`.

**Le contexte se corrige sans resoumettre de bilan, et `p_cause` est ce qui le rend possible**
(C6.4, `20260919230000_le_contexte_sort_du_questionnaire.sql`). « Modifier ces réponses » rouvrait
le questionnaire à l'étape « Contexte », et en sortir soumettait un bilan entier — alors que
corriger « j'ai déménagé » ne change rien à ce qu'on déclare de ses trajets. Six points :

- **`mettre_a_jour_le_contexte(zone, tc, vehicules, teletravail)` est le seul écrivain de ces
  quatre colonnes hors questionnaire**, et ce n'est **pas** une question de permission :
  `assessment_answers` porte déjà une policy `UPDATE` owner-scoped. Ce sont l'**atomicité** (écrire,
  recalculer et régénérer doivent réussir ensemble) et le **bornage des colonnes** — la RLS filtre
  des lignes, jamais des colonnes, donc un `update` client sur cette table atteint les distances et
  les modes, donc le chiffre. Le dire évite qu'un prochain passage retire le RPC en simplifiant.
  **Et jusqu'au 20/09/2026 le RPC ne bornait rien** : la policy qu'il est censé remplacer n'avait
  aucun prédicat de statut, donc les réponses d'un bilan **complété** se réécrivaient en direct —
  `assessment_results` restant figé, puis le premier recalcul serveur faisait bondir le total sans
  qu'aucune ligne ne soit ajoutée à `assessments`. La policy est désormais bornée à
  `status = 'in_progress'`, et le RPC passe parce qu'il est `security definer` sur une table sans
  `force row level security`.
- **Un seul paramètre porte la cause, et les deux conséquences s'en dérivent.** La première forme
  écrite était `p_forcer boolean`, qui obligeait à poser ailleurs la raison d'archivage — donc à
  tenir d'accord deux paramètres disant la même chose. `p_cause` (`'bilan'` par défaut,
  `'contexte'`, et depuis C4.7 `'retrait'`) fait sauter la garde d'idempotence **et** nomme la raison de libération : il n'y a
  pas de façon de forcer sans dire pourquoi. Une valeur inconnue lève `RM004` — un code à elle,
  parce que c'est un invariant de serveur qu'aucun client ne peut atteindre, là où les
  préconditions de `mettre_a_jour_le_contexte` (`RM003`) remontent jusqu'à un écran.
- **La garde d'idempotence devait sauter, et surtout pas `submitted_at` bouger.** Cette date est
  l'âge du bilan, lu par le régime de re-bilan, le suivi et le moment anniversaire ; la déplacer
  pour déclencher une régénération aurait menti sur quand le bilan a été fait.
- **Le recalcul est inconditionnel, parce que TROIS réponses sur quatre entrent dans le résultat.**
  L'issue #232 posait `household_vehicles` comme la seule ; `tc_access` et `zone_type` décident
  aussi de `mobility_constrained`, figé sur `assessment_results` et lu par la restitution (C3.1).
  Une condition étroite l'aurait laissé périmé. C'est sans risque parce que
  `recompute_assessment_results` est idempotent : mêmes réponses de trajet, facteurs bornés à la
  date du bilan, mêmes totaux. **Recalculer n'est pas resoumettre** — aucune ligne n'est ajoutée à
  `assessments`, et un test pgTAP l'épingle.
- **`plan_action_commitments_archive.released_reason` gagne `contexte`**, et
  l'encart orphelin du plan filtre désormais sur `RAISONS_ANNONCABLES` — les **deux** libérations
  que la personne n'a pas choisies. Sa phrase se dérive de la raison (`phraseDeLOrphelin`) : elle
  disait « Ton plan a changé avec ton nouveau bilan », ce qui est faux quand il n'y a pas eu de
  bilan. `saison` et `changement` restent tues, pour les raisons de C2.2. **Et `retrait` depuis
  C4.7, tue elle aussi** : retirer un bilan est un geste choisi, et la confirmation a dit
  *avant* ce qu'il emportait — réutiliser `rebilan` aurait rallumé l'encart. **Et il se tait quand
  l'action est revenue dans le plan** (`orphelinAAnnoncer`, recette du 01/10/2026) : remettre le
  contexte comme avant la rend sans l'engagement, et l'archive garde sa ligne — un appareil neuf
  affichait « n'y est plus » au-dessus d'elle. L'appariement est sur le gabarit, jamais sur le
  libellé que l'archive fige. **Taire, et seulement pour une perte de la saison affichée** — décidé
  le 01/10/2026 par la personne qui pilote : l'encart a déjà parlé sur l'appareil du changement, et
  sans borne il annonçait une perte de n'importe quelle date, un encart tu reparaissant d'une saison
  à l'autre avec son ancienne cause. Le reste, dans une même saison, est nommé dans la dérivation.
- **Les quatre questions ne sont écrites qu'une fois** (`ChampsDeContexte`), partagées par l'étape
  du questionnaire et par `/contexte` ; ce qui diffère est l'introduction. Et la phrase « elles
  n'entrent pas dans le calcul de ton bilan » se **dérive** (`phraseDuCalculDuContexte`) : elle
  était déjà fausse avant ce chantier pour qui sort rarement, profil où le basculement vaut
  **10,88 → 55,56 kg**, soit 411 % de son total.

**`cadence_type = 'rolling_quarter'` est un mécanisme dormant, et il faut le savoir avant de le
prendre pour du code mort.** Toute la chaîne serveur existe et est testée — `rolling_quarter_bounds`,
le branchement de `generate_plan_cycle_for_user`, le snapshot `plan_cycles.cadence_type`, quatre
assertions du test 00 et le scénario B du test 02 — mais **aucun écran ne l'écrit ni ne la lit** :
tous les profils de la base valent `season`, la valeur par défaut — vérifié le 11/09/2026 puis le
19/09/2026, où ils étaient passés de 19 à 65 sans qu'aucun ne change de cadence. Le nombre ne
s'écrit plus : c'est le fait qui compte, et lui seul se vérifie d'une fois sur l'autre.
`v1-01` la décrivait comme un « paramètre réservé pour la brique 3, stocké dès maintenant pour ne
pas migrer le profil plus tard » ; la brique 3 est livrée depuis `v1-03` et rien ne disait pourquoi
le réglage n'a jamais été ouvert. La réponse est qu'il ne l'a pas encore été, pas qu'il a été
écarté : le handoff design le prévoit (`docs/design/README.md`, puce « Cadence : saison — été »),
donc l'ouvrir dans « Toi » serait une décision produit et non une invention. La dormance est
consignée en base sur le commentaire de la colonne (`20260912110000_detail_kind_et_cadence.sql`).
**L'ouvrir impose de relire le retrait d'un bilan (C4.7)** : les bornes du cycle reconstruit s'y
calculent sur la date du bilan **précédent**, donc le cycle du bilan retiré garderait la date de
début la plus récente, et c'est lui que le plan lirait. Raisonné, pas rejoué (`v1-22` §7).

Même famille, côté plan : `action_templates.detail_kind` ne vaut plus que pour les postes
domicile-travail et loisirs. La branche `travel` d'`estimate_action_savings` construit son détail
elle-même avec `format(...)` avant d'atteindre le `case`, qui est gardé par `if v_detail is null` —
les trois valeurs de voyages étaient donc **inatteignables et masquantes** (un template de voyages
avec un `detail_kind` neuf aurait reçu le détail générique du segment, en silence). Elles ont été
retirées de la contrainte et le champ mis à `null` sur les trois templates concernés, plutôt que
branchées : les faire passer par le `case` l'obligerait à lire `v_count`, une variable locale de la
branche, et en ferait un troisième endroit où se lit la logique de segment.

## 4. L'écran du plan : la saison, le premier plan, la barre d'onglets

**La saison a une fin et un début, et les deux se disent sur l'écran du plan** (C2.8,
`src/types/saison.ts`). `plan_cycles.period_end` et `.cadence_type` existaient depuis l'increment 3 et
n'étaient lus par **aucun** écran : le cap était annoncé sans échéance, et l'effet « nouveau départ »
était perdu quatre fois par an. Sept points à connaître, dont deux qui sont des règles :

- **La carte d'ouverture ne prend jamais la place d'un point en attente.** Le canvas la pose « à la
  place du point » ; le lien du rappel pointe `/plan`, donc masquer la question y fait ouvrir une
  notification sur un écran qui ne la porte pas — le défaut exact trouvé sur appareil le 09/09/2026
  (v1-12 §8.1), et jusqu'à deux semaines de points perdus pour qui ne touche pas ses boutons. Elle
  remplace la **carte d'attente**, Ramille parlant déjà sous elle.
- **Le récapitulatif ne dit jamais zéro et ne nomme aucun poste.** Sans point répondu la phrase
  disparaît (« 0 point répondu » nommerait les manqués, ce que `/suivi` refuse) ; sans changement, sa
  seconde moitié tombe. Et le décompte porte sur les **deux** boucles, donc « … sur ton trajet »
  serait faux pour quelqu'un dont les changements sont des voyages — même fausseté lisible que C2.6.
- **Le trait de temps mesure la saison, pas la personne** : `accentMuted` et jamais `accent`, avec sa
  légende. Il n'est pas plein le dernier jour — `period_end` étant inclus, la saison dure 91 jours et
  non 90, et il n'atteint le bout qu'une fois la période révolue, au moment où le bandeau de bascule
  prend le relais. Remplacer ce « + 1 » par un écart entre bornes afficherait « plein » un jour trop
  tôt.
- **L'écran lit deux cycles** (`limit(2)`). L'existence du précédent est ce qui distingue une bascule
  d'un premier bilan, et ses bornes sont **lues sur sa ligne** plutôt que recalculées : une cadence
  `rolling_quarter` n'a pas de saison, donc dériver les bornes d'une saison ferait compter trois mois
  calendaires qui ne sont pas les siens.
- **La carte de re-bilan disait le fait et jamais la saison, et C6.3 a inversé la prémisse.** Son
  titre était « Une nouvelle saison a commencé », ce qui pouvait être faux : elle se déclenchait sur
  182 jours d'ancienneté du bilan, pas sur une bascule, et pouvait coexister avec la puce
  « Cadence : Été 2026 » — disparue depuis. **Depuis C6.3, le déclencheur EST la bascule**
  (`regimeDeRebilan` / `saisonsEcouleesDepuis`), donc c'est l'âge qui est devenu la chose qui peut
  être fausse : un bilan soumis le 30 novembre se propose le 1er décembre, sous un titre qui disait
  « Ton dernier bilan a moins d'un mois ». Le titre vient donc de `titreDuRebilan`
  (`src/types/suivi.ts`), **partagé par les deux écrans**, et il donne à chaque régime ce qu'il peut
  dire de vrai : `proposer` dit la saison — vraie par construction —, `insister` dit l'âge par
  `ancienneteEnMots`, où deux bascules garantissent au moins trois mois. Le défaut a vécu une
  journée, et la leçon est qu'**un changement de déclencheur oblige à relire les phrases qui en
  dépendaient**, pas seulement le code qui l'appelle.
- **La puce « Cadence : … » a disparu du plan** : la période se nomme dans la carte du cap, à côté de
  sa fin, et cette carte se rend donc **même sans cap** (`baseline_co2_kg_year` peut valoir zéro).
  Nommer la période à deux endroits de l'écran était le plus sûr moyen de les voir un jour se
  contredire.
- **Les boutons de la carte sortent de `sortiesDeLouverture`**, pas d'un ternaire : le canvas suppose
  une action engagée et reconduite, alors que rien n'est engagé dans deux cas de production — dont le
  plan à zéro action de tout cycliste depuis C2.5, où proposer d'en choisir une promettrait une liste
  vide.

**Le tout premier plan dit la règle du jeu, et le trait de temps attend qu'il y ait quelque chose à
mesurer** (C5.6, `estPremierPlan` / `ouvertureDuPremierPlan` dans `src/types/saison.ts`). On arrivait
de la restitution devant deux cartes chiffrées, un cap et un trait qui avance, sans qu'un mot dise
qu'on en choisit **une** et que tout le reste du produit tient en un point régulier. Quatre points à
connaître :

- **Le signal a trois conditions, et c'est la troisième qui compte** : un seul cycle, aucune action
  engagée, et **aucune ligne dans `plan_action_commitments_archive`, quelle qu'en soit la raison**.
  Les deux premières décrivent un plan neuf ; l'archive est la seule trace de quelqu'un qui s'est
  **déjà** engagé puis a repris — « Changer d'avis » (raison `changement`) ou un re-bilan dans la
  même période (raison `rebilan`), qui remettent tous deux `committed_at` à `null` sans créer de
  second cycle. Sans elle, la carte réexplique la règle du jeu à quelqu'un qui la connaît.
- **La lecture de l'archive que l'écran faisait déjà ne peut pas servir**, et c'est le piège que le
  relevé de `v1-17` §2 a évité : celle de l'encart orphelin (C2.2) filtre sur les raisons
  annonçables (`rebilan`, et `contexte` depuis C6.4) parce qu'elle annonce un effet de bord non choisi, et elle est bornée
  à une ligne. Élargir ce filtre casserait l'encart. Le premier plan demande donc sa **propre**
  lecture, un `count` en `head` dans le même `Promise.all` (règle de C5.5). Un `count` **nul** veut
  dire « pas pu lire » et se lit « s'est déjà engagée » : des deux erreurs possibles, celle qui
  montre une carte de trop coûte moins que celle qui **retire** le trait au milieu d'une saison.
- **Le trait s'écrit `progression !== null && !premierPlan`**, et non la forme du canvas
  `(engagement || !premierPlan)` : un engagement rend déjà le signal faux par sa deuxième condition,
  donc la première moitié n'est exerçable par aucun cas. Un test épingle cette implication — le jour
  où il tombe, c'est que la forme courte est redevenue fausse. La légende disparaît **avec** le
  trait ; la période et sa fin, elles, restent.
- **Une seule carte pour deux ouvertures** (`CarteDOuverture`, ex-`CarteDeSaison`) : le canvas décrit
  le cadre de la saison et celui du premier plan de la même façon au pixel près, donc en écrire deux
  garantirait qu'ils divergent — la leçon de `CarteDePiste` en C5.2. Ce qui change est du contenu,
  dérivé dans `src/types/saison.ts`, **y compris la ligne de Ramille**, passée sans valeur par
  défaut : un repli sur « On repart pour une saison. » dirait au premier plan la seule phrase qui ne
  peut pas y être vraie. Les deux cartes ne peuvent pas coexister (l'une exige un cycle précédent,
  l'autre exige qu'il n'y en ait pas) et **remplacent toutes deux la carte d'attente, jamais un point
  en attente** — C2.8 dit pourquoi. **La troisième carte d'ouverture, celle des deux lieux (C5.7),
  ne dépend d'aucun cycle et croisait les deux autres** : la saison (relevé au lot 5) puis le premier
  plan (27/09/2026, un premier plan à zéro action suivi d'un nouveau bilan qui en donne). Qui passe
  devant se décide en un seul endroit, `cartesDuPlan` (`src/types/plan.ts`) — saison, premier plan,
  deux lieux —, dont le type rend l'empilement inexprimable, et que l'écran rend en une seule
  expression pour la même raison. La marque locale (`traceverte.premier_plan_vu.v1`,
  `src/lib/premier-parcours.ts`) est **booléenne** là où celle de la saison porte un identifiant de
  cycle : le premier plan n'arrive qu'une fois, et elle est nécessaire parce que le signal, lui, ne
  se referme que sur un engagement.

**La barre d'onglets attend que les deux lieux aient quelque chose à montrer** (C5.7,
`src/types/premier-parcours.ts`). Le produit proposait Plan et Suivi dès la dernière page du
questionnaire, c'est-à-dire avant qu'il y ait quoi que ce soit à suivre. La barre est masquée de la
soumission du **premier** questionnaire à la fermeture de la carte « Ton premier plan », puis elle
arrive et se nomme, une fois. Cinq points :

- **Une valeur à trois états (`questionnaire` → `barre` → `fait`), jamais deux marques booléennes.**
  Le canvas décrit une marque « effacée » à la fin du parcours, plus une seconde pour la carte des
  deux lieux ; effacée, la première ne dit plus rien, et la question que pose la carte est « la barre
  vient-elle d'arriver **sur cet appareil** ? ». Deux booléens ne distinguent pas « le parcours vient
  de finir ici » de « il n'y en a jamais eu ici », donc la carte se serait rendue à **tout le
  monde** — chaque installation existante, chaque appareil neuf d'un compte existant. Écart consigné
  en `v1-17` §9.
- **Sans marque, la barre est là**, et c'est le cas à ne pas rater : appareil neuf d'un compte
  existant, session retrouvée par lien, installation d'avant le chantier. La marque autorise une
  absence, elle ne la présume jamais — et `null` recouvre aussi « pas encore lue », donc l'état de
  départ du layout ne fait disparaître la barre de personne (la règle d'hydratation d'`EXPO.md`
  §2.2 : sur web, le rendu statique ne connaît aucun stockage). Une **valeur inconnue** se lit de
  même : c'est le seul moyen, depuis ce stockage, de retirer à quelqu'un la moitié du produit.
- **« Premier » veut dire premier sur cet appareil**, et la question se pose à la soumission, **avant**
  de poser la marque de bilan de C4.5 — c'est elle qui répond, **avec l'étape déjà notée** depuis
  C4.7 (`ouvreUnPremierParcours`) : retirer son seul bilan efface la marque de bilan, et sans l'étape
  le bilan suivant ferait recommencer le parcours. Quatre situations retombent alors du bon côté sans
  garde à écrire : un re-bilan, un appareil neuf d'un compte existant, une installation d'avant le
  chantier, et un bilan soumis après le retrait du seul.
- **L'étape vit dans le layout des onglets**, qui la partage par contexte (`usePremierParcours`) :
  c'est lui qui rend la barre, donc un écran qui réécrirait la marque dans son coin la ferait
  arriver au prochain montage et non au geste. Le questionnaire, lui, est **hors** du groupe et
  écrit directement la marque — le bon ordre, puisque le layout est monté après. Quatre chemins
  referment le premier plan et font venir la barre : « Compris » (immédiat, dans son gestionnaire),
  le premier engagement, un plan à zéro action, et une carte déjà refermée ici — les trois derniers
  passent par le chargement de l'écran, qui les ramène au même appel.
- **`tabBarStyle: { display: 'none' }` ne laisse pas de bande vide**, mesuré et non raisonné
  (`EXPO.md` §1.7) ; **et l'entrée glissée de 320 ms du canvas est rendue depuis le 27/09/2026**
  (`v1-30` §5.5) : `CLAUDE.md` a écrit jusque-là qu'elle ne l'était pas, faute de pouvoir envelopper
  `BottomTabBar` sans dépendre de `@react-navigation/bottom-tabs`, et la raison ne tenait pas —
  `tabBarStyle` accepte une valeur `Animated`. Elle ne glisse **qu'en arrivant** (`barreArrive`),
  jamais à l'ouverture de l'app, et sous « réduire les animations » la barre ne lit pas la valeur
  animée du tout : remise en place dans un effet, elle passait parfois une image transparente
  (`EXPO.md` §1.7). L'écart de `v1-17` §9 est levé, par une ligne datée sous son tableau.
