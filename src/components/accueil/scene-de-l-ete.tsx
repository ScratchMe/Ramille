// Sur natif, la scène de l'été ne se rend pas : la page d'accueil qui la porte n'existe que sur le web
// (`destinationSurLaPlateforme`, `src/types/demarrage.ts`). Le pendant web, un dessin SVG du navigateur avec son
// mouvement, est `scene-de-l-ete.web.tsx`.
export function SceneDeLEte(_: { vu: boolean; reduit: boolean }) {
  return null;
}
