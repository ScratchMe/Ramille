/**
 * La feuille du bas, quand une seconde fermeture arrive **pendant** la sortie (27/09/2026,
 * contre-lecture de la vague « mouvement », `docs/architecture/v1-30-les-transitions.md` §5.4).
 *
 * Depuis que la feuille redescend avant de se démonter, il existe une fenêtre de 200 ms où elle est
 * encore là. Le cas qui compte : le geste de retour lance la sortie, puis le choix de la feuille des
 * rappels finit de s'écrire (après `await setReminderChannel`) et appelle `fermer(rendre)`. Ignoré,
 * ce second appel laissait partir le choix en base sans que le plan le reçoive — il affichait
 * l'ancien canal jusqu'à la relecture suivante. Avant la vague, le second `onFerme` arrivait.
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : la mutation que ce test fait tomber n'est
 * visible ni par une dérivation de `src/types`, ni par le parcours réel, qui ne fait jamais deux
 * gestes dans la même sortie.
 *
 * Les fins d'animation sont **retenues** au lieu de partir tout de suite : c'est la seule façon de
 * placer un geste pendant la sortie. Le reste du double est celui de toute la suite
 * (`scripts/doublage-reanimated.js`), recopié parce qu'un `jest.mock` de fichier remplace celui du
 * `setupFiles` au lieu de s'y ajouter.
 *
 * **Éprouvé en le cassant, le 27/09/2026** (TESTING.md §1.1), chaque mutation faisant tomber le sien
 * et lui seul :
 *   - le second `fermer(apres)` ignoré (l'état d'avant la contre-lecture) → « un choix validé
 *     pendant la sortie est celui que la fin rend » ;
 *   - un second `fermer()` sans choix qui remplace quand même le finisseur → « un second retour,
 *     sans rien à rendre, ne remplace pas le choix déjà en route ».
 * **Et le 28/09/2026**, après la seconde contre-lecture :
 *   - `sortieTerminee` jamais posée (l'état du 27/09) → « un choix arrivé après la fin de la sortie,
 *     avant le démontage, est rendu tout de suite » ;
 *   - `enSortie && styles.sansToucher` retiré → « pendant la sortie, la feuille ne prend plus de
 *     toucher ».
 * **Et le 01/10/2026, le voile qui ferme** (audit T-7) — la mutation que ce fichier tient ne se voit
 * ni dans `src/types` ni au parcours réel, qui referme la feuille à Échap :
 *   - le `onPress` du voile retiré (l'état d'avant) → « toucher le voile ferme la feuille… », seul ;
 *   - `pointerEvents: 'box-none'` retiré de la place de la feuille → « la zone au-dessus de la
 *     feuille… », seul : la place couvre tout l'écran, et sans lui elle prenait le toucher avant le
 *     voile, posé dessous.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React, { createRef } from 'react';
import { StyleSheet, Text } from 'react-native';

import { FeuilleDuBas, type PoigneeDeFeuille } from '@/components/feuille-du-bas';

const mockFins: (() => void)[] = [];

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  css: { keyframes: (definition: unknown) => definition, create: (styles: unknown) => styles },
  cubicBezier: () => 'ease',
  useReducedMotion: () => false,
  withTiming: (valeur: number, _reglage: unknown, fin?: (fini: boolean) => void) => {
    if (fin) mockFins.push(() => fin(true));
    return valeur;
  },
}));

function monter(onFerme: () => void) {
  const poignee = createRef<PoigneeDeFeuille>();
  render(
    <FeuilleDuBas ref={poignee} titre="Les rappels" onFerme={onFerme}>
      <Text>contenu</Text>
    </FeuilleDuBas>
  );
  mockFins.length = 0;
  return poignee;
}

/**
 * La sortie s'achève : chaque animation lancée appelle sa fin. `async`, parce que la fin repasse du
 * côté de React par `scheduleOnRN`, qu'un microtask porte dans le double de `react-native-worklets`.
 */
async function finirLaSortie() {
  await act(async () => {
    for (const fin of mockFins.splice(0)) fin();
  });
}

describe('FeuilleDuBas, une seconde fermeture pendant la sortie', () => {
  test('un choix validé pendant la sortie est celui que la fin rend', async () => {
    const onFerme = jest.fn();
    const choix = jest.fn();
    const poignee = monter(onFerme);
    act(() => poignee.current?.fermer()); // le geste de retour lance la sortie
    act(() => poignee.current?.fermer(choix)); // le choix finit de s'écrire pendant qu'elle redescend
    await finirLaSortie();
    expect(choix).toHaveBeenCalledTimes(1);
    expect(onFerme).not.toHaveBeenCalled();
  });

  test('un second retour, sans rien à rendre, ne remplace pas le choix déjà en route', async () => {
    const onFerme = jest.fn();
    const choix = jest.fn();
    const poignee = monter(onFerme);
    act(() => poignee.current?.fermer(choix));
    act(() => poignee.current?.fermer());
    await finirLaSortie();
    expect(choix).toHaveBeenCalledTimes(1);
    expect(onFerme).not.toHaveBeenCalled();
  });

  test('sans second geste, la fin rend le geste de retour, une seule fois', async () => {
    const onFerme = jest.fn();
    const poignee = monter(onFerme);
    act(() => poignee.current?.fermer());
    await finirLaSortie();
    expect(onFerme).toHaveBeenCalledTimes(1);
  });

  test('un choix arrivé après la fin de la sortie, avant le démontage, est rendu tout de suite', async () => {
    const onFerme = jest.fn();
    const choix = jest.fn();
    const poignee = monter(onFerme);
    act(() => poignee.current?.fermer());
    await finirLaSortie();
    // L'appelant n'a pas encore démonté la feuille : `onFerme` est un double qui ne démonte rien.
    act(() => poignee.current?.fermer(choix));
    expect(choix).toHaveBeenCalledTimes(1);
  });

  test('pendant la sortie, la feuille ne prend plus de toucher', () => {
    const poignee = monter(jest.fn());
    const neTouchePlus = () => {
      // Le premier ancêtre du contenu qui porte `pointerEvents` dans son style est la feuille.
      for (let noeud = screen.getByText('contenu').parent; noeud; noeud = noeud.parent) {
        const style = StyleSheet.flatten(noeud.props.style);
        if (style?.pointerEvents) return style.pointerEvents === 'none';
      }
      return false;
    };
    expect(neTouchePlus()).toBe(false);
    act(() => poignee.current?.fermer());
    expect(neTouchePlus()).toBe(true);
  });

  test('toucher le voile ferme la feuille, comme le retour : même sortie, même `onFerme`', async () => {
    const onFerme = jest.fn();
    monter(onFerme);
    // Le voile est masqué au lecteur d'écran (le retour y suffit) : on le cherche parmi les masqués.
    act(() => fireEvent.press(screen.getByTestId('voile-de-la-feuille', { includeHiddenElements: true })));
    await finirLaSortie();
    expect(onFerme).toHaveBeenCalledTimes(1);
  });

  test('la zone au-dessus de la feuille laisse passer le toucher jusqu’au voile', () => {
    monter(jest.fn());
    // Le premier ancêtre du contenu qui porte `pointerEvents` dans son style est la place de la
    // feuille, qui couvre tout l'écran au-dessus du voile.
    let regle: unknown;
    for (let noeud = screen.getByText('contenu').parent; noeud && regle === undefined; noeud = noeud.parent) {
      regle = StyleSheet.flatten(noeud.props.style)?.pointerEvents;
    }
    expect(regle).toBe('box-none');
  });
});
