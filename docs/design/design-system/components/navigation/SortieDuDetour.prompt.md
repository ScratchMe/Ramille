La sortie d’un écran qui se consulte : « Toi », les pages légales, « Toutes les pistes », un bilan relu.

```jsx
<SortieDuDetour label="Retour" />
<SortieDuDetour label="Retour au plan" />
<SortieDuDetour label="Revenir à mon suivi" />
```

**Deux places pour une sortie, et c’est l’écran qui décide, jamais son état** (`v1-33` T-10, décidé le 03/10/2026). Le relevé comptait douze sorties, quatre formes et trois places — dont la seule sortie des pages légales, à 10 559 px du haut.

- **Un écran qui se consulte** n’a pas d’action principale à côté de laquelle se ranger : sa sortie est en haut à gauche, au-dessus du titre — `SortieDuDetour`. Dans **chacun** de ses états : le chargement, l’échec d’une lecture et le bilan retiré la gardent au même endroit. Les pages légales gardent en plus celle de leur fin, pour qui les a lues.
- **Un écran qui pose une question** — un flux, la connexion, un formulaire — garde sa sortie en bas, sous l’action principale : c’est l’autre réponse, lue au moment de choisir. Un `TextLink` gris, souligné quand une phrase le touche ; les flux gardent leur bouton secondaire « Retour » à gauche de « Suivant ».

**Gris, jamais vert** : le vert est à ce qui fait avancer, et une sortie n’avance pas. Le libellé a la forme d’un `TextLink` `discret`, et se souligne sous le doigt comme lui. Le chevron la distingue des autres liens gris de la page : c’est le cinquième tracé du produit (grille 24, trait 1,9, arrondi), décidé avec la règle. Le trait du chevron tombe sur la marge du contenu — la cible recule de ce qui le précède dans sa boîte.

**Les libellés ne changent pas** : « Retour au plan » et « Revenir à mon suivi » disent où l’on va. Après le questionnaire, la restitution prête n’a pas de sortie : elle pousse vers le plan — son échec et un bilan retiré la gardent. « Toi » après la suppression du compte n’a que « Revenir au début ». La case gauche de la bande haute n’est pas sa place — elle fait 48 px et attend le retour d’iOS.
