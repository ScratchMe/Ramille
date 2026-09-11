import { Platform } from 'react-native';

import { ORIGINE_CANONIQUE } from '@/constants/produit';

// URL publique de l'app — utilisée pour composer des liens partageables (cf.
// bilan/resultat.tsx "Partager mon bilan", qui pointe vers /api/partage). Sur web, l'origine
// réelle de la page (marche aussi bien en prod qu'en preview Vercel, même logique que
// `redirectTo` dans lib/auth.ts) ; sur Android, pas de `window`, on retombe sur le domaine
// canonique — lu dans `ORIGINE_CANONIQUE` et non recopié ici, le même fait servant au sitemap,
// à robots.txt et à l'`og:url` des pages publiques.
export const APP_URL =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : ORIGINE_CANONIQUE;
