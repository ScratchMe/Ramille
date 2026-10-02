L'étape des trajets de plus de 300 km, après les vols dans la section « Voyages longue distance ». **Elle s'ouvre par une question** (01/10/2026, `v1-33` D1) : « Hors avion, fais-tu des trajets de plus de 300 km sur une année type ? », en Oui / Non. Elle se pose dans `StepShell`.

```jsx
<StepShell section="Voyages longue distance" step={8} total={9} entree={{ cle: 'long_trips', sens }}
  manque={manqueDeLEtape('long_trips', answers, horsColonnes)} reponsesDonnees={reponsesDonnees} onBack={back} onNext={next}>
  <LongTripsStep answers={answers} update={update} reponse={reponseAuxLongsTrajets(answers, horsColonnes)} repondre={repondre} />
</StepShell>
```

**Rien n'est coché à l'arrivée.** Les trois séries arrivaient avec leur « 0 » coché et un « Suivant » actif : on traversait le poste sans un toucher, et un « 0 » qu'on n'a pas choisi sous-estime les voyages. La question se pose en deux puces cernées côte à côte, `Radius.field` (16), comme le « Oui / Non » du second mode, et « Il manque encore une réponse. » se dit au toucher du « Suivant » en attente. **« Non » vaut zéro partout** : pour la majorité, l'étape passe de trente-trois cibles à deux. Sous la question, en `small` tertiaire : « Un aller-retour compte pour deux trajets. » — le calcul compte 800 ou 700 km par trajet, un aller, comme un vol (D2).

**« Oui » ouvre les trois séries sous lui, sans aucune puce cochée**, à 32 du Oui / Non, en dépli (et l'écran remonte pour les montrer, sans faire passer le Oui / Non au-dessus du bord). L'étape réclame alors **au moins un trajet**, dans l'une des trois : « Il manque encore le nombre de trajets. » marque les trois intitulés, et le focus va à la première série. Une série laissée vide vaut zéro. Un re-bilan prérempli rouvre « Oui » si un compteur est non nul, « Non » sinon.

**Trois séries identiques, en pilule comme les nombres de vols, et c'est le nom du groupe qui les distingue.** Chacune va de 0 à « 10+ », sous son intitulé (« En train », « En autocar », « En voiture »). En navigation de contrôle en contrôle, le groupe arrive seul : il porte donc la forme complète, qui contient l'intitulé — « Trajets longue distance en train » —, dérivée de lui plutôt que recopiée. La puce de plafond s'entend « 10 trajets ou plus » ; les autres gardent leur chiffre, le groupe disant une fois de quelle série il s'agit.

**Seule la voiture ouvre des précisions, et elles suivent le groupe sans y entrer** : dès un trajet, « Quelle motorisation ? » (`PrecisionMode`) puis « Vous êtes combien dans la voiture ? » (`PrecisionChiffres`, de 1 à « 5+ »), **dans une seule `BoiteDePrecision`**, 8 sous les puces, à 16 l’une de l’autre (29/09/2026 — elles avaient chacune leur boîte). Elles dépendent d'un compte non nul, pas d'une option : il n'y a pas de puce sous laquelle les ranger. Le nombre de personnes commence à 1, qui est une réponse — partir à trois divise l'empreinte par trois. Revenir à 0 efface la motorisation. Au toucher du « Suivant » en attente, « la motorisation » ou « le nombre de personnes dans la voiture » mène à la précision, dont l’intitulé passe en `accentText` 600.

**« 10+ » ouvre un champ dans chaque série, réclamé** (02/10/2026, `v1-33` §6, `ChampDuPlafond`) : « Environ combien, sur une année ? », sous les puces de la série — et, pour la voiture, avant la boîte, qui attend le nombre. La puce enregistrait 10. Le champ vide se réclame avant « au moins un trajet » : « Il manque encore le nombre de trajets en voiture. », même quand le train compte deux trajets — une série vide vaut zéro, et sans cela le « 10+ » de la voiture passait pour aucun trajet. « Oui » comme « Non » retirent les « 10+ » des séries. Vider le champ de la voiture pour le retaper fait reposer la motorisation et le nombre de personnes : un compte vide les efface, et c'est `normaliserReponses` seule qui efface.

```jsx
<LongTripsStep answers={{ train_long_trips_per_year: 2, coach_long_trips_per_year: 0, car_long_trips_per_year: null }} reponse
  plafond={(compte) => compte === 'car_long_trips_per_year'} update={update} repondre={repondre} />
```

**L'autocar n'a pas de question de suivi** : la personne ne choisit ni la motorisation ni le remplissage d'un autocar, ce n'est pas son véhicule. Il a la même plage que le train et la voiture. En bas, sous « Oui » comme sous « Non », les distances supposées, en `small` tertiaire : « Distances moyennes par défaut · 800 km train, 700 km autocar et voiture ».
