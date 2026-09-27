L'écran qui remplace l'app quand un build n'a pas ses variables Supabase.

```jsx
<ConfigurationManquante problemes={[{ type: 'manquante', variable: 'EXPO_PUBLIC_SUPABASE_ANON_KEY' }]} />
```

**Il ne s'adresse pas à la personne qui utilise Ramille**, mais à qui a construit l'app : il nomme la variable en cause, en chasse fixe — c'est une clé à recopier au caractère près —, puis ce qu'il faut faire en développement et sur un build EAS. Pas de Ramille, pas de « Réessayer » : relancer ne change rien tant que la configuration manque.
