/**
 * La sortie d'un écran qui se consulte : une forme, grise, au chevron aligné sur la marge (`v1-33` T-10,
 * 03/10/2026).
 *
 * **Pourquoi un test de rendu** (le critère de `TESTING.md` §2.10). La forme a été décidée par la
 * personne qui pilote, et aucune dérivation de `src/types` ne la porte : l'encre — le gris et jamais le
 * vert, puisqu'une sortie n'avance pas —, le rôle de lien, et le recul de la cible qui pose le trait du
 * chevron sur la marge du contenu. Le parcours réel ne touche que « Retour au plan », par son nom, sans
 * lire ni sa couleur ni sa place. La **place** sur chaque écran est gardée à côté, écran par écran
 * (`plan-pistes.test.tsx`, `restitution-du-bilan.test.tsx`, `toi-confirmation.test.tsx`,
 * `legal-page.test.tsx`, et `contexte.test.tsx` pour une sortie qui reste en bas).
 *
 * Éprouvé en cassant ce qu'il garde, le 03/10/2026 — cinq mutations, jouées sur ce fichier et les cinq
 * fichiers qui lisent la place d'une sortie :
 *   - l'encre du libellé passée à `accentText`, le vert de l'ancien « Retour au plan » → le premier
 *     test, seul ;
 *   - la graisse passée à 400, une forme qui dériverait de celle de `TextLink` → la même, seule ;
 *   - le trait du chevron passé à `accentText` → le deuxième, seul ;
 *   - le rôle `link` retiré → le troisième et le quatrième, qui trouvent la sortie par son rôle, et
 *     les quatre tests d'écran qui la cherchent de même (les pistes, « Toi », la relecture, la fin des
 *     pages légales) : c'est attendu — un lecteur d'écran ne la trouverait plus non plus ;
 *   - le recul de la cible retiré (`marginLeft`) → le quatrième, seul.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { CHEVRON, RETRAIT_DU_CHEVRON, SortieDuDetour } from '@/components/sortie-du-detour';
import { TextLink } from '@/components/text-link';
import { Colors } from '@/constants/theme';

describe('SortieDuDetour', () => {
  it('se dit comme un lien discret, en gris — jamais dans le vert de ce qui fait avancer', () => {
    render(
      <>
        <SortieDuDetour label="Retour au plan" onPress={() => {}} />
        <TextLink label="Faire un nouveau bilan" apparence="discret" onPress={() => {}} />
      </>
    );
    const style = StyleSheet.flatten(screen.getByText('Retour au plan').props.style);
    const discret = StyleSheet.flatten(screen.getByText('Faire un nouveau bilan').props.style);

    // La forme de `discret`, rendue à côté : une retouche de l'une se verrait sur l'autre.
    for (const propriete of ['color', 'fontFamily', 'fontSize', 'lineHeight'] as const) {
      expect(style[propriete]).toBe(discret[propriete]);
    }
    expect(style.color).toBe(Colors.light.textTertiary);
    expect(style.color).not.toBe(Colors.light.accentText);
  });

  it('trace son chevron dans la même encre grise', () => {
    render(<SortieDuDetour label="Retour" onPress={() => {}} />);
    // Le `Path` tel que le composant le pose ; l'élément natif dessous porte la couleur déjà convertie.
    const traces = screen
      .UNSAFE_queryAllByProps({ d: 'M14.5 5.5 8 12l6.5 6.5' })
      .filter((trace) => typeof trace.props.stroke === 'string');

    expect(traces).toHaveLength(1);
    expect(traces[0].props.stroke).toBe(Colors.light.textTertiary);
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
