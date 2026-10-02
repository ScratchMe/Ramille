/**
 * Les longs trajets d'un questionnaire relu (`v1-33` D1, contre-lecture de la PR #314).
 *
 * La réponse à « Hors avion, fais-tu des trajets de plus de 300 km… » se dérive des compteurs
 * (`reponseAuxLongsTrajets`, testée dans `src/types`), et du seul « Oui » qu'ils ne savent pas dire —
 * un drapeau que l'écran tient. Relu d'un brouillon ou d'un re-bilan prérempli, un « Oui » vient des
 * compteurs, sans drapeau : remettre le train à « 0 » faisait trois zéros, donc « Non », et les
 * séries disparaissaient sous le doigt. La dérivation est juste ; c'est **ce que l'écran lui passe**
 * qui ne l'était pas — d'où ce test d'écran (`TESTING.md` §2.10).
 *
 * Éprouvé en le cassant, le 01/10/2026 (TESTING.md §1.1) : l'étape branchée sur `update` au lieu de
 * `mettreAJourLesSeries` (l'écran d'avant) → le test tombe sur « Oui », qui n'est plus coché.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import BilanQuestionnaire from '@/app/bilan';
import { loadBilanDraft } from '@/lib/bilan-draft';
import { EMPTY_BILAN_ANSWERS, type BilanAnswers } from '@/types/bilan';

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
jest.mock('@/lib/bilan-history', () => ({ loadLastSubmittedAnswers: jest.fn(async () => null) }));
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
jest.mock('@/lib/supabase', () => ({
  ensureSession: jest.fn(async () => ({ user: { id: 'u1' } })),
  supabase: { from: jest.fn() },
}));

/** Un brouillon arrêté aux longs trajets, deux trajets en train déclarés : un « Oui » que disent les compteurs. */
const RELU: BilanAnswers = {
  ...EMPTY_BILAN_ANSWERS,
  commute_has_regular_trip: false,
  leisure_frequency: 'rarely',
  flights_total_per_year: 0,
  train_long_trips_per_year: 2,
  coach_long_trips_per_year: 0,
  car_long_trips_per_year: 0,
};

const coche = (nom: string) => screen.getByRole('radio', { name: nom }).props.accessibilityState?.checked === true;

test('un « Oui » relu des compteurs reste « Oui » quand le train revient à « 0 »', async () => {
  jest.mocked(loadBilanDraft).mockResolvedValue({ answers: RELU, step: 'long_trips', savedAt: new Date().toISOString() });
  render(<BilanQuestionnaire />);
  await screen.findByText('Hors avion, fais-tu des trajets de plus de 300 km sur une année type ?');
  expect(coche('Oui')).toBe(true);

  // La première série est celle du train : son « 0 » remet les trois compteurs à zéro.
  fireEvent.press(screen.getAllByRole('radio', { name: '0' })[0]);

  expect(coche('Oui')).toBe(true);
  expect(coche('Non')).toBe(false);
  expect(screen.getByText('En train')).toBeTruthy();
});
