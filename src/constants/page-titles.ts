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
 * Format « Page — TraceVerte » : le navigateur tronque par la fin quand l'onglet rétrécit,
 * donc ce qui distingue la page vient en premier. La racine porte le nom seul, n'étant
 * qu'une redirection.
 */
export const PAGE_TITLES: Record<string, string> = {
  '/': 'TraceVerte',

  '/onboarding': 'Bienvenue — TraceVerte',
  '/onboarding/contexte': 'Où en est la France — TraceVerte',
  '/onboarding/reassurance': 'Comment ça marche — TraceVerte',
  '/onboarding/transition': 'On passe à ton bilan — TraceVerte',

  '/bilan': 'Ton bilan transport — TraceVerte',
  '/bilan/resultat': 'Ton résultat — TraceVerte',

  '/plan': 'Ton plan — TraceVerte',
  '/suivi': 'Ton suivi — TraceVerte',

  '/connexion': 'Se connecter — TraceVerte',
  '/connexion/email': 'Continuer avec un email — TraceVerte',
  '/connexion/mot-de-passe-oublie': 'Mot de passe oublié — TraceVerte',

  '/feedback': 'Nous faire un retour — TraceVerte',

  // Les deux seules surfaces publiques du produit : leurs URL sont données à Google Play et
  // à l'écran de consentement Google, et ce sont les seuls titres qu'un moteur de recherche
  // affichera jamais. Ils reprennent mot pour mot le titre visible de la page.
  '/confidentialite': 'Politique de confidentialité — TraceVerte',
  '/conditions': 'Conditions d’utilisation — TraceVerte',

  '/status': 'Diagnostic — TraceVerte',
};

/**
 * Titre de la page 404 — la seule que l'indexation par chemin ne peut pas atteindre :
 * `usePathname()` y rend l'URL fautive demandée, qui par définition n'est dans aucune table.
 * L'écran le pose donc lui-même (cf. `src/app/+not-found.tsx`), mais le texte reste ici,
 * avec les autres.
 */
export const NOT_FOUND_PAGE_TITLE = 'Page introuvable — TraceVerte';

/**
 * Titre des pages qu'Expo Router génère lui-même et qui n'ont pas de fichier dans
 * `src/app/` — la page 404 et le plan du site de développement. Sert aussi de filet pour
 * une route ajoutée sans titre : mieux vaut le nom du produit qu'un onglet vide, et le
 * script de vérification de l'export signale l'oubli de toute façon.
 */
export const DEFAULT_PAGE_TITLE = 'TraceVerte';

export function pageTitle(pathname: string): string {
  // Un chemin peut arriver avec un slash final selon d'où vient la navigation ; « / » seul
  // ne doit pas se retrouver réduit à la chaîne vide.
  const normalise = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PAGE_TITLES[normalise] ?? DEFAULT_PAGE_TITLE;
}
