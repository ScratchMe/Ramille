/// <reference types="node" />
/**
 * Garde de `scripts/installer-un-plugin.mjs`, joué sur de vrais plug-ins fabriqués dans un
 * répertoire temporaire, contre un faux dépôt tout aussi temporaire : le vrai n'est jamais touché.
 *
 * Ce qui est éprouvé, c'est chacune des trois règles de l'en-tête du script — le préfixe avec ses
 * renvois et ses liens, ce qui ne s'installe jamais, et « rien n'est écrit avant que tout soit
 * vérifié » —, plus ce qui dure d'une installation à la suivante : la mise à jour, qui est la seule
 * façon d'installer deux fois le même plug-in sans que ce soit une collision, le préfixe, le mode
 * `--manuel` et la licence fournie la première fois, et `--retirer`, qui défait exactement ce
 * qu'une installation a posé.
 *
 * Non-vacuité, mesurée le 24/09/2026 en cassant le script quarante-quatre fois (chaque mutation
 * remise en place depuis une copie avant la suivante), les tests tombés entre parenthèses :
 *   - le préfixe : ne plus réécrire le champ `name`, 1 (le nominal) ; le redoubler sur un nom qui le
 *     porte déjà, 2 (le préfixe porté, le préfixe court) ; oublier celui de la dernière
 *     installation, 1 (le préfixe court) ; ignorer les chemins que le manifeste déclare, 1 ; en
 *     accepter un qui sort du plug-in, 1 (les deux : les chemins déclarés) ;
 *   - les renvois et les liens : ne plus réécrire les renvois, 2 (les renvois, le préfixe porté) ;
 *     ne plus marquer un fichier modifié, 2 (le nominal, les renvois) ; ne plus signaler un nom
 *     d'amont resté tel quel, le chercher sans frontière avant — « lire/ecrire » est de la prose —,
 *     ne plus le chercher comme segment de chemin, 1 chacune ; prendre pour un renvoi toute forme
 *     `plugin:` — une coordonnée Gradle d'Auth0 en est une —, 1 (ces quatre : les renvois) ; lire
 *     l'avis ajouté comme une consigne, 1 (le préfixe court) ; ne plus recalculer les liens, 1 ; ne
 *     plus signaler un lien mort, 1 ; recalculer un lien vers un fichier absent en amont, 1 (ces
 *     trois : les liens) ;
 *   - ce qui ne s'installe pas : accepter des hooks dans un en-tête, 2 (le skill, la commande) ;
 *     nommer `AGENT` un agent rangé dans son dossier, 1 ; signaler les fichiers d'un dépôt d'amont,
 *     1 (les deux : les hooks) ;
 *   - avant d'écrire : ne plus chercher les collisions, 1 ; les chercher au fil de l'écriture, 1 (les
 *     deux : la collision, la seconde par le skill posé avant le refus) ; accepter un lien
 *     symbolique, 1 ; extraire sans lire d'abord la liste des entrées, 1 (l'évasion) ; exiger un
 *     en-tête d'une commande, 1 (le préfixe porté) ;
 *   - d'une installation à l'autre : ne plus retirer ce que la version précédente avait posé, 1 (la
 *     mise à jour) ; compter ce qu'elle avait posé comme une collision, 4 (la mise à jour, le préfixe
 *     court, le mode manuel, la licence reprise) ; ne plus poser l'appel manuel, 1 ; oublier le mode
 *     de la dernière installation, 1 ; laisser inatteignable en manuel un skill réservé à l'agent, 1 ;
 *     le rendre à la personne même en automatique, 1 ; ne plus le dire, 1 (ces cinq : le mode manuel) ;
 *   - la licence : ne plus écrire celle qu'on fournit, ne plus la reprendre à la mise à jour, 1
 *     chacune (la licence reprise) ; ne plus signaler un plug-in qui n'en a pas, en accepter une en
 *     plus de celle de l'archive, 1 chacune (le plug-in sans licence) ;
 *   - le compte rendu : lister chaque donnée comme un script à lire, 1 (les données) ;
 *   - le retrait : retirer tout ce qui porte le préfixe au lieu de la liste, ne plus retirer les
 *     commandes, ne plus retirer la provenance, 1 chacune (le retrait nominal) ; ne plus revalider les
 *     noms relus dans `installation.json`, les valider au fil du retrait plutôt qu'avant, 1 chacune
 *     (le nom piégé) ; ne plus valider le nom passé à `--retirer`, 1 (le nom invalide) ; retirer en
 *     silence un plug-in absent, 1 (le plug-in absent) ; accepter `--retirer` à côté d'une archive
 *     ou d'un mode, puis d'une licence, 1 chacune (les commandes mêlées).
 * Aucune mutation ne passe.
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

function lancer(...args: string[]) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { code: r.status, sortie: `${r.stdout}${r.stderr}` };
}
const installer = (source: string, depot: string, ...options: string[]) => lancer(source, '--racine', depot, ...options);
const retirer = (nom: string, depot: string, ...options: string[]) => lancer('--retirer', nom, '--racine', depot, ...options);

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
          'Voir skills/ecrire/SKILL.md, et /ecrire-bis qui n’est pas à nous.\n' +
          // Une coordonnée à la Gradle, où le nom du plug-in précède « : » sans désigner un skill.
          'La bibliothèque `com.outil:outil:1.0`.\n' +
          // De la prose : le nom d'amont collé à un mot n'est ni un renvoi ni un chemin.
          'Tu peux lire/ecrire à ta guise.\n',
      }),
      depot,
    );

    expect(r.code).toBe(0);
    const commande = lire(depot, '.claude/commands/outil-idee.md');
    expect(commande).toContain('# /outil-idee\n');
    expect(commande).toContain('Ensuite → `/outil-ecrire`, ou outil-ecrire.\n');
    expect(commande).toContain('Voir skills/ecrire/SKILL.md, et /ecrire-bis qui n’est pas à nous.\n');
    expect(commande).toContain('Tu peux lire/ecrire à ta guise.\n');
    expect(commande).toContain('Modifié pour Ramille');
    expect(r.sortie).toMatch(/outil-idee\.md:7 \(nom d’amont resté tel quel\)/);
    expect(r.sortie).not.toContain('outil-idee.md:8');
    expect(r.sortie).not.toContain('outil-idee.md:9');
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
        // La seconde forme d'un agent : un dossier à son nom, et `AGENT.md` dedans.
        'agents/auditeur/AGENT.md': '---\nname: auditeur\n---\n',
        // Ce qu'un dépôt d'amont et les autres agents posent à la racine : ni installé, ni signalé.
        '.github/workflows/ci.yml': 'on: push\n',
        'CONTRIBUTING.md': 'Contribuer.\n',
        '.cursor-plugin/plugin.json': '{}',
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
      agents: ['auditeur', 'relecteur'],
      autres: [],
    });
    expect(r.sortie).toContain('linear, slack');
    expect(r.sortie).toContain('auditeur, relecteur');
  });

  test('ne redouble pas un préfixe déjà porté, et ne prend pas l’avis ajouté pour un renvoi', () => {
    const depot = temporaire('ramille-depot-');
    const r = installer(
      plugin({
        '.claude-plugin/plugin.json': manifeste(),
        // Un skill au nom du plug-in, qui renvoie à une commande : il est modifié, donc marqué — et
        // l'avis nomme `.claude/plugins-importes/outil/`, où l'on lit « /outil ».
        'skills/outil/SKILL.md': skill('outil') + 'Ensuite, /idee.\n',
        'skills/outil-lire/SKILL.md': skill('outil-lire'),
        'commands/idee.md': 'Une commande sans en-tête : son nom est celui du fichier.\n',
      }),
      depot,
    );

    expect(r.code).toBe(0);
    expect(existe(depot, '.claude/skills/outil/SKILL.md')).toBe(true);
    expect(existe(depot, '.claude/skills/outil-lire/SKILL.md')).toBe(true);
    expect(existe(depot, '.claude/skills/outil-outil-lire')).toBe(false);
    expect(lire(depot, '.claude/skills/outil/SKILL.md')).toContain('Ensuite, /outil-idee.');
    expect(r.sortie).not.toContain('nom d’amont resté tel quel');
  });

  test('prend un préfixe plus court, et une mise à jour le reprend sans qu’on le redise', () => {
    const depot = temporaire('ramille-depot-');
    const source = () =>
      plugin({
        '.claude-plugin/plugin.json': JSON.stringify({ name: 'outil-au-nom-bien-trop-long', version: '1.0.0' }),
        'skills/court-ecrire/SKILL.md': skill('court-ecrire'),
        'skills/lire/SKILL.md': skill('lire'),
        // Un skill au nom du plug-in, renommé par le préfixe : l'avis ajouté à son en-tête nomme
        // `.claude/plugins-importes/outil-au-nom-bien-trop-long/`, où l'on lit son nom d'amont.
        'skills/outil-au-nom-bien-trop-long/SKILL.md': skill('outil-au-nom-bien-trop-long'),
      });

    expect(installer(source(), depot, '--prefixe', 'court').code).toBe(0);
    const r = installer(source(), depot);

    expect(r.code).toBe(0);
    expect(existe(depot, '.claude/skills/court-ecrire/SKILL.md')).toBe(true);
    expect(existe(depot, '.claude/skills/court-lire/SKILL.md')).toBe(true);
    expect(existe(depot, '.claude/skills/court-outil-au-nom-bien-trop-long/SKILL.md')).toBe(true);
    expect(existe(depot, '.claude/skills/outil-au-nom-bien-trop-long-lire')).toBe(false);
    expect(r.sortie).not.toContain('nom d’amont resté tel quel');
    // La provenance reste rangée sous le nom du plug-in, pas sous le préfixe.
    const suivi = JSON.parse(lire(depot, '.claude/plugins-importes/outil-au-nom-bien-trop-long/installation.json'));
    expect(suivi).toMatchObject({ plugin: 'outil-au-nom-bien-trop-long', prefixe: 'court' });
  });

  test('lit les skills qu’un manifeste range ailleurs, et refuse un chemin qui sort du plug-in', () => {
    const depot = temporaire('ramille-depot-');
    const r = installer(
      plugin({
        '.claude-plugin/plugin.json': JSON.stringify({ name: 'outil', skills: './.claude/skills/' }),
        '.claude/skills/ecrire/SKILL.md': skill('ecrire'),
      }),
      depot,
    );
    expect(r.code).toBe(0);
    expect(existe(depot, '.claude/skills/outil-ecrire/SKILL.md')).toBe(true);
    expect(installation(depot).non_installe.autres).toEqual([]);

    const dehors = installer(
      plugin({
        '.claude-plugin/plugin.json': JSON.stringify({ name: 'outil', skills: '../ailleurs' }),
        'skills/ecrire/SKILL.md': skill('ecrire'),
      }),
      temporaire('ramille-depot-'),
    );
    expect(dehors.code).toBe(1);
    expect(dehors.sortie).toContain('sort du plug-in');
  });

  test('en --manuel, rien ne se déclenche seul, et une mise à jour garde ce mode', () => {
    const depot = temporaire('ramille-depot-');
    const source = () =>
      plugin({
        '.claude-plugin/plugin.json': manifeste(),
        'skills/ecrire/SKILL.md': skill('ecrire'),
        // Réservé à l'agent en amont : en manuel, plus personne ne pourrait l'appeler.
        'skills/fond/SKILL.md': skill('fond', 'user-invocable: false\n'),
        'commands/idee.md': '---\ndescription: Une idée.\n---\nTrouve une idée.\n',
      });

    expect(installer(source(), depot, '--manuel').code).toBe(0);
    const r = installer(source(), depot);
    expect(r.code).toBe(0);

    expect(lire(depot, '.claude/skills/outil-ecrire/SKILL.md')).toMatch(/\ndisable-model-invocation: true\n---\n/);
    expect(lire(depot, '.claude/commands/outil-idee.md')).toMatch(/\ndisable-model-invocation: true\n---\n/);
    expect(lire(depot, '.claude/skills/outil-fond/SKILL.md')).toMatch(/\nuser-invocable: true\n/);
    expect(lire(depot, '.claude/skills/outil-ecrire/SKILL.md')).not.toMatch(/^user-invocable:/m);
    expect(r.sortie).toContain('rendus appelables par leur nom : /outil-fond.');
    expect(installation(depot).manuel).toBe(true);

    expect(installer(source(), depot, '--auto').code).toBe(0);
    expect(lire(depot, '.claude/skills/outil-ecrire/SKILL.md')).not.toContain('disable-model-invocation');
    expect(lire(depot, '.claude/skills/outil-fond/SKILL.md')).toMatch(/\nuser-invocable: false\n/);
    expect(installation(depot).manuel).toBe(false);
  });

  test('joint la licence fournie quand l’archive n’en porte pas, et la reprend à chaque mise à jour', () => {
    const depot = temporaire('ramille-depot-');
    const texte = path.join(temporaire('ramille-licence-'), 'LICENSE');
    fs.writeFileSync(texte, 'Apache License, Version 2.0\n');
    const source = () => plugin({ '.claude-plugin/plugin.json': manifeste(), 'skills/ecrire/SKILL.md': skill('ecrire') });

    const r = installer(source(), depot, '--licence', texte);
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('Licence : fournie à l’installation');
    expect(installation(depot).licence_fournie).toEqual({ fichier: 'LICENSE', sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });

    // La mise à jour efface la provenance avant de la reposer : sans reprise, la licence partirait.
    expect(installer(source(), depot).code).toBe(0);
    expect(lire(depot, '.claude/plugins-importes/outil/LICENSE')).toBe('Apache License, Version 2.0\n');
    expect(installation(depot).licence_fournie).toBeDefined();
  });

  test('signale un plug-in sans licence, et refuse d’en ajouter une à une archive qui a la sienne', () => {
    const sans = installer(
      plugin({ '.claude-plugin/plugin.json': manifeste(), 'skills/ecrire/SKILL.md': skill('ecrire') }),
      temporaire('ramille-depot-'),
    );
    expect(sans.code).toBe(0);
    expect(sans.sortie).toContain('Aucune licence : l’archive n’en porte pas');

    const texte = path.join(temporaire('ramille-licence-'), 'LICENSE');
    fs.writeFileSync(texte, 'Une autre licence.\n');
    const depot = temporaire('ramille-depot-');
    const avec = installer(
      plugin({ '.claude-plugin/plugin.json': manifeste(), 'skills/ecrire/SKILL.md': skill('ecrire'), LICENSE: 'La sienne.\n' }),
      depot,
      '--licence',
      texte,
    );
    expect(avec.code).toBe(1);
    expect(avec.sortie).toContain('l’archive porte déjà sa licence');
    expect(existe(depot, '.claude')).toBe(false);
  });

  test('liste un par un les scripts à lire, et compte les données', () => {
    const depot = temporaire('ramille-depot-');
    const r = installer(
      plugin({
        '.claude-plugin/plugin.json': manifeste(),
        'skills/ecrire/SKILL.md': skill('ecrire'),
        'skills/ecrire/scripts/cherche.py': 'print("cherche")\n',
        'skills/ecrire/data/styles.csv': 'nom\n',
        'skills/ecrire/data/couleurs.csv': 'nom\n',
        'skills/ecrire/polices/sans.ttf': 'police',
      }),
      depot,
    );

    expect(r.code).toBe(0);
    expect(r.sortie).toContain('.claude/skills/outil-ecrire/scripts/cherche.py — script ou binaire : lire ce qu’il fait');
    expect(r.sortie).toContain('données, copiées telles quelles : 2 × .csv, 1 × .ttf');
    expect(r.sortie).not.toContain('styles.csv');
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

describe('retirer un plug-in', () => {
  const source = () =>
    plugin({
      '.claude-plugin/plugin.json': manifeste(),
      'skills/ecrire/SKILL.md': skill('ecrire'),
      'skills/lire/SKILL.md': skill('lire'),
      'commands/idee.md': '---\ndescription: Une idée.\n---\nTrouve une idée.\n',
      LICENSE: 'Licence.\n',
    });

  test('retire ce que l’installation a posé, et rien de ce qui lui ressemble', () => {
    const depot = temporaire('ramille-depot-');
    expect(installer(source(), depot).code).toBe(0);
    // Écrits ici sous le préfixe du plug-in : seul `installation.json` les distingue des siens.
    fs.mkdirSync(path.join(depot, '.claude/skills/outil-maison'));
    fs.writeFileSync(path.join(depot, '.claude/skills/outil-maison/SKILL.md'), 'à nous\n');
    fs.writeFileSync(path.join(depot, '.claude/commands/outil-maison.md'), 'à nous\n');

    const r = retirer('outil', depot);

    expect(r.code).toBe(0);
    for (const chemin of [
      '.claude/skills/outil-ecrire',
      '.claude/skills/outil-lire',
      '.claude/commands/outil-idee.md',
      '.claude/plugins-importes/outil',
    ]) {
      expect(existe(depot, chemin)).toBe(false);
    }
    expect(lire(depot, '.claude/skills/outil-maison/SKILL.md')).toBe('à nous\n');
    expect(lire(depot, '.claude/commands/outil-maison.md')).toBe('à nous\n');
    expect(r.sortie).toContain('Plug-in outil 1.0.0 retiré — 2 skill(s), 1 commande(s), et sa provenance.');
  });

  test.each([
    ['un plug-in qui n’est pas installé', 'autre', ['aucun plug-in « autre »', 'Installés : outil.']],
    ['un nom qui n’en est pas un', '../outil', ['pas un nom de plug-in valide']],
  ])('refuse %s, sans rien toucher', (_, nom, motifs) => {
    const depot = temporaire('ramille-depot-');
    expect(installer(source(), depot).code).toBe(0);

    const r = retirer(nom, depot);

    expect(r.code).toBe(1);
    for (const motif of motifs) expect(r.sortie).toContain(motif);
    expect(existe(depot, '.claude/skills/outil-ecrire/SKILL.md')).toBe(true);
  });

  test('refuse un installation.json qui désignerait autre chose qu’un skill, au retrait comme à la mise à jour', () => {
    const depot = temporaire('ramille-depot-');
    expect(installer(source(), depot).code).toBe(0);
    fs.mkdirSync(path.join(depot, 'src'));
    fs.writeFileSync(path.join(depot, 'src/garde.ts'), 'à garder\n');
    // Le nom piégé vient APRÈS deux noms valides : un retrait qui validerait au fil de l'eau aurait
    // déjà effacé les premiers, et c'est ce qu'on veut voir tomber.
    const suivi = installation(depot);
    suivi.skills.push({ amont: 'piege', installe: '../../src' });
    fs.writeFileSync(path.join(depot, '.claude/plugins-importes/outil/installation.json'), JSON.stringify(suivi));

    for (const r of [retirer('outil', depot), installer(source(), depot)]) {
      expect(r.code).toBe(1);
      expect(r.sortie).toContain('porte un nom qui n’en est pas un : « ../../src »');
    }
    expect(lire(depot, 'src/garde.ts')).toBe('à garder\n');
    expect(existe(depot, '.claude/skills/outil-ecrire/SKILL.md')).toBe(true);
  });

  test('refuse --retirer à côté d’une archive, d’un mode ou d’une licence : l’une des deux commandes efface', () => {
    const depot = temporaire('ramille-depot-');
    expect(installer(source(), depot).code).toBe(0);
    const texte = path.join(temporaire('ramille-licence-'), 'LICENSE');
    fs.writeFileSync(texte, 'Licence.\n');

    for (const r of [
      installer(source(), depot, '--retirer', 'outil'),
      retirer('outil', depot, '--manuel'),
      retirer('outil', depot, '--licence', texte),
    ]) {
      expect(r.code).toBe(1);
      expect(r.sortie).toContain('--retirer ne prend que le nom du plug-in');
    }
    expect(existe(depot, '.claude/skills/outil-ecrire/SKILL.md')).toBe(true);
  });
});
