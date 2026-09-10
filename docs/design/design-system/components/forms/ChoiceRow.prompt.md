Liste de choix exclusifs en rangées : rôle radio, sélection = teinte + bordure accent 1,5 px + poids 600.

```jsx
<ChoiceRow label="Oui" selected />
<ChoiceRow label="Notification" detail="Sur ce téléphone, le lundi matin." selected={false} />
```

Avec `detail`, c’est la ligne des rappels (FeuilleRappels, ChoixDeRappel). `disabled` = opacité 0,6, la raison est dans `detail`.
