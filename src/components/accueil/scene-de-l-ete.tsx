// Sur natif, la scène de l'été ne se rend pas : la page d'accueil qui la porte n'existe que sur le web
// (`destinationSurLaPlateforme`, `src/types/demarrage.ts`). Le pendant web, un dessin SVG du navigateur avec son
// mouvement, est `scene-de-l-ete.web.tsx`. **Les deux lisent le même type** (`LectureDuRecit`) : la page est typée
// contre ce fichier-ci, et une prop ajoutée d'un seul côté ne se verrait pas.
import type { LectureDuRecit } from '@/types/mouvement';

export function SceneDeLEte(_: LectureDuRecit) {
  return null;
}
