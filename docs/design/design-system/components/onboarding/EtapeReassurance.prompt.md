Le troisième écran de l'onboarding (3 sur 4), sur fond teinté.

```jsx
<EtapeReassurance onSuivant={suivant} onPrecedent={precedent} onConfidentialite={ouvrirConfidentialite} />
```

**Ce que le produit promet de ne pas faire** : « Pas de jugement. Un état des lieux honnête. » — les contraintes (zone rurale, travail loin, voiture nécessaire) ne sont pas des fautes ; les réponses restent privées ; aucun classement, aucune comparaison avec d'autres personnes.

**Le lien « Ce qu’on enregistre, et pourquoi » rend la promesse vérifiable** : la session s'ouvre dès le lancement, donc « tes réponses restent privées » doit pouvoir se lire en détail. Sur ce fond teinté, les points de progression passent en `onTint`.

**« Retour » à gauche, pages 2 à 4** (décision du 27/09/2026) : la forme du questionnaire — le secondaire garde sa largeur, le principal prend le reste —, le même mot, et aucune hauteur ajoutée. La page 1 n'en a pas : il n'y a rien derrière. Le balayage et le retour Android mènent au même endroit. Sur ce fond teinté, « Retour » est filé (`onPanel`) : gris sur teinté, sa forme disparaissait.
