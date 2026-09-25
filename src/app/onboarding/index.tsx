import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  BackHandler,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { EtapeAccroche } from '@/components/onboarding/etape-accroche';
import { EtapeContexte } from '@/components/onboarding/etape-contexte';
import { EtapeReassurance } from '@/components/onboarding/etape-reassurance';
import { EtapeTransition } from '@/components/onboarding/etape-transition';
import { ThemedView } from '@/components/themed-view';
import { track } from '@/lib/analytics';
import { donnerLeFocus, FOCALISABLE_PAR_PROGRAMME } from '@/lib/focus';

// Onboarding — les quatre étapes dans un seul écran qui se balaie au doigt (issue #68).
//
// **Les puces de progression promettaient déjà le geste.** Elles étaient là depuis le
// handoff design, sur quatre écrans qu'on ne pouvait franchir qu'au bouton, et sans aucun
// moyen de revenir en arrière : une affordance qui annonce un balayage et ne le fournit pas.
// Retour d'appareil du 07/09/2026, dans ces mots — « j'avais envie de swiper les écrans ».
//
// Les puces suivent le doigt sans rien de plus à écrire : chaque étape porte les siennes et
// défile avec la page, donc elles glissent à la vitesse du geste au lieu de sauter à
// l'arrivée. Le bouton reste sur chaque étape — le geste ne doit pas devenir le seul chemin.
//
// **Le piège était dans la mesure, pas dans le geste.** `onboarding_step_view` partait de
// `useTrackView`, c'est-à-dire une fois par montage d'écran ; quatre routes, quatre montages,
// l'entonnoir se tenait tout seul. Un pager monte les quatre pages d'un coup : le hook aurait
// émis les quatre événements dès l'ouverture, et l'entonnoir aurait affiché 100 % de
// franchissement à chaque étape — un chiffre plausible, faux, et invisible avant des semaines.
// L'émission suit donc la page **réellement affichée**, et une étape déjà vue ne réémet pas :
// on compte les personnes qui ont atteint l'étape, pas leurs allers-retours au doigt.
const ETAPES = ['accroche', 'contexte', 'reassurance', 'transition'] as const;

// **La largeur de page vaut 0 sur le serveur et la vraie valeur sur le client, et il faut que
// React voie ce passage.** C'est tout le sujet de la première tentative, abandonnée après
// sept mesures (issue #68, commentaire du 07/09/2026), et la cause est l'hydratation.
//
// L'export statique rend les pages à 0 px (pas de fenêtre à la génération). Dans le
// navigateur, `Dimensions.get('window')` vaut 390 dès le premier rendu — donc
// `useWindowDimensions()` ou un `useState(() => Dimensions…)` démarrent à 390. Or
// l'hydratation ne vérifie que le **texte** : elle adopte les attributs `style` du HTML tels
// quels, et comme React croit déjà tenir `width: 390`, il ne corrige jamais le `width: 0px`
// écrit par le serveur. Les pages restaient à 0 tant qu'un vrai changement d'état ne
// survenait pas — un redimensionnement, ou un texte affichant `width` qui, lui, mettait
// l'hydratation en échec et forçait React à tout reconstruire.
//
// `useSyncExternalStore` est fait pour ça : pendant l'hydratation, React lit l'instantané
// serveur (0, identique au HTML), puis relit l'instantané client (390), voit la différence et
// rerend — un passage 0 → 390 que le DOM reçoit pour de bon. Sur natif il n'y a pas
// d'hydratation : l'instantané client est lu directement, la largeur est juste dès le premier
// rendu.
function sAbonnerAuxDimensions(rappel: () => void) {
  const abonnement = Dimensions.addEventListener('change', rappel);
  return () => abonnement.remove();
}
const largeurCliente = () => Dimensions.get('window').width;
const largeurServeur = () => 0;

export default function Onboarding() {
  const width = useSyncExternalStore(sAbonnerAuxDimensions, largeurCliente, largeurServeur);
  const defilement = useRef<ScrollView>(null);
  // **La hauteur aussi doit être un nombre, pas un étirement.** Les enveloppes de page
  // s'étirent bien à la hauteur du défileur, mais l'écran d'étape qu'elles contiennent porte
  // `flex: 1`, et une hauteur obtenue par étirement n'est pas « définie » au sens du moteur de
  // rendu : le `flex: 1` ne se résolvait sur rien, chaque étape prenait la hauteur de son
  // contenu — bandeau blanc sous la page teintée, 24 px de débordement sur les deux
  // premières. Mesurée au `onLayout` du défileur, qui lui remplit vraiment l'écran. L'état
  // part de 0 des deux côtés, serveur et client, donc l'hydratation n'a rien à adopter de
  // travers ; tant qu'il vaut 0, l'enveloppe s'étire comme avant.
  const [hauteur, setHauteur] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const vues = useRef(new Set<string>());

  useEffect(() => {
    indexRef.current = index;
    const etape = ETAPES[index];
    if (!etape || vues.current.has(etape)) return;
    vues.current.add(etape);
    track('onboarding_step_view', { step: etape });
  }, [index]);

  // **Le focus suit la page, sinon il se perd** (24/09/2026, `v1-29`). « Continuer » rend inerte
  // la page qui le porte (voir `propsDePage` plus bas) : le bouton qui avait le focus sort de
  // l'arbre accessible, et le focus retombait sur le document — relevé sur l'export, `<body>`
  // après « Découvrir mon impact » pressé au clavier. Au lecteur d'écran, la page qui arrive
  // n'était pas annoncée ; au clavier, la tabulation repartait du haut. Le focus va donc au
  // **titre** de la page qui arrive — le mécanisme de `StepShell` dans le questionnaire, posé ici
  // sur le titre lui-même plutôt que sur un conteneur, pour que l'annonce soit celle d'un en-tête.
  //
  // Toute arrivée compte, pas seulement le bouton : le balayage et le retour matériel changent la
  // page de la même façon, et l'inertie qui retire le focus aussi. **Pas au montage**, où
  // personne n'a encore agi — et la garde compare l'index à celui du dernier passage plutôt que
  // de compter les passages : un effet de montage peut être rejoué sans que rien n'ait bougé (le
  // Fast Refresh du développement le fait), et un drapeau « premier passage » laisserait alors
  // partir un focus que personne n'a demandé.
  const titreAccroche = useRef<unknown>(null);
  const titreContexte = useRef<unknown>(null);
  const titreReassurance = useRef<unknown>(null);
  const titreTransition = useRef<unknown>(null);
  const pageDuFocus = useRef(index);

  useEffect(() => {
    if (pageDuFocus.current === index) return;
    pageDuFocus.current = index;
    donnerLeFocus([titreAccroche, titreContexte, titreReassurance, titreTransition][index]?.current);
  }, [index]);

  // **Le défilement suit « réduire les animations »** (24/09/2026, `v1-29`). `scrollTo` animé ne la
  // consulte pas sur web : le navigateur ne l'applique qu'au CSS, et `react-native-web` traduit
  // l'animation en `behavior: 'smooth'`. Mesuré sur l'export avec la préférence active : la page
  // glissait quand même, relevée en chemin à 8, 52, 102, 199 puis 295 px sur 390. La préférence
  // est celle que lisent déjà la mascotte et l'écran de lancement (`useReducedMotion`, lue au
  // démarrage de l'app) ; sous elle, la page change d'un coup. Le balayage, lui, n'est pas touché :
  // c'est le doigt de la personne qui fait le mouvement.
  const animationsReduites = useReducedMotion();

  // **Un défilement programmé ne dit rien de la page tant qu'il est en vol** (25/09/2026). L'état
  // n'attend pas la fin de l'animation — le bouton doit se sentir aussi immédiat que le doigt —, et
  // ce fichier supposait que `onScroll` confirmerait la même valeur en chemin. C'est l'inverse qui
  // arrivait : le premier événement du défilement animé part à 2 px de la page qu'on quitte, que
  // l'arrondi de `surDefilement` redésignait. Relevé sur l'export, « Découvrir mon impact » pressé :
  // le focus allait au titre de la page 1, **revenait** au titre de la page 0 dès ce premier
  // événement, puis repartait sur la page 1 passé la moitié — et l'inertie des deux pages basculait
  // trois fois en 200 ms, la page qui arrive redevenant inerte le temps d'un demi-défilement. Au
  // lecteur d'écran, c'est le titre qu'on vient de quitter annoncé une seconde fois.
  //
  // Le vol est donc tenu ici : pendant qu'il dure, `surDefilement` ignore les positions qui se
  // rapprochent de la cible. Il se termine de deux façons, et les deux se lisent dans `onScroll`,
  // seul signal commun aux deux plateformes — sur web, `onMomentumScrollEnd` ne part jamais, et
  // `react-native-web` émet toujours un dernier `onScroll` à l'arrêt, 100 ms après le dernier
  // défilement :
  //   - **l'arrivée** : la position est sur la page visée (à un pixel près, l'arrondi d'un écran
  //     dont la densité n'est pas entière) ;
  //   - **la reprise en main** : la position s'éloigne de la cible — un doigt ou une molette qui
  //     repart pendant l'animation. L'index suit alors le geste, comme sans vol.
  // Pas de minuterie : une animation qui avance ne s'éloigne jamais de sa cible, et un défilement
  // aimanté (`pagingEnabled`) finit toujours sur une page, donc le vol se termine toujours par
  // l'une des deux. Sans animation (« réduire les animations »), le saut n'émet qu'une position,
  // déjà sur la cible : aucun vol à tenir.
  const enVol = useRef<{ cible: number; auPlusPres: number } | null>(null);

  const allerA = (cible: number) => {
    const borne = Math.max(0, Math.min(ETAPES.length - 1, cible));
    enVol.current = animationsReduites ? null : { cible: borne, auPlusPres: Infinity };
    defilement.current?.scrollTo({ x: borne * width, animated: !animationsReduites });
    setIndex(borne);
  };

  // Quatre routes empilées donnaient le retour matériel pour rien : une page en arrière.
  // Un seul écran doit le rendre lui-même, sinon le retour quitte l'onboarding depuis
  // n'importe quelle étape — et l'app, au premier lancement, puisque la pile est vide.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      if (indexRef.current === 0) return false;
      allerA(indexRef.current - 1);
      return true;
    });
    return () => abonnement.remove();
    // `allerA` ne dépend que de `width`, et `indexRef` porte l'index courant : l'abonnement
    // n'a pas besoin de suivre l'état.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  // `onScroll` et non `onMomentumScrollEnd` : ce dernier n'existe pas sur web, où le geste
  // s'appuie sur le scroll-snap du navigateur. On arrondit à la page la plus proche ; React
  // ignore une valeur identique, donc pas de rendu superflu pendant le geste — **sauf pendant un
  // défilement programmé**, que `enVol` tient jusqu'à son arrivée (voir plus haut).
  const surMesure = (evenement: LayoutChangeEvent) => {
    setHauteur(Math.round(evenement.nativeEvent.layout.height));
  };

  const surDefilement = (evenement: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const x = evenement.nativeEvent.contentOffset.x;
    const vol = enVol.current;
    if (vol !== null) {
      const distance = Math.abs(x - vol.cible * width);
      if (distance > 1 && distance <= vol.auPlusPres + 1) {
        // En chemin vers la page visée : l'index y est déjà, et cette position n'en dit rien.
        vol.auPlusPres = Math.min(vol.auPlusPres, distance);
        return;
      }
      // Arrivé, ou repris en main : le vol se termine, et l'index suit de nouveau la position.
      enVol.current = null;
    }
    setIndex(Math.round(x / width));
  };

  const page = { width, height: hauteur > 0 ? hauteur : undefined };

  // **Les quatre pages sont montées en permanence, et un lecteur d'écran les lisait d'un
  // bloc** (A1-7) : quatre titres annoncés comme en-têtes, quatre corps de texte, trois
  // « Continuer » identiques, et sur web une tabulation qui atteignait le lien « J'ai déjà un
  // compte » d'une page invisible — lien qui sort de l'onboarding. Une page hors champ est donc
  // retirée de l'arbre d'accessibilité, les quatre attributs ensemble parce qu'aucun ne couvre
  // les trois plateformes : `accessibilityElementsHidden` pour iOS,
  // `importantForAccessibility` pour Android, `aria-hidden` et `inert` pour le web.
  //
  // **`aria-hidden` ne suffit pas sur web, et c'est `inert` qui ferme la tabulation.** Le premier
  // retire un nœud de l'arbre d'accessibilité sans le retirer de l'ordre de tabulation : les
  // boutons des trois pages hors champ et le lien « J'ai déjà un compte » restaient atteignables
  // à la touche, c'est-à-dire que le défaut annoncé comme corrigé ne l'était qu'à moitié —
  // vérifié sur l'export, qui portait cinq `tabindex="0"` pour un seul bouton visible. `inert`
  // retire le sous-arbre des deux à la fois, et `react-native-web` le transmet au DOM (il figure
  // dans sa liste de props transmises). La prop n'est pas dans les types de `View`, d'où le
  // `Record` ci-dessous ; sur natif elle est simplement ignorée.
  //
  // Le masquage suit l'**index d'état**, jamais la position de défilement : pendant le geste,
  // l'index ne bascule qu'au franchissement de la moitié de page, alors qu'un seuil sur le
  // défilement ferait apparaître et disparaître les pages sous le doigt.
  // **Une page d'onboarding doit pouvoir défiler, sinon elle coupe** (contre-lecture de la vague 6,
  // 14/09/2026). Les pages sont des boîtes à hauteur fixe, égale au viewport : tout ce qui dépasse
  // est rogné sans un mot, et rien dans les étapes ne peut l'absorber — elles centrent leur contenu
  // et les hauteurs de ligne ne se compriment pas. Les deux phrases ajoutées par C3.9 (le lien légal
  // de l'étape 3, « Ensuite : … » sur la transition) ont suffi à faire sortir « Continuer » et
  // « Commencer mon bilan » de l'écran à 360×640 — c'est-à-dire sur un téléphone d'entrée de gamme,
  // et sur le seul bouton qui fait avancer.
  //
  // `minHeight` et non `height` : au-dessus de cette taille la page se comporte exactement comme
  // avant (le `flex: 1` des étapes et leur `justifyContent: 'space-between'` gardent leur sens),
  // en dessous elle défile. Et `minHeight` n'est posé qu'une fois la hauteur mesurée, pour ne pas
  // rompre l'instantané serveur dont dépend l'hydratation (cf. le bloc ci-dessus).
  //
  // **Ce `minHeight` a un effet de bord qu'il faut connaître : sous lui, une hauteur n'est plus
  // *définie*.** Un enfant en `flex: 1` ne se résout donc plus sur l'espace restant mais sur sa
  // taille max-content — l'illustration de l'étape 1 s'est mise à réclamer un carré (plafonnée
  // depuis, cf. `etape-accroche.tsx`), et le `ScrollView` interne de l'étape 2 s'est étendu à la
  // hauteur de son contenu. Les deux se corrigent là où ils naissent ; ce qui reste ici est la
  // distinction ci-dessous.
  const contenuDePage = [styles.pageContenu, hauteur > 0 ? { minHeight: hauteur } : null];

  // **L'étape 2 gère son propre débordement, donc sa page lui donne une hauteur définie.**
  // Elle est la seule des quatre construite ainsi — un corps qui défile sous un pied épinglé —
  // et c'est le bon découpage : « Continuer » reste à l'écran pendant qu'on parcourt la
  // ventilation par poste. Avec `minHeight`, son `ScrollView` interne s'étirait à ses 745 px de
  // contenu et c'était la page entière, pied compris, qui défilait : à 360 × 640 le bouton
  // finissait 184 px sous le pli. `height` le lui rend. Les trois autres étapes n'ont pas de
  // défileur à elles et ont besoin, elles, que la page grandisse.
  const contenuDePageFixe = [styles.pageContenu, hauteur > 0 ? { height: hauteur } : null];

  const propsDePage = (i: number) => {
    const masquee = i !== index;
    return {
      style: page,
      accessibilityElementsHidden: masquee,
      importantForAccessibility: masquee ? ('no-hide-descendants' as const) : ('auto' as const),
      'aria-hidden': masquee,
      // `undefined` et non `false` : un attribut booléen du DOM vaut par sa présence, et
      // `inert={false}` rendrait `inert=""` sur la page visible — donc une page inerte.
      ...({ inert: masquee ? true : undefined } as Record<string, unknown>),
    };
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        ref={defilement}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={surDefilement}
        onLayout={surMesure}
        scrollEventThrottle={16}
        // `bounces` en moins pour que les deux extrémités ne suggèrent pas une cinquième étape.
        bounces={false}
      >
        <ScrollView
          {...propsDePage(0)}
          contentContainerStyle={contenuDePage}
          showsVerticalScrollIndicator={false}
        >
          <EtapeAccroche
            onSuivant={() => allerA(1)}
            hauteurDePage={hauteur}
            titre={{ ref: titreAccroche, ...FOCALISABLE_PAR_PROGRAMME }}
          />
        </ScrollView>
        <ScrollView
          {...propsDePage(1)}
          contentContainerStyle={contenuDePageFixe}
          showsVerticalScrollIndicator={false}
        >
          <EtapeContexte
            onSuivant={() => allerA(2)}
            titre={{ ref: titreContexte, ...FOCALISABLE_PAR_PROGRAMME }}
          />
        </ScrollView>
        <ScrollView
          {...propsDePage(2)}
          contentContainerStyle={contenuDePage}
          showsVerticalScrollIndicator={false}
        >
          <EtapeReassurance
            onSuivant={() => allerA(3)}
            titre={{ ref: titreReassurance, ...FOCALISABLE_PAR_PROGRAMME }}
          />
        </ScrollView>
        <ScrollView
          {...propsDePage(3)}
          contentContainerStyle={contenuDePage}
          showsVerticalScrollIndicator={false}
        >
          <EtapeTransition titre={{ ref: titreTransition, ...FOCALISABLE_PAR_PROGRAMME }} />
        </ScrollView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageContenu: { flexGrow: 1 },
});
