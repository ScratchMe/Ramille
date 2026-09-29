La jumelle chiffrée de `PrecisionMode` : une question de précision dont les réponses sont des nombres — combien vous êtes à partager le trajet, combien dans la voiture —, posée dans `BoiteDePrecision`, sous l’option qui la déclenche.

```jsx
<ModeListItem label="Voiture (covoiturage)" selected />
<BoiteDePrecision>
  <PrecisionMode champ="commute_car_engine" question="Quelle motorisation ?" options={MOTORISATIONS} valeur="hybride" onChange={setMotorisation} />
  <PrecisionChiffres
    champ="commute_carpool_size"
    question="Vous êtes combien à partager ce trajet ?"
    options={[
      { value: 2, label: '2', accessibilityLabel: '2 personnes' },
      { value: 3, label: '3', accessibilityLabel: '3 personnes' },
      { value: 4, label: '4', accessibilityLabel: '4 personnes' },
      { value: 5, label: '5', accessibilityLabel: '5 personnes' },
      { value: 6, label: '6+', accessibilityLabel: '6 personnes ou plus' },
    ]}
    valeur={3}
    onChange={setTaille}
  />
</BoiteDePrecision>
```

**Des puces, pas des rangées — et c’est l’inverse de sa jumelle pour une raison précise.** `PrecisionMode` prend des rangées parce que des libellés inégaux (« Hybride », « Hybride rechargeable ») faisaient un retour à la ligne en escalier. Des chiffres ont tous la même largeur et tiennent à cinq sur une ligne ; cinq rangées hautes pour cinq chiffres feraient une liste plus longue que la question. Les puces sont rangées par la grille de `GroupeDeChoix` (`colonnes={options.length}`), pleines une fois choisies, au rayon `Radius.chip` (14) : cinq colonnes égales quand elles tiennent, et un retour à la ligne quand une cible de 48 n’y tiendrait plus. Depuis que la boîte n’a plus que 12 de marge intérieure, cinq puces tiennent à 360 dp, à 0 px près ; une taille d’affichage agrandie fait encore passer la cinquième à la ligne.

**Elle ne dessine pas de boîte** (29/09/2026) : sous une voiture, elle partage celle de la motorisation, à 16 d’elle. Même intitulé que sa jumelle — small `textSecondary`, 8 au-dessus des puces. Les puces non choisies prennent le fond de la page (`nestedBackground`) : sur le gris de la boîte, elles n’auraient plus de bord.

**Un `radiogroup` nommé par la question, jamais un libellé répété sur chaque puce.** Une étape peut porter plusieurs séries de puces identiques, et en navigation de contrôle en contrôle plus rien ne dirait dans laquelle on se trouve : nommer le groupe le dit une fois. Quand le chiffre seul ne dit pas ce qu’il compte, chaque option porte son `accessibilityLabel` — la dernière puce d’un plafond surtout, que l’œil lit « 6+ » et qu’un lecteur d’écran annoncerait « six plus ». Une boîte qui porte deux précisions porte deux groupes, jamais un groupe fusionné.

**`champ`** : si c’est elle qui manque au toucher du « Suivant » en attente, l’écran y défile, le focus va à sa puce cochée ou à la première, et l’intitulé passe en `accentText` 600.
