Les indisponibilités disent pourquoi (dans le détail), et sur web la ligne notification n’existe pas plutôt que d’être grisée.

```jsx
<ChoixDeRappel canal="push" />
```

**La ligne est `LigneDeCanal`, plus une ChoiceRow avec un détail** (depuis le 24/09/2026) : une seule ligne pour ses deux écrans, ce bloc et la feuille des rappels. Un `radio`, annoncé avec son titre et son détail.

**Une ligne hors d'atteinte ne paraît jamais choisie** : « Par email » sans compte, grisé mais cerné d'accent, disait à la fois « indisponible » et « c'est ton réglage ». Ce qui paraît coché est ce qui partira vraiment ; si la préférence enregistrée ne peut rien envoyer, aucune ligne ne l'est.

Le `radiogroup` ne porte que les lignes, nommé par l'en-tête « Les rappels » ; le lien « Ouvrir les réglages du téléphone » se rend juste sous la ligne qui le porte, et seulement quand les notifications sont coupées côté système. Sur « Toi », la porte « Rattacher un compte » n'est pas rendue : le bouton du compte est juste au-dessus.

Une ligne hors d'atteinte garde son fond, passe son titre en texte tertiaire et laisse son détail — la phrase qui dit pourquoi — en texte secondaire : jamais une opacité, qui faisait tomber ce détail vers 3,2:1. Le dépôt portait une opacité de 0,6 jusqu'au 25/09/2026, contre la règle du readme ; c'est le code qui a suivi la règle (`v1-29` §5).

**Le mot de la veille se règle ici, sous « Par notification »** (C4.2), dans son propre groupe et en retrait — il n'existe qu'en notification. C'est une case (`checkbox`, le seul rôle qui annonce coché ou non), de la même famille que les lignes de canal : même fond, même bordure d'accent quand elle est cochée. Son détail dit ce qui se passe vraiment : la date quand la fenêtre court, « En pause sur ce téléphone : il ne part qu’en notification. » sans jeton, « En pause : il accompagne une action de trajet, les dix semaines qui suivent la première que tu choisis dans la saison. » fenêtre close. Absente sur web, et pour qui n'a pas choisi la notification.

```jsx
<ChoixDeRappel canal="push" permission="accordee" veille={{ coche: true, detail: 'Par notification, jusqu’au 15 novembre.' }} />
```

**Le sous-titre est un plafond** : « Un mot à chaque point de suivi, et la veille de tes jours de trajet — jamais plus. » pour qui a dit oui, « Un mot à chaque point de suivi, jamais plus. » sinon. Il promet ce que la personne a demandé, pas ce qui part ce soir.

**« Les rappels » est un en-tête de section** (01/10/2026), de niveau 2, au même style que « Mes données » (`cardTitle`) : une page parcourue titre par titre le sautait. Sur « Toi », les sections sont séparées de 32, et leurs éléments de 16.
