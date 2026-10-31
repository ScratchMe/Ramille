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
 *     est bornée par `finDuMouvement`, et la feuille de style n'écrit jamais `infinite` ;
 *   - **elle part et finit sans saut** : la première image de chaque animation est déjà celle que montre la scène
 *     avant de paraître (`.scene-depart`), ou l'élément est invisible des deux côtés ; la dernière est l'image
 *     posée, celle de « réduire les animations ».
 *
 * **Ce qu'il ne voit pas** : que le dessin soit beau, et ce qui se passe entre la première image et la dernière — ça
 * se regarde image par image (`.claude/skills/mouvement/SKILL.md`), et `v1-13` §11.W.14 le fait juger à l'œil.
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
// Sans quoi « Cannot log after tests are done » sort quand la suite entière tourne (`TESTING.md` §2.10).
Object.defineProperty(globalThis, 'fetch', { value: undefined, configurable: true, writable: true });

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

/** Les déclarations d'une règle, normalisées : « transform: scale(0.5); opacity: 0; » → un tri stable. */
const declarations = (bloc: string) =>
  bloc
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .sort()
    .join('; ');

/** La première ou la dernière image d'une animation de la feuille, ses déclarations normalisées. */
function imageCle(feuille: string, nom: string, bout: 'premiere' | 'derniere'): string | null {
  const corps = new RegExp(`^@keyframes ${nom} \\{(.*)\\}$`, 'm').exec(feuille)?.[1];
  if (!corps) return null;
  const voulus = bout === 'premiere' ? ['from', '0%'] : ['to', '100%'];
  // Le dernier bloc qui nomme l'image l'emporte, comme dans le navigateur : « 0%, 100% » puis « 100% » plus bas
  // finissent sur le second.
  let image: string | null = null;
  for (const [, selecteurs, bloc] of corps.matchAll(/([\w%,\s]+?)\s*\{([^}]*)\}/g)) {
    const bouts = selecteurs!.split(',').map((t) => t.trim());
    if (bouts.some((t) => voulus.includes(t))) image = declarations(bloc!);
  }
  return image;
}

describe('le départ et la fin de la scène', () => {
  it('chaque animation part de l’image que la scène montre avant de paraître, ou d’un élément invisible', async () => {
    const dessin = await monter({ vu: false, reduit: false });
    const feuille = dessin.querySelector('style')?.textContent ?? '';
    const regles = [...feuille.matchAll(/^([^@{}\n]+)\{([^{}]*)\}$/gm)].map(([, selecteurs, bloc]) => ({
      selecteurs: selecteurs!.split(',').map((s) => s.trim()),
      bloc: declarations(bloc!),
    }));
    const auDepart = (classe: string) =>
      regles.filter((r) => r.selecteurs.includes(`.scene-depart .${classe}`)).map((r) => r.bloc);
    const auRepos = (classe: string) =>
      regles.filter((r) => r.selecteurs.includes(`.${classe}`)).map((r) => r.bloc);
    const NEUTRES = [
      'transform: rotate(0)',
      'transform: translateX(0)',
      'transform: translateY(0)',
      'transform: scale(1)',
    ];

    for (const geste of GESTES_DE_LA_SCENE) {
      const premiere = imageCle(feuille, geste.images, 'premiere');
      expect(premiere).not.toBeNull();
      if (premiere === null) continue;
      if (NEUTRES.includes(premiere)) continue;
      const classes = [...dessin.querySelector(`.${geste.element}`)!.classList];
      const invisible = (blocs: string[]) => blocs.some((b) => b.split('; ').includes('opacity: 0'));
      const depart = classes.flatMap(auDepart);
      const couvert =
        depart.includes(premiere) ||
        (premiere.split('; ').includes('opacity: 0') &&
          (invisible(depart) || invisible(classes.flatMap(auRepos))));
      expect({ geste: geste.element, couvert }).toEqual({ geste: geste.element, couvert: true });
    }
  });

  it('chaque animation finit sur l’image posée : rien ne saute à la fin, ni sous « réduire les animations »', async () => {
    const dessin = await monter({ vu: true, reduit: false });
    const feuille = dessin.querySelector('style')?.textContent ?? '';
    const IDENTITES = ['rotate(0)', 'translateX(0)', 'translateY(0)', 'scale(1)', 'rotate(0) scale(1)'];
    for (const geste of GESTES_DE_LA_SCENE) {
      const derniere = imageCle(feuille, geste.images, 'derniere');
      expect(derniere).not.toBeNull();
      const traits = (derniere ?? '').split('; ');
      const auRepos = traits.every(
        (t) => t === 'opacity: 1' || IDENTITES.some((i) => t === `transform: ${i}`)
      );
      // Ce qui finit invisible doit l'être au repos aussi : sous la préférence, il n'existe pas.
      const cacheAuRepos =
        traits.includes('opacity: 0') &&
        [...dessin.querySelector(`.${geste.element}`)!.classList].some((c) =>
          new RegExp(`^\\.${c} \\{ opacity: 0; \\}$`, 'm').test(feuille)
        );
      expect({ geste: geste.element, finit: auRepos || cacheAuRepos }).toEqual({
        geste: geste.element,
        finit: true,
      });
    }
  });
});

// Relevé des mutations, le 31/10/2026, chacune posée dans `scene-de-l-ete.web.tsx` puis ce fichier rejoué seul,
// la scène restaurée ensuite :
//   - la classe de départ retirée (`depart: ''`) → « attend de paraître », seul ;
//   - la préférence ignorée (`etatDuRecit({ vu, reduit: false })`) → « sous réduire les animations », seul ;
//   - l'éventail joué sans fin (`fois: Infinity`) → « s'arrête d'elle-même », seul ;
//   - l'`aria-label` retiré → « est une image que le lecteur d'écran décrit », seul ;
//   - la règle `.scene-depart .se-halo` retirée → « chaque animation part de l'image… », seul ;
//   - la règle `.se-goutte-tombe { opacity: 0; }` retirée → « chaque animation finit sur l'image posée », seul ;
//   - l'éventail qui finit penché (`100% { transform: rotate(8deg) }`) → « chaque animation finit… », seul.
