/**
 * Les espaces insécables tiennent aussi quand le texte arrive en morceaux (30/09/2026).
 *
 * `espacesInsecables` est testée sur des phrases entières (`src/types/typographie.test.ts`), mais le
 * plan ne lui en passe jamais : `− {formatKg(capKg)} kg` rend trois enfants, et la règle appliquée à
 * chacun ne voyait pas le nombre qui suit le signe. La contre-lecture de la PR #299 l'a trouvé — la
 * fonction était testée, son appel non. Ce test garde l'appel.
 *
 * Il lit les enfants **bruts** du texte rendu : le normaliseur de `@testing-library` réduit toute
 * suite de blancs à une espace, U+00A0 compris, et ferait passer la version fautive.
 *
 * Éprouvé en cassant ce qu'il garde, le 30/09/2026 — deux mutations, chacune faisant tomber les
 * siennes et aucune autre :
 *   - la règle remise enfant par enfant (l'état d'avant) → les deux premiers tests ;
 *   - un `ThemedText` imbriqué réuni au texte comme une chaîne → le troisième.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

import { ThemedText } from '@/components/themed-text';

const INSECABLE = ' ';

/** Les enfants du premier nœud de texte rendu, tels qu'ils arrivent à l'hôte. */
function enfantsRendus(element: React.ReactElement): unknown[] {
  const arbre = render(element).toJSON();
  const noeud = Array.isArray(arbre) ? arbre[0] : arbre;
  return noeud?.children ?? [];
}

describe('ThemedText — les espaces insécables d’un texte en morceaux', () => {
  it('tient le signe à son nombre et le « % » au sien, dans la phrase du cap', () => {
    const pourcentage = 20;
    const enfants = enfantsRendus(<ThemedText>par an, soit − {pourcentage} % sur ton trajet</ThemedText>);

    expect(enfants.join('')).toBe(`par an, soit −${INSECABLE}20${INSECABLE}% sur ton trajet`);
  });

  it('tient le « − » d’un gain à son nombre, dans la carte d’une action', () => {
    const gain = '406';
    const enfants = enfantsRendus(<ThemedText>− {gain} kg CO₂e</ThemedText>);

    expect(enfants.join('')).toBe(`−${INSECABLE}406 kg CO₂e`);
  });

  it('laisse un texte imbriqué à sa place, et traite les chaînes de part et d’autre', () => {
    const enfants = enfantsRendus(
      <ThemedText>
        Une question ? Écris à <ThemedText>contact</ThemedText> !
      </ThemedText>
    );

    expect(enfants).toHaveLength(3);
    expect(enfants[0]).toBe(`Une question${INSECABLE}? Écris à `);
    expect(typeof enfants[1]).toBe('object');
    expect(enfants[2]).toBe(`${INSECABLE}!`);
  });
});
