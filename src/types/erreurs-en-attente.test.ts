/**
 * La file d'attente locale des erreurs (02/10/2026, `docs/exploitation/remontee-erreurs.md` §3).
 *
 * Ce fichier garde la file elle-même ; son stockage, son envoi et ses deux déclencheurs le sont dans
 * `src/lib/analytics.test.ts`.
 *
 * Éprouvé en le cassant le 02/10/2026 (`TESTING.md` §1.1), chacune faisant tomber la sienne :
 *   - `enfiler` sans borne (`.slice` retiré) → « garde les vingt plus récentes », seul ;
 *   - l'âge maximal ignoré à la lecture → « laisse tomber une erreur de plus de trente jours », seul ;
 *   - un refus du serveur gardé (`status === 0` retiré de `suiteDeLEnvoi`) → « vide la file sur un
 *     refus », seul.
 */
import {
  AGE_MAXIMAL_MS,
  enfiler,
  lireLaFile,
  propsDifferees,
  suiteDeLEnvoi,
  TAILLE_DE_LA_FILE,
  type ErreurEnAttente,
} from '@/types/erreurs-en-attente';

const MAINTENANT = Date.UTC(2026, 9, 2, 12);
const erreur = (n: number, noteeLe = MAINTENANT - n * 1000): ErreurEnAttente => ({
  category: 'type',
  route: `/plan?n=${n}`,
  noteeLe,
});

describe('enfiler', () => {
  it('garde les vingt plus récentes', () => {
    let file: ErreurEnAttente[] = [];
    for (let n = 0; n < TAILLE_DE_LA_FILE + 5; n += 1) file = enfiler(file, erreur(n));
    expect(file).toHaveLength(TAILLE_DE_LA_FILE);
    expect(file[0]).toEqual(erreur(5));
    expect(file[file.length - 1]).toEqual(erreur(TAILLE_DE_LA_FILE + 4));
  });
});

describe('lireLaFile', () => {
  it('rend la file stockée', () => {
    const file = [erreur(1), erreur(2)];
    expect(lireLaFile(JSON.stringify(file), MAINTENANT)).toEqual(file);
  });

  it('rend une file vide pour un stockage vide, illisible ou d’une autre forme', () => {
    expect(lireLaFile(null, MAINTENANT)).toEqual([]);
    expect(lireLaFile('{pas du json', MAINTENANT)).toEqual([]);
    expect(lireLaFile('{"a":1}', MAINTENANT)).toEqual([]);
  });

  it('écarte une entrée mal formée et garde les autres', () => {
    const brut = JSON.stringify([erreur(1), { category: 'inconnue', route: '/', noteeLe: MAINTENANT }, { route: 3 }]);
    expect(lireLaFile(brut, MAINTENANT)).toEqual([erreur(1)]);
  });

  it('laisse tomber une erreur de plus de trente jours', () => {
    const vieille = erreur(1, MAINTENANT - AGE_MAXIMAL_MS - 1);
    expect(lireLaFile(JSON.stringify([vieille, erreur(2)]), MAINTENANT)).toEqual([erreur(2)]);
  });
});

describe('propsDifferees', () => {
  it('dit que l’envoi est différé, et de combien d’heures', () => {
    expect(propsDifferees(erreur(0, MAINTENANT - 3.4 * 3_600_000), MAINTENANT)).toEqual({
      category: 'type',
      route: '/plan?n=0',
      differee: true,
      retard_h: 3,
    });
  });
});

describe('suiteDeLEnvoi', () => {
  it('vide la file sur un envoi réussi', () => {
    expect(suiteDeLEnvoi(201, null)).toBe('vider');
  });

  it('garde la file quand la requête n’a pas eu de réponse', () => {
    expect(suiteDeLEnvoi(0, { message: 'Failed to fetch' })).toBe('garder');
  });

  it('vide la file sur un refus : la rejouer la ferait refuser pour toujours', () => {
    expect(suiteDeLEnvoi(400, { message: 'refus' })).toBe('vider');
  });
});
