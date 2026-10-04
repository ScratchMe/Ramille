/**
 * Le jeton du captcha Turnstile (`captcha.ts`) : quand il y en a un, quand il n'y en a pas, et que
 * le widget ne reste jamais derrière lui.
 *
 * Les doubles : un `document` réduit à ce que le module touche — son absence tient lieu de natif, et le `turnstile` que le script déclarerait en se chargeant. Ce que ce fichier ne
 * voit pas : le vrai widget, ses noms d'hôte et la CSP qui le laisse entrer — la garde de rendu de
 * l'export et la page servie en production (`docs/exploitation/README.md` §3.11).
 *
 * Éprouvé en cassant ce qu'il garde, le 04/10/2026 : le contrôle de la clé retiré fait tomber le
 * premier test, seul ; le conteneur jamais retiré, les troisième, quatrième et cinquième ; le
 * widget jamais retiré, les troisième et quatrième ; la minuterie jamais arrêtée à la demande
 * d'interaction, le cinquième, seul ; la minuterie qui ne compte qu'une fois le script chargé — le
 * défaut d'une première écriture, relevé le soir même —, le sixième, seul ; le chargement gardé
 * après un échec, le dernier, seul. **Le
 * contrôle de `document` retiré ne fait rien tomber, et c'est une mutation équivalente** : sans
 * lui, l'accès à `document` lève dans la promesse, et le `catch` rend le même `undefined`. Il reste
 * pour qu'on lise la règle au lieu de la déduire.
 */
type Element = {
  tag: string;
  style: Record<string, string>;
  attributs: Record<string, string>;
  retire: boolean;
  src?: string;
  onload?: () => void;
  onerror?: () => void;
  setAttribute(nom: string, valeur: string): void;
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
    retire: false,
    setAttribute(nom, valeur) {
      el.attributs[nom] = valeur;
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

  test('sans jeton à temps, l’appel part sans — sauf si le widget a demandé à la personne de cocher', async () => {
    jest.useFakeTimers();
    declarerTurnstile();
    const { jetonDuCaptcha, DELAI_SANS_INTERACTION_MS } = charger();

    const silencieux = jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    jest.advanceTimersByTime(DELAI_SANS_INTERACTION_MS);
    await expect(silencieux).resolves.toBeUndefined();
    expect(conteneurs[0]?.retire).toBe(true);

    const interactif = jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    rendus[1]?.['before-interactive-callback']();
    jest.advanceTimersByTime(DELAI_SANS_INTERACTION_MS * 3);
    expect(conteneurs[1]?.retire).toBe(false);
    rendus[1]?.callback('jeton-coche');
    await expect(interactif).resolves.toBe('jeton-coche');
  });

  test('un script qui ne répond jamais ne suspend pas l’appel : il part sans jeton, à temps', async () => {
    jest.useFakeTimers();
    const { jetonDuCaptcha, DELAI_SANS_INTERACTION_MS } = charger();
    const promesse = jetonDuCaptcha('session_anonyme', 'cle');
    await laisserPasser();
    expect(scripts).toHaveLength(1);
    jest.advanceTimersByTime(DELAI_SANS_INTERACTION_MS);
    await expect(promesse).resolves.toBeUndefined();
    expect(conteneurs[0]?.retire).toBe(true);
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
