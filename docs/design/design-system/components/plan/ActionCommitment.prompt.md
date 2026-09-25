S’insère en enfant d’ActionCard. L’intention est obligatoire : jours ou échéance fermée, jamais de saisie libre.

```jsx
<ActionCard titre="…" gainKg={184}><ActionCommitment kind="days" state="picking" days={[1,3]} /></ActionCard>
```

**Les jours se cumulent** : des `checkbox` (jamais des `radio`, qui annonceraient qu'en cocher un décoche les autres), dans un groupe nommé par la question « Quels jours ? ». Ils se rangent **en grille de quatre colonnes au plus** — sur une ligne, chacun ne mesurait que 27 à 31 px de large à 360-390 dp, sous la cible de 48 — et passent seuls à trois colonnes quand quatre n'y tiennent plus. Puces pleines de rayon 14, jour entier en libellé accessible, `nestedBackground` : le sélecteur est un encart teinté.

**Les échéances** (autres postes) : des `radio` en colonne, rayon 16, en contour, `nestedBackground`. Elles dépendent du poste — « Ce mois-ci » n'est pas une échéance pour un vol.

Aucune notion d’échec : « Changer d’avis » libère sans rien compter. Ses liens (« Changer d’avis », « Annuler ») sont soulignés au repos.
