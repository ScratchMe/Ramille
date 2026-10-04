// Ce qu'Expo Router fait d'une URL que le système ouvre, sur natif — et rien que sur natif : le
// contexte web l'ignore (`_ctx.web.js` d'expo-router). La règle est dans `cheminPourLeRouteur`,
// testée ; ce fichier ne fait que la brancher, et ne lève jamais — la documentation d'Expo Router
// prévient qu'une exception ici peut faire tomber l'app.
import { cheminPourLeRouteur } from '@/types/connexion';

export function redirectSystemPath(evenement: { path: string; initial: boolean }): string | null {
  try {
    return cheminPourLeRouteur(evenement);
  } catch {
    return evenement.path;
  }
}
