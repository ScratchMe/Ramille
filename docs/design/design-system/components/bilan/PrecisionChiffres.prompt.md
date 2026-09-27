La jumelle chiffrée de `PrecisionMode` : une question de précision dont les réponses sont des nombres — combien vous êtes à partager le trajet, combien dans la voiture —, posée dans la liste, juste sous l’option qui la déclenche.

```jsx
<ModeListItem label="Voiture (covoiturage)" selected />
<PrecisionChiffres
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
```

**Des puces, pas des rangées — et c’est l’inverse de sa jumelle pour une raison précise.** `PrecisionMode` prend des rangées parce que des libellés inégaux (« Hybride », « Hybride rechargeable ») faisaient un retour à la ligne en escalier. Des chiffres ont tous la même largeur et tiennent à cinq sur une ligne ; cinq rangées hautes pour cinq chiffres feraient une liste plus longue que la question. Les puces sont équiréparties (`flex`), pleines une fois choisies, au rayon `Radius.chip` (14).

**Même encart, même retrait** : fond `backgroundElement`, rayon 16, padding 16, retrait gauche de 16 — l’encart se lit rattaché à l’option du dessus, pas comme un bloc de plus. Les puces non choisies prennent le fond de la page (`nestedBackground`) : sur le gris de l’encart, elles n’auraient plus de bord.

**Un `radiogroup` nommé par la question, jamais un libellé répété sur chaque puce.** Une étape peut porter plusieurs séries de puces identiques, et en navigation de contrôle en contrôle plus rien ne dirait dans laquelle on se trouve : nommer le groupe le dit une fois. Quand le chiffre seul ne dit pas ce qu’il compte, chaque option porte son `accessibilityLabel` — la dernière puce d’un plafond surtout, que l’œil lit « 6+ » et qu’un lecteur d’écran annoncerait « six plus ».
