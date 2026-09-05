// Refuse un export web dont une page sortirait sans titre d'onglet.
//
// C'est la seule vérification qui prouve quoi que ce soit ici. Le titre peut être déclaré,
// typé, testé et malgré tout absent du HTML : l'option `title` du `Stack` d'Expo Router,
// premier essai, ne met à jour `document.title` qu'après hydratation — les dix-huit pages
// sortaient avec un `<title>` vide alors que tout le reste était vert. Un titre absent ne
// casse rien de visible (l'onglet affiche l'URL, le crawler se rabat sur le contenu), donc
// rien ne le signale : même piège silencieux que `cleanUrls` dans vercel.json.
//
// Lancé en CI après `expo export`, cf. .github/workflows/ci.yml.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';

// `_sitemap` est la page de développement d'Expo Router, listant les routes ; elle n'est ni
// exportée avec du contenu (coquille vide, hydratée côté client) ni atteignable en
// production. La titrer demanderait de remplacer une page du framework pour un écran que
// personne ne voit.
const PAGES_IGNOREES = new Set(['_sitemap.html']);

function pagesHtml(dir, prefixe = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) return pagesHtml(chemin, `${prefixe}${entree.name}/`);
    return entree.name.endsWith('.html') ? [{ chemin, nom: `${prefixe}${entree.name}` }] : [];
  });
}

const pages = pagesHtml(DIST).filter((page) => !PAGES_IGNOREES.has(page.nom));

if (pages.length === 0) {
  console.error(`Aucune page HTML dans ${DIST}/ — l'export a-t-il tourné ?`);
  process.exit(1);
}

const sansTitre = [];
for (const page of pages) {
  const html = readFileSync(page.chemin, 'utf8');
  const titre = html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1]?.trim() ?? '';
  if (titre === '') sansTitre.push(page.nom);
}

if (sansTitre.length > 0) {
  console.error(
    `Titre d'onglet vide ou absent sur ${sansTitre.length} page(s) :\n` +
      sansTitre.map((nom) => `  - ${nom}`).join('\n') +
      "\n\nAjouter une entrée dans src/constants/page-titles.ts (indexée par chemin d'URL).",
  );
  process.exit(1);
}

console.log(`${pages.length} pages exportées, toutes titrées.`);
