La feuille qui s'ouvre **à l'entrée du questionnaire, avant la première étape**, quand un nouveau bilan va recalculer un plan qui porte un engagement de la période en cours. Elle s'ouvrait sur « Voir mon bilan », au terme de neuf étapes, et y disait « ton bilan actuel est toujours juste » à quelqu'un qui venait d'y passer plusieurs minutes : la fin colorait tout l'effort (01/10/2026, `v1-33` §6). Dite avant, la même phrase aide à décider s'il vaut la peine de commencer.

```jsx
<FeuilleNouveauBilan engagement={{ action: 'Faire un trajet sur cinq à vélo', intention: 'le mardi et le jeudi' }} />
```

**Elle dit la règle au conditionnel**, parce que c'est la seule forme vraie dans les deux cas : l'action et son moment restent engagés si le nouveau plan propose encore cette action, sinon l'action ne l'est plus. Elle a d'abord annoncé une perte certaine, et c'était faux dans le cas courant ; puis elle a promis « tu en choisiras une autre », faux quand le nouveau plan n'a aucune action (27/09/2026).

**Elle informe, elle ne refuse pas** : « Commencer » redescend sur la première étape, « Pas maintenant » (ou le geste de retour) ressort vers l'écran d'où l'on vient — la restitution, le suivi, le plan. La soumission ne la rouvre pas. La seconde ligne, en tertiaire, est le cadrage — une habitude met du temps à prendre — sans l'imposer. **Sans Ramille** : elle encourage, elle n'explique pas une mécanique. Le cadre est `FeuilleDuBas`, titre affiché.
