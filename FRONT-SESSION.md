# FRONT-SESSION.md — la session, les rappels, le code et le démarrage, côté écran

> **Quand ouvrir ce fichier.** Toucher à la session ou au jeton d'appareil côté écran · à la feuille
> des rappels, au mot de la veille, à la carte d'attente du plan ou à un texte qui promet un point ·
> au champ de code · au démarrage, au brouillon, à la reprise, à une marque locale · à ce que le
> produit promet sans compte · la voix de Ramille à l'entrée des sections du questionnaire · le
> préremplissage du questionnaire · une durée promise à qui reste sans compte (« trois mois »). Ce
> que le serveur en fait est dans `COMPTE.md` et `BOUCLE.md`.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier a été sorti de `FRONT.md` le 01/10/2026, qui pesait 102 Ko — avec `FRONT-MASCOTTE.md`,
`FRONT-QUESTIONNAIRE.md`, `FRONT-SUIVI.md` et `FRONT-MOUVEMENT.md`. Ses sections y sont venues
**telles quelles**, à leurs renvois près,, et **gardent leur numéro** : il reste unique dans la famille, donc un renvoi «
`FRONT.md` §2.x » écrit avant cette date — dans un commentaire du code, un document daté — se
retrouve ici, et la table en tête de `FRONT.md` dit où vit chaque numéro. Tout ici est propre à
Ramille ; ce qui voyage est en `FRONT.md` §1.

---

## 2. Propre à Ramille

### 2.7 La session, le jeton d'appareil, et les rappels

- **`ensureSession()` est enveloppée dans `uneSeuleFois` (`src/types/une-seule-fois.ts`), et ce
  n'est pas du confort : sans elle, deux comptes anonymes** — six des treize comptes de la base
  l'étaient : `SUPABASE.md` §2.4.
- **Le jeton d'appareil se réenregistre à chaque changement d'utilisateur, pas seulement au
  démarrage.** `register_push_token` *reprend* le jeton à son propriétaire précédent, et il n'y
  avait aucun appel ailleurs qu'au lancement : le lien de `/connexion/retrouver` ouvre la session
  d'un utilisateur **différent** de la session anonyme qui venait d'enregistrer le jeton, si bien
  que l'appareil restait inscrit au nom de celui qu'on vient de quitter — et recevait ses rappels
  jusqu'au prochain démarrage à froid. Le garde vit hors du composant (`onAuthStateChange` émet à
  chaque rafraîchissement de jeton, soit toutes les heures) et **ne se valide qu'après le succès**
  de l'appel, sinon un échec réseau le referme sur l'état qu'il devait corriger.
- **`enregistrerLeJeton()` rend un booléen, et c'est la seule chose qui peut faire passer
  `jetonActif` à vrai** (`src/lib/rappels.ts`) — une permission accordée dont l'enregistrement a
  échoué (pas d'identifiants FCM, pas de réseau, simulateur) faisait promettre au plan une
  notification que le serveur ne voyait pas. Hors du chemin `push`, `jetonActif` n'est pas touché :
  la préférence et le jeton sont deux faits distincts, et la feuille rend `prefs.jetonActif`
  inchangé quand on la referme sans rien choisir. Le booléen ne distingue pas encore « permission
  non accordée » d'un échec réseau ; le garde d'`_layout.tsx` ne rend donc le jeton à son
  propriétaire précédent que sur une exception.
- **Une absence de jeton n'accuse personne : c'est la permission qui le dit.** L'absence recouvre
  quatre situations — jamais demandée, refusée, enregistrement échoué, simulateur — qui n'appellent
  pas la même phrase. `lignesDeReglage` **et** `carteAttente` (`src/types/rappels.ts`) reçoivent
  donc la `Permission`, et « coupées dans les réglages du téléphone » ne se dit que là où quelqu'un
  les a vraiment fermées. Le corollaire est le lien « Ouvrir les réglages du téléphone » : il
  n'existe que dans l'état `fermee`, il se rend **sous la ligne qui le porte** et non après le
  groupe (détaché, il se lit comme appartenant au dernier choix), et **le retour doit réparer, pas
  seulement changer le texte** — relire la permission sans réinscrire le jeton laisse la ligne
  promettre une notification pendant que `push_tokens` porte encore son `disabled_at`, jusqu'au
  prochain démarrage à froid.
- **La carte d'attente parle de la personne, la feuille parle de l'action — et `Boucle` sert aux
  deux, la carte prenant depuis le 30/09/2026 `BoucleAVenir`, qui y ajoute `aucune`** (recette sur
  appareil du 14/09/2026). La carte annonce le prochain contact quel qu'en soit
  le sujet : elle se dérive de la personne (un poste domicile-travail ⟹ un point le lundi). **Depuis
  le 30/09/2026 c'est le serveur qui le dit** (`mes_boucles_a_venir`, `v1-27` §12.22 et §12.23) : il
  rend les boucles une par une, `boucleAVenir` en tire la carte — **le rendez-vous le plus proche**
  depuis le 01/10/2026 (#304) : « au début du mois prochain » les jours où le 1er tombe avant le
  lundi qui vient, quand la règle d'avant disait toujours « lundi » —, et il peut n'en rendre aucune : aucun trajet, sorties rares, aucun voyage déclaré. La
  carte ne promet alors rien — ni jour, ni canal, ni porte — là où elle promettait « au début du
  mois prochain » un signe qui ne venait jamais. La règle de la boucle mensuelle n'est pas recopiée
  côté client : elle vit dans `boucles_du_dernier_bilan`, que les générateurs lisent aussi.
- **D'autres textes du plan suivent les mêmes boucles, et pour la même raison** (décision du
  30/09/2026, `v1-27` §12.23 ; la félicitation d'un plan sans action depuis §12.25, dont la promesse
  « Le point reste là » tombe quand sa boucle est connue pour être arrêtée). **La carte des deux lieux** ne décrit que ce que le plan porte
  (`ouvertureDesDeuxLieux`, `src/types/premier-parcours.ts`) : « l'action en cours » et « ton cap »
  s'il a des actions — sinon « ta saison », puisqu'un plan sans action ne chiffre pas son cap et que
  sa carte n'y montre que la saison —, « le point régulier » et « tes réponses » si une boucle
  tourne ; et Ramille dit « Je garde tes bilans » là où il n'y aura pas de réponse à noter. Elle attend que les
  boucles soient lues, comme la carte d'attente. **La carte d'un point répondu** ne donne plus
  rendez-vous quand sa boucle s'est arrêtée — un nouveau bilan pendant la période : le pied dit
  « Répondu lundi. » sans le prochain point, et la réplique de Ramille est choisie parmi celles qui
  ne promettent rien (`repliqueDuPoint`, `piedDuPointRepondu`, dont `boucleTourne` est
  **obligatoire** : un défaut laisserait un appel oublié promettre en silence). Sur un échec de
  lecture, la boucle du point est tenue pour tournante (`laBoucleDuPointTourne`) : la réplique est
  choisie par période, et la déclarer arrêtée la ferait changer le temps de la panne. **Et le suivi,
  sur l'autre onglet**, le même jour et pour la même raison : sa carte « aucun point répondu » dit
  « Je garde tes bilans ici » sans boucle, et perd sa note sur les périodes sans réponse
  (`carteDuSuiviSansPoint`, `src/types/suivi.ts`, lue par `loadBouclesAVenir`). La carte reste —
  un suivi vide sous les bilans se lit comme un manque — et sur un échec de lecture elle garde son
  texte d'avant. La
  feuille ouverte après « C'est noté » promet un contact **sur l'action qu'on vient d'engager**
  (« Lundi, je reviens te demander si tu l'as faite ») : elle se dérive du **poste de cette
  action**, par `boucleDeLAction` (`src/types/rappels.ts`), miroir de l'appariement que fait la
  génération du point (C2.1). Les confondre affiche une promesse fausse, et c'est ce qui a été
  trouvé : quelqu'un qui a un trajet domicile-travail **et** s'engage sur un vol s'entendait
  promettre le lundi, alors que le point du lundi ne demandera jamais rien sur son vol — vérifié en
  base le même jour, le point hebdomadaire sortant en question générique. Corollaire : la feuille
  ne dépend plus des boucles lues (`boucles`), sans quoi un échec de lecture secondaire empêchait une cérémonie qui
  ne s'ouvre **qu'une fois par appareil** — donc la perdait pour de bon. **La promesse du mois a été
  fausse jusqu'au 30/09/2026 dans un cas** : une action engagée sur le poste mensuel que la boucle
  n'interrogeait pas (les sorties quand les voyages pèsent plus, ou l'inverse). La boucle suit
  désormais l'action (`v1-27` §12.25), donc la phrase n'a pas bougé — c'est le serveur qui la rend
  vraie, tant que le dernier bilan ouvre une boucle mensuelle : un bilan plus récent qui n'en ouvre
  plus (sorties rares, aucun voyage) la laisse sans point, par la règle de §12.21.
- **Une phrase qui dit quoi faire donne le moyen de le faire, et la porte se rend sous la ligne qui
  la porte** (13.4, recette web du 16/09/2026). « Rattache un compte pour recevoir le mot par
  email. » était un `ThemedView` nu sur le plan : le seul chemin était l'icône de compte en haut à
  droite, que rien n'explique — alors que le commentaire de `lignesDeReglage` écrivait déjà la
  doctrine (« une porte, pas un mur »), vraie sur « Toi » où l'on est déjà, fausse sur le plan.
  `carteAttente` rend donc une `action` à côté de son `detail`, de la même forme que le lien
  « Ouvrir les réglages du téléphone » : elle n'existe **que dans l'état qui la réclame**.
  L'invariant est écrit sur le sens et non sur les six phrases — **la porte se rend exactement là
  où le canal effectif est `aucun` et où la carte dit quelque chose** : aucun canal veut dire
  qu'aucune adresse ne peut recevoir le mot, donc qu'un compte est ce qui manque ; ne rien dire
  (l'enregistrement raté, qui se répare au prochain lancement) veut dire qu'il n'y a rien à
  réparer à la main. La destination est **« Toi » et jamais `/connexion`**, qui imposerait une
  provenance neuve à `SOURCES_CONNEXION`. Et pas la carte entière rendue `Pressable` : trois des
  six variantes n'ont rien à offrir, elles deviendraient une cible morte.
- **Le mot de la veille ne se propose qu'à qui peut le recevoir, et le réglage dit la pause plutôt
  que de se taire** (C4.2, `v1-25`, `affichageDeLaVeille` dans `src/types/rappels.ts`). La
  proposition exige tout ce qui le fait partir : natif, `canalEffectif` push **sur ce téléphone**,
  une action de trajet engagée et une fenêtre ouverte **lue sur le RPC**
  (`fenetre_du_mot_de_la_veille`), jamais recalculée — l'écran ne peut pas annoncer une date que
  l'envoi ne tiendrait pas. Une fois répondue, la ligne de réglage suit ce qui se passe vraiment :
  la date quand la fenêtre court, « En pause sur ce téléphone » sans jeton (D3), « En pause : … »
  fenêtre close — et la règle seule, sans « en pause », quand la lecture a échoué, parce qu'on ne
  sait pas. Trois choses à ne pas défaire :
  - **la feuille se rouvre une fois, sur la seule question de la veille** (`ouvertureDeLaFeuille`,
    arbitrage du 27/09/2026), au premier engagement de trajet **où elle peut être posée**, chez qui
    l'a vue sans cette question — pas forcément le premier engagement de trajet : qui a vu la feuille
    sur un trajet sans recevoir de notification la voit venir au suivant, une fois les notifications
    rouvertes ;
    « une fois » est une marque d'appareil (`veilleDejaProposee`) posée **dès que la question
    s'affiche**, parce que refermer sans répondre ne répond rien — la question reste dans « Toi »,
    mais ne revient pas en travers du plan ;
  - **le sous-titre de « Toi » est un plafond dérivé** (`sousTitreDesRappels`) : il promet ce que la
    personne a demandé, pas ce qui part ce soir, donc il reste vrai les soirs sans mot — et il ne
    dépend pas de la plateforme, le téléphone recevant le mot même quand « Toi » se lit au
    navigateur ;
  - **les deux canaux Android sont une paire SQL/TypeScript** (`CANAUX_ANDROID` et
    `public.canal_android`) : un `channelId` que l'appareil n'a pas créé ne fait pas échouer
    l'envoi, il fait tomber la notification ailleurs, sans bruit. D'où leur création **à chaque
    lancement** (`preparerLesCanauxAndroid`) et non au moment du oui.
- **Le jeton de cet appareil est mémorisé en AsyncStorage** (`traceverte.jeton_appareil.v1`),
  parce que rien en base ne permet de le reconnaître : `push_tokens` est owner-scoped et une
  lecture rend les jetons de tous les appareils de la personne. C'est ce qui rend vraies les deux
  phrases « sur ce téléphone » et « on ne désactive que le sien ». Sans marque locale, on ne
  désactive rien — fenêtre de transition assumée et commentée dans `src/lib/rappels.ts`, sans
  conséquence tant que `push_tokens` est vide.

- **`loadReminderPrefs` rend `null` quand rien n'a été lu** (01/10/2026, `v1-33` T-6) — pas de
  session, profil illisible, jeton de cet appareil illisible. « Toi » passe à son état
  `indisponible`, dont la phrase existe déjà ; le plan n'ouvre pas la feuille des rappels et ne la
  marque donc pas vue. Et le plan garde sa dernière lecture réussie plutôt que de l'écraser par
  `null` — sans quoi la carte d'attente se tairait sans que la ligne de relecture s'allume.

### 2.7 bis Le champ de code, et pourquoi il n'y a pas huit cases

Depuis le 20/09/2026, les deux e-mails du produit portent un **code à huit chiffres** et plus aucun
lien (`v1-28`). Trois écrans demandent une adresse et attendent ce code — rattacher, retrouver,
supprimer —, et ils partagent **un** composant (`SaisieDuCode`) qui en porte un second
(`ChampDeCode`). En écrire trois garantirait qu'ils divergent : c'est la leçon de `CarteDePiste`
en C5.2, et elle vaut ici encore plus, parce que ce qui doit rester identique entre les trois est la
**règle de non-divulgation**.

Les points à connaître, dans l'ordre où ils se cassent — sans les compter, un compte écrit ici se
périmerait en silence au prochain passage :

- **Un seul champ, jamais huit cases.** Huit cases coûtent huit champs à un lecteur d'écran, un
  composant qui gère le focus à la frappe et au collé, et n'apportent rien qu'un champ centré ne
  rende. Le kit écrit de `TextField` qu'il est « en pratique le seul champ texte du produit » : il en
  existe deux depuis ce jour, et celui-ci reprend sa boîte — hauteur, rayon, fond, bordure d'accent
  dès qu'un chiffre est là — pour que ce soit visiblement la même famille. Les chiffres en 24/30,
  interlettrage 6, centrés : une taille hors échelle, en dur là où elle sert.
- **La normalisation est dans la dérivation, pas dans le composant** (`chiffresDuCode`, testé) : une
  espace collée avec le code est **retirée et non refusée** — les messageries en insèrent, et refuser
  un collé qui contient le bon code ferait chercher une faute qui n'existe pas. Un collé trop long
  garde ses chiffres utiles — **et un collé qui porte d'autres chiffres garde la suite de huit, pas
  les huit premiers** (01/10/2026, `v1-33` T-16) : « Le 01/10, ton code : 84792469 » donnait
  « 01108479 », refusé comme expiré, et l'e-mail de rattachement nomme l'adresse — qui porte souvent
  des chiffres — avant le code. `chiffresDuCode` cherche une suite d'exactement huit chiffres d'un
  seul tenant, puis avec une espace ou un tiret entre deux chiffres, et garde **la dernière** ; le
  filtre d'avant ne sert qu'à défaut, et c'est lui que suit la frappe. Sans assertion arrière
  (`(?<!…)`) : rien ici n'éprouve Hermes.
- **Au dernier chiffre, la vérification part d'elle-même**, et le bouton reste — pour qui colle,
  corrige, ou lit l'écran avec un lecteur d'écran. **Et l'écran le dit avant** (arbitrage du
  27/09/2026, WCAG 3.2.2) : le texte d'aide du champ ajoute « Il est vérifié dès le dernier
  chiffre. », et comme il est aussi l'`accessibilityHint`, le lecteur d'écran l'annonce en entrant
  dans le champ. Le verrou vit dans une `ref` et pas dans l'état
  d'affichage, qui ne vaut `true` qu'au rendu suivant : sans lui, un collé suivi d'un toucher enverrait
  deux appels, dont le second sur un code déjà consommé — c'est-à-dire « ce code ne marche pas » juste
  après qu'il a marché. Même raison que le verrou de soumission du questionnaire.
- **Le champ garde ses chiffres sur un refus, et ne se vide qu'au renvoi.** Sur un refus, la personne
  compare avec son e-mail ; au renvoi, l'ancien code vient d'être invalidé (mesuré), donc garder ses
  chiffres ferait réessayer un code mort.
- **Le corps de l'écran suit la VOIX, et la voix n'est pas le contexte** (arbitrage du 21/09/2026,
  `v1-28` §7.1). Ce fichier a écrit jusqu'à ce jour que « le corps change avec le contexte, et la
  différence EST la non-divulgation » : c'est devenu faux, et faux dans le sens qui **dicte une
  régression** — l'appliquer rouvrirait l'oracle. Deux notions distinctes :
  - **`ContexteDuCode` décide le `type` envoyé à l'API** (`email_change` ou `email`) et **suit la
    branche** — une adresse libre est rattachée, une adresse prise rouvre son compte. Il le doit :
    les deux flux ne se croisent pas, un code présenté au mauvais rend `403 otp_expired`.
  - **`VoixDeLaSaisie` (`parti` | `peut_etre`) décide ce que l'écran a le droit d'AFFIRMER**, et
    c'est une propriété de l'**hôte** : elle ne bouge pas d'une branche à l'autre.
  `/connexion/email` est en voix `parti` **dans ses deux branches**, parce qu'un code part
  réellement dans les deux et que la personne vient de taper l'adresse ; `/connexion/retrouver` et
  `/compte/suppression` sont en `peut_etre`, où `shouldCreateUser: false` fait qu'une adresse
  inconnue ne reçoit rien, d'où le « si ». Faire suivre la voix au contexte rendrait le mécanisme
  juste et la fuite intacte : n'importe qui lirait dans la phrase si l'adresse a un compte. Recopier
  la phrase de `parti` dans `peut_etre` serait la même fuite par l'autre bout. Un test unitaire
  garde la porte d'entrée (le flux n'entre dans aucune des trois dérivations), et l'assertion 6 de
  `scripts/verifier-code-de-connexion.mjs` compare les deux branches réellement rendues.
- **Une phrase conditionnelle est le prix de cet arbitrage, et elle ne se rend qu'en voix `parti`**
  (`consequenceDeLaSaisie`) : « S'il existait déjà un compte Ramille à cette adresse, ce code t'y
  ramène — et le bilan de cet appareil ne l'y rejoindra pas. » Au conditionnel, donc vraie dans les
  deux branches, donc montrable aux deux ; et **avant** que le code soit tapé, ce qui laisse la
  sortie. L'écrire à l'indicatif la rendrait l'oracle que l'écran de collision était. En
  `peut_etre`, elle est nulle : un code n'est peut-être jamais parti, et il n'y a pas de bilan de
  cet appareil à laisser derrière soi.
- **Le libellé du bouton est un seul pour les deux branches, et il a dû perdre son verbe.** Il
  disait « Rattacher mon adresse », faux quand l'adresse est déjà prise — rien n'est rattaché, on
  rejoint un compte. En mettre un par branche aurait rouvert l'oracle sur le bouton lui-même, d'où
  « Valider mon code ».
- **Le libellé annoncé dit la longueur** (« Code reçu par email, huit chiffres »), parce que c'est ce
  qu'on ne peut pas voir — règle `FRONT.md` §1.4.

### 2.9 Le démarrage : marques locales, brouillon, reprise, et ce qu'on promet sans compte

- Persistance locale (brouillon de bilan, préférences UI comme "a déjà vu la proposition de
  connexion", jeton d'appareil, ouverture de saison vue, marque « cet appareil a vu un bilan ») via
  AsyncStorage — explicitement device-local, pas de sync multi-device tant que le compte n'est pas
  rattaché. Voir `src/lib/bilan-draft.ts`, `src/lib/connexion-prefs.ts`,
  `src/lib/notification-prefs.ts`, `src/lib/saison-prefs.ts`, `src/lib/marque-de-bilan.ts`. Toutes
  ces clés portent le
  préfixe historique `traceverte.` (le renommer effacerait les brouillons), et c'est par ce
  **préfixe** que `src/lib/compte.ts` les balaie à la suppression de compte. **Ne jamais
  dénombrer les clés `traceverte.*` dans un commentaire.** Le balayage se fait par préfixe
  précisément pour que le nombre n'ait pas à être juste : trois commentaires en portaient un, tous
  faux dès que le jeton d'appareil s'est ajouté. Une phrase qui compte devient fausse à la clé
  suivante, en silence — et nommer ici les occurrences fautives rendrait cette ligne-ci fausse le
  jour où on les corrige.
- **Un brouillon de bilan détourne le démarrage, et l'écran de reprise a deux déclencheurs**
  (C3.9). La racine lit `loadBilanDraft()` en parallèle de sa requête, et route sur
  `/bilan?reprise=1` **quand il n'y a pas de bilan complété** — qui en a un a le plan pour maison,
  et un re-bilan commencé ne doit pas s'emparer de l'ouverture de l'app. Avant, quelqu'un qui avait
  interrompu son questionnaire rejouait les quatre écrans d'onboarding et « Commencer mon bilan »
  pour atterrir sans un mot à l'étape 5. L'écran de reprise s'affiche sur ce paramètre **ou** sur un
  brouillon de plus de trois semaines (C1.3, audit A2-6) : les deux ne couvrent pas les mêmes
  arrivées, et le second survit. **« L'écran s'affiche » et « il y a un repli » sont deux faits
  distincts** — le bouton « Repartir de mon dernier bilan » ne se rend que s'il y a un bilan vers
  quoi repartir, et les confondre réservait la reprise à ceux qui avaient déjà soumis un bilan,
  c'est-à-dire à personne au premier questionnaire interrompu. Le décompte de l'écran
  (`avancementDeLaReprise`) se **dérive** de `visibleSteps`, jamais de neuf : un profil sans trajet
  régulier n'a que six étapes. Il ne dit jamais zéro écran rempli, et l'écran ne dit jamais le délai
  écoulé — interdit du handoff §5.2, parce que « tu as commencé il y a trois semaines » est un
  reproche déguisé en information.
- **Ramille parle à l'entrée de chaque section du questionnaire — quatre, pas neuf** (C3.9,
  `RAMILLE.entreeDeSection`). Le questionnaire demande des ordres de grandeur et ne le disait qu'une
  fois, dans l'onboarding, cinq écrans plus tôt ; au troisième champ, la précision qu'on croit
  devoir donner est ce qui fait abandonner. À chaque étape ce serait du papier peint — même usure
  que les variantes de C2.12 traitent ailleurs. **Rendu sans `RamilleDit`** : son visage est déjà
  dans l'en-tête, trois centimètres plus haut, et un second `Mascot` ferait deux Ramille sur le même
  écran. La règle que cette exception ne touche pas est la vraie — la phrase vit dans `RAMILLE`.
- **Ce que le produit promet sans compte, et ce qu'on y perd, se dit là où la personne renonce**
  (C3.9). L'onboarding n'écrivait nulle part qu'on peut commencer sans compte — le seul mot
  « compte » était « J'ai déjà un compte », qui se lit à l'envers. Et la proposition de compte
  promettait « un historique de points **mensuels** », texte du handoff antérieur à la boucle
  hebdomadaire : elle nomme désormais ce qui suit le compte (les bilans, les réponses, le plan) sans
  promettre de cadence. Sous « Continuer sans compte », les deux faits qui n'étaient dits que dans
  les pages légales : changer de téléphone perd tout, et la purge des sessions anonymes ferme le
  compte après trois mois d'**inactivité** (`purge_stale_anonymous_accounts`, fenêtre de 90 jours) —
  donc ne pas écrire « trois mois » ailleurs sans vérifier cette fonction.
- Le questionnaire se préremplit dans cet ordre : **brouillon local > dernier bilan complété >
  vide** (`src/lib/bilan-history.ts`). Le brouillon prime car il est plus récent par
  construction. Un re-bilan prérempli est ce qui rend le suivi dans la durée praticable — sans
  lui, comparer deux bilans demandait de retaper les neuf étapes.
- La logique **pure** du suivi (écart entre deux bilans, dédoublonnage par jour, ancienneté)
  vit dans `src/types/suivi.ts`, séparée des requêtes de `src/lib/bilan-history.ts` : ce module
  tire AsyncStorage et `react-native`, qui n'ont rien à faire dans une suite de logique pure
  (cf. `TESTING.md` §1.2, où le motif est expliqué en entier). Même découpage que `src/types/bilan.ts`.
