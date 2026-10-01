/**
 * L'entrée d'un re-bilan (01/10/2026, `v1-33` §6 et D3) : la feuille « Ton plan va être recalculé » se
 * dit **avant la première étape**, et plus à la soumission ; le bandeau du préremplissage ne se rend
 * qu'à l'étape d'entrée de la visite.
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : ce sont deux branches d'écran que ni `src/types` ni
 * le parcours réel ne voient. Le parcours ouvre bien la feuille à l'entrée et la referme, mais aucun de
 * ses profils ne **soumet** un re-bilan pendant qu'une action est engagée — la feuille rouverte à la
 * soumission lui échapperait —, et il attend le bandeau à l'entrée sans regarder s'il revient à l'étape
 * suivante.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (`TESTING.md` §1.1), `src/app/bilan/index.tsx` restauré
 * depuis une copie après chaque mutation :
 *   - la feuille rouverte à la soumission (la branche de `handleNext` d'avant, l'engagement relu et la
 *     feuille montée au lieu de soumettre) → « la soumission ne la rouvre pas », seul ;
 *   - le bandeau sur toutes les étapes (`step === etapeDEntree` retiré) → « le bandeau ne se rend qu'à
 *     l'étape d'entrée », seul ;
 *   - « Pas maintenant » qui referme sans ressortir (`onQuitter` qui ne fait que démonter la feuille) →
 *     « « Pas maintenant » ressort du questionnaire », seul ;
 *   - la feuille ouverte sans engagement lu (la condition `lecture.data === null` retirée, la feuille
 *     montée sur `null`)… n'est pas jouable : `FeuilleNouveauBilan` exige un engagement au typecheck.
 *     « Sans engagement, rien ne s'ouvre » garde la moitié qui l'est : une lecture qui échoue.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import BilanQuestionnaire from '@/app/bilan';
import { RAMILLE } from '@/constants/mascotte';
import { loadBilanDraft } from '@/lib/bilan-draft';
import { loadLastSubmittedAnswers } from '@/lib/bilan-history';
import { lireLEngagementEnCours } from '@/lib/engagement-en-cours';
import { EMPTY_BILAN_ANSWERS, type BilanAnswers } from '@/types/bilan';

// ── Les doublures : le réseau, le stockage et la navigation. Les étapes, `StepShell` et la feuille sont vrais.

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false), dismissAll: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/lib/bilan-draft', () => ({
  loadBilanDraft: jest.fn(async () => null),
  saveBilanDraft: jest.fn(),
  clearBilanDraft: jest.fn(async () => {}),
}));
jest.mock('@/lib/bilan-history', () => ({ loadLastSubmittedAnswers: jest.fn(async () => null) }));
jest.mock('@/lib/engagement-en-cours', () => ({
  lireLEngagementEnCours: jest.fn(async () => ({ ok: true, data: null })),
}));
jest.mock('@/lib/marque-de-bilan', () => ({
  aDejaVuUnBilan: jest.fn(async () => true),
  marquerQuIlYAUnBilan: jest.fn(async () => {}),
}));
jest.mock('@/lib/premier-parcours', () => ({
  lireLePremierParcours: jest.fn(async () => null),
  noterLePremierParcours: jest.fn(async () => {}),
}));
// La soumission s'arrête à sa première lecture, qui ne rend jamais : « le calcul en cours » reste à l'écran,
// et c'est ce qu'on lit pour savoir qu'elle est partie.
jest.mock('@/lib/supabase', () => {
  const lecture: Record<string, unknown> = {};
  for (const methode of ['select', 'eq', 'order', 'limit']) lecture[methode] = () => lecture;
  lecture.maybeSingle = () => new Promise(() => {});
  return {
    ensureSession: jest.fn(async () => ({ user: { id: 'u1' } })),
    supabase: { from: () => lecture },
  };
});

/** Un bilan précédent complet : neuf étapes déjà répondues, comme les relit un re-bilan. */
const PRECEDENT: BilanAnswers = {
  ...EMPTY_BILAN_ANSWERS,
  commute_has_regular_trip: false,
  commute_second_mode_used: false,
  leisure_frequency: 'rarely',
  flights_total_per_year: 0,
  train_long_trips_per_year: 0,
  coach_long_trips_per_year: 0,
  car_long_trips_per_year: 0,
  zone_type: 'rural',
  tc_access: 'bon',
  household_vehicles: '1',
};

const ENGAGEMENT = { action: 'Faire un de tes longs trajets en train plutôt qu’en voiture.', intention: null };

const FEUILLE = 'Ton plan va être recalculé';
const BANDEAU = 'Tes réponses précédentes sont préremplies. Modifie ce qui a changé.';
const TITRE_DU_TRAJET = 'As-tu un trajet régulier pour le travail ou les études ?';
const TITRE_DES_SORTIES = 'À quelle fréquence fais-tu des trajets loisirs le week-end ?';

beforeEach(() => {
  jest.mocked(router.back).mockClear();
  jest.mocked(router.replace).mockClear();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(loadBilanDraft).mockResolvedValue(null);
  jest.mocked(loadLastSubmittedAnswers).mockResolvedValue(PRECEDENT);
  jest.mocked(lireLEngagementEnCours).mockResolvedValue({ ok: true, data: ENGAGEMENT });
});

describe('la feuille du re-bilan, avant de commencer', () => {
  test('s’ouvre à l’entrée, sur la première étape, quand une action est engagée dans la période', async () => {
    render(<BilanQuestionnaire />);

    expect(await screen.findByText(FEUILLE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeTruthy();
    // Le titre et les deux phrases ne changent pas : l'action est nommée, au conditionnel.
    expect(screen.getByText(/Faire un de tes longs trajets en train plutôt qu’en voiture/)).toBeTruthy();
    // Dessous, l'étape d'entrée — personne n'a encore répondu à rien.
    expect(screen.getByText(TITRE_DU_TRAJET)).toBeTruthy();
  });

  test('« Commencer » la referme sur l’étape d’entrée, sans naviguer', async () => {
    render(<BilanQuestionnaire />);
    await screen.findByText(FEUILLE);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Commencer' }));
    });

    expect(screen.queryByText(FEUILLE)).toBeNull();
    expect(screen.getByText(TITRE_DU_TRAJET)).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('« Pas maintenant » ressort du questionnaire — la racine, quand la pile est vide', async () => {
    render(<BilanQuestionnaire />);
    await screen.findByText(FEUILLE);

    await act(async () => {
      fireEvent.press(screen.getByText('Pas maintenant'));
    });

    expect(router.replace).toHaveBeenCalledWith('/');
  });

  test('la soumission ne la rouvre pas : le calcul part', async () => {
    render(<BilanQuestionnaire />);
    await screen.findByText(FEUILLE);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Commencer' }));
    });

    // Le bilan précédent remplit chaque étape : on va au bout sans rien changer.
    const fin = async () => screen.queryByRole('button', { name: 'Voir mon bilan' });
    for (let i = 0; i < 12 && !(await fin()); i++) {
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
      });
    }
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Voir mon bilan' }));
    });

    expect(screen.queryByText(FEUILLE)).toBeNull();
    expect(screen.getByText(RAMILLE.calcul)).toBeTruthy();
  });

  test('sans engagement lu, rien ne s’ouvre — ni sans action engagée, ni sur une lecture qui échoue', async () => {
    jest.mocked(lireLEngagementEnCours).mockResolvedValue({ ok: true, data: null });
    const premier = render(<BilanQuestionnaire />);
    await screen.findByText(BANDEAU);
    expect(screen.queryByText(FEUILLE)).toBeNull();
    premier.unmount();

    // Un échec laisse passer : la feuille nomme l'action, sans elle elle n'aurait rien à dire.
    jest.mocked(lireLEngagementEnCours).mockRejectedValue(new Error('Network request failed'));
    render(<BilanQuestionnaire />);
    await screen.findByText(BANDEAU);
    expect(screen.queryByText(FEUILLE)).toBeNull();
  });
});

describe('le bandeau du re-bilan', () => {
  test('ne se rend qu’à l’étape d’entrée de la visite', async () => {
    jest.mocked(lireLEngagementEnCours).mockResolvedValue({ ok: true, data: null });
    render(<BilanQuestionnaire />);

    expect(await screen.findByText(BANDEAU)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    });
    expect(await screen.findByText(TITRE_DES_SORTIES)).toBeTruthy();
    expect(screen.queryByText(BANDEAU)).toBeNull();

    // Revenu à l'étape d'entrée, il s'y dit de nouveau : c'est elle qu'il désigne.
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    });
    expect(await screen.findByText(BANDEAU)).toBeTruthy();
  });
});
