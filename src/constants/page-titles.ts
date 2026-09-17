import { APP_NAME } from '@/constants/produit';

/**
 * Titre d'onglet de chaque page, en un seul endroit, indexé par chemin d'URL.
 *
 * L'export statique d'Expo Router ne pose aucun titre par défaut : sans déclaration
 * explicite, chaque page sort avec un `<title>` **vide** — ce qui était le cas des dix-huit
 * pages du produit. Un onglet sans titre affiche l'URL, un favori enregistre l'URL, et un
 * moteur de recherche n'a plus que le contenu pour deviner de quoi parle la page.
 *
 * Indexé par chemin et pas par nom de fichier de route : c'est `usePathname()` qui sert de
 * clé au rendu (cf. `src/components/titre-de-page.tsx`), et le `title` des options de
 * navigation ne convient pas — vérifié, il ne descend pas dans le HTML pré-rendu, seulement
 * dans `document.title` après hydratation.
 *
 * Format « Page — Ramille » : le navigateur tronque par la fin quand l'onglet rétrécit,
 * donc ce qui distingue la page vient en premier. La racine porte le nom seul, n'étant
 * qu'une redirection.
 */
// Déclaré **avant** `PAGE_TITLES`, qui le référence : une `const` lue avant son initialisation
// lèverait à l'import du module, donc au premier rendu de n'importe quel écran.
export const NOT_FOUND_PAGE_TITLE = `Page introuvable — ${APP_NAME}`;

export const PAGE_TITLES: Record<string, string> = {
  '/': APP_NAME,

  '/onboarding': `Bienvenue — ${APP_NAME}`,

  '/bilan': `Ton bilan transport — ${APP_NAME}`,
  '/suivi/bilan': `Ton résultat — ${APP_NAME}`,
  '/bilan/resultat': `Ton résultat — ${APP_NAME}`,

  '/plan': `Ton plan — ${APP_NAME}`,
  '/plan/pistes': `Toutes les pistes — ${APP_NAME}`,
  '/suivi': `Ton suivi — ${APP_NAME}`,

  '/connexion': `Se connecter — ${APP_NAME}`,
  '/connexion/email': `Continuer avec un email — ${APP_NAME}`,
  '/connexion/retrouver': `Retrouver mon compte — ${APP_NAME}`,

  '/compte': `Toi — ${APP_NAME}`,

  '/feedback': `Nous faire un retour — ${APP_NAME}`,

  // Les deux seules surfaces publiques du produit : leurs URL sont données à Google Play et
  // à l'écran de consentement Google, et ce sont les seuls titres qu'un moteur de recherche
  // affichera jamais. Ils reprennent mot pour mot le titre visible de la page.
  '/confidentialite': `Politique de confidentialité — ${APP_NAME}`,
  '/conditions': `Conditions d’utilisation — ${APP_NAME}`,

  // Exigée par Google Play : une URL de suppression atteignable sans l'app, donc une page
  // publique à part entière, avec son titre.
  '/compte/suppression': `Supprimer mon compte — ${APP_NAME}`,

  // La sortie des rappels par le lien d'un email (C2.9). Atteignable sans session et sans l'app,
  // comme la page de suppression — mais **pas** une surface publique : elle n'a donc pas de
  // description, donc `TitreDePage` la met en `noindex`. Indexer une page qui ne s'ouvre qu'avec
  // un jeton à usage unique n'aurait aucun sens.
  '/rappels/stop': `Ne plus recevoir de rappels — ${APP_NAME}`,

  '/status': `Diagnostic — ${APP_NAME}`,

  // **La page 404 est une page exportée comme les autres, et c'est à ce titre qu'elle est ici.**
  // `+not-found.tsx` pose déjà `NOT_FOUND_PAGE_TITLE` par la surcharge de `TitreDePage`, mais
  // cette surcharge ne vaut qu'à l'exécution : dans le HTML **statique** produit pour la route
  // `/+not-found`, c'est le `TitreDePage` du layout racine qui gagne, et il résout un chemin que
  // cette table ne connaissait pas — d'où un « Ramille » seul, le repli générique, sur la seule
  // page du produit qu'on atteint sans l'avoir voulu. Même famille de piège que `cleanUrls` : ce
  // qui se construit n'est pas ce qui s'affiche, et seul `scripts/verifier-titres-export.mjs` le
  // voit.
  //
  // Les deux mécanismes restent nécessaires et ne se recouvrent pas : cette ligne titre le
  // fichier exporté, la surcharge titre l'onglet quand l'URL demandée est fautive — par
  // définition absente de cette table.
  '/+not-found': NOT_FOUND_PAGE_TITLE,
};

/**
 * Titre de la page 404 — la seule que l'indexation par chemin ne peut pas atteindre :
 * `usePathname()` y rend l'URL fautive demandée, qui par définition n'est dans aucune table.
 * L'écran le pose donc lui-même (cf. `src/app/+not-found.tsx`), mais le texte reste ici,
 * avec les autres.
 */
/**
 * Chemins qui ne sont pas des pages mais des **alias** : une adresse historique conservée en
 * redirection vers la page qui porte désormais le contenu. Ils partagent donc légitimement le
 * titre de leur cible, alors que deux vraies pages ne le doivent jamais (un titre dupliqué est
 * presque toujours un copier-coller oublié — c'est ce que le test épingle).
 *
 * `/bilan/resultat` a été l'adresse du résultat jusqu'à v1-11, où l'écran a rejoint la pile de
 * l'onglet Suivi. Elle survit parce qu'elle est citée dans les liens déjà partagés, dans les
 * favoris, et dans l'en-tête d'`api/partage.ts`.
 */
export const PAGES_ALIAS = new Set(['/bilan/resultat']);

/**
 * Les cinq seules pages que le produit offre à l'indexation, et la description que les moteurs
 * et les aperçus de lien afficheront sous leur titre.
 *
 * **Tout le reste est en `noindex`** (cf. `src/components/titre-de-page.tsx`) : l'export statique
 * produit une page HTML par route, donc `/plan`, `/suivi`, `/bilan`, `/compte`, `/connexion/*`,
 * `/feedback`, `/status` et le plan de site de développement d'Expo Router sortaient tous
 * indexables — seize coquilles vides qui concourent avec les deux pages légales, lesquelles sont
 * les seuls titres qu'un moteur affichera jamais (leurs URL sont données à Google Play et à
 * l'écran de consentement Google). `public/robots.txt` empêche le **crawl** ; seule une balise
 * `robots` par page empêche l'**indexation** d'une URL découverte ailleurs, d'où cette liste.
 *
 * La table est volontairement limitée à ces cinq chemins et pas étendue à `PAGE_TITLES` en
 * entier : une description doit être écrite, pas dérivée, et l'exiger sur `/bilan` ou
 * `/connexion/email` ferait échouer la garde d'export sur des pages qui n'ont aucune raison
 * d'en porter une. `scripts/verifier-titres-export.mjs` n'exige une description que sur les
 * pages listées ici.
 *
 * Pas d'`og:image` : une image d'aperçu demande un asset statique à produire **et** à faire
 * survivre à l'export, exactement le piège muet d'`assetlinks.json`. La carte de partage d'un
 * bilan, elle, a déjà la sienne — rendue à la volée par `api/share-card.ts` et posée en
 * `og:image` par `api/partage.ts`, qui sert son propre HTML hors de cet export.
 */
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Mesure l’empreinte carbone de tes trajets en quelques minutes, puis choisis ce que tu veux changer en premier.',

  '/onboarding':
    'Comment Ramille fonctionne : un bilan transport, un repère pour le situer, et un plan de réduction à ta main.',

  '/confidentialite':
    'Quelles données Ramille enregistre, pourquoi, combien de temps, et comment les exporter ou les supprimer.',

  '/conditions':
    'Les conditions d’utilisation de Ramille : ce que l’application fait, ce qu’elle ne fait pas, et ce à quoi tu as droit.',

  '/compte/suppression':
    'Supprime, depuis un navigateur et sans installer l’application, ton compte Ramille et les données qui y sont rattachées.',
};

/**
 * Titre des pages qu'Expo Router génère lui-même et qui n'ont pas de fichier dans
 * `src/app/` — la page 404 et le plan du site de développement. Sert aussi de filet pour
 * une route ajoutée sans titre : mieux vaut le nom du produit qu'un onglet vide, et le
 * script de vérification de l'export signale l'oubli de toute façon.
 */
export const DEFAULT_PAGE_TITLE = APP_NAME;

/**
 * Forme canonique d'un chemin : sans slash final, la racine exceptée.
 *
 * Un chemin arrive avec ou sans, selon d'où vient la navigation — et « / » seul ne doit pas se
 * retrouver réduit à la chaîne vide. Les trois résolutions ci-dessous partagent cette
 * normalisation, et l'`og:url` des pages publiques aussi : c'est ce qui garantit que l'URL
 * annoncée aux moteurs est celle que `sitemap.xml` déclare, au slash près.
 */
export function cheminCanonique(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function pageTitle(pathname: string): string {
  return PAGE_TITLES[cheminCanonique(pathname)] ?? DEFAULT_PAGE_TITLE;
}

/**
 * Résolution d'un chemin vers sa description indexée, ou `null` quand la page n'est pas une
 * surface publique — auquel cas `TitreDePage` pose `noindex` plutôt qu'une description vide.
 *
 * Même normalisation du slash final que `pageTitle`, par `cheminCanonique`.
 */
export function pageDescription(pathname: string): string | null {
  return PAGE_DESCRIPTIONS[cheminCanonique(pathname)] ?? null;
}

/**
 * Une page est offerte à l'indexation si, et seulement si, elle a une description écrite.
 *
 * Les deux faits sont le même : une page publique mérite une description, une page applicative
 * n'a rien à faire dans un index. Les lier évite la dérive classique — une entrée ajoutée d'un
 * côté, oubliée de l'autre, et une page d'app qui part dans Google avec un extrait vide.
 */
export function pageEstIndexable(pathname: string): boolean {
  return pageDescription(pathname) !== null;
}
