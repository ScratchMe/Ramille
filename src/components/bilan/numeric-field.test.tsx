/**
 * Le champ de distance, vide, ne montre rien dedans (`v1-33` D8, audit Q-14, 01/10/2026).
 *
 * Il portait un « 0 » gris en 28/600 — la taille et la graisse d'un nombre saisi : « 0 km » se lisait
 * comme une valeur, et c'est la seule que le champ refuse (une distance de 0 n'est pas une réponse,
 * `distanceDomicileTravailKm`). L'intitulé de la question et l'unité disent ce qu'on attend ; le contour
 * au repos dit qu'il y a un champ.
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : on peut nommer la mutation — le placeholder qu'une
 * relecture « utile » remettrait, parce qu'un champ vide a l'air nu —, et ni `src/types` ni le parcours
 * réel ne la voient : le parcours saisit toujours une valeur avant de lire le champ. La **moitié
 * négative** garde ce qui ne doit pas partir avec le placeholder : le nom accessible du champ, qui est
 * l'intitulé et l'unité, jamais le « 0 ».
 *
 * **Éprouvé en le cassant, le 01/10/2026** (`TESTING.md` §1.1) :
 *   - `placeholder="0"` remis (l'état d'avant) → « un champ vide ne porte aucun placeholder », seul ;
 *   - le nom accessible ramené à l'intitulé seul, sans l'unité → les deux : l'un et l'autre trouvent le
 *     champ par son nom complet, donc la moitié négative tombe avec la première.
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { NumericField } from '@/components/bilan/numeric-field';

const NOM_DU_CHAMP = 'Distance d’un aller, en km';

describe('NumericField', () => {
  test('un champ vide ne porte aucun placeholder : ni « 0 », ni rien', () => {
    render(<NumericField value={null} onChange={jest.fn()} unit="km" label="Distance d’un aller" />);
    const champ = screen.getByLabelText(NOM_DU_CHAMP);
    expect(champ.props.value).toBe('');
    expect(champ.props.placeholder).toBeUndefined();
    // Et rien d'autre à l'écran qui ressemble à une valeur : l'unité seule.
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.getByText('km')).toBeTruthy();
  });

  test('le nom accessible dit l’intitulé et l’unité', () => {
    render(<NumericField value={12} onChange={jest.fn()} unit="km" label="Distance d’un aller" />);
    expect(screen.getByLabelText(NOM_DU_CHAMP).props.value).toBe('12');
  });
});
