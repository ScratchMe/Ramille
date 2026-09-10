// Refuse un export web qui se construit parfaitement mais ne s'affiche pas.
//
// **Le trou que ce script bouche.** Les deux autres gardes lisent le HTML produit : elles
// vérifient qu'il existe et qu'il porte un titre. Aucune ne l'exécute. Le 08/09/2026, un hook
// natif appelé sans condition dans le layout racine (`useLastNotificationResponse`, absent du
// module web) a levé pendant le rendu et fait tomber tout l'arbre React : page blanche sur
// **toutes** les routes, pages légales comprises — pendant que la CI était verte, les vingt
// pages sorties avec leur titre et le HTML servi en 200. Rien, nulle part, ne pouvait le voir.
//
// La classe de défaut se reproduira : chaque module natif qui entre dans le projet apporte des
// méthodes absentes de sa version web, et une exception au rendu du layout racine n'a aucun
// effet local — elle emporte l'app entière.
//
// Trois vérifications par route, et la première est la plus importante :
//
//   1. **La page affiche quelque chose de reconnaissable.** C'est ce qui attrape la page
//      blanche quelle que soit la cause, sans dépendre de la façon dont React classe l'erreur.
//   2. **Aucun écran de panne.** Depuis le chantier C0.4, `src/app/_layout.tsx` exporte un
//      `ErrorBoundary` : une exception de rendu n'efface plus la page, elle affiche un écran.
//      C'est un progrès pour la personne qui l'utilise et une perte pour ce garde-fou — React
//      ne signale plus en `pageerror` ce qu'un boundary a rattrapé. Reconnaître les deux écrans
//      de panne (le nôtre, et celui d'Expo Router qui reste en anglais) rend au contrôle la
//      rigueur qu'il avait avant, sans renoncer au filet.
//   3. **Aucune exception non rattrapée**, hors erreurs d'hydratation (voir plus bas).
//
// Ce qui n'est PAS vérifié ici, volontairement : le réseau. L'export de CI est construit avec
// une configuration Supabase factice, donc chaque page échoue à joindre la base — les erreurs
// de console sont attendues et ne font pas échouer ce contrôle. On teste le rendu, pas les
// données.
//
// Lancé en CI après `expo export`, cf. .github/workflows/ci.yml.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

import { chromium } from 'playwright';

const DIST = process.argv[2] ?? 'dist';

// Un marqueur par route : un fragment de texte que la page ne peut pas afficher si elle n'a
// pas rendu. Choisis dans du contenu stable — un titre de section, une phrase de Ramille —
// jamais un libellé décoratif qui bougera au prochain ajustement de copie.
//
// `marqueur: null` là où le contenu **dépend du réseau** : la racine ouvre une session avant
// de router, et l'export de CI est construit avec une configuration Supabase factice — elle y
// affiche donc son écran d'échec de démarrage, ce qui est le comportement correct. Y épingler
// un texte reviendrait soit à figer une copie d'erreur, soit à faire échouer la CI pour une
// raison étrangère au rendu. La page doit seulement ne pas être vide, et c'est bien ce que ce
// garde-fou protège.
const ROUTES = [
  { chemin: '/', marqueur: null },
  { chemin: '/onboarding', marqueur: 'Moi, c’est Ramille' },
  { chemin: '/confidentialite', marqueur: 'Politique de confidentialité' },
  { chemin: '/conditions', marqueur: 'Conditions d’utilisation' },
  // Surface publique exigée par Google Play : elle doit s'afficher sans l'app et sans compte.
  { chemin: '/compte/suppression', marqueur: 'Supprimer mon compte' },
];

// Les deux écrans de panne, qu'aucune route ne doit afficher.
//
// `Something went wrong` est l'écran de secours d'Expo Router — en anglais, sur fond noir.
// Depuis C0.4, plus rien ne devrait l'afficher : notre `Try` est le seul de l'arbre (Expo Router
// 57 n'en monte un que là où une route exporte un `ErrorBoundary`), et une exception levée
// au-dessus de lui ne rend pas cet écran mais une page blanche — que le contrôle de page vide
// attrape. On garde la chaîne parce qu'elle redevient atteignable le jour où notre boundary
// disparaît, où une route est rendue hors de notre layout, ou si Expo Router monte à nouveau son
// propre filet. Le produit ne parle français qu'en français, y compris en panne.
//
// Le second est le titre de `src/components/erreur-inattendue.tsx`. **Les deux textes sont
// couplés à la main** : changer ce titre sans venir ici rendrait le contrôle aveugle, d'où le
// renvoi inverse écrit dans l'en-tête du composant.
const ECRANS_DE_PANNE = [
  { texte: 'Something went wrong', quoi: 'l’écran de secours d’Expo Router (en anglais)' },
  { texte: 'L’écran n’a pas pu s’afficher', quoi: 'l’écran d’erreur du produit' },
];

// Les erreurs d'hydratation sont signalées, jamais bloquantes. React reprend la main en
// rendant côté client : la page **s'affiche**, ce que le marqueur ci-dessus vérifie de toute
// façon. Les faire échouer ici rendrait le garde-fou inutilisable pour une raison qui n'a rien
// à voir avec ce qu'il protège — et il en existe une, connue, sur les pages légales : `APP_URL`
// vaut l'origine réelle côté client et le domaine de production côté serveur.
const HYDRATATION = /Minified React error #(418|421|422|423|425)\b|hydrat/i;

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

// Reproduit `cleanUrls` de vercel.json : l'export d'Expo Router produit un **répertoire**
// `plan/index.html` pour une route qui a des enfants, un **fichier plat** `suivi.html` sinon.
// Servir seulement la première forme, c'est ce que faisait Vercel avant `cleanUrls`, et la
// moitié des routes répondait 404 en production. Le garde-fou doit servir comme la production,
// sinon il teste autre chose.
function resoudre(url) {
  const chemin = normalize(decodeURIComponent(url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  for (const candidat of [
    join(DIST, chemin),
    join(DIST, `${chemin}.html`),
    join(DIST, chemin, 'index.html'),
  ]) {
    if (existsSync(candidat) && statSync(candidat).isFile()) return candidat;
  }
  return null;
}

const serveur = createServer((requete, reponse) => {
  const fichier = resoudre(requete.url ?? '/');
  if (!fichier) {
    reponse.writeHead(404).end('introuvable');
    return;
  }
  reponse.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
  createReadStream(fichier).pipe(reponse);
});

await new Promise((resoudre) => serveur.listen(0, '127.0.0.1', resoudre));
const base = `http://127.0.0.1:${serveur.address().port}`;

// `CHROMIUM_PATH` laisse pointer un binaire déjà présent — utile là où les navigateurs de
// Playwright sont installés hors de son arborescence habituelle. En CI, la variable est
// absente et le navigateur vient de `npx playwright install chromium`.
const navigateur = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const echecs = [];
const avertissements = [];

for (const { chemin, marqueur } of ROUTES) {
  const page = await navigateur.newPage({ viewport: { width: 420, height: 900 } });
  const exceptions = [];
  page.on('pageerror', (erreur) => exceptions.push(String(erreur)));

  try {
    await page.goto(base + chemin, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    // Le temps que le bundle s'exécute et que l'app monte. Généreux : un runner de CI est
    // plus lent qu'un poste, et un faux échec ici coûterait la confiance dans le garde-fou.
    await page.waitForTimeout(6_000);
    const texte = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();

    const bloquantes = exceptions.filter((e) => !HYDRATATION.test(e));
    avertissements.push(...exceptions.filter((e) => HYDRATATION.test(e)).map((e) => `${chemin} : ${e.slice(0, 160)}`));

    // L'ordre compte : un écran de panne fait aussi disparaître le marqueur de la route, et
    // signaler « le marqueur est absent » cacherait la cause derrière son symptôme.
    const panne = ECRANS_DE_PANNE.find((ecran) => texte.includes(ecran.texte));

    if (!texte) {
      echecs.push(`${chemin} : la page est vide.${bloquantes[0] ? ` Cause probable — ${bloquantes[0].slice(0, 220)}` : ''}`);
    } else if (panne) {
      echecs.push(
        `${chemin} : ${panne.quoi} s’affiche (« ${panne.texte} »). Une exception a été levée` +
          ` pendant le rendu, et elle a été rattrapée — donc elle n’apparaît pas ci-dessous.` +
          ` Rendu : « ${texte.slice(0, 200)}… »`
      );
    } else if (marqueur && !texte.includes(marqueur)) {
      echecs.push(`${chemin} : « ${marqueur} » est absent de la page. Rendu : « ${texte.slice(0, 120)}… »`);
    }
    if (bloquantes.length > 0) {
      echecs.push(`${chemin} : exception non rattrapée — ${bloquantes[0].slice(0, 260)}`);
    }
  } catch (erreur) {
    echecs.push(`${chemin} : ${String(erreur).slice(0, 200)}`);
  } finally {
    await page.close();
  }
}

await navigateur.close();
serveur.close();

for (const avertissement of avertissements) {
  console.warn(`Avertissement (hydratation, non bloquant) — ${avertissement}`);
}

if (echecs.length > 0) {
  console.error('L’export se construit mais ne s’affiche pas :\n');
  for (const echec of echecs) console.error(`  - ${echec}`);
  console.error(
    '\nUne exception pendant le rendu du layout racine emporte tout l’arbre React : le HTML' +
      '\nest servi, le titre est correct, et l’app ne démarre pas. Cause la plus fréquente : une' +
      '\nAPI de module natif appelée sur web — les hooks s’exécutent au rendu, une garde placée' +
      '\ndans un effet arrive trop tard.' +
      '\n\nSi c’est un écran de panne qui s’affiche, l’exception a été rattrapée : elle n’est pas' +
      '\ndans la liste ci-dessus. Elle est dans la console du navigateur — rejouer l’export en' +
      '\nlocal (expo export --platform web) et ouvrir la route en cause la fait apparaître.'
  );
  process.exit(1);
}

console.log(`${ROUTES.length} routes rendues, aucun écran de panne, aucune exception bloquante.`);
