L'étape qui ouvre la section « Voyages longue distance » : « Combien de vols prends-tu dans une année type ? », puis, dès un vol, combien sont courts. Elle se pose dans `StepShell`.

```jsx
<StepShell section="Voyages longue distance" step={7} total={9} onBack={back} onNext={next}>
  <FlightsStep answers={{ flights_total_per_year: 4, flights_short_per_year: 3 }} update={update} />
</StepShell>
```

**« Un aller-retour compte pour deux vols. »** La ligne est sous le titre et ne se retire pas : « combien de fois » laissait le facteur 2 au hasard, sur le poste le plus lourd de la plupart des bilans. C'est la question qui lève l'ambiguïté, pas le calcul.

**Onze puces en pilule, de 0 à « 10+ »**, dans un groupe nommé par la question — sinon onze chiffres s'annonceraient sans rien qui dise ce qu'ils comptent. La dernière vaut « ce nombre ou plus » : l'œil lit « 10+ », le lecteur d'écran entend « 10 vols ou plus », et les deux descendent du même plafond.

**La répartition n'apparaît qu'à partir d'un vol**, sous un filet `border` : « Sur ces 4, combien sont courts ? » en sous-titre 22/28, « Europe, moins de 3 h. Le reste est compté comme long-courrier. », puis des puces de 0 au total, rayon 14. Changer le total ramène les courts sous lui. Une fois répondu, le produit dit ce qu'il comptera : « 1 vol long-courrier sera compté. »

**Les distances supposées s'affichent en bas**, comme sur l'étape des longs trajets : « Distances moyennes par défaut · 1 500 km court et moyen-courrier, 9 000 km long-courrier ». Elles sont interpolées depuis les hypothèses du calcul, jamais réécrites, en Spline Sans `small` tertiaire — une phrase adressée à la personne, pas un code.
