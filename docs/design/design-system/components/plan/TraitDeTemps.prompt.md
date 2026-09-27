Le temps écoulé dans la saison, posé sous la carte du cap, avec sa légende dans l'écran qui le pose.

```jsx
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <ThemedText type="small" themeColor="textSecondary">Automne 2026</ThemedText>
  <ThemedText type="small" weight={600} themeColor="accentText">jusqu’au 30 novembre</ThemedText>
</div>
<TraitDeTemps progression={0.28} />
<ThemedText themeColor="textTertiary" style={{ fontSize: 12, lineHeight: '16px' }}>La saison avance ; le trait mesure le temps, pas toi.</ThemedText>
```

**Il mesure la saison, pas la personne** : `accentMuted` sur le rail `border`, jamais `accent`. Rien de ce que la personne fait ne le fait avancer ni ne le retient ; le lire comme une jauge vers le cap ferait de chaque semaine écoulée un retard — la mécanique d'échec que le produit refuse. D'où la légende, en mots.

Il n'est pas plein le dernier jour : la fin de période est incluse, il n'atteint le bout qu'une fois la période révolue. **Au tout premier plan, il n'est pas là** — il n'y a encore rien à mesurer ; la période et sa fin, elles, restent. Masqué au lecteur d'écran : la date de fin porte l'information.
