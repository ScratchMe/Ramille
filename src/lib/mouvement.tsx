import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  css,
  cubicBezier,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Mouvement } from '@/constants/theme';
import { decalageDEntree, type Sens } from '@/types/mouvement';

/**
 * Ce qui entre, ce qui s'ouvre et ce qui change de hauteur, écrit une fois (27/09/2026, `v1-30`
 * §5.6 et §5.7). Un réglage recopié dans huit écrans diverge au premier ajustement.
 *
 * **Deux outils de reanimated ont été essayés et écartés, mesures à l'appui** :
 *
 * - **`entering`** masque l'élément sur web (`visibility: hidden`) jusqu'au démarrage de son
 *   animation, une image au moins plus tard. Un élément masqué ne reçoit pas le focus : « Voir les
 *   autres modes », qui le donne au premier mode révélé, le laissait retomber sur le document
 *   (section H de `scripts/verifier-etats-export.mjs`). Ce qui entre passe donc par une animation
 *   CSS de reanimated, qui joue dès la première image sans rien masquer ;
 * - **`layout={LinearTransition}`** ne fait pas glisser un bloc qui change de taille, sur web : il
 *   l'**étire** par une échelle (`Linear.web.ts`), contenu compris — la liste des modes était
 *   écrasée deux images quand une précision s'y ouvrait. Ce qui est dessous suit donc la vraie mise
 *   en page : ce qui s'ouvre grandit (`Depliage`), ce qui change de contenu passe d'une hauteur à
 *   l'autre (`HauteurSuivie`), et le reste de l'écran se déplace de lui-même, à chaque image.
 *
 * **« Réduire les animations »** : `withTiming` la suit (`ReduceMotion.System`), les animations CSS
 * non — elles ne sont pas posées sous la préférence, et les hauteurs y restent libres.
 */

const courbe = Easing.bezier(...Mouvement.courbe);
const courbeCSS = cubicBezier(...Mouvement.courbe);
const reglage = (duree: number) => ({ duration: duree, easing: courbe, reduceMotion: ReduceMotion.System });

const FONDU = css.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

/** Le contenu d'une étape arrive du côté du parcours — le côté vient de `decalageDEntree`, testé. */
const entreeDepuis = (sens: Sens) =>
  css.keyframes({
    from: { opacity: 0, transform: [{ translateX: decalageDEntree(sens, Mouvement.deplacement) }] },
    to: { opacity: 1, transform: [{ translateX: 0 }] },
  });
const ENTREES: Record<Sens, ReturnType<typeof css.keyframes>> = {
  avant: entreeDepuis('avant'),
  arriere: entreeDepuis('arriere'),
};

/**
 * Le style d'une étape qui entre, ou rien : sans sens (le montage, la reprise d'un brouillon) ou sous
 * la préférence, elle est posée. À poser sur une vue qui prend l'étape pour clé, pour que chaque
 * étape reparte de son début.
 */
export function styleDEntree(sens: Sens | null, reduit: boolean) {
  if (sens === null || reduit) return undefined;
  return { animationName: ENTREES[sens], animationDuration: Mouvement.entree, animationTimingFunction: courbeCSS };
}

/**
 * « Cet écran vient de monter » : ce qui est déjà là à l'arrivée ne s'ouvre pas sous les yeux — une
 * précision ouverte par un brouillon entre avec son étape, un point déjà répondu est simplement là.
 * Seul ce qui monte ensuite s'anime.
 */
const AuMontage = createContext<RefObject<boolean> | null>(null);

export function SansApparitionAuMontage({ children }: { children: ReactNode }) {
  const auMontage = useRef(true);
  useEffect(() => {
    auMontage.current = false;
  }, []);
  return <AuMontage value={auMontage}>{children}</AuMontage>;
}

/** Vrai si ce qui monte maintenant doit s'animer : pas au montage de son écran, pas sous la préférence. */
function useJoueAuMontage(): boolean {
  const auMontage = useContext(AuMontage);
  const reduit = useReducedMotion();
  // Décidé une fois, au montage : l'animation ne doit ni rejouer à un nouveau rendu, ni s'ajouter à
  // une vue déjà affichée. La référence du contexte se lit ici exprès — c'est son instant.
  const [joue] = useState(() => !reduit && !(auMontage?.current ?? false));
  return joue;
}

/** Une vue qui apparaît en fondu (`Mouvement.fondu`) quand elle monte après son écran. */
export function Apparition({ style, ...props }: ComponentProps<typeof Animated.View>) {
  const joue = useJoueAuMontage();
  return (
    <Animated.View
      style={[style, joue && { animationName: FONDU, animationDuration: Mouvement.fondu, animationTimingFunction: courbeCSS }]}
      {...props}
    />
  );
}

/**
 * Ce qui s'ouvre sous un choix — une précision, un bloc révélé : sa hauteur part de zéro et le
 * rejoint (`Mouvement.entree`) pendant qu'il apparaît (`Mouvement.fondu`), donc ce qui est dessous
 * descend avec lui au lieu de sauter. Une fois ouvert, il redevient une vue ordinaire, libre de
 * changer de taille. Au montage de son écran et sous la préférence, il est posé.
 *
 * `style` s'applique au contenu, à l'intérieur de ce qui se mesure : une marge y compte dans la
 * hauteur dépliée, au lieu d'apparaître d'un coup au-dessus.
 */
export function Depliage({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const joue = useJoueAuMontage();
  // −1 : hauteur libre. Au départ d'une ouverture, 0.
  const hauteur = useSharedValue(joue ? 0 : -1);
  const opacite = useSharedValue(joue ? 0 : 1);
  const lancee = useRef(false);

  const mesurer = (evenement: LayoutChangeEvent) => {
    if (!joue || lancee.current) return;
    lancee.current = true;
    const cible = evenement.nativeEvent.layout.height;
    opacite.set(withTiming(1, reglage(Mouvement.fondu)));
    hauteur.set(
      withTiming(cible, reglage(Mouvement.entree), () => {
        hauteur.value = -1;
      })
    );
  };

  const styleAnime = useAnimatedStyle(() =>
    hauteur.value < 0 ? { opacity: opacite.value } : { height: hauteur.value, overflow: 'hidden', opacity: opacite.value }
  );

  return (
    <Animated.View style={styleAnime}>
      <View onLayout={mesurer}>
        <View style={style}>{children}</View>
      </View>
    </Animated.View>
  );
}

/**
 * Ce que la découpe d'une `HauteurSuivie` laisse autour de son contenu. Le navigateur dessine l'anneau
 * de focus **hors** de l'élément (`outline: auto 1px`, mesuré sur l'export le 27/09/2026) : découpé
 * au ras, il disparaissait — entièrement sur une ligne de piste, qui remplit son cadre, donc une
 * piste focalisée au clavier ne se voyait plus. Quatre pixels de part et d'autre, rendus à la mise en
 * page par une marge négative, pour que rien d'autre ne bouge.
 */
const MARGE_DE_DECOUPE = 4;

/**
 * Un bloc dont le contenu change de hauteur — la réplique qui remplace la question d'un point, une
 * piste qui passe de ligne à carte : il va de l'ancienne hauteur à la nouvelle (`Mouvement.entree`)
 * au lieu de sauter, et ce qui est dessous suit. Sa hauteur reste tenue entre deux changements —
 * c'est ce qui évite une image à la nouvelle hauteur avant le départ de l'animation. Sous la
 * préférence, elle est libre et tout se pose.
 *
 * `styleDuContenu` s'applique à ce qui se mesure : un `gap` que le parent donnait à ses enfants doit
 * y être repris, puisqu'ils sont désormais les enfants de ce bloc. Il n'y a pas de `style` pour le
 * cadre lui-même : une marge qu'on y poserait écraserait celle qui rend la découpe.
 */
export function HauteurSuivie({
  styleDuContenu,
  children,
}: {
  styleDuContenu?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const reduit = useReducedMotion();
  const hauteur = useSharedValue(-1);
  const connue = useRef<number | null>(null);

  const mesurer = (evenement: LayoutChangeEvent) => {
    if (reduit) return;
    const nouvelle = evenement.nativeEvent.layout.height;
    const avant = connue.current;
    connue.current = nouvelle;
    if (avant === null || avant === nouvelle) {
      hauteur.set(nouvelle);
      return;
    }
    hauteur.set(withTiming(nouvelle, reglage(Mouvement.entree)));
  };

  // La hauteur tenue compte la découpe des deux côtés : la mesure est celle du contenu.
  const styleAnime = useAnimatedStyle(() =>
    hauteur.value < 0 ? {} : { height: hauteur.value + 2 * MARGE_DE_DECOUPE, overflow: 'hidden' }
  );

  return (
    <Animated.View style={[styles.decoupe, styleAnime]}>
      <View onLayout={mesurer} style={styleDuContenu}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // La marge négative rend à la mise en page ce que le rembourrage prend ; et la bande qu'elle ajoute
  // ne capte aucun toucher (`box-none`), sans quoi elle mordrait de quatre pixels sur la piste voisine.
  decoupe: { margin: -MARGE_DE_DECOUPE, padding: MARGE_DE_DECOUPE, pointerEvents: 'box-none' },
});
