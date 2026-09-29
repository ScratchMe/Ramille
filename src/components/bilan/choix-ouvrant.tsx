import { useContext, useRef, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { SuiviDesOuvertures, type Ouverture } from '@/lib/mouvement';

/**
 * Un choix et ce qui s'ouvre sous lui — un mode et sa précision, le « Oui » du second mode et
 * « Lequel ? », les tranches des sorties et la distance d'une sortie (29/09/2026, `v1-31` §2.2).
 *
 * Il ne dessine rien : c'est une vue qui les enveloppe ensemble, et **son haut est celui du choix**.
 * C'est la borne que l'écran ne fait jamais passer au-dessus du bord quand il remonte pour montrer ce
 * qui s'ouvre (`decalagePourMontrer`) : le handoff la disait « le mode choisi », et trois ouvertures
 * n'ont pas de mode au-dessus d'elles. Un dépli suivi (`Depliage`, `suivieALOuverture`) posé dedans
 * annonce son ouverture ; celle-ci passe par ici, qui y ajoute la borne, puis par `StepShell`, qui
 * mesure et défile.
 */
export function ChoixOuvrant({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const borne = useRef<View>(null);
  const annoncerPlusHaut = useContext(SuiviDesOuvertures);
  const annoncer = (ouverture: Ouverture) =>
    annoncerPlusHaut?.({ ...ouverture, borne: ouverture.borne ?? borne.current ?? undefined });
  return (
    <View ref={borne} style={style}>
      <SuiviDesOuvertures value={annoncer}>{children}</SuiviDesOuvertures>
    </View>
  );
}
