Le lien discret posé sous une liste de modes du questionnaire — le mode principal, le second mode, le mode des sorties — qui ouvre le canal de retour quand le mode de la personne n’y figure pas.

```jsx
<GroupeDeChoix question="Quel est ton mode de transport principal pour ce trajet ?" style={{ gap: 8 }}>…</GroupeDeChoix>
<MissingModeLink context="B1.4 mode domicile-travail" />
```

**Une porte de sortie, pas une invitation à quitter le questionnaire.** Le référentiel de modes est forcément incomplet — camping-car, van, vélo cargo —, et sans ce lien la personne dont le mode manque n’a que deux issues silencieuses : choisir une réponse fausse, ou abandonner. D’où sa discrétion : petit corps (`small`), couleur tertiaire, centré sous la liste. En Spline Sans et jamais en chasse fixe : c’est une phrase adressée à la personne, pas une source ni un code.

**Un `TextLink`, jamais un texte rendu cliquable** : le libellé annoncé est le texte affiché, et la cible fait 48 px de haut sans déplacer le texte. `role="link"`, puisqu’il mène au formulaire de retour. Le centrage se pose deux fois, sur le texte (`textAlign`) et sur la cible (`alignItems`) : sur web, l’un sans l’autre ne centre pas.

**`context` nomme la liste d’où vient le retour** — « B1.4 mode domicile-travail », « B1.7 second mode domicile-travail », « B2.2 mode loisirs » — et part avec lui, dans la catégorie `mode_manquant`. Il ne s’affiche jamais : le libellé est le même sous toutes les listes.
