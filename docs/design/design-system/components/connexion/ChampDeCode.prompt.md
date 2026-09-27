Le champ du code reçu par email — huit chiffres, qui remplacent le lien des deux e-mails (rattacher une adresse, retrouver un compte).

```jsx
<ChampDeCode value={code} onChangeText={setCode} />
```

**Huit chiffres, pas six** : c'est une valeur de sécurité, pas un réglage d'interface. Le champ ne garde que les chiffres et coupe à huit, donc un code collé avec des espaces ou un tiret entre tel quel.

**Il a la forme de `TextField`** — contour `fieldBorder` au repos, accent dès qu'il y a une saisie, à la même épaisseur — mais le code se lit en grand (24/30), centré, espacé, à chiffres tabulaires, pour qu'on le compare à l'email d'un coup d'œil. Clavier numérique, remplissage automatique du code à usage unique. Jamais de cases séparées par chiffre : un collage y échoue.

**Le texte d'aide prévient que le code part seul** : « 8 chiffres, sans espace. Il est vérifié dès le dernier chiffre. » Au huitième chiffre, la vérification change l'écran sans geste de plus ; WCAG 3.2.2 demande de le dire avant la saisie, et ce texte est aussi ce que le lecteur d'écran annonce en entrant dans le champ (décision du 27/09/2026).
