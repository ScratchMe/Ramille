Une surface dont le fond est un jeton du thème. C'est ce que le produit emploie pour tout panneau : l'encart teinté d'une précision, le sélecteur d'intention, la feuille du bas.

```jsx
<ThemedView type="backgroundElement" style={{ borderRadius: 16, padding: 16, gap: 8 }}>
  <ThemedText type="small" themeColor="textSecondary">Quelle motorisation ?</ThemedText>
</ThemedView>
```

**Le fond se choisit par `type`, parmi les jetons** — jamais une couleur en dur, qui ne suivrait pas le thème sombre. Un panneau neutre est `backgroundElement` ; `backgroundSelected` est réservé à la décision dominante et au point de suivi. Comme un `View`, c'est une colonne flexible par défaut.
