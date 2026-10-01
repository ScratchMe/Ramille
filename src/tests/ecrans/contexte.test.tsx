/**
 * `/contexte` : un chargement qui se dit et qu'on peut quitter, et un « Enregistrer » qui mène à ce
 * qui manque au lieu de rester désactivé sans dire pourquoi (audit P-13, 01/10/2026).
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : ce sont des branches d'état de l'écran — quoi
 * rendre pendant la lecture, ce que fait le bouton selon que le contexte est incomplet ou inchangé —,
 * aucune dérivation de `src/types` ne les porte (`contexteEstComplet` et `manqueDeLEtape` ont leurs
 * tests, pas leurs appels), et le parcours réel n'ouvre `/contexte` que sur un contexte complet.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (TESTING.md §1.1), chacune faisant tomber la sienne et
 * aucune autre :
 *   - « Enregistrer » remis `disabled` sur un contexte incomplet (l'état d'avant) → « mène à ce qui
 *     manque » ;
 *   - le cas inchangé rendu actif (`disabled={enregistrement}`) → « reste inactif quand rien n'a
 *     changé » ;
 *   - la phrase de chargement montrée tout de suite (`useChargementVisible(…, true)`) → « se tait avant
 *     le délai » ;
 *   - le « Retour » rendu seulement avec la phrase → « garde « Retour » pendant le chargement » ;
 *   - les ancres non fournies (`ChampsDeContexte` hors de `ContexteDesAncres`, l'état d'avant) → « mène
 *     à ce qui manque », par le focus qui ne part plus.
 *
 * Ce qu'il ne voit pas : le défilement jusqu'à la question, que seule une vraie mise en page mesure.
 * Il ne part d'ailleurs que si la question est hors de la zone : à 390 × 844, « Enregistrer » finit à
 * 720 px sous les quatre questions (relevé de l'audit du 01/10/2026, capture p1-53).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import Contexte from '@/app/contexte';

const mockLire = jest.fn();
const mockEnregistrer = jest.fn();

jest.mock('@/lib/contexte', () => ({
  lireLeContexteCourant: () => mockLire(),
  enregistrerLeContexte: (...args: unknown[]) => mockEnregistrer(...args),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('@/lib/navigation', () => ({ revenirOu: jest.fn() }));

/** Un bilan d'avant la question du télétravail : trois jours de trajet, le télétravail sans réponse. */
const CONTEXTE_INCOMPLET = {
  etat: 'ok',
  contexte: {
    choix: { zone_type: 'urbain_dense', tc_access: 'bon', household_vehicles: '1', teletravail: null },
    trajet: { commute_has_regular_trip: true, commute_days_per_week: 3 },
    leisure_frequency: 'hebdomadaire',
  },
};
const CONTEXTE_COMPLET = {
  ...CONTEXTE_INCOMPLET,
  contexte: { ...CONTEXTE_INCOMPLET.contexte, choix: { ...CONTEXTE_INCOMPLET.contexte.choix, teletravail: 'aucun' } },
};

const enregistrer = () => screen.getByRole('button', { name: 'Enregistrer' });
const inactif = () => enregistrer().props.accessibilityState?.disabled === true;

let focus: jest.SpyInstance;
beforeEach(() => {
  mockLire.mockReset();
  mockEnregistrer.mockReset();
  focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
});
afterEach(() => focus.mockRestore());

describe('/contexte — la lecture', () => {
  it('se tait avant le délai', () => {
    mockLire.mockReturnValue(new Promise(() => {}));
    render(<Contexte />);
    expect(screen.queryByText('Chargement de ton contexte…')).toBeNull();
  });

  it('garde « Retour » pendant le chargement', () => {
    mockLire.mockReturnValue(new Promise(() => {}));
    render(<Contexte />);
    expect(screen.getByRole('link', { name: 'Retour' })).toBeTruthy();
  });
});

describe('/contexte — « Enregistrer »', () => {
  it('mène à ce qui manque sur un contexte incomplet, sans rien enregistrer', async () => {
    mockLire.mockResolvedValue(CONTEXTE_INCOMPLET);
    render(<Contexte />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeTruthy());

    // En attente, pas inactif : il agit.
    expect(inactif()).toBe(false);
    fireEvent.press(enregistrer());

    expect(screen.getByText('Il manque encore ta réponse sur le télétravail.')).toBeTruthy();
    expect(mockEnregistrer).not.toHaveBeenCalled();
    // Le focus part au geste, vers la question qui manque — sa première réponse, aucune n'étant cochée.
    expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');

    // Répondu, la demande retombe : la ligne s'en va.
    fireEvent.press(screen.getByRole('radio', { name: 'Aucun' }));
    expect(screen.queryByText(/^Il manque encore/)).toBeNull();
  });

  it('reste inactif quand rien n’a changé', async () => {
    mockLire.mockResolvedValue(CONTEXTE_COMPLET);
    render(<Contexte />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeTruthy());
    expect(inactif()).toBe(true);
  });
});
