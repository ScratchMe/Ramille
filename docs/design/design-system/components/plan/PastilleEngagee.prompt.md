La marque d'une action engagée : une coche blanche dans un disque d'accent de 20 px.

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <PastilleEngagee />
  <ThemedText themeColor="accentText" weight={700} style={{ fontSize: 13, lineHeight: '18px', letterSpacing: '0.3px' }}>TON ENGAGEMENT</ThemedText>
</div>
```

**Deux surfaces la portent, et elles seules** : l'en-tête d'une `ActionCard` engagée, et la ligne engagée de « Toutes les pistes ». Le produit n'a pas de jeu d'icônes — ce tracé est le vocabulaire ; ne pas en dessiner une seconde version, ni l'employer pour autre chose que l'engagement.

Toujours à côté d'un texte qui dit la même chose : elle est masquée au lecteur d'écran, qui l'annoncerait deux fois.
