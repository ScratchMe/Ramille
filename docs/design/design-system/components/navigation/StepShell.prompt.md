Chaque écran du bilan vit dedans. Le pied est hors défilement : Retour (secondaire, largeur auto) + Suivant (flex).

```jsx
<StepShell section="Domicile-travail" step={1} total={9} onNext={next} nextDisabled={!answer} manque="ta réponse"><ThemedText type="screenTitle">As-tu un trajet régulier ?</ThemedText>…</StepShell>
```

Un bouton grisé ne dit pas pourquoi : `manque` le dit, dans la zone collante.
