/**
 * Une écriture en échec dit son genre (`v1-33` §9, 02/10/2026) : la connexion n'est nommée que hors
 * ligne. Ce fichier garde la phrase ; les appels — qui passent le **statut** de la réponse, et lui seul
 * — sont gardés là où ils vivent (`src/lib/plan-engagement.test.ts`, `src/lib/notification-prefs.test.ts`).
 */
import { messageDEcriture } from '@/types/ecriture-en-echec';

describe('messageDEcriture', () => {
  it('nomme la connexion hors ligne, et seulement hors ligne', () => {
    expect(messageDEcriture('Ton choix n’a pas été enregistré.', 'horsLigne')).toBe(
      'Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie.'
    );
    expect(messageDEcriture('Ton choix n’a pas été enregistré.', 'serveur')).toBe(
      'Ton choix n’a pas été enregistré. Réessaie dans un instant.'
    );
  });
});
