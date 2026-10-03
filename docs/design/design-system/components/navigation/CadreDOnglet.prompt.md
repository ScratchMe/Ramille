Le cadre d’une pile d’onglet : la bande haute en haut, l’écran dessous.

```jsx
<CadreDOnglet>
  <EcranDuPlan />
</CadreDOnglet>
```

**Posé par la pile, jamais par un écran** (`v1-33` T-13, 03/10/2026). Chaque écran des deux onglets rendait lui-même la zone sûre et la bande, état par état — seize fois —, et le chargement de la restitution les avait perdues : la bande arrivait avec le contenu, d’un saut de 52 px (R-9). Le layout de chaque pile (`(tabs)/plan/_layout.tsx`, `(tabs)/suivi/_layout.tsx`) pose ce cadre autour de sa `Stack` : un écran ne rend que son contenu, et aucun de ses états ne peut oublier la bande.

La bande reste au-dessus de la pile : quand on pousse les pistes ou une restitution, elle ne bouge pas, et c’est dans son créneau de gauche que viendra le retour dont iOS aura besoin. Sans bord bas — la barre d’onglets porte le sien.
