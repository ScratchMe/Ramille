La dernière étape du questionnaire, « Quel est ton contexte de mobilité ? » : une introduction, puis les quatre questions de `ChampsDeContexte`. Elle se pose dans `StepShell` (section « Contexte de mobilité »), dont le bouton dit alors « Voir mon bilan ».

```jsx
<StepShell section="Contexte de mobilité" step={9} total={9} entree={{ cle: 'context', sens }}
  manque={manqueDeLEtape('context', answers)} reponsesDonnees={reponsesDonnees} onBack={back} onNext={submit} nextLabel="Voir mon bilan">
  <ContextStep answers={answers} update={update} />
</StepShell>
```

**La règle du plan se dit une fois, et c'est Ramille qui la dit** (01/10/2026, `v1-33` D7) : elle ouvre la section par « Ce qui est possible là où tu vis change ce que je te proposerai ensuite. », dans l'en-tête de `StepShell`. L'introduction de l'étape la redisait, deux cents pixels plus bas, dans le même gris (« Ton plan ne propose que ce qui tient avec ces réponses. ») : elle est partie de l'étape, et reste sur l'écran `/contexte`, qui n'a pas de Ramille.

**L'introduction se dérive de la fréquence des sorties, et ne s'écrit jamais en dur.** Pour la plupart des profils, « Elles n’entrent pas dans le calcul de ton bilan. » est vraie ; pour qui sort rarement, le nombre de véhicules du foyer décide du mode des sorties occasionnelles, donc du total, et la phrase devient « Une seule entre dans le calcul de ton bilan : le nombre de véhicules du foyer, qui sert à estimer tes sorties occasionnelles. » C'est justement le profil sobre, où l'écart pèse le plus.

**Les questions ne vivent pas ici** : elles sont dans `ChampsDeContexte`, que l'écran `/contexte` rend aussi avec sa propre introduction. Corriger une question, c'est la corriger là-bas, pour les deux écrans. Le titre est celui de l'étape (`screenTitle`), à 8 de l'introduction ; les questions suivent à 24.
