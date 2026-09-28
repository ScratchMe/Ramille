/**
 * `useReprendreLEngagement` : l'engagement pris sur l'écran des pistes attend que la feuille des
 * rappels puisse être décidée, puis se consomme une fois.
 *
 * Le défaut qu'il ferme (contre-lecture du 28/09/2026) : sur une pile neuve, le plan monté par
 * `revenirOu('/plan')` reprenait le drapeau au premier focus, **avant** d'avoir lu les préférences,
 * et la feuille — qui ne s'ouvre qu'une fois par appareil — n'était jamais proposée.
 *
 * **Éprouvé en le cassant, le 28/09/2026** (TESTING.md §1.1), une mutation à la fois :
 *
 *   | Ce qu'on casse | Ce qui tombe |
 *   |---|---|
 *   | le drapeau repris avant la garde `pret` (l'ordre d'avant) | « sur une pile neuve… » — seulement |
 *   | la garde `pret` retirée | « sur une pile neuve… » — seulement |
 *   | `pret` retiré des dépendances de l'effet | « sur une pile neuve… » — seulement |
 *   | `proposer` appelé même quand il n’y a rien à reprendre | « une seule fois… » — seulement |
 */
import { renderHook } from '@testing-library/react-native';

import { useReprendreLEngagement } from './use-reprendre-l-engagement';

// `useFocusEffect` rejoue son effet quand le rappel change, l'écran étant au premier plan : c'est ce
// que fait un `useEffect` dont le rappel est l'unique dépendance.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effet: () => void) => useEffect(effet, [effet]) };
});

/** Le passage de la pile, tel que `plan/_layout.tsx` le construit : lu-et-effacé. */
function unPassage(poste: string | null) {
  let enAttente: { poste: string | null } | null = { poste };
  const reprendre = jest.fn(() => {
    const engagement = enAttente;
    enAttente = null;
    return engagement;
  });
  return { reprendre, resteDepose: () => enAttente !== null };
}

describe('useReprendreLEngagement', () => {
  it('préférences déjà lues (retour par la pile) : proposé au premier focus, sans attendre', () => {
    const passage = unPassage('commute');
    const proposer = jest.fn();
    renderHook(() => useReprendreLEngagement(passage.reprendre, true, proposer));
    expect(proposer).toHaveBeenCalledTimes(1);
    expect(proposer).toHaveBeenCalledWith('commute');
  });

  it('sur une pile neuve, le drapeau attend la lecture des préférences, puis est proposé', () => {
    const passage = unPassage('travel');
    const proposer = jest.fn();
    const { rerender } = renderHook(
      ({ pret }: { pret: boolean }) => useReprendreLEngagement(passage.reprendre, pret, proposer),
      { initialProps: { pret: false } }
    );
    expect(proposer).not.toHaveBeenCalled();
    expect(passage.resteDepose()).toBe(true);

    rerender({ pret: true });
    expect(proposer).toHaveBeenCalledTimes(1);
    expect(proposer).toHaveBeenCalledWith('travel');
  });

  it('une seule fois : un rechargement qui relit les préférences ne rouvre pas la feuille', () => {
    const passage = unPassage('commute');
    const proposer = jest.fn();
    const { rerender } = renderHook(
      ({ proposer: p }: { proposer: jest.Mock }) => useReprendreLEngagement(passage.reprendre, true, p),
      { initialProps: { proposer } }
    );
    // Relire les préférences recrée `proposerLesRappels`, donc rejoue l'effet.
    const apresRechargement = jest.fn();
    rerender({ proposer: apresRechargement });
    expect(proposer).toHaveBeenCalledTimes(1);
    expect(apresRechargement).not.toHaveBeenCalled();
  });
});
