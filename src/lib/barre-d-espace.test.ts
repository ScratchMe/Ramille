// La barre d'espace sur un choix, sur web (25/09/2026) — ce que `activableALaBarreDEspace` décide
// d'un appui. Le geste lui-même, dans un vrai navigateur et à travers react-native-web, est éprouvé
// par `scripts/verifier-etats-export.mjs` (section F) et par le parcours réel : ce fichier garde les
// branches qu'aucun des deux ne peut provoquer à coup sûr — la répétition d'une touche maintenue, un
// contrôle désactivé, une touche venue d'un descendant, et la plateforme native.
//
// **Seul `Platform` est doublé, et par un mandataire** : c'est la méthode d'`app-url.test.ts`, qui dit
// pourquoi les deux autres salissent la sortie. `Platform.OS` est lu à l'appel et non au chargement,
// donc changer `mockPlatform.OS` suffit, sans recharger le module.
//
// **Éprouvé en le cassant le 25/09/2026**, une mutation à la fois, l'état d'avant réécrit ensuite :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | le garde de la répétition retiré (`repeat` active) | « une touche maintenue n'active qu'une fois » — seulement |
//   | Entrée reconnue comme Espace | « Entrée est laissée à react-native-web » — seulement |
//   | `preventDefault()` retiré | « Espace active le choix… » **et** « une touche maintenue… » |
//   | `desactive` ignoré | « rien sur un contrôle désactivé » — seulement |
//   | la comparaison `target` / `currentTarget` retirée | « rien pour une touche venue d'un descendant » — seulement |
//   | le garde de plateforme retiré | « rien sur natif » — seulement |
//   | « Spacebar » oublié | « reconnaît aussi “Spacebar” » — seulement |
import { activableALaBarreDEspace } from '@/lib/barre-d-espace';

const mockPlatform = { OS: 'web' };
jest.mock('react-native', () => {
  const reel = jest.requireActual('react-native');
  return new Proxy(reel as object, {
    get: (cible, cle) => (cle === 'Platform' ? mockPlatform : Reflect.get(cible, cle)),
  });
});

afterEach(() => {
  mockPlatform.OS = 'web';
});

type Gestionnaire = (touche: object) => void;

/** Un appui tel que react-native-web le transmet, sur le choix lui-même sauf mention contraire. */
function appui(key: string, { repeat = false, surUnDescendant = false } = {}) {
  const choix = {};
  return {
    key,
    repeat,
    currentTarget: choix,
    target: surUnDescendant ? {} : choix,
    preventDefault: jest.fn(),
  };
}

function gestionnaire(action: () => void, desactive?: boolean): Gestionnaire {
  const props = activableALaBarreDEspace(action, desactive);
  expect(typeof props.onKeyDown).toBe('function');
  return props.onKeyDown as Gestionnaire;
}

describe('activableALaBarreDEspace', () => {
  it('Espace active le choix, une fois, et empêche la page de défiler', () => {
    const action = jest.fn();
    const touche = appui(' ');
    gestionnaire(action)(touche);
    expect(action).toHaveBeenCalledTimes(1);
    expect(touche.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('reconnaît aussi « Spacebar », le nom que lui donnaient les navigateurs d’avant 2017', () => {
    const action = jest.fn();
    gestionnaire(action)(appui('Spacebar'));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('une touche maintenue n’active qu’une fois : la répétition retient la page, sans rien cocher', () => {
    // Sur une case à cocher, chaque répétition la ferait basculer : elle clignoterait sous le doigt
    // et finirait dans un état que la personne n'a pas choisi.
    const action = jest.fn();
    const surLeChoix = gestionnaire(action);
    const premier = appui(' ');
    const repetition = appui(' ', { repeat: true });
    surLeChoix(premier);
    surLeChoix(repetition);
    expect(action).toHaveBeenCalledTimes(1);
    expect(repetition.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('Entrée est laissée à react-native-web, qui l’active déjà : la prendre ici activerait deux fois', () => {
    const action = jest.fn();
    const touche = appui('Enter');
    gestionnaire(action)(touche);
    expect(action).not.toHaveBeenCalled();
    expect(touche.preventDefault).not.toHaveBeenCalled();
  });

  it('les autres touches ne font rien — la tabulation continue de passer', () => {
    const action = jest.fn();
    for (const key of ['Tab', 'a', 'ArrowDown', 'Escape']) {
      const touche = appui(key);
      gestionnaire(action)(touche);
      expect(touche.preventDefault).not.toHaveBeenCalled();
    }
    expect(action).not.toHaveBeenCalled();
  });

  it('rien sur un contrôle désactivé, pas même la page retenue — comme react-native-web pour ses boutons', () => {
    const action = jest.fn();
    const touche = appui(' ');
    gestionnaire(action, true)(touche);
    expect(action).not.toHaveBeenCalled();
    expect(touche.preventDefault).not.toHaveBeenCalled();
  });

  it('rien pour une touche venue d’un descendant focalisé : ce n’est pas un appui sur ce choix', () => {
    const action = jest.fn();
    const touche = appui(' ', { surUnDescendant: true });
    gestionnaire(action)(touche);
    expect(action).not.toHaveBeenCalled();
    expect(touche.preventDefault).not.toHaveBeenCalled();
  });

  it('rien sur natif : aucune prop n’est ajoutée au Pressable', () => {
    mockPlatform.OS = 'android';
    expect(activableALaBarreDEspace(jest.fn())).toEqual({});
  });
});
