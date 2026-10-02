/// <reference types="node" />
/**
 * La politique de sécurité du site (`Content-Security-Policy` de `vercel.json`), et la façon dont
 * `servir-export.mjs` la sert aux gardes qui ouvrent l'export dans un navigateur.
 *
 * **Appliquée depuis le 02/10/2026** (`VERCEL.md` §2.2). Elle était en `Report-Only` sans
 * collecteur, donc elle ne rapportait à personne. La mesure qui en tenait lieu : la politique stricte
 * injectée en rapport seul sur les dix-neuf routes de la production, sans une infraction, et une
 * politique volontairement trop étroite qui en relevait des dizaines sur les mêmes pages. Les
 * quatre gardes navigateur la servent désormais appliquée, à chaque PR.
 *
 * Ce fichier ne remplace pas ces gardes : il ne sait pas si l'app a besoin d'une origine. Il garde
 * **la forme** de la politique contre un affaiblissement fait en passant — un `'unsafe-eval'` remis
 * pour faire taire une erreur, un joker dans `connect-src`, un retour en rapport seul —, chacun
 * pouvant se décider, mais pas sans qu'un test le dise. Et il garde la substitution de l'origine
 * Supabase, la seule chose que le serveur des gardes change à la politique de production.
 *
 * Non-vacuité, mesurée le 02/10/2026 en cassant six fois (chaque mutation remise en place avant la
 * suivante) : repasser l'en-tête en `Content-Security-Policy-Report-Only` fait tomber 5 tests ;
 * remettre `'unsafe-inline'` dans `script-src`, 1 ; remettre `'unsafe-eval'`, 1 ; remettre
 * `https://*.supabase.co` dans `connect-src`, 2 ; dans `servir-export.mjs`, remplacer aussi les
 * autres sources de `connect-src`, 1 ; servir la politique sans substitution quand l'origine
 * manque, au lieu de refuser, 1. Aucune mutation ne passe.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const racine = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(racine, 'vercel.json'), 'utf8'));

type EnTete = { key: string; value: string };
const enTetes: EnTete[] = (config.headers ?? []).flatMap((regle: { headers: EnTete[] }) => regle.headers);
const politique = enTetes.find((e) => e.key.toLowerCase() === 'content-security-policy')?.value ?? '';

function directive(nom: string): string[] {
  const trouvee = politique
    .split(';')
    .map((d) => d.trim().split(/\s+/))
    .find(([n]) => n === nom);
  return trouvee ? trouvee.slice(1) : [];
}

/**
 * `servir-export.mjs` est un module ESM que la suite Jest ne transforme pas : on l'appelle dans un
 * Node à part, comme les autres tests de `scripts/` appellent leurs scripts.
 */
function servie(origine: string | null, valeur = politique): { politique?: string; erreur?: string } {
  const code =
    `import { politiqueServie } from ${JSON.stringify(path.join(racine, 'scripts', 'servir-export.mjs'))};` +
    `try { console.log(JSON.stringify({ politique: politiqueServie(process.argv[1], process.argv[2] || undefined) })); }` +
    `catch (e) { console.log(JSON.stringify({ erreur: e.message })); }`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code, valeur, origine ?? ''], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

describe('vercel.json — la CSP est appliquée, et stricte', () => {
  test('l’en-tête est Content-Security-Policy, et plus aucun Report-Only', () => {
    expect(politique).not.toBe('');
    expect(enTetes.some((e) => /report-only/i.test(e.key))).toBe(false);
  });

  test('les directives de fond : rien d’ailleurs par défaut, ni objet, ni cadre, ni base, ni formulaire', () => {
    expect(directive('default-src')).toEqual(["'self'"]);
    expect(directive('object-src')).toEqual(["'none'"]);
    expect(directive('frame-ancestors')).toEqual(["'none'"]);
    expect(directive('base-uri')).toEqual(["'self'"]);
    expect(directive('form-action')).toEqual(["'self'"]);
  });

  test('script-src : le site et des empreintes, rien d’autre — ni inline, ni eval, ni hôte', () => {
    const sources = directive('script-src');
    expect(sources[0]).toBe("'self'");
    for (const source of sources.slice(1)) expect(source).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/);
    expect(sources.length).toBeGreaterThan(1);
  });

  test('connect-src : le site et un seul projet Supabase, nommé — pas de joker', () => {
    const sources = directive('connect-src');
    expect(sources[0]).toBe("'self'");
    expect(sources.slice(1)).toHaveLength(1);
    expect(sources[1]).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
  });

  test('aucun joker nulle part dans la politique', () => {
    expect(politique).not.toContain('*');
  });
});

describe('servir-export.mjs — la politique servie aux gardes', () => {
  test('remplace l’origine Supabase de connect-src par celle de l’export, et rien d’autre', () => {
    const r = servie('http://127.0.0.1:54321/');
    expect(r.erreur).toBeUndefined();
    const attendue = politique.replace(directive('connect-src')[1], 'http://127.0.0.1:54321');
    expect(r.politique).toBe(attendue);
  });

  test('ne touche pas aux autres sources de connect-src', () => {
    const r = servie('https://exemple.supabase.co', "connect-src 'self' https://ailleurs.example https://abc.supabase.co");
    expect(r.politique).toBe("connect-src 'self' https://ailleurs.example https://exemple.supabase.co");
  });

  test('refuse de servir sans l’origine de l’export, plutôt qu’une politique qui bloquerait chaque requête', () => {
    const r = servie(null);
    expect(r.politique).toBeUndefined();
    expect(r.erreur).toContain('EXPO_PUBLIC_SUPABASE_URL');
  });
});
