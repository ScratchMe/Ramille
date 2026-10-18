/**
 * La file d'attente locale des erreurs (02/10/2026, `docs/exploitation/remontee-erreurs.md` §3 bis).
 *
 * Ce fichier garde la file elle-même ; son stockage et son envoi le sont dans `src/lib/analytics.test.ts`,
 * ses deux déclencheurs (`src/app/_layout.tsx`) ne le sont que par relecture.
 *
 * Éprouvé en le cassant le 02/10/2026 (`TESTING.md` §1.1), chacune faisant tomber la sienne :
 *   - `enfiler` sans borne (`.slice` retiré) → « garde les vingt plus récentes », seul ;
 *   - l'âge maximal ignoré à la lecture → « laisse tomber une erreur de plus de trente jours », seul ;
 *   - un refus du serveur gardé (`suiteDeLEnvoi` rend « garder » sur toute erreur) → « vide la file sur un
 *     refus », seul ici — et « ne garde pas une panne envoyée, ni une panne refusée » dans
 *     `src/lib/analytics.test.ts` ;
 *   - une panne du serveur qui vide (`status >= 500` retiré) → « garde la file sur une panne passagère du
 *     serveur », seul ; de même `429` retiré (contre-lecture du 02/10/2026 : la première version vidait
 *     la file sur tout statut autre que 0).
 */
import { MAX_PROP_KEYS, MAX_PROP_VALUE_LENGTH, sanitizeEventProps } from '@/types/analytics';
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

describe('l’origine et la version d’une panne gardée (18/10/2026)', () => {
  const avecOrigine: ErreurEnAttente = { ...erreur(1), origine: 'fatale', version: '1.0.0+14' };

  it('se gardent, et se relisent', () => {
    expect(lireLaFile(JSON.stringify([avecOrigine]), MAINTENANT)).toEqual([avecOrigine]);
  });

  it('une entrée d’une version d’avant, sans elles, se relit telle quelle', () => {
    expect(lireLaFile(JSON.stringify([erreur(1)]), MAINTENANT)).toEqual([erreur(1)]);
  });

  it('une origine inconnue, ou une version d’une autre forme, écarte l’entrée', () => {
    const brut = JSON.stringify([
      { ...erreur(1), origine: 'inventee' },
      { ...erreur(2), version: 14 },
      { ...erreur(3), version: 'x'.repeat(MAX_PROP_VALUE_LENGTH + 1) },
      avecOrigine,
    ]);
    expect(lireLaFile(brut, MAINTENANT)).toEqual([avecOrigine]);
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

  it('porte l’origine et la version de la panne, celles du moment où elle est arrivée', () => {
    const panne: ErreurEnAttente = { ...erreur(0, MAINTENANT - 7_200_000), origine: 'fatale', version: '1.0.0+14' };
    expect(propsDifferees(panne, MAINTENANT)).toEqual({
      category: 'type',
      route: '/plan?n=0',
      origine: 'fatale',
      version: '1.0.0+14',
      differee: true,
      retard_h: 2,
    });
  });

  /**
   * **La panne différée la plus large remplit les six clés que la base accepte, et pas une de plus.** Une
   * septième — une propriété ajoutée à `app_error` sans y penser — ferait perdre `retard_h`, la dernière,
   * à l'écrêtage (`sanitizeEventProps`), sans que rien ne le dise. Éprouvé le 18/10/2026 : une clé de plus
   * dans `propsDifferees` → ce test, et les deux qui comparent l'objet entier — celui-ci est le seul qui
   * tomberait encore si l'on corrigeait les deux autres en y ajoutant la clé.
   */
  it('tient dans la borne de la base, sans rien perdre à l’écrêtage', () => {
    const panne: ErreurEnAttente = { ...erreur(0), origine: 'promesse', version: '1.0.0+14' };
    const props = propsDifferees(panne, MAINTENANT);
    expect(Object.keys(props).length).toBeLessThanOrEqual(MAX_PROP_KEYS);
    expect(sanitizeEventProps(props)).toEqual(props);
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
    for (const status of [400, 401, 403, 404, 409]) {
      expect(suiteDeLEnvoi(status, { message: 'refus' })).toBe('vider');
    }
  });

  it('garde la file sur une panne passagère du serveur — 5xx, trop de requêtes, délai dépassé', () => {
    for (const status of [500, 502, 503, 504, 429, 408]) {
      expect(suiteDeLEnvoi(status, { message: 'panne' })).toBe('garder');
    }
  });
});
