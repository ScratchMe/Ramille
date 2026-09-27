import React from 'react';
import { ThemedText, TraitDeTemps } from 'ramille-design-system';

/**
 * Sous la carte du cap : la saison, sa fin, et le temps écoulé en `accentMuted` — il mesure la
 * saison, pas la personne, et la légende le dit.
 */
export const DebutDeSaison = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <ThemedText type="small" themeColor="textSecondary">Automne 2026</ThemedText>
      <ThemedText type="small" weight={600} themeColor="accentText">jusqu’au 30 novembre</ThemedText>
    </div>
    <TraitDeTemps progression={0.28} />
    <ThemedText themeColor="textTertiary" style={{ fontSize: 12, lineHeight: '16px' }}>
      La saison avance ; le trait mesure le temps, pas toi.
    </ThemedText>
  </div>
);

/** Presque au bout : jamais plein avant que la période soit révolue. */
export const FinDeSaison = () => <TraitDeTemps progression={0.96} />;
