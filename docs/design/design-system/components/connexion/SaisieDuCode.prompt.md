L'écran « Regarde tes emails », où l'on tape le code à huit chiffres — **le même pour ses trois hôtes** : rattacher une adresse à son bilan, retrouver un compte depuis un nouvel appareil, et la page de suppression de compte.

```jsx
<SaisieDuCode voix="parti" adresse="camille@exemple.fr" libelleBouton="Valider mon code" />
<SaisieDuCode voix="peut_etre" adresse="camille@exemple.fr" libelleBouton="Retrouver mon compte" />
```

**La voix décide de ce que l'écran affirme, et elle appartient à l'hôte** — jamais à l'état de l'adresse. En `parti`, l'envoi est certain, et une phrase conditionnelle dit, **avant** la saisie, ce que le code fera si un compte existait déjà à cette adresse : vraie dans les deux cas, elle laisse la sortie sans rien révéler. En `peut_etre`, tout est au conditionnel, et une carte dit que le code ne crée jamais de compte — ni ne dit si l'adresse en a un : ce serait dire qui utilise Ramille. **Ne jamais écrire une variante « cette adresse a déjà un compte »** : c'est l'oracle que ce parcours a fermé.

**Le code se vérifie au huitième chiffre**, et le bouton reste là pour qui préfère appuyer. Un refus dit la même chose qu'un code expiré (on ne distingue pas ce qu'on ne sait pas) et **ne vide pas le champ** : on compare ses chiffres avec l'email. Seul un code **reparti** le vide — le précédent ne vaut plus ; un renvoi refusé (« Trop de demandes coup sur coup ») garde les chiffres, puisqu'aucun code n'est parti. Une exception : un code **accepté** dont la suite échoue (l'hôte n'a pas pu ouvrir le compte) vide aussi le champ, parce qu'il est consommé et que le rejouer ne rendrait qu'un refus.

« Renvoyer un code » et « Utiliser une autre adresse » sont des **boutons**, pas des liens : ils agissent dans l'écran, ils ne mènent nulle part.

**Le titre prend le focus quand l'écran arrive sous le doigt** (`apresUnGeste`, 01/10/2026) : « Recevoir un code » disparaît avec l'adresse, et sans ce déplacement le lecteur d'écran repartait du haut sans rien annoncer. Jamais quand l'hôte s'ouvre directement sur le code, sans geste (la reprise depuis « Toi ») : la prop est obligatoire dans le dépôt, pour qu'aucun hôte ne l'oublie.
