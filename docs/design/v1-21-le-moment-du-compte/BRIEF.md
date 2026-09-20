# Brief pour Claude Design — le moment du compte, et le lien qui ne voyage plus

Écrit le 20/09/2026, au soir de la revue de sécurité qui précède l'ouverture au public
([`v1-27`](../../architecture/v1-27-dette-technique.md) §12.9 et §12.10). Deux choses se sont
rejointes le même jour : un doute produit qui traînait — **est-ce qu'on demande le compte au bon
moment ?** — et une contrainte de sécurité neuve, décidée le jour même, qui change ce qu'un lien
de connexion peut faire.

**Ce brief demande l'UX autant que l'UI**, comme celui du moment anniversaire : ce n'est pas
« dessine un écran de connexion », c'est **où le compte se propose dans le parcours, avec quels
mots, ce qui se passe quand on refuse, et comment on revient**.

## 1. Ce qu'on demande

1. **Où le compte se propose-t-il, et à quel prix pour qui n'en veut pas ?** Aujourd'hui la
   proposition vit à un seul endroit : la restitution du bilan. On n'a jamais vérifié que c'est le
   bon moment — c'est juste le premier qu'on a trouvé.
2. **Comment dire « ton lien s'ouvre ici, pas ailleurs » sans faire peur ni faire un cours ?**
   C'est la contrainte du §3, et c'est la question la plus difficile du brief.
3. **Un code à six chiffres change-t-il la réponse ?** Il est possible techniquement (§3.2,
   mesuré). Il coûte une saisie ; il rend le parcours insensible à l'appareil. À trancher, et la
   réponse décide de la forme de l'écran.
4. **Et ce qu'on montre à quelqu'un dont l'adresse est déjà prise.** C'est un moment fréquent et
   raté aujourd'hui : on lui dit « cette adresse a déjà un compte », ce qui est vrai, utile — et
   c'est aussi une réponse qui renseigne un inconnu sur qui utilise Ramille (§4.3).

## 2. Ce qui existe, et qu'il ne faut pas redessiner en double

**Le modèle est inhabituel et il faut le tenir en tête pour tout le reste : tout le monde a déjà
un compte.** Chaque visiteur reçoit une session anonyme dès l'ouverture de l'app, et son bilan
vit en base, protégé, avant qu'il n'ait donné quoi que ce soit. « Créer un compte » ne crée donc
rien : ça **rattache une adresse** à ce qui existe déjà. Tout le vocabulaire du produit en
dépend — et la promesse « tu ne perds pas ton bilan » est littéralement vraie.

| Surface | Où | Ce qu'elle fait |
| --- | --- | --- |
| L'interstitiel | Restitution du bilan, plein écran | Premier passage seulement |
| La bannière | Restitution, discrète | Passages suivants, une fois l'interstitiel vu |
| `/connexion` | Détour | « Continuer avec Google », et le renvoi vers l'e-mail |
| `/connexion/email` | Détour | Saisie d'adresse, envoi du lien de confirmation |
| `/connexion/retrouver` | Détour | **Le seul chemin vers un compte existant** — huit portes |
| L'écran de collision | Avant le formulaire | Quand l'appareil porte déjà un bilan anonyme |
| « Toi » | Icône de compte | La porte permanente, hors onglets |

Trois faits mesurés qui cadrent la discussion :

- **La proposition est une dérivation et non un ternaire** (`etatDeLaProposition`) : elle attend
  que la session soit lisible plutôt que de parier. Un état `inconnu` n'ouvre rien — on ne
  propose pas un compte à quelqu'un dont on ne sait pas encore s'il en a un.
- **Les provenances sont comptées** (`SOURCES_CONNEXION` : la transition imposée après le bilan,
  le bouton délibéré, et « Toi »). Ce qu'on redessine sera mesurable au même endroit.
- **`connexion_demande` et `connexion_success` ne sont pas le même fait** : l'écart entre les
  deux **est** le taux d'adresses jamais confirmées. Toute forme nouvelle doit rester lisible
  dans cette paire, sinon on perd le seul chiffre qui dit si le moment choisi fonctionne.

## 3. La contrainte neuve, et c'est le cœur du brief

### 3.1 Un lien de connexion ne s'ouvre plus que là où il a été demandé

Depuis le 20/09/2026 le flux est en **PKCE** : le lien reçu par e-mail ne porte plus qu'un code,
qui ne vaut rien sans un secret resté dans le navigateur — ou l'app — **qui a demandé le lien**.
Décidé après avoir trouvé, en production, quatre entrées de configuration qui permettaient à un
tiers de recevoir la session de quelqu'un d'autre en lui faisant cliquer un lien parfaitement
authentique. Mesuré avant et après : en implicite la session de la victime devenait celle de
l'attaquant, en PKCE elle ne bouge pas.

**Ce que ça coûte, et c'est un problème d'UX et non de technique** : ouvrir le lien depuis une
messagerie qui lance un autre navigateur ne marche plus. Le produit dit déjà « on t'envoie un
lien qui te reconnecte **ici, sur cet appareil** » — c'est maintenant vrai, et ça ne suffit
probablement pas. Le cas d'échec a son propre message (« ce lien doit s'ouvrir là où tu l'as
demandé »), mais un message d'échec est une rustine : **la vraie question est comment le parcours
évite d'y arriver.**

Le scénario à garder en tête : quelqu'un fait son bilan sur un ordinateur, donne son adresse,
ouvre ses e-mails **sur son téléphone**, clique. Aujourd'hui il échoue.

### 3.2 Le code à six chiffres existe, et il traverse les appareils

**Mesuré le 20/09/2026, pas supposé.** Le même e-mail peut porter, en plus du lien, un code à six
chiffres. Vérifié de bout en bout : avec un défi PKCE actif, le code ouvre **quand même** une
session, sans le secret local — donc il marche depuis n'importe quel appareil.

Ce que ça ouvre comme design : un écran qui affiche « on t'a envoyé un code », un champ de six
cases, et le lien reste dans l'e-mail pour qui est déjà au bon endroit. Le coût est une saisie et
un écran de plus ; le gain est que le scénario ordinateur → téléphone cesse d'échouer.

**Ce que ça ne rouvre pas, et il faut le dire parce que la question se posera** : le code ne
ramène pas la faille que PKCE ferme. Pour s'en servir il faut **lire la boîte e-mail de la
personne** ; le lien, lui, suffisait à être cliqué. Et le code est tapé par la personne dans notre
app, il n'est jamais remis à une adresse choisie par quelqu'un d'autre.

### 3.3 Une adresse peut être posée par quelqu'un d'autre

Défaut connu, non corrigé, et qui touche directement l'écran à dessiner. N'importe qui peut
saisir **l'adresse d'un tiers** sur sa propre session anonyme. Le tiers reçoit un vrai e-mail de
Ramille ; s'il clique, son adresse est confirmée sur le compte de l'autre — qui en garde l'accès.

Les parades sont toutes des choix d'UX, d'où leur place ici : un geste de plus avant qu'une
session anonyme puisse revendiquer une adresse, une reconfirmation à la reconnexion, ou une
formulation de l'e-mail qui rende l'anomalie visible à qui le reçoit sans l'avoir demandé.
**C'est une question à trancher dans ce brief, pas après.**

## 4. Ce qui ne se discute pas

1. **Rattacher, jamais recréer.** Se connecter convertit la session anonyme en gardant le même
   identifiant. Un écran qui donnerait l'impression de « repartir à zéro » serait faux, et un
   parcours qui créerait un second compte perdrait le bilan.
2. **Il n'y a pas de mot de passe**, et il n'y en aura pas. Pas de champ, pas de « mot de passe
   oublié », pas de force de mot de passe à afficher.
3. **La non-divulgation est un garde-fou, pas une préférence.** Une adresse inconnue doit arriver
   au **même** écran qu'un envoi réussi : sinon l'écran devient un moyen de savoir qui utilise
   Ramille. La tension avec « cette adresse a déjà un compte » du §1.4 est réelle et assumée —
   les deux écrans n'ont pas le même point de départ — mais toute nouvelle formulation doit être
   relue sous cet angle.
4. **V1 = Google Play uniquement.** Pas d'App Store, donc pas de « Se connecter avec Apple ».
   Google et e-mail, c'est tout.
5. **Rien n'est obligatoire.** Le produit n'a aucune porte fermée : quelqu'un peut faire son
   bilan, suivre son plan et répondre à ses points **sans jamais donner d'adresse**. Ce qu'il perd
   est le changement d'appareil et les rappels par e-mail. Le compte se propose, il ne se réclame
   pas.
6. **Tout est en français**, et Ramille ne dit jamais de nombre ni d'injonction — ni « tu
   devrais », ni « il faut ». La voix produit peut énoncer un fait ; elle, non.
7. **La page web de suppression doit rester atteignable sans l'app** (exigence Play), et elle
   emprunte le même envoi de lien. Ce qui est décidé ici la concerne aussi : c'est le cas le plus
   dur, puisque la personne arrive dans un navigateur neuf, par définition.

## 5. Ce qu'on aimerait recevoir

Dans l'ordre d'utilité :

1. **Une carte du moment** : où la proposition apparaît dans le parcours, combien de fois, ce
   qu'elle devient quand on la refuse, et par où l'on revient. C'est la partie qui manque
   aujourd'hui — le reste est du dessin.
2. **Le parcours de reconnexion de bout en bout**, avec le choix lien / code tranché et défendu,
   et l'état d'échec traité comme un cas normal et non comme une panne.
3. **Les mots.** Ce sont eux qui portent tout ici : « créer un compte » est faux, « se connecter »
   est trompeur quand on n'a jamais rien créé, et « on t'envoie un lien » promet un envoi que la
   non-divulgation interdit d'affirmer.
4. **Le cas de l'adresse déjà prise**, et une proposition sur le §3.3.

Ce qui existe comme matériau : le système de design du projet, les écrans actuels de
`/connexion/*`, et la mascotte — dont il faut se rappeler qu'elle **ne compte jamais** et ne donne
jamais de consigne.
