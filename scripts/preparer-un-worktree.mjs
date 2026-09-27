#!/usr/bin/env node
// Prépare la copie de travail (git worktree) d'un sous-agent, et vérifie qu'elle part du bon commit.
//
//   node <copie principale>/scripts/preparer-un-worktree.mjs <commit attendu>
//
// Le sous-agent le lance **depuis sa copie**, avant tout le reste : le script agit sur la copie du
// répertoire courant, pas sur celle où il est rangé. On l'appelle donc depuis la copie principale,
// qui l'a toujours, même quand la copie du sous-agent est partie d'un `main` qui ne l'a pas encore.
//
// Ce qu'il règle : ce que CLAUDE.md décrit d'une copie de travail (« Et une vague confiée à des
// sous-agents en worktrees… »), plus le commit de départ, relevé le 27/09/2026.
//
// 1. **Le commit de départ.** Sans réglage, une copie part d'`origin/main` (`worktree.baseRef`
//    vaut `fresh` par défaut), et non de la branche de travail : c'était le cas des six copies des
//    24 et 25/09/2026, et un sous-agent a dû se recaler seul sur le commit que sa consigne nommait.
//    Depuis le 27/09/2026, `.claude/settings.json` porte `worktree.baseRef: "head"` et la copie part
//    du HEAD local. Le script le vérifie quand même, parce qu'un réglage ne se voit pas : si la copie
//    n'a pas le commit attendu, il l'y avance (`git merge --ff-only`) quand c'est une simple avance
//    et qu'aucun fichier suivi n'est modifié, et refuse sinon, en disant pourquoi — il ne réécrit
//    jamais le travail d'un sous-agent. Un fichier **non suivi** ne l'arrête pas : il ne gêne une
//    avance que s'il serait écrasé, et git le refuse alors lui-même.
// 2. **`node_modules`.** Une copie n'en a pas. `worktree.symlinkDirectories` le lie depuis la copie
//    principale ; à défaut, le script pose le lien lui-même. Ce lien est ignoré par git parce que
//    `.gitignore` écrit `node_modules` sans barre finale : avec elle, il ne désignait qu'un dossier,
//    et le lien se lisait comme un fichier non suivi.
//
// Les deux réglages ont été mesurés le 27/09/2026 sur un vrai sous-agent en copie de travail : sa
// copie était partie du HEAD local, et `node_modules` y était déjà lié. `baseRef` est documenté ;
// `symlinkDirectories` figure au schéma des réglages de cette version, mais pas dans la page en
// ligne sur les worktrees — raison de plus pour garder le repli.
// 3. **`expo-env.d.ts`**, ignoré par git : sans lui, `tsc` échoue sur l'import de `global.css`.
// 4. Ce qu'un script ne peut pas faire à la place de l'agent, il le rappelle en sortant : exporter
//    par `scripts/rejouer-la-ci.mjs export`, qui donne à l'export son propre cache de Metro — à la
//    main, `--clear` ne protège pas d'une autre copie qui exporte en même temps (EXPO.md §1.1) —, et
//    ne toucher à la stack Supabase qu'à travers ce même script, qui la réserve.
//
// Sortie 0 quand la copie est prête ; 1 sur un refus, qui dit quoi faire ; 64 sur un usage fautif.
// Éprouvé par `scripts/preparer-un-worktree.test.ts`, mutations datées en tête.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const USAGE = 'Usage : node <copie principale>/scripts/preparer-un-worktree.mjs <commit attendu>';

function git(dossier, ...args) {
  const r = spawnSync('git', args, { cwd: dossier, encoding: 'utf8' });
  return { ok: r.status === 0, sortie: (r.stdout ?? '').trim(), erreur: (r.stderr ?? '').trim() };
}

function refuser(message) {
  console.error(`Refusé : ${message}`);
  process.exit(1);
}

const attendu = process.argv[2];
if (!attendu || process.argv.length > 3) {
  console.error(USAGE);
  process.exit(64);
}

const haut = git(process.cwd(), 'rev-parse', '--show-toplevel');
if (!haut.ok) refuser(`${process.cwd()} n’est dans aucun dépôt git.`);
const racine = haut.sortie;
const reel = (sortie) => fs.realpathSync(path.resolve(racine, sortie));
const repertoireGit = reel(git(racine, 'rev-parse', '--git-dir').sortie);
const repertoireCommun = reel(git(racine, 'rev-parse', '--git-common-dir').sortie);
if (repertoireGit === repertoireCommun) {
  refuser(`${racine} est la copie principale, pas une copie de travail : ce script prépare celle d’un sous-agent.`);
}
const principale = path.dirname(repertoireCommun);
const court = (sha) => sha.slice(0, 7);

// 1. Le commit de départ.
const cible = git(racine, 'rev-parse', '--verify', '--quiet', `${attendu}^{commit}`);
if (!cible.ok) {
  refuser(
    `le commit ${attendu} est inconnu ici. Les copies partagent les objets de la copie principale : ` +
      'un commit qui ne se lit pas n’a pas été créé — la session principale doit commiter avant de lancer ses sous-agents.',
  );
}
const tete = git(racine, 'rev-parse', 'HEAD').sortie;
if (git(racine, 'merge-base', '--is-ancestor', cible.sortie, 'HEAD').ok) {
  console.log(`✓ la copie contient ${court(cible.sortie)} (HEAD ${court(tete)})`);
} else if (git(racine, 'merge-base', '--is-ancestor', 'HEAD', cible.sortie).ok) {
  if (git(racine, 'status', '--porcelain', '--untracked-files=no').sortie !== '') {
    refuser(
      `la copie est en retard sur ${court(cible.sortie)} et des fichiers suivis y sont modifiés : ` +
        'je ne l’avance pas par-dessus. Commite-les ou mets-les de côté, puis relance.',
    );
  }
  const avance = git(racine, 'merge', '--ff-only', '--quiet', cible.sortie);
  if (!avance.ok) refuser(`l’avance jusqu’à ${court(cible.sortie)} a échoué : ${avance.erreur}`);
  console.log(`✓ copie avancée de ${court(tete)} à ${court(cible.sortie)} — elle était partie d’un commit plus ancien`);
} else {
  refuser(
    `la copie a divergé : HEAD ${court(tete)} ne contient pas ${court(cible.sortie)} et n’en est pas un ancêtre. ` +
      'Elle porte des commits qui ne sont pas sur la branche de travail ; recrée-la plutôt que de la recaler.',
  );
}

// 2. node_modules.
const modules = path.join(racine, 'node_modules');
const present = (() => {
  try {
    return fs.lstatSync(modules);
  } catch {
    return null;
  }
})();
if (present && !fs.existsSync(modules)) {
  refuser(`${modules} est un lien mort. Retire-le (\`rm ${modules}\`), puis relance.`);
} else if (present) {
  console.log(`✓ node_modules présent${present.isSymbolicLink() ? ` (lien vers ${fs.readlinkSync(modules)})` : ''}`);
} else {
  const source = path.join(principale, 'node_modules');
  if (!fs.existsSync(source)) refuser(`la copie principale n’a pas de node_modules : \`npm install\` dans ${principale}.`);
  fs.symlinkSync(source, modules, 'dir');
  console.log(`✓ node_modules lié à ${source}`);
}

// 3. expo-env.d.ts — même contenu que le `postinstall` de package.json.
const expoEnv = path.join(racine, 'expo-env.d.ts');
if (fs.existsSync(expoEnv)) {
  console.log('✓ expo-env.d.ts présent');
} else {
  fs.writeFileSync(expoEnv, '/// <reference types="expo/types" />\n');
  console.log('✓ expo-env.d.ts créé');
}

// 4. Ce qui reste à l'agent.
console.log(
  [
    '',
    `Copie prête : ${racine}`,
    '- Un export se fait par `node scripts/rejouer-la-ci.mjs export`, qui lui donne son propre cache de',
    '  Metro : à la main, `--clear` ne protège pas d’une autre copie qui exporte en même temps.',
    '- La stack Supabase se touche par `node scripts/rejouer-la-ci.mjs base parcours`, qui la réserve —',
    '  jamais `supabase start`, `stop` ni `db reset` à la main.',
    '- `npm test`, jamais `npx jest` : le script force le fuseau.',
  ].join('\n'),
);
