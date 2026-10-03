// Convertit les fiches de `ds-bundle/` (l'arbre que `package-build.mjs` écrit pour Claude Design) au format du
// système de design de la galerie d'artefacts : `components/<Nom>/{README.md, <Nom>.d.ts, preview.html}`
// (NOTES.md, « Le système de design de la galerie »). Lecture seule sur le dépôt ; écrit dans le dossier donné,
// hors du dépôt de préférence, d'où l'envoi se fait par l'outil Artifact. À lancer depuis la racine du dépôt,
// après un `package-build.mjs` complet :
//
//   node .design-sync/vers-la-galerie.mjs ds-bundle <dossier>
//
// Ce qu'il fait de chaque fiche, et pourquoi :
//   - l'aperçu garde son groupe ; un cadre réglé dans `config.json` (`viewport`) devient `width=… height=…` ;
//   - les balises que le cadre de la galerie fournit déjà (feuilles, React, bundle) partent, et `_preview/<Nom>.js`
//     s'inline : la galerie ne sert pas `_preview/` ;
//   - la fiche perd sa première ligne générée (« X from ramille-design-system. Use via … »), pour que sa première
//     phrase, qui devient le résumé du catalogue, soit celle du kit.
// Il refuse plutôt que de deviner : un marqueur, une balise ou une fiche d'une autre forme arrête tout.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , BUNDLE, SORTIE] = process.argv;
if (!BUNDLE || !SORTIE) {
  console.error('Usage : node .design-sync/vers-la-galerie.mjs <ds-bundle> <dossier de sortie>');
  process.exit(2);
}

const releve = [];
for (const groupe of readdirSync(join(BUNDLE, 'components')).sort()) {
  for (const nom of readdirSync(join(BUNDLE, 'components', groupe)).sort()) {
    const dossier = join(BUNDLE, 'components', groupe, nom);
    const html = readFileSync(join(dossier, `${nom}.html`), 'utf8');
    const fiche = readFileSync(join(dossier, `${nom}.prompt.md`), 'utf8');
    const types = readFileSync(join(dossier, `${nom}.d.ts`), 'utf8');
    const apercu = readFileSync(join(BUNDLE, '_preview', `${nom}.js`), 'utf8');
    // Un `</script` ou un `<!--` fermerait la balise où l'aperçu s'inline.
    if (/<\/script|<!--/i.test(apercu)) throw new Error(`${nom} : l'aperçu porte </script ou <!--`);

    const lignes = html.split('\n');
    const marqueur = /^<!-- @dsCard group="([^"]+)"(?: viewport="(\d+)x(\d+)")? -->$/.exec(lignes[0]);
    if (!marqueur || marqueur[1] !== groupe) throw new Error(`${nom} : marqueur inattendu ${lignes[0]}`);
    // 900 × 700 est le cadre par défaut du convertisseur : la galerie fait mieux sans (la carte grandit seule).
    const regle = Boolean(marqueur[2]) && !(marqueur[2] === '900' && marqueur[3] === '700');
    lignes[0] = regle
      ? `<!-- @dsCard group="${groupe}" width=${marqueur[2]} height=${marqueur[3]} -->`
      : `<!-- @dsCard group="${groupe}" -->`;

    let retirees = 0;
    let inlines = 0;
    const sortie = [];
    for (const ligne of lignes) {
      if (/^\s*<link rel="stylesheet" href="\.\.\/\.\.\/\.\.\/(styles\.css|_ds_bundle\.css)">\s*$/.test(ligne)) {
        retirees++;
        continue;
      }
      if (/^\s*<script src="\.\.\/\.\.\/\.\.\/(_vendor\/react\.js|_vendor\/react-dom\.js|_ds_bundle\.js)"><\/script>\s*$/.test(ligne)) {
        retirees++;
        continue;
      }
      if (ligne.trim() === `<script src="../../../_preview/${nom}.js"></script>`) {
        sortie.push(`<script>${apercu}</script>`);
        inlines++;
        continue;
      }
      sortie.push(ligne);
    }
    if (retirees !== 5 || inlines !== 1) throw new Error(`${nom} : ${retirees} balises retirées, ${inlines} aperçu inliné`);
    const preview = sortie.join('\n');
    if (/src="|href="/.test(preview.replace(apercu, ''))) throw new Error(`${nom} : une référence externe subsiste`);

    const [premiere, ...reste] = fiche.split('\n');
    if (!premiere.startsWith(`${nom} from ramille-design-system. Use via`)) throw new Error(`${nom} : fiche d'une autre forme`);
    const corps = reste.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
    const readme = `${corps}\n\nDans ce système : \`window.Ramille.${nom}\`, chargé par \`components/bundle.js\`.\n`;

    const cible = join(SORTIE, 'project', 'components', nom);
    mkdirSync(cible, { recursive: true });
    writeFileSync(join(cible, 'preview.html'), preview);
    writeFileSync(join(cible, 'README.md'), readme);
    writeFileSync(join(cible, `${nom}.d.ts`), types);
    releve.push({ nom, groupe, cadre: regle ? `${marqueur[2]}x${marqueur[3]}` : '' });
  }
}
writeFileSync(join(SORTIE, 'composants.json'), JSON.stringify(releve, null, 1));
console.log(`${releve.length} composants convertis, dont ${releve.filter((r) => r.cadre).length} à cadre réglé`);
