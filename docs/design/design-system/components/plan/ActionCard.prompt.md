Une action chiffrée. Engagée : bordure accent 2 px, fond tinted, étiquette avec coche. Non retenue : estompée sans perdre son bouton.

```jsx
<ActionCard titre="Faire ce trajet à vélo" gainKg={184} partPercent={7} intention="le mardi et le jeudi" engagee><TextLink label="Changer d’avis" type="small" themeColor="textTertiary" style={{ textDecoration: 'underline' }} /></ActionCard>
<ActionCard titre="Travailler depuis chez toi un jour par semaine" gainKg={240} partPercent={9} estompee />
```

**L'action estompée l'est par son cadre** (depuis le 24/09/2026) : son filet passe de `border` à `backgroundElement`, un cran plus près du fond. Ni opacité ni couleur de texte ne bougent — une opacité de 0,72 faisait tomber le détail à 3,25:1 et « C’est noté », dans le sélecteur ouvert dedans, à 3,39:1.

**« par an » vient en tête de la ligne sous le gain**, collé au chiffre qu'il qualifie : « par an · le mardi et le jeudi · 7 % de ton empreinte ». L'intention s'intercalait devant, et « par an » se lisait comme le rythme des jours choisis. Le gain est à chiffres tabulaires : d'une carte à l'autre, il se lit en colonne.

Jamais la mascotte dedans : la carte porte des kilos.
