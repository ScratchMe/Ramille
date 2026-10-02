/**
 * D19 de `v1-33` (01/10/2026) : une erreur du serveur ne parle pas de la connexion.
 *
 * Éprouvé en le cassant, le 01/10/2026 (TESTING.md §1.1), une mutation à la fois :
 *   - `genreDeLEchec` qui range tout en `horsLigne` (l'état d'avant, où toute lecture en échec parlait
 *     de connexion) → « un statut réel n'est pas une coupure » ;
 *   - `genreDesEchecs` qui rend le premier genre rencontré (`genres.find(…)`) → « une coupure
 *     gagne » ;
 *   - la phrase du plan, côté serveur, remise à « … Vérifie ta connexion. » → « aucune phrase du
 *     serveur ne parle de la connexion » et « les phrases, mot pour mot ».
 *
 * **Et le 02/10/2026, la relecture du suivi** : sa phrase du serveur remise à « … Vérifie ta
 * connexion. » (l'écran d'avant) → les deux mêmes.
 */
import {
  genreDeLEchec,
  genreDesEchecs,
  phraseDeLaLectureEnEchec,
  type EcranEnEchec,
} from '@/types/lecture-en-echec';

const ECRANS: EcranEnEchec[] = ['plan', 'relectureDuPlan', 'suivi', 'relectureDuSuivi', 'contexte'];

describe('genreDeLEchec', () => {
  it('un statut à zéro est une lecture hors ligne', () => {
    expect(genreDeLEchec(0)).toBe('horsLigne');
  });

  // Un 500, un 503 de la passerelle, un 404 au corps vide, un 401 : le serveur a répondu, et la
  // connexion de la personne n'y est pour rien.
  it('un statut réel n’est pas une coupure, quel qu’il soit', () => {
    for (const status of [200, 401, 404, 500, 503, 520]) {
      expect({ status, genre: genreDeLEchec(status) }).toEqual({ status, genre: 'serveur' });
    }
  });
});

describe('genreDesEchecs', () => {
  it('rien en échec, rien à dire', () => {
    expect(genreDesEchecs([])).toBeNull();
    expect(genreDesEchecs([null, null])).toBeNull();
  });

  it('une coupure gagne, où qu’elle soit dans la liste', () => {
    expect(genreDesEchecs(['serveur', 'horsLigne'])).toBe('horsLigne');
    expect(genreDesEchecs(['horsLigne', 'serveur'])).toBe('horsLigne');
    expect(genreDesEchecs([null, 'horsLigne', null])).toBe('horsLigne');
  });

  it('sans coupure, un seul échec suffit à dire « serveur »', () => {
    expect(genreDesEchecs([null, 'serveur'])).toBe('serveur');
  });
});

describe('phraseDeLaLectureEnEchec', () => {
  // L'invariant de la décision, sur toutes les phrases : celle du serveur ne parle jamais de connexion,
  // celle du hors-ligne en parle toujours.
  it('aucune phrase du serveur ne parle de la connexion, toutes celles du hors-ligne en parlent', () => {
    for (const ecran of ECRANS) {
      expect({ ecran, phrase: phraseDeLaLectureEnEchec(ecran, 'serveur') }).not.toEqual({
        ecran,
        phrase: expect.stringMatching(/connexion/i),
      });
      expect({ ecran, phrase: phraseDeLaLectureEnEchec(ecran, 'horsLigne') }).toEqual({
        ecran,
        phrase: expect.stringMatching(/Vérifie ta connexion/),
      });
    }
  });

  // Les textes de la décision, mot pour mot — et le hors-ligne tel qu'il était avant elle.
  it('les phrases, mot pour mot', () => {
    expect(phraseDeLaLectureEnEchec('plan', 'serveur')).toBe('Ton plan n’a pas pu être relu. Réessaie dans un instant.');
    expect(phraseDeLaLectureEnEchec('plan', 'horsLigne')).toBe('Ton plan n’a pas pu être relu. Vérifie ta connexion.');
    expect(phraseDeLaLectureEnEchec('relectureDuPlan', 'serveur')).toBe(
      'Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis.'
    );
    expect(phraseDeLaLectureEnEchec('relectureDuPlan', 'horsLigne')).toBe(
      'Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion.'
    );
    expect(phraseDeLaLectureEnEchec('suivi', 'serveur')).toBe('Ton suivi n’a pas pu être relu. Réessaie dans un instant.');
    expect(phraseDeLaLectureEnEchec('suivi', 'horsLigne')).toBe('Ton suivi n’a pas pu être relu. Vérifie ta connexion.');
    // La relecture du suivi, validée le 02/10/2026 ; le hors-ligne tel qu'il était.
    expect(phraseDeLaLectureEnEchec('relectureDuSuivi', 'serveur')).toBe(
      'Ton suivi n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis.'
    );
    expect(phraseDeLaLectureEnEchec('relectureDuSuivi', 'horsLigne')).toBe(
      'Ton suivi n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion.'
    );
    expect(phraseDeLaLectureEnEchec('contexte', 'serveur')).toBe(
      'Tes réponses n’ont pas pu être lues. Réessaie dans un instant.'
    );
    expect(phraseDeLaLectureEnEchec('contexte', 'horsLigne')).toBe(
      'Tes réponses n’ont pas pu être lues. Vérifie ta connexion et réessaie.'
    );
  });
});
