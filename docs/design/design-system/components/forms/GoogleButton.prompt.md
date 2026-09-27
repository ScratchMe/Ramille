Le bouton « Se connecter avec Google » — un seul appelant dans le produit, la proposition qui suit la restitution.

```jsx
<GoogleButton onPress={seConnecter} loading={enAttente} />
```

Un des rares endroits où un standard externe prime sur l’identité du produit. **Le « G » est celui de Google** (quatre chemins aux couleurs de la marque, masqués au lecteur d'écran) : il ne se redessine pas, ne se recolore pas en thème sombre, et ne se remplace jamais par une pastille ou un autre logo. `assets/images/google-oauth-logo.png` n'est pas sa référence — c'est le logo de Ramille, celui de l'écran de consentement.

Blanc bordé d'un filet, **sans ombre**, à la hauteur de `Button` : les deux sont côte à côte sur l'écran de connexion. Le libellé est fixe et c'est lui qu'on annonce. Sous le doigt, la surface neutre prend `backgroundPressed`, tout de suite ; le logo et le libellé ne bougent pas.

**L'attente est un indicateur d'activité, sans texte** : il remplace logo et libellé le temps que la fenêtre de Google s'ouvre, le bouton est inactif et `aria-busy`, et il reste annoncé par son libellé.
