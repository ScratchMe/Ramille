/**
 * **Le geste d'engagement ne se défait pas sous les yeux** (audit P-1, 01/10/2026).
 *
 * Au succès de « C'est noté », sur le plan, le sélecteur se refermait **avant** la relecture : la
 * carte rendait « Je m'y engage » le temps que l'écran relise le plan — trois lectures puis un lot de
 * sept —, puis seulement « Changer d'avis ». La personne voyait son engagement annulé, et pouvait le
 * reprendre. Le sélecteur reste désormais tel quel, « C'est noté » inactif, jusqu'à la lecture qui
 * suit (`lectures`) : la carte s'y relit engagée, ou la lecture échoue et il redevient actif.
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : la décision vit dans le composant — quand
 * refermer, quand rendre la main —, aucune dérivation de `src/types` ne la porte, et le parcours réel
 * ne joue jamais une relecture en échec. Il voit le chemin heureux, image par image (étape
 * « engagement ») ; ce fichier voit les trois issues.
 *
 * Éprouvé en le cassant, le 01/10/2026 (TESTING.md §1.1), trois mutations, chacune faisant tomber ce
 * qu'elle doit et rien d'autre :
 *   - le sélecteur refermé au succès (l'état d'avant : `setBusy(false)`, `setPicking(false)`) → « garde
 *     « C'est noté » inactif… », et « rend le sélecteur actif… » par sa première assertion — « C'est
 *     noté » n'est plus là pour être inactif ;
 *   - la lecture en échec qui ne relâche plus le sélecteur (la seconde branche de l'ajustement retirée)
 *     → « rend le sélecteur actif… » ;
 *   - la carte relue engagée qui ne remet pas le sélecteur à zéro (la première branche réduite à
 *     `setLectureAttendue(null)`) → « revient à « Je m'y engage » après « Changer d'avis » ».
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import { ActionCommitment } from '@/components/plan/action-commitment';

const mockEngager = jest.fn();
const mockLiberer = jest.fn();

jest.mock('@/lib/plan-engagement', () => ({
  commitPlanAction: (...args: unknown[]) => mockEngager(...args),
  clearPlanActionCommitment: (...args: unknown[]) => mockLiberer(...args),
}));

const onChanged = jest.fn();
const onEngage = jest.fn();

/** Un trajet domicile-travail : l'intention se dit en jours — sauf `poste` qui dit autre chose. */
const carte = (surcharge: { committed?: boolean; lectures?: number; poste?: string } = {}) => (
  <ActionCommitment
    actionId="a1"
    poste={surcharge.poste ?? 'commute'}
    committed={surcharge.committed ?? false}
    intentionDays={null}
    intentionTiming={null}
    otherActionCommitted={false}
    onChanged={onChanged}
    onEngage={onEngage}
    lectures={surcharge.lectures ?? 3}
  />
);

/** Ce qu'un lecteur d'écran lit d'un bouton inactif : `disabled`, rangé par `Pressable` dans son état. */
const inactif = (nom: string) =>
  screen.getByRole('button', { name: nom }).props.accessibilityState?.disabled === true;
const coche = (nom: string) => screen.getByRole('checkbox', { name: nom }).props.accessibilityState?.checked === true;

/** « Je m'y engage », mardi, « C'est noté » — et le RPC a répondu. */
async function sEngager() {
  fireEvent.press(screen.getByText('Je m’y engage'));
  fireEvent.press(screen.getByRole('checkbox', { name: 'mardi' }));
  fireEvent.press(screen.getByText('C’est noté'));
  await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
}

beforeEach(() => {
  mockEngager.mockReset().mockResolvedValue({ ok: true });
  mockLiberer.mockReset().mockResolvedValue({ ok: true });
  onChanged.mockReset();
  onEngage.mockReset();
});

describe('ActionCommitment — jusqu’à la relecture', () => {
  it('garde « C’est noté » inactif jusqu’à la lecture qui suit, puis rend « Changer d’avis »', async () => {
    const { rerender } = render(carte());
    await sEngager();

    // Le geste a abouti, la relecture n'est pas finie : rien ne se défait sous les yeux.
    expect(onEngage).toHaveBeenCalledWith('commute');
    expect(screen.queryByText('Je m’y engage')).toBeNull();
    expect(inactif('C’est noté')).toBe(true);

    // La lecture qui suit relit la carte engagée : le sélecteur cède la place, dans le même rendu.
    rerender(carte({ committed: true, lectures: 4 }));
    expect(screen.getByText('Changer d’avis')).toBeTruthy();
    expect(screen.queryByText('C’est noté')).toBeNull();
  });

  it('rend le sélecteur actif, sa sélection gardée, quand la lecture qui suit échoue', async () => {
    const { rerender } = render(carte());
    await sEngager();
    expect(inactif('C’est noté')).toBe(true);

    // Une lecture se termine sans relire la carte engagée — la ligne de relecture de l'écran le dit.
    rerender(carte({ lectures: 4 }));
    expect(inactif('C’est noté')).toBe(false);
    expect(coche('mardi')).toBe(true);
  });

  it('revient à « Je m’y engage » après « Changer d’avis »', async () => {
    const { rerender } = render(carte());
    await sEngager();
    rerender(carte({ committed: true, lectures: 4 }));

    fireEvent.press(screen.getByText('Changer d’avis'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));
    // La libération relue : la carte redevient une proposition, sélecteur fermé.
    rerender(carte({ committed: false, lectures: 5 }));
    expect(screen.getByText('Je m’y engage')).toBeTruthy();
    expect(screen.queryByText('C’est noté')).toBeNull();
  });
});

/**
 * **« C'est noté » en attente, qui dit ce qui manque** (D13 de `v1-33`, 01/10/2026). Le parcours réel
 * le joue sur la liste, pour une échéance ; ce fichier voit la forme en jours, sur le plan, que le
 * parcours ne touche pas incomplète — et le focus, qu'il lit là-bas sur une case d'option.
 *
 * Éprouvé en le cassant, le 01/10/2026 (TESTING.md §1.1), chacune faisant tomber la sienne :
 *   - « C'est noté » remis `disabled` sur une intention incomplète (l'état d'avant) → « agit en
 *     attente… », par sa première assertion ;
 *   - la demande jamais posée (`setDemande(true)` retiré) → « agit en attente… », sur la ligne ;
 *   - le focus jamais donné (`donnerLeFocus` retiré de `demander`) → « agit en attente… », sur le
 *     focus ;
 *   - la garde de `submit` retirée (l'appel part incomplet) → « agit en attente… », sur l'appel ;
 *   - la demande qui ne retombe plus (`setDemande(false)` retiré) → « la ligne retombe… ».
 */
describe('ActionCommitment — « C’est noté » en attente', () => {
  let focus: jest.SpyInstance;
  beforeEach(() => {
    focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
  });
  afterEach(() => focus.mockRestore());

  /** Le nœud qui a reçu le dernier focus, par son libellé accessible. */
  const dernierFocus = () => {
    const appels = focus.mock.calls.filter(([, evenement]) => evenement === 'focus');
    const noeud = appels.at(-1)?.[0] as { props?: { accessibilityLabel?: string } } | undefined;
    return noeud?.props?.accessibilityLabel;
  };

  it('agit en attente : dit « Choisis au moins un jour. », porte le focus sur lundi, et n’envoie rien', () => {
    render(carte());
    fireEvent.press(screen.getByText('Je m’y engage'));

    // En attente, pas inactif : il agit.
    expect(inactif('C’est noté')).toBe(false);
    expect(screen.queryByText('Choisis au moins un jour.')).toBeNull();

    fireEvent.press(screen.getByText('C’est noté'));
    expect(screen.getByText('Choisis au moins un jour.')).toBeTruthy();
    expect(dernierFocus()).toBe('lundi');
    expect(mockEngager).not.toHaveBeenCalled();
  });

  it('dit « Choisis une échéance. » pour une intention à échéance', () => {
    render(carte({ poste: 'travel' }));
    fireEvent.press(screen.getByText('Je m’y engage'));
    fireEvent.press(screen.getByText('C’est noté'));
    expect(screen.getByText('Choisis une échéance.')).toBeTruthy();
    expect(mockEngager).not.toHaveBeenCalled();
  });

  it('la ligne retombe dès que l’intention est complète, et ne revient qu’au toucher suivant', async () => {
    render(carte());
    fireEvent.press(screen.getByText('Je m’y engage'));
    fireEvent.press(screen.getByText('C’est noté'));
    expect(screen.getByText('Choisis au moins un jour.')).toBeTruthy();

    fireEvent.press(screen.getByRole('checkbox', { name: 'mardi' }));
    expect(screen.queryByText('Choisis au moins un jour.')).toBeNull();

    // Décoché, rien ne se redit d'office : il faut toucher de nouveau.
    fireEvent.press(screen.getByRole('checkbox', { name: 'mardi' }));
    expect(screen.queryByText('Choisis au moins un jour.')).toBeNull();

    // Complète, l'intention part.
    fireEvent.press(screen.getByRole('checkbox', { name: 'jeudi' }));
    fireEvent.press(screen.getByText('C’est noté'));
    await waitFor(() => expect(mockEngager).toHaveBeenCalledWith('a1', { days: [4] }, false));
  });
});
