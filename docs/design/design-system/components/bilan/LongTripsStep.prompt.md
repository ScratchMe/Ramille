L'étape « Et les trajets de plus de 300 km ? », après les vols dans la section « Voyages longue distance » : trois séries de puces — en train, en autocar, en voiture — sur une année type, hors avion. Elle se pose dans `StepShell`.

```jsx
<StepShell section="Voyages longue distance" step={8} total={9} entree={{ cle: 'long_trips', sens }}
  manque={manqueDeLEtape('long_trips', answers)} reponsesDonnees={reponsesDonnees} onBack={back} onNext={next}>
  <LongTripsStep answers={answers} update={update} />
</StepShell>
```

**Trois séries identiques, et c'est le nom du groupe qui les distingue.** Chacune va de 0 à « 10+ », rayon 14, sous son intitulé (« En train », « En autocar », « En voiture »). En navigation de contrôle en contrôle, le groupe arrive seul : il porte donc la forme complète, qui contient l'intitulé — « Trajets longue distance en train » —, dérivée de lui plutôt que recopiée. La puce de plafond s'entend « 10 trajets ou plus » ; les autres gardent leur chiffre, le groupe disant une fois de quelle série il s'agit.

**Seule la voiture ouvre des précisions, et elles suivent le groupe sans y entrer** : dès un trajet, « Quelle motorisation ? » (`PrecisionMode`) puis « Vous êtes combien dans la voiture ? » (`PrecisionChiffres`, de 1 à « 5+ »), **dans une seule `BoiteDePrecision`**, 8 sous les puces, à 16 l’une de l’autre (29/09/2026 — elles avaient chacune leur boîte). Elles dépendent d'un compte non nul, pas d'une option : il n'y a pas de puce sous laquelle les ranger. Le nombre de personnes commence à 1, qui est une réponse — partir à trois divise l'empreinte par trois. Revenir à 0 efface la motorisation. Au toucher du « Suivant » en attente, « la motorisation » ou « le nombre de personnes dans la voiture » mène à la précision, dont l’intitulé passe en `accentText` 600.

**L'autocar n'a pas de question de suivi** : la personne ne choisit ni la motorisation ni le remplissage d'un autocar, ce n'est pas son véhicule. Il a la même plage que le train et la voiture. En bas, les distances supposées, en `small` tertiaire : « Distances moyennes par défaut · 800 km train, 700 km autocar et voiture ».
