Liste de choix exclusifs en rangées : rôle radio, sélection = teinte + bordure accent 1,5 px + poids 600.

```jsx
<ChoiceRow label="Oui" selected />
<ChoiceRow label="Notification" detail="Sur ce téléphone, le lundi matin." selected={false} />
```

Avec `detail`, c’est la ligne des rappels (FeuilleRappels, ChoixDeRappel). `disabled` = fond élément, titre en texte tertiaire, `detail` en texte secondaire — jamais une opacité, qui faisait tomber le détail, la phrase qui dit pourquoi, à 3,2:1 — et jamais l’air choisie, même quand elle porte la préférence enregistrée.
