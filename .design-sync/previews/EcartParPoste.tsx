import React from 'react';
import { EcartParPoste, ThemedText } from 'ramille-design-system';

/**
 * Dans le suivi, sous « Par poste » : le trajet a baissé, les voyages ont monté — le total seul
 * l'aurait caché. Échelle commune, accent sur le poste du plan, aucune flèche.
 */
export const DeuxBilans = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--color-background-element)', borderRadius: 18, padding: 20 }}>
    <ThemedText weight={600} type="small">Par poste</ThemedText>
    <EcartParPoste
      ecarts={[
        { poste: 'commute', precedentKg: 1480, courantKg: 1120, dominant: true },
        { poste: 'travel', precedentKg: 600, courantKg: 980, dominant: false },
        { poste: 'leisure', precedentKg: 310, courantKg: 290, dominant: false },
      ]}
    />
  </div>
);

/** Deux postes seulement, et de petites valeurs : en kilos sous la tonne. */
export const PetitesValeurs = () => (
  <EcartParPoste
    ecarts={[
      { poste: 'leisure', precedentKg: 420, courantKg: 380, dominant: true },
      { poste: 'travel', precedentKg: 150, courantKg: 0, dominant: false },
    ]}
  />
);

/**
 * Qui sort « rarement » : les loisirs comptés sont une hypothèse du calcul, et s'appellent
 * « Loisirs occasionnels » (`loisirsOccasionnels`). Ici, les voyages portent l'accent.
 */
export const LoisirsOccasionnels = () => (
  <EcartParPoste
    loisirsOccasionnels
    ecarts={[
      { poste: 'travel', precedentKg: 620, courantKg: 600, dominant: true },
      { poste: 'leisure', precedentKg: 11, courantKg: 11, dominant: false },
    ]}
  />
);
