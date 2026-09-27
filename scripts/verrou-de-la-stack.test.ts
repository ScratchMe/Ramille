/// <reference types="node" />
/**
 * Garde du verrou de la stack Supabase locale (`scripts/verrou-de-la-stack.mjs`).
 *
 * Chaque prise se joue dans un processus à part, comme dans un vrai rejeu : c'est la sortie du
 * processus qui rend le verrou, et c'est la vie d'un autre processus qui le fait tenir. Rien ici ne
 * touche à Docker ni à la stack ; le verrou vit dans un répertoire temporaire.
 *
 * Éprouvé en le cassant, le 27/09/2026 (cinq mutations, chacune remise en place avant la suivante,
 * 5 tests) :
 * - la vie du propriétaire jamais vérifiée → 2 tombent : le refus, et la course, que les deux
 *   rejeux gagnent ;
 * - un orphelin jamais repris → 2 tombent ;
 * - le verrou jamais rendu à la sortie → 2 tombent ;
 * - un propriétaire illisible lu comme vivant → 1 tombe ;
 * - **un `mkdir` suivi de l'écriture du propriétaire, au lieu du renommage → rien ne tombe, en
 *   trois passages.** La fenêtre qu'il ouvre dure le temps d'une écriture, et la course du dernier
 *   test ne tombe pas dedans. Ce n'est donc pas gardé : c'est expliqué en tête du module, pour
 *   qu'on ne « simplifie » pas le renommage.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const module = path.resolve(__dirname, 'verrou-de-la-stack.mjs');

const temporaires: string[] = [];
afterAll(() => temporaires.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function unVerrou() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-verrou-'));
  temporaires.push(dir);
  return path.join(dir, 'ramille-stack.verrou');
}

/** Un processus qui prend le verrou, dit ce qu'il a obtenu, le tient `tenirMs`, puis sort. */
function programme(verrou: string, copie: string, tenirMs: number) {
  return [
    '--input-type=module',
    '-e',
    `import { prendreLeVerrou } from ${JSON.stringify(module)};
     const r = prendreLeVerrou(${JSON.stringify(verrou)}, ${JSON.stringify(copie)});
     console.log(JSON.stringify(r));
     if (r.pris) await new Promise((fin) => setTimeout(fin, ${tenirMs}));`,
  ];
}

type Prise = { pris: boolean; message: string };

function prendre(verrou: string, copie = 'copie-de-test'): Prise {
  const r = spawnSync(process.execPath, programme(verrou, copie, 0), { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

function prendreEnArrierePlan(verrou: string, copie: string, tenirMs: number): Promise<Prise> {
  return new Promise((ok, echec) => {
    const enfant = spawn(process.execPath, programme(verrou, copie, tenirMs));
    let sortie = '';
    enfant.stdout.on('data', (morceau) => (sortie += morceau));
    enfant.on('error', echec);
    enfant.on('close', () => ok(JSON.parse(sortie)));
  });
}

/** Pose à la main le verrou d'un autre rejeu. */
function tenuPar(verrou: string, contenu: string) {
  fs.mkdirSync(verrou);
  fs.writeFileSync(path.join(verrou, 'proprietaire.json'), contenu);
}

/** Le pid d'un processus qui a fini — donc d'un rejeu tué avant d'avoir rendu son verrou. */
function pidMort(): number {
  const r = spawnSync(process.execPath, ['-e', '0']);
  return r.pid as number;
}

describe('le verrou de la stack', () => {
  test('se prend quand il est libre, et se rend à la sortie du processus', () => {
    const verrou = unVerrou();
    const r = prendre(verrou);
    expect(r.pris).toBe(true);
    expect(fs.existsSync(verrou)).toBe(false);
  });

  test('refuse, en nommant le rejeu qui la tient, une stack réservée par un processus vivant', () => {
    const verrou = unVerrou();
    const autre = JSON.stringify({ pid: process.pid, racine: '/copies/agent-2', depuis: '2026-09-27T18:00:00.000Z' });
    tenuPar(verrou, autre);
    const r = prendre(verrou);
    expect(r.pris).toBe(false);
    expect(r.message).toContain('/copies/agent-2');
    expect(r.message).toContain(`pid ${process.pid}`);
    // Le refus ne touche pas au verrou de l'autre.
    expect(fs.readFileSync(path.join(verrou, 'proprietaire.json'), 'utf8')).toBe(autre);
  });

  test('reprend le verrou d’un rejeu tué, qui n’a pas pu le rendre', () => {
    const verrou = unVerrou();
    const mort = pidMort();
    tenuPar(verrou, JSON.stringify({ pid: mort, racine: '/copies/agent-2', depuis: '2026-09-27T18:00:00.000Z' }));
    const r = prendre(verrou);
    expect(r.pris).toBe(true);
    expect(r.message).toContain(`orphelin repris (pid ${mort}`);
  });

  test('reprend un verrou sans propriétaire lisible — un verrou tenu en a toujours un', () => {
    const verrou = unVerrou();
    tenuPar(verrou, 'pas du json');
    expect(prendre(verrou).pris).toBe(true);
  });

  test('ne se donne qu’à un seul de deux rejeux lancés ensemble', async () => {
    const verrou = unVerrou();
    const prises = await Promise.all([
      prendreEnArrierePlan(verrou, '/copies/agent-1', 1500),
      prendreEnArrierePlan(verrou, '/copies/agent-2', 1500),
    ]);
    expect(prises.filter((p) => p.pris)).toHaveLength(1);
    const refus = prises.find((p) => !p.pris) as Prise;
    expect(refus.message).toContain('réservée par /copies/agent-');
    expect(fs.existsSync(verrou)).toBe(false);
  });
});
