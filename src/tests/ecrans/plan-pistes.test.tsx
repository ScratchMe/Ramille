/**
 * Un test d'écran, écrit pour **mesurer ce qu'il coûte** — autorisé le 20/09/2026.
 *
 * **Il n'est pas colocalisé, et ce n'est pas un choix : c'est une contrainte.** Ce dépôt colocalise
 * ses tests à côté de ce qu'ils éprouvent, et un test d'écran ne le peut pas —
 * `src/app/` **est** le routeur, et `expo-router` n'ignore que `+html`, `+native-intent`, `+api` et
 * `+middleware` (relevé dans son `getRoutesCore.js`). Un `pistes.test.tsx` posé à côté de
 * `pistes.tsx` produit donc une **route** `/plan/pistes.test`, exportée et servie en production.
 * Mesuré le 20/09/2026 : l'export a bien rendu la page, et c'est `verifier-titres-export.mjs` qui
 * l'a arrêtée — elle n'avait pas de ligne dans `PAGE_TITLES`. Sans cette garde, l'adresse partait
 * en production.
 *
 * Ce dépôt teste les dérivations pures (`src/types`) et le chemin nominal de bout en bout
 * (`verifier-parcours-reel.mjs`). Entre les deux, 15 000 lignes d'écrans ne sont gardées que par
 * la recette sur appareil. La question n'est pas « peut-on tester un écran ? » — on peut — mais
 * « qu'est-ce qu'un test d'écran attrape que les deux autres suites n'attrapent pas, et à quel
 * prix ? ». Le relevé est en `v1-27` §12.11 ; ce fichier en est la pièce à conviction.
 *
 * **Ce qu'on a choisi d'éprouver le 20/09/2026, et pourquoi ces trois-là.** Aucune n'était
 * vérifiable ailleurs : ce sont des **branches de rendu**, pas des dérivations — `src/types/plan.ts`
 * ne sait pas ce que l'écran fait de ce qu'il lui rend, et le parcours réel ne joue que le chemin
 * heureux.
 *
 *   1. **Un échec de lecture ne dit jamais « tu n'as rien »** (règle de C1.4, qui vaut pour tout
 *      le produit). Les pistes existent ; c'est la lecture qui a manqué. Confondre les deux, c'est
 *      annoncer à quelqu'un que son plan est vide alors que le réseau a hoqueté.
 *   2. **La phrase d'intro change quand une action est engagée** — ce que le choix fait n'est pas
 *      le même : mettre l'action en tête du plan, ou remplacer la tienne. Elle changeait jusqu'au
 *      29/09/2026 pour une autre raison, un ordre que l'engagement défaisait (« Ton action en cours
 *      d'abord ») ; depuis `v1-32` l'ordre ne bouge plus, et la phrase vit dans `introDesPistes`.
 *      Ce test en garde l'**appel** : que l'écran lui passe bien l'engagement relu.
 *   3. **Le refus de remplacement (`RM001`) s'affiche.** C'est le défaut trouvé le 20/09/2026 :
 *      cet écran jetait le paramètre, donc la liste se réordonnait sous les yeux de la personne
 *      sans qu'un mot dise pourquoi son choix n'avait pas été pris.
 *
 * **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1) — trois mutations, chacune faisant
 * tomber la sienne et aucune autre :
 *   - le libellé d'erreur remplacé par celui de l'état vide → 1 ;
 *   - le ternaire de l'intro figé sur sa branche « sans engagement » → 2 (rejouée le 29/09/2026 sous
 *     sa forme d'aujourd'hui : `introDesPistes(false)` en dur → 2, seul) ;
 *   - `onRefus` ramené à `rafraichir()` seul, c'est-à-dire l'état d'avant le correctif → 3.
 *
 * **Et un quatrième contrat le 28/09/2026, le câblage du délai de chargement** (`v1-30` §5.8), lui
 * aussi invisible des deux autres suites. Deux mutations :
 *   - `relance: true` retiré du « Réessayer » (l'état d'avant la contre-lecture) → « dit
 *     « Chargement… » tout de suite après « Réessayer » » ;
 *   - `true` passé en second argument de `useChargementVisible` (la ligne toujours montrée) →
 *     « ne dit pas « Chargement… » avant le délai quand personne ne l'a demandé ».
 *
 * **Et quatre câblages le 29/09/2026, ceux de la liste où l'on choisit** (`v1-32`) — la famille
 * « une dérivation appelée avec le mauvais argument » : `etatDeLaPiste` et `annonceDeLaPiste` ont
 * leurs tests, pas leurs appels. (`defilementPourMontrer` non plus, mais son appel ne se voit
 * qu'avec une vraie mise en page : il est au parcours réel.) Cinq mutations, chacune faisant tomber
 * la sienne et aucune autre (sur un fichier égal au commit, restauré depuis sa copie) :
 *   - `surLeChoix` retiré de la carte → « ouvre la carte sur le choix » ;
 *   - `choisir` ignoré tant qu'une carte est ouverte → « une seule carte à la fois » ;
 *   - « Annuler » qui ne referme plus (`setEnChoix(null)` retiré) → « Annuler rend la rangée » ;
 *   - le focus demandé dans le gestionnaire d'« Annuler », où la rangée n'existe pas encore → la
 *     même, sur le focus seul — la rangée revient, personne ne la désigne ;
 *   - `etatDeLaPiste(action, null)` au lieu de l'engagée relue → « la ligne engagée fait dire
 *     « Choisir à la place » aux autres ».
 *
 * **Ces quatre-là ne tiennent plus la seconde moitié du critère** (`TESTING.md` §2.10), et c'est su :
 * la contre-lecture du même soir a donné au parcours réel les étapes qui les voient aussi — la carte
 * sur la question, une seule à la fois, « Annuler » et son focus, « Choisir à la place ». Ils restent
 * ici, entorse assumée pour ce seul fichier, dont les doublures sont déjà payées : Jest tourne à
 * chaque `npm test`, sans Docker ni stack, et nomme le câblage fautif là où le parcours nomme une
 * étape.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import PistesScreen from '@/app/(tabs)/plan/pistes';

// ── Les doublures, et c'est ici que se lit le coût réel d'un test d'écran ─────────────────────
//
// Cinq modules à doubler pour monter l'écran : le transport (qui ne doit pas partir en réseau), le
// contexte de la pile (le hook lève hors d'elle, à dessein), la navigation, la carte (ci-dessous)
// et le rafraîchissement au retour — plus reanimated, doublé pour toute la suite (`TESTING.md`
// §2.10). Aucun n'est évitable, et c'est le chiffre à retenir : **le doublage pèse autant que les
// assertions**. (Il disait « trois modules pour 453 lignes », deux comptes périmés en silence : la
// liste se relit dans les `jest.mock` ci-dessous, pas ici.)

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

// Le passage de la pile du plan, sous ses vrais noms — ce double portait `retirer` et `prendre`, que
// le passage ne porte pas (relevé le 01/10/2026) ; l'écran n'en lit que `deposer`.
jest.mock('@/app/(tabs)/plan/_layout', () => ({
  usePassageDEngagement: () => ({ deposer: jest.fn(), reprendre: jest.fn(() => null), aMontrer: jest.fn(() => false) }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

/**
 * La carte est doublée pour une raison précise : le contrat qu'on éprouve est **le câblage**
 * (l'écran fait-il quelque chose du paramètre que la carte lui passe ?), pas le rendu de la
 * carte. La vraie carte irait jusqu'au RPC pour produire un refus, ce qui doublerait la pile
 * entière pour éprouver une ligne. C'est aussi le moment où un test d'écran cesse d'être « la
 * page telle qu'elle est » : ce qu'on monte ici est l'écran **moins** ses cartes.
 */
jest.mock('@/components/plan/carte-de-piste', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    // Ce que l'écran lui passe se lit à l'écran : la piste, et si elle s'ouvre sur le choix.
    CarteDePiste: ({
      action,
      surLeChoix,
      onRefus,
      onAnnuler,
    }: {
      action: { id: string };
      surLeChoix?: boolean;
      onRefus: (message: string | null) => void;
      onAnnuler?: () => void;
    }) => (
      <View>
        <Text>{`carte ${action.id}${surLeChoix ? ', sur le choix' : ''}`}</Text>
        <Pressable onPress={() => onRefus('Ton plan a changé entre-temps.')}>
          <Text>refuser</Text>
        </Pressable>
        <Pressable onPress={onAnnuler}>
          <Text>annuler</Text>
        </Pressable>
      </View>
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
    // carte n'apparaît qu'une fois « Choisir » touché (planche B1 du canvas `v1-30`). Le test doit
    // donc rejouer l'enchaînement de l'écran, et il se couple par là à sa conception d'interaction.
    // Le 29/09/2026, les cartes se sont mises à s'ouvrir autrement — sur la question, une seule à la
    // fois — et ce test-ci n'a pas bougé : toucher la rangée, titre compris, reste le geste.
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
    await waitFor(() => expect(screen.getByText(/la met en tête de ton plan\.$/)).toBeTruthy());
    expect(screen.queryByText(/remplace la tienne/)).toBeNull();
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
    // Une action engagée : en choisir une autre ici la remplace, et la phrase le dit.
    await waitFor(() => expect(screen.getByText(/remplace la tienne\.$/)).toBeTruthy());
    expect(screen.queryByText(/la met en tête de ton plan/)).toBeNull();
  });

  // ── La liste où l'on choisit (`v1-32`, 29/09/2026) ─────────────────────────────────────────

  const deuxPistes = (engageeLaPremiere = false) => ({
    data: [
      {
        id: 'c1',
        plan_actions: [
          piste(engageeLaPremiere ? { committed_at: '2026-09-28T10:00:00Z' } : {}),
          piste({
            id: 'a2',
            rank: 2,
            saving_kg_year: 101,
            action_templates: { action_text: 'Faire une sortie sur trois à vélo', poste: 'leisure' },
          }),
        ],
      },
    ],
    error: null,
  });

  it('ouvre la carte sur le choix quand on touche une rangée', async () => {
    mockLignes.mockResolvedValue(deuxPistes());
    render(<PistesScreen />);
    await waitFor(() => expect(screen.getByLabelText(/^Faire un trajet sur cinq à vélo\./)).toBeTruthy());
    fireEvent.press(screen.getByLabelText(/^Faire un trajet sur cinq à vélo\./));
    await waitFor(() => expect(screen.getByText('carte a1, sur le choix')).toBeTruthy());
  });

  // Décision n° 1 : un seul choix en cours. La première carte redevient sa rangée.
  it('ne garde qu’une carte ouverte à la fois', async () => {
    mockLignes.mockResolvedValue(deuxPistes());
    render(<PistesScreen />);
    await waitFor(() => expect(screen.getByLabelText(/^Faire un trajet sur cinq à vélo\./)).toBeTruthy());
    fireEvent.press(screen.getByLabelText(/^Faire un trajet sur cinq à vélo\./));
    await waitFor(() => expect(screen.getByText(/^carte a1/)).toBeTruthy());

    fireEvent.press(screen.getByLabelText(/^Faire une sortie sur trois à vélo\./));
    await waitFor(() => expect(screen.getByText(/^carte a2/)).toBeTruthy());
    expect(screen.queryByText(/^carte a1/)).toBeNull();
    expect(screen.getByLabelText(/^Faire un trajet sur cinq à vélo\./)).toBeTruthy();
  });

  /**
   * « Annuler » rend la carte à sa rangée, **et le focus avec** (`FRONT.md` §2.4). Le piège du
   * chantier : la rangée est un autre élément, monté à neuf — dans le gestionnaire d'« Annuler »,
   * elle n'existe pas encore, et un focus demandé là ne désigne rien, sans erreur. On lit donc la
   * demande de focus natif, et qu'elle vise quelque chose.
   */
  it('rend la rangée à « Annuler », et lui rend le focus', async () => {
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
    mockLignes.mockResolvedValue(deuxPistes());
    render(<PistesScreen />);
    await waitFor(() => expect(screen.getByLabelText(/^Faire un trajet sur cinq à vélo\./)).toBeTruthy());
    fireEvent.press(screen.getByLabelText(/^Faire un trajet sur cinq à vélo\./));
    await waitFor(() => expect(screen.getByText(/^carte a1/)).toBeTruthy());
    focus.mockClear();

    fireEvent.press(screen.getByText('annuler'));
    await waitFor(() => expect(screen.queryByText(/^carte a1/)).toBeNull());
    expect(screen.getByLabelText(/^Faire un trajet sur cinq à vélo\./)).toBeTruthy();
    expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');
    focus.mockRestore();
  });

  // Décision n° 5 : une action engagée fait dire « Choisir à la place » aux autres — la preuve que
  // l'écran passe l'engagée relue à `etatDeLaPiste`, et pas autre chose. La ligne engagée, elle,
  // n'est pas une cible.
  it('fait dire « Choisir à la place » aux autres lignes quand une est engagée', async () => {
    mockLignes.mockResolvedValue(deuxPistes(true));
    render(<PistesScreen />);
    await waitFor(() => expect(screen.getByLabelText(/Action engagée\.$/)).toBeTruthy());
    expect(screen.getByLabelText(/^Faire une sortie sur trois à vélo\. − 101 kg par an\. Choisir à la place\.$/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Action engagée/ })).toBeNull();
  });

  /**
   * **Le câblage du délai de chargement** (`v1-30` §5.8, seconde contre-lecture du 28/09/2026).
   * `useChargementVisible` a ses tests, pas ses appels : retirer `relance` du « Réessayer » laissait
   * la suite verte, et l'écran d'erreur redevenait muet hors ligne — l'échec revient bien sous les
   * 300 ms du délai. Les deux moitiés se lisent **sans attendre** : ce qui compte est ce qui est là à
   * l'image du geste.
   */
  it('ne dit pas « Chargement… » avant le délai quand personne ne l’a demandé', () => {
    mockLignes.mockReturnValue(new Promise(() => {}));
    render(<PistesScreen />);
    expect(screen.queryByText('Chargement de tes pistes…')).toBeNull();
  });

  it('dit « Chargement… » tout de suite après « Réessayer »', async () => {
    mockLignes.mockResolvedValueOnce({ data: null, error: { message: 'réseau' } });
    render(<PistesScreen />);
    await waitFor(() => expect(screen.getByText('Réessayer')).toBeTruthy());

    mockLignes.mockReturnValue(new Promise(() => {}));
    fireEvent.press(screen.getByText('Réessayer'));
    expect(screen.getByText('Chargement de tes pistes…')).toBeTruthy();
  });
});
