/// <reference types="node" />
/**
 * Garde de `scripts/installer-un-plugin.mjs`, joué sur de vrais plug-ins fabriqués dans un
 * répertoire temporaire, contre un faux dépôt tout aussi temporaire : le vrai n'est jamais touché.
 *
 * Ce qui est éprouvé, c'est chacune des trois règles de l'en-tête du script — le préfixe avec ses
 * renvois et ses liens, ce qui ne s'installe jamais, et « rien n'est écrit avant que tout soit
 * vérifié » —, plus la mise à jour, qui est la seule façon d'installer deux fois le même plug-in
 * sans que ce soit une collision.
 *
 * Non-vacuité, mesurée le 24/09/2026 en cassant le script quatorze fois (chaque mutation remise en
 * place depuis une copie avant la suivante) : ne plus réécrire le champ `name` fait tomber 1 test
 * (le nominal) ; ne plus réécrire les renvois, 1 (les renvois) ; ne plus marquer un fichier modifié,
 * 2 (le nominal et les renvois) ; ne plus signaler un nom d'amont resté tel quel, 1 (les renvois) ;
 * ne plus recalculer les liens, 1 (les liens) ; ne plus signaler un lien mort, 1 (les liens) ;
 * recalculer un lien vers un fichier absent en amont, 1 (les liens) ; ne plus chercher les
 * collisions, 1 (la collision) ; les chercher au fil de l'écriture plutôt qu'avant, 1 (la collision,
 * par le skill posé avant le refus) ; ne plus retirer ce que la version précédente avait posé, 1 (la
 * mise à jour) ; compter ce qu'elle avait posé comme une collision, 1 (la mise à jour) ; accepter
 * des hooks dans un en-tête, 2 (le skill et la commande) ; accepter un lien symbolique, 1 ; extraire
 * sans lire d'abord la liste des entrées, 1 (l'évasion). Aucune mutation ne passe.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const script = path.join(__dirname, 'installer-un-plugin.mjs');

const temporaires: string[] = [];
const temporaire = (prefixe: string) => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), prefixe));
  temporaires.push(dossier);
  return dossier;
};
afterAll(() => temporaires.forEach((dossier) => fs.rmSync(dossier, { recursive: true, force: true })));

/** Un plug-in fabriqué : chaque clé est un chemin relatif à sa racine, chaque valeur son contenu. */
function plugin(fichiers: Record<string, string>): string {
  const racine = temporaire('ramille-plugin-');
  for (const [relatif, contenu] of Object.entries(fichiers)) {
    const chemin = path.join(racine, relatif);
    fs.mkdirSync(path.dirname(chemin), { recursive: true });
    fs.writeFileSync(chemin, contenu);
  }
  return racine;
}

const manifeste = (version = '1.0.0') => JSON.stringify({ name: 'outil', version });
const skill = (nom: string, enTeteEnPlus = '') =>
  `---\nname: ${nom}\ndescription: Le skill ${nom}.\n${enTeteEnPlus}---\n\nConsignes de ${nom}.\n`;

function installer(source: string, depot: string) {
  const r = spawnSync(process.execPath, [script, source, '--racine', depot], { encoding: 'utf8' });
  return { code: r.status, sortie: `${r.stdout}${r.stderr}` };
}

const lire = (depot: string, relatif: string) => fs.readFileSync(path.join(depot, relatif), 'utf8');
const existe = (depot: string, relatif: string) => fs.existsSync(path.join(depot, relatif));
const installation = (depot: string) => JSON.parse(lire(depot, '.claude/plugins-importes/outil/installation.json'));

describe('installer un plug-in', () => {
  test('pose skills et commandes sous le nom du plug-in, dossier et en-tête compris', () => {
    const depot = temporaire('ramille-depot-');
    const r = installer(
      plugin({
        '.claude-plugin/plugin.json': manifeste('1.2.0'),
        'skills/ecrire/SKILL.md': skill('ecrire'),
        'skills/ecrire/references/guide.md': 'Un guide.\n',
        'commands/idee.md': '---\ndescription: Une idée.\n---\nTrouve une idée.\n',
        LICENSE: 'Licence.\n',
        'README.md': 'Lisez-moi.\n',
      }),
      depot,
    );

    expect(r.code).toBe(0);
    const consignes = lire(depot, '.claude/skills/outil-ecrire/SKILL.md');
    expect(consignes).toMatch(/^---\nname: outil-ecrire\ndescription: Le skill ecrire\.\n---\n/);
    expect(consignes).toContain('Modifié pour Ramille');
    expect(lire(depot, '.claude/skills/outil-ecrire/references/guide.md')).toBe('Un guide.\n');
    expect(existe(depot, '.claude/skills/ecrire')).toBe(false);
    expect(lire(depot, '.claude/commands/outil-idee.md')).toContain('Trouve une idée.');
    expect(installation(depot)).toMatchObject({
      plugin: 'outil',
      version: '1.2.0',
      sha256: null,
      skills: [{ amont: 'ecrire', installe: 'outil-ecrire' }],
      commandes: [{ amont: 'idee', installe: 'outil-idee' }],
    });
    // La licence voyage avec le plug-in ; le README d'amont non, il cite les noms d'avant le préfixe.
    expect(lire(depot, '.claude/plugins-importes/outil/LICENSE')).toBe('Licence.\n');
    expect(existe(depot, '.claude/plugins-importes/outil/README.md')).toBe(false);
  });

  test('réécrit les renvois aux noms d’amont, et laisse les chemins tels quels en le signalant', () => {
    const depot = temporaire('ramille-depot-');
    const r = installer(
      plugin({
        '.claude-plugin/plugin.json': manifeste(),
        'skills/ecrire/SKILL.md': skill('ecrire'),
        'commands/idee.md':
          '---\ndescription: Une idée.\n---\n# /idee\n\nEnsuite → `/ecrire`, ou outil:ecrire.\n' +
          'Voir skills/ecrire/SKILL.md, et /ecrire-bis qui n’est pas à nous.\n',
      }),
      depot,
    );

    expect(r.code).toBe(0);
    const commande = lire(depot, '.claude/commands/outil-idee.md');
    expect(commande).toContain('# /outil-idee\n');
    expect(commande).toContain('Ensuite → `/outil-ecrire`, ou outil-ecrire.\n');
    expect(commande).toContain('Voir skills/ecrire/SKILL.md, et /ecrire-bis qui n’est pas à nous.\n');
    expect(commande).toContain('Modifié pour Ramille');
    expect(r.sortie).toMatch(/outil-idee\.md:7 \(nom d’amont resté tel quel\)/);
  });

  test('recalcule les liens relatifs pour la nouvelle place des fichiers, et signale les morts', () => {
    const depot = temporaire('ramille-depot-');
    const r = installer(
      plugin({
        '.claude-plugin/plugin.json': manifeste(),
        'CONNECTORS.md': '# Connecteurs\n',
        'skills/ecrire/SKILL.md':
          skill('ecrire') +
          'Voir [les connecteurs](../../CONNECTORS.md#categories), [lire](../lire/SKILL.md), ' +
          '[le guide](references/guide.md), [le site](https://exemple.invalid/x), [les hooks](../../hooks/hooks.json) ' +
          'et [l’absent](../lire/ABSENT.md).\n',
        'skills/ecrire/references/guide.md': 'Un guide.\n',
        'skills/lire/SKILL.md': skill('lire'),
        'commands/idee.md': '---\ndescription: Une idée.\n---\nVoir [les connecteurs](../CONNECTORS.md).\n',
        'hooks/hooks.json': '{}',
      }),
      depot,
    );

    expect(r.code).toBe(0);
    const consignes = lire(depot, '.claude/skills/outil-ecrire/SKILL.md');
    expect(consignes).toContain('[les connecteurs](../../plugins-importes/outil/CONNECTORS.md#categories)');
    expect(consignes).toContain('[lire](../outil-lire/SKILL.md)');
    expect(consignes).toContain('[le guide](references/guide.md)');
    expect(consignes).toContain('[le site](https://exemple.invalid/x)');
    expect(consignes).toContain('[les hooks](../../hooks/hooks.json)');
    // Un fichier absent en amont n'est pas « recalculé » : réécrit, il aurait l'air vivant.
    expect(consignes).toContain('[l’absent](../lire/ABSENT.md)');
    expect(lire(depot, '.claude/commands/outil-idee.md')).toContain('[les connecteurs](../plugins-importes/outil/CONNECTORS.md)');
    // Un lien recalculé ne vaut que s'il mène quelque part : chacun est résolu depuis sa nouvelle place.
    for (const [depuis, lien] of [
      ['.claude/skills/outil-ecrire', '../../plugins-importes/outil/CONNECTORS.md'],
      ['.claude/skills/outil-ecrire', '../outil-lire/SKILL.md'],
      ['.claude/skills/outil-ecrire', 'references/guide.md'],
      ['.claude/commands', '../plugins-importes/outil/CONNECTORS.md'],
    ]) {
      expect(existe(depot, path.join(depuis, lien))).toBe(true);
    }
    expect(r.sortie).toContain('(lien vers un fichier qui ne s’installe pas) — ../../hooks/hooks.json');
    expect(r.sortie).toContain('(lien vers un fichier qui ne s’installe pas) — ../lire/ABSENT.md');
  });

  test('ne pose jamais un hook, un connecteur ni un agent — et le dit', () => {
    const depot = temporaire('ramille-depot-');
    const r = installer(
      plugin({
        '.claude-plugin/plugin.json': manifeste(),
        'skills/ecrire/SKILL.md': skill('ecrire'),
        'hooks/hooks.json': '{"hooks":{}}',
        '.mcp.json': JSON.stringify({ mcpServers: { slack: {}, linear: {} } }),
        'agents/relecteur.md': '---\nname: relecteur\n---\n',
      }),
      depot,
    );

    expect(r.code).toBe(0);
    for (const chemin of ['.claude/settings.json', '.claude/hooks', '.claude/agents', '.mcp.json']) {
      expect(existe(depot, chemin)).toBe(false);
    }
    expect(installation(depot).non_installe).toEqual({
      hooks: ['hooks/hooks.json'],
      connecteurs: ['linear', 'slack'],
      agents: ['relecteur'],
      autres: [],
    });
    expect(r.sortie).toContain('linear, slack');
    expect(r.sortie).toContain('relecteur');
  });

  test.each([
    ['un skill', { 'skills/ecrire/SKILL.md': skill('ecrire', 'hooks:\n  Stop:\n    - command: echo\n') }],
    ['une commande', { 'skills/ecrire/SKILL.md': skill('ecrire'), 'commands/idee.md': '---\nhooks: {}\n---\n' }],
  ])('refuse %s qui déclare des hooks dans son en-tête', (_, fichiers) => {
    const depot = temporaire('ramille-depot-');
    const r = installer(plugin({ '.claude-plugin/plugin.json': manifeste(), ...fichiers }), depot);

    expect(r.code).toBe(1);
    expect(r.sortie).toContain('déclare des hooks');
    expect(existe(depot, '.claude')).toBe(false);
  });

  test("refuse une collision, et n'écrit alors rien du tout", () => {
    // La collision porte sur le SECOND skill dans l'ordre d'écriture : un script qui vérifierait
    // au fil de l'eau aurait déjà posé le premier, et c'est ce qu'on veut voir tomber.
    const depot = temporaire('ramille-depot-');
    fs.mkdirSync(path.join(depot, '.claude/skills/outil-lire'), { recursive: true });
    fs.writeFileSync(path.join(depot, '.claude/skills/outil-lire/SKILL.md'), 'à nous\n');

    const r = installer(
      plugin({
        '.claude-plugin/plugin.json': manifeste(),
        'skills/ecrire/SKILL.md': skill('ecrire'),
        'skills/lire/SKILL.md': skill('lire'),
      }),
      depot,
    );

    expect(r.code).toBe(1);
    expect(r.sortie).toContain('.claude/skills/outil-lire');
    expect(lire(depot, '.claude/skills/outil-lire/SKILL.md')).toBe('à nous\n');
    expect(existe(depot, '.claude/skills/outil-ecrire')).toBe(false);
    expect(existe(depot, '.claude/plugins-importes')).toBe(false);
  });

  test('une mise à jour remplace ce que la version précédente avait posé, et retire ce qui a disparu', () => {
    const depot = temporaire('ramille-depot-');
    installer(
      plugin({
        '.claude-plugin/plugin.json': manifeste('1.0.0'),
        'skills/ecrire/SKILL.md': skill('ecrire'),
        'skills/lire/SKILL.md': skill('lire'),
      }),
      depot,
    );

    const r = installer(
      plugin({
        '.claude-plugin/plugin.json': manifeste('2.0.0'),
        'skills/ecrire/SKILL.md': skill('ecrire', 'argument-hint: "<sujet>"\n'),
        'skills/compter/SKILL.md': skill('compter'),
      }),
      depot,
    );

    expect(r.code).toBe(0);
    expect(r.sortie).toContain('Remplace la version 1.0.0');
    expect(existe(depot, '.claude/skills/outil-lire')).toBe(false);
    expect(existe(depot, '.claude/skills/outil-compter/SKILL.md')).toBe(true);
    expect(lire(depot, '.claude/skills/outil-ecrire/SKILL.md')).toContain('argument-hint');
    expect(installation(depot).version).toBe('2.0.0');
  });

  test('refuse un lien symbolique, qui pourrait désigner n’importe quel fichier de la machine', () => {
    const depot = temporaire('ramille-depot-');
    const source = plugin({ '.claude-plugin/plugin.json': manifeste(), 'skills/ecrire/SKILL.md': skill('ecrire') });
    fs.symlinkSync(os.homedir(), path.join(source, 'skills/ecrire/maison'));

    const r = installer(source, depot);

    expect(r.code).toBe(1);
    expect(r.sortie).toContain('lien symbolique');
    expect(existe(depot, '.claude')).toBe(false);
  });

  test("lit une archive .zip enveloppée dans un dossier, et garde son empreinte", () => {
    const source = plugin({
      'outil/.claude-plugin/plugin.json': manifeste(),
      'outil/skills/ecrire/SKILL.md': skill('ecrire'),
    });
    const archive = path.join(temporaire('ramille-zip-'), 'outil.zip');
    // Sans `zip`, ce test tombe au lieu de se sauter : un test sauté se lit « vert ».
    expect(spawnSync('zip', ['-qr', archive, '.'], { cwd: source }).status).toBe(0);
    const depot = temporaire('ramille-depot-');

    const r = installer(archive, depot);

    expect(r.code).toBe(0);
    expect(existe(depot, '.claude/skills/outil-ecrire/SKILL.md')).toBe(true);
    expect(installation(depot)).toMatchObject({ source: 'outil.zip', sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });

  test('refuse une archive qui essaierait d’écrire hors de son dossier', () => {
    // `unzip` poserait l'entrée DANS le dossier sans rien dire (mesuré, cf. le script) : c'est
    // justement ce qu'on vérifie ici, que le refus ne dépend pas de ce comportement-là.
    const archive = path.join(temporaire('ramille-zip-'), 'evasion.zip');
    const fabrique = [
      'import sys, zipfile',
      "with zipfile.ZipFile(sys.argv[1], 'w') as z:",
      '    z.writestr(".claude-plugin/plugin.json", \'{"name": "outil"}\')',
      '    z.writestr("skills/ecrire/SKILL.md", "---\\nname: ecrire\\n---\\n")',
      '    z.writestr("../evasion.md", "hors du dossier")',
    ].join('\n');
    // Python écrit le nom tel qu'on le lui donne. Sans lui, ce test tombe au lieu de se sauter.
    expect(spawnSync('python3', ['-c', fabrique, archive]).status).toBe(0);
    const depot = temporaire('ramille-depot-');

    const r = installer(archive, depot);

    expect(r.code).toBe(1);
    expect(r.sortie).toContain('hors de son dossier : ../evasion.md');
    expect(existe(depot, '.claude')).toBe(false);
  });

  test.each([
    ['ce qui n’est pas un plug-in', { 'skills/ecrire/SKILL.md': skill('ecrire') }, 'ce n’est pas un plug-in'],
    [
      'un nom de plug-in invalide',
      { '.claude-plugin/plugin.json': JSON.stringify({ name: 'Outil Majuscule' }), 'skills/ecrire/SKILL.md': skill('ecrire') },
      'pas un nom de plug-in valide',
    ],
    [
      'un plug-in sans rien d’installable',
      { '.claude-plugin/plugin.json': manifeste(), 'hooks/hooks.json': '{}' },
      'ni skill ni commande',
    ],
    [
      'un skill et une commande qui porteraient le même nom',
      { '.claude-plugin/plugin.json': manifeste(), 'skills/idee/SKILL.md': skill('idee'), 'commands/idee.md': '---\n---\n' },
      'porteraient le même nom',
    ],
    [
      'un skill sans en-tête',
      { '.claude-plugin/plugin.json': manifeste(), 'skills/ecrire/SKILL.md': 'Pas d’en-tête.\n' },
      'n’a pas d’en-tête',
    ],
  ])('refuse %s, sans rien écrire', (_, fichiers, motif) => {
    const depot = temporaire('ramille-depot-');
    const r = installer(plugin(fichiers), depot);

    expect(r.code).toBe(1);
    expect(r.sortie).toContain(motif);
    expect(existe(depot, '.claude')).toBe(false);
  });
});
