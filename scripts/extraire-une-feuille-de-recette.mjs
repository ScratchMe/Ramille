// Extraire une feuille de recette (`docs/recette/*.md`) vers les données de son artefact.
//
// **Le document est la source, la page n'en est que la copie jouable** (`RECETTE.md` §1.1 et §2.5).
// Recopier ses lignes à la main dans la page a décroché une fois (25/09/2026) ; depuis la feuille du
// 29/09/2026, on régénère au lieu de retoucher. Ce script vivait hors du dépôt, dans le dossier de
// travail d'une session — il a été versé ici le 30/09/2026 (contre-lecture de la PR #299) : un
// conteneur qui redémarre emporte ce dossier, et la séance du lendemain aurait dû le réécrire
// d'après trois lignes de `RECETTE.md`.
//
//   node scripts/extraire-une-feuille-de-recette.mjs <feuille.md>                 → le JSON
//   node scripts/extraire-une-feuille-de-recette.mjs <feuille.md> --page <page>   → la page, données remplacées
//
// La page se relit en entier par l'outil `Artifact` (action `read`) ; ses données sont un seul bloc,
// `<script type="application/json" id="donnees">`, que `--page` remplace — rien d'autre n'est touché.
//
// **Les tableaux se trouvent par leur ancre**, et chaque feuille déclare les siennes
// (`TABLEAUX_PAR_FEUILLE` ci-dessous, par nom de fichier) : la page de son artefact lit ces clés-là.
// Une feuille non déclarée, ou une ancre absente, fait échouer le script en la nommant, plutôt que de
// rendre une page à laquelle il manque un tableau.
//
// **Et depuis le 03/10/2026, une feuille peut déclarer aussi ses textes** (`TEXTES_PAR_FEUILLE`) : une
// liste à puces ou un paragraphe, trouvés par la même ancre. La feuille du build d'octobre a ses
// précautions, ce qu'elle ne joue pas et ce qu'elle ne prouve pas en listes ; recopiées dans la page,
// elles auraient décroché à la première correction d'une contre-lecture, exactement comme une ligne.
import fs from 'node:fs';
import path from 'node:path';

const TABLEAUX_PAR_FEUILLE = {
  'ce-qui-reste-apres-le-29-septembre.md': {
    sujets: '## Pourquoi cette séance',
    calendrier: '## Le calendrier',
    profil1: '### Profil 1',
    pistes: "**Ce qu'il rend**",
    profil2: '### Profil 2',
    contexte: '**Et ce que `/contexte` en fait**',
    comptes: '### Les deux comptes',
  },
  // Écrite le 02/10/2026 : plus de tableau des comptes gardés — la séance crée le sien.
  'ce-qui-reste-apres-le-1er-octobre.md': {
    sujets: '## Pourquoi cette séance',
    calendrier: '## Le calendrier',
    profil1: '### Profil 1',
    pistes: "**Ce qu'il rend**",
    profil2: '### Profil 2',
    contexte: '**Et ce que `/contexte` en fait**',
  },
  // Écrite le 03/10/2026, pour le téléphone : un seul profil, et ses pistes disent le choix qu'elles ouvrent.
  'le-build-d-octobre.md': {
    sujets: '## Pourquoi cette séance',
    calendrier: '## Le calendrier',
    profil: '### Le profil',
    pistes: "**Ce qu'il rend**",
  },
};

/** Facultatif, par feuille : `cle: ['liste' | 'paragraphe', ancre]`. */
const TEXTES_PAR_FEUILLE = {
  'le-build-d-octobre.md': {
    precautions: ['liste', '## Six précautions'],
    rend: ['paragraphe', "**Ce qu'il rend**"],
    pasIci: ['liste', '## Ce qui ne se joue pas ici'],
    pasProuve: ['liste', '## Ce que cette séance ne prouve pas'],
    atterrissent: ['paragraphe', '## Où atterrissent les constats'],
    // Ajoutés le 04/10/2026 : la section existait depuis le 03 au soir, et la page ne la montrait pas.
    buildSuivant: ['paragraphe', '## Le build suivant'],
    buildSuivantListe: ['liste', '**01.3 à 01.8 se rejouent'],
  },
};

const echapper = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * La longueur du texte qu'on lira, balises posées par ce script exclues : c'est elle qui décide si une
 * citation peut passer à la ligne. Un compte et non un filtre — le texte est déjà échappé
 * (`echapper`), donc tout `<` qui reste est une balise d'ici, et rien de ce qui sort n'en dépend.
 */
function longueurVisible(html) {
  let vu = '';
  let dansUneBalise = false;
  for (const car of html) {
    if (car === '<') dansUneBalise = true;
    else if (car === '>') dansUneBalise = false;
    else if (!dansUneBalise) vu += car;
  }
  return vu.trim().length;
}

/** `**`, `*`, `` ` ``, les liens et les guillemets — imbriqués compris — vers leurs balises. */
function enLigne(texte) {
  let t = echapper(texte)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, libelle, cible) =>
      `<a href="${cible.startsWith('http') ? cible : '#'}" target="_blank" rel="noopener">${libelle}</a>`
    )
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<![\w*])\*([^*]+)\*(?![\w*])/g, '<em>$1</em>');
  // Une citation longue peut passer à la ligne : elle reçoit sa classe.
  const sortie = [];
  const pile = [];
  for (const car of t) {
    if (car === '«') {
      pile.push(sortie.length);
      sortie.push(null);
    } else if (car === '»' && pile.length) {
      const i = pile.pop();
      sortie[i] = longueurVisible(sortie.slice(i + 1).filter(Boolean).join('')) > 26 ? '<q class="long">' : '<q>';
      sortie.push('</q>');
    } else {
      sortie.push(car);
    }
  }
  for (const i of pile) sortie[i] = '«';
  t = sortie.filter((x) => x !== null).join('');
  // L'espace insécable après « et avant » est portée par la CSS de <q> : on retire celles du texte.
  return t.replace(/<q( class="long")?>\s+/g, (m) => m.trimEnd()).replace(/\s+<\/q>/g, '</q>');
}

function tableauApres(md, ancre) {
  const i = md.indexOf(ancre);
  if (i === -1) throw new Error(`ancre introuvable dans la feuille : « ${ancre} »`);
  const j = md.indexOf('\n|', i);
  const rangs = [];
  for (const ligne of md.slice(j + 1).split('\n')) {
    if (!ligne.startsWith('|')) break;
    const cellules = ligne.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cellules.every((c) => /^-+$/.test(c))) continue;
    rangs.push(cellules);
  }
  return rangs.slice(1).map((r) => r.map(enLigne));
}

/** Les lignes qui suivent l'ancre ; si l'ancre est un titre, à partir de la première ligne non vide après lui. */
function lignesApres(md, ancre) {
  const i = md.indexOf(ancre);
  if (i === -1) throw new Error(`ancre introuvable dans la feuille : « ${ancre} »`);
  const debut = md.lastIndexOf('\n', i) + 1;
  const lignes = md.slice(debut).split('\n');
  if (lignes[0].startsWith('#')) lignes.shift();
  while (lignes.length && lignes[0].trim() === '') lignes.shift();
  return lignes;
}

/** Le paragraphe qui commence à l'ancre (ou sous elle), jusqu'à la première ligne vide. */
function paragrapheApres(md, ancre) {
  const lignes = lignesApres(md, ancre);
  const fin = lignes.findIndex((l) => l.trim() === '');
  return enLigne((fin === -1 ? lignes : lignes.slice(0, fin)).join(' ').replace(/\s+/g, ' ').trim());
}

/** Les puces de la première liste après l'ancre ; une ligne en retrait continue la puce d'avant. */
function listeApres(md, ancre) {
  const puces = [];
  for (const l of lignesApres(md, ancre)) {
    if (l.startsWith('- ')) puces.push(l.slice(2));
    else if (puces.length && /^\s+\S/.test(l)) puces[puces.length - 1] += ` ${l.trim()}`;
    else break;
  }
  if (!puces.length) throw new Error(`aucune liste sous l'ancre : « ${ancre} »`);
  return puces.map((p) => enLigne(p.replace(/\s+/g, ' ').trim()));
}

function extraire(md, nom) {
  const tableaux = TABLEAUX_PAR_FEUILLE[nom];
  if (!tableaux) throw new Error(`feuille non déclarée dans TABLEAUX_PAR_FEUILLE : « ${nom} »`);
  const donnees = Object.fromEntries(Object.entries(tableaux).map(([cle, ancre]) => [cle, tableauApres(md, ancre)]));
  for (const [cle, [forme, ancre]] of Object.entries(TEXTES_PAR_FEUILLE[nom] ?? {})) {
    donnees[cle] = forme === 'liste' ? listeApres(md, ancre) : paragrapheApres(md, ancre);
  }
  donnees.blocs = [...md.matchAll(/^## Bloc (\d\d) — (.+)$/gm)].map((m) => {
    const debut = m.index + m[0].length;
    const fin = md.indexOf('\n## ', debut);
    const corps = md.slice(debut, fin === -1 ? md.length : fin).split('\n');
    const intro = corps
      .filter((l) => l.startsWith('>'))
      .map((l) => (l.startsWith('> ') ? l.slice(2) : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const lignes = corps
      .filter((l) => /^\| \d\d\.\d+ \|/.test(l))
      .map((l) => {
        const c = l.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
        return [c[0], enLigne(c[1]), enLigne(c[2])];
      });
    return { n: m[1], t: enLigne(m[2]), intro: intro ? enLigne(intro) : '', lignes };
  });
  return donnees;
}

const [feuille, option, page] = process.argv.slice(2);
if (!feuille || (option && (option !== '--page' || !page))) {
  console.error('usage : node scripts/extraire-une-feuille-de-recette.mjs <feuille.md> [--page <page.html>]');
  process.exit(2);
}
const json = JSON.stringify(extraire(fs.readFileSync(feuille, 'utf8'), path.basename(feuille)));
if (!page) {
  process.stdout.write(`${json}\n`);
} else {
  const html = fs.readFileSync(page, 'utf8');
  const bloc = /(<script type="application\/json" id="donnees">)[\s\S]*?(<\/script>)/;
  if (!bloc.test(html)) throw new Error('la page ne porte pas de bloc <script id="donnees">');
  // `</` échappé : une chaîne de la feuille qui contiendrait `</script>` fermerait le bloc.
  process.stdout.write(html.replace(bloc, (_, ouvre, ferme) => `${ouvre}${json.replace(/<\//g, '<\\/')}${ferme}`));
}
