/**
 * Un lien a trois apparences, et l'appelant ne peut plus en fabriquer une quatrième (`v1-33` T-5,
 * 03/10/2026).
 *
 * **Pourquoi un test de rendu** (le critère de `TESTING.md` §2.10). Le type de `TextLink` refuse déjà
 * `type`, `themeColor` et `weight` à la compilation ; ce qu'il ne voit pas, c'est le rendu : quelle encre
 * et quelle graisse chaque apparence pose, qu'un lien désactivé prend l'encre tertiaire, et qu'un `style`
 * passé par l'appelant — un objet de `StyleSheet` qui partage `textAlign` avec le type permis échappe au
 * contrôle des propriétés en trop — ne change ni l'encre ni le corps du lien. Aucune dérivation de
 * `src/types` ne porte ces choix, et le parcours réel ne lit pas la couleur d'un lien.
 *
 * Éprouvé en cassant ce qu'il garde, le 03/10/2026 — quatre mutations, chacune faisant tomber les
 * siennes et aucune autre :
 *   - l'encre d'`action` passée à `textSecondary` → le premier test ;
 *   - le soulignement de `souligne` retiré → le troisième ;
 *   - l'encre du désactivé retirée (`encre = ENCRE[apparence]`) → le quatrième ;
 *   - le style de l'appelant transmis tel quel au texte, et non son seul alignement → le cinquième.
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { TextLink } from '@/components/text-link';
import { Colors, FontFamily } from '@/constants/theme';

/** Le style aplati du texte du lien nommé. */
function styleDuTexte(libelle: string) {
  return StyleSheet.flatten(screen.getByText(libelle).props.style);
}

describe('TextLink — trois apparences nommées', () => {
  it('« action » : l’encre d’accent, en 600, sans soulignement', () => {
    render(<TextLink label="Voir toutes les pistes · 5" apparence="action" onPress={() => {}} />);
    const style = styleDuTexte('Voir toutes les pistes · 5');

    expect(style.color).toBe(Colors.light.accentText);
    expect(style.fontFamily).toBe(FontFamily.semibold);
    expect(style.fontSize).toBe(14);
    expect(style.textDecorationLine).not.toBe('underline');
  });

  it('« discret » : l’encre tertiaire, en 500, sans soulignement', () => {
    render(<TextLink label="Confidentialité" apparence="discret" onPress={() => {}} />);
    const style = styleDuTexte('Confidentialité');

    expect(style.color).toBe(Colors.light.textTertiary);
    expect(style.fontFamily).toBe(FontFamily.medium);
    expect(style.textDecorationLine).not.toBe('underline');
  });

  it('« souligne » : la même encre, soulignée au repos', () => {
    render(<TextLink label="Changer d’avis" apparence="souligne" onPress={() => {}} />);
    const style = styleDuTexte('Changer d’avis');

    expect(style.color).toBe(Colors.light.textTertiary);
    expect(style.textDecorationLine).toBe('underline');
  });

  it('désactivé, un lien d’action prend l’encre tertiaire', () => {
    render(<TextLink label="Réessayer" apparence="action" disabled onPress={() => {}} />);

    expect(styleDuTexte('Réessayer').color).toBe(Colors.light.textTertiary);
  });

  it('le style de l’appelant aligne le texte, et ne change ni son encre ni son corps', () => {
    // Le cas que le type ne voit pas : un objet de `StyleSheet` qui porte `textAlign` à côté d'une encre
    // et d'une taille.
    const styles = StyleSheet.create({ lien: { textAlign: 'center', color: '#FF0000', fontSize: 18 } });
    render(<TextLink label="Retour" apparence="discret" onPress={() => {}} style={styles.lien} />);
    const style = styleDuTexte('Retour');

    expect(style.textAlign).toBe('center');
    expect(style.color).toBe(Colors.light.textTertiary);
    expect(style.fontSize).toBe(14);
  });
});
