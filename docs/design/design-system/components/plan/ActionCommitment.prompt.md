S’insère en enfant d’ActionCard. L’intention est obligatoire : jours ou échéance fermée, jamais de saisie libre.

```jsx
<ActionCard titre="…" gainKg={184}><ActionCommitment kind="days" state="picking" days={[1,3]} /></ActionCard>
```

**Les jours se cumulent** : des `checkbox` (jamais des `radio`, qui annonceraient qu'en cocher un décoche les autres), dans un groupe nommé par la question « Quels jours ? ». Ils se rangent **en grille de quatre colonnes au plus** — sur une ligne, chacun ne mesurait que 27 à 31 px de large à 360-390 dp, sous la cible de 48 — et passent seuls à trois colonnes quand quatre n'y tiennent plus. Puces pleines de rayon 14, jour entier en libellé accessible, `nestedBackground` : le sélecteur est un encart teinté.

**Les échéances** (autres postes) : des `radio` en colonne, rayon 16 (`Radius.field`, nommé depuis le 01/10/2026), en contour, `nestedBackground`. Elles dépendent du poste — « Ce mois-ci » n'est pas une échéance pour un vol.

Aucune notion d’échec : « Changer d’avis » libère sans rien compter. Ses liens (« Changer d’avis », « Annuler ») sont soulignés au repos.

**Ouvert sur la question** (`surLeChoix`, `v1-32`, 29/09/2026) : sur « Toutes les pistes », le sélecteur est là d'emblée — la pastille « Choisir » a déjà dit « Je m’y engage ». Son contenu ne change pas : rien de coché, « C’est noté » inactif tant que rien n’est choisi. « Annuler » y appelle `onAnnuler` et rend la carte à sa ligne. Le plan ne passe ni l’un ni l’autre.

```jsx
<ActionCard titre="Renoncer à un vol long-courrier cette année" gainKg={1601}><ActionCommitment kind="timing" poste="travel" surLeChoix /></ActionCard>
```

**Le focus suit le geste** (dans le dépôt, rien ne se dessine) : à la question quand le sélecteur s’ouvre, au bouton revenu quand « Annuler » le referme sur le plan.

**« C’est noté » ne se défait pas sous les yeux** (01/10/2026, audit P-1) : au succès, le sélecteur reste tel quel, « C’est noté » inactif (`relecture`), jusqu’à ce que l’écran ait relu le plan — la carte passe alors à « Changer d’avis » dans le même rendu ; si la relecture échoue, il redevient actif, sa sélection gardée. Il se refermait avant la relecture, et « Je m’y engage » revenait le temps de l’aller-retour. Dans le dépôt, c’est `lectures` (les lectures terminées de l’écran) qui dit quand ; sur la liste, qui part vers le plan, il reste inactif jusqu’au départ.

```jsx
<ActionCard titre="Passer deux trajets sur cinq en train" gainKg={619}><ActionCommitment kind="days" state="picking" days={[2, 4]} relecture /></ActionCard>
```

**À l’ouverture sur le plan, l’écran défile juste assez** pour que « C’est noté » finisse au-dessus de la barre d’onglets, sans faire passer le titre de la carte sous la bande (`onOuvert`, 01/10/2026, audit P-2) — le défilement de la plateforme, posé sous « réduire les animations ». La liste le fait déjà ; rien ne se dessine.
