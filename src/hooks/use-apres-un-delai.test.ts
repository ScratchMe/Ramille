import { act, renderHook } from '@testing-library/react-native';

import { DELAI_AVANT_CHARGEMENT, useApresUnDelai, useChargementVisible } from '@/hooks/use-apres-un-delai';

// Le « Chargement… » différé (27/09/2026, `v1-30` §5.8). Ce qui compte : rien avant le seuil, la
// phrase après, et un chargement qui se relance repart de zéro — sans quoi un second chargement
// afficherait la phrase dès sa première image, exactement le clignotement que ce délai retire.
//
// **Éprouvé en le cassant le 27/09/2026**, une mutation à la fois, l'état d'avant réécrit ensuite,
// et **rejoué le soir même** : la première table donnait « rien avant le seuil — seulement » pour la
// première mutation, et c'était faux (relevé par la contre-lecture). Toutes les attentes qui
// dépendent du délai tombent avec lui, ce qui est juste :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | le délai ignoré (`setEcoule(true)` sans minuteur) | « rien avant le seuil », « un chargement qui se relance repart de zéro », « sans demande, seulement après le délai » |
//   | `ecoule` gardé quand le chargement s'arrête (plus de remise à faux au nettoyage) | « un chargement qui se relance repart de zéro » — seulement |
//   | `actif &&` retiré du retour | « faux dès que le chargement s'arrête, rendu même compris » — seulement |
//   | `useChargementVisible` ignore la demande de la personne | « demandé par la personne, dès le premier rendu » — seulement |
//   | `useChargementVisible` sans `enChargement &&` | « rien quand rien ne charge, demande ou pas » — seulement |

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useApresUnDelai', () => {
  test('rien avant le seuil, vrai une fois le seuil passé', () => {
    const { result } = renderHook(() => useApresUnDelai(true, DELAI_AVANT_CHARGEMENT));
    expect(result.current).toBe(false);
    act(() => jest.advanceTimersByTime(DELAI_AVANT_CHARGEMENT - 1));
    expect(result.current).toBe(false);
    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  test('faux dès que le chargement s’arrête, rendu même compris', () => {
    // Chaque valeur rendue, et pas seulement la dernière : le rendu où le chargement s'arrête
    // précède le nettoyage de l'effet, donc sans `actif &&` il dirait encore « vrai » une fois.
    const vues: boolean[] = [];
    const { rerender } = renderHook(
      ({ actif }: { actif: boolean }) => {
        const vue = useApresUnDelai(actif, DELAI_AVANT_CHARGEMENT);
        vues.push(vue);
        return vue;
      },
      { initialProps: { actif: true } }
    );
    act(() => jest.advanceTimersByTime(DELAI_AVANT_CHARGEMENT));
    expect(vues.at(-1)).toBe(true);
    const avantLArret = vues.length;
    rerender({ actif: false });
    expect(vues.slice(avantLArret)).not.toContain(true);
  });

  test('un chargement qui se relance repart de zéro', () => {
    const { result, rerender } = renderHook(({ actif }: { actif: boolean }) => useApresUnDelai(actif, DELAI_AVANT_CHARGEMENT), {
      initialProps: { actif: true },
    });
    act(() => jest.advanceTimersByTime(DELAI_AVANT_CHARGEMENT));
    rerender({ actif: false });
    rerender({ actif: true });
    expect(result.current).toBe(false);
    act(() => jest.advanceTimersByTime(DELAI_AVANT_CHARGEMENT));
    expect(result.current).toBe(true);
  });
});

describe('useChargementVisible', () => {
  // Le « Réessayer » de l'écran d'erreur : sans la ligne dès le premier rendu, un second échec
  // rendu en quelques millisecondes ramenait le même écran sans rien dire du geste.
  test('demandé par la personne, dès le premier rendu', () => {
    const { result } = renderHook(() => useChargementVisible(true, true));
    expect(result.current).toBe(true);
  });

  test('sans demande, seulement après le délai', () => {
    const { result } = renderHook(() => useChargementVisible(true, false));
    expect(result.current).toBe(false);
    act(() => jest.advanceTimersByTime(DELAI_AVANT_CHARGEMENT));
    expect(result.current).toBe(true);
  });

  test('rien quand rien ne charge, demande ou pas', () => {
    const { result } = renderHook(() => useChargementVisible(false, true));
    expect(result.current).toBe(false);
  });
});
