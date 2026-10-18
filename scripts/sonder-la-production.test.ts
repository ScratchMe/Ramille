/// <reference types="node" />
/**
 * La sonde de la production (`scripts/sonder-la-production.mjs`, `.github/workflows/sonde.yml`).
 *
 * Ce fichier teste la **décision** — « cette réponse est-elle la bonne, et sinon pourquoi ? » —, pas le
 * réseau : les réponses sont fabriquées, et la sonde entière est jouée contre un faux site local
 * (loopback) qui prend, au choix, la forme d'une production saine ou celle d'une panne précise. Rien ne
 * sort de la machine.
 *
 * Le module est un `.mjs` : Jest ne le charge pas, donc chaque appel se joue dans un processus Node à
 * part, comme les autres tests de `scripts/`. Trois liens avec le reste du dépôt sont épinglés, parce
 * que la sonde recopie ce qu'ils décident et qu'une recopie dérive en silence :
 *   - la **page que la vraie `api/partage.ts` rend** passe la vérification de la sonde (titre, image,
 *     noindex) — appelée pour de vrai, comme `postes-partageables.test.ts` ;
 *   - l'**adresse de partage** de la sonde a les noms, l'ordre et les formes de `urlDePartage`, et son
 *     poste est un libellé que l'app produit et que la liste fermée de `api/` accepte ;
 *   - le **vrai `public/.well-known/assetlinks.json`** passe la vérification, et le début de chaque
 *     `<h1>` attendu est un début du titre de `page-titles.ts`.
 *
 * Éprouvé en le cassant, le 18/10/2026 (quinze mutations sur le module, chacune défaite en réécrivant
 * l'état d'avant ; le compte cite les tests qui tombent) :
 * - statut ignoré dans `verifierLeTransport` → 4 tombent (pages, liens Android, santé, le faux site en 503) ;
 * - type de contenu ignoré → 2 tombent ;
 * - paquet d'`assetlinks.json` non comparé → 1 tombe ; empreintes non vérifiées → 2 tombent ;
 * - le repli `no-store` de la carte non lu → 2 tombent (le repli, et le faux site en panne de rendu) ;
 * - les dimensions de la carte non lues → 1 tombe ; sa taille minimale non lue → 1 tombe ;
 * - le titre de la page de partage non lu → 2 tombent (la page sans chiffre, et la vraie fonction
 *   dont on a abîmé le titre) ;
 * - l'en-tête `x-robots-tag` non lu → 1 tombe ;
 * - le total de la carte constant (la minute ignorée) → 1 tombe, « une carte neuve à chaque minute » ;
 * - la clé cherchée avec un autre préfixe → 3 tombent ; le bundle sans clé lu comme sain → 2 tombent ;
 * - le nom GoTrue non vérifié → 1 tombe ; la clé refusée (401) lue comme saine → 2 tombent ;
 * - la sortie toujours 0 → 4 tombent, tous les cas de panne du faux site ;
 * - les tentatives ramenées à une → 1 tombe, « retente avant d'échouer » ;
 * - les échappements d'annotation retirés → 2 tombent.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import partage from '../api/partage';
import { PAGE_TITLES } from '../src/constants/page-titles';
import { urlDePartage, type ResultatBilan } from '../src/types/resultat';

const racine = path.resolve(__dirname, '..');
const module = path.join(racine, 'scripts', 'sonder-la-production.mjs');
const ORIGINE = 'https://www.ramille.fr';

// ─── Appeler le module dans un processus à part ──────────────────────────────────────────────

/**
 * Joue `corps` dans un processus Node qui a `m` (le module) et `entree` (le JSON reçu sur l'entrée
 * standard), et rend ce que `corps` retourne. Une réponse décrite en JSON (`statut`, `entetes`, `texte`
 * ou `base64`) est remise sous la forme que le module lit : `{ corps: Uint8Array }`.
 */
function executer(corps: string, entree: Record<string, unknown> = {}): any {
  const code = `
    import * as m from ${JSON.stringify(module)};
    import fs from 'node:fs';
    const remettre = (a) =>
      a && typeof a === 'object' && !Array.isArray(a) && 'statut' in a && 'entetes' in a
        ? { erreur: null, ...a, corps: a.base64 !== undefined ? Buffer.from(a.base64, 'base64') : new TextEncoder().encode(a.texte ?? '') }
        : a;
    const entree = JSON.parse(fs.readFileSync(0, 'utf8'));
    for (const cle of Object.keys(entree)) entree[cle] = Array.isArray(entree[cle]) ? entree[cle].map(remettre) : remettre(entree[cle]);
    const sortie = await (async () => { ${corps} })();
    console.log(JSON.stringify(sortie === undefined ? null : sortie));
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { input: JSON.stringify(entree), encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${corps}\n${r.stderr}`);
  return JSON.parse(r.stdout);
}

/** Appelle une exportation du module — une fonction avec ses arguments, ou une constante. */
function appeler(nom: string, ...args: unknown[]): any {
  return executer(`const membre = m[${JSON.stringify(nom)}]; return typeof membre === 'function' ? await membre(...entree.args) : membre;`, { args });
}

type Reponse = { statut: number | null; entetes: Record<string, string>; erreur?: string | null; texte?: string; base64?: string };

/** Les paramètres de partage que la sonde fabrique pour un instant, lus dans un processus à part. */
function parametresA(iso: string): URLSearchParams {
  const code = `
    import { parametresDePartage } from ${JSON.stringify(module)};
    console.log(parametresDePartage(new Date(${JSON.stringify(iso)})).toString());
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return new URLSearchParams(r.stdout.trim());
}

const reponse = (statut: number, type: string | null, texte: string, plus: Record<string, string> = {}): Reponse => ({
  statut,
  entetes: { ...(type ? { 'content-type': type } : {}), ...plus },
  texte,
});

function png(largeur: number, hauteur: number, taille: number): string {
  const tete = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(tete, 0);
  tete.writeUInt32BE(13, 8);
  tete.write('IHDR', 12, 'latin1');
  tete.writeUInt32BE(largeur, 16);
  tete.writeUInt32BE(hauteur, 20);
  return Buffer.concat([tete, Buffer.alloc(Math.max(0, taille - tete.length))]).toString('base64');
}

const CACHE_DE_LA_CARTE = 'public, immutable, no-transform, max-age=31536000';
const carte = (largeur = 1200, hauteur = 630, taille = 38_000, cache = CACHE_DE_LA_CARTE, statut = 200): Reponse => ({
  statut,
  entetes: { 'content-type': 'image/png', 'cache-control': cache },
  base64: png(largeur, hauteur, taille),
});

const padding = (n: number) => `<!-- ${'x'.repeat(n)} -->`;

// ─── Le transport : statut, type, injoignable ────────────────────────────────────────────────

describe('verifierLeTransport', () => {
  const verifier = (r: Reponse, type = 'text/html') => appeler('verifierLeTransport', r, type);

  test('ne dit rien d’une réponse 200 du bon type, charset compris', () => {
    expect(verifier(reponse(200, 'text/html; charset=utf-8', ''))).toBeNull();
  });

  test('dit ce qui est injoignable, et pourquoi', () => {
    expect(verifier({ statut: null, entetes: {}, erreur: 'fetch failed — ECONNREFUSED' })).toBe('injoignable : fetch failed — ECONNREFUSED');
  });

  test('nomme le statut reçu', () => {
    expect(verifier(reponse(503, 'text/html', ''))).toBe('statut 503 au lieu de 200');
  });

  test('nomme la destination d’une redirection plutôt que de la suivre', () => {
    expect(verifier(reponse(308, 'text/html', '', { location: 'https://ramille.fr/' }))).toBe(
      'statut 308, redirigé vers https://ramille.fr/ au lieu de répondre 200',
    );
  });

  test('refuse un autre type de contenu, en le nommant', () => {
    expect(verifier(reponse(200, 'application/json', ''))).toBe('type de contenu « application/json » au lieu de « text/html »');
    expect(verifier(reponse(200, null, ''))).toBe('type de contenu « (aucun) » au lieu de « text/html »');
  });
});

// ─── Les pages publiques ─────────────────────────────────────────────────────────────────────

describe('les pages publiques', () => {
  const pages = appeler('PAGES') as { id: string; chemin: string; entete: string | null; tailleMinimale: number }[];
  const entetesComplets: Record<string, string> = {
    confidentialite: 'Politique de confidentialité',
    conditions: 'Conditions d’utilisation',
    suppression: 'Supprimer mon compte',
  };
  /** Les marqueurs d'une page, avec leurs motifs réduits à du texte (un RegExp ne survit pas au JSON). */
  const marqueurs = (page: unknown, origine = ORIGINE): { libelle: string; motif: string }[] =>
    executer(
      `return m.marqueursDeLaPage(entree.page, entree.origine).map((x) => ({ libelle: x.libelle, motif: x.motif instanceof RegExp ? x.motif.source : x.motif }));`,
      { page, origine },
    );

  /** Ce que la production sert : un `<head>` avec l'adresse canonique, un `<h1>`, et du corps. */
  function pageSaine(page: (typeof pages)[number], origine = ORIGINE) {
    const entete = page.entete ? `<h1 class="css-x">${entetesComplets[page.id]}</h1>` : '<script src="/_expo/static/js/web/entry-19e5.js" defer></script>';
    return reponse(
      200,
      'text/html; charset=utf-8',
      `<html><head><meta data-rh="true" property="og:url" content="${origine}${page.chemin}"/></head><body>${entete}${padding(page.tailleMinimale)}</body></html>`,
    );
  }
  const verifier = (page: (typeof pages)[number], r: Reponse) =>
    executer(`return m.verifierUnePage(entree.r, { marqueurs: m.marqueursDeLaPage(entree.page, entree.origine), tailleMinimale: entree.page.tailleMinimale });`, {
      r,
      page,
      origine: ORIGINE,
    });

  test('sonde les quatre pages que le produit doit toujours servir', () => {
    expect(pages.map((p) => p.chemin)).toEqual(['/', '/confidentialite', '/conditions', '/compte/suppression']);
  });

  test.each(['accueil', 'confidentialite', 'conditions', 'suppression'])('une page saine passe : %s', (id) => {
    const page = pages.find((p) => p.id === id)!;
    expect(verifier(page, pageSaine(page))).toMatchObject({ ok: true });
  });

  test('refuse la page d’une autre route, servie en 200 (l’adresse canonique ne correspond pas)', () => {
    const [accueil, confidentialite] = [pages[0], pages[1]];
    const autre = pageSaine(confidentialite);
    const verdict = verifier(accueil, { ...autre });
    expect(verdict.ok).toBe(false);
    expect(verdict.raison).toContain('l’adresse canonique de la page (og:url)');
  });

  test('refuse une page dont seul le <head> est rendu : le <h1> manque', () => {
    const page = pages.find((p) => p.id === 'confidentialite')!;
    const sansCorps = reponse(
      200,
      'text/html',
      `<html><head><title>Politique de confidentialité — Ramille</title><meta property="og:url" content="${ORIGINE}/confidentialite"/></head><body>${padding(page.tailleMinimale)}</body></html>`,
    );
    const verdict = verifier(page, sansCorps);
    expect(verdict.ok).toBe(false);
    expect(verdict.raison).toContain('le <h1> « Politique de confidentialit… »');
  });

  test('refuse une page vidée : trop courte pour être rendue', () => {
    const page = pages.find((p) => p.id === 'conditions')!;
    const verdict = verifier(page, reponse(200, 'text/html', `<h1>Conditions d’utilisation</h1><meta property="og:url" content="${ORIGINE}/conditions"/>`));
    expect(verdict.ok).toBe(false);
    expect(verdict.raison).toMatch(/^corps de \d+ o, moins que les/);
  });

  test('refuse une page 503, sans lire son corps', () => {
    const page = pages[1];
    expect(verifier(page, reponse(503, 'text/html', pageSaine(page).texte ?? ''))).toEqual({ ok: false, raison: 'statut 503 au lieu de 200' });
  });

  test('cherche l’adresse canonique sur l’origine sondée, pas sur une origine en dur', () => {
    const page = pages[1];
    expect(marqueurs(page, 'http://127.0.0.1:8080')[0].motif).toBe('property="og:url" content="http://127.0.0.1:8080/confidentialite"');
  });

  test('les marqueurs sont de l’ASCII pur : un accent absent d’un fichier échappé ne prouve rien', () => {
    for (const page of pages) {
      for (const marqueur of marqueurs(page)) expect(marqueur.motif).toMatch(/^[\x20-\x7e]+$/);
    }
  });

  test('chaque début de <h1> attendu est un début du titre de la page dans page-titles.ts', () => {
    for (const page of pages.filter((p) => p.entete)) {
      expect({ page: page.chemin, titre: PAGE_TITLES[page.chemin].startsWith(page.entete as string) }).toEqual({ page: page.chemin, titre: true });
    }
  });
});

// ─── Le fichier des liens Android ────────────────────────────────────────────────────────────

describe('verifierAssetlinks', () => {
  const EMPREINTE = 'A6:90:22:11:80:98:E5:D3:1D:4F:9F:8D:24:1E:4C:F5:D3:BC:8E:98:7B:CB:F1:65:FB:5D:4E:B9:EB:B0:F3:DF';
  const declaration = (surcharge: Record<string, unknown> = {}, cible: Record<string, unknown> = {}) => [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: 'fr.ramille.app', sha256_cert_fingerprints: [EMPREINTE], ...cible },
      ...surcharge,
    },
  ];
  const verifier = (corps: unknown, type = 'application/json; charset=utf-8') =>
    appeler('verifierAssetlinks', reponse(200, type, typeof corps === 'string' ? corps : JSON.stringify(corps)));

  test('accepte une déclaration pour fr.ramille.app avec une empreinte', () => {
    expect(verifier(declaration())).toMatchObject({ ok: true, detail: 'paquet fr.ramille.app, 1 empreinte(s)' });
  });

  test('accepte le vrai fichier du dépôt, celui que Vercel sert tel quel', () => {
    const vrai = fs.readFileSync(path.join(racine, 'public', '.well-known', 'assetlinks.json'), 'utf8');
    expect(verifier(vrai)).toMatchObject({ ok: true });
  });

  test('refuse un autre paquet, en disant lesquels sont déclarés', () => {
    const verdict = verifier(declaration({}, { package_name: 'com.exemple.autre' }));
    expect(verdict.ok).toBe(false);
    expect(verdict.raison).toBe('aucune déclaration pour le paquet fr.ramille.app (paquets vus : com.exemple.autre)');
  });

  test('refuse un corps qui n’est pas du JSON, ou pas un tableau', () => {
    expect(verifier('<html>404</html>').raison).toBe('le corps n’est pas du JSON');
    expect(verifier({ relation: [] }).raison).toBe('le JSON n’est pas un tableau de déclarations');
  });

  test('refuse la relation qui manque : Android n’ouvrirait pas l’app depuis un lien', () => {
    expect(verifier(declaration({ relation: ['delegate_permission/common.get_login_creds'] })).raison).toContain('delegate_permission/common.handle_all_urls');
  });

  test('refuse l’absence d’empreinte, et une empreinte mal formée', () => {
    expect(verifier(declaration({}, { sha256_cert_fingerprints: [] })).raison).toBe('aucune empreinte de certificat déclarée');
    expect(verifier(declaration({}, { sha256_cert_fingerprints: [EMPREINTE, 'a6:90'] })).raison).toMatch(/^1 empreinte\(s\) de forme invalide/);
  });

  test('refuse un fichier servi comme du HTML (la page 404, par exemple)', () => {
    expect(verifier(declaration(), 'text/html; charset=utf-8').raison).toBe('type de contenu « text/html; charset=utf-8 » au lieu de « application/json »');
  });
});

// ─── L'adresse de partage ────────────────────────────────────────────────────────────────────

describe('parametresDePartage', () => {
  const pourUnInstant = parametresA;

  /** La fixture du test de `urlDePartage` : un bilan de 4,2 t dont le poste dominant est la voiture thermique. */
  const resultat = {
    total_co2_kg_year: 4200,
    dominant_poste: 'commute',
    dominant_poste_label: 'Trajet domicile-travail (Voiture seul)',
    dominant_poste_mode: 'voiture_thermique',
    dominant_poste_co2_kg_year: 2100,
    mobility_constrained: null,
  } as ResultatBilan;
  const deLApp = new URL(urlDePartage(resultat, ORIGINE)).searchParams;

  test('a les mêmes paramètres, dans le même ordre, et les mêmes formes que l’adresse que l’app génère', () => {
    const sonde = pourUnInstant('2026-10-18T22:30:00Z');
    expect([...sonde.keys()]).toEqual([...deLApp.keys()]);
    expect(sonde.get('total')).toMatch(/^\d+\.\d{3}$/);
    expect(deLApp.get('total')).toMatch(/^\d+\.\d{3}$/);
    expect(sonde.get('percent')).toMatch(/^\d+$/);
    expect(sonde.get('poste')).toBe(deLApp.get('poste'));
  });

  test('le poste est dans la liste fermée de api/partage.ts : un libellé forgé serait ignoré', () => {
    const source = fs.readFileSync(path.join(racine, 'api', 'partage.ts'), 'utf8');
    const poste = pourUnInstant('2026-10-18T22:30:00Z').get('poste') as string;
    const [nom, ...mode] = poste.split(' en ');
    expect(source).toContain(`'${nom}'`);
    expect(source).toContain(`'en ${mode.join(' en ')}'`);
  });

  test('change à chaque minute, pour que la carte soit rendue et non servie par le cache', () => {
    const totals = ['2026-10-18T22:30:00Z', '2026-10-18T22:31:00Z', '2026-10-18T23:30:00Z'].map((i) => pourUnInstant(i).get('total'));
    expect(new Set(totals).size).toBe(3);
  });

  test('ne change pas à l’intérieur d’une minute, et reste sous la borne de 200 t des Functions', () => {
    expect(pourUnInstant('2026-10-18T22:30:01Z').get('total')).toBe(pourUnInstant('2026-10-18T22:30:59Z').get('total'));
    for (const i of ['1970-01-01T00:00:00Z', '2026-10-18T22:30:00Z', '2026-12-31T23:59:00Z', '2090-06-01T12:00:00Z']) {
      const total = Number(pourUnInstant(i).get('total'));
      expect(total).toBeGreaterThanOrEqual(1);
      expect(total).toBeLessThan(200);
    }
  });
});

// ─── La page de partage ──────────────────────────────────────────────────────────────────────

describe('verifierLePartage', () => {
  const query = parametresA('2026-10-18T22:30:00Z').toString();

  function verifier(r: Reponse) {
    const script = `
      import * as m from ${JSON.stringify(module)};
      import fs from 'node:fs';
      const r = JSON.parse(fs.readFileSync(0, 'utf8'));
      const parametres = new URLSearchParams(${JSON.stringify(query)});
      const verdict = m.verifierLePartage({ erreur: null, ...r, corps: new TextEncoder().encode(r.texte ?? '') }, { origine: ${JSON.stringify(ORIGINE)}, parametres });
      console.log(JSON.stringify(verdict));
    `;
    const sortie = spawnSync(process.execPath, ['--input-type=module', '-e', script], { input: JSON.stringify(r), encoding: 'utf8' });
    if (sortie.status !== 0) throw new Error(sortie.stderr);
    return JSON.parse(sortie.stdout);
  }

  /** La page telle que la vraie fonction la rend pour ces paramètres. */
  async function laVraiePage(): Promise<Reponse> {
    const r = await partage(new Request(`${ORIGINE}/api/partage?${query}`));
    return { statut: r.status, entetes: Object.fromEntries([...r.headers].map(([k, v]) => [k.toLowerCase(), v])), texte: await r.text() };
  }

  test('accepte la page que la vraie api/partage.ts rend pour l’adresse de la sonde', async () => {
    expect(verifier(await laVraiePage())).toMatchObject({ ok: true });
  });

  test('refuse la page sans chiffre : le total n’a pas été lu', async () => {
    const sansChiffre = await laVraiePage();
    const verdict = verifier({ ...sansChiffre, texte: (sansChiffre.texte ?? '').replace(/<title>[^<]*<\/title>/, '<title>Mon empreinte transport</title>') });
    expect(verdict.ok).toBe(false);
    expect(verdict.raison).toContain('(le total a été lu)');
  });

  test('refuse la page sans image d’aperçu vers la carte', async () => {
    const page = await laVraiePage();
    const verdict = verifier({ ...page, texte: (page.texte ?? '').replace(/\/api\/share-card\?/g, '/ailleurs?') });
    expect(verdict.ok).toBe(false);
    expect(verdict.raison).toContain('og:image');
  });

  test('refuse la page qui n’a plus l’en-tête noindex : un chiffre personnel serait indexé', async () => {
    const page = await laVraiePage();
    const verdict = verifier({ ...page, entetes: { 'content-type': page.entetes['content-type'] } });
    expect(verdict.ok).toBe(false);
    expect(verdict.raison).toBe('en-tête x-robots-tag « (aucun) » sans noindex');
  });

  test('refuse une réponse 500 de la fonction', () => {
    expect(verifier(reponse(500, 'text/html', '')).raison).toBe('statut 500 au lieu de 200');
  });
});

// ─── La carte ────────────────────────────────────────────────────────────────────────────────

describe('verifierLaCarte', () => {
  const verifier = (r: Reponse) => appeler('verifierLaCarte', r);

  test('accepte une carte de 1200 × 630 rendue, et le dit', () => {
    expect(verifier({ ...carte(), entetes: { ...carte().entetes, 'x-vercel-cache': 'MISS' } })).toMatchObject({ ok: true, detail: '1200 × 630, 37 Ko, rendue' });
  });

  test('dit qu’une carte servie par le cache n’a pas fait tourner la Function', () => {
    expect(verifier({ ...carte(), entetes: { ...carte().entetes, 'x-vercel-cache': 'HIT' } }).detail).toContain('servie par le cache (la Function n’a pas tourné)');
  });

  test('refuse le repli statique : un pixel, en 200, servi no-store', () => {
    const verdict = verifier(carte(1, 1, 69, 'no-store'));
    expect(verdict.ok).toBe(false);
    expect(verdict.raison).toContain('servie par le repli statique');
  });

  test('refuse un rendu aux mauvaises dimensions', () => {
    expect(verifier(carte(1200, 756)).raison).toBe('1200 × 756 au lieu de 1200 × 630');
  });

  test('refuse un aplat sans un mot dessiné', () => {
    expect(verifier(carte(1200, 630, 900)).raison).toMatch(/^image de 900 o, moins que les/);
  });

  test('refuse un corps qui n’est pas un PNG', () => {
    expect(verifier({ ...reponse(200, 'image/png', 'GIF89a'), entetes: { 'content-type': 'image/png', 'cache-control': CACHE_DE_LA_CARTE } }).raison).toBe('le corps n’est pas un PNG');
  });

  test('refuse la page d’erreur d’une Function qui plante', () => {
    expect(verifier(reponse(500, 'text/plain', 'FUNCTION_INVOCATION_FAILED')).raison).toBe('statut 500 au lieu de 200');
    expect(verifier(reponse(200, 'text/html', '<html>')).raison).toBe('type de contenu « text/html » au lieu de « image/png »');
  });

  test('refuse un cache-control sans public', () => {
    expect(verifier(carte(1200, 630, 38_000, 'private, max-age=0')).raison).toBe('cache-control « private, max-age=0 » sans public');
  });
});

// ─── La clé publishable et la santé de Supabase ──────────────────────────────────────────────

describe('la clé publishable', () => {
  const CLE = 'sb_publishable_xM95cd3h-D-Lf1Iu04sVCg_RijHvCW3';

  test('trouve le script d’entrée du bundle dans la page, et le résout sur l’origine', () => {
    const html = '<html><script src="/_expo/static/js/web/entry-19e52350e762c1a514b1151bf586519d.js" defer></script></html>';
    expect(appeler('trouverLeScriptDEntree', html, ORIGINE)).toBe(`${ORIGINE}/_expo/static/js/web/entry-19e52350e762c1a514b1151bf586519d.js`);
    expect(appeler('trouverLeScriptDEntree', '<html></html>', ORIGINE)).toBeNull();
  });

  test('extrait la clé, et ignore le préfixe seul que le bundle porte aussi', () => {
    expect(appeler('extraireLaClePublishable', `x.startsWith("sb_publishable_")&&(k="${CLE}")`)).toBe(CLE);
    expect(appeler('extraireLaClePublishable', 'x.startsWith("sb_publishable_")')).toBeNull();
    expect(appeler('extraireLaClePublishable', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBeNull();
  });

  test('ne laisse pas la clé dans le verdict lisible quand elle manque, et dit pourquoi', () => {
    const verdict = appeler('verifierLaCle', reponse(200, 'application/javascript; charset=utf-8', 'var a=1;'));
    expect(verdict.ok).toBe(false);
    expect(verdict.raison).toContain('aucune clé « sb_publishable_… »');
    expect(verdict.cle).toBeNull();
  });

  test('refuse un bundle introuvable ou d’un autre type', () => {
    expect(appeler('verifierLaCle', reponse(404, 'text/html', '')).raison).toBe('bundle web : statut 404 au lieu de 200');
    expect(appeler('verifierLaCle', reponse(200, 'text/html', CLE)).raison).toBe('bundle web : type de contenu « text/html » au lieu de « application/javascript »');
  });

  test('rend la clé et sa longueur, sans la recopier dans le détail', () => {
    const verdict = appeler('verifierLaCle', reponse(200, 'application/javascript', `k="${CLE}"`));
    expect(verdict).toMatchObject({ ok: true, cle: CLE, detail: 'clé de 46 caractères' });
    expect(verdict.detail).not.toContain('xM95');
  });
});

describe('verifierLaSante', () => {
  const sante = { version: 'v2.197.0', name: 'GoTrue', description: 'GoTrue is a user registration and authentication API' };
  const verifier = (r: Reponse) => appeler('verifierLaSante', r);

  test('accepte la réponse de GoTrue', () => {
    expect(verifier(reponse(200, 'application/json', JSON.stringify(sante)))).toEqual({ ok: true, detail: 'GoTrue v2.197.0' });
  });

  test('nomme la clé refusée, avec le code que Supabase donne', () => {
    const verdict = verifier(reponse(401, 'application/json;charset=UTF-8', '{}', { 'sb-error-code': 'UNAUTHORIZED_INVALID_API_KEY' }));
    expect(verdict.raison).toBe('statut 401 (UNAUTHORIZED_INVALID_API_KEY) : la clé publishable du bundle déployé est refusée');
  });

  test('pense à la pause d’un projet gratuit quand Auth ne répond plus', () => {
    expect(verifier(reponse(503, 'text/plain', '')).raison).toContain('projet en pause');
    expect(verifier({ statut: null, entetes: {}, erreur: 'fetch failed — ETIMEDOUT' }).raison).toContain('projet en pause');
  });

  test('refuse un service qui ne se présente pas comme GoTrue, ou un corps illisible', () => {
    expect(verifier(reponse(200, 'application/json', JSON.stringify({ name: 'autre' }))).raison).toBe('le service ne se présente pas comme GoTrue (name « autre »)');
    expect(verifier(reponse(200, 'application/json', '<html>')).raison).toBe('le corps n’est pas du JSON');
  });
});

// ─── Les annotations et le rapport ───────────────────────────────────────────────────────────

describe('annotation', () => {
  test('échappe ce que le protocole de GitHub réserve : la virgule et les deux-points coupent un titre', () => {
    expect(appeler('annotation', 'error', 'Sonde, point: carte', '100 % faux\nligne deux')).toBe(
      '::error title=Sonde%2C point%3A carte::100 %25 faux%0Aligne deux',
    );
  });

  test('laisse un titre ordinaire intact', () => {
    expect(appeler('annotation', 'error', 'Sonde — Accueil', '/ — statut 503 au lieu de 200')).toBe('::error title=Sonde — Accueil::/ — statut 503 au lieu de 200');
  });
});

describe('rapporter', () => {
  const points = [
    { id: 'accueil', libelle: 'Accueil', chemin: '/', statut: 'ok', detail: '200, 22 Ko', dureeMs: 480, tentatives: 1 },
    { id: 'carte', libelle: 'Carte de partage', chemin: '/api/share-card', statut: 'echec', raison: 'servie par le repli statique', tentatives: 3 },
    { id: 'sante', libelle: 'Auth Supabase', chemin: '/auth/v1/health', statut: 'saute', raison: 'non sondé : il n’y a pas de clé à présenter' },
  ];

  test('dit lequel est tombé et pourquoi, et combien d’essais ont été faits', () => {
    const { lignes, echecs } = appeler('rapporter', points, { annotations: false });
    expect(lignes).toEqual([
      '✓ Accueil (/) — 200, 22 Ko, 480 ms',
      '✗ Carte de partage (/api/share-card) — servie par le repli statique (3 essais)',
      '– Auth Supabase (/auth/v1/health) — non sondé : il n’y a pas de clé à présenter',
      '1 point(s) sur 3 ne répondent pas comme attendu : Carte de partage.',
    ]);
    expect(echecs).toHaveLength(1);
  });

  test('ajoute une annotation par échec quand on la demande, et seulement alors', () => {
    const avec = appeler('rapporter', points, { annotations: true }).lignes as string[];
    expect(avec.filter((l) => l.startsWith('::error'))).toEqual(['::error title=Sonde — Carte de partage::/api/share-card — servie par le repli statique']);
    expect((appeler('rapporter', points, { annotations: false }).lignes as string[]).some((l) => l.startsWith('::'))).toBe(false);
  });

  test('ne compte pas un point sauté comme un échec', () => {
    const { echecs } = appeler('rapporter', [points[0], points[2]], { annotations: false });
    expect(echecs).toEqual([]);
  });
});

describe('avecTentatives', () => {
  test('retente avant d’échouer : un à-coup du réseau ne réveille personne', () => {
    const code = `
      import { avecTentatives } from ${JSON.stringify(module)};
      let appels = 0;
      const r = await avecTentatives(async () => (++appels < 3 ? { ok: false, raison: 'statut 502 au lieu de 200' } : { ok: true, detail: '200' }), { tentatives: 3, pauseMs: 0 });
      console.log(JSON.stringify({ appels, ok: r.ok, tentatives: r.tentatives }));
    `;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
    expect(JSON.parse(r.stdout)).toEqual({ appels: 3, ok: true, tentatives: 3 });
  });

  test('rend le dernier échec, avec le nombre d’essais, quand la panne dure', () => {
    const code = `
      import { avecTentatives } from ${JSON.stringify(module)};
      let appels = 0;
      const r = await avecTentatives(async () => ({ ok: false, raison: 'essai ' + ++appels }), { tentatives: 3, pauseMs: 0 });
      console.log(JSON.stringify({ appels, raison: r.raison, tentatives: r.tentatives }));
    `;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
    expect(JSON.parse(r.stdout)).toEqual({ appels: 3, raison: 'essai 3', tentatives: 3 });
  });
});

// ─── La sonde entière, contre un faux site local ─────────────────────────────────────────────

type Panne = Partial<{
  accueil503: boolean;
  carteDeSecours: boolean;
  assetlinksAutrePaquet: boolean;
  bundleSansCle: boolean;
  santeRefusee: boolean;
  partageSansChiffre: boolean;
}>;

/** Le faux site : la production saine, ou une panne précise. Écrit sur la sortie les deux ports. */
const FAUX_SITE = `
  import http from 'node:http';
  const pannes = JSON.parse(process.argv[1] ?? '{}');
  const ENTETES_DES_PAGES = { confidentialite: 'Politique de confidentialité', conditions: 'Conditions d’utilisation', 'compte/suppression': 'Supprimer mon compte' };
  const pad = (n) => '<!-- ' + 'x'.repeat(n) + ' -->';
  const CLE = 'sb_publishable_' + 'a'.repeat(31);
  function png() {
    const w = pannes.carteDeSecours ? 1 : 1200, h = pannes.carteDeSecours ? 1 : 630;
    const tete = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(tete, 0);
    tete.writeUInt32BE(13, 8); tete.write('IHDR', 12, 'latin1'); tete.writeUInt32BE(w, 16); tete.writeUInt32BE(h, 20);
    return Buffer.concat([tete, Buffer.alloc(pannes.carteDeSecours ? 36 : 38000)]);
  }
  const site = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const origine = 'http://127.0.0.1:' + site.address().port;
    const envoyer = (statut, type, corps, plus = {}) => { res.writeHead(statut, { 'content-type': type, ...plus }); res.end(corps); };
    const chemin = url.pathname.replace(/^\\//, '');
    if (url.pathname === '/' ) {
      if (pannes.accueil503) return envoyer(503, 'text/html', 'indisponible');
      return envoyer(200, 'text/html; charset=utf-8', '<html><head><meta property="og:url" content="' + origine + '/"/></head><body><script src="/_expo/static/js/web/entry-abc123.js" defer></script>' + pad(12000) + '</body></html>');
    }
    if (ENTETES_DES_PAGES[chemin]) {
      return envoyer(200, 'text/html; charset=utf-8', '<html><head><meta property="og:url" content="' + origine + url.pathname + '"/></head><body><h1 class="c">' + ENTETES_DES_PAGES[chemin] + '</h1>' + pad(40000) + '</body></html>');
    }
    if (url.pathname === '/_expo/static/js/web/entry-abc123.js') {
      return envoyer(200, 'application/javascript; charset=utf-8', pannes.bundleSansCle ? 'var a=1;' : 'k="' + CLE + '"');
    }
    if (url.pathname === '/.well-known/assetlinks.json') {
      const paquet = pannes.assetlinksAutrePaquet ? 'com.exemple.autre' : 'fr.ramille.app';
      return envoyer(200, 'application/json; charset=utf-8', JSON.stringify([{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: paquet, sha256_cert_fingerprints: [Array(32).fill('AB').join(':')] } }]));
    }
    if (url.pathname === '/api/partage') {
      const tonnes = Number(url.searchParams.get('total'));
      const titre = pannes.partageSansChiffre ? 'Mon empreinte transport' : tonnes.toFixed(1).replace('.', ',') + ' t CO₂e par an — mon empreinte transport';
      return envoyer(200, 'text/html; charset=utf-8', '<html><head><meta name="robots" content="noindex, nofollow"><title>' + titre + '</title><meta property="og:image" content="' + origine + '/api/share-card?' + url.searchParams.toString() + '"></head></html>', { 'x-robots-tag': 'noindex, nofollow' });
    }
    if (url.pathname === '/api/share-card') {
      return envoyer(200, 'image/png', png(), { 'cache-control': pannes.carteDeSecours ? 'no-store' : 'public, immutable, no-transform, max-age=31536000' });
    }
    return envoyer(404, 'text/html', 'introuvable');
  });
  const supabase = http.createServer((req, res) => {
    if (req.url === '/auth/v1/health' && String(req.headers.apikey ?? '').startsWith('sb_publishable_') && !pannes.santeRefusee) {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ version: 'v2.197.0', name: 'GoTrue', description: 'GoTrue' }));
    }
    res.writeHead(401, { 'content-type': 'application/json', 'sb-error-code': 'UNAUTHORIZED_INVALID_API_KEY' });
    res.end('{}');
  });
  await new Promise((fin) => site.listen(0, '127.0.0.1', fin));
  await new Promise((fin) => supabase.listen(0, '127.0.0.1', fin));
  console.log(JSON.stringify({ site: site.address().port, supabase: supabase.address().port }));
`;

/** Joue la sonde contre le faux site, l'arrête ensuite, et rend la sortie et le code. */
async function sonderLeFauxSite(pannes: Panne = {}, options: string[] = []) {
  const serveur = spawn(process.execPath, ['--input-type=module', '-e', FAUX_SITE, JSON.stringify(pannes)], { stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    const ports = await new Promise<{ site: number; supabase: number }>((ok, echec) => {
      let tampon = '';
      serveur.stdout.on('data', (morceau) => {
        tampon += morceau;
        if (tampon.includes('\n')) ok(JSON.parse(tampon));
      });
      serveur.on('error', echec);
      serveur.on('exit', () => echec(new Error('le faux site s’est arrêté avant de répondre')));
    });
    const r = spawnSync(
      process.execPath,
      [
        module,
        '--origine', `http://127.0.0.1:${ports.site}`,
        '--supabase', `http://127.0.0.1:${ports.supabase}`,
        '--tentatives', '1',
        '--pause-ms', '0',
        ...options,
      ],
      { encoding: 'utf8' },
    );
    return { code: r.status, sortie: r.stdout, erreur: r.stderr };
  } finally {
    serveur.removeAllListeners('exit');
    serveur.kill();
  }
}

describe('la sonde entière, contre un faux site local', () => {
  test('sort en 0 et dit que tout répond quand le site est sain', async () => {
    const r = await sonderLeFauxSite();
    expect(r.erreur).toBe('');
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('Tout répond (9 points).');
    expect(r.sortie.match(/^✓ /gm)).toHaveLength(9);
  });

  test('sort en 1 et nomme l’accueil quand il répond 503, sans croire la clé trouvée ailleurs', async () => {
    const r = await sonderLeFauxSite({ accueil503: true }, ['--annotations']);
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('✗ Accueil (/) — statut 503 au lieu de 200');
    expect(r.sortie).toContain('✗ Clé publishable dans le bundle web');
    expect(r.sortie).toContain('– Auth Supabase (/auth/v1/health) — non sondé');
    expect(r.sortie).toContain('::error title=Sonde — Accueil::/ — statut 503 au lieu de 200');
  });

  test('sort en 1 quand la carte part par le repli statique', async () => {
    const r = await sonderLeFauxSite({ carteDeSecours: true });
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('✗ Carte de partage (/api/share-card) — servie par le repli statique');
    expect(r.sortie.match(/^✗ /gm)).toHaveLength(1);
  });

  test('sort en 1 quand assetlinks.json ne déclare plus le paquet', async () => {
    const r = await sonderLeFauxSite({ assetlinksAutrePaquet: true });
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('✗ Fichier des liens Android (/.well-known/assetlinks.json) — aucune déclaration pour le paquet fr.ramille.app');
  });

  test('sort en 1 quand la page de partage a perdu le chiffre', async () => {
    const r = await sonderLeFauxSite({ partageSansChiffre: true });
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('✗ Page de partage (/api/partage) — absent de la page : le titre');
  });

  test('sort en 1, et saute la santé, quand le bundle ne porte plus la clé', async () => {
    const r = await sonderLeFauxSite({ bundleSansCle: true });
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('✗ Clé publishable dans le bundle web (/_expo/static/js/web/entry-*.js) — aucune clé « sb_publishable_… »');
    expect(r.sortie).toContain('– Auth Supabase (/auth/v1/health) — non sondé : il n’y a pas de clé à présenter');
  });

  test('sort en 1 quand Supabase refuse la clé du bundle', async () => {
    const r = await sonderLeFauxSite({ santeRefusee: true });
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('✗ Auth Supabase (/auth/v1/health) — statut 401 (UNAUTHORIZED_INVALID_API_KEY)');
  });

  test('refuse une option inconnue au lieu de sonder à moitié', () => {
    const r = spawnSync(process.execPath, [module, '--vite'], { encoding: 'utf8' });
    expect(r.status).toBe(64);
    expect(r.stderr).toContain('option inconnue : --vite');
  });
});
