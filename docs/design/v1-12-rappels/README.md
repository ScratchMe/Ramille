# Canvas — rappels et notifications

Sources du canvas publié le 07/09/2026, chantier E du plan v1-10, après le retour d'appareil
sur l'encart « Rien à rattraper ». Le brief remis avant la session est `BRIEF.md` ; le document
d'implémentation qui en découle est `docs/architecture/v1-12-rappels.md`.

Artifact : https://claude.ai/code/artifact/bcbb0ef9-e483-4746-94f5-b74bc80412b5

## Pourquoi ce canvas existe

Le retour d'appareil du 07/09, mot pour mot :

> « L'encart "Rien à rattraper" n'est pas très compréhensible la première fois qu'on le
> voit. Après s'être engagé sur une action, c'est là qu'on devrait parler de comment le suivi
> va se faire et de comment on va le notifier — ça me semble le bon moment pour demander
> cette autorisation, quand il sait à quoi ça sert. »

Ce n'est pas « ajouter les notifications push ». Le push est le tuyau. Ce qui manquait, c'est
la promesse d'accompagnement rendue visible au seul instant où elle a un sens — juste après
que la personne a dit « le mardi et le jeudi » — et une carte d'attente qui dise l'attente
plutôt que le vide.

Et une permission se dessine avant de se coder : sur Android 13 et plus, la permission de
notifier est un dialogue système qui **ne s'affiche plus jamais après deux refus**. Une
demande mal placée coûte le canal pour de bon. D'où la session Claude Design d'abord, décidée
le 07/09.

## Ce que le canvas contient

Cinq pages, sept planches au format téléphone (390 × 844) sauf les deux planches de
comparaison. Les trois directions du moment sont côte à côte sur la première page, chacune
avec son prix en annotation ; la feuille (B) est **cliquable de bout en bout**.

| Page | Artboard | Rôle |
| --- | --- | --- |
| Le moment | `Main.dc.html` | **B — la feuille**, cliquable : « C'est noté » → choix du canal → dialogue système (noté, pas dessiné) → carte d'attente. Deux réglages en tête : `boucle` (hebdo / mensuel), `compte` (rattaché ou non) |
| Le moment | `MomentEnPlace.dc.html` | A — en place, sous la carte d'action engagée |
| Le moment | `MomentFondu.dc.html` | C — fondu dans la carte d'attente |
| Attente | `Attente.dc.html` | la carte qui remplace « Rien à rattraper », quatre états (`canal` : notification / email / aucun / refus ; `boucle`) |
| Rappel | `Rappel.dc.html` | la notification et l'email existant, contenu seulement ; le retour dans l'app renvoie au flux 4 de v1-11 |
| Réglage | `Toi.dc.html` | le réglage à trois sur « Toi », quatre situations (`situation` : compte / anonyme / refus / web) |
| Refus | `Refus.dc.html` | le refus en trois temps, sans compte rattaché |

Les valeurs viennent du code réel : `src/constants/theme.ts`, `bande-haute.tsx` (52 px, le nom
au centre, l'icône compte à droite), `plan/action-card.tsx` (bordure accent 2 px, fond teinté,
étiquette « TU T'Y ES ENGAGÉ »), `plan/action-commitment.tsx` (« Quels jours ? », « Annuler »,
« C'est noté »), `checkin-card.tsx`, `mascotte.ts`. Spline Sans, accent `#1F6F4A`, bouton 54 /
rayon 27, carte 18, échelle 4/8/16/24/32. Rien n'est arrondi à une grille. Comme pour v1-11,
les planches sont **générées par `build.mjs`** (`node build.mjs` les réécrit toutes) pour que
les sept restent cohérentes entre elles — c'est le fichier à modifier, jamais un `.dc.html`
à la main.

## La direction retenue : B, la feuille

Une feuille qui monte après « C'est noté », avec le visage de Ramille, une phrase qui dit ce
qui va se passer, la question « Comment tu préfères que je te fasse signe ? », trois lignes à
choisir, un bouton, et une ligne de sortie « Tu pourras changer d'avis dans « Toi » ».

Pourquoi elle plutôt que les deux autres :

- **Un espace sans aucun chiffre, donc le visage est possible.** Les cartes d'action portent
  des kilos, le cap aussi ; en place (A), Ramille aurait été au milieu des kilos — donc sans
  visage, avec le seul nom pour parler — et la carte engagée devenait très haute. En fondu
  (C), l'explication tenait en une ligne et le choix se cachait derrière deux liens.
- **On explique, puis on demande.** Dans les trois directions, le contenu est le même ; seule
  la feuille laisse la place de dire ce qui va se passer *avant* de demander quoi que ce soit.
  C'est ce que le retour d'appareil demandait, et c'est ce qui rend le « oui » au dialogue
  système probable.
- **Le bouton annonce le dialogue.** « Autoriser les notifications » quand la ligne
  notification est choisie : la personne sait qu'une boîte du téléphone va s'ouvrir. « C'est
  bon » pour l'email, « Continuer sans rappel » pour rien — trois libellés, un seul bouton.
- **Une cérémonie assumée, une seule fois.** La feuille ne revient pas à chaque engagement ;
  après, c'est « Toi » qui porte le réglage.

Son prix : un composant qui n'existe pas encore dans l'app (aucune feuille, aucun `Modal`),
et un moment de plus entre « C'est noté » et le plan — accepté, parce qu'il n'arrive qu'une
fois.

## Les mots de Ramille

Le canvas propose les mots ; le code les rattache à `src/constants/mascotte.ts`, sous les
trois règles gardées par son test (première personne et tutoiement, **jamais un nombre**,
jamais d'injonction). Le rythme est fixe — lundi, le 1er du mois — donc elle peut le nommer
sans compter :

| Moment | Boucle hebdo | Boucle mensuelle |
| --- | --- | --- |
| La feuille | « Je te laisse mener ton action. Lundi, je reviens te demander si tu l'as faite. » | « … Au début du mois prochain, je reviens te demander si tu l'as faite. » |
| La question | « Comment tu préfères que je te fasse signe ? » | idem |
| Attente, rappel prévu | « Je te fais signe lundi. » | « Je te fais signe au début du mois prochain. » |
| Attente, sans rappel | « On se retrouve ici lundi. » | « On se retrouve ici au début du mois prochain. » |

Ce qui accompagne ces phrases est **du produit, pas d'elle** : « Par notification sur ce
téléphone. », « Par email, à camille@exemple.fr. », « Les notifications sont coupées sur ce
téléphone. Tu peux les rouvrir dans ses réglages, ou rattacher un compte pour l'email. » Une
adresse peut contenir un chiffre ; elle ne passe donc jamais par sa bouche.

**« Rien à rattraper » disparaît.** C'est la seule réplique issue d'une maquette validée
(canvas v1-08) qui soit réécrite, et elle l'est sur un retour d'usage explicite : la phrase
se lisait comme une attente déçue la première fois qu'on la voyait. Ramille dit désormais
l'attente, et elle revient *dans l'app* de toute façon — « on se retrouve ici lundi » n'est
pas une punition pour qui a refusé le rappel.

## Ce que la technique a imposé au dessin

- **La demande en deux temps.** Notre écran d'abord, le dialogue système seulement si la
  personne a choisi la notification. Un « non » chez nous ne coûte rien ; un « non » au
  système est presque définitif. Sur Android 12 et avant, il n'y a pas de dialogue : la
  feuille sert alors à dire ce qui va se passer.
- **Le push n'a pas besoin de compte.** Un jeton d'appareil suffit — le réglage sur « Toi »
  s'ouvre donc à tout le monde, sessions anonymes comprises, là où l'interrupteur actuel
  n'apparaissait qu'avec un compte rattaché.
- **Un jeton meurt avec l'app, un email survit.** C'est ce qui justifie de garder l'email et
  de le proposer au moment du choix, avec sa condition dite en clair : « Rattache un compte
  pour l'activer ».
- **Le web n'a pas de push** en V1. Sur web, le réglage ne montre que l'email, sans
  explication à donner.
- **Un point, un message, quel que soit le canal.** La boîte d'envoi garantit déjà l'unicité
  par point ; le canal en devient une colonne. Jamais un push *et* un email pour le même
  point.
- **Le push arrive le matin où la question s'ouvre.** Pas étalé sur cinq jours comme
  l'email (qui l'est pour ménager le prestataire) : Ramille peut dire « lundi » et tenir
  parole.
- **Une décision de permission se prend une fois.** Après un refus, on ne redemande pas au
  prochain engagement : la carte d'attente nomme les deux portes — les réglages du téléphone,
  ou un compte pour l'email — une fois, sans insister, et « Toi » garde le chemin.

## Ce qui a été écarté

- **Demander au lancement, ou à la fin du bilan** — la personne ne sait pas encore à quoi ça
  sert.
- **A — en place** et **C — fondu**, pour les raisons ci-dessus ; les deux restent sur le
  canvas, pour mémoire.
- **Redemander à chaque engagement.** Deux refus au système ferment le canal pour de bon ;
  une demande par appareil, puis le réglage.
- **Dessiner le dialogue Android.** Son texte et son apparence sont ceux du téléphone ; on le
  note comme une étape.
- **Un rappel quotidien, un second rappel « au cas où », une pastille, un compteur, une
  série.** Le registre ne change pas : un point, un message, jamais une relance.

## Ce que le canvas ne fait pas

Il ne propose **aucune nouvelle couleur** et une seule valeur qui n'existe pas dans `Radius` :
les deux coins hauts de la feuille, à 24 — à rabattre sur le rayon de carte (18) ou à nommer au
moment de l'implémentation, pas à recopier en dur. Tout le reste reprend les hauteurs de
contrôle et les rayons existants. Il ne touche pas aux partis pris acquis : cinq
expressions et pas une de plus (le visage de la feuille est `calm`, celui de l'attente
`resting`), aucun chiffre dans la bouche de Ramille, aucune mécanique d'échec, et la mascotte
jamais à côté d'un chiffre lourd — la carte d'attente reste posée **au-dessus** du cap, comme
l'encart qu'elle remplace, ce que v1-11 §8 demande déjà de vérifier sur appareil.
