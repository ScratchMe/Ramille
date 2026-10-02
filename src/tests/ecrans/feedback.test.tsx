/**
 * « Envoyer » de `/feedback`, en attente sous trois caractères (`v1-33` D18, audit T-19).
 *
 * Le bouton était désactivé à vide sans un mot : la phrase « Trois caractères au moins pour pouvoir
 * l'envoyer. » ne venait qu'avec la première frappe, donc un champ vide face à un bouton gris ne disait
 * rien. Il prend le motif du « Suivant » du questionnaire (`FRONT.md` §2.4, `v1-31`) : il a l'apparence
 * du désactivé et **agit** — son toucher écrit la phrase, y compris à vide, et donne le focus au champ.
 * Rien ne part sous trois caractères.
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : c'est une branche d'état de l'écran (ce que le
 * toucher fait selon la longueur) et le câblage d'un message, que ni `src/types` ni le parcours réel
 * — qui n'ouvre jamais `/feedback` — ne voient. Le focus donné au champ est lu par la demande
 * d'accessibilité qui part sur natif, comme pour « Annuler » du plan (`plan-pistes.test.tsx`).
 *
 * Chaque branche garde sa moitié négative (`TESTING.md` §2.10) : un champ vide **avant** tout toucher
 * ne dit rien, et la phrase retombe quand le message est assez long.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (`TESTING.md` §1.1), une mutation à la fois sur
 * `src/app/feedback.tsx`, l'état d'avant réécrit ensuite — le témoin sans mutation est vert (7/7) :
 *   - l'état d'avant, `disabled={manque || sending}` → 5 tests : le toucher à vide, sur des espaces, à
 *     deux caractères, « il agit », et la demande qui tient ;
 *   - la porte de `onSend` retirée (`if (false)`) → 4 : à vide, espaces, deux caractères, la demande ;
 *     c'est la mutation qui **envoie** un message trop court, et l'insert que le client reçoit le dit ;
 *   - `donnerLeFocus(champ.current)` retiré → 2 : à vide et à deux caractères, eux seuls ;
 *   - la référence du champ retirée → les mêmes 2 : sans elle `champ.current` est `null` et le focus ne
 *     désigne rien, sans erreur ;
 *   - la phrase non écrite au toucher (`tropCourt` seul, comme avant) → 3 : à vide, espaces, la demande ;
 *   - la demande qui ne retombe jamais → 1, la demande : la phrase revenait en vidant le champ ;
 *   - le seuil à deux caractères → 1, « deux caractères » : un message de deux lettres partait ;
 *   - le `trim()` retiré → 1, les espaces : un champ de blancs partait.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import Feedback from '@/app/feedback';

// Le préfixe `mock` n'est pas cosmétique (`TESTING.md` §2.10) : jest hisse les `jest.mock()`.
const mockInsert = jest.fn(async (_ligne: unknown) => ({ error: null }));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));

// **Le transport est doublé, `sendFeedback` reste le vrai** : ce qu'on garde est qu'un message trop court
// ne **parte** pas, et la preuve est l'insert que le client n'a pas reçu — pas un appel qu'on aurait
// remplacé.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ insert: (ligne: unknown) => mockInsert(ligne) }),
  },
}));

const PHRASE = 'Trois caractères au moins pour pouvoir l’envoyer.';
const LIBELLE_DU_CHAMP = 'Ton message';

const envoyer = () => screen.getByRole('button', { name: 'Envoyer' });
const taper = (texte: string) => fireEvent.changeText(screen.getByLabelText(LIBELLE_DU_CHAMP), texte);

let focus: jest.SpyInstance;

beforeEach(() => {
  mockInsert.mockClear();
  // Le focus natif part par ici (`donnerLeFocus`) : on lit la demande, sans rien envoyer à personne.
  focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
});

afterEach(() => {
  focus.mockRestore();
});

describe('« Envoyer » sous trois caractères', () => {
  test('un champ vide, avant tout toucher, ne dit rien', () => {
    render(<Feedback />);
    expect(screen.queryByText(PHRASE)).toBeNull();
    expect(focus).not.toHaveBeenCalled();
  });

  test('à vide, son toucher dit ce qui manque, donne le focus au champ, et rien ne part', () => {
    render(<Feedback />);
    fireEvent.press(envoyer());
    expect(screen.getByText(PHRASE)).toBeTruthy();
    // La demande vise quelque chose : `expect.anything()` refuse `null`, donc un champ sans référence.
    expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test('de simples espaces valent un champ vide : le toucher demande, rien ne part', () => {
    render(<Feedback />);
    taper('    ');
    fireEvent.press(envoyer());
    expect(screen.getByText(PHRASE)).toBeTruthy();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test('deux caractères : la phrase est déjà là, et le toucher n’envoie rien non plus', () => {
    render(<Feedback />);
    taper('ok');
    expect(screen.getByText(PHRASE)).toBeTruthy();
    fireEvent.press(envoyer());
    expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test('il agit : ni `disabled` ni `aria-disabled`, un bouton qui agit n’est pas indisponible', () => {
    render(<Feedback />);
    const bouton = envoyer();
    expect(bouton.props.accessibilityState?.disabled).toBeFalsy();
    expect(bouton.props['aria-disabled']).toBeFalsy();
  });
});

describe('la demande, et quand elle retombe', () => {
  test('elle tient pendant la frappe, retombe au troisième caractère, et ne revient pas en vidant', () => {
    render(<Feedback />);
    fireEvent.press(envoyer());
    expect(screen.getByText(PHRASE)).toBeTruthy();
    taper('a');
    expect(screen.getByText(PHRASE)).toBeTruthy();
    taper('abc');
    expect(screen.queryByText(PHRASE)).toBeNull();
    // Vidé, le champ n'a rien de « trop court » : une demande retombée ne se redit qu'au toucher.
    taper('');
    expect(screen.queryByText(PHRASE)).toBeNull();
  });
});

describe('un message assez long', () => {
  test('part, une seule fois, avec la catégorie et le texte', async () => {
    render(<Feedback />);
    taper('Le RER manque');
    expect(screen.queryByText(PHRASE)).toBeNull();
    await act(async () => {
      fireEvent.press(envoyer());
    });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'idee', message: 'Le RER manque', user_id: 'u1' })
    );
    // Le succès remplace le formulaire : c'est l'état de sortie, et il porte son titre.
    expect(screen.getByText('C’est envoyé, merci.')).toBeTruthy();
  });
});
