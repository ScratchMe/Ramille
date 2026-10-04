/// <reference types="node" />
/**
 * Garde de `vercel.json` et de son Ignored Build Step (`scripts/vercel-ignorer-le-build.sh`).
 *
 * Deux choses sont éprouvées, et la première est la plus importante : **un `vercel.json`
 * invalide fait échouer TOUS les déploiements, production comprise** (VERCEL.md §1.3). Le fichier
 * est donc parsé ici, et la production doit rester du côté « construire » — `git.deploymentEnabled`
 * nomme `main`, et l'`ignoreCommand` pointe sur un script qui existe.
 *
 * La seconde est le script lui-même, joué sur de vrais dépôts git fabriqués dans un répertoire
 * temporaire : chaque scénario est une histoire de commits, et l'assertion porte sur le code de
 * sortie, parce que c'est la seule chose que Vercel lit. **0 est la seule valeur qui saute.** Les
 * scénarios sont écrits par paires quand c'est possible (le même dépôt, une variable en plus) pour
 * que ce soit la variable, et non le dépôt, qui explique la différence.
 *
 * Non-vacuité, mesurée le 15/09/2026 en cassant le script six fois (chaque mutation remise en
 * place avant la suivante) : retirer `core.quotePath=false` fait tomber 1 test (l'accent) ;
 * reconnaître `*.md` partout au lieu de la racine, 1 (le `.md` sous `src/`) ; ignorer
 * `VERCEL_GIT_PREVIOUS_SHA`, 3 ; sauter sur un diff vide, 1 ; sauter sur tout `VERCEL_ENV` autre
 * que `production`, 1 ; élargir la liste blanche à `src/`, 4. Aucune mutation ne passe.
 *
 * Et le 04/10/2026, les deux scripts que `vercel-build` lance remis dans la liste blanche avec le reste
 * de `scripts/*` : 2 tests tombent, ceux qui les nomment. Le même soir, la liste lue dans
 * `package.json` : un troisième script ajouté à `vercel-build` sans exception fait tomber son cas
 * (1) ; un import de `./servir-export.mjs` ajouté au script de la page 404, le sien (1).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const racine = path.resolve(__dirname, '..');
const script = path.join(racine, 'scripts', 'vercel-ignorer-le-build.sh');

type Env = { VERCEL_ENV?: string; VERCEL_GIT_PREVIOUS_SHA?: string };

/** Un dépôt git jetable, avec juste ce qu'il faut pour commettre sans configuration globale. */
class Depot {
  readonly dir: string;

  constructor() {
    this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-ignorer-le-build-'));
    this.git('init', '-q', '-b', 'main');
  }

  git(...args: string[]): string {
    const r = spawnSync('git', args, {
      cwd: this.dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 'test@example.invalid',
        GIT_COMMITTER_NAME: 'test',
        GIT_COMMITTER_EMAIL: 'test@example.invalid',
      },
    });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`);
    return r.stdout.trim();
  }

  /** Écrit les fichiers donnés (le contenu importe peu, seul le chemin compte) et commet. */
  commettre(message: string, fichiers: string[]): string {
    for (const f of fichiers) {
      const abs = path.join(this.dir, f);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, `${message}\n${f}\n`);
    }
    this.git('add', '-A');
    this.git('commit', '-q', '-m', message);
    return this.git('rev-parse', 'HEAD');
  }

  /** Joue le script comme Vercel le ferait : depuis la racine du clone, avec ces deux variables. */
  ignorer(env: Env = {}): { code: number | null; sortie: string } {
    // Les deux variables sont retirées de l'environnement hérité avant d'être reposées : un
    // `VERCEL_ENV` qui traînerait dans le shell de la personne fausserait le scénario en silence.
    const { VERCEL_ENV: _e, VERCEL_GIT_PREVIOUS_SHA: _s, ...herite } = process.env;
    const r = spawnSync('sh', [script], { cwd: this.dir, encoding: 'utf8', env: { ...herite, ...env } });
    return { code: r.status, sortie: `${r.stdout}${r.stderr}` };
  }

  supprimer() {
    fs.rmSync(this.dir, { recursive: true, force: true });
  }
}

const depots: Depot[] = [];
const depot = () => {
  const d = new Depot();
  depots.push(d);
  return d;
};
afterAll(() => depots.forEach((d) => d.supprimer()));

/** Un dépôt avec un commit initial de code, sur lequel chaque scénario empile le sien. */
const depotAvecSocle = () => {
  const d = depot();
  d.commettre('socle', ['package.json', 'src/app/index.tsx', 'api/partage.ts', 'vercel.json']);
  return d;
};

describe('vercel.json', () => {
  const config = JSON.parse(fs.readFileSync(path.join(racine, 'vercel.json'), 'utf8'));

  test('se parse, et la production reste du côté « construire »', () => {
    // `deploymentEnabled` : `**` et jamais `*` (minimatch ne traverse pas les `/`, et les branches
    // s'appellent `claude/…`), et `main` nommée explicitement — Vercel déploie dès qu'une règle
    // correspondante vaut `true`, donc la retirer couperait la production.
    expect(config.git.deploymentEnabled).toEqual({ '**': false, main: true });
    expect(config.cleanUrls).toBe(true);
  });

  test("l'ignoreCommand invoque par `sh` un script qui existe", () => {
    expect(config.ignoreCommand).toBe('sh scripts/vercel-ignorer-le-build.sh');
    expect(fs.existsSync(script)).toBe(true);
    // `sh -n` : le script se lit sans erreur de syntaxe dans le shell POSIX qui l'exécutera.
    expect(spawnSync('sh', ['-n', script]).status).toBe(0);
  });
});

describe("l'Ignored Build Step", () => {
  test('saute (0) une fusion qui ne touche que ce que le build ne lit pas', () => {
    const d = depotAvecSocle();
    d.commettre('doc seule', [
      'docs/architecture/v1-17.md',
      'README.md',
      'CLAUDE.md',
      'VERCEL.md',
      'LICENSE',
      '.github/workflows/ci.yml',
      'supabase/migrations/20260916000000_x.sql',
      '.claude/skills/x/SKILL.md',
      '.design-sync/NOTES.md',
      '.vscode/settings.json',
      'scripts/verifier-x.mjs',
    ]);
    const r = d.ignorer({ VERCEL_ENV: 'production' });
    expect(r.sortie).toContain('sauté');
    expect(r.code).toBe(0);
  });

  test.each([
    ['un écran', 'src/app/plan.tsx'],
    ['une fonction', 'api/share-card.ts'],
    ['une police lue par une fonction', 'api/fonts/SplineSans-Bold.ttf'],
    ['vercel.json lui-même', 'vercel.json'],
    ['package.json', 'package.json'],
    ['un fichier public', 'public/robots.txt'],
    ['une ressource', 'assets/images/icon.png'],
    ['la configuration Expo', 'app.json'],
    ['un .md hors de la racine — il pourrait être importé', 'src/content/aide.md'],
    // `vercel-build` les lance (04/10/2026) : sous `scripts/`, mais dans le build.
    ['le script qui pose la page 404', 'scripts/poser-la-page-introuvable.mjs'],
    ['le contrôle de la CSP que lance le build', 'scripts/verifier-origine-supabase-de-la-csp.mjs'],
  ])('construit (1) dès que %s change', (_quoi, fichier) => {
    const d = depotAvecSocle();
    d.commettre('code', ['docs/note.md', fichier]);
    expect(d.ignorer({ VERCEL_ENV: 'production' }).code).toBe(1);
  });

  // **La liste ci-dessus est recopiée à la main, celle-ci se lit dans `package.json`** (04/10/2026,
  // seconde passe de la revue finale). Un troisième script entré dans `vercel-build` sans exception
  // serait sauté seul, et sa correction ne partirait pas ; un script du build qui importerait un
  // module voisin de `scripts/` le serait aussi quand seul ce module change. Les deux se vérifient
  // donc sur la commande réelle.
  const scriptsDuBuild = [
    ...JSON.parse(fs.readFileSync(path.join(racine, 'package.json'), 'utf8')).scripts['vercel-build'].matchAll(
      /node (scripts\/[^\s&|;]+)/g
    ),
  ].map((m: RegExpMatchArray) => m[1]);

  test('vercel-build lance au moins les deux scripts qui entrent dans le build', () => {
    expect(scriptsDuBuild).toEqual(
      expect.arrayContaining(['scripts/poser-la-page-introuvable.mjs', 'scripts/verifier-origine-supabase-de-la-csp.mjs'])
    );
  });

  test.each(scriptsDuBuild)('construit quand %s, lancé par vercel-build, change seul', (fichier) => {
    const d = depotAvecSocle();
    d.commettre('script du build', [fichier]);
    expect(d.ignorer({ VERCEL_ENV: 'production' }).code).toBe(1);
  });

  test.each(scriptsDuBuild)("%s n'importe aucun module voisin, que le saut ne verrait pas", (fichier) => {
    const source = fs.readFileSync(path.join(racine, fichier), 'utf8');
    expect(source).not.toMatch(/(?:from\s+|import\s*\(\s*|require\(\s*)['"]\.{1,2}\//);
  });

  test('sans VERCEL_ENV, la comparaison de fichiers décide — jamais le repli de prévisualisation', () => {
    const d = depotAvecSocle();
    d.commettre('code', ['src/app/plan.tsx']);
    const r = d.ignorer();
    expect(r.sortie).not.toContain('prévisualisation');
    expect(r.code).toBe(1);
  });

  test('une prévisualisation ne se construit jamais, même sur du code', () => {
    const d = depotAvecSocle();
    d.commettre('code', ['src/app/plan.tsx']);
    expect(d.ignorer({ VERCEL_ENV: 'preview' }).code).toBe(0);
  });

  test('compare au dernier déploiement RÉUSSI, pas au commit précédent — sinon un build échoué se perd', () => {
    // Histoire : socle déployé → fusion de code dont le build ÉCHOUE → fusion de doc seule.
    // `HEAD^..HEAD` ne voit que la doc et sauterait : le code de la fusion échouée ne partirait
    // jamais. `VERCEL_GIT_PREVIOUS_SHA` pointe sur le socle, donc la comparaison voit le code.
    const d = depotAvecSocle();
    const dernierReussi = d.git('rev-parse', 'HEAD');
    d.commettre('code dont le build a échoué', ['src/app/plan.tsx']);
    d.commettre('doc seule', ['docs/note.md']);

    const avecLaVariable = d.ignorer({ VERCEL_ENV: 'production', VERCEL_GIT_PREVIOUS_SHA: dernierReussi });
    expect(avecLaVariable.code).toBe(1);

    // La même histoire sans la variable : c'est le trou que la variable ferme, et il est
    // volontairement montré ici plutôt que caché — un repli sur HEAD^ n'est pas gratuit.
    const sansLaVariable = d.ignorer({ VERCEL_ENV: 'production' });
    expect(sansLaVariable.sortie).toContain('repli sur HEAD^');
    expect(sansLaVariable.code).toBe(0);
  });

  test('une base inconnue (clone superficiel, SHA fantaisiste) construit', () => {
    const d = depotAvecSocle();
    d.commettre('doc seule', ['docs/note.md']);
    const r = d.ignorer({ VERCEL_ENV: 'production', VERCEL_GIT_PREVIOUS_SHA: '0123456789abcdef0123456789abcdef01234567' });
    expect(r.sortie).toContain('a échoué');
    expect(r.code).toBe(1);
  });

  test('une base égale à HEAD (redéploiement du même commit) construit', () => {
    const d = depotAvecSocle();
    const head = d.commettre('doc seule', ['docs/note.md']);
    const r = d.ignorer({ VERCEL_ENV: 'production', VERCEL_GIT_PREVIOUS_SHA: head });
    expect(r.sortie).toContain('aucun fichier changé');
    expect(r.code).toBe(1);
  });

  test('un premier commit sans parent construit plutôt que de planter en silence', () => {
    const d = depot();
    d.commettre('premier', ['docs/note.md']);
    expect(d.ignorer({ VERCEL_ENV: 'production' }).code).toBe(1);
  });

  test('un nom de fichier accentué reste reconnu (core.quotePath)', () => {
    // Sans `-c core.quotePath=false`, git imprime "docs/d\303\251cision.md" entre guillemets, la
    // liste blanche ne le reconnaît pas, et une fusion de doc construirait — à tort, dans le
    // sens sûr, mais à tort. La garde est ici pour que ce cas reste sauté.
    const d = depotAvecSocle();
    d.commettre('doc accentuée', ['docs/décision-écrite.md']);
    expect(d.ignorer({ VERCEL_ENV: 'production' }).code).toBe(0);
  });
});
