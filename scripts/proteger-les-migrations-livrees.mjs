#!/usr/bin/env node
// Hook `PreToolUse` de Claude Code, déclaré dans `.claude/settings.json` sur Edit, Write et
// MultiEdit : **refuse de modifier une migration déjà livrée**, et laisse écrire celle qu'on est
// en train d'écrire.
//
// Pourquoi. Une migration livrée a été appliquée au projet distant, et c'est son fichier qu'une
// restauration rejoue. Le retoucher ne change rien à la base de production ; le fichier, lui, ne
// décrit plus ce que la base a vécu. Et la retouche la plus probable est la plus dangereuse :
// « corriger la fonction » dans le fichier qui l'a créée, au lieu d'écrire une migration neuve
// partie de `pg_get_functiondef` — des migrations postérieures ont pu la modifier depuis
// (SUPABASE.md §2.3). CLAUDE.md l'interdisait, et rien ne l'empêchait (27/09/2026, audit du dépôt
// par le plug-in claude-code-setup, joué sans être installé).
//
// **« Livrée » veut dire présente dans `origin/main`, pas présente sur le disque.** Une migration
// s'écrit en plusieurs retouches — la base locale refuse une ligne, pgTAP en attrape une autre —,
// et refuser celles-là aussi aurait appris à contourner le hook par le shell. Tant qu'elle n'est
// que sur la branche, elle se retouche ; si elle a déjà été appliquée au distant, la retouche s'y
// rejoue (SUPABASE.md §2.3), et c'est à qui l'écrit de le savoir. `main` sert de repli quand
// `origin/main` manque ; quand aucune des deux ne se lit, un fichier qui existe est refusé — on ne
// sait pas, donc on ne laisse pas passer — et une création passe.
//
// Ce que ce hook ne voit pas, et qu'il ne faut pas lui prêter : une modification par le shell
// (`sed -i`, `git mv`, une redirection), par un humain, ou dans une session qui ne l'a pas chargé.
// Il attrape la faute d'inattention d'un agent qui passe par Edit ou Write ; ce n'est pas une
// interdiction. La seule retouche d'une migration livrée de toute l'histoire du dépôt
// (`20260917094500_classement_du_plan.sql`, le 17/09/2026, pour qu'elle rejoue juste sur une base
// restaurée) était délibérée : c'est une décision à poser à la personne qui pilote, pas un Edit.
//
// Le contrat de Claude Code : le JSON de l'appel arrive sur l'entrée standard ; la sortie 2 bloque
// l'outil et rend l'erreur standard à l'agent ; 0 laisse passer. Une entrée illisible sort en 1 :
// l'outil passe — un hook cassé ne doit pas bloquer toute écriture du dépôt — et l'erreur se lit.
// Éprouvé par `scripts/proteger-les-migrations-livrees.test.ts`, mutations datées en tête.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS = /^supabase\/migrations\/[^/]+$/;
// Dans l'ordre : la première qui se lit décide.
const REFERENCES = ['origin/main', 'main'];

const posix = (chemin) => chemin.split(path.sep).join('/');

function git(dossier, ...args) {
  const r = spawnSync('git', ['-C', dossier, ...args], { encoding: 'utf8' });
  return { ok: r.status === 0, sortie: (r.stdout ?? '').trim() };
}

function refuser(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

let entree;
try {
  entree = JSON.parse(fs.readFileSync(0, 'utf8'));
} catch (e) {
  process.stderr.write(`proteger-les-migrations-livrees : entrée illisible (${e.message}), l'outil passe sans contrôle.\n`);
  process.exit(1);
}

const demande = entree?.tool_input?.file_path;
if (typeof demande !== 'string' || demande === '') process.exit(0);

const base = typeof entree.cwd === 'string' && entree.cwd !== '' ? entree.cwd : process.cwd();
const fichier = path.resolve(base, demande);

// Filtre sans git : presque tous les appels s'arrêtent ici.
if (!/\/supabase\/migrations\/[^/]+$/.test(posix(fichier))) process.exit(0);

const existe = fs.existsSync(fichier);
const dossier = path.dirname(fichier);
const racine = fs.existsSync(dossier) ? git(dossier, 'rev-parse', '--show-toplevel') : { ok: false, sortie: '' };

function nePasSavoir(raison) {
  // Une création passe : il n'y a rien à protéger dans un fichier qui n'existe pas encore.
  if (!existe) process.exit(0);
  refuser(
    `Refusé : impossible de savoir si ${fichier} est une migration livrée — ${raison}. ` +
      'Tant qu’on ne le sait pas, un fichier de migration existant ne se modifie pas.',
  );
}

if (!racine.ok || racine.sortie === '') nePasSavoir(`${dossier} n’est dans aucun dépôt git`);

// Le chemin se compare depuis la racine du dépôt — celle de la copie de travail, s'il s'agit d'un
// worktree de sous-agent — et en chemins réels des deux côtés : un lien symbolique sur l'un
// (`/tmp` sous macOS) ferait sortir `path.relative` du dépôt.
const relatif = posix(
  path.relative(fs.realpathSync(racine.sortie), path.join(fs.realpathSync(dossier), path.basename(fichier))),
);
// `docs/supabase/migrations/x` passe le filtre du dessus sans être le dossier des migrations.
if (!MIGRATIONS.test(relatif)) process.exit(0);

const reference = REFERENCES.find((r) => git(racine.sortie, 'rev-parse', '--verify', '--quiet', `${r}^{commit}`).ok);
if (!reference) {
  nePasSavoir(`ni origin/main ni main ne se lisent dans ${racine.sortie} (\`git fetch origin main\` règle le cas courant)`);
}

if (git(racine.sortie, 'cat-file', '-e', `${reference}:${relatif}`).ok) {
  refuser(
    [
      `Refusé : ${relatif} est une migration livrée (présente dans ${reference}), et une migration livrée ne se modifie pas.`,
      'Le projet distant l’a déjà appliquée, et c’est ce fichier qu’une restauration rejoue : le retoucher ne change rien à la base, mais il ne décrirait plus ce qu’elle a vécu.',
      'À la place : écris une migration neuve dans supabase/migrations/. Pour changer une fonction, pars de pg_get_functiondef sur le distant, jamais du fichier qui l’a créée — des migrations postérieures ont pu la modifier (SUPABASE.md §2.3).',
      'Si c’est le fichier lui-même qui est faux pour une restauration (précédent du 17/09/2026), c’est une décision à poser à la personne qui pilote avant d’écrire quoi que ce soit.',
    ].join('\n'),
  );
}

process.exit(0);
