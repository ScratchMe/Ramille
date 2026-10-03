import type { Colors } from '@/constants/theme';

type Jeton = keyof (typeof Colors)['light'];

/** Ce que la surface d'un bouton prend du thème : son fond, au repos et sous le doigt, son encre, et
 *  s'il porte un filet. */
export type SurfaceDuBouton = {
  fond: Jeton;
  fondAppuye: Jeton;
  encre: Jeton;
  filet: boolean;
};

/**
 * **La surface d'un `Button`** (sortie du composant le 03/10/2026, `FRONT.md` §1.1) : quatre entrées,
 * et deux règles qui s'y croisent.
 *
 * - **Grisé** — `disabled`, ou `enAttente` (`v1-31`) — : l'apparence du désactivé, fond
 *   `backgroundElement` et encre `textTertiary`, quel que soit le variant.
 * - **Posé sur un panneau** (`onPanel`, `v1-29`) : un secondaire prend le fond de l'écran et un filet,
 *   au lieu du gris des panneaux. **Un bouton grisé aussi, depuis le 03/10/2026** (canvas de l'étape du
 *   contexte, brief §4.5) : « C'est noté » en attente prenait le gris de l'encart du choix des jours où
 *   il est posé, et il ne restait qu'un libellé gris sans bord. Le principal actif, lui, ne change pas :
 *   son accent se voit partout.
 *
 * Sous le doigt, la teinte appuyée de l'accent pour un principal actif, celle d'une surface neutre pour
 * tout le reste — un bouton en attente ne vire pas au vert foncé (`v1-31` §2.8).
 */
export function surfaceDuBouton({
  variant,
  grise,
  enAttente,
  surPanneau,
}: {
  variant: 'primary' | 'secondary';
  /** `disabled` ou `enAttente`. */
  grise: boolean;
  enAttente: boolean;
  surPanneau: boolean;
}): SurfaceDuBouton {
  const fondAppuye: Jeton = variant === 'primary' && !enAttente ? 'accentPressed' : 'backgroundPressed';
  if (grise) {
    return surPanneau
      ? { fond: 'background', fondAppuye, encre: 'textTertiary', filet: true }
      : { fond: 'backgroundElement', fondAppuye, encre: 'textTertiary', filet: false };
  }
  if (variant === 'primary') return { fond: 'accent', fondAppuye, encre: 'onAccent', filet: false };
  return surPanneau
    ? { fond: 'background', fondAppuye, encre: 'text', filet: true }
    : { fond: 'backgroundElement', fondAppuye, encre: 'text', filet: false };
}
