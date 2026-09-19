# Brief pour Claude Design — un an ensemble, et ce qu'on en montre

Écrit le 19/09/2026, au lendemain de la première recette du premier parcours et du cadrage produit
qui l'a suivie ([`v1-19`](../../architecture/v1-19-rythme-des-bilans.md), postulat 5 et questions
ouvertes §6.1 et §6.2 ; issue [#233](https://github.com/ScratchMe/Ramille/issues/233)).

**Ce brief demande l'UX autant que l'UI.** Ce n'est pas « dessine un écran de bilan annuel » : c'est
**à quel moment du parcours ce moment arrive, comment on y entre, ce qu'on en retient, et où l'on va
ensuite**. Un bel écran posé au mauvais endroit du parcours ne vaut rien ici.

## 1. Ce qu'on demande

1. **À quoi ressemble un moment qui fête un an sans rien imposer ?** Rien n'est obligatoire dans
   Ramille, à aucune échéance (`v1-19` D6). L'anniversaire n'est donc pas une porte : c'est une
   occasion. Où vit-elle, combien de temps, et que se passe-t-il si on l'ignore ?
2. **Un bilan d'année est par nature un écran de chiffres. Comment le rendre joyeux sans le rendre
   faux ?** Les chiffres dont on dispose sont des **estimations** (§4), et le produit s'interdit de
   les faire dire plus qu'ils ne disent.
3. **Y a-t-il une version saisonnière, et si oui à quelle distance de l'annuelle ?** Le doute posé le
   18/09 est qu'une saison, c'est peut-être trop court — et qu'une version saisonnière devrait être
   **bien plus légère**. À trancher, avec sa forme.

## 2. Ce qui existe déjà, et qu'il ne faut pas redessiner en double

- **La carte d'ouverture de saison** (C2.8) se rend une fois par bascule, sur le plan, et porte déjà
  un **récapitulatif de la saison écoulée** — le nombre de points répondus et ce qui a changé. Elle
  remplace la carte d'attente, **jamais un point en attente**.
- **`recapDeSaison`** (C2.14) calcule ce récapitulatif.
- **Le suivi** montre l'historique des bilans, un trait de comparaison entre eux, et les points
  répondus par saison.
- **Le trait de temps** du plan mesure la saison — `accentMuted`, avec sa légende, et il ne se rend
  qu'une fois une action engagée.

La question n'est donc pas « faut-il un récapitulatif », c'est **si l'anniversaire est une version
riche de ce qui existe, ou autre chose**.

## 3. Ce qui ne se discute pas

Trois règles du produit, et elles vont être inconfortables ici précisément parce que l'écran est
chiffré.

- **Ramille ne dit jamais un nombre, et ne se tient jamais près d'un chiffre lourd.** Elle est la
  voix de l'encouragement, pas celle du bilan. Un canvas où elle annonce des kilos serait à refaire.
  Le récapitulatif est en **voix produit** ; Ramille peut être à côté, pas dessus.
- **Aucune comparaison entre personnes**, jamais — non-goal ferme de `v1-06`. Pas de classement, pas
  de moyenne des utilisateurs, pas de « tu fais mieux que X % ». La seule comparaison permise est
  celle de la personne **avec elle-même**, et le repère national déjà utilisé dans la restitution.
- **Aucune mécanique d'échec**, ni série rompue, ni badge perdu, ni score qui retombe. Le produit
  console un « non » plutôt que de le compter.

## 4. La matière disponible, et ce qu'elle vaut vraiment

C'est le point le plus important du brief, parce qu'il décide de ce que l'écran a le droit
d'affirmer.

| Ce qu'on a | Ce que c'est | Ce qu'on ne peut pas en dire |
|---|---|---|
| Les points répondus, par saison et par genre (`response_kind` : oui / non / sans objet) | Des faits déclarés par la personne | Rien d'autre — c'est du déclaratif, pas une mesure |
| Le signal « deux fois de suite » (C2.10) | Le passage d'un geste à une habitude, marqué **une fois** puis tu | Il ne se rallume pas à la cinquième : le dire serait faux |
| Les engagements pris, et leur archive (C2.2) | Les actions choisies, avec leur intention | — |
| Les gains figés sur `plan_actions` | Des **estimations**, calculées à la génération du plan | **Jamais « tu as évité N kg »** : le produit ne constate aucune réduction réelle, et personne ne l'a mesurée |
| L'écart entre deux bilans | Une différence entre deux estimations, aux facteurs de leurs dates respectives | Ce n'est pas une trajectoire mesurée |

**Le piège central est là** : « les émissions CO₂ préservées » est ce qu'on aimerait montrer, et
c'est ce que le produit ne sait pas. Il sait ce que la personne **s'est engagée** à faire et ce
qu'elle a **répondu** avoir fait. Le canvas doit trouver comment célébrer **ça** — un engagement
tenu, une habitude prise — sans le traduire en kilos constatés.

## 5. Le mandat — ce que le canvas peut changer

- La **forme** et le **lieu** du moment annuel : plan, suivi, plein écran, pile, notification.
- Sa **durée de vie** : une fois, une fenêtre de quelques jours, jusqu'à ce qu'on le ferme.
- L'existence et la forme d'une **version saisonnière** plus légère, et sa relation avec la carte
  d'ouverture.
- Le **contenu** du récapitulatif, dans les limites du §4.
- La **sortie** : ce qu'on propose ensuite — un nouveau bilan (`v1-19` postulat 4), rien du tout, ou
  autre chose.

## 6. Ce qu'on ne veut pas voir

- Une **gamification** : badges, niveaux, séries, confettis à répétition.
- Un **partage social** conçu comme une comparaison. Le partage existe (`v1-06`) et reste possible,
  mais il montre un bilan, pas un palmarès.
- Un écran qui **bloque** le parcours tant qu'on ne l'a pas lu.
- Un chiffre qui **affirme une réduction réelle** (§4).
- Une Ramille qui annonce des kilos (§3).

## 7. Les écrans à dessiner

Au minimum : le moment annuel dans son contexte d'apparition, et ce qu'on voit **avant** et
**après** lui. Si une version saisonnière est retenue, la même chose pour elle, et ce qui la
distingue de la carte d'ouverture existante.

## 8. Questions ouvertes pour la session

- Un an de quoi, exactement : un an depuis le **premier bilan**, ou depuis la **première action
  engagée** ? Les deux dates existent et ne disent pas la même chose.
- Que montre-t-on à quelqu'un qui a un an d'ancienneté et **presque aucun point répondu** ? C'est le
  cas qui décide si le moment est une fête ou une gêne.
- La personne qui a changé de vie **sans** le dire au produit — elle existe, et l'écran ne doit pas
  lui donner tort.

## 9. Pour voir l'état actuel

`www.ramille.fr`, en navigation privée. Le design system est dans
[`docs/design/design-system/`](../design-system/) et s'invoque comme skill (`ramille-design`) ; en
cas d'écart avec le code, **le code gagne**.
