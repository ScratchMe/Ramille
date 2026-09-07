# Brief pour Claude Design — les rappels : notification, email, ou rien

Increment **v1-12**, chantier E du plan v1-10. Écrit le 07/09/2026, avant la session, pour que
le canvas parte de ce qui existe et de ce qui est déjà tranché — pas d'une page blanche.

## 1. Ce qu'on demande

Dessiner **le moment où Ramille explique comment le suivi va se passer, et demande la
permission de prévenir** — puis tout ce que ce moment engage : la carte d'attente sur le
plan, le rappel lui-même, le retour dans l'app, et le réglage sur « Toi ».

Ce n'est pas « ajouter les notifications push ». Le push est le tuyau. Ce qu'on dessine,
c'est la promesse d'accompagnement rendue visible au seul instant où elle a un sens : juste
après que la personne s'est engagée sur une action.

Le retour d'appareil qui a ouvert le sujet, mot pour mot :

> « L'encart "Rien à rattraper" n'est pas très compréhensible la première fois qu'on le
> voit. Après s'être engagé sur une action, c'est là qu'on devrait parler de comment le suivi
> va se faire et de comment on va le notifier — ça me semble le bon moment pour demander
> cette autorisation, quand il sait à quoi ça sert. »

## 2. Ce qui existe déjà — le canvas ne le redessine pas

**La boucle.** Deux boucles indépendantes, générées côté serveur, jamais par le client :
un point **hebdomadaire** sur le trajet domicile-travail (créé le lundi à 6 h UTC), un point
**mensuel** sur les extras — loisirs ou voyages (créé le 1er du mois à 6 h UTC). Un point,
c'est **une seule question fermée** : « as-tu changé de mode de transport au moins une fois
cette semaine / ce mois-ci pour {trajet} ? », réponse Oui / Non. Pas de streak, pas de série,
pas de score ; un point sans réponse expire et n'est jamais relu (`v1-02`, spec §7).

**L'engagement.** Sur le plan, la personne choisit une action et y attache une intention
obligatoire : des **jours de la semaine** pour le domicile-travail (« le mardi et le
jeudi »), une **échéance fermée** pour les autres postes (« ce mois-ci », « le mois
prochain », « à ma prochaine occasion »). Le bouton s'appelle « Je m'y engage », la
confirmation « C'est noté ». Une seule action engagée par saison ; « Changer d'avis » la
libère sans que rien ne le compte contre soi (`action-commitment.tsx`, `action-card.tsx`).

**Le plan quand il n'y a rien à répondre.** Une carte en tête, avec la mascotte en
`resting` : « Rien à rattraper. » / « Tes points de suivi arrivent d'eux-mêmes, à leur
rythme. » (`RAMILLE.periodeCalme`, canvas v1-11 flux 6). C'est cette carte que le retour
d'appareil juge incompréhensible la première fois.

**Le rappel par email, qui marche.** Une ligne par point dans une boîte d'envoi,
`unique(checkin_id)` : un point, un message, jamais deux, quel que soit le nombre de passages
du cron (`v1-07` §3.1). Éligibilité : compte rattaché, email confirmé, rappels non
désactivés. Envoyé le matin, étalé sur cinq jours pour lisser le pic du lundi. Texte actuel,
signé :

> Objet : *Ton point de la semaine* (ou *du mois*)
> Bonjour, / Une seule question, comme d'habitude : as-tu changé de mode de transport au
> moins une fois cette semaine pour {trajet} ? / Réponds-moi en un geste : {lien vers le
> plan} / Si tu n'as rien changé, ce n'est pas grave — on se repose la question au prochain
> point. / — Ramille / Pour ne plus recevoir ces rappels, désactive-les depuis ton suivi
> dans l'app.

**Le réglage.** Sur « Toi » (`/compte`), un interrupteur « Rappels par email » — « Un mot à
chaque point de suivi, jamais plus. » — visible seulement quand un compte est rattaché. En
opt-out : le rappel n'est pas une promotion, c'est le mécanisme même de la brique 4.

**Le retour dans l'app.** Ouvrir le plan avec un point en attente le montre **en tête**
(flux 4 de v1-11) ; répondu, Ramille dit un mot (« Bien joué — chaque changement compte. » /
« Pas cette fois-ci. Rien d'obligatoire, on se repose la question au prochain point. ») et
le plan reprend sa forme.

## 3. Ce qui est déjà tranché — le canvas part de là

1. **Les deux canaux restent, la personne choisit l'un ou l'autre.** Notification par
   défaut si elle en a donné le droit ; email sinon ; et la possibilité de tout couper.
2. **La permission se demande après l'engagement**, pas au lancement, pas à la fin du
   bilan. Au moment où la personne vient de dire « le mardi et le jeudi », elle sait
   exactement à quoi servira le rappel.
3. **Ramille dit l'attente, pas le vide.** « Rien à rattraper » devient quelque chose
   comme : *je te laisse mener ton action, je reviens vers toi pour que tu me dises si tu
   l'as fait*. L'idée est fixée ; les mots sont à trouver, sous les règles du §4.
4. **Une session Claude Design d'abord**, parce qu'on va demander une permission — et une
   permission mal demandée sur Android ne se redemande pas (§6).

## 4. Les règles qui ne se discutent pas

**La voix de Ramille** (`src/constants/mascotte.ts`, gardée par un test) :
- première personne, court, tutoiement ;
- **jamais un nombre dans sa bouche** — donc jamais « dans 7 jours ». L'attente se dit en
  jours nommés : « lundi », « lundi prochain », « au début du mois prochain », « au prochain
  point ». Le rythme est fixe (lundi / 1er du mois), elle peut donc le nommer sans compter ;
- jamais « tu devrais », « il faut ». Une porte ouverte, jamais une injonction ;
- ses phrases vivent toutes dans `mascotte.ts` — le canvas propose les mots, le code les y
  rattache.

**La mascotte** : cinq expressions, aucune négative, on n'en ajoute pas. **Jamais à côté
d'un chiffre lourd.** Or les cartes d'action portent des kilos, et le cap de la saison aussi :
si le moment de la permission vit dans ou sous une carte d'action, c'est **le nom qui parle,
pas le visage**. Si le visage doit être là, il faut lui donner un espace sans aucun chiffre.

**Le registre** : factuel, jamais culpabilisant. Pas de série, pas de « tenu / pas tenu »,
pas de pastille rouge, pas de compteur de rappels manqués, pas d'urgence. Un rappel n'insiste
jamais : un point, un message, et c'est structurel.

**Pas de boîte système à nous.** Les échecs se disent dans la page (`MessageInline`, règle
ESLint). La seule boîte système du flux est **celle d'Android** pour la permission, et on ne
la dessine pas — on la note comme une étape (« → dialogue système »).

**Le vocabulaire visuel** est celui de `docs/design/v1-11-navigation/Systeme.dc.html` et du
code : Spline Sans, accent `#1F6F4A`, bouton 54 / rayon 27, champ 56 / rayon 16, carte 18,
puces 8, échelle 4/8/16/24/32. Rien n'est arrondi à une grille, rien n'est inventé.

## 5. Ce que le canvas doit montrer

Au format téléphone (390 × 844), en français, avec les composants réels.

**A. Le moment** — juste après « C'est noté ». C'est l'écran qui compte ; deux ou trois
directions sont bienvenues, chacune avec son prix :
- *en place*, sous la carte d'action qui vient d'être engagée — dans le contexte, mais au
  milieu des kilos, donc sans visage ;
- *en feuille* qui monte après la confirmation — un espace à elle, le visage possible, une
  cérémonie assumée pour la première fois ;
- *fondu dans la carte d'attente* — une seule ligne et une seule action, la demande est la
  carte elle-même.

Dans les trois, le contenu est le même : ce qui va se passer (« je reviens vers toi lundi »),
le choix du canal, et la porte vers le dialogue système **seulement si la personne a dit
oui** (§6 explique pourquoi cette étape intermédiaire n'est pas un luxe).

**B. La carte d'attente** — ce qui remplace « Rien à rattraper » sur le plan, en trois
états : rappel par notification, rappel par email, aucun rappel. Le troisième n'est pas
une punition : Ramille revient *ici*, sur le plan, de toute façon — « on se retrouve ici
lundi ».

**C. Le rappel** — le texte de la notification (titre + une ligne), et l'email existant
pour comparaison. Contenu seulement, sous forme schématique : pas de volet Android dessiné.

**D. Le retour** — appuyer sur la notification ouvre le plan, point en tête. Flux 4 de
v1-11 existe déjà ; le canvas le cite, il ne le redessine pas.

**E. Le réglage sur « Toi »** — le choix à trois : notification / email / aucun. Avec les
états d'indisponibilité, et surtout **pourquoi** : « Email — rattache un compte pour
l'activer » ; « Notification — autorise-les dans les réglages du téléphone » (le cas où le
dialogue a été refusé, §6) ; sur web, notification absente sans explication à donner.

**F. Le refus** — la personne dit non au dialogue système. Elle retombe sur l'email si
elle a un compte, sur rien sinon, et la carte d'attente le dit sans reproche. Cet écran-là
est celui qu'on oublie et qu'il ne faut pas oublier.

## 6. Ce que la technique impose au dessin

- **Sur Android 13 et plus, la permission de notifier est un vrai dialogue système**, et
  **après deux refus, il ne s'affiche plus jamais** — il faut passer par les réglages du
  téléphone. C'est pour ça que la demande se fait en deux temps : notre écran d'abord, le
  dialogue système seulement si la personne a dit oui. Un « non » chez nous ne coûte rien ;
  un « non » au système est presque définitif. Sur Android 12 et avant, il n'y a pas de
  dialogue : la permission est acquise, notre écran sert alors à dire ce qui va se passer.
- **Le push n'a pas besoin de compte.** Un jeton d'appareil suffit. C'est le renversement
  le plus important : aujourd'hui seul un compte rattaché reçoit un rappel ; demain une
  session anonyme le peut. Le réglage sur « Toi » ne peut donc plus être réservé aux comptes
  rattachés.
- **Un jeton meurt avec l'app** (désinstallation = plus aucun contact), **un email survit**.
  C'est ce qui justifie de garder l'email et de le proposer au moment du choix.
- **Le web n'a pas de push** en V1 (Google Play seulement ; le web est la surface publique,
  pas la surface d'usage). Sur web, le réglage ne montre que l'email.
- **Un point, un message, quel que soit le canal.** La boîte d'envoi garantit déjà l'unicité
  par point ; le canal en devient une colonne. Jamais un push *et* un email pour le même
  point.
- **Le push arrive le matin où la question s'ouvre** (le lundi, le 1er), à une heure
  raisonnable en France — pas étalé sur cinq jours comme l'email, qui l'est pour ménager le
  prestataire d'envoi. Ramille peut donc dire « lundi » et tenir parole.
- **Une décision de permission se prend une fois.** Après un refus, on ne redemande pas
  au prochain engagement : on montre le chemin vers les réglages, depuis « Toi ».

## 7. Ce qu'on ne veut pas voir

Une demande de permission au lancement. Un rappel quotidien, ou un second rappel « au cas
où ». Une pastille, un compteur, une série. Un visage de Ramille à côté d'un chiffre. Un
« tu devrais ». Un dialogue Android dessiné. Une case à cocher « recevoir des nouvelles ».
Une carte d'attente qui se lit comme une attente déçue.

## 8. Livrable attendu

Un canvas au format des précédents (`docs/design/v1-10-*`, `v1-11-*`) : les écrans du §5,
les directions pour le moment A côte à côte avec leur prix, et le vocabulaire relevé du code.
Prototype cliquable de préférence pour le moment A et la carte B — le sentiment de
« on m'explique, puis on me demande » ne se voit pas sur une image fixe. Les sources
rejoindront ce dossier avec un README, comme pour les deux canvas précédents.
