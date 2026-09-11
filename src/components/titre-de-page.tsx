import Head from 'expo-router/head';
import { usePathname } from 'expo-router';

import { cheminCanonique, pageDescription, pageTitle } from '@/constants/page-titles';
import { APP_NAME, ORIGINE_CANONIQUE } from '@/constants/produit';

/**
 * Pose les métadonnées de document web — titre, description, indexation, aperçu de lien — une
 * fois pour toutes les pages.
 *
 * Rendu dans le layout racine plutôt qu'écran par écran, pour la même raison que le rôle
 * d'en-tête de `ThemedText` est déduit du `type` : ce qui se déclare à seize endroits finit
 * par manquer au dix-septième, et un titre absent ne casse rien de visible — l'app se
 * construit, s'exporte et se déploie sans rien signaler. Ici une route nouvelle est titrée
 * dès qu'elle a une ligne dans `PAGE_TITLES`, et `scripts/verifier-titres-export.mjs`
 * refuse en CI tout HTML exporté au titre vide ou réduit au seul nom du produit.
 *
 * `expo-router/head` et pas l'option `title` du `Stack` : cette dernière ne descend pas
 * dans le HTML pré-rendu — vérifié dans `dist/`, elle ne met à jour `document.title`
 * qu'après hydratation, ce qu'un crawler ne voit pas.
 *
 * **Deux traitements, jamais un seul.** Une page qui a une description dans
 * `PAGE_DESCRIPTIONS` est une surface publique : elle la pose, avec les balises Open Graph que
 * les messageries lisent pour composer un aperçu. Toute autre page — le questionnaire, les deux
 * onglets, le compte, la connexion, le diagnostic, le plan de site de développement d'Expo
 * Router — reçoit `noindex, nofollow`. L'export produit une page HTML par route et « non liée »
 * n'est pas « non indexée » : sans cette balise, seize coquilles d'application concourent dans
 * les résultats de recherche avec les deux pages légales, qui sont les seules surfaces qu'un
 * moteur doit voir. `public/robots.txt` ne suffit pas — il empêche le crawl, pas l'indexation
 * d'une URL découverte ailleurs.
 *
 * `og:url` est composée depuis `ORIGINE_CANONIQUE`, **jamais** depuis `APP_URL` : cette dernière
 * vaut l'origine réelle côté client et le domaine canonique côté serveur, donc la balise aurait
 * différé entre le HTML statique et l'hydratation sur toutes les pages. L'origine canonique est
 * un fait statique — c'est déjà ainsi que `public/sitemap.xml` et `public/robots.txt` l'écrivent
 * — donc la valeur est identique des deux côtés et l'URL annoncée est exactement celle que le
 * sitemap déclare, `cheminCanonique` réglant le slash final.
 *
 * Pas d'`og:image` en revanche : elle demanderait un asset statique à produire et à faire
 * survivre à l'export, le piège muet d'`assetlinks.json` ; la carte d'un bilan partagé a déjà la
 * sienne, servie par `api/partage.ts` hors de cet export.
 *
 * La surcharge `titre` n'a qu'un usage, la page 404 : le chemin y est l'URL fautive
 * demandée, qui par définition n'est dans aucune table.
 *
 * Ne rend rien sur natif, où `Head` sert aux métadonnées de Handoff/Spotlight iOS : le
 * produit est Android-only en v1, la conséquence est nulle.
 */
export function TitreDePage({ titre }: { titre?: string }) {
  const pathname = usePathname();

  const titreResolu = titre ?? pageTitle(pathname);
  const description = pageDescription(pathname);

  return (
    <Head>
      <title>{titreResolu}</title>
      {description === null ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <>
          <meta name="description" content={description} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={APP_NAME} />
          <meta property="og:locale" content="fr_FR" />
          <meta property="og:title" content={titreResolu} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={`${ORIGINE_CANONIQUE}${cheminCanonique(pathname)}`} />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={titreResolu} />
          <meta name="twitter:description" content={description} />
        </>
      )}
    </Head>
  );
}
