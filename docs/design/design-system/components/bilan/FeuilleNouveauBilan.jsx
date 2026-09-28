import React from 'react';
import { Button } from '../core/Button.jsx';
import { FeuilleDuBas } from '../core/FeuilleDuBas.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/feuille-nouveau-bilan.tsx — ce qu'une soumission fait à l'engagement en cours, dit
// AVANT : un re-bilan dans la même période recalcule le plan, qui repose l'engagement sur la même action si elle est
// encore proposée, et ne l'archive que sinon. D'où le conditionnel — la seule forme vraie dans les deux cas.
//
// Elle informe, elle ne refuse pas : le bouton plein soumet, « Pas maintenant » referme. Sans Ramille, délibérément :
// elle est la voix de l'encouragement, pas celle d'un écran qui explique une mécanique.

// `phraseDeLEngagementRecalcule` (src/types/rebilan.ts), recopiée.
const phrase = ({ action, intention }) => {
  const a = action.replace(/\.$/, '');
  return intention === null || intention === undefined
    ? 'L’action que tu suis — ' + a + ' — reste engagée si ton nouveau plan la propose encore. Sinon, elle ne sera plus engagée.'
    : 'L’action que tu suis — ' + a + ' — et le moment que tu avais choisi restent engagés si ton nouveau plan propose encore cette action. Sinon, elle ne sera plus engagée.';
};
export function FeuilleNouveauBilan({ engagement, onSoumettre, onFerme, voile, style }) {
  return (
    <FeuilleDuBas titre="Ton plan va être recalculé" onFerme={onFerme} voile={voile} style={style}>
      <ThemedText type="body" themeColor="textSecondary">{phrase(engagement)}</ThemedText>
      <ThemedText type="small" themeColor="textTertiary">Rien ne presse : une habitude met du temps à prendre. Si tes trajets n’ont pas changé, ton bilan actuel est toujours juste.</ThemedText>
      <Button title="Soumettre mon bilan" onPress={onSoumettre} />
      <TextLink label="Pas maintenant" onPress={onFerme} type="small" weight={600} themeColor="accentText" style={{ textAlign: 'center' }} containerStyle={{ alignItems: 'center' }} />
    </FeuilleDuBas>
  );
}
