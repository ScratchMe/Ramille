// Convertit les fiches de `ds-bundle/` (l'arbre que `package-build.mjs` écrit pour Claude Design) au format du
// système de design de la galerie d'artefacts : `components/<Nom>/{README.md, <Nom>.d.ts, preview.html}`
// (NOTES.md, « Le système de design de la galerie »). Lecture seule sur le dépôt ; écrit dans le dossier donné,
// hors du dépôt et vide, d'où l'envoi se fait par l'outil Artifact. À lancer depuis la racine du dépôt, après un
// `package-build.mjs` complet :
//
//   node .design-sync/vers-la-galerie.mjs ds-bundle docs/design/design-system <dossier>
//
// Ce qu'il fait de chaque fiche, et pourquoi :
//   - l'aperçu garde son groupe ; un cadre réglé dans `config.json` (`viewport`) devient `width=… height=…` ;
//   - les balises que le cadre de la galerie fournit déjà (feuilles, React, bundle) partent, et `_preview/<Nom>.js`
//     s'inline : la galerie ne sert pas `_preview/` ;
//   - la fiche perd sa première ligne générée (« X from ramille-design-system. Use via … »), pour que sa première
//     phrase, qui devient le résumé du catalogue, soit celle du kit ;
//   - les types sont ceux du kit, `<groupe>/<Nom>.d.ts`, et le bloc « Props » de la fiche les reprend : ceux de
//     `ds-bundle/` coupent chaque commentaire à 120 caractères (`.ds-sync/lib/dts.mjs`), en plein mot — 52
//     commentaires dans 26 fiches au premier envoi du 03/10/2026, relevés par la contre-lecture.
// Il refuse plutôt que de deviner : un marqueur, une balise ou une fiche d'une autre forme, un nom présent dans
// deux groupes, une sortie déjà remplie ou rangée dans le dépôt arrêtent tout.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const [, , BUNDLE, KIT, SORTIE] = process.argv;
if (!BUNDLE || !KIT || !SORTIE) {
  console.error('Usage : node .design-sync/vers-la-galerie.mjs <ds-bundle> <kit> <dossier de sortie>');
  process.exit(2);
}
// Une sortie dans le dépôt partirait avec le prochain `git add -A` ; une sortie déjà remplie mêlerait à l'envoi
// les composants d'un passage précédent, que la vérification rendrait sans broncher.
if ((resolve(SORTIE) + sep).startsWith(resolve('.') + sep)) throw new Error(`${SORTIE} est dans le dépôt : sortir ailleurs`);
const dejaLa = join(SORTIE, 'project', 'components');
if (existsSync(dejaLa) && readdirSync(dejaLa).length) throw new Error(`${dejaLa} n'est pas vide`);

const releve = [];
const vus = new Map();
for (const groupe of readdirSync(join(BUNDLE, 'components')).sort()) {
  for (const nom of readdirSync(join(BUNDLE, 'components', groupe)).sort()) {
    // La galerie range les composants par nom seul : deux groupes ne peuvent pas porter le même.
    if (vus.has(nom)) throw new Error(`${nom} est à la fois dans ${vus.get(nom)} et dans ${groupe}`);
    vus.set(nom, groupe);
    const dossier = join(BUNDLE, 'components', groupe, nom);
    const html = readFileSync(join(dossier, `${nom}.html`), 'utf8');
    const fiche = readFileSync(join(dossier, `${nom}.prompt.md`), 'utf8');
    const types = readFileSync(join(KIT, 'components', groupe, `${nom}.d.ts`), 'utf8').replace(/\n+$/, '\n');
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

    // Chacune des cinq balises que le cadre fournit doit être là, une fois : les compter en bloc laisserait passer
    // une balise manquante compensée par une autre en double.
    const retirees = new Map();
    let inlines = 0;
    const sortie = [];
    for (const ligne of lignes) {
      const fournie =
        /^\s*<link rel="stylesheet" href="\.\.\/\.\.\/\.\.\/(styles\.css|_ds_bundle\.css)">\s*$/.exec(ligne) ??
        /^\s*<script src="\.\.\/\.\.\/\.\.\/(_vendor\/react\.js|_vendor\/react-dom\.js|_ds_bundle\.js)"><\/script>\s*$/.exec(ligne);
      if (fournie) {
        retirees.set(fournie[1], (retirees.get(fournie[1]) ?? 0) + 1);
        continue;
      }
      if (ligne.trim() === `<script src="../../../_preview/${nom}.js"></script>`) {
        sortie.push(`<script>${apercu}</script>`);
        inlines++;
        continue;
      }
      sortie.push(ligne);
    }
    const attendues = ['styles.css', '_ds_bundle.css', '_vendor/react.js', '_vendor/react-dom.js', '_ds_bundle.js'];
    if (retirees.size !== 5 || attendues.some((b) => retirees.get(b) !== 1) || inlines !== 1) {
      throw new Error(`${nom} : balises retirées ${JSON.stringify([...retirees])}, ${inlines} aperçu inliné`);
    }
    const preview = sortie.join('\n');
    if (/src="|href="/.test(preview.replace(apercu, ''))) throw new Error(`${nom} : une référence externe subsiste`);

    const [premiere, ...reste] = fiche.split('\n');
    if (!premiere.startsWith(`${nom} from ramille-design-system. Use via`)) throw new Error(`${nom} : fiche d'une autre forme`);
    let corps = reste.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
    const blocProps = /\n## Props\n\n```ts\n[\s\S]*?\n```/;
    const propsDuKit = `\n## Props\n\n\`\`\`ts\n${types.replace(/\n$/, '')}\n\`\`\``;
    if ((corps.match(/\n## Props\n/g) ?? []).length > 1) throw new Error(`${nom} : deux blocs « Props »`);
    corps = blocProps.test(corps) ? corps.replace(blocProps, () => propsDuKit) : `${corps}\n${propsDuKit}`;
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
