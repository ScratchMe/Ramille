Chaque écran du bilan vit dedans. Le pied est hors défilement : Retour (secondaire, largeur auto) + Suivant (flex), à 16 l’un de l’autre.

```jsx
<StepShell section="Domicile-travail" step={1} total={9} entree={{ cle: 'commute_has_trip', sens }}
  manque={manqueDeLEtape('commute_has_trip', answers)} reponsesDonnees={reponsesDonnees} onNext={suivant}
  motDeRamille="À peu près, c’est déjà bien. Je ne vérifie rien, et personne ne relit.">
  <CommuteHasTripStep answers={answers} update={update} />
</StepShell>
```

**Ce qui manque se dit au toucher de « Suivant », jamais d’office** (29/09/2026). `manque` vaut `{ champ, phrase }` tant que l’étape est incomplète, et rien ne s’écrit à l’arrivée : la question est déjà en titre. « Suivant » est alors **en attente** — l’apparence du désactivé (fond `backgroundElement`, texte `textTertiary`), mais un bouton ordinaire, ni `disabled` ni `aria-disabled` : son nom ne change pas, et l’activer informe. Au toucher, dans cet ordre :

- le focus va à ce qui manque — l’option cochée du groupe, ou sa première ; un champ de saisie reçoit le focus lui-même ;
- l’écran y défile le minimum pour qu’il soit entier, 16 au-dessus du pied (un groupe plus haut que la zone s’aligne 24 sous l’en-tête) ;
- l’intitulé de la question qui manque passe en `accentText` 600 (`IntituleDuChamp`) — **jamais le titre de l’étape** ;
- « Il manque encore {phrase}. » apparaît au-dessus des boutons, 8 au-dessus d’eux : un lien (`TextLink` small 600 `accentText`, cible 48, aligné sur les boutons, en fondu 200 ms) qui mène au même endroit. Jamais une alerte : ce n’est pas un échec.

La demande tient **jusqu’à ce que l’étape soit complète**, et elle retombe en quittant l’étape. Tant qu’elle court, la ligne et la marque suivent ce qui manque *maintenant* — un autre mode choisi pendant la demande fait suivre la ligne ; une fois retombée, un nouveau manque ne se dit qu’au toucher suivant. Le pied grandit de la ligne — de 102 à 158 à la taille de police normale : sa hauteur se mesure, elle ne se suppose pas, et le défilement attend la mise en page qui suit. Chaque champ qui peut manquer s’enregistre auprès de la coquille (`useAncreDuChamp`) : c’est ce qui dit où mener.

**Le filet du pied** : quand le contenu continue sous le pied au-delà de sa marge basse de 24, le trait de la bande haute (`border`, un cheveu, pleine largeur) se pose en haut du pied, en position absolue — rien ne bouge quand il apparaît. Il dit qu’il y a une suite, pas ce qui manque ; sans animation.

**Une précision qui s’ouvre ne passe pas sous le pied** : quand une `BoiteDePrecision` s’ouvre après une réponse et finirait sous le pied, la zone remonte juste assez pour qu’elle s’arrête 16 au-dessus de lui, sans jamais faire passer le choix au-dessus du bord (8). Le focus ne bouge pas. Jamais au préremplissage d’un re-bilan : c’est ce que compte `reponsesDonnees`.

**Un échec se dit en deux morceaux** : `message`, une phrase du produit au-dessus des boutons, et `detail`, la cause technique en chasse fixe, à recopier. Les coller ferait lire une violation de contrainte en anglais dans la voix du produit, au bout de cinq minutes de saisie.

**`motDeRamille` est la seule parole de Ramille rendue sans son visage** : il est déjà dans l'en-tête, juste au-dessus. Quatre étapes sur neuf en ont un (l'entrée de chaque section) ; la phrase vient de `RAMILLE.entreeDeSection`, jamais d'un écran.

Quand l'étape change (`entree.cle`), le contenu revient en haut et entre du côté d’où l’on vient (8 px, 250 ms) ; le focus va à la question — seulement après un passage d’une étape à l’autre (`entree.sens`), jamais au montage ni à la reprise d’un brouillon. Le défilement est celui de la plateforme ; sous « réduire les animations », tout est posé.
