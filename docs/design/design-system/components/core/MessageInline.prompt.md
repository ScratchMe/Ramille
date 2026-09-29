Dit qu’une action n’a pas abouti, sous le bouton qui l’a déclenchée. Ton neutre : ce qui est attendu, pas ce qui est faux.

```jsx
<MessageInline message="Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie." />
```

Pas de rouge, pas d’icône. « Ce qui manque » avant d’avancer n’est pas un échec et ne passe pas par ici : c’est la ligne de `StepShell`, qui n’apparaît qu’au toucher du « Suivant » en attente — un lien small 600 `accentText` vers la question, jamais une alerte.
