/**
 * @jest-environment jsdom
 */
/**
 * La scène de l'été en tête de la page d'accueil, **sur web** : le dessin SVG rendu par react-native-web dans jsdom
 * (31/10/2026, `v1-36` §3 et §4). Le rendu natif n'en rend rien — la page n'existe que sur le web.
 *
 * **Trois promesses, que rien d'autre ne voit** :
 *   - **le lecteur d'écran la décrit** : une image, avec sa phrase (`RECIT.scene`) ;
 *   - **elle part une fois, quand elle paraît, et jamais sous « réduire les animations »** : l'état du récit
 *     (`etatDuRecit`, testé) arrive bien jusqu'à la classe du dessin, qui est ce que la feuille de style lit ;
 *   - **elle s'arrête d'elle-même avant cinq secondes**, sans rien qui boucle (WCAG 2.2.2) : la table des gestes
 *     est bornée par `finDuMouvement`, et la feuille de style n'écrit jamais `infinite`.
 *
 * **Ce qu'il ne voit pas** : que le dessin soit beau, et que chaque animation finisse sur l'image posée — ça se
 * regarde image par image (`.claude/skills/mouvement/SKILL.md`), et `v1-13` §11.W.14 le fait juger à l'œil.
 *
 * **Éprouvé en le cassant, le 31/10/2026** — voir le relevé au pied.
 */
import { act, type ReactNode } from 'react';

import { GESTES_DE_LA_SCENE, SceneDeLEte } from '@/components/accueil/scene-de-l-ete.web';
import { RECIT } from '@/constants/accueil';
import { finDuMouvement } from '@/types/mouvement';

type Root = { render: (contenu: ReactNode) => void; unmount: () => void };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRoot } = require('react-dom/client') as { createRoot: (hote: Element) => Root };

jest.mock('react-native', () => jest.requireActual('react-native-web'));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let racine: Root | null = null;

async function monter(etat: { vu: boolean; reduit: boolean }): Promise<SVGSVGElement> {
  const hote = document.createElement('div');
  document.body.appendChild(hote);
  racine = createRoot(hote);
  await act(async () => racine!.render(<SceneDeLEte {...etat} />));
  const dessin = document.querySelector('svg');
  if (!dessin) throw new Error('Aucun dessin <svg> rendu.');
  return dessin;
}

afterEach(async () => {
  await act(async () => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
});

describe('la scène de l’été, sur web', () => {
  it('est une image que le lecteur d’écran décrit', async () => {
    const dessin = await monter({ vu: true, reduit: false });
    expect(dessin.getAttribute('role')).toBe('img');
    expect(dessin.getAttribute('aria-label')).toBe(RECIT.scene);
  });

  it('attend de paraître, puis part une fois parue', async () => {
    expect((await monter({ vu: false, reduit: false })).getAttribute('class')).toBe(
      'scene-de-l-ete scene-depart'
    );
    await act(async () => racine!.render(<SceneDeLEte vu reduit={false} />));
    expect(document.querySelector('svg')!.getAttribute('class')).toBe('scene-de-l-ete scene-anime');
  });

  it('sous « réduire les animations », posée, qu’elle ait paru ou non', async () => {
    expect((await monter({ vu: false, reduit: true })).getAttribute('class')).toBe('scene-de-l-ete');
    await act(async () => racine!.render(<SceneDeLEte vu reduit />));
    expect(document.querySelector('svg')!.getAttribute('class')).toBe('scene-de-l-ete');
  });

  it('s’arrête d’elle-même avant cinq secondes, et rien ne boucle', async () => {
    expect(finDuMouvement(GESTES_DE_LA_SCENE)).toBeLessThan(5000);
    const dessin = await monter({ vu: true, reduit: false });
    const feuille = dessin.querySelector('style')?.textContent ?? '';
    expect(feuille).not.toMatch(/infinite/);
    // Chaque geste de la table a sa règle, et chaque règle d'animation vient de la table.
    for (const geste of GESTES_DE_LA_SCENE) {
      expect(feuille).toContain(
        `.scene-anime .${geste.element} { animation: ${geste.images} ${geste.duree}ms`
      );
      expect(dessin.querySelector(`.${geste.element}`)).not.toBeNull();
    }
    expect(feuille.match(/animation:/g)).toHaveLength(GESTES_DE_LA_SCENE.length);
  });
});

// Relevé des mutations, le 31/10/2026, chacune posée dans `scene-de-l-ete.web.tsx` puis ce fichier rejoué seul,
// la scène restaurée ensuite :
//   - la classe de départ retirée (`depart: ''`) → « attend de paraître », seul ;
//   - la préférence ignorée (`etatDuRecit({ vu, reduit: false })`) → « sous réduire les animations », seul ;
//   - l'éventail joué sans fin (`fois: Infinity`) → « s'arrête d'elle-même », seul ;
//   - l'`aria-label` retiré → « est une image que le lecteur d'écran décrit », seul.
