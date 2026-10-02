/**
 * Le propriétaire des marques locales — [#319](https://github.com/ScratchMe/Ramille/issues/319).
 *
 * La table entière, parce qu'elle est petite et que chaque case est une décision : `rien` pour le
 * propriétaire, `balayer` pour tout autre compte, et l'inconnu laissé à l'appelant. Ce fichier garde la
 * fonction ; ses deux appels — `ensureSession()` en `noter`, `apresUneReconnexion()` en `balayer` — sont
 * gardés sur le client réel (`src/lib/session-refusee.test.ts`), où sont aussi les mutations.
 */
import { conciliationDesMarques } from '@/types/marques-locales';

describe('conciliationDesMarques', () => {
  it('ne fait rien pour le propriétaire, quel que soit le cas de l’inconnu', () => {
    expect(conciliationDesMarques('compte-a', 'compte-a', 'noter')).toBe('rien');
    expect(conciliationDesMarques('compte-a', 'compte-a', 'balayer')).toBe('rien');
  });

  it('balaie pour un autre compte, quel que soit le cas de l’inconnu', () => {
    expect(conciliationDesMarques('compte-a', 'compte-b', 'noter')).toBe('balayer');
    expect(conciliationDesMarques('compte-a', 'compte-b', 'balayer')).toBe('balayer');
  });

  it('sans propriétaire noté, fait ce que l’appelant demande', () => {
    expect(conciliationDesMarques(null, 'compte-b', 'noter')).toBe('noter');
    expect(conciliationDesMarques(null, 'compte-b', 'balayer')).toBe('balayer');
  });
});
