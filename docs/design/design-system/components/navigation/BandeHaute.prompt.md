En tête des onglets Plan et Suivi uniquement ; le questionnaire, l’onboarding et la connexion sont des flux plein écran sans bande.

```jsx
<BandeHaute onCompte={goCompte} />
```

**Le nom n'est pas un en-tête** (depuis le 24/09/2026) : annoncé en titre, il passait avant celui de chaque écran — un `<h2>` devant le `<h1>` sur web, la première étape de la navigation par titres sur Android. Il situe, il ne commence rien ; le titre de l'écran est le premier titre. Le nom est celui du produit (`APP_NAME`), jamais un autre.

Trois créneaux de 48 : le nom est centré sur l'écran et non sur ce qui reste. Marge 11 = 24 − (48 − 22) / 2 : le bord visible de l’icône tombe à 24, la marge du contenu — elle se déduit de la cible, et valait 13 quand la cible faisait 44.
