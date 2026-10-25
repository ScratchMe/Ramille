La carte du cap de la saison, sur l'écran du plan : après les pistes au tout premier plan, avant elles ensuite.

```jsx
<CarteDuCap
  capKg={384} chiffreLeCap cadenceDeSaison reductionPct={20}
  posteEnMots="ton trajet domicile-travail" baselineEnMots="1,9 t CO₂e"
  phraseDuCap="Chacune des deux pistes proposées suffit à le franchir."
  periodLabel="Automne 2026" finDeLaPeriode="jusqu’au 30 novembre" progression={0.6} traitDeTemps />
```

**« par an » d'abord** : le cap est un chiffre annuel — 20 % du poste dominant, sur un an — alors que l'étiquette dit « cette saison ». La saison est le temps qu'on se donne ; la quantité se compte à l'année, comme les pistes à côté, en kg. **Une part du poste dominant, jamais de l'empreinte entière** : annoncer −20 % du total serait une promesse fausse.

**Elle se rend même sans cap** — elle est l'endroit où la période se nomme, avec sa fin. **Le trait mesure la saison, pas la personne** : `accentMuted`, et sa légende le dit en mots ; il n'est pas là au tout premier plan, où il n'y a encore rien à mesurer, et sa légende part avec lui.
