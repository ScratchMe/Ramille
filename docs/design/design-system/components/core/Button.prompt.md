Le seul bouton du produit : pleine largeur, 54 px au moins, rayon 27 ; `secondary` pour Retour / Non / actions de second rang.

```jsx
<Button title="Continuer" onPress={next} />
<div style={{display:'flex',gap:16}}><Button title="Retour" variant="secondary" style={{width:'auto'}} /><Button title="Suivant" flex /></div>
<Button title="Oui" variant="secondary" onPanel flex />
```

La hauteur est un minimum (24 d'interligne + 2 × 15) : le libellé grandit avec la taille de police du système, le bouton suit au lieu de déborder.

`onPanel` quand un secondaire est posé sur une carte grise ou teintée (la carte du point) : fond de l'écran et filet `border`. Gris sur gris, « Oui » et « Non » se lisaient comme du texte.

Sous le doigt, la surface prend sa teinte appuyée tout de suite, sans animation : `accentPressed` pour le principal, `backgroundPressed` pour le secondaire. Ni ondulation ni opacité.

Désactivé : fond élément + texte tertiaire (jamais grisé par opacité). Pas de variante destructive : la suppression de compte utilise le primaire.
