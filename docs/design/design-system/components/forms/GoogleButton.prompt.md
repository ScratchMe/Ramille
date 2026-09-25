Représente le bouton Google dans les maquettes.

```jsx
<GoogleButton />
```

Un des rares endroits où un standard externe prime sur l’identité du produit. Le libellé est fixe et c'est lui qu'on annonce. Sous le doigt, la surface neutre prend `backgroundPressed`, tout de suite ; le logo et le libellé ne bougent pas.

**Écart connu avec le dépôt, antérieur au 24/09/2026 et laissé au chantier de synchronisation (`v1-29` §5)** : le dépôt dessine le « G » officiel de Google (quatre chemins SVG aux couleurs de la marque, masqués au lecteur d'écran) là où ce kit pose une pastille neutre de 20 px ; il ne porte aucune ombre, et son attente est un indicateur d'activité, sans texte. Ne jamais inventer un autre logo.
