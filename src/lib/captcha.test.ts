/**
 * Le jeton du captcha Turnstile (`captcha.ts`) : quand il y en a un, quand il n'y en a pas, et que
 * le widget ne reste jamais derrière lui.
 *
 * Les doubles : un `document` réduit à ce que le module touche — son absence tient lieu de natif,
 * et le `turnstile` que le script déclarerait en se chargeant. **Ce que ce fichier ne voit pas, et
 * qu'aucune garde de la CI ne voit** : le vrai widget, ses noms d'hôte, et la CSP qui le laisse
 * entrer — la CI n'a pas de clé de site, donc le script n'y est jamais chargé. Ils ont été vus une
 * fois à la main, le 04/10/2026 (export avec la clé de test publique de Cloudflare, servi sous la
 * CSP de production : le jeton de test part avec la création de session, sans infraction), et se
 * revoient en production (`docs/exploitation/README.md` §3.11).
 *
 * Éprouvé en cassant ce qu'il garde, le 04/10/2026, puis rejoué après la contre-lecture de la PR
 * #359, puis pour la carte de la case à cocher (voir plus bas) : le contrôle de la clé retiré fait tomber le premier test, seul ; le conteneur jamais
 * retiré, les troisième, quatrième, cinquième et sixième ; le widget jamais retiré, les troisième
 * et quatrième ; le chargement qui pend jamais oublié au plafond, le sixième, seul — sa balise
 * jamais retirée, le sixième aussi ; deux widgets posés ensemble (la file retirée), le septième,
 * seul ; le chargement gardé après un échec, le dernier, seul. **Le retour anticipé « ni web ni vue
 * web branchée » retiré ne fait rien tomber, et c'est une mutation équivalente** : sans lui, la
 * demande part vers le widget du web, l'accès à `document` y lève dans la promesse, et le `catch` rend
 * le même `undefined`. Il reste pour qu'on lise la règle au lieu de la déduire. (Le choix entre le web
 * et le pont, lui, est gardé : voir le bloc natif plus bas.)
 *
 * **La carte de la case à cocher** (04/10/2026), éprouvée de même, chaque mutation ne faisant tomber
 * que « quand Cloudflare demande de cocher… » : le délai non prolongé à la demande ; le plafond
 * supprimé à la demande, sans relais — le retour au blocage sans fin ; la carte jamais montrée.
 *
 * **Le pont de l'app Android** (04/10/2026), éprouvé de même : la case demandée sans délai relais fait
 * tomber « la case demandée laisse deux minutes… », seul ; la vue web jamais retirée, les trois
 * premiers tests du bloc natif ; le pont ignoré (aucun jeton sans `document`), les trois mêmes.
 */
type Element = {
  tag: string;
  style: Record<string, string>;
  attributs: Record<string, string>;
  enfants: Element[];
  textContent: string;
  retire: boolean;
  focalise: boolean;
  src?: string;
  onload?: () => void;
  onerror?: () => void;
  setAttribute(nom: string, valeur: string): void;
  appendChild(enfant: Element): void;
  focus(): void;
  remove(): void;
};

type OptionsRecues = {
  sitekey: string;
  action: string;
  callback: (jeton: string) => void;
  'error-callback': () => boolean;
  'before-interactive-callback': () => void;
};

let scripts: Element[];
let conteneurs: Element[];
let rendus: OptionsRecues[];
let retires: string[];

function element(tag: string): Element {
  const el: Element = {
    tag,
    style: {},
    attributs: {},
    enfants: [],
    textContent: '',
    retire: false,
    focalise: false,
    setAttribute(nom, valeur) {
      el.attributs[nom] = valeur;
    },
    appendChild(enfant) {
      el.enfants.push(enfant);
    },
    focus() {
      el.focalise = true;
    },
    remove() {
      el.retire = true;
    },
  };
  return el;
}

function declarerTurnstile() {
  (globalThis as Record<string, unknown>).turnstile = {
    render(_conteneur: Element, options: OptionsRecues) {
      rendus.push(options);
      return `widget-${rendus.length}`;
    },
    remove(id: string) {
      retires.push(id);
    },
  };
}

beforeEach(() => {
  jest.useRealTimers();
  scripts = [];
  conteneurs = [];
  rendus = [];
  retires = [];
  delete (globalThis as Record<string, unknown>).turnstile;
  (globalThis as Record<string, unknown>).document = {
    createElement: element,
    head: { appendChild: (el: Element) => scripts.push(el) },
    body: { appendChild: (el: Element) => conteneurs.push(el) },
  };
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>).document;
  delete (globalThis as Record<string, unknown>).turnstile;
});

/** Un module neuf à chaque test : le chargement du script est un état du module. */
function charger(): typeof import('./captcha') {
  let module: typeof import('./captcha') | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    module = require('./captcha');
  });
  return module!;
}

/** Laisse les promesses en attente avancer, sans avancer l'horloge. */
async function laisserPasser() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('jetonDuCaptcha', () => {
  test('sans clé de site, aucun jeton, et le script ne se charge pas', async () => {
    const { jetonDuCaptcha } = charger();
    await expect(jetonDuCaptcha('session_anonyme', '  ')).resolves.toBeUndefined();
    expect(scripts).toHaveLength(0);
  });

  test('sans `document` — natif, ou rendu de l’export —, aucun jeton', async () => {
    delete (globalThis as Record<string, unknown>).document;
    const { jetonDuCaptcha } = charger();
    await expect(jetonDuCaptcha('session_anonyme', 'cle')).resolves.toBeUndefined();
    expect(scripts).toHaveLength(0);
  });

  test('rend le jeton du widget, pour l’usage demandé, puis retire le widget et son conteneur', async () => {
    const { jetonDuCaptcha } = charger();
    const promesse = jetonDuCaptcha('code_de_connexion', 'cle');
    await laisserPasser();
    expect(scripts[0]?.src).toContain('challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    declarerTurnstile();
    scripts[0]?.onload?.();
    await laisserPasser();

    expect(rendus[0]).toMatchObject({ sitekey: 'cle', action: 'code_de_connexion' });
    rendus[0]?.callback('jeton-1');

    await expect(promesse).resolves.toBe('jeton-1');
    expect(retires).toEqual(['widget-1']);
    expect(conteneurs[0]?.retire).toBe(true);
  });

  test('un widget en erreur ne rend rien, et ne reste pas derrière lui', async () => {
    declarerTurnstile();
    const { jetonDuCaptcha } = charger();
    const promesse = jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    expect(rendus[0]?.['error-callback']()).toBe(true);

    await expect(promesse).resolves.toBeUndefined();
    expect(retires).toEqual(['widget-1']);
    expect(conteneurs[0]?.retire).toBe(true);
  });

  test('sans jeton au plafond, l’appel part sans, et le widget part avec', async () => {
    jest.useFakeTimers();
    declarerTurnstile();
    const { jetonDuCaptcha, DELAI_MAXIMAL_MS } = charger();
    const promesse = jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    expect(rendus).toHaveLength(1);
    jest.advanceTimersByTime(DELAI_MAXIMAL_MS);
    await expect(promesse).resolves.toBeUndefined();
    expect(retires).toEqual(['widget-1']);
    expect(conteneurs[0]?.retire).toBe(true);
  });

  test('quand Cloudflare demande de cocher : une carte, sa phrase, et deux minutes au lieu de trente secondes', async () => {
    jest.useFakeTimers();
    declarerTurnstile();
    const { jetonDuCaptcha, DELAI_MAXIMAL_MS, DELAI_POUR_COCHER_MS, PHRASE_DE_LA_CASE } = charger();
    const promesse = jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    const voile = conteneurs[0]!;
    const carte = voile.enfants[0]!;
    const phrase = carte.enfants[0]!;
    // Avant la demande : rien ne se voit, et la page reste utilisable sous le voile.
    expect(voile.style.pointerEvents).toBe('none');
    expect(phrase.style.display).toBe('none');

    jest.advanceTimersByTime(DELAI_MAXIMAL_MS - 1_000);
    rendus[0]?.['before-interactive-callback']();
    expect(voile.style.pointerEvents).toBe('auto');
    expect(phrase.style.display).toBe('block');
    expect(phrase.textContent).toBe(PHRASE_DE_LA_CASE);
    expect(carte.attributs.role).toBe('dialog');
    expect(carte.focalise).toBe(true);

    // Les trente secondes passent sans couper la personne qui coche…
    jest.advanceTimersByTime(DELAI_POUR_COCHER_MS - 1_000);
    expect(voile.retire).toBe(false);
    // … mais pas au-delà des deux minutes : le visiteur qui laisse la case de côté n'attend pas sans fin.
    jest.advanceTimersByTime(1_000);
    await expect(promesse).resolves.toBeUndefined();
    expect(voile.retire).toBe(true);
  });

  test('un script qui ne répond jamais ne suspend pas l’appel, et il est oublié : l’appel suivant recharge', async () => {
    jest.useFakeTimers();
    const { jetonDuCaptcha, DELAI_MAXIMAL_MS } = charger();
    const promesse = jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    expect(scripts).toHaveLength(1);
    jest.advanceTimersByTime(DELAI_MAXIMAL_MS);
    await expect(promesse).resolves.toBeUndefined();
    expect(conteneurs[0]?.retire).toBe(true);
    expect(scripts[0]?.retire).toBe(true);

    void jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    expect(scripts).toHaveLength(2);
  });

  test('un widget à la fois : le second appel attend que le premier ait rendu le sien', async () => {
    declarerTurnstile();
    const { jetonDuCaptcha } = charger();
    const session = jetonDuCaptcha('session_anonyme', 'cle');
    const code = jetonDuCaptcha('code_de_connexion', 'cle');
    await laisserPasser();
    expect(rendus.map((r) => r.action)).toEqual(['session_anonyme']);

    rendus[0]?.callback('jeton-session');
    await expect(session).resolves.toBe('jeton-session');
    await laisserPasser();
    expect(rendus.map((r) => r.action)).toEqual(['session_anonyme', 'code_de_connexion']);
    rendus[1]?.callback('jeton-code');
    await expect(code).resolves.toBe('jeton-code');
  });

  test('un script qui n’a pas pu se charger se recharge à l’appel suivant', async () => {
    const { jetonDuCaptcha } = charger();
    const premier = jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    scripts[0]?.onerror?.();
    await expect(premier).resolves.toBeUndefined();

    const second = jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    expect(scripts).toHaveLength(2);
    declarerTurnstile();
    scripts[1]?.onload?.();
    await laisserPasser();
    rendus[0]?.callback('jeton-2');
    await expect(second).resolves.toBe('jeton-2');
  });
});

// Dans l'app Android : pas de `document`, une vue web branchée par `CaptchaNatif`. Le même contrat que
// le web — trente secondes, deux minutes à partir de la demande de cocher, le widget toujours retiré.
describe('jetonDuCaptcha — dans l’app, par la vue web', () => {
  type Pose = { cle: string; usage: string; jeton: (j: string) => void; erreur: () => void; interaction: () => void };
  let poses: Pose[];
  let retraits: number;

  function brancher(module: typeof import('./captcha')) {
    poses = [];
    retraits = 0;
    return module.brancherLeCaptchaNatif((demande) => {
      poses.push(demande);
      return () => {
        retraits += 1;
      };
    });
  }

  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).document;
  });

  test('rend le jeton de la vue web, pour la clé et l’usage demandés, puis la retire', async () => {
    const module = charger();
    brancher(module);
    const promesse = module.jetonDuCaptcha('code_de_connexion', 'cle');
    await laisserPasser();
    expect(poses[0]).toMatchObject({ cle: 'cle', usage: 'code_de_connexion' });
    poses[0]?.jeton('jeton-natif');
    await expect(promesse).resolves.toBe('jeton-natif');
    expect(retraits).toBe(1);
  });

  test('une erreur de la vue web ne rend rien, et la retire', async () => {
    const module = charger();
    brancher(module);
    const promesse = module.jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    poses[0]?.erreur();
    await expect(promesse).resolves.toBeUndefined();
    expect(retraits).toBe(1);
  });

  test('la case demandée laisse deux minutes au lieu de trente secondes, et pas plus', async () => {
    jest.useFakeTimers();
    const module = charger();
    brancher(module);
    const promesse = module.jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    jest.advanceTimersByTime(module.DELAI_MAXIMAL_MS - 1_000);
    poses[0]?.interaction();
    jest.advanceTimersByTime(module.DELAI_POUR_COCHER_MS - 1_000);
    expect(retraits).toBe(0);
    jest.advanceTimersByTime(1_000);
    await expect(promesse).resolves.toBeUndefined();
    expect(retraits).toBe(1);
  });

  test('débranchée, plus de vue web : aucun jeton, rien de posé', async () => {
    const module = charger();
    const debrancher = brancher(module);
    debrancher();
    await expect(module.jetonDuCaptcha('session_anonyme', 'cle')).resolves.toBeUndefined();
    expect(poses).toHaveLength(0);
  });
});

