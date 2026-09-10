Le seul bouton du produit : pleine largeur, 54 px, rayon 27 ; `secondary` pour Retour / Non / actions de second rang.

```jsx
<Button title="Continuer" onPress={next} />
<div style={{display:'flex',gap:16}}><Button title="Retour" variant="secondary" /><Button title="Suivant" flex /></div>
```

Désactivé : fond élément + texte tertiaire (jamais grisé par opacité). Pas de variante destructive : la suppression de compte utilise le primaire.
