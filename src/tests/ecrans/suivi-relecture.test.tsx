/**
 * La ligne de relecture du suivi suit le genre de l'échec (02/10/2026, `v1-33` §9).
 *
 * Elle disait « … Vérifie ta connexion. » quel que soit l'échec. La phrase vit dans
 * `src/types/lecture-en-echec.ts`, testée mot pour mot ; ce fichier garde **son câblage** — l'écran
 * qui retient le genre de la relecture qui a échoué, le remet à rien quand une relecture réussit, et
 * demande la phrase de la ligne de relecture et non celle de l'écran d'erreur. C'est le critère de
 * `TESTING.md` §2.10 : une branche d'état et le câblage d'un message, que ni `src/types` ni le
 * parcours réel — qui ne fait jamais échouer une relecture — ne voient (relevé par la contre-lecture
 * de la PR #316).
 *
 * Éprouvé en le cassant, le 02/10/2026 (`TESTING.md` §1.1), une mutation à la fois sur
 * `src/app/(tabs)/suivi/index.tsx` :
 *   - la phrase de l'écran d'erreur au lieu de celle de la relecture (`'suivi'` au lieu de
 *     `'relectureDuSuivi'`) → les quatre, la ligne attendue n'étant jamais écrite ;
 *   - le genre ignoré (`'serveur'` en dur dans `echecDeLecture`) → « hors ligne… », seul ;
 *   - la remise à rien retirée (l'échec des lectures secondaires seul écrit, jamais `null`) →
 *     « une relecture réussie efface la ligne », seul.
 */
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import Suivi from '@/app/(tabs)/suivi/index';
import type { AssessmentSnapshot } from '@/types/suivi';

// ── Les lectures, réglables par test ─────────────────────────────────────────────────────────────

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

// Le retour sur l'onglet, que le test déclenche lui-même : c'est lui qui relance la lecture.
let mockRelire: () => void = () => {};
jest.mock('@/hooks/use-rafraichir-au-retour', () => ({
  useRafraichirAuRetour: (relire: () => void) => {
    mockRelire = relire;
  },
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useScrollToTop: () => {},
}));
jest.mock('@/hooks/use-track-focus', () => ({ useTrackFocus: () => {} }));
jest.mock('@/lib/analytics', () => ({ track: () => {} }));
// Ce qui dessine, et que ce fichier ne garde pas. La bande n'est plus à l'écran : sa pile la pose.
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

const LIGNE_SERVEUR = 'Ton suivi n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis.';
const LIGNE_HORS_LIGNE = `${LIGNE_SERVEUR} Vérifie ta connexion.`;

function toutReussit() {
  mockHistorique.mockResolvedValue({ ok: true, data: [BILAN] });
  mockPoints.mockResolvedValue({ ok: true, data: [] });
  mockDecisions.mockResolvedValue({ ok: true, data: [] });
  mockBoucles.mockResolvedValue({ ok: true, data: [] });
}

/** Un suivi déjà rempli : la première lecture a réussi. */
async function unSuiviRempli() {
  toutReussit();
  render(<Suivi />);
  await screen.findByText('Ton suivi');
}

/** Le retour sur l'onglet, et la relecture qu'il lance, jusqu'à son rendu. */
async function relire() {
  await act(async () => {
    mockRelire();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('la ligne de relecture du suivi', () => {
  it('une erreur du serveur ne parle pas de la connexion', async () => {
    await unSuiviRempli();
    mockHistorique.mockResolvedValue({ ok: false, genre: 'serveur' });

    await relire();

    expect(screen.getByText(LIGNE_SERVEUR)).toBeTruthy();
    expect(screen.queryByText(LIGNE_HORS_LIGNE)).toBeNull();
    // Ce qui est affiché reste : la ligne s'ajoute, elle ne remplace rien.
    expect(screen.getByText('Ton suivi')).toBeTruthy();
  });

  it('hors ligne, elle dit de vérifier la connexion', async () => {
    await unSuiviRempli();
    mockPoints.mockResolvedValue({ ok: false, genre: 'horsLigne' });

    await relire();

    expect(screen.getByText(LIGNE_HORS_LIGNE)).toBeTruthy();
  });

  it('une lecture secondaire en échec se dit comme une erreur du serveur', async () => {
    await unSuiviRempli();
    mockDecisions.mockResolvedValue({ ok: false });

    await relire();

    expect(screen.getByText(LIGNE_SERVEUR)).toBeTruthy();
  });

  it('une relecture réussie efface la ligne', async () => {
    await unSuiviRempli();
    mockHistorique.mockResolvedValue({ ok: false, genre: 'serveur' });
    await relire();
    expect(screen.getByText(LIGNE_SERVEUR)).toBeTruthy();

    toutReussit();
    await relire();

    expect(screen.queryByText(LIGNE_SERVEUR)).toBeNull();
  });
});
