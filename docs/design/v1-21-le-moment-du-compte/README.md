# Canvas — le moment du compte : où il se propose, et ce qu'un code change

Réponse livrée le 20/09/2026 par la session Claude Design au brief `BRIEF.md` (v1-21, le moment du
compte et le lien qui ne voyage plus — `v1-27` §12.9 et §12.10). Le document d'implémentation qui
en découlera est à écrire dans `docs/architecture/` ; ce README dit ce qui est proposé, **pourquoi**,
ce qui a été écarté, et ce qui reste à trancher.

Le dossier contient ce README et `HANDOFF.md` (la spécification, planche par planche, copy
définitive, dérivations, où ça se touche, états). **Il n'y a ni `Canvas.dc.html` ni `captures/`**,
pour la même raison que `v1-20` : ce brief demande d'abord une décision — le moment — et des mots,
et chaque planche est soit un écran existant dont la copy change, soit un formulaire d'un champ.
Dessiner un écran de connexion avant d'avoir décidé s'il doit s'interposer aurait été le mauvais
ordre. Les planches sont décrites avec les jetons nommés et les tailles relevées dans le dépôt ; un
canvas HTML peut en être tiré après arbitrage.

**Tout ce qui suit est relevé sur le code**, pas de mémoire : les quatre étapes d'onboarding, les
neuf étapes du questionnaire (`BILAN_STEP_ORDER`), la restitution, les trois écrans de `/connexion/*`,
`src/types/connexion.ts`, le plan, « Toi », la feuille des rappels, la page de suppression, les
gabarits d'e-mail (`docs/exploitation/gabarits-email.md`) et la configuration auth. **Aucun chiffre de
conversion n'est cité**, et c'est délibéré : la base ne porte que des profils de test (65 le
19/09/2026, `CLAUDE.md`), et le seul relevé daté — un compte permanent sur 223 sessions, `v1-10` §1 —
est antérieur à la purge et sur des profils de test aussi. Il dit une chose et une seule : l'interstitiel
était en place quand ce chiffre a été mesuré.

## La réponse en trois phrases

**Le moment n'est pas le bon, et pas parce qu'il serait trop tôt ou trop tard : parce que c'est un
péage entre deux écrans que la personne a demandés, à un endroit où le compte ne répond à aucune
question qu'elle se pose.** L'interstitiel se retire ; le compte se propose là où il est la réponse à
une question posée — la feuille des rappels (« comment te faire signe ? », et par email il faut une
adresse), la carte d'attente du plan (déjà), « Toi » (déjà) — et une ligne vraie reste sur la
restitution, à la place de l'écran. **Le lien disparaît des deux e-mails au profit du seul code à
six chiffres** : il dissout la question la plus difficile du brief (« comment dire que le lien
s'ouvre ici, pas ailleurs ») en la supprimant, il rend la page de suppression — le cas le plus dur —
le plus simple, et sans lien dans l'e-mail de rattachement, l'adresse d'un tiers ne peut plus être
confirmée par un clic. **Les mots suivent le modèle** : on ne *crée* rien et on ne *se connecte* pas —
on **rattache** une adresse à un compte qu'on a déjà, et on **retrouve** ce compte depuis un autre
appareil ; « Garde ce résultat », « on t'envoie un lien » et « Continuer sans compte » s'en vont.

| Question du brief | Où c'est répondu |
| --- | --- |
| §0 / §6.1 — le verdict et son critère | §1 et §3 ci-dessous |
| §1.1 / §6.2 — où le compte se propose, à quel prix | §3, la carte du moment |
| §1.2 — « ton lien s'ouvre ici » sans faire peur | §4 : il n'y a plus de lien |
| §1.3 / §6.3 — le code change-t-il la réponse | §4 |
| §1.4 / §6.5 — l'adresse déjà prise, et §4.3 | §5 |
| §6.4 — les mots | §6, et la copy définitive du `HANDOFF.md` |

## 1. Le critère, avant le verdict

Le brief a raison de le réclamer : « le bon moment » n'a jamais été défini ici, et le handoff ne le
définit pas non plus — il dit *où* (« après la restitution, avant le plan ») et *pourquoi pas avant*
(le taux de complétion du bilan est la métrique n° 1), jamais pourquoi *là*.

**Le critère proposé : le compte se propose là où il est la réponse à une question que la personne
se pose à cet instant, et jamais entre deux écrans qu'elle a demandés.** Trois tests, à passer dans
l'ordre :

1. **Le test de la question.** Qu'est-ce que la personne veut, là, maintenant, que seul le
   rattachement lui donne ? S'il faut expliquer pourquoi elle en voudrait, ce n'est pas le moment.
2. **Le test de la vérité.** La phrase qui propose est-elle vraie mot pour mot, et ce qu'on perd en
   refusant est-il dit ? Dans ce produit, une phrase qui promet une chose déjà acquise est fausse,
   pas emphatique.
3. **Le test du coût du refus.** Qu'est-ce que ça coûte à qui ne veut pas de compte — la population
   majoritaire, sans obligation (§5.5) ? Un écran de plus entre deux écrans demandés, ou une ligne
   dans un écran qu'on lisait de toute façon ?

Ce que le critère n'est **pas** : ni « le plus tôt possible » (plus d'exposition), ni « le plus
tard possible » (moins de friction), ni le taux de conversion — celui-ci est ce qu'on *mesurera*
après, pas ce qui décide. Un péage convertit toujours plus qu'une porte, au prix de la promesse du
produit (« pas de compte à créer pour commencer », onboarding, écran 1).

Le critère a une conséquence que le handoff avait déjà, par une autre route : **rien avant la
soumission**. Avant elle, il n'y a aucune question à laquelle le compte réponde — le brouillon est
local, le questionnaire se remplit sans réseau, et rien n'est encore en base.

## 2. Lecture critique du parcours tel qu'il est

Treize écrans avant qu'on demande quoi que ce soit, puis la restitution, l'interstitiel, le plan. Ce
que chacun **demande**, ce qu'il **donne**, et ce qui y touche au compte — relevé sur
`src/components/onboarding/*`, `src/app/bilan/index.tsx`, `src/app/(tabs)/suivi/bilan.tsx`,
`src/app/connexion/index.tsx`, `src/app/(tabs)/plan/index.tsx` et `src/components/plan/feuille-rappels.tsx`.

| # | Écran | Ce qu'il demande | Ce qu'il donne | Ce qui y touche au compte |
| --- | --- | --- | --- | --- |
| 1 | Onboarding · accroche | rien | la promesse ; Ramille se présente | « Pas de compte à créer pour commencer. » et, dessous, « J'ai déjà un compte » — la porte vers `/connexion/retrouver` |
| 2 | Onboarding · contexte | rien | les repères nationaux | — |
| 3 | Onboarding · réassurance | rien | « pas de jugement », « tes réponses restent privées », le lien vers `/confidentialite` | la phrase sur les réponses, sans dire où elles vivent |
| 4 | Onboarding · transition | rien | la durée, les quatre sections, « ensuite : une action à ton rythme, et un point de temps en temps » | « tes réponses sont conservées » — le brouillon, local |
| 5–13 | Questionnaire (neuf écrans ; six pour un profil sans trajet régulier) | les réponses | la progression, un mot de Ramille à l'entrée des quatre sections, le préremplissage au re-bilan | rien — et c'est juste |
| 14 | Restitution (`nouveau=1`) | rien… puis, au bouton, le compte | le chiffre, le poste dominant, le palier, le partage | « Voir ce que je peux faire » mène à `/connexion` et non au plan, tant que la proposition n'a pas été vue |
| 15 | `/connexion`, l'interstitiel | un compte — Google, email, ou « Continuer sans compte » | rien de neuf : le rappel du chiffre qu'on vient de lire (« Ce qui est déjà enregistré ») | tout |
| 16 | Plan | rien | la règle du jeu (« Ton premier plan »), les cartes, la carte d'attente | la porte vers « Toi » quand le canal effectif est `aucun` (`carteAttente`, recette web du 16/09/2026) ; l'annonce « Ton compte est rattaché à … », une fois |
| 17 | Feuille des rappels, après le premier « C'est noté » | le canal | ce qui va se passer, par Ramille | « Par email — Rattache un compte pour l'activer. » : une ligne grisée, sans porte |

Cinq observations, dans l'ordre où elles pèsent :

1. **La seule demande du parcours tombe entre deux écrans que la personne a demandés, et le bouton
   ne fait pas ce qu'il dit.** « Voir ce que je peux faire » ouvre un écran de compte. Le test 3
   est perdu d'emblée : le refus coûte un écran entier, sur la conversion la plus importante après
   la complétion du bilan — restitution → plan → engagement.
2. **« Garde ce résultat et suis ta progression » est faux depuis `v1-04`.** Le titre vient du
   handoff (§4.1), écrit pour un produit où le bilan vivait **en local** jusqu'à la connexion — là,
   « garder » protégeait vraiment quelque chose. `v1-04` §1 a changé le modèle (session anonyme dès
   l'ouverture, bilan en base) et a gardé l'écran, en notant que « rien ne change côté UI/flow ». Le
   bloc « Ce qui est déjà enregistré » a la même origine : dans le handoff, « le rappel du chiffre
   remplace l'argumentaire » ; aujourd'hui il répète l'écran qu'on vient de quitter. L'interstitiel
   est le fossile d'un modèle que le produit n'a plus.
3. **La proposition arrive avant que la chose qu'elle sert existe dans l'expérience de la
   personne.** À cet instant, il n'y a ni point, ni engagement, ni rappel, ni autre appareil. Le
   compte donne trois choses — changer d'appareil, recevoir le mot par email, survivre à trois mois
   de silence — et aucune n'est ce que la personne est en train de faire. Test 1 perdu.
4. **Là où la question se pose vraiment, la réponse est un mur ou un détour.** La feuille demande
   « Comment tu préfères que je te fasse signe ? » et grise « Par email » avec « Rattache un compte
   pour l'activer », sans rien à toucher ; la carte d'attente du plan a une porte, mais vers
   « Toi », d'où l'on repart vers `/connexion`. Le seul endroit où le compte répond à une question
   est celui où on ne le propose pas.
5. **L'onboarding dit « pas de compte à créer », puis la restitution en fait un péage.** La phrase
   de l'écran 1 est vraie — et la personne peut lire la suite comme un revirement. Ce que le dépôt
   avait déjà relevé sur cette phrase (C3.9, A1-8 : « le seul mot “compte” se lisait à l'envers »)
   vaut aussi pour son contraire.

Ce qui tient, et qu'il ne faut pas toucher : rien avant la soumission ; les huit portes de
`/connexion/retrouver` (onboarding, plan vide, rappel, session refusée, suppression, collision
Google, adresse prise, lien) ; la collision dite avant et laissée au choix (`v1-10`) ; la
non-divulgation de « retrouver » ; l'annonce de rattachement sur le plan, une fois ; et la
dérivation plutôt que le ternaire (`etatDeLaProposition`) — c'est elle qui rend le retrait
propre : la réponse à « faut-il proposer ? » change, sa forme reste une fonction testée.

## 3. Le verdict, et la carte du moment

**Le moment n'est pas le bon.** L'interstitiel perd les trois tests ; il se retire. Le bouton de la
restitution va au plan, toujours. Et le compte se propose à trois endroits, dont deux existent :

| Le moment | Forme | Combien de fois | Ce que ça coûte à qui refuse | Ce que ça devient | Par où l'on revient |
| --- | --- | --- | --- | --- | --- |
| **La restitution**, en sortie de questionnaire, session anonyme (R1) | une ligne en tête, la bannière qui existait déjà pour les passages suivants, avec une phrase vraie : « Ce bilan n'est accessible que depuis cet appareil. · Le retrouver ailleurs » | à chaque nouveau bilan, jamais en relecture | rien — on ne la touche pas, le bouton va au plan | rien : pas de marque, pas de compteur de refus | « Toi », la carte d'attente |
| **La feuille des rappels**, après le premier « C'est noté » (F1) | la ligne « Par email » garde son détail, et gagne **la porte** sous elle : « Rattacher un compte », comme « Ouvrir les réglages du téléphone » sous la ligne notification | une fois par appareil, comme la feuille | rien — on valide un autre canal | la carte d'attente du plan, qui porte déjà sa porte quand le canal effectif est `aucun` | « Toi » |
| **La carte d'attente** du plan (existant, `carteAttente`) | « Rattache un compte pour recevoir le mot par email. » + porte vers « Toi » | tant que l'état dure | — | — | — |
| **« Toi »** (existant) | « Rattacher un compte » | permanent | — | — | — |
| **Un appareil neuf** (existant) — onboarding, plan vide, `?rappel=1`, session refusée, suppression | « J'ai déjà un compte » → `/connexion/retrouver` | — | — | — | — |

Zéro interstitiel. Et ce que la carte ne contient **pas**, à dessein : aucun nouveau moment pour
« et si tu changes de téléphone ? ». Le produit ne peut pas prédire un changement d'appareil, et une
question qu'on ne se pose pas n'a pas de moment — le critère le dit. Ce que le produit peut faire, il
le fait : dire une fois, vrai, où le bilan est accessible (la bannière), tenir la porte ouverte
(« Toi », la carte d'attente), et rendre la reconnexion insensible à l'appareil le jour où elle a
lieu (§4).

**Pourquoi la feuille est le moment juste, et pas un moment de plus.** Elle est le seul écran du
produit qui *pose* la question à laquelle le compte répond (« comment te faire signe ? »), et sur
web — la surface publique, où il n'y a pas de push — l'email est le seul canal : le compte y est
littéralement ce qui rend un rappel possible. Elle arrive après le premier engagement, donc après que
la personne a vu le bilan, le plan, et décidé quelque chose : ce qu'on lui propose de garder existe.
Et elle coûte ce qu'un lien sous une ligne coûte, à qui n'en veut pas : rien.

**Ce qui se casse si on se trompe.** Moins de rattachements — donc moins de rappels par email, et
sur web, où le push n'existe pas, un anonyme qui n'engage rien n'est jamais rappelé. C'est mesurable
par ce qui existe : `connexion_view` par provenance (`resultat_cta`, `compte`, et la nouvelle
`rappels`) et la paire `connexion_demande` / `connexion_success`. Et c'est réversible : l'écran
existe dans l'historique du dépôt, et la dérivation qui décidait de le montrer reste une fonction.
Ce qui ne revient pas, c'est le mensonge du titre.

**Les alternatives, et ce que chacune coûte à qui ne veut pas de compte** :

- **Garder l'interstitiel et corriger sa copy.** Coûte un écran à tout le monde, sur la transition
  restitution → plan ; la copy peut devenir vraie (« Ton bilan te suit d'un appareil à l'autre »),
  pas le moment : test 1 reste perdu, le bouton continue de ne pas faire ce qu'il dit.
- **Le proposer plus tôt — à la transition de l'onboarding, avec « tes réponses sont conservées ».**
  Coûte la métrique n° 1, et il n'y a rien à rattacher.
- **Une carte d'ouverture « ton compte » sur le plan, après le premier engagement.** Les cartes
  d'ouverture expliquent le produit, elles ne vendent pas une fonction ; et le plan en porte déjà
  trois, une à la fois. Coûte une carte de plus à tout le monde.
- **Le proposer à la bascule de saison, ou au moment anniversaire.** Ce sont des moments de
  continuité, où la phrase « ton bilan ne vit que sur ce téléphone » se lirait comme une menace
  posée sur une fête. Coûte la justesse de ces deux moments.
- **Une bannière permanente sur le plan.** Le plan est là où l'on revient chaque semaine ; une
  ligne de compte à chaque retour est une relance, ce que le handoff §4.5 interdit.

## 4. Lien ou code : le code, seul

**Tranché : les deux e-mails ne portent plus qu'un code à six chiffres, et plus aucun lien.** Le
code se tape dans l'écran qui l'attend — celui qui a demandé l'adresse —, quel que soit l'appareil
où l'e-mail est lu.

| | Le lien (PKCE, aujourd'hui) | Le code |
| --- | --- | --- |
| Bilan sur un ordinateur, e-mail lu sur le téléphone | échoue (« ce lien doit s'ouvrir là où tu l'as demandé ») | marche |
| Même téléphone, messagerie qui ouvre un autre navigateur | échoue | marche |
| La page de suppression, navigateur neuf par définition (§5.7) | marche si le lien revient dans le même navigateur | marche |
| Ce qu'il faut dire à la personne | « ouvre-le depuis cet appareil et ce navigateur » — vrai, et il faut savoir ce qu'est un navigateur | « tape-le ici » |
| Le geste sur le même appareil | un toucher | six chiffres |
| Le chemin technique | `Linking.useURL`, le scheme `ramille://`, `createSessionFromUrl`, la liste des Redirect URLs — un chemin « jamais exercé sur appareil » (`produit.md`) | un appel, sans redirection ni scheme |
| L'échec attendu | un état normal à dessiner (« lien ouvert ailleurs ») | un code faux ou expiré, avec « Renvoyer » sous le champ |
| §4.3 — l'adresse d'un tiers, dans l'e-mail de rattachement | le clic **confirme** côté serveur, même quand le navigateur ne peut pas échanger le code : c'est la faille | sans le code tapé dans l'app qui l'a demandé, rien ne se confirme ; le destinataire devrait lui-même recopier le code dans une app qui n'est pas la sienne |
| Ce que ça rouvre | — | rien : le code ne remet jamais de session à une adresse choisie par quelqu'un d'autre, et un code se tape, il ne se clique pas (brief §4.2). Six chiffres suffisent parce que la vérification est plafonnée par adresse IP (`token_verifications`, `supabase/config.toml`) — un point à relever sur le distant, `HANDOFF.md` § À éprouver |

**Ce que le code change à la question §1.2** : elle disparaît. Il n'y a plus de « ici, pas ailleurs »
à expliquer, parce qu'il n'y a plus d'endroit — le code ne sait pas d'où il vient. La phrase « ouvre-le
depuis cet appareil » et le message « ce lien doit s'ouvrir là où tu l'as demandé » cessent d'être
du design ; ils restent dans le code comme filet, pour un lien déjà parti avant le changement.

**Pourquoi pas les deux dans le même e-mail** (le brief l'envisage : « le lien reste dans l'e-mail
pour qui est déjà au bon endroit »). Trois raisons. Deux façons de faire une chose obligent l'e-mail
à expliquer laquelle choisir — le cours qu'on voulait éviter. L'état d'échec du lien redevient
atteignable, donc un état à dessiner et à tenir. Et surtout, **dans l'e-mail de rattachement le lien
est la faille elle-même** : tant qu'il y est, quelqu'un qui n'a rien demandé peut confirmer d'un clic.
Le retirer là est obligatoire ; le retirer aussi de l'e-mail de reconnexion, c'est n'avoir qu'un
mécanisme, une phrase, un composant.

**Ce que ça coûte, dit franchement** : le toucher unique sur le même appareil devient six chiffres à
recopier, une fois par appareil — le geste que les banques, les messageries et les billetteries ont
rendu ordinaire. L'app doit survivre à l'aller-retour vers la messagerie : sur natif l'écran reste
monté ; sur web, si l'onglet est parti, « Toi » ramène à la saisie du code tant que l'adresse est à
confirmer (planche C5 du `HANDOFF.md`). Et le code est **le même geste pour les trois écrans** qui
demandent une adresse — rattacher, retrouver, supprimer — donc un seul composant.

**Google ne bouge pas.** Le bouton reste le chemin principal de `/connexion`, le retour OAuth garde sa
redirection sur web et `openAuthSessionAsync` sur natif ; c'est le seul chemin qui a encore besoin
des Redirect URLs.

## 5. L'adresse d'un tiers (§4.3), et l'adresse déjà prise (§1.4)

**§4.3 se ferme par le code seul, sans geste de plus.** Le brief liste trois parades ; la première
(« un geste de plus avant qu'une session anonyme puisse revendiquer une adresse ») *est* le code —
le geste est de le taper, dans l'app qui l'a demandé. La deuxième (reconfirmer à la reconnexion) n'a
plus d'objet. La troisième (l'e-mail qui rend l'anomalie visible) est faite depuis le 20/09/2026 et
se garde : l'e-mail de rattachement continue de dire que l'adresse « vient d'être saisie », et son
paragraphe de sortie devient vrai au sens fort — « sans ce code, cette adresse n'est rattachée à
rien, et personne ne peut le taper à ta place ». Ce qui reste, et qu'il faut nommer : le tiers reçoit
un e-mail qu'il n'a pas demandé. C'est du bruit, pas une prise ; le plafond d'envoi par adresse
(`over_email_send_rate_limit`) en borne la fréquence, et ça n'appelle rien de plus ici.

**§1.4 — « cette adresse a déjà un compte » : vérifier d'abord, dire ensuite.** Aujourd'hui
`/connexion/email` répond `Cette adresse a déjà un compte` sur le `422 email_exists` d'`updateUser`,
avant tout envoi. C'est vrai et utile pour la personne qui a un compte et s'est trompée d'entrée ;
c'est aussi **un oracle gratuit** : `/connexion/email` s'atteint depuis « Toi » sans bilan, sur web, en
quelques touchers, et rien ne plafonne un `email_exists` puisque rien ne part. La non-divulgation de
« retrouver » (§5.3) est donc déjà ouverte, une porte plus loin.

Le code permet de la refermer sans perdre la personne qui s'est trompée d'entrée : **sur
`email_exists`, l'écran demande un code de connexion pour cette adresse (`shouldCreateUser: false`)
et montre le même écran de code qu'un rattachement — « Un code vient de partir à … » est vrai dans
les deux cas.** Seul le titulaire de la boîte peut aller plus loin, et lui dire alors que l'adresse
avait déjà un compte n'est pas une divulgation : c'est le sien. Le constat s'affiche après le code
(planche C4) : le compte retrouvé est ouvert, le bilan fait sur cet appareil est resté à part, et on
peut le refaire depuis le compte, préremplissage à l'appui.

Ce que ça coûte, et à qui : la personne qui a un compte, a fait un bilan neuf sur un appareil neuf
**sans** prendre « J'ai déjà un compte » (offert à l'accueil, sur le plan vide, sur le rappel), puis
tape son adresse dans « rattacher » en voulant garder ce bilan-ci sans rejoindre l'ancien — elle
l'apprend après, et perd cinq minutes de réponses, pas son historique. Le cas est celui que la porte
de l'onboarding existe pour rendre rare (`v1-10`, canvas « retrouver son compte »), et
`retrouver_view.collision` dit s'il l'est. Le lien « J'ai déjà un compte » reste sur l'écran d'adresse,
et il mène, lui, à la collision **dite avant** et laissée au choix — inchangée. Et la bascule devient
mesurable sans événement neuf : elle émet `retrouver_send` sans `retrouver_view`, donc l'écart entre
les deux **est** le nombre de collisions par adresse.

**Google, collision** (`identity_already_exists`) : inchangé. On doit posséder le compte Google pour
la provoquer ; il n'y a pas d'oracle, et l'écran de collision de « retrouver » — choix avant —
reste le bon.

## 6. Les mots

Le modèle est inhabituel (« tout le monde a déjà un compte »), et le vocabulaire doit le porter sans
l'expliquer. Deux verbes, en paire, et rien d'autre :

- **rattacher** — une adresse, ou un compte Google, au compte qu'on a déjà. C'est le verbe du
  produit depuis « Toi » (« Rattacher un compte », « Ton compte est rattaché à … ») et de la carte
  d'attente ; il est gardé partout, et il devient le titre de l'écran d'adresse (« Rattacher mon
  adresse ») et du bouton qui ferme la saisie du code. « Rattacher un compte » plutôt que
  « rattacher une adresse » dans les portes : Google aussi passe par là, et « compte » est le mot
  que la personne retrouvera dans l'autre verbe ;
- **retrouver** — ce compte, depuis un autre appareil. « J'ai déjà un compte » reste la porte, parce
  qu'elle est vraie pour qui a rattaché, et « Retrouver mon compte » le titre.

Ce qui s'en va, et pourquoi : **« Garde ce résultat et suis ta progression »** (faux : il est gardé) ;
**« Ce qui est déjà enregistré »** (répète l'écran qu'on quitte) ; **« Continuer sans compte »** (il
n'y a plus rien à continuer, puisqu'on ne s'interpose plus) ; **« on t'envoie un lien qui te reconnecte
ici, sur cet appareil »** (plus de lien, plus d'« ici ») ; **« Recevoir le lien »** → « Recevoir un
code » ; **« Se connecter — Ramille »** (titre d'onglet web de `/connexion`) → « Rattacher un compte
— Ramille » ; et la carte de collision cesse de dire « le lien suffit » pour « le code suffit ».

Ce qui s'écrit une seule fois, vrai, et sans faire peur : **la bannière** (« Ce bilan n'est
accessible que depuis cet appareil. ») — un fait, pas une menace ; **la phrase des trois mois**, qui
existe déjà sous l'interstitiel (C3.9) et vit désormais sous « Plus tard » de `/connexion` et sur
« Toi » en état `local` — jamais sur la restitution ; et le corps de `/connexion`, dérivé de la
provenance, qui nomme la question de la personne quand elle en a une (depuis la feuille : « Le rappel
par email a besoin d'une adresse. »).

**Ramille ne dit rien de nouveau.** Aucune réplique n'est ajoutée : le compte est un fait sur les
données de la personne, et les écrans qui le portent sont en voix produit — c'est déjà la règle de
l'annonce de rattachement sur le plan (« ni mascotte, ni exclamation, ni action à faire »). Son
visage reste en tête de `/connexion`, comme aujourd'hui, pour la seule raison qui le justifie là : que
ce soit Ramille et non un tiers qui demande.

## 7. Ce qui a été écarté, et pourquoi

1. **Garder l'interstitiel en corrigeant sa copy.** §3 : la copy peut devenir vraie, le moment non.
2. **Proposer le compte à la transition de l'onboarding.** Coûte la métrique n° 1 ; rien à rattacher.
3. **Une carte d'ouverture « ton compte » sur le plan.** Les cartes expliquent, elles ne vendent pas.
4. **Le proposer à la saison ou à l'anniversaire.** Une menace posée sur une fête.
5. **Lien et code dans le même e-mail.** §4 : deux façons, un cours, et la faille qui reste.
6. **Six cases séparées pour le code.** Six champs pour un lecteur d'écran, un composant neuf qui
   gère le focus, et rien que la valeur qu'un seul champ de six chiffres ne rende pas. Un champ,
   dérivé de `TextField`, chiffres espacés.
7. **Fusionner « rattacher » et « retrouver » en un seul écran d'adresse, sans regarder ce que
   porte l'appareil.** Depuis un appareil sans bilan (l'accueil de l'onboarding), une adresse
   inconnue ferait rattacher une session **vide** — c'est-à-dire fabriquer un compte depuis la porte
   « J'ai déjà un compte », l'inverse de ce qu'elle promet. La distinction reste celle du code
   d'aujourd'hui : l'appareil porte-t-il un bilan anonyme ?
8. **Transférer le bilan anonyme vers le compte retrouvé.** Écarté en `v1-10` (« la vraie réponse à
   terme, faute de justifier son coût serveur »), et rien ici ne change l'arbitrage. La collision se
   dit et se laisse au choix.
9. **Une reconfirmation à la reconnexion** (§4.3, parade 2). Sans objet avec le code.
10. **Un événement de mesure pour le code** (saisi, refusé, réussi). Une reconnexion réussie est
    dans `auth` (`last_sign_in_at` bouge à la vérification) — on n'instrumente pas ce que le schéma
    enregistre. Un code refusé n'apprendrait rien qu'on puisse corriger.
11. **Une marque locale « code en attente ».** L'adresse à confirmer est un fait **serveur**
    (`a_confirmer`, `etatDuRattachement`), et l'adresse tapée est déjà mémorisée en local
    (`memoriserAdresseDuLien`). Les deux suffisent à rouvrir la saisie depuis « Toi ».
12. **Une bannière de compte sur le plan.** Une relance à chaque retour.
13. **Un écran de constat après un rattachement réussi.** Le plan l'annonce déjà, une fois, et c'est
    la destination ; un écran entre les deux redoublerait l'annonce.

## 8. Les écarts au design system que j'assume

- **Le champ de code** (`ChampDeCode`) reprend la boîte de `TextField` — 56 de haut
  (`ControlHeight.field`), rayon 16 (`Radius.field`), `backgroundElement`, bordure 1,5 `accent`
  quand le champ a du contenu — et y met des chiffres en 24/30, interlettrage 6, centrés. C'est une
  taille hors échelle, laissée en dur là où elle vit, comme les autres tailles uniques
  (`theme.ts`). Le kit dit de `TextField` qu'il est « en pratique le seul champ texte du produit »
  (`.design-sync/previews/TextField.tsx`) : il y en a deux.
- **Le style du code dans l'e-mail** (28 px, interlettrage 6, graisse 600) est hors système : un
  e-mail HTML ne lit pas `theme.ts`, et il faut que six chiffres se lisent d'un coup d'œil dans une
  messagerie.
- **Le titre de `/connexion` reste en 30/36 en dur**, recopie de `salient` que `theme.ts` liste déjà
  comme restant à arbitrer ; ce canvas ne la déplace pas.
- **L'écart au handoff est le plus gros, et c'est un choix produit** : le §4 du handoff écrit
  « Placement (validé, non négociable) : après la restitution, avant le plan ». Ce canvas retire
  l'interstitiel §4.1, son bloc teinté et « Continuer sans compte », et garde le bandeau §4.5 en le
  rendant premier. Ce n'est pas au canvas de défaire un « non négociable » : c'est la première ligne
  de la section suivante.
- **Aucun jeton ajouté** : couleurs, tailles, rayons, hauteurs sont ceux du dépôt, chaque couleur
  existe dans les deux thèmes.

## 9. Ce que le kit et le code disent différemment — relevé de cette session

- `docs/design/design-system/components/forms/TextField.prompt.md` : « le seul chemin vers un
  compte est un lien à usage unique envoyé par email. Une adresse, donc, et rien d'autre » — faux
  après ce canvas, sur les deux moitiés (un code, et un second champ) ; et
  `.design-sync/previews/TextField.tsx` : « en pratique le seul champ texte du produit » (§8).
- Le catalogue des 38 écrans du kit montre toujours les écrans à mot de passe (connu, readme du kit).
- `src/app/_layout.tsx`, commentaire de l'écoute `Linking.useURL()` : « il revient par le scheme
  `ramille://` avec **les jetons dans le fragment** » — périmé depuis PKCE (c'est un `code`), et
  après ce canvas, aucun e-mail ne porte plus ni l'un ni l'autre. L'écoute reste, comme filet.
- **Relevé hors périmètre, à ne pas perdre** : la reconnexion par lien (`createSessionFromUrl` puis
  `router.replace('/')`) **ne balaie pas les marques locales** `traceverte.*` au changement
  d'utilisateur, alors que `seDeconnecterDeCetAppareil` le fait. Après une collision retrouvée, le
  plan du compte retrouvé lit donc les marques de la session qu'on vient de quitter — dont
  `rattachement_annonce` et `premier_parcours`. Le chemin par code reprend le balayage au bon
  endroit (`HANDOFF.md`, § Interactions), avec la réserve du brouillon.
- `src/app/connexion/index.tsx` lit `assessment_results` pour le bloc « Ce qui est déjà
  enregistré » : cette lecture part avec le bloc.

## 10. Ce qu'il reste à trancher — pour la personne qui pilote

Chaque ligne dit le fait, l'enjeu, la recommandation et ce qu'on casse en se trompant.

1. **Retirer l'interstitiel.** Fait : le handoff §4 le dit « validé, non négociable », et il perd
   les trois tests du critère. Enjeu : la conversion restitution → plan d'un côté, le nombre de
   rattachements de l'autre. Recommandation : le retirer, garder la bannière dès le premier passage.
   Ce qu'on casse si on se trompe : moins de rattachements, donc moins de rappels par email — et sur
   web, où le push n'existe pas, un anonyme qui n'engage rien n'est jamais rappelé. Mesurable par
   `connexion_view` par provenance et la paire demande/succès ; réversible par l'historique du dépôt.
   Si on garde l'interstitiel, on garde un titre faux et un bouton qui ne fait pas ce qu'il dit.
2. **Le code seul, sans lien, dans les deux e-mails.** Fait : mesuré possible (brief §4.2) ; le lien
   de l'e-mail de rattachement est la faille §4.3. Enjeu : un toucher contre six chiffres sur le même
   appareil ; un mécanisme contre deux. Recommandation : le code seul. Ce qu'on casse si on se trompe :
   le geste du même appareil s'allonge d'une recopie ; si l'on garde le lien dans l'e-mail de
   **reconnexion** seulement (le compromis), l'e-mail doit expliquer deux gestes et l'état « ouvert
   ailleurs » reste un état normal à tenir. **Le lien ne peut pas rester dans l'e-mail de
   rattachement** : ce serait garder §4.3 ouvert.
3. **« Cette adresse a déjà un compte » : vérifier d'abord, dire ensuite.** Fait : l'oracle est
   gratuit aujourd'hui depuis « Toi ». Enjeu : la non-divulgation contre le choix avant. Recommandation :
   vérifier d'abord (§5). Ce qu'on casse si on se trompe : la personne qui voulait garder le bilan de
   cet appareil sans rejoindre son ancien compte l'apprend après, et perd cinq minutes de réponses.
   L'inverse garde l'oracle, c'est-à-dire rend la non-divulgation de « retrouver » décorative.
4. **Où vit la phrase des trois mois.** Fait : la purge frappe une session anonyme muette 90 jours
   (`purge_stale_anonymous_accounts`, relevé le 20/09/2026). Enjeu : la dire sans en faire une menace.
   Recommandation : sous « Plus tard » de `/connexion` (déjà) et sur « Toi » en état `local` (nouveau),
   jamais sur la bannière. Ce qu'on casse si on se trompe : quelqu'un qui n'ouvre ni « Toi » ni la
   bannière ne l'apprend nulle part — aujourd'hui l'interstitiel la faisait lire à tout le monde, en
   petit, sous un lien qu'on touche sans lire.
5. **La bannière en relecture ?** Fait : elle ne se rend qu'en sortie de questionnaire. Enjeu : une
   ligne à chaque bilan relu, ou une seule fois par bilan. Recommandation : jamais en relecture — le
   suivi est l'histoire de la personne, pas un endroit pour relancer. Ce qu'on casse si on se
   trompe : qui a ignoré la ligne au premier passage n'a plus que « Toi » et la carte d'attente.
6. **La porte de la feuille referme la feuille sans valider de canal.** Fait : la feuille ne s'ouvre
   qu'une fois par appareil, et « Rattacher un compte » la ferme pour partir. Enjeu : sur natif, la
   personne qui part rattacher ne donne pas la permission push ce jour-là et recevra le mot par
   email (la préférence par défaut). Recommandation : accepter — elle a choisi la ligne email. Ce
   qu'on casse si on se trompe : un rappel par email là où un push aurait été préféré, corrigeable
   dans « Toi » ; l'alternative (valider push, puis proposer) fait deux gestes pour une question.
7. **Le verbe « rattacher un compte » partout, plutôt que « ajouter mon adresse ».** Fait : trois
   surfaces l'emploient déjà. Enjeu : la justesse (on rattache une *adresse* à un compte qu'on a)
   contre la constance et Google. Recommandation : garder « rattacher un compte », et titrer
   l'écran d'adresse « Rattacher mon adresse ». Ce qu'on casse si on se trompe : un mot que la
   moitié des gens lisent comme « je n'ai pas de compte, donc pas pour moi » — c'est exactement ce
   que « J'ai déjà un compte » avait coûté avant C3.9, et la même mesure (`connexion_view`) le dira.

## 11. Ce que l'implémentation corrigera par rapport au canvas

À consigner ici au fil du chantier, comme `v1-14` et `v1-20` : le dépôt gagne, le canvas ne se
réécrit pas.

**Ce qui est su au moment de livrer, et qui ne pouvait pas l'être en lisant** — sept vérifications
contre l'API, listées en fin de `HANDOFF.md` (« À éprouver »). Les deux qui décident de la forme : le
code d'erreur exact d'un code faux et d'un code expiré, qui doit être **le même** qu'une adresse sans
compte en contexte connexion (sinon le client les unifie, comme `estPanneDeTransport` unifie les
siens) ; et le fait qu'un code de rattachement tapé sur l'écran de reconnexion soit refusé, et
l'inverse — les deux flux ne doivent pas se croiser.

### Ce que la mesure a corrigé le jour même — 20/09/2026

Quatre des sept points de « À éprouver » ont été mesurés à la livraison, contre la configuration du
projet distant (`GET /v1/projects/nuugfepfsypqgvsvyzht/config/auth`) et contre la stack locale. Deux
contredisent ce document, et c'est lui qui a tort.

- **Le code ne fait pas six chiffres, il en fait huit.** Le distant porte `mailer_otp_length = 8`
  là où `supabase/config.toml` dit `otp_length = 6` : le local ne reproduit pas la production, comme
  pour `enable_confirmations` la veille. Tout ce document écrit « six » — la copy, le champ, le style
  de l'e-mail, l'argument de force brute —, et la longueur n'est pas un détail d'affichage : c'est
  elle qui décide si le plafond de vérification suffit. **Il faut garder huit**, et corriger la copy.
  Le calcul, avec les deux autres valeurs relevées (`rate_limit_verify = 30` par tranche de cinq
  minutes et par adresse IP — le point 5 est donc répondu — et `mailer_otp_exp = 3600`) : une
  adresse IP dispose de trois cent soixante essais dans la fenêtre de validité, soit une chance sur
  deux cent soixante-dix mille à huit chiffres, et une sur deux mille huit cents à six. Le second
  chiffre n'est pas une garantie : il devient une chance sur trois avec un millier d'adresses,
  ce qu'un lien de connexion (`shouldCreateUser: false`) transforme en prise de compte. Huit
  chiffres rendent la même attaque sans objet, et c'est déjà le réglage en place.
- **« Sans le code tapé dans l'app qui l'a demandé, rien ne se confirme » est faux.** Mesuré : un
  `POST /auth/v1/verify` portant `type: 'email_change'` et le jeton, **sans aucune session** — la
  seule clé publique, comme n'importe quel navigateur — répond `200`, confirme l'adresse et **rend
  une session complète sur le compte du demandeur**, `is_anonymous` passé à `false`. Le code n'est
  lié à rien : ni au client qui l'a demandé, ni à une session, ni à un vérifieur. Ce n'est pas le
  jumeau du PKCE, c'est un porteur.
  Ce que le code ferme donc vraiment, et c'est réel : **plus aucun clic ne confirme quoi que ce
  soit**. Le tiers qui reçoit l'e-mail devrait recopier huit chiffres dans une app qu'il faut
  d'abord trouver et ouvrir, au lieu de toucher un lien par curiosité. Le coût du mauvais geste
  passe d'un réflexe à une démarche.
  Ce qu'il ne ferme pas, et que ce document ne nomme pas : **s'il tape le code, il confirme
  l'adresse sur le compte de l'attaquant et sa propre app basculera sur cette session-là** — son
  bilan anonyme reste derrière. C'est le §4.3 affaibli, pas refermé, et la parade qui reste est
  celle qui est déjà en production : l'e-mail dit que l'adresse vient d'être saisie et qu'il n'y a
  rien à faire. Sa phrase de sortie devra dire « ne le saisis pas » et non « ne clique pas ».
  La seule forme qui refermerait §4.3 **structurellement** serait un code à nous — engendré, envoyé
  et vérifié par le produit, la vérification exigeant la session qui a demandé le rattachement —,
  donc une écriture dans `auth.users` et `auth.identities` depuis une fonction à nous. C'est un
  second mécanisme d'authentification à tenir à côté de GoTrue, pour un gain qui ne porte que sur
  le tiers qui recopie un code qu'il n'a pas demandé : à consigner en dette (`v1-27`), pas à écrire.
- **Le point 6 est répondu à moitié, et du bon côté.** Le distant porte
  `mailer_secure_email_change_enabled = true`, et la mesure ci-dessus le traverse : sur une session
  anonyme **sans** adresse, une seule confirmation suffit — l'ancienne adresse n'existant pas, il
  n'y a rien à confirmer des deux côtés. Ce qui reste à éprouver est le jour où quelqu'un voudra
  **changer** une adresse déjà rattachée : là, les deux confirmations s'appliqueront.
- **Le relevé hors périmètre du §9 est confirmé** : `effacerLesMarquesLocales` n'est appelée que par
  les deux sorties de `src/lib/compte.ts`, et le retour de lien (`_layout.tsx`) ne la traverse pas.
