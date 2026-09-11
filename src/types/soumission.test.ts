import {
  ETAPES_SOUMISSION,
  GENRES_ERREUR_SOUMISSION,
  genreErreurSoumission,
} from '@/types/soumission';

describe('genreErreurSoumission', () => {
  // Le cas le plus fréquent, et celui pour lequel « réessaie dans un instant » est vrai. Il se
  // reconnaît par une absence de code : une requête qui n'a pas atteint Postgres ne rapporte
  // aucun SQLSTATE.
  it('classe en réseau ce qui ne porte aucun code', () => {
    expect(genreErreurSoumission(new TypeError('Network request failed'))).toBe('reseau');
    expect(genreErreurSoumission({ message: 'Failed to fetch' })).toBe('reseau');
    expect(genreErreurSoumission({ message: 'x', code: '' })).toBe('reseau');
    expect(genreErreurSoumission(null)).toBe('reseau');
    expect(genreErreurSoumission(undefined)).toBe('reseau');
    expect(genreErreurSoumission('Network request failed')).toBe('reseau');
  });

  // La classe 23 entière, pas seulement le 23514 d'un CHECK : le doublon de clé primaire sur
  // `assessment_answers` est le cas réel de la reprise d'un bilan `in_progress`.
  it('classe en contrainte toute la classe 23', () => {
    expect(genreErreurSoumission({ code: '23514' })).toBe('contrainte');
    expect(genreErreurSoumission({ code: '23505' })).toBe('contrainte');
    expect(genreErreurSoumission({ code: '23503' })).toBe('contrainte');
    expect(genreErreurSoumission({ code: '23502' })).toBe('contrainte');
  });

  // 42501 couvre le refus de privilège et le refus de RLS sans les distinguer — c'est une
  // propriété de PostgreSQL, pas un choix (CLAUDE.md).
  it('classe en permission le 42501', () => {
    expect(genreErreurSoumission({ code: '42501' })).toBe('permission');
  });

  it('classe en introuvable le no_data_found des RPC du produit', () => {
    expect(genreErreurSoumission({ code: 'P0002' })).toBe('introuvable');
  });

  // **Un code PostgREST n'est pas une absence de code.** Le ranger en `reseau` ferait lire une
  // panne de connexion là où la requête est arrivée et a reçu une réponse : c'est la confusion
  // qui rendrait la mesure inutile, puisque `reseau` est le seul genre dont on ne cherche pas la
  // cause.
  it('ne prend pas un code PostgREST pour une coupure réseau', () => {
    expect(genreErreurSoumission({ code: 'PGRST116' })).toBe('autre');
    expect(genreErreurSoumission({ code: 'PGRST301' })).toBe('autre');
  });

  it('classe en autre un SQLSTATE qu’aucune règle ne nomme', () => {
    expect(genreErreurSoumission({ code: '22003' })).toBe('autre');
    expect(genreErreurSoumission({ code: '40001' })).toBe('autre');
  });

  // Le genre part dans `usage_events.props`, dont `check_usage_event_props` borne les valeurs de
  // chaîne à 48 caractères. Les valeurs viennent du code, donc la borne ne peut être franchie que
  // par une étourderie en ajoutant une entrée — c'est exactement ce qu'un test épingle bien.
  it('ne rend jamais une valeur hors de la liste fermée', () => {
    const genres: readonly string[] = GENRES_ERREUR_SOUMISSION;
    for (const code of ['23514', '42501', 'P0002', 'PGRST116', '22003', '']) {
      expect(genres).toContain(genreErreurSoumission({ code }));
    }
    for (const valeur of [...GENRES_ERREUR_SOUMISSION, ...ETAPES_SOUMISSION]) {
      expect(valeur.length).toBeLessThanOrEqual(48);
    }
  });
});

describe('ETAPES_SOUMISSION', () => {
  // L'ordre est celui de la séquence, et il porte un sens : `creation` ne laisse rien derrière
  // elle, `finalisation` laisse un bilan `in_progress` que la tentative suivante reprend. Les
  // inverser rendrait la mesure illisible sans rien casser — d'où ce test.
  it('décrit la séquence dans son ordre', () => {
    expect(ETAPES_SOUMISSION).toEqual([
      'session',
      'creation',
      'reponses',
      'finalisation',
      'calcul',
    ]);
  });
});
