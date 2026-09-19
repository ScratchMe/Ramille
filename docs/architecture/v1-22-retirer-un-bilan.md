# v1-22 — Retirer un bilan qui ne ressemble à personne

> **Page de décision du chantier C4.7** ([#149](https://github.com/ScratchMe/Ramille/issues/149)),
> deuxième des six du lot 4. Écrite le 19/09/2026.

## 1. D'où ça vient

Constat C-8, relevé en relecture : il n'y a **aucun moyen de retirer un bilan**. Toute soumission
est définitive, apparaît dans le graphe du suivi, et devient la base de comparaison du bilan
suivant. Les façons d'en produire un faux sont ordinaires — une distance saisie en mètres, un
aller-retour compté deux fois, un questionnaire rempli « pour voir » avant de le faire sérieusement.

Le produit a un principe fort qui rend le problème visible : **un bilan n'écrase jamais le
précédent** (`v1-19` §7). C'est ce qui rend l'historique honnête, et c'est aussi ce qui fait qu'une
erreur reste à l'écran pour toujours.

## 2. L'état des lieux, relevé le 19/09/2026

`assessments.status` n'admet que deux valeurs :

```sql
CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text]))
```

Et `completed` est lu à **douze endroits**, six côté client et six côté serveur :

| Côté | Où |
|---|---|
| client | `src/app/index.tsx` (la racine, qui route) · `src/app/(tabs)/plan/index.tsx` · `src/lib/contexte.ts` · `src/lib/bilan-history.ts` (trois lectures) |
| serveur | `generate_plan_cycle_for_user` · `generate_plan_cycles` · `generate_commute_checkins` · `generate_extras_checkins` · `mettre_a_jour_le_contexte` · `stamp_assessment_submitted_at` |

> **La fiche du chantier en annonçait trois, et c'est une leçon plus qu'une erreur.** Elle disait
> « relecture des trois lectures de `completed` dans `bilan-history.ts` et de la racine ». Il y en a
> quatre fois plus, et le compte a encore bougé **le jour où cette page a été écrite** : C6.4 en a
> ajouté une (`src/lib/contexte.ts`). Un chantier qui se chiffre en « trois endroits à relire » est
> un chantier dont on n'a pas relevé le périmètre.

**Et il y a une lecture sans filtre**, qui est justement celle qui compte :
`src/app/(tabs)/suivi/bilan.tsx:265` lit un bilan **par son identifiant**, sans regarder son statut
— c'est la restitution, atteinte par `/suivi/bilan?id=…`, donc par un lien partagé et par un
favori.

## 3. Ce qui rend la décision simple, et ce qui la rend piégeuse

**La partie simple : le statut est le bon véhicule.** Une troisième valeur `withdrawn` fait que les
douze lectures de `completed` deviennent **automatiquement justes**, sans qu'on touche à une seule
d'entre elles. C'est l'inverse d'une colonne `withdrawn_at`, qui obligerait à ajouter
`and withdrawn_at is null` partout — donc à l'oublier quelque part, et l'oubli serait silencieux.
Le même raisonnement que `in_progress` : *l'état que rien ne lit* est celui qui protège
(`20260911120000_soumission_bilan.sql`).

**La partie piégeuse : ce que le bilan a engendré ne disparaît pas avec lui.** Un bilan retiré a
déjà produit un `plan_cycle`, des `plan_actions`, peut-être un engagement, et des
`engagement_checkins` dont les libellés sont **figés** précisément pour ne pas changer
rétroactivement (`trip_label`, `committed_question`). Trois de ces objets portent des réponses que
la personne a données : un point répondu est un fait, il n'a pas à s'effacer parce que le bilan qui
l'a fait naître était faux.

## 4. Les décisions à prendre

### D1 — Retirer, ou supprimer

**Recommandation : retirer** — `status = 'withdrawn'`, la ligne reste. Trois raisons :
l'export RGPD doit continuer de rendre ce que la personne a écrit ; une suppression ferait
disparaître les points de suivi par cascade, donc des réponses qui sont des faits ; et le produit a
déjà **un** chemin de destruction, `delete_my_account`, qui efface tout et dont la simplicité est
une garantie. En ouvrir un second, partiel, c'est ouvrir un second endroit où se tromper.

**Ce qu'on casse si on se trompe** : en choisissant la suppression, on perd l'historique
d'engagement lié à ce bilan, et on doit accorder un `DELETE` sur `assessments` — ce que le dépôt
refuse partout ailleurs, pour la raison de `plan_actions` (la RLS filtre des lignes, jamais des
colonnes).

### D2 — Ce que devient le plan du bilan retiré

Deux formes :

1. **Le cycle est reconstruit sur le bilan valide précédent**, s'il y en a un. L'engagement suit la
   règle de C2.2 : reposé si son gabarit est encore proposé, archivé en `rebilan` sinon.
2. **Le cycle est laissé tel quel** jusqu'au passage du cron.

**Recommandation : la 1**, et elle est presque gratuite depuis C6.4 :
`generate_plan_cycle_for_user(user, p_cause)` sait déjà régénérer en passant la garde
d'idempotence. Il suffit d'une cinquième raison d'archivage, ou de réutiliser `rebilan`.

**Une question de produit s'y cache, et elle mérite d'être posée** : faut-il *dire* à la personne
que son plan a changé ? L'encart orphelin le fait déjà pour les deux libérations non choisies
(`RAISONS_ANNONCABLES`). Retirer un bilan est un geste **choisi**, donc il tombe plutôt du côté de
`changement`, qu'on ne raconte pas. La recommandation est de ne rien annoncer et de laisser l'écran
se recharger — mais c'est un arbitrage de voix, pas une conséquence technique.

### D3 — Peut-on retirer son seul bilan

**Recommandation : oui**, et la personne retombe sur `/onboarding`, qui est l'état que la racine
sait déjà router. L'interdire créerait une règle de plus à expliquer (« tu peux retirer un bilan,
sauf celui-là »), et l'état d'arrivée existe déjà et fonctionne.

**Ce qu'on casse si on se trompe** : en l'autorisant sans vérifier la marque locale
`traceverte.a_un_bilan.v1` (C4.5), quelqu'un qui retire son unique bilan puis rouvre l'app **hors
ligne** serait envoyé au plan par une marque devenue fausse. Le RPC doit donc, comme
`delete_my_account`, avoir une contrepartie côté client qui efface cette marque.

### D4 — Où vit le geste

**Recommandation : sur la restitution du bilan concerné** (`/suivi/bilan?id=…`), pas dans une liste
du suivi. C'est le seul écran où l'on voit le chiffre qui choque, donc le seul où le geste a un
sens ; et cela évite une rangée de boutons sur l'historique, où le geste serait à portée de pouce
sans que rien ne soit affiché à côté.

Le libellé proposé est **« Ce bilan ne me ressemble pas »** plutôt que « Supprimer » : il décrit ce
que la personne pense, et il n'annonce pas une destruction qui n'a pas lieu. Une confirmation
explicite, parce que le geste est irréversible côté produit même s'il ne l'est pas en base.

## 5. Ce qu'il ne faut pas casser

- **`status = 'withdrawn'` doit être ajouté au `CHECK`**, et c'est un `drop` + `add` : une
  contrainte ne se modifie pas, et `add constraint` n'est pas idempotent.
- **La lecture sans filtre de la restitution** (`suivi/bilan.tsx:265`) est la seule qui ne devient
  pas juste toute seule. Sans elle, l'adresse d'un bilan retiré continue de l'afficher — et c'est
  l'adresse qui circule, par la carte de partage et par les favoris.
- **Jamais de policy `DELETE` sur `assessments`**, quelle que soit la décision D1 : le RPC est
  `security definer` et vérifie la propriété à l'intérieur, comme `repondre_au_checkin` et
  `commit_plan_action`.
- **Un bilan `in_progress` n'est pas concerné.** Il est déjà l'état que rien ne lit ; lui ajouter un
  chemin de retrait serait une troisième façon de dire la même chose.
- **`analytics.bilan_funnel` et sa jumelle `BILAN_STEP_ORDER`** comptent des bilans soumis : un
  retrait ne doit pas décrémenter l'entonnoir, sinon le taux de complétion du questionnaire se met à
  mesurer la satisfaction. Ce qui est soumis a été soumis.
- **L'export RGPD (`export_my_data`) doit continuer de rendre le bilan retiré**, avec son statut :
  c'est une donnée de la personne, et le retrait est une décision de produit, pas un effacement.

## 6. Le chantier

Une migration : la troisième valeur de statut, un RPC `retirer_le_bilan(p_assessment_id)`
(`security definer`, propriété vérifiée, refus d'un bilan déjà retiré par un code `RM`), la
régénération du plan via `generate_plan_cycle_for_user(user, …)`. Côté écran : un lien sur la
restitution, une confirmation, l'effacement de la marque locale quand il ne reste plus de bilan, et
la garde sur la lecture par identifiant.

**Effort : moyen.** Aucune décision produit n'y est bloquante au sens où elle empêcherait de
commencer — D2 et D4 peuvent se trancher en cours de route —, mais D1 et D3 changent le schéma et
doivent être prises avant la migration.
