/**
 * @jest-environment jsdom
 */
/**
 * Le film de la page d'accueil, **sur web** : la balise `<video>` rendue par react-native-web dans jsdom
 * (23/10/2026, étape 5 de `v1-35`). Le rendu natif n'en rend rien — le film n'existe que sur le web.
 *
 * **Deux promesses, que rien d'autre ne voit** :
 *   - **rien ne se lance seul** : ni lecture automatique, ni boucle, ni son coupé d'office (qui accompagne
 *     toujours une lecture automatique), et rien ne se télécharge avant qu'on le demande. « Réduire les
 *     animations » ne doit rien mettre en mouvement (`FRONT-MOUVEMENT.md`), et une visite qui ne regarde
 *     pas le film ne coûte que l'affiche ;
 *   - **le format suit l'écran à l'arrivée** : le 4:5 sous 600 px de large, le 16:9 au-delà.
 *
 * **Ce qu'il ne voit pas** : que les fichiers existent dans l'export (`scripts/verifier-rendu-export.mjs`, le
 * bloc du film, depuis le 23/10/2026), et que le site les serve en `video/mp4` (le parcours réel, étape 0 bis).
 *
 * **Éprouvé en le cassant, le 23/10/2026** — voir le relevé au pied.
 */
import { act, type ReactNode } from 'react';
import { Dimensions } from 'react-native';

import { FilmDePresentation } from '@/components/accueil/film-de-presentation.web';
import { FILM } from '@/constants/accueil';

type Root = { render: (contenu: ReactNode) => void; unmount: () => void };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRoot } = require('react-dom/client') as { createRoot: (hote: Element) => Root };

jest.mock('react-native', () => jest.requireActual('react-native-web'));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'fetch', { value: undefined, configurable: true, writable: true });

let racine: Root | null = null;

async function monterALaLargeur(largeur: number): Promise<HTMLVideoElement> {
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: largeur, height: 800, scale: 1, fontScale: 1 });
  const hote = document.createElement('div');
  document.body.appendChild(hote);
  racine = createRoot(hote);
  await act(async () => racine!.render(<FilmDePresentation />));
  const video = document.querySelector('video');
  if (!video) throw new Error('Aucune balise <video> rendue.');
  return video;
}

afterEach(async () => {
  await act(async () => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

describe('le film de la page d’accueil, sur web', () => {
  it('ne se lance pas seul, ne boucle pas, et ne télécharge rien avant qu’on le demande', async () => {
    const video = await monterALaLargeur(1280);
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.hasAttribute('loop')).toBe(false);
    // Une propriété, pas un attribut : React ne l'écrit pas dans le DOM.
    expect(video.muted).toBe(false);
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.getAttribute('aria-label')).toBe(FILM.titre);
  });

  it('au-delà de 600 px de large, le 16:9 et son affiche', async () => {
    const video = await monterALaLargeur(1280);
    expect(video.getAttribute('poster')).toBe(FILM.sources.large.affiche);
    expect(video.querySelector('source')?.getAttribute('src')).toBe(FILM.sources.large.video);
  });

  it('sous 600 px, le 4:5 et son affiche', async () => {
    const video = await monterALaLargeur(390);
    expect(video.getAttribute('poster')).toBe(FILM.sources.etroit.affiche);
    expect(video.querySelector('source')?.getAttribute('src')).toBe(FILM.sources.etroit.video);
  });
});

// Relevé des mutations, le 23/10/2026, chacune posée dans `film-de-presentation.web.tsx` puis ce fichier
// rejoué, le composant restauré ensuite :
//   - `autoPlay` ajouté → « ne se lance pas seul… », seul ;
//   - `loop` ajouté → le même, seul ;
//   - `muted` ajouté → le même, seul — lu comme une propriété : React ne l'écrit pas en attribut, et
//     `hasAttribute('muted')` restait vert sous cette mutation ;
//   - `preload="metadata"` → le même, seul ;
//   - les deux formats inversés → « au-delà de 600 px… » et « sous 600 px… ».
