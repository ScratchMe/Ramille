/**
 * La carte du point rend le focus à ce qui remplace le bouton touché (24/09/2026, `v1-29`).
 *
 * **Pourquoi un test de rendu, et pourquoi celui-là seulement.** Le critère de `TESTING.md` §2.10 :
 * on peut nommer la mutation qu'il fait tomber, et ni `src/types` ni le parcours réel ne la voient.
 * Ici, c'est le déplacement du focus : la carte retirait « Oui », « Non » et le lien au moment même
 * où l'un d'eux venait d'être touché, et le mot de Ramille — la seule trace que la réponse est
 * partie — n'était jamais lu au lecteur d'écran. Le parcours réel répond « Oui » mais ne regarde pas
 * où va le focus, et aucune dérivation ne porte cet effet.
 *
 * **Le chemin éprouvé est le chemin natif**, celui d'Android, cible de la V1 : le préréglage
 * `jest-expo` rend la plateforme `ios`, donc c'est `AccessibilityInfo.sendAccessibilityEvent` qui
 * part. Le chemin web (`focus()` sur un nœud `tabIndex={-1}`) a été vérifié à la main dans l'export,
 * au navigateur, le même jour.
 *
 * **La ref reçue est l'instance de la `View` doublée par React Native**, et c'est ce qui rend
 * l'assertion précise : le préréglage de test remplace `View` par une classe (`mockComponent`) dont
 * l'instance porte ses props. On vérifie donc que le focus va au nœud **qui porte la réplique**, et
 * pas seulement qu'un focus part quelque part. Mesuré en écrivant ce test : un `createNodeMock`
 * posé par précaution ne changeait rien — la ref ne vaut pas `null` ici, contrairement à celle
 * d'un composant hôte sous `react-test-renderer` —, il a donc été retiré.
 *
 * Éprouvé en cassant ce qu'il garde, le 24/09/2026 — trois mutations, chacune faisant tomber la
 * sienne et aucune autre :
 *   - l'effet retiré (l'état d'avant) → le premier test ;
 *   - l'effet déclenché sur la réponse lue (`reponse`) et non sur celle donnée ici
 *     (`reponseLocale`) → le deuxième : une carte déjà répondue volerait le focus au chargement ;
 *   - la réplique sortie de son conteneur, qui garde la ref → le premier encore, par son assertion
 *     sur la phrase portée.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import { CheckinCard, type EngagementCheckin } from '@/components/checkin-card';
import { repliqueDuPoint } from '@/types/checkin';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

// Ramille dessinée tirerait `react-native-svg` et `reanimated` pour un visage que le lecteur d'écran
// ne voit pas : seule sa phrase compte ici.
jest.mock('@/components/ramille-dit', () => {
  const { Text } = jest.requireActual('react-native');
  return { RamilleDit: ({ ligne }: { ligne: string }) => <Text>{ligne}</Text> };
});

function point(surcharge: Partial<EngagementCheckin> = {}): EngagementCheckin {
  return {
    id: 'p1',
    loop_type: 'commute',
    period_label: 'Semaine du 14 septembre',
    trip_label: 'Trajet domicile-travail (Voiture thermique)',
    poste: 'commute',
    question_kind: 'engagement',
    mode: 'voiture_thermique',
    period_start: '2026-09-14',
    committed_question: 'Mardi ou jeudi, as-tu fait ce trajet en train ?',
    committed_action_text: 'Passer deux trajets sur cinq en train',
    status: 'pending',
    response_kind: null,
    responded_at: null,
    ...surcharge,
  };
}

/** Ce que le double de `View` expose de lui-même : ses props, donc ce qu'il porte. */
type NoeudDeTest = { props: { children?: React.ReactElement<{ ligne?: string }> } };

let focus: jest.SpyInstance;

beforeEach(() => {
  mockRpc.mockReset();
  focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
});

afterEach(() => {
  focus.mockRestore();
});

describe('CheckinCard — le focus après une réponse', () => {
  it('porte le focus sur la réplique qui remplace les boutons', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const checkin = point();
    render(<CheckinCard checkin={checkin} emphasize actionEngagee={checkin.committed_action_text} />);

    fireEvent.press(screen.getByText('Oui'));

    const attendue = repliqueDuPoint(checkin, 'oui').ligne;
    await waitFor(() => expect(screen.getByText(attendue)).toBeTruthy());
    expect(focus).toHaveBeenCalledTimes(1);
    const [noeud, evenement] = focus.mock.calls[0] as [NoeudDeTest, string];
    expect(evenement).toBe('focus');
    // Le nœud qui reçoit le focus est celui qui porte la phrase de Ramille, pas un voisin.
    expect(noeud.props.children?.props.ligne).toBe(attendue);
  });

  // **La moitié négative, et c'est celle qu'un test écrit spontanément oublie** (§2.10) : une carte
  // déjà répondue, retrouvée en revenant sur le plan, ne doit voler le focus à personne.
  it('ne prend pas le focus au montage d’une carte déjà répondue', () => {
    render(
      <CheckinCard
        checkin={point({ status: 'answered', response_kind: 'oui', responded_at: '2026-09-21T08:00:00Z' })}
        emphasize
      />
    );

    expect(screen.getByText(repliqueDuPoint(point(), 'oui').ligne)).toBeTruthy();
    expect(focus).not.toHaveBeenCalled();
  });

  // Une réponse qui n'est pas partie laisse les boutons : il n'y a rien vers quoi déplacer le focus.
  it('ne déplace rien quand la réponse n’est pas partie', async () => {
    mockRpc.mockResolvedValue({ error: { code: undefined, message: 'réseau' } });
    render(<CheckinCard checkin={point()} emphasize />);

    fireEvent.press(screen.getByText('Oui'));

    await waitFor(() => expect(screen.getByText(/Ta réponse n’est pas partie/)).toBeTruthy());
    expect(screen.getByText('Oui')).toBeTruthy();
    expect(focus).not.toHaveBeenCalled();
  });
});
