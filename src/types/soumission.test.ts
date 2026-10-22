import { CODE_REFUS_DE_PLAFOND, TROP_DE_BILANS } from '@/types/refus-de-plafond';
import {
  echecDeLaSoumission,
  ETAPES_SOUMISSION,
  GENRES_ERREUR_SOUMISSION,
  genreErreurSoumission,
  repriseDeLaSoumission,
  SOUMISSION_ECHOUEE,
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

// Le nouvel essai d'une soumission interrompue (04/10/2026) : il rejouait tout, et réécrire les réponses
// d'un bilan déjà finalisé lève sur la policy d'`assessment_answers` — à chaque essai.
//
// Éprouvé en cassant ce qu'il garde, le 04/10/2026 : un bilan finalisé rendu à `tout` fait tomber le
// deuxième test, seul.
describe('repriseDeLaSoumission', () => {
  it('rejoue tout d’un bilan encore en cours', () => {
    expect(repriseDeLaSoumission('in_progress')).toBe('tout');
  });

  it('ne rejoue que le calcul d’un bilan déjà finalisé', () => {
    expect(repriseDeLaSoumission('completed')).toBe('calcul');
  });

  it('repart d’un bilan neuf quand l’ancien a disparu ou a été retiré', () => {
    expect(repriseDeLaSoumission(null)).toBe('nouveau');
    expect(repriseDeLaSoumission('withdrawn')).toBe('nouveau');
  });
});

// Ce que le questionnaire dit d'une soumission qui a échoué (22/10/2026) : le plafond de bilans a sa phrase,
// « Réessaie demain », et pas de détail ; toute autre erreur garde la phrase d'avant. Ce fichier garde la
// dérivation, **jamais son appel** : que l'écran la branche est gardé par
// `src/tests/ecrans/plafond-de-bilans.test.tsx`.
//
// Éprouvé en cassant ce qu'il garde, le 22/10/2026 (`TESTING.md` §1.1) : le plafond plus reconnu dans
// `echecDeLaSoumission` → 3 ici (« dit le plafond de bilans… », « ne montre pas le JSON… », « lit le plafond
// au code et non au genre ») et 3 à l'écran ; son détail rendu par `decrireErreur` au lieu de `null` → 2 ici
// (« dit le plafond de bilans… », « ne montre pas le JSON… ») et 1 à l'écran. La reconnaissance elle-même et
// son compte complet : en tête de `src/types/refus-de-plafond.test.ts`.
describe('echecDeLaSoumission', () => {
  // Ce que PostgREST rend du `raise exception … using errcode = 'RM002'` de `plafonner_les_bilans`.
  const PLAFOND = {
    code: CODE_REFUS_DE_PLAFOND,
    message: 'Tu as commencé beaucoup de bilans aujourd’hui. Reviens demain.',
    details: null,
    hint: null,
  };
  const CONTRAINTE = { code: '23514', message: 'new row violates check constraint', details: 'Failing row', hint: null };

  it('dit le plafond de bilans pour ce qu’il est : demain, et aucune cause à recopier', () => {
    expect(echecDeLaSoumission(PLAFOND, genreErreurSoumission(PLAFOND))).toEqual({
      message: TROP_DE_BILANS,
      detail: null,
    });
  });

  // Le détail d'un objet PostgREST est son JSON, code et message du serveur compris : sous une phrase qui
  // dit déjà la même chose, c'était du bruit en anglais et en SQL.
  it('ne montre pas le JSON de l’erreur sous la phrase du plafond', () => {
    expect(echecDeLaSoumission(PLAFOND, 'autre').detail).toBeNull();
  });

  // Le plafond se lit au code, pas au genre que la mesure en tire : `RM002` est un `autre` pour la mesure
  // (aucun genre neuf sans migration de `usage_events`), et le genre qu'on lui passe ne change pas la phrase.
  it('lit le plafond au code et non au genre', () => {
    expect(genreErreurSoumission(PLAFOND)).toBe('autre');
    expect(echecDeLaSoumission(PLAFOND, 'reseau').message).toBe(TROP_DE_BILANS);
    expect(echecDeLaSoumission(PLAFOND, 'contrainte').message).toBe(TROP_DE_BILANS);
  });

  it('garde la phrase des pannes, et sa cause à recopier, pour toute autre erreur', () => {
    expect(echecDeLaSoumission(CONTRAINTE, genreErreurSoumission(CONTRAINTE))).toEqual({
      message: SOUMISSION_ECHOUEE,
      detail: JSON.stringify(CONTRAINTE),
    });
    expect(SOUMISSION_ECHOUEE).toBe(
      'Ton bilan n’a pas pu être enregistré. Tes réponses sont conservées, réessaie dans un instant.'
    );
  });

  // La même phrase du serveur sous un autre code n'est pas un plafond.
  it('ne prend pas pour un plafond une autre erreur qui porte la même phrase', () => {
    const memePhrase = { code: 'XX000', message: PLAFOND.message };
    expect(echecDeLaSoumission(memePhrase, genreErreurSoumission(memePhrase)).message).toBe(SOUMISSION_ECHOUEE);
  });

  // Sur une coupure réseau (13.2, recette web du 16/09/2026), la phrase est déjà toute la vérité.
  it('ne donne aucun détail sur une coupure réseau', () => {
    const coupure = new TypeError('Network request failed');
    expect(echecDeLaSoumission(coupure, genreErreurSoumission(coupure))).toEqual({
      message: SOUMISSION_ECHOUEE,
      detail: null,
    });
  });
});
