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
export const PAGE_TITLES: Record<string, string> = {
  '/': APP_NAME,

  '/onboarding': `Bienvenue — ${APP_NAME}`,
  '/onboarding/contexte': `Où en est la France — ${APP_NAME}`,
  '/onboarding/reassurance': `Comment ça marche — ${APP_NAME}`,
  '/onboarding/transition': `On passe à ton bilan — ${APP_NAME}`,

  '/bilan': `Ton bilan transport — ${APP_NAME}`,
  '/suivi/bilan': `Ton résultat — ${APP_NAME}`,
  '/bilan/resultat': `Ton résultat — ${APP_NAME}`,

  '/plan': `Ton plan — ${APP_NAME}`,
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

  '/status': `Diagnostic — ${APP_NAME}`,
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

export const NOT_FOUND_PAGE_TITLE = `Page introuvable — ${APP_NAME}`;

/**
 * Titre des pages qu'Expo Router génère lui-même et qui n'ont pas de fichier dans
 * `src/app/` — la page 404 et le plan du site de développement. Sert aussi de filet pour
 * une route ajoutée sans titre : mieux vaut le nom du produit qu'un onglet vide, et le
 * script de vérification de l'export signale l'oubli de toute façon.
 */
export const DEFAULT_PAGE_TITLE = APP_NAME;

export function pageTitle(pathname: string): string {
  // Un chemin peut arriver avec un slash final selon d'où vient la navigation ; « / » seul
  // ne doit pas se retrouver réduit à la chaîne vide.
  const normalise = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PAGE_TITLES[normalise] ?? DEFAULT_PAGE_TITLE;
}
