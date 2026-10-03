Le seul bouton du produit : pleine largeur, 54 px au moins, rayon 27 ; `secondary` pour Retour / Non / actions de second rang.

```jsx
<Button title="Continuer" onPress={next} />
<div style={{display:'flex',gap:16}}><Button title="Retour" variant="secondary" style={{width:'auto'}} /><Button title="Suivant" flex /></div>
<Button title="Oui" variant="secondary" onPanel flex />
```

La hauteur est un minimum (24 d'interligne + 2 × 15) : le libellé grandit avec la taille de police du système, le bouton suit au lieu de déborder.

`onPanel` quand un secondaire est posé sur une carte grise ou teintée (la carte du point) : fond de l'écran et filet `border`. Gris sur gris, « Oui » et « Non » se lisaient comme du texte. **Un bouton grisé posé sur un encart le prend aussi** (03/10/2026, brief de l'étape du contexte §4.5) : en attente ou désactivé, il garde son encre tertiaire mais prend le fond de l'écran et le filet — « C'est noté » en attente, sur le gris de l'encart du choix des jours, n'était plus qu'un libellé sans bord. Le principal actif ne change pas. Le filet se dessine **dans** la boîte (le rembourrage lui cède son pixel) : un « Retour » filé à côté d'un « Continuer » garde la même hauteur.

Sous le doigt, la surface prend sa teinte appuyée tout de suite, sans animation : `accentPressed` pour le principal, `backgroundPressed` pour le secondaire. Ni ondulation ni opacité.

Désactivé : fond élément + texte tertiaire (jamais grisé par opacité). Pas de variante destructive : la suppression de compte utilise le primaire.

**En attente (`enAttente`) n’est pas désactivé** (29/09/2026) : le « Suivant » d’une étape incomplète garde l’apparence du désactivé, mais c’est un bouton ordinaire — ni `disabled`, ni `aria-disabled`, et le lecteur d’écran ne l’annonce plus « indisponible ». Le toucher mène à ce qui manque (`StepShell`) au lieu d’avancer. Son nom ne change jamais selon ce qui manque : un nom qui suivrait les réponses ferait réannoncer le bouton à chaque choix. Sous le doigt, la teinte d’une surface neutre (`backgroundPressed`), pas le vert foncé de l’accent appuyé. `disabled` reste pour ce qui est vraiment inerte — un envoi en cours, « C’est noté » pendant l’aller-retour de l’engagement. Depuis le 01/10/2026, « C’est noté » d’une intention incomplète est en attente, comme « Suivant » (`v1-33` D13), et « Envoyer » de `/feedback` sous trois caractères aussi (D18).

```jsx
<Button title="Suivant" onPress={suivant} enAttente={manque !== null} flex />
```
