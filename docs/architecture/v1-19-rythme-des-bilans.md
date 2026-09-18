# v1-19 — Le rythme des bilans, et le contexte qui sort du bilan

> **Statut : décisions prises le 18/09/2026, chantiers à instruire.** Né de la recette du premier
> parcours du même jour (`v1-13` §14, écart 07.4) et du cadrage produit qui a suivi. Ce document ne
> remplace rien : il ouvre un sujet que ni `v1-05` (le bilan v2) ni `v1-17` (la densité du plan)
> n'avaient traité, parce qu'aucun des deux ne regardait le **deuxième** bilan.
>
> **Il reste quatre questions ouvertes** (§6), et elles sont nommées comme telles plutôt que
> tranchées : la forme du moment anniversaire, l'hôte de l'écran de contexte, le sort de
> `household_vehicles`, et ce qu'on demande au design.

## 1. D'où ça vient

La recette du 18/09/2026 a trouvé qu'on ne peut pas **sortir du questionnaire sans soumettre**
(`v1-13` §14.6). Entré depuis l'encart de contexte du plan, on n'a que « Retour », qui remonte à
l'étape précédente du questionnaire, et « Voir mon bilan », qui soumet. Soumettre est un re-bilan
dans la même période, donc l'engagement est libéré (C2.2) : quelqu'un qui voulait **relire** son
contexte ressort sans action engagée. C'est arrivé pendant la séance.

Le premier remède envisagé était un avertissement avant la soumission. Le cadrage produit du même
jour l'a écarté comme réponse principale, et il a eu raison : **le défaut n'est pas cette porte, c'est
qu'il n'y a pas de rythme.** Le produit propose « Refaire mon bilan » en permanence, sans jamais dire
à quelle fréquence un bilan a du sens, et il appelle « refaire » ce qui est en réalité « en soumettre
un nouveau ». Traiter la porte aurait laissé le sujet entier.

## 2. L'état des lieux, relevé le 18/09/2026

**Cinq portes rouvrent le questionnaire** quand un bilan complété existe déjà :

| Où | Libellé d'origine | Quand |
|---|---|---|
| Plan, carte de re-bilan | « Refaire mon bilan » | à partir de 182 jours d'ancienneté |
| Plan, encart de contexte | « Modifier ces réponses » | toujours — entre à l'étape `context` |
| Suivi, bloc de suggestion | « Refaire mon bilan » | quand le bilan est ancien |
| **Suivi, pied d'écran** | « Refaire mon bilan » | **quand la suggestion ne s'affiche pas** |
| Restitution d'un bilan | « Refaire mon bilan » | toujours |

**La cinquième a été trouvée en écrivant C6.1, pas en faisant ce relevé**, et il faut le dire : ce
document a d'abord annoncé quatre portes. Le relevé était parti des appels `push('/bilan')` **du plan
et du suivi** ; celui de la restitution vit dans la pile du suivi (`(tabs)/suivi/bilan.tsx`) et y a
échappé. Un `grep` sur le **libellé** les a toutes rendues d'un coup — chercher ce que la personne
lit plutôt que ce que le code appelle. Même famille que l'erreur inverse commise le même jour, où
« Revoir mon bilan » avait été compté comme une porte parce qu'il appelait `/bilan`… ce qu'il ne fait
pas : il ouvre la restitution.

**La dernière ligne est le défaut en une condition** : le pied du suivi propose un re-bilan
exactement quand le produit a décidé de ne pas le suggérer. Deux jours après le premier bilan, le
lien est là. Il n'y a donc pas un rythme mais deux régimes qui se complètent pour ne jamais rien
refuser — une suggestion à 182 jours, et une porte ouverte le reste du temps.

**« Revoir mon bilan » n'est pas une de ces portes** : il ouvre la restitution du dernier bilan, et
non le questionnaire.

**Le mot « Refaire » ment, et le produit se contredit lui-même à deux lignes d'écart** : le bloc du
suivi explique que « tes réponses sont pré-remplies, tu ne modifies que ce qui a changé » — une
actualisation — et son bouton annonce une réfection. Aucun bilan n'est effacé : chaque soumission
crée une ligne de plus, et l'historique du suivi les montre toutes.

## 3. Ce que le contexte fait vraiment au calcul

Le cadrage posait que « modifier le contexte, c'est hors bilan : ça ne change rien aux chiffres, ça
change les actions qu'on peut proposer ». **C'est vrai pour trois réponses B4 sur quatre.**
`zone_type`, `tc_access` et `teletravail` ne sont lues que par `estimate_action_savings` : elles
filtrent les gabarits (C3.8), elles ne touchent aucun chiffre.

**`household_vehicles` est l'exception, et il faut la mesurer avant d'en décider.** Elle entre dans
`recompute_assessment_results`, dans la seule branche du résiduel des sorties :

```sql
if a.leisure_frequency = 'rarely' then
  v_leisure_distance := leisure_default_distance;   -- 15 km
  v_leisure_mode := case when a.household_vehicles = '0' then 'train' else leisure_default_mode end;
```

Le résiduel vaut 15 km × 2 × 0,25 × 52 = **390 km/an**. Aux facteurs du 18/09/2026 :

| Mode du résiduel | Facteur | Résiduel |
|---|---|---|
| `voiture` (le défaut) | 0,142253 | **55,5 kg/an** |
| `train` (si aucun véhicule) | 0,027690 | **10,8 kg/an** |

**L'écart est de 44,7 kg/an, et ce qu'il pèse dépend entièrement de qui répond** — relevé sur les
bilans réels de la base :

| Profil | Bilans | Total | Ce que vaut le basculement |
|---|---|---|---|
| sorties hebdomadaires | 6 | 3 740 à 4 231 kg | **1,2 %** |
| sorties **rares** | 1 | **11 kg** | **411 %** |

Le seul bilan « rarement » de la base totalise **11 kg/an** et déclare n'avoir aucun véhicule : lui
répondre « un véhicule » ferait passer son total à **55,7 kg, cinq fois plus**. Pour lui, le résiduel
**est** le bilan.

**C'est le paradoxe à retenir : cette réponse compte d'autant plus que l'empreinte est petite**, et
le profil « rarement » est exactement le profil sobre — le cycliste, le piéton — c'est-à-dire celui
qu'on a le plus de raisons de ne pas charger de 390 km de voiture imaginaire. Le résiduel est déjà
à moitié désavoué ailleurs : C2.5 lui a retiré **toutes** ses conséquences visibles (le poste se dit
« occasionnels », `dominant_poste_mode` est nul, aucune action de loisirs n'est proposée). Sa
dépendance à `household_vehicles` est le dernier fil qui relie une réponse de contexte à un chiffre.

## 4. Les postulats retenus le 18/09/2026

1. **Un bilan par saison suffit, et c'est une recommandation, pas une contrainte.** La saison est la
   bonne maille parce qu'elle est l'occasion de **confronter** un changement d'habitude : refaire un
   bilan à mi-saison, c'est mesurer une habitude qui n'a pas eu le temps de prendre.
2. **Quelqu'un peut s'être trompé et vouloir corriger son bilan courant** sans en soumettre un
   nouveau. Le produit ne sait pas faire la différence aujourd'hui.
3. **À chaque nouvelle saison, on propose** un nouveau bilan — si la personne pense que quelque
   chose a changé.
4. **À deux saisons sans bilan, on ré-insiste**, et il y a une raison objective de le faire : les
   facteurs se resynchronisent chaque trimestre et `emission_factor(mode_id, date)` **borne chaque
   bilan aux facteurs de sa date**, pour qu'il reste reproductible (`v1-01` §3). Un bilan d'un an
   n'est pas seulement vieux : il est calculé avec un référentiel que l'ADEME a depuis révisé.
5. **À un an, on n'impose rien** — mais il faut un moment : « déjà un an ensemble, regardons ce
   qu'on a fait, les émissions évitées, les habitudes changées », joyeux, et tourné vers l'année
   suivante.
6. **Le contexte sort du questionnaire** : les quatre réponses B4 vont dans un écran à part, présent
   dans le premier questionnaire, puis accessible ensuite. Le mettre à jour en milieu de saison ne
   doit pas toucher au bilan — seulement aux actions proposées.

## 5. Les décisions

- **D1 — « Refaire mon bilan » disparaît.** Le libellé dit ce que le geste fait : soumettre un
  nouveau bilan, qui s'ajoute et n'efface rien. Le bloc du suivi dit déjà la bonne chose ; c'est le
  bouton qui doit le rejoindre, pas l'inverse.
- **D2 — Le pied du suivi ne porte plus de lien vers le questionnaire du tout.** Il ne se rendait
  que sous `!suggestRebilan` : le produit proposait un nouveau bilan **précisément quand il avait
  décidé de ne pas le suggérer**, et les deux régimes se complétaient pour qu'il y ait toujours une
  offre à l'écran.
  **Cette décision a été écrite une première fois comme « plus de porte inconditionnelle », et
  c'était ambigu au point d'induire une implémentation fausse** : rendre le lien inconditionnel
  supprime bien la symétrie, et laisse exactement le défaut qu'on visait — une offre permanente, et
  deux fois quand la carte s'affiche. La contre-lecture de C6.1 l'a rattrapé. Ce qui manquait n'est
  pas la symétrie, c'est **le silence** : on doit pouvoir regarder son suivi sans qu'on y propose
  quoi que ce soit.
  **Le chemin ne disparaît pas pour autant** : la restitution d'un bilan porte « Faire un nouveau
  bilan » en permanence, à un toucher du suivi, et c'est sa place — on y a un bilan sous les yeux.
- **D3 — L'avertissement se déclenche sur la période de plan, pas sur un nombre de jours.** « Dans
  la même période que le cycle courant » est ce que la base sait déjà (`plan_cycles.period_start`,
  `period_end`) **et** ce qui coûte quelque chose : c'est exactement la condition sous laquelle
  l'engagement est libéré. Un seuil en jours serait un second calendrier à tenir d'accord avec le
  premier.
- **D4 — L'avertissement dit ce qu'on perd, et il ne refuse pas.** Il nomme l'action engagée et
  l'intention — le seul choix personnel que le produit demande — et laisse passer. Le produit
  annonce déjà cet effet **après coup** (l'encart orphelin de C2.2, filtré sur
  `released_reason = 'rebilan'`) : il s'agit de le dire avant, pas d'inventer un mécanisme.
- **D5 — Les quatre réponses B4 vont dans un écran de contexte**, dans le premier questionnaire
  puis accessible seul. Le mettre à jour ne resoumet pas de bilan.
- **D6 — Rien n'est imposé, à aucune échéance.** Ni à une saison, ni à un an.

## 6. Les quatre questions ouvertes

- **6.1 — La forme du moment anniversaire.** Ce qu'il montre est esquissé (émissions évitées,
  habitudes changées, encouragement) ; sa forme ne l'est pas, et « joli et dynamique » est un
  chantier de design, pas un texte. Deux garde-fous du produit s'y appliquent et vont être
  inconfortables : **Ramille ne dit jamais un nombre et ne se tient jamais près d'un chiffre
  lourd**, et le produit n'a **aucune mécanique de comparaison entre personnes** (non-goal ferme de
  `v1-06`). Un bilan d'année est par nature un écran de chiffres : c'est la voix produit qui doit
  le porter, pas la mascotte.
- **6.2 — Une version saisonnière, et son poids.** Le doute posé — « une saison, c'est peut-être
  trop court » — est fondé, et il y a déjà de quoi : la carte d'ouverture de saison (C2.8) porte un
  récapitulatif de la saison écoulée, et `recapDeSaison` (C2.14) existe. La question est de savoir
  si l'anniversaire est une version riche de ce qui existe, ou autre chose.
- **6.3 — Où vit l'écran de contexte une fois le premier questionnaire passé**, et comment on
  rappelle « ton contexte a-t-il changé ? » sans en faire un rappel de plus.
- **6.4 — `household_vehicles`, et c'est la seule question technique des quatre.** Trois issues :
  la laisser dans le bilan et n'en sortir que trois réponses ; la sortir et **recalculer** quand
  elle change pour un profil « rarement » ; ou **couper le fil** — le résiduel ne dépendrait plus
  d'elle. La troisième est la plus propre et la plus discutable : elle change le total des profils
  sobres, dans un sens ou dans l'autre, et il faut décider **lequel** est juste avant de la retenir.
  §3 donne les chiffres pour en juger.

## 7. Ce qu'il ne faut pas casser

- **Un bilan n'écrase jamais le précédent.** Chaque soumission est une ligne, l'historique les
  montre toutes, et `emission_factor(mode_id, date)` garantit qu'un vieux bilan reste reproductible.
  Tout libellé qui laisse croire à un écrasement est faux, et c'est le défaut de D1.
- **`in_progress` est l'état que rien ne lit**, et c'est ce qui empêche le bilan fantôme
  (`20260911120000_soumission_bilan.sql`). Une sortie du questionnaire sans soumission doit laisser
  la ligne dans cet état, jamais la supprimer : la reprise la réutilise.
- **La libération d'engagement au re-bilan est un mécanisme voulu** (C2.2), pas un défaut. Ce qui
  manque est de l'annoncer avant. Le supprimer serait une autre décision, et elle n'est pas prise.
- **Le contexte décide de ce que le plan a le droit de proposer** (C3.8), et une condition qu'on ne
  peut pas évaluer n'est pas remplie : une réponse effacée ou absente **retire** des actions. Un
  écran de contexte qui permettrait de vider une réponse appauvrirait le plan en silence.
- **B4.4 n'est pas une étape mais un champ**, et trois endroits décident ensemble de son affichage,
  de son effacement et de sa réclamation (`teletravailSePose`, `v1-17` §7.2). Sortir le contexte du
  questionnaire déplace ces trois-là ensemble ou casse l'un des deux.

## 8. Les chantiers proposés

**Tout cet increment passe avant le lot 4** (décision du 18/09/2026), avec les deux issues de la
même séance qui n'en relèvent pas — [#228](https://github.com/ScratchMe/Ramille/issues/228), l'espace fine, et [#234](https://github.com/ScratchMe/Ramille/issues/234) / [#235](https://github.com/ScratchMe/Ramille/issues/235),
« Toutes les pistes ». La raison est dans le sujet : faire un bilan et le tenir à jour est le geste
central du produit.

| # | Chantier | Issue | Dépend de |
|---|---|---|---|
| C6.1 | Les libellés du re-bilan disent ce que le geste fait (D1), et le pied du suivi cesse d'être le complément de la suggestion (D2) | [#229](https://github.com/ScratchMe/Ramille/issues/229) | — |
| C6.2 | L'avertissement avant une soumission qui libère un engagement (D3, D4) | [#230](https://github.com/ScratchMe/Ramille/issues/230) | — |
| C6.3 | La cadence : proposer à la bascule de saison, ré-insister à deux saisons | [#231](https://github.com/ScratchMe/Ramille/issues/231) | C2.8 |
| C6.4 | L'écran de contexte, sorti du questionnaire (D5) | [#232](https://github.com/ScratchMe/Ramille/issues/232) | §6.3, §6.4 |
| C6.5 | Le moment anniversaire | [#233](https://github.com/ScratchMe/Ramille/issues/233) | §6.1, §6.2 — brief de design |

**C6.1 et C6.2 sont indépendants et ferment le défaut trouvé en recette** ; les trois autres
demandent qu'une des questions ouvertes soit tranchée avant d'être instruits. L'ordre n'est pas
arbitraire : C6.4 retire à `Modifier ces réponses` sa capacité à soumettre, ce qui **dissout** 07.4
pour cette porte — mais C6.2 reste nécessaire pour les trois autres, où le re-bilan est voulu et la
perte quand même non annoncée.
