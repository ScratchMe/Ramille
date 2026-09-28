/**
 * `revenirOu` : dépiler quand on peut, aller au repli sinon.
 *
 * **Éprouvé en le cassant, le 28/09/2026** (TESTING.md §1.1), chaque mutation faisant tomber le sien
 * et lui seul :
 *   - `router.back()` sans condition (l'état d'avant, sur dix écrans) → « sans pile derrière… » ;
 *   - `router.replace(repli)` sans condition → « avec une pile derrière… ».
 */
import { router } from 'expo-router';

import { revenirOu } from './navigation';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const double = router as unknown as {
  canGoBack: jest.Mock;
  back: jest.Mock;
  replace: jest.Mock;
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
