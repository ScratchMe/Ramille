S’ouvre une fois par appareil, juste après l’engagement. Ramille peut parler ici : aucun chiffre sur la feuille.

```jsx
<FeuilleRappels boucle="hebdo" canal="push" permission="demandable" />
```

Posée en bas d’un scrim `--color-scrim`. **Elle s'appelle « Les rappels », et ne l'affiche pas** : ce nom nomme le dialogue (sans nom, un lecteur d'écran entrait dans « dialogue » sans savoir lequel), mais son canvas ne dessine pas d'en-tête, et aucune décision n'en a demandé un. Il s'est affiché une journée, le 24/09/2026, puis a été retiré (`enTete={false}`, `v1-29` §3.2) ; **l'absence est décidée depuis le 25/09/2026** (`v1-29` §6.3) — ne pas le remettre par symétrie avec la feuille du nouveau bilan. Le cadre (poignée, titre facultatif, marges, voile) est `FeuilleDuBas` dans le dépôt, partagé avec la feuille du nouveau bilan — qui, elle, affiche son titre —, et absent du kit.

Les lignes du canal sont celles de « Toi » (`ChoixDeRappel`) : même rendu, `LigneDeCanal` dans le dépôt. Une ligne hors d'atteinte dit pourquoi et ne paraît jamais choisie ; la porte qui la débloque (« Rattacher un compte », « Ouvrir les réglages du téléphone ») se rend juste sous elle. Le groupe est nommé par la question de Ramille.

Le bouton n’annonce un dialogue système que s’il va vraiment s’en ouvrir un : « Autoriser les notifications » seulement quand la permission est encore demandable.
