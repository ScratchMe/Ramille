/**
 * L'ordre de trois blocs du questionnaire, relevé à l'audit du 01/10/2026 (`v1-33`) : ce qui se lit
 * avant ce qui s'y rattache.
 *
 *   - **Q-10, B1.1** : l'indication « réponds Non… » est entre le titre et les choix. Elle disait comment
 *     répondre, et se lisait sous les réponses.
 *   - **Q-8, B1.6** : « Ton mode n'est pas dans la liste ? » ne se rend que sous la liste « Lequel ? », donc
 *     sur « Oui » — il parlait d'une liste absente à l'arrivée comme après « Non ».
 *   - **Q-8, loisirs** : le lien suit la liste des modes et « Voir les autres modes », avant la question
 *     de la distance — il se lisait comme portant sur les tranches.
 *
 * **Le critère de `TESTING.md` §2.10 n'est tenu qu'à moitié, et c'est su.** La présence du lien de B1.6 dépend
 * d'un état (« Oui ») : une branche de rendu, que ni `src/types` ni le parcours réel ne voient. Les trois
 * **ordres**, eux, sont de la mise en page, que le critère renvoie à la recette. Ils sont gardés ici par entorse
 * assumée : chacun est une décision relevée à l'audit (une indication se lit avant les réponses, un lien se
 * rattache à ce qu'il complète), et la recette est la seule autre à la voir — à la main, sur un parcours.
 *
 * Les ordres se lisent dans l'arbre rendu, texte contre texte : un point de repère par bloc, cherché par un
 * préfixe qui ne contient aucune espace insécable (`ThemedText` en pose avant « ? »).
 *
 * **Éprouvé en le cassant, le 01/10/2026** (`TESTING.md` §1.1), chaque étape remise dans son état d'avant
 * (le fichier du commit précédent), puis restaurée depuis une copie :
 *   - B1.1 avec l'indication sous le « Oui / Non » → « est entre le titre et le « Oui / Non » », seul ;
 *   - B1.6 avec le lien au pied de l'écran, toujours rendu → les deux tests d'absence (« à l'arrivée » et
 *     « après « Non » »), et eux seuls : sur « Oui », le lien du pied est bien après la liste, donc le test
 *     de présence ne voit pas ce déplacement — c'est la moitié négative qui le garde (`TESTING.md` §2.10) ;
 *   - les loisirs avec le lien au pied, après la distance → les deux tests de la liste (courte et dépliée),
 *     et eux seuls.
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { CommuteExtraStep } from '@/components/bilan/steps/commute-extra';
import { CommuteHasTripStep } from '@/components/bilan/steps/commute-has-trip';
import { LeisureDetailStep } from '@/components/bilan/steps/leisure-detail';
import { EMPTY_BILAN_ANSWERS, type BilanAnswers } from '@/types/bilan';

// « Ton mode n'est pas dans la liste ? » navigue : `expo-router` ne se charge pas sous Jest.
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const reponses = (depart: Partial<BilanAnswers>): BilanAnswers => ({ ...EMPTY_BILAN_ANSWERS, ...depart });

/** L'arbre rendu, en texte : un repère s'y cherche par sa place. */
const arbre = () => JSON.stringify(screen.toJSON());
const place = (repere: string) => arbre().indexOf(repere);
const derniere = (repere: string) => arbre().lastIndexOf(repere);

const LIEN = 'Ton mode n’est pas dans la liste';

/** Les repères sont tous rendus, et dans cet ordre. */
function dansCetOrdre(...reperes: string[]) {
  const places = reperes.map(place);
  expect(places).not.toContain(-1);
  expect([...places].sort((a, b) => a - b)).toEqual(places);
  expect(new Set(places).size).toBe(places.length);
}

describe('B1.1 — l’indication avant les réponses', () => {
  test('est entre le titre et le « Oui / Non »', () => {
    render(<CommuteHasTripStep answers={reponses({})} update={jest.fn()} />);

    dansCetOrdre('As-tu un trajet régulier', 'Télétravail total', '"accessibilityLabel":"Oui"');
  });
});

describe('B1.6 — le lien du mode manquant suit « Lequel ? »', () => {
  const etape = (second: boolean | null) => (
    <CommuteExtraStep answers={reponses({ commute_second_mode_used: second })} update={jest.fn()} />
  );

  test('n’est pas rendu à l’arrivée, avant toute réponse', () => {
    render(etape(null));
    expect(screen.getByText('Oui')).toBeTruthy();
    expect(place(LIEN)).toBe(-1);
  });

  test('n’est pas rendu après « Non » : il n’y a pas de liste', () => {
    render(etape(false));
    expect(place(LIEN)).toBe(-1);
  });

  test('est rendu après « Oui », sous le dernier mode de la liste, et une seule fois', () => {
    render(etape(true));

    expect(place('Lequel')).toBeGreaterThan(-1);
    expect(place(LIEN)).toBeGreaterThan(derniere('Trottinette ou mobilité douce'));
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});

describe('Loisirs — le lien du mode manquant suit la liste des modes', () => {
  test('liste courte : après « Voir les autres modes », avant la distance', () => {
    render(<LeisureDetailStep answers={reponses({})} update={jest.fn()} />);

    dansCetOrdre('Avec quel mode', 'Voir les autres modes', LIEN, 'Quelle distance aller');
  });

  test('liste dépliée : après le dernier mode, avant la distance', () => {
    render(<LeisureDetailStep answers={reponses({ leisure_mode: 'bus' })} update={jest.fn()} />);

    // « Voir les autres modes » a disparu : sa place est celle du premier mode révélé.
    expect(place('Voir les autres modes')).toBe(-1);
    expect(place(LIEN)).toBeGreaterThan(derniere('Trottinette ou mobilité douce'));
    expect(place(LIEN)).toBeLessThan(place('Quelle distance aller'));
  });
});
