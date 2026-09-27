/// <reference types="node" />
/**
 * Le rejeu local de la CI (`scripts/rejouer-la-ci.mjs`) suit-il encore `ci.yml` ?
 *
 * Un script qui recopie la liste des étapes de la CI se périme en silence au premier ajout : le
 * 26/09/2026, `verifier-miroir-du-kit.mjs` est entré dans la CI, et une liste tenue à la main
 * l'aurait ignoré — le rejeu local serait resté vert sur un arbre que la CI refuse. La garde lit
 * donc `ci.yml` et le plan du script (`--a-blanc`, qui ne lance rien) et exige que chaque `run:`
 * de la CI soit rejoué par un pas **du même travail**, ou figure dans `nonRejouees` avec sa raison.
 * L'inverse aussi : un pas qui prétend rejouer une étape disparue de la CI est un pas mort.
 *
 * Ce que la garde ne voit pas : que la commande locale fasse la même chose que celle de la CI.
 * Elles diffèrent exprès (`--clear`, `--yes`, `npx supabase@…`), et l'en-tête du script dit
 * chaque différence ; la garde vérifie l'appariement, les versions et la configuration factice.
 *
 * Éprouvé en le cassant, le 27/09/2026 (huit mutations, chacune remise en place avant la
 * suivante, 10 tests) :
 * - `verifier-miroir-du-kit` retiré du plan → 1 tombe, l'étape orpheline ;
 * - une étape ajoutée à `ci.yml` (`node scripts/verifier-nouveau.mjs`) → 1 tombe, la même ;
 * - l'URL factice recopiée de travers dans le script → 1 tombe, la configuration ;
 * - le CLI Supabase à une autre version que la CI → 1 tombe ;
 * - la raison d'un pas local retirée → 1 tombe ;
 * - un pas qui rejoue `npx tsc` au lieu de `npx tsc --noEmit` → 2 tombent : l'étape de la CI
 *   devient orpheline, et le pas ne retrouve plus la sienne ;
 * - `--clear` retiré des exports → 1 tombe ;
 * - l'étape `jest` rattachée au mauvais travail → 4 tombent.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const racine = path.resolve(__dirname, '..');
const script = path.join(racine, 'scripts', 'rejouer-la-ci.mjs');

type EtapeCI = { travail: string; run: string; env: Record<string, string> };
type Pas = { nom: string; ci: string | null; raison?: string; commande: string; env: Record<string, string> | string };
type Plan = {
  versionSupabase: string;
  nonRejouees: { ci: string; raison: string }[];
  etapes: { nom: string; travail: string; pas: Pas[] }[];
};

const indentation = (ligne: string) => ligne.length - ligne.trimStart().length;

/**
 * Les `run:` de `ci.yml`, avec leur travail et leur `env:`. Une lecture ligne à ligne suffit — le
 * fichier est à nous, et une dépendance YAML pour un test serait une dépendance de plus.
 */
function lireLaCI(): { etapes: EtapeCI[]; versionsSupabase: string[] } {
  const lignes = fs.readFileSync(path.join(racine, '.github', 'workflows', 'ci.yml'), 'utf8').split('\n');
  const etapes: EtapeCI[] = [];
  const versionsSupabase: string[] = [];
  let travail = '';
  let dansLesTravaux = false;
  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];
    if (/^jobs:\s*$/.test(ligne)) dansLesTravaux = true;
    const nomDuTravail = dansLesTravaux ? ligne.match(/^ {2}([\w-]+):\s*$/) : null;
    if (nomDuTravail) travail = nomDuTravail[1];
    const version = ligne.match(/^\s+version: (\S+)\s*$/);
    if (version) versionsSupabase.push(version[1]);
    const run = ligne.match(/^(\s*)- run: (.*)$/);
    if (!run) continue;
    const niveau = run[1].length;
    let commande = run[2];
    if (commande === '|') {
      const bloc: string[] = [];
      while (i + 1 < lignes.length && (lignes[i + 1].trim() === '' || indentation(lignes[i + 1]) > niveau + 2)) {
        bloc.push(lignes[++i]);
      }
      commande = bloc.join('\n');
    }
    const env: Record<string, string> = {};
    if (lignes[i + 1] !== undefined && indentation(lignes[i + 1]) === niveau + 2 && lignes[i + 1].trim() === 'env:') {
      i++;
      while (i + 1 < lignes.length && lignes[i + 1].trim() !== '' && indentation(lignes[i + 1]) > niveau + 2) {
        const entree = lignes[++i].trim().match(/^(\w+): (.*)$/);
        if (entree) env[entree[1]] = entree[2];
      }
    }
    etapes.push({ travail, run: commande, env });
  }
  return { etapes, versionsSupabase };
}

/** Les blancs d'un bloc `run: |` ne comptent pas : seules les lignes, dans l'ordre. */
const normaliser = (commande: string) =>
  commande
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');

function aBlanc(...etapes: string[]): { code: number | null; plan: Plan | null; erreur: string } {
  const r = spawnSync('node', [script, '--a-blanc', ...etapes], { encoding: 'utf8' });
  return { code: r.status, plan: r.status === 0 ? JSON.parse(r.stdout) : null, erreur: r.stderr };
}

const ci = lireLaCI();
const plan = aBlanc().plan as Plan;
const pasDuTravail = (travail: string) => plan.etapes.find((e) => e.travail === travail)?.pas ?? [];

describe('le rejeu local suit ci.yml', () => {
  test('la lecture de ci.yml trouve ce qu’elle doit trouver', () => {
    // Sans ceci, un changement de mise en forme de ci.yml viderait la liste, et les trois tests
    // suivants passeraient sur rien.
    expect(new Set(ci.etapes.map((e) => e.travail)).size).toBe(5);
    expect(ci.etapes.length).toBeGreaterThan(25);
    expect(ci.etapes.some((e) => e.run.includes('$GITHUB_ENV'))).toBe(true);
  });

  test('les travaux de la CI ont chacun leur étape, dans le même ordre', () => {
    expect(plan.etapes.map((e) => e.travail)).toEqual([...new Set(ci.etapes.map((e) => e.travail))]);
  });

  test('chaque étape de la CI est rejouée par un pas du même travail, ou dit pourquoi elle ne l’est pas', () => {
    const orphelines = ci.etapes
      .filter((e) => !plan.nonRejouees.some((n) => n.ci === e.run))
      .filter((e) => !pasDuTravail(e.travail).some((p) => p.ci !== null && normaliser(p.ci) === normaliser(e.run)))
      .map((e) => `${e.travail} : ${e.run}`);
    expect(orphelines).toEqual([]);
  });

  test('chaque pas qui dit rejouer une étape de la CI la retrouve dans son travail', () => {
    const morts = plan.etapes.flatMap((e) =>
      e.pas
        .filter((p) => p.ci !== null)
        .filter((p) => !ci.etapes.some((c) => c.travail === e.travail && normaliser(c.run) === normaliser(p.ci as string)))
        .map((p) => `${e.nom} · ${p.nom}`),
    );
    const nonRejoueesMortes = plan.nonRejouees.filter((n) => !ci.etapes.some((c) => c.run === n.ci)).map((n) => n.ci);
    expect([...morts, ...nonRejoueesMortes]).toEqual([]);
  });

  test('un pas propre au local dit pourquoi la CI n’en a pas besoin', () => {
    const muets = plan.etapes.flatMap((e) => e.pas.filter((p) => p.ci === null && !p.raison).map((p) => p.nom));
    expect(muets).toEqual([]);
    expect(plan.nonRejouees.every((n) => n.raison.length > 0)).toBe(true);
  });

  test('le CLI Supabase est celui que la CI épingle, partout', () => {
    expect([...new Set(ci.versionsSupabase)]).toEqual([plan.versionSupabase]);
    const appels = plan.etapes.flatMap((e) => e.pas.map((p) => p.commande)).filter((c) => /\bsupabase@/.test(c));
    expect(appels.length).toBeGreaterThan(0);
    expect(appels.filter((c) => !c.includes(`supabase@${plan.versionSupabase} `))).toEqual([]);
  });

  test('un pas porte la configuration que la CI donne à son étape', () => {
    // La configuration factice est ce que `verifier-configuration-export.mjs` retrouve dans le
    // bundle : une valeur recopiée de travers ici rendrait le contrôle rouge pour rien, ou vert
    // sur un export qui n'est pas celui de la CI.
    const avecEnv = ci.etapes.filter((e) => Object.keys(e.env).length > 0);
    expect(avecEnv.length).toBeGreaterThan(0);
    for (const e of avecEnv) {
      const pas = pasDuTravail(e.travail).find((p) => p.ci !== null && normaliser(p.ci) === normaliser(e.run));
      expect(pas?.env).toEqual(expect.objectContaining(e.env));
    }
  });

  test('chaque export porte --clear', () => {
    // Le cache de Metro est partagé entre copies de travail et n'a pas les `EXPO_PUBLIC_*` dans sa
    // clé : sans `--clear`, un export rend le bundle d'un autre arbre ou d'une autre configuration.
    const exports = plan.etapes.flatMap((e) => e.pas).filter((p) => p.commande.includes('expo export'));
    expect(exports.map((p) => p.nom)).toEqual(['export factice', 'export branché sur la stack']);
    expect(exports.filter((p) => !p.commande.split(' ').includes('--clear'))).toEqual([]);
  });
});

describe('le choix des étapes', () => {
  test('ne décrit que les étapes nommées', () => {
    expect(aBlanc('base', 'jest').plan?.etapes.map((e) => e.nom)).toEqual(['jest', 'base']);
  });

  test('refuse une étape inconnue, en nommant les étapes', () => {
    const r = aBlanc('verification');
    expect(r.code).toBe(64);
    expect(r.erreur).toContain('verifications, jest, export, base, parcours');
  });
});
