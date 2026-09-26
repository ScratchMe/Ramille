Chaque écran du bilan vit dedans. Le pied est hors défilement : Retour (secondaire, largeur auto) + Suivant (flex).

```jsx
<StepShell section="Domicile-travail" step={1} total={9} onNext={next} nextDisabled={!answer} manque="ta réponse"
  motDeRamille="À peu près, c’est déjà bien. Je ne vérifie rien, et personne ne relit.">
  <ThemedText type="screenTitle">As-tu un trajet régulier pour le travail ou les études ?</ThemedText>…
</StepShell>
```

Un bouton grisé ne dit pas pourquoi : `manque` le dit, dans la zone collante, en texte calme — ce n'est pas un échec.

**Un échec se dit en deux morceaux** : `message`, une phrase du produit au-dessus des boutons, et `detail`, la cause technique en chasse fixe, à recopier. Les coller ferait lire une violation de contrainte en anglais dans la voix du produit, au bout de cinq minutes de saisie.

**`motDeRamille` est la seule parole de Ramille rendue sans son visage** : il est déjà dans l'en-tête, juste au-dessus. Quatre étapes sur neuf en ont un (l'entrée de chaque section) ; la phrase vient de `RAMILLE.entreeDeSection`, jamais d'un écran.

Quand l'étape change, le contenu revient en haut et prend le focus — jamais au premier rendu.
