Dit qu’une action n’a pas abouti, sous le bouton qui l’a déclenchée. Ton neutre : ce qui est attendu, pas ce qui est faux.

```jsx
<MessageInline message="Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie." />
```

Il se lit à l’encre du texte (`text`, graisse 500, corps `small`) et non à celle de l’aide (`textSecondary`) : posé sous un texte d’aide de même corps — « 8 chiffres, sans espace… » au-dessus de « Ce code ne marche pas : … » —, ce qui vient de changer doit se distinguer de ce qui était déjà là. Le succès d’une action qui n’a pas d’autre retour y passe aussi et prend la même encre.

Pas de rouge, pas d’icône : l’encre n’est pas une couleur de verdict. « Ce qui manque » avant d’avancer n’est pas un échec et ne passe pas par ici : c’est la ligne de `StepShell`, qui n’apparaît qu’au toucher du « Suivant » en attente — un lien small 600 `accentText` vers la question, jamais une alerte.
