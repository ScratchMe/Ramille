Champ des écrans de connexion. La validation est un `helperText` neutre sous le champ, jamais une couleur d’alerte.

```jsx
<TextField label="Email" value={email} onChangeText={setEmail} type="email" placeholder="camille@exemple.fr" helperText="Cette adresse semble incomplète." />
```

**Il n’y a pas de mot de passe dans Ramille**, et ce champ ne sert jamais à en saisir un : le seul
chemin vers un compte est un lien à usage unique envoyé par email. Une adresse, donc, et rien
d’autre — les deux écrans qui utilisent ce champ (`/connexion/email` et `/connexion/retrouver`)
demandent l’un et l’autre une adresse. Un écran de mot de passe construit à partir de ce kit
serait un écran que le produit n’a pas.

Bordure accent dès qu’il y a du contenu ou une action ; sinon transparente. `rightActionLabel`
existe (il pose un `TextLink` dans le champ) mais aucun écran ne s’en sert aujourd’hui.
