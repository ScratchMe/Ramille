Le cadre d'une feuille du bas : voile, feuille, poignée et titre. Ce que la feuille dit est son contenu, et lui seul — deux feuilles l'emploient dans le produit, celle des rappels (`FeuilleRappels`) et celle du nouveau bilan (`FeuilleNouveauBilan`, dont l'exemple ci-dessous est le contenu).

```jsx
<FeuilleDuBas titre="Ton plan va être recalculé" onFerme={fermer}>
  <ThemedText type="body" themeColor="textSecondary">L’action que tu suis — Faire un trajet sur cinq à vélo — et le moment que tu avais choisi restent engagés si ton nouveau plan propose encore cette action. Sinon, elle ne sera plus engagée.</ThemedText>
  <ThemedText type="small" themeColor="textTertiary">Rien ne presse : une habitude met du temps à prendre. Si tes trajets n’ont pas changé, ton bilan actuel est toujours juste.</ThemedText>
  <Button title="Soumettre mon bilan" />
  <TextLink label="Pas maintenant" onPress={fermer} type="small" weight={600} themeColor="accentText" style={{ textAlign: 'center' }} />
</FeuilleDuBas>
```

**Le titre est obligatoire, et c'est lui qui nomme le dialogue** : sans nom, un lecteur d'écran entre dans « dialogue » sans savoir lequel. Il s'affiche en en-tête de niveau 2 — la feuille s'ouvre par-dessus un écran qui porte déjà son titre. **Nommer n'oblige pas à afficher** : `enTete={false}` quand le canvas ne dessine pas d'en-tête (la feuille des rappels), le titre continue de nommer le dialogue.

**Le geste de retour referme toujours** (`onFerme`, Échap sur web) : une feuille qu'on ne peut pas fermer n'est plus une proposition.

Le voile (`--color-scrim`) est l'une des deux seules transparences du produit. Dans l'app, la feuille est une fenêtre qui recouvre l'écran ; le kit la rend en place, dans son voile, pour qu'elle se pose au bas d'un écran de maquette sans en sortir (`voile={false}` : la feuille seule). Poignée 40 × 4, rayon de carte en haut, filet `border`, marges 24, bas 64.

**Le voile se fond, la feuille glisse** (27/09/2026, `docs/architecture/v1-30-les-transitions.md` §5.4) : le voile passe de transparent à posé (`--motion-fondu`), la feuille monte de la hauteur de l'écran (`--motion-entree-feuille`, courbe `--motion-courbe`), et la fermeture — geste de retour, Échap, « Pas maintenant », un choix validé — les fait repartir (`--motion-sortie`) avant que la feuille se démonte. Le voile ne monte **jamais** avec la feuille. Sous « réduire les animations », tout est posé et la fermeture est immédiate. Un bouton qui navigue ferme sans attendre la sortie. Le kit rend la feuille posée, sans mouvement.
