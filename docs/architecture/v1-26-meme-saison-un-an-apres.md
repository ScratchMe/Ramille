# v1-26 — La même saison, un an après

> **Page de décision du chantier C4.8** ([#150](https://github.com/ScratchMe/Ramille/issues/150)),
> sixième et dernière des six du lot 4. Écrite le 19/09/2026.

## 1. D'où ça vient

Constats A11-4, A13-7, A5-6. Le suivi compare un bilan **au précédent**, quelle que soit la date de
celui-ci. Or les transports sont saisonniers : on roule moins à vélo en janvier, on part loin en
juillet. Comparer un bilan d'hiver à un bilan d'été, c'est mesurer le calendrier et l'appeler un
progrès — ou l'inverse.

`v1-03` §17 le dit déjà en note : « aucun écran ne compare deux saisons homologues, cf. A11-4 ».

## 2. L'état des lieux, relevé le 19/09/2026 — et la moitié du chantier est déjà livrée

La fiche C4.8 décrit **deux** choses : l'appariement même-saison, et « une proposition de re-bilan à
l'anniversaire saisonnier ».

**La seconde a été livrée le même jour que cette page**, par C6.3 : `regimeDeRebilan`
(`src/types/suivi.ts`) rend `aucun` / `proposer` / `insister` en comptant les **bascules de
saison** depuis la soumission, via `saisonsEcouleesDepuis` et `saisonDe`. Le seuil des 182 jours a
disparu. Il reste donc **l'appariement** — la moitié qui a de la valeur, et celle qui n'en aura pour
personne avant un an.

Ce dont l'appariement a besoin existe : `saisonDe(date)` côté client, `season_bounds(date)` côté
serveur, `plan_cycles.period_start` / `period_end` / `cadence_type` lus par l'écran du plan depuis
C2.8, et `saisonsEcouleesDepuis`, qui compte en **rangs de saison** — donc « quatre » vaut exactement
« la même saison l'an dernier », sans arithmétique de dates.

## 3. Le piège qui rend la comparaison malhonnête, et son état exact aujourd'hui

`emission_factor(mode_id, date)` **borne chaque bilan aux facteurs de sa date**, pour qu'un vieux
bilan reste reproductible (`v1-01` §3). C'est une bonne propriété, et c'est aussi ce qui fait qu'un
écart entre deux bilans distants d'un an mélange **deux choses** : ce que la personne a changé, et
ce que l'ADEME a révisé.

**Mesuré le 19/09/2026 : aucun mode n'a de seconde version dans `emission_factors`.** La
synchronisation trimestrielle est planifiée (`sync-emission-factors @ 0 3 1 1,4,7,10 *`, prochain
passage le 1er octobre 2026) et son journal porte trois passages, mais aucun n'a encore inséré de
version. Donc **aujourd'hui, le biais vaut zéro**.

Il ne restera pas à zéro : d'ici à ce que qui que ce soit ait deux bilans à un an d'écart, quatre
passages trimestriels auront eu lieu. La comparaison doit donc **naître** avec la note de méthode
que le brief du moment anniversaire a déjà écrite (`v1-20` §4) :

> Deux estimations, chacune aux facteurs de sa date. L'écart entre elles n'est pas une mesure.

## 4. Le recouvrement avec C6.5, et il faut le trancher avant d'écrire quoi que ce soit

Le **moment anniversaire** ([#233](https://github.com/ScratchMe/Ramille/issues/233), brief
`docs/design/v1-20-moment-anniversaire/`) compare déjà un bilan à celui d'un an plus tôt, et c'est
son seul chiffre en kilos. C4.8 propose la même comparaison, ailleurs, au fil du suivi.

**Ce sont deux surfaces pour une seule dérivation, ou bien deux chiffres qui finiront par se
contredire.** C'est mot pour mot la leçon de `CarteDOuverture` (C5.6) et de `CarteDePiste` (C5.2) :
ce qui est rendu deux fois s'écrit une fois. La décision D4 ci-dessous est donc la première à
prendre, avant les trois autres.

> **Un détail du handoff à reprendre quand C6.5 sera construit** (relevé le 19/09/2026). La sortie
> de la page anniversaire prescrit un en-tête « Ton dernier bilan a trois mois »
> (`ancienneteEnMots(daysSince(…))`, `HANDOFF.md` l. 177). C'est la même forme que la carte de
> re-bilan portait, et qui a dû être corrigée le jour même : un âge affiché au-dessus d'une
> invitation à refaire son bilan peut le contredire. Ici le risque est moindre — la page ne s'ouvre
> qu'à un anniversaire — mais la règle vaut : `titreDuRebilan` donne à chaque régime ce qu'il peut
> dire de vrai, et c'est lui qu'il faudra lire plutôt que `ancienneteEnMots` en direct.

## 5. Les décisions à prendre

### D4 — D'abord : C4.8 est-il la couche de données de C6.5, ou un second écran

**Recommandation : la couche de données.** Une dérivation pure dans `src/types/suivi.ts`
(`bilanHomologue(bilans, maintenant)`), que **deux** surfaces lisent : le suivi, en continu, et le
moment anniversaire, une fois par an. Aucune des deux ne recalcule.

**Ce qu'on casse si on se trompe** : deux implémentations d'un « écart d'une année sur l'autre »
diront un jour deux nombres, et ce sera sur le seul chiffre que le produit met en avant une fois par
an.

### D1 — L'appariement passe-t-il devant la comparaison au bilan précédent

La fiche dit « affiché en priorité sur l'écart au bilan précédent quand il existe ».

**Recommandation : oui, et en le disant.** Un écart qui change de référence sans prévenir est pire
qu'un écart imparfait : la phrase doit nommer ce qu'elle compare (« par rapport à l'automne
dernier ») dès qu'elle ne compare plus au bilan précédent. C'est la règle déjà appliquée au pied
d'un point répondu, qui nomme ses deux dates.

### D2 — Ce que « la même saison » veut dire quand les dates ne tombent pas au même endroit

Deux bilans peuvent être tous deux « automne » et avoir onze semaines d'écart dans leur saison. Et
il peut y en avoir **plusieurs** dans la saison homologue (un re-bilan).

**Recommandation : apparier sur le rang de saison** (`saisonsEcouleesDepuis === 4`), et retenir
**le plus récent** de la saison homologue. Le rang est ce que le produit sait déjà calculer des
deux côtés, et « le plus récent » est la règle que le suivi applique partout ailleurs. Ne pas
essayer d'apparier à la semaine près : ce serait une précision que la donnée n'a pas.

### D3 — Ce qu'on fait quand il n'y a pas de bilan dans la saison homologue

Trois formes : retomber sur le bilan précédent ; ne rien dire ; ou apparier au plus proche.

**Recommandation : retomber sur le bilan précédent, en le nommant.** « Ne rien dire » ferait
disparaître le suivi pour quelqu'un qui a sauté une saison, ce qui punit exactement le profil
irrégulier qu'on cherche à ramener. « Le plus proche » fabriquerait une homologie qui n'existe pas —
un bilan de mai apparié à un bilan de février serait présenté comme comparable, et il ne l'est pas.

## 6. Ce qu'il ne faut pas casser

- **Les saisons sont météorologiques** — des blocs calendaires de trois mois, et **l'hiver commence
  en décembre**. Le rang d'une saison dans l'année est donc `{printemps: 0, été: 1, automne: 2,
  hiver: 3}` et **non** l'ordre de la liste `SAISONS` : s'y tromper décale toute une année.
- **`saisonDe` suit le calendrier local, `debutDePeriodeInterrogee` suit l'UTC**, et les aligner
  casserait l'une des deux (CLAUDE.md, C2.4). L'appariement d'un bilan est une question
  **calendaire et humaine** : il lit le local.
- **Les bornes de date se comparent en chaînes, jamais en `Date`** : `new Date('2026-11-30')` est
  minuit UTC, donc le 29 à l'ouest de Greenwich.
- **`/suivi` ne nomme jamais un manqué**, et cette règle vaut ici : « tu n'as pas fait de bilan
  l'automne dernier » est une façon de compter les absences.
- **Ramille ne dit jamais un nombre.** L'écart d'une année sur l'autre est de la voix produit, comme
  le pied d'un point répondu et le récapitulatif de la carte d'ouverture.
- **La note de méthode voyage avec le chiffre** (§3), pas en bas d'un écran qu'on ne déroule pas.

## 7. Ce que cette page demande

Une décision sur **D4 en premier** (couche partagée avec C6.5 — recommandé), puis D1, D2 et D3, qui
sont des choix de formulation et de repli et peuvent se trancher à l'écriture.

**Effort : moyen**, et il est presque entièrement en dérivation pure et en tests — la donnée
nécessaire est en base depuis C2.8. C'est aussi le chantier dont le **report ne coûte rien
aujourd'hui** et coûtera tout dans un an : personne ne peut en bénéficier avant d'avoir deux bilans
à quatre saisons d'écart, et le premier compte réel a été créé il y a moins de trois semaines.
