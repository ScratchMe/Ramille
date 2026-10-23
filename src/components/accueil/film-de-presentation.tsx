// Sur natif, le film ne se rend pas : la page d'accueil qui le porte n'existe que sur le web
// (`destinationSurLaPlateforme`, `src/types/demarrage.ts`). Le pendant web, avec la balise `<video>`, est
// `film-de-presentation.web.tsx`.
export function FilmDePresentation() {
  return null;
}
