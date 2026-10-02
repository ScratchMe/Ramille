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
import { RAMILLE } from '@/constants/mascotte';
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
    render(
      <CheckinCard checkin={checkin} emphasize actionEngagee={checkin.committed_action_text} boucleTourne />
    );

    fireEvent.press(screen.getByText('Oui'));

    const attendue = repliqueDuPoint(checkin, 'oui', true).ligne;
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
        boucleTourne
      />
    );

    expect(screen.getByText(repliqueDuPoint(point(), 'oui', true).ligne)).toBeTruthy();
    expect(focus).not.toHaveBeenCalled();
  });

  // Une réponse qui n'est pas partie laisse les boutons : il n'y a rien vers quoi déplacer le focus.
  it('ne déplace rien quand la réponse n’est pas partie', async () => {
    mockRpc.mockResolvedValue({ error: { code: undefined, message: 'réseau' } });
    render(<CheckinCard checkin={point()} emphasize boucleTourne />);

    fireEvent.press(screen.getByText('Oui'));

    await waitFor(() => expect(screen.getByText(/Ta réponse n’est pas partie/)).toBeTruthy());
    expect(screen.getByText('Oui')).toBeTruthy();
    expect(focus).not.toHaveBeenCalled();
  });
});

// **Ce que la carte transmet aux deux dérivations** (décision du 30/09/2026, `v1-27` §12.23). Leurs
// tests gardent `piedDuPointRepondu` et `repliqueDuPoint`, jamais leurs appels : c'est ici qu'on
// voit la carte leur passer `boucleTourne` à toutes les deux.
//
// Éprouvé en le cassant, le 30/09/2026 (TESTING.md §1.1) : la carte qui passe `true` au pied au lieu
// de la propriété → ce test, seul ; la même chose pour la réplique → ce test, seul.
describe('CheckinCard — la boucle arrêtée', () => {
  it('répondue, sa boucle arrêtée, la carte garde la réponse et ne donne aucun rendez-vous', () => {
    // « pas de trajet » : toutes ses variantes donnent rendez-vous, donc la réplique choisie ici ne
    // peut venir que de la branche sans boucle.
    const checkin = point({
      status: 'answered',
      response_kind: 'sans_objet',
      responded_at: '2026-09-21T08:00:00Z',
    });
    render(<CheckinCard checkin={checkin} emphasize boucleTourne={false} />);

    expect(screen.getByText(repliqueDuPoint(checkin, 'sans_objet', false).ligne)).toBeTruthy();
    expect(screen.getByText(/^Répondu /)).toBeTruthy();
    expect(screen.queryByText(/Prochain point/)).toBeNull();
    for (const avecRendezVous of RAMILLE.checkinSansObjet.commute) {
      expect(screen.queryByText(avecRendezVous)).toBeNull();
    }
  });
});

/**
 * **Le pied daté arrive avec la réponse** (audit P-10, 01/10/2026). Il se composait sur la ligne
 * seule, dont `responded_at` reste nul jusqu'à la relecture du plan : juste après « Oui », la carte ne
 * disait pas quand on se retrouve. `piedDuPointRepondu` ne sait pas ce que la carte lui passe, et le
 * parcours réel ne lisait le pied qu'après un rechargement — il l'attend désormais avec la réponse
 * (mutation PL10 de son en-tête, le même jour) ; ce fichier garde en plus l'horodatage du serveur qui
 * prend le relais, que le parcours ne distingue pas de l'instant du geste.
 *
 * Éprouvé en le cassant, le 01/10/2026 (TESTING.md §1.1), deux mutations :
 *   - la carte qui repasse la ligne seule à `piedDuPointRepondu` (l'état d'avant) → les deux tests du
 *     pied, et eux seuls — le second attend d'abord le pied du geste ;
 *   - l'instant du geste préféré à l'horodatage du serveur (`reponduA ?? checkin.responded_at`) →
 *     « garde l'horodatage du serveur… », seul.
 */
describe('CheckinCard — le pied daté', () => {
  // **Seule l'horloge est figée** — un lundi —, pas les minuteries : `waitFor` et les promesses du RPC
  // doublé en ont besoin. Le geste se date donc à coup sûr, et autrement que la ligne relue plus bas.
  beforeEach(() => {
    jest.useFakeTimers({
      now: new Date('2026-10-05T10:00:00'),
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'hrtime',
        'performance',
      ],
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('date le pied à l’instant du geste, sans attendre la relecture', async () => {
    mockRpc.mockResolvedValue({ error: null });
    render(<CheckinCard checkin={point()} emphasize boucleTourne />);

    fireEvent.press(screen.getByText('Oui'));

    await waitFor(() => expect(screen.getByText('Répondu lundi. Prochain point : lundi 12 octobre.')).toBeTruthy());
  });

  // La ligne relue porte l'horodatage du serveur, et c'est lui qu'on dit : l'instant du geste ne
  // vaut que le temps de l'aller-retour.
  it('garde l’horodatage du serveur dès que la ligne relue le porte', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const { rerender } = render(<CheckinCard checkin={point()} emphasize boucleTourne />);
    fireEvent.press(screen.getByText('Oui'));
    await waitFor(() => expect(screen.getByText(/^Répondu lundi\./)).toBeTruthy());

    rerender(
      <CheckinCard
        checkin={point({ status: 'answered', response_kind: 'oui', responded_at: '2026-09-17T08:00:00Z' })}
        emphasize
        boucleTourne
      />
    );
    expect(screen.getByText('Répondu jeudi. Prochain point : lundi 12 octobre.')).toBeTruthy();
  });
});

/**
 * **La réponse se corrige jusqu'au point suivant** (`v1-33` §6, décidé le 02/10/2026 avec la personne
 * qui pilote). La règle côté base — la borne de la période, les trois colonnes — est gardée par le
 * test pgTAP `46` ; ce bloc garde la carte : le lien, la phrase qui désigne la réponse en place, la
 * réplique de la nouvelle réponse, le pied daté de la correction, et le focus dans les deux sens.
 *
 * Éprouvé en le cassant, le 02/10/2026 (TESTING.md §1.1), sept mutations, une à la fois, la suite Jest
 * entière sous `TZ=Europe/Paris` :
 *   - le lien rendu inactif → les quatre tests du bloc ;
 *   - la phrase de la réponse en place retirée → « rouvre les trois réponses… », seul ;
 *   - la correction qui reste ouverte après l'envoi → « envoie la nouvelle réponse… », seul ;
 *   - le pied daté par la ligne (l'heure de la première réponse) → le même, seul ;
 *   - le focus qui ne va pas à la question → « rouvre les trois réponses… », seul ;
 *   - le focus qui ne revient pas au lien après « Annuler » → « « Annuler » referme… », seul ;
 *   - « Modifier ma réponse » qui garde le refus d'avant → « un refus du serveur se dit… », par sa
 *     réouverture — ajoutée après que la mutation a passé la première écriture du test.
 * Et deux de plus, sur la contre-lecture du même soir, chacune sur le test écrit pour elle :
 *   - la réponse donnée ici qui l'emporte toujours sur la ligne (l'état d'avant) → « relue corrigée
 *     ailleurs… », et « garde l'horodatage du serveur… » du bloc du pied ;
 *   - le focus déclenché par la valeur de la réponse et non par le compteur → « une seconde réponse
 *     identique… », seul.
 */
describe('CheckinCard — corriger sa réponse', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: new Date('2026-10-07T10:00:00'),
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'hrtime',
        'performance',
      ],
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  /** Répondue « oui » le lundi 5 octobre, pour la semaine du 28 septembre — la période interrogée le 7. */
  const repondu = () =>
    point({
      period_start: '2026-09-28',
      status: 'answered',
      response_kind: 'oui',
      responded_at: '2026-10-05T08:00:00Z',
    });

  /** Le dernier nœud qui a reçu le focus, et ce qu'il porte. */
  const dernierFocus = () =>
    (focus.mock.calls.at(-1)?.[0] as { props?: { accessibilityLabel?: string; children?: unknown } } | undefined)?.props;

  it('rouvre les trois réponses, la réponse en place dite, et porte le focus sur la question', () => {
    render(<CheckinCard checkin={repondu()} emphasize boucleTourne />);
    expect(screen.queryByText('Oui')).toBeNull();

    fireEvent.press(screen.getByText('Modifier ma réponse'));

    expect(screen.getByText('Ta réponse : oui.')).toBeTruthy();
    expect(screen.getByText('Oui')).toBeTruthy();
    expect(screen.getByText('Non')).toBeTruthy();
    expect(screen.getByText('Pas de trajet la semaine dernière')).toBeTruthy();
    expect(screen.queryByText('Modifier ma réponse')).toBeNull();
    // `ThemedText` rend insécable l'espace avant « ? » : on compare les espaces ramenées à une.
    const espaces = (texte: string) => texte.replace(/\s/g, ' ');
    expect(espaces(String(dernierFocus()?.children))).toBe(espaces(repondu().committed_question ?? ''));
  });

  it('envoie la nouvelle réponse, montre sa réplique, et date le pied de la correction', async () => {
    mockRpc.mockResolvedValue({ error: null });
    render(<CheckinCard checkin={repondu()} emphasize boucleTourne />);
    fireEvent.press(screen.getByText('Modifier ma réponse'));
    fireEvent.press(screen.getByText('Non'));

    const attendue = repliqueDuPoint(repondu(), 'non', true).ligne;
    await waitFor(() => expect(screen.getByText(attendue)).toBeTruthy());
    expect(mockRpc).toHaveBeenCalledWith('repondre_au_checkin', { p_checkin_id: 'p1', p_reponse: 'non' });
    // La ligne porte encore le lundi de la première réponse : le pied dit le mercredi de la correction.
    expect(screen.getByText('Répondu mercredi. Prochain point : lundi 12 octobre.')).toBeTruthy();
    expect((focus.mock.calls.at(-1)?.[0] as NoeudDeTest).props.children?.props.ligne).toBe(attendue);
  });

  it('« Annuler » referme sans rien envoyer, et rend le focus au lien', () => {
    render(<CheckinCard checkin={repondu()} emphasize boucleTourne />);
    fireEvent.press(screen.getByText('Modifier ma réponse'));
    fireEvent.press(screen.getByText('Annuler'));

    expect(mockRpc).not.toHaveBeenCalled();
    expect(screen.getByText(repliqueDuPoint(repondu(), 'oui', true).ligne)).toBeTruthy();
    expect(dernierFocus()?.accessibilityLabel).toBe('Modifier ma réponse');
  });

  // **Une correction faite ailleurs l'emporte à la relecture** (contre-lecture du 02/10/2026) : la
  // réponse donnée ici ne vaut que tant que la ligne n'a pas bougé — elle gardait sinon la réplique du
  // « oui » sous une ligne qui dit « non », le pied, lui, suivant la ligne.
  it('relue corrigée ailleurs, la carte dit la réponse de la ligne', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const { rerender } = render(<CheckinCard checkin={point({ period_start: '2026-09-28' })} emphasize boucleTourne />);
    fireEvent.press(screen.getByText('Oui'));
    await waitFor(() => expect(screen.getByText(repliqueDuPoint(repondu(), 'oui', true).ligne)).toBeTruthy());

    rerender(
      <CheckinCard
        checkin={point({ period_start: '2026-09-28', status: 'answered', response_kind: 'non', responded_at: '2026-10-06T09:00:00Z' })}
        emphasize
        boucleTourne
      />
    );
    expect(screen.getByText(repliqueDuPoint(repondu(), 'non', true).ligne)).toBeTruthy();
    expect(screen.getByText('Répondu mardi. Prochain point : lundi 12 octobre.')).toBeTruthy();
  });

  // Une correction **identique** à la réponse donnée ici retire aussi les boutons sous le doigt : le
  // focus doit retourner à la réplique, qui n'a pourtant pas changé de réponse.
  it('une seconde réponse identique rend encore le focus à la réplique', async () => {
    mockRpc.mockResolvedValue({ error: null });
    render(<CheckinCard checkin={point({ period_start: '2026-09-28' })} emphasize boucleTourne />);
    const attendue = repliqueDuPoint(repondu(), 'oui', true).ligne;
    fireEvent.press(screen.getByText('Oui'));
    await waitFor(() => expect(screen.getByText(attendue)).toBeTruthy());
    fireEvent.press(screen.getByText('Modifier ma réponse'));
    focus.mockClear();

    fireEvent.press(screen.getByText('Oui'));
    await waitFor(() => expect(screen.getByText(attendue)).toBeTruthy());
    await waitFor(() => expect(focus).toHaveBeenCalled());
    expect((focus.mock.calls.at(-1)?.[0] as NoeudDeTest).props.children?.props.ligne).toBe(attendue);
  });

  // Le point suivant est arrivé pendant que la carte restait affichée : le RPC refuse, la carte le dit,
  // et « Annuler » rend la réponse en place.
  it('un refus du serveur se dit, et « Annuler » rend la réponse en place', async () => {
    mockRpc.mockResolvedValue({ error: { code: '22023' }, status: 400 });
    render(<CheckinCard checkin={repondu()} emphasize boucleTourne />);
    fireEvent.press(screen.getByText('Modifier ma réponse'));
    fireEvent.press(screen.getByText('Non'));

    expect(await screen.findByText(/^Ce point de suivi n’attend plus de réponse/)).toBeTruthy();
    fireEvent.press(screen.getByText('Annuler'));
    expect(screen.getByText(repliqueDuPoint(repondu(), 'oui', true).ligne)).toBeTruthy();
    expect(screen.queryByText(/^Ce point de suivi n’attend plus de réponse/)).toBeNull();

    // Rouvrir repart de zéro : le refus d'avant n'efface plus les réponses.
    fireEvent.press(screen.getByText('Modifier ma réponse'));
    expect(screen.getByText('Oui')).toBeTruthy();
    expect(screen.queryByText(/^Ce point de suivi n’attend plus de réponse/)).toBeNull();
  });
});
