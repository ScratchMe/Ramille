La deuxième étape du questionnaire (B1.2 / B1.3) : combien de jours par semaine se fait le trajet, puis la distance d’un aller — en kilomètres, ou par tranche quand on ne la connaît pas. L’étape rend son contenu ; l’écran du questionnaire la pose dans `StepShell`.

```jsx
<StepShell section="Domicile-travail" step={2} total={9} onBack={retour} onNext={suivant} nextDisabled={!!manque} manque={manque}>
  <CommuteDaysDistanceStep answers={answers} update={update} />
</StepShell>
```

**Les jours en puces, rangées en grille de quatre colonnes** (« 1 2 3 4 / 5 6 7 ») : sur une ligne, sept puces ne tiendraient pas la cible de 48. Des puces et non un curseur : sur une plage de un à sept, elles ont la même précision. Un filet `border` sépare les jours de la distance, qui prend un sous-titre plus petit que le titre de l’étape.

**« Je ne sais pas » bascule vers les tranches, « Je connais la distance exacte » en revient — et chacun efface la réponse de l’autre forme.** C’est ce qui rend vraie la phrase posée sous la tranche choisie, « On comptera environ 10 km pour un aller. » : le calcul compte une tranche par son milieu, mais préfère le kilométrage dès qu’il existe. La phrase est la voix du produit, pas celle de Ramille, qui ne dit jamais un nombre. Ce qui est affiché — le champ ou les tranches — est un état de l’étape, pas une réponse : il doit basculer avant qu’une tranche soit choisie.

**Une longue distance se fait relire, jamais refuser.** Au-delà de 200 km pour un aller, une ligne secondaire demande de vérifier qu’il s’agit d’un seul trajet, le retour étant déjà compté : elle attrape le 1200 tapé au lieu de 120, sur le poste le plus lourd du bilan, et laisse passer l’aller de 250 km qui existe. Pas de rôle d’alerte, pas de couleur : ce n’est pas un échec.

**La ligne des tranches ne promet que ce qui existe** : « Une estimation suffit. » — un chiffre plus précis se donne en refaisant son bilan, dont les réponses sont préremplies. Aucune relance n’existe pour redemander une distance, donc aucune ne s’annonce.
