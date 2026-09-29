La première étape du questionnaire (B1.1) : la personne a-t-elle un trajet régulier pour le travail ou les études. L’étape rend son contenu ; l’écran du questionnaire la pose dans `StepShell`, qui porte l’en-tête, le mot de Ramille à l’entrée de la section et le pied collant.

```jsx
<StepShell section="Domicile-travail" step={1} total={9} entree={{ cle: 'commute_has_trip', sens }}
  manque={manqueDeLEtape('commute_has_trip', answers)} reponsesDonnees={reponsesDonnees} onNext={suivant}
  motDeRamille="À peu près, c’est déjà bien. Je ne vérifie rien, et personne ne relit.">
  <CommuteHasTripStep answers={answers} update={update} />
</StepShell>
```

**La question s’écrit une fois et sert deux fois** : le titre de l’étape (`screenTitle`, l’en-tête de niveau 1 de l’écran) et le nom du groupe qui porte les deux `ChoiceRow` « Oui » et « Non ». Rien n’est coché d’avance : au toucher du « Suivant » en attente, « Il manque encore une réponse. » pose le focus sur « Oui », et le titre ne se recolore pas — c’est lui, la question.

**« Non » n’écrit qu’une réponse.** Ce qu’elle rend caduc — jours, distance, modes, second mode, motorisation — est effacé par l’écran du questionnaire après chaque `update`, seul endroit où cette liste vit : une étape qui énumérerait les champs à remettre à zéro finirait par en oublier un. Sans trajet régulier, les trois étapes suivantes disparaissent, et l’en-tête passe de neuf étapes à six.

**La ligne d’aide dit la limite du produit, et n’ouvre rien.** Elle nomme les situations qui répondent Non (télétravail total, sans emploi, retraité) et dit que les déplacements faits pendant le travail ne sont pas comptés — le bilan couvre le trajet vers le travail. Ni question, ni promesse. En `small` tertiaire, interligne 21.
