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
import { Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
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
import { decalageDEntree, hauteurSAnime, type Sens } from '@/types/mouvement';

/**
 * Ce qui entre, ce qui s'ouvre et ce qui change de hauteur, écrit une fois (27/09/2026, `v1-30`
 * §5.6 et §5.7). Un réglage recopié d'écran en écran diverge au premier ajustement.
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
 * **« Réduire les animations »** : aucun de ces outils ne démarre sous la préférence — ce qui entre
 * est posé, les hauteurs restent libres. Les animations CSS l'ignoreraient ; `withTiming` la lit
 * (`ReduceMotion.System`, gardé en second filet), mais laissé jouer, `Depliage` ne s'ouvre pas du
 * tout (J12 de `scripts/verifier-etats-export.mjs`). Ne pas jouer est la seule défense qui compte.
 */

/** Sur Android, aucune hauteur ne s'anime : `Depliage` et `HauteurSuivie` posent (`hauteurSAnime`). */
const HAUTEUR_ANIMEE = hauteurSAnime(Platform.OS);

const courbe = Easing.bezier(...Mouvement.courbe);
const courbeCSS = cubicBezier(...Mouvement.courbe);
/** Le réglage d'un `withTiming` : une durée des jetons, la sortie douce, et la préférence lue. */
export const reglage = (duree: number) => ({ duration: duree, easing: courbe, reduceMotion: ReduceMotion.System });

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

/**
 * Vrai si ce qui monte maintenant monte **après** son écran, et non avec lui : un geste l'a fait
 * apparaître, **ou** une donnée arrivée plus tard — le préremplissage d'un re-bilan fait monter une
 * précision après l'écran sans que personne ait touché à rien. Ce n'est donc pas « un geste » : c'est
 * `StepShell` qui distingue, par le compte des réponses données (`v1-31` §2.7, §9 écart 12).
 *
 * **Deux lectures, et elles ne se confondent plus** (29/09/2026, `v1-31` §2.7). « Monte après son
 * écran » décide si un dépli s'annonce au défilement (`suivieALOuverture`) ; « joue » (`useJoue`) y
 * ajoute la préférence et décide si la hauteur s'anime. Elles étaient une seule, `useJoueAuMontage`,
 * donc un dépli sous « réduire les animations » ne savait plus qu'il venait d'un geste : son
 * `onLayout` sortait tout de suite, et l'écran n'aurait pas pu remonter pour le montrer.
 *
 * Décidé une fois, au montage : ni rejoué à un nouveau rendu, ni ajouté à une vue déjà affichée. La
 * référence du contexte se lit ici exprès — c'est son instant. Sans fournisseur, on ne sait pas si
 * l'écran vient de monter : dans le doute, c'est « avec lui », et on pose.
 */
function useApresLeMontage(): boolean {
  const auMontage = useContext(AuMontage);
  const [apres] = useState(() => !(auMontage?.current ?? true));
  return apres;
}

/** Vrai si ce qui monte maintenant doit s'animer : après son écran, et pas sous la préférence. */
function useJoue(): boolean {
  const apres = useApresLeMontage();
  const reduit = useReducedMotion();
  const [joue] = useState(() => apres && !reduit);
  return joue;
}

/**
 * Ce qu'un dépli suivi annonce en s'ouvrant (`Depliage`, `suivieALOuverture`) : **sa place et sa
 * hauteur finale**, pour qu'un écran qui défile puisse le montrer pendant qu'il s'ouvre — la zone
 * du questionnaire remonte quand une précision passerait sous le pied (`v1-31` §4.7). `depli` est la
 * vue qui grandit, mesurée par qui écoute ; `borne`, ce qui ne doit pas passer au-dessus du bord — le
 * choix qui a ouvert le dépli —, quand quelqu'un sur le chemin l'a donnée.
 */
export type Ouverture = { depli: View; hauteur: number; borne?: View };

/** Qui écoute les ouvertures suivies. Sans fournisseur, un dépli suivi n'annonce rien. */
export const SuiviDesOuvertures = createContext<((ouverture: Ouverture) => void) | null>(null);

/** Une vue qui apparaît en fondu (`Mouvement.fondu`) quand elle monte après son écran. */
export function Apparition({ style, ...props }: ComponentProps<typeof Animated.View>) {
  const joue = useJoue();
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
 * changer de taille. Au montage de son écran, sous la préférence et **sur Android**, il est posé
 * (`hauteurSAnime`).
 *
 * `style` s'applique au contenu, à l'intérieur de ce qui se mesure : une marge y compte dans la
 * hauteur dépliée, au lieu d'apparaître d'un coup au-dessus.
 *
 * **`suivieALOuverture`** (29/09/2026, `v1-31` §2.2) : au premier `onLayout` d'une ouverture qui
 * monte après son écran, le dépli annonce sa place et sa hauteur finale à qui écoute
 * (`SuiviDesOuvertures`) — **même sous la préférence**, où il ne s'anime pas mais doit encore être
 * montré. Un dépli sans elle n'annonce rien : « Voir les autres modes » en ouvre un, et son premier
 * mode révélé est à la place du lien, donc déjà en vue.
 */
export function Depliage({
  style,
  children,
  suivieALOuverture = false,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  suivieALOuverture?: boolean;
}) {
  const apres = useApresLeMontage();
  const joue = useJoue() && HAUTEUR_ANIMEE;
  const annoncer = useContext(SuiviDesOuvertures);
  // −1 : hauteur libre. Au départ d'une ouverture, 0.
  const hauteur = useSharedValue(joue ? 0 : -1);
  const opacite = useSharedValue(joue ? 0 : 1);
  const lancee = useRef(false);
  const annoncee = useRef(false);
  const mesure = useRef<View>(null);

  const mesurer = (evenement: LayoutChangeEvent) => {
    const cible = evenement.nativeEvent.layout.height;
    if (suivieALOuverture && apres && !annoncee.current && mesure.current !== null) {
      annoncee.current = true;
      // Ce qui se montre est le contenu, pas la marge qui le sépare de ce qui suit : une boîte doit
      // finir 16 au-dessus du pied, et sa marge basse est dans le dépli pour s'ouvrir avec lui.
      const margeBasse = StyleSheet.flatten(style)?.marginBottom;
      annoncer?.({ depli: mesure.current, hauteur: cible - (typeof margeBasse === 'number' ? margeBasse : 0) });
    }
    if (!joue || lancee.current) return;
    lancee.current = true;
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
      <View ref={mesure} onLayout={mesurer}>
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
 * piste qui passe de ligne à carte : il va de l'ancienne hauteur à la nouvelle au lieu de sauter —
 * `Mouvement.entree` s'il grandit, `Mouvement.sortie` s'il rétrécit —, et ce qui est dessous suit.
 * Sa hauteur reste tenue entre deux changements — c'est ce qui évite une image à la nouvelle hauteur
 * avant le départ de l'animation. Sous la préférence et sur Android (`hauteurSAnime`), elle est libre
 * et tout se pose.
 *
 * **Son contenu ne vaut jamais zéro pour de vrai** : une hauteur nulle est ignorée, parce que c'est
 * celle d'un écran que la pile web masque (`display: none`). Un contenu qui peut devenir vide ne va
 * donc pas là-dedans — sa hauteur d'avant resterait tenue, un blanc à sa place.
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
    if (reduit || !HAUTEUR_ANIMEE) return;
    const nouvelle = evenement.nativeEvent.layout.height;
    // **Une hauteur nulle n'est pas un contenu vide, c'est un écran masqué.** Sur web, la pile
    // d'expo-router pose `display: none` sur l'écran recouvert, et `onLayout` y rend zéro : la
    // hauteur tenue partait vers zéro, et le retour sur le plan faisait regrandir la carte du point
    // sous les yeux, tout le plan glissant dessous (contre-lecture du 27/09/2026). Aucun contenu
    // tenu ici ne vaut zéro pour de vrai.
    if (nouvelle === 0) return;
    const avant = connue.current;
    connue.current = nouvelle;
    if (avant === null || avant === nouvelle) {
      hauteur.set(nouvelle);
      return;
    }
    // Ce qui rétrécit s'efface plus vite que ce qui grandit ne s'installe (règle 1 du skill).
    hauteur.set(withTiming(nouvelle, reglage(nouvelle < avant ? Mouvement.sortie : Mouvement.entree)));
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
