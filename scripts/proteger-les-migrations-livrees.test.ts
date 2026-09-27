/// <reference types="node" />
/**
 * Garde du hook `PreToolUse` qui refuse de modifier une migration livrée
 * (`scripts/proteger-les-migrations-livrees.mjs`), et des réglages partagés qui le déclarent
 * (`.claude/settings.json`).
 *
 * Le script est joué comme Claude Code le joue : le JSON de l'appel sur l'entrée standard, contre
 * de vrais dépôts git fabriqués dans un répertoire temporaire, et l'assertion porte sur le code de
 * sortie — **2 est la seule valeur qui bloque**. Chaque dépôt porte une migration livrée (dans
 * `origin/main`) et une migration de branche (commise, pas livrée) : c'est la paire qui sépare
 * « livrée » de « existe sur le disque », la distinction qui rend le hook vivable.
 *
 * Éprouvé en cassant le script, le 27/09/2026 (sept mutations, chacune remise en place avant la
 * suivante, 18 tests) :
 * - « livrée » lu comme « existe sur le disque » (le fichier existe, au lieu de `cat-file` sur la
 *   référence) → 4 tombent : les deux retouches pas encore livrées, celle de la copie de travail,
 *   et la migration livrée recréée après suppression ;
 * - `HEAD` à la place d'`origin/main` → 7 tombent. Celui qui compte est la migration commise sur
 *   la branche, refusée ; les autres tombent parce que le message nomme la mauvaise référence, ou
 *   parce qu'une référence se lit désormais toujours ;
 * - le contrôle depuis la racine du dépôt retiré (le filtre sur le chemin absolu seul) → 1 tombe,
 *   le dossier homonyme de `docs/` ;
 * - `cwd` ignoré (le chemin relatif résolu depuis le répertoire du processus) → 1 tombe ;
 * - la sortie 1 à la place de 2 → 8 tombent, tous ceux qui attendent un refus ;
 * - le repli sur `main` retiré → 1 tombe ;
 * - une création refusée quand aucune référence ne se lit → 1 tombe.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const racine = path.resolve(__dirname, '..');
const script = path.join(racine, 'scripts', 'proteger-les-migrations-livrees.mjs');

const LIVREE = 'supabase/migrations/20260101000000_livree.sql';
const DE_BRANCHE = 'supabase/migrations/20260102000000_de_branche.sql';
const NEUVE = 'supabase/migrations/20260103000000_neuve.sql';

type Resultat = { code: number | null; erreur: string };

/** Un dépôt git jetable, avec juste ce qu'il faut pour commettre sans configuration globale. */
class Depot {
  readonly dir: string;

  constructor(brancheInitiale = 'main') {
    this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-migrations-livrees-'));
    this.git('init', '-q', '-b', brancheInitiale);
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

  ecrire(fichier: string, contenu = `${fichier}\n`) {
    const abs = path.join(this.dir, fichier);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contenu);
  }

  commettre(message: string, fichiers: string[]) {
    fichiers.forEach((f) => this.ecrire(f));
    this.git('add', '-A');
    this.git('commit', '-q', '-m', message);
  }

  supprimer() {
    fs.rmSync(this.dir, { recursive: true, force: true });
  }
}

const depots: Depot[] = [];
afterAll(() => depots.forEach((d) => d.supprimer()));

/**
 * Le dépôt type : `main` porte la migration livrée et trois fichiers qui ne sont pas des
 * migrations, `origin/main` pointe dessus, et la branche de travail ajoute une migration à elle.
 */
function depotType(): Depot {
  const d = new Depot();
  depots.push(d);
  d.commettre('livré', [LIVREE, 'src/ecran.ts', 'supabase/tests/database/01_x.test.sql', 'docs/supabase/migrations/note.md']);
  d.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  d.git('checkout', '-q', '-b', 'travail');
  d.commettre('en cours', [DE_BRANCHE]);
  return d;
}

/** Joue le hook comme Claude Code : l'appel en JSON sur l'entrée standard. */
function jouer(appel: unknown): Resultat {
  const entree = typeof appel === 'string' ? appel : JSON.stringify(appel);
  const r = spawnSync('node', [script], { input: entree, encoding: 'utf8' });
  return { code: r.status, erreur: r.stderr };
}

const appel = (outil: string, fichier: string, cwd?: string) => ({
  tool_name: outil,
  ...(cwd === undefined ? {} : { cwd }),
  tool_input: { file_path: fichier },
});

describe('le hook refuse une migration livrée', () => {
  test.each(['Edit', 'Write', 'MultiEdit'])('%s sur une migration présente dans origin/main → 2', (outil) => {
    const d = depotType();
    const r = jouer(appel(outil, path.join(d.dir, LIVREE), d.dir));
    expect(r.code).toBe(2);
    // L'agent lit ce message à la place de sa modification : il doit nommer le fichier, la
    // référence qui a décidé, et où lire quoi faire à la place.
    expect(r.erreur).toContain(LIVREE);
    expect(r.erreur).toContain('origin/main');
    expect(r.erreur).toContain('SUPABASE.md §2.3');
  });

  test('refuse de recréer une migration livrée supprimée du disque — la livraison décide, pas le disque', () => {
    const d = depotType();
    fs.rmSync(path.join(d.dir, LIVREE));
    expect(jouer(appel('Write', path.join(d.dir, LIVREE), d.dir)).code).toBe(2);
  });

  test('résout un chemin relatif depuis le cwd de l’appel, pas depuis celui du hook', () => {
    const d = depotType();
    expect(jouer(appel('Edit', LIVREE, d.dir)).code).toBe(2);
  });

  test('couvre la copie de travail d’un sous-agent (worktree), qui partage les références', () => {
    const d = depotType();
    const copie = path.join(d.dir, '.claude', 'worktrees', 'agent-1');
    d.git('worktree', 'add', '-q', '-b', 'agent-1', copie, 'travail');
    expect(jouer(appel('Edit', path.join(copie, LIVREE), copie)).code).toBe(2);
    expect(jouer(appel('Edit', path.join(copie, DE_BRANCHE), copie)).code).toBe(0);
  });

  test('lit main quand origin/main manque', () => {
    const d = depotType();
    d.git('update-ref', '-d', 'refs/remotes/origin/main');
    const r = jouer(appel('Edit', path.join(d.dir, LIVREE), d.dir));
    expect(r.code).toBe(2);
    expect(r.erreur).toContain('présente dans main');
  });
});

describe('le hook laisse écrire ce qui n’est pas livré', () => {
  test('une migration commise sur la branche se retouche encore', () => {
    // Le cœur du critère : refuser ici aurait appris à contourner le hook par le shell.
    const d = depotType();
    const r = jouer(appel('Edit', path.join(d.dir, DE_BRANCHE), d.dir));
    expect(r).toEqual({ code: 0, erreur: '' });
  });

  test('une migration écrite mais pas encore commise se retouche', () => {
    const d = depotType();
    d.ecrire(NEUVE);
    expect(jouer(appel('Edit', path.join(d.dir, NEUVE), d.dir)).code).toBe(0);
  });

  test('une migration neuve se crée', () => {
    const d = depotType();
    expect(jouer(appel('Write', path.join(d.dir, NEUVE), d.dir)).code).toBe(0);
  });

  test.each([
    ['un écran livré', 'src/ecran.ts'],
    ['un test pgTAP livré', 'supabase/tests/database/01_x.test.sql'],
    // Le filtre sur le chemin absolu l'attrape : c'est la racine du dépôt qui le relâche.
    ['un dossier homonyme ailleurs dans le dépôt', 'docs/supabase/migrations/note.md'],
  ])('%s n’est pas une migration', (_quoi, fichier) => {
    const d = depotType();
    expect(jouer(appel('Edit', path.join(d.dir, fichier), d.dir)).code).toBe(0);
  });

  test('un appel sans chemin passe', () => {
    expect(jouer({ tool_name: 'Edit', tool_input: {} }).code).toBe(0);
  });
});

describe('le hook ne devine pas', () => {
  test('sans référence lisible, un fichier existant est refusé et une création passe', () => {
    const d = new Depot('tronc');
    depots.push(d);
    d.commettre('ailleurs', [LIVREE]);
    const r = jouer(appel('Edit', path.join(d.dir, LIVREE), d.dir));
    expect(r.code).toBe(2);
    expect(r.erreur).toContain('impossible de savoir');
    expect(r.erreur).toContain('git fetch origin main');
    expect(jouer(appel('Write', path.join(d.dir, NEUVE), d.dir)).code).toBe(0);
  });

  test('une entrée illisible laisse passer l’outil, et le dit', () => {
    // Un hook cassé ne doit pas bloquer toute écriture du dépôt ; il ne doit pas non plus se taire.
    const r = jouer('pas du json');
    expect(r.code).toBe(1);
    expect(r.erreur).toContain('entrée illisible');
  });
});

describe('.claude/settings.json', () => {
  // Un fichier de réglages invalide est ignoré EN ENTIER, sans message : le hook et les
  // permissions tomberaient ensemble, en silence. Même raisonnement que la garde de `vercel.json`.
  const reglages = JSON.parse(fs.readFileSync(path.join(racine, '.claude', 'settings.json'), 'utf8'));

  test('déclare le hook sur Edit, Write et MultiEdit, et le script existe', () => {
    const commandes = (reglages.hooks?.PreToolUse ?? [])
      .filter((h: { matcher?: string }) => ['Edit', 'Write', 'MultiEdit'].every((o) => (h.matcher ?? '').split('|').includes(o)))
      .flatMap((h: { hooks: { type: string; command: string }[] }) => h.hooks)
      .filter((h: { type: string }) => h.type === 'command')
      .map((h: { command: string }) => h.command);
    expect(commandes).toEqual(['node "$CLAUDE_PROJECT_DIR/scripts/proteger-les-migrations-livrees.mjs"']);
    expect(fs.existsSync(script)).toBe(true);
  });

  test('n’accorde aucun outil Supabase en bloc', () => {
    // Le 27/09/2026, `mcp__Supabase` et `mcp__Supabase__*` laissaient passer sans confirmation
    // tout outil du serveur sur le projet de production — `pause_project`, `restore_project`,
    // `create_project` compris. Chaque outil accordé se nomme.
    const accordes: string[] = reglages.permissions?.allow ?? [];
    expect(accordes.filter((p) => p === 'mcp__Supabase' || p.endsWith('*'))).toEqual([]);
  });
});
