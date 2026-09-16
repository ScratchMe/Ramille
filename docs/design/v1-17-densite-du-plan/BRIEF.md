# Brief pour Claude Design — la densité du plan, et le tout premier parcours

Écrit le 16/09/2026, au lendemain de la recette web
(`docs/architecture/v1-13-audit-et-chantiers.md` §13, constat 13.3, issue
[#198](https://github.com/ScratchMe/TraceVerte/issues/198)).

Ce brief ne demande pas de corriger un défaut. Il demande de **trancher une contradiction que le
produit s'est créée à lui-même**, en deux décisions justes séparément. C'est pourquoi il part en
design plutôt qu'en chantier : le remède qu'on choisirait au clavier serait un pansement sur le
symptôme le plus visible, et laisserait la cause intacte.

## 1. Ce qu'on demande

Deux questions, dans cet ordre. La première est un arbitrage, la seconde est un dessin.

1. **Que met-on en avant dans un plan, quand le meilleur levier n'est pas sur le poste dominant ?**
2. **Que voit quelqu'un à son tout premier plan, par opposition à quelqu'un qui revient ?**

Elles tiennent ensemble : répondre à la première change ce qu'il y a sur le premier écran, donc
change ce que la seconde a à dessiner. Les traiter l'une après l'autre reviendrait à arbitrer deux
fois.

## 2. La contradiction, en une page

Le plan affiche les actions sur **trois rangs** (C4.6, `v1-16` §5) : deux cartes pleines, deux
cartes estompées derrière « Voir d'autres pistes · N », puis des lignes simples qui s'ouvrent en
carte au toucher. La règle qui fonde ce découpage est écrite :

> « Au-delà de quatre cartes pleines, ce n'est plus un choix qu'on présente, c'est un catalogue. »

Le classement, lui, vient du serveur : **poste dominant d'abord, puis gain décroissant.** Sa raison
est tout aussi bonne — le **cap** de la saison est calculé sur le poste dominant, donc le plan
parle d'abord de ce poste-là.

**Sur un profil réel de la recette**, les deux règles se contredisent. Poste dominant : les
voyages. Cap : 451 kg/an. Onze actions.

| rang | poste | action | gain | rendu |
|---|---|---|---|---|
| 1 | voyages | Renoncer à un vol long-courrier | 1 601 kg | carte pleine |
| 2 | voyages | Renoncer à un vol court/moyen | 277 kg | carte pleine |
| 3 | voyages | Remplacer un A/R en avion par le train | 273 kg | carte estompée |
| 4 | voyages | Un long trajet en train plutôt qu'en voiture | **48 kg** | carte estompée |
| 5 | trajet | Télétravail deux jours | **461 kg** | ligne simple |
| 6 | trajet | Deux trajets sur cinq en métro/tram | 447 kg | ligne simple |
| … | | sept autres | | lignes simples |

Une action à **48 kg** est mise en avant devant une action à **461 kg**. Et 461 kg dépasse à elle
seule le cap de la saison : **le plan enfouit l'action qui suffirait à tenir sa propre promesse.**

Deux conséquences que le dessin doit connaître :

- **Le produit sait pourtant le dire.** `cadreDuPlan` a deux formulations écrites exactement pour
  ce cas — « … dont une ailleurs que sur tes voyages. » en intro, et « Le cap porte sur tes
  voyages ; cette action porte ailleurs. » sous le cap. Elles **ne se déclenchent presque jamais** :
  elles ne regardent que les deux cartes pleines, et le classement garantit que celles-ci sont du
  poste dominant. Corriger le classement ne les casse pas, il les **réveille**.
- **Déplier fait exploser la densité.** « Voir d'autres pistes » + l'ouverture des lignes mène
  jusqu'à **onze cartes pleines** — la limite de quatre est franchie par un chemin que le produit a
  lui-même ouvert (`v1-16` §5, pour que les lignes cessent d'être inatteignables). Et « Replier »
  est rendu **avant** le bloc déplié : une fois la liste ouverte, il est hors écran, sans retour en
  bas.

## 3. Ce qui ne se discute pas

- **Le cap reste calculé sur le poste dominant.** Le recalculer côté client sur le total ferait deux
  définitions d'un même chiffre.
- **Les trois rangs disent l'insistance, jamais la permission.** Toute action affichée reste
  engageable ; c'est ce que `v1-16` §5 a corrigé et une garde de partition l'épingle.
- **Aucun chiffre dans la bouche de Ramille**, et la mascotte n'apparaît jamais à côté d'un chiffre
  lourd. Le plan est de la voix produit.
- **Le premier pas ne s'affiche qu'une fois l'action engagée** : avant le choix, une consigne
  pratique se lit comme une charge de plus.
- **Une seule action engagée par cycle.** La base le garantit par un index unique partiel.
- **Pas de comparaison entre utilisateurs**, non-goal ferme (`v1-06`).

## 4. Le mandat — ce que le canvas peut changer

- **L'ordre de ce qui est mis en avant**, et donc le `row_number()` du serveur. Si le dessin
  demande un classement par gain seul, ou un « meilleur de chaque poste », c'est une migration et
  elle est acceptée.
- **La partition des rangs** : combien de cartes pleines, combien d'estompées, ce qui reste en
  ligne.
- **La place et la forme du retour** (« Replier »), et plus généralement ce qui se passe quand la
  liste est longue.
- **Un traitement propre au premier plan.** Le produit dispose déjà des signaux pour le
  reconnaître et ne s'en sert pas ici : `nouveau=1` à la sortie du questionnaire, l'absence
  d'engagement, l'absence de cycle précédent. Un premier plan pourrait montrer moins, ou autre
  chose, ou dans un autre ordre.
- **Les mots de `cadreDuPlan`**, si le classement change : l'intro et la note sous le cap devront
  dire ce que le nouvel ordre fait.

## 5. Ce qu'on ne veut pas voir

- **Un second « Replier » en pied de liste** comme seule réponse. C'est le pansement : il traite le
  symptôme le plus visible et laisse la densité intacte. S'il figure au canvas, qu'il soit une
  conséquence du parti pris, pas le parti pris.
- **Un tri qui se réordonne tout seul selon l'usage.** Le classement doit rester explicable en une
  phrase, et le produit ne devine pas les intentions.
- **Une hiérarchie qui retire la permission.** Estomper, replier, reléguer : oui. Rendre
  inatteignable : non, c'est le défaut que `v1-16` §5 a retiré.
- **Un onglet de plus.** La barre porte deux lieux, et le plan en est un.

## 6. Les écrans à dessiner

1. **Le plan d'un profil dont le meilleur levier est hors du poste dominant** — le cas ci-dessus,
   dans le parti pris retenu. Avec l'intro et la note sous le cap telles qu'elles devront se lire.
2. **Le même plan déplié en entier**, pour montrer ce que devient la densité et où se trouve le
   retour.
3. **Le tout premier plan**, à la sortie du questionnaire, s'il diffère du plan de quelqu'un qui
   revient — et la planche du plan de retour, pour qu'on voie l'écart.
4. **Un plan à zéro action** (tout cycliste, tout profil sédentaire depuis C2.5) : il existe, il
   doit rester félicitant, et sa carte de cap ne chiffre rien.

## 7. Questions ouvertes pour la session

- Le cap étant sur le poste dominant, **une action d'un autre poste qui ne compte pas dedans
  doit-elle pouvoir être la première carte ?** C'est le cœur de l'arbitrage. Si oui, comment le
  dire sans que la personne ait l'impression qu'on lui propose quelque chose qui « ne compte pas ».
- **Le nombre d'actions doit-il être visible d'emblée** (« onze pistes »), ou seulement le compte
  de ce qui est caché, comme aujourd'hui ?
- **Un premier plan doit-il montrer moins ?** Et si oui, la personne doit-elle savoir qu'il y a
  davantage derrière — au risque de recréer le catalogue qu'on évite.

## 8. Pour voir l'état actuel

`npx expo export --platform web` puis ouvrir `dist/plan.html`, ou la production
`https://www.ramille.fr/plan`. Le profil de la recette est décrit en §13 du plan d'audit. Les
sources d'écran : `src/app/(tabs)/plan.tsx`, `src/types/plan.ts` (`pistesDuPlan`, `cadreDuPlan`),
et le classement dans `supabase/migrations/20260913110000_pistes_et_premier_pas.sql`.
