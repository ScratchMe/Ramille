La troisième étape du questionnaire (B1.4) : le mode principal du trajet domicile-travail, parmi neuf, et la précision que ce mode appelle, ouverte juste sous lui. L’étape rend son contenu ; l’écran du questionnaire la pose dans `StepShell`.

```jsx
<StepShell section="Domicile-travail" step={3} total={9} onBack={retour} onNext={suivant} nextDisabled={!!manque} manque={manque}>
  <CommuteModeStep answers={answers} update={update} />
</StepShell>
```

**Neuf entrées, jamais une de plus.** « Voiture (seul) » et « Voiture (covoiturage) » sont deux entrées du même mode ; la motorisation, le type de deux-roues, de train ou de vélo ne sont jamais des entrées supplémentaires mais des questions de suivi (`PrecisionMode`), qui ne coûtent qu’à ceux qu’elles concernent. Une liste qui gonfle est ce qui fait abandonner un questionnaire. Les motorisations sont quatre réponses au même niveau, sans second « rechargeable ou non ? ».

**La précision s’ouvre sous l’option choisie, dans la liste, à 8 px — jamais après la liste.** Après neuf modes, elle tomberait sous le pied collant : un mode sélectionné, un « Suivant » grisé, et rien pour dire qu’il reste une question. Chaque précision est son propre groupe, posé dans celui des modes : « Hybride » répond à « Quelle motorisation ? », jamais au mode.

**Sous « Voiture (covoiturage) », deux précisions, dans cet ordre** : la motorisation, puis « Vous êtes combien à partager ce trajet ? » (`PrecisionChiffres`, de 2 à « 6+ »). Les deux décrivent la même voiture ; la taille est obligatoire, sans quoi le choix du covoiturage ne changerait rien au chiffre.

**L’étape n’écrit que ce que la personne vient de choisir.** Ce que ce choix rend impossible — la taille d’un covoiturage qu’on a quitté, la motorisation d’une voiture qu’on n’a plus — est effacé par l’écran du questionnaire après chaque `update`, jamais par l’étape. Sous la liste, `MissingModeLink`.
