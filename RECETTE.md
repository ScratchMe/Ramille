# RECETTE.md — une séance de recette, son document et son artefact

Fichier d'outil, au sens de la table en tête de `CLAUDE.md` : **il ne se charge pas tout seul**, il
s'ouvre sur déclencheur. Comme les cinq autres, il est coupé en deux — ce qui vaut sur n'importe
quel projet (§1), et ce qui est propre à Ramille (§2, les chiffres et les routes, qui ne voyagent
pas).

Écrit le 17/09/2026, après la séance du premier parcours, sur une demande explicite : *« toutes les
recettes à venir doivent suivre le même format »*. Ce qui suit est donc un **format à reproduire**,
pas une suggestion — et surtout la raison de chaque pièce, sans quoi la prochaine session en
retirera une en croyant simplifier.

---

## 1. Ce qui vaut partout

### 1.1 Deux objets, deux rôles — et c'est le document qui est la source

Une recette produit **deux** choses, et les confondre coûte l'une ou l'autre :

- **un document dans le dépôt** (`docs/recette/<sujet>.md`) — c'est la **mémoire**. Il est versionné,
  il se cite depuis la documentation d'architecture, il survit à tout. C'est lui que les documents
  d'architecture référencent ;
- **un artefact web** — c'est l'**outil**. Il se coche, il compte, il rend un compte-rendu. Il est
  bien plus pratique à jouer, et il ne se cite nulle part dans le dépôt.

**Ne jamais écrire l'URL d'un artefact dans un document d'architecture.** Elle ne survit pas au
dépôt : un lien `claude.ai` dans `v1-13` serait mort pour quiconque lit le dépôt sans la
conversation. L'architecture cite le `.md`, le `.md` est la source, et l'artefact se **régénère**
depuis lui. L'inverse — coller le contenu de l'artefact dans le dépôt après coup — garantit que les
deux divergent à la première correction.

**L'artefact se met à jour, il ne se republie pas à côté.** Republier sans passer l'URL existante
crée un **second** artefact, et la personne qui pilote se retrouve avec deux feuilles dont une est
périmée sans le dire. L'URL de chaque recette est notée en §2.5.

### 1.2 Le profil se mesure, il ne se suppose pas

**C'est ce qui sépare une recette utile d'une recette molle.** Une ligne qui dit « un gain devrait
dépasser le millier » ne se vérifie pas : elle se contourne. Une ligne qui dit « la seconde carte
annonce − 1 601 kg » se vérifie d'un coup d'œil, et son échec est un constat.

Donc : **avant d'écrire le document, fabriquer le cas dans la vraie base** — ici un bilan calculé
puis son plan généré, dans une transaction annulée (l'idiome `do $$ … raise exception 'RESULTAT …'
$$` de `CLAUDE.md`) — et **recopier les chiffres obtenus** dans le document. Trois conséquences à
tenir :

- **le profil se prescrit à la lettre**, en tableau, réponse par réponse, dans les mots exacts de
  l'écran. « Un profil chargé » laisse la personne improviser, et ses chiffres ne seront alors
  comparables à rien ;
- **le document dit ce qui se déduit du profil** (ici : huit pistes, un cap, un ordre), parce que
  c'est précisément ce que la séance vient regarder ;
- **et il dit ce qui bouge légitimement.** Des facteurs qui se resynchronisent, une date qui avance :
  un chiffre qui a changé n'est pas forcément un écart. Nommer ce qui doit tenir **quoi qu'il
  arrive** — la forme, l'ordre, la présence — et ce qui peut glisser. Sans cette phrase, la séance
  remonte des faux constats et on apprend à les ignorer, ce qui est pire que de ne rien remonter.

### 1.3 Une ligne muette n'est pas une ligne conforme

La règle la plus chère des séances précédentes, et elle se perd si on ne la matérialise pas :
**cocher un bloc parce qu'il « a l'air bon » n'est pas jouer ses lignes.** Un bloc peut revenir
conforme sur autre chose et laisser trois lignes jamais regardées.

D'où trois états et jamais deux : **conforme**, **écart**, **non joué** — plus un quatrième, *muet*,
qui est simplement l'absence de réponse et qui **doit apparaître comme tel dans le compte-rendu**.
Une case vide qui s'imprime « conforme » est le défaut que tout ce dispositif existe pour éviter.

Et la consigne qui va avec, écrite dans le document et dans l'artefact : **noter ce qui a été vu,
pas son interprétation.** « La barre était là » vaut mieux que « la marque n'a pas dû être posée » —
la cause se cherche ensuite, avec le code sous les yeux.

### 1.4 Chaque libellé qu'on demande de chercher se relit dans la source

Un document de recette qui nomme un libellé inexistant fait perdre la séance : la personne cherche,
ne trouve pas, et ne sait pas si c'est un défaut ou une faute du document. **Avant de pousser :
relire dans le code chaque chaîne que le document demande de reconnaître.**

### 1.5 Le document se contre-lit avant d'être joué

Même règle que pour une vague de code (`CLAUDE.md`, « Avant de lancer une vague »), et elle rend
autant : sur le premier document, la contre-lecture a retiré **quatre affirmations plus larges que
ce que l'on savait**. Elles étaient toutes de la même famille — un total présenté comme fixe alors
qu'il dépend des réponses, « la saison du jour » là où c'est celle du cycle, une valeur calculée de
tête, un décompte d'issues recopié de mémoire.

Ce sont les trois questions à se poser sur son propre texte : **qu'est-ce qui, là-dedans, est plus
affirmatif que ce que j'ai vérifié ? qu'est-ce qui dépend d'une réponse, d'une date ou d'un état que
je présente comme constant ? et qu'est-ce que j'ai recopié sans le rouvrir ?**

### 1.6 L'artefact : ce qu'il porte, et pourquoi chaque pièce est là

Dans l'ordre de la page. Aucune n'est décorative.

| Pièce | Ce qu'elle règle |
|---|---|
| **Barre collante** : compteurs (lignes consignées / écarts) + jauge | Une séance longue se joue en plusieurs fois ; sans compteur on ne sait pas si on a fini, et on croit avoir fini |
| **En-tête** : date de la séance, qui l'a jouée, la version attendue | Un constat sans version déployée n'est pas reproductible |
| **Encadré « précautions »** (en alerte, pas en gris) | Les deux ou trois conditions qui invalident toute la séance si on les rate. Elles se lisent **avant**, donc elles sont au-dessus et visuellement à part |
| **Encadré « comment consigner »** | Les deux règles de §1.3, à portée d'œil pendant qu'on coche |
| **Carte du profil** : le tableau des réponses, les chiffres mesurés, les attendus dérivés | §1.2. C'est la pièce qui rend la moitié des blocs jouables |
| **Pastilles de navigation** (un bloc = une pastille, qui se colore) | Une séance de cinquante lignes a besoin qu'on voie où on en est sans dérouler |
| **Blocs**, chacun avec son intro et son enjeu | L'intro dit ce que le bloc vient prouver, et ce qui est **irréversible** dedans |
| **Lignes** : référence, ce qu'on fait, ce qu'on attend, trois états | L'unité de consignation. La référence (`03.5`) est ce qu'on cite ensuite dans une issue |
| **Champ de note, qui s'ouvre sur « écart »** | Il ne se demande que quand il y a quelque chose à dire, et il porte son propre libellé : *ce qui a été vu, pas la cause* |
| **Pied : « ce que cette séance ne prouve pas »** | Sans lui, une séance verte se relit plus tard comme une preuve de ce qu'elle n'a jamais regardé |
| **Pied : « où atterrissent les constats »** | Un constat qui n'a pas de destination écrite se perd |
| **Sortie : le compte-rendu** | §1.7 |

Deux règles de rendu qui tiennent le tout :

- **les lignes se génèrent depuis un tableau de données**, jamais écrites une à une en HTML : c'est
  ce qui garantit que la cinquantième ligne a exactement la forme de la première, et que le
  compte-rendu peut les parcourir ;
- **la page est complète au repos.** Pas d'accordéon qui cache des blocs : ce qu'on ne voit pas, on
  ne le joue pas.

### 1.7 Où vit l'état coché — base partagée, et jamais le stockage local seul

**Ce qui est coché dans l'artefact doit être lisible par l'agent, donc l'état vit dans une base
partagée.** Écrit le 17/09/2026, après l'avoir payé : la feuille de route du passage en public
gardait ses cases dans le `localStorage`, qui est **par navigateur et ne quitte jamais la machine de
qui coche**. La personne qui pilote avait coché les onze lignes d'une phase ; l'agent, qui ne les
voyait pas, en a redemandé deux — et a écrit dans un registre qu'elles restaient « à relire ». Le
stockage local n'est pas un mauvais choix par étourderie : c'est le choix par défaut, et il est
**juste pour ce qui n'intéresse que le lecteur** (l'onglet ouvert, un filtre, un brouillon).

D'où la règle, en deux moitiés :

- **l'avancement — une case, un état, un constat — va dans la base partagée de l'artefact**, parce
  que c'est exactement ce que les deux côtés doivent lire. C'est aussi ce qui rend le compte-rendu
  de §1.8 reproductible : l'agent peut le composer lui-même au lieu d'attendre un copier-coller ;
- **le confort de lecture reste local**, et rien d'autre.

Corollaire à ne pas manquer : dès qu'un artefact porte un avancement, **la question « qui a coché ? »
devient posable**, et la réponse doit rester distinguable d'une mesure. Un registre écrit *confirmé
par la personne qui pilote* là où l'agent n'a pas mesuré lui-même — la §6.1 de
`docs/exploitation/depot-public.md` en est l'exemple.

**Et chaque accès au stockage, local comme partagé, reste gardé** (`try`/`catch`) : la page doit se
rendre correctement quand il lève ou revient vide.

**Deux pièges de la base partagée, payés le 17/09/2026 en la branchant** — ils n'ont rien de
propre aux recettes, et le second n'a été trouvé qu'en contre-lisant le correctif du premier :

- **un instantané et son corps sont GELÉS.** Les brancher directement sur l'état de la page rend
  toute modification **silencieusement inopérante** : la carte s'allume une fraction de seconde,
  l'écriture repart avec l'état inchangé, l'instantané suivant remet l'affichage comme avant. Vu de
  l'écran, « le bouton ne fait rien », et aucune erreur n'apparaît. L'état de la page se **copie**
  depuis l'instantané, toujours ;
- **une coche s'écrit tout de suite, seule la frappe se regroupe.** Une temporisation posée pour la
  saisie d'une note s'appliquait aussi au clic : fermer l'onglet dans la seconde perdait la coche.
  Un geste ponctuel et une frappe continue n'ont pas la même cadence d'écriture, et les confondre
  fabrique exactement la perte que la base partagée devait supprimer.

**Le piège, et il est propre aux recettes :** une recette de premier parcours se joue en **fenêtre
privée** — c'est même sa première précaution. Or fermer toutes les fenêtres privées efface le
stockage. D'où la consigne, à écrire dans l'artefact lui-même : **la feuille reste dans une fenêtre
normale, le produit se teste dans la privée à côté.** Deux stockages, deux fenêtres, et l'un ne
tombe pas avec l'autre.

**La base partagée désarme ce piège en plus de rendre l'état lisible**, et c'est la deuxième raison
de la règle ci-dessus : un avancement qui vit côté serveur survit à la fermeture de toutes les
fenêtres, privées comprises. La consigne des deux fenêtres reste écrite dans l'artefact — elle
protège le **produit** d'un état local, pas la feuille.

### 1.8 Le compte-rendu sort en markdown, écarts d'abord

La séance se termine par un bouton qui **écrit le compte-rendu** et un qui le **copie**. Il se colle
dans la conversation, et c'est de là que partent les issues. Sa forme :

1. l'en-tête — date, qui, cible et version, puis *N lignes consignées sur M, dont K écarts* ;
2. **les écarts d'abord**, chacun avec sa référence, ce qui était attendu et ce qui a été vu ;
3. **puis toutes les lignes**, bloc par bloc, avec leur état — et les muettes marquées comme telles ;
4. une dernière ligne qui répète que muette ≠ conforme.

L'ordre n'est pas cosmétique : ce qu'on lit en premier est ce sur quoi on agit. Et le pavé complet
reste dessous, parce que c'est lui qui dit ce qui **n'a pas** été regardé.

---

## 2. Propre à Ramille

### 2.1 La forme visuelle : les jetons du produit, pas une identité de plus

L'artefact prend la palette et la typo de Ramille — c'est ce qui le fait lire comme une pièce du
produit et non comme un outil générique.

- **Couleurs** : les jetons de `src/constants/theme.ts`, recopiés en variables CSS. Clair —
  `#131612` l'encre, `#FFFFFF` le fond, `#F3F8F4` le teinté, `#E4EFE8` le sélectionné, `#1F6F4A`
  l'accent, `#14563A` l'accent-texte, `#A9C8B6` l'accent atténué, `#DDE0D9` la bordure, `#C99A6B`
  le chaud. Sombre — le bloc `Colors.dark` du même fichier. **Les deux thèmes se déclarent**, même
  si le produit est en clair seul : un artefact se lit dans le thème de qui l'ouvre.
- **Une couleur d'alerte en plus, et c'est assumé** : le produit n'a pas de rouge — il n'en a jamais
  eu besoin, il ne gronde personne. Une feuille de recette, si : un écart doit se voir. `#9C3B2E`
  en clair, `#E9A196` en sombre. C'est le seul ajout à la palette, et il ne remonte pas dans le
  produit.
- **Typo** : `Spline Sans` (la police du produit) et `Spline Sans Mono` pour les références de ligne,
  les chiffres et les libellés cités — toutes deux chez Google Fonts, seul hébergeur de polices
  qu'un artefact peut atteindre.
- **Les libellés de l'écran se citent en `<q>` sur fond teinté**, en mono : la personne cherche une
  chaîne exacte, elle doit la reconnaître du premier coup d'œil et ne pas la confondre avec la
  prose du document.

### 2.2 Le bloc 00 est toujours le même : `/status`, puis la version

Trente secondes qui évitent de jouer une séance entière contre une base muette. `www.ramille.fr/status`
écrit « OK — N modes de transport en base » ; autre chose, on arrête, et le défaut est côté
configuration. Puis **noter la version déployée** : le site suit `main`, donc c'est le dernier commit
fusionné, et un constat sans version n'est pas reproductible. Enfin, ouvrir la fenêtre privée.

### 2.3 C'est la production, et il faut le dire

Il n'y a pas d'environnement de recette. Un bilan soumis est un vrai bilan, sur un vrai compte
anonyme, qui comptera dans les chiffres d'usage — la purge ferme les sessions anonymes après 90
jours d'inactivité, donc rien n'est à nettoyer, mais rien n'est fictif non plus. **Ne jamais saisir
une adresse email réelle dont on ne veut pas qu'elle reçoive quelque chose**, et ne jamais déclencher
un envoi de rappel depuis une séance.

### 2.4 Où atterrissent les constats

Dans `docs/architecture/v1-13-audit-et-chantiers.md` : **une section par séance**, sur le modèle des
§12 (recette du 14/09/2026) et §13 (recette web du 16/09/2026) — ce que la séance a trouvé, **une
issue par constat**, et l'accrochage à une vague. Et les lignes de la §11 (sur appareil) ou de la
§11.W (au navigateur) qui ont été jouées le disent **en tête de leur case** : une ligne muette n'a
pas été jouée, y compris quand le bloc qui la portait est revenu conforme sur autre chose.

Un constat n'est pas toujours un correctif : deux des sept constats du 16/09/2026 sont partis en
**brief de design**, parce qu'ils demandaient un arbitrage produit et non un patch. C'est une
destination légitime, et elle se note comme telle.

### 2.5 Ce qui existe déjà

| Séance | Document (la mémoire) | Artefact (l'outil) |
|---|---|---|
| Le premier parcours — lot 5, C5.1 à C5.8 | `docs/recette/premier-parcours-web.md` | https://claude.ai/artifact/SKNjEeZLdRpxPPEJULNQ6y |

**L'artefact du premier parcours a été régénéré le 20/09/2026**, et c'est la première fois que la
règle de §1.7 y est tenue : sa version d'origine gardait l'avancement dans le `localStorage`, c'est-à-dire
là où l'agent ne le lit pas — exactement le défaut que §1.7 venait de consigner, reproduit le jour même
dans l'artefact qui l'illustrait. Il porte désormais la base partagée (capacité `db`, un document
`recette/premier-parcours`), le repli local **dit** qu'il est un repli (une pastille dans l'en-tête), et
la page se rend entière avant que la base ne réponde. Deux règles de §1.7 sont écrites dans son code, en
commentaire, parce qu'elles se réintroduisent toutes seules : l'état se **copie** depuis l'instantané, et
une coche s'écrit tout de suite là où seule la frappe se regroupe.

Les deux séances antérieures n'ont pas de document : celle du 14/09/2026 (sur appareil) vit dans la
§12 de `v1-13`, celle du 16/09/2026 (web) dans sa §13. Elles ne se reconstituent pas — c'est
exactement ce que ce format existe pour ne plus reproduire.
