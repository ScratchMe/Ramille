Puce de sélection du questionnaire et du choix des jours. `solid` pour un nombre ou une tranche, `outline` pour un choix binaire ou une échéance.

```jsx
<Chip label="3" selected flex radius={14} />
<Chip label="Oui" selected selectedStyle="outline" />
```

Jours : `flex` + `radius={14}` + `ariaLabel` long (« Mardi »). Échéances : `radius={16}` + `outline`.
