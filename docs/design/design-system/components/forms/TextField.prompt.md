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

**La touche d'action du clavier envoie** (01/10/2026) : avec `onSubmitEditing`, elle dit « Envoyer » (`enterKeyHint="send"`) et Entrée fait partir l'action de l'écran — « Recevoir un code » sur les trois écrans d'adresse —, sans fermer le clavier ni quitter le champ, pour qu'une adresse incomplète se corrige sur place. Une adresse ne passe pas par le correcteur du clavier (`autoCorrect` coupé).

**Au focus, la bordure passe à l'accent — et l'anneau du navigateur suit le cadre** (01/10/2026, `cadreDuChamp`). Le kit écrivait « champ rempli ou focus = bordure accent » et le code ne le faisait qu'au remplissage. Mais l'accent seul ne dit pas le focus : gris contre vert, le changement ne tient qu'à 1,78:1 (`fieldBorder` contre `accent`), sous les 3:1 d'un état qui passe par la couleur, et nul sur un champ déjà rempli. L'anneau de focus ne part donc pas : il quitte l'`<input>`, où il dessinait un rectangle dans le champ arrondi, pour le cadre arrondi — comme le champ du retour le montrait déjà. Même anneau que tout contrôle du produit sur web (`outline: auto`), au contraste du navigateur ; rien ne bouge.
