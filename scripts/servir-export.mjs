// Sert `dist/` **comme Vercel le sert**, pour les garde-fous qui ouvrent vraiment les pages.
//
// **Extrait de `verifier-rendu-export.mjs` le 17/09/2026**, quand un second script a eu besoin
// du même serveur. La duplication aurait été la pire forme possible : `resoudre()` reproduit
// `cleanUrls`, et deux copies qui divergent feraient qu'un garde-fou sert la production et
// l'autre non — sans que rien ne dise lequel a raison. La règle du dépôt vaut ici comme
// ailleurs : ce qui doit rester d'accord s'écrit une fois.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/**
 * Reproduit `cleanUrls` de vercel.json : l'export d'Expo Router produit un **répertoire**
 * `plan/index.html` pour une route qui a des enfants, un **fichier plat** `suivi.html` sinon.
 * Servir seulement la première forme, c'est ce que faisait Vercel avant `cleanUrls`, et la moitié
 * des routes répondait 404 en production. Un garde-fou qui ne sert pas comme la production teste
 * autre chose.
 *
 * Corollaire à connaître : ce serveur servant les **deux** formes exprès, il ne verrait pas la
 * panne que la disparition de `cleanUrls` provoquerait — c'est `verifier-rendu-export.mjs` qui lit
 * le réglage dans le fichier.
 */
function resoudre(dist, url) {
  const chemin = normalize(decodeURIComponent(url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  for (const candidat of [
    join(dist, chemin),
    join(dist, `${chemin}.html`),
    join(dist, chemin, 'index.html'),
  ]) {
    if (existsSync(candidat) && statSync(candidat).isFile()) return candidat;
  }
  return null;
}

/** Démarre le serveur sur un port libre et rend son adresse, plus de quoi le refermer. */
/**
 * @param dist  le dossier d'export à servir
 * @param port  le port à écouter, ou `0` pour en laisser choisir un libre.
 *
 * **Le port fixe n'est pas une commodité** : `verifier-lien-de-connexion.mjs` en a besoin parce
 * que l'app calcule son `redirectTo` depuis `window.location.origin` (`src/lib/app-url.ts`), et
 * que GoTrue n'accepte que les origines de sa liste — `site_url` vaut `http://127.0.0.1:3000`
 * dans `supabase/config.toml`. Servir sur un port au hasard ferait retomber le lien sur la Site
 * URL en silence, c'est-à-dire éprouver autre chose que ce qu'on croit.
 */
export async function servirExport(dist, port = 0) {
  const serveur = createServer((requete, reponse) => {
    const fichier = resoudre(dist, requete.url ?? '/');
    if (!fichier) {
      reponse.writeHead(404).end('introuvable');
      return;
    }
    reponse.writeHead(200, {
      'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream',
    });
    createReadStream(fichier).pipe(reponse);
  });

  await new Promise((pret) => serveur.listen(port, '127.0.0.1', pret));
  return {
    base: `http://127.0.0.1:${serveur.address().port}`,
    fermer: () => serveur.close(),
  };
}
