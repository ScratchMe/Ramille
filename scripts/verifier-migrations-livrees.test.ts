/// <reference types="node" />
/**
 * Garde de CI qui refuse une migration livrée modifiée, supprimée ou renommée
 * (`scripts/verifier-migrations-livrees.mjs`), et son journal des retouches acceptées.
 *
 * Le script est joué comme la CI le joue — `node scripts/…` dans un dépôt — contre de vrais dépôts
 * git fabriqués dans un répertoire temporaire. Chaque dépôt porte deux migrations livrées (dans
 * `origin/main`) et une migration de branche (commise, pas livrée) : c'est la paire qui sépare
 * « livrée » de « existe », comme pour le hook d'Edit et de Write.
 *
 * Éprouvé en cassant le script, le 29/09/2026 (neuf mutations, chacune remise en place avant la
 * suivante, 20 tests) :
 * - `HEAD` comparé au lieu de la copie de travail (`git diff <base> HEAD`) → 5 tombent, tous ceux
 *   qui retouchent sans commettre — c'est la forme d'une retouche au shell pas encore commise ;
 * - la pointe de la référence au lieu de la base de fusion → 2 tombent, la migration livrée sur
 *   `main` après le départ de la branche, que la branche n'a pas, et la retouche acceptée sur
 *   `main` depuis ;
 * - `--no-renames` retiré → 1 tombe, le renommage, que git lit alors `R` et que le filtre laisse
 *   passer ;
 * - `D` retiré des statuts refusés → 3 tombent, la suppression, le renommage et la suppression
 *   qu'une modification au journal n'excuse pas ;
 * - l'empreinte ignorée (le fichier et le geste suffisent) → 1 tombe, la retouche suivante du même
 *   fichier ;
 * - le geste ignoré → 1 tombe, une modification au journal qui excuserait une suppression ;
 * - la validation du journal retirée → 3 tombent, les trois entrées mal formées ;
 * - la référence illisible qui sort en 0 → 1 tombe ;
 * - le repli sur `main` retiré → 1 tombe.
 * Ce que rien n'éprouve ici : le `fetch-depth: 0` du `checkout` en CI — le retirer fait sortir en 1
 * faute d'`origin/main`, et c'est ce qu'éprouve « ni origin/main ni main ».
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const racine = path.resolve(__dirname, '..');
const script = path.join(racine, 'scripts', 'verifier-migrations-livrees.mjs');

const LIVREE = 'supabase/migrations/20260101000000_livree.sql';
const AUTRE_LIVREE = 'supabase/migrations/20260101100000_autre_livree.sql';
const DE_BRANCHE = 'supabase/migrations/20260102000000_de_branche.sql';
const NEUVE = 'supabase/migrations/20260103000000_neuve.sql';
const JOURNAL = 'supabase/retouches-de-migrations-livrees.json';

type Resultat = { code: number | null; sortie: string; erreur: string };

/** Un dépôt git jetable, avec juste ce qu'il faut pour commettre sans configuration globale. */
class Depot {
  readonly dir: string;

  constructor() {
    this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-verifier-migrations-'));
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

  ecrire(fichier: string, contenu = `${fichier}\n`) {
    const abs = path.join(this.dir, fichier);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contenu);
  }

  commettre(message: string, fichiers: string[] = []) {
    fichiers.forEach((f) => this.ecrire(f));
    this.git('add', '-A');
    this.git('commit', '-q', '--allow-empty', '-m', message);
  }

  empreinte(fichier: string): string {
    return this.git('hash-object', '--', fichier);
  }

  journal(retouches: unknown[]) {
    this.ecrire(JOURNAL, JSON.stringify({ retouches }, null, 2));
  }

  jouer(): Resultat {
    const r = spawnSync('node', [script], { cwd: this.dir, encoding: 'utf8' });
    return { code: r.status, sortie: r.stdout, erreur: r.stderr };
  }

  supprimer() {
    fs.rmSync(this.dir, { recursive: true, force: true });
  }
}

const depots: Depot[] = [];
afterAll(() => depots.forEach((d) => d.supprimer()));

/**
 * Le dépôt type : `main` porte deux migrations livrées et un test pgTAP, `origin/main` pointe
 * dessus, et la branche de travail ajoute une migration à elle.
 */
function depotType(): Depot {
  const d = new Depot();
  depots.push(d);
  d.commettre('livré', [LIVREE, AUTRE_LIVREE, 'supabase/tests/database/01_x.test.sql']);
  d.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  d.git('checkout', '-q', '-b', 'travail');
  d.commettre('en cours', [DE_BRANCHE]);
  return d;
}

const acceptee = (fichier: string, champs: Record<string, unknown>) => ({
  fichier,
  date: '29/09/2026',
  decision: 'la personne qui pilote, le 29/09/2026',
  raison: 'pour l’essai',
  ...champs,
});

describe('la garde laisse passer ce qui n’est pas une retouche de migration livrée', () => {
  test('une branche qui n’ajoute qu’une migration à elle → 0', () => {
    const r = depotType().jouer();
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('aucune retouche hors du journal');
  });

  test('une migration de branche se retouche encore, commise ou non', () => {
    const d = depotType();
    d.ecrire(DE_BRANCHE, 'retouchée\n');
    expect(d.jouer().code).toBe(0);
    d.commettre('retouche de branche');
    expect(d.jouer().code).toBe(0);
  });

  test('une migration neuve, même pas commise → 0', () => {
    const d = depotType();
    d.ecrire(NEUVE);
    expect(d.jouer().code).toBe(0);
  });

  test('un test pgTAP livré se modifie : il n’est pas une migration', () => {
    const d = depotType();
    d.ecrire('supabase/tests/database/01_x.test.sql', 'autre\n');
    expect(d.jouer().code).toBe(0);
  });

  test('sur main même, il n’y a rien à comparer, et la garde le dit', () => {
    const d = depotType();
    d.git('checkout', '-q', 'main');
    const r = d.jouer();
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('rien à comparer');
  });

  test('une migration livrée sur main APRÈS le départ de la branche n’est pas imputée à la branche', () => {
    // La pointe de `origin/main` porte une migration que la branche n'a pas : comparée à la
    // pointe, la branche la « supprimerait ». C'est la raison de la base de fusion.
    const d = depotType();
    d.git('checkout', '-q', 'main');
    d.commettre('livrée depuis', [NEUVE]);
    d.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    d.git('checkout', '-q', 'travail');
    expect(d.jouer().code).toBe(0);
  });

  test('une retouche acceptée et livrée sur main depuis n’est pas imputée à la branche', () => {
    const d = depotType();
    d.git('checkout', '-q', 'main');
    d.ecrire(AUTRE_LIVREE, 'retouchée sur main\n');
    d.journal([acceptee(AUTRE_LIVREE, { geste: 'modifiee', empreinte: d.empreinte(AUTRE_LIVREE) })]);
    d.commettre('retouche acceptée');
    d.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    d.git('checkout', '-q', 'travail');
    expect(d.jouer().code).toBe(0);
  });
});

describe('la garde refuse une migration livrée retouchée, par n’importe quel chemin', () => {
  test('modifiée dans la copie de travail, pas encore commise → 1, avec le fichier et son empreinte', () => {
    const d = depotType();
    d.ecrire(LIVREE, 'retouchée au shell\n');
    const r = d.jouer();
    expect(r.code).toBe(1);
    expect(r.erreur).toContain(LIVREE);
    expect(r.erreur).toContain(d.empreinte(LIVREE));
    expect(r.erreur).toContain('SUPABASE.md §2.3');
  });

  test('modifiée et commise → 1', () => {
    const d = depotType();
    d.ecrire(LIVREE, 'retouchée\n');
    d.commettre('retouche');
    expect(d.jouer().code).toBe(1);
  });

  test('supprimée → 1', () => {
    const d = depotType();
    d.git('rm', '-q', LIVREE);
    d.commettre('suppression');
    const r = d.jouer();
    expect(r.code).toBe(1);
    expect(r.erreur).toContain('supprimée ou renommée');
  });

  test('renommée, même sans en changer une ligne → 1, et c’est l’ancien nom qui est nommé', () => {
    const d = depotType();
    d.git('mv', LIVREE, 'supabase/migrations/20260101000001_livree.sql');
    d.commettre('renommage');
    const r = d.jouer();
    expect(r.code).toBe(1);
    expect(r.erreur).toContain(LIVREE);
  });

  test('dans le commit de fusion qu’une PR fait tourner en CI → 1', () => {
    // Sur `pull_request`, GitHub fait tourner la CI sur la fusion de la branche dans `main` : la base
    // de fusion est alors la pointe de `main`.
    const d = depotType();
    d.ecrire(LIVREE, 'retouchée\n');
    d.commettre('retouche');
    d.git('checkout', '-q', '--detach', 'main');
    d.git('merge', '-q', '--no-ff', '-m', 'fusion', 'travail');
    expect(d.jouer().code).toBe(1);
  });
});

describe('le journal accepte une retouche, jamais un fichier', () => {
  test('une modification dont l’empreinte est au journal → 0, et la sortie la nomme', () => {
    const d = depotType();
    d.ecrire(LIVREE, 'retouchée\n');
    d.journal([acceptee(LIVREE, { geste: 'modifiee', empreinte: d.empreinte(LIVREE) })]);
    const r = d.jouer();
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('1 retouche(s) acceptée(s)');
    expect(r.sortie).toContain(LIVREE);
  });

  test('une retouche suivante du même fichier rougit de nouveau', () => {
    const d = depotType();
    d.ecrire(LIVREE, 'retouchée\n');
    d.journal([acceptee(LIVREE, { geste: 'modifiee', empreinte: d.empreinte(LIVREE) })]);
    d.ecrire(LIVREE, 'retouchée une seconde fois\n');
    expect(d.jouer().code).toBe(1);
  });

  test('une suppression au journal → 0 ; une modification au journal n’excuse pas une suppression', () => {
    const d = depotType();
    const empreinte = d.empreinte(LIVREE);
    d.git('rm', '-q', LIVREE);
    d.journal([acceptee(LIVREE, { geste: 'modifiee', empreinte })]);
    expect(d.jouer().code).toBe(1);
    d.journal([acceptee(LIVREE, { geste: 'supprimee' })]);
    expect(d.jouer().code).toBe(0);
  });

  test.each([
    ['sans décision', { geste: 'modifiee', empreinte: 'a'.repeat(40), decision: '' }, '`decision` est obligatoire'],
    ['une modification sans empreinte', { geste: 'modifiee' }, 'porte l’`empreinte`'],
    ['une date qui n’est pas JJ/MM/AAAA', { geste: 'supprimee', date: '2026-09-29' }, '`date` s’écrit JJ/MM/AAAA'],
  ])('un journal mal formé (%s) → 1, même sans retouche à excuser', (_cas, champs, message) => {
    const d = depotType();
    d.journal([acceptee(LIVREE, champs)]);
    const r = d.jouer();
    expect(r.code).toBe(1);
    expect(r.erreur).toContain(message);
  });
});

describe('ce qui est livré doit se lire', () => {
  test('ni origin/main ni main → 1, jamais 0', () => {
    const d = depotType();
    d.git('update-ref', '-d', 'refs/remotes/origin/main');
    d.git('branch', '-q', '-m', 'main', 'ailleurs');
    const r = d.jouer();
    expect(r.code).toBe(1);
    expect(r.erreur).toContain('fetch-depth: 0');
  });

  test('lit main quand origin/main manque', () => {
    const d = depotType();
    d.git('update-ref', '-d', 'refs/remotes/origin/main');
    d.ecrire(LIVREE, 'retouchée\n');
    const r = d.jouer();
    expect(r.code).toBe(1);
    expect(r.erreur).toContain('base de fusion avec main');
  });
});
