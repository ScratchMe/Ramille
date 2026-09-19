# v1-23 — Le point qui compte, ou qui ne compte pas

> **Page de décision du chantier C4.1** ([#143](https://github.com/ScratchMe/Ramille/issues/143)),
> troisième des six du lot 4. Écrite le 19/09/2026.
>
> La fiche du chantier se termine par une phrase inhabituelle : « **soit instruire, soit fermer par
> écrit** ». Cette page est là pour que l'une des deux ait lieu, et que la seconde ne soit pas un
> abandon silencieux.

## 1. D'où ça vient

`v1-07` §3.6 a retenu une piste et ne l'a jamais instruite : remplacer « as-tu fait ce trajet à
vélo ? » par « **combien de fois ?** » (0 / 1-2 / 3+), au même coût de geste, pour « recalculer une
empreinte vivante entre deux bilans ». Trois constats d'audit y renvoient : A4-21, A8-19, A11-5.

## 2. Ce que le point sait aujourd'hui, relevé le 19/09/2026

`engagement_checkins` porte dix-huit colonnes. Celles qui décident d'une réponse sont trois :

| Colonne | Ce qu'elle dit |
|---|---|
| `status` | `pending` · `answered` · `expired` |
| `response_kind` | **la vérité depuis C2.4** : `oui` · `non` · `sans_objet` |
| `response` (boolean, nullable) | **dérivée**, gardée pour les lectures d'avant C2.4 |

Et `engagement_checkins_reponse_coherente` porte deux invariants : répondu ⟺ genre renseigné, et la
correspondance genre/booléen. `repondre_au_checkin(uuid, text)` est le **seul** écrivain : la table
n'a ni policy ni privilège d'écriture client.

## 3. Ce que ça change vraiment, et ce que ça ne change pas

### 3.1 Ce qui est perdu aujourd'hui, et c'est réel

Quelqu'un qui s'est engagé à « faire un trajet sur cinq à vélo le mardi et le jeudi » et qui l'a
fait **une fois** répond « oui ». Quelqu'un qui l'a fait **cinq fois** répond « oui ». Le produit ne
sait pas distinguer un premier pas d'une habitude installée — alors que c'est exactement la
distinction que la boucle d'engagement existe pour accompagner, et que le signal « deux fois de
suite » (C2.10) ne mesure que la **régularité de la réponse**, pas celle du geste.

### 3.2 Ce qu'il ne faut pas espérer en retour

**Une « empreinte vivante entre deux bilans » serait une seconde source de vérité pour le chiffre**,
et ce dépôt en refuse une partout ailleurs. `assessment_results` **fige** le résultat au moment du
bilan, jamais recalculé à la volée ; `emission_factor(mode, date)` borne les facteurs à la date du
bilan pour qu'un vieux bilan reste reproductible ; le suivi compare des bilans entre eux, et le
brief du moment anniversaire (`v1-20` §4) écrit noir sur blanc que **le produit ne sait pas ce que
la personne a évité**.

Un chiffre dérivé de quatre réponses par mois contredirait le chiffre figé du bilan, et la personne
verrait deux nombres pour la même chose. C'est la faute que `v1-19` §3 vient de corriger sur le
contexte, prise par l'autre bout.

### 3.3 Et ce que ça coûte au schéma

Un compte est une **cinquième forme de réponse**, après le booléen, `sans_objet`, et la question
figée. Chaque forme précédente a coûté une migration qui **remplace** la signature du RPC plutôt que
de l'ajouter (C2.4 : « `p_reponse boolean` ne peut pas porter un troisième état : ce sera une
migration, pas un paramètre de plus »). Celle-ci coûterait :

- `response_count` sur le point, `response_kind` **maintenu en dérivée** (0 → `non`, ≥ 1 → `oui`) ;
- la **base de comparaison snapshotée** sur le point — « 3 fois » sur cinq trajets et « 3 fois » sur
  deux ne disent pas la même chose, et le nombre de trajets peut changer entre deux bilans ;
- la question dans sa source unique (C2.1), donc `checkin_question`, `committed_question`,
  `composerQuestionDuPoint` et le `push_body` ;
- la carte, les répliques (`repliqueDuPoint` et ses quatre genres), et
  `analytics.engagement_by_segment`, dont les compteurs `answered_yes` / `answered_sans_objet` ne
  suffiraient plus.

**Effort : grand**, et la fiche le disait déjà.

## 4. Les décisions à prendre

### D1 — Le produit compte-t-il, ou pas

**Recommandation : fermer par écrit pour la V1, avec sa condition de réouverture.** Trois raisons,
dans l'ordre de leur poids :

1. **La boucle n'a jamais tourné sur personne.** Sept bilans en base, aucun utilisateur publié,
   aucune semaine réelle de points répondus. La question que C4.1 pose — « une réponse binaire
   perd-elle quelque chose d'important ? » — n'a pas de réponse observée, et en fabriquer une par
   raisonnement serait exactement ce que ce dépôt reproche à ses propres pages quand il les
   corrige.
2. **Le gain attendu principal est celui qu'il ne faut pas prendre** (§3.2). Reste le gain réel —
   distinguer un premier pas d'une habitude — mais il est plus étroit que ce que la fiche annonce.
3. **Le coût tombe sur la pièce la plus travaillée du produit.** La question du point a une source
   unique de chaque côté, une jumelle SQL/TypeScript, une question figée à la génération, quatre
   genres, trois réponses et une contrainte qui les lie. C'est la partie où une migration de plus
   a le plus de chances de défaire une garde posée par une précédente — c'est déjà arrivé (C2.2,
   régression attrapée par la CI).

**La condition de réouverture, écrite pour ne pas avoir à la redécouvrir** : rouvrir C4.1 quand la
boucle aura tourné sur de vrais comptes et que `analytics.engagement_by_segment` montrera **soit**
un taux de « oui » proche de 100 % (le binaire ne discrimine plus rien), **soit** un taux
d'abandon concentré après le premier « oui » (la personne a franchi un pas et le produit n'a rien
su en faire).

### D2 — Si on instruit quand même : l'échelle, et sa base

L'échelle proposée par `v1-07` est **0 / 1-2 / 3+**. Elle n'est pas neutre : elle suppose une
intention hebdomadaire de l'ordre de deux à cinq trajets. Pour la boucle **mensuelle** — un vol,
une sortie —, « 3+ » ne veut rien dire.

**Recommandation, si D1 va dans l'autre sens : deux échelles, indexées sur le poste**, comme
`intentionTimingsForPoste` le fait déjà pour les échéances. Et la base de comparaison snapshotée
sur le point, jamais relue à l'affichage, pour la raison qui a fait figer `committed_question`.

### D3 — Ce que le produit affiche du nombre

**Recommandation : rien de chiffré à la personne.** Le nombre sert à choisir la **réplique** et à
alimenter le suivi et les vues d'analyse ; il ne s'affiche pas. Les deux garde-fous de la fiche
restent : **un « 0 » est un fait, jamais une série**, et **Ramille ne porte pas le chiffre**.

C'est aussi ce qui rend D1 moins coûteux à refuser : ce que le nombre apporterait à la personne
elle-même est, de l'aveu du chantier, presque nul.

## 5. Ce qu'il ne faut pas casser, quelle que soit la décision

- **`response_kind` est la vérité, `response` est dérivée.** Tout ce qui compte les points répondus
  filtre `status = 'answered'` et lit `response_kind` — **jamais `response is not null`**. Un
  compte ne doit pas rouvrir cette porte : `response_count = 0` devra être `response_kind = 'non'`,
  pas un troisième `null`.
- **La contrainte `engagement_checkins_reponse_coherente` porte deux invariants**, et elle a été
  écrite en sachant qu'une quatrième forme viendrait (C2.4, mot pour mot : « c'est pourquoi
  l'écrire coûte zéro et garde le jour où C4.1 ajoutera une forme de réponse »). Elle doit être
  étendue, pas contournée.
- **Une fixture ne peut pas écrire un état que la production ne produit pas.** Cinq fichiers pgTAP
  ont été corrigés pour ça en C2.4 ; un `response_count` sans `response_kind` cohérent recréerait
  la même fiction.
- **La signature du RPC change, elle ne s'ajoute pas** — deux surcharges que PostgREST départage
  sur le type d'un champ JSON coûteraient plus qu'une migration. Ce raisonnement tient **tant que
  l'app n'est pas publiée sur Play** ; le jour où un client installé appelle l'ancienne forme, il
  faudra une seconde fonction nommée.
- **`analytics.engagement_by_segment` compte trois réponses**, et l'écart entre `answered` et
  `answered_yes` n'est plus « les non » depuis C2.4. Un compte ajouterait une quatrième dimension
  à cette vue, pas une colonne à côté.

## 6. Ce qu'il reste à faire si D1 ferme

Une ligne dans `v1-07` §3.6 disant que la piste est instruite et refermée, avec sa condition de
réouverture ; l'issue [#143](https://github.com/ScratchMe/Ramille/issues/143) fermée en renvoyant
ici. **Ne pas laisser la fiche C4.1 dans l'état « à instruire »** : c'est cet état-là qui a fait
qu'elle est restée deux increments sans être regardée.
