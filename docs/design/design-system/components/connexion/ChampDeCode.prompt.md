Le champ du code reçu par email — huit chiffres, qui remplacent le lien des deux e-mails (rattacher une adresse, retrouver un compte).

```jsx
<ChampDeCode value={code} onChangeText={setCode} />
```

**Huit chiffres, pas six** : c'est une valeur de sécurité, pas un réglage d'interface. Le champ ne garde que les chiffres et coupe à huit, donc un code collé avec des espaces ou un tiret entre tel quel.

**Il a la forme de `TextField`** — contour `fieldBorder` au repos, accent dès qu'il y a une saisie, à la même épaisseur — mais le code se lit en grand (24/30), centré, espacé, à chiffres tabulaires, pour qu'on le compare à l'email d'un coup d'œil. Clavier numérique, remplissage automatique du code à usage unique. Jamais de cases séparées par chiffre : un collage y échoue.
