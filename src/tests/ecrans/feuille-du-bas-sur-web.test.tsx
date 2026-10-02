/**
 * @jest-environment jsdom
 */
/**
 * La feuille du bas **sur web** : rendue par react-native-web dans jsdom, et non par le rendu natif
 * du reste de la suite (01/10/2026, CI de la PR #314).
 *
 * **Le `Modal` de react-native-web pose le focus à l'ouverture, et c'est lui qui le mettait sur
 * « Commencer ».** Son piège (`ModalFocusTrap`), dès qu'il devient actif — juste après le montage,
 * la feuille n'ayant pas d'`animationType` —, appelle `.focus()` sur chaque descendant **dans l'ordre
 * du DOM** et garde le premier qui le prend. Le voile précède la feuille : tant qu'il n'était qu'une
 * vue, le premier focalisable était le premier contrôle de la feuille. Devenu un `Pressable` pour
 * fermer au toucher (audit T-7), il a pris un `tabindex="0"` — le `Pressable` de react-native-web en
 * écrit toujours un, et l'attribut passe devant `focusable={false}` —, donc le focus est allé au
 * voile, `aria-hidden`, au lieu de « Commencer » ; et le voile est devenu un arrêt de tabulation.
 * `tabIndex={-1}` n'y suffit pas : il retire l'arrêt, mais `.focus()` prend encore, et le piège aussi.
 * Le voile reçoit donc le toucher par le système de répondeurs, sans aucun `tabindex`.
 *
 * **Le critère de `TESTING.md` §2.10** : sous le rendu natif, `tabIndex` n'est pas un attribut et aucun
 * piège ne déplace le focus — `feuille-du-bas.test.tsx` reste vert sous les deux premières mutations
 * ci-dessous ; le parcours réel ne voit que la feuille du re-bilan. Ce fichier tient le cadre, donc les
 * deux feuilles, et le clic que react-native-web livre au voile. **Pas ce qui est sous le doigt** :
 * jsdom ne met rien en page, donc ni `elementFromPoint` ni `pointer-events` — c'est l'étape « un
 * toucher sur le voile » du parcours réel qui le demande au navigateur.
 *
 * **Le doublage** : `react-native` est react-native-web pour ce seul fichier ; reanimated et
 * `react-native-worklets`, que leur double officiel ne laisse pas charger sur react-native-web, sont
 * réduits à ce que la feuille appelle — une animation y est posée tout de suite, et sa fin part
 * aussitôt —, et `@/lib/mouvement` à son `reglage`.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (`TESTING.md` §1.1), les deux fichiers de la feuille joués
 * ensemble :
 *   - le voile redevenu un `Pressable` (l'état de `7032f1c`) → « à l'ouverture, le focus va à
 *     « Commencer »… » et « le voile n'est pas focalisable… », seuls ; le clic ferme toujours ;
 *   - le même `Pressable` avec `tabIndex={-1}` → les deux mêmes, seuls : le focus reste au voile ;
 *   - `onResponderRelease` retiré du voile → « cliquer le voile ferme la feuille… », et son pendant
 *     natif, « toucher le voile ferme la feuille… » ;
 *   - `onStartShouldSetResponder` retiré → les deux mêmes.
 */
import { act, type ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

import { FeuilleNouveauBilan } from '@/components/bilan/feuille-nouveau-bilan';
import { FeuilleDuBas } from '@/components/feuille-du-bas';

// `react-dom` n'a pas ses types dans le dépôt — aucun écran ne l'importe : la racine se type ici.
type Root = { render: (contenu: ReactNode) => void; unmount: () => void };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRoot } = require('react-dom/client') as { createRoot: (hote: Element) => Root };

jest.mock('react-native', () => jest.requireActual('react-native-web'));
jest.mock('react-native-worklets', () => ({ scheduleOnRN: (rappel: () => void) => rappel() }));
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native-web');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    useSharedValue: (value: number) => ({ value, set: () => {} }),
    withTiming: (valeur: number, _reglage: unknown, fin?: (fini: boolean) => void) => {
      fin?.(true);
      return valeur;
    },
  };
});
// Ses outils appellent reanimated au chargement (`Easing.bezier`) ; la feuille n'en lit que `reglage`.
jest.mock('@/lib/mouvement', () => ({ reglage: (duree: number) => ({ duration: duree }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Le `fetch` d'Expo est un global paresseux, relu sous jsdom après la fin des tests : il chargeait
// alors son module natif, absent, et l'avertissement tombait hors de tout test (« Cannot log after
// tests are done », dans la suite entière seulement). La feuille n'appelle pas le réseau.
Object.defineProperty(globalThis, 'fetch', { value: undefined, configurable: true, writable: true });

let racine: Root | null = null;

async function monter(contenu: ReactNode) {
  const hote = document.createElement('div');
  document.body.appendChild(hote);
  racine = createRoot(hote);
  await act(async () => racine?.render(contenu));
}

afterEach(async () => {
  await act(async () => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
});

const leVoile = () => {
  const voile = document.querySelector<HTMLElement>('[data-testid="voile-de-la-feuille"]');
  if (voile === null) throw new Error('le voile de la feuille est introuvable');
  return voile;
};

describe('FeuilleDuBas, sur web', () => {
  test('à l’ouverture, le focus va à « Commencer », le premier contrôle de la feuille — jamais au voile', async () => {
    await monter(
      <FeuilleNouveauBilan
        engagement={{ action: 'Aller au travail à vélo un jour par semaine.', intention: 'le mardi' }}
        onCommencer={() => {}}
        onQuitter={() => {}}
      />
    );
    const actif = document.activeElement;
    expect(actif?.closest('[aria-modal="true"]')?.getAttribute('aria-label')).toBe('Ton plan va être recalculé');
    expect(actif?.getAttribute('aria-label')).toBe('Commencer');
  });

  test('le voile n’est pas focalisable : ni arrêt de tabulation, ni cible de `.focus()`', async () => {
    await monter(
      <FeuilleDuBas titre="Les rappels" enTete={false} onFerme={() => {}}>
        <Pressable role="button" aria-label="Valider" onPress={() => {}}>
          <Text>Valider</Text>
        </Pressable>
      </FeuilleDuBas>
    );
    const voile = leVoile();
    expect(voile.hasAttribute('tabindex')).toBe(false);
    act(() => voile.focus());
    expect(document.activeElement).not.toBe(voile);
  });

  test('cliquer le voile ferme la feuille, sur web aussi : même sortie, même `onFerme`', async () => {
    const onFerme = jest.fn();
    await monter(
      <FeuilleDuBas titre="Les rappels" enTete={false} onFerme={onFerme}>
        <Text>contenu</Text>
      </FeuilleDuBas>
    );
    const voile = leVoile();
    await act(async () => {
      voile.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, buttons: 1 }));
      voile.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
      voile.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });
    expect(onFerme).toHaveBeenCalledTimes(1);
  });
});
