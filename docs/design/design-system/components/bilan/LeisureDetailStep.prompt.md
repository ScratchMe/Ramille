L'étape qui suit la fréquence des sorties, quand elle n'est pas « Rarement » : « Avec quel mode, principalement ? » puis « Quelle distance aller, en général ? », deux questions sur un même écran de `StepShell`.

```jsx
<StepShell section="Loisirs du week-end" step={6} total={9} entree={{ cle: 'leisure_detail', sens }}
  manque={manqueDeLEtape('leisure_detail', answers)} reponsesDonnees={reponsesDonnees} onBack={back} onNext={next}>
  <LeisureDetailStep answers={answers} update={update} />
</StepShell>
```

**Quatre modes en avant, cinq derrière « Voir les autres modes », rangés par famille comme la liste du trajet** (29/09/2026) — Voiture (seul), Voiture (covoiturage) · Train · Vélo ; puis, en un bloc sous les quatre premiers, Deux-roues motorisé · Bus, Métro ou tram · Marche, Trottinette ou mobilité douce. 4 entre deux modes d'une famille, 16 entre deux familles et entre les deux blocs ; les cinq autres ne s'intercalent jamais dans la première liste. La liste s'ouvre d'emblée si la réponse déjà donnée y vit : sinon, sur un re-bilan pré-rempli, la question paraîtrait vide alors qu'elle est remplie, et la personne cocherait autre chose pour avancer. Le lien suit le groupe sans y entrer — c'est une commande, pas une option —, à 8 sous lui, et quand on l'active, il disparaît : **le focus va au premier mode révélé**, « Deux-roues motorisé », qui est là où était le lien. Jamais au montage d'une liste déjà ouverte.

**Chaque précision s'ouvre sous le mode qui la déclenche, dans le groupe, dans une `BoiteDePrecision`** (8 sous lui, 12 de marge intérieure) : « Quelle motorisation ? » sous les deux voitures, « Quel type de deux-roues ? », « Quel type de train ? » (TER ou train régional, RER ou Transilien, Intercités), « Quel type de vélo ? » (Mécanique, À assistance électrique). Sous le covoiturage, la taille — « Vous êtes combien dans la voiture ? », en puces (`PrecisionChiffres`) — suit la motorisation, **dans la même boîte** : les deux décrivent la même voiture, et une sortie à quatre ne compte pas quatre fois. Les deux voitures écrivent le même mode ; c'est la rangée choisie qui dit sous laquelle la précision s'ouvre.

**La distance est une tranche, en pilules, et « Plus de 30 km » demande combien** : la seule tranche sans borne haute ouvre « Environ combien, pour un aller ? » et un `NumericField` en km, **après** les puces — elles reviennent à la ligne, il n'y a pas d'élément sous lequel se glisser. Un filet `border` de 1 sépare les deux questions ; la seconde est un sous-titre à 22/28, sous le titre d'étape. En bas, centré, `MissingModeLink` pour le mode qui manque.

**La distance est souvent sous le pied**, une précision ouverte au-dessus d'elle : le filet du pied dit qu'il y a une suite. Au toucher du « Suivant » en attente, « Il manque encore la distance habituelle. » fait descendre l'écran jusqu'aux tranches, 16 au-dessus du pied, pose le focus sur « Moins de 5 km » (ou la tranche cochée) et passe le sous-titre en `accentText` ; « la distance d’une sortie » donne le focus au champ lui-même. « Ton mode de transport » mène à la liste sans recolorer le titre.
