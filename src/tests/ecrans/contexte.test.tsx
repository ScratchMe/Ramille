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
 * **Et le 01/10/2026, D19 de `v1-33`** : une lecture en échec ne parle de connexion qu'hors ligne, et
 * « Réessayer » dit le genre de **sa** lecture. Deux mutations, chacune faisant tomber la sienne :
 *   - le genre de la première lecture ignoré (`'horsLigne'` en dur) → « ne parle pas de la connexion
 *     quand le serveur a répondu en échec » ;
 *   - le genre de la relecture ignoré, de même → « dit le genre de la relecture après « Réessayer » ».
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

describe('/contexte — une lecture en échec (D19)', () => {
  it('ne parle pas de la connexion quand le serveur a répondu en échec', async () => {
    mockLire.mockResolvedValue({ etat: 'erreur', genre: 'serveur' });
    render(<Contexte />);
    await waitFor(() =>
      expect(screen.getByText('Tes réponses n’ont pas pu être lues. Réessaie dans un instant.')).toBeTruthy()
    );
    expect(screen.queryByText(/connexion/)).toBeNull();
  });

  it('garde sa phrase hors ligne', async () => {
    mockLire.mockResolvedValue({ etat: 'erreur', genre: 'horsLigne' });
    render(<Contexte />);
    await waitFor(() =>
      expect(screen.getByText('Tes réponses n’ont pas pu être lues. Vérifie ta connexion et réessaie.')).toBeTruthy()
    );
  });

  // « Réessayer » relit : la seconde lecture dit son propre genre, pas celui de la première.
  it('dit le genre de la relecture après « Réessayer »', async () => {
    mockLire.mockResolvedValueOnce({ etat: 'erreur', genre: 'horsLigne' });
    mockLire.mockResolvedValueOnce({ etat: 'erreur', genre: 'serveur' });
    render(<Contexte />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() =>
      expect(screen.getByText('Tes réponses n’ont pas pu être lues. Réessaie dans un instant.')).toBeTruthy()
    );
  });
});

/**
 * **Le contexte pose des questions** (D4 de `v1-33`, 01/10/2026) : chaque série est nommée par sa
 * question — le texte affiché et le nom du groupe sont une seule chaîne —, et la zone porte sa ligne
 * d'aide. Les deux écrans partagent `ChampsDeContexte` ; celui-ci se monte sans `StepShell`.
 *
 * Éprouvé en le cassant, le 01/10/2026 : la ligne d'aide retirée de la zone fait tomber ce test, et
 * lui seul ; le groupe de la zone nommé par l'ancien intitulé (`question` → `'Type de zone'` dans
 * `GroupeDeChoix`) aussi.
 */
describe('/contexte — les questions du contexte', () => {
  it('nomme chaque groupe par sa question, et dit sous la zone ce que veut dire chaque réponse', async () => {
    mockLire.mockResolvedValue(CONTEXTE_COMPLET);
    render(<Contexte />);
    for (const question of [
      'Dans quel type de zone vis-tu ?',
      'Comment sont les transports en commun près de chez toi ?',
      'Combien de véhicules motorisés dans ton foyer ?',
    ]) {
      // Le groupe porte son nom par `aria-label` (`GroupeDeChoix`) : la requête par rôle de la
      // bibliothèque ne voit pas une `View` qui n'est pas elle-même un élément accessible.
      const groupe = await screen.findByLabelText(question);
      expect(groupe.props.role).toBe('radiogroup');
    }
    expect(
      screen.getByText(
        'Urbain dense : une grande ville et sa proche banlieue, là où passent métro ou tram. Périurbain : sa couronne, ou une ville moyenne ou petite. Rural : un bourg, un village, la campagne.'
      )
    ).toBeTruthy();
  });
});
