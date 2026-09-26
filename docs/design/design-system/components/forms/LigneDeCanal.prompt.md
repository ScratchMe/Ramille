Une ligne du choix du canal de rappel, la même pour ses deux écrans : le réglage de « Toi » (`ChoixDeRappel`) et la feuille ouverte après « C’est noté » (`FeuilleRappels`). Toujours dans un `GroupeDeChoix` nommé par la question.

```jsx
<GroupeDeChoix question="Comment tu préfères que je te fasse signe ?" style={{ gap: 8 }}>
  <LigneDeCanal ligne={{ canal: 'push', titre: 'Par notification sur ce téléphone', detail: 'À activer en une fois.', choisi: true }} />
  <LigneDeCanal ligne={{ canal: 'email', titre: 'Par email', detail: 'Rattache un compte pour l’activer.', choisissable: false }} />
  <LigneDeCanal ligne={{ canal: 'none', titre: 'Sans rappel', detail: 'On se retrouve dans l’app, à chaque point.' }} />
</GroupeDeChoix>
```

**Les libellés sont ceux du produit** : « Par notification sur ce téléphone », « Par email », « Sans rappel » — et les identifiants `push`, `email`, `none`. Le détail dit l'adresse, le rythme, ou ce qui manque pour que ça marche.

**Une ligne hors d'atteinte ne paraît jamais choisie**, même si c'est la préférence enregistrée : ce qui paraît coché est ce qui partira vraiment. **Et elle le dit par son texte, jamais par une opacité** : fond des éléments, titre en `textTertiary`, détail — la phrase qui dit pourquoi — en `textSecondary`.

Ce qui se rend **sous** la ligne reste à l'écran : le lien « Ouvrir les réglages du téléphone » quand les notifications sont coupées côté système, la porte « Rattacher un compte » sous « Par email ». `occupe` bloque le choix le temps d'un enregistrement, sans rien changer à l'aspect.
