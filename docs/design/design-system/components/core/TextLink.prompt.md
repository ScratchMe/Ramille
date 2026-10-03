Toute action textuelle (Retour, « Je ne sais pas », « Changer d’avis », « Faire un nouveau bilan ») : un TextLink, jamais un span cliquable.

```jsx
<TextLink label="Voir toutes les pistes · 5" apparence="action" role="link" />
<TextLink label="Faire un nouveau bilan" apparence="discret" role="link" style={{ textAlign: 'center' }} />
<TextLink label="Changer d’avis" apparence="souligne" />
```

**Trois apparences, et pas une de plus** (`v1-33` T-5, 03/10/2026). Le corps est `small` partout ; `apparence` donne l’encre et la graisse, et le composant ne prend ni `type`, ni `themeColor`, ni `weight` — le relevé en avait compté sept, et « J’ai déjà un compte » en cinq formes pour un même geste.

- **`action`** — `accentText`, 600. Le lien qui fait avancer, ou l’autre chemin posé sous un bouton principal : « Voir toutes les pistes », « Il manque encore … », « J’ai déjà un compte », « Pas maintenant » d’une feuille, « Réessayer » d’une relecture.
- **`discret`** — `textTertiary`, 500. Ce qui se propose sans pousser : les pages légales, « Renvoyer un code », « Un chiffre me semble faux », « Comment ce chiffre est calculé ».
- **`souligne`** — `textTertiary`, 500, souligné au repos. Un lien discret **qu’une phrase de la même encre touche**, ou posé dans une carte : gris contre gris au même corps, il se lirait comme la suite de la phrase. Les liens de pied de carte du plan, « Mes données » (« Supprimer mon compte »), le « Retour » sous « Reviens en arrière », et tout « Annuler » posé à côté d’un bouton de confirmation.

Désactivé, un lien prend l’encre tertiaire, quelle que soit son apparence — jamais une opacité.

La cible fait 48 px de haut, le texte centré dedans : il reste aligné dans sa colonne. Sous le doigt, il se souligne, tout de suite — sa couleur ne change pas, elle porte déjà un sens ; un lien déjà souligné prend la teinte appuyée des surfaces neutres à la place. `style` ne règle que l’alignement du texte, `containerStyle` la cible.

`role="link"` pour un lien qui navigue, le `button` par défaut pour une action dans l’écran. `expanded` pour une bascule (« Comment ce chiffre est calculé ») : le libellé reste stable, l’état se dit « développé » / « réduit ».
