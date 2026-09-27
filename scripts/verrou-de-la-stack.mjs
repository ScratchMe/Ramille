// Le verrou de la stack Supabase locale, que `scripts/rejouer-la-ci.mjs` prend le temps de ses
// étapes `base` et `parcours`.
//
// Pourquoi. La stack est une par machine — ses conteneurs portent le `project_id` de
// `supabase/config.toml`, quelle que soit la copie de travail qui l'a démarrée —, et le rejeu
// reconstruit la base avant de la vérifier. Deux rejeux simultanés, depuis deux copies de travail
// de sous-agents, se la reconstruiraient l'un sous l'autre, et chacun lirait l'échec de l'autre. Les
// consignes de la semaine du 21 au 25/09/2026 le réglaient par une phrase (« tu es seul à jouer le
// parcours ») ; le verrou le règle pour tout rejeu, et nomme celui qui tient la stack.
//
// Il vit dans le répertoire git commun (`git rev-parse --git-common-dir`), que partagent toutes les
// copies de travail du dépôt. **Il se pose d'un seul geste** : un dossier préparé à côté, son
// propriétaire écrit dedans, puis renommé. Un `mkdir` suivi d'une écriture laisserait un instant où
// un second passage trouverait le verrou sans propriétaire, le prendrait pour orphelin et le
// reprendrait. Un verrou dont le propriétaire ne tourne plus — processus tué, qui n'a pas pu le
// rendre — est orphelin, et se reprend ; un propriétaire illisible aussi, puisque le renommage
// garantit qu'un verrou tenu en a toujours un.
//
// Ce qu'il ne voit pas : ce qui touche la stack hors d'un rejeu (`supabase start`, `stop`,
// `db reset` à la main). Et un pid repris par un autre processus après un redémarrage ferait lire
// vivant un verrou mort : le message dit alors comment le retirer.
//
// Éprouvé par `scripts/verrou-de-la-stack.test.ts`, mutations datées en tête.
import fs from 'node:fs';
import path from 'node:path';

const FICHIER = 'proprietaire.json';

function enVie(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM : le processus existe, il appartient à quelqu'un d'autre.
    return e.code === 'EPERM';
  }
}

function lireLeProprietaire(dossier) {
  try {
    const tenu = JSON.parse(fs.readFileSync(path.join(dossier, FICHIER), 'utf8'));
    return Number.isInteger(tenu?.pid) ? tenu : null;
  } catch {
    return null;
  }
}

/**
 * Prend le verrou `dossier` pour ce processus, qui le rend à sa sortie. `racine` est la copie de
 * travail qui le prend : c'est elle qu'un second passage lira dans son refus.
 * Rend `{ pris, message }` ; ne lève pas.
 */
export function prendreLeVerrou(dossier, racine) {
  const notes = [];
  for (let essai = 0; essai < 2; essai++) {
    const prepare = fs.mkdtempSync(`${dossier}.prepare-`);
    fs.writeFileSync(path.join(prepare, FICHIER), JSON.stringify({ pid: process.pid, racine, depuis: new Date().toISOString() }));
    try {
      fs.renameSync(prepare, dossier);
      process.on('exit', () => fs.rmSync(dossier, { recursive: true, force: true }));
      return { pris: true, message: [...notes, `Verrou pris : ${dossier}`].join('\n') };
    } catch (e) {
      fs.rmSync(prepare, { recursive: true, force: true });
      if (e.code !== 'ENOTEMPTY' && e.code !== 'EEXIST') {
        return { pris: false, message: `Le verrou n'a pas pu être posé (${dossier}) : ${e.message}` };
      }
    }
    const tenu = lireLeProprietaire(dossier);
    if (tenu && enVie(tenu.pid)) {
      return {
        pris: false,
        message:
          `La stack est réservée par ${tenu.racine} (pid ${tenu.pid}) depuis ${tenu.depuis}. ` +
          'Le verrou se libère à la fin de ce rejeu-là. Si ce pid ne désigne plus un rejeu (la machine ' +
          `a redémarré), retire-le : \`rm -rf ${dossier}\`.`,
      };
    }
    notes.push(`Verrou orphelin repris (pid ${tenu?.pid ?? 'illisible'}, qui ne tourne plus).`);
    fs.rmSync(dossier, { recursive: true, force: true });
  }
  return { pris: false, message: [...notes, `Le verrou n'a pas pu être pris : ${dossier}`].join('\n') };
}
