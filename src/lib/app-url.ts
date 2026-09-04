import { Platform } from 'react-native';

// URL publique de l'app — utilisée pour composer des liens partageables (cf.
// bilan/resultat.tsx "Partager mon bilan", qui pointe vers /api/partage). Sur web, l'origine
// réelle de la page (marche aussi bien en prod qu'en preview Vercel, même logique que
// `redirectTo` dans lib/auth.ts) ; sur Android, pas de `window`, on retombe sur le domaine
// de production. `www` et non l'apex : c'est le domaine canonique côté Vercel, l'apex
// redirige en 308 vers lui.
export const APP_URL =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : 'https://www.traceverte.fr';
