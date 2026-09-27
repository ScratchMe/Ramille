L'étape qui suit la fréquence des sorties, quand elle n'est pas « Rarement » : « Avec quel mode, principalement ? » puis « Quelle distance aller, en général ? », deux questions sur un même écran de `StepShell`.

```jsx
<StepShell section="Loisirs du week-end" step={6} total={9} onBack={back} onNext={next} nextDisabled={!complete} manque="ton mode de transport">
  <LeisureDetailStep answers={answers} update={update} />
</StepShell>
```

**Quatre modes en avant, cinq derrière « Voir les autres modes »** — voiture seul, covoiturage, train, vélo ; puis bus, métro ou tram, marche, deux-roues motorisé, trottinette. La liste s'ouvre d'emblée si la réponse déjà donnée y vit : sinon, sur un re-bilan pré-rempli, la question paraîtrait vide alors qu'elle est remplie, et la personne cocherait autre chose pour avancer. Le lien suit le groupe sans y entrer — c'est une commande, pas une option — et quand on l'active, il disparaît : **le focus va au premier mode révélé**, pas au haut de la page. Jamais au montage d'une liste déjà ouverte.

**Chaque précision s'ouvre sous le mode qui la déclenche, dans le groupe, à 8 sous lui** : « Quelle motorisation ? » sous les deux voitures, « Quel type de deux-roues ? », « Quel type de train ? » (TER ou train régional, RER ou Transilien, Intercités), « Quel type de vélo ? » (Mécanique, À assistance électrique). Sous le covoiturage, la taille — « Vous êtes combien dans la voiture ? », en puces (`PrecisionChiffres`) — suit la motorisation : les deux décrivent la même voiture, et une sortie à quatre ne compte pas quatre fois. Les deux voitures écrivent le même mode ; c'est la rangée choisie qui dit sous laquelle la précision s'ouvre.

**La distance est une tranche, en pilules, et « Plus de 30 km » demande combien** : la seule tranche sans borne haute ouvre « Environ combien, pour un aller ? » et un `NumericField` en km, **après** les puces — elles reviennent à la ligne, il n'y a pas d'élément sous lequel se glisser. Un filet `border` de 1 sépare les deux questions ; la seconde est un sous-titre à 22/28, sous le titre d'étape. En bas, centré, `MissingModeLink` pour le mode qui manque.
