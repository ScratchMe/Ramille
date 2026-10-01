// Le parcours réel, joué de bout en bout contre une vraie stack Supabase — à chaque PR.
//
// **Le trou que ce script bouche, mesuré le 20/09/2026** : 15 147 lignes d'écrans et de composants
// (`src/app`, `src/components`, `src/hooks`) et 1 485 lignes d'entrée-sortie — **les fichiers de
// `src/lib` qui importent le client Supabase**, pas `src/lib` entier, qui en compte 3 307 — n'étaient
// gardées par rien d'autre que la recette sur appareil. Le second chiffre a d'abord été écrit
// « 1 216 » sous la définition « `src/lib` », ce qui était faux des deux côtés : c'est la définition
// qui compte, pas le nombre, et une mesure dont on ne peut pas redire la définition ne se vérifie
// plus (relevé en contre-lisant la journée). La CI prouvait
// que l'export web *démarre* et affiche quelques états sans réseau ; elle ne prouvait pas qu'une
// seule requête ramène les bonnes lignes, qu'un seul RPC part avec les bons arguments, ni que le
// plan montre les bonnes pistes. Un `.eq('status', 'complete')` serait passé vert.
//
// Ce script prend le chemin nominal, et lui seul : onboarding → questionnaire → soumission →
// restitution → plan → engagement → un point généré et répondu → suivi → « Toi » → suppression du
// compte. Le second profil finit, depuis le 27/09/2026, par le retrait de ses deux bilans (C4.7).
// Il joue le **profil de `docs/recette/premier-parcours-web.md`**, dont les chiffres ont été mesurés
// (4 231 kg, huit pistes dans un ordre précis, un cap de 384 kg) — sur la base construite depuis
// `supabase/migrations/`, ces chiffres ne dépendent d'aucune synchronisation de facteurs. Après
// chaque écriture, il relit la base **comme la personne** (PostgREST, sous sa session, donc sous la
// RLS), et une fois comme le serveur (le générateur de points, que seul le cron appelle).
//
// **Puis un second profil, et ce n'est pas un doublon** (20/09/2026) : un **cycliste dont le plan ne
// porte aucune action**. Depuis C2.5 ce n'est pas un cas de bord — tout cycliste et tout profil
// sédentaire y tombe —, et c'est surtout le seul chemin où la carte « Ton premier plan » ne se rend
// **jamais**, puisqu'elle demande une action. Donc le seul où la barre d'onglets doit arriver
// autrement : au premier affichage du plan, avec la carte « Plan et Suivi ». Trois branches d'écran
// basculent entre les deux profils, et aucune n'était jouée : la félicitation à la place des cartes,
// le cap qui **ne chiffre pas** (`cadreDuPlan`, C5.3), et l'absence de l'encart de contexte comme du
// lien vers les pistes. Il tourne dans un **contexte de navigateur neuf**, parce que « premier » veut
// dire premier **sur cet appareil** (C5.7) et que les marques vivent dans le stockage.
//
// **Et un troisième depuis le 30/09/2026, sans aucune boucle de points** (`v1-27` §12.22 et §12.23) :
// ni trajet, ni sorties régulières, ni voyage. C'est le seul où ni le plan ni le suivi ne peuvent
// promettre un point, et le seul qui éprouve l'écran passant des boucles vides aux dérivations —
// la section 12, plus bas.
//
// **Ce qu'il ne fait pas, et ce n'est pas un oubli** : il ne couvre ni les états d'erreur — c'est le
// travail de `verifier-etats-export.mjs` — ni les exclusions de cartes en général, qui vivent depuis
// le 27/09/2026 dans `cartesDuPlan` (`src/types/plan.ts`, `v1-27` §4) et y sont épinglées sur
// toutes les combinaisons d'états. Ce que le second profil en éprouve, c'est une partie de l'appel :
// son nouveau bilan en voiture rend dues le même jour « Ton premier plan » et la carte des deux
// lieux, la seule paire que l'écran empilait — deux arguments sur huit, nommés en tête (D1, D2). Un parcours qui voudrait tout voir
// serait fragile, et un garde-fou fragile finit ignoré.
//
// ── Comment il tourne ────────────────────────────────────────────────────────────────────────────
//
// Il lui faut une stack locale complète (`supabase start`, pas seulement `db start` : la session
// anonyme vient de GoTrue, les lectures de PostgREST), un export web construit **avec l'URL et la
// clé de cette stack**, et les trois variables ci-dessous — `supabase status -o env` les donne.
// En CI : le travail « Parcours réel » de ci.yml. En local : TESTING-GARDES.md §2.6.
//
//   EXPO_PUBLIC_SUPABASE_URL       l'API de la stack (http://127.0.0.1:54321)
//   EXPO_PUBLIC_SUPABASE_ANON_KEY  sa clé anon — celle que l'app embarque
//   SUPABASE_SERVICE_ROLE_KEY      sa clé service_role — pour appeler le générateur de points, que
//                                  ni anon ni authenticated ne peuvent appeler (et c'est voulu)
//
// Sur un échec, la page est capturée dans le dossier temporaire (le chemin est imprimé) et le texte
// visible l'est aussi, avec les requêtes refusées : c'est ce qu'on regarde en premier, avant le code.
//
// **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1), sept mutations sur l'arbre de travail,
// chacune suivie d'un export (le code est dans le bundle) et remise en place par l'opération inverse.
//
// Sur le premier profil, les trois familles que rien d'autre ne voyait — un filtre, un nom, un
// argument de RPC :
//   - le filtre du plan écrit de mémoire (`STATUT_DE_BILAN.complete` → `'complete'`) → s'arrête à
//     l'étape « plan », le bilan introuvable pour l'écran ;
//   - un RPC au mauvais nom (`commit_plan_action` → `commit_plan_actions`)     → s'arrête à
//     « engagement », sur un `PGRST202` que le journal imprime en clair ;
//   - la réponse au point vers un RPC au mauvais nom (`repondre_au_checkin`)    → s'arrête à
//     « point », les deux boutons restant à l'écran.
//
// Sur le second, les trois branches qu'il existe pour garder :
//   - la carte « Ton premier plan » rendue malgré un plan à zéro action (la garde
//     `cycle.plan_actions.length > 0` retirée) → « la carte “Ton premier plan” se rend sur un plan
//     à zéro action ». **Et c'est cette mutation qui a fixé l'ordre des assertions** : elle empêche
//     aussi la barre d'arriver, donc tant que l'attente de la barre venait en premier, l'échec se
//     lisait « Timeout 20000ms exceeded » sans nommer la cause ;
//   - le cap qui chiffre quand même (la garde `nombreDActions === 0` de `cadreDuPlan` neutralisée)
//     → « le cap du plan à zéro action annonce un chiffre » ;
//   - la félicitation reformulée → « “Tu fais déjà l'essentiel sur ce poste.” n'est jamais apparu à
//     l'écran ». Cette phrase-là est le second apport de la mutation : `attendreTexte` rendait un
//     délai dépassé anonyme, elle nomme désormais le texte attendu, pour tous ses appels.
//
// Et une septième, le soir même, parce que l'assertion des kilos avait été ajoutée **sans** la
// sienne — relevé en contre-lisant la contre-lecture, et c'est précisément ce que §1.1 interdit :
//   - le seuil de `valeurEtUnite` (`src/lib/format.ts`) : `kilos < 1000` → `kilos < 10` → « « 11 kg
//     CO₂e » n'est jamais apparu à l'écran », et **rien d'autre** : à 4 231 kg le premier profil
//     reste en tonnes, donc il traverse le parcours entier avant que le cycliste ne tombe. C'est ce
//     qui rend la mutation concluante — une qui aurait fait rougir les deux profils n'aurait pas
//     dit laquelle des deux branches du formateur est gardée ici.
//
// **Et deux mutations de plus le 21/09/2026**, sur l'assertion « aucun écran de compte ne
// s'interpose » — celle que la veille avait ajoutée aux deux profils, et qui était une tautologie
// sur le premier avant d'être réparée :
//   - l'interstitiel remis (`goToPlan` → `router.push('/connexion?source=resultat_transition')`, et
//     rien derrière, comme le vrai défaut qui gardait l'écran) → l'assertion du **cycliste** tombe
//     en nommant l'URL traversée. Elle demande de neutraliser les deux assertions du premier profil,
//     qui parlent d'abord — sans quoi le parcours s'arrête avant le second ;
//   - et la **réciproque**, qui est la vraie leçon : le guetteur de navigations remis **après** le
//     toucher (l'ordre que ce fichier portait avant le correctif) fait **passer** l'assertion
//     négative en silence sous la même mutation, seule celle du destinataire parlant — et elle parle
//     d'un délai, pas de la promesse cassée. C'est la démonstration qu'une assertion négative n'est
//     gardée que si son guetteur est armé **avant** le geste.
//
// Deux mutations ont échoué à produire la condition, et c'est utile à savoir avant de les rejouer :
// un interstitiel **fugitif** obtenu par `setTimeout(… , 400)` avorte les requêtes du plan et fait
// échouer le parcours pour une raison étrangère ; et un `push` suivi d'un `replace` **dans le même
// tick** ne produit aucune navigation — expo-router les fusionne, donc `framenavigated` ne voit rien.
//
// **Et neuf de plus le 25/09/2026**, sur les trois gardes de ce jour-là — les groupes nommés à chaque
// étape, les jours de l'engagement au clavier, la ligne de canal sur « Toi » —, un export chacune
// (cache Metro isolé, `--clear`, un marqueur de la mutation retrouvé dans le bundle), après un témoin
// qui passe de bout en bout. Chacune s'arrête à l'étape attendue, sur le message attendu :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | P1 — la liste des modes (B1.4) sans `GroupeDeChoix` | « questionnaire — mode » : les neuf modes, « aucun groupe » ; la motorisation, qui garde le sien, n'est pas citée |
//   | P9 — la liste « Lequel ? » sans groupe | « questionnaire — second mode », au détour par « Oui » : les sept modes |
//   | P2 — `PrecisionMode` sans son propre groupe | « questionnaire — mode » : le groupe du mode coche deux cases, « Voiture (seul) » et « Thermique » |
//   | P3 — `Chip` sans `activableALaBarreDEspace` | « engagement » : Espace ne coche pas « mardi » |
//   | P4 — la répétition active | « engagement » : la barre maintenue n'a pas laissé « mardi » coché |
//   | P5 — Entrée prise aussi par le gestionnaire | « engagement » : Entrée n'a pas décoché « mardi » |
//   | P6 — `opacity` remise sur la ligne hors d'atteinte | « « Toi » » : « Par email » porte une opacité |
//   | P7 — son titre remis en texte | « « Toi » » : le titre n'est pas le texte tertiaire |
//   | P8 — `LigneDeCanal` sans `activableALaBarreDEspace` | « « Toi » » : Espace ne choisit pas « Sans rappel » |
//
// **P2 a d'abord PASSÉ l'étape du mode, et c'est elle qui a changé la garde.** Sa première version ne
// vérifiait que le groupe le plus proche, et son commentaire affirmait que cela suffisait : privée de
// son groupe, la motorisation tombe dans celui du mode, qui est bien le plus proche et bien nommé —
// elle n'était vue qu'aux longs trajets, où la précision n'est pas imbriquée. La règle qui la voit est
// sémantique : un `radiogroup` ne coche jamais deux cases. P4 dit aussi une chose que Jest ne pouvait
// pas dire : la répétition d'une touche maintenue arrive bien jusqu'au gestionnaire, à travers
// Chromium, React et react-native-web — sans quoi le garde de `repeat` ne garderait rien.
//
// **Et quatre de plus le même jour, sur les assertions que la livraison de `v1-29` avait ajoutées
// sans les éprouver** — l'étiquette du départage, la phrase du cap, la félicitation du résiduel —,
// relevées par la contre-lecture (`TESTING.md` §1.1). Un export chacune, avec `--clear` :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | Q1 — `etiquetteDuPosteDominant` rend toujours l'étiquette générale | « restitution » : « Le plus régulier, presque à égalité avec tes voyages » n'apparaît jamais |
//   | Q2 — `phraseDesPistesSuffisantes` se tait toujours | « plan » : « Chacune des deux pistes proposées suffit à le franchir. » n'apparaît jamais |
//   | Q3 — la félicitation du résiduel promet le point | le cycliste, au plan : « la félicitation nomme ou promet le résiduel des sorties rares » |
//   | Q4 — le résiduel n'est plus reconnu (le poste est nommé) | le cycliste, au plan : « Tu fais déjà l’essentiel. » n'apparaît jamais |
//
// Q4 ne fait pas parler l'assertion négative, et c'est attendu : l'attente positive vient avant elle
// et tombe la première, le titre nommant le poste ne contenant pas « l’essentiel. ». La négative
// garde l'autre moitié, la promesse du point, et c'est Q3 qui le montre. (Q3 et Q4 ont été jouées
// sur le titre d'alors ; celui du 25/09/2026 a les siennes, ci-dessous.)
//
// **Et deux le 25/09/2026, sur l'arbitrage du résiduel des sorties rares** (`v1-29` §6.3) — le titre
// « Tu es déjà sous le repère 2050. » et la marche tue sur la restitution. Ce sont deux **appels**,
// que Jest ne voit pas : chaque dérivation a ses tests, mais un écran qui passerait le mauvais
// argument les laisserait tous verts. Un export chacune, `--clear`, le marqueur retrouvé dans le
// bundle, après un témoin passé de bout en bout :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | R1 — la restitution passe `posteSuppose` à faux | « cycliste — restitution » : « la restitution propose encore une marche sur le résiduel des sorties rares » |
//   | R2 — le plan ne passe pas le total à la félicitation | « cycliste — … le plan sans action » : « Tu es déjà sous le repère 2050. » n'apparaît jamais |
//
// R2 a d'abord été jouée **avec R1 encore en place** — la sauvegarde du fichier avait échoué — et
// s'arrêtait donc à la restitution, sur le message de R1 : un résultat qui avait l'air d'une
// mutation attrapée et qui n'éprouvait rien du plan. Rejouée seule, elle tombe où elle doit.
//
// **Et trois le 27/09/2026, sur le résiduel des sorties rares — les « loisirs occasionnels » — et la
// ligne d'horizon du suivi** (`v1-29` §6.3), après un témoin passé de bout en bout — et un premier
// passage tombé à tort, `ThemedText` posant une espace insécable devant le deux-points, d'où la
// normalisation des blancs dans l'étape du suivi :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | O1 — la barre de la restitution passe `false` à `nomDuPoste` | « cycliste — restitution » : « /^Loisirs occasionnels$/ » n'apparaît jamais |
//   | S1 — le suivi repasse par `posteLabel` | « cycliste — le suivi » : « le suivi ne nomme pas le résiduel comme la restitution » |
//   | S2 — le repère passé à `ligneDHorizon2050` vaut 0 | « cycliste — le suivi » : « la ligne d'horizon du suivi ne dit pas « déjà sous le repère » » |
//
// O1 ne dit rien de la **fréquence** que la restitution lit : chez ce cycliste le résiduel domine,
// donc son libellé figé le marque déjà, et la barre le nommerait sans la fréquence. C'est
// `loisirsSontLeResiduel` et ses tests qui gardent le cas où il ne domine pas.
//
// **Et deux le même soir, sur `cartesDuPlan`** (`v1-27` §4) — l'écran, puisque la dérivation a
// toutes ses combinaisons d'états dans Jest. Témoin passé de bout en bout, puis un export `--clear`
// par mutation :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | D1 — l'écran remet l'ancienne condition des deux lieux (`ouverture === null && carteDesDeuxLieux`) | « cycliste — un nouveau bilan en voiture » : « la carte des deux lieux s’empile sur « Ton premier plan » » |
//   | D2 — l'écran passe `carteDuPremierPlan` fausse quand les deux lieux sont dus (la croyance du lot 5, en argument) | la même étape : « « TON PREMIER PLAN » n'est jamais apparu à l'écran » |
//
// D1 a été jouée quand l'écran rendait encore les trois cartes en trois blocs ; sa capture est
// l'état d'avant la décision — deux cadres empilés, deux lignes de Ramille, « Ton plan » repoussé
// sous le pli d'un écran de 420 px. **Depuis, les trois cartes sont une seule expression**, et D1
// ne peut plus s'écrire : l'empilement est devenu inexprimable à l'écran comme dans la dérivation.
// Ce que l'étape garde encore, c'est **deux** des arguments — `carteDuPremierPlan` et
// `carteDesDeuxLieux` —, d'où D2. Les autres (`pointsAffiches`, `attenteDisponible`,
// `motsDuContexte`, `premierPlan`, `nombreDActions`, et `ouvertureDeSaison` au-delà d'un vrai à
// tort) ne sont gardés par aucune étape de ce parcours : ce sont les tests de `cartesDuPlan` et la
// relecture qui les tiennent.
//
// **Et six le 27/09/2026, sur le retrait d'un bilan** (C4.7, `v1-22`) — six **appels** de
// l'écran, que Jest ne voit pas : chaque dérivation de `src/types/retrait-du-bilan.ts` a ses tests,
// mais un écran qui leur passerait le mauvais argument les laisserait tous verts. Témoin passé de bout
// en bout, puis un rejeu `parcours` par mutation (export neuf, stack neuve) :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | T1 — la restitution passe `'completed'` à `lectureDuStatut` au lieu du statut lu | « cycliste — retirer le bilan en voiture » : « Ce bilan a été retiré. » n'apparaît jamais **après le rechargement** — sans lui, l'état posé par le geste aurait suffi à passer |
//   | T2 — le gestionnaire du retrait n'efface plus la marque locale | « cycliste — retirer son seul bilan » : « la marque locale survit au retrait du seul bilan » |
//   | T3 — la confirmation reçoit toujours la place `ancien` | « cycliste — retirer le bilan en voiture » : « ton plan repartira de ton bilan précédent. » n'apparaît jamais |
//   | T4 — l'écran passe `null` à `confirmationDuRetrait` au lieu de l'engagement relu (27/09/2026, contre-lecture) | « cycliste — retirer le bilan en voiture » : « L’action que tu suis — » n'apparaît jamais |
//   | T5 — la confirmation reprend la place lue au chargement au lieu de la relire au toucher (27/09/2026, seconde contre-lecture) | « cycliste — retirer son seul bilan » : « tu repartiras d’un nouveau bilan. » n'apparaît jamais dans l'onglet resté ouvert |
//   | T6 — la soumission remet l'ancienne règle, `!aDejaVuUnBilan()` seule (idem) | « cycliste — un bilan après le retrait » : « la barre d’onglets a disparu … » |
//
// ── Le mouvement, là où il demande des données (27/09/2026, `v1-30`) ──────────────────────────
//
// Ces transitions ne s'atteignent qu'avec un vrai plan, donc ne se gardent qu'ici ; ce qui se voit
// sans réseau est en section J de `verifier-etats-export.mjs`, et les deux relèvent image par image
// avec le même outil (`relever-par-image.mjs`) :
//
//   - **la barre qui arrive au « Compris »** du premier plan glisse depuis le bas ;
//   - **le retour sur le plan** depuis les pistes ne fait rien bouger : la carte du point garde sa
//     hauteur, que la pile web a masquée pendant le détour ;
//   - **la réponse au point** : la carte change de hauteur, et ce qui est dessous suit au lieu de
//     sauter (`HauteurSuivie`) ;
//   - **la feuille « Ton plan va être recalculé »**, la seule qui s'ouvre sur web sans adresse
//     rattachée — par un re-bilan, puisqu'elle demande une action engagée : le voile se fond sans
//     bouger pendant que la feuille monte, et Échap la fait redescendre au lieu de l'effacer ;
//   - puis **la même feuille sous « réduire les animations »** (préférence émulée, page rechargée :
//     elle n'est lue qu'au démarrage), posée dès la première image et partie d'un coup — et **tout
//     le second profil sous la préférence**, où la barre arrive posée. Le second profil y gagne une
//     chose de plus : le parcours entier est joué une fois sans animation, nouveau bilan compris.
//
// **Éprouvé en le cassant le 27/09/2026** : huit mutations, un export chacune (cache Metro isolé,
// `--clear`), après deux témoins passés de bout en bout, et **jouées une à une sur un fichier égal
// au commit** — un lot interrompu avait laissé une mutation dans la copie, et deux résultats ont été
// rejoués pour ça. Chacune s'arrête à l'étape attendue, sur le message attendu :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | P1 — le `Modal` de la feuille remis en `slide` | « re-bilan — la feuille » : le voile bouge, 900 px sous le haut de l'écran |
//   | P2 — la feuille se démonte sans sortie | la même étape, à Échap : elle « disparaît d'un coup » |
//   | P3 — la feuille ignore la préférence (valeurs de départ, `ReduceMotion.Never`) | « la même feuille sous réduire » : elle s'ouvre en bougeant ; la moitié animée reste verte |
//   | P4 — la barre remise en place sans glisser | « plan — Compris » : aucune image entre son départ et sa place |
//   | P5 — la barre glisse aussi sous la préférence | « cycliste — … le plan sans action » : elle arrive en glissant |
//   | P6 — `HauteurSuivie` ne s'anime jamais | « point » : le cap saute de 769 à 664 px |
//   | P7 — la découpe au ras (`MARGE_DE_DECOUPE = 0`) | « point » : l'anneau de focus de « Oui » est rogné |
//   | P8 — la hauteur nulle tenue (l'état d'avant la contre-lecture) | « point » : au retour sur le plan, la carte passe par 8 px au lieu de 153 |
//   | P9 — la barre disparaît 110 ms une fois là (28/09) | « cycliste — … le plan sans action » : elle n'est pas « là à chaque image une fois arrivée » ; le premier profil, à « Compris », reste vert |
//
// **Des mutations ont d'abord corrigé la garde, une CI rouge aussi, et c'est ce qu'elles valaient le
// plus** :
//   - **P4 est d'abord PASSÉE** : la barre attend masquée, en bas et transparente, et la mutation ne
//     la remettait en place que dans un effet, une image plus tard — cette image au départ suffisait
//     à « au moins une image ailleurs qu'à sa place ». « En chemin » veut dire depuis **strictement
//     entre le départ et l'arrivée** (`enChemin`, `relever-par-image.mjs`), partout où il servait ;
//   - **P1 tombait, mais en disant « s'ouvre d'un coup »** d'une feuille qui glissait : cherchée par
//     son rôle, elle était invisible pendant tout le glissement, react-native-web ne posant
//     `role="dialog"` qu'à la fin de son animation. La mesure passe par `aria-modal` ;
//   - **et ce changement a fait rougir la CI**, sous la préférence, sur une image que
//     react-native-web rend à opacité nulle au montage : mesurée image par image, puis écartée —
//     un `Modal` pas encore montré ne rend rien. L'hypothèse d'abord écrite (`display: none`) était
//     fausse, et c'est l'impression des échantillons qui l'a dit ;
//   - **P8 est d'abord PASSÉE**, sur une garde qui lisait la position du cap : la page a défilé
//     jusqu'au lien des pistes, et l'ancrage du défilement de Chrome compense ce qui grandit
//     au-dessus de la fenêtre — le cap ne bougeait pas pendant que la carte regrandissait. La garde
//     mesure désormais une **hauteur**, celle de la découpe de la carte.
//
// P4, P6 et P7 ont été jouées juste avant ce dernier changement de la mesure de la feuille, qu'elles
// n'atteignent pas ; P8 sur l'export d'avant la correction, puis deux passages verts sur l'export
// corrigé. **Le 28/09/2026, après la seconde contre-lecture qui a réécrit la feuille**, P1, P2, P3
// et P8 ont été rejouées sur b4f25c1, derrière un témoin vert, avec les mêmes chutes — P3 en
// retirant aussi le « rien ne se lance » de l'effet d'ouverture, sans quoi elle n'ouvrait plus rien
// à animer ; et P9 est entrée pour l'exigence neuve du cycliste (là, et plus jamais absente). P4 à
// P7 n'ont pas été rejouées depuis le 27/09 : ni la barre ni la découpe n'ont changé, mais le détour
// de P8 s'est inséré devant P6 et P7 dans la même étape, et leurs chutes sont antérieures à lui.
//
// **Le 30/09/2026, la garde de P8 est tombée sans défaut**, en CI, sur une PR qui ne touchait que la
// documentation : « la carte du point passe par 153 px au lieu de 840 ». La référence était fausse,
// pas le retour — prise dès l'apparition de la question, avant que `HauteurSuivie` ait sa découpe,
// elle avait remonté jusqu'à l'écran (900 px de fenêtre moins la barre). Elle se prend désormais au
// repos constaté (`mesurerAuRepos`, `relever-par-image.mjs`). Éprouvé le même jour, un rejeu
// `parcours` chacun :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | R — la découpe arrive 300 ms après le premier `onLayout` (un runner lent), garde d'avant | « point » : « 153 px au lieu de 840 », le message exact de la CI |
//   | R, garde corrigée, même export | rien : les trois profils passent |
//   | P8, garde corrigée | « point » : « 8 px au lieu de 153 », comme le 27/09 |
//
// Ce que la fenêtre de repos ne voit pas : une découpe qui arriverait plus de 600 ms après la
// question serait prise pour le repos, et la garde retomberait de la même façon.
//
// La même chute a été relevée le même jour sur la PR de la recette du 29/09 (#299), **image par
// image** : 840, 840, puis 153 — deux images d'environ 20 ms en tout, sur un poste sans charge. Sa
// première version du repos attendait dix images identiques, environ 170 ms : R l'aurait trompée
// (raisonné, pas rejoué), et c'est la fenêtre de 600 ms qui est restée à la fusion.
//
// ── Ce que la recette web du 28/09/2026 a trouvé (`v1-13` §15) ─────────────────────────────────
//
// Trois gardes neuves, pour trois constats qu'aucune suite ne voyait : un « Retour » ouvert sans pile
// derrière (H1), « Toi » après la suppression du compte (H5), et la barre du palier sur le résiduel des
// sorties rares (10.2). Jest garde la décision de `revenirOu` ; ce qui ne se voit qu'ici, c'est
// l'écran qui l'**appelle**, et l'écran « Toi » qui écoute `MonCompte`, qu'aucun test ne rend. **Éprouvé en le cassant le 28/09/2026** : un témoin vert (23/23),
// puis un rejeu `parcours` par mutation (export neuf, stack neuve), l'arbre remis après chacune :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | M1 — `revenirOu` redevient un `router.back()` nu, partout | « « Retour au plan » sans pile » : « … n’a pas ramené au plan » |
//   | M2 — `MonCompte` ne prévient plus l'écran (`onSupprime` jamais appelé) | « suppression du compte » : « « Toi » montre encore « Les rappels » après la suppression du compte » |
//   | M3 — la barre du palier revient sur le résiduel (`!posteSuppose` retiré) | « cycliste — restitution, puis le plan sans action » : « la restitution montre encore la barre « Ton prochain palier » … » |
//   | M4 — la barre du palier ne se rend plus pour personne | « restitution » (profil 1) : « « Ton prochain palier » n'est jamais apparu à l'écran » |
//   | M5 — le lien « Confidentialité » change de nom après la suppression (contre-lecture, le soir même) | « suppression du compte » : « « Toi » ne montre plus le lien « Confidentialité » … » |
//
// M4 est la moitié qui rend M3 concluante : sans elle, une absence vérifiée chez le cycliste passerait
// aussi bien si la barre avait disparu pour tout le monde. M5 fait de même pour M2 : l'écran « Toi »
// masque ce qui décrit le compte supprimé, et garde les pages légales.
//
// ── « Toutes les pistes » : on compare sur la liste, on touche pour choisir (29/09/2026, `v1-32`) ──
//
// Trois étapes, après « Retour au plan » sans pile : **le défilement jusqu'à « C'est noté »**, une
// carte déjà ouverte au-dessus (le titre jamais sous la bande, le bouton dans la fenêtre et près de son
// bas, en glissant) ; **le même sous « réduire les animations »** (posé d'un coup) ; et **choisir « à la
// place » depuis la liste** — le seul chemin qui passe `p_replace` depuis cet écran, jamais joué contre
// une vraie stack : la carte s'ouvre sur la question, focus compris, rien de coché, « C'est noté »
// inactif, puis la base relue dit que l'engagement a changé de ligne et que l'ancien est archivé en
// `changement`. **Éprouvé en le cassant le 29/09/2026** : un témoin vert, puis un export par mutation
// (cache Metro privé, `--clear`), la source restaurée après chaque export :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | PR1 — `p_replace` passé à faux depuis la liste (`surLeChoix ? false : otherActionCommitted`) | « pistes — choisir depuis la liste, à la place » : « « C'est noté », depuis la liste, n'a pas ramené au plan », et le journal montre le refus `RM001` du RPC |
//   | PR2 — le défilement mesuré à l'ouverture, sans attendre que la carte ait grandi | « pistes — le défilement… » : « l'écran défile trop : « C'est noté » finit 203 px au-dessus du bas de la fenêtre » |
//   | PR3 — `animated: true` en dur | « pistes — le même défilement sous « réduire les animations » » : « l'écran défile en glissant (positions 483 → 485 → … → 894) » ; la moitié animée reste verte |
//
// **Et cinq de plus le même soir, après la contre-lecture**, qui avait trouvé ce qu'aucune suite
// n'exerçait : l'ordre de la liste une fois l'engagement déplacé (tant que le rang 1 est engagé, les
// deux ordres coïncident), « Annuler » par la vraie carte, la carte jamais estompée sur le choix, et le
// focus du plan dans les deux sens. Même méthode, un témoin vert d'abord :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | PR4 — la liste reprend l'ordre du plan (`ordonnerLesPistes` dans `pistesParPoste`) | « pistes — l'ordre ne bouge pas… » : « la liste a mis l'action engagée en tête » |
//   | PR5 — la carte de la liste ne reçoit pas `onAnnuler` | « pistes — choisir depuis la liste, à la place » : « « Annuler », sur la liste, n'a pas rendu la carte à sa rangée » |
//   | PR6 — la carte estompée aussi sur le choix (`estompee={uneAutreEstEngagee}`) | la même étape : « la carte ouverte sur le choix est estompée (rgb(240, 241, 236) au lieu de rgb(221, 224, 217)) » |
//   | PR7 — pas de focus à la question sur le plan | « engagement » : « après « Je m'y engage », sur le plan, le focus est sur « Ramille… » » — le document, en pratique |
//   | PR8 — `Button` ne transmet pas sa `ref` | la même étape : « après « Annuler », sur le plan, le focus est sur « Ramille… » » |
//
// **Et une sixième le lendemain de la contre-lecture**, qui avait fait attendre le focus de la liste
// la fin de l'entrée de la carte — contre la règle du mouvement, « le focus part au geste, jamais à
// la fin d'une animation » (`FRONT-MOUVEMENT.md` §2.12). Le délai retiré, la lecture du focus se fait tout de
// suite, et c'est elle qui le garde :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | PR9 — le focus de la liste attend `Mouvement.entree` (le code du 29/09/2026 au soir) | « pistes — choisir depuis la liste, à la place » : « après « Choisir à la place », le focus est sur « Ramille… » et non sur la question — au geste, pas à la fin de l'entrée » |
//
// Ce qu'aucune ne voit : TalkBack. Au geste, la question est encore découpée et transparente ; le
// navigateur accepte d'y poser le focus, et qu'Android l'accepte se juge au doigt (`v1-13` §11.24).
//
// **PR2 est d'abord PASSÉE**, et c'est elle qui a changé la garde. La première version vérifiait que
// le titre ne passe jamais sous la bande et que « C'est noté » finit dans la fenêtre — pas que l'écran
// défile **juste assez**. Imprimés image par image, les échantillons ont dit pourquoi : dans cette
// géométrie la carte du dessus est encore visible, son repli fait donc déjà monter la nouvelle, et la
// mesure prise trop tôt ajoute tout ce repli par-dessus — l'écran défile de 180 px au lieu de 38, borné
// par le contenu avant que le titre n'atteigne la bande. D'où l'assertion « près du bas de la fenêtre ».
// Le piège que le plan (`v1-32` §4.4) prévoyait — le titre sous la bande — n'est qu'une des deux façons
// de se tromper ; l'autre, défiler trop sans rien cacher, ne se voyait pas.
//
// **Et deux le 29/09/2026, sur l'écran du mode** (`v1-31`). Le cas neuf de l'écart 12, rejoué avec le
// `return` de `suivreLOuverture` retiré (`step-shell.tsx`, fichier égal au commit, `rejouer-la-ci.mjs
// parcours`) : le parcours s'arrête à « cycliste — un re-bilan ouvert sur l'étape du mode ne défile pas
// sous son préremplissage », sur « l'écran a défilé de 132 px sous le préremplissage » — 132 et non 56,
// le bandeau du préremplissage poussant l'étape d'autant. Le témoin, sur le même commit, passe de bout en
// bout. Et la course du re-bilan de 8 ter, que la contre-lecture a trouvée : elle ne se provoque pas à
// coup sûr — elle dépend de l'aller-retour du préremplissage —, donc elle n'a pas de mutation ; ce qui la
// ferme est l'attente d'une réponse cochée, écrite en tête de `jusquAVoirMonBilan`.
//
// **Et une le 30/09/2026, sur la carte d'attente** (`v1-27` §12.22) : `lireLaBoucleAVenir` ne
// reconnaît plus `hebdo` (`'hebdomadaire'` à sa place, marqueur retrouvé dans le bundle, rejeu
// `parcours` sur un fichier égal au commit sauf elle). Le parcours s'arrête à « cycliste — la carte
// d'attente nomme le lundi, que le serveur a dit », sur « /^(Je te fais signe|On se retrouve ici)
// lundi\.$/ » n'est jamais apparu — **et à elle seule** : toutes les étapes d'avant passent, le premier
// profil compris, donc rien d'autre du parcours ne garde cette lecture. Le témoin, sur le même commit,
// passe de bout en bout. La **première** version de l'étape, qui oubliait la carte des deux lieux, est
// tombée au même endroit sans mutation : c'est ce qui l'a corrigée. *(Le soir même, « à elle seule »
// a cessé d'être vrai : la carte des deux lieux du second profil — le cycliste, dès son premier
// plan — dépend désormais de la même lecture, et `lireLaBoucleAVenir` a été remplacée par `lireLesBouclesAVenir`, `v1-27` §12.23.)*
//
// **Et quatre le soir, sur les appels de l'écran que Jest ne voit pas** (`v1-27` §12.23, relevé par la
// contre-lecture : les dérivations sont testées, pas ce que l'écran leur passe). Un rejeu `parcours`
// par mutation, après un témoin passé de bout en bout sur les trois profils :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | B1 — `ouvertureDesDeuxLieux` reçoit `actions: true` | le cycliste, à la carte des deux lieux de fin : « … le point régulier et ta saison. … » n'apparaît jamais |
//   | B2 — elle reçoit `boucle: true` | « sans boucle — le plan… » : « Ici, ton plan : ta saison. … » n'apparaît jamais |
//   | B3 — le suivi passe `null` à `carteDuSuiviSansPoint` | « sans boucle — le suivi… » : « Je garde tes bilans ici, au fil des saisons. » n'apparaît jamais |
//   | B4 — la carte d'attente reçoit `mensuel` quand la liste est vide (seconde contre-lecture) | « sans boucle — le plan… » : « Ton plan est là, reviens quand tu veux. » n'apparaît jamais — la seule assertion qui voit la branche `aucune` de l'écran |
//
// Ce qu'aucune ne peut voir : `laBoucleDuPointTourne` dans l'écran du plan — aucun profil n'a de point
// répondu dont la boucle s'est arrêtée. La carte qui la reçoit est gardée par
// `src/components/checkin-card.test.tsx`, l'appel de l'écran par rien.
//
// **Et une le 01/10/2026, sur l'encart orphelin** (`v1-13` §19, recette du jour) : l'étape « contexte
// — retiré puis remis » garde l'**appel** d'`orphelinAAnnoncer`, que `plan.test.ts` ne voit pas.
// L'écran muté passe un plan vide au lieu de ses gabarits — l'encart d'avant la correction — : le
// parcours s'arrête à cette étape, sur « l'encart … se rend alors que « Passer deux trajets sur cinq
// en train » est revenue dans le plan », et à elle seule — toutes les étapes d'avant passent. Le
// témoin, sur le même commit, passe de bout en bout sur les trois profils. **Rejoués tous deux après
// la contre-lecture du même jour**, qui a fait relire la base et attendre le titre exact de la carte
// avant l'assertion (l'encart cite le libellé, donc une sous-chaîne pouvait se satisfaire de lui) :
// même témoin vert, même chute, les deux préconditions passées sous la mutation.
//
// **Et une le même jour, sur « Toi »** (#305) : l'étape « suppression du compte » suit « Supprimer mon
// compte » image par image depuis le rendu statique. La place réservée mise à zéro
// (`HAUTEUR_DU_COMPTE_EN_LECTURE = 0`) : le parcours s'arrête à cette étape, sur « bouge de 396 px
// (365 → 527 → 761) », et à elle seule. Le témoin, sur le même arbre, passe de bout en bout. **Rejouée
// après la contre-lecture du même jour**, qui a fait poser les trois lectures de l'écran ensemble et
// démarrer le relevé sur l'onglet du parcours : même chute, en un seul saut (365 → 761), et l'échec
// capturé sur `/compte` — il l'était sur le plan, l'écran d'un autre onglet.
//
// Usage : node scripts/verifier-parcours-reel.mjs [dist]

import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

import { mesurerUnChoix } from './mesurer-un-choix.mjs';
import {
  disparaitApresEtreApparue,
  echantillons,
  enChemin,
  entre,
  mesurer,
  mesurerAuRepos,
  ouiNon,
  releverParImage,
  releverPendant,
} from './relever-par-image.mjs';
import { servirExport } from './servir-export.mjs';

const DIST = process.argv[2] ?? 'dist';
const API = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ATTENTE = 20_000;
// Dans le dossier temporaire et pas dans le dépôt : une capture à la racine aurait demandé une ligne
// de `.gitignore`, et toucher ce fichier fait construire Vercel (scripts/vercel-ignorer-le-build.sh).
const CAPTURE = path.join(os.tmpdir(), 'ramille-parcours-reel-echec.png');

if (!API || !ANON || !SERVICE) {
  console.error(
    'Il manque EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY : ' +
      'ce script a besoin de la stack locale (`supabase status -o env` les donne).'
  );
  process.exit(2);
}

// ── Le profil de la recette, et ce qu'il rend ────────────────────────────────────────────────────
// Recopié de docs/recette/premier-parcours-web.md, « Le profil à saisir, et les chiffres qu'il
// rend ». Toute réponse changée change ces chiffres et une ligne de plus ou de moins dans le plan.
const ATTENDU = {
  totalKg: 4231,
  dominantKg: 1920,
  capKg: 384,
  pistes: [
    ['Passer deux trajets sur cinq en train', 619],
    ['Renoncer à un vol long-courrier cette année', 1601],
    ['Faire ce trajet à deux au moins un jour sur deux', 480],
    ['Travailler depuis chez toi un jour par semaine', 384],
    ['Renoncer à un vol court ou moyen-courrier cette année', 277],
    ['Remplacer un aller-retour en avion par le train', 273],
    // **Deux lignes de plus depuis C4.4**, et elles ne sont pas du décor : ce profil fait ses
    // sorties à 22,5 km, c'est-à-dire au-dessus de ce qu'un vélo mécanique tient (15 km) et dans
    // la fenêtre du VAE ; et il déclare deux longs trajets en voiture à deux, où l'autocar gagne
    // encore 47 %. Aucune des deux n'existait, donc aucune n'était proposée.
    ['Faire une sortie sur trois à vélo à assistance électrique', 101],
    ['Regrouper deux sorties en une seule, une fois sur cinq', 67],
    // L'apostrophe droite est celle du référentiel (`action_text` est sa clé naturelle), pas celle
    // de la recette, qui l'écrit typographique.
    ["Faire un de tes longs trajets en train plutôt qu'en voiture", 48],
    ["Faire un de tes longs trajets en autocar plutôt qu'en voiture", 23],
  ],
};

/**
 * Le second profil — le cycliste — et ce qu'il rend.
 *
 * Mesuré le 20/09/2026 sur la stack locale, comme le premier : trois jours de vélo sur 5 km, des
 * sorties rares, aucun voyage, pas de véhicule au foyer. Ce qui compte ici n'est pas le total mais
 * le **zéro** qui le suit : c'est lui qui fait basculer trois branches d'écran à la fois.
 */
const ATTENDU_SOBRE = { totalKg: 11 };

// ── Outils ───────────────────────────────────────────────────────────────────────────────────────
class Ecart extends Error {}
function assurer(condition, message) {
  if (!condition) throw new Ecart(message);
}

const { base, fermer } = await servirExport(DIST);
const navigateur = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const exceptions = [];
// Ce que l'app dit et ce que le réseau refuse : sur un échec, c'est ce qu'on lit en premier — une
// requête en 401 ou en 42501 explique plus qu'une capture d'écran.
const journal = [];

/**
 * Un onglet neuf dans un contexte neuf.
 *
 * Le second profil en demande un : les marques du premier parcours (`traceverte.*`) vivent dans le
 * stockage, et « premier » veut dire **premier sur cet appareil** (C5.7). Rejouer dans le même
 * contexte éprouverait un appareil qui a déjà tout vu, c'est-à-dire pas ce qu'on vient voir.
 */
/** Un onglet neuf — dans un contexte neuf par défaut (un appareil de plus), ou dans `contexte` pour
 *  un second onglet du **même** appareil, qui partage sa session et son stockage. `reduire` émule
 *  « réduire les animations » sur un contexte neuf : la préférence est celle de l'appareil. */
async function nouvelOnglet({ contexte = null, reduire = false } = {}) {
  if (!contexte) {
    contexte = await navigateur.newContext({
      viewport: { width: 420, height: 900 },
      locale: 'fr-FR',
      reducedMotion: reduire ? 'reduce' : 'no-preference',
    });
    // Le relevé image par image, posé dans chaque document avant son premier script.
    await contexte.addInitScript(releverParImage, null);
  }
  const onglet = await contexte.newPage();
  onglet.on('pageerror', (erreur) => exceptions.push(String(erreur)));
  onglet.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') journal.push(`[console.${message.type()}] ${message.text()}`);
  });
  onglet.on('requestfailed', (requete) => journal.push(`[réseau] ${requete.method()} ${requete.url()} — ${requete.failure()?.errorText}`));
  onglet.on('response', async (reponse) => {
    if (reponse.status() < 400) return;
    const corps = await reponse.text().catch(() => '');
    journal.push(`[réseau] ${reponse.request().method()} ${reponse.url()} → HTTP ${reponse.status()} ${corps.slice(0, 200)}`);
  });
  return onglet;
}

let page = await nouvelOnglet();

let etapeCourante = 'démarrage';
function etape(nom) {
  etapeCourante = nom;
  console.log(`— ${nom}`);
}

/** Le premier contrôle accessible portant ce nom, quel que soit son rôle : les puces du
 *  questionnaire sont tantôt des `radio`, tantôt des `checkbox`, tantôt encore des `button`. */
async function controle(nom, { exact = true, dernier = false } = {}) {
  for (const role of ['radio', 'checkbox', 'button', 'link']) {
    const candidats = page.getByRole(role, { name: nom, exact });
    if ((await candidats.count()) > 0) return dernier ? candidats.last() : candidats.first();
  }
  throw new Ecart(`aucun contrôle nommé « ${nom} » sur l'écran`);
}
async function choisir(nom, options) {
  await (await controle(nom, options)).click();
}
async function bouton(nom) {
  const b = page.getByRole('button', { name: nom, exact: true }).first();
  await b.waitFor({ state: 'visible', timeout: ATTENTE });
  await b.click();
}
/**
 * Le pager de l'onboarding : ses pages hors champ sont `inert` et `aria-hidden`. Jusqu'au
 * 25/09/2026, l'état qui les cache suivait l'animation de défilement et non le clic — la page
 * qu'on quittait redevenait active le temps d'un demi-défilement —, et deux « Continuer » cliqués
 * trop vite touchaient deux fois la même page (mesuré le 20/09/2026 : la première passe a réussi,
 * la seconde a tourné en rond). Il suit désormais le clic (`enVol`, src/app/onboarding/index.tsx),
 * mais l'attente reste : le bouton de la page qui arrive glisse jusqu'à ce que le défilement soit
 * posé. On attend donc que le défilement soit posé sur la page attendue, puis on clique le bouton
 * qui est **dans la fenêtre**, pas le premier que l'arbre d'accessibilité rend.
 */
async function boutonDuPager(nom, indexDePage) {
  await page.waitForFunction(
    (i) => {
      const pager = [...document.querySelectorAll('div')].find(
        (d) => d.clientWidth > 300 && d.scrollWidth > d.clientWidth * 1.5
      );
      return pager !== undefined && Math.abs(pager.scrollLeft - i * pager.clientWidth) < 2;
    },
    indexDePage,
    { timeout: ATTENTE }
  );
  const largeur = page.viewportSize()?.width ?? 420;
  const limite = Date.now() + ATTENTE;
  while (Date.now() < limite) {
    for (const candidat of await page.getByRole('button', { name: nom, exact: true }).all()) {
      const boite = await candidat.boundingBox();
      if (boite && boite.x >= 0 && boite.x + boite.width <= largeur + 1) {
        await candidat.click();
        return;
      }
    }
    await page.waitForTimeout(100);
  }
  throw new Ecart(`« ${nom} » n'est jamais entré dans la fenêtre du pager (page ${indexDePage})`);
}
/**
 * Le questionnaire du cycliste, du premier « Oui » à « Voir mon bilan ». Joué deux fois : au premier
 * bilan de ce profil, et après le retrait de son seul bilan — où il éprouve que le premier parcours
 * ne recommence pas (`ouvreUnPremierParcours`, décision du 27/09/2026).
 */
async function saisirLeCycliste() {
  await choisir('Oui');
  await suivant();
  await choisir('3');
  const distanceVelo = page.getByRole('textbox', { name: 'Distance pour un aller, en km' });
  await distanceVelo.waitFor({ state: 'visible', timeout: ATTENTE });
  await distanceVelo.fill('5');
  await suivant();
  // **Le vélo ouvre sa propre révélation depuis C4.4** — ce commentaire disait l'inverse jusqu'au
  // 21/09/2026, et c'est le genre de phrase qui survit à ce qu'elle décrit. « Mécanique » garde
  // le facteur d'avant le chantier (0,000170), donc les chiffres de ce profil ne bougent pas :
  // c'est la réponse qui isole la nouveauté de l'écran de celle du calcul.
  await choisir('Vélo');
  await choisir('Mécanique');
  await suivant();
  await choisir('Non');
  await suivant();
  // « Rarement » fait disparaître les questions de détail des sorties : l'étape suivante est celle
  // des vols, et non le mode ni la tranche de distance.
  await choisir(/^Rarement/, { exact: false });
  await suivant();
  await choisir('0'); // aucun vol — et à zéro, la question « combien sont courts ? » ne se pose pas
  await suivant();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en train' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en autocar' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en voiture' }).getByRole('radio', { name: '0', exact: true }).click();
  await suivant();
  await choisir('Urbain dense');
  await choisir('Bon');
  await choisir('0');
  await choisir(/^Aucun/, { exact: false });
  await suivant('Voir mon bilan');
}

/** La barre d'onglets est-elle **visible** ? Masquée, elle reste dans le DOM (`display: 'none'`),
 *  donc compter ses libellés ne dit rien : c'est la visibilité de « Suivi » qui répond. */
async function barreVisible() {
  for (const libelle of await page.getByText('Suivi', { exact: true }).all()) {
    if (await libelle.isVisible()) return true;
  }
  return false;
}
/**
 * Attendre un texte — et, s'il ne vient pas, **dire lequel**.
 *
 * Sans cette enveloppe, une phrase disparue rend un `locator.waitFor: Timeout 20000ms exceeded`
 * qui ne nomme rien : il faut alors retrouver dans le script la ligne où l'on en était. Mesuré en
 * cassant une phrase de l'écran (mutation 3 du second profil, 20/09/2026).
 */
/**
 * **Le focus a atteint l'élément dont le texte est `attendu`** — attendu, et non lu tout de suite :
 * l'effet qui le pose part après le rendu du geste. Là où c'est le délai lui-même qu'on garde (le
 * focus au geste, jamais à la fin d'une animation), on lit tout de suite, sans cette aide.
 */
async function focusSur(attendu, ou) {
  try {
    await page.waitForFunction(
      (t) => (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim() === t,
      attendu,
      { timeout: 2_000 }
    );
  } catch {
    const vu = await page.evaluate(() => (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80));
    throw new Ecart(`${ou}, le focus est sur « ${vu} » et non sur « ${attendu} »`);
  }
}
async function attendreTexte(motif) {
  try {
    await page.getByText(motif).first().waitFor({ state: 'visible', timeout: ATTENTE });
  } catch {
    throw new Ecart(`« ${motif} » n'est jamais apparu à l'écran`);
  }
}

/**
 * **Toute case d'option répond à un `radiogroup` nommé, toute case à cocher à un `group` nommé, et
 * aucun `radiogroup` ne coche deux cases** (25/09/2026, `v1-29`).
 *
 * Trois listes de modes du questionnaire n'avaient aucun groupe : « Voiture (seul) », atteint au
 * clavier ou au doigt, ne disait pas à quelle question il répond. Une précision qui s'ouvre sous un
 * mode vit **dans** le groupe de ce mode (`GroupeDeChoix` dit pourquoi), et c'est ce qui impose les
 * deux autres règles :
 * - **c'est le groupe le plus proche qui doit être nommé**, pas « un ancêtre » : une précision dont le
 *   groupe aurait perdu son nom trouverait sinon celui du mode ;
 * - **un `radiogroup` ne coche jamais plus d'une case.** Une précision privée de son propre groupe
 *   tombe dans celui du mode, qui devient son groupe le plus proche et qui est bien nommé : les deux
 *   premières règles passent, et seule celle-ci la voit — le mode et la motorisation cochés ensemble,
 *   comme deux réponses à la même question. **La première version de cette garde n'avait pas cette
 *   règle, et elle croyait n'en avoir pas besoin** : son commentaire affirmait que « le plus proche »
 *   suffisait. La mutation l'a démentie (en-tête, P2) — la motorisation n'était vue qu'aux longs
 *   trajets, là où elle n'est pas imbriquée.
 *
 * Appelée à chaque étape du questionnaire, sur la feuille d'engagement et sur « Toi » ; une page sans
 * aucun choix n'est pas un succès, c'est une mesure qui n'a pas eu lieu.
 */
async function verifierLesGroupes(ou) {
  const releve = await page.evaluate(() => {
    const choix = [...document.querySelectorAll('[role="radio"], [role="checkbox"]')];
    const fautifs = [];
    const cochesParGroupe = new Map();
    for (const element of choix) {
      const role = element.getAttribute('role');
      const attendu = role === 'radio' ? 'radiogroup' : 'group';
      const groupe = element.parentElement?.closest('[role="radiogroup"], [role="group"]') ?? null;
      const nom = groupe?.getAttribute('aria-label')?.trim() ?? '';
      const libelle = (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();
      if (groupe === null || groupe.getAttribute('role') !== attendu || nom === '') {
        fautifs.push(
          `${role} « ${libelle} » — ` +
            (groupe === null ? 'aucun groupe' : `plus proche groupe : ${groupe.getAttribute('role')} « ${nom} »`)
        );
      } else if (role === 'radio' && element.getAttribute('aria-checked') === 'true') {
        cochesParGroupe.set(groupe, [...(cochesParGroupe.get(groupe) ?? []), libelle]);
      }
    }
    for (const [groupe, coches] of cochesParGroupe) {
      if (coches.length > 1) {
        fautifs.push(
          `radiogroup « ${groupe.getAttribute('aria-label')} » — ${coches.length} cases cochées à la fois` +
            ` (${coches.map((c) => `« ${c} »`).join(', ')}) : une précision privée de son propre groupe est` +
            ' tombée dans celui de l’option qu’elle précise'
        );
      }
    }
    return { total: choix.length, fautifs };
  });
  assurer(releve.total > 0, `${ou} : aucun choix à l'écran, les groupes n'ont pas pu être vérifiés`);
  assurer(
    releve.fautifs.length === 0,
    `${ou} : ${releve.fautifs.length} défaut(s) de groupe — une case d'option doit répondre à un` +
      ' radiogroup nommé qui n’en coche qu’une, une case à cocher à un group nommé, par GroupeDeChoix :' +
      `\n  ${releve.fautifs.join('\n  ')}`
  );
}

/**
 * « Suivant » (ou « Voir mon bilan ») sur une étape du questionnaire, et **l'une des deux issues**
 * attendue après le clic (29/09/2026, `v1-31` §4.5) : l'étape a changé — la ligne « Étape N sur M » a
 * bougé ou disparu, ou une feuille s'est ouverte —, ou « Il manque encore … » est là, et le parcours
 * s'arrête en la citant.
 *
 * **Playwright n'attend plus rien d'autre** : le « Suivant » d'une étape incomplète n'est plus ni
 * `disabled` ni `aria-disabled` — il mène à ce qui manque —, donc le clic part aussitôt. Un parcours
 * qui cliquerait sur une étape incomplète ne resterait plus bloqué : il échouerait à l'étape d'après,
 * sous un message qui nommerait la mauvaise cause. La ligne « Étape » est lue avant la ligne qui
 * manque : l'une et l'autre changent dans le même rendu, donc une ligne vue sous l'ancienne étape est
 * bien celle de l'étape qu'on quitte.
 */
async function avancer(libelle = 'Suivant') {
  const lireEtape = () =>
    page.evaluate(() => {
      const normaliser = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
      const n = [...document.querySelectorAll('div')].find(
        (d) => d.children.length === 0 && /^Étape \d+ sur \d+$/.test(normaliser(d.innerText))
      );
      return n ? normaliser(n.innerText) : null;
    });
  const avant = await lireEtape();
  await bouton(libelle);
  const issue = await page
    .waitForFunction(
      (etapeAvant) => {
        const normaliser = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
        const etape = [...document.querySelectorAll('div')].find(
          (d) => d.children.length === 0 && /^Étape \d+ sur \d+$/.test(normaliser(d.innerText))
        );
        if (!etape || normaliser(etape.innerText) !== etapeAvant) return 'avance';
        if (document.querySelector('[aria-modal="true"]')) return 'avance';
        const ligne = [...document.querySelectorAll('body *')].find(
          (e) =>
            e.getClientRects().length > 0 &&
            /^Il manque encore /.test(normaliser(e.innerText)) &&
            ![...e.children].some((c) => /^Il manque encore /.test(normaliser(c.innerText)))
        );
        return ligne ? `manque:${normaliser(ligne.innerText)}` : false;
      },
      avant,
      { timeout: ATTENTE }
    )
    .then((h) => h.jsonValue())
    .catch(() => null);
  if (issue === null) {
    throw new Ecart(`« ${libelle} » n'a mené ni à l'étape suivante ni à ce qui manque (${avant ?? 'sans étape'})`);
  }
  if (issue.startsWith('manque:')) {
    throw new Ecart(`« ${libelle} » n'avance pas sur ${avant} : « ${issue.slice('manque:'.length)} »`);
  }
}

/** Le bouton qui quitte une étape du questionnaire — après avoir vérifié les groupes qu'elle rend. */
async function suivant(libelle = 'Suivant') {
  await verifierLesGroupes(`l'étape du questionnaire en cours (${etapeCourante})`);
  await avancer(libelle);
}

/**
 * Le texte tertiaire du thème clair, **lu dans `theme.ts`** plutôt que recopié — comme
 * `ControlHeight.target` dans `verifier-etats-export.mjs` : une ligne de canal hors d'atteinte porte
 * son titre dans cette couleur (25/09/2026).
 */
const TEXTE_TERTIAIRE = (() => {
  const source = readFileSync('src/constants/theme.ts', 'utf8');
  const hex = source.match(/light:\s*\{[^}]*?\btextTertiary:\s*'#([0-9A-Fa-f]{6})'/)?.[1];
  if (!hex) {
    console.error('`Colors.light.textTertiary` est introuvable dans src/constants/theme.ts : adapter le motif.');
    process.exit(2);
  }
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
})();

/** Le rapport de contraste WCAG entre deux couleurs CSS opaques (`rgb(…)`). */
function contraste(a, b) {
  const luminance = (css) => {
    const [r, g, bleu] = css.match(/\d+(\.\d+)?/g).map(Number);
    const canal = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(bleu);
  };
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}

/** La session que l'app a ouverte, lue là où le SDK la range (`sb-<ref>-auth-token`). */
async function session() {
  const brut = await page.evaluate(() => {
    for (const cle of Object.keys(localStorage)) {
      if (cle.startsWith('sb-') && cle.endsWith('-auth-token')) return localStorage.getItem(cle);
    }
    return null;
  });
  assurer(brut, 'aucune session Supabase dans le stockage du navigateur');
  const s = JSON.parse(brut);
  return { jeton: s.access_token, userId: s.user.id };
}
/** Une lecture PostgREST **comme la personne** — sous sa session, donc sous la RLS. */
async function lire(chemin, jeton) {
  const reponse = await fetch(`${API}/rest/v1/${chemin}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${jeton}` },
  });
  if (!reponse.ok) throw new Ecart(`lecture ${chemin} : HTTP ${reponse.status} ${await reponse.text()}`);
  return reponse.json();
}
async function rpc(nom, jeton, corps = {}) {
  const reponse = await fetch(`${API}/rest/v1/rpc/${nom}`, {
    method: 'POST',
    headers: { apikey: jeton === SERVICE ? SERVICE : ANON, Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
  if (!reponse.ok) throw new Ecart(`rpc ${nom} : HTTP ${reponse.status} ${await reponse.text()}`);
}

try {
  // ── 1. L'onboarding, jusqu'au questionnaire ──────────────────────────────────────────────────
  etape('onboarding');
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForURL(/\/onboarding/, { timeout: ATTENTE });
  await boutonDuPager('Découvrir mon impact', 0);
  await boutonDuPager('Continuer', 1);
  await boutonDuPager('Continuer', 2);
  await boutonDuPager('Commencer', 3);
  await page.waitForURL(/\/bilan/, { timeout: ATTENTE });

  // ── 2. Le questionnaire, réponse par réponse ────────────────────────────────────────────────
  etape('questionnaire — trajet régulier');
  await choisir('Oui');
  await suivant();

  etape('questionnaire — jours et distance');
  await choisir('5');
  const distance = page.getByRole('textbox', { name: 'Distance pour un aller, en km' });
  await distance.waitFor({ state: 'visible', timeout: ATTENTE });
  await distance.fill('30');
  await suivant();

  etape('questionnaire — mode');
  await choisir('Voiture (seul)');
  await choisir('Thermique');
  await suivant();

  etape('questionnaire — second mode');
  // « Oui » d'abord, et seulement pour ouvrir la liste « Lequel ? » : c'est l'une des trois listes de
  // modes qui n'avaient pas de groupe (25/09/2026), et sans ce détour aucun des deux profils ne la
  // rendrait jamais. « Non » ensuite, la réponse du profil — il efface ce que « Oui » avait ouvert
  // (`normaliserReponses`), donc les chiffres attendus ne bougent pas.
  await choisir('Oui');
  await attendreTexte('Lequel ?');
  await verifierLesGroupes('la liste « Lequel ? » du second mode');
  await choisir('Non');
  await suivant();

  etape('questionnaire — sorties');
  await choisir('Une fois par semaine');
  await suivant();
  await choisir('Voiture (seul)');
  await choisir('Thermique');
  await choisir('15 à 30 km');
  await suivant();

  etape('questionnaire — vols');
  await choisir('2'); // le total : 2 vols dans l'année
  await choisir('1', { dernier: true }); // dont 1 court — la seconde série, rendue après le total
  await attendreTexte('1 vol long-courrier sera compté.');
  await suivant();

  etape('questionnaire — longs trajets');
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en train' }).getByRole('radio', { name: '0', exact: true }).click();
  // C4.4 : la troisième série, cliquée à zéro. Elle vaut déjà zéro par défaut, donc ce clic
  // n'existe que pour qu'un compteur qui disparaîtrait de l'écran fasse échouer le parcours.
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en autocar' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en voiture' }).getByRole('radio', { name: '2', exact: true }).click();
  await choisir('Thermique');
  await choisir('2 personnes');
  await suivant();

  etape('questionnaire — contexte');
  await choisir('Périurbain');
  await choisir('Limité');
  await choisir('1');
  await choisir(/^Un jour/, { exact: false });
  await suivant('Voir mon bilan');

  // ── 3. La restitution, et la base derrière ───────────────────────────────────────────────────
  etape('restitution');
  await page.waitForURL(/\/suivi\/bilan/, { timeout: 45_000 });
  await attendreTexte('4,2 t CO₂e');
  // **Ce profil est le cas d'égalité du départage** (24/09/2026, `v1-29`) : voyages 2,0 t,
  // domicile-travail 1,9 t, et le serveur retient le plus régulier à 5 % près. L'étiquette disait
  // « Le déplacement qui pèse le plus » au-dessus de barres qui montrent l'inverse ; elle le dit
  // maintenant (`etiquetteDuPosteDominant`), et seul ce parcours la voit rendue depuis de vrais
  // chiffres serveur.
  await attendreTexte('Le plus régulier, presque à égalité avec tes voyages');
  // La moitié positive de l'absence que le cycliste vérifie plus bas (constat 10.2, 28/09/2026) :
  // sans elle, une barre du palier qui ne se rendrait plus pour personne passerait la négative.
  await attendreTexte('Ton prochain palier');
  assurer(!(await barreVisible()), 'la barre d’onglets est visible sur la restitution du premier bilan (C5.7)');
  const { jeton, userId } = await session();
  const bilans = await lire('assessments?select=id,status', jeton);
  assurer(bilans.length === 1 && bilans[0].status === 'completed', `bilans lus : ${JSON.stringify(bilans)}`);
  const [resultat] = await lire('assessment_results?select=total_co2_kg_year,dominant_poste_co2_kg_year', jeton);
  assurer(resultat, 'aucun assessment_results lisible');
  assurer(
    Math.round(resultat.total_co2_kg_year) === ATTENDU.totalKg,
    `total ${resultat.total_co2_kg_year} kg, attendu ${ATTENDU.totalKg}`
  );
  assurer(
    Math.round(resultat.dominant_poste_co2_kg_year) === ATTENDU.dominantKg,
    `poste dominant ${resultat.dominant_poste_co2_kg_year} kg, attendu ${ATTENDU.dominantKg}`
  );

  // ── 4. La restitution mène au plan, et à rien d'autre ───────────────────────────────────────
  //
  // **C'est la garde de l'arbitrage du 20/09/2026.** Le bouton passait par un écran de compte
  // (`/connexion?source=resultat_transition`), qu'il fallait refuser par « Continuer sans compte »
  // pour atteindre le plan : le bouton ne faisait pas ce qu'il disait, au moment exact où la
  // personne vient de comprendre son chiffre. Ce qui reste est la bannière en tête du contenu, et
  // elle se rend **dès le premier passage** — c'est ce que la ligne vérifiée juste avant garde.
  //
  // L'assertion la plus importante des trois est la négative : on affirme qu'aucun écran de compte
  // ne s'interpose. Sans elle, remettre l'interposition laisserait la suite verte (le plan est
  // atteint, une redirection plus loin).
  etape('la restitution mène au plan');
  await attendreTexte('Ce bilan n’est accessible que depuis cet appareil.');
  // **L'assertion négative se lit sur les navigations, pas sur l'URL d'arrivée**, et c'est un
  // correctif : elle testait `page.url()` **après** `waitForURL(/\/plan/)`, donc elle ne pouvait
  // pas tomber — un écran de compte qui s'interpose fait expirer l'attente, et le message parle
  // alors d'un délai et non de la promesse cassée. Une tautologie dont le commentaire affirmait
  // qu'elle était « la plus importante des trois » (relevé en revue le 21/09/2026). En écoutant les
  // navigations, on peut affirmer qu'aucun écran de compte n'a été traversé, même fugitivement.
  const visitees = [];
  const noter = (frame) => {
    if (frame === page.mainFrame()) visitees.push(frame.url());
  };
  page.on('framenavigated', noter);
  await bouton('Voir ce que je peux faire');
  await page.waitForURL(/\/plan/, { timeout: ATTENTE }).catch(() => {});
  page.off('framenavigated', noter);
  assurer(
    !visitees.some((u) => /\/connexion/.test(u)),
    `un écran de compte s'est interposé entre la restitution et le plan : ${visitees.join(' → ') || '(aucune navigation vue)'}`
  );
  assurer(/\/plan/.test(page.url()), `« Voir ce que je peux faire » n'a pas mené au plan : ${page.url()}`);

  // ── 5. Le plan : les dix pistes, le cap, la carte du premier plan ───────────────────────────
  etape('plan');
  await page.waitForURL(/\/plan/, { timeout: ATTENTE });
  await attendreTexte(ATTENDU.pistes[0][0]);
  await attendreTexte(ATTENDU.pistes[1][0]);
  // Deux cartes pleines, puis la porte vers l’écran « Toutes les pistes » (C5.2), qui compte tout.
  await attendreTexte(`Voir toutes les pistes · ${ATTENDU.pistes.length}`);
  await attendreTexte(new RegExp(`−\\s?${ATTENDU.capKg}\\s?kg`)); // « − 384 kg », le signe moins typographique
  // Le cap est annuel, comme les gains des pistes, et les deux premières le franchissent chacune
  // (619 et 1 601 kg contre 384) : la carte du cap le dit tant que rien n'est engagé (24/09/2026,
  // `v1-29`, `phraseDesPistesSuffisantes`).
  await attendreTexte('Chacune des deux pistes proposées suffit à le franchir.');
  const pistes = await lire(
    'plan_actions?select=rank,saving_kg_year,committed_at,action_templates(action_text)&order=rank',
    jeton
  );
  assurer(pistes.length === ATTENDU.pistes.length, `${pistes.length} pistes figées, attendu ${ATTENDU.pistes.length}`);
  ATTENDU.pistes.forEach(([texte, gain], i) => {
    assurer(
      pistes[i].action_templates.action_text === texte && Math.round(pistes[i].saving_kg_year) === gain,
      `piste ${i + 1} : « ${pistes[i].action_templates.action_text} » (${Math.round(pistes[i].saving_kg_year)} kg), ` +
        `attendu « ${texte} » (${gain} kg)`
    );
  });
  assurer(pistes.every((p) => p.committed_at === null), 'une piste est déjà engagée avant tout geste');

  etape('plan — « Compris » fait venir la barre');
  assurer(!(await barreVisible()), 'la barre d’onglets est là avant « Compris » (C5.7)');
  // **Et elle arrive en glissant** (27/09/2026, `v1-30` §5.5) : c'était l'écart n° 3 de `v1-17` §9,
  // levé. Au moins une image la montre en chemin — translucide ou sous sa place —, et elle finit
  // posée. Le contraire, une barre qui glisserait à chaque ouverture, est gardé par la section J de
  // `verifier-etats-export.mjs`.
  const arrivee = await releverPendant(
    page,
    { barre: ['barre'] },
    () => page.getByText('Compris', { exact: true }).click(),
    1_200
  );
  await page.waitForFunction(
    () => [...document.querySelectorAll('*')].some((e) => e.textContent === 'Suivi' && e.getClientRects().length > 0),
    undefined,
    { timeout: ATTENTE }
  );
  const barrePosee = await mesurer(page, 'barre');
  const vuesDeLaBarre = arrivee.map((e) => e.barre).filter(Boolean);
  assurer(barrePosee && vuesDeLaBarre.length > 0, 'la barre d’onglets n’a pas pu être relevée pendant son arrivée');
  assurer(
    enChemin(vuesDeLaBarre.map((v) => v.haut), barrePosee.haut) ||
      enChemin(vuesDeLaBarre.map((v) => v.opacite), 1, 0.02),
    'la barre d’onglets surgit au « Compris » au lieu d’arriver en glissant — aucune image entre son départ et sa' +
      ' place (`arrivee`, src/app/(tabs)/_layout.tsx)'
  );
  assurer(barrePosee.opacite >= 0.99, `la barre d’onglets reste translucide après son arrivée (${barrePosee.opacite})`);

  // ── 6. L'engagement sur la première piste ───────────────────────────────────────────────────
  etape('engagement');
  // **Le focus suit le geste, sur le plan aussi** (29/09/2026, `v1-32` §4.2) : « Je m'y engage » le
  // donne à la question, « Annuler » le rend au bouton revenu. Les deux disparaissent sous le doigt ;
  // sans ça, le focus tombait sur le document et la tabulation repartait du haut du plan. C'est la
  // moitié web de `donnerLeFocus` — la moitié native, TalkBack, reste au doigt (`v1-13` §11.24).
  await bouton('Je m’y engage');
  await focusSur('Quels jours ?', 'après « Je m’y engage », sur le plan');
  await bouton('Annuler');
  await focusSur('Je m’y engage', 'après « Annuler », sur le plan');
  await bouton('Je m’y engage');
  await verifierLesGroupes('la feuille d’engagement');

  // **« mardi » se coche au clavier** (25/09/2026) — c'était alors la seule case à cocher du produit ;
  // la case du mot de la veille (C4.2, 28/09/2026) en est une seconde.
  // react-native-web n'active par Espace qu'un bouton : depuis que les jours sont des `checkbox`, Espace
  // n'y cochait plus rien et faisait défiler le plan (`src/lib/barre-d-espace.ts`). Trois gestes, et
  // chacun garde une moitié différente de la règle — c'est une case à cocher qui les rend visibles, là
  // où une case d'option cochée deux fois reste cochée :
  //   - Espace coche, et **rien ne défile** — la page retenue par `preventDefault()` ;
  //   - Entrée décoche : react-native-web l'active déjà, et si notre gestionnaire la prenait aussi, la
  //     case basculerait deux fois et resterait cochée ;
  //   - une barre d'espace **maintenue** coche une fois : le navigateur répète `keydown`, et chaque
  //     répétition la ferait basculer.
  // La case finit cochée : c'est la réponse du profil, que la base relit juste après.
  const mardi = page.getByRole('checkbox', { name: 'mardi', exact: true });
  await mardi.focus();
  const avantEspace = await mardi.evaluate(mesurerUnChoix);
  assurer(
    avantEspace.etat === 'false' && avantEspace.focus && avantEspace.peutDefiler,
    `la mesure de « mardi » ne peut pas se prendre (${JSON.stringify(avantEspace)}) : il faut une case` +
      ' décochée, qui a le focus, sous une page qui peut encore défiler'
  );
  await page.keyboard.press('Space');
  await page.waitForTimeout(600); // le défilement du navigateur est animé
  const apresEspace = await mardi.evaluate(mesurerUnChoix);
  assurer(apresEspace.etat === 'true', 'Espace ne coche pas « mardi » : react-native-web ne gère Espace que sur un bouton');
  assurer(
    apresEspace.positions === avantEspace.positions,
    `Espace sur « mardi » fait défiler le plan (${avantEspace.positions} → ${apresEspace.positions} px)`
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  assurer(
    (await mardi.getAttribute('aria-checked')) === 'false',
    'Entrée n’a pas décoché « mardi » : la case a basculé deux fois, Entrée est prise deux fois'
  );
  await page.keyboard.down('Space');
  await page.keyboard.down('Space'); // la répétition d'une touche maintenue (`repeat`)
  await page.keyboard.up('Space');
  await page.waitForTimeout(300);
  assurer(
    (await mardi.getAttribute('aria-checked')) === 'true',
    'une barre d’espace maintenue n’a pas laissé « mardi » coché : la répétition a basculé la case'
  );
  await choisir('jeudi');
  await bouton('C’est noté');
  await page.waitForFunction(
    () => document.body.innerText.includes('Changer d’avis'),
    undefined,
    { timeout: ATTENTE }
  );
  const [engagee] = await lire('plan_actions?select=rank,committed_at,intention_days&rank=eq.1', jeton);
  assurer(engagee && engagee.committed_at !== null, 'la piste 1 n’est pas engagée en base');
  assurer(JSON.stringify(engagee.intention_days) === '[2,4]', `jours engagés ${JSON.stringify(engagee.intention_days)}, attendu [2,4]`);

  // ── 7. Un point généré comme le cron le ferait, puis répondu ────────────────────────────────
  etape('point — génération (service_role) puis réponse');
  await rpc('generate_commute_checkins', SERVICE);
  const [point] = await lire('engagement_checkins?select=id,status,question_kind,committed_question', jeton);
  assurer(point && point.status === 'pending', `point lu : ${JSON.stringify(point)}`);
  assurer(point.question_kind === 'engagement', `genre du point ${point.question_kind}, attendu engagement`);
  assurer(
    /^Mardi ou jeudi, /.test(point.committed_question ?? ''),
    `question figée « ${point.committed_question} », attendue sur « Mardi ou jeudi, … »`
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await attendreTexte(point.committed_question);
  // **La carte change de hauteur, et le cap qui est dessous suit** (27/09/2026, `v1-30` §5.7) : la
  // question et ses boutons laissent place à la réplique, et `HauteurSuivie` fait passer la carte
  // d'une hauteur à l'autre au lieu de faire sauter le reste de l'écran. Le bouton est amené dans la
  // fenêtre **avant** le relevé : un défilement pendant le geste déplacerait tout, et se lirait
  // comme un mouvement.
  // **Revenir sur le plan ne rouvre rien** (contre-lecture du 27/09/2026). Sur web, la pile masque
  // l'écran recouvert (`display: none`), où `onLayout` rend une hauteur nulle : `HauteurSuivie` la
  // tenait, et la carte du point regrandissait sous les yeux au retour, tout le plan glissant
  // dessous. Joué **avant** la réponse, pour qu'aucune donnée ne change pendant le détour : ce qui
  // bouge au retour ne peut être que ce défaut.
  // La mesure est la **hauteur** de la découpe de la carte, pas la position de ce qui est dessous :
  // la page a défilé jusqu'au lien des pistes, et l'ancrage du navigateur compense ce qui grandit
  // au-dessus de la fenêtre — une première version de cette garde, sur la position du cap, passait
  // avec le défaut en place.
  // **La référence se prend au repos, constaté** (30/09/2026) : juste après l'apparition de la
  // question, `HauteurSuivie` n'a pas encore sa découpe, et la mesure remontait jusqu'à l'écran —
  // 840 px au lieu de 153, sur un runner lent, et la garde tombait sans défaut (`mesurerAuRepos`).
  const CAP = 'Ton cap pour cette saison'; // la cadence de tous les profils (`season`)
  const LA_CARTE = { role: 'button', nom: 'Oui' };
  const carteAvantLeDetour = await mesurerAuRepos(page, 'decoupe', LA_CARTE);
  const versLesPistes = page.getByText(/^Voir toutes les pistes/).first();
  await versLesPistes.scrollIntoViewIfNeeded();
  await versLesPistes.click();
  await page.waitForURL(/\/plan\/pistes/, { timeout: ATTENTE });
  await page.waitForTimeout(800);
  const retourSurLePlan = await releverPendant(page, { carte: ['decoupe', LA_CARTE] }, () => page.goBack(), 1_200);
  await page.waitForURL(/\/plan$/, { timeout: ATTENTE });
  const hauteursDuRetour = retourSurLePlan.map((e) => e.carte).filter(Boolean);
  assurer(
    carteAvantLeDetour && hauteursDuRetour.length > 0,
    'la carte du point est introuvable avant ou après le détour, ou ne s’est jamais posée avant : la mesure ne peut pas conclure'
  );
  const hauteurQuiBouge = hauteursDuRetour.find((c) => Math.abs(c.hauteur - carteAvantLeDetour.hauteur) > 0.5);
  assurer(
    !hauteurQuiBouge,
    `au retour sur le plan, la carte du point passe par ${Math.round(hauteurQuiBouge?.hauteur ?? 0)} px au lieu de` +
      ` ${Math.round(carteAvantLeDetour.hauteur)} : elle regrandit sous les yeux — une hauteur nulle, celle d’un` +
      ' écran masqué, ne se tient pas (`HauteurSuivie`, src/lib/mouvement.tsx)'
  );

  const oui = page.getByRole('button', { name: 'Oui', exact: true }).first();
  await oui.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  // Et la carte tient sa hauteur en découpant ce qui dépasse : l'anneau de focus de « Oui », collé
  // au bord gauche du contenu, ne doit pas y passer — une découpe au ras l'effaçait.
  const anneau = await mesurer(page, 'anneau', { role: 'button', nom: 'Oui' });
  assurer(anneau !== null, '« Oui » est introuvable : l’anneau de focus ne peut pas être mesuré');
  assurer(
    anneau.rogne === null,
    `l’anneau de focus de « Oui » est rogné par un ${anneau.rogne} — la découpe de \`HauteurSuivie\`` +
      ' doit laisser de la place autour du contenu (`MARGE_DE_DECOUPE`, src/lib/mouvement.tsx)'
  );
  const avantLaReponse = await mesurer(page, 'texte', CAP);
  const reponse = await releverPendant(page, { cap: ['texte', CAP] }, () => oui.click());
  const apresLaReponse = await mesurer(page, 'texte', CAP);
  assurer(
    avantLaReponse && apresLaReponse && Math.abs(apresLaReponse.haut - avantLaReponse.haut) > 1,
    `« ${CAP} » introuvable ou immobile quand le point est répondu (${avantLaReponse?.haut} →` +
      ` ${apresLaReponse?.haut}) : la mesure ne peut pas conclure`
  );
  assurer(
    reponse.some((e) => e.cap && entre(e.cap.haut, avantLaReponse.haut, apresLaReponse.haut)),
    `le cap saute de ${Math.round(avantLaReponse.haut)} à ${Math.round(apresLaReponse.haut)} px quand le point est` +
      ' répondu, sans position intermédiaire — la carte doit changer de hauteur en glissant (`HauteurSuivie`)'
  );
  // Répondu, la carte range ses deux boutons ; le pied daté vient avec le rafraîchissement suivant,
  // et ce qui compte se lit en base.
  await page.getByRole('button', { name: 'Oui', exact: true }).waitFor({ state: 'hidden', timeout: ATTENTE });
  const [repondu] = await lire('engagement_checkins?select=status,response_kind,response', jeton);
  assurer(
    repondu.status === 'answered' && repondu.response_kind === 'oui' && repondu.response === true,
    `réponse enregistrée : ${JSON.stringify(repondu)}`
  );

  // ── 8. Le suivi ────────────────────────────────────────────────────────────────────────────
  etape('suivi');
  for (const libelle of await page.getByText('Suivi', { exact: true }).all()) {
    if (await libelle.isVisible()) {
      await libelle.click();
      break;
    }
  }
  await page.waitForURL(/\/suivi$/, { timeout: ATTENTE });
  await page.getByLabel(/^Bilan du .*4,2 t CO₂e$/).first().waitFor({ state: 'visible', timeout: ATTENTE });

  // ── 8 bis. « Toi » : la ligne de canal, hors d'atteinte et au clavier ────────────────────────
  //
  // **Le seul endroit de ce parcours où une ligne de canal se rend** (25/09/2026) : la feuille des
  // rappels ne s'ouvre sur web qu'avec une adresse rattachée, et ce profil n'en a pas.
  // Deux choses s'y vérifient, qu'aucune autre garde ne voyait :
  //   - **la ligne hors d'atteinte le dit par son texte, jamais par une opacité** (kit, `readme.md`,
  //     puce « États ») : sans compte, « Par email » est désactivée, jamais cochée — la préférence en
  //     base vaut pourtant `email` —, sans opacité, son titre en texte tertiaire et son détail, la
  //     phrase qui dit pourquoi, lisible. Sous l'opacité de 0,6 qu'elle portait, il tombait à 3,2:1 ;
  //   - **Espace choisit une ligne**, comme les autres choix, et le choix atteint la base.
  etape('« Toi » — la ligne de canal');
  for (const icone of await page.getByRole('button', { name: 'Ton compte', exact: true }).all()) {
    if (await icone.isVisible()) {
      await icone.click();
      break;
    }
  }
  await page.waitForURL(/\/compte/, { timeout: ATTENTE });
  const lesRappels = page.getByRole('radiogroup', { name: 'Les rappels', exact: true });
  await lesRappels.waitFor({ state: 'visible', timeout: ATTENTE });
  await verifierLesGroupes('« Toi »');

  const horsDAtteinte = await lesRappels.getByRole('radio', { name: /^Par email\./ }).evaluate((ligne) => {
    let opacite = 1;
    for (let n = ligne; n; n = n.parentElement) opacite *= Number(getComputedStyle(n).opacity);
    const [titre, detail] = [...ligne.querySelectorAll('div')].filter((e) => e.childElementCount === 0 && e.textContent.trim());
    return {
      desactivee: ligne.getAttribute('aria-disabled'),
      cochee: ligne.getAttribute('aria-checked'),
      opacite,
      fond: getComputedStyle(ligne).backgroundColor,
      titre: titre ? getComputedStyle(titre).color : null,
      detail: detail ? getComputedStyle(detail).color : null,
    };
  });
  assurer(
    horsDAtteinte.desactivee === 'true' && horsDAtteinte.cochee === 'false',
    `« Par email », sans compte, doit être désactivée et jamais cochée : ${JSON.stringify(horsDAtteinte)}`
  );
  assurer(
    horsDAtteinte.opacite === 1,
    `« Par email » hors d’atteinte porte une opacité de ${horsDAtteinte.opacite} : le kit l’interdit, et sous 0,6` +
      ' le détail qui dit pourquoi tombait à 3,2:1'
  );
  assurer(
    horsDAtteinte.titre === TEXTE_TERTIAIRE,
    `le titre de « Par email » hors d’atteinte est en ${horsDAtteinte.titre}, attendu le texte tertiaire ${TEXTE_TERTIAIRE}`
  );
  const lisibilite = contraste(horsDAtteinte.detail, horsDAtteinte.fond);
  assurer(
    lisibilite >= 4.5,
    `le détail de « Par email » hors d’atteinte ne tient que ${lisibilite.toFixed(2)}:1 sur son fond, sous 4,5:1`
  );

  const sansRappel = lesRappels.getByRole('radio', { name: /^Sans rappel\./ });
  await sansRappel.focus();
  assurer((await sansRappel.getAttribute('aria-checked')) === 'false', '« Sans rappel » est déjà cochée avant l’appui');
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => document.querySelector('[role="radio"][aria-label^="Sans rappel"]')?.getAttribute('aria-checked') === 'true',
    undefined,
    { timeout: ATTENTE }
  ).catch(() => {});
  assurer(
    (await sansRappel.getAttribute('aria-checked')) === 'true',
    'Espace ne choisit pas « Sans rappel » : la ligne de canal doit décomposer activableALaBarreDEspace'
  );
  // L'écriture part après la coche (optimiste, `choisirLeCanal`) : on relit la base jusqu'à la voir.
  let canalEnBase = null;
  const limiteDuCanal = Date.now() + ATTENTE;
  while (canalEnBase !== 'none' && Date.now() < limiteDuCanal) {
    const [profil] = await lire(`profiles?select=reminder_channel&id=eq.${userId}`, jeton);
    canalEnBase = profil?.reminder_channel ?? null;
    if (canalEnBase !== 'none') await page.waitForTimeout(200);
  }
  assurer(canalEnBase === 'none', `la préférence choisie à la barre d’espace n’a pas atteint la base : ${canalEnBase}`);

  // ── 8 ter. La feuille du re-bilan, avec et sans « réduire les animations » ───────────────────
  //
  // **Le voile se fond sur place, la feuille monte, Échap la fait redescendre** (27/09/2026, `v1-30`
  // §5.4). Le `Modal` animait tout d'un bloc : le voile gris montait du bas avec la feuille, la
  // fermeture était instantanée sur web, et la feuille glissait même sous la préférence. C'est la
  // seule feuille qui s'ouvre sur web sans adresse rattachée, et elle demande une action engagée :
  // on y arrive par un re-bilan, sans le soumettre — Échap la referme, et rien n'est écrit.
  etape('re-bilan — la feuille « Ton plan va être recalculé »');
  const FEUILLE = 'Ton plan va être recalculé';
  const jusquAVoirMonBilan = async () => {
    await page.goto(`${base}/bilan`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    // **Le questionnaire est prérempli après son montage**, par un aller-retour réseau. Tant que le
    // « Suivant » d'une étape vide était désactivé, le clic l'attendait sans que rien ne l'écrive ;
    // depuis `v1-31`, il est en attente et agit, donc il faut attendre la réponse cochée — sans quoi
    // le premier « Suivant » demanderait « une réponse » à une étape que le bilan précédent remplit
    // (contre-lecture du 29/09/2026). Une réponse cochée, et non le bandeau : un brouillon rouvert
    // préremplit lui aussi, sans bandeau.
    await page.locator('[role="radio"][aria-checked="true"]').first().waitFor({ state: 'visible', timeout: ATTENTE });
    const fin = page.getByRole('button', { name: 'Voir mon bilan', exact: true });
    // Le même contrôle que `suivant()` (`v1-31` §4.5) : une étape du re-bilan qui n'avancerait pas
    // arrête le parcours en citant ce qui manque, au lieu d'expirer sur une attente muette.
    for (let i = 0; i < 12 && !(await fin.isVisible().catch(() => false)); i++) await avancer('Suivant');
    assurer(await fin.isVisible(), '« Voir mon bilan » n’est jamais apparu au bout du re-bilan');
    return fin;
  };

  let voirMonBilan = await jusquAVoirMonBilan();
  const ouverture = await releverPendant(page, { feuille: ['feuille', FEUILLE] }, () => voirMonBilan.click());
  const feuillePosee = await mesurer(page, 'feuille', FEUILLE);
  assurer(feuillePosee?.voile && feuillePosee.haut !== null, `la feuille « ${FEUILLE} » est introuvable une fois ouverte`);
  const vuesALOuverture = ouverture.map((e) => e.feuille).filter((f) => f?.voile && f.haut !== null);
  const voileQuiBouge = vuesALOuverture.find((f) => Math.abs(f.voile.haut) > 0.5);
  assurer(
    !voileQuiBouge,
    `le voile de la feuille bouge (${Math.round(voileQuiBouge?.voile.haut)} px sous le haut de l’écran) : il doit` +
      ' assombrir l’écran sur place, et seule la feuille monte (`FeuilleDuBas`, `animationType="none"`)'
  );
  const voileEnFondu = enChemin(vuesALOuverture.map((f) => f.voile.opacite), 1, 0.02);
  const feuilleEnChemin = enChemin(vuesALOuverture.map((f) => f.haut), feuillePosee.haut);
  assurer(
    voileEnFondu && feuilleEnChemin,
    `la feuille s’ouvre d’un coup — voile en fondu ${ouiNon(voileEnFondu)}, feuille en chemin ${ouiNon(feuilleEnChemin)}`
  );
  const fermeture = await releverPendant(page, { feuille: ['feuille', FEUILLE] }, () => page.keyboard.press('Escape'));
  assurer((await mesurer(page, 'feuille', FEUILLE)) === null, 'Échap ne referme pas la feuille');
  assurer(
    enChemin(fermeture.map((e) => e.feuille?.haut).filter((h) => h != null), feuillePosee.haut),
    'la feuille disparaît d’un coup à Échap : elle doit redescendre avant de se démonter (`fermer`, `FeuilleDuBas`)'
  );

  etape('re-bilan — la même feuille sous « réduire les animations »');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  voirMonBilan = await jusquAVoirMonBilan();
  const ouvertureReduite = await releverPendant(page, { feuille: ['feuille', FEUILLE] }, () => voirMonBilan.click());
  const posee = await mesurer(page, 'feuille', FEUILLE);
  assurer(posee?.voile && posee.haut !== null, `la feuille « ${FEUILLE} » est introuvable une fois ouverte, sous la préférence`);
  const bouge = (f) => f?.haut != null && (Math.abs(f.haut - posee.haut) > 0.5 || (f.voile && f.voile.opacite < 0.99));
  // « Rien ne bouge » ne vaut que sur ce qu'on a vu : la feuille doit avoir été relevée, et ne pas
  // disparaître une fois là (contre-lecture du 27/09/2026).
  const feuillesReduites = ouvertureReduite.map((e) => e.feuille);
  assurer(
    feuillesReduites.some(Boolean) && !disparaitApresEtreApparue(feuillesReduites),
    'sous « réduire les animations », la feuille n’a pas été relevée pendant son ouverture, ou a disparu une fois là'
  );
  assurer(
    !ouvertureReduite.some((e) => bouge(e.feuille)),
    'sous « réduire les animations », la feuille s’ouvre en bougeant : elle doit être posée dès la première image'
  );
  const fermetureReduite = await releverPendant(page, { feuille: ['feuille', FEUILLE] }, () => page.keyboard.press('Escape'));
  assurer((await mesurer(page, 'feuille', FEUILLE)) === null, 'Échap ne referme pas la feuille, sous la préférence');
  assurer(
    !fermetureReduite.some((e) => bouge(e.feuille)),
    'sous « réduire les animations », la feuille redescend à Échap : elle doit partir d’un coup'
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // **Un « Retour » sans pile derrière** (recette du 28/09/2026, constat H1). Ouvert par son adresse
  // — un rechargement, un favori —, l'écran des pistes n'a rien derrière lui, et « Retour au plan »,
  // un `router.back()` nu, ne faisait rien. Les autres « Retour » qui avaient le même défaut passent
  // tous par `revenirOu`, dont Jest garde la décision. Ici, on garde qu'un écran l'appelle vraiment.
  etape('« Retour au plan » sans pile');
  await page.goto(`${base}/plan/pistes`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await attendreTexte('Toutes les pistes');
  await page.getByRole('link', { name: 'Retour au plan', exact: true }).first().click();
  try {
    await page.waitForURL((url) => url.pathname === '/plan', { timeout: ATTENTE });
  } catch {
    throw new Ecart('« Retour au plan », ouvert sans pile derrière, n’a pas ramené au plan');
  }

  // ── 8 quater. « Toutes les pistes » : on compare sur la liste, on touche pour choisir (`v1-32`) ──
  //
  // **Le défilement jusqu'à « C'est noté »** (planche B2 du canvas `v1-30`, 29/09/2026) : la carte
  // qu'on ouvre grandit vers le bas, et quand son bouton sort de la fenêtre, l'écran défile juste
  // assez pour le montrer — **sans que son titre passe jamais sous la bande**. Le cas qui mérite la
  // garde est celui d'une carte **déjà ouverte au-dessus**, qui se replie pendant que l'autre s'ouvre :
  // mesurée trop tôt, la nouvelle serait trop basse de ce que le repli rend, et l'écran défilerait
  // trop. L'ancrage du défilement de Chrome s'en mêle (TESTING-GARDES.md §2.14), d'où des positions lues
  // **dans la fenêtre**. Deux moitiés, comme toute garde d'animation : ça défile en glissant ; sous
  // « réduire les animations », ça se pose d'un coup.
  const TITRE_OUVERT_AU_DESSUS = 'Renoncer à un vol long-courrier cette année';
  const TITRE_DU_CHOIX = 'Faire une sortie sur trois à vélo à assistance électrique';
  const ouvrirLesPistes = async () => {
    await page.goto(`${base}/plan/pistes`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await attendreTexte('Toutes les pistes');
  };
  const rangee = (titre) => page.getByRole('button', { name: new RegExp(`^${titre}\\.`) }).first();
  /** La rangée amenée tout en bas de la fenêtre de défilement : la carte qu'elle ouvrira en sortira. */
  const rangeeEnBasDeLaFenetre = async (titre) => {
    const ok = await page.evaluate((t) => {
      const normaliser = (x) => (x ?? '').replace(/\s+/g, ' ').trim();
      const n = [...document.querySelectorAll('[role="button"]')].find((e) => normaliser(e.getAttribute('aria-label')).startsWith(`${t}.`));
      let fenetre = n?.parentElement;
      while (fenetre && !/(auto|scroll)/.test(getComputedStyle(fenetre).overflowY)) fenetre = fenetre.parentElement;
      if (!n || !fenetre) return false;
      fenetre.scrollTop += n.getBoundingClientRect().bottom - fenetre.getBoundingClientRect().bottom;
      return true;
    }, titre);
    assurer(ok, `la rangée « ${titre} » ou sa fenêtre de défilement est introuvable : la mesure ne peut pas se prendre`);
    await page.waitForTimeout(400);
  };
  const LA_CARTE_DU_CHOIX = { titre: TITRE_DU_CHOIX, bouton: 'C’est noté' };

  etape('pistes — le défilement jusqu’à « C’est noté », une carte ouverte au-dessus');
  await ouvrirLesPistes();
  await rangee(TITRE_OUVERT_AU_DESSUS).click();
  await attendreTexte('Quand ?');
  // Le temps que cette première carte ait fini de grandir et de faire, elle aussi, son défilement :
  // sans quoi il partirait après qu'on a placé la rangée, et la déplacerait.
  await page.waitForTimeout(1_200);
  await rangeeEnBasDeLaFenetre(TITRE_DU_CHOIX);
  const ouvertureDuChoix = await releverPendant(
    page,
    { carte: ['defilement', LA_CARTE_DU_CHOIX] },
    () => rangee(TITRE_DU_CHOIX).click(),
    1_500
  );
  const vues = ouvertureDuChoix.map((e) => e.carte).filter(Boolean);
  assurer(vues.length > 0, `« ${TITRE_DU_CHOIX} » n’a pas été relevée pendant son ouverture : la mesure ne peut pas conclure`);
  const carteDuChoix = vues[vues.length - 1];
  const positions = vues.map((v) => v.position);
  assurer(
    carteDuChoix.basDuBouton !== null && carteDuChoix.basDuBouton <= carteDuChoix.hauteur + 0.5,
    `« C’est noté » finit hors de l’écran (${Math.round(carteDuChoix.basDuBouton ?? -1)} px pour une fenêtre de ${carteDuChoix.hauteur}) :` +
      ' l’écran devait défiler juste assez pour le montrer (`defilementPourMontrer`, src/app/(tabs)/plan/pistes.tsx)'
  );
  // **Juste assez, et pas plus** : le bas de la carte s'arrête à la marge du bas, donc « C'est noté »
  // finit près du bas de la fenêtre — 61 px au-dessus, mesuré le 29/09/2026 (la marge de 16 et le pied
  // de la carte). Un écran qui défile trop le laisse au milieu : 203 px sous la mutation PR2, où la
  // carte du dessus, encore visible, avait déjà fait monter la nouvelle en se repliant, et où la
  // mesure prise trop tôt ajoutait tout ce repli par-dessus.
  assurer(
    carteDuChoix.hauteur - carteDuChoix.basDuBouton < 100,
    `l’écran défile trop : « C’est noté » finit ${Math.round(carteDuChoix.hauteur - carteDuChoix.basDuBouton)} px au-dessus du bas de la` +
      ' fenêtre — il devait défiler juste assez pour le montrer, une fois la carte du dessus repliée'
  );
  const sousLaBande = vues.find((v) => v.haut < -0.5);
  assurer(
    !sousLaBande,
    `le titre de la carte passe sous la bande (${Math.round(sousLaBande?.haut ?? 0)} px) : l’écran a défilé trop loin —` +
      ' la carte ouverte au-dessus doit avoir fini de se replier avant qu’on mesure'
  );
  assurer(
    carteDuChoix.position > Math.min(...positions) + 1 && enChemin(positions, carteDuChoix.position),
    `l’écran ne défile pas en glissant jusqu’à « C’est noté » (positions ${[...new Set(positions.map(Math.round))].join(' → ')})`
  );
  // La première carte s'est refermée : une seule à la fois (décision n° 1).
  assurer(
    (await page.getByText('Quand ?', { exact: true }).count()) === 1,
    'deux cartes sont ouvertes à la fois : toucher une autre rangée doit refermer la première'
  );

  etape('pistes — le même défilement sous « réduire les animations »');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ouvrirLesPistes();
  await rangeeEnBasDeLaFenetre(TITRE_DU_CHOIX);
  const ouvertureDuChoixReduite = await releverPendant(
    page,
    { carte: ['defilement', LA_CARTE_DU_CHOIX] },
    () => rangee(TITRE_DU_CHOIX).click(),
    1_000
  );
  const vuesDuChoixReduites = ouvertureDuChoixReduite.map((e) => e.carte);
  assurer(
    vuesDuChoixReduites.some(Boolean) && !disparaitApresEtreApparue(vuesDuChoixReduites),
    'sous « réduire les animations », la carte n’a pas été relevée pendant son ouverture, ou a disparu une fois là'
  );
  const carteDuChoixReduite = vuesDuChoixReduites.filter(Boolean).at(-1);
  const positionsDuChoixReduites = vuesDuChoixReduites.filter(Boolean).map((v) => v.position);
  assurer(
    carteDuChoixReduite.position > Math.min(...positionsDuChoixReduites) + 1 &&
      carteDuChoixReduite.basDuBouton !== null &&
      carteDuChoixReduite.basDuBouton <= carteDuChoixReduite.hauteur + 0.5,
    'sous « réduire les animations », l’écran ne défile pas jusqu’à « C’est noté »'
  );
  assurer(
    !enChemin(positionsDuChoixReduites, carteDuChoixReduite.position),
    `sous « réduire les animations », l’écran défile en glissant (positions ${[...new Set(positionsDuChoixReduites.map(Math.round))].join(' → ')}) :` +
      ' il doit se poser d’un coup (`animated: !animationsReduites`)'
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // **Choisir depuis la liste, à la place** (29/09/2026). L'engagement se jouait sur le plan, et aucun
  // chemin ne choisissait depuis la liste contre une vraie stack — c'est pourtant le seul qui passe
  // `p_replace` à vrai depuis cet écran : sa pastille dit « Choisir à la place », et le RPC refuse un
  // remplacement qu'on ne lui a pas demandé (`RM001`). La carte s'ouvre **sur la question**, rien de
  // coché ; la base relue dit que l'engagement a changé de ligne, et que l'ancien est archivé.
  etape('pistes — choisir depuis la liste, à la place');
  await ouvrirLesPistes();
  const aLaPlace = rangee(TITRE_OUVERT_AU_DESSUS);
  assurer(
    /\. Choisir à la place\.$/.test((await aLaPlace.getAttribute('aria-label')) ?? ''),
    `la rangée « ${TITRE_OUVERT_AU_DESSUS} » ne dit pas « Choisir à la place » alors qu’une autre action est engagée`
  );
  await aLaPlace.click();
  await attendreTexte('Quand ?');
  // **Au geste, lu tout de suite** (`FRONT-MOUVEMENT.md` §2.12) : la carte grandit encore, et le focus doit déjà
  // être sur la question. Un focus qui attendrait la fin de l'entrée serait en retard sur l'annonce.
  const focusSurLaQuestion = await page.evaluate(() => (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim());
  assurer(
    focusSurLaQuestion === 'Quand ?',
    `après « Choisir à la place », le focus est sur « ${focusSurLaQuestion.slice(0, 60)} » et non sur la question — au geste, pas à la fin de l’entrée`
  );
  assurer((await page.getByRole('button', { name: 'Je m’y engage', exact: true }).count()) === 0, '« Je m’y engage » est encore sur le chemin de la liste');
  // **Jamais estompée sur la liste** (planche B3) : une autre action est engagée, mais la carte ouverte
  // est celle qu'on est en train de choisir. Son cadre garde le filet `border` — celui des rangées —
  // et ne passe pas à `backgroundElement`, le filet d'une proposition qui recule sur le plan.
  const filets = await page.evaluate(() => {
    // L'espace avant « ? » est insécable : on compare le texte normalisé, comme `focusSur`.
    const quand = [...document.querySelectorAll('*')].find(
      (e) => e.childElementCount === 0 && (e.textContent ?? '').replace(/\s+/g, ' ').trim() === 'Quand ?'
    );
    let carte = quand?.parentElement;
    while (carte && parseFloat(getComputedStyle(carte).borderTopWidth) === 0) carte = carte.parentElement;
    const rangee = [...document.querySelectorAll('[role="button"]')].find((e) => parseFloat(getComputedStyle(e).borderBottomWidth) > 0);
    return { carte: carte && getComputedStyle(carte).borderTopColor, rangee: rangee && getComputedStyle(rangee).borderBottomColor };
  });
  assurer(filets.carte && filets.rangee, `le cadre de la carte ou le filet d’une rangée est introuvable (${JSON.stringify(filets)})`);
  assurer(
    filets.carte === filets.rangee,
    `la carte ouverte sur le choix est estompée (${filets.carte} au lieu de ${filets.rangee}) : sur la liste, elle ne l’est jamais`
  );
  // **« Annuler » la rend à sa ligne** (décision n° 1), et le focus à la rangée revenue : la carte
  // disparaît sous le doigt avec son bouton, c'est l'écran qui rend la main.
  await bouton('Annuler');
  try {
    await aLaPlace.waitFor({ state: 'visible', timeout: ATTENTE });
  } catch {
    throw new Ecart('« Annuler », sur la liste, n’a pas rendu la carte à sa rangée');
  }
  assurer((await page.getByText('Quand ?', { exact: true }).count()) === 0, '« Annuler », sur la liste, laisse la question à l’écran');
  assurer(
    (await page.getByRole('button', { name: /^Choisir celle-ci/ }).count()) === 0,
    '« Annuler », sur la liste, a replié le sélecteur dans la carte au lieu de la refermer'
  );
  const focusSurLaRangee = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
  assurer(
    focusSurLaRangee.startsWith(`${TITRE_OUVERT_AU_DESSUS}.`),
    `après « Annuler », sur la liste, le focus est sur « ${focusSurLaRangee.slice(0, 60)} » et non sur la rangée revenue`
  );
  await aLaPlace.click();
  await attendreTexte('Quand ?');
  for (const echeance of ['À mon prochain projet de voyage', 'Avant mon prochain bilan']) {
    assurer(
      (await page.getByRole('radio', { name: echeance, exact: true }).getAttribute('aria-checked')) === 'false',
      `« ${echeance} » est déjà cochée à l’ouverture : aucune échéance par défaut`
    );
  }
  const cEstNote = page.getByRole('button', { name: 'C’est noté', exact: true });
  assurer((await cEstNote.getAttribute('aria-disabled')) === 'true', '« C’est noté » est actif avant qu’une échéance soit choisie');
  await choisir('Avant mon prochain bilan');
  await cEstNote.click();
  try {
    await page.waitForURL((url) => url.pathname === '/plan', { timeout: ATTENTE });
  } catch {
    throw new Ecart('« C’est noté », depuis la liste, n’a pas ramené au plan');
  }
  await attendreTexte('TON ENGAGEMENT');
  const texteDuPlanApresLeChoix = await page.evaluate(() => document.body.innerText);
  assurer(
    texteDuPlanApresLeChoix.indexOf(TITRE_OUVERT_AU_DESSUS) !== -1 &&
      texteDuPlanApresLeChoix.indexOf(TITRE_OUVERT_AU_DESSUS) < texteDuPlanApresLeChoix.indexOf(ATTENDU.pistes[0][0]),
    `l’action choisie depuis la liste n’est pas en tête du plan`
  );
  const apresLeChoix = await lire('plan_actions?select=rank,committed_at,intention_timing&order=rank', jeton);
  assurer(
    apresLeChoix[1].committed_at !== null && apresLeChoix[1].intention_timing === 'avant_le_prochain_bilan',
    `l’engagement n’a pas changé de ligne en base : ${JSON.stringify(apresLeChoix.slice(0, 2))}`
  );
  assurer(apresLeChoix[0].committed_at === null, 'l’ancienne action est toujours engagée en base : le remplacement n’a pas eu lieu');
  const archive = await lire('plan_action_commitments_archive?select=action_text,released_reason', jeton);
  assurer(
    archive.some((a) => a.action_text === ATTENDU.pistes[0][0] && a.released_reason === 'changement'),
    `l’engagement remplacé n’est pas archivé en « changement » : ${JSON.stringify(archive)}`
  );

  // **L'ordre de la liste ne bouge pas** (décision n° 2) — et c'est le seul moment du parcours où ça se
  // voit : tant que le rang 1 est engagé, « par rang » et « l'engagée d'abord » donnent le même ordre.
  // Le rang 2 engagé, le plan le met en tête (vérifié juste au-dessus) ; la liste, elle, garde le
  // trajet domicile-travail en premier, et le vol à sa place dans les voyages, marqué et inerte.
  etape('pistes — l’ordre ne bouge pas, une action engagée au rang 2');
  await ouvrirLesPistes();
  await attendreTexte('Engagée');
  const texteDesPistes = await page.evaluate(() => document.body.innerText);
  const ou = (t) => texteDesPistes.indexOf(t);
  assurer(
    ou(ATTENDU.pistes[0][0]) !== -1 && ou(ATTENDU.pistes[0][0]) < ou(TITRE_OUVERT_AU_DESSUS),
    `la liste a mis l’action engagée en tête : « ${ATTENDU.pistes[0][0]} », au rang 1, doit rester devant — l’ordre du rang ne bouge pas`
  );
  assurer(
    ou('TRAJET DOMICILE-TRAVAIL') !== -1 && ou('TRAJET DOMICILE-TRAVAIL') < ou('VOYAGES LONGUE DISTANCE'),
    'le groupe des voyages est passé devant celui du trajet : le groupe de l’action engagée a pris la tête'
  );
  assurer(
    /\. Choisir à la place\.$/.test((await rangee(ATTENDU.pistes[0][0]).getAttribute('aria-label')) ?? ''),
    `« ${ATTENDU.pistes[0][0]} », désengagée, ne dit pas « Choisir à la place »`
  );
  assurer(
    (await page.getByRole('button', { name: new RegExp(`^${TITRE_OUVERT_AU_DESSUS}\\.`) }).count()) === 0,
    `« ${TITRE_OUVERT_AU_DESSUS} », engagée, se touche encore : sa rangée ne doit pas être un bouton`
  );

  // ── 8 quinquies. Le contexte retiré puis remis : l'encart orphelin se tait au-dessus de l'action revenue
  //
  // **Trouvé sur la production, à la recette du 01/10/2026** (`v1-13` §19) : corriger son contexte
  // emporte l'action engagée qu'il rend impossible, l'encart le dit — « « … » n’y est plus » —, et
  // remettre le contexte comme avant rend l'action au plan **sans** l'engagement. L'archive garde sa
  // ligne `contexte`, donc l'encart restait, au-dessus de l'action même qu'il disait partie, tant que
  // personne n'avait touché « Compris » sur l'appareil — et sur tout appareil neuf. On ne le touche
  // pas ici : c'est l'état de cet appareil neuf. `orphelinAAnnoncer` a son test ; ce qui se garde ici
  // est son **appel**, avec les gabarits du plan — la famille « le test garde la fonction, jamais ses
  // appels ».
  etape('contexte — retiré puis remis, l’encart se tait au-dessus de l’action revenue');
  // L'engagement repasse sur le train, la seule piste de ce profil que l'accès aux transports retire.
  await ouvrirLesPistes();
  await rangee(ATTENDU.pistes[0][0]).click();
  await attendreTexte('Quels jours ?');
  await choisir('mardi');
  await bouton('C’est noté');
  await page.waitForURL((url) => url.pathname === '/plan', { timeout: ATTENTE });
  await attendreTexte('TON ENGAGEMENT');
  const enregistrerLeContexte = async (acces) => {
    await page.goto(`${base}/contexte`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.getByRole('radio', { name: acces, exact: true }).waitFor({ state: 'visible', timeout: ATTENTE });
    await choisir(acces);
    await bouton('Enregistrer');
    await page.waitForURL((url) => url.pathname === '/plan', { timeout: ATTENTE });
  };
  const ENCART = 'Ton plan a changé avec tes nouvelles réponses de contexte.';
  await enregistrerLeContexte('Inexistant');
  await attendreTexte(ENCART);
  await enregistrerLeContexte('Limité');
  // **Le titre de la carte, au mot près, et pas une sous-chaîne** (contre-lecture du 01/10/2026) :
  // l'encart cite lui-même le libellé du train, donc `attendreTexte` pouvait se satisfaire de l'encart
  // d'un écran pas encore relu — et l'assertion d'en dessous aurait accusé `orphelinAAnnoncer` d'un
  // train qui ne serait jamais revenu. La base le dit d'abord, l'écran ensuite.
  const lesPistesRevenues = await lire('plan_actions?select=action_templates(action_text)', jeton);
  assurer(
    lesPistesRevenues.some((piste) => piste.action_templates?.action_text === ATTENDU.pistes[0][0]),
    `« ${ATTENDU.pistes[0][0]} » n’est pas revenue dans le plan avec l’accès « Limité » : l’étape ne peut pas conclure`
  );
  try {
    await page.getByText(ATTENDU.pistes[0][0], { exact: true }).first().waitFor({ state: 'visible', timeout: ATTENTE });
  } catch {
    throw new Ecart(`la carte « ${ATTENDU.pistes[0][0]} » n’est pas revenue à l’écran du plan, alors que la base la porte`);
  }
  const archivesDuContexte = await lire('plan_action_commitments_archive?select=action_text&released_reason=eq.contexte', jeton);
  assurer(
    archivesDuContexte.length === 1 && archivesDuContexte[0].action_text === ATTENDU.pistes[0][0],
    `le train n’a pas été archivé une fois en « contexte » — l’encart n’aurait rien à taire : ${JSON.stringify(archivesDuContexte)}`
  );
  assurer(
    !(await page.evaluate(() => document.body.innerText)).includes(ENCART),
    `l’encart « ${ENCART} … n’y est plus » se rend alors que « ${ATTENDU.pistes[0][0]} » est revenue dans le plan` +
      ' (`orphelinAAnnoncer`, appelé avec les gabarits du plan)'
  );

  // ── 9. La suppression du compte, par l'écran, et rien derrière ─────────────────────────────
  //
  // **Par « Toi », et plus par le RPC** (28/09/2026). C'est le chemin que Google Play exige, et aucun
  // test ne le jouait : la suppression partait d'un `rpc('delete_my_account')`, donc un bouton qui
  // n'appellerait plus rien serait passé vert. Et c'est la garde du constat H5 de la recette du même
  // jour : la carte « C'est fait. » se rendait seule, sous un écran qui décrivait encore le compte
  // supprimé — son adresse, « Me déconnecter », le rappel par email coché. Les pages légales, elles,
  // restent : la moitié positive est vérifiée aussi, pour qu'un masquage trop large ne passe pas vert.
  etape('suppression du compte');
  // **Et « Supprimer mon compte » ne bouge plus pendant que « Toi » se lit** (décision du 01/10/2026,
  // #305) : l'écran garde la place du compte et des rappels (`HAUTEUR_DU_COMPTE_EN_LECTURE`,
  // `src/app/compte/index.tsx`). Le relevé image par image démarre **avant le premier script** de la
  // page qui suit — la seule façon de voir la première image, celle du rendu statique, où le lien était
  // à 335 px avant de descendre à 747. Il passe par le relevé que le contexte pose déjà dans chaque
  // document, et ne le démarre qu'une fois celui-ci là : l'ordre des scripts d'initialisation d'un
  // contexte et d'une page n'est pas garanti (contre-lecture du 01/10/2026), et tous ont tourné avant le
  // premier `setTimeout`. Sur l'onglet du parcours, et pas sur un second : un échec se capture sur
  // l'écran qui a échoué. Ce profil est anonyme, à 420 de large, sur web — la largeur, le compte et la
  // plateforme où la place a été mesurée, donc il ne doit rester **rien** ; ailleurs, un reste est le
  // risque accepté avec la décision.
  await page.addInitScript(
    ({ mesures, duree }) => {
      const demarrer = () => (window.__releve ? window.__releve.demarrer(mesures, duree) : setTimeout(demarrer, 0));
      demarrer();
    },
    { mesures: { lien: ['texte', 'Supprimer mon compte'] }, duree: 15_000 }
  );
  await page.goto(`${base}/compte`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  // **L'écran posé d'abord, le clic ensuite** (CI du 30/09/2026). `/compte` rend « Supprimer mon
  // compte » dès son HTML statique, puis grandit au-dessus du lien quand le compte et les rappels
  // arrivent — 412 px. Un clic pris dans ce saut est perdu : l'appui et le relâchement ne tombent
  // pas sur le même élément, et le navigateur ne rend le `click` qu'à leur ancêtre commun.
  // Reproduit en retenant ces deux lectures pendant l'appui : le lien passe de 335 à 747 px et la
  // confirmation ne s'ouvre pas, deux fois sur deux, quand le témoin l'ouvre deux fois sur deux. Le
  // groupe « Les rappels » arrive avec elles — l'étape de la ligne de canal l'attend déjà. **Depuis le
  // 01/10/2026, l'écran garde la place** et le lien ne bouge plus à cette largeur (gardé juste
  // au-dessus) ; l'attente reste, parce qu'ailleurs un reste de saut est accepté.
  await page.getByRole('radiogroup', { name: 'Les rappels', exact: true }).waitFor({ state: 'visible', timeout: ATTENTE });
  await page.waitForTimeout(600);
  const positionsDuLien = ((await echantillons(page)) ?? []).map((e) => e.lien?.haut).filter((h) => typeof h === 'number');
  assurer(positionsDuLien.length > 0, '« Supprimer mon compte » introuvable pendant la lecture de « Toi » : la mesure ne peut pas conclure');
  const finale = positionsDuLien[positionsDuLien.length - 1];
  const saut = Math.max(...positionsDuLien.map((h) => Math.abs(h - finale)));
  assurer(
    saut <= 8,
    `« Supprimer mon compte » bouge de ${Math.round(saut)} px pendant que « Toi » se lit ` +
      `(${[...new Set(positionsDuLien.map(Math.round))].join(' → ')}) : la place du compte et des rappels n'est plus ` +
      'gardée — `HAUTEUR_DU_COMPTE_EN_LECTURE`, src/app/compte/index.tsx, à remesurer si une phrase a changé'
  );
  await bouton('Supprimer mon compte');
  await bouton('Supprimer définitivement');
  await attendreTexte('C’est fait.');
  for (const reste of ['Les rappels', 'Rattacher un compte', 'Me déconnecter de cet appareil', 'Mon contexte de mobilité']) {
    assurer(
      (await page.getByText(reste, { exact: true }).count()) === 0,
      `« Toi » montre encore « ${reste} » après la suppression du compte`
    );
  }
  assurer(
    (await page.getByRole('link', { name: 'Confidentialité', exact: true }).count()) === 1,
    '« Toi » ne montre plus le lien « Confidentialité » après la suppression du compte'
  );
  for (const table of ['profiles?select=id&id=eq.', 'assessments?select=id&user_id=eq.', 'engagement_checkins?select=id&user_id=eq.']) {
    const restes = await lire(`${table}${userId}`, SERVICE);
    assurer(restes.length === 0, `${table.split('?')[0]} garde ${restes.length} ligne(s) après la suppression`);
  }

  // ── 10. Le second profil : le cycliste, dont le plan ne porte aucune action ─────────────────
  //
  // **Ce n'est pas un cas de bord** : depuis C2.5, tout cycliste et tout profil sédentaire y tombe.
  // Et c'est le seul chemin où la carte « Ton premier plan » ne se rend **jamais** — elle demande un
  // plan à au moins une action —, donc le seul où la barre d'onglets doit arriver autrement : au
  // premier affichage du plan, avec la carte « Plan et Suivi ». Le premier profil ne l'exerce pas,
  // et rien d'autre ne le faisait.
  //
  // **Et il tourne sous « réduire les animations »** (27/09/2026, `v1-30`) : sa barre arrive sans
  // « Compris », donc c'est ici qu'on voit si elle arrive posée. Le parcours entier y gagne un
  // passage sans animation.
  etape('cycliste — onboarding et questionnaire');
  await page.context().close();
  page = await nouvelOnglet({ reduire: true });
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForURL(/\/onboarding/, { timeout: ATTENTE });
  await boutonDuPager('Découvrir mon impact', 0);
  await boutonDuPager('Continuer', 1);
  await boutonDuPager('Continuer', 2);
  await boutonDuPager('Commencer', 3);
  await page.waitForURL(/\/bilan/, { timeout: ATTENTE });

  await saisirLeCycliste();

  etape('cycliste — restitution, puis le plan sans action');
  await page.waitForURL(/\/suivi\/bilan/, { timeout: 45_000 });
  // **Le second profil traverse l'autre branche du formateur**, et c'est une raison de plus de
  // l'écrire : le premier rend des tonnes (« 4,2 t »), celui-ci des kilos. Le seuil vit dans
  // `valeurEtUnite` (`src/lib/format.ts`) et aucun parcours ne le franchissait — seule l'assertion
  // en base aurait tenu si l'écran s'était mis à dire « 0,0 t ».
  await attendreTexte(`${ATTENDU_SOBRE.totalKg} kg CO₂e`);
  assurer(!(await barreVisible()), 'la barre d’onglets est visible sur la restitution du cycliste (C5.7)');
  // **La marche se tait sur le résiduel des sorties rares** (arbitrage du 25/09/2026, `v1-29` §6.3).
  // Ce profil recevait « S’il te reste de l’envie : 2 kg CO₂e de moins sur l’année sur tes sorties du
  // week-end » — des sorties qu'il n'a pas déclarées, et un plan vide pour les franchir. Le début de
  // la phrase reste, et il s'attend d'abord : sans lui, l'absence qui suit passerait sur un palier
  // qui ne se rend plus du tout.
  await attendreTexte('Tu es déjà sous le repère transport 2050.');
  // **Le résiduel s'appelle « loisirs occasionnels »** (arbitrage du 27/09/2026, `v1-29` §6.3) :
  // le titre et la barre de répartition. La barre s'attend **exacte** : « Loisirs occasionnels »
  // est aussi une sous-chaîne du titre, qui la satisferait sans rien éprouver de la barre.
  await attendreTexte('Tes loisirs occasionnels');
  await attendreTexte(/^Loisirs occasionnels$/);
  const texteDeLaRestitution = await page.evaluate(() => document.body.innerText);
  assurer(
    !/S’il te reste de l’envie/.test(texteDeLaRestitution),
    'la restitution propose encore une marche sur le résiduel des sorties rares (palierNote)'
  );
  // **Et la barre du palier se tait avec la phrase** (recette du 28/09/2026, constat 10.2, décidé le
  // même jour) : le graphique « Où tu te situes » montrait encore « Ton prochain palier — 47 kg »,
  // une marche calculée sur des sorties que la personne n'a pas déclarées, sous une phrase qui ne
  // demande rien.
  assurer(
    !/Ton prochain palier/.test(texteDeLaRestitution),
    'la restitution montre encore la barre « Ton prochain palier » sur le résiduel des sorties rares'
  );
  const sobre = await session();
  const [resultatSobre] = await lire('assessment_results?select=total_co2_kg_year,dominant_poste_co2_kg_year', sobre.jeton);
  assurer(resultatSobre, 'aucun assessment_results lisible pour le cycliste');
  assurer(
    Math.round(resultatSobre.total_co2_kg_year) === ATTENDU_SOBRE.totalKg,
    `total du cycliste ${resultatSobre.total_co2_kg_year} kg, attendu ${ATTENDU_SOBRE.totalKg}`
  );

  // **La réponse à une révélation imbriquée atteint-elle la colonne ?** Écrit le 21/09/2026 après
  // un défaut que rien n'a vu : la soumission énumérait les colonnes à la main, et les cinq
  // réponses neuves de C4.4 n'y figuraient pas — posées, normalisées, affichées, jamais écrites.
  // Ni le typecheck (une colonne neuve est `optional` dans `Insert`) ni le total de ce profil ne
  // pouvaient le dire : « mécanique » et « pas de réponse » résolvent tous deux vers `velo`, donc
  // les chiffres étaient identiques. **C'est le seul endroit du parcours où une réponse neuve
  // porte une valeur que le défaut de la colonne ne donne pas**, donc la seule assertion qui
  // pouvait attraper cette famille-là. Une réponse ajoutée au questionnaire mérite la sienne ici.
  const [reponsesSobres] = await lire(
    'assessment_answers?select=commute_velo_type,coach_long_trips_per_year',
    sobre.jeton
  );
  assurer(
    reponsesSobres?.commute_velo_type === 'mecanique',
    `le type de vélo répondu n'est pas arrivé en base : ${JSON.stringify(reponsesSobres)}`
  );

  // Comme sur le premier profil : plus aucun écran de compte entre la restitution et le plan
  // (arbitrage du 20/09/2026). Le second profil le rejoue parce que c'est le seul chemin où la
  // carte « Ton premier plan » ne se rend jamais — donc le seul où la barre d'onglets arrive
  // autrement, et le seul qui pourrait masquer une interposition revenue.
  //
  // **L'écoute s'arme AVANT le toucher, et ici elle ne l'était pas** : la version écrite en
  // corrigeant la tautologie du premier profil posait le guetteur après `bouton(…)`, donc après le
  // geste qui déclenche la navigation — un interstitiel traversé pendant le clic n'entrait dans
  // aucune liste, et l'assertion redevenait incapable de tomber par l'autre bout. Le premier profil
  // l'avait bien ; le second non, et c'est exactement la famille « une exclusion vérifiée sur une
  // paire de moins » que la contre-lecture cherche (relevé au second passage, 21/09/2026).
  const visiteesCycliste = [];
  const noterCycliste = (frame) => {
    if (frame === page.mainFrame()) visiteesCycliste.push(frame.url());
  };
  page.on('framenavigated', noterCycliste);
  // Le relevé de la barre part avant le geste : elle arrive quand le plan a chargé, et c'est son
  // arrivée qu'on veut voir, posée dès la première image.
  await page.evaluate(() => window.__releve.demarrer({ barre: ['barre'] }, 30_000));
  await bouton('Voir ce que je peux faire');
  await page.waitForURL(/\/plan/, { timeout: ATTENTE }).catch(() => {});
  page.off('framenavigated', noterCycliste);
  assurer(
    !visiteesCycliste.some((u) => /\/connexion/.test(u)),
    `un écran de compte s'est interposé entre la restitution et le plan : ${visiteesCycliste.join(' → ') || '(aucune navigation vue)'}`
  );
  assurer(/\/plan/.test(page.url()), `« Voir ce que je peux faire » n'a pas mené au plan : ${page.url()}`);

  // Le plan est vide d'actions **en base** : c'est ce qui rend vrai tout le reste de ce bloc.
  const pistesSobres = await lire('plan_actions?select=rank', sobre.jeton);
  assurer(pistesSobres.length === 0, `${pistesSobres.length} piste(s) figée(s) pour le cycliste, attendu 0`);
  const cyclesSobres = await lire('plan_cycles?select=id', sobre.jeton);
  assurer(cyclesSobres.length === 1, `${cyclesSobres.length} cycle(s) de plan, attendu 1`);

  // La félicitation, et non un écran vide : le plan à zéro action dit pourquoi il est vide. Elle nomme
  // le poste depuis le 24/09/2026 (`v1-29`) — **sauf ici**, et ce profil est exactement le cas : le
  // poste de son cycle est le résiduel des sorties rares (11 kg, contre moins d'un kilo de vélo), que
  // le calcul suppose et que la personne n'a pas déclaré. D'où le titre sans poste, et aucune promesse
  // de point : la boucle mensuelle n'est pas générée sans base déclarée
  // (`felicitationDuPlanSansAction`).
  //
  // **Et depuis l'arbitrage du 25/09/2026, le titre dit pourquoi le plan est vide** : « Tu es déjà
  // sous le repère 2050. », ce que la restitution vient de dire — à « transport » près, et c'est ce
  // qui empêche l'attente ci-dessous de se satisfaire de la restitution restée montée sous le plan.
  // Le titre est conditionné au total que l'écran relit : une lecture qui ne le ramènerait plus le
  // ferait retomber sur « Tu fais déjà l’essentiel. », et c'est ici que ça se verrait.
  await attendreTexte('Tu es déjà sous le repère 2050.');
  // Le cap se rend quand même — c'est lui qui nomme la période depuis C2.8 — mais sans chiffrer.
  await attendreTexte(/Automne 2026/);

  // **Ce qui ne doit PAS être là se lit avant d'attendre la barre**, et l'ordre n'est pas du
  // confort : rendre la carte du premier plan sur ce plan-là empêche aussi la barre d'arriver
  // (fermer la carte est ce qui la fait venir), donc l'attente de la barre tomberait la première
  // et rendrait un délai dépassé là où l'assertion nomme la cause. Mesuré en le cassant.
  const texteDuPlan = await page.evaluate(() => document.body.innerText);
  assurer(
    !texteDuPlan.includes('TON PREMIER PLAN') && !texteDuPlan.includes('Une action pour'),
    'la carte « Ton premier plan » se rend sur un plan à zéro action (C5.6)'
  );
  assurer(
    !/Voir toutes les pistes/.test(texteDuPlan),
    'le plan à zéro action propose encore « Voir toutes les pistes »'
  );
  // Le titre et la promesse, et eux seuls : `innerText` lit aussi la restitution restée montée sous
  // le plan dans la pile, où « tes sorties du week-end » est légitime — une première version qui
  // cherchait ces trois mots dans toute la page tombait pour cette raison-là, et pas pour la bonne.
  assurer(
    !/Tu fais déjà l’essentiel sur/.test(texteDuPlan) && !/Le point reste là/.test(texteDuPlan),
    'la félicitation nomme ou promet le résiduel des sorties rares (felicitationDuPlanSansAction)'
  );
  assurer(
    !/Ton plan tient compte de ton contexte/.test(texteDuPlan),
    'l’encart de contexte se rend sur un plan à zéro action (C5.5)'
  );
  assurer(
    !/−\s?\d+\s?kg/.test(texteDuPlan),
    `le cap du plan à zéro action annonce un chiffre (cadreDuPlan, C5.3) : ${texteDuPlan.slice(0, 400)}`
  );

  // La barre arrive **sans** qu'on ait rien refermé : c'est la moitié de C5.7 que le premier
  // profil ne joue pas, puisque lui passe par « Compris ».
  await page.waitForFunction(
    () => [...document.querySelectorAll('*')].some((e) => e.textContent === 'Suivi' && e.getClientRects().length > 0),
    undefined,
    { timeout: ATTENTE }
  );
  await attendreTexte('Deux endroits, pas plus.');
  await page.waitForTimeout(600);
  const barreDuCycliste = await mesurer(page, 'barre');
  const arriveeDuCycliste = (await echantillons(page)).map((e) => e.barre);
  // Relevée masquée au départ, puis **là, et plus jamais absente** : « rien ne bouge » ne vaut que
  // sur les images où l'on a vu la barre (seconde contre-lecture du 28/09/2026).
  assurer(
    barreDuCycliste &&
      arriveeDuCycliste.length > 0 &&
      arriveeDuCycliste[0] === null &&
      arriveeDuCycliste.some(Boolean) &&
      !disparaitApresEtreApparue(arriveeDuCycliste),
    'l’arrivée de la barre du cycliste n’a pas pu être relevée : elle doit être masquée au départ du' +
      ' relevé, puis là à chaque image une fois arrivée'
  );
  assurer(
    !arriveeDuCycliste.some((v) => v && (v.opacite < 0.99 || Math.abs(v.haut - barreDuCycliste.haut) > 0.5)),
    'sous « réduire les animations », la barre d’onglets arrive en glissant : elle doit être posée dès la' +
      ' première image (`arrivee`, src/app/(tabs)/_layout.tsx)'
  );

  // **Le suivi du cycliste nomme le résiduel comme la restitution, et dit qu'il est sous le
  // repère** (arbitrages du 27/09/2026, `v1-29` §6.3). Les dérivations sont testées par Jest ; ce
  // qui ne l'est que d'ici, c'est que l'écran les **appelle** — et avec le libellé figé pour
  // `posteDeLHistorique`. **L'ordre des deux bornes de `ligneDHorizon2050` n'est pas gardé** : à
  // 11 kg, ce profil est sous la moyenne comme sous le repère, donc les intervertir rend la même
  // phrase, et le premier profil (4,2 t) est au-dessus des deux. Il faudrait un profil entre 0,6 et
  // 2,8 t. Les deux textes se lisent dans la **carte de l'historique**, remontée depuis sa ligne, et
  // jamais dans la page : la restitution, restée montée dans la pile, dit elle aussi « Tu es déjà
  // sous le repère transport 2050. », et une attente sur la page entière passerait sans rien éprouver.
  etape('cycliste — le suivi');
  for (const libelle of await page.getByText('Suivi', { exact: true }).all()) {
    if (await libelle.isVisible()) {
      await libelle.click();
      break;
    }
  }
  await page.waitForURL(/\/suivi$/, { timeout: ATTENTE });
  const ligneSobre = page.getByLabel(/^Bilan du .* kg CO₂e$/).first();
  await ligneSobre.waitFor({ state: 'visible', timeout: ATTENTE });
  // Les blancs se normalisent, insécables compris : `ThemedText` pose une espace insécable devant
  // le deux-points au rendu (`espacesInsecables`), et `\s` de JavaScript les couvre.
  const { ligne: texteDeLaLigne, carte: texteDeLaCarte } = await ligneSobre.evaluate((el) => {
    const blancs = (t) => (t ?? '').replace(/\s+/g, ' ');
    let carte = el.parentElement;
    for (let i = 0; i < 4 && carte && !/Tu es /.test(carte.innerText); i++) carte = carte.parentElement;
    return { ligne: blancs(el.innerText), carte: blancs(carte?.innerText) };
  });
  assurer(
    texteDeLaLigne.includes('Poste principal : Loisirs occasionnels'),
    `le suivi ne nomme pas le résiduel comme la restitution (posteDeLHistorique) : ${texteDeLaLigne}`
  );
  assurer(
    texteDeLaCarte.includes('Tu es déjà sous le repère transport 2050.') &&
      !texteDeLaCarte.includes('palier après palier'),
    `la ligne d'horizon du suivi ne dit pas « déjà sous le repère » (ligneDHorizon2050) : ${texteDeLaCarte.slice(0, 300)}`
  );

  // **Un nouveau bilan qui donne des actions : le premier plan passe devant les deux lieux**
  // (27/09/2026, `v1-27` §4). La carte « Deux endroits, pas plus. » est encore due — ce profil ne
  // l'a pas refermée — et le nouveau bilan, en voiture, donne au même cycle ses premières actions :
  // « Ton premier plan » l'est aussi. Les deux s'empilaient ; `cartesDuPlan` fait passer la seconde
  // devant. Cette étape garde **deux arguments de l'appel** — la dérivation a toutes ses combinaisons
  // d'états dans Jest, mais un écran qui lui passerait le mauvais argument les laisserait tous verts ;
  // l'en-tête nomme ceux que rien ici ne garde.
  // **Le préremplissage qui ouvre une précision ne fait pas défiler l'écran** (`v1-31` §2.7, écart 12
  // du §9). Une précision qui s'ouvre sous le pied fait remonter l'écran — après une réponse donnée,
  // jamais sous une donnée arrivée plus tard. Ouvert par `?etape=commute_mode`, le re-bilan de ce
  // profil monte l'étape du mode vide, puis le bilan précédent y coche « Vélo » : la boîte « Quel type
  // de vélo ? » monte **après** l'écran, donc elle annonce son ouverture, et seul le compte des
  // réponses de `StepShell` retient le défilement. À 360 × 800, elle finit sous le pied (738 pour
  // 698) : c'est là qu'un défilement se verrait. Sans réseau, la section K ne peut pas le jouer — un
  // brouillon, lui, rouvre l'étape déjà remplie, et `Depliage` le retient par une seconde défense.
  etape('cycliste — un re-bilan ouvert sur l’étape du mode ne défile pas sous son préremplissage');
  const tailleDuParcours = page.viewportSize();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`${base}/bilan?etape=commute_mode`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await attendreTexte('Tes réponses précédentes sont pré-remplies.');
  await page.getByRole('radio', { name: 'Mécanique', exact: true }).waitFor({ state: 'visible', timeout: ATTENTE });
  // Le temps d'un défilement de la plateforme, s'il était parti.
  await page.waitForTimeout(1_500);
  const sousLePreremplissage = await page.evaluate(() => {
    const titre = [...document.querySelectorAll('h1')].find((h) => h.getClientRects().length > 0);
    let zone = null;
    for (let e = titre?.parentElement; e && !zone; e = e.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(e).overflowY)) zone = e;
    }
    const groupe = [...document.querySelectorAll('[role="radiogroup"]')].find(
      (g) => g.getAttribute('aria-label') === 'Quel type de vélo ?'
    );
    const boite = groupe?.parentElement?.parentElement;
    return zone && boite
      ? { decalage: zone.scrollTop, bas: zone.getBoundingClientRect().bottom, boite: boite.getBoundingClientRect().bottom + zone.scrollTop }
      : null;
  });
  assurer(sousLePreremplissage !== null, 'la boîte « Quel type de vélo ? » est introuvable sous le préremplissage');
  assurer(
    sousLePreremplissage.boite > sousLePreremplissage.bas,
    `la boîte du vélo finit à ${Math.round(sousLePreremplissage.boite)}, dans la zone (${Math.round(sousLePreremplissage.bas)}) : la garde ne peut pas conclure`
  );
  assurer(
    sousLePreremplissage.decalage === 0,
    `l’écran a défilé de ${Math.round(sousLePreremplissage.decalage)} px sous le préremplissage — une ouverture ne se suit qu’après une réponse donnée (\`reponsesDonnees\`, StepShell)`
  );
  await page.setViewportSize(tailleDuParcours);

  etape('cycliste — un nouveau bilan en voiture : le premier plan passe devant');
  await page.goto(`${base}/bilan`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForURL(/\/bilan/, { timeout: ATTENTE });
  // Le questionnaire est prérempli par le bilan précédent : seul le mode change. On attend le
  // bandeau qui le dit — sans lui, `suivant()` toucherait le « Suivant » de la première étape avant
  // que le préremplissage n'arrive : il est en attente depuis `v1-31`, donc il agit, et le parcours
  // s'arrêterait sur « Il manque encore une réponse. » au lieu de nommer la vraie cause.
  await attendreTexte('Tes réponses précédentes sont pré-remplies.');
  await suivant();
  await suivant();
  await choisir('Voiture (seul)');
  await choisir('Thermique');
  await suivant();
  await suivant();
  await suivant();
  await suivant();
  await suivant();
  await suivant('Voir mon bilan');
  await page.waitForURL(/\/suivi\/bilan/, { timeout: 45_000 });
  await bouton('Voir ce que je peux faire');
  await page.waitForURL(/\/plan/, { timeout: ATTENTE });
  await attendreTexte('TON PREMIER PLAN');
  assurer(
    !(await page.getByText('Deux endroits, pas plus.').first().isVisible()),
    'la carte des deux lieux s’empile sur « Ton premier plan » (cartesDuPlan, décidé le 27/09/2026)'
  );
  // Refermée, la carte du premier plan laisse passer celle qui attendait : sa marque n'a pas bougé.
  await page.getByText('Compris', { exact: true }).first().click();
  await attendreTexte('Deux endroits, pas plus.');
  // Ce plan-ci a des actions et une boucle : la carte d'origine, au caractère près (`v1-27` §12.23 —
  // elle ne décrit que ce que le plan porte, et ici il porte tout).
  await attendreTexte(
    'Ici, ton plan : l’action en cours, le point régulier, ton cap. En bas, ton suivi : tes bilans et tes réponses, saison après saison.'
  );

  // ── 11. Retirer un bilan, puis le seul qui reste (C4.7, `v1-22`) ─────────────────────────
  //
  // **Ce profil a exactement ce qu'il faut** : deux bilans, dont le plus récent — en voiture — porte
  // un plan à actions, et le plus ancien — à vélo — un plan à zéro. Retirer le premier éprouve la
  // reconstruction du plan sur le précédent (D2) ; retirer le second, le seul qui reste, éprouve le
  // retour à la racine et l'effacement de la marque locale (D3). Les deux textes de confirmation
  // attendus ne sont pas les mêmes, et c'est l'appel de `confirmationDuRetrait` qui est gardé ici — la
  // dérivation a ses tests dans Jest. **Ce que l'étape ne joue pas** : le troisième cas (retirer un
  // bilan qui ne porte pas le plan), tenu par `34_retirer_un_bilan.test.sql` et par Jest.
  etape('cycliste — retirer le bilan en voiture : le plan repart du précédent');
  const bilansDuCycliste = await lire('assessments?select=id,status&order=submitted_at.desc', sobre.jeton);
  assurer(
    bilansDuCycliste.length === 2 && bilansDuCycliste.every((b) => b.status === 'completed'),
    `deux bilans complétés attendus avant le retrait : ${JSON.stringify(bilansDuCycliste)}`
  );
  const [bilanVoiture, bilanVelo] = bilansDuCycliste;
  assurer(
    (await lire('plan_actions?select=rank', sobre.jeton)).length > 0,
    'le plan du bilan en voiture ne porte aucune action : le retrait ne prouverait rien'
  );
  // **Une action engagée avant le retrait** (contre-lecture du 27/09/2026) : sans elle, l'écran
  // pouvait passer `null` à `confirmationDuRetrait` à la place de l'engagement relu, et Jest comme ce
  // parcours restaient verts — la dérivation a ses tests, son appel n'en avait aucun. La première
  // piste de ce bilan porte sur le trajet domicile-travail, donc l'intention se dit en jours.
  const [premierePiste] = await lire('plan_actions?select=rank,action_templates(poste)&rank=eq.1', sobre.jeton);
  assurer(
    premierePiste?.action_templates?.poste === 'commute',
    `la première piste du bilan en voiture porte sur « ${premierePiste?.action_templates?.poste} », attendu ` +
      'le trajet domicile-travail : la feuille demanderait une échéance et non des jours'
  );
  await bouton('Je m’y engage');
  await choisir('mardi');
  await choisir('jeudi');
  await bouton('C’est noté');
  await attendreTexte('Changer d’avis');
  // **Un second onglet du même appareil, ouvert sur le bilan à vélo pendant qu'il est encore
  // `ancien`** (contre-lecture du 27/09/2026) : la confirmation relit la place au toucher du lien, et
  // rien ne le gardait — chaque retrait de ce parcours partait d'une page fraîchement chargée, où une
  // lecture au chargement aurait dit juste aussi. Cet onglet reste ouvert, sans être rechargé, pendant
  // que le premier retire le bilan en voiture ; quand on y touchera le lien, le bilan à vélo sera
  // devenu le seul, et une place lue au chargement dirait encore « Ton plan ne change pas ».
  const ongletDuBilanAVelo = await nouvelOnglet({ contexte: page.context() });
  await ongletDuBilanAVelo.goto(`${base}/suivi/bilan?id=${bilanVelo.id}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await ongletDuBilanAVelo.getByText('Estimation annuelle, tous déplacements').first().waitFor({ state: 'visible', timeout: ATTENTE });
  await page.goto(`${base}/suivi/bilan?id=${bilanVoiture.id}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await attendreTexte('Estimation annuelle, tous déplacements');
  await bouton('Ce bilan ne me ressemble pas');
  // Sans la ponctuation double : `ThemedText` y pose une espace insécable au rendu.
  await attendreTexte('ton plan repartira de ton bilan précédent.');
  // La phrase du re-bilan, relue au toucher du lien, avec la fin décidée le 27/09/2026.
  await attendreTexte('L’action que tu suis —');
  await attendreTexte('Sinon, elle ne sera plus engagée.');
  await bouton('Retirer ce bilan');
  await attendreTexte('Ce bilan a été retiré.');
  assurer(
    !(await page.getByText('Estimation annuelle, tous déplacements').first().isVisible().catch(() => false)),
    'la restitution d’un bilan retiré montre encore son chiffre'
  );
  const [voitureRelue] = await lire(`assessments?select=status&id=eq.${bilanVoiture.id}`, sobre.jeton);
  assurer(voitureRelue?.status === 'withdrawn', `le bilan retiré se lit « ${voitureRelue?.status} » en base`);
  const pistesApresRetrait = await lire('plan_actions?select=rank', sobre.jeton);
  assurer(
    pistesApresRetrait.length === 0,
    `${pistesApresRetrait.length} piste(s) après le retrait : le plan n’est pas reparti du bilan à vélo, à zéro action`
  );
  // Le plan reconstruit n'a plus l'action : elle part, et elle laisse sa trace (C2.2), sous la raison
  // `retrait` — que l'encart orphelin tait, là où `rebilan` l'aurait rallumé.
  const archives = await lire('plan_action_commitments_archive?select=released_reason', sobre.jeton);
  assurer(
    archives.length === 1 && archives[0].released_reason === 'retrait',
    `l'action engagée devait être archivée une fois, en « retrait » : ${JSON.stringify(archives)}`
  );
  // **L'adresse le dit encore après un rechargement** : c'est la lecture par identifiant qui parle
  // là, et plus l'état posé par le geste — la seule des deux que l'adresse partagée ou un favori
  // atteignent.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await attendreTexte('Ce bilan a été retiré.');

  etape('cycliste — retirer son seul bilan : la racine, et la marque locale effacée');
  const MARQUE_DE_BILAN = 'traceverte.a_un_bilan.v1';
  assurer(
    (await page.evaluate((cle) => localStorage.getItem(cle), MARQUE_DE_BILAN)) === '1',
    'la marque « cet appareil a vu un bilan » n’est pas posée avant le retrait : son effacement ne prouverait rien'
  );
  // L'onglet ouvert avant le premier retrait, **sans le recharger** : la place relue au toucher dit
  // « seul », là où celle du chargement disait « ancien ».
  await page.close();
  page = ongletDuBilanAVelo;
  await bouton('Ce bilan ne me ressemble pas');
  await attendreTexte('tu repartiras d’un nouveau bilan.');
  assurer(
    !(await page.getByText('Ton plan ne change pas').first().isVisible().catch(() => false)),
    'la confirmation dit la place lue au chargement (« ancien ») et non celle du toucher (« seul »)'
  );
  await bouton('Retirer ce bilan');
  await page.waitForURL(/\/onboarding/, { timeout: ATTENTE });
  assurer(
    (await page.evaluate((cle) => localStorage.getItem(cle), MARQUE_DE_BILAN)) === null,
    'la marque locale survit au retrait du seul bilan : une réouverture hors ligne enverrait au plan (C4.5)'
  );
  const bilansRetires = await lire('assessments?select=status', sobre.jeton);
  assurer(
    bilansRetires.length === 2 && bilansRetires.every((b) => b.status === 'withdrawn'),
    `les deux bilans devraient être retirés, et rester en base : ${JSON.stringify(bilansRetires)}`
  );

  // **Le bilan qui suit ne fait pas recommencer le premier parcours** (décision du 27/09/2026). La
  // marque de bilan vient d'être effacée : sans `ouvreUnPremierParcours`, la soumission noterait
  // l'étape `questionnaire` et la barre d'onglets disparaîtrait de la restitution, devant quelqu'un
  // qui connaît déjà les deux lieux. Rien d'autre ne gardait cet appel : la fonction a ses tests, la
  // ligne qui l'appelle n'en avait aucun.
  etape('cycliste — un bilan après le retrait : le premier parcours ne recommence pas');
  await boutonDuPager('Découvrir mon impact', 0);
  await boutonDuPager('Continuer', 1);
  await boutonDuPager('Continuer', 2);
  await boutonDuPager('Commencer', 3);
  await page.waitForURL(/\/bilan/, { timeout: ATTENTE });
  await saisirLeCycliste();
  await page.waitForURL(/\/suivi\/bilan/, { timeout: 45_000 });
  await attendreTexte(`${ATTENDU_SOBRE.totalKg} kg CO₂e`);
  assurer(
    await barreVisible(),
    'la barre d’onglets a disparu au bilan qui suit le retrait du seul bilan : le premier parcours a recommencé'
  );

  etape('cycliste — la carte d’attente nomme le lundi, que le serveur a dit');
  // **La carte d'attente nomme le lundi, et c'est le serveur qui le dit** (30/09/2026, `v1-27`
  // §12.22). Le plan lit les boucles par `mes_boucles_a_venir`, et le client relit leurs valeurs
  // (`lireLesBouclesAVenir`) : une valeur renommée d'un seul côté, ou la fonction absente de la
  // base, ferait disparaître la carte **sans une erreur**. Le cycliste
  // a un trajet, donc un point le lundi. **La carte des deux lieux l'occupe d'abord** : le cycliste
  // ne l'a jamais refermée (le premier plan est passé devant, puis ses bilans ont été retirés), et
  // elle remplace la carte d'attente (`cartesDuPlan`). La première version de cette étape l'oubliait
  // et a échoué au premier rejeu, le 30/09/2026 — c'est donc aussi la preuve que refermer la carte des
  // deux lieux rend la place à celle qui attendait. La ligne de Ramille dépend du canal (« Je te fais
  // signe » ou « On se retrouve ici »), pas le jour.
  await bouton('Voir ce que je peux faire');
  await page.waitForURL(/\/plan/, { timeout: ATTENTE });
  await attendreTexte('Deux endroits, pas plus.');
  // **Et elle ne promet ni action ni cap à un plan qui n'en a pas** (décision du 30/09/2026, `v1-27`
  // §12.23) : le cycliste a un point le lundi, pas d'action, et sa carte du cap ne montre que la
  // saison. Des deux faits que l'écran passe à la dérivation, c'est **les actions** qu'on voit ici
  // varier — la même carte, à l'étape 10, en avait ; **les boucles**, elles, ne sont vues vides que
  // par le troisième profil, plus bas. La dérivation elle-même est gardée par Jest.
  await attendreTexte(
    'Ici, ton plan : le point régulier et ta saison. En bas, ton suivi : tes bilans et tes réponses, saison après saison.'
  );
  await page.getByText('Compris', { exact: true }).first().click();
  await attendreTexte(/^(Je te fais signe|On se retrouve ici) lundi\.$/);

  await rpc('delete_my_account', sobre.jeton);

  // ── 12. Le troisième profil : aucune boucle ne tourne (30/09/2026, `v1-27` §12.22 et §12.23) ──
  //
  // **Ni trajet, ni sorties régulières, ni voyage** : aucun point ne viendra jamais, et trois textes
  // le savent depuis ce jour — la carte des deux lieux, la carte d'attente et la carte du suivi sans
  // point répondu. Les deux premiers profils ont chacun une boucle, donc le côté « sans boucle » de
  // ces trois textes n'était gardé que par Jest, sur les dérivations — pas par l'écran qui leur passe
  // les boucles lues au serveur (`mes_boucles_a_venir`). C'est ce que ce profil éprouve, et rien
  // d'autre : il ne refait ni le questionnaire en détail, ni la restitution.
  etape('sans boucle — onboarding et questionnaire');
  await page.context().close();
  page = await nouvelOnglet({ reduire: false });
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForURL(/\/onboarding/, { timeout: ATTENTE });
  await boutonDuPager('Découvrir mon impact', 0);
  await boutonDuPager('Continuer', 1);
  await boutonDuPager('Continuer', 2);
  await boutonDuPager('Commencer', 3);
  await page.waitForURL(/\/bilan/, { timeout: ATTENTE });
  await choisir('Non'); // pas de trajet régulier : les étapes du trajet ne se posent pas
  await suivant();
  await choisir(/^Rarement/, { exact: false });
  await suivant();
  await choisir('0');
  await suivant();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en train' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en autocar' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en voiture' }).getByRole('radio', { name: '0', exact: true }).click();
  await suivant();
  // Sans trajet, la question du télétravail ne se pose pas (`teletravailSePose`).
  await choisir('Urbain dense');
  await choisir('Bon');
  await choisir('1');
  await suivant('Voir mon bilan');

  etape('sans boucle — le plan ne promet ni action, ni point, ni réponse');
  await page.waitForURL(/\/suivi\/bilan/, { timeout: 45_000 });
  await bouton('Voir ce que je peux faire');
  await page.waitForURL(/\/plan/, { timeout: ATTENTE });
  // La prémisse du profil, relue au serveur : sans elle, une assertion d'écran qui passerait ne dirait
  // pas si c'est l'écran qui est juste ou le profil qui a une boucle.
  const sansBoucle = await session();
  const reponseBoucles = await fetch(`${API}/rest/v1/rpc/mes_boucles_a_venir`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${sansBoucle.jeton}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  assurer(reponseBoucles.ok, `rpc mes_boucles_a_venir : HTTP ${reponseBoucles.status}`);
  const bouclesSansBoucle = await reponseBoucles.json();
  assurer(
    Array.isArray(bouclesSansBoucle) && bouclesSansBoucle.length === 0,
    `le profil sans trajet, sans sorties régulières ni voyage a des boucles : ${JSON.stringify(bouclesSansBoucle)}`
  );
  // Plan à zéro action : la barre arrive, et la carte des deux lieux avec elle.
  await attendreTexte('Deux endroits, pas plus.');
  await attendreTexte('Ici, ton plan : ta saison. En bas, ton suivi : tes bilans, saison après saison.');
  await attendreTexte('Je garde tes bilans dans ton suivi, au fil des saisons.');
  await page.getByText('Compris', { exact: true }).first().click();
  await attendreTexte('Ton plan est là, reviens quand tu veux.');

  etape('sans boucle — le suivi ne parle pas de réponses');
  for (const libelle of await page.getByText('Suivi', { exact: true }).all()) {
    if (await libelle.isVisible()) {
      await libelle.click();
      break;
    }
  }
  await page.waitForURL(/\/suivi$/, { timeout: ATTENTE });
  await attendreTexte('Je garde tes bilans ici, au fil des saisons.');
  assurer(
    !(await page.getByText(/Une période sans réponse ne se voit pas ici/).first().isVisible()),
    'le suivi sans boucle explique encore les périodes sans réponse'
  );
  await rpc('delete_my_account', sansBoucle.jeton);

  assurer(exceptions.length === 0, `exceptions dans la page :\n${exceptions.join('\n')}`);
  console.log(
    `Parcours réel joué de bout en bout : bilan ${ATTENDU.totalKg} kg, ${ATTENDU.pistes.length} pistes dans ` +
      `l'ordre attendu, engagement (les jours au clavier), point répondu, suivi, « Toi » et sa ligne de ` +
      `canal, compte supprimé — puis le cycliste, ${ATTENDU_SOBRE.totalKg} kg et un plan à zéro action, ` +
      `barre d'onglets venue sans « Compris », puis son nouveau bilan en voiture où « Ton premier plan » ` +
      `passe devant la carte des deux lieux, puis ses deux bilans retirés — le plan reparti du précédent, ` +
      `puis la racine et la marque locale effacée, et la carte d'attente qui nomme le lundi — puis un ` +
      `profil sans boucle, à qui ni le plan ni le suivi ne promettent rien. Chaque choix rendu répond à ` +
      `son groupe nommé.`
  );
} catch (erreur) {
  try {
    await page.screenshot({ path: CAPTURE, fullPage: true });
  } catch {
    /* la capture est un confort, pas le verdict */
  }
  const texte = await page.evaluate(() => document.body.innerText).catch(() => '(page illisible)');
  console.error(
    `Le parcours réel s'est arrêté à l'étape « ${etapeCourante} » (${page.url()}).\n` +
      `${erreur instanceof Ecart ? erreur.message : erreur instanceof Error ? erreur.stack : String(erreur)}\n\n` +
      `Capture : ${CAPTURE}\n` +
      (exceptions.length ? `Exceptions dans la page :\n${exceptions.join('\n')}\n` : '') +
      (journal.length ? `Console et réseau :\n${journal.slice(-25).join('\n')}\n` : '') +
      `Texte visible :\n${texte.slice(0, 1500)}`
  );
  process.exitCode = 1;
} finally {
  await navigateur.close();
  fermer();
}
