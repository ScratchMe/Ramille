// Installe un plug-in Claude Code dans le dépôt, depuis son archive `.zip` ou son dossier.
//
//   node scripts/installer-un-plugin.mjs <archive.zip | dossier> [--prefixe <court>] [--manuel | --auto]
//                                        [--licence <fichier>] [--racine <dépôt>]
//   node scripts/installer-un-plugin.mjs --retirer <plug-in> [--racine <dépôt>]
//
// **Pourquoi à la main : claude.ai ne livre pas les plug-ins aux sessions cloud.** Constaté le
// 24/09/2026 : Product Management activé sur le compte, et la session ne le voyait pas — liste des
// plug-ins du compte vide, catalogue « non activé », dossier de synchronisation vide. Le dépôt est
// la seule chose qu'une session cloud est sûre d'emporter ; c'est donc là que les plug-ins vivent,
// et CLAUDE.md dit comment on s'en sert.
//
// Relancer le script sur une archive plus récente du même plug-in le met à jour : ce qu'il avait
// posé est retiré d'abord, donc un skill disparu en amont disparaît aussi d'ici. Le préfixe et le
// mode choisis la première fois sont gardés dans `installation.json` : une mise à jour les reprend.
//
// **`--retirer <plug-in>` défait une installation** : exactement ce que son `installation.json` dit
// avoir posé, puis sa provenance — jamais tout ce qui commence par le préfixe, qui emporterait un
// skill écrit ici sous un nom voisin. Ce qui cite le plug-in ailleurs dans le dépôt (CLAUDE.md, un
// document) reste à relire à la main, et le script le rappelle.
//
// **`--manuel` installe un plug-in utile mais bavard.** Chaque skill installé charge sa description
// dans le contexte de CHAQUE session et peut se déclencher seul sur un sujet voisin — Auth0 en
// apporte quarante-cinq, pour un fournisseur que Ramille n'utilise pas. En `--manuel`, chaque
// skill et chaque commande reçoivent `disable-model-invocation: true` : rien ne se charge, rien ne
// se déclenche, et tout reste appelable par son nom. `--auto` revient au mode ordinaire. Un skill
// que l'amont réserve à l'agent (`user-invocable: false`) deviendrait alors inatteignable — la
// documentation de Claude Code dit que ce champ l'ôte à la personne, et `disable-model-invocation`
// à l'agent : en `--manuel`, il devient appelable par son nom comme le reste du plug-in.
//
// **`--licence <fichier>` joint un texte de licence quand l'archive n'en porte pas.** Le dépôt est
// public : y installer un plug-in, c'est le redistribuer. Design d'Anthropic en est l'exemple — sa
// licence (Apache 2.0) est à la racine du dépôt d'amont et non dans le dossier du plug-in, donc
// l'archive ne l'emporte pas. Le texte fourni est gardé avec la provenance et repris à chaque mise
// à jour, sans quoi la première l'effacerait sans un mot ; un plug-in qui n'en a aucune est signalé.
//
// **Trois règles, et chacune répond à un défaut qu'on aurait eu sans elle :**
//
//   1. **Tout nom installé est préfixé par celui du plug-in.** Marketing et Product Management
//      portent tous deux `competitive-brief`, et Engineering apporte `code-review`, le nom du
//      `/code-review` intégré : sans préfixe, le nom d'un skill dépendrait de l'ordre
//      d'installation. Un nom qui porte déjà le préfixe le garde tel quel (`auth0-android`, pas
//      `auth0-auth0-android`), et un nom de plug-in trop long se remplace par `--prefixe` — celui
//      de Product Tracking menait au-delà des 64 caractères permis.
//      **C'est le DOSSIER qui nomme le skill, pas le champ `name` de son en-tête** — mesuré le
//      24/09/2026 (Claude Code 2.1.281) : un dossier `essai-dossier` dont l'en-tête dit
//      `essai-entete` s'est présenté sous le premier nom. Le champ est réécrit quand même, pour que
//      les deux ne se contredisent pas : le jour où un outil lirait l'autre, le préfixe tiendrait
//      encore. **Et les renvois suivent** : une consigne qui propose « → `/write-spec` » enverrait
//      sinon vers une commande qui n'existe pas ici — Product Management en portait sur treize
//      lignes, relevées à sa première installation. Les liens relatifs aussi : chacun de ses skills
//      renvoie à `../../CONNECTORS.md`, qui mène désormais à la copie gardée avec la provenance au
//      lieu d'un `.claude/CONNECTORS.md` qui n'existe pas.
//      Un manifeste peut ranger ses skills ailleurs que sous `skills/` (UI UX Pro Max : sous
//      `.claude/skills/`) : ces chemins s'ajoutent au défaut, et un chemin qui sortirait du
//      plug-in est refusé.
//   2. **Hooks, connecteurs et agents ne sont jamais installés par ce script.** Un hook exécute du
//      code à chaque événement de la session, un connecteur ouvre l'accès à un compte tiers, un
//      agent choisit ses outils : chacun est une décision, prise à la main après lecture. Ils sont
//      listés dans `installation.json` et dans la sortie, pour qu'aucun ne se perde en silence. Un
//      skill ou une commande qui déclare des hooks dans son en-tête est refusé, pour la même raison.
//   3. **Rien n'est écrit tant que tout n'a pas été vérifié** — entrées d'archive qui sortiraient
//      de leur dossier, liens symboliques, en-têtes illisibles, collisions de noms. Un refus laisse
//      le dépôt tel qu'il était. Rien n'est retiré non plus avant d'avoir été vérifié : les noms
//      relus dans `installation.json`, par une mise à jour comme par `--retirer`, sont revalidés
//      d'abord — le fichier vit dans le dépôt, qu'une PR peut modifier, et un nom en `../../src` y
//      ferait effacer autre chose qu'un skill.
//
// **Ce que le script ne voit pas : ce que les consignes DISENT.** Il imprime ce qui mérite un
// regard — adresses, commandes shell, outils pré-autorisés, liens qui ne mènent à rien d'installé,
// noms d'amont que la réécriture n'a pas reconnus comme des renvois, fichiers qui ne sont pas des
// consignes —, mais une consigne peut demander n'importe quoi sans rien contenir de tout ça. Elles
// se relisent avant de commettre.
//
// Le texte des consignes n'est pas traduit : une traduction rendrait chaque mise à jour impossible
// à rejouer. La règle « tout en français » vaut pour le produit et son code, pas pour des consignes
// tierces — et ce sont les règles du dépôt qui passent devant elles (CLAUDE.md).
//
// Éprouvé en le cassant le 24/09/2026 : les mutations et leur compte sont en tête de
// `installer-un-plugin.test.ts`.

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const USAGE =
  'Usage : node scripts/installer-un-plugin.mjs <archive.zip | dossier> [--prefixe <court>] [--manuel | --auto] [--licence <fichier>] [--racine <dépôt>]\n' +
  '        node scripts/installer-un-plugin.mjs --retirer <plug-in> [--racine <dépôt>]';

/** Ce que Claude Code accepte comme nom de skill : minuscules et chiffres, des tirets entre eux
 * mais jamais au bord ni doublés, 64 caractères au plus. */
const NOM = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LONGUEUR_MAX = 64;

/** Où vit la provenance de chaque plug-in, relatif à la racine du dépôt — en POSIX, parce que le
 * chemin est aussi écrit dans les fichiers installés. */
const PROVENANCE = '.claude/plugins-importes';

/** Ce qu'on garde à côté de la provenance : la licence et la notice, qu'Apache 2.0 exige pour
 * redistribuer, et `CONNECTORS.md`, qui explique les `~~catégorie` que les consignes emploient. */
const A_GARDER = /^((LICENSE|NOTICE|COPYING)(\.[a-z]+)?|CONNECTORS\.md)$/i;

/** Parmi ce qu'on garde, ce qui est une licence — une notice seule n'en est pas une. */
const LICENCE = /^(LICENSE|COPYING)(\.[a-z]+)?$/i;

/** Ce qui se lit sans s'installer : la documentation d'un dépôt d'amont et les manifestes des
 * autres agents (Codex, Cursor, Gemini…) qu'un plug-in publié pour plusieurs outils porte à sa
 * racine. Le README d'amont n'est pas gardé : il documente les noms d'avant le préfixe, donc il se
 * tromperait sur chaque commande qu'il cite. Tout le reste de la racine est signalé. */
const A_IGNORER =
  /^(README|CHANGELOG|CONTRIBUTING|CODE_OF_CONDUCT|SECURITY)(\.[a-z]+)*$|^\.git(ignore|attributes|hub)?$|^\.releaserc(\.[a-z]+)?$|^\.(codex|cursor|grok)-plugin$|^\.agents$|^(gemini-extension|kimi\.plugin)\.json$/i;

/** Les entrées de la racine d'un plug-in que le script comprend. Toute autre est signalée. */
const CONNUES = new Set(['.claude-plugin', 'skills', 'commands', 'agents', 'hooks', '.mcp.json']);

/** Les lignes qui méritent un regard avant de commettre. Ni exhaustif ni bloquant : c'est une
 * liste de ce qu'on sait reconnaître, pas une preuve que le reste est sain. */
const A_REGARDER = [
  [/https?:\/\//, 'adresse'],
  [/\b(curl|wget|sudo)\b|rm -rf|\|\s*(ba)?sh\b|\beval\(|base64/, 'commande shell'],
  [/^allowed-tools:/, 'outils pré-autorisés'],
];

class Refus extends Error {}

function refuser(message) {
  throw new Refus(message);
}

function lireArguments(argv) {
  let racine = path.join(import.meta.dirname, '..');
  let source = null;
  let retirer = null;
  let licence = null;
  let prefixe;
  let manuel;
  const args = [...argv];
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--racine') {
      const valeur = args.shift();
      if (!valeur) refuser('--racine attend un dossier.');
      racine = path.resolve(valeur);
    } else if (arg === '--retirer') {
      retirer = args.shift();
      if (!retirer) refuser('--retirer attend le nom d’un plug-in installé.');
    } else if (arg === '--licence') {
      const valeur = args.shift();
      if (!valeur) refuser('--licence attend un fichier.');
      licence = path.resolve(valeur);
      if (!fs.existsSync(licence) || !fs.statSync(licence).isFile()) refuser(`--licence : fichier introuvable : ${licence}`);
    } else if (arg === '--manuel' || arg === '--auto') {
      manuel = arg === '--manuel';
    } else if (arg === '--prefixe') {
      prefixe = args.shift();
      if (!prefixe) refuser('--prefixe attend un préfixe.');
    } else if (arg.startsWith('-')) {
      refuser(`option inconnue : ${arg}\n${USAGE}`);
    } else if (source === null) {
      source = path.resolve(arg);
    } else {
      refuser(`une seule archive à la fois.\n${USAGE}`);
    }
  }
  if (retirer !== null) {
    // Une archive, un préfixe ou un mode à côté disent qu'on s'est trompé de commande : deviner
    // laquelle était voulue serait pire que refuser, puisque l'une des deux efface.
    if (source !== null || prefixe !== undefined || manuel !== undefined || licence !== null) {
      refuser(`--retirer ne prend que le nom du plug-in (et --racine).\n${USAGE}`);
    }
    return { retirer, racine };
  }
  if (source === null) refuser(USAGE);
  if (!fs.existsSync(source)) refuser(`introuvable : ${source}`);
  return { source, racine, prefixe, manuel, licence };
}

/** Un dossier se lit tel quel ; une archive s'ouvre dans un dossier temporaire, et son empreinte
 * est gardée pour qu'on sache plus tard quelle archive a été installée. */
function ouvrir(source) {
  if (fs.statSync(source).isDirectory()) return { dossier: source, temporaire: null, sha256: null };
  if (!source.toLowerCase().endsWith('.zip')) refuser(`ni un dossier ni une archive .zip : ${source}`);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  const echec = (erreur) => String(erreur.stderr ?? erreur.message).trim();

  // Une entrée en `../` ou en chemin absolu écrirait hors du dossier d'extraction. `unzip` les
  // écarte de lui-même — mesuré le 24/09/2026 (UnZip 6.00) : `../evasion.txt` est posé DANS le
  // dossier, et `unzip -q` sort en 0 sans un mot. Mais une garde qui tient au comportement d'une
  // version de l'outil n'en est pas une : on lit la liste des entrées d'abord, et une seule suffit.
  let entrees;
  try {
    entrees = execFileSync('unzip', ['-Z1', source], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (erreur) {
    refuser(`l’archive ne se lit pas : ${echec(erreur)}`);
  }
  const evasions = entrees.split('\n').filter((nom) => nom.startsWith('/') || nom.split(/[\\/]/).includes('..'));
  if (evasions.length > 0) refuser(`l’archive essaie d’écrire hors de son dossier : ${evasions.join(', ')}.`);

  const temporaire = fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-plugin-'));
  try {
    execFileSync('unzip', ['-q', source, '-d', temporaire], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (erreur) {
    fs.rmSync(temporaire, { recursive: true, force: true });
    refuser(`l’archive ne s’ouvre pas proprement : ${echec(erreur)}`);
  }
  return { dossier: temporaire, temporaire, sha256 };
}

/** La racine du plug-in est le dossier qui porte `.claude-plugin/plugin.json` : celui de l'archive,
 * ou le seul dossier qu'elle contient — les deux formes circulent. */
function racineDuPlugin(dossier) {
  const candidats = [
    dossier,
    ...fs
      .readdirSync(dossier, { withFileTypes: true })
      .filter((entree) => entree.isDirectory())
      .map((entree) => path.join(dossier, entree.name)),
  ];
  const trouves = candidats.filter((d) => fs.existsSync(path.join(d, '.claude-plugin', 'plugin.json')));
  if (trouves.length === 0) {
    refuser('aucun `.claude-plugin/plugin.json`, ni à la racine ni un niveau en dessous : ce n’est pas un plug-in.');
  }
  if (trouves.length > 1) refuser('plusieurs plug-ins dans la même archive : un à la fois.');
  return trouves[0];
}

function parcourir(dossier, visiter) {
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, entree.name);
    visiter(chemin, entree);
    if (entree.isDirectory()) parcourir(chemin, visiter);
  }
}

/** Un lien symbolique copié dans le dépôt pourrait désigner n'importe quel fichier de la machine
 * qui l'installe — une clé, un jeton. Aucun plug-in légitime n'en a besoin. */
function refuserLesLiens(racinePlugin) {
  parcourir(racinePlugin, (chemin, entree) => {
    if (entree.isSymbolicLink()) {
      refuser(`lien symbolique dans le plug-in : ${path.relative(racinePlugin, chemin)}.`);
    }
  });
}

/** L'en-tête YAML d'un fichier de consignes : les lignes entre les deux `---` du début. */
function enTete(texte) {
  const lignes = texte.split('\n');
  if (lignes[0].trim() !== '---') return null;
  const fin = lignes.findIndex((ligne, i) => i > 0 && ligne.trim() === '---');
  return fin === -1 ? null : { lignes, fin };
}

/** La ligne d'un champ de premier niveau de l'en-tête, ou -1. */
function ligneDuChamp(entete, cle) {
  for (let i = 1; i < entete.fin; i += 1) {
    if (entete.lignes[i].startsWith(`${cle}:`)) return i;
  }
  return -1;
}

/** Vrai si l'en-tête réserve le fichier à l'agent : `user-invocable: false`. */
function reserveALAgent(texte) {
  const entete = enTete(texte);
  const index = entete === null ? -1 : ligneDuChamp(entete, 'user-invocable');
  return index !== -1 && /^user-invocable:\s*['"]?false['"]?\s*$/i.test(entete.lignes[index].replace(/\r$/, ''));
}

/** Lit l'en-tête d'un fichier de consignes et refuse ce que la règle 2 interdit. */
/** Un skill sans en-tête n'a ni nom ni description, et Claude Code ne le présenterait pas ; une
 * commande, elle, peut s'en passer — son nom est celui du fichier. */
function lireConsignes(fichier, racinePlugin, { enTeteObligatoire }) {
  const relatif = path.relative(racinePlugin, fichier);
  const texte = fs.readFileSync(fichier, 'utf8');
  const entete = enTete(texte);
  if (entete === null) {
    if (enTeteObligatoire) refuser(`${relatif} n’a pas d’en-tête (--- … ---) : Claude Code ne le lirait pas.`);
    return { reserveALAgent: false };
  }
  if (ligneDuChamp(entete, 'hooks') !== -1) {
    refuser(`${relatif} déclare des hooks dans son en-tête : ils s’exécuteraient à chaque usage (règle 2).`);
  }
  return { reserveALAgent: reserveALAgent(texte) };
}

/** Le nom installé : le préfixe, puis le nom d'amont — sauf quand celui-ci porte déjà le préfixe.
 * Auth0 nomme ses skills `auth0-android` : le préfixe systématique en ferait `auth0-auth0-android`,
 * et Modern Web Guidance aurait un `modern-web-guidance-modern-web-guidance`. Un nom qui commence
 * par le préfixe est déjà rangé sous lui, donc la règle 1 tient ; la rare collision que l'exception
 * rendrait possible (`a` + `b-c` contre `a-b` + `c`) est arrêtée par `planifier`. */
function nomInstalle(prefixe, nom, ou) {
  if (!NOM.test(nom)) refuser(`${ou} : « ${nom} » n’est pas un nom valide (minuscules, chiffres, tirets).`);
  const installe = nom === prefixe || nom.startsWith(`${prefixe}-`) ? nom : `${prefixe}-${nom}`;
  if (installe.length > LONGUEUR_MAX) {
    refuser(`${ou} : « ${installe} » dépasse ${LONGUEUR_MAX} caractères — un préfixe plus court se donne par --prefixe.`);
  }
  return installe;
}

function lireManifeste(racinePlugin) {
  let manifeste;
  try {
    manifeste = JSON.parse(fs.readFileSync(path.join(racinePlugin, '.claude-plugin', 'plugin.json'), 'utf8'));
  } catch (erreur) {
    refuser(`.claude-plugin/plugin.json illisible : ${erreur.message}`);
  }
  if (typeof manifeste.name !== 'string' || !NOM.test(manifeste.name)) {
    refuser(`plugin.json : « ${manifeste.name} » n’est pas un nom de plug-in valide (minuscules, chiffres, tirets).`);
  }
  return manifeste;
}

/** Où chercher les skills ou les commandes : le dossier par défaut, plus ceux que le manifeste
 * déclare — ils s'ajoutent au défaut sans le remplacer, comme Claude Code les lit. UI UX Pro Max
 * range ainsi ses skills sous `.claude/skills/`. Un chemin qui sortirait du plug-in est refusé : il
 * désignerait n'importe quoi. */
function cheminsDeclares(manifeste, cle) {
  const declares = manifeste[cle] === undefined ? [] : [manifeste[cle]].flat();
  if (!declares.every((element) => typeof element === 'string')) {
    refuser(`plugin.json « ${cle} » : forme non gérée, à installer à la main.`);
  }
  const chemins = declares.map((declare) => {
    const normal = path.posix.normalize(declare).replace(/\/+$/, '');
    if (normal === '..' || normal.startsWith('../') || path.posix.isAbsolute(normal)) {
      refuser(`plugin.json « ${cle} » sort du plug-in : ${declare}.`);
    }
    return normal;
  });
  return [...new Set([cle, ...chemins])];
}

function inventorier(racinePlugin, manifeste, prefixe) {
  const nonInstalle = { hooks: [], connecteurs: [], agents: [], autres: [] };
  const skills = [];
  const commandes = [];
  const gardes = [];
  const relatif = (chemin) => path.relative(racinePlugin, chemin).split(path.sep).join('/');

  const dossiersDeSkills = cheminsDeclares(manifeste, 'skills');
  const cheminsDeCommandes = cheminsDeclares(manifeste, 'commands');
  const connues = new Set([...CONNUES, ...[...dossiersDeSkills, ...cheminsDeCommandes].map((c) => c.split('/')[0])]);

  for (const entree of fs.readdirSync(racinePlugin, { withFileTypes: true })) {
    if (connues.has(entree.name)) continue;
    if (A_GARDER.test(entree.name) && entree.isFile()) gardes.push(entree.name);
    else if (!A_IGNORER.test(entree.name)) nonInstalle.autres.push(entree.name);
  }

  const sous = (nom) => path.join(racinePlugin, nom);

  for (const dossierDeSkills of dossiersDeSkills.filter((d) => fs.existsSync(sous(d)))) {
    for (const entree of fs.readdirSync(sous(dossierDeSkills), { withFileTypes: true })) {
      const dossier = path.join(sous(dossierDeSkills), entree.name);
      const fichier = path.join(dossier, 'SKILL.md');
      if (!entree.isDirectory() || !fs.existsSync(fichier)) {
        nonInstalle.autres.push(`${dossierDeSkills}/${entree.name}`);
        continue;
      }
      // Le nom d'amont est celui du dossier, pas celui de l'en-tête : c'est lui que Claude Code
      // présente (règle 1), donc c'est lui que la personne a pu lire ou taper ailleurs.
      const lu = lireConsignes(fichier, racinePlugin, { enTeteObligatoire: true });
      const nom = entree.name;
      const installe = nomInstalle(prefixe, nom, relatif(dossier));
      skills.push({ amont: nom, installe, dossier, relatif: relatif(dossier), reserveALAgent: lu.reserveALAgent });
    }
  }

  // Un chemin de commandes est un dossier de `.md`, ou un `.md` à lui seul.
  for (const chemin of cheminsDeCommandes.filter((c) => fs.existsSync(sous(c)))) {
    const fichiers = fs.statSync(sous(chemin)).isDirectory()
      ? fs.readdirSync(sous(chemin), { withFileTypes: true }).map((entree) => ({ entree, fichier: path.join(sous(chemin), entree.name) }))
      : [{ entree: { name: path.basename(chemin), isFile: () => true }, fichier: sous(chemin) }];
    for (const { entree, fichier } of fichiers) {
      if (!entree.isFile() || !entree.name.endsWith('.md')) {
        nonInstalle.autres.push(relatif(fichier));
        continue;
      }
      const lu = lireConsignes(fichier, racinePlugin, { enTeteObligatoire: false });
      const nom = entree.name.slice(0, -'.md'.length);
      const installe = nomInstalle(prefixe, nom, relatif(fichier));
      commandes.push({ amont: nom, installe, fichier, relatif: relatif(fichier), reserveALAgent: lu.reserveALAgent });
    }
  }

  if (fs.existsSync(sous('hooks'))) {
    parcourir(sous('hooks'), (chemin, entree) => {
      if (entree.isFile()) nonInstalle.hooks.push(path.relative(racinePlugin, chemin));
    });
  }
  if (manifeste.hooks !== undefined) nonInstalle.hooks.push('plugin.json « hooks »');

  if (fs.existsSync(sous('.mcp.json'))) {
    try {
      const mcp = JSON.parse(fs.readFileSync(sous('.mcp.json'), 'utf8'));
      nonInstalle.connecteurs.push(...Object.keys(mcp.mcpServers ?? mcp));
    } catch {
      nonInstalle.connecteurs.push('.mcp.json (illisible)');
    }
  }
  if (manifeste.mcpServers !== undefined) {
    const declares = manifeste.mcpServers;
    nonInstalle.connecteurs.push(...(typeof declares === 'object' ? Object.keys(declares) : [`plugin.json « ${declares} »`]));
  }

  // Un agent est `agents/relecteur.md` ou `agents/relecteur/AGENT.md` : il s'appelle `relecteur`
  // dans les deux cas.
  if (fs.existsSync(sous('agents'))) {
    parcourir(sous('agents'), (chemin, entree) => {
      if (!entree.isFile()) return;
      nonInstalle.agents.push(path.relative(sous('agents'), chemin).replace(/\.md$/i, '').replace(/\/AGENT$/i, ''));
    });
  }
  if (manifeste.agents !== undefined) nonInstalle.agents.push('plugin.json « agents »');

  for (const cle of ['lspServers', 'outputStyles']) {
    if (manifeste[cle] !== undefined) nonInstalle.autres.push(`plugin.json « ${cle} »`);
  }

  // Un skill et une commande du même nom deviendraient deux `/prefixe-nom` : l'un masquerait l'autre.
  const noms = [...skills, ...commandes].map((element) => element.installe);
  const doublons = noms.filter((nom, i) => noms.indexOf(nom) !== i);
  if (doublons.length > 0) refuser(`deux éléments du plug-in porteraient le même nom : ${[...new Set(doublons)].join(', ')}.`);

  if (skills.length === 0 && commandes.length === 0) {
    const contenu = Object.entries(nonInstalle)
      .filter(([, liste]) => liste.length > 0)
      .map(([genre, liste]) => `${genre} : ${liste.join(', ')}`);
    refuser(`rien que ce script installe — ni skill ni commande. Contenu : ${contenu.join(' ; ') || 'vide'}.`);
  }

  const parNom = (a, b) => a.installe.localeCompare(b.installe);
  for (const liste of Object.values(nonInstalle)) liste.sort();
  return {
    manifeste,
    nom: manifeste.name,
    prefixe,
    skills: skills.sort(parNom),
    commandes: commandes.sort(parNom),
    gardes: gardes.sort(),
    nonInstalle,
  };
}

const echapper = (texte) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ce qui suit un nom pour qu'il soit un renvoi entier : `/write-spec`, `` `/write-spec` `` ou
 * `/write-spec $ARGUMENTS`, mais jamais le début de `/write-spec-bis` ni de `/write-spec/`. */
const FIN_DE_NOM = '(?=$|[\\s`\'")\\],.;:!?])';

/** Réécrit les renvois aux noms d'amont — `/write-spec` et `product-management:write-spec`
 * deviennent `/product-management-write-spec`. Sans elle, une consigne qui propose « → `/write-spec` »
 * enverrait vers une commande qui n'existe pas ici. Un renvoi n'est reconnu qu'isolé :
 * `skills/write-spec/` est un chemin, il reste tel quel et `aRelire` le signale. La forme
 * `plugin:skill` porte le NOM du plug-in, qui n'est pas toujours le préfixe choisi. */
function reecrireLesRenvois(texte, inventaire) {
  let resultat = texte;
  for (const { amont, installe } of [...inventaire.skills, ...inventaire.commandes]) {
    resultat = resultat
      .replace(new RegExp(`(^|[\\s\`'"(\\[])/${echapper(amont)}${FIN_DE_NOM}`, 'gm'), `$1/${installe}`)
      .replace(
        new RegExp(`(^|[^a-z0-9-])${echapper(inventaire.nom)}:${echapper(amont)}${FIN_DE_NOM}`, 'gm'),
        `$1${installe}`,
      );
  }
  return resultat;
}

/** Où un fichier du plug-in se retrouve une fois installé, relatif à la racine du dépôt — ou
 * `null` s'il ne s'installe pas. C'est la table qui permet de recalculer un lien relatif. */
function destination(relatif, inventaire) {
  for (const skill of inventaire.skills) {
    if (relatif === skill.relatif || relatif.startsWith(`${skill.relatif}/`)) {
      return path.posix.join('.claude/skills', skill.installe, relatif.slice(skill.relatif.length));
    }
  }
  const commande = inventaire.commandes.find((element) => element.relatif === relatif);
  if (commande) return `.claude/commands/${commande.installe}.md`;
  if (relatif === '.claude-plugin/plugin.json' || inventaire.gardes.includes(relatif)) {
    return path.posix.join(PROVENANCE, inventaire.nom, path.posix.basename(relatif));
  }
  return null;
}

/** La cible d'un lien Markdown `[texte](cible)`. */
const LIEN = /\]\(([^)\s]+)\)/g;

/** Recalcule les liens relatifs d'un fichier pour sa nouvelle place. Chaque skill de Product
 * Management renvoie à `../../CONNECTORS.md` : déplacé tel quel, le lien aurait mené à
 * `.claude/CONNECTORS.md`, qui n'existe pas. Un lien vers un élément installé ou vers un fichier
 * gardé avec la provenance suit ; un lien vers ce qui ne s'installe pas — ou qui n'existe pas en
 * amont — reste tel quel et part dans `morts`, que `aRelire` imprime. */
function reecrireLesLiens(texte, origine, cible, contexte) {
  return texte.replace(LIEN, (tout, lien) => {
    if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(lien)) return tout;
    const [, chemin, suite] = lien.match(/^([^#?]*)(.*)$/);
    const vise = path.posix.normalize(path.posix.join(path.posix.dirname(origine), chemin));
    const arrivee = vise.startsWith('..') ? null : destination(vise, contexte.inventaire);
    if (arrivee === null || !fs.existsSync(path.join(contexte.racinePlugin, vise))) {
      contexte.morts.push(lien);
      return tout;
    }
    return `](${path.posix.relative(path.posix.dirname(cible), arrivee)}${suite})`;
  });
}

/** Pose un champ de premier niveau de l'en-tête — le `name` au nom installé (règle 1), ou
 * `disable-model-invocation` en `--manuel`. Une commande sans en-tête en reçoit un. */
function poserLeChamp(texte, cle, valeur) {
  const entete = enTete(texte);
  if (entete === null) return `---\n${cle}: ${valeur}\n---\n${texte}`;
  const index = ligneDuChamp(entete, cle);
  const ligne = `${cle}: ${valeur}`;
  if (index === -1) entete.lignes.splice(entete.fin, 0, ligne);
  else entete.lignes[index] = entete.lignes[index].endsWith('\r') ? `${ligne}\r` : ligne;
  return entete.lignes.join('\n');
}

/** En `--manuel`, un skill ou une commande ne se déclenche que si on l'appelle par son nom, et sa
 * description ne se charge plus dans le contexte de chaque session — mesuré le 24/09/2026 : un
 * skill portant `disable-model-invocation: true` disparaît de la liste que Claude Code présente,
 * son témoin sans le champ y reste. C'est la place d'un plug-in utile mais bavard. Un fichier que
 * l'amont réserve à l'agent y deviendrait inatteignable : il est rendu à la personne. */
function enManuel(texte, inventaire) {
  if (!inventaire.manuel) return texte;
  const manuel = poserLeChamp(texte, 'disable-model-invocation', 'true');
  return reserveALAgent(manuel) ? poserLeChamp(manuel, 'user-invocable', 'true') : manuel;
}

/** Le début de l'avis qu'un fichier modifié porte — une seule écriture, parce que `aRelire` doit
 * le reconnaître pour ne pas le lire comme une consigne. */
const AVIS = '<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs';

/** Un fichier modifié porte un avis qui le dit : Apache 2.0 l'exige de qui redistribue un fichier
 * changé, et c'est ce qui permet de savoir, en le lisant, qu'il n'est plus celui d'amont. */
function marquer(original, modifie, inventaire) {
  if (modifie === original) return original;
  const { nom, prefixe } = inventaire;
  const version = inventaire.manifeste.version ?? 'sans version';
  return (
    `${modifie.replace(/\n*$/, '\n')}\n${AVIS} : ` +
    `noms préfixés par « ${prefixe}- » (champ name, renvois aux commandes) et liens relatifs recalculés` +
    `${inventaire.manuel ? ', appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false)' : ''}. ` +
    `Plug-in ${nom} ${version} ; ` +
    `licence et provenance dans ${PROVENANCE}/${nom}/. -->\n`
  );
}

/** Tout ce que l'installation écrira, calculé en mémoire avant la première écriture (règle 3). Les
 * fichiers de consignes sont transformés ; les autres sont copiés tels quels, droits compris. Les
 * chemins sont en POSIX : ce sont aussi ceux que les liens recalculés écrivent. */
function preparer(inventaire, racinePlugin) {
  const ecritures = [];
  const consignes = (origine, cible, transformer = (texte) => texte) => {
    const original = fs.readFileSync(origine, 'utf8');
    const contexte = { inventaire, racinePlugin, morts: [] };
    const relatif = path.relative(racinePlugin, origine).split(path.sep).join('/');
    const modifie = reecrireLesLiens(reecrireLesRenvois(transformer(original), inventaire), relatif, cible, contexte);
    const texte = marquer(original, modifie, inventaire);
    ecritures.push({ origine, cible, texte, liensMorts: contexte.morts, taille: Buffer.byteLength(texte) });
  };
  for (const skill of inventaire.skills) {
    parcourir(skill.dossier, (chemin, entree) => {
      if (!entree.isFile()) return;
      const relatif = path.relative(skill.dossier, chemin).split(path.sep).join('/');
      const cible = path.posix.join('.claude/skills', skill.installe, relatif);
      if (relatif === 'SKILL.md') {
        consignes(chemin, cible, (texte) => enManuel(poserLeChamp(texte, 'name', skill.installe), inventaire));
      }
      else if (chemin.endsWith('.md')) consignes(chemin, cible);
      else ecritures.push({ origine: chemin, cible, texte: null, liensMorts: [], taille: fs.statSync(chemin).size });
    });
  }
  for (const commande of inventaire.commandes) {
    consignes(commande.fichier, `.claude/commands/${commande.installe}.md`, (texte) => enManuel(texte, inventaire));
  }
  return ecritures;
}

/** Ce qui s'exécute, par opposition à ce qui se lit : un script ou un binaire se relit un par un
 * avant de commettre, une donnée (`.csv`, `.ttf`, `.json`…) se compte. */
const EXECUTABLE = /\.(py|js|cjs|mjs|ts|tsx|jsx|sh|bash|zsh|rb|pl|php|ps1|bat|cmd|exe|bin|so|dylib|dll|jar|wasm)$|(^|\/)[^./]+$/i;

/** Ce qui, dans ce qu'on s'apprête à installer, mérite d'être relu : les scripts, les lignes
 * suspectes, les liens morts, et les noms d'amont que la réécriture n'a pas reconnus comme des
 * renvois — un chemin `skills/write-spec/`, par exemple. Les données sont comptées, pas listées :
 * UI UX Pro Max en porte deux cents, qui noieraient les quarante scripts qu'il faut lire. */
function aRelire(ecritures, inventaire) {
  // Un nom d'amont resté tel quel ne se cherche que parmi ceux qui ont CHANGÉ, et entier : un nom
  // qui porte déjà le préfixe n'est pas renommé (`/outil` reste `/outil`), et `/outil-idee` —
  // réécrit à juste titre — contient `/outil` sans le désigner. Et seulement là où il désigne
  // quelque chose : isolé comme un renvoi que la réécriture a manqué, ou segment d'un chemin
  // (`skills/update/`). Collé à un mot, c'est de la prose — « Create/update memory » chez
  // Productivity, qui a un skill `update` —, et le signaler noierait les vrais restes.
  const renommes = [...inventaire.skills, ...inventaire.commandes]
    .filter((element) => element.amont !== element.installe)
    .map((element) => echapper(element.amont));
  const noms = renommes.join('|');
  const resteDAmont =
    renommes.length > 0 ? new RegExp(`(^|[\\s\`'"(\\[])/(${noms})(?![a-z0-9-])|/(${noms})/`) : null;
  // La forme `plugin:skill` n'est un renvoi que suivie d'un vrai nom du plug-in : Auth0 écrit
  // `com.auth0.android:auth0:3.x`, une coordonnée Gradle et non un skill.
  const tous = [...inventaire.skills, ...inventaire.commandes].map((element) => echapper(element.amont));
  const renvoiEspace = new RegExp(`(^|[^a-z0-9.-])${echapper(inventaire.nom)}:(${tous.join('|')})(?![a-z0-9-])`);
  const remarques = [];
  const donnees = new Map();
  for (const { cible, texte, liensMorts } of ecritures) {
    if (texte === null) {
      if (EXECUTABLE.test(cible)) {
        remarques.push(`${cible} — script ou binaire : lire ce qu’il fait`);
      } else {
        const extension = path.posix.extname(cible).toLowerCase() || '(sans extension)';
        donnees.set(extension, (donnees.get(extension) ?? 0) + 1);
      }
      continue;
    }
    for (const lien of liensMorts) remarques.push(`${cible} (lien vers un fichier qui ne s’installe pas) — ${lien}`);
    texte.split('\n').forEach((ligne, index) => {
      if (ligne.startsWith(AVIS)) return;
      const raisons = A_REGARDER.filter(([motif]) => motif.test(ligne)).map(([, raison]) => raison);
      if (renvoiEspace.test(ligne) || resteDAmont?.test(ligne)) {
        raisons.push('nom d’amont resté tel quel');
      }
      if (raisons.length > 0) {
        remarques.push(`${cible}:${index + 1} (${raisons.join(', ')}) — ${ligne.trim().slice(0, 120)}`);
      }
    });
  }
  if (donnees.size > 0) {
    const compte = [...donnees].sort(([, a], [, b]) => b - a).map(([extension, n]) => `${n} × ${extension}`);
    remarques.push(`données, copiées telles quelles : ${compte.join(', ')}`);
  }
  return remarques;
}

function existe(chemin) {
  return fs.lstatSync(chemin, { throwIfNoEntry: false }) !== undefined;
}

const cheminSkill = (nom) => path.join('.claude', 'skills', nom);
const cheminCommande = (nom) => path.join('.claude', 'commands', `${nom}.md`);

/** La dernière installation de ce plug-in, telle que `installation.json` la décrit — ou `null`.
 * Chaque nom relu est revalidé avant qu'on s'en serve pour retirer quoi que ce soit (règle 3). */
function installationPrecedente(racine, nom) {
  const relatif = `${PROVENANCE}/${nom}/installation.json`;
  const fichier = path.join(racine, relatif);
  if (!existe(fichier)) return null;
  const installation = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  const invalides = [...(installation.skills ?? []), ...(installation.commandes ?? [])]
    .map((element) => element?.installe)
    .filter((installe) => typeof installe !== 'string' || !NOM.test(installe));
  if (invalides.length > 0) {
    refuser(`${relatif} porte un nom qui n’en est pas un : ${invalides.map((n) => `« ${n} »`).join(', ')}. Rien n’a été touché.`);
  }
  return installation;
}

/** Le texte de licence à garder avec la provenance quand l'archive n'en porte pas : celui qu'on
 * fournit, sinon celui qu'on avait fourni à la dernière installation — lu maintenant, parce que
 * `ecrire` efface la provenance avant de la reposer. */
function licenceFournie(inventaire, racine, precedente, demandee) {
  if (inventaire.gardes.some((nom) => LICENCE.test(nom))) {
    if (demandee) refuser('l’archive porte déjà sa licence : --licence n’a rien à ajouter. Rien n’a été écrit.');
    return null;
  }
  const precedenteFournie = precedente?.licence_fournie ? path.join(racine, PROVENANCE, inventaire.nom, 'LICENSE') : null;
  const source = demandee ?? precedenteFournie;
  if (source === null || !existe(source)) return null;
  const contenu = fs.readFileSync(source);
  return { contenu, sha256: crypto.createHash('sha256').update(contenu).digest('hex') };
}

/** Ce que l'installation écrira et retirera — calculé entièrement avant la première écriture. */
function planifier(inventaire, racine, precedente, licenceDemandee) {
  const provenance = path.join(racine, PROVENANCE, inventaire.nom);
  const licence = licenceFournie(inventaire, racine, precedente, licenceDemandee);

  // Ce que la version précédente avait posé est à nous : on le remplace sans que ce soit une
  // collision. `installation.json` est la seule source de cette liste.
  const aRetirer = [
    ...(precedente?.skills ?? []).map((skill) => cheminSkill(skill.installe)),
    ...(precedente?.commandes ?? []).map((commande) => cheminCommande(commande.installe)),
  ];

  const cibles = [
    ...inventaire.skills.map((skill) => cheminSkill(skill.installe)),
    ...inventaire.commandes.map((commande) => cheminCommande(commande.installe)),
  ];
  const collisions = cibles.filter((cible) => existe(path.join(racine, cible)) && !aRetirer.includes(cible));
  if (collisions.length > 0) {
    refuser(`déjà présent, et pas installé par ce plug-in : ${collisions.join(', ')}. Rien n’a été écrit.`);
  }
  return { provenance, aRetirer, precedente, licence };
}

function ecrire(ecritures, inventaire, plan, racine, racinePlugin, ouverture, source) {
  for (const relatif of plan.aRetirer) fs.rmSync(path.join(racine, relatif), { recursive: true, force: true });
  fs.rmSync(plan.provenance, { recursive: true, force: true });

  for (const { origine, cible, texte } of ecritures) {
    const chemin = path.join(racine, cible);
    fs.mkdirSync(path.dirname(chemin), { recursive: true });
    if (texte === null) fs.copyFileSync(origine, chemin);
    else fs.writeFileSync(chemin, texte);
  }

  fs.mkdirSync(plan.provenance, { recursive: true });
  fs.copyFileSync(path.join(racinePlugin, '.claude-plugin', 'plugin.json'), path.join(plan.provenance, 'plugin.json'));
  for (const nom of inventaire.gardes) fs.copyFileSync(path.join(racinePlugin, nom), path.join(plan.provenance, nom));
  if (plan.licence) fs.writeFileSync(path.join(plan.provenance, 'LICENSE'), plan.licence.contenu);

  const installation = {
    plugin: inventaire.nom,
    prefixe: inventaire.prefixe,
    manuel: inventaire.manuel,
    version: inventaire.manifeste.version ?? null,
    source: path.basename(source),
    sha256: ouverture.sha256,
    ...(plan.licence ? { licence_fournie: { fichier: 'LICENSE', sha256: plan.licence.sha256 } } : {}),
    installe_le: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }),
    installe_par: 'scripts/installer-un-plugin.mjs',
    skills: inventaire.skills.map(({ amont, installe }) => ({ amont, installe })),
    commandes: inventaire.commandes.map(({ amont, installe }) => ({ amont, installe })),
    non_installe: inventaire.nonInstalle,
  };
  fs.writeFileSync(path.join(plan.provenance, 'installation.json'), `${JSON.stringify(installation, null, 2)}\n`);
}

function rendreCompte(inventaire, plan, remarques, ecritures) {
  const { manifeste } = inventaire;
  const octets = ecritures.reduce((somme, { taille }) => somme + taille, 0);
  const lignes = [
    `Plug-in ${manifeste.name} ${manifeste.version ?? '(sans version)'} installé — ${ecritures.length} fichier(s), ` +
      `${(octets / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo.`,
    '',
  ];
  if (inventaire.manuel) {
    lignes.push('  Appel manuel seulement : rien ne se charge ni ne se déclenche seul (gardé pour les mises à jour).', '');
  }
  if (inventaire.prefixe !== inventaire.nom) lignes.push(`  Préfixe : ${inventaire.prefixe}- (gardé pour les mises à jour).`, '');
  if (plan.precedente) lignes.push(`  Remplace la version ${plan.precedente.version ?? '(sans version)'}.`, '');
  if (plan.licence) {
    lignes.push('  Licence : fournie à l’installation, l’archive n’en portant pas (gardée pour les mises à jour).', '');
  } else if (!inventaire.gardes.some((nom) => LICENCE.test(nom))) {
    lignes.push('  Aucune licence : l’archive n’en porte pas, et le dépôt est public — --licence <fichier> en joint une.', '');
  }
  const rendus = [...inventaire.skills, ...inventaire.commandes].filter((element) => element.reserveALAgent);
  if (inventaire.manuel && rendus.length > 0) {
    lignes.push(`  Réservés à l’agent en amont, rendus appelables par leur nom : ${rendus.map(({ installe }) => `/${installe}`).join(', ')}.`, '');
  }
  const liste = (titre, elements) => {
    if (elements.length === 0) return;
    lignes.push(`  ${titre} :`);
    for (const { amont, installe } of elements) lignes.push(`    /${installe}  (« ${amont} » en amont)`);
    lignes.push('');
  };
  liste(`${inventaire.skills.length} skill(s)`, inventaire.skills);
  liste(`${inventaire.commandes.length} commande(s)`, inventaire.commandes);

  const raisons = {
    hooks: 'exécutent du code à chaque événement',
    connecteurs: 'ouvrent l’accès à un compte tiers',
    agents: 'choisissent leurs propres outils',
    autres: 'le script ne sait pas les installer',
  };
  const nonInstalles = Object.entries(inventaire.nonInstalle).filter(([, elements]) => elements.length > 0);
  if (nonInstalles.length > 0) {
    lignes.push('  Non installé — une décision à prendre à la main, après lecture :');
    for (const [genre, elements] of nonInstalles) lignes.push(`    ${genre} (${raisons[genre]}) : ${elements.join(', ')}`);
    lignes.push('');
  }

  lignes.push(remarques.length > 0 ? '  À relire avant de commettre :' : '  Rien de signalé à relire — ce qui ne dispense pas de lire les consignes.');
  for (const remarque of remarques) lignes.push(`    ${remarque}`);
  lignes.push('', `  Provenance : ${PROVENANCE}/${inventaire.nom}/`);
  console.log(lignes.join('\n'));
}

/** Défait une installation : ce que `installation.json` dit avoir posé, puis la provenance. Jamais un
 * motif de noms — `<préfixe>-*` emporterait un skill écrit ici sous un nom voisin, que rien ne
 * distingue d'un skill du plug-in, sinon cette liste. */
function retirerLePlugin(racine, nom) {
  if (!NOM.test(nom)) refuser(`« ${nom} » n’est pas un nom de plug-in valide.`);
  const installation = installationPrecedente(racine, nom);
  if (installation === null) {
    const dossier = path.join(racine, PROVENANCE);
    const installes = existe(dossier)
      ? fs.readdirSync(dossier, { withFileTypes: true }).filter((entree) => entree.isDirectory()).map((entree) => entree.name).sort()
      : [];
    refuser(
      `aucun plug-in « ${nom} » n’est installé ici (${PROVENANCE}/${nom}/installation.json n’existe pas). ` +
        `Installés : ${installes.length > 0 ? installes.join(', ') : 'aucun'}.`,
    );
  }
  const skills = installation.skills ?? [];
  const commandes = installation.commandes ?? [];
  for (const { installe } of skills) fs.rmSync(path.join(racine, cheminSkill(installe)), { recursive: true, force: true });
  for (const { installe } of commandes) fs.rmSync(path.join(racine, cheminCommande(installe)), { force: true });
  fs.rmSync(path.join(racine, PROVENANCE, nom), { recursive: true, force: true });

  console.log(
    [
      `Plug-in ${nom} ${installation.version ?? '(sans version)'} retiré — ${skills.length} skill(s), ` +
        `${commandes.length} commande(s), et sa provenance.`,
      '',
      ...[...skills, ...commandes].map(({ installe }) => `  /${installe}`),
      '',
      '  Ce qui le cite ailleurs dans le dépôt (CLAUDE.md, un document) reste à relire à la main.',
    ].join('\n'),
  );
}

let ouverture = null;

function installer({ source, racine, prefixe: prefixeDemande, manuel: manuelDemande, licence: licenceDemandee }) {
  ouverture = ouvrir(source);
  const racinePlugin = racineDuPlugin(ouverture.dossier);
  refuserLesLiens(racinePlugin);
  const manifeste = lireManifeste(racinePlugin);
  const precedente = installationPrecedente(racine, manifeste.name);
  // Le préfixe demandé l'emporte ; sinon celui de la dernière installation, pour qu'une mise à
  // jour ne renomme rien ; sinon le nom du plug-in.
  const prefixe = prefixeDemande ?? precedente?.prefixe ?? manifeste.name;
  if (!NOM.test(prefixe)) refuser(`--prefixe : « ${prefixe} » n’est pas un préfixe valide (minuscules, chiffres, tirets).`);
  const manuel = manuelDemande ?? precedente?.manuel ?? false;
  const inventaire = { ...inventorier(racinePlugin, manifeste, prefixe), manuel };
  const plan = planifier(inventaire, racine, precedente, licenceDemandee);
  const ecritures = preparer(inventaire, racinePlugin);
  const remarques = aRelire(ecritures, inventaire);
  ecrire(ecritures, inventaire, plan, racine, racinePlugin, ouverture, source);
  rendreCompte(inventaire, plan, remarques, ecritures);
}

try {
  const demande = lireArguments(process.argv.slice(2));
  if (demande.retirer) retirerLePlugin(demande.racine, demande.retirer);
  else installer(demande);
} catch (erreur) {
  if (!(erreur instanceof Refus)) throw erreur;
  console.error(`Refusé : ${erreur.message}`);
  process.exitCode = 1;
} finally {
  if (ouverture?.temporaire) fs.rmSync(ouverture.temporaire, { recursive: true, force: true });
}
