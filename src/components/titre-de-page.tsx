import Head from 'expo-router/head';
import { usePathname } from 'expo-router';

import { pageTitle } from '@/constants/page-titles';

/**
 * Pose le `<title>` du document web, une fois pour toutes les pages.
 *
 * Rendu dans le layout racine plutôt qu'écran par écran, pour la même raison que le rôle
 * d'en-tête de `ThemedText` est déduit du `type` : ce qui se déclare à seize endroits finit
 * par manquer au dix-septième, et un titre absent ne casse rien de visible — l'app se
 * construit, s'exporte et se déploie sans rien signaler. Ici une route nouvelle est titrée
 * dès qu'elle a une ligne dans `PAGE_TITLES`, et `scripts/verifier-titres-export.mjs`
 * refuse en CI tout HTML exporté au titre vide ou générique.
 *
 * `expo-router/head` et pas l'option `title` du `Stack` : cette dernière ne descend pas
 * dans le HTML pré-rendu — vérifié dans `dist/`, elle ne met à jour `document.title`
 * qu'après hydratation, ce qu'un crawler ne voit pas.
 *
 * La surcharge `titre` n'a qu'un usage, la page 404 : le chemin y est l'URL fautive
 * demandée, qui par définition n'est dans aucune table.
 *
 * Ne rend rien sur natif, où `Head` sert aux métadonnées de Handoff/Spotlight iOS : le
 * produit est Android-only en v1, la conséquence est nulle.
 */
export function TitreDePage({ titre }: { titre?: string }) {
  const pathname = usePathname();

  return (
    <Head>
      <title>{titre ?? pageTitle(pathname)}</title>
    </Head>
  );
}
