Toute action textuelle (Retour, « Je ne sais pas », « Changer d’avis », « Faire un nouveau bilan ») : un TextLink, jamais un span cliquable.

```jsx
<TextLink label="Faire un nouveau bilan" role="link" type="small" themeColor="textTertiary" style={{ textAlign: 'center' }} />
<TextLink label="Changer d’avis" type="small" themeColor="textTertiary" style={{ textDecoration: 'underline' }} />
<TextLink label="Voir toutes les pistes · 5" role="link" type="small" weight={600} themeColor="accentText" />
```

La cible fait 48 px de haut, le texte centré dedans : il reste aligné dans sa colonne. Sous le doigt, il se souligne, tout de suite — sa couleur ne change pas, elle porte déjà un sens.

`role="link"` pour un lien qui navigue, le `button` par défaut pour une action dans l'écran. `expanded` pour une bascule (« Comment ce chiffre est calculé ») : le libellé reste stable, l'état se dit « développé » / « réduit ».

Lien d’action secondaire accent : `type="linkPrimary"` (14/30/600 accentText). Souligné au repos uniquement pour les liens de pied de carte du plan et de « Mes données » (« Changer d’avis », « Supprimer mon compte », leurs « Annuler »).
