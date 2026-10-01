# FRONT-SUIVI.md — le suivi et la restitution d'un bilan

> **Quand ouvrir ce fichier.** Toucher à l'écran du suivi ou à la restitution d'un bilan —
> l'historique, l'écart par poste, la comparaison au bilan précédent, le retrait d'un bilan depuis
> sa restitution. La logique pure du suivi et le préremplissage d'un re-bilan sont en
> `FRONT-SESSION.md` §2.9.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier a été sorti de `FRONT.md` le 01/10/2026, qui pesait 102 Ko — avec `FRONT-MASCOTTE.md`,
`FRONT-QUESTIONNAIRE.md`, `FRONT-SESSION.md` et `FRONT-MOUVEMENT.md`. Ses sections y sont venues
**telles quelles**, à leurs renvois près,, et **gardent leur numéro** : il reste unique dans la famille, donc un renvoi «
`FRONT.md` §2.x » écrit avant cette date — dans un commentaire du code, un document daté — se
retrouve ici, et la table en tête de `FRONT.md` dit où vit chaque numéro. Tout ici est propre à
Ramille ; ce qui voyage est en `FRONT.md` §1.

---

## 2. Propre à Ramille

### 2.10 Le suivi

- **L'écran `/suivi` n'a aucune mécanique d'échec** : ni streak, ni série cassée, ni score. Une
  période sans réponse n'y apparaît pas du tout (les check-ins non répondus sont clos en
  `expired` côté serveur et jamais relus). On compte les fois où la personne a répondu, jamais
  celles où elle a laissé passer — et une hausse d'empreinte est toujours présentée comme un
  fait, jamais comme une faute. **Une baisse, en revanche, est désormais reconnue** (C2.7) :
  « Ce que tu as changé se voit ici. », et le mot de Ramille `suiviDifference` en bas de l'écran —
  mais **seulement sur une baisse réelle** (`estUneBaisse`), jamais au-dessus d'une hausse ni d'un
  écart qui tient dans l'imprécision des facteurs. Le seuil de stabilité est `estStable`, une seule
  fois pour les trois endroits qui le lisent.
- **Le suivi lit enfin `plan_cycles`, et une décision n'a pas de statut** (C2.7). « Ce que tu as
  décidé, saison après saison » est une liste de **décisions**, jamais un bulletin : le produit ne
  sait pas si l'action a été menée, seulement ce que la personne a répondu aux points — qui vivent
  dans leur propre carte. Une ligne par cycle, et `decisionsParSaison` fait gagner l'engagement
  **vivant** sur l'archive du même cycle, puis la dernière libérée. `decisions === null` veut dire
  « pas lu » et la carte ne s'affiche pas : un tableau vide affirmerait que rien n'a jamais été
  engagé, la faute de A5-2 sur une carte de moins.
- **Les trois réponses du suivi ont des libellés de fait, au même niveau typographique** (C2.7) :
  « Changement fait » / « Pas cette fois » / « Pas de trajet ». « Oui » et « Non » étaient les
  libellés du *bouton* — relus six mois plus tard, hors de la question, ils ne disent plus à quoi
  ils répondaient. Et un « Changement fait » en accent au-dessus d'un « Pas cette fois » en
  tertiaire classait les réponses, alors que ni la deuxième ni la troisième n'est un échec : la
  reconnaissance vit dans le compteur et dans le mot de Ramille, pas dans la couleur d'une ligne.
  La liste est **groupée par saison**, chaque groupe portant son vrai total — elle était tronquée à
  huit **en silence** sous un compteur global qui en annonçait davantage.
- **`keepLatestPerDay` regroupe sur le jour LOCAL** (C2.7). Les dix premiers caractères d'un
  `timestamptz` sont son jour **UTC** : un bilan soumis le 10 mars à 23 h 00 UTC et sa correction le
  11 à 00 h 30 UTC sont le même 11 mars à Paris, et l'ancien regroupement en faisait deux barres
  avec deux valeurs différentes — le doublon exact que cette fonction existe pour empêcher.
- **La restitution se compare au dernier bilan d'un AUTRE JOUR, avec la règle du jour du suivi**
  (recette web du 28/09/2026, constat H4, arbitrage du même jour : « la correction gagne »).
  `keepLatestPerDay` garde un bilan par jour local, donc un bilan refait le même jour **remplace**
  le précédent dans le suivi — c'est une correction. La restitution, elle, le comparait au bilan
  qu'elle venait de remplacer (« 1,3 t de moins que ton bilan de septembre »), c'est-à-dire à une
  entrée que le suivi ne montre plus : le même geste se lisait correction sur un écran et progrès
  sur l'autre. `precedentDUnAutreJour` (`src/types/suivi.ts`) applique donc à la comparaison le
  `jourLocalDe` du suivi, et **il est testé** là où ce paragraphe disait le contraire — minuit à
  Paris compris. Deux règles d'avant C2.7 tiennent toujours : le prédécesseur se choisit sur
  `submitted_at` et jamais dans l'historique dédoublonné, et si le bilan affiché n'est pas le plus
  récent (une restitution rouverte depuis le suivi) on ne compare rien plutôt que de comparer à un
  bilan postérieur. `loadBilanPrecedent` lit **dix** lignes, pour trouver un autre jour derrière
  quelques corrections du jour ; au-delà, on ne compare rien, ce qui est le repli sûr.
- **« Le palier que tu visais est derrière toi. » n'est dit que s'il est prouvable** (C2.7,
  `palierEstDerriere`). Le palier visé se recalcule depuis le cap **d'alors**, et ce cap est perdu
  quand les deux bilans tombent dans la même période : `generate_plan_cycle_for_user` réécrit le
  cycle courant à chaque soumission. Avec le cap d'aujourd'hui — plus petit, la baseline du poste
  dominant ayant baissé — le palier recalculé serait plus proche et la phrase s'afficherait plus
  souvent qu'elle ne le devrait. On passe `null` et on ne dit rien.
- **Un bilan se retire depuis sa restitution, et son adresse dit ensuite qu'il l'a été** (C4.7,
  `v1-22`, `src/types/retrait-du-bilan.ts`). Trois points à ne pas défaire :
  - **la restitution est la seule lecture d'affichage qui ne filtre pas sur `completed`** — elle lit
    un bilan par son identifiant, c'est-à-dire par l'adresse qui circule. Les autres lectures
    d'affichage deviennent justes sans qu'on y touche. **« D'affichage » porte une exception** :
    `lireEtatDuCompte` (`src/lib/compte.ts`) lit tous les statuts, et il le doit — un bilan retiré
    reste une donnée à supprimer ; le filtrer ferait dire « rien à supprimer » à une session anonyme
    qui ne porte qu'un bilan retiré. La restitution, elle, embarque le statut dans sa lecture
    (`assessments(status, submitted_at)`) et ne montre jamais le chiffre d'un bilan retiré.
    Embarqué et non lu à côté : une seconde lecture pourrait échouer seule, et l'écran ne saurait
    plus s'il a le droit de montrer le chiffre ;
  - **la confirmation dépend de la place du bilan** (`seul`, `dernier`, `ancien` — `placeDuBilan`),
    parce que le retrait ne fait pas la même chose au plan dans les trois cas : « ton plan repartira
    de ton bilan précédent » serait faux d'un bilan qui ne porte pas le plan, et parler de plan à qui
    retire son seul bilan le serait aussi. Quand la place n'a pas pu être lue, **le lien ne se rend
    pas** : une confirmation dont on ne sait pas quelle phrase est vraie ne se propose pas. **Et ce
    que la confirmation dit se relit au toucher du lien**, place et action engagée (contre-lecture
    du 27/09/2026) : la restitution reste montée dans la pile du suivi, donc une lecture du
    chargement serait périmée par un nouveau bilan ou un changement d'action faits entre-temps ;
  - **retirer son seul bilan efface la marque locale `traceverte.a_un_bilan.v1`, et elle seule**
    (`effacerLaMarqueDeBilan`) — sans quoi une réouverture hors ligne enverrait au plan (C4.5). Le
    balayage par préfixe de `src/lib/compte.ts` serait de trop : le compte n'est pas quitté. **Le
    premier parcours ne recommence pas pour autant** (décision du 27/09/2026) : le bilan suivant ne
    note l'étape `questionnaire` que sur un appareil qui n'a vu **ni** bilan **ni** parcours
    (`ouvreUnPremierParcours`), sans quoi la barre d'onglets disparaîtrait et la carte « Deux
    endroits, pas plus. » reviendrait devant quelqu'un qui connaît les deux lieux.
- **`EcartParPoste` compare poste à poste, et l'accent suit le dominant du serveur** (C2.7). Le
  poste dominant peut changer d'un bilan à l'autre, et c'est le plus souvent une réussite :
  comparer « dominant d'avant » à « dominant d'aujourd'hui » ferait passer ce succès pour une
  hausse. `dominant_poste` vient d'`assessment_results` et n'est pas un maximum recalculé — le
  départage du serveur n'en est pas un (les loisirs l'emportent sur les voyages à 5 % près). Et
  l'échelle est **commune aux six barres** : une échelle par poste rendrait un poste de 40 kg aussi
  long qu'un poste de 2 t.
