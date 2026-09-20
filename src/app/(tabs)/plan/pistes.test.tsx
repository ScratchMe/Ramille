/**
 * Un test d'écran, écrit pour **mesurer ce qu'il coûte** — autorisé le 20/09/2026.
 *
 * Ce dépôt teste les dérivations pures (`src/types`) et le chemin nominal de bout en bout
 * (`verifier-parcours-reel.mjs`). Entre les deux, 15 000 lignes d'écrans ne sont gardées que par
 * la recette sur appareil. La question n'est pas « peut-on tester un écran ? » — on peut — mais
 * « qu'est-ce qu'un test d'écran attrape que les deux autres suites n'attrapent pas, et à quel
 * prix ? ». Le relevé est en `v1-27` §12.11 ; ce fichier en est la pièce à conviction.
 *
 * **Ce qu'on a choisi d'éprouver, et pourquoi ces trois-là.** Aucune n'est vérifiable ailleurs :
 * ce sont des **branches de rendu**, pas des dérivations — `src/types/plan.ts` ne sait pas ce
 * que l'écran fait de ce qu'il lui rend, et le parcours réel ne joue que le chemin heureux.
 *
 *   1. **Un échec de lecture ne dit jamais « tu n'as rien »** (règle de C1.4, qui vaut pour tout
 *      le produit). Les pistes existent ; c'est la lecture qui a manqué. Confondre les deux, c'est
 *      annoncer à quelqu'un que son plan est vide alors que le réseau a hoqueté.
 *   2. **La phrase d'intro change quand une action est engagée** — sans quoi elle annonce un tri
 *      « du plus gros gain au plus petit » que l'engagement défait, l'action en cours passant en
 *      tête de son poste (relevé en contre-lisant le lot 5).
 *   3. **Le refus de remplacement (`RM001`) s'affiche.** C'est le défaut trouvé le 20/09/2026 :
 *      cet écran jetait le paramètre, donc la liste se réordonnait sous les yeux de la personne
 *      sans qu'un mot dise pourquoi son choix n'avait pas été pris.
 *
 * **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1) — trois mutations, chacune faisant
 * tomber la sienne et aucune autre :
 *   - le libellé d'erreur remplacé par celui de l'état vide → 1 ;
 *   - le ternaire de l'intro figé sur sa branche « sans engagement » → 2 ;
 *   - `onRefus` ramené à `rafraichir()` seul, c'est-à-dire l'état d'avant le correctif → 3.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import PistesScreen from './pistes';

// ── Les doublures, et c'est ici que se lit le coût réel d'un test d'écran ─────────────────────
//
// Trois modules à doubler pour monter 453 lignes : le transport (qui ne doit pas partir en
// réseau), le contexte de la pile (le hook lève hors d'elle, à dessein), et la navigation. Aucun
// n'est évitable, et c'est le chiffre à retenir : **le doublage pèse autant que les assertions**.

// Le préfixe `mock` n'est pas cosmétique : jest hisse les `jest.mock()` au-dessus des
// déclarations du fichier, et refuse toute variable hors portée dans leur fabrique — sauf
// celles qui le portent. Premier frottement propre aux tests d'écran, relevé au §12.11.
const mockLignes = jest.fn();

jest.mock('@/lib/supabase', () => ({
  ensureSession: jest.fn(async () => ({ user: { id: 'u1' } })),
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => mockLignes(),
        }),
      }),
    }),
  },
}));

jest.mock('./_layout', () => ({
  usePassageDEngagement: () => ({ deposer: jest.fn(), retirer: jest.fn(), prendre: jest.fn() }),
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

/**
 * La carte est doublée pour une raison précise : le contrat qu'on éprouve est **le câblage**
 * (l'écran fait-il quelque chose du paramètre que la carte lui passe ?), pas le rendu de la
 * carte. La vraie carte irait jusqu'au RPC pour produire un refus, ce qui doublerait la pile
 * entière pour éprouver une ligne. C'est aussi le moment où un test d'écran cesse d'être « la
 * page telle qu'elle est » : ce qu'on monte ici est l'écran **moins** ses cartes.
 */
jest.mock('@/components/plan/carte-de-piste', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    CarteDePiste: ({ onRefus }: { onRefus: (message: string | null) => void }) => (
      <Pressable onPress={() => onRefus('Ton plan a changé entre-temps.')}>
        <Text>refuser</Text>
      </Pressable>
    ),
  };
});

// Le hook écoute `AppState` et le focus de navigation : hors d'un navigateur monté, il n'a rien à
// écouter. On garde sa signature — c'est un rafraîchissement, pas une dépendance du rendu.
jest.mock('@/hooks/use-rafraichir-au-retour', () => ({ useRafraichirAuRetour: () => {} }));

function piste(surcharge = {}) {
  return {
    id: 'a1',
    saving_kg_year: 205,
    saving_share_percent: 12,
    detail_text: 'sur 5 trajets',
    first_step: 'Repère le trajet le plus court cette semaine.',
    rank: 1,
    committed_at: null,
    intention_days: null,
    intention_timing: null,
    carried_over_from: null,
    action_templates: { action_text: 'Faire un trajet sur cinq à vélo', poste: 'commute' },
    ...surcharge,
  };
}

beforeEach(() => {
  mockLignes.mockReset();
});

describe('PistesScreen', () => {
  it('ne dit jamais « tu n’as rien » quand c’est la lecture qui a manqué', async () => {
    mockLignes.mockResolvedValue({ data: null, error: { message: 'réseau' } });
    render(<PistesScreen />);

    await waitFor(() => expect(screen.getByText(/n’ont pas pu être chargées/)).toBeTruthy());
    // **Le cœur de la règle** : la phrase de l'état vide ne doit pas apparaître sur un échec.
    expect(screen.queryByText(/ne porte aucune piste/)).toBeNull();
    expect(screen.getByText('Réessayer')).toBeTruthy();
  });

  it('dit l’état vide, et seulement après une lecture réussie', async () => {
    mockLignes.mockResolvedValue({ data: [{ id: 'c1', plan_actions: [] }], error: null });
    render(<PistesScreen />);

    await waitFor(() => expect(screen.getByText(/ne porte aucune piste/)).toBeTruthy());
    expect(screen.queryByText(/n’ont pas pu être chargées/)).toBeNull();
  });

  /**
   * **Le défaut du 20/09/2026, et rien d'autre ne pouvait le voir.** Cet écran recevait
   * `onRefus(message)` et n'en faisait rien : la liste se réordonnait sous les yeux de la
   * personne sans qu'un mot dise pourquoi son choix n'avait pas été pris. Ni `src/types/plan.ts`
   * (qui ne connaît pas l'écran) ni le parcours réel (qui ne joue que le chemin heureux) n'ont
   * de prise dessus.
   */
  it('affiche la phrase d’un remplacement refusé', async () => {
    mockLignes.mockResolvedValue({ data: [{ id: 'c1', plan_actions: [piste()] }], error: null });
    render(<PistesScreen />);

    // **Deux gestes, pas un** — et c'est une mesure en soi : une piste se rend en **ligne**, la
    // carte n'apparaît qu'une fois la ligne ouverte (planche A2). Le test doit donc rejouer
    // l'enchaînement de l'écran, et il se couple par là à sa conception d'interaction : le jour
    // où les cartes s'ouvrent autrement, ce test casse sans qu'aucun contrat n'ait bougé.
    await waitFor(() => expect(screen.getByText('Faire un trajet sur cinq à vélo')).toBeTruthy());
    fireEvent.press(screen.getByText('Faire un trajet sur cinq à vélo'));

    await waitFor(() => expect(screen.getByText('refuser')).toBeTruthy());
    expect(screen.queryByText('Ton plan a changé entre-temps.')).toBeNull();

    fireEvent.press(screen.getByText('refuser'));
    await waitFor(() => expect(screen.getByText('Ton plan a changé entre-temps.')).toBeTruthy());
  });

  it('change sa phrase d’intro quand une action est engagée', async () => {
    mockLignes.mockResolvedValue({ data: [{ id: 'c1', plan_actions: [piste()] }], error: null });
    const { unmount } = render(<PistesScreen />);
    await waitFor(() => expect(screen.getByText(/Par poste, du plus gros gain/)).toBeTruthy());
    expect(screen.queryByText(/Ton action en cours d’abord/)).toBeNull();
    // **L'autre moitié de l'état vide**, trouvée en mutant : sans elle, la condition
    // `groupes.length === 0` pouvait sauter entièrement sans qu'aucune assertion ne bouge — la
    // phrase « ton plan ne porte aucune piste » s'affichait **au-dessus des pistes**. Une garde
    // qui ne vérifie qu'une présence laisse toujours passer l'excès.
    expect(screen.queryByText(/ne porte aucune piste/)).toBeNull();
    unmount();

    mockLignes.mockResolvedValue({
      data: [{ id: 'c1', plan_actions: [piste({ committed_at: '2026-09-15T10:00:00Z' })] }],
      error: null,
    });
    render(<PistesScreen />);
    // La phrase d'avant annonçait un tri que l'engagement défait : l'action en cours passe en tête
    // de son poste quel que soit son gain.
    await waitFor(() => expect(screen.getByText(/Ton action en cours d’abord/)).toBeTruthy());
  });
});
