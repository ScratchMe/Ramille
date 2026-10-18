/**
 * Les écoutes des pannes que le rendu ne voit pas (`src/lib/remontee-des-pannes.ts`) : le gestionnaire
 * global de React Native, chaîné ; le suivi des rejets de Hermes ; les deux événements du navigateur.
 *
 * **Un module d'entrée-sortie, testé en doublant exactement ce qu'il touche** (`TESTING.md` §1.2) : la
 * mesure (`@/lib/analytics`), la lecture de la version (`expo`, `expo-constants`), et l'environnement que
 * l'installation reçoit — `ErrorUtils`, `HermesInternal`, la fenêtre —, injecté plutôt que posé sur le
 * vrai `globalThis`. Ce que ces doubles ne disent pas, et qu'un appareil seul montre : que React Native
 * appelle vraiment ce gestionnaire sur une panne fatale, que l'app se ferme après l'écriture, et que la
 * panne part au lancement suivant (feuille de recette).
 *
 * Éprouvé en le cassant le 18/10/2026 (`TESTING.md` §1.1), une mutation à la fois :
 *   - le gestionnaire d'avant n'est plus appelé (`precedent(...)` retiré du chemin non fatal) → « chaîne le
 *     gestionnaire d'avant… », seul ;
 *   - la panne fatale passe au gestionnaire d'avant sans attendre son écriture → « une panne fatale attend
 *     d'être écrite… », seul ;
 *   - le plafond d'attente retiré (`setTimeout(rendre, …)` ôté) → « … au plus une seconde », seul ;
 *   - la panne fatale envoyée au lieu d'être gardée (`track` à la place de `garderUnePanne`) → « une panne
 *     fatale attend… » ;
 *   - le suivi des rejets posé en développement aussi (la garde `enDeveloppement` retirée) → « rien en
 *     développement », seul ;
 *   - l'écoute `error` sans filtre d'origine → « une erreur d'un autre script… », seul.
 */
const mockTrack = jest.fn();
const mockGarder = jest.fn<Promise<void>, [unknown]>();
jest.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
  garderUnePanne: (panne: unknown) => mockGarder(panne),
}));

let mockModuleNatif: { nativeApplicationVersion?: string; nativeBuildVersion?: string } | null = {
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '14',
};
jest.mock('expo', () => ({ requireOptionalNativeModule: () => mockModuleNatif }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '0.9.0' } } }));

type Module = typeof import('./remontee-des-pannes');
type Gestionnaire = (erreur: unknown, fatale?: boolean) => void;

/** Un module neuf : un lancement de l'app, avec son tri des pannes et sa version à relire. */
function charger(): Module {
  let module: Module | undefined;
  jest.isolateModules(() => {
    module = jest.requireActual<Module>('./remontee-des-pannes');
  });
  return module as Module;
}

/** Un `ErrorUtils` de React Native : le gestionnaire d'avant, et celui que le module pose. */
function errorUtils() {
  const precedent = jest.fn<void, [unknown, boolean | undefined]>();
  let pose: Gestionnaire = precedent;
  return {
    precedent,
    pose: (erreur: unknown, fatale?: boolean) => pose(erreur, fatale),
    double: {
      getGlobalHandler: () => precedent,
      setGlobalHandler: (gestionnaire: Gestionnaire) => {
        pose = gestionnaire;
      },
    },
  };
}

const laisserSePoser = () => new Promise((resoudre) => setTimeout(resoudre, 0));

beforeEach(() => {
  mockTrack.mockReset();
  mockGarder.mockReset().mockResolvedValue(undefined);
  mockModuleNatif = { nativeApplicationVersion: '1.0.0', nativeBuildVersion: '14' };
});

describe('sur natif, le gestionnaire global', () => {
  it('rien en développement : ni gestionnaire, ni suivi des rejets', () => {
    const { double, precedent } = errorUtils();
    const setGlobalHandler = jest.spyOn(double, 'setGlobalHandler');
    const hermes = { hasPromise: () => true, enablePromiseRejectionTracker: jest.fn() };

    charger().installerLaRemonteeDesPannes({
      enDeveloppement: true,
      plateforme: 'android',
      global: { ErrorUtils: double, HermesInternal: hermes },
    });

    expect(setGlobalHandler).not.toHaveBeenCalled();
    expect(hermes.enablePromiseRejectionTracker).not.toHaveBeenCalled();
    expect(precedent).not.toHaveBeenCalled();
  });

  it('chaîne le gestionnaire d’avant, et signale une panne non fatale tout de suite', () => {
    const { double, precedent, pose } = errorUtils();
    const module = charger();
    module.installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'android', global: { ErrorUtils: double } });
    module.noterLaRoute('/plan');

    const erreur = new TypeError('Écris à aide@exemple.fr');
    pose(erreur, false);

    expect(precedent).toHaveBeenCalledWith(erreur, false);
    expect(mockTrack).toHaveBeenCalledWith('app_error', {
      category: 'type',
      route: '/plan',
      origine: 'globale',
      version: '1.0.0+14',
    });
    expect(mockGarder).not.toHaveBeenCalled();
  });

  it('une panne fatale attend d’être écrite avant que l’app ne se ferme, et ne s’envoie pas', async () => {
    let ecrire: () => void = () => undefined;
    mockGarder.mockReturnValue(
      new Promise<void>((resoudre) => {
        ecrire = resoudre;
      })
    );
    const { double, precedent, pose } = errorUtils();
    charger().installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'android', global: { ErrorUtils: double } });

    const erreur = new ReferenceError('x');
    pose(erreur, true);

    expect(mockGarder).toHaveBeenCalledWith({ category: 'reference', route: '/', origine: 'fatale', version: '1.0.0+14' });
    expect(mockTrack).not.toHaveBeenCalled();
    expect(precedent).not.toHaveBeenCalled();

    ecrire();
    await laisserSePoser();
    expect(precedent).toHaveBeenCalledTimes(1);
    expect(precedent).toHaveBeenCalledWith(erreur, true);
  });

  it('une panne fatale dont l’écriture ne finit pas ferme l’app au plus une seconde après', () => {
    jest.useFakeTimers();
    try {
      mockGarder.mockReturnValue(new Promise<void>(() => undefined));
      const { double, precedent, pose } = errorUtils();
      const module = charger();
      module.installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'android', global: { ErrorUtils: double } });

      pose(new Error('x'), true);
      jest.advanceTimersByTime(module.DELAI_AVANT_LA_FIN_MS - 1);
      expect(precedent).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(precedent).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('une même panne ne se signale qu’une fois par lancement, et passe toujours au gestionnaire d’avant', () => {
    const { double, precedent, pose } = errorUtils();
    charger().installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'android', global: { ErrorUtils: double } });

    pose(new TypeError('a'), false);
    pose(new TypeError('b'), false);

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(precedent).toHaveBeenCalledTimes(2);
  });

  it('une mesure qui lève ne prive pas la panne du gestionnaire d’avant', () => {
    mockTrack.mockImplementation(() => {
      throw new Error('mesure en panne');
    });
    const { double, precedent, pose } = errorUtils();
    charger().installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'android', global: { ErrorUtils: double } });

    const erreur = new Error('x');
    pose(erreur, false);

    expect(precedent).toHaveBeenCalledWith(erreur, false);
  });

  it('s’installe une seule fois par chargement', () => {
    const { double } = errorUtils();
    const setGlobalHandler = jest.spyOn(double, 'setGlobalHandler');
    const module = charger();
    module.installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'android', global: { ErrorUtils: double } });
    module.installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'android', global: { ErrorUtils: double } });

    expect(setGlobalHandler).toHaveBeenCalledTimes(1);
  });
});

describe('sur natif, les promesses rejetées', () => {
  it('le suivi de Hermes signale un rejet que personne n’attend', () => {
    const hermes = { hasPromise: () => true, enablePromiseRejectionTracker: jest.fn() };
    charger().installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'android', global: { HermesInternal: hermes } });

    expect(hermes.enablePromiseRejectionTracker).toHaveBeenCalledWith(expect.objectContaining({ allRejections: true }));
    const { onUnhandled } = hermes.enablePromiseRejectionTracker.mock.calls[0][0] as {
      onUnhandled: (id: number, raison: unknown) => void;
    };
    onUnhandled(1, new RangeError('x'));
    expect(mockTrack).toHaveBeenCalledWith('app_error', expect.objectContaining({ category: 'range', origine: 'promesse' }));
  });

  it('rien sans les promesses de Hermes', () => {
    const hermes = { hasPromise: () => false, enablePromiseRejectionTracker: jest.fn() };
    charger().installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'android', global: { HermesInternal: hermes } });
    expect(hermes.enablePromiseRejectionTracker).not.toHaveBeenCalled();
  });
});

describe('sur le web', () => {
  type Ecoute = (evenement: Record<string, unknown>) => void;
  function fenetre() {
    const ecoutes: Record<string, Ecoute> = {};
    return {
      ecoutes,
      double: {
        addEventListener: (type: string, ecoute: Ecoute) => {
          ecoutes[type] = ecoute;
        },
        location: { origin: 'https://www.ramille.fr' },
      },
    };
  }
  const installer = (double: ReturnType<typeof fenetre>['double']) =>
    charger().installerLaRemonteeDesPannes({
      enDeveloppement: false,
      plateforme: 'web',
      global: { window: double as never },
    });

  it('signale une exception de notre bundle, et une promesse rejetée sans personne pour l’attendre', () => {
    const { ecoutes, double } = fenetre();
    installer(double);

    ecoutes.error({ error: new TypeError('x'), filename: 'https://www.ramille.fr/_expo/static/js/web/entry.js' });
    ecoutes.unhandledrejection({ reason: new SyntaxError('x') });

    expect(mockTrack).toHaveBeenNthCalledWith(1, 'app_error', expect.objectContaining({ category: 'type', origine: 'globale' }));
    expect(mockTrack).toHaveBeenNthCalledWith(2, 'app_error', expect.objectContaining({ category: 'syntax', origine: 'promesse' }));
  });

  it('une erreur d’un autre script, ou d’hydratation, ne se signale pas', () => {
    const { ecoutes, double } = fenetre();
    installer(double);

    ecoutes.error({ error: null, filename: '' });
    ecoutes.error({ error: new Error('x'), filename: 'chrome-extension://abc/contenu.js' });
    ecoutes.error({ error: new Error('Minified React error #418'), filename: '' });

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('sans fenêtre — l’export statique, sous Node —, rien ne se pose et rien ne lève', () => {
    expect(() =>
      charger().installerLaRemonteeDesPannes({ enDeveloppement: false, plateforme: 'web', global: {} })
    ).not.toThrow();
  });
});

describe('versionDeCetteApp', () => {
  it('lit le binaire installé : la version et son build', () => {
    expect(charger().versionDeCetteApp()).toBe('1.0.0+14');
  });

  it('sans le module natif, la version d’`app.json` seule', () => {
    mockModuleNatif = null;
    expect(charger().versionDeCetteApp()).toBe('0.9.0');
  });
});
