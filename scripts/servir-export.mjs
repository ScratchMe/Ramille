// Sert `dist/` **comme Vercel le sert**, pour les garde-fous qui ouvrent vraiment les pages.
//
// **Extrait de `verifier-rendu-export.mjs` le 17/09/2026**, quand un second script a eu besoin
// du même serveur. La duplication aurait été la pire forme possible : `resoudre()` reproduit
// `cleanUrls`, et deux copies qui divergent feraient qu'un garde-fou sert la production et
// l'autre non — sans que rien ne dise lequel a raison. La règle du dépôt vaut ici comme
// ailleurs : ce qui doit rester d'accord s'écrit une fois.
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, sep } from 'node:path';

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

/**
 * Les en-têtes que `vercel.json` pose, route par route, **Content-Security-Policy comprise**, servis
 * tels quels — à un détail près, dit plus bas. Rend une fonction du chemin demandé : la CSP vise toutes
 * les routes, le cache immuable seulement les fichiers hachés de l'export.
 *
 * **Pourquoi ce serveur les sert** (02/10/2026). La CSP du site est appliquée, et une politique
 * appliquée qui interdit quelque chose dont l'app a besoin ne casse pas une page : elle casse l'app
 * entière, sur web, pour tout le monde, et rien ne le signale côté serveur. Les gardes qui ouvrent
 * l'export dans un navigateur passent par ici : servir la politique de production, c'est
 * faire jouer à chacun de leurs parcours la mesure qu'aucun collecteur ne fait, à chaque PR. Ils
 * relèvent les infractions par `releverLaCsp()` ci-dessous et échouent à la première.
 *
 * **Le détail : l'origine Supabase.** La politique nomme le projet de production dans `connect-src`,
 * et un export de CI parle à un autre (la stack locale, ou l'URL factice de l'export de rendu). Le
 * serveur remplace donc cette seule source par l'origine avec laquelle l'export a été construit,
 * lue dans `EXPO_PUBLIC_SUPABASE_URL`, et rien d'autre. Sans la variable, il refuse de démarrer
 * plutôt que de servir une politique qui ferait échouer chaque requête pour une raison étrangère à
 * ce qu'on éprouve.
 */
export function enTetesDeProduction(config, origineSupabase) {
  const regles = (config.headers ?? []).map((regle) => ({
    motif: expressionDeLaSource(regle.source),
    enTetes: Object.fromEntries(
      regle.headers.map(({ key, value }) => [
        key.toLowerCase(),
        /^content-security-policy/i.test(key) ? politiqueServie(value, origineSupabase) : value,
      ]),
    ),
  }));
  /** Les en-têtes d'un chemin : toutes les règles qui le visent, dans l'ordre, la dernière l'emportant. */
  return (chemin) => Object.assign({}, ...regles.filter(({ motif }) => motif.test(chemin)).map((r) => r.enTetes));
}

/**
 * Lit une `source` de `vercel.json` (la syntaxe de path-to-regexp) comme Vercel la compile, pour la
 * grammaire que ce dépôt emploie : des segments littéraux et des groupes `( … )` qui sont des
 * expressions régulières telles quelles — `/(.*)`, `/_expo/static/(.+-[0-9a-f]{32}\.js)`.
 *
 * **Tout le reste est refusé**, paramètres nommés (`:nom`), jokers (`*`), modificateurs (`?`, `+`) et
 * accolades hors d'un groupe : un garde-fou qui lirait une règle autrement que Vercel servirait autre
 * chose que la production sans le dire. Vérifié contre la compilation de Vercel le 18/10/2026
 * (`npx vercel build`, `.vercel/output/config.json` : `/assets/(X)` devient `^/assets(?:/(X))$`) — le
 * `/` qui précède un groupe en fait une partie, ce qui ne change rien pour un groupe jamais optionnel.
 */
export function expressionDeLaSource(source) {
  let motif = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '(') {
      let profondeur = 0;
      let j = i;
      for (; j < source.length; j += 1) {
        if (source[j] === '\\') j += 1;
        else if (source[j] === '(') profondeur += 1;
        else if (source[j] === ')' && --profondeur === 0) break;
      }
      if (profondeur !== 0) throw new Error(`vercel.json : la source « ${source} » a une parenthèse qui ne se ferme pas.`);
      motif += source.slice(i, j + 1);
      i = j + 1;
    } else if (/[:*+?{}]/.test(c)) {
      throw new Error(
        `vercel.json pose des en-têtes sur « ${source} » : servir-export.mjs ne sait lire que des segments` +
          ' littéraux et des groupes ( … ). Étendre expressionDeLaSource() avant d’ajouter une telle règle,' +
          ' sinon les gardes serviraient autre chose que la production.',
      );
    } else {
      motif += c.replace(/[.\\^$|[\]]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${motif}$`);
}

// Le hachage d'un nom de fichier d'export : 32 hexadécimaux entre deux séparateurs (`entry-<md5>.js`,
// `Police.<md5>.ttf`, `icone.<md5>@2x.png`).
const HACHAGE_DANS_LE_NOM = /[-.]([0-9a-f]{32})(?:@\d+x)?(?:\.[A-Za-z0-9]+)+$/;

/**
 * **Le cache immuable de `vercel.json` ne vise que des fichiers dont le nom dit le contenu, et tous
 * ceux-là.** `Cache-Control: public, max-age=31536000, immutable` sur un nom qui ne change pas quand le
 * fichier change, c'est une app dont les visiteurs gardent un an l'ancien code après un déploiement.
 * Le nom ne se juge pas sur le papier : l'export le dit.
 *
 * Rend la liste des écarts, vide quand tout s'accorde :
 *  - pas une seule règle de cache immuable dans `vercel.json` ;
 *  - un fichier visé par la règle dont le nom ne porte pas de hachage, ou dont le hachage n'est pas le
 *    md5 de son contenu. Metro hache ensemble les ressources à plusieurs échelles (`icone.<h>.png`,
 *    `icone.<h>@2x.png`) : le hachage est celui du jeu, partagé par ses fichiers, et on y exige
 *    seulement qu'il soit là ;
 *  - un fichier qui porte un hachage dans son nom et que la règle ne vise pas — le signe d'un export
 *    qui a changé de convention de nommage, et un cache perdu en silence ;
 *  - un fichier sous `_expo/static/` ou `assets/` que la règle ne vise pas : ces deux dossiers sont
 *    ceux de la règle, tout fichier qui y entre sans hachage est un fichier qui se périmerait.
 */
export function controlerLeCacheImmuable(dist, config) {
  const ecarts = [];
  const regles = (config.headers ?? []).filter((regle) =>
    regle.headers.some(({ key, value }) => key.toLowerCase() === 'cache-control' && /\bimmutable\b/.test(value)),
  );
  if (regles.length === 0) {
    return ['vercel.json ne pose plus de Cache-Control immutable : les fichiers hachés de l’export seraient revalidés à chaque visite.'];
  }
  const motifs = regles.map((regle) => expressionDeLaSource(regle.source));

  const fichiers = readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter((entree) => entree.isFile())
    .map((entree) => `/${relative(dist, join(entree.parentPath, entree.name)).split(sep).join('/')}`);

  const parHachage = new Map();
  for (const fichier of fichiers) {
    const hachage = fichier.match(HACHAGE_DANS_LE_NOM)?.[1];
    if (hachage) parHachage.set(hachage, (parHachage.get(hachage) ?? 0) + 1);
  }

  for (const fichier of fichiers) {
    const vise = motifs.some((motif) => motif.test(fichier));
    const hachage = fichier.match(HACHAGE_DANS_LE_NOM)?.[1];
    if (vise) {
      if (!hachage) {
        ecarts.push(`${fichier} : cache immuable, mais son nom ne porte aucun hachage`);
        continue;
      }
      if (parHachage.get(hachage) === 1) {
        const contenu = createHash('md5').update(readFileSync(join(dist, fichier))).digest('hex');
        if (contenu !== hachage) {
          ecarts.push(`${fichier} : cache immuable, mais le hachage du nom (${hachage}) n’est pas le md5 du contenu (${contenu})`);
        }
      }
    } else if (hachage) {
      ecarts.push(`${fichier} : son nom porte un hachage, mais le cache immuable de vercel.json ne le vise pas`);
    } else if (/^\/(?:_expo\/static|assets)\//.test(fichier)) {
      ecarts.push(`${fichier} : sous un dossier de fichiers hachés, sans hachage dans son nom — le cache immuable ne le vise pas`);
    }
  }
  return ecarts;
}

/** La politique de `vercel.json`, l'origine Supabase de production remplacée par celle de l'export. */
export function politiqueServie(politique, origineSupabase) {
  return politique
    .split(';')
    .map((directive) => {
      const [nom, ...sources] = directive.trim().split(/\s+/);
      if (nom !== 'connect-src') return directive.trim();
      const remplacees = sources.map((source) => {
        if (!/^https:\/\/[^/]+\.supabase\.co$/.test(source)) return source;
        if (!origineSupabase) {
          throw new Error(
            'La CSP de vercel.json nomme le projet Supabase de production, et EXPO_PUBLIC_SUPABASE_URL' +
              ' n’est pas définie : impossible de servir la politique avec l’origine de cet export.' +
              ' La renseigner comme pour l’export lui-même.',
          );
        }
        return new URL(origineSupabase).origin;
      });
      return [nom, ...remplacees].join(' ');
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Branche sur une page ou un contexte Playwright le relevé des infractions à la CSP, **avant** la
 * première navigation. Rend la liste, qui se remplit au fil des navigations : l'écouteur est
 * réinstallé dans chaque document, et le relais par `exposeBinding` survit au changement de page,
 * là où un tableau gardé dans `window` repartirait de zéro.
 */
export async function releverLaCsp(cible) {
  const infractions = [];
  await cible.exposeBinding('__signalerInfractionCsp', (_source, infraction) => infractions.push(infraction));
  await cible.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (evenement) => {
      window.__signalerInfractionCsp({
        directive: evenement.effectiveDirective,
        bloque: evenement.blockedURI,
        page: evenement.documentURI,
      });
    });
  });
  return infractions;
}

/** Une ligne lisible par infraction, pour les messages d'échec des gardes. */
export function decrireInfractions(infractions) {
  return infractions.map(
    ({ directive, bloque, page }) => `${directive} a bloqué « ${bloque || 'inline'} » sur ${page}`,
  );
}

/** Démarre le serveur sur un port libre et rend son adresse, plus de quoi le refermer. */
/**
 * @param dist  le dossier d'export à servir
 * @param port  le port à écouter, ou `0` pour en laisser choisir un libre.
 *
 * **Le port fixe a eu une raison forte, et elle est tombée le 20/09/2026.** Elle était que l'app
 * calcule son `redirectTo` depuis `window.location.origin` (`src/lib/app-url.ts`) et que GoTrue
 * n'accepte que les origines de sa liste : servir sur un port au hasard faisait retomber le lien
 * sur la Site URL en silence. Les deux e-mails du produit ne portent plus de lien mais un code, et
 * `emailRedirectTo` a disparu des deux appels — donc plus aucun envoi ne dépend de l'origine.
 *
 * Ce qui reste, et qui suffit à garder `3000` par défaut : un port fixe rend un échec
 * **reproductible** (le même port d'un passage à l'autre, dans les captures comme dans les
 * journaux), et le retour OAuth est le seul chemin qui aurait encore besoin d'une origine
 * autorisée — rien ne l'éprouve ici aujourd'hui. `servirExport(dist, 0)` reste disponible pour une
 * machine où le port est pris : plus rien ne s'y casserait en silence.
 */
export async function servirExport(dist, port = 0) {
  const enTetes = enTetesDeProduction(
    JSON.parse(readFileSync('vercel.json', 'utf8')),
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  );
  const serveur = createServer((requete, reponse) => {
    const fichier = resoudre(dist, requete.url ?? '/');
    const enTetesDeLaRoute = enTetes(new URL(requete.url ?? '/', 'http://localhost').pathname);
    if (!fichier) {
      // **Comme Vercel : `404.html`, en statut 404, sur l'adresse demandée** (04/10/2026, seconde
      // passe de la revue finale). Sans elle, aucune garde n'ouvrait la page introuvable — sa pose
      // était vérifiée à l'octet près (`verifier-titres-export.mjs`), son hydratation sur une
      // adresse inconnue raisonnée seulement. Un export qui ne l'a pas encore (sans
      // `poser-la-page-introuvable.mjs`) répond comme avant.
      const introuvable = join(dist, '404.html');
      if (existsSync(introuvable)) {
        reponse.writeHead(404, { ...enTetesDeLaRoute, 'content-type': TYPES['.html'] });
        createReadStream(introuvable).pipe(reponse);
        return;
      }
      reponse.writeHead(404).end('introuvable');
      return;
    }
    reponse.writeHead(200, {
      ...enTetesDeLaRoute,
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
