import { uneSeuleFois } from './une-seule-fois';

describe('uneSeuleFois', () => {
  // Le cas réel : deux écrans appellent `ensureSession()` dans le même rendu, aucun des deux
  // n'attend l'autre. Sans fusion, les deux lisent « pas de session » et deux comptes anonymes
  // sont créés.
  it('ne lance qu’un seul appel pour deux appelants concurrents', async () => {
    let appels = 0;
    let resoudre: ((valeur: string) => void) | undefined;
    const fusionnee = uneSeuleFois(() => {
      appels += 1;
      return new Promise<string>((r) => {
        resoudre = r;
      });
    });

    const premier = fusionnee();
    const second = fusionnee();
    expect(appels).toBe(1);

    resoudre?.('session-a');
    await expect(premier).resolves.toBe('session-a');
    await expect(second).resolves.toBe('session-a');
  });

  // Ce qui est partagé, c'est la promesse **en vol**, jamais son résultat : `ensureSession()`
  // reste une vérification et non un cache, sinon la re-vérification avant l'écriture du bilan
  // rendrait une session périmée.
  it('rappelle la fabrique pour un appel lancé après la fin du précédent', async () => {
    let appels = 0;
    const fusionnee = uneSeuleFois(async () => {
      appels += 1;
      return `session-${appels}`;
    });

    await expect(fusionnee()).resolves.toBe('session-1');
    await expect(fusionnee()).resolves.toBe('session-2');
    expect(appels).toBe(2);
  });

  // Sans relâchement, une coupure réseau au démarrage condamnerait l'app jusqu'au prochain
  // lancement : tous les appels suivants recevraient la même promesse déjà rejetée.
  it('relâche la mémoïsation après un échec, et réessaie', async () => {
    let appels = 0;
    const fusionnee = uneSeuleFois(async () => {
      appels += 1;
      if (appels === 1) throw new Error('réseau indisponible');
      return 'session-b';
    });

    await expect(fusionnee()).rejects.toThrow('réseau indisponible');
    await expect(fusionnee()).resolves.toBe('session-b');
    expect(appels).toBe(2);
  });

  // Les deux appelants concurrents d'un appel qui échoue voient le même échec — aucun des deux
  // ne doit croire qu'il a une session.
  it('partage l’échec avec tous les appelants concurrents', async () => {
    let rejeter: ((erreur: Error) => void) | undefined;
    const fusionnee = uneSeuleFois(
      () =>
        new Promise<string>((_, r) => {
          rejeter = r;
        })
    );

    const premier = fusionnee();
    const second = fusionnee();
    rejeter?.(new Error('refusé'));

    await expect(premier).rejects.toThrow('refusé');
    await expect(second).rejects.toThrow('refusé');
  });
});
