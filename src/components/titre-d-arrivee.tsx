import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { porterLeFocus } from '@/lib/focus';

/**
 * Le titre d'un écran qui en remplace un autre sous le doigt, et qui **prend le focus en arrivant**
 * (24/09/2026, `v1-29`, audit d'accessibilité 4.1.3).
 *
 * Deux écrans se remplaçaient sans rien dire : « C'est envoyé, merci. » après « Envoyer » sur
 * `/feedback`, et le calcul du bilan après « Voir mon bilan ». Le bouton pressé disparaît avec
 * l'écran qui le portait, et le focus avec lui. Ce composant enveloppe le titre de l'écran qui
 * arrive et y porte le focus au montage (`porterLeFocus`) : le lecteur d'écran dit ce titre, puis
 * reprend la lecture à partir de lui.
 *
 * **Au montage, et seulement parce que ce montage suit un geste.** C'est ce qui le distingue d'un
 * titre ordinaire : `StepShell` s'interdit le focus au premier rendu, parce qu'au chargement d'une
 * page un `focus()` fait sauter le défilement pour tout le monde. Ici l'écran n'existe qu'une fois le
 * geste fait, donc son montage **est** la réponse au geste. Ne pas l'employer sur un écran qui peut
 * s'ouvrir sans geste — une route qu'on charge, un onglet qu'on retrouve.
 *
 * Sur natif, l'enveloppe est un nœud d'accessibilité (`accessible`), avec le rôle d'en-tête du titre
 * qu'elle porte, pour que TalkBack ait à coup sûr un nœud à focaliser (`porterLeFocus` dit
 * pourquoi un conteneur nu n'en garantit pas). Sur web, elle ne porte que `tabIndex={-1}` — le
 * titre à l'intérieur garde son propre rôle d'en-tête, et un second en-tête autour de lui ferait
 * lire le titre deux fois.
 */
export function TitreDArrivee({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const cible = useRef<View>(null);

  useEffect(() => {
    porterLeFocus(cible.current);
  }, []);

  return (
    <View
      ref={cible}
      style={style}
      {...(Platform.OS === 'web' ? { tabIndex: -1 as const } : { accessible: true, accessibilityRole: 'header' as const })}
    >
      {children}
    </View>
  );
}
