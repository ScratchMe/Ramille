import React from 'react';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { ThemedView } from '../core/ThemedView.jsx';
// Source : src/components/plan/encarts-de-fait.tsx — les trois encarts de fait du plan, un seul gabarit discret
// (`backgroundElement`, rayon `field`, texte `small` en `textSecondary`) parce qu'ils disent la même sorte de chose : un
// fait sur l'état du plan, jamais une injonction. Ni mascotte, ni exclamation : Ramille ne commente pas l'état du
// compte. EncartDuRattachement (le compte vient d'être rattaché, dit une fois), EncartDeLOrphelin (ce qu'un recalcul a
// emporté, avec « Compris ») et EncartDuCycleRevolu (la saison a tourné avant le plan suivant, avec « Voir la saison »).
const ENCART = { borderRadius: 16, padding: '12px 16px', gap: 8, alignItems: 'flex-start' };
export function EncartDuRattachement({ adresse = '' }) {
  return (
    <ThemedView type="backgroundElement" style={ENCART}>
      <ThemedText type="small" themeColor="textSecondary">
        {adresse
          ? `Ton compte est rattaché à ${adresse}. Ton bilan te suit d’un appareil à l’autre.`
          : 'Ton compte est rattaché. Ton bilan te suit d’un appareil à l’autre.'}
      </ThemedText>
    </ThemedView>
  );
}
export function EncartDeLOrphelin({ phrase, onCompris }) {
  return (
    <ThemedView type="backgroundElement" style={ENCART}>
      <ThemedText type="small" themeColor="textSecondary">{phrase}</ThemedText>
      {/* Le même « Compris » que celui des cartes d'ouverture : petit, 600, `accentText`. */}
      <TextLink label="Compris" apparence="action" onPress={onCompris} />
    </ThemedView>
  );
}
export function EncartDuCycleRevolu({ bascule, relectureDemandee = false, onRelire }) {
  return (
    <ThemedView type="backgroundElement" style={ENCART}>
      <ThemedText type="small" themeColor="textSecondary">
        {bascule} Ton prochain plan arrive ; en attendant, voici où tu en étais.
      </ThemedText>
      <div aria-busy={relectureDemandee}>
        <TextLink label="Voir la saison" apparence="action" onPress={onRelire} disabled={relectureDemandee} />
      </div>
    </ThemedView>
  );
}
