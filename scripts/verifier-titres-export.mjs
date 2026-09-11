// Refuse un export web dont une page mentirait à un moteur de recherche : titre vide, titre
// générique, description manquante, indexation ouverte là où elle ne doit pas l'être, ou
// `robots.txt`/`sitemap.xml` disparus de l'export.
//
// C'est la seule vérification qui prouve quoi que ce soit sur ce plan. Le titre peut être
// déclaré, typé, testé et malgré tout absent du HTML : l'option `title` du `Stack` d'Expo Router,
// premier essai, ne met à jour `document.title` qu'après hydratation — les dix-huit pages
// sortaient avec un `<title>` vide alors que tout le reste était vert. Un titre absent ne
// casse rien de visible (l'onglet affiche l'URL, le crawler se rabat sur le contenu), donc
// rien ne le signale : même piège silencieux que `cleanUrls` dans vercel.json.
//
// Cinq contrôles, et les quatre derniers sont nouveaux :
//
//   1. **Aucun titre vide.** Le contrôle d'origine.
//   2. **Aucun titre réduit au seul nom du produit**, hors racine. `pageTitle` retombe sur
//      `DEFAULT_PAGE_TITLE`, qui vaut exactement `APP_NAME` : une route ajoutée sans ligne dans
//      `PAGE_TITLES` sortait donc avec `<title>Ramille</title>`, non vide, et la CI passait au
//      vert. C'était précisément l'oubli que toute cette infrastructure existe pour empêcher.
//   3. **Une page publique porte une description, une page d'application porte `noindex`.** Les
//      deux faits sont le même côté code (`PAGE_DESCRIPTIONS` décide des deux, cf.
//      `src/components/titre-de-page.tsx`) : on vérifie donc qu'aucune page ne se retrouve entre
//      les deux — ni surface publique sans extrait, ni coquille d'application offerte à
//      l'indexation. L'export produit une page HTML par route : sans ce contrôle, seize écrans
//      d'app concourent dans les résultats de recherche avec les deux pages légales.
//   4. **`robots.txt` et `sitemap.xml` sont bien dans `dist/`, et disent ce qu'il faut.** Ils
//      vivent dans `public/`, qu'Expo recopie tel quel — donc ils disparaissent exactement comme
//      `assetlinks.json` peut disparaître : sans erreur de build, sans erreur de déploiement,
//      sans rien. Leur contenu est vérifié ligne par ligne, et notamment la paire
//      `Disallow: /api/` + `Allow: /api/partage` + `Allow: /api/share-card` : la défaire à moitié
//      supprimerait l'aperçu de lien d'un bilan partagé sur les trois réseaux qui lisent
//      `robots.txt` avant d'aller chercher une page.
//   5. **Une seule origine canonique.** `robots.txt`, `sitemap.xml` et l'`og:url` des pages
//      publiques écrivent le domaine ; les deux premiers sont statiques et ne peuvent pas
//      l'importer. Ce contrôle les confronte à `ORIGINE_CANONIQUE` (`src/constants/produit.ts`),
//      sans quoi un changement de domaine laisse un sitemap qui désigne l'ancien — en silence.
//
// Lancé en CI après `expo export`, cf. .github/workflows/ci.yml.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';

// `_sitemap` est la page de développement d'Expo Router, listant les routes ; elle n'est ni
// exportée avec du contenu (coquille vide, hydratée côté client) ni atteignable en
// production. La titrer demanderait de remplacer une page du framework pour un écran que
// personne ne voit. `public/robots.txt` l'interdit au crawl.
const PAGES_IGNOREES = new Set(['_sitemap.html']);

// **Couplé à la main à `PAGE_DESCRIPTIONS` (src/constants/page-titles.ts).** Ce script est du
// Node pur : il ne peut pas importer un module TypeScript du bundle applicatif, et le tsconfig
// racine tient volontairement les types Node hors de `src/`. Recopier la liste est le prix de
// l'avoir vérifiée sur le HTML réellement produit plutôt que sur la table qui le déclare — et
// une liste recopiée qui dérive se voit ici, puisque l'écart fait échouer le contrôle 3 dans un
// sens ou dans l'autre.
const PAGES_PUBLIQUES = new Set([
  '/',
  '/onboarding',
  '/confidentialite',
  '/conditions',
  '/compte/suppression',
]);

// Deux constantes sont lues dans leur source unique plutôt que recopiées : `APP_NAME`, parce
// que c'est lui que le repli générique de `pageTitle` produit — un titre qui lui est égal hors
// racine est exactement le défaut que le contrôle 2 cherche — et `ORIGINE_CANONIQUE`, parce que
// c'est elle que les fichiers statiques de `public/` écrivent en dur.
function constanteDuProduit(nom) {
  const source = readFileSync('src/constants/produit.ts', 'utf8');
  const valeur = source.match(new RegExp(`export const ${nom} = '([^']+)'`))?.[1];
  if (!valeur) {
    console.error(
      `${nom} est introuvable dans src/constants/produit.ts — ce script le lit par motif pour ne` +
        '\npas recopier une valeur qui a déjà sa source unique. Si la déclaration a changé de' +
        '\nforme, adapter le motif.',
    );
    process.exit(1);
  }
  return valeur;
}

function pagesHtml(dir, prefixe = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) return pagesHtml(chemin, `${prefixe}${entree.name}/`);
    return entree.name.endsWith('.html') ? [{ chemin, nom: `${prefixe}${entree.name}` }] : [];
  });
}

// Nom de fichier exporté → chemin d'URL servi, c'est-à-dire la clé de `PAGE_TITLES`. Deux
// normalisations : `index.html` est le répertoire lui-même (forme que l'export donne à une route
// qui a des enfants), et le segment de groupe `(tabs)` ne paraît pas dans l'URL — `usePathname()`
// le gomme, d'où les trois doublons `dist/(tabs)/*` qui servent le même contenu que /plan,
// /suivi et /suivi/bilan.
function cheminDeLaPage(nom) {
  const sansGroupe = nom
    .replace(/\.html$/, '')
    .replace(/(^|\/)index$/, '')
    .replace(/\([^/]*\)\//g, '');
  return `/${sansGroupe}`.replace(/\/+$/, '') || '/';
}

function baliseMeta(html, attribut, valeur) {
  const motif = new RegExp(`<meta[^>]*${attribut}="${valeur}"[^>]*>`, 'i');
  const balise = html.match(motif)?.[0];
  return balise ? (balise.match(/content="([^"]*)"/)?.[1]?.trim() ?? '') : null;
}

const APP_NAME = constanteDuProduit('APP_NAME');
// L'origine canonique est écrite en dur dans `public/robots.txt` et `public/sitemap.xml` — deux
// fichiers statiques qui ne peuvent pas importer de TypeScript (`app.json` en répète le seul
// hôte, pour les liens d'application). Elle est donc lue ici dans sa source unique : un
// changement de domaine laisserait sinon un sitemap et un robots.txt désignant l'ancien, sans
// que rien ne le signale.
const ORIGINE_CANONIQUE = constanteDuProduit('ORIGINE_CANONIQUE');
const pages = pagesHtml(DIST).filter((page) => !PAGES_IGNOREES.has(page.nom));

if (pages.length === 0) {
  console.error(`Aucune page HTML dans ${DIST}/ — l'export a-t-il tourné ?`);
  process.exit(1);
}

const echecs = [];

for (const page of pages) {
  const html = readFileSync(page.chemin, 'utf8');
  const chemin = cheminDeLaPage(page.nom);
  const titre = html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1]?.trim() ?? '';
  const description = baliseMeta(html, 'name', 'description');
  const robots = baliseMeta(html, 'name', 'robots');

  if (titre === '') {
    echecs.push(
      `${page.nom} : titre d'onglet vide ou absent. Ajouter une entrée dans` +
        " src/constants/page-titles.ts (indexée par chemin d'URL).",
    );
  } else if (titre === APP_NAME && chemin !== '/') {
    echecs.push(
      `${page.nom} : le titre vaut « ${APP_NAME} », le repli générique de \`pageTitle\` — donc` +
        ` ${chemin} n'a pas de ligne dans PAGE_TITLES. Seule la racine porte le nom seul.`,
    );
  }

  if (PAGES_PUBLIQUES.has(chemin)) {
    if (!description) {
      echecs.push(
        `${page.nom} : surface publique sans description. Ajouter ${chemin} à PAGE_DESCRIPTIONS` +
          " (src/constants/page-titles.ts) — c'est l'extrait qu'un moteur affichera sous le titre.",
      );
    }
    if (!baliseMeta(html, 'property', 'og:title') || !baliseMeta(html, 'property', 'og:description')) {
      echecs.push(
        `${page.nom} : surface publique sans balises Open Graph. Coller ce lien dans une` +
          ' conversation ne donnerait qu’une URL nue.',
      );
    }
    // `og:url` est composée d'une constante et du chemin, donc sa valeur est prévisible — et
    // c'est ce qui la rend vérifiable ici. Elle doit désigner l'origine canonique et **ce**
    // chemin : une URL absolue dérivée de l'origine réelle de la page aurait différé entre le
    // HTML statique et l'hydratation, et une page qui s'annonce sous l'adresse d'une autre fait
    // fusionner les deux dans l'index.
    const ogUrl = baliseMeta(html, 'property', 'og:url');
    const ogUrlAttendue = `${ORIGINE_CANONIQUE}${chemin}`;
    if (ogUrl !== ogUrlAttendue) {
      echecs.push(
        `${page.nom} : og:url vaut ${ogUrl === null ? '(absente)' : `« ${ogUrl} »`} au lieu de` +
          ` « ${ogUrlAttendue} ». Elle est posée par src/components/titre-de-page.tsx depuis` +
          ' ORIGINE_CANONIQUE, jamais depuis APP_URL.',
      );
    }
    if (robots !== null && robots.includes('noindex')) {
      echecs.push(`${page.nom} : surface publique en \`noindex\` — elle ne serait jamais trouvée.`);
    }
  } else if (robots === null || !robots.includes('noindex')) {
    echecs.push(
      `${page.nom} : page d'application offerte à l'indexation (pas de \`noindex\`). Elle` +
        ` concourrait avec les pages légales dans les résultats de recherche. \`TitreDePage\` le` +
        ` pose pour tout chemin absent de PAGE_DESCRIPTIONS — ${chemin} y est-il entré par erreur ?`,
    );
  }
}

// `robots.txt` et `sitemap.xml` viennent de `public/`, recopié tel quel par l'export.
const robotsTxt = join(DIST, 'robots.txt');
if (!existsSync(robotsTxt)) {
  echecs.push(
    'robots.txt est absent de l’export. Il vit dans public/, qu’Expo recopie tel quel — sans lui,' +
      ' le plan de site de développement d’Expo Router et l’écran de diagnostic redeviennent' +
      ' parcourables, sans que rien ne le signale.',
  );
} else {
  const contenu = readFileSync(robotsTxt, 'utf8');
  for (const interdit of ['/_sitemap', '/status', '/(tabs)/', '/api/']) {
    if (!contenu.includes(`Disallow: ${interdit}`)) {
      echecs.push(`robots.txt n’interdit plus ${interdit}.`);
    }
  }
  // **La paire `Disallow: /api/` + les deux `Allow` ne vaut qu'entière.** Sans les exceptions,
  // facebookexternalhit, Twitterbot et LinkedInBot — qui lisent tous ce fichier avant de
  // récupérer une page — ne composeraient plus l'aperçu d'un bilan partagé : ni titre, ni
  // description, ni image. Et ces deux URL sont les seules du produit à porter un
  // `X-Robots-Tag: noindex`, qu'un crawler interdit de les demander ne lirait jamais.
  for (const autorise of ['/api/partage', '/api/share-card']) {
    if (!contenu.includes(`Allow: ${autorise}`)) {
      echecs.push(
        `robots.txt n’autorise plus ${autorise}, que \`Disallow: /api/\` couvre. L’aperçu de lien` +
          ' d’un bilan partagé sortirait en URL nue sur Facebook, X et LinkedIn.',
      );
    }
  }
  if (!contenu.includes(`Sitemap: ${ORIGINE_CANONIQUE}/sitemap.xml`)) {
    echecs.push(
      `robots.txt ne déclare plus l’adresse du sitemap sous l’origine canonique` +
        ` (${ORIGINE_CANONIQUE}/sitemap.xml).`,
    );
  }
}

const sitemapXml = join(DIST, 'sitemap.xml');
if (!existsSync(sitemapXml)) {
  echecs.push('sitemap.xml est absent de l’export (il vit dans public/, comme robots.txt).');
} else {
  const contenu = readFileSync(sitemapXml, 'utf8');
  const locs = [...contenu.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc]) => loc.trim());
  const horsOrigine = locs.filter((loc) => !loc.startsWith(`${ORIGINE_CANONIQUE}/`));
  if (horsOrigine.length > 0) {
    echecs.push(
      `sitemap.xml déclare ${horsOrigine.join(', ')}, hors de l’origine canonique` +
        ` ${ORIGINE_CANONIQUE}. Le fichier est statique et écrit le domaine en dur : il doit` +
        ' valoir ORIGINE_CANONIQUE (src/constants/produit.ts), sinon un changement de domaine' +
        ' laisse un sitemap qui désigne l’ancien.',
    );
  }
  const declarees = locs
    .filter((loc) => loc.startsWith(`${ORIGINE_CANONIQUE}/`))
    .map((loc) => loc.slice(ORIGINE_CANONIQUE.length))
    .map((chemin) => (chemin.length > 1 ? chemin.replace(/\/+$/, '') : chemin));
  const manquantes = [...PAGES_PUBLIQUES].filter((chemin) => !declarees.includes(chemin));
  const intruses = declarees.filter((chemin) => !PAGES_PUBLIQUES.has(chemin));
  if (manquantes.length > 0) {
    echecs.push(`sitemap.xml ne liste pas ${manquantes.join(', ')}.`);
  }
  if (intruses.length > 0) {
    echecs.push(
      `sitemap.xml liste ${intruses.join(', ')}, qui n’est pas une surface publique — une URL` +
        ' soumise à l’indexation alors que sa page porte `noindex` est une contradiction.',
    );
  }
}

if (echecs.length > 0) {
  console.error('L’export ne dit pas la vérité aux moteurs de recherche :\n');
  for (const echec of echecs) console.error(`  - ${echec}`);
  console.error(
    '\nLes titres, les descriptions et l’indexation se déclarent en un seul endroit,' +
      '\nsrc/constants/page-titles.ts, et sont posés par src/components/titre-de-page.tsx.' +
      '\nrobots.txt et sitemap.xml vivent dans public/.',
  );
  process.exit(1);
}

console.log(
  `${pages.length} pages exportées : toutes titrées, ${PAGES_PUBLIQUES.size} publiques avec` +
    ` description et Open Graph, le reste en noindex. robots.txt et sitemap.xml présents, tous` +
    ` sous ${ORIGINE_CANONIQUE}, et l’aperçu de partage reste autorisé au crawl.`,
);
