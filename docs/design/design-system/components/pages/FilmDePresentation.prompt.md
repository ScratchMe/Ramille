Le film de présentation, sur la page d'accueil du web (`PageDAccueil`, 23/10/2026) — « Le fil de Ramille », servi par le site en MP4 (`docs/communication/le-fil-de-ramille/`).

```jsx
<FilmDePresentation format="16x9" affiche="/film/le-fil-de-ramille-16x9.jpg" video="/film/le-fil-de-ramille-16x9.mp4" />
```

**Rien ne se lance seul** : ni lecture automatique, ni boucle, ni son coupé d'office ; les contrôles du navigateur portent la lecture, le son et le plein écran. `preload="none"` : une visite qui ne regarde pas le film ne coûte que l'affiche. « Réduire les animations » n'a donc rien à arrêter.

**Deux formats, choisis une fois à l'arrivée** : le 4:5 sur un écran étroit (sous 600 de large), le 16:9 au-delà — le 16:9 se compose à 1 600 de large, et ses textes deviennent illisibles sur un téléphone tenu droit. Tourner le téléphone ne change pas de source, ce qui couperait la lecture.

**L'arrondi est sur la vidéo, pas sur un cadre qui découpe** : une découpe permanente couperait l'anneau de focus que le navigateur dessine autour d'elle.

Sous le film, la page dit où le rappel arrive (« Sur Android, Ramille te fait signe par notification ; sur le web, par email. ») et offre sa version texte : c'est la page qui les porte, pas ce composant.
