La dernière étape du questionnaire, « Quel est ton contexte de mobilité ? » : une introduction, puis les quatre questions de `ChampsDeContexte`. Elle se pose dans `StepShell` (section « Contexte de mobilité »), dont le bouton dit alors « Voir mon bilan ».

```jsx
<StepShell section="Contexte de mobilité" step={9} total={9} entree={{ cle: 'context', sens }}
  manque={manqueDeLEtape('context', answers)} reponsesDonnees={reponsesDonnees} onBack={back} onNext={submit} nextLabel="Voir mon bilan">
  <ContextStep answers={answers} update={update} />
</StepShell>
```

**L'introduction dit la règle, pas une intention** : « Ton plan ne propose que ce qui tient avec ces réponses. » Elle dit ce qui se passe, et c'est ce qui rend l'encart du plan lisible plus tard comme une prémisse, pas comme une surprise.

**La seconde phrase se dérive de la fréquence des sorties, et ne s'écrit jamais en dur.** Pour la plupart des profils, « Elles n’entrent pas dans le calcul de ton bilan. » est vraie ; pour qui sort rarement, le nombre de véhicules du foyer décide du mode des sorties occasionnelles, donc du total, et la phrase devient « Une seule entre dans le calcul de ton bilan : le nombre de véhicules du foyer, qui sert à estimer tes sorties occasionnelles. » C'est justement le profil sobre, où l'écart pèse le plus.

**Les questions ne vivent pas ici** : elles sont dans `ChampsDeContexte`, que l'écran `/contexte` rend aussi avec sa propre introduction. Corriger une question, c'est la corriger là-bas, pour les deux écrans. Le titre est celui de l'étape (`screenTitle`), à 8 de l'introduction ; les questions suivent à 24.
