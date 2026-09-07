import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  BackHandler,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { EtapeAccroche } from '@/components/onboarding/etape-accroche';
import { EtapeContexte } from '@/components/onboarding/etape-contexte';
import { EtapeReassurance } from '@/components/onboarding/etape-reassurance';
import { EtapeTransition } from '@/components/onboarding/etape-transition';
import { ThemedView } from '@/components/themed-view';
import { track } from '@/lib/analytics';

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

  const allerA = (cible: number) => {
    const borne = Math.max(0, Math.min(ETAPES.length - 1, cible));
    defilement.current?.scrollTo({ x: borne * width, animated: true });
    // L'état n'attend pas la fin de l'animation : le bouton doit se sentir aussi immédiat
    // que le doigt, et `onScroll` confirmera la même valeur en chemin.
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
  // ignore une valeur identique, donc pas de rendu superflu pendant le geste.
  const surMesure = (evenement: LayoutChangeEvent) => {
    setHauteur(Math.round(evenement.nativeEvent.layout.height));
  };

  const surDefilement = (evenement: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    setIndex(Math.round(evenement.nativeEvent.contentOffset.x / width));
  };

  const page = { width, height: hauteur > 0 ? hauteur : undefined };

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
        <View style={page}>
          <EtapeAccroche onSuivant={() => allerA(1)} />
        </View>
        <View style={page}>
          <EtapeContexte onSuivant={() => allerA(2)} />
        </View>
        <View style={page}>
          <EtapeReassurance onSuivant={() => allerA(3)} />
        </View>
        <View style={page}>
          <EtapeTransition />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
