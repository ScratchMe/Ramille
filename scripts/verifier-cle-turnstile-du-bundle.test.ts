/// <reference types="node" />
/**
 * Le contrôle du build de production qui refuse un bundle web sans la clé de site Turnstile
 * (`verifier-cle-turnstile-du-bundle.mjs`, 04/10/2026). Une fois le captcha activé dans Supabase, une
 * clé absente du bundle refuserait chaque nouveau visiteur web, et aucune garde de la CI ne le verrait :
 * la CI n'a pas de clé, exprès. La place du contrôle dans `vercel-build` est épinglée par
 * `vercel-csp.test.ts`, qui garde la commande entière.
 *
 * Éprouvé en le cassant, le 04/10/2026 : ne jamais bloquer (toujours `exit 0`) fait tomber les deux
 * refus ; ne pas lire le bundle (la clé posée suffit) fait tomber « posée mais absente du bundle »,
 * seul ; bloquer aussi hors production fait tomber le dernier, seul.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const racine = path.resolve(__dirname, '..');
const script = path.join(racine, 'scripts', 'verifier-cle-turnstile-du-bundle.mjs');
const CLE = '0x4AAAAAAFNv5EbSVnEyqbgF';

/** Un export minimal : un seul fichier de bundle, avec ou sans la clé. */
function unExport(contenu: string): string {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'cle-turnstile-'));
  const dossier = path.join(dist, '_expo', 'static', 'js', 'web');
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'entry-abc.js'), contenu);
  return dist;
}

function construire(dist: string, env: { VERCEL_ENV?: string; EXPO_PUBLIC_TURNSTILE_SITE_KEY?: string }) {
  const herite: NodeJS.ProcessEnv = { ...process.env };
  // Une valeur qui traînerait dans le shell fausserait le cas en silence.
  delete herite.VERCEL_ENV;
  delete herite.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
  const r = spawnSync(process.execPath, [script, dist], { encoding: 'utf8', env: { ...herite, ...env } });
  return { code: r.status, sortie: `${r.stdout}${r.stderr}` };
}

describe('verifier-cle-turnstile-du-bundle.mjs — le build de production refuse un web sans clé de captcha', () => {
  test('production, la clé posée et présente dans le bundle : le déploiement part', () => {
    const r = construire(unExport(`var a="${CLE}";`), { VERCEL_ENV: 'production', EXPO_PUBLIC_TURNSTILE_SITE_KEY: CLE });
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('le bundle web porte la clé');
  });

  test('production, sans variable : refusé, et la sortie dit pourquoi', () => {
    const r = construire(unExport(`var a="${CLE}";`), { VERCEL_ENV: 'production' });
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('EXPO_PUBLIC_TURNSTILE_SITE_KEY est absente');
  });

  test('production, la clé posée mais absente du bundle : refusé', () => {
    const r = construire(unExport('var a=void 0;'), { VERCEL_ENV: 'production', EXPO_PUBLIC_TURNSTILE_SITE_KEY: CLE });
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('le bundle web');
  });

  test('hors production (CI, mesure hors ligne) : un avertissement, jamais un échec', () => {
    const r = construire(unExport('var a=void 0;'), {});
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('contrôle non bloquant');
  });
});
