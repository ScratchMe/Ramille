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
 *
 * **Et le soir même, une quatrième** (contre-lecture de la PR #314) : le nombre de lectures lu au
 * toucher, dans la fermeture de `submit` (la version d'avant) → « une lecture terminée pendant
 * l'aller-retour… », seul.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
const onModifie = jest.fn();

/** Un trajet domicile-travail : l'intention se dit en jours — sauf `poste` qui dit autre chose. */
const carte = (
  surcharge: {
    committed?: boolean;
    lectures?: number;
    poste?: string;
    intentionDays?: number[] | null;
    intentionTiming?: string | null;
    engageeLe?: string | null;
  } = {}
) => (
  <ActionCommitment
    actionId="a1"
    poste={surcharge.poste ?? 'commute'}
    committed={surcharge.committed ?? false}
    intentionDays={surcharge.intentionDays ?? null}
    intentionTiming={surcharge.intentionTiming ?? null}
    otherActionCommitted={false}
    onChanged={onChanged}
    onEngage={onEngage}
    onModifie={onModifie}
    lectures={surcharge.lectures ?? 3}
    engageeLe={surcharge.engageeLe ?? null}
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
  onModifie.mockReset();
});

describe('ActionCommitment — jusqu’à la relecture', () => {
  it('garde « C’est noté » inactif jusqu’à la lecture qui suit, puis rend « Changer d’avis »', async () => {
    const { rerender } = render(carte());
    await sEngager();

    // Le geste a abouti, la relecture n'est pas finie : rien ne se défait sous les yeux.
    expect(onEngage).toHaveBeenCalledWith({ poste: 'commute', echeance: null });
    expect(onModifie).not.toHaveBeenCalled();
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

  // **Puis une autre lecture la relit engagée** (contre-lecture du 02/10/2026) : le sélecteur restait
  // ouvert sur une action engagée, « C'est noté » à la place de « Changer d'avis », et le retoucher
  // envoyait une modification que la carte prenait pour un engagement.
  it('après une lecture en échec, la carte relue engagée rend « Changer d’avis »', async () => {
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
    try {
      const { rerender } = render(carte());
      await sEngager();
      rerender(carte({ lectures: 4 }));
      expect(inactif('C’est noté')).toBe(false);

      rerender(carte({ committed: true, intentionDays: [2], lectures: 5 }));
      expect(screen.getByText('Changer d’avis')).toBeTruthy();
      expect(screen.queryByText('C’est noté')).toBeNull();

      // Et le sélecteur est vraiment refermé, pas seulement caché : le rouvrir porte le focus sur la
      // question, comme tout geste qui l'ouvre.
      focus.mockClear();
      fireEvent.press(screen.getByText('Modifier les jours'));
      const cible = focus.mock.calls.at(-1)?.[0] as { props?: { children?: unknown } } | undefined;
      // L'espace avant « ? » est rendue insécable par `ThemedText` : on ne l'écrit pas ici.
      expect(String(cible?.props?.children)).toMatch(/^Quels jours\s\?$/);
    } finally {
      focus.mockRestore();
    }
  });

  // Une lecture partie avant le toucher — un retour de l'app au premier plan — se termine pendant
  // l'aller-retour de l'engagement : ce n'est pas « la lecture qui suit ».
  it('une lecture terminée pendant l’aller-retour ne relâche pas « C’est noté »', async () => {
    let repondre: (valeur: { ok: true }) => void = () => {};
    mockEngager.mockReturnValue(new Promise((resoudre) => (repondre = resoudre)));
    const { rerender } = render(carte());
    fireEvent.press(screen.getByText('Je m’y engage'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'mardi' }));
    fireEvent.press(screen.getByText('C’est noté'));

    rerender(carte({ lectures: 4 }));
    await act(async () => repondre({ ok: true }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(inactif('C’est noté')).toBe(true);

    // La vraie relecture, elle, le relâche.
    rerender(carte({ lectures: 5 }));
    expect(inactif('C’est noté')).toBe(false);
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
 * Éprouvé en le cassant, le 01/10/2026 (TESTING.md §1.1), six mutations jouées une à une, rien hors
 * de ce bloc ne tombant :
 *   - « C'est noté » remis `disabled` sur une intention incomplète (l'état d'avant) → les trois tests
 *     du bloc, le toucher ne faisant plus rien ;
 *   - la demande jamais posée (`setDemande(true)` retiré) → les trois, sur la ligne ;
 *   - la garde de `submit` retirée (l'appel part incomplet) → les trois, la ligne absente et l'appel
 *     parti ;
 *   - le focus jamais donné (`donnerLeFocus` retiré de `demander`) → « agit en attente… », seul ;
 *   - la demande qui ne retombe plus (`setDemande(false)` retiré) → « la ligne retombe… », seul ;
 *   - la demande gardée par « Annuler » (le `setDemande(false)` de son gestionnaire retiré) → « la
 *     ligne retombe… », seul, sur le sélecteur rouvert.
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

  // **L'échéance part avec l'engagement** (`v1-33` D14, 02/10/2026) : la feuille des rappels en fait
  // dire à Ramille un autre mois pour « Le mois prochain ». Éprouvé le même jour : l'échéance remise à
  // `null` dans l'appel → ce test, seul.
  it('emporte l’échéance choisie vers la feuille, avec le poste', async () => {
    render(carte({ poste: 'leisure' }));
    fireEvent.press(screen.getByText('Je m’y engage'));
    fireEvent.press(screen.getByText('Le mois prochain'));
    fireEvent.press(screen.getByText('C’est noté'));
    await waitFor(() => expect(onEngage).toHaveBeenCalledWith({ poste: 'leisure', echeance: 'le_mois_prochain' }));
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

    // Refermé par « Annuler » puis rouvert, le sélecteur ne redit rien d'office : la demande était la
    // sienne.
    fireEvent.press(screen.getByText('C’est noté'));
    expect(screen.getByText('Choisis au moins un jour.')).toBeTruthy();
    fireEvent.press(screen.getByText('Annuler'));
    fireEvent.press(screen.getByText('Je m’y engage'));
    expect(screen.queryByText('Choisis au moins un jour.')).toBeNull();

    // Complète, l'intention part.
    fireEvent.press(screen.getByRole('checkbox', { name: 'jeudi' }));
    fireEvent.press(screen.getByText('C’est noté'));
    await waitFor(() => expect(mockEngager).toHaveBeenCalledWith('a1', { days: [4] }, false));
  });
});

/**
 * **Modifier l'intention sans libérer** (`v1-33` D15, 02/10/2026). La carte engagée n'offrait que
 * « Changer d'avis » : changer ses jours coûtait quatre gestes et une archive « changement ». Le lien
 * rouvre le sélecteur prérempli, et « C'est noté » rappelle le RPC sur la même action — c'est la
 * base qui archive l'intention remplacée (test pgTAP `44`). Ce que ce fichier garde, c'est la carte :
 * le préremplissage, l'appel, l'absence de cérémonie, et la fermeture à la lecture qui suit.
 *
 * Éprouvé en le cassant, le 02/10/2026 (TESTING.md §1.1) :
 *   - la fermeture au premier rendu engagé (la condition `!modification` retirée) → « envoie la même
 *     action… », seul — le sélecteur se refermait avant la relecture, sur l'ancienne intention ;
 *   - la feuille des rappels ouverte sur une modification (`onEngage` sans condition) → le même, seul ;
 *   - le préremplissage retiré → « rouvre le choix prérempli », « l'échéance des sorties », et
 *     « envoie la même action… », dont le décochage de jeudi part alors d'un choix vide ;
 *   - « Annuler » qui garde la modification ouverte (`setModification(false)` retiré) → « après une
 *     modification annulée… », seul. Le premier essai de ce fichier ne le voyait pas : le drapeau
 *     resté levé ne change rien à l'écran tant qu'on ne s'engage pas de nouveau.
 *
 * **Et le soir même, après la contre-lecture**, huit de plus, une à la fois, `src/components/plan`,
 * `src/app` et `plan.test.ts` rejoués sous `TZ=Europe/Paris` — chacune fait tomber un test, seul :
 *   - la modification refermée à toute lecture terminée, sans reconnaître l'intention envoyée → « après
 *     une lecture en échec, le sélecteur redevient actif… » (de ce bloc) ;
 *   - le sélecteur d'engagement qui ne se remet pas à zéro sur une action relue engagée → « après une
 *     lecture en échec, la carte relue engagée… » (du premier bloc), par le focus : la carte s'affiche,
 *     mais le sélecteur caché reste ouvert, et le rouvrir ne porte plus le focus sur la question. Une
 *     première version affichait aussi la carte engagée sur `committed && !modification` : redondante
 *     avec la remise à zéro, aucune mutation ne la distinguait, et elle est retirée ;
 *   - la modification gardée sur une action libérée ailleurs → « une action relue libérée… » ;
 *   - l'échec gardé par « Annuler » → « « Annuler » efface l'échec… » ;
 *   - le focus rendu au bouton après « Annuler » → « « Annuler » le rend au lien… » ;
 *   - l'échéance précochée telle quelle → « précoche le mois visé… » ;
 *   - `onModifie` jamais appelé → « envoie la même action… » ;
 *   - le focus rendu au lien à toute fermeture d'une modification (la version d'avant) → « une
 *     modification écrite ne le rend pas au lien… ».
 */
describe('ActionCommitment — modifier l’intention sans libérer (D15)', () => {
  it('rouvre le choix prérempli, à côté de « Changer d’avis »', () => {
    render(carte({ committed: true, intentionDays: [2, 4] }));
    expect(screen.getByText('Changer d’avis')).toBeTruthy();

    fireEvent.press(screen.getByText('Modifier les jours'));

    expect(coche('mardi')).toBe(true);
    expect(coche('jeudi')).toBe(true);
    expect(coche('lundi')).toBe(false);
  });

  it('envoie la même action, sans remplacement ni cérémonie, et se referme à la lecture qui suit', async () => {
    const { rerender } = render(carte({ committed: true, intentionDays: [2, 4] }));
    fireEvent.press(screen.getByText('Modifier les jours'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'jeudi' }));
    fireEvent.press(screen.getByText('C’est noté'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));

    expect(mockEngager).toHaveBeenCalledWith('a1', { days: [2] }, false);
    expect(onEngage).not.toHaveBeenCalled();
    expect(onModifie).toHaveBeenCalledTimes(1);
    // La carte était déjà engagée : elle ne se referme pas sur l'ancienne intention avant la relecture.
    expect(inactif('C’est noté')).toBe(true);

    rerender(carte({ committed: true, intentionDays: [2], lectures: 4 }));
    expect(screen.getByText('Modifier les jours')).toBeTruthy();
    expect(screen.queryByText('C’est noté')).toBeNull();
  });

  it('« Annuler » laisse l’intention en place, sans rien envoyer', () => {
    render(carte({ committed: true, intentionDays: [2, 4] }));
    fireEvent.press(screen.getByText('Modifier les jours'));
    fireEvent.press(screen.getByText('Annuler'));

    expect(screen.getByText('Modifier les jours')).toBeTruthy();
    expect(screen.queryByText('C’est noté')).toBeNull();
    expect(mockEngager).not.toHaveBeenCalled();
  });

  it('après une modification annulée, un nouvel engagement ouvre bien la feuille des rappels', async () => {
    const { rerender } = render(carte({ committed: true, intentionDays: [2, 4] }));
    fireEvent.press(screen.getByText('Modifier les jours'));
    fireEvent.press(screen.getByText('Annuler'));
    fireEvent.press(screen.getByText('Changer d’avis'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));

    rerender(carte({ committed: false, lectures: 4 }));
    // Les gestes de `sEngager`, sans son attente : `onChanged` compte déjà la libération.
    fireEvent.press(screen.getByText('Je m’y engage'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'mardi' }));
    fireEvent.press(screen.getByText('C’est noté'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));
    expect(onEngage).toHaveBeenCalledWith({ poste: 'commute', echeance: null });
  });

  it('dit « Modifier l’échéance » sur les sorties, prérempli de l’échéance en place', () => {
    render(carte({ committed: true, poste: 'leisure', intentionTiming: 'ce_mois' }));
    fireEvent.press(screen.getByText('Modifier l’échéance'));

    expect(screen.getByRole('radio', { name: 'Ce mois-ci' }).props.accessibilityState?.checked).toBe(true);
  });

  // **Le même mois, redit** (décidé le 02/10/2026) : la règle vit dans `echeanceARecocher`, que
  // `plan.test.ts` garde ; ce test garde l'appel — la date de l'engagement qui lui parvient.
  it('précoche le mois visé : « Le mois prochain » choisi en septembre se rouvre en octobre sur « Ce mois-ci »', () => {
    jest.useFakeTimers({ now: new Date('2026-10-02T10:00:00Z') });
    try {
      render(
        carte({ committed: true, poste: 'leisure', intentionTiming: 'le_mois_prochain', engageeLe: '2026-09-20T10:00:00Z' })
      );
      fireEvent.press(screen.getByText('Modifier l’échéance'));
      expect(screen.getByRole('radio', { name: 'Ce mois-ci' }).props.accessibilityState?.checked).toBe(true);
      expect(screen.getByRole('radio', { name: 'Le mois prochain' }).props.accessibilityState?.checked).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  // **Une lecture en échec ne referme pas une modification** (contre-lecture du 02/10/2026) : elle se
  // refermait à toute lecture terminée, et une lecture qui échoue rend l'ancienne intention — la carte
  // la redisait, comme si le choix n'avait pas été pris.
  it('après une lecture en échec, le sélecteur redevient actif, sa sélection gardée', async () => {
    const { rerender } = render(carte({ committed: true, intentionDays: [2, 4] }));
    fireEvent.press(screen.getByText('Modifier les jours'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'jeudi' }));
    fireEvent.press(screen.getByText('C’est noté'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));

    rerender(carte({ committed: true, intentionDays: [2, 4], lectures: 4 }));
    expect(inactif('C’est noté')).toBe(false);
    expect(coche('mardi')).toBe(true);
    expect(coche('jeudi')).toBe(false);
  });

  it('« Annuler » efface l’échec d’un envoi qu’on abandonne', async () => {
    mockEngager.mockResolvedValue({ ok: false, message: 'Ton choix n’a pas été enregistré.' });
    render(carte({ committed: true, intentionDays: [2, 4] }));
    fireEvent.press(screen.getByText('Modifier les jours'));
    fireEvent.press(screen.getByRole('checkbox', { name: 'jeudi' }));
    fireEvent.press(screen.getByText('C’est noté'));
    expect(await screen.findByText('Ton choix n’a pas été enregistré.')).toBeTruthy();

    fireEvent.press(screen.getByText('Annuler'));
    expect(screen.getByText('Modifier les jours')).toBeTruthy();
    expect(screen.queryByText('Ton choix n’a pas été enregistré.')).toBeNull();
  });

  // L'action libérée ailleurs — un autre appareil — pendant qu'on la modifiait : ce qu'on envoie est
  // désormais un engagement, et la feuille des rappels le suit.
  it('une action relue libérée pendant la modification fait de l’envoi un engagement', async () => {
    const { rerender } = render(carte({ committed: true, intentionDays: [2, 4] }));
    fireEvent.press(screen.getByText('Modifier les jours'));
    rerender(carte({ committed: false, lectures: 4 }));

    fireEvent.press(screen.getByText('C’est noté'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(onEngage).toHaveBeenCalledWith({ poste: 'commute', echeance: null });
    expect(onModifie).not.toHaveBeenCalled();
  });

  describe('le focus', () => {
    let focus: jest.SpyInstance;
    beforeEach(() => {
      focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
    });
    afterEach(() => focus.mockRestore());
    const libellesFocalises = () =>
      focus.mock.calls
        .filter(([, evenement]) => evenement === 'focus')
        .map(([noeud]) => (noeud as { props?: { accessibilityLabel?: string } }).props?.accessibilityLabel);

    it('« Annuler » le rend au lien « Modifier les jours », qui réapparaît', () => {
      render(carte({ committed: true, intentionDays: [2, 4] }));
      fireEvent.press(screen.getByText('Modifier les jours'));
      fireEvent.press(screen.getByText('Annuler'));
      expect(libellesFocalises().at(-1)).toBe('Modifier les jours');
    });

    // Écrite, la modification laisse l'écran rendre le focus à la carte relue (`onModifie`) : le
    // donner au lien l'aurait volé à l'annonce de la nouvelle intention.
    it('une modification écrite ne le rend pas au lien : c’est l’écran qui le donne à la carte relue', async () => {
      const { rerender } = render(carte({ committed: true, intentionDays: [2, 4] }));
      fireEvent.press(screen.getByText('Modifier les jours'));
      fireEvent.press(screen.getByRole('checkbox', { name: 'jeudi' }));
      fireEvent.press(screen.getByText('C’est noté'));
      await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
      rerender(carte({ committed: true, intentionDays: [2], lectures: 4 }));

      expect(screen.getByText('Modifier les jours')).toBeTruthy();
      expect(libellesFocalises()).not.toContain('Modifier les jours');
    });
  });
});
