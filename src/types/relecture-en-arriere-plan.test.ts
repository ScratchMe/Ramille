/**
 * La reprise silencieuse des deux lectures de l'entrée d'un re-bilan (`v1-33` §9, 02/10/2026).
 *
 * Éprouvé en le cassant le 02/10/2026 (`TESTING.md` §1.1), chacune faisant tomber la sienne :
 *   - la boucle qui ne relit jamais (`return resultat` en tête) → « relit après un échec… » et
 *     « s’arrête au bout… » ;
 *   - la garde `annule()` après l'attente retirée → « ne relit plus un écran quitté… », seul ;
 *   - la condition de reprise ignorée (relire même un succès) → « ne relit pas un succès » et « relit
 *     après un échec… » (qui compte ses lectures).
 */
import { DELAIS_DE_RELECTURE, relireEnArrierePlan } from '@/types/relecture-en-arriere-plan';

/** Une lecture qui rend, dans l'ordre, les résultats donnés — et compte ses appels. */
function lectures<T>(...resultats: T[]) {
  let appel = 0;
  const lire = jest.fn(async () => resultats[Math.min(appel++, resultats.length - 1)]);
  return lire;
}

const attentes: number[] = [];
const attendre = async (ms: number) => {
  attentes.push(ms);
};
beforeEach(() => {
  attentes.length = 0;
});

describe('relireEnArrierePlan', () => {
  it('ne relit pas un succès', async () => {
    const lire = lectures({ ok: true });
    expect(await relireEnArrierePlan(lire, (r) => !r.ok, { attendre })).toEqual({ ok: true });
    expect(lire).toHaveBeenCalledTimes(1);
    expect(attentes).toEqual([]);
  });

  it('relit après un échec, et rend le premier succès', async () => {
    const lire = lectures({ ok: false }, { ok: true });
    expect(await relireEnArrierePlan(lire, (r) => !r.ok, { attendre })).toEqual({ ok: true });
    expect(lire).toHaveBeenCalledTimes(2);
    expect(attentes).toEqual([1000]);
  });

  it('s’arrête au bout de ses délais, et rend le dernier échec', async () => {
    const lire = lectures({ ok: false });
    expect(await relireEnArrierePlan(lire, (r) => !r.ok, { attendre })).toEqual({ ok: false });
    expect(lire).toHaveBeenCalledTimes(1 + DELAIS_DE_RELECTURE.length);
    expect(attentes).toEqual([...DELAIS_DE_RELECTURE]);
  });

  it('ne relit plus un écran quitté pendant l’attente', async () => {
    let quitte = false;
    const lire = lectures({ ok: false }, { ok: true });
    const resultat = await relireEnArrierePlan(lire, (r) => !r.ok, {
      attendre: async () => {
        quitte = true;
      },
      annule: () => quitte,
    });
    expect(resultat).toEqual({ ok: false });
    expect(lire).toHaveBeenCalledTimes(1);
  });
});
