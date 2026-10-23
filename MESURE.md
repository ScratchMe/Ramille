# MESURE.md — l'usage, les cohortes et le canal de retour

> **Quand ouvrir ce fichier.** Ajouter, émettre ou lire un événement d'usage, ou une valeur de
> propriété · toucher à la purge des sessions anonymes, aux compteurs de cohortes ou aux vues
> `analytics.*` de l'administration · toucher au canal de retour (`feedback`).
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

Où lire chaque vue, et ce qui doit alerter : `docs/exploitation/README.md` §8.

---

## 1. Les événements d'usage

**Mesure d'usage** (`usage_events`, issue #30, cf. `v1-08-mesure-usage.md`) : **on n'instrumente
jamais ce que le schéma enregistre déjà.** Pas d'événement `bilan_submit` (c'est
`assessments.submitted_at`), `checkin_answer` (c'est `engagement_checkins.response`) ni
`feedback_submit` — dupliquer un fait garantit deux chiffres divergents le jour où l'un des
chemins échoue, et un test pgTAP interdit de les réintroduire. Les axes de segmentation
(`zone_type`, `tc_access`, poste dominant, cadence) sont **déjà en base** : c'est ce qui a écarté
PostHog. La liste des événements vit dans `public.usage_event_types` avec une clé étrangère
depuis `usage_events` — **ajouter un événement impose une ligne par migration ET une entrée dans
`src/types/analytics.ts`**, sinon l'insert est rejeté et l'événement perdu en silence (même
mécanique que `emission_factor_sources`). Un événement déclaré mais qu'aucun code n'émet doit
être retiré : il ne se lit pas « pas encore instrumenté », il se lit **zéro**. **Et un événement
ajouté impose de relire le formulaire « Sécurité des données » de Play**
(`docs/exploitation/fiche-google-play.md` §5) : un événement neuf peut collecter ce que la
déclaration publiée ne nomme pas, et rien ne le signale.

**La même règle vaut pour une valeur de propriété, et elle est plus discrète** : la base ne valide
pas les valeurs de `props` — `check_usage_event_props` ne compte que des clés et des longueurs, celle
des nombres comprise depuis le 05/10/2026 (32 caractères : un nombre de 131 000 chiffres faisait d'un
événement 400 Ko, passe avant le lancement) —, donc rien n'arrête la dérive. `connexion_view` déclarait cinq provenances dont deux qu'aucun écran
n'émettait plus, et une sixième (`compte`) que l'écran de connexion réécrivait en
`resultat_transition` faute de la reconnaître : la provenance la plus intéressante à mesurer
gonflait exactement le chiffre auquel on voulait la comparer. D'où `SOURCES_CONNEXION`
(`src/types/analytics.ts`) — **une seule liste**, qui donne le type *et* le garde
d'appartenance — et le fait que les valeurs attendues soient écrites dans la description du
référentiel, seul endroit où la base peut les porter.

**`connexion_limite` est le seul événement qui signale un refus d'un tiers** (06/10/2026, `v1-27`
§12.40) : le plafond horaire d'e-mails de Supabase est vérifié avant le hook d'envoi et ne laisse
aucune ligne en base, donc il ne double aucun fait du schéma. Il porte l'écran (`ECRANS_DE_LA_LIMITE`)
et jamais l'adresse, et l'alerte d'exploitation le compte à partir de trois — le même code d'erreur sert
à la minute d'une adresse, et une personne qui redemande trop vite ne doit pas faire partir d'e-mail.

**`app_error` peut arriver en retard, et le dit** (02/10/2026) : une panne survenue sans session, sans
réseau ou pendant une panne passagère du serveur attend sur l'appareil et part plus tard, avec `differee` et `retard_h`
(`docs/exploitation/remontee-erreurs.md` §3 bis). C'est le seul événement qui attend : les autres
s'émettent après la session, la règle ci-dessous.

**`app_error` dit d'où vient la panne, et `app_error` comme `app_open` disent quelle version tourne**
(18/10/2026, `remontee-erreurs.md` §3 ter). `origine` vaut `rendu`, `globale`, `fatale` ou `promesse`
(`ORIGINES_DES_PANNES`, une liste fermée comme les provenances) ; une ligne sans origine est d'avant, et
vient du rendu. `version` vaut `1.0.0+14` sur natif — la version et le numéro de build **en une seule
valeur** — et `1.0.0` sur le web : une panne différée remplit déjà les six clés de
`check_usage_event_props` (catégorie, route, origine, version, `differee`, `retard_h`), et une septième
ferait tomber la dernière à l'écrêtage, sans bruit. **Ajouter une propriété à `app_error` demande donc
d'en retirer une, ou d'élargir la borne pour tous les événements** — un test Jest et le pgTAP `56` le
rappellent. La version d'une panne est celle **du moment de la panne** : une `fatale` part au
lancement suivant, qui peut être celui d'une mise à jour. Et une même panne ne part qu'une fois par
lancement, dix au plus (`trierLesPannes`) : `count(*)` compte des lancements touchés, pas des
occurrences.

**Une surface sans compte ouverte sans session ne compte pas d'ouverture** (18/10/2026, `COMPTE.md` §1) :
`/confidentialite`, `/conditions`, `/compte/suppression`, `/rappels/stop` et `/status` n'en créent plus,
donc `app_open` n'a personne à qui s'attribuer tant qu'on n'en sort pas pour l'app — l'ouverture part
alors, avec la session que le layout ouvre en quittant la page. **Une session qui s'ouvre sur la page
même ne la rattrape pas** : le code reçu sur `/compte/suppression` ouvre celle du compte qu'on vient
supprimer, et `rattraperLOuverture` lit la route (`laSessionSOuvreSur`) pour ne compter à son nom ni
une ouverture ni un signe de vie. Ce que ça coûte : un `connexion_limite` levé sur
`/compte/suppression` dans un navigateur neuf ne se compte plus — il se comptait sous la session
anonyme que la page ouvrait pour rien.

**Deux mesures valent d'être connues, parce qu'elles étaient fausses d'une façon qui ne se voit
pas dans un chiffre** (11/09/2026) :
- **`app_open` part après la résolution d'`ensureSession()`, jamais au montage du layout**, et
  porte `props.origine` (`demarrage` / `retour`). `track()` renonce quand aucune session n'existe
  encore : émis au rendu, l'événement était perdu précisément sur les premiers lancements — ceux
  où la session se crée — soit un biais systématique contre les nouveaux venus, une ligne en base
  pour six vues d'étape d'onboarding. Et le second chemin n'existait pas du tout : le layout n'est
  monté qu'une fois par chargement du bundle, or le chemin nominal de la boucle d'engagement est
  une app en arrière-plan que la notification ramène devant. `retour` n'existe que sur natif.
  C'est aussi ce qui rend vraie la phrase sur laquelle `purge_stale_anonymous_accounts()` fonde sa
  fenêtre de 120 jours. **Et quand le montage finit sans session** — un refus du captcha ou une coupure
  à la création, un jeton expiré hors ligne, une session refusée —, le `demarrage` se rattrape à la
  première session obtenue ensuite, une fois (`rattraperLOuverture`, 04/10/2026).
- **`connexion_demande` est l'intention, `connexion_success` le fait constaté.** L'écran email
  émettait `connexion_success` juste après `updateUser({ email })`, que `etatDuRattachement`
  classe pourtant en `a_confirmer` : `is_anonymous` ne bascule qu'au clic du lien reçu — à la saisie du code depuis le 20/09/2026. Le chemin
  Google, lui, n'émettait qu'après une identité liée — les deux branches ne mesuraient pas le même
  fait, et leur comparaison était faussée du taux d'emails jamais confirmés, c'est-à-dire du
  chiffre qu'on voulait lire. L'écart entre les deux **était** ce taux, puis ne l'a plus été du
  21/09 au 02/10/2026 : une adresse déjà prise sur `/connexion/email` émettait `connexion_demande`
  pour un code de **connexion**, et le plan constatait un compte retrouvé par code comme un
  rattachement. **Depuis le 02/10/2026** (`v1-27` §12.28), `connexion_demande` porte `flux`
  (`rattachement` | `connexion`), et le plan ne compte plus un rattachement constaté après une
  reconnexion (`traceverte.session_retrouvee.v1`). Le taux se lit donc entre les demandes
  `flux = rattachement` et les succès par email ; une demande **sans** `flux` est d'avant, et peut
  être l'une ou l'autre.

## 2. Ce que la purge et la suppression laissent : des compteurs, et quatre vues

**Ce que la purge et la suppression laissent derrière elles : des compteurs, rien d'autre** (lot 6,
livré avec C4.7, `20260927230611_les_cohortes_avant_la_purge.sql`). La cascade efface tout ce qu'une
personne a fait, donc toute mesure de forme cohorte doit être écrite **avant** : la purge incrémente
`public.purges_par_cohorte` (semaine d'arrivée, étape la plus loin, tranche de semaines tenues, état
des rappels au départ) **dans sa propre transaction, après sa garde de volume et avant son
`delete`** ; `delete_my_account` incrémente `suppressions_de_compte_par_mois` après son `delete`,
seulement si une ligne est partie. **Un compteur qui échoue n'arrête jamais une suppression** : il
vit dans une sous-transaction, et son échec se consigne (`purge_runs.detail`, un avertissement pour
`delete_my_account`) pendant que la suppression passe — la page de confidentialité promet
l'effacement, et une écriture d'analyse ne doit pas pouvoir le suspendre. La première version
faisait l'inverse (« si le compteur échoue, rien n'est supprimé »), et c'était la suspendre pour
toujours, sans alerte, dès qu'une valeur nouvelle de `regime_de_rappel` sortait du `check` —
contre-lecture du 27/09/2026. Cinq choses à ne pas défaire :

- **aucun identifiant et aucun segment**, par décision (27/09/2026) : à nos volumes, une ligne
  découpée par zone ou par poste décrirait une personne que la page de confidentialité promet
  d'effacer. Le fichier `36` balaie les colonnes par type et n'admet que `date`, `integer` et un
  `text` fermé par un `check`. À nos volumes, une ligne peut ne compter qu'une personne : elle n'en
  porte rien qui la désigne, et c'est ce que la page promet — pas davantage ;
- **ces tables n'ont aucune clé étrangère**, et c'est ce qui les fait survivre : c'est la
  contrepartie exacte de la règle « jamais rattacher une table à `profiles` autrement qu'en
  cascade », qui vaut pour les données d'une personne et jamais pour un agrégat ;
- **`cohorte_de(uuid)` est la seule dérivation**, et l'étape est « la plus loin **dans l'ordre** »
  (a ouvert < bilan soumis < engagée < a répondu), pas le plus long préfixe : on peut répondre au
  point générique sans s'être engagé. « A soumis un bilan » s'écrit `status <> 'in_progress'`, pour
  qu'un bilan retiré (C4.7) compte comme soumis ;
- **le signe de vie des rappels a une seule définition, `dernier_signe_de_vie`**, que
  `regime_de_rappel` appelle depuis C4.2 et que les cohortes lisent — celui de la purge reste le
  sien, plus large (tous les événements, les bilans, les retours). Une assertion du `36` exige que
  le corps installé du régime **appelle** la fonction — elle acceptait aussi l'expression recopiée
  tant que la factorisation n'était pas faite. Ce qu'elle ne voit toujours pas, et qu'il ne faut pas
  croire gardé : une retouche de `v_depuis` **après** l'appel. C'est une inclusion, pas une égalité ;
- **les valeurs que rend `regime_de_rappel` doivent toutes figurer dans le `check` de
  `rappels_au_depart`** : une valeur nouvelle ferait échouer chaque compte, donc perdre chaque
  cohorte. Une assertion du `36` lit les littéraux `return` du corps installé et les compare au
  `check`.

**Et ce que le lot 6 lit, il le lit dans quatre vues, sans définition nouvelle** (29/09/2026,
`20260929210541_les_vues_de_l_administration.sql`, `docs/exploitation/README.md` §8.5 ter) :
l'entonnoir et la rétention par cohorte, les états des rappels, les départs par mois. Chaque notion y
garde sa dérivation — `cohorte_de`, `dernier_signe_de_vie`, `regime_de_rappel` sur la boucle que
rend `boucle_de_la_personne` —, et une vue qui en écrirait une seconde ferait deux échelles qui
divergent. **Une exception, nommée des deux côtés** : la rétention lit le signe de vie semaine par
semaine, ce qu'un `max` ne sait pas faire, donc elle recopie les deux sources de
`dernier_signe_de_vie` — une source ajoutée à l'une s'ajoute à l'autre. Trois choses à ne pas
« simplifier » : la boucle retenue est celle qui **tourne encore**, pas celle qui a existé (sans quoi
qui a arrêté sa boucle reste actif pour toujours) ; la rétention divise par **toute** la cohorte
d'arrivée, purgés compris (sans eux, la purge fait paraître une cohorte plus fidèle en vieillissant) ;
et ni l'activation ni un taux de churn ne sont calculés — la première est une décision de produit,
le second demanderait un effectif passé que le régime ne sait pas reconstruire.

**Une seconde rupture, au déploiement de la page d'accueil du web** (23/10/2026, étape 5 de `v1-35`) : la
racine du site n'ouvre plus de session, donc une visite qui s'arrête à la page d'accueil ne crée plus de compte
anonyme et ne compte plus d'ouverture (`app_open`) ; l'entonnoir web commence désormais à « Découvrir mon
impact ». Les arrivées du web baissent à cette date sans que personne ne soit parti. **Deux mesures ont été
remises après la session** pour ne pas perdre ce qui suit : `onboarding_step_view` (la première étape partait
avant la session que l'onboarding ouvre) et `retrouver_view` (sa nouvelle porte `accueil`).

**Une rupture de série, au déploiement des surfaces sans compte** (18/10/2026) : `/confidentialite`,
`/conditions`, `/compte/suppression`, `/rappels/stop` et `/status` n'ouvrent plus de session, donc
l'entonnoir, la rétention et `purges_par_cohorte` perdent les arrivées qu'une lecture de ces pages
créait. Un saut de ces chiffres à cette date n'est pas un signe, et une cohorte d'avant ne se compare
pas à une cohorte d'après (`docs/exploitation/README.md` §8.5 ter).

## 3. Le canal de retour

**Canal de retour** (`feedback`, issue #29) : la seule table où un client écrit du texte
libre. Comme chaque visiteur reçoit une session anonyme dès l'ouverture, ouvrir l'INSERT à
`authenticated` revient à l'ouvrir à quiconque sait appeler l'API — d'où le trigger
`enforce_feedback_rate_limit` (dix par 24 h et par utilisateur) et les bornes de longueur.
**Et soixante par heure pour tout le projet, depuis le 04/10/2026** (`20261004201217`, plan
anti-abus) : une session neuve repartait à zéro, et des comptes en masse écrivaient sans fin. Le
trigger est `security definer` pour compter les retours des autres, et répond `RM002` avec une
phrase pour la personne (« Réessaie un peu plus tard. », choisie par la personne qui pilote). **Ce
plafond-là ne refuse que les comptes nés depuis moins de vingt-quatre heures.** Les événements
d'usage ont leurs budgets du jour, §4.
**Et la table est insert-only côté client, ce que le schéma ne disait pas encore le 20/09/2026** :
une policy `DELETE` owner-scoped traînait, sans justification dans sa migration et sans qu'aucun
écran l'emprunte, alors que le trigger compte les lignes **vivantes** — dix retours, on efface, on
recommence. Elle est partie ; l'effacement reste garanti là où il est promis, par la cascade de la
suppression de compte et par la purge à 120 jours.
**Attention en écrivant des tests dessus** : une assertion sur la contrainte de longueur peut
passer sans rien éprouver de **deux** façons, et les deux se sont produites — `TESTING-PGTAP.md` §2.5,
qui dit aussi pourquoi un fichier pgTAP se rejoue en séquence entière.

## 4. Les plafonds des événements d'usage

Un événement s'écrit depuis n'importe quelle session anonyme, et le plan gratuit passe la base en
lecture seule pour tout le monde à 500 Mo : ce qui borne l'écriture borne la base
(`enforce_usage_events_rate_limit`, `20261018110000`, test `55`). Deux étages, et un refus
`check_violation` que le client abandonne sans garder la panne :

- **par compte, sur vingt-quatre heures glissantes** : 200 événements, et 50 pannes (`app_error`) à
  part. Le parcours réel en émet 51 au plus pour un compte, deux bilans, un re-bilan et un retrait
  compris ; la file d'attente des pannes de l'app en garde vingt (`TAILLE_DE_LA_FILE`) ;
- **pour tout le projet, sur les vingt-quatre dernières heures, quel que soit l'âge du compte** : trois
  budgets, 50 000 événements des comptes nés depuis moins de vingt-quatre heures, 25 000 des autres
  comptes, 2 500 pannes. Un flot de sessions neuves ne prend rien aux comptes qui reviennent, des
  comptes vieillis exprès rien à l'entonnoir d'un lancement, et un flot d'autres événements n'étouffe
  pas les pannes — ni l'inverse. Au pire, 77 500 événements de 675 octets (le maximum de
  `check_usage_event_props`, index compris ; 173 octets avec ce que l'app envoie) : 52 Mo par jour.

Quatre choses à ne pas défaire :

- **le premier `app_open` d'un compte en vingt-quatre heures passe toujours les budgets du projet** :
  c'est le signe de vie que lisent `dernier_signe_de_vie` et la purge, et l'ouverture que compte
  l'entonnoir d'une cohorte. Un flot ne doit coûter ni l'un ni l'autre aux vrais comptes. Le
  plafond par compte n'a pas besoin de l'exception : un compte qui l'atteint a déjà donné signe de
  vie dans la journée — chaque lancement de l'app émet son `app_open` ;
- **il n'y a pas de plafond horaire** : il coupait l'entonnoir d'un lancement dès 120 arrivées dans
  l'heure, et ne protégeait rien que le budget du jour ne protège ;
- **les budgets se comptent dans `evenements_d_usage_par_heure`**, une ligne par heure, trois nombres,
  sans identifiant : relire les événements coûterait 14 ms par insertion à cent mille lignes, et le
  plafond deviendrait lui-même la façon d'occuper la base. Les plafonds et la fenêtre n'ont qu'une
  définition, `budgets_des_evenements_d_usage()`, que lisent le déclencheur et l'alerte. Le compteur ne
  garde que deux jours : la purge quotidienne des événements (`purge_usage_events`) retire ses tranches
  plus anciennes, que rien ne lit ;
- **un refus ne laisse aucune trace**, donc l'alerte d'exploitation lit le compteur et dit un budget
  entamé à 80 % (`budgets_des_evenements_entames`), avant que rien ne se perde. Un budget atteint pour
  de vrais usages — plus d'un millier d'arrivées par jour, plus de deux mille personnes qui
  reviennent — se relève dans la fonction, par une migration.

## 5. L'opposition à la mesure

**Une opposition fondée arrête l'enregistrement, sauf la date de dernière ouverture** (décision de la
personne qui pilote, 19/10/2026 ; `20261019150000_l_opposition_arrete_la_mesure.sql`, test `58`). Le geste est
`refuser_la_mesure(p_user_id)`, serveur seulement (`docs/exploitation/README.md` §8.15) : il pose
`profiles.mesure_refusee_le` et efface l'historique, la dernière ouverture exceptée. Ensuite,
`enforce_usage_events_rate_limit` écarte sans erreur tout événement de ce compte autre qu'`app_open`, et un
`app_open` remplace le précédent, sans propriétés — **un par heure au plus**, les suivants de l'heure écartés
comme le reste. Cette borne n'est pas un détail : remplacer efface la ligne que comptent le plafond par compte et
l'exemption de la première ouverture du jour (§4), donc sans elle une boucle d'ouvertures passait l'un et l'autre
à chaque fois et vidait les budgets du jour de tout le monde (contre-lecture du 19/10/2026, test `58`).

**Pourquoi une ligne reste, et pourquoi c'est celle-là.** L'ouverture est le signe de vie que lisent le régime
des rappels (`dernier_signe_de_vie`) et la purge des sessions anonymes (le plus récent des événements d'un
compte). Garder la seule ligne la plus récente suffit à ces deux lecteurs sans en réécrire aucun, puisque tous
deux lisent un `max(occurred_at)` ; tout couper aurait espacé les rappels de la personne, puis supprimé sa
session anonyme cent vingt jours après son dernier bilan.

**Ce que ça coûte aux mesures** : la personne sort de la rétention de sa cohorte, puisque ses ouvertures d'avant
sont effacées, et les vues `analytics.*` ne voient plus qu'une ouverture. C'est le sens d'une opposition.
**Un événement ajouté au produit n'a rien à faire** pour la respecter : le déclencheur écarte tout ce qui n'est
pas une ouverture. **Une source de signe de vie ajoutée ailleurs que dans `usage_events`**, elle, devra se
demander si elle survit à une opposition.
