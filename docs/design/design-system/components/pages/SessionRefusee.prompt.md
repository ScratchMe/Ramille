L'écran qui s'affiche quand le serveur refuse la session d'un compte — un jeton révoqué, un compte supprimé ailleurs.

```jsx
<SessionRefusee onRetrouver={retrouver} onCommencer={commencer} />
```

**On ne recrée pas une session vide en silence** : ce serait donner un compte vide à quelqu'un qui en a un. L'écran dit le fait, sans reproche — le bilan est rattaché au compte, pas à l'appareil — et Ramille est là, calme.

**Deux sorties, jamais une** : « J’ai déjà un compte », en plein, mène à la reconnexion par code ; « Commencer un bilan sur cet appareil », en lien, laisse repartir de zéro à qui n'a plus accès à son adresse. Un écran qui ne laisserait que la reconnexion serait une impasse.
