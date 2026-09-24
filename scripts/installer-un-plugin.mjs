// Installe un plug-in Claude Code dans le dépôt, depuis son archive `.zip` ou son dossier.
//
//   node scripts/installer-un-plugin.mjs <archive.zip | dossier> [--racine <dépôt>]
//
// **Pourquoi à la main : claude.ai ne livre pas les plug-ins aux sessions cloud.** Constaté le
// 24/09/2026 : Product Management activé sur le compte, et la session ne le voyait pas — liste des
// plug-ins du compte vide, catalogue « non activé », dossier de synchronisation vide. Le dépôt est
// la seule chose qu'une session cloud est sûre d'emporter ; c'est donc là que les plug-ins vivent,
// et CLAUDE.md dit comment on s'en sert.
//
// Relancer le script sur une archive plus récente du même plug-in le met à jour : ce qu'il avait
// posé est retiré d'abord, donc un skill disparu en amont disparaît aussi d'ici.
//
// **Trois règles, et chacune répond à un défaut qu'on aurait eu sans elle :**
//
//   1. **Tout nom installé est préfixé par celui du plug-in.** Marketing et Product Management
//      portent tous deux `competitive-brief`, et Engineering apporte `code-review`, le nom du
//      `/code-review` intégré : sans préfixe, le nom d'un skill dépendrait de l'ordre
//      d'installation. **C'est le DOSSIER qui nomme le skill, pas le champ `name` de son en-tête**
//      — mesuré le 24/09/2026 (Claude Code 2.1.281) : un dossier `essai-dossier` dont l'en-tête
//      dit `essai-entete` s'est présenté sous le premier nom. Le champ est réécrit quand même,
//      pour que les deux ne se contredisent pas : le jour où un outil lirait l'autre, le préfixe
//      tiendrait encore. **Et les renvois suivent** : une consigne qui propose « → `/write-spec` »
//      enverrait sinon vers une commande qui n'existe pas ici — Product Management en portait sur
//      treize lignes, relevées à sa première installation. Les liens relatifs aussi : chacun de
//      ses skills renvoie à `../../CONNECTORS.md`, qui mène désormais à la copie gardée avec la
//      provenance au lieu d'un `.claude/CONNECTORS.md` qui n'existe pas.
//   2. **Hooks, connecteurs et agents ne sont jamais installés par ce script.** Un hook exécute du
//      code à chaque événement de la session, un connecteur ouvre l'accès à un compte tiers, un
//      agent choisit ses outils : chacun est une décision, prise à la main après lecture. Ils sont
//      listés dans `installation.json` et dans la sortie, pour qu'aucun ne se perde en silence. Un
//      skill ou une commande qui déclare des hooks dans son en-tête est refusé, pour la même raison.
//   3. **Rien n'est écrit tant que tout n'a pas été vérifié** — entrées d'archive qui sortiraient
//      de leur dossier, liens symboliques, en-têtes illisibles, collisions de noms. Un refus laisse
//      le dépôt tel qu'il était.
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

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const USAGE = 'Usage : node scripts/installer-un-plugin.mjs <archive.zip | dossier> [--racine <dépôt>]';

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

/** Ce qui se lit sans s'installer. Le README d'amont n'est pas gardé : il documente les noms
 * d'avant le préfixe, donc il se tromperait sur chaque commande qu'il cite. */
const A_IGNORER = /^(README|CHANGELOG)(\.[a-z]+)?$/i;

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
  const args = [...argv];
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--racine') {
      const valeur = args.shift();
      if (!valeur) refuser('--racine attend un dossier.');
      racine = path.resolve(valeur);
    } else if (arg.startsWith('-')) {
      refuser(`option inconnue : ${arg}\n${USAGE}`);
    } else if (source === null) {
      source = path.resolve(arg);
    } else {
      refuser(`une seule archive à la fois.\n${USAGE}`);
    }
  }
  if (source === null) refuser(USAGE);
  if (!fs.existsSync(source)) refuser(`introuvable : ${source}`);
  return { source, racine };
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

/** Lit l'en-tête d'un fichier de consignes et refuse ce que la règle 2 interdit. */
function lireConsignes(fichier, racinePlugin) {
  const relatif = path.relative(racinePlugin, fichier);
  const entete = enTete(fs.readFileSync(fichier, 'utf8'));
  if (entete === null) refuser(`${relatif} n’a pas d’en-tête (--- … ---) : Claude Code ne le lirait pas.`);
  if (ligneDuChamp(entete, 'hooks') !== -1) {
    refuser(`${relatif} déclare des hooks dans son en-tête : ils s’exécuteraient à chaque usage (règle 2).`);
  }
  return entete;
}

function nomInstalle(prefixe, nom, ou) {
  if (!NOM.test(nom)) refuser(`${ou} : « ${nom} » n’est pas un nom valide (minuscules, chiffres, tirets).`);
  const installe = `${prefixe}-${nom}`;
  if (installe.length > LONGUEUR_MAX) refuser(`${ou} : « ${installe} » dépasse ${LONGUEUR_MAX} caractères.`);
  return installe;
}

function inventorier(racinePlugin) {
  let manifeste;
  try {
    manifeste = JSON.parse(fs.readFileSync(path.join(racinePlugin, '.claude-plugin', 'plugin.json'), 'utf8'));
  } catch (erreur) {
    refuser(`.claude-plugin/plugin.json illisible : ${erreur.message}`);
  }
  const prefixe = manifeste.name;
  if (typeof prefixe !== 'string' || !NOM.test(prefixe)) {
    refuser(`plugin.json : « ${prefixe} » n’est pas un nom de plug-in valide (minuscules, chiffres, tirets).`);
  }
  // Un manifeste peut déplacer ses skills et ses commandes. Le script ne sait lire que leur place
  // par défaut : les chercher ailleurs à moitié serait pire que de refuser.
  for (const cle of ['skills', 'commands']) {
    if (manifeste[cle] !== undefined) refuser(`plugin.json déclare ses propres chemins « ${cle} » : cas non géré, à installer à la main.`);
  }

  const nonInstalle = { hooks: [], connecteurs: [], agents: [], autres: [] };
  const skills = [];
  const commandes = [];
  const gardes = [];

  for (const entree of fs.readdirSync(racinePlugin, { withFileTypes: true })) {
    if (CONNUES.has(entree.name)) continue;
    if (A_GARDER.test(entree.name) && entree.isFile()) gardes.push(entree.name);
    else if (!A_IGNORER.test(entree.name)) nonInstalle.autres.push(entree.name);
  }

  const sous = (nom) => path.join(racinePlugin, nom);

  if (fs.existsSync(sous('skills'))) {
    for (const entree of fs.readdirSync(sous('skills'), { withFileTypes: true })) {
      const dossier = path.join(sous('skills'), entree.name);
      const fichier = path.join(dossier, 'SKILL.md');
      if (!entree.isDirectory() || !fs.existsSync(fichier)) {
        nonInstalle.autres.push(`skills/${entree.name}`);
        continue;
      }
      // Le nom d'amont est celui du dossier, pas celui de l'en-tête : c'est lui que Claude Code
      // présente (règle 1), donc c'est lui que la personne a pu lire ou taper ailleurs.
      lireConsignes(fichier, racinePlugin);
      const nom = entree.name;
      skills.push({ amont: nom, installe: nomInstalle(prefixe, nom, `skills/${entree.name}`), dossier });
    }
  }

  if (fs.existsSync(sous('commands'))) {
    for (const entree of fs.readdirSync(sous('commands'), { withFileTypes: true })) {
      const fichier = path.join(sous('commands'), entree.name);
      if (!entree.isFile() || !entree.name.endsWith('.md')) {
        nonInstalle.autres.push(`commands/${entree.name}`);
        continue;
      }
      lireConsignes(fichier, racinePlugin);
      const nom = entree.name.slice(0, -'.md'.length);
      commandes.push({ amont: nom, installe: nomInstalle(prefixe, nom, `commands/${entree.name}`), fichier });
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

  if (fs.existsSync(sous('agents'))) {
    parcourir(sous('agents'), (chemin, entree) => {
      if (entree.isFile()) nonInstalle.agents.push(path.relative(sous('agents'), chemin).replace(/\.md$/, ''));
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
  return { manifeste, prefixe, skills: skills.sort(parNom), commandes: commandes.sort(parNom), gardes: gardes.sort(), nonInstalle };
}

const echapper = (texte) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ce qui suit un nom pour qu'il soit un renvoi entier : `/write-spec`, `` `/write-spec` `` ou
 * `/write-spec $ARGUMENTS`, mais jamais le début de `/write-spec-bis` ni de `/write-spec/`. */
const FIN_DE_NOM = '(?=$|[\\s`\'")\\],.;:!?])';

/** Réécrit les renvois aux noms d'amont — `/write-spec` et `product-management:write-spec`
 * deviennent `/product-management-write-spec`. Sans elle, une consigne qui propose « → `/write-spec` »
 * enverrait vers une commande qui n'existe pas ici. Un renvoi n'est reconnu qu'isolé :
 * `skills/write-spec/` est un chemin, il reste tel quel et `aRelire` le signale. */
function reecrireLesRenvois(texte, inventaire) {
  let resultat = texte;
  for (const { amont, installe } of [...inventaire.skills, ...inventaire.commandes]) {
    resultat = resultat
      .replace(new RegExp(`(^|[\\s\`'"(\\[])/${echapper(amont)}${FIN_DE_NOM}`, 'gm'), `$1/${installe}`)
      .replace(
        new RegExp(`(^|[^a-z0-9-])${echapper(inventaire.prefixe)}:${echapper(amont)}${FIN_DE_NOM}`, 'gm'),
        `$1${installe}`,
      );
  }
  return resultat;
}

/** Où un fichier du plug-in se retrouve une fois installé, relatif à la racine du dépôt — ou
 * `null` s'il ne s'installe pas. C'est la table qui permet de recalculer un lien relatif. */
function destination(relatif, inventaire) {
  const [tete, nom, ...reste] = relatif.split('/');
  if (tete === 'skills') {
    const skill = inventaire.skills.find((element) => element.amont === nom);
    return skill && reste.length > 0 ? path.posix.join('.claude/skills', skill.installe, ...reste) : null;
  }
  if (tete === 'commands' && reste.length === 0) {
    const commande = inventaire.commandes.find((element) => `${element.amont}.md` === nom);
    return commande ? `.claude/commands/${commande.installe}.md` : null;
  }
  if (relatif === '.claude-plugin/plugin.json' || (nom === undefined && inventaire.gardes.includes(tete))) {
    return path.posix.join(PROVENANCE, inventaire.prefixe, path.posix.basename(relatif));
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

/** Le champ `name` de l'en-tête, réécrit au nom installé (règle 1). */
function renommerLeChamp(texte, installe) {
  const entete = enTete(texte);
  const index = ligneDuChamp(entete, 'name');
  const ligne = `name: ${installe}`;
  if (index === -1) entete.lignes.splice(1, 0, ligne);
  else entete.lignes[index] = entete.lignes[index].endsWith('\r') ? `${ligne}\r` : ligne;
  return entete.lignes.join('\n');
}

/** Un fichier modifié porte un avis qui le dit : Apache 2.0 l'exige de qui redistribue un fichier
 * changé, et c'est ce qui permet de savoir, en le lisant, qu'il n'est plus celui d'amont. */
function marquer(original, modifie, inventaire) {
  if (modifie === original) return original;
  const { name, version = 'sans version' } = inventaire.manifeste;
  return (
    `${modifie.replace(/\n*$/, '\n')}\n<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : ` +
    `noms préfixés par « ${name}- » (champ name, renvois aux commandes) et liens relatifs recalculés. ` +
    `Plug-in ${name} ${version} ; ` +
    `licence et provenance dans ${PROVENANCE}/${name}/. -->\n`
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
    ecritures.push({ origine, cible, texte: marquer(original, modifie, inventaire), liensMorts: contexte.morts });
  };
  for (const skill of inventaire.skills) {
    parcourir(skill.dossier, (chemin, entree) => {
      if (!entree.isFile()) return;
      const relatif = path.relative(skill.dossier, chemin).split(path.sep).join('/');
      const cible = path.posix.join('.claude/skills', skill.installe, relatif);
      if (relatif === 'SKILL.md') consignes(chemin, cible, (texte) => renommerLeChamp(texte, skill.installe));
      else if (chemin.endsWith('.md')) consignes(chemin, cible);
      else ecritures.push({ origine: chemin, cible, texte: null, liensMorts: [] });
    });
  }
  for (const commande of inventaire.commandes) {
    consignes(commande.fichier, `.claude/commands/${commande.installe}.md`);
  }
  return ecritures;
}

/** Ce qui, dans ce qu'on s'apprête à installer, mérite d'être relu : les fichiers qui ne sont pas
 * des consignes, les lignes suspectes, et les noms d'amont que la réécriture n'a pas reconnus
 * comme des renvois — un chemin `skills/write-spec/`, par exemple. */
function aRelire(ecritures, inventaire) {
  const amonts = [...inventaire.skills, ...inventaire.commandes].map((element) => element.amont);
  const remarques = [];
  for (const { cible, texte, liensMorts } of ecritures) {
    if (texte === null) {
      remarques.push(`${cible} — n’est pas un fichier de consignes : lire ce qu’il fait`);
      continue;
    }
    for (const lien of liensMorts) remarques.push(`${cible} (lien vers un fichier qui ne s’installe pas) — ${lien}`);
    texte.split('\n').forEach((ligne, index) => {
      const raisons = A_REGARDER.filter(([motif]) => motif.test(ligne)).map(([, raison]) => raison);
      if (ligne.includes(`${inventaire.prefixe}:`) || amonts.some((nom) => ligne.includes(`/${nom}`))) {
        raisons.push('nom d’amont resté tel quel');
      }
      if (raisons.length > 0) {
        remarques.push(`${cible}:${index + 1} (${raisons.join(', ')}) — ${ligne.trim().slice(0, 120)}`);
      }
    });
  }
  return remarques;
}

function existe(chemin) {
  return fs.lstatSync(chemin, { throwIfNoEntry: false }) !== undefined;
}

/** Ce que l'installation écrira et retirera — calculé entièrement avant la première écriture. */
function planifier(inventaire, racine) {
  const provenance = path.join(racine, PROVENANCE, inventaire.prefixe);
  const cheminSkill = (nom) => path.join('.claude', 'skills', nom);
  const cheminCommande = (nom) => path.join('.claude', 'commands', `${nom}.md`);

  // Ce que la version précédente avait posé est à nous : on le remplace sans que ce soit une
  // collision. `installation.json` est la seule source de cette liste.
  const fichierPrecedent = path.join(provenance, 'installation.json');
  const precedente = existe(fichierPrecedent) ? JSON.parse(fs.readFileSync(fichierPrecedent, 'utf8')) : null;
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
  return { provenance, aRetirer, precedente };
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

  const installation = {
    plugin: inventaire.prefixe,
    version: inventaire.manifeste.version ?? null,
    source: path.basename(source),
    sha256: ouverture.sha256,
    installe_le: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }),
    installe_par: 'scripts/installer-un-plugin.mjs',
    skills: inventaire.skills.map(({ amont, installe }) => ({ amont, installe })),
    commandes: inventaire.commandes.map(({ amont, installe }) => ({ amont, installe })),
    non_installe: inventaire.nonInstalle,
  };
  fs.writeFileSync(path.join(plan.provenance, 'installation.json'), `${JSON.stringify(installation, null, 2)}\n`);
}

function rendreCompte(inventaire, plan, remarques) {
  const { manifeste } = inventaire;
  const lignes = [`Plug-in ${manifeste.name} ${manifeste.version ?? '(sans version)'} installé.`, ''];
  if (plan.precedente) lignes.push(`  Remplace la version ${plan.precedente.version ?? '(sans version)'}.`, '');
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
  lignes.push('', `  Provenance : ${PROVENANCE}/${inventaire.prefixe}/`);
  console.log(lignes.join('\n'));
}

let ouverture = null;
try {
  const { source, racine } = lireArguments(process.argv.slice(2));
  ouverture = ouvrir(source);
  const racinePlugin = racineDuPlugin(ouverture.dossier);
  refuserLesLiens(racinePlugin);
  const inventaire = inventorier(racinePlugin);
  const plan = planifier(inventaire, racine);
  const ecritures = preparer(inventaire, racinePlugin);
  const remarques = aRelire(ecritures, inventaire);
  ecrire(ecritures, inventaire, plan, racine, racinePlugin, ouverture, source);
  rendreCompte(inventaire, plan, remarques);
} catch (erreur) {
  if (!(erreur instanceof Refus)) throw erreur;
  console.error(`Refusé : ${erreur.message}`);
  process.exitCode = 1;
} finally {
  if (ouverture?.temporaire) fs.rmSync(ouverture.temporaire, { recursive: true, force: true });
}
