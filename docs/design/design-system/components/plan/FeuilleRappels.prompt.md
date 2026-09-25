S’ouvre une fois par appareil, juste après l’engagement. Ramille peut parler ici : aucun chiffre sur la feuille.

```jsx
<FeuilleRappels boucle="hebdo" canal="push" permission="demandable" />
```

Posée en bas d’un scrim `--color-scrim`. **Elle porte un titre visible, « Les rappels »** (depuis le 24/09/2026), en-tête de niveau 2 sous la poignée, et c'est lui qui nomme le dialogue : sans nom, un lecteur d'écran entrait dans « dialogue » sans savoir lequel. Le cadre (poignée, titre, marges, voile) est `FeuilleDuBas` dans le dépôt, partagé avec la feuille du nouveau bilan, et absent du kit.

Les lignes du canal sont celles de « Toi » (`ChoixDeRappel`) : même rendu, `LigneDeCanal` dans le dépôt. Une ligne hors d'atteinte dit pourquoi et ne paraît jamais choisie ; la porte qui la débloque (« Rattacher un compte », « Ouvrir les réglages du téléphone ») se rend juste sous elle. Le groupe est nommé par la question de Ramille.

Le bouton n’annonce un dialogue système que s’il va vraiment s’en ouvrir un : « Autoriser les notifications » seulement quand la permission est encore demandable.
