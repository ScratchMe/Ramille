#!/usr/bin/env node
// **Une migration livrée n'a-t-elle été ni modifiée, ni supprimée, ni renommée ?** La garde de CI
// que `v1-27` §12.18 décrivait, écrite le 29/09/2026.
//
//   node scripts/verifier-migrations-livrees.mjs
//
// Pourquoi. Une migration livrée a été appliquée au projet distant, et c'est son fichier qu'une
// restauration rejoue : le retoucher ne change rien à la base de production, mais le fichier ne
// décrit plus ce qu'elle a vécu (SUPABASE.md §2.3). Le hook `proteger-les-migrations-livrees.mjs`
// le refuse à Edit et à Write, et à eux seuls — le shell (`sed -i`, `git mv`, une redirection), un
// humain et une session qui n'a pas chargé `.claude/settings.json` passent. La CI ne voyait rien
// non plus : elle reconstruit la base depuis les fichiers, donc un fichier livré réécrit y passe au
// vert. Cette garde voit tous les chemins d'écriture à la fois, parce qu'elle compare le résultat.
//
// **Ce qu'elle compare.** La copie de travail à la base de fusion de `HEAD` avec `origin/main`
// (`main` en repli), sur `supabase/migrations/` : tout fichier qui existait à la base et qui est
// modifié (`M`), change de type (`T`) ou disparaît (`D`) est refusé. Les renommages sont lus comme
// une suppression suivie d'un ajout (`--no-renames`) : c'est la suppression qui compte, et la
// détection de renommage de git, heuristique, ne décide ainsi de rien. Un ajout passe toujours.
// La copie de travail et non `HEAD` : en local, une retouche pas encore commise se voit aussi ; en
// CI, les deux sont égales.
//
// **En CI**, le travail `checks` fait un `checkout` à `fetch-depth: 0` pour que `origin/main` existe.
// Sur une PR, `HEAD` est le commit de fusion que GitHub prépare, donc la base de fusion est la
// pointe de `main` qu'elle fusionne : la garde voit exactement ce que la PR change. Sur un push sur
// `main`, `HEAD` est `origin/main`, il n'y a rien à comparer, et la garde le dit — ce qu'elle garde
// est la PR, qui a déjà tourné. **Une référence illisible fait sortir en 1, jamais en 0** : sans
// elle on ne sait pas ce qui est livré, et un `fetch-depth` retiré du `checkout` doit rougir, pas
// passer.
//
// **L'exception existe, et elle décrit une retouche, pas un fichier.** Le précédent du 17/09/2026
// (`20260917094500_classement_du_plan.sql`, retouché pour qu'il rejoue juste sur une base
// restaurée) était voulu, et une garde sans issue pour la décision rare apprend à la contourner.
// `supabase/retouches-de-migrations-livrees.json` est le journal des retouches acceptées : chacune
// nomme le fichier, le geste (`modifiee` ou `supprimee`), sa date, la décision qui l'autorise et sa
// raison — et, pour une modification, l'**empreinte git du contenu accepté** (`git hash-object`).
// Une retouche suivante du même fichier change l'empreinte et rougit de nouveau : le fichier n'est
// jamais ouvert pour de bon. Le journal ne se vide pas après la fusion — une entrée n'est plus
// empruntée une fois sa retouche sur `main`, et c'est normal : elle reste la trace de la décision.
// Le chemin complet de l'exception, et qui la décide : SUPABASE.md §2.3.
//
// Ce qu'elle ne voit pas, et qu'il ne faut pas lui prêter : une modification poussée directement
// sur `main` sans PR (le push n'a rien à comparer), et une migration appliquée au distant sans être
// livrée dans le dépôt — c'est l'autre moitié de `v1-27` §9, que rien d'ici ne lit.
//
// Sortie : 0 si aucune migration livrée n'est retouchée hors du journal ; 1 sinon, ou si la base de
// comparaison ou le journal ne se lisent pas. Éprouvé par `scripts/verifier-migrations-livrees.test.ts`,
// mutations datées en tête.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DOSSIER = 'supabase/migrations';
const JOURNAL = 'supabase/retouches-de-migrations-livrees.json';
// Dans l'ordre : la première qui se lit décide. Même liste que le hook.
const REFERENCES = ['origin/main', 'main'];
const GESTES = ['modifiee', 'supprimee'];

function git(dossier, ...args) {
  const r = spawnSync('git', ['-C', dossier, ...args], { encoding: 'utf8' });
  return { ok: r.status === 0, sortie: r.stdout ?? '', erreur: (r.stderr ?? '').trim() };
}

function echouer(lignes) {
  console.error(lignes.join('\n'));
  process.exit(1);
}

const racine = git(process.cwd(), 'rev-parse', '--show-toplevel');
if (!racine.ok) echouer([`verifier-migrations-livrees : ${process.cwd()} n’est dans aucun dépôt git.`]);
const depot = racine.sortie.trim();

const reference = REFERENCES.find((r) => git(depot, 'rev-parse', '--verify', '--quiet', `${r}^{commit}`).ok);
if (!reference) {
  echouer([
    'verifier-migrations-livrees : ni origin/main ni main ne se lisent — impossible de savoir ce qui est livré.',
    'En CI, le `checkout` du travail `checks` doit porter `fetch-depth: 0` ; en local, `git fetch origin main` règle le cas courant.',
  ]);
}
const base = git(depot, 'merge-base', 'HEAD', reference);
if (!base.ok) {
  echouer([`verifier-migrations-livrees : pas de base de fusion entre HEAD et ${reference} (${base.erreur || 'historique tronqué ?'}).`]);
}
const commitDeBase = base.sortie.trim();

/** Le journal des retouches acceptées, validé entrée par entrée : une entrée mal formée n'excuse rien. */
function lireLeJournal() {
  const chemin = path.join(depot, JOURNAL);
  if (!fs.existsSync(chemin)) return [];
  let contenu;
  try {
    contenu = JSON.parse(fs.readFileSync(chemin, 'utf8'));
  } catch (e) {
    echouer([`verifier-migrations-livrees : ${JOURNAL} est illisible (${e.message}).`]);
  }
  const retouches = contenu?.retouches;
  if (!Array.isArray(retouches)) echouer([`verifier-migrations-livrees : ${JOURNAL} doit porter une liste \`retouches\`.`]);
  const fautes = [];
  retouches.forEach((r, i) => {
    const ou = `retouches[${i}]`;
    if (typeof r?.fichier !== 'string' || !new RegExp(`^${DOSSIER}/[^/]+$`).test(r.fichier)) {
      fautes.push(`${ou} : \`fichier\` doit être un chemin de ${DOSSIER}/, depuis la racine du dépôt.`);
    }
    if (!GESTES.includes(r?.geste)) fautes.push(`${ou} : \`geste\` vaut ${GESTES.map((g) => `« ${g} »`).join(' ou ')}.`);
    if (typeof r?.date !== 'string' || !/^\d{2}\/\d{2}\/\d{4}$/.test(r.date)) fautes.push(`${ou} : \`date\` s’écrit JJ/MM/AAAA.`);
    for (const champ of ['decision', 'raison']) {
      if (typeof r?.[champ] !== 'string' || r[champ].trim() === '') fautes.push(`${ou} : \`${champ}\` est obligatoire, et c’est la trace.`);
    }
    if (r?.geste === 'modifiee' && (typeof r?.empreinte !== 'string' || !/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(r.empreinte))) {
      fautes.push(`${ou} : une modification porte l’\`empreinte\` du contenu accepté (\`git hash-object <fichier>\`).`);
    }
    if (r?.geste === 'supprimee' && r?.empreinte !== undefined) {
      fautes.push(`${ou} : une suppression ne porte pas d’empreinte — il n’y a plus de contenu.`);
    }
  });
  if (fautes.length > 0) echouer([`verifier-migrations-livrees : ${JOURNAL} est mal formé :`, ...fautes.map((f) => `  - ${f}`)]);
  return retouches;
}

const journal = lireLeJournal();

// `-z` : un nom de fichier avec une espace ou un accent n'est ni échappé ni coupé.
const diff = git(depot, 'diff', '--no-renames', '--name-status', '-z', commitDeBase, '--', `${DOSSIER}/`);
if (!diff.ok) echouer([`verifier-migrations-livrees : git diff a échoué (${diff.erreur}).`]);
const champs = diff.sortie.split('\0').filter((c) => c !== '');
const changements = [];
for (let i = 0; i + 1 < champs.length; i += 2) changements.push({ statut: champs[i], fichier: champs[i + 1] });

const touchees = changements.filter((c) => ['M', 'T', 'D'].includes(c.statut[0]));
const ajoutees = changements.filter((c) => c.statut[0] === 'A');
const acceptees = [];
const refusees = [];
for (const c of touchees) {
  const geste = c.statut[0] === 'D' ? 'supprimee' : 'modifiee';
  const empreinte = geste === 'modifiee' ? git(depot, 'hash-object', '--', c.fichier).sortie.trim() : undefined;
  const entree = journal.find((r) => r.fichier === c.fichier && r.geste === geste && (geste === 'supprimee' || r.empreinte === empreinte));
  if (entree) acceptees.push({ ...c, entree });
  else refusees.push({ ...c, geste, empreinte });
}

const courte = commitDeBase.slice(0, 7);
if (refusees.length > 0) {
  echouer([
    `Des migrations livrées (présentes à la base de fusion avec ${reference}, ${courte}) sont retouchées :`,
    ...refusees.map((r) => `  - ${r.fichier} : ${r.geste === 'supprimee' ? 'supprimée ou renommée' : `modifiée (empreinte ${r.empreinte})`}`),
    '',
    'Une migration livrée ne se modifie pas : le projet distant l’a appliquée, et c’est ce fichier qu’une restauration rejoue.',
    'À la place : une migration neuve. Pour changer une fonction, pars de pg_get_functiondef sur le distant (SUPABASE.md §2.3).',
    `Si la retouche est voulue, elle se décide avec la personne qui pilote, puis s’inscrit dans ${JOURNAL}`,
    'avec son empreinte, sa date, la décision et sa raison — le chemin complet est en SUPABASE.md §2.3.',
  ]);
}

if (commitDeBase === git(depot, 'rev-parse', 'HEAD').sortie.trim() && changements.length === 0) {
  console.log(`Migrations livrées : HEAD est ${reference} (${courte}), rien à comparer.`);
} else {
  console.log(
    `Migrations livrées : aucune retouche hors du journal par rapport à ${reference} (${courte}) — ` +
      `${ajoutees.length} ajoutée(s), ${acceptees.length} retouche(s) acceptée(s) par le journal.`,
  );
  for (const a of acceptees) console.log(`  - ${a.fichier} : ${a.entree.geste}, décidée le ${a.entree.date} (${a.entree.decision})`);
}
