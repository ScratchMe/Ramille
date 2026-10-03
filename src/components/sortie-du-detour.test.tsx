/**
 * La sortie d'un écran qui se consulte : une forme, grise, au chevron aligné sur la marge (`v1-33` T-10,
 * 03/10/2026).
 *
 * **Pourquoi un test de rendu** (le critère de `TESTING.md` §2.10). La forme a été décidée par la
 * personne qui pilote, et aucune dérivation de `src/types` ne la porte : l'encre — le gris et jamais le
 * vert, puisqu'une sortie n'avance pas —, le rôle de lien, et le recul de la cible qui pose le trait du
 * chevron sur la marge du contenu. Le parcours réel touche ces sorties par leur nom, sans lire ni leur
 * couleur ni leur place. La **place** sur chaque écran est gardée à côté, écran par écran
 * (`plan-pistes.test.tsx`, `restitution-du-bilan.test.tsx`, `toi-confirmation.test.tsx`,
 * `legal-page.test.tsx`, et `contexte.test.tsx` pour une sortie qui reste en bas).
 *
 * Éprouvé en cassant ce qu'il garde, le 03/10/2026 — trois mutations, jouées sur ce fichier et les cinq
 * fichiers qui lisent la place d'une sortie :
 *   - l'encre passée à `accentText`, le vert de l'ancien « Retour au plan » → le premier test, seul ;
 *   - le rôle `link` retiré → le deuxième et le troisième, qui trouvent la sortie par son rôle, et les
 *     quatre tests d'écran qui la cherchent de même (les pistes, « Toi », la relecture, la fin des pages
 *     légales) : six en tout, et c'est attendu — un lecteur d'écran ne la trouverait plus non plus ;
 *   - le recul de la cible retiré (`marginLeft`) → le troisième, seul.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { CHEVRON, RETRAIT_DU_CHEVRON, SortieDuDetour } from '@/components/sortie-du-detour';
import { Colors, FontFamily } from '@/constants/theme';

describe('SortieDuDetour', () => {
  it('se dit en gris, au corps `small`, en 500 — jamais dans le vert de ce qui fait avancer', () => {
    render(<SortieDuDetour label="Retour au plan" onPress={() => {}} />);
    const style = StyleSheet.flatten(screen.getByText('Retour au plan').props.style);

    expect(style.color).toBe(Colors.light.textTertiary);
    expect(style.color).not.toBe(Colors.light.accentText);
    expect(style.fontFamily).toBe(FontFamily.medium);
    expect(style.fontSize).toBe(14);
  });

  it('est un lien, nommé par son libellé, qui mène où l’appelant le dit', () => {
    const surPression = jest.fn();
    render(<SortieDuDetour label="Revenir à mon suivi" onPress={surPression} />);

    fireEvent.press(screen.getByRole('link', { name: 'Revenir à mon suivi' }));
    expect(surPression).toHaveBeenCalledTimes(1);
  });

  it('recule de ce qui précède le trait du chevron, pour que le trait tombe sur la marge', () => {
    render(<SortieDuDetour label="Retour" onPress={() => {}} />);
    const style = StyleSheet.flatten(screen.getByRole('link', { name: 'Retour' }).props.style);

    // Le tracé commence à 8/24 de sa boîte (`M14.5 5.5 8 12`) : 6 px sur 18.
    expect(RETRAIT_DU_CHEVRON).toBe(Math.round((CHEVRON * 8) / 24));
    expect(style.marginLeft).toBe(-RETRAIT_DU_CHEVRON);
    // La cible épouse son libellé : elle ne s'étire pas sur la largeur de la page.
    expect(style.alignSelf).toBe('flex-start');
  });
});
