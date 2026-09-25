Champ des écrans de connexion et de `/compte/suppression`. La validation est un `helperText` neutre sous le champ, jamais une couleur d’alerte.

```jsx
<TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="camille@exemple.fr" helperText="Cette adresse semble incomplète." />
```

**Il n’y a pas de mot de passe dans Ramille**, et ce champ ne sert jamais à en saisir un : le seul
chemin vers un compte est un code à usage unique envoyé par email. Une adresse, donc, et rien
d’autre — les trois écrans qui utilisent ce champ (`/connexion/email`, `/connexion/retrouver` et
`/compte/suppression`) demandent tous une adresse. Un écran de mot de passe construit à partir de ce kit
serait un écran que le produit n’a pas.

**Le champ se voit au repos** (depuis le 24/09/2026) : contour `fieldBorder`, 3,45:1 sur le blanc et
3,04:1 sur le fond du champ — sans lui, un champ vide ne tranchait qu'à 1,14:1. L'accent dès qu’il y a
du contenu ou une action, à la même épaisseur (`Stroke.field`, 1,5) pour que rien ne bouge. Le texte
saisi est en Spline Sans, graisse normale : sans elle, le champ prenait la police du système.

`keyboardType="email-address"` suffit à ce que le champ annonce qu'il attend une adresse : le
remplissage automatique (`autoComplete`) s'en déduit. `rightActionLabel` existe (il pose un
`TextLink` dans le champ) mais aucun écran ne s’en sert aujourd’hui.
