/**
 * Une écriture en échec dit son genre (`v1-33` §9, 02/10/2026) : la connexion n'est nommée que hors
 * ligne. Ce fichier garde la phrase. Les fonctions qui passent le **statut** de la réponse sont gardées
 * là où elles vivent pour le plan et les rappels (`src/lib/plan-engagement.test.ts`,
 * `src/lib/notification-prefs.test.ts`) ; la carte du point, le contexte et le canal de retour, et les
 * écrans qui appellent les rappels, ne le sont que par relecture (`v1-27` §12.29).
 *
 * Éprouvé en le cassant le 02/10/2026 (`TESTING.md` §1.1) : les deux suites interverties fait tomber ce
 * test, et lui seul dans ce fichier.
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
