# Audit Ramille — inventaire complet des constats (09/09/2026)

Produit par treize lecteurs de zone puis contre-vérification adverse de chaque constat, et un critique de complétude. Chaque constat porte la sévérité corrigée par le vérificateur et son verdict : `confirme`, `contredit_decision` (exact, mais la recommandation rouvre une décision documentée), `deja_fait`, `refute`, `incertain`.

Bilan : {"confirme": 260, "contredit_decision": 18, "refute": 4, "deja_fait": 1}


## A1 — racine, lancement, onboarding

**Résumé du lecteur.** La zone est nettement plus mûre que la moyenne d'un socle d'app : chacun des trois écrans de service (lancement, configuration manquante, échec de démarrage) existe parce qu'une panne réelle est passée inaperçue, et chacun porte l'explication de ce qu'il évite. Le pager d'onboarding, très récent, a résolu proprement deux pièges difficiles (l'hydratation web qui adopte les attributs de style, la mesure d'entonnoir qui devenait fausse en passant de quatre routes à un écran). Ce qui frappe le plus, à l'inverse, tient en trois points. D'abord, le démarrage n'a qu'un seul chemin heureux : sans réseau, l'app entière s'arrête sur un message technique en anglais, sans distinguer « tu es hors ligne » de « le serveur est en panne », alors que la spec pose que la décision de transport se prend en mobilité. Ensuite, la mesure d'ouverture — présentée comme le dénominateur de tous les entonnoirs — rate systématiquement les tout premiers lancements (la session anonyme n'existe pas encore) et tous les retours d'arrière-plan, c'est-à-dire précisément le chemin de la boucle de rappels : elle compte les démarrages à froid de gens déjà installés. Enfin, l'onboarding, brique à « soin maximal », vend un diagnostic ponctuel : il ne dit jamais qu'aucun compte n'est nécessaire (sa seule mention de compte est « J'ai déjà un compte »), n'annonce jamais la suite dans la durée autrement que par une ligne de mascotte en 14 px gris, et ne mène nulle part vers la politique de confidentialité alors que les réponses partent en base dès la première étape. S'y ajoutent un régression d'accessibilité introduite par le pager (quatre pages montées, aucune masquée, progression non annoncée) et deux chemins muets : un lien de connexion expiré ne produit rien du tout sur natif, et un bilan en brouillon fait rejouer les quatre écrans d'onboarding sans jamais dire qu'on reprend là où on s'était arrêté.

**Points forts à ne pas casser**

- **L'échec de démarrage est un état d'écran, pas un silence** (`src/app/index.tsx` §20-25, 77-100) : `catch` explicite, message technique isolé pour être recopié, bouton « Réessayer » qui relance l'effet par un compteur de tentative plutôt que par une écriture d'état interdite par le React Compiler. C'est le seul écran par lequel tout le monde passe, et il a été construit après un vrai cycle de build perdu — ne pas le simplifier.
- **La panne de configuration est nommée variable par variable, et à l'usage plutôt qu'au chargement** (`src/types/configuration.ts` module pur et testé, mandataire `clientAbsent()` dans `src/lib/supabase.ts` §46-56, `ConfigurationManquante`). Le cas « URL avec chemin » y est traité nommément, et les `EXPO_PUBLIC_*` sont lus dans des `const` écrits en toutes lettres — trois pièges qui avaient chacun coûté un build et qui sont désormais gardés en CI.
- **L'onboarding respecte l'ordre imposé par la spec** : bénéfice concret et zéro chiffre sur l'accroche, contexte chiffré seulement en deuxième position, réassurance chaleureuse, transition qui annonce la friction (« environ 5 minutes ») au lieu de la dissimuler. Les chiffres viennent tous d'une source unique et testée (`carbon-reference.ts`, SDES + cible ADEME), avec le total *défini* comme la somme des postes affichés — l'invariant qui empêche l'onboarding et la restitution de se contredire.
- **Le pager résout deux pièges non évidents et les documente** : `useSyncExternalStore` avec un instantané serveur à 0 pour que l'hydratation web voie le passage de largeur, et l'émission d'`onboarding_step_view` sur la page réellement affichée (avec dédoublonnage par `Set`) au lieu d'un `useTrackView` qui aurait rendu un entonnoir à 100 % de franchissement. Ne jamais revenir à `useWindowDimensions` ni à une émission au montage.
- **La sortie d'onboarding vide la pile** (`router.dismissAll()` puis `replace('/bilan')` dans `etape-transition.tsx`) : c'est ce qui fait que le retour matériel Android quitte l'app depuis `/plan` dès le premier lancement, sans intercepter quoi que ce soit. Le `BackHandler` du pager, lui, ne recule que **dans** l'onboarding et rend la main au système à l'étape 0 — les deux moitiés se tiennent, ne pas en toucher une seule.
- **L'écran de lancement continue le splash natif au lieu de le contredire** : même fond `#E4EFE8`, même taille apparente de mascotte, et le changement d'expression caché au sommet d'un à-coup plutôt que fondu. C'est aussi le seul endroit du produit où un visage occupe l'écran — sans un chiffre à côté, conformément à la règle de la mascotte.

### A1-1 — Une configuration Supabase absente coupe aussi les pages légales et la page de suppression, qui sont précisément les surfaces exigées sans l'app

`technique` · sévérité **important** · verdict **confirme** · effort petit

Le layout racine remplace **toute** la pile de routes par `ConfigurationManquante` dès que la configuration est incomplète. Or `/confidentialite` et `/conditions` sont du contenu purement statique qui n'a besoin d'aucun accès à Supabase (cf. `src/components/legal/legal-page.tsx`), et leurs URL sont données à Google Play **et** à l'écran de consentement Google ; `/compte/suppression` est le chemin de suppression exigé par Play hors de l'app. Si le déploiement Vercel perd ses variables d'environnement — exactement le scénario pour lequel cet écran a été construit —, les trois surfaces réglementaires affichent un texte destiné à un développeur (« Copie .env.example vers .env ») à un visiteur qui vient de Google Play. Le garde-fou `scripts/verifier-configuration-export.mjs` protège l'export, pas la configuration du projet Vercel.

Preuves : `src/app/_layout.tsx:110` ; `src/components/configuration-manquante.tsx:52` ; `src/constants/page-titles.ts:40`

**Recommandation.** Laisser passer une liste blanche de routes qui ne dépendent pas de Supabase (`/confidentialite`, `/conditions`) avant de rendre l'écran de configuration : monter le `Stack` dans tous les cas et n'afficher `ConfigurationManquante` que pour les routes qui lisent la base, ou tester `usePathname()` au-dessus du gate. Ajouter la vérification au script d'export qui ouvre déjà cinq routes.

**Contre-vérification.** Le constat sous-estime deux choses. (1) L'export est statique : le HTML prérendu de /confidentialite et /conditions contiendrait alors « Configuration manquante », donc le lien `EDITOR_CV_URL` en pied de page (seul lien SEO du produit, cf. CLAUDE.md) disparaît aussi du HTML statique — même famille de défaut que `cleanUrls`. (2) Le commentaire qui justifie le gate en _layout.tsx:106-109 (« chaque écran importe @/lib/supabase… un module qui ne peut pas fonctionner ») n'est plus valable depuis le mandataire de src/lib/supabase.ts:48-58 : l'import est inoffensif, seule une utilisation lève. Une liste blanche est donc réalisable sans revenir sur la décision de l'issue #65. En revanche /compte/suppression ne peut pas être mis en liste blanche : elle appelle réellement Supabase — il lui faut un message utilisateur en français (« ce service est momentanément indisponible, écris à … ») plutôt que l'écran développeur. Meilleure garde : ajouter la vérification des variables au `vercel-build` lui-même, sinon le script CI reste hors du chemin qui casse.


### A1-2 — `ensureSession()` est appelée deux fois en parallèle au démarrage et peut créer deux utilisateurs anonymes

`technique` · sévérité **important** · verdict **confirme** · effort petit

`ensureSession()` fait un check-then-act sans mémoïsation de la promesse en vol : `getSession()`, puis `signInAnonymously()` si rien. Elle est appelée depuis deux effets qui sont commités dans le **même** rendu — celui de `src/app/index.tsx` (effet d'un enfant, exécuté en premier) et celui du layout racine. Sur un appareil sans session stockée (tout premier lancement, navigation privée, nouveau visiteur web), les deux appels lisent `null` avant que l'un des deux n'ait écrit, et deux comptes anonymes sont créés ; le dernier écrase le premier dans le stockage. Le compte orphelin porte éventuellement le `app_open` émis entre-temps, il compte dans les quotas de création anonyme de Supabase, et il gonfle la population que la purge d'inactivité et les vues d'analyse comptent. Le retour OAuth web sur `/` aggrave le cas : `detectSessionInUrl` traite le fragment en parallèle du même check-then-act.

Preuves : `src/lib/supabase.ts:77` ; `src/app/_layout.tsx:60` ; `src/app/index.tsx:40`

**Recommandation.** Mémoïser la promesse en vol dans le module (`let enCours: Promise<Session|null> | null`) et la rendre à tout appelant concurrent, en la relâchant en cas d'échec. Aucun changement de contrat pour les appelants.

**Contre-vérification.** La mesure distante montre que ce n'est pas théorique : environ la moitié des comptes anonymes de la base sont des doublons de démarrage. Conséquences à ajouter au constat : toute statistique de « nouveaux visiteurs » est gonflée d'un facteur proche de 2 (les chiffres cités dans v1-10 — « 223 comptes », « 266 sessions anonymes » — sont donc à relire), et le jeton d'appareil enregistré par `enregistrerLeJeton()` dans le `.then` du layout peut se rattacher au compte perdant. La correction proposée (promesse en vol mémoïsée dans le module, relâchée en cas d'échec) est la bonne ; y ajouter un test unitaire est possible seulement si `ensureSession` est déplacée hors de `@/lib/supabase` (contrainte de test documentée dans CLAUDE.md), sinon la garde reste une revue de code.


### A1-3 — `app_open`, dénominateur de tous les entonnoirs, est perdu systématiquement au tout premier lancement

`technique` · sévérité **important** · verdict **confirme** · effort petit

`track()` renonce quand aucune session n'existe encore, et `useTrackView('app_open')` s'exécute au montage du layout racine, c'est-à-dire pendant que `ensureSession()` fait encore son aller-retour réseau de création de compte anonyme. Le commentaire présente cette perte comme occasionnelle (« si la session n'est pas encore là »), mais elle n'est pas aléatoire : elle frappe **exactement** les premiers lancements, jamais les suivants où la session est en cache. `onboarding_step_view` de l'étape 1, lui, part bien, puisque l'onboarding n'est monté qu'après le plancher de 1450 ms et après la résolution de `ensureSession()`. L'entonnoir affichera donc plus d'affichages d'étape 1 que d'ouvertures d'app pour les nouveaux venus — un chiffre plausible, faux, et faux dans le sens qui masque l'abandon à l'ouverture.

Preuves : `src/app/_layout.tsx:91` ; `src/lib/analytics.ts:47` ; `src/app/index.tsx:54`

**Recommandation.** Émettre `app_open` après la résolution de `ensureSession()` (le `.then` de l'effet du layout racine, avant l'enregistrement du jeton) plutôt qu'au montage. Une ligne, et l'entonnoir redevient comparable entre nouveaux et revenants.

**Décision documentée concernée.** Le commentaire de `src/app/_layout.tsx` §88-90 qualifie la perte de « défaut assumé, préférable à une file d'attente ». La recommandation ne demande pas de file d'attente, seulement de déplacer l'émission.

**Contre-vérification.** Plus grave que décrit : ce n'est pas « le premier lancement » qui est perdu, c'est **tout** l'événement à ce jour (0 ligne en base). Second dommage non vu par le constat : la migration 20260907093000_purge_anonyme_sur_inactivite.sql fonde explicitement la fenêtre de 90 jours sur `usage_events` en disant « `app_open` est émis à chaque ouverture » — c'est faux, et seuls les trois signaux rares (bilan, check-in, feedback) protègent réellement un anonyme. Enfin, le commentaire _layout.tsx:88-90 qui qualifie la perte de « défaut assumé » est fondé sur une hypothèse démentie par les données ; il doit être réécrit en même temps que le déplacement de l'émission dans le `.then(ensureSession)`.


### A1-4 — `app_open` ne compte que les démarrages à froid, alors que le produit repose sur des retours d'arrière-plan

`technique` · sévérité **important** · verdict **confirme** · effort petit

`useTrackView` n'émet qu'une fois par montage, et le layout racine n'est monté qu'une fois par chargement du bundle. Or c'est ce même codebase qui a documenté, à propos des onglets, que react-navigation garde tout monté et que l'app survit à l'arrière-plan — d'où `useRafraichirAuRetour`, écrit précisément parce qu'appuyer sur un rappel ramène une app déjà lancée. Le chemin nominal de la boucle d'engagement (notification → app en arrière-plan revient au premier plan) n'émet donc **aucun** `app_open`. Sur natif, où le rappel hebdomadaire est le déclencheur principal, le dénominateur ne mesure pas les sessions, il mesure les redémarrages — exactement le défaut que `useTrackFocus` a été créé pour corriger sur les onglets.

Preuves : `src/hooks/use-track-view.ts:17` ; `src/hooks/use-rafraichir-au-retour.ts:20` ; `src/app/_layout.tsx:88`

**Recommandation.** Ajouter au layout racine une écoute d'`AppState` qui réémet `app_open` sur passage à `active` (avec un seuil de quelques minutes pour ne pas compter un simple changement d'app), ou introduire un `app_resume` distinct. Sans ça, tout taux calculé sur `app_open` est à lire comme « par démarrage à froid ».

**Contre-vérification.** Le constat rate le lien avec la purge : la migration 20260907093000 a été écrite pour ne plus supprimer un anonyme *actif*, et v1-10 vise précisément à rendre les sessions anonymes vivantes par le push. Un anonyme qui revient chaque semaine par la notification, lit son plan mais ne répond pas au point, n'écrit aucun signal — il redevient supprimable à 90 jours, bilan compris. Ordre de traitement : corriger d'abord A1-3 (sans quoi la reprise sur `AppState` n'ajoutera rien à zéro), puis choisir entre réémettre `app_open` sur `active` avec un seuil, ou déclarer un `app_resume` — cette seconde voie impose la double déclaration (migration `usage_event_types` + `src/types/analytics.ts`, CLAUDE.md).


### A1-5 — Sans réseau, l'app entière s'arrête sur un écran d'échec technique — y compris pour quelqu'un qui a déjà tout fait

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

La racine enchaîne `ensureSession()` puis une requête `assessments` ; toute erreur mène à l'écran « Le démarrage a échoué » qui affiche le message brut de l'exception (en anglais : « Network request failed », « Failed to fetch »). Il n'y a aucune détection de l'état hors ligne dans tout `src/`, aucun cache local du plan ou du dernier bilan, et l'écran ne propose que « Réessayer ». Une personne qui ouvre l'app dans le métro, dans un train, ou en zone rurale à couverture faible — le segment que la spec dit explicitement vouloir inclure et ne pas décourager — reçoit un écran d'erreur brut à la place de son plan. Pour un produit mobile-first dont la spec pose que « la décision de transport se prend le plus souvent hors bureau, en mobilité », et dont la promesse est un accompagnement dans la durée, c'est le pire moment pour se taire en anglais.

Preuves : `src/app/index.tsx:58` ; `src/app/index.tsx:92` ; `docs/design/spec-uiux-app-carbone-transport-v1.md:11`

**Recommandation.** Distinguer au moins deux cas : réseau indisponible → message en français, sans jeton technique (« Pas de connexion pour l'instant. Ton bilan et ton plan t'attendent, on réessaie dès que ça revient. ») avec réessai automatique au retour de connectivité ; erreur serveur → l'écran actuel, message brut compris. À terme, un instantané local du plan permettrait d'ouvrir l'app hors ligne en lecture.

**Contre-vérification.** Deux précisions utiles. (1) La distinction ne doit pas être faite sur le libellé de l'exception (variable selon plateforme et version) mais sur son type/absence de statut HTTP — une erreur PostgREST porte un `code`, une coupure réseau non ; sinon on refabrique le piège « reconnaître au message et non au code » déjà documenté pour `over_email_send_rate_limit`. (2) L'écran technique actuel doit rester pour les erreurs serveur : son registre développeur est une décision explicite (commentaire index.tsx l.87-89 et en-tête de configuration-manquante.tsx). La branche hors ligne est donc un **second** état, en français, sans jeton technique, avec réessai — et la phrase proposée respecte les règles de la mascotte (aucun chiffre), à condition de ne pas y coller la mascotte elle-même si un total est visible. L'instantané local du plan est le vrai correctif de fond mais dépasse l'effort « moyen » annoncé.


### A1-6 — Un lien de connexion expiré ou déjà utilisé ne produit rien du tout sur natif

`technique` · sévérité **important** · verdict **confirme** · effort petit

Le layout racine ne traite l'URL entrante que si elle contient littéralement `access_token=`. Supabase renvoie les échecs de lien magique dans le même fragment mais sous une autre forme — `#error=access_denied&error_code=otp_expired&error_description=…` — qui ne contient jamais `access_token`. Le lien est donc filtré avant `createSessionFromUrl`, dont le traitement d'`errorCode` (`src/lib/auth.ts`) ne s'exécute jamais pour ce cas. Concrètement : la personne qui change d'appareil, demande un lien depuis `/connexion/retrouver`, et clique quinze minutes trop tard voit son navigateur ouvrir l'app… qui affiche l'écran de lancement puis l'onboarding, sans un mot. Elle n'a aucun moyen de comprendre qu'il fallait redemander un lien — et c'est le seul chemin du produit vers un compte existant.

Preuves : `src/app/_layout.tsx:78` ; `src/app/_layout.tsx:79`

**Recommandation.** Élargir la garde aux URL de retour d'authentification en général (présence de `access_token=` **ou** de `error_code=`/`error=`), et rendre l'échec visible : router vers `/connexion/retrouver` avec un paramètre qui fait dire à l'écran que le lien a expiré et qu'un nouveau part en un geste. Le `console.error` de la ligne 81 est également muet pour l'utilisateur dans le cas où le lien est bien formé mais refusé.

**Contre-vérification.** Le constat rate que même le cas « bien formé mais refusé » est muet : _layout.tsx:80-82 se contente d'un `console.error` puis d'un `return`, sans `router.replace` — la personne reste sur la racine sans explication. La cible existe déjà et coûte peu : /connexion/retrouver lit déjà `useLocalSearchParams<{ email?; source? }>` (src/app/connexion/retrouver.tsx:53), il suffit d'un troisième paramètre (`motif=lien_expire`) rendu par le `MessageInline` déjà présent. Attention en le faisant à ne pas différencier les réponses selon l'existence de l'adresse (règle de non-divulgation de v1-10 / compte-suppression) : « ce lien a expiré, en voici un nouveau » est neutre, « ce compte n'existe pas » ne l'est pas. Sur web le même trou existe (fragment d'erreur ignoré par `detectSessionInUrl`), mais il est hors de la garde `Platform.OS === 'web'` du constat.


### A1-7 — Le pager d'onboarding n'a aucun attribut d'accessibilité : les quatre étapes sont montées et lues d'un bloc

`technique` · sévérité **important** · verdict **confirme** · effort petit

Les quatre étapes vivent maintenant dans un seul `ScrollView` horizontal, toutes montées en permanence, et aucune n'est masquée quand elle est hors champ. Un lecteur d'écran parcourt donc les quatre titres, les quatre corps de texte et les quatre boutons à la suite — dont trois « Continuer » identiques et un « Commencer mon bilan » qui envoie directement au questionnaire depuis l'étape 1. Au clavier sur web, la tabulation atteint de même les boutons des pages non visibles. Les puces de progression ne portent aucun rôle ni libellé : la position dans le parcours (« étape 2 sur 4 ») n'est annoncée nulle part, alors que c'est la seule information de progression de l'écran. Rien de tout cela n'existait avant le passage au pager — les quatre routes séparées le donnaient gratuitement.

Preuves : `src/app/onboarding/index.tsx:141` ; `src/components/onboarding-dots.tsx:18` ; `docs/architecture/v1-11-navigation-et-design-system.md:527`

**Recommandation.** Poser sur chaque enveloppe de page `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"` / `aria-hidden` quand `index !== i`, et donner à `OnboardingDots` un `accessibilityRole="progressbar"` (ou un `accessibilityLabel` du type « Étape 2 sur 4 ») sur le conteneur, les points restant décoratifs. À vérifier sur appareil avec TalkBack, comme le demande déjà v1-11 §8.

**Contre-vérification.** Le constat sous-estime deux points. (1) Sur web, ce ne sont pas seulement les boutons : le `TextLink` « J'ai déjà un compte » (etape-accroche.tsx:58, role="link") reste tabulable depuis n'importe quelle page, et il navigue hors de l'onboarding. (2) `ThemedText` annonce déjà les titres comme en-têtes (themed-text.tsx:75) : un lecteur d'écran en mode navigation par titres verra donc quatre en-têtes de page, ce qui rend l'écran incompréhensible même sans parcours linéaire. La recommandation est bonne ; ajouter que masquer une page hors champ doit rester conditionné à l'index d'état (`index`), pas à la position de défilement, sinon le masquage sautera pendant le geste. Et v1-11 §8 laisse TalkBack non entendu : c'est le même appareil qui validera les deux.


### A1-8 — L'onboarding ne dit jamais qu'il n'y a pas besoin de compte — et sa seule mention de compte est « J'ai déjà un compte »

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Le commentaire de l'étape d'accroche décrit cet écran comme « un écran dont la promesse est “pas besoin de compte” », mais aucune des quatre étapes ne l'écrit. L'accroche parle de comprendre ses trajets, la réassurance de l'absence de jugement et de comparaison, la transition de la durée du questionnaire. Le seul mot « compte » du parcours est le lien « J'ai déjà un compte », qui, pour quelqu'un qui n'en a pas, se lit exactement à l'envers : il suggère qu'un compte est nécessaire et qu'il va falloir en créer un. C'est un abandon évitable au tout premier écran, sur le levier le plus fort du produit (le bilan anonyme, qui est un choix d'architecture entier).

Preuves : `src/components/onboarding/etape-accroche.tsx:53` ; `src/components/onboarding/etape-accroche.tsx:45` ; `src/components/onboarding/etape-reassurance.tsx:33`

**Recommandation.** Écrire la promesse là où le commentaire prétend qu'elle est : une ligne sur l'accroche ou la transition (« Pas de compte à créer pour commencer. ») avant le lien « J'ai déjà un compte », qui cesse alors d'être ambigu. Cohérent avec la spec §5, qui demande que « Continuer sans compte » ne soit jamais culpabilisant ni caché.

**Contre-vérification.** Deux précisions. (1) La spec §5 citée en appui parle de l'écran de proposition de connexion, pas de l'onboarding : l'argument tient sur le principe de non-culpabilisation, pas sur une exigence de la spec — la synthèse ne doit pas présenter cette recommandation comme réclamée par un document. (2) Le lien est délibérément discret et placé sous les puces (docs/design/v1-10-retrouver-son-compte/canvas.json, ENTRÉE 1) : la correction doit donc ajouter une ligne, pas déplacer ou renforcer ce lien, sinon elle contredit v1-10. La formulation la plus sûre est de la porter par Ramille (src/constants/mascotte.ts), qui parle déjà à cet endroit — et sans chiffre, conformément à la règle de sa voix.


### A1-9 — Rien ne mène à la politique de confidentialité avant la première écriture serveur

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Une session anonyme Supabase est créée dès l'ouverture de l'app, et les neuf étapes du bilan partent en base sans qu'aucun écran d'onboarding ni le questionnaire ne propose d'accès à `/confidentialite`. Les deux seuls liens du produit vers les pages légales vivent dans `/connexion` et `/compte`, tous deux atteints **après** le bilan. L'étape de réassurance affirme « Tes réponses restent privées » — l'endroit exact où l'affirmation devrait pouvoir être vérifiée — sans rien pour y renvoyer. Au-delà de l'information exigée par l'article 13 du RGPD au moment de la collecte, c'est un moment de confiance manqué : une phrase de réassurance non vérifiable vaut moins qu'une phrase vérifiable.

Preuves : `src/components/onboarding/etape-reassurance.tsx:33` ; `src/app/connexion/index.tsx:148` ; `src/app/compte/index.tsx:129`

**Recommandation.** Ajouter un `TextLink` discret vers `/confidentialite` sous le texte de l'étape de réassurance (ou au pied de la transition). Un seul lien, dans le registre du reste de l'écran — pas un bandeau de consentement, qui contredirait le ton.

**Contre-vérification.** Le constat s'arrête à l'onboarding alors que le trou est plus large : le questionnaire lui-même, qui est l'écran où la donnée personnelle est effectivement écrite, n'a aucun accès aux pages légales non plus (pas de `BandeHaute` hors des onglets). Un lien sur la seule étape de réassurance laisse donc quelqu'un qui balaie vite sans aucun chemin jusqu'à /plan. Deux liens (réassurance + pied du questionnaire ou de la transition) coûtent aussi peu. Rien dans les docs ne s'y oppose : v1-08 §1 n'écarte que la bannière de consentement, pas un lien.


### A1-10 — Quelqu'un qui a interrompu son bilan rejoue les quatre écrans d'onboarding et n'apprend jamais que ses réponses sont là

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

La racine ne connaît que deux états : un bilan `completed` existe → `/plan`, sinon → `/onboarding`. Un brouillon local n'est pas consulté. La personne qui a abandonné à l'étape 6 et rouvre l'app trois jours plus tard reçoit donc l'accroche, le contexte chiffré, la réassurance et la transition — quatre balayages et un bouton « Commencer mon bilan » qui, lui, dit littéralement de commencer — avant que `/bilan` ne la repose silencieusement à l'étape 6. La promesse faite deux écrans plus tôt (« Tu peux t'arrêter et reprendre plus tard, tes réponses sont conservées ») est techniquement tenue et jamais énoncée au moment où elle compte. C'est le moment de reprise le plus fragile du produit, et il ressemble à un redémarrage de zéro.

Preuves : `src/app/index.tsx:57` ; `src/components/onboarding/etape-transition.tsx:35` ; `src/lib/bilan-draft.ts:7`

**Recommandation.** Lire `loadBilanDraft()` dans la racine : si un brouillon existe, router directement vers `/bilan` (l'onboarding a déjà été vu par construction) ; et faire dire à la première étape du questionnaire, une fois seulement, qu'on reprend où on s'était arrêté. Le libellé du bouton de la transition mériterait aussi de suivre l'état (« Reprendre mon bilan »).

**Contre-vérification.** Le constat rate que ce n'est pas un manque non planifié mais un écran **spécifié et non livré** : docs/design/README.md §5.2 décrit l'état « Reprise de bilan » au mot près (« On reprend où tu t'étais arrêté », décompte non ambigu « Quatre écrans déjà remplis. Il en reste cinq, en comptant celui-ci. », CTA « Continuer mon bilan », aucune mention du délai écoulé), et la spec UI/UX §6 (ligne 87) pose « pas de redémarrage forcé ». Le commentaire d'en-tête de bilan-draft.ts le dit différé (« increment séparé »). La synthèse doit reprendre le libellé du §5.2 plutôt qu'en inventer un. Piège d'implémentation à signaler : garder l'ordre bilan complété → /plan **avant** le test du brouillon, sinon un re-bilan interrompu enfermerait la personne dans le questionnaire au lancement ; et le brouillon est local, donc la lecture doit rester dans le `try` existant pour ne pas transformer un AsyncStorage en panne en écran d'échec de démarrage.


### A1-11 — L'onboarding vend un bilan ponctuel ; la durée, qui est le cœur du produit, tient dans une ligne de 14 px en gris tertiaire

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Les quatre étapes promettent « en quelques minutes, tu vois quel déplacement pèse le plus » et « environ 5 minutes » : un diagnostic, une fois. La seule mention de l'accompagnement dans la durée est la ligne de présentation de Ramille, rendue en `type="small"` (14 px) et `textTertiary`, soit le registre typographique le plus faible de l'écran, juste au-dessus du titre. Ni le plan de réduction, ni le point hebdomadaire ou mensuel, ni le fait qu'on puisse refaire un bilan et voir l'écart ne sont annoncés. Quelqu'un qui termine son bilan et découvre ensuite qu'on va lui reposer une question chaque lundi n'y a pas consenti à l'entrée ; et l'attente posée à l'ouverture (« un test de 5 minutes ») est celle qui décide s'il revient au deuxième mois.

Preuves : `src/components/onboarding/etape-accroche.tsx:39` ; `src/constants/mascotte.ts:35` ; `src/components/onboarding/etape-transition.tsx:42`

**Recommandation.** Poser la suite dans l'étape de transition, à côté des quatre sections déjà listées : après le bilan, une action à ton rythme, et un point de temps en temps pour voir ce qui bouge. Sans chiffre, sans engagement, dans le registre de Ramille — et sans en faire un cinquième écran, la spec plafonne l'onboarding à quatre.

**Contre-vérification.** Un argument du constat est faux et doit être retiré de la synthèse : « quelqu'un qui découvre ensuite qu'on va lui reposer une question chaque lundi n'y a pas consenti à l'entrée ». Depuis v1-12, les rappels sont explicitement opt-in — la feuille des rappels s'ouvre après « C'est noté » et propose notification / email / rien (src/types/rappels.ts, libellé « Continuer sans rappel »), et `profiles.reminder_channel` ne se règle jamais tout seul. Il n'y a donc pas de consentement manquant, seulement une attente mal posée. Reste le vrai point : l'onboarding vend un diagnostic ponctuel alors que la valeur est la durée. La correction est une ligne de copy dans la transition, à écrire sans chiffre si elle est mise dans la bouche de Ramille.


### A1-12 — Le repère 2050 s'écrit de deux façons sur le même écran, et sortira avec un point décimal s'il change

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le titre de l'étape de contexte interpole `TARGET_2050_TOTAL_T` brut (« 2 tonnes visées en 2050 ») pendant que la barre juste en dessous affiche `formatTonnesShort(TARGET_2050_TOTAL_T)`, c'est-à-dire « 2,0 t ». Deux écritures de la même valeur, à quinze lignes d'écart, sur l'écran qui porte tout le cadrage chiffré du produit. Le risque n'est pas seulement visuel : `carbon-reference.ts` documente que cette cible peut être remplacée si une trajectoire par poste est publiée ; le jour où elle vaudrait 1,5, le titre afficherait « 1.5 tonnes » avec un point, dans une app dont le formatage à la française est justement centralisé par `formatTonnesShort`.

Preuves : `src/components/onboarding/etape-contexte.tsx:42` ; `src/components/onboarding/etape-contexte.tsx:61` ; `src/constants/carbon-reference.ts:103`

**Recommandation.** Passer le titre par le même formateur que la moyenne (`formatTonnesShort(TARGET_2050_TOTAL_T).replace(' t', ' tonnes')`), ou ajouter à `carbon-reference.ts` un `formatTonnesTexte()` qui rende « 2 tonnes » / « 1,5 tonne » et l'utiliser des deux côtés.

**Contre-vérification.** Une prémisse du constat est inexacte : le « À remplacer si une trajectoire par poste est publiée » de carbon-reference.ts (lignes 96-98) porte sur `TARGET_2050_TRANSPORT_T`, la dérivation, pas sur `TARGET_2050_TOTAL_T` (ligne 85), qui est la cible ADEME de 2 t et n'a aucune raison documentée de changer. Le risque « 1.5 avec un point » est donc théorique ; ce qui reste vrai et suffit, c'est l'incohérence visible aujourd'hui entre le titre et la barre. Attention aussi à la correction proposée : `formatTonnesShort(...).replace(' t', ' tonnes')` rendrait « 2,0 tonnes » dans un titre, ce qui est plus laid que le défaut corrigé — la bonne sortie est le `formatTonnesTexte()` de la seconde option (« 2 tonnes » / « 1,5 tonne », accord au singulier compris), qui devrait alors servir aussi à la moyenne ligne 42 pour supprimer le `.replace` ad hoc.


### A1-13 — La page 404 dit deux fois la même phrase, dont une dans la bouche de Ramille

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le titre de l'écran affiche « Cette page n'existe pas » et, trois lignes plus bas, Ramille commence par « Cette page n'existe pas. Ton bilan et ton plan, si — je te ramène. » La redite occupe la moitié de la seule phrase que la mascotte prononce ici, et affaiblit la partie utile (« ton bilan et ton plan, si »). Le commentaire du fichier pose pourtant la bonne intention : cette page « doit rendre la main plutôt que constater ». Elle constate deux fois avant de rendre la main.

Preuves : `src/app/+not-found.tsx:28` ; `src/constants/mascotte.ts:80`

**Recommandation.** Retirer la première proposition de la ligne de Ramille dans `src/constants/mascotte.ts` — « Ton bilan et ton plan, eux, sont toujours là — je te ramène. » —, le titre disant déjà le constat.

**Contre-vérification.** Le constat sous-estime la redite : le fait est dit trois fois, pas deux — entre les deux, la ligne de corps « Le lien est peut-être incomplet, ou la page a changé d'adresse. » le redit une troisième fois. C'est donc la ligne de Ramille qui devrait porter *uniquement* la sortie. La reformulation proposée passe les cinq gardes de `src/constants/mascotte.test.ts` (aucun chiffre, aucune injonction, ≤ 120 caractères, pas d'ancien nom) — le test ne détecte pas la redite, il n'y a donc pas de filet ici et le correctif est sûr.


### A1-14 — Aucun `robots.txt`, aucune description : les routes applicatives sont indexables et diluent les deux surfaces publiques

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

L'export statique produit une page HTML par route — `/plan`, `/suivi`, `/compte`, `/connexion/*`, `/onboarding` et `/status` compris — et rien ne les exclut de l'indexation : `public/` ne contient que `.well-known/assetlinks.json`, `vercel.json` ne pose aucune règle, et `+html.tsx` n'émet ni `<meta name="robots">` ni `<meta name="description">`. Or le produit a soigné ses titres de page en posant explicitement que `/confidentialite` et `/conditions` sont « les deux seules surfaces publiques » et les seuls titres qu'un moteur affichera jamais. Aujourd'hui ces deux pages concourent avec seize coquilles vides. `/status`, page de diagnostic « volontairement non liée depuis nulle part », a même un titre déclaré et est donc parfaitement indexable.

Preuves : `src/app/+html.tsx:19` ; `src/constants/page-titles.ts:50` ; `src/app/status.tsx:15`

**Recommandation.** Ajouter `public/robots.txt` n'autorisant que `/confidentialite`, `/conditions` et `/compte/suppression`, et poser une `<meta name="description">` sur ces pages (le mécanisme de `TitreDePage` s'étend naturellement à une description indexée par chemin).

**Contre-vérification.** Deux choses que le constat rate. (1) L'export produit aussi `dist/_sitemap.html`, la page de plan de site générée par Expo Router — non listée dans `PAGE_TITLES` (elle retombe sur `DEFAULT_PAGE_TITLE`) et qui énumère toutes les routes : c'est le pire candidat à l'indexation, à exclure en premier. (2) Un `robots.txt` seul n'empêche pas l'indexation d'une URL découverte autrement, il empêche le crawl ; la garantie forte est un `<meta name="robots" content="noindex">` par chemin — et le mécanisme existe déjà, `TitreDePage` étant rendu au layout racine et indexé par `usePathname()`, il suffit d'y ajouter une seconde balise dérivée d'une liste de chemins publics. Confirmé au passage que `public/` est bien recopié dans l'export (`dist/.well-known/assetlinks.json` existe), donc un `public/robots.txt` atterrirait bien en production ; ajouter alors une garde dans `scripts/verifier-*-export.mjs`, même famille que `verifier-assetlinks-export.mjs`, sinon la disparition serait silencieuse.


### A1-15 — L'écran de lancement n'annonce rien au lecteur d'écran et ignore la préférence « réduire les animations »

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

L'écran par lequel tout le monde passe à chaque démarrage ne porte aucun attribut d'accessibilité : la mascotte est masquée (le composant `Mascot` le fait), et il ne reste que le mot « Ramille » qui apparaît en fondu après 620 ms. Un lecteur d'écran n'annonce donc ni qu'un chargement est en cours, ni qu'il s'achève — la redirection survient sans un mot. Par ailleurs, `AccessibilityInfo.isReduceMotionEnabled` n'est consulté nulle part dans `src/` : l'animation d'arrivée, l'à-coup et le fondu du nom se jouent quelle que soit la préférence système, sur un écran qui dure au minimum 1450 ms.

Preuves : `src/components/ecran-lancement.tsx:104` ; `src/components/ecran-lancement.tsx:70`

**Recommandation.** Poser `accessibilityRole="progressbar"` (ou un `accessibilityLabel` « Chargement ») avec `aria-busy` sur le conteneur, et court-circuiter les animations quand `isReduceMotionEnabled()` est vrai — la mascotte apparaît alors directement en `happy`, le plancher d'affichage restant identique.

**Contre-vérification.** Meilleure recommandation que `AccessibilityInfo.isReduceMotionEnabled()` : le dépôt est sur `react-native-reanimated` 4.5.1 (package.json l. 30), qui accepte `reduceMotion: ReduceMotion.System` directement dans la configuration de `withTiming`/`withSequence` — la préférence est alors respectée sans état supplémentaire, sans effet asynchrone, et sur web comme sur natif. Il resterait à traiter à part le `setTimeout(() => setHumeur('happy'), SOMMET_REVEIL)`, qui n'est pas une animation Reanimated : en mouvement réduit il doit passer à `happy` immédiatement, sinon la mascotte reste `calm` tout l'écran. Le constat rate aussi que le problème d'annonce dépasse cet écran : l'état d'échec de `src/app/index.tsx` n'a pas non plus de `accessibilityLiveRegion`, donc le basculement silencieux vers « Le démarrage a échoué » n'est annoncé nulle part.


### A1-16 — Le plancher d'animation de 1450 ms se paie à chaque lancement, y compris pour la personne qui vient tous les jours

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort petit

La racine complète toujours jusqu'à `DUREE_ANIMATION_LANCEMENT` avant de rediriger, sans distinguer le premier lancement du centième. C'est un arbitrage documenté et défendable pour l'ouverture initiale — le produit s'annonce — mais le produit qu'il sert est un produit d'habitude : la boucle hebdomadaire suppose des ouvertures répétées, et une seconde et demie de vitrine à chaque fois se retourne contre la fluidité de la réponse « en un geste » que le rappel promet. Le chemin par notification y échappe (`RetourDeNotification` navigue immédiatement), pas les autres.

Preuves : `src/app/index.tsx:54` ; `src/components/ecran-lancement.tsx:56`

**Recommandation.** Conserver le plancher plein au premier lancement (aucune session en cache) et le réduire fortement — ou le supprimer — quand une session existe déjà : la mascotte a alors déjà été vue, et l'animation cesse d'être une présentation pour devenir un péage. Une marque locale suffit.

**Décision documentée concernée.** Décision assumée en `src/components/ecran-lancement.tsx` §46-55 et `src/app/index.tsx` §49-53 (« plancher d'affichage, pas délai ajouté »), reprise dans v1-11 §9.5. La proposition ne retire pas l'écran, elle le réserve aux lancements où il apporte quelque chose.

**Contre-vérification.** L'intuition produit n'est pas absurde (une app d'habitude paie 1,45 s par ouverture), mais elle doit être arbitrée par un rendu sur appareil, pas par un patch : ce qui a été jugé, c'est qu'un écran d'ouverture non vu ne vaut rien, pas que la répétition soit gratuite. Une piste qui ne contredit pas la décision : raccourcir la durée elle-même (l'animation dure ~1080 ms, le plancher réserve ~400 ms de visage souriant) plutôt que la conditionner. Deux précisions factuelles : la claim sur la notification est vérifiée — `RetourDeNotification` (`src/components/retour-de-notification.tsx`) fait `router.navigate('/plan')` depuis le layout racine dès la réponse, sans attendre le plancher — mais son commentaire précise que ce chemin ne sert qu'à l'app déjà ouverte ailleurs, la racine routant déjà vers le plan ; et à froid depuis une notification, le `router.replace` de la racine part quand même 1450 ms plus tard, ce que le constat ne relève pas.


### A1-17 — Dans le pager d'onboarding, le commentaire qui explique `onScroll` est posé au-dessus du gestionnaire de mise en page

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le bloc de commentaire qui justifie le choix d'`onScroll` plutôt qu'`onMomentumScrollEnd` (« ce dernier n'existe pas sur web… on arrondit à la page la plus proche ») précède immédiatement `surMesure`, qui est le gestionnaire d'`onLayout` et ne fait que mesurer une hauteur ; `surDefilement`, à qui le commentaire s'adresse, vient ensuite sans explication. Dans un dépôt où les commentaires portent les décisions et les pièges vérifiés, un commentaire rattaché à la mauvaise fonction est une fausse piste, et le prochain qui touchera à la mesure de hauteur croira toucher au geste.

Preuves : `src/app/onboarding/index.tsx:114` ; `src/app/onboarding/index.tsx:121`

**Recommandation.** Déplacer le bloc au-dessus de `surDefilement`.

**Contre-vérification.** Correctif exact et sans risque. À noter en le déplaçant : la phrase « React ignore une valeur identique, donc pas de rendu superflu pendant le geste » décrit bien `setIndex` de `surDefilement`, mais elle vaut aussi pour `setHauteur` — si on veut garder une trace au-dessus de `surMesure`, le bon commentaire y est autre chose : pourquoi la hauteur est mesurée puis figée sur chaque page (le pager de v1-11 §9.10, où un état serveur/client divergent avait cassé la première tentative).


## A2 — questionnaire du bilan (wizard, étapes, brouillon, préremplissage)

**Résumé du lecteur.** Le questionnaire est la partie la mieux tenue du dépôt sur le plan de la conception : navigation dérivée d'un module pur et testé, complétude et message « il manque encore » issus d'une seule dérivation, questions de précision placées là où l'œil se trouve. Les défauts ne sont donc pas dans la structure mais dans les bords — et deux d'entre eux sont sérieux. Une distance saisie à « 0 » traverse toutes les validations et fait échouer la soumission neuf étapes plus loin sur un message Postgres en anglais ; surtout, la soumission crée la ligne `assessments` en `completed` **avant** d'écrire les réponses, si bien qu'une coupure réseau laisse un bilan fantôme qui route l'app vers un écran d'attente sans issue et tue définitivement le préremplissage du re-bilan. Le brouillon, lui, est écrit dès la simple ouverture de l'écran, prend ensuite le pas sur le dernier bilan et fait disparaître le bandeau de préremplissage — la promesse « tes réponses sont pré-remplies, tu ne modifies que ce qui a changé » que le suivi affiche ne survit pas au premier abandon, alors que le re-bilan est justement ce qui rend l'accompagnement dans la durée praticable. Côté justesse du chiffre, plusieurs approximations sont invisibles pour la personne qui répond : 15 km en voiture imposés à qui déclare des loisirs rares, covoiturage loisirs sans effet, plafonds « 6+ » et « 10+ » qui tronquent précisément les plus gros émetteurs, répartition 50/50 du second mode jamais énoncée. Enfin, l'accessibilité est bonne là où le dépôt a posé ses composants (`ModeListItem`, `ChoiceRow`, `TextLink`) et absente là où il ne les a pas utilisés : les puces, qui portent pourtant la majorité des réponses, s'annoncent en « bouton » sans état de sélection.

**Points forts à ne pas casser**

- La navigation du wizard est **entièrement dérivée de l'état des réponses** (`isStepVisible`/`nextStep`/`previousStep`), sans machine à états parallèle, et couverte par des tests unitaires sur un module pur qui n'importe pas `@/lib/supabase` (src/types/bilan.ts:118-156, src/types/bilan.test.ts). La barre « Étape N sur M » se recalcule donc juste quand une section entière est sautée — exigence explicite de la spec UI/UX §2.
- `isStepComplete` est une simple lecture de `manqueDeLEtape`, avec un test qui épingle l'équivalence sur toutes les étapes (src/types/bilan.ts:232-235, src/types/bilan.test.ts:347). C'est ce qui empêche deux listes de conditions de diverger en silence — et le message « Il manque encore … » affiché dans la zone collante répond au bouton grisé qui ne disait pas pourquoi (src/components/bilan/step-shell.tsx:70-74). À ne surtout pas dédoubler.
- La question de précision (motorisation, cylindrée) s'ouvre **sous l'élément sélectionné, à l'intérieur de la liste**, jamais après la liste entière — décision motivée par un défaut mesuré sur appareil (242 px hors champ) et documentée en tête de src/components/bilan/precision-mode.tsx, avec le rôle `radio` qui vient avec `ModeListItem`. Ne pas revenir à des puces ni à un défilement automatique.
- L'échec de soumission revient **en ligne, au-dessus du bouton, avec les réponses intactes** et le brouillon non effacé (src/app/bilan/index.tsx:177-193, src/components/message-inline.tsx) — la boîte système bloquante a été retirée à raison. Seul le contenu du message reste à reprendre (A2-16).
- L'écran d'attente du calcul assume l'attente sans mentir : ni barre de progression fictive, ni décompte de facteurs qui dériverait (src/components/bilan/calcul-en-cours.tsx:15-22). C'est le seul moment du parcours où Ramille parle, et c'est le bon.
- Le lien « Ton mode n'est pas dans la liste ? » donne une issue à quiconque n'entre pas dans les neuf cases, plutôt que de le forcer à mentir ou à abandonner — les deux étant invisibles pour l'équipe (src/components/bilan/missing-mode-link.tsx:8-14). Le principe est à garder tel quel ; seule sa mise en œuvre technique est à corriger (A2-20).

### A2-1 — Une distance de 0 km passe toutes les validations du wizard et fait échouer la soumission neuf étapes plus loin

`technique` · sévérité **important** · verdict **confirme** · effort petit

`manqueDeLEtape` ne teste que la nullité (`commute_distance_km === null`), alors que la colonne porte `check (commute_distance_km > 0)`. Saisir « 0 » à l'étape 2 (ou laisser un 0 après avoir effacé un chiffre repris d'un bilan précédent) rend l'étape « complète », le bouton Suivant s'active, et l'erreur ne se manifeste qu'au tout dernier pas, sous la forme d'un message Postgres en anglais. C'est le pire endroit du produit pour un échec : le « moment de vérité » du bilan, après cinq minutes de saisie, sans que rien ne désigne le champ fautif ni l'étape où il se trouve.

Preuves : `src/types/bilan.ts:180` ; `supabase/migrations/20260824180100_assessment_answers.sql:11` ; `src/components/bilan/numeric-field.tsx:30`

**Recommandation.** Traiter 0 comme « pas de réponse » dans `manqueDeLEtape` (`commute_distance_km === null || commute_distance_km <= 0`), et ajouter un cas au test de `bilan.test.ts`. Poser au passage une borne haute plausible (au-delà de ~200 km pour un aller, proposer une confirmation plutôt que de bloquer) : rien aujourd'hui n'empêche un 1200 saisi au lieu de 12 de produire un bilan cent fois trop lourd.

**Contre-vérification.** Une inexactitude dans la description : effacer complètement le champ ne laisse pas un 0 — `cleaned === '' ? null` remet `null`, et l'étape redevient incomplète. Seule une saisie littérale « 0 » (ou « 00 ») produit le défaut, ce qui réduit la fréquence et justifie « important » plutôt que « bloquant » en isolé. En revanche le coût réel n'est pas l'échec de l'insert : il est chaîné à A2-2 — la ligne `assessments` en `completed` est déjà créée quand l'insert des réponses échoue, donc un simple « 0 » laisse un orphelin qui reroute l'app vers /plan et casse le préremplissage serveur. Corriger A2-2 rend A2-1 bénin. La borne haute suggérée est une bonne idée mais doit rester une confirmation douce (ton du produit), jamais un blocage.


### A2-2 — Un échec réseau à la soumission laisse un bilan « completed » sans réponses, qui bloque l'app sur un écran d'attente sans issue

`technique` · sévérité **important** · verdict **confirme** · effort petit

`submit()` insère d'abord `assessments` avec `status: 'completed'` et `submitted_at`, puis les réponses, puis appelle le calcul. Si l'une des deux étapes suivantes échoue (réseau coupé, session expirée, erreur de contrainte comme A2-1), la ligne `assessments` reste en base, complète aux yeux de tout le reste du produit. Conséquences vérifiables : la racine route désormais vers `/plan` (elle teste l'existence d'un bilan `completed`), le plan ne trouve pas de cycle et affiche « Ton plan est en cours de préparation, reviens dans un instant. » — un écran sans bouton, définitif ; et `loadLastSubmittedAnswers` interroge le dernier bilan complété, qui n'a pas de réponses, donc renvoie `null` et le préremplissage du re-bilan meurt en silence. Chaque nouvelle tentative ajoute un orphelin de plus.

Preuves : `src/app/bilan/index.tsx:138` ; `src/app/index.tsx:44` ; `src/app/(tabs)/plan.tsx:317` ; `src/lib/bilan-history.ts:137`

**Recommandation.** Insérer le bilan en `status: 'in_progress'` (valeur par défaut du schéma), puis le passer à `completed` seulement après l'insert des réponses et le retour de `compute_assessment_results` — un `update` sur `assessments` est déjà couvert par les policies owner-scoped. À défaut, supprimer la ligne créée dans le `catch`. Et donner un bouton « Refaire mon bilan » à l'état `pending` du plan, qui est aujourd'hui un cul-de-sac.

**Contre-vérification.** Deux précisions que le constat rate. (1) L'ordre proposé ne marche que si le passage à `completed` se fait AVANT l'appel à `compute_assessment_results` : celui-ci déclenche `generate_plan_cycle_for_user`, qui sélectionne `where a.user_id = p_user_id and a.status = 'completed'` (20260905130000_actions_chiffrees.sql:675) — flipper après le RPC générerait le plan sur l'ancien bilan ou sur rien. Séquence sûre : insert `in_progress` → réponses → update `completed` → RPC, avec suppression de la ligne dans le `catch` en filet. (2) Ce n'est pas tout à fait « sans issue » : /plan vit dans (tabs), et l'onglet Suivi offre « Faire mon bilan » (src/app/(tabs)/suivi/index.tsx:119) — d'où la sévérité corrigée à « important ». Le brouillon local n'étant pas effacé en cas d'échec, les réponses ne sont pas perdues. Le bouton sur l'état `pending` reste néanmoins la bonne idée.


### A2-3 — Le champ de distance avale le séparateur décimal et transforme « 3,5 » en 35

`technique` · sévérité **important** · verdict **confirme** · effort petit

`NumericField` filtre tous les caractères non chiffrés puis convertit ce qui reste. Une saisie « 3,5 » ou « 3.5 » ne produit ni une erreur ni un refus : elle produit **35**. Le champ affiche alors 35, ce qui est visible — mais le geste est rapide, le clavier `number-pad` d'Android propose une virgule, et l'erreur porte sur le poste dominant de la majorité des bilans, multiplié par 2 × jours × 45 semaines. Un trajet de 1,5 km à vélo devient 15 km ; un trajet de 2,5 km en voiture devient 25 km.

Preuves : `src/components/bilan/numeric-field.tsx:29` ; `src/components/bilan/numeric-field.tsx:32`

**Recommandation.** Accepter un séparateur décimal (`,` ou `.`) et le normaliser, ou à défaut ignorer tout ce qui suit le premier séparateur au lieu de concaténer les décimales aux unités. Le calcul SQL reçoit un `numeric`, il n'y a aucune raison de refuser 3,5 km.

**Contre-vérification.** Atténuation à signaler : la valeur fautive s'affiche immédiatement en 28 px (`value === null ? '' : String(value)`), donc l'erreur est visible — ce n'est pas un défaut silencieux, contrairement à A2-2. La correction doit gérer l'état intermédiaire de frappe : garder la chaîne saisie en état local plutôt que de reformater à chaque touche via `String(value)`, sinon taper « 3, » se voit ré-écrit en « 3 » et la décimale devient impossible à saisir. Normaliser `,` → `.` et ne conserver qu'un séparateur.


### A2-4 — Un retour en arrière permet de déclarer « voiture » sur les deux jambes du trajet, ce que le calcul suppose impossible

`technique` · sévérité **important** · verdict **confirme** · effort petit

La liste du second mode exclut le mode principal courant, mais changer le mode principal *après* avoir choisi le second ne nettoie rien. Séquence : mode principal « Train », second mode « Voiture » + motorisation ; Retour ; mode principal « Voiture (covoiturage) ». On repart en avant : `commute_second_mode` vaut toujours `'voiture'`, la liste ne l'affiche plus (elle le filtre), donc l'encart « Lequel ? » n'a **aucune ligne sélectionnée** alors que `manqueDeLEtape` le considère renseigné et que Suivant reste actif. Côté calcul, l'invariant écrit dans la fonction SQL et dans `types/bilan.ts` (« au plus une jambe vaut voiture ») est faux : les 50 % de la seconde jambe sont facturés voiture **sans** être divisés par le covoiturage, qui ne s'applique qu'à la jambe principale. Une personne qui déclare covoiturer paie la moitié de son trajet au tarif solo.

Preuves : `src/components/bilan/steps/commute-extra.tsx:37` ; `src/components/bilan/steps/commute-mode.tsx:40` ; `src/types/bilan.ts:39` ; `supabase/migrations/20260904140000_fix_flight_and_long_distance_train_factors.sql:229`

**Recommandation.** Dans la sélection du mode principal, effacer `commute_second_mode` (et `commute_second_mode_used`) dès qu'il devient égal au nouveau mode principal — c'est la seule ligne qui manque. Ajouter le cas à `bilan.test.ts` : c'est exactement le genre d'état que la dérivation `manqueDeLEtape` ne peut pas voir, puisqu'elle ne teste que la nullité.

**Contre-vérification.** Le constat sous-estime la portée : le même trou existe en miroir dans commute-extra.tsx sur `commute_car_engine`/`commute_two_wheeler_type`, dont la conservation est conditionnée à `answers.commute_mode`/`commute_second_mode` — la ligne manquante dans commute-mode.tsx laisse aussi un moteur rattaché à une jambe qui n'existe plus. La correction demandée doit donc effacer `commute_second_mode` (et remettre `commute_second_mode_used` à `false`) puis rejouer la même règle de conservation du moteur, sinon on remplace un état incohérent par un autre. Attention aussi à référencer la migration 20260905130000 (dernière définition) et non 20260904140000 dans le ticket.


### A2-5 — Sur l'étape loisirs, un mode déjà répondu peut être invisible : la question paraît vide alors qu'elle est remplie

`technique` · sévérité **important** · verdict **confirme** · effort petit

`showMore` démarre toujours à `false`, donc seuls les quatre modes principaux sont rendus. Si `leisure_mode` vaut un des cinq autres (`bus`, `metro_tram`, `marche`, `deux_roues_motorise`, `trottinette`), aucune ligne n'apparaît sélectionnée. Deux chemins très ordinaires y mènent : un re-bilan prérempli (la personne allait en bus le mois dernier), et un simple aller-retour Retour/Suivant dans la même session — le composant se démonte à chaque changement d'étape, l'état local repart à zéro. La personne voit une question à laquelle elle vient de répondre revenir sans réponse, et Suivant reste actif, ce qui rend l'incohérence encore plus troublante. Même famille que le défaut d'appareil du 07/09/2026 corrigé dans `precision-mode.tsx` : un champ répondu mais hors du champ visuel.

Preuves : `src/components/bilan/steps/leisure-detail.tsx:40` ; `src/components/bilan/steps/leisure-detail.tsx:47` ; `src/constants/transport-modes.ts:232`

**Recommandation.** Initialiser `showMore` à `LEISURE_MODE_CHOICES_MORE.some((c) => c.modeId === answers.leisure_mode)`. Même remarque pour `selectedKey`, qui devrait être dérivé plutôt que gardé en état local — c'est lui qui perd aussi la distinction seul/covoiturage au retour (déjà documenté en tête du fichier).

**Contre-vérification.** Ce que le constat rate : le risque n'est pas seulement la confusion, c'est la modification silencieuse d'une réponse — voyant la question « vide », la personne coche un des quatre modes primaires et son « bus » devient « voiture », ce qui change le calcul sans qu'elle sache qu'elle a changé quelque chose. La correction proposée (initialiser `showMore` depuis `LEISURE_MODE_CHOICES_MORE.some(...)`) est exacte et suffit. En revanche, dériver `selectedKey` de `answers` ne récupérera pas la distinction seul/covoiturage : elle n'existe pas en base côté loisirs (pas de `leisure_carpool_size`, écart assumé documenté en tête du fichier et en v1-05 §2) — cette partie de la recommandation est irréalisable sans nouvelle colonne, et sans effet sur le calcul.


### A2-6 — Le brouillon est enregistré dès l'ouverture du questionnaire et prend ensuite le pas sur le préremplissage, sans jamais le dire

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

L'effet de sauvegarde se déclenche dès que `draftLoaded` passe à vrai, donc **ouvrir `/bilan` et repartir suffit à créer un brouillon**. Comme le brouillon est la première source de préremplissage, la visite suivante entre par cette branche : les réponses sont bien là, mais `prefilled` reste faux et le bandeau « Tes réponses précédentes sont pré-remplies. Modifie ce qui a changé. » ne s'affiche plus. Pire, un re-bilan commencé, à demi modifié et abandonné se rouvre tel quel des semaines plus tard, sans bandeau, sans date, et **sans aucun moyen de repartir de ses vraies dernières réponses** — il n'existe ni « Recommencer », ni suppression du brouillon. C'est précisément l'écran « Reprise de bilan (Continuer / Recommencer) » que `bilan-draft.ts` annonce comme reporté à un increment séparé. Le suivi promet pourtant explicitement « tes réponses sont pré-remplies, tu ne modifies que ce qui a changé » : la promesse tombe au premier abandon.

Preuves : `src/app/bilan/index.tsx:84` ; `src/app/bilan/index.tsx:216` ; `src/lib/bilan-draft.ts:7` ; `src/app/(tabs)/suivi/index.tsx:282`

**Recommandation.** Ne rien écrire tant qu'aucune réponse n'a été modifiée (comparer au point de départ, ou n'armer la sauvegarde qu'au premier `update`), horodater le brouillon, et afficher le bandeau de préremplissage aussi quand le brouillon *est* le dernier bilan. Le petit écran Continuer / Recommencer devient alors utile plutôt que redondant, et un brouillon plus vieux que quelques semaines peut être proposé à la suppression au lieu de s'imposer.

**Contre-vérification.** Deux nuances. (1) Le préremplissage lui-même ne « meurt » pas dans le cas courant : le brouillon écrit à l'ouverture contient exactement les réponses préremplies, donc seule la bannière est perdue ; le vrai dommage est le brouillon à demi modifié qui devient la base d'un re-bilan des semaines plus tard, ce qui pollue la comparaison du suivi — c'est cet angle qu'il faut mettre en avant. (2) Une partie de la recommandation heurte le handoff design : docs/design/README.md:225 (écran 5.2 « Reprise de bilan ») dit « Jamais de redémarrage, aucune mention du délai écoulé », et prévoit « Continuer mon bilan » + « Revoir les étapes précédentes » — donc ni « Recommencer », ni date affichée, ni proposition de suppression d'un vieux brouillon telles que rédigées. À arbitrer explicitement (le commentaire de bilan-draft.ts parle bien, lui, de « Continuer / Recommencer »). Le correctif sans arbitrage nécessaire, et qui vaut à lui seul : n'armer la sauvegarde qu'au premier `update` réel, et afficher la bannière quand le brouillon est identique au dernier bilan.


### A2-7 — Le brouillon est relu sans validation ni version, alors que la forme des réponses a changé trois fois

`technique` · sévérité **important** · verdict **confirme** · effort petit

`loadBilanDraft` fait un `JSON.parse` suivi d'un `as BilanDraft` : rien ne vérifie que l'objet a la forme attendue, et la clé n'a jamais changé (`traceverte.bilan_draft.v1`) alors que `BilanAnswers` a gagné `commute_car_engine`, les quatre motorisations, puis `commute_two_wheeler_type` / `leisure_two_wheeler_type`. Un brouillon écrit avant ces migrations restitue des champs `undefined` : `manqueDeLEtape` compare à `null`, donc `undefined !== null` — l'étape est déclarée complète et la question de motorisation ou de cylindrée n'est jamais posée. Le bilan part alors sur le mode générique, c'est-à-dire au tarif du scooter pour un motard, ce que la migration `cylindree_deux_roues` existe justement pour empêcher. Et si `step` ne correspond plus à un identifiant connu, aucune des neuf branches de rendu ne s'active : l'écran affiche l'en-tête et les boutons, avec un corps vide.

Preuves : `src/lib/bilan-draft.ts:24` ; `src/lib/bilan-draft.ts:16` ; `src/types/bilan.ts:187` ; `src/app/bilan/index.tsx:219`

**Recommandation.** Normaliser à la lecture : `{ ...EMPTY_BILAN_ANSWERS, ...draft.answers }` (les clés manquantes redeviennent `null`) et rejeter le brouillon si `step` n'est pas dans `BILAN_STEP_ORDER`. C'est trois lignes dans un module pur, donc testables aux côtés de `bilan.test.ts`. La clé AsyncStorage peut rester `v1` — la normalisation vaut mieux qu'un renommage, qui effacerait les brouillons en cours.

**Contre-vérification.** Deux nuances à corriger dans la rédaction du constat. (1) La question n'est pas « jamais posée » quand l'étape est revisitée : src/components/bilan/steps/commute-mode.tsx:69-78 affiche bien le `PrecisionMode` dès que le mode deux-roues est sélectionné — le défaut réel est que rien ne *bloque* le passage, la puce apparaît simplement vide et « Suivant » est actif ; le cas « jamais posée » ne se produit que si le brouillon reprend à une étape postérieure. (2) Le scénario « step inconnu → corps vide » est théorique : `git log -S"BILAN_STEP_ORDER"` ne montre qu'une seule introduction, les neuf identifiants n'ont jamais changé. Le garde reste bon marché, mais ce n'est pas un défaut observé. Ce que le constat rate, et qui vaut plus que le cas historique : le défaut est structurel et se rejouera à **chaque** futur ajout de champ, y compris entre deux versions d'app installées à quelques jours d'écart. La normalisation `{ ...EMPTY_BILAN_ANSWERS, ...draft.answers }` est la bonne réponse, et elle a sa place dans `src/types/bilan.ts` (module pur, testé) plutôt que dans `src/lib/bilan-draft.ts` qui n'a pas de suite — bilan-draft n'importe pas `@/lib/supabase`, donc les deux sont testables, mais la règle du dépôt pousse la logique pure vers `src/types/*`.


### A2-13 — Aucune case pour les déplacements professionnels : pour certains profils, le bilan est faux de très loin

`fonctionnel` · sévérité **important** · verdict **contredit_decision** · effort grand

Le questionnaire couvre trois postes : domicile-travail, loisirs de week-end, voyages annuels. Rien ne recueille les déplacements *pendant* le travail — infirmière libérale, artisan en tournée, commercial, livreur, personnel itinérant. Pour ces profils, la part la plus lourde de leur empreinte transport n'entre nulle part, et la restitution leur annoncera un chiffre plausible mais très inférieur à la réalité, puis un plan de réduction portant sur le mauvais poste. C'est le cas où l'app manque à la fois la prise de conscience et le changement d'habitude, tout en paraissant fonctionner. Le questionnaire ne leur laisse pas non plus de mot à dire : le lien de retour ne couvre que les modes manquants, pas les postes manquants.

Preuves : `src/types/bilan.ts:92` ; `src/components/bilan/steps/commute-has-trip.tsx:19` ; `supabase/migrations/20260824180100_assessment_answers.sql:8`

**Recommandation.** À court terme, nommer la limite là où elle se rencontre (une phrase sur l'étape 1 : « on ne compte pas ici les déplacements faits pendant ton travail ») — un bilan qui dit ce qu'il ne mesure pas reste honnête. À moyen terme, une quatrième question de section 1 (« conduis-tu dans le cadre de ton travail ? km/semaine ») réutiliserait tout le mécanisme existant ; c'est une décision produit, pas une décision technique.

**Décision documentée concernée.** Le découpage en trois postes fixes est acté par docs/architecture/v1-05-bilan-v2.md §1 et la spec fonctionnelle §5 ; ajouter un poste rouvre cette décision.

**Contre-vérification.** Les deux moitiés de la recommandation n'ont pas le même statut : la seconde (une quatrième question de section 1) contredit v1-05 §1 et doit passer par une décision produit ; la première (nommer la limite sur l'étape 1) ne contredit rien et coûte une ligne — l'écran a déjà un helper à cet endroit précis (src/components/bilan/steps/commute-has-trip.tsx:46-49, « Télétravail total, sans emploi… »), il suffit de l'y compléter. Ce que le constat rate : le pré-remplissage rendrait un tel poste peu coûteux à ajouter plus tard (assessment_answers est à plat, un champ par question), mais toute nouvelle colonne de km impose aussi de toucher recompute_assessment_results et estimate_action_savings, plus les assertions chiffrées pgTAP (CLAUDE.md § Tests) — l'effort « grand » est donc juste.


### A2-16 — Le message d'échec de la soumission recopie l'erreur technique, en anglais, dans la voix du produit

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Le texte affiché concatène une phrase soignée et `error.message` tel quel. Selon la panne, la personne lit « Ton bilan n'a pas pu être enregistré. Network request failed », « … TypeError: Failed to fetch » ou une violation de contrainte Postgres complète, nom de table compris. C'est le seul endroit du questionnaire où l'app parle, il arrive au terme de cinq minutes de saisie, et il parle anglais. Le produit sait pourtant faire autrement : l'écran de démarrage sépare explicitement la phrase de produit du détail technique, présenté comme un bloc à recopier.

Preuves : `src/app/bilan/index.tsx:188` ; `src/app/index.tsx:92`

**Recommandation.** Garder une phrase unique et rassurante (« Tes réponses sont conservées, réessaie dans un instant ») et reléguer le détail technique dans un second texte `type="code"`, comme sur l'écran de démarrage. Ajouter le rappel que rien n'est perdu : c'est vrai (le brouillon n'est effacé qu'en cas de succès) et c'est l'information dont la personne a besoin.

**Contre-vérification.** Deux points que le constat renforce s'il les nomme : (1) l'affirmation « tes réponses sont conservées » est vraie et vérifiable — clearBilanDraft() n'est appelé qu'après le router.replace de succès (index.tsx:176-181) — donc la phrase rassurante n'est pas un vœu pieux ; (2) le risque n'est pas seulement de ton mais de fuite : un message PostgrestError contient le nom de table/contrainte et, pour un 23514, peut refléter des valeurs saisies. La correction naturelle est le même couple qu'à l'écran de démarrage : un état message produit + un état detail rendu en type="code", ce qui suppose d'élargir la prop message de StepShell (aujourd'hui un simple string) — quelques lignes de plus que ce que dit le constat.


### A2-8 — Tous les choix exclusifs rendus en puces s'annoncent « bouton », le seul rôle qui ne dit pas « sélectionné »

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La règle du dépôt est explicite : les listes de choix exclusifs sont des `radio`, « seul rôle qui annonce sélectionné ». `ModeListItem` et `ChoiceRow` la respectent ; `Chip` non — et c'est lui qui porte la majorité des réponses du questionnaire : jours par semaine, taille du covoiturage, Oui/Non du second mode, nombre de vols, part de vols courts, trajets longs en train et en voiture, et les trois questions de contexte B4. Un lecteur d'écran y entend une suite de boutons sans état, donc sans moyen de savoir ce qui est déjà coché — sur un questionnaire de neuf étapes qu'on parcourt en revenant en arrière, c'est l'information principale.

Preuves : `src/components/bilan/chip.tsx:46` ; `src/components/bilan/mode-list-item.tsx:31` ; `src/components/bilan/steps/context.tsx:52`

**Recommandation.** Ajouter à `Chip` une prop de rôle (`radio` par défaut quand la puce appartient à un groupe exclusif, `button` pour les rares cas d'action), en reprenant le libellé du commentaire de `mode-list-item.tsx`. Aucun changement visuel.

**Contre-vérification.** Le constat est factuellement inexact sur son point central, et la preuve citée s'arrête une ligne trop tôt : chip.tsx:49 porte `accessibilityState={{ selected }}`. Un lecteur d'écran n'entend donc pas « une suite de boutons sans état » — VoiceOver comme TalkBack annoncent « sélectionné » sur un bouton dont l'état `selected` est posé, et la V1 est Google Play uniquement. Le vrai écart, plus étroit, est double : (a) `radio` annonce aussi « non sélectionné » et la position dans le groupe, ce que `button` ne fait pas ; (b) sur le web, react-native-web rend `aria-selected` sur `role="button"`, combinaison non valide en ARIA que plusieurs lecteurs ignorent. D'où la sévérité ramenée à mineur. Un point que la recommandation rate : `Chip` sert aussi à du **multi-sélection** (src/components/plan/action-commitment.tsx:144-152, jours de la semaine, `toggleDay`) où `radio` serait faux ; un défaut à `radio` casserait ce cas. Mieux vaut une prop de rôle explicite (`radio` | `checkbox` | `button`) sans valeur par défaut implicite, et ajouter `checked` à `accessibilityState` comme le font déjà ModeListItem et ChoiceRow — sans quoi le rôle radio est annoncé sans état coché sur Android.


### A2-9 — Deux groupes de puces numériques identiques se suivent sans qu'un lecteur d'écran puisse les distinguer

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Sur l'étape « trajets de plus de 300 km », les intitulés « En train » et « En voiture » sont du texte simple, non rattaché aux puces qu'ils qualifient. Un lecteur d'écran énonce donc : titre, texte « En train », boutons « 0 » « 1 » … « 6+ », texte « En voiture », boutons « 0 » « 1 » … « 6+ ». Rien ne dit, une fois qu'on navigue de contrôle en contrôle, dans lequel des deux groupes on se trouve — et les deux séries sont rigoureusement identiques. Même structure sur l'étape contexte (trois groupes) et sur les jours par semaine, où les puces s'annoncent « 1 », « 2 »… hors de tout contexte. `Chip` porte pourtant déjà une prop `accessibilityLabel` prévue exactement pour ça, aujourd'hui inutilisée dans le questionnaire.

Preuves : `src/components/bilan/steps/long-trips.tsx:33` ; `src/components/bilan/steps/long-trips.tsx:50` ; `src/components/bilan/chip.tsx:19`

**Recommandation.** Passer un `accessibilityLabel` composé à chaque puce d'un groupe numérique (« 3 trajets en train », « 5 jours par semaine ») — la prop existe déjà et le libellé visible reste le chiffre.

**Contre-vérification.** Sévérité ramenée à mineur : la lecture séquentielle (mode par défaut de TalkBack) énonce bien « En train » avant le groupe, l'ambiguïté n'apparaît qu'en navigation contrôle par contrôle ou en exploration tactile. La recommandation est bonne mais incomplète : un `accessibilityLabel` par puce alourdit la lecture séquentielle (« 0 trajets en train, 1 trajet en train, … » ×14). L'alternative plus propre sur ces groupes est d'envelopper chaque série dans une `View` portant `accessibilityRole="radiogroup"` + `accessibilityLabel="Trajets longue distance en train"`, et de laisser les puces à leur chiffre — ce qui se combine naturellement avec le correctif de rôle d'A2-8 et évite d'écrire deux fois le libellé (le défaut que `TextLink` existe justement pour empêcher, cf. CLAUDE.md).


### A2-10 — Les plafonds « N+ » stockent N et sous-comptent silencieusement les plus gros émetteurs

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Les trajets longue distance s'arrêtent à « 6+ » et les vols à « 10+ », et la valeur stockée est exactement 6 ou 10. Un aller-retour hebdomadaire Paris-province en TGV (une trentaine de trajets), un commercial qui fait douze longs trajets en voiture, un voyageur à vingt vols : tous voient leur poste voyages amputé sans qu'aucun écran ne le signale. L'écart n'est pas marginal — quatre trajets voiture longue distance manquants valent ~400 kg CO₂e/an, dix vols long-courrier manquants pèsent plus lourd que le bilan complet d'un urbain sans voiture. Le questionnaire est aussi en retrait de la spec fonctionnelle, qui prévoit « 0 à 10+ » pour B3.3 et B3.4. C'est le poste sur lequel la prise de conscience a le plus à apprendre, et c'est celui qu'on tronque.

Preuves : `src/components/bilan/steps/long-trips.tsx:10` ; `src/components/bilan/steps/flights.tsx:9` ; `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:109`

**Recommandation.** Remplacer la dernière puce par une saisie libre (« plus de 6 ? indique le nombre ») ou au minimum étendre la plage des trajets longue distance à 10+ comme les vols, pour aligner sur la spec. Les colonnes n'ont pas de borne haute en base, il n'y a que l'UI à changer.

**Décision documentée concernée.** La simplification « N+ stocke N » est assumée en commentaire (src/components/bilan/steps/flights.tsx:9-11 et long-trips.tsx:12) ; la borne à 6 des trajets longue distance s'écarte en outre de la spec fonctionnelle §5 (B3.3/B3.4 : « 0 à 10+ »).

**Contre-vérification.** À scinder en deux, parce que les deux moitiés n'ont pas le même statut. (a) L'alignement de la plage longue distance sur 10+ comme les vols : pur écart à la spec, non documenté nulle part, coût = une constante, à faire. (b) Le remplacement de la dernière puce par une saisie libre : contredit la simplification assumée en commentaire et, surtout, la logique du produit — le questionnaire n'a aucune saisie libre numérique hors `commute_distance_km`, et le poste voyages est déjà calculé sur des distances forfaitaires (800 km train / 700 km voiture), donc affiner le compte au-delà de 10 raffinerait un chiffre dont l'incertitude dominante est ailleurs. La sévérité passe à mineur : la population concernée (plus de six trajets longue distance par an) est réelle mais minoritaire, et le sous-comptage joue dans le sens conservateur — un produit de prise de conscience n'a pas d'incitation à gonfler.


### A2-11 — Répondre « Rarement » aux loisirs attribue d'office 15 km en voiture, sans que le questionnaire le dise ni permette de le corriger

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort moyen

Quand `leisure_frequency = 'rarely'`, l'étape de détail est sautée et le calcul impose une distance et un mode par défaut : 15 km, voiture. Une personne qui ne possède pas de voiture et qui fait ses rares sorties à pied ou en train se voit donc attribuer ~390 km de voiture par an (≈ 55 kg CO₂e) qu'elle n'a jamais faits. Ce n'est pas un détail pour le public que le produit veut valoriser : sur un bilan sobre à 700 kg, c'est 8 % d'empreinte fantôme, et rien à l'écran ne l'explique. Le choix d'une contribution résiduelle non nulle est légitime ; le choix du *mode* voiture, invisible et non modifiable, l'est moins.

Preuves : `src/components/bilan/steps/leisure-frequency.tsx:10` ; `src/types/bilan.ts:132` ; `supabase/migrations/20260904140000_fix_flight_and_long_distance_train_factors.sql:247`

**Recommandation.** Deux options peu coûteuses : garder l'étape de détail visible en « Rarement » avec la seule question du mode (la distance restant par défaut), ou dire la règle à l'écran (« on comptera une petite base par défaut ») pour qu'elle ne soit pas une surprise dans la restitution. La seconde ne change rien au schéma.

**Décision documentée concernée.** La valeur par défaut « voiture, 15 km » vient de la spec fonctionnelle §5 (« Si B2.1 = Rarement, utiliser une distance et un mode par défaut (voiture, 15 km) ») et de docs/architecture/v1-05-bilan-v2.md §4.

**Contre-vérification.** La recommandation A (rouvrir l'étape de détail en « Rarement » pour poser le mode) contredit frontalement la spec, qui supprime explicitement la question — et elle rajoute une étape au flux le plus sensible à l'abandon, pour une valeur de 55 kg. La recommandation B (dire la règle à l'écran) ne contredit rien et mérite d'être retenue seule : elle est déjà cohérente avec ce que fait long-trips.tsx, qui affiche « distances moyennes par défaut · 800 km train, 700 km voiture » en `type="code"` — le même bandeau sur leisure-frequency, visible quand « Rarement » est coché, coûte une ligne et supprime la surprise. Ce que le constat rate : la restitution ne mentionne pas non plus cette base, alors qu'elle peut faire apparaître « voiture » comme mode dominant du poste loisirs chez quelqu'un qui n'en a pas — c'est là, plus que dans le total, que l'incohérence se voit.


### A2-12 — « Voiture (covoiturage) » pour les loisirs n'a aucun effet sur le calcul, alors que le questionnaire le propose comme un choix distinct

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort moyen

Sur l'étape loisirs, deux lignes distinctes (« Voiture (seul) » et « Voiture (covoiturage) ») écrivent exactement la même valeur `leisure_mode = 'voiture'` : il n'existe pas de `leisure_carpool_size`, et le calcul ne divise rien. Une personne qui déclare covoiturer tous ses week-ends voit donc son poste loisirs facturé au tarif solo — et, si les loisirs sont son poste dominant, elle recevra en plus une action « partager la voiture » qu'elle applique déjà. Le questionnaire pose une question dont la réponse est ignorée, ce qui est le contraire de ce qui fonde la confiance dans le chiffre.

Preuves : `src/constants/transport-modes.ts:226` ; `src/components/bilan/steps/leisure-detail.tsx:67` ; `src/types/bilan.ts:46`

**Recommandation.** Soit retirer l'entrée « Voiture (covoiturage) » de la liste loisirs (une question sans effet coûte une friction pour rien), soit ajouter `leisure_carpool_size` et la division correspondante — le poste loisirs est le poste dominant d'une partie non négligeable des bilans.

**Décision documentée concernée.** Conséquence explicitement acceptée dans src/constants/transport-modes.ts:222-224 et src/components/bilan/steps/leisure-detail.tsx:27-31, en s'appuyant sur docs/architecture/v1-05-bilan-v2.md §2 (pas de leisure_carpool_size au schéma).

**Contre-vérification.** La seconde branche de la recommandation (retirer l'entrée) ne contredit rien mais coûte plus qu'elle ne rapporte : « Voiture (seul) » sans « Voiture (covoiturage) » en face laisserait la personne qui covoiture chercher son cas ou renoncer, alors que la liste loisirs est celle où l'on veut le moins de friction. Deux points que le constat rate. (1) La conséquence la plus visible n'est pas le chiffre mais l'état de l'écran : leisure-detail.tsx:44 reconstruit `selectedKey` à `'voiture_solo'` quand `leisure_mode === 'voiture'`, donc revenir en arrière ou reprendre un brouillon **décoche** « covoiturage » au profit de « seul » — la personne voit sa réponse changer toute seule, ce qui abîme la confiance plus sûrement qu'une division manquante. (2) L'inquiétude sur l'action « partager la voiture » proposée à quelqu'un qui covoiture déjà est réelle mais tient au filtrage de `estimate_action_savings` par le contexte B4, pas à ce champ : c'est là qu'il faudrait vérifier, pas dans le questionnaire. Piste la moins chère et compatible avec le schéma : garder les deux entrées et afficher sous la puce covoiturage que le calcul compte le trajet au tarif voiture (même registre que le bandeau des distances par défaut).


### A2-14 — Le « second mode » ne sait dire que l'intermodalité, jamais l'alternance — et répartit 50/50 sans le montrer

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

La question est posée comme une combinaison au sein d'un même trajet (« Par exemple vélo puis train »), et le calcul répartit la distance annuelle à parts égales entre les deux modes. Le cas le plus fréquent en France n'est pourtant pas celui-là : c'est l'alternance (voiture trois jours, vélo deux jours, ou train l'hiver et vélo l'été). Une personne qui répond « voiture » puis « vélo » pour dire son alternance obtient une répartition 50/50 qui, selon son rythme réel, peut se tromper du simple au double sur son poste dominant. Et la règle des 50/50 n'est écrite nulle part à l'écran, alors que la page des trajets longs affiche bien ses distances par défaut.

Preuves : `src/components/bilan/steps/commute-extra.tsx:68` ; `supabase/migrations/20260904140000_fix_flight_and_long_distance_train_factors.sql:220` ; `src/components/bilan/steps/long-trips.tsx:81`

**Recommandation.** Au minimum, afficher la règle comme on affiche les distances par défaut (« on comptera moitié-moitié entre les deux modes ») : c'est une ligne, et elle rend le chiffre lisible. Mieux : demander le nombre de jours par mode plutôt qu'un partage implicite — les jours par semaine sont déjà saisis, la répartition en découlerait sans nouvelle question conceptuelle.

**Décision documentée concernée.** La répartition 50/50 vient de la spec fonctionnelle §5 (« répartir 50/50 la distance entre les deux modes, à ajuster si besoin ») et de v1-05 §4.

**Contre-vérification.** À signaler à la synthèse : le 50/50 n'est pas un oubli mais une règle écrite — docs/design/spec-fonctionnelle-*.md:130 (« répartir 50/50 la distance entre les deux modes, à ajuster si besoin »), docs/design/README.md:135 et docs/architecture/v1-05-bilan-v2.md:105. Seule la moitié « afficher la règle » est libre ; la moitié « demander les jours par mode » rouvre v1-05 §4 et change la formule (donc les valeurs attendues pgTAP). Sévérité abaissée à mineur : le cas nécessite que la personne détourne une question explicitement posée comme intermodale, et l'erreur est bornée au poste domicile-travail. Deux détails que le constat rate : la division covoiturage n'est appliquée qu'à la jambe principale (20260905130000:288-290, correctif T13), donc la répartition n'est déjà pas symétrique ; et commute_car_engine est unique pour les deux jambes (commute-extra.tsx:106-110), ce qui limite d'office la finesse d'une alternance voiture/autre.


### A2-15 — Un échec de soumission ne laisse aucune trace : l'entonnoir montre un abandon là où il y a eu une panne

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

L'entonnoir mesure `bilan_step_view` à chaque étape, et la soumission réussie se lit dans `assessments.submitted_at` — conformément à la règle « on n'instrumente jamais ce que le schéma enregistre déjà ». Mais une soumission **ratée** n'écrit rien nulle part : pas de ligne exploitable en base (ou pire, un orphelin, cf. A2-2), pas d'événement. Elle se lira exactement comme un abandon volontaire au dernier pas — le pas le plus coûteux à atteindre. C'est précisément le type de fait que `src/types/analytics.ts` déclare vouloir mesurer : « des faits qui, sans ça, ne laisseraient aucune trace ».

Preuves : `src/app/bilan/index.tsx:186` ; `src/types/analytics.ts:10` ; `src/types/analytics.ts:23`

**Recommandation.** Ajouter un événement `bilan_submit_error` (migration dans `usage_event_types` **et** entrée dans `src/types/analytics.ts`, sinon l'insert est rejeté en silence), avec pour seule propriété une catégorie d'échec venue du code — jamais le message brut, qui peut contenir des valeurs saisies.

**Contre-vérification.** Le constat se trompe sur la façon dont l'échec se lit dans l'entonnoir, et dans le sens qui aggrave : la ligne assessments est insérée AVANT les réponses, déjà en status:'completed' avec submitted_at (src/app/bilan/index.tsx:137-141). Un échec sur l'insert de assessment_answers ou sur le RPC ne se lira donc pas « abandon au dernier pas » mais « bilan soumis » — un faux positif dans le compteur de soumissions, pas un faux négatif. Seul un échec de ensureSession/de l'insert assessments lui-même passe pour un abandon. La recommandation reste bonne (avec la double écriture usage_event_types + src/types/analytics.ts, sinon insert rejeté en silence), et devrait porter une propriété d'étape d'échec (session / assessments / answers / compute) plutôt qu'une seule catégorie — c'est ce qui distingue un incident réseau d'un orphelin. Sévérité abaissée à mineur : c'est un angle mort de mesure sur un chemin rare, subordonné au correctif de l'orphelin (A2-2).


### A2-17 — Les remises à zéro des réponses dépendantes sont tenues à la main à trois endroits, et elles divergent déjà

`technique` · sévérité **mineur** · verdict **confirme** · effort moyen

Chaque écran qui change un mode réécrit sa propre liste de champs à effacer, et les trois listes ne disent pas la même chose. Répondre « Non » à B1.1 efface neuf champs mais oublie `commute_two_wheeler_type` : un bilan sans trajet domicile-travail part avec un type de deux-roues résiduel. Et changer le mode principal efface `commute_car_engine` dès que le nouveau mode n'est pas « voiture », **sans** vérifier si le second mode, lui, l'est encore — alors que la ligne juste en dessous fait exactement cette vérification pour le deux-roues. Aucune de ces divergences ne produit d'erreur : elles produisent une réponse perdue ou une donnée orpheline, silencieusement.

Preuves : `src/components/bilan/steps/commute-has-trip.tsx:41` ; `src/components/bilan/steps/commute-mode.tsx:44` ; `src/components/bilan/steps/commute-mode.tsx:47`

**Recommandation.** Sortir la normalisation dans `src/types/bilan.ts` — une fonction pure `normaliserReponses(answers)` appliquée après chaque `update`, testée avec le reste du wizard. Même raison que pour `manqueDeLEtape` : trois listes tenues en parallèle finiront de diverger, et l'écart ne se voit pas.

**Contre-vérification.** Les deux divergences n'ont pas la même conséquence, et le constat les met sur le même plan. L'oubli de commute_two_wheeler_type sur « Non » est inoffensif au calcul : le bloc domicile-travail de recompute_assessment_results est entièrement sous la garde commute_has_regular_trip, et resolve_two_wheeler_mode n'applique le type que si le mode vaut deux_roues_motorise — c'est une donnée résiduelle, pas un chiffre faux. La perte de commute_car_engine, elle, est un vrai effacement de réponse : le calcul retombe alors sur le mode générique 'voiture' (CLAUDE.md : « Moteur ou type non renseigné retombe sur le générique »), soit jusqu'à 2,1× d'écart sur cette jambe, et silencieusement. Une normalisation pure dans src/types/bilan.ts appliquée après chaque update et testée avec le reste du wizard est la bonne réponse ; elle doit aussi couvrir leisure_* et car_long_trips_engine, tenus par les mêmes ternaires ailleurs (leisure-detail.tsx, long-trips.tsx:59).


### A2-18 — « Je ne sais pas » est un aller sans retour, et l'écran promet pourtant qu'on ajustera plus tard

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le passage à la saisie par tranches est irréversible : `unknown` ne redevient jamais faux, et à chaque retour sur l'étape il est réinitialisé depuis la présence d'une tranche — donc reste vrai. Une personne qui clique par curiosité, ou qui retrouve sa distance exacte trois écrans plus loin, ne peut plus la saisir ; et un re-bilan reprenant une tranche gardera des tranches indéfiniment, alors que la précision de la distance est ce qui rend deux bilans successifs comparables. L'écran affiche pourtant, juste au-dessus des tranches : « On ajustera la précision plus tard si tu le souhaites » — une promesse que rien dans le produit ne tient.

Preuves : `src/components/bilan/steps/commute-days-distance.tsx:38` ; `src/components/bilan/steps/commute-days-distance.tsx:68` ; `src/components/bilan/steps/commute-days-distance.tsx:95`

**Recommandation.** Ajouter le lien symétrique sous la liste de tranches (« Je connais la distance exacte »), qui repasse `unknown` à faux et efface la tranche. Une dizaine de lignes, et la phrase rassurante redevient vraie.

**Contre-vérification.** Deux précisions qui affinent le constat sans le contredire. (1) L'irréversibilité n'est totale qu'une fois une tranche choisie : tant qu'aucune tranche n'est sélectionnée, quitter l'étape et y revenir ramène unknown à false — ce qui rend le bug encore plus déroutant (parfois réversible, parfois non) et confirme que le correctif doit effacer la tranche en même temps qu'il repasse unknown à false. (2) La persistance dans le temps est réelle et le constat a raison de l'invoquer : src/lib/bilan-history.ts:107 recopie commute_distance_bracket dans le préremplissage du re-bilan, donc la tranche se transmet de bilan en bilan. À noter pour la synthèse : commute_distance_bracket est listée dans CLAUDE.md parmi les colonnes nulles en base — personne n'a encore emprunté ce chemin en production, ce qui borne l'urgence sans invalider le correctif (une dizaine de lignes, plus une entrée dans la promesse de l'écran).


### A2-19 — Rien n'empêche deux soumissions simultanées du même bilan

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`submit()` est asynchrone et ne garde son verrou que dans un état React : `setSubmitting(true)` ne prend effet qu'au rendu suivant, et `nextDisabled` est évalué à partir de ce même état. Un double-clic sur « Voir mon bilan » (fréquent sur web, où le bouton ne donne aucun retour tactile) peut donc lancer deux fois la séquence complète : deux lignes `assessments`, deux jeux de réponses, deux appels à `compute_assessment_results` — donc deux générations de cycle de plan. L'historique du suivi masque le doublon (`keepLatestPerDay` déduplique par jour), ce qui rend le problème invisible à l'usage tout en laissant des données en double.

Preuves : `src/app/bilan/index.tsx:119` ; `src/app/bilan/index.tsx:129` ; `src/app/bilan/index.tsx:214`

**Recommandation.** Garder le verrou dans une `useRef` testée en tête de `submit()` (`if (enCours.current) return;`), en plus de l'état d'affichage. Le même motif protégerait la génération de plan côté serveur d'un doublon parfaitement légitime au regard des contraintes actuelles.

**Contre-vérification.** Deux nuances que le constat rate. 1) « deux générations de cycle de plan » est inexact : `generate_plan_cycle_for_user` insère avec `on conflict (user_id, period_start) do nothing` (supabase/migrations/20260824190000_plan_cycle_on_submit.sql:11 et l. 60), donc le second appel est un no-op sur `plan_cycles` — seul le bilan est dupliqué, pas le plan. 2) La fenêtre est étroite (un seul cycle de rendu, l'écran bascule ensuite sur `CalculEnCours` qui remplace tout le wizard), ce qui justifie de garder la sévérité à « mineur ». Le `useRef` en tête de `submit()` reste la bonne correction, à un coût nul ; à noter qu'il faut aussi remettre la ref à `false` dans le `finally`, sinon un échec réseau interdit toute nouvelle tentative alors que le message d'erreur invite explicitement à réessayer.


### A2-20 — Le lien « Ton mode n'est pas dans la liste ? » contourne TextLink : cible tactile minuscule et libellé annoncé différent du texte affiché

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le dépôt pose la règle « un texte cliquable passe par `TextLink`, jamais par un `Pressable` enveloppant un `ThemedText` », pour deux raisons données noir sur blanc : porter la cible de 44 px, et garantir que le libellé annoncé **soit** le texte affiché. `MissingModeLink` fait exactement l'inverse : `Pressable` nu autour d'un `ThemedText type="code"` (12 px, interligne 18) sans padding, et un `accessibilityLabel` recopié à côté du texte visible — les deux formulations ont d'ailleurs déjà divergé. C'est la seule porte de sortie offerte à quelqu'un dont le mode de transport n'existe pas dans la liste, donc celle qu'on aimerait le moins voir manquée.

Preuves : `src/components/bilan/missing-mode-link.tsx:17` ; `src/components/bilan/missing-mode-link.tsx:23` ; `src/components/text-link.tsx:56`

**Recommandation.** Remplacer par `TextLink` (`role="link"`, `type="code"`, `themeColor="textTertiary"`, `containerStyle` pour centrer) : le rendu ne bouge pas, la cible passe à 44 px et le libellé annoncé redevient le texte lui-même.

**Contre-vérification.** La migration vers `TextLink` est directe : il accepte déjà `role="link"`, `containerStyle` et les props de `ThemedText` (`type`, `themeColor`), donc `label` + `type="code"` + `themeColor="textTertiary"` + `containerStyle={{ alignItems: 'center' }}` rendent le même texte. Une précision utile : le `style` du composant actuel porte `textAlign: 'center'`, qu'il faut conserver sur le texte (`style`) et non sur le conteneur, sinon le centrage se perd sur le web. Rien d'autre dans le questionnaire ne présente ce défaut — un grep sur `Pressable` dans src/components/bilan/ ne remonte que les composants de choix (Chip, ModeListItem), qui portent bien leurs attributs.


### A2-21 — Le bouton « Retour » du premier pas est inerte au premier lancement

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`StepShell` documente que l'absence de `onBack` signifie « premier pas du questionnaire, pas de bouton Retour » — mais l'écran passe toujours `handleBack`, donc le bouton est toujours rendu. Au premier pas, `previousStep` renvoie `null` et on appelle `router.back()`. Or l'onboarding entre dans le questionnaire par `dismissAll()` puis `replace('/bilan')`, précisément pour ne rien laisser derrière : au premier lancement, la pile est vide et le bouton ne fait rien (sur web, il peut au contraire faire quitter le site). Un bouton visible qui ne répond pas est, à ce moment du parcours, le premier signal que l'app donne.

Preuves : `src/components/bilan/step-shell.tsx:13` ; `src/app/bilan/index.tsx:110` ; `src/components/onboarding/etape-transition.tsx:70`

**Recommandation.** Ne passer `onBack` que si `previousStep(...) !== null || router.canGoBack()` — le contrat déjà écrit dans `StepShell` devient alors vrai, et le premier pas n'affiche plus de bouton mort.

**Contre-vérification.** Le constat rate que le bouton est légitime dans les autres entrées : `/bilan` est atteint par `router.push` depuis `(tabs)/suivi/index.tsx` (l. 119, 286, 302), `(tabs)/suivi/bilan.tsx` (l. 448) et `(tabs)/plan.tsx` (l. 305, 531) — là le retour fonctionne et doit rester. La condition proposée (`previousStep(...) !== null || router.canGoBack()`) est donc la bonne forme, mais elle doit être évaluée au rendu et pas mémoïsée : `router.canGoBack()` n'est pas réactif. Attention aussi à ne pas « corriger » en interceptant le retour matériel Android, ce que v1-11 §8 interdit explicitement.


### A2-22 — `distanceBracketMidpointKm` n'est appelé par aucun code du produit et duplique un mapping qui vit en SQL

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La fonction n'est importée que par son propre test : le calcul du milieu de tranche se fait entièrement côté base, réécrit à l'identique dans chaque version de `recompute_assessment_results`. Elle est donc à la fois du code mort et une seconde source de vérité pour une valeur qui décide d'un chiffre affiché — exactement le motif que le dépôt combat ailleurs (`manqueDeLEtape`/`isStepComplete`, la table de vérité des rappels épinglée des deux côtés). Le jour où une tranche bougera en base, ce fichier et ses cinq assertions continueront de passer.

Preuves : `src/types/bilan.ts:237` ; `src/types/bilan.test.ts:296` ; `supabase/migrations/20260904140000_fix_flight_and_long_distance_train_factors.sql:203`

**Recommandation.** Soit la supprimer avec son test, soit lui donner un usage qui la justifie — afficher à l'écran la distance retenue quand la personne répond par tranche (« on comptera environ 10 km ») rendrait la règle visible et transformerait ce doublon en information utile. Dans les deux cas, ne pas la laisser dormir.

**Contre-vérification.** Deux compléments. D'abord la divergence potentielle est plus large que dite : la fonction front n'est typée que sur `DistanceBracket` (5 tranches, domicile-travail), alors que le questionnaire porte aussi `LeisureDistanceBracket` (4 tranches, src/types/bilan.ts:7) dont le milieu est calculé lui aussi en SQL — donc même en la « réveillant » pour l'afficher, elle ne couvrirait qu'un des deux cas. Ensuite, la piste d'affichage (« on comptera environ 10 km ») mérite d'être arbitrée côté produit avant d'être codée : elle ajoute un chiffre sur une étape où la personne vient justement de dire qu'elle ne sait pas, ce qui peut se lire comme une contradiction de la réassurance. La suppression pure et simple, avec son bloc de test, est la correction sans risque.


### A2-23 — Le passage d'une étape à l'autre n'est annoncé à personne

`technique` · sévérité **mineur** · verdict **confirme** · effort moyen

Le changement d'étape remplace le contenu de la `ScrollView` sans que rien ne bouge autour : l'en-tête, le pied et le bouton « Suivant » restent montés, et aucun mécanisme d'annonce n'existe dans le questionnaire — la seule région vivante du dépôt est celle du message d'échec (`MessageInline`). Pour qui utilise un lecteur d'écran, appuyer sur « Suivant » ne produit donc aucun retour : ni la nouvelle question, ni la progression « Étape N sur M » ne sont énoncées, et le focus reste sur un bouton dont le libellé n'a pas changé. Sur un parcours de neuf étapes, c'est le mécanisme central du flux qui devient muet.

Preuves : `src/app/bilan/index.tsx:219` ; `src/components/bilan/step-shell.tsx:58` ; `src/components/message-inline.tsx:38`

**Recommandation.** Déplacer le focus sur le titre de la nouvelle étape à chaque changement (le titre porte déjà le rôle `header` via `ThemedText type="screenTitle"`), ou faire de la ligne « Étape N sur M » une région vivante polie. À vérifier sur appareil, comme les autres points d'accessibilité de v1-11 §8.

**Contre-vérification.** La recommandation est incomplète sur un point que le dépôt documente déjà : `accessibilityLiveRegion` ne couvre qu'Android et `role="alert"` que le web (commentaire de message-inline.tsx, l. 16-17) — sur iOS, aucun des deux ne dit quoi que ce soit, il faut `AccessibilityInfo.announceForAccessibility` ou un déplacement de focus explicite (`setAccessibilityFocus` sur le titre). Faire de « Étape N sur M » une région vivante a aussi un effet de bord : elle changerait aussi quand le nombre total bouge (les pas sont conditionnels, `visibleSteps` recalcule `total` à chaque réponse), donc annoncer plutôt le titre de la nouvelle étape. Comme les autres points d'accessibilité, à vérifier sur appareil (v1-11 §8).


### A2-24 — Neuf étapes sans un mot de réassurance : la promesse « pas de jugement, réponses approximatives acceptées » s'arrête à la porte du questionnaire

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

La spec fonctionnelle place la réassurance sur l'écran de transition (« pas de jugement, réponses approximatives acceptées »), et l'onboarding la tient. Mais une fois dans le questionnaire, le seul endroit qui redit qu'une approximation suffit est la branche « Je ne sais pas » de la distance. Les étapes qui demandent le plus de mémoire et sur lesquelles on se sent le plus jugé — le nombre de vols, les trajets longue distance — n'en portent aucune, et Ramille, qui accompagne partout ailleurs dans le produit, est ici muette : elle n'apparaît que comme un visage statique dans l'en-tête, et ne reprend la parole qu'à l'écran de calcul. C'est le passage le plus long et le plus aride du produit, et celui où l'on perd les gens.

Preuves : `src/components/bilan/steps/commute-days-distance.tsx:68` ; `src/components/bilan/progress-header.tsx:13` ; `src/constants/mascotte.ts:38`

**Recommandation.** Une phrase de Ramille, ajoutée dans `src/constants/mascotte.ts` et rendue par `RamilleDit` à l'entrée de chaque section (quatre au total, pas neuf), dirait l'approximation sans jamais commenter un chiffre — ce que ses trois règles autorisent. À l'inverse, rien ne justifie de toucher au caractère statique de la mascotte dans l'en-tête, qui est une décision documentée.

**Décision documentée concernée.** Touche au périmètre de la décision de src/components/bilan/progress-header.tsx:13-18 (mascotte statique dans l'en-tête, `happy` seulement à la dernière étape) — la proposition ne vise pas l'en-tête mais l'ajout d'une voix dans le corps des étapes ; l'arbitrage reste produit.

**Contre-vérification.** Le constat qualifie bien lui-même la tension avec la décision de progress-header.tsx (mascotte statique) et ne la contredit pas — la proposition vise le corps des étapes. Trois réserves à passer à la synthèse. 1) Le motif invoqué pour la mascotte statique (« une animation dans un élément permanent devient du bruit au deuxième écran ») vaut aussi pour une bulle répétée à quatre reprises : le risque est de transformer la réassurance en meuble. 2) Une phrase de Ramille reste compatible avec ses trois règles (src/constants/mascotte.ts:12-19) tant qu'elle ne porte aucun nombre — mais l'étape « vols » et l'étape « trajets longue distance » affichent précisément des comptes, et CLAUDE.md pose que « la mascotte n'apparaît jamais à côté d'un chiffre lourd » : le placement doit être au-dessus de la question, pas à côté du récapitulatif « N vols long-courrier seront comptés ». 3) Une alternative moins coûteuse et sans nouvelle surface de voix : réutiliser le bandeau `notice` déjà porté par `StepShell` (aujourd'hui utilisé pour le préremplissage) pour une ligne de réassurance sur les deux étapes voyages. Arbitrage produit dans tous les cas.


## A3 — restitution du bilan, palier, partage

**Résumé du lecteur.** La restitution est l'écran le plus soigné du produit sur le plan du ton : la comparaison à la moyenne y est devenue un fait plutôt qu'un score, le palier remplace un gouffre par une marche, et chaque formulation porte la trace d'une décision datée. La décision dominante est bien plus saillante que le total, comme la spec le demande. Les fragilités sont ailleurs, et elles sont de deux ordres. D'abord une chaîne de chiffres qui se déforme aux bords : tout est affiché en tonnes à une décimale, si bien qu'un profil sobre lit « Une marche à 0,0 t CO₂e de moins sur l'année » ; le cap qui fonde le palier porte en réalité sur le poste dominant et non sur le total, ce qui contredit la justification écrite dans `palier.ts` et qu'un test valide avec des entrées fabriquées ; et en relecture d'un bilan ancien, le palier mélange un cap d'aujourd'hui avec un total d'hier. Ensuite, un défaut de filet : toute la voix de l'écran (prépositions de mode, phrases du palier, phrase de comparaison) vit dans le composant, donc hors de portée des tests — c'est ce qui a laissé les quatre deux-roues motorisés disparaître du titre du poste dominant, et « celui du haut » désigner une ligne qui n'est pas la bonne. Côté partage, les deux Vercel Functions ne sont typecheckées par aucun job de CI alors que leur seule boucle de retour est la production, la page de destination est indexable telle quelle, et sur les navigateurs sans Web Share le bouton ne fait rien tout en comptant un partage. Enfin, deux promesses de la feuille de route restent ouvertes sur cet écran précis : `mobility_constrained` n'est lu nulle part, donc la moyenne française est encore montrée à ceux qui n'ont aucune alternative, et le chiffre reste sans équivalence concrète.

**Points forts à ne pas casser**

- `src/types/palier.ts` est un modèle du genre : logique pure, sortie du composant, testée sur les cas qui comptent (déjà sous le repère, palier qui tombe pile sur la cible, cap absent, empreinte nulle), et surtout documentée par ce qu'elle **refuse** — trajectoire linéaire et marches absolues, écartées sur des données réelles. Le drapeau `beyondTarget2050`, qui fait basculer la phrase en registre de contribution plutôt qu'en exigence, est exactement le genre de nuance qu'un refactor pressé effacerait. Ne pas le simplifier.
- Le traitement du ton sur la comparaison à la moyenne : la phrase ne rend jamais un pourcentage-score (« tu es à 150 % de… »), elle nomme un fait et ouvre sur la suite ; le nombre de paliers restants n'est affiché nulle part ; « Refaire mon bilan » a remplacé une promesse d'édition qu'aucun code ne tenait. Trois décisions datées et argumentées à ne pas rouvrir.
- `src/constants/carbon-reference.ts` et son test : une seule source statistique (SDES), un total *défini* comme la somme de ses postes, et la dérivation du repère 2050 signalée comme telle jusque dans le libellé affiché (« Repère » et non « Objectif »). C'est ce qui empêche la restitution et l'onboarding de se contredire, et le test épingle l'invariant.
- La séparation `dominantHeadline` (2ᵉ personne, à l'écran) / `dominantShareLabel` (neutre, pour les destinataires du lien) : deux textes qui se ressemblent mais ne s'adressent pas à la même personne, avec la raison écrite au-dessus de chacun. La tentation de les fusionner reviendra ; elle est fausse.
- Le partage ne lit rien côté serveur et ne transporte aucun identifiant : les seules données qui circulent sont les trois chiffres déjà à l'écran, dans l'URL, choisis par la personne. Aucune table, aucune policy, aucune traçabilité d'un lien vers un compte — c'est ce qui rend le levier de croissance compatible avec le refus de la comparaison entre utilisateurs.
- La redirection `/bilan/resultat` → `/suivi/bilan` conservée après le déplacement de l'écran (v1-11), pour les liens déjà partagés et les favoris — avec l'alias documenté dans `page-titles.ts` et son test. C'est la bonne réaction à un déplacement de fichier sur la destination d'une boucle de partage.
- Le garde `hasEmissions` et l'état de félicitation pour un profil quasi nul (défaut T8) : le produit a un chemin pour dire « c'est rare, et c'est une bonne nouvelle » au lieu d'un « NaN % ». Le contenu de ce chemin mérite d'être corrigé (A3-1, A3-13, A3-14), l'intention est juste.

### A3-1 — Tout est affiché en tonnes à une décimale : sous ~100 kg, la restitution affiche « 0,0 t CO₂e »

`technique` · sévérité **important** · verdict **confirme** · effort petit

`formatTonnes` n'a qu'une unité et une décimale. Elle sert au total, aux trois lignes de la répartition par poste, et surtout à la phrase du palier. Conséquences vérifiables sur les données réelles décrites en v1-07 §3.4 (13 bilans de 15,82 t à 0,06 t) : un bilan à 60 kg voit un cap de ~12 kg, et la phrase rendue est « Une marche à 0,0 t CO₂e de moins sur l'année. Le plan qui suit propose de quoi la franchir. » De même, un poste à 40 kg s'affiche « 0,0 t CO₂e » à côté d'une barre remplie à 3 %. C'est exactement le profil sobre que le produit veut encourager qui reçoit un écran vide de sens — et le même chiffre est affiché en kilos sur `/plan` (« − 12 kg »), ce qui donne deux unités pour une seule valeur à un onglet d'écart.

Preuves : `src/lib/format.ts:3` ; `src/app/(tabs)/suivi/bilan.tsx:117` ; `src/app/(tabs)/suivi/bilan.tsx:362` ; `src/app/(tabs)/plan.tsx:445`

**Recommandation.** Donner à `formatTonnes` un seuil de bascule : en dessous de ~1 t, afficher des kilos arrondis (« 12 kg CO₂e »), au-dessus des tonnes à une décimale. Le tester dans `src/lib/format.test.ts` (aujourd'hui inexistant) sur 12 / 60 / 940 / 1330 / 15820 kg. Le gain secondaire est d'aligner la restitution sur `/plan`, qui affiche déjà le même cap en kilos.

**Contre-vérification.** Deux précisions : (a) l'exemple « un bilan à 60 kg affiche 0,0 t » est inexact — 0,06 arrondit à « 0,1 t » ; c'est la marche (12 kg) et les postes secondaires (< 50 kg) qui tombent à 0,0. (b) La portée est plus large que la restitution : `formatTonnes` sert aussi la liste de l'historique (src/app/(tabs)/suivi/index.tsx:192 et son accessibilityLabel:175 — tout un historique sobre se lit « 0,0 t »), la baseline du plan (plan.tsx:449) et la proposition de connexion (src/app/connexion/index.tsx:111). Corriger la fonction règle donc les cinq écrans d'un coup. Attention en la modifiant : `formatTonnesShort` (src/constants/carbon-reference.ts:103) prend des tonnes, pas des kg, et les barres « Toi / palier / moyenne / repère » doivent rester dans une même unité pour rester comparables — ne basculer en kilos que les valeurs isolées (postes, total, marche), pas l'échelle de comparaison.


### A3-2 — Le palier n'est pas « le même effort relatif pour tout le monde » : le cap porte sur le poste dominant, pas sur le total

`technique` · sévérité **important** · verdict **confirme** · effort moyen

Toute la justification du palier (palier.ts §« Pourquoi le palier est un pourcentage de soi » et v1-07 §3.4) repose sur l'idée que le cap de la saison est un pourcentage de l'empreinte, donc un effort relatif identique quel que soit le point de départ. Or `plan_cycles.baseline_co2_kg_year` reçoit `dominant_poste_co2_kg_year`, pas le total — c'est même une décision assumée côté plan (« en part du poste dominant et non du total », v1-07 §3.3). L'écran calcule pourtant `capKg = baseline × 20 %` puis le retranche du **total**. Résultat : quelqu'un dont le poste dominant pèse 90 % de son empreinte se voit proposer −18 % du total, quelqu'un à 34 % se voit proposer −6,8 % — c'est-à-dire précisément la propriété (« le pas dépend du profil ») pour laquelle la trajectoire linéaire avait été écartée. Le test unitaire ne l'attrape pas parce qu'il fabrique lui-même un cap égal à 20 % du total, une entrée que le câblage réel ne produit jamais.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:198` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:705` ; `src/types/palier.test.ts:21` ; `src/types/palier.ts:21`

**Recommandation.** Trancher explicitement : soit le palier reste adossé au cap du poste dominant, et alors corriger le commentaire de `palier.ts`, la §3.4 de v1-07 et le test (qui doit alimenter `nextPalier` avec un cap réaliste : 20 % d'un poste dominant, pas 20 % du total) ; soit on veut vraiment un effort relatif constant, et il faut alors lire aussi `dominant_poste_co2_kg_year` et normaliser. Dans les deux cas, ajouter un test qui part des mêmes entrées que la base (baseline = poste dominant).

**Contre-vérification.** Ce n'est pas un `contredit_decision` : la décision documentée (v1-07 §3.3) porte sur le cap du **plan**, et §3.4 sur le palier de la restitution — les deux textes sont incohérents entre eux, c'est précisément le défaut. Ce que le constat rate : l'effet est asymétrique et pénalise le profil que le produit veut encourager — plus l'empreinte est diversifiée (donc souvent plus sobre), plus la marche proposée est petite en part du total, ce qui est le reproche exact fait à la trajectoire linéaire. Recommandation la plus économique et cohérente avec le reste : garder la baseline poste-dominant (ne pas toucher au SQL, `/plan` en dépend), corriger le commentaire de palier.ts et v1-07 §3.4, et réécrire le test avec des entrées réalistes (cap = 20 % d'un poste dominant valant 34 % puis 90 % du total).


### A3-4 — « Partager mon bilan » ne fait rien du tout sur les navigateurs sans Web Share, et l'événement est compté quand même

`technique` · sévérité **important** · verdict **confirme** · effort petit

`Share.share` de react-native-web rejette avec « Share is not supported in this browser » dès que `window.navigator.share` est absent (Firefox partout, Chrome desktop hors Windows/ChromeOS). L'écran avale le rejet dans un `.catch(() => {})` : l'utilisateur appuie, rien ne se passe, aucun message, aucune copie de lien de repli. Et `track('resultat_share')` est émis **avant** l'appel, donc la mesure du seul levier de croissance du produit compte des partages qui n'ont pas eu lieu — le « chiffre plausible et faux » que le repo combat ailleurs (useTrackFocus vs useTrackView).

Preuves : `src/app/(tabs)/suivi/bilan.tsx:249` ; `src/app/(tabs)/suivi/bilan.tsx:433` ; `node_modules/react-native-web/dist/exports/Share/index.js:28`

**Recommandation.** Faire de `shareResult` une fonction asynchrone qui retombe sur `navigator.clipboard.writeText(shareUrl)` + un état inline « Lien copié » quand le partage natif n'est pas disponible (pas d'`Alert`, banni par l'eslint du repo), et n'émettre `resultat_share` qu'après une issue réussie (`result.action === 'sharedAction'` sur natif, copie effectuée sur web).

**Contre-vérification.** Le constat sous-estime un point et en rate un autre : sur **natif** aussi la mesure est fausse (annulation comptée comme partage), ce qui est le cas majoritaire puisque la V1 vise Google Play ; et `Share.share` peut aussi rejeter sur `AbortError` avec Web Share présent. La recommandation est bonne ; ajouter que le repli presse-papier doit rester dans un état inline (Alert.alert est proscrit sur web, cf. CLAUDE.md) et que `resultat_share` doit rester déclaré dans `public.usage_event_types` et `src/types/analytics.ts` — aucun nouvel événement n'est nécessaire ici, seul le moment d'émission change.


### A3-6 — Les quatre deux-roues motorisés manquent à MODE_PREPOSITION : le mode disparaît du titre du poste dominant

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

La table de prépositions n'a jamais été mise à jour après la migration `20260905200000`, qui a introduit `deux_roues_scooter_thermique`, `deux_roues_scooter_electrique`, `deux_roues_moto_petite` et `deux_roues_moto_grosse` — et ces identifiants peuvent bien être `dominant_poste_mode`, puisque `recompute_assessment_results` passe désormais par `resolve_mode`. Le repli n'est pas celui que le commentaire annonce : `POSTE_SUBJECT` répond d'abord, donc la phrase rend « Ton trajet domicile-travail » tout court, le mode est simplement **perdu** — exactement le défaut que cette table existe pour éviter (« Tes voyages seul ne dit pas de quoi il s'agit »). Même perte sur la carte de partage via `dominantShareLabel`. Et c'est le cas où nommer le mode compte le plus : une grosse moto émet 0,2147 kg/km, une fois et demie une voiture thermique — le motard qui découvre son bilan ne voit nulle part que c'est sa moto qui pèse.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:53` ; `src/app/(tabs)/suivi/bilan.tsx:78` ; `supabase/migrations/20260905200000_cylindree_deux_roues.sql:43`

**Recommandation.** Ajouter les quatre entrées (« en scooter thermique », « en scooter électrique », « en moto de petite cylindrée », « en moto de grosse cylindrée »), et déplacer `MODE_PREPOSITION` + `dominantHeadline` + `dominantShareLabel` dans `src/types/resultat.ts` avec un test qui parcourt la liste des `transport_modes` du seed et échoue sur tout mode sans préposition — même mécanique de garde que `emission_factor_sources` et `usage_event_types`.

**Contre-vérification.** Le constat rate que le libellé serveur, lui, est correct (`Trajet domicile-travail (Moto de grosse cylindrée)`, 20260905130000:392-397) : l'information existe en base et n'est perdue qu'à l'affichage, ce qui rend le correctif purement front. Le garde proposé (test parcourant les `transport_modes` du seed) est réalisable mais le seed est en SQL : plus simple et suffisant, adosser le test à la liste des identifiants déjà typée côté client et à `MODE_PREPOSITION` déplacé dans `src/types/resultat.ts` — module pur, testable, sans import de `@/lib/supabase` (contrainte Jest du repo). Vérifier aussi les autres surfaces qui nomment un mode (les libellés de check-in snapshotés côté serveur, eux, ne sont pas concernés).


### A3-7 — `mobility_constrained` n'est lu par aucun écran : la moyenne française est affichée aux profils sans alternative

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

La colonne est calculée et figée à chaque bilan (`tc_access = 'inexistant'` ou rural + desserte limitée), et v1-07 §3.3 annonce noir sur blanc qu'elle « portera le même constat pour la restitution, où elle servira à retirer la comparaison à la moyenne nationale ». Aucun `.tsx` ne la lit. La barre « Moyenne en France » est donc affichée à tout le monde, y compris à quelqu'un qui vient de déclarer qu'il n'a aucun transport en commun — et pour qui l'écart à la moyenne n'est pas un fait actionnable mais un constat d'infériorité subi. C'est le point de ton n°1 de l'audit (§3.5), à moitié traité : la phrase a été reformulée, la barre est restée.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:402` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:365` ; `docs/architecture/v1-07-audit-facteurs-et-suivi.md:465`

**Recommandation.** Quand `mobility_constrained` est vrai, retirer la barre « Moyenne en France » (garder « Toi », le palier et, le cas échéant, le repère 2050) et ajuster le domaine des barres en conséquence. Dériver la règle dans `src/types/resultat.ts` (`montreMoyenneFrancaise(results)`) et la tester, plutôt que de la laisser en condition JSX.

**Contre-vérification.** Trois points que le constat ne dit pas et qui rendent le correctif facile : (1) `AssessmentResults` est le type `Row` de la table (`bilan.tsx:31`) et la requête fait `select('*')` (l.~173) — `mobility_constrained` est déjà chargé, aucun changement de requête. (2) Il ne suffit pas de retirer la barre : `comparisonNote(totalT)` (l.101-108) cite explicitement « La moyenne française est de X » dans sa branche haute et « Tu es en dessous de la moyenne française » dans la branche médiane — la comparaison survivrait en toutes lettres. Les deux branches doivent être traitées avec la barre. (3) `domain = Math.max(totalT, FRANCE_AVERAGE_TRANSPORT_T) / 0.85` : sans la moyenne, le domaine doit se rabattre sur `max(totalT, palier, repère)`, sinon la barre « Toi » reste écrasée par un repère invisible. Attention aussi : `mobility_constrained` est `boolean | null` (bilans antérieurs à la migration) — `=== true` et non truthiness inversée.


### A3-11 — Les deux Vercel Functions du partage ne sont jamais typecheckées ni vérifiées en CI

`technique` · sévérité **important** · verdict **confirme** · effort petit

`api/**` est explicitement exclu du tsconfig racine, et la CI ne lance que `npx tsc --noEmit` sur celui-ci : `api/tsconfig.json` n'est invoqué par aucun job. Aucun test, aucune vérification d'export ne touche non plus ces deux fichiers. C'est le seul code du dépôt dont la boucle de retour est un déploiement en production — et v1-06 §3 documente cinq bugs empilés, tous silencieux (`FUNCTION_INVOCATION_FAILED` générique), qu'il a fallu des logs runtime Vercel et un token personnel pour diagnostiquer. Une régression de type sur `satori`, `Buffer` ou la signature `GET` repasserait exactement par le même chemin.

Preuves : `tsconfig.json:22` ; `.github/workflows/ci.yml:25` ; `api/tsconfig.json:12`

**Recommandation.** Ajouter `npx tsc -p api --noEmit` au job « Typecheck & lint ». Et, tant qu'à faire, un test node minimal qui importe le handler Edge de `api/partage.ts` et vérifie sur trois URL (nominale, paramètres absents, paramètres hostiles) que la réponse est un 200 HTML échappé — c'est du pur calcul de chaîne, testable sans Vercel.

**Contre-vérification.** Deux nuances. (1) Le lint, lui, couvre bien `api/` : `eslint.config.js` n'ignore que `dist/*`, et la règle `no-restricted-imports` est restreinte à `src/**` mais la config Expo de base s'applique à tout. Ce n'est donc pas « aucune vérification », c'est « aucune vérification de types ». (2) `npx tsc -p api --noEmit` échouera probablement du premier coup sur `api/share-card.tsx` : le fichier est en JSX pour `satori` et le tsconfig déclare `jsx: react-jsx` sans dépendance React typée côté `api/` — prévoir soit un `jsxImportSource` explicite, soit `skipLibCheck` déjà présent plus un `types` complété. Sur le test suggéré : `api/partage.ts` exporte un `export default function handler` (l.33) — c'est correct pour le runtime Edge, la règle « export nommé GET/POST » de CLAUDE.md ne vise que le runtime Node.js (`api/share-card.tsx`) ; un test qui « corrigerait » cet export casserait le partage. Le test le plus rentable n'est d'ailleurs pas le 200 mais l'échappement : vérifier qu'un `poste` contenant `"><script>` ressort échappé dans le `<title>` et dans `og:title`.


### A3-19 — Le chiffre reste abstrait : aucune équivalence concrète, alors que l'audit l'avait identifié comme un manque de prise de conscience

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

v1-07 §3.5 pose deux points de ton ; le premier (la comparaison-jugement) a été traité, le second — « 2,9 t reste abstrait. Des équivalences concrètes rendent le chiffre saisissable — l'API Impact CO2 expose un endpoint dédié à cet usage » — n'a jamais été construit : aucune occurrence d'équivalence dans tout `src/`. La restitution ne propose donc, pour rendre le chiffre saisissable, que trois barres et un pourcentage. Sur l'écran que la spec §2 désigne comme le moment de prise de conscience, et dont le polish est la priorité n°1 de la spec §7, c'est le levier le moins cher qui reste ouvert.

Preuves : `docs/architecture/v1-07-audit-facteurs-et-suivi.md:612` ; `src/app/(tabs)/suivi/bilan.tsx:371` ; `src/constants/carbon-reference.ts:34`

**Recommandation.** Une seule équivalence, sous le total, dérivée d'une constante sourcée dans `carbon-reference.ts` (pas d'appel réseau à l'affichage : une ou deux valeurs figées suffisent, et le produit a déjà la discipline « une source citée par valeur »). La choisir non culpabilisante et non alimentaire (un aller-retour Paris–New York en avion parle sans juger ; « X steaks » désigne un coupable).

**Contre-vérification.** Deux éléments que le constat rate. (1) Le tableau d'exécution de `v1-07` §4 marque l'étape 3 « T5, T6, T8, §3.5 — **fait** » : §3.5 est donc réputé traité alors que seul son premier point l'a été. Le correctif le moins cher n'est pas seulement d'ajouter l'équivalence, c'est de rouvrir explicitement cette demi-ligne, sinon le manque restera invisible au prochain audit. (2) Le canvas de l'increment concerné contient déjà la formulation retenue, et elle n'est pas accrochée au total mais à la marche : `docs/design/v1-07-suivi-plan-trajectoire/Trajectoire.dc.html:77` — « L'équivalent d'un aller-retour Paris–Marseille en train plutôt qu'en avion », sous « Ta marche pour cette année ». C'est un meilleur emplacement que sous le total : une équivalence sur un gain (−0,3 t) est actionnable et non culpabilisante, une équivalence sur 4,2 t reste un verdict. La recommandation « constante sourcée dans carbon-reference.ts, pas d'appel réseau » est en revanche exactement dans la discipline du fichier (une source citée par valeur, `CARBON_SOURCE_LABEL`).


### A3-3 — En relecture d'un ancien bilan, le palier est calculé avec le cap du cycle courant

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La requête sur `plan_cycles` ne filtre rien : elle prend le cycle le plus récent, quel que soit le bilan affiché. `/suivi/bilan?id=` étant aussi l'écran de relecture d'un bilan passé (v1-11 §1), ouvrir un bilan d'il y a six mois affiche « Ton prochain palier » calculé en retranchant le cap issu du **dernier** bilan à un total **ancien**. Les deux chiffres ne décrivent pas la même personne au même moment, et le palier affiché n'a jamais existé. C'est d'autant plus visible que le produit vise la durée : plus l'historique s'allonge, plus l'écran de relecture ment.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:190` ; `src/app/(tabs)/suivi/bilan.tsx:187` ; `src/app/(tabs)/suivi/bilan.tsx:163`

**Recommandation.** Ne charger le cycle (et donc n'afficher le palier) que lorsque `mode === 'nouveau'`, ou borner la requête au cycle contemporain du bilan (`period_start <= assessments.submitted_at` du bilan visé). En relecture, la marche actionnable n'a de toute façon pas de sens : c'est un instantané, pas une proposition.

**Contre-vérification.** Le cas ne se produit qu'après un re-bilan (le cycle est reconstruit à chaque soumission, 20260905130000:694-712), donc pour un utilisateur qui a au moins deux bilans et rouvre l'ancien depuis /suivi — réel mais moins fréquent que ne le suggère le constat. La recommandation « n'afficher le palier que si `mode === 'nouveau'` » est la bonne et la moins chère (une ligne), et elle est plus juste que le bornage par `period_start <= submitted_at` : en relecture, `capKg` sert aussi de garde à `nextPalier`, donc ne pas charger le cycle supprime proprement la barre et la phrase. À noter : le libellé de la carte du plan (« Ton cap pour cette période ») reste, lui, correct puisque /plan affiche toujours le cycle courant.


### A3-5 — L'écran d'erreur affiche le message brut de PostgREST, en anglais, et n'offre ni reprise ni sortie

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

En cas d'échec de lecture, l'écran rend `error.message` tel quel. Les cas réels ne sont pas théoriques : un bilan dont l'insertion des réponses ou le calcul a échoué après l'insert d'`assessments` (le wizard ne nettoie pas la ligne orpheline) donne zéro ligne dans `assessment_results`, donc PGRST116 « JSON object requested, multiple (or no) rows returned » ; hors ligne, c'est « Network request failed » ; un `?id=` manipulé ou répété (`useLocalSearchParams` rend alors un tableau là où le type annonce `string`) donne une erreur de syntaxe UUID. Dans tous les cas la personne voit une phrase technique anglaise, centrée sur un écran nu — sans `BandeHaute`, sans bouton réessayer, sans lien vers le suivi, et sur web sans aucune sortie autre que le bouton du navigateur. C'est l'écran d'aboutissement du questionnaire.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:183` ; `src/app/(tabs)/suivi/bilan.tsx:265` ; `src/app/bilan/index.tsx:135`

**Recommandation.** Ne jamais afficher `error.message` : une phrase française fixe (« Ce bilan n'a pas pu être ouvert. »), un bouton « Réessayer » qui relance l'effet, et un lien « Revenir à mon suivi ». Garder `BandeHaute` sur l'état d'erreur comme sur l'état nominal. Le message technique peut partir en `console.warn` sous `__DEV__`.

**Contre-vérification.** Deux affirmations du constat sont fausses et abaissent la sévérité. (1) « sur web sans aucune sortie autre que le bouton du navigateur » : l'écran vit dans la pile de l'onglet Suivi (src/app/(tabs)/suivi/_layout.tsx, et src/app/(tabs)/_layout.tsx), la barre à deux onglets reste rendue au-dessus de cet état — il y a une sortie. (2) Le scénario du bilan orphelin est peu praticable : en cas d'échec après l'insert d'`assessments` (src/app/bilan/index.tsx:135-176), le catch garde la personne sur la dernière étape du questionnaire et ne navigue jamais vers le résultat, et `loadAssessmentHistory` (src/lib/bilan-history.ts:29-36) écarte explicitement les bilans sans `assessment_results` — l'orphelin n'est donc pas ouvrable depuis /suivi. Reste le cas réel et fréquent : hors ligne, message technique anglais sans reprise. La recommandation (phrase française fixe + « Réessayer » + BandeHaute) est juste et petite.


### A3-8 — Les pages de partage sont indexables : des empreintes individuelles peuvent finir dans Google, sous le domaine du produit

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`/api/partage` sert une page HTML complète, titrée avec le chiffre de la personne, sans `<meta name="robots" content="noindex">`, sans `<link rel="canonical">`, et il n'existe aucun `public/robots.txt` dans le dépôt. Un lien posté sur un forum, un réseau social ou une page publique suffit à ce que le crawler indexe « 4,2 t CO₂e par an — mon empreinte transport » sur `ramille.fr`. Deux dégâts : des pages personnelles dans les résultats de recherche du produit, et la dilution des deux seules surfaces publiques voulues (pages légales, cf. CLAUDE.md). Le produit refuse par ailleurs toute comparaison entre utilisateurs — une collection de pages d'empreintes indexées en fabrique une par accident.

Preuves : `api/partage.ts:59` ; `api/partage.ts:112` ; `vercel.json:3`

**Recommandation.** Ajouter `<meta name="robots" content="noindex, nofollow">` et l'en-tête `X-Robots-Tag: noindex` sur la réponse de `/api/partage` (les balises Open Graph restent lues par les apps de messagerie, qui ne sont pas des crawlers d'indexation), et poser un `public/robots.txt` qui interdise `/api/`. Ajouter la vérification au script d'export au même titre que `cleanUrls` et les titres.

**Contre-vérification.** Deux corrections au constat, qui font baisser la sévérité sans invalider le correctif. (1) Les paramètres d'URL ne portent **aucune donnée identifiante** : `total`, `poste`, `percent` — pas d'`assessment_id`, pas d'email, pas d'user_id (l.35-38), et l'utilisateur a explicitement choisi de les diffuser. Le risque n'est pas la fuite de données personnelles mais la pollution SEO du domaine et l'effet « catalogue d'empreintes » ; c'est du soin, pas une fuite. (2) La recommandation « ajouter la vérification au script d'export » ne s'applique pas telle quelle : `api/` est hors de l'export statique Expo (cf. CLAUDE.md, dossier `/api` détecté par la plateforme, `vercel.json` ne régit que `dist/`) — `scripts/verifier-*-export.mjs` ne verra jamais `/api/partage`. En revanche un `public/robots.txt` **est** recopié dans l'export (même mécanique que `public/.well-known/assetlinks.json`), et c'est ce fichier-là qu'un script de garde peut vérifier. Penser aussi à `api/share-card.ts` (l'image), qui mérite le même `X-Robots-Tag: noindex`.


### A3-9 — En relecture, la phrase du palier promet « le plan qui suit » alors que rien ne suit

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

`palierNote` est rendue dans les deux modes, mais le bouton « Voir ce que je peux faire » n'existe qu'en `nouveau`. Quelqu'un qui rouvre un bilan depuis son suivi lit « Une marche à 0,8 t CO₂e de moins sur l'année. Le plan qui suit propose de quoi la franchir » et ne trouve, en bas de l'écran, que « Revenir à mon suivi ». La promesse est faite au moment précis où le produit a décidé de ne rien proposer — et combiné à A3-3, la marche annoncée n'est même pas celle du bilan lu.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:138` ; `src/app/(tabs)/suivi/bilan.tsx:420` ; `src/app/(tabs)/suivi/bilan.tsx:474`

**Recommandation.** Passer `mode` à `palierNote` et faire varier la deuxième phrase : en relecture, nommer la destination existante (« Ton plan, dans l'onglet Plan, propose de quoi la franchir ») ou ne rien promettre. À dériver dans `src/types/palier.ts` pour que la règle soit testée avec le reste.

**Contre-vérification.** Le défaut est réel mais son coût est faible : la phrase reste vraie au sens propre (le plan existe et est à un onglet), elle est seulement mal orientée. Deux précisions utiles pour le correctif : la branche `beyondTarget2050` et la branche `isTarget2050` ne promettent rien et n'ont pas à varier — seules les deux dernières sont concernées. Et `palierNote` vit aujourd'hui **dans l'écran**, pas dans `src/types/palier.ts` (110 lignes, qui ne porte que `nextPalier`/`showsTarget2050`) : la déplacer avec `comparisonNote` (même famille, même écran, cf. A3-10) donne une seule PR testée plutôt que deux passages.


### A3-10 — « celui du haut » ne désigne pas le poste dominant : la répartition n'est jamais triée

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

`comparisonNote` renvoie « L'essentiel se joue sur un seul poste, celui du haut. » Or `POSTE_BREAKDOWN` est un tableau à l'ordre fixe domicile-travail → loisirs → voyages : « celui du haut » est toujours le domicile-travail. Pour quelqu'un dont le poste dominant est l'avion long-courrier, la phrase envoie regarder la mauvaise ligne — au moment même où le produit essaie de rendre la décision dominante mémorable. La phrase n'apparaît que lorsqu'il n'y a pas de palier (pas de cycle de plan), mais c'est justement le cas où elle est la seule accroche vers l'action.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:107` ; `src/app/(tabs)/suivi/bilan.tsx:73` ; `src/app/(tabs)/suivi/bilan.tsx:364`

**Recommandation.** Soit nommer le poste dans la phrase (`dominantShareLabel(results)`) au lieu de le désigner par sa position, soit trier `POSTE_BREAKDOWN` par valeur décroissante avant le rendu — ce qui rendrait aussi la carte « Répartition par poste » cohérente avec la carte « Le déplacement qui pèse le plus » juste au-dessus.

**Contre-vérification.** Un point qui affaiblit un peu le constat : la phrase est dans la carte « Où tu te situes », alors que la répartition est dans la carte précédente — « celui du haut » n'a en réalité **aucun** référent visuel à proximité, ce qui la rend vague plus que fausse. Nommer le poste est la meilleure des deux options proposées ; en revanche, trier `POSTE_BREAKDOWN` par valeur décroissante a un effet de bord que le constat ne voit pas : l'ordre commute → loisirs → voyages est celui du questionnaire (B1 → B2 → B3) et des libellés persistés côté serveur (`20260903120000_precise_poste_labels.sql`, cité l.60-61) ; un ordre qui change d'un bilan à l'autre rend la comparaison entre deux relectures du suivi plus difficile. Préférer `dominantShareLabel(results)` (l.89, variante neutre déjà écrite) — ou plutôt le seul `POSTE_BREAKDOWN.label` sans la préposition de mode, pour ne pas alourdir la phrase.


### A3-12 — Le partage recalcule la part du poste dominant sans le garde-fou NaN posé vingt lignes plus bas

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`shareResult` divise par `total_co2_kg_year` sans vérifier qu'il est non nul, alors que le même écran a introduit `hasEmissions` / `shareOfTotal` / `dominantPercent` précisément pour ce cas (défaut T8 de l'audit, profil 100 % vélo/marche). Pour un bilan à zéro, `percent` vaut la chaîne « NaN » et part dans l'URL de partage. Les deux endpoints s'en sortent (leur parsing rejette NaN), donc rien ne casse — mais c'est une duplication de la même formule à deux endroits, dont l'un a la correction et l'autre pas : la prochaine évolution ne les corrigera pas ensemble.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:246` ; `src/app/(tabs)/suivi/bilan.tsx:289` ; `api/partage.ts:38`

**Recommandation.** Construire l'URL de partage à partir de `dominantPercent` (déjà calculé et sûr) plutôt que de refaire la division, en remontant ce calcul avant `shareResult` ou en le sortant dans `src/types/resultat.ts` (`urlDePartage(results, appUrl)`), testable sans réseau.

**Contre-vérification.** Le constat est exact ; un détail de faisabilité qu'il ne mentionne pas : `dominantPercent` est déclaré dans le corps de rendu, **après** la définition de `shareResult` mais dans la même closure — le remonter avant `shareResult` suffit, aucune restructuration. Deux choses supplémentaires à traiter dans le même geste plutôt que d'y revenir : `totalTonnes = (total/1000).toFixed(1)` juste au-dessus (l.245) sort « 0.0 » pour un bilan nul, ce qui donne un lien de partage « 0,0 t CO₂e par an » — sur ce profil, l'écran affiche pourtant une félicitation (l.340-348) ; et `poste` est envoyé même quand le poste dominant pèse 0, ce qui produit un « Poste principal : Trajet domicile-travail » vide de sens. Si le calcul remonte dans `src/types/resultat.ts` (`urlDePartage`), c'est l'endroit où décider qu'un bilan à zéro se partage autrement — ou pas.


### A3-13 — La mascotte parle avec une phrase écrite dans l'écran, et le composant RamilleDit est réimplémenté à la main

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

L'état de félicitation d'un profil quasi nul pose un `Mascot mood="happy"` à côté d'un texte codé dans le fichier de l'écran, dans une `View` en ligne qui reproduit exactement la mise en page de `RamilleDit` (`flexDirection: 'row'`, `gap: Spacing.two`, texte en `flex: 1, minWidth: 0`). Deux règles documentées sont contournées d'un coup : « tout ce qu'elle dit vit dans `src/constants/mascotte.ts`, rendu par `RamilleDit` — jamais une phrase écrite dans un écran », et le test de `mascotte.test.ts` (première personne, pas de chiffre, pas d'injonction) ne voit pas cette ligne. C'est le seul moment de félicitation de toute la restitution ; c'est aussi celui où sa voix échappe au garde-fou.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:343` ; `src/components/ramille-dit.tsx:11` ; `src/app/(tabs)/suivi/bilan.tsx:533`

**Recommandation.** Ajouter la réplique à `RAMILLE` (par ex. `bilanQuasiNul`) et rendre `<RamilleDit ligne={RAMILLE.bilanQuasiNul} mood="happy" size={36} />`. La phrase actuelle est à la deuxième personne sans « je » : la reformuler dans sa voix (« Je ne vois presque rien à compter chez toi — c'est rare. ») au passage.

**Contre-vérification.** Deux précisions que le constat rate. (1) La phrase actuelle viole aussi la règle 1 (« première personne, court, en tutoyant ») : elle est à la 2e personne, sans « je » — la reformulation proposée est donc nécessaire, pas cosmétique. (2) Elle respecte en revanche la règle 2 (aucun chiffre) et la contrainte « jamais à côté d'un chiffre lourd » — la carte n'affiche aucun nombre dans cette branche : ce n'est donc pas un problème de placement de la mascotte, seulement de provenance de la phrase. Corollaire pratique : une fois la ligne dans `RAMILLE`, `styles.dominantPraise`/`dominantPraiseText` doivent disparaître, sinon la duplication de mise en page reste.


### A3-14 — Le profil à empreinte nulle reste coiffé de « Le déplacement qui pèse le plus »

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Quand le total est nul, la fonction SQL force `dominant_poste = 'commute'` par défaut. L'écran affiche donc, en tête et en 32 px, « Le déplacement qui pèse le plus / Ton trajet domicile-travail », immédiatement suivi de la mascotte qui dit « Tes déplacements n'émettent quasiment rien ». Les deux phrases se contredisent dans la même carte, et la répartition juste en dessous met en gras un poste à « 0,0 t CO₂e ». Le seul écran de félicitation du produit s'ouvre sur une désignation de coupable qui n'existe pas.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:329` ; `src/app/(tabs)/suivi/bilan.tsx:335` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:371`

**Recommandation.** Sous `!hasEmissions`, remplacer l'ensemble du haut de carte : un intitulé neutre (« Ton bilan ») et la seule phrase de Ramille, sans `dominantHeadline`. Masquer aussi le gras/accent sur la ligne dominante de la répartition quand toutes les valeurs sont nulles.

**Contre-vérification.** Sévérité ramenée à mineur pour une raison factuelle que le constat n'a pas vérifiée : depuis le passage aux facteurs ACV (supabase/migrations/20260905100000_facteurs_acv_complete.sql, l. 129), `marche` est le **seul** mode à facteur nul — le vélo ne l'est plus (un test pgTAP l'épingle). Un total à 0 exige donc un profil marche-uniquement **et** zéro loisir **et** zéro voyage : le cas est bien réel mais beaucoup plus rare que ne le suppose le commentaire de l'écran lui-même (« quelqu'un qui n'a que du vélo ou de la marche »), qui est aujourd'hui faux et mérite d'être corrigé au passage. La recommandation reste bonne ; à faire dans la même passe que A3-13, et de préférence en sortant la condition dans `src/types/resultat.ts` (cf. A3-17) pour qu'un test l'épingle.


### A3-15 — Un bilan relu ne porte aucune date : rien ne distingue à l'écran un bilan d'aujourd'hui d'un bilan d'il y a un an

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

`computed_at` est chargé (`select('*')`) mais jamais affiché, alors que `/suivi` formate déjà les dates de chaque instantané. Sur le seul écran qui existe en deux entrées — aboutissement du questionnaire ET relecture d'un point d'historique — rien ne dit lequel on regarde : mêmes cartes, mêmes barres, même « Estimation annuelle ». Pour un produit dont la thèse est l'accompagnement dans la durée, l'écran qui matérialise le passé n'a pas d'horodatage.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:372` ; `src/lib/database.types.ts:191` ; `src/app/(tabs)/suivi/index.tsx:57`

**Recommandation.** En mode relecture, afficher la date du bilan sous « Ton bilan transport » (« Bilan du 12 mars 2026 »), avec le même `formatDate` que `/suivi` — à sortir dans `src/types/suivi.ts` pour n'avoir qu'une implémentation. C'est aussi ce qui rendrait A3-3 visible plutôt que trompeur.

**Contre-vérification.** Un point d'exactitude à trancher avant d'implémenter : `/suivi` date ses instantanés avec `snapshot.submittedAt` (date de soumission du bilan), pas avec `computed_at` de `assessment_results`. Afficher `computed_at` ici ferait diverger les deux écrans dès qu'un résultat est recalculé côté serveur (reprise en masse via `recompute_assessment_results` après correction de facteur — chemin explicitement prévu par CLAUDE.md). La date à afficher est donc celle de soumission, pas celle du calcul ; c'est aussi elle que `src/types/suivi.ts` manipule déjà, ce qui rend la mutualisation de `formatDate` naturelle.


### A3-16 — L'écran d'attente dit « Calcul de ton bilan… » alors qu'il ne fait que relire un résultat figé

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le calcul a déjà eu lieu — `compute_assessment_results` tourne dans le wizard, et `CalculEnCours` couvre cette attente-là. Ici on lit `assessment_results`, un instantané figé que le produit s'interdit de recalculer. En relecture d'un bilan de l'an dernier, la phrase laisse croire qu'on recalcule son passé, ce qui est précisément le contraire de la garantie donnée (« assessment_results fige le résultat calculé au moment du bilan »). Le doublon de wording avec `RAMILLE.calcul` accentue la confusion.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:259` ; `src/constants/mascotte.ts:38` ; `src/components/bilan/calcul-en-cours.tsx:28`

**Recommandation.** « Chargement de ton bilan… » (ou rien du tout : la lecture d'une ligne est quasi instantanée, un écran vide pendant 150 ms vaut mieux qu'une phrase fausse).

**Contre-vérification.** Le constat sous-estime légèrement l'attente : l'écran fait **deux** requêtes séquentielles (résultats puis dernier `plan_cycles`), donc « rien du tout » peut clignoter sur une connexion lente — préférer « Chargement de ton bilan… » à l'écran vide. Accessoirement, l'état d'erreur affiche `error.message` brut de Supabase (anglais, technique) dans le même bloc : c'est le vrai défaut de wording de cette zone, et il n'est couvert par aucun constat.


### A3-17 — Toute la voix de la restitution est enfermée dans l'écran, donc hors de portée des tests

`technique` · sévérité **mineur** · verdict **confirme** · effort moyen

`dominantHeadline`, `dominantShareLabel`, `comparisonNote`, `palierNote`, `MODE_PREPOSITION` et `POSTE_SUBJECT` sont des règles produit décidées, datées et argumentées (retours utilisateur du 03/09 et du 04/09, v1-07 §3.5, v1-06 §2) — et aucune n'est testée, parce qu'elles vivent dans un fichier qui importe `@/lib/supabase`, ce que la convention du dépôt interdit à un module testé. Seul `modeResultat` a été extrait. C'est ce qui a permis aux quatre défauts A3-6, A3-9, A3-10 et A3-14 de coexister sans qu'aucun contrôle ne bronche, alors que trois d'entre eux sont des assertions d'une ligne.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:78` ; `src/app/(tabs)/suivi/bilan.tsx:116` ; `src/types/resultat.ts:21`

**Recommandation.** Déplacer les six éléments dans `src/types/resultat.ts` (aucun n'a besoin de Supabase : ils prennent une `Row` en entrée) et écrire `resultat.test.ts` sur les cas déjà connus — total nul, poste dominant avion, deux-roues, mode inconnu, relecture vs nouveau. Même découpage que `bilan.ts`/`suivi.ts`.

**Contre-vérification.** Sévérité ramenée : c'est une dette de testabilité, aucun défaut n'est causé par elle en soi, et le voisinage est déjà bien couvert (src/types/palier.test.ts épingle la mécanique des paliers, src/constants/carbon-reference.test.ts les repères). La justification est en outre partiellement fausse : A3-14 ne serait **pas** attrapé par ce refactor tel que proposé — le titre « Le déplacement qui pèse le plus » et le `bold` de la répartition sont du JSX, pas le retour d'une de ces six fonctions. Pour que le refactor serve vraiment, il faut y sortir aussi la dérivation d'état de la carte (un `enTeteDominant(results)` rendant intitulé + phrase, ou au minimum un prédicat `estBilanNul`), pas seulement les producteurs de chaînes.


### A3-18 — `total` n'est borné nulle part côté partage : n'importe qui peut faire produire une carte Ramille à un chiffre arbitraire

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`percent` est validé (entier 0–100) dans les deux endpoints, `total` ne l'est pas : `Number.parseFloat` accepte un négatif, un 1e40 ou un 0. Une URL fabriquée par un tiers rend donc une page titrée « -5,0 t CO₂e par an — mon empreinte transport » et une image PNG aux couleurs et à la mascotte du produit, servies depuis le domaine du produit — un aperçu WhatsApp indiscernable d'un vrai partage. Sur `share-card`, un nombre à 40 chiffres en `fontSize: 104` déborde la carte de 1200 px sans que rien ne l'arrête, et rien ne borne non plus la charge : chaque query string inédite est une clé de cache neuve, donc un rendu WASM complet (`maxDuration: 30`) sur un plan Hobby.

Preuves : `api/partage.ts:39` ; `api/share-card.ts:103` ; `api/share-card.ts:154`

**Recommandation.** Borner `total` dans les deux endpoints à un intervalle plausible (0 à ~200 t) et retomber sur le repli « — » / « Mon empreinte transport » en dehors. Envelopper le corps de `GET` dans un try/catch qui renvoie une carte statique de repli plutôt qu'un 500 — l'en-tête du fichier promet déjà que « ce endpoint ne doit jamais planter sur une URL mal formée, y compris construite par un tiers », la promesse ne couvre aujourd'hui que le parsing.

**Contre-vérification.** Deux nuances qui bornent le risque et que la synthèse doit connaître, sans annuler le constat. (1) Ce n'est pas une faille d'injection : `escapeHtml` couvre titre et description dans partage.ts, et satori rend du texte, pas du balisage — le préjudice est réputationnel (aperçu crédible d'un chiffre absurde sur le domaine du produit), pas technique. (2) Un tiers n'a besoin d'aucun bug pour cela : `poste` est déjà du texte libre tronqué à 120 caractères, donc borner `total` seul laisse la carte falsifiable par le libellé de poste. Si l'on veut réellement fermer la fabrication d'aperçus, il faut signer la query string (HMAC court ajouté à l'URL par `shareResult`), ce qui est un autre chantier — sinon, s'en tenir au bornage de `total` + repli, en l'assumant comme une garde de robustesse et non de sécurité. Le try/catch autour de `GET` avec carte de repli statique est, lui, le point le plus rentable des trois.


### A3-20 — La proposition de compte peut être sautée par une course entre le rendu et la lecture de session

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`proposalSeen` démarre à `true`, et n'est corrigé qu'après un aller-retour réseau (`supabase.auth.getUser()`) suivi d'une lecture AsyncStorage. Tant que ces deux appels n'ont pas répondu, `goToPlan` route directement vers `/plan` : un utilisateur anonyme qui appuie vite sur « Voir ce que je peux faire » — ou dont le réseau est lent — ne voit jamais la proposition de compte, qui est l'unique moment où le produit propose de sauvegarder son bilan. Le défaut est silencieux et penche du mauvais côté : le défaut sûr serait d'attendre, pas de sauter.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:168` ; `src/app/(tabs)/suivi/bilan.tsx:216` ; `src/app/(tabs)/suivi/bilan.tsx:227`

**Recommandation.** Modéliser trois états (`inconnu` / `anonyme-jamais-proposé` / `autre`) plutôt qu'un booléen optimiste, et sur `inconnu` désactiver brièvement le bouton ou attendre la résolution avant de router. `getSession()` (cache local, sans réseau) suffit ici, comme dans `src/lib/analytics.ts`.

**Contre-vérification.** Fenêtre réelle mais étroite : le CTA n'est rendu qu'après `state.status === 'ok'` (l.255-273), donc après la lecture réseau de `assessment_results` + `plan_cycles` ; la course ne s'ouvre que parce que l'effet d'auth enchaîne un aller-retour réseau ET une lecture AsyncStorage, donc peut finir après. Ce que le constat rate : la même variable pilote `showBanner` (l.222), donc en cas de perte de course la personne ne voit **ni** l'interstitiel **ni** la bannière de repli — la restitution ne propose alors plus du tout de sauvegarder le bilan. Le passage à `getSession()` supprime l'aller-retour et suffit probablement à refermer la fenêtre ; l'état à trois valeurs reste la correction propre.


### A3-21 — `resultat_view` ne distingue pas l'aboutissement du questionnaire d'une relecture, alors que la distinction existe déjà

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

L'écran connaît son mode (`modeResultat`) mais l'événement est émis sans propriété. L'entonnoir « bilan soumis → résultat vu → plan vu » additionne donc les premières lectures et les consultations d'historique : plus le suivi dans la durée fonctionne, plus le taux de conversion vers le plan paraît chuter, sans que rien ne le dise. C'est la même famille de biais que celui corrigé pour `plan_view`/`suivi_view` en v1-11 §5 — un chiffre plausible et faux. Le coût est une propriété, et le schéma est fait pour ça.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:157` ; `src/types/analytics.ts:50` ; `src/app/(tabs)/suivi/bilan.tsx:163`

**Recommandation.** Typer `resultat_view: { mode: 'nouveau' | 'relecture' }` dans `src/types/analytics.ts` et l'émettre après le calcul de `mode` — aucune migration nécessaire, le nom d'événement ne change pas. Penser à ce que l'appel reste après le `useState` initial pour ne pas émettre avant de connaître le mode.

**Contre-vérification.** Une nuance sur le parallèle : le défaut n'est pas de la même nature. `plan_view`/`suivi_view` étaient sous-comptés par le montage persistant des onglets ; ici l'écran est un écran de pile poussé à chaque ouverture, donc `useTrackView` est le bon hook — ne pas « corriger » en `useTrackFocus` au passage, ce serait recompter un retour de pile. Le seul manque est la dimension. Point pratique : `useTrackView` fige ses props au premier rendu (`src/hooks/use-track-view.ts`, ref lue une fois), donc passer `{ mode: modeResultat(nouveau) }` est sûr — il suffit de déplacer l'appel après `useLocalSearchParams`. Penser aussi à mettre à jour le libellé de `usage_event_types` ('Affichage de la restitution du bilan.') pour qu'il mentionne `props.mode`, comme le font les autres lignes.


### A3-22 — Le total de la restitution est en 26 px codé en dur, et affiché dans deux formats à trente pixels d'écart

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`TypeScale.salient` (30/36) est documenté comme « chiffre saillant d'une carte » et sert au cap sur `/plan` ; le chiffre le plus important du produit, lui, redéclare à la main `fontSize: 26, lineHeight: 32` — exactement les valeurs de `TypeScale.screen`, réservé aux titres d'écran. La commande de contrôle du lot 5 de v1-11 (`grep fontSize: 26…` doit rendre zéro ligne) tombe encore sur cette ligne. Accessoirement, le même total est rendu deux fois à l'écran dans deux formats différents : « 4,2 t CO₂e » dans le bloc total, « 4,2 t » sur la barre « Toi ».

Preuves : `src/app/(tabs)/suivi/bilan.tsx:537` ; `src/constants/theme.ts:116` ; `docs/architecture/v1-11-navigation-et-design-system.md:407`

**Recommandation.** Soit passer le total en `type="salient"` et supprimer l'entrée de style (attention : la hiérarchie voulue veut que la décision dominante à 32 px reste au-dessus — 30 < 32, l'invariant tient), soit assumer la taille hors échelle et l'écrire dans le commentaire, comme le fait déjà v1-11 pour les deux titres à 30 px. Ne pas laisser une valeur qui est *exactement* un jeton existant recopiée à la main.

**Contre-vérification.** Ce que le constat rate, et qui change la lecture : la documentation **croit avoir exempté** ce chiffre, mais sur une valeur fausse. `v1-11` l.408-409 parle des « tailles hors échelle — 44 du gros chiffre de résultat », et `src/constants/theme.ts` (en-tête de `TypeScale`) dit « 48 du total de la restitution ». Le code dit 26. Autrement dit l'exemption a été écrite de mémoire, sur un chiffre que le relevé contredit — même défaut que `v1-11` §7 points 2 et 3 (« avoir lu le canvas au lieu du code »). La correction utile est donc double : aligner le style sur un jeton (ou assumer explicitement), **et** corriger les deux commentaires qui annoncent 44/48, sinon le prochain passage réexemptera la même ligne. Sur le double format, je ne le traiterais pas comme un défaut : la forme courte est celle de toutes les barres de comparaison (`formatTonnesShort` est aussi utilisé par `etape-contexte.tsx`), l'unité complète n'apparaissant qu'une fois, sur le total. Sévérité mineure confirmée, purement cosmétique/design-system.


## A4 — plan de réduction, engagement, check-ins, rappels (front)

**Résumé du lecteur.** La zone est la plus soignée du dépôt sur le plan éditorial : la doctrine « aucune mécanique d'échec » est tenue partout (pas de série, pas de score, « Changer d'avis » toujours offert), la carte d'action engagée est vraiment saillante, et la résolution du canal de rappel est une dérivation pure, testée, doublée côté SQL. Ce qui frappe, c'est que les défauts sont presque tous des **chemins silencieux** : hors ligne, l'écran annonce « Ton bilan n'est pas encore fait » et propose de le refaire ; répondre à un check-in sans réseau ne dit rien du tout ; la feuille des rappels peut se refermer sur « C'est bon » en n'activant strictement aucun rappel, et la carte d'attente ne le dit pas (la ligne prévue par la table de vérité de v1-12 §3 manque dans `carteAttente`, et aucun test ne couvre ce cas — qui est pourtant l'état par défaut de toute session anonyme). Côté durée, la brique du changement d'habitude s'arrête à l'engagement : l'intention (« le mardi et le jeudi ») n'est lue par personne — ni par le rappel, qui part toujours le lundi, ni par la question du check-in, qui reste générique — et le re-bilan ou le changement de saison efface l'engagement sans un mot. Le plan ne sait donc jamais dire « tu as déjà changé ». Enfin, les libellés de poste snapshotés (« Trajet domicile-travail (Voiture seul) ») sont injectés tels quels dans des phrases où ils ne se construisent pas.

**Points forts à ne pas casser**

- `useRafraichirAuRetour` (`src/hooks/use-rafraichir-au-retour.ts:28-45`) écoute **les deux** retours — focus d'écran et retour de l'app au premier plan. C'est ce qui rend le rappel utile ; c'est un correctif issu d'un test d'appareil et il ne doit jamais être simplifié en `useEffect` de montage.
- L'engagement passe par les RPC `commit_plan_action`/`clear_plan_action_commitment` (`src/lib/plan-engagement.ts:19-39`) et non par une policy UPDATE : les chiffres figés de `plan_actions` restent inaccessibles au client. À ne pas « simplifier ».
- Le registre sans échec est tenu bout en bout : `ActionCommitment` n'a ni « tenu / pas tenu » ni série (`src/components/plan/action-commitment.tsx:26-31`), l'action non retenue s'estompe sans perdre son bouton (`src/components/plan/action-card.tsx:19-21`), et `RAMILLE.checkinNon` (« Pas cette fois-ci. Rien d'obligatoire… ») ne reproche rien.
- L'état « aucune action possible » félicite au lieu d'afficher une liste vide (`src/app/(tabs)/plan.tsx:491-504`) — c'est exactement le bon accueil pour la personne qui fait déjà le plus d'efforts.
- La provenance du chiffre est dite à l'endroit où il engage (`src/app/(tabs)/plan.tsx:509-514`, « un ordre de grandeur pour choisir, pas une mesure ») : c'est ce qui protège la crédibilité du produit.
- `carteAttente`/`canalEffectif`/`libelleBouton` sont des dérivations pures testées (`src/types/rappels.ts`, `src/types/rappels.test.ts`), avec un pendant SQL épinglé. Le bouton n'annonce un dialogue système que s'il va vraiment s'en ouvrir un — à conserver tel quel.

### A4-1 — Hors ligne, le plan annonce « Ton bilan n'est pas encore fait » et propose de le refaire

`technique` · sévérité **important** · verdict **confirme** · effort petit

L'erreur de la première requête est purement ignorée (destructuration de `data` seul). Toute panne réseau, tout jeton expiré, toute erreur RLS produit `assessment === null`, donc l'état `no_assessment` : l'écran affirme à quelqu'un qui a un bilan complet qu'il n'en a pas, et lui propose un bouton « Faire mon bilan ». C'est le pire message possible pour l'accompagnement dans la durée — la personne qui revient au bout d'un mois, dans le métro, voit son historique effacé. Aucun des trois états de chargement (`loading`, `no_assessment`, `pending`) ne distingue « rien à afficher » de « je n'ai pas pu lire ».

Preuves : `src/app/(tabs)/plan.tsx:163` ; `src/app/(tabs)/plan.tsx:173` ; `src/app/(tabs)/plan.tsx:305`

**Recommandation.** Récupérer `error` sur la requête `assessments` (et sur `engagement_checkins`, l. 206) et ajouter un état `LoadState` `erreur_reseau` : un message factuel (« Je n'ai pas réussi à relire ton plan. Vérifie ta connexion. ») plus un bouton « Réessayer » qui appelle `rafraichir()`. Ne jamais dériver « pas de bilan » d'une absence de données quand une erreur est disponible.

**Contre-vérification.** Deux nuances qui font baisser la sévérité de bloquant à important : rien n'est détruit et l'écran se répare tout seul au prochain passage au premier plan, `useRafraichirAuRetour(rafraichir)` étant déjà branché l.124 — la reco « bouton Réessayer qui appelle rafraichir() » est donc à coût quasi nul (le hook et le refreshKey existent). Ce que le constat rate : le cas `cycleError` (l.187) est déjà replié sur `pending` (« Ton plan est en cours de préparation »), qui est le même mensonge sous une autre forme — il faut traiter les trois requêtes d'un coup, sinon on déplace le problème. Et l'état d'erreur doit rester une phrase du produit, pas de Ramille (règle : elle ne commente pas un échec technique).


### A4-2 — Répondre à un check-in sans réseau ne dit rien : l'échec est totalement muet

`technique` · sévérité **important** · verdict **confirme** · effort petit

`answer()` remet `saving` à `false` puis ne fait rien si l'update a échoué. Visuellement, l'écran est identique à avant le geste : la question reste, les boutons se réactivent. La personne croit avoir répondu (ou croit que le bouton ne marche pas), et le check-in restera `pending` jusqu'à son expiration côté serveur. C'est le seul geste que la boucle d'engagement demande, et c'est le seul endroit du produit où un échec d'écriture ne produit aucun retour — `ActionCommitment` et `FeuilleRappels`, eux, affichent un message inline.

Preuves : `src/components/checkin-card.tsx:43` ; `src/components/checkin-card.tsx:44`

**Recommandation.** Ajouter un état `erreur` au composant, sur le modèle de `ActionCommitment` (`error && <ThemedText type="small" …>`) : « Ta réponse n'est pas partie. Vérifie ta connexion et réessaie. » Ton factuel, pas d'alerte système (règle `Alert` sur web).

**Contre-vérification.** La reco est bonne et cohérente (message inline, pas d'Alert — règle web du CLAUDE.md). Ce que le constat rate : l'échec est doublement invisible parce que le check-in reste en `pending` côté serveur jusqu'à sa clôture en `expired` (migration 20260904180000) et n'est jamais relu dans /suivi — la réponse perdue disparaît donc aussi de l'historique, sans qu'aucune ligne ne la compte contre la personne mais sans qu'elle sache non plus qu'elle n'a pas été enregistrée. Formuler le message sans reproche, et garder les boutons actifs pour retenter.


### A4-4 — La feuille des rappels peut se refermer sur « C'est bon » en n'activant aucun rappel

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Sur natif, la présélection vaut toujours `prefs.prefere`, dont le défaut en base est `'email'` (`20260907230000_rappels_canal.sql:53`). Pour une session anonyme — cas majoritaire, puisque le produit revendique « pas besoin de compte » — la ligne « Par email » est donc **présélectionnée alors qu'elle est non choisissable** (`emailPossible = false`), le bouton s'intitule « C'est bon », et le valider écrit `reminder_channel = 'email'` → canal effectif `aucun`. La cérémonie qui existe pour brancher le rappel se termine en ne branchant rien, et la clé AsyncStorage empêche de la revoir. Le commentaire du code annonce d'ailleurs l'inverse de ce qu'il fait (« ou la notification quand elle est possible » n'est pas implémenté).

Preuves : `src/components/plan/feuille-rappels.tsx:51` ; `src/components/plan/feuille-rappels.tsx:52` ; `src/types/rappels.ts:97`

**Recommandation.** Ne jamais présélectionner une ligne non choisissable : `useState(() => plateforme === 'web' ? 'email' : (lignesDeReglage(...).find(l => l.canal === prefs.prefere)?.choisissable ? prefs.prefere : 'push'))`. Sur natif sans compte, la notification est le seul canal réel — c'est elle qu'il faut proposer. Mettre la dérivation dans `src/types/rappels.ts` (module pur, testé) plutôt que dans le composant.

**Contre-vérification.** C'est le constat le plus solide du lot : la seule cérémonie du produit peut se conclure en ne branchant rien, et sur le cas majoritaire (natif sans compte). À combiner avec A4-5 : la carte d'attente qui suit rend alors `detail: null`, donc rien nulle part ne dit qu'aucun rappel ne partira — les deux défauts se cachent l'un l'autre. Deux précisions sur la reco : l'appel `lignesDeReglage(...)` qu'elle esquisse exige aussi `email` et `plateforme`, une simple garde `prefs.emailPossible ? prefs.prefere : 'push'` suffit et se teste dans src/types/rappels.ts ; et il faut la vraie règle générale — ne jamais présélectionner une ligne `choisissable: false`, y compris si un futur canal s'ajoute. Ajouter l'assertion correspondante dans src/types/rappels.test.ts.


### A4-5 — La carte d'attente ne dit rien à qui n'a ni compte ni notification — la ligne prévue par v1-12 §3 manque

`technique` · sévérité **important** · verdict **confirme** · effort petit

La table de vérité de v1-12 §3 prescrit, pour `email` + email impossible : « On se retrouve ici lundi. » **· Rattache un compte pour l'email.** `carteAttente` rend `detail: null` dans ce cas, parce que `coupees` n'est vrai que si `prefere === 'push'`. Ce n'est pas un cas marginal : c'est l'état par défaut de toute session anonyme (défaut `'email'` en base). La personne voit donc « On se retrouve ici lundi. » sans savoir qu'aucun rappel ne partira ni comment en obtenir un — exactement la porte que le document demande de nommer « une fois, sans insister ». Le test `rappels.test.ts` ne couvre pas cette ligne : les cinq assertions de `carteAttente` passent toutes à côté.

Preuves : `src/types/rappels.ts:206` ; `src/types/rappels.ts:188` ; `docs/architecture/v1-12-rappels.md:78`

**Recommandation.** Ajouter la branche manquante dans `carteAttente` (`prefere === 'email' && !emailPossible` → detail « Rattache un compte pour recevoir le mot par email. »), et ajouter la sixième assertion dans `rappels.test.ts` pour que la paire test-TS / test-SQL couvre bien les six lignes du §3 comme le prétend son en-tête.

**Contre-vérification.** Le constat rate que le trou est doublement structurel : la table SQL `reminder_channel_for()` traite bien ce cas (elle rend 'aucun'), donc la divergence n'est pas sur le canal mais sur ce qui est *dit* — c'est exactement le type d'écart que la paire de tests existe pour attraper, et elle l'a laissé passer faute de la sixième assertion. Corriger les deux ensemble (branche + assertion), sinon la prochaine relecture reconclura que la couverture est complète.


### A4-9 — Le re-bilan et le changement de saison effacent l'engagement sans un mot — le plan ne sait jamais dire « tu as déjà changé »

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

À la soumission d'un nouveau bilan, `generate_plan_cycle_for_user` reconstruit le cycle courant et supprime toutes ses `plan_actions` : l'action engagée, sa date d'engagement et son intention disparaissent définitivement (aucune archive, la ligne est détruite). Au changement de saison, un nouveau cycle naît et l'écran ne lit que le plus récent (`order by period_start desc limit 1`) : le précédent, avec son engagement, devient invisible. Dans les deux cas la personne retrouve un plan neuf, sans mémoire, avec un bouton « Je m'y engage » comme au premier jour. C'est le point exact où l'accompagnement dans la durée se casse : le produit ne dispose d'aucun endroit pour dire « tu as tenu le vélo deux saisons de suite », alors même que la donnée existait.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:718` ; `src/app/(tabs)/plan.tsx:186` ; `src/app/(tabs)/plan.tsx:327`

**Recommandation.** Deux temps. (1) Ne pas détruire un engagement : à la reconstruction, conserver `committed_at`/`intention_*` quand le même `action_template_id` réapparaît, ou archiver la ligne engagée avant le `delete`. (2) Sur le plan, un bloc de continuité au registre du /suivi — « La saison dernière, tu t'étais engagé à … » — sans compteur ni série, dans le ton de contribution et jamais d'exigence.

**Décision documentée concernée.** Le suivi de progression vers le cap est explicitement hors scope en v1-03 §7 (« pas de mécanique de sous-objectifs supplémentaire »). La recommandation (2) ne rouvre pas les sous-objectifs mais rouvre bien la question « le plan garde-t-il une mémoire d'une période à l'autre ? », laissée ouverte par ce §7.

**Contre-vérification.** Le constat sous-estime son propre appui documentaire : la continuité n'est pas une idée neuve à arbitrer, elle est dans le handoff design — `docs/design/README.md:182` (§4.2) prévoit explicitement « Deuxième mois de suite que tu changes quelque chose sur ce trajet. » comme phrase de corps de texte, sans compteur ni badge. La recommandation (2) est donc un rattrapage de maquette, pas une extension de scope, et le rapprochement avec le §7 de `v1-03` (hors scope = sous-objectifs *pendant* la période) est correct : il ne s'y oppose pas. Nuance à ajouter au (1) : préserver `committed_at` en réappariant sur `action_template_id` n'est juste que si le gain figé est aussi rafraîchi — sinon on garde un engagement dont les kg ne correspondent plus au nouveau bilan ; archiver la ligne engagée avant le `delete` (table `plan_action_commitments` ou colonne `superseded_at`) est plus sûr et sert directement l'affichage de continuité. Les cycles des saisons passées, eux, ne sont pas détruits : la donnée d'une saison à l'autre existe déjà.


### A4-10 — Les libellés de poste snapshotés sont injectés dans des phrases où ils ne se construisent pas

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

`plan_cycles.trip_label` et `engagement_checkins.trip_label` valent des libellés du type « Trajet domicile-travail (Voiture seul) » ou « Voyages longue distance (Avion) », fabriqués en SQL par `compute_assessment_results`. Le front les colle tels quels après une préposition : « Une action liée à Trajet domicile-travail (Voiture seul). », « Rien à alléger sur Trajet domicile-travail (Voiture seul). », « soit − 20 % de trajet domicile-travail (voiture seul) » et, dans la question du check-in, « … au moins une fois cette semaine pour Trajet domicile-travail (Voiture seul) ? ». Le produit sait pourtant faire : `bilan/resultat.tsx` porte un `MODE_PREPOSITION` justement pour ça. Sur l'écran où l'on revient le plus souvent, c'est la première chose qui trahit un texte non relu.

Preuves : `src/app/(tabs)/plan.tsx:382` ; `src/app/(tabs)/plan.tsx:448` ; `src/components/checkin-card.tsx:55` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:394`

**Recommandation.** Dériver une forme insérable dans `src/types/plan.ts` (module pur, testable) à partir du `poste` plutôt que du libellé snapshoté : « tes trajets domicile-travail », « tes sorties du week-end », « tes voyages ». Le libellé long reste à sa place, en titre de carte ; il ne rentre jamais au milieu d'une phrase.

**Contre-vérification.** Le constat rate son meilleur argument : les maquettes validées écrivent la forme naturelle, pas le libellé snapshoté — `docs/design/v1-11-navigation/Main.dc.html:33` porte « … au moins une fois cette semaine pour tes trajets domicile-travail ? » et `docs/design/v1-07-suivi-plan-trajectoire/Plan.dc.html:102` « pour ton trajet domicile-travail ». Ce n'est donc pas un raffinement de style mais un écart d'implémentation par rapport au canvas. Précision sur la recommandation : le `poste` est disponible côté client par `plan_actions.action_templates.poste` (déjà dans le select de `plan.tsx:184`) mais **pas** sur `engagement_checkins`, qui ne porte que `loop_type` et `trip_label` — pour la carte de check-in, dériver depuis `loop_type` ('commute' → « tes trajets domicile-travail ») ne distingue pas loisirs et voyages dans la boucle 'extras' ; il faudra soit un préfixe reconnu à partir du libellé snapshoté, soit ajouter le poste à la table. Le libellé long garde sa place en titre, comme proposé.


### A4-11 — `accessible` sur la carte d'action rend le bouton « Je m'y engage » inatteignable au lecteur d'écran

`technique` · sévérité **important** · verdict **confirme** · effort petit

La racine de `ActionCard` porte `accessible` (donc `true`) avec un `accessibilityLabel` qui recompose titre et intention. Sur iOS, un conteneur `accessible` regroupe son sous-arbre : ses descendants cessent d'être des éléments d'accessibilité individuels. Or ce sous-arbre contient `children`, c'est-à-dire tout `ActionCommitment` — le bouton « Je m'y engage », les puces de jours, « C'est noté », « Changer d'avis ». Le seul geste d'engagement du produit devient alors annoncé mais non actionnable. C'est le contraire de l'intention affichée par le commentaire (« sans lui, l'engagement serait invisible pour lui »), et cela concerne le travail T11.

Preuves : `src/components/plan/action-card.tsx:53` ; `src/components/plan/action-card.tsx:54` ; `src/components/plan/action-card.tsx:105`

**Recommandation.** Retirer `accessible`/`accessibilityLabel` de la racine et les porter sur un sous-groupe non interactif (l'en-tête + le titre + le gain), en laissant `children` hors du groupe. Vérifier avec TalkBack/VoiceOver que « TU T'Y ES ENGAGÉ » et l'intention restent annoncés et que le bouton reste focusable.

**Contre-vérification.** La nuance que le constat ne pose pas : le regroupement est garanti sur iOS, moins déterministe sur Android/TalkBack (où un enfant cliquable reste souvent focalisable) — or la V1 est **Google Play uniquement** (CLAUDE.md), plus le web. Il faut donc vérifier sur TalkBack et sur `react-native-web` avant de conclure à un blocage total ; la conséquence peut n'être qu'une double annonce sur la cible réelle. Cela ne change pas le correctif, qui est juste dans les deux cas : le motif documenté dans CLAUDE.md (« un `Pressable` nu reste légitime quand la cible porte plusieurs textes, à condition de lui donner un `accessibilityLabel` ») vise une cible **interactive** — ici la racine n'est ni cliquable ni un `Pressable`, donc grouper n'apporte rien qu'un sous-groupe en-tête + titre + gain ne rendrait mieux. Ajouter au passage `accessibilityRole="header"` implicite via `type` sur le titre, comme le fait le reste du produit.


### A4-21 — Le check-in reste binaire alors que la piste quantitative est retenue depuis l'audit

`fonctionnel` · sévérité **important** · verdict **confirme** · effort grand

La question n'offre que « Oui » / « Non ». v1-07 §3.6 retient explicitement de la rendre quantitative (« Combien de fois ? » 0 / 1-2 / 3+), au motif que cela « coûte exactement le même geste » et permet de recalculer une empreinte vivante entre deux bilans, sans GPS et sans auto-évaluation floue. C'est la seule piste de l'audit sur la boucle d'engagement qui reste non instruite, et c'est elle qui donnerait au suivi long — l'objectif central du produit — autre chose qu'une suite de oui/non. Un « oui » unique et un « oui » systématique sont aujourd'hui le même point dans l'historique.

Preuves : `src/components/checkin-card.tsx:62` ; `src/components/checkin-card.tsx:14` ; `docs/architecture/v1-07-audit-facteurs-et-suivi.md:615`

**Recommandation.** Instruire la piste : trois puces au lieu de deux boutons (`0` / `1-2` / `3 et plus`), colonne `response_count smallint` à côté de `response` (conservée pour l'historique existant), et le calcul d'empreinte vivante en aval. Garder le registre : aucun seuil, aucune félicitation graduée, un fait.

**Contre-vérification.** Ce n'est donc pas un défaut mais une piste **retenue et explicitement laissée à instruire** — la synthèse doit le présenter ainsi, et la remonter en Issue GitHub (le backlog du dépôt, cf. CLAUDE.md) plutôt qu'en correctif. Trois contraintes que la recommandation ne mentionne pas et qui décident de sa faisabilité : (1) le registre — CLAUDE.md impose « aucune mécanique d'échec » sur /suivi et « jamais un nombre dans la bouche de Ramille » ; un « 0 » doit se lire comme un fait, jamais comme une série cassée, et les répliques `RAMILLE.checkinOui/checkinNon` devraient gagner un troisième cas sans compter ni graduer la félicitation ; (2) `response` reste alimentée pour l'historique existant, donc `/suivi` (l. 134) et `src/types/suivi.ts` doivent dériver le booléen du décompte, pas coexister avec lui — sinon deux chiffres divergents, exactement le défaut que v1-08 interdit sur `usage_events` ; (3) « recalculer une empreinte vivante entre deux bilans » entre en tension avec le principe que `assessment_results` fige le résultat : si cette empreinte s'affiche, il faut décider où elle vit et qu'elle ne se confonde jamais avec le total du bilan. L'effort « grand » est juste, et le point (3) mérite d'être tranché dans un document avant toute migration.


### A4-3 — L'intention d'implémentation n'est lue par personne : ni le rappel, ni la question du check-in

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort moyen

`intention_days` / `intention_timing` sont écrits par `commit_plan_action`, relus pour l'affichage de la carte et pour l'export RGPD — et par rien d'autre. Aucune requête SQL du produit ne les consulte : le rappel part le lundi 6 h pour tout le monde (`generate_commute_checkins` puis `enqueue_checkin_reminders`), quels que soient les jours choisis, et la question posée est générique (« As-tu changé de mode de transport au moins une fois cette semaine pour … ? ») sans jamais nommer l'action engagée ni l'intention. Or v1-07 §3.3 pose l'intention d'implémentation comme « le levier comportemental le mieux établi » : son efficacité tient précisément au rappel au bon moment. Aujourd'hui elle sert de décoration sur une carte.

Preuves : `src/app/(tabs)/plan.tsx:465` ; `src/components/checkin-card.tsx:55` ; `supabase/migrations/20260905210000_suppression_et_export_compte.sql:111`

**Recommandation.** Deux pas indépendants. (1) Côté question : passer l'action engagée du cycle à `CheckinCard` et ancrer la question dessus (« Tu t'étais engagé à faire un trajet sur cinq à vélo, le mardi et le jeudi. Ça s'est fait cette semaine ? ») — un fait précis, comme l'exige la spec §7, et bien plus renforçant qu'une question générique. (2) Côté rappel : à terme, dériver le `send_after` du push du premier jour d'intention plutôt que du lundi fixe, sans toucher à la garantie `unique(checkin_id)`.

**Contre-vérification.** Le noyau à retenir pour la synthèse : l'intention est aujourd'hui purement décorative, et c'est un écart réel avec l'argument de v1-07 §3.3 (« le levier comportemental le mieux établi »), mais l'écart est assumé par la V1, pas oublié — l'intention y sert de contrat que la personne se donne à elle-même, affiché sur sa carte, et v1-07 §3.3 pose au même endroit que le check-in quantitatif « reste à instruire ». Si un pas doit être fait, le moins coûteux et le seul qui ne heurte aucune décision est de rappeler l'intention **sur la carte du plan au moment du point** (elle y est déjà) plutôt que de réécrire la question du check-in ou de bouger le calendrier d'envoi. Sévérité ramenée à mineur : constat juste sur le fait, faux sur le remède.


### A4-6 — Un second appareil peut désactiver le jeton push du premier

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`jetonDeCetAppareil()` prétend rendre « le jeton que ce téléphone a déjà enregistré », mais la requête ne filtre que sur `disabled_at is null` avec `limit 1` sans ordre : la RLS la borne à l'utilisateur, pas à l'appareil, et `push_tokens` est explicitement conçue pour en porter plusieurs (« unicité sur le jeton, jamais sur l'utilisateur, qui peut en avoir plusieurs »). Quelqu'un qui a l'app sur un téléphone (notifications actives) et sur une tablette (notifications refusées) voit, à chaque ouverture sur la tablette, `unregister_push_token` désactiver un jeton arbitraire — potentiellement celui du téléphone. Le push cesse alors sur l'appareil autorisé, silencieusement, et le serveur retombe sur l'email ou sur rien.

Preuves : `src/lib/rappels.ts:113` ; `src/lib/rappels.ts:116` ; `supabase/migrations/20260907230000_rappels_canal.sql:43`

**Recommandation.** Mémoriser le jeton émis par cet appareil dans AsyncStorage au moment de `register_push_token` et ne désactiver que celui-là ; à défaut, filtrer sur `platform` + un identifiant d'installation (`Constants.installationId` / `expo-application`). Ne jamais désactiver un jeton qu'on n'a pas soi-même enregistré.

**Contre-vérification.** Sévérité abaissée : le défaut se répare tout seul au prochain lancement sur l'appareil autorisé, `register_push_token` remettant `disabled_at = null` sur conflit (migration 20260907230000 l.93-98) et `enregistrerLeJeton()` étant appelée à chaque ouverture. La fenêtre de casse est donc « jusqu'au prochain lancement sur le bon appareil » — réelle (le cron part à 6h/7h UTC) mais bornée, et la V1 est Google Play Android seul, le multi-appareil n'étant pas le cas courant. Sur la reco : préférer un identifiant d'installation stable est bon, mais le plus simple et le plus juste est de mémoriser le jeton rendu par `getExpoPushTokenAsync` au moment du register (AsyncStorage, device-local par nature comme bilan-draft/connexion-prefs) et de ne désactiver que celui-là ; filtrer sur `platform` ne suffit pas, deux Android du même compte ayant la même valeur.


### A4-7 — Le jeton n'est pas réenregistré après un rattachement de compte, contrairement à ce que le fichier affirme

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

L'en-tête de `src/lib/rappels.ts` et CLAUDE.md posent que `enregistrerLeJeton()` est appelée « à chaque ouverture **et** après un rattachement réussi ». La recherche exhaustive ne trouve que deux appels : le `useEffect` de montage du layout racine, et la feuille des rappels. Aucun après `createSessionFromUrl`. Le cas qui compte est le nouvel appareil : `sendAccountAccessLink` ouvre une session pour un utilisateur **différent** de la session anonyme qui vient d'enregistrer le jeton ; le jeton reste au nom de l'ancien utilisateur, le compte retrouvé n'en a aucun, et le push est silencieusement coupé sur cet appareil jusqu'au prochain démarrage à froid. Le repli email masquera le défaut pour les comptes confirmés, jamais pour les autres.

Preuves : `src/lib/rappels.ts:5` ; `src/app/_layout.tsx:63` ; `src/lib/auth.ts:67`

**Recommandation.** Appeler `void enregistrerLeJeton()` après chaque `setSession` réussi (dans `createSessionFromUrl`) et après un `linkIdentity`/`updateUser` confirmé — ou, plus robuste, s'abonner une fois à `supabase.auth.onAuthStateChange` pour le faire à chaque changement d'utilisateur.

**Contre-vérification.** Le constat surestime l'impact réel. Le seul chemin qui change de `user_id` sur un appareil est `sendAccountAccessLink` / `/connexion/retrouver` — or ce chemin exige par construction un compte **avec adresse confirmée** (`signInWithOtp`, `shouldCreateUser: false`), donc `emailPossible` est vrai et `reminder_channel_for()` retombe sur l'email : le rappel part quand même. `linkIdentity` et `updateUser({email})` conservent le même `user_id`, le jeton reste correct. Le cas « jamais » évoqué (compte non confirmé) n'existe pas sur ce chemin. Ce qui reste vrai et vaut correctif : le jeton reste au nom de l'ancien utilisateur anonyme de l'appareil, qui peut donc recevoir sur ce téléphone un rappel qui ne concerne plus personne, jusqu'au prochain démarrage à froid. L'abonnement unique à `onAuthStateChange` est la bonne forme (il couvre aussi le retour Google natif via `createSessionFromUrl`) ; à défaut, corriger la phrase de `rappels.ts` et du §5.3 plutôt que de laisser une doc qui ment.


### A4-8 — La feuille annonce « Par notification sur ce téléphone » même quand aucun jeton n'a pu être enregistré

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`enregistrerLeJeton()` avale silencieusement toute erreur (pas d'identifiants FCM, hors ligne, `projectId` absent, simulateur) et ne rend rien. La feuille pose pourtant `jetonActif = true` dès que la permission est accordée, sans vérifier le résultat. Le plan affiche alors une carte d'attente qui promet une notification — « Je te fais signe lundi. · Par notification sur ce téléphone. » — alors que `reminder_channel_for()` ne verra aucun jeton et retombera sur l'email ou sur rien. C'est exactement la « petite trahison au seul moment où la confiance compte » que le libellé du bouton s'efforce d'éviter deux lignes plus haut.

Preuves : `src/components/plan/feuille-rappels.tsx:79` ; `src/lib/rappels.ts:95` ; `src/lib/rappels.ts:102`

**Recommandation.** Faire rendre à `enregistrerLeJeton()` un `boolean` (jeton effectivement enregistré) et n'affecter `jetonActif` qu'à cette valeur. La carte d'attente basculera alors d'elle-même sur la bonne ligne de la table du §3, sans rien d'autre à changer.

**Contre-vérification.** Ce que le constat rate : le mensonge est transitoire. `loadReminderPrefs()` (`src/lib/notification-prefs.ts:31-38`) relit réellement `push_tokens` en base, et `plan.tsx` la rappelle à chaque `rafraichir()`, lui-même branché sur `useRafraichirAuRetour` — le prochain focus d'onglet ou retour au premier plan corrige l'affichage tout seul. La fenêtre d'erreur est celle de la session en cours, pas durable, et rien de serveur n'en dépend (`reminder_channel_for()` lit la base). La correction proposée (rendre un booléen) reste la bonne, elle est petite et sans effet de bord ; elle mérite au passage un cas dans `src/types/rappels.test.ts`.


### A4-12 — Le renforcement après réponse est éphémère et ne laisse aucune trace sur le plan

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

Répondre affiche une ligne de Ramille dans la carte, en état local uniquement. Au premier rafraîchissement — retour d'onglet, ou simple retour de l'app au premier plan via `useRafraichirAuRetour` — le check-in n'est plus `pending`, la carte est démontée et la phrase disparaît, remplacée par la carte d'attente. Un aller-retour de deux secondes vers une autre app suffit. Rien sur le plan ne garde la trace de la réponse (la trace existe, mais dans l'onglet Suivi, où rien ne renvoie depuis ce moment-là). Le geste central de la boucle d'habitude est donc récompensé pendant quelques secondes, puis effacé.

Preuves : `src/components/checkin-card.tsx:33` ; `src/app/(tabs)/plan.tsx:124` ; `src/app/(tabs)/plan.tsx:209`

**Recommandation.** Faire persister le renforcement le temps de la période : relire aussi les check-ins `answered` de la période courante et rendre, à la place de la carte de question, une carte « répondue » discrète (la ligne de Ramille + le libellé de période), qui laisse place à la carte d'attente à la période suivante. Sans compteur ni série — c'est une trace, pas un score.

**Contre-vérification.** Deux corrections à apporter au constat. (1) La spec parle d'un « message de renforcement **bref** » (`docs/design/spec-fonctionnelle-…:188`, `spec-uiux-…:54`) : une carte « répondue » persistant toute la période va au-delà de la lettre de la spec — ce n'est pas interdit, mais ce n'est pas non plus un correctif de conformité, d'où la sévérité ramenée à mineur. (2) Le vrai manque documenté est ailleurs et rejoint A4-9 : `docs/design/README.md:182` prévoit, dans ce même moment de renforcement, la phrase de continuité (« Deuxième mois de suite… ») et un bouton secondaire « Revoir mon plan » — c'est ce contenu-là qui manque, davantage que la durée d'affichage. Une variante moins coûteuse que la relecture des `answered` : ne pas laisser `rafraichir()` écraser une carte dont la réponse vient d'être donnée dans cette session (conserver l'id répondu dans un état d'écran), ce qui supprime le cas « aller-retour de deux secondes » sans changer les requêtes ni introduire de trace persistante.


### A4-13 — `engagement_checkins` porte une policy UPDATE sans restriction de colonne, là où `plan_actions` l'a explicitement refusée

`technique` · sévérité **mineur** · verdict **confirme** · effort moyen

La réponse au check-in est un `update` client direct sur la table. La policy autorise `for update` sur toute la ligne pour le propriétaire, et `authenticated` possède le grant UPDATE au niveau table : rien n'empêche de réécrire `trip_label`, `period_label` ou `period_start`, qui sont des **snapshots** au même titre que `saving_kg_year` — dont v1-07 §3.3 dit précisément qu'une policy UPDATE « aurait ouvert l'écriture sur toutes les colonnes : la RLS filtre des lignes, jamais des colonnes ». Le trigger `prevent_answered_checkin_update` ne protège qu'après réponse. Impact borné aux données de la personne elle-même, mais le signal d'engagement de v1-02 §4 et les analyses d'usage reposent dessus.

Preuves : `src/components/checkin-card.tsx:41` ; `supabase/migrations/20260827090000_engagement_checkins.sql:280` ; `supabase/migrations/20260827090000_engagement_checkins.sql:267`

**Recommandation.** Appliquer la doctrine déjà retenue pour `plan_actions` : un RPC `answer_checkin(p_checkin_id uuid, p_response boolean)` en `security definer` avec vérification de propriété, retrait de la policy UPDATE, et un test pgTAP qui épingle qu'un `update` direct sur `trip_label` reste sans effet.

**Contre-vérification.** Deux choses que le constat rate. (1) Le dommage le plus concret n'est pas l'analyse d'usage mais la **génération** : `unique(user_id, loop_type, period_start)` est la clé d'idempotence de `generate_commute_checkins()`/`generate_extras_checkins()` (insert … on conflict do nothing) ; réécrire `period_start` sur une ligne `pending` peut soit bloquer la génération de la période suivante, soit dupliquer un point — un défaut d'intégrité, pas seulement de mesure. (2) Le check `status` accepte désormais `expired` (migration 20260904180000) : un client peut aussi faire disparaître son propre point en attente en le passant à `expired`, ce que ni le trigger ni la policy n'interdisent. Le RPC recommandé (`answer_checkin(p_checkin_id, p_response)`) réglerait les deux d'un coup et permettrait d'y loger l'horodatage serveur de A4-14 ; ne pas oublier de retirer aussi le grant `UPDATE` table-level (`revoke update on public.engagement_checkins from authenticated, anon`, comme le `revoke insert` de la l. 288).


### A4-14 — `responded_at` vient de l'horloge du téléphone, défaut déjà corrigé une fois pour `usage_events`

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le client fournit lui-même l'horodatage de la réponse. La migration `20260905170400` a corrigé exactement ce défaut sur `usage_events`, avec une justification qui s'applique mot pour mot ici (« une horloge de client se règle — c'est précisément pour ça que la valeur ne devait pas venir de lui »), mais elle n'a posé son trigger que sur cette table. Or `responded_at` est ce qui ordonne et dédoublonne l'historique du suivi (`src/lib/bilan-history.ts` → `src/types/suivi.ts`) : une horloge fausse déplace une réponse dans le passé ou le futur de la frise, sans erreur ni signal.

Preuves : `src/components/checkin-card.tsx:41` ; `supabase/migrations/20260905170400_horodatage_serveur.sql:5` ; `src/lib/bilan-history.ts:71`

**Recommandation.** Étendre le motif de `stamp_usage_event_time` à `engagement_checkins` : un trigger `before update` qui force `responded_at := now()` quand `status` passe à `answered` (ou l'inclure dans le RPC recommandé en A4-13), et cesser d'envoyer la colonne depuis le client.

**Contre-vérification.** Confirmé sur le fond (une donnée d'horodatage ne doit pas venir du client), mais la sévérité tient uniquement au principe et à l'export, pas à la frise : rien dans `/suivi` ne se déplace si l'horloge du téléphone est fausse — le constat surestime la conséquence. Meilleure formulation : la colonne est aujourd'hui inutilisée côté produit, ce qui est justement le bon moment pour la corriger avant qu'un écran ne s'y appuie. La correction la plus économique est de la loger dans le RPC recommandé en A4-13 (`responded_at := now()` à l'intérieur) plutôt que d'ajouter un second trigger : un trigger `before update` sur cette table devrait cohabiter avec `prevent_answered_checkin_update` et l'ordre alphabétique des triggers deviendrait porteur de sens.


### A4-15 — « Coupées dans les réglages de ce téléphone » s'affiche aussi à qui n'a jamais rien refusé

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

La ligne « Par notification » n'a que deux détails possibles, décidés par le seul `jetonActif`. Or l'absence de jeton n'est pas seulement le refus : c'est aussi la permission jamais demandée (état initial d'Android 13+), l'échec d'enregistrement (pas d'identifiants FCM, hors ligne, `projectId` manquant) et le simulateur — tous les chemins que `enregistrerLeJeton` avale en silence. La première ouverture de « Toi » sur un téléphone neuf annonce donc que les notifications sont « coupées dans les réglages », ce qui est faux et envoie la personne chercher un réglage qu'elle n'a jamais touché.

Preuves : `src/types/rappels.ts:86` ; `src/lib/rappels.ts:84` ; `src/components/compte/choix-de-rappel.tsx:32`

**Recommandation.** Passer la `Permission` (déjà lue par `lirePermission()`) à `lignesDeReglage` et distinguer trois détails : `accordee` → « Le matin où la question s'ouvre. » ; `demandable` → « À activer en une fois. » ; `fermee` → « Coupées dans les réglages de ce téléphone. » Le module est pur et testé : la table s'y ajoute sans coût.

**Contre-vérification.** Trois compléments. (1) La recommandation est juste mais incomplète : le canvas prévoit aussi, dans l'état `notifCoupee`, un lien « Ouvrir les réglages du téléphone » (build.mjs:235) qui n'existe pas dans `choix-de-rappel.tsx` — c'est ce lien qui rend l'affirmation actionnable, et il n'a de sens que dans l'état `fermee`. (2) Le même défaut de dérivation existe dans `carteAttente` (`src/types/rappels.ts:188`) : `coupees = prefere === 'push' && !jetonActif` fera dire au plan « les notifications sont coupées sur ce téléphone » à qui ne les a jamais refusées. Il est atténué aujourd'hui parce que `profiles.reminder_channel` a `default 'email'` (`20260907230000_rappels_canal.sql:24`), donc `prefere` vaut rarement `push` sans geste explicite — mais toute personne qui choisit la notification puis change de téléphone tombe dessus. (3) `ChoixDeRappel` étant purement synchrone, il faudra remonter la permission dans l'état de `src/app/compte/index.tsx` (un `useEffect` + `lirePermission`), en gardant `'fermee'` comme valeur de départ sur web comme le fait déjà `lirePermission`.


### A4-16 — Les échéances proposées pour un vol long-courrier ne peuvent pas se tenir

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Pour les postes loisirs et voyages, les trois seules échéances offertes sont mensuelles. Or l'action la plus lourde du produit s'intitule « Renoncer à un vol long-courrier **cette année** » : lui attacher « Ce mois-ci » ou « Le mois prochain » produit une intention qui n'a pas de sens, et « À ma prochaine occasion » est la seule qui tienne — ce qui laisse un choix à une seule vraie réponse. La justification écrite dans le module (« demander un jour de la semaine pour un voyage produirait une intention que personne ne peut tenir ») vaut ici à l'identique, d'une échelle en dessous.

Preuves : `src/types/plan.ts:26` ; `src/types/plan.ts:27` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:163`

**Recommandation.** Faire dépendre les échéances du `segment` de l'action et non du seul `poste` : pour `flight_long`, proposer « À ma prochaine occasion » / « D'ici la fin de l'année » / « Au prochain projet de voyage ». La contrainte SQL `intention_timing` devra accueillir les nouvelles valeurs — un ajout, pas une réécriture.

**Contre-vérification.** Deux réserves sur la recommandation. (1) « D'ici la fin de l'année » est une échéance **mobile** : proposée le 20 décembre elle ne vaut rien, et elle vieillit dans `plan_actions` alors que la valeur y est figée — préférer une valeur stable relative au cycle (« avant mon prochain bilan », « au prochain projet de voyage »). (2) L'ajout n'est pas isolé au check SQL de `20260905190000:36-37` : `formatIntention` (`src/types/plan.ts:65`) relit le libellé depuis `INTENTION_TIMINGS`, et `intention_timing` est réexporté tel quel dans `export_my_data` à deux endroits (`20260905210000:112` et `20260907230000:586`) — anciennes valeurs à conserver, jamais à renommer. Alternative plus légère et sans migration : ne **restreindre** l'affichage qu'à `prochaine_occasion` pour le segment `flight_long` en descendant `segment` jusqu'à `ActionCommitment`, avec un libellé de contexte (« À mon prochain projet de voyage »), plutôt qu'un choix à une seule vraie réponse.


### A4-17 — « Une nouvelle saison a commencé » alors que le déclencheur est six mois d'ancienneté

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort petit

Le titre de la carte de re-bilan affirme un fait — le début d'une saison — que la condition ne vérifie pas : `bilanAncien` est vrai après 182 jours, soit deux saisons entières, à une date quelconque du calendrier. La carte peut donc s'afficher en plein milieu d'une saison, et le chip juste au-dessus (« Cadence : Été 2026 ») dira la même saison qu'à la visite précédente. C'est une petite fausse affirmation sur un écran qui, par ailleurs, met un soin visible à ne rien affirmer de faux.

Preuves : `src/app/(tabs)/plan.tsx:339` ; `src/app/(tabs)/plan.tsx:523` ; `src/types/suivi.ts:68`

**Recommandation.** Titrer sur le fait réel : « Six mois ont passé » ou « Ton bilan a pris de l'âge », en gardant le corps de texte inchangé. Ou, si l'on tient à la saison, dériver la condition de `cycle.period_start` plutôt que de l'ancienneté du bilan.

**Contre-vérification.** Le constat rate le vrai écart d'implémentation, qui va dans son sens et ne demande, lui, aucune révision : la spec pose **deux** phrases, « Une nouvelle saison a commencé. » **et** « Ton bilan date de {n} mois. » — c'est cette seconde qui ancre le fait. L'écran a remplacé le chiffre par « Ton bilan date d'un moment » (`plan.tsx:525-527`), alors que `/suivi` le rend bien (« Ton dernier bilan a {n} mois », `src/app/(tabs)/suivi/index.tsx:280-281`). Restaurer `{n} mois` sur le plan, comme la spec le demande, suffit à ce que la carte cesse d'affirmer une saison sans jamais dire le fait — et ne contredit rien. Le passage à une dérivation sur `cycle.period_start`, en revanche, est à porter comme une révision de v1-11 §3.4 (il ferait par ailleurs apparaître la carte à chaque changement de saison, soit quatre fois par an au lieu de deux : v1-11 en fait un argument explicite).


### A4-18 — La phrase d'intention n'est rendue que lorsqu'un gain chiffré existe

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Dans `ActionCard`, l'intention (« Le mardi et le jeudi · par an ») est imbriquée dans le bloc conditionné par `gainKg !== null`. Si `saving_kg_year` est nul — colonne nullable, cas des lignes créées hors du chemin nominal ou d'une future opération dont le gain ne se chiffre pas — la carte perd la relecture de l'intention, alors que c'est elle, et non le kilogramme, qui constitue le levier comportemental. `ActionCommitment` ne la rend plus non plus depuis v1-11 lot 1 : il n'existe donc aucun repli.

Preuves : `src/components/plan/action-card.tsx:87` ; `src/components/plan/action-card.tsx:93` ; `src/components/plan/action-commitment.tsx:102`

**Recommandation.** Sortir l'intention du bloc du gain et la rendre dès que `engagee && intention` : une ligne à elle sous le titre. Le gain garde sa propre condition.

**Contre-vérification.** Deux nuances. (1) La perte n'est pas totale : `accessibilityLabel` recompose « Action engagée : {titre} {intention} » (l. 45-47), donc un lecteur d'écran entend l'intention même sans gain — c'est bien l'affichage visuel, et lui seul, qui la perd. Effet de bord à surveiller si l'on sort l'intention du bloc : ne pas la faire annoncer deux fois. (2) Pour les cycles nominaux d'aujourd'hui le cas ne se produit pas — `estimate_action_savings` ne rend que des gains ≥ 5 kg/an et `generate_plan_cycle_for_user` (dernière version, `20260905130000:650-734`) écrit toujours la colonne ; le risque réel porte sur les cycles hérités d'avant le 05/09 et sur une future opération non chiffrable. La correction proposée (rendre l'intention dès `engagee && intention`, sur sa propre ligne sous le titre) est la bonne et coûte trois lignes ; elle a en prime l'avantage de dissocier deux registres que le libellé mélange aujourd'hui (« Le mardi et le jeudi · par an », où « par an » qualifie le kg et non l'intention).


### A4-19 — `keepLatestPerLoop` est de la logique pure enfermée dans un module d'écran, donc non testée

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La fonction est décrite dans son commentaire comme la « ceinture » qui garantit qu'on n'affiche jamais deux questions vivantes pour une même boucle — une pile de rappels étant « le contraire de ce que cette boucle promet ». Elle vit dans `src/app/(tabs)/plan.tsx`, module qui importe `@/lib/supabase` : elle ne peut pas être testée sans faire échouer la suite, conformément à la règle du dépôt. Le découpage `src/types/*` (pur, testé) / `src/lib/*` (requêtes) existe précisément pour ce cas, et `src/types/plan.ts` est le voisin naturel.

Preuves : `src/app/(tabs)/plan.tsx:67` ; `src/app/(tabs)/plan.tsx:33` ; `src/types/plan.test.ts:1`

**Recommandation.** Déplacer `keepLatestPerLoop` (et le type `PendingCheckin`) dans `src/types/plan.ts` et lui ajouter deux cas dans `plan.test.ts` : deux périodes en attente pour la même boucle (on garde la plus récente), une par boucle (on garde les deux).

**Contre-vérification.** Le constat rate le vrai obstacle du déplacement : le type `EngagementCheckin` est exporté par `src/components/checkin-card.tsx` (l. 12-17), module qui importe lui aussi `@/lib/supabase` (l. 10) et React Native. Déplacer `PendingCheckin` dans `src/types/plan.ts` en réexportant depuis `checkin-card` ferait échouer la suite par transitivité. Il faut donc définir la forme pure (`{ id; loop_type: 'commute'|'extras'; period_label; trip_label; period_start }`) dans `src/types/plan.ts` et faire importer `checkin-card` depuis là — le sens de la dépendance doit s'inverser. Deuxième point sous-estimé : la fonction repose sur une précondition non exprimée (l'entrée est triée par `period_start` décroissant, garantie seulement par le `.order()` de la requête l. 210). Un test « entrée non triée » ne passerait pas ; soit on trie dans la fonction, soit on documente la précondition dans son nom/signature. C'est le cas d'usage le plus utile des trois.


### A4-20 — L'écran affiche le dernier cycle du plan sans vérifier qu'il couvre aujourd'hui

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La requête ne récupère ni `period_start` ni `period_end` et prend le cycle le plus récent quel qu'il soit. Rien côté client ne peut donc distinguer un cycle courant d'un cycle périmé : si le cron `generate_plan_cycles` ne passe pas (extension arrêtée, job désordonnancé, projet en pause), le plan continue d'afficher « Cadence : Été 2026 » et le cap d'une saison révolue, avec l'aplomb d'une donnée fraîche. C'est la même famille de panne muette que `cleanUrls` : ce qui s'affiche n'est pas ce qui devrait s'afficher, et rien ne le signale.

Preuves : `src/app/(tabs)/plan.tsx:184` ; `src/app/(tabs)/plan.tsx:186` ; `src/app/(tabs)/plan.tsx:384`

**Recommandation.** Ajouter `period_end` à la sélection et n'afficher le chip de cadence et le cap que si `period_end >= today` ; sinon retomber sur l'état `pending` (« Ton plan est en cours de préparation »), qui dit vrai. Le coût est d'une colonne.

**Contre-vérification.** La recommandation est le point faible du constat : retomber sur l'état `pending` (« plan en cours de préparation ») masquerait aussi les actions du cycle **et l'action engagée** — or `plan_actions.committed_at`/`intention_days` portent un engagement réel de la personne, et v1-11 fait de l'action engagée l'élément saillant de l'écran. Faire disparaître son engagement parce qu'un cron a sauté est un dégât plus grand que l'étiquette de saison périmée. Meilleure formulation : sélectionner `period_end`, garder le plan et ses actions, et ne conditionner que le **chip de cadence et le cap** (les deux seuls éléments dont le sens dépend de la période) — par exemple les masquer et afficher une ligne factuelle sans reproche quand `period_end < aujourd'hui`. Le constat sous-estime aussi la portée : ce n'est pas que le libellé qui est périmé, c'est `baseline_co2_kg_year` et la liste d'actions, figés sur un bilan potentiellement plus ancien. Et un garde côté serveur (surveiller `cron.job_run_details`, comme `emission_factor_sync_runs` sert de journal pour la synchro ADEME) traiterait la cause plutôt que le symptôme.


## A5 — écran de suivi dans la durée (historique, évolution)

**Résumé du lecteur.** L'écran de suivi tient remarquablement bien ses partis pris de ton — rien n'y compte les manquements, une hausse y est un fait et jamais une faute, et chaque décision délicate est motivée dans le code. Ce qui manque est ailleurs : il ne se recharge jamais après son premier montage, si bien que le nouveau bilan ou le check-in qu'on vient de répondre n'y apparaissent pas — le moment de renforcement le plus fort du produit tombe précisément dans ce trou. Il n'a par ailleurs aucun état d'erreur : une lecture qui échoue affiche « Ton suivi commence au premier bilan » à quelqu'un qui en a trois. Sur le fond, l'écran ne montre que le total, alors que les postes, les segments, le trajet suivi, les engagements passés et le nom des saisons sont tous déjà en base : un effort réussi sur le poste que le plan cible peut donc disparaître derrière un vol, et la comparaison saison contre même saison que la spec §6 donnait comme raison d'être de la cadence saisonnière n'existe nulle part. Entre deux bilans — six mois — l'écran est quasi statique, et son historique de check-ins s'arrête en silence à huit lignes. Enfin, le signal « 2 check-ins consécutifs », qui est l'une des trois métriques de succès de la V1, n'est toujours calculé nulle part.

**Points forts à ne pas casser**

- Le refus des mécaniques d'échec n'est pas qu'un commentaire : il est tenu dans la requête elle-même — `loadAnsweredCheckins` filtre `status = 'answered'` (src/lib/bilan-history.ts:56), donc une période sautée n'existe littéralement pas dans les données de l'écran. Rien ne peut la faire réapparaître par accident.
- `variationNote` (src/types/suivi.ts:47) : le seuil de stabilité à 3 %, la protection contre la division par zéro et surtout le « Une année n'est pas l'autre » qui suit toute hausse. Trois décisions justes, toutes couvertes par des tests qui expliquent pourquoi elles existent — à ne surtout pas simplifier.
- `keepLatestPerDay` (src/types/suivi.ts:31) : le dédoublonnage par journée évite qu'une correction se lise comme un bug. Le raisonnement est rare et le test le fige.
- Chaque barre de l'historique ouvre le bilan correspondant en relecture, avec un `accessibilityLabel` qui recompose la date et le total (src/app/(tabs)/suivi/index.tsx:169-177) — pas d'entrée d'historique en impasse, et le `Pressable` nu est ici le bon choix, documenté.
- La carte de période calme (l. 229-242) dit l'attente au lieu de laisser un vide, avec `Mascot mood="resting"` et sans jamais nommer une date que l'écran ne peut pas connaître — la retenue est le bon réflexe et elle est motivée dans le code.
- La séparation `src/types/suivi.ts` (pur, testé) / `src/lib/bilan-history.ts` (requêtes) tient, et le pied « Refaire mon bilan » ne se rend pas quand la carte le porte déjà (l. 298) — deux détails d'hygiène qui évitent respectivement une suite de tests cassée et une bande vide.

### A5-1 — L'écran de suivi ne se recharge jamais après son premier montage : il montre l'état du monde au lancement de l'app

`technique` · sévérité **important** · verdict **confirme** · effort petit

`Suivi` est un écran d'onglet (groupe `(tabs)`, aucun `unmountOnBlur` dans `(tabs)/_layout.tsx`) : react-navigation le garde monté. Or son chargement vit dans un `useEffect(..., [])` sans aucun mécanisme de rafraîchissement — il n'importe pas `useRafraichirAuRetour`, alors que CLAUDE.md pose la règle « tout écran d'onglet dont le contenu peut changer côté serveur doit l'utiliser » et que `/plan` l'utilise (plan.tsx:124). Conséquences vérifiables : répondre à un check-in sur /plan puis revenir sur l'onglet Suivi n'ajoute rien à la liste et laisse le compteur « N fois où tu as changé quelque chose » périmé ; surtout, soumettre un nouveau bilan puis revenir au suivi laisse le graphe sans la nouvelle barre et fait comparer `variationNote` aux deux anciens bilans. C'est exactement le moment de renforcement que v1-07 §3.2 décrit comme « le plus fort que ce produit puisse offrir » — il tombe dans le trou. Le listener de l'onglet (`navigation.navigate('suivi', { screen: 'index' })`) redonne le focus, il ne remonte pas l'écran.

Preuves : `src/app/(tabs)/suivi/index.tsx:75` ; `src/app/(tabs)/plan.tsx:124` ; `src/app/(tabs)/_layout.tsx:71`

**Recommandation.** Extraire le chargement dans un `rafraichir` stable (`useCallback` + clé d'état, même motif que plan.tsx:118-124) et appeler `useRafraichirAuRetour(rafraichir)`. Vérifier les deux scénarios sur appareil : réponse à un check-in depuis /plan puis onglet Suivi, et nouveau bilan puis onglet Suivi.

**Contre-vérification.** Deux précisions que le constat rate. (1) Le scénario le plus courant n'est pas le check-in mais la sortie du questionnaire : elle atterrit sur `/suivi/bilan?id=…&nouveau=1`, enfant de la pile Suivi — l'index n'est monté que s'il a déjà été visité dans la session, donc le bug ne se manifeste que pour un utilisateur qui a ouvert l'onglet Suivi avant de refaire son bilan. Cela ne l'invalide pas, mais c'est ce qui explique qu'il ait passé la vérification appareil du 09/09. (2) Le rafraîchissement au retour de premier plan (`AppState`) est ici moins critique que sur `/plan` (aucun rappel ne pointe vers `/suivi`), d'où la rétrogradation à `important` : rien n'est perdu ni faux au sens des données, l'écran est simplement périmé jusqu'au prochain lancement. Le correctif reste celui proposé, à l'identique de plan.tsx l. 114-124.


### A5-2 — Aucun chemin d'erreur : une lecture qui échoue affiche « Ton suivi commence au premier bilan » à quelqu'un qui a trois bilans

`technique` · sévérité **important** · verdict **confirme** · effort moyen

`loadAssessmentHistory` et `loadAnsweredCheckins` renvoient `[]` sur erreur, sans distinguer « vide » de « échec ». L'écran, lui, n'a que trois états (`loading` / `empty` / `ok`) : une coupure réseau, un jeton expiré ou un résultat de calcul manquant produisent donc l'état vide, c'est-à-dire l'écran qui annonce « Ton suivi commence au premier bilan » et propose « Faire mon bilan » à une personne qui en a déjà plusieurs. Sur ce produit précisément, ce message se lit « mon historique a disparu » — le contraire de l'accompagnement dans la durée. Symétriquement, un rejet de promesse (aucun `try/catch` autour de l'IIFE async) laisse l'écran sur « Chargement de ton suivi… » indéfiniment, sans réessai ni message. Comparer avec `/suivi/bilan`, qui porte bien un état `error` (bilan.tsx:145).

Preuves : `src/lib/bilan-history.ts:27` ; `src/app/(tabs)/suivi/index.tsx:60` ; `src/app/(tabs)/suivi/index.tsx:112`

**Recommandation.** Faire remonter l'échec : `loadAssessmentHistory`/`loadAnsweredCheckins` renvoient un résultat discriminé (`{ ok:true, data } | { ok:false }`) plutôt que `[]`, ajouter un état `error` au `LoadState` avec un message via `MessageInline` et un bouton « Réessayer », et envelopper l'IIFE dans un `try/catch`. Ne jamais laisser une erreur se transformer en état vide sur cet écran.

**Contre-vérification.** La moitié « chargement infini » du constat est la plus faible : `supabase-js` ne rejette pas sur erreur réseau, il renvoie `{ error }` — un rejet ne viendrait que du mandataire de configuration (`src/lib/supabase.ts`, qui lève à la première utilisation) ou d'`ensureSession`. Le vrai défaut, et il suffit, c'est erreur → état vide. Sévérité `important` et non `bloquant` : le message est trompeur mais aucune donnée n'est perdue et le bouton ne détruit rien (le questionnaire insère un nouveau bilan, il n'écrase pas l'historique). Deux points à ajouter au correctif : distinguer aussi le cas « bilan complété sans ligne `assessment_results` », déjà filtré silencieusement l. 33-36 (un calcul échoué disparaît de l'historique sans un mot) ; et vérifier les autres appelants avant de changer la signature (`loadLastSubmittedAnswers` est indépendante, mais `loadAssessmentHistory` doit rester utilisable ailleurs).


### A5-3 — L'unité d'affichage (0,1 t) efface les progrès que l'écran est fait pour montrer, et affiche « 0,0 t » aux profils les plus sobres

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Toutes les valeurs du suivi passent par `formatTonnes`, qui arrondit au dixième de tonne — soit un pas de 100 kg. Deux effets contradictoires avec l'objet de l'écran : (1) une baisse réelle peut laisser deux chiffres identiques pendant que la note en dessous annonce un écart — 1 240 kg puis 1 180 kg s'affichent « 1,2 t » et « 1,2 t » tandis que `variationNote` dit « 5 % de moins que ton bilan précédent » ; l'écran se contredit à l'endroit exact du renforcement ; (2) un bilan sous 50 kg/an (vélo et marche, aucun vol) s'affiche « 0,0 t CO₂e », ce qui se lit comme « rien mesuré » alors que c'est le meilleur résultat possible. Les gains du plan sont d'ailleurs libellés en kg (plan.tsx:435 « le cap … affiché en kg parce que c'est l'unité des actions ») : les deux écrans ne parlent pas la même unité.

Preuves : `src/lib/format.ts:3` ; `src/app/(tabs)/suivi/index.tsx:192` ; `src/app/(tabs)/suivi/index.tsx:214`

**Recommandation.** Sur le suivi, afficher l'écart en kg à côté du total (« 1,2 t · −60 kg depuis mars ») ou basculer en kg sous un seuil (ex. < 1 t), comme le plan le fait déjà pour le cap. À défaut, augmenter la précision de `formatTonnes` sous 2 t. Attention : `formatTonnes` est partagé avec la restitution et la proposition de connexion — tout changement doit être fait dans un helper dédié au suivi ou vérifié sur les trois surfaces.

**Contre-vérification.** Le constat sous-estime la portée : `formatTonnes` sert aussi au palier de `/suivi/bilan` (l. 117, `formatTonnes(palier.reductionKg)`), donc une marche de 60 kg s'annonce « Une marche à 0,1 t de moins sur l'année » — et le repère 2050 étant proche pour un profil sobre, ce sont justement ces personnes qui lisent des marches à 0,0/0,1 t. Un helper dédié (kg sous 1 t, dixième de tonne au-dessus) corrige les trois surfaces d'un coup. Deux garde-fous en le faisant : `formatTonnesShort` (`src/constants/carbon-reference.ts`, testé) ne doit pas bouger — il porte les repères nationaux — et rien de ce nouveau libellé ne doit passer dans la bouche de la mascotte (CLAUDE.md : jamais un nombre).


### A5-4 — Seul le total évolue à l'écran : l'effort réussi sur le poste que le plan cible peut disparaître derrière un vol

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

`loadAssessmentHistory` ne lit que `total_co2_kg_year`, `dominant_poste` et `dominant_poste_label`, alors que `assessment_results` porte déjà la décomposition figée par bilan (`commute_co2_kg_year`, `leisure_co2_kg_year`, `travel_co2_kg_year`, plus les segments `travel_flight_long_co2_kg_year`, `commute_main_leg_km_year`…). Or le plan de réduction et son cap portent sur le **poste dominant** (`plan_cycles.baseline_co2_kg_year`, cf. plan.tsx:333-335 « Le cap est une part de la baseline du poste dominant, pas du total »). Quelqu'un qui passe six mois à réduire son domicile-travail et qui prend un long-courrier cette année-là voit donc « X % de plus que ton bilan précédent » et rien de son travail. C'est le cas où le suivi décourage précisément la personne qui a changé.

Preuves : `src/lib/bilan-history.ts:23` ; `src/lib/database.types.ts:187` ; `src/app/(tabs)/plan.tsx:334`

**Recommandation.** Ajouter les trois postes au `select` et à `AssessmentSnapshot`, et afficher au moins l'écart du poste dominant à côté de l'écart total (« Ton domicile-travail : −180 kg. Tes voyages : +420 kg »). Registre factuel, sans hiérarchie morale entre les postes.

**Contre-vérification.** Le constat rate un point qui renforce sa recommandation et un piège. Le renfort : `/suivi/bilan` affiche déjà les trois postes pour **un** bilan (l. 71-75, `POSTES`/`co2Key`) — le suivi est le seul endroit où l'on ne peut pas les comparer dans le temps, alors que la donnée est chargée à deux clics de là. Le piège : le poste dominant peut **changer** d'un bilan à l'autre (c'est même le signe d'une réussite), donc n'afficher que « l'écart du poste dominant » compare deux postes différents ; mieux vaut l'écart des trois postes, ou l'écart du poste dominant **du bilan précédent** suivi nommément. Rester au registre factuel, sans hiérarchie morale (v1-07 §3.2, « une hausse n'est jamais une faute »).


### A5-7 — La liste des check-ins est tronquée à 8 en silence, sur une requête elle-même non bornée

`technique` · sévérité **important** · verdict **confirme** · effort moyen

`loadAnsweredCheckins` ne pose aucune `limit` (elle ramènera jusqu'au plafond PostgREST toutes les réponses de la personne, soit ~52 par an pour la seule boucle hebdomadaire), et l'écran n'en affiche que les 8 premières, sans « voir plus » ni la moindre indication que la liste est coupée. L'en-tête, lui, compte **toutes** les réponses positives : au bout d'un an on lit « 31 fois où tu as changé quelque chose » au-dessus de 8 lignes, dont certaines à « Non ». Sur l'écran qui porte explicitement la promesse du long terme, l'historique s'arrête donc à huit semaines sans le dire. Même remarque pour le graphe des bilans, qui rend une barre par bilan sans borne.

Preuves : `src/lib/bilan-history.ts:52` ; `src/app/(tabs)/suivi/index.tsx:263` ; `src/app/(tabs)/suivi/index.tsx:134`

**Recommandation.** Borner la requête (`.limit(...)`, avec une pagination ou un « Voir tout mon historique » qui charge la suite) et, si l'affichage reste plafonné, le dire (« les 8 derniers points »). Regrouper par mois ou par saison plutôt que d'allonger une liste plate sera plus lisible au bout d'un an.

**Contre-vérification.** Deux nuances sur la formulation : (a) le « plafond PostgREST » n'existe pas par défaut sur Supabase (pas de `max-rows` configuré), la requête ramène donc réellement tout — le risque est le volume, pas une troncature serveur silencieuse ; (b) le volume reste modeste (~52 hebdo + 12 mensuels par an), donc le vrai défaut n'est pas la performance mais l'**incohérence en-tête/liste**, qui est la partie à corriger en priorité. Le plus simple et le plus fidèle à l'écran : garder le compteur global (c'est lui qui porte le sens, « ce que tu as fait »), et dire la coupe (« tes 8 derniers points ») + un « Voir tout mon historique ». Attention aussi à un défaut voisin non relevé : cet écran d'onglet charge ses données dans un `useEffect` de montage (l. 75-90) sans `useRafraichirAuRetour`, ce que CLAUDE.md impose à « tout écran d'onglet dont le contenu peut changer côté serveur » — un check-in répondu depuis le plan ne s'ajoutera pas à la liste tant que l'app n'est pas relancée.


### A5-16 — « Mes données » n'annonce pas ses échecs aux lecteurs d'écran : elle n'utilise pas `MessageInline`

`technique` · sévérité **important** · verdict **confirme** · effort petit

`MessageInline` existe exactement pour qu'il n'y ait qu'une façon de dire qu'une action n'a pas abouti, et son `role="alert"` / `accessibilityLiveRegion` n'est pas décoratif — son en-tête explique qu'un texte apparu dans la page, contrairement à une boîte système, n'est annoncé par aucun lecteur d'écran. Six surfaces l'utilisent ; `mon-compte.tsx` a été oubliée et rend son message dans un `ThemedText` nu. Les deux messages concernés sont « La suppression n'a pas abouti » et « L'export n'a pas pu être généré » : l'échec du chemin exigé par Google Play et du droit d'accès RGPD est donc silencieux pour qui ne voit pas l'écran, et le bouton reste réactivé sans que rien ne le dise.

Preuves : `src/components/compte/mon-compte.tsx:107` ; `src/components/message-inline.tsx:13` ; `src/lib/compte.ts:100`

**Recommandation.** Remplacer le bloc par `<MessageInline message={message} />`. Le composant gère déjà `null`, ce qui supprime aussi le `{message && …}`.

**Contre-vérification.** Le constat rate que le même `message` porte aussi le **succès** (« Export généré. », l. 35), qui n'est pas annoncé non plus — c'est même le cas le plus fréquent et le seul retour visible d'un export réussi sur natif. `MessageInline` en `live-region` polite le couvre aussi, donc le remplacement corrige les deux d'un coup. Le composant est nommé « message d'échec » dans son commentaire : y faire passer un succès mérite une ligne de commentaire pour que personne ne « corrige » ensuite en `assertive`.


### A5-18 — Sur Android — la seule cible de la V1 — l'export RGPD passe par une feuille de partage qui reçoit tout le JSON comme message texte

`technique` · sévérité **important** · verdict **confirme** · effort moyen

`exportMyData` distingue le web (Blob + ancre, vrai téléchargement) et le natif, où il appelle `Share.share({ message: json })`. Sur Android le contenu part alors dans l'`EXTRA_TEXT` d'un intent : les applications destinataires tronquent couramment ce champ, beaucoup le refusent, et un export volumineux (bilans + réponses + check-ins + `usage_events`) peut dépasser la limite de transaction binder. Or c'est le seul chemin disponible sur la plateforme de lancement, et le message « Export généré. » est affiché dès que `Share.share` ne lève pas — donc y compris quand la personne a annulé, ou quand l'application destinataire n'a gardé qu'un fragment.

Preuves : `src/lib/compte.ts:44` ; `src/components/compte/mon-compte.tsx:35`

**Recommandation.** Écrire l'export dans un fichier et le partager comme fichier (`expo-file-system` + `expo-sharing` — dépendance native, donc build EAS à prévoir, cf. CLAUDE.md), ou à défaut exploiter le résultat de `Share.share` (`action === 'dismissedAction'`) pour ne pas annoncer un export que personne n'a reçu, et borner l'export côté RPC.

**Décision documentée concernée.** Le commentaire de src/lib/compte.ts l. 28-30 assume de ne pas installer `expo-file-system`/`expo-sharing` « pour un écran ». C'est cette décision-là que la recommandation rouvre.

**Contre-vérification.** Deux nuances que le constat rate. (1) Le régime de risque n'est pas uniforme : le défaut certain et gratuit à corriger est l'annonce mensongère sur annulation (`action === Share.dismissedAction`) — trois lignes, aucune dépendance. Le dépassement binder, lui, demande un export réellement volumineux, ce qu'un compte Ramille typique (quelques bilans, réponses à plat, check-ins) n'atteint pas ; c'est un risque de queue de distribution, pas le cas nominal. (2) La conformité RGPD n'est pas rompue : le chemin web (`Platform.OS === 'web'`, l. 27-42) fait un vrai téléchargement et `MonCompte` est rendu par `/compte` qui existe aussi sur le web, donc un droit d'accès exploitable subsiste. Sur `expo-file-system`/`expo-sharing`, le refus n'est pas qu'un commentaire de fichier : `docs/architecture/v1-06-partage-social.md` §4 (l. 133-138) a déjà écarté `expo-sharing` pour le partage de bilan au motif qu'il impose un build EAS invérifiable ici — rouvrir ce choix pour l'export est cohérent avec le fait qu'`expo-notifications` (v1-12) a depuis rendu ce build inévitable, mais il faut le dire ainsi.


### A5-19 — Ce que la personne s'était engagée à faire ne laisse aucune trace dans le suivi

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

L'engagement sur une action est le levier comportemental central du plan (v1-07 §3.3) et il est entièrement conservé en base : `plan_actions.committed_at`, `intention_days`, `intention_timing`, `saving_kg_year`, rattachés à un `plan_cycles.period_label` qui nomme la saison. Le suivi ne lit rien de tout cela : il ne charge que `assessments` et `engagement_checkins`. Une personne qui revient au bout d'un an ne peut donc pas voir « au printemps, tu avais choisi de faire deux jours par semaine en train », alors que c'est la matière même d'un accompagnement dans la durée — et la seule façon de relier un écart d'empreinte à une décision prise.

Preuves : `src/lib/bilan-history.ts:20` ; `src/lib/database.types.ts:551` ; `src/lib/database.types.ts:612`

**Recommandation.** Ajouter au suivi une lecture des cycles passés portant une action engagée, affichée comme un souvenir factuel (« Printemps 2027 — tu avais choisi : le train le mardi et le jeudi ») et rien d'autre.

**Décision documentée concernée.** v1-07 §3.3 pose « aucune mécanique d'échec : pas de tenu / pas tenu ». Afficher un engagement passé ne doit donc jamais s'accompagner d'un statut, d'une coche ou d'un pourcentage de respect — c'est un rappel, pas un bilan de tenue. Si le produit veut aller plus loin, c'est cette décision qui est en jeu.

**Contre-vérification.** Trois choses que le constat rate. (1) La formulation « tu avais choisi : le train le mardi et le jeudi » existe déjà et ne doit pas être réécrite : `formatIntention` (réutilisé par `(tabs)/plan.tsx` l.465, cf. v1-11 §9 « formatIntention existait déjà ») — la lire deux fois différemment est exactement le défaut que le repo évite ailleurs. (2) L'ajout doit venir avec le chiffre figé `saving_kg_year` ou pas de chiffre du tout, mais surtout jamais présenté comme un résultat obtenu : `plan_actions.saving_kg_year` est une estimation figée à la génération, pas une mesure — l'associer visuellement à l'écart entre deux bilans (`variationNote`) fabriquerait une preuve causale, ce que le §« non-goals » de v1-07 interdit explicitement (« Aucune preuve causale d'impact »). (3) Défaut technique qui s'ajoutera au moment de l'implémenter, et qui est déjà présent : cet écran charge ses données dans un `useEffect(..., [])` (l.75-90) sans `useRafraichirAuRetour`, alors que CLAUDE.md pose que tout écran d'onglet dont le contenu peut changer côté serveur doit l'utiliser. Un engagement pris sur `/plan` puis un retour sur l'onglet Suivi afficherait un souvenir périmé jusqu'au prochain lancement.


### A5-5 — Entre deux bilans — soit six mois — l'écran ne raconte quasiment rien

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort grand

Le contenu du suivi est presque entièrement dérivé des bilans : le graphe (une seule barre tant qu'il n'y en a qu'un), la phrase d'intro qui dit « Ton point de départ », et la note de variation qui n'existe qu'à partir du deuxième bilan (`previous && …`). La seule chose qui bouge pendant les 182 jours qui séparent deux bilans est la liste des check-ins, plafonnée à 8 lignes de « Oui/Non ». Autrement dit, sur toute la fenêtre de rétention critique, l'onglet qui porte l'accompagnement dans la durée est presque statique — ce qui n'invite pas à y revenir, alors que c'est la moitié de la barre de navigation.

Preuves : `src/app/(tabs)/suivi/index.tsx:149` ; `src/app/(tabs)/suivi/index.tsx:212` ; `src/types/suivi.ts:68`

**Recommandation.** Donner au suivi une matière qui vit entre deux bilans, à partir de données déjà en base et sans score : le libellé du trajet suivi (`engagement_checkins.trip_label`), la saison en cours et l'action engagée (`plan_cycles.period_label`, `plan_actions`), et l'estimation cumulée de ce que l'action engagée représente sur l'année. Le tout au passé simple et factuel, jamais en objectif à tenir.

**Contre-vérification.** Attention, la recommandation empiète sur une décision actée : v1-11 §1.1 partage explicitement les deux lieux — « le Plan est maintenant, cette saison : l'action engagée, le cap, le point de la semaine ; le Suivi est dans la durée : les bilans, les écarts, les points répondus » — et v1-11 §3.3/§3.4 a délibérément placé la carte de période calme et l'invitation de saison **sur le plan**, en laissant au suivi sa propre carte calme au texte différent. Rapatrier `plan_cycles.period_label` et l'action engagée sur le suivi dupliquerait le plan. Ce qui reste légitime et dans le sujet du suivi : historiser les **cycles passés** et les actions **tenues** (ce qui a été fait, au passé), pas l'action en cours. D'où la rétrogradation en `mineur` : le manque est réel mais la matière proposée appartient en partie à l'autre onglet, et l'effort est grand pour un bénéfice non démontré.


### A5-6 — Aucune lecture longue : ni « depuis ton premier bilan », ni saison contre même saison de l'année précédente

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

L'unique note d'évolution compare le dernier bilan à l'avant-dernier. Le premier bilan est chargé (`const first = history[0]`) mais ne sert qu'à dater la phrase d'introduction : le produit ne dit jamais « depuis ton premier bilan, −18 % », qui est pourtant la phrase que quelqu'un vient chercher au bout de deux ans. Et la comparaison saisonnière que la spec §6 donne comme raison même de la cadence saisonnière (« pouvoir comparer un même type de saison d'une année sur l'autre — mon été vs mon été précédent ») n'existe nulle part : `season_bounds` est en base, `plan_cycles.period_label` porte le nom de la saison, et rien de tout cela n'est lu par le suivi. Une hausse mesurée entre un bilan d'hiver et un bilan d'été est donc présentée comme une variation d'habitude alors qu'elle peut être saisonnière.

Preuves : `src/app/(tabs)/suivi/index.tsx:129` ; `src/app/(tabs)/suivi/index.tsx:151` ; `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:172`

**Recommandation.** Ajouter dans `src/types/suivi.ts` (module pur, testable) deux dérivations : l'écart premier↔dernier bilan, et l'appariement d'un bilan avec celui de la même saison de l'année précédente quand il existe. Les afficher en une phrase chacune sur le même registre que `variationNote`. Quand aucun appariement saisonnier n'est possible, ne rien dire plutôt qu'approximer.

**Contre-vérification.** La citation de la spec est surinterprétée : le passage de la §6 (l. 172) justifie le **choix de cadence du plan de réduction** (saisons calendaires plutôt que trimestre glissant), pas une comparaison saisonnière à afficher sur le suivi ; et il se termine par « reste un paramètre ouvert ». Surtout, l'appariement saisonnier est presque inatteignable en pratique : avec `REBILAN_SUGGESTION_DAYS = 182`, les bilans successifs tombent par construction sur des saisons **opposées** — il faudrait deux bilans à un an d'écart, et la saison n'est portée par aucune colonne d'`assessment_results` (il faudrait la dériver de `submitted_at`). La moitié réellement actionnable est l'écart premier↔dernier, à conditionner sur `history.length >= 3` (à 2 bilans, `first === previous` et la phrase ferait doublon) et à formuler au même registre non culpabilisant que `variationNote`, dans `src/types/suivi.ts` avec son test — d'où `mineur` plutôt qu'`important`.


### A5-8 — La liste des check-ins est une colonne de Oui/Non où le « Non » est visuellement dégradé

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort petit

Chaque ligne pose le libellé de période à gauche et « Oui » ou « Non » à droite, le « Oui » en `accentText` (le vert de l'accent) et le « Non » en `textTertiary` (le gris le plus faible de la palette). Quelqu'un qui a répondu honnêtement « non » quatre fois de suite voit donc quatre lignes grises alignées sous une mascotte souriante : c'est visuellement un relevé de manquements, alors que le produit a explicitement écarté toute mécanique d'échec — et que répondre « non » est justement l'acte qu'on veut encourager à répéter. La spec §7 demande sur réponse négative « une relance factuelle, non culpabilisante » ; ici il n'y a pas de relance du tout, seulement une trace décolorée.

Preuves : `src/app/(tabs)/suivi/index.tsx:268` ; `src/app/(tabs)/suivi/index.tsx:248` ; `src/app/(tabs)/suivi/index.tsx:244`

**Recommandation.** Traiter les deux réponses au même niveau typographique (même couleur, `textSecondary`), ou remplacer « Oui/Non » par ce qui s'est passé (« tu as changé une fois » / « pas cette semaine-là ») sans hiérarchie de couleur. Le fait d'avoir répondu est ce qui est compté : c'est la ligne entière qui doit valoir, pas sa réponse.

**Contre-vérification.** Ce que le constat rate en revanche, et qui est un vrai écart au canvas : la maquette n'a **pas** de mascotte sur cette carte, l'implémentation ajoute `<Mascot mood="happy" size={40} />` (l. 248). C'est là que se crée l'effet « sourire au-dessus d'une colonne de Non », pas dans la couleur. Retirer la mascotte de cette carte (ou basculer en `calm`) revient au canvas au lieu de s'en éloigner, coûte moins, et traite le vrai point du constat. Le poids typographique du « Non » (600 dans le code contre 500 au canvas) est le seul écart de couleur/graisse réellement corrigeable sans décision produit.


### A5-9 — « Tu réponds régulièrement » est affirmé dès le premier point de suivi, et seulement à ceux qui ont toujours répondu non

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

La branche `answeredYes === 0` affiche « N point(s) de suivi » avec pour sous-titre « Tu réponds régulièrement : c'est déjà ça qui compte. » Elle se déclenche donc pour quelqu'un qui a répondu **une seule fois**, et exclusivement pour quelqu'un dont toutes les réponses sont « non » — deux cas où la phrase sonne faux, le premier parce qu'une réponse n'est pas une régularité, le second parce que le compliment porte à côté (c'est le fait de répondre qui est salué, mais la personne vient de lire une colonne de « Non »).

Preuves : `src/app/(tabs)/suivi/index.tsx:256` ; `src/app/(tabs)/suivi/index.tsx:251`

**Recommandation.** Distinguer un point unique (« Ton premier point de suivi. ») de plusieurs, et faire porter la phrase sur le fait de répondre plutôt que sur une régularité non vérifiée. Si la phrase doit vivre dans la bouche de Ramille, elle doit rejoindre `src/constants/mascotte.ts` — mais la règle « jamais un nombre dans sa bouche » interdit d'y mettre le compteur.

**Contre-vérification.** La remarque sur `src/constants/mascotte.ts` est juste mais ne s'applique pas : ces deux phrases ne sont pas rendues par `RamilleDit` et ne portent pas la voix de la mascotte (la seule phrase de Ramille sur cet écran est `RAMILLE.suiviSansPoint`, l. 234) — donc pas de migration nécessaire, seulement une reformulation. Formulation qui tient sans nombre ni régularité affirmée : au singulier « Ton premier point de suivi. » / « Tu as pris le temps de répondre. », au pluriel « Tu as répondu à chaque fois qu'on te l'a demandé. » n'est pas vérifiable non plus (on ne relit pas les `expired`) — mieux vaut « Répondre, c'est déjà le suivi. », qui ne prétend rien sur la fréquence.


### A5-10 — Le dédoublonnage par jour se fait en UTC, l'affichage en heure locale : deux barres peuvent porter la même date

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`keepLatestPerDay` regroupe sur `submittedAt.slice(0, 10)`, c'est-à-dire la date **UTC** de l'horodatage ISO, tandis que l'écran affiche `new Date(iso).toLocaleDateString('fr-FR', …)`, c'est-à-dire la date **locale**. En France (UTC+1/+2), un bilan soumis à 00h30 heure locale porte la date UTC de la veille : deux bilans faits dans la même soirée de part et d'autre de minuit échappent au regroupement et s'affichent comme deux barres à la même date avec deux valeurs différentes — exactement le symptôme que cette fonction existe pour éviter (« deux barres à la même date, avec deux valeurs différentes, se lisent comme un bug »).

Preuves : `src/types/suivi.ts:34` ; `src/app/(tabs)/suivi/index.tsx:57` ; `src/types/suivi.ts:25`

**Recommandation.** Dériver la clé de regroupement de la date locale (`new Date(iso)` + composants locaux, ou passer la clé formatée depuis l'appelant) pour que la clé et le libellé affiché soient toujours la même journée. Ajouter un cas de test avec un horodatage juste après minuit local.

**Contre-vérification.** Le test existant ne peut pas attraper ce cas : `src/types/suivi.test.ts:51-58` n'utilise que des horodatages en milieu de journée UTC (09:00Z, 10:00Z), où date UTC et date locale française coïncident. Ajouter un cas `2026-03-01T23:30:00Z` + `2026-03-02T09:00:00Z` (même 2 mars à Paris). Attention en corrigeant : le test tourne sous le fuseau de la CI — soit fixer `TZ=Europe/Paris` pour la suite Jest, soit rendre la clé injectable, sinon la correction sera verte pour une mauvaise raison. Le symétrique existe aussi et est plus fréquent : un bilan à 23h30 le 1er mars local (00h30 UTC le 2) s'affiche « 01 mars » mais est groupé au 2 — inoffensif visuellement, mais il fusionne deux journées locales distinctes.


### A5-11 — Les libellés de période hebdomadaires n'ont pas d'année : « Semaine du 07/09 » est ambigu dès la deuxième année

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le libellé des check-ins hebdomadaires est construit côté serveur en `'Semaine du ' || to_char(v_period_start, 'DD/MM')`, sans année, et l'écran l'affiche tel quel. Sur un produit dont l'horizon revendiqué est 2050 et dont l'écran de suivi est censé accumuler, deux lignes « Domicile-travail · Semaine du 07/09 » séparées d'un an sont indiscernables — d'autant que la liste ne montre que huit lignes prises dans tout l'historique et peut donc mélanger deux années pour quelqu'un qui répond épisodiquement.

Preuves : `supabase/migrations/20260904180000_checkin_expiry_and_plan_refresh.sql:39` ; `src/app/(tabs)/suivi/index.tsx:266`

**Recommandation.** Ne pas toucher au libellé snapshotté (il est aussi utilisé dans la question elle-même, où l'année serait du bruit) : ajouter l'année côté écran à partir de `periodStart`, déjà présent dans `CheckinRecord`, quand la ligne n'est pas de l'année en cours — ou grouper la liste par année.

**Contre-vérification.** La recommandation est la bonne et évite le vrai piège : `period_label` est snapshotté et sert aussi dans la question du plan (`src/app/(tabs)/plan.tsx:208`) et dans le corps de l'email de rappel — le modifier côté SQL n'affecterait de toute façon pas les lignes déjà écrites, donc l'ambiguïté persisterait pour l'historique existant. Ajouter l'année à l'écran à partir de `periodStart` (déjà dans `CheckinRecord`, `src/types/suivi.ts:18`) est la seule correction rétroactive. Attention à dériver l'année de `periodStart` avec les composants **locaux** ou en `slice(0,4)` sur la chaîne `date` — c'est une colonne `date`, pas `timestamptz`, donc pas de piège de fuseau ici.


### A5-12 — `trip_label`, snapshotté à chaque check-in précisément pour ne pas changer rétroactivement, n'est jamais affiché

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

`engagement_checkins.trip_label` est figé à la génération (CLAUDE.md : « snapshotté pour ne pas changer rétroactivement le wording d'un check-in déjà généré ») et porte le trajet sur lequel portait la question — « Trajet domicile-travail (Voiture) ». Ni la requête (`select` ligne 55) ni le type `CheckinRecord` ne le reprennent, et la ligne du suivi se réduit à « Domicile-travail · Semaine du 07/09 · Oui ». On perd donc le seul élément qui donne un sens rétrospectif à la réponse, et notamment le fait que le trajet suivi ait changé de mode entre deux bilans — ce qui est la prise de conscience elle-même.

Preuves : `src/lib/bilan-history.ts:55` ; `src/types/suivi.ts:13` ; `src/lib/database.types.ts:404`

**Recommandation.** Ajouter `trip_label` au select, au type et à la ligne affichée (ou en sous-ligne), ce qui rend aussi visible un changement de trajet suivi d'un bilan à l'autre.

**Contre-vérification.** Le titre du constat est faux tel qu'écrit : `trip_label` **est** affiché ailleurs, et à l'endroit qui compte le plus — au moment de la question (`src/components/checkin-card.tsx:56` « {trip_label} ? », et l. 68/75 dans les `accessibilityHint`), ainsi que dans les phrases du plan (`src/app/(tabs)/plan.tsx:381-382, 448`) et dans l'export de données (`20260905210000_suppression_et_export_compte.sql:124`). Ce qui manque est donc la **relecture rétrospective**, pas l'affichage. À noter que le bénéfice annoncé (« voir que le trajet suivi a changé de mode entre deux bilans ») est réel mais partiel : `trip_label` vient de `assessment_results.commute_poste_label`/`extras_poste_label`, il ne change que si le poste dominant ou son mode change au re-bilan. Côté mise en œuvre, l'ajouter en sous-ligne (et non sur la même ligne) : `checkinPeriod` a déjà `flex: 1` face au Oui/Non, une chaîne plus longue tronquerait le libellé de période.


### A5-13 — L'invitation à refaire son bilan ne connaît qu'un seuil de 182 jours — et la carte du plan annonce une saison qui n'a pas été vérifiée

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort petit

`suggestRebilan` est un simple `daysSince(latest.submittedAt) >= 182`, dupliqué tel quel dans le plan. Deux problèmes. D'abord la carte du plan affirme « Une nouvelle saison a commencé » alors que rien dans le code ne regarde une frontière de saison : 182 jours après un bilan d'avril, on est en octobre, mais 182 jours après un bilan de septembre, on est en mars, et dans tous les cas la phrase peut apparaître au milieu d'une saison. Ensuite, l'invitation ignore les deux moments où refaire un bilan a le plus de sens et que le produit sait détecter : un changement de saison réel (`season_bounds` existe déjà en base, `plan_cycles.period_start`) et un changement déclaré dans les réponses. Le texte du suivi, lui, est correct (« Ton dernier bilan a N mois »).

Preuves : `src/app/(tabs)/suivi/index.tsx:136` ; `src/app/(tabs)/plan.tsx:523` ; `src/app/(tabs)/plan.tsx:339`

**Recommandation.** Soit aligner le texte du plan sur le déclencheur réel (« Ton bilan date de N mois »), soit — mieux — déclencher sur le premier cycle de plan ouvert après le seuil, ce qui fait de l'invitation une vraie rentrée de saison. Dans les deux cas, mettre la dérivation dans `src/types/suivi.ts` plutôt que de la réécrire dans deux écrans.

**Contre-vérification.** Le constat rate l'écart réellement incontestable : la spec §3.4 demandait « Ton bilan date de {n} mois » et le code l'a remplacé par « Ton bilan date d'un moment » (plan.tsx l. 526-528), alors que le suivi, lui, affiche bien les mois (suivi/index.tsx l. 280). Restaurer le nombre de mois sur le plan supprime le décalage entre le texte et le déclencheur sans rouvrir aucune décision, et coûte une ligne. La partie « mettre la dérivation dans src/types/suivi.ts » est la vraie recommandation utile — c'est A5-14, et c'est aussi ce que §3.4 demandait explicitement.


### A5-14 — Le test demandé sur le seuil de re-bilan n'existe pas, et le seuil est dérivé en ligne dans deux écrans

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le lot 3 de v1-11 prévoit explicitement « Tests. `src/types/suivi.test.ts` : la suggestion de re-bilan (seuil inclus/exclu) » et demande que la dérivation vive dans `src/types/suivi.ts`. Le fichier de test ne couvre que `variationNote`, `keepLatestPerDay` et `daysSince` ; aucune fonction `suggestRebilan` n'existe dans `src/types/suivi.ts` — seule la constante y est, et la comparaison est réécrite dans les deux écrans. Le seul comportement non testé est donc précisément celui qui décide si l'invitation apparaît, et il est dupliqué.

Preuves : `src/types/suivi.test.ts:75` ; `docs/architecture/v1-11-navigation-et-design-system.md:389` ; `src/types/suivi.ts:68`

**Recommandation.** Exposer `doitProposerUnRebilan(submittedAt: string): boolean` dans `src/types/suivi.ts`, l'utiliser aux deux endroits et la couvrir aux bornes (181 / 182 / 183 jours).

**Contre-vérification.** À noter en plus : les deux écrans ne dérivent pas la même chose (le suivi part de `latest.submittedAt` du dernier bilan de l'historique, le plan de `assessmentDate` du cycle, avec une garde `!== null` que le suivi n'a pas) — une fonction unique `doitProposerUnRebilan(submittedAt: string | null)` devra accepter `null`, sinon le plan devra garder sa garde et la duplication ne disparaîtra qu'à moitié. Le test aux bornes 181/182/183 est simple à écrire, `daysSince` étant déjà un plancher de jours entiers.


### A5-15 — Le signal « 2 check-ins consécutifs » de la spec, qui est aussi une métrique de succès V1, n'est calculé nulle part

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

La spec §7 retient « 2 check-ins mensuels consécutifs complétés » comme signal d'engagement et la §9 en fait l'un des trois indicateurs de succès de la V1 ; v1-02 §4 en donne même la requête. L'audit v1-07 §3.2 constatait qu'il « n'est calculé nulle part » et concluait sur la création de l'écran de suivi — mais le signal lui-même n'a jamais été construit : aucune occurrence dans `supabase/migrations/`, aucune dans `src/`, et `usage_events` ne porte aucun événement qui permettrait de le reconstituer. La métrique de succès n°2 du produit est donc, aujourd'hui, non mesurable.

Preuves : `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:226` ; `docs/architecture/v1-07-audit-facteurs-et-suivi.md:344` ; `docs/architecture/v1-02-boucle-engagement.md:119`

**Recommandation.** Construire le signal côté **analyse** (vue SQL en lecture seule sur `engagement_checkins`, dans la même famille que les vues de segmentation de v1-08), pas côté écran. Il répond à « le produit accroche-t-il ? » et n'a rien à faire devant l'utilisateur.

**Décision documentée concernée.** L'afficher à l'utilisateur rouvrirait le non-goal streak/badges de la spec §2, réaffirmé par v1-06 §1 et par l'en-tête de src/app/(tabs)/suivi/index.tsx (l. 38-43). La recommandation ci-dessus l'évite en le gardant côté mesure ; si le produit veut le montrer, c'est cette décision-là qu'il faut rouvrir explicitement.

**Contre-vérification.** La conclusion « non mesurable » est fausse et c'est ce que le constat rate : `docs/architecture/v1-02-boucle-engagement.md` §4 (l. 117-130) décide explicitement que ce signal « se calcule à la demande, par boucle (`loop_type`), pas stocké », et fournit la requête toute faite ; `engagement_checkins` conserve tout l'historique avec `status`, donc la métrique est calculable à tout instant par un `select`. Ce qui manque n'est donc pas la mesurabilité mais le confort : figer la requête de v1-02 §4 en une vue `analytics.engagement_streak_by_segment` à côté des quatre vues existantes. La note `contredit_decision` du constat est juste sur le fond (l'afficher rouvrirait le non-goal streak, spec §2 et v1-06 §1) — et le handoff design va même plus loin : `docs/design/README.md` l. 182 et `spec-uiux` l. 57 autorisent une **phrase** de corps de texte, jamais un compteur. La sévérité « important » surestime : c'est un outil d'analyse absent, pas un défaut vu par un utilisateur.


### A5-17 — La provenance « compte » d'une proposition de connexion est déclarée, envoyée, et silencieusement recomptée en « resultat_transition »

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`UsageEventPropsByName.connexion_view` déclare cinq provenances dont `'compte'` et `'suivi'`. L'écran `/compte` navigue bien avec `source: 'compte'`, mais le filtrage de `connexion/index.tsx` n'accepte que `resultat_cta`, `plan` et `suivi` : toute arrivée depuis « Rattacher un compte » est donc enregistrée comme `resultat_transition`. C'est exactement le chiffre que le commentaire du type dit vouloir isoler (« comparer leurs taux de conversion, c'est répondre à : l'interstitiel mérite-t-il sa friction ? ») — il est gonflé par une source qui n'a rien à voir. Symétriquement, `'suivi'` est accepté mais plus aucun code ne l'émet depuis que le compte est sorti du suivi (v1-11 §2.5) : cette valeur vaut zéro et se lira « pas encore instrumenté ».

Preuves : `src/app/connexion/index.tsx:32` ; `src/app/compte/index.tsx:105` ; `src/types/analytics.ts:55`

**Recommandation.** Ajouter `'compte'` au filtre (idéalement en dérivant le garde de la liste du type plutôt qu'en la réécrivant), et retirer `'suivi'` du type tant qu'aucun écran ne l'émet — même règle que celle posée pour les événements dans CLAUDE.md.

**Contre-vérification.** Le constat sous-estime d'un cran : `grep -rn "'/connexion'" src/` montre que **`'plan'` est mort aussi**, pas seulement `'suivi'`. Les seuls appelants de `/connexion` sont `compte/index.tsx:105` (`compte`) et `(tabs)/suivi/bilan.tsx:229,306` (`resultat_transition`, `resultat_cta`). Sur cinq provenances déclarées, deux valent structurellement zéro et une est mal attribuée : seules deux sont justes. La règle de CLAUDE.md (« un événement déclaré qu'aucun code n'émet doit être retiré : il ne se lit pas “pas encore instrumenté”, il se lit zéro ») s'applique donc à `plan` **et** `suivi`. Meilleure forme : un tableau `const SOURCES_CONNEXION = [...] as const` dans `src/types/analytics.ts`, dérivant à la fois le type et le garde d'appartenance — la duplication actuelle est précisément ce qui a permis la dérive.


### A5-20 — L'horizon 2050 est absent de l'écran qui porte la durée

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Aucune occurrence de « 2050 » dans l'écran de suivi : le repère transport et le palier vivent uniquement sur la restitution (`src/types/palier.ts`, consommé par `(tabs)/suivi/bilan.tsx`). Le suivi ne parle donc jamais de l'horizon, alors qu'il est le seul écran qui accumule des points dans le temps et le seul endroit où une trajectoire personnelle a un sens. `showsTarget2050` existe déjà et encode la précaution nécessaire — le repère ne réapparaît que quand on passe sous la moyenne française.

Preuves : `src/app/(tabs)/suivi/index.tsx:133` ; `src/types/palier.ts:108`

**Recommandation.** Réutiliser `showsTarget2050` pour ajouter, quand et seulement quand la condition est remplie, une phrase d'horizon sous le graphe. En mots, jamais en barre de comparaison ni en compte de paliers restants.

**Décision documentée concernée.** src/types/palier.ts (§ « Ce que le palier remplace ») a délibérément retiré la barre « Repère 2050 » de la restitution : afficher 2050 côté suivi doit rester textuel et conditionné par `showsTarget2050`, sans quoi la décision est rouverte.

**Contre-vérification.** Le constat lit `showsTarget2050` de façon incomplète : sur `/suivi/bilan` la barre 2050 s'affiche sous la condition `(montreRepere2050 || !palier) && !palier?.isTarget2050` (l.410) — elle est aussi masquée quand le palier *est* le repère, parce que c'est alors le palier qui le porte (`label={palier.isTarget2050 ? 'Repère transport 2050' : …}`, l.396). Une phrase côté `/suivi` qui ne reprendrait que `showsTarget2050` dirait donc 2050 deux fois à la personne la plus proche du repère. Meilleure recommandation : ne pas dupliquer la règle mais l'exporter (une seule fonction dans `src/types/palier.ts`, testée), et formuler la phrase du suivi en termes de trajectoire entre bilans plutôt que de niveau — c'est le seul apport que `/suivi/bilan` ne peut pas rendre, puisqu'il ne connaît qu'un point.


### A5-21 — Le suivi n'a pas de largeur maximale : sur navigateur large, le graphe s'étire sans limite

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Les trois autres surfaces web du produit (`legal-page.tsx`, `compte/index.tsx`, `compte/suppression.tsx`) contraignent leur contenu à `MaxContentWidth` ; le suivi n'a que du padding sur son `scrollContent`. Sur un écran large, les barres de 14 px de haut sont étirées sur toute la fenêtre et les lignes de check-in mettent la période et le « Oui » aux deux extrémités de l'écran, ce qui rend l'appariement visuel difficile. L'app est déployée sur le web (Vercel) et `/suivi` y répond, ce n'est donc pas une surface théorique.

Preuves : `src/app/(tabs)/suivi/index.tsx:320` ; `src/app/compte/index.tsx:156`

**Recommandation.** Envelopper le contenu défilant dans un conteneur `maxWidth: MaxContentWidth, alignSelf: 'center'`, comme les autres écrans (le plan a le même besoin).

**Contre-vérification.** Le constat sous-estime la portée d'un cran : ce n'est pas seulement `/plan` qui a le même besoin, c'est aussi `/suivi/bilan` — l'écran de restitution, dont les barres de comparaison (moyenne française / repère 2050) sont précisément celles où un étirement fausse la lecture visuelle du rapport. Deux détails d'implémentation : le conteneur contraint doit être *à l'intérieur* du `ScrollView` (la `BandeHaute` est hors du scroll, l.142, et doit rester pleine largeur), et le pied `footer` (l.298-310) est hors du `ScrollView` lui aussi — il faudra le contraindre séparément, sinon le lien « Refaire mon bilan » reste centré sur la fenêtre pendant que le contenu est centré sur 800 px. Le geste le plus propre est un style partagé dans `src/constants/theme.ts` plutôt qu'une quatrième recopie du triplet `width/maxWidth/alignSelf`.


## A6 — compte, connexion, suppression, pages légales, feedback

**Résumé du lecteur.** La zone est l'une des mieux tenues du dépôt sur le fond : le modèle « lier une identité à la session anonyme » est respecté sans exception, la non-divulgation de l'existence d'un compte est appliquée des deux côtés (retrouver et suppression), les erreurs d'auth sont reconnues à leur code, et la suppression comme l'export s'appuient sur la cascade plutôt que sur des listes de tables. Ce qui casse, ce sont les **bords** : l'annulation de Google est comptée comme une réussite, un lien expiré ne dit rien du tout, une panne réseau affiche « Regarde tes emails », et l'écran « Toi » annonce hors ligne à une personne rattachée qu'elle n'a pas de compte. Deuxième famille, plus insidieuse : les textes de référence ont pris du retard sur le produit — la page publique de suppression et la politique de confidentialité envoient vers « Mon suivi › Mes données », écran qui n'existe plus depuis v1-11, et la durée de conservation annoncée (« 90 jours après sa création ») contredit la purge sur l'inactivité livrée en v1-10. Côté accompagnement durable, deux angles morts symétriques : ce qu'on perd en restant sans compte n'est jamais dit dans l'app, et la confirmation « Ton compte est rattaché » ne s'affiche pas dans le cas exact où elle devait le faire, le retour depuis la messagerie. Enfin le bouton Google est resté la pastille grise de la maquette, sur l'écran qui demande le geste de confiance le plus fort du produit.

**Points forts à ne pas casser**

- **La non-divulgation de l'existence d'un compte est tenue de bout en bout, et expliquée à la personne.** `shouldCreateUser: false`, le 422 `otp_disabled` traité comme un succès, la réponse identique dans les deux cas — et la carte « Le lien ne crée jamais de compte » (`retrouver.tsx` l.157-165) qui dit *pourquoi* on ne répond pas, au lieu de laisser le silence passer pour de la maladresse. À ne surtout pas « améliorer » en distinguant les deux cas.
- **Les erreurs d'auth sont reconnues à leur code, jamais à leur message**, avec la trace de la vérification contre l'API (`estLimiteDEnvoi`, `adresseDejaRattachee`, `identiteDejaRattachee` dans `src/types/connexion.ts`, testés en `connexion.test.ts`). C'est ce qui fait qu'une adresse déjà prise devient un aiguillage vers « Retrouver mon compte » au lieu d'un message d'erreur anglais.
- **Le découpage `src/types/*` pur et testé / `src/lib/*` requêtes est respecté sur toute la zone**, et il porte les trois dérivations où une erreur serait silencieuse : `etatDuCompte` (une session anonyme vide n'est pas un compte à supprimer), `etatDuRattachement` (l'entre-deux « adresse écrite, pas encore confirmée ») et `adresseSemblePlausible`. Six tests couvrent précisément les cas limites coûteux.
- **La suppression est structurelle et le départ n'est pas rendu pénible.** Une seule ligne supprimée dans `auth.users` et la cascade fait le reste (aucune énumération de tables à maintenir), `export_my_data` en `security definer` pour ne pas rendre un export silencieusement incomplet, et le refus explicite de tout écran de rétention (`mon-compte.tsx` l.21-24). Le jeton push volontairement exclu de l'export, avec sa justification, est du même niveau de soin.
- **Les pages légales sont écrites à partir du code et non de modèles recopiés** : chaque affirmation est tracée à une colonne, une fonction ou une décision, et le régime LCEN « éditeur non professionnel » est documenté dans `src/constants/editeur.ts` — y compris ce qui est délibérément absent (statut juridique, médiateur). Le lien vers le CV en vrai `Link` d'Expo Router, vérifié dans le HTML statique, relève de la même exigence.
- **`MessageInline` avec `role="alert"` remplace les `Alert.alert`** en gardant l'annonce vocale que la boîte système fournissait gratuitement, et les écrans de connexion/suppression utilisent des états de composant plutôt qu'un callback d'alerte — le piège `window.alert()` du web est neutralisé partout où une action suit la fermeture.

### A6-1 — Annuler la connexion Google est traité comme une réussite : proposition marquée vue, faux « connexion_success », arrivée sur le plan

`technique` · sévérité **important** · verdict **confirme** · effort petit

Sur natif, `linkGoogleIdentity` rend volontairement `{ error: null }` quand la fenêtre d'auth est fermée ou annulée (« pas une vraie erreur à afficher »). L'écran, lui, ne teste que `error` : tout ce qui n'est pas une erreur est traité comme un rattachement réussi. Une personne qui referme le sélecteur de compte Google voit donc l'app émettre `connexion_success` avec `method: 'google'`, écrire la marque locale « proposition vue » et la renvoyer sur `/plan` — sans compte, sans un mot, et sans que la proposition plein écran ne revienne jamais sur cet appareil (la bannière discrète prend le relais). Trois dégâts : l'entonnoir de conversion qui décide de la suite du produit compte les abandons comme des succès ; le seul moment fort de l'argumentaire « garde ce résultat » est consommé pour rien ; et la spec §5 comme `docs/design/README.md` demandent explicitement « message neutre, retour à l'écran de restitution, sans blocage » sur une annulation Google — ici il n'y a ni message ni retour.

Preuves : `src/lib/auth.ts:46` ; `src/app/connexion/index.tsx:79` ; `docs/design/README.md:218`

**Recommandation.** Distinguer trois issues au lieu de deux dans `linkGoogleIdentity` : succès, erreur, annulation (par exemple `{ statut: 'annule' }`). Sur annulation, l'écran reste où il est, ne marque rien, n'émet rien — au plus un mot neutre du type « Tu peux réessayer quand tu veux ». Ne réserver `connexion_success` et `markConnexionProposalSeen` qu'au retour d'une session effectivement liée (vérifiable par `getUser()` après `setSession`).

**Contre-vérification.** Le constat rate un second effet du même défaut : le cas web. `linkIdentity` en mode web rend `{ error: null }` immédiatement puisque la redirection navigateur n'a pas encore eu lieu — l'écran émet donc aussi `connexion_success` et marque la proposition vue AVANT tout retour d'OAuth, y compris si l'utilisateur annule côté Google. Le correctif ne doit donc pas se limiter à la branche native : la vérification « session effectivement liée » (getUser + `is_anonymous === false`, ou `identities` contenant google) doit gouverner l'émission de l'événement sur les deux plateformes. `lireEtatDuRattachement()` (src/lib/compte.ts l.71) fait déjà exactement ce test et peut être réutilisé tel quel.


### A6-2 — La page publique de suppression et la politique de confidentialité envoient vers un écran qui n'existe plus (« Mon suivi › Mes données »)

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Depuis v1-11 §2.5, le compte, l'export et la suppression ont quitté `/suivi` pour l'écran « Toi » (`/compte`). Les deux surfaces qui donnent les instructions officielles — la page web de suppression exigée par Google Play, et la section « Tes droits » de la politique de confidentialité — pointent toujours vers « l'écran Mon suivi, section Mes données ». Quelqu'un qui suit ces instructions ouvre `/suivi`, n'y trouve rien (l'écran le dit lui-même : « Le canal de retour et le compte ont rejoint l'écran Toi ») et peut conclure que le chemin de suppression n'existe pas. C'est précisément le point qu'un examinateur Play vérifie, et c'est aussi une information RGPD art. 12 (« modalités d'exercice des droits ») devenue fausse.

Preuves : `src/app/compte/suppression.tsx:147` ; `src/app/confidentialite.tsx:237` ; `src/app/(tabs)/suivi/index.tsx:296`

**Recommandation.** Remplacer les trois occurrences par « l'écran Toi, section Mes données » (confidentialite.tsx l.237 et l.257, suppression.tsx l.147). Tant qu'à faire : ces libellés d'écran mériteraient de vivre à côté de `PAGE_TITLES`, seul endroit déjà indexé par chemin, pour qu'un renommage de route les emporte.

**Contre-vérification.** Il y a une quatrième occurrence que le constat ne compte pas dans la même famille mais qui est fausse pour la même raison : confidentialite.tsx l.257, « désactiver les rappels par email à tout moment depuis l'écran Mon suivi » — le réglage `ChoixDeRappel` est monté dans src/app/compte/index.tsx l.114, pas dans /suivi. Le commentaire d'en-tête de src/components/compte/mon-compte.tsx l.13 (« Section Mes données de /suivi ») est également périmé. Corriger les quatre libellés + le commentaire.


### A6-3 — La politique de confidentialité annonce une purge « 90 jours après la création » alors que la purge se fait sur l'inactivité

`technique` · sévérité **important** · verdict **confirme** · effort petit

La migration du chantier B (v1-10 §2.B) a corrigé `purge_stale_anonymous_accounts()` pour supprimer sur l'inactivité (le plus récent de : création, dernier `usage_event`, dernier bilan, dernier check-in répondu, dernier retour) et non sur l'âge du compte. La politique de confidentialité, elle, décrit toujours l'ancien comportement, et de la façon la plus explicite possible : « supprimée automatiquement 90 jours après sa création ». Une durée de conservation est une mention obligatoire (RGPD art. 13-2-a) : celle affichée est plus courte que la réalité, donc fausse dans le sens qui engage. Accessoirement, l'en-tête du fichier documente lui-même « purge à 90 jours -> purge_stale_anonymous_accounts() » sans la nuance.

Preuves : `src/app/confidentialite.tsx:196` ; `supabase/migrations/20260907093000_purge_anonyme_sur_inactivite.sql:51` ; `supabase/migrations/20260907093000_purge_anonyme_sur_inactivite.sql:56`

**Recommandation.** Écrire « supprimée automatiquement après 90 jours sans aucune activité (app ouverte, bilan, réponse à un point de suivi, retour envoyé) » aux deux endroits (l.140-142 et l.196), et corriger la même phrase dans `/conditions` l.79. Mettre à jour le commentaire d'en-tête l.14.

**Contre-vérification.** Nuance utile pour le correctif : les deux autres endroits cités ne sont pas faux au même degré. confidentialite.tsx l.140-142 (« supprimées automatiquement après 90 jours ») et conditions.tsx l.79 (« supprimé automatiquement après 90 jours ») sont seulement imprécis — seule la l.196 énonce le point de départ erroné. Le commentaire d'en-tête l.14 (« purge à 90 jours -> purge_stale_anonymous_accounts() ») mérite la nuance parce que ce bloc s'annonce comme la garantie que chaque phrase est vérifiable dans le code : c'est justement ce contrôle qui a manqué ici.


### A6-5 — La confirmation « Ton compte est rattaché » ne s'affiche pas quand on revient de sa messagerie — exactement le cas où elle devait s'afficher

`technique` · sévérité **important** · verdict **confirme** · effort petit

Le rattachement se termine hors de l'app : on clique le lien dans sa boîte mail, puis on revient sur Ramille. Or l'effet qui annonce le rattachement dans `/plan` a un tableau de dépendances vide, et `useRafraichirAuRetour` ne pilote que `refreshKey`, lu par le seul effet de chargement des données. Le plan étant un écran d'onglet que react-navigation garde monté, et l'app survivant à l'arrière-plan, le retour depuis la messagerie ne remonte jamais l'effet : la boucle ouverte par « Vérifie tes emails » ne se referme pas, ce qui est précisément le défaut que l'issue #62 était censée corriger. C'est aussi le piège documenté en CLAUDE.md (« tout écran d'onglet dont le contenu peut changer côté serveur doit utiliser useRafraichirAuRetour »), appliqué ici au chargement mais pas à l'annonce.

Preuves : `src/app/(tabs)/plan.tsx:140` ; `src/app/(tabs)/plan.tsx:154` ; `src/hooks/use-rafraichir-au-retour.ts:39`

**Recommandation.** Faire dépendre l'effet d'annonce de `refreshKey` (ou lui donner son propre `useRafraichirAuRetour`), pour qu'il rejoue au retour au premier plan. La marque locale `aVuRattachementAnnonce` garantit déjà qu'il ne s'affichera qu'une fois.

**Contre-vérification.** Le constat sous-estime un peu son propre cas : le scénario le plus fréquent n'est pas le deep link. Le lien de confirmation de `linkEmail` (`updateUser({ email })`, src/lib/auth.ts l.83-86) ne porte aucun `emailRedirectTo` — il retombe sur la Site URL, donc s'ouvre dans le navigateur, pas dans l'app. L'utilisateur revient ensuite à Ramille à la main, sans aucune URL entrante : il n'y a alors strictement rien pour remonter l'effet, même pas le `router.replace('/')` du layout. Le correctif proposé (dépendre de `refreshKey`, ou un `useRafraichirAuRetour` dédié) est le bon, et il est le seul chemin dans ce cas.


### A6-6 — Un lien de connexion expiré ou refusé n'affiche rien sur natif : la personne revient dans l'app et rien ne se passe

`technique` · sévérité **important** · verdict **confirme** · effort moyen

Le lien reçu par email est le seul chemin vers un compte existant. Sur natif il remonte par `Linking.useURL()` dans le layout racine, qui ne réagit qu'aux URL contenant `access_token=` : un lien expiré ou déjà consommé revient avec `error=access_denied&error_code=otp_expired` dans le fragment, donc la condition est fausse et **aucun code ne s'exécute**. Et quand `createSessionFromUrl` échoue pour une autre raison, le seul traitement est un `console.error`. Dans les deux cas la personne a fait le bon geste, se retrouve sur l'écran d'où elle venait, et rien ne lui dit ni ce qui s'est passé ni qu'il faut redemander un lien. L'écran d'envoi prévient bien que « le lien expire au bout d'un moment » — mais au moment où c'est utile, l'app est muette.

Preuves : `src/app/_layout.tsx:78` ; `src/app/_layout.tsx:80` ; `src/app/connexion/retrouver.tsx:175`

**Recommandation.** Traiter aussi les URL entrantes portant `error_code`/`error_description` et router vers `/connexion/retrouver` dans un état « ce lien n'est plus valable, en voici un nouveau » (adresse pré-remplie si elle est connue). Même chose pour l'échec de `createSessionFromUrl`. Sur web, `detectSessionInUrl` échoue tout aussi silencieusement : la racine peut lire le fragment d'erreur avant de rediriger.

**Contre-vérification.** Deux précisions sur le correctif. (1) Élargir la condition à `error_code=`/`error=` ne suffit pas seul : `QueryParams.getQueryParams` lit le fragment, mais il faut router hors du layout racine avec précaution — un `router.replace` déclenché depuis cet effet pendant le montage de la pile est le genre d'appel qui a déjà coûté un cycle ici (cf. le commentaire de src/app/index.tsx sur l'effet sans catch). Préférer un état partagé lu par `/connexion/retrouver` plutôt qu'une navigation immédiate. (2) L'adresse « pré-remplie si elle est connue » est à manier avec la règle de non-divulgation de src/types/connexion.ts : la remplir depuis une préférence locale est sans risque, la déduire d'une réponse serveur ne l'est pas.


### A6-7 — Les marques locales survivent à la suppression du compte : ni la proposition de connexion, ni la feuille des rappels, ni l'annonce de rattachement ne reviendront jamais sur cet appareil

`technique` · sévérité **important** · verdict **confirme** · effort petit

`deleteMyAccount` supprime la ligne `auth.users` (tout le reste cascade) puis renvoie vers la racine, qui recrée une session anonyme. Rien n'efface les clés AsyncStorage : `traceverte.connexion_proposal_seen.v1`, `traceverte.rattachement_annonce.v1`, `traceverte.rappels_proposes.v1`, et le brouillon `traceverte.bilan_draft.v1`. Conséquences pour quelqu'un qui repart de zéro sur le même appareil : la proposition de connexion plein écran ne s'affiche plus (seule la bannière discrète subsiste), la feuille des rappels ne s'ouvre plus après « C'est noté », et la confirmation de rattachement d'un futur compte ne s'affichera jamais. Le produit reste utilisable, mais l'appareil est durablement amputé de ses trois moments de renforcement — invisible, puisque tout a l'air normal. Et un brouillon de questionnaire en cours (distances, zone d'habitation, motorisation) survit à un écran qui vient d'annoncer que « tout ce qui s'y rattachait » a été supprimé définitivement.

Preuves : `src/components/compte/mon-compte.tsx:41` ; `src/lib/compte.ts:106` ; `src/lib/connexion-prefs.ts:10` ; `src/app/compte/suppression.tsx:191`

**Recommandation.** Ajouter à `deleteMyAccount` (et à lui seul, pour ne pas toucher au reste) un effacement des clés locales du produit — brouillon compris — après le succès du RPC. Le préfixe `traceverte.` étant commun à toutes, une fonction `effacerLesMarquesLocales()` dans `connexion-prefs`/`bilan-draft` suffit, sans renommer aucune clé.

**Contre-vérification.** Le constat sous-estime un point et en surestime un autre. Surestime : les trois « moments de renforcement » perdus sont un dommage faible et rare (il faut supprimer puis recommencer sur le même appareil). Sous-estime : le brouillon est le seul des quatre à contenir des réponses de la personne (distances, zone, motorisation) et il ne survit pas seulement — il **repréremplit** le questionnaire suivant (ordre brouillon > dernier bilan > vide, src/lib/bilan-history.ts / src/app/bilan/index.tsx:61), juste après un écran qui affirme une suppression définitive. C'est là que le défaut est réel, pas dans les marques d'UI. Attention à la mise en œuvre : effacer côté `deleteMyAccount` seul suffit pour `mon-compte.tsx`, mais la page web `/compte/suppression` passe par le même appel — bon endroit unique ; en revanche l'effacement doit se faire **après** le succès du RPC et rester best-effort (try/catch), sinon un AsyncStorage indisponible sur web ferait échouer une suppression déjà effectuée côté serveur. Un test dans `src/types/*` ne peut pas couvrir ça (module impur) : la garde utile est le regroupement des quatre clés en un seul module d'inventaire, pour qu'une cinquième clé future ne soit pas oubliée.


### A6-8 — Hors réseau, l'écran « Toi » annonce à une personne rattachée qu'elle n'a pas de compte, et lui propose d'en créer un

`technique` · sévérité **important** · verdict **confirme** · effort petit

`lireEtatDuRattachement` passe par `getUser()`, qui est un aller-retour réseau (choix assumé, pour voir la bascule de `is_anonymous`). En cas d'échec — hors ligne, Supabase indisponible — l'écran retombe sur `{ kind: 'local' }`, c'est-à-dire l'état le plus affirmatif des trois : « Ton bilan reste sur cet appareil » plus un bouton « Rattacher un compte ». Une personne qui a un compte depuis des mois lit donc qu'elle n'en a pas, au seul écran du produit qui parle de son compte. Les deux autres écrans qui font la même lecture retombent, eux, sur des états neutres (`saisie`, `inconnu`) : c'est ici seul que le repli affirme quelque chose de faux.

Preuves : `src/app/compte/index.tsx:37` ; `src/app/compte/index.tsx:100` ; `src/app/connexion/retrouver.tsx:70`

**Recommandation.** Ajouter un quatrième état « indisponible » qui n'affirme rien (« On n'a pas pu vérifier ton compte à l'instant. ») et ne montre pas le bouton de rattachement, ou à défaut retomber sur la lecture locale de `getSession()` plutôt que sur `local`.

**Contre-vérification.** Le constat rate le mécanisme exact, et cela change le correctif : `supabase.auth.getUser()` ne **lève** pas sur panne réseau, il renvoie `{ data: { user: null }, error }`. Le `.catch()` cité ligne 39 n'est donc probablement jamais atteint — c'est `lireEtatDuRattachement` qui, ne lisant que `data.user`, rend `etatDuRattachement(null)` = `{ kind: 'local' }` (src/lib/compte.ts:74-75, src/types/compte.ts:28). Corriger le seul `.catch()` de l'écran laisserait donc le défaut intact. Le correctif doit être dans `lireEtatDuRattachement` : lire aussi `error` et distinguer « pas de session du tout » (legitime `local`) de « on n'a pas pu vérifier » (nouvel état). Le repli sur `getSession()` proposé en secours est acceptable mais imparfait — le commentaire de src/lib/compte.ts:65-68 rappelle que la session en cache peut encore porter `is_anonymous: true` après confirmation ; il ne faut donc l'utiliser que pour affirmer `rattache`, jamais pour affirmer `local`. Le quatrième état étant purement dérivé, il se teste dans src/types/compte.test.ts sans toucher au réseau.


### A6-12 — Une panne réseau à l'envoi du lien affiche « Regarde tes emails » : on attend un message qui ne partira jamais

`technique` · sévérité **important** · verdict **confirme** · effort petit

Sur les deux écrans qui envoient un lien d'accès, seule la limite d'envoi reçoit un traitement distinct ; tout le reste bascule sur l'écran d'attente. La règle de non-divulgation qui motive ce choix ne concerne que la distinction « adresse connue / inconnue » (422 `otp_disabled`) — elle n'exige pas de confondre un envoi accepté avec un échec de transport (hors ligne, 500, DNS). Résultat : quelqu'un dans le métro appuie sur « Recevoir le lien », lit « Si un compte Ramille existe avec cette adresse, un lien vient d'y être envoyé », et attend. C'est le pire endroit du produit pour un échec muet, puisque c'est le seul chemin vers un compte existant.

Preuves : `src/app/connexion/retrouver.tsx:103` ; `src/app/compte/suppression.tsx:88` ; `src/types/connexion.ts:23`

**Recommandation.** Ajouter au module pur `types/connexion.ts` un prédicat `estPanneDeTransport(error)` (erreur réseau du SDK, status ≥ 500, absence de status) et n'afficher l'écran d'attente que pour les autres cas ; sur panne, un `MessageInline` neutre « L'envoi n'a pas pu partir. Vérifie ta connexion et réessaie. ». Le 422 `otp_disabled` continue de mener à l'écran d'attente, inchangé.

**Contre-vérification.** Le correctif proposé est bon mais son critère est risqué tel qu'écrit : « absence de status » ne doit pas suffire, et surtout le prédicat doit être une **liste blanche d'échecs**, pas un fourre-tout — sinon un futur code d'erreur métier (comme `otp_disabled`, qui porte `status: 422` et un `code`) finirait par afficher « réessaie » et redeviendrait un signal de divulgation. Formulation sûre : panne de transport = erreur retryable du SDK (`AuthRetryableFetchError`, `error.name`/`code` correspondant) ou `status >= 500` ; tout le reste, y compris `status` 400/422 et l'absence d'erreur, mène à l'écran d'attente inchangé. À faire dans `src/types/connexion.ts` avec ses cas dans `src/types/connexion.test.ts` (dont un cas non-régression explicite : `{ code: 'otp_disabled', status: 422 }` → `false`), et à appliquer aux **deux** écrans, la page web de suppression comprise, qui est le chemin utilisé par quelqu'un qui n'a plus l'app.


### A6-15 — Une session invalidée redevient un visiteur anonyme neuf, sans un mot : l'écran « session expirée » de la spec n'existe pas

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

`ensureSession()` ne distingue pas « pas encore de session » de « la session n'est plus valable » : si `getSession()` ne rend rien (jeton de rafraîchissement refusé, compte supprimé depuis un autre appareil, session anonyme purgée après 90 jours d'inactivité), elle crée immédiatement une nouvelle session anonyme. La racine ne trouve alors aucun bilan complété et route vers l'onboarding. La personne revient donc dans une app qui a l'air neuve, avec un questionnaire vierge et zéro explication — le scénario le plus coûteux possible pour un produit dont la promesse est l'accompagnement dans la durée. La spec §5 et `docs/design/README.md` §4.3 prévoient pourtant l'écran correspondant (« Reconnecte-toi pour retrouver ton bilan », bouton Google + lien email, aucun texte de reproche) ; le commentaire du bouton Google l'annonce même comme son deuxième usage. Aucun code ne l'implémente.

Preuves : `src/lib/supabase.ts:83` ; `src/app/index.tsx:57` ; `docs/design/README.md:208`

**Recommandation.** Faire remonter à `ensureSession` la différence entre « aucune session » et « session refusée » (l'erreur de rafraîchissement est disponible), et router ce second cas vers un écran minimal proposant Google et `/connexion/retrouver`. À défaut d'écran dédié : depuis l'onboarding, rendre « J'ai déjà un compte » plus visible pour quelqu'un qui n'en est visiblement pas à sa première ouverture.

**Contre-vérification.** Deux corrections factuelles au constat, qui n'annulent pas le fond. (1) Le cas « session anonyme purgée après 90 jours » est le mauvais exemple : une session anonyme purgée n'a par définition aucun compte à retrouver, l'écran de reconnexion n'aurait rien à lui proposer — et la purge est désormais sur l'inactivité, pas sur l'âge (`supabase/migrations/20260907093000_purge_anonyme_sur_inactivite.sql`). Le seul cas où l'écran a du sens est celui d'un compte **rattaché** dont le jeton est refusé (compte supprimé ailleurs, révocation, stockage local vidé). (2) `getSession()` ne valide pas le jeton auprès du serveur : la bascule ne se produit qu'après un échec de rafraîchissement par le SDK, ce qui rend le scénario moins fréquent que le constat le laisse croire. (3) La solution de repli proposée est **déjà faite** : « J'ai déjà un compte » figure sur l'accueil de l'onboarding (`src/components/onboarding/etape-accroche.tsx` l.58-67), et v1-10 §2.D dit que c'est précisément ce lien qui « supprime la collision au lieu de la gérer ». Le vrai reste à faire est donc étroit : remonter le motif de perte de session (écouter `onAuthStateChange` / `TOKEN_REFRESHED` en échec, ou marquer localement qu'un compte rattaché a existé) et rediriger vers `/connexion/retrouver` avec un `source` dédié — pas construire un écran neuf.


### A6-17 — Ce qu'une personne perd en restant sans compte n'est jamais dit dans l'app — seulement dans les pages légales

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Les surfaces qui parlent du sans-compte disent toutes la même chose, au présent : « Ton résultat reste accessible sur cet appareil », « Ton bilan reste sur cet appareil ». C'est vrai et sans reproche, mais incomplet : ce bilan disparaît après 90 jours sans activité, et il ne survit ni au changement de téléphone ni à un nettoyage du navigateur. Cette information n'existe qu'au fond de `/confidentialite`. Pour un produit dont l'objectif est l'accompagnement sur des mois et des années, c'est l'argument principal de la connexion — et il est absent de l'écran qui la propose, dont le corps de texte ne parle que de synchronisation multi-appareil.

Preuves : `src/app/connexion/index.tsx:99` ; `src/app/compte/index.tsx:100` ; `src/app/confidentialite.tsx:140`

**Recommandation.** Ajouter une phrase factuelle et non alarmante là où le choix se fait — par exemple sous « Continuer sans compte » : « Sur cet appareil seulement : si tu changes de téléphone ou si tu ne reviens pas pendant trois mois, ton bilan ne te suivra pas. » Registre du constat, jamais de la menace, dans la même veine que « On peut le refaire ensemble après » de l'écran de collision.

**Contre-vérification.** Attention au texte exact : la phrase proposée (« si tu ne reviens pas pendant trois mois ») est la bonne formulation, mais les pages légales, elles, sont désormais **fausses** dans l'autre sens — `confidentialite.tsx` l.196 dit « 90 jours après sa création » alors que `purge_stale_anonymous_accounts()` a été refaite le 07/09 pour purger sur l'inactivité (`supabase/migrations/20260907093000_purge_anonyme_sur_inactivite.sql`, chantier B de v1-10 §2.B). Corriger la page légale en même temps qu'on ajoute la phrase produit, sinon les deux surfaces se contredisent — et la version légale actuelle promet une suppression plus agressive que le code, ce qui est le sens le plus coûteux pour la confiance. Le vrai argument de la connexion à mettre en avant reste le changement de téléphone / le nettoyage de navigateur, qui eux ne dépendent d'aucun délai.


### A6-18 — Sur mobile, « Télécharger mes données » ne produit pas de fichier et annonce « Export généré » même si rien n'a été partagé

`technique` · sévérité **important** · verdict **confirme** · effort moyen

L'écran promet « l'intégralité de ce que Ramille sait de toi, dans un fichier JSON », et la politique de confidentialité parle elle aussi d'un fichier. Sur natif, l'export passe par `Share.share({ message: json })` : le JSON entier est envoyé comme **texte de message**, pas comme fichier — beaucoup d'applications réceptrices le tronquent ou refusent une charge de cette taille, et le résultat n'est ni nommé ni réimportable. De plus la feuille de partage résout normalement quand on la referme sans rien choisir : le message « Export généré. » s'affiche alors qu'aucune donnée n'a quitté l'app. Le droit à la portabilité (art. 20) demande un format « structuré, couramment utilisé et lisible par machine », ce que le chemin web respecte et le chemin natif dégrade — or Android est la cible de la V1.

Preuves : `src/lib/compte.ts:44` ; `src/components/compte/mon-compte.tsx:35` ; `src/components/compte/mon-compte.tsx:58`

**Recommandation.** Écrire le JSON dans un fichier du cache (`expo-file-system`) et le partager en `url` plutôt qu'en `message`, ou à défaut adapter la promesse sur mobile. Et n'annoncer « Export généré » que si `Share.share` rend `action === sharedAction` — sinon rester muet.

**Décision documentée concernée.** La dépendance `expo-file-system` avait été écartée (« les ajouter pour un écran ne se justifie pas », src/lib/compte.ts l.28-30) ; rouvrir ce choix impose un nouveau build natif (cf. CLAUDE.md).

**Contre-vérification.** Sévérité relevée : Android est la seule cible de la V1, donc c'est le chemin **par défaut** de l'export qui dégrade la portabilité (art. 20) et le seul écran de conformité qui ment sur son résultat — pas un cas de bord. Deux réserves sur la recommandation. (1) Le test `action === Share.sharedAction` n'est pas fiable sur Android : `Share.share` y renvoie systématiquement `sharedAction` (le `dismissedAction` est un comportement iOS), donc ce garde-fou ne réglera pas le faux « Export généré » sur la plateforme visée. Formulation neutre plus sûre : « Ton export est prêt » / « Choisis où l'enregistrer », qui reste vraie dans les deux cas. (2) L'alternative sans dépendance existe et évite le nouveau build natif : reformuler la promesse sur natif (`Platform.OS`) au lieu de promettre un fichier, en attendant que `expo-file-system` entre à l'occasion d'un build déjà prévu. La note du lecteur sur `contredit_decision` est exacte — le commentaire l.28-30 écarte explicitement ces dépendances — mais ce n'est pas une décision d'architecture actée dans un `v1-0N`, seulement un arbitrage de commodité local, donc rouvrable.


### A6-4 — Les rappels par notification ont ajouté deux sous-traitants sans que la date de mise à jour des pages légales bouge

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

`UPDATED_AT` vaut « 5 septembre 2026 » sur les deux pages légales, alors que `confidentialite.tsx` a été modifiée par les deux PR du chantier E (07-09/09) pour déclarer Expo (transfert hors UE, clauses contractuelles types), Firebase Cloud Messaging et la conservation du jeton d'appareil. Ajouter un destinataire de données et un transfert hors UE est exactement le « changement significatif » que la page promet d'annoncer, et la date affichée est le seul repère qu'a le lecteur pour voir qu'elle a changé. La page se contredit donc elle-même : « La date de dernière mise à jour figure en haut de cette page. »

Preuves : `src/app/confidentialite.tsx:24` ; `src/app/confidentialite.tsx:165` ; `src/app/confidentialite.tsx:285`

**Recommandation.** Passer `UPDATED_AT` au 9 septembre 2026 sur `/confidentialite`. Envisager une garde légère (test) qui compare la date déclarée à la date du dernier commit touchant le fichier — c'est le seul champ de ces pages que personne ne pense à toucher.

**Contre-vérification.** Deux compléments : (1) `src/app/conditions.tsx` l.19 porte la même constante à la même date, et ce fichier n'a pas bougé depuis — la laisser au 5 septembre y est correct, il ne faut donc pas « aligner les deux » par réflexe. (2) La garde proposée (comparer la date déclarée au dernier commit du fichier) est fragile : un commit purement cosmétique la ferait échouer. Une garde plus juste serait de vérifier que la liste des sous-traitants déclarée dans `definitions` couvre les canaux réellement actifs (`profiles.reminder_channel`, expo-notifications présent dans package.json) — c'est le fait légal, pas la date.


### A6-9 — Le bouton Google est resté le placeholder de la maquette : pastille grise, libellé annoncé différent du libellé affiché

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

La spec §5 et le canvas demandent le composant Google officiel, non personnalisé — « l'un des rares endroits où un standard externe prime sur l'identité du produit, pour la confiance et la reconnaissance immédiate ». Le composant livré affiche une pastille de 20 px de la couleur de fond à la place du logo, et son propre commentaire le dit (« pastille neutre en placeholder dans la maquette, à remplacer par le bouton officiel »). Sur l'écran qui demande le geste de confiance le plus fort du produit, un bouton sans logo Google est à la fois moins reconnaissable et non conforme aux règles de marque de Google (identity guidelines, contrôlées à la validation de l'écran de consentement OAuth). Deuxième point, plus petit mais du même ordre : `accessibilityLabel` annonce « Continuer avec Google » quand le texte visible dit « Se connecter avec Google » — l'écart exact que `TextLink` a été créé pour supprimer partout ailleurs.

Preuves : `src/components/auth/google-button.tsx:7` ; `src/components/auth/google-button.tsx:19` ; `src/components/auth/google-button.tsx:27`

**Recommandation.** Intégrer le « G » officiel (SVG inline, pas de dépendance ni de fichier externe : le reste du produit dessine déjà ses SVG à la main) aux couleurs et proportions imposées, et supprimer l'`accessibilityLabel` pour que le libellé annoncé soit le texte affiché.

**Contre-vérification.** Deux réserves sur l'argumentaire, qui font baisser la sévérité. (1) La justification « contrôlées à la validation de l'écran de consentement OAuth » est fausse : la vérification Google porte sur le domaine, le logo et la politique de confidentialité de l'écran de consentement, pas sur l'apparence d'un bouton dans une app tierce. Le vrai argument est celui du handoff (reconnaissance et confiance) et des Google branding guidelines, pas un blocage de publication. (2) La recommandation redessine le « G » à la main, ce que le handoff écarte nommément (« ni couleur, ni typo, ni logo redessiné ») ; en pratique c'est le seul chemin viable ici — le composant officiel est un module natif, et une dépendance native impose un build EAS (CLAUDE.md), sur un codebase qui doit aussi tourner en web. Il faut donc reprendre l'asset officiel au trait exact (les quatre couleurs et les proportions imposées), pas un « G » approximatif, et le dire dans le commentaire pour que le prochain lecteur ne le « nettoie » pas. Le point accessibilité, lui, est net et indépendant : supprimer l'`accessibilityLabel` suffit, c'est exactement la règle qui a motivé `TextLink`.


### A6-10 — L'entrée vers la connexion depuis « Toi » est comptée comme l'interstitiel post-bilan

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`src/types/analytics.ts` déclare cinq provenances pour `connexion_view`, dont `compte`, et l'écran « Toi » passe bien `source: 'compte'`. Mais la liste blanche de l'écran de connexion ne retient que `resultat_cta`, `plan` et `suivi` : tout le reste, `compte` compris, est réécrit en `resultat_transition`. La provenance la plus intéressante à mesurer — quelqu'un qui vient délibérément chercher le rattachement, hors de tout interstitiel — est donc rangée avec celle qui sert de repoussoir dans la comparaison décrite juste au-dessus du type (« l'interstitiel mérite-t-il sa friction ? »). Accessoirement, `plan` et `suivi` sont déclarés mais aucun code ne les émet : ils se liront zéro, ce que CLAUDE.md interdit précisément d'introduire.

Preuves : `src/app/connexion/index.tsx:31` ; `src/types/analytics.ts:55` ; `src/app/compte/index.tsx:105`

**Recommandation.** Ajouter `'compte'` à la liste blanche, et retirer du type les provenances qu'aucun appelant n'émet (ou les émettre) — même règle que pour les noms d'événements.

**Contre-vérification.** Une précision qui évite une mauvaise correction : la règle du CLAUDE.md et de docs/architecture/v1-08-mesure-usage.md (§2, cas `plan_action_open`) porte sur les **noms d'événements** référencés dans `public.usage_event_types`, pas sur les valeurs de `props` — `check_usage_event_props` ne valide qu'un nombre de clés et une longueur, aucune énumération côté base. Retirer `plan`/`suivi` du type est donc un simple changement TypeScript, sans migration, et rien ne sera « rejeté en silence » si on les laisse. L'analogie du constat est juste sur le fond (une valeur déclarée jamais émise se lit comme un fait), pas sur le mécanisme. Correctif minimal et sûr : remplacer la liste blanche en dur par une constante partagée dérivée du type, pour que l'ajout d'une provenance dans `analytics.ts` ne puisse plus rester non reconnue par l'écran — c'est cet écart-là, pas la valeur `compte` en particulier, qui se reproduira.


### A6-11 — `connexion_success` par email est émis à l'envoi du lien, alors que le rattachement n'est effectif qu'après le clic

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

L'écran email émet `connexion_success` juste après `updateUser({ email })`, avec ce commentaire : « Le rattachement est effectif ici ». Le modèle de données dit l'inverse et de façon appuyée : `etatDuRattachement` classe cet instant en `a_confirmer` — « une adresse présente ne signifie pas que le compte est rattaché » — et c'est même la raison d'être de l'issue #62. Le chemin Google, lui, n'émet l'événement qu'après une session réellement liée. Les deux méthodes ne mesurent donc pas la même chose, et la comparaison email/Google — la seule que cet événement permet — est faussée du taux d'emails jamais confirmés, qui est précisément ce qu'on voudrait connaître.

Preuves : `src/app/connexion/email.tsx:55` ; `src/types/compte.ts:30` ; `src/lib/auth.ts:74`

**Recommandation.** Soit renommer ce que mesure l'événement côté email (un `connexion_demande` distinct du succès), soit n'émettre `connexion_success` qu'au moment où `is_anonymous` bascule — l'écran du plan constate déjà ce basculement au retour et pourrait porter l'événement.

**Contre-vérification.** Ce que le constat rate : déplacer l'émission au basculement de `is_anonymous` sur /plan (src/app/(tabs)/plan.tsx:136 et suivantes) perdrait l'information de **méthode** — à ce point-là on ne sait plus si le compte vient d'un lien email ou de Google (`identities` le dirait, mais c'est une lecture de plus). La solution la moins coûteuse est celle qu'il cite en premier : garder l'événement d'intention côté email sous un autre nom (`connexion_demande`, avec sa ligne dans `usage_event_types` **et** dans `src/types/analytics.ts`, sinon insert rejeté en silence), et laisser `connexion_success` au seul fait vérifié. Attention aussi : l'annonce de rattachement sur /plan est gardée par une marque locale (`traceverte.rattachement_annonce.v1`, src/lib/connexion-prefs.ts:35) — s'appuyer sur ce même chemin pour émettre l'événement le rendrait dépendant d'AsyncStorage et non émis si la marque existe déjà, ce qui recréerait un chiffre faux dans l'autre sens.


### A6-13 — Le formulaire de retour : champ de saisie sans nom accessible, et échec non annoncé

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le seul champ de texte libre du produit n'a pas d'`accessibilityLabel` : son intitulé « Ton message » est un frère dans l'arbre, pas un `<label for>`. C'est exactement le cas que `TextField` documente et corrige pour les écrans de connexion (« sans cette ligne, le champ s'annonce sans nom »). Par ailleurs, cet écran affiche ses échecs dans une carte maison au lieu de `MessageInline`, alors que ce composant existe justement pour qu'un échec reste annoncé par un lecteur d'écran (`role="alert"` + `accessibilityLiveRegion`) — son en-tête recense les trois écrans qu'il a repris, et le formulaire de retour est le quatrième, oublié. Enfin les catégories sont des `Chip` en rôle `button` là où il s'agit d'un choix exclusif, que CLAUDE.md impose d'annoncer en `radio`.

Preuves : `src/app/feedback.tsx:110` ; `src/app/feedback.tsx:127` ; `src/components/auth/text-field.tsx:54`

**Recommandation.** Donner au `TextInput` un `accessibilityLabel="Ton message"` (et un `accessibilityHint` reprenant la limite de caractères), remplacer la carte d'erreur par `MessageInline`, et passer les chips de catégorie en `radio` dans un `radiogroup` comme le fait `ChoixDeRappel`.

**Contre-vérification.** Deux nuances utiles à la synthèse. (1) Le point `radio` est le plus lourd des trois : `Chip` n'expose aucune prop de rôle et est utilisé partout dans le wizard (pickers numériques, Oui/Non) — il faut lui ajouter une prop (`role?: 'button' | 'radio'`) plutôt que basculer le composant, sinon on change le rôle de tous les pickers d'un coup. Le motif à copier est `src/components/compte/choix-de-rappel.tsx` l.35/50 (`radiogroup` + `radio`), déjà en place. (2) Le constat rate un troisième défaut d'accessibilité du même écran : le compteur `{trimmed.length} / {FEEDBACK_MAX_LENGTH}` (l.122-124) n'est rattaché à rien — un `accessibilityHint` sur le champ reprenant la limite, comme le recommande le constat, est bien la bonne réponse. Le libellé « Ton message » lui-même devrait rester la source du `accessibilityLabel` (constante partagée), pour éviter la dérive que `TextField` documente.


### A6-14 — « Un chiffre me semble faux » n'est atteignable depuis aucun écran qui affiche un chiffre

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le canal de retour propose cinq catégories, dont « Un chiffre me semble faux » et « Quelque chose ne marche pas ». Il n'a pourtant que deux portes : le lien « un mode manque » dans le questionnaire, et le pied de l'écran « Toi ». Ni la restitution, ni le plan, ni le suivi n'y renvoient — c'est-à-dire aucun des écrans où naît le doute sur un chiffre. Or ce doute est un moment décisif pour la prise de conscience : quelqu'un qui trouve son total invraisemblable et n'a nulle part où le dire conclut que le produit se trompe, et part. La justification d'origine de la brique (« mentir, ou partir — toutes deux silencieuses ») vaut mot pour mot ici.

Preuves : `src/lib/feedback.ts:11` ; `src/components/bilan/missing-mode-link.tsx:18` ; `src/app/compte/index.tsx:121`

**Recommandation.** Ajouter un lien discret en pied de la restitution (`/suivi/bilan`), sur le modèle exact de `MissingModeLink` : `params: { kind: 'chiffre', context: 'resultat' }`. Le `context` est déjà prévu pour situer le retour, et la phrase de confidentialité de l'écran s'adapte toute seule.

**Contre-vérification.** La recommandation est bonne mais sous-dimensionnée sur un point : `MissingModeLink` force `kind`, alors qu'un lien de restitution devrait laisser la catégorie modifiable — elle l'est déjà, `feedback.tsx` l.35-40 ne fait que préselectionner via `initialKind` et les puces restent actives. Rien à changer donc, mais le libellé du lien doit rester ouvert (« Un chiffre te semble faux ? ») plutôt que d'annoncer une correction. Attention aussi à ne pas coller ce lien à côté du total : CLAUDE.md interdit la mascotte près d'un chiffre lourd, et l'esprit de la restitution est de ne pas commenter — un lien discret en pied d'écran, comme le dit le constat, respecte ça ; une bannière près du total non.


### A6-16 — Aucun moyen de quitter un compte : ni déconnexion, ni changement de compte

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

`signOut` n'est appelé qu'une fois dans tout `src/`, à l'intérieur de `deleteMyAccount`, pour refermer une session dont l'utilisateur vient d'être supprimé. Il n'existe donc aucun chemin pour se déconnecter : sur un appareil partagé (foyer, ordinateur familial — la version web est un usage prévu), la première personne connectée y reste, et la suivante voit ses bilans, son plan et ses points de suivi. Le seul contournement est de demander un lien pour une autre adresse depuis « Retrouver mon compte », ce qui n'est ni nommé ni découvrable, ou de supprimer le compte — c'est-à-dire de détruire ses données pour en sortir.

Preuves : `src/lib/compte.ts:106` ; `src/app/compte/index.tsx:83` ; `src/components/compte/mon-compte.tsx:63` ; `docs/design/README.md:208`

**Recommandation.** Ajouter sur « Toi », uniquement pour un compte rattaché, un lien discret « Me déconnecter de cet appareil » qui appelle `signOut`, efface les marques locales et renvoie vers la racine — avec une phrase qui rassure (« Tes données restent sur ton compte, tu les retrouves avec un lien »). Le ton du canvas v1-10 est déjà écrit pour ça.

**Décision documentée concernée.** docs/design/README.md §4.3 demande qu'aucun écran ne « mentionne la déconnexion » — mais cette consigne porte sur la copie de l'écran de reconnexion, pas sur l'existence d'une sortie de compte. À arbitrer.

**Contre-vérification.** Le constat rate le contournement le plus dangereux, qui aggrave le point : `sendAccountAccessLink` depuis `/connexion/retrouver` **change bien** d'utilisateur sur l'appareil (c'est le seul `signInWithOtp` du produit), mais il traverse d'abord l'écran de collision quand la session courante porte un bilan — donc quelqu'un qui veut simplement « passer à son compte » se voit annoncer une perte de données. Une déconnexion explicite réglerait aussi ce chemin. Deux précautions à la mise en œuvre : ne l'afficher que pour `etat.kind === 'rattache'` (proposer de « quitter » une session anonyme reviendrait à effacer un bilan irrécupérable — même piège que celui gardé par `src/types/compte-suppression.ts`), et purger les marques locales device-scoped (`src/lib/bilan-draft.ts`, `src/lib/connexion-prefs.ts`, et le jeton d'appareil, qui est repris par `register_push_token` mais resterait pointé sur l'ancien compte jusqu'au prochain enregistrement — sinon les rappels partent au mauvais destinataire). Sévérité maintenue à mineur : la cible V1 est Google Play, un téléphone est mono-utilisateur, et rien de réglementaire n'exige la déconnexion — mais le risque de confidentialité est réel sur la surface web.


### A6-19 — La saturation du quota de retours est reconnue à un fragment de son message français

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le trigger `enforce_feedback_rate_limit` lève une exception rédigée pour être montrée telle quelle, et le client la reconnaît en cherchant la sous-chaîne « plusieurs retours ». Tout le reste du produit s'interdit ce motif — la limite d'envoi d'emails est détectée au code `over_email_send_rate_limit` précisément parce qu'« un message change sans prévenir, et une détection qui s'appuie dessus cesse de fonctionner en silence ». Ici la conséquence d'une dérive serait un contresens : quelqu'un qui a atteint son quota lirait « Ton retour n'est pas parti. Vérifie ta connexion et réessaie. » et réessaierait indéfiniment sur une connexion parfaite. Le même message générique couvre aussi la violation de la contrainte de longueur, qui lève le même `23514`.

Preuves : `src/lib/feedback.ts:47` ; `supabase/migrations/20260905150000_feedback.sql:80` ; `src/types/connexion.ts:19`

**Recommandation.** Faire lever au trigger un `errcode` distinct et stable (par exemple `'P0001'` avec un `constraint`/`hint` dédié, ou un SQLSTATE de classe 'P'), et le reconnaître par ce code côté client — le texte français restant, lui, ce qui s'affiche.

**Contre-vérification.** Deux choses que le constat sous-estime, dans deux sens opposés. (1) L'aggravant : `sendFeedback` ne se contente pas de détecter au message, il **réaffiche le message brut de la base** à l'utilisateur (`message: error.message`). Le texte SQL est donc à la fois le contrat de détection et la copie produit — un seul endroit, deux rôles, et rien en CI ne les relie ; un test qui épingle la paire (comme `rappels.test.ts` épingle la table de vérité des canaux) serait plus solide que le seul changement d'errcode. (2) L'atténuant : le risque de dérive est ici plus faible qu'il n'y paraît, le message vivant dans une migration déjà appliquée qu'on ne réécrit pas — le vrai chemin de casse serait une migration `create or replace` reformulant la phrase. Enfin, `src/app/feedback.tsx` borne déjà la saisie à `FEEDBACK_MAX_LENGTH` côté client, donc la collision 23514 avec la contrainte de longueur est aujourd'hui improbable en usage normal — elle reste le motif d'un errcode dédié plutôt que d'un panne réelle observable.


### A6-20 — Sur web, ce qui suit `linkGoogleIdentity` s'exécute pendant que le navigateur quitte la page

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Sur web, `linkIdentity` déclenche une redirection plein écran et rend la main immédiatement : les trois lignes qui suivent — `track('connexion_success')`, `markConnexionProposalSeen()`, `router.replace('/plan')` — s'exécutent alors que le document est en train d'être déchargé. L'insert de mesure part au réseau et sera très probablement abandonné ; l'écriture locale est une course. Comme le retour d'OAuth atterrit directement sur `/plan` et que rien d'autre ne repasse par l'écran de connexion, le rattachement Google réussi sur web peut n'être jamais compté, et la marque « proposition vue » jamais posée. Symptôme lisible : un chiffre de conversion Google plus bas sur web que sur natif, sans cause visible.

Preuves : `src/lib/auth.ts:29` ; `src/app/connexion/index.tsx:79`

**Recommandation.** Sur web, poser la marque locale **avant** d'appeler `linkIdentity`, et émettre `connexion_success` au retour (par exemple depuis `/plan`, en constatant la bascule de `is_anonymous`, ce que l'annonce de rattachement fait déjà) plutôt qu'avant la redirection.

**Contre-vérification.** Deux corrections à la description. (1) La perte de la marque locale est bien moins grave que dit : `markConnexionProposalSeen` écrit dans AsyncStorage (localStorage sur web, résolution en microtâche) et, surtout, la proposition plein écran ne se rejoue de toute façon pas après un rattachement réussi — `src/app/(tabs)/suivi/bilan.tsx:216-222` sort dès que `user.is_anonymous` est faux. Le seul dommage réel est donc le compteur `connexion_success` sur web. (2) La recommandation « émettre au retour depuis /plan en constatant la bascule de is_anonymous » est réalisable et se greffe sur un mécanisme existant (`src/app/(tabs)/plan.tsx:140-150`, annonce de rattachement gardée par `aVuRattachementAnnonce`), mais attention : cette voie ne sait pas dire `method: 'google'` vs `'email'` — le retour de confirmation email passe par le même écran. Il faudrait soit poser la méthode en local avant la redirection, soit lire `user.app_metadata.providers`, sinon on remplace un chiffre manquant par un chiffre faux (ce que CLAUDE.md reproche déjà à `useTrackView` sur un écran d'onglet).


### A6-21 — Depuis « Toi », l'écran de connexion n'a pas de retour : la seule sortie est « Continuer sans compte », qui consomme la proposition et remplace la pile

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

`/connexion` a été conçu comme un interstitiel post-bilan : sa seule sortie est « Continuer sans compte », qui écrit la marque « proposition vue » puis fait un `router.replace('/plan')`. Depuis v1-11, l'écran « Toi » y envoie aussi, par un `router.push` classique. Quelqu'un qui ouvre la connexion depuis « Toi » et change d'avis n'a donc aucun « Retour » : il est déposé sur le plan, avec la pile remplacée, et la proposition plein écran est marquée vue au passage. Sur natif, le retour matériel est le seul chemin — et le produit a par ailleurs décidé qu'il doit quitter l'app depuis `/plan`.

Preuves : `src/app/connexion/index.tsx:50` ; `src/app/compte/index.tsx:105` ; `src/app/connexion/email.tsx:149`

**Recommandation.** Quand `source === 'compte'` (ou plus généralement quand l'écran a été empilé), afficher « Retour » et faire `router.back()` sans marquer la proposition vue ; garder `replace('/plan')` pour le seul chemin interstitiel.

**Contre-vérification.** Le constat rate un défaut voisin plus net, dans la zone qu'il inspecte : `src/app/connexion/index.tsx:31-35` restreint `source` à `'resultat_cta' | 'plan' | 'suivi'` et retombe sinon sur `'resultat_transition'` — alors que `src/types/analytics.ts:55` déclare `'compte'` comme valeur possible de `connexion_view.source`. Le seul appelant qui passe `'compte'` voit donc sa valeur écrasée : la provenance « Toi » est comptée comme une transition post-bilan, et `'compte'` est une valeur déclarée que rien n'émet — précisément ce que CLAUDE.md interdit (« un événement déclaré mais qu'aucun code n'émet doit être retiré : il se lit zéro »). Corriger le retour et l'aiguillage de `source` est le même patch. Nuance sur l'argument natif : depuis `/connexion` empilé sur `/compte`, le retour matériel repop bien vers « Toi » (ce n'est pas `/plan`) — la règle v1-11 §8 sur la sortie de l'app ne s'applique pas ici ; ce qui manque est la sortie *visible*, pas le retour matériel. Note aussi que `dismiss` émet `connexion_dismiss` dans ce cas, ce qui gonfle un compteur censé mesurer le refus de l'interstitiel.


### A6-22 — Le même texte est annoncé deux fois sous « Continuer sans compte »

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La phrase « Ton résultat reste accessible sur cet appareil » est passée à la fois en `hint` du lien et rendue juste en dessous comme paragraphe visible. Un lecteur d'écran annonce donc « Continuer sans compte, bouton, Ton résultat reste accessible sur cet appareil », puis relit la même phrase au nœud suivant. Le `hint` de `TextLink` est prévu pour les intitulés ambigus hors contexte, pas pour doubler un texte déjà présent — et c'est le seul endroit du produit où les deux coexistent.

Preuves : `src/app/connexion/index.tsx:130` ; `src/app/connexion/index.tsx:137` ; `src/components/text-link.tsx:33`

**Recommandation.** Retirer le `hint` (le paragraphe visible dit déjà tout), ou retirer le paragraphe si l'on préfère alléger la colonne — mais pas les deux.

**Contre-vérification.** Préférer retirer le `hint` plutôt que le paragraphe : le texte visible rassure aussi les voyants au moment précis où ils renoncent à un compte, et le retirer changerait le contenu de l'écran (décision produit) là où retirer le `hint` ne touche qu'une redondance d'annonce. Détail au passage : les deux formulations diffèrent d'un point final, symptôme classique d'une duplication qui divergera.


## A7 — SQL — calcul du bilan et référentiel des facteurs

**Résumé du lecteur.** La zone est mûre et visiblement travaillée : le lookup de facteur est centralisé et borné à la date du bilan, le calcul est séparé du contrôle d'accès, tous les facteurs portent l'ACV complète, et les tests pgTAP épinglent la *source* et les invariants contre-intuitifs (hybride > thermique, grosse moto > voiture) autant que les valeurs. Les erreurs de chiffre historiques (avion long-courrier, TER/TGV, usage vs ACV, covoiturage sur la jambe intermodale) sont toutes fermées et gardées. Ce qui reste porte moins sur les facteurs que sur les **hypothèses de modélisation** : la répartition 50/50 du second mode se trompe de 40 à 50 % sur un poste domicile-travail intermodal, le poste loisirs est plafonné à 40 km et 3 sorties par semaine sans champ libre, et le comptage des vols ne dit jamais si « une fois » veut dire un aller ou un aller-retour — soit un facteur 2 sur le poste le plus lourd du produit. Deux trous structurels : la base ne porte aucune contrainte de complétude conditionnelle (le questionnaire est le seul garde-fou, et un jeu de réponses incomplet rend le bilan définitivement non calculable avec un message générique), et la jambe secondaire du trajet domicile-travail n'est stockée nulle part, ce qui fait que toutes les actions du plan ne portent que sur la moitié du trajet d'un intermodal. Enfin la synchronisation trimestrielle des facteurs est correcte mais entièrement muette : son journal n'est lisible par personne et un mode bloqué par le garde-fou ±50 % resterait figé indéfiniment sans que rien ne le dise.

**Points forts à ne pas casser**

- `public.emission_factor(mode_id, date)` (20260904140000, l. 79-112) : un seul point de lookup, borné à la date du bilan, repli explicite sur la version la plus ancienne quand le mode est postérieur au bilan, et **exception explicite** plutôt qu'un NULL qui contaminerait tout le total. C'est la brique qui rend un bilan reproductible ; ne jamais réintroduire un `order by valid_from desc limit 1` à la main.
- La séparation `recompute_assessment_results` (interne, `revoke ... from public, anon, authenticated`) / `compute_assessment_results` (RPC client qui vérifie la propriété puis délègue) : elle rend possible toute reprise de calcul en masse tout en gardant la garde d'accès, et le test 01 exerce la garde sous un vrai rôle `authenticated` via `request.jwt.claims` plutôt qu'en tant que `postgres`.
- Le test 07 épingle la **source** de chaque facteur (`source not like '%ACV complète%'`) et le fait que le vélo soit non nul — les deux seuls endroits où l'erreur d'endpoint usage/ACV était détectable, puisque les deux endpoints renvoient des nombres également plausibles. Retirer ces deux assertions rouvrirait le défaut le plus coûteux de l'histoire du produit.
- Les invariants contre-intuitifs sont épinglés pour eux-mêmes (05, l. 160-165 : hybride > thermique > hybride rechargeable > électrique ; 14, l. 44-48 : grosse moto > voiture thermique). Ce sont des tests dont le rôle est de faire échouer une « correction » de bon sens — exactement le bon usage d'une suite de tests sur un référentiel.
- `emission_factor_sources` en table plutôt qu'en dur, avec `impactco2_slugs not null` et le test de complétude 07 l. 28-32 : ajouter un mode au produit sans lui donner de source fait tomber la CI au lieu de le laisser figé en silence. Même mécanique que `usage_event_types`, et elle marche.
- `resolve_mode` comme point unique de résolution, avec la migration 20260905200000 qui refuse de s'appliquer si un appel a changé de forme (l. 183-187) et qui vérifie en sortie qu'aucun `resolve_car_mode` ne subsiste sur un mode choisi par l'utilisateur (l. 196-211). L'intention de garde est la bonne.

### A7-1 — La répartition 50/50 du second mode se trompe de 40 à 50 % sur le poste domicile-travail intermodal

`technique` · sévérité **important** · verdict **confirme** · effort moyen

Quand un second mode est déclaré, la moitié exacte des kilomètres annuels est attribuée à chaque mode. Or la question posée à l'écran est « Utilises-tu un second mode en complément ? Par exemple vélo puis train » : elle décrit un rabattement à l'intérieur d'un même trajet, où les deux jambes ne font presque jamais la même distance. Deux cas concrets, sur un trajet de 20 km, 5 j/semaine (9 000 km/an) : vélo + train — le modèle rend 4 500 × 0,00017 + 4 500 × 0,02769 = 125,4 kg alors qu'un rabattement réaliste (2 km de vélo, 18 km de train) vaut 224,4 kg, soit **44 % sous-estimé** ; voiture + train en parc-relais — le modèle rend 764,7 kg alors que 5 km de voiture + 15 km de train valent 507 kg, soit **51 % sur-estimé**. L'erreur porte sur le poste qui décide du poste dominant, donc du plan et de la boucle d'engagement. La spec elle-même annonce la règle comme provisoire (« répartir 50/50 la distance entre les deux modes, à ajuster si besoin »).

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:281` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:282` ; `src/components/bilan/steps/commute-extra.tsx:71` ; `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:130`

**Recommandation.** Demander la part du trajet couverte par le second mode — une seule puce de plus sur un écran qui en porte déjà (« sur quelle part du trajet ? moins d'un quart / environ la moitié / plus des trois quarts »), stockée dans un `commute_second_mode_share` avec repli 0,5 pour les bilans déjà soumis. Le calcul devient `part × facteur(second) + (1 − part) × facteur(principal)` et la constante 0,5 reste le défaut documenté. À défaut, retenir un défaut de rabattement (25 % sur la jambe secondaire) plutôt que 50 %, qui n'est le bon chiffre dans aucun des deux usages réels.

**Contre-vérification.** Trois choses que le constat rate. (1) La division covoiturage ne porte QUE sur la jambe principale (l. 288-290, correction de T13 documentée en `v1-07` §... tableau l. 258) : un champ de part doit préserver cet ordre, sinon on réintroduit le défaut corrigé. (2) La recommandation d'une puce supplémentaire heurte frontalement la règle produit « la profondeur coûte plus cher en abandon qu'une puce de plus » (CLAUDE.md, motorisation) — ici c'est bien une puce au même niveau et non un second niveau, donc elle passe, mais l'écran B1.5/B1.6/B1.7 porte déjà trois questions conditionnelles sur un seul pas (docs/design/README.md l. 125) : c'est le pas le plus chargé du wizard. (3) Le défaut de repli 0,5 doit être écrit dans les DEUX documents (spec §Logique de calcul et v1-05 §4), et toucher à cette formule invalide les assertions chiffrées de `01`, `05`, `06`, `08` — appliquer la méthode CLAUDE.md (recalcul par requête, pas à la main). Si l'on ne fait qu'un seul changement, préférer le champ de part au « défaut 25 % » proposé en repli : un défaut de 25 % rend faux le cas voiture+train parc-relais dans l'autre sens et n'est vérifiable par personne.


### A7-2 — La jambe secondaire n'est stockée nulle part : toutes les actions du plan ne portent que sur la moitié du trajet d'un intermodal

`technique` · sévérité **important** · verdict **confirme** · effort moyen

`recompute_assessment_results` ne fige sur `assessment_results` que `commute_main_leg_km_year` et `commute_main_leg_co2_kg_year` ; le CO2 et les km de la jambe secondaire sont calculés puis perdus, seuls comptés dans le total. `estimate_action_savings` ne connaît donc que la jambe principale, et **toutes** les actions domicile-travail se calculent dessus. Le cas le plus net est « Garder une journée de télétravail par semaine » : une journée non parcourue supprime physiquement les deux jambes, mais le gain affiché n'en couvre qu'une. Pour un intermodal voiture+train à 20 km, le gain réel d'un jour de télétravail est de 153 kg/an et l'app en annonce 128 — et l'écart va dans le sens qui rend l'action moins attractive qu'elle ne l'est. Même biais sur `remove_day` et sur les substitutions de part.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:293` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:540` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:557`

**Recommandation.** Ajouter `commute_second_leg_km_year` / `commute_second_leg_co2_kg_year` à l'instantané (même migration que A7-1 si les deux se font ensemble), et faire porter les opérations `remove_day` et `remove_trip` sur la somme des deux jambes — ce sont les seules qui suppriment le déplacement entier. Les substitutions de mode restent sur la jambe principale, c'est correct.

**Contre-vérification.** Le constat rate un second effet, plus insidieux, du même trou : `v_current_factor := commute_main_leg_co2 / commute_main_leg_km` (l. 540) est le facteur du mode principal seul. Pour un intermodal, toute substitution est donc évaluée contre un facteur qui n'est pas celui du trajet réel, et le seuil `min_saving_kg = 5` (l. 481) peut écarter une action qui passerait la barre en comptant les deux jambes — l'action disparaît alors du plan sans trace. Rate aussi que le filtre `t.max_distance_km` se compare à `r.commute_trip_distance_km`, la distance du trajet ENTIER (l. 541-546) : pour un intermodal, une action bornée en distance est évaluée sur le trajet complet alors que son gain est calculé sur une demi-jambe — les deux bornes ne parlent pas de la même chose. Recommandation d'accord, à faire dans la même migration que A7-1 (les deux jambes n'ont de sens qu'avec la part), et penser à recalculer les bilans existants via `recompute_assessment_results` (jamais `compute_*`, qui exige `auth.uid()`).


### A7-5 — Le covoiturage des loisirs est proposé à l'écran et n'a aucun effet sur le chiffre

`fonctionnel` · sévérité **important** · verdict **contredit_decision** · effort petit

L'écran B2.2 propose « Voiture (seul) » et « Voiture (covoiturage) » comme deux réponses distinctes, mais les deux écrivent le même `leisure_mode = 'voiture'` : le schéma n'a pas d'équivalent de `commute_carpool_size` côté loisirs et le calcul ne divise jamais le poste loisirs. Quelqu'un qui part en famille au sport le samedi voit sa réponse ignorée, et son poste loisirs est celui d'un conducteur seul. C'est doublement coûteux pour les objectifs du produit : le chiffre est faux dans le sens qui culpabilise, et la personne apprend implicitement que ce qu'elle répond ne change rien. Le covoiturage étant par ailleurs l'une des six actions proposées par le plan côté domicile-travail, l'asymétrie est difficile à défendre.

Preuves : `src/components/bilan/steps/leisure-detail.tsx:27` ; `src/constants/transport-modes.ts:49` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:321`

**Recommandation.** Deux issues, et il faut en choisir une : soit ajouter `leisure_is_carpool` / `leisure_carpool_size` et diviser le poste comme pour le domicile-travail (le plus juste, ~2 champs et 3 lignes de SQL), soit retirer la ligne « Voiture (covoiturage) » de B2.2. Laisser une réponse sans effet est la seule option qui ne se défende pas.

**Décision documentée concernée.** v1-05 §2 acte l'absence de `leisure_carpool_size` dans le schéma bilan v2, et `src/constants/transport-modes.ts` l. 44-46 documente le choix comme assumé (« sans effet de calcul différencié »).

**Contre-vérification.** La sévérité reste haute malgré le verdict : la décision documentée dit ce qui a été fait, elle ne défend nulle part le fait de laisser une réponse sans effet — v1-05 §2 (l. 58-61) ne parle que de l'absence de facteur dédié pour le covoiturage, pas d'un arbitrage sur les loisirs. L'erreur va jusqu'à un facteur 6 sur le poste loisirs (division par 2 à 6 comme en B1.5), et le poste loisirs est celui que la boucle mensuelle « extras » suit dans la durée. Ce que le constat rate : la même asymétrie existe côté voyages longue distance (B3.4, `car_long_trips_per_year`, aucune notion de covoiturage) — traiter les deux ensemble ou aucun. Si l'on ajoute `leisure_carpool_size`, ne pas oublier que `estimate_action_savings` calcule `v_current_factor := r.leisure_co2_kg_year / r.leisure_km_year` (l. 561) : le facteur effectif porterait alors déjà la division, ce qui est le comportement voulu (même mécanique que la jambe principale du commute), et qu'il n'existe aujourd'hui aucun template `share_vehicle` côté loisirs.


### A7-6 — Le poste loisirs est plafonné à 40 km et 3 sorties par semaine, sans champ libre, là où le domicile-travail demande le kilométrage exact

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

Le poste loisirs ne connaît que quatre tranches dont la dernière, ouverte (« Plus de 30 km »), est ramenée à 40 km, et trois fréquences dont la plus haute vaut 3/semaine. Le maximum calculable est donc 40 × 2 × 3 × 52 = 12 480 km/an. Quelqu'un qui fait 120 km aller pour aller skier ou voir sa famille tous les week-ends est compté à 40 km : le poste est divisé par trois, et il peut basculer le poste dominant vers le domicile-travail alors que le vrai levier est ailleurs. L'asymétrie est frappante avec le domicile-travail, qui demande la distance exacte au kilomètre (`commute_distance_km`, la tranche n'étant qu'un repli jamais alimenté en base). Or c'est précisément le poste loisirs que la boucle mensuelle « extras » suit dans la durée.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:313` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:201` ; `supabase/migrations/20260824180000_bilan_v2_schema.sql:84` ; `src/components/bilan/steps/leisure-detail.tsx:24`

**Recommandation.** Ouvrir la tranche haute : soit une cinquième tranche (« 30 à 60 » / « plus de 60 »), soit — plus cohérent avec B1.3 — un champ kilométrique libre qui n'apparaît que quand « Plus de 30 km » est cochée, sur le modèle de la révélation imbriquée déjà utilisée pour la motorisation. Le schéma porte déjà `leisure_trip_distance_km` sur `assessment_results` : seule la saisie manque.

**Contre-vérification.** Deux angles morts. (1) Une distance libre côté loisirs déplacerait aussi `estimate_action_savings` : le filtre `t.max_distance_km` compare à `r.leisure_trip_distance_km` (l. 562-567) et des templates aujourd'hui jamais proposés au-delà de 40 km le resteraient — vérifier `action_templates.max_distance_km` avant de croire que le plan suivra. (2) Le vrai correctif est peut-être ailleurs que dans la tranche : 30 km+ à 40 km mélange deux usages différents (la sortie sport à 35 km et le week-end familial à 120 km), et une cinquième tranche fermée ne fait que déplacer le plafond. Le champ libre en révélation imbriquée sous « Plus de 30 km » est la bonne proposition ; en revanche il faut, comme B1.3, un chemin « je ne sais pas » qui retombe sur 40, sinon on remplace un biais par un abandon. Enfin, toute modification de la constante 40 ou de l'échelle de fréquence invalide les assertions chiffrées de `01`, `05`, `06`, `08` : appliquer la méthode CLAUDE.md (recalcul par requête sur la base, pas à la main) — la CI est déjà tombée trois fois sur ce piège.


### A7-7 — Les vols : « combien de fois prends-tu l'avion » ne dit pas si un aller-retour compte pour un ou deux, et les distances 1500/9000 km ne sont jamais affichées

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Le calcul modélise chaque unité déclarée comme **un vol** de 1 500 ou 9 000 km — soit un aller simple. La question posée est « Combien de fois prends-tu l'avion dans une année type ? » : une personne qui va à New York et revient répondra « 1 » aussi souvent que « 2 », et l'écart entre les deux réponses vaut 1 601 kg de CO2, c'est-à-dire plus que le poste domicile-travail annuel d'un automobiliste faisant 10 km. Un facteur 2 d'incertitude sur le poste le plus lourd du produit, sur la question qui produit le plus souvent le poste dominant. Aggravant : l'écran des longs trajets **affiche** ses hypothèses (« distances moyennes par défaut · 800 km train, 700 km voiture ») tandis que l'écran des vols n'affiche rien, alors que ses distances sont dix fois plus lourdes.

Preuves : `src/components/bilan/steps/flights.tsx:30` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:205` ; `src/components/bilan/steps/long-trips.tsx:81` ; `supabase/tests/database/06_flight_and_long_distance_train.test.sql:89`

**Recommandation.** Lever l'ambiguïté dans la question (« Combien de vols, aller et retour comptés séparément ? », ou l'inverse en doublant les distances) et afficher la ligne d'hypothèses sur l'écran des vols comme sur celui des longs trajets. C'est une correction de copie et de constante, sans changement de schéma ; c'est aussi la seule qui permette à la personne de comprendre pourquoi son chiffre est ce qu'il est — le cœur de la prise de conscience.

**Contre-vérification.** Le constat rate deux choses. (1) Les deux branches du correctif n'ont pas le même coût : réécrire la copie (« aller et retour comptés séparément ») ne touche rien d'autre, tandis que doubler les distances invalide la quinzaine d'assertions chiffrées des tests 01/05/06/08 et impose de re-relever les facteurs avion, dont la valeur dépend du `km` demandé (emission_factor_sources.reference_km = 1500/9000) — donc préférer la copie, et si l'on veut le A/R par défaut, garder 1500/9000 comme distance *par vol* et ne changer que le libellé du compteur. (2) 9000 km est en soi discutable comme aller simple moyen (Paris–New York ≈ 5800) : la ligne d'hypothèses à afficher devrait dire « vol long-courrier compté 9 000 km » plutôt que de laisser croire à une moyenne mesurée.


### A7-3 — Un bilan à zéro produit un poste dominant « commute » inexistant et le libellé « Trajet domicile-travail () », affiché tel quel

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Quand `v_total = 0`, la fonction décide `dominant_poste = 'commute'` sans condition. Si la personne a répondu qu'elle n'a pas de trajet régulier, `v_commute_mode_resolved` est NULL, le `select label into v_mode_label` ne trouve rien, et le libellé figé vaut littéralement « Trajet domicile-travail () ». Le cas est atteignable : aucun trajet domicile-travail, loisirs hebdomadaires **à pied** (`marche` est le seul mode à facteur exactement 0 depuis le passage à l'ACV — le vélo vaut 0,000170), aucun vol, aucun long trajet. C'est le profil que le produit devrait féliciter le plus chaleureusement, et c'est celui qui reçoit un poste dominant qu'il a explicitement dit ne pas avoir, avec une parenthèse vide. Le libellé est lu directement à l'écran de connexion, sans reformulation possible côté client.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:371` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:394` ; `supabase/migrations/20260905100000_facteurs_acv_complete.sql:129` ; `src/app/connexion/index.tsx:111`

**Recommandation.** Dans la branche `v_total = 0`, retenir le poste sur lequel la personne a effectivement déclaré quelque chose (commute si `commute_has_regular_trip`, sinon loisirs) et ne jamais concaténer une parenthèse quand le mode est NULL — le libellé doit être « Trajet domicile-travail » nu. Ajouter un scénario pgTAP « total nul » : c'est le seul cas de bord du calcul qu'aucun test ne parcourt aujourd'hui.

**Contre-vérification.** Sévérité abaissée après vérification de l'exposition réelle, que le constat surestime : la parenthèse vide n'atteint QU'UN écran, `src/app/connexion/index.tsx:111`. Les deux autres surfaces dégradent proprement — `src/app/(tabs)/suivi/bilan.tsx:79` et `:90` passent par `POSTE_SUBJECT` / `POSTE_BREAKDOWN` avec le label en repli seulement, et `src/app/(tabs)/suivi/index.tsx:207` par `POSTE_LABEL[dominantPoste]`. Côté boucles, aucun dégât non plus : `generate_commute_checkins` filtre sur `ar.commute_poste_label is not null` (20260904200000_checkin_email_reminders.sql:111 sq.), qui reste NULL sans trajet régulier, et `estimate_action_savings` sort sur `commute_has_regular_trip` (l. 532) puis sur `v_current_factor <= 0` — le plan est simplement vide. Reste vrai et vaut correction : le libellé nu + le choix du poste sur ce qui est déclaré, et surtout le scénario pgTAP « total nul » manquant, qui est le meilleur apport du constat. Note : un plan vide pour un profil exemplaire est un sujet produit à part (que dit l'écran à quelqu'un qui n'a rien à réduire ?), non couvert ici.


### A7-4 — Aucune contrainte de complétude conditionnelle en base : un jeu de réponses incomplet rend le bilan définitivement non calculable, avec un message générique

`technique` · sévérité **mineur** · verdict **contredit_decision** · effort petit

`assessment_answers` laisse nullables tous les champs que le wizard rend obligatoires par condition. Deux chemins échouent en dur : `leisure_frequency` ≠ 'rarely' avec `leisure_mode` NULL fait remonter `emission_factor` avec un mode NULL, qui lève « aucun facteur d'émission connu pour le mode <NULL> » ; `commute_has_regular_trip` vrai avec `commute_days_per_week` ou la distance NULL propage un NULL jusqu'à `v_total`, et l'insert échoue sur `total_co2_kg_year not null` (23502). Côté écran, les deux remontent dans le même `catch` générique qui invite à réessayer — donc une boucle sans issue, sur des réponses que la personne ne sait pas incomplètes. Le questionnaire est aujourd'hui le seul garde-fou d'un invariant qui est de nature schéma, et il ne protège pas contre un brouillon repris d'une version antérieure du wizard ni contre un appel direct à l'API PostgREST (chaque visiteur a une session `authenticated`).

Preuves : `supabase/migrations/20260824180000_bilan_v2_schema.sql:83` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:321` ; `supabase/migrations/20260904140000_fix_flight_and_long_distance_train_factors.sql:107` ; `src/app/bilan/index.tsx:175`

**Recommandation.** Poser les trois CHECK conditionnels que le wizard applique déjà — `commute_has_regular_trip` implique `commute_days_per_week` et une distance non nulles ; `leisure_frequency <> 'rarely'` implique `leisure_mode` et `leisure_distance_bracket` ; `flights_short_per_year <= flights_total_per_year`. L'insert échoue alors au bon endroit avec un message identifiable, et `compute_assessment_results` n'a plus de chemin où il rend une erreur Postgres brute.

**Contre-vérification.** La partie qui reste vraie et vaut d'être portée à la synthèse : le chemin d'échec existe surtout pour un brouillon AsyncStorage repris d'une version antérieure du wizard (`src/lib/bilan-draft.ts`), pas pour un parcours normal, et il n'est pas une boucle sans issue muette mais un message technique en français approximatif adressé à un utilisateur. Le correctif cohérent avec la décision v1-05 est côté client, pas en base : durcir `isStepComplete`/la garde de soumission dans `src/types/bilan.ts` sur le brouillon rechargé, et remplacer l'affichage brut de `error.message` par une phrase du produit. Le troisième CHECK proposé (`flights_short <= flights_total`) est en outre inutile : `greatest(a.flights_total_per_year - v_flights_short, 0)` (l. 331) neutralise déjà le cas. L'argument « appel direct PostgREST » ne tient pas non plus : écrire un jeu de réponses incohérent dans son propre bilan ne nuit qu'à soi et échoue au calcul.


### A7-8 — La synchronisation trimestrielle est muette : son journal n'est lisible par personne et un mode bloqué par le garde-fou reste figé indéfiniment

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`sync_emission_factors()` enregistre chaque passage dans `emission_factor_sync_runs` avec un statut `success` / `partial` / `error`, et signale sans les appliquer les écarts de plus de 50 %. Mais la table est en RLS sans aucune policy et le SELECT est révoqué à `anon` et `authenticated` : aucune surface du produit ne la lit (recherche exhaustive sur `src/` et `api/` : seule la déclaration de type l'évoque). Un échec HTTP, un renommage de slug côté ADEME ou un écart hors bande sont donc invisibles, et le cron ne repasse que tous les trois mois — un mode peut rester figé un an sans que rien ne le dise. C'est exactement le défaut T3 (« facteurs jamais rafraîchis, rien en base ne le signalait ») que cette migration ferme, reconduit un cran plus loin : le mécanisme existe, sa surveillance non.

Preuves : `supabase/migrations/20260904160000_sync_emission_factors.sql:80` ; `supabase/migrations/20260905100000_facteurs_acv_complete.sql:234` ; `supabase/migrations/20260904160000_sync_emission_factors.sql:206` ; `supabase/tests/database/07_sync_emission_factors.test.sql:93`

**Recommandation.** Réutiliser le canal qui existe déjà : faire écrire à `sync_emission_factors` une ligne dans `notification_outbox` (ou un envoi direct via l'extension `http` vers l'adresse de l'éditeur) quand le statut vaut `partial` ou `error`. Le journal reste la trace, l'email est le signal. À défaut, un simple compteur de passages consécutifs non-`success` exposé dans un écran d'exploitation vaudrait mieux que rien.

**Contre-vérification.** Deux nuances que le constat rate. (1) Le cas `error` n'est pas totalement muet : `raise warning 'sync_emission_factors a échoué : %'` (20260905100000:273) atterrit dans les logs Postgres, lisibles depuis le tableau de bord Supabase ; seul `partial` — le cas d'un slug renommé — est réellement silencieux, et c'est le plus probable. (2) La recommandation n'est pas applicable telle quelle : `notification_outbox.checkin_id` est `not null unique references engagement_checkins(id)` (20260904200000:41), donc la table ne peut pas porter une alerte d'exploitation sans changement de schéma. Le chemin cohérent est un POST direct via l'extension `http` avec les secrets Vault `resend_api_key`/`reminder_from_address` déjà utilisés par `send_pending_reminders`. Et l'écran d'exploitation évoqué en repli contredit une décision explicite : v1-07 (annexe advisors) assume `rls_enabled_no_policy` sur cette table — « rien n'est lisible côté client », aucune donnée que l'app ait besoin de relire. Sévérité abaissée : le garde-fou empêche d'appliquer une valeur fausse, le pire cas est un facteur figé à sa dernière valeur connue.


### A7-9 — Aucun test ne fait passer un deux-roues par le calcul complet, alors que la bascule vers `resolve_mode` repose sur une réécriture textuelle de la fonction installée

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La migration 20260905200000 ne réécrit pas `recompute_assessment_results` : elle relit son corps installé avec `pg_get_functiondef`, y substitue trois appels et le rejoue. Le test 14 ne vérifie que les fonctions pures `resolve_two_wheeler_mode` et `resolve_mode` et les quatre facteurs — **aucun scénario ne soumet un bilan avec `commute_two_wheeler_type` ou `leisure_two_wheeler_type` et n'en vérifie le total** (recherche exhaustive : ces colonnes n'apparaissent dans aucun fichier de `supabase/tests/`). Conséquence : le jour où une migration recrée la fonction à partir du texte de 20260905130000 — le réflexe naturel, et le fichier de référence est justement celui-là — la résolution du deux-roues disparaît en silence, et toute la suite pgTAP reste verte. Le défaut serait exactement celui que la migration décrit comme impossible à voir : « le mode générique existe, son facteur existe, le calcul rendrait un nombre ». Accessoirement, la garde de la migration (`if applique = 0`) n'exige qu'**une** substitution sur trois, alors que son commentaire annonce que chacune est vérifiée.

Preuves : `supabase/migrations/20260905200000_cylindree_deux_roues.sql:172` ; `supabase/migrations/20260905200000_cylindree_deux_roues.sql:183` ; `supabase/migrations/20260905200000_cylindree_deux_roues.sql:137` ; `supabase/tests/database/14_cylindree_deux_roues.test.sql:77`

**Recommandation.** Ajouter au test 14 deux scénarios de bout en bout — un trajet domicile-travail en `moto_grosse` et une sortie loisirs en `scooter_electrique` — passés par `recompute_assessment_results` et comparés au facteur attendu (via `public.emission_factor(...)` plutôt qu'un littéral, pour survivre à une resynchronisation). C'est ce test-là, et lui seul, qui détecterait la perte de la résolution. Et corriger la garde de la migration en `applique <> array_length(...)` par fonction attendue, ou l'énoncer honnêtement dans le commentaire.

**Contre-vérification.** La partie « accessoirement » du constat est fausse et doit être retirée de la synthèse : la garde `if applique = 0` n'est pas le seul contrôle. Le bloc `do $controle$` qui suit (20260905200000:194-210) compte les lignes contenant encore `resolve_car_mode` sans le littéral `'voiture'` dans les deux fonctions et lève si `restants > 0` — une substitution partielle (1 ou 2 sur 3) fait donc bien échouer la migration. « Chaque substitution est vérifiée » est tenu, par un autre mécanisme que celui que le lecteur a regardé. Sévérité abaissée en conséquence : aucun défaut actif aujourd'hui, la lacune est une couverture de test contre une régression future. La recommandation de test reste bonne et devrait viser `recompute_assessment_results` directement (et non le RPC) pour un scénario `commute_two_wheeler_type = 'moto_grosse'`, en comparant à `public.emission_factor('deux_roues_moto_grosse', current_date)` plutôt qu'à un littéral.


### A7-10 — Le mode « Train ou RER » du trajet quotidien est intégralement compté au facteur TER

`technique` · sévérité **mineur** · verdict **confirme** · effort moyen

Un seul mode `train` couvre la réponse B1.4 libellée « Train ou RER », et il est mappé au slug `ter` (0,027690). La note portée par le référentiel de synchronisation le dit noir sur blanc : « TER — trajet quotidien B1.4 "Train ou RER" ». C'est le même motif que le défaut §1.2 déjà corrigé (un seul mode `train` servait à la fois le TER quotidien et le TGV longue distance, facteur 10 d'écart) : une réponse qui nomme explicitement deux services très différents, ramenée à un seul facteur. Le RER/Transilien est le mode de transport quotidien de la population de banlieue francilienne, c'est-à-dire d'une part importante des utilisateurs potentiels, et son électrification dense n'a pas le profil d'un TER. Le sens de l'erreur est celui qui surestime un mode que le produit veut encourager.

Preuves : `supabase/migrations/20260904160000_sync_emission_factors.sql:57` ; `supabase/migrations/20260905100000_facteurs_acv_complete.sql:80` ; `src/constants/transport-modes.ts:18`

**Recommandation.** Vérifier sur `/api/v1/thematiques/ecv/transport` si un slug distinct existe pour le RER/Transilien. Si oui, dédoubler comme pour le TGV : un mode `rer` avec sa ligne dans `emission_factor_sources`, et une révélation imbriquée « TER ou RER ? » sur le modèle de la motorisation — jamais deux entrées de plus dans la liste B1.4. Si non, corriger au moins la note du référentiel pour que l'approximation soit documentée là où on la lira.

**Contre-vérification.** Sévérité abaissée pour trois raisons que le constat ne pèse pas. (1) L'ordre de grandeur absolu est modeste : 20 km/jour × 5 jours × 45 semaines ≈ 4 500 km, soit ~80 kg/an d'écart, contre ~640 kg pour la même distance en voiture thermique — le classement des modes et le poste dominant ne bougent pas. (2) Le sens de l'erreur est conservateur pour le plan : `estimate_action_savings` sous-estime le gain d'un report voiture → train, il ne le surestime jamais. (3) La seconde branche de la recommandation est largement déjà faite : la note de `emission_factor_sources` dit déjà « TER », il ne manque que le mot « approximation ». Si le mode est dédoublé, appliquer le corollaire de CLAUDE.md : un mode de plus traverse les trois gardes balayantes du test 07 et invalide les assertions chiffrées de 01/05/06/08.


### A7-11 — Le vélo à assistance électrique n'existe pas dans le questionnaire, et l'écart avec le vélo mécanique est d'un facteur 64

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

Le référentiel documente lui-même l'écart : `velo` vaut 0,000170 en ACV, le VAE 0,010950 — 64 fois plus — et la note ajoute « n'est pas distingué par le questionnaire ». En valeur absolue l'erreur reste modeste (un trajet quotidien de 10 km sur 45 semaines : 0,8 kg annoncé contre 49 kg réels), donc ce n'est pas un chiffre faux au sens des autres constats. Mais c'est un manque produit : le VAE est aujourd'hui le principal mode de report depuis la voiture pour les trajets de 5 à 15 km, exactement le segment que le plan de réduction vise, et le produit ne sait pas qu'il existe. La même logique de révélation imbriquée qui distingue quatre deux-roues motorisés et quatre motorisations de voiture s'applique mot pour mot.

Preuves : `supabase/migrations/20260905100000_facteurs_acv_complete.sql:101` ; `src/constants/transport-modes.ts:20`

**Recommandation.** Ajouter un mode `velo_electrique` (facteur, ligne dans `emission_factor_sources`, entrée dans `resolve_*`) et une révélation imbriquée « Mécanique ou à assistance ? » sous « Vélo », strictement sur le patron du deux-roues motorisé. Attention au corollaire connu : ajouter un mode invalide les assertions chiffrées des tests 01/05/06/08 et traverse les trois gardes balayantes du test 07.

**Contre-vérification.** Deux compléments. (1) Il y a une note périmée à corriger dans le même geste : `20260904160000_sync_emission_factors.sql:60` chiffre encore le VAE à 0,0022 — la valeur d'usage seul, d'avant la bascule ACV — et contredit désormais la note de 20260905100000 (0,010950). Une note fausse sur le référentiel est exactement ce qui a produit le défaut §1.1. (2) L'argument de priorisation le plus fort n'est pas le chiffre du bilan (49 kg/an au pire, invisible dans un total) mais le plan : sans mode VAE, aucun `action_templates` ne peut proposer le report voiture → VAE sur le segment 5-15 km, alors que le seuil des 5 kg/an est franchi très largement. C'est donc un manque côté brique 3, pas côté brique 2 — à formuler ainsi dans la synthèse.


### A7-12 — B3.4 ne propose que le train et la voiture : l'autocar, le ferry et le covoiturage longue distance n'ont nulle part où aller

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

La question des trajets de plus de 300 km n'offre que deux compteurs, « En train » et « En voiture ». Quelqu'un qui descend en autocar (l'ADEME publie un facteur distinct, mentionné dans le référentiel : 0,033 en phase d'usage — l'un des meilleurs rapports du parc) ou qui prend le ferry pour la Corse n'a aucune case, et ses kilomètres disparaissent purement du bilan. Le cas du covoiturage longue distance est plus gênant encore : un trajet Paris-Lyon partagé à quatre est compté au tarif d'un conducteur seul (700 km × 0,142253 = 99,6 kg par occurrence), alors que la même situation est correctement divisée sur le trajet domicile-travail. Le produit surestime donc exactement le comportement qu'il devrait valoriser.

Preuves : `src/components/bilan/steps/long-trips.tsx:33` ; `src/components/bilan/steps/long-trips.tsx:50` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:334` ; `supabase/migrations/20260904160000_sync_emission_factors.sql:56`

**Recommandation.** Prioriser l'occupation du trajet en voiture (une puce « seul / à deux / à trois ou plus » sous le compteur voiture, réutilisant la mécanique de `commute_carpool_size`) : c'est le plus gros écart des trois et la donnée manquante la plus fréquente. L'autocar peut suivre comme troisième compteur ; le ferry est un cas rare et son absence peut rester assumée, mais mieux vaut l'écrire quelque part que de le laisser se découvrir.

**Contre-vérification.** Le constat rate que le trou de covoiturage est plus large que B3.4 : les loisirs non plus ne divisent pas — `leisure-detail.tsx:26-28` écrit le même `leisure_mode: 'voiture'` pour « seul » et « covoiturage », faute de `leisure_carpool_size` en base, choix acté en v1-05 §2 et rappelé en commentaire. Recommander l'occupation sur B3.4 sans la traiter aux loisirs laisserait le produit incohérent d'un poste à l'autre ; la bonne formulation est « une occupation par poste voiture, ou aucune, mais pas une seule des trois ». Note aussi que le ferry n'a pas de facteur dans le référentiel Impact CO2 interrogé : son absence n'est pas seulement un choix d'écran, elle demanderait une source hors chaîne de synchronisation — argument supplémentaire pour l'assumer par écrit plutôt que de la traiter.


### A7-13 — « Rarement » impose 15 km en voiture à tout le monde, y compris à un foyer qui vient de déclarer n'avoir aucun véhicule

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Quand la réponse B2.1 vaut « rarement », le calcul écrase le mode déclaré et impose 15 km en voiture, 0,25 fois par semaine — soit un plancher de 55,5 kg/an appliqué à tous, sans exception. Pour un profil sobre dont le total tourne autour de 100 kg, c'est plus de la moitié du bilan qui est une hypothèse. Le produit dispose pourtant de la réponse B4.3 (`household_vehicles`), qu'il lit déjà pour filtrer les actions du plan (`if t.requires_car and coalesce(a.household_vehicles, '') = '0' then continue`) : dire à quelqu'un qui vient de répondre « aucun véhicule » que ses loisirs pèsent 55 kg de voiture est le genre de détail qui fait perdre confiance dans tout le reste du chiffre.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:306` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:203` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:527`

**Recommandation.** Conditionner le mode résiduel au contexte déjà collecté : `household_vehicles = '0'` retombe sur les transports en commun (ou sur le mode loisirs déclaré s'il existe) plutôt que sur la voiture. Trois lignes de SQL, et la contribution résiduelle voulue par la spec est préservée.

**Décision documentée concernée.** La spec fonctionnelle §5 (l. 135) et v1-05 §4 (tableau des constantes) fixent explicitement « une distance et un mode par défaut (voiture, 15 km) ». La proposition module ce défaut, elle ne le supprime pas.

**Contre-vérification.** Une inexactitude de formulation : le calcul n'« écrase » aucun mode déclaré. Quand B2.1 = « rarement », l'étape `leisure_detail` n'est pas visible (`src/types/bilan.ts` l. 131-132) et `src/components/bilan/steps/leisure-frequency.tsx` l. 48 remet explicitement `leisure_mode` et `leisure_distance_bracket` à `null` : il n'y a donc pas de mode déclaré à préserver, seulement un défaut à choisir. Ce que le constat rate aussi : le repli doit rester non nul pour respecter la spec (« contribution résiduelle faible plutôt que zéro »), donc retomber sur `velo` (0,000170) ou `marche` (0) reviendrait à supprimer le poste. Le repli utile est `metro_tram`/`bus` conditionné à `tc_access` (`inexistant` ⇒ garder la voiture, un foyer rural sans véhicule se fait quand même conduire), pas un simple « pas de voiture ⇒ transports en commun ». Enfin, la modification touche une constante figée par la spec §5 l. 135 et le tableau v1-05 §4 l. 96 : elle demande une ligne dans un document d'increment, sinon elle se relira comme une dérive.


### A7-14 — `distanceBracketMidpointKm` duplique la table de correspondance SQL et n'est appelée par aucun écran

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La fonction reproduit à l'identique le `case` des milieux de tranche que porte `recompute_assessment_results` (2,5 / 10 / 22,5 / 40 / 60). Elle est exportée et couverte par cinq assertions dans `bilan.test.ts`, mais aucun fichier de `src/` ne l'appelle : c'est une deuxième source de vérité pour une règle de calcul, vivante uniquement dans son propre test. Le jour où les tranches bougent d'un côté et pas de l'autre, rien ne le signalera — la suite Jest restera verte puisqu'elle teste la copie, pas l'original. C'est la mécanique de divergence silencieuse que le repo combat ailleurs (la table de vérité des canaux de rappel, écrite deux fois mais épinglée des deux côtés) ; ici il n'y a que la copie.

Preuves : `src/types/bilan.ts:237` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:268` ; `src/types/bilan.test.ts:298`

**Recommandation.** La supprimer avec son bloc de test — la tranche n'est de toute façon qu'un repli jamais alimenté en production (`commute_distance_bracket` est nulle en base) et le calcul est serveur. Si un écran doit un jour afficher un ordre de grandeur, la remettre à ce moment-là, avec un test qui la confronte au SQL et non à elle-même.

**Contre-vérification.** La justification de la recommandation est fausse sur un point, et c'est celui qui risque de faire supprimer la mauvaise chose : `commute_distance_bracket` n'est pas « jamais alimentée en production ». `src/components/bilan/steps/commute-days-distance.tsx` l. 38 et 75 l'écrit dès que l'utilisateur coche « Je ne sais pas », et CLAUDE.md la cite nommément comme exemple de colonne vide mais vivante (« Une colonne vide n'est pas une colonne morte »). Ce qui justifie la suppression, c'est uniquement l'absence d'appelant côté client, le calcul restant serveur. Alternative si on préfère garder la fonction : ne pas la tester contre elle-même mais ajouter l'assertion des cinq milieux de tranche au fichier pgTAP qui couvre `recompute_assessment_results`, la paire devenant alors épinglée des deux côtés comme la table de vérité des canaux de rappel.


### A7-15 — La note du référentiel sur le deux-roues porte encore le chiffre et la justification que la migration cylindrée a réfutés

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`emission_factor_sources.note` pour `deux_roues_motorise` affirme que « la moto > 250 cm³ (0,14) est plus de deux fois plus émettrice » et que « le scooter est le cas majoritaire du trajet domicile-travail ». Les deux affirmations sont fausses depuis le 05/09/2026 : la grosse moto vaut 0,214700, et surtout le raisonnement « le scooter est majoritaire donc on prend son facteur » est précisément celui que la migration cylindrée a démonté, en montrant qu'il sous-estimait un motard de 64 %. La ligne n'a pas été reprise (la migration 20260905200000 n'écrit que les quatre nouveaux modes, en `on conflict` sur eux-mêmes). Ce n'est pas cosmétique : `emission_factor_sources` est le référentiel qu'on relit pour comprendre un mapping, et il donne aujourd'hui une valeur fausse et une justification périmée à qui reprendra le sujet.

Preuves : `supabase/migrations/20260904160000_sync_emission_factors.sql:55` ; `supabase/migrations/20260905200000_cylindree_deux_roues.sql:16` ; `supabase/migrations/20260905200000_cylindree_deux_roues.sql:70`

**Recommandation.** Une ligne d'`update` dans une migration : la note doit dire que ce mode est le **repli des bilans antérieurs au 05/09/2026** (type non renseigné), pas un choix de représentativité — le choix a changé de nature.

**Contre-vérification.** Une surenchère à corriger dans la synthèse : « plus de deux fois plus émettrice » reste vrai en ACV (0,2147 / 0,0763 = 2,8×) — seule la valeur 0,14 (facteur d'usage seul, d'avant 20260905100000) et la justification de représentativité sont fausses. Portée réelle : `emission_factor_sources.note` n'est lue par aucun code (ni SQL ni `src/`), c'est de la documentation en base — d'où mineur, pas plus. La reformulation proposée est la bonne : dire que le mode est le repli des bilans sans `*_two_wheeler_type` (antérieurs au 05/09/2026), et profiter du même `update` pour aligner `impactco2_slugs` (toujours `array['scooter']`), qui fait que la synchronisation trimestrielle continue de rafraîchir ce repli au tarif du scooter — cohérent avec sa nature de repli, mais à écrire noir sur blanc.


### A7-16 — `database.types.ts` : le bloc Insert d'`assessment_results` a perdu trois colonnes présentes dans Row et Update

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`commute_main_leg_km_year`, `commute_main_leg_co2_kg_year` et `commute_trip_distance_km` figurent dans `Row` (l. 188-191) et dans `Update` (l. 237-240) mais pas dans `Insert`. Un fichier généré ne produit pas cette asymétrie : elle signale une régénération partielle ou une retouche manuelle, sur le fichier même que CLAUDE.md demande de régénérer après chaque migration. Sans conséquence aujourd'hui — aucun code client n'insère dans `assessment_results`, la table est en écriture serveur — mais un fichier de types qui a divergé une fois du schéma est un fichier auquel on ne peut plus opposer le typecheck comme garde, ce qui est pourtant son rôle ici.

Preuves : `src/lib/database.types.ts:188` ; `src/lib/database.types.ts:211` ; `src/lib/database.types.ts:237`

**Recommandation.** Régénérer le fichier (`mcp__Supabase__generate_typescript_types`) et comparer le diff avant de le committer, en respectant le style existant. Au passage, `resolve_mode` y est typée `p_two_wheeler_type: string` alors que la fonction SQL accepte NULL et que c'est son cas normal (bilans sans deux-roues).

**Contre-vérification.** La remarque annexe sur `resolve_mode` est à écarter : `p_two_wheeler_type: string` (l. 843-846) n'est pas une divergence, le générateur Supabase ne modélise pas la nullabilité des arguments de fonction — tous les `Args` du fichier sont typés non-nullables, y compris ceux dont le SQL accepte NULL ; et aucun code de `src/` n'appelle ce RPC. Meilleure recommandation que la simple régénération : régénérer puis vérifier que le diff se limite à ces trois lignes et aux `?` manquants — si d'autres tables bougent, c'est que la retouche manuelle a masqué d'autres migrations, et c'est ce diff-là qui est l'information.


## A8 — SQL — plan de réduction, actions chiffrées, engagement, boucles de check-in

**Résumé du lecteur.** La zone est nettement mieux construite que ce que son historique laisserait craindre : le passage des actions « phrases » aux actions « opérations chiffrées » (migration 20260905130000) est solide, honnête sur ses limites, et le raisonnement sur le facteur effectif comme sur le seuil de 5 kg tient à la relecture. Les gardes de privilège sont partout où on les attend, et le plan vide est traité comme un état normal, ce qui est rare. Ce qui frappe le plus, en revanche, c'est que la seule donnée vraiment personnelle de cette zone — l'action engagée et son intention — n'est protégée par rien dans la durée : elle est supprimée à chaque reconstruction du cycle, donc à chaque re-bilan (geste que le produit encourage), et l'horloge du téléphone suffit à déclencher cette reconstruction toutes les nuits, puisque la garde d'idempotence compare un horodatage serveur à un `submitted_at` fourni par le client. Second axe : la boucle ne se referme jamais. Le cap −20 % est annoncé puis abandonné (`period_end` n'est lu par personne), la fin de saison n'existe pas comme moment, le check-in ne sait rien de l'action engagée, et ni /suivi ni aucune vue d'analyse ne conserve trace des engagements passés — de sorte que le levier construit à l'étape 6b n'est ni rappelé à la personne, ni mesurable par le produit. Enfin, le contexte B4 n'est filtré qu'à moitié : `zone_type` et `mobility_constrained` ne sont jamais lus par l'estimateur, et le métro reste proposé en tête de plan à un profil rural. Vingt constats, dont deux bloquants et douze importants.

**Points forts à ne pas casser**

- **Les actions sont des opérations, pas des phrases** — `estimate_action_savings` calcule un gain comme produit du CO2 de la part touchée et de la fraction qui disparaît (`1 − f_nouveau / f_effectif`). Écrit ainsi, covoiturer un trajet déjà covoituré ou passer au vélo quand on pédale déjà donnent zéro sans cas particulier, et le seuil de 5 kg élimine le bruit. C'est ce qui écarte le bus (14 % seulement) là où un texte générique promettait « les transports en commun ». À ne remplacer par rien.
- **Le facteur effectif de la jambe principale** (`commute_main_leg_co2_kg_year / commute_main_leg_km_year`) : les substitutions se calculent contre ce que la personne fait réellement, division du covoiturage comprise, et non contre un conducteur seul qu'elle n'est pas. Détail invisible et structurellement juste.
- **Le statut `expired` et la ceinture `keepLatestPerLoop`** : une semaine sans réponse n'est pas une question encore ouverte, elle est close côté serveur et jamais réaffichée, et l'écran ne montre de toute façon qu'une question vivante par boucle même si un passage de cron était manqué. C'est ce qui empêche le mur de devoirs non faits, et c'est le bon registre.
- **L'engagement passe par un RPC `security definer`, jamais par une policy UPDATE**, avec un test qui épingle qu'un `update` direct sur `saving_kg_year` reste sans effet y compris pour le propriétaire. Le raisonnement (la RLS filtre des lignes, jamais des colonnes) est correct et le garde-fou est au bon endroit.
- **Le plan vide est un état légitime, testé nommément** (scénario D du test 02 : trajet à vélo, aucune action, cycle créé quand même). Le profil le plus vertueux du produit n'a ni écran cassé ni liste vide — c'est exactement le cas qui casse d'ordinaire ce genre de fonctionnalité.
- **L'instantané par segment sur `assessment_results`** : les kilomètres ne sont calculés qu'à un seul endroit (`recompute_assessment_results`) et l'estimateur les lit. Deux implémentations du même barème auraient divergé au premier changement de facteur ; la contrainte est posée et respectée.

### A8-1 — Refaire son bilan efface l'engagement en cours, sans le dire et sans trace

`technique` · sévérité **important** · verdict **confirme** · effort moyen

`generate_plan_cycle_for_user` reconstruit le cycle dès que le cycle existant est antérieur au dernier bilan, et commence par supprimer TOUTES les `plan_actions` du cycle. Or depuis l'étape 6b ces lignes ne portent plus seulement des chiffres régénérables : elles portent `committed_at`, `intention_days` et `intention_timing`, c'est-à-dire le seul choix personnel que la personne ait posé dans ce produit. Refaire son bilan dans la même saison — geste explicitement encouragé (bouton « Refaire mon bilan » sur /suivi et sur /plan, et v1-07 §3.2 décrit même le cas « corriger une réponse juste après avoir soumis ») — efface donc l'intention d'implémentation en silence. Le commentaire de la migration 20260904180000 posait pourtant la condition inverse : « l'étape 6 attachera au cycle les actions que l'utilisateur choisit, qu'un passage nocturne ne doit jamais écraser » ; la garde protège du cron, pas du re-bilan. Aucun test ne couvre ce croisement (08 teste la reconstruction avant 6b, 13 teste l'engagement sans reconstruction).

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:718` ; `supabase/migrations/20260905190000_engagement_action.sql:29` ; `supabase/migrations/20260904180000_checkin_expiry_and_plan_refresh.sql:110`

**Recommandation.** Préserver l'engagement à la reconstruction : relire `committed_at`/`intention_days`/`intention_timing` avant le `delete` et les reposer si le même `action_template_id` est de nouveau retenu ; sinon, archiver l'engagement (table `plan_action_commitments` ou colonnes `released_at`/`released_reason` conservées) plutôt que de le supprimer, et le dire à l'écran (« ton nouveau bilan change ton plan, ton engagement précédent est dans ton suivi »). Ajouter un test pgTAP : s'engager, resoumettre un bilan le même jour, vérifier ce qu'il advient de l'engagement.

**Contre-vérification.** Deux choses que le constat rate. (1) Le même `delete` n'est pas seulement déclenché par un re-bilan : combiné à A8-2, il se rejoue à chaque passage du cron dès que `submitted_at` est dans le futur — c'est le vrai scénario de perte répétée. (2) La reconstruction ne coupe rien côté check-ins (`engagement_checkins` ne référence pas `plan_actions`, aucune FK), donc la personne continue à recevoir « as-tu fait ton action ? » pendant que l'engagement a disparu du plan : l'incohérence est visible, pas seulement la perte. Reco plus économique que l'archivage : conserver l'engagement quand le même `action_template_id` est re-retenu (rejouer `committed_at`/intentions après l'insert, en une seule requête de report), et n'effacer que si l'action ne fait plus partie du plan — dans ce cas seulement l'annoncer à l'écran. Sévérité ramenée à important : la perte se limite à trois colonnes d'une ligne, le plan reste correct et immédiatement re-engageable.


### A8-3 — Un échec de génération du plan fait échouer tout le bilan, en laissant un bilan orphelin

`technique` · sévérité **important** · verdict **confirme** · effort petit

`recompute_assessment_results` termine par un `perform public.generate_plan_cycle_for_user(...)` non protégé. Toute erreur levée dans cette branche — et `estimate_action_savings` appelle `public.emission_factor(t.substitute_mode_id, ...)`, qui lève explicitement si un mode n'a pas de facteur, exactement le scénario du référentiel incomplet que CLAUDE.md décrit pour l'ajout d'un mode — remonte jusqu'au RPC client. Le client jette alors, affiche « Ton bilan n'a pas pu être enregistré » **alors que `assessments` (status `completed`) et `assessment_answers` sont déjà commités** par deux inserts précédents : il reste un bilan complété sans résultat, et un réessai crée un second bilan. Le moment de prise de conscience le plus fort du produit est ainsi rendu dépendant du bon état d'une table de référentiel d'actions.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:443` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:612` ; `src/app/bilan/index.tsx:175`

**Recommandation.** Envelopper l'appel au plan dans un `begin ... exception when others then raise warning ... end;` : le bilan doit être calculé et rendu même si le plan échoue (le cron quotidien rattrapera). Compléter côté client en rendant la soumission ré-entrante (réutiliser le bilan `completed` sans résultat au lieu d'en insérer un second).

**Contre-vérification.** Le constat rate deux conséquences en aval qui renforcent la reco. (1) src/app/index.tsx:41-57 route vers `/plan` dès qu'il existe UN bilan `completed`, sans regarder `assessment_results` : après l'échec, le prochain lancement envoie la personne sur un plan vide au lieu de l'onboarding ou du questionnaire. (2) `src/lib/bilan-history.ts:31-35` anticipe déjà explicitement le cas « bilan complété dont le calcul aurait échoué » et l'écarte du suivi — l'orphelin est donc un état déjà connu du code, ce qui rend d'autant plus étrange qu'il puisse être créé par le chemin nominal. Le `begin ... exception` proposé est le bon correctif ; ajouter le même filtre `assessment_results` à la requête de routage de index.tsx est encore moins cher.


### A8-4 — L'écran annonce des actions « liées à » un poste qui n'est pas le leur, et un cap qui ne les mesure pas

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

Quand le poste dominant n'offre aucune action (profil vertueux sur son trajet quotidien), la génération complète volontairement le plan avec les actions des autres postes — décision juste, un plan vide serait le pire retour. Mais rien ne suit ce basculement à l'écran : `plan_cycles.trip_label` reste le libellé du poste **dominant**, et /plan écrit « Deux actions liées à Trajet domicile-travail (Vélo) » au-dessus de deux actions qui portent en réalité sur les voyages ou les loisirs. Le cap subit le même décalage : il vaut 20 % de `baseline_co2_kg_year`, c'est-à-dire du poste dominant, et le commentaire de l'écran invite pourtant à « voir d'un coup d'œil qu'en cumulant deux actions elle l'atteint » — cumul de gains pris sur d'autres postes contre un dénominateur qui ne les contient pas. La carte d'action affiche par ailleurs son pourcentage contre l'empreinte **totale**, soit un troisième dénominateur sur le même écran.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:732` ; `src/app/(tabs)/plan.tsx:382` ; `src/app/(tabs)/plan.tsx:448` ; `src/components/plan/action-card.tsx:94`

**Recommandation.** Persister sur `plan_cycles` le fait que les actions retenues ne sont pas celles du poste dominant (ou stocker le poste réel de chaque action, déjà connu de `estimate_action_savings`) et adapter la phrase d'intro. Pour le cap : soit l'asseoir sur le total quand les actions viennent de plusieurs postes, soit le formuler comme un repère du poste dominant sans inviter à y cumuler des gains d'ailleurs.

**Contre-vérification.** Aucune migration n'est nécessaire pour la partie libellé : `src/app/(tabs)/plan.tsx:184` sélectionne déjà `action_templates(action_text, poste)`, et `plan_cycles` porte de quoi savoir quel poste est dominant — le mismatch est donc détectable côté client aujourd'hui, ce qui rend la correction de la phrase d'intro (« Deux actions, sur d'autres postes que X ») quasi gratuite. Ne reste vraiment à trancher que le cap : le formuler sur le total quand les actions débordent du poste dominant, ou en faire un repère de poste sans l'invitation au cumul, en gardant en tête la règle produit « jamais un échec » (l'atteindre ou non doit rester lisible sans reproche).


### A8-5 — Le contexte B4 ne filtre que « aucun transport en commun » : métro et tram restent proposés en zone rurale

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

Le filtre de plausibilité de l'estimateur ne lit qu'une des trois questions de contexte : `tc_access = 'inexistant'`. `zone_type` n'est jamais consulté, et `assessment_results.mobility_constrained` — calculé et stocké précisément pour dire « pas d'alternative crédible à la voiture » — n'est lu nulle part dans `estimate_action_savings`. Conséquence : quelqu'un en `rural` avec `tc_access = 'limite'` (donc `mobility_constrained = true`) se voit proposer « Passer deux trajets sur cinq en métro ou en tram », et comme le métro est la substitution la plus rentable du référentiel (33× la voiture thermique), elle arrive **en tête** de son plan. C'est le contraire de ce que la spec §5 demandait au contexte B4 : « éviter de traiter un profil rural sans alternative comme un mauvais élève ». Une action irréalisable en première position est décourageante, et elle chasse du plan une action que la personne aurait pu tenir.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:524` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:365` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:140`

**Recommandation.** Ajouter à `action_templates` une colonne de zones admissibles (ou un `requires_dense_urban boolean`) et la lire dans le filtre B4 : le métro/tram ne se propose pas hors `urbain_dense`. Faire lire `mobility_constrained` par l'estimateur pour écarter d'office les substitutions vers les transports en commun, et vérifier en base — comme le tableau de v1-07 §3.3 l'a fait pour `inexistant` — que le plan reste alimenté (covoiturage, télétravail, regroupement).

**Contre-vérification.** Nuance à porter dans la synthèse : v1-07 (l.464-466) affecte explicitement `mobility_constrained` à la restitution (« où il servira à retirer la comparaison à la moyenne nationale »), pas à l'estimateur — le faire lire par `estimate_action_savings` est une extension d'usage assumée, pas la réparation d'un oubli, et il faut vérifier que le champ ne se met pas à piloter deux comportements divergents. Attention aussi à ne pas surfiltrer : `mobility_constrained` couvre `tc_access = 'inexistant'` OU (rural ET limite), donc l'utiliser tel quel écarterait aussi le train/RER, qui reste crédible en périurbain desservi. Un `requires_dense_urban` sur `action_templates` pour le seul métro/tram est plus juste, et il faut refaire en base le tableau de v1-07 §3.3 pour le profil rural+limite avant/après, comme cela a été fait pour `inexistant`.


### A8-7 — Répondre à un check-in ouvre l'écriture sur toutes ses colonnes, horodatage compris

`technique` · sévérité **important** · verdict **confirme** · effort petit

La policy `engagement_checkins answer own` est un UPDATE sans restriction de colonne, et le client écrit lui-même `responded_at` depuis l'horloge de l'appareil. C'est mot pour mot le raisonnement qui a fait choisir un RPC pour `plan_actions` (« la RLS filtre des lignes, jamais des colonnes ») et le trigger serveur pour `usage_events.occurred_at` — mais il n'a pas été appliqué ici. Le trigger `prevent_answered_checkin_update` ne protège que les lignes **déjà** `answered` : sur une ligne `pending` ou `expired`, un client peut réécrire `trip_label` (pourtant snapshoté pour ne jamais changer rétroactivement, v1-02 §2), `period_start`, `period_label`, faire repasser un `expired` en `pending`, ou poser un `responded_at` arbitraire. Aucune contrainte ne lie non plus `status = 'answered'` à `response is not null`. Or `responded_at` et `period_start` alimentent /suivi et la vue `analytics.engagement_by_segment` ; le test 03 ne vérifie que l'isolation entre utilisateurs, jamais ce qu'un propriétaire peut réécrire chez lui.

Preuves : `supabase/migrations/20260827090000_engagement_checkins.sql:280` ; `src/components/checkin-card.tsx:41` ; `supabase/migrations/20260904180000_checkin_expiry_and_plan_refresh.sql:207`

**Recommandation.** Basculer la réponse sur un RPC `answer_checkin(p_checkin_id uuid, p_response boolean)` en `security definer` avec vérification de propriété, qui pose lui-même `status`, `response` et `responded_at := now()`, puis retirer la policy UPDATE (le grant table reste alors sans effet, comme pour `plan_actions`). À défaut, trigger `before update` qui refuse toute modification hors du triplet et écrase `responded_at`. Ajouter au test 03 l'assertion symétrique de celle du test 13 : un `update` direct sur `trip_label` reste sans effet.

**Contre-vérification.** Deux nuances que le constat ne dit pas, l'une atténuante l'autre aggravante. Atténuante : `status` porte un CHECK (`pending`/`answered`, étendu à `expired` par 20260904180000), donc la réécriture reste dans un vocabulaire valide — ce n'est pas une injection de statut arbitraire. Aggravante : le trigger étant `before update` et ne regardant que `old.status`, la protection est franchissable en deux temps sur une ligne déjà répondue si le client repasse d'abord par un statut non-`answered`… non — le trigger bloque dès la première écriture sur une ligne `answered`, la porte est donc bien limitée aux lignes non répondues. Le point le plus concret reste `responded_at` : `loadAnsweredCheckins` (`src/lib/bilan-history.ts:52-74`) le lit tel quel et /suivi ordonne l'historique dessus, donc une horloge d'appareil décalée (pas même malveillante — fuseau, date fausse) suffit à afficher une réponse au mauvais endroit de la frise. La recommandation RPC est la bonne et coûte peu ; à défaut, le trigger `before update` doit aussi refuser une transition de statut autre que pending→answered/expired, sinon un `expired` remis en `pending` fait réapparaître une carte de période révolue, ce que 20260904180000 existe précisément pour empêcher.


### A8-8 — Le cap de la saison est affiché une fois puis abandonné : aucun moment de fin de cycle

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

`plan_cycles` porte `period_end` — écrit à chaque génération, et lu par **rien** : ni une migration, ni un test, ni un écran (seuls `baseline_co2_kg_year` et `target_reduction_pct` sont lus). Le cap −20 % est donc annoncé au début d'une saison et jamais repris : rien ne dit « ta saison se termine dans dix jours », rien ne fait le point de ce qui a été tenu, et à la bascule de saison le cycle suivant se crée en silence pendant la nuit, remplaçant le précédent à l'écran (/plan ne lit que le cycle le plus récent). Pour un produit dont le suivi long est le cœur, la seule unité de temps qu'il définit lui-même n'a ni ouverture ni clôture. C'est aussi le moment de renforcement le plus naturel du modèle, et il n'existe pas.

Preuves : `supabase/migrations/20260823110000_plan_reduction.sql:26` ; `src/app/(tabs)/plan.tsx:184` ; `src/app/(tabs)/plan.tsx:186`

**Recommandation.** Lire `period_end` : afficher la fin de période sur la carte du cap, et construire un moment de bascule (une carte « Ta saison s'achève » qui reprend l'action engagée, les réponses de la période et propose la suite) — sans jamais chiffrer un « tenu / pas tenu ». Le cycle précédent existe déjà en base, il suffit de le relire au lieu de ne prendre que le plus récent.

**Contre-vérification.** Une inexactitude à corriger dans la synthèse : `period_end` n'est pas « lu par rien ». Il l'est par `export_my_data` (`supabase/migrations/20260905210000_suppression_et_export_compte.sql:104`, repris en `20260907230000_rappels_canal.sql:578` : `'au', pc.period_end`). C'est un détail, mais il affaiblit la formulation « écrit et jamais lu » — la bonne formulation est « jamais lu par un écran ni par une décision produit ». Ce que le constat rate par ailleurs : le préalable technique n'est pas seulement de relire le cycle précédent, c'est que `generate_plan_cycle_for_user` **supprime** les `plan_actions` du cycle qu'il reconstruit (`20260905130000:718`, `delete from public.plan_actions where plan_cycle_id = v_cycle_id`) — un bilan refait en cours de saison efface donc la matière d'un futur bilan de clôture. Une carte de fin de saison bâtie sur des lignes qui peuvent disparaître serait vide au pire moment ; A8-1/A8-2 sont bien le prérequis. Enfin, tout écran de bascule doit passer par `useRafraichirAuRetour` (CLAUDE.md, v1-12), sans quoi il n'apparaîtra qu'au relancement de l'app.


### A8-9 — Les engagements passés ne laissent aucune trace lisible par la personne

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

/suivi est explicitement l'écran de la durée, et il ne lit que deux choses : l'historique des bilans et les check-ins répondus. Les engagements — le seul choix délibéré que la personne pose dans ce produit, avec une intention datée — n'y apparaissent jamais, et /plan ne montre que le cycle courant. Au bout d'un an, quelqu'un qui s'est engagé sur quatre actions successives n'a aucun moyen de le voir ; combiné à A8-1 et A8-2, il est même probable que les lignes correspondantes aient été supprimées entre-temps. « Ce que tu as décidé de faire, saison après saison » est pourtant exactement le récit non comparatif, non punitif, que la spec autorise et que l'écran cherche.

Preuves : `src/lib/bilan-history.ts:52` ; `src/app/(tabs)/suivi/index.tsx:266` ; `supabase/migrations/20260905190000_engagement_action.sql:64`

**Recommandation.** Ajouter à /suivi une lecture des cycles passés et de leur action engagée (une ligne par saison : période, action, intention), au même registre que la liste des check-ins — on compte ce qu'on a décidé, jamais ce qu'on a laissé passer. Prérequis : ne plus perdre l'engagement à la reconstruction (A8-1).

**Contre-vérification.** À nuancer sur un point : la trace existe, mais hors app — `export_my_data` restitue par cycle `engagement_pris_le`, `jours_choisis`, `echeance_choisie` (`20260905210000_suppression_et_export_compte.sql:100-116`). Ce n'est pas « lisible par la personne » au sens de l'écran, mais cela signifie que le modèle de données porte déjà exactement le récit demandé : l'ajout à /suivi est une requête, pas un schéma. Meilleure recommandation que celle du constat : plutôt que d'ajouter une lecture de `plan_cycles` à /suivi, dériver la ligne d'historique dans `src/types/suivi.ts` (module pur, testé, sans import de `@/lib/supabase` — contrainte CLAUDE.md) et n'ajouter que la requête à `bilan-history.ts`, au même découpage que le reste. Et surveiller le registre : afficher un engagement passé sans réponse associée ne doit pas se lire comme un reproche, contrainte explicite de l'écran (« aucune mécanique d'échec »).


### A8-10 — Le check-in ignore l'action engagée : la boucle ne referme jamais l'intention

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

L'intention d'implémentation est stockée au jour près (`intention_days`, « le mardi et le jeudi »), et la question hebdomadaire n'en sait rien : elle est générique et ne parle que du poste. Quelqu'un qui s'est engagé à « Faire un trajet sur cinq à vélo, le mardi et le jeudi » reçoit « As-tu changé de mode de transport au moins une fois cette semaine pour Trajet domicile-travail (Voiture) ? ». Le levier comportemental que 6b est allé chercher — nommer le quand — n'est jamais rappelé au moment où il s'exerce. Symétriquement, une action engagée sur les voyages avec `intention_timing = 'prochaine_occasion'` n'est suivie par aucune boucle : `extras` interroge le poste extras du bilan, pas l'action choisie.

Preuves : `src/components/checkin-card.tsx:55` ; `supabase/migrations/20260905190000_engagement_action.sql:32` ; `supabase/migrations/20260904180000_checkin_expiry_and_plan_refresh.sql:49`

**Recommandation.** Snapshoter sur `engagement_checkins` l'action engagée au moment de la génération (`committed_action_text`, `committed_intention`), au même titre que `trip_label`, et laisser la carte reformuler la question autour d'elle quand elle existe (« Tu t'étais dit le mardi et le jeudi — ça s'est fait cette semaine ? »), en gardant la formulation générique sinon. Aucun décompte, aucun « tenu/pas tenu » : la même réponse oui/non.

**Contre-vérification.** La recommandation est cohérente avec l'architecture (snapshot au moment de la génération, exactement le motif déjà retenu pour `trip_label`, v1-02) et avec les non-goals : réponse oui/non inchangée, aucun décompte. Deux précisions qu'elle omet. (1) Le snapshot doit être pris à la génération et **jamais relu à la volée**, sinon un changement d'engagement en cours de semaine réécrit rétroactivement une question déjà posée — c'est la raison d'être de `trip_label`. (2) Le texte reformulé serait de la voix produit ou de celle de Ramille ? S'il est mis dans sa bouche (« Tu t'étais dit le mardi et le jeudi »), il doit vivre dans `src/constants/mascotte.ts` et respecter les trois règles gardées par test — première personne, tutoiement, jamais de nombre. « Le mardi et le jeudi » passe (jours nommés, pas comptés) ; « tes 2 jours » ne passerait pas. Enfin, l'ordre de priorité produit place la boucle mensuelle (4) au-dessus du plan (3) : ce constat sert la brique la plus prioritaire des deux.


### A8-11 — Sur un trajet bimodal, toutes les actions domicile-travail sous-estiment leur gain de moitié

`technique` · sévérité **important** · verdict **confirme** · effort moyen

Quand le trajet comporte un second mode, l'instantané coupe les kilomètres en deux et `commute_main_leg_co2_kg_year` ne porte que la première jambe ; le CO2 de la seconde est rangé à part et n'entre plus jamais dans l'estimateur. Toutes les actions du poste domicile-travail se calculent donc sur la moitié du trajet. C'est particulièrement faux pour `remove_day` : « Garder une journée de télétravail par semaine » supprime la journée entière, les deux jambes comprises, et son gain est pourtant divisé par deux. Le libellé (« Faire un trajet sur cinq à vélo ») décrit le trajet entier tandis que le chiffre n'en couvre que la moitié. L'effet n'est pas seulement une sous-estimation : le classement décide des deux actions retenues, donc un télétravail à demi-gain peut se faire sortir du plan par une action moins utile.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:281` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:557` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:540`

**Recommandation.** Ajouter à l'instantané `commute_second_leg_co2_kg_year` (la valeur existe déjà dans `recompute_assessment_results`, elle n'est simplement pas persistée) et faire porter `remove_day` sur le CO2 du poste entier, pas sur la jambe principale. Pour les substitutions, garder la jambe principale mais rendre le libellé honnête (« sur la partie en voiture de ton trajet »). Un test pgTAP sur un profil voiture + train est le seul moyen de figer la distinction.

**Contre-vérification.** Distinguer nettement deux cas, ce que le constat mélange un peu. Pour `remove_day` (télétravail) c'est un **bug de calcul franc** : l'opération retire la journée entière, la base doit être le CO2 du poste complet ; le facteur 2 est direct et le libellé est sans ambiguïté. Pour `substitute` et `share_vehicle`, ce n'est pas un bug : substituer le vélo à la jambe voiture d'un trajet voiture+train ne peut effectivement porter que sur cette jambe, et le rapport `commute_main_leg_co2 / commute_main_leg_km` est le facteur effectif correct de cette jambe (il porte déjà la division du covoiturage, cf. le commentaire ligne 536-539). Là, le défaut est **le libellé, pas le chiffre** — et la recommandation du constat le dit bien. Deux pièges pour la mise en œuvre : ajouter une colonne à `assessment_results` impose de rejouer le calcul sur les bilans existants (le bloc de reprise en §8 de la même migration montre le motif, y compris son avertissement sur l'ordre instantané/plan) ; et toucher aux gains fait bouger des assertions chiffrées du test 10 — méthode obligatoire du CLAUDE.md : recalculer chaque valeur **par une requête sur la base**, pas à la main. La suggestion d'un test pgTAP sur un profil voiture+train est la bonne et manque aujourd'hui.


### A8-12 — Des actions loisirs sont proposées à partir de réponses que la personne n'a jamais données

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Quand `leisure_frequency = 'rarely'`, le questionnaire saute délibérément l'étape des loisirs (`isStepVisible`), et le calcul fabrique alors un trajet par défaut : 15 km, en voiture. L'estimateur, lui, ne consulte jamais `leisure_frequency` — il voit un `leisure_km_year` non nul (15 × 2 × 0,25 × 52 = 390 km) et propose « Faire une sortie sur trois à vélo » ou « Prendre les transports en commun pour deux sorties sur cinq », avec le détail « Sur tes déplacements de loisir ». Le gain dépasse le seuil de 5 kg, donc ces actions entrent réellement dans le classement, et pour un profil vertueux sur le domicile-travail elles peuvent constituer tout le plan. On recommande alors un changement sur une voiture de loisir que la personne n'a jamais déclarée — c'est une invention présentée comme un fait, dans un produit dont la crédibilité chiffrée est l'argument.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:305` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:562` ; `src/types/bilan.ts:132`

**Recommandation.** Écarter les templates du poste loisirs quand `leisure_frequency = 'rarely'` (le mode et la distance sont alors des hypothèses de calcul, pas des réponses), ou à défaut les reléguer derrière toute action fondée sur une réponse réelle et le dire dans le détail. Même question à se poser pour la restitution.

**Contre-vérification.** Un renfort que le constat ne cite pas, et qui rend la correction indiscutable : le même estimateur écarte déjà explicitement les actions bâties sur l'impossible en lisant le contexte B4 (`20260905130000:520-529`, `requires_tc`/`tc_access = 'inexistant'`, `requires_car`/`household_vehicles = '0'`), avec en commentaire la citation de la spec §5 — « éviter de traiter un profil rural sans alternative comme un mauvais élève ». Proposer un changement sur une voiture de loisir jamais déclarée relève exactement de la même règle, et la correction s'écrit dans le même bloc de `continue` : `if t.poste = 'leisure' and a.leisure_frequency = 'rarely' then continue; end if`. Effort petit, confirmé. Deux effets de bord à ne pas manquer : (1) sur un profil vertueux, retirer ces actions peut laisser un plan à une seule action, ce que la §7 de la migration assume déjà (« un plan vide serait le pire des retours ») — il faut vérifier ce que /plan affiche alors ; (2) la question posée pour la restitution vaut aussi, et plus largement, pour la **boucle extras** : `generate_extras_checkins` s'ancre sur le poste extras du bilan, donc la même hypothèse de 15 km en voiture peut générer un check-in mensuel sur des sorties jamais déclarées. Cela dépasse le périmètre du constat mais mérite d'être remonté.


### A8-14 — Trou de tests : la branche « voyages » de l'estimateur, et les deux règles non négociables du chiffrage

`technique` · sévérité **important** · verdict **confirme** · effort moyen

Le test 10 n'exerce que le poste domicile-travail : ses trois profils déclarent `leisure_frequency = 'rarely'` et aucun vol. Toute la branche `t.poste = 'travel'` — trois templates sur douze, le `least(t.trips, v_count)`, les gardes `v_count < 1`, les libellés au pluriel — n'est donc jamais exécutée, alors qu'elle produit le plus gros chiffre que le produit affiche jamais (renoncer à un long-courrier, de l'ordre de 1 600 kg). Les opérations `share_vehicle`, `remove_day` et `remove_trip` ne sont vérifiées par aucune assertion chiffrée : le test 02 ne demande que `saving_kg_year > 0`. Enfin, les deux règles que CLAUDE.md déclare non négociables ne sont pinnées nulle part : le seuil de 5 kg (le test vérifie « > 0 », pas « ≥ 5 ») et l'absence de tout template proposant le bus — un futur `insert into action_templates` du bus passerait la CI en silence.

Preuves : `supabase/tests/database/10_estimate_action_savings.test.sql:36` ; `supabase/tests/database/02_generate_plan_cycle_for_user.test.sql:69` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:480`

**Recommandation.** Étendre le test 10 avec un profil « voyages » (vols court et long-courrier, longs trajets voiture) et des gains recalculés par requête sur la base, comme le fait déjà le test 02 pour les facteurs. Ajouter trois assertions de règle : aucun gain rendu < 5, aucun `action_templates.substitute_mode_id` de catégorie `transports_commun` valant `bus`, et une valeur chiffrée exacte pour `remove_day` et `share_vehicle`.

**Contre-vérification.** Une imprécision à corriger dans le constat : la branche `travel` n'est pas *jamais* exécutée. `08_checkin_expiry_and_plan_refresh.test.sql` l.117-137 construit un profil à 2 vols long-courriers, relance `recompute_assessment_results`, et la régénération du cycle passe par `estimate_action_savings` — la branche `flight_long` (`least(t.trips, v_count)`, garde `v_count < 1`, libellé au pluriel) y tourne donc réellement. Ce qui manque n'est pas l'exécution mais **toute assertion sur ce qu'elle produit** : le test 08 ne vérifie que `trip_label` et `baseline_co2_kg_year` du cycle, jamais un `saving_kg_year`. Les segments `flight_short` et `car` (avec `resolve_car_mode('voiture', car_long_trips_engine)`) ne sont, eux, exercés nulle part. Deux pièges à prévoir en écrivant l'extension : les gains de voyages sont d'un ordre de grandeur tel qu'ils écrasent le classement, donc le profil « voyages » doit être un utilisateur distinct sous peine de faire tomber les assertions de rang du test 02 ; et les valeurs attendues doivent être recalculées par requête (`public.emission_factor(...)`), pas à la main — c'est la règle explicite du CLAUDE.md sur les assertions chiffrées, qui a déjà fait tomber la CI deux fois.


### A8-15 — Le référentiel d'actions a des manques évidents, dont plusieurs calculables sans toucher aux facteurs

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

Douze templates couvrent trois postes, et plusieurs leviers courants n'y figurent pas alors que la mécanique les supporte déjà telle quelle : covoiturer un long trajet en voiture (`travel` / `car` / `share_vehicle`, l'estimateur applique bien le ratio 0,5 à ce poste), un second jour de télétravail (`remove_day` avec `trips = 2`, pour les semaines à 4-5 jours), la marche pour les sorties courtes (le vélo existe côté loisirs, la marche non), et renoncer à un vol court quand le train n'est pas une option (seul le remplacement par le train existe pour ce segment). Deux autres demandent un mode et un facteur : le vélo à assistance électrique — absent de `transport_modes`, alors que c'est le report modal le plus documenté au-delà de 10 km, précisément là où la garde `max_distance_km = 10` coupe le vélo — et le changement de motorisation. Ce dernier mérite prudence : passer de thermique à électrique vaut environ −53 % du poste et écraserait systématiquement les actions de comportement au classement, tout en n'étant pas un geste à la portée d'un trimestre.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:134` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:613` ; `supabase/migrations/20260824180000_bilan_v2_schema.sql:31`

**Recommandation.** Ajouter d'abord les quatre templates qui ne coûtent qu'une ligne de seed (covoiturage longue distance, second jour de télétravail, marche loisirs, un vol court en moins). Instruire séparément le vélo à assistance électrique (mode + facteur ACV + ligne dans `emission_factor_sources`, sinon il restera figé en silence). Pour la motorisation, si elle est retenue, la sortir du classement par gain — un encart distinct, jamais en concurrence avec une action de comportement.

**Contre-vérification.** Deux pièges que le constat ne voit pas. (1) Le second jour de télétravail : la garde est `if a.commute_days_per_week < 2 then continue` (l.552) — elle a été écrite pour `trips = 1`. Avec `trips = 2` elle laisse passer quelqu'un à 2 jours par semaine, chez qui l'action supprime **100 %** du trajet domicile-travail (`(t.trips / a.commute_days_per_week)` = 1) : « garder deux journées de télétravail » proposé à qui n'en fait que deux, ce n'est plus du télétravail. Il faut une garde par template, du type `commute_days_per_week > t.trips`, pas la constante 2. (2) `share_vehicle` sur `travel` : le poste calcule `v_base_co2 := least(t.trips, v_count) * (v_base_co2 / v_count)` et `least(null, n)` vaut `n` en Postgres — un template sans `trips` porterait donc sur **tous** les longs trajets, silencieusement. Le seed doit renseigner `trips`. Par ailleurs le CLAUDE.md rappelle qu'un mode ajouté sans ligne dans `emission_factor_sources` reste figé à sa valeur de seed sans que rien ne le dise : pour le VAE, la ligne de mapping est aussi obligatoire que le facteur, et le slug Impact CO2 doit être relevé sur `/api/v1/thematiques/ecv/transport` (ACV), jamais sur `/api/v1/transport`. Enfin, ajouter des templates change le classement : les assertions de rang du test 02 sont à revérifier.


### A8-2 — L'horloge du téléphone décide si le plan est reconstruit chaque nuit

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La garde d'idempotence du plan compare `plan_cycles.created_at` (horodatage serveur, `now()`) à `assessments.submitted_at` — qui est fourni par le client, sans défaut ni trigger côté base, contrairement à ce qui a été durci pour `usage_events.occurred_at` (migration 20260905170400). Un appareil dont l'horloge avance de quelques minutes produit `created_at < submitted_at` en permanence : le cron `generate-plan-cycles` (0 5 * * *) reconstruit alors le cycle **toutes les nuits**, ce qui rejoue le `delete from plan_actions` d'A8-1 et efface l'engagement chaque nuit, en boucle, sans qu'aucune trace n'existe. Second effet du même champ : `order by a.submitted_at desc limit 1` place les NULL en tête en Postgres — un `assessments` marqué `completed` sans `submitted_at` (l'insert client est libre, la policy `assessments insert own` ne contraint rien) devient le bilan de référence de toute la chaîne plan + check-ins. Enfin `submitted_at` sert aussi de `v_factor_date` pour le lookup de facteur, donc l'horloge du client choisit la version du référentiel.

Preuves : `src/app/bilan/index.tsx:138` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:695` ; `supabase/migrations/20260823094800_core_schema.sql:57` ; `supabase/migrations/20260905170400_horodatage_serveur.sql:4`

**Recommandation.** Appliquer à `assessments.submitted_at` exactement le traitement déjà retenu pour `usage_events.occurred_at` : trigger `before insert or update` qui écrase avec `now()` quand `status = 'completed'`, plus une contrainte `status = 'completed' => submitted_at is not null`. Ajouter `nulls last` aux `order by submitted_at desc` de `generate_plan_cycle_for_user`, `generate_commute_checkins` et `generate_extras_checkins` en attendant.

**Contre-vérification.** La chaîne d'impact est surévaluée sur son point central. « Quelques minutes d'avance » ne produit PAS une reconstruction nocturne permanente : la garde compare `now()` serveur à `submitted_at`, donc la fenêtre se referme dès que l'horloge serveur dépasse l'horodatage, soit quelques minutes plus tard — bien avant le cron de 5h. Il faut un appareil daté de plus d'un jour dans le futur pour que `generate-plan-cycles` reconstruise chaque nuit ; c'est possible mais ce n'est pas le cas décrit. De même, un `assessments` `completed` sans `submitted_at` ne devient le bilan de référence que s'il porte une ligne `assessment_results` (jointure `join public.assessment_results ar`, l.673 et 128/160), ce qui suppose que le client ait aussi appelé le RPC de calcul : le scénario est auto-infligé et confiné aux données de la personne, pas une faille. La reco reste bonne et peu coûteuse (trigger + `nulls last`) ; noter au passage que `src/lib/bilan-history.ts:34` écarte déjà les bilans sans `submitted_at`.


### A8-6 — Le premier point de suivi peut se faire attendre six jours, ou un mois

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

`compute_assessment_results` génère le plan immédiatement après la soumission — décision explicite de la migration 20260824190000, « le premier cycle ne doit pas attendre » — mais rien d'équivalent n'existe pour les check-ins. `generate_commute_checkins` ne tourne que le lundi 6h UTC et `generate_extras_checkins` que le 1er du mois : quelqu'un qui fait son bilan un mardi n'a aucune question avant six jours, et quelqu'un dont le poste est « voyages » (pas de trajet domicile-travail, donc pas de boucle hebdo) peut attendre jusqu'à trente jours son premier contact. C'est la fenêtre où l'intention est la plus vive, et où l'app est encore installée. À la place, /plan affiche la carte d'attente.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:443` ; `supabase/migrations/20260827090000_engagement_checkins.sql:344` ; `supabase/migrations/20260827090000_engagement_checkins.sql:350`

**Recommandation.** Faire appeler par `recompute_assessment_results` (ou par une fonction dédiée par utilisateur) la génération des check-ins de la période courante juste après le plan, avec la même garde d'idempotence `unique(user_id, loop_type, period_start)` — la question de la semaine en cours existe alors dès la restitution. Attention à ne pas déclencher l'envoi d'un rappel dans la foulée : `enqueue_checkin_reminders` est appelée à l'intérieur des deux fonctions de génération.

**Contre-vérification.** Le constat rate que l'attente est un état **conçu**, pas un oubli : v1-12 §6.2 (docs/architecture/v1-12-rappels.md:300-320) a remplacé « Rien à rattraper. » par une carte d'attente qui nomme le jour (`attenteSigne`/`attenteIci`, « Je te fais signe lundi ») précisément parce que le rythme est fixe — ce n'est pas un contredit_decision (rien n'interdit d'avancer le premier point) mais la synthèse doit le savoir : livrer un check-in immédiat rend ces répliques fausses le jour du bilan et impose de reprendre `carteAttente()`. Deux écueils de fond en plus du rappel signalé : la question hebdo porte sur une semaine déjà entamée (« as-tu fait ton action cette semaine ? » posé le vendredi de la soumission n'a pas le même sens), et un check-in créé à la soumission serait immédiatement redondant avec la feuille d'engagement qui vient de s'ouvrir. La variante la plus sûre est de ne générer que la période **suivante** pour la boucle mensuelle (le cas à trente jours), et de laisser la boucle hebdo au lundi.


### A8-13 — Personne ne peut savoir si l'engagement, cœur de l'étape 6b, sert à quelque chose

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le schéma d'analyse a une vue pour les check-ins (`analytics.engagement_by_segment`, croisée avec le contexte B4) et rien pour `plan_actions.committed_at`. La règle du produit est pourtant claire — on n'instrumente pas ce que le schéma enregistre déjà, mais on en tire une vue : la migration 20260905170300 retire même `plan_action_open` en promettant que « 6b le réintroduira avec l'interaction qui le justifie ». 6b a été livré, et aucune contrepartie n'est venue. Résultat : la question « combien de personnes choisissent une action, laquelle, et est-ce que celles qui s'engagent répondent davantage aux check-ins ? » — qui décide si ce levier vaut d'être développé — n'a aucune réponse possible.

Preuves : `supabase/migrations/20260905170200_user_segments_contexte_b4_reel.sql:72` ; `supabase/migrations/20260905170300_retirer_plan_action_open.sql:7` ; `supabase/migrations/20260905190000_engagement_action.sql:29`

**Recommandation.** Ajouter une vue `analytics.engagement_action_by_segment` : par segment B4 et par poste dominant, nombre de cycles, nombre de cycles avec engagement, template retenu, forme d'intention — et un croisement avec le taux de réponse aux check-ins. Tout est déjà en base, c'est une vue, pas un événement.

**Contre-vérification.** Le constat rate deux choses qui abaissent l'urgence. (1) Aucune donnée n'est perdue : `committed_at`, `intention_days`, `intention_timing`, `action_template_id` et `rank` sont figés en base à la génération, donc la vue est calculable rétroactivement le jour où on la crée — contrairement à un événement d'usage manquant, qui laisse un trou définitif. C'est ce qui justifie « mineur » plutôt qu'« important ». (2) Un proxy partiel existe déjà : `rappels_view` (src/types/analytics.ts) n'est émis que depuis un engagement, donc il donne un ordre de grandeur du nombre d'engagements — mais une fois par appareil seulement (la feuille s'ouvre une fois par appareil, cf. v1-12), donc il sous-compte et ne dit ni quelle action ni quelle intention. Sur la vue recommandée, une précision : le croisement « les engagés répondent-ils davantage aux check-ins ? » doit joindre sur la période (`plan_cycles.period_start`/`period_end` vs `engagement_checkins.period_start`), sinon on compare un engagement d'été à des réponses d'hiver ; et il faut compter les cycles sans engagement au dénominateur, sinon le taux est structurellement 100 %.


### A8-16 — La cadence « trimestre glissant » n'est atteignable par aucun chemin du produit

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`profiles.cadence_type` décide entre saisons météorologiques et trimestre glissant, et aucune ligne de `src/` ne l'écrit ni ne le lit : la chaîne complète (`rolling_quarter_bounds`, le branchement de `generate_plan_cycle_for_user`, le snapshot `plan_cycles.cadence_type`, quatre assertions du test 00 et le scénario B du test 02) n'a pas de porte d'entrée. Ce n'est pas du code mort au sens strict — la fonction est correcte et son cas de bord de fin de mois est finement testé — mais c'est une branche entretenue et jamais empruntée, à côté de laquelle la comparaison « mon été contre mon été précédent » (la raison d'être du choix saisonnier, v1-03 §2) n'est elle non plus construite nulle part.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:683` ; `src/lib/database.types.ts:654` ; `supabase/tests/database/00_period_bounds.test.sql:59`

**Recommandation.** Trancher explicitement : soit ouvrir le réglage (une ligne sur « Toi », ce qui donne du sens au trimestre ancré sur la date du bilan pour qui arrive en plein milieu d'une saison), soit consigner que la branche est conservée en dormance et pourquoi. Dans les deux cas, la comparaison saison-sur-saison mérite d'être construite : les cycles passés sont en base.

**Contre-vérification.** La dormance est déjà à moitié documentée, et le constat l'ignore : `docs/architecture/v1-01-onboarding-bilan.md` l.53 qualifie `cadence_type` de « **paramètre réservé pour la brique 3**, stocké dès maintenant pour ne pas migrer le profil plus tard », et l.213-214 le redit. La moitié manquante est qu'aujourd'hui la brique 3 est livrée et que rien ne dit pourquoi le réglage n'a pas été ouvert — c'est cette phrase-là qu'il faut écrire, pas la découverte d'un mort-vivant. À noter aussi : le handoff design **prévoit** le réglage (`docs/design/README.md` l.173 et l.239, chip « Cadence : saison — été » avec une prop `cadenceMode` à deux valeurs dans `traceverte-ecrans-v1.dc.html`), donc ouvrir le réglage ne serait pas une invention. Le second volet de la recommandation (comparaison saison-sur-saison) est un chantier d'un tout autre poids que « petit » : `/suivi` compare aujourd'hui deux bilans (`src/types/suivi.ts`), pas deux cycles, et rien n'agrège d'émissions par période — les cycles portent une baseline annualisée, pas un réalisé de saison. Le chiffrer comme une comparaison « mon été contre mon été précédent » demanderait de décider ce qu'on mesure, ce que le constat ne fait pas.


### A8-17 — L'historique des points de suivi devient ambigu dès la deuxième année

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le libellé hebdomadaire ne porte pas l'année : « Semaine du 05/01 » désigne indifféremment 2026 ou 2027, et c'est exactement cette chaîne que /suivi affiche, ligne par ligne, sans autre repère de date. Le libellé mensuel, lui, porte bien l'année. Sur le même écran, la liste est par ailleurs coupée aux huit dernières entrées sans aucun moyen de voir la suite. Pour un produit qui affirme que le suivi long est central et qui vise 2050, l'unité d'affichage de l'historique tient donc deux mois.

Preuves : `supabase/migrations/20260904180000_checkin_expiry_and_plan_refresh.sql:39` ; `src/app/(tabs)/suivi/index.tsx:263` ; `src/app/(tabs)/suivi/index.tsx:266`

**Recommandation.** Ne pas réécrire les libellés déjà générés (ils sont snapshotés à dessein) mais dériver l'affichage de `period_start`, qui porte l'année et est déjà lu par `loadAnsweredCheckins` — ou ajouter l'année au libellé des semaines pour les futures générations. Prévoir un regroupement par année quand la liste dépasse huit lignes, plutôt qu'une coupe muette.

**Contre-vérification.** Le constat surestime légèrement la portée en disant « l'unité d'affichage tient deux mois » : la liste ne contient que les check-ins **répondus** (les non-répondus passent en `expired` et ne sont jamais relus, cf. la règle « aucune mécanique d'échec » du CLAUDE.md), donc huit lignes couvrent en pratique bien plus de huit semaines chez quelqu'un qui ne répond pas à chaque fois, et les deux boucles s'y mélangent. L'ambiguïté d'année, elle, est réelle et permanente. Meilleure recommandation que celle proposée : dériver l'affichage de `periodStart` **sans toucher au SQL** — c'est la seule option qui répare aussi les libellés déjà snapshotés en base, alors que changer `to_char` ne vaut que pour les futures générations et laisserait une année d'historique ambigu. Attention en le faisant à ne pas afficher deux dates concurrentes (le libellé snapshoté *et* une date dérivée), et à garder le ton : un regroupement par année est un intertitre, pas un compteur.


### A8-18 — Trois valeurs de `detail_kind` sont déclarées et ne peuvent jamais être atteintes

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La contrainte `action_templates_detail_kind_check` énumère six valeurs, et les trois qui concernent les voyages (`flights_short`, `flights_long`, `car_long_trips`) sont inatteignables : la branche `travel` de l'estimateur construit `v_detail` elle-même avec `format(...)` avant d'arriver au `case t.detail_kind`, qui est gardé par `if v_detail is null`. Les trois templates de voyages portent pourtant ces valeurs en base. C'est la même mécanique que celle qui a fait retirer `plan_action_open` du référentiel d'événements — une valeur déclarée que rien n'atteint ne se lit pas « prévue », elle se lit comme un chemin existant, et le prochain qui ajoutera un template de voyages croira qu'elle pilote quelque chose.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:113` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:625` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:581`

**Recommandation.** Soit faire passer les trois détails de voyages par `detail_kind` comme les autres (un seul endroit qui construit les détails), soit retirer les trois valeurs de la contrainte et mettre `detail_kind` à null sur les templates de voyages, avec un commentaire disant que ce poste construit son propre détail.

**Contre-vérification.** Le constat rate que le défaut est plus qu'esthétique dans un cas précis : un futur template de voyages avec un `detail_kind` **nouveau** (ou nul) recevrait quand même le détail générique du segment, donc `detail_kind` y est non seulement inerte mais *masquant* — il donne l'illusion d'un point de personnalisation qui n'existe pas. Des deux issues proposées, la seconde (retirer les trois valeurs de la contrainte, mettre `detail_kind` à null sur les trois templates de voyages, avec un commentaire SQL) est la bonne : la première obligerait à faire passer par le `case` des détails qui dépendent de `v_count`, c'est-à-dire de variables locales calculées dans la branche — le `case` deviendrait un troisième endroit où se lit la logique de segment, l'inverse du bénéfice recherché. Un `comment on column public.action_templates.detail_kind` disant « le poste voyages construit son propre détail » suffirait, et coûte moins qu'une migration de données.


### A8-19 — Check-in quantitatif (v1-07 §3.6) : ce qui manque au schéma, et le piège de la question écrite deux fois

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort grand

La piste retenue — « combien de fois ? » (0 / 1-2 / 3+) au même coût de geste qu'un oui/non — se heurte aujourd'hui à quatre points concrets. (1) `engagement_checkins.response` est un booléen : il faut une colonne comptée (`response_count smallint` ou un seau fermé `response_bucket`) et garder `response` dérivée pour ne pas casser /suivi ni `analytics.engagement_by_segment`, qui filtrent tous deux sur elle. (2) Aucune contrainte ne lie `status = 'answered'` à une réponse renseignée, et la policy UPDATE ouvre toutes les colonnes (cf. A8-7) : un seau de comptage écrit par le client sans RPC serait une donnée de mesure réinscriptible, exactement ce que le produit refuse pour `saving_kg_year`. (3) Pour recalculer une empreinte vivante entre deux bilans, il faut aussi savoir *sur quelle base* : le check-in ne connaît pas le nombre de trajets de la période (`commute_days_per_week` vit dans le bilan, `trip_label` seul est snapshoté). (4) Le texte de la question existe en deux exemplaires sans aucun lien — la carte in-app et le corps du rappel côté SQL — alors que le canal de rappel, lui, a une table de vérité épinglée des deux côtés (`reminder_channel_for` / `src/types/rappels.ts`). Passer au comptage sans traiter ce point garantit deux formulations divergentes.

Preuves : `supabase/migrations/20260827090000_engagement_checkins.sql:257` ; `src/components/checkin-card.tsx:55` ; `supabase/migrations/20260907230000_rappels_canal.sql:231` ; `supabase/migrations/20260905170200_user_segments_contexte_b4_reel.sql:78`

**Recommandation.** Instruire dans cet ordre : snapshoter sur le check-in la base de comparaison (nombre de trajets de la période), ajouter `response_count` avec `response` maintenue en dérivée, poser la réponse via RPC (A8-7), et sortir la formulation de la question dans une source unique consommée par la carte, l'email et le push — même patron que `reminder_channel_for`.

**Contre-vérification.** Deux nuances et un ajout. Nuance sur (2) : « donnée de mesure réinscriptible » est trop fort — le trigger `prevent_answered_checkin_update` (dernière définition `20260904180000_checkin_expiry_and_plan_refresh.sql:201-213`) refuse tout UPDATE d'une ligne déjà `answered`, donc un seau de comptage écrit par le client serait write-once. Ce qui reste vrai, et suffit à justifier le RPC : avant la réponse, le client peut écrire n'importe quelle colonne (y compris `trip_label`, `period_label`, ou `status='answered'` avec `response`/le futur compte à NULL) — c'est exactement le trou qu'une contrainte `status='answered' => réponse non nulle` fermerait. Nuance sur (3) : la base existe déjà côté serveur sur `assessment_results` (`commute_main_leg_km_year`, etc.), donc l'ajout n'est pas une nouvelle donnée à calculer mais une copie à figer — et il faut la figer, précisément parce que `trip_label` l'est déjà « pour ne pas changer rétroactivement » un check-in si la personne refait un bilan (CLAUDE.md). Ajout que le constat rate : la source unique de la question doit produire **deux formes** (la carte tutoie en majuscule « As-tu… », l'email/push l'enchâsse en minuscule dans une phrase, cf. `20260907230000_rappels_canal.sql:215-222`), et une valeur de test la fige déjà en dur (`supabase/tests/database/17_rappels_canal.test.sql:99`) — cette assertion casserait au premier changement de formulation, ce qui est ici le comportement souhaité, à condition d'ajouter le pendant Jest côté carte, sur le modèle de la paire `rappels.test.ts`/`17_`.


### A8-20 — Deux gardes de l'engagement ne tiennent que côté client

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La contrainte `plan_actions_engagement_coherent` impose exactement une des deux formes d'intention, mais rien en base ne les rattache au poste : `commit_plan_action` accepte des jours de la semaine sur une action de voyage et une échéance fermée sur une action domicile-travail. La règle « demander un jour de la semaine pour un voyage produirait une intention que personne ne peut tenir » (v1-07 §3.3) n'est tenue que par `intentionKindForPoste` côté écran. Par ailleurs `clear_plan_action_commitment` ne signale rien quand aucune ligne ne correspond (action d'un tiers, identifiant inconnu) : le RPC rend un succès et le client affiche « ok », là où `commit_plan_action` lève bien `no_data_found`.

Preuves : `supabase/migrations/20260905190000_engagement_action.sql:58` ; `supabase/migrations/20260905190000_engagement_action.sql:115` ; `src/components/plan/action-commitment.tsx:57`

**Recommandation.** Faire vérifier par `commit_plan_action` que la forme d'intention correspond au `poste` du template visé (l'information est à une jointure), et faire lever `clear_plan_action_commitment` sur zéro ligne touchée, comme sa jumelle — un retour muet masque un identifiant faux.

**Contre-vérification.** Confirmé, mais l'impact réel est plus faible que ce que le titre suggère et la sévérité « mineur » est la bonne : les deux RPC sont bornés au propriétaire, aucune donnée d'autrui n'est atteignable et aucun chiffre figé (`saving_kg_year`) n'est exposé — le pire cas est une intention intenable dans ses propres données, ou un « ok » muet sur un identifiant faux. Sur la recommandation : la jointure existe déjà dans la requête de propriété de `commit_plan_action` (il suffit d'ajouter `join public.action_templates at on at.id = pa.action_template_id` et de comparer `at.poste = 'commute'` à `p_days is not null`), donc l'effort « petit » est juste ; profiter du même passage pour lever explicitement quand les deux ou aucun des deux paramètres sont fournis (aujourd'hui c'est la contrainte CHECK qui rattrape, avec un `23514` illisible côté client — c'est ce que teste `13_engagement_action.test.sql:91,96`). Et adosser la règle à un test pgTAP, faute de quoi elle resterait doublée sans être épinglée, exactement le défaut que la paire `reminder_channel_for`/`src/types/rappels.ts` existe pour éviter.


## A9 — SQL — sécurité (RLS, RPC), rappels/notifications, purge, feedback, mesure d'usage, suppression/export

**Résumé du lecteur.** La zone est nettement plus solide que la moyenne : les fonctions security definer sont systématiquement révoquées de `public, anon, authenticated` (le piège de l'héritage PUBLIC est connu et gardé par des assertions `has_function_privilege`), la suppression de compte repose sur la cascade et non sur une énumération, la purge des anonymes a été corrigée pour porter sur l'inactivité, et la table de vérité du canal de rappel est épinglée des deux côtés. Ce qui manque n'est presque jamais une policy : c'est de l'exploitation. L'envoi des rappels — la seule boucle de réengagement du produit — tourne dans une transaction unique de cent messages sans point de reprise, sort silencieusement quand un secret Vault manque, et n'a aucun journal lisible : rien ne dirait que plus rien ne part. Deux tables échappent au double régime que le reste du schéma s'impose : pas de rétention pour `notification_outbox`, pas de garde-fou de volume pour `push_tokens` alors que `feedback` et `usage_events` en ont un et que chaque visiteur a une session anonyme. La politique de confidentialité décrit trois comportements que le SQL ne tient plus depuis v1-10 et v1-12, et l'export omet la seule table rattachée à `profiles` qui n'y figure pas — au moment même où la migration v1-12 réénonce la règle qui l'interdit. Côté produit, le rappel est bien écrit et bien dosé, mais il n'offre aucune porte de sortie à quelqu'un qui a désinstallé l'app, et le premier point de suivi peut attendre sept jours après le bilan alors que le plan, lui, est généré immédiatement.

**Points forts à ne pas casser**

- La garantie anti-relance est structurelle et non applicative : `unique(checkin_id)` sur `notification_outbox` (20260904200000_checkin_email_reminders.sql:41), et le repli push vers email est écrit comme une mise à jour de la même ligne (`replier_rappel_sur_email`, 20260907230000_rappels_canal.sql:245-259), avec deux assertions qui l'épinglent (17_rappels_canal.test.sql:135-147). C'est le point le plus facile à casser en croyant bien faire.
- La résolution du canal tient en une seule fonction (`reminder_channel_for`, 20260907230000_rappels_canal.sql:156-177), sa jumelle pure côté client (`src/types/rappels.ts:48-52`), et deux tests qui parcourent les six mêmes lignes de la table de vérité. La préférence ne se dégrade jamais d'elle-même en base — c'est ce qui fait que rouvrir les notifications dans les réglages du téléphone suffit.
- La suppression de compte n'énumère aucune table : elle supprime une ligne d'`auth.users` et laisse la cascade faire (20260905210000_suppression_et_export_compte.sql:39), et le test 15 vérifie la chaîne niveau par niveau (15_suppression_et_export.test.sql:123-150) pour qu'un maillon posé un jour en NO ACTION fasse tomber la CI.
- Le durcissement `revoke execute ... from public, anon, authenticated` est appliqué partout et vérifié par des assertions dédiées (09:160-164, 15:41-48, 16:83-87, 17:190-195). La leçon de 20260905170700_revoquer_execute_public.sql (PUBLIC hérité) a bien été généralisée.
- La purge des anonymes retient quatre signaux d'activité avec `created_at` en plancher (20260907093000_purge_anonyme_sur_inactivite.sql:42-51), et le test épingle explicitement que se fier à `last_sign_in_at` reproduirait le bug en ayant l'air de le corriger (16_purge_anonyme_inactivite.test.sql:50-56).
- La mesure d'usage refuse le texte libre par contrainte (`check_usage_event_props`), force l'horodatage serveur par trigger et non par défaut (20260905170400), et un test interdit de réintroduire un événement qui doublerait un fait déjà en base (12_usage_events.test.sql:157-162). Les quinze événements déclarés sont tous réellement émis — vérifié un par un dans `src/`.

### A9-6 — La politique de confidentialité décrit trois comportements que le SQL ne tient plus

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Trois affirmations de /confidentialite ont été invalidées par les corrections de v1-10 et v1-12 sans être reprises. (1) « Session anonyme jamais rattachée : supprimée automatiquement 90 jours après sa création » — c'est le bug corrigé par 20260907093000, qui purge désormais sur l'inactivité ; la page annonce donc une suppression plus précoce que la réalité. (2) « Identifiant de notification… il disparaît si tu désinstalles l'application, si tu coupes les notifications » — `unregister_push_token` et le traitement des reçus ne font que poser `disabled_at`, la ligne et la valeur du jeton restent en base indéfiniment ; seule la suppression du compte et la purge des anonymes les font vraiment disparaître. (3) « Tu peux désactiver les rappels par email à tout moment depuis l'écran « Mon suivi » » — le réglage vit désormais dans « Toi » (/compte), et c'est ce que dit le corps de l'email lui-même. Sur une page dont l'objet est d'être exacte, ces écarts se paient au premier contrôle.

Preuves : `src/app/confidentialite.tsx:196` ; `src/app/confidentialite.tsx:200` ; `supabase/migrations/20260907230000_rappels_canal.sql:112`

**Recommandation.** Reprendre les trois puces : « 90 jours sans aucune activité », « le jeton est désactivé dès que les notifications sont coupées et supprimé avec le compte », « depuis l'écran Toi ». Et, si l'on veut tenir la formulation actuelle sur le jeton, purger les lignes désactivées depuis plus de trente jours.

**Contre-vérification.** Le constat en rate un quatrième, du même lot v1-11 : `src/app/confidentialite.tsx` l.237 renvoie l'export et la suppression à « l'écran « Mon suivi », section « Mes données » », alors que `MonCompte` est monté dans `src/app/compte/index.tsx` l.116 (« Toi ») — et le commentaire de `src/components/compte/mon-compte.tsx` l.13 dit encore « Section « Mes données » de /suivi », donc lui aussi périmé. Sur (2), plutôt que purger les jetons désactivés à 30 jours (ce qui ferait réenregistrer en boucle un jeton refusé par Expo, exactement ce que la ligne conservée évite, l.50-53), la bonne correction est de reformuler la puce : « il cesse d'être utilisé dès que tu coupes les notifications, et il est supprimé avec ton compte ». Ces mentions d'écran vivent en dur dans la page : il n'existe aucune garde en CI pour ce type de dérive, contrairement à `cleanUrls` ou aux titres de page.


### A9-7 — L'email de rappel n'a aucune porte de sortie hors de l'app

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

Le corps du rappel dit « Pour ne plus recevoir ces rappels, désactive-les depuis « Toi » dans l'app. » — la seule sortie passe donc par l'app. Quelqu'un qui a désinstallé Ramille (ou qui lit ses mails sur un ordinateur) continue de recevoir un message par semaine sans moyen de l'arrêter, sauf à réinstaller ou à passer par /compte/suppression, qui efface tout. Le payload Resend ne porte ni lien de désabonnement ni en-tête `List-Unsubscribe`, que les grands fournisseurs de messagerie exigent désormais pour les envois réguliers : sans lui, la seule action disponible pour la personne est « signaler comme spam », ce qui dégrade la délivrabilité de tous les rappels. Le désabonnement en un clic est aussi la lecture que la CNIL fait d'un envoi périodique, même adossé à l'exécution du service.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:219` ; `supabase/migrations/20260907230000_rappels_canal.sql:394`

**Recommandation.** Ajouter au corps un lien vers une route web `/rappels/stop?jeton=…` (jeton à usage unique stocké sur la ligne d'outbox) qui bascule `reminder_channel` sur `none` sans connexion, et joindre l'en-tête `List-Unsubscribe` / `List-Unsubscribe-Post` dans l'appel Resend.

**Décision documentée concernée.** v1-12 §3 et le corps de l'email posent que le réglage du canal vit dans « Toi » ; une page web de désinscription ajoute un second endroit où l'état change, hors de l'app.

**Contre-vérification.** Le constat rate deux nuances qui rendent la recommandation plus précise. (1) Une sortie existe déjà techniquement — l'app web est déployée sur www.ramille.fr et `/compte` (« Toi ») y est atteignable — mais elle est inutilisable en pratique : `ensureSession()` crée une session anonyme vide au nouvel arrivant, il faudrait passer par `/connexion/retrouver` et un lien magique pour retrouver son compte, soit plus long que « signaler comme spam ». (2) Le point de sécurité à ne pas rater dans l'implémentation : la route `/rappels/stop?jeton=` ne doit **jamais** ouvrir de session (contrairement au lien de `sendAccountAccessLink`), sinon on recrée le trou décrit dans CLAUDE.md sur les Redirect URLs — un jeton opaque à usage unique porté par la ligne d'outbox, qui ne fait que `reminder_channel = 'none'`, et rien d'autre. Sur la contradiction alléguée avec v1-12 §3 : elle est faible, l'état de vérité reste `profiles.reminder_channel` en un seul endroit ; c'est une surface d'écriture de plus, pas une seconde source. Ajouter l'en-tête `List-Unsubscribe` seul (mailto: vers l'adresse d'envoi) serait un premier pas d'effort quasi nul si la route web est jugée trop coûteuse.


### A9-1 — L'envoi des rappels est une transaction unique de cent messages : un abandon en cours de boucle renvoie ce qui est déjà parti

`technique` · sévérité **mineur** · verdict **confirme** · effort moyen

`send_pending_reminders()` est une fonction plpgsql, donc un seul bloc transactionnel : les cent appels HTTP et les cent `update` de statut valident ou annulent ensemble. Si la transaction est interrompue après le vingtième envoi (statement_timeout de pg_cron, coupure, redémarrage), les vingt emails ou notifications sont bel et bien partis chez Resend et Expo, mais aucun `status = 'sent'` n'est conservé : le passage du lendemain les renvoie. `unique(checkin_id)` ne protège pas de ce cas — elle interdit une seconde *ligne*, pas un second *envoi* de la même ligne. C'est exactement la promesse que le produit met en avant (« un point, un message, jamais deux ») et c'est la seule voie par laquelle elle peut tomber. Le `exception when others` par ligne ne couvre pas un abandon au niveau transaction. Une procédure (`create procedure` + `commit` par lot) ou un marquage `sent` avant l'appel HTTP lèveraient l'ambiguïté.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:308` ; `supabase/migrations/20260907230000_rappels_canal.sql:402` ; `supabase/migrations/20260904200000_checkin_email_reminders.sql:41`

**Recommandation.** Transformer `send_pending_reminders` en `procedure` appelée par le cron et committer par lot (ou par message), ou basculer la ligne en `sent` avant l'appel HTTP et corriger en cas d'échec. Ajouter au test 09 un scénario qui vérifie qu'une ligne déjà `sent` n'est jamais reprise.

**Contre-vérification.** Le constat est techniquement exact mais surestime la probabilité : le worst case est 100 × CURLOPT_TIMEOUT 20 s (l.306), soit ~33 min, et le cron tourne sous `postgres` qui n'a en général pas de statement_timeout serré ; la fenêtre réelle est donc un redémarrage/failover, pas un timeout quotidien. Deux précisions que le constat rate : (a) « marquer `sent` avant l'appel HTTP » inverse simplement le risque (perte silencieuse de rappels en cas d'échec réseau) et contredit la raison d'être de la table, écrite en 20260904200000 l.32-35 (« un fournisseur indisponible ne fait perdre aucun rappel ») — la seule bonne forme est `create procedure` + `commit` par itération, appelée en `CALL` depuis pg_cron ; (b) la même faiblesse existe sur `collect_push_receipts()` (l.425-500), qui marque `receipts_checked_at` dans la même transaction que l'appel Expo.


### A9-2 — Aucune rétention sur `notification_outbox` : adresses email et corps de message conservés indéfiniment

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La boîte d'envoi garde une ligne par point de suivi et par personne, avec `recipient_email`, `subject`, `body` (qui contient le libellé du poste dominant, donc une information sur les déplacements de la personne), `push_body` et `provider_ticket`. Aucune purge, aucun cron, aucune borne : `grep` sur toutes les migrations ne trouve aucun `delete from public.notification_outbox`. À raison d'un point hebdomadaire plus un mensuel, c'est environ soixante lignes par personne et par an, conservées pour toujours. Tout le reste du schéma respecte une durée annoncée (`purge_usage_events` à douze mois, purge des anonymes à quatre-vingt-dix jours) et /confidentialite les énonce ; cette table n'y figure pas. La cascade à la suppression du compte couvre l'article 17, pas l'article 5-1-e.

Preuves : `supabase/migrations/20260904200000_checkin_email_reminders.sql:42` ; `supabase/migrations/20260905170000_usage_events.sql:151` ; `src/app/confidentialite.tsx:198`

**Recommandation.** Ajouter un `purge_notification_outbox()` (par exemple : suppression des lignes `sent`/`cancelled`/`failed` de plus de six mois) branché sur le cron nocturne, et annoncer la durée dans /confidentialite au même titre que les autres.

**Contre-vérification.** Volume et sensibilité faibles : ~60 lignes/an/personne, toutes déjà dérivées de `engagement_checkins` (exporté et purgé avec le compte par cascade), et l'adresse est celle déjà stockée dans `auth.users`. Ce n'est pas une donnée nouvelle, d'où la sévérité abaissée. Le point que le constat rate, et qui rend la recommandation sûre : la purge ne doit viser que des lignes dont le check-in n'est plus `pending`, car `enqueue_checkin_reminders()` (20260907230000 l.200-238) réinsère `where c.status = 'pending' ... on conflict (checkin_id) do nothing` — supprimer une ligne `sent` dont le check-in serait resté `pending` recréerait un message et casserait précisément la garantie de la spec §7. Filtrer sur `sent_at < now() - interval '6 months'` (donc statut terminal) suffit.


### A9-3 — `push_tokens` est la seule écriture client sans garde-fou de volume, alors que chaque visiteur a une session anonyme

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`register_push_token` est `security definer`, accordé à `authenticated`, et insère sans aucune borne : ni quota par utilisateur, ni format attendu au-delà d'une longueur de 10 à 255 caractères, ni trigger de limitation (aucun `create trigger` dans toute la migration). Or le raisonnement qui a justifié le quota de `feedback` (dix par 24 h) et celui de `usage_events` (cinq cents par 24 h) s'applique mot pour mot ici : ouvrir un RPC à `authenticated` revient à l'ouvrir à quiconque sait appeler l'API, puisque `ensureSession()` donne une session anonyme à tout le monde. Conséquence directe et silencieuse : les jetons d'un même utilisateur sont tous poussés dans un seul appel Expo (`array_agg` puis `to_jsonb(v_tokens)`), donc mille lignes fabriquées font mille destinataires dans une requête qui échouera ou expirera à chaque passage du cron — et cet échec est traité comme un échec d'envoi, avec trois tentatives puis `failed`.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:87` ; `supabase/migrations/20260907230000_rappels_canal.sql:316` ; `supabase/migrations/20260905150000_feedback.sql:66`

**Recommandation.** Borner le nombre de jetons actifs par utilisateur dans `register_push_token` (par exemple cinq, en désactivant le plus ancien au-delà) et vérifier le format `ExponentPushToken[...]` ; borner aussi le tableau envoyé à Expo. Ajouter une assertion au test 17.

**Contre-vérification.** Impact borné : les jetons fabriqués sont rattachés au `user_id` de l'attaquant, donc il ne dégrade que ses propres rappels ; le reste est de la croissance de table dans un schéma sans autre garde-fou de volume. Ce que le constat rate et qui vaut plus que le quota : `on conflict (token) do update set user_id = auth.uid()` (l.94-100) permet à n'importe quelle session de **s'approprier le jeton d'un tiers** dont elle connaîtrait la valeur — les rappels du tiers cessent, et il reçoit sur son téléphone les notifications d'un autre compte. C'est la reprise volontaire documentée (v1-10 §3.4, commentaire l.69-75), donc pas à supprimer, mais elle rend un filtre de format (`ExponentPushToken[...]`) inutile comme protection (il est trivialement imitable) : la borne utile est le nombre de jetons actifs par utilisateur, et surtout un plafond sur le tableau envoyé à Expo (Expo lui-même limite à 100 destinataires par requête, ce qui fait échouer l'envoi bien avant tout autre symptôme).


### A9-4 — Rien ne permet de voir que les rappels partent vraiment — ni vue, ni journal, ni alerte

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Deux chemins font sortir `send_pending_reminders()` sans laisser la moindre trace : l'absence des secrets Vault côté email (`continue` muet dans la boucle) et, avant v1-12, un `return` immédiat. Le repo a pourtant déjà tiré cette leçon pour la synchronisation des facteurs : `emission_factor_sync_runs` existe précisément parce que « le mécanisme prévu dès v1-01 §2 n'avait jamais été construit et rien ne le disait ». Ici, aucun équivalent : `notification_outbox` n'est pas dans le schéma `analytics` (les cinq vues portent sur les segments, l'entonnoir, la volumétrie d'événements et l'engagement), aucune vue ne compte les `sent`/`failed`/`cancelled` par jour, et la table n'est lisible par personne côté client. Si la clé Resend expire ou que le jeton Expo est révoqué, les rappels s'arrêtent et le seul symptôme visible est une baisse de réponses aux points de suivi — indiscernable d'un désintérêt des utilisateurs.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:385` ; `supabase/migrations/20260905170000_usage_events.sql:240` ; `supabase/migrations/20260904200000_checkin_email_reminders.sql:56`

**Recommandation.** Ajouter une vue `analytics.rappels_par_jour` (jour, canal, statut, comptes) et un `analytics.rappels_bloques` (lignes `pending` dont `send_after` a plus de deux jours), plus une ligne de journal quand la fonction sort faute de secret — même rôle que `emission_factor_sync_runs`.

**Contre-vérification.** La prémisse « rien ne permet de voir que les rappels partent » est trop forte et c'est ce qui gonfle la sévérité : contrairement à `sync_emission_factors` — où *aucune trace* n'était écrite, d'où la création d'un journal — ici chaque ligne porte `status`, `attempts`, `last_error`, `sent_at`, `provider_ticket` et `receipts_checked_at`. Un `select status, count(*) ... group by 1` depuis l'éditeur SQL répond à la question, et le symptôme du secret Vault manquant n'est pas silencieux : les lignes s'empilent en `pending` avec `send_after` dépassé, ce qui est exactement l'indicateur proposé (`rappels_bloques`). Il manque donc une commodité de lecture, pas un journal. Recommandation resserrée : une seule vue `analytics.rappels_par_jour` suffit ; ajouter une ligne de journal à chaque sortie sans secret écrirait un enregistrement par jour et par message en attente pour un fait qui se lit déjà dans `pending`.


### A9-5 — L'export omet `notification_outbox`, seule table rattachée à `profiles` absente de l'énumération

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`export_my_data()` énumère ses sources, et la migration v1-12 le rappelle explicitement en tête de sa section 8 : « une nouvelle table qui n'y est pas ajoutée rend un export silencieusement incomplet ». `push_tokens` a bien été ajoutée à cette occasion. Mais `notification_outbox`, créée en septembre et rattachée à `profiles` depuis, ne l'a jamais été : les messages effectivement envoyés à la personne (adresse, sujet, corps, canal, date d'envoi, échecs) n'apparaissent nulle part dans le JSON qu'elle télécharge. En croisant l'énumération avec la liste des tables du schéma généré (`src/lib/database.types.ts`), c'est la seule absence — les autres tables du fichier sont soit des référentiels (`transport_modes`, `emission_factors`, `action_templates`, `usage_event_types`), soit des journaux d'exploitation sans lien utilisateur (`emission_factor_sync_runs`).

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:515` ; `supabase/migrations/20260907230000_rappels_canal.sql:605` ; `src/lib/database.types.ts:476`

**Recommandation.** Ajouter une clé `rappels_envoyes` à `export_my_data` (période, canal, statut, date d'envoi ; le corps est utile puisqu'il contient ce qu'on lui a écrit), et une assertion au test 15 comme pour `appareils_pour_les_rappels`.

**Contre-vérification.** Le fait est exact, la sévérité non : au titre de l'art. 15, l'information manquante est presque entièrement redondante — le `body` est construit à la volée à partir de `trip_label` et `loop_type` (l.211-224), tous deux déjà rendus dans `points_de_suivi`, et l'adresse est déjà dans `compte`. Ce qui n'est effectivement nulle part ailleurs, c'est la trace d'expédition (canal effectif, date d'envoi, échecs). Recommandation resserrée : exporter `periode`, `canal`, `statut`, `envoye_le` — mais **pas** `provider_ticket` ni le `recipient_email` brut, pour la même raison que celle qui écarte déjà la valeur du jeton (l.518-523). À traiter dans la même passe que A9-2, la purge et l'export devant s'accorder sur la même fenêtre.


### A9-8 — Le garde-fou de volume de `feedback` se reconnaît côté client à une sous-chaîne française du message d'erreur

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`enforce_feedback_rate_limit` lève avec `errcode = 'check_violation'` (23514), le même code que la contrainte de longueur `feedback_message_check` — le fichier de test le documente d'ailleurs comme le piège qui a fait passer une assertion pour rien. Le code ne suffit donc pas à distinguer les deux cas, et le client s'en remet au texte : `error.message.includes('plusieurs retours')`. C'est exactement l'anti-motif que le repo a déjà payé et documenté ailleurs (« la limite d'envoi se reconnaît au code `over_email_send_rate_limit`, jamais au message »). Le message SQL est une phrase française destinée à être montrée telle quelle, donc de celles qu'on retouche : une virgule déplacée et la personne voit « Vérifie ta connexion et réessaie » à la place. Rien ne garde la paire.

Preuves : `src/lib/feedback.ts:47` ; `supabase/migrations/20260905150000_feedback.sql:80` ; `supabase/tests/database/11_feedback.test.sql:52`

**Recommandation.** Donner au trigger un code distinct (par exemple `errcode = 'P0001'` avec un `hint`/`constraint` reconnaissable, ou un SQLSTATE dédié de la classe 'P0'), et faire porter le test 11 sur ce code plutôt que sur la phrase.

**Contre-vérification.** Sévérité corrigée à la baisse : la conséquence maximale est cosmétique — une personne qui a déjà envoyé dix retours en 24 h lit « Vérifie ta connexion » au lieu du message de Ramille ; aucune perte de donnée, aucun contournement du garde-fou, aucun impact sécurité. Cela reste à corriger parce que la doctrine du dépôt est explicite sur ce motif. Détail utile pour la correction : `raise ... using errcode = 'P0001'` fonctionne, mais PostgREST rend alors un HTTP 400 au lieu du 400/409 actuel — vérifier que `error.code` est bien exposé côté client (supabase-js remonte `code` sur PostgrestError) avant de basculer, et faire porter l'assertion de 11_feedback.test.sql sur le SQLSTATE plutôt que sur `throws_ok` avec la phrase. Ajouter au passage un test unitaire sur la dérivation côté client, sinon la paire reste non gardée quel que soit le code choisi.


### A9-9 — L'entonnoir segmenté ne peut pas segmenter ceux qui abandonnent — c'est-à-dire sa seule population utile

`technique` · sévérité **mineur** · verdict **confirme** · effort moyen

`analytics.bilan_funnel_by_segment` est présentée comme « la vue qui répond à quels groupes traiter en premier ». Ses trois axes (`zone_type`, `tc_access`, `dominant_poste`) viennent de `analytics.user_segments`, qui les lit sur le **dernier bilan soumis** : `left join lateral (… where a2.submitted_at is not null …)` puis `left join public.assessment_answers ans on ans.assessment_id = a.id`. Or le contexte B4 est la **dernière** étape du questionnaire (`context`, 9/9) et n'est écrit qu'à la soumission. Quiconque décroche avant la fin n'a donc ni zone, ni accès aux transports, ni poste dominant : la vue le range dans `(NULL, NULL, NULL)`. Elle ne peut ventiler que les gens qui sont allés au bout — exactement ceux qui n'ont pas abandonné. Comme la vue de 20260905170100 avant elle, elle ne lève aucune erreur : elle répond calmement à côté.

Preuves : `supabase/migrations/20260905170200_user_segments_contexte_b4_reel.sql:50` ; `supabase/migrations/20260905170200_user_segments_contexte_b4_reel.sql:60` ; `src/types/bilan.ts:92`

**Recommandation.** Soit segmenter sur des axes disponibles avant la fin (plateforme, ancienneté du compte, `is_anonymous`), soit émettre `zone_type`/`tc_access` en propriétés de l'événement `bilan_step_view` de l'étape `context` — ou plus simplement ajouter une colonne `a_termine_un_bilan` à la vue pour que le NULL cesse de se lire comme une donnée manquante.

**Contre-vérification.** Sévérité corrigée à la baisse : la vue n'a aucun effet produit, elle n'est lue par personne d'autre que l'auteur, et le seau NULL est en réalité *informatif* — c'est exactement la cohorte « n'a jamais terminé de bilan ». Le défaut est un défaut d'étiquetage, pas un chiffre faux : la colonne `users` reste juste pour chaque étape. La recommandation la moins chère est donc bien la troisième (colonne `a_termine_un_bilan`), pas l'émission de props supplémentaires sur `bilan_step_view` — celle-là ferait entrer `zone_type` dans les props d'événement, alors que src/types/analytics.ts pose qu'on n'envoie que des valeurs venues du code et que les axes de segmentation sont « déjà en base » (c'est l'argument qui a écarté PostHog). Ce que le constat rate : pour un utilisateur qui refait un bilan, la vue attribue à *toutes* ses étapes passées, y compris celles d'un abandon antérieur, les segments de son dernier bilan soumis — l'entonnoir mélange donc deux époques du même utilisateur.


### A9-11 — Le premier point de suivi peut attendre sept jours après le bilan, alors que le plan est généré immédiatement

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort moyen

`generate_commute_checkins()` n'est appelée que par le cron du lundi 6 h, et `generate_extras_checkins()` que le 1er du mois. Rien ne les déclenche à la soumission d'un bilan — alors que `generate_plan_cycle_for_user` est, elle, appelée à la fin de `compute_assessment_results` précisément « pour que le plan existe immédiatement après soumission plutôt que d'attendre le prochain passage du cron ». Quelqu'un qui fait son bilan un mardi voit donc son plan, s'engage sur une action, voit la feuille des rappels s'ouvrir… et n'a ensuite aucun point à répondre pendant six jours. Le moment où l'envie est la plus forte est celui où la boucle est la plus muette, et le premier rappel (donc la première preuve que l'accompagnement existe vraiment) arrive presque une semaine plus tard.

Preuves : `supabase/migrations/20260827090000_engagement_checkins.sql:344` ; `supabase/migrations/20260824190000_plan_cycle_on_submit.sql:279` ; `supabase/migrations/20260907230000_rappels_canal.sql:186`

**Recommandation.** Appeler `generate_commute_checkins()`/`generate_extras_checkins()` (ou une variante bornée à un utilisateur) à la fin de `compute_assessment_results`, comme pour le cycle de plan. Le `on conflict (user_id, loop_type, period_start) do nothing` rend l'appel idempotent, et `unique(checkin_id)` garantit qu'un seul rappel partira.

**Contre-vérification.** Deux effets de bord que le constat ne voit pas et qui renforcent le refus. (1) `generate_commute_checkins()` se termine par `perform public.enqueue_checkin_reminders()` : l'appeler à la soumission enverrait un push (`send_after = now()` pour le canal push) potentiellement dans les minutes suivant le bilan, à quelqu'un qui vient de fermer la feuille des rappels — exactement le « pas au lancement, pas à la fin du bilan » de v1-12 §2.2. (2) La fonction commence par un `update … set status = 'expired' where period_start < v_period_start` sur **tous** les utilisateurs : un appel déclenché par la soumission d'une seule personne périmerait les points en attente de tout le monde hors du créneau prévu. La variante « bornée à un utilisateur » évoquée dans la recommandation serait donc obligatoire, pas optionnelle. Si l'on voulait vraiment raccourcir l'attente, le chemin cohérent avec la décision serait de faire *dire* le bon jour à la carte d'attente (déjà le cas) plutôt que d'avancer le point — ou d'en rediscuter comme d'une révision produit assumée, dans un v1-13, pas comme d'un correctif.


### A9-12 — Un repli push vers email perd une journée entière

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Quand une ligne `push` ne trouve plus aucun jeton actif, `replier_rappel_sur_email` la repasse en `pending` avec `send_after = now()` — mais la boucle a déjà lu son jeu de lignes, et fait `continue` : la ligne repliée ne sera reprise qu'au passage suivant du cron, le lendemain à 7 h UTC. Pour un point hebdomadaire, c'est un septième de la fenêtre perdue ; pour quelqu'un dont la boucle est mensuelle, c'est sans importance. Le cas n'est pas marginal : c'est précisément celui de la personne qui a coupé les notifications dans les réglages de son téléphone, et à qui l'app promet que « l'email prend le relais tout seul ».

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:320` ; `supabase/migrations/20260907230000_rappels_canal.sql:245`

**Recommandation.** Traiter le repli dans la même passe : après avoir replié, recharger la ligne et enchaîner sur la branche email, ou faire une seconde boucle courte sur les lignes repliées en fin de fonction.

**Contre-vérification.** Deux précisions. D'abord, le retard n'est d'un jour que la première fois : dès la semaine suivante, `reminder_channel_for()` résout directement sur `email` si aucun jeton actif n'existe, donc la ligne naît en email — mais elle hérite alors de l'étalement de 0 à 4 jours (v1-10 §2.B), ce qui peut coûter plus qu'un jour et que le constat ne mentionne pas. Ensuite, la correction la plus sûre n'est pas de « recharger la ligne et enchaîner » à l'intérieur du même `for` (le curseur est déjà ouvert, et la branche email exige `v_api_key`/`v_from`), mais une seconde boucle courte en fin de fonction sur `status='pending' and channel='email' and send_after <= now()` — idempotente, elle rattrape aussi les replis d'un passage précédent. Attention à la borner (le même `limit`) pour ne pas transformer la fonction en boucle non terminante, et à ce que `attempts` continue de n'être incrémenté que sur une tentative d'envoi réelle : le repli ne doit pas en consommer, comme le commentaire de l.321 le pose.


### A9-13 — Push et email partagent le même plafond de cent messages par passage

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La boucle d'envoi prend cent lignes par exécution, tous canaux confondus, triées par `send_after, created_at`. Or l'étalement sur cinq jours n'existe que pour ménager le plafond journalier de Resend — la note de la migration le dit explicitement — et les lignes push portent `send_after = now()`, donc elles arrivent toutes en tête du tri le lundi matin. À l'échelle où les deux canaux coexistent, les notifications (qui n'ont aucune raison d'être plafonnées à cent, l'API Expo acceptant des lots de cent destinataires par requête) consomment le budget destiné aux emails, et repoussent ces derniers d'un jour supplémentaire à chaque fois. Le plafond n'est pas là où la contrainte est.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:308` ; `supabase/migrations/20260907230000_rappels_canal.sql:223` ; `supabase/migrations/20260907090000_etaler_envoi_rappels.sql:24`

**Recommandation.** Séparer les deux budgets : `limit 100` sur les lignes `channel = 'email'`, une boucle distincte et plus large (ou par lots de cent destinataires) pour le push.

**Contre-vérification.** Deux choses que le constat rate. (1) Le vrai goulot du push n'est pas le plafond mais la forme de l'appel : la boucle fait **une requête HTTP Expo par ligne d'outbox** (un `POST /push/send` par utilisateur, lignes 335-343) avec `CURLOPT_TIMEOUT` à 20 s ; cent lignes lentes, c'est potentiellement plus de trente minutes dans un seul cron. Regrouper par lots de cent destinataires (ce que l'API permet) réglerait le plafond *et* la durée, mais impose de savoir répartir les tickets par ligne — c'est le vrai coût de la recommandation, pas le `limit`. (2) Même famille, non relevée : une ligne email sautée faute de secrets Vault (`continue`, lignes 384-387) consomme quand même un des cent slots, donc une configuration Resend absente peut à elle seule bloquer l'écoulement du push. Un `where` qui exclut les lignes non expédiables serait plus utile que deux boucles.


### A9-14 — `collect_push_receipts` n'est ni bornée ni relancée proprement

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La fonction agrège les tickets de cent lignes d'outbox dans un seul objet, puis envoie **tous** les identifiants en une requête `getReceipts` — sans borne. Chaque ligne peut porter plusieurs tickets (un par appareil), donc le tableau peut dépasser la limite de mille identifiants documentée par Expo, et l'appel échoue en bloc. Second point : si la réponse n'est pas 2xx, `receipts_checked_at` n'est jamais posé (le `update` est à l'intérieur du `if`), donc les mêmes lignes sont resélectionnées chaque jour indéfiniment, et le lot en tête de file bloque tous les suivants — alors qu'Expo ne conserve les reçus que vingt-quatre heures, après quoi la relance ne peut plus rien apprendre.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:467` ; `supabase/migrations/20260907230000_rappels_canal.sql:484` ; `supabase/migrations/20260907230000_rappels_canal.sql:451`

**Recommandation.** Découper l'envoi en lots de mille identifiants, et poser `receipts_checked_at` (ou abandonner la ligne) au-delà de quarante-huit heures même en cas d'échec, pour que la file avance.

**Contre-vérification.** Le dépassement des mille identifiants est le point faible du constat : cent lignes ne dépassent la limite que si la moyenne excède dix appareils par personne, ce qui est hors de portée à l'échelle du produit — le découpage en lots est prudent, pas urgent. Le blocage de tête de file, lui, est le vrai défaut et il est plus grave que présenté : combiné à l'argument du constat (Expo ne garde les reçus que 24 h), un unique 5xx d'Expo fige définitivement la désactivation des jetons morts pour toutes les lignes suivantes, alors que le but déclaré de la fonction (§7 de la migration) est de protéger la réputation FCM. Le correctif minimal, plus simple que le découpage : poser `receipts_checked_at = now()` quel que soit le statut de la réponse (le reçu n'étant plus consultable passé 24 h, ne pas le relire ne perd rien), et journaliser l'échec dans `last_error`.


### A9-15 — `enforce_feedback_rate_limit` est la seule fonction de trigger dont l'EXECUTE reste accordé à PUBLIC

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La migration 20260905170700 a révoqué `execute … from public, anon, authenticated` sur les deux fonctions de trigger de la mesure d'usage, en expliquant que c'était fait « par principe — PostgREST n'expose pas une fonction qui rend `trigger`, mais on ne laisse pas un droit dépendre de ce détail ». `handle_new_user` avait reçu le même traitement dès 20260823095100. `enforce_feedback_rate_limit`, créée entre les deux, n'a jamais été révoquée : c'est la seule fonction de trigger du schéma qui garde son ACL `=X/postgres` par défaut. Sans conséquence pratique aujourd'hui, mais c'est une exception silencieuse à une règle que le reste du schéma applique sans exception, et l'advisor Supabase la signalera.

Preuves : `supabase/migrations/20260905170700_revoquer_execute_public.sql:14` ; `supabase/migrations/20260905150000_feedback.sql:66` ; `supabase/migrations/20260823095100_security_hardening.sql:6`

**Recommandation.** Une ligne de migration : `revoke execute on function public.enforce_feedback_rate_limit() from public, anon, authenticated;`, et une assertion dans le test 11 sur le modèle de celles des tests 09/15/16/17.

**Contre-vérification.** Le constat se trompe sur un point vérifiable, et la correction agrandit son périmètre : ce n'est PAS la seule fonction de trigger restée ouverte. `prevent_answered_checkin_update` (créée en 20260823100000_monthly_checkins.sql ligne 23, redéfinie en 20260904180000 ligne 202) porte exactement la même ACL `{=X/postgres, anon=X/postgres, authenticated=X/postgres}` en base. La migration corrective doit donc révoquer les **deux** — sinon on reproduit l'exception qu'on prétend supprimer, et l'advisor continuera de la signaler. Rien d'exploitable par ailleurs : les deux rendent `trigger`, donc PostgREST ne les expose pas et un appel direct échouerait de toute façon hors contexte de trigger.


### A9-16 — `register_push_token` reprend un jeton sans aucune condition, ce qui coupe silencieusement les rappels du propriétaire précédent

`technique` · sévérité **mineur** · verdict **contredit_decision** · effort petit

La reprise du jeton est le comportement voulu (une session anonyme devient un compte sur le même appareil), et la migration l'explique bien. Mais l'`on conflict … do update set user_id = auth.uid()` est inconditionnel : n'importe quelle session, y compris anonyme, qui présente la valeur d'un jeton existant se l'attribue. Le propriétaire précédent perd alors son seul jeton actif ; `reminder_channel_for` bascule sur l'email s'il a un compte confirmé, sur rien du tout s'il est anonyme — et sa préférence reste `push` en base, donc l'app lui affichera « Par notification sur ce téléphone » alors que plus rien ne partira. Aucun journal ne garde trace de la reprise, aucun quota ne la limite, et le test 17 ne vérifie que le cas légitime.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:91` ; `supabase/migrations/20260907230000_rappels_canal.sql:163` ; `supabase/tests/database/17_rappels_canal.test.sql:158`

**Recommandation.** Garder la reprise mais la tracer (colonne `reprises` ou ligne de journal) et, au minimum, la refuser si l'ancien propriétaire a une activité plus récente que la session courante. À défaut, l'accepter explicitement comme risque assumé dans v1-12.

**Décision documentée concernée.** v1-10 §3.4 et l'en-tête de 20260907230000_rappels_canal.sql (lignes 70-75) posent la reprise inconditionnelle comme la raison d'être du RPC : une policy owner-scoped laisserait le jeton à un utilisateur fantôme.

**Contre-vérification.** Deux inexactitudes factuelles à corriger avant que la synthèse ne reprenne le constat. (1) « l'app lui affichera « Par notification sur ce téléphone » alors que plus rien ne partira » est faux : `src/lib/notification-prefs.ts` ligne 38 dérive `jetonActif` d'un `select` sur `push_tokens` scopé par RLS au propriétaire courant ; après une reprise, la victime lit zéro jeton et `canalEffectif` (`src/types/rappels.ts`) lui affiche donc « email » ou « aucun » — exactement ce que le serveur fera. Le client et le serveur ne divergent pas. (2) Le test 17 vérifie bien la reprise d'un jeton **détenu par un autre utilisateur** (v1-12 §8 : « `register_push_token` reprend un jeton à un autre utilisateur »), ce n'est pas le seul cas nominal. Reste vrai : l'exploitation suppose de connaître la valeur d'un ExponentPushToken d'autrui, qui n'est jamais exposé (aucune policy de lecture croisée, absent de `export_my_data` par choix explicite §8 de la migration) — le risque résiduel est donc très faible. Si l'on veut clore le point sans rien casser, la seule action proportionnée est une ligne dans v1-12 §7 assumant la reprise, éventuellement avec une trace (`last_seen_at` existe déjà ; un compteur de reprises serait du bruit).


### A9-17 — `analytics.bilan_funnel` recopie en dur les neuf étapes du questionnaire, sans le garde-fou que son jumeau possède

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La vue déroule un tableau littéral de neuf identifiants d'étapes pour donner un ordre et des zéros explicites. Ces neuf valeurs doivent correspondre exactement à `BILAN_STEP_ORDER` dans `src/types/bilan.ts` — elles correspondent aujourd'hui, vérifié une par une. Mais rien ne les tient ensemble : le référentiel jumeau (`usage_event_types` / `src/types/analytics.ts`) est, lui, gardé par un `bag_eq` dans le test 12 précisément pour cette raison. Renommer ou insérer une étape du wizard laisserait la vue rendre `users = 0` pour cette étape et ignorer la nouvelle — le même « répond calmement à côté » que la vue corrigée en 20260905170100.

Preuves : `supabase/migrations/20260905170000_usage_events.sql:217` ; `src/types/bilan.ts:92` ; `supabase/tests/database/12_usage_events.test.sql:145`

**Recommandation.** Soit sortir la liste dans une table `bilan_steps` (comme `usage_event_types`), soit ajouter au test 12 une assertion sur le contenu de la vue et un commentaire croisé dans `src/types/bilan.ts`.

**Contre-vérification.** Une nuance qui abaisse l'enjeu et une qui le déplace. (1) La perte n'est pas totale : `analytics.bilan_funnel_by_segment` (lignes 226-236) groupe dynamiquement sur `props->>'step'`, donc une étape ajoutée y apparaît — la donnée brute reste dans `usage_events`, seule la vue ordonnée ment. Le défaut est un affichage faux, pas une donnée perdue, ce qui justifie « mineur ». (2) Le même trou existe pour `onboarding_step_view`, dont aucune vue ni contrainte ne fixe le vocabulaire non plus. La sortie en table `bilan_steps` est disproportionnée pour une vue interne ; l'option la moins chère et la plus fidèle au repo est une assertion dans le test 12 comparant le `step` rendu par `analytics.bilan_funnel` à une liste littérale, doublée d'un commentaire croisé dans `src/types/bilan.ts` — exactement la mécanique déjà admise pour `usage_event_types` / `src/types/analytics.ts`.


### A9-18 — `resultat_view` est mesuré au montage sur un écran de la pile d'onglets, contre la règle du repo

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La restitution vit désormais sous le suivi (`/suivi/bilan?id=`), donc dans le groupe `(tabs)`. Elle utilise `useTrackView`, qui n'émet qu'une fois par montage — or react-navigation garde une pile d'onglets montée quand on passe à l'autre onglet. Revenir sur l'onglet Suivi alors qu'on y était resté sur la restitution ne réémet donc rien. Les deux autres écrans du même groupe, `plan.tsx` et `suivi/index.tsx`, utilisent bien `useTrackFocus`. C'est le défaut que le hook a été écrit pour éviter, et il est décrit mot pour mot dans son propre en-tête : « le compteur ne tomberait pas à zéro, ce qui serait visible : il donnerait un chiffre plausible et faux ». Conséquence concrète : le taux `resultat_view` → `resultat_share` et le rapport restitution/plan sont sous-estimés d'une quantité inconnue.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:157` ; `src/app/(tabs)/plan.tsx:112` ; `src/hooks/use-track-focus.ts:10`

**Recommandation.** Remplacer par `useTrackFocus('resultat_view')`, comme les deux autres écrans du groupe `(tabs)`.

**Contre-vérification.** La sous-estimation est réelle mais plus faible que ne le dit le constat, et il faut le dire à la synthèse : `/suivi/bilan` est un écran **empilé**, pas la racine d'un onglet — chaque ouverture depuis le suivi ou depuis la fin du questionnaire est un montage neuf et émet donc bien son événement. Seul le cas « je reste sur la restitution, je passe à Plan, je reviens » est perdu. Le correctif reste le bon (`useTrackFocus`), avec un point à ne pas oublier : on perd au passage la garde StrictMode de `useTrackView`, sans conséquence ici (le double montage de dev ne produit pas deux focus). Vérifier au passage `src/app/(tabs)/suivi/_layout.tsx` : si la pile est configurée pour se dépiler au changement d'onglet, l'écart devient nul et le changement n'a plus qu'une valeur de cohérence.


### A9-19 — `jetonActif` est vrai dès qu'un appareil de la personne l'est, mais la phrase affichée dit « sur ce téléphone »

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`loadReminderPrefs` interroge `push_tokens` sans filtrer sur l'appareil courant : `select('token').is('disabled_at', null).limit(1)`, la RLS ne bornant qu'à la personne. Sur un second appareil (ou après réinstallation, tant que l'ancien jeton n'a pas été désactivé par un reçu), `jetonActif` vaut vrai et la ligne de réglage affiche « Par notification sur ce téléphone — Le matin où la question s'ouvre. » alors que ce téléphone-là n'a peut-être aucune permission. La carte d'attente dit la même chose. Le serveur, lui, envoie bien à tous les jetons actifs, donc rien n'est perdu : c'est l'affirmation à l'écran qui est fausse. Second point du même bloc : si la lecture du profil échoue (réseau), `prefere` retombe sur `'email'` sans que rien ne le signale, et l'écran présente un choix que la personne n'a pas fait.

Preuves : `src/lib/notification-prefs.ts:33` ; `src/types/rappels.ts:85` ; `src/lib/notification-prefs.ts:37`

**Recommandation.** Filtrer sur le jeton de l'appareil courant (celui qu'`expo-notifications` vient de rendre) plutôt que sur l'existence d'un jeton quelconque, et distinguer « pas de préférence lue » de « préférence = email » pour ne pas afficher un choix imaginaire.

**Contre-vérification.** Le constat rate le vrai coût de la même requête, dupliquée en src/lib/rappels.ts:113-120 (`jetonDeCetAppareil`) : elle sert à **désactiver** un jeton. Sur un second appareil où la permission est refusée, `enregistrerLeJeton()` récupère un jeton quelconque du compte — potentiellement celui de l'autre téléphone — et appelle `unregister_push_token` dessus, coupant en silence le push d'un appareil parfaitement autorisé (la préférence, elle, reste `push`, donc le serveur retombe sur l'email via `reminder_channel_for`). C'est ce point-là qui mérite le correctif, et il rend le filtre par appareil nécessaire, pas seulement cosmétique. En revanche, le second point du constat est faible : `reminder_channel` a pour défaut `'email'` en base (migration 20260907230000:24), donc le repli `?? 'email'` coïncide avec la valeur réelle dans le cas normal ; l'écart n'apparaît que si la lecture échoue alors que la personne avait choisi `push` ou `none` — réel mais bien plus étroit que décrit.


### A9-20 — Le canal de retour n'a aucun chemin de lecture : ni vue, ni notification, ni écran

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

La table `feedback` a été créée pour une raison précise et bien argumentée : apprendre que le référentiel de modes est incomplet, ce qu'aucun autre mécanisme ne dit. Elle est « lue à la main », assumé — mais rien ne facilite cette lecture ni ne signale qu'il y a quelque chose à lire. Aucune des cinq vues du schéma `analytics` ne la touche, aucun cron ne résume, aucun email ne part. Un canal de retour qu'on oublie de consulter n'est pas un demi-canal : c'est le même silence qu'avant, avec en plus la promesse implicite faite à la personne qui a pris le temps d'écrire. Comparé au soin mis à instrumenter `emission_factor_sync_runs` pour la même raison (« la seule façon de voir que ça tourne vraiment »), l'asymétrie est nette.

Preuves : `supabase/migrations/20260905150000_feedback.sql:10` ; `supabase/migrations/20260905170000_usage_events.sql:168` ; `src/lib/feedback.ts:4`

**Recommandation.** Ajouter une vue `analytics.retours_recents` (catégorie, écran, message, date, segment de l'auteur) et, si l'envoi d'email est déjà branché, un résumé hebdomadaire à l'éditeur via le même mécanisme que les rappels — sans jamais répondre à la personne, ce qui reste le choix documenté.

**Contre-vérification.** La moitié « vue analytics » de la recommandation est la bonne et coûte trois lignes, cohérente avec le schéma non exposé par PostgREST. La moitié « résumé hebdomadaire par email via le même mécanisme que les rappels » n'est pas réalisable telle quelle : `notification_outbox.checkin_id` est `not null unique` avec FK vers `engagement_checkins` (20260904200000:41) — un message à l'éditeur n'a pas de check-in à citer, il faudrait relâcher la contrainte qui *est* la garantie anti-relance de la spec §7. Un digest passerait plutôt par un appel `http` direct dans une fonction cron dédiée. À noter aussi : `feedback.created_at` est déjà lu comme signal d'activité par la purge des sessions anonymes (20260907093000:50) — c'est un usage, pas un chemin de lecture.


### A9-21 — Le seul message sortant du produit ne porte aucune trace de durée

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

Le rappel est bien écrit — une question, un lien, une porte de sortie, aucune injonction — mais il est rigoureusement identique de la première semaine à la centième : même sujet, même phrase, même clause de réconfort. C'est le seul contact que Ramille a hors de l'app, et donc le seul endroit où l'accompagnement dans la durée pourrait se manifester à quelqu'un qui n'a pas ouvert l'app depuis un moment. La contrainte forte du produit (jamais un nombre dans sa bouche, pas de série ni de score) n'interdit pourtant pas de nommer la saison, de dire qu'un nouveau cycle de plan commence, ou de distinguer le tout premier point des suivants — trois variations qualitatives que le schéma permet déjà (`plan_cycles.period_label`, `engagement_checkins.period_start`, l'existence d'un point antérieur).

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:214` ; `supabase/migrations/20260907230000_rappels_canal.sql:210` ; `supabase/migrations/20260907230000_rappels_canal.sql:231`

**Recommandation.** Ajouter deux ou trois variantes qualitatives, choisies sur des faits déjà en base (premier point ; premier point d'un nouveau cycle de plan ; retour après une période sans réponse), toutes rédigées dans `src/constants/mascotte.ts` et lues par la mise en file — sans jamais compter ni comparer.

**Décision documentée concernée.** Frôle deux décisions à ne pas rouvrir : « jamais un nombre dans sa bouche » (CLAUDE.md, voix de Ramille) et l'absence de toute mécanique de série (`/suivi` n'a aucune mécanique d'échec). La proposition tient si les variantes restent qualitatives et ne comptent rien.

**Contre-vérification.** La recommandation est réalisable sur le fond mais fausse sur la forme : le texte sortant vit **uniquement en SQL**, `src/constants/mascotte.ts` ne contient aucune phrase de rappel (seules les cartes d'attente y sont). Une mise en file ne peut pas lire un module TS ; il faudrait soit écrire les variantes dans la fonction pg (avec le même risque de double écriture que `reminder_channel_for`), soit une petite table de répliques. Les faits invoqués sont bien disponibles au moment de l'insert (`c.period_start`, `c.loop_type`, jointure possible sur `plan_cycles.period_label` et sur l'existence d'un point antérieur), et la variation ne toucherait pas `unique(checkin_id)` puisqu'elle ne change que le texte d'une ligne déjà unique. Garde-fou à ajouter à la recommandation : le sujet et le corps sont **figés à la génération** et le repli push→email réutilise la même ligne (v1-12 §4.3) — les variantes doivent donc être choisies à la mise en file, jamais à l'envoi.


### A9-22 — L'export est rendu au client en un seul JSON, sans borne, puis passé à `Share.share` sur natif

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`export_my_data()` agrège tout l'historique sans limite, dont `reperes_de_parcours` qui peut contenir jusqu'à cinq cents événements par jour sur douze mois, soit près de deux cent mille objets dans le pire cas et quelques milliers dans un cas courant après un an d'usage. Côté client, le JSON est sérialisé en mémoire puis, sur natif, remis à `Share.share({ message: json })` — une API prévue pour un texte court, qui tronque ou échoue silencieusement au-delà de quelques centaines de kilooctets selon l'application réceptrice. L'échec est rattrapé par un `catch` qui affiche « Le partage a été interrompu. », donc indistinguable d'une annulation volontaire. Le droit d'accès serait alors annoncé comme servi sans l'être.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:611` ; `src/lib/compte.ts:45` ; `supabase/migrations/20260905170600_quota_usage_events_security_definer.sql:26`

**Recommandation.** Écrire le JSON dans un fichier avant de le partager sur natif (ou agréger les repères de parcours par jour/nom au lieu de les rendre un à un), et distinguer l'annulation de l'échec pour ne pas confirmer un export qui n'a pas eu lieu.

**Contre-vérification.** Le constat se trompe de sens sur l'indistinction, et le vrai défaut est pire que celui décrit : sur React Native, une annulation ne rejette pas (`Share.share` résout avec `dismissedAction`), donc un partage abandonné renvoie `ok: true` et l'écran affiche « Export généré. » (src/components/compte/mon-compte.tsx:35) alors que rien n'a été enregistré — c'est là que le droit d'accès est annoncé comme servi sans l'être, pas dans le message d'erreur. Le `catch`, lui, ne se déclenche que sur un vrai échec (typiquement `TransactionTooLargeException` côté Android sur un gros payload). Le volume courant est par ailleurs bien plus faible que « quelques milliers » : les quinze événements de `src/types/analytics.ts` sont des affichages, pas un flux continu ; le 500/jour est un plafond de garde-fou, pas un rythme. Correctif minimal : lire `result.action` avant d'annoncer un succès, et n'agréger `reperes_de_parcours` que si la taille devient un problème mesuré.


### A9-23 — Les policies de `push_tokens` réévaluent `auth.uid()` par ligne, contrairement à toutes les autres du schéma

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Toutes les policies écrites depuis la migration initiale enveloppent l'appel dans un sous-select — `using (id = (select auth.uid()))` — ce qui permet à PostgreSQL de l'évaluer une fois par requête (InitPlan) au lieu d'une fois par ligne ; c'est la recommandation de l'advisor de performance Supabase, et le repo l'applique partout, y compris sur `feedback` et `usage_events`. Les deux policies de `push_tokens`, les plus récentes, ne le font pas. L'impact est négligeable sur une table de quelques lignes par personne, mais la divergence est le vrai coût : c'est le motif qu'on recopie pour écrire la policy suivante.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:64` ; `supabase/migrations/20260823094900_rls_policies.sql:25` ; `supabase/migrations/20260905150000_feedback.sql:48`

**Recommandation.** Recréer les deux policies avec `(select auth.uid())`, pour que le motif du schéma reste unique.

**Contre-vérification.** Le constat est exact et le coût est bien la divergence de motif, pas la performance : `push_tokens_actifs_idx` et le volume (quelques lignes par personne) rendent l'écart invisible. Deux précisions utiles à la correction : il n'y a ni policy INSERT ni policy UPDATE sur cette table (l'enregistrement passe par `register_push_token`), donc il n'y a bien que ces deux-là à recréer ; et comme rien dans la CI ne voit ce motif, l'épingler par un test pgTAP (interroger `pg_policies` et refuser un `qual` contenant `auth.uid()` hors sous-select) vaut mieux qu'une correction ponctuelle — c'est ce qui empêchera la prochaine policy de recopier la forme nue.


## A10 — infrastructure, outillage, qualité, dépendances, design system

**Résumé du lecteur.** Le dépôt est en bonne santé mécanique : j'ai relancé toute la chaîne et tout passe — `npx tsc --noEmit` (après création d'`expo-env.d.ts` comme la CI), `npm run lint`, `npm test -- --ci` (15 suites, 158 tests, 4,3 s), `npx expo export --platform web` (21 routes, 20 pages titrées), les trois gardes d'export (titres, inlining `EXPO_PUBLIC_*`, assetlinks) et `npx expo-doctor` (21/21). J'ai aussi étendu temporairement la garde de rendu Playwright à `/plan`, `/suivi`, `/bilan`, `/compte`, `/feedback` : 10 routes rendues, aucune exception bloquante (un seul avertissement d'hydratation attendu sur `/confidentialite`). Le dépôt est resté propre, seul `expo-env.d.ts` (gitignoré) a été créé. La force de cette zone est réelle et rare : quatre garde-fous d'export nés chacun d'une panne muette réelle, une règle ESLint qui interdit `Alert`, des jetons de design effectivement migrés (plus aucun `borderRadius: 18/16/27` en dur), et une géométrie de mascotte calculée et épinglée par un test de conformité au dessin d'origine. Ce qui frappe, à l'inverse, c'est l'asymétrie du filet : il est excellent sur ce que produit `expo export`, et absent partout ailleurs — `api/*.ts` n'est jamais typecheck en CI, `src/lib` (14 modules), `src/hooks`, `src/components` et `src/app` n'ont zéro test, rien ne compare `database.types.ts` aux migrations, aucune garde de dépendances. Deux défauts sortent du lot : `formatTonnes` affiche « 0,0 t CO₂e » sous 50 kg, ce qui fait dire à l'écran « Le repère 2050 est à ta portée : 0,0 t CO₂e de moins sur l'année », et le mode sombre non validé part réellement aux visiteurs web dont l'OS est en sombre, avec un bouton principal à 3,4:1 de contraste. Enfin le web est aveugle au référencement et au partage : pas une seule balise `description` ni Open Graph dans les 20 pages exportées.

**Points forts à ne pas casser**

- Les quatre gardes d'export (`scripts/verifier-titres-export.mjs`, `-configuration-`, `-assetlinks-`, `-rendu-`) forment le meilleur actif du dépôt : chacune est née d'une panne silencieuse réelle en production (404 sans `cleanUrls`, titres vides, `EXPO_PUBLIC_*` remplacé par `void 0`, page blanche du 08/09), chacune porte son raisonnement dans son en-tête, et les quatre passent aujourd'hui. Ne jamais en retirer une : elles gardent des défauts qu'aucun typecheck ni test unitaire ne peut voir.
- La règle `no-restricted-imports` sur `Alert` (`eslint.config.js:20-32`) : une décision produit rendue impossible à défaire par accident, posée exactement là où on la réintroduirait (l'import), avec le message qui dit quoi faire à la place. C'est le bon modèle pour toute règle de ce type.
- Les jetons `TypeScale`/`Radius`/`ControlHeight` (`src/constants/theme.ts:112-147`) et leur consommation par les `type` de `ThemedText` : la migration du lot 4 est effectivement finie (0 occurrence restante de `borderRadius: 18`, `16` ou `27` dans `src/`), et surtout le rôle d'en-tête accessible se déduit du `type` (`themed-text.tsx:54-55`) au lieu d'être répété écran par écran — c'est ce qui empêche le 17ᵉ titre d'être oublié.
- `TextLink` (`src/components/text-link.tsx`) : le libellé annoncé **est** le texte affiché, et la cible de 44 px est portée par du padding vertical sans déplacer le texte. C'est la bonne réponse à l'audit T11 (zéro attribut d'accessibilité dans tout `src/`) ; le remplacer par des `Pressable` ad hoc ferait immédiatement rederiver les libellés.
- `mascotFaceGeometry` (`src/types/mascot.ts`) et sa suite de tests : géométrie calculée plutôt que chemins figés, compensation optique, et surtout un bloc de conformité aux chemins dessinés à la main (`mascot.test.ts:167-218`) qui a déjà attrapé une erreur (point de contrôle à 2× la flèche) que ni le typecheck ni les assertions de lisibilité ne voyaient. Un invariant visuel réellement épinglé, c'est rare.
- Le couple `configurationSupabase` + mandataire (`src/lib/supabase.ts:36-69`) et `ConfigurationManquante` : une configuration absente ou fautive est devenue un écran lisible au lieu d'une app qui s'ouvre et se referme sans un mot. Combiné à `verifier-configuration-export.mjs`, c'est le seul endroit du dépôt où un échec de configuration est à la fois visible à l'utilisateur et gardé en CI.

### A10-10 — La liste des Redirect URLs Supabase — décrite comme une frontière de sécurité — n'a aucune trace relisible dans le dépôt

`technique` · sévérité **bloquant** · verdict **confirme** · effort petit

CLAUDE.md documente qu'une entrée trop large dans cette liste (`https://*.vercel.app/**`, nettoyée le 09/09/2026) était une prise de contrôle de compte, et conclut : « Rien dans le code ni dans la CI ne voit cette liste : elle vit dans la configuration du projet distant ». Je l'ai vérifié : le seul endroit du dépôt qui porte ce concept est `supabase/config.toml`, dont le champ `additional_redirect_urls` ne contient que le placeholder local et ne s'applique de toute façon qu'à la stack Docker des tests. Il n'existe donc, dans tout le dépôt, aucun fichier qu'une relecture de pull request puisse comparer à l'état réel du projet distant. Une régression sur ce point ne serait visible que par quelqu'un qui pense à ouvrir le tableau de bord Supabase — c'est-à-dire jamais, en pratique, jusqu'au prochain audit.

Preuves : `supabase/config.toml:174` ; `supabase/config.toml:1` ; `src/lib/app-url.ts:9`

**Recommandation.** Créer un fichier de référence versionné — par exemple `docs/architecture/redirect-urls.md` ou une section dédiée de `v1-10` — qui liste **exactement** les entrées autorisées, avec pour chacune sa raison d'être et sa date d'ajout, et la règle « jamais de joker sur un domaine qu'on ne possède pas ». Idéalement, ajouter une étape CI facultative qui interroge l'API de management Supabase et compare à cette liste ; à défaut, en faire un point de la checklist de publication. L'important est qu'une entrée nouvelle devienne visible dans un diff.

**Contre-vérification.** Le constat est vrai mais sous-estime gravement : il existe bien une trace dans le dépôt, et elle est pire que l'absence. `docs/architecture/v1-10-connexion-et-rappels.md:341-342` §8.4 prescrit encore noir sur blanc « en Redirect URLs `https://www.ramille.fr/**` plus `https://*.vercel.app/**` pour les previews » — c'est-à-dire exactement l'entrée que CLAUDE.md:222-227 décrit comme une prise de contrôle de compte et déclare nettoyée le 09/09/2026. Le seul document de mise en service du produit dit donc à quiconque le suit de réintroduire la faille, et il ne se lit pas comme obsolète (le reste de §8 est la checklist en vigueur). C'est actionnable immédiatement et sans coût : corriger §8.4 pour porter le motif à suffixe de compte (`ramille-*-me-c4a3.vercel.app`), ou y renvoyer vers la règle de CLAUDE.md. La création d'un fichier de référence versionné reste bonne, mais elle vient après ce correctif — et le lieu naturel est cette §8.4 même, pas un nouveau fichier. Noter aussi `docs/architecture/v1-04-authentification.md:81`, qui liste encore le scheme `traceverte://` : deuxième entrée morte prescrite par la doc, et CLAUDE.md pose qu'« une entrée morte se retire, parce qu'elle ne se lit pas obsolète mais autorisé ».


### A10-1 — Le mode sombre « non livré, non validé » part réellement aux visiteurs web, avec un bouton principal sous le seuil de contraste

`technique` · sévérité **important** · verdict **confirme** · effort petit

`app.json` verrouille l'interface en clair, mais `userInterfaceStyle` ne s'applique qu'au natif. Sur web, `useColorScheme` de react-native-web lit `prefers-color-scheme` (`node_modules/react-native-web/dist/exports/Appearance/index.js:15-22`), donc `useTheme()` rend `Colors.dark` — la palette que le commentaire de `theme.ts` décrit comme « des équivalents provisoires pour la sûreté de typage, pas un mode sombre livré ou validé ». Toute l'app web (plan, suivi, restitution, pages légales publiques) s'affiche alors dans une palette que personne n'a regardée. Contraste mesuré du bouton principal dans cette palette : accent `#3D9B6F` avec le texte `#FFFFFF` codé en dur dans `button.tsx` = **3,4:1**, sous le 4,5:1 exigé par WCAG AA pour du texte de 16 px. La mascotte, elle, reste en `Colors.light` (`mascot.tsx:75`), donc une feuille claire flotte sur fond noir. Sur un produit dont les deux seules surfaces publiques sont les pages légales données à Google Play et à l'écran de consentement Google, c'est aussi une vitrine.

Preuves : `app.json:9` ; `src/constants/theme.ts:14` ; `src/constants/theme.ts:43` ; `src/components/button.tsx:37` ; `src/hooks/use-color-scheme.web.ts:18`

**Recommandation.** Choisir explicitement, et le faire une fois pour toutes : soit forcer le clair sur web tant que la palette sombre n'est pas validée (`useTheme` renvoie `Colors.light` quand `Platform.OS === 'web'`, ou un `color-scheme: light` posé dans `global.css`), soit valider la palette sombre et corriger d'abord le contraste du bouton principal (assombrir le texte ou éclaircir l'accent jusqu'à ≥ 4,5:1). Ne pas laisser l'état actuel, qui livre sans le savoir la variante que le commentaire dit ne pas livrer.

**Contre-vérification.** Le constat rate deux choses. (1) Le décalage n'est pas seulement esthétique : `use-color-scheme.web.ts` rend 'light' au snapshot serveur et le vrai schéma après hydratation, donc un visiteur en sombre voit un flash clair→noir sur chaque page, y compris les pages légales. (2) `src/app/_layout.tsx:100` passe aussi `DarkTheme` de react-navigation dans le même cas — un correctif qui ne toucherait que `useTheme` laisserait les chromes de navigation en sombre. Le geste le plus sûr et le plus petit est donc de forcer le clair au point unique `use-theme.ts` **et** de remplacer la condition du `ThemeProvider` par `DefaultTheme` en dur, plutôt qu'un `color-scheme: light` en CSS qui ne changerait rien à ce que JS calcule.


### A10-3 — `formatTonnes` arrondit à « 0,0 t CO₂e » sous 50 kg, et la phrase du palier devient absurde au moment le plus encourageant

`technique` · sévérité **important** · verdict **confirme** · effort petit

`formatTonnes` divise par 1000 et applique `toFixed(1)` sans aucune borne basse. Toute valeur strictement inférieure à 50 kg/an rend « 0,0 t CO₂e ». Ce n'est pas théorique : `palierNote` (`suivi/bilan.tsx:117`) formate `palier.reductionKg`, et `nextPalier` (`src/types/palier.ts:81-86`) calcule `reductionKg = totalKg - Math.max(totalKg - capKg, target2050Kg)` — dès que la personne est **juste au-dessus** du repère 2050, cet écart vaut quelques dizaines de kilos. L'écran affiche alors mot pour mot : « Le repère 2050 est à ta portée : 0,0 t CO₂e de moins sur l'année, et tu y es. » Le même formateur alimente la décomposition par poste (`suivi/bilan.tsx:362`) : un poste loisirs à 40 kg/an s'affiche « 0,0 t CO₂e », et le libellé accessible d'un bilan dans le suivi (`suivi/index.tsx:175`) fait de même. Le produit efface donc numériquement exactement les profils sobres qu'il dit vouloir reconnaître (`palier.ts:55-57`, registre de contribution), et affiche un zéro là où il y a un chiffre réel. `src/lib/format.ts` n'a aucun test — c'est un module pur de six lignes, dans un dépôt dont la doctrine de test est justement « la logique où un bug est le plus coûteux (chiffre affiché à l'utilisateur) ».

Preuves : `src/lib/format.ts:4` ; `src/app/(tabs)/suivi/bilan.tsx:117` ; `src/app/(tabs)/suivi/bilan.tsx:132` ; `src/types/palier.ts:82`

**Recommandation.** Donner à `formatTonnes` une branche basse : sous ~100 kg, afficher en kilogrammes (« 40 kg CO₂e »), qui est à la fois exact et plus concret pour un profil sobre. Créer `src/lib/format.test.ts` (le module est pur, il n'importe pas `@/lib/supabase`) avec au minimum les cas 0, 40, 49, 50, 990, 1000, 15 800. Vérifier au passage `formatTonnesShort` (`carbon-reference.ts:103`), qui a le même arrondi mais n'est appliqué qu'à des repères ≥ 0,6 t.

**Contre-vérification.** Le cas le plus fréquent n'est pas celui que le constat met en avant : ce n'est pas le profil sobre (rare) mais la **décomposition par poste** de n'importe quel bilan — un poste loisirs ou voyages à quelques dizaines de kg s'affiche « 0,0 t CO₂e » avec une barre visible à côté, ce qui se lit comme un bug d'affichage pour tout le monde. Deux précisions pour le correctif : le seuil doit être choisi en cohérence avec `formatTonnesShort` (`carbon-reference.ts:103`), qui a le même arrondi mais n'est appliqué qu'à des repères en tonnes — les deux formateurs ne doivent pas diverger sur une même page (`suivi/bilan.tsx` les utilise côte à côte, lignes 362 et 385) ; et la phrase de palier reste bancale même corrigée (« Le repère 2050 est à ta portée : 40 kg CO₂e de moins ») — c'est acceptable, mais c'est un choix de wording à valider, pas une simple correction de format.


### A10-7 — `src/lib` (14 modules), `src/hooks`, `src/components` et `src/app` n'ont aucun test — la ligne de partage n'est pas « pur vs impur » mais « types vs le reste »

`technique` · sévérité **important** · verdict **confirme** · effort moyen

Comptage exact : `src/types` 12 fichiers / 12 tests, `src/constants` 7 / 3, et **`src/lib` 14 / 0, `src/hooks` 6 / 0, `src/components` 49 / 0, `src/app` 21 / 0** (`ls src/lib/*.test.*` ne rend rien). La justification documentée est qu'un module testé ne doit pas importer `@/lib/supabase` — mais plusieurs modules de `src/lib` ne l'importent pas et restent pourtant sans test : `src/lib/format.ts` (le chiffre affiché partout, cf. A10-3), `src/lib/app-url.ts`, et la logique de sérialisation de `src/lib/bilan-draft.ts` / `connexion-prefs.ts` / `notification-prefs.ts`, qui ne dépendent que d'AsyncStorage — donc mockables trivialement, et dont un défaut **perd un brouillon de bilan** (neuf étapes à retaper). Aucune couverture n'est mesurée non plus (`package.json` → `jest` sans `collectCoverage`), donc ce vide n'apparaît nulle part. À noter au passage une assertion qui ne peut pas échouer dans la seule suite de `src/constants` qui touche à l'export : `page-titles.test.ts:27` compare un objet à lui-même.

Preuves : `package.json:61` ; `src/lib/format.ts:3` ; `src/constants/page-titles.test.ts:27` ; `src/lib/bilan-draft.ts:16`

**Recommandation.** Reformuler la règle en « un module testé ne doit pas importer `@/lib/supabase` » plutôt qu'en « seul `src/types` est testé », et l'appliquer : commencer par `src/lib/format.ts` (cf. A10-3), puis la sérialisation/désérialisation de `bilan-draft.ts` — un brouillon corrompu ou perdu est le seul endroit du produit où l'utilisateur perd un travail. Activer `--coverage` en CI sans seuil bloquant, uniquement pour rendre la carte des trous visible. Supprimer l'assertion tautologique de `page-titles.test.ts:27`, qui donne une fausse impression de couverture.

**Contre-vérification.** Deux nuances à transmettre. (1) L'assertion tautologique de `page-titles.test.ts:27` n'est PAS seule : la ligne 28 immédiatement suivante fait `expect(PAGE_TITLES[alias]).toBeDefined()`, qui est la vraie assertion du test. La ligne 27 est du bruit (probablement une tentative d'améliorer le message d'échec), pas une fausse couverture — la supprimer reste bon, mais le test lui-même éprouve bien quelque chose. (2) Le constat rate que `formatTonnes` a un quasi-doublon déjà testé, `formatTonnesShort` dans `src/constants/carbon-reference.ts:103` (couvert par `carbon-reference.test.ts:56-58`) : le vrai risque n'est pas l'absence de test sur `format.ts` mais la divergence entre ces deux formateurs de la même grandeur. La recommandation la plus rentable serait de les réunir avant de les tester.


### A10-8 — Aucune prise en compte de « réduire les animations » : la mascotte respire en boucle infinie sur douze écrans, et l'ouverture impose 1,45 s à chaque lancement

`technique` · sévérité **important** · verdict **confirme** · effort petit

`grep -rni "reducemotion|prefers-reduced-motion|AccessibilityInfo" src/` ne rend **rien**. `Mascot` démarre par défaut (`animated = true`) une animation `withRepeat(..., -1, true)` qui ne s'arrête jamais ; un seul des douze points de montage passe `animated={false}` (`progress-header.tsx:31`). `EcranLancement` ajoute une séquence d'entrée, et `src/app/index.tsx` en fait un **plancher** : même quand la session répond en 200 ms, la racine attend `DUREE_ANIMATION_LANCEMENT` = 1450 ms avant de rediriger. C'est un critère WCAG explicite (2.3.3, Animation from Interactions) et un réglage système que beaucoup activent pour cause de vertiges ou de troubles vestibulaires. C'est aussi, sur le plan produit, 1,45 s payées à **chaque** ouverture par une personne qu'on veut faire revenir pendant des mois : le geste censé être court (répondre au point de la semaine) commence par une attente imposée.

Preuves : `src/components/mascot.tsx:84` ; `src/components/ecran-lancement.tsx:56` ; `src/app/index.tsx:54` ; `src/components/bilan/progress-header.tsx:31`

**Recommandation.** Ajouter un hook `useAnimationsReduites()` (`AccessibilityInfo.isReduceMotionEnabled` + son listener sur natif, `matchMedia('(prefers-reduced-motion: reduce)')` sur web) et le lire à deux endroits seulement : `Mascot` (respiration coupée, visage rendu tel quel) et `src/app/index.tsx` (plancher ramené à ~0, la mascotte reste affichée en pose finale). Indépendamment de l'accessibilité, envisager de n'appliquer le plancher de 1450 ms qu'au **premier** lancement de la journée plutôt qu'à chacun : le bénéfice de l'écran d'ouverture est d'accueillir, pas de se répéter.

**Décision documentée concernée.** Le plancher de 1450 ms est une décision argumentée dans `src/components/ecran-lancement.tsx:46-56` (« ce n'est pas un délai ajouté au chargement ») et dans `src/app/index.tsx:49-53`. Le raccourcir ou le conditionner rouvre ce choix — la coupure sous « réduire les animations », en revanche, ne le contredit pas.

**Contre-vérification.** Le constat a raison de séparer les deux volets, et sa propre note sur `contredit_decision` est juste : couper la respiration sous « réduire les animations » ne rouvre aucune décision, alors que raccourcir le plancher rouvre explicitement le commentaire de `ecran-lancement.tsx:46-56`. À traiter comme deux items distincts, le premier seul étant sans arbitrage produit. Ce que le constat rate : le plancher n'est payé qu'au montage de `src/app/index.tsx`, donc uniquement au démarrage à froid — un retour depuis une notification arrive sur `/plan` (deep link, `intentFilters` de `app.json`) et ne le traverse pas. L'affirmation « 1,45 s payées à chaque ouverture » est donc vraie pour un lancement à froid, pas pour le geste hebdomadaire du rappel, qui est justement le cas d'usage cité. Cela affaiblit l'argument produit, pas l'argument d'accessibilité.


### A10-9 — Aucune résilience hors-ligne : sans réseau, l'unique écran par lequel tout le monde passe affiche un échec technique

`technique` · sévérité **important** · verdict **confirme** · effort moyen

La racine attend `ensureSession()` puis interroge la table `assessments`. Il n'y a aucun cache, aucun repli local, aucune détection de connectivité — `src/lib/supabase.ts` construit un client sans stratégie de reprise, et rien dans `src/lib` ne persiste un état de bilan complété. Hors réseau, la requête échoue, le `catch` prend la main et l'écran rend « Le démarrage a échoué » suivi du message brut de l'erreur en `type="code"`. L'app est alors intégralement inaccessible : pas de plan, pas de suivi, pas de bilan déjà calculé, pas même les pages légales sur natif. Pour un produit dont la promesse est l'accompagnement dans la durée, ouvrir l'app dans le métro ou dans un train — c'est-à-dire précisément pendant un déplacement, le sujet du produit — est un cas ordinaire, pas un cas limite. Et le message affiché est délibérément technique (« destiné à être recopié »), donc l'utilisateur voit une erreur de développeur là où il attendait son plan.

Preuves : `src/app/index.tsx:41` ; `src/app/index.tsx:61` ; `src/app/index.tsx:92` ; `src/lib/supabase.ts:58`

**Recommandation.** Persister en AsyncStorage le seul fait dont la racine a besoin pour router (« cette session a au moins un bilan complété »), à l'endroit où il est déjà connu — à la fin de `compute_assessment_results` côté client. Hors réseau, la racine route alors vers `/plan` avec les données figées de `assessment_results`, et l'écran affiche un bandeau doux (« Pas de connexion — voici ton dernier plan ») plutôt qu'un échec. Distinguer par ailleurs, dans le message d'échec, la panne réseau (phrase humaine + « Réessayer ») du reste (message technique conservé) : le premier cas est le plus fréquent et ne mérite pas un message destiné à être recopié.

**Contre-vérification.** Un point du constat est factuellement inexact et affaiblit sa conclusion : l'écran d'échec n'est pas uniquement technique. `src/app/index.tsx:84-87` affiche « Vérifie ta connexion et réessaie. Si ça se reproduit, cette précision aidera à comprendre : » avant le bloc `code`, et un bouton « Réessayer » (ligne 96) relance l'effet via `setTentative`. La phrase humaine et le chemin de reprise existent déjà ; ce qui manque est le repli sur des données locales, pas le ton. La moitié « distinguer la panne réseau du reste » de la recommandation est donc largement déjà faite. Reste valable, et c'est le cœur : la racine bloque le routage sur une requête réseau, donc hors ligne l'app entière est inaccessible même quand `assessment_results` a déjà été calculé. Attention en implémentant : le drapeau local doit être invalidé à la suppression de compte (`delete_my_account`) et au changement de session, sinon un appareil réutilisé route vers `/plan` pour un compte qui n'existe plus.


### A10-2 — `api/*.ts` n'est jamais typecheck en CI : un défaut y échoue en `FUNCTION_INVOCATION_FAILED` générique

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La CI ne lance que `npx tsc --noEmit`, qui utilise le tsconfig racine — lequel exclut explicitement `api/**`. `api/tsconfig.json` existe, est correct et passe (j'ai lancé `npx tsc -p api/tsconfig.json` : exit 0), mais **rien ne l'exécute**, ni en CI ni dans un script npm ni dans le README. Vercel compile `api/*.ts` avec esbuild, qui efface les types sans les vérifier. Conséquence exacte : une erreur de type dans `api/share-card.ts` ou `api/partage.ts` part en production et se manifeste par le `FUNCTION_INVOCATION_FAILED` sans détail que l'en-tête de `share-card.ts` documente sur 30 lignes comme ayant coûté un cycle de diagnostic complet avec les vrais logs runtime Vercel. Ce sont les deux fichiers du dépôt qui ont déjà le plus coûté à déboguer, et ce sont les seuls que la CI ne regarde pas.

Preuves : `.github/workflows/ci.yml:25` ; `tsconfig.json:23` ; `api/tsconfig.json:8`

**Recommandation.** Ajouter une étape `- run: npx tsc -p api/tsconfig.json` juste après le typecheck racine dans le job `checks`, et un script `npm run typecheck:api` pour que la commande soit trouvable localement. Coût nul (j'ai vérifié : elle passe aujourd'hui), et elle referme le seul angle mort de typage du dépôt.

**Contre-vérification.** Sévérité ramenée à mineur : aucun défaut actuel (le typecheck de `api/` passe), deux fichiers seulement, rarement touchés, et le chemin affecté est le partage social, pas le parcours principal. Le geste reste à faire, il coûte deux lignes. Meilleure version de la recommandation : ajouter un script `"typecheck:api": "tsc -p api/tsconfig.json"` et l'appeler depuis la CI, mais surtout noter que le typecheck n'aurait attrapé **aucun** des trois défauts réellement documentés dans l'en-tête de `api/share-card.ts` (type: module manquant, hb.wasm non tracé, maxDuration) — ce sont des défauts d'empaquetage, pas de types. La garde de `includeFiles` proposée en A10-6 couvre mieux le risque réel de ce dossier.


### A10-4 — Aucune balise `description` ni Open Graph dans les 20 pages exportées, alors que l'infrastructure de métadonnées existe déjà

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

J'ai lancé l'export et grepé le résultat : `grep -o '<meta name="description"' dist/*.html` et `grep -o '<meta property="og:'` ne rendent **rien**, sur aucune des 20 pages. `TitreDePage`, qui est le composant prévu pour ça et qui est déjà monté une fois pour toutes dans le layout racine, ne pose que `<title>`. Deux conséquences distinctes. D'abord le référencement : `/confidentialite` et `/conditions` sont les deux seules surfaces publiques du produit (leurs URL sont données à Google Play et à l'écran de consentement Google) et un moteur n'a que le corps de page pour composer son extrait. Ensuite le partage : coller `https://www.ramille.fr` dans une conversation ne produit qu'un lien nu — pas de titre, pas de description, pas d'image. Le produit a pourtant construit une chaîne Open Graph complète et coûteuse (`api/partage.ts` + `api/share-card.ts`, rendu d'image via satori/resvg) pour la carte de bilan partagée ; le site lui-même, la porte d'entrée, n'en a rien.

Preuves : `src/components/titre-de-page.tsx:30` ; `src/constants/page-titles.ts:20` ; `scripts/verifier-titres-export.mjs:40`

**Recommandation.** Étendre `PAGE_TITLES` en une table `{ titre, description }` et faire poser à `TitreDePage` la `description` et un jeu Open Graph par défaut (`og:title`, `og:description`, `og:image`, `og:url`, `og:site_name`) — au minimum sur `/`, `/onboarding`, `/confidentialite`, `/conditions`. Étendre `verifier-titres-export.mjs` pour exiger une description non vide de la même façon qu'un titre : la garde existe déjà, il suffit d'une seconde assertion dans la même boucle.

**Contre-vérification.** Sévérité ramenée à mineur, pour une raison que le constat rate : le cas de partage qui compte réellement — le lien du bilan partagé — est déjà couvert par `api/partage.ts`, qui sert ses propres métadonnées Open Graph et l'image de `api/share-card.ts` (cf. `v1-06` §2-3). Ce qui manque, c'est l'aperçu du domaine racine et la description des deux pages légales ; ni l'un ni l'autre n'est un canal d'acquisition du produit (l'acquisition est Google Play). La recommandation reste bonne et peu coûteuse, avec deux réserves : `og:image` demande un asset statique à produire et à faire survivre à l'export (même piège que `assetlinks.json`, cf. `scripts/verifier-assetlinks-export.mjs`), et une description doit être écrite pour chaque route — l'étendre à `PAGE_TITLES` en entier avant d'avoir les textes ferait échouer la CI sur des pages internes (`/bilan`, `/connexion/*`) qui n'ont aucun besoin d'en avoir une. Limiter l'assertion aux quatre routes publiques.


### A10-5 — Rien ne vérifie `src/lib/database.types.ts` contre les migrations, ni les migrations du dépôt contre le projet distant

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le job `db-tests` démarre une stack Postgres locale à partir de `supabase/migrations/` et lance pgTAP — mais aucune étape ne régénère les types TypeScript pour comparer au fichier commité. Or CLAUDE.md pose comme règle « Après toute migration, régénérer `src/lib/database.types.ts` » et le fichier n'a pas de formateur (donc se retouche à la main), ce qui est exactement la configuration où l'oubli est probable et invisible : un type périmé ne casse pas le typecheck, il fait taper à côté d'une colonne renommée avec une erreur qui n'apparaît qu'à l'exécution. Deuxième dérive du même genre : les migrations sont appliquées au projet distant via `mcp__Supabase__apply_migration`, et rien ne vérifie que la liste appliquée là-bas correspond au contenu de `supabase/migrations/`. La CI teste donc un schéma reconstruit qui peut ne pas être celui sur lequel l'app tourne.

Preuves : `.github/workflows/ci.yml:88` ; `src/lib/database.types.ts:1` ; `README.md:35`

**Recommandation.** Dans le job `db-tests`, après `supabase db start`, ajouter `supabase gen types typescript --local > /tmp/types.ts` puis un `diff` (ou `git diff --exit-code` sur une copie) contre `src/lib/database.types.ts`, avec un message d'échec qui donne la commande de régénération. La stack est déjà démarrée, le coût est de deux lignes. Pour la dérive distant/dépôt, ajouter au même job un `supabase migration list --linked` comparé à `ls supabase/migrations/` (nécessite un token en secret) — ou à défaut le noter comme vérification manuelle avant chaque publication.

**Contre-vérification.** Deux réserves sur la recommandation, à donner à qui l'appliquera. (1) Le `diff` strict sera probablement rouge dès la première exécution pour une raison de forme et non de fond : CLAUDE.md indique que le fichier est retouché à la main (« pas de prettier installé, respecter le style existant, guillemets doubles »), et il est généré via `mcp__Supabase__generate_typescript_types` (distant) alors que la CI produirait la sortie de `supabase gen types --local` — deux chemins dont la mise en forme peut différer. Prévoir une normalisation (comparer après un passage de mise en forme, ou comparer les seuls noms de tables/colonnes/fonctions) plutôt qu'un `diff` brut. (2) La seconde moitié du constat (dérive dépôt/distant) est la plus coûteuse à automatiser — `supabase migration list --linked` exige un token de projet en secret CI — et c'est aussi celle dont l'impact est le plus grand : la CI valide un schéma reconstruit qui n'est pas celui sur lequel l'app tourne. La traiter comme une vérification manuelle documentée avant publication est un compromis raisonnable.


### A10-6 — `vercel.json` fige le chemin d'un binaire qui n'est pas une dépendance déclarée

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`vercel.json` force l'inclusion de `node_modules/harfbuzzjs/hb.wasm` dans le bundle de `api/share-card.ts`. `harfbuzzjs` n'apparaît nulle part dans `package.json` : `npm ls harfbuzzjs` donne `ramille@1.0.0 -> satori@0.33.4 -> harfbuzzjs@0.10.0`. C'est donc un chemin en dur vers une dépendance transitive, sous une plage `^0.33.4` qui autorise npm à changer de version, à la hisser ailleurs, ou à la remplacer si satori change de moteur de texte. Si ce chemin cesse d'exister, `includeFiles` ne produit **aucune erreur de build** — l'échec arrive à l'exécution, sous la forme `ENOENT ... hb.wasm` derrière un `FUNCTION_INVOCATION_FAILED` générique, exactement le scénario que l'en-tête de `share-card.ts` décrit comme n'ayant été diagnosticable qu'avec les vrais logs runtime Vercel. Rien dans la CI ne charge cette Function.

Preuves : `vercel.json:8` ; `package.json:37` ; `api/share-card.ts:27`

**Recommandation.** Deux gestes complémentaires. (1) Épingler `satori` à une version exacte (`0.33.4`, comme le sont déjà `react`, `react-native` et `react-native-reanimated`) pour que le chemin ne bouge pas sans décision. (2) Ajouter une garde de quelques lignes dans un script npm lancé en CI, qui vérifie simplement l'existence de chaque fichier listé dans `vercel.json` → `functions[*].includeFiles` — même famille que les gardes d'export existantes, et elle attraperait la disparition avant le déploiement plutôt qu'après.

**Contre-vérification.** Le constat surestime la probabilité de dérive, et sa recommandation (1) vise à côté. `package-lock.json` est commité et épingle `harfbuzzjs@0.10.0` (l.8415-8418) ; la CI et Vercel installent par `npm ci`, donc ni la version ni le hoisting ne peuvent bouger sans une mise à jour délibérée du lock. Épingler `satori` en version exacte n'ajouterait rien que le lock ne fasse déjà — et ne protégerait de toute façon pas d'un changement de moteur de texte dans une version ultérieure. C'est la garde (2) qui a toute la valeur : un script de quelques lignes vérifiant l'existence de chaque entrée `functions[*].includeFiles` de `vercel.json` (à lancer dans le job `web-export`, après `npm ci`), même famille que les quatre `scripts/verifier-*.mjs` existants. Un cran de plus, si on veut couvrir le vrai risque : appeler `api/share-card.ts` une fois en CI et vérifier qu'un PNG sort — c'est le seul contrôle qui attraperait aussi une régression d'empaquetage que `includeFiles` ne décrit pas.


### A10-11 — Sept dépendances déclarées ne sont importées nulle part, dont quatre modules natifs embarqués dans l'AAB

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

J'ai grepé `src/`, `api/`, `scripts/`, `app.json` et `app.config.js` : `@expo/ui`, `expo-glass-effect`, `expo-image`, `expo-symbols` et `expo-status-bar` n'apparaissent **dans aucun fichier du dépôt**, ni en import, ni en plugin, ni en mention. (`expo-font` et `expo-system-ui` sont eux légitimement implicites : le premier via `@expo-google-fonts/spline-sans`, le second via `backgroundColor` dans `app.json`.) Quatre de ces cinq sont des modules natifs : ils sont autolinkés, compilés et embarqués dans l'AAB publié sur Google Play, ils entrent dans la surface d'audit de sécurité, et ils imposent un rebuild à chaque montée de SDK — pour zéro ligne de code. `@expo/ui` et `expo-glass-effect` sont en outre des API iOS-first sans usage dans un produit Android-only en V1. CLAUDE.md pose justement qu'« une dépendance native nouvelle impose un build, et il n'y a aucun moyen de s'en rendre compte depuis le code » : en garder quatre inutilisées, c'est payer ce coût sans contrepartie.

Preuves : `package.json:7` ; `package.json:16` ; `package.json:17` ; `package.json:22` ; `package.json:23`

**Recommandation.** Retirer `@expo/ui`, `expo-glass-effect`, `expo-image`, `expo-symbols` et `expo-status-bar`, relancer `npx expo-doctor` (21/21 aujourd'hui) puis un build EAS de vérification — la suppression d'un module natif est le genre de changement qui doit être vu sur appareil, pas seulement en CI. Déplacer aussi `@resvg/resvg-wasm` (utilisé uniquement par `api/share-card.ts` et `scripts/rendre-favicon.mjs`, jamais par l'app) hors des `dependencies` de l'app si le déploiement Vercel le permet.

**Contre-vérification.** Sévérité « mineur » justifiée : aucun effet utilisateur, seulement du poids d'AAB et de la surface d'audit. Deux réserves sur la recommandation. (1) `expo-status-bar` est la dépendance la plus susceptible d'être réintroduite au prochain écran plein-écran (barre de statut sur les flux hors onglets) — la retirer est correct, mais c'est celle dont le retrait a le plus de chances d'être annulé. (2) Le déplacement de `@resvg/resvg-wasm` hors des `dependencies` est risqué et le constat le signale trop mollement : `api/share-card.ts` s'appuie sur `vercel.json` → `functions[].includeFiles` pour embarquer le binaire wasm (documenté en `v1-06` §3, et rappelé par CLAUDE.md comme checklist non négociable). Passer le paquet en `devDependencies` peut le faire disparaître de l'installation de production Vercel et casser la carte de partage avec un `FUNCTION_INVOCATION_FAILED` générique, exactement le mode d'échec silencieux décrit. À ne tenter qu'avec une vérification en preview, ou à laisser tel quel — le gain est nul côté AAB, le wasm n'étant pas un module natif autolinké.


### A10-12 — La garde de rendu ne couvre que 5 des 20 pages exportées, et laisse dehors les deux onglets et le questionnaire

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`verifier-rendu-export.mjs` est la seule garde qui **exécute** vraiment les pages, et son en-tête explique bien pourquoi elle existe (un hook natif appelé au rendu a emporté tout l'arbre React le 08/09). Mais sa liste tient en cinq routes : `/`, `/onboarding`, `/confidentialite`, `/conditions`, `/compte/suppression`. Absentes : `/plan` et `/suivi`, c'est-à-dire l'intégralité du navigateur d'onglets introduit par v1-11 ; `/bilan`, le questionnaire en neuf étapes qui est le cœur du produit ; `/suivi/bilan`, la restitution ; `/compte`, `/feedback`, `/connexion/*`. Or la classe de défaut visée — un module natif dont la version web n'a pas la méthode — se loge aussi bien dans `(tabs)/_layout.tsx` ou dans un écran d'onglet, et une exception qui n'est pas dans le layout racine ne serait alors visible sur **aucune** des cinq routes surveillées. J'ai vérifié en dupliquant le script hors du dépôt avec six routes de plus : les 10 se rendent, aucune exception bloquante, un seul avertissement d'hydratation attendu sur `/confidentialite`. La couverture est donc gratuite à étendre aujourd'hui.

Preuves : `scripts/verifier-rendu-export.mjs:44` ; `scripts/verifier-rendu-export.mjs:11` ; `scripts/verifier-rendu-export.mjs:121`

**Recommandation.** Ajouter au moins `/plan`, `/suivi`, `/suivi/bilan`, `/bilan`, `/compte` et `/feedback` avec `marqueur: null` (ces écrans dépendent du réseau, comme la racine, donc seul « la page n'est pas vide et ne lève pas » est vérifiable en CI). Pour tenir le temps de job, remplacer le `waitForTimeout(6_000)` fixe par une attente conditionnelle (`page.waitForFunction(() => document.body.innerText.trim().length > 0, { timeout: 20_000 })`) avec le délai fixe en repli : 20 routes × 6 s deviendraient sinon deux minutes d'attente pure.

**Contre-vérification.** Confirmé mais sévérité ramenée à « mineur », et le constat surestime le trou sur un point précis. L'incident du 08/09/2026 que ce script existe pour attraper est une exception dans le **layout racine** (`useLastNotificationResponse` dans `_layout.tsx`) : elle emporte l'arbre entier, donc les cinq routes actuelles la voient toutes — l'en-tête du script (lignes 4-12) le dit explicitement. Le trou réel est plus étroit que « 5 sur 20 » : c'est une exception confinée à `(tabs)/_layout.tsx` ou à un écran d'onglet. Réel, mais une classe de défaut plus rare que celle déjà couverte. Deux précisions utiles pour l'implémentation : `marqueur: null` est effectivement obligatoire pour `/plan`, `/suivi` et `/bilan` (l'export CI tourne sur configuration Supabase factice, cf. lignes 19-23), et la seule route à ne surtout pas ajouter est `/status` si elle dépend d'un appel serveur. Le remplacement du `waitForTimeout` fixe par `page.waitForFunction` est un bon conseil et vaut d'être fait indépendamment de l'ajout de routes.


### A10-13 — La garde des titres ne fait pas ce que sa propre documentation lui prête : une route sans entrée passe avec « Ramille »

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`titre-de-page.tsx` affirme que le script « refuse en CI tout HTML exporté au titre vide **ou générique** ». Le script ne teste que le vide. Et `pageTitle` retombe sur `DEFAULT_PAGE_TITLE`, qui vaut exactement `APP_NAME` — donc une route ajoutée sans ligne dans `PAGE_TITLES` sort avec `<title>Ramille</title>`, non vide, et la CI passe au vert. C'est le mécanisme d'oubli que toute cette infrastructure a été construite pour empêcher, et il est resté ouvert. Le test unitaire ne peut rien y faire non plus : il vérifie l'unicité des titres **déclarés**, pas l'exhaustivité de la table face aux routes réellement produites. À noter que l'export produit aujourd'hui trois pages qui ne sont dans aucune table — `dist/(tabs)/plan.html`, `dist/(tabs)/suivi/index.html`, `dist/(tabs)/suivi/bilan.html` — et qui s'en tirent seulement parce que `usePathname()` gomme le groupe.

Preuves : `src/components/titre-de-page.tsx:14` ; `scripts/verifier-titres-export.mjs:41` ; `src/constants/page-titles.ts:79` ; `src/constants/page-titles.ts:85`

**Recommandation.** Dans `verifier-titres-export.mjs`, refuser aussi tout titre strictement égal au nom du produit sur une page qui n'est pas la racine (importer la valeur ou la recopier avec un commentaire). Alternative plus robuste : lire `dist/_expo/.routes.json` et exiger une entrée `PAGE_TITLES` pour chaque route produite, ce qui attraperait en plus les trois pages `(tabs)/*` non déclarées.

**Contre-vérification.** Deux corrections au constat : (1) les trois pages `dist/(tabs)/*` sont en réalité correctement titrées dans l'export vérifié à l'instant (`(tabs)/plan.html` → « Ton plan — Ramille », `(tabs)/suivi/index.html` → « Ton suivi — Ramille », `(tabs)/suivi/bilan.html` → « Ton résultat — Ramille »), donc elles ne « s'en tirent » pas : `usePathname()` gomme le groupe et le titre est juste — le seul vrai trou est le repli générique ; (2) la variante robuste est faisable, `dist/_expo/.routes.json` existe bien (fichier caché, invisible d'un `ls` simple). C'est cette variante qu'il faut préférer : refuser un titre égal à `APP_NAME` hors racine laisse encore passer une route qui existerait sans être connue de personne, alors que la comparaison au manifeste de routes attrape les deux cas.


### A10-14 — Aucune garde de dépendances en CI : ni audit, ni Dependabot, ni expo-doctor

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`.github/` ne contient que `workflows/ci.yml` — pas de `dependabot.yml`, pas de CODEOWNERS, pas de gabarit de PR. Aucune des trois étapes de la CI ne regarde les dépendances. Mesures que j'ai prises aujourd'hui : `npm audit --omit=dev` rend **16 vulnérabilités modérées** (730 dépendances de production), toutes dans la chaîne d'outillage `@expo/cli`/`@expo/config-plugins` — `decode-uri-component` (GHSA-vcc3-ghjq-m6fr), `fflate` (GHSA-px8p-9vwx-vf98), `uuid` (GHSA-w5hq-g745-h8pq) — donc sans surface d'attaque dans le bundle livré ; `npx expo-doctor` passe 21/21 ; `npm outdated` montre un décalage assumé et sain (versions alignées sur le SDK 57). Le constat n'est donc pas l'état actuel, qui est bon : c'est qu'une future faille **haute ou critique** dans une dépendance réellement embarquée n'aurait aucun moyen de se signaler.

Preuves : `.github/workflows/ci.yml:8` ; `.github/workflows/ci.yml:37` ; `package.json:50`

**Recommandation.** Ajouter au job `checks` un `- run: npm audit --omit=dev --audit-level=high` (non bloquant sur le bruit modéré actuel, bloquant sur ce qui compte) et un `- run: npx expo-doctor`, qui passe déjà et vérifie en plus l'alignement des versions natives avec le SDK — la garde la plus rentable ici puisqu'une version désalignée ne se voit qu'à l'exécution sur appareil. Activer Dependabot en `weekly` groupé, pour que les montées arrivent en lots relisibles plutôt qu'en vrac au prochain SDK.

**Contre-vérification.** Nuance à passer à la synthèse : `npm audit --audit-level=high` sur un projet Expo est un signal à faible rendement (l'essentiel du bruit vient de l'outillage, jamais du bundle), tandis que `npx expo-doctor` couvre justement le défaut de la famille documentée dans CLAUDE.md — « une dépendance native nouvelle impose un build », un désalignement de version ne se voyant qu'à l'exécution sur appareil. Si une seule étape doit être ajoutée, c'est `expo-doctor`, et bloquante. Pour Dependabot, le groupement hebdomadaire est indispensable ici : un monorepo Expo génère sinon une dizaine de PR par semaine sur des versions que le SDK épingle de toute façon.


### A10-15 — Sur un clone neuf, la première commande que le README demande de lancer échoue

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Vérifié : j'ai retiré `expo-env.d.ts` et relancé `npx tsc --noEmit`, qui sort en erreur `TS2882: Cannot find module or type declarations for side-effect import of '@/global.css'` sur `src/constants/theme.ts:6`. Or `README.md:23` donne `npx tsc --noEmit` comme la vérification à lancer, et CLAUDE.md en fait la commande « à lancer après tout changement ». Le fichier est gitignoré (`.gitignore:10`) parce qu'Expo le génère au premier `expo start`. La CI connaît le problème et le contourne avec une étape `printf` documentée sur six lignes — mais cette explication vit uniquement dans un commentaire de workflow. Un nouveau contributeur, ou une session d'agent sur un checkout propre, tombe donc sur un échec dont la cause est correctement documentée à l'endroit où personne ne va la chercher.

Preuves : `README.md:23` ; `.github/workflows/ci.yml:24` ; `.gitignore:10` ; `src/constants/theme.ts:6`

**Recommandation.** Ajouter un script `"prepare"` ou `"postinstall"` dans `package.json` qui crée `expo-env.d.ts` s'il est absent (une ligne de `node -e`), ce qui règle le cas localement, en CI et pour un agent — et permet même de retirer l'étape `printf` du workflow. À défaut, deux lignes dans le README à côté de la commande de typecheck. Profiter du même passage pour y mentionner les gardes d'export (`node scripts/verifier-*.mjs`), aujourd'hui invisibles hors CI.

**Contre-vérification.** Attention au choix du script : un `postinstall` s'exécute aussi sur les installations de dépendances en environnement de build Vercel et EAS, et un `prepare` ne tourne pas avec `npm ci --omit=dev`. Le plus sûr est un `postinstall` d'une ligne idempotent (`node -e "require('fs').existsSync('expo-env.d.ts')||require('fs').writeFileSync(...)"`) qui n'échoue jamais. Ne pas retirer l'étape `printf` de la CI dans le même mouvement : garder les deux un cycle, sinon un `postinstall` silencieusement cassé rend la CI rouge sans indice, exactement la famille de défaut muet que ce repo documente ailleurs.


### A10-16 — Aucune version de Node n'est fixée, et `@types/node` déclare une API plus récente que tout runtime en jeu

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`package.json` n'a pas de champ `engines`, il n'y a ni `.nvmrc` ni `.node-version`, et le README ne mentionne aucune version. La CI épingle `node-version: 22` dans ses trois jobs. Pendant ce temps `@types/node` est en `^26.4.1` (résolu à 26.5.0 — `npm outdated` signale d'ailleurs le cas inhabituel où le « latest » publié, 22.20.2, est *antérieur* à la version installée). Ces types sont exactement ceux que consomme `api/tsconfig.json` via `"types": ["node"]`. Le code des Vercel Functions se typecheck donc contre une surface d'API Node plus récente que le Node 22 de la CI et que le runtime Vercel : un appel à une API introduite après Node 22 compilerait sans un mot et échouerait à l'exécution — dans le contexte, précisément, où l'échec est un `FUNCTION_INVOCATION_FAILED` sans détail.

Preuves : `package.json:41` ; `.github/workflows/ci.yml:16` ; `api/tsconfig.json:8` ; `README.md:14`

**Recommandation.** Ajouter `"engines": { "node": ">=22 <23" }` dans `package.json` et un `.nvmrc` contenant `22`, puis ramener `@types/node` sur la ligne 22 (`~22.x`) pour que le typecheck des Functions corresponde au runtime réel. Aligner enfin la version Node déclarée dans le projet Vercel sur la même valeur.

**Contre-vérification.** Le mécanisme de risque décrit est faux tel qu'écrit, et ce qu'il rate est plus grave que ce qu'il dit : **le code de `api/` n'est typechecké nulle part**. `tsconfig.json` racine l'exclut explicitement (`"exclude": ["node_modules", "api/**"]`), et `api/tsconfig.json` n'est référencé ni dans `package.json`, ni dans `.github/workflows/ci.yml`, ni dans `scripts/` (grep vide). Il n'y a donc pas de « compile sans un mot » en CI — il n'y a pas de compilation du tout : seul l'éditeur du développeur lit ce tsconfig. Vu ce que CLAUDE.md dit du coût d'un échec de Vercel Function (`FUNCTION_INVOCATION_FAILED` générique, aucun détail côté client), la recommandation prioritaire est d'ajouter `- run: npx tsc -p api/tsconfig.json --noEmit` au job `checks` ; ramener `@types/node` sur `~22.x` et poser `engines`/`.nvmrc` ne prend son sens qu'une fois ce typecheck existant.


### A10-17 — La stack de test locale désactive les connexions anonymes, sur lesquelles repose tout le modèle d'authentification

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`supabase/config.toml` pose `enable_anonymous_sign_ins = false`. Or le choix architectural central du produit est que « chaque visiteur reçoit une session Supabase Auth anonyme dès l'ouverture de l'app ». La stack Docker démarrée par `supabase db start` — la seule base que la CI peut réellement exercer — ne peut donc pas exécuter `ensureSession()`, ni le passage d'une session anonyme à un compte, ni la reprise de jeton de `register_push_token`. Les tests pgTAP contournent en fabriquant des `request.jwt.claims`, ce qui teste bien la RLS mais jamais le chemin d'authentification lui-même. Le même fichier porte par ailleurs `auto_expose_new_tables = true` avec, dans son propre commentaire, une échéance de révision au 2026-10-30 que rien n'enforce : ce flag masque en local l'absence de GRANT explicites que le projet distant fournit par défaut de plateforme — donc un GRANT manquant dans une migration ne se verrait ni en local ni en CI.

Preuves : `supabase/config.toml:189` ; `supabase/config.toml:33` ; `supabase/config.toml:31`

**Recommandation.** Passer `enable_anonymous_sign_ins = true` (et `[auth.rate_limit] anonymous_users` est déjà réglé) pour que la stack locale reflète la production et rende possibles de futurs tests d'intégration sur le flux de session. Pour `auto_expose_new_tables`, transformer l'échéance en quelque chose de mécanique : ouvrir une issue GitHub datée, ou ajouter les GRANTs explicites dans une migration dès maintenant et retirer le flag — un commentaire avec une date ne se relit jamais au bon moment.

**Contre-vérification.** Le constat surestime légèrement l'impact immédiat : aucun test de la suite pgTAP n'appelle GoTrue, et il n'existe aujourd'hui aucun test d'intégration client dans le repo (CLAUDE.md §Tests : « pas encore de tests d'intégration bout-en-bout (écrans, flux de connexion) »). Le flag ne casse donc rien aujourd'hui — c'est un blocage à venir, pas une régression. Le point réellement coûteux des deux est `auto_expose_new_tables` : il masque en local l'absence de GRANT, or c'est la stack locale qui fait autorité en CI. La bonne sortie n'est pas une issue datée mais d'écrire les GRANTs dans une migration et de retirer le flag — sans quoi le jour où le projet distant sera recréé ou branché (`create_branch`), l'écart plateforme/migrations se paiera d'un coup.


### A10-18 — Pas de robots.txt ni de sitemap, et l'export publie trois surfaces qui ne devraient pas être indexées

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

L'export ne produit ni `dist/robots.txt` ni `dist/sitemap.xml` (vérifié après `expo export`). Il publie en revanche `dist/_sitemap.html`, la page de développement d'Expo Router qui liste toutes les routes ; `dist/status.html`, l'écran de diagnostic qui interroge Supabase et affiche `error.message` brut, décrit dans son propre en-tête comme « volontairement non lié depuis nulle part » ; et trois doublons d'URL — `dist/(tabs)/plan.html`, `dist/(tabs)/suivi/index.html`, `dist/(tabs)/suivi/bilan.html` — servant le même contenu que `/plan`, `/suivi` et `/suivi/bilan`, sans balise canonique. « Non lié » n'est pas « non indexé » : il suffit qu'une de ces URL apparaisse une fois quelque part. Combiné à A10-4 (aucune métadonnée), le référencement des deux seules pages qui comptent vraiment est laissé au hasard.

Preuves : `src/app/status.tsx:15` ; `src/app/status.tsx:52` ; `scripts/verifier-titres-export.mjs:20` ; `vercel.json:3`

**Recommandation.** Ajouter `public/robots.txt` (recopié tel quel dans l'export, comme `.well-known/assetlinks.json`) qui interdit `/_sitemap`, `/status`, `/(tabs)/` et autorise le reste, plus un `sitemap.xml` minimal listant `/`, `/onboarding`, `/confidentialite`, `/conditions`, `/compte/suppression`. Étendre `verifier-assetlinks-export.mjs` — ou lui ajouter un frère — pour exiger la présence de `robots.txt` dans `dist/`, même famille de garde muette que les autres.

**Décision documentée concernée.** L'écran `/status` est explicitement documenté comme volontairement non lié et accessible en tapant l'URL (`src/app/status.tsx:15-16`). Je ne propose pas de le retirer, seulement de le sortir de l'indexation — mais si l'intention était qu'il reste trouvable, c'est à trancher.

**Contre-vérification.** Deux précisions. (1) La fuite de `/status` est plus faible que suggéré : la page est un composant client, le HTML statique exporté ne contient pas le message d'erreur — il n'apparaît qu'après hydratation, donc un crawler n'indexe pas le message, seulement l'existence de la page. (2) `robots.txt` ne dédoublonne rien : pour les trois URL `(tabs)/*` c'est une balise canonique ou une redirection Vercel qui règle le problème, et un `Disallow: /(tabs)/` est de surcroît fragile (parenthèses à échapper). Le plus simple et le plus dans la manière du repo : ajouter `public/robots.txt` (recopié tel quel comme `assetlinks.json`) et une redirection 308 `(tabs)/*` → chemin nu dans `vercel.json`, plus une garde d'export sœur de `verifier-assetlinks-export.mjs` — c'est la garde qui manque le plus, un `robots.txt` qui disparaît de l'export est exactement le défaut muet que cette famille de scripts existe pour attraper.


### A10-20 — `useTheme` se protège d'une valeur que le runtime ne produit jamais, et pas de celle qu'il produit

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

`useTheme` traite le cas `'unspecified'` puis indexe `Colors[theme]`. Les types résolus ici donnent bien `ColorSchemeName = 'light' | 'dark' | 'unspecified'` (vérifié : un fichier de sonde jeté produit `Type '"unspecified"' is not assignable to type '"light" | "dark"'`), mais l'implémentation réelle de React Native peut rendre `null` — `Appearance.getColorScheme()` initialise `let colorScheme = null` et le rend tel quel quand `NativeAppearance` est absent, et la signature Flow d'origine est `?ColorSchemeName`. Dans ce cas `Colors[null]` vaut `undefined` et la première lecture `theme.text` lève. Comme `useTheme` est appelé par `ThemedText`, `ThemedView`, `Button` et vingt autres composants, l'exception se produirait au rendu du premier écran — donc une page blanche, la classe de panne exacte que `verifier-rendu-export.mjs` a été écrit pour attraper. Probabilité faible, correctif d'un caractère.

Preuves : `src/hooks/use-theme.ts:11` ; `src/hooks/use-color-scheme.ts:1` ; `src/components/themed-text.tsx:60`

**Recommandation.** Remplacer la condition par une liste blanche : `const theme = scheme === 'dark' ? 'dark' : 'light';`. Elle couvre `'unspecified'`, `null` et `undefined` d'un coup, et supprime la dépendance à une nuance de typage entre la déclaration TypeScript et l'implémentation Flow de React Native. (Si A10-1 est tranché en faveur du clair sur web, ce hook est de toute façon le bon endroit pour le poser.)

**Contre-vérification.** Le constat surestime la portée : sur web, `src/hooks/use-color-scheme.web.ts` est le module résolu, et il renvoie `'light'` avant hydratation puis la valeur de `react-native-web`, dont `Appearance.getColorScheme()` (node_modules/react-native-web/dist/exports/Appearance/index.js) rend toujours `query && query.matches ? 'dark' : 'light'` — jamais null. La page blanche invoquée, et donc le lien avec `verifier-rendu-export.mjs`, ne peut pas se produire sur web ; le risque est strictement natif, et seulement si `NativeAppearance` est absent (cas de bord). C'est donc un durcissement gratuit d'un caractère, pas un défaut observable — à présenter comme tel pour ne pas gonfler la file.


### A10-21 — Les tailles fixes des contrôles ignorent l'agrandissement système des polices

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Aucun `allowFontScaling` ni `maxFontSizeMultiplier` n'existe dans `src/` — c'est le bon choix par défaut, le texte suit donc le réglage d'accessibilité d'Android. Mais les conteneurs, eux, sont figés : `Button` impose `height: ControlHeight.button` (54), `GoogleButton` un `height: 54` en dur, la barre d'onglets `height: 60 + insets.bottom` avec des libellés en `fontSize: 12`, et `TextLink` un `minHeight` de 44 (celui-là est correct puisque c'est un minimum). À 150 % ou 200 % d'agrandissement — un réglage courant, pas un cas exotique — le libellé d'un bouton principal et ceux des deux onglets débordent d'une boîte qui ne grandit pas et sont rognés. Sur un produit dont le public est large et dont l'usage s'étale sur des années, c'est le genre de défaut qui fait abandonner sans jamais être signalé.

Preuves : `src/components/button.tsx:58` ; `src/components/auth/google-button.tsx:43` ; `src/app/(tabs)/_layout.tsx:42` ; `src/constants/theme.ts:143`

**Recommandation.** Passer les hauteurs de contrôle de `height` à `minHeight` avec un padding vertical — le bouton garde son allure à taille normale et grandit au lieu de rogner. Pour la barre d'onglets, soit dériver la hauteur de `PixelRatio.getFontScale()`, soit poser un `maxFontSizeMultiplier` sur les seuls libellés d'onglets (le seul endroit où le plafond se justifie, la place y étant contrainte par le système). Vérifier ensuite sur appareil à 200 % — c'est le genre de point qui rejoint naturellement la liste des vérifications sur appareil de v1-11 §8.

**Contre-vérification.** Nuance factuelle à corriger dans le constat : `overflow` vaut `visible` par défaut sur une `View` React Native, donc le symptôme le plus probable n'est pas un rognage net mais un débordement du texte hors de la boîte (chevauchement avec l'élément voisin, ou troncature dans la barre d'onglets où react-navigation contraint la ligne). Le remède reste le bon. Deux précisions utiles : passer `height` → `minHeight` + `paddingVertical` sur `Button` et `GoogleButton` traite les deux boutons de l'écran de connexion d'un coup (et croise A10-22, où `GoogleButton` doit de toute façon consommer `ControlHeight.button`) ; et le plafond `maxFontSizeMultiplier` ne se justifie que sur les libellés d'onglets, dont la place est imposée par le système. C'est bien un candidat pour la liste de vérifications sur appareil de `v1-11` §8, aujourd'hui la seule façon de le constater — rien en CI ne rend à l'échelle de police.


### A10-22 — Résidus du design system : une taille de 30 px déclarée quatre fois avec trois interlignages différents, une hauteur de bouton hors jeton

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La migration du lot 4 est bien faite dans l'ensemble (plus aucun `borderRadius: 18`, `16` ou `27` en dur, une seule occurrence restante de `fontSize: 26`). Restent deux résidus qui font exactement ce que les jetons devaient empêcher. D'abord `fontSize: 30` apparaît à quatre endroits avec **trois combinaisons différentes** : `36 / -0.6` dans `etape-contexte` et `connexion/index` (identique à `TypeScale.salient`), `36 / -0.3` dans `legal-page`, `38 / -0.6` dans `ecran-lancement`. Les pages légales — les deux seules surfaces publiques — ont donc un titre au tracking différent du reste du produit, sans que rien ne dise si c'est voulu. CLAUDE.md évoque « deux titres [qui] valent 30 px » et restent en dur ; ils sont quatre, et divergent. Ensuite `GoogleButton` fixe `height: 54` en dur alors que `Button` consomme `ControlHeight.button` : les deux boutons sont côte à côte sur l'écran de connexion et dériveront au premier ajustement du jeton.

Preuves : `src/components/legal/legal-page.tsx:158` ; `src/components/onboarding/etape-contexte.tsx:165` ; `src/components/ecran-lancement.tsx:136` ; `src/components/auth/google-button.tsx:43`

**Recommandation.** Remplacer le `height: 54` de `GoogleButton` par `ControlHeight.button` — un seul mot, et les deux boutons de l'écran de connexion ne peuvent plus diverger. Pour les 30 px : décider si le `-0.3` de `legal-page` est intentionnel (auquel cas l'écrire en commentaire, comme le reste du dépôt le fait bien) ou l'aligner sur `-0.6` ; puis nommer un jeton pour cette taille de titre, distinct de `salient` qui, lui, qualifie un **chiffre** — la distinction est la bonne, il lui manque juste son second nom.

**Décision documentée concernée.** CLAUDE.md justifie de laisser ces titres en dur : « Deux titres valent 30 px, la même valeur que `salient` qui nomme un chiffre : ils restent en dur, ce type sur un titre encoderait une fausse équivalence. » Ma proposition de leur donner leur propre jeton rouvre ce raisonnement — mais le constat des trois interlignages divergents, lui, tient dans les deux cas.

**Contre-vérification.** Le `GoogleButton` est la partie du constat à retenir : un mot, zéro arbitrage. Sur les 30 px, séparer les trois cas plutôt que les traiter en bloc — `ecran-lancement.tsx:136` n'est pas un titre d'écran mais le nom du produit centré sur l'écran de lancement (une taille unique qui vit là où elle vit, exactement le cas que `theme.ts` l.109-110 dit de laisser en dur) ; c'est donc le seul `-0.3` de `legal-page.tsx` qui est une vraie divergence non expliquée, à aligner sur `-0.6` ou à commenter. La proposition de créer un jeton rouvre en revanche l'arbitrage explicite de CLAUDE.md (« ce type sur un titre encoderait une fausse équivalence ») : à ne pas emporter dans le même geste. Noter enfin que le constat prête à CLAUDE.md un décompte qu'il ne fait pas au même niveau — « deux titres valent 30 px » y désigne l'équivalence avec `salient`, pas un inventaire exhaustif des sites.


### A10-23 — `npm run reset-project` efface `src/` et `scripts/`, et n'a plus aucune raison d'exister

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le script de démarrage de `create-expo-app` est toujours dans le dépôt et toujours exposé comme commande npm. Son propre en-tête dit qu'on peut le retirer de `package.json` et le supprimer sans risque après usage. En l'état, `npm run reset-project` suivi de `n` supprime récursivement `src/` **et** `scripts/` — c'est-à-dire tout le produit et l'intégralité des garde-fous d'export — puis recrée un `src/app` vide avec un « Edit src/app/index.tsx » en anglais. Le nom est à un caractère de `npm run reset` et à deux tabulations d'une autocomplétion malheureuse. C'est le seul fichier du dépôt à ne suivre aucune de ses conventions (anglais, émojis, prompt interactif), ce qui augmente la chance qu'un outil ou un agent le prenne pour une commande de nettoyage anodine.

Preuves : `package.json:52` ; `scripts/reset-project.js:67` ; `scripts/reset-project.js:14` ; `scripts/reset-project.js:6`

**Recommandation.** Supprimer `scripts/reset-project.js` et la ligne 52 de `package.json`. C'est du code mort dont le seul comportement est destructeur, et le fichier lui-même dit qu'il est fait pour être supprimé.

**Contre-vérification.** Le constat sous-estime légèrement un point : `scripts/` ne contient pas que du confort, c'est là que vivent les quatre gardes d'export appelées par `.github/workflows/ci.yml` (`verifier-titres-export.mjs`, `verifier-configuration-export.mjs`, `verifier-rendu-export.mjs`, `verifier-assetlinks-export.mjs`) — autrement dit les mécanismes écrits précisément parce que « ce qui se construit n'est pas ce qui s'affiche ». Leur perte ne se verrait pas au typecheck ni aux tests, seulement à la prochaine régression silencieuse. Cela dit, tout est sous git : le geste est réversible par `git checkout`, ce qui borne la sévérité à mineur. Suppression pure et simple, comme recommandé.


## A11 — cohérence documentation ↔ code, décisions non implémentées, pistes différées

**Résumé du lecteur.** Le corpus documentaire est d'une qualité inhabituelle : douze documents d'architecture qui expliquent le *pourquoi*, des bandeaux de supersession datés, et surtout des sections « ce que l'implémentation a corrigé » qui consignent les écarts au lieu de les lisser. Ce qui manque n'est pas la documentation mais **son point d'entrée** : CLAUDE.md décrit une navigation d'avant v1-11 (flux `/bilan/resultat`, `/suivi` « depuis le plan »), renvoie quatre fois à un fichier devenu une redirection de quinze lignes, désigne comme « feuille de route courante » un plan dont les sept étapes sont marquées « fait », et justifie une règle de test par un comportement qu'il corrige lui-même plus loin. En face, v1-10 §9 et v1-11 §5 listent encore comme ouverts six chantiers livrés depuis (#59 à #62, #65, #68) : aucun registre à jour n'existe, et la seule façon de savoir ce qui reste est de relire douze documents en vérifiant chacun dans le code. Côté produit, l'inventaire fait apparaître quatre engagements de la spec d'origine jamais construits et jamais fermés : le signal « 2 check-ins consécutifs » (pourtant un des trois indicateurs de succès), la comparaison saison contre même saison (qui est **la** justification du choix de cadence), le check-in quantitatif laissé « à instruire » depuis v1-07, et les équivalences concrètes du chiffre. S'y ajoute `mobility_constrained` : calculé, stocké, commenté pour la restitution — et lu par aucun écran, alors que c'est le levier anti-culpabilisation le mieux identifié du produit. Un seul écart doc↔code mord vraiment aujourd'hui : la règle `useRafraichirAuRetour`, écrite au sang après le test d'appareil du 09/09, n'est appliquée que sur l'onglet Plan — l'onglet Suivi affiche une trace périmée après un re-bilan ou un point répondu.

**Points forts à ne pas casser**

- **Les bandeaux de supersession datés** de v1-01, v1-02, v1-04 et v1-05 §2 sont une pratique rare : ils disent quoi ne plus lire sans réécrire une décision datée, et c'est ce qui rend le corpus navigable après douze increments. À étendre (v1-03 en manque), jamais à supprimer.
- **Les écarts d'implémentation sont consignés à côté du plan, pas lissés dedans** (v1-11 §7 et §9, v1-12 §10, v1-07 « Reste ouvert ») : on lit ce qui était prévu *et* ce qui a résisté, avec la leçon (« quatre d'entre eux viennent d'avoir lu le canvas au lieu du code »). C'est la seule raison pour laquelle un audit de cohérence doc↔code est possible ici.
- **La discipline de double inscription des événements d'usage tient** sur quatre migrations successives : quinze événements dans `usage_event_types`, quinze dans `src/types/analytics.ts`, épinglés par un `bag_eq` pgTAP et un test Jest — et vérification faite un par un, **aucun événement déclaré n'est muet**, la règle « un événement jamais émis se lit zéro » est respectée.
- **Les décisions les plus coûteuses sont doublées d'un test qui les protège d'une correction par réflexe** : ordre ACV des motorisations, source exacte des facteurs, vélo non nul, invariant SDES total = somme des postes, table de vérité `reminder_channel_for` écrite des deux côtés. Le document explique le pourquoi, le test empêche le retour en arrière.
- **Les pièges « ce qui se construit n'est pas ce qui s'affiche » sont gardés par des scripts, pas par des phrases** : titres, configuration `EXPO_PUBLIC_*`, rendu réel de cinq routes au navigateur, `assetlinks.json` — les quatre tournent en CI aux côtés de Jest et pgTAP.
- **Les chemins cités dans CLAUDE.md existent tous** (vérifiés un par un), et le dépôt ne contient ni TODO ni `console.log` dans `src/`, `api/` et `scripts/` : l'affirmation de v1-10 §9 tient toujours.

### A11-1 — La règle « tout écran d'onglet doit utiliser useRafraichirAuRetour » n'est appliquée que sur un des deux onglets

`technique` · sévérité **important** · verdict **confirme** · effort petit

CLAUDE.md pose la règle en toutes lettres après le test d'appareil du 09/09 : « tout écran d'onglet dont le contenu peut changer côté serveur doit l'utiliser », et « un useEffect de montage, là, rend un écran plausible et périmé ». Seul `(tabs)/plan.tsx` l'utilise. `(tabs)/suivi/index.tsx` charge son historique et ses check-ins dans un `useEffect(..., [])`, donc une seule fois par lancement — or react-navigation le garde monté quand on passe sur Plan, et le questionnaire (`/bilan`, hors des onglets) est empilé par-dessus la barre sans démonter l'onglet. C'est l'écran qui porte à lui seul la promesse d'accompagnement dans la durée qui affiche une trace périmée.

Preuves : `src/app/(tabs)/suivi/index.tsx:75` ; `src/app/(tabs)/plan.tsx:124` ; `CLAUDE.md:163`

**Recommandation.** Appeler `useRafraichirAuRetour` dans `(tabs)/suivi/index.tsx` avec la même fonction de chargement que l'effet actuel. Scénarios à rejouer : répondre au point de la semaine depuis Plan puis revenir sur Suivi (le point répondu et le compteur doivent apparaître) ; refaire un bilan puis toucher l'onglet Suivi (le nouveau point doit être dans le graphe). Vérifier au passage si `(tabs)/suivi/bilan.tsx` a le même besoin quand on y revient par `router.back()`.

**Contre-vérification.** Deux précisions que le constat rate. (1) Le hook exige une fonction **stable** (`useCallback`) sous peine de recréer l'abonnement `AppState` à chaque rendu — l'effet actuel étant une IIFE inline, il faut d'abord extraire un `charger` mémoïsé, et conserver le garde `cancelled` pour éviter un `setState` après démontage sur rafraîchissements concurrents. (2) Sur `(tabs)/suivi/bilan.tsx` le besoin est bien plus faible : c'est un écran de pile poussé (donc démonté au retour) et son contenu est `assessment_results`, figé par construction ; il utilise correctement `useTrackView` (ligne 157) et non `useTrackFocus`. Ne pas y appliquer le hook par symétrie. (3) Penser aussi à ce que le rafraîchissement ne remette pas l'écran en `status: 'loading'` (retour visuel de spinner à chaque bascule d'onglet) : recharger en arrière-plan et ne remplacer l'état qu'à l'arrivée des données.


### A11-3 — Le signal « 2 check-ins consécutifs » n'existe toujours nulle part, alors que trois documents le portent — dont les success metrics

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

La spec fonctionnelle en fait le signal d'engagement retenu (§7) et un des trois indicateurs de succès de la V1 (§9 : « taux d'utilisateurs atteignant 2 check-ins consécutifs »). La spec UI/UX §4 en fixe le rendu (mention textuelle discrète, jamais un badge) et le handoff en donne la phrase exacte (« Deuxième mois de suite que tu changes quelque chose sur ce trajet. »). v1-02 §4 en écrit même le SQL. v1-07 §3.2 constate qu'il « n'est calculé nulle part » ; c'est toujours vrai après quatre increments. `CheckinCard` rend une réplique unique quelle que soit l'histoire de la personne, et aucune vue analytics ne le calcule.

Preuves : `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:191` ; `docs/architecture/v1-02-boucle-engagement.md:117` ; `src/components/checkin-card.tsx:80`

**Recommandation.** Trancher explicitement : soit calculer le signal (une requête sur les deux derniers `engagement_checkins` de la boucle) et l'utiliser comme second renforcement textuel après une réponse positive — c'est le moment de reconnaissance le moins cher du produit et il est aujourd'hui perdu — soit le retirer de la spec §9 comme indicateur de succès, pour ne pas garder une métrique qui n'a aucun moyen d'être observée.

**Contre-vérification.** Le constat rate deux difficultés qui rendent l'option « calculer » moins triviale que « une requête sur les deux derniers check-ins ». (1) L'expiration : `generate_*_checkins` clôt les périodes non répondues en `expired`, donc « consécutif » doit se lire sur les **périodes** (`period_start` successifs de la boucle) et non sur les deux dernières lignes répondues, sinon deux « oui » séparés par trois mois de silence comptent comme consécutifs. (2) `CheckinCard` est un composant client sans contexte d'historique : le calcul est à faire côté serveur (v1-02 §4 le prévoit) ou à passer en prop depuis `/plan`, faute de quoi on ajoute une requête par carte. Et le rendu doit rester une phrase de corps de texte (spec UI/UX l.57) : ne pas en faire un compteur. Si le choix est de fermer la piste, il faut retirer l'indicateur de spec §9 **et** rectifier v1-02 §4, pas seulement l'un des deux.


### A11-9 — La section Routing de CLAUDE.md décrit la navigation d'avant v1-11, et quatre renvois pointent un fichier devenu une redirection de 15 lignes

`technique` · sévérité **important** · verdict **confirme** · effort petit

v1-11 a déplacé la restitution sous l'onglet Suivi : `/bilan/resultat` n'est plus qu'un `<Redirect>` et le questionnaire route vers `/suivi/bilan?id=&nouveau=1`. CLAUDE.md décrit toujours le flux `/bilan` → `/bilan/resultat` → `/plan`, et annonce `/suivi` « depuis le plan » alors que le lien « Voir mon suivi » a été retiré du plan au lot 2 (la barre le porte). Quatre autres passages renvoient le lecteur à `bilan/resultat.tsx` pour du contenu qui vit dans `(tabs)/suivi/bilan.tsx` : le bouton de partage, `MODE_PREPOSITION`, la bannière `Pressable` de l'exemple d'accessibilité, et les deux variantes `dominantHeadline`/`dominantShareLabel`. C'est le seul document que quelqu'un lit avant de toucher au code, et sa carte du territoire est fausse.

Preuves : `CLAUDE.md:116` ; `src/app/bilan/resultat.tsx:12` ; `src/app/(tabs)/plan.tsx:540`

**Recommandation.** Réécrire la section Routing autour de la barre à deux onglets (`(tabs)/plan`, `(tabs)/suivi/index`, `(tabs)/suivi/bilan`, tout le reste en plein écran), et remplacer les quatre renvois à `bilan/resultat.tsx` par `src/app/(tabs)/suivi/bilan.tsx` en gardant une mention de la redirection conservée pour les liens partagés.

**Contre-vérification.** Le constat en oublie un cinquième renvoi : l.105 (« carte de bilan partageable, cf. `bilan/resultat.tsx` "Partager mon bilan" ») dans le paragraphe `api/`, à corriger dans la même passe. À l'inverse, l.95 (`cleanUrls`, « `/bilan/resultat` … inaccessible en production ») et l.137 (v1-11, « `/bilan/resultat` conservée en redirection ») sont des faits datés justes et ne doivent pas être réécrits. Garder une phrase disant que la redirection existe exprès pour les liens déjà partagés et `page-titles.ts` : sans elle, un futur nettoyage supprimera le fichier et cassera la boucle de partage.


### A11-10 — Aucun registre à jour des points ouverts : plusieurs items listés comme différés sont livrés, et la « feuille de route courante » est un plan entièrement fait

`technique` · sévérité **important** · verdict **confirme** · effort petit

CLAUDE.md désigne v1-07 §4 comme la feuille de route courante — or ses sept étapes sont toutes marquées « fait ». Symétriquement, v1-10 §9 et v1-11 §5 listent comme ouverts des chantiers qui sont livrés : #59 (les `Alert.alert` sont remplacés par `MessageInline`), #60 (la collision Google est traitée par `identiteDejaRattachee`), #61 (`retrouver_view`/`retrouver_send` sont émis), #62 (le bandeau « Ton compte est rattaché à … » existe sur le plan et sur Toi), #65 (`ConfigurationManquante` est rendu par le layout racine), #68 (l'onboarding se balaie, v1-11 §9.10). Rien dans `docs/` ne l'enregistre : la seule façon de savoir ce qui reste est de relire douze documents et de vérifier chacun dans le code — ce qui est exactement le travail qu'un registre évite.

Preuves : `CLAUDE.md:174` ; `docs/architecture/v1-11-navigation-et-design-system.md:449` ; `src/app/connexion/retrouver.tsx:68`

**Recommandation.** Sans créer de ROADMAP.md (le dépôt a tranché pour les issues GitHub), faire deux choses : fermer les issues effectivement livrées, et remplacer dans CLAUDE.md le renvoi « feuille de route courante → v1-07 §4 » par ce qui reste vraiment ouvert aujourd'hui (chantier G, empreinte de signature Play #93, dépendances SDK #58, formulaire Sécurité des données de Play). Les documents datés n'ont pas à être réécrits ; c'est le pointeur d'entrée qui doit être juste.

**Contre-vérification.** Une correction sur la recommandation : #58 (dépendances Expo SDK 57) n'est plus ouvert — le commit `eebf38d` « Dépendances Expo au niveau du SDK, et deux vérifications d'appareil consignées (#96) » l'a livré. Ce qui reste réellement ouvert et mérite de figurer dans le pointeur d'entrée : chantier G de v1-10 (renommage GitHub — les URL d'issues des docs pointent encore `ScratchMe/TraceVerte`), l'empreinte de signature Play sur `assetlinks.json` (#93, v1-12 §6.6, seule échéance que v1-12 §9 reconnaisse), le formulaire Sécurité des données de Play (v1-12 §6.5), les trois points d'appareil de v1-11 §8, et la mise en service des secrets Vault si elle n'est pas faite. Reformuler l'entrée CLAUDE.md en « v1-07 §4 : plan d'exécution clos, conservé comme historique de l'audit », pour que le document daté ne soit pas réécrit.


### A11-2 — `mobility_constrained` est calculé, stocké et commenté pour la restitution — aucun écran ne le lit

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

v1-07 §3.3 annonce que « `assessment_results.mobility_constrained` porte le même constat pour la restitution (§3.5), où il servira à retirer la comparaison à la moyenne nationale », et le commentaire de colonne le redit. Dans les faits : le filtrage des actions du plan lit directement `tc_access`/`household_vehicles`, et la restitution affiche « La moyenne française est de X » à tout le monde, y compris au profil rural sans desserte. Le levier anti-culpabilisation le mieux identifié du produit (spec §5 : « éviter de traiter un profil rural sans alternative comme un mauvais élève ») est donc calculé mais toujours inerte à l'endroit qui compte — l'écran de prise de conscience. Hors des vues `analytics`, la colonne n'est lue nulle part.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:76` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:524` ; `src/app/(tabs)/suivi/bilan.tsx:107`

**Recommandation.** Brancher `mobility_constrained` sur la phrase de positionnement et sur la barre « Moyenne en France » de `(tabs)/suivi/bilan.tsx` : pour un profil contraint, remplacer la comparaison nationale par un repère qui le concerne (son propre palier, son bilan précédent). Ne rien masquer d'autre — le commentaire de colonne interdit explicitement de s'en servir pour restreindre ce que la personne voit.

**Contre-vérification.** Le constat surévalue le dommage restant. Des deux points de v1-07 §3.5, celui qui portait la charge culpabilisante (« Tu es à 150 % de la moyenne française », un score) a été supprimé : la phrase actuelle est un fait neutre, sans pronom de jugement, et les barres montrent l'écart de toute façon. Ce qui reste n'est pas un écran blessant mais une intention documentée non tenue — la colonne n'est donc pas morte (les vues analytics la lisent), c'est la promesse de §3.5 qui est à moitié servie alors que le tableau d'exécution §4 marque §3.5 « fait » à l'étape 3 : c'est cette ligne du tableau qu'il faut corriger si on ne branche pas la colonne. Attention aussi au piège rappelé par CLAUDE.md sur le vocabulaire B4 (`inexistant`, `rural`/`periurbain`/`urbain_dense`) : ne pas recalculer la contrainte côté client, lire la colonne. Enfin le repère de remplacement suggéré (« son bilan précédent ») n'existe pas au premier bilan — prévoir le cas où il n'y a qu'un point, sinon la phrase disparaît pour les profils qu'elle vise.


### A11-4 — La comparaison « mon été vs mon été précédent » — la raison même du choix des saisons — n'a jamais été construite

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

La spec §6 privilégie les saisons calendaires précisément « pour pouvoir comparer un même type de saison d'une année sur l'autre (mon été vs mon été précédent) plutôt qu'une fenêtre de 3 mois sans ancrage saisonnier réel », et v1-03 §2 tranche pour les saisons météorologiques en reprenant ce bénéfice comme argument principal. Rien dans le produit ne compare deux saisons homologues : `src/types/suivi.ts` ne sait comparer qu'un bilan au précédent (`variationNote`), et les seuls usages du mot « saison » dans `src/` désignent le cap du cycle courant. La contrainte structurante (blocs calendaires fixes plutôt que trimestre glissant) est donc payée sans que le bénéfice qui la justifiait soit servi.

Preuves : `docs/architecture/v1-03-plan-reduction.md:19` ; `src/types/suivi.ts:47` ; `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:172`

**Recommandation.** Quand deux bilans tombent dans la même saison de deux années différentes, l'ajouter comme second point de comparaison sur `/suivi` (« Ton automne, un an après »). Les données existent (`assessments.submitted_at`, `season_bounds()`), c'est une dérivation pure à poser dans `src/types/suivi.ts`. À défaut, écrire noir sur blanc dans v1-03 §2 que cette comparaison reste non construite, sans quoi le choix de cadence n'a plus de justification lisible.

**Contre-vérification.** Le constat surévalue l'urgence, et c'est la principale correction. La comparaison saison-sur-saison demande deux bilans **à un an d'intervalle dans la même saison** ; le produit est en V1 non publiée (dernier increment 07-09/09/2026) et `REBILAN_SUGGESTION_DAYS` vaut 182 jours : aucun utilisateur ne peut aujourd'hui avoir les données qui rendraient la fonctionnalité visible, elle rendrait une chaîne vide pour 100 % de la base. Par ailleurs le coût du choix de cadence est nul (v1-03 l.20-22 dit lui-même que la raison décisive était le « calcul trivial en SQL » face aux dates astronomiques) : la justification ne s'effondre pas si le bénéfice arrive plus tard. La moitié actionnable de la recommandation est donc la seconde : consigner dans v1-03 §2 que la comparaison n'est pas construite, et ouvrir une issue GitHub (le backlog du repo vit là, cf. CLAUDE.md) plutôt que de coder une dérivation qui n'a pas encore de données. Si elle est construite, attention au ton acté sur `/suivi` : une hausse d'un été sur l'autre doit rester un fait (registre `variationNote`), et l'écran n'a aucune mécanique d'échec.


### A11-5 — Le check-in quantitatif (v1-07 §3.6) est resté « à instruire » et n'a été repris par aucun increment

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort grand

v1-07 §3.6 retient la piste — « Combien de fois ? » (0 / 1-2 / 3+) au même coût de geste qu'un oui/non, permettant de recalculer une empreinte vivante entre deux bilans sans GPS ni auto-évaluation floue — et la renvoie « à instruire au moment de l'étape 4 ». L'étape 4 est livrée et dit elle-même que le point « reste à instruire ». Les increments v1-08 à v1-12 ne le mentionnent plus. En base, `engagement_checkins.response` est toujours un booléen et `CheckinCard` n'offre que Oui/Non. Rien ne relie donc les réponses de la boucle à un chiffre : entre deux bilans espacés de six mois, l'empreinte affichée ne bouge jamais.

Preuves : `docs/architecture/v1-07-audit-facteurs-et-suivi.md:380` ; `src/components/checkin-card.tsx:36` ; `src/lib/database.types.ts:402`

**Recommandation.** Reprendre la décision explicitement : soit instruire la piste dans un increment dédié (colonne `response_count` à côté de `response`, la valeur booléenne restant dérivée pour ne rien casser des tests et de l'historique), soit la fermer par écrit dans un document pour qu'elle cesse de figurer comme piste retenue. En l'état c'est le seul mécanisme identifié qui ferait vivre le chiffre entre deux bilans.

**Contre-vérification.** Le constat est exact mais qualifie de défaut ce qui est une piste explicitement différée et tracée — v1-07 le dit deux fois, dont une dans l'increment qui aurait pu la porter. Ce n'est donc pas une décision perdue mais une décision en attente, et la sévérité « important » la met au même rang que des écarts doc↔code non signalés. Deux compléments utiles. (1) La bonne place du suivi est une issue GitHub : CLAUDE.md pose que le backlog non planifié vit là (#27-30) et n'a pas de ROADMAP ; §3.6 n'y figure pas, c'est ce qui la rend invisible. (2) Sur l'implémentation, la voie « `response_count` à côté de `response` » est plus lourde que ce que « effort: grand » laisse voir : le booléen est lu par `analytics.engagement_by_segment`, par le compteur de `/suivi` et par les tests pgTAP, et l'immutabilité après réponse (`20260823100000`) interdit de réécrire une ligne — il faudrait dériver `response` par colonne générée ou trigger pour ne rien casser. Ne pas non plus lui faire porter à lui seul « l'empreinte vivante » : recalculer un total à partir de déclarations 0/1-2/3+ demande un modèle de projection qui n'existe nulle part, et un chiffre affiché sans ce modèle serait pire que pas de chiffre.


### A11-6 — Les équivalences concrètes qui devaient rendre les tonnes saisissables n'ont jamais été construites

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

v1-07 §3.5 relève deux points de ton. Le premier (« Tu es à 150 % de la moyenne française ») a bien été corrigé. Le second — « 2,8 t reste abstrait. Des équivalences concrètes rendent le chiffre saisissable — l'API Impact CO2 expose un endpoint dédié à cet usage » — n'est traité nulle part : aucune occurrence d'équivalence dans les écrans, et le plan d'exécution §4 ne lui donne pas d'étape. Sur un produit dont l'objectif n°1 est la prise de conscience, c'est le levier le moins cher qui reste sur la table.

Preuves : `docs/architecture/v1-07-audit-facteurs-et-suivi.md:612` ; `src/app/(tabs)/suivi/bilan.tsx:370` ; `src/constants/carbon-reference.ts:1`

**Recommandation.** Décider en une ligne : soit ajouter une équivalence unique sous le total de la restitution, sourcée comme le reste dans `carbon-reference.ts` (et non appelée à la volée, pour rester reproductible), soit consigner que la piste est écartée. Attention au ton : une équivalence peut vite devenir un reproche déguisé — la formuler comme un ordre de grandeur, jamais comme une conséquence.

**Contre-vérification.** La recommandation est la bonne, et sa mise en garde sur la reproductibilité rejoint une règle dure du repo : tout repère chiffré affiché vit dans `carbon-reference.ts`, jamais en dur dans un écran, et toute valeur y est soit sourcée soit signalée comme dérivation — une équivalence appelée à la volée sur l'API Impact CO2 violerait les deux. Deux points que le constat ne dit pas. (1) L'unité compte : une équivalence en « allers-retours Paris-Marseille » ou en « km de voiture » se calcule directement à partir des facteurs ACV déjà en base et reste cohérente avec le reste du produit, alors qu'une équivalence hors transport (steaks, smartphones) réintroduit une source concurrente que `carbon-reference.ts` a précisément été écrit pour éliminer. (2) Le placement : la mascotte ne doit jamais apparaître à côté du total ni d'une empreinte lourde, et elle ne prononce jamais un nombre — l'équivalence est donc du texte produit sous le total, pas une réplique de Ramille.


### A11-7 — Les distances et fréquences par défaut du calcul sont toujours des « hypothèses de travail à valider », six increments plus tard

`technique` · sévérité **mineur** · verdict **confirme** · effort moyen

La spec §10 et le handoff (décision ouverte 3) posent explicitement que les distances moyennes de voyage (1500 / 9000 / 800 / 700 km) et les fréquences hebdomadaires équivalentes des loisirs (0,25 / 1 / 3) sont des hypothèses à valider avant mise en production, au même titre que les facteurs d'émission. Les facteurs, eux, ont reçu un audit complet, une source unique, un job de synchronisation et deux tests. Ces sept constantes-là n'ont jamais été instruites : elles restent des `constant numeric` dans la fonction de calcul, et elles multiplient directement le poste voyages, souvent le plus lourd du bilan. Aucun document v1-0N ne referme la question.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:204` ; `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:237` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:199`

**Recommandation.** Traiter ces sept constantes comme les facteurs l'ont été : les sourcer (enquête mobilité des personnes du SDES pour les distances de longue distance, à défaut assumer par écrit qu'elles sont conventionnelles), et le dire à l'écran là où c'est déjà l'usage — le handoff prévoyait déjà la mention monospace des 800/700 km sur l'écran B3.3/B3.4, « le résultat ne doit jamais être une boîte noire ». Vérifier ensuite que la quinzaine d'assertions chiffrées pgTAP est recalculée par requête, pas à la main (piège documenté dans CLAUDE.md).

**Contre-vérification.** Deux nuances que le constat rate. (1) La mention à l'écran demandée par la recommandation existe déjà pour deux des quatre distances : `src/components/bilan/steps/long-trips.tsx` l.80-81 affiche « distances moyennes par défaut · 800 km train, 700 km voiture » en `type="code"`. Ce qui manque, c'est la même transparence côté vols (`flights.tsx` ne dit que « Europe, moins de 3 h », jamais 1500/9000 km) et côté loisirs (`leisure-frequency.tsx` n'affiche aucune équivalence hebdo). (2) Contrairement aux facteurs, ces constantes ne sont pas comparables à une valeur publiée : aucune source ne donne « la distance moyenne d'un vol long-courrier d'un Français » sans hypothèse. Le livrable réaliste est donc une note assumant leur caractère conventionnel (v1-05 §4 ou un §Reste ouvert de v1-07), pas un sourcing. D'où la sévérité ramenée à mineur : l'erreur est de traçabilité, pas de calcul, et le pire cas (un long-courrier réel à 12 000 km compté 9 000) reste dans le bon ordre de grandeur, contrairement aux facteurs d'usage qui se trompaient de 457 %.


### A11-8 — v1-03 décrit un schéma mort sans porter le moindre bandeau de supersession, alors que CLAUDE.md en fait une lecture obligatoire

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

CLAUDE.md désigne les `docs/architecture/v1-0N-*.md` comme « documentation de référence — à lire avant toute modification de schéma ou de flux » et précise qu'il faut « toujours vérifier qu'un document n'a pas été supersédé ». v1-01, v1-02, v1-04 et v1-05 §2 portent tous un bandeau daté qui le dit. v1-03 n'en a aucun, et son §3 décrit `plan_cycles.dominant_trip_id` en clé étrangère vers `assessment_trips` (table supprimée le 24/08 par v1-05) et `action_templates` comme un couple (`transport_mode_category`, `action_text`) — alors que la table porte aujourd'hui `poste`, `segment`, `operation`, `share`, `trips`, `substitute_mode_id`, `requires_tc`, `requires_car`. Son §6 décrit une génération de plan par catégorie de mode qui n'existe plus. C'est le seul document du corpus qui peut induire en erreur sans se signaler.

Preuves : `docs/architecture/v1-03-plan-reduction.md:46` ; `docs/architecture/v1-03-plan-reduction.md:70` ; `src/lib/database.types.ts:15`

**Recommandation.** Poser en tête de v1-03 le même bandeau que v1-01 : dire que §3 (tables) et §5-§6 (cap et génération) sont remplacés par v1-07 §3.3 et les migrations `20260905130000` / `20260905190000`, et que seul §2 (cadence saisonnière) reste en vigueur. Coût : cinq lignes ; le manquer coûte une migration écrite contre un schéma qui n'existe plus.

**Contre-vérification.** Le risque réel est amorti par le fait que CLAUDE.md décrit lui-même le schéma actuel des actions (« `action_templates` porte un `poste`, un `segment`, une `operation` … ») : quelqu'un qui suit la consigne de lecture croise l'incohérence avant d'écrire une migration. Le bandeau reste la bonne correction (cinq lignes), en pointant `v1-07` §3.3 et les migrations `20260905130000` / `20260905190000`, et en signalant aussi que `plan_actions` a gagné les colonnes d'engagement (`commit_plan_action`), point que le constat n'évoque pas.


### A11-11 — Le triage des advisors Supabase (v1-07 §5) liste cinq RPC ouverts à `authenticated` — il y en a sept

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

v1-07 §5 existe pour « ne pas re-trier les mêmes lignes à chaque passage » et affirme que ce qui remonte encore est « connu et voulu ». Sa ligne `authenticated_security_definer_function_executable` nomme cinq fonctions (WARN ×5). Depuis, v1-12 a ajouté `register_push_token` et `unregister_push_token`, tous deux `security definer` et `grant execute … to authenticated` — sans mettre le tableau à jour. Le prochain passage sur les advisors trouvera donc deux signalements non couverts par le triage : soit ils seront « corrigés » par réflexe (ce qui casserait l'enregistrement du jeton, dont tout le canal push dépend), soit ils seront ignorés au motif que la ligne ressemble aux cinq autres — ce qui est précisément la façon dont un vrai signalement passe inaperçu.

Preuves : `docs/architecture/v1-07-audit-facteurs-et-suivi.md:677` ; `supabase/migrations/20260907230000_rappels_canal.sql:124` ; `supabase/tests/database/17_rappels_canal.test.sql:193`

**Recommandation.** Ajouter les deux RPC de jeton à la ligne du tableau (WARN ×7) en rappelant le motif propre à `register_push_token` : il doit pouvoir reprendre un jeton à son propriétaire précédent, ce qu'aucune policy RLS owner-scoped ne peut faire — c'est justement pourquoi il ne peut pas être révoqué. Poser la règle générale : tout nouveau `grant execute … to authenticated` sur une fonction `security definer` ajoute une ligne à ce tableau dans la même PR.

**Contre-vérification.** Le constat rate une seconde péremption du même §5, plus trompeuse encore : la section « Écarté pour cette V1 » y justifie de ne pas activer `auth_leaked_password_protection` au motif que « le produit propose bien une connexion email + mot de passe (v1-04 §2) » — or il n'y a plus de mot de passe du tout (CLAUDE.md, v1-10 §2.D, 07/09/2026) : cet advisor est désormais sans objet, pas « écarté pour raison de plan payant ». À traiter dans la même passe que le WARN ×7. La règle générale proposée (tout nouveau `grant execute … to authenticated` sur une fonction `security definer` ajoute une ligne au tableau dans la même PR) est la bonne, et pourrait même être gardée par un test pgTAP énumérant les fonctions `security definer` exécutables par `authenticated` — même famille que les gardes `emission_factor_sources` et `usage_event_types`.


### A11-12 — La page de confidentialité affirme des garanties de transfert pour Expo que v1-12 demandait de vérifier avant publication

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

v1-12 §6.5 est explicite : « Les garanties de transfert d'Expo (clauses contractuelles) sont **à vérifier avant** de publier la page, pas à affirmer de mémoire. » La page affirme aujourd'hui « Serveurs situés aux États-Unis, sur la base de clauses contractuelles types ». Aucun document ne consigne que la vérification a eu lieu — ni v1-12 §7 (mise en service, qui coche quatre points, aucun juridique), ni §9 (ce qui reste ouvert, déclaré vide). Sur la seule surface publique du produit, avec des URL données à Google Play, une affirmation RGPD non vérifiée est un risque disproportionné par rapport au coût de la vérification.

Preuves : `docs/architecture/v1-12-rappels.md:343` ; `src/app/confidentialite.tsx:165` ; `docs/architecture/v1-12-rappels.md:473`

**Recommandation.** Vérifier le DPA d'Expo et consigner la référence exacte (version, date) dans v1-12 §6.5 ; si la garantie n'est pas confirmée, retirer la clause de la page et s'en tenir au fait (« serveurs situés aux États-Unis »). Faire la même passe sur Resend et Vercel, dont les lignes ne mentionnent aucune localisation.

**Contre-vérification.** Sévérité ramenée à mineur : l'affirmation est très probablement exacte (Expo publie un DPA avec CCT, et Google/Firebase aussi), le risque n'est donc pas une fausse déclaration mais une déclaration non tracée — écart de méthode plutôt que d'exposition. La recommandation est bonne, avec deux précisions : (1) la ligne **Google** de la même liste n'indique ni localisation ni garantie alors que FCM transfère aussi hors UE, c'est l'omission la plus visible, plus que Resend (UE, Berlin) ou Vercel ; (2) le fait le plus simplement vérifiable et suffisant au titre de l'art. 13 est de nommer le mécanisme sans le qualifier (« serveurs aux États-Unis ») si la référence du DPA n'est pas relevée — ne pas laisser une formule juridique plus précise que ce qu'on a lu.


### A11-13 — CLAUDE.md justifie la séparation `src/types` / `src/lib` par un comportement qu'il corrige lui-même 400 lignes plus loin

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

La section Tests explique que la règle « un module testé ne doit pas importer `@/lib/supabase` » tient à ce que « son constructeur lève sans variables d'environnement et fait échouer toute la suite ». Ce n'est plus vrai : `src/lib/supabase.ts` a été converti en mandataire qui ne lève qu'au premier accès, et CLAUDE.md le dit explicitement ailleurs (« ne lève plus au chargement du module mais à la première utilisation »). La règle reste bonne, sa justification est fausse — et une règle dont la raison est vérifiablement périmée est une règle qu'on finit par contourner « puisque ça ne lève plus ».

Preuves : `CLAUDE.md:46` ; `src/lib/supabase.ts:51` ; `CLAUDE.md:621`

**Recommandation.** Réécrire la justification : le mandataire lève sur n'importe quel accès, et le module tire par ailleurs des dépendances React Native (AsyncStorage) qui n'ont rien à faire dans une suite Jest de logique pure. La règle est conservée, sa raison redevient exacte.

**Contre-vérification.** Le constat rate un argument qui rend la règle encore plus solide qu'il ne le dit : le module importe `@react-native-async-storage/async-storage`, `react-native` (Platform) et `react-native-url-polyfill/auto` (l. 1-4) — ce sont ces dépendances, pas l'exception, qui n'ont rien à faire dans une suite Jest de logique pure. Et surtout : le mandataire rend l'échec *plus* discret qu'avant (il ne se déclenche qu'au premier accès, donc potentiellement dans un seul test), ce qui est un argument de conservation de la règle, pas d'assouplissement. Réécrire la raison en ce sens.


### A11-14 — CLAUDE.md annonce « trois points à vérifier sur appareil » dont un est vérifié et un autre porte sur un élément supprimé

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

CLAUDE.md renvoie à v1-11 §8 en disant que trois points restent à vérifier, « dont le retour matériel Android ». Or v1-11 §8 barre justement ce point (« Vérifié le 09/09/2026 : il quitte bien l'app »). Des trois qui restent, un porte sur « la carte de période calme … posée au-dessus du cap » — carte retirée par v1-12 §6.3, dont les répliques `periodeCalme`/`periodeCalmeDetail` n'existent plus dans `mascotte.ts`, remplacées par la carte d'attente. Le lecteur qui suit CLAUDE.md part donc revérifier un point acquis et un élément inexistant.

Preuves : `CLAUDE.md:139` ; `docs/architecture/v1-11-navigation-et-design-system.md:524` ; `src/constants/mascotte.ts:51`

**Recommandation.** Réduire la phrase de CLAUDE.md à ce qui reste réellement : l'annonce TalkBack « Plan, onglet, sélectionné », et le placement de la carte d'attente au-dessus du cap (qui hérite du point de vigilance de la période calme). Garder la mise en garde sur le retour matériel — elle est utile — mais comme décision acquise, pas comme vérification en attente.

**Contre-vérification.** Deux précisions que le constat n'exploite pas. (1) La quatrième puce (« Le lien de connexion par email (`ramille://`) doit rouvrir l'app et aboutir sur le plan ») risque d'être lue comme acquise par confusion avec v1-12 §8.1, qui a vérifié le lien du **rappel**, pas celui de connexion : en réécrivant CLAUDE.md, distinguer explicitement les deux liens. (2) Le point de vigilance de la carte n'est pas caduc, il a changé d'objet : la carte d'attente est rendue par plan.tsx l. 419-428 et porte une phrase de Ramille, donc la règle « jamais la mascotte près d'un chiffre lourd » s'applique toujours au voisinage du cap — c'est une reformulation, pas une suppression de la puce.


### A11-15 — v1-08 §3 se contredit lui-même sur `onboarding_completed_at`, et un commentaire de code répète l'affirmation périmée

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

v1-08 §3 dit que « `profiles.onboarding_completed_at` existe dans le schéma depuis la migration initiale mais n'est écrit par aucun code du produit » ; son propre §5.3 documente la suppression de la colonne le 05/09 par la migration `20260905180000`. La colonne n'existe plus. Le commentaire qui accompagne l'émission de `onboarding_complete` dans le code reprend mot pour mot l'affirmation périmée — quelqu'un qui le lit croira pouvoir se rabattre sur une colonne absente. Même document, §3 annonce par ailleurs « onze événements » alors que le référentiel en compte quinze depuis v1-12.

Preuves : `docs/architecture/v1-08-mesure-usage.md:66` ; `supabase/migrations/20260905180000_supprimer_colonnes_mortes_profiles.sql:40` ; `src/components/onboarding/etape-transition.tsx:58`

**Recommandation.** Corriger le commentaire de `etape-transition.tsx` (la colonne a été supprimée, la fin de l'onboarding ne se lit que dans cet événement) et poser en tête de v1-08 §3 une note disant que la liste des événements a grandi depuis — avec le renvoi vers `src/types/analytics.ts` comme source de vérité, puisque c'est déjà la règle de la double inscription.

**Contre-vérification.** Nuance à porter dans la synthèse : v1-08 n'est pas simplement faux, il est daté par couches — son §5.3 enregistre correctement la suppression, en encadré. Le vrai défaut est le commentaire de code, seul endroit où l'affirmation périmée circule sans son correctif à portée de regard. Suggestion plus économe que celle du constat : dans etape-transition.tsx, remplacer par « la colonne `profiles.onboarding_completed_at` a été supprimée le 05/09/2026 (20260905180000) : la fin de l'onboarding ne se lit que dans cet événement » — l'affirmation devient vraie et porte sa preuve. Et le renvoi à `src/types/analytics.ts` comme source de vérité est déjà la règle de la double inscription (v1-08 l. 57-60), donc la note d'en-tête ne fait qu'appliquer ce qui est écrit.


### A11-16 — Le bandeau de v1-01 déclare valide un §5 qui décrit deux prérequis inexistants (clé API Impact CO2, token EAS en secret CI)

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le bandeau de v1-01 délimite précisément ce qui est obsolète (« §2-3 ») et affirme que « le reste de ce document … reste valide ». Son §5 liste pourtant comme nécessaires une clé API Impact CO2 (« sans clé la réponse API est limitée/dégradée ») et un token EAS déposé en secret GitHub `EXPO_TOKEN` pour lancer les builds en CI. Ni l'un ni l'autre n'existe : `sync_emission_factors()` appelle l'endpoint sans en-tête d'authentification, et v1-07 §1.1 note même que l'API « répond en HTTP 200 sans clé » ; côté build, v1-10 §10.7 a retenu la voie « Build from GitHub » depuis expo.dev, et le seul workflow du dépôt ne référence aucun secret Expo. Un bandeau qui certifie la validité de ce qu'il ne couvre pas est plus trompeur qu'une absence de bandeau.

Preuves : `docs/architecture/v1-01-onboarding-bilan.md:224` ; `supabase/migrations/20260905100000_facteurs_acv_complete.sql:188` ; `.github/workflows/ci.yml:1`

**Recommandation.** Étendre le bandeau de v1-01 au §5 : la clé Impact CO2 s'est révélée inutile (endpoint public, cf. v1-07 §1.1-1.5) et le chemin de build est celui de v1-10 §10. Une ligne suffit — l'intérêt du bandeau est justement qu'on lui fasse confiance sur ce qu'il ne barre pas.

**Contre-vérification.** Le constat sous-estime légèrement un point : le §5 mentionne aussi un « Service account Google Play (upload AAB automatisé via EAS Submit) », que v1-10 §10 remplace de la même façon (publication depuis expo.dev/la console Play, aucun secret dans le dépôt). La note d'extension du bandeau gagne à couvrir la ligne entière du tableau plutôt que les deux prérequis cités. À l'inverse, ne pas retirer le §5 : la mise en garde « ne pas coller le token dans le chat » reste juste, et l'historique de décision est ce que ce document conserve.


### A11-17 — « Une nouvelle saison a commencé » s'affiche sur un compteur de 182 jours, sans rapport avec la saison du cycle

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

v1-11 §3.4 prescrivait la carte d'invitation au re-bilan avec ce titre et le seuil `REBILAN_SUGGESTION_DAYS`. Le code l'a suivi : le titre affirme un fait saisonnier, la condition est « le dernier bilan a plus de 182 jours ». Les deux ne coïncident pas — le plan connaît pourtant sa propre période (`cycle.period_label`, `period_start`) et pourrait dire vrai gratuitement. Sur un produit qui a fait du sourçage de chaque chiffre une doctrine et qui refuse « la boîte noire », une accroche qui affirme quelque chose que la donnée à côté d'elle ne dit pas coûte plus qu'elle ne rapporte. Le corps du texte a par ailleurs remplacé le « Ton bilan date de {n} mois » du plan par un « Ton bilan date d'un moment » qui perd l'information la plus utile.

Preuves : `src/app/(tabs)/plan.tsx:339` ; `src/app/(tabs)/plan.tsx:523` ; `docs/architecture/v1-11-navigation-et-design-system.md:386`

**Recommandation.** Soit accrocher la carte à la vraie saison du cycle (`period_label` de `plan_cycles`, dont le libellé existe déjà), soit changer le titre pour ce que la condition dit réellement (« Ton bilan a six mois »). Et remettre la durée dans le corps : c'est elle qui donne envie de refaire le bilan, pas « un moment ».

**Contre-vérification.** Deux choses que le constat rate. (1) Le titre n'est pas seulement approximatif, il peut être faux en présence de la donnée contraire à l'écran : la même page affiche « Cadence : {period_label} », donc une carte annonçant une saison nouvelle peut coexister avec le libellé de la saison en cours. (2) Le plus simple et le plus cohérent est d'aligner le plan sur le suivi (même seuil, même phrase « Ton dernier bilan a {n} mois »), plutôt que d'introduire une dépendance à `period_start` : CLAUDE.md et le code posent déjà « même règle, deux endroits où la rencontrer » (plan.tsx l. 335-338), et deux formulations divergentes pour une seule règle est précisément ce que cette note voulait éviter.


### A11-18 — L'inventaire des tests de CLAUDE.md et du README nomme 2 fichiers Jest sur 15 et 3 fonctions pgTAP sur 18 fichiers

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

CLAUDE.md décrit la suite Jest comme portant « aujourd'hui `src/types/bilan.ts` … et `src/types/suivi.ts` », et le README résume les tests SQL à « compute_assessment_results, generate_plan_cycle_for_user, bornes de période ». La réalité : 15 fichiers `*.test.ts` (dont `carbon-reference`, `mascotte`, `palier`, `rappels`, `connexion`, `compte-suppression`, `configuration`, `page-titles`, `analytics`) et 18 fichiers pgTAP couvrant RLS, feedback, mesure d'usage, canal de rappel, suppression/export, purge d'inactivité. L'effet est concret : plusieurs de ces tests existent précisément pour épingler des décisions contre une « correction » par réflexe (ordre des motorisations, source ACV, invariant SDES, table de vérité des rappels) — les taire dans le document d'orientation, c'est retirer leur rôle de garde-fou à la personne qui viendrait justement les casser.

Preuves : `CLAUDE.md:44` ; `README.md:28` ; `src/types/rappels.test.ts:1`

**Recommandation.** Remplacer l'énumération par la règle (« toute dérivation pure affichée à l'utilisateur ou décidant d'une navigation est testée, colocalisée en `*.test.ts` ») et par le renvoi au répertoire, en citant nommément les seuls tests qui existent pour empêcher une régression de jugement — ordre ACV des motorisations, source des facteurs, invariant SDES, table de vérité `reminder_channel_for`. Même correction dans le README.

**Contre-vérification.** Le constat force un peu le trait sur deux points, à corriger dans la synthèse. (1) La description pgTAP de CLAUDE.md ne se limite pas à trois fonctions : elle mentionne aussi « les policies RLS (isolation stricte …, verrouillage des tables à écriture serveur-only, lecture publique des référentiels) ». C'est le README qui est le plus pauvre. (2) Les tests-garde-fous ne sont pas tus : CLAUDE.md les nomme là où chaque décision est décrite (« un test pgTAP épingle ce classement », « deux tests pgTAP épinglent la source », « épinglée des deux côtés (17_rappels_canal.test.sql, rappels.test.ts) », l'invariant SDES). Le défaut réel est donc l'inventaire périmé de la section Tests, pas une perte du rôle de garde-fou. La recommandation (remplacer l'énumération par la règle + renvoi au répertoire) reste la bonne, et elle a l'avantage de ne plus se périmer au fichier suivant.


### A11-19 — L'ordre de priorité produit de CLAUDE.md annonce trois briques, en liste quatre, et omet la brique 5

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

CLAUDE.md ouvre sur « Trois briques dans l'ordre de priorité produit » puis en énumère quatre. Surtout, la brique 5 (Connexion / Authentification) disparaît de l'ordre, alors que la spec §11 la place en troisième position (2 > 1 > 5 > 4 > 3) et que le placement de la connexion est décrit comme « validé, non négociable » par le handoff. C'est aussi la brique sur laquelle deux increments entiers ont été dépensés (v1-04, v1-10) : son absence de la ligne d'orientation rend illisible pourquoi.

Preuves : `CLAUDE.md:24` ; `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:247` ; `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:45`

**Recommandation.** Reprendre l'ordre complet de la spec §11 (cinq briques) en une ligne, avec le niveau de soin associé de la spec §3 — c'est ce qui explique pourquoi l'onboarding et le bilan ont droit à la copy soignée et le plan à du fonctionnel simple.

**Contre-vérification.** Deux nuances que le constat rate. (1) Il qualifie le placement de la connexion de « validé, non négociable » par le handoff, ce que la spec ne dit pas en ces termes — §11 parle de « Priorité suggérée » et §3 d'un niveau d'effort ; par ailleurs CLAUDE.md documente déjà un écart assumé sur ce point (§1 de v1-04, le modèle de session anonyme dès l'ouverture, différent de ce que suppose le handoff), donc recopier l'ordre de la spec ne doit pas se lire comme un retour au découpage du handoff. (2) L'ordre de priorité est aujourd'hui largement historique : les cinq briques sont livrées (v1-01 à v1-12), la feuille de route courante étant v1-07 §4. La correction la plus utile est donc minimale — écrire « Cinq briques » et rétablir l'ordre complet 2 > 1 > 5 > 4 > 3 en renvoyant à la spec §3 pour le niveau de soin — plutôt que d'ajouter un paragraphe d'orientation qui ferait doublon avec la feuille de route.


## A12 — audit du ton — chaque texte vu par la personne

**Résumé du lecteur.** Le ton de Ramille est, dans l'ensemble, remarquablement tenu : la voix de la mascotte est centralisée et testée (jamais de chiffre, jamais d'injonction), les états « rien à proposer » sont des félicitations et non des listes vides, les profils contraints sont nommés sans être jugés, et la restitution a déjà remplacé le score comparatif par une marche atteignable. Les défauts que je relève ne sont presque jamais des phrases méchantes : ce sont des phrases fabriquées par la machine et jamais relues (le libellé de poste brut « Trajet domicile-travail (Voiture thermique) » s'insère tel quel dans la question hebdomadaire, dans l'email, dans la notification et dans le cap du plan), des moments de renforcement ratés (une empreinte qui baisse ne reçoit qu'un constat sec, alors qu'une hausse reçoit une phrase d'adoucissement), et des textes qui ont vieilli sans qu'on les rouvre (la page publique de suppression envoie vers un écran qui n'existe plus, la politique de confidentialité décrit une purge qui a changé de règle). Trois textes accordent au masculin la personne à qui ils parlent. Enfin, deux gestes centraux — répondre à un point de suivi, choisir son canal de rappel — échouent en silence : rien ne s'affiche, l'état revient en arrière. Le ton est bon ; c'est sa mise en œuvre automatique et son entretien qui décrochent.

**Points forts à ne pas casser**

- `src/constants/mascotte.ts` — la voix entière en un seul endroit, avec ses trois règles gardées par un test (première personne, jamais un nombre, jamais « tu devrais »). `checkinNon` (l.44) est le modèle du genre : « Pas cette fois-ci. Rien d'obligatoire, on se repose la question au prochain point. » — un non accueilli, pas une déception.
- `palierNote` et `comparisonNote` (`src/app/(tabs)/suivi/bilan.tsx` l.100-141) : l'écart est nommé sans verdict, et le profil déjà sobre bascule dans un registre de contribution (« Ce que tu n'émets pas laisse de la marge ailleurs ») au lieu d'être poussé à en faire plus. À ne surtout pas « simplifier ».
- `src/components/onboarding/etape-reassurance.tsx` l.566-568 : « Vivre en zone rurale, travailler loin, avoir besoin de sa voiture : ce sont des contraintes, pas des fautes. » C'est la phrase-mère du produit, et tout le reste devrait s'y aligner.
- `src/components/bilan/steps/commute-has-trip.tsx` l.46-49 : « Télétravail total, sans emploi, retraité ou autre situation : réponds Non, on passe directement à la suite. » Une aide qui nomme les situations au lieu de les laisser hors-champ.
- Les deux états « rien à proposer » sont des félicitations et non des vides : `src/app/(tabs)/plan.tsx` l.496-502 (« Tu fais déjà l'essentiel sur ce poste. ») et `src/app/(tabs)/suivi/bilan.tsx` l.345-348 (« C'est rare, et c'est une bonne nouvelle. »).
- `src/components/compte/mon-compte.tsx` l.21-24 et son écran : aucune tentative de retenir la personne, aucun « es-tu sûr de perdre tes 3 bilans ? ». Un produit qui laisse partir proprement gagne la confiance qu'il demande ailleurs.
- `src/app/connexion/retrouver.tsx` l.158-164 : le produit explique *pourquoi* il ne dit pas si l'adresse a un compte, au lieu de laisser croire à une panne. Rare, et exemplaire.
- `src/components/bilan/step-shell.tsx` l.70-73 : « Il manque encore la distance. » — un bouton inactif qui dit calmement ce qui manque, sans `role="alert"`, sans registre d'erreur.
- `src/types/rappels.ts` l.101-107 et `carteAttente` : l'absence de rappel n'est jamais une punition — « On se retrouve ici lundi. » L'app porte le rendez-vous quand aucun canal ne le porte.
- Le garde-fou de volume du canal de retour (`supabase/migrations/20260905150000_feedback.sql` l.80) : « Tu as déjà envoyé plusieurs retours aujourd'hui. Reviens demain, on les lit tous. » Une limite technique dite avec chaleur et sans reproche.

### A12-1 — Le libellé de poste brut de la base s'insère tel quel dans la phrase la plus répétée du produit

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

`assessment_results.dominant_poste_label` est construit en SQL sous la forme « Trajet domicile-travail (Voiture thermique) » (migration 20260905130000 l.296, l.393-397), puis recopié dans `plan_cycles.trip_label` et `engagement_checkins.trip_label`. Ce libellé — majuscule initiale, parenthèse technique — est ensuite collé dans des phrases : la question hebdomadaire de la carte de check-in, le corps de l'email de rappel, le titre de la notification Android, le sous-titre du plan et la ligne du cap. On lit donc « As-tu changé de mode de transport au moins une fois cette semaine pour Trajet domicile-travail (Voiture thermique) ? » et « soit − 20 % de trajet domicile-travail (voiture thermique) ». C'est la phrase que la personne verra le plus souvent dans toute sa vie avec le produit — chaque lundi, chaque mois — et elle ne se lit pas comme du français : elle se lit comme une base de données qui parle. Sur un produit dont tout le reste de la voix est soigné, c'est l'endroit où l'illusion d'un accompagnement personnel se casse.

Preuves : `src/components/checkin-card.tsx:55` ; `supabase/migrations/20260907230000_rappels_canal.sql:231` ; `src/app/(tabs)/plan.tsx:448` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:296`

**Recommandation.** Séparer deux formes du libellé, comme `dominantHeadline` / `dominantShareLabel` le font déjà pour la restitution : garder le libellé actuel pour l'affichage en tête de carte, et ajouter une forme *insérable* sans parenthèse ni majuscule (« ton trajet domicile-travail », « tes loisirs du week-end », « tes voyages longue distance »), dérivée de `dominant_poste` et non du label composé. La question devient « As-tu changé de mode au moins une fois cette semaine pour ton trajet domicile-travail ? », et le cap « soit − 20 % de ton trajet domicile-travail ». La forme insérable doit vivre au même endroit côté SQL (pour l'email et le push) et côté client — même paire que `reminder_channel_for()` / `src/types/rappels.ts`.

**Contre-vérification.** Le constat sous-estime la surface : les deux `accessibilityHint` de checkin-card.tsx l.68/75 lisent le même libellé brut à voix haute, et le `.toLowerCase()` de plan.tsx l.448 ne supprime que la majuscule, pas la parenthèse ni l'absence de déterminant. Deux précisions pour la recommandation : (1) la forme insérable ne peut pas être dérivée du seul `dominant_poste`, il faut aussi `loop_type` côté check-in (`commute` vs `extras`, où `extras` peut être loisirs ou voyages) — la dériver de `poste` + `loop_type` et non du label composé ; (2) le mieux est de figer la forme insérable en colonne snapshotée à côté de `trip_label` (même raison que le snapshot existant : ne pas réécrire rétroactivement le wording d'un check-in déjà généré, cf. CLAUDE.md), ce qui évite d'avoir à recomposer la phrase côté SQL au moment de l'envoi et garde le client et l'email sur la même chaîne.


### A12-2 — Une empreinte qui baisse n'est jamais félicitée, alors qu'une hausse est consolée

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

`variationNote` est la seule phrase du produit qui commente l'écart entre deux bilans. La hausse reçoit une phrase d'adoucissement explicite (« Une année n'est pas l'autre. »), ce qui est excellent. La baisse — le seul moment où le produit peut constater que le changement d'habitude a réellement eu lieu, après des mois d'effort — reçoit un constat sec : « 12 % de moins que ton bilan précédent. » Rien d'autre : pas un mot de Ramille, pas de mascotte, pas de mise en perspective. L'asymétrie est à l'envers de l'objectif : on prend soin de celle qui a régressé et on reste muet devant celle qui a réussi. C'est le renforcement le plus important du produit, et il est vide.

Preuves : `src/types/suivi.ts:53` ; `src/types/suivi.ts:54` ; `src/app/(tabs)/suivi/index.tsx:214`

**Recommandation.** Ajouter une seconde phrase à la branche de baisse, sur le même registre que celle de la hausse mais orientée reconnaissance : « X % de moins que ton bilan précédent. Ce que tu as changé se voit ici. » Et, puisqu'il n'y a aucun chiffre dans sa bouche, faire dire à Ramille une ligne dédiée (nouvelle entrée de `RAMILLE`, ex. `baisseConstatee: 'Je vois la différence. Tu l’as tenue.'`) affichée à côté de la carte d'historique — jamais collée au total, pour respecter la règle « jamais près d'un chiffre lourd ». C'est deux lignes de code pour le seul moment de fierté que le produit peut offrir.

**Contre-vérification.** Deux pièges dans la formulation proposée. (1) La réplique suggérée « Je vois la différence. Tu l’as tenue. » genre la personne au féminin — exactement le défaut A12-4 ; il faut une forme sans accord de participe (ex. « Je vois la différence. »). (2) La règle « jamais un nombre dans sa bouche » est bien respectée par la proposition, mais la contrainte voisine est plus serrée : la mascotte ne doit pas apparaître à côté d'un chiffre lourd, et la carte d'historique de suivi/index.tsx affiche justement les totaux en tonnes — donc la placer sous la carte, pas dedans. Ajouter aussi l'entrée à `src/constants/mascotte.ts` implique de passer le test `mascotte.test.ts` (pas de nombre, tutoiement, pas de « tu devrais »/« il faut »).


### A12-3 — La restitution d'un re-bilan est identique à celle du premier : elle ignore que la personne revient

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

`/suivi/bilan` affiche exactement le même écran qu'il s'agisse du premier bilan ou du cinquième : poste dominant, répartition, total, « Où tu te situes » (Toi / palier / moyenne / repère). Aucune de ces barres n'est le bilan précédent de la personne, et aucune phrase ne mentionne qu'un bilan antérieur existe. Or c'est le seul écran qu'on atteint en sortant du questionnaire, donc le moment exact où quelqu'un qui vient de refaire son bilan après six mois cherche la réponse à sa question — « est-ce que ça a bougé ? ». Il faut aller sur l'onglet Suivi pour l'apprendre. Le produit refuse la comparaison entre utilisateurs, ce qui est juste ; mais il se prive ici de la seule comparaison qu'il revendique, soi contre soi.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:385` ; `src/app/(tabs)/suivi/bilan.tsx:420` ; `src/app/(tabs)/suivi/index.tsx:212`

**Recommandation.** Quand un bilan précédent existe, ajouter dans la carte « Où tu te situes » une barre « Ton bilan précédent » (au-dessus de « Moyenne en France »), et la phrase de `variationNote` juste sous les barres. Les données sont déjà chargées ailleurs (`loadAssessmentHistory`), le composant `CompareRow` existe, et cela ne réintroduit aucune comparaison entre utilisateurs. À réserver au mode `nouveau` et à la relecture d'un bilan qui a un prédécesseur.

**Contre-vérification.** Un point que le constat ne traite pas : `barPercent` échelonne les barres sur un maximum implicite, et un bilan précédent nettement plus élevé peut écraser l'échelle ou sortir de la borne — à vérifier avant d'ajouter la barre. Attention aussi à `keepLatestPerDay` (src/types/suivi.ts l.31) : le « bilan précédent » d'un re-bilan fait le même jour est le même point après dédoublonnage, et la barre disparaîtrait ou se comparerait à elle-même ; il faut choisir le prédécesseur par `submitted_at` strictement antérieur au bilan affiché, et non le dernier de l'historique (qui, en mode `relecture` d'un ancien bilan, serait postérieur). Enfin la phrase de hausse « Une année n’est pas l’autre. » a été écrite pour l'écran de suivi ; la réutiliser telle quelle juste sous le total de la restitution est plus exposé — vérifier qu'elle ne se lit pas comme une excuse fournie d'avance.


### A12-4 — Trois textes accordent au masculin la personne à qui ils parlent

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Le produit tutoie tout le monde, dans une langue par ailleurs très surveillée, mais trois phrases visibles supposent un lecteur masculin : l'étiquette de l'action engagée (« TU T'Y ES ENGAGÉ »), l'adieu de Ramille après une suppression de compte (« Merci d'être passé. ») et la carte d'aide de l'écran « Retrouver mon compte » (« Tu t'es connecté avec Google ? »). L'étiquette est la plus visible des trois : elle est en capitales, en gras accentué, sur la carte que le plan met en tête, et c'est donc la marque de reconnaissance principale du produit. Pour la moitié des utilisatrices, la phrase censée dire « bravo, tu t'y es tenue » parle à quelqu'un d'autre.

Preuves : `src/components/plan/action-card.tsx:173` ; `src/constants/mascotte.ts:77` ; `src/app/connexion/retrouver.tsx:216`

**Recommandation.** Reformuler sans accord de participe plutôt que doubler les formes : « TON ENGAGEMENT » ou « C'EST TON CHOIX » pour l'étiquette ; « Merci d'être venu jusqu'ici. » → mieux, « Merci du temps passé ici. Si tu reviens, on repart de zéro, tranquillement. » ; « Ton compte est un compte Google ? ». Ajouter la règle au commentaire d'en-tête de `src/constants/mascotte.ts` (quatrième règle : jamais d'accord qui genre la personne) et l'épingler par un test simple sur les participes fréquents, comme les trois autres règles.

**Contre-vérification.** Le constat en rate un quatrième, dans un écran juridiquement sensible : src/app/compte/suppression.tsx l.168 « Tu es connecté à ton compte. » — même défaut, sur la page publique exigée par Google Play. Deux réserves sur la recommandation : (1) l'`accessibilityLabel` de la même carte (action-card.tsx l.48, « Action engagée : … ») est correct puisque l'accord porte sur « action » — ne pas le « corriger » en même temps ; (2) le test proposé sur « les participes fréquents » attraperait justement ce label légitime et les commentaires de code ; il vaut mieux le restreindre aux chaînes affichées et au motif « tu/t' + es/étais + participe en -é », qui est le seul cas fautif observé. « TON ENGAGEMENT » perd la deuxième personne qui fait la voix du produit ; « C’EST TON CHOIX » la garde et reste neutre.


### A12-5 — « Garder une journée de télétravail par semaine » présuppose un télétravail que rien ne vérifie

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

Ce gabarit d'action est proposé à toute personne ayant au moins deux jours de trajet par semaine : `estimate_action_savings` ne filtre que sur `commute_days_per_week >= 2`, jamais sur une capacité à télétravailler (le questionnaire ne la demande d'ailleurs pas). Le verbe « Garder » présuppose en plus qu'une journée existe déjà. Résultat : une aide-soignante, une caissière, un ouvrier, un chauffeur — exactement les profils que la spec §2 demande de ne pas traiter en mauvais élèves — se voient proposer, en tête de plan et chiffrée à N kg, une action qu'ils ne peuvent pas faire, formulée comme s'ils avaient laissé filer quelque chose. Le filtre B4 a été construit précisément pour ne pas proposer l'impossible (pas de transports en commun là où il n'y en a pas) ; ce gabarit passe à travers.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:146` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:553` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:519`

**Recommandation.** Deux corrections indépendantes. (1) Le libellé, tout de suite : « Travailler depuis chez toi un jour par semaine » ne présuppose rien et ne reproche rien. (2) Le filtre, ensuite : ajouter au gabarit un drapeau `requires_teletravail` et une question B4 supplémentaire (« Peux-tu travailler depuis chez toi ? Oui / Parfois / Non »), sur le même modèle que `requires_tc`. Sans la question, le libellé neutre reste très préférable au libellé actuel.

**Contre-vérification.** Deux nuances utiles. (1) Le libellé proposé (« Travailler depuis chez toi un jour par semaine ») ne suffit pas seul : le gain est calculé comme `(1 / commute_days_per_week) * commute_main_leg_co2_kg_year` (l.556), donc l'action reste chiffrée et classée haut pour un profil qui ne peut pas la faire — et comme aucune action sous 5 kg/an n'est proposée, elle sera souvent en tête chez les gros rouleurs, précisément les profils sans alternative. Corriger le libellé baisse le reproche, pas l'impossibilité. (2) Ajouter une question B4 a un coût documenté (CLAUDE.md : « la profondeur coûte plus cher en abandon qu'une puce de plus ») et invalide en cascade les valeurs attendues de la suite pgTAP touchant `estimate_action_savings` ; une alternative moins coûteuse est de ne pas en faire un filtre dur mais de formuler l'action conditionnellement (« Si tu peux travailler depuis chez toi, un jour par semaine suffit à … »), ce qui évite le reproche sans nouvelle question ni nouveau drapeau.


### A12-6 — Deux gestes centraux échouent en silence : répondre à un point de suivi, choisir son canal de rappel

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

Le check-in est le geste que toute la boucle d'engagement existe pour provoquer. S'il échoue (réseau coupé, session expirée), `answer()` ne fait rien du tout : pas de message, pas de nouvelle tentative, la carte reste sur sa question comme si le doigt n'avait pas touché l'écran. Même chose sur « Toi » : le choix du canal est appliqué de façon optimiste puis, en cas d'échec d'écriture, la ligne revient silencieusement à sa position précédente — la personne croit avoir choisi l'email et n'a rien choisi, ce qui la rendra injoignable sans qu'elle le sache. Le produit a pourtant `MessageInline`, construit exactement pour ça et déjà utilisé sur cinq écrans.

Preuves : `src/components/checkin-card.tsx:44` ; `src/app/compte/index.tsx:54` ; `src/components/plan/feuille-rappels.tsx:70`

**Recommandation.** Réutiliser le texte déjà écrit dans la feuille des rappels, qui est le bon : sur la carte de check-in, en cas d'erreur, afficher un `MessageInline` « Ta réponse n'est pas partie. Vérifie ta connexion et réessaie. » et laisser les deux boutons actifs ; sur « Toi », le même composant sous la liste des canaux, avec « Ton choix n'a pas été enregistré. Vérifie ta connexion et réessaie. » Aucun nouveau motif à inventer.

**Contre-vérification.** Le constat rate deux conséquences côté serveur, qui renforcent le cas du check-in. (1) L'`update` passe par la RLS : une session expirée ou un check-in déjà clos en `expired` par le serveur ne renvoie pas forcément d'`error`, il peut renvoyer 0 ligne modifiée — la carte afficherait alors le renforcement de Ramille alors que rien n'a été enregistré. Demander le compte de lignes (`.select()` ou `count`) et traiter « 0 ligne » comme un échec est aussi nécessaire que le message d'erreur. (2) Sur « Toi », l'échec silencieux n'est pas seulement un choix perdu : la préférence ne se dégrade jamais d'elle-même côté serveur (CLAUDE.md, `reminder_channel_for`), donc quelqu'un qui croit avoir basculé sur `email` restera sur `push` sans jeton actif — le repli SQL le sauve pour l'envoi, mais l'inverse (passage voulu à `none` non enregistré) laisse partir des rappels qu'on a explicitement refusés. Le message inline est donc le minimum ; la ligne doit aussi rester visuellement dans son ancien état sans clignotement.


### A12-7 — La carte de partage met une mascotte souriante juste au-dessus du total, ce que le produit s'interdit partout ailleurs

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

La règle est explicite dans CLAUDE.md et respectée avec soin dans toute l'app — la bande haute porte le nom et pas le visage pour cette raison précise, la feuille des rappels existe en partie pour cette raison. La carte partagée fait exactement l'inverse : `mascot()` (une feuille au sourire figé) est le premier élément rendu, immédiatement suivi du total en 104 px. La personne qui partage voit d'abord cette image dans sa propre app de messagerie, et ses destinataires la voient sans aucun des textes de contextualisation de la restitution. Un visage souriant collé à « 8,4 t CO₂e / an » commente — et selon le chiffre, le commentaire bascule d'encouragement en moquerie sans que personne ne l'ait décidé.

Preuves : `api/share-card.ts:146` ; `api/share-card.ts:153` ; `api/share-card.ts:99`

**Recommandation.** Retirer le visage de la carte : garder la silhouette de feuille seule (le premier `path`, sans yeux, joues ni bouche), comme le composant `Mascot` le fait déjà sous `MASCOT_MIN_FACE_SIZE`. La carte garde son identité visuelle et cesse de commenter un chiffre. Alternative si la marque doit rester lisible : remplacer la mascotte par le mot « Ramille », exactement comme `BandeHaute` l'a tranché.

**Contre-vérification.** Le constat rate un second défaut au même endroit : ce visage est un SVG figé, dupliqué hors du bundle, alors que la géométrie du composant est désormais *calculée* (src/types/mascot.ts, mascotFaceGeometry) — les coordonnées de la carte (yeux 39/61, r 4.2) diffèrent déjà de celles du canvas v1-11 (37.8/62.2, r 6.2). Retirer le visage règle donc aussi la dérive : ne garder que le premier `path` (silhouette) + la nervure, exactement le repli que le composant applique sous MASCOT_MIN_FACE_SIZE. Le mot « Ramille » figure déjà en pied de carte (l.169 « Ramille · fais ton bilan en 5 minutes »), donc l'identité ne se perd pas si le visage part.


### A12-8 — La page publique de suppression de compte envoie vers un écran qui n'existe plus

`technique` · sévérité **important** · verdict **confirme** · effort petit

Cette page est exigée par Google Play et s'adresse à quelqu'un qui n'a peut-être plus l'application. Quand elle ne reconnaît pas le navigateur, elle propose un raccourci : « Si tu as encore l'application, c'est plus direct : écran "Mon suivi", section "Mes données". » Or depuis v1-11 §2.5, la section « Mes données » a quitté `/suivi` pour l'écran « Toi » (`src/app/compte/index.tsx`), atteignable par l'icône de la bande haute. Quelqu'un qui suit l'instruction ouvre l'onglet Suivi, n'y trouve rien, et conclut que le produit ne permet pas de supprimer son compte — sur la page même dont c'est l'objet. À noter que l'email de rappel, lui, a été mis à jour (« désactive-les depuis "Toi" dans l'app »).

Preuves : `src/app/compte/suppression.tsx:147` ; `src/app/compte/index.tsx:24` ; `supabase/migrations/20260907230000_rappels_canal.sql:219`

**Recommandation.** Remplacer par : « Si tu as encore l'application, c'est plus direct : touche l'icône de compte en haut à droite, écran "Toi", section "Mes données". » Et profiter du passage pour vérifier les autres renvois nommant un écran — ce sont les textes qui vieillissent le plus vite et que personne ne relit.

**Contre-vérification.** Il y a un quatrième emplacement périmé que le constat ne cite pas, sur la même page publique exigée par Google Play : src/app/confidentialite.tsx l.237 (« depuis l'écran « Mon suivi », section « Mes données » : télécharger l'intégralité… ») — c'est l'exercice des droits RGPD d'accès/portabilité qui pointe au mauvais endroit. Les deux doivent être corrigés ensemble.


### A12-9 — La politique de confidentialité annonce une purge « 90 jours après création » alors que la règle est l'inactivité

`technique` · sévérité **important** · verdict **confirme** · effort petit

Deux passages de la page annoncent qu'une session anonyme est supprimée automatiquement 90 jours après sa création. La migration du 07/09/2026 a précisément corrigé ce défaut dans le code : la purge se fait sur 90 jours **d'inactivité** (aucun événement d'usage), et son en-tête documente que l'ancienne règle supprimait comme un abandon des comptes parfaitement actifs. Le texte affiché est donc resté sur la version fautive. C'est une mention RGPD art. 13 (durée de conservation) inexacte, sur une page dont l'URL est fournie à Google Play — et, côté ton, c'est aussi une échéance anxiogène annoncée à quelqu'un qui, en réalité, ne perdra rien tant qu'il utilise l'app. Les conditions d'utilisation portent la même formulation.

Preuves : `src/app/confidentialite.tsx:196` ; `src/app/confidentialite.tsx:141` ; `supabase/migrations/20260907093000_purge_anonyme_sur_inactivite.sql:1`

**Recommandation.** Corriger les trois emplacements (`confidentialite.tsx` l.141 et l.196, `conditions.tsx` l.79) : « Session anonyme jamais rattachée à un compte : supprimée automatiquement après 90 jours sans utilisation de l'application. Tant que tu reviens, rien n'est effacé. » La seconde phrase n'est pas cosmétique — c'est elle qui transforme une échéance en filet.

**Contre-vérification.** Deux précisions utiles pour la rédaction : la fenêtre part du plus récent de quatre signaux et non de la seule ouverture de l'app, et la purge est un cron quotidien — « après 90 jours sans utilisation » est donc exact et plus favorable que la lettre du code (une réponse à un point de suivi suffit à repousser l'échéance). Corriger aussi le commentaire d'en-tête de confidentialite.tsx l.14 (« purge à 90 jours »), qui est la carte de correspondance texte/mécanisme que le prochain lecteur consultera.


### A12-10 — La question du point de suivi ne mentionne jamais l'action ni l'intention sur laquelle la personne s'est engagée

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort grand

L'engagement est le moment fort du plan : on choisit une action précise et on dit quand on la fera (« le mardi et le jeudi »), et le produit insiste à juste titre sur le fait que c'est le *quand* qui fait le levier. Une semaine plus tard, la question posée est entièrement générique : « As-tu changé de mode de transport au moins une fois cette semaine pour [poste] ? » Elle ne nomme ni l'action (« Faire un trajet sur cinq à vélo »), ni les jours choisis, ni le fait qu'un engagement existe. La boucle se referme donc sur autre chose que ce qu'elle avait ouvert, et la réponse « Oui » ne dit pas si la personne a tenu son intention ou fait tout autre chose. Le même texte générique part par email et par notification.

Preuves : `src/components/checkin-card.tsx:55` ; `src/components/plan/action-card.tsx:186` ; `src/types/plan.ts:41`

**Recommandation.** Quand un engagement existe pour le cycle en cours, snapshotter son libellé et son intention sur le check-in au moment de la génération (même mécanique que `trip_label`, déjà figé pour ne pas changer rétroactivement), et poser la question ainsi : « Tu t'étais donné le mardi et le jeudi pour faire un trajet sur cinq à vélo. Ça s'est fait au moins une fois cette semaine ? » Sans engagement, garder la question générique actuelle. Attention : la réponse doit rester binaire et sans notion de série, et Ramille ne doit toujours pas porter de chiffre — l'intention est du texte, pas un compte.

**Contre-vérification.** À l'écran, le contexte n'est pas absent : sur /plan la carte de point est rendue juste au-dessus des cartes d'action, et l'intention engagée est affichée sur celle-ci (src/app/(tabs)/plan.tsx l.395-405 puis l.465). Le manque réel est donc limité au rappel sorti de l'app (email/notification) et à la sémantique de la réponse. Si le chantier est ouvert, il doit l'être comme écart assumé dans un v1-1N, et avec la vigilance inverse de celle du constat : nommer les jours choisis fait glisser la question de « as-tu changé quelque chose ? » vers « as-tu tenu ta promesse ? », registre de contrôle que /suivi refuse explicitement (aucune mécanique d'échec). Une variante plus sûre : garder la question telle quelle et rappeler l'intention en sous-titre factuel (« Tu t'étais donné le mardi et le jeudi »), sans la mettre dans la bouche de Ramille.


### A12-11 — « Rien à alléger sur … » accueille par un registre de manque la personne que le produit félicite trois cartes plus bas

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Quand aucune action n'atteint le seuil de 5 kg, le sous-titre du plan annonce « Rien à alléger sur Trajet domicile-travail (Voiture thermique). » — première phrase lue sous le titre « Ton plan ». Plus bas, la carte dédiée dit exactement le contraire et le dit bien : « Tu fais déjà l'essentiel sur ce poste. » L'ordre de lecture donne donc d'abord le vide, puis la félicitation. C'est le même défaut, dans le même registre, que « Rien à rattraper. » retiré le 07/09/2026 après un retour d'usage : une phrase qui voulait dire « c'est bon » et qui se lit « il n'y a rien ».

Preuves : `src/app/(tabs)/plan.tsx:381` ; `src/app/(tabs)/plan.tsx:496` ; `src/constants/mascotte.ts:24`

**Recommandation.** Remplacer par une phrase qui dit le fait sans le manque : « Ton poste principal reste ton trajet domicile-travail. » ou, plus simplement, ne rien afficher à cet endroit quand `actionsCount === 0` — la carte de félicitation dit déjà tout, et le silence vaut mieux qu'une privation annoncée.

**Contre-vérification.** Deux nuances que le constat n'exploite pas. D'abord la phrase est du produit, pas de Ramille : elle ne tombe donc pas sous la règle des répliques, ce qui la rend modifiable sans toucher au registre de la mascotte. Ensuite le cas actionsCount === 0 est le profil le plus sobre du produit ; supprimer le sous-titre laisserait la place à la chip « Cadence », ce qui suffit — c'est l'option la plus sûre, la reformulation proposée (« Ton poste principal reste… ») redisant une information que la carte du cap juste en dessous porte déjà.


### A12-12 — L'historique des points de suivi affiche une colonne « Oui / Non » qui se lit comme un bulletin

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

L'écran de suivi refuse toute mécanique d'échec, et le commentaire au-dessus de la liste l'affirme (« Ce que la personne a fait, jamais ce qu'elle a manqué »). Mais chaque ligne affiche « Oui » ou « Non », en gras, à droite — la forme même d'un relevé de notes, conservé et relu chaque fois qu'on ouvre l'onglet. Un « Non » est pourtant une réponse parfaitement légitime, que Ramille accueille au moment où elle est donnée par « Pas cette fois-ci. Rien d'obligatoire ». Reproduite en colonne, elle devient une trace de manquement — exactement ce que l'écran dit ne pas faire.

Preuves : `src/app/(tabs)/suivi/index.tsx:268` ; `src/app/(tabs)/suivi/index.tsx:244` ; `src/constants/mascotte.ts:44`

**Recommandation.** Reprendre les mots que Ramille emploie déjà au moment de la réponse : « Changement fait » / « Pas cette fois ». Le second reste factuel, ne se lit pas comme une note, et rime avec ce que la personne a lu le jour où elle a répondu.

**Contre-vérification.** Le code atténue déjà un peu le « Non » (themeColor textTertiary contre accentText pour le « Oui »), ce qui rend le défaut moins fort que décrit mais ne change pas la forme de relevé. Attention à un effet de bord de la reformulation proposée : l'en-tête de la même carte compte `answeredYes` (« N fois où tu as changé quelque chose ») ; passer à « Changement fait » / « Pas cette fois » aligne bien la colonne sur cet en-tête et sur la réplique de réponse — vérifier au passage la largeur de styles.checkinPeriod, ces libellés étant nettement plus longs que « Oui »/« Non » sur une ligne de 390 px.


### A12-13 — « Tu réponds régulièrement » est affirmé dès le premier point répondu

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Quand la personne a répondu à des points mais jamais « oui », la carte affiche un décompte et la phrase « Tu réponds régulièrement : c'est déjà ça qui compte. » Cette phrase apparaît dès qu'un seul point existe — où « régulièrement » est faux — et son « c'est déjà ça » a un arrière-goût de consolation (comprendre : tu n'as rien changé, mais bon). Sur un produit qui mise sur la durée, une flatterie inexacte au premier passage abîme la crédibilité de toutes les suivantes.

Preuves : `src/app/(tabs)/suivi/index.tsx:257` ; `src/app/(tabs)/suivi/index.tsx:252`

**Recommandation.** Distinguer un point de plusieurs, et retirer le « déjà ça » : avec un seul, « Tu as pris le temps de répondre. C'est ce qui fait le suivi. » ; à partir de deux, « Tu réponds à tes points de suivi : c'est ce qui rend l'évolution lisible. »

**Contre-vérification.** Le constat rate un défaut plus net au même endroit : ce bloc est rendu à côté d'un `Mascot mood="happy"` et le libellé principal contient un **nombre** (« 3 points de suivi »), alors que CLAUDE.md pose que tout ce que dit la mascotte vit dans `src/constants/mascotte.ts` et qu'elle ne porte **jamais** un chiffre — la carte voisine du cas vide respecte la règle (`RAMILLE.suiviSansPoint`), celle-ci non. La correction devrait donc à la fois distinguer 1 de N (recommandation du constat, juste) et sortir le texte de la bouche de la mascotte : soit une réplique sans chiffre dans `RAMILLE`, soit retirer la mascotte de cet en-tête chiffré.


### A12-14 — Le même poste porte trois noms différents selon l'écran

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

« Week-ends et loisirs » dans le sommaire de l'onboarding, « Weekend et loisirs » (sans trait d'union) dans l'en-tête du questionnaire, « Loisirs du week-end » dans la restitution, le plan et le suivi. Le poste domicile-travail connaît la même dérive à un degré moindre (« Trajets domicile-travail » / « Trajet domicile-travail » / « Domicile-travail »). Sur un parcours qui promet de suivre les mêmes postes dans la durée, trois étiquettes pour une même chose obligent à refaire à chaque écran le travail de reconnaissance — et jettent un doute sur le fait qu'on parle bien de la même mesure.

Preuves : `src/components/onboarding/etape-transition.tsx:7` ; `src/types/bilan.ts:111` ; `src/app/(tabs)/suivi/bilan.tsx:74`

**Recommandation.** Retenir un libellé unique par poste — « Loisirs du week-end », déjà celui de la base et de la restitution — et le faire descendre dans le sommaire de l'onboarding et l'en-tête du questionnaire. Le placer dans un constant partagé, au même titre que `POSTE_SUBJECT`, pour que la prochaine dérive soit impossible.

**Contre-vérification.** À savoir avant de trancher : « Weekend et loisirs » vient littéralement du handoff design (docs/design/traceverte-ecrans-v1.dc.html, en-têtes B2.1/B2.2) — le corriger est un écart assumé au handoff, à noter dans un v1-0N comme les autres, pas une simple faute de frappe. Le point d'appui pour l'unification existe déjà côté serveur : les libellés de poste sont snapshottés par `compute_assessment_results` (`extras_poste_label` etc.) sur la forme « Loisirs du week-end (…) », donc c'est bien cette forme qui est canonique. Attention au fait que le libellé du questionnaire est un **nom de section** (il chapeaute aussi B2.3 distance) : « Loisirs du week-end » y marche, mais le domicile-travail garde légitimement le singulier/pluriel selon qu'il nomme la section ou le poste chiffré — n'imposer un mot unique que pour le poste.


### A12-15 — La proposition de compte promet un « historique de points mensuels » alors que la boucle principale est hebdomadaire

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

L'écran plein écran proposé juste après le premier bilan — le seul argumentaire du produit pour créer un compte — annonce « tu retrouves ton historique de points mensuels ». Or la boucle ancrée sur le trajet domicile-travail est hebdomadaire (`generate_commute_checkins`, cron du lundi), et c'est celle qui concerne la majorité des utilisateurs. La promesse est à la fois inexacte et sous-vendue : elle annonce douze rendez-vous par an là où le produit en tient une cinquantaine. « Points mensuels » est en plus du vocabulaire interne, jamais expliqué à ce stade.

Preuves : `src/app/connexion/index.tsx:100` ; `src/app/(tabs)/plan.tsx:216` ; `src/components/checkin-card.tsx:20`

**Recommandation.** « Avec un compte, ton bilan te suit d'un appareil à l'autre, et tu gardes la trace de tes points de suivi et de l'évolution de ton empreinte. » On promet la durée, qui est le vrai bénéfice, sans se tromper de rythme ni employer un mot d'interne.

**Contre-vérification.** Le constat rate l'origine de la phrase : elle est reprise mot pour mot du handoff design (docs/design/README.md:195 et docs/design/traceverte-ecrans-v1.dc.html:364), écrit avant que la boucle hebdo n'existe (v1-02). Ce n'est donc pas une négligence de rédaction mais une copie devenue fausse : la réécrire est un écart au handoff à documenter, et il faut le faire au même endroit dans les deux fichiers de docs (figés, on ne les réécrit pas — c'est le v1-0N qui porte l'écart). La reformulation proposée est bonne ; « points de suivi » reste du vocabulaire produit, on peut préférer « tes réponses ».


### A12-16 — Le canal de retour se contredit sur la promesse de réponse

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le formulaire annonce, sous le bouton d'envoi, qu'on garde l'identifiant du compte « pour pouvoir te répondre si tu nous laisses un moyen de le faire ». L'écran de succès, lui, dit l'inverse et le dit très bien : « Il n'y aura pas de réponse automatique — on préfère te le dire plutôt que de te laisser l'attendre. » Le module lui-même documente qu'aucun canal de réponse n'existe. La personne lit donc une promesse avant d'envoyer et son démenti après — la seconde formulation est la bonne, la première ouvre une attente que rien ne peut tenir.

Preuves : `src/app/feedback.tsx:359` ; `src/app/feedback.tsx:291` ; `src/lib/feedback.ts:4`

**Recommandation.** Aligner sur l'écran de succès : « On enregistre ton message, la catégorie choisie[, l'écran d'où tu viens] et l'identifiant de ton compte, pour pouvoir rapprocher ton retour de ce que tu vois. Rien d'autre. »

**Contre-vérification.** Le constat rate une troisième occurrence à aligner en même temps : src/app/confidentialite.tsx:88 reprend la même formule (« …un moyen de le faire. Ces retours sont lus à la main et ne déclenchent aucune réponse automatique. ») — elle est moins fausse puisqu'elle enchaîne le démenti, mais laisse la même finalité affichée (« pour pouvoir te répondre »). Corriger feedback.tsx sans elle laisserait la contradiction dans la page à valeur juridique, qui est aussi celle où la finalité déclarée compte le plus (RGPD art. 13) : la finalité réelle est le rapprochement du retour avec l'écran, pas la réponse.


### A12-17 — Le plan « en cours de préparation » est une impasse sans issue ni recours

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Cet état filet affiche une seule phrase centrée — « Ton plan est en cours de préparation, reviens dans un instant. » — sans bouton, sans nouvelle tentative, sans autre chemin. La personne peut changer d'onglet, mais rien ne le lui dit, et revenir sur l'onglet Plan ne relance pas la requête tant que l'app n'a pas été mise en arrière-plan. C'est l'écran d'accueil du produit pour un utilisateur revenant : lui donner une phrase et aucune main tendue est le contraire du registre tenu partout ailleurs (comparer avec l'échec de démarrage, qui offre « Réessayer »).

Preuves : `src/app/(tabs)/plan.tsx:318` ; `src/app/index.tsx:95`

**Recommandation.** Ajouter un bouton « Réessayer » qui incrémente `refreshKey`, et un lien secondaire « Revoir mon bilan » vers `/suivi/bilan` : le bilan existe forcément dans cet état, et il vaut mieux offrir ce qu'on a que de demander de partir.

**Contre-vérification.** Une affirmation du constat est fausse et il faut la retirer de la synthèse : « revenir sur l'onglet Plan ne relance pas la requête tant que l'app n'a pas été mise en arrière-plan ». `useRafraichirAuRetour` (src/hooks/use-rafraichir-au-retour.ts) est branché ligne 124 et écoute **deux** retours — le focus de l'écran *et* le retour au premier plan ; changer d'onglet puis revenir relance donc bien la requête. Le vrai trou est plus étroit : la personne **déjà** sur l'onglet Plan n'a aucun geste à faire sur place. À noter aussi que cet état est rare par construction — `generate_plan_cycle_for_user` est appelée à la fin de `compute_assessment_results`, donc le plan existe normalement dès la soumission ; il est atteint surtout sur erreur de requête (`cycleError`), ce qui plaide justement pour « Réessayer » plutôt que pour « reviens dans un instant ».


### A12-19 — Le détail d'une action compte des jours et les appelle des trajets

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le texte de contexte affiché sous une action domicile-travail est construit à partir de `commute_days_per_week`, c'est-à-dire un nombre de **jours**, mais l'annonce comme un nombre de **trajets** : « Sur tes 5 trajets par semaine. » Quelqu'un qui fait 5 jours d'aller-retour en fait 10. Le chiffre est le seul repère donné pour juger de l'ampleur de l'action proposée (« un trajet sur cinq », « deux trajets sur cinq »), et il est faux d'un facteur deux — dans un produit dont la crédibilité repose sur le fait que ses chiffres tiennent.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:627` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:143`

**Recommandation.** « Sur tes %s jours de trajet par semaine. » — le calcul, lui, est juste (il raisonne bien en parts de l'empreinte annuelle du poste) ; seul le mot est faux. Vérifier au passage que « un trajet sur cinq » dans les libellés d'action désigne bien la même unité que le détail affiché juste en dessous.

**Contre-vérification.** Le constat ne va pas assez loin sur un point : le mot faux n'est pas seulement dans le détail, il structure TOUS les libellés du poste domicile-travail. `share = 0.20` / `0.40` s'appliquent à l'empreinte annuelle du poste, donc « Faire un trajet sur cinq à vélo » (l.136) et « Passer deux trajets sur cinq en métro » (l.142) désignent en réalité un JOUR sur cinq et deux JOURS sur cinq — un aller-retour, pas un aller. Les six libellés `commute` doivent donc bouger avec le détail, sinon on corrige la légende et on laisse le titre faux (« Faire ce trajet à deux au moins un jour sur deux » et « Garder une journée de télétravail » sont déjà en jours, eux, ce qui rend l'incohérence visible dans une même liste). Rédaction cohérente : « Sur tes 5 jours de trajet par semaine. » + « Faire un jour sur cinq à vélo ». Aucun test pgTAP n'épingle ces chaînes (grep dans `supabase/tests/database/`), la correction est donc sans risque de CI.


### A12-20 — La suppression de compte depuis l'app se termine sans un mot, alors que la page web sait dire au revoir

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Ramille a une ligne écrite exactement pour ce moment (« Merci d'être passé. Si tu reviens, on repart de zéro, tranquillement. »), et la page publique de suppression l'affiche. Le chemin dans l'app, lui, redirige immédiatement vers la racine, qui recrée une session anonyme et renvoie sur l'onboarding : la personne qui vient de tout effacer retombe sur l'écran d'accueil comme si elle venait d'installer l'app, sans confirmation que quoi que ce soit ait été supprimé. C'est le seul endroit du produit où un geste irréversible n'est suivi d'aucun accusé de réception.

Preuves : `src/components/compte/mon-compte.tsx:49` ; `src/app/compte/suppression.tsx:194` ; `src/constants/mascotte.ts:76`

**Recommandation.** Afficher un état de confirmation dans la carte (comme l'état `supprime` de la page web : « C'est fait. » plus la ligne de Ramille), avec un bouton « Revenir au début » qui déclenche la redirection. On ne retient toujours personne, et l'irréversible reçoit son accusé de réception.

**Décision documentée concernée.** Le commentaire de `src/components/compte/mon-compte.tsx` l.47-48 acte l'inverse (« sans écran intermédiaire qui annoncerait une suppression déjà faite »). C'est un choix de code, pas une décision documentée dans `docs/architecture/` ; il mérite d'être rouvert au vu de la page `/compte/suppression`, qui tranche dans l'autre sens.

**Contre-vérification.** Le commentaire l.46-48 de `mon-compte.tsx` acte bien l'inverse, mais ce n'est pas une décision documentée : ni `v1-04` (auth) ni la section suppression/export de CLAUDE.md ne se prononcent sur un accusé de réception, et la doctrine réellement écrite (« aucune tentative de retenir la personne », l.21-24) n'est pas en cause — un « C'est fait. » ne retient personne, il informe. Deux points que le constat rate : (1) `signOut()` est déjà fait AVANT la redirection, donc afficher l'état de confirmation dans la carte n'expose plus aucune donnée — c'est faisable sans rien réordonner ; (2) mieux encore, la carte peut réutiliser telle quelle la formulation de `suppression.tsx` (« Ton compte et tout ce qui s'y rattachait — bilans, plan, points de suivi, retours — ont été supprimés définitivement. ») pour que les deux surfaces disent la même chose, ce qui est la vraie anomalie : deux chemins vers le même geste irréversible avec deux fins différentes.


### A12-21 — La notification de rappel place l'information utile là où Android la coupe

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le titre du push est générique (« Ton point de la semaine ») et le corps reprend la question entière, dont la partie qui identifie le sujet — « … pour Trajet domicile-travail (Voiture thermique) ? » — arrive tout à la fin. Le commentaire du code note lui-même qu'Android n'affiche pas davantage que le début sans déplier. Sur l'écran verrouillé, la personne lit donc « As-tu changé de mode de transport au moins une fois cette sema… » : une question sans sujet, à laquelle on ne peut pas répondre de tête. C'est le seul contact hors de l'app, et il perd son contenu à l'affichage.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:220` ; `supabase/migrations/20260907230000_rappels_canal.sql:211`

**Recommandation.** Mettre le sujet en tête du corps : « Ton trajet domicile-travail : as-tu changé de mode au moins une fois cette semaine ? ». Le titre peut alors rester tel quel. À traiter en même temps que A12-1, dont c'est le même défaut sous un autre angle.

**Contre-vérification.** Deux nuances, et un défaut plus grave que celui relevé. Nuance : `v1-12` §4.3 (docs/architecture/v1-12-rappels.md:159-163) dit « Android replie le corps à deux lignes », pas une — la troncature est donc probable mais pas garantie, d'où une confiance moyenne justifiée ; c'est aussi ce même passage qui pose l'exigence « le titre et le début de la question doivent suffire », que l'implémentation ne tient pas : le constat ne contredit donc pas la décision, il constate qu'elle n'est pas respectée. Plus grave, et absent du constat : la phrase est agrammaticale à l'affichage. Le §4.3 donne comme exemple « … pour tes trajets domicile-travail ? », alors que le code concatène le libellé de restitution brut : « … pour Trajet domicile-travail (Voiture thermique) ? » — majuscule au milieu de phrase et motorisation entre parenthèses, qui n'a rien à faire dans un rappel (elle n'aide pas à répondre, et le canal est justement celui où la place est comptée). La correction utile fait les deux d'un coup : corps = `c.trip_label || ' : as-tu changé de mode au moins une fois cette semaine ?'`, ou mieux, un libellé court dédié pour le push (poste sans la parenthèse de mode).


### A12-22 — « On ajustera la précision plus tard » promet un mécanisme qui n'existe pas

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Quand la personne répond « Je ne sais pas » à la distance de son trajet, l'aide annonce : « Une estimation suffit. On ajustera la précision plus tard si tu le souhaites. » Aucun écran du produit ne permet d'ajuster une réponse : le questionnaire insère toujours un nouveau bilan (c'est d'ailleurs pourquoi « Modifier mes réponses » a été renommé « Refaire mon bilan »), et rien ne revient jamais proposer d'affiner cette distance. La promesse est petite mais gratuite, et elle porte sur le seul champ où l'imprécision pèse le plus lourd dans le calcul.

Preuves : `src/components/bilan/steps/commute-days-distance.tsx:68` ; `src/app/(tabs)/suivi/bilan.tsx:442`

**Recommandation.** « Une estimation suffit — tu pourras toujours donner un chiffre plus précis en refaisant ton bilan, tes réponses seront préremplies. » On garde la réassurance et on dit le vrai chemin, qui existe déjà.

**Contre-vérification.** À nuancer sur un point que le constat durcit un peu : le chemin existe partiellement, puisque le re-bilan est prérempli (`src/lib/bilan-history.ts:80` et suivants, `src/app/bilan/index.tsx:50`) — quelqu'un qui refait son bilan retrouve sa tranche et peut basculer sur un km exact. Ce qui est faux, c'est le « on » : le produit ne revient jamais le demander, et la personne n'a aucun moyen de savoir que ce chemin existe. La reformulation proposée est donc la bonne et dit le vrai. Une seule chose à savoir avant de la faire : la phrase est reprise mot pour mot du handoff design figé (`docs/design/traceverte-ecrans-v1.dc.html`, écran « B1.3 — Distance par tranche », et `docs/design/README.md:123`). Ce n'est pas un blocage — CLAUDE.md prévoit que `docs/design/` ne se réécrit jamais et que les écarts s'actent dans un `v1-0N` — mais la correction doit être notée comme écart assumé au même titre que le renommage de « Modifier mes réponses », qui vient exactement du même problème (une promesse d'édition que le modèle de données ne tient pas).


## A13 — parcours complet à la lumière des sciences du changement de comportement

**Résumé du lecteur.** Le parcours jusqu'au premier engagement est solide et rare dans sa discipline : onboarding sans peur, restitution sans gouffre (palier), intention d'implémentation obligatoire, zéro mécanique d'échec, voix de Ramille tenue. Ce qui frappe ensuite, c'est que la boucle de suivi mesure mal ce qu'elle est censée renforcer : la question du check-in est posée le lundi matin sur « cette semaine » qui n'a pas commencé, elle ignore l'action et les jours que la personne vient de choisir, elle est envoyée à des cyclistes et sur un mode « voiture » inventé pour les loisirs rares, et elle n'offre aucune réponse neutre pour une semaine sans trajet. La durée, qui est le cœur du produit, n'a pas encore de moments : le changement de saison n'est ni clos ni ouvert, la comparaison « mon été vs mon été précédent » qui justifiait la cadence saisonnière n'existe nulle part, le re-bilan efface l'engagement en cours sans un mot, et le second bilan — le renforcement le plus fort possible — ne dit ni que le palier est franchi ni ce que les réponses accumulées ont représenté. Enfin, deux décisions documentées restent inappliquées : la comparaison à la moyenne française est toujours servie aux profils captifs malgré `mobility_constrained`, et le suivi ne se rafraîchit pas au retour.

**Points forts à ne pas casser**

- L'engagement sur une action exige une intention d'implémentation (jours pour le domicile-travail, échéance fermée sinon), relue en toutes lettres, sans saisie libre, et une seule action engagée par cycle — `src/components/plan/action-commitment.tsx:20-24`, migration `20260905190000`. C'est le levier le mieux établi et il est bien construit.
- Aucune mécanique d'échec nulle part : check-ins non répondus clos en `expired` et jamais relus, compteur des seules réponses données, « Changer d'avis » sans rien compter contre soi, une hausse présentée comme un fait (« Une année n'est pas l'autre ») — `src/app/(tabs)/suivi/index.tsx:38-43`, `src/types/suivi.ts:54`, `action-card.tsx:19-21`.
- Le palier remplace le gouffre 2050 : même effort relatif pour tous, repère 2050 réaffiché seulement sous la moyenne, registre de contribution pour qui est déjà sous le repère — `src/types/palier.ts`. Ne pas réintroduire de trajectoire linéaire ni de marches absolues.
- Le rappel est un seul mot par point, canal résolu en un seul endroit et épinglé des deux côtés, opt-out, permission demandée après l'engagement et jamais au lancement — `src/types/rappels.ts`, `feuille-rappels.tsx:32-35`. La demande en deux temps (notre feuille, puis le système) protège le canal Android.
- La voix de Ramille est gardée par des règles testées : première personne, jamais un nombre, jamais « tu devrais » ; elle n'apparaît jamais près d'un chiffre lourd — `src/constants/mascotte.ts:15-19`. La relance après un « Non » (`checkinNon`) est exactement dans le registre attendu.
- Le plan filtre l'impossible (contexte B4), n'affiche aucune action sous 5 kg/an, et accueille le profil sobre par une félicitation plutôt qu'une liste vide — `20260905130000_actions_chiffrees.sql:519-529,623`, `plan.tsx:491-504`. Le re-bilan prérempli rend la comparaison dans le temps praticable — `bilan/index.tsx:45-56`.

### A13-1 — Le check-in demande « cette semaine » le lundi matin, avant que la semaine ait eu lieu

`technique` · sévérité **important** · verdict **confirme** · effort moyen

La boucle hebdo est générée le lundi à 6h UTC pour la semaine qui commence ce même lundi (`date_trunc('week', now())`), et le push part à `now()` — donc le lundi matin. La question dit « As-tu changé de mode de transport au moins une fois cette semaine ? » : au moment où elle arrive, aucun trajet n'a eu lieu. Même chose pour la boucle mensuelle, générée le 1er avec « ce mois-ci ». L'auto-observation porte sur une période vide ; la personne qui répond au moment du rappel (le cas le plus probable) ne peut répondre que « Non » ou attendre, et l'expiration survient le lundi suivant à l'instant où la nouvelle question l'écrase. Le canal est techniquement parfait, mais la mesure est désynchronisée du comportement qu'elle veut observer.

Preuves : `supabase/migrations/20260904200000_checkin_email_reminders.sql:117` ; `supabase/migrations/20260827090000_engagement_checkins.sql:346` ; `supabase/migrations/20260907230000_rappels_canal.sql:223` ; `supabase/migrations/20260907230000_rappels_canal.sql:232` ; `src/components/checkin-card.tsx:55`

**Recommandation.** Faire porter le point sur la période qui vient de se clore : `period_start` = lundi précédent (resp. mois précédent), libellé « Semaine du 31/08 », question « la semaine dernière » / « le mois dernier ». Le push reste le lundi matin (v1-12 §2.8 intact) mais demande un fait accompli. Mettre à jour les tests pgTAP qui épinglent la question (`17_rappels_canal.test.sql:99`) et les libellés « Semaine du ».

**Décision documentée concernée.** v1-02-boucle-engagement.md §3 (l. 89-91) : « créer un check-in pour la semaine courante » ; v1-12 §4.4 (l. 160-161) fixe le corps du push avec « cette semaine ». La décision du moment d'envoi (§2.8) n'est pas remise en cause, seule la période interrogée change.

**Contre-vérification.** Deux nuances que le constat rate. (1) Le point n'est pas seulement répondable au moment du rappel : la carte reste sur /plan tant que status = 'pending', c'est-à-dire jusqu'au lundi suivant — quelqu'un qui ouvre l'app le jeudi répond sur une semaine partiellement vécue. Le défaut est donc surtout dans le couple moment-du-push / temps du verbe, pas dans la fenêtre elle-même. (2) Répondre « Non » le lundi matin déclenche RAMILLE.checkinNon (« Pas cette fois-ci… », src/constants/mascotte.ts:44) : la réponse la plus probable à une question prématurée est aussi celle qui se lit comme un échec — ce qui aggrave le constat. Sur la contradiction : v1-02 §3 (l. 89-91) est une description du mécanisme, pas un arbitrage comportemental argumenté, et v1-12 §4.3 ne fait que citer le corps existant ; le décalage est donc corrigeable sans revenir sur une décision motivée. Coût réel du correctif : les libellés 'Semaine du DD/MM' et le mois figurent aussi dans les maquettes figées (docs/design/v1-07-…, v1-08-mascotte, v1-11-navigation) qui ne se réécrivent pas, et 17_rappels_canal.test.sql:99 épingle la phrase exacte du push.


### A13-2 — Le check-in ignore l'action engagée et les jours choisis : l'auto-observation ne mesure pas l'intention

`fonctionnel` · sévérité **important** · verdict **contredit_decision** · effort moyen

La personne s'engage sur « Faire un trajet sur cinq à vélo — le mardi et le jeudi » ; une semaine plus tard la question est « As-tu changé de mode de transport au moins une fois cette semaine pour Trajet domicile-travail (Voiture thermique) ? ». La génération ne lit que `commute_poste_label` ; `plan_actions.intention_days` et `action_text` ne sont jamais lus côté serveur (seul `export_my_data` les cite). La boucle si-alors est donc coupée : le « si » (mardi, jeudi) est posé, le « alors » (vélo) est posé, mais le retour ne les nomme jamais, et le « au moins une fois » neutralise le signal de compétence (deux jours tenus valent un). Pour le poste voyages, « changer de mode pour Voyages longue distance (Avion long-courrier) » est même hors sujet : l'action proposée est de renoncer à un vol.

Preuves : `supabase/migrations/20260904200000_checkin_email_reminders.sql:126` ; `src/components/checkin-card.tsx:56` ; `src/app/(tabs)/plan.tsx:465` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:164`

**Recommandation.** À la génération, snapshoter sur `engagement_checkins` l'action engagée du cycle courant (`action_label`, `intention_days`/`intention_timing`) et formuler la question dessus : « Mardi ou jeudi, as-tu fait ce trajet à vélo ? » ; garder la formulation générique quand rien n'est engagé. Pour le segment long-courrier, poser une question d'occasion (« As-tu voyagé ce mois-ci ? ») plutôt qu'un changement de mode.

**Décision documentée concernée.** spec-fonctionnelle §7 (l. 185) : « Pas de personnalisation poussée du wording par profil pour cette V1 : une formulation générique paramétrée par le trajet identifié suffit ». L'engagement sur une action (étape 6b) est postérieur à cette ligne et la rend caduque de fait.

**Contre-vérification.** La décision de v1-12 §3 porte sur le CANAL et la CADENCE (quel jour, quel message d'attente), pas sur le contenu de la question : la synthèse peut donc retenir le constat sans la contredire, à condition de ne pas indexer la génération de la boucle sur l'engagement. Le correctif le moins invasif est un snapshot supplémentaire sur engagement_checkins (action_label + intention_days/timing figés à la génération, dans l'esprit de trip_label déjà snapshotté), avec repli sur la formulation générique quand rien n'est engagé — donc aucune boucle nouvelle ni disparue. Deux points que le constat rate : engagement_checkins.response est un booléen (le « deux jours tenus valent un » n'est pas seulement dans le libellé, il est dans le schéma — passer à un comptage de jours changerait la colonne et l'écran /suivi) ; et l'engagement peut disparaître entre la génération et la réponse (cf. A13-5), donc un libellé snapshotté peut survivre à l'action qu'il nomme.


### A13-3 — La boucle hebdo interroge chaque semaine les personnes qui vont déjà au travail à vélo ou à pied

`technique` · sévérité **important** · verdict **confirme** · effort petit

`commute_poste_label` est renseigné dès que `commute_has_regular_trip` est vrai, quel que soit le mode ; la génération ne filtre que sur `is not null`. Un cycliste reçoit donc chaque lundi « As-tu changé de mode de transport au moins une fois cette semaine pour Trajet domicile-travail (Vélo) ? » — la seule lecture possible est « es-tu repassé en voiture ? ». Le plan en a conscience (« Le check-in reste là si tu veux garder un œil dessus ») mais c'est une question sans réponse utile qui, répétée 52 fois par an, s'use pour rien et peut se lire comme un doute.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:296` ; `supabase/migrations/20260904200000_checkin_email_reminders.sql:128` ; `src/app/(tabs)/plan.tsx:501`

**Recommandation.** Quand le mode principal du trajet est de catégorie `velo_marche` (ou `commute_main_leg_co2_kg_year = 0`), soit ne pas générer la boucle hebdo, soit la transformer en question de maintien affirmative (« Es-tu allé au travail à vélo cette semaine ? »), qui renforce l'identité au lieu de suggérer une rechute. Ajouter un test pgTAP sur ce cas.

**Contre-vérification.** Le constat sous-estime un point qui justifie de garder la sévérité haute : pour ce profil, la seule réponse honnête est « Non », et « Non » déclenche RAMILLE.checkinNon — « Pas cette fois-ci. Rien d'obligatoire, on se repose la question au prochain point. » (src/constants/mascotte.ts:44). Le produit répond donc une consolation d'échec, 52 fois par an, à la personne qui fait déjà tout — l'exact inverse de la carte « Tu fais déjà l'essentiel sur ce poste » affichée juste au-dessus. Attention en implémentant : ne pas supprimer la génération sans regarder v1-12 §3 l. 76-78, qui dérive le message d'attente (« Je te fais signe lundi ») de l'existence de la boucle hebdo — supprimer la boucle pour un cycliste basculerait aussi son attente en mensuel. La variante affirmative (« Es-tu allé au travail à vélo cette semaine ? ») est donc préférable à l'absence de génération, et elle ne coûte qu'un champ de plus dans le snapshot déjà envisagé en A13-2. Test de sélection : la catégorie transport_modes.category du mode résolu, ou r.commute_main_leg_co2_kg_year — mais pas '= 0', les facteurs étant en ACV complète le vélo n'est jamais nul (CLAUDE.md, v1-07 §1.5).


### A13-4 — Les loisirs « rarement » reçoivent un mode « Voiture » inventé, qui alimente la question mensuelle et le plan

`technique` · sévérité **important** · verdict **confirme** · effort moyen

Quand `leisure_frequency = 'rarely'`, le calcul applique un mode par défaut `voiture` sur 15 km (contribution résiduelle, conforme à la spec). Mais ce mode fabriqué devient le **libellé** « Loisirs du week-end (Voiture) », donc la question mensuelle « As-tu changé de mode de transport ce mois-ci pour Loisirs du week-end (Voiture) ? » à quelqu'un qui a dit qu'il sort rarement et n'a jamais parlé de voiture. L'estimateur propose aussi « Faire une sortie sur trois à vélo » (0,33 × ~55 kg ≈ 18 kg ≥ 5) sur ces sorties hypothétiques. Pour un profil sans trajet régulier et sans vol, c'est même le poste dominant : tout le plan repose sur une hypothèse que la personne ne reconnaîtra pas.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:203` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:307` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:358` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:572`

**Recommandation.** Garder le calcul résiduel mais : libeller « Loisirs du week-end (occasionnels) » sans mode quand `rarely` ; faire `continue` sur les templates `leisure` dans `estimate_action_savings` quand `a.leisure_frequency = 'rarely'` ; et ne générer la boucle `extras` que si le poste extras retenu a une base déclarée (voyages > 0, ou loisirs non rares). Recalculer les valeurs attendues pgTAP.

**Décision documentée concernée.** spec-fonctionnelle §5 (l. 135) impose le mode/distance par défaut pour le calcul — il est conservé ; seul son usage comme libellé et comme base d'actions est retiré.

**Contre-vérification.** Le constat rate le fait le plus large : comme v_extras_label est calculé sans condition et que le départage retient les loisirs dès que leisure_co2 >= travel_co2 × 0,95 (l. 344-352), extras_poste_label est non nul pour TOUT bilan complété — la boucle mensuelle est donc générée pour tout le monde, y compris pour quelqu'un qui a déclaré sortir rarement et n'avoir pris aucun vol ni long trajet. Ce n'est pas un cas de bord, c'est le cas par défaut d'un profil sédentaire. Attention à la recommandation « continue sur les templates leisure quand rarely » : elle peut vider entièrement le plan d'un tel profil (aucune action commute s'il n'a pas de trajet régulier, aucune action travel sans vol) — le plan retombe alors sur la carte « Tu fais déjà l'essentiel », qui serait ici juste. Et conformément à CLAUDE.md, toute modification des templates ou des bases oblige à recalculer par requête sur la base la quinzaine d'assertions chiffrées de 01/05/06/08, pas à chercher les littéraux.


### A13-5 — Refaire son bilan dans la même saison efface l'action engagée sans un mot

`technique` · sévérité **important** · verdict **confirme** · effort moyen

`recompute_assessment_results` appelle `generate_plan_cycle_for_user`, qui, pour la période courante déjà existante, met à jour le cycle puis `delete from plan_actions where plan_cycle_id = v_cycle_id` avant de réinsérer. `committed_at`, `intention_days`, `intention_timing` disparaissent. Or le produit pousse au re-bilan de trois endroits (suivi, plan, restitution « Refaire mon bilan »), y compris pour corriger une ligne juste après la soumission. Le geste le plus engageant du produit peut donc être annulé par le second geste le plus encouragé, silencieusement — et la carte d'attente continuera de dire « Je te fais signe lundi » pour une action qui n'existe plus.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:718` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:443` ; `src/app/(tabs)/suivi/bilan.tsx:447`

**Recommandation.** Avant le `delete`, mémoriser l'engagement (template, jours/échéance) ; après réinsertion, le reporter sur la ligne portant le même `action_template_id` si elle existe encore. Sinon, le dire à l'écran du plan une fois (« Ton plan a été recalculé ; ton engagement sur X n'y figure plus — choisis à nouveau »). Test pgTAP : re-bilan → engagement conservé.

**Contre-vérification.** Une inexactitude à corriger dans le constat : la carte d'attente (« Je te fais signe lundi ») ne dépend pas de l'action engagée — plan.tsx:419 l'affiche quand checkins.length === 0, et son libellé est dérivé du canal et de la boucle (carteAttente / src/types/rappels.ts). Elle ne « mentira » donc pas sur une action disparue ; ce qui disparaît sans un mot, c'est la carte verte saillante de v1-11 lot 1 et l'intention (jours choisis) affichée par ActionCard (plan.tsx:465). Ce qu'ajoute la vérification : le geste le plus fréquent qui déclenche l'effacement n'est pas le re-bilan à six mois mais la correction juste après soumission, et le report par action_template_id est fiable ici (les templates sont fixes depuis 20260905130000, et l'index unique partiel de 20260905190000:66 garantit qu'il n'y a qu'un engagement à reporter). Prévoir aussi le cas où l'action engagée n'est plus dans les deux retenues : il faut alors le dire une fois à l'écran plutôt que de rien afficher.


### A13-8 — Pas de réponse neutre au check-in : une semaine de vacances ou un mois sans voyage forcent un « Non » ou un silence

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

La carte n'offre que Oui / Non. Une semaine sans trajet (congés, maladie, télétravail complet), un mois sans sortie ni voyage, n'ont pas de réponse honnête : « Non » déclenche la relance « Pas cette fois-ci » et s'inscrit en « Non » dans l'historique du suivi ; ne rien répondre laisse expirer. Pour la boucle `extras` d'un profil « voyages » (deux vols par an), dix mois sur douze n'ont rien à déclarer : la question mensuelle devient une suite de « Non » ou d'absences, c'est-à-dire exactement l'expérience de série cassée que le produit refuse par ailleurs. La conception tolérante à la rechute exige de distinguer « je n'ai pas changé » de « il n'y avait rien à changer ».

Preuves : `src/components/checkin-card.tsx:62` ; `src/components/checkin-card.tsx:70` ; `src/app/(tabs)/suivi/index.tsx:269` ; `supabase/migrations/20260827090000_engagement_checkins.sql:257`

**Recommandation.** Ajouter une troisième réponse discrète « Pas de trajet cette semaine » / « Pas de voyage ce mois-ci », enregistrée `status = 'answered'`, `response = null` (la colonne est déjà nullable ; `loadAnsweredCheckins` écarte déjà les `null`, donc rien n'apparaît dans l'historique). Ramille répond par une phrase d'attente, pas de relance. Compter cette réponse comme une réponse dans « N points de suivi ».

**Contre-vérification.** Deux corrections à la recommandation. (1) Elle est contradictoire : si la réponse est enregistrée `response = null`, `loadAnsweredCheckins` l'écarte, donc elle ne peut pas « compter comme une réponse dans N points de suivi » — il faut soit un troisième état explicite (`response_kind` ou `status = 'non_applicable'`), soit lever le filtre `null` dans `bilan-history.ts` et gérer l'affichage d'un troisième libellé ; en l'état la personne répondrait et ne verrait rien apparaître, ce qui reproduit le vide qu'on cherche à éviter. (2) Cette évolution entre en collision avec une piste déjà retenue et non encore construite : `v1-07` §3.6 (l.615-620) « rendre le check-in quantitatif » (0 / 1-2 / 3+). Les deux touchent la même carte et la même colonne ; il faut les instruire ensemble, un décompte à 0 ne disant pas non plus « il n'y avait rien à changer ». Noter aussi que la carte écrit par un `update` direct sur la table (pas un RPC) : ajouter un troisième état ne demande aucune nouvelle fonction.


### A13-9 — `mobility_constrained` est calculé mais la restitution compare toujours les profils captifs à la moyenne française

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

v1-07 §3.5 décide de ne pas afficher la comparaison à la moyenne « pour les profils structurellement captifs (rural, TC inexistants) une fois le contexte B4 exploité », et la migration 20260905130000 ajoute la colonne avec ce commentaire explicite. Aucun fichier de `src/` ne lit la colonne : la barre « Moyenne en France » et `comparisonNote` sont rendues sans condition. Pour le segment que la spec §2 veut inclure et ne pas décourager (rural sans alternative), la promesse de l'onboarding (« ce sont des contraintes, pas des fautes ») n'est pas tenue à l'écran qui compte le plus.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:77` ; `src/app/(tabs)/suivi/bilan.tsx:403` ; `src/components/onboarding/etape-reassurance.tsx:30`

**Recommandation.** Quand `results.mobility_constrained` est vrai : retirer la barre « Moyenne en France » et `comparisonNote`, garder « Toi » et le palier, et ajouter une phrase factuelle qui nomme la contrainte (« Là où tu vis, la voiture n'est pas un choix. Le plan regarde ce qui dépend de toi. »). Dériver ce choix dans un module pur testé.

**Contre-vérification.** Une imprécision à corriger dans la synthèse : `comparisonNote` n'est pas rendue « sans condition » — l.420, c'est `palier ? palierNote(...) : comparisonNote(totalT)`, et `palierNote` ne mentionne jamais la moyenne. Donc dès qu'un cycle de plan existe (cas nominal, `compute_assessment_results` génère le cycle à la soumission), la phrase culpabilisante n'est pas affichée : ce qui reste est la **barre**, plus le fait que la barre « Toi » est mise à l'échelle de la moyenne. La moitié « ton » de §3.5 est d'ailleurs déjà faite — le « 150 % de la moyenne » a été remplacé, cf. le commentaire l.95-99 et `comparisonNote` l.100-108. Reste donc précisément : masquer la barre et recaler `domain` sur le total et le palier quand `mobility_constrained` est vrai. Prévoir aussi le cas `null` (bilans antérieurs à la migration) : traiter `null` comme « non contraint », jamais comme vrai.


### A13-12 — Le suivi ne se rafraîchit pas au retour : la réponse donnée sur le plan n'apparaît pas dans le suivi

`technique` · sévérité **important** · verdict **confirme** · effort petit

CLAUDE.md impose `useRafraichirAuRetour` à « tout écran d'onglet dont le contenu peut changer côté serveur ». `/suivi` charge ses données dans un `useEffect` de montage et n'utilise pas le hook, alors que `/plan` le fait. Conséquence vécue : répondre « Oui » au point de la semaine puis ouvrir l'onglet Suivi montre un compteur et une liste périmés (le « Oui » n'y est pas) jusqu'au prochain lancement — la boucle de feedback la plus immédiate du produit est cassée au moment où elle devrait se fermer. Même effet après un re-bilan ou un retour depuis la notification.

Preuves : `src/app/(tabs)/suivi/index.tsx:90` ; `src/app/(tabs)/plan.tsx:124`

**Recommandation.** Passer le chargement de `/suivi` dans un `useCallback` et l'abonner à `useRafraichirAuRetour`, comme `/plan`.

**Contre-vérification.** Deux nuances utiles à la synthèse : l'écran n'est périmé que s'il a déjà été visité pendant la session (au premier passage sur l'onglet il monte et charge frais), et l'écran de détail `/suivi/bilan` n'est pas concerné de la même façon (son effet dépend de `[id]` et il est empilé, pas onglet). Mise en œuvre : le state est un `LoadState` unique, il suffit d'extraire le corps de l'effet dans un `useCallback` stable et de le passer au hook — attention à conserver le drapeau `cancelled` (deux rafraîchissements peuvent se chevaucher au retour au premier plan) et à ne pas repasser par `status: 'loading'`, sinon revenir sur l'onglet fait clignoter « Chargement de ton suivi… » sur un écran déjà rempli.


### A13-6 — Le changement de saison n'est ni clos ni ouvert : l'effet « nouveau départ » et la clôture du cycle sont perdus

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

La saison est l'unité du produit (« Je serai là à chaque saison »), mais rien ne se passe quand elle change : un nouveau `plan_cycles` est inséré avec des actions neuves et aucun engagement ; l'écran du plan ne montre qu'une puce « Cadence : Automne 2026 ». Pas de bilan de la saison écoulée (points répondus, fois où quelque chose a changé, cap visé), pas de proposition de reprendre ou changer l'action, pas de phrase qui marque le début. La recherche sur l'effet « fresh start » (rentrée, janvier, nouvelle saison) et sur la formation d'habitude (~10 semaines, soit presque exactement une saison) fait de ce moment le plus favorable pour relancer — et il passe en silence. À dix-huit mois, la personne a vécu six saisons sans qu'aucune ait été racontée.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:699` ; `src/app/(tabs)/plan.tsx:386` ; `src/constants/mascotte.ts:35`

**Recommandation.** Sur `/plan`, pendant les deux premières semaines d'un cycle (dérivé de `period_start`), une carte d'ouverture en voix produit : « L'automne commence. Cet été : N points répondus, M fois où tu as changé quelque chose. » (jamais les points manqués), suivie de « Reprendre la même action » (recopie l'engagement précédent via le RPC) ou choisir une autre. Ramille peut dire la saison sans compter (« On repart pour une saison. »). Aucune série, aucun score.

**Contre-vérification.** Deux réserves qui font baisser la sévérité. (1) Le constat rate une carte qui existe déjà et qui porte exactement le titre demandé : plan.tsx:520-537 affiche « Une nouvelle saison a commencé » avec le lien « Refaire mon bilan » — mais elle est déclenchée par l'âge du bilan (REBILAN_SUGGESTION_DAYS = 182, src/types/suivi.ts:68), donc environ une saison sur deux, et non par le passage de cycle (plan_cycles.period_start). Le correctif le moins coûteux est donc de déplacer le déclencheur vers period_start, avant d'inventer une carte de plus. (2) C'est une amélioration produit, pas un défaut : aucun comportement n'est faux, rien n'est perdu (le suivi conserve l'historique des points répondus). Elle est aussi conditionnée par A13-5 : « Reprendre la même action » n'a de sens que si l'engagement survit à la régénération. Contrainte à respecter dans la formulation : CLAUDE.md interdit un chiffre dans la bouche de Ramille et interdit toute mécanique d'échec sur /suivi — le récapitulatif doit donc être en voix produit et ne compter que les réponses, jamais les périodes manquées, ce que la recommandation prévoit bien.


### A13-7 — La comparaison « mon été vs mon été précédent », raison d'être de la cadence saisonnière, n'existe nulle part

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

La spec §6 retient les saisons calendaires précisément pour comparer une même saison d'une année sur l'autre, et v1-03 §2 confirme ce bénéfice. Le suivi affiche une liste plate des bilans, `variationNote` ne compare que les deux derniers, et les points répondus sont listés à plat (8 au plus) sans regroupement par saison alors que `period_start` est chargé. De plus, la proposition de re-bilan à 182 jours pousse structurellement vers la saison opposée (été → hiver), ce qui rend la comparaison même-saison improbable par construction et expose la personne à l'effet saisonnier que la spec voulait neutraliser (« Une année n'est pas l'autre » devient la règle plutôt que l'exception).

Preuves : `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:172` ; `src/types/suivi.ts:68` ; `src/app/(tabs)/suivi/index.tsx:263` ; `src/lib/bilan-history.ts:55`

**Recommandation.** Dans `/suivi`, regrouper les points répondus par saison (dérivation pure de `period_start` dans `src/types/suivi.ts`, testée) et, quand un bilan existe dans la même saison d'une année antérieure, afficher cet écart en priorité sur l'écart au bilan précédent. Garder la proposition à 6 mois mais ajouter une proposition ancrée à l'anniversaire saisonnier (« Même saison que ton premier bilan : c'est le moment où la comparaison est la plus juste »).

**Contre-vérification.** Sévérité abaissée : la spec elle-même qualifie ce point de « paramètre ouvert, ajustable sans repenser le produit » (même paragraphe l.172), et la comparaison même-saison exige un an d'historique alors que le suivi est livré début 09/2026 — aucun utilisateur ne peut aujourd'hui en bénéficier, donc aucune promesse rompue à l'écran. Ce que le constat rate : la partie réellement bon marché et immédiatement utile est la seconde, l'ancrage de la proposition de re-bilan (aujourd'hui un pur seuil de jours), pas le regroupement par saison de huit lignes de check-in. Et attention si l'on veut afficher un écart même-saison : `generate_plan_cycle_for_user` écrase la ligne `plan_cycles` de la période courante (`on conflict (user_id, period_start) do update`, migration `20260905130000` l.707-714), donc rien ne garantit qu'un repère de saison antérieure survive si deux bilans tombent dans la même saison.


### A13-10 — Le second bilan ne dit ni que le palier visé est franchi, ni ce que les réponses accumulées ont représenté

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

v1-07 §3.2 nomme le re-bilan « le moment de renforcement le plus fort que ce produit puisse offrir ». Aujourd'hui il produit « X % de moins que ton bilan précédent » et, sur la restitution, un nouveau « Ton prochain palier » calculé sur le cycle régénéré — donc toujours une marche de plus, jamais la reconnaissance de la marche franchie. Les points répondus « Oui » entre les deux bilans, l'action engagée, le cap de la saison ne sont reliés à rien. Le sentiment de compétence (petits gains attribués à soi) et le cadrage identitaire se construisent précisément ici, et le produit a toutes les données pour le faire sans comparer à personne.

Preuves : `src/types/suivi.ts:53` ; `src/app/(tabs)/suivi/bilan.tsx:193` ; `docs/architecture/v1-07-audit-facteurs-et-suivi.md:356`

**Recommandation.** En mode `nouveau` avec un bilan antérieur : comparer le total au `targetKg` du cycle précédent (stocké sur `plan_cycles`) et dire « Le palier que tu visais est derrière toi » ou « Pas encore atteint — le prochain repart d'où tu es », puis une ligne en voix produit « Depuis ton dernier bilan : N fois où tu as changé quelque chose ». Aucun décompte de paliers restants.

**Décision documentée concernée.** Adjacent à la règle CLAUDE.md « Le nombre de paliers restants ne s'affiche jamais » : dire qu'un palier est franchi n'est pas un compte des restants, mais la rédaction doit rester dans ce cadre.

**Contre-vérification.** Deux inexactitudes. (1) « Aujourd'hui il produit “X % de moins que ton bilan précédent” » : cette phrase vient de `variationNote` (`src/types/suivi.ts` l.53) et s'affiche sur `/suivi` (index l.212-215), **pas** sur la restitution — l'écart entre deux bilans n'apparaît donc nulle part en mode `nouveau`, ce qui rend le constat plus fort que ce qu'il dit, mais aussi partiellement livré ailleurs (v1-07 étape 4 marquée « fait »). (2) La recommandation « comparer au `targetKg` du cycle précédent (stocké sur `plan_cycles`) » n'est pas toujours possible : `generate_plan_cycle_for_user` fait `on conflict (user_id, period_start) do update set baseline_co2_kg_year = excluded...` (`20260905130000` l.707-714), donc un re-bilan dans la **même** saison réécrit la ligne et efface le palier visé. Il faudrait soit figer la cible atteinte ailleurs, soit ne l'afficher que quand le cycle précédent est d'une autre période. Sévérité abaissée : rien n'est faux à l'écran, c'est un renforcement manquant, et la partie « écart entre deux bilans » existe déjà sur `/suivi`.


### A13-11 — L'intention a des jours mais aucun signal dans le contexte : le rappel est rétrospectif, jamais au moment de la décision

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort grand

La personne choisit « le mardi et le jeudi ». Côté serveur, `intention_days` n'est lu que par l'export ; le seul message de la semaine est la question du lundi, qui arrive avant les jours choisis et regarde en arrière. La recherche sur les intentions d'implémentation et la formation d'habitude est sans ambiguïté : c'est le signal contextuel au moment de l'action (la veille au soir, le matin même), pendant les premières semaines, qui fait passer de l'intention au geste ; un bilan hebdomadaire rétrospectif n'y suffit pas. Le produit a le jour, le canal, et le jeton ; il ne manque que le message.

Preuves : `supabase/migrations/20260905190000_engagement_action.sql:31` ; `supabase/migrations/20260907230000_rappels_canal.sql:585` ; `src/components/compte/choix-de-rappel.tsx:41`

**Recommandation.** Un coup de pouce **prospectif et opt-in** (case distincte sur la feuille ou dans « Toi » : « Un mot la veille de mes jours ? »), envoyé la veille au soir du premier jour d'intention, uniquement pendant les ~10 premières semaines d'un engagement, une ligne de Ramille sans chiffre (« Demain, c'est ton jour vélo. »), jamais après un refus, et coupé automatiquement à la fin de la fenêtre. Table à part ou ligne `notification_outbox` sans `checkin_id`.

**Décision documentée concernée.** spec-fonctionnelle §7 (l. 189) « pas de notification insistante ni répétée » ; v1-12 §2.1 « Jamais les deux pour un même point » et le libellé « Un mot à chaque point de suivi, jamais plus » (`choix-de-rappel.tsx:41`). Rouvre explicitement la règle « un message par point » en ajoutant un message d'une autre nature, opt-in et borné dans le temps.

**Contre-vérification.** À traiter comme une proposition d'increment à arbitrer produit, pas comme un défaut. Si elle est retenue, deux points que le constat ne dit pas : la fenêtre « ~10 premières semaines » suppose une date de début d'engagement — `plan_actions.committed_at` existe (`20260905190000` l.31-61), donc c'est dérivable, mais l'action engagée est effacée/regénérée à chaque reconstruction de cycle (`delete from plan_actions where plan_cycle_id = ...`, `20260905130000` l.717), ce qui remettrait le compteur à zéro sans que personne ne le voie ; et le canal doit passer par `reminder_channel_for()` (v1-12 §3, table de vérité doublée en `src/types/rappels.ts`) sous peine de contourner la préférence « none ». Une variante beaucoup moins coûteuse et non contradictoire : déplacer le rappel hebdomadaire existant du lundi matin au **dimanche soir / veille du premier jour d'intention** — même message, même unicité, signal contextuel gagné sans ajouter d'envoi.


### A13-13 — « Une nouvelle saison a commencé » s'affiche sur un critère d'âge du bilan, pas sur un changement de saison

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

La carte de re-bilan du plan est titrée « Une nouvelle saison a commencé » alors que sa condition est `daysSince(assessmentDate) >= 182`. Elle peut apparaître au milieu d'une saison et rester jusqu'au re-bilan — une affirmation fausse sur l'écran où l'on revient le plus, et précisément sur le mot « saison » qui est la promesse du produit. Le suivi, lui, titre correctement « Ton dernier bilan a N mois ».

Preuves : `src/app/(tabs)/plan.tsx:523` ; `src/app/(tabs)/plan.tsx:339` ; `src/app/(tabs)/suivi/index.tsx:280`

**Recommandation.** Aligner le titre sur le fait (« Ton bilan a six mois »), ou réserver la formulation saisonnière à la carte d'ouverture de saison proposée en A13-6, dérivée de `period_start`.

**Contre-vérification.** Le constat rate que le commentaire au-dessus de la carte revendique explicitement « même règle que sur le suivi, même seuil, même lien » — le titre est donc le seul écart, ce qui rend le correctif d'autant plus petit et sans risque. Sur 182 jours, la carte peut d'ailleurs apparaître à peu près n'importe où dans une saison, y compris le lendemain d'une ouverture de saison, où elle dirait deux fois faux. Correctif minimal : reprendre la formulation factuelle du suivi (« Ton bilan a six mois »), la saison restant le vocabulaire de `plan_cycles.period_label` que l'écran affiche déjà par ailleurs.


### A13-14 — En relecture d'un ancien bilan, le palier est calculé sur le cap du cycle courant et la phrase renvoie à un plan qui n'est pas là

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

L'écran lit toujours le `plan_cycles` le plus récent, sans lien avec l'`id` du bilan consulté : un bilan d'il y a un an affiche « Ton prochain palier » avec un cap dérivé du bilan actuel — mélange de deux états. Et `palierNote` dit « Le plan qui suit propose de quoi la franchir » alors qu'en mode `relecture` le bouton vers le plan n'est pas rendu.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:190` ; `src/app/(tabs)/suivi/bilan.tsx:138` ; `src/app/(tabs)/suivi/bilan.tsx:474`

**Recommandation.** En `relecture`, ne pas afficher de palier (ou afficher celui du cycle dont `created_at` suit ce bilan, en le nommant au passé), et retirer la mention du « plan qui suit ».

**Contre-vérification.** Ce que le constat rate : les deux branches spéciales de `palierNote` (`beyondTarget2050`, `isTarget2050`) ne mentionnent pas le plan, donc seul le chemin courant est fautif — le correctif de texte tient en une condition sur `mode`. Plus fort que la recommandation proposée : ne pas afficher de palier du tout en relecture est la seule option sûre, car il n'existe aucun lien de données entre un `assessment` et le `plan_cycle` qu'il a engendré (`plan_cycles` porte `user_id` + `period_start`, pas d'`assessment_id`) — « le cycle dont `created_at` suit ce bilan » n'est donc pas une requête fiable, seulement une heuristique temporelle. Note aussi que la relecture reste rare (il faut au moins deux bilans), ce qui justifie de garder la sévérité mineure.


### A13-15 — La proposition de compte promet « un historique de points mensuels » alors que la boucle principale est hebdomadaire et saisonnière

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le texte de l'écran de connexion date de la boucle unique mensuelle (remplacée le 27/08/2026). Il sous-vend ce que le compte protège réellement — les saisons, les réponses hebdo, la comparaison d'un bilan à l'autre — à l'instant où la personne décide si son suivi lui survivra. C'est aussi le moment d'appartenance le plus sensible du parcours.

Preuves : `src/app/connexion/index.tsx:101`

**Recommandation.** « Avec un compte, il te suit d'un appareil à l'autre, saison après saison : tes bilans, tes réponses, ton plan. »

**Contre-vérification.** Le constat rate un renfort utile : l'écran affiche juste en dessous une carte « Ce qui est déjà enregistré » avec le total et le poste dominant (l.105-116), donc la promesse concrète est déjà à moitié faite par les données — la phrase n'a qu'à nommer la durée (saisons, réponses, comparaison d'un bilan à l'autre) plutôt qu'une cadence fausse. Attention en réécrivant : cet écran n'est pas la voix de Ramille mais la voix produit, et la mascotte y est déjà rendue en `mood="calm"` — ne pas y glisser un « je ».


### A13-16 — Aucun cadrage identitaire : les réponses s'additionnent en compteur, jamais en « quelqu'un qui »

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort petit

Le seul signal cumulatif est « N fois où tu as changé quelque chose » et la réplique fixe « Bien joué — chaque changement compte ». La spec §2 fonde le refus des points/badges sur la préservation d'une motivation identitaire (« je deviens quelqu'un qui… »), mais rien dans le parcours ne nomme cette identité : pas à l'onboarding, pas après un Oui, pas au re-bilan. v1-06 §1 rouvre les mécaniques de progression non comparatives — c'est exactement la place d'un cadrage « soi face à soi ».

Preuves : `src/app/(tabs)/suivi/index.tsx:253` ; `src/constants/mascotte.ts:41` ; `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md:22`

**Recommandation.** Sous le compteur du suivi (voix produit), une phrase qui attribue le choix à la personne : « Ces fois-là, c'est toi qui as choisi le trajet. » ; au re-bilan en baisse : « C'est le résultat de tes choix, pas d'une moyenne. » Aucune comparaison, aucun seuil.

**Contre-vérification.** Deux contraintes que la recommandation doit respecter et qu'elle n'énonce pas : la phrase proposée doit venir de la **voix produit** et non de `RAMILLE`, sinon elle tomberait sous la règle « jamais un chiffre dans sa bouche » dès qu'elle voisine le compteur, et sous « les répliques de check-in ne se réécrivent pas » si on la met après un Oui. Le meilleur emplacement est donc le sous-titre déjà présent sous le compteur du suivi (`'Chaque fois compte, même isolée.'`), qui est exactement le slot à remplacer — pas un ajout d'élément. Et un cadrage identitaire doit rester descriptif du passé (« c'est toi qui as choisi ») plutôt que prescriptif d'un rôle (« tu es quelqu'un qui… »), sans quoi il se lit comme une étiquette à tenir, ce qui rouvre le risque d'abandon que le non-goal streak cherchait à écarter.


### A13-17 — Deux répliques fixes pour des centaines de points : adaptation hédonique garantie sur dix-huit mois

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort petit

Une personne avec les deux boucles reçoit ~64 questions par an, formulées identiquement, et n'entend que deux phrases en retour. La répétition stricte est utile pour l'habitude (contexte stable), mais la réponse émotionnelle s'éteint : au bout de quelques mois « Bien joué » ne renforce plus rien. Ce n'est pas un problème aujourd'hui (produit jeune), c'en sera un pour la personne qu'on veut encore là dans dix-huit mois.

Preuves : `src/constants/mascotte.ts:44` ; `src/components/checkin-card.tsx:82`

**Recommandation.** Un petit jeu de 3-4 variantes par issue dans `RAMILLE` (toujours sans chiffre, testées par le même garde), choisies de façon déterministe par `period_start` ; la question elle-même reste stable (c'est le signal).

**Décision documentée concernée.** CLAUDE.md et `mascotte.ts:21-22` : « Les répliques de check-in sont celles des maquettes validées : on ne les réécrit pas ». Ajouter des variantes sans retirer les originales reste une réouverture de cette règle.

**Contre-vérification.** Le précédent cité dans `mascotte.ts` est aussi le chemin praticable : une variation ne devient légitime qu'appuyée sur un signal d'usage, et `usage_events` (v1-08) est le seul endroit qui pourrait le produire — sauf que `checkin_answer` est explicitement interdit comme événement (le fait vit dans `engagement_checkins.response`), donc rien ne mesurera l'usure de la réplique : le constat est structurellement invérifiable en l'état, ce qu'il faut dire à la synthèse. Deux détails techniques que la recommandation sous-estime : le test de garde impose déjà « aucun chiffre / pas d'injonction » sur toute ligne de `RAMILLE`, et le tirage déterministe par `period_start` demande de passer cette valeur à `checkin-card.tsx`, qui reçoit aujourd'hui le check-in entier — donc faisable sans nouvelle donnée. Enfin, le constat surestime le volume : une personne n'a les deux boucles que si les deux postes existent, et les points non répondus sont clos en `expired` sans jamais montrer de réplique.


### A13-18 — L'autonomie s'exerce sur deux actions seulement ; les autres leviers viables restent invisibles

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

`estimate_action_savings` calcule toutes les actions dont le gain dépasse 5 kg/an, mais la génération n'en fige que deux. La personne choisit entre deux propositions ; si aucune ne lui convient (vélo impossible pour une raison que le bilan ignore, télétravail refusé par l'employeur), elle n'a pas de troisième porte, et l'autodétermination — qui conditionne la durée de l'engagement — se réduit à accepter ou ne rien faire.

Preuves : `supabase/migrations/20260905130000_actions_chiffrees.sql:735` ; `src/components/plan/action-commitment.tsx:127`

**Recommandation.** Figer toutes les actions ≥ 5 kg sur `plan_actions` avec leur `rank`, n'en afficher que deux, et offrir « Voir d'autres pistes » qui déplie les suivantes — même carte, même engagement. Pas de saisie libre.

**Décision documentée concernée.** spec-fonctionnelle §6 (l. 174) : « 1 à 2 actions suggérées ». La proposition garde deux actions en avant et ajoute un dépliage.

**Contre-vérification.** La recommandation est architecturalement propre — `plan_actions` porte déjà `rank` (calculé par le même `row_number() over (...)`), donc lever le `limit 2` suffit et l'ordre reste identique — mais elle rate trois conséquences. (1) `plan.tsx` dérive `actionsCount = cycle.plan_actions.length` et l'utilise pour décider l'affichage du disclaimer ADEME et de l'état « aucune action ne vaut la peine » : figer plus de lignes change ce compteur, il faudrait le baser sur les deux premières. (2) L'index unique partiel « une seule action engagée par cycle » ne change pas, donc le dépliage n'affaiblit pas la règle d'engagement. (3) Le vrai plafond n'est pas `limit 2` mais le filtre de contexte B4 + le seuil des 5 kg : pour un profil rural sans transports en commun, le dépliage rendrait souvent zéro action de plus, donc le bouton devrait être conditionné à l'existence réelle d'un rang ≥ 3 sous peine de promettre une porte vide. Côté décision, `spec-fonctionnelle §174` (« 1 à 2 actions suggérées ») borne ce qui est *suggéré* et non ce qui est *stocké* : figer tout et n'afficher que deux ne l'enfreint pas.


### A13-19 — Les actions nomment un geste mais n'aident pas à le rendre faisable (capacité, au sens COM-B)

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

La carte d'action porte le titre, le gain et un détail chiffré. Rien n'abaisse le coût de la première fois : pas de premier pas (« teste l'itinéraire un jour sans contrainte »), pas de repère pratique. Or le principal prédicteur d'un premier essai est la perception de facilité, et la première occurrence est ce qui manque le plus entre « Je m'y engage » et la question du lundi.

Preuves : `src/components/plan/action-card.tsx:99` ; `supabase/migrations/20260905130000_actions_chiffrees.sql:142`

**Recommandation.** Une colonne `first_step` sur `action_templates` (une ligne, sans chiffre, rédigée avec le soin des briques 1-2), affichée uniquement une fois l'action engagée, sous l'intention.

**Contre-vérification.** Deux nuances que le constat rate, dans les deux sens. (1) À la baisse : le choix d'intention (`intention_days` / `intention_timing`, chips « Quels jours ? » / « Quand ? ») EST déjà une implementation intention explicite — le levier le mieux établi sur la première occurrence ; le manque porte donc sur le how-to pratique, pas sur la planification. (2) À la hausse, et c'est le vrai trou : cette intention n'est jamais réutilisée après « C'est noté ». `generate_commute_checkins()` / `generate_extras_checkins()` (dernière version : 20260904200000_checkin_email_reminders.sql l. 111-168) n'ancrent le check-in que sur `assessment_results.commute_poste_label` / `.extras_poste_label` ; `grep intention_days supabase/migrations/` ne renvoie rien côté check-in ni côté rappel. La personne s'engage « le mardi et le jeudi » et le lundi la question ne le sait pas. Rappeler l'intention dans le rappel et dans la question coûte moins qu'une nouvelle colonne rédactionnelle et agit sur le même mètre manquant — à faire avant `first_step`. Enfin, si `first_step` est ajouté, deux gardes du dépôt s'y appliquent : `src/app/conditions.tsx` l. 60 affirme que Ramille « ne fournit ni conseil professionnel, ni prestation de conseil en mobilité » (une ligne de premier pas reste compatible, à condition qu'elle décrive un essai et non une prescription), et la spec fonctionnelle §6 demande « fonctionnel simple, pas de sur-ingénierie » pour la brique 3 — une ligne par template passe, un vivier de conseils non.


### A13-20 — Aucune norme dynamique : le contexte chiffré fige une moyenne 2017 sans dire que les pratiques bougent

`fonctionnel` · sévérité **mineur** · verdict **contredit_decision** · effort moyen

L'onboarding et la restitution ne présentent que des niveaux (moyenne, cible). La littérature sur les normes dynamiques montre qu'un énoncé sourcé sur une évolution collective (« de plus en plus de trajets se font à vélo ») soutient le changement sans classement ni comparaison entre utilisateurs — compatible avec le non-goal. Il manque aussi une nuance : le total 2017 de 9,5 t est présenté « en moyenne » alors que la série récente est à 8,2 t, ce qui pourrait être dit comme une tendance.

Preuves : `src/components/onboarding/etape-contexte.tsx:42` ; `src/constants/carbon-reference.ts:21`

**Recommandation.** Uniquement si une source publique existe (la règle de `carbon-reference.ts` est absolue) : une ligne de tendance sourcée sur l'écran de contexte (ex. évolution de la série SDES, ou part modale vélo INSEE), formulée comme un mouvement collectif, jamais comme un rang.

**Contre-vérification.** La fonction visée est légitime et atteignable sans toucher aux repères : une norme dynamique n'a pas besoin d'un chiffre. Le produit a déjà l'endroit pour ça — la voix de Ramille (`src/constants/mascotte.ts`), à qui CLAUDE.md interdit justement tout nombre (« jamais un nombre dans sa bouche ») : un mouvement collectif dit en mots, sans rang ni comparaison entre utilisateurs, respecterait à la fois le non-goal et la règle de source. Ce que le constat rate aussi : le produit couvre déjà la moitié comportementale du besoin par la trajectoire personnelle — `/suivi` montre l'évolution d'un bilan à l'autre (v1-07 §§3, 4), sans streak ni échec. Ce qui manque n'est donc pas « du mouvement », c'est du mouvement collectif. Si une ligne de tendance devait malgré tout être chiffrée, elle exigerait de reprendre AUSSI la ventilation par postes de la même année (règle explicite de CLAUDE.md), ce qu'aucune publication SDES ne fournit pour 2024 — d'où l'effort réel bien supérieur à « moyen ».


## C — complétude

**Résumé du lecteur.** Le découpage par zones a couvert presque tout le dépôt : les seuls fichiers que personne n'a lus nommément (`/status`, `+html.tsx`, `app-url.ts`, `bande-haute`, `compte-bouton`, `onglet-icone`, la config EAS/CI) ne cachent rien de grave, et les cohérences transverses que j'ai vérifiées mécaniquement tiennent — `BilanAnswers` est exactement le miroir des colonnes d'`assessment_answers`, les sept RPC appelés par le client existent dans `database.types.ts`, les quinze événements d'usage sont émis, toutes les routes exportées ont un titre. Ce qui manque à l'inventaire est d'un autre ordre : des trous entre deux zones et des questions de durée. Entre les zones, trois choses : aucun écran ne porte de filet d'erreur, donc toute exception de rendu en production affiche l'écran anglais par défaut d'Expo Router (« Something went wrong ») sans qu'aucune remontée n'existe ; le lien du rappel — la seule porte de retour du produit — ouvert sur un ordinateur ou un nouveau téléphone tombe sur « Ton bilan n'est pas encore fait » avec pour seule issue « Faire mon bilan » ; et la restitution ne dit à aucun moment d'où vient le chiffre ni ce qu'il inclut, alors que la distinction ACV est décrite comme la plus coûteuse du produit et rend le total incomparable aux autres calculateurs. Dans la durée : les rappels partent chaque semaine, sans jamais s'espacer, à tout compte qui a fait un bilan — et les comptes rattachés ne sont jamais purgés — sur un quota Resend de 100 emails par jour ; une limite de plateforme (sign-ins anonymes par IP) transforme un atelier de sensibilisation en classe en écran d'échec ; un drapeau de `config.toml` daté du 30/10/2026 fera tomber la CI pgTAP ; et rien, nulle part, ne parle de sauvegarde d'une base qui est le seul exemplaire de toutes les données. Enfin, un bilan erroné ne peut jamais être retiré de l'historique, ce qui fausse à jamais la trajectoire que le suivi est fait pour montrer.

**Points forts à ne pas casser**

- La cohérence écran ↔ schéma est réellement tenue là où elle est la plus fragile : `BilanAnswers` (`src/types/bilan.ts`) est le miroir exact des colonnes d'`assessment_answers` (vérifié champ par champ, zéro écart hors `assessment_id`/`updated_at`), et chacun des sept RPC appelés depuis `src/` (`commit_plan_action`, `clear_plan_action_commitment`, `compute_assessment_results`, `delete_my_account`, `export_my_data`, `register_push_token`, `unregister_push_token`) a sa signature dans `database.types.ts`.
- `+html.tsx` pose `lang="fr"` sur l'export statique — le gabarit par défaut d'Expo annonce `en`, et ce fichier explique pourquoi il ne fait que ça et pourquoi le reste (`ScrollViewStyleReset`, viewport) doit rester. Une correction d'accessibilité et de référencement invisible mais juste, à ne pas « nettoyer ».
- `api/partage.ts` échappe systématiquement tout ce qui vient de l'URL (`escapeHtml` sur titre, description, alt), borne `poste` à 120 caractères et `percent` à [0, 100], et `api/share-card.ts` sert l'image en `cache-control: public, immutable, max-age=31536000` — la seule fonction coûteuse (satori + resvg) n'est rendue qu'une fois par carte, chaque aperçu WhatsApp suivant est servi par le CDN.
- La chaîne des crons est ordonnée sans collision : sync des facteurs 3h, purge des événements 3h30, purge des anonymes 4h, cycles du plan 5h, check-ins 6h, envoi 7h, reçus push 8h (UTC). Chaque fonction est révoquée de `public, anon, authenticated`, et la purge se fait sur quatre signaux d'activité avec `created_at` en plancher.
- `RetourDeNotification` et le `data.url = '/plan'` posé par `send_pending_reminders` (rappels_canal.sql:341) se correspondent exactement : la charge utile du push et le composant qui la lit sont écrits en deux endroits mais avec la même valeur littérale — c'est le genre de couple qu'un test d'intégration ne couvre pas et qui tient ici.
- `app.config.js` isole `google-services.json` hors du dépôt via une variable d'environnement de type fichier, et l'`intentFilter` d'`app.json` ne revendique que `/plan` : la frontière entre ce qui doit s'ouvrir dans l'app et ce que Google Play exige d'atteindre sans elle est tenue au niveau de la configuration, pas seulement documentée.

### C-1 — Aucun filet d'erreur dans l'arbre : une exception de rendu affiche l'écran anglais par défaut d'Expo Router, et personne ne l'apprend

`technique` · sévérité **important** · verdict **confirme** · effort petit

Aucune route de `src/app/` n'exporte d'`ErrorBoundary`, et le layout racine monte la `Stack` nue. Expo Router retombe alors sur son composant interne, qui rend « Something went wrong », « Error: <message> » et un bouton « Retry » — en anglais, sans la voix du produit, sur un produit dont CLAUDE.md dit l'interface « exclusivement en français ». Le dépôt ne contient aucune remontée d'erreur client (ni Sentry, ni équivalent, seulement des `console.error`) : une exception qui n'arrive qu'en production sur Android — le seul environnement que ni Jest, ni Playwright, ni le typecheck ne voient — est invisible pour l'équipe et incompréhensible pour la personne. La garde de rendu de la CI (`verifier-rendu-export.mjs`) ne couvre que la page blanche au chargement, pas une exception après interaction.

Preuves : `src/app/_layout.tsx:111` ; `node_modules/expo-router/build/views/ErrorBoundary.js:18` ; `src/app/index.tsx:59`

**Recommandation.** Exporter un `ErrorBoundary` depuis `src/app/_layout.tsx` (Expo Router le prend en compte pour toute la pile) qui rend un écran en français dans le registre de `index.tsx` — message technique isolé pour être recopié, bouton « Réessayer » — et y brancher une remontée minimale (au moins un événement d'usage `app_error` sans texte libre, ou un service dédié). Étendre `verifier-rendu-export.mjs` pour vérifier qu'aucune page rendue ne contient « Something went wrong ».

**Contre-vérification.** Deux points que le constat rate. (1) La partie « écran anglais » est la moitié la moins grave : sur un build natif de production, l'ErrorBoundary d'Expo Router est un pis-aller, mais le vrai trou est qu'aucune exception Android ne remonte à qui que ce soit — c'est la même famille de défaut que celle qui a fait livrer la page blanche du 08/09/2026, et cette fois aucun script de CI ne peut la voir. (2) La remontée proposée via `usage_events` est plus fragile qu'il n'y paraît et il faut le dire : un événement `app_error` exige une ligne dans `public.usage_event_types` par migration ET une entrée dans `src/types/analytics.ts` (sinon insert rejeté en silence), et surtout `track()` a besoin d'une session — or les crashs les plus intéressants sont précisément ceux du démarrage, où la session n'existe pas encore. Un événement qui ne part jamais se lit « zéro » (règle CLAUDE.md), donc soit on accepte un service dédié, soit on borne explicitement `app_error` aux erreurs post-session.


### C-2 — Le lien du rappel ouvert sur un autre appareil mène à « Ton bilan n'est pas encore fait », sans chemin vers « Retrouver mon compte »

`fonctionnel` · sévérité **important** · verdict **confirme** · effort petit

L'email de rappel ne porte qu'une URL, `https://www.ramille.fr/plan`. Ouverte sur un ordinateur, sur un téléphone neuf ou dans un navigateur où l'app n'est pas installée, elle arrive dans un contexte où `ensureSession()` vient de créer une session anonyme vide : l'onglet Plan répond `no_assessment` et affiche « Ton bilan n'est pas encore fait — Sans bilan, on ne peut pas savoir… » avec pour seul bouton « Faire mon bilan ». La personne qui vient de recevoir un rappel *pour son bilan* lit qu'elle n'en a pas, et le seul chemin vers son compte (`/connexion/retrouver`) n'est atteignable que depuis l'accueil de l'onboarding ou depuis « Toi › Rattacher un compte › email » — trois écrans plus loin, sans indice. C'est le croisement de deux zones (rappels SQL, plan front) que chacune a vu de son côté sans voir la jonction : la seule porte de retour du produit dans la durée débouche, hors de l'appareil d'origine, sur une invitation à recommencer de zéro.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:216` ; `src/app/(tabs)/plan.tsx:299` ; `src/app/(tabs)/plan.tsx:305`

**Recommandation.** Sur l'état `no_assessment` du plan (et de `/suivi`), ajouter un lien secondaire « J'ai déjà un compte » vers `/connexion/retrouver`, comme sur l'accueil de l'onboarding. À terme, faire porter au lien du rappel un paramètre qui permette à l'écran de dire « Ce rappel concerne un compte — retrouve-le ici » plutôt que « tu n'as pas de bilan ».

**Contre-vérification.** Deux précisions utiles à la synthèse. (1) L'email porte déjà une consigne de désinscription en texte (« désactive-les depuis « Toi » dans l'app ») : elle est inopérante dans exactement le même scénario, puisque « Toi » sur un appareil neuf règle la préférence de la session anonyme vide, pas celle du compte qui reçoit les rappels — le correctif du lien « J'ai déjà un compte » répare donc aussi ce chemin. (2) Attention au périmètre du lien profond : `public/.well-known/assetlinks.json` ne revendique que `https://www.ramille.fr/plan`. Si le paramètre suggéré (« ce rappel concerne un compte ») change l'URL du rappel, il doit rester sous `/plan` (query string, pas nouveau chemin) sinon le lien cesse d'ouvrir l'app sur Android — régression silencieuse.


### C-3 — Aucun écran ne dit d'où vient le chiffre ni ce qu'il inclut : la restitution n'a pas une ligne de source

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

La restitution affiche le total sous « Estimation annuelle, tous déplacements » et rien d'autre : ni la source des facteurs, ni le fait que le chiffre inclut la fabrication des véhicules (ACV complète), ni les hypothèses de calcul. Le mot « ADEME » n'apparaît que sur l'écran du plan, en pied de liste, et sur l'écran d'attente. Or CLAUDE.md décrit le choix ACV comme « la distinction la plus coûteuse du produit » — c'est précisément ce qui fait qu'une personne qui compare son résultat à un autre calculateur (Nos Gestes Climat, une compagnie aérienne, un simulateur d'usage seul) verra un écart de 30 % à 450 % sur la voiture électrique sans qu'aucun écran ne l'explique. Pour un produit de prise de conscience, la question « d'où sort ce chiffre ? » est la première qu'on se pose devant lui, et c'est aussi ce qui fonde la crédibilité de tout ce qui suit (palier, actions). Distinct de A3-19 (équivalences concrètes) et de A7-7 (distances des vols) : il s'agit de la transparence de la méthode, pas de la lisibilité du nombre.

Preuves : `src/app/(tabs)/suivi/bilan.tsx:373` ; `src/app/(tabs)/suivi/bilan.tsx:376` ; `src/app/(tabs)/plan.tsx:511`

**Recommandation.** Ajouter sous le total une ligne dépliable « Comment ce chiffre est calculé » : source (ADEME Base Empreinte via Impact CO2), périmètre (usage + fabrication, ce qui explique un vélo non nul et une électrique plus lourde qu'ailleurs), hypothèses (1500/9000 km par vol, 50/50 du second mode, 46 semaines). Le texte vit dans une constante à côté de `carbon-reference.ts`, jamais dans l'écran, et la date de version des facteurs (`emission_factors.valid_from`) peut y figurer puisqu'elle est déjà figée par bilan.

**Contre-vérification.** Une correction factuelle à reporter : le mot ADEME n'apparaît pas seulement sur le plan (l. 511) et l'écran d'attente (`src/components/bilan/calcul-en-cours.tsx` l. 33) — il est aussi dans `src/app/conditions.tsx` (l. 47 et 128) et `src/app/confidentialite.tsx` (l. 273, qui nomme même la Base Empreinte et l'API publique). Le constat tient quand même, et se renforce : la mention existe déjà, mais uniquement là où personne ne la cherche (pages légales), pas à côté du chiffre. Deux garde-fous pour la rédaction : la phrase doit dire l'endpoint réellement interrogé (ACV complète, usage + fabrication) sans jamais laisser croire à une mesure, et elle ne doit pas être mise dans la bouche de Ramille — c'est un texte qui porte des nombres (1500/9000 km, 46 semaines), et la mascotte ne compte jamais (CLAUDE.md). Enfin la date de version des facteurs ne se lit pas dans `assessment_results` : il faut la remonter depuis `emission_factors.valid_from` borné par `public.emission_factor(mode_id, date)`, donc soit une colonne figée de plus au calcul, soit un libellé plus modeste (« facteurs en vigueur à la date de ton bilan »).


### C-4 — Les rappels partent chaque semaine, sans jamais s'espacer, à tout compte qui a fait un bilan — et un compte rattaché n'est jamais purgé

`fonctionnel` · sévérité **important** · verdict **confirme** · effort moyen

`generate_commute_checkins()` crée un point pour **chaque** utilisateur ayant un bilan complété, sans condition d'activité ; `enqueue_checkin_reminders()` met en file un message pour **chaque** point en attente dont un canal existe. Aucun des deux ne regarde si les dix, vingt ou cent points précédents ont été laissés sans réponse. La purge, elle, ne touche que `is_anonymous = true` : une personne qui a rattaché son email puis désinstallé l'app recevra 52 emails par an, indéfiniment. C'est en contradiction avec la doctrine écrite dans `checkin-card.tsx` (« jamais de notification insistante ni répétée ») et avec le ton du produit — la relance qui ne s'arrête jamais est la forme la plus douce de harcèlement — et c'est un problème de durée : le quota Resend est de 100 emails par jour (v1-10 §6), consommé en priorité par les comptes muets puisque l'envoi est plafonné à 100 par passage sans priorité. A9-7 relève l'absence de lien de désinscription ; ici c'est l'absence de décroissance qui rend ce lien indispensable.

Preuves : `supabase/migrations/20260904200000_checkin_email_reminders.sql:128` ; `supabase/migrations/20260907230000_rappels_canal.sql:235` ; `supabase/migrations/20260907093000_purge_anonyme_sur_inactivite.sql:43` ; `src/components/checkin-card.tsx:187`

**Recommandation.** Dans `enqueue_checkin_reminders()`, ne mettre en file que si le nombre de points consécutifs `expired` depuis la dernière réponse est sous un seuil (par ex. 4), puis passer à un rythme mensuel, puis se taire — en gardant le point généré (l'app le montre toujours) : la personne ne perd rien, seul le message s'espace. Le retour dans l'app (`app_open` ou une réponse) remet le compteur à zéro. Épingler la règle par un test pgTAP, et dire cette décroissance dans la politique de confidentialité.

**Contre-vérification.** À nuancer sur un point et à durcir sur un autre. Nuance : l'email porte déjà une sortie (« Pour ne plus recevoir ces rappels, désactive-les depuis « Toi » dans l'app »), donc ce n'est pas une relance sans issue — mais elle exige de rouvrir l'app, ce que par hypothèse la personne ne fait plus, et elle échoue si elle est ouverte sur un autre appareil (cf. C-2). Durcissement : la décroissance ne peut pas se calculer sur `usage_events` seuls (`track()` est fire-and-forget et renonce sans session, v1-10 §7) — le compteur fiable est le nombre de check-ins `expired` consécutifs depuis le dernier `responded_at`, qui vit déjà dans `engagement_checkins` et ne demande aucune table nouvelle. Attention enfin à ne pas casser la garantie structurelle de la spec §7 en implémentant : le seuil doit s'appliquer à la mise en file (ne pas insérer la ligne d'outbox), jamais à l'envoi, sinon on se met à créer des lignes qu'on ne pourra pas distinguer d'un repli push→email — lequel est, par décision, une mise à jour de la même ligne.


### C-6 — `auto_expose_new_tables` porte une date de suppression au 30/10/2026 : la CI pgTAP tombera ce jour-là, car aucune migration ne porte de GRANT explicite

`technique` · sévérité **important** · verdict **confirme** · effort moyen

`supabase/config.toml` documente lui-même le piège : les tables ne sont exposées à `authenticated` que par ce drapeau de compatibilité, parce que le projet distant les a exposées à sa création et qu'aucune migration n'écrit de `grant`. Le commentaire fixe la date à laquelle le drapeau disparaît du CLI, et la CI installe le CLI en `version: latest` — la suppression s'appliquera donc d'elle-même au premier `npm ci` après cette date, et les tests échoueront sur « permission denied » avant même d'atteindre la RLS, exactement l'échec que le commentaire raconte. Plus grave dans la durée : une base reconstruite depuis les migrations (nouveau projet, restauration, environnement de test) n'accorde aucun privilège aux rôles applicatifs — les migrations ne décrivent pas le schéma réellement en production.

Preuves : `supabase/config.toml:31` ; `supabase/config.toml:33` ; `.github/workflows/ci.yml:87`

**Recommandation.** Écrire une migration qui pose les `grant` explicites (`usage on schema public`, `select/insert/update` sur les tables applicatives à `authenticated`, `select` sur les référentiels à `anon`, en cohérence avec les révocations existantes), retirer le drapeau de `config.toml` pour que la CI teste le vrai état des privilèges, et épingler par pgTAP que les grants sont ceux attendus. Épingler aussi la version du CLI dans la CI.

**Contre-vérification.** Deux réserves sur la formulation, et un piège d'exécution. Formulation : la date du 30/10/2026 est une note écrite par ce dépôt, pas une échéance publiée que j'aie pu vérifier — la synthèse ne doit pas l'énoncer comme un fait de la plateforme ; et le déclencheur n'est pas « le premier `npm ci` » mais l'action `supabase/setup-cli@v1` en `version: latest`, qui peut d'ailleurs casser la CI n'importe quel jour, indépendamment de ce flag — épingler la version du CLI est le correctif à effet immédiat et à coût nul, à faire d'abord. Piège d'exécution : la migration de `grant` doit être écrite en cohérence avec les révocations existantes (les fonctions internes sont révoquées `from public, anon, authenticated` — un `grant execute` large les rouvrirait) et ne pas accorder d'`update` large sur `plan_actions`, dont l'immuabilité repose précisément sur l'absence de policy UPDATE ; enfin elle n'est pas vérifiable dans cet environnement (pas de daemon Docker, donc `supabase test db` inexécutable) — la seule validation possible est de comparer les privilèges obtenus au réel du projet distant avant de figer le test pgTAP.


### C-7 — Aucune stratégie de sauvegarde nulle part : le projet distant est le seul exemplaire de toutes les données, et les migrations ne reconstruisent que le schéma

`technique` · sévérité **important** · verdict **confirme** · effort moyen

Le dépôt, le README, CLAUDE.md et les douze documents d'architecture ne contiennent aucune occurrence de « sauvegarde », « backup » ou « PITR ». Les migrations rejouent le schéma et les référentiels (facteurs, modes, actions), mais aucune donnée utilisateur — bilans, historique, engagements, check-ins répondus — n'existe ailleurs que dans le projet `TraceVerte-v1`. Le produit promet un suivi sur des années (« l'objectif 2050 ») : une base perdue ou corrompue (une migration de reprise en masse qui tourne de travers via `recompute_assessment_results`, une suppression accidentelle dans l'éditeur SQL, un projet Supabase mis en pause ou supprimé) efface d'un coup la seule chose que le produit accumule. Les seuls indices de plan Supabase dans les docs (« réservée au plan payant Supabase », v1-04 §2) suggèrent le palier gratuit, où les sauvegardes quotidiennes ne sont pas incluses.

Preuves : `README.md:34` ; `supabase/config.toml:3` ; `docs/architecture/v1-04-authentification.md:86`

**Recommandation.** Décider et documenter (dans le registre des réglages hors dépôt) le régime de sauvegarde : vérifier ce que le plan Supabase actuel inclut ; à défaut, un export `pg_dump` programmé (GitHub Action hebdomadaire vers un stockage chiffré, ou un script local documenté). Tester une fois la restauration sur un projet vide — c'est aussi ce qui révélerait C-6. Écrire une règle : toute reprise de calcul en masse se fait après un instantané.

**Contre-vérification.** Le constat sous-estime deux chemins de destruction déjà armés et automatiques : (1) `purge_stale_anonymous_accounts()` (20260907093000) fait un `delete from auth.users` chaque nuit sur un `greatest()` de six sous-requêtes — si une migration future renomme/vide une de ces colonnes, le compte paraît inactif depuis toujours et est supprimé en cascade, sans erreur et sans trace ; (2) `purge_usage_events()` supprime à 12 mois. Une sauvegarde n'est donc pas seulement une assurance contre l'incident humain, c'est le seul filet sous des crons destructeurs. Deux précisions pratiques pour la recommandation : un `pg_dump` doit inclure le schéma `auth` (sinon on restaure des données orphelines de tout utilisateur) et exige le mot de passe base / une connexion directe, pas la clé anon ; et sur plan gratuit il n'y a rien à « vérifier » côté Supabase — la décision se réduit à un dump programmé chiffré ou au passage au plan payant.


### C-11 — Les jetons d'appareil désactivés sont conservés indéfiniment : `unregister_push_token` marque, ne supprime jamais, et rien ne purge

`technique` · sévérité **important** · verdict **confirme** · effort petit

Un jeton retiré (permission coupée, changement de téléphone) est mis à jour avec `disabled_at` et jamais supprimé ; aucune migration ne contient de `delete from public.push_tokens`, et la purge d'inactivité ne concerne que les comptes anonymes entiers. Un identifiant d'appareil — que v1-10 §3.6 qualifie de donnée à déclarer à Google Play avec « durée, finalité, suppression » — reste donc en base sans limite de durée pour tout compte rattaché, alors que `usage_events` (12 mois) et la boîte d'envoi (A9-2) sont les autres cas de rétention qui ont ou attendent une règle. Complète A9-2 sur une table différente.

Preuves : `supabase/migrations/20260907230000_rappels_canal.sql:112` ; `docs/architecture/v1-10-connexion-et-rappels.md:216`

**Recommandation.** Ajouter à la purge quotidienne un `delete from public.push_tokens where disabled_at < now() - interval '90 days'`, et écrire cette durée dans la politique de confidentialité au même endroit que le jeton.

**Contre-vérification.** Le constat sous-estime : ce n'est pas seulement une règle de rétention absente, c'est une affirmation déjà écrite aux utilisateurs et contredite par le code. src/app/confidentialite.tsx (~lignes 200-202) annonce que l'identifiant de notification « disparaît si tu désinstalles l'application, si tu coupes les notifications, à la suppression de ton compte » : sur les quatre cas, seul le dernier est vrai (cascade sur auth.users). Couper les notifications ne fait que poser `disabled_at`, et une désinstallation n'aboutit au mieux qu'à un `DeviceNotRegistered` qui désactive lui aussi. C'est exactement le champ « suppression » de la déclaration de données Google Play (v1-10 §3.6) qui est faux, d'où la remontée en important. Correction la plus simple et la moins risquée : faire supprimer la ligne par `unregister_push_token` plutôt que la désactiver — la raison invoquée en commentaire (« éviter de réenregistrer en boucle un jeton refusé ») ne tient déjà pas, puisque `register_push_token` fait `on conflict do update set disabled_at = null` et que l'app réenregistre à chaque lancement ; garder la désactivation pour les seuls reçus Expo, et y ajouter la purge à 90 jours. Ne pas oublier de réaligner le texte de confidentialité dans le même mouvement.


### C-8 — Un bilan erroné ne peut jamais être retiré : ni policy de suppression, ni écran, et il fausse la trajectoire pour toujours

`fonctionnel` · sévérité **mineur** · verdict **confirme** · effort moyen

`assessments` n'a que trois policies (select, insert, update) et aucun `.delete()` n'existe côté client : la seule façon d'effacer un bilan est de supprimer le compte entier. Or un bilan se fait en cinq minutes avec des réponses approximatives (« on ajustera plus tard », dit l'onboarding), et une erreur — un zéro de trop dans la distance, « 10 vols » au lieu de 1 — produit un point aberrant dans le graphe du suivi. Le dédoublonnage par jour (`keepLatestPerDay`) n'y peut rien si l'erreur est remarquée le lendemain, et `variationNote` lira alors la correction comme une baisse spectaculaire ou l'erreur comme une hausse (« Une année n'est pas l'autre »). Pour un écran qui présente chaque variation comme un fait, un fait faux et inamovible est le pire cas. Aucune des zones A2 (questionnaire), A5 (suivi) ni A6 (compte) n'a posé la question « et si je me suis trompé ? ».

Preuves : `supabase/migrations/20260823094900_rls_policies.sql:47` ; `src/app/(tabs)/suivi/index.tsx:57` ; `src/types/suivi.ts:31`

**Recommandation.** Offrir depuis la relecture d'un bilan (`/suivi/bilan?id=`) une action « Retirer ce bilan de mon suivi » qui passe par un RPC `security definer` (jamais une policy DELETE, pour les mêmes raisons que l'engagement) et qui marque le bilan `withdrawn` plutôt que de le supprimer — le calcul reste reproductible, `keepLatestPerDay` et le graphe l'ignorent, et la génération du plan repasse sur le précédent. Formuler l'action sans registre d'erreur (« Ce bilan ne me ressemble pas »).

**Contre-vérification.** La recommandation est réalisable mais coûte plus que le constat ne le dit : `assessments.status` porte un CHECK `in ('in_progress','completed')` (20260823094800_core_schema.sql:56), donc un état `withdrawn` impose une migration de contrainte, et surtout la valeur `completed` est lue à au moins trois endroits dans src/lib/bilan-history.ts (lignes 24, 88) plus la racine de l'app pour router, plus `generate_plan_cycle_for_user`/`compute_assessment_results` côté SQL : un retrait qui n'exclut pas le bilan partout laisse le plan et les libellés de check-in snapshottés sur un bilan retiré. Alternative moins chère et cohérente avec le préremplissage existant (brouillon > dernier bilan complété) : puisque refaire le bilan est déjà quasi gratuit, il suffirait d'élargir la fenêtre de dédoublonnage de `keepLatestPerDay` (dernier point par jour → par période courte, ou « remplacer mon dernier bilan » proposé tant qu'aucun cycle de plan n'a démarré), sans nouvel état en base.


### C-10 — Tous les comptes externes tiennent à une seule personne, et le dépôt n'a pas de registre des réglages qui vivent hors de lui

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le projet EAS est sous un compte personnel (`owner: antoineberthaud`), le projet Supabase, Vercel, Resend, Google Cloud (OAuth), Google Play et le domaine sont nommés dans les docs mais aucun fichier n'en dresse la liste avec ce qui y est configuré (Redirect URLs, SMTP, Rate Limits, gabarits, secrets Vault `resend_api_key`/`reminder_from_address`/`expo_access_token`/`app_url`, `GOOGLE_SERVICES_JSON`, empreintes de signature d'`assetlinks`). L'historique git ne compte que deux auteurs, dont un outil. Pour un produit qui promet des années, c'est le point de défaillance le plus simple : une seule indisponibilité et aucun tiers ne peut ni publier une mise à jour Play (obligatoire chaque année pour le niveau d'API cible), ni renouveler une clé, ni retrouver quel réglage tient quoi. A10-10 a relevé le cas des Redirect URLs ; le problème est général.

Preuves : `app.json:113` ; `app.config.js:128` ; `docs/architecture/v1-12-rappels.md:380`

**Recommandation.** Un fichier `docs/exploitation.md` (ou `v1-13`) qui liste chaque service, le compte qui le porte, les réglages hors dépôt et leur dernière relecture — sans aucune valeur secrète — et une décision sur la continuité (organisation Expo/Vercel/Supabase plutôt que compte personnel, second propriétaire, gestionnaire de secrets partagé). C'est aussi le seul endroit où C-5, C-7 et C-9 peuvent être suivis.

**Contre-vérification.** Le constat rate que des morceaux de registre existent déjà et devraient être rassemblés plutôt que réécrits : v1-10 §8 (tableau des réglages Supabase à déclarer : Site URL, Redirect URLs, SMTP, rate limits, gabarits), v1-12 §5.2 et §7 (Firebase, variable EAS fichier, secrets Vault), CLAUDE.md (assetlinks et empreintes de signature). Priorité pratique dans la liste proposée : le compte Google Play Console est le seul dont le transfert est quasi impossible après coup et le seul qui porte une obligation calendaire (niveau d'API cible annuel) — c'est donc lui, avant Expo/Vercel/Supabase, qui justifie un second propriétaire dès la publication.


### C-12 — Aucun en-tête de sécurité HTTP sur le site : `vercel.json` n'a pas de section `headers`

`technique` · sévérité **mineur** · verdict **confirme** · effort petit

Le déploiement ne pose ni `Content-Security-Policy`, ni `X-Frame-Options`/`frame-ancestors`, ni `Referrer-Policy`, ni `X-Content-Type-Options`. Deux surfaces y sont sensibles : la page de partage (`/api/partage`) affiche du texte libre venu de l'URL (borné et échappé, mais arbitraire) sous la marque Ramille, et peut être encadrée dans n'importe quel site ; et les pages qui reçoivent une session dans le fragment d'URL (lien de connexion, `/compte/suppression`) mériteraient au minimum une `Referrer-Policy` stricte. Rien de tout cela n'est un trou ouvert aujourd'hui, mais c'est le seul niveau de défense qui n'existe pas du tout, sur un produit où la liste des Redirect URLs a déjà été une prise de contrôle possible.

Preuves : `vercel.json:1` ; `api/partage.ts:36`

**Recommandation.** Ajouter dans `vercel.json` une section `headers` pour `/(.*)` : `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (ou `frame-ancestors 'none'`), `Permissions-Policy` minimal ; une CSP en mode `report-only` d'abord, l'export Expo utilisant des scripts inline. Vérifier après export que `cleanUrls` et les Functions restent intacts.

**Contre-vérification.** Deux précisions pour que la mise en œuvre ne casse rien de silencieux, dans la famille des gardes cleanUrls / verifier-rendu-export : (1) `X-Frame-Options: DENY` global est sans danger pour l'aperçu de lien (les crawlers OG ne mettent pas en cadre) mais une CSP `default-src` stricte casserait l'export Expo, qui charge du script inline et des polices Google — d'où le report-only d'abord, à vérifier avec scripts/verifier-rendu-export.mjs qui ouvre déjà cinq routes dans un navigateur et verrait la page blanche ; (2) `Referrer-Policy` ne protège pas le cas qui compte vraiment ici — les jetons de session arrivent dans le **fragment** d'URL, qui n'est jamais envoyé en Referer par le navigateur. Le vrai gain sur cette surface reste la liste des Redirect URLs (déjà traitée). Le meilleur rendement est donc `nosniff` + anti-cadrage + `Permissions-Policy`, en défense en profondeur, sans lui prêter de vertu sur les liens de connexion.


### C-13 — Les builds Android ne sont pas reproductibles : `eas.json` fixe l'image de build à `latest` pour les trois profils

`technique` · sévérité **mineur** · verdict **contredit_decision** · effort petit

Chaque profil EAS déclare `"image": "latest"`. Une reconstruction dans un an — imposée au minimum une fois par an par Google Play pour le niveau d'API cible, ou pour ajouter l'empreinte de signature de production à `assetlinks.json` — se fera sur une image différente de celle du build actuel, avec un JDK, un SDK Android et un NDK qui auront bougé. CLAUDE.md note déjà qu'« une dépendance native nouvelle impose un build » et qu'aucun moyen n'existe de s'en rendre compte depuis le code ; un build qui échoue pour une raison d'image est la même famille de panne, un an plus tard, sans personne pour se souvenir de l'image qui marchait.

Preuves : `eas.json:11` ; `eas.json:27`

**Recommandation.** Épingler une image datée (`"image": "ubuntu-22.04-jdk-17-ndk-r26b"` ou l'identifiant courant) au moins sur le profil `production`, et noter dans le registre d'exploitation (C-10) la date du dernier build réussi et son image.

**Contre-vérification.** Ce que le constat rate : l'argument de reproductibilité se retourne. EAS **retire** ses images de build après environ un an ; une image datée épinglée devient un identifiant invalide et fait échouer le build exactement dans le scénario décrit par le constat (reconstruction imposée par Google Play un an plus tard), alors que `latest` continue de résoudre. La valeur suggérée (`ubuntu-22.04-jdk-17-ndk-r26b`) est de plus une invention : elle ne correspond à aucun identifiant vérifié ici, et l'app est en workflow managé (aucun code natif propre, donc le NDK ne pèse pas). Ce qui gouverne réellement la reproductibilité dans ce dépôt est ailleurs et déjà en place : `package-lock.json` (versions exactes, et v1-10 §10 documente précisément la panne `npm ci` quand ce fichier bouge) et les versions Expo/RN de package.json (`expo ~57.0.21`, `react-native 0.86.3`). Meilleure recommandation : ne pas toucher `eas.json`, et consigner dans le registre d'exploitation (C-10) la date, le numéro de build EAS et l'image effective de chaque build réussi — expo.dev l'affiche sur la page du build. C'est cette trace qui permet de reproduire ou de diagnostiquer, sans introduire une référence qui expirera.


## Constats écartés par la contre-vérification


### A9-10 — Le quota de 500 événements par 24 h est atteignable par un usage normal, et fait alors disparaître tous les suivants en silence

Verdict **refute**. Les trois preuves existent (src/hooks/use-track-focus.ts:26, src/lib/analytics.ts:56, migration 20260905170600 l.26 `max_per_day constant integer := 500`), mais la prémisse — « atteignable par un usage normal » — ne tient pas. Le recensement complet des points d'émission (grep `track(` dans src/) donne onze appels, tous ponctuels : `onboarding_complete`, `onboarding_step_view` (4 étapes), `bilan_step_view` (9 étapes), `connexion_*`, `retrouver_*`, `resultat_share`, `rappels_view`, `app_open`, plus les deux seuls `useTrackFocus` du produit (src/app/(tabs)/plan.tsx:112 et src/app/(tabs)/suivi/index.tsx:70). Aucun émetteur en boucle, au scroll ou au rendu. Atteindre 500 en 24 h demanderait environ 250 allers-retours Plan↔Suivi dans la journée : ce n'est pas un « usage un peu nerveux », c'est le scénario d'abus que le quota existe pour arrêter — et la migration dit précisément qu'il est calibré « assez large pour que personne de bonne foi ne le rencontre ». La perte silencieuse des événements décisifs décrite n'a donc pas de population réelle.


### A10-19 — Le web n'est ni installable ni utilisable hors connexion : un seul bundle de 2,7 Mo, pas de manifeste, pas de service worker

Verdict **deja_fait**. Les faits techniques sont exacts : `dist/_expo/static/js/web/entry-1f9bee24e88a0029eb99ecb526ec458c.js` fait bien 2 682 319 octets en un seul fichier, aucun `manifest.json`/`.webmanifest` ni service worker n'existe dans `dist/` ni dans `public/` (qui ne contient que `.well-known/assetlinks.json`), et `app.json` ("web": {"output": "static"}) + `vercel.json` + `package.json:58` sont conformes aux extraits. Mais la recommandation principale — « décider explicitement du rôle du web et l'écrire dans un document d'architecture » — est déjà exécutée : `docs/architecture/v1-10-connexion-et-rappels.md` l.177-180 tranche noir sur blanc « le web n'est pas couvert (service worker + VAPID, autre chantier ; acceptable en V1 Google Play only, où le web est la surface publique et non la surface d'usage) », et `docs/architecture/v1-12-rappels.md` §6 en tire les conséquences UI (« Sur web, pas de push. Le réglage ne montre que l'email »). CLAUDE.md répète le cadrage « V1 = Google Play uniquement ». Le second volet (poser un `manifest.webmanifest`) contredit ce cadrage documenté.


### A12-18 — Un texte de repli destiné au développeur peut s'afficher tel quel sur une carte d'action

Verdict **refute**. Le repli est inatteignable. `plan_actions.action_template_id` est `uuid not null references public.action_templates(id)` (supabase/migrations/20260823110000_plan_reduction.sql:38) et `action_templates.action_text` est `text not null` (ligne 15) ; la table est en lecture publique (`create policy "action_templates readable by anyone" ... to anon, authenticated using (true)`, lignes 53-56), donc la jointure imbriquée du select de src/app/(tabs)/plan.tsx:183 remonte toujours une ligne avec un texte. Le `?? 'Action à préciser.'` de la ligne 461 n'existe que pour satisfaire le typage de supabase-js, qui déclare toute relation imbriquée nullable — aucun scénario produit n'affiche cette phrase, et personne ne peut donc s'engager sur une action sans titre.


### C-5 — Un atelier en classe ou en entreprise se heurte à la limite de sign-ins anonymes par adresse IP, et voit « Le démarrage a échoué »

Verdict **refute**. Deux affirmations centrales sont fausses. (1) « Le trente-et-unième reçoit un message technique en anglais » : `src/app/index.tsx` l. 77-98 rend un écran entièrement français — titre « Le démarrage a échoué », corps « Vérifie ta connexion et réessaie. Si ça se reproduit, cette précision aidera à comprendre : », bouton « Réessayer » — et le message brut y est un détail secondaire en `type="code"`, avec un commentaire qui en fait une décision explicite (« Message technique, volontairement brut : il est destiné à être recopié… Ni la voix de Ramille ni un ton rassurant n'ont leur place ici »). La recommandation « sans le message brut » contredit donc directement cette décision. (2) « Aucun code ni document du dépôt ne mentionne cette limite » : `docs/architecture/v1-10-connexion-et-rappels.md` §7 la nomme précisément — « le plus sérieux : Supabase limite les inscriptions anonymes (`rate_limit.anonymous_users`). À l'échelle, un crawler un peu insistant peut consommer le quota et empêcher un vrai visiteur d'obtenir une session » — c'est-à-dire le risque exact du constat, déjà relevé le 07/09 avec ses chiffres (266 sessions, 4 bilans) et son arbitrage non tranché (perte du dénominateur `app_open`).


### C-9 — Les quatre gabarits d'email d'authentification — premier contact écrit du produit — n'existent que dans le tableau de bord, sans copie ni test dans le dépôt

Verdict **refute**. La claim centrale — « n'existent que dans le tableau de bord, sans copie ... dans le dépôt », « le seul texte du produit dont la version courante est invérifiable depuis le code » — est fausse : docs/architecture/v1-10-connexion-et-rappels.md §8.5 contient le HTML complet des quatre gabarits, objet compris (lignes ~356-395 : Magic Link « Ton lien de connexion », Confirm signup, Change Email Address, Reset Password), avec la voix attendue (tutoiement, signature « — Ramille »). Le dépôt porte donc bien la version de référence, diffable et relisible ; ce qui manque, c'est l'application automatique et un test. La liste du constat est de plus périmée : `resetPasswordForEmail` n'existe plus dans src/ (grep vide, cf. v1-10 §2.D « il n'y a plus de mot de passe »), donc seuls trois gabarits sont vivants — le quatrième est un vestige du document.
