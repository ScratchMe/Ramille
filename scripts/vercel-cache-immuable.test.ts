/// <reference types="node" />
/**
 * Le cache immuable des fichiers hachés de l'export (`vercel.json`), et la façon dont les gardes le
 * reproduisent.
 *
 * **Ce que la règle fait.** Sans elle, Vercel sert `/_expo/static/*` et `/assets/*` en `public,
 * max-age=0, must-revalidate` : le navigateur revalide chaque bundle à chaque visite. Les noms de ces
 * fichiers portent le md5 de leur contenu (`entry-<md5>.js`, `Police.<md5>.ttf`) — un fichier qui
 * change a un autre nom —, donc `public, max-age=31536000, immutable` est sûr, et c'est la valeur que
 * Vercel recommande pour des ressources hachées.
 *
 * **Ce que la règle ne doit pas faire.** Viser un nom qui ne change pas avec le contenu : les visiteurs
 * garderaient un an l'ancien code après un déploiement. D'où deux sources en expressions régulières
 * qui exigent le hachage dans le nom (et non `/assets/(.*)`), `controlerLeCacheImmuable` qui le vérifie
 * sur l'export réel (lancé par `verifier-rendu-export.mjs` en CI), et ce fichier qui garde la forme.
 *
 * **Pourquoi ce fichier touche `servir-export.mjs`.** Le serveur des gardes refusait toute règle de
 * `vercel.json` autre que `/(.*)` : ajouter celle-ci sans lui apprendre à les lire aurait fait échouer
 * chaque garde qui ouvre l'export. Il lit désormais des segments littéraux et des groupes `( … )`, ce
 * que Vercel compile en `^/assets(?:/(…))$` — relevé le 18/10/2026 dans `.vercel/output/config.json` d'un
 * `vercel build` hors ligne, et recopié plus bas : si Vercel lit autrement, ce test ne le sait pas.
 *
 * Non-vacuité, mesurée le 18/10/2026 en cassant (chaque mutation remise en place avant la suivante) :
 * RESULTATS_DES_MUTATIONS
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const racine = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(racine, 'vercel.json'), 'utf8'));

type Regle = { source: string; headers: { key: string; value: string }[] };
const regles: Regle[] = config.headers ?? [];
const IMMUABLE = 'public, max-age=31536000, immutable';
const reglesDeCache = regles.filter((r) => r.headers.some((h) => h.key.toLowerCase() === 'cache-control'));

/** Exécute du code ESM dans un Node à part : `servir-export.mjs` n'est pas transformé par Jest. */
function dansNode<T>(code: string, ...args: string[]): T {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code, ...args], {
    cwd: racine,
    encoding: 'utf8',
    env: { ...process.env, EXPO_PUBLIC_SUPABASE_URL: 'https://exemple.supabase.co' },
  });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

const SERVEUR = JSON.stringify(path.join(racine, 'scripts', 'servir-export.mjs'));

function enTetesServis(chemins: string[]): Record<string, Record<string, string>> {
  return dansNode(
    `import { enTetesDeProduction } from ${SERVEUR};` +
      `import { readFileSync } from 'node:fs';` +
      `const f = enTetesDeProduction(JSON.parse(readFileSync('vercel.json', 'utf8')), 'https://exemple.supabase.co');` +
      `console.log(JSON.stringify(Object.fromEntries(JSON.parse(process.argv[1]).map((c) => [c, f(c)]))));`,
    JSON.stringify(chemins)
  );
}

const md5 = (contenu: string) => createHash('md5').update(contenu).digest('hex');

describe('vercel.json — le cache immuable des fichiers hachés', () => {
  test('deux règles, et une seule valeur : public, max-age d’un an, immutable', () => {
    expect(reglesDeCache).toHaveLength(2);
    for (const regle of reglesDeCache) {
      expect(regle.headers).toEqual([{ key: 'Cache-Control', value: IMMUABLE }]);
    }
  });

  test('la règle de tout le site ne pose aucun Cache-Control : le HTML reste revalidé', () => {
    const toutLeSite = regles.find((r) => r.source === '/(.*)');
    expect(toutLeSite).toBeDefined();
    expect(toutLeSite?.headers.some((h) => h.key.toLowerCase() === 'cache-control')).toBe(false);
  });

  test('chaque source exige un hachage de 32 hexadécimaux dans le nom, et nomme son dossier', () => {
    const sources = reglesDeCache.map((r) => r.source).sort();
    expect(sources).toHaveLength(2);
    expect(sources[0]).toMatch(/^\/_expo\/static\/\(.*\[0-9a-f\]\{32\}.*\)$/);
    expect(sources[1]).toMatch(/^\/assets\/\(.*\[0-9a-f\]\{32\}.*\)$/);
  });
});

describe('servir-export.mjs — lire une source comme Vercel la compile', () => {
  // `.vercel/output/config.json`, `vercel build` hors ligne, 18/10/2026 : ce que Vercel fait de ces deux
  // sources. Recopié tel quel ; la lecture du serveur des gardes doit en juger pareil.
  const COMPILEES_PAR_VERCEL = [
    String.raw`^/_expo/static(?:/(.+-[0-9a-f]{32}\.(?:js|css)(?:\.map)?))$`,
    String.raw`^/assets(?:/(.+\.[0-9a-f]{32}(?:@[0-9]+x)?\.[A-Za-z0-9]+))$`,
  ];
  const H = 'a00a51d5d45015cd04c067a50f5bd073';
  const CHEMINS = [
    `/_expo/static/js/web/entry-${H}.js`,
    `/_expo/static/css/global-${H}.css`,
    `/_expo/static/js/web/entry-${H}.js.map`,
    `/_expo/static/js/web/entry.js`,
    `/_expo/static/js/web/entry-${H.slice(1)}.js`,
    `/_expo/static/js/web/entry-${H}.html`,
    `/_expo/static/js/web/entry-${H}Xjs`,
    `/_expo/.routes.json`,
    `/assets/node_modules/police/Police_400.${H}.ttf`,
    `/assets/node_modules/icone/close.${H}@2x.png`,
    `/assets/node_modules/icone/close.${H}@2xX.png`,
    `/assets/logo.png`,
    `/assets/logo.${H.slice(1)}.png`,
    `/assetsX/logo.${H}.png`,
    `/robots.txt`,
    `/plan`,
    `/`,
  ];

  test('juge chaque chemin comme la compilation de Vercel, les deux règles de vercel.json', () => {
    const attendu = CHEMINS.map((chemin) => COMPILEES_PAR_VERCEL.map((c) => new RegExp(c).test(chemin)));
    const lu = dansNode<boolean[][]>(
      `import { expressionDeLaSource } from ${SERVEUR};` +
        `import { readFileSync } from 'node:fs';` +
        `const regles = JSON.parse(readFileSync('vercel.json', 'utf8')).headers.filter((r) => r.headers.some((h) => h.key === 'Cache-Control'));` +
        `const motifs = regles.map((r) => expressionDeLaSource(r.source));` +
        `console.log(JSON.stringify(JSON.parse(process.argv[1]).map((c) => motifs.map((m) => m.test(c)))));`,
      JSON.stringify(CHEMINS)
    );
    expect(lu).toEqual(attendu);
    // Le témoin : la comparaison ne vaut que si des chemins sont acceptés et d'autres refusés.
    expect(attendu.flat().filter(Boolean).length).toBeGreaterThanOrEqual(5);
    expect(attendu.flat().filter((v) => !v).length).toBeGreaterThanOrEqual(15);
  });

  test('échappe les points d’un segment littéral et refuse ce qu’il ne sait pas lire', () => {
    const r = dansNode<{ points: boolean[]; refus: string[] }>(
      `import { expressionDeLaSource } from ${SERVEUR};` +
        `const m = expressionDeLaSource('/robots.txt');` +
        `const refus = [];` +
        `for (const s of ['/:nom', '/a/*', '/a?', '/a+', '/a/{b}', '/a/(b']) { try { expressionDeLaSource(s); } catch (e) { refus.push(s); } }` +
        `console.log(JSON.stringify({ points: [m.test('/robots.txt'), m.test('/robotsXtxt')], refus }));`
    );
    expect(r.points).toEqual([true, false]);
    expect(r.refus).toEqual(['/:nom', '/a/*', '/a?', '/a+', '/a/{b}', '/a/(b']);
  });
});

describe('servir-export.mjs — les en-têtes servis, route par route', () => {
  const H = 'd8a92f1eb5f324549c9f6e14ce21ce8a';
  const HACHES = [
    `/_expo/static/js/web/entry-${H}.js`,
    `/_expo/static/css/global-${H}.css`,
    `/assets/node_modules/police/Police_400.${H}.ttf`,
    `/assets/node_modules/icone/close.${H}@2x.png`,
  ];
  const AUTRES = [
    '/plan',
    '/',
    '/robots.txt',
    '/sitemap.xml',
    '/favicon.ico',
    '/.well-known/assetlinks.json',
    '/_expo/.routes.json',
    '/assets/logo.png',
    '/_expo/static/js/web/entry.js',
  ];

  test('un fichier haché est immuable, et garde la politique de sécurité du site', () => {
    const servis = enTetesServis(HACHES);
    for (const chemin of HACHES) {
      expect(servis[chemin]['cache-control']).toBe(IMMUABLE);
      // Les deux règles s'ajoutent : la CSP et le reste de la règle générale ne disparaissent pas.
      expect(servis[chemin]['content-security-policy']).toContain("default-src 'self'");
      expect(servis[chemin]['x-content-type-options']).toBe('nosniff');
    }
  });

  test('tout le reste garde la politique et n’est jamais immuable : pages, robots, favicon, noms sans hachage', () => {
    const servis = enTetesServis(AUTRES);
    for (const chemin of AUTRES) {
      expect(servis[chemin]['cache-control']).toBeUndefined();
      expect(servis[chemin]['content-security-policy']).toContain("default-src 'self'");
    }
  });

  test('le serveur HTTP les pose bien sur la réponse, pas seulement dans sa table', () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-dist-'));
    try {
      const js = `console.log('bundle');`;
      fs.mkdirSync(path.join(dist, '_expo/static/js/web'), { recursive: true });
      fs.writeFileSync(path.join(dist, `_expo/static/js/web/entry-${md5(js)}.js`), js);
      fs.writeFileSync(path.join(dist, 'index.html'), '<html></html>');
      const servi = dansNode<Record<string, string | null>>(
        `import { servirExport } from ${SERVEUR};` +
          `const { base, fermer } = await servirExport(process.argv[1], 0);` +
          `const lire = async (chemin) => (await fetch(base + chemin)).headers.get('cache-control');` +
          `const r = { bundle: await lire(process.argv[2]), accueil: await lire('/') };` +
          `fermer();` +
          `console.log(JSON.stringify(r));`,
        dist,
        `/_expo/static/js/web/entry-${md5(js)}.js`
      );
      expect(servi).toEqual({ bundle: IMMUABLE, accueil: null });
    } finally {
      fs.rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe('controlerLeCacheImmuable — l’export réel, jugé sur ses noms et ses contenus', () => {
  function controler(fichiers: Record<string, string>, configuration = config): string[] {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-dist-'));
    try {
      for (const [chemin, contenu] of Object.entries(fichiers)) {
        fs.mkdirSync(path.dirname(path.join(dist, chemin)), { recursive: true });
        fs.writeFileSync(path.join(dist, chemin), contenu);
      }
      return dansNode<string[]>(
        `import { controlerLeCacheImmuable } from ${SERVEUR};` +
          `console.log(JSON.stringify(controlerLeCacheImmuable(process.argv[1], JSON.parse(process.argv[2]))));`,
        dist,
        JSON.stringify(configuration)
      );
    } finally {
      fs.rmSync(dist, { recursive: true, force: true });
    }
  }

  const JS = `console.log('entree');`;
  const CSS = `body{margin:0}`;
  const TTF = 'police';
  const PNG_1X = 'icone-1x';
  const PNG_2X = 'icone-2x';
  const JEU = 'a'.repeat(32);
  const BON_EXPORT = {
    'index.html': '<html></html>',
    'favicon.ico': 'ico',
    'robots.txt': 'User-agent: *',
    '.well-known/assetlinks.json': '[]',
    '_expo/.routes.json': '{}',
    [`_expo/static/js/web/entry-${md5(JS)}.js`]: JS,
    [`_expo/static/css/global-${md5(CSS)}.css`]: CSS,
    [`assets/node_modules/police/Police.${md5(TTF)}.ttf`]: TTF,
    // Un jeu à deux échelles : un hachage pour le jeu, qui n'est le md5 d'aucun des deux fichiers.
    [`assets/node_modules/icone/close.${JEU}.png`]: PNG_1X,
    [`assets/node_modules/icone/close.${JEU}@2x.png`]: PNG_2X,
  };

  test('un export dont chaque nom dit son contenu ne donne aucun écart', () => {
    expect(controler(BON_EXPORT)).toEqual([]);
  });

  test('un nom haché qui ne dit pas le contenu est un écart : l’ancien code serait gardé un an', () => {
    const faux = { ...BON_EXPORT, [`_expo/static/js/web/entry-${md5(JS)}.js`]: `${JS} // modifié` };
    const ecarts = controler(faux);
    expect(ecarts).toHaveLength(1);
    expect(ecarts[0]).toContain('n’est pas le md5 du contenu');
  });

  test('un fichier haché que la règle ne vise pas est un écart : le cache serait perdu sans bruit', () => {
    const ecarts = controler({ ...BON_EXPORT, [`chunk.${md5('x')}.js`]: 'x' });
    expect(ecarts).toHaveLength(1);
    expect(ecarts[0]).toContain('ne le vise pas');
  });

  test('un fichier sans hachage sous un dossier de fichiers hachés est un écart', () => {
    const ecarts = controler({ ...BON_EXPORT, 'assets/logo.png': 'x', '_expo/static/js/web/app.js': 'x' });
    expect(ecarts).toHaveLength(2);
    for (const ecart of ecarts) expect(ecart).toContain('sans hachage');
  });

  test('sans règle immuable dans vercel.json : un écart, et un seul', () => {
    const sansRegle = { ...config, headers: regles.filter((r) => r.source === '/(.*)') };
    const ecarts = controler(BON_EXPORT, sansRegle);
    expect(ecarts).toHaveLength(1);
    expect(ecarts[0]).toContain('ne pose plus de Cache-Control immutable');
  });
});
