/**
 * Le retour matériel d'Android dans le questionnaire (`v1-33`, Q-4).
 *
 * `useRetourVersLaPhasePrecedente` a son test (`src/hooks/`) : il garde le crochet, **jamais ses
 * appels**. Ce que l'écran lui donne — la même action que « Retour » quand une étape visible est
 * derrière, rien sur la première étape et sur l'écran de reprise, un appui avalé pendant le calcul —
 * est une décision d'écran, et elle ne se voit ni par `src/types` ni par le parcours réel, qui joue le
 * web, où le retour est celui du navigateur. C'est le critère de `TESTING.md` §2.10, et la mutation qui
 * le remplit se nomme : brancher `null` partout, c'est le questionnaire qui quitte l'app depuis
 * l'étape 6.
 *
 * Le retour s'appuie comme le fait Android : le dernier écouteur abonné parle le premier, et un
 * écouteur qui rend `true` a pris l'appui.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (`TESTING.md` §1.1), le fichier restauré depuis une copie
 * après chaque mutation :
 *   - le crochet branché sur `null` partout (le questionnaire d'avant) → trois tombent : « recule d'une
 *     étape », « saute les étapes » et « pendant le calcul » ; les deux « le retour passe » restent verts,
 *     `null` étant exactement ce qu'ils attendent ;
 *   - le calcul ne prenant plus l'appui (la branche `submitting` retirée) → « pendant le calcul », et lui
 *     seul, **par sa dernière assertion** : le retour y reculait d'une étape sous le calcul, qui le cache, et
 *     l'appui était pris quand même. La première rédaction du test s'arrêtait à « l'appui est pris » et à
 *     « rien n'a navigué » : elle restait verte sous cette mutation. Il faut un échec du calcul pour lire
 *     l'étape sur laquelle le questionnaire revient ;
 *   - l'écran de reprise ignoré (`!montrerLaReprise` retiré) → « sur l'écran de reprise », seul ;
 *   - `handleBack` même sans étape derrière (`previousStep(…) !== null` retiré) → « sur la première étape »,
 *     seul : `handleBack` y rend la main à la pile, mais l'appui est pris ;
 *   - le recul sur l'étape d'avant dans l'ordre complet, sans passer par `previousStep` → « saute les étapes
 *     que les réponses excluent », seul.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { BackHandler, Platform } from 'react-native';

import BilanQuestionnaire from '@/app/bilan';
import { RAMILLE } from '@/constants/mascotte';
import { loadBilanDraft } from '@/lib/bilan-draft';
import * as clientDouble from '@/lib/supabase';
import { EMPTY_BILAN_ANSWERS, type BilanAnswers, type BilanStepId } from '@/types/bilan';

// ── Les doublures : le réseau, le stockage et la navigation. Les étapes, `StepShell` et le crochet sont vrais.

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false), dismissAll: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
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
// La soumission s'arrête à sa première lecture, qui ne rend que quand le test le décide : « le calcul en
// cours » dure autant qu'il le veut, et `echouerLaSoumission` le termine par un échec — la seule sortie
// d'un calcul qui laisse voir l'étape sur laquelle le questionnaire revient.
jest.mock('@/lib/supabase', () => {
  let echouer: (erreur: Error) => void = () => {};
  const lecture: Record<string, unknown> = {};
  for (const methode of ['select', 'eq', 'order', 'limit']) lecture[methode] = () => lecture;
  lecture.maybeSingle = () =>
    new Promise((_resoudre, rejeter) => {
      echouer = rejeter;
    });
  return {
    ensureSession: jest.fn(async () => ({ user: { id: 'u1' } })),
    supabase: { from: () => lecture },
    echouerLaSoumission: () => echouer(new Error('Network request failed')),
  };
});

// ── Android : un retour qu'on peut appuyer.

type Ecouteur = () => boolean | null | undefined;
let ecouteurs: Ecouteur[] = [];

/** Ce que fait Android à l'appui : le dernier écouteur abonné parle le premier. */
function appuyerSurRetour(): boolean {
  for (const ecouteur of [...ecouteurs].reverse()) {
    if (ecouteur()) return true;
  }
  return false;
}

const osDOrigine = Platform.OS;
beforeEach(() => {
  ecouteurs = [];
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_evenement, ecouteur) => {
    ecouteurs.push(ecouteur as Ecouteur);
    return { remove: () => (ecouteurs = ecouteurs.filter((e) => e !== ecouteur)) };
  });
  jest.mocked(router.back).mockClear();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});
afterEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => osDOrigine });
  jest.restoreAllMocks();
});

// ── Le questionnaire, à l'étape où l'on veut le prendre.

/** Des réponses qui rendent toutes les étapes visibles complètes (`issueDuSuivant` : « soumettre »). */
const COMPLET: BilanAnswers = {
  ...EMPTY_BILAN_ANSWERS,
  commute_has_regular_trip: true,
  commute_days_per_week: 5,
  commute_distance_km: 20,
  commute_mode: 'bus',
  commute_second_mode_used: false,
  leisure_frequency: 'rarely',
  zone_type: 'rural',
  tc_access: 'bon',
  household_vehicles: '1',
  teletravail: 'aucun',
};

function brouillonA(step: BilanStepId, answers: BilanAnswers = COMPLET) {
  jest.mocked(loadBilanDraft).mockResolvedValue({ answers, step, savedAt: new Date().toISOString() });
}

/** Le calcul échoue : le questionnaire revient, à l'étape où il se trouve. */
const echouerLaSoumission = () => (clientDouble as unknown as { echouerLaSoumission: () => void }).echouerLaSoumission();

const TITRE_DU_CONTEXTE = 'Quel est ton contexte de mobilité ?';
const TITRE_DES_JOURS = 'Ce trajet, tu le fais combien de jours par semaine ?';
const TITRE_DU_MODE = 'Quel est ton mode de transport principal pour ce trajet ?';
const TITRE_DU_TRAJET = 'As-tu un trajet régulier pour le travail ou les études ?';

describe('le retour matériel du questionnaire', () => {
  test('recule d’une étape, comme « Retour », quand il y en a une derrière', async () => {
    brouillonA('commute_mode');
    render(<BilanQuestionnaire />);
    await screen.findByText(TITRE_DU_MODE);

    let pris = false;
    act(() => {
      pris = appuyerSurRetour();
    });

    expect(pris).toBe(true);
    expect(await screen.findByText(TITRE_DES_JOURS)).toBeTruthy();
    expect(screen.queryByText(TITRE_DU_MODE)).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('saute les étapes que les réponses excluent, comme « Retour »', async () => {
    // Loisirs « rarement » : le détail des sorties n'est pas visible, le retour depuis les vols va aux fréquences.
    brouillonA('flights');
    render(<BilanQuestionnaire />);
    await screen.findByText('Combien de vols prends-tu dans une année type ?');

    act(() => {
      appuyerSurRetour();
    });

    expect(await screen.findByText('À quelle fréquence fais-tu des trajets loisirs le week-end ?')).toBeTruthy();
  });

  test('sur la première étape, le retour passe à la navigation', async () => {
    jest.mocked(loadBilanDraft).mockResolvedValue(null);
    render(<BilanQuestionnaire />);
    await screen.findByText(TITRE_DU_TRAJET);

    let pris = true;
    act(() => {
      pris = appuyerSurRetour();
    });

    expect(pris).toBe(false);
    expect(screen.getByText(TITRE_DU_TRAJET)).toBeTruthy();
  });

  test('sur l’écran de reprise, le retour passe à la navigation', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ reprise: '1' });
    brouillonA('commute_mode');
    render(<BilanQuestionnaire />);
    await screen.findByText('On reprend là où tu en étais.');

    let pris = true;
    act(() => {
      pris = appuyerSurRetour();
    });

    expect(pris).toBe(false);
    expect(screen.getByText('On reprend là où tu en étais.')).toBeTruthy();
  });

  test('pendant le calcul, l’appui est pris et rien ne bouge', async () => {
    brouillonA('context');
    render(<BilanQuestionnaire />);
    fireEvent.press(await screen.findByRole('button', { name: 'Voir mon bilan' }));
    await screen.findByText(RAMILLE.calcul);

    let pris = false;
    act(() => {
      pris = appuyerSurRetour();
    });

    expect(pris).toBe(true);
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByText(RAMILLE.calcul)).toBeTruthy();

    // Ce qu'un retour qui passerait **reculerait**, le calcul le cache : on le lit à la sortie d'un échec,
    // qui rend le questionnaire à l'étape où il est. C'est toujours la dernière, celle qu'on a soumise.
    await act(async () => {
      echouerLaSoumission();
    });
    expect(await screen.findByText(TITRE_DU_CONTEXTE)).toBeTruthy();
    expect(screen.queryByText(RAMILLE.calcul)).toBeNull();
  });
});
