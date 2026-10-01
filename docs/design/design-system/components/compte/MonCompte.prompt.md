La confirmation est un état du composant, jamais une boîte système. Aucune tentative de retenir la personne.

```jsx
<MonCompte confirmation />
```

**La carte est blanche et cernée** (depuis le 24/09/2026) : fond de la page, filet `border`, le registre des cartes d'action. Elle était un panneau gris, la couleur exacte du bouton secondaire : posé dessus, « Télécharger mes données » n'avait plus de contour et se lisait comme une ligne de texte — sur la section qui porte le droit d'accès et la portabilité. Le bouton garde son dessin, et ses états, sans couleur imposée de l'extérieur.

« Mes données » est un en-tête de section (niveau 2) : les pages légales et `/compte/suppression` y envoient en la nommant. Le message d'un export ou d'une suppression passe par `MessageInline`, le succès compris.

Le bouton de suppression est le primaire ordinaire : pas de variante destructive dans le produit.

**Sur « Toi », un seul principal pendant la confirmation** (01/10/2026, `v1-33` §6) : « Supprimer définitivement » est le principal, donc tant que la confirmation est ouverte, ce que l’écran pose ailleurs en principal — « Rattacher un compte », « Réessayer » — passe en `variant="secondary"`, et redevient principal quand elle se ferme (« Annuler », le retour matériel d’Android). Aucun texte ne change. C’est pourquoi **la confirmation est tenue par l’écran** et non par la carte : dans le dépôt, `MonCompte` reçoit `confirmation` et `onConfirmation(ouverte)` — le kit, sans état, en montre les deux moitiés par `confirmation`, `onDemanderSuppression` et `onAnnuler`.

**Pendant un export ou une suppression, tout se désactive** (`occupe`) et le bouton qui travaille le dit : « Génération… », « Suppression… ». **Une fois la suppression faite** (`supprime`), la carte dit « C’est fait. » et ce qui est parti, Ramille dit au revoir sans retenir personne (« Merci du temps passé ici. Si tu reviens, on repart de zéro, tranquillement. »), et le seul geste est « Revenir au début ». **Sur l'écran « Toi », tout ce qui décrit le compte part avec lui** : « Retour », l'état du compte, « Me déconnecter », les rappels, « Mon contexte de mobilité » et « Un retour à nous faire ? » disparaissent — ils décriraient un compte qui n'existe plus. Restent la carte, puis en bas les pages légales et l'adresse de contact.

**Le focus suit le geste** (01/10/2026) : « Supprimer mon compte » disparaît sous le doigt, et le focus va à la phrase de la confirmation qui le remplace ; « C'est fait. » le prend en arrivant (`TitreDArrivee`), puisque cet état n'existe qu'après le geste.

**« Mes données » se titre comme « Les rappels »** (`cardTitle`, en-tête de niveau 2, 01/10/2026) : les deux sections de « Toi » se titraient de deux façons.
