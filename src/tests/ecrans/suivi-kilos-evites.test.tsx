/**
 * Le suivi garde, saison par saison, ce que les « oui » ont évité, au moins (étape 6a de `v1-35`,
 * 24/10/2026).
 *
 * `phraseDuGroupe` est gardée par son test (`src/types/kilos-evites.test.ts`) ; ce fichier garde **son
 * appel** — que l'écran la passe sur **tous** les points d'un groupe, repliés compris (le groupe n'en
 * montre que cinq), et sur chaque groupe séparément. C'est le critère de `TESTING.md` §2.10 : le test
 * garde la fonction, jamais ses appels.
 *
 * Éprouvé en le cassant, le 24/10/2026 — voir le relevé au pied.
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import Suivi from '@/app/(tabs)/suivi/index';
import type { AssessmentSnapshot, CheckinRecord } from '@/types/suivi';

const mockHistorique = jest.fn();
const mockPoints = jest.fn();
const mockDecisions = jest.fn();
const mockBoucles = jest.fn();
jest.mock('@/lib/bilan-history', () => ({
  loadAssessmentHistory: () => mockHistorique(),
  loadAnsweredCheckins: () => mockPoints(),
  loadDecisionsEngagees: () => mockDecisions(),
  loadBouclesAVenir: () => mockBoucles(),
}));
jest.mock('@/hooks/use-rafraichir-au-retour', () => ({ useRafraichirAuRetour: () => {} }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useScrollToTop: () => {},
}));
jest.mock('@/hooks/use-track-focus', () => ({ useTrackFocus: () => {} }));
jest.mock('@/lib/analytics', () => ({ track: () => {} }));
jest.mock('@/components/mascot', () => ({ Mascot: () => null }));
jest.mock('@/components/illustrations/empty-state-illustration', () => ({ EmptyStateIllustration: () => null }));

const BILAN: AssessmentSnapshot = {
  assessmentId: 'b1',
  submittedAt: '2026-09-20T10:00:00Z',
  totalKg: 2400,
  dominantPoste: 'commute',
  dominantLabel: 'Trajet domicile-travail (Voiture)',
  parPoste: { commute: 2400, leisure: 0, travel: 0 },
  loisirsOccasionnels: false,
};

const point = (periodStart: string, reponse: CheckinRecord['reponse'], gainDUneFois: number | null): CheckinRecord => ({
  id: periodStart,
  loopType: 'commute',
  periodLabel: `Semaine du ${periodStart.slice(8, 10)}/${periodStart.slice(5, 7)}`,
  periodStart,
  reponse,
  respondedAt: `${periodStart}T10:00:00Z`,
  gainDUneFois,
});

it('dit, pour chaque saison, ce que tous ses « oui » ont évité — repliés compris', async () => {
  mockHistorique.mockResolvedValue({ ok: true, data: [BILAN] });
  mockDecisions.mockResolvedValue({ ok: true, data: [] });
  mockBoucles.mockResolvedValue({ ok: true, data: [] });
  mockPoints.mockResolvedValue({
    ok: true,
    data: [
      // L'automne : six points, dont le sixième, replié, porte le plus gros gain.
      point('2026-10-19', 'oui', 2.29),
      point('2026-10-12', 'non', 2.29),
      point('2026-10-05', 'oui', 2.29),
      point('2026-09-28', 'sans_objet', 2.29),
      point('2026-09-21', 'oui', 2.29),
      point('2026-09-14', 'oui', 20.5),
      // L'été : un seul « oui », et le sien.
      point('2026-08-24', 'oui', 5.69),
    ],
  });

  render(<Suivi />);

  // 2,29 × 3 + 20,5 = 27,37 : sans le point replié, ce serait 6,8.
  expect(await screen.findByText('Au moins 27 kg CO₂e évités, d’après tes réponses.')).toBeTruthy();
  expect(screen.getByText('Au moins 5,6 kg CO₂e évités, d’après tes réponses.')).toBeTruthy();
});

// Relevé des mutations, le 24/10/2026, une à la fois sur `src/app/(tabs)/suivi/index.tsx` :
//   - la phrase passée sur les seuls points visibles (`visibles` au lieu de `groupe.points`) → ce
//     test, la première attente ;
//   - la phrase passée sur tous les points de tous les groupes → ce test, les deux attentes.
