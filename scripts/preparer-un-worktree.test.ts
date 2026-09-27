/// <reference types="node" />
/**
 * Garde de `scripts/preparer-un-worktree.mjs`, et des deux réglages de `.claude/settings.json` qui
 * font partir une copie de travail du HEAD local et y lient `node_modules`.
 *
 * Le script est joué comme un sous-agent le joue : depuis sa copie, avec le chemin du script de la
 * copie principale. Chaque scénario fabrique un dépôt jetable — `main` au commit A, la branche de
 * travail au commit B, un `node_modules` dans la copie principale — puis une copie de travail partie
 * de A, ce que faisait `origin/main` avant le réglage.
 *
 * Éprouvé en le cassant, le 27/09/2026 (neuf mutations, chacune remise en place avant la suivante,
 * 10 tests) :
 * - l'avance remplacée par un `reset --hard`, sans condition d'ancêtre → 1 tombe : la copie qui a
 *   divergé perdait le travail de son agent ;
 * - un fichier suivi modifié ignoré → 1 tombe ;
 * - les fichiers **non suivis** comptés comme une modification → 1 tombe, le brouillon qui
 *   n'empêche pas l'avance ;
 * - la copie principale acceptée → 1 tombe ;
 * - `node_modules` jamais lié → 1 tombe ;
 * - le commit attendu toujours tenu pour acquis → 5 tombent ;
 * - `expo-env.d.ts` jamais créé → 1 tombe ;
 * - un commit inconnu non reconnu comme tel → 1 tombe : il se lisait « a divergé » ;
 * - le `.gitignore` du dépôt remis à `node_modules/` → 1 tombe : git revoit le lien.
 * La première version posait un **dossier** là où Claude Code pose un lien, et affirmait que c'était
 * la même chose : le défaut du `.gitignore` lui échappait (contre-lecture du 27/09/2026). Et la garde
 * des réglages a été vue rouge avant que `worktree` n'entre dans `.claude/settings.json`.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const racine = path.resolve(__dirname, '..');
const script = path.join(racine, 'scripts', 'preparer-un-worktree.mjs');

const temporaires: string[] = [];
afterAll(() => temporaires.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

const ENV_GIT = {
  ...process.env,
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
};

function git(dossier: string, ...args: string[]): string {
  const r = spawnSync('git', args, { cwd: dossier, encoding: 'utf8', env: ENV_GIT });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`);
  return r.stdout.trim();
}

function commettre(dossier: string, fichier: string) {
  fs.writeFileSync(path.join(dossier, fichier), `${fichier}\n`);
  git(dossier, 'add', '-A');
  git(dossier, 'commit', '-q', '-m', fichier);
  return git(dossier, 'rev-parse', 'HEAD');
}

/**
 * La copie principale : A sur `main`, B sur `travail`, et un `node_modules`. Son `.gitignore` est
 * **celui du dépôt** : c'est lui qui doit ignorer le lien qu'une copie de travail porte, et une règle
 * recopiée ici ne garderait qu'elle-même.
 */
function depot() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-worktree-')));
  temporaires.push(dir);
  const principale = path.join(dir, 'principale');
  fs.mkdirSync(principale);
  git(principale, 'init', '-q', '-b', 'main');
  fs.copyFileSync(path.join(racine, '.gitignore'), path.join(principale, '.gitignore'));
  const a = commettre(principale, 'a.txt');
  git(principale, 'checkout', '-q', '-b', 'travail');
  const b = commettre(principale, 'b.txt');
  fs.mkdirSync(path.join(principale, 'node_modules'));
  return { dir, principale, a, b };
}

/** Une copie de travail, sur sa propre branche, partie de `depart`. */
function copie(d: ReturnType<typeof depot>, depart: string, nom = 'agent-1') {
  const chemin = path.join(d.dir, nom);
  git(d.principale, 'worktree', 'add', '-q', '-b', nom, chemin, depart);
  return chemin;
}

function preparer(dossier: string, ...args: string[]) {
  const r = spawnSync('node', [script, ...args], { cwd: dossier, encoding: 'utf8' });
  return { code: r.status, sortie: r.stdout, erreur: r.stderr };
}

describe('preparer-un-worktree', () => {
  test('avance une copie partie de main jusqu’au commit attendu, lie node_modules et crée expo-env.d.ts', () => {
    const d = depot();
    const c = copie(d, d.a);
    const r = preparer(c, d.b);
    expect(r.code).toBe(0);
    expect(git(c, 'rev-parse', 'HEAD')).toBe(d.b);
    expect(r.sortie).toContain('copie avancée');
    expect(fs.lstatSync(path.join(c, 'node_modules')).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(path.join(c, 'node_modules'))).toBe(path.join(d.principale, 'node_modules'));
    expect(fs.readFileSync(path.join(c, 'expo-env.d.ts'), 'utf8')).toBe('/// <reference types="expo/types" />\n');
  });

  test('ne touche pas une copie qui contient déjà le commit, même avec ses propres commits', () => {
    const d = depot();
    const c = copie(d, d.b);
    const propre = commettre(c, 'travail-de-l-agent.txt');
    const r = preparer(c, d.b);
    expect(r.code).toBe(0);
    expect(git(c, 'rev-parse', 'HEAD')).toBe(propre);
  });

  test('garde le lien que worktree.symlinkDirectories a posé, avance quand même, et git ne le voit pas', () => {
    // Le cas réel : Claude Code pose le lien à la création de la copie, avant le script. Avec la
    // règle `node_modules/` du `.gitignore`, git le voyait comme un fichier non suivi.
    const d = depot();
    const c = copie(d, d.a);
    fs.symlinkSync(path.join(d.principale, 'node_modules'), path.join(c, 'node_modules'), 'dir');
    const r = preparer(c, d.b);
    expect(r.code).toBe(0);
    expect(git(c, 'rev-parse', 'HEAD')).toBe(d.b);
    expect(fs.lstatSync(path.join(c, 'node_modules')).isSymbolicLink()).toBe(true);
    expect(git(c, 'status', '--porcelain')).toBe('');
  });

  test('un fichier non suivi n’empêche pas l’avance', () => {
    // Il ne gênerait l'avance que s'il devait être écrasé, et git le refuserait alors lui-même.
    const d = depot();
    const c = copie(d, d.a);
    fs.writeFileSync(path.join(c, 'brouillon.txt'), 'des notes\n');
    const r = preparer(c, d.b);
    expect(r.code).toBe(0);
    expect(git(c, 'rev-parse', 'HEAD')).toBe(d.b);
    expect(fs.readFileSync(path.join(c, 'brouillon.txt'), 'utf8')).toBe('des notes\n');
  });

  test('refuse une copie qui a divergé, sans la toucher', () => {
    const d = depot();
    const c = copie(d, d.a);
    const propre = commettre(c, 'travail-de-l-agent.txt');
    const r = preparer(c, d.b);
    expect(r.code).toBe(1);
    expect(r.erreur).toContain('a divergé');
    expect(git(c, 'rev-parse', 'HEAD')).toBe(propre);
  });

  test('refuse d’avancer par-dessus un fichier suivi modifié', () => {
    const d = depot();
    const c = copie(d, d.a);
    fs.writeFileSync(path.join(c, 'a.txt'), 'modifié\n');
    const r = preparer(c, d.b);
    expect(r.code).toBe(1);
    expect(r.erreur).toContain('fichiers suivis y sont modifiés');
    expect(git(c, 'rev-parse', 'HEAD')).toBe(d.a);
    expect(fs.readFileSync(path.join(c, 'a.txt'), 'utf8')).toBe('modifié\n');
  });

  test('refuse la copie principale', () => {
    const d = depot();
    const r = preparer(d.principale, d.b);
    expect(r.code).toBe(1);
    expect(r.erreur).toContain('copie principale');
  });

  test('refuse un commit que personne n’a créé', () => {
    const d = depot();
    const c = copie(d, d.a);
    const r = preparer(c, '0123456789abcdef0123456789abcdef01234567');
    expect(r.code).toBe(1);
    expect(r.erreur).toContain('commiter avant de lancer');
    expect(git(c, 'rev-parse', 'HEAD')).toBe(d.a);
  });

  test('sans commit attendu, rappelle l’usage', () => {
    const d = depot();
    expect(preparer(copie(d, d.b)).code).toBe(64);
  });
});

describe('.claude/settings.json', () => {
  const reglages = JSON.parse(fs.readFileSync(path.join(racine, '.claude', 'settings.json'), 'utf8'));

  test('une copie de travail part du HEAD local et y trouve node_modules', () => {
    // `fresh`, la valeur par défaut, part d'`origin/main` : les six copies des 24 et 25/09/2026 sont
    // parties de là, sans la branche de travail.
    expect(reglages.worktree?.baseRef).toBe('head');
    expect(reglages.worktree?.symlinkDirectories).toContain('node_modules');
  });
});
