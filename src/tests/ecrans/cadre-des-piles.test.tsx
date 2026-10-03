/**
 * La bande haute est posée par chaque pile d'onglet, autour de tous ses écrans (`v1-33` T-13,
 * 03/10/2026).
 *
 * **Pourquoi ce test.** La bande était rendue par chaque écran, état par état — seize fois —, et c'est
 * ainsi que le chargement et l'erreur de la restitution l'avaient perdue (R-9) ; `restitution-du-bilan.test.tsx`
 * la cherchait dans l'écran. Elle vit désormais dans le layout de chaque pile (`CadreDOnglet`), et un
 * écran ne la rend plus : ce fichier garde l'endroit où elle a déménagé. Le parcours réel touche l'icône
 * du compte sur le plan, mais rien ne l'y cherche sur une restitution en chargement.
 *
 * Éprouvé en cassant ce qu'il garde, le 03/10/2026 — deux mutations, chacune faisant tomber le sien et
 * aucun autre :
 *   - le cadre retiré du layout du plan (la `Stack` seule) → le premier test ;
 *   - le cadre retiré du layout du suivi → le second.
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import PlanLayout from '@/app/(tabs)/plan/_layout';
import SuiviLayout from '@/app/(tabs)/suivi/_layout';
import { APP_NAME } from '@/constants/produit';

// La pile elle-même ne se rend pas ici : un témoin suffit à dire que la bande est posée autour d'elle.
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn() },
    Stack: () => <Text>pile</Text>,
  };
});

// L'icône du compte dessine en SVG ; seule compte ici sa présence, nommée.
jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: View, Circle: View, Path: View };
});

describe('le cadre des piles d’onglet', () => {
  it('la pile du plan pose la bande, au-dessus de ses écrans', () => {
    render(<PlanLayout />);
    expect(screen.getByText(APP_NAME)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ton compte' })).toBeTruthy();
    expect(screen.getByText('pile')).toBeTruthy();
  });

  it('la pile du suivi pose la bande, au-dessus de ses écrans', () => {
    render(<SuiviLayout />);
    expect(screen.getByText(APP_NAME)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ton compte' })).toBeTruthy();
    expect(screen.getByText('pile')).toBeTruthy();
  });
});
