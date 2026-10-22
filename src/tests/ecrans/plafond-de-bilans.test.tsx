/**
 * Le plafond de bilans, vu du questionnaire (22/10/2026).
 *
 * La base refuse la création d'un onzième bilan dans la journée, en `RM002` (`plafonner_les_bilans`,
 * `20261005170000`). Le questionnaire disait alors « … réessaie dans un instant », suivi du JSON de
 * l'erreur : fausse d'un refus qui dure jusqu'au lendemain, et inutile. `echecDeLaSoumission`
 * (`src/types/soumission.ts`) dit « Réessaie demain » ; il a son test, qui garde la **fonction** —
 * pas son appel. Ce que l'écran en fait est une décision d'écran, que ni `src/types` ni le parcours
 * réel ne voient (il ne dépasse jamais dix bilans) : c'est le critère de `TESTING.md` §2.10.
 *
 * Trois choses se gardent ici, parce qu'elles sont vraies de l'écran et de nulle part ailleurs :
 *   - la phrase du plafond est celle qui s'affiche, sans la cause à recopier ;
 *   - le questionnaire revient tel qu'il était : le calcul a cédé la place, le bouton répond, rien n'a été
 *     effacé — ni le brouillon, ni la navigation vers la restitution ;
 *   - toute autre panne garde sa phrase et sa cause.
 *
 * **Éprouvé en le cassant, le 22/10/2026** (`TESTING.md` §1.1), le fichier restauré depuis l'état commité
 * après chaque mutation :
 *   - l'écran revenu à sa phrase et à son détail d'avant (`setMessage` fixe, `JSON.stringify(error)`) → 3 :
 *     « dit « Réessaie demain »… », « laisse le bouton soumettre de nouveau… » et « mesure le refus à la
 *     création » (qui attend la phrase avant de lire la mesure). La dernière garde, « autre erreur », reste
 *     verte — c'est ce qu'on attend d'elle ;
 *   - `clearBilanDraft()` appelé dans le `catch` (le brouillon effacé sur un échec) → « dit « Réessaie
 *     demain »… », seul, par son assertion « rien n'a été effacé » ;
 *   - la dérivation (`echecDeLaSoumission`) et la reconnaissance (`estUnRefusDePlafond`) cassées font
 *     aussi tomber ce fichier : leur compte est dans `src/types/soumission.test.ts` et
 *     `src/types/refus-de-plafond.test.ts`.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import BilanQuestionnaire from '@/app/bilan';
import { RAMILLE } from '@/constants/mascotte';
import { track } from '@/lib/analytics';
import { clearBilanDraft, loadBilanDraft } from '@/lib/bilan-draft';
import { EMPTY_BILAN_ANSWERS, type BilanAnswers } from '@/types/bilan';
import { CODE_REFUS_DE_PLAFOND, TROP_DE_BILANS } from '@/types/refus-de-plafond';
import { SOUMISSION_ECHOUEE } from '@/types/soumission';

// ── Les doublures : le réseau, le stockage et la navigation. Les étapes, `StepShell` et la dérivation
// de l'échec sont vraies.

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false), dismissAll: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  useIsFocused: () => true,
}));
jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/lib/bilan-draft', () => ({
  loadBilanDraft: jest.fn(),
  saveBilanDraft: jest.fn(),
  clearBilanDraft: jest.fn(async () => {}),
}));
jest.mock('@/lib/bilan-history', () => ({
  loadLastSubmittedAnswers: jest.fn(async () => ({ ok: true, data: null })),
}));
jest.mock('@/lib/engagement-en-cours', () => ({
  lireLEngagementEnCours: jest.fn(async () => ({ ok: true, data: null })),
}));
jest.mock('@/lib/marque-de-bilan', () => ({
  aDejaVuUnBilan: jest.fn(async () => false),
  marquerQuIlYAUnBilan: jest.fn(async () => {}),
}));
jest.mock('@/lib/premier-parcours', () => ({
  lireLePremierParcours: jest.fn(async () => null),
  noterLePremierParcours: jest.fn(async () => {}),
}));

// La soumission lit d'abord le bilan en cours qui traîne (aucun), puis crée le sien : c'est cette création
// que la base refuse, et `mockCreation` rend la réponse que le test décide.
const mockCreation = jest.fn();
jest.mock('@/lib/supabase', () => {
  const chaine: Record<string, unknown> = {};
  for (const methode of ['select', 'eq', 'order', 'limit', 'insert']) chaine[methode] = () => chaine;
  chaine.maybeSingle = async () => ({ data: null, error: null });
  chaine.single = () => mockCreation();
  return {
    ensureSession: jest.fn(async () => ({ user: { id: 'u1' } })),
    supabase: { from: () => chaine },
  };
});

/** Des réponses qui rendent toutes les étapes visibles complètes : le dernier « Voir mon bilan » soumet. */
const COMPLET: BilanAnswers = {
  ...EMPTY_BILAN_ANSWERS,
  commute_has_regular_trip: true,
  commute_days_per_week: 5,
  commute_distance_km: 20,
  commute_mode: 'bus',
  commute_second_mode_used: false,
  leisure_frequency: 'rarely',
  flights_total_per_year: 0,
  train_long_trips_per_year: 0,
  coach_long_trips_per_year: 0,
  car_long_trips_per_year: 0,
  zone_type: 'rural',
  transports_proches: ['bus'],
  household_vehicles: '1',
  teletravail: 'aucun',
};

/** Ce que PostgREST rend du `raise exception … using errcode = 'RM002'` de `plafonner_les_bilans`. */
const PLAFOND = {
  code: CODE_REFUS_DE_PLAFOND,
  message: 'Tu as commencé beaucoup de bilans aujourd’hui. Reviens demain.',
  details: null,
  hint: null,
};

const BOUTON = { name: 'Voir mon bilan' };

/** Le dernier pas du questionnaire, soumis une fois. */
async function soumettre() {
  jest.mocked(loadBilanDraft).mockResolvedValue({ answers: COMPLET, step: 'context', savedAt: new Date().toISOString() });
  render(<BilanQuestionnaire />);
  fireEvent.press(await screen.findByRole('button', BOUTON));
}

beforeEach(() => {
  mockCreation.mockReset();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(router.replace).mockClear();
  jest.mocked(clearBilanDraft).mockClear();
  jest.mocked(track).mockClear();
});

describe('le questionnaire face au plafond de bilans', () => {
  it('dit « Réessaie demain », sans la cause à recopier, et rend le questionnaire tel qu’il était', async () => {
    mockCreation.mockResolvedValue({ data: null, error: PLAFOND });
    await soumettre();

    // La phrase du plafond, et pas celle des pannes.
    expect(await screen.findByText(TROP_DE_BILANS)).toBeTruthy();
    expect(screen.queryByText(SOUMISSION_ECHOUEE)).toBeNull();
    // Pas de bloc à recopier : le JSON de l'erreur porterait le code et la phrase du serveur.
    expect(screen.queryByText(/RM002/)).toBeNull();
    expect(screen.queryByText(/Reviens demain/)).toBeNull();

    // Le calcul a cédé la place, et le bouton répond : il n'est pas resté en attente.
    expect(screen.queryByText(RAMILLE.calcul)).toBeNull();
    expect(screen.getByRole('button', BOUTON).props.accessibilityState?.disabled).not.toBe(true);

    // Rien n'a été effacé ni quitté : le brouillon est là, et la restitution ne s'ouvre pas.
    expect(clearBilanDraft).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  // La mesure ne change pas : un refus à la création reste un échec de la soumission, rangé en `autre`
  // (aucun genre neuf sans migration de `usage_events`).
  it('mesure le refus à la création, comme avant', async () => {
    mockCreation.mockResolvedValue({ data: null, error: PLAFOND });
    await soumettre();
    await screen.findByText(TROP_DE_BILANS);

    expect(track).toHaveBeenCalledWith('bilan_submit_error', { etape: 'creation', genre: 'autre' });
  });

  // Rien n'est verrouillé par le refus : demain, ou un autre jour, le même bouton soumet de nouveau.
  it('laisse le bouton soumettre de nouveau, et redit la même phrase', async () => {
    mockCreation.mockResolvedValue({ data: null, error: PLAFOND });
    await soumettre();
    await screen.findByText(TROP_DE_BILANS);
    expect(mockCreation).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', BOUTON));
    await waitFor(() => expect(mockCreation).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(TROP_DE_BILANS)).toBeTruthy();
    expect(screen.queryByText(RAMILLE.calcul)).toBeNull();
  });

  // Toute autre panne garde sa phrase d'avant, et sa cause à recopier.
  it('garde la phrase des pannes et sa cause pour une autre erreur', async () => {
    mockCreation.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'Internal Server Error', details: null, hint: null },
    });
    await soumettre();

    expect(await screen.findByText(SOUMISSION_ECHOUEE)).toBeTruthy();
    expect(screen.queryByText(TROP_DE_BILANS)).toBeNull();
    expect(screen.getByText(/XX000/)).toBeTruthy();
  });
});
