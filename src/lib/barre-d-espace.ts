import { Platform } from 'react-native';

/**
 * La barre d'espace coche une case d'option et bascule une case à cocher, sur web aussi
 * (25/09/2026, contre-lecture de `v1-29`).
 *
 * **Le défaut est dans react-native-web, et c'est la livraison du 24/09/2026 qui l'a rendu
 * visible.** Son `PressResponder` (0.21, `modules/usePressEvents/PressResponder.js`,
 * `isValidKeyPress`) accepte Entrée sur tout ce qui s'appuie, mais Espace **seulement** sur un
 * `<button>` ou un `role="button"`. Tant que les puces s'annonçaient en boutons, Espace les
 * activait ; depuis qu'elles sont des `radio` et des `checkbox` — ce qu'elles sont —, Espace n'y
 * coche plus rien : il fait défiler la page, et seule Entrée marche. WAI-ARIA attend l'inverse :
 * Espace coche une case d'option et bascule une case à cocher, et c'est le geste qu'une personne
 * qui navigue au clavier essaie en premier.
 *
 * **La porte : `Pressable` appelle aussi le `onKeyDown` qu'on lui passe**, après le sien
 * (`exports/Pressable/index.js`). On y rend à Espace ce que la bibliothèque lui refuse, et à Espace
 * seulement :
 * - `preventDefault()` d'abord, sans quoi la page défile sous le choix qu'on vient de cocher ;
 * - l'action ensuite, **une fois par appui** : une touche maintenue répète `keydown`, et une case à
 *   cocher basculerait à chaque répétition — la répétition retient donc la page, sans rien activer ;
 * - **jamais Entrée** : la bibliothèque l'active déjà, sur tout rôle, et la prendre aussi ici
 *   activerait deux fois — une case à cocher reviendrait exactement où elle était ;
 * - rien sur un contrôle désactivé, comme la bibliothèque pour ses boutons ; et rien sur une
 *   touche venue d'un descendant focalisé, qui n'est pas un appui sur ce choix.
 *
 * **Un seul endroit pour tous les choix** : `Chip`, `ChoiceRow`, `ModeListItem` et `LigneDeCanal`
 * décomposent ce que rend cette fonction (`{...activableALaBarreDEspace(onPress)}`) — les props se
 * décomposent plutôt qu'elles ne se passent une à une, parce que `Pressable` ne déclare pas
 * `onKeyDown` dans ses types ; c'est le recours de `FOCALISABLE_PAR_PROGRAMME` (`src/lib/focus.ts`).
 * Un choix qui s'ajouterait sans elle retrouverait le défaut, et deux gardes le verraient :
 * `verifier-etats-export.mjs` (section F) et le parcours réel.
 *
 * **Sur natif, les props sont vides.** Le défaut est celui de react-native-web ; ce qu'un clavier
 * physique fait d'une puce sous Android relève de la recette sur appareil, pas de ce correctif.
 */
export function activableALaBarreDEspace(action: () => void, desactive = false): Record<string, unknown> {
  if (Platform.OS !== 'web') return {};
  return {
    onKeyDown: (touche: ToucheDuNavigateur) => {
      const effet = effetDeLaTouche(touche, desactive);
      if (effet === 'rien') return;
      touche.preventDefault();
      if (effet === 'activer') action();
    },
  };
}

/** La part d'un `KeyboardEvent` du navigateur dont la décision a besoin. */
type ToucheDuNavigateur = {
  key: string;
  repeat?: boolean;
  target: unknown;
  currentTarget: unknown;
  preventDefault: () => void;
};

function effetDeLaTouche(touche: ToucheDuNavigateur, desactive: boolean): 'rien' | 'retenir' | 'activer' {
  if (desactive) return 'rien';
  // `Spacebar` est le nom que donnaient à la touche les navigateurs d'avant 2017 ; react-native-web
  // le reconnaît pour ses boutons, et le reconnaître ici garde les deux listes d'accord.
  if (touche.key !== ' ' && touche.key !== 'Spacebar') return 'rien';
  if (touche.target !== touche.currentTarget) return 'rien';
  return touche.repeat ? 'retenir' : 'activer';
}
