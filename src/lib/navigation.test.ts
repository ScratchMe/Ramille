/**
 * `revenirOu` : dépiler quand on peut, aller au repli sinon. `terminerLeFlux` : vider la pile quand
 * on peut, puis remplacer.
 *
 * **Éprouvé en le cassant, le 28/09/2026** (TESTING.md §1.1), chaque mutation faisant tomber le sien
 * et lui seul :
 *   - `router.back()` sans condition (l'état d'avant, sur chaque « Retour » d'un écran ouvrable
 *     par son adresse) → « sans pile derrière… » ;
 *   - `router.replace(repli)` sans condition → « avec une pile derrière… ».
 *
 * **Et `terminerLeFlux`, le 01/10/2026**, même protocole :
 *   - `router.replace` seul, sans vider la pile (l'état d'avant, aux six sorties de flux) → « avec
 *     une pile derrière, la vide… », seul ;
 *   - `dismissAll()` sans `canDismiss()` → « sans rien à vider… », seul ;
 *   - le `replace` posé avant le `dismissAll` → « avec une pile derrière, la vide… », seul, par son
 *     ordre : le `POP_TO_TOP` emporterait la destination qu'on vient de poser ;
 *   - `router.back()` à la place du `dismissAll` → « avec une pile derrière, la vide… » **et** « ne
 *     dépile jamais… ».
 * La pile elle-même — ce que le retour fait **après** le flux — ne se voit pas ici : c'est le
 * parcours réel qui la joue (`scripts/verifier-parcours-reel.mjs`, « rattachement »).
 */
import { router } from 'expo-router';

import { revenirOu, terminerLeFlux } from './navigation';

jest.mock('expo-router', () => ({
  router: {
    canGoBack: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canDismiss: jest.fn(),
    dismissAll: jest.fn(),
  },
}));

const double = router as unknown as {
  canGoBack: jest.Mock;
  back: jest.Mock;
  replace: jest.Mock;
  canDismiss: jest.Mock;
  dismissAll: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('revenirOu', () => {
  it('avec une pile derrière, dépile et ne remplace rien', () => {
    double.canGoBack.mockReturnValue(true);
    revenirOu('/plan');
    expect(double.back).toHaveBeenCalledTimes(1);
    expect(double.replace).not.toHaveBeenCalled();
  });

  it('sans pile derrière — un favori, un rechargement —, va au repli au lieu de ne rien faire', () => {
    double.canGoBack.mockReturnValue(false);
    revenirOu('/plan');
    expect(double.back).not.toHaveBeenCalled();
    expect(double.replace).toHaveBeenCalledWith('/plan');
  });
});

describe('terminerLeFlux', () => {
  it('avec une pile derrière, la vide d’abord, puis remplace ce qui reste par la destination', () => {
    double.canDismiss.mockReturnValue(true);
    const ordre: string[] = [];
    double.dismissAll.mockImplementation(() => ordre.push('vider'));
    double.replace.mockImplementation((destination: string) => ordre.push(`remplacer ${destination}`));
    terminerLeFlux('/plan');
    expect(ordre).toEqual(['vider', 'remplacer /plan']);
  });

  it('sans rien à vider — un écran ouvert par son adresse —, remplace seulement', () => {
    double.canDismiss.mockReturnValue(false);
    terminerLeFlux('/');
    expect(double.dismissAll).not.toHaveBeenCalled();
    expect(double.replace).toHaveBeenCalledWith('/');
  });

  it('ne dépile jamais : une sortie de flux ne revient pas d’où l’on vient', () => {
    double.canDismiss.mockReturnValue(true);
    double.canGoBack.mockReturnValue(true);
    terminerLeFlux('/');
    expect(double.back).not.toHaveBeenCalled();
  });
});
