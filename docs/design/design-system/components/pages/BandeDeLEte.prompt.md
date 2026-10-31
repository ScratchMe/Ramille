Les trois figures du récit de la page d'accueil du web (31/10/2026, `docs/architecture/v1-36-la-page-d-accueil.md`). Elles n'existent que là.

```jsx
<BandeDeLEte grande />
<EchelleDesEtes />
<PartDuTransport />
```

**Des données, pas des illustrations.** `BandeDeLEte` dessine l'été 2026 jour par jour, d'après le bilan climatique de Météo-France : 92 traits, pleins les 53 jours de vague de chaleur (du 17 au 30 juin, du 4 au 19 juillet, du 28 juillet au 19 août). `EchelleDesEtes` place aujourd'hui, la France à +2,7 °C vers 2050 et à +4 °C vers 2100, la trajectoire que cite Météo-France, et dit ce qu'un été comme 2026 y devient. `PartDuTransport` montre les cinq postes de l'empreinte moyenne (SDES, données 2017), le transport en tête. Les valeurs viennent de `src/constants/climat.ts` et de `carbon-reference.ts` (la fiche les recopie pour se dessiner) : une maquette ne les change pas, et dit ce qu'un été comme 2026 devient à +4 °C **pour la chaleur seulement** — Météo-France le dit des températures, pas de la pluie.

**La chaleur se lit à la durée, pas à la couleur** : l'encre pour les jours de vague, le filet neutre pour les autres, un seul accent pour ce qu'on vient voir. Ni rouge, ni orange, ni icône d'alerte, ni vocabulaire de catastrophe.

**Le lecteur d'écran entend la phrase**, pas le dessin : chaque figure porte la sienne (`aria-label`), et ses traits sont muets.

**Le mouvement dit la donnée** : dans l'app, la bande se remplit dans l'ordre de l'été, le trait de l'échelle descend d'un repère à l'autre, la barre se remplit poste par poste — une fois, quand la figure paraît, et posé sous « réduire les animations ». Jamais un compteur qui défile.

**Ramille n'est pas à côté** : ce sont des chiffres lourds.
