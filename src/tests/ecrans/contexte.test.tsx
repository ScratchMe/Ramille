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
    choix: { zone_type: 'urbain_dense', transports_proches: ['metro_tram', 'bus'], household_vehicles: '1', teletravail: null },
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
    // Ce qui passe près de chez soi se coche (`v1-34`) : un groupe, pas un `radiogroup`, qui
    // annoncerait qu'en cocher une décoche les autres.
    for (const [question, role] of [
      ['Dans quel type de zone vis-tu ?', 'radiogroup'],
      ['Près de chez toi, qu’est-ce que tu pourrais prendre ?', 'group'],
      ['Combien de véhicules motorisés dans ton foyer ?', 'radiogroup'],
    ]) {
      // Le groupe porte son nom par `aria-label` (`GroupeDeChoix`) : la requête par rôle de la
      // bibliothèque ne voit pas une `View` qui n'est pas elle-même un élément accessible.
      const groupe = await screen.findByLabelText(question);
      expect(groupe.props.role).toBe(role);
    }
    // L'aide de la zone redevient une définition (D6 de `v1-34`) : la zone ne décide plus du métro.
    expect(
      screen.getByText(
        'Urbain dense : une grande ville et sa proche banlieue. Périurbain : sa couronne, ou une ville moyenne ou petite. Rural : un bourg, un village, la campagne.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Coche tout ce qui passe assez souvent pour t’en servir.')).toBeTruthy();
  });

  /**
   * **Le test garde l'appel, pas seulement la fonction** : `basculerTransport` a ses tests, ce qui se
   * garde ici est que l'écran la branche sur chaque puce. Éprouvé en le cassant le 03/10/2026 : l'appui
   * branché sur un simple ajout (`[...valeurs, valeur]`) fait tomber ce test, et lui seul ici.
   */
  it('« Rien de tout ça » décoche le reste, et une autre puce la décoche', async () => {
    mockLire.mockResolvedValue(CONTEXTE_COMPLET);
    render(<Contexte />);
    // `aria-checked` arrive sur l'élément hôte en `accessibilityState` : c'est ce qu'un lecteur d'écran lit.
    const coche = (nom: string) => screen.getByRole('checkbox', { name: nom }).props.accessibilityState?.checked === true;
    await waitFor(() => expect(coche('Métro ou tram')).toBe(true));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Rien de tout ça' }));
    expect([coche('Métro ou tram'), coche('Bus'), coche('Rien de tout ça')]).toEqual([false, false, true]);
    fireEvent.press(screen.getByRole('checkbox', { name: 'Train (TER, Intercités)' }));
    expect([coche('Train (TER, Intercités)'), coche('Rien de tout ça')]).toEqual([true, false]);
  });
});
