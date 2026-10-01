/**
 * `useRetourVersLaPhasePrecedente` : sur Android, le retour matériel recule d'une phase quand
 * l'écran en a une, et passe à la navigation sinon.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (TESTING.md §1.1), une mutation à la fois :
 *
 *   | Ce qu'on casse | Ce qui tombe |
 *   |---|---|
 *   | `return true` toujours, même sans phase précédente | « sans phase précédente… », et « l'appui voit la phase courante… » par sa dernière assertion (la phase repassée à `null`) |
 *   | l'action lue à l'abonnement plutôt qu'à l'appui (`precedente` au lieu de `action.current`) | « l'appui voit la phase courante… » — seulement |
 *   | la garde `Platform.OS !== 'android'` retirée | « hors d'Android… » — seulement |
 *   | `abonnement.remove()` retiré du nettoyage | « au démontage… » — seulement |
 */
import { renderHook } from '@testing-library/react-native';
import { BackHandler, Platform } from 'react-native';

import { useRetourVersLaPhasePrecedente } from './use-retour-vers-la-phase-precedente';

type Ecouteur = () => boolean | null | undefined;

let ecouteurs: Ecouteur[] = [];
const retire = jest.fn();

beforeEach(() => {
  ecouteurs = [];
  retire.mockClear();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_evenement, ecouteur) => {
    ecouteurs.push(ecouteur as Ecouteur);
    return {
      remove: () => {
        retire();
        ecouteurs = ecouteurs.filter((e) => e !== ecouteur);
      },
    };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Ce que fait Android à l'appui : le dernier écouteur abonné parle le premier. */
function appuyerSurRetour(): boolean {
  for (const ecouteur of [...ecouteurs].reverse()) {
    if (ecouteur()) return true;
  }
  return false;
}

function surAndroid() {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
}

describe('useRetourVersLaPhasePrecedente', () => {
  const osDOrigine = Platform.OS;
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => osDOrigine });
  });

  it('avec une phase précédente, le retour y recule et ne quitte pas l’écran', () => {
    surAndroid();
    const reculer = jest.fn();
    renderHook(() => useRetourVersLaPhasePrecedente(reculer));
    expect(appuyerSurRetour()).toBe(true);
    expect(reculer).toHaveBeenCalledTimes(1);
  });

  it('sans phase précédente, le retour passe à la navigation', () => {
    surAndroid();
    renderHook(() => useRetourVersLaPhasePrecedente(null));
    expect(appuyerSurRetour()).toBe(false);
  });

  it('l’appui voit la phase courante, sans se réabonner à chaque rendu', () => {
    surAndroid();
    const premiere = jest.fn();
    const seconde = jest.fn();
    const { rerender } = renderHook(
      ({ precedente }: { precedente: (() => void) | null }) => useRetourVersLaPhasePrecedente(precedente),
      { initialProps: { precedente: premiere as (() => void) | null } }
    );
    rerender({ precedente: seconde });
    expect(appuyerSurRetour()).toBe(true);
    expect(premiere).not.toHaveBeenCalled();
    expect(seconde).toHaveBeenCalledTimes(1);

    rerender({ precedente: null });
    expect(appuyerSurRetour()).toBe(false);
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('au démontage, l’écoute est retirée', () => {
    surAndroid();
    const { unmount } = renderHook(() => useRetourVersLaPhasePrecedente(jest.fn()));
    unmount();
    expect(retire).toHaveBeenCalledTimes(1);
    expect(appuyerSurRetour()).toBe(false);
  });

  it('hors d’Android, rien n’est abonné', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    renderHook(() => useRetourVersLaPhasePrecedente(jest.fn()));
    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });
});
